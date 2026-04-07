import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, CheckCircle2 } from 'lucide-react';
import { collection, doc, writeBatch, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { CartItem } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PaymentInfo {
  /** Full order data — written to Firestore only when proof is submitted */
  pendingOrder: Record<string, any>;
  /** Cart snapshot for stock restore if the user cancels */
  cartSnapshot: CartItem[];
}

interface PaymentModalProps {
  payment: PaymentInfo | null;
  onClose: () => void;
  onOpenCart: () => void;
  onClearCart: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PaymentModal({
  payment, onClose, onOpenCart, onClearCart, showToast,
}: PaymentModalProps) {

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Reset state whenever a new payment session opens
  useEffect(() => {
    if (payment) {
      setProofFile(null);
      setUploading(false);
      setSubmitted(false);
    }
  }, [payment?.pendingOrder?.tempRef]);

  const method   = payment?.pendingOrder?.payment ?? '';
  const total    = payment?.pendingOrder?.total   ?? 0;
  const tempRef  = payment?.pendingOrder?.tempRef ?? '';

  // ── Cancel — restore stock only (no order doc was created yet) ────────────
  const handleCancel = async () => {
    if (!payment) return;
    try {
      const batch = writeBatch(db);
      payment.cartSnapshot.forEach(item => {
        batch.update(doc(db, 'products', item.id.toString()), {
          stock: increment(item.qty),
        });
      });
      await batch.commit();
    } catch (err) {
      console.error('Failed to restore stock on cancel:', err);
    }
    onClose();
    onOpenCart();
  };

  // ── Submit proof — creates order doc for the first time ───────────────────
  const handleProofSubmit = async () => {
    if (!proofFile || !payment || uploading) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const orderRef = doc(collection(db, 'orders'));
          await setDoc(orderRef, {
            ...payment.pendingOrder,
            proofOfPayment: base64,
            status: 'Payment Submitted',
            createdAt: serverTimestamp(),
          });
          setSubmitted(true);
          onClearCart();
          showToast('Order placed! We will verify your payment shortly.');
        } catch (err) {
          console.error('Failed to submit proof:', err);
          showToast('Failed to submit proof. Please try again.', 'error');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(proofFile);
    } catch {
      setUploading(false);
      showToast('Failed to read file. Please try again.', 'error');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {payment && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#1a1a1a] px-8 py-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {!submitted && (
                  <button
                    onClick={handleCancel}
                    className="text-white/40 hover:text-white transition-colors p-1 -ml-1"
                    title="Back to Cart"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                  </button>
                )}
                <div>
                  <p className="text-green-500 text-[10px] font-bold uppercase tracking-widest mb-1">
                    Complete Your Order
                  </p>
                  <h3 className="text-white font-black text-lg tracking-tight">
                    {method} Payment
                  </h3>
                </div>
              </div>
              {submitted && (
                <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-8 max-h-[80vh] overflow-y-auto">
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-xl font-black tracking-tight mb-2">Order Placed!</h4>
                  <p className="text-gray-400 text-sm leading-relaxed mb-6">
                    Your payment proof has been received. Our team will verify and confirm your order shortly.
                  </p>
                  <button
                    onClick={onClose}
                    className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-green-700 transition-all"
                  >
                    Done
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-6">

                  {/* Notice — order is pending until proof is uploaded */}
                  <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <span className="text-amber-500 text-lg shrink-0">⚠️</span>
                    <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                      Your order will only be registered once you upload your proof of payment below.
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Amount to Pay</p>
                    <p className="text-3xl font-black text-red-600">₱{total.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 mt-1 font-mono">Ref: #{tempRef}</p>
                  </div>

                  {/* GCash Details */}
                  {method === 'GCash' && (
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-3">
                          Scan to Pay via GCash
                        </p>
                        <div className="flex justify-center mb-3">
                          <div className="w-48 h-48 bg-white rounded-xl border-2 border-blue-200 flex items-center justify-center overflow-hidden shadow-md">
                            <img
                              src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"
                              alt="GCash QR Code"
                              className="w-full h-full object-contain p-2"
                              onError={e => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML =
                                  '<p class="text-xs text-gray-400 p-4">QR code not available.<br/>Use number below.</p>';
                              }}
                            />
                          </div>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Or send to this number</p>
                        <p className="text-2xl font-black text-blue-700 tracking-widest mb-1">0917 123 4567</p>
                        <p className="text-sm font-bold text-blue-600">NEXUS PC Store</p>
                        <div className="mt-4 pt-4 border-t border-blue-100">
                          <p className="text-[10px] text-blue-400 font-medium">Use this reference in your GCash note:</p>
                          <p className="text-sm font-black text-blue-700 font-mono mt-1">#{tempRef}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 text-center">
                        Send the exact amount then upload your GCash screenshot below.
                      </p>
                    </div>
                  )}

                  {/* Bank Transfer Details */}
                  {method === 'Bank Transfer' && (
                    <div className="space-y-3">
                      <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
                        <div className="text-center text-3xl mb-3">🏦</div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 mb-4 text-center">
                          Bank Account Details
                        </p>
                        <div className="space-y-3">
                          {[
                            { label: 'Bank', value: 'BDO Unibank' },
                            { label: 'Account Name', value: 'NEXUS PC Store' },
                            { label: 'Account Number', value: '1234 5678 9012' },
                            { label: 'Reference', value: `#${tempRef}` },
                          ].map((row, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-green-100 last:border-0">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{row.label}</span>
                              <span className="text-sm font-black text-gray-800">{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 text-center">
                        Transfer the exact amount using the reference above, then upload your receipt below.
                      </p>
                    </div>
                  )}

                  {/* Upload Proof */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                      Upload Proof of Payment <span className="text-red-400">*</span>
                    </p>
                    <label
                      className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all ${
                        proofFile
                          ? 'border-green-400 bg-green-50'
                          : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="file" accept="image/*" className="hidden"
                        onChange={e => setProofFile(e.target.files?.[0] || null)}
                      />
                      {proofFile ? (
                        <>
                          <CheckCircle2 className="w-8 h-8 text-green-500" />
                          <p className="text-sm font-bold text-green-700 text-center break-all">{proofFile.name}</p>
                          <p className="text-[10px] text-green-500">Click to change file</p>
                        </>
                      ) : (
                        <>
                          <div className="text-3xl">📎</div>
                          <p className="text-sm font-bold text-gray-500">Click to upload screenshot</p>
                          <p className="text-[10px] text-gray-400">PNG, JPG, JPEG accepted</p>
                        </>
                      )}
                    </label>
                  </div>

                  <button
                    onClick={handleProofSubmit}
                    disabled={!proofFile || uploading}
                    className="w-full bg-green-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {uploading ? 'Placing Order...' : 'Submit Proof & Place Order'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
