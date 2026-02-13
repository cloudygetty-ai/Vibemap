const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const redis = createClient({ url: process.env.REDIS_URL });
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  await redis.connect();

  io.on('connection', (socket) => {
    // LOCATION PING: Add user to Redis Geo-index
    socket.on('update_location', async ({ userId, lat, lng }) => {
      await redis.geoAdd('active_vibers', { longitude: lng, latitude: lat, member: userId });
      
      // Query users within 1km radius
      const nearbyIds = await redis.geoSearch('active_vibers', 
        { longitude: lng, latitude: lat }, 
        { radius: 1000, unit: 'm' }
      );
      socket.emit('nearby_update', nearbyIds);
    });

    // VIBE TAGGING: Real-time broadcast + DB Log
    socket.on('set_vibe', async ({ lat, lng, vibeType }) => {
      await pg.query('INSERT INTO vibe_logs (location, vibe_type) VALUES (ST_MakePoint($1, $2), $3)', [lng, lat, vibeType]);
      io.emit('global_vibe_change', { lat, lng, vibeType });
    });

    // WEBRTC SIGNALING: Group video call logic
    socket.on('join_video_room', (roomId) => {
      socket.join(roomId);
      socket.to(roomId).emit('user_joined_call', { userId: socket.id });
    });
  });
})();

server.listen(4000, () => console.log('Backend Online Port 4000'));
