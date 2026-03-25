function toB64Url(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function toB64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function fromB64(b64) {
  const binary = atob(String(b64 || ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function utf8Bytes(s) {
  return new TextEncoder().encode(String(s || ''));
}

async function sha256B64Url(str) {
  const buf = await crypto.subtle.digest('SHA-256', utf8Bytes(str));
  return toB64Url(new Uint8Array(buf));
}

const DB_NAME = 'pdf-editor-pop';
const DB_VERSION = 1;
const STORE = 'keys';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function generateRsaPssKeyPair() {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-PSS',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    false, // non-extractable private key
    ['sign', 'verify']
  );
}

async function exportSpkiB64(publicKey) {
  const spki = await crypto.subtle.exportKey('spki', publicKey);
  // Standard base64 is easiest to decode on Node via Buffer.from(_, 'base64').
  return toB64(new Uint8Array(spki));
}

export async function getOrCreatePopKeyPair() {
  // Try to reuse existing CryptoKeys from IndexedDB.
  try {
    const existing = await idbGet('keypair');
    if (existing?.privateKey && existing?.publicKey) {
      return existing;
    }
  } catch {
    // ignore
  }

  const keypair = await generateRsaPssKeyPair();

  try {
    await idbSet('keypair', keypair);
  } catch {
    // If storage fails (private browsing), we still return an in-memory key.
  }

  return keypair;
}

export function getPopKeyId() {
  try {
    return localStorage.getItem('pop_key_id') || '';
  } catch {
    return '';
  }
}

export function setPopKeyId(keyId) {
  try {
    if (keyId) localStorage.setItem('pop_key_id', keyId);
  } catch {
    // ignore
  }
}

export function clearPopKeyId() {
  try {
    localStorage.removeItem('pop_key_id');
  } catch {
    // ignore
  }
}

export async function ensurePopRegistered(registerFn) {
  const keyId = getPopKeyId();
  if (keyId) return keyId;

  const { publicKey } = await getOrCreatePopKeyPair();
  const publicKeySpkiB64 = await exportSpkiB64(publicKey);

  const res = await registerFn({ publicKeySpkiB64 });
  if (!res?.success || !res?.keyId) throw new Error(res?.message || 'PoP registration failed');

  setPopKeyId(res.keyId);
  return res.keyId;
}

export function canonicalPopMessage({ nonce, ts, method, path, bodySha256 }) {
  return `v1:${nonce}:${ts}:${String(method || '').toUpperCase()}:${path}:${bodySha256}`;
}

export async function signPopMessage(message) {
  const { privateKey } = await getOrCreatePopKeyPair();
  const sigBuf = await crypto.subtle.sign({ name: 'RSA-PSS', saltLength: 32 }, privateKey, utf8Bytes(message));
  return toB64Url(new Uint8Array(sigBuf));
}

export async function bodySha256ForJsonString(jsonStr) {
  return sha256B64Url(jsonStr);
}
