import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RaceEvent } from '@/data/race-events';
import { RaceEventsProvider, useRaceEvents } from './RaceEventsProvider';

const EVENT: RaceEvent = {
  checkpoints: [],
  course: [],
  direction: 'forward',
  id: '1',
  name: 'Cascade Gravel Grinder',
  originLabel: 'trailhead',
  startsAt: '2026-08-11T15:00:00Z',
  terminusLabel: 'summit',
  trailSlug: 'homestead',
};

function Consumer() {
  const { forTrail, loading, visible } = useRaceEvents();
  return (
    <div>
      <span>{loading ? 'loading' : 'ready'}</span>
      <span>{visible.length}</span>
      <span>{forTrail('homestead')?.name ?? 'none'}</span>
    </div>
  );
}

async function settleFetch(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('RaceEventsProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-11T16:00:00Z'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('shares the visible event by trail slug', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        json: async () => ({ events: [EVENT] }),
        ok: true,
      }),
    );

    render(
      <RaceEventsProvider>
        <Consumer />
      </RaceEventsProvider>,
    );
    await settleFetch();

    expect(screen.getByText('ready')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(EVENT.name)).toBeInTheDocument();
  });

  it('refreshes an open tab on the API cache interval', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ events: [EVENT] }),
      ok: true,
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <RaceEventsProvider>
        <Consumer />
      </RaceEventsProvider>,
    );
    await settleFetch();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
