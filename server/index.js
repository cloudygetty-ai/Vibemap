const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { Pool } = require('pg');
const pino = require('pino');
const pinoHttp = require('pino-http');

const log = pino({ level: process.env.LOG_LEVEL || 'info' });

// ── Validation helpers ───────────────────────────────────────────────────────

function isValidCoord(lat, lng) {
  return (
    typeof lat === 'number' && isFinite(lat) && lat >= -90 && lat <= 90 &&
    typeof lng === 'number' && isFinite(lng) && lng >= -180 && lng <= 180
  );
}

const VALID_VIBE_TYPES = new Set(['chill', 'intense', 'busy']);

// ── Per-socket in-memory rate limiter ────────────────────────────────────────
// Tracks event counts per socket in a rolling 1-second window.

function makeRateLimiter(maxPerSecond) {
  const counts = new Map(); // socketId -> { count, resetAt }
  return {
    allow(socketId) {
      const now = Date.now();
      let entry = counts.get(socketId);
      if (!entry || now >= entry.resetAt) {
        entry = { count: 1, resetAt: now + 1000 };
        counts.set(socketId, entry);
        return true;
      }
      if (entry.count >= maxPerSecond) return false;
      entry.count++;
      return true;
    },
    remove(socketId) {
      counts.delete(socketId);
    },
  };
}

const locationLimiter = makeRateLimiter(2);  // 2 location pings/sec per socket
const vibeLimiter     = makeRateLimiter(5);  // 5 vibe tags/sec per socket

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';

const app = express();
app.use(express.json());
app.use(pinoHttp({ logger: log, autoLogging: { ignore: (req) => req.url === '/health' } }));

// Health check — used by Docker and load balancers
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CORS_ORIGIN } });

const redis = createClient({ url: process.env.REDIS_URL });
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

redis.on('error', (err) => log.error({ err }, 'Redis error'));

(async () => {
  await redis.connect();
  log.info('Redis connected');

  io.on('connection', (socket) => {
    log.info({ socketId: socket.id }, 'Socket connected');

    // LOCATION PING: Add user to Redis Geo-index
    socket.on('update_location', async ({ userId, lat, lng }) => {
      if (!locationLimiter.allow(socket.id)) return;
      try {
        if (!userId || typeof userId !== 'string' || userId.length > 128) return;
        if (!isValidCoord(lat, lng)) return;
        await redis.geoAdd('active_vibers', {
          longitude: lng,
          latitude: lat,
          member: String(userId),
        });
        const nearbyIds = await redis.geoSearch(
          'active_vibers',
          { longitude: lng, latitude: lat },
          { radius: 1000, unit: 'm' }
        );
        socket.emit('nearby_update', nearbyIds);
      } catch (err) {
        log.error({ err, socketId: socket.id }, 'update_location error');
      }
    });

    // VIBE TAGGING: Real-time broadcast + DB log
    socket.on('set_vibe', async ({ lat, lng, vibeType }) => {
      if (!vibeLimiter.allow(socket.id)) return;
      try {
        if (!isValidCoord(lat, lng)) return;
        if (!vibeType || !VALID_VIBE_TYPES.has(vibeType)) return;
        await pg.query(
          'INSERT INTO vibe_logs (location, vibe_type) VALUES (ST_MakePoint($1, $2), $3)',
          [lng, lat, vibeType]
        );
        io.emit('global_vibe_change', { lat, lng, vibeType });
      } catch (err) {
        log.error({ err, socketId: socket.id }, 'set_vibe error');
      }
    });

    // WEBRTC SIGNALING
    socket.on('join_video_room', (roomId) => {
      if (typeof roomId !== 'string' || roomId.length > 128) return;
      socket.join(roomId);
      socket.to(roomId).emit('user_joined_call', { userId: socket.id });
    });

    socket.on('leave_video_room', (roomId) => {
      if (typeof roomId !== 'string' || roomId.length > 128) return;
      socket.leave(roomId);
      socket.to(roomId).emit('user_left_call', { userId: socket.id });
    });

    socket.on('rtc_offer', ({ to, offer }) => {
      io.to(to).emit('rtc_offer', { from: socket.id, offer });
    });

    socket.on('rtc_answer', ({ to, answer }) => {
      io.to(to).emit('rtc_answer', { from: socket.id, answer });
    });

    socket.on('rtc_ice_candidate', ({ to, candidate }) => {
      io.to(to).emit('rtc_ice_candidate', { from: socket.id, candidate });
    });

    socket.on('disconnect', () => {
      // Notify any video rooms this socket was still in
      for (const roomId of socket.rooms) {
        if (roomId !== socket.id) {
          socket.to(roomId).emit('user_left_call', { userId: socket.id });
        }
      }
      locationLimiter.remove(socket.id);
      vibeLimiter.remove(socket.id);
      log.info({ socketId: socket.id }, 'Socket disconnected');
    });
  });

  server.listen(PORT, () => log.info({ port: PORT }, 'Backend online'));
})();

// Graceful shutdown
async function shutdown(signal) {
  log.info({ signal }, 'Shutting down');
  server.close(async () => {
    await redis.quit();
    await pg.end();
    log.info('Clean shutdown complete');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
