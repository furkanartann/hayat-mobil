import React from 'react';
import { formatRouteDistance, formatRouteDuration } from '../../lib/routing.js';
import { minutesFromDurationSeconds } from '../../lib/eta.js';

export default function EtaBadge({
  durationSeconds,
  distanceMeters,
  etaMinutes,
  fallback = false,
  loading = false,
  t = (tr) => tr,
  compact = false,
}) {
  if (loading) {
    return (
      <span className="eta-badge eta-badge--loading">
        {t('Hesaplanıyor…', 'Calculating…')}
      </span>
    );
  }

  if (durationSeconds != null && Number.isFinite(durationSeconds)) {
    const duration = formatRouteDuration(durationSeconds, t);
    const distance = distanceMeters != null
      ? formatRouteDistance(distanceMeters, t)
      : null;
    return (
      <span className={`eta-badge${fallback ? ' eta-badge--fallback' : ''}`}>
        {compact || !distance ? duration : `${duration} · ${distance}`}
      </span>
    );
  }

  if (etaMinutes != null) {
    return (
      <span className={`eta-badge${fallback ? ' eta-badge--fallback' : ''}`}>
        {t(`~${etaMinutes} dk`, `~${etaMinutes} min`)}
      </span>
    );
  }

  return null;
}

export function buildDispatchNote({ teamLabel, eta, t = (tr) => tr }) {
  if (!eta) return teamLabel;
  const mins = eta.durationSeconds != null
    ? minutesFromDurationSeconds(eta.durationSeconds)
    : eta.etaMinutes;
  if (mins == null) return teamLabel;
  const dist = eta.distanceMeters != null
    ? formatRouteDistance(eta.distanceMeters, t)
    : null;
  const etaText = dist
    ? t(`~${mins} dk (${dist})`, `~${mins} min (${dist})`)
    : t(`~${mins} dk`, `~${mins} min`);
  return t(`${teamLabel} Tahmini varış: ${etaText}.`, `${teamLabel} ETA: ${etaText}.`);
}
