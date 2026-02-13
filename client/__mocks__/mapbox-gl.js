const mapboxgl = {
  accessToken: '',
  Map: jest.fn(() => ({
    on: jest.fn((event, cb) => {
      if (event === 'load') cb();
    }),
    addLayer: jest.fn(),
    remove: jest.fn(),
  })),
};

module.exports = mapboxgl;
