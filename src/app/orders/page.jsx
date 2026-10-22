"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, RefreshCw, Eye, XCircle, AlertCircle, CheckCircle2, X, Clock, ShoppingCart } from "lucide-react";

export default function OrdersListPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Notifications
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Cancelling State
  const [cancellingId, setCancellingId] = useState(null);

  // Fetch orders from API
  const fetchOrders = async (currentSearch = searchTerm) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (currentSearch.trim()) params.set("search", currentSearch.trim());

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to load orders" });
      }
    } catch (err) {
      setFeedback({ type: "error", message: "Network error: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  // Live real-time search whenever user types in orders search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders(searchTerm);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  // View order detail
  const handleOpenDetail = async (orderId) => {
    setLoadingDetail(true);
    setSelectedOrder({ id: orderId, loading: true });
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedOrder(data.order);
      } else {
        setFeedback({ type: "error", message: data.error || "Failed to load order details" });
        setSelectedOrder(null);
      }
    } catch (err) {
      setFeedback({ type: "error", message: "Network error: " + err.message });
      setSelectedOrder(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Cancel order handler
  const handleCancelOrder = async (orderId) => {
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel Order #${orderId}? This will restore all items back to inventory.`
    );
    if (!confirmCancel) return;

    setCancellingId(orderId);
    setFeedback({ type: "", message: "" });

    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedback({
          type: "success",
          message: data.message || `Order #${orderId} was cancelled and stock was restored to inventory.`,
        });

        // If detail modal is open for this order, update it
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder({ ...selectedOrder, status: "Cancelled" });
        }

        // Refresh orders list
        fetchOrders();
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Failed to cancel order.",
        });
      }
    } catch (err) {
      setFeedback({ type: "error", message: "Network error: " + err.message });
    } finally {
      setCancellingId(null);
    }
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order Management</h1>
          <p className="text-sm text-slate-500">
            Track customer orders, inspect item details, and manage cancellations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/orders/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Create New Order
          </Link>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback.message && (
        <div
          className={`flex items-center justify-between p-4 rounded-lg border text-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-rose-50 border-rose-300 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback({ type: "", message: "" })}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar (Instant live search) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Type to search by customer name or Order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Filter Status:</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
            {["all", "Placed", "Cancelled"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  statusFilter === st
                    ? "bg-white text-indigo-700 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {st === "all" ? "All Orders" : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Order Total</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Creation Time</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      Loading orders...
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    <ShoppingCart className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No orders found.{" "}
                    <Link href="/orders/new" className="text-indigo-600 font-semibold hover:underline">
                      Create your first order
                    </Link>
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isPlaced = o.status === "Placed";
                  const isCancellingThis = cancellingId === o.id;

                  return (
                    <tr key={o.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">#{o.id}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">{o.customerName}</td>
                      <td className="py-3.5 px-4 text-center text-slate-600">{o.itemCount || 1} item(s)</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        ${parseFloat(o.totalAmount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isPlaced ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Placed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                            Cancelled
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(o.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition"
                            title="View order line items"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>

                          {isPlaced && (
                            <button
                              onClick={() => handleCancelOrder(o.id)}
                              disabled={isCancellingThis}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition disabled:opacity-50"
                              title="Cancel order and restore stock"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              {isCancellingThis ? "Cancelling..." : "Cancel"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: View Order Details */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 animate-in fade-in max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Order Details <span className="font-mono text-indigo-600">#{selectedOrder.id}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Placed on {formatDate(selectedOrder.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer & Status Header Card */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase">Customer Name</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedOrder.customerName}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase">Order Status</div>
                <div className="mt-0.5">
                  {selectedOrder.status === "Placed" ? (
                    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Placed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                      Cancelled
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b text-slate-600 uppercase font-semibold">
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOrder.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-medium text-slate-900">{item.productName}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">{item.productSku}</td>
                      <td className="py-2.5 px-3 text-right">${parseFloat(item.unitPrice).toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                        ${parseFloat(item.subtotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total Summary */}
            <div className="flex justify-between items-center bg-slate-100 p-3 rounded-lg mb-6">
              <span className="text-sm font-semibold text-slate-700">Order Grand Total:</span>
              <span className="text-xl font-black text-indigo-700">
                ${parseFloat(selectedOrder.totalAmount).toFixed(2)}
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                {selectedOrder.status === "Placed" && (
                  <button
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    disabled={cancellingId === selectedOrder.id}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    {cancellingId === selectedOrder.id ? "Cancelling Order..." : "Cancel Order & Restore Stock"}
                  </button>
                )}
                {selectedOrder.status === "Cancelled" && (
                  <span className="text-xs text-slate-500 italic">
                    This order was cancelled. Stock has been restored.
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
