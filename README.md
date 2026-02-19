# VibeMap Pro: Real-Time Urban Discovery PWA

## Overview

VibeMap Pro is a real-time social discovery platform. Users drop into a 3D city map, tap any location to open a 360° street view or join a live video room with nearby people, and broadcast their vibe (chill / intense / busy) to a shared heat map.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 18, Mapbox GL JS, Tailwind CSS |
| Real-time | Socket.io (WebSocket) |
| Backend | Node.js, Express |
| Geo-index | Redis (`GEOADD` / `GEOSEARCH`) |
| Database | PostgreSQL + PostGIS |
| Video | WebRTC (browser peer-to-peer, STUN via Google) |
| Street View | Google Maps Street View API |
| Logging | pino / pino-http |

## Project Structure

```
client/                  Next.js PWA
  components/
    VibeMap.js           3D Mapbox map, geolocation broadcast, location selection
    VibeControl.js       Bottom panel — street view or video room
    StreetViewer.js      Google Street View embed
    VideoRoom.js         WebRTC group video (signalled via Socket.io)
  lib/
    socket.js            Shared Socket.io singleton (one connection per tab)
  pages/
    index.js             Home page
    _app.js              Global CSS + Mapbox stylesheet
  public/
    manifest.json        PWA manifest
    icon-192.png
    icon-512.png

server/
  index.js              Express + Socket.io server
  db/
    migrate.js           Zero-dependency migration runner
    migrations/
      001_initial_schema.sql

schema.sql              PostgreSQL seed for fresh installs
docker-compose.yml      Local full-stack (PostGIS, Redis, server, client)
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Used by | Description |
|---|---|---|
| `DATABASE_URL` | server | PostgreSQL connection string |
| `REDIS_URL` | server | Redis connection string |
| `PORT` | server | HTTP port (default `4000`) |
| `CORS_ORIGIN` | server | Allowed origin(s) for Socket.io (comma-separated) |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | client | Mapbox GL JS public token |
| `NEXT_PUBLIC_SERVER_URL` | client | Full URL of the backend server |
| `NEXT_PUBLIC_GOOGLE_KEY` | client | Google Maps / Street View API key |

## Running Locally

### Docker (recommended)

```bash
cp .env.example .env          # fill in MAPBOX token etc.
docker compose up --build
```

- Client: http://localhost:3000
- Server: http://localhost:4000
- Health: http://localhost:4000/health

### Manual

```bash
# Prerequisites: PostgreSQL with PostGIS, Redis

# 1. Seed the database (first time only)
psql $DATABASE_URL < schema.sql

# 2. Start the server (runs migrations then starts Express)
cd server && npm install && npm start

# 3. Start the client
cd client && npm install && npm run dev
```

## Deployment

### Vercel + Railway / Render

1. Deploy `server/` to Railway or Render. Set `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGIN`, and `PORT` as environment variables.
2. Run the initial migration: `npm run migrate` (or it runs automatically on first start).
3. Deploy `client/` to Vercel. Set `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_SERVER_URL`, and `NEXT_PUBLIC_GOOGLE_KEY`.
4. Both services must be served over HTTPS — browser geolocation and camera access require a secure context.

### Adding a Migration

Create a new numbered file in `server/db/migrations/`:

```bash
touch server/db/migrations/002_add_column.sql
```

Write it as a `BEGIN` / `COMMIT` transaction. It will run automatically on the next server start.

## Testing & Fuzzing

```bash
# Unit tests (validation logic, rate limiter)
cd server && npm test

# Socket.io fuzz tester (server must be running)
node server/fuzz.js [SERVER_URL]
```
