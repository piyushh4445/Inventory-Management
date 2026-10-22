"use client";

import { useState, useEffect } from "react";
import { Plus, Search, RefreshCw, AlertCircle, CheckCircle2, Edit3, X, PackageCheck, AlertTriangle } from "lucide-react";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stockStatus, setStockStatus] = useState("all");
  const [stockOrder, setStockOrder] = useState("");

  // Notifications
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Modal / Form state for Add Product
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    price: "",
    stockQuantity: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal state for Edit Stock
  const [editingProduct, setEditingProduct] = useState(null);
  const [newStockVal, setNewStockVal] = useState("");
  const [updatingStock, setUpdatingStock] = useState(false);

  // Fetch products from API
  const fetchProducts = async (currentSearch = search) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (currentSearch.trim()) queryParams.set("search", currentSearch.trim());
      if (stockStatus !== "all") queryParams.set("stockStatus", stockStatus);
      if (stockOrder) queryParams.set("stockOrder", stockOrder);

      const res = await fetch(`/api/products?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
      } else {
        setErrorMsg(data.error || "Failed to load products");
      }
    } catch (err) {
      setErrorMsg("Error fetching products: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Live real-time search whenever user types in search box
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(search);
    }, 150);
    return () => clearTimeout(timer);
  }, [search, stockStatus, stockOrder]);

  // Add Product submission handler
  const handleAddProduct = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(`Product "${data.product.name}" (SKU: ${data.product.sku}) created successfully!`);
        setShowAddModal(false);
        setNewProduct({ name: "", sku: "", price: "", stockQuantity: "" });
        fetchProducts();
      } else {
        setErrorMsg(data.error || "Failed to add product");
      }
    } catch (err) {
      setErrorMsg("Network error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Stock submission handler
  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    setErrorMsg("");
    setSuccessMsg("");
    setUpdatingStock(true);

    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockQuantity: parseInt(newStockVal, 10) }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg(`Stock for "${editingProduct.name}" updated to ${newStockVal}!`);
        setEditingProduct(null);
        fetchProducts();
      } else {
        setErrorMsg(data.error || "Failed to update stock");
      }
    } catch (err) {
      setErrorMsg("Network error: " + err.message);
    } finally {
      setUpdatingStock(false);
    }
  };

  // Quick stats
  const totalProducts = products.length;
  const inStockCount = products.filter((p) => p.stockQuantity > 0).length;
  const outOfStockCount = products.filter((p) => p.stockQuantity <= 0).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products & Inventory Management</h1>
          <p className="text-sm text-slate-500">
            View existing inventory, add new products, and update product stock levels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProducts}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              setShowAddModal(true);
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Catalog Products</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalProducts}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">In Stock Products</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{inStockCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Out of Stock Products</div>
          <div className="text-2xl font-bold text-rose-700 mt-1">{outOfStockCount}</div>
        </div>
      </div>

      {/* Alerts / Feedback Banner */}
      {successMsg && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg("")} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Live Search & Filter Controls (Instant search as you type) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Type to search product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Stock Filter:</span>
          <select
            value={stockStatus}
            onChange={(e) => setStockStatus(e.target.value)}
            className="w-full md:w-auto px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Products</option>
            <option value="inStock">In Stock (&gt; 0)</option>
            <option value="outOfStock">Out of Stock (= 0)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <label htmlFor="stock-order" className="text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">
            Sort by stock:
          </label>
          <select
            id="stock-order"
            value={stockOrder}
            onChange={(e) => setStockOrder(e.target.value)}
            className="w-full md:w-auto px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Default order</option>
            <option value="asc">Lowest to highest</option>
            <option value="desc">Highest to lowest</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4 text-right">Price ($)</th>
                <th className="py-3 px-4 text-center">Available Stock</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      Loading products...
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isOutOfStock = p.stockQuantity <= 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">#{p.id}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{p.name}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">
                          {p.sku}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900">
                        ${parseFloat(p.price).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center font-bold">
                        <span className={isOutOfStock ? "text-rose-600" : "text-slate-900"}>
                          {p.stockQuantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            Out of Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setNewStockVal(p.stockQuantity.toString());
                            setErrorMsg("");
                            setSuccessMsg("");
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Update Stock
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Add New Product */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-lg font-bold text-slate-900">Add New Product</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ergonomic Office Chair"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  SKU (Unique Code) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CHR-ERG-009"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-400">Must be unique across the catalog</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="29.99"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Initial Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    placeholder="10"
                    value={newProduct.stockQuantity}
                    onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Update Stock Quantity */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h2 className="text-lg font-bold text-slate-900">Update Stock</h2>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-slate-800">{editingProduct.name}</p>
              <p className="text-xs font-mono text-slate-500 mt-0.5">SKU: {editingProduct.sku}</p>
              <p className="text-xs text-slate-500 mt-1">
                Current Stock: <span className="font-bold text-slate-900">{editingProduct.stockQuantity}</span>
              </p>
            </div>

            <form onSubmit={handleUpdateStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  New Stock Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={newStockVal}
                  onChange={(e) => setNewStockVal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingStock}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {updatingStock ? "Updating..." : "Save Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
