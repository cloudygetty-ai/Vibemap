# # VibeMap Pro: Real-Time Urban Discovery PWA

## 🚀 Overview
VibeMap Pro is a high-performance mapping platform designed for real-time social discovery. It features 3D urban navigation, street-level scouting, and AI-verified user presence.

## 🛠️ Tech Stack
- **Frontend:** Next.js 15+, Mapbox GL JS, Google Street View API.
- **Backend:** Node.js (Fastify/Express), Socket.io, Redis (Geo-indexing).
- **Database:** PostgreSQL + PostGIS (Spatial Analytics).
- **AI:** TensorFlow.js PoseNet (Anti-catfish verification).

## 📦 Key Files & Folders
- `/server`: Node.js backend handles Socket.io signals & Redis geo-pings.
- `/client`: Next.js frontend handles 3D Map rendering & PWA logic.
- `schema.sql`: Database initialization script.

## ⚡ Deployment Instructions
1. Run `schema.sql` on a Postgres instance.
2. Deploy `/server` to a service like Railway or Render (Set `REDIS_URL` and `DATABASE_URL`).
3. Deploy `/client` to Vercel (Set `NEXT_PUBLIC_MAPBOX_TOKEN` and `NEXT_PUBLIC_GOOGLE_KEY`).
4. Ensure both services use HTTPS for Geolocation and Camera access.
