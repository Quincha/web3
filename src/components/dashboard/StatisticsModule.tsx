import React, { useState } from 'react';
import {
  Activity, FolderOpen, CheckCircle2, Circle,
  BarChart3, Clock, Flame, Wallet, HeartPulse, AlarmClock, Lightbulb, AlertTriangle, Info, CheckCircle,
  TrendingUp
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

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '8px', padding: '7px 10px', fontSize: '0.8rem', colorScheme: 'dark'
};

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
  // Semana calendario (lunes → domingo) para "Enfoque de la semana"
  const weekTodayISO = localDay(new Date());
  const weekAnchor = new Date();
  weekAnchor.setDate(weekAnchor.getDate() - ((weekAnchor.getDay() + 6) % 7)); // lunes
  const week: { label: string; minutes: number; isToday: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekAnchor);
    d.setDate(weekAnchor.getDate() + i);
    const iso = localDay(d);
    week.push({ label: DAY_LABELS[d.getDay()], minutes: focusByDay.get(iso) || 0, isToday: iso === weekTodayISO });
  }
  const weekWorkMinutes = week.reduce((s, w) => s + w.minutes, 0);
  const weekMax = Math.max(...week.map(w => w.minutes), 1);
  const totalSessions = completedSessions.length;
  const totalWorkMinutes = completedSessions.filter(s => s.type === 'work').reduce((s, x) => s + (x.durationMinutes || 0), 0);

  // ── HABITS ──
  const positive = habitsWithStats.filter(h => h.type !== 'negative');
  const negative = habitsWithStats.filter(h => h.type === 'negative');
  const avgRate = positive.length > 0 ? Math.round(positive.reduce((s, h) => s + h.completionRate30d, 0) / positive.length) : 0;
  const bestStreak = Math.max(0, ...habitsWithStats.map(h => h.streak));

  // ── ANÁLISIS DE HÁBITOS ──
  // Positivos: "días cumplidos"; un día sin registro cuenta como "no hecho" (objetivo menos cumplidos).
  // Evitación: "días de consumo/violación".
  const [trendMode, setTrendMode] = useState<'week' | 'month' | 'year' | 'range'>('month');
  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(today.getDate() - 30);
  const [rangeFrom, setRangeFrom] = useState(() => localDay(defaultFrom));
  const [rangeTo, setRangeTo] = useState(() => localDay(today));

  const trendYear = today.getFullYear();
  const trendMonth = today.getMonth();

  const startOfWeek = (d: Date): Date => {
    const x = new Date(d);
    const day = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - day);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  const habitCountIn = (h: typeof habitsWithStats[number], startISO: string, endISO: string) => {
    const startT = new Date(startISO + 'T12:00:00').getTime();
    const endT = new Date(endISO + 'T12:00:00').getTime();
    return h.completions.filter(c => {
      if (h.type === 'negative' && c.isViolation !== true) return false;
      const cT = new Date(String(c.date) + 'T12:00:00').getTime();
      return cT >= startT && cT <= endT;
    }).length;
  };

  const habitEligibleIn = (h: typeof habitsWithStats[number], startISO: string, endISO: string) => {
    const endT = new Date(endISO + 'T12:00:00').getTime();
    const startT = Math.max(new Date(startISO + 'T12:00:00').getTime(), new Date(h.startDate + 'T12:00:00').getTime());
    let n = 0;
    for (let t = startT; t <= endT; t += 86400000) {
      if (h.targetDays.includes(new Date(t).getDay())) n++;
    }
    return n;
  };

  // Todos los hábitos activos (incluso con 0 registros, para decidir si usarlos o eliminarlos).
  const analysisHabits = habitsWithStats.filter(h => !h.archived);

  const monthCols = (() => {
    const cols: { label: string; startISO: string; endISO: string; isCurrent: boolean }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(trendYear, trendMonth - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      cols.push({
        label: d.toLocaleDateString('es-CL', { month: 'short' }),
        startISO: localDay(new Date(y, m, 1)),
        endISO: localDay(new Date(y, m + 1, 0)),
        isCurrent: i === 0,
      });
    }
    return cols;
  })();

  const weekCols = (() => {
    const cols: { label: string; startISO: string; endISO: string; isCurrent: boolean }[] = [];
    for (let i = 7; i >= 0; i--) {
      const anchor = new Date();
      anchor.setDate(anchor.getDate() - i * 7);
      const s = startOfWeek(anchor);
      const e = new Date(s);
      e.setDate(e.getDate() + 6);
      cols.push({
        label: `${s.getDate()}/${s.getMonth() + 1}`,
        startISO: localDay(s),
        endISO: localDay(e),
        isCurrent: i === 0,
      });
    }
    return cols;
  })();

  const yearCols = (() => {
    const cols: { label: string; startISO: string; endISO: string; isCurrent: boolean }[] = [];
    for (let m = 0; m < 12; m++) {
      cols.push({
        label: new Date(trendYear, m, 1).toLocaleDateString('es-CL', { month: 'short' }),
        startISO: localDay(new Date(trendYear, m, 1)),
        endISO: localDay(new Date(trendYear, m + 1, 0)),
        isCurrent: m === trendMonth,
      });
    }
    return cols;
  })();

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
    <div className="module-container fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{fmtHours(weekWorkMinutes * 60)} esta semana</span>
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
                    background: w.isToday ? 'var(--accent-green)' : 'rgba(56,189,248,0.5)',
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

      {/* Análisis de hábitos (cuadrículas y rango de fechas) */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} color="#16F0B5" /> Análisis de hábitos
          </h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['week', 'month', 'year', 'range'] as const).map(m => (
              <button
                key={m}
                onClick={() => setTrendMode(m)}
                style={{
                  background: trendMode === m ? 'rgba(22,240,181,0.16)' : 'rgba(255,255,255,0.05)',
                  color: trendMode === m ? '#16F0B5' : 'var(--text-secondary)',
                  border: `1px solid ${trendMode === m ? 'rgba(22,240,181,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '8px', padding: '5px 12px', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {m === 'week' ? 'Semana' : m === 'month' ? 'Mes' : m === 'year' ? 'Año' : 'Rango'}
              </button>
            ))}
          </div>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
          Positivos: "hecho/objetivo" (objetivo − hecho = días sin marcar) · Evitación: días de consumo
        </p>

        {analysisHabits.length === 0 ? (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', padding: '12px 0' }}>
            Marca algunos hábitos en tu check-in diario para ver tu análisis.
          </div>
        ) : trendMode === 'range' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                Desde
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={e => setRangeFrom(e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                Hasta
                <input
                  type="date"
                  value={rangeTo}
                  onChange={e => setRangeTo(e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {analysisHabits.map(h => {
                const done = habitCountIn(h, rangeFrom, rangeTo);
                if (h.type === 'negative') {
                  return (
                    <div key={h.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '16px' }}>{h.icon}</span>
                        <span style={{ fontSize: '0.82rem', color: 'white', fontWeight: 600 }}>{h.name}</span>
                        <span style={{ fontSize: '0.62rem', color: '#F43F5E', background: 'rgba(244,63,94,0.12)', padding: '2px 6px', borderRadius: '6px', textTransform: 'uppercase' }}>evitación</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <b style={{ color: '#F43F5E', fontSize: '1.1rem' }}>{done}</b> día{done === 1 ? '' : 's'} de consumo
                      </div>
                    </div>
                  );
                }
                const eligible = habitEligibleIn(h, rangeFrom, rangeTo);
                const notDone = Math.max(0, eligible - done);
                const noHistory = eligible === 0 && done === 0;
                return (
                  <div key={h.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '16px' }}>{h.icon}</span>
                      <span style={{ fontSize: '0.82rem', color: 'white', fontWeight: 600 }}>{h.name}</span>
                      <span style={{ fontSize: '0.62rem', color: '#10B981', background: 'rgba(16,185,129,0.12)', padding: '2px 6px', borderRadius: '6px', textTransform: 'uppercase' }}>hábito</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <b style={{ color: '#10B981', fontSize: '1.1rem' }}>{done}</b> de {eligible} objetivo{done === 1 ? '' : 's'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: notDone > 0 ? '#F59E0B' : 'var(--text-subtle)', marginTop: '2px' }}>
                      {noHistory
                        ? 'sin días objetivo en el período'
                        : notDone > 0
                          ? `${notDone} sin marcar (no) · tasa ${Math.round((done / eligible) * 100)}%`
                          : 'cumplido al 100%'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          (() => {
            const cols = trendMode === 'week' ? weekCols : trendMode === 'year' ? yearCols : monthCols;
            return (
              <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: `130px repeat(${cols.length}, minmax(56px, 1fr))`, gap: '8px 10px', alignItems: 'center', minWidth: 130 + cols.length * 66 }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hábito</div>
                  {cols.map((c, i) => (
                    <div
                      key={i}
                      style={{ fontSize: '0.68rem', textAlign: 'center', color: c.isCurrent ? '#16F0B5' : 'var(--text-subtle)', fontWeight: c.isCurrent ? 700 : 400, textTransform: 'uppercase', letterSpacing: '0.03em' }}
                    >
                      {c.label}
                    </div>
                  ))}

                  {analysisHabits.map(h => (
                    <React.Fragment key={h.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span style={{ fontSize: '16px' }}>{h.icon}</span>
                        <span style={{ fontSize: '0.78rem', color: 'white', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={h.name}>{h.name}</span>
                      </div>
                      {cols.map((c, i) => {
                        const done = habitCountIn(h, c.startISO, c.endISO);
                        if (h.type === 'negative') {
                          return <div key={i} style={{ textAlign: 'center', fontSize: '0.8rem', color: done > 0 ? '#F43F5E' : 'var(--text-subtle)', fontWeight: done > 0 ? 700 : 400 }}>{done > 0 ? done : '·'}</div>;
                        }
                        const eligible = habitEligibleIn(h, c.startISO, c.endISO);
                        const notDone = Math.max(0, eligible - done);
                        const rate = eligible > 0 ? Math.round((done / eligible) * 100) : done > 0 ? 100 : 0;
                        return (
                          <div key={i} style={{ textAlign: 'center', fontSize: '0.8rem', fontWeight: 700, color: done === 0 ? 'var(--text-subtle)' : rate >= 70 ? '#10B981' : rate >= 40 ? '#F59E0B' : '#F43F5E' }} title={`${done} de ${eligible} objetivos · ${notDone} no hechos`}>
                            {eligible > 0 ? `${done}/${eligible}` : done > 0 ? done : '·'}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })()
        )}
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