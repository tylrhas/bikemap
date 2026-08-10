'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBicycle } from '@fortawesome/free-solid-svg-icons';
import type { RecordedRide, RideSummary } from '@/data/ride';
import { MAP_EVENTS } from '@/events';
import {
  getRideSummaries,
  getStorageUsage,
  loadRide,
} from '@/utils/ride-storage';
import {
  formatDistance,
  formatDurationShort,
  formatDate,
  formatBytes,
  formatElevation,
} from '@/utils/format';
import { useIsNarrow } from '@/hooks/useIsNarrow';
import { cn } from '@/lib/utils';
import { RideDetail } from './RideDetail';

export interface RideHistoryProps {
  selectedRideId: string | null;
  onRideSelect: (rideId: string) => void;
  isRecording?: boolean;
}

export function RideHistory({
  selectedRideId,
  onRideSelect,
  isRecording,
}: RideHistoryProps) {
  const [summaries, setSummaries] = useState<RideSummary[]>([]);
  const [selectedRide, setSelectedRide] = useState<RecordedRide | null>(null);
  // Recording is a phone job, so on a desktop there is no Record to point at.
  const narrow = useIsNarrow();

  const refreshSummaries = useCallback(() => {
    getRideSummaries()
      .then(setSummaries)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshSummaries();
  }, [refreshSummaries]);

  useEffect(() => {
    const refresh = () => refreshSummaries();

    window.addEventListener(MAP_EVENTS.RIDE_RECORDING_STOP, refresh);
    window.addEventListener(MAP_EVENTS.RIDE_SELECT, refresh);
    window.addEventListener(MAP_EVENTS.RIDE_DESELECT, refresh);
    return () => {
      window.removeEventListener(MAP_EVENTS.RIDE_RECORDING_STOP, refresh);
      window.removeEventListener(MAP_EVENTS.RIDE_SELECT, refresh);
      window.removeEventListener(MAP_EVENTS.RIDE_DESELECT, refresh);
    };
  }, [refreshSummaries]);

  useEffect(() => {
    if (selectedRideId) {
      loadRide(selectedRideId)
        .then(setSelectedRide)
        .catch(() => {});
    } else {
      setSelectedRide(null);
    }
  }, [selectedRideId]);

  const handleDetailClose = () => {
    window.dispatchEvent(new CustomEvent(MAP_EVENTS.RIDE_DESELECT));
  };

  const handleDeleted = () => {
    window.dispatchEvent(new CustomEvent(MAP_EVENTS.RIDE_DESELECT));
  };

  if (selectedRide) {
    return (
      <RideDetail
        ride={selectedRide}
        onClose={handleDetailClose}
        onDeleted={handleDeleted}
      />
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="py-8 px-2 text-center text-cream/50">
        <FontAwesomeIcon
          icon={faBicycle}
          className="text-3xl mb-3 text-cream/25"
        />
        <p className="text-body font-medium text-cream/80 mb-1">
          {isRecording ? 'Recording your ride' : 'Track your rides'}
        </p>
        <p className="text-ui leading-relaxed">
          {isRecording
            ? 'Logging your ride with GPS.'
            : narrow
              ? 'Tap Record to start logging your ride with GPS.'
              : 'Record one on your phone and it will be waiting here.'}{' '}
          Rides are saved offline on your device.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {summaries.map((s) => (
        <div
          key={s.id}
          onClick={() => onRideSelect(s.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onRideSelect(s.id);
            }
          }}
          role="button"
          tabIndex={0}
          className={cn(
            // The same raised tile and clay rail a trail row carries, so "this
            // ride is selected" and "this trail is selected" read as one idea.
            'px-3.5 py-2.5 rounded-card cursor-pointer transition-colors border-l-[3px]',
            selectedRideId === s.id
              ? 'border-l-clay bg-clay/[0.22]'
              : 'border-l-transparent bg-forest-lift hover:bg-cream/[0.10]',
          )}
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-control shrink-0 bg-clay" />
            <span className="text-ui font-medium text-cream truncate">
              {s.name}
            </span>
          </div>
          <div className="text-meta text-cream/55 mt-1 ml-[22px] tabular-nums">
            {formatDate(s.startTime)} &middot;{' '}
            {formatDistance(s.stats.distance)} &middot;{' '}
            {formatDurationShort(s.stats.elapsedTime)}
            {s.stats.elevationGain > 0 && (
              <> &middot; &uarr;{formatElevation(s.stats.elevationGain)}</>
            )}
          </div>
        </div>
      ))}
      <StorageIndicator />
    </div>
  );
}

function StorageIndicator() {
  const [usage, setUsage] = useState<{
    usedKB: number;
    totalKB: number;
  } | null>(null);

  useEffect(() => {
    getStorageUsage()
      .then(setUsage)
      .catch(() => {});
  }, []);

  if (!usage || usage.totalKB === 0) return null;

  const { usedKB, totalKB } = usage;
  const pct = Math.min(100, (usedKB / totalKB) * 100);

  return (
    <div className="pt-3 pb-1 text-meta text-cream/50">
      <div className="h-1 rounded-control bg-cream/15 mb-1">
        <div
          className={`h-full rounded-control transition-[width] duration-300 ${pct > 80 ? 'bg-red-500' : 'bg-clay'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span>
        {formatBytes(usedKB)} of {formatBytes(totalKB)} used
      </span>
    </div>
  );
}
