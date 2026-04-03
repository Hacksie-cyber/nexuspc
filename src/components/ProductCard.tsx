import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Eye, CreditCard, Tag, Package, Zap, X } from 'lucide-react';
import { Product } from '../data/products';

function ProductCard({ product, addToCart, onView }: { product: Product, addToCart: (p: Product) => void, onView: (p: Product) => void, key?: any }) {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col cursor-pointer"
      onClick={() => onView(product)}
    >
      <div className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden mb-4 shrink-0">
        <img 
          src={product.img} 
          alt={product.name} 
          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        {product.oldPrice && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-lg">
            Sale
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-all bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
            <Eye className="w-3.5 h-3.5" /> View Details
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col">
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{product.category}</div>
        <h3 className="font-bold text-sm leading-tight mb-1 line-clamp-2 min-h-[2.5rem]">{product.name}</h3>

        {product.description && (
          <p className="text-[11px] text-gray-500 leading-relaxed mb-2 line-clamp-2">{product.description}</p>
        )}
        
        <ul className="space-y-1 mb-4">
          {product.specs.map((s, i) => (
            <li key={i} className="text-[10px] text-gray-500 flex items-center gap-2">
              <span className="w-1 h-1 bg-green-500 rounded-full"></span>
              {s}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-4 border-t flex items-center justify-between gap-2">
          <div>
            {product.oldPrice && (
              <div className="text-[10px] text-gray-400 line-through">₱{product.oldPrice.toLocaleString()}</div>
            )}
            <div className="text-lg font-bold text-red-600">₱{product.price.toLocaleString()}</div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); addToCart(product); }}
              className="bg-green-600 text-white p-2.5 rounded-lg hover:bg-green-700 transition-all active:scale-90 shadow-lg shadow-green-600/20"
              title="Add to Cart"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onView(product); }}
              className="bg-gray-900 text-white p-2.5 rounded-lg hover:bg-gray-700 transition-all active:scale-90"
              title="Buy Now"
            >
              <CreditCard className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProductModal({ product, onClose, addToCart }: { product: Product, onClose: () => void, addToCart: (p: Product) => void }) {
  const discount = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : null;

  return (
    <AnimatePresence>
      <motion.div
        key="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          key="modal-panel"
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image panel */}
          <div className="relative w-full md:w-2/5 bg-gray-50 shrink-0 aspect-square md:aspect-auto">
            <img
              src={product.img}
              alt={product.name}
              className="w-full h-full object-contain p-4"
              referrerPolicy="no-referrer"
            />
            {discount && (
              <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-lg">
                -{discount}% OFF
              </div>
            )}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm text-gray-700 rounded-full p-2 hover:bg-white transition-all shadow"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Details panel */}
          <div className="flex-1 flex flex-col overflow-y-auto p-6 md:p-8">
            {/* Category & stock */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-green-600 bg-green-50 px-2 py-1 rounded-md">
                {product.category}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                <Package className="w-3 h-3" />
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </span>
            </div>

            {/* Name */}
            <h2 className="text-xl font-black leading-tight tracking-tight text-gray-900 mb-2">{product.name}</h2>

            {/* Brand */}
            {product.brand && (
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-3">by {product.brand}</p>
            )}

            {/* Description */}
            {product.description && (
              <p className="text-sm text-gray-500 leading-relaxed mb-5 border-l-2 border-green-400 pl-3">{product.description}</p>
            )}

            {/* Specs */}
            {product.specs.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Specifications</span>
                </div>
                <ul className="space-y-1.5">
                  {product.specs.map((s, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 bg-green-500 rounded-full shrink-0"></span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Performance bars */}
            {product.perf && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Performance</span>
                </div>
                {[
                  { label: 'Gaming', value: product.perf.gaming },
                  { label: 'Office', value: product.perf.office },
                  { label: 'Editing', value: product.perf.editing },
                ].map(({ label, value }) => (
                  <div key={label} className="mb-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{label}</span>
                      <span className="font-bold">{value}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full bg-green-500 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Price & actions — pinned to bottom */}
            <div className="mt-auto pt-4 border-t border-gray-100">
              <div className="flex items-end gap-3 mb-4">
                <span className="text-3xl font-black text-red-600">₱{product.price.toLocaleString()}</span>
                {product.oldPrice && (
                  <span className="text-sm text-gray-400 line-through mb-1">₱{product.oldPrice.toLocaleString()}</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { addToCart(product); onClose(); }}
                  disabled={product.stock === 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-green-600/20"
                >
                  <ShoppingCart className="w-4 h-4" /> Add to Cart
                </button>
                <button
                  onClick={() => { addToCart(product); onClose(); }}
                  disabled={product.stock === 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-40 text-white py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all active:scale-95"
                >
                  <CreditCard className="w-4 h-4" /> Buy Now
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export { ProductCard, ProductModal };
