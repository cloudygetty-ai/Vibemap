const React = require('react');
const { render, screen, fireEvent } = require('@testing-library/react');
require('@testing-library/jest-dom');

jest.mock('../StreetViewer', () => () => <div data-testid="street-viewer" />);
jest.mock('../VideoRoom', () => ({ roomId }) => <div data-testid="video-room" data-room-id={roomId} />);

const VibeControl = require('../VibeControl').default;

describe('VibeControl', () => {
  const defaultLocation = { id: 'loc-123' };

  test('renders without crashing', () => {
    render(<VibeControl activeLocation={defaultLocation} />);
    expect(screen.getByText('360° View')).toBeInTheDocument();
    expect(screen.getByText('Live Video')).toBeInTheDocument();
  });

  test('defaults to street view mode', () => {
    render(<VibeControl activeLocation={defaultLocation} />);
    expect(screen.getByRole('button', { name: '360° View' })).toBeInTheDocument();
    expect(screen.queryByTestId('video-room')).not.toBeInTheDocument();
  });

  test('switches to video mode when Live Video is clicked', () => {
    render(<VibeControl activeLocation={defaultLocation} />);
    fireEvent.click(screen.getByText('Live Video'));
    expect(screen.getByTestId('video-room')).toBeInTheDocument();
    expect(screen.getByTestId('video-room')).toHaveAttribute('data-room-id', 'loc-123');
  });

  test('switches back to street view from video mode', () => {
    render(<VibeControl activeLocation={defaultLocation} />);
    fireEvent.click(screen.getByText('Live Video'));
    expect(screen.getByTestId('video-room')).toBeInTheDocument();

    fireEvent.click(screen.getByText('360° View'));
    expect(screen.queryByTestId('video-room')).not.toBeInTheDocument();
  });
});
