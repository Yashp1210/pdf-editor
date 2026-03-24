const { Pool } = require('pg');

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  // Neon requires SSL. Prefer controlling TLS via the connection string
  // (e.g. sslmode=verify-full) rather than disabling cert verification.
  return new Pool({ connectionString });
}

let pool = null;

function getPool() {
  if (!pool) pool = createPool();
  return pool;
}

module.exports = {
  getPool,
};
