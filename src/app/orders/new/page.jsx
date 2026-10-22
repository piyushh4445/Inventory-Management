"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Search,
  X,
  Package,
  Check,
} from "lucide-react";

export default function CreateOrderPage() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Form State
  const [customerName, setCustomerName] = useState("");
  // Initially EMPTY order items as requested
  const [orderItems, setOrderItems] = useState([]);

  // Modal / Dialog State for selecting products
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [dialogSearch, setDialogSearch] = useState("");
  const [tempSelectedIds, setTempSelectedIds] = useState(new Set());

  // Submission State & Feedback
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch products from inventory API
  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      }
    } catch (err) {
      setErrorMessage("Failed to load catalog products: " + err.message);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadProducts();

    // Auto-restore draft selection from localStorage on page refresh
    try {
      const savedDraft = localStorage.getItem("oms_draft_order");
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.customerName) setCustomerName(parsed.customerName);
        if (Array.isArray(parsed.orderItems) && parsed.orderItems.length > 0) {
          setOrderItems(parsed.orderItems);
        }
      }
    } catch (e) {
      // Ignore storage parse errors
    }
  }, []);

  // Auto-save draft so refresh doesn't lose selected products or customer name
  useEffect(() => {
    try {
      if (customerName || orderItems.length > 0) {
        localStorage.setItem(
          "oms_draft_order",
          JSON.stringify({ customerName, orderItems })
        );
      } else {
        localStorage.removeItem("oms_draft_order");
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, [customerName, orderItems]);

  // Open dialog and initialize selection with products already in the order
  const handleOpenDialog = () => {
    const currentIds = new Set(orderItems.map((item) => item.productId));
    setTempSelectedIds(currentIds);
    setDialogSearch("");
    setShowProductDialog(true);
  };

  // Toggle selection inside the dialog
  const handleToggleProduct = (prodId) => {
    const updated = new Set(tempSelectedIds);
    if (updated.has(prodId)) {
      updated.delete(prodId);
    } else {
      updated.add(prodId);
    }
    setTempSelectedIds(updated);
  };

  // Confirm dialog selection and populate order items
  const handleConfirmAddProducts = () => {
    const newItems = [];
    // Keep existing items with their adjusted quantities if still selected
    const existingMap = new Map(orderItems.map((item) => [item.productId, item]));

    for (const prodId of tempSelectedIds) {
      if (existingMap.has(prodId)) {
        newItems.push(existingMap.get(prodId));
      } else {
        const prod = products.find((p) => p.id === prodId);
        if (prod) {
          newItems.push({
            productId: prod.id,
            name: prod.name,
            sku: prod.sku,
            unitPrice: parseFloat(prod.price),
            stockAvailable: prod.stockQuantity,
            quantity: 1, // Default quantity = 1
          });
        }
      }
    }

    setOrderItems(newItems);
    setShowProductDialog(false);
  };

  // Update item quantity in order items table
  const handleQuantityChange = (productId, newQty) => {
    const parsed = parseInt(newQty, 10);
    const updated = orderItems.map((item) => {
      if (item.productId === productId) {
        return { ...item, quantity: isNaN(parsed) ? "" : parsed };
      }
      return item;
    });
    setOrderItems(updated);
  };

  // Remove single product row
  const handleRemoveItem = (productId) => {
    setOrderItems(orderItems.filter((item) => item.productId !== productId));
  };

  // Calculate live grand total
  const totalAmount = orderItems.reduce((acc, item) => {
    const qty = item.quantity > 0 ? item.quantity : 0;
    return acc + item.unitPrice * qty;
  }, 0);

  // Check if any row has insufficient stock warning
  const hasInsufficientStockWarning = orderItems.some(
    (item) => item.quantity > item.stockAvailable
  );

  // Submit Order to backend
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setOrderSuccess(null);

    // Frontend validations
    if (!customerName.trim()) {
      setErrorMessage("Please enter customer name.");
      return;
    }

    if (orderItems.length === 0) {
      setErrorMessage("Please add at least one product to the order.");
      return;
    }

    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      if (!item.quantity || item.quantity <= 0) {
        setErrorMessage(`Quantity for "${item.name}" must be greater than 0.`);
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        customerName: customerName.trim(),
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setOrderSuccess(data);
        // Clear draft from localStorage on successful order creation
        try {
          localStorage.removeItem("oms_draft_order");
        } catch (e) {}
        // Refresh product list so inventory stock updates are fetched
        loadProducts();
      } else {
        setErrorMessage(data.error || "Failed to place order.");
      }
    } catch (err) {
      setErrorMessage("Network error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form to place another order
  const handleResetForm = () => {
    setCustomerName("");
    setOrderItems([]);
    setOrderSuccess(null);
    setErrorMessage("");
    try {
      localStorage.removeItem("oms_draft_order");
    } catch (e) {}
  };

  // Filter products for the dialog search
  const filteredDialogProducts = products.filter((p) => {
    if (!dialogSearch.trim()) return true;
    const term = dialogSearch.toLowerCase();
    return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Orders
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Create New Order</h1>
          <p className="text-sm text-slate-500">
            Select products, specify quantities, and review total amount before placing the order.
          </p>
        </div>
      </div>

      {/* Success Banner when order is placed */}
      {orderSuccess && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-6 text-emerald-900 space-y-4 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xl font-bold text-emerald-900">Order Placed Successfully!</h3>
              <p className="text-sm text-emerald-700 mt-1">
                The order has been saved and inventory was automatically deducted.
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
                <span className="bg-emerald-100 px-3 py-1 rounded-md border border-emerald-300">
                  Order ID: <span className="font-mono text-emerald-900">#{orderSuccess.order.id}</span>
                </span>
                <span className="bg-emerald-100 px-3 py-1 rounded-md border border-emerald-300">
                  Customer: <span className="text-emerald-900">{orderSuccess.order.customerName}</span>
                </span>
                <span className="bg-emerald-100 px-3 py-1 rounded-md border border-emerald-300">
                  Total Amount: <span className="text-emerald-900">${parseFloat(orderSuccess.order.totalAmount).toFixed(2)}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleResetForm}
              className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm font-medium hover:bg-emerald-800 transition"
            >
              + Place Another Order
            </button>
            <Link
              href="/orders"
              className="px-4 py-2 bg-white border border-emerald-400 text-emerald-800 rounded-lg text-sm font-medium hover:bg-emerald-50 transition"
            >
              View All Orders
            </Link>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl text-rose-900 text-sm flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-rose-900">Order Creation Failed</div>
            <div className="text-rose-700 mt-0.5">{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Order Creation Form */}
      {!orderSuccess && (
        <form onSubmit={handleSubmitOrder} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. John Doe, Sarah Connor"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Line Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Order Items ({orderItems.length})
              </h2>
              <button
                type="button"
                onClick={handleOpenDialog}
                disabled={loadingProducts}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition border border-indigo-200"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>

            {/* EMPTY STATE: Shown initially when no products are added yet */}
            {orderItems.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 p-6">
                <Package className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <h3 className="text-sm font-bold text-slate-700">No products added yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Click the "+ Add Product" button above to open the product catalog and select products for this order.
                </p>
                <button
                  type="button"
                  onClick={handleOpenDialog}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm transition"
                >
                  <Plus className="w-4 h-4" /> Select Products
                </button>
              </div>
            ) : (
              /* PRODUCTS TABLE / CARDS */
              <div className="space-y-3">
                {orderItems.map((item, index) => {
                  const lineTotal = (item.unitPrice * (item.quantity > 0 ? item.quantity : 0)).toFixed(2);
                  const isStockInsufficient = item.quantity > item.stockAvailable;

                  return (
                    <div
                      key={item.productId}
                      className={`p-3.5 rounded-lg border transition ${
                        isStockInsufficient
                          ? "bg-rose-50 border-rose-300"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        {/* Product Info */}
                        <div className="md:col-span-5">
                          <div className="text-xs text-slate-400 font-semibold uppercase">Product #{index + 1}</div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5">{item.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-[11px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                              {item.sku}
                            </span>
                            <span className={`text-[11px] font-semibold ${item.stockAvailable > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                              Available Stock: {item.stockAvailable}
                            </span>
                          </div>
                        </div>

                        {/* Quantity Input */}
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            required
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                            className={`w-full px-3 py-2 border rounded-md text-sm text-center font-bold focus:outline-none focus:ring-2 ${
                              isStockInsufficient
                                ? "border-rose-400 bg-white text-rose-700 focus:ring-rose-400"
                                : "border-slate-300 bg-white focus:ring-indigo-500"
                            }`}
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="md:col-span-2 text-right">
                          <div className="text-[11px] font-semibold text-slate-500 uppercase">Unit Price</div>
                          <div className="text-sm font-medium text-slate-800 mt-1">
                            ${item.unitPrice.toFixed(2)}
                          </div>
                        </div>

                        {/* Subtotal */}
                        <div className="md:col-span-2 text-right">
                          <div className="text-[11px] font-semibold text-slate-500 uppercase">Subtotal</div>
                          <div className="text-base font-bold text-slate-900 mt-0.5">${lineTotal}</div>
                        </div>

                        {/* Remove Action */}
                        <div className="md:col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.productId)}
                            title="Remove product"
                            className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Insufficient Stock Inline Warning */}
                      {isStockInsufficient && (
                        <div className="mt-2 text-xs text-rose-700 flex items-center gap-1 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          Warning: Available stock is only {item.stockAvailable}. Order will be rejected if submitted!
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Grand Total Summary Box */}
          <div className="bg-slate-100 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase">Total Items</div>
              <div className="text-sm font-bold text-slate-800">
                {orderItems.reduce((acc, it) => acc + (it.quantity > 0 ? it.quantity : 0), 0)} unit(s) across {orderItems.length} product(s)
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-semibold text-slate-500 uppercase">Order Grand Total</div>
              <div className="text-2xl font-black text-indigo-700">${totalAmount.toFixed(2)}</div>
            </div>
          </div>

          {/* Validation Notice if insufficient stock */}
          {hasInsufficientStockWarning && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>
                <strong>Note:</strong> Some items exceed available stock. As per the system rules, if ANY item lacks stock, the entire order will be rejected.
              </span>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/orders"
              className="px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || orderItems.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow transition disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Placing Order...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" /> Place Order (${totalAmount.toFixed(2)})
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* DIALOG BOX: MULTI-SELECT PRODUCTS WITH LIVE SEARCH BOX   */}
      {/* ========================================================= */}
      {showProductDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full p-6 border border-slate-200 animate-in fade-in flex flex-col max-h-[85vh]">
            {/* Dialog Header */}
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Select Products for Order</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pick one or multiple products from the catalog to add to this order.
                </p>
              </div>
              <button
                onClick={() => setShowProductDialog(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Search Box inside Dialog */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Search products by name or SKU..."
                value={dialogSearch}
                onChange={(e) => setDialogSearch(e.target.value)}
                className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {dialogSearch && (
                <button
                  onClick={() => setDialogSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Product List with Multi-Select Checkboxes */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 border rounded-lg max-h-72">
              {filteredDialogProducts.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  No products found matching "{dialogSearch}".
                </div>
              ) : (
                filteredDialogProducts.map((p) => {
                  const isSelected = tempSelectedIds.has(p.id);
                  const isOutOfStock = p.stockQuantity <= 0;

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleToggleProduct(p.id)}
                      className={`flex items-center justify-between p-3 cursor-pointer transition ${
                        isSelected
                          ? "bg-indigo-50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Custom Checkbox */}
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center transition ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <div>
                          <div className="text-sm font-semibold text-slate-900">{p.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 font-semibold">
                              {p.sku}
                            </span>
                            <span>&bull;</span>
                            <span className="font-semibold text-slate-700">${parseFloat(p.price).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Stock Badge */}
                      <div>
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-100 text-rose-700 border border-rose-200">
                            Out of stock (0)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-700">
                            {p.stockQuantity} in stock
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-between pt-4 mt-3 border-t">
              <span className="text-xs font-semibold text-slate-600">
                {tempSelectedIds.size} product(s) selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowProductDialog(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddProducts}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm transition"
                >
                  Add to Order ({tempSelectedIds.size})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
