import React from 'react';
import { ClipboardList, HeartPulse, PlusCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { getParamedicQueue, formatTriageLabel } from '../../lib/tickets.js';
import { formatTriageShort } from '../../lib/statusLabels.js';
import CollapsibleCard from '../../components/CollapsibleCard.jsx';
export default function ParamedicDashboard() {
  const app = useApp();
  if (app.user.userType !== 'SaglikParamedik') return null;
  return (
    <>
                <div className="glass" style={{ borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
                    <HeartPulse style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
                    {app.t('Saha Müdahale Kuyruğu', 'Field Response Queue')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {getParamedicQueue(app.tickets).length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{app.t('Bekleyen tıbbi SOS yok.', 'No pending medical SOS requests.')}</p>
                    ) : (
                      getParamedicQueue(app.tickets).slice(0, 5).map((ticket) => {
                        const badgeClass = ticket.triageColor === 'Red' ? 'badge-red' : ticket.triageColor === 'Yellow' ? 'badge-yellow' : 'badge-green';
                        return (
                          <div key={ticket.ticketId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                            <div>
                              <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>#{ticket.ticketId} · {ticket.requestorName}</span>
                              <span className={`badge ${badgeClass}`} style={{ marginLeft: '8px', fontSize: '9px', padding: '1px 4px' }}>{formatTriageLabel(ticket.triageColor, app.t)}</span>
                              <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{ticket.updateNote}</p>
                            </div>
                            <div>
                              {ticket.status === 'Open' ? (
                                <button
                                  onClick={() => app.handleUpdateTicketStatus(ticket.ticketId, 'In_Progress', app.user.staffId, app.t('Paramedik ekibi yönlendirildi.', 'Paramedic team dispatched.'))}
                                  className="btn btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '11px' }}
                                >
                                  {app.t('Kabul Et', 'Accept')}
                                </button>
                              ) : (
                                <span style={{ color: 'var(--emerald)', fontSize: '11px', fontWeight: 'bold' }}>{app.t('Müdahalede', 'On scene')}</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <CollapsibleCard title={app.t('Saha Değerlendirmesi Kaydet', 'Log Field Assessment')} icon={HeartPulse} defaultOpen={false}>
                  <form onSubmit={app.handleCreateFieldAssessment} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Tıbbi SOS talebi', 'Medical SOS request')}</label>
                      <select className="form-input" value={app.fieldAssessmentForm.ticketId} onChange={(e) => app.setFieldAssessmentForm({ ...app.fieldAssessmentForm, ticketId: e.target.value })} required>
                        <option value="">{app.t('Talep seçin...', 'Select request...')}</option>
                        {getParamedicQueue(app.tickets).map((tk) => (
                          <option key={tk.ticketId} value={tk.ticketId}>#{tk.ticketId} · {tk.requestorName} ({formatTriageShort(tk.triageColor, app.t)})</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Bilinç (AVPU)', 'Consciousness')}</label>
                        <select className="form-input" value={app.fieldAssessmentForm.consciousness} onChange={(e) => app.setFieldAssessmentForm({ ...app.fieldAssessmentForm, consciousness: e.target.value })}>
                          <option value="Alert">{app.t('Uyanık', 'Alert')}</option>
                          <option value="Voice">{app.t('Sese yanıt', 'Voice')}</option>
                          <option value="Pain">{app.t('Ağrıya yanıt', 'Pain')}</option>
                          <option value="Unresponsive">{app.t('Yanıtsız', 'Unresponsive')}</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Görünür yaralanma', 'Visible injury')}</label>
                        <select className="form-input" value={app.fieldAssessmentForm.visibleInjury} onChange={(e) => app.setFieldAssessmentForm({ ...app.fieldAssessmentForm, visibleInjury: e.target.value })}>
                          <option value="None">{app.t('Yok', 'None')}</option>
                          <option value="Minor">{app.t('Hafif', 'Minor')}</option>
                          <option value="Severe">{app.t('Şiddetli', 'Severe')}</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Triyaj', 'Triage')}</label>
                        <select className="form-input" value={app.fieldAssessmentForm.triageColor} onChange={(e) => app.setFieldAssessmentForm({ ...app.fieldAssessmentForm, triageColor: e.target.value })}>
                          <option value="Red">{app.t('Kırmızı', 'Red')}</option>
                          <option value="Yellow">{app.t('Sarı', 'Yellow')}</option>
                          <option value="Green">{app.t('Yeşil', 'Green')}</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Nabız', 'HR')}</label>
                        <input type="number" className="form-input" value={app.fieldAssessmentForm.heartRate} onChange={(e) => app.setFieldAssessmentForm({ ...app.fieldAssessmentForm, heartRate: e.target.value })} required />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>SpO2</label>
                        <input type="number" className="form-input" value={app.fieldAssessmentForm.bloodOxygen} onChange={(e) => app.setFieldAssessmentForm({ ...app.fieldAssessmentForm, bloodOxygen: e.target.value })} required />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Ateş', 'Temp')}</label>
                        <input type="number" step="0.1" className="form-input" value={app.fieldAssessmentForm.bodyTemperature} onChange={(e) => app.setFieldAssessmentForm({ ...app.fieldAssessmentForm, bodyTemperature: e.target.value })} required />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Saha kararı', 'Field decision')}</label>
                      <select className="form-input" value={app.fieldAssessmentForm.disposition} onChange={(e) => app.setFieldAssessmentForm({ ...app.fieldAssessmentForm, disposition: e.target.value })}>
                        <option value="OnSiteTreatment">{app.t('Yerinde tedavi — vaka kapanır', 'On-site treatment — close case')}</option>
                        <option value="Transport">{app.t('Nakil — vaka kapanır', 'Transport — close case')}</option>
                        <option value="DoctorReferral">{app.t('Doktora sevk — doktor kuyruğuna düşer', 'Refer to doctor')}</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Kısa saha notu', 'Brief field note')}</label>
                      <textarea className="form-input" style={{ resize: 'none', height: '56px' }} value={app.fieldAssessmentForm.notes} onChange={(e) => app.setFieldAssessmentForm({ ...app.fieldAssessmentForm, notes: e.target.value })} placeholder={app.t('Örn: Kanama kontrol altında, immobilizasyon uygulandı.', 'e.g. Bleeding controlled, immobilized.')} />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                      <PlusCircle style={{ width: '16px', height: '16px' }} />
                      {app.t('Saha kaydını gönder', 'Save field assessment')}
                    </button>
                  </form>
                </CollapsibleCard>

                <div className="glass" style={{ borderRadius: '16px', padding: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
                    <ClipboardList style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
                    {app.t('Saha Kayıtlarım', 'My Field Assessments')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                    {app.medicalRecords.filter((mr) => mr.recordType === 'FieldAssessment').length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{app.t('Henüz saha kaydı yok.', 'No field assessments yet.')}</p>
                    ) : (
                      app.medicalRecords.filter((mr) => mr.recordType === 'FieldAssessment').map((mr) => (
                        <div key={mr.recordId} style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--text-main)' }}>
                            <span>#{mr.ticketId} · {mr.patientName}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{mr.recordedAt}</span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                            {formatTriageShort(mr.triageColor, app.t)} · {mr.consciousness} · {mr.disposition} | HR {mr.heartRate} · SpO2 {mr.bloodOxygen}%
                          </div>
                          {mr.notes && <div style={{ fontStyle: 'italic', marginTop: '2px', color: 'var(--text-main)' }}>"{mr.notes}"</div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
    </>
  );
}
