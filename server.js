const express = require('express');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

require('dotenv').config();

const { getStations, getDistanceKm, getTrains, authenticateUser } = require('./db/queries');

const app = express();
const PORT = process.env.PORT || 3000;
const REQUIRE_ENCRYPTED_PAYLOADS = process.env.REQUIRE_ENCRYPTED_PAYLOADS !== '0';

// --- Basic HTTP hardening (helps under abusive traffic)
// These settings reduce how long the server keeps sockets open.
const HTTP_KEEP_ALIVE_TIMEOUT_MS = Number(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS || 5000);
const HTTP_HEADERS_TIMEOUT_MS = Number(process.env.HTTP_HEADERS_TIMEOUT_MS || 10000);
const HTTP_REQUEST_TIMEOUT_MS = Number(process.env.HTTP_REQUEST_TIMEOUT_MS || 30000);

// --- Captcha (Cloudflare Turnstile) for login
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';
const TURNSTILE_VERIFY_URL = process.env.TURNSTILE_VERIFY_URL || 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// --- Proof-of-Possession (PoP) request signing
// Goal: prevent simple request replay from tools like Postman by requiring
// a browser-held (non-extractable) private key + one-time server nonce.
// NOTE: This is an anti-replay + friction layer, not a replacement for authz.
const POP_REQUIRED = process.env.REQUIRE_POP_SIGNATURES === '1';
const POP_NONCE_TTL_MS = Number(process.env.POP_NONCE_TTL_MS || 60_000);
const popKeysByUserId = new Map(); // userId -> { keyId, publicKeyObj, createdAt }
const popNonces = new Map(); // nonce -> { userId, keyId, method, path, bodySha256, ts, expiresAt }

function bufToB64Url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function b64UrlToBuf(s) {
  const str = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (str.length % 4)) % 4;
  return Buffer.from(str + '='.repeat(padLen), 'base64');
}

function sha256B64Url(buf) {
  return bufToB64Url(crypto.createHash('sha256').update(buf).digest());
}

function canonicalPopMessage({ nonce, ts, method, path, bodySha256 }) {
  // v1 is included so you can rotate formats later without breaking old clients.
  return `v1:${nonce}:${ts}:${String(method || '').toUpperCase()}:${path}:${bodySha256}`;
}

function cleanupExpiredPopNonces() {
  const now = Date.now();
  for (const [nonce, rec] of popNonces.entries()) {
    if (!rec || rec.expiresAt <= now) popNonces.delete(nonce);
  }
}

function requirePopSignature(req, res, next) {
  if (!POP_REQUIRED) return next();

  // Exempt bootstrap and auth endpoints.
  if (
    req.path === '/api/health' ||
    req.path === '/api/crypto/public-key' ||
    req.path.startsWith('/api/auth/') ||
    req.path.startsWith('/api/pop/')
  ) {
    return next();
  }

  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const keyId = String(req.get('x-pop-keyid') || '');
    const nonce = String(req.get('x-pop-nonce') || '');
    const ts = String(req.get('x-pop-ts') || '');
    const sigB64Url = String(req.get('x-pop-sig') || '');
    const bodySha256Header = String(req.get('x-pop-body-sha256') || '');

    if (!keyId || !nonce || !ts || !sigB64Url || !bodySha256Header) {
      return res.status(401).json({ success: false, message: 'Missing PoP signature' });
    }

    const keyRec = popKeysByUserId.get(String(userId));
    if (!keyRec || keyRec.keyId !== keyId) {
      return res.status(401).json({ success: false, message: 'Invalid PoP key' });
    }

    cleanupExpiredPopNonces();
    const nonceRec = popNonces.get(nonce);
    if (!nonceRec) {
      return res.status(401).json({ success: false, message: 'PoP nonce expired or already used' });
    }

    // Consume nonce (single-use). If verification fails, force a new nonce.
    popNonces.delete(nonce);

    const now = Date.now();
    if (nonceRec.expiresAt <= now) {
      return res.status(401).json({ success: false, message: 'PoP nonce expired' });
    }
    if (nonceRec.userId !== String(userId) || nonceRec.keyId !== keyId) {
      return res.status(401).json({ success: false, message: 'PoP nonce not valid for this session' });
    }

    const reqMethod = String(req.method || '').toUpperCase();
    const reqPath = req.path; // Express path without query string

    if (nonceRec.method !== reqMethod || nonceRec.path !== reqPath) {
      return res.status(401).json({ success: false, message: 'PoP nonce mismatch' });
    }

    const rawBodyBuf = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from('');
    const bodySha256 = sha256B64Url(rawBodyBuf);
    if (bodySha256 !== bodySha256Header) {
      return res.status(401).json({ success: false, message: 'PoP body hash mismatch' });
    }
    if (nonceRec.bodySha256 !== bodySha256) {
      return res.status(401).json({ success: false, message: 'PoP nonce mismatch' });
    }

    const msg = canonicalPopMessage({
      nonce,
      ts,
      method: reqMethod,
      path: reqPath,
      bodySha256,
    });

    const sigBuf = b64UrlToBuf(sigB64Url);
    const ok = crypto.verify(
      'sha256',
      Buffer.from(msg, 'utf8'),
      {
        key: keyRec.publicKeyObj,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: 32,
      },
      sigBuf
    );

    if (!ok) {
      return res.status(401).json({ success: false, message: 'Invalid PoP signature' });
    }

    return next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Invalid PoP signature' });
  }
}

const FRONTEND_DIST_DIR = path.join(__dirname, 'dist');
const FRONTEND_INDEX_HTML = path.join(FRONTEND_DIST_DIR, 'index.html');
const hasFrontendBuild = fs.existsSync(FRONTEND_INDEX_HTML);

// --- Encrypted transport (obfuscation layer)
// NOTE: This makes payloads appear as ciphertext in Network tab.
// It does NOT prevent a determined user from reading data in their own browser.
const ENC_KEY_ID = crypto.randomBytes(8).toString('hex');
const ENC_INFO = Buffer.from(`pdf-editor:${ENC_KEY_ID}`, 'utf8');
const { publicKey: ENC_PUBLIC_KEY_PEM, privateKey: ENC_PRIVATE_KEY_PEM } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

function b64ToBuf(s) {
  return Buffer.from(String(s || ''), 'base64');
}

function bufToB64(b) {
  return Buffer.from(b).toString('base64');
}

function decryptAesGcm({ key, iv, ct }) {
  const ivBuf = b64ToBuf(iv);
  const ctBuf = b64ToBuf(ct);
  if (ctBuf.length < 16) throw new Error('Invalid ciphertext');
  const tag = ctBuf.subarray(ctBuf.length - 16);
  const data = ctBuf.subarray(0, ctBuf.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuf);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return plain.toString('utf8');
}

function encryptAesGcm({ key, iv, plaintext }) {
  const ivBuf = b64ToBuf(iv);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, ivBuf);
  const data = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();
  return bufToB64(Buffer.concat([data, tag]));
}

function deriveAesKey({ keyMaterial, salt }) {
  const saltBuf = b64ToBuf(salt);
  // hkdfSync returns a Buffer in Node 20+ when keylen is specified
  return crypto.hkdfSync('sha256', keyMaterial, saltBuf, ENC_INFO, 32);
}

function decryptKeyMaterial(ekB64) {
  const ekBuf = b64ToBuf(ekB64);
  return crypto.privateDecrypt(
    {
      key: ENC_PRIVATE_KEY_PEM,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    ekBuf
  );
}

function decryptIfEncrypted(req, res, next) {
  if (req.get('x-enc') !== '1') return next();

  try {
    const { ek, salt, iv, ct } = req.body || {};
    if (!ek || !salt || !iv || !ct) {
      return res.status(400).json({ success: false, message: 'Invalid encrypted payload' });
    }

    const keyMaterial = decryptKeyMaterial(ek);
    const key = deriveAesKey({ keyMaterial, salt });
    const plaintext = decryptAesGcm({ key, iv, ct });
    const parsed = JSON.parse(plaintext);

    req.body = parsed;
    req._enc = { key };
    next();
  } catch (e) {
    return res.status(400).json({ success: false, message: 'Encrypted payload could not be decrypted' });
  }
}

function requireEncryptedTransport(req, res, next) {
  if (!REQUIRE_ENCRYPTED_PAYLOADS) return next();
  if (req.get('x-enc') === '1') return next();
  return res.status(400).json({ success: false, message: 'Encrypted transport required' });
}

async function verifyTurnstileToken({ token, ip }) {
  if (!TURNSTILE_SECRET_KEY) {
    const err = new Error('TURNSTILE_SECRET_KEY is not set');
    err.statusCode = 500;
    throw err;
  }

  const params = new URLSearchParams();
  params.set('secret', TURNSTILE_SECRET_KEY);
  params.set('response', String(token || ''));
  if (ip) params.set('remoteip', String(ip));

  const resp = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await resp.json().catch(() => null);
  return Boolean(data?.success);
}

function sendMaybeEncryptedJson(req, res, payload) {
  if (!req._enc?.key) return res.json(payload);

  const iv = bufToB64(crypto.randomBytes(12));
  const ct = encryptAesGcm({ key: req._enc.key, iv, plaintext: JSON.stringify(payload) });
  return res.json({ enc: 1, keyId: ENC_KEY_ID, iv, ct });
}

// Middleware
// When deployed behind Cloudflare (or any reverse proxy), the actual client IP arrives via
// request headers. Express only uses those headers if `trust proxy` is enabled.
//
// IMPORTANT:
// - Do not "set Cloudflare in response headers". Cloudflare sends headers *to us*.
// - If we blindly trust all proxies, attackers can spoof X-Forwarded-For.
//
// Strategy:
// - In production, trust the proxy (Cloudflare) and prefer CF-Connecting-IP.
// - In dev, keep it permissive for local proxies.
app.set('trust proxy', process.env.NODE_ENV === 'production' ? 1 : true);

function getClientIp(req) {
  // Cloudflare sets this on inbound requests.
  const cfConnectingIp = String(req.get('cf-connecting-ip') || '').trim();
  if (cfConnectingIp) return cfConnectingIp;

  // Fallback to Express's derived IP (respects trust proxy).
  return req.ip;
}

function enforceTrustedProxyHeaders(req, res, next) {
  // If you want to require that requests came through Cloudflare,
  // set REQUIRE_CLOUDFLARE=1 in production.
  if (process.env.NODE_ENV !== 'production') return next();
  if (process.env.REQUIRE_CLOUDFLARE !== '1') return next();

  // If we're requiring Cloudflare, ensure the canonical CF headers exist.
  // (Note: This is not cryptographic verification; it’s a pragmatic guard.)
  const hasCfRay = Boolean(req.get('cf-ray'));
  const hasCfConnectingIp = Boolean(req.get('cf-connecting-ip'));
  if (!hasCfRay || !hasCfConnectingIp) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  return next();
}

function requireSmallRequestBody(req, res, next) {
  // Extra guard for endpoints that should be tiny (like login).
  // Prevents wasting CPU on large bodies even if JSON_LIMIT is higher.
  const rawLen = Buffer.isBuffer(req.rawBody) ? req.rawBody.length : 0;
  const max = Number(process.env.AUTH_MAX_BODY_BYTES || 16 * 1024);
  if (rawLen > max) return res.status(413).json({ success: false, message: 'Payload too large' });
  return next();
}

// Apply rate limiting as early as possible to reduce CPU/memory DoS.
// (Important: expensive operations like JSON parsing and RSA decrypt must not run before this.)
const API_RATE_WINDOW_MS = Number(process.env.API_RATE_WINDOW_MS || 60_000);
const API_RATE_LIMIT = Number(process.env.API_RATE_LIMIT || 120);
const AUTH_RATE_WINDOW_MS = Number(process.env.AUTH_RATE_WINDOW_MS || 15 * 60_000);
const AUTH_RATE_LIMIT = Number(process.env.AUTH_RATE_LIMIT || 20);

const apiLimiter = rateLimit({
  windowMs: API_RATE_WINDOW_MS,
  limit: API_RATE_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
});

const authLimiter = rateLimit({
  windowMs: AUTH_RATE_WINDOW_MS,
  limit: AUTH_RATE_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
});

// Stricter limiter for credential-stuffing on login.
const LOGIN_RATE_WINDOW_MS = Number(process.env.LOGIN_RATE_WINDOW_MS || 10 * 60_000);
const LOGIN_RATE_LIMIT = Number(process.env.LOGIN_RATE_LIMIT || 10);
const loginLimiter = rateLimit({
  windowMs: LOGIN_RATE_WINDOW_MS,
  limit: LOGIN_RATE_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
});

app.use('/api/', enforceTrustedProxyHeaders);
app.use('/api/', apiLimiter);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        // Helmet's defaults do not set connect-src/worker-src, so they fall back to default-src/script-src.
        // We keep network locked down (self only) and explicitly allow workers.
        'connect-src': ["'self'"],
        'worker-src': ["'self'", 'blob:'],
      },
    },
  })
);

// Capture raw body bytes for PoP body hashing.
// Keep this small to reduce memory abuse; this API shouldn't need huge bodies.
const JSON_LIMIT = process.env.JSON_BODY_LIMIT || '1mb';
app.use(
  express.json({
    limit: JSON_LIMIT,
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(cookieParser());

// Decrypt encrypted JSON bodies (x-enc=1)
app.use('/api/', decryptIfEncrypted);

function getAllowedOrigins() {
  const allowed = [];
  if (process.env.PUBLIC_ORIGIN) allowed.push(process.env.PUBLIC_ORIGIN);
  // Vite dev server origin (exact allowlist is extended in dev below)
  allowed.push('http://localhost:5173');

  if (process.env.NODE_ENV !== 'production') {
    const devPort = process.env.PORT || '3000';
    allowed.push(`http://localhost:${devPort}`);
  }
  return allowed;
}

function requireBrowserRequest(req, res, next) {
  const userAgent = String(req.get('user-agent') || '');
  if (!userAgent) return res.status(403).json({ success: false, message: 'Forbidden' });
  if (/postmanruntime|insomnia|httpie|curl|wget/i.test(userAgent)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  // Origin/Referer checks make it harder (not impossible) to hit via raw clients.
  const origin = req.get('origin');
  const referer = req.get('referer');
  const allowed = getAllowedOrigins();

  if (process.env.NODE_ENV !== 'production') {
    // Allow Vite to pick a different port (5173, 5174, ...)
    if (origin && /^http:\/\/localhost:517\d$/.test(origin)) return next();
    if (!origin && referer && /^http:\/\/localhost:517\d\//.test(referer)) return next();
  }

  if (origin && allowed.includes(origin)) return next();
  if (!origin && referer && allowed.some((o) => referer.startsWith(`${o}/`))) return next();

  return res.status(403).json({ success: false, message: 'Forbidden' });
}

function getJwtSecret() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    const err = new Error('AUTH_JWT_SECRET is not set');
    err.statusCode = 500;
    throw err;
  }
  return 'dev-auth-secret-change-me';
}

function setAuthCookie(res, token) {
  res.cookie('auth_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookie(res) {
  res.clearCookie('auth_token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.auth_token;
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const payload = jwt.verify(token, getJwtSecret());
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
}

// PoP endpoints (register key + get one-time nonce)
app.post('/api/pop/register', requireAuth, requireEncryptedTransport, (req, res) => {
  try {
    const userId = String(req.user?.id || '');
    const publicKeySpkiB64 = String(req.body?.publicKeySpkiB64 || '');
    if (!userId || !publicKeySpkiB64) {
      return res.status(400).json({ success: false, message: 'publicKeySpkiB64 is required' });
    }

    const spkiDer = Buffer.from(publicKeySpkiB64, 'base64');
    if (spkiDer.length < 128 || spkiDer.length > 4 * 1024) {
      return res.status(400).json({ success: false, message: 'Invalid public key' });
    }

    const publicKeyObj = crypto.createPublicKey({ key: spkiDer, format: 'der', type: 'spki' });
    const keyId = crypto.createHash('sha256').update(spkiDer).digest('hex').slice(0, 16);

    popKeysByUserId.set(userId, { keyId, publicKeyObj, createdAt: Date.now() });
    sendMaybeEncryptedJson(req, res, { success: true, keyId });
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid public key' });
  }
});

app.post('/api/pop/challenge', requireAuth, requireEncryptedTransport, (req, res) => {
  const userId = String(req.user?.id || '');
  const keyRec = popKeysByUserId.get(userId);
  if (!keyRec) return res.status(400).json({ success: false, message: 'PoP key not registered' });

  const method = String(req.body?.method || '').toUpperCase();
  const path = String(req.body?.path || '');
  const bodySha256 = String(req.body?.bodySha256 || '');
  if (!method || !path || !bodySha256) {
    return res.status(400).json({ success: false, message: 'method, path, bodySha256 are required' });
  }
  if (!path.startsWith('/api/')) {
    return res.status(400).json({ success: false, message: 'Invalid path' });
  }

  cleanupExpiredPopNonces();
  const nonce = bufToB64Url(crypto.randomBytes(18));
  const ts = String(Date.now());
  const expiresAt = Number(ts) + POP_NONCE_TTL_MS;

  popNonces.set(nonce, {
    userId,
    keyId: keyRec.keyId,
    method,
    path,
    bodySha256,
    ts,
    expiresAt,
  });

  sendMaybeEncryptedJson(req, res, {
    success: true,
    keyId: keyRec.keyId,
    nonce,
    ts,
    expiresInMs: POP_NONCE_TTL_MS,
  });
});

// API
app.get('/api/health', (req, res) => {
  res.json({ success: true });
});

app.get('/api/crypto/public-key', (req, res) => {
  res.json({ success: true, keyId: ENC_KEY_ID, publicKeyPem: ENC_PUBLIC_KEY_PEM });
});

app.post(
  '/api/auth/login',
  loginLimiter,
  authLimiter,
  requireBrowserRequest,
  requireSmallRequestBody,
  requireEncryptedTransport,
  async (req, res, next) => {
    try {
    // Tighter controls on login endpoint
    // NOTE: This discourages Postman; it is not a foolproof anti-bot mechanism.
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
      const turnstileToken = String(req.body?.turnstileToken || '');
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
    }

      if (!turnstileToken) {
        return res.status(400).json({ success: false, message: 'captcha is required' });
      }

      const okCaptcha = await verifyTurnstileToken({ token: turnstileToken, ip: getClientIp(req) });
      if (!okCaptcha) {
        return res.status(401).json({ success: false, message: 'captcha failed' });
      }

    const user = await authenticateUser(email, password);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { email: user.email },
      getJwtSecret(),
      { subject: user.id, expiresIn: '7d' }
    );

    setAuthCookie(res, token);
    sendMaybeEncryptedJson(req, res, { success: true, user: { email: user.email } });
    } catch (e) {
      next(e);
    }
  }
);

app.post('/api/auth/logout', authLimiter, requireBrowserRequest, requireEncryptedTransport, (req, res) => {
  clearAuthCookie(res);
  sendMaybeEncryptedJson(req, res, { success: true });
});

app.get('/api/auth/me', (req, res) => {
  try {
    const token = req.cookies?.auth_token;
    if (!token) return res.status(200).json({ success: true, user: null });

    const payload = jwt.verify(token, getJwtSecret());
    return res.json({ success: true, user: { email: payload.email } });
  } catch {
    return res.status(200).json({ success: true, user: null });
  }
});

app.post('/api/stations', requireAuth, requirePopSignature, requireEncryptedTransport, async (req, res, next) => {
  try {
    const stations = await getStations();
    sendMaybeEncryptedJson(req, res, { success: true, stations });
  } catch (e) {
    next(e);
  }
});

app.post('/api/distance', requireAuth, requirePopSignature, requireEncryptedTransport, async (req, res, next) => {
  try {
    const from = String(req.body?.from || '');
    const to = String(req.body?.to || '');
    if (!from || !to) return res.status(400).json({ success: false, message: 'from and to are required' });

    const distanceKm = await getDistanceKm(from, to);
    sendMaybeEncryptedJson(req, res, { success: true, distanceKm });
  } catch (e) {
    next(e);
  }
});

app.post('/api/trains', requireAuth, requirePopSignature, requireEncryptedTransport, async (req, res, next) => {
  try {
    const from = String(req.body?.from || '');
    const to = String(req.body?.to || '');
    if (!from || !to) return res.status(400).json({ success: false, message: 'from and to are required' });

    const trains = await getTrains(from, to);
    sendMaybeEncryptedJson(req, res, { success: true, trains });
  } catch (e) {
    next(e);
  }
});

if (hasFrontendBuild) {
  app.use(express.static(FRONTEND_DIST_DIR));
}

if (hasFrontendBuild) {
  // SPA fallback (avoid intercepting API routes)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(FRONTEND_INDEX_HTML);
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Server is running. This project is IRCTC-only (UI is served by Vite in dev). Build the frontend (npm run build) to serve it from this server, or run dev (npm run dev) and open the Vite URL.',
      frontend: {
        dev: 'npm run dev',
        build: 'npm run build',
      },
    });
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  const status = err.statusCode || 500;
  res.status(status).json({ success: false, message: err.message || 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`\n🚀 IRCTC Editor server running at http://localhost:${PORT}`);
  console.log(`📄 UI (dev): http://localhost:5173`);
  console.log(`📦 UI (build): npm run build && npm start\n`);
});

// Basic HTTP hardening (helps against slow connections / slowloris-style abuse).
// Values are intentionally conservative; tune based on your traffic.
server.keepAliveTimeout = Number(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS || 5_000);
server.headersTimeout = Number(process.env.HTTP_HEADERS_TIMEOUT_MS || 10_000);
server.requestTimeout = Number(process.env.HTTP_REQUEST_TIMEOUT_MS || 30_000);

module.exports = { app, server };
