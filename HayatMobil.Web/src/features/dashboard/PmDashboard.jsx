import React from 'react';
import { AlertCircle, HeartPulse, Layers, Radio, ShieldAlert, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { formatRoleLabel } from '../../lib/roles.js';
import { formatStaffStatus } from '../../lib/statusLabels.js';
import { formatDbTimeLocal } from '../../lib/datetime.js';
import { formatAiDetectionLabel, formatAiSourceLabel, formatAiUnitLabel } from '../../lib/ai.js';
export default function PmDashboard() {
  const app = useApp();
  if (app.user.userType !== 'PM') return null;
  return (
    <>
                <div className="pm-stats-grid">
                  <div className="glass pm-stat-card">
                    <div className="pm-stat-card__head">
                      <span>{app.t('ÜNİTELER', 'FIELD HUBS')}</span>
                      <Layers style={{ width: '14px', height: '14px' }} />
                    </div>
                    <div className="pm-stat-card__value">
                      {app.stats.activeUnits + app.stats.emgUnits + app.stats.offUnits}
                    </div>
                    <div className="pm-stat-card__sub">
                      <span style={{ color: 'var(--emerald)' }}>{app.t('A:', 'Act:')}{app.stats.activeUnits}</span>
                      <span style={{ color: 'var(--rose)' }}>{app.t('E:', 'Emg:')}{app.stats.emgUnits}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{app.t('K:', 'Off:')}{app.stats.offUnits}</span>
                    </div>
                  </div>

                  <div className="glass pm-stat-card">
                    <div className="pm-stat-card__head">
                      <span>{app.t('TRİYAJ', 'TRIAGE')}</span>
                      <HeartPulse style={{ width: '14px', height: '14px' }} />
                    </div>
                    <div className="pm-stat-card__value">
                      {app.stats.openTicketsAll}
                    </div>
                    <div className="pm-stat-card__sub">
                      <span style={{ color: 'var(--rose)' }}>{app.t('K:', 'R:')}{app.stats.critTickets}</span>
                      <span style={{ color: 'var(--amber)' }}>{app.t('S:', 'Y:')}{app.stats.yellowTickets}</span>
                      <span style={{ color: 'var(--emerald)' }}>{app.t('Y:', 'G:')}{app.stats.greenTickets}</span>
                    </div>
                  </div>

                  <div className="glass pm-stat-card">
                    <div className="pm-stat-card__head">
                      <span>{app.t('VATANDAŞ', 'CIVILIANS')}</span>
                      <Users style={{ width: '14px', height: '14px' }} />
                    </div>
                    <div className="pm-stat-card__value">
                      {app.stats.safeUsers + app.stats.dangerUsers}
                    </div>
                    <div className="pm-stat-card__sub">
                      <span style={{ color: 'var(--emerald)' }}>{app.t('G:', 'S:')}{app.stats.safeUsers}</span>
                      <span style={{ color: 'var(--rose)' }}>{app.t('T:', 'D:')}{app.stats.dangerUsers}</span>
                    </div>
                  </div>

                  <div className="glass pm-stat-card">
                    <div className="pm-stat-card__head">
                      <span>{app.t('KAYIP', 'MISSING')}</span>
                      <AlertCircle style={{ width: '14px', height: '14px' }} />
                    </div>
                    <div className="pm-stat-card__value">
                      {app.stats.missingPpl}
                    </div>
                    <div className="pm-stat-card__sub pm-stat-card__sub--single">
                      {app.t('Arama sürüyor', 'Search active')}
                    </div>
                  </div>
                </div>

                {/* Live Operations Feed */}
                <div className="glass" style={{ borderRadius: '16px', padding: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
                    <Radio style={{ width: '16px', height: '16px', color: 'var(--primary)' }} />
                    {app.t('Canlı Operasyon Akışı', 'Live Operations Feed')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {app.alerts.length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{app.t('Sistem akışı boş.', 'No logs.')}</p>
                    ) : (
                      app.alerts.slice(0, 8).map((alert, idx) => (
                        <div key={idx} style={{ fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>
                            {formatDbTimeLocal(alert.createdAt)}
                          </span>
                          <span style={{ 
                            fontWeight: 'bold', 
                            marginRight: '6px', 
                            color: alert.severity === 'Critical' ? 'var(--rose)' : alert.severity === 'Warning' ? 'var(--amber)' : 'var(--primary)'
                          }}>
                            [{alert.title}]
                          </span>
                          <span style={{ color: 'var(--text-main)' }}>{alert.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Staff Status Desk */}
                <div className="glass" style={{ borderRadius: '16px', padding: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
                    <Users style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
                    {app.t('Aktif Saha Personeli Durumu', 'Field Staff Status Desk')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {app.staffList.length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{app.t('Kayıtlı personel yok.', 'No registered staff.')}</p>
                    ) : (
                      app.staffList.map((st) => {
                        const statusClass = st.currentStatus === 'Available' ? 'badge-green' : st.currentStatus === 'On_Duty' ? 'badge-yellow' : 'badge-grey';
                        return (
                          <div key={st.staffId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: '12px' }}>
                            <div>
                              <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{st.fullName}</span>
                              <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>({formatRoleLabel(st.userType || st.specialization, app.lang)})</span>
                            </div>
                            <span className={`badge ${statusClass}`} style={{ fontSize: '9px', padding: '1px 4px' }}>{formatStaffStatus(st.currentStatus, app.t)}</span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* AI Hazard Alerts */}
                <div className="glass" style={{ borderRadius: '16px', padding: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
                    <ShieldAlert style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
                    {app.t('Yapay Zeka Termal/Görüntü Analiz Alarmları', 'AI Image & Thermal Analysis Feed')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {app.aiDetections.length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{app.t('Kritik AI tespiti yok.', 'No critical AI detections.')}</p>
                    ) : (
                      app.aiDetections.map((det) => (
                        <div key={det.detectionId} style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--text-main)', gap: '8px' }}>
                            <span style={{ color: 'var(--rose)' }}>
                              {formatAiDetectionLabel(det.detectionType, app.t)} · {app.t('Güven', 'Confidence')}: %{(det.confidenceScore * 100).toFixed(0)}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '10px', flexShrink: 0 }}>{formatDbTimeLocal(det.detectedAt)}</span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.45 }}>
                            {app.t('Kaynak', 'Source')}: {formatAiSourceLabel(det.cameraId, app.t)} · {app.t('Ünite', 'Unit')}: <strong style={{ color: 'var(--text-main)' }}>{formatAiUnitLabel(det.unitId, app.units)}</strong>
                            {det.immobilePersonCount > 0 ? (
                              <> · {app.t('Hareketsiz kişi', 'Immobile')}: <strong style={{ color: 'var(--rose)' }}>{det.immobilePersonCount}</strong></>
                            ) : det.cameraId?.startsWith('SENSOR-') ? (
                              <> · <span style={{ color: 'var(--amber)' }}>{app.t('Sensör eşiği otomatik uyarısı', 'Automatic sensor threshold alert')}</span></>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
    </>
  );
}
