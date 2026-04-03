import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface Order {
  id: string;
  customer: string;
  email: string;
  items: number;
  total: number;
  payment: string;
  status: 'Processing' | 'Awaiting Payment' | 'Payment Submitted' | 'Shipped' | 'Delivered' | 'Completed' | 'Cancelled' | 'Refund Requested' | 'Return & Rejected';
  date: string;
  cartItems?: { id: number; name: string; price: number; qty: number }[];
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: string;
  joined: string;
}

export interface Booking {
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

export interface AdminProps {
  products: any[];
  orders: Order[];
  users: UserProfile[];
  bookings: Booking[];
  stats: any;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const SAMPLE_ORDERS: Order[] = [
  { id: '#ORD-001', customer: 'Marco Reyes', email: 'marco@email.com', items: 3, total: 28500, payment: 'GCash', status: 'Delivered', date: '2025-01-10' },
  { id: '#ORD-002', customer: 'Sofia Lim', email: 'sofia@email.com', items: 5, total: 62400, payment: 'PayPal', status: 'Shipped', date: '2025-01-12' },
  { id: '#ORD-003', customer: 'James Tan', email: 'james@email.com', items: 2, total: 14200, payment: 'Cash on Delivery', status: 'Processing', date: '2025-01-14' },
  { id: '#ORD-004', customer: 'Kyla Amador', email: 'kyla@email.com', items: 7, total: 89900, payment: 'GCash', status: 'Processing', date: '2025-01-15' },
  { id: '#ORD-005', customer: 'Rey Dela Cruz', email: 'rey@email.com', items: 1, total: 6800, payment: 'Cash on Delivery', status: 'Delivered', date: '2025-01-08' },
  { id: '#ORD-006', customer: 'Anna Santos', email: 'anna@email.com', items: 4, total: 42000, payment: 'GCash', status: 'Shipped', date: '2025-01-16' },
  { id: '#ORD-007', customer: 'Luis Garcia', email: 'luis@email.com', items: 2, total: 18500, payment: 'PayPal', status: 'Processing', date: '2025-01-17' },
  { id: '#ORD-008', customer: 'Maria Cruz', email: 'maria@email.com', items: 1, total: 9500, payment: 'Cash on Delivery', status: 'Delivered', date: '2025-01-06' },
];

export const CUSTOMERS = [
  { name: 'Marco Reyes', email: 'marco@email.com', orders: 3, spent: 28500, joined: '2024-06-10', status: 'Active' },
  { name: 'Sofia Lim', email: 'sofia@email.com', orders: 5, spent: 62400, joined: '2024-07-22', status: 'Active' },
  { name: 'James Tan', email: 'james@email.com', orders: 2, spent: 14200, joined: '2024-09-05', status: 'Active' },
  { name: 'Kyla Amador', email: 'kyla@email.com', orders: 7, spent: 89900, joined: '2024-03-14', status: 'Active' },
  { name: 'Rey Dela Cruz', email: 'rey@email.com', orders: 1, spent: 6800, joined: '2024-11-20', status: 'Active' },
  { name: 'Anna Santos', email: 'anna@email.com', orders: 4, spent: 42000, joined: '2024-05-18', status: 'Active' },
  { name: 'Luis Garcia', email: 'luis@email.com', orders: 2, spent: 18500, joined: '2024-10-02', status: 'Inactive' },
  { name: 'Maria Cruz', email: 'maria@email.com', orders: 1, spent: 9500, joined: '2024-12-01', status: 'Active' },
];

export const fmt = (n: number) => '₱' + n.toLocaleString();

// ── Shared UI Components ─────────────────────────────────────────────────────

export function SidebarItem({ icon, label, active, onClick, badge }: {
  icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
        active ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'text-white/50 hover:text-white hover:bg-white/5'
      }`}
    >
      <span className={`${active ? 'text-white' : 'text-white/30 group-hover:text-white/60'} transition-colors`}>{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && (
        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono">{badge}</span>
      )}
    </button>
  );
}

export function StatCard({ icon, label, value, trend, color }: {
  icon: React.ReactNode; label: string; value: string; trend: string; color: 'green' | 'blue' | 'orange' | 'purple' | 'red';
}) {
  const colors = {
    green: 'bg-green-50 text-green-600', blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600', purple: 'bg-purple-50 text-purple-600', red: 'bg-red-50 text-red-600'
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

export function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-bold text-gray-900 font-mono">{value}</span>
    </div>
  );
}

export function StatusBadge({ status }: { status: Order['status'] }) {
  const styles: Record<string, string> = {
    Processing: 'bg-orange-50 text-orange-600 border-orange-100',
    'Awaiting Payment': 'bg-purple-50 text-purple-600 border-purple-100',
    'Payment Submitted': 'bg-blue-50 text-blue-600 border-blue-100',
    Shipped: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    Delivered: 'bg-green-50 text-green-600 border-green-100',
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
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

export function Toast({ toasts }: { toasts: { id: number; msg: string; type: 'success' | 'error' }[] }) {
  return (
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
  );
}
