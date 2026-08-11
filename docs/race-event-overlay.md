# COTA Trail App — Race Event Overlay

Addendum to [`design specs.md`](design%20specs.md). Covers surfacing a live
race/event on a trail that stays **open** (not closed) during the event.

> **Note on the reference prototype.** The original brief cited an
> `EventTreatment.jsx` with an "Event mode" toggle. That file was never in this
> repo, so the implementation was designed from the prose below. The nearest
> existing references are [`design.jsx`](design.jsx) and
> [`design specs.md`](design%20specs.md), which cover the base app only.
>
> **Where the implementation deliberately diverges from this document, see
> "Departures" at the end.**

---

## 1. Why this isn't just another "condition"

The app already has a hazard/condition system (downed tree, surface, etc. — see
main spec). A race is deliberately **not** part of that system:

- Conditions imply something's wrong with the trail. A race doesn't — the trail
  is fine, there are just more people on it.
- Conditions are open-ended in time. Races have a known start (and a knowable,
  if fuzzy, end).
- Conflating the two would make "Race today" read as a warning, which undersells
  that it's a community event people might want to go watch or join, not just
  tolerate.

So: separate color token (`event`, gold — not the `warn` coral), separate data
model, separate visual language (flag icon vs. alert triangle), but same *slots*
in the UI (sidebar summary, map overlay, dock banner) so it doesn't require new
UI real estate.

---

## 2. New tokens

| Token | Hex | Role |
|---|---|---|
| `event` | `#D9A441` | Event accent — badges, dashed map line, dock tint when event is visible |
| `event-deep` | `#8A6423` | Event text/icon color on light backgrounds (better contrast than `event` itself) |

Do not reuse `clay` for events even though they're visually adjacent — clay is
already load-bearing for elevation lines, ratings, and the default dock accent.
Keeping them distinct means a screen can show "this trail has a race AND a 4.8
rating" without the two competing for the same color.

---

## 3. Data model

```ts
interface RaceEvent {
  id: string;
  trailId: string;
  name: string;                       // "CO Trail Series"
  startsAt: string;                   // ISO
  direction: "forward" | "reverse";   // relative to the trail's stored geometry point order
  courseGpx?: GeoJSON.LineString;     // if the race course differs from the trail's normal line
  checkpoints: RaceCheckpoint[];      // must include at least a start and finish/end entry
}

interface RaceCheckpoint {
  mile: number;
  label: string;              // "Aid 1", "Finish"
  leadEta?: string;           // ISO — estimated/actual time the front of the field passes
  sweepEta?: string;          // ISO — estimated/actual time the back of the field passes
  isCutoff?: boolean;         // true if sweepEta is an enforced cutoff, not just an estimate
}
```

**Both times are optional, and independently so.** A checkpoint is first a
*place*: an organizer knows where the aid stations are long before anyone has
estimated when the field reaches them, and often knows when the leaders come
through without knowing the sweep. The consequences, all deliberate:

- An untimed checkpoint still gets its dot and label on the elevation chart.
- The two series interpolate **independently**, so a missing sweep in the middle
  of the course leaves a hole in the sweep line only.
- **A series needs two timed checkpoints before it says anything.** From one
  point, interpolation would report the same time at every mile — telling a
  rider at mile 40 that the leaders are due at the start time.
- A spread needs both ends, so `spreadBuckets` only considers fully-timed
  checkpoints.
- **Being a cutoff no longer makes a time plain.** A cutoff can now carry no
  times of its own; the gate is real but its clock came from the neighbours, so
  the sentence names the cutoff and still hedges. The plain register is reserved
  for a time the organizer actually wrote down.
- With no times at all the tag, banner, spread card and checkpoint dots still
  work; the surfaces that point at the hover readout go quiet rather than
  sending someone hunting for estimates nobody entered.

**No single `endsAt` field on the event.** There is no one end time — the finish
checkpoint's `sweepEta` is the closest thing, and even that's an estimate until
it happens. Do not add a course-wide "race window" field; it will get surfaced
somewhere and be wrong for long courses (see §5).

Organizer data entry should require at minimum a start checkpoint and a
finish/end checkpoint; more checkpoints in between improve interpolation
accuracy. If an organizer only provides two points, the app is doing
straight-line interpolation across the whole course — acceptable for short
courses, coarse for anything over ~20mi.

---

## 4. Direction

Derived from `RaceEvent.direction` against the trail's stored point order —
`"forward"` means racers travel start-to-end of the stored geometry,
`"reverse"` means the opposite.

- Render direction arrows along the route at regular intervals, spaced **by
  distance, not point index**, so they stay evenly spaced regardless of GPX
  point density — roughly one arrow every 1–2 miles.
- The start/finish markers should swap positions based on direction.
- Copy referencing direction should use trail-relative language the rider
  already knows — e.g. "trailhead → summit" — not compass directions, unless the
  trail has no such landmarks.

---

## 5. Time estimates — mile-specific, not course-wide

**This is the core design constraint or the whole feature becomes untrustworthy
on long courses.** On a 100mi race, the lead pack and the back of the field can
be hours apart at any given point. A single "race window" banner ("9am–2pm") is
fine for a 6-mile local loop and actively misleading on a 100-miler — someone at
mile 80 reading "race ends 2pm" and encountering a straggler at 6pm has been
given false confidence.

Rules:

1. **Never show one time window for the whole course.** Even with only two
   checkpoints — interpolate and show it per-location, so the UI doesn't change
   shape depending on data richness.
2. **Compute a location-specific estimate via linear interpolation** between the
   two bracketing checkpoints for whatever mile the rider is looking at.
3. **Surface it at the point of attention, not as a static banner claim.**
   Scrubbing the elevation chart updates a readout. Extend the existing
   hover-state pattern rather than building a second hover mechanism.
4. **The dock banner and sidebar summary give shape, not false precision.**
   Banner: start time, direction, and an explicit pointer to the mile-specific
   readout. Sidebar: a coarse spread-by-segment breakdown computed directly from
   the checkpoint data, not hardcoded — bucket the course into thirds.
5. **Label estimates as estimates.** Reserve unhedged language for
   `isCutoff: true` checkpoints, which are organizer-enforced.

### Component surfaces

- `EventEtaReadout` — the hover-driven mile-specific estimate.
- `EventSpreadSummary` — sidebar's three-bucket breakdown, derived from
  `event.checkpoints`.
- `EventBanner` — dock strip: name, start time, direction, pointer to the hover
  readout.
- `CheckpointMarkers` — labeled dots near the elevation chart at each
  `RaceCheckpoint.mile`. Visually distinguished from the interpolated hover
  value (filled dot + bold label, versus lighter-weight/italic).

---

## 6. Map treatment

- Affected trail's line renders as a clean dashed line in `event` color along
  its length, without a surrounding glow.
- A flag-icon marker near the course midpoint signals "there's an event here" at
  map-overview zoom.
- Direction arrows per §4.
- Existing hazard styling keeps its own `warn`/closure treatment and remains
  distinguishable through its tighter dash rhythm and red color.

---

## 7. Sidebar (desktop) / list (mobile)

- Trails with an active event get a compact `EventTag` ("Race today") next to
  their normal metadata in the list row.
- An `EventSpreadSummary` card sits above the trail list when any visible trail
  has an active event, using the event's own name.
- If a trail's event has started but not finished, keep showing it; don't
  auto-hide based on a guessed end time. Use a manual organizer-set "mark as
  finished" action.

---

## 8. Non-goals for this pass

- Live GPS tracking of actual racer positions
- Organizer-facing event creation/editing UI
- Auto-detecting when a race has ended
- Notifications/push alerts

---

## 9. Acceptance checklist

- [x] No UI surface ever states a single course-wide time window
- [x] Hover-driven mile estimate reuses the same lifted hover-state pattern
- [x] Direction arrows are spaced by distance along the geometry
- [x] Checkpoint-derived estimates are visually distinguished from interpolated
- [x] Event color never reused for hazard/condition UI, and vice versa
- [x] Sidebar spread summary numbers are computed from `checkpoints`
- [x] Map's event line and hazard treatment remain distinguishable

---

## Departures from this document

Recorded here because each was a deliberate call, not an oversight.

- **`trailId` became `trailSlug` on the wire.** Every client join in this app is
  by slug (conditions, elevation, the pane). A row id would open a second key
  space. The Payload relationship is still by id; the read layer resolves it.
- **`courseGpx` became a resolved `course: [lng, lat][]`.** The client needs
  coordinates in hand to space arrows and place endpoints, and
  `querySourceFeatures` only returns tiles currently in view. Resolved
  server-side from `courseGpx` → the trail's `geom` → the coordinates in its
  elevation profile → nothing. The last case draws no event line and leaves every
  other surface working.
- **Interpolation is in epoch milliseconds, not "clock-minutes".** Taken as
  minutes-past-midnight, a race with a 22:30 lead and a 01:15 sweep wraps and
  produces nonsense.
- **The organizer UI is not a non-goal any more.** Payload generates the form
  from the collection, so it came free.
- **Checkpoint labels don't carry cutoff times in prose** ("Aid 2 · cutoff
  3:30pm"). `isCutoff` is a real field, so the time is already shown and the
  wording already changes; putting it in the label too would state it twice and
  let the two disagree.
- **The spread buckets break ties towards the later checkpoint.** On an evenly
  spaced course every third's midpoint is an exact tie, so this is the normal
  path rather than an edge case — breaking low made the final bucket report the
  *start* of the last third, understating the tail the card exists to warn about.
- **Times render in the trail's timezone**, from `timeZone` in
  `map.config.ts`, not the viewer's. A rider at mile 40 needs the trail's clock.
- **The map line uses the same seven-day visibility window as the list tag.** If
  the UI says a trail has a race, the map marks it; the organizer's `finished`
  toggle removes both.
