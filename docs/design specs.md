COTA Trail App — Implementation Brief

Build the trail browse + detail experience for the COTA (Cortez, CO) mountain bike trail app into an existing Next.js project. A working reference prototype exists as a single React file (TrailDetailV2.jsx) — treat it as the visual source of truth, but restructure it properly for Next.js as described below.

1. Stack assumptions
Next.js App Router (app/), React 18+, TypeScript
Tailwind CSS for styling (the prototype uses inline styles — convert them; see §3)
recharts for the elevation chart
lucide-react for icons
Map library is not decided yet — see §7. Ship with the stylized SVG placeholder from the prototype behind a <TrailMap /> interface so the real map drops in later without touching callers.

Install if missing:

bash
npm i recharts lucide-react
2. Design tokens (COTA brand)

Source: Brandfetch extraction of COTA's logo/brand files. Add to tailwind.config.ts under theme.extend.colors.

Token	Hex	Role
forest	
#023428	Primary dark surface, sidebar, primary button, headings
forest-lift	
#0A4536	Map gradient highlight only
clay	
#BD815A	Primary accent — elevation line, active rail, ratings
coral	
#FCA793	Trail path on map, caution accent
cream	
#F5EFE6	Page background, detail dock, text on forest
ink	
#14231D	Body copy on cream
good	
#4C8A69	Condition: OK
warn	
#C25E3F	Condition: hazard

Difficulty colors (used by badges and list dots): Beginner → good, Intermediate → clay, Advanced → 
#B5573B.

Type
Display: Fraunces (600) — trail names, section titles. Use with restraint.
Body/UI: Public Sans (400/500/600/700) — everything else.
Load via next/font/google, not @import (the prototype uses @import because it's a single file):
ts
// app/fonts.ts
import { Fraunces, Public_Sans } from "next/font/google";
export const fraunces = Fraunces({ subsets: ["latin"], weight: ["600"], variable: "--font-display" });
export const publicSans = Public_Sans({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-body" });

Map to fontFamily.display / fontFamily.sans in Tailwind config.

Other conventions
Radii: 8px controls, 11–12px cards, 999px chips
Uppercase section labels: 11px, weight 700, letter-spacing 0.08em, forest at 70% opacity
Borders on cream: rgba(2,52,40,0.08–0.12); on forest: rgba(245,239,230,0.1)
3. Styling conversion

The prototype uses inline style={{}} throughout for portability. Convert to Tailwind classes. Where a value has no clean Tailwind equivalent (the map's radial gradient, the contour SVG opacities), keep it inline or add a small utility in globals.css. Do not introduce a second styling system (no CSS modules + Tailwind mix).

Keep *:focus-visible { outline: 2px solid <clay>; outline-offset: 2px; } globally — it's part of the accessibility floor.

4. Routes
app/
  trails/
    page.tsx            → browse (list + map)
    [slug]/
      page.tsx          → trail detail

Desktop and mobile share these routes; layout differs by breakpoint (§5). On desktop, /trails/[slug] renders the full shell with that trail selected in the sidebar; clicking a sidebar item does a client-side push to the new slug (shallow, no full reload). On mobile, /trails is the list and /trails/[slug] is the detail — normal push/back navigation, no custom view state.

Important: the prototype fakes routing with useState (mobileView, selected). Replace both with real routing and URL params. Selected trail comes from the slug, not component state.

5. Responsive behavior

Breakpoint: 900px.

The prototype branches on a useIsDesktop() hook with matchMedia. That causes a hydration mismatch in Next.js if used naively. Prefer CSS-driven layout (render both structures, show/hide with Tailwind lg: variants) so the server render is stable. Only fall back to a JS media query if a structure genuinely can't be expressed in CSS — and if you do, gate it behind useSyncExternalStore or render nothing until mounted.

Desktop (≥900px) — map-first app shell
┌──────────────┬───────────────────────────────────────┐
│ SIDEBAR 300px│  MAP CANVAS (fills)                   │
│  logo+search │   ┌ condition chips (top-left)        │
│  ──────────  │   └ layer/fullscreen btns (top-right) │
│  trail list  │                                       │
│  (active row │                                       │
│   has clay   ├───────────────────────────────────────┤
│   left rail) │ DOCK  │ elevation profile (wide)      │
│              │ name  │                               │
│              │ stats │                               │
│              │ CTAs  │                               │
└──────────────┴───────┴───────────────────────────────┘
Sidebar is persistent and scrolls independently; the map never unmounts on trail change.
Dock has a 3px clay top border, cream background, split minmax(260px,340px) 1fr.
Condition chips float over the map as pills; they do not appear in the dock on desktop.
Mobile (<900px) — stacked scroll

Map (220px) → title block → elevation card → conditions card → CTAs. Sticky search header with back arrow. Conditions are a stacked list here, not chips.

6. Components
components/trails/
  TrailSidebar.tsx      desktop-only; search + trail list
  TrailMap.tsx          map surface (placeholder now, real map later)
  ElevationProfile.tsx  recharts area chart, shared by both layouts
  ConditionChips.tsx    desktop pill row
  ConditionList.tsx     mobile stacked rows
  TrailStats.tsx        miles / gain / duration inline row
  DifficultyBadge.tsx   filled (list) + outline (`dark` prop, detail) variants
  ConditionDot.tsx      7px status dot
  TrailListItem.tsx     shared row shape

ElevationProfile props: data: ElevationPoint[], variant: "wide" | "card". Wide = desktop dock (no card chrome, 124px tall, interval={1} ticks). Card = mobile (white card, border, 140px, interval={2}, Nmi tick format). Same gradient fill and tooltip in both — dedupe the gradient id per variant so two instances on one page don't collide.

7. Map integration

TrailMap.tsx currently renders a stylized SVG: radial forest gradient, seven contour paths at 7% opacity, a coral trail line with a forest halo underneath, cream start marker, clay end marker, and a warn hazard pin at the downed-tree location.

Keep this as the fallback/loading state. When the real map lands (Mapbox GL or MapLibre both fit — MapLibre avoids the token/pricing dependency, worth defaulting to unless COTA already has a Mapbox account), the component's public API should stay:

ts
interface TrailMapProps {
  geometry: GeoJSON.LineString;   // trail path
  hazards?: Hazard[];             // rendered as pins
  scrubPosition?: number;         // 0–1 along the trail, driven by elevation hover
  className?: string;
}

Wire the scrub interaction: hovering the elevation chart should move a marker along the trail on the map. The prototype has the tooltip but not the linkage — this is the signature interaction of the whole screen, worth building properly. Lift hover state to the page and pass scrubPosition down.

8. Data model

Replace the hardcoded TRAILS, ELEV, CONDITIONS arrays.

ts
type Difficulty = "Beginner" | "Intermediate" | "Advanced";
type ConditionTone = "good" | "warn" | "neutral";

interface Trail {
  id: string;
  slug: string;
  name: string;
  miles: number;
  elevationGainFt: number;
  difficulty: Difficulty;
  estimatedMinutes: number;
  rating: number;              // 0–5, one decimal
  region: string;              // "Cortez, CO"
  geometry: GeoJSON.LineString;
  elevation: ElevationPoint[];
  conditionStatus: ConditionTone;   // rollup for list dots
}

interface ElevationPoint { mi: number; ft: number; }

interface TrailCondition {
  id: string;
  trailId: string;
  kind: "surface" | "precipitation" | "hazard" | "traffic";
  label: string;               // "Downed tree"
  value: string;               // "Mile 3.2"
  tone: ConditionTone;
  reportedAt: string;          // ISO
  reportedBy?: string;
}

Elevation should ultimately derive from uploaded GPX rather than being stored by hand — parse on ingest, downsample to ~50–100 points for the chart, keep full resolution for the map geometry.

The detail screen shows "Updated 2 hours ago" on mobile — compute that from the newest reportedAt across the trail's conditions rather than hardcoding.

9. Copy rules
Sentence case everywhere except the uppercase section labels and difficulty badges.
Buttons name the action and keep that name through the flow: "Start ride" → the in-progress state says "Riding", not "Active session".
"Report a condition" (mobile) and "Report" (desktop, space-constrained) open the same flow.
Empty search state: No trails match "{query}". Try a shorter search. — states what happened and what to do.
Never label conditions with system vocabulary (condition_status, tone) in the UI.
10. Out of scope for this pass

Not designed yet — don't invent these, flag them instead: ride recording / GPS tracking, the condition-report submission form, user accounts, offline maps, trail photos, comments. Start ride and Report can be no-op handlers with a TODO.

11. Acceptance checklist
 Renders correctly at 375px, 900px, and 1440px with no horizontal scroll
 No hydration warnings in console
 Sidebar trail selection updates map + dock without remounting the map
 Elevation hover scrubs a marker on the map
 Keyboard: can tab through search → trail list → CTAs, with visible clay focus rings
 prefers-reduced-motion respected (button scale transitions disabled)
 Chart is not the only carrier of information — gain/max are also in text
 All colors come from Tailwind tokens; no stray hex values in components