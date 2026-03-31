import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Package, 
  PackagePlus, 
  ShoppingCart, 
  Users, 
  Settings, 
  Globe, 
  LogOut, 
  Search, 
  Download, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Save, 
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  MoreVertical,
  ArrowUpRight,
  ArrowDownRight,
  Database
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Product, CATEGORIES } from '../data/products';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  writeBatch,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

interface Order {
  id: string;
  customer: string;
  email: string;
  items: number;
  total: number;
  payment: string;
  status: 'Processing' | 'Awaiting Payment' | 'Payment Submitted' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Refund Requested' | 'Return & Rejected';
  date: string;
  cartItems?: { id: number; name: string; price: number; qty: number }[];
}

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: string;
  joined: string;
}

interface Booking {
  id: string;
  uid: string;
  customer: string;
  email: string;
  phone: string;
  services: string;
  date: string;
  time: string;
  notes: string;
  status: 'Pending' | 'Accepted' | 'Declined';
  createdAt: any;
}

const SAMPLE_ORDERS: Order[] = [
  { id: '#ORD-001', customer: 'Marco Reyes', email: 'marco@email.com', items: 3, total: 28500, payment: 'GCash', status: 'Delivered', date: '2025-01-10' },
  { id: '#ORD-002', customer: 'Sofia Lim', email: 'sofia@email.com', items: 5, total: 62400, payment: 'PayPal', status: 'Shipped', date: '2025-01-12' },
  { id: '#ORD-003', customer: 'James Tan', email: 'james@email.com', items: 2, total: 14200, payment: 'Cash on Delivery', status: 'Processing', date: '2025-01-14' },
  { id: '#ORD-004', customer: 'Kyla Amador', email: 'kyla@email.com', items: 7, total: 89900, payment: 'GCash', status: 'Processing', date: '2025-01-15' },
  { id: '#ORD-005', customer: 'Rey Dela Cruz', email: 'rey@email.com', items: 1, total: 6800, payment: 'Cash on Delivery', status: 'Delivered', date: '2025-01-08' },
  { id: '#ORD-006', customer: 'Anna Santos', email: 'anna@email.com', items: 4, total: 42000, payment: 'GCash', status: 'Shipped', date: '2025-01-16' },
  { id: '#ORD-007', customer: 'Luis Garcia', email: 'luis@email.com', items: 2, total: 18500, payment: 'PayPal', status: 'Processing', date: '2025-01-17' },
  { id: '#ORD-008', customer: 'Maria Cruz', email: 'maria@email.com', items: 1, total: 9500, payment: 'Cash on Delivery', status: 'Delivered', date: '2025-01-06' },
];

const CUSTOMERS = [
  { name: 'Marco Reyes', email: 'marco@email.com', orders: 3, spent: 28500, joined: '2024-06-10', status: 'Active' },
  { name: 'Sofia Lim', email: 'sofia@email.com', orders: 5, spent: 62400, joined: '2024-07-22', status: 'Active' },
  { name: 'James Tan', email: 'james@email.com', orders: 2, spent: 14200, joined: '2024-09-05', status: 'Active' },
  { name: 'Kyla Amador', email: 'kyla@email.com', orders: 7, spent: 89900, joined: '2024-03-14', status: 'Active' },
  { name: 'Rey Dela Cruz', email: 'rey@email.com', orders: 1, spent: 6800, joined: '2024-11-20', status: 'Active' },
  { name: 'Anna Santos', email: 'anna@email.com', orders: 4, spent: 42000, joined: '2024-05-18', status: 'Active' },
  { name: 'Luis Garcia', email: 'luis@email.com', orders: 2, spent: 18500, joined: '2024-10-02', status: 'Inactive' },
  { name: 'Maria Cruz', email: 'maria@email.com', orders: 1, spent: 9500, joined: '2024-12-01', status: 'Active' },
];

const fmt = (n: number) => '₱' + n.toLocaleString();

export default function AdminDashboard({ onExit }: { onExit: () => void }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statPeriod, setStatPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'success' | 'error' }[]>([]);

  // New Product Form State
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    brand: '',
    price: 0,
    category: 'cpu',
    description: '',
    stock: 10,
    icon: '📦',
    img: 'https://picsum.photos/seed/pc/800/600',
    specs: [],
    perf: { gaming: 50, office: 50, editing: 50 }
  });

  // Firestore Listeners
  useEffect(() => {
    const pUnsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const pData = snapshot.docs.map(doc => ({ id: Number(doc.id), ...doc.data() } as Product));
      setProducts(pData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));

    const oUnsubscribe = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const oData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(oData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));

    const uUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const uData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(uData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    const bUnsubscribe = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const bData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      bData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setBookings(bData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'bookings'));

    return () => {
      pUnsubscribe();
      oUnsubscribe();
      uUnsubscribe();
      bUnsubscribe();
    };
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const stats = useMemo(() => {
    const now = new Date();

    // Date filter based on period
    const filterByPeriod = (dateStr: string) => {
      const d = new Date(dateStr);
      if (statPeriod === 'week') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        return d >= startOfWeek;
      }
      if (statPeriod === 'month') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      if (statPeriod === 'year') {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    };

    const filteredOrders = orders.filter(o => filterByPeriod(o.date));
    const totalRevenue = filteredOrders.reduce((acc, o) => acc + o.total, 0);
    const lowStockCount = products.filter(p => p.stock <= 5).length;
    const pendingOrders = filteredOrders.filter(o => o.status === 'Processing').length;
    const avgOrderValue = filteredOrders.length > 0 ? Math.round(totalRevenue / filteredOrders.length) : 0;

    // Chart data — changes per period
    let chartData: { name: string; revenue: number; orders: number }[] = [];

    if (statPeriod === 'week') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const byDay: { [k: string]: { revenue: number; orders: number } } = {};
      filteredOrders.forEach(o => {
        const d = days[new Date(o.date).getDay()];
        if (!byDay[d]) byDay[d] = { revenue: 0, orders: 0 };
        byDay[d].revenue += o.total;
        byDay[d].orders += 1;
      });
      chartData = days.map(d => ({ name: d, revenue: byDay[d]?.revenue || 0, orders: byDay[d]?.orders || 0 }));
    } else if (statPeriod === 'month') {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const byDay: { [k: number]: { revenue: number; orders: number } } = {};
      filteredOrders.forEach(o => {
        const day = new Date(o.date).getDate();
        if (!byDay[day]) byDay[day] = { revenue: 0, orders: 0 };
        byDay[day].revenue += o.total;
        byDay[day].orders += 1;
      });
      chartData = Array.from({ length: daysInMonth }, (_, i) => ({
        name: (i + 1).toString(),
        revenue: byDay[i + 1]?.revenue || 0,
        orders: byDay[i + 1]?.orders || 0,
      }));
    } else if (statPeriod === 'year') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const byMonth: { [k: number]: { revenue: number; orders: number } } = {};
      filteredOrders.forEach(o => {
        const m = new Date(o.date).getMonth();
        if (!byMonth[m]) byMonth[m] = { revenue: 0, orders: 0 };
        byMonth[m].revenue += o.total;
        byMonth[m].orders += 1;
      });
      chartData = months.map((m, i) => ({ name: m, revenue: byMonth[i]?.revenue || 0, orders: byMonth[i]?.orders || 0 }));
    }

    // Category distribution
    const catData = CATEGORIES.filter(c => c.id !== 'all').map(cat => ({
      name: cat.label,
      value: products.filter(p => p.category === cat.id).length
    }));

    return {
      revenue: totalRevenue,
      orders: filteredOrders.length,
      products: products.length,
      customers: users.length,
      lowStock: lowStockCount,
      pending: pendingOrders,
      avgOrderValue,
      chartData,
      catData,
    };
  }, [products, orders, users, statPeriod]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.brand.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = catFilter === 'all' || p.category === catFilter;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, catFilter]);

  const handleDeleteProduct = async (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteDoc(doc(db, 'products', id.toString()));
        showToast('Product deleted', 'error');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
      }
    }
  };

  const handleUpdateStock = async (id: number, newStock: number) => {
    if (newStock < 0) return;
    try {
      await updateDoc(doc(db, 'products', id.toString()), { stock: newStock });
      showToast('Stock updated');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${id}`);
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status });
      showToast(`Order ${id} updated to ${status}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const handleBookingAction = async (id: string, status: 'Accepted' | 'Declined') => {
    try {
      await updateDoc(doc(db, 'bookings', id), { status });
      showToast(`Booking ${status.toLowerCase()} successfully.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${id}`);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await updateDoc(doc(db, 'products', editingProduct.id.toString()), {
        ...editingProduct
      });
      showToast('Product updated successfully');
      setEditingProduct(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${editingProduct.id}`);
    }
  };

  const handleExportInventory = () => {
    try {
      // Define CSV headers
      const headers = ['ID', 'Name', 'Brand', 'Category', 'Price', 'Stock', 'Status'];
      
      // Map products to CSV rows
      const rows = products.map(p => [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`, // Escape quotes
        `"${p.brand.replace(/"/g, '""')}"`,
        p.category,
        p.price,
        p.stock,
        p.stock === 0 ? 'Out of Stock' : p.stock <= 5 ? 'Low Stock' : 'In Stock'
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('Inventory exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export inventory', 'error');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = Date.now();
      await setDoc(doc(db, 'products', id.toString()), {
        ...newProduct,
        id
      });
      showToast('Product added successfully');
      setActiveTab('products');
      setNewProduct({
        name: '',
        brand: '',
        price: 0,
        category: 'cpu',
        description: '',
        stock: 10,
        icon: '📦',
        img: 'https://picsum.photos/seed/pc/800/600',
        specs: [],
        perf: { gaming: 50, office: 50, editing: 50 }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'products');
    }
  };


  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111827] text-white flex flex-col fixed h-full z-50 transition-all duration-300">
        <div className="p-6 border-b border-white/10">
          <div className="text-2xl font-bold tracking-tighter">
            NEXUS<span className="text-green-500">PC</span>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono mt-1">
            Admin Panel v1.0
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 font-mono px-2 mb-2">Overview</div>
            <SidebarItem icon={<LayoutDashboard size={18} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <SidebarItem icon={<TrendingUp size={18} />} label="Analytics" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
          </div>

          <div className="h-px bg-white/5 mx-2" />

          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 font-mono px-2 mb-2">Catalog</div>
            <SidebarItem icon={<Package size={18} />} label="Products" active={activeTab === 'products'} onClick={() => setActiveTab('products')} />
            <SidebarItem icon={<RefreshCw size={18} />} label="Inventory" active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} />
            <SidebarItem icon={<PackagePlus size={18} />} label="Add Product" active={activeTab === 'add-product'} onClick={() => setActiveTab('add-product')} />
          </div>

          <div className="h-px bg-white/5 mx-2" />

          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 font-mono px-2 mb-2">Commerce</div>
            <SidebarItem 
              icon={<ShoppingCart size={18} />} 
              label="Orders" 
              active={activeTab === 'orders'} 
              onClick={() => setActiveTab('orders')} 
              badge={stats.pending > 0 ? stats.pending : undefined}
            />
            <SidebarItem
              icon={<Clock size={18} />}
              label="Bookings"
              active={activeTab === 'bookings'}
              onClick={() => setActiveTab('bookings')}
              badge={bookings.filter(b => b.status === 'Pending').length || undefined}
            />
            <SidebarItem icon={<Users size={18} />} label="Customers" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
          </div>

          <div className="h-px bg-white/5 mx-2" />

          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 font-mono px-2 mb-2">Site</div>
            <SidebarItem icon={<Settings size={18} />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            <SidebarItem icon={<Globe size={18} />} label="View Store" onClick={onExit} />
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center font-bold text-xs">AD</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">Admin</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wider">Administrator</div>
            </div>
            <LogOut size={16} className="text-white/40" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-gray-900 capitalize">{activeTab.replace('-', ' ')}</h1>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">NEXUS PC › {activeTab.replace('-', ' ')}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Live System</span>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:border-green-500 hover:text-green-600 transition-all">
              <Download size={16} />
              Export
            </button>
            <button 
              onClick={() => setActiveTab('add-product')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
            >
              <Plus size={16} />
              Add Product
            </button>
          </div>
        </header>

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

        {/* Page Content */}
        <div className="p-8 flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Period Selector */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                  {([
                    { key: 'week', label: 'This Week' },
                    { key: 'month', label: 'This Month' },
                    { key: 'year', label: 'This Year' },
                  ] as const).map(p => (
                    <button
                      key={p.key}
                      onClick={() => setStatPeriod(p.key)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                        statPeriod === p.key
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatCard icon={<TrendingUp />} label="Revenue" value={fmt(stats.revenue)} trend={statPeriod === 'week' ? 'This week' : statPeriod === 'month' ? 'This month' : 'This year'} color="green" />
                  <StatCard icon={<ShoppingCart />} label="Orders" value={stats.orders.toString()} trend={statPeriod === 'week' ? 'This week' : statPeriod === 'month' ? 'This month' : 'This year'} color="blue" />
                  <StatCard icon={<Package />} label="Products" value={stats.products.toString()} trend="Total in store" color="orange" />
                  <StatCard icon={<Users />} label="Customers" value={stats.customers.toString()} trend="Total registered" color="purple" />
                  <StatCard icon={<AlertTriangle />} label="Low Stock" value={stats.lowStock.toString()} trend="≤5 units left" color="red" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Revenue Chart */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900">
                          Revenue — {statPeriod === 'week' ? 'This Week' : statPeriod === 'month' ? 'This Month' : 'This Year'}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {statPeriod === 'week' ? 'Daily totals for the current week' : statPeriod === 'month' ? 'Daily totals for the current month' : 'Monthly totals for the current year'}
                        </p>
                      </div>
                    </div>
                    <div className="p-6 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.chartData}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#9ca3af' }} 
                            dy={10}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            tickFormatter={(val) => `₱${val/1000}k`}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            formatter={(val: number) => [fmt(val), 'Revenue']}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Summary Panel */}
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-gray-100">
                      <h3 className="font-bold text-gray-900">Quick Summary</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      <SummaryRow label="Period" value={statPeriod === 'week' ? 'This Week' : statPeriod === 'month' ? 'This Month' : 'This Year'} />
                      <SummaryRow label="Total Revenue" value={fmt(stats.revenue)} />
                      <SummaryRow label="Total Orders" value={stats.orders.toString()} />
                      <SummaryRow label="Avg. Order Value" value={fmt(stats.avgOrderValue)} />
                      <SummaryRow label="Pending Orders" value={stats.pending.toString()} />
                      <SummaryRow label="New Customers" value={users.filter(u => {
                        const d = new Date(u.joined);
                        const now = new Date();
                        if (statPeriod === 'week') { const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0,0,0,0); return d >= s; }
                        if (statPeriod === 'month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
                        return d.getFullYear() === now.getFullYear();
                      }).length.toString()} />
                    </div>
                  </div>
                </div>

                {/* Recent Orders Table */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">Recent Orders</h3>
                    <button onClick={() => setActiveTab('orders')} className="text-xs font-bold text-green-600 hover:underline">View All →</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Order ID</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Customer</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Items</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Total</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Status</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map(order => (
                          <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 font-mono text-sm font-bold text-green-600">{order.id}</td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{order.customer}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{order.items}</td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{fmt(order.total)}</td>
                            <td className="px-6 py-4">
                              <StatusBadge status={order.status} />
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-400">{order.date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

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

            {activeTab === 'orders' && (
              <motion.div 
                key="orders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
                    <p className="text-sm text-gray-400">Track and manage all customer orders</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Order ID</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Customer</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Items</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Total</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Payment</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Status</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[...orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(order => (
                          <React.Fragment key={order.id}>
                            <tr className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-6 py-4 font-mono text-sm font-bold text-green-600">{order.id}</td>
                              <td className="px-6 py-4">
                                <div className="text-sm font-bold text-gray-900">{order.customer}</div>
                                <div className="text-[10px] text-gray-400">{order.email}</div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">{order.items} items</td>
                              <td className="px-6 py-4 text-sm font-bold text-gray-900">{fmt(order.total)}</td>
                              <td className="px-6 py-4 text-sm text-gray-500">{order.payment}</td>
                              <td className="px-6 py-4">
                                <StatusBadge status={order.status} />
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <select 
                                    value={order.status}
                                    onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as Order['status'])}
                                    className="text-xs border border-gray-200 rounded-md px-2 py-1 outline-none focus:border-green-500"
                                  >
                                    {['Processing', 'Awaiting Payment', 'Payment Submitted', 'Shipped', 'Delivered', 'Cancelled', 'Refund Requested', 'Return & Rejected'].map(s => (
                                      <option key={s} value={s}>{s}</option>
                                    ))}
                                  </select>
                                  <button 
                                    onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                                    className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-all"
                                  >
                                    <ChevronRight className={`w-4 h-4 transition-transform ${selectedOrder?.id === order.id ? 'rotate-90' : ''}`} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {selectedOrder?.id === order.id && (
                              <tr className="bg-gray-50/30">
                                <td colSpan={7} className="px-6 py-4">
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="bg-white rounded-xl border border-gray-200 p-6 shadow-inner"
                                  >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                      <div>
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Order Items</h4>
                                        <div className="space-y-4">
                                          {order.cartItems?.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm">
                                              <div className="flex items-center gap-3">
                                                <span className="text-gray-400 font-mono text-xs">{item.qty}x</span>
                                                <span className="font-medium text-gray-900">{item.name}</span>
                                              </div>
                                              <div className="font-bold text-gray-900">{fmt(item.price * item.qty)}</div>
                                            </div>
                                          ))}
                                          <div className="pt-4 border-t border-dashed flex justify-between items-center">
                                            <span className="text-sm font-bold text-gray-900">Total</span>
                                            <span className="text-lg font-bold text-green-600">{fmt(order.total)}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="space-y-6">
                                        <div>
                                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Customer Info</h4>
                                          <div className="text-sm">
                                            <div className="font-bold text-gray-900">{order.customer}</div>
                                            <div className="text-gray-500">{order.email}</div>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Payment</h4>
                                            <div className="text-sm font-bold text-gray-900">{order.payment}</div>
                                          </div>
                                          <div>
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Date</h4>
                                            <div className="text-sm font-bold text-gray-900">{new Date(order.date).toLocaleString()}</div>
                                          </div>
                                        </div>
                                        {(order as any).deliveryAddress && (
                                          <div>
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Delivery Address</h4>
                                            <p className="text-sm text-gray-700 leading-relaxed mb-2">📍 {(order as any).deliveryAddress}</p>
                                            {(order as any).deliveryLat && (order as any).deliveryLng && (
                                              <div className="rounded-xl overflow-hidden border border-gray-200 h-40 w-full">
                                                <iframe
                                                  title="Delivery Map"
                                                  width="100%"
                                                  height="100%"
                                                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${(order as any).deliveryLng - 0.005},${(order as any).deliveryLat - 0.005},${(order as any).deliveryLng + 0.005},${(order as any).deliveryLat + 0.005}&layer=mapnik&marker=${(order as any).deliveryLat},${(order as any).deliveryLng}`}
                                                  style={{ border: 0 }}
                                                />
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Period Selector */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
                    <p className="text-sm text-gray-400">Performance data for the selected period</p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                    {([
                      { key: 'week', label: 'This Week' },
                      { key: 'month', label: 'This Month' },
                      { key: 'year', label: 'This Year' },
                    ] as const).map(p => (
                      <button
                        key={p.key}
                        onClick={() => setStatPeriod(p.key)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                          statPeriod === p.key
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={<TrendingUp />} label="Revenue" value={fmt(stats.revenue)} trend={statPeriod === 'week' ? 'This week' : statPeriod === 'month' ? 'This month' : 'This year'} color="green" />
                  <StatCard icon={<ShoppingCart />} label="Orders" value={stats.orders.toString()} trend={statPeriod === 'week' ? 'This week' : statPeriod === 'month' ? 'This month' : 'This year'} color="blue" />
                  <StatCard icon={<Users />} label="Customers" value={stats.customers.toString()} trend="Total registered" color="purple" />
                  <StatCard icon={<Package />} label="Avg. Order" value={fmt(stats.avgOrderValue)} trend="Per transaction" color="orange" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-1">Revenue Growth</h3>
                    <p className="text-xs text-gray-400 mb-6">{statPeriod === 'week' ? 'Daily revenue this week' : statPeriod === 'month' ? 'Daily revenue this month' : 'Monthly revenue this year'}</p>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                          <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                          <Bar dataKey="revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-6">Inventory Distribution</h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.catData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {stats.catData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#16a34a', '#2563eb', '#ea580c', '#9333ea', '#dc2626', '#0891b2'][index % 6]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {stats.catData.map((cat, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#16a34a', '#2563eb', '#ea580c', '#9333ea', '#dc2626', '#0891b2'][i % 6] }} />
                          <span className="text-xs text-gray-500">{cat.name}: {cat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'customers' && (
              <motion.div 
                key="customers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Customer</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Email</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Role</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Joined</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">UID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {users.map(user => (
                          <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                  {user.name.charAt(0)}
                                </div>
                                <div className="font-bold text-sm text-gray-900">{user.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-400">{new Date(user.joined).toLocaleDateString()}</td>
                            <td className="px-6 py-4 font-mono text-[10px] text-gray-300">{user.uid}</td>
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

            {activeTab === 'bookings' && (
              <motion.div
                key="bookings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total Bookings', value: bookings.length, color: 'text-gray-900' },
                    { label: 'Pending', value: bookings.filter(b => b.status === 'Pending').length, color: 'text-orange-500' },
                    { label: 'Accepted', value: bookings.filter(b => b.status === 'Accepted').length, color: 'text-green-600' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{s.label}</div>
                      <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Bookings list */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-900">All Bookings</h3>
                    <div className="flex gap-2">
                      {['All', 'Pending', 'Accepted', 'Declined'].map(f => (
                        <button
                          key={f}
                          onClick={() => setSearchQuery(f === 'All' ? '' : f)}
                          className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
                            (f === 'All' && searchQuery === '') || searchQuery === f
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {bookings.length === 0 ? (
                    <div className="py-20 text-center text-gray-400">
                      <Clock size={40} className="mx-auto mb-4 opacity-20" />
                      <p className="font-medium">No bookings yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {bookings
                        .filter(b => !searchQuery || b.status === searchQuery)
                        .map(b => (
                          <div key={b.id} className="p-6 flex flex-col md:flex-row md:items-center gap-4 hover:bg-gray-50 transition-colors">
                            {/* Service icon */}
                            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-lg shrink-0">
                              {b.services === 'Custom PC Building' ? '🖥️'
                                : b.services === 'Repair & Diagnosis' ? '🔧'
                                : b.services === 'Hardware Upgrade' ? '⬆️'
                                : '💬'}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                <span className="font-bold text-sm">{b.customer}</span>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                  b.status === 'Pending' ? 'bg-orange-100 text-orange-600'
                                  : b.status === 'Accepted' ? 'bg-green-100 text-green-600'
                                  : 'bg-red-100 text-red-500'
                                }`}>{b.status}</span>
                              </div>
                              <p className="text-xs text-green-600 font-bold mb-0.5">{b.services}</p>
                              <p className="text-[11px] text-gray-400">{b.email} · {b.phone}</p>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                📅 {b.date} at {b.time}
                                {b.notes && <span className="ml-2 italic text-gray-400">"{b.notes}"</span>}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 shrink-0">
                              {b.status === 'Pending' && (
                                <>
                                  <button
                                    onClick={() => handleBookingAction(b.id, 'Accepted')}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-green-600/20"
                                  >
                                    <CheckCircle2 size={13} /> Accept
                                  </button>
                                  <button
                                    onClick={() => handleBookingAction(b.id, 'Declined')}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-500 text-xs font-bold uppercase tracking-widest rounded-xl border border-red-200 transition-all active:scale-95"
                                  >
                                    <X size={13} /> Decline
                                  </button>
                                </>
                              )}
                              {b.status === 'Accepted' && (
                                <button
                                  onClick={() => handleBookingAction(b.id, 'Declined')}
                                  className="text-[10px] text-gray-400 hover:text-red-500 font-bold uppercase tracking-widest transition-colors"
                                >
                                  Revoke
                                </button>
                              )}
                              {b.status === 'Declined' && (
                                <button
                                  onClick={() => handleBookingAction(b.id, 'Accepted')}
                                  className="text-[10px] text-gray-400 hover:text-green-600 font-bold uppercase tracking-widest transition-colors"
                                >
                                  Re-accept
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
                  <Clock size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Section Under Construction</h3>
                <p className="text-gray-400 max-w-xs">We're currently building out the full functionality for the {activeTab} section.</p>
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="mt-6 text-green-600 font-bold hover:underline"
                >
                  Back to Dashboard
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Toasts */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3">
        {toasts.map(toast => (
          <motion.div 
            key={toast.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className={`px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] border-l-4 bg-white ${
              toast.type === 'success' ? 'border-green-500' : 'border-red-500'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="text-green-500" /> : <AlertTriangle className="text-red-500" />}
            <div className="text-sm font-medium text-gray-900">{toast.msg}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, onClick, badge }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; badge?: number }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
        active 
          ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' 
          : 'text-white/50 hover:text-white hover:bg-white/5'
      }`}
    >
      <span className={`${active ? 'text-white' : 'text-white/30 group-hover:text-white/60'} transition-colors`}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono">
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({ icon, label, value, trend, color }: { icon: React.ReactNode; label: string; value: string; trend: string; color: 'green' | 'blue' | 'orange' | 'purple' | 'red' }) {
  const colors = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600'
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2 rounded-xl ${colors[color]}`}>
          {React.cloneElement(icon as React.ReactElement<{ size?: number }>, { size: 20 })}
        </div>
        <div className={`text-[10px] font-bold px-2 py-1 rounded-full ${trend.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {trend}
        </div>
      </div>
      <div className="text-2xl font-black text-gray-900 tracking-tight mb-1">{value}</div>
      <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-900 font-mono">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: Order['status'] }) {
  const styles: Record<string, string> = {
    Processing: 'bg-orange-50 text-orange-600 border-orange-100',
    'Awaiting Payment': 'bg-purple-50 text-purple-600 border-purple-100',
    'Payment Submitted': 'bg-blue-50 text-blue-600 border-blue-100',
    Shipped: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    Delivered: 'bg-green-50 text-green-600 border-green-100',
    Cancelled: 'bg-red-50 text-red-600 border-red-100',
    'Refund Requested': 'bg-yellow-50 text-yellow-700 border-yellow-100',
    'Return & Rejected': 'bg-gray-100 text-gray-600 border-gray-200',
  };

  return (
    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${styles[status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
      {status}
    </span>
  );
}
