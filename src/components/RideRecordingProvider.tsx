'use client';

/**
 * Recording state, and the live readout that goes over the map.
 *
 * My rides used to be a drawer over the right of the map that owned all of
 * this. Now the list lives in the left panel like everything else you can pick
 * from — but a recording has to survive switching to Trails and back, so the
 * state cannot live in the section that draws it. It lives here, above the
 * panel, and the section reads it through context.
 *
 * The HUD is the other half: while you are recording and looking at something
 * other than your rides, this is the only thing telling you the clock is
 * running, and it carries Pause and Finish so stopping never costs you a tab
 * switch.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  memo,
  type ReactNode,
} from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFlagCheckered,
  faPause,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';
import { useRideRecording } from '@/hooks';
import { formatDistance, formatElapsed, formatElevation } from '@/utils/format';
import { MAP_EVENTS } from '@/events';

const PulseDot = memo(function PulseDot() {
  return (
    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse-dot shrink-0 self-center mt-px" />
  );
});

interface RideRecordingValue {
  continueRide: () => void;
  dismissRecovery: () => void;
  elapsedTime: number;
  hasRecovery: boolean;
  isPaused: boolean;
  isRecording: boolean;
  liveDistance: number;
  liveElevationGain: number;
  pauseRecording: () => void;
  recoverRide: () => void;
  resumeRecording: () => void;
  selectRide: (rideId: string) => void;
  selectedRideId: null | string;
  /** Starts a ride, or finishes the one running. */
  toggleRecording: () => void;
}

const RideRecordingContext = createContext<null | RideRecordingValue>(null);

export function useRides(): RideRecordingValue {
  const value = useContext(RideRecordingContext);
  if (!value) {
    throw new Error('useRides must be used inside RideRecordingProvider');
  }
  return value;
}

/** The app's one toast, rather than a second one inside the panel. */
function toast(message: string): void {
  window.dispatchEvent(
    new CustomEvent(MAP_EVENTS.TOAST, { detail: { message } }),
  );
}

export function RideRecordingProvider({ children }: { children: ReactNode }) {
  const [selectedRideId, setSelectedRideId] = useState<null | string>(null);
  // Whether the rides list is on screen. The panel tells us; the HUD would
  // otherwise repeat stats the reader is already looking at.
  const [listVisible, setListVisible] = useState(false);

  const {
    continueRide,
    dismissRecovery,
    elapsedTime,
    hasRecovery,
    isPaused,
    isRecording,
    liveDistance,
    liveElevationGain,
    pauseRecording,
    recoverRide,
    resumeRecording,
    startRecording,
    stopRecording,
  } = useRideRecording(toast);

  const isRecordingRef = useRef(isRecording);
  isRecordingRef.current = isRecording;

  useEffect(() => {
    const onSelect = (event: Event) => {
      setSelectedRideId((event as CustomEvent).detail.rideId);
    };
    const onDeselect = () => setSelectedRideId(null);
    const onPanel = (event: Event) => {
      setListVisible((event as CustomEvent).detail?.isOpen ?? false);
    };

    window.addEventListener(MAP_EVENTS.RIDE_SELECT, onSelect);
    window.addEventListener(MAP_EVENTS.RIDE_DESELECT, onDeselect);
    window.addEventListener(MAP_EVENTS.RIDES_PANEL_TOGGLE, onPanel);
    return () => {
      window.removeEventListener(MAP_EVENTS.RIDE_SELECT, onSelect);
      window.removeEventListener(MAP_EVENTS.RIDE_DESELECT, onDeselect);
      window.removeEventListener(MAP_EVENTS.RIDES_PANEL_TOGGLE, onPanel);
    };
  }, []);

  const toggleRecording = useCallback(async () => {
    if (!isRecordingRef.current) {
      startRecording();
      return;
    }
    const ride = await stopRecording();
    if (!ride) {
      toast('Ride too short to save — keep recording longer');
      return;
    }
    toast('Ride saved!');
    window.dispatchEvent(
      new CustomEvent(MAP_EVENTS.RIDE_SELECT, { detail: { rideId: ride.id } }),
    );
  }, [startRecording, stopRecording]);

  // The dock's "Start ride" asks rather than reaching in — recording state
  // lives here, and starting one already in progress would lose the first.
  useEffect(() => {
    const handler = () => {
      if (!isRecordingRef.current) {
        startRecording();
      }
    };
    window.addEventListener(MAP_EVENTS.RIDE_START_REQUEST, handler);
    return () =>
      window.removeEventListener(MAP_EVENTS.RIDE_START_REQUEST, handler);
  }, [startRecording]);

  const selectRide = useCallback((rideId: string) => {
    setSelectedRideId(rideId);
    window.dispatchEvent(
      new CustomEvent(MAP_EVENTS.RIDE_SELECT, { detail: { rideId } }),
    );
    window.dispatchEvent(new CustomEvent(MAP_EVENTS.ROUTE_DESELECT));
    window.dispatchEvent(new CustomEvent(MAP_EVENTS.TRAIL_DESELECT));
  }, []);

  return (
    <RideRecordingContext.Provider
      value={{
        continueRide,
        dismissRecovery,
        elapsedTime,
        hasRecovery,
        isPaused,
        isRecording,
        liveDistance,
        liveElevationGain,
        pauseRecording,
        recoverRide,
        resumeRecording,
        selectRide,
        selectedRideId,
        toggleRecording,
      }}
    >
      {children}
      {isRecording && !listVisible && <RecordingHud />}
    </RideRecordingContext.Provider>
  );
}

function RecordingHud() {
  const {
    elapsedTime,
    isPaused,
    liveDistance,
    liveElevationGain,
    pauseRecording,
    resumeRecording,
    toggleRecording,
  } = useRides();

  return (
    <div className="fixed top-[calc(22px+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-toast bg-white rounded-xl shadow-lg h-10 px-3 flex items-center gap-2.5 text-sm max-md:top-[calc(76px+env(safe-area-inset-top))] max-md:left-2 max-md:right-2 max-md:translate-x-0">
      <PulseDot />
      <span className="font-bold tabular-nums text-gray-700">
        {formatElapsed(elapsedTime)}
      </span>
      <span className="tabular-nums text-gray-500">
        {formatDistance(liveDistance)}
      </span>
      <span className="tabular-nums text-gray-500">
        {formatElevation(liveElevationGain)}
      </span>
      <div className="flex gap-1.5 ml-auto">
        <button
          aria-label={isPaused ? 'Resume' : 'Pause'}
          className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center cursor-pointer border-none hover:bg-gray-200 text-xs"
          onClick={isPaused ? resumeRecording : pauseRecording}
          type="button"
        >
          <FontAwesomeIcon icon={isPaused ? faPlay : faPause} />
        </button>
        <button
          aria-label="Finish ride"
          className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer border-none hover:bg-red-600 text-xs"
          onClick={toggleRecording}
          type="button"
        >
          <FontAwesomeIcon icon={faFlagCheckered} />
        </button>
      </div>
    </div>
  );
}
