import React from 'react';
import { Truck } from 'lucide-react';
import { formatStaffStatus } from '../../../lib/statusLabels.js';

export default function DistributionForm({
  t,
  distributeForm,
  setDistributeForm,
  logisticsSupplyTickets,
  distRequestTypeLabel,
  inventory,
  assignableLogisticsStaff = [],
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="distribution-form" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
          {t('Dağıtım hedefi', 'Distribution target')}
        </label>
        <div className="dist-target-row">
          <button
            type="button"
            className={`dist-target-chip ${distributeForm.targetMode === 'ticket' ? 'is-selected' : ''}`}
            onClick={() => setDistributeForm({ ...distributeForm, targetMode: 'ticket' })}
          >
            <span className="dist-target-chip-title">{t('SOS talebine teslim', 'Deliver to SOS request')}</span>
            <span className="dist-target-chip-sub">{t('Açık gıda/su/barınma talepleri', 'Open food/water/shelter requests')}</span>
          </button>
          <button
            type="button"
            className={`dist-target-chip ${distributeForm.targetMode === 'general' ? 'is-selected' : ''}`}
            onClick={() => setDistributeForm({ ...distributeForm, targetMode: 'general', ticketId: '' })}
          >
            <span className="dist-target-chip-title">{t('Genel saha dağıtımı', 'General field distribution')}</span>
            <span className="dist-target-chip-sub">{t('Toplu veya noktasal dağıtım', 'Bulk or point distribution')}</span>
          </button>
        </div>
      </div>

      {distributeForm.targetMode === 'ticket' && (
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {t('Yardım talebi', 'Help request')}
          </label>
          <select
            className="form-input"
            value={distributeForm.ticketId}
            onChange={(e) => setDistributeForm({ ...distributeForm, ticketId: e.target.value })}
            required
          >
            <option value="">{t('Talep seçin...', 'Select request...')}</option>
            {logisticsSupplyTickets.map((tk) => (
              <option key={tk.ticketId} value={tk.ticketId}>
                #{tk.ticketId} · {tk.requestorName} · {distRequestTypeLabel(tk.requestType)}
                {tk.status === 'In_Progress' ? ` (${t('dağıtımda', 'in progress')})` : ''}
              </option>
            ))}
          </select>
          {logisticsSupplyTickets.length === 0 && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {t('Açık lojistik talebi yok. Genel saha dağıtımını kullanın.', 'No open logistics requests. Use general field distribution.')}
            </p>
          )}
        </div>
      )}

      <div>
        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          {t('Lojistik ekibi', 'Logistics team')}
        </label>
        <select
          className="form-input"
          value={distributeForm.assignedStaffId}
          onChange={(e) => setDistributeForm({ ...distributeForm, assignedStaffId: e.target.value })}
          required
        >
          <option value="">{t('Sevkiyat personeli seçin...', 'Select dispatch crew...')}</option>
          {assignableLogisticsStaff.map((s) => (
            <option key={s.staffId} value={s.staffId}>
              {s.fullName} ({formatStaffStatus(s.currentStatus, t)})
            </option>
          ))}
        </select>
        {assignableLogisticsStaff.length === 0 && (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {t('Müsait lojistik personeli yok. PM panelinden ekip durumunu kontrol edin.', 'No available logistics staff. Check team status in the PM panel.')}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('Malzeme', 'Item')}</label>
          <select
            className="form-input"
            value={distributeForm.itemId}
            onChange={(e) => setDistributeForm({ ...distributeForm, itemId: e.target.value })}
            required
          >
            <option value="">{t('Seçiniz...', 'Select...')}</option>
            {inventory.map((i) => (
              <option key={i.itemId} value={i.itemId}>{i.itemName} ({i.stockCount} {t('adet', 'qty')})</option>
            ))}
          </select>
        </div>
        <div style={{ width: '80px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('Miktar', 'Qty')}</label>
          <input
            type="number"
            className="form-input"
            min="1"
            value={distributeForm.quantityDistributed}
            onChange={(e) => setDistributeForm({ ...distributeForm, quantityDistributed: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{t('Taşıma tipi', 'Transport')}</label>
        <select
          className="form-input"
          value={distributeForm.transportType}
          onChange={(e) => setDistributeForm({ ...distributeForm, transportType: e.target.value })}
        >
          <option value="Manual">{t('Elden teslim', 'Handover')}</option>
          <option value="Drone">{t('Otonom İHA (Drone)', 'Drone delivery')}</option>
          <option value="Vehicle">{t('Kara aracı', 'Land vehicle')}</option>
          <option value="Helicopter">{t('Helikopter', 'Helicopter')}</option>
        </select>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          {t('Ek not (isteğe bağlı)', 'Additional note (optional)')}
        </label>
        <input
          type="text"
          className="form-input"
          placeholder={distributeForm.targetMode === 'general'
            ? t('Örn: Toplama noktasına 50 su bidonu bırakıldı.', 'e.g. 50 water cans left at collection point.')
            : t('Örn: Çadır ve battaniye teslim edildi.', 'e.g. Tent and blankets delivered.')}
          value={distributeForm.distributionNote}
          onChange={(e) => setDistributeForm({ ...distributeForm, distributionNote: e.target.value })}
        />
      </div>

      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '6px' }}>
        <Truck style={{ width: '16px', height: '16px' }} />
        {t('Sevkiyatı tamamla', 'Log dispatch')}
      </button>
    </form>
  );
}
