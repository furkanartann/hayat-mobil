import { useEffect, useState } from 'react';
import { fetchFieldDutyEta } from '../../../lib/dispatchEta.js';
import { etaForFieldDuty } from '../../../lib/eta.js';

export function useAssignDutyEta({ staffId, dutyType, refId }) {
  const [eta, setEta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!staffId || !dutyType || !refId) {
      setEta(null);
      setError(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await fetchFieldDutyEta({ staffId, dutyType, refId });
        if (!cancelled) setEta(data);
      } catch (e) {
        if (!cancelled) {
          setEta({
            etaMinutes: etaForFieldDuty(dutyType),
            distanceMeters: null,
            durationSeconds: etaForFieldDuty(dutyType) * 60,
            fallback: true,
          });
          setError(e.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [staffId, dutyType, refId]);

  return { eta, loading, error };
}
