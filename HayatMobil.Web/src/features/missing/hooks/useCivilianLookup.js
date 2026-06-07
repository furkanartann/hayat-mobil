import { useState, useEffect } from 'react';
import { apiFetch, hasAuthSession } from '../../../api/client.js';

export function useCivilianLookup({ user, userLocation }) {
  const [civilianSearch, setCivilianSearch] = useState('');
  const [civilianLookupResults, setCivilianLookupResults] = useState([]);
  const [civilianLookupLoading, setCivilianLookupLoading] = useState(false);
  const [civilianLookupDetail, setCivilianLookupDetail] = useState(null);

  const enabled = user?.userType === 'Afetzede';

  useEffect(() => {
    if (!enabled) {
      setCivilianLookupResults([]);
      return undefined;
    }

    const q = civilianSearch.trim();
    if (q.length < 2) {
      setCivilianLookupResults([]);
      setCivilianLookupLoading(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      if (!hasAuthSession()) return;
      setCivilianLookupLoading(true);
      try {
        const params = new URLSearchParams({ q });
        if (userLocation?.lat != null && userLocation?.lng != null) {
          params.set('fromLat', String(userLocation.lat));
          params.set('fromLng', String(userLocation.lng));
        }
        const res = await apiFetch(`/api/civilian-lookup?${params}`);
        if (res.ok) {
          setCivilianLookupResults(await res.json());
        } else {
          setCivilianLookupResults([]);
        }
      } catch {
        setCivilianLookupResults([]);
      } finally {
        setCivilianLookupLoading(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [civilianSearch, enabled, userLocation?.lat, userLocation?.lng]);

  return {
    civilianSearch,
    setCivilianSearch,
    civilianLookupResults,
    civilianLookupLoading,
    civilianLookupDetail,
    setCivilianLookupDetail,
  };
}
