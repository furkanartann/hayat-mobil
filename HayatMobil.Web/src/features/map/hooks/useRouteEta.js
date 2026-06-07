import { useEffect, useRef, useState } from 'react';
import { fetchMapRoute, formatRouteDistance, formatRouteDuration, getRoutingProfile } from '../../../lib/routing.js';

function movedMeters(a, b) {
  if (!a || !b) return Infinity;
  const dlat = (a.lat - b.lat) * 111000;
  const dlng = (a.lng - b.lng) * 111000 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

/** Canlı konum → hedef için OSRM süre/mesafe. */
export function useRouteEta({ from, to, userType, enabled = true }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef({ key: null, at: 0, loc: null });

  useEffect(() => {
    if (!enabled || from?.lat == null || from?.lng == null || to?.lat == null || to?.lng == null) {
      setData(null);
      setLoading(false);
      return undefined;
    }

    const key = `${from.lat},${from.lng}->${to.lat},${to.lng}`;
    const prev = lastFetchRef.current;
    const recentlyFetched = prev.key === key && Date.now() - prev.at < 12000;
    const barelyMoved = prev.key === key && movedMeters(from, prev.loc) < 45;
    if (recentlyFetched && barelyMoved) return undefined;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const route = await fetchMapRoute({
          fromLat: from.lat,
          fromLng: from.lng,
          toLat: to.lat,
          toLng: to.lng,
          profile: getRoutingProfile(userType),
        });
        if (cancelled) return;
        lastFetchRef.current = {
          key,
          at: Date.now(),
          loc: { lat: from.lat, lng: from.lng },
        };
        setData({
          durationSeconds: route.durationSeconds,
          distanceMeters: route.distanceMeters,
          fallback: !!route.fallback,
        });
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [enabled, from?.lat, from?.lng, to?.lat, to?.lng, userType]);

  return { data, loading };
}

export function formatEtaLine(data, t = (tr) => tr) {
  if (!data?.durationSeconds) return null;
  const duration = formatRouteDuration(data.durationSeconds, t);
  const distance = formatRouteDistance(data.distanceMeters, t);
  return `${duration} · ${distance}`;
}
