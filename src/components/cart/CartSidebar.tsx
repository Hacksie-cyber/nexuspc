import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, X, MapPin, Zap, ChevronRight } from 'lucide-react';
import { User } from 'firebase/auth';
import {
  collection, doc, writeBatch, increment, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { CartItem } from '../../types';
import { Product } from '../../data/products';

// ─── Constants ───────────────────────────────────────────────────────────────
const FREE_SHIPPING_THRESHOLD = 5000;
const SHIPPING_FEE = 150;

type PaymentMethod = 'GCash' | 'Cash on Delivery' | 'Bank Transfer';

// ─── Props ───────────────────────────────────────────────────────────────────
interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  products: Product[];
  user: User | null;
  savedDeliveryAddress: string;
  onAddressSaved: (addr: string) => void;
  savedDeliveryCoords: { lat: number; lng: number } | null;
  onCoordsSaved: (coords: { lat: number; lng: number } | null) => void;
  onUpdateQty: (id: number, delta: number) => void;
  onRemoveFromCart: (id: number) => void;
  onClearCart: () => void;
  onLogin: () => void;
  /** Called after a successful non-COD checkout — parent opens PaymentModal */
  onCheckoutDone: (orderId: string, method: string, total: number) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onNavigate: (page: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function CartSidebar({
  isOpen, onClose, cart, products, user,
  savedDeliveryAddress, onAddressSaved,
  savedDeliveryCoords, onCoordsSaved,
  onUpdateQty, onRemoveFromCart, onClearCart,
  onLogin, onCheckoutDone, showToast, onNavigate,
}: CartSidebarProps) {

  // Delivery state — owned here, not in App
  const [deliveryAddress, setDeliveryAddress] = useState(savedDeliveryAddress);
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(savedDeliveryCoords);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  // Payment state — owned here, not in App
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('GCash');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Sync delivery address when saved address changes (e.g. after login)
  // Using a ref-free approach: just update local state when prop changes
  const effectiveAddress = deliveryAddress || savedDeliveryAddress;

  // ── Shipping calculation ──────────────────────────────────────────────────
  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);
  const qualifiesForFree = cartTotal >= FREE_SHIPPING_THRESHOLD;
  const shippingFee = qualifiesForFree ? 0 : SHIPPING_FEE;
  const orderTotal = cartTotal + shippingFee;

  // ── GPS detection ─────────────────────────────────────────────────────────
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setDeliveryCoords({ lat, lng });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          );
          const data = await res.json();
          setDeliveryAddress(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch {
          setDeliveryAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
        setLocating(false);
      },
      () => {
        setLocError('Could not get your location. Please allow access or type your address manually.');
        setLocating(false);
      },
      { timeout: 10000 },
    );
  };

  // ── Checkout ──────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (!user) { onLogin(); return; }
    if (cart.length === 0 || isCheckingOut) return;
    if (!effectiveAddress.trim()) {
      showToast('Please enter your delivery address.', 'error');
      return;
    }

    const outOfStock = cart.filter(item => {
      const live = products.find(p => p.id === item.id);
      return live && live.stock < item.qty;
    });
    if (outOfStock.length > 0) {
      const names = outOfStock.map(i => {
        const live = products.find(p => p.id === i.id);
        return live && live.stock > 0
          ? `"${i.name}" (only ${live.stock} left)`
          : `"${i.name}" (out of stock)`;
      }).join(', ');
      showToast(`Stock issue: ${names}. Please update your cart.`, 'error');
      return;
    }

    setIsCheckingOut(true);

    const orderData = {
      uid: user.uid,
      customer: user.displayName || 'Anonymous',
      email: user.email || '',
      items: cart.length,
      subtotal: cartTotal,
      shippingFee,
      total: orderTotal,
      payment: paymentMethod,
      status: paymentMethod === 'Cash on Delivery' ? 'Processing' : 'Awaiting Payment',
      date: new Date().toISOString(),
      createdAt: serverTimestamp(),
      deliveryAddress: effectiveAddress.trim(),
      deliveryLat: deliveryCoords?.lat ?? null,
      deliveryLng: deliveryCoords?.lng ?? null,
      cartItems: cart.map(({ id, name, price, qty }) => ({ id, name, price, qty })),
    };

    try {
      const batch = writeBatch(db);
      const orderRef = doc(collection(db, 'orders'));
      batch.set(orderRef, orderData);
      cart.forEach(item => {
        batch.update(doc(db, 'products', item.id.toString()), {
          stock: increment(-item.qty),
        });
      });
      await batch.commit();

      // Persist address + coords non-blocking
      const coordsToSave = deliveryCoords
        ? { deliveryAddress: effectiveAddress.trim(), deliveryLat: deliveryCoords.lat, deliveryLng: deliveryCoords.lng }
        : { deliveryAddress: effectiveAddress.trim() };
      updateDoc(doc(db, 'users', user.uid), coordsToSave)
        .then(() => {
          onAddressSaved(effectiveAddress.trim());
          if (deliveryCoords) onCoordsSaved(deliveryCoords);
        })
        .catch(err => console.error('Failed to save address:', err));

      onClose();

      if (paymentMethod === 'Cash on Delivery') {
        onClearCart();
        showToast('Order placed! Pay when your order arrives.');
      } else {
        onCheckoutDone(orderRef.id, paymentMethod, orderTotal);
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      showToast(err?.message || 'Failed to place order. Please try again.', 'error');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 w-full max-w-md h-full bg-white z-[201] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b flex items-center justify-between bg-[#1a1a1a] text-white shrink-0">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-green-500" />
                <h2 className="font-bold uppercase tracking-widest text-sm">
                  Your Cart ({cartCount})
                </h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Items ── */}
              <div className="p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-4">
                    <ShoppingCart className="w-16 h-16 opacity-20" />
                    <p className="font-medium">Your cart is empty</p>
                    <button
                      onClick={() => { onClose(); onNavigate('shop'); }}
                      className="text-green-600 font-bold text-sm hover:underline"
                    >
                      Browse Products
                    </button>
                  </div>
                ) : (
                  cart.map(item => {
                    const live = products.find(p => p.id === item.id);
                    const avail = live?.stock ?? item.stock;
                    const isOut = avail <= 0;
                    const isLow = avail > 0 && avail < item.qty;
                    return (
                      <div
                        key={item.id}
                        className={`flex gap-4 group rounded-xl p-2 -mx-2 transition-colors ${
                          isOut ? 'bg-red-50' : isLow ? 'bg-orange-50' : ''
                        }`}
                      >
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200 relative">
                          <img
                            src={item.img} alt={item.name} referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          {isOut && (
                            <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center">
                              <span className="text-white text-[9px] font-black uppercase tracking-widest text-center leading-tight px-1">
                                Out of Stock
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm leading-tight mb-0.5 truncate">{item.name}</h3>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{item.category}</p>
                          {isOut && <p className="text-[10px] text-red-500 font-bold mb-1">❌ No longer available — please remove</p>}
                          {isLow && <p className="text-[10px] text-orange-500 font-bold mb-1">⚠️ Only {avail} left — qty adjusted</p>}
                          <div className="flex items-center justify-between">
                            <div className={`flex items-center gap-3 rounded-md px-2 py-1 ${isOut ? 'bg-red-100' : 'bg-gray-100'}`}>
                              <button onClick={() => onUpdateQty(item.id, -1)} className="text-gray-500 hover:text-black">
                                <X className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                              <button
                                onClick={() => onUpdateQty(item.id, 1)}
                                disabled={item.qty >= avail}
                                className="text-gray-500 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Zap className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-red-600">
                                ₱{(item.price * item.qty).toLocaleString()}
                              </div>
                              <button
                                onClick={() => onRemoveFromCart(item.id)}
                                className="text-[10px] text-gray-400 hover:text-red-500 uppercase font-bold tracking-widest"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ── Checkout Panel (only when cart has items) ── */}
              {cart.length > 0 && (
                <div className="px-6 pb-8 pt-2 border-t bg-gray-50 space-y-5">

                  {/* Order Summary */}
                  <div className="space-y-2 pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                      Order Summary
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-bold text-xs uppercase tracking-widest">Subtotal</span>
                      <span className="text-base font-bold text-gray-800">₱{cartTotal.toLocaleString()}</span>
                    </div>

                    {qualifiesForFree ? (
                      <div className="flex justify-between items-center">
                        <span className="text-green-600 font-bold text-xs uppercase tracking-widest">🎉 Shipping Discount</span>
                        <span className="text-green-600 font-bold text-sm">-₱{SHIPPING_FEE.toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-gray-500 font-bold text-xs uppercase tracking-widest">Shipping Fee</span>
                          <p className="text-[10px] text-orange-500 font-medium mt-0.5">
                            Add ₱{(FREE_SHIPPING_THRESHOLD - cartTotal).toLocaleString()} more for free shipping
                          </p>
                        </div>
                        <span className="text-base font-bold text-gray-800">₱{SHIPPING_FEE.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                      <span className="text-gray-700 font-bold text-xs uppercase tracking-widest">Total</span>
                      <span className="text-2xl font-bold text-red-600">₱{orderTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        Delivery Address <span className="text-red-400">*</span>
                      </p>
                      {savedDeliveryAddress && effectiveAddress.trim() !== savedDeliveryAddress && (
                        <button
                          onClick={() => {
                            setDeliveryAddress(savedDeliveryAddress);
                            setDeliveryCoords(null);
                            setLocError('');
                          }}
                          className="text-[10px] font-bold text-green-600 hover:text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full transition-colors"
                        >
                          ↩ Use saved address
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Type your delivery address..."
                        value={effectiveAddress}
                        onChange={e => { setDeliveryAddress(e.target.value); setLocError(''); }}
                        className={`flex-1 bg-white border rounded-xl px-3 py-2.5 text-[11px] focus:outline-none transition-all ${
                          effectiveAddress.trim()
                            ? 'border-green-400 bg-green-50/30'
                            : 'border-gray-200 focus:border-green-500'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={detectLocation}
                        disabled={locating}
                        title="Use my current location"
                        className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl border-2 border-dashed border-green-300 bg-green-50 text-green-700 text-[10px] font-bold hover:bg-green-100 transition-all disabled:opacity-50"
                      >
                        {locating ? <span className="animate-spin text-sm">⏳</span> : <MapPin className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {locError && <p className="text-[10px] text-red-500 mb-1">{locError}</p>}
                    {effectiveAddress.trim() && !locError && (
                      <p className="text-[10px] text-green-600 truncate mb-1">
                        {effectiveAddress.trim() === savedDeliveryAddress ? '📍 Saved address' : '✅ New address'}: {effectiveAddress}
                      </p>
                    )}
                    {deliveryCoords && (
                      <div className="rounded-xl overflow-hidden border border-gray-200 h-24 w-full mt-1">
                        <iframe
                          title="Delivery Location"
                          width="100%" height="100%"
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${deliveryCoords.lng - 0.003},${deliveryCoords.lat - 0.003},${deliveryCoords.lng + 0.003},${deliveryCoords.lat + 0.003}&layer=mapnik&marker=${deliveryCoords.lat},${deliveryCoords.lng}`}
                          style={{ border: 0, pointerEvents: 'none' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Payment Method</p>
                    <div className="grid grid-cols-3 gap-2">
                      {([ 
                        { id: 'GCash', label: 'GCash', icon: '📱' },
                        { id: 'Cash on Delivery', label: 'Cash on Delivery', icon: '🚚' },
                        { id: 'Bank Transfer', label: 'Bank Transfer', icon: '🏦' },
                      ] as const).map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setPaymentMethod(opt.id)}
                          className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border-2 text-center transition-all ${
                            paymentMethod === opt.id
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          <span className="text-xl">{opt.icon}</span>
                          <span className="text-[10px] font-bold leading-tight">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                    {paymentMethod === 'GCash' && (
                      <p className="text-[10px] text-gray-400 mt-2 pl-1">You'll receive a GCash payment request after checkout.</p>
                    )}
                    {paymentMethod === 'Cash on Delivery' && (
                      <p className="text-[10px] text-gray-400 mt-2 pl-1">Pay when your order arrives at your door.</p>
                    )}
                    {paymentMethod === 'Bank Transfer' && (
                      <p className="text-[10px] text-gray-400 mt-2 pl-1">Bank details will be sent to your email after checkout.</p>
                    )}
                  </div>

                  {/* Checkout Button */}
                  <button
                    onClick={handleCheckout}
                    disabled={!effectiveAddress.trim() || isCheckingOut}
                    className="w-full bg-green-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isCheckingOut ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : !effectiveAddress.trim()
                      ? '📍 Add Delivery Address First'
                      : 'Checkout Now'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
