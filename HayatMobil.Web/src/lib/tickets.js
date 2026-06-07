export const isOpenMedicalTicket = (ticket) =>
  ticket.requestType === 'Medical' && !['Resolved', 'Cancelled'].includes(ticket.status);

export const getParamedicQueue = (tickets) =>
  tickets.filter((tk) => isOpenMedicalTicket(tk) && !tk.referredToDoctor);

export const getDoctorReferralQueue = (tickets) =>
  tickets.filter((tk) => isOpenMedicalTicket(tk) && tk.referredToDoctor);

/** SOS sekmesi: doktor tüm açık tıbbi talepleri görür (sevk bekleyenler dahil) */
export const getDoctorTicketsForTab = (tickets) =>
  tickets.filter((tk) => isOpenMedicalTicket(tk));

export const canDoctorActOnTicket = (ticket) =>
  isOpenMedicalTicket(ticket) && !!ticket.referredToDoctor;

export const staffMatchesTicket = (staff, ticket) => {
  const role = staff.userType || staff.specialization;
  return ticketMatchesRole(ticket, role);
};

/** PM ataması: yalnızca talep türüne uygun ve müsait personel */
export function getPmAssignableStaff(staffList, ticket) {
  return (staffList ?? []).filter(
    (s) => (s.currentStatus === 'Available' || s.currentStatus === 'Resting')
      && staffMatchesTicket(s, ticket)
  );
}

/** Malzeme dağıtımı: lojistik ekibinden atanabilir personel */
export function getLogisticsAssignableStaff(staffList, linkedTicket = null) {
  return (staffList ?? []).filter((s) => {
    const role = s.userType || s.specialization;
    if (role !== 'Lojistik') return false;
    if (linkedTicket?.status === 'In_Progress' && linkedTicket.assignedStaffId) {
      return linkedTicket.assignedStaffId === s.staffId;
    }
    return s.currentStatus === 'Available' || s.currentStatus === 'Resting' || s.currentStatus === 'On_Duty';
  });
}

/** PM için hangi rollerin atanabileceğini açıklar */
export function getDispatchRoleHint(ticket, t = (tr) => tr) {
  switch (ticket.requestType) {
    case 'Medical':
      return ticket.referredToDoctor
        ? t('Atanabilir rol: Doktor (sevk edilmiş vaka)', 'Assignable role: Doctor (referred case)')
        : t('Atanabilir rol: Sağlık Paramedik', 'Assignable role: Paramedic');
    case 'Rescue':
      return t('Atanabilir rol: Arama Kurtarma', 'Assignable role: Search & Rescue');
    case 'Security':
      return t('Atanabilir rol: Güvenlik', 'Assignable role: Security');
    case 'Food':
    case 'Water':
      return t('Atanabilir rol: Lojistik', 'Assignable role: Logistics');
    case 'Structural':
      return t('Atanabilir roller: Lojistik veya Arama Kurtarma', 'Assignable roles: Logistics or Search & Rescue');
    default:
      return t('Uygun saha personeli seçin', 'Select eligible field staff');
  }
}

/** SOS oluşturulurken talep türüne göre başlangıç triyajı */
export function initialTriageForRequest(requestType) {
  switch (requestType) {
    case 'Medical':
    case 'Rescue':
    case 'Security':
      return 'Red';
    case 'Structural':
    case 'Water':
      return 'Yellow';
    case 'Food':
      return 'Green';
    default:
      return 'Red';
  }
}

export { formatTriageLabel } from './statusLabels.js';

export const ticketMatchesRole = (ticket, userType) => {
  switch (userType) {
    case 'PM':
      return true;
    case 'SaglikParamedik':
      return isOpenMedicalTicket(ticket) && !ticket.referredToDoctor;
    case 'Doktor':
      return isOpenMedicalTicket(ticket) && ticket.referredToDoctor;
    case 'AramaKurtarma':
      return ['Rescue', 'Structural', 'Security'].includes(ticket.requestType)
        || (ticket.triageColor === 'Red' && ticket.requestType !== 'Medical');
    case 'Lojistik':
      return ['Food', 'Water', 'Structural'].includes(ticket.requestType);
    case 'Guvenlik':
      return ticket.requestType === 'Security';
    default:
      return false;
  }
};

export const getRoleTickets = (tickets, userType, userId = null) => {
  if (userType === 'PM') return tickets;
  if (userType === 'Afetzede') return userId ? tickets.filter((t) => t.requestorUserId === userId) : [];
  return tickets.filter((t) => ticketMatchesRole(t, userType));
};

export const getActiveRoleTickets = (tickets, userType, userId = null) =>
  getRoleTickets(tickets, userType, userId).filter((tk) => !['Resolved', 'Cancelled'].includes(tk.status));

export const getTicketsForTab = (tickets, userType, userId = null) => {
  if (userType === 'PM' || userType === 'Afetzede') return getRoleTickets(tickets, userType, userId);
  if (userType === 'Doktor') return getDoctorTicketsForTab(tickets);
  return getActiveRoleTickets(tickets, userType, userId);
};
