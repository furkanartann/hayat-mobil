
﻿import React from 'react';
import { Navigation } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { getActiveDisasterAlert, resolveDisasterBannerCopy } from '../../lib/alerts.js';
import { formatDbTimeLocal } from '../../lib/datetime.js';

export default function NonDashboardDisasterBanner() {
  const app = useApp();
  if (app.activeTab === 'map' || app.activeTab === 'dashboard') return null;

  const critAlert = getActiveDisasterAlert(app.alerts, app.mapLayers.disasterZones);
  const inZone = !!app.zoneStatus?.inDisasterZone;

  if (!critAlert && !inZone) return null;

  const bannerCopy = critAlert ? resolveDisasterBannerCopy(critAlert) : null;
  const timeLabel = critAlert ? formatDbTimeLocal(critAlert.createdAt) : null;

  return (
    <div className="app-disaster-topbars" role="region" aria-label={app.t('Afet uyarıları', 'Disaster alerts')}>
      {bannerCopy && (
        <div
          className="disaster-topbar"
          title={bannerCopy.message}
        >
          <span className="disaster-topbar__icon" aria-hidden>{bannerCopy.icon}</span>
          <span className="disaster-topbar__badge">{app.t('Aktif afet', 'Active disaster')}</span>
          <span className="disaster-topbar__title">{bannerCopy.name}</span>
          {timeLabel && (
            <span className="disaster-topbar__live">
              <strong>{app.t('CANLI', 'LIVE')}</strong>
              <span>{timeLabel}</span>
            </span>
          )}
        </div>
      )}

      {inZone && (
        <div className="zone-topbar">
          <Navigation className="zone-topbar__icon" aria-hidden />
          <span className="zone-topbar__label">
            {app.t('Afet bölgesindesiniz', 'You are in a disaster zone')}
          </span>
          <span className="zone-topbar__zone">
            {app.zoneStatus.zoneTitle || app.t('Aktif afet bölgesi', 'Active disaster zone')}
          </span>
        </div>
      )}
    </div>
  );
}
