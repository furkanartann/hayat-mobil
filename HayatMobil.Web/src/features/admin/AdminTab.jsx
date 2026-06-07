import React, { useEffect } from 'react';
import { ClipboardList, History, Map, MapPin, PlusCircle, Radio, ShieldAlert } from 'lucide-react';
import DisasterHistoryPanel from './components/DisasterHistoryPanel.jsx';
import { formatRoleLabel } from '../../lib/roles.js';
import {
  formatApplicationStatus, formatStaffStatus, formatSensorStatus,
} from '../../lib/statusLabels.js';
import { detectionTypeOptions, dutyTypeOptions } from '../../lib/constants.js';
import FieldDutyEtaPreview from './components/FieldDutyEtaPreview.jsx';
import CollapsibleCard from '../../components/CollapsibleCard.jsx';
import { useApp } from '../../context/AppContext.jsx';
export default function AdminTab() {
  const app = useApp();
  useEffect(() => {
    if (app.activeTab === 'admin' && app.user?.userType === 'PM') {
      app.loadAssemblyPoints?.();
    }
  }, [app.activeTab, app.user?.userType]);
  if (app.activeTab !== 'admin' || app.user.userType !== 'PM') return null;
  return (
          <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {app.user.userType === 'PM' && (
              <CollapsibleCard title={app.t('Personel Başvuruları', 'Staff Applications')} icon={ClipboardList} defaultOpen={true}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  {app.t('Vatandaşların personel başvurularını inceleyin, onaylayın veya reddedin.', 'Review, approve or reject civilian staff applications.')}
                </p>
                {app.staffApplications.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{app.t('Henüz başvuru yok.', 'No applications yet.')}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {app.staffApplications.map((staffApp) => (
                      <div key={staffApp.applicationId} className="glass" style={{ padding: '12px', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          <strong>{staffApp.fullName}</strong>
                          <span className={`badge ${staffApp.status === 'Pending' ? 'badge-amber' : staffApp.status === 'Approved' ? 'badge-green' : 'badge-grey'}`}>
                            {formatApplicationStatus(staffApp.status, app.t)}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>TC: {staffApp.identityNo} · {staffApp.phone}</p>
                        <p style={{ fontSize: '13px', marginBottom: '4px' }}><strong>{app.t('Rol:', 'Role:')}</strong> {formatRoleLabel(staffApp.requestedRole, app.lang)} · <strong>{app.t('Kurum:', 'Institution:')}</strong> {staffApp.institution}</p>
                        {staffApp.credentialNote && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{app.t('Belge/Sicil:', 'Credential:')} {staffApp.credentialNote}</p>}
                        {staffApp.applicationNote && <p style={{ fontSize: '12px', marginTop: '4px' }}>{staffApp.applicationNote}</p>}
                        {staffApp.status === 'Pending' && (
                          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => app.handleReviewStaffApplication(staffApp.applicationId, 'approve')}>
                              {app.t('Onayla', 'Approve')}
                            </button>
                            <button type="button" className="btn btn-secondary" style={{ flex: 1, color: 'var(--rose)' }} onClick={() => app.handleReviewStaffApplication(staffApp.applicationId, 'reject')}>
                              {app.t('Reddet', 'Reject')}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleCard>
            )}
            
            {/* PM Afet Bildirimi */}
            {app.user.userType === 'PM' && (
              <CollapsibleCard title={app.t('Afet Bildirimi Yayınla', 'Publish Disaster Alert')} icon={ShieldAlert} defaultOpen={false}>
                <form onSubmit={app.handleDeclareDisaster} className="admin-form">
                  <div>
                    <label className="admin-form-label">{app.t('Afet şablonu (opsiyonel)', 'Disaster template (optional)')}</label>
                    <select
                      className="form-input"
                      value={app.disasterForm.typeId}
                      onChange={(e) => {
                        const dt = app.disasterTypes.find(d => String(d.typeId) === e.target.value);
                        app.setDisasterForm({
                          ...app.disasterForm,
                          typeId: e.target.value,
                          title: dt ? dt.name : app.disasterForm.title,
                          message: dt ? dt.suggestedMessage : app.disasterForm.message
                        });
                      }}
                    >
                      <option value="">{app.t('Şablon seçin…', 'Select template…')}</option>
                      {app.disasterTypes.map(d => (
                        <option key={d.typeId} value={d.typeId}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="admin-form-label">{app.t('Duyuru başlığı', 'Alert title')}</label>
                    <input className="form-input" placeholder={app.t('Örn: Deprem — Kadıköy', 'e.g. Earthquake — district')} value={app.disasterForm.title} onChange={(e) => app.setDisasterForm({ ...app.disasterForm, title: e.target.value })} required />
                  </div>
                  <div>
                    <label className="admin-form-label">{app.t('Duyuru metni', 'Alert message')}</label>
                    <textarea className="form-input" rows={3} placeholder={app.t('Vatandaşlara gidecek kısa talimat…', 'Short instructions for civilians…')} value={app.disasterForm.message} onChange={(e) => app.setDisasterForm({ ...app.disasterForm, message: e.target.value })} required />
                  </div>
                  <div>
                    <label className="admin-form-label">{app.t('Önem derecesi', 'Severity')}</label>
                    <select className="form-input" value={app.disasterForm.severity} onChange={(e) => app.setDisasterForm({ ...app.disasterForm, severity: e.target.value })}>
                      <option value="Critical">{app.t('Kritik (kırmızı banner)', 'Critical (red banner)')}</option>
                      <option value="Warning">{app.t('Uyarı', 'Warning')}</option>
                      <option value="Info">{app.t('Bilgi', 'Info')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="admin-form-label">{app.t('Afet bölgesi (harita)', 'Disaster zone (map)')}</label>
                    <div className="admin-form-row">
                      <input className="form-input" type="number" step="0.000001" placeholder={app.t('Enlem', 'Latitude')} value={app.disasterForm.zoneCenterLat} onChange={(e) => app.setDisasterForm({ ...app.disasterForm, zoneCenterLat: e.target.value })} />
                      <input className="form-input" type="number" step="0.000001" placeholder={app.t('Boylam', 'Longitude')} value={app.disasterForm.zoneCenterLng} onChange={(e) => app.setDisasterForm({ ...app.disasterForm, zoneCenterLng: e.target.value })} />
                      <input className="form-input admin-form-input--narrow" type="number" step="0.1" min="0.5" placeholder={app.t('km', 'km')} value={app.disasterForm.zoneRadiusKm} onChange={(e) => app.setDisasterForm({ ...app.disasterForm, zoneRadiusKm: e.target.value })} title={app.t('Yarıçap (km)', 'Radius (km)')} />
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ marginTop: '8px', width: '100%', fontSize: '12px' }}
                      onClick={() => { app.setMapPickPurpose('disaster'); app.setActiveTab('map'); app.setMapPickMode(true); }}
                    >
                      <Map style={{ width: '14px', height: '14px' }} />
                      {app.t('Haritadan merkez seç', 'Pick center on map')}
                    </button>
                  </div>
                  <button type="submit" className="btn btn-danger" style={{ width: '100%' }}>
                    <ShieldAlert style={{ width: '16px', height: '16px' }} />
                    {app.t('Afet bildirimini yayınla', 'Broadcast disaster alert')}
                  </button>
                </form>
              </CollapsibleCard>
            )}

            {app.user.userType === 'PM' && (
              <CollapsibleCard title={app.t('Geçmiş Afet Bildirimleri', 'Past Disaster Alerts')} icon={History} defaultOpen>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  {app.t('Aktif olan bildirim tüm panellerde ve haritada görünür. Pasife alınca kırmızı banner kalkar. Silinen kayıtlar geri alınamaz.', 'Active alerts appear on all panels and the map. Deactivating removes the red banner. Deleted records cannot be restored.')}
                </p>
                <DisasterHistoryPanel
                  items={app.disasterHistory}
                  editingZoneId={app.editingZoneId}
                  editForm={app.editDisasterForm}
                  setEditForm={app.setEditDisasterForm}
                  onStartEdit={app.startEditDisaster}
                  onCancelEdit={app.cancelEditDisaster}
                  onSaveEdit={app.handleUpdateDisaster}
                  onSetActive={app.handleSetDisasterActive}
                  onDelete={app.handleDeleteDisaster}
                  onPickMapCenter={(zoneId) => {
                    app.pickMapCenterForEdit(zoneId);
                    app.setActiveTab('map');
                  }}
                  t={app.t}
                />
              </CollapsibleCard>
            )}

            {/* PM manuel saha tespiti */}
            {app.user.userType === 'PM' && (
              <CollapsibleCard title={app.t('Manuel Saha Tespiti (kamera/enkaz)', 'Manual Field Detection')} icon={ShieldAlert} defaultOpen={false}>
                <form onSubmit={app.handleReportAiDetection} className="admin-form">
                  <div>
                    <label className="admin-form-label">{app.t('Tespitin yapıldığı ünite', 'Unit at detection site')}</label>
                    <select className="form-input" value={app.aiReportForm.unitId} onChange={(e) => app.setAiReportForm({ ...app.aiReportForm, unitId: e.target.value })} required>
                      <option value="">{app.t('Ünite seçin…', 'Select unit…')}</option>
                      {app.units.map(u => <option key={u.unitId} value={u.unitId}>U{u.unitId} — {u.serialNumber}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="admin-form-label">{app.t('Ne tespit edildi?', 'What was detected?')}</label>
                    <select className="form-input" value={app.aiReportForm.detectionType} onChange={(e) => app.setAiReportForm({ ...app.aiReportForm, detectionType: e.target.value })}>
                      {detectionTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{app.t(opt.labelTR, opt.labelEN)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-row">
                    <div>
                      <label className="admin-form-label">{app.t('Görülen kişi', 'People seen')}</label>
                      <input className="form-input" type="number" min="0" value={app.aiReportForm.personCount} onChange={(e) => app.setAiReportForm({ ...app.aiReportForm, personCount: e.target.value })} />
                    </div>
                    <div>
                      <label className="admin-form-label">{app.t('Hareketsiz kişi', 'Immobile')}</label>
                      <input className="form-input" type="number" min="0" value={app.aiReportForm.immobileCount} onChange={(e) => app.setAiReportForm({ ...app.aiReportForm, immobileCount: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>{app.t('Tespiti kaydet', 'Save detection')}</button>
                </form>
              </CollapsibleCard>
            )}

            {/* PM Dispatcher & Duty Assignment Form */}
            {app.user.userType === 'PM' && (
              <CollapsibleCard title={app.t('Saha Personeli Görev Atama', 'Field Dispatch & Tasking')} icon={Radio} defaultOpen={false}>
                <form onSubmit={app.handleAssignDuty} className="admin-form">
                  <div>
                    <label className="admin-form-label">{app.t('Personel', 'Staff member')}</label>
                    <select 
                      className="form-input"
                      value={app.assignDutyForm.staffId}
                      onChange={(e) => app.setAssignDutyForm({ ...app.assignDutyForm, staffId: e.target.value })}
                      required
                    >
                      <option value="">{app.t('Personel seçin…', 'Select staff…')}</option>
                      {app.staffList.map(s => (
                        <option key={s.staffId} value={s.staffId}>{s.fullName} — {formatRoleLabel(s.userType || s.specialization, app.lang)} ({formatStaffStatus(s.currentStatus, app.t)})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="admin-form-label">{app.t('Görev türü', 'Task type')}</label>
                    <select 
                      className="form-input"
                      value={app.assignDutyForm.dutyType}
                      onChange={(e) => {
                        app.setAssignDutyForm({
                          ...app.assignDutyForm,
                          dutyType: e.target.value,
                          refId: '',
                        });
                      }}
                    >
                      {dutyTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{app.t(opt.labelTR, opt.labelEN)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="admin-form-label">{app.t('Görev hedefi', 'Task target')}</label>
                    <select
                      className="form-input"
                      value={app.assignDutyForm.refId}
                      onChange={(e) => app.setAssignDutyForm({ ...app.assignDutyForm, refId: e.target.value })}
                      required
                    >
                      <option value="">{app.t('Hedef seçin…', 'Select target…')}</option>
                      {app.assignDutyForm.dutyType === 'Unit' && app.units.map((u) => (
                        <option key={u.unitId} value={u.unitId}>U{u.unitId} — {u.serialNumber}</option>
                      ))}
                      {app.assignDutyForm.dutyType === 'Sensor' && app.sensors.map((s) => (
                        <option key={s.sensorId} value={s.sensorId}>Sensör #{s.sensorId} — U{s.unitId} {s.sensorType}</option>
                      ))}
                      {app.assignDutyForm.dutyType === 'Missing' && (
                        app.missingPersons.filter((mp) => mp.status === 'Missing').length === 0
                          ? <option value="" disabled>{app.t('Aktif kayıp ilanı yok', 'No active missing reports')}</option>
                          : app.missingPersons.filter((mp) => mp.status === 'Missing').map((mp) => (
                            <option key={mp.reportId} value={mp.reportId}>#{mp.reportId} — {mp.missingPersonName}</option>
                          ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="admin-form-label">{app.t('Talimat', 'Instructions')}</label>
                    <input 
                      type="text" 
                      className="form-input"
                      placeholder={app.t('Örn: Ünite bataryasını kontrol et ve raporla', 'e.g. Check unit battery and report')}
                      value={app.assignDutyForm.summary}
                      onChange={(e) => app.setAssignDutyForm({ ...app.assignDutyForm, summary: e.target.value })}
                      required
                    />
                  </div>
                  <FieldDutyEtaPreview
                    staffId={app.assignDutyForm.staffId}
                    dutyType={app.assignDutyForm.dutyType}
                    refId={app.assignDutyForm.refId}
                    t={app.t}
                  />

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    <Radio style={{ width: '16px', height: '16px' }} />
                    {app.t('Görevi gönder', 'Dispatch task')}
                  </button>
                </form>
              </CollapsibleCard>
            )}

            {/* Saha sensör okuması — yalnızca PM */}
            {app.user.userType === 'PM' && (
              <CollapsibleCard title={app.t('Saha Sensör Okuması Kaydet', 'Record Sensor Reading')} icon={Radio} defaultOpen={false}>
                <form onSubmit={app.handleRecordSensorReading} className="admin-form">
                  <div className="admin-form-row">
                    <div>
                      <label className="admin-form-label">{app.t('Ünite', 'Unit')}</label>
                      <select 
                        className="form-input"
                        value={app.sensorReadingForm.unitId}
                        onChange={(e) => app.setSensorReadingForm({ ...app.sensorReadingForm, unitId: e.target.value })}
                        required
                      >
                        <option value="">{app.t('Ünite seçin…', 'Select unit…')}</option>
                        {app.units.map(u => (
                          <option key={u.unitId} value={u.unitId}>U{u.unitId} — {u.serialNumber}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="admin-form-label">{app.t('Sensör', 'Sensor')}</label>
                      <select 
                        className="form-input"
                        value={app.sensorReadingForm.sensorType}
                        onChange={(e) => {
                          const sensorType = e.target.value;
                          const defaultUnit = { Isi: 'C', Duman: '%', Gaz: 'ppm', Sismik: 'g', Nem: '%' }[sensorType] || '';
                          app.setSensorReadingForm({ ...app.sensorReadingForm, sensorType, unitOfMeasure: defaultUnit });
                        }}
                      >
                        <option value="Isi">{app.t('Sıcaklık', 'Temperature')}</option>
                        <option value="Duman">{app.t('Duman', 'Smoke')}</option>
                        <option value="Gaz">{app.t('Gaz', 'Gas')}</option>
                        <option value="Sismik">{app.t('Sismik', 'Seismic')}</option>
                        <option value="Nem">{app.t('Nem', 'Humidity')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="admin-form-row">
                    <div>
                      <label className="admin-form-label">{app.t('Değer', 'Value')}</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder={app.t('Örn: 24.5', 'e.g. 24.5')}
                        value={app.sensorReadingForm.currentValue}
                        onChange={(e) => app.setSensorReadingForm({ ...app.sensorReadingForm, currentValue: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="admin-form-label">{app.t('Birim', 'Unit')}</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="C / % / ppm"
                        value={app.sensorReadingForm.unitOfMeasure}
                        onChange={(e) => app.setSensorReadingForm({ ...app.sensorReadingForm, unitOfMeasure: e.target.value })}
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    <Radio style={{ width: '16px', height: '16px' }} />
                    {app.t('Okumayı kaydet', 'Save reading')}
                  </button>
                </form>
              </CollapsibleCard>
            )}

            {app.user.userType === 'PM' && (
              <CollapsibleCard title={app.t('Toplanma Alanları', 'Assembly Points')} icon={MapPin} defaultOpen={false}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  {app.t('Afet sırasında vatandaşların yönlendirileceği güvenli toplanma noktalarını tanımlayın. Aktif afet bildirimi varken haritada görünür.', 'Define safe assembly points for civilians during disasters. Shown on the map when a disaster alert is active.')}
                </p>
                <form onSubmit={app.handleCreateAssemblyPoint} className="admin-form">
                  <div>
                    <label className="admin-form-label">{app.t('Alan adı', 'Point name')}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={app.t('Örn: Kadıköy Meydan', 'e.g. Central Square')}
                      value={app.assemblyPointForm.name}
                      onChange={(e) => app.setAssemblyPointForm({ ...app.assemblyPointForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="admin-form-row">
                    <div>
                      <label className="admin-form-label">{app.t('Enlem', 'Latitude')}</label>
                      <input
                        type="text"
                        className="form-input"
                        value={app.assemblyPointForm.lat}
                        onChange={(e) => app.setAssemblyPointForm({ ...app.assemblyPointForm, lat: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="admin-form-label">{app.t('Boylam', 'Longitude')}</label>
                      <input
                        type="text"
                        className="form-input"
                        value={app.assemblyPointForm.lng}
                        onChange={(e) => app.setAssemblyPointForm({ ...app.assemblyPointForm, lng: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="admin-form-row">
                    <div>
                      <label className="admin-form-label">{app.t('Kapasite (opsiyonel)', 'Capacity (optional)')}</label>
                      <input
                        type="number"
                        className="form-input"
                        min="0"
                        value={app.assemblyPointForm.capacity}
                        onChange={(e) => app.setAssemblyPointForm({ ...app.assemblyPointForm, capacity: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={app.assemblyPointForm.active}
                          onChange={(e) => app.setAssemblyPointForm({ ...app.assemblyPointForm, active: e.target.checked })}
                        />
                        {app.t('Aktif', 'Active')}
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="admin-form-label">{app.t('Not', 'Notes')}</label>
                    <input
                      type="text"
                      className="form-input"
                      value={app.assemblyPointForm.notes}
                      onChange={(e) => app.setAssemblyPointForm({ ...app.assemblyPointForm, notes: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '12px' }}
                    onClick={() => { app.setActiveTab('map'); app.pickAssemblyLocation(); }}
                  >
                    <Map style={{ width: '14px', height: '14px' }} />
                    {app.t('Haritadan konum seç', 'Pick location on map')}
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    <PlusCircle style={{ width: '16px', height: '16px' }} />
                    {app.t('Toplanma alanı ekle', 'Add assembly point')}
                  </button>
                </form>

                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                  {app.assemblyPoints.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{app.t('Henüz toplanma alanı yok.', 'No assembly points yet.')}</p>
                  ) : (
                    app.assemblyPoints.map((ap) => (
                      <div key={ap.pointId} className="glass" style={{ padding: '10px 12px', borderRadius: '10px', fontSize: '12px' }}>
                        {app.editingAssemblyId === ap.pointId ? (
                          <form onSubmit={app.handleUpdateAssemblyPoint} className="admin-form" style={{ gap: '8px' }}>
                            <input className="form-input" value={app.editAssemblyForm.name} onChange={(e) => app.setEditAssemblyForm({ ...app.editAssemblyForm, name: e.target.value })} required />
                            <div className="admin-form-row">
                              <input className="form-input" value={app.editAssemblyForm.lat} onChange={(e) => app.setEditAssemblyForm({ ...app.editAssemblyForm, lat: e.target.value })} required />
                              <input className="form-input" value={app.editAssemblyForm.lng} onChange={(e) => app.setEditAssemblyForm({ ...app.editAssemblyForm, lng: e.target.value })} required />
                            </div>
                            <input className="form-input" placeholder={app.t('Kapasite', 'Capacity')} value={app.editAssemblyForm.capacity} onChange={(e) => app.setEditAssemblyForm({ ...app.editAssemblyForm, capacity: e.target.value })} />
                            <input className="form-input" placeholder={app.t('Not', 'Notes')} value={app.editAssemblyForm.notes} onChange={(e) => app.setEditAssemblyForm({ ...app.editAssemblyForm, notes: e.target.value })} />
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                              <input type="checkbox" checked={app.editAssemblyForm.active} onChange={(e) => app.setEditAssemblyForm({ ...app.editAssemblyForm, active: e.target.checked })} />
                              {app.t('Aktif', 'Active')}
                            </label>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button type="submit" className="btn btn-primary" style={{ flex: 1, fontSize: '11px' }}>{app.t('Kaydet', 'Save')}</button>
                              <button type="button" className="btn btn-secondary" style={{ flex: 1, fontSize: '11px' }} onClick={app.cancelEditAssembly}>{app.t('İptal', 'Cancel')}</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center' }}>
                              <strong>{ap.name}</strong>
                              <span className={ap.active ? 'badge-green' : 'badge-grey'} style={{ fontSize: '9px' }}>
                                {ap.active ? app.t('Aktif', 'Active') : app.t('Pasif', 'Inactive')}
                              </span>
                            </div>
                            <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                              {ap.lat?.toFixed?.(4) ?? ap.latitude} · {ap.lng?.toFixed?.(4) ?? ap.longitude}
                              {ap.capacity != null ? ` · ${ap.capacity} ${app.t('kişi', 'people')}` : ''}
                            </p>
                            {ap.notes && <p style={{ marginTop: '2px' }}>{ap.notes}</p>}
                            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                              <button type="button" className="btn btn-secondary" style={{ flex: 1, fontSize: '11px' }} onClick={() => app.startEditAssembly(ap)}>{app.t('Düzenle', 'Edit')}</button>
                              <button type="button" className="btn btn-secondary" style={{ flex: 1, fontSize: '11px', color: 'var(--rose)' }} onClick={() => app.handleDeleteAssemblyPoint(ap.pointId, ap.name)}>{app.t('Sil', 'Delete')}</button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleCard>
            )}

            {/* PM Add New Field Unit Form */}
            {app.user.userType === 'PM' && (
              <CollapsibleCard title={app.t('Saha İletişim Ünitesi Ekle', 'Register Field Hub')} icon={PlusCircle} defaultOpen={false}>
                <form onSubmit={app.handleCreateUnit} className="admin-form">
                  <div>
                    <label className="admin-form-label">{app.t('Seri numarası', 'Serial number')}</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="HUB-KDK-01"
                      value={app.newUnit.serialNumber}
                      onChange={(e) => app.setNewUnit({ ...app.newUnit, serialNumber: e.target.value })}
                      required
                    />
                  </div>

                  <div className="admin-form-row">
                    <div>
                      <label className="admin-form-label">{app.t('Enlem', 'Latitude')}</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="41.0082"
                        value={app.newUnit.latitude}
                        onChange={(e) => app.setNewUnit({ ...app.newUnit, latitude: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="admin-form-label">{app.t('Boylam', 'Longitude')}</label>
                      <input 
                        type="text" 
                        className="form-input"
                        placeholder="28.9784"
                        value={app.newUnit.longitude}
                        onChange={(e) => app.setNewUnit({ ...app.newUnit, longitude: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                    <PlusCircle style={{ width: '16px', height: '16px' }} />
                    {app.t('Üniteyi kaydet', 'Register unit')}
                  </button>
                </form>
              </CollapsibleCard>
            )}

            {/* List active sensors */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '10px' }}>
                {app.t('Saha Sensörleri Durumu', 'Sensing Array Grid')}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {app.sensors.map((s) => (
                  <div key={s.sensorId} className="glass" style={{ borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <div>
                      <strong>U{s.unitId}</strong> - {s.sensorType}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--primary)' }}>{s.currentValue ?? '—'} {s.unitOfMeasure ?? ''}</span>
                      <span className={s.status === 'Online' ? 'badge-green' : 'badge-red'} style={{ fontSize: '8px', padding: '1px 3px' }}>{formatSensorStatus(s.status, app.t)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
  );
}
