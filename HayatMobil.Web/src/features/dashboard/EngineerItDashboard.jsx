import React from 'react';
import { Layers, Radio } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import ActiveDutyBanner from '../../components/dashboard/ActiveDutyBanner.jsx';
import { formatUnitStatus, formatSensorStatus } from '../../lib/statusLabels.js';
export default function EngineerItDashboard() {
  const app = useApp();
  if (app.user.userType !== 'Muhendis' && app.user.userType !== 'IT') return null;
  return (
    <>
                {app.sensors.some((s) => s.status === 'Error' || s.status === 'Offline') && (
                  <div className="glass" style={{ borderLeft: '4px solid var(--rose)', borderRadius: '12px', padding: '12px 14px', background: 'rgba(239, 68, 68, 0.05)', marginBottom: '16px', fontSize: '12px', color: 'var(--text-main)' }}>
                    <strong style={{ color: 'var(--rose)' }}>{app.t('Sistem uyarısı:', 'System alert:')}</strong>{' '}
                    {app.t(
                      `${app.sensors.filter((s) => s.status === 'Error' || s.status === 'Offline').length} sensör arızalı veya çevrimdışı.`,
                      `${app.sensors.filter((s) => s.status === 'Error' || s.status === 'Offline').length} sensor(s) faulty or offline.`
                    )}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div className="glass" style={{ padding: '12px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      {app.user.userType === 'IT' ? app.t('AKTİF DÜĞÜM', 'ACTIVE NODES') : app.t('AKTİF ÜNİTE', 'ACTIVE UNITS')}
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--emerald)' }}>{app.units.filter((u) => u.status === 'Active').length}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{app.t('Toplam', 'Total')}: {app.units.length}</div>
                  </div>
                  <div className="glass" style={{ padding: '12px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{app.t('ACİL ÜNİTE', 'EMERGENCY')}</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--rose)' }}>{app.units.filter((u) => u.status === 'Emergency').length}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{app.t('Bakım/Kapalı', 'Maint/Off')}: {app.units.filter((u) => u.status !== 'Active' && u.status !== 'Emergency').length}</div>
                  </div>
                  <div className="glass" style={{ padding: '12px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      {app.user.userType === 'IT' ? app.t('TELEMETRİ', 'TELEMETRY') : app.t('SENSÖR', 'SENSORS')}
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)' }}>{app.sensors.length}</div>
                    <div style={{ fontSize: '10px', color: app.sensors.some((s) => s.status === 'Error' || s.status === 'Offline') ? 'var(--rose)' : 'var(--text-muted)' }}>
                      {app.t('Arızalı', 'Faulty')}: {app.sensors.filter((s) => s.status === 'Error' || s.status === 'Offline').length}
                    </div>
                  </div>
                </div>

                {app.user.staffId && app.myActiveDuty && (
                  <ActiveDutyBanner
                    duty={app.myActiveDuty}
                    eta={app.dutyRouteEta}
                    etaLoading={app.dutyRouteLoading}
                    onComplete={app.handleCompleteActiveDuty}
                    t={app.t}
                  />
                )}

                <div className="glass" style={{ borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
                    <Layers style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
                    {app.user.userType === 'IT'
                      ? app.t('Saha İletişim Düğümleri (LoRa/Cellular)', 'Field Communication Nodes (LoRa/Cellular)')
                      : app.t('Aktif Saha İletişim Düğümleri', 'Active Field Communication Nodes')}
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    {app.user.userType === 'IT'
                      ? app.t('Ağ ve iletişim altyapısı — salt okunur izleme.', 'Network & comm infrastructure — read-only monitoring.')
                      : app.t('Altyapı durumu — salt okunur izleme.', 'Infrastructure status — read-only monitoring.')}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {app.units.length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>{app.t('Kayıtlı saha ünitesi yok.', 'No field units registered.')}</p>
                    ) : (
                      app.units.map((u) => {
                        const statusClass = u.status === 'Active' ? 'badge-green' : u.status === 'Emergency' ? 'badge-red' : 'badge-grey';
                        return (
                          <div key={u.unitId} style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>U{u.unitId} - {u.serialNumber}</span>
                              <span className={`badge ${statusClass}`} style={{ fontSize: '8px', padding: '1px 3px' }}>{formatUnitStatus(u.status, app.t)}</span>
                            </div>
                            <div style={{ color: 'var(--text-muted)' }}>
                              Batt: {u.batteryLevel}% | Solar: {u.solarProduction}W
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>
                              Lat/Long: {u.latitude.toFixed(4)}, {u.longitude.toFixed(4)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="glass" style={{ borderRadius: '16px', padding: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
                    <Radio style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
                    {app.user.userType === 'IT'
                      ? app.t('Telemetri & Ağ Sağlığı', 'Telemetry & Network Health')
                      : app.t('Saha Telemetri Sensör Dizini', 'Field Sensing Array & Telemetry')}
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    {app.user.userType === 'IT'
                      ? app.t('Sistem izleme — sensör kaydı PM tarafından yapılır.', 'Systems monitoring — sensor entry is PM-only.')
                      : app.t('Altyapı izleme — sensör girişi PM tarafından yapılır.', 'Infrastructure monitoring — sensor entry is PM-only.')}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {app.sensors.length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{app.t('Aktif sensör kaydı yok.', 'No active sensor readings.')}</p>
                    ) : (
                      app.sensors.map((s) => {
                        const isFaulty = s.status === 'Error' || s.status === 'Offline';
                        return (
                          <div key={s.sensorId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: '12px' }}>
                            <div>
                              <span style={{ fontWeight: 'bold', color: isFaulty ? 'var(--rose)' : 'var(--text-main)' }}>U{s.unitId} ({s.sensorType})</span>
                              <span style={{ color: isFaulty ? 'var(--rose)' : 'var(--text-muted)', marginLeft: '8px' }}>{formatSensorStatus(s.status, app.t)}</span>
                            </div>
                            <span style={{ fontWeight: 'bold', color: isFaulty ? 'var(--rose)' : 'var(--primary)' }}>{s.currentValue ?? '—'} {s.unitOfMeasure ?? ''}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
    </>
  );
}
