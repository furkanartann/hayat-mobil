import { apiFetch } from '../api/client.js';
import { ticketMapCoords } from './mapLayers.js';

const FIELD_STAFF = new Set(['Guvenlik', 'Lojistik', 'AramaKurtarma', 'SaglikParamedik', 'Doktor']);

export function getRoutingProfile(userType) {
  return userType === 'AramaKurtarma' ? 'foot' : 'driving';
}

export function getActiveDispatchTicket(tickets, user) {
  if (!user?.staffId || !FIELD_STAFF.has(user.userType)) return null;
  return tickets.find((tk) => {
    if (tk.status !== 'In_Progress' || tk.assignedStaffId !== user.staffId) return false;
    return ticketMapCoords(tk) != null;
  }) ?? null;
}

export async function fetchMapRoute({ fromLat, fromLng, toLat, toLng, profile = 'driving' }) {
  const q = new URLSearchParams({
    fromLat: String(fromLat),
    fromLng: String(fromLng),
    toLat: String(toLat),
    toLng: String(toLng),
    profile,
  });
  const res = await apiFetch(`/api/map/route?${q}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Route unavailable');
  }
  return res.json();
}

export function formatRouteDistance(meters, t = (tr) => tr) {
  if (meters == null || !Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatRouteDuration(seconds, t = (tr) => tr) {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const mins = Math.max(1, Math.round(seconds / 60));
  return t(`~${mins} dk`, `~${mins} min`);
}

export function triageRouteColor(triageColor) {
  if (triageColor === 'Red') return '#ef4444';
  if (triageColor === 'Yellow') return '#f59e0b';
  if (triageColor === 'Black') return '#64748b';
  return '#0ea5e9';
}

/** Harita üzerinde düşük kontrastlı rota renklerini güçlendirir. */
export function resolveRouteDisplayColor(color) {
  const map = {
    '#38bdf8': '#0284c7',
    '#94a3b8': '#475569',
    '#a855f7': '#7c3aed',
    '#10b981': '#059669',
    '#22c55e': '#16a34a',
  };
  return map[color] ?? color ?? '#ff6600';
}

/** Rota çizgisi: koyu kontur + parlak ana hat (OSM üzerinde okunaklı). */
export function getRoutePolylineLayers(route) {
  if (!route?.positions?.length || route.positions.length < 2) return [];

  const color = resolveRouteDisplayColor(route.color);
  const isFallback = !!route.fallback;
  const mainWeight = isFallback ? 6 : 7;

  return [
    {
      key: 'casing',
      pathOptions: {
        color: '#0f172a',
        weight: mainWeight + 6,
        opacity: 0.78,
        lineCap: 'round',
        lineJoin: 'round',
      },
    },
    {
      key: 'main',
      pathOptions: {
        color,
        weight: mainWeight,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
        ...(isFallback ? { dashArray: '12 9' } : {}),
      },
    },
  ];
}

export function googleMapsDirectionsUrl(fromLat, fromLng, toLat, toLng) {
  const origin = `${fromLat},${fromLng}`;
  const dest = `${toLat},${toLng}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&travelmode=driving`;
}

export function elementMapCoords(element) {
  if (!element?.type || !element?.data) return null;
  const d = element.data;

  switch (element.type) {
    case 'unit':
      if (d.latitude == null || d.longitude == null) return null;
      return { lat: d.latitude, lng: d.longitude };
    case 'ticket':
      return ticketMapCoords(d);
    case 'missing':
    case 'user':
    case 'ai':
      if (d.latitude == null || d.longitude == null) return null;
      return { lat: d.latitude, lng: d.longitude };
    case 'assembly': {
      const lat = d.lat ?? d.latitude;
      const lng = d.lng ?? d.longitude;
      if (lat == null || lng == null) return null;
      return { lat, lng };
    }
    default:
      return null;
  }
}

/** Manuel rota hedefi: ünite, SOS, kayıp, afetzede, AI */
export function elementRouteMeta(element) {
  const coords = elementMapCoords(element);
  if (!coords) return null;

  const d = element.data;
  switch (element.type) {
    case 'unit':
      return {
        key: `unit-${d.unitId}`,
        label: d.serialNumber,
        color: '#10b981',
        type: 'unit',
        unitStatus: d.status,
        ...coords,
      };
    case 'ticket':
      return {
        key: `ticket-${d.ticketId}`,
        label: `SOS #${d.ticketId}`,
        color: triageRouteColor(d.triageColor),
        type: 'ticket',
        requestorName: d.requestorName,
        requestType: d.requestType,
        triageColor: d.triageColor,
        updateNote: d.updateNote,
        ...coords,
      };
    case 'missing':
      return {
        key: `missing-${d.reportId}`,
        label: d.missingPersonName,
        color: '#a855f7',
        type: 'missing',
        ...coords,
      };
    case 'user':
      return {
        key: `user-${d.userId}`,
        label: d.fullName,
        color: '#0284c7',
        type: 'user',
        ...coords,
      };
    case 'ai':
      return {
        key: `ai-${d.detectionId}`,
        label: `AI · ${d.detectionType}`,
        color: '#f59e0b',
        type: 'ai',
        ...coords,
      };
    case 'assembly':
      return {
        key: `assembly-${d.pointId}`,
        label: d.name,
        color: '#22c55e',
        type: 'assembly',
        capacity: d.capacity,
        notes: d.notes,
        ...coords,
      };
    default:
      return null;
  }
}
