import React from 'react';
import { X, Route, ExternalLink } from 'lucide-react';
import { elementRouteMeta, googleMapsDirectionsUrl } from '../../lib/routing.js';

function selectionSummary(selectedElement, t) {
  const { type, data } = selectedElement;
  const title = type === 'unit' ? t('Ünite', 'Unit')
    : type === 'ticket' ? 'SOS'
    : type === 'sensor' ? t('Sensör', 'Sensor')
    : type === 'ai' ? 'AI'
    : type === 'missing' ? t('Kayıp', 'Missing')
    : type === 'user' ? t('Afetzede', 'Civilian')
    : type === 'assembly' ? t('Toplanma', 'Assembly')
    : t('Seçili', 'Selected');

  let detail = '';
  if (type === 'unit') detail = `${data.serialNumber} · ${data.status}`;
  else if (type === 'ticket') detail = `#${data.ticketId} · ${data.requestType} · ${data.triageColor}`;
  else if (type === 'sensor') detail = `${data.sensorType}: ${data.currentValue ?? '—'}`;
  else if (type === 'ai') detail = data.detectionType;
  else if (type === 'missing') detail = data.missingPersonName;
  else if (type === 'user') detail = data.fullName;
  else if (type === 'assembly') detail = data.name;

  return { title, detail };
}

export default function MapSelectionBar({
  selectedElement,
  userLocation,
  manualTarget,
  activeRoute,
  dispatchActive,
  onCreateRoute,
  onClearRoute,
  onClearSelection,
  t = (tr) => tr,
  variant = 'live',
}) {
  if (!selectedElement) return null;

  const { title, detail } = selectionSummary(selectedElement, t);
  const meta = elementRouteMeta(selectedElement);
  const hasLocation = userLocation?.lat != null && userLocation?.lng != null;
  const manualActive = manualTarget?.key === meta?.key && activeRoute?.mode === 'manual';
  const isFs = variant === 'fs';
  const isOverlay = variant === 'live-overlay';
  const wrapClass = isFs
    ? 'map-fs-detail'
    : isOverlay
      ? 'live-map-detail-overlay'
      : 'live-map-selection-bar';

  return (
    <div className={wrapClass}>
      <div className={`${isFs || isOverlay ? 'map-fs-detail-text' : 'live-map-selection-text'} map-selection-text`}>
        <strong>{title}</strong>
        {detail && <> — {detail}</>}
      </div>

      <div className="map-selection-actions">
        {meta && hasLocation && !dispatchActive && (
          manualActive ? (
            <button type="button" className="map-selection-btn map-selection-btn--ghost" onClick={onClearRoute}>
              <Route size={14} />
              {t('Rotayı kapat', 'Clear route')}
            </button>
          ) : (
            <button type="button" className="map-selection-btn map-selection-btn--primary" onClick={onCreateRoute}>
              <Route size={14} />
              {t('Rota oluştur', 'Create route')}
            </button>
          )
        )}

        {meta && hasLocation && manualActive && (
          <a
            href={googleMapsDirectionsUrl(
              userLocation.lat,
              userLocation.lng,
              meta.lat,
              meta.lng
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="map-selection-btn map-selection-btn--ghost"
            title={t('Google Maps', 'Google Maps')}
          >
            <ExternalLink size={14} />
          </a>
        )}

        {meta && !hasLocation && (
          <span className="map-selection-hint">{t('Rota için konum gerekli', 'Location required for route')}</span>
        )}

        <button
          type="button"
          className={isFs || isOverlay ? 'map-fs-detail-close' : 'live-map-selection-close'}
          onClick={onClearSelection}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
