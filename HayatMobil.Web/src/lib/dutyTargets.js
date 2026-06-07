/** PM saha görevi hedef koordinatları (client-side rota önizlemesi). */

export function resolveDutyTarget(duty, { units = [], sensors = [], missingPersons = [] } = {}) {
  if (!duty?.dutyType || duty.refId == null) return null;

  switch (duty.dutyType) {
    case 'Unit': {
      const unit = units.find((u) => u.unitId === duty.refId);
      if (!unit || unit.latitude == null || unit.longitude == null) return null;
      return {
        lat: unit.latitude,
        lng: unit.longitude,
        label: unit.serialNumber ?? `U${duty.refId}`,
      };
    }
    case 'Sensor': {
      const sensor = sensors.find((s) => s.sensorId === duty.refId);
      if (!sensor) return null;
      const unit = units.find((u) => u.unitId === sensor.unitId);
      if (!unit || unit.latitude == null || unit.longitude == null) return null;
      return {
        lat: unit.latitude,
        lng: unit.longitude,
        label: `Sensör #${duty.refId}`,
      };
    }
    case 'Missing': {
      const mp = missingPersons.find((p) => p.reportId === duty.refId);
      if (!mp || mp.lastKnownLat == null || mp.lastKnownLong == null) return null;
      return {
        lat: mp.lastKnownLat,
        lng: mp.lastKnownLong,
        label: mp.missingPersonName ?? `Kayıp #${duty.refId}`,
      };
    }
    default:
      return null;
  }
}
