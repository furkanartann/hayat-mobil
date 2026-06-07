export function formatAirQualityLabel(code, t = (tr) => tr) {
  if (code === 'KRITIK') return t('Kritik', 'Critical');
  if (code === 'UYARI') return t('Uyarı', 'Warning');
  return t('Normal', 'Normal');
}

export function airQualityTone(code) {
  if (code === 'KRITIK') return 'var(--rose)';
  if (code === 'UYARI') return 'var(--amber)';
  return 'var(--emerald)';
}

/** Saha telemetrisi bölümü gösterilsin mi? */
export function hasLiveFieldTelemetry(telemetry, sensors = []) {
  const online = (type) => sensors.some((s) => s.sensorType === type && s.status === 'Online');
  if (!telemetry) {
    return online('Nem') || online('Enerji') || online('Duman') || online('Gaz');
  }
  if (telemetry.hasLiveSensors) return true;
  return telemetry.waterLevel > 0
    || telemetry.energyLevel > 0
    || telemetry.sensorOnline?.nem > 0
    || telemetry.sensorOnline?.enerji > 0
    || telemetry.sensorOnline?.duman > 0
    || telemetry.sensorOnline?.gaz > 0
    || online('Nem') || online('Enerji') || online('Duman') || online('Gaz');
}
