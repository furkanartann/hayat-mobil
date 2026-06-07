using HayatMobil.Api.Data;
using HayatMobil.Api.Models;
using HayatMobil.Api.Services;
using HayatMobil.Api.Domain;
using HayatMobil.Api.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Endpoints;

internal static class MedicalEndpoints
{
    internal static void Map(WebApplication app)
    {
        app.MapGet("/api/medical-records", async (int? ticketId, string? recordType) =>
        {
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var sql = @"
                    SELECT mr.RecordID, mr.PatientUserID, u.FullName AS PatientName,
                           mr.DoctorStaffID, du.FullName AS RecorderName, du.UserType AS RecorderRole,
                           mr.RecordType, mr.TicketID, mr.HeartRate, mr.BloodOxygen, mr.RespirationRate, mr.BodyTemperature,
                           mr.Consciousness, mr.VisibleInjury, mr.TriageColor, mr.Disposition,
                           mr.Diagnosis, mr.Treatment, mr.LinkedFieldRecordID, mr.Notes, mr.RecordedAt
                    FROM MedicalRecords mr
                    JOIN Users u ON mr.PatientUserID = u.UserID
                    JOIN Users du ON mr.DoctorStaffID = du.UserID
                    WHERE 1=1";
                if (ticketId.HasValue)
                    sql += " AND mr.TicketID = @ticketId";
                if (!string.IsNullOrWhiteSpace(recordType))
                    sql += " AND mr.RecordType = @recordType";
                sql += " ORDER BY mr.RecordedAt DESC";

                var cmd = new SqliteCommand(sql, conn);
                if (ticketId.HasValue)
                    cmd.Parameters.AddWithValue("@ticketId", ticketId.Value);
                if (!string.IsNullOrWhiteSpace(recordType))
                    cmd.Parameters.AddWithValue("@recordType", recordType);

                var list = new List<object>();
                await using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                {
                    list.Add(new
                    {
                        recordId = Convert.ToInt32(r["RecordID"]),
                        patientUserId = Convert.ToInt32(r["PatientUserID"]),
                        patientName = r["PatientName"].ToString(),
                        recorderStaffId = Convert.ToInt32(r["DoctorStaffID"]),
                        recorderName = r["RecorderName"].ToString(),
                        recorderRole = r["RecorderRole"].ToString(),
                        recordType = r["RecordType"]?.ToString() ?? "ClinicalExam",
                        ticketId = r["TicketID"] == DBNull.Value ? (int?)null : Convert.ToInt32(r["TicketID"]),
                        heartRate = r["HeartRate"] == DBNull.Value ? (int?)null : Convert.ToInt32(r["HeartRate"]),
                        bloodOxygen = r["BloodOxygen"] == DBNull.Value ? (int?)null : Convert.ToInt32(r["BloodOxygen"]),
                        respirationRate = r["RespirationRate"] == DBNull.Value ? (int?)null : Convert.ToInt32(r["RespirationRate"]),
                        bodyTemperature = r["BodyTemperature"] == DBNull.Value ? (double?)null : Convert.ToDouble(r["BodyTemperature"]),
                        consciousness = r["Consciousness"] == DBNull.Value ? null : r["Consciousness"].ToString(),
                        visibleInjury = r["VisibleInjury"] == DBNull.Value ? null : r["VisibleInjury"].ToString(),
                        triageColor = r["TriageColor"] == DBNull.Value ? null : r["TriageColor"].ToString(),
                        disposition = r["Disposition"] == DBNull.Value ? null : r["Disposition"].ToString(),
                        diagnosis = r["Diagnosis"] == DBNull.Value ? null : r["Diagnosis"].ToString(),
                        treatment = r["Treatment"] == DBNull.Value ? null : r["Treatment"].ToString(),
                        linkedFieldRecordId = r["LinkedFieldRecordID"] == DBNull.Value ? (int?)null : Convert.ToInt32(r["LinkedFieldRecordID"]),
                        notes = r["Notes"].ToString(),
                        recordedAt = r["RecordedAt"].ToString()
                    });
                }
                return Results.Ok(list);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Medical);

        app.MapPost("/api/medical-records", async (CreateMedicalRecordRequest req, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.CanAccessMedical())
                return Results.Json(new { error = "Tıbbi kayıt için sağlık personeli veya PM yetkisi gerekli." }, statusCode: 403);
            if (req.DoctorStaffID != auth.UserId && !auth.IsPm)
                return Results.Json(new { error = "Kaydı yalnızca kendi hesabınızla oluşturabilirsiniz." }, statusCode: 403);

            var recordType = string.IsNullOrWhiteSpace(req.RecordType) ? "ClinicalExam" : req.RecordType.Trim();
            if (recordType is not ("FieldAssessment" or "ClinicalExam"))
                return Results.BadRequest(new { error = "Geçersiz kayıt tipi." });

            if (!auth.IsPm)
            {
                if (recordType == "FieldAssessment" && auth.UserType != "SaglikParamedik")
                    return Results.Json(new { error = "Saha değerlendirmesi yalnızca paramedik tarafından kaydedilebilir." }, statusCode: 403);
                if (recordType == "ClinicalExam" && auth.UserType != "Doktor")
                    return Results.Json(new { error = "Klinik muayene yalnızca doktor tarafından kaydedilebilir." }, statusCode: 403);
            }

            if (!req.TicketID.HasValue)
                return Results.BadRequest(new { error = "Yardım talebi (SOS) seçimi zorunludur." });

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                await using var ticketCmd = new SqliteCommand(@"
                    SELECT TicketID, RequestorUserID, RequestType, Status, ReferredToDoctor, AssignedStaffID
                    FROM AssistanceTickets WHERE TicketID = @tid", conn);
                ticketCmd.Parameters.AddWithValue("@tid", req.TicketID.Value);
                await using var ticketReader = await ticketCmd.ExecuteReaderAsync();
                if (!await ticketReader.ReadAsync())
                    return Results.NotFound(new { error = "Seçilen yardım talebi bulunamadı." });

                var patientUserId = Convert.ToInt32(ticketReader["RequestorUserID"]);
                var requestType = ticketReader["RequestType"].ToString();
                var ticketStatus = ticketReader["Status"].ToString();
                var referredToDoctor = ticketReader["ReferredToDoctor"] != DBNull.Value && Convert.ToInt32(ticketReader["ReferredToDoctor"]) == 1;
                var assignedStaffId = ticketReader["AssignedStaffID"] == DBNull.Value ? (int?)null : Convert.ToInt32(ticketReader["AssignedStaffID"]);
                await ticketReader.CloseAsync();

                if (requestType != "Medical")
                    return Results.BadRequest(new { error = "Yalnızca tıbbi SOS taleplerine kayıt eklenebilir." });
                if (ticketStatus is "Resolved" or "Cancelled")
                    return Results.BadRequest(new { error = "Kapalı talebe kayıt eklenemez." });

                if (recordType == "ClinicalExam")
                {
                    if (!referredToDoctor)
                        return Results.BadRequest(new { error = "Klinik muayene için önce paramedik doktora sevk etmelidir." });
                }
                else if (referredToDoctor)
                {
                    return Results.BadRequest(new { error = "Bu vaka doktora sevk edildi; saha değerlendirmesi kapatılmıştır." });
                }

                await using var tx = await conn.BeginTransactionAsync();
                try
                {
                    var insertCmd = new SqliteCommand(@"
                        INSERT INTO MedicalRecords (
                            PatientUserID, DoctorStaffID, RecordType, TicketID,
                            HeartRate, BloodOxygen, RespirationRate, BodyTemperature,
                            Consciousness, VisibleInjury, TriageColor, Disposition,
                            Diagnosis, Treatment, LinkedFieldRecordID, Notes, RecordedAt)
                        VALUES (
                            @patientId, @recorderId, @rtype, @ticketId,
                            @hr, @sp, @rr, @temp,
                            @consciousness, @injury, @triage, @disposition,
                            @diagnosis, @treatment, @linked, @notes, datetime('now'))", conn, (SqliteTransaction)tx);
                    insertCmd.Parameters.AddWithValue("@patientId", patientUserId);
                    insertCmd.Parameters.AddWithValue("@recorderId", req.DoctorStaffID);
                    insertCmd.Parameters.AddWithValue("@rtype", recordType);
                    insertCmd.Parameters.AddWithValue("@ticketId", req.TicketID.Value);
                    insertCmd.Parameters.AddWithValue("@hr", req.HeartRate ?? (object)DBNull.Value);
                    insertCmd.Parameters.AddWithValue("@sp", req.BloodOxygen ?? (object)DBNull.Value);
                    insertCmd.Parameters.AddWithValue("@rr", req.RespirationRate ?? (object)DBNull.Value);
                    insertCmd.Parameters.AddWithValue("@temp", req.BodyTemperature ?? (object)DBNull.Value);
                    insertCmd.Parameters.AddWithValue("@consciousness", req.Consciousness ?? (object)DBNull.Value);
                    insertCmd.Parameters.AddWithValue("@injury", req.VisibleInjury ?? (object)DBNull.Value);
                    insertCmd.Parameters.AddWithValue("@triage", req.TriageColor ?? (object)DBNull.Value);
                    insertCmd.Parameters.AddWithValue("@disposition", req.Disposition ?? (object)DBNull.Value);
                    insertCmd.Parameters.AddWithValue("@diagnosis", req.Diagnosis ?? (object)DBNull.Value);
                    insertCmd.Parameters.AddWithValue("@treatment", req.Treatment ?? (object)DBNull.Value);
                    insertCmd.Parameters.AddWithValue("@linked", req.LinkedFieldRecordID ?? (object)DBNull.Value);
                    insertCmd.Parameters.AddWithValue("@notes", req.Notes ?? "");
                    await insertCmd.ExecuteNonQueryAsync();

                    var staffToFree = new List<int>();
                    if (assignedStaffId.HasValue)
                        staffToFree.Add(assignedStaffId.Value);

                    if (recordType == "FieldAssessment")
                    {
                        var disposition = req.Disposition ?? "";
                        if (disposition == "DoctorReferral")
                        {
                            await using var referCmd = new SqliteCommand(@"
                                UPDATE AssistanceTickets
                                SET ReferredToDoctor = 1,
                                    TriageColor = COALESCE(@triage, TriageColor),
                                    UpdateNote = @note,
                                    UpdatedAt = datetime('now')
                                WHERE TicketID = @tid", conn, (SqliteTransaction)tx);
                            referCmd.Parameters.AddWithValue("@triage", req.TriageColor ?? (object)DBNull.Value);
                            referCmd.Parameters.AddWithValue("@note", $"Paramedik saha değerlendirmesi — doktora sevk. {req.Notes ?? ""}".Trim());
                            referCmd.Parameters.AddWithValue("@tid", req.TicketID.Value);
                            await referCmd.ExecuteNonQueryAsync();
                        }
                        else
                        {
                            var closeNote = disposition == "Transport"
                                ? "Paramedik: nakil düzenlendi, vaka sahadan çıkarıldı."
                                : "Paramedik: yerinde tedavi ile stabil, vaka kapatıldı.";
                            await using var resolveCmd = new SqliteCommand(@"
                                UPDATE AssistanceTickets
                                SET Status = 'Resolved',
                                    TriageColor = COALESCE(@triage, TriageColor),
                                    UpdateNote = @note,
                                    UpdatedAt = datetime('now')
                                WHERE TicketID = @tid", conn, (SqliteTransaction)tx);
                            resolveCmd.Parameters.AddWithValue("@triage", req.TriageColor ?? (object)DBNull.Value);
                            resolveCmd.Parameters.AddWithValue("@note", closeNote);
                            resolveCmd.Parameters.AddWithValue("@tid", req.TicketID.Value);
                            await resolveCmd.ExecuteNonQueryAsync();

                            foreach (var staffId in staffToFree.Distinct())
                            {
                                await using var freeCmd = new SqliteCommand(
                                    "UPDATE StaffProfiles SET CurrentStatus = 'Available' WHERE StaffID = @sid", conn, (SqliteTransaction)tx);
                                freeCmd.Parameters.AddWithValue("@sid", staffId);
                                await freeCmd.ExecuteNonQueryAsync();
                            }
                        }
                    }
                    else
                    {
                        var closeNote = (req.Disposition ?? "Observe") switch
                        {
                            "Discharge" => "Doktor: taburcu edildi.",
                            "Hospital" => "Doktor: hastaneye sevk edildi.",
                            _ => "Doktor: gözlem altında, vaka kapatıldı."
                        };
                        await using var resolveCmd = new SqliteCommand(@"
                            UPDATE AssistanceTickets
                            SET Status = 'Resolved', UpdateNote = @note, UpdatedAt = datetime('now')
                            WHERE TicketID = @tid", conn, (SqliteTransaction)tx);
                        resolveCmd.Parameters.AddWithValue("@note", $"{closeNote} {req.Notes ?? ""}".Trim());
                        resolveCmd.Parameters.AddWithValue("@tid", req.TicketID.Value);
                        await resolveCmd.ExecuteNonQueryAsync();

                        foreach (var staffId in staffToFree.Distinct())
                        {
                            await using var freeCmd = new SqliteCommand(
                                "UPDATE StaffProfiles SET CurrentStatus = 'Available' WHERE StaffID = @sid", conn, (SqliteTransaction)tx);
                            freeCmd.Parameters.AddWithValue("@sid", staffId);
                            await freeCmd.ExecuteNonQueryAsync();
                        }
                    }

                    await tx.CommitAsync();
                }
                catch
                {
                    await tx.RollbackAsync();
                    throw;
                }

                return Results.Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Medical);

        // ---------------------------------------------------------
        //  AI DETECTIONS ENDPOINTS
        // ---------------------------------------------------------
    }
}

