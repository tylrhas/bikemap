import { useEffect, useState } from 'react';

/** Tailwind's `md`. Below it, panels cover the map instead of sitting beside it. */
const NARROW = '(max-width: 767px)';

/**
 * True on a phone-width viewport.
 *
 * Starts false and corrects on mount rather than reading `matchMedia` during
 * render: the first client render has to match what the server produced, and
 * the server has no viewport. The map is client-only, so the correction lands
 * before anything is visible.
 */
export function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(NARROW);
    const update = () => setNarrow(media.matches);

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return narrow;
}
