import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { DataSyncService } from '../services/DataSyncService';

// ─────────────────────────────────────────────
// TYPES — metricas medibles por Xiaomi Mi Band 5
// ─────────────────────────────────────────────

export interface HeartRate {
  avg: number;      // BPM promedio del día
  resting: number;  // BPM en reposo
  min: number;      // BPM mínimo
  max: number;      // BPM máximo
}

export interface SleepStages {
  deepMin: number;  // sueño profundo
  lightMin: number; // sueño ligero
  remMin: number;   // sueño REM
  awakeMin: number; // tiempo despierto en la noche
}

export type WorkoutMode =
  | 'running' | 'treadmill' | 'walking' | 'cycling' | 'indoor_cycling'
  | 'elliptical' | 'rowing' | 'jumping' | 'yoga' | 'circuit' | 'freestyle';

export const WORKOUT_MODE_LABELS: Record<WorkoutMode, string> = {
  running: 'Correr al aire libre',
  treadmill: 'Caminadora',
  walking: 'Caminar',
  cycling: 'Ciclismo exterior',
  indoor_cycling: 'Bicicleta estática',
  elliptical: 'Elíptica',
  rowing: 'Remo',
  jumping: 'Saltar cuerda',
  yoga: 'Yoga',
  circuit: 'Entrenamiento por circuitos',
  freestyle: 'Entrenamiento libre',
};

export interface Workout {
  id: string;
  mode: WorkoutMode;
  durationMin: number;
  calories: number;
  distanceKm: number;
  heartRateAvg: number;
  heartRateMax: number;
}

export interface BandDayData {
  date: string;            // local YYYY-MM-DD
  steps: number;
  distanceKm: number;
  calories: number;        // kcal activas del día
  activeMinutes: number;
  heartRate: HeartRate;
  spo2: number | null;     // SpO2 en %
  stress: number | null;   // 0–100
  pai: number;             // PAI (actividad personal)
  energy: number | null;   // 1–100 energía
  sleep: SleepStages;
  workouts: Workout[];
  lastSyncAt: string | null;
}

// ─────────────────────────────────────────────
// ALARMAS (la Mi Band 5 permite hasta 8 alarmas nativas + recordatorios)
// ─────────────────────────────────────────────

export interface BandAlarm {
  id: string;
  time: string;               // HH:MM en formato 24h
  label: string;
  repeatDays: number[];       // 0=Lun … 6=Dom (vacío = una sola vez)
  enabled: boolean;
  smartWake: boolean;         // alarma inteligente (vibra suave antes de la hora)
  snooze: boolean;            // permite posponer
}

export const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// ─────────────────────────────────────────────
// AJUSTES DE LA PULSERA
// ─────────────────────────────────────────────

export interface BandSettings {
  wristSide: 'left' | 'right';
  timeFormat: '24' | '12';
  distanceUnit: 'metric' | 'imperial';
  goalSteps: number;
  raiseToWake: boolean;       // pantalla se enciende al alzar la muñeca
  screenTimeout: number;      // segundos de encendido de pantalla
  vibStrength: number;        // intensidad de vibración 1–5
  dndEnabled: boolean;        // modo no molestar
  dndStart: string;           // HH:MM inicio
  dndEnd: string;             // HH:MM fin
  hrMonitorInterval: number;  // 0 = off, 1 | 5 | 30 (minutos)
  autoSleepTracking: boolean; // detección automática de sueño
  heartAlerts: boolean;       // alertas de frecuencia cardíaca alta
  smartWake: boolean;         // usar alarma inteligente por defecto
  autoNotifications: boolean; // mostrar notificaciones del teléfono en la pulsera
  batteryNotify: boolean;     // avisar batería baja
}

export type BandDataSource = 'simulated' | 'imported';

interface BandContextType {
  days: BandDayData[];
  dataSource: BandDataSource;
  getDay: (dateISO: string) => BandDayData | undefined;
  connected: boolean;
  battery: number;
  lastSyncAt: string | null;
  setConnected: (v: boolean) => void;
  syncNow: () => void;
  importDays: (imported: BandDayData[], source: BandDataSource) => number;
  resetToSimulated: () => void;
  updateMetrics: (dateISO: string, patch: Partial<Omit<BandDayData, 'date' | 'workouts'>>) => void;
  addWorkout: (dateISO: string, workout: Omit<Workout, 'id'>) => void;
  removeWorkout: (dateISO: string, workoutId: string) => void;
  alarms: BandAlarm[];
  addAlarm: (alarm: Omit<BandAlarm, 'id'>) => void;
  updateAlarm: (id: string, patch: Partial<BandAlarm>) => void;
  removeAlarm: (id: string) => void;
  settings: BandSettings;
  updateSettings: (patch: Partial<BandSettings>) => void;
}

const BandContext = createContext<BandContextType | undefined>(undefined);

// ─────────────────────────────────────────────
// HELPERS (fecha local)
// ─────────────────────────────────────────────

function pad(n: number): string { return String(n).padStart(2, '0'); }

function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISO(dateISO: string): Date {
  return new Date(dateISO + 'T12:00:00');
}

function todayISO(): string {
  return toLocalISO(new Date());
}

function subtractDay(dateISO: string, days: number): string {
  const d = parseISO(dateISO);
  d.setDate(d.getDate() - days);
  return toLocalISO(d);
}

function rnd(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeBaseDay(dateISO: string): BandDayData {
  const dayIndex = Math.round(parseISO(dateISO).getTime() / 86400000);
  const r = seededRandom(dayIndex * 7919);

  const dow = (new Date(dateISO + 'T12:00:00').getDay() + 6) % 7; // lun=0
  const weekend = dow >= 5;
  // fin de semana: menos pasos de trabajo, más actividad libre
  const baseSteps = weekend ? 6200 + r() * 5200 : 8400 + r() * 6200;
  const steps = Math.round(baseSteps);
  const distanceKm = +(steps / 1350).toFixed(2);
  const calories = rnd(weekend ? 240 : 300, weekend ? 460 : 580);
  const activeMinutes = rnd(weekend ? 25 : 40, weekend ? 70 : 100);
  const resting = rnd(56, 66);
  const heartRate = {
    resting,
    avg: resting + rnd(8, 20),
    min: resting - rnd(2, 4),
    max: rnd(128, 172),
  };
  const spo2 = rnd(94, 99);
  const stress = rnd(16, 54);
  const pai = rnd(38, 115);
  const energy = rnd(42, 92);

  const sleep = {
    deepMin: rnd(68, 112),
    lightMin: rnd(175, 275),
    remMin: rnd(68, 122),
    awakeMin: rnd(8, 46),
  };

  const workouts: Workout[] = [];

  return {
    date: dateISO,
    steps,
    distanceKm,
    calories,
    activeMinutes,
    heartRate,
    spo2,
    stress,
    pai,
    energy,
    sleep,
    workouts,
    lastSyncAt: null,
  };
}

function seedDays(count: number): BandDayData[] {
  const today = todayISO();
  const days: BandDayData[] = [];
  for (let i = count - 1; i >= 0; i--) {
    days.push(makeBaseDay(subtractDay(today, i)));
  }
  return days;
}

// ─────────────────────────────────────────────
// AJUSTES POR DEFECTO
// ─────────────────────────────────────────────

const DEFAULT_SETTINGS: BandSettings = {
  wristSide: 'left',
  timeFormat: '24',
  distanceUnit: 'metric',
  goalSteps: 10000,
  raiseToWake: true,
  screenTimeout: 5,
  vibStrength: 5,
  dndEnabled: false,
  dndStart: '22:30',
  dndEnd: '07:30',
  hrMonitorInterval: 1,
  autoSleepTracking: true,
  heartAlerts: false,
  smartWake: true,
  autoNotifications: true,
  batteryNotify: true,
};

// ─────────────────────────────────────────────
// LOCAL STORAGE
// ─────────────────────────────────────────────

const DAYS_KEY = 'quincha_band_miband5_v2';
const ALARMS_KEY = 'quincha_band_alarms_v3';
const SETTINGS_KEY = 'quincha_band_settings_v3';
const SOURCE_KEY = 'quincha_band_source_v2';

function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* ignore */ }
  return null;
}

function saveToStorage<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  DataSyncService.markDirty('band');
}

function loadDays(): BandDayData[] {
  const stored = loadFromStorage<BandDayData[]>(DAYS_KEY);
  return Array.isArray(stored) ? stored : [];
}

function loadAlarms(): BandAlarm[] {
  const stored = loadFromStorage<BandAlarm[]>(ALARMS_KEY);
  return Array.isArray(stored) ? stored : [];
}

function loadSettings(): BandSettings {
  const stored = loadFromStorage<Partial<BandSettings>>(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...stored };
}

// ─────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────

export const BandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [days, setDays] = useState<BandDayData[]>(() => loadDays());
  const [dataSource, setDataSource] = useState<BandDataSource>(() => {
    const s = loadFromStorage<BandDataSource>(SOURCE_KEY);
    return s === 'imported' ? 'imported' : 'simulated';
  });
  const [alarms, setAlarms] = useState<BandAlarm[]>(() => loadAlarms());
  const [settings, setSettings] = useState<BandSettings>(() => loadSettings());
  const [connected, setConnected] = useState<boolean>(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [battery] = useState<number>(rnd(62, 100));

  // Restaura datos bajados del servidor (pull) al cambiar de equipo.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { data?: { days?: BandDayData[]; alarms?: BandAlarm[]; settings?: BandSettings; source?: BandDataSource } } | undefined;
      const data = detail?.data;
      if (!data) return;
      if (Array.isArray(data.days)) { setDays(data.days); saveToStorage(DAYS_KEY, data.days); }
      if (Array.isArray(data.alarms)) { setAlarms(data.alarms); saveToStorage(ALARMS_KEY, data.alarms); }
      if (data.settings && typeof data.settings === 'object') { setSettings({ ...DEFAULT_SETTINGS, ...data.settings }); saveToStorage(SETTINGS_KEY, data.settings); }
      if (data.source === 'imported' || data.source === 'simulated') { setDataSource(data.source); saveToStorage(SOURCE_KEY, data.source); }
    };
    window.addEventListener('quincha-restore:band', handler);
    return () => window.removeEventListener('quincha-restore:band', handler);
  }, []);

  const upsertDay = useCallback((dateISO: string, factory: (day: BandDayData) => BandDayData): BandDayData[] => {
    const existing = days.find(d => d.date === dateISO);
    const next = factory(existing ?? makeBaseDay(dateISO));
    const others = days.filter(d => d.date !== dateISO);
    const sorted = [...others, next].sort((a, b) => a.date.localeCompare(b.date)).slice(-180);
    saveToStorage(DAYS_KEY, sorted);
    return sorted;
  }, [days]);

  const getDay = useCallback((dateISO: string) => days.find(d => d.date === dateISO), [days]);

  const syncNow = useCallback(() => {
    const today = todayISO();
    const base = days.find(d => d.date === today) ?? makeBaseDay(today);
    const refreshed: BandDayData = {
      ...base,
      steps: Math.min(20000, base.steps + rnd(-400, 900)),
      distanceKm: +(base.steps / 1350).toFixed(2),
      calories: base.calories + rnd(-20, 40),
      activeMinutes: base.activeMinutes + rnd(2, 12),
      heartRate: { ...base.heartRate, avg: base.heartRate.avg + rnd(-3, 3) },
      spo2: rnd(95, 99),
      stress: rnd(18, 48),
      pai: base.pai + rnd(-2, 6),
      energy: rnd(50, 92),
      lastSyncAt: new Date().toISOString(),
    };
    const nextDays = upsertDay(today, () => refreshed);
    setConnected(true);
    setLastSync(new Date().toISOString());
    setDays(nextDays);
  }, [days, upsertDay]);

  const importDays = useCallback((imported: BandDayData[], source: BandDataSource): number => {
    const normalized = imported
      .filter(d => d && /^\d{4}-\d{2}-\d{2}$/.test(d.date))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-180);
    if (normalized.length === 0) return 0;
    saveToStorage(DAYS_KEY, normalized);
    saveToStorage(SOURCE_KEY, source);
    setDays(normalized);
    setDataSource(source);
    setLastSync(new Date().toISOString());
    return normalized.length;
  }, []);

  const resetToSimulated = useCallback(() => {
    const fresh = seedDays(120);
    saveToStorage(DAYS_KEY, fresh);
    saveToStorage(SOURCE_KEY, 'simulated');
    setDays(fresh);
    setDataSource('simulated');
  }, []);

  const updateMetrics = useCallback((dateISO: string, patch: Partial<Omit<BandDayData, 'date' | 'workouts'>>) => {
    const nextDays = upsertDay(dateISO, day => ({ ...day, ...patch }));
    setDays(nextDays);
  }, [upsertDay]);

  const addWorkout = useCallback((dateISO: string, workout: Omit<Workout, 'id'>) => {
    const nextDays = upsertDay(dateISO, day => ({
      ...day,
      workouts: [...(day.workouts ?? []), { ...workout, id: `wo_${Date.now()}` }],
    }));
    setDays(nextDays);
  }, [upsertDay]);

  const removeWorkout = useCallback((dateISO: string, workoutId: string) => {
    const nextDays = upsertDay(dateISO, day => ({
      ...day,
      workouts: (day.workouts ?? []).filter(w => w.id !== workoutId),
    }));
    setDays(nextDays);
  }, [upsertDay]);

  const persistAlarms = useCallback((next: BandAlarm[]) => {
    saveToStorage(ALARMS_KEY, next);
    setAlarms(next);
  }, []);

  const addAlarm = useCallback((alarm: Omit<BandAlarm, 'id'>) => {
    persistAlarms([...alarms, { ...alarm, id: `al_${Date.now()}` }].slice(-8));
  }, [alarms, persistAlarms]);

  const updateAlarm = useCallback((id: string, patch: Partial<BandAlarm>) => {
    persistAlarms(alarms.map(a => a.id === id ? { ...a, ...patch } : a));
  }, [alarms, persistAlarms]);

  const removeAlarm = useCallback((id: string) => {
    persistAlarms(alarms.filter(a => a.id !== id));
  }, [alarms, persistAlarms]);

  const updateSettings = useCallback((patch: Partial<BandSettings>) => {
    const next = { ...settings, ...patch };
    saveToStorage(SETTINGS_KEY, next);
    setSettings(next);
  }, [settings]);

  const value: BandContextType = {
    days,
    dataSource,
    getDay,
    battery,
    connected,
    lastSyncAt: lastSync,
    setConnected,
    syncNow,
    importDays,
    resetToSimulated,
    updateMetrics,
    addWorkout,
    removeWorkout,
    alarms,
    addAlarm,
    updateAlarm,
    removeAlarm,
    settings,
    updateSettings,
  };

  return <BandContext.Provider value={value}>{children}</BandContext.Provider>;
};

export const useBand = () => {
  const ctx = useContext(BandContext);
  if (!ctx) throw new Error('useBand must be used within a BandProvider');
  return ctx;
};