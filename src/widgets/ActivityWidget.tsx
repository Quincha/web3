import React from 'react';
import { Activity as ActivityIcon, ArrowRight } from 'lucide-react';
import { WidgetRegistry } from './WidgetRegistry';
import { tokens } from '../theme/tokens';
import { useTasks } from '../context/TasksContext';
import { buildActivity, formatRelativeTime } from '../utils/activity';

const MAX_ITEMS = 4;

const ActivityWidget: React.FC = () => {
  const { tasks, projects } = useTasks();
  const activities = buildActivity(tasks, projects);

  return (
    <div className="dashboard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: tokens.spacing.space6 }}>
        <h3 style={{ fontSize: tokens.typography.sizes.title, fontWeight: tokens.typography.weights.medium, color: tokens.colors.text.primary }}>
          Actividad reciente
        </h3>
        <button style={{ background: 'transparent', border: 'none', color: tokens.colors.text.muted, cursor: 'pointer' }}>
          <ActivityIcon size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.space4, flex: 1, overflowY: 'auto', zIndex: 1 }}>
        {activities.length === 0 ? (
          <div style={{ color: tokens.colors.text.muted, fontSize: tokens.typography.sizes.body, textAlign: 'center', padding: '24px 0' }}>
            Aún no hay actividad registrada.
          </div>
        ) : (
          activities.slice(0, MAX_ITEMS).map(activity => (
            <div key={activity.id} style={{ display: 'flex', gap: tokens.spacing.space4, alignItems: 'flex-start' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '2px',
                background: activity.color,
                marginTop: '6px',
                boxShadow: `0 0 8px ${activity.color}60`,
                flexShrink: 0
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ color: tokens.colors.text.primary, fontSize: tokens.typography.sizes.body }}>
                  {activity.text}
                </span>
                <span style={{ color: tokens.colors.text.secondary, fontSize: tokens.typography.sizes.small }}>
                  {formatRelativeTime(activity.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 'auto', borderTop: `1px solid ${tokens.colors.border.primary}`, paddingTop: tokens.spacing.space4, zIndex: 1 }}>
        <a
          href="#"
          onClick={e => {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('change-view', { detail: 'actividad' }));
            window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: 'actividad' }));
          }}
          style={{ color: tokens.colors.accent.green, fontSize: tokens.typography.sizes.small, textDecoration: 'none', fontWeight: tokens.typography.weights.medium, display: 'inline-flex', alignItems: 'center', gap: 4 }}
        >
          Ver toda la actividad <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
};

// Register widget
WidgetRegistry.register({
  id: 'activity',
  name: 'Actividad Reciente',
  description: 'Registro de las últimas acciones realizadas en la plataforma.',
  defaultSize: 'medium',
  component: ActivityWidget
});

export default ActivityWidget;