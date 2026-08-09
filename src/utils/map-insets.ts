/**
 * How much of the map is hidden behind the interface.
 *
 * The Mapbox canvas is the full viewport with the panels sitting on top of it,
 * so the map's idea of "centre" is the middle of the window, not the middle of
 * what you can see. Every zoom-to-fit used a uniform 60px, which put a selected
 * trail roughly half a sidebar to the left — behind the sidebar, sometimes out
 * of sight entirely.
 *
 * Padding these insets tells the camera where the visible map actually is.
 * Pure and free of Mapbox so the arithmetic is testable on its own.
 */

/** Breathing room between a fitted trail and the edge of the visible map. */
export const BASE_INSET = 60;

/** Widths of the panels that cover the map. Match the components. */
export const CHROME = {
  /** MapLegend, `w-[280px]`. */
  sidebar: 280,
  /** RidesPanel, `w-[296px]`. */
  ridesPanel: 296,
  /** The elevation pane, measured at its tallest. */
  elevation: 150,
};

export interface ChromeState {
  elevationOpen?: boolean;
  /** True below `md`, where panels cover the map rather than sitting beside it. */
  narrow?: boolean;
  ridesPanelOpen?: boolean;
  sidebarOpen?: boolean;
}

export interface Insets {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

/**
 * Insets for the chrome currently open.
 *
 * On a narrow screen an open panel covers the map completely, so there is no
 * visible region to aim at and the insets stay symmetric — shrinking toward a
 * sliver would fit the trail into a strip the rider cannot see. The bottom
 * inset still applies, because the elevation pane only covers part of the
 * screen.
 */
export function computeInsets(state: ChromeState = {}): Insets {
  const insets: Insets = {
    bottom: BASE_INSET,
    left: BASE_INSET,
    right: BASE_INSET,
    top: BASE_INSET,
  };

  if (!state.narrow) {
    if (state.sidebarOpen) {
      insets.left += CHROME.sidebar;
    }
    if (state.ridesPanelOpen) {
      insets.right += CHROME.ridesPanel;
    }
  }

  if (state.elevationOpen) {
    insets.bottom += CHROME.elevation;
  }

  return insets;
}

/**
 * Mapbox throws when padding leaves no room to draw into, which is easy to hit
 * on a small window with two panels open. Shrink the insets to fit rather than
 * letting `fitBounds` fail — an off-centre trail beats no camera move at all.
 */
export function fitInsets(
  insets: Insets,
  width: number,
  height: number,
): Insets {
  const scale = (a: number, b: number, available: number): [number, number] => {
    const total = a + b;
    // Leave at least a quarter of the axis to actually render the trail into.
    const budget = available * 0.75;
    if (total <= budget || total === 0) {
      return [a, b];
    }
    const factor = budget / total;
    return [Math.floor(a * factor), Math.floor(b * factor)];
  };

  const [left, right] = scale(insets.left, insets.right, width);
  const [top, bottom] = scale(insets.top, insets.bottom, height);
  return { bottom, left, right, top };
}
