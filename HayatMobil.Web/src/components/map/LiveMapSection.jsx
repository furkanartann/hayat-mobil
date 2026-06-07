import React, { useState } from 'react';
import { Map, Navigation, Maximize2, SlidersHorizontal, MapPin } from 'lucide-react';
import MapPanel from './MapPanel.jsx';
import MapRouteSheet from './MapRouteSheet.jsx';
import MapSelectionBar from './MapSelectionBar.jsx';
import { elementRouteMeta, googleMapsDirectionsUrl } from '../../lib/routing.js';
export default function LiveMapSection({
  layers,
  layerVisibility,
  onToggleLayer,
  userLocation,
  flyToMeToken,
  onFlyToMe,
  onSelectElement,
  onExpand,
  selectedElement,
  onClearSelection,
  zoneStatus,
  locationStatus,
  onLocationRetry,
  user,
  t = (tr) => tr,
  variant = 'hero',
  hideExpand = false,
  refreshKey = 0,
  fallbackTickets = [],
  tickets = [],
  activeRoute = null,
  routeLoading = false,
  dispatchActive = false,
  manualRouteTarget = null,
  onCreateRoute,
  onClearRoute,
  onNearestAssembly,
}) {
  const [layersOpen, setLayersOpen] = useState(false);
  const isHero = variant === 'hero';
  const ticketSource = tickets.length > 0 ? tickets : fallbackTickets;

  const handleCreateRoute = () => onCreateRoute?.(selectedElement);

  const handleClearRoute = () => onClearRoute?.();

  const handleClearSelection = () => onClearSelection?.();

  const selectedRouteKey = selectedElement ? elementRouteMeta(selectedElement)?.key : null;
  const showSelectionBar = selectedElement
    && (!activeRoute || activeRoute.routeKey !== selectedRouteKey)
    && !routeLoading;

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
    units: layers?.units?.length ?? 0,
    sensors: layers?.sensors?.length ?? 0,
    tickets: layers?.tickets?.length ?? 0,
    ai: layers?.aiDetections?.length ?? 0,
    missing: layers?.missingPersons?.length ?? 0,
    assembly: layers?.assemblyPoints?.length ?? 0,
  };

  return (
    <section className={`live-map-section ${isHero ? 'live-map-section--hero' : ''}`}>
      <div className="live-map-toolbar">
        <div className="live-map-toolbar-title">
          <Map size={18} />
          <span>{t('Canlı Harita', 'Live Map')}</span>
          {zoneStatus?.inDisasterZone && (
            <span className="live-map-zone-pill">{t('Afet bölgesi', 'Disaster zone')}</span>
          )}
          {locationStatus && locationStatus !== 'granted' && locationStatus !== 'unknown' && (
            <button
              type="button"
              className="live-map-zone-pill live-map-zone-pill--warn"
              onClick={onLocationRetry}
            >
              {locationStatus === 'denied'
                ? t('Konum kapalı — rota için aç', 'Location off — enable for routes')
                : t('Konum alınamadı', 'Location unavailable')}
            </button>
          )}
        </div>
        <div className="live-map-toolbar-actions">
          {user?.userType === 'Afetzede' && (layers?.assemblyPoints?.length ?? 0) > 0 && (
            <button
              type="button"
              className="live-map-icon-btn live-map-icon-btn--primary"
              onClick={onNearestAssembly}
              title={t('En yakın toplanma alanına git', 'Go to nearest assembly point')}
            >
              <MapPin size={16} />
            </button>
          )}
          {userLocation?.lat != null && (
            <button type="button" className="live-map-icon-btn" onClick={onFlyToMe} title={t('Konumum', 'My location')}>
              <Navigation size={16} />
            </button>
          )}
          <button
            type="button"
            className={`live-map-icon-btn ${layersOpen ? 'is-active' : ''}`}
            onClick={() => setLayersOpen((v) => !v)}
            title={t('Katmanlar', 'Layers')}
          >
            <SlidersHorizontal size={16} />
          </button>
          {!hideExpand && (
            <button type="button" className="live-map-icon-btn live-map-icon-btn--primary" onClick={onExpand} title={t('Tam ekran', 'Full screen')}>
              <Maximize2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className={`live-map-layers-panel ${layersOpen ? 'is-open' : ''}`}>
        <div className="live-map-layers-scroll">
          {layerOptions.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`live-map-layer-chip ${layerVisibility[key] ? 'is-on' : ''}`}
              onClick={() => onToggleLayer(key)}
            >
              <span className="live-map-layer-chip__label">{label}</span>
              {counts[key] > 0 && <span className="live-map-layer-chip__count">{counts[key]}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="live-map-canvas">
        <MapPanel
          layers={layers}
          layerVisibility={layerVisibility}
          onSelectElement={onSelectElement}
          onMapClick={() => onClearSelection?.()}
          userLocation={userLocation}
          flyToMeToken={flyToMeToken}
          fallbackTickets={ticketSource}
          dispatchRoute={activeRoute}
          dispatchRouteLoading={routeLoading}
          refreshKey={refreshKey}
          t={t}
          flushEdges={isHero}
          heroFill={isHero}
        />

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

        {showSelectionBar && (
          <MapSelectionBar
            variant="live-overlay"
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
      </div>

    </section>
  );
}
