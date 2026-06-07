using HayatMobil.Api.Data;
using HayatMobil.Api.Models;
using HayatMobil.Api.Services;
using HayatMobil.Api.Domain;
using HayatMobil.Api.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;

namespace HayatMobil.Api.Endpoints;

internal static class InventoryEndpoints
{
    internal static void Map(WebApplication app)
    {
        app.MapGet("/api/inventory", async () =>
        {
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var cmd = new SqliteCommand(@"
                    SELECT i.ItemID, i.UnitID, u.SerialNumber AS UnitSerial, i.ItemName, i.BarcodeData, i.Category, i.StockCount, i.ExpiryDate 
                    FROM Inventory i
                    JOIN Units u ON i.UnitID = u.UnitID", conn);
                
                var list = new List<object>();
                await using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                {
                    list.Add(new
                    {
                        itemId = Convert.ToInt32(r["ItemID"]),
                        unitId = Convert.ToInt32(r["UnitID"]),
                        unitSerial = r["UnitSerial"].ToString(),
                        itemName = r["ItemName"].ToString(),
                        barcodeData = r["BarcodeData"].ToString(),
                        category = r["Category"].ToString(),
                        stockCount = Convert.ToInt32(r["StockCount"]),
                        expiryDate = r["ExpiryDate"] == DBNull.Value ? null : r["ExpiryDate"].ToString()
                    });
                }
                return Results.Ok(list);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization();

        app.MapPost("/api/inventory/distribute", async (DistributeItemRequest req, HttpContext ctx) =>
        {
            var auth = AuthUser.Require(ctx);
            if (!auth.CanAccessLogistics())
                return Results.Json(new { error = "Malzeme dağıtımı için lojistik veya PM yetkisi gerekli." }, statusCode: 403);
            var distributedBy = auth.UserId;
            if (req.CourierStaffID <= 0)
                return Results.BadRequest(new { error = "Lojistik ekibi seçimi zorunludur." });

            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var courierCmd = new SqliteCommand(@"
                    SELECT sp.StaffID, u.UserType, sp.Specialization, sp.CurrentStatus
                    FROM StaffProfiles sp
                    JOIN Users u ON sp.UserID = u.UserID
                    WHERE sp.StaffID = @sid", conn);
                courierCmd.Parameters.AddWithValue("@sid", req.CourierStaffID);
                await using var courierReader = await courierCmd.ExecuteReaderAsync();
                if (!await courierReader.ReadAsync())
                    return Results.BadRequest(new { error = "Seçilen lojistik personeli bulunamadı." });

                var courierRole = courierReader["UserType"].ToString() ?? courierReader["Specialization"].ToString();
                if (courierRole != "Lojistik")
                    return Results.BadRequest(new { error = "Yalnızca lojistik ekibi üyeleri sevkiyata atanabilir." });

                await using var tx = await conn.BeginTransactionAsync();
                try
                {
                    // Check stock
                    var checkCmd = new SqliteCommand("SELECT StockCount FROM Inventory WHERE ItemID = @iid", conn, (SqliteTransaction)tx);
                    checkCmd.Parameters.AddWithValue("@iid", req.ItemID);
                    var stockObj = await checkCmd.ExecuteScalarAsync();

                    if (stockObj == null)
                    {
                        await tx.RollbackAsync();
                        return Results.NotFound(new { error = "Malzeme bulunamadı." });
                    }

                    int stock = Convert.ToInt32(stockObj);
                    if (stock < req.QuantityDistributed)
                    {
                        await tx.RollbackAsync();
                        return Results.BadRequest(new { error = $"Yetersiz stok! Mevcut: {stock}" });
                    }

                    // Deduct stock
                    var deductCmd = new SqliteCommand("UPDATE Inventory SET StockCount = StockCount - @qty WHERE ItemID = @iid", conn, (SqliteTransaction)tx);
                    deductCmd.Parameters.AddWithValue("@qty", req.QuantityDistributed);
                    deductCmd.Parameters.AddWithValue("@iid", req.ItemID);
                    await deductCmd.ExecuteNonQueryAsync();

                    // Log distribution
                    var distCmd = new SqliteCommand(@"
                        INSERT INTO Distributions (ItemID, QuantityDistributed, ReceiverUserID, DistributedByStaff, CourierStaffID, TransportType, DistributionNote)
                        VALUES (@iid, @qty, @rec, @staff, @courier, @transport, @note)", conn, (SqliteTransaction)tx);
                    distCmd.Parameters.AddWithValue("@iid", req.ItemID);
                    distCmd.Parameters.AddWithValue("@qty", req.QuantityDistributed);
                    distCmd.Parameters.AddWithValue("@rec", req.ReceiverUserID ?? (object)DBNull.Value);
                    distCmd.Parameters.AddWithValue("@staff", distributedBy);
                    distCmd.Parameters.AddWithValue("@courier", req.CourierStaffID);
                    distCmd.Parameters.AddWithValue("@transport", req.TransportType ?? "Manual");
                    distCmd.Parameters.AddWithValue("@note", req.DistributionNote ?? "");
                    await distCmd.ExecuteNonQueryAsync();

                    await tx.CommitAsync();
                    return Results.Ok(new { success = true });
                }
                catch
                {
                    await tx.RollbackAsync();
                    throw;
                }
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Logistics);

        app.MapGet("/api/inventory/distributions", async () =>
        {
            try
            {
                await using var conn = DbContext.GetConnection();
                await conn.OpenAsync();

                var cmd = new SqliteCommand(@"
                    SELECT d.DistributionID, d.ItemID, i.ItemName, d.QuantityDistributed, 
                           d.ReceiverUserID, u.FullName AS ReceiverName, 
                           d.DistributedByStaff, s.FullName AS StaffName,
                           d.CourierStaffID, cu.FullName AS CourierName,
                           d.TransportType, d.DistributionNote, d.DistributedAt
                    FROM Distributions d
                    JOIN Inventory i ON d.ItemID = i.ItemID
                    LEFT JOIN Users u ON d.ReceiverUserID = u.UserID
                    JOIN Users s ON d.DistributedByStaff = s.UserID
                    LEFT JOIN StaffProfiles sp ON d.CourierStaffID = sp.StaffID
                    LEFT JOIN Users cu ON sp.UserID = cu.UserID
                    ORDER BY d.DistributedAt DESC", conn);

                var list = new List<object>();
                await using var r = await cmd.ExecuteReaderAsync();
                while (await r.ReadAsync())
                {
                    list.Add(new
                    {
                        distributionId = Convert.ToInt32(r["DistributionID"]),
                        itemId = Convert.ToInt32(r["ItemID"]),
                        itemName = r["ItemName"].ToString(),
                        quantityDistributed = Convert.ToInt32(r["QuantityDistributed"]),
                        receiverUserId = r["ReceiverUserID"] == DBNull.Value ? (int?)null : Convert.ToInt32(r["ReceiverUserID"]),
                        receiverName = r["ReceiverName"] == DBNull.Value ? "Genel Dağıtım" : r["ReceiverName"].ToString(),
                        distributedByStaff = Convert.ToInt32(r["DistributedByStaff"]),
                        staffName = r["StaffName"].ToString(),
                        courierStaffId = r["CourierStaffID"] == DBNull.Value ? (int?)null : Convert.ToInt32(r["CourierStaffID"]),
                        courierName = r["CourierName"] == DBNull.Value ? null : r["CourierName"].ToString(),
                        transportType = r["TransportType"].ToString(),
                        distributionNote = r["DistributionNote"].ToString(),
                        distributedAt = r["DistributedAt"].ToString()
                    });
                }
                return Results.Ok(list);
            }
            catch (Exception ex)
            {
                return Results.Json(new { error = ex.Message }, statusCode: 500);
            }
        }).RequireAuthorization(AuthPolicies.Logistics);

        // ---------------------------------------------------------
        //  STAFF MANAGEMENT ENDPOINTS
        // ---------------------------------------------------------
    }
}

