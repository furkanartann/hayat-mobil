import React, { useState, useMemo, useEffect } from 'react';
import { Map, Navigation, SlidersHorizontal, List, ExternalLink, MapPin } from 'lucide-react';
import MapPanel from './MapPanel.jsx';
import MapRouteSheet from './MapRouteSheet.jsx';
import MapSelectionBar from './MapSelectionBar.jsx';
import { resolveMapUnits, resolveMapTickets, ticketMapCoords } from '../../lib/mapLayers.js';
import { elementRouteMeta, googleMapsDirectionsUrl } from '../../lib/routing.js';

function unitColor(status) {
  if (status === 'Active') return '#10b981';
  if (status === 'Emergency') return '#ef4444';
  if (status === 'Maintenance') return '#f59e0b';
  return '#64748b';
}

function triageColor(color) {
  if (color === 'Red') return '#ef4444';
  if (color === 'Yellow') return '#f59e0b';
  return '#10b981';
}

export default function MapFullscreenView({
  layers,
  layerVisibility,
  onToggleLayer,
  userLocation,
  flyToMeToken,
  onFlyToMe,
  onSelectElement,
  onMapClick,
  pickMode = false,
  pickPurpose = 'disaster',
  onNearestAssembly,
  selectedElement,
  onClearSelection,
  zoneStatus,
  user,
  units = [],
  tickets = [],
  locationStatus,
  onLocationRetry,
  t = (tr) => tr,
  isMobileView = false,
  refreshKey = 0,
  activeRoute = null,
  routeLoading = false,
  dispatchActive = false,
  manualRouteTarget = null,
  onCreateRoute,
  onClearRoute,
  externalFlyToTarget = null,
}) {
  const [layersOpen, setLayersOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(!isMobileView);
  const [flyToTarget, setFlyToTarget] = useState(null);
  const [fitBoundsToken, setFitBoundsToken] = useState(0);

  const displayUnits = useMemo(() => resolveMapUnits(layers, units), [layers, units]);
  const mapTickets = useMemo(() => resolveMapTickets(layers, tickets), [layers, tickets]);

  const handleCreateRoute = () => onCreateRoute?.(selectedElement);

  const handleClearRoute = () => onClearRoute?.();

  const handleClearSelection = () => onClearSelection?.();

  useEffect(() => {
    setFitBoundsToken((n) => n + 1);
  }, [layers?.units?.length, mapTickets.length, refreshKey]);

  useEffect(() => {
    if (externalFlyToTarget?.token) setFlyToTarget(externalFlyToTarget);
  }, [externalFlyToTarget?.token]);

  const flyToTicket = (ticket) => {
    const coords = ticketMapCoords(ticket);
    if (!coords) return;
    setFlyToTarget({ lat: coords.lat, lng: coords.lng, token: Date.now() });
  };

  const flyToUnit = (unit) => {
    if (unit.latitude == null || unit.longitude == null) return;
    setFlyToTarget({ lat: unit.latitude, lng: unit.longitude, token: Date.now() });
  };

  const layerOptions = [
    { key: 'zones', label: t('Afet Bölgesi', 'Disaster Zone') },
    { key: 'me', label: t('Konumum', 'My Location') },
    { key: 'units', label: t('Üniteler', 'Units') },
    { key: 'sensors', label: t('Sensörler', 'Sensors') },
    { key: 'tickets', label: 'SOS' },
    { key: 'ai', label: 'AI' },
    { key: 'missing', label: t('Kayıp', 'Missing') },
    { key: 'assembly', label: t('Toplanma Alanları', 'Assembly Points') },
    ...(user?.userType === 'PM' ? [{ key: 'users', label: t('Afetzede', 'Civilians') }] : []),
  ];

  const counts = {
    zones: layers?.disasterZones?.length ?? 0,
    units: displayUnits.length,
    sensors: layers?.sensors?.length ?? 0,
    tickets: mapTickets.length,
    ai: layers?.aiDetections?.length ?? 0,
    missing: layers?.missingPersons?.length ?? 0,
    assembly: layers?.assemblyPoints?.length ?? 0,
  };

  const activeTickets = tickets.filter((tk) => tk.status === 'Open' || tk.status === 'In_Progress');
  const sidebarTickets = activeTickets.length > 0 ? activeTickets : mapTickets;

  const showLocationWarn = locationStatus !== 'granted' && locationStatus !== 'unknown';

  const selectedRouteKey = selectedElement ? elementRouteMeta(selectedElement)?.key : null;
  const showSelectionBar = selectedElement
    && (!activeRoute || activeRoute.routeKey !== selectedRouteKey)
    && !routeLoading;

  return (
    <div className={`map-fs${listsOpen ? ' map-fs--lists-open' : ''}`}>
      <div className="map-fs-canvas">
        <MapPanel
          layers={layers}
          layerVisibility={layerVisibility}
          onSelectElement={onSelectElement}
          onMapClick={onMapClick}
          pickMode={pickMode}
          pickPurpose={pickPurpose}
          userLocation={userLocation}
          flyToMeToken={flyToMeToken}
          fallbackTickets={tickets}
          fitAllMarkers
          fitBoundsToken={fitBoundsToken}
          flyToTarget={flyToTarget}
          dispatchRoute={activeRoute}
          dispatchRouteLoading={routeLoading}
          refreshKey={refreshKey}
          t={t}
          flushEdges
          heroFill
        />

      </div>

      <div className="map-fs-overlay map-fs-overlay--top">
        <div className="map-fs-topbar">
          <div className="map-fs-topbar-title">
            <Map size={17} />
            <span>{t('Saha Haritası', 'Field Map')}</span>
          </div>
          <div className="map-fs-topbar-stats">
            {zoneStatus?.inDisasterZone && (
              <span className="map-fs-pill map-fs-pill--warn">{t('Afet bölgesi', 'Disaster zone')}</span>
            )}
            <span className="map-fs-pill">{counts.units} {t('ünite', 'units')}</span>
            <span className="map-fs-pill map-fs-pill--sos">{counts.tickets || sidebarTickets.length} SOS</span>
          </div>
          <div className="map-fs-topbar-actions">
            {user?.userType === 'Afetzede' && (layers?.assemblyPoints?.length ?? 0) > 0 && (
              <button
                type="button"
                className="map-fs-icon-btn map-fs-icon-btn--primary"
                onClick={onNearestAssembly}
                title={t('En yakın toplanma alanına git', 'Go to nearest assembly point')}
              >
                <MapPin size={15} />
              </button>
            )}
            {userLocation?.lat != null && (
              <button type="button" className="map-fs-icon-btn" onClick={onFlyToMe} title={t('Konumum', 'My location')}>
                <Navigation size={15} />
              </button>
            )}
            {activeRoute && userLocation?.lat != null && (
              <a
                href={googleMapsDirectionsUrl(
                  userLocation.lat,
                  userLocation.lng,
                  activeRoute.destLat,
                  activeRoute.destLng
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="map-fs-icon-btn"
                title={t('Google Maps yol tarifi', 'Open in Google Maps')}
              >
                <ExternalLink size={15} />
              </a>
            )}
            <button
              type="button"
              className={`map-fs-icon-btn ${layersOpen ? 'is-active' : ''}`}
              onClick={() => setLayersOpen((v) => !v)}
              title={t('Katmanlar', 'Layers')}
            >
              <SlidersHorizontal size={15} />
            </button>
            <button
              type="button"
              className={`map-fs-icon-btn ${listsOpen ? 'is-active' : ''}`}
              onClick={() => setListsOpen((v) => !v)}
              title={t('Listeler', 'Lists')}
            >
              <List size={15} />
            </button>
          </div>
        </div>

        <div className={`map-fs-layers-panel ${layersOpen ? 'is-open' : ''}`}>
          <div className="map-fs-layers-scroll">
            {layerOptions.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`map-fs-layer-chip ${layerVisibility[key] ? 'is-on' : ''}`}
                onClick={() => onToggleLayer(key)}
              >
                {label}
                {counts[key] > 0 && <span className="map-fs-layer-count">{counts[key]}</span>}
              </button>
            ))}
          </div>
        </div>

        {showLocationWarn && (
          <div className="map-fs-toast map-fs-toast--warn">
            <span>
              {locationStatus === 'denied'
                ? t('Konum izni kapalı', 'Location permission denied')
                : t('Konum alınamadı', 'Location unavailable')}
            </span>
            <button type="button" onClick={onLocationRetry}>{t('Tekrar', 'Retry')}</button>
          </div>
        )}

        {pickMode && (
          <div className="map-fs-toast map-fs-toast--pick">
            {t('Haritaya tıklayarak afet bölgesi merkezini seçin', 'Click the map to set disaster zone center')}
          </div>
        )}
      </div>

      <div className={`map-fs-lists ${listsOpen ? 'is-open' : ''}`}>
        <div className="map-fs-lists-body">
          <div className="map-fs-list-card">
            <div className="map-fs-list-card__title">{t('ÜNİTE LİSTESİ', 'UNIT LIST')}</div>
            <div className="map-fs-list-scroll">
              {displayUnits.length === 0 ? (
                <div className="map-fs-list-empty">{t('Ünite yok', 'No units')}</div>
              ) : (
                displayUnits.map((unit) => {
                  const color = unitColor(unit.status);
                  const isSelected = selectedElement?.type === 'unit' && selectedElement?.data?.unitId === unit.unitId;
                  return (
                    <button
                      key={unit.unitId}
                      type="button"
                      className={`map-fs-list-item ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => {
                        onSelectElement({ type: 'unit', data: unit });
                        flyToUnit(unit);
                      }}
                    >
                      <span className="map-fs-list-dot" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
                      <span className="map-fs-list-item__main">{unit.serialNumber}</span>
                      <span className="map-fs-list-item__sub">{unit.status}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="map-fs-list-card map-fs-list-card--sos">
            <div className="map-fs-list-card__title map-fs-list-card__title--sos">
              {t('AKTİF SOS', 'ACTIVE SOS')} ({sidebarTickets.length})
            </div>
            <div className="map-fs-list-scroll">
              {sidebarTickets.length === 0 ? (
                <div className="map-fs-list-empty map-fs-list-empty--ok">✓ {t('Aktif SOS yok', 'No active SOS')}</div>
              ) : (
                sidebarTickets.slice(0, 8).map((ticket) => {
                  const color = triageColor(ticket.triageColor);
                  const isSelected = selectedElement?.type === 'ticket' && selectedElement?.data?.ticketId === ticket.ticketId;
                  const mapTk = mapTickets.find((mt) => mt.ticketId === ticket.ticketId) || ticket;
                  return (
                    <button
                      key={ticket.ticketId}
                      type="button"
                      className={`map-fs-list-item ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => {
                        onSelectElement({ type: 'ticket', data: mapTk });
                        flyToTicket(mapTk);
                      }}
                    >
                      <span className="map-fs-list-tri" style={{ borderBottomColor: color }} />
                      <span className="map-fs-list-item__main">#{ticket.ticketId}</span>
                      <span className="map-fs-list-item__sub">{ticket.requestType}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {showSelectionBar && (
        <MapSelectionBar
          variant="fs"
          selectedElement={selectedElement}
          userLocation={userLocation}
          manualTarget={manualRouteTarget}
          activeRoute={activeRoute}
          dispatchActive={dispatchActive}
          onCreateRoute={handleCreateRoute}
          onClearRoute={handleClearRoute}
          onClearSelection={handleClearSelection}
          t={t}
        />
      )}

      {(activeRoute || routeLoading) && (
        <MapRouteSheet
          route={activeRoute}
          loading={routeLoading}
          onClearRoute={handleClearRoute}
          canClear={!dispatchActive && !!manualRouteTarget}
          googleMapsUrl={
            activeRoute && userLocation?.lat != null
              ? googleMapsDirectionsUrl(
                userLocation.lat,
                userLocation.lng,
                activeRoute.destLat,
                activeRoute.destLng
              )
              : null
          }
          t={t}
        />
      )}

    </div>
  );
}
