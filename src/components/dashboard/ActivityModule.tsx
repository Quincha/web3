import React from 'react';
import { Activity, ArrowLeft, CheckCircle, FilePlus2, FolderOpen } from 'lucide-react';
import { useTasks } from '../../context/TasksContext';
import { buildActivity, formatRelativeTime, type ActivityItem, type ActivityType } from '../../utils/activity';

const TYPE_ICONS: Record<ActivityType, React.ReactNode> = {
  complete: <CheckCircle size={18} />,
  'task-create': <FilePlus2 size={18} />,
  'project-create': <FolderOpen size={18} />,
};

export const ActivityModule: React.FC = () => {
  const { tasks, projects } = useTasks();
  const activities = buildActivity(tasks, projects);

  return (
    <div className="module-container fade-in" style={{ padding: '32px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity size={28} color="#16F0B5" />
            Actividad
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0 0' }}>
            Timeline de acciones completadas en la plataforma · {activities.length} registros
          </p>
        </div>

        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('change-view', { detail: 'dashboard' }));
            window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: 'dashboard' }));
          }}
          style={{
            background: 'rgba(255,255,255,0.06)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <ArrowLeft size={16} /> Dashboard
        </button>
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {activities.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
            Aún no hay actividad registrada. Comienza a crear y completar tareas para ver tu historial aquí.
          </div>
        ) : (
          activities.map((activity: ActivityItem, i: number) => (
            <ActivityRow key={activity.id} activity={activity} isLast={i === activities.length - 1} />
          ))
        )}
      </div>
    </div>
  );
};

const ActivityRow: React.FC<{ activity: ActivityItem; isLast: boolean }> = ({ activity, isLast }) => {
  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
      {/* Timeline rail */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${activity.color}18`,
          border: `1px solid ${activity.color}45`,
          color: activity.color,
          flexShrink: 0
        }}>
          {TYPE_ICONS[activity.type]}
        </div>
        {!isLast && (
          <div style={{ width: '2px', flex: 1, minHeight: 16, background: 'rgba(255,255,255,0.08)' }} />
        )}
      </div>

      <div style={{ paddingTop: 8, paddingBottom: isLast ? 0 : 8, flex: 1 }}>
        <div style={{ color: 'white', fontSize: 15, fontWeight: 500 }}>{activity.text}</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 }}>
          {formatRelativeTime(activity.timestamp)}
        </div>
      </div>
    </div>
  );
};

export default ActivityModule;