"use client";

import { useState, useEffect } from "react";
import { History, RefreshCw, ArrowUpRight, ArrowDownLeft, Sliders, PackagePlus, AlertCircle } from "lucide-react";

export default function InventoryLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/inventory-logs");
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      } else {
        setError(data.error || "Failed to load inventory logs.");
      }
    } catch (err) {
      setError("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
  };

  const renderBadge = (changeType) => {
    switch (changeType) {
      case "ORDER_DEDUCTION":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <ArrowDownLeft className="w-3 h-3" /> Order Deduction
          </span>
        );
      case "ORDER_RESTOCK":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowUpRight className="w-3 h-3" /> Cancellation Restock
          </span>
        );
      case "MANUAL_UPDATE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Sliders className="w-3 h-3" /> Manual Update
          </span>
        );
      case "INITIAL_STOCK":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <PackagePlus className="w-3 h-3" /> Initial Stock
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 mb-2">
            Bonus Feature: Audit Trail
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Movement History</h1>
          <p className="text-sm text-slate-500">
            Complete audit trail showing initial stock, order deductions, manual adjustments, and cancellation restocks.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Log
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <th className="py-3 px-4">Log ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Movement Type</th>
                <th className="py-3 px-4 text-center">Change Qty</th>
                <th className="py-3 px-4 text-center">Resulting Stock</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      Loading inventory movement history...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    No inventory movement records found yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isPositive = log.quantityChange > 0;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono text-slate-500 text-xs">#{log.id}</td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap text-xs">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{log.productName}</td>
                      <td className="py-3 px-4">{renderBadge(log.changeType)}</td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span
                          className={
                            isPositive
                              ? "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded"
                              : "text-rose-700 bg-rose-50 px-2 py-0.5 rounded"
                          }
                        >
                          {isPositive ? `+${log.quantityChange}` : log.quantityChange}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {log.resultingStock}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-indigo-700 font-semibold">
                        {log.referenceId || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">{log.note || "-"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
