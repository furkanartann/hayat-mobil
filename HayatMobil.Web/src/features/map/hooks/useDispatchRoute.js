import { useEffect, useRef, useState } from 'react';
import { ticketMapCoords } from '../../../lib/mapLayers.js';
import {
  fetchMapRoute,
  getActiveDispatchTicket,
  getRoutingProfile,
  triageRouteColor,
} from '../../../lib/routing.js';

function movedMeters(a, b) {
  if (!a || !b) return Infinity;
  const dlat = (a.lat - b.lat) * 111000;
  const dlng = (a.lng - b.lng) * 111000 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

export function useDispatchRoute({ tickets, user, userLocation }) {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastFetchRef = useRef({ ticketId: null, at: 0, loc: null });

  const activeTicket = getActiveDispatchTicket(tickets, user);
  const dest = activeTicket ? ticketMapCoords(activeTicket) : null;

  useEffect(() => {
    if (!activeTicket || !dest || userLocation?.lat == null || userLocation?.lng == null) {
      setRoute(null);
      setError(null);
      setLoading(false);
      lastFetchRef.current = { ticketId: null, at: 0, loc: null };
      return undefined;
    }

    const profile = getRoutingProfile(user.userType);
    const prev = lastFetchRef.current;
    const sameTicket = prev.ticketId === activeTicket.ticketId;
    const recentlyFetched = sameTicket && Date.now() - prev.at < 12000;
    const barelyMoved = sameTicket && movedMeters(userLocation, prev.loc) < 45;

    if (recentlyFetched && barelyMoved) return undefined;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await fetchMapRoute({
          fromLat: userLocation.lat,
          fromLng: userLocation.lng,
          toLat: dest.lat,
          toLng: dest.lng,
          profile,
        });
        if (cancelled) return;

        lastFetchRef.current = {
          ticketId: activeTicket.ticketId,
          at: Date.now(),
          loc: { lat: userLocation.lat, lng: userLocation.lng },
        };

        setRoute({
          positions: data.coordinates ?? [],
          distanceMeters: data.distanceMeters,
          durationSeconds: data.durationSeconds,
          profile: data.profile,
          fallback: !!data.fallback,
          mode: 'dispatch',
          routeKey: `ticket-${activeTicket.ticketId}`,
          label: `SOS #${activeTicket.ticketId}`,
          ticketId: activeTicket.ticketId,
          targetType: 'ticket',
          requestorName: activeTicket.requestorName ?? null,
          requestType: activeTicket.requestType,
          triageColor: activeTicket.triageColor,
          updateNote: activeTicket.updateNote ?? null,
          color: triageRouteColor(activeTicket.triageColor),
          destLat: dest.lat,
          destLng: dest.lng,
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
    activeTicket?.ticketId,
    dest?.lat,
    dest?.lng,
    user?.userType,
    userLocation?.lat,
    userLocation?.lng,
  ]);

  return { route, loading, error, activeTicket };
}
