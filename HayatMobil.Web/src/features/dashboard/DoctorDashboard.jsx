import React from 'react';
import { ClipboardList, HeartPulse, PlusCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { getDoctorReferralQueue, isOpenMedicalTicket, formatTriageLabel } from '../../lib/tickets.js';
import CollapsibleCard from '../../components/CollapsibleCard.jsx';
export default function DoctorDashboard() {
  const app = useApp();
  if (app.user.userType !== 'Doktor') return null;

  const referralQueue = getDoctorReferralQueue(app.tickets);
  const openMedical = app.tickets.filter(isOpenMedicalTicket);

  return (
    <>
                {!app.user.staffId && (
                  <div className="glass" style={{ borderRadius: '12px', padding: '12px 14px', marginBottom: '12px', borderLeft: '4px solid var(--amber)', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {app.t(
                      'Personel kaydı oturumda yok. PM onayından sonra çıkış yapıp tekrar giriş yapın; aksi halde vaka üzerinize alınamaz.',
                      'Staff profile missing in session. Sign out and sign in again after PM approval; otherwise you cannot take cases.'
                    )}
                  </div>
                )}

                {openMedical.length > 0 && referralQueue.length === 0 && (
                  <div className="glass" style={{ borderRadius: '12px', padding: '12px 14px', marginBottom: '12px', borderLeft: '4px solid #38bdf8', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {app.t(
                      `${openMedical.length} açık tıbbi SOS var; doktor kuyruğunda sevk bekleyen yok. Paramedik saha değerlendirmesinde "Doktora sevk" seçmeli.`,
                      `${openMedical.length} open medical SOS; none referred to doctor yet. Paramedic must choose doctor referral in field assessment.`
                    )}
                  </div>
                )}

                <div className="glass" style={{ borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
                    <HeartPulse style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
                    {app.t('Doktora Sevk Edilen Vakalar', 'Cases Referred to Doctor')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {referralQueue.length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{app.t('Bekleyen sevk vakası yok.', 'No referred cases pending.')}</p>
                    ) : (
                      referralQueue.slice(0, 5).map((ticket) => {
                        const fieldRec = app.medicalRecords.find((mr) => mr.recordType === 'FieldAssessment' && mr.ticketId === ticket.ticketId);
                        const badgeClass = ticket.triageColor === 'Red' ? 'badge-red' : ticket.triageColor === 'Yellow' ? 'badge-yellow' : 'badge-green';
                        return (
                          <div key={ticket.ticketId} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: '13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>#{ticket.ticketId} · {ticket.requestorName}</span>
                                <span className={`badge ${badgeClass}`} style={{ marginLeft: '8px', fontSize: '9px', padding: '1px 4px' }}>{formatTriageLabel(ticket.triageColor, app.t)}</span>
                              </div>
                              {ticket.status === 'Open' && (
                                <button onClick={() => app.handleUpdateTicketStatus(ticket.ticketId, 'In_Progress', app.user.staffId, app.t('Doktor müdahaleye aldı.', 'Doctor took the case.'))} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '11px' }}>
                                  {app.t('Üzerime Al', 'Take case')}
                                </button>
                              )}
                            </div>
                            {fieldRec && (
                              <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px' }}>
                                {app.t('Paramedik:', 'Paramedic:')} HR {fieldRec.heartRate} · SpO2 {fieldRec.bloodOxygen}% · {fieldRec.consciousness} · {fieldRec.visibleInjury}
                                {fieldRec.notes ? ` — "${fieldRec.notes}"` : ''}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <CollapsibleCard title={app.t('Klinik Muayene Kaydet', 'Log Clinical Exam')} icon={HeartPulse} defaultOpen={false}>
                  <form onSubmit={app.handleCreateClinicalExam} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Sevk edilen vaka', 'Referred case')}</label>
                      <select
                        className="form-input"
                        value={app.clinicalExamForm.ticketId}
                        onChange={(e) => {
                          const ticketId = e.target.value;
                          const fieldRec = app.medicalRecords.find((mr) => mr.recordType === 'FieldAssessment' && String(mr.ticketId) === ticketId);
                          app.setClinicalExamForm({
                            ...app.clinicalExamForm,
                            ticketId,
                            linkedFieldRecordId: fieldRec ? String(fieldRec.recordId) : '',
                            heartRate: fieldRec?.heartRate != null ? String(fieldRec.heartRate) : app.clinicalExamForm.heartRate,
                            bloodOxygen: fieldRec?.bloodOxygen != null ? String(fieldRec.bloodOxygen) : app.clinicalExamForm.bloodOxygen,
                            respirationRate: fieldRec?.respirationRate != null ? String(fieldRec.respirationRate) : app.clinicalExamForm.respirationRate,
                            bodyTemperature: fieldRec?.bodyTemperature != null ? String(fieldRec.bodyTemperature) : app.clinicalExamForm.bodyTemperature,
                          });
                        }}
                        required
                      >
                        <option value="">{app.t('Vaka seçin...', 'Select case...')}</option>
                        {getDoctorReferralQueue(app.tickets).map((tk) => (
                          <option key={tk.ticketId} value={tk.ticketId}>#{tk.ticketId} · {tk.requestorName}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Nabız', 'HR')}</label>
                        <input type="number" className="form-input" value={app.clinicalExamForm.heartRate} onChange={(e) => app.setClinicalExamForm({ ...app.clinicalExamForm, heartRate: e.target.value })} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>SpO2</label>
                        <input type="number" className="form-input" value={app.clinicalExamForm.bloodOxygen} onChange={(e) => app.setClinicalExamForm({ ...app.clinicalExamForm, bloodOxygen: e.target.value })} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Solunum', 'RR')}</label>
                        <input type="number" className="form-input" value={app.clinicalExamForm.respirationRate} onChange={(e) => app.setClinicalExamForm({ ...app.clinicalExamForm, respirationRate: e.target.value })} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Ateş', 'Temp')}</label>
                        <input type="number" step="0.1" className="form-input" value={app.clinicalExamForm.bodyTemperature} onChange={(e) => app.setClinicalExamForm({ ...app.clinicalExamForm, bodyTemperature: e.target.value })} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Ön tanı / bulgu', 'Diagnosis / findings')}</label>
                      <input type="text" className="form-input" value={app.clinicalExamForm.diagnosis} onChange={(e) => app.setClinicalExamForm({ ...app.clinicalExamForm, diagnosis: e.target.value })} placeholder={app.t('Örn: Alt ekstremite kırığı şüphesi', 'e.g. Suspected lower limb fracture')} required />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Uygulanan tedavi', 'Treatment given')}</label>
                      <input type="text" className="form-input" value={app.clinicalExamForm.treatment} onChange={(e) => app.setClinicalExamForm({ ...app.clinicalExamForm, treatment: e.target.value })} placeholder={app.t('Örn: Analjezik, atel, serum', 'e.g. Analgesic, splint, IV fluids')} />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Klinik karar', 'Clinical decision')}</label>
                      <select className="form-input" value={app.clinicalExamForm.disposition} onChange={(e) => app.setClinicalExamForm({ ...app.clinicalExamForm, disposition: e.target.value })}>
                        <option value="Observe">{app.t('Gözlem — vaka kapanır', 'Observe — close case')}</option>
                        <option value="Discharge">{app.t('Taburcu — vaka kapanır', 'Discharge — close case')}</option>
                        <option value="Hospital">{app.t('Hastaneye sevk — vaka kapanır', 'Hospital referral — close case')}</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{app.t('Klinik not', 'Clinical note')}</label>
                      <textarea className="form-input" style={{ resize: 'none', height: '60px' }} value={app.clinicalExamForm.notes} onChange={(e) => app.setClinicalExamForm({ ...app.clinicalExamForm, notes: e.target.value })} placeholder={app.t('Detaylı muayene ve plan...', 'Detailed exam and plan...')} />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                      <PlusCircle style={{ width: '16px', height: '16px' }} />
                      {app.t('Klinik kaydı gönder', 'Save clinical exam')}
                    </button>
                  </form>
                </CollapsibleCard>

                <div className="glass" style={{ borderRadius: '16px', padding: '16px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--text-main)' }}>
                    <ClipboardList style={{ color: 'var(--primary)', width: '18px', height: '18px' }} />
                    {app.t('Klinik Kayıtlarım', 'My Clinical Exams')}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                    {app.medicalRecords.filter((mr) => mr.recordType === 'ClinicalExam').length === 0 ? (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{app.t('Henüz klinik kayıt yok.', 'No clinical exams yet.')}</p>
                    ) : (
                      app.medicalRecords.filter((mr) => mr.recordType === 'ClinicalExam').map((mr) => (
                        <div key={mr.recordId} style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--text-main)' }}>
                            <span>#{mr.ticketId} · {mr.patientName}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{mr.recordedAt}</span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                            {mr.diagnosis} · {mr.disposition}
                            {mr.treatment ? ` · ${mr.treatment}` : ''}
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
