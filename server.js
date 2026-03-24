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

function sendMaybeEncryptedJson(req, res, payload) {
  if (!req._enc?.key) return res.json(payload);

  const iv = bufToB64(crypto.randomBytes(12));
  const ct = encryptAesGcm({ key: req._enc.key, iv, plaintext: JSON.stringify(payload) });
  return res.json({ enc: 1, keyId: ENC_KEY_ID, iv, ct });
}

// Middleware
app.set('trust proxy', 1);

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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Decrypt encrypted JSON bodies (x-enc=1)
app.use('/api/', decryptIfEncrypted);

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

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

// API
app.get('/api/health', (req, res) => {
  res.json({ success: true });
});

app.get('/api/crypto/public-key', (req, res) => {
  res.json({ success: true, keyId: ENC_KEY_ID, publicKeyPem: ENC_PUBLIC_KEY_PEM });
});

app.post('/api/auth/login', authLimiter, requireBrowserRequest, requireEncryptedTransport, async (req, res, next) => {
  try {
    // Tighter controls on login endpoint
    // NOTE: This discourages Postman; it is not a foolproof anti-bot mechanism.
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
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
});

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

app.post('/api/stations', requireAuth, requireEncryptedTransport, async (req, res, next) => {
  try {
    const stations = await getStations();
    sendMaybeEncryptedJson(req, res, { success: true, stations });
  } catch (e) {
    next(e);
  }
});

app.post('/api/distance', requireAuth, requireEncryptedTransport, async (req, res, next) => {
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

app.post('/api/trains', requireAuth, requireEncryptedTransport, async (req, res, next) => {
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

app.listen(PORT, () => {
  console.log(`\n🚀 IRCTC Editor server running at http://localhost:${PORT}`);
  console.log(`📄 UI (dev): http://localhost:5173`);
  console.log(`📦 UI (build): npm run build && npm start\n`);
});

module.exports = app;
