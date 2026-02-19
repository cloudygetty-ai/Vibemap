const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { Pool } = require('pg');

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';

const app = express();
app.use(express.json());

// Health check — used by Docker and load balancers
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CORS_ORIGIN } });

const redis = createClient({ url: process.env.REDIS_URL });
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

redis.on('error', (err) => console.error('Redis error:', err));

(async () => {
  await redis.connect();
  console.log('Redis connected');

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // LOCATION PING: Add user to Redis Geo-index
    socket.on('update_location', async ({ userId, lat, lng }) => {
      try {
        if (!userId || lat == null || lng == null) return;
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
        console.error('update_location error:', err);
      }
    });

    // VIBE TAGGING: Real-time broadcast + DB log
    socket.on('set_vibe', async ({ lat, lng, vibeType }) => {
      try {
        if (lat == null || lng == null || !vibeType) return;
        await pg.query(
          'INSERT INTO vibe_logs (location, vibe_type) VALUES (ST_MakePoint($1, $2), $3)',
          [lng, lat, vibeType]
        );
        io.emit('global_vibe_change', { lat, lng, vibeType });
      } catch (err) {
        console.error('set_vibe error:', err);
      }
    });

    // WEBRTC SIGNALING
    socket.on('join_video_room', (roomId) => {
      socket.join(roomId);
      socket.to(roomId).emit('user_joined_call', { userId: socket.id });
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
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  server.listen(PORT, () => console.log(`Backend online on port ${PORT}`));
})();

// Graceful shutdown
async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`);
  server.close(async () => {
    await redis.quit();
    await pg.end();
    console.log('Clean shutdown complete');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
