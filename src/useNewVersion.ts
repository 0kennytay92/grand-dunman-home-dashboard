import { useEffect, useState } from 'react';

declare const __BUILD_ID__: string;

/**
 * True when a newer version of the app has been published than the one running.
 * Phones (especially apps added to the Home Screen) can keep an old copy open for days.
 */
export function useNewVersion() {
  const [newer, setNewer] = useState(false);
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const check = async () => {
      try {
        const r = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) return;
        const { build } = (await r.json()) as { build?: string };
        if (build && build !== __BUILD_ID__) setNewer(true);
      } catch {
        // offline: try again later
      }
    };
    const first = window.setTimeout(check, 3000);
    const every = window.setInterval(check, 10 * 60_000);
    const onVisible = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
  }, []);
  return newer;
}
