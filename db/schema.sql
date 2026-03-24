-- IRCTC Editor schema (Neon Postgres)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Stations shown in UI like: "SURAT (ST)"
CREATE TABLE IF NOT EXISTS stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL UNIQUE,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Route between two stations (store both directions for easy lookup)
CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_station_id uuid NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
  to_station_id uuid NOT NULL REFERENCES stations(id) ON DELETE RESTRICT,
  distance_km integer NOT NULL CHECK (distance_km > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_station_id, to_station_id)
);

-- Train options for a route (what TrainAutocomplete suggests)
CREATE TABLE IF NOT EXISTS trains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  departure_time time NOT NULL,
  arrival_time time NOT NULL,
  class_name text NOT NULL,
  fare numeric(10, 2) NOT NULL CHECK (fare >= 0),
  seat_type text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (route_id, display_name, departure_time)
);

CREATE INDEX IF NOT EXISTS idx_routes_from_to ON routes(from_station_id, to_station_id);
CREATE INDEX IF NOT EXISTS idx_trains_route_active ON trains(route_id, active);

-- Login-only auth users (managed directly in Neon)
-- Create a user with:
--   INSERT INTO auth_users (email, password_hash) VALUES ('you@example.com', crypt('YourPassword', gen_salt('bf')));
CREATE TABLE IF NOT EXISTS auth_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_users_active ON auth_users(active);
