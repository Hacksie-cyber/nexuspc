import { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingCart, Search, User as UserIcon, Menu, X,
  CheckCircle2, AlertTriangle, Facebook, Twitter,
  Instagram, Phone, Mail, MapPin, ArrowRight, LogOut,
} from 'lucide-react';
import { CATEGORIES, Product } from './data/products';
import AdminDashboard from './components/AdminDashboard';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import {
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, updateProfile,
} from 'firebase/auth';
import {
  collection, onSnapshot, query, setDoc, doc, getDoc,
  where, updateDoc,
} from 'firebase/firestore';
import { CartItem, BuildState } from './types';
import { ProductCard, ProductModal } from './components/ProductCard';
import {
  HomePage, ShopPage, BuilderPage, ServicesPage, ContactPage, ProfilePage,
} from './pages/Pages';

// Extracted components
import CartSidebar from './components/cart/CartSidebar';
import PaymentModal, { PaymentInfo } from './components/cart/PaymentModal';

// Extracted hooks
import { useCart } from './hooks/useCart';
import { useToast } from './hooks/useToast';

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, info: ErrorInfo) { console.error('ErrorBoundary:', error, info); }
  render() {
    if (this.state.hasError) {
      let msg = 'Something went wrong.';
      try { const p = JSON.parse(this.state.error.message); if (p.error) msg = p.error; } catch {}
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <X className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">System Error</h2>
            <p className="text-gray-500 mb-8 text-sm leading-relaxed">{msg}</p>
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

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('home');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState(150000);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [savedDeliveryAddress, setSavedDeliveryAddress] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const [build, setBuild] = useState<BuildState>({
    cpu: null, motherboard: null, ram: null,
    gpu: null, storage: null, psu: null, case: null,
  });
  const [builderStep, setBuilderStep] = useState(0);

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [cartSnapshot, setCartSnapshot] = useState<CartItem[]>([]);

  const { toasts, showToast } = useToast();
  const { cart, cartCount, addToCart, removeFromCart, updateQty, clearCart } = useCart(user);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async u => {
      setUser(u);
      setIsAuthReady(true);
      if (u) {
        const userRef = doc(db, 'users', u.uid);
        await setDoc(userRef, {
          name: u.displayName || 'Anonymous',
          email: u.email,
          role: u.email === 'bamuyahacksie@gmail.com' ? 'admin' : 'client',
          joined: new Date().toISOString(),
        }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, 'users'));
        try {
          const snap = await getDoc(userRef);
          const saved = snap.data()?.deliveryAddress || '';
          if (saved) setSavedDeliveryAddress(saved);
        } catch (err) { console.error('Failed to load saved address:', err); }
      } else {
        setSavedDeliveryAddress('');
      }
    });
    return unsubscribe;
  }, []);

  // Products listener
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'products')),
      snapshot => setProducts(
        snapshot.docs
          .map(d => ({ id: Number(d.id), ...d.data() } as Product))
          .sort((a, b) => a.name.localeCompare(b.name)),
      ),
      err => handleFirestoreError(err, OperationType.LIST, 'products'),
    );
    return unsubscribe;
  }, []);

  // Orders listener
  useEffect(() => {
    if (!user) { setOrders([]); return; }
    const unsubscribe = onSnapshot(
      query(collection(db, 'orders'), where('uid', '==', user.uid)),
      snapshot => setOrders(
        snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      ),
      err => handleFirestoreError(err, OperationType.LIST, 'orders'),
    );
    return unsubscribe;
  }, [user]);

  const filteredProducts = useMemo(() => products.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q
      || p.name.toLowerCase().includes(q)
      || p.brand.toLowerCase().includes(q)
      || p.description?.toLowerCase().includes(q)
      || p.specs.some(s => s.toLowerCase().includes(q))
      || p.category.toLowerCase().includes(q);
    const matchesCategory = q ? true : selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory && p.price <= priceRange;
  }), [products, searchQuery, selectedCategory, priceRange]);

  const buildTotal = Object.values(build).reduce(
    (acc, p) => acc + ((p as Product | null)?.price || 0), 0,
  );

  const login = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); }
    catch (err) { console.error('Login failed:', err); }
  };

  const logout = async () => {
    try { await signOut(auth); setPage('home'); }
    catch (err) { console.error('Logout failed:', err); }
  };

  const handleAddToCart = (product: Product) => {
    addToCart(product, showToast);
    setIsCartOpen(true);
  };

  const handleUpdateQty = (id: number, delta: number) => updateQty(id, delta, showToast);

  const selectBuildPart = (category: string, product: Product) => {
    setBuild(prev => ({ ...prev, [category]: product }));
    if (builderStep < Object.keys(build).length - 1) setBuilderStep(prev => prev + 1);
  };

  const handleRename = async (newName: string) => {
    if (!user || !newName.trim()) return;
    try {
      await updateProfile(user, { displayName: newName.trim() });
      await updateDoc(doc(db, 'users', user.uid), { name: newName.trim() });
      showToast('Name updated successfully!');
    } catch { showToast('Failed to update name. Please try again.', 'error'); }
  };

  const navigate = (p: string) => {
    setPage(p);
    setIsMobileMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const handleCheckoutDone = (orderId: string, method: string, total: number) => {
    setCartSnapshot([...cart]);
    setPaymentInfo({ orderId, method, total });
  };

  if (page === 'admin') return <AdminDashboard onExit={() => navigate('home')} />;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-green-500 selection:text-white">

        <div className="bg-green-600 text-white text-[11px] font-medium py-1.5 text-center tracking-wide">
          🚚 FREE DELIVERY FOR ORDERS ₱5,000+ · SAME DAY DELIVERY IN CDO · GENUINE WARRANTY
        </div>

        <nav className="sticky top-0 z-[100] bg-[#1a1a1a] text-white shadow-xl">
          <div className="max-w-7xl mx-auto px-4 h-[64px] flex items-center justify-between gap-6">
            <div className="text-2xl font-bold cursor-pointer tracking-tighter" onClick={() => navigate('home')}>
              NEXUS<span className="text-green-500">PC</span>
            </div>
            <div className="hidden md:flex flex-1 max-w-md relative group">
              <input
                type="text" placeholder="Search components, laptops..."
                className="w-full bg-white/10 border border-white/20 rounded-md py-2 px-4 pl-10 text-sm focus:bg-white focus:text-black focus:outline-none transition-all"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); if (e.target.value) setSelectedCategory('all'); }}
                onFocus={() => page !== 'shop' && navigate('shop')}
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/40 group-focus-within:text-black/40" />
            </div>
            <div className="hidden lg:flex items-center gap-1">
              {['home', 'shop', 'builder', 'services', 'contact'].map(p => (
                <button key={p} onClick={() => navigate(p)}
                  className={`px-4 py-2 rounded-md text-[13px] font-semibold uppercase tracking-wider transition-colors ${page === p ? 'bg-green-600 text-white' : 'text-white/70 hover:text-white hover:bg-white/10'}`}>
                  {p === 'builder' ? 'PC Builder' : p}
                </button>
              ))}
              {user?.email === 'bamuyahacksie@gmail.com' && (
                <button onClick={() => navigate('admin')}
                  className="px-4 py-2 rounded-md text-[13px] font-semibold uppercase tracking-wider text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                  Dashboard
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate('profile')} className="p-2 hover:bg-white/10 rounded-md transition-colors">
                    {user.photoURL ? <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" /> : <UserIcon className="w-5 h-5" />}
                  </button>
                  <button onClick={logout} className="p-2 hover:bg-white/10 rounded-md transition-colors text-white/50 hover:text-red-500">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button onClick={login} className="px-4 py-2 bg-green-600 text-white rounded-md text-[13px] font-bold uppercase tracking-wider hover:bg-green-700 transition-all">
                  Login
                </button>
              )}
              <button className="relative p-2 hover:bg-white/10 rounded-md transition-colors" onClick={() => setIsCartOpen(true)}>
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{cartCount}</span>
                )}
              </button>
              <button className="lg:hidden p-2 hover:bg-white/10 rounded-md transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
          <div className="bg-[#2d2d2d] border-t border-white/5 overflow-x-auto no-scrollbar">
            <div className="max-w-7xl mx-auto px-4 flex items-center h-10">
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); navigate('shop'); }}
                  className={`px-4 h-full text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-all border-b-2 ${selectedCategory === cat.id && page === 'shop' ? 'text-white border-green-500' : 'text-white/50 border-transparent hover:text-white'}`}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="fixed inset-0 z-[90] bg-[#1a1a1a] pt-32 px-6 lg:hidden">
              <div className="flex flex-col gap-4">
                {['home', 'shop', 'builder', 'services', 'contact'].map(p => (
                  <button key={p} onClick={() => navigate(p)}
                    className="text-2xl font-bold text-white/70 hover:text-green-500 text-left uppercase tracking-tighter">{p}</button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <main className="pb-20">
          {page === 'home' && <HomePage navigate={navigate} addToCart={handleAddToCart} products={products} onView={setSelectedProduct} />}
          {page === 'shop' && <ShopPage filteredProducts={filteredProducts} selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} priceRange={priceRange} setPriceRange={setPriceRange} addToCart={handleAddToCart} onView={setSelectedProduct} />}
          {page === 'builder' && <BuilderPage build={build} setBuild={setBuild} builderStep={builderStep} setBuilderStep={setBuilderStep} selectPart={selectBuildPart} buildTotal={buildTotal} addToCart={handleAddToCart} products={products} />}
          {page === 'services' && <ServicesPage user={user} navigate={navigate} login={login} />}
          {page === 'contact' && <ContactPage />}
          {page === 'profile' && <ProfilePage user={user} orders={orders} navigate={navigate} logout={logout} onRename={handleRename} />}
        </main>

        {selectedProduct && <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} addToCart={handleAddToCart} />}

        <footer className="bg-[#1a1a1a] text-white/50 py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
              <div>
                <div className="text-2xl font-bold text-white mb-6 tracking-tighter">NEXUS<span className="text-green-500">PC</span></div>
                <p className="text-sm leading-relaxed mb-6">Cagayan de Oro's premier destination for high-performance computing. We specialize in custom gaming rigs, professional workstations, and expert hardware repair.</p>
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
                  <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"><ArrowRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
            <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-medium tracking-wider uppercase">
              <div>© 2025 NEXUS PC. ALL RIGHTS RESERVED.</div>
              <div className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />ALL SYSTEMS OPERATIONAL</div>
            </div>
          </div>
        </footer>

        {/* Cart Sidebar — independent component */}
        <CartSidebar
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          products={products}
          user={user}
          savedDeliveryAddress={savedDeliveryAddress}
          onAddressSaved={setSavedDeliveryAddress}
          onUpdateQty={handleUpdateQty}
          onRemoveFromCart={removeFromCart}
          onClearCart={clearCart}
          onLogin={login}
          onCheckoutDone={handleCheckoutDone}
          showToast={showToast}
          onNavigate={navigate}
        />

        {/* Payment Modal — independent component */}
        <PaymentModal
          payment={paymentInfo}
          cartSnapshot={cartSnapshot}
          onClose={() => setPaymentInfo(null)}
          onOpenCart={() => setIsCartOpen(true)}
          onClearCart={clearCart}
          showToast={showToast}
        />

        {/* Toast Notifications */}
        <div className="fixed bottom-8 right-8 z-[600] flex flex-col gap-3">
          <AnimatePresence>
            {toasts.map(toast => (
              <motion.div key={toast.id}
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className={`px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px] border-l-4 bg-white ${toast.type === 'success' ? 'border-green-500' : 'border-red-500'}`}>
                {toast.type === 'success' ? <CheckCircle2 className="text-green-500 shrink-0" /> : <AlertTriangle className="text-red-500 shrink-0" />}
                <div className="text-sm font-medium text-gray-900">{toast.msg}</div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

      </div>
    </ErrorBoundary>
  );
}
