import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { resolveMapTickets, collectMapBoundsPoints } from '../../lib/mapLayers.js';
import { getRoutePolylineLayers } from '../../lib/routing.js';

const DEFAULT_CENTER = [41.0082, 28.9784];
const DEFAULT_ZOOM = 12;

function MapFlyToPoint({ lat, lng, flyToken, minZoom = 15 }) {
  const map = useMap();
  const lastToken = useRef(0);

  useEffect(() => {
    if (lat == null || lng == null || flyToken == null || flyToken === lastToken.current) return;
    lastToken.current = flyToken;
    map.flyTo([lat, lng], Math.max(map.getZoom(), minZoom), { duration: 0.7 });
  }, [lat, lng, flyToken, minZoom, map]);

  return null;
}

function MapFitBounds({ points, fitToken = 0 }) {
  const map = useMap();
  const lastToken = useRef(-1);

  useEffect(() => {
    if (!points?.length || fitToken === lastToken.current) return;
    lastToken.current = fitToken;
    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15, animate: true });
  }, [map, points, fitToken]);

  return null;
}

function MapFitRouteBounds({ positions, fitToken = 0 }) {
  const map = useMap();
  const lastToken = useRef(-1);

  useEffect(() => {
    if (!positions?.length || positions.length < 2 || fitToken === lastToken.current) return;
    lastToken.current = fitToken;
    map.fitBounds(L.latLngBounds(positions), { padding: [64, 64], maxZoom: 16, animate: true });
  }, [map, positions, fitToken]);

  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapRoutePolylines({ route }) {
  const layers = getRoutePolylineLayers(route);
  if (!layers.length) return null;

  return (
    <>
      {layers.map((layer) => (
        <Polyline
          key={layer.key}
          positions={route.positions}
          pathOptions={layer.pathOptions}
        />
      ))}
    </>
  );
}

function MapInvalidateSize({ refreshKey = 0 }) {
  const map = useMap();

  useEffect(() => {
    const refresh = () => {
      map.invalidateSize({ animate: false, pan: false });
    };
    refresh();
    const t1 = setTimeout(refresh, 80);
    const t2 = setTimeout(refresh, 300);

    const container = map.getContainer();
    const parent = container?.closest('.live-map-canvas') ?? container?.parentElement;
    let ro;
    if (parent && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => refresh());
      ro.observe(parent);
    }

    let io;
    if (parent && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) refresh();
      }, { threshold: 0.1 });
      io.observe(parent);
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('resize', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      ro?.disconnect();
      io?.disconnect();
      window.removeEventListener('resize', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [map, refreshKey]);

  return null;
}

function makeDivIcon(html, size = 22) {
  return L.divIcon({
    className: 'hayat-map-marker',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const unitIcon = (color) => makeDivIcon(
  `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.85);box-shadow:0 0 8px ${color}"></div>`
);

const sosIcon = (color) => makeDivIcon(
  `<div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:12px solid ${color};filter:drop-shadow(0 0 4px ${color})"></div>`,
  18
);

const aiIcon = makeDivIcon(
  `<div style="width:12px;height:12px;background:#f59e0b;border:2px solid rgba(255,255,255,0.7);transform:rotate(45deg);box-shadow:0 0 6px #f59e0b"></div>`
);

const missingIcon = makeDivIcon(
  `<div style="width:14px;height:14px;border-radius:3px;background:#a855f7;border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 6px #a855f7"></div>`
);

const meIcon = makeDivIcon(
  `<div style="width:16px;height:16px;border-radius:50%;background:#38bdf8;border:3px solid #fff;box-shadow:0 0 10px #38bdf8"></div>`
);

const userIcon = (color) => makeDivIcon(
  `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 6px ${color}"></div>`
);

const sensorIcon = (color) => makeDivIcon(
  `<div style="width:10px;height:10px;border-radius:2px;background:${color};border:2px solid rgba(255,255,255,0.85);box-shadow:0 0 5px ${color}"></div>`,
  16
);

const assemblyIcon = makeDivIcon(
  `<div style="width:16px;height:16px;border-radius:50%;background:#22c55e;border:3px solid #fff;box-shadow:0 0 10px #22c55e;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff">A</div>`,
  20
);

function sensorColor(status, sensorType) {
  if (status === 'Error' || status === 'Offline') return '#64748b';
  if (sensorType === 'Duman' || sensorType === 'Gaz') return '#f59e0b';
  if (sensorType === 'Isi') return '#ef4444';
  return '#10b981';
}

function unitColor(status) {
  if (status === 'Active') return '#10b981';
  if (status === 'Emergency') return '#ef4444';
  if (status === 'Maintenance') return '#f59e0b';
  return '#64748b';
}

function triageColor(color) {
  if (color === 'Red') return '#ef4444';
  if (color === 'Yellow') return '#f59e0b';
  if (color === 'Black') return '#1f2937';
  return '#10b981';
}

function safetyColor(status) {
  if (status === 'In_Danger') return '#ef4444';
  if (status === 'Safe') return '#10b981';
  return '#94a3b8';
}

export default function MapPanel({
  layers,
  layerVisibility,
  onSelectElement,
  onMapClick,
  pickMode = false,
  pickPurpose = 'disaster',
  userLocation = null,
  flyToMeToken = 0,
  refreshKey = 0,
  embeddedMinHeight,
  flushEdges = false,
  heroFill = false,
  fallbackTickets = [],
  fitAllMarkers = false,
  fitBoundsToken = 0,
  flyToTarget = null,
  dispatchRoute = null,
  dispatchRouteLoading = false,
  t = (tr) => tr,
}) {
  const panelMinHeight = embeddedMinHeight ?? 360;
  const meLat = userLocation?.lat ?? layers?.me?.lat;
  const meLng = userLocation?.lng ?? layers?.me?.lng;
  const meAccuracy = userLocation?.accuracy ?? null;

  const center = useMemo(() => {
    if (meLat != null && meLng != null) return [meLat, meLng];
    if (layers?.units?.length) return [layers.units[0].latitude, layers.units[0].longitude];
    return DEFAULT_CENTER;
  }, [layers, meLat, meLng]);

  const mapTickets = useMemo(
    () => resolveMapTickets(layers, fallbackTickets),
    [layers, fallbackTickets]
  );

  const fitPoints = useMemo(() => {
    if (!fitAllMarkers) return [];
    const mapUnits = layers?.units ?? [];
    return collectMapBoundsPoints(layers, layerVisibility, mapUnits, mapTickets, userLocation);
  }, [fitAllMarkers, layers, layerVisibility, mapTickets, userLocation, layerVisibility?.tickets, layerVisibility?.units]);

  return (
    <div
      className={`${flushEdges ? 'map-panel-flush' : ''} ${heroFill ? 'map-panel-hero-fill' : ''}`}
      style={heroFill ? { overflow: 'hidden' } : {
        position: 'relative', flex: 1, minHeight: panelMinHeight, height: '100%',
        borderRadius: flushEdges ? 0 : (embeddedMinHeight ? 0 : '18px'), overflow: 'hidden'
      }}
    >
      {pickMode && (
        <div style={{
          position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          background: pickPurpose === 'assembly' ? 'rgba(34,197,94,0.92)' : 'rgba(239,68,68,0.92)',
          color: '#fff', padding: '6px 14px', borderRadius: '20px',
          fontSize: '11px', fontWeight: '700', pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {pickPurpose === 'assembly'
            ? t('Haritaya tıklayarak toplanma alanı konumunu seçin', 'Click the map to set assembly point location')
            : t('Haritaya tıklayarak afet bölgesi merkezini seçin', 'Click the map to set disaster zone center')}
        </div>
      )}

      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        style={{ width: '100%', height: '100%', minHeight: heroFill ? '100%' : panelMinHeight, background: '#0f172a' }}
        scrollWheelZoom
        dragging
        touchZoom
        tap
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onMapClick={onMapClick} />
        {heroFill && <MapInvalidateSize refreshKey={refreshKey} />}
        <MapFlyToPoint lat={meLat} lng={meLng} flyToken={flyToMeToken} />
        {flyToTarget?.lat != null && (
          <MapFlyToPoint lat={flyToTarget.lat} lng={flyToTarget.lng} flyToken={flyToTarget.token} minZoom={16} />
        )}
        {fitAllMarkers && fitPoints.length > 0 && !dispatchRoute && (
          <MapFitBounds points={fitPoints} fitToken={fitBoundsToken} />
        )}
        {dispatchRoute?.positions?.length >= 2 && (
          <MapFitRouteBounds
            positions={dispatchRoute.positions}
            fitToken={dispatchRoute.routeKey ?? dispatchRoute.ticketId}
          />
        )}

        {dispatchRoute?.positions?.length >= 2 && (
          <MapRoutePolylines route={dispatchRoute} />
        )}

        {layerVisibility.zones && (layers?.disasterZones ?? []).map((zone) => (
          <Circle
            key={`zone-${zone.zoneId}`}
            center={[zone.centerLat, zone.centerLng]}
            radius={zone.radiusKm * 1000}
            pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.12, weight: 2, dashArray: '6 4' }}
          >
            <Popup>
              <strong>{zone.title}</strong><br />
              {t('Yarıçap', 'Radius')}: {zone.radiusKm} km
            </Popup>
          </Circle>
        ))}

        {layerVisibility.sensors && (layers?.sensors ?? []).map((sensor, idx) => {
          const jitter = ((sensor.sensorId % 5) - 2) * 0.00008;
          const jitterLng = ((sensor.unitId % 5) - 2) * 0.00008;
          return (
            <Marker
              key={`sensor-${sensor.sensorId}`}
              position={[sensor.latitude + jitter, sensor.longitude + jitterLng]}
              icon={sensorIcon(sensorColor(sensor.status, sensor.sensorType))}
              eventHandlers={{ click: () => onSelectElement?.({ type: 'sensor', data: sensor }) }}
            >
              <Popup>
                <strong>{sensor.sensorType}</strong> — {sensor.serialNumber}<br />
                {sensor.currentValue ?? '—'} {sensor.unitOfMeasure ?? ''} · {sensor.status}
              </Popup>
            </Marker>
          );
        })}

        {layerVisibility.units && (layers?.units ?? []).map((unit) => (
          <Marker
            key={`unit-${unit.unitId}`}
            position={[unit.latitude, unit.longitude]}
            icon={unitIcon(unitColor(unit.status))}
            eventHandlers={{ click: () => onSelectElement?.({ type: 'unit', data: unit }) }}
          >
            <Popup>
              <strong>{unit.serialNumber}</strong><br />
              {unit.status} · %{unit.batteryLevel ?? '—'}
            </Popup>
          </Marker>
        ))}

        {layerVisibility.tickets && mapTickets.map((ticket) => (
          <Marker
            key={`ticket-${ticket.ticketId}`}
            position={[ticket.latitude, ticket.longitude]}
            icon={sosIcon(triageColor(ticket.triageColor))}
            eventHandlers={{ click: () => onSelectElement?.({ type: 'ticket', data: ticket }) }}
          >
            <Popup>
              <strong>SOS #{ticket.ticketId}</strong><br />
              {ticket.requestType} · {ticket.triageColor}
            </Popup>
          </Marker>
        ))}

        {layerVisibility.ai && (layers?.aiDetections ?? []).map((det) => (
          <Marker
            key={`ai-${det.detectionId}`}
            position={[det.latitude, det.longitude]}
            icon={aiIcon}
            eventHandlers={{ click: () => onSelectElement?.({ type: 'ai', data: det }) }}
          >
            <Popup>
              <strong>AI — {det.detectionType}</strong><br />
              %{Math.round((det.confidenceScore ?? 0) * 100)} {t('güven', 'confidence')}
            </Popup>
          </Marker>
        ))}

        {layerVisibility.missing && (layers?.missingPersons ?? []).map((mp) => (
          <Marker
            key={`missing-${mp.reportId}`}
            position={[mp.latitude, mp.longitude]}
            icon={missingIcon}
            eventHandlers={{ click: () => onSelectElement?.({ type: 'missing', data: mp }) }}
          >
            <Popup>
              <strong>{mp.missingPersonName}</strong><br />
              {t('Kayıp', 'Missing')}
            </Popup>
          </Marker>
        ))}

        {layerVisibility.assembly && (layers?.assemblyPoints ?? []).map((ap) => {
          const lat = ap.lat ?? ap.latitude;
          const lng = ap.lng ?? ap.longitude;
          if (lat == null || lng == null) return null;
          return (
            <Marker
              key={`assembly-${ap.pointId}`}
              position={[lat, lng]}
              icon={assemblyIcon}
              eventHandlers={{ click: () => onSelectElement?.({ type: 'assembly', data: ap }) }}
            >
              <Popup>
                <strong>{ap.name}</strong><br />
                {t('Toplanma alanı', 'Assembly point')}
                {ap.capacity != null && (
                  <>
                    <br />
                    {t('Kapasite', 'Capacity')}: {ap.capacity}
                  </>
                )}
                {ap.notes && (
                  <>
                    <br />
                    {ap.notes}
                  </>
                )}
              </Popup>
            </Marker>
          );
        })}

        {layerVisibility.users && (layers?.userLocations ?? []).map((u) => (
          <Marker
            key={`user-${u.userId}`}
            position={[u.latitude, u.longitude]}
            icon={userIcon(safetyColor(u.safetyStatus))}
            eventHandlers={{ click: () => onSelectElement?.({ type: 'user', data: u }) }}
          >
            <Popup>
              <strong>{u.fullName}</strong><br />
              {u.safetyStatus}
            </Popup>
          </Marker>
        ))}

        {layerVisibility.me && meLat != null && meLng != null && (
          <>
            {meAccuracy != null && meAccuracy > 0 && (
              <Circle
                center={[meLat, meLng]}
                radius={meAccuracy}
                pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.12, weight: 1.5, dashArray: '4 4' }}
              />
            )}
            <Marker position={[meLat, meLng]} icon={meIcon}>
              <Popup>
                <strong>{t('Konumunuz', 'Your location')}</strong><br />
                {meLat.toFixed(5)}, {meLng.toFixed(5)}
                {meAccuracy != null && (
                  <>
                    <br />
                    {t('Hata payı', 'Accuracy')}: ±{Math.round(meAccuracy)} m
                  </>
                )}
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
    </div>
  );
}
