-- Migration 001: Initial schema
-- Applies the base PostGIS tables for profiles and vibe_logs.

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  avatar_url  TEXT,
  location    GEOGRAPHY(POINT),
  is_verified BOOLEAN DEFAULT false,
  last_vibe   TEXT,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vibe_logs (
  id         SERIAL PRIMARY KEY,
  location   GEOGRAPHY(POINT),
  vibe_type  TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_location  ON profiles  USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_vibe_logs_location ON vibe_logs USING GIST (location);

COMMIT;
