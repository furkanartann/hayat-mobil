import React from 'react';
import { formatDbTimeLocal } from '../lib/datetime.js';

export default function ActiveDisasterBanner({
  disasterName,
  bannerMessage,
  icon,
  createdAt,
  className = '',
  style,
}) {
  const timeLabel = formatDbTimeLocal(createdAt);

  return (
    <div className={`disaster-banner content-padded-mobile ${className}`.trim()} style={style}>
      <div className="disaster-banner__icon" aria-hidden>
        {icon}
      </div>

      <div className="disaster-banner__content">
        <div className="disaster-banner__meta">
          <span className="disaster-banner__badge">🚨 AKTİF AFET</span>
          <span className="disaster-banner__live disaster-banner__live--mobile">
            <strong>CANLI</strong>
            {timeLabel && <span>{timeLabel}</span>}
          </span>
        </div>

        <h3 className="disaster-banner__title">{disasterName}</h3>

        <p className="disaster-banner__message">{bannerMessage}</p>
      </div>

      <div className="disaster-banner__live disaster-banner__live--desktop" aria-label="Canlı yayın">
        <strong>CANLI</strong>
        {timeLabel && <span>{timeLabel}</span>}
      </div>
    </div>
  );
}
