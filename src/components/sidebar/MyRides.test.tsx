import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MyRides } from './MyRides';

const rides = {
  continueRide: vi.fn(),
  dismissRecovery: vi.fn(),
  elapsedTime: 0,
  hasRecovery: true,
  isPaused: false,
  isRecording: false,
  liveDistance: 0,
  liveElevationGain: 0,
  pauseRecording: vi.fn(),
  recoverRide: vi.fn(),
  resumeRecording: vi.fn(),
  selectRide: vi.fn(),
  selectedRideId: null,
  toggleRecording: vi.fn(),
};

vi.mock('@/components/RideRecordingProvider', () => ({
  useRides: () => rides,
}));

vi.mock('./RideHistory', () => ({
  RideHistory: () => <div data-testid="ride-history" />,
}));

/** The shared setup reports desktop; this is the only lever over that. */
function setViewport(narrow: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    addEventListener: vi.fn(),
    addListener: vi.fn(),
    dispatchEvent: vi.fn(),
    matches: narrow,
    media: query,
    onchange: null,
    removeEventListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}

const originalMatchMedia = window.matchMedia;
beforeEach(() => setViewport(false));
afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe('MyRides', () => {
  it('offers no recording on a desktop', () => {
    // You start a ride by riding it, and nobody is holding a desktop while they
    // do — a Record button there is a button for something the device cannot
    // usefully do.
    render(<MyRides />);

    expect(screen.queryByText('Record a ride')).not.toBeInTheDocument();
    expect(screen.queryByText('Unfinished ride found')).not.toBeInTheDocument();
  });

  it('still lists rides on a desktop, which is the point of a big screen', () => {
    render(<MyRides />);
    expect(screen.getByTestId('ride-history')).toBeInTheDocument();
  });

  it('offers recording on a phone', () => {
    setViewport(true);
    render(<MyRides />);

    expect(screen.getByText('Record a ride')).toBeInTheDocument();
    expect(screen.getByText('Unfinished ride found')).toBeInTheDocument();
  });
});
