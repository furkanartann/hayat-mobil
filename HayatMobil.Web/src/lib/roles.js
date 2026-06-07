export const getAvailableTabs = (userType) => {
  switch (userType) {
    case 'PM':
      return ['dashboard', 'map', 'tickets', 'inventory', 'missing', 'admin'];
    case 'Afetzede':
      return ['dashboard', 'map', 'tickets', 'missing'];
    case 'Doktor':
    case 'SaglikParamedik':
      return ['dashboard', 'map', 'tickets', 'missing'];
    case 'Lojistik':
      return ['dashboard', 'map', 'tickets', 'inventory', 'missing'];
    case 'AramaKurtarma':
      return ['dashboard', 'map', 'tickets', 'missing'];
    case 'Guvenlik':
      return ['dashboard', 'map', 'tickets', 'missing'];
    case 'Muhendis':
    case 'IT':
    default:
      return ['dashboard', 'map', 'missing'];
  }
};

export const formatRoleLabel = (roleCode, lang = 'TR') => {
  if (!roleCode) return '';
  const labels = {
    PM: { TR: 'PM', EN: 'PM' },
    Afetzede: { TR: 'Afetzede', EN: 'Civilian' },
    Doktor: { TR: 'Doktor', EN: 'Doctor' },
    SaglikParamedik: { TR: 'Paramedik', EN: 'Paramedic' },
    AramaKurtarma: { TR: 'Arama Kurtarma', EN: 'Search & Rescue' },
    Lojistik: { TR: 'Lojistik', EN: 'Logistics' },
    Guvenlik: { TR: 'Güvenlik', EN: 'Security' },
    Muhendis: { TR: 'Mühendis', EN: 'Engineer' },
    IT: { TR: 'IT', EN: 'IT' },
  };
  const entry = labels[roleCode];
  if (entry) return entry[lang === 'EN' ? 'EN' : 'TR'];
  return roleCode.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
};
