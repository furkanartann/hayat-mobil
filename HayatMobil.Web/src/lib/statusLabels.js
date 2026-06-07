/** API durum kodlarını arayüz diline çevirir. */

export function formatTriageLabel(color, t = (tr) => tr) {
  const labels = {
    Red: t('Kırmızı · Acil', 'Red · Immediate'),
    Yellow: t('Sarı · Gecikmeli', 'Yellow · Delayed'),
    Green: t('Yeşil · Hafif', 'Green · Minor'),
    Black: t('Siyah · Beklenti', 'Black · Expectant'),
  };
  return labels[color] ?? color;
}

export function formatTriageShort(color, t = (tr) => tr) {
  const labels = {
    Red: t('Kırmızı', 'Red'),
    Yellow: t('Sarı', 'Yellow'),
    Green: t('Yeşil', 'Green'),
    Black: t('Siyah', 'Black'),
  };
  return labels[color] ?? color;
}

export function formatTicketStatus(status, t = (tr) => tr) {
  const labels = {
    Open: t('Açık', 'Open'),
    In_Progress: t('Devam ediyor', 'In progress'),
    Resolved: t('Çözüldü', 'Resolved'),
    Cancelled: t('İptal', 'Cancelled'),
  };
  return labels[status] ?? status;
}

export function formatRequestType(type, t = (tr) => tr) {
  const labels = {
    Medical: t('Tıbbi', 'Medical'),
    Rescue: t('Kurtarma', 'Rescue'),
    Security: t('Güvenlik', 'Security'),
    Food: t('Gıda', 'Food'),
    Water: t('Su', 'Water'),
    Structural: t('Yapısal', 'Structural'),
  };
  return labels[type] ?? type;
}

export function formatMissingStatus(status, t = (tr) => tr) {
  const labels = {
    Missing: t('Kayıp', 'Missing'),
    Found: t('Bulundu', 'Found'),
    Deceased: t('Vefat', 'Deceased'),
  };
  return labels[status] ?? status;
}

export function formatApplicationStatus(status, t = (tr) => tr) {
  const labels = {
    Pending: t('Beklemede', 'Pending'),
    Approved: t('Onaylandı', 'Approved'),
    Rejected: t('Reddedildi', 'Rejected'),
  };
  return labels[status] ?? status;
}

export function formatStaffStatus(status, t = (tr) => tr) {
  const labels = {
    Available: t('Müsait', 'Available'),
    On_Duty: t('Görevde', 'On duty'),
    Resting: t('Dinleniyor', 'Resting'),
    Offline: t('Çevrimdışı', 'Offline'),
  };
  return labels[status] ?? status;
}

export function formatUnitStatus(status, t = (tr) => tr) {
  const labels = {
    Active: t('Aktif', 'Active'),
    Emergency: t('Acil', 'Emergency'),
    Offline: t('Çevrimdışı', 'Offline'),
    Maintenance: t('Bakımda', 'Maintenance'),
    Inactive: t('Pasif', 'Inactive'),
  };
  return labels[status] ?? status;
}

export function formatSensorStatus(status, t = (tr) => tr) {
  const labels = {
    Online: t('Çevrimiçi', 'Online'),
    Offline: t('Çevrimdışı', 'Offline'),
    Faulty: t('Arızalı', 'Faulty'),
    Error: t('Hata', 'Error'),
    Warning: t('Uyarı', 'Warning'),
    Normal: t('Normal', 'Normal'),
  };
  return labels[status] ?? status;
}
