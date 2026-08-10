import React, { useState } from 'react';
import { X, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Save } from 'lucide-react';
import { useFinance, FINANCE_CATEGORIES } from '../../../context/FinanceContext';
import type { TransactionType, Movimiento } from '../../../types/finance';
import { tokens } from '../../../theme/tokens';

interface TransactionSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: TransactionType;
  movimientoToEdit?: Movimiento | null;
}

export const TransactionSidebar: React.FC<TransactionSidebarProps> = ({ isOpen, onClose, defaultType = 'ingreso', movimientoToEdit }) => {
  const { addMovimiento, updateMovimiento } = useFinance();

  const [type, setType] = useState<TransactionType>(defaultType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferTo, setTransferTo] = useState('');
  const [error, setError] = useState('');

  const categoriesVisible = FINANCE_CATEGORIES.filter(c => c.type === 'ambos' || c.type === type);

  // Update internal type if defaultType changes when opening
  React.useEffect(() => {
    if (isOpen) {
      setType(movimientoToEdit?.type ?? defaultType);
      setAmount(movimientoToEdit ? String(movimientoToEdit.amount) : '');
      setDescription(movimientoToEdit?.description ?? '');
      setCategory(movimientoToEdit?.targetAccountId ?? movimientoToEdit?.categoryId ?? '');
      setDate(movimientoToEdit?.date ?? new Date().toISOString().split('T')[0]);
      setTransferTo(movimientoToEdit?.type === 'transferencia' ? 'default_account' : '');
      setError('');
    }
  }, [isOpen, defaultType, movimientoToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      setError('Ingresa un monto mayor a 0.');
      return;
    }
    if (!description) {
      setError('Agrega una descripción.');
      return;
    }
    if (type === 'transferencia' && transferTo === category) {
      setError('Selecciona una cuenta destino distinta de la cuenta actual.');
      return;
    }

    const payload: Omit<Movimiento, 'id'> = {
      type,
      amount: parsed,
      description,
      date,
      status: 'Pagada' as const,
      reconciliationStatus: 'No Registrado' as const,
      tags: [],
      attachments: [],
      accountId: 'default_account',
      targetAccountId: type === 'transferencia' ? category || undefined : undefined,
      categoryId: type === 'transferencia' ? undefined : category || undefined,
    };

    if (movimientoToEdit) {
      updateMovimiento(movimientoToEdit.id, payload);
    } else {
      addMovimiento(payload);
    }

    onClose();
  };

  const isIncome = type === 'ingreso';
  const isTransfer = type === 'transferencia';

  const typeColor = isIncome ? tokens.colors.accent.green : isTransfer ? '#3ACDFF' : tokens.colors.accent.danger;

  const typeBtn = (active: boolean, color: string): React.CSSProperties => ({
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    border: 'none',
    background: active ? `${color}26` : 'transparent',
    color: active ? color : 'rgba(255,255,255,0.5)',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    fontSize: '13px',
  });

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
      {/* Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease'
        }}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '400px',
          maxWidth: '100%',
          background: 'linear-gradient(145deg, rgba(16, 42, 45, 0.95) 0%, rgba(6, 8, 11, 0.98) 100%)',
          borderLeft: `1px solid ${tokens.colors.accent.green}40`,
          boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'white', margin: 0 }}>
            {movimientoToEdit ? 'Editar Transacción' : 'Registrar Transacción'}
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
          <button type="button" onClick={() => setType('ingreso')} style={typeBtn(isIncome, tokens.colors.accent.green)}>
            <ArrowUpRight size={16} /> Ingreso
          </button>
          <button type="button" onClick={() => setType('gasto')} style={typeBtn(type === 'gasto', tokens.colors.accent.danger)}>
            <ArrowDownRight size={16} /> Gasto
          </button>
          <button type="button" onClick={() => setType('transferencia')} style={typeBtn(isTransfer, '#3ACDFF')}>
            <ArrowLeftRight size={16} /> Transf.
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
                onChange={e => { setAmount(e.target.value); setError(''); }}
                placeholder="0"
                required
                min="0"
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
            <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
              {isTransfer ? 'Descripción' : 'Descripción'}
            </label>
            <input
              type="text"
              value={description}
              onChange={e => { setDescription(e.target.value); setError(''); }}
              placeholder={isTransfer ? 'Ej: Transferencia entre cuentas' : 'Ej: Venta de producto, Pago de servidor...'}
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
              <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                {isTransfer ? 'Destino' : 'Categoría'}
              </label>
              <select
                value={category}
                onChange={e => { setCategory(e.target.value); setError(''); }}
                required={isTransfer}
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
                {isTransfer ? (
                  <option value="cuenta_objetivos">Cuenta Objetivos</option>
                ) : (
                  categoriesVisible.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          {isTransfer && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Cuenta de origen</label>
              <select
                value={transferTo}
                onChange={e => { setTransferTo(e.target.value); setError(''); }}
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
                <option value="cuenta_ahorros">Cuenta Principal</option>
                <option value="efectivo">Efectivo</option>
              </select>
            </div>
          )}

          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(248, 113, 113, 0.1)',
              border: `1px solid ${tokens.colors.accent.danger}40`,
              color: tokens.colors.accent.danger,
              fontSize: '13px'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
            <button
              type="submit"
              style={{
                width: '100%',
                background: typeColor,
                color: isTransfer ? '#000' : '#fff',
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
                boxShadow: `0 4px 20px ${typeColor}40`
              }}
            >
              <Save size={18} />
              {movimientoToEdit ? 'Guardar Cambios' : 'Guardar Transacción'}
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
    </div>
  );
};