import { useState, useEffect } from 'react';
import {
  apiFetch, beginLogout, endLogout, clearAuthSession, normalizeAuthError, API_BASE,
} from '../../../api/client.js';
import { clearMapSession } from '../../../lib/mapPersistence.js';
import { getAvailableTabs } from '../../../lib/roles.js';

export function useAuth({
  t, networkErrorMsg, readApiError, toast,
  activeTab, setActiveTab, invalidateAppData,
}) {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('hayat_token');
    const saved = localStorage.getItem('hayat_user');
    if (!token || !saved) {
      clearAuthSession();
      return null;
    }
    try {
      return JSON.parse(saved);
    } catch {
      clearAuthSession();
      return null;
    }
  });
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('hayat_remember_me') === 'true');
  const [loginForm, setLoginForm] = useState(() => {
    const remembered = localStorage.getItem('hayat_remembered_identity') || '';
    return { identityNo: remembered, pin: '' };
  });
  const [regForm, setRegForm] = useState({ fullName: '', identityNo: '', phone: '', pin: '', pinConfirm: '' });
  const [needsPmBootstrap, setNeedsPmBootstrap] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showEdevletModal, setShowEdevletModal] = useState(false);
  const [staffAppForm, setStaffAppForm] = useState({
    requestedRole: 'Doktor',
    institution: '',
    credentialNote: '',
    applicationNote: ''
  });

  useEffect(() => {
    if (user) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/setup-status`);
        if (res.ok) {
          const data = await res.json();
          setNeedsPmBootstrap(!!data.needsPmBootstrap);
        }
      } catch (err) {
        console.error('Setup status failed', err);
      }
    })();
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem('hayat_token');
    if (!token) return;
    (async () => {
      try {
        const res = await apiFetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          localStorage.setItem('hayat_user', JSON.stringify(data));
        }
      } catch (err) {
        console.error('Session restore failed', err);
      }
    })();
  }, []);

  useEffect(() => {
    if (user) {
      const allowed = getAvailableTabs(user.userType);
      if (!allowed.includes(activeTab)) {
        setActiveTab(allowed[0] || 'dashboard');
      }
    }
  }, [user, activeTab, setActiveTab]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) localStorage.setItem('hayat_token', data.token);
        const { token, expiresAt, ...userData } = data;
        setUser(userData);
        localStorage.setItem('hayat_user', JSON.stringify(userData));
        if (rememberMe) {
          localStorage.setItem('hayat_remember_me', 'true');
          localStorage.setItem('hayat_remembered_identity', loginForm.identityNo);
        } else {
          localStorage.removeItem('hayat_remember_me');
          localStorage.removeItem('hayat_remembered_identity');
        }
        setLoginForm({ identityNo: rememberMe ? loginForm.identityNo : '', pin: '' });
        toast(t(`Hoş geldiniz, ${userData.fullName}!`, `Welcome, ${userData.fullName}!`), 'success');
        invalidateAppData?.();
      } else {
        toast(normalizeAuthError(data.error) || t('Giriş başarısız.', 'Sign in failed.'), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (regForm.pin !== regForm.pinConfirm) {
      toast(t('Şifreler uyuşmuyor.', 'Passwords do not match.'), 'error');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regForm.fullName,
          identityNo: regForm.identityNo,
          phone: regForm.phone,
          pin: regForm.pin
        })
      });
      const data = await res.json();
      if (res.ok) {
        const msg = data.userType === 'PM'
          ? t('Kriz Komuta Merkezi (PM) kurulumu tamamlandı. Giriş yapabilirsiniz.', 'Crisis command center (PM) setup complete. You can sign in.')
          : t('Vatandaş kaydı tamamlandı. Giriş yapabilirsiniz.', 'Civilian registration complete. You can sign in.');
        toast(msg, 'success');
        setRegForm({ fullName: '', identityNo: '', phone: '', pin: '', pinConfirm: '' });
        setShowRegister(false);
        setNeedsPmBootstrap(false);
      } else {
        toast(normalizeAuthError(data.error) || t('Kayıt başarısız.', 'Registration failed.'), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const refreshSession = async () => {
    try {
      const res = await apiFetch('/api/auth/refresh-session', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        if (data.token) localStorage.setItem('hayat_token', data.token);
        const { token, expiresAt, ...userData } = data;
        setUser(userData);
        localStorage.setItem('hayat_user', JSON.stringify(userData));
        toast(t('Oturum yenilendi. Personel paneliniz aktif.', 'Session refreshed. Staff panel is now active.'), 'success');
        invalidateAppData?.();
      } else {
        toast(normalizeAuthError(data.error) || t('Oturum yenilenemedi.', 'Could not refresh session.'), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const handleSubmitStaffApplication = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/staff-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffAppForm)
      });
      const data = await res.json();
      if (res.ok) {
        toast(t('Personel başvurunuz alındı. PM onayı bekleniyor.', 'Staff application submitted. Awaiting PM approval.'), 'success');
        setStaffAppForm({ requestedRole: 'Doktor', institution: '', credentialNote: '', applicationNote: '' });
        invalidateAppData?.();
      } else {
        toast(normalizeAuthError(data.error) || t('Başvuru gönderilemedi.', 'Could not submit application.'), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const handleReviewStaffApplication = async (applicationId, action) => {
    const reviewNote = action === 'reject'
      ? prompt(t('Red sebebi (opsiyonel):', 'Rejection reason (optional):')) || ''
      : '';
    try {
      const res = await apiFetch(`/api/staff-applications/${applicationId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewNote })
      });
      const data = await res.json();
      if (res.ok) {
        invalidateAppData?.();
        toast(action === 'approve'
          ? t('Başvuru onaylandı. Kullanıcı oturumunu yenilemeli.', 'Application approved. User must refresh session.')
          : t('Başvuru reddedildi.', 'Application rejected.'), action === 'approve' ? 'success' : 'warning');
      } else {
        toast(normalizeAuthError(data.error) || t('İşlem başarısız.', 'Operation failed.'), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const handleLogout = () => {
    beginLogout();
    toast(t('Çıkış yapıldı.', 'Signed out successfully.'), 'success');
    const userId = user?.userId;
    if (userId) clearMapSession(userId);
    setUser(null);
    clearAuthSession();
    setActiveTab('dashboard');
    const remembered = localStorage.getItem('hayat_remembered_identity') || '';
    setLoginForm({ identityNo: remembered, pin: '' });
    endLogout();
  };

  const updateSafetyStatus = async (status) => {
    try {
      const res = await apiFetch(`/api/users/${user.userId}/safety`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ safetyStatus: status, note: t('Web arayüzünden güncellendi.', 'Updated via web UI.') })
      });
      if (res.ok) {
        setUser({ ...user, safetyStatus: status });
        const saved = JSON.parse(localStorage.getItem('hayat_user'));
        localStorage.setItem('hayat_user', JSON.stringify({ ...saved, safetyStatus: status }));
        toast(
          status === 'Safe'
            ? t('Güvende olduğunuz kaydedildi.', 'Marked as safe.')
            : t('Yardım talebi için yönlendiriliyorsunuz.', 'Redirecting to help request.'),
          status === 'Safe' ? 'success' : 'warning'
        );
      } else {
        toast(await readApiError(res), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  return {
    user, setUser,
    rememberMe, setRememberMe, loginForm, setLoginForm, regForm, setRegForm,
    needsPmBootstrap, showRegister, setShowRegister, showEdevletModal, setShowEdevletModal,
    staffAppForm, setStaffAppForm,
    handleLogin, handleRegister, refreshSession,
    handleSubmitStaffApplication, handleReviewStaffApplication, handleLogout, updateSafetyStatus,
  };
}
