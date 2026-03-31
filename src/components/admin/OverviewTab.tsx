import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Package, ShoppingCart, Users, AlertTriangle } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { StatCard, SummaryRow, StatusBadge, fmt, Order } from './adminTypes';
import { Product, CATEGORIES } from '../../data/products';

interface OverviewTabProps {
  activeTab: 'dashboard' | 'analytics';
  stats: any;
  orders: Order[];
  products: Product[];
  users: { uid: string; name: string; email: string; role: string; joined: string }[];
  statPeriod: 'week' | 'month' | 'year';
  setStatPeriod: (p: 'week' | 'month' | 'year') => void;
  setActiveTab: (tab: string) => void;
}

export function OverviewTab({ activeTab, stats, orders, products, users, statPeriod, setStatPeriod, setActiveTab }: OverviewTabProps) {
  return (
    <>
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

    </>
  );
}
