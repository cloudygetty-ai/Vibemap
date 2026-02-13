module.exports = {
  projects: [
    {
      displayName: 'server',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/server/__tests__/**/*.test.js'],
    },
    {
      displayName: 'client',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/client/**/__tests__/**/*.test.js'],
      moduleNameMapper: {
        'mapbox-gl': '<rootDir>/client/__mocks__/mapbox-gl.js',
        'socket.io-client': '<rootDir>/client/__mocks__/socket.io-client.js',
      },
    },
  ],
};
