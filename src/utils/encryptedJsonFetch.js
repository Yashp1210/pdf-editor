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

export async function encryptedJsonFetch(url, { method = 'POST', body } = {}) {
  // One retry if server restarted and rotated its ephemeral key.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { aesKey, request } = await encryptRequestEnvelope(url, body);

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-enc': '1',
        },
        body: JSON.stringify(request),
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
