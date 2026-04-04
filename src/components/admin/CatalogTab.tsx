import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Download, Plus, Edit, Trash2, X, RefreshCw, PackagePlus, Database } from 'lucide-react';
import { Product, CATEGORIES } from '../../data/products';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, updateDoc, deleteDoc, setDoc, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore';
import { fmt } from './adminTypes';

interface CatalogTabProps {
  activeTab: 'products' | 'inventory' | 'add-product';
  products: Product[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
  setActiveTab: (tab: string) => void;
}

export const CatalogTab = React.memo(function CatalogTab({ activeTab, products, showToast, setActiveTab }: CatalogTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '', brand: '', price: 0, category: 'cpu', description: '', stock: 10,
    icon: '📦', img: 'https://picsum.photos/seed/pc/800/600', specs: [],
    perf: { gaming: 50, office: 50, editing: 50 }
  });

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.brand.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = catFilter === 'all' || p.category === catFilter;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, catFilter]);

  const handleDeleteProduct = async (id: number) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteDoc(doc(db, 'products', id.toString()));
      showToast('Product deleted');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await updateDoc(doc(db, 'products', editingProduct.id.toString()), { ...editingProduct });
      setEditingProduct(null);
      showToast('Product updated');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${editingProduct.id}`);
    }
  };

  const handleExportInventory = () => {
    const rows = [
      ['SKU', 'Name', 'Category', 'Brand', 'Stock', 'Status'],
      ...products.map(p => [
        `NPC-${p.category.toUpperCase().slice(0, 3)}-${p.id.toString().padStart(4, '0')}`,
        p.name, p.category, p.brand, p.stock.toString(),
        p.stock === 0 ? 'Out of Stock' : p.stock <= 5 ? 'Low Stock' : 'In Stock'
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'inventory.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast('Inventory exported');
  };

  const handleUpdateStock = async (id: number, newStock: number) => {
    if (newStock < 0) return;
    try {
      await updateDoc(doc(db, 'products', id.toString()), { stock: newStock });
      showToast('Stock updated');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${id}`);
      showToast('Failed to update stock', 'error');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = Date.now();
      await setDoc(doc(db, 'products', id.toString()), { ...newProduct, id });
      showToast('Product added successfully');
      setActiveTab('products');
      setNewProduct({
        name: '', brand: '', price: 0, category: 'cpu', description: '', stock: 10,
        icon: '📦', img: 'https://picsum.photos/seed/pc/800/600', specs: [],
        perf: { gaming: 50, office: 50, editing: 50 }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'products');
    }
  };

  return (
    <>
        {/* Edit Product Modal */}
        <AnimatePresence>
          {editingProduct && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingProduct(null)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                  <h3 className="text-xl font-bold text-gray-900">Edit Product</h3>
                  <button 
                    onClick={() => setEditingProduct(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                </div>
                <div className="p-8 max-h-[80vh] overflow-y-auto">
                  <form onSubmit={handleUpdateProduct} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Product Name</label>
                        <input 
                          required
                          type="text" 
                          value={editingProduct.name}
                          onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Brand</label>
                        <input 
                          required
                          type="text" 
                          value={editingProduct.brand}
                          onChange={(e) => setEditingProduct({ ...editingProduct, brand: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Category</label>
                        <select 
                          value={editingProduct.category}
                          onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all"
                        >
                          {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Price (₱)</label>
                        <input 
                          required
                          type="number" 
                          value={editingProduct.price || 0}
                          onChange={(e) => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) || 0 })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Stock</label>
                        <input 
                          required
                          type="number" 
                          value={editingProduct.stock || 0}
                          onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Image URL</label>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <input 
                            required
                            type="url" 
                            placeholder="https://example.com/image.jpg"
                            value={editingProduct.img}
                            onChange={(e) => setEditingProduct({ ...editingProduct, img: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all" 
                          />
                        </div>
                        {editingProduct.img && (
                          <div className="w-12 h-12 rounded-lg border border-gray-100 overflow-hidden bg-gray-50 flex-shrink-0">
                            <img 
                              src={editingProduct.img} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                              onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150?text=Error')}
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Description</label>
                      <textarea 
                        rows={4}
                        value={editingProduct.description}
                        onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all resize-none"
                      />
                    </div>

                    {/* Compatibility Fields */}
                    {['cpu', 'motherboard', 'ram', 'gpu', 'psu'].includes(editingProduct.category || '') && (
                      <div className="border border-dashed border-green-200 bg-green-50/40 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-green-700">⚡ Compatibility Fields</span>
                          <span className="text-[10px] text-green-500">— used by PC Builder to detect incompatible parts</span>
                        </div>

                        {['cpu', 'motherboard'].includes(editingProduct.category || '') && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              CPU Socket <span className="text-gray-300 normal-case font-normal">(e.g. AM5, LGA1700, LGA1851)</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. AM5"
                              value={editingProduct.socket || ''}
                              onChange={(e) => setEditingProduct({ ...editingProduct, socket: e.target.value })}
                              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all"
                            />
                          </div>
                        )}

                        {['motherboard', 'ram'].includes(editingProduct.category || '') && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              RAM Type <span className="text-gray-300 normal-case font-normal">(e.g. DDR4, DDR5)</span>
                            </label>
                            <select
                              value={editingProduct.ramType || ''}
                              onChange={(e) => setEditingProduct({ ...editingProduct, ramType: e.target.value })}
                              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all"
                            >
                              <option value="">— Select RAM Type —</option>
                              <option value="DDR3">DDR3</option>
                              <option value="DDR4">DDR4</option>
                              <option value="DDR5">DDR5</option>
                            </select>
                          </div>
                        )}

                        {['cpu', 'gpu', 'psu'].includes(editingProduct.category || '') && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              {editingProduct.category === 'psu' ? 'PSU Wattage (W)' : 'TDP / Power Draw (W)'}
                              <span className="text-gray-300 normal-case font-normal ml-1">
                                {editingProduct.category === 'psu' ? '(e.g. 650, 850)' : '(e.g. 125, 200)'}
                              </span>
                            </label>
                            <input
                              type="number"
                              placeholder={editingProduct.category === 'psu' ? 'e.g. 650' : 'e.g. 125'}
                              value={editingProduct.watts || ''}
                              onChange={(e) => setEditingProduct({ ...editingProduct, watts: parseInt(e.target.value) || undefined })}
                              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setEditingProduct(null)}
                        className="flex-1 px-6 py-4 border border-gray-200 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-gray-50 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 bg-green-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {activeTab === 'products' && (
              <motion.div 
                key="products"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Products</h2>
                    <p className="text-sm text-gray-400">{filteredProducts.length} products in catalog</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Search products..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-green-500 outline-none w-64"
                      />
                    </div>
                    <select 
                      value={catFilter}
                      onChange={(e) => setCatFilter(e.target.value)}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-green-500 outline-none"
                    >
                      <option value="all">All Categories</option>
                      {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Product</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Category</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Brand</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Price</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Stock</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredProducts.map(product => (
                          <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl border border-gray-200">
                                  {product.icon}
                                </div>
                                <div className="font-bold text-sm text-gray-900">{product.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                {product.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{product.brand}</td>
                            <td className="px-6 py-4 text-sm font-bold text-red-600">{fmt(product.price)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${product.stock <= 5 ? 'bg-orange-500' : 'bg-green-500'}`} 
                                    style={{ width: `${Math.min(100, (product.stock / 20) * 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-mono font-bold text-gray-500">{product.stock}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => setEditingProduct(product)}
                                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                >
                                  <Edit size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'inventory' && (
              <motion.div 
                key="inventory"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Inventory</h2>
                    <p className="text-sm text-gray-400">Monitor and manage stock levels</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleExportInventory}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-green-500 hover:text-green-600 transition-all"
                    >
                      <Download size={16} />
                      Export CSV
                    </button>
                    <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-green-500 hover:text-green-600 transition-all">
                      Sync Stock
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">In Stock</div>
                    <div className="text-3xl font-bold text-green-600">{products.filter(p => p.stock > 5).length}</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Low Stock</div>
                    <div className="text-3xl font-bold text-orange-500">{products.filter(p => p.stock <= 5 && p.stock > 0).length}</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Out of Stock</div>
                    <div className="text-3xl font-bold text-red-600">{products.filter(p => p.stock === 0).length}</div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">Total Items</div>
                    <div className="text-3xl font-bold text-gray-900">{products.length}</div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Product</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">SKU</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">In Stock</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Status</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {products.map(product => (
                          <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl border border-gray-200">
                                  {product.icon}
                                </div>
                                <div className="font-bold text-sm text-gray-900">{product.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-gray-400">NPC-{product.category.toUpperCase().slice(0, 3)}-{product.id.toString().padStart(4, '0')}</td>
                            <td className="px-6 py-4">
                              <input 
                                type="number" 
                                value={product.stock}
                                onChange={(e) => handleUpdateStock(product.id, parseInt(e.target.value))}
                                className="w-20 px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-green-500 outline-none"
                              />
                            </td>
                            <td className="px-6 py-4">
                              {product.stock === 0 ? (
                                <span className="px-2 py-1 bg-red-100 text-red-600 rounded-md text-[10px] font-bold uppercase tracking-wider">Out of Stock</span>
                              ) : product.stock <= 5 ? (
                                <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-md text-[10px] font-bold uppercase tracking-wider">Low Stock</span>
                              ) : (
                                <span className="px-2 py-1 bg-green-100 text-green-600 rounded-md text-[10px] font-bold uppercase tracking-wider">In Stock</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <button 
                                onClick={() => handleUpdateStock(product.id, product.stock + 10)}
                                className="text-xs font-bold text-green-600 hover:underline"
                              >
                                Restock +10
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'add-product' && (
              <motion.div 
                key="add-product"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-2xl mx-auto"
              >
                <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-xl">
                  <h2 className="text-2xl font-bold text-gray-900 mb-8">Add New Product</h2>
                  <form onSubmit={handleAddProduct} className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Product Name</label>
                        <input 
                          required
                          type="text" 
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Brand</label>
                        <input 
                          required
                          type="text" 
                          value={newProduct.brand}
                          onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Category</label>
                        <select 
                          value={newProduct.category}
                          onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all"
                        >
                          {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Price (₱)</label>
                        <input 
                          required
                          type="number" 
                          value={newProduct.price || 0}
                          onChange={(e) => setNewProduct({ ...newProduct, price: parseInt(e.target.value) || 0 })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Initial Stock</label>
                        <input 
                          required
                          type="number" 
                          value={newProduct.stock || 0}
                          onChange={(e) => setNewProduct({ ...newProduct, stock: parseInt(e.target.value) || 0 })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all" 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Image URL</label>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <input 
                            required
                            type="url" 
                            placeholder="https://example.com/image.jpg"
                            value={newProduct.img}
                            onChange={(e) => setNewProduct({ ...newProduct, img: e.target.value })}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all" 
                          />
                        </div>
                        {newProduct.img && (
                          <div className="w-12 h-12 rounded-lg border border-gray-100 overflow-hidden bg-gray-50 flex-shrink-0">
                            <img 
                              src={newProduct.img} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                              onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150?text=Error')}
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Description</label>
                      <textarea 
                        rows={4}
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all resize-none"
                      />
                    </div>

                    {/* Compatibility Fields */}
                    {['cpu', 'motherboard', 'ram', 'gpu', 'psu'].includes(newProduct.category || '') && (
                      <div className="border border-dashed border-green-200 bg-green-50/40 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-green-700">⚡ Compatibility Fields</span>
                          <span className="text-[10px] text-green-500">— used by PC Builder to detect incompatible parts</span>
                        </div>

                        {['cpu', 'motherboard'].includes(newProduct.category || '') && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              CPU Socket <span className="text-gray-300 normal-case font-normal">(e.g. AM5, LGA1700, LGA1851)</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. AM5"
                              value={newProduct.socket || ''}
                              onChange={(e) => setNewProduct({ ...newProduct, socket: e.target.value })}
                              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all"
                            />
                          </div>
                        )}

                        {['motherboard', 'ram'].includes(newProduct.category || '') && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              RAM Type <span className="text-gray-300 normal-case font-normal">(e.g. DDR4, DDR5)</span>
                            </label>
                            <select
                              value={newProduct.ramType || ''}
                              onChange={(e) => setNewProduct({ ...newProduct, ramType: e.target.value })}
                              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all"
                            >
                              <option value="">— Select RAM Type —</option>
                              <option value="DDR3">DDR3</option>
                              <option value="DDR4">DDR4</option>
                              <option value="DDR5">DDR5</option>
                            </select>
                          </div>
                        )}

                        {['cpu', 'gpu', 'psu'].includes(newProduct.category || '') && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              {newProduct.category === 'psu' ? 'PSU Wattage (W)' : 'TDP / Power Draw (W)'}
                              <span className="text-gray-300 normal-case font-normal ml-1">
                                {newProduct.category === 'psu' ? '(e.g. 650, 850)' : '(e.g. 125, 200)'}
                              </span>
                            </label>
                            <input
                              type="number"
                              placeholder={newProduct.category === 'psu' ? 'e.g. 650' : 'e.g. 125'}
                              value={newProduct.watts || ''}
                              onChange={(e) => setNewProduct({ ...newProduct, watts: parseInt(e.target.value) || undefined })}
                              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <button 
                      type="submit"
                      className="w-full bg-green-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                    >
                      Create Product
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

    </>
  );
});
