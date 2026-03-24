const { getPool } = require('./pool');

function requirePool() {
  const pool = getPool();
  if (!pool) {
    const err = new Error('DATABASE_URL is not set. Configure it in your environment (.env) to use the database.');
    err.statusCode = 501;
    throw err;
  }
  return pool;
}

async function getStations() {
  const pool = requirePool();
  const { rows } = await pool.query(
    'SELECT display_name, code FROM stations ORDER BY display_name ASC'
  );
  return rows;
}

async function getDistanceKm(fromDisplayName, toDisplayName) {
  const pool = requirePool();
  const { rows } = await pool.query(
    `
    SELECT r.distance_km
    FROM routes r
    JOIN stations sf ON sf.id = r.from_station_id
    JOIN stations st ON st.id = r.to_station_id
    WHERE (sf.display_name = $1 AND st.display_name = $2)
       OR (sf.display_name = $2 AND st.display_name = $1)
    LIMIT 1
    `,
    [fromDisplayName, toDisplayName]
  );
  return rows[0]?.distance_km ?? null;
}

async function getTrains(fromDisplayName, toDisplayName) {
  const pool = requirePool();
  const { rows } = await pool.query(
    `
    SELECT
      t.display_name AS name,
      to_char(t.departure_time, 'HH24:MI') AS departure,
      to_char(t.arrival_time, 'HH24:MI') AS arrival,
      t.class_name AS class,
      t.fare::float8 AS fare,
      t.seat_type AS "seatType"
    FROM trains t
    JOIN routes r ON r.id = t.route_id
    JOIN stations sf ON sf.id = r.from_station_id
    JOIN stations st ON st.id = r.to_station_id
    WHERE t.active = true
      AND sf.display_name = $1
      AND st.display_name = $2
    ORDER BY t.display_name ASC
    `,
    [fromDisplayName, toDisplayName]
  );

  return rows;
}

async function authenticateUser(email, password) {
  const pool = requirePool();
  try {
    const { rows } = await pool.query(
      `
      SELECT id, email
      FROM auth_users
      WHERE active = true
        AND email = $1
        AND password_hash = crypt($2, password_hash)
      LIMIT 1
      `,
      [email, password]
    );

    return rows[0] ?? null;
  } catch (e) {
    // 42P01 = undefined_table, 42883 = undefined_function
    if (e?.code === '42P01') {
      const err = new Error('Auth is not initialized. Run db/schema.sql to create auth_users.');
      err.statusCode = 501;
      throw err;
    }

    if (e?.code === '42883') {
      const err = new Error('Auth requires pgcrypto. Ensure CREATE EXTENSION IF NOT EXISTS pgcrypto; has been run.');
      err.statusCode = 501;
      throw err;
    }

    throw e;
  }
}

module.exports = {
  getStations,
  getDistanceKm,
  getTrains,
  authenticateUser,
};
