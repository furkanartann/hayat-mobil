import { useState } from 'react';
import { apiFetch } from '../../../api/client.js';
import { buildDispatchNote } from '../../../components/shared/EtaBadge.jsx';
import { fetchTicketDispatchEta } from '../../../lib/dispatchEta.js';
import { initialTriageForRequest } from '../../../lib/tickets.js';

export function useTicketActions({
  user, t, toast, networkErrorMsg, readApiError, genericErrorMsg, invalidateAppData,
}) {
  const [newTicket, setNewTicket] = useState({ requestType: 'Rescue', updateNote: '' });
  const [sosFormKey, setSosFormKey] = useState(0);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      let reporterLat = null;
      let reporterLng = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
          });
          reporterLat = pos.coords.latitude;
          reporterLng = pos.coords.longitude;
          await apiFetch('/api/users/me/location', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: reporterLat, longitude: reporterLng })
          });
        } catch {
          // SOS without coords is still allowed
        }
      }

      const triageColor = user.userType === 'Afetzede'
        ? initialTriageForRequest(newTicket.requestType)
        : 'Yellow';

      const res = await apiFetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestorUserID: user.userId,
          requestType: newTicket.requestType,
          triageColor,
          unitID: null,
          updateNote: newTicket.updateNote,
          reporterLat,
          reporterLng
        })
      });
      if (res.ok) {
        setNewTicket({ requestType: 'Rescue', updateNote: '' });
        invalidateAppData();
        toast(t('Talep oluşturuldu.', 'Request created.'), 'success');
      } else {
        toast(await readApiError(res), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const handleUpdateTicketStatus = async (ticketId, status, staffId, note) => {
    try {
      let finalNote = note;
      if (status === 'In_Progress' && staffId) {
        try {
          const eta = await fetchTicketDispatchEta({ ticketId, staffId });
          finalNote = buildDispatchNote({ teamLabel: note, eta, t });
        } catch {
          // keep original note if routing unavailable
        }
      }

      const res = await apiFetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          assignedStaffID: staffId ? parseInt(staffId) : null,
          updateNote: finalNote,
          dispatcherUserID: user?.userId ?? null
        })
      });
      const data = await res.json();
      if (res.ok) {
        invalidateAppData();
        toast(t('Talep durumu güncellendi.', 'Ticket status updated.'), 'success');
        return true;
      }
      toast(data.error || genericErrorMsg, 'error');
      return false;
    } catch {
      toast(networkErrorMsg, 'error');
      return false;
    }
  };

  return {
    newTicket, setNewTicket, sosFormKey, setSosFormKey,
    handleCreateTicket, handleUpdateTicketStatus,
  };
}
