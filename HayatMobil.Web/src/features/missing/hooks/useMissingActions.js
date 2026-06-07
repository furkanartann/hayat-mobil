import { useState } from 'react';
import { apiFetch } from '../../../api/client.js';

export function useMissingActions({
  user, t, toast, networkErrorMsg, readApiError, userLocation, invalidateAppData,
}) {
  const [newMissing, setNewMissing] = useState({
    missingPersonName: '', age: '', physicalDescription: '', lastSeenPlace: ''
  });

  const handleCreateMissing = async (e) => {
    e.preventDefault();
    try {
      let lastKnownLat = userLocation?.lat ?? null;
      let lastKnownLng = userLocation?.lng ?? null;
      if ((lastKnownLat == null || lastKnownLng == null) && navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
          });
          lastKnownLat = pos.coords.latitude;
          lastKnownLng = pos.coords.longitude;
        } catch {
          // coordinates optional
        }
      }

      const descParts = [newMissing.physicalDescription.trim()];
      if (newMissing.lastSeenPlace.trim()) {
        descParts.push(`${t('Son görüldüğü yer', 'Last seen at')}: ${newMissing.lastSeenPlace.trim()}`);
      }
      const fullDescription = descParts.filter(Boolean).join('\n');

      const res = await apiFetch('/api/missing-persons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterUserID: user.userId,
          missingPersonName: newMissing.missingPersonName,
          age: newMissing.age ? parseInt(newMissing.age) : null,
          physicalDescription: fullDescription,
          lastKnownLat,
          lastKnownLong: lastKnownLng
        })
      });
      if (res.ok) {
        setNewMissing({ missingPersonName: '', age: '', physicalDescription: '', lastSeenPlace: '' });
        invalidateAppData();
        toast(t('Kayıp bildirimi eklendi.', 'Missing report added.'), 'success');
      } else {
        toast(await readApiError(res), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const handleUpdateMissingStatus = async (reportId, status) => {
    try {
      const res = await apiFetch(`/api/missing-persons/${reportId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        invalidateAppData();
        toast(
          status === 'Found'
            ? t('Kayıp kişi bulundu olarak işaretlendi.', 'Marked as found.')
            : t('Kayıp ilanı durumu güncellendi.', 'Missing report status updated.'),
          'success'
        );
      } else {
        toast(await readApiError(res), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  return {
    newMissing, setNewMissing,
    handleCreateMissing, handleUpdateMissingStatus,
  };
}
