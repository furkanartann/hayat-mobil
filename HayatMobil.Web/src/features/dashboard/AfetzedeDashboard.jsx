import React from 'react';
import { AlertCircle, CheckCircle, ClipboardList, Droplets, MapPin, Radio, ShieldAlert, Wind, Zap } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { formatRoleLabel } from '../../lib/roles.js';
import { formatDbDateTimeLocal, formatDbTimeLocal } from '../../lib/datetime.js';
import { airQualityTone, formatAirQualityLabel } from '../../lib/telemetry.js';
import CollapsibleCard from '../../components/CollapsibleCard.jsx';

export default function AfetzedeDashboard() {
  const app = useApp();
  if (app.user.userType !== 'Afetzede') return null;

  const tel = app.telemetry;
  const showHumidity = (tel?.sensorOnline?.nem ?? 0) > 0 || (tel?.waterLevel ?? 0) > 0;
  const showEnergy = (tel?.sensorOnline?.enerji ?? 0) > 0 || (tel?.energyLevel ?? 0) > 0
    || (app.sensors ?? []).some((s) => s.sensorType === 'Enerji' && s.status === 'Online');
  const showAir = (tel?.sensorOnline?.duman ?? 0) > 0 || (tel?.sensorOnline?.gaz ?? 0) > 0;

  return (
    <>
      <div className="safety-actions-row">
        <button
          onClick={() => app.updateSafetyStatus('Safe')}
          className="btn btn-success safety-action-btn"
        >
          <CheckCircle className="safety-action-btn__icon" />
          <span className="safety-action-btn__label">{app.t('GÜVENDEYİM', 'I AM SAFE')}</span>
        </button>
        <button
          onClick={() => {
            app.updateSafetyStatus('In_Danger');
            app.setNewTicket({ requestType: 'Rescue', updateNote: '' });
            app.setSosFormKey((k) => k + 1);
            app.setActiveTab('tickets');
          }}
          className="btn btn-danger safety-action-btn"
        >
          <ShieldAlert className="safety-action-btn__icon" />
          <span className="safety-action-btn__label">{app.t('ACİL YARDIM İSTE', 'REQUEST EMERGENCY HELP')}</span>
        </button>
      </div>

      {(app.mapLayers?.assemblyPoints?.length ?? 0) > 0 && (
        <button
          type="button"
          className="btn btn-secondary"
          style={{ width: '100%', marginBottom: '12px' }}
          onClick={() => {
            app.navigateToNearestAssembly(app.mapLayers?.assemblyPoints, app.userLocation);
            app.setActiveTab('map');
          }}
        >
          <MapPin style={{ width: '16px', height: '16px' }} />
          {app.t('En yakın toplanma alanına git', 'Go to nearest assembly point')}
        </button>
      )}

      <div className="glass" style={{ borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
          <AlertCircle style={{ width: '16px', height: '16px', color: 'var(--primary)' }} />
          {app.t('Güncel Duyurular', 'Current Announcements')}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
          {app.alerts.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{app.t('Aktif duyuru yok.', 'No active announcements.')}</p>
          ) : (
            app.alerts.slice(0, 5).map((a, idx) => (
              <div key={idx} style={{ fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>
                  {formatDbTimeLocal(a.createdAt) || formatDbDateTimeLocal(a.createdAt)}
                </span>
                <span style={{
                  fontWeight: 'bold',
                  marginRight: '6px',
                  color: a.severity === 'Critical' ? 'var(--rose)' : a.severity === 'Warning' ? 'var(--amber)' : 'var(--primary)',
                }}>
                  [{a.title}]
                </span>
                <span style={{ color: 'var(--text-main)' }}>{a.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {app.hasFieldTelemetry && tel && (
        <div className="glass" style={{ borderRadius: '16px', padding: '16px', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
            <Radio style={{ width: '16px', height: '16px', color: 'var(--primary)' }} />
            {app.t('Saha Telemetrisi', 'Field Telemetry')}
          </h3>
          <div className="pm-stats-grid">
            {showHumidity && (
              <div className="glass pm-stat-card">
                <div className="pm-stat-card__head">
                  <span>{app.t('ORTAM NEMİ', 'HUMIDITY')}</span>
                  <Droplets style={{ width: '14px', height: '14px' }} />
                </div>
                <div className="pm-stat-card__value">
                  {tel.waterLevel > 0 ? `%${tel.waterLevel}` : '—'}
                </div>
                <div className="pm-stat-card__sub pm-stat-card__sub--single" style={{ color: 'var(--text-muted)' }}>
                  {tel.sensorOnline?.nem > 0
                    ? app.t(`${tel.sensorOnline.nem} nem sensörü`, `${tel.sensorOnline.nem} humidity sensor(s)`)
                    : app.t('Veri bekleniyor', 'Awaiting data')}
                </div>
              </div>
            )}
            {showEnergy && (
              <div className="glass pm-stat-card">
                <div className="pm-stat-card__head">
                  <span>{app.t('SAHA ENERJİSİ', 'FIELD ENERGY')}</span>
                  <Zap style={{ width: '14px', height: '14px' }} />
                </div>
                <div className="pm-stat-card__value">
                  {tel.energyLevel > 0 ? `%${tel.energyLevel}` : '—'}
                </div>
                <div className="pm-stat-card__sub pm-stat-card__sub--single" style={{ color: 'var(--text-muted)' }}>
                  {(tel.sensorOnline?.enerji ?? 0) > 0
                    ? app.t('Enerji sensörü', 'Energy sensor')
                    : app.t('Ünite bataryası', 'Unit battery')}
                </div>
              </div>
            )}
            {showAir && (
              <div className="glass pm-stat-card">
                <div className="pm-stat-card__head">
                  <span>{app.t('HAVA KALİTESİ', 'AIR QUALITY')}</span>
                  <Wind style={{ width: '14px', height: '14px' }} />
                </div>
                <div className="pm-stat-card__value" style={{ color: airQualityTone(tel.airQuality), fontSize: '18px' }}>
                  {formatAirQualityLabel(tel.airQuality, app.t)}
                </div>
                <div className="pm-stat-card__sub pm-stat-card__sub--single" style={{ color: 'var(--text-muted)' }}>
                  {app.t('Duman / gaz sensörü', 'Smoke / gas sensors')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <CollapsibleCard
        title={app.t('Personel Başvurusu', 'Staff Application')}
        icon={ClipboardList}
        defaultOpen={app.myStaffApplication?.status === 'Approved' || app.myStaffApplication?.status === 'Pending'}
      >
        {app.myStaffApplication?.status === 'Approved' && (
          <div className="glass" style={{ padding: '12px', borderRadius: '12px', marginBottom: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <p style={{ fontSize: '13px', color: 'var(--emerald)', marginBottom: '10px' }}>
              {app.t('Başvurunuz onaylandı!', 'Your application was approved!')} ({formatRoleLabel(app.myStaffApplication.requestedRole, app.lang)})
            </p>
            <button type="button" className="btn btn-primary" onClick={app.refreshSession}>
              {app.t('Oturumu Yenile (Personel Paneli)', 'Refresh Session (Staff Panel)')}
            </button>
          </div>
        )}
        {app.myStaffApplication?.status === 'Pending' && (
          <div className="glass" style={{ padding: '12px', borderRadius: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            <p><strong>{app.t('Durum:', 'Status:')}</strong> {app.t('Beklemede', 'Pending')}</p>
            <p><strong>{app.t('Talep edilen rol:', 'Requested role:')}</strong> {formatRoleLabel(app.myStaffApplication.requestedRole, app.lang)}</p>
            <p><strong>{app.t('Kurum:', 'Institution:')}</strong> {app.myStaffApplication.institution}</p>
          </div>
        )}
        {app.myStaffApplication?.status === 'Rejected' && (
          <div className="glass" style={{ padding: '12px', borderRadius: '12px', marginBottom: '12px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <p style={{ fontSize: '13px', color: 'var(--rose)' }}>
              {app.t('Son başvurunuz reddedildi.', 'Your last application was rejected.')}
              {app.myStaffApplication.reviewNote ? ` — ${app.myStaffApplication.reviewNote}` : ''}
            </p>
          </div>
        )}
        {(!app.myStaffApplication || app.myStaffApplication.status === 'Rejected') && (
          <form onSubmit={app.handleSubmitStaffApplication} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {app.t('Saha personeli olmak için bilgilerinizi doldurun. PM onayından sonra rolünüz aktif olur.', 'Fill in your details to apply for field staff. Your role activates after PM approval.')}
            </p>
            <select className="form-input" value={app.staffAppForm.requestedRole} onChange={(e) => app.setStaffAppForm({ ...app.staffAppForm, requestedRole: e.target.value })} required>
              <option value="Doktor">{app.t('Doktor', 'Doctor')}</option>
              <option value="SaglikParamedik">{app.t('Paramedik', 'Paramedic')}</option>
              <option value="AramaKurtarma">{app.t('Arama Kurtarma', 'Search & Rescue')}</option>
              <option value="Muhendis">{app.t('Mühendis', 'Engineer')}</option>
              <option value="Lojistik">{app.t('Lojistik', 'Logistics')}</option>
              <option value="Guvenlik">{app.t('Güvenlik', 'Security')}</option>
              <option value="IT">IT</option>
            </select>
            <input className="form-input" placeholder={app.t('Kurum / Birim (zorunlu)', 'Institution / Unit (required)')} value={app.staffAppForm.institution} onChange={(e) => app.setStaffAppForm({ ...app.staffAppForm, institution: e.target.value })} required />
            <input className="form-input" placeholder={app.t('Sicil / Diploma No (opsiyonel)', 'Registry / Diploma No (optional)')} value={app.staffAppForm.credentialNote} onChange={(e) => app.setStaffAppForm({ ...app.staffAppForm, credentialNote: e.target.value })} />
            <textarea className="form-input" rows={3} placeholder={app.t('Başvuru notu', 'Application note')} value={app.staffAppForm.applicationNote} onChange={(e) => app.setStaffAppForm({ ...app.staffAppForm, applicationNote: e.target.value })} />
            <button type="submit" className="btn btn-primary">{app.t('Başvuruyu Gönder', 'Submit Application')}</button>
          </form>
        )}
      </CollapsibleCard>
    </>
  );
}
