'use client';

/**
 * The races running on this map's trails.
 *
 * Fetched on the client rather than passed down with the trails, for the same
 * reason conditions are: the page is 60-second ISR, which is right for a
 * trail's name and wrong for something meant to change during the day. Two
 * things move while a tab is open, and they are the two this feature turns on —
 * an organizer ticking "Finished" mid-race, and midnight arriving on a tab left
 * open overnight.
 */
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { mapConfig } from '@/config/map.config';
import {
  type RaceEvent,
  racePhase,
  RACE_REFRESH_SECONDS,
} from '@/data/race-events';

interface RaceEventsValue {
  /** Everything the server sent, whether or not it is showing yet. */
  events: RaceEvent[];
  /** The race on a trail, by slug. */
  forTrail: (slug: string) => RaceEvent | undefined;
  /** True until the first fetch settles, either way. */
  loading: boolean;
  /**
   * One instant every consumer shares, so a tag and the map cannot disagree
   * about what day it is. Advances when the local day rolls over.
   */
  now: Date;
  /** Showing today or within the preview window, soonest first. */
  visible: RaceEvent[];
}

const EMPTY: RaceEventsValue = {
  events: [],
  forTrail: () => undefined,
  loading: false,
  now: new Date(),
  visible: [],
};

const RaceEventsContext = createContext<RaceEventsValue>(EMPTY);

/**
 * Why there is no error state: a component outside the provider, or one mounted
 * while the fetch is failing, gets `EMPTY` — which looks exactly like a map
 * with no races on. A race must never stop something rendering.
 */
export function useRaceEvents(): RaceEventsValue {
  return useContext(RaceEventsContext);
}

/** `2026-08-15` in the trail's zone — the thing `racePhase` actually keys on. */
function dayKey(at: Date): string {
  return at.toLocaleDateString('en-CA', { timeZone: mapConfig.timeZone });
}

/** A minute is short enough that midnight lands promptly and costs nothing. */
const DAY_CHECK_MS = 60_000;

export function RaceEventsProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const [events, setEvents] = useState<RaceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;

    // `async` so a synchronous throw out of `fetch` is caught alongside a
    // network failure. This provider wraps the whole map, and an exception
    // escaping the effect would take it down.
    async function load() {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await fetch('/api/map/events', {
          signal: controller.signal,
        });
        const data: { events?: RaceEvent[] } | null = response?.ok
          ? await response.json()
          : null;

        if (data) {
          setEvents(Array.isArray(data.events) ? data.events : []);
        }
        setLoading(false);
      } catch (error) {
        // An abort is cleanup, not a failure; the component is on its way out.
        if ((error as Error)?.name !== 'AbortError') {
          setLoading(false);
        }
      } finally {
        inFlight = false;
      }
    }

    void load();

    // The endpoint has the same cache lifetime. Polling lets an organizer's
    // Finished toggle remove the event from a tab that has stayed open, which
    // is part of this provider's contract rather than something a reload
    // should be required to discover.
    const refreshTimer = setInterval(
      () => void load(),
      RACE_REFRESH_SECONDS * 1000,
    );

    return () => {
      clearInterval(refreshTimer);
      controller.abort();
    };
  }, []);

  /**
   * Advance `now` only when the calendar day changes.
   *
   * Everything downstream asks a question about days — "today", "Race Sat" — so
   * re-rendering on every tick would repaint the panel 1,440 times to change
   * nothing. This does it once, at midnight, which is the only moment any
   * answer here is different.
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setNow((previous) => {
        const next = new Date();
        return dayKey(next) === dayKey(previous) ? previous : next;
      });
    }, DAY_CHECK_MS);
    return () => clearInterval(timer);
  }, []);

  const value = useMemo(() => {
    const visible = events
      .filter((event) => racePhase(event, now, mapConfig.timeZone) !== null)
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));

    // A trail has at most one race worth showing; the soonest wins if a
    // calendar somehow has two.
    const bySlug = new Map<string, RaceEvent>();
    for (const event of visible) {
      if (!bySlug.has(event.trailSlug)) {
        bySlug.set(event.trailSlug, event);
      }
    }

    return {
      events,
      forTrail: (slug: string) => bySlug.get(slug),
      loading,
      now,
      visible,
    };
  }, [events, loading, now]);

  return (
    <RaceEventsContext.Provider value={value}>
      {children}
    </RaceEventsContext.Provider>
  );
}
