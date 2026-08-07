import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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

const CACHE_KEY = 'quincha_shopping_products';

function loadFromCache(): ShoppingProduct[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  
  return [
    {
      id: 'shop_1',
      url: 'https://www.amazon.com/dp/B08N5WRWNW',
      name: 'MacBook Air M1 13"',
      imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&h=200&q=80',
      priceBase: 699,
      shippingCost: 45,
      storeName: 'Amazon',
      timestamp: new Date().toISOString()
    },
    {
      id: 'shop_2',
      url: 'https://articulo.mercadolibre.cl/MLC-macbook-air-m1',
      name: 'MacBook Air M1 13"',
      imageUrl: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?auto=format&fit=crop&w=300&h=200&q=80',
      priceBase: 720,
      shippingCost: 15,
      storeName: 'MercadoLibre',
      timestamp: new Date().toISOString()
    }
  ];
}

function saveToCache(products: ShoppingProduct[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(products));
}

export const ShoppingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<ShoppingProduct[]>(() => loadFromCache());

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
