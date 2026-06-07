import { fetchMapRoute } from './routing.js';

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Aktif toplanma alanlarından en yakınını döner (mesafe km ile). */
export function findNearestAssemblyPoint(points, userLocation) {
  if (!points?.length || userLocation?.lat == null || userLocation?.lng == null) return null;

  let best = null;
  let bestKm = Infinity;

  for (const p of points) {
    const lat = p.lat ?? p.latitude;
    const lng = p.lng ?? p.longitude;
    if (lat == null || lng == null) continue;
    const km = haversineKm(userLocation.lat, userLocation.lng, lat, lng);
    if (km < bestKm) {
      bestKm = km;
      best = { ...p, lat, lng, distanceKm: km };
    }
  }

  return best;
}

/** OSRM yol süresine göre en kısa süreli toplanma alanı (kuş uçuşu değil). */
export async function findNearestAssemblyPointByRoute(points, userLocation, profile = 'driving') {
  if (!points?.length || userLocation?.lat == null || userLocation?.lng == null) return null;

  const candidates = points
    .map((p) => {
      const lat = p.lat ?? p.latitude;
      const lng = p.lng ?? p.longitude;
      if (lat == null || lng == null) return null;
      return { ...p, lat, lng };
    })
    .filter(Boolean);

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return { ...candidates[0], distanceKm: haversineKm(userLocation.lat, userLocation.lng, candidates[0].lat, candidates[0].lng) };

  const ranked = await Promise.all(candidates.map(async (p) => {
    try {
      const data = await fetchMapRoute({
        fromLat: userLocation.lat,
        fromLng: userLocation.lng,
        toLat: p.lat,
        toLng: p.lng,
        profile,
      });
      return {
        ...p,
        durationSeconds: data.durationSeconds ?? Infinity,
        distanceMeters: data.distanceMeters ?? Infinity,
        distanceKm: haversineKm(userLocation.lat, userLocation.lng, p.lat, p.lng),
        routeFallback: !!data.fallback,
      };
    } catch {
      return {
        ...p,
        durationSeconds: Infinity,
        distanceMeters: Infinity,
        distanceKm: haversineKm(userLocation.lat, userLocation.lng, p.lat, p.lng),
        routeFallback: true,
      };
    }
  }));

  ranked.sort((a, b) => {
    if (a.durationSeconds !== b.durationSeconds) return a.durationSeconds - b.durationSeconds;
    return a.distanceMeters - b.distanceMeters;
  });

  const best = ranked[0];
  if (!best || !Number.isFinite(best.durationSeconds) || best.durationSeconds === Infinity) {
    return findNearestAssemblyPoint(points, userLocation);
  }
  return best;
}
