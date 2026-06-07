import { useEffect, useRef, useState } from 'react';
import {
  fetchMapRoute,
  getRoutingProfile,
} from '../../../lib/routing.js';

function movedMeters(a, b) {
  if (!a || !b) return Infinity;
  const dlat = (a.lat - b.lat) * 111000;
  const dlng = (a.lng - b.lng) * 111000 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

export function useManualRoute({ target, user, userLocation, enabled = true }) {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastFetchRef = useRef({ key: null, at: 0, loc: null });

  useEffect(() => {
    if (!enabled || !target || userLocation?.lat == null || userLocation?.lng == null) {
      setRoute(null);
      setError(null);
      setLoading(false);
      if (!enabled) lastFetchRef.current = { key: null, at: 0, loc: null };
      return undefined;
    }

    const profile = getRoutingProfile(user?.userType);
    const prev = lastFetchRef.current;
    const sameTarget = prev.key === target.key;
    const recentlyFetched = sameTarget && Date.now() - prev.at < 12000;
    const barelyMoved = sameTarget && movedMeters(userLocation, prev.loc) < 45;

    if (recentlyFetched && barelyMoved) return undefined;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await fetchMapRoute({
          fromLat: userLocation.lat,
          fromLng: userLocation.lng,
          toLat: target.lat,
          toLng: target.lng,
          profile,
        });
        if (cancelled) return;

        lastFetchRef.current = {
          key: target.key,
          at: Date.now(),
          loc: { lat: userLocation.lat, lng: userLocation.lng },
        };

        setRoute({
          positions: data.coordinates ?? [],
          distanceMeters: data.distanceMeters,
          durationSeconds: data.durationSeconds,
          profile: data.profile,
          fallback: !!data.fallback,
          mode: 'manual',
          routeKey: target.key,
          label: target.label,
          color: target.color,
          destLat: target.lat,
          destLng: target.lng,
          targetType: target.type,
          requestorName: target.requestorName ?? null,
          requestType: target.requestType ?? null,
          triageColor: target.triageColor ?? null,
          updateNote: target.updateNote ?? null,
          unitStatus: target.unitStatus ?? null,
          steps: data.steps ?? [],
        });
      } catch (e) {
        if (!cancelled) {
          setRoute(null);
          setError(e.message || 'Route failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [
    enabled,
    target?.key,
    target?.lat,
    target?.lng,
    target?.label,
    target?.color,
    user?.userType,
    userLocation?.lat,
    userLocation?.lng,
  ]);

  return { route, loading, error };
}
