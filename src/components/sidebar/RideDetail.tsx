'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload,
  faTrash,
  faChevronLeft,
  faPencilAlt,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import type { RecordedRide } from '@/data/ride';
import { cn } from '@/lib/utils';
import { buildRideGpx } from '@/utils/gpx';
import { deleteRide, renameRide } from '@/utils/ride-storage';
import {
  downloadFile,
  formatDuration,
  formatDistance,
  formatSpeed,
  formatElevation,
} from '@/utils/format';
import { slugify } from '@/utils/string';

interface RideDetailProps {
  ride: RecordedRide;
  onClose: () => void;
  onDeleted: () => void;
}

export function RideDetail({ ride, onClose, onDeleted }: RideDetailProps) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(ride.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [currentName, setCurrentName] = useState(ride.name);

  const handleRename = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== currentName) {
      renameRide(ride.id, trimmed).catch(() => {});
      setCurrentName(trimmed);
    }
    setEditing(false);
  };

  const handleExportGpx = () => {
    const gpx = buildRideGpx({ name: currentName, points: ride.points });
    downloadFile(gpx, `${slugify(currentName)}.gpx`, 'application/gpx+xml');
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteRide(ride.id).catch(() => {});
    onDeleted();
  };

  const date = new Date(ride.startTime).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const time = new Date(ride.startTime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const { stats } = ride;

  return (
    <div className="p-3">
      <button
        type="button"
        className="flex items-center gap-1.5 text-ui text-clay cursor-pointer mb-2.5 py-2 px-1 -ml-1 bg-transparent border-none hover:text-clay/80"
        onClick={onClose}
      >
        <FontAwesomeIcon icon={faChevronLeft} />
        <span>Back</span>
      </button>

      <div className="flex items-center justify-between gap-2 mb-1">
        {editing ? (
          <div className="flex items-center gap-1.5 flex-1">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setEditing(false);
              }}
              autoFocus
              className="flex-1 text-ui font-semibold px-1.5 py-1 rounded-control bg-cream/10 text-cream border border-cream/20 outline-none min-w-0 focus:border-clay"
            />
            <IconButton onClick={handleRename} icon={faCheck} />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 font-semibold text-body text-cream flex-1 min-w-0">
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">
              {currentName}
            </span>
            <IconButton onClick={() => setEditing(true)} icon={faPencilAlt} />
          </div>
        )}
      </div>

      <div className="text-meta text-cream/55 mb-3">
        {date} at {time}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat value={formatDistance(stats.distance)} label="Distance" />
        <Stat value={formatDuration(stats.elapsedTime)} label="Time" />
        <Stat value={formatSpeed(stats.avgSpeed)} label="Avg Speed" />
        <Stat value={formatSpeed(stats.maxSpeed)} label="Max Speed" />
        <Stat value={formatElevation(stats.elevationGain)} label="Climbing" />
        <Stat value={formatDuration(stats.movingTime)} label="Moving" />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 py-2 px-2.5 rounded-control bg-cream/10 text-cream cursor-pointer text-meta font-semibold flex items-center justify-center gap-1.5 transition-colors border-none hover:bg-cream/20"
          onClick={handleExportGpx}
        >
          <FontAwesomeIcon icon={faDownload} /> Export GPX
        </button>
        <button
          type="button"
          className={cn(
            'flex-1 py-2 px-2.5 rounded-control cursor-pointer text-meta font-semibold flex items-center justify-center gap-1.5 transition-colors border-none',
            confirmDelete
              ? 'bg-red-500 text-white'
              : 'bg-cream/10 text-cream hover:bg-red-500/80 hover:text-white',
          )}
          onClick={handleDelete}
        >
          <FontAwesomeIcon icon={faTrash} />{' '}
          {confirmDelete ? 'Confirm Delete' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

function IconButton({
  onClick,
  icon,
}: {
  onClick: () => void;
  icon: typeof faCheck;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-transparent border-none cursor-pointer text-cream/50 p-1 text-ui leading-none rounded-control hover:text-cream hover:bg-cream/10"
    >
      <FontAwesomeIcon icon={icon} />
    </button>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="text-ui font-semibold text-cream tabular-nums">
        {value}
      </span>
      <span className="text-meta text-cream/50 mt-px">{label}</span>
    </div>
  );
}
