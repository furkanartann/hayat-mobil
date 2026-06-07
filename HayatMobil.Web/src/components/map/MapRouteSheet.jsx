import React, { useState } from 'react';
import {
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  CornerUpLeft,
  CornerUpRight,
  ExternalLink,
  GitFork,
  GitMerge,
  Navigation,
  RotateCw,
  Undo2,
  X,
} from 'lucide-react';
import { formatRouteDistance, formatRouteDuration } from '../../lib/routing.js';
import { formatNavStepLine, resolveNavStepIcon } from '../../lib/routeSteps.js';

function NavStepIcon({ step, size = 16, className }) {
  const kind = resolveNavStepIcon(step);
  const props = { size, className, 'aria-hidden': true };

  switch (kind) {
    case 'depart':
      return <Navigation {...props} />;
    case 'turn-right':
    case 'sharp-right':
    case 'fork-right':
      return <CornerUpRight {...props} />;
    case 'turn-left':
    case 'sharp-left':
    case 'fork-left':
      return <CornerUpLeft {...props} />;
    case 'slight-right':
      return <ArrowUpRight {...props} />;
    case 'slight-left':
      return <ArrowUpLeft {...props} />;
    case 'uturn':
      return <Undo2 {...props} />;
    case 'roundabout':
      return <RotateCw {...props} />;
    case 'merge':
      return <GitMerge {...props} />;
    case 'fork':
      return <GitFork {...props} />;
    default:
      return <ArrowUp {...props} />;
  }
}

export default function MapRouteSheet({
  route,
  loading = false,
  onClearRoute,
  canClear = false,
  googleMapsUrl,
  t = (tr) => tr,
}) {
  const [stepsOpen, setStepsOpen] = useState(false);

  if (loading && !route) {
    return (
      <div className="map-route-bar map-route-bar--loading">
        <span>{t('Rota hesaplanıyor…', 'Calculating route…')}</span>
      </div>
    );
  }

  if (!route?.positions || route.positions.length < 2) return null;

  const steps = Array.isArray(route.steps) ? route.steps : [];
  const nextStep = steps[0];
  const moreSteps = steps.slice(1, 5);
  const modeLabel = route.mode === 'manual'
    ? t('Rota', 'Route')
    : t('İntikal', 'En route');

  return (
    <>
      {nextStep && (
        <div className="map-route-nav" style={{ '--route-accent': route.color || '#38bdf8' }}>
          <button
            type="button"
            className="map-route-nav__main"
            onClick={() => setStepsOpen((v) => !v)}
            aria-expanded={stepsOpen}
          >
            <span className="map-route-nav__icon-wrap" aria-hidden>
              <NavStepIcon step={nextStep} size={16} />
            </span>
            <span className="map-route-nav__text">{formatNavStepLine(nextStep, t)}</span>
            {steps.length > 1 && (
              stepsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />
            )}
          </button>
          {stepsOpen && moreSteps.length > 0 && (
            <ul className="map-route-nav__more">
              {moreSteps.map((step, idx) => (
                <li key={`${step.instruction}-${idx}`}>
                  <span className="map-route-nav__more-icon" aria-hidden>
                    <NavStepIcon step={step} size={13} />
                  </span>
                  <span>{formatNavStepLine(step, t)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="map-route-bar">
        <div className="map-route-bar__main">
          <div className="map-route-bar__hero">
            <span className="map-route-bar__eta">{formatRouteDuration(route.durationSeconds, t)}</span>
            <span className="map-route-bar__dist">{formatRouteDistance(route.distanceMeters, t)}</span>
          </div>
          <p className="map-route-bar__caption">
            {modeLabel}
            {' · '}
            {route.label ?? `SOS #${route.ticketId}`}
            {route.fallback && (
              <span className="map-route-bar__fallback-tag">{t('Yedek rota', 'Fallback')}</span>
            )}
          </p>
        </div>
        <div className="map-route-bar__actions">
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="map-route-bar__btn"
              title={t('Google Maps', 'Google Maps')}
            >
              <ExternalLink size={14} />
            </a>
          )}
          {canClear && (
            <button
              type="button"
              className="map-route-bar__btn map-route-bar__btn--close"
              onClick={onClearRoute}
              title={t('Rotayı kapat', 'Clear route')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
