
﻿import React, { useEffect } from 'react';
import { Globe, Lock, UserCheck } from 'lucide-react';
import { HAYAT_MOBIL_LOGO, EDEVLET_LOGO } from '../../lib/constants.js';
import { openEdevletLoginWindow, EDEVLET_LOGIN_URL } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';

export default function AuthScreen() {
  const app = useApp();

  useEffect(() => {
    if (!app.showRegister) return;
    const container = document.querySelector('.login-container');
    container?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [app.showRegister]);

  return (
      <>
      <div className={`login-container${app.showRegister ? ' login-container--register' : ''}`}>
        <div className="login-card">
          <div className="login-body">
            <div className="login-top-row">
              <button
                type="button"
                onClick={() => app.setLang(app.lang === 'TR' ? 'EN' : 'TR')}
                className="btn btn-secondary login-lang-btn"
              >
                <Globe style={{ width: '14px', height: '14px' }} />
                <span lang={app.lang === 'TR' ? 'en' : 'tr'}>
                  {app.lang === 'TR' ? 'English' : 'Türkçe'}
                </span>
              </button>
            </div>

            <div className="login-header">
              <img
                src={HAYAT_MOBIL_LOGO}
                alt="Hayat Mobil"
                className="login-logo"
              />
              <h1 className="login-title">HAYAT-MOBİL</h1>
              <p className="login-subtitle">
                {app.t('Afet Yönetim ve Saha Koordinasyon Sistemi', 'Disaster Management & Field Coordination System')}
              </p>
            </div>

            {!app.showRegister ? (
              // Login Form
              <form onSubmit={app.handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>{app.t('TC Kimlik No', 'National ID No')}</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder={app.t('11 hane', '11 digits')}
                    value={app.loginForm.identityNo}
                    onChange={(e) => app.setLoginForm({ ...app.loginForm, identityNo: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px' }}>{app.t('Şifre', 'Password')}</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="••••"
                    value={app.loginForm.pin}
                    onChange={(e) => app.setLoginForm({ ...app.loginForm, pin: e.target.value })}
                    required
                  />
                </div>

                {/* Beni Hatırla & Şifremi Unuttum */}
                <div className="login-remember-row">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500', color: 'var(--text-muted)' }}>
                    <input 
                      type="checkbox" 
                      checked={app.rememberMe}
                      onChange={(e) => app.setRememberMe(e.target.checked)}
                      style={{ 
                        accentColor: 'var(--primary)', 
                        width: '16px', 
                        height: '16px',
                        cursor: 'pointer' 
                      }} 
                    />
                    {app.t('Beni Hatırla', 'Remember Me')}
                  </label>
                  <button 
                    type="button"
                    onClick={() => app.toast(app.t('Şifre sıfırlama talebi için lütfen sistem yöneticisiyle iletişime geçin.', 'Please contact the system administrator for password reset.'), 'info')}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', fontSize: '14px', cursor: 'pointer', padding: 0 }}
                  >
                    {app.t('Şifremi Unuttum?', 'Forgot Password?')}
                  </button>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                  <Lock style={{ width: '16px', height: '16px' }} />
                  {app.t('Giriş Yap', 'Sign In')}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0 4px', color: 'var(--text-muted)' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                  <span style={{ padding: '0 10px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {app.t('veya', 'or')}
                  </span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
                </div>

                <button
                  type="button"
                  className="btn-edevlet"
                  onClick={() => {
                    if (!openEdevletLoginWindow()) {
                      app.setShowEdevletModal(true);
                    }
                  }}
                >
                  <img src={EDEVLET_LOGO} alt="e-Devlet" />
                  {app.t('e-Devlet ile Giriş Yap', 'Sign in with e-Devlet')}
                </button>
                <p className="edevlet-hint">
                  {app.t(
                    'Resmi e-Devlet giriş sayfası ayrı pencerede açılır (devlet güvenlik politikası).',
                    'The official e-Devlet sign-in page opens in a separate window (government security policy).'
                  )}
                </p>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <button 
                    type="button" 
                    onClick={() => app.setShowRegister(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                  >
                    {app.t('Yeni Hesap Oluştur', 'Create New Account')}
                  </button>
                </div>
              </form>
            ) : (
              // Register Form
              <form onSubmit={app.handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Ad Soyad', 'Full Name')}</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={app.regForm.fullName}
                    onChange={(e) => app.setRegForm({ ...app.regForm, fullName: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('TC Kimlik No', 'National ID No')}</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={app.regForm.identityNo}
                    onChange={(e) => app.setRegForm({ ...app.regForm, identityNo: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Telefon', 'Phone')}</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder={app.t('5xx...', '5xx...')}
                    value={app.regForm.phone}
                    onChange={(e) => app.setRegForm({ ...app.regForm, phone: e.target.value })}
                    required
                  />
                </div>

                {app.needsPmBootstrap && (
                  <div className="glass" style={{ padding: '12px', borderRadius: '12px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--primary)' }}>{app.t('İlk Kurulum', 'Initial Setup')}</strong>
                    <p style={{ marginTop: '6px' }}>
                      {app.t('Sistemde henüz komuta merkezi yok. Bu kayıt Kriz Komuta Merkezi (PM) hesabını oluşturur.', 'No command center exists yet. This registration creates the Crisis Command Center (PM) account.')}
                    </p>
                  </div>
                )}

                <div className="login-pw-row">
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Şifre', 'Password')}</label>
                    <input 
                      type="password" 
                      className="form-input"
                      value={app.regForm.pin}
                      onChange={(e) => app.setRegForm({ ...app.regForm, pin: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Şifre Tekrar', 'Confirm Password')}</label>
                    <input 
                      type="password" 
                      className="form-input"
                      value={app.regForm.pinConfirm}
                      onChange={(e) => app.setRegForm({ ...app.regForm, pinConfirm: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                  <UserCheck style={{ width: '16px', height: '16px' }} />
                  {app.t('Kayıt Ol', 'Register')}
                </button>

                {!app.needsPmBootstrap && (
                  <aside className="register-staff-hint" aria-label={app.t('Personel kayıt bilgisi', 'Staff registration info')}>
                    <img
                      src={HAYAT_MOBIL_LOGO}
                      alt=""
                      className="register-staff-hint__logo"
                      aria-hidden="true"
                    />
                    <div className="register-staff-hint__body">
                      <p className="register-staff-hint__title">
                        {app.t('Personel misiniz?', 'Are you field staff?')}
                      </p>
                      <p className="register-staff-hint__text">
                        {app.t(
                          'Doktor, paramedik, arama kurtarma ve diğer saha görevlileri önce buradan afetzede olarak kayıt olur. Giriş yaptıktan sonra ana paneldeki «Personel Başvurusu» formunu doldurun; Kriz Komuta Merkezi onayından sonra personel paneliniz açılır.',
                          'Doctors, paramedics, search & rescue, and other field staff first register here as affected persons. After signing in, complete the «Staff Application» form on your dashboard; your staff panel opens once the Crisis Command Center approves it.'
                        )}
                      </p>
                      <ul className="register-staff-hint__steps">
                        <li>{app.t('Kayıt ol ve giriş yap', 'Register and sign in')}</li>
                        <li>{app.t('Panel → Personel Başvurusu', 'Dashboard → Staff Application')}</li>
                        <li>{app.t('Onay sonrası oturumu yenile', 'Refresh session after approval')}</li>
                      </ul>
                    </div>
                  </aside>
                )}

                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                  <button 
                    type="button" 
                    onClick={() => app.setShowRegister(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                  >
                    {app.t('Giriş Ekranına Dön', 'Back to Sign In')}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>

        {app.showEdevletModal && (
          <div className="edevlet-modal-overlay" onClick={() => app.setShowEdevletModal(false)}>
            <div className="edevlet-fallback-card" onClick={(e) => e.stopPropagation()}>
              <img src={EDEVLET_LOGO} alt="e-Devlet" className="edevlet-fallback-logo" />
              <h3>{app.t('e-Devlet Kapısı', 'e-Devlet Portal')}</h3>
              <p>
                {app.t(
                  'e-Devlet, güvenlik nedeniyle başka sitelerin içine (iframe) gömülmeye izin vermez. Resmi giriş sayfasını yeni pencerede açın.',
                  'e-Devlet does not allow embedding in other sites (iframe) for security. Open the official sign-in page in a new window.'
                )}
              </p>
              <div className="edevlet-fallback-actions">
                <button
                  type="button"
                  className="btn-edevlet"
                  onClick={() => {
                    if (openEdevletLoginWindow()) app.setShowEdevletModal(false);
                  }}
                >
                  <img src={EDEVLET_LOGO} alt="" />
                  {app.t('Resmi Giriş Sayfasını Aç', 'Open Official Sign-In Page')}
                </button>
                <a
                  href={EDEVLET_LOGIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="edevlet-fallback-link"
                >
                  {app.t('veya yeni sekmede aç', 'or open in a new tab')}
                </a>
              </div>
              <button type="button" className="edevlet-fallback-close" onClick={() => app.setShowEdevletModal(false)}>
                {app.t('Kapat', 'Close')}
              </button>
            </div>
          </div>
        )}
      </div>
      </>
  );
}
