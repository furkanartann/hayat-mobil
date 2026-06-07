export const API_BASE = window.location.origin.includes('localhost:5173')
  ? 'http://localhost:5000'
  : window.location.origin;

export const EDEVLET_LOGIN_URL = 'https://giris.turkiye.gov.tr/Giris/gir';

let logoutInProgress = false;

export const beginLogout = () => {
  logoutInProgress = true;
};

export const endLogout = () => {
  logoutInProgress = false;
};

export const hasAuthSession = () => !!localStorage.getItem('hayat_token');

export const clearAuthSession = () => {
  localStorage.removeItem('hayat_token');
  localStorage.removeItem('hayat_user');
};

export const normalizeAuthError = (message) => {
  if (!message || typeof message !== 'string') return message;
  return message
    .replace(/PIN\s*kodu/gi, 'Şifre')
    .replace(/PIN\s*kodları/gi, 'Şifreler')
    .replace(/\bPIN\b/gi, 'Şifre')
    .replace(/\bpin\b/g, 'şifre');
};

export const openEdevletLoginWindow = () => {
  const width = 1100;
  const height = 780;
  const left = Math.max(0, Math.round((window.screen.width - width) / 2));
  const top = Math.max(0, Math.round((window.screen.height - height) / 2));
  const features = `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`;
  let popup = window.open(EDEVLET_LOGIN_URL, 'eDevletGiris', features);
  if (popup) {
    popup.focus();
    return true;
  }
  popup = window.open(EDEVLET_LOGIN_URL, '_blank', 'noopener,noreferrer');
  if (popup) {
    popup.focus();
    return true;
  }
  return false;
};

export const apiFetch = async (path, options = {}) => {
  const token = localStorage.getItem('hayat_token');
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    const shouldReload = !!token && !logoutInProgress;
    clearAuthSession();
    if (shouldReload) window.location.reload();
  }
  return res;
};

export const readJsonSafe = async (res) => {
  const text = await res.text();
  if (!text || !text.trim()) return null;
  return JSON.parse(text);
};
