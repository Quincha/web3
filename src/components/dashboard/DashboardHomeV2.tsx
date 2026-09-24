import React, { useEffect, useState } from 'react';
import { useUser } from '../../context/UserContext';
import { useTasks } from '../../context/TasksContext';
import { usePomodoro } from '../../context/PomodoroContext';
import { useHabits } from '../../context/HabitsContext';
import { useFinance } from '../../context/FinanceContext';
import { SyncStatusBar } from '../layout/SyncStatusBar';
import { Search, MapPin, CloudRain, ListTodo, Flame, CalendarDays, Compass } from 'lucide-react';
import './DashboardHomeV2.css';

const WEATHER_CODES: Record<number, string> = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Niebla', 48: 'Niebla', 51: 'Llovizna', 53: 'Llovizna', 55: 'Llovizna',
  61: 'Lluvia', 63: 'Lluvia', 65: 'Lluvia', 71: 'Nieve', 73: 'Nieve', 75: 'Nieve',
  80: 'Chubascos', 81: 'Chubascos', 82: 'Chubascos', 95: 'Tormenta', 96: 'Tormenta', 99: 'Tormenta',
};

function go(view: string) {
  window.dispatchEvent(new CustomEvent('change-view', { detail: view }));
}

export const DashboardHomeV2: React.FC = () => {
  const { userConfig, username } = useUser();
  const { tasks, getTodayTasks } = useTasks();
  const { completedSessions, isActive } = usePomodoro();
  const { habitsWithStats } = useHabits();
  const firstName = (username || userConfig.userName || 'Daniel').split(' ')[0];

  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=-37.4697&longitude=-72.3536&current=temperature_2m,weather_code&timezone=auto',
        );
        if (!res.ok) throw new Error('weather');
        const data = await res.json();
        if (!cancelled && data?.current) {
          setWeather({
            temp: Math.round(data.current.temperature_2m),
            code: data.current.weather_code,
          });
        }
      } catch {
        if (!cancelled) setWeather(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayTasks = getTodayTasks();
  const pendingCount = todayTasks.filter((t) => t.status !== 'completed').length;
  const todayKey = now.toISOString().split('T')[0];
  const focusToday = (completedSessions || []).filter(
    (s) => s.type === 'work' && s.timestamp.startsWith(todayKey),
  ).length;
  const habitsToday = (habitsWithStats || []).filter((h) => !h.archived && h.completedToday).length;
  const habitsTotal = (habitsWithStats || []).filter((h) => !h.archived).length;

  const dateLabel = now.toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timeLabel = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  const weatherLabel = weather ? WEATHER_CODES[weather.code] ?? '—' : '…';

  const metrics = [
    { icon: ListTodo, color: '#3ACDFF', value: pendingCount, label: 'Tareas hoy', hint: 'pendientes' },
    { icon: Flame, color: '#16F0B5', value: isActive ? 'ON' : focusToday, label: 'Enfocado', hint: isActive ? 'sesión activa' : 'hoy' },
    { icon: CalendarDays, color: '#B388FF', value: todayTasks.length, label: 'En agenda', hint: 'elementos' },
    {
      icon: Compass,
      color: '#FFB84D',
      value: habitsTotal > 0 ? `${habitsToday}/${habitsTotal}` : '—',
      label: 'Hábitos',
      hint: 'hoy',
    },
  ];

  return (
    <div className="dash-v2">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="v2-hero gsap-stagger-item">
        <div
          className="v2-hero-bg"
          style={{ backgroundImage: 'url(/hero_aurora_wide.png)' }}
          aria-hidden
        />
        <div className="v2-hero-overlay" aria-hidden />

        <div className="v2-hero-top">
          <button
            type="button"
            className="v2-search"
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          >
            <Search size={15} />
            <span>Buscar en Quincha Systems...</span>
            <kbd>⌘K</kbd>
          </button>
          <div className="v2-hero-actions">
            <SyncStatusBar />
            <span className="v2-avatar" title={username || userConfig.userName}>
              {(username || userConfig.userName || 'D').charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        <div className="v2-hero-main">
          <div className="v2-hero-welcome">
            <p className="v2-kicker">HOLA, {(firstName || 'DANIEL').toUpperCase()}</p>
            <h1 className="v2-title">
              Bienvenido de nuevo,
              <br />
              <span className="v2-title-accent">Quincha</span>
            </h1>
            <p className="v2-quote">“La disciplina es la libertad de elegir lo que quieres.”</p>
          </div>

          <div className="v2-hero-meta">
            <div className="v2-meta-row">
              <span className="v2-meta-loc">
                <MapPin size={13} /> Los Ángeles, Chile
              </span>
              <span className="v2-meta-date">{dateLabel}</span>
            </div>
            <div className="v2-meta-row v2-meta-temp">
              <CloudRain size={22} className="v2-meta-icon" />
              <div>
                <strong>{weather ? `${weather.temp}°C` : '—°C'}</strong>
                <span>{weatherLabel}</span>
              </div>
              <div className="v2-clock">
                <strong>{timeLabel}</strong>
                <span>Tu productividad hoy también cuenta</span>
              </div>
            </div>
          </div>
        </div>

        <div className="v2-metrics">
          {metrics.map((m) => (
            <div key={m.label} className="v2-metric">
              <span className="v2-metric-icon" style={{ color: m.color, background: `${m.color}1A` }}>
                <m.icon size={16} />
              </span>
              <div>
                <strong>{m.value}</strong>
                <span>
                  {m.label}
                  <em> · {m.hint}</em>
                </span>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* ── Row: Pomodoro + Tareas ───────────────────────────── */}
      <section className="v2-row v2-row-2">
        <article className="v2-card gsap-stagger-item">
          <div className="v2-card-head">
            <div>
              <h3>Pomodoro</h3>
              <p>Enfócate. Avanza. Logra.</p>
            </div>
            <button type="button" className="v2-chip" onClick={() => go('pomodoro')}>
              Modo profundo
            </button>
          </div>
          <div className="v2-pomo-body">
            <PomodoroRing />
            <div className="v2-pomo-side">
              <p className="v2-label">SESIÓN ACTUAL</p>
              <h4>Enfoque profundo</h4>
              <p className="v2-sub">Sin distracciones · 25 min</p>
              <div className="v2-pomo-steps" aria-hidden>
                <span className="on">Pomodoro 1</span>
                <span>Descanso</span>
                <span>Pomodoro 2</span>
                <span>Largo</span>
              </div>
              <div className="v2-pomo-actions">
                <button type="button" className="v2-btn primary" onClick={() => go('pomodoro')}>
                  <Flame size={14} /> Iniciar
                </button>
                <button type="button" className="v2-btn ghost" onClick={() => go('pomodoro')}>
                  Reiniciar
                </button>
              </div>
              <div className="v2-tip">
                <strong>Consejo:</strong> Mantén el enfoque. El progreso está en la constancia, no en la perfección.
              </div>
            </div>
          </div>
          <div className="v2-pomo-stats">
            <div>
              <span>Hoy</span>
              <strong>{focusToday}/8</strong>
              <em>completadas</em>
            </div>
            <div>
              <span>Enfoque</span>
              <strong>{focusToday * 25}m</strong>
              <em>acumulados</em>
            </div>
            <div>
              <span>Próximo</span>
              <strong>20m</strong>
              <em>descanso</em>
            </div>
          </div>
        </article>

        <article className="v2-card gsap-stagger-item">
          <div className="v2-card-head">
            <div>
              <h3>
                Tareas del día{' '}
                <span className="v2-badge">{pendingCount} pendientes</span>
              </h3>
            </div>
            <button type="button" className="v2-btn primary sm" onClick={() => go('tareas')}>
              + Nueva
            </button>
          </div>
          <ul className="v2-task-list">
            {todayTasks.length === 0 ? (
              <li className="v2-empty">Sin tareas para hoy. Crea una desde el módulo.</li>
            ) : (
              todayTasks.slice(0, 5).map((t) => (
                <li key={t.id} className="v2-task">
                  <span
                    className={`v2-check ${t.status === 'completed' ? 'done' : ''}`}
                    aria-hidden
                  />
                  <div className="v2-task-body">
                    <strong className={t.status === 'completed' ? 'done' : ''}>{t.title}</strong>
                    {t.project_id && <span className="v2-task-tag">Proyecto</span>}
                  </div>
                  <span className={`v2-pri ${t.priority}`}>{t.priority}</span>
                  <span className="v2-task-when">Hoy</span>
                </li>
              ))
            )}
          </ul>
          <button type="button" className="v2-link" onClick={() => go('tareas')}>
            Ver todas las tareas →
          </button>
        </article>
      </section>

      {/* ── Row: Calendario + Hábitos + Actividad ────────────── */}
      <section className="v2-row v2-row-3">
        <article className="v2-card gsap-stagger-item">
          <div className="v2-card-head">
            <h3>
              <CalendarDays size={16} className="v2-h-icon" /> Calendario
            </h3>
            <button type="button" className="v2-chip" onClick={() => go('calendario')}>
              Hoy
            </button>
          </div>
          <div className="v2-week" aria-hidden>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => {
              const day = new Date();
              const dow = (day.getDay() + 6) % 7;
              day.setDate(day.getDate() - dow + i);
              const isToday = i === dow;
              return (
                <span key={`${d}-${i}`} className={isToday ? 'on' : ''}>
                  <em>{d}</em>
                  <b>{day.getDate()}</b>
                </span>
              );
            })}
          </div>
          <ul className="v2-cal-list">
            <li className="v2-empty">Los eventos del día aparecen aquí (Google Calendar / BuJo).</li>
          </ul>
          <button type="button" className="v2-link" onClick={() => go('calendario')}>
            Ver calendario completo →
          </button>
        </article>

        <article className="v2-card gsap-stagger-item">
          <div className="v2-card-head">
            <h3>Hábitos (BuJo)</h3>
            <button type="button" className="v2-chip" onClick={() => go('habitos')}>
              Esta semana
            </button>
          </div>
          <div className="v2-habit-days" aria-hidden>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <ul className="v2-habit-list">
            {(habitsWithStats || []).filter((h) => !h.archived).length === 0 ? (
              <li className="v2-empty">Aún no tienes hábitos. Crea uno en Hábitos.</li>
            ) : (
              (habitsWithStats || [])
                .filter((h) => !h.archived)
                .slice(0, 4)
                .map((h) => (
                  <li key={h.id} className="v2-habit">
                    <span className="v2-habit-ico" style={{ background: `${h.color}22`, color: h.color }}>
                      {h.icon}
                    </span>
                    <div className="v2-habit-info">
                      <strong>{h.name}</strong>
                      <span>{h.completionRate30d}% · racha {h.streak}d</span>
                    </div>
                    <div className="v2-habit-dots">
                      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                        const on = i < Math.round((h.completionRate30d / 100) * 7);
                        return <i key={i} className={on ? 'on' : ''} style={on ? { background: h.color } : undefined} />;
                      })}
                    </div>
                  </li>
                ))
            )}
          </ul>
          <button type="button" className="v2-link" onClick={() => go('habitos')}>
            Ver todos los hábitos →
          </button>
        </article>

        <article className="v2-card gsap-stagger-item">
          <div className="v2-card-head">
            <h3>Actividad reciente</h3>
          </div>
          <ul className="v2-activity">
            {(tasks || []).length === 0 ? (
              <li className="v2-empty">Aún no hay actividad registrada.</li>
            ) : (
              (tasks || [])
                .slice(0, 5)
                .map((t) => (
                  <li key={t.id}>
                    <i
                      className={t.status === 'completed' ? 'ok' : ''}
                      style={{ background: t.status === 'completed' ? '#16F0B5' : '#3ACDFF' }}
                    />
                    <div>
                      <strong>
                        {t.status === 'completed' ? 'Completaste' : 'Creaste'} “{t.title}”
                      </strong>
                      <span>
                        {new Date(t.completedAt || t.createdAt).toLocaleDateString('es-CL', {
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        · {new Date(t.completedAt || t.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </li>
                ))
            )}
          </ul>
          <button type="button" className="v2-link" onClick={() => go('actividad')}>
            Ver toda la actividad →
          </button>
        </article>
      </section>

      {/* ── Finanzas ─────────────────────────────────────────── */}
      <section className="v2-row v2-row-1">
        <article className="v2-card v2-finance gsap-stagger-item">
          <div className="v2-card-head">
            <div>
              <h3>
                <span className="v2-finance-ico">＄</span> Módulo de Finanzas
              </h3>
              <p>Tu dinero, bajo control.</p>
            </div>
            <button type="button" className="v2-btn ghost sm" onClick={() => go('finanzas')}>
              Ir a Finanzas →
            </button>
          </div>
          <FinanceMiniStrip />
        </article>
      </section>

      {/* ── Brand footer ─────────────────────────────────────── */}
      <footer className="v2-brand gsap-stagger-item">
        <div className="v2-brand-mark">Q</div>
        <div>
          <p className="v2-brand-kicker">· Quincha Systems</p>
          <h4>Tecnología, disciplina y propósito.</h4>
          <p>Automatiza, organiza, enfócate. Construye la vida que quieres.</p>
        </div>
        <button type="button" className="v2-btn ghost" onClick={() => go('proyectos')}>
          Ver proyectos →
        </button>
      </footer>
    </div>
  );
};

/* Mini ring inside Pomodoro card (visual only; full control in module) */
const PomodoroRing: React.FC = () => {
  const { timeRemaining, totalDuration, isActive } = usePomodoro();
  const pct = totalDuration > 0 ? ((totalDuration - timeRemaining) / totalDuration) * 100 : 0;
  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  const label = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const r = 72;
  const c = 2 * Math.PI * r;

  return (
    <div className="v2-ring">
      <svg viewBox="0 0 180 180" width="180" height="180">
        <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke="#16F0B5"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          transform="rotate(-90 90 90)"
          style={{ filter: 'drop-shadow(0 0 8px rgba(22,240,181,0.45))' }}
        />
      </svg>
      <div className="v2-ring-center">
        <strong>{label}</strong>
        <span>{isActive ? 'EN CURSO' : 'LISTO'}</span>
      </div>
    </div>
  );
};

const FinanceMiniStrip: React.FC = () => {
  const { stats } = useFinance();
  const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

  return (
    <div className="v2-fin-strip">
      <div className="v2-fin-cell">
        <span>Saldo disponible</span>
        <strong className="green">{fmt(stats.availableBalance)}</strong>
      </div>
      <div className="v2-fin-cell">
        <span>Por cobrar</span>
        <strong className="cyan">{fmt(stats.totalReceivables)}</strong>
      </div>
      <div className="v2-fin-cell">
        <span>Por pagar</span>
        <strong className="red">{fmt(stats.totalPayables)}</strong>
      </div>
      <div className="v2-fin-cell">
        <span>Ingresos del mes</span>
        <strong>{fmt(stats.monthlyIncome)}</strong>
      </div>
      <div className="v2-fin-cell">
        <span>Gastos del mes</span>
        <strong className="red">{fmt(stats.monthlyExpenses)}</strong>
      </div>
    </div>
  );
};

export default DashboardHomeV2;
