export const isSensorAutoAlert = (alert) => typeof alert?.title === 'string' && alert.title.startsWith('[AI]');

const norm = (s) => (s ?? '').trim();

export const formatDisasterBannerTitle = (title) => {
  if (!title) return '';
  const raw = String(title).replace(/^\[AI\]\s*/i, '').trim();
  if (!raw.includes(':')) return raw;
  const after = raw.split(':').slice(1).join(':').trim();
  return after || raw.split(':')[0].trim() || raw;
};

export const disasterBannerIcon = (title) => {
  const name = formatDisasterBannerTitle(title) || String(title ?? '');
  if (name.includes('Deprem')) return '🌍';
  if (name.includes('Yangın') || name.includes('Yangin')) return '🔥';
  if (name.includes('Sel')) return '🌊';
  return '⚠️';
};

/** Banner'da gösterilecek başlık + metin (boş kalmaması için yedekler) */
export function resolveDisasterBannerCopy(alert) {
  if (!alert) return { name: '', message: '', icon: '⚠️' };
  const title = norm(alert.title);
  const name = formatDisasterBannerTitle(title) || title || 'Aktif afet';
  const message = norm(alert.message) || title || name;
  return { name, message, icon: disasterBannerIcon(title || name) };
}

export const getActiveDisasterAlert = (alerts, disasterZones) => {
  const activeZone = disasterZones?.find((z) => z.active);
  if (!activeZone) return null;

  const zoneTitle = norm(activeZone.title);
  const zoneMessage = norm(activeZone.message);

  // Aktif bölgeye bağlı duyuru metni (map layers) — yazdığın metin buradan gelir
  if (zoneMessage) {
    return {
      alertId: activeZone.alertId,
      title: zoneTitle || 'Aktif afet',
      message: zoneMessage,
      severity: activeZone.severity || 'Critical',
      createdAt: activeZone.createdAt || activeZone.declaredAt,
    };
  }

  const nonSensorCritical = (alerts ?? []).filter((a) => a.severity === 'Critical' && !isSensorAutoAlert(a));

  if (activeZone.alertId != null) {
    const byId = nonSensorCritical.find((a) => a.alertId === activeZone.alertId);
    if (byId) return byId;
  }

  const byTitle = nonSensorCritical.find((a) => norm(a.title) === zoneTitle);
  if (byTitle) return byTitle;

  return {
    title: zoneTitle || 'Aktif afet',
    message: zoneTitle
      ? `${zoneTitle} — bölgede aktif afet ilanı geçerlidir. Güvenli alanlara yönelin.`
      : 'Bölgede aktif afet ilanı geçerlidir. Güvenli alanlara yönelin.',
    createdAt: activeZone.declaredAt,
    severity: 'Critical',
  };
};

export const getSensorAutoAlerts = (alerts) =>
  (alerts ?? []).filter((a) => a.severity === 'Critical' && isSensorAutoAlert(a));
