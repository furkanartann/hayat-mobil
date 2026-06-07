import React, { useEffect, useState } from 'react';
import { fetchTicketDispatchEta } from '../../../lib/dispatchEta.js';
import EtaBadge from '../../../components/shared/EtaBadge.jsx';

export default function PmAssignEtaPreview({ ticketId, staffId, t = (tr) => tr }) {
  const [eta, setEta] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ticketId || !staffId) {
      setEta(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    fetchTicketDispatchEta({ ticketId, staffId })
      .then((data) => { if (!cancelled) setEta(data); })
      .catch(() => { if (!cancelled) setEta(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [ticketId, staffId]);

  if (!staffId) return null;

  return (
    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, display: 'flex', gap: '6px', alignItems: 'center' }}>
      <span>{t('Tahmini varış:', 'ETA:')}</span>
      <EtaBadge
        durationSeconds={eta?.durationSeconds}
        distanceMeters={eta?.distanceMeters}
        etaMinutes={eta?.etaMinutes}
        fallback={eta?.fallback}
        loading={loading}
        t={t}
        compact
      />
    </p>
  );
}
