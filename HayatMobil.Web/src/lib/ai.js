import { detectionTypeOptions } from './constants.js';

export const formatAiDetectionLabel = (type, t) => {
  const opt = detectionTypeOptions.find((o) => o.value === type);
  if (opt) return t(opt.labelTR, opt.labelEN);
  return type?.replace(/_/g, ' ') ?? '—';
};

export const formatAiSourceLabel = (cameraId, t) => {
  if (!cameraId) return t('Manuel saha tespiti', 'Manual field detection');
  if (cameraId.startsWith('SENSOR-')) {
    const code = cameraId.replace('SENSOR-', '');
    const names = {
      Isi: t('Sıcaklık sensörü', 'Temperature sensor'),
      Duman: t('Duman sensörü', 'Smoke sensor'),
      Gaz: t('Gaz sensörü', 'Gas sensor'),
      Sismik: t('Sismik sensör', 'Seismic sensor'),
      Nem: t('Nem sensörü', 'Humidity sensor'),
    };
    return names[code] || t(`${code} sensörü`, `${code} sensor`);
  }
  return t(`Kamera: ${cameraId}`, `Camera: ${cameraId}`);
};

export const formatAiUnitLabel = (unitId, units) => {
  const u = units.find((x) => x.unitId === unitId);
  return u?.serialNumber ? u.serialNumber : `U${unitId}`;
};
