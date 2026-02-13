const { validateCoordinates, validateUserId, validateVibeType, validateRoomId } = require('./validation');

function createSocketHandlers({ redis, pg, io }) {
  return function registerHandlers(socket) {
    socket.on('update_location', async ({ userId, lat, lng } = {}) => {
      const coordResult = validateCoordinates(lat, lng);
      if (!coordResult.valid) {
        socket.emit('error', { event: 'update_location', message: coordResult.error });
        return;
      }
      const userResult = validateUserId(userId);
      if (!userResult.valid) {
        socket.emit('error', { event: 'update_location', message: userResult.error });
        return;
      }

      try {
        await redis.geoAdd('active_vibers', { longitude: lng, latitude: lat, member: userId });
        const nearbyIds = await redis.geoSearch('active_vibers',
          { longitude: lng, latitude: lat },
          { radius: 1000, unit: 'm' }
        );
        socket.emit('nearby_update', nearbyIds);
      } catch (err) {
        socket.emit('error', { event: 'update_location', message: 'Internal server error' });
      }
    });

    socket.on('set_vibe', async ({ lat, lng, vibeType } = {}) => {
      const coordResult = validateCoordinates(lat, lng);
      if (!coordResult.valid) {
        socket.emit('error', { event: 'set_vibe', message: coordResult.error });
        return;
      }
      const vibeResult = validateVibeType(vibeType);
      if (!vibeResult.valid) {
        socket.emit('error', { event: 'set_vibe', message: vibeResult.error });
        return;
      }

      try {
        await pg.query(
          'INSERT INTO vibe_logs (location, vibe_type) VALUES (ST_MakePoint($1, $2), $3)',
          [lng, lat, vibeType]
        );
        io.emit('global_vibe_change', { lat, lng, vibeType });
      } catch (err) {
        socket.emit('error', { event: 'set_vibe', message: 'Internal server error' });
      }
    });

    socket.on('join_video_room', (roomId) => {
      const result = validateRoomId(roomId);
      if (!result.valid) {
        socket.emit('error', { event: 'join_video_room', message: result.error });
        return;
      }
      socket.join(roomId);
      socket.to(roomId).emit('user_joined_call', { userId: socket.id });
    });
  };
}

module.exports = { createSocketHandlers };
