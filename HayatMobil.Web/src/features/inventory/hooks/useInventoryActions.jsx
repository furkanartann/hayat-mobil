import React, { useEffect, useMemo } from 'react';
import { useState } from 'react';
import { apiFetch } from '../../../api/client.js';
import { getLogisticsAssignableStaff } from '../../../lib/tickets.js';
import DistributionForm from '../components/DistributionForm.jsx';

export function useInventoryActions({
  user, t, toast, networkErrorMsg,
  tickets, inventory, staffList, invalidateAppData, handleUpdateTicketStatus,
}) {
  const [distributeForm, setDistributeForm] = useState({
    itemId: '', quantityDistributed: '1', targetMode: 'ticket', ticketId: '',
    transportType: 'Manual', distributionNote: '', assignedStaffId: ''
  });

  const logisticsSupplyTickets = tickets.filter(
    (tk) => ['Food', 'Water', 'Structural'].includes(tk.requestType) && !['Resolved', 'Cancelled'].includes(tk.status)
  );

  const linkedTicket = useMemo(() => {
    if (distributeForm.targetMode !== 'ticket' || !distributeForm.ticketId) return null;
    return tickets.find((tk) => String(tk.ticketId) === String(distributeForm.ticketId)) ?? null;
  }, [distributeForm.targetMode, distributeForm.ticketId, tickets]);

  useEffect(() => {
    if (linkedTicket?.status === 'In_Progress' && linkedTicket.assignedStaffId) {
      setDistributeForm((f) => ({ ...f, assignedStaffId: String(linkedTicket.assignedStaffId) }));
      return;
    }
    if (!distributeForm.assignedStaffId && user?.staffId && user?.userType === 'Lojistik') {
      setDistributeForm((f) => ({ ...f, assignedStaffId: String(user.staffId) }));
    }
  }, [user?.staffId, user?.userType, linkedTicket?.ticketId, linkedTicket?.status, linkedTicket?.assignedStaffId, distributeForm.assignedStaffId]);

  const assignableLogisticsStaff = useMemo(
    () => getLogisticsAssignableStaff(staffList, linkedTicket),
    [staffList, linkedTicket]
  );

  const distRequestTypeLabel = (type) => ({
    Food: t('Gıda', 'Food'),
    Water: t('Su', 'Water'),
    Structural: t('Barınma', 'Shelter')
  }[type] || type);

  const handleDistribute = async (e) => {
    e.preventDefault();

    const selectedItem = inventory.find((i) => String(i.itemId) === String(distributeForm.itemId));
    const qty = parseInt(distributeForm.quantityDistributed, 10);
    if (!selectedItem || !qty || qty < 1) {
      toast(t('Geçerli malzeme ve miktar seçin.', 'Select a valid item and quantity.'), 'error');
      return;
    }
    if (qty > selectedItem.stockCount) {
      toast(t(`Stok yetersiz. Mevcut: ${selectedItem.stockCount}`, `Insufficient stock. Available: ${selectedItem.stockCount}`), 'error');
      return;
    }

    const courierStaffId = parseInt(distributeForm.assignedStaffId, 10);
    const courier = assignableLogisticsStaff.find((s) => s.staffId === courierStaffId);
    if (!courier) {
      toast(t('Lojistik ekibinden sevkiyat personeli seçin.', 'Select a logistics team member for dispatch.'), 'error');
      return;
    }

    let receiverUserId = null;
    let distributionNote = distributeForm.distributionNote?.trim() || '';
    const courierNote = `${t('Kurye', 'Courier')}: ${courier.fullName}`;

    if (distributeForm.targetMode === 'ticket') {
      if (!distributeForm.ticketId) {
        toast(t('Lütfen teslim edilecek yardım talebini seçin.', 'Please select the help request to fulfill.'), 'error');
        return;
      }
      if (!linkedTicket) {
        toast(t('Seçilen talep bulunamadı.', 'Selected request not found.'), 'error');
        return;
      }
      if (linkedTicket.status === 'In_Progress' && linkedTicket.assignedStaffId && linkedTicket.assignedStaffId !== courierStaffId) {
        toast(t('Bu talep başka bir lojistik personeline atanmış.', 'This request is assigned to another logistics member.'), 'error');
        return;
      }
      receiverUserId = linkedTicket.requestorUserId;
      const autoNote = `SOS #${linkedTicket.ticketId} · ${linkedTicket.requestorName} (${linkedTicket.requestType})`;
      distributionNote = distributionNote ? `${autoNote} — ${distributionNote} · ${courierNote}` : `${autoNote} · ${courierNote}`;
    } else {
      distributionNote = distributionNote
        ? `${distributionNote} · ${courierNote}`
        : `${t('Genel saha / toplu dağıtım', 'General field / bulk distribution')} · ${courierNote}`;
    }

    try {
      if (linkedTicket?.status === 'Open') {
        const dispatched = await handleUpdateTicketStatus(
          linkedTicket.ticketId,
          'In_Progress',
          courierStaffId,
          t('Malzeme sevkiyatı için yönlendirildi.', 'Dispatched for supply delivery.')
        );
        if (!dispatched) return;
      }

      const res = await apiFetch('/api/inventory/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemID: parseInt(distributeForm.itemId, 10),
          quantityDistributed: qty,
          receiverUserID: receiverUserId,
          distributedByStaff: user.userId,
          courierStaffID: courierStaffId,
          transportType: distributeForm.transportType,
          distributionNote
        })
      });
      const data = await res.json();
      if (res.ok) {
        if (linkedTicket && linkedTicket.status !== 'Resolved') {
          await handleUpdateTicketStatus(
            linkedTicket.ticketId,
            'Resolved',
            courierStaffId,
            t('Malzeme teslim edildi, talep kapatıldı.', 'Supplies delivered, request closed.')
          );
        }
        setDistributeForm({
          itemId: '', quantityDistributed: '1', targetMode: 'ticket', ticketId: '',
          transportType: 'Manual', distributionNote: '', assignedStaffId: user?.staffId ? String(user.staffId) : ''
        });
        invalidateAppData();
        toast(t('Malzeme dağıtımı kaydedildi.', 'Supply distribution logged.'), 'success');
      } else {
        toast(data.error || t('Hata oluştu.', 'An error occurred.'), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const renderDistributionForm = () => (
    <DistributionForm
      t={t}
      distributeForm={distributeForm}
      setDistributeForm={setDistributeForm}
      logisticsSupplyTickets={logisticsSupplyTickets}
      distRequestTypeLabel={distRequestTypeLabel}
      inventory={inventory}
      assignableLogisticsStaff={assignableLogisticsStaff}
      onSubmit={handleDistribute}
    />
  );

  return {
    distributeForm, setDistributeForm,
    logisticsSupplyTickets, distRequestTypeLabel,
    handleDistribute, renderDistributionForm,
  };
}
