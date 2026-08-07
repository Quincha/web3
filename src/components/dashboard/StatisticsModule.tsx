import React from 'react';
import {
  Activity, FolderOpen, CheckCircle2, Circle,
  BarChart3, Clock, Flame, Wallet, HeartPulse, AlarmClock, Lightbulb, AlertTriangle, Info, CheckCircle
} from 'lucide-react';
import { useTasks } from '../../context/TasksContext';
import { usePomodoro } from '../../context/PomodoroContext';
import { useHabits } from '../../context/HabitsContext';
import { useFinance } from '../../context/FinanceContext';
import { useHealth } from '../../context/HealthContext';
import { useInsights } from '../../context/InsightsContext';
import type { ProactiveInsight } from '../../context/InsightsContext';

const fmtCLP = (n: number) => '$' + n.toLocaleString('es-CL');
const fmtHours = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const INSIGHT_META: Record<ProactiveInsight['type'], { color: string; bg: string; Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> }> = {
  danger: { color: '#F43F5E', bg: 'rgba(244,63,94,0.12)', Icon: AlertTriangle },
  warning: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', Icon: AlertTriangle },
  info: { color: '#38BDF8', bg: 'rgba(56,189,248,0.12)', Icon: Info },
  success: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', Icon: CheckCircle },
};

export const StatisticsModule: React.FC = () => {
  const { tasks, projects } = useTasks();
  const { completedSessions } = usePomodoro();
  const { habitsWithStats } = useHabits();
  const { stats } = useFinance();
  const { medications, getUpcomingAppointments } = useHealth();
  const { insights } = useInsights();

  const toDashboard = () => {
    window.dispatchEvent(new CustomEvent('change-view', { detail: 'dashboard' }));
    window.dispatchEvent(new CustomEvent('navigate-to-module', { detail: 'dashboard' }));
  };

  // ── TASKS ──
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const doneRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const active = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
  const urgent = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed' && t.status !== 'cancelled').length;
  const activeProjects = projects.filter(p => !p.archived).length;
  const totalFocusSec = tasks.reduce((s, t) => s + (t.timeSpentSeconds || 0), 0);
  const totalPomodoros = tasks.reduce((s, t) => s + (t.completedPomodoros || 0), 0);

  // ── POMODORO (focus per day, last 7 days) ──
  const focusByDay = new Map<string, number>();
  completedSessions.forEach(s => {
    if (s.type !== 'work') return;
    const key = localDay(new Date(s.timestamp));
    focusByDay.set(key, (focusByDay.get(key) || 0) + (s.durationMinutes || 0));
  });
  const week: { label: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    week.push({ label: DAY_LABELS[d.getDay()], minutes: focusByDay.get(localDay(d)) || 0 });
  }
  const weekMax = Math.max(...week.map(w => w.minutes), 1);
  const totalSessions = completedSessions.length;
  const totalWorkMinutes = completedSessions.filter(s => s.type === 'work').reduce((s, x) => s + (x.durationMinutes || 0), 0);

  // ── HABITS ──
  const positive = habitsWithStats.filter(h => h.type !== 'negative');
  const negative = habitsWithStats.filter(h => h.type === 'negative');
  const avgRate = positive.length > 0 ? Math.round(positive.reduce((s, h) => s + h.completionRate30d, 0) / positive.length) : 0;
  const bestStreak = Math.max(0, ...habitsWithStats.map(h => h.streak));

  // ── HEALTH ──
  const upcomingAppts = getUpcomingAppointments(7).length;
  const lowStock = medications.filter(m => m.stockRemaining / m.stockTotal <= 0.4).length;

  // ── TASK STATUS DISTRIBUTION ──
  const statusCounts = [
    { key: 'pending', label: 'Pendientes', value: tasks.filter(t => t.status === 'pending').length, color: '#F59E0B' },
    { key: 'in-progress', label: 'En curso', value: tasks.filter(t => t.status === 'in-progress').length, color: '#38BDF8' },
    { key: 'completed', label: 'Completadas', value: completed, color: '#10B981' },
    { key: 'cancelled', label: 'Canceladas', value: tasks.filter(t => t.status === 'cancelled').length, color: '#64748B' },
  ];
  const statusMax = Math.max(...statusCounts.map(s => s.value), 1);

  const kpis = [
    { label: 'Tareas activas', value: active, sub: `${urgent} urgentes`, Icon: Circle, color: '#38BDF8' },
    { label: 'Tasa de completado', value: `${doneRate}%`, sub: `${completed} de ${total}`, Icon: CheckCircle2, color: '#10B981' },
    { label: 'Proyectos activos', value: activeProjects, sub: `${projects.length} total`, Icon: FolderOpen, color: '#8B5CF6' },
    { label: 'Sesiones Pomodoro', value: totalSessions, sub: `${fmtHours(totalWorkMinutes * 60)} enfocado`, Icon: AlarmClock, color: '#F97316' },
    { label: 'Tiempo enfocado', value: fmtHours(totalFocusSec + totalWorkMinutes * 60), sub: `${totalPomodoros} pomodoros`, Icon: Clock, color: '#F59E0B' },
    { label: 'Tasa de hábitos', value: `${avgRate}%`, sub: `${positive.length} positivos · máx ${bestStreak}d`, Icon: Flame, color: '#EC4899' },
  ];

  return (
    <div className="module-container fade-in" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BarChart3 size={28} color="#16F0B5" />
            Estadísticas
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: '8px 0 0 0' }}>
            Métricas en vivo desde tus datos · {total} tareas, {habitsWithStats.length} hábitos, {stats.availableBalance > 0 ? 'finanzas conectadas' : 'finanzas —'}
          </p>
        </div>
        <button
          onClick={toDashboard}
          style={{
            background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px', padding: '10px 18px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
          }}
        >
          <Activity size={16} /> Dashboard
        </button>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: k.color }}>
              <k.Icon size={16} />
              <span style={{ fontSize: '0.72rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>{k.label}</span>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: 'white', lineHeight: 1.1 }}>{k.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '4px' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Row: Focus chart + status */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Focus chart */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white' }}>Enfoque de la semana (Pomodoro)</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{fmtHours(totalWorkMinutes * 60)} esta semana</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '180px' }}>
            {week.map((w, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.66rem', color: 'var(--text-subtle)' }}>
                  {w.minutes > 0 ? (w.minutes >= 60 ? `${Math.round(w.minutes / 60)}h` : `${w.minutes}m`) : ''}
                </span>
                <div
                  style={{
                    width: '100%', maxWidth: '40px', borderRadius: '6px 6px 0 0',
                    height: `${Math.max(6, (w.minutes / weekMax) * 130)}px`,
                    background: i === 6 ? 'var(--accent-green)' : 'rgba(56,189,248,0.5)',
                    transition: 'height 0.3s ease'
                  }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-subtle)' }}>{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Health */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HeartPulse size={16} color="#F43F5E" /> Salud
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Citas próximas</span>
              <span style={{ fontWeight: 700, color: 'white' }}>{upcomingAppts}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Medicamentos</span>
              <span style={{ fontWeight: 700, color: 'white' }}>{medications.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Stock bajo</span>
              <span style={{ fontWeight: 700, color: lowStock > 0 ? '#F43F5E' : '#10B981' }}>{lowStock}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Hábitos positivos</span>
              <span style={{ fontWeight: 700, color: 'white' }}>{positive.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Hábitos de evitación</span>
              <span style={{ fontWeight: 700, color: 'white' }}>{negative.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row: Task status + finance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Task status */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white', marginBottom: '16px' }}>Tareas por estado</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {statusCounts.map(s => (
              <div key={s.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-subtle)' }}>{s.label}</span>
                  <span style={{ color: 'white', fontWeight: 600 }}>{s.value}</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(s.value / statusMax) * 100}%`, background: s.color, borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Finance */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={16} color="#10B981" /> Finanzas
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Saldo disponible</span>
              <span style={{ fontWeight: 700, color: '#10B981' }}>{fmtCLP(stats.availableBalance)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Por cobrar</span>
              <span style={{ fontWeight: 700, color: '#38BDF8' }}>{fmtCLP(stats.totalReceivables)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Por pagar</span>
              <span style={{ fontWeight: 700, color: '#F97316' }}>{fmtCLP(stats.totalPayables)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Ingresos mes</span>
              <span style={{ fontWeight: 700, color: '#10B981' }}>{fmtCLP(stats.monthlyIncome)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>Gastos mes</span>
              <span style={{ fontWeight: 700, color: '#F43F5E' }}>{fmtCLP(stats.monthlyExpenses)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lightbulb size={16} color="#F59E0B" /> Insights proactivos
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          {insights.map(ins => {
            const meta = INSIGHT_META[ins.type];
            return (
              <div key={ins.id} style={{ background: meta.bg, border: `1px solid ${meta.color}30`, borderRadius: '10px', padding: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <meta.Icon size={16} style={{ color: meta.color, flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: '0.82rem', color: 'white', fontWeight: 600 }}>{ins.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '2px' }}>{ins.message}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatisticsModule;