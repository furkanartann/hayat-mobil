export const EMPTY_APP_DATA = {
  stats: {
    activeUnits: 0, emgUnits: 0, offUnits: 0,
    critTickets: 0, yellowTickets: 0, greenTickets: 0, openTicketsAll: 0,
    errSensors: 0, offSensors: 0, missingPpl: 0, pendingSync: 0,
    recentAlerts: 0, safeUsers: 0, dangerUsers: 0, activeStaff: 0, availableStaff: 0
  },
  runtimeState: {
    networkQuality: 100, weatherTemp: 22, weatherCondition: 'Parcali Bulutlu', weatherRisk: 'Normal'
  },
  telemetry: {
    waterLevel: 0, energyLevel: 0, airQuality: 'NORMAL', connectedPeople: 0,
    hasLiveSensors: false, sensorOnline: { nem: 0, enerji: 0, duman: 0, gaz: 0 },
  },
  alerts: [],
  myActiveDuty: null,
  tickets: [],
  units: [],
  sensors: [],
  inventory: [],
  distributions: [],
  medicalRecords: [],
  missingPersons: [],
  aiDetections: [],
  staffList: [],
  myStaffApplication: null,
  staffApplications: [],
  disasterTypes: [],
  disasterHistory: [],
  mapLayers: {
    me: null, units: [], sensors: [], tickets: [], aiDetections: [], missingPersons: [],
    disasterZones: [], userLocations: [], assemblyPoints: [],
  },
  zoneStatus: { inDisasterZone: false, zoneTitle: null },
};
