/** Harita paneli: mapLayers öncelikli, yoksa rol listelerinden tamamla */

export function resolveMapUnits(layers, units = []) {
  if (layers?.units?.length) return layers.units;
  return units ?? [];
}

export function resolveMapTickets(layers, tickets = []) {
  const byId = new Map();

  for (const tk of layers?.tickets ?? []) {
    if (tk.latitude != null && tk.longitude != null) {
      byId.set(tk.ticketId, tk);
    }
  }

  for (const tk of tickets) {
    if (!['Open', 'In_Progress'].includes(tk.status)) continue;
    const lat = tk.latitude ?? tk.reporterLat;
    const lng = tk.longitude ?? tk.reporterLng;
    if (lat == null || lng == null) continue;

    const prev = byId.get(tk.ticketId);
    byId.set(tk.ticketId, {
      ticketId: tk.ticketId,
      requestType: tk.requestType ?? prev?.requestType,
      triageColor: tk.triageColor ?? prev?.triageColor,
      status: tk.status ?? prev?.status,
      requestorName: tk.requestorName ?? prev?.requestorName,
      updateNote: tk.updateNote ?? prev?.updateNote,
      latitude: lat,
      longitude: lng,
    });
  }

  return [...byId.values()];
}

export function ticketMapCoords(ticket) {
  const lat = ticket?.latitude ?? ticket?.reporterLat;
  const lng = ticket?.longitude ?? ticket?.reporterLng;
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

export function collectMapBoundsPoints(layers, layerVisibility, mapUnits, mapTickets, userLocation) {
  const pts = [];
  const add = (lat, lng) => {
    if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
      pts.push([lat, lng]);
    }
  };

  if (layerVisibility?.zones) {
    (layers?.disasterZones ?? []).forEach((z) => add(z.centerLat, z.centerLng));
  }
  if (layerVisibility?.units) {
    mapUnits.forEach((u) => add(u.latitude, u.longitude));
  }
  if (layerVisibility?.sensors) {
    (layers?.sensors ?? []).forEach((s) => add(s.latitude, s.longitude));
  }
  if (layerVisibility?.tickets) {
    mapTickets.forEach((t) => add(t.latitude, t.longitude));
  }
  if (layerVisibility?.ai) {
    (layers?.aiDetections ?? []).forEach((d) => add(d.latitude, d.longitude));
  }
  if (layerVisibility?.missing) {
    (layers?.missingPersons ?? []).forEach((m) => add(m.latitude, m.longitude));
  }
  if (layerVisibility?.assembly) {
    (layers?.assemblyPoints ?? []).forEach((p) => add(p.lat ?? p.latitude, p.lng ?? p.longitude));
  }
  if (layerVisibility?.me && userLocation?.lat != null) {
    add(userLocation.lat, userLocation.lng);
  } else if (layerVisibility?.me && layers?.me) {
    add(layers.me.lat, layers.me.lng);
  }

  return pts;
}
