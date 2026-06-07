import React from 'react';
import { Layers, Radio, ShieldAlert, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { getActiveRoleTickets, formatTriageLabel } from '../../lib/tickets.js';
import { formatRequestType, formatMissingStatus, formatUnitStatus, formatSensorStatus } from '../../lib/statusLabels.js';
import { formatAiDetectionLabel, formatAiSourceLabel, formatAiUnitLabel } from '../../lib/ai.js';
import ActiveDutyBanner from '../../components/dashboard/ActiveDutyBanner.jsx';
export default function SearchRescueDashboard() {
  const app = useApp();
  if (app.user.userType !== 'AramaKurtarma') return null;
  return (
    <>
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
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
                    <ShieldAlert style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
                    {app.t('Acil Kurtarma Talepleri', 'Urgent Rescue Requests')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {getActiveRoleTickets(app.tickets, app.user.userType).length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{app.t('Bekleyen kurtarma talebi yok.', 'No pending rescue requests.')}</p>
                    ) : (
                      getActiveRoleTickets(app.tickets, app.user.userType).slice(0, 5).map(ticket => {
                        const badgeClass = ticket.triageColor === 'Red' ? 'badge-red' : ticket.triageColor === 'Yellow' ? 'badge-yellow' : 'badge-green';
                        return (
                          <div key={ticket.ticketId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                            <div>
                              <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>#{ticket.ticketId} · {ticket.requestorName}</span>
                              <span className={`badge ${badgeClass}`} style={{ marginLeft: '8px', fontSize: '9px', padding: '1px 4px' }}>{formatTriageLabel(ticket.triageColor, app.t)}</span>
                              <span style={{ color: 'var(--text-muted)', marginLeft: '6px', fontSize: '11px' }}>({formatRequestType(ticket.requestType, app.t)})</span>
                              <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{ticket.updateNote}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                              {ticket.status === 'Open' && (
                                <button
                                  onClick={() => app.handleUpdateTicketStatus(ticket.ticketId, 'In_Progress', app.user.staffId, app.t('Arama kurtarma ekibi yönlendirildi.', 'Search & rescue team dispatched.'))}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                >
                                  {app.t('Kabul Et', 'Accept')}
                                </button>
                              )}
                              {ticket.status === 'In_Progress' && ticket.assignedStaffId === app.user.staffId && (
                                <button
                                  onClick={() => app.handleUpdateTicketStatus(ticket.ticketId, 'Resolved', ticket.assignedStaffId, app.t('Kurtarma tamamlandı, afetzedeye ulaşıldı.', 'Rescue completed, civilian reached.'))}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--emerald)' }}
                                >
                                  {app.t('Çözüldü', 'Resolve')}
                                </button>
                              )}
                              {ticket.status === 'In_Progress' && ticket.assignedStaffId !== app.user.staffId && (
                                <span style={{ color: 'var(--emerald)', fontSize: '11px', fontWeight: 'bold' }}>{app.t('Müdahalede', 'In Progress')}</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="glass" style={{ borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
                    <Users style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
                    {app.t('Aktif Kayıp Aramaları', 'Active Missing Person Searches')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                    {app.missingPersons.filter(mp => mp.status !== 'Found').length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{app.t('Aktif kayıp araması yok.', 'No active missing person searches.')}</p>
                    ) : (
                      app.missingPersons.filter(mp => mp.status !== 'Found').slice(0, 5).map(mp => (
                        <div key={mp.reportId} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: '12px' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{mp.missingPersonName}</span>
                          <span className="badge badge-amber" style={{ marginLeft: '8px', fontSize: '9px' }}>{formatMissingStatus(mp.status, app.t)}</span>
                          <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>{mp.physicalDescription}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {app.aiDetections.filter(d => ['Human_Trapped', 'Structural_Damage', 'Fire', 'Smoke'].includes(d.detectionType)).length > 0 && (
                  <div className="glass" style={{ borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
                      <ShieldAlert style={{ color: 'var(--rose)', width: '18px', height: '18px' }} />
                      {app.t('AI Enkaz / Sıkışma Tespitleri', 'AI Trapped / Structural Alerts')}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                      {app.aiDetections.filter(d => ['Human_Trapped', 'Structural_Damage', 'Fire', 'Smoke'].includes(d.detectionType)).slice(0, 4).map(det => (
                        <div key={det.detectionId} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: '12px' }}>
                          <span style={{ fontWeight: 'bold', color: 'var(--rose)' }}>{formatAiDetectionLabel(det.detectionType, app.t)}</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>
                            {formatAiUnitLabel(det.unitId, app.units)} · {formatAiSourceLabel(det.cameraId, app.t)}
                            {det.immobilePersonCount > 0 ? ` · ${app.t('Hareketsiz', 'Immobile')}: ${det.immobilePersonCount}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="glass" style={{ borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
                    <Layers style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
                    {app.t('Saha İletişim Düğümleri', 'Field Communication Nodes')}
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    {app.t('Yalnızca okuma — saha koordinasyonu için.', 'Read-only — for field coordination.')}
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
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="glass" style={{ borderRadius: '16px', padding: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
                    <Radio style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
                    {app.t('Çevresel Sensör Durumu', 'Environmental Sensor Status')}
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    {app.t('Duman, gaz ve sıcaklık — giriş yapılmaz, yalnızca izleme.', 'Smoke, gas, temperature — read-only monitoring.')}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                    {app.sensors.length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{app.t('Aktif sensör kaydı yok.', 'No active sensor readings.')}</p>
                    ) : (
                      app.sensors.map((s) => (
                      <div key={s.sensorId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-color)', fontSize: '12px' }}>
                        <div>
                          <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>U{s.unitId} ({s.sensorType})</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>{formatSensorStatus(s.status, app.t)}</span>
                        </div>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{s.currentValue ?? '—'} {s.unitOfMeasure ?? ''}</span>
                      </div>
                    ))
                    )}
                  </div>
                </div>
    </>
  );
}
