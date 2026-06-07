import React from 'react';
import { ticketMapCoords } from '../../lib/mapLayers.js';
import { useRouteEta } from '../../features/map/hooks/useRouteEta.js';
import EtaBadge from '../shared/EtaBadge.jsx';

export default function TicketEtaInline({
  ticket,
  userLocation,
  userType,
  staffId,
  t = (tr) => tr,
}) {
  const coords = ticketMapCoords(ticket);
  const enabled = ticket?.status === 'In_Progress'
    && staffId != null
    && coords != null
    && userLocation?.lat != null;

  const { data, loading } = useRouteEta({
    from: userLocation,
    to: coords,
    userType,
    enabled,
  });

  if (!enabled && ticket?.status !== 'In_Progress') return null;

  return (
    <EtaBadge
      durationSeconds={data?.durationSeconds}
      distanceMeters={data?.distanceMeters}
      fallback={data?.fallback}
      loading={loading && enabled}
      t={t}
      compact
    />
  );
}
