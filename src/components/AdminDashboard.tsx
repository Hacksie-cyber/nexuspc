import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, TrendingUp, Package, PackagePlus, ShoppingCart,
  Users, Settings, Globe, LogOut, Search, Plus, Clock
} from 'lucide-react';
import { Product, CATEGORIES } from '../data/products';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { SidebarItem, Toast, Order, UserProfile, Booking } from './admin/adminTypes';
import { OverviewTab } from './admin/OverviewTab';
import { CatalogTab } from './admin/CatalogTab';
import { CommerceTab } from './admin/CommerceTab';
import { SiteTab } from './admin/SiteTab';

const fmt = (n: number) => '₱' + n.toLocaleString();

export default function AdminDashboard({ onExit }: { onExit: () => void }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statPeriod, setStatPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'success' | 'error' }[]>([]);

  // ── Firestore Listeners ─────────────────────────────────────────
  useEffect(() => {
    const pUnsub = onSnapshot(collection(db, 'products'), snap => {
      setProducts(snap.docs.map(d => ({ id: Number(d.id), ...d.data() } as Product)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'products'));

    const oUnsub = onSnapshot(collection(db, 'orders'), snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'orders'));

    const uUnsub = onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    }, err => handleFirestoreError(err, OperationType.LIST, 'users'));

    const bUnsub = onSnapshot(collection(db, 'bookings'), snap => {
      const bData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
      bData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setBookings(bData);
    }, err => handleFirestoreError(err, OperationType.LIST, 'bookings'));

    return () => { pUnsub(); oUnsub(); uUnsub(); bUnsub(); };
  }, []);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  // ── Stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((acc, o) => acc + o.total, 0);
    const lowStockCount = products.filter(p => p.stock <= 5).length;
    const pendingOrders = orders.filter(o => o.status === 'Processing').length;
    const revenueByDay: { [key: string]: number } = {};
    orders.forEach(o => {
      const date = new Date(o.date).toLocaleDateString('en-US', { weekday: 'short' });
      revenueByDay[date] = (revenueByDay[date] || 0) + o.total;
    });
    const chartData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
      name: day, revenue: revenueByDay[day] || 0
    }));
    const catData = CATEGORIES.filter(c => c.id !== 'all').map(cat => ({
      name: cat.label, value: products.filter(p => p.category === cat.id).length
    }));
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
    return { revenue: totalRevenue, orders: orders.length, products: products.length, customers: users.length, lowStock: lowStockCount, pending: pendingOrders, avgOrderValue, chartData, catData };
  }, [products, orders, users]);

  // ── Tab group helper ─────────────────────────────────────────────
  const isOverview  = ['dashboard', 'analytics'].includes(activeTab);
  const isCatalog   = ['products', 'inventory', 'add-product'].includes(activeTab);
  const isCommerce  = ['orders', 'bookings', 'customers'].includes(activeTab);
  const isSite      = ['settings'].includes(activeTab);

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900 font-sans">
      {/* ── Sidebar ── */}
      <aside className="w-64 bg-[#111827] text-white flex flex-col fixed h-full z-50">
        <div className="p-6 border-b border-white/10">
          <div className="text-2xl font-bold tracking-tighter">NEXUS<span className="text-green-500">PC</span></div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono mt-1">Admin Panel v1.0</div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Overview */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 font-mono px-2 mb-2">Overview</div>
            <SidebarItem icon={<LayoutDashboard size={18} />} label="Dashboard"  active={activeTab === 'dashboard'}  onClick={() => setActiveTab('dashboard')} />
            <SidebarItem icon={<TrendingUp size={18} />}     label="Analytics"  active={activeTab === 'analytics'}  onClick={() => setActiveTab('analytics')} />
          </div>

          <div className="h-px bg-white/5 mx-2" />

          {/* Catalog */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 font-mono px-2 mb-2">Catalog</div>
            <SidebarItem icon={<Package size={18} />}    label="Products"    active={activeTab === 'products'}     onClick={() => setActiveTab('products')} />
            <SidebarItem icon={<Search size={18} />}     label="Inventory"   active={activeTab === 'inventory'}    onClick={() => setActiveTab('inventory')} />
            <SidebarItem icon={<PackagePlus size={18} />} label="Add Product" active={activeTab === 'add-product'} onClick={() => setActiveTab('add-product')} />
          </div>

          <div className="h-px bg-white/5 mx-2" />

          {/* Commerce */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 font-mono px-2 mb-2">Commerce</div>
            <SidebarItem
              icon={<ShoppingCart size={18} />} label="Orders"
              active={activeTab === 'orders'} onClick={() => setActiveTab('orders')}
              badge={stats.pending > 0 ? stats.pending : undefined}
            />
            <SidebarItem
              icon={<Clock size={18} />} label="Bookings"
              active={activeTab === 'bookings'} onClick={() => setActiveTab('bookings')}
              badge={bookings.filter(b => b.status === 'Pending').length || undefined}
            />
            <SidebarItem icon={<Users size={18} />} label="Customers" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
          </div>

          <div className="h-px bg-white/5 mx-2" />

          {/* Site */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-white/30 font-mono px-2 mb-2">Site</div>
            <SidebarItem icon={<Settings size={18} />} label="Settings"   active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
            <SidebarItem icon={<Globe size={18} />}    label="View Store" onClick={onExit} />
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={onExit} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 text-sm font-medium transition-all">
            <LogOut size={18} /> Exit Admin
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-lg font-bold text-gray-900 capitalize">{activeTab.replace('-', ' ')}</h1>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">NEXUS PC › {activeTab.replace('-', ' ')}</div>
          </div>
          {isCatalog && (
            <button onClick={() => setActiveTab('add-product')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all shadow-lg shadow-green-600/20">
              <Plus size={16} /> Add Product
            </button>
          )}
        </header>

        {/* Tab Content */}
        <div className="p-8 flex-1">
          <AnimatePresence mode="wait">
            {isOverview && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <OverviewTab
                  activeTab={activeTab as 'dashboard' | 'analytics'}
                  stats={stats} orders={orders} products={products}
                  users={users} setActiveTab={setActiveTab}
                  statPeriod={statPeriod} setStatPeriod={setStatPeriod}
                />
              </motion.div>
            )}
            {isCatalog && (
              <motion.div key="catalog" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <CatalogTab
                  activeTab={activeTab as 'products' | 'inventory' | 'add-product'}
                  products={products} showToast={showToast} setActiveTab={setActiveTab}
                />
              </motion.div>
            )}
            {isCommerce && (
              <motion.div key="commerce" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <CommerceTab
                  activeTab={activeTab as 'orders' | 'bookings' | 'customers'}
                  orders={orders} bookings={bookings} users={users} showToast={showToast}
                />
              </motion.div>
            )}
            {isSite && (
              <motion.div key="site" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <SiteTab activeTab={activeTab as 'settings'} setActiveTab={setActiveTab} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Toasts */}
      <Toast toasts={toasts} />
    </div>
  );
}
