import React, { useState } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Save } from 'lucide-react';
import { useFinance } from '../../../context/FinanceContext';
import type { TransactionType } from '../../../types/finance';
import { tokens } from '../../../theme/tokens';

interface TransactionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
}

export const TransactionSidebar: React.FC<TransactionSidebarProps> = ({ isOpen, onClose, defaultType = 'ingreso' }) => {
  const { addMovimiento } = useFinance();
  
  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Update internal type if defaultType changes when opening
  React.useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setAmount('');
      setDescription('');
      setCategory('');
      setDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, defaultType]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    addMovimiento({
      type,
      amount: parseFloat(amount),
      description,
      categoryId: category,
      date,
      status: 'Pagada',
      tags: [],
      attachments: [],
      reconciliationStatus: 'No Registrado',
      accountId: 'default_account' // For simplicity in this demo
    } as any);

    onClose();
  };

  const isIncome = type === 'ingreso';

  return (
    <>
      {/* Overlay */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
          animation: 'fadeIn 0.2s ease'
        }}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '400px',
          background: 'linear-gradient(145deg, rgba(16, 42, 45, 0.95) 0%, rgba(6, 8, 11, 0.98) 100%)',
          borderLeft: `1px solid ${tokens.colors.accent.green}40`,
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          zIndex: 1000,
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', margin: 0 }}>
            Registrar Transacción
          </h2>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Type Toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', padding: '4px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>
          <button
            onClick={() => setType('ingreso')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: isIncome ? 'rgba(0, 208, 132, 0.15)' : 'transparent',
              color: isIncome ? tokens.colors.accent.green : 'rgba(255,255,255,0.5)',
              fontWeight: isIncome ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <ArrowUpRight size={16} /> Ingreso
          </button>
          <button
            onClick={() => setType('gasto')}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              background: !isIncome ? 'rgba(248, 113, 113, 0.15)' : 'transparent',
              color: !isIncome ? tokens.colors.accent.danger : 'rgba(255,255,255,0.5)',
              fontWeight: !isIncome ? 600 : 400,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <ArrowDownRight size={16} /> Gasto
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Monto</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: '18px' }}>$</span>
              <input 
                type="number" 
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                required
                style={{ 
                  width: '100%', 
                  background: 'rgba(0,0,0,0.2)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '12px',
                  padding: '12px 16px 12px 40px',
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 600,
                  outline: 'none',
                  boxSizing: 'border-box'
                }} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Descripción</label>
            <input 
              type="text" 
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Venta de producto, Pago de servidor..."
              required
              style={{ 
                width: '100%', 
                background: 'rgba(0,0,0,0.2)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '12px',
                padding: '12px 16px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }} 
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Fecha</label>
              <input 
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                style={{ 
                  width: '100%', 
                  background: 'rgba(0,0,0,0.2)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }} 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Categoría (Opcional)</label>
              <select 
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ 
                  width: '100%', 
                  background: 'rgba(0,0,0,0.2)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: 'white',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  appearance: 'none'
                }} 
              >
                <option value="" disabled>Seleccionar...</option>
                <option value="ventas">Ventas</option>
                <option value="servicios">Servicios</option>
                <option value="operaciones">Operaciones</option>
                <option value="marketing">Marketing</option>
                <option value="software">Software</option>
                <option value="otros">Otros</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
            <button 
              type="submit"
              style={{
                width: '100%',
                background: isIncome ? tokens.colors.accent.green : tokens.colors.accent.danger,
                color: isIncome ? '#000' : '#fff',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
                boxShadow: isIncome ? '0 4px 20px rgba(0, 208, 132, 0.3)' : '0 4px 20px rgba(248, 113, 113, 0.3)'
              }}
            >
              <Save size={18} />
              Guardar Transacción
            </button>
          </div>
        </form>

        <style>
          {`
            @keyframes slideInRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}
        </style>
      </div>
    </>
  );
};
