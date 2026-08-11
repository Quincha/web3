import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { DataSyncService } from '../services/DataSyncService';

export interface ShoppingProduct {
  id: string;
  url: string;
  name: string;
  imageUrl: string;
  priceBase: number;
  shippingCost: number;
  storeName: string;
  timestamp: string;
}

interface ShoppingContextType {
  products: ShoppingProduct[];
  addProduct: (url: string, name: string, imageUrl: string, priceBase: number, storeName: string) => void;
  addProductRow: (name?: string) => void;
  updateProduct: (id: string, updates: Partial<ShoppingProduct>) => void;
  sortProducts: (order: 'asc' | 'desc') => void;
  deleteProduct: (id: string) => void;
  clearProducts: () => void;
}

const ShoppingContext = createContext<ShoppingContextType | undefined>(undefined);

const CACHE_KEY = 'quincha_shopping_products_v2';

function loadFromCache(): ShoppingProduct[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  
  return [];
}

function saveToCache(products: ShoppingProduct[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(products));
  DataSyncService.markDirty('shopping');
}

export const ShoppingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<ShoppingProduct[]>(() => loadFromCache());

  // Restaura datos bajados del servidor (pull) al cambiar de equipo.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { data?: { products?: ShoppingProduct[] } } | undefined;
      const data = detail?.data;
      if (!data || !Array.isArray(data.products)) return;
      setProducts(data.products);
      saveToCache(data.products);
    };
    window.addEventListener('quincha-restore:shopping', handler);
    return () => window.removeEventListener('quincha-restore:shopping', handler);
  }, []);

  const addProduct = useCallback((url: string, name: string, imageUrl: string, priceBase: number, storeName: string) => {
    const newProduct: ShoppingProduct = {
      id: `shop_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      url,
      name,
      imageUrl,
      priceBase,
      shippingCost: 0,
      storeName,
      timestamp: new Date().toISOString()
    };
    setProducts(prev => {
      const updated = [newProduct, ...prev];
      saveToCache(updated);
      return updated;
    });
  }, []);

  const addProductRow = useCallback((name?: string) => {
    const newProduct: ShoppingProduct = {
      id: `shop_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      url: '',
      name: name || '',
      imageUrl: '',
      priceBase: 0,
      shippingCost: 0,
      storeName: '',
      timestamp: new Date().toISOString()
    };
    setProducts(prev => {
      const updated = [...prev, newProduct];
      saveToCache(updated);
      return updated;
    });
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<ShoppingProduct>) => {
    setProducts(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      saveToCache(updated);
      return updated;
    });
  }, []);

  const sortProducts = useCallback((order: 'asc' | 'desc') => {
    setProducts(prev => {
      const sorted = [...prev].sort((a, b) => {
        const nameA = (a.name || '').toLowerCase().trim();
        const nameB = (b.name || '').toLowerCase().trim();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        const totalA = a.priceBase + a.shippingCost;
        const totalB = b.priceBase + b.shippingCost;
        return order === 'asc' ? totalA - totalB : totalB - totalA;
      });
      saveToCache(sorted);
      return sorted;
    });
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => {
      const updated = prev.filter(p => p.id !== id);
      saveToCache(updated);
      return updated;
    });
  }, []);

  const clearProducts = useCallback(() => {
    setProducts([]);
    saveToCache([]);
  }, []);

  return (
    <ShoppingContext.Provider value={{
      products, addProduct, addProductRow, updateProduct, sortProducts, deleteProduct, clearProducts
    }}>
      {children}
    </ShoppingContext.Provider>
  );
};

export const useShopping = () => {
  const ctx = useContext(ShoppingContext);
  if (!ctx) throw new Error('useShopping must be used within a ShoppingProvider');
  return ctx;
};
