import React, { useState } from 'react';
import { useShopping } from '../../context/ShoppingContext';
import type { ShoppingProduct } from '../../context/ShoppingContext';
import { Plus, Trash2, ExternalLink, ArrowUpDown, Trash, Sparkles } from 'lucide-react';

export const ShoppingModule: React.FC = () => {
  const { products, addProductRow, updateProduct, sortProducts, deleteProduct, clearProducts } = useShopping();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleUrlChange = (id: string, url: string) => {
    let updates: Partial<ShoppingProduct> = { url };
    try {
      const urlLower = url.toLowerCase().trim();
      if (urlLower.includes('.') || urlLower.startsWith('http://') || urlLower.startsWith('https://')) {
        const fullUrl = (urlLower.startsWith('http://') || urlLower.startsWith('https://')) ? urlLower : `https://${urlLower}`;
        const urlObj = new URL(fullUrl);
        const host = urlObj.hostname;
        let store = '';
        if (host.includes('amazon')) store = 'Amazon';
        else if (host.includes('mercadolibre')) store = 'MercadoLibre';
        else if (host.includes('aliexpress')) store = 'AliExpress';
        else {
          const domain = host.replace('www.', '').split('.')[0];
          if (domain) {
            store = domain.charAt(0).toUpperCase() + domain.slice(1);
          }
        }
        if (store) {
          updates.storeName = store;
        }
      }
    } catch {}
    updateProduct(id, updates);
  };

  // Group and sort logic
  // Group counts (to identify groups with 2 or more items)
  const groupCounts: Record<string, number> = {};
  products.forEach(p => {
    const key = (p.name || '').toLowerCase().trim();
    if (key) {
      groupCounts[key] = (groupCounts[key] || 0) + 1;
    }
  });

  // Find the cheapest product ID in each group (only if group has >= 2 items)
  const bestPriceMap: Record<string, string> = {};
  products.forEach(p => {
    const key = (p.name || '').toLowerCase().trim();
    if (!key || groupCounts[key] < 2) return;

    const total = p.priceBase + p.shippingCost;
    const bestId = bestPriceMap[key];
    if (!bestId) {
      bestPriceMap[key] = p.id;
    } else {
      const currentBest = products.find(prod => prod.id === bestId);
      if (currentBest) {
        const currentBestTotal = currentBest.priceBase + currentBest.shippingCost;
        if (total < currentBestTotal) {
          bestPriceMap[key] = p.id;
        }
      }
    }
  });

  const handleToggleSort = () => {
    const nextOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(nextOrder);
    sortProducts(nextOrder);
  };

  return (
    <div className="bujo-module-container" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>Evaluador de Compras</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            Planilla interactiva de comparación. Escribe los nombres, enlaces y precios directamente en la tabla.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            className="bujo-action-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            onClick={handleToggleSort}
            title="Cambiar orden de precio en coincidencias"
          >
            <ArrowUpDown size={16} />
            <span>Coincidencias: {sortOrder === 'asc' ? 'Menor a Mayor' : 'Mayor a Menor'}</span>
          </button>
          
          <button 
            className="action-green-btn" 
            style={{ 
              background: 'var(--accent-green)', 
              color: '#000', 
              border: 'none', 
              borderRadius: '10px', 
              padding: '10px 16px', 
              fontWeight: 600, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem'
            }}
            onClick={addProductRow}
          >
            <Plus size={16} />
            <span>Agregar Fila</span>
          </button>

          {products.length > 0 && (
            <button 
              className="bujo-action-btn" 
              style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              onClick={clearProducts}
            >
              <Trash2 size={16} /> Limpiar todo
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="dashboard-card" style={{ padding: '0', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 600 }}>Planilla vacía</span>
            <span style={{ fontSize: '0.85rem', maxWidth: '300px' }}>Haz clic en "+ Agregar Fila" para crear celdas y empezar a comparar.</span>
            <button className="action-green-btn" style={{ background: 'var(--accent-green)', color: '#000', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: '8px' }} onClick={() => addProductRow()}>
              Agregar Fila Inicial
            </button>
          </div>
        ) : (
          <>
            {Object.entries(
              products.reduce((acc, p) => {
                const key = (p.name || '').trim() || 'Sin nombre';
                if (!acc[key]) acc[key] = [];
                acc[key].push(p);
                return acc;
              }, {} as Record<string, typeof products[0][]>)
            ).map(([groupName, groupProducts]) => (
              <div key={groupName} className="dashboard-card" style={{ marginBottom: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#fff' }}>{groupName}</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: '#fff', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '14px 16px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', width: '25%' }}>Producto / Nombre</th>
                      <th style={{ padding: '14px 16px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', width: '15%' }}>Tienda / Origen</th>
                      <th style={{ padding: '14px 16px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', width: '25%' }}>Enlace (URL)</th>
                      <th style={{ padding: '14px 16px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', width: '12%', textAlign: 'right' }}>Precio Base ($)</th>
                      <th style={{ padding: '14px 16px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', width: '12%', textAlign: 'right' }}>Envío ($)</th>
                      <th style={{ padding: '14px 16px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', width: '12%', textAlign: 'right' }}>Total ($)</th>
                      <th style={{ padding: '14px 16px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', width: '6%', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupProducts.map((p) => {
                      const total = p.priceBase + p.shippingCost;
                      const groupKey = p.name.toLowerCase().trim();
                      const isBestInGroup = groupKey && bestPriceMap[groupKey] === p.id;
                      return (
                        <tr key={p.id} style={{
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          background: isBestInGroup ? 'rgba(0, 230, 118, 0.03)' : 'transparent',
                          transition: 'background 0.2s',
                        }}>
                          <td style={{ padding: '10px 16px' }}>
                            <input type="text" value={p.name} placeholder="ej: MacBook Air M1" onChange={e => updateProduct(p.id, { name: e.target.value })} style={cellInputStyle} />
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <input type="text" value={p.storeName} placeholder="ej: Amazon" onChange={e => updateProduct(p.id, { storeName: e.target.value })} style={cellInputStyle} />
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input type="text" value={p.url} placeholder="Pegar enlace..." onChange={e => handleUrlChange(p.id, e.target.value)} style={{ ...cellInputStyle, flex: 1 }} />
                              {p.url && (
                                <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center' }} title="Abrir enlace en pestaña nueva">
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            <input type="number" min="0" value={p.priceBase === 0 ? '' : p.priceBase} placeholder="0" onChange={e => updateProduct(p.id, { priceBase: Number(e.target.value) })} style={{ ...cellInputStyle, textAlign: 'right' }} />
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            <input type="number" min="0" value={p.shippingCost === 0 ? '' : p.shippingCost} placeholder="0" onChange={e => updateProduct(p.id, { shippingCost: Number(e.target.value) })} style={{ ...cellInputStyle, textAlign: 'right' }} />
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 700 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                              {isBestInGroup && (
                                <span style={{
                                  fontSize: '0.65rem',
                                  color: '#00E676',
                                  background: 'rgba(0, 230, 118, 0.1)',
                                  border: '1px solid rgba(0, 230, 118, 0.2)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}>
                                  <Sparkles size={8} /> Mejor
                                </span>
                              )}
                              <span style={{ color: isBestInGroup ? '#00E676' : '#fff' }}>${total.toLocaleString('es-CL')}</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <button className="bujo-action-btn" style={{ color: 'var(--accent-green)', padding: '4px' }} onClick={() => addProductRow(p.name)} title="Duplicar nombre en nueva opción">
                                <Plus size={14} />
                              </button>
                              <button className="bujo-action-btn" style={{ color: '#EF4444', padding: '4px' }} onClick={() => deleteProduct(p.id)} title="Eliminar fila">
                                <Trash size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

const cellInputStyle: React.CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: '#fff',
  fontSize: '0.85rem',
  padding: '6px 8px',
  borderRadius: '4px',
  transition: 'background 0.15s',
};
