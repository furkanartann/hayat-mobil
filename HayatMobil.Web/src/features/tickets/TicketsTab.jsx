import React, { useState } from 'react';
import { Droplets, HeartPulse, Home, Lock, Navigation, PlusCircle, ShieldAlert, Utensils } from 'lucide-react';
import {
  getTicketsForTab, ticketMatchesRole,
  canDoctorActOnTicket, isOpenMedicalTicket,
  getPmAssignableStaff, formatTriageLabel, getDispatchRoleHint,
} from '../../lib/tickets.js';
import {
  formatTicketStatus, formatRequestType, formatStaffStatus,
} from '../../lib/statusLabels.js';
import { formatRoleLabel } from '../../lib/roles.js';
import CollapsibleCard from '../../components/CollapsibleCard.jsx';
import TicketEtaInline from '../../components/tickets/TicketEtaInline.jsx';
import PmAssignEtaPreview from './components/PmAssignEtaPreview.jsx';
import { useApp } from '../../context/AppContext.jsx';

export default function TicketsTab() {
  const app = useApp();
  const [pmAssignStaff, setPmAssignStaff] = useState({});
  if (app.activeTab !== 'tickets') return null;
  return (
          <div className="tickets-tab animate-fade">
            
            {/* Create Help Request Form (Visible to civilians) */}
            {app.user.userType === 'Afetzede' && (
              <CollapsibleCard
                key={`sos-form-${app.sosFormKey}`}
                title={app.t('Yardım Talebi Oluştur (SOS)', 'Request Assistance (SOS)')}
                icon={PlusCircle}
                defaultOpen={app.sosFormKey > 0}
              >
                <form onSubmit={app.handleCreateTicket} className="civilian-sos-form">
                  <p className="civilian-form-hint">
                    <Navigation size={14} />
                    {app.t('Konumunuz otomatik eklenecek. İlk triyaj yardım türüne göre atanır; paramedik sahada günceller.', 'Your location is added automatically. Initial triage follows help type; paramedics update it on scene.')}
                  </p>

                  <label className="civilian-form-label">{app.t('Ne tür yardıma ihtiyacınız var?', 'What kind of help do you need?')}</label>
                  <div className="help-need-grid">
                    {[
                      { value: 'Medical', label: app.t('Sağlık', 'Medical'), Icon: HeartPulse },
                      { value: 'Rescue', label: app.t('Kurtarma', 'Rescue'), Icon: ShieldAlert },
                      { value: 'Food', label: app.t('Gıda', 'Food'), Icon: Utensils },
                      { value: 'Water', label: app.t('Su', 'Water'), Icon: Droplets },
                      { value: 'Structural', label: app.t('Barınma', 'Shelter'), Icon: Home },
                      { value: 'Security', label: app.t('Güvenlik', 'Security'), Icon: Lock },
                    ].map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        className={`help-need-chip ${app.newTicket.requestType === value ? 'is-selected' : ''}`}
                        onClick={() => app.setNewTicket((prev) => ({ ...prev, requestType: value }))}
                      >
                        <Icon size={16} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  <label className="civilian-form-label">{app.t('Durumunuzu kısaca anlatın', 'Briefly describe your situation')}</label>
                  <textarea
                    className="form-input"
                    style={{ resize: 'none', minHeight: '72px' }}
                    placeholder={app.t('Örn: Enkaz altındayım, suya ihtiyacım var...', 'e.g. I am trapped, need water...')}
                    value={app.newTicket.updateNote}
                    onChange={(e) => app.setNewTicket({ ...app.newTicket, updateNote: e.target.value })}
                    required
                  />

                  <button type="submit" className="btn btn-danger" style={{ width: '100%', marginTop: '4px' }}>
                    <PlusCircle style={{ width: '16px', height: '16px' }} />
                    {app.t('Yardım Talebi Gönder', 'Send Help Request')}
                  </button>
                </form>
              </CollapsibleCard>
            )}

            {/* Assistance tickets list */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '10px' }}>
                {app.t('Yardım Talepleri ve Triyaj', 'Assistance Tickets Queue')}
              </h3>

              {app.user.userType === 'PM' && (
                <p className="ticket-triage-hint" style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
                  {app.t(
                    'Triyaj: SOS açılışında talep türüne göre otomatik atanır (Sağlık/Kurtarma → Red). Paramedik saha değerlendirmesiyle güncellenir. Red=acil, Yellow=gecikmeli, Green=hafif, Black=beklenti.',
                    'Triage: set automatically from request type at SOS creation (Medical/Rescue → Red). Updated by paramedic field assessment. Red=immediate, Yellow=delayed, Green=minor, Black=expectant.'
                  )}
                </p>
              )}

              {app.user.userType === 'Doktor' && (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
                  {app.t(
                    'Tüm açık tıbbi SOS talepleri listelenir. Üzerine almak ve klinik kayıt için önce paramediğin saha değerlendirmesinde "Doktora sevk" yapması gerekir.',
                    'All open medical SOS requests are listed. A paramedic must complete a field assessment with "Refer to doctor" before you can take the case.'
                  )}
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {getTicketsForTab(app.tickets, app.user.userType, app.user.userId).length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--grey)', textAlign: 'center' }}>
                    {app.user.userType === 'Afetzede'
                      ? app.t('Henüz yardım talebiniz yok.', 'You have no assistance requests yet.')
                      : app.user.userType === 'Doktor'
                        ? app.t('Açık tıbbi SOS talebi yok.', 'No open medical SOS requests.')
                        : app.t('Aktif yardım talebi bulunmamaktadır.', 'No active assistance tickets.')}
                  </p>
                ) : (
                  getTicketsForTab(app.tickets, app.user.userType, app.user.userId).map((ticket) => {
                    const doctorCanAct = app.user.userType === 'Doktor' && canDoctorActOnTicket(ticket);
                    const doctorPendingReferral = app.user.userType === 'Doktor'
                      && isOpenMedicalTicket(ticket) && !ticket.referredToDoctor;
                    const badgeClass = ticket.triageColor === 'Red' ? 'badge-red' : ticket.triageColor === 'Yellow' ? 'badge-yellow' : 'badge-green';
                    const statusClass = ticket.status === 'Open' ? 'badge-blue' : ticket.status === 'In_Progress' ? 'badge-yellow' : 'badge-green';
                    return (
                      <div 
                        key={ticket.ticketId} 
                        className="ticket-card glass"
                        style={{ 
                          borderLeftColor: ticket.triageColor === 'Red' ? 'var(--rose)' : ticket.triageColor === 'Yellow' ? 'var(--amber)' : 'var(--emerald)'
                        }}
                      >
                        <div className="ticket-card-header">
                          <span className="ticket-card-title">
                            {ticket.requestorName} ({formatRequestType(ticket.requestType, app.t)})
                          </span>
                          <div className="ticket-card-badges">
                            <span className={`badge ${badgeClass}`}>
                              {formatTriageLabel(ticket.triageColor, app.t)}
                            </span>
                            <span className={`badge ${statusClass}`}>
                              {formatTicketStatus(ticket.status, app.t)}
                            </span>
                            {doctorPendingReferral && (
                              <span className="badge badge-amber" style={{ fontSize: '9px' }}>
                                {app.t('Sevk bekliyor', 'Awaiting referral')}
                              </span>
                            )}
                            {doctorCanAct && (
                              <span className="badge badge-green" style={{ fontSize: '9px' }}>
                                {app.t('Doktora sevk', 'Referred')}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="ticket-card-note">
                          {ticket.updateNote}
                        </p>

                        {doctorPendingReferral && (
                          <p style={{ fontSize: '11px', color: 'var(--amber)', marginTop: '4px' }}>
                            {app.t('Paramedik saha değerlendirmesi ve doktora sevk bekleniyor.', 'Awaiting paramedic field assessment and doctor referral.')}
                          </p>
                        )}

                        <div className="ticket-card-meta">
                          <span>{app.t('ID:', 'ID:')} {ticket.ticketId} · {app.t('Ünite:', 'Hub:')} {ticket.unitId || 'N/A'}</span>
                          <span style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span>
                              {app.t('Görevli:', 'Staff:')} {ticket.assignedStaffName || app.t('Atanmadı', 'Unassigned')}
                            </span>
                            {ticket.status === 'In_Progress' && ticket.assignedStaffId === app.user.staffId && (
                              <TicketEtaInline
                                ticket={ticket}
                                userLocation={app.userLocation}
                                userType={app.user.userType}
                                staffId={app.user.staffId}
                                t={app.t}
                              />
                            )}
                          </span>
                        </div>

                        <div className="ticket-card-actions">
                            {ticket.status === 'Open' && app.user.userType === 'PM' && (() => {
                              const assignable = getPmAssignableStaff(app.staffList, ticket);
                              const picked = pmAssignStaff[ticket.ticketId] ?? '';
                              const pickedStaff = assignable.find((s) => String(s.staffId) === String(picked));
                              return (
                                <div className="ticket-card-pm-assign" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                                    {app.t('PM olarak saha personeline yönlendirin; kendi adınıza intikal edemezsiniz.', 'As PM, dispatch field staff — you cannot take tickets yourself.')}
                                  </p>
                                  <p style={{ fontSize: '11px', color: 'var(--primary)', margin: 0, fontWeight: 600 }}>
                                    {getDispatchRoleHint(ticket, app.t)}
                                  </p>
                                  {assignable.length === 0 ? (
                                    <p style={{ fontSize: '12px', color: 'var(--amber)', margin: 0 }}>
                                      {app.t('Bu talep için müsait ve uygun personel yok. İlgili rolde personel onaylayın veya görevde olanların bitmesini bekleyin.', 'No available staff matching this request. Approve staff in the required role or wait for on-duty staff.')}
                                    </p>
                                  ) : (
                                    <>
                                      <select
                                        className="form-input"
                                        value={picked}
                                        onChange={(e) => setPmAssignStaff((prev) => ({ ...prev, [ticket.ticketId]: e.target.value }))}
                                      >
                                        <option value="">{app.t('Personel seçin…', 'Select staff…')}</option>
                                        {assignable.map((s) => (
                                          <option key={s.staffId} value={s.staffId}>
                                            {s.fullName} — {formatRoleLabel(s.userType || s.specialization, app.lang)} ({formatStaffStatus(s.currentStatus, app.t)})
                                          </option>
                                        ))}
                                      </select>
                                      <PmAssignEtaPreview
                                        ticketId={ticket.ticketId}
                                        staffId={picked}
                                        t={app.t}
                                      />
                                      <button
                                        type="button"
                                        disabled={!picked}
                                        onClick={() => app.handleUpdateTicketStatus(
                                          ticket.ticketId,
                                          'In_Progress',
                                          picked,
                                          app.t(
                                            `${pickedStaff?.fullName ?? 'Personel'} ekibine yönlendirildi (PM ataması).`,
                                            `Dispatched to ${pickedStaff?.fullName ?? 'staff'} (PM assignment).`
                                          )
                                        )}
                                        className="btn btn-primary ticket-card-btn"
                                      >
                                        {app.t('Personel Ata', 'Assign Staff')}
                                      </button>
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                            {ticket.status === 'Open' && app.user.userType !== 'PM' && app.user.userType !== 'Afetzede' && (
                              (app.user.userType === 'Doktor' ? doctorCanAct : ticketMatchesRole(ticket, app.user.userType))
                            ) && (
                              <button 
                                onClick={() => app.handleUpdateTicketStatus(
                                  ticket.ticketId,
                                  'In_Progress',
                                  app.user.staffId,
                                  app.user.userType === 'Guvenlik'
                                    ? app.t('Güvenlik ekibi intikal ediyor.', 'Security team en route.')
                                    : app.user.userType === 'Lojistik'
                                      ? app.t('Lojistik ekibi yönlendirildi.', 'Logistics team dispatched.')
                                      : app.user.userType === 'AramaKurtarma'
                                        ? app.t('Arama kurtarma ekibi intikal ediyor.', 'Search & rescue team en route.')
                                        : app.user.userType === 'SaglikParamedik'
                                          ? app.t('Paramedik ekibi intikal ediyor.', 'Paramedic team en route.')
                                          : app.user.userType === 'Doktor'
                                            ? app.t('Doktor müdahaleye aldı.', 'Doctor took the case.')
                                            : app.t('Ekip intikal ediyor.', 'Team en route.')
                                )}
                                className="btn btn-primary ticket-card-btn"
                              >
                                {app.t('Üzerime Al', 'Assign to Me')}
                              </button>
                            )}
                            {ticket.status === 'In_Progress' && app.user.userType !== 'Afetzede' && (ticket.assignedStaffId === app.user.staffId || app.user.userType === 'PM') && (
                              <>
                                <button 
                                  onClick={() => app.handleUpdateTicketStatus(
                                    ticket.ticketId,
                                    'Resolved',
                                    ticket.assignedStaffId,
                                    app.user.userType === 'Guvenlik'
                                      ? app.t('Güvenlik müdahalesi tamamlandı.', 'Security response completed.')
                                      : app.user.userType === 'Lojistik'
                                        ? app.t('Malzeme teslim edildi, talep kapatıldı.', 'Supplies delivered, request closed.')
                                        : app.user.userType === 'AramaKurtarma'
                                          ? app.t('Kurtarma tamamlandı, afetzedeye ulaşıldı.', 'Rescue completed, civilian reached.')
                                          : app.t('Çözüldü, afetzedeye ulaşıldı.', 'Resolved, civilian reached.')
                                  )}
                                  className="btn btn-secondary ticket-card-btn ticket-card-btn--resolve"
                                >
                                  {app.t('Çözüldü', 'Resolve')}
                                </button>
                                <button 
                                  onClick={() => app.handleUpdateTicketStatus(ticket.ticketId, 'Cancelled', ticket.assignedStaffId, app.t('İptal edildi.', 'Cancelled.'))}
                                  className="btn btn-secondary ticket-card-btn ticket-card-btn--cancel"
                                >
                                  {app.t('İptal', 'Cancel')}
                                </button>
                              </>
                            )}
                          </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
  );
}
