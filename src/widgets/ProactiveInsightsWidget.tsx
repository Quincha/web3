import React from 'react';
import { Sparkles, AlertTriangle, Info, CheckCircle, X } from 'lucide-react';
import { useInsights } from '../context/InsightsContext';
import type { ProactiveInsight } from '../context/InsightsContext';
import { WidgetRegistry } from './WidgetRegistry';

const ProactiveInsightsWidget: React.FC = () => {
  const { insights, dismissInsight } = useInsights();
  
  const getIcon = (type: ProactiveInsight['type']) => {
    switch (type) {
      case 'danger':  return <AlertTriangle size={15} style={{ color: '#EF4444' }} />;
      case 'warning': return <AlertTriangle size={15} style={{ color: '#F59E0B' }} />;
      case 'success': return <CheckCircle size={15} style={{ color: 'var(--accent-green)' }} />;
      default:        return <Info size={15} style={{ color: '#3B82F6' }} />;
    }
  };

  const handleAction = (view: string) => {
    window.dispatchEvent(new CustomEvent('change-view', { detail: view }));
  };

  return (
    <div className="proactive-insights-widget-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="widget-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div className="title-with-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={16} className="brand-accent-text" style={{ color: 'var(--accent-green)' }} />
          <h3>Sugerencias IA</h3>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflowY: 'auto' }}>
        {insights.map(ins => (
          <div
            key={ins.id}
            style={{
              background: 'var(--bg-secondary)',
              border: `1px solid var(--border-color)`,
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              position: 'relative'
            }}
          >
            {/* Close button */}
            <button
              onClick={() => dismissInsight(ins.id)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-subtle)',
                cursor: 'pointer',
                padding: '2px'
              }}
            >
              <X size={12} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {getIcon(ins.type)}
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ins.title}</span>
            </div>

            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '23px', lineHeight: 1.4 }}>
              {ins.message}
            </p>

            {ins.actionLabel && ins.actionView && (
              <button
                onClick={() => handleAction(ins.actionView!)}
                style={{
                  alignSelf: 'flex-start',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-green)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  marginLeft: '23px',
                  marginTop: '4px'
                }}
              >
                {ins.actionLabel} →
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

WidgetRegistry.register({
  id: 'proactive-insights',
  name: 'Asistente IA Proactiva',
  description: 'Sugerencias inteligentes sobre tu salud, hábitos y prioridades.',
  defaultSize: 'medium',
  component: ProactiveInsightsWidget,
});

export default ProactiveInsightsWidget;
