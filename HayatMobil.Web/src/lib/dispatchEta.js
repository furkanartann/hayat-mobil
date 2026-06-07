import { apiFetch } from '../api/client.js';

export async function fetchFieldDutyEta({ staffId, dutyType, refId }) {
  const q = new URLSearchParams({
    staffId: String(staffId),
    dutyType,
    refId: String(refId),
  });
  const res = await apiFetch(`/api/staff/dispatch-eta?${q}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'ETA unavailable');
  }
  return res.json();
}

export async function fetchTicketDispatchEta({ ticketId, staffId }) {
  const q = new URLSearchParams({ staffId: String(staffId) });
  const res = await apiFetch(`/api/tickets/${ticketId}/dispatch-eta?${q}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'ETA unavailable');
  }
  return res.json();
}
