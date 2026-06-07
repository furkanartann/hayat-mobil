/** Koordinat/OSRM yokken kullanılan yedek süreler (dk). */

export const etaForFieldDuty = (kind) => ({ Sensor: 20, Unit: 35, Missing: 50 }[kind] ?? 30);
export const etaForTriage = (color) => ({ Red: 45, Yellow: 30, Green: 20, Black: 60 }[color] ?? 25);

export function minutesFromDurationSeconds(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return null;
  return Math.max(1, Math.round(seconds / 60));
}
