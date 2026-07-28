import React, { useState, useRef, useEffect } from 'react';
import { CloudRain, Wind, Droplets, Sun, Cloud, CloudLightning, CloudSnow } from 'lucide-react';
import { tokens } from '../../theme/tokens';

// Simulated data for the next 6 days
const forecastData = [
  { day: 'Mañana', tempMin: 12, tempMax: 18, icon: <CloudRain size={16} color="#3ACDFF" /> },
  { day: 'Miércoles', tempMin: 10, tempMax: 20, icon: <Sun size={16} color="#FCD34D" /> },
  { day: 'Jueves', tempMin: 14, tempMax: 22, icon: <Cloud size={16} color="rgba(255,255,255,0.8)" /> },
  { day: 'Viernes', tempMin: 13, tempMax: 19, icon: <CloudRain size={16} color="#3ACDFF" /> },
  { day: 'Sábado', tempMin: 8, tempMax: 15, icon: <CloudLightning size={16} color="#FCD34D" /> },
  { day: 'Domingo', tempMin: 5, tempMax: 12, icon: <CloudSnow size={16} color="#E2E8F0" /> },
];

export const WeatherWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative' }} ref={popoverRef}>
      {/* Pill Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="premium-card-hover"
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          background: isOpen ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)', 
          padding: '6px 12px', 
          borderRadius: '100px', 
          backdropFilter: 'blur(8px)', 
          border: '1px solid rgba(255,255,255,0.05)',
          cursor: 'pointer',
          color: 'white',
          outline: 'none',
          transition: 'all 0.2s ease'
        }}
      >
        <CloudRain size={14} color="#3ACDFF" />
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>Lluvia ligera, 14°C</span>
      </button>

      {/* Popover Panel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 12px)',
          left: 0,
          width: '280px',
          background: 'rgba(12, 17, 24, 0.6)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          zIndex: 100,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {/* Current Details */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>14°C</h4>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>Los Ángeles, Chile</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                <Wind size={12} color="rgba(255,255,255,0.5)" />
                12 km/h
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                <Droplets size={12} color="rgba(255,255,255,0.5)" />
                87% Humedad
              </div>
            </div>
          </div>

          {/* 6-Day Forecast */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h5 style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Próximos 6 días</h5>
            
            {forecastData.map((day, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', minWidth: '70px' }}>{day.day}</span>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  {day.icon}
                </div>
                <div style={{ display: 'flex', gap: '12px', minWidth: '60px', justifyContent: 'flex-end', fontSize: '13px', fontFamily: 'monospace' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>{day.tempMin}°</span>
                  <span style={{ color: '#fff' }}>{day.tempMax}°</span>
                </div>
              </div>
            ))}
          </div>

          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-8px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};
