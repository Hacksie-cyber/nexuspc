import { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingCart, Search, User as UserIcon, Menu, X,
  Trash2, CheckCircle2, AlertTriangle, Facebook, Twitter,
  Instagram, Phone, Mail, MapPin, ArrowRight, LogOut, ChevronRight, Zap
} from 'lucide-react';
import { CATEGORIES, Product } from './data/products';
import AdminDashboard from './components/AdminDashboard';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import {
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, updateProfile
} from 'firebase/auth';
import {
  collection, onSnapshot, query, addDoc, setDoc, doc, getDoc,
  serverTimestamp, where, updateDoc, writeBatch, increment
} from 'firebase/firestore';
import { CartItem, BuildState } from './types';
import { ProductCard, ProductModal } from './components/ProductCard';
import {
  HomePage, ShopPage, BuilderPage, ServicesPage, ContactPage, ProfilePage
} from './pages/Pages';

// Error Boundary
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, errorInfo: ErrorInfo) { console.error('ErrorBoundary:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      let errorMsg = 'Something went wrong.';
      try { const p = JSON.parse(this.state.error.message); if (p.error) errorMsg = p.error; } catch {}
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">System Error</h2>
            <p className="text-gray-500 mb-8 text-sm leading-relaxed">{errorMsg}</p>
            <button onClick={() => window.location.reload()} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-600/20">
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [page, setPage] = useState('home');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState(150000);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [build, setBuild] = useState<BuildState>({
    cpu: null,
    motherboard: null,
    ram: null,
    gpu: null,
    storage: null,
    psu: null,
    case: null,
  });
  const [builderStep, setBuilderStep] = useState(0);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: 'success' | 'error' }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'GCash' | 'Cash on Delivery' | 'Bank Transfer'>('GCash');
  const [paymentModal, setPaymentModal] = useState<{ orderId: string; method: string; total: number } | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofSubmitted, setProofSubmitted] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [savedDeliveryAddress, setSavedDeliveryAddress] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u) {
        const userRef = doc(db, 'users', u.uid);
        await setDoc(userRef, {
          name: u.displayName || 'Anonymous',
          email: u.email,
          role: u.email === 'bamuyahacksie@gmail.com' ? 'admin' : 'client',
          joined: new Date().toISOString()
        }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, 'users'));

        // Load saved delivery address
        try {
          const userSnap = await getDoc(userRef);
          const saved = userSnap.data()?.deliveryAddress || '';
          if (saved) {
            setSavedDeliveryAddress(saved);
            setDeliveryAddress(saved);
          }
        } catch (err) {
          console.error('Failed to load saved address', err);
        }
      } else {
        // Clear saved address on logout
        setSavedDeliveryAddress('');
        setDeliveryAddress('');
        setDeliveryCoords(null);
      }
    });
    return unsubscribe;
  }, []);

  // Products Listener
  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pData = snapshot.docs
        .map(doc => ({ id: Number(doc.id), ...doc.data() } as Product))
        .sort((a, b) => a.name.localeCompare(b.name));
      setProducts(pData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));
    return unsubscribe;
  }, []);

  // Orders Listener
  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }
    const q = query(
      collection(db, 'orders'), 
      where('uid', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const oData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort on client-side to avoid needing a composite index
      oData.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setOrders(oData);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'orders'));
    return unsubscribe;
  }, [user]);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('nexus_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart', e);
      }
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('nexus_cart', JSON.stringify(cart));
  }, [cart]);

  // Derived State
  const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);
  const cartTotal = cart.reduce((acc: number, item) => acc + (item.price * item.qty), 0);

  const FREE_SHIPPING_THRESHOLD = 5000;
  const SHIPPING_FEE = 150;
  const qualifiesForFreeShipping = cartTotal >= FREE_SHIPPING_THRESHOLD;
  const shippingFee = qualifiesForFreeShipping ? 0 : SHIPPING_FEE;
  const orderTotal = cartTotal + shippingFee;

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q)) ||
        p.specs.some(s => s.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q);
      // When user is actively searching, ignore category filter so results span all categories
      const matchesCategory = q ? true : (selectedCategory === 'all' || p.category === selectedCategory);
      const matchesPrice = p.price <= priceRange;
      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [products, searchQuery, selectedCategory, priceRange]);

  let buildTotal = 0;
  Object.values(build).forEach(p => {
    buildTotal += (p as Product | null)?.price || 0;
  });

  // Actions
  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      showToast(`"${product.name}" is out of stock.`, 'error');
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          showToast(`Only ${product.stock} unit${product.stock > 1 ? 's' : ''} of "${product.name}" available.`, 'error');
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        if (newQty > item.stock) {
          showToast(`Only ${item.stock} unit${item.stock > 1 ? 's' : ''} of "${item.name}" available.`, 'error');
          return { ...item, qty: item.stock };
        }
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { setLocError('Geolocation is not supported by your browser.'); return; }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setDeliveryCoords({ lat, lng });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          setDeliveryAddress(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch {
          setDeliveryAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
        setLocating(false);
      },
      () => {
        setLocError('Could not get your location. Please allow location access or type your address manually.');
        setLocating(false);
      },
      { timeout: 10000 }
    );
  };

  const handleCheckout = async () => {
    if (!user) { login(); return; }
    if (cart.length === 0) return;
    if (isCheckingOut) return;
    if (!deliveryAddress.trim()) {
      showToast('Please enter your delivery address.', 'error');
      return;
    }

    // Check stock against latest product data from Firestore
    const outOfStock = cart.filter(item => {
      const liveProduct = products.find(p => p.id === item.id);
      return liveProduct && liveProduct.stock < item.qty;
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
      shippingFee: shippingFee,
      total: orderTotal,
      payment: paymentMethod,
      status: paymentMethod === 'Cash on Delivery' ? 'Processing' : 'Awaiting Payment',
      date: new Date().toISOString(),
      createdAt: serverTimestamp(),
      deliveryAddress: deliveryAddress || '',
      deliveryLat: deliveryCoords?.lat || null,
      deliveryLng: deliveryCoords?.lng || null,
      cartItems: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty
      }))
    };

    try {
      const batch = writeBatch(db);

      // 1. Create the order document
      const orderRef = doc(collection(db, 'orders'));
      batch.set(orderRef, orderData);

      // 2. Deduct stock for each cart item
      cart.forEach(item => {
        const productRef = doc(db, 'products', item.id.toString());
        batch.update(productRef, { stock: increment(-item.qty) });
      });

      // Commit both atomically
      await batch.commit();

      // Save delivery address to user profile for next time (non-blocking)
      if (user && deliveryAddress.trim()) {
        updateDoc(doc(db, 'users', user.uid), { deliveryAddress: deliveryAddress.trim() })
          .then(() => setSavedDeliveryAddress(deliveryAddress.trim()))
          .catch(err => console.error('Failed to save address to profile', err));
      }

      setIsCartOpen(false);
      if (paymentMethod === 'Cash on Delivery') {
        setCart([]);
        showToast('Order placed! Pay when your order arrives.');
      } else {
        setProofFile(null);
        setProofSubmitted(false);
        setPaymentModal({ orderId: orderRef.id, method: paymentMethod, total: orderTotal });
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      const msg = err?.message || 'Failed to place order. Please try again.';
      showToast(msg, 'error');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleProofSubmit = async () => {
    if (!proofFile || !paymentModal) return;
    setProofUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await updateDoc(doc(db, 'orders', paymentModal.orderId), {
          proofOfPayment: base64,
          status: 'Payment Submitted',
        });
        setProofSubmitted(true);
        setProofUploading(false);
        setCart([]);
        showToast('Payment proof submitted! We will verify shortly.');
      };
      reader.readAsDataURL(proofFile);
    } catch (err) {
      setProofUploading(false);
      showToast('Failed to upload proof. Please try again.', 'error');
    }
  };

  const selectBuildPart = (category: string, product: Product) => {
    setBuild(prev => ({ ...prev, [category]: product }));
    if (builderStep < Object.keys(build).length - 1) {
      setBuilderStep(prev => prev + 1);
    }
  };

  const handleRename = async (newName: string) => {
    if (!user || !newName.trim()) return;
    try {
      await updateProfile(user, { displayName: newName.trim() });
      await updateDoc(doc(db, 'users', user.uid), { name: newName.trim() });
      showToast('Name updated successfully!');
    } catch (err) {
      console.error('Rename failed:', err);
      showToast('Failed to update name. Please try again.', 'error');
    }
  };

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setPage('home');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const navigate = (p: string) => {
    setPage(p);
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  if (page === 'admin') {
    return <AdminDashboard onExit={() => navigate('home')} />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-green-500 selection:text-white">
      {/* Top Announcement Bar */}
      <div className="bg-green-600 text-white text-[11px] font-medium py-1.5 text-center tracking-wide">
        🚚 FREE DELIVERY FOR ORDERS ₱5,000+ · SAME DAY DELIVERY IN CDO · GENUINE WARRANTY
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-[100] bg-[#1a1a1a] text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 h-[64px] flex items-center justify-between gap-6">
          <div 
            className="text-2xl font-bold cursor-pointer tracking-tighter"
            onClick={() => navigate('home')}
          >
            NEXUS<span className="text-green-500">PC</span>
          </div>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-md relative group">
            <input 
              type="text" 
              placeholder="Search components, laptops..." 
              className="w-full bg-white/10 border border-white/20 rounded-md py-2 px-4 pl-10 text-sm focus:bg-white focus:text-black focus:outline-none transition-all"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value) setSelectedCategory('all'); }}
              onFocus={() => page !== 'shop' && navigate('shop')}
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/40 group-focus-within:text-black/40" />
          </div>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-1">
            {['home', 'shop', 'builder', 'services', 'contact'].map((p) => (
              <button
                key={p}
                onClick={() => navigate(p)}
                className={`px-4 py-2 rounded-md text-[13px] font-semibold uppercase tracking-wider transition-colors ${
                  page === p ? 'bg-green-600 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {p === 'builder' ? 'PC Builder' : p}
              </button>
            ))}
            {user?.email === 'bamuyahacksie@gmail.com' && (
              <button
                onClick={() => navigate('admin')}
                className={`px-4 py-2 rounded-md text-[13px] font-semibold uppercase tracking-wider transition-colors ${
                  page === 'admin' ? 'bg-green-600 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                Dashboard
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigate('profile')}
                  className="p-2 hover:bg-white/10 rounded-md transition-colors flex items-center gap-2"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <UserIcon className="w-5 h-5" />
                  )}
                </button>
                <button onClick={logout} className="p-2 hover:bg-white/10 rounded-md transition-colors text-white/50 hover:text-red-500">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={login}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-[13px] font-bold uppercase tracking-wider hover:bg-green-700 transition-all"
              >
                Login
              </button>
            )}
            <button 
              className="relative p-2 hover:bg-white/10 rounded-md transition-colors"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
            <button 
              className="lg:hidden p-2 hover:bg-white/10 rounded-md transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Category Strip */}
        <div className="bg-[#2d2d2d] border-t border-white/5 overflow-x-auto no-scrollbar">
          <div className="max-w-7xl mx-auto px-4 flex items-center h-10">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  navigate('shop');
                }}
                className={`px-4 h-full text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border-b-2 ${
                  selectedCategory === cat.id && page === 'shop' 
                    ? 'text-white border-green-500' 
                    : 'text-white/50 border-transparent hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[90] bg-[#1a1a1a] pt-32 px-6 lg:hidden"
          >
            <div className="flex flex-col gap-4">
              {['home', 'shop', 'builder', 'services', 'contact'].map((p) => (
                <button
                  key={p}
                  onClick={() => navigate(p)}
                  className="text-2xl font-bold text-white/70 hover:text-green-500 text-left uppercase tracking-tighter"
                >
                  {p}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pb-20">
        {page === 'home' && <HomePage navigate={navigate} addToCart={addToCart} products={products} onView={setSelectedProduct} />}
        {page === 'shop' && (
          <ShopPage 
            filteredProducts={filteredProducts} 
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            addToCart={addToCart}
            onView={setSelectedProduct}
          />
        )}
        {page === 'builder' && (
          <BuilderPage 
            build={build} 
            setBuild={setBuild} 
            builderStep={builderStep} 
            setBuilderStep={setBuilderStep}
            selectPart={selectBuildPart}
            buildTotal={buildTotal}
            addToCart={addToCart}
            products={products}
          />
        )}
        {page === 'services' && <ServicesPage user={user} navigate={navigate} login={login} />}
        {page === 'contact' && <ContactPage />}
        {page === 'profile' && <ProfilePage user={user} orders={orders} navigate={navigate} logout={logout} onRename={handleRename} />}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          addToCart={addToCart}
        />
      )}

      {/* Footer */}
      <footer className="bg-[#1a1a1a] text-white/50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="text-2xl font-bold text-white mb-6 tracking-tighter">
                NEXUS<span className="text-green-500">PC</span>
              </div>
              <p className="text-sm leading-relaxed mb-6">
                Cagayan de Oro's premier destination for high-performance computing. We specialize in custom gaming rigs, professional workstations, and expert hardware repair.
              </p>
              <div className="flex gap-4">
                <Facebook className="w-5 h-5 hover:text-green-500 cursor-pointer" />
                <Twitter className="w-5 h-5 hover:text-green-500 cursor-pointer" />
                <Instagram className="w-5 h-5 hover:text-green-500 cursor-pointer" />
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-6">Quick Links</h4>
              <ul className="space-y-3 text-sm">
                <li><button onClick={() => navigate('shop')} className="hover:text-green-500">Shop All Parts</button></li>
                <li><button onClick={() => navigate('builder')} className="hover:text-green-500">PC Builder</button></li>
                <li><button onClick={() => navigate('services')} className="hover:text-green-500">Our Services</button></li>
                <li><button onClick={() => navigate('contact')} className="hover:text-green-500">Contact Us</button></li>
                <li><button onClick={() => navigate('admin')} className="hover:text-green-500 opacity-50 text-[10px] uppercase tracking-widest mt-4">Admin Panel</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-6">Contact Info</h4>
              <ul className="space-y-4 text-sm">
                <li className="flex gap-3"><MapPin className="w-4 h-4 text-green-500 shrink-0" /> 123 Corrales Ave, CDO</li>
                <li className="flex gap-3"><Phone className="w-4 h-4 text-green-500 shrink-0" /> +63 917 123 4567</li>
                <li className="flex gap-3"><Mail className="w-4 h-4 text-green-500 shrink-0" /> sales@nexuspc.ph</li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-6">Newsletter</h4>
              <p className="text-sm mb-4">Get the latest deals and tech news.</p>
              <div className="flex gap-2">
                <input type="text" placeholder="Email" className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:border-green-500" />
                <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors">
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-medium tracking-wider uppercase">
            <div>© 2025 NEXUS PC. ALL RIGHTS RESERVED.</div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              ALL SYSTEMS OPERATIONAL
            </div>
          </div>
        </div>
      </footer>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 w-full max-w-md h-full bg-white z-[201] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b flex items-center justify-between bg-[#1a1a1a] text-white">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-5 h-5 text-green-500" />
                  <h2 className="font-bold uppercase tracking-widest text-sm">Your Cart ({cartCount})</h2>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── Scrollable area: items + checkout form ── */}
              <div className="flex-1 overflow-y-auto">

                {/* Cart Items */}
                <div className="p-6 space-y-6">
                  {cart.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-4">
                      <ShoppingCart className="w-16 h-16 opacity-20" />
                      <p className="font-medium">Your cart is empty</p>
                      <button 
                        onClick={() => { setIsCartOpen(false); navigate('shop'); }}
                        className="text-green-600 font-bold text-sm hover:underline"
                      >
                        Browse Products
                      </button>
                    </div>
                  ) : (
                    cart.map(item => {
                      const liveProduct = products.find(p => p.id === item.id);
                      const availableStock = liveProduct?.stock ?? item.stock;
                      const isOutOfStock = availableStock <= 0;
                      const isLowStock = availableStock > 0 && availableStock < item.qty;
                      return (
                      <div key={item.id} className={`flex gap-4 group rounded-xl p-2 -mx-2 transition-colors ${isOutOfStock ? 'bg-red-50' : isLowStock ? 'bg-orange-50' : ''}`}>
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200 relative">
                          <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center">
                              <span className="text-white text-[9px] font-black uppercase tracking-widest text-center leading-tight px-1">Out of Stock</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm leading-tight mb-0.5 truncate">{item.name}</h3>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{item.category}</p>
                          {isOutOfStock && (
                            <p className="text-[10px] text-red-500 font-bold mb-1">❌ No longer available — please remove</p>
                          )}
                          {isLowStock && (
                            <p className="text-[10px] text-orange-500 font-bold mb-1">⚠️ Only {availableStock} left — qty adjusted</p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className={`flex items-center gap-3 rounded-md px-2 py-1 ${isOutOfStock ? 'bg-red-100' : 'bg-gray-100'}`}>
                              <button onClick={() => updateQty(item.id, -1)} className="text-gray-500 hover:text-black">
                                <X className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                              <button
                                onClick={() => updateQty(item.id, 1)}
                                disabled={item.qty >= availableStock}
                                className="text-gray-500 hover:text-black disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Zap className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-red-600">₱{(item.price * item.qty).toLocaleString()}</div>
                              <button 
                                onClick={() => removeFromCart(item.id)}
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

                {/* Checkout Panel — below items, scrolls with them */}
                {cart.length > 0 && (
                  <div className="px-6 pb-8 pt-2 border-t bg-gray-50 space-y-5">

                    {/* Order Summary */}
                    <div className="space-y-2 pt-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Order Summary</p>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-bold text-xs uppercase tracking-widest">Subtotal</span>
                        <span className="text-base font-bold text-gray-800">₱{cartTotal.toLocaleString()}</span>
                      </div>

                      {qualifiesForFreeShipping ? (
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
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Delivery Address <span className="text-red-400">*</span></p>
                        {savedDeliveryAddress && deliveryAddress.trim() !== savedDeliveryAddress && (
                          <button
                            onClick={() => { setDeliveryAddress(savedDeliveryAddress); setDeliveryCoords(null); setLocError(''); }}
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
                          value={deliveryAddress}
                          onChange={e => { setDeliveryAddress(e.target.value); setLocError(''); }}
                          className={`flex-1 bg-white border rounded-xl px-3 py-2.5 text-[11px] focus:outline-none transition-all ${deliveryAddress.trim() ? 'border-green-400 bg-green-50/30' : 'border-gray-200 focus:border-green-500'}`}
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

                      {deliveryAddress.trim() && !locError && (
                        <p className="text-[10px] text-green-600 truncate mb-1">
                          {deliveryAddress.trim() === savedDeliveryAddress ? '📍 Saved address' : '✅ New address'}: {deliveryAddress}
                        </p>
                      )}

                      {deliveryCoords && (
                        <div className="rounded-xl overflow-hidden border border-gray-200 h-24 w-full mt-1">
                          <iframe
                            title="Delivery Location"
                            width="100%"
                            height="100%"
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
                      disabled={!deliveryAddress.trim() || isCheckingOut}
                      className="w-full bg-green-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isCheckingOut ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : !deliveryAddress.trim() ? '📍 Add Delivery Address First' : 'Checkout Now'}
                    </button>
                  </div>
                )}

              </div>{/* end scrollable area */}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {paymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
                  {!proofSubmitted && (
                    <button
                      onClick={async () => {
                        // Cancel order + restore stock atomically
                        try {
                          const cancelBatch = writeBatch(db);
                          cancelBatch.update(doc(db, 'orders', paymentModal.orderId), { status: 'Cancelled' });
                          cart.forEach(item => {
                            cancelBatch.update(doc(db, 'products', item.id.toString()), { stock: increment(item.qty) });
                          });
                          await cancelBatch.commit();
                        } catch {}
                        setPaymentModal(null);
                        setIsCartOpen(true);
                      }}
                      className="text-white/40 hover:text-white transition-colors p-1 -ml-1"
                      title="Back to Cart"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                  )}
                  <div>
                    <p className="text-green-500 text-[10px] font-bold uppercase tracking-widest mb-1">Complete Your Order</p>
                    <h3 className="text-white font-black text-lg tracking-tight">{paymentModal.method} Payment</h3>
                  </div>
                </div>
                {proofSubmitted && (
                  <button onClick={() => setPaymentModal(null)} className="text-white/40 hover:text-white transition-colors p-1">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="p-8 max-h-[80vh] overflow-y-auto">
                {proofSubmitted ? (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="text-xl font-black tracking-tight mb-2">Payment Proof Submitted!</h4>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                      We've received your proof of payment. Our team will verify and confirm your order shortly.
                    </p>
                    <button
                      onClick={() => setPaymentModal(null)}
                      className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-green-700 transition-all"
                    >
                      Done
                    </button>
                  </motion.div>
                ) : (
                  <div className="space-y-6">
                    {/* Amount */}
                    <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Amount to Pay</p>
                      <p className="text-3xl font-black text-red-600">₱{paymentModal.total.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400 mt-1 font-mono">Order #{paymentModal.orderId.slice(-8).toUpperCase()}</p>
                    </div>

                    {/* GCash Details */}
                    {paymentModal.method === 'GCash' && (
                      <div className="space-y-3">
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-3">Scan to Pay via GCash</p>
                          {/* GCash QR Code — replace the src with your actual GCash QR image URL */}
                          <div className="flex justify-center mb-3">
                            <div className="w-48 h-48 bg-white rounded-xl border-2 border-blue-200 flex items-center justify-center overflow-hidden shadow-md">
                              <img
                                src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"
                                alt="GCash QR Code"
                                className="w-full h-full object-contain p-2"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement!.innerHTML = '<p class="text-xs text-gray-400 p-4">QR code not available.<br/>Use number below.</p>';
                                }}
                              />
                            </div>
                          </div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-1">Or send to this number</p>
                          <p className="text-2xl font-black text-blue-700 tracking-widest mb-1">0917 123 4567</p>
                          <p className="text-sm font-bold text-blue-600">NEXUS PC Store</p>
                          <div className="mt-4 pt-4 border-t border-blue-100">
                            <p className="text-[10px] text-blue-400 font-medium">Use your Order ID as reference:</p>
                            <p className="text-sm font-black text-blue-700 font-mono mt-1">#{paymentModal.orderId.slice(-8).toUpperCase()}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 text-center">Send the exact amount then upload your GCash screenshot below.</p>
                      </div>
                    )}

                    {/* Bank Transfer Details */}
                    {paymentModal.method === 'Bank Transfer' && (
                      <div className="space-y-3">
                        <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
                          <div className="text-center text-3xl mb-3">🏦</div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-green-600 mb-4 text-center">Bank Account Details</p>
                          <div className="space-y-3">
                            {[
                              { label: 'Bank', value: 'BDO Unibank' },
                              { label: 'Account Name', value: 'NEXUS PC Store' },
                              { label: 'Account Number', value: '1234 5678 9012' },
                              { label: 'Reference', value: `#${paymentModal.orderId.slice(-8).toUpperCase()}` },
                            ].map((row, i) => (
                              <div key={i} className="flex justify-between items-center py-2 border-b border-green-100 last:border-0">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{row.label}</span>
                                <span className="text-sm font-black text-gray-800">{row.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 text-center">Transfer the exact amount using your Order ID as reference, then upload your receipt below.</p>
                      </div>
                    )}

                    {/* Upload Proof */}
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Upload Proof of Payment</p>
                      <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all ${proofFile ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'}`}>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
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
                      disabled={!proofFile || proofUploading}
                      className="w-full bg-green-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      {proofUploading ? 'Uploading...' : 'Submit Payment Proof'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-8 right-8 z-[600] flex flex-col gap-3">
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
    </ErrorBoundary>
  );
}

