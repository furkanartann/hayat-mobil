import React from 'react';
import { Package, Truck } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { getActiveRoleTickets, formatTriageLabel } from '../../lib/tickets.js';
import { formatRequestType } from '../../lib/statusLabels.js';
import CollapsibleCard from '../../components/CollapsibleCard.jsx';
import ActiveDutyBanner from '../../components/dashboard/ActiveDutyBanner.jsx';
export default function LogisticsDashboard() {
  const app = useApp();
  if (app.user.userType !== 'Lojistik') return null;
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
                    <Package style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
                    {app.t('Malzeme & İaşe Talepleri', 'Supply & Provisions Requests')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {getActiveRoleTickets(app.tickets, app.user.userType).length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{app.t('Bekleyen lojistik talebi yok.', 'No pending logistics requests.')}</p>
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
                                  onClick={() => app.handleUpdateTicketStatus(ticket.ticketId, 'In_Progress', app.user.staffId, app.t('Lojistik ekibi yönlendirildi.', 'Logistics team dispatched.'))}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                >
                                  {app.t('Kabul Et', 'Accept')}
                                </button>
                              )}
                              {ticket.status === 'In_Progress' && ticket.assignedStaffId === app.user.staffId && (
                                <button
                                  onClick={() => app.handleUpdateTicketStatus(ticket.ticketId, 'Resolved', ticket.assignedStaffId, app.t('Malzeme teslim edildi, talep kapatıldı.', 'Supplies delivered, request closed.'))}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--emerald)' }}
                                >
                                  {app.t('Çözüldü', 'Resolve')}
                                </button>
                              )}
                              {ticket.status === 'In_Progress' && ticket.assignedStaffId !== app.user.staffId && (
                                <span style={{ color: 'var(--emerald)', fontSize: '11px', fontWeight: 'bold' }}>{app.t('Dağıtımda', 'In Progress')}</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  {app.inventory.length === 0 ? (
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>{app.t('Envanter kaydı yok.', 'No app.inventory items.')}</p>
                  ) : (
                    app.inventory.slice(0, 4).map(item => (
                      <div key={item.itemId} className="glass" style={{ padding: '12px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>{item.category}</span>
                          <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', marginTop: '2px' }}>{item.itemName}</h4>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary)' }}>{item.stockCount}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Collapsible Supply Handover Form */}
                <CollapsibleCard title={app.t('Malzeme Dağıtım Formu', 'Supply Distribution Dispatch')} icon={Truck} defaultOpen={false}>
                  {app.renderDistributionForm()}
                </CollapsibleCard>

                {/* Distribution History */}
                <div className="glass" style={{ borderRadius: '16px', padding: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
                    <Truck style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
                    {app.t('Son Malzeme Dağıtımları', 'Recent Supplies Log')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                    {app.distributions.length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{app.t('Henüz dağıtım yapılmadı.', 'No app.distributions recorded yet.')}</p>
                    ) : (
                      app.distributions.map((d) => (
                        <div key={d.distributionId} style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--text-main)' }}>
                            <span>{d.itemName} ({d.quantityDistributed} {app.t('adet', 'qty')})</span>
                            <span className="badge badge-grey" style={{ fontSize: '9px' }}>{d.transportType}</span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                            {app.t('Alıcı:', 'Receiver:')} {d.receiverName || app.t('Genel Dağıtım', 'General')}
                            {d.courierName ? ` | ${app.t('Kurye:', 'Courier:')} ${d.courierName}` : ''}
                            {' | '}{app.t('Kayıt:', 'Logged by:')} {d.staffName}
                          </div>
                          <div style={{ fontStyle: 'italic', marginTop: '2px', color: 'var(--text-main)' }}>"{d.distributionNote}"</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
    </>
  );
}
