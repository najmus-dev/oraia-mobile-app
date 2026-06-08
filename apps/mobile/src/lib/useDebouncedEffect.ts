import { useEffect, useRef } from 'react';

/** Run effect after `delayMs` when deps change; cancels pending run on cleanup. */
export function useDebouncedEffect(effect: () => void | (() => void), deps: unknown[], delayMs = 300) {
  const effectRef = useRef(effect);
  effectRef.current = effect;

  useEffect(() => {
    let cleanup: void | (() => void);
    const handle = setTimeout(() => {
      cleanup = effectRef.current();
    }, delayMs);
    return () => {
      clearTimeout(handle);
      if (typeof cleanup === 'function') cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
