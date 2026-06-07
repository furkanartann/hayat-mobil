import React from 'react';
import { useAssignDutyEta } from '../hooks/useAssignDutyEta.js';
import EtaBadge from '../../../components/shared/EtaBadge.jsx';

export default function FieldDutyEtaPreview({ staffId, dutyType, refId, t = (tr) => tr }) {
  const { eta, loading } = useAssignDutyEta({ staffId, dutyType, refId });

  if (!staffId || !refId) {
    return (
      <p className="admin-eta-preview admin-eta-preview--muted">
        {t('Personel ve hedef seçildiğinde rota süresi hesaplanır.', 'Select staff and target to calculate route time.')}
      </p>
    );
  }

  return (
    <div className="admin-eta-preview">
      <span className="admin-eta-preview__label">{t('Tahmini varış', 'Estimated arrival')}</span>
      <EtaBadge
        durationSeconds={eta?.durationSeconds}
        distanceMeters={eta?.distanceMeters}
        etaMinutes={eta?.etaMinutes}
        fallback={eta?.fallback}
        loading={loading}
        t={t}
      />
    </div>
  );
}
