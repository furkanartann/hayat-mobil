import React from 'react';
import { Layers, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { getActiveRoleTickets, formatTriageLabel } from '../../lib/tickets.js';
import { formatUnitStatus } from '../../lib/statusLabels.js';
import ActiveDutyBanner from '../../components/dashboard/ActiveDutyBanner.jsx';
export default function SecurityDashboard() {
  const app = useApp();
  if (app.user.userType !== 'Guvenlik') return null;
  return (
    <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  <div className="glass" style={{ padding: '12px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{app.t('AÇIK SOS', 'OPEN SOS')}</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--rose)' }}>
                      {getActiveRoleTickets(app.tickets, 'Guvenlik').filter((tk) => tk.status === 'Open').length}
                    </div>
                  </div>
                  <div className="glass" style={{ padding: '12px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{app.t('MÜDAHALEDE', 'IN PROGRESS')}</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--amber)' }}>
                      {getActiveRoleTickets(app.tickets, 'Guvenlik').filter((tk) => tk.status === 'In_Progress').length}
                    </div>
                  </div>
                  <div className="glass" style={{ padding: '12px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{app.t('SAHA DÜĞÜMÜ', 'FIELD NODES')}</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)' }}>{app.units.length}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {app.t('Aktif', 'Active')}: {app.units.filter((u) => u.status === 'Active').length}
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
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
                    <Lock style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
                    {app.t('Güvenlik & Emniyet Talepleri', 'Security & Safety Requests')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {getActiveRoleTickets(app.tickets, app.user.userType).length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{app.t('Bekleyen güvenlik talebi yok.', 'No pending security requests.')}</p>
                    ) : (
                      getActiveRoleTickets(app.tickets, app.user.userType).slice(0, 5).map(ticket => {
                        const badgeClass = ticket.triageColor === 'Red' ? 'badge-red' : ticket.triageColor === 'Yellow' ? 'badge-yellow' : 'badge-green';
                        return (
                          <div key={ticket.ticketId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                            <div>
                              <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>#{ticket.ticketId} · {ticket.requestorName}</span>
                              <span className={`badge ${badgeClass}`} style={{ marginLeft: '8px', fontSize: '9px', padding: '1px 4px' }}>{formatTriageLabel(ticket.triageColor, app.t)}</span>
                              <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{ticket.updateNote}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                              {ticket.status === 'Open' && (
                                <button
                                  onClick={() => app.handleUpdateTicketStatus(ticket.ticketId, 'In_Progress', app.user.staffId, app.t('Güvenlik ekibi yönlendirildi.', 'Security team dispatched.'))}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                >
                                  {app.t('Kabul Et', 'Accept')}
                                </button>
                              )}
                              {ticket.status === 'In_Progress' && ticket.assignedStaffId === app.user.staffId && (
                                <button
                                  onClick={() => app.handleUpdateTicketStatus(ticket.ticketId, 'Resolved', ticket.assignedStaffId, app.t('Güvenlik müdahalesi tamamlandı.', 'Security response completed.'))}
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

                <div className="glass" style={{ borderRadius: '16px', padding: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
                    <Layers style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
                    {app.t('Saha İletişim Düğümleri', 'Field Communication Nodes')}
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    {app.t('Devriye ve koordinasyon için — yalnızca izleme.', 'For patrol coordination — read-only.')}
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    {app.units.length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>{app.t('Kayıtlı saha düğümü yok.', 'No field nodes registered.')}</p>
                    ) : (
                      app.units.map((u) => {
                        const statusClass = u.status === 'Active' ? 'badge-green' : u.status === 'Emergency' ? 'badge-red' : 'badge-grey';
                        return (
                          <div key={u.unitId} style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>U{u.unitId} - {u.serialNumber}</span>
                              <span className={`badge ${statusClass}`} style={{ fontSize: '8px', padding: '1px 3px' }}>{formatUnitStatus(u.status, app.t)}</span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                              {u.latitude.toFixed(4)}, {u.longitude.toFixed(4)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
    </>
  );
}
