namespace HayatMobil.Api.Models;

internal record LoginRequest(string IdentityNo, string Pin);
internal record RegisterRequest(string FullName, string IdentityNo, string Phone, string? UserType, string Pin);
internal record StaffApplicationRequest(string RequestedRole, string Institution, string? CredentialNote, string? ApplicationNote);
internal record ReviewStaffApplicationRequest(string Action, string? ReviewNote);
internal record SafetyStatusUpdateRequest(string SafetyStatus, string? Note);
internal record CreateTicketRequest(int RequestorUserID, string RequestType, string TriageColor, int? UnitID, string? UpdateNote, double? ReporterLat, double? ReporterLng);
internal record UpdateLocationRequest(double Latitude, double Longitude);
internal record UpdateTicketRequest(string Status, int? AssignedStaffID, string? UpdateNote, int? DispatcherUserID);
internal record CreateUnitRequest(string SerialNumber, double Latitude, double Longitude, string? Status);
internal record AddSensorReadingRequest(int UnitID, string SensorType, double CurrentValue, string? UnitOfMeasure);
internal record DistributeItemRequest(int ItemID, int QuantityDistributed, int? ReceiverUserID, int DistributedByStaff, int CourierStaffID, string? TransportType, string? DistributionNote);
internal record AssignDutyRequest(int StaffID, string DutyType, int RefId, string Summary, int EtaMinutes, int? DispatcherUserID);
internal record CreateMissingReportRequest(int ReporterUserID, string MissingPersonName, int? Age, string? PhysicalDescription, double? LastKnownLat, double? LastKnownLong);
internal record UpdateMissingStatusRequest(string Status);
internal record CreateAiDetectionRequest(int UnitID, string? CameraID, string DetectionType, int PersonCount, int ImmobilePersonCount, int PersonFound, double ConfidenceScore, double? Latitude, double? Longitude);
internal record CreateAlertRequest(string Title, string Message, string Severity);
internal record DisasterDeclareApiRequest(
    string Title, string Message, string? Severity,
    string? WeatherCondition, string? WeatherRisk, int? WeatherTemp, int? NetworkQuality,
    double? ZoneCenterLat, double? ZoneCenterLng, double? ZoneRadiusKm);
internal record UpdateDisasterZoneApiRequest(
    string Title, string Message, string? Severity,
    double CenterLat, double CenterLng, double RadiusKm);
internal record SetDisasterActiveApiRequest(bool Active);
internal record CreateAssemblyPointRequest(string Name, double Lat, double Lng, int? Capacity, string? Notes, bool Active = true);
internal record UpdateAssemblyPointRequest(string Name, double Lat, double Lng, int? Capacity, string? Notes, bool Active);
internal record CreateMedicalRecordRequest(
    string RecordType, int? TicketID, int DoctorStaffID,
    int? HeartRate, int? BloodOxygen, int? RespirationRate, double? BodyTemperature,
    string? Consciousness, string? VisibleInjury, string? TriageColor, string? Disposition,
    string? Diagnosis, string? Treatment, int? LinkedFieldRecordID, string? Notes);
