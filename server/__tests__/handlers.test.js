const { createSocketHandlers } = require('../handlers');

function createMockSocket() {
  const handlers = {};
  return {
    id: 'socket-123',
    on: jest.fn((event, handler) => { handlers[event] = handler; }),
    emit: jest.fn(),
    join: jest.fn(),
    to: jest.fn(() => ({ emit: jest.fn() })),
    _handlers: handlers,
  };
}

function createMockDeps() {
  return {
    redis: {
      geoAdd: jest.fn().mockResolvedValue(1),
      geoSearch: jest.fn().mockResolvedValue(['user-1', 'user-2']),
    },
    pg: {
      query: jest.fn().mockResolvedValue({ rowCount: 1 }),
    },
    io: {
      emit: jest.fn(),
    },
  };
}

describe('createSocketHandlers', () => {
  let socket, deps, toEmit;

  beforeEach(() => {
    socket = createMockSocket();
    deps = createMockDeps();
    toEmit = jest.fn();
    socket.to = jest.fn(() => ({ emit: toEmit }));

    const registerHandlers = createSocketHandlers(deps);
    registerHandlers(socket);
  });

  test('registers all three event handlers', () => {
    expect(socket.on).toHaveBeenCalledWith('update_location', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('set_vibe', expect.any(Function));
    expect(socket.on).toHaveBeenCalledWith('join_video_room', expect.any(Function));
  });

  describe('update_location', () => {
    test('adds user to Redis geo-index and returns nearby users', async () => {
      await socket._handlers.update_location({ userId: 'user-1', lat: 40.75, lng: -73.98 });

      expect(deps.redis.geoAdd).toHaveBeenCalledWith('active_vibers', {
        longitude: -73.98, latitude: 40.75, member: 'user-1',
      });
      expect(deps.redis.geoSearch).toHaveBeenCalledWith(
        'active_vibers',
        { longitude: -73.98, latitude: 40.75 },
        { radius: 1000, unit: 'm' }
      );
      expect(socket.emit).toHaveBeenCalledWith('nearby_update', ['user-1', 'user-2']);
    });

    test('emits error for invalid coordinates', async () => {
      await socket._handlers.update_location({ userId: 'user-1', lat: 999, lng: -73 });

      expect(deps.redis.geoAdd).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        event: 'update_location',
      }));
    });

    test('emits error for missing userId', async () => {
      await socket._handlers.update_location({ lat: 40.75, lng: -73.98 });

      expect(deps.redis.geoAdd).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        event: 'update_location',
      }));
    });

    test('handles Redis failure gracefully', async () => {
      deps.redis.geoAdd.mockRejectedValue(new Error('Redis down'));

      await socket._handlers.update_location({ userId: 'user-1', lat: 40.75, lng: -73.98 });

      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        event: 'update_location',
        message: 'Internal server error',
      }));
    });
  });

  describe('set_vibe', () => {
    test('inserts vibe log and broadcasts globally', async () => {
      await socket._handlers.set_vibe({ lat: 40.75, lng: -73.98, vibeType: 'chill' });

      expect(deps.pg.query).toHaveBeenCalledWith(
        'INSERT INTO vibe_logs (location, vibe_type) VALUES (ST_MakePoint($1, $2), $3)',
        [-73.98, 40.75, 'chill']
      );
      expect(deps.io.emit).toHaveBeenCalledWith('global_vibe_change', {
        lat: 40.75, lng: -73.98, vibeType: 'chill',
      });
    });

    test('emits error for invalid vibeType', async () => {
      await socket._handlers.set_vibe({ lat: 40, lng: -73, vibeType: 'unknown' });

      expect(deps.pg.query).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        event: 'set_vibe',
      }));
    });

    test('emits error for invalid coordinates', async () => {
      await socket._handlers.set_vibe({ lat: 'bad', lng: -73, vibeType: 'chill' });

      expect(deps.pg.query).not.toHaveBeenCalled();
    });

    test('handles PostgreSQL failure gracefully', async () => {
      deps.pg.query.mockRejectedValue(new Error('PG down'));

      await socket._handlers.set_vibe({ lat: 40.75, lng: -73.98, vibeType: 'chill' });

      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        event: 'set_vibe',
        message: 'Internal server error',
      }));
    });
  });

  describe('join_video_room', () => {
    test('joins the room and notifies other members', () => {
      socket._handlers.join_video_room('room-abc');

      expect(socket.join).toHaveBeenCalledWith('room-abc');
      expect(socket.to).toHaveBeenCalledWith('room-abc');
      expect(toEmit).toHaveBeenCalledWith('user_joined_call', { userId: 'socket-123' });
    });

    test('emits error for empty roomId', () => {
      socket._handlers.join_video_room('');

      expect(socket.join).not.toHaveBeenCalled();
      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        event: 'join_video_room',
      }));
    });

    test('emits error for non-string roomId', () => {
      socket._handlers.join_video_room(123);

      expect(socket.join).not.toHaveBeenCalled();
    });
  });
});
