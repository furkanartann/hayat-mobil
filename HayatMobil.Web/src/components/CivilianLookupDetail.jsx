import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MapPin, Navigation, AlertTriangle, HeartPulse, User } from 'lucide-react';
import {
  careSummaryText,
  formatDistanceKm,
  lookupResultTitle,
  missingStatusLabel,
  safetyStatusClass,
  safetyStatusLabel,
  sosSummaryText,
} from '../lib/civilianLookup.js';

export default function CivilianLookupDetail({ item, onClose, onShowMap, t = (tr) => tr }) {
  useEffect(() => {
    if (!item) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [item]);

  if (!item) return null;

  const title = lookupResultTitle(item);
  const isUser = item.kind === 'user';
  const hasCoords = item.latitude != null && item.longitude != null;

  return createPortal(
    <div className="civilian-lookup-detail" role="dialog" aria-modal="true" aria-label={title}>
      <div className="civilian-lookup-detail__backdrop" onClick={onClose} aria-hidden />
      <div className="civilian-lookup-detail__panel">
        <div className="civilian-lookup-detail__header">
          <div>
            <h3>{title}</h3>
            <p className="civilian-lookup-detail__kind">
              {isUser ? t('Kayıtlı afetzede', 'Registered civilian') : t('Kayıp ilanı', 'Missing report')}
            </p>
          </div>
          <button type="button" className="civilian-lookup-detail__close" onClick={onClose} aria-label={t('Kapat', 'Close')}>
            <X size={18} />
          </button>
        </div>

        <div className="civilian-lookup-detail__badges">
          {isUser && (
            <span className={`badge ${safetyStatusClass(item.safetyStatus)}`}>
              {safetyStatusLabel(item.safetyStatus, t)}
            </span>
          )}
          {item.missingReport && (
            <span className="badge badge-red">
              {missingStatusLabel(item.missingReport.status, t)}
            </span>
          )}
          {!isUser && (
            <span className={`badge ${item.status === 'Missing' ? 'badge-red' : item.status === 'Found' ? 'badge-green' : 'badge-grey'}`}>
              {missingStatusLabel(item.status, t)}
            </span>
          )}
        </div>

        <div className="civilian-lookup-detail__rows">
          {hasCoords && (
            <div className="civilian-lookup-detail__row">
              <MapPin size={15} />
              <span>{formatDistanceKm(item.distanceKm, t)}</span>
            </div>
          )}

          {isUser && item.lastSafetyReport && (
            <div className="civilian-lookup-detail__row">
              <User size={15} />
              <span>{item.lastSafetyReport}</span>
            </div>
          )}

          {sosSummaryText(item.sos, t) && (
            <div className="civilian-lookup-detail__row civilian-lookup-detail__row--warn">
              <AlertTriangle size={15} />
              <span>{sosSummaryText(item.sos, t)}</span>
            </div>
          )}

          {careSummaryText(item.care, t) && (
            <div className="civilian-lookup-detail__row civilian-lookup-detail__row--care">
              <HeartPulse size={15} />
              <div>
                <span>{careSummaryText(item.care, t)}</span>
                {item.care?.treatmentSummary && (
                  <p className="civilian-lookup-detail__note">{item.care.treatmentSummary}</p>
                )}
              </div>
            </div>
          )}

          {!isUser && item.physicalDescription && (
            <div className="civilian-lookup-detail__desc">
              <strong>{t('Açıklama', 'Details')}</strong>
              <p>{item.physicalDescription}</p>
            </div>
          )}

          {!isUser && item.reporterName && (
            <p className="civilian-lookup-detail__meta">
              {t('İhbarcı', 'Reporter')}: {item.reporterName}
            </p>
          )}

          {hasCoords && (
            <p className="civilian-lookup-detail__meta">
              {t('Koordinat', 'Coordinates')}: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
            </p>
          )}
        </div>

        <div className="civilian-lookup-detail__actions">
          {hasCoords && (
            <button type="button" className="btn btn-primary" onClick={() => onShowMap?.(item)}>
              <Navigation size={15} />
              {t('Haritada göster', 'Show on map')}
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('Kapat', 'Close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
