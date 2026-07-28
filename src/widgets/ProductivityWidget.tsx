import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Clock } from 'lucide-react';
import { WidgetRegistry } from './WidgetRegistry';

const ProductivityWidget: React.FC = () => {
  const pathRef = useRef<SVGPathElement>(null);
  const pointsRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (pathRef.current) {
      const length = pathRef.current.getTotalLength();
      gsap.fromTo(pathRef.current,
        { strokeDasharray: length, strokeDashoffset: length },
        { strokeDashoffset: 0, duration: 1.5, ease: 'power2.out', delay: 0.2 }
      );
    }

    if (pointsRef.current) {
      gsap.fromTo(pointsRef.current.children,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'back.out(1.7)', delay: 0.8 }
      );
    }
  }, []);

  return (
    <div className="productivity-widget">
      <div className="widget-header-row">
        <h3>Productividad Semanal</h3>
        <select className="select-dropdown">
          <option>Esta semana</option>
          <option>Mes pasado</option>
        </select>
      </div>

      <div className="chart-container">
        {/* SVG Curved Line Chart */}
        <svg viewBox="0 0 500 200" className="productivity-svg">
          {/* Grid lines */}
          <line x1="0" y1="160" x2="500" y2="160" stroke="var(--border-color)" strokeWidth="1" />
          <line x1="0" y1="120" x2="500" y2="120" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="80" x2="500" y2="80" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="0" y1="40" x2="500" y2="40" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />

          {/* Smooth path */}
          <path
            ref={pathRef}
            d="M 30,140 Q 100,130 150,50 T 270,110 T 390,90 T 470,160"
            fill="none"
            stroke="var(--accent-green)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Data Points */}
          <g ref={pointsRef} className="chart-points">
            <circle cx="30" cy="140" r="5" fill="var(--accent-green)" />
            <circle cx="106" cy="122" r="5" fill="var(--accent-green)" />
            <circle cx="150" cy="50" r="5" fill="var(--accent-green)" />
            <circle cx="215" cy="116" r="5" fill="var(--accent-green)" />
            <circle cx="270" cy="110" r="5" fill="var(--accent-green)" />
            <circle cx="330" cy="98" r="5" fill="var(--accent-green)" />
            <circle cx="390" cy="90" r="5" fill="var(--accent-green)" />
            <circle cx="470" cy="160" r="5" fill="var(--accent-green)" />
          </g>

          {/* Active tooltip marker demo on Friday */}
          <g transform="translate(390, 90)">
            <rect x="-35" y="-55" width="70" height="40" rx="6" fill="var(--bg-secondary)" stroke="var(--border-color)" strokeWidth="1" />
            <text x="0" y="-39" fill="var(--text-primary)" fontSize="10" textAnchor="middle" fontWeight="bold">6.5h</text>
            <text x="0" y="-23" fill="var(--text-subtle)" fontSize="8" textAnchor="middle">Viernes</text>
            <circle cx="0" cy="0" r="8" fill="var(--accent-green)" opacity="0.3" />
            <circle cx="0" cy="0" r="4" fill="var(--accent-green)" />
          </g>
        </svg>

        {/* X Axis Labels */}
        <div className="chart-x-labels">
          <span>Lun</span>
          <span>Mar</span>
          <span>Mié</span>
          <span>Jue</span>
          <span>Vie</span>
          <span>Sáb</span>
          <span>Dom</span>
        </div>
      </div>

      <div className="productivity-footer">
        <div className="footer-metric">
          <Clock size={16} />
          <div>
            <span className="metric-label">Tiempo enfocado</span>
            <span className="metric-value">32h 15m</span>
          </div>
        </div>
        <div className="footer-metric">
          <Clock size={16} />
          <div>
            <span className="metric-label">Tiempo restante</span>
            <span className="metric-value">7h 45m</span>
          </div>
        </div>
      </div>
    </div>
  );
};

WidgetRegistry.register({
  id: 'productivity',
  name: 'Productividad Semanal',
  description: 'Gráfico con horas enfocadas durante la semana.',
  defaultSize: 'medium',
  component: ProductivityWidget,
});

export default ProductivityWidget;
