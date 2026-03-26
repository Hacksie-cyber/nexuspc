import { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingCart, 
  Search, 
  User as UserIcon, 
  Menu, 
  X, 
  Cpu, 
  Monitor, 
  HardDrive, 
  Zap, 
  ChevronRight, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  Star,
  Facebook,
  Twitter,
  Instagram,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  LogOut,
  Eye,
  CreditCard,
  Tag,
  Package
} from 'lucide-react';
import { CATEGORIES, Product } from './data/products';
import AdminDashboard from './components/AdminDashboard';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  addDoc, 
  setDoc,
  doc,
  serverTimestamp,
  where,
  updateDoc
} from 'firebase/firestore';
import PCVisualizer from './components/builder/PCVisualizer';

// Types
interface CartItem extends Product {
  qty: number;
}

interface BuildState {
  [key: string]: Product | null;
}

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMsg = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) errorMsg = parsed.error;
      } catch (e) {
        errorMsg = this.state.error.message || errorMsg;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">System Error</h2>
            <p className="text-gray-500 mb-8 text-sm leading-relaxed">{errorMsg}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-green-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
            >
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

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
      if (u) {
        // Create user profile if not exists
        const userRef = doc(db, 'users', u.uid);
        setDoc(userRef, {
          name: u.displayName || 'Anonymous',
          email: u.email,
          role: u.email === 'bamuyahacksie@gmail.com' ? 'admin' : 'client',
          joined: new Date().toISOString()
        }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, 'users'));
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

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
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
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
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
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const handleCheckout = async () => {
    if (!user) {
      login();
      return;
    }

    if (cart.length === 0) return;

    const orderData = {
      uid: user.uid,
      customer: user.displayName || 'Anonymous',
      email: user.email || '',
      items: cart.length,
      total: cartTotal,
      payment: paymentMethod,
      status: 'Processing',
      date: new Date().toISOString(),
      createdAt: serverTimestamp(),
      cartItems: cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty
      }))
    };

    try {
      await addDoc(collection(db, 'orders'), orderData);
      setCart([]);
      setIsCartOpen(false);
      showToast('Order placed successfully! Thank you for shopping with NEXUS PC.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'orders');
      showToast('Failed to place order. Please try again.', 'error');
    }
  };

  const selectBuildPart = (category: string, product: Product) => {
    setBuild(prev => ({ ...prev, [category]: product }));
    if (builderStep < Object.keys(build).length - 1) {
      setBuilderStep(prev => prev + 1);
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
              onChange={(e) => setSearchQuery(e.target.value)}
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
        {page === 'services' && <ServicesPage />}
        {page === 'contact' && <ContactPage />}
        {page === 'profile' && <ProfilePage user={user} orders={orders} navigate={navigate} logout={logout} />}
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

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
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
                  cart.map(item => (
                    <div key={item.id} className="flex gap-4 group">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                        <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm leading-tight mb-1 truncate">{item.name}</h3>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{item.category}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 bg-gray-100 rounded-md px-2 py-1">
                            <button onClick={() => updateQty(item.id, -1)} className="text-gray-500 hover:text-black">
                              <X className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold w-4 text-center">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="text-gray-500 hover:text-black">
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
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 border-t bg-gray-50">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-gray-500 font-bold text-xs uppercase tracking-widest">Subtotal</span>
                    <span className="text-2xl font-bold text-red-600">₱{cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="mb-5">
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
                  <button 
                    onClick={handleCheckout}
                    className="w-full bg-green-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 active:scale-[0.98]"
                  >
                    Checkout Now
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </div>
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
    </ErrorBoundary>
  );
}

// --- Page Components ---

function HomePage({ navigate, addToCart, products, onView }: { navigate: (p: string) => void, addToCart: (p: Product) => void, products: Product[], onView: (p: Product) => void }) {
  // Show sale items first, then fill remaining slots with newest products across all categories
  const saleItems = products.filter(p => p.oldPrice).slice(0, 4);
  const nonSaleItems = products.filter(p => !p.oldPrice).slice(0, 4 - saleItems.length);
  const featured = saleItems.length > 0
    ? [...saleItems, ...nonSaleItems].slice(0, 4)
    : products.slice(0, 4);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-24"
    >
      {/* Hero Section */}
      <section className="relative h-[85vh] min-h-[600px] bg-[#1a1a1a] overflow-hidden flex items-center">
        <div className="absolute inset-0 opacity-40">
          <img 
            src="https://images.unsplash.com/photo-1587202372775-e229f172b9d7?q=80&w=2000" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a] via-[#1a1a1a]/80 to-transparent"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 w-full">
          <div className="max-w-2xl">
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 px-3 py-1 rounded-full text-green-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-8"
            >
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Cagayan de Oro's Trusted PC Store
            </motion.div>
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-6xl md:text-8xl font-bold text-white leading-[0.9] tracking-tighter mb-8"
            >
              BUILD YOUR <br />
              <span className="text-green-500">ULTIMATE RIG</span>
            </motion.h1>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-lg text-white/60 mb-10 leading-relaxed max-w-lg"
            >
              Premium components, expert custom builds, and professional repair services. From budget office setups to extreme gaming machines.
            </motion.p>
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-4"
            >
              <button 
                onClick={() => navigate('builder')}
                className="bg-green-600 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-green-700 transition-all shadow-xl shadow-green-600/20 active:scale-95"
              >
                Launch PC Builder
              </button>
              <button 
                onClick={() => navigate('shop')}
                className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-white/20 transition-all active:scale-95"
              >
                Shop Components
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-bold tracking-tighter mb-2">Featured <span className="text-green-600">Deals</span></h2>
            <p className="text-gray-500 text-sm">Hand-picked premium components for your next build.</p>
          </div>
          <button 
            onClick={() => navigate('shop')}
            className="text-green-600 font-bold text-sm uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map(p => (
            <ProductCard key={p.id} product={p} addToCart={addToCart} onView={onView} />
          ))}
        </div>
      </section>

      {/* Services Banner */}
      <section className="bg-[#1a1a1a] py-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <img src="https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        </div>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-5xl font-bold text-white tracking-tighter mb-8">Expert <span className="text-green-500">PC Services</span></h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12 text-left">
              <div className="space-y-2">
                <div className="text-green-500 font-bold text-xl">01. Custom Builds</div>
                <p className="text-white/50 text-sm">Professional assembly with premium cable management and stress testing.</p>
              </div>
              <div className="space-y-2">
                <div className="text-green-500 font-bold text-xl">02. Repair & Upgrade</div>
                <p className="text-white/50 text-sm">Hardware diagnosis, component replacement, and performance optimization.</p>
              </div>
              <div className="space-y-2">
                <div className="text-green-500 font-bold text-xl">03. Consultation</div>
                <p className="text-white/50 text-sm">Free expert advice on component selection tailored to your specific needs.</p>
              </div>
              <div className="space-y-2">
                <div className="text-green-500 font-bold text-xl">04. Warranty</div>
                <p className="text-white/50 text-sm">Genuine local warranty on all components and 6-month service guarantee.</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('services')}
              className="bg-white text-black px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-gray-200 transition-all active:scale-95"
            >
              Book a Service
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tighter mb-4">What Builders <span className="text-green-600">Say</span></h2>
          <div className="flex justify-center gap-1 text-yellow-500 mb-2">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
          </div>
          <p className="text-gray-500 text-sm">Trusted by thousands of gamers and professionals in CDO.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { name: 'Marco R.', role: 'Gamer', text: 'Built my gaming rig through NEXUS PC and the experience was flawless. Cable management was impeccable.' },
            { name: 'Sofia L.', role: 'Video Editor', text: 'Ordered parts for my workstation. Fast delivery, genuine items, and great expert advice.' },
            { name: 'James T.', role: 'Business Owner', text: 'Professional service and great pricing for our office setup. Handled all software installation perfectly.' }
          ].map((t, i) => (
            <div key={i} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm relative group hover:shadow-md transition-all">
              <div className="text-green-500/10 absolute top-4 right-6 text-6xl font-serif leading-none group-hover:text-green-500/20 transition-colors">"</div>
              <p className="text-gray-600 italic mb-6 relative z-10 leading-relaxed">"{t.text}"</p>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xs uppercase">
                  {t.name[0]}
                </div>
                <div>
                  <div className="font-bold text-sm">{t.name}</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

function ShopPage({ 
  filteredProducts, 
  selectedCategory, 
  setSelectedCategory, 
  priceRange, 
  setPriceRange,
  addToCart,
  onView
}: {
  filteredProducts: Product[];
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  priceRange: number;
  setPriceRange: (p: number) => void;
  addToCart: (p: Product) => void;
  onView: (p: Product) => void;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-12">
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 shrink-0 space-y-10">
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-6">Categories</h3>
            <div className="space-y-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-between ${
                    selectedCategory === cat.id ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg opacity-80">{cat.icon}</span>
                    {cat.label}
                  </span>
                  {selectedCategory === cat.id && <ChevronRight className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-6">Price Range</h3>
            <div className="px-2">
              <div className="flex justify-between text-xs font-bold text-green-600 mb-4">
                <span>₱0</span>
                <span>₱{priceRange.toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="150000" 
                step="1000"
                value={priceRange}
                onChange={(e) => setPriceRange(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
              />
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-bold tracking-tighter">
              {selectedCategory === 'all' ? 'All Products' : CATEGORIES.find(c => c.id === selectedCategory)?.label}
              <span className="text-gray-300 text-sm font-medium ml-4 uppercase tracking-widest">({filteredProducts.length} items)</span>
            </h2>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="py-32 text-center text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="font-medium">No products match your filters</p>
              <button onClick={() => { setSelectedCategory('all'); setPriceRange(150000); }} className="text-green-600 font-bold mt-2 hover:underline">Clear Filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((p: Product) => (
                <ProductCard key={p.id} product={p} addToCart={addToCart} onView={onView} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BuilderPage({ build, selectPart, builderStep, setBuilderStep, buildTotal, addToCart, products }: {
  build: BuildState;
  setBuild: (b: BuildState) => void;
  selectPart: (cat: string, p: Product) => void;
  builderStep: number;
  setBuilderStep: (s: number) => void;
  buildTotal: number;
  addToCart: (p: Product) => void;
  products: Product[];
}) {
  const steps = [
    { id: 'cpu', label: 'CPU', icon: <Cpu className="w-4 h-4" /> },
    { id: 'motherboard', label: 'Motherboard', icon: <Zap className="w-4 h-4" /> },
    { id: 'ram', label: 'RAM', icon: <HardDrive className="w-4 h-4" /> },
    { id: 'gpu', label: 'GPU', icon: <Monitor className="w-4 h-4" /> },
    { id: 'storage', label: 'Storage', icon: <HardDrive className="w-4 h-4" /> },
    { id: 'psu', label: 'PSU', icon: <Zap className="w-4 h-4" /> },
    { id: 'case', label: 'Case', icon: <Monitor className="w-4 h-4" /> },
  ];

  const currentStepId = steps[builderStep].id;
  const options = products.filter(p => p.category === currentStepId);

  // ── Compatibility Engine ─────────────────────────────────────────
  const getCompatibilityIssues = (testBuild: BuildState): { part: string; message: string }[] => {
    const issues: { part: string; message: string }[] = [];
    const cpu = testBuild['cpu'] as Product | null;
    const motherboard = testBuild['motherboard'] as Product | null;
    const ram = testBuild['ram'] as Product | null;
    const gpu = testBuild['gpu'] as Product | null;
    const psu = testBuild['psu'] as Product | null;

    // CPU ↔ Motherboard socket check
    if (cpu && motherboard && cpu.socket && motherboard.socket) {
      if (cpu.socket !== motherboard.socket) {
        issues.push({
          part: 'CPU / Motherboard',
          message: `Socket mismatch — CPU uses ${cpu.socket} but motherboard supports ${motherboard.socket}.`,
        });
      }
    }

    // Motherboard ↔ RAM type check
    if (motherboard && ram && motherboard.ramType && ram.ramType) {
      if (motherboard.ramType !== ram.ramType) {
        issues.push({
          part: 'Motherboard / RAM',
          message: `RAM type mismatch — motherboard supports ${motherboard.ramType} but selected RAM is ${ram.ramType}.`,
        });
      }
    }

    // PSU wattage check — sum watts of cpu + gpu + 100W baseline for rest
    if (psu && psu.watts) {
      const cpuWatts = cpu?.watts || 0;
      const gpuWatts = gpu?.watts || 0;
      const baselineWatts = 100; // mobo + ram + storage + fans
      const totalRequired = cpuWatts + gpuWatts + baselineWatts;
      if (totalRequired > psu.watts) {
        issues.push({
          part: 'PSU',
          message: `Insufficient power — build needs ~${totalRequired}W but PSU is only ${psu.watts}W.`,
        });
      }
    }

    return issues;
  };

  // Check compatibility of a candidate part against the current build
  const getPartWarning = (part: Product): string | null => {
    const testBuild = { ...build, [currentStepId]: part };
    const issues = getCompatibilityIssues(testBuild);
    if (issues.length === 0) return null;
    return issues.map(i => i.message).join(' ');
  };

  const compatibilityIssues = getCompatibilityIssues(build);

  const addFullBuildToCart = () => {
    const parts = Object.values(build).filter(p => p !== null) as Product[];
    parts.forEach(p => addToCart(p));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-12">
      <div className="mb-12">
        <PCVisualizer build={build} currentStepId={steps[builderStep].id} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          {/* Steps Nav */}
          <div className="flex bg-white rounded-xl border border-gray-200 overflow-x-auto no-scrollbar shadow-sm">
            {steps.map((step, i) => {
              // Show warning dot on step tab if this step's part has issues
              const stepHasIssue = compatibilityIssues.some(issue =>
                issue.part.toLowerCase().includes(step.id) ||
                issue.part.toLowerCase().includes(step.label.toLowerCase())
              );
              return (
                <button
                  key={step.id}
                  onClick={() => setBuilderStep(i)}
                  className={`flex-1 min-w-[100px] py-4 px-2 flex flex-col items-center gap-2 border-r last:border-r-0 transition-all relative ${
                    builderStep === i ? 'bg-green-600 text-white' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-widest opacity-60 ${builderStep === i ? 'text-white' : 'text-gray-400'}`}>Step 0{i+1}</span>
                  <span className="text-xs font-bold uppercase tracking-wider">{step.label}</span>
                  {build[step.id] && builderStep !== i && !stepHasIssue && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {build[step.id] && stepHasIssue && (
                    <span className="w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center text-[9px] font-black text-yellow-900">!</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Compatibility Warnings Banner */}
          {compatibilityIssues.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-2"
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest text-yellow-700">Compatibility Issues Detected</span>
              </div>
              {compatibilityIssues.map((issue, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-yellow-800 leading-relaxed">
                  <span className="font-bold shrink-0">{issue.part}:</span>
                  <span>{issue.message}</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Options Grid */}
          <div>
            <h2 className="text-2xl font-bold tracking-tighter mb-6 flex items-center gap-3">
              {steps[builderStep].icon}
              Select {steps[builderStep].label}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {options.length === 0 ? (
                <div className="col-span-2 py-16 text-center text-gray-400">
                  <HardDrive className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No {steps[builderStep].label} products in inventory yet.</p>
                </div>
              ) : (
                options.map(p => {
                  const warning = getPartWarning(p);
                  const isSelected = build[currentStepId]?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => selectPart(currentStepId, p)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex gap-4 group relative ${
                        isSelected
                          ? 'border-green-500 bg-green-50'
                          : warning
                          ? 'border-yellow-300 bg-yellow-50/50 hover:border-yellow-400'
                          : 'border-gray-100 bg-white hover:border-green-200'
                      }`}
                    >
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                        <img src={p.img} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm mb-1 leading-tight">{p.name}</h3>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{p.brand}</p>
                        {/* Spec tags */}
                        <div className="flex flex-wrap gap-1 mb-1">
                          {p.socket && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">{p.socket}</span>}
                          {p.ramType && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">{p.ramType}</span>}
                          {p.watts && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">{p.watts}W</span>}
                        </div>
                        <div className="text-sm font-bold text-red-600">₱{p.price.toLocaleString()}</div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end justify-between">
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        {!isSelected && warning && (
                          <div className="group/tip relative">
                            <AlertTriangle className="w-5 h-5 text-yellow-500" />
                            {/* Tooltip */}
                            <div className="absolute right-0 top-6 w-52 bg-gray-900 text-white text-[10px] leading-relaxed rounded-lg p-2.5 hidden group-hover/tip:block z-10 shadow-xl">
                              {warning}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Build Summary */}
        <aside className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm sticky top-40">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-6 border-b pb-4">Build Summary</h3>
            <div className="space-y-4 mb-6">
              {steps.map(step => {
                const partHasIssue = compatibilityIssues.some(issue =>
                  issue.part.toLowerCase().includes(step.id) ||
                  issue.part.toLowerCase().includes(step.label.toLowerCase())
                );
                return (
                  <div key={step.id} className="flex justify-between items-start gap-4">
                    <div className={`text-[10px] font-bold uppercase tracking-widest pt-1 flex items-center gap-1 ${partHasIssue ? 'text-yellow-500' : 'text-gray-400'}`}>
                      {partHasIssue && <AlertTriangle className="w-3 h-3" />}
                      {step.label}
                    </div>
                    <div className="text-right flex-1">
                      {build[step.id] ? (
                        <>
                          <div className="text-xs font-bold leading-tight truncate max-w-[140px] ml-auto">{build[step.id]?.name}</div>
                          <div className="text-[10px] font-bold text-red-600">₱{build[step.id]?.price.toLocaleString()}</div>
                        </>
                      ) : (
                        <div className="text-xs text-gray-300 italic">Not selected</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compatibility summary in sidebar */}
            {compatibilityIssues.length > 0 && (
              <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-yellow-700">{compatibilityIssues.length} Issue{compatibilityIssues.length > 1 ? 's' : ''}</span>
                </div>
                {compatibilityIssues.map((issue, i) => (
                  <p key={i} className="text-[10px] text-yellow-800 leading-relaxed">{issue.message}</p>
                ))}
              </div>
            )}

            <div className="pt-4 border-t space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Total Estimate</span>
                <span className="text-2xl font-bold text-red-600">₱{buildTotal.toLocaleString()}</span>
              </div>
              {compatibilityIssues.length > 0 && (
                <p className="text-[10px] text-yellow-600 font-medium leading-relaxed">
                  ⚠️ Your build has compatibility issues. You can still add it to cart, but some parts may not work together.
                </p>
              )}
              <button
                onClick={addFullBuildToCart}
                disabled={Object.values(build).every(v => v === null)}
                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                  compatibilityIssues.length > 0
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-500/20'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20'
                }`}
              >
                {compatibilityIssues.length > 0 ? '⚠️ Add Build Anyway' : 'Add Build to Cart'}
              </button>
            </div>
          </div>
        </aside>
      </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ServicesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-12">
      <div className="text-center max-w-2xl mx-auto mb-20">
        <h2 className="text-5xl font-bold tracking-tighter mb-6">Professional <span className="text-green-600">PC Services</span></h2>
        <p className="text-gray-500">Expert hardware solutions by certified technicians. Fast turnaround, quality guaranteed.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[
          { title: 'Custom PC Building', price: '₱1,500', desc: 'Professional assembly with premium cable management, BIOS configuration, and stress testing.', icon: '🖥️' },
          { title: 'Repair & Diagnosis', price: '₱500', desc: 'Comprehensive hardware diagnostics and repair for all PC issues.', icon: '🔧' },
          { title: 'Hardware Upgrade', price: '₱300', desc: 'Expert installation of RAM, SSDs, GPUs, and other components.', icon: '⬆️' },
          { title: 'Free Consultation', price: 'FREE', desc: '30-minute expert advice session for your next build or upgrade.', icon: '💬' }
        ].map((s, i) => (
          <div key={i} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex gap-6 group hover:shadow-md transition-all">
            <div className="text-4xl shrink-0">{s.icon}</div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold tracking-tight">{s.title}</h3>
                <span className="text-green-600 font-bold text-sm">{s.price}</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">{s.desc}</p>
              <button className="text-green-600 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                Book Now <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
        <div>
          <h2 className="text-5xl font-bold tracking-tighter mb-8">Get in <span className="text-green-600">Touch</span></h2>
          <p className="text-gray-500 mb-12 leading-relaxed">Have questions about a build or need technical support? Our team is ready to help you build the machine of your dreams.</p>
          
          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm uppercase tracking-widest mb-1">Our Location</h4>
                <p className="text-gray-500 text-sm">123 Corrales Ave, Cagayan de Oro City, 9000 Philippines</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 shrink-0">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm uppercase tracking-widest mb-1">Phone</h4>
                <p className="text-gray-500 text-sm">+63 917 123 4567 / +63 88 880 1234</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm uppercase tracking-widest mb-1">Email</h4>
                <p className="text-gray-500 text-sm">sales@nexuspc.ph / support@nexuspc.ph</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-xl">
          <h3 className="text-2xl font-bold tracking-tight mb-8">Send a Message</h3>
          <form className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Name</label>
                <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Email</label>
                <input type="email" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Subject</label>
              <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all">
                <option>Product Inquiry</option>
                <option>Order Status</option>
                <option>Technical Support</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Message</label>
              <textarea rows={5} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all resize-none"></textarea>
            </div>
            <button className="w-full bg-green-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-600/20">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ProfilePage({ user, orders, navigate, logout }: { user: User | null, orders: any[], navigate: (p: string) => void, logout: () => void }) {
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ orderId: string; type: 'cancel' | 'refund' | 'reject' } | null>(null);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Please login to view your profile</h2>
        <button onClick={() => navigate('home')} className="text-green-600 font-bold hover:underline">Go Back Home</button>
      </div>
    );
  }

  const fmt = (n: number) => '₱' + n.toLocaleString();

  const handleOrderAction = async (orderId: string, type: 'cancel' | 'refund' | 'reject') => {
    setActionLoading(orderId + type);
    const statusMap = { cancel: 'Cancelled', refund: 'Refund Requested', reject: 'Return & Rejected' };
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: statusMap[type] });
    } catch (err) {
      console.error('Failed to update order:', err);
    } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const statusStyle: Record<string, string> = {
    Delivered: 'bg-green-100 text-green-600',
    Shipped: 'bg-blue-100 text-blue-600',
    Cancelled: 'bg-red-100 text-red-600',
    Processing: 'bg-orange-100 text-orange-600',
    'Refund Requested': 'bg-yellow-100 text-yellow-700',
    'Return & Rejected': 'bg-gray-100 text-gray-600',
  };

  const getOrderActions = (order: any) => {
    switch (order.status) {
      case 'Processing':
        return (
          <button
            onClick={() => setConfirmAction({ orderId: order.id, type: 'cancel' })}
            className="text-[10px] font-bold uppercase tracking-widest text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all"
          >
            Cancel Order
          </button>
        );
      case 'Shipped':
        return (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setConfirmAction({ orderId: order.id, type: 'refund' })}
              className="text-[10px] font-bold uppercase tracking-widest text-orange-500 border border-orange-200 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg transition-all"
            >
              Request Refund
            </button>
            <button
              onClick={() => setConfirmAction({ orderId: order.id, type: 'reject' })}
              className="text-[10px] font-bold uppercase tracking-widest text-gray-500 border border-gray-200 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-all"
            >
              Reject Delivery
            </button>
          </div>
        );
      case 'Refund Requested':
        return <span className="text-[10px] font-bold uppercase tracking-widest text-yellow-700 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-lg">Awaiting Refund Review</span>;
      case 'Return & Rejected':
        return <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">Return Being Processed</span>;
      default:
        return null;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto px-4 py-12">

      {/* Confirm Action Modal */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setConfirmAction(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8"
              onClick={e => e.stopPropagation()}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 ${confirmAction.type === 'cancel' ? 'bg-red-100' : confirmAction.type === 'refund' ? 'bg-orange-100' : 'bg-gray-100'}`}>
                <X className={`w-7 h-7 ${confirmAction.type === 'cancel' ? 'text-red-500' : confirmAction.type === 'refund' ? 'text-orange-500' : 'text-gray-500'}`} />
              </div>
              <h3 className="text-lg font-black text-center tracking-tight mb-2">
                {confirmAction.type === 'cancel' && 'Cancel this order?'}
                {confirmAction.type === 'refund' && 'Request a refund?'}
                {confirmAction.type === 'reject' && 'Reject delivery?'}
              </h3>
              <p className="text-sm text-gray-400 text-center mb-7 leading-relaxed">
                {confirmAction.type === 'cancel' && 'This will cancel your order. This action cannot be undone.'}
                {confirmAction.type === 'refund' && "A refund request will be sent to our team for review. We'll get back to you within 1–3 business days."}
                {confirmAction.type === 'reject' && "You're refusing delivery of this shipment. Our team will process your return and contact you shortly."}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all">
                  Go Back
                </button>
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleOrderAction(confirmAction.orderId, confirmAction.type)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 ${confirmAction.type === 'cancel' ? 'bg-red-500 hover:bg-red-600' : confirmAction.type === 'refund' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-700 hover:bg-gray-800'}`}
                >
                  {actionLoading ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl">
        <div className="h-32 bg-gradient-to-r from-green-600 to-green-400"></div>
        <div className="px-8 pb-8">
          <div className="relative -mt-16 mb-6 flex items-end justify-between">
            <div className="p-1 bg-white rounded-full">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-32 h-32 rounded-full border-4 border-white shadow-lg" />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
                  <UserIcon className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </div>
            <button onClick={logout} className="px-6 py-2 bg-red-50 text-red-600 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-red-100 transition-all mb-4">
              Logout
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tighter">{user.displayName || 'NEXUS User'}</h1>
              <p className="text-gray-500">{user.email}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Account Status</div>
                <div className="text-sm font-bold text-green-600 flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>Verified Member</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Member Since</div>
                <div className="text-sm font-bold">March 2025</div>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Total Orders</div>
                <div className="text-sm font-bold">{orders.length} Orders</div>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-100">
              <h3 className="font-bold uppercase tracking-widest text-sm mb-6">Order History</h3>
              {orders.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">No recent orders found.</p>
                  <button onClick={() => navigate('shop')} className="mt-4 text-green-600 font-bold text-sm hover:underline">Start Shopping</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                      <div className="p-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <span className="font-mono text-sm font-bold text-green-600">{order.id}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${statusStyle[order.status] || 'bg-gray-100 text-gray-600'}`}>
                              {order.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mb-3">{new Date(order.date).toLocaleDateString()} • {order.items} items</div>
                          {getOrderActions(order)}
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-6 shrink-0">
                          <div className="text-right">
                            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Total Amount</div>
                            <div className="text-lg font-bold text-gray-900">{fmt(order.total)}</div>
                          </div>
                          <button onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)} className="p-2 hover:bg-gray-200 rounded-lg transition-all">
                            <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${selectedOrder?.id === order.id ? 'rotate-90' : ''}`} />
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {selectedOrder?.id === order.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="border-t border-gray-200 bg-white p-6"
                          >
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Order Items</h4>
                            <div className="space-y-3">
                              {order.cartItems?.map((item: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-400 font-mono text-xs">{item.qty}x</span>
                                    <span className="font-medium">{item.name}</span>
                                  </div>
                                  <div className="font-bold">{fmt(item.price * item.qty)}</div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-6 pt-4 border-t border-dashed grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1">Payment Method</span>
                                <span className="text-sm font-bold">{order.payment}</span>
                              </div>
                              <div>
                                <span className="text-xs font-bold uppercase tracking-widest text-gray-400 block mb-1">Order Status</span>
                                <span className={`text-xs font-bold px-2 py-1 rounded ${statusStyle[order.status] || 'bg-gray-100 text-gray-600'}`}>{order.status}</span>
                              </div>
                            </div>
                            {order.status === 'Shipped' && (
                              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-600 leading-relaxed">
                                <strong>Your order is on the way.</strong> You may request a refund or reject the delivery if needed.
                              </div>
                            )}
                            {order.status === 'Delivered' && (
                              <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-600 leading-relaxed">
                                <strong>Order delivered.</strong> Thank you for shopping with NEXUS PC!
                              </div>
                            )}
                            {order.status === 'Refund Requested' && (
                              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-xl text-xs text-yellow-700 leading-relaxed">
                                <strong>Refund under review.</strong> Our team will process this within 1–3 business days.
                              </div>
                            )}
                            {order.status === 'Return & Rejected' && (
                              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600 leading-relaxed">
                                <strong>Return being processed.</strong> We'll contact you once the return is confirmed.
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}


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
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
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
              className="w-full h-full object-cover"
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
