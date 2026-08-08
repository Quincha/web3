import React from 'react';
import { Card } from '../../ui/Card';
import { Upload, ScanLine, FileText } from 'lucide-react';

interface MockReceipt {
  id: string;
  thumbnailUrl: string;
  amount: number;
  date: string;
  category: string;
  status: 'Pendiente OCR' | 'Procesado' | 'Con errores';
}

const mockReceipts: MockReceipt[] = [];

export const ReceiptsGallery: React.FC = () => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="finance-view-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 4px 0' }}>Comprobantes (OCR Inteligente)</h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '14px' }}>
            Sube fotos de boletas o facturas. La IA extraerá los datos automáticamente.
          </p>
        </div>
        <button className="primary-btn">
          <Upload size={16} /> Subir Comprobante
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '20px',
        alignItems: 'start'
      }}>
        {mockReceipts.map(receipt => (
          <Card key={receipt.id} padding="none" style={{ overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s ease', position: 'relative' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
            
            {/* Thumbnail */}
            <div style={{ width: '100%', height: '180px', position: 'relative' }}>
              <img 
                src={receipt.thumbnailUrl} 
                alt="Comprobante" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ 
                position: 'absolute', 
                top: 0, left: 0, right: 0, bottom: 0, 
                background: 'linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.8) 100%)' 
              }} />
              <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: '18px' }}>
                  {receipt.amount > 0 ? formatCurrency(receipt.amount) : '---'}
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  {receipt.date}
                </span>
              </div>
            </div>

            {/* Info and Status */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  <FileText size={14} /> {receipt.category}
                </span>
              </div>

              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                fontSize: '12px', 
                fontWeight: 500,
                color: receipt.status === 'Procesado' ? 'var(--accent-green)' : 
                       receipt.status === 'Pendiente OCR' ? '#eab308' : 'var(--accent-red)'
              }}>
                <ScanLine size={14} />
                {receipt.status}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
