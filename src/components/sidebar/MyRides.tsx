'use client';

/**
 * My rides, as a section of the left panel.
 *
 * It used to be a drawer over the right of the map with its own open/close
 * button — the last piece of the old floating-panel interface. Rides are one
 * more thing you pick from a list, so they belong in the column the other lists
 * are in, reached from the same rail.
 *
 * Recording is phone only. You start a ride by riding it, and nobody is holding
 * a desktop while they do — a Record button there is a button for a thing the
 * device cannot usefully do. The list stays on both, because looking back over
 * a ride is exactly what a big screen is good for.
 *
 * On a phone the controls sit at the bottom, outside the scroll, so Finish is
 * always in the same place however long your history is.
 *
 * State comes from `RideRecordingProvider`, which is above the section switch —
 * a recording has to survive a look at the trail list.
 */
import { useCallback } from 'react';
import { useRides } from '@/components/RideRecordingProvider';
import { useIsNarrow } from '@/hooks/useIsNarrow';
import { formatDistance, formatElapsed, formatElevation } from '@/utils/format';
import { RideHistory } from './RideHistory';

export function MyRides() {
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
    selectRide,
    selectedRideId,
    toggleRecording,
  } = useRides();
  const narrow = useIsNarrow();

  const onSelect = useCallback(
    (rideId: string) => selectRide(rideId),
    [selectRide],
  );

  return (
    <div className="flex flex-col min-h-0">
      {narrow && hasRecovery && !isRecording && (
        <div className="mb-3 p-3 rounded-card bg-clay/15 border border-clay/40 text-ui">
          <p className="font-semibold text-cream mb-2">Unfinished ride found</p>
          <div className="flex gap-2">
            <RecoveryButton label="Continue" onClick={continueRide} primary />
            <RecoveryButton label="Save it" onClick={recoverRide} />
            <RecoveryButton label="Discard" onClick={dismissRecovery} />
          </div>
        </div>
      )}

      <RideHistory
        isRecording={isRecording}
        onRideSelect={onSelect}
        selectedRideId={selectedRideId}
      />

      {narrow && (
        <div className="mt-4 -mx-4 px-4 pt-3 pb-1 bg-forest-sunk border-t border-black/25">
          {isRecording ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between text-center">
                <RecordingStat
                  label="Time"
                  value={formatElapsed(elapsedTime)}
                />
                <RecordingStat
                  label="Distance"
                  value={formatDistance(liveDistance)}
                />
                <RecordingStat
                  label="Climbing"
                  value={formatElevation(liveElevationGain)}
                />
              </div>
              <div className="flex gap-2">
                <button
                  className="flex-1 p-2.5 rounded-control text-ui font-semibold cursor-pointer border-none transition-colors bg-cream/10 text-cream hover:bg-cream/20"
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  type="button"
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  className="flex-1 p-2.5 rounded-control text-ui font-semibold cursor-pointer border-none transition-colors bg-red-500 text-white hover:bg-red-600"
                  onClick={toggleRecording}
                  type="button"
                >
                  Finish
                </button>
              </div>
              <p className="text-meta text-cream/50 text-center mt-1 leading-tight">
                Keep your phone on to track GPS. The screen will stay on.
              </p>
            </div>
          ) : (
            <button
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-3.5 rounded-control bg-clay text-forest cursor-pointer text-body font-semibold border-none transition-colors hover:bg-clay/85"
              onClick={toggleRecording}
              type="button"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
              Record a ride
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RecoveryButton({
  label,
  onClick,
  primary = false,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      className={
        primary
          ? 'flex-1 px-3 py-1.5 rounded-control bg-clay text-forest text-meta font-semibold hover:bg-clay/85'
          : 'flex-1 px-3 py-1.5 rounded-control bg-cream/10 text-cream text-meta font-semibold hover:bg-cream/20'
      }
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function RecordingStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col flex-1">
      <span className="text-body font-bold tabular-nums text-cream">
        {value}
      </span>
      <span className="text-meta text-cream/50 mt-px">{label}</span>
    </div>
  );
}
