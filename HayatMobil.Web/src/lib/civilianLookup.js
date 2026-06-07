/** Kuş uçuşu km → gösterim metni */
export function formatDistanceKm(km, t = (tr) => tr) {
  if (km == null || !Number.isFinite(km)) return t('Mesafe bilinmiyor', 'Distance unknown');
  if (km < 1) return t(`${Math.round(km * 1000)} m uzakta`, `${Math.round(km * 1000)} m away`);
  return t(`${km.toFixed(1)} km uzakta`, `${km.toFixed(1)} km away`);
}

export function safetyStatusLabel(status, t = (tr) => tr) {
  if (status === 'Safe') return t('Güvende', 'Safe');
  if (status === 'In_Danger') return t('Tehlikede', 'In danger');
  return t('Bilinmiyor', 'Unknown');
}

export function safetyStatusClass(status) {
  if (status === 'Safe') return 'badge-green';
  if (status === 'In_Danger') return 'badge-red';
  return 'badge-grey';
}

export { formatMissingStatus as missingStatusLabel } from './statusLabels.js';

export function sosSummaryText(sos, t = (tr) => tr) {
  if (!sos?.hasActive) return null;
  const type = sos.requestType === 'Medical' ? t('Tıbbi', 'Medical')
    : sos.requestType === 'Rescue' ? t('Kurtarma', 'Rescue')
    : sos.requestType === 'Food' ? t('Gıda', 'Food')
    : sos.requestType === 'Water' ? t('Su', 'Water')
    : sos.requestType;
  if (sos.status === 'In_Progress') {
    return sos.referredToDoctor
      ? t(`${type} — ekip müdahalede, doktora sevk`, `${type} — team on scene, referred to doctor`)
      : t(`${type} — ekip müdahalede`, `${type} — team responding`);
  }
  return t(`${type} yardım talebi açık`, `${type} assistance request open`);
}

export function careSummaryText(care, t = (tr) => tr) {
  if (!care?.hasIntervention) return null;
  if (care.recordType === 'FieldAssessment') {
    return care.disposition
      ? t(`Saha müdahalesi: ${care.disposition}`, `Field care: ${care.disposition}`)
      : t('Saha müdahalesi yapıldı', 'Field assessment completed');
  }
  if (care.disposition) {
    return t(`Klinik değerlendirme: ${care.disposition}`, `Clinical review: ${care.disposition}`);
  }
  return t('Sağlık müdahalesi kaydı var', 'Medical intervention on record');
}

export function lookupResultTitle(item) {
  return item.kind === 'user' ? item.fullName : item.missingPersonName;
}

export function lookupResultKey(item) {
  return item.kind === 'user' ? `u-${item.userId}` : `m-${item.reportId}`;
}
