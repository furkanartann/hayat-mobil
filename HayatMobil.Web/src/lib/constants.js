import { LayoutDashboard, AlertCircle, Map, Package, Users, Settings } from 'lucide-react';

export const HAYAT_MOBIL_LOGO = '/hayat-mobil-logo.png';
export const EDEVLET_LOGO = '/edevlet-logo.png';
export const LOCATION_PROMPT_KEY = 'hayat_location_prompt';

export const dutyTypeOptions = [
  { value: 'Unit', labelTR: 'Ünite kontrolü', labelEN: 'Unit inspection', hintTR: 'Saha iletişim ünitesi seçin', hintEN: 'Select a field hub' },
  { value: 'Sensor', labelTR: 'Sensör müdahalesi', labelEN: 'Sensor maintenance', hintTR: 'Arızalı veya kontrol edilecek sensörü seçin', hintEN: 'Select the sensor to service' },
  { value: 'Missing', labelTR: 'Kayıp arama', labelEN: 'Missing person search', hintTR: 'Aktif kayıp ilanını seçin', hintEN: 'Select an active missing report' },
];

export const detectionTypeOptions = [
  { value: 'Fire', labelTR: 'Yangın', labelEN: 'Fire' },
  { value: 'Smoke', labelTR: 'Duman', labelEN: 'Smoke' },
  { value: 'Human_Trapped', labelTR: 'Enkaz altında insan', labelEN: 'Person trapped' },
  { value: 'Structural_Damage', labelTR: 'Yapı hasarı', labelEN: 'Structural damage' },
];

export const tabMeta = {
  dashboard: { labelTR: 'Panel', labelEN: 'Dashboard', icon: LayoutDashboard },
  tickets: { labelTR: 'SOS', labelEN: 'SOS', icon: AlertCircle },
  map: { labelTR: 'Harita', labelEN: 'Map', icon: Map },
  inventory: { labelTR: 'Lojistik', labelEN: 'Logistics', icon: Package },
  missing: { labelTR: 'Kayıp', labelEN: 'Missing', icon: Users },
  admin: { labelTR: 'Araçlar', labelEN: 'Tools', icon: Settings },
};
