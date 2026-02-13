const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createClient } = require('redis');
const { Pool } = require('pg');
const { createSocketHandlers } = require('./handlers');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const redis = createClient({ url: process.env.REDIS_URL });
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  await redis.connect();

  const registerHandlers = createSocketHandlers({ redis, pg, io });
  io.on('connection', registerHandlers);
})();

server.listen(4000, () => console.log('Backend Online Port 4000'));
