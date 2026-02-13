const React = require('react');
const { render } = require('@testing-library/react');
require('@testing-library/jest-dom');

const mockMapInstance = {
  on: jest.fn((event, cb) => { if (event === 'load') cb(); }),
  addLayer: jest.fn(),
  remove: jest.fn(),
};
const MockMap = jest.fn(() => mockMapInstance);

jest.mock('mapbox-gl', () => ({
  accessToken: '',
  Map: MockMap,
}));

const mockSocket = { id: 'mock-socket-id', emit: jest.fn(), on: jest.fn(), disconnect: jest.fn() };
jest.mock('socket.io-client', () => jest.fn(() => mockSocket));

const mockWatchPosition = jest.fn();
const mockClearWatch = jest.fn();
Object.defineProperty(global.navigator, 'geolocation', {
  value: { watchPosition: mockWatchPosition, clearWatch: mockClearWatch },
  configurable: true,
});

const VibeMap = require('../VibeMap').default;

describe('VibeMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWatchPosition.mockReturnValue(42);
  });

  test('renders the map container', () => {
    const { container } = render(<VibeMap />);
    const mapDiv = container.querySelector('.w-full.h-screen.bg-black');
    expect(mapDiv).toBeInTheDocument();
  });

  test('initializes Mapbox with correct config', () => {
    render(<VibeMap />);
    expect(MockMap).toHaveBeenCalledWith(
      expect.objectContaining({
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-73.98, 40.75],
        zoom: 15,
        pitch: 65,
        bearing: -20,
      })
    );
  });

  test('starts geolocation watcher on mount', () => {
    render(<VibeMap />);
    expect(mockWatchPosition).toHaveBeenCalledWith(expect.any(Function));
  });

  test('emits location update via socket when position changes', () => {
    render(<VibeMap />);
    const callback = mockWatchPosition.mock.calls[0][0];
    callback({ coords: { latitude: 40.75, longitude: -73.98 } });

    expect(mockSocket.emit).toHaveBeenCalledWith('update_location', {
      userId: 'mock-socket-id',
      lat: 40.75,
      lng: -73.98,
    });
  });

  test('adds 3D building layer on map load', () => {
    render(<VibeMap />);
    expect(mockMapInstance.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '3d-buildings',
        type: 'fill-extrusion',
      })
    );
  });

  test('cleans up geolocation watcher and map on unmount', () => {
    const { unmount } = render(<VibeMap />);
    unmount();
    expect(mockClearWatch).toHaveBeenCalledWith(42);
    expect(mockMapInstance.remove).toHaveBeenCalled();
  });
});
