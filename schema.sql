-- Enable PostGIS for spatial operations
CREATE EXTENSION IF NOT EXISTS postgis;

-- Profile table with Spatial Geography column
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  location GEOGRAPHY(POINT), -- High-precision GPS
  is_verified BOOLEAN DEFAULT false,
  last_vibe TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Historical logs for Vibe Heatmaps
CREATE TABLE vibe_logs (
  id SERIAL PRIMARY KEY,
  location GEOGRAPHY(POINT),
  vibe_type TEXT, -- 'chill', 'intense', 'busy'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_location ON profiles USING GIST (location);
CREATE INDEX idx_vibe_logs_location ON vibe_logs USING GIST (location);
