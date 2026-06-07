import React from 'react';
import { Navigation, Radio } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { getActiveDisasterAlert, getSensorAutoAlerts, resolveDisasterBannerCopy } from '../../lib/alerts.js';
import { formatDbTimeLocal } from '../../lib/datetime.js';
import ActiveDisasterBanner from '../../components/ActiveDisasterBanner.jsx';

export default function DashboardBanners() {
  const app = useApp();
  const critAlert = getActiveDisasterAlert(app.alerts, app.mapLayers.disasterZones);
  const bannerCopy = critAlert ? resolveDisasterBannerCopy(critAlert) : null;

  return (
    <>
      {bannerCopy && (
        <ActiveDisasterBanner
          disasterName={bannerCopy.name}
          bannerMessage={bannerCopy.message}
          icon={bannerCopy.icon}
          createdAt={critAlert.createdAt}
        />
      )}

      {getSensorAutoAlerts(app.alerts).length > 0 && (
        <div className="content-padded-mobile sensor-alert-banner">
          <div className="sensor-alert-banner__title">
            <Radio style={{ width: '14px', height: '14px' }} />
            {app.t('Saha Sensör Uyarıları', 'Field Sensor Alerts')}
          </div>
          <div className="sensor-alert-banner__list">
            {getSensorAutoAlerts(app.alerts).slice(0, 4).map((alert, idx) => (
              <div key={alert.alertId ?? idx} className="sensor-alert-banner__item">
                <div className="sensor-alert-banner__item-title">
                  {alert.title.replace(/^\[AI\]\s*/, '')}
                  <span>{formatDbTimeLocal(alert.createdAt)}</span>
                </div>
                <div className="sensor-alert-banner__item-msg">{alert.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {app.zoneStatus?.inDisasterZone && (
        <div className="content-padded-mobile zone-warning-banner">
          <Navigation className="zone-warning-banner__icon" />
          <div>
            <div className="zone-warning-banner__title">
              {app.t('Afet bölgesindesiniz', 'You are in a disaster zone')}
            </div>
            <div className="zone-warning-banner__sub">
              {app.zoneStatus.zoneTitle || app.t('Aktif afet bölgesi', 'Active disaster zone')}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
