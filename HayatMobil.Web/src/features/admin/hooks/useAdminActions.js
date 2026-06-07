import { useState } from 'react';
import { apiFetch } from '../../../api/client.js';
import { formatRouteDistance, formatRouteDuration } from '../../../lib/routing.js';

export function useAdminActions({
  user, t, toast, networkErrorMsg, readApiError, units, invalidateAppData, patchAppData,
}) {
  const [mapPickMode, setMapPickMode] = useState(false);
  const [mapPickPurpose, setMapPickPurpose] = useState(null);
  const [assemblyPoints, setAssemblyPoints] = useState([]);
  const [assemblyPointForm, setAssemblyPointForm] = useState({
    name: '', lat: '41.0082', lng: '28.9784', capacity: '', notes: '', active: true,
  });
  const [editingAssemblyId, setEditingAssemblyId] = useState(null);
  const [editAssemblyForm, setEditAssemblyForm] = useState({
    name: '', lat: '', lng: '', capacity: '', notes: '', active: true,
  });
  const [newUnit, setNewUnit] = useState({
    serialNumber: '', latitude: '41.0082', longitude: '28.9784', status: 'Active'
  });
  const [sensorReadingForm, setSensorReadingForm] = useState({
    unitId: '', sensorType: 'Isi', currentValue: '25.0', unitOfMeasure: 'C'
  });
  const [assignDutyForm, setAssignDutyForm] = useState({
    staffId: '', dutyType: 'Unit', refId: '', summary: '',
  });
  const [disasterForm, setDisasterForm] = useState({
    typeId: '', title: '', message: '', severity: 'Critical',
    zoneCenterLat: '', zoneCenterLng: '', zoneRadiusKm: '5'
  });
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [editDisasterForm, setEditDisasterForm] = useState({
    title: '', message: '', severity: 'Critical',
    centerLat: '', centerLng: '', radiusKm: '5',
  });
  const [mapPickForZoneId, setMapPickForZoneId] = useState(null);
  const [aiReportForm, setAiReportForm] = useState({
    unitId: '', detectionType: 'Human_Trapped', personCount: '1', immobileCount: '1'
  });

  const handleCreateUnit = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serialNumber: newUnit.serialNumber,
          latitude: parseFloat(newUnit.latitude),
          longitude: parseFloat(newUnit.longitude),
          status: newUnit.status
        })
      });
      if (res.ok) {
        setNewUnit({ serialNumber: '', latitude: '41.0082', longitude: '28.9784', status: 'Active' });
        invalidateAppData();
        toast(t('Ünite başarıyla eklendi.', 'Unit added successfully.'), 'success');
      } else {
        toast(await readApiError(res), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const handleRecordSensorReading = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/sensors/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitID: parseInt(sensorReadingForm.unitId),
          sensorType: sensorReadingForm.sensorType,
          currentValue: parseFloat(sensorReadingForm.currentValue),
          unitOfMeasure: sensorReadingForm.unitOfMeasure
        })
      });
      if (res.ok) {
        setSensorReadingForm({ ...sensorReadingForm, currentValue: '' });
        invalidateAppData();
        toast(t('Sensör okuması kaydedildi.', 'Sensor reading saved.'), 'success');
      } else {
        toast(await readApiError(res), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const handleAssignDuty = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/staff/assign-duty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffID: parseInt(assignDutyForm.staffId),
          dutyType: assignDutyForm.dutyType,
          refId: parseInt(assignDutyForm.refId),
          summary: assignDutyForm.summary,
          etaMinutes: 0,
          dispatcherUserID: user?.userId ?? null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAssignDutyForm({
          staffId: '', dutyType: 'Unit', refId: '', summary: '',
        });
        invalidateAppData();
        const etaLine = data.durationSeconds
          ? `${formatRouteDuration(data.durationSeconds, t)} · ${formatRouteDistance(data.distanceMeters, t)}`
          : t(`~${data.etaMinutes} dk`, `~${data.etaMinutes} min`);
        toast(t(`Saha görevi atandı. Tahmini varış: ${etaLine}`, `Field task assigned. ETA: ${etaLine}`), 'success');
      } else {
        toast(data.error || t('Hata oluştu.', 'An error occurred.'), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const handleCompleteActiveDuty = async () => {
    if (!user.staffId) return;
    try {
      const res = await apiFetch(`/api/staff/${user.staffId}/duty`, { method: 'DELETE' });
      if (res.ok) {
        patchAppData({ myActiveDuty: null });
        toast(t('Göreviniz tamamlandı olarak işaretlendi.', 'Your task is marked as completed.'), 'success');
      } else {
        toast(await readApiError(res), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const startEditDisaster = (item) => {
    setEditingZoneId(item.zoneId);
    setEditDisasterForm({
      title: item.title ?? '',
      message: item.message ?? '',
      severity: item.severity ?? 'Critical',
      centerLat: String(item.centerLat ?? ''),
      centerLng: String(item.centerLng ?? ''),
      radiusKm: String(item.radiusKm ?? '5'),
    });
  };

  const cancelEditDisaster = () => {
    setEditingZoneId(null);
    setMapPickForZoneId(null);
  };

  const pickMapCenterForEdit = (zoneId) => {
    setMapPickForZoneId(zoneId);
    setMapPickPurpose('disaster');
    setMapPickMode(true);
  };

  const loadAssemblyPoints = async () => {
    if (user?.userType !== 'PM') return;
    try {
      const res = await apiFetch('/api/assembly-points');
      if (res.ok) setAssemblyPoints(await res.json());
    } catch { /* sessiz */ }
  };

  const pickAssemblyLocation = () => {
    setMapPickPurpose('assembly');
    setMapPickMode(true);
  };

  const handleCreateAssemblyPoint = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/assembly-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: assemblyPointForm.name,
          lat: parseFloat(assemblyPointForm.lat),
          lng: parseFloat(assemblyPointForm.lng),
          capacity: assemblyPointForm.capacity ? parseInt(assemblyPointForm.capacity, 10) : null,
          notes: assemblyPointForm.notes || null,
          active: assemblyPointForm.active,
        }),
      });
      if (res.ok) {
        setAssemblyPointForm({ name: '', lat: '41.0082', lng: '28.9784', capacity: '', notes: '', active: true });
        invalidateAppData();
        await loadAssemblyPoints();
        toast(t('Toplanma alanı eklendi.', 'Assembly point added.'), 'success');
      } else {
        toast(await readApiError(res), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const startEditAssembly = (item) => {
    setEditingAssemblyId(item.pointId);
    setEditAssemblyForm({
      name: item.name ?? '',
      lat: String(item.lat ?? item.latitude ?? ''),
      lng: String(item.lng ?? item.longitude ?? ''),
      capacity: item.capacity != null ? String(item.capacity) : '',
      notes: item.notes ?? '',
      active: item.active !== false,
    });
  };

  const cancelEditAssembly = () => setEditingAssemblyId(null);

  const handleUpdateAssemblyPoint = async (e) => {
    e.preventDefault();
    if (!editingAssemblyId) return;
    try {
      const res = await apiFetch(`/api/assembly-points/${editingAssemblyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editAssemblyForm.name,
          lat: parseFloat(editAssemblyForm.lat),
          lng: parseFloat(editAssemblyForm.lng),
          capacity: editAssemblyForm.capacity ? parseInt(editAssemblyForm.capacity, 10) : null,
          notes: editAssemblyForm.notes || null,
          active: editAssemblyForm.active,
        }),
      });
      if (res.ok) {
        setEditingAssemblyId(null);
        invalidateAppData();
        await loadAssemblyPoints();
        toast(t('Toplanma alanı güncellendi.', 'Assembly point updated.'), 'success');
      } else {
        toast(await readApiError(res), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const handleDeleteAssemblyPoint = async (pointId, name) => {
    const msg = t(
      `"${name}" toplanma alanını silmek istediğinize emin misiniz?`,
      `Delete assembly point "${name}"?`
    );
    if (!window.confirm(msg)) return;
    try {
      const res = await apiFetch(`/api/assembly-points/${pointId}`, { method: 'DELETE' });
      if (res.ok) {
        if (editingAssemblyId === pointId) setEditingAssemblyId(null);
        invalidateAppData();
        await loadAssemblyPoints();
        toast(t('Toplanma alanı silindi.', 'Assembly point deleted.'), 'success');
      } else {
        toast(await readApiError(res), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const handleUpdateDisaster = async (e) => {
    e.preventDefault();
    if (!editingZoneId) return;
    try {
      const res = await apiFetch(`/api/disasters/zones/${editingZoneId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editDisasterForm.title,
          message: editDisasterForm.message,
          severity: editDisasterForm.severity,
          centerLat: parseFloat(editDisasterForm.centerLat),
          centerLng: parseFloat(editDisasterForm.centerLng),
          radiusKm: parseFloat(editDisasterForm.radiusKm),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditingZoneId(null);
        setMapPickForZoneId(null);
        setMapPickMode(false);
        invalidateAppData();
        toast(t('Afet bildirimi güncellendi.', 'Disaster alert updated.'), 'success');
      } else {
        toast(data.error || t('Güncellenemedi.', 'Update failed.'), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const handleDeleteDisaster = async (zoneId, title) => {
    const msg = t(
      `"${title}" afet bildirimini kalıcı olarak silmek istediğinize emin misiniz?`,
      `Permanently delete disaster alert "${title}"?`
    );
    if (!window.confirm(msg)) return;
    try {
      const res = await apiFetch(`/api/disasters/zones/${zoneId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        if (editingZoneId === zoneId) {
          setEditingZoneId(null);
          setMapPickForZoneId(null);
          setMapPickMode(false);
        }
        invalidateAppData();
        toast(t('Afet bildirimi silindi.', 'Disaster alert deleted.'), 'success');
      } else {
        toast(data.error || t('Silinemedi.', 'Delete failed.'), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const handleSetDisasterActive = async (zoneId, active) => {
    try {
      const res = await apiFetch(`/api/disasters/zones/${zoneId}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      });
      const data = await res.json();
      if (res.ok) {
        invalidateAppData();
        toast(
          active
            ? t('Afet bildirimi aktif edildi.', 'Disaster alert activated.')
            : t('Afet bildirimi pasife alındı.', 'Disaster alert deactivated.'),
          'success'
        );
      } else {
        toast(data.error || t('Durum değiştirilemedi.', 'Could not change status.'), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const handleDeclareDisaster = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/disasters/declare', {
        method: 'POST',
        body: JSON.stringify({
          title: disasterForm.title,
          message: disasterForm.message,
          severity: disasterForm.severity,
          weatherCondition: null,
          weatherRisk: null,
          weatherTemp: null,
          networkQuality: null,
          zoneCenterLat: disasterForm.zoneCenterLat ? parseFloat(disasterForm.zoneCenterLat) : null,
          zoneCenterLng: disasterForm.zoneCenterLng ? parseFloat(disasterForm.zoneCenterLng) : null,
          zoneRadiusKm: disasterForm.zoneRadiusKm ? parseFloat(disasterForm.zoneRadiusKm) : null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMapPickMode(false);
        invalidateAppData();
        toast(t('Afet bildirimi tüm panellere yayınlandı.', 'Disaster alert broadcast to all panels.'), 'success');
      } else {
        toast(data.error || t('Bildirim gönderilemedi.', 'Failed to send alert.'), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const handleReportAiDetection = async (e) => {
    e.preventDefault();
    try {
      const unit = units.find((u) => String(u.unitId) === String(aiReportForm.unitId));
      const res = await apiFetch('/api/ai-detections', {
        method: 'POST',
        body: JSON.stringify({
          unitID: parseInt(aiReportForm.unitId),
          detectionType: aiReportForm.detectionType,
          personCount: parseInt(aiReportForm.personCount) || 0,
          immobilePersonCount: parseInt(aiReportForm.immobileCount) || 0,
          personFound: parseInt(aiReportForm.immobileCount) > 0 ? 1 : 0,
          confidenceScore: 0.85,
          latitude: unit?.latitude,
          longitude: unit?.longitude
        })
      });
      if (res.ok) {
        setAiReportForm({ unitId: '', detectionType: 'Human_Trapped', personCount: '1', immobileCount: '1' });
        invalidateAppData();
        toast(t('Saha tespiti kaydedildi. Gerekirse personel ataması yapın.', 'Field detection saved. Assign staff if needed.'), 'success');
      } else {
        toast(await readApiError(res), 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  return {
    newUnit, setNewUnit, sensorReadingForm, setSensorReadingForm,
    assignDutyForm, setAssignDutyForm, disasterForm, setDisasterForm,
    editingZoneId, editDisasterForm, setEditDisasterForm, mapPickForZoneId, setMapPickForZoneId,
    aiReportForm, setAiReportForm, mapPickMode, setMapPickMode, mapPickPurpose, setMapPickPurpose,
    assemblyPoints, assemblyPointForm, setAssemblyPointForm,
    editingAssemblyId, editAssemblyForm, setEditAssemblyForm,
    loadAssemblyPoints, pickAssemblyLocation,
    handleCreateUnit, handleRecordSensorReading, handleAssignDuty, handleCompleteActiveDuty,
    handleDeclareDisaster, handleReportAiDetection,
    startEditDisaster, cancelEditDisaster, handleUpdateDisaster, handleSetDisasterActive,
    handleDeleteDisaster, pickMapCenterForEdit,
    handleCreateAssemblyPoint, startEditAssembly, cancelEditAssembly,
    handleUpdateAssemblyPoint, handleDeleteAssemblyPoint,
  };
}
