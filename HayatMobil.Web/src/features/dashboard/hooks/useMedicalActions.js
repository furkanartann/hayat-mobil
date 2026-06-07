import { useState } from 'react';
import { apiFetch } from '../../../api/client.js';

export function useMedicalActions({
  user, t, toast, networkErrorMsg, genericErrorMsg, invalidateAppData,
}) {
  const [fieldAssessmentForm, setFieldAssessmentForm] = useState({
    ticketId: '', heartRate: '', bloodOxygen: '', respirationRate: '16', bodyTemperature: '',
    consciousness: 'Alert', visibleInjury: 'None', triageColor: 'Yellow',
    disposition: 'OnSiteTreatment', notes: ''
  });
  const [clinicalExamForm, setClinicalExamForm] = useState({
    ticketId: '', linkedFieldRecordId: '', heartRate: '', bloodOxygen: '', respirationRate: '16', bodyTemperature: '',
    diagnosis: '', treatment: '', disposition: 'Observe', notes: ''
  });

  const handleCreateFieldAssessment = async (e) => {
    e.preventDefault();
    if (!fieldAssessmentForm.ticketId) {
      toast(t('Lütfen bir tıbbi SOS talebi seçin.', 'Please select a medical SOS request.'), 'error');
      return;
    }
    try {
      const res = await apiFetch('/api/medical-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordType: 'FieldAssessment',
          ticketID: parseInt(fieldAssessmentForm.ticketId, 10),
          doctorStaffID: user.userId,
          heartRate: fieldAssessmentForm.heartRate ? parseInt(fieldAssessmentForm.heartRate, 10) : null,
          bloodOxygen: fieldAssessmentForm.bloodOxygen ? parseInt(fieldAssessmentForm.bloodOxygen, 10) : null,
          respirationRate: fieldAssessmentForm.respirationRate ? parseInt(fieldAssessmentForm.respirationRate, 10) : null,
          bodyTemperature: fieldAssessmentForm.bodyTemperature ? parseFloat(fieldAssessmentForm.bodyTemperature) : null,
          consciousness: fieldAssessmentForm.consciousness,
          visibleInjury: fieldAssessmentForm.visibleInjury,
          triageColor: fieldAssessmentForm.triageColor,
          disposition: fieldAssessmentForm.disposition,
          notes: fieldAssessmentForm.notes
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFieldAssessmentForm({
          ticketId: '', heartRate: '', bloodOxygen: '', respirationRate: '16', bodyTemperature: '',
          consciousness: 'Alert', visibleInjury: 'None', triageColor: 'Yellow',
          disposition: 'OnSiteTreatment', notes: ''
        });
        invalidateAppData();
        const msg = fieldAssessmentForm.disposition === 'DoctorReferral'
          ? t('Saha değerlendirmesi kaydedildi, vaka doktora sevk edildi.', 'Field assessment saved, case referred to doctor.')
          : t('Saha değerlendirmesi kaydedildi.', 'Field assessment saved.');
        toast(msg, 'success');
      } else {
        toast(data.error || genericErrorMsg, 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  const handleCreateClinicalExam = async (e) => {
    e.preventDefault();
    if (!clinicalExamForm.ticketId) {
      toast(t('Lütfen sevk edilen vakayı seçin.', 'Please select a referred case.'), 'error');
      return;
    }
    try {
      const res = await apiFetch('/api/medical-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordType: 'ClinicalExam',
          ticketID: parseInt(clinicalExamForm.ticketId, 10),
          doctorStaffID: user.userId,
          heartRate: clinicalExamForm.heartRate ? parseInt(clinicalExamForm.heartRate, 10) : null,
          bloodOxygen: clinicalExamForm.bloodOxygen ? parseInt(clinicalExamForm.bloodOxygen, 10) : null,
          respirationRate: clinicalExamForm.respirationRate ? parseInt(clinicalExamForm.respirationRate, 10) : null,
          bodyTemperature: clinicalExamForm.bodyTemperature ? parseFloat(clinicalExamForm.bodyTemperature) : null,
          diagnosis: clinicalExamForm.diagnosis,
          treatment: clinicalExamForm.treatment,
          disposition: clinicalExamForm.disposition,
          linkedFieldRecordID: clinicalExamForm.linkedFieldRecordId ? parseInt(clinicalExamForm.linkedFieldRecordId, 10) : null,
          notes: clinicalExamForm.notes
        })
      });
      const data = await res.json();
      if (res.ok) {
        setClinicalExamForm({
          ticketId: '', linkedFieldRecordId: '', heartRate: '', bloodOxygen: '', respirationRate: '16', bodyTemperature: '',
          diagnosis: '', treatment: '', disposition: 'Observe', notes: ''
        });
        invalidateAppData();
        toast(t('Klinik muayene kaydedildi.', 'Clinical exam recorded.'), 'success');
      } else {
        toast(data.error || genericErrorMsg, 'error');
      }
    } catch {
      toast(networkErrorMsg, 'error');
    }
  };

  return {
    fieldAssessmentForm, setFieldAssessmentForm,
    clinicalExamForm, setClinicalExamForm,
    handleCreateFieldAssessment, handleCreateClinicalExam,
  };
}
