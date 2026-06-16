import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';

/**
 * On release builds, check for an EAS Update on launch and reload if one is available.
 * Returns false while checking so the splash screen can stay up.
 */
export function useEASUpdates(): boolean {
  const [ready, setReady] = useState(__DEV__ || !Updates.isEnabled);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!cancelled && result.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
          return;
        }
      } catch {
        // Offline or misconfigured — keep running the embedded bundle.
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
