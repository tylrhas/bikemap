import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RaceEvent } from '@/data/race-events';
import { CheckpointMarkers, placeCheckpoints } from './CheckpointMarkers';
import { EventEtaReadout } from './EventEtaReadout';

const EVENT: RaceEvent = {
  checkpoints: [
    {
      isCutoff: false,
      label: 'Start',
      leadEta: '2026-08-15T15:00:00Z',
      mile: 0,
      sweepEta: '2026-08-15T15:30:00Z',
    },
    {
      isCutoff: true,
      label: 'Aid 1',
      leadEta: '2026-08-15T17:00:00Z',
      mile: 2,
      sweepEta: '2026-08-15T19:00:00Z',
    },
    {
      isCutoff: false,
      label: 'Finish',
      leadEta: '2026-08-15T19:00:00Z',
      mile: 4,
      sweepEta: '2026-08-15T23:00:00Z',
    },
  ],
  course: [],
  direction: 'forward',
  id: '1',
  name: 'Cascade Gravel Grinder',
  originLabel: 'trailhead',
  startsAt: '2026-08-15T15:00:00Z',
  terminusLabel: 'summit',
  trailSlug: 'phils-trail',
};

describe('EventEtaReadout', () => {
  it('hedges an interpolated estimate, in italic', () => {
    const { container } = render(<EventEtaReadout event={EVENT} mile={1} />);
    expect(screen.getByText(/typically pass around/)).toBeInTheDocument();
    expect(container.querySelector('.italic')).not.toBeNull();
    expect(container.querySelector('.font-semibold')).toBeNull();
  });

  it('states a cutoff plainly, upright and bold', () => {
    // The visual half of the same distinction the wording makes: an organizer
    // enforces this time, so it is not dressed as a guess.
    const { container } = render(<EventEtaReadout event={EVENT} mile={2} />);
    expect(screen.getByText(/cutoff/)).toBeInTheDocument();
    expect(container.querySelector('.font-semibold')).not.toBeNull();
    expect(container.querySelector('.italic')).toBeNull();
  });

  it('renders nothing for a race with no checkpoints', () => {
    const { container } = render(
      <EventEtaReadout event={{ ...EVENT, checkpoints: [] }} mile={1} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

const PROFILE = {
  distance: 21120,
  gain: 500,
  loss: 500,
  max: 4500,
  min: 4000,
  profile: [
    [0, 4000, -121.3, 44.05],
    [5280, 4200, -121.29, 44.06],
    [10560, 4500, -121.28, 44.07],
    [15840, 4200, -121.27, 44.08],
    [21120, 4000, -121.26, 44.09],
  ] as [number, number, number, number][],
  trail: "Phil's Trail",
};

describe('CheckpointMarkers', () => {
  it('marks each checkpoint on the chart', () => {
    render(
      <CheckpointMarkers
        chartWidth={800}
        checkpoints={EVENT.checkpoints}
        points={PROFILE.profile}
        profile={PROFILE}
      />,
    );
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Aid 1')).toBeInTheDocument();
    expect(screen.getByText('Finish')).toBeInTheDocument();
  });

  it('gives a cutoff more weight than an ordinary checkpoint', () => {
    render(
      <CheckpointMarkers
        chartWidth={800}
        checkpoints={EVENT.checkpoints}
        points={PROFILE.profile}
        profile={PROFILE}
      />,
    );
    expect(screen.getByText('Aid 1').className).toContain('font-bold');
    expect(screen.getByText('Start').className).toContain('font-semibold');
    expect(screen.getByText('Start').className).not.toContain('font-bold');
  });

  it('skips a checkpoint past the end of the curated trail', () => {
    // An organizer's course can outrun the trail we have a chart for; pinning
    // the marker to the last pixel would claim otherwise.
    const beyond = [
      ...EVENT.checkpoints,
      {
        isCutoff: false,
        label: 'Way out there',
        leadEta: '2026-08-15T22:00:00Z',
        mile: 40,
        sweepEta: '2026-08-16T02:00:00Z',
      },
    ];
    render(
      <CheckpointMarkers
        chartWidth={800}
        checkpoints={beyond}
        points={PROFILE.profile}
        profile={PROFILE}
      />,
    );
    expect(screen.queryByText('Way out there')).not.toBeInTheDocument();
  });

  it('culls labels that would overlap but keeps every dot', () => {
    const crowded = [0, 0.05, 0.1, 0.15, 2, 4].map((mile) => ({
      isCutoff: false,
      label: `Mile ${mile}`,
      leadEta: '2026-08-15T15:00:00Z',
      mile,
      sweepEta: '2026-08-15T16:00:00Z',
    }));
    const placed = placeCheckpoints(crowded, PROFILE.profile, PROFILE, 800);
    expect(placed).toHaveLength(6);
    expect(placed.filter((p) => p.showLabel).length).toBeLessThan(6);
  });

  it('renders nothing before the chart has been measured', () => {
    const { container } = render(
      <CheckpointMarkers
        chartWidth={0}
        checkpoints={EVENT.checkpoints}
        points={PROFILE.profile}
        profile={PROFILE}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
