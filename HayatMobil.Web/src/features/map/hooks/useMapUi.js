import { useCallback, useState } from 'react';
import { findNearestAssemblyPointByRoute } from '../../../lib/assemblyPoints.js';
import { elementRouteMeta, formatRouteDistance, formatRouteDuration, getRoutingProfile } from '../../../lib/routing.js';

export function useMapUi({
  t, toast, units, tickets, user,
  setDisasterForm, setEditDisasterForm, setAssemblyPointForm,
  mapPickForZoneId, setMapPickForZoneId,
  mapPickMode, setMapPickMode, mapPickPurpose, setMapPickPurpose,
  setManualRouteTarget,
}) {
  const [mapSelectedElement, setMapSelectedElement] = useState(null);
  const [mapFlyToTarget, setMapFlyToTarget] = useState(null);
  const [mapLayerVisibility, setMapLayerVisibility] = useState({
    units: true, sensors: true, tickets: true, ai: true, missing: true, zones: true, users: true, me: true,
    assembly: user?.userType === 'Afetzede' || user?.userType === 'PM',
  });

  const handleMapClick = (lat, lng) => {
    if (!mapPickMode) return;

    if (mapPickPurpose === 'assembly' && setAssemblyPointForm) {
      setAssemblyPointForm((prev) => ({
        ...prev,
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
      }));
      setMapPickPurpose?.(null);
      setMapPickMode(false);
      toast(t('Toplanma alanı konumu seçildi.', 'Assembly point location selected.'), 'success');
      return;
    }

    if (mapPickForZoneId && setEditDisasterForm) {
      setEditDisasterForm((prev) => ({
        ...prev,
        centerLat: lat.toFixed(6),
        centerLng: lng.toFixed(6),
      }));
      setMapPickForZoneId?.(null);
    } else {
      setDisasterForm((prev) => ({
        ...prev,
        zoneCenterLat: lat.toFixed(6),
        zoneCenterLng: lng.toFixed(6),
      }));
    }
    setMapPickPurpose?.(null);
    setMapPickMode(false);
    toast(t('Afet bölgesi merkezi seçildi.', 'Disaster zone center selected.'), 'success');
  };

  const navigateToNearestAssembly = useCallback(async (assemblyPoints, userLocation) => {
    if (!assemblyPoints?.length) {
      toast(t('Toplanma alanı tanımlı değil.', 'No assembly points defined.'), 'error');
      return false;
    }
    if (userLocation?.lat == null || userLocation?.lng == null) {
      toast(t('En yakın alan için konumunuzu açın.', 'Enable location to find nearest assembly point.'), 'error');
      return false;
    }

    const profile = getRoutingProfile(user?.userType);
    const nearest = await findNearestAssemblyPointByRoute(assemblyPoints, userLocation, profile);
    if (!nearest) {
      toast(
        t('Uygun toplanma alanı bulunamadı.', 'No suitable assembly point found.'),
        'error'
      );
      return false;
    }

    const el = { type: 'assembly', data: nearest };
    setMapSelectedElement(el);
    const meta = elementRouteMeta(el);
    if (meta) setManualRouteTarget?.(meta);

    const etaLine = nearest.durationSeconds
      ? `${formatRouteDuration(nearest.durationSeconds, t)} · ${formatRouteDistance(nearest.distanceMeters, t)}`
      : '';
    toast(
      t(
        `Yol süresine göre en uygun alan: ${nearest.name}${etaLine ? ` (${etaLine})` : ''}`,
        `Best route by travel time: ${nearest.name}${etaLine ? ` (${etaLine})` : ''}`
      ),
      'success'
    );
    return true;
  }, [setManualRouteTarget, t, toast, user?.userType]);

  const handleMapSelectElement = (el) => {
    if (el.type === 'unit') {
      const full = units.find((u) => u.unitId === el.data.unitId) || el.data;
      setMapSelectedElement({ type: 'unit', data: full });
    } else if (el.type === 'ticket') {
      const full = tickets.find((tk) => tk.ticketId === el.data.ticketId) || el.data;
      setMapSelectedElement({ type: 'ticket', data: full });
    } else {
      setMapSelectedElement(el);
    }
  };

  const focusLookupOnMap = useCallback((item) => {
    if (item?.latitude == null || item?.longitude == null) return false;

    if (item.kind === 'missing') {
      handleMapSelectElement({
        type: 'missing',
        data: {
          reportId: item.reportId,
          missingPersonName: item.missingPersonName,
          latitude: item.latitude,
          longitude: item.longitude,
          status: item.status,
        },
      });
    } else if (item.missingReport) {
      handleMapSelectElement({
        type: 'missing',
        data: {
          reportId: item.missingReport.reportId,
          missingPersonName: item.fullName,
          latitude: item.latitude,
          longitude: item.longitude,
          status: item.missingReport.status,
        },
      });
    } else {
      setMapSelectedElement({
        type: 'user',
        data: {
          userId: item.userId,
          fullName: item.fullName,
          safetyStatus: item.safetyStatus,
          latitude: item.latitude,
          longitude: item.longitude,
        },
      });
    }

    setMapFlyToTarget({ lat: item.latitude, lng: item.longitude, token: Date.now() });
    return true;
  }, [units, tickets]);

  return {
    mapSelectedElement, setMapSelectedElement,
    mapLayerVisibility, setMapLayerVisibility,
    mapFlyToTarget, setMapFlyToTarget,
    handleMapClick, handleMapSelectElement, navigateToNearestAssembly, focusLookupOnMap,
  };
}
