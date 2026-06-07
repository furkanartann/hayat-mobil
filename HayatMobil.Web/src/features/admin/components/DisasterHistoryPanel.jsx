import React from 'react';
import { Map, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { formatDbDateTimeLocal } from '../../../lib/datetime.js';

export default function DisasterHistoryPanel({
  items = [],
  editingZoneId,
  editForm,
  setEditForm,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onSetActive,
  onDelete,
  onPickMapCenter,
  t = (tr) => tr,
}) {
  if (items.length === 0) {
    return (
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
        {t('Henüz yayınlanmış afet bölgesi yok.', 'No published disaster zones yet.')}
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {items.map((item) => {
        const isEditing = editingZoneId === item.zoneId;
        return (
          <div key={item.zoneId} className="glass disaster-history-item" style={{ padding: '12px', borderRadius: '12px' }}>
            <div className="disaster-history-item__head" style={{ marginBottom: isEditing ? '10px' : 0 }}>
              <div className="disaster-history-item__content">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '14px' }}>{item.title}</strong>
                  <span className={`badge ${item.active ? 'badge-red' : 'badge-grey'}`}>
                    {item.active ? t('AKTİF', 'ACTIVE') : t('PASİF', 'INACTIVE')}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px', lineHeight: 1.4 }}>
                  {item.message || t('(Mesaj yok)', '(No message)')}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                  {formatDbDateTimeLocal(item.declaredAt) || '—'}
                  {' · '}
                  {item.radiusKm} km
                  {' · '}
                  {item.centerLat?.toFixed?.(4)}, {item.centerLng?.toFixed?.(4)}
                </p>
              </div>
              {!isEditing && (
                <div className="disaster-history-item__actions">
                  <button
                    type="button"
                    className="btn btn-secondary disaster-history-item__btn"
                    onClick={() => onStartEdit(item)}
                  >
                    <Pencil size={13} />
                    {t('Düzenle', 'Edit')}
                  </button>
                  {item.active ? (
                    <button
                      type="button"
                      className="btn btn-secondary disaster-history-item__btn disaster-history-item__btn--danger"
                      onClick={() => onSetActive(item.zoneId, false)}
                    >
                      <PowerOff size={13} />
                      {t('Pasife al', 'Deactivate')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary disaster-history-item__btn"
                      onClick={() => onSetActive(item.zoneId, true)}
                    >
                      <Power size={13} />
                      {t('Aktif et', 'Activate')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary disaster-history-item__btn disaster-history-item__btn--danger"
                    onClick={() => onDelete(item.zoneId, item.title)}
                  >
                    <Trash2 size={13} />
                    {t('Sil', 'Delete')}
                  </button>
                </div>
              )}
            </div>

            {isEditing && (
              <form onSubmit={onSaveEdit} className="admin-form" style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                <div>
                  <label className="admin-form-label">{t('Duyuru başlığı', 'Alert title')}</label>
                  <input className="form-input" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} required />
                </div>
                <div>
                  <label className="admin-form-label">{t('Duyuru metni', 'Alert message')}</label>
                  <textarea className="form-input" rows={3} value={editForm.message} onChange={(e) => setEditForm((f) => ({ ...f, message: e.target.value }))} required />
                </div>
                <div>
                  <label className="admin-form-label">{t('Önem derecesi', 'Severity')}</label>
                  <select className="form-input" value={editForm.severity} onChange={(e) => setEditForm((f) => ({ ...f, severity: e.target.value }))}>
                    <option value="Critical">{t('Kritik', 'Critical')}</option>
                    <option value="Warning">{t('Uyarı', 'Warning')}</option>
                    <option value="Info">{t('Bilgi', 'Info')}</option>
                  </select>
                </div>
                <div>
                  <label className="admin-form-label">{t('Afet bölgesi', 'Disaster zone')}</label>
                  <div className="admin-form-row">
                    <input className="form-input" type="number" step="0.000001" placeholder={t('Enlem', 'Lat')} value={editForm.centerLat} onChange={(e) => setEditForm((f) => ({ ...f, centerLat: e.target.value }))} required />
                    <input className="form-input" type="number" step="0.000001" placeholder={t('Boylam', 'Lng')} value={editForm.centerLng} onChange={(e) => setEditForm((f) => ({ ...f, centerLng: e.target.value }))} required />
                    <input className="form-input admin-form-input--narrow" type="number" step="0.1" min="0.5" value={editForm.radiusKm} onChange={(e) => setEditForm((f) => ({ ...f, radiusKm: e.target.value }))} required />
                  </div>
                  <button type="button" className="btn btn-secondary" style={{ marginTop: '8px', width: '100%', fontSize: '12px' }} onClick={() => onPickMapCenter(item.zoneId)}>
                    <Map size={14} />
                    {t('Haritadan merkez seç', 'Pick center on map')}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{t('Kaydet', 'Save')}</button>
                  <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancelEdit}>{t('İptal', 'Cancel')}</button>
                </div>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
