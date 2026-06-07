import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import ActiveDutyBanner from '../../components/dashboard/ActiveDutyBanner.jsx';

export default function MedicalActiveDutyBanner() {
  const app = useApp();
  if (app.user.userType !== 'Doktor' && app.user.userType !== 'SaglikParamedik') return null;
  if (!app.user.staffId || !app.myActiveDuty) return null;

  return (
    <ActiveDutyBanner
      duty={app.myActiveDuty}
      eta={app.dutyRouteEta}
      etaLoading={app.dutyRouteLoading}
      onComplete={app.handleCompleteActiveDuty}
      t={app.t}
    />
  );
}
