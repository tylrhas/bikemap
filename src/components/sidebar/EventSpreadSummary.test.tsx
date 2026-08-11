import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RaceEvent } from '@/data/race-events';
import { EventSpreadSummary } from './EventSpreadSummary';

const NOW = new Date('2026-08-15T18:00:00Z');

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
      isCutoff: false,
      label: 'Aid 1',
      leadEta: '2026-08-15T17:00:00Z',
      mile: 10,
      sweepEta: '2026-08-15T19:00:00Z',
    },
    {
      isCutoff: true,
      label: 'Aid 2',
      leadEta: '2026-08-15T19:00:00Z',
      mile: 20,
      sweepEta: '2026-08-15T23:00:00Z',
    },
    {
      isCutoff: false,
      label: 'Finish',
      leadEta: '2026-08-15T21:00:00Z',
      mile: 30,
      sweepEta: '2026-08-16T03:00:00Z',
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

describe('EventSpreadSummary', () => {
  it('uses the organizer’s own name for the race', () => {
    render(<EventSpreadSummary event={EVENT} now={NOW} />);
    expect(screen.getByText('Cascade Gravel Grinder')).toBeInTheDocument();
  });

  it('describes the shape of the field, computed from the checkpoints', () => {
    render(<EventSpreadSummary event={EVENT} now={NOW} />);
    // Growing spread down the course is the whole point of the card, and the
    // final bucket must reach the finish — that is the figure a rider deciding
    // when the trail is busy actually needs.
    expect(screen.getByText(/First third/)).toBeInTheDocument();
    expect(screen.getByText(/Final third/)).toBeInTheDocument();
    expect(screen.getByText(/2.0hr spread/)).toBeInTheDocument();
    expect(screen.getByText(/6.0hr spread/)).toBeInTheDocument();
  });

  it('never states one window for the whole course', () => {
    const { container } = render(
      <EventSpreadSummary event={EVENT} now={NOW} />,
    );
    const text = container.textContent ?? '';
    // The start time alone is fine — it is a fact. A range joining the first
    // checkpoint's lead to the last one's sweep is the lie this feature exists
    // to avoid, so no two clock times may be joined by a dash anywhere here.
    expect(text).not.toMatch(/\d(?:am|pm)\s*[–—-]\s*\d/);
  });

  it('names the direction in landmarks rather than a compass bearing', () => {
    render(<EventSpreadSummary event={EVENT} now={NOW} />);
    expect(screen.getByText(/trailhead → summit/)).toBeInTheDocument();
  });

  it('still renders for a course with only a start and a finish', () => {
    const sparse = {
      ...EVENT,
      checkpoints: [EVENT.checkpoints[0], EVENT.checkpoints[3]],
    };
    render(<EventSpreadSummary event={sparse} now={NOW} />);
    expect(screen.getByText(/First third/)).toBeInTheDocument();
    expect(screen.queryByText(/Middle third/)).not.toBeInTheDocument();
  });
});
