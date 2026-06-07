import { useState, useEffect } from 'react';

const rttToScore = (ms) => {
  if (ms < 60) return 100;
  if (ms < 120) return 92;
  if (ms < 250) return 78;
  if (ms < 500) return 58;
  if (ms < 1000) return 38;
  if (ms < 2000) return 20;
  return 8;
};

const connectionTypeScore = (effectiveType) => {
  const map = { '4g': 96, '3g': 68, '2g': 38, 'slow-2g': 18 };
  return map[effectiveType] ?? null;
};

/** Cihaz baglantisi + sunucu gecikmesine gore 0-100 ag kalitesi. */
export function useNetworkQuality(enabled, apiFetch) {
  const [quality, setQuality] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setQuality(null);
      return undefined;
    }

    let cancelled = false;
    const conn = navigator.connection || navigator.webkitConnection || navigator.mozConnection;

    const measure = async () => {
      if (!navigator.onLine) {
        if (!cancelled) setQuality(0);
        return;
      }

      let browserScore = null;
      if (conn) {
        browserScore = connectionTypeScore(conn.effectiveType);
        if (typeof conn.rtt === 'number' && conn.rtt > 0) {
          const rttScore = rttToScore(conn.rtt);
          browserScore = browserScore != null
            ? Math.round(browserScore * 0.5 + rttScore * 0.5)
            : rttScore;
        }
      }

      const t0 = performance.now();
      try {
        const res = await apiFetch('/api/ping');
        const pingMs = performance.now() - t0;
        const pingScore = res.ok ? rttToScore(pingMs) : 12;
        const combined = browserScore != null
          ? Math.round(pingScore * 0.65 + browserScore * 0.35)
          : pingScore;
        if (!cancelled) setQuality(Math.max(0, Math.min(100, combined)));
      } catch {
        if (!cancelled) setQuality(browserScore ?? (navigator.onLine ? 25 : 0));
      }
    };

    measure();
    const id = setInterval(measure, 25000);
    const onOnline = () => measure();
    const onOffline = () => setQuality(0);
    const onConnChange = () => measure();

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    conn?.addEventListener?.('change', onConnChange);

    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      conn?.removeEventListener?.('change', onConnChange);
    };
  }, [enabled, apiFetch]);

  return quality;
}

export const networkQualityColor = (q) => (
  q >= 70 ? 'var(--emerald)' : q >= 40 ? 'var(--amber)' : 'var(--rose)'
);
