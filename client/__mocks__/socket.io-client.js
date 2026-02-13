const socket = {
  id: 'mock-socket-id',
  emit: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn(),
};

module.exports = jest.fn(() => socket);
module.exports._socket = socket;
