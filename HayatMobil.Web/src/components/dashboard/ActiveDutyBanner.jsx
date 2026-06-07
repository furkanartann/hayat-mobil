import React from 'react';
import { CheckCircle, ShieldAlert } from 'lucide-react';
import EtaBadge from '../shared/EtaBadge.jsx';

export default function ActiveDutyBanner({
  duty,
  eta,
  etaLoading = false,
  onComplete,
  t = (tr) => tr,
}) {
  if (!duty) return null;

  return (
    <div
      className="glass"
      style={{
        borderLeft: '4px solid var(--rose)',
        borderRadius: '12px',
        padding: '14px',
        background: 'rgba(239, 68, 68, 0.05)',
        marginBottom: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
        <span style={{ display: 'flex', gap: '4px', alignItems: 'center', color: 'var(--rose)', fontWeight: 'bold', fontSize: '13px' }}>
          <ShieldAlert style={{ width: '15px', height: '15px' }} />
          {t('AKTİF GÖREVİNİZ', 'ACTIVE ASSIGNMENT')}
        </span>
        <EtaBadge
          durationSeconds={eta?.durationSeconds}
          distanceMeters={eta?.distanceMeters}
          etaMinutes={duty.etaMinutes}
          fallback={eta?.fallback ?? true}
          loading={etaLoading}
          t={t}
          compact
        />
      </div>
      <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-main)' }}>
        {t('Görev: ', 'Task: ')}{duty.dutyType} (ID: {duty.refId})
      </h4>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px' }}>{duty.summary}</p>
      <button
        type="button"
        onClick={onComplete}
        className="btn btn-primary"
        style={{ width: '100%', padding: '8px', fontSize: '13px', background: 'var(--emerald)', color: 'white', boxShadow: 'none' }}
      >
        <CheckCircle style={{ width: '14px', height: '14px' }} />
        {t('Görevi Tamamla', 'Complete Duty')}
      </button>
    </div>
  );
}
