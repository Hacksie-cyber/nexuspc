import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronRight, CheckCircle2, X, Clock, Users } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { StatusBadge, fmt, Order, Booking, CUSTOMERS } from './adminTypes';
import DeliveryRouteMap from '../DeliveryRouteMap';

interface CommerceTabProps {
  activeTab: 'orders' | 'bookings' | 'customers';
  orders: Order[];
  bookings: Booking[];
  users: any[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export function CommerceTab({ activeTab, orders, bookings, users, showToast }: CommerceTabProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [orderPayment, setOrderPayment] = useState('');
  const [orderDateFrom, setOrderDateFrom] = useState('');
  const [orderDateTo, setOrderDateTo] = useState('');
  const [bookingFilter, setBookingFilter] = useState('');
  const [bookingSort, setBookingSort] = useState<'newest' | 'oldest'>('newest');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [ordersVisible, setOrdersVisible] = useState(10);
  const [bookingsVisible, setBookingsVisible] = useState(10);
  const [customersVisible, setCustomersVisible] = useState(10);

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

  return (
    <>
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

                {/* Filter Bar */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[180px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name or order ID..."
                      value={orderSearch}
                      onChange={e => { setOrderSearch(e.target.value); setOrdersVisible(10); }}
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-green-500 outline-none"
                    />
                  </div>
                  {/* Status */}
                  <select
                    value={orderStatus}
                    onChange={e => { setOrderStatus(e.target.value); setOrdersVisible(10); }}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-green-500 outline-none"
                  >
                    <option value="">All Statuses</option>
                    {['Processing','Awaiting Payment','Payment Submitted','Shipped','Delivered','Completed','Cancelled','Refund Requested','Return & Rejected'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {/* Payment */}
                  <select
                    value={orderPayment}
                    onChange={e => { setOrderPayment(e.target.value); setOrdersVisible(10); }}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-green-500 outline-none"
                  >
                    <option value="">All Payments</option>
                    {['GCash','PayPal','Bank Transfer','Cash on Delivery'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {/* Date range */}
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={orderDateFrom}
                      onChange={e => { setOrderDateFrom(e.target.value); setOrdersVisible(10); }}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-green-500 outline-none"
                    />
                    <span className="text-xs text-gray-400">to</span>
                    <input
                      type="date"
                      value={orderDateTo}
                      onChange={e => { setOrderDateTo(e.target.value); setOrdersVisible(10); }}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-green-500 outline-none"
                    />
                  </div>
                  {/* Clear */}
                  {(orderSearch || orderStatus || orderPayment || orderDateFrom || orderDateTo) && (
                    <button
                      onClick={() => { setOrderSearch(''); setOrderStatus(''); setOrderPayment(''); setOrderDateFrom(''); setOrderDateTo(''); setOrdersVisible(10); }}
                      className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-lg border border-red-200 transition-all"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Table */}
                {(() => {
                  const filtered = [...orders]
                    .filter(o => {
                      const q = orderSearch.toLowerCase();
                      const matchSearch = !q || o.customer.toLowerCase().includes(q) || o.id.toLowerCase().includes(q);
                      const matchStatus = !orderStatus || o.status === orderStatus;
                      const matchPayment = !orderPayment || o.payment === orderPayment;
                      const d = new Date(o.date);
                      const matchFrom = !orderDateFrom || d >= new Date(orderDateFrom);
                      const matchTo = !orderDateTo || d <= new Date(orderDateTo);
                      return matchSearch && matchStatus && matchPayment && matchFrom && matchTo;
                    })
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  const visible = filtered.slice(0, ordersVisible);
                  return (
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
                        {visible.length === 0 ? (
                          <tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-gray-400">No orders match your filters.</td></tr>
                        ) : visible.map(order => (
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
                                    {['Processing', 'Awaiting Payment', 'Payment Submitted', 'Shipped', 'Delivered', 'Completed', 'Cancelled', 'Refund Requested', 'Return & Rejected'].map(s => (
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
                                          <div className="pt-4 border-t border-dashed space-y-2">
                                            {(order as any).subtotal != null && (
                                              <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Subtotal</span>
                                                <span className="font-medium text-gray-900">{fmt((order as any).subtotal)}</span>
                                              </div>
                                            )}
                                            {(order as any).shippingFee != null && (
                                              <div className="flex justify-between items-center text-sm">
                                                {(order as any).shippingFee === 0 ? (
                                                  <>
                                                    <span className="text-green-600 font-medium flex items-center gap-1">🎉 Shipping Discount</span>
                                                    <span className="font-medium text-green-600">-₱150</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <span className="text-gray-500">Shipping Fee</span>
                                                    <span className="font-medium text-gray-900">{fmt((order as any).shippingFee)}</span>
                                                  </>
                                                )}
                                              </div>
                                            )}
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                              <span className="text-sm font-bold text-gray-900">Total</span>
                                              <span className="text-lg font-bold text-green-600">{fmt(order.total)}</span>
                                            </div>
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

                                        {/* Proof of Payment */}
                                        {(order.payment === 'GCash' || order.payment === 'Bank Transfer') && (
                                          <div>
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                                              Proof of Payment
                                            </h4>
                                            {(order as any).proofOfPayment ? (
                                              <div className="space-y-2">
                                                <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                                                  <img
                                                    src={(order as any).proofOfPayment}
                                                    alt="Proof of Payment"
                                                    className="w-full max-h-64 object-contain"
                                                  />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                  <p className="text-[10px] text-green-600 font-bold">✅ Proof submitted</p>
                                                  <a
                                                    href={(order as any).proofOfPayment}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[10px] font-bold text-blue-500 hover:underline uppercase tracking-widest"
                                                  >
                                                    Open Full Image ↗
                                                  </a>
                                                </div>
                                                {order.status === 'Payment Submitted' && (
                                                  <button
                                                    onClick={() => handleUpdateOrderStatus(order.id, 'Processing')}
                                                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-green-600/20"
                                                  >
                                                    ✓ Verify Payment &amp; Move to Processing
                                                  </button>
                                                )}
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
                                                <span className="text-yellow-500 text-sm">⏳</span>
                                                <p className="text-[11px] text-yellow-700 font-medium">
                                                  {order.status === 'Awaiting Payment'
                                                    ? 'Customer has not uploaded proof yet.'
                                                    : 'No proof of payment on file.'}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        {(order as any).deliveryAddress && (
                                          <div>
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Delivery Route</h4>
                                            <p className="text-sm text-gray-700 leading-relaxed mb-3">📍 {(order as any).deliveryAddress}</p>
                                            {(order as any).deliveryLat && (order as any).deliveryLng ? (
                                              <DeliveryRouteMap
                                                customerLat={(order as any).deliveryLat}
                                                customerLng={(order as any).deliveryLng}
                                                customerAddress={(order as any).deliveryAddress}
                                                height="h-64"
                                              />
                                            ) : (
                                              <p className="text-[11px] text-gray-400 italic">No coordinates saved — address only.</p>
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
                  {filtered.length > ordersVisible && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                      <span className="text-xs text-gray-400">Showing {Math.min(ordersVisible, filtered.length)} of {filtered.length} orders</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setOrdersVisible(v => v + 10)}
                          className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-gray-200 rounded-lg hover:border-green-500 hover:text-green-600 transition-all"
                        >
                          Load 10 more
                        </button>
                        <button
                          onClick={() => setOrdersVisible(filtered.length)}
                          className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                        >
                          View all
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                  );
                })()}
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
                {/* Customer Transaction Modal */}
                <AnimatePresence>
                  {selectedCustomer && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                      onClick={() => setSelectedCustomer(null)}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 24 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Modal Header */}
                        <div className="bg-[#111827] px-8 py-6 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white text-lg font-black">
                              {selectedCustomer.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-white font-black text-lg tracking-tight">{selectedCustomer.name}</h3>
                              <p className="text-white/40 text-xs">{selectedCustomer.email}</p>
                            </div>
                          </div>
                          <button onClick={() => setSelectedCustomer(null)} className="text-white/40 hover:text-white transition-colors p-1">
                            <X size={20} />
                          </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-6 space-y-6">
                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { label: 'Orders', value: orders.filter(o => o.email === selectedCustomer.email).length },
                              { label: 'Bookings', value: bookings.filter(b => b.email === selectedCustomer.email).length },
                              { label: 'Total Spent', value: fmt(orders.filter(o => o.email === selectedCustomer.email).reduce((a, o) => a + o.total, 0)) },
                            ].map((s, i) => (
                              <div key={i} className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                                <div className="text-xl font-black text-gray-900">{s.value}</div>
                                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-1">{s.label}</div>
                              </div>
                            ))}
                          </div>

                          {/* Orders */}
                          <div>
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3">Order History</h4>
                            {orders.filter(o => o.email === selectedCustomer.email).length === 0 ? (
                              <p className="text-sm text-gray-400 italic">No orders found.</p>
                            ) : (
                              <div className="space-y-2">
                                {[...orders]
                                  .filter(o => o.email === selectedCustomer.email)
                                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                  .map(o => (
                                  <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div>
                                      <span className="font-mono text-xs font-bold text-green-600">{o.id}</span>
                                      <p className="text-[10px] text-gray-400 mt-0.5">{new Date(o.date).toLocaleDateString()} · {o.payment}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <StatusBadge status={o.status} />
                                      <span className="text-sm font-black text-gray-900">{fmt(o.total)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Bookings */}
                          <div>
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3">Booking History</h4>
                            {bookings.filter(b => b.email === selectedCustomer.email).length === 0 ? (
                              <p className="text-sm text-gray-400 italic">No bookings found.</p>
                            ) : (
                              <div className="space-y-2">
                                {bookings
                                  .filter(b => b.email === selectedCustomer.email)
                                  .map(b => (
                                  <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                    <div>
                                      <p className="text-sm font-bold text-gray-900">{b.services}</p>
                                      <p className="text-[10px] text-gray-400 mt-0.5">{b.date} at {b.time}</p>
                                    </div>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${
                                      b.status === 'Pending' ? 'bg-orange-100 text-orange-600' :
                                      b.status === 'Accepted' ? 'bg-green-100 text-green-600' :
                                      'bg-red-100 text-red-500'
                                    }`}>{b.status}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Search + Table */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-gray-100 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Customers</h2>
                      <p className="text-xs text-gray-400">{users.length} registered accounts</p>
                    </div>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:border-green-500 outline-none w-64"
                      />
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Customer</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Email</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Role</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Orders</th>
                          <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {users
                          .filter(u =>
                            !customerSearch ||
                            u.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                            u.email.toLowerCase().includes(customerSearch.toLowerCase())
                          )
                          .slice(0, customersVisible)
                          .map(user => (
                          <tr
                            key={user.uid}
                            className="hover:bg-green-50/50 transition-colors cursor-pointer group"
                            onClick={() => setSelectedCustomer(user)}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-black text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                  {user.name.charAt(0)}
                                </div>
                                <div className="font-bold text-sm text-gray-900 group-hover:text-green-700">{user.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                              }`}>{user.role}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 font-bold">
                              {orders.filter(o => o.email === user.email).length}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-400">{new Date(user.joined).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {(() => {
                    const filtered = users.filter(u =>
                      !customerSearch ||
                      u.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                      u.email.toLowerCase().includes(customerSearch.toLowerCase())
                    );
                    return filtered.length > customersVisible ? (
                      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <span className="text-xs text-gray-400">Showing {customersVisible} of {filtered.length} customers</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCustomersVisible(v => v + 10)}
                            className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-gray-200 rounded-lg hover:border-green-500 hover:text-green-600 transition-all"
                          >
                            Load 10 more
                          </button>
                          <button
                            onClick={() => setCustomersVisible(filtered.length)}
                            className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                          >
                            View all
                          </button>
                        </div>
                      </div>
                    ) : null;
                  })()}
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
                  <div className="p-6 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                    <h3 className="font-bold text-gray-900">All Bookings</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Sort */}
                      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setBookingSort('newest')}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${bookingSort === 'newest' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Newest
                        </button>
                        <button
                          onClick={() => setBookingSort('oldest')}
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${bookingSort === 'oldest' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                          Oldest
                        </button>
                      </div>
                      {/* Status filter */}
                      {['All', 'Pending', 'Accepted', 'Declined'].map(f => (
                        <button
                          key={f}
                          onClick={() => { setBookingFilter(f === 'All' ? '' : f); setBookingsVisible(10); }}
                          className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
                            (f === 'All' && bookingFilter === '') || bookingFilter === f
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
                    <>
                    <div className="divide-y divide-gray-100">
                      {bookings
                        .filter(b => !bookingFilter || b.status === bookingFilter)
                        .sort((a, b) => {
                          const aTime = a.createdAt?.seconds ?? new Date(a.date).getTime() / 1000;
                          const bTime = b.createdAt?.seconds ?? new Date(b.date).getTime() / 1000;
                          return bookingSort === 'newest' ? bTime - aTime : aTime - bTime;
                        })
                        .slice(0, bookingsVisible)
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
                    {(() => {
                      const filtered = bookings.filter(b => !bookingFilter || b.status === bookingFilter);
                      return filtered.length > bookingsVisible ? (
                        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                          <span className="text-xs text-gray-400">Showing {bookingsVisible} of {filtered.length} bookings</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setBookingsVisible(v => v + 10)}
                              className="px-4 py-2 text-xs font-bold uppercase tracking-widest border border-gray-200 rounded-lg hover:border-green-500 hover:text-green-600 transition-all"
                            >
                              Load 10 more
                            </button>
                            <button
                              onClick={() => setBookingsVisible(filtered.length)}
                              className="px-4 py-2 text-xs font-bold uppercase tracking-widest bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                            >
                              View all
                            </button>
                          </div>
                        </div>
                      ) : null;
                    })()}
                    </>
                  )}
                </div>
              </motion.div>
            )}

    </>
  );
}
