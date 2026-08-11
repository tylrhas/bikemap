import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EVENT_COLOR, EVENT_DEEP_COLOR } from '@/data/race-colors';
import type { RaceEvent } from '@/data/race-events';
import { EventTag } from './EventTag';

function event(startsAt: string): RaceEvent {
  return {
    checkpoints: [],
    course: [],
    direction: 'forward',
    id: '1',
    name: 'Cascade Gravel Grinder',
    originLabel: 'trailhead',
    startsAt,
    terminusLabel: 'summit',
    trailSlug: 'phils-trail',
  };
}

// Bend is Pacific, so an 8am local start is 15:00Z.
const RACE_DAY = '2026-08-15T15:00:00Z'; // a Saturday

describe('EventTag', () => {
  it('says the race is today', () => {
    render(
      <EventTag
        event={event(RACE_DAY)}
        now={new Date('2026-08-15T18:00:00Z')}
      />,
    );
    expect(screen.getByText('Race today')).toBeInTheDocument();
  });

  it('names the weekday while the race is still coming', () => {
    render(
      <EventTag
        event={event(RACE_DAY)}
        now={new Date('2026-08-12T18:00:00Z')}
      />,
    );
    expect(screen.getByText('Race Sat')).toBeInTheDocument();
  });

  it('renders nothing outside the preview window', () => {
    const { container } = render(
      <EventTag
        event={event(RACE_DAY)}
        now={new Date('2026-08-01T18:00:00Z')}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a trail with no race', () => {
    const { container } = render(<EventTag event={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('carries the detail in a title rather than crowding the row', () => {
    render(
      <EventTag
        event={event(RACE_DAY)}
        now={new Date('2026-08-15T18:00:00Z')}
      />,
    );
    const title = screen.getByText('Race today').getAttribute('title') ?? '';
    expect(title).toContain('Cascade Gravel Grinder');
    expect(title).toContain('trailhead → summit');
  });

  it('takes its colour from the palette, never a hazard colour', () => {
    const { container } = render(
      <EventTag
        event={event(RACE_DAY)}
        now={new Date('2026-08-15T18:00:00Z')}
      />,
    );
    const html = container.innerHTML;
    // Tokens, not inline hexes — and never the closure red.
    expect(html).toContain('text-event');
    expect(html).not.toContain(EVENT_COLOR);
    expect(html).not.toContain(EVENT_DEEP_COLOR);
    expect(html).not.toContain('#dc2626');
  });

  it('flips its pairing for a light surface', () => {
    // `event-deep` is unreadable on forest and the gold is unreadable on cream,
    // so the dock and the panel cannot share one pairing.
    const { container } = render(
      <EventTag
        event={event(RACE_DAY)}
        now={new Date('2026-08-15T18:00:00Z')}
        surface="light"
      />,
    );
    expect(container.innerHTML).toContain('text-event-deep');
  });
});
