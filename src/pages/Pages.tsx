import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, ChevronRight, Star, Cpu, Monitor, HardDrive, Zap,
  CheckCircle2, AlertTriangle, Phone, Mail, MapPin,
  ShoppingCart, X, User as UserIcon
} from 'lucide-react';
import { User } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { CATEGORIES, Product } from '../data/products';
import { db } from '../firebase';
import { BuildState } from '../types';
import { ProductCard } from '../components/ProductCard';
import PCVisualizer from '../components/builder/PCVisualizer';

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
      {/* Header row — title + price filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <h2 className="text-3xl font-bold tracking-tighter">
          {selectedCategory === 'all' ? 'All Products' : CATEGORIES.find(c => c.id === selectedCategory)?.label}
          <span className="text-gray-300 text-sm font-medium ml-4 uppercase tracking-widest">({filteredProducts.length} items)</span>
        </h2>
        <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 shrink-0">Price</span>
          <input
            type="range"
            min="0"
            max="150000"
            step="1000"
            value={priceRange}
            onChange={(e) => setPriceRange(parseInt(e.target.value))}
            className="w-32 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
          />
          <span className="text-xs font-bold text-green-600 shrink-0 w-20 text-right">₱{priceRange.toLocaleString()}</span>
          {priceRange < 150000 && (
            <button onClick={() => setPriceRange(150000)} className="text-[10px] text-gray-400 hover:text-red-500 font-bold uppercase tracking-widest shrink-0">Reset</button>
          )}
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="py-32 text-center text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="font-medium">No products match your filters</p>
          <button onClick={() => { setSelectedCategory('all'); setPriceRange(150000); }} className="text-green-600 font-bold mt-2 hover:underline">Clear Filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((p: Product) => (
            <ProductCard key={p.id} product={p} addToCart={addToCart} onView={onView} />
          ))}
        </div>
      )}
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
  );
}

function ServicesPage({ user, navigate, login }: { user: any, navigate: (p: string) => void, login: () => void }) {
  const [bookingService, setBookingService] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    notes: '',
  });

  const services = [
    { title: 'Custom PC Building', price: '₱1,500', desc: 'Professional assembly with premium cable management, BIOS configuration, and stress testing.', icon: '🖥️' },
    { title: 'Repair & Diagnosis', price: '₱500', desc: 'Comprehensive hardware diagnostics and repair for all PC issues.', icon: '🔧' },
    { title: 'Hardware Upgrade', price: '₱300', desc: 'Expert installation of RAM, SSDs, GPUs, and other components.', icon: '⬆️' },
    { title: 'Free Consultation', price: 'FREE', desc: '30-minute expert advice session for your next build or upgrade.', icon: '💬' },
  ];

  const openBooking = (serviceTitle: string) => {
    if (!user) { login(); return; }
    setForm({
      name: user.displayName || '',
      email: user.email || '',
      phone: '',
      date: '',
      time: '',
      notes: '',
    });
    setSubmitted(false);
    setBookingService(serviceTitle);
  };

  const [bookingError, setBookingError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { login(); return; }
    setSubmitting(true);
    setBookingError(null);
    try {
      await addDoc(collection(db, 'bookings'), {
        uid: user.uid,
        customer: form.name,
        email: form.email,
        phone: form.phone,
        services: bookingService,
        date: form.date,
        time: form.time,
        notes: form.notes || '',
        status: 'Pending',
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error('Booking failed:', err);
      setBookingError(err?.message || 'Failed to submit booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Min date = tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div className="max-w-7xl mx-auto px-4 pt-12">
      <div className="text-center max-w-2xl mx-auto mb-20">
        <h2 className="text-5xl font-bold tracking-tighter mb-6">Professional <span className="text-green-600">PC Services</span></h2>
        <p className="text-gray-500">Expert hardware solutions by certified technicians. Fast turnaround, quality guaranteed.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {services.map((s, i) => (
          <div key={i} className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm flex gap-6 group hover:shadow-md transition-all">
            <div className="text-4xl shrink-0">{s.icon}</div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-bold tracking-tight">{s.title}</h3>
                <span className="text-green-600 font-bold text-sm">{s.price}</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">{s.desc}</p>
              <button
                onClick={() => openBooking(s.title)}
                className="bg-green-600 text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-xl hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-600/20 flex items-center gap-2"
              >
                Book Now <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {bookingService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setBookingService(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-[#1a1a1a] px-8 py-6 flex items-center justify-between">
                <div>
                  <p className="text-green-500 text-[10px] font-bold uppercase tracking-widest mb-1">Book a Service</p>
                  <h3 className="text-white font-black text-lg tracking-tight">{bookingService}</h3>
                </div>
                <button onClick={() => setBookingService(null)} className="text-white/40 hover:text-white transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8">
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-6"
                  >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="text-xl font-black tracking-tight mb-2">Booking Submitted!</h4>
                    <p className="text-gray-400 text-sm leading-relaxed mb-6">
                      We've received your booking for <strong>{bookingService}</strong>. Our team will confirm your appointment shortly.
                    </p>
                    <button
                      onClick={() => setBookingService(null)}
                      className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-green-700 transition-all"
                    >
                      Done
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Full Name</label>
                        <input
                          required
                          type="text"
                          value={form.name}
                          onChange={e => setForm({ ...form, name: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Phone</label>
                        <input
                          required
                          type="tel"
                          placeholder="+63 9XX XXX XXXX"
                          value={form.phone}
                          onChange={e => setForm({ ...form, phone: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Email</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Preferred Date</label>
                        <input
                          required
                          type="date"
                          min={minDateStr}
                          value={form.date}
                          onChange={e => setForm({ ...form, date: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Preferred Time</label>
                        <select
                          required
                          value={form.time}
                          onChange={e => setForm({ ...form, time: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all"
                        >
                          <option value="">— Select —</option>
                          <option>9:00 AM</option>
                          <option>10:00 AM</option>
                          <option>11:00 AM</option>
                          <option>1:00 PM</option>
                          <option>2:00 PM</option>
                          <option>3:00 PM</option>
                          <option>4:00 PM</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Notes <span className="text-gray-300 normal-case font-normal">(optional)</span></label>
                      <textarea
                        rows={3}
                        placeholder="Describe your issue or any special requests..."
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-all resize-none"
                      />
                    </div>

                    {bookingError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-4 py-3 rounded-xl flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {bookingError}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-green-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 active:scale-[0.98]"
                    >
                      {submitting ? 'Submitting...' : 'Confirm Booking'}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [confirmAction, setConfirmAction] = useState<{ orderId: string; type: 'cancel' | 'refund' | 'reject' | 'received' } | null>(null);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-bold mb-4">Please login to view your profile</h2>
        <button onClick={() => navigate('home')} className="text-green-600 font-bold hover:underline">Go Back Home</button>
      </div>
    );
  }

  const fmt = (n: number) => '₱' + n.toLocaleString();

  const handleOrderAction = async (orderId: string, type: 'cancel' | 'refund' | 'reject' | 'received') => {
    setActionLoading(orderId + type);
    const statusMap = { cancel: 'Cancelled', refund: 'Refund Requested', reject: 'Return & Rejected', received: 'Completed' };
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
    'Awaiting Payment': 'bg-purple-100 text-purple-600',
    'Payment Submitted': 'bg-indigo-100 text-indigo-600',
    Delivered: 'bg-green-100 text-green-600',
    Completed: 'bg-emerald-100 text-emerald-700',
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
      case 'Awaiting Payment':
        return (
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg">
              💳 Complete Your Payment
            </span>
            <button
              onClick={() => setConfirmAction({ orderId: order.id, type: 'cancel' })}
              className="text-[10px] font-bold uppercase tracking-widest text-red-500 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-all"
            >
              Cancel Order
            </button>
          </div>
        );
      case 'Payment Submitted':
        return (
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
            🔍 Verifying Payment
          </span>
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
      case 'Delivered':
        return (
          <button
            onClick={() => setConfirmAction({ orderId: order.id, type: 'received' })}
            className="text-[10px] font-bold uppercase tracking-widest text-green-600 border border-green-300 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
          >
            ✅ Order Received
          </button>
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
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5 ${
                confirmAction.type === 'cancel' ? 'bg-red-100' :
                confirmAction.type === 'refund' ? 'bg-orange-100' :
                confirmAction.type === 'received' ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {confirmAction.type === 'received'
                  ? <CheckCircle2 className="w-7 h-7 text-green-600" />
                  : <X className={`w-7 h-7 ${confirmAction.type === 'cancel' ? 'text-red-500' : confirmAction.type === 'refund' ? 'text-orange-500' : 'text-gray-500'}`} />
                }
              </div>
              <h3 className="text-lg font-black text-center tracking-tight mb-2">
                {confirmAction.type === 'cancel' && 'Cancel this order?'}
                {confirmAction.type === 'refund' && 'Request a refund?'}
                {confirmAction.type === 'reject' && 'Reject delivery?'}
                {confirmAction.type === 'received' && 'Confirm order received?'}
              </h3>
              <p className="text-sm text-gray-400 text-center mb-7 leading-relaxed">
                {confirmAction.type === 'cancel' && 'This will cancel your order. This action cannot be undone.'}
                {confirmAction.type === 'refund' && "A refund request will be sent to our team for review. We'll get back to you within 1–3 business days."}
                {confirmAction.type === 'reject' && "You're refusing delivery of this shipment. Our team will process your return and contact you shortly."}
                {confirmAction.type === 'received' && "Confirming that you've received your order in good condition. Thank you for shopping with NEXUS PC!"}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all">
                  Go Back
                </button>
                <button
                  disabled={!!actionLoading}
                  onClick={() => handleOrderAction(confirmAction.orderId, confirmAction.type)}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 ${
                    confirmAction.type === 'cancel' ? 'bg-red-500 hover:bg-red-600' :
                    confirmAction.type === 'refund' ? 'bg-orange-500 hover:bg-orange-600' :
                    confirmAction.type === 'received' ? 'bg-green-600 hover:bg-green-700' :
                    'bg-gray-700 hover:bg-gray-800'
                  }`}
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
                            {order.status === 'Awaiting Payment' && (
                              <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-700 leading-relaxed">
                                <strong>Payment required.</strong> Please complete your GCash or Bank Transfer payment to proceed with your order.
                              </div>
                            )}
                            {order.status === 'Payment Submitted' && (
                              <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-700 leading-relaxed">
                                <strong>Payment under review.</strong> We received your proof of payment and will verify it within 24 hours.
                              </div>
                            )}
                            {order.status === 'Shipped' && (
                              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-600 leading-relaxed">
                                <strong>Your order is on the way.</strong> You may request a refund or reject the delivery if needed.
                              </div>
                            )}
                            {order.status === 'Delivered' && (
                              <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-600 leading-relaxed">
                                <strong>Order delivered.</strong> Please click "Order Received" above to confirm you received it in good condition.
                              </div>
                            )}
                            {order.status === 'Completed' && (
                              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 leading-relaxed">
                                <strong>✅ Order completed.</strong> Thank you for shopping with NEXUS PC!
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



export { HomePage, ShopPage, BuilderPage, ServicesPage, ContactPage, ProfilePage };
