# Vibemap — Claude Project Notes

## Project Overview

Vibemap is a real-time social discovery PWA. Users drop into a 3D city map,
tap locations to open a 360° street view or join a live video room with nearby
people, and broadcast their vibe (chill / intense / busy) to a shared heat map.

**Stack:** Next.js 15 client · Express + Socket.io server · PostgreSQL + PostGIS · Redis geo-index · WebRTC video rooms

**Repo layout:**
```
client/   Next.js PWA (port 3000)
server/   Express + Socket.io (port 4000)
nginx/    TLS reverse proxy config + gen-certs.sh
```

**Run tests after every server change:**
```bash
npm test --prefix server   # 18 unit tests, must stay green
```

---

## Deployment — Native Only (No Docker)

**Docker does NOT work in this environment** due to kernel sandbox limitations.
Always deploy natively:

```bash
# 1. Databases
pg_ctlcluster 16 main start
redis-server --daemonize yes

# 2. Server
export DATABASE_URL="postgresql://vibemap:changeme@localhost:5432/vibemap"
export REDIS_URL="redis://localhost:6379"
export PORT=4000
export CORS_ORIGIN="https://localhost"
export LOG_LEVEL=info
npm start --prefix server &

# 3. Client
PORT=3000 npm start --prefix client &

# 4. nginx TLS (already configured)
nginx -s reload   # or: nginx
```

Health check: `curl -sk https://localhost/health` → `{"status":"ok"}`

---

## Architecture Notes

### ID Schemes — Don't Mix Them Up

| ID | Origin | Example use |
|----|--------|-------------|
| `socket.id` | Socket.io, server-assigned | WebRTC peer identity, room membership |
| `MediaStream.id` | Browser-assigned | Deduplicating video elements |
| `userId` | Client-provided string | Redis geo-index member |

**Critical:** `MediaStream.id` ≠ `socket.id`. The VideoRoom component
maintains a `peerStreams` ref (`userId → MediaStream`) to bridge this gap.
Never filter remote streams by socket ID directly.

### Video Room Flow

```
join_video_room(roomId)  →  server broadcasts user_joined_call to room
leave_video_room(roomId) →  server broadcasts user_left_call to room
disconnect               →  server broadcasts user_left_call to all rooms socket was in
```

Cleanup in `VideoRoom.js` always emits `leave_video_room` before tearing
down peer connections and stopping tracks.

### nginx TLS

nginx terminates TLS on 443, proxies:
- `/*`            → Next.js client :3000
- `/health`       → Express server  :4000
- `/socket.io/*`  → Express server  :4000 (with WebSocket upgrade)

HTTP :80 redirects permanently to HTTPS.

---

## Environment Variables

| Variable | Service | Notes |
|----------|---------|-------|
| `DATABASE_URL` | server | PostGIS-enabled Postgres |
| `REDIS_URL` | server | Redis for geo-index |
| `PORT` | server | Default 4000 |
| `CORS_ORIGIN` | server | Use `https://localhost` locally |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | client | Required for the map |
| `NEXT_PUBLIC_SERVER_URL` | client | Use `https://localhost` locally |
| `NEXT_PUBLIC_GOOGLE_KEY` | client | Street View API key |
