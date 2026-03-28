import {
  bodySha256ForJsonString,
  canonicalPopMessage,
  clearPopKeyId,
  ensurePopRegistered,
  signPopMessage,
} from './pop';

let cachedPublicKey = null;

function b64Encode(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function b64Decode(b64) {
  const binary = atob(String(b64 || ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pemToDer(pem) {
  const cleaned = String(pem || '')
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s+/g, '');
  return b64Decode(cleaned).buffer;
}

async function loadServerPublicKey() {
  const res = await fetch('/api/crypto/public-key');
  if (!res.ok) throw new Error('Failed to load crypto public key');
  const data = await res.json().catch(() => null);
  if (!data?.success || !data?.publicKeyPem || !data?.keyId) throw new Error('Invalid crypto public key response');

  const cryptoKey = await crypto.subtle.importKey(
    'spki',
    pemToDer(data.publicKeyPem),
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );

  cachedPublicKey = { keyId: data.keyId, publicKey: cryptoKey };
  return cachedPublicKey;
}

async function getServerPublicKeyCached() {
  if (cachedPublicKey) return cachedPublicKey;
  return loadServerPublicKey();
}

async function deriveAesKeyBytes(keyMaterialBytes, saltBytes, infoStr) {
  const keyMaterial = await crypto.subtle.importKey('raw', keyMaterialBytes, 'HKDF', false, ['deriveBits']);
  const info = new TextEncoder().encode(infoStr);

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: saltBytes,
      info,
    },
    keyMaterial,
    256
  );

  return new Uint8Array(bits);
}

async function importAesKey(aesKeyBytes) {
  return crypto.subtle.importKey('raw', aesKeyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function aesGcmEncrypt(aesKey, ivBytes, plaintext) {
  const plainBytes = new TextEncoder().encode(plaintext);
  const buf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBytes }, aesKey, plainBytes);
  return new Uint8Array(buf); // ciphertext + tag
}

async function aesGcmDecrypt(aesKey, ivBytes, ciphertextBytes) {
  const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBytes }, aesKey, ciphertextBytes);
  return new TextDecoder().decode(buf);
}

async function rsaEncryptKeyMaterial(publicKey, keyMaterialBytes) {
  const buf = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, keyMaterialBytes);
  return new Uint8Array(buf);
}

async function encryptRequestEnvelope(url, bodyObj) {
  const { keyId, publicKey } = await getServerPublicKeyCached();

  const keyMaterialBytes = crypto.getRandomValues(new Uint8Array(32));
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));

  const aesKeyBytes = await deriveAesKeyBytes(keyMaterialBytes, saltBytes, `pdf-editor:${keyId}`);
  const aesKey = await importAesKey(aesKeyBytes);

  const ctBytes = await aesGcmEncrypt(aesKey, ivBytes, JSON.stringify(bodyObj ?? {}));
  const ekBytes = await rsaEncryptKeyMaterial(publicKey, keyMaterialBytes);

  return {
    keyId,
    aesKey,
    request: {
      ek: b64Encode(ekBytes),
      salt: b64Encode(saltBytes),
      iv: b64Encode(ivBytes),
      ct: b64Encode(ctBytes),
    },
  };
}

export async function encryptedJsonFetch(url, { method = 'POST', body, pop = true } = {}) {
  const popEnabled = pop;

  // One retry if server restarted and rotated its ephemeral key.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { aesKey, request } = await encryptRequestEnvelope(url, body);

      const bodyStr = JSON.stringify(request);

      // Proof-of-Possession signing (anti-replay + friction)
      // We intentionally avoid signing:
      // - auth endpoints (bootstrap)
      // - crypto public key endpoint
      // - PoP endpoints themselves
      const shouldPopSign =
        popEnabled &&
        typeof url === 'string' &&
        url.startsWith('/api/') &&
        !url.startsWith('/api/auth/') &&
        url !== '/api/crypto/public-key' &&
        !url.startsWith('/api/pop/');

      let popHeaders = {};
      if (shouldPopSign) {
        const register = ({ publicKeySpkiB64 }) =>
          encryptedJsonFetch('/api/pop/register', { method: 'POST', body: { publicKeySpkiB64 }, pop: false });

        let keyId = await ensurePopRegistered(register);

        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
        const path = new URL(url, origin).pathname;
        const bodySha256 = await bodySha256ForJsonString(bodyStr);

        let challenge;
        try {
          challenge = await encryptedJsonFetch('/api/pop/challenge', {
            method: 'POST',
            body: { method: String(method || 'POST').toUpperCase(), path, bodySha256 },
            pop: false,
          });
        } catch (e) {
          // The inner request throws on non-2xx. For PoP we want to interpret
          // the message and recover by re-registering the key if needed.
          challenge = { success: false, message: e?.message || 'PoP challenge failed' };
        }

        if (!challenge?.success || !challenge?.nonce || !challenge?.ts) {
          // Server may have restarted and lost its in-memory key registry.
          const msg = String(challenge?.message || 'PoP challenge failed');
          if (/not registered|invalid pop key/i.test(msg)) {
            clearPopKeyId();
            keyId = await ensurePopRegistered(register);
            let retryChallenge;
            try {
              retryChallenge = await encryptedJsonFetch('/api/pop/challenge', {
                method: 'POST',
                body: { method: String(method || 'POST').toUpperCase(), path, bodySha256 },
                pop: false,
              });
            } catch (e) {
              retryChallenge = { success: false, message: e?.message || 'PoP challenge failed' };
            }

            if (!retryChallenge?.success || !retryChallenge?.nonce || !retryChallenge?.ts) {
              throw new Error(retryChallenge?.message || 'PoP challenge failed');
            }

            const retryMsg = canonicalPopMessage({
              nonce: retryChallenge.nonce,
              ts: retryChallenge.ts,
              method: String(method || 'POST').toUpperCase(),
              path,
              bodySha256,
            });

            const retrySig = await signPopMessage(retryMsg);
            popHeaders = {
              'x-pop-keyid': keyId,
              'x-pop-nonce': retryChallenge.nonce,
              'x-pop-ts': retryChallenge.ts,
              'x-pop-body-sha256': bodySha256,
              'x-pop-sig': retrySig,
            };
          } else {
            throw new Error(msg);
          }
        }

        if (challenge?.success && challenge?.nonce && challenge?.ts) {
          const msg = canonicalPopMessage({
            nonce: challenge.nonce,
            ts: challenge.ts,
            method: String(method || 'POST').toUpperCase(),
            path,
            bodySha256,
          });

          const sig = await signPopMessage(msg);
          popHeaders = {
            'x-pop-keyid': keyId,
            'x-pop-nonce': challenge.nonce,
            'x-pop-ts': challenge.ts,
            'x-pop-body-sha256': bodySha256,
            'x-pop-sig': sig,
          };
        }
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-enc': '1',
          ...popHeaders,
        },
        body: bodyStr,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        // If encrypted error, attempt decrypt. Otherwise show message.
        if (json?.enc === 1 && json?.iv && json?.ct) {
          const ivBytes = b64Decode(json.iv);
          const ctBytes = b64Decode(json.ct);
          const plaintext = await aesGcmDecrypt(aesKey, ivBytes, ctBytes);
          const decoded = JSON.parse(plaintext);
          throw new Error(decoded?.message || 'Request failed');
        }
        throw new Error(json?.message || 'Request failed');
      }

      if (json?.enc === 1 && json?.iv && json?.ct) {
        const ivBytes = b64Decode(json.iv);
        const ctBytes = b64Decode(json.ct);
        const plaintext = await aesGcmDecrypt(aesKey, ivBytes, ctBytes);
        return JSON.parse(plaintext);
      }

      return json;
    } catch (e) {
      if (attempt === 0) {
        cachedPublicKey = null;
        continue;
      }
      throw e;
    }
  }

  throw new Error('Request failed');
}
