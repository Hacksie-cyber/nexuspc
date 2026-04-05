import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { CartItem } from '../types';
import { Product } from '../data/products';

export function useCart(user: User | null) {
  const [cart, setCart] = useState<CartItem[]>([]);

  // One-time migration: remove the old shared key
  useEffect(() => { localStorage.removeItem('nexus_cart'); }, []);

  // Load cart keyed by uid — re-runs on login/logout so carts never bleed across accounts
  useEffect(() => {
    const key = user ? `nexus_cart_${user.uid}` : null;
    if (!key) { setCart([]); return; }
    const saved = localStorage.getItem(key);
    if (saved) {
      try { setCart(JSON.parse(saved)); } catch { setCart([]); }
    } else {
      setCart([]);
    }
  }, [user]);

  // Persist cart changes
  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`nexus_cart_${user.uid}`, JSON.stringify(cart));
  }, [cart, user]);

  const cartCount = cart.reduce((acc, item) => acc + item.qty, 0);

  const addToCart = (
    product: Product,
    showToast: (msg: string, type?: 'success' | 'error') => void,
  ) => {
    if (product.stock <= 0) {
      showToast(`"${product.name}" is out of stock.`, 'error');
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) {
          showToast(
            `Only ${product.stock} unit${product.stock > 1 ? 's' : ''} of "${product.name}" available.`,
            'error',
          );
          return prev;
        }
        return prev.map(item =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (id: number) =>
    setCart(prev => prev.filter(item => item.id !== id));

  const updateQty = (
    id: number,
    delta: number,
    showToast: (msg: string, type?: 'success' | 'error') => void,
  ) => {
    setCart(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const newQty = Math.max(1, item.qty + delta);
        if (newQty > item.stock) {
          showToast(
            `Only ${item.stock} unit${item.stock > 1 ? 's' : ''} of "${item.name}" available.`,
            'error',
          );
          return { ...item, qty: item.stock };
        }
        return { ...item, qty: newQty };
      }),
    );
  };

  const clearCart = () => setCart([]);

  return { cart, setCart, cartCount, addToCart, removeFromCart, updateQty, clearCart };
}
