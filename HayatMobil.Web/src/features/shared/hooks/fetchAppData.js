import { apiFetch, readJsonSafe } from '../../../api/client.js';
import { getAvailableTabs } from '../../../lib/roles.js';
import { EMPTY_APP_DATA } from './appDataDefaults.js';

async function fetchJson(path) {
  const res = await apiFetch(path);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchAppData(user, activeTab, previous = EMPTY_APP_DATA) {
  const next = { ...previous };
  const role = user.userType;
  const tabs = getAvailableTabs(role);
  const hasMap = tabs.includes('map');

  const [stats, runtimeState, alerts] = await Promise.all([
    fetchJson('/api/dashboard'),
    fetchJson('/api/runtime-state'),
    fetchJson('/api/alerts'),
  ]);
  if (stats) next.stats = stats;
  if (runtimeState) next.runtimeState = runtimeState;
  if (alerts) next.alerts = alerts;

  if (user.staffId) {
    const resDuty = await apiFetch(`/api/staff/${user.staffId}/duty`);
    if (resDuty.ok) next.myActiveDuty = await readJsonSafe(resDuty);
  } else {
    next.myActiveDuty = null;
  }

  // Harita katmanları — harita sekmesi olan tüm roller (panel mini harita dahil)
  if (hasMap) {
    const [mapLayers, zoneStatus] = await Promise.all([
      fetchJson('/api/map/layers'),
      fetchJson('/api/users/me/zone-status'),
    ]);
    if (mapLayers) next.mapLayers = mapLayers;
    if (zoneStatus) next.zoneStatus = zoneStatus;
  }

  // Rol bazlı sürekli veri (sekmeden bağımsız — panel her zaman güncel kalsın)
  switch (role) {
    case 'PM': {
      const [tickets, staffList, inventory, distributions, units, sensors, aiDetections] = await Promise.all([
        fetchJson('/api/tickets'),
        fetchJson('/api/staff'),
        fetchJson('/api/inventory'),
        fetchJson('/api/inventory/distributions'),
        fetchJson('/api/units'),
        fetchJson('/api/sensors'),
        fetchJson('/api/ai-detections'),
      ]);
      if (tickets) next.tickets = tickets;
      if (staffList) next.staffList = staffList;
      if (inventory) next.inventory = inventory;
      if (distributions) next.distributions = distributions;
      if (units) next.units = units;
      if (sensors) next.sensors = sensors;
      if (aiDetections) next.aiDetections = aiDetections;
      if (activeTab === 'admin' || activeTab === 'dashboard') {
        const apps = await fetchJson('/api/staff-applications');
        if (apps) next.staffApplications = apps;
      }
      if (activeTab === 'admin') {
        const [disasterTypes, disasterHistory] = await Promise.all([
          fetchJson('/api/disaster-types'),
          fetchJson('/api/disasters/history'),
        ]);
        if (disasterTypes) next.disasterTypes = disasterTypes;
        if (disasterHistory) next.disasterHistory = disasterHistory;
      }
      break;
    }
    case 'Doktor':
    case 'SaglikParamedik': {
      const [tickets, medicalRecords] = await Promise.all([
        fetchJson('/api/tickets'),
        fetchJson('/api/medical-records'),
      ]);
      if (tickets) next.tickets = tickets;
      if (medicalRecords) next.medicalRecords = medicalRecords;
      break;
    }
    case 'Lojistik': {
      const [tickets, staffList, inventory, distributions] = await Promise.all([
        fetchJson('/api/tickets'),
        fetchJson('/api/staff'),
        fetchJson('/api/inventory'),
        fetchJson('/api/inventory/distributions'),
      ]);
      if (tickets) next.tickets = tickets;
      if (staffList) next.staffList = staffList;
      if (inventory) next.inventory = inventory;
      if (distributions) next.distributions = distributions;
      break;
    }
    case 'AramaKurtarma': {
      const [tickets, missingPersons, units, sensors, aiDetections] = await Promise.all([
        fetchJson('/api/tickets'),
        fetchJson('/api/missing-persons'),
        fetchJson('/api/units'),
        fetchJson('/api/sensors'),
        fetchJson('/api/ai-detections'),
      ]);
      if (tickets) next.tickets = tickets;
      if (missingPersons) next.missingPersons = missingPersons;
      if (units) next.units = units;
      if (sensors) next.sensors = sensors;
      if (aiDetections) next.aiDetections = aiDetections;
      break;
    }
    case 'Guvenlik': {
      const [tickets, units, sensors] = await Promise.all([
        fetchJson('/api/tickets'),
        fetchJson('/api/units'),
        fetchJson('/api/sensors'),
      ]);
      if (tickets) next.tickets = tickets;
      if (units) next.units = units;
      if (sensors) next.sensors = sensors;
      break;
    }
    case 'Muhendis':
    case 'IT': {
      const [units, sensors] = await Promise.all([
        fetchJson('/api/units'),
        fetchJson('/api/sensors'),
      ]);
      if (units) next.units = units;
      if (sensors) next.sensors = sensors;
      break;
    }
    case 'Afetzede': {
      const [telemetry, missingPersons, staffApp, sensors] = await Promise.all([
        fetchJson('/api/telemetry/summary'),
        fetchJson('/api/missing-persons'),
        apiFetch('/api/staff-applications/mine').then((r) => (r.ok ? readJsonSafe(r) : null)),
        fetchJson('/api/sensors'),
      ]);
      if (telemetry) next.telemetry = telemetry;
      if (missingPersons) next.missingPersons = missingPersons;
      if (sensors) next.sensors = sensors;
      next.myStaffApplication = staffApp || null;
      if (activeTab === 'dashboard') {
        const units = await fetchJson('/api/units');
        if (units) next.units = units;
      }
      break;
    }
    default:
      break;
  }

  // Sekmeye özel ek yenileme (rol verisini tamamlar veya admin formları)
  if (activeTab === 'tickets' && role === 'PM') {
    const staffList = await fetchJson('/api/staff');
    if (staffList) next.staffList = staffList;
  }
  if (activeTab === 'missing' && tabs.includes('missing')) {
    const missingPersons = await fetchJson('/api/missing-persons');
    if (missingPersons) next.missingPersons = missingPersons;
  }
  if (activeTab === 'admin' && role === 'PM') {
    const [units, sensors, staffList, aiDetections, disasterTypes] = await Promise.all([
      fetchJson('/api/units'),
      fetchJson('/api/sensors'),
      fetchJson('/api/staff'),
      fetchJson('/api/ai-detections'),
      fetchJson('/api/disaster-types'),
    ]);
    if (units) next.units = units;
    if (sensors) next.sensors = sensors;
    if (staffList) next.staffList = staffList;
    if (aiDetections) next.aiDetections = aiDetections;
    if (disasterTypes) next.disasterTypes = disasterTypes;
  }

  return { ...EMPTY_APP_DATA, ...next };
}
