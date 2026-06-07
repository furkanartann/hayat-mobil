/** SQLite datetime('now') UTC kaydeder; ekranda yerel saat göster */
export const parseDbUtcDate = (sqliteDatetime) => {
  if (!sqliteDatetime) return null;
  const s = String(sqliteDatetime).trim();
  const normalized = s.includes('T') ? (s.endsWith('Z') ? s : `${s}Z`) : `${s.replace(' ', 'T')}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDbTimeLocal = (sqliteDatetime) => {
  const d = parseDbUtcDate(sqliteDatetime);
  if (!d) return sqliteDatetime ? String(sqliteDatetime).split(' ')[1] || String(sqliteDatetime) : '';
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

export const formatDbDateTimeLocal = (sqliteDatetime) => {
  const d = parseDbUtcDate(sqliteDatetime);
  if (!d) return sqliteDatetime ? String(sqliteDatetime) : '';
  return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};
