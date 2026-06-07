const LAST_LOCATION_PREFIX = 'hayat_last_location_';
const MANUAL_ROUTE_PREFIX = 'hayat_manual_route_';

function lastLocationKey(userId) {
  return `${LAST_LOCATION_PREFIX}${userId}`;
}

function manualRouteKey(userId) {
  return `${MANUAL_ROUTE_PREFIX}${userId}`;
}

function readJson(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadLastLocation(userId) {
  if (!userId) return null;
  const data = readJson(localStorage, lastLocationKey(userId));
  if (data?.lat == null || data?.lng == null) return null;
  return {
    lat: data.lat,
    lng: data.lng,
    accuracy: data.accuracy ?? null,
  };
}

export function saveLastLocation(userId, location) {
  if (!userId || location?.lat == null || location?.lng == null) return;
  try {
    localStorage.setItem(lastLocationKey(userId), JSON.stringify({
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy ?? null,
      savedAt: Date.now(),
    }));
  } catch {
    // storage full / private mode
  }
}

export function loadManualRouteTarget(userId) {
  if (!userId) return null;
  const data = readJson(sessionStorage, manualRouteKey(userId));
  if (!data?.key || data.lat == null || data.lng == null) return null;
  return data;
}

export function saveManualRouteTarget(userId, target) {
  if (!userId) return;
  try {
    if (!target) {
      sessionStorage.removeItem(manualRouteKey(userId));
      return;
    }
    sessionStorage.setItem(manualRouteKey(userId), JSON.stringify(target));
  } catch {
    // ignore
  }
}

export function clearMapSession(userId) {
  if (!userId) return;
  try {
    sessionStorage.removeItem(manualRouteKey(userId));
  } catch {
    // ignore
  }
}
