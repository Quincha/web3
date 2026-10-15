/**
 * Datos de prueba (demo) — carga un conjunto completo de información de
 * ejemplo en todos los módulos del sistema para poder visualizar el
 * dashboard, el calendario, estadísticas, notificaciones, etc., sin tener
 * que cargar datos manualmente.
 *
 * Uso: Ajustes → "Datos de demostración" → Cargar datos de prueba.
 * Se escribe directo en la capa `storage` (localStorage / SQLite en Tauri)
 * y se marcan los módulos como sincronizables para que no los pise un pull
 * posterior. Al final recarga la página para que todos los contextos
 * relean su estado inicial.
 */

import { storage } from './storage';
import { DataSyncService } from './DataSyncService';

import type { Task, Project } from '../context/TasksContext';
import type { Habit } from '../context/HabitsContext';
import type { Movimiento, Deuda, Presupuesto } from '../types/finance';
import type { BujoEntry, BujoCheckIn } from '../context/BujoContext';
import type {
  HealthProfile,
  Medication,
  Appointment,
  ClinicalRecord,
} from '../context/HealthContext';
import type { Client } from '../context/ClientsContext';
import type { Goal } from '../context/GoalsContext';
import type { ShoppingProduct } from '../context/ShoppingContext';
import type { PomodoroSessionRecord } from '../context/PomodoroContext';
import type { Message } from '../context/MessagesContext';
import type { Auditoria } from './AuditoriaService';
import type { BandDayData, BandAlarm } from '../context/BandContext';

// ── Utilidades ──────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20261013);
const rand = (min: number, max: number) => Math.round(min + rnd() * (max - min));
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];

function shiftDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/** YYYY-MM-DD local con desplazamiento de días. */
function dayISO(days = 0): string {
  const d = shiftDate(days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO completo (para createdAt, timestamps, etc.). */
function iso(days = 0, hour = 9, minute = 0): string {
  const d = shiftDate(days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function write(key: string, value: unknown): void {
  storage.setItem(key, JSON.stringify(value));
}

// ── Tareas y proyectos ──────────────────────────────────────────────────

const PROJECTS: Project[] = [
  { id: 'prj_portal', name: 'Portal de Clientes', color: '#16F0B5', description: 'Portal web, solicitudes y seguimiento de proyectos', client_id: 'cli_andes', archived: false, createdAt: iso(-45) },
  { id: 'prj_salud', name: 'App Móvil Salud', color: '#3ACDFF', description: 'App de medicamentos, citas e historial clínico', client_id: 'cli_clinica', archived: false, createdAt: iso(-32) },
  { id: 'prj_erp', name: 'Automatización ERP', color: '#F59E0B', description: 'Integración de facturación, stock y reportes', client_id: 'cli_retail', archived: false, createdAt: iso(-24) },
  { id: 'prj_marca', name: 'Marca & Diseño', color: '#F43F5E', description: 'Identidad visual y material gráfico (cerrado)', client_id: null, archived: true, createdAt: iso(-120) },
];

type TaskSeed = Partial<Task> & { title: string };

const TASK_SEEDS: TaskSeed[] = [
  { title: 'Diseñar flujo de autenticación', project_id: 'prj_portal', priority: 'high', status: 'completed', dueDate: dayISO(-4), category: 'Diseño', tags: ['ui', 'auth'], estimatedPomodoros: 4, completedPomodoros: 4, timeSpentSeconds: 5400 },
  { title: 'Implementar login con JWT', project_id: 'prj_portal', priority: 'urgent', status: 'in-progress', dueDate: dayISO(0), category: 'Desarrollo', tags: ['backend', 'auth'], estimatedPomodoros: 6, completedPomodoros: 3, timeSpentSeconds: 4200, isBillable: true, price: 450000 },
  { title: 'Corregir bug de sincronización offline', project_id: 'prj_portal', priority: 'urgent', status: 'pending', dueDate: dayISO(-1), category: 'Bug', tags: ['sync'], estimatedPomodoros: 3 },
  { title: 'Crear landing del portal', project_id: 'prj_portal', priority: 'medium', status: 'pending', dueDate: dayISO(2), category: 'Diseño', tags: ['landing'], estimatedPomodoros: 5 },
  { title: 'Maquetar catálogo de secciones', project_id: 'prj_portal', priority: 'medium', status: 'completed', dueDate: dayISO(-6), category: 'Diseño', tags: ['docs'], estimatedPomodoros: 3, completedPomodoros: 3, timeSpentSeconds: 3600 },
  { title: 'Deploy a producción', project_id: 'prj_portal', priority: 'urgent', status: 'pending', dueDate: dayISO(5), category: 'Operaciones', tags: ['deploy'], estimatedPomodoros: 2 },
  { title: 'Optimizar queries del dashboard', project_id: 'prj_portal', priority: 'medium', status: 'pending', dueDate: dayISO(9), category: 'Desarrollo', tags: ['performance'], estimatedPomodoros: 4 },
  { title: 'Reunión de kickoff con cliente', project_id: 'prj_erp', priority: 'high', status: 'completed', dueDate: dayISO(-7), category: 'Administración', tags: ['reunión'], estimatedPomodoros: 2, completedPomodoros: 2, timeSpentSeconds: 2700 },
  { title: 'Mapear procesos de facturación', project_id: 'prj_erp', priority: 'medium', status: 'in-progress', dueDate: dayISO(1), category: 'Análisis', tags: ['procesos'], estimatedPomodoros: 5, completedPomodoros: 2, timeSpentSeconds: 3000 },
  { title: 'Integrar API de facturación SII', project_id: 'prj_erp', priority: 'high', status: 'pending', dueDate: dayISO(4), category: 'Desarrollo', tags: ['api'], estimatedPomodoros: 8 },
  { title: 'Pruebas de importación de datos', project_id: 'prj_erp', priority: 'low', status: 'pending', dueDate: dayISO(7), category: 'QA', tags: ['tests'], estimatedPomodoros: 3 },
  { title: 'Capacitar al cliente en el ERP', project_id: 'prj_erp', priority: 'medium', status: 'pending', dueDate: dayISO(12), category: 'Soporte', tags: ['capacitación'], estimatedPomodoros: 4 },
  { title: 'Pantalla de historial clínico', project_id: 'prj_salud', priority: 'high', status: 'pending', dueDate: dayISO(3), category: 'Desarrollo', tags: ['frontend'], estimatedPomodoros: 6 },
  { title: 'Diseñar onboarding de la app', project_id: 'prj_salud', priority: 'medium', status: 'in-progress', dueDate: dayISO(2), category: 'Diseño', tags: ['onboarding'], estimatedPomodoros: 4, completedPomodoros: 1, timeSpentSeconds: 1500 },
  { title: 'Notificaciones push de medicamentos', project_id: 'prj_salud', priority: 'urgent', status: 'pending', dueDate: dayISO(0), category: 'Desarrollo', tags: ['mobile'], estimatedPomodoros: 5 },
  { title: 'Revisar feedback de usuarios beta', project_id: 'prj_salud', priority: 'low', status: 'pending', dueDate: dayISO(6), category: 'Producto', tags: ['feedback'], estimatedPomodoros: 2 },
  { title: 'Preparar propuesta comercial', project_id: null, priority: 'urgent', status: 'pending', dueDate: dayISO(0), category: 'Administración', tags: ['ventas'], estimatedPomodoros: 3, isBillable: false },
  { title: 'Actualizar presupuesto del mes', project_id: null, priority: 'medium', status: 'completed', dueDate: dayISO(-3), category: 'Finanzas', tags: ['presupuesto'], estimatedPomodoros: 2, completedPomodoros: 2, timeSpentSeconds: 1800 },
  { title: 'Pagar dominio y hosting', project_id: null, priority: 'high', status: 'pending', dueDate: dayISO(1), category: 'Finanzas', tags: ['pagos'], estimatedPomodoros: 1 },
  { title: 'Redactar minuta de reunión', project_id: null, priority: 'low', status: 'completed', dueDate: dayISO(-2), category: 'Administración', tags: ['documentación'], estimatedPomodoros: 1, completedPomodoros: 1, timeSpentSeconds: 900 },
  { title: 'Escribir documentación de la API', project_id: 'prj_erp', priority: 'medium', status: 'pending', dueDate: dayISO(8), category: 'Documentación', tags: ['docs'], estimatedPomodoros: 4 },
  { title: 'Renovar licencia de diseño', project_id: null, priority: 'low', status: 'cancelled', dueDate: dayISO(10), category: 'Administración', tags: ['licencias'], estimatedPomodoros: 1 },
];

function buildTasks(): Task[] {
  return TASK_SEEDS.map((seed, i) => {
    const completed = seed.status === 'completed';
    const started = seed.status !== 'pending' && seed.status !== 'cancelled';
    return {
      id: `tsk_demo_${i}`,
      title: seed.title,
      description: `${seed.category} — ${seed.tags?.join(', ') ?? ''}`.trim(),
      project_id: seed.project_id ?? null,
      client_id: null,
      category: seed.category ?? 'General',
      priority: seed.priority ?? 'medium',
      status: seed.status ?? 'pending',
      isBillable: seed.isBillable ?? false,
      price: seed.price,
      dueDate: seed.dueDate ?? null,
      subtasks: [],
      tags: seed.tags ?? [],
      estimatedPomodoros: seed.estimatedPomodoros ?? 2,
      completedPomodoros: seed.completedPomodoros ?? 0,
      timeSpentSeconds: seed.timeSpentSeconds ?? 0,
      createdAt: iso(-(14 - i)),
      startedAt: started ? iso(-(10 - Math.min(i, 10))) : null,
      completedAt: completed ? iso(-Math.max(1, 6 - (i % 5))) : null,
      syncId: null,
      notes: '',
      observations: '',
    } as Task;
  });
}

// ── Hábitos ─────────────────────────────────────────────────────────────

const HABIT_DEFS = [
  { key: 'agua', name: 'Beber 2 litros de agua', description: 'Hidratarse durante el día', icon: '💧', color: '#3ACDFF', type: 'positive' as const, rate: 0.8 },
  { key: 'ejercicio', name: 'Ejercicio 30 minutos', description: 'Actividad física diaria', icon: '🏃', color: '#16F0B5', type: 'positive' as const, rate: 0.65 },
  { key: 'leer', name: 'Leer 20 minutos', description: 'Lectura antes de dormir', icon: '📚', color: '#F59E0B', type: 'positive' as const, rate: 0.75 },
  { key: 'meditar', name: 'Meditación', description: '10 minutos de respiración', icon: '🧘', color: '#8B5CF6', type: 'positive' as const, rate: 0.55 },
  { key: 'sueno', name: 'Dormir antes de las 23:30', description: 'Horario de sueño regular', icon: '😴', color: '#2DD4BF', type: 'positive' as const, rate: 0.6 },
  { key: 'azucar', name: 'Azúcar refinada', description: 'Evitar azúcar procesada', icon: '🍬', color: '#F43F5E', type: 'negative' as const, rate: 0.12 },
];

function buildHabits(): Habit[] {
  return HABIT_DEFS.map((def, idx) => {
    const startDate = dayISO(-45);
    const completions: Habit['completions'] = [];

    for (let back = 45; back >= 0; back--) {
      const date = dayISO(-back);
      if (def.type === 'negative') {
        if (rnd() < def.rate) {
          completions.push({ date, timestamp: iso(-back, 20, 15), isViolation: true });
        }
        continue;
      }
      // "Leer" no se marca hoy → genera la notificación de racha activa.
      const skipToday = def.key === 'leer' && back === 0;
      const recent = back > 0 && back <= 5;
      const done = skipToday ? false : recent ? rnd() < 0.9 : rnd() < def.rate;
      if (done) completions.push({ date, timestamp: iso(-back, 8 + idx, 30) });
    }

    return {
      id: `hab_${def.key}`,
      name: def.name,
      description: def.description,
      icon: def.icon,
      color: def.color,
      type: def.type,
      frequency: 'daily',
      targetDays: [0, 1, 2, 3, 4, 5, 6],
      completions,
      startDate,
      archived: false,
      syncId: null,
    };
  });
}

// ── Finanzas ────────────────────────────────────────────────────────────

type MovSeed = [daysAgo: number, type: Movimiento['type'], amount: number, description: string, categoryId: string, status: Movimiento['status']];

const MOV_SEEDS: MovSeed[] = [
  [-2, 'ingreso', 1250000, 'Venta portal web — Cliente Andes', 'ventas', 'Emitida'],
  [-4, 'gasto', 320000, 'Renta oficina', 'renta', 'Pagada'],
  [-6, 'ingreso', 480000, 'Consultoría mensual', 'servicios', 'Emitida'],
  [-5, 'gasto', 150000, 'Publicidad Meta Ads', 'marketing', 'Pagada'],
  [-7, 'gasto', 45000, 'Suscripción Figma', 'software', 'Pagada'],
  [-9, 'gasto', 89000, 'Servidor cloud', 'software', 'Pagada'],
  [-11, 'ingreso', 350000, 'Mantención app salud', 'servicios', 'Emitida'],
  [-12, 'gasto', 260000, 'Colaborador freelance', 'operaciones', 'Pagada'],
  [-16, 'ingreso', 180000, 'Licencias de software', 'otros_ingresos', 'Emitida'],
  [-15, 'gasto', 210000, 'Impuestos IVA', 'otros', 'Pagada'],
  [-19, 'gasto', 38000, 'Útiles de oficina', 'operaciones', 'Pagada'],
  [-21, 'ingreso', 900000, 'Proyecto ERP — hito 1', 'ventas', 'Emitida'],
  [-23, 'gasto', 42000, 'Internet y telefonía', 'operaciones', 'Pagada'],
  [-26, 'gasto', 75000, 'Diseño de material gráfico', 'marketing', 'Pendiente'],
  [-34, 'ingreso', 620000, 'Venta de consultoría (mes anterior)', 'ventas', 'Emitida'],
  [-37, 'gasto', 320000, 'Renta oficina (mes anterior)', 'renta', 'Pagada'],
  [-41, 'gasto', 132000, 'Campaña Google Ads', 'marketing', 'Pagada'],
  [-45, 'ingreso', 410000, 'Soporte mensual', 'servicios', 'Emitida'],
  [-49, 'gasto', 51000, 'Suscripciones (mes anterior)', 'software', 'Pagada'],
  [-64, 'ingreso', 780000, 'Proyecto marca & diseño', 'ventas', 'Emitida'],
  [-68, 'gasto', 295000, 'Renta oficina', 'renta', 'Pagada'],
  [-75, 'gasto', 120000, 'Equipo de oficina', 'operaciones', 'Pagada'],
];

function buildMovimientos(): Movimiento[] {
  return MOV_SEEDS.map(([daysAgo, type, amount, description, categoryId, status], i) => ({
    id: `mov_demo_${i}`,
    type,
    amount,
    description,
    date: dayISO(daysAgo),
    accountId: 'acc_main',
    categoryId,
    status,
    paymentMethod: type === 'gasto' ? 'Transferencia' : 'Transferencia',
    tags: [],
    attachments: [],
    reconciliationStatus: status === 'Pagada' ? 'Conciliado' : 'No Registrado',
  }));
}

function buildDeudas(): Deuda[] {
  return [
    { id: 'deuda_andes', type: 'Por Cobrar', entityId: 'cli_andes', entityName: 'Comercial Andes SpA', amount: 1500000, paidAmount: 500000, dueDate: dayISO(5), status: 'Pendiente', priority: 'Alta', projectId: 'prj_portal', tags: [] },
    { id: 'deuda_clinica', type: 'Por Cobrar', entityId: 'cli_clinica', entityName: 'Clínica Norte', amount: 780000, paidAmount: 0, dueDate: dayISO(-3), status: 'Atrasada', priority: 'Alta', projectId: 'prj_salud', tags: [] },
    { id: 'deuda_retail', type: 'Por Cobrar', entityId: 'cli_retail', entityName: 'Retail Sur', amount: 350000, paidAmount: 350000, dueDate: dayISO(-10), status: 'Pagada', priority: 'Media', tags: [] },
    { id: 'deuda_freelance', type: 'Por Pagar', entityId: 'prov_freelance', entityName: 'Estudio Ferrer (Diseño)', amount: 420000, paidAmount: 200000, dueDate: dayISO(8), status: 'Pendiente', priority: 'Media', tags: [] },
    { id: 'deuda_hosting', type: 'Por Pagar', entityId: 'prov_hosting', entityName: 'Proveedor Hosting', amount: 96000, paidAmount: 0, dueDate: dayISO(2), status: 'Pendiente', priority: 'Baja', tags: [] },
  ];
}

function buildPresupuestos(): Presupuesto[] {
  return [
    { id: 'bud_renta', categoryId: 'renta', amountLimit: 400000, period: 'Mensual', spentAmount: 0 },
    { id: 'bud_marketing', categoryId: 'marketing', amountLimit: 300000, period: 'Mensual', spentAmount: 0 },
    { id: 'bud_software', categoryId: 'software', amountLimit: 200000, period: 'Mensual', spentAmount: 0 },
    { id: 'bud_operaciones', categoryId: 'operaciones', amountLimit: 500000, period: 'Mensual', spentAmount: 0 },
  ];
}

// ── Bullet Journal ──────────────────────────────────────────────────────

const BUJO_TEMPLATES: { type: BujoEntry['type']; content: string; tags: string[]; time?: string }[] = [
  { type: 'completed', content: 'Revisar pull request del portal', tags: ['dev'] },
  { type: 'note', content: 'Idea: automatizar el reporte semanal con plantillas', tags: ['idea'] },
  { type: 'event', content: 'Reunión diaria con el equipo', tags: ['equipo'], time: '09:30' },
  { type: 'task', content: 'Preparar avance semanal para el cliente', tags: ['admin'] },
  { type: 'completed', content: 'Actualizar tablero de tareas', tags: ['gestión'] },
  { type: 'note', content: 'Pendiente: cotizar licencias del próximo trimestre', tags: ['finanzas'] },
  { type: 'event', content: 'Entrega de avance al cliente', tags: ['cliente'], time: '16:00' },
  { type: 'scheduled', content: 'Bloque profundo de desarrollo (2h)', tags: ['focus'], time: '10:00' },
  { type: 'note', content: 'La app de salud necesita mejorar el onboarding', tags: ['producto'] },
  { type: 'completed', content: 'Cerrar importación de movimientos', tags: ['finanzas'] },
];

function buildBujo(): { entries: BujoEntry[]; moods: Record<string, number>; checkins: Record<string, BujoCheckIn> } {
  const entries: BujoEntry[] = [];
  const moods: Record<string, number> = {};
  const checkins: Record<string, BujoCheckIn> = {};

  for (let back = 14; back >= 0; back--) {
    const date = dayISO(-back);
    const count = back === 0 ? 3 : rand(2, 4);
    for (let i = 0; i < count; i++) {
      const tpl = BUJO_TEMPLATES[(back * 3 + i) % BUJO_TEMPLATES.length];
      entries.push({
        id: `bjo_${back}_${i}`,
        type: tpl.type,
        content: tpl.content,
        date,
        timestamp: iso(-back, 8 + i * 2, (i * 17) % 60),
        tags: tpl.tags,
        time: tpl.time,
        isFavorite: back % 7 === 0 && i === 0,
      });
    }

    moods[date] = back === 0 ? 4 : rand(2, 5);

    if (back <= 7) {
      checkins[date] = {
        date,
        dayRating: moods[date],
        energyLevel: rand(5, 9),
        medsTaken: back % 3 !== 0,
        readBook: back % 2 === 0,
        exercised: back % 3 === 0,
        drankAlcohol: false,
        notes: back === 0 ? 'Buen ritmo, toca cerrar el módulo de finanzas.' : undefined,
        timestamp: iso(-back, 21, 30),
      };
    }
  }

  return { entries, moods, checkins };
}

// ── Salud ───────────────────────────────────────────────────────────────

function buildHealth(): {
  profiles: HealthProfile[];
  medications: Medication[];
  appointments: Appointment[];
  clinicalRecords: ClinicalRecord[];
} {
  const profiles: HealthProfile[] = [
    {
      id: 'profile_me',
      name: 'Rodrigo Quincha',
      relation: 'principal',
      avatar: '🧑‍💻',
      bloodType: 'O+',
      allergies: ['Penicilina'],
      chronicConditions: ['Hipertensión leve'],
      emergencyContacts: [{ id: 'ec_1', name: 'María Quincha', relation: 'Madre', phone: '+56 9 8811 2233' }],
    },
    {
      id: 'profile_fam',
      name: 'Camila Rojas',
      relation: 'familiar',
      avatar: '👩',
      bloodType: 'A-',
      allergies: ['Frutos secos'],
      chronicConditions: ['Asma'],
      emergencyContacts: [{ id: 'ec_2', name: 'Rodrigo Quincha', relation: 'Pareja', phone: '+56 9 5544 3322' }],
    },
  ];

  const today = new Date();
  const doseToday = (hour: number) => {
    const d = new Date(today);
    d.setHours(hour, 0, 0, 0);
    return { id: id('dose'), timestamp: d.toISOString(), scheduledTime: `${pad(hour)}:00` };
  };

  const medications: Medication[] = [
    { id: 'med_losartan', profile_id: 'profile_me', name: 'Losartán 50 mg', dose: '1 comprimido', frequency: 'Diaria', schedule: ['08:00'], stockTotal: 30, stockRemaining: 4, doseHistory: [doseToday(8)], color: '#F43F5E', notes: 'Tomar con el desayuno.' },
    { id: 'med_metformina', profile_id: 'profile_me', name: 'Metformina 850 mg', dose: '1 comprimido', frequency: '2 veces al día', schedule: ['08:00', '20:00'], stockTotal: 60, stockRemaining: 24, doseHistory: [doseToday(8)], color: '#3ACDFF', notes: '' },
    { id: 'med_vitd', profile_id: 'profile_me', name: 'Vitamina D 1000 UI', dose: '1 cápsula', frequency: 'Diaria', schedule: ['09:00'], stockTotal: 60, stockRemaining: 48, doseHistory: [], color: '#F59E0B', notes: '' },
    { id: 'med_salbutamol', profile_id: 'profile_fam', name: 'Salbutamol inhalador', dose: '2 puff', frequency: 'Según necesidad', schedule: ['07:00'], stockTotal: 20, stockRemaining: 3, doseHistory: [], color: '#8B5CF6', notes: 'Rescatador.' },
  ];

  const appointments: Appointment[] = [
    { id: 'apt_cardio', profile_id: 'profile_me', specialty: 'Cardiología', professional: 'Dr. Sergio Valdés', clinic: 'Clínica Santa María', dateTime: iso(3, 10, 30), notes: 'Control de presión arterial.', status: 'scheduled' },
    { id: 'apt_control', profile_id: 'profile_me', specialty: 'Medicina general', professional: 'Dra. Paulina Reyes', clinic: 'Centro Médico Quincha', dateTime: iso(9, 16, 0), notes: 'Control anual.', status: 'scheduled' },
    { id: 'apt_neumo', profile_id: 'profile_fam', specialty: 'Neumología', professional: 'Dr. Iván Contreras', clinic: 'Hospital Barros Luco', dateTime: iso(5, 11, 15), notes: 'Control de asma.', status: 'scheduled' },
    { id: 'apt_derm', profile_id: 'profile_me', specialty: 'Dermatología', professional: 'Dra. Ana Fuentes', clinic: 'Centro Médico Quincha', dateTime: iso(-12, 9, 0), notes: 'Revisión de lunares.', status: 'completed' },
  ];

  const clinicalRecords: ClinicalRecord[] = [
    { id: 'rec_1', profile_id: 'profile_me', date: iso(-30), title: 'Control anual', diagnosis: 'Hipertensión leve, estable con tratamiento.', professional: 'Dra. Paulina Reyes', clinic: 'Centro Médico Quincha', attachments: ['informe-control.pdf', 'recetas.png'] },
    { id: 'rec_2', profile_id: 'profile_me', date: iso(-75), title: 'Exámenes de sangre', diagnosis: 'Perfil lipídico dentro de rangos normales.', professional: 'Laboratorio Central', clinic: 'Laboratorio Central', attachments: ['laboratorio.pdf'] },
    { id: 'rec_3', profile_id: 'profile_fam', date: iso(-48), title: 'Control respiratorio', diagnosis: 'Asma controlada, mantener inhalador.', professional: 'Dr. Iván Contreras', clinic: 'Hospital Barros Luco', attachments: [] },
  ];

  return { profiles, medications, appointments, clinicalRecords };
}

// ── Clientes, metas, compras ────────────────────────────────────────────

function buildClients(): Client[] {
  return [
    { id: 'cli_andes', name: ' Javier Peña', company: 'Comercial Andes SpA', email: 'contacto@andes.cl', phone: '+56 2 2345 6789', color: '#16F0B5', archived: false, createdAt: iso(-45) },
    { id: 'cli_clinica', name: 'Paula Herrera', company: 'Clínica Norte', email: 'pherrera@clinicanorte.cl', phone: '+56 2 2765 4321', color: '#3ACDFF', archived: false, createdAt: iso(-32) },
    { id: 'cli_retail', name: 'Diego Soto', company: 'Retail Sur', email: 'dsoto@retailsur.cl', phone: '+56 9 7788 9900', color: '#F59E0B', archived: false, createdAt: iso(-24) },
    { id: 'cli_muni', name: 'Carla Bustos', company: 'Municipalidad Lo Prado', email: 'cbustos@loprado.cl', phone: '+56 2 2111 5566', color: '#8B5CF6', archived: false, createdAt: iso(-15) },
    { id: 'cli_ferrer', name: 'Tomas Ferrer', company: 'Estudio Ferrer', email: 'hola@estudioferrer.cl', phone: '+56 9 4433 2211', color: '#F43F5E', archived: false, createdAt: iso(-8) },
  ];
}

function buildGoals(): Goal[] {
  return [
    { id: 'goal_clientes', title: 'Cerrar 3 clientes nuevos', description: 'Prospección comercial del trimestre', timeframe: 'quarterly', progress: 66, status: 'active', createdAt: iso(-40) },
    { id: 'goal_portal', title: 'Lanzar portal v2', description: 'Portal de clientes con seguimiento en tiempo real', timeframe: 'yearly', progress: 85, status: 'active', createdAt: iso(-120) },
    { id: 'goal_ahorro', title: 'Ahorro de $4.000.000', description: 'Fondo de emergencia del semestre', timeframe: 'monthly', progress: 55, status: 'active', createdAt: iso(-20) },
    { id: 'goal_correr', title: 'Correr 100 km este mes', description: 'Objetivo de actividad física', timeframe: 'monthly', progress: 72, status: 'active', createdAt: iso(-12) },
    { id: 'goal_docs', title: 'Documentar la API', description: 'Guía de endpoints y ejemplos', timeframe: 'weekly', progress: 100, status: 'completed', createdAt: iso(-16), completedAt: iso(-2) },
    { id: 'goal_cert', title: 'Certificación cloud', description: 'Preparar y rendir el examen', timeframe: 'quarterly', progress: 30, status: 'active', createdAt: iso(-60) },
  ];
}

function buildShopping(): ShoppingProduct[] {
  const items: [string, number, number, string, string][] = [
    ['Teclado mecánico RGB', 54990, 3990, 'PC Factory', 'https://www.pcfactory.cl/teclado-mecanico'],
    ['Monitor 27" QHD', 249990, 0, 'Paris', 'https://www.paris.cl/monitor-27'],
    ['Silla ergonómica', 189990, 12990, 'Falabella', 'https://www.falabella.cl/silla-ergonomica'],
    ['Audífonos inalámbricos', 79990, 0, 'Mercado Libre', 'https://www.mercadolibre.cl/audifonos'],
    ['Webcam Logitech C920', 64990, 2990, 'PC Factory', 'https://www.pcfactory.cl/webcam'],
    ['Notebook SSD 512 GB', 649990, 0, 'Venta Flash', 'https://www.ventaflash.cl/notebook'],
    ['Lámpara LED escritorio', 34990, 1990, 'Mercado Libre', 'https://www.mercadolibre.cl/lampara'],
    ['Mouse inalámbrico', 29990, 0, 'PC Factory', 'https://www.pcfactory.cl/mouse'],
  ];
  return items.map(([name, priceBase, shippingCost, storeName, url], i) => ({
    id: `shop_demo_${i}`,
    url,
    name,
    imageUrl: '',
    priceBase,
    shippingCost,
    storeName,
    timestamp: iso(-(i + 1), 11, 15),
  }));
}

// ── Pomodoro ────────────────────────────────────────────────────────────

function buildPomodoros(): PomodoroSessionRecord[] {
  const sessions: PomodoroSessionRecord[] = [];
  const projects = ['Portal de Clientes', 'App Móvil Salud', 'Automatización ERP'];
  const tasks = [
    'Implementar login con JWT',
    'Diseñar onboarding de la app',
    'Mapear procesos de facturación',
    'Optimizar queries del dashboard',
    'Notificaciones push de medicamentos',
  ];
  let n = 0;
  for (let back = 7; back >= 0; back--) {
    const count = back === 0 ? 3 : rand(2, 5);
    for (let i = 0; i < count; i++) {
      sessions.push({
        id: `pomo_demo_${n++}`,
        type: 'work',
        project: pick(projects),
        task: pick(tasks),
        durationMinutes: i % 3 === 2 ? 50 : 25,
        notes: i % 4 === 0 ? 'Sesión enfocada, sin distracciones.' : '',
        device: 'Web',
        timestamp: iso(-back, 9 + i, 5),
      });
    }
  }
  return sessions.reverse();
}

// ── Mensajes ────────────────────────────────────────────────────────────

function buildMessages(): Message[] {
  return [
    { id: 'msg_1', sender: 'Camila Rojas', company: 'Quincha', text: '¿Cómo va el portal? Necesitamos el avance antes del viernes.', time: 'Hace 12 min', unread: true },
    { id: 'msg_2', sender: 'Javier Peña', company: 'Comercial Andes', text: 'Perfecto, apruebo la propuesta. Podemos partir la próxima semana.', time: 'Hace 1 h', unread: true },
    { id: 'msg_3', sender: 'Paula Herrera', company: 'Clínica Norte', text: 'Te envío los exámenes por correo para la app de salud.', time: 'Hace 3 h', unread: true },
    { id: 'msg_4', sender: 'Diego Soto', company: 'Retail Sur', text: 'La importación del ERP trajo 2 duplicados, ¿los revisamos?', time: 'Ayer', unread: false },
    { id: 'msg_5', sender: 'Estudio Ferrer', company: 'Diseño', text: 'Te dejo las dos opciones de logo en el drive.', time: 'Ayer', unread: false },
    { id: 'msg_6', sender: 'Carla Bustos', company: 'Municipalidad Lo Prado', text: '¿Tienen disponibilidad para una reunión el lunes?', time: 'Hace 2 días', unread: false },
    { id: 'msg_7', sender: 'Tomas Ferrer', company: 'Estudio Ferrer', text: 'Listo el set de íconos para el portal.', time: 'Hace 3 días', unread: false },
    { id: 'msg_8', sender: 'Sistema', company: 'Quincha', text: 'Respaldo de base de datos completado correctamente.', time: 'Hace 4 días', unread: false },
  ];
}

// ── Registro de auditorías ──────────────────────────────────────────────

function buildAuditorias(): Auditoria[] {
  const seed: [number, string, string, string, Auditoria['tipo'], string][] = [
    [0, 'Actualización de perfil', 'Cambio de nombre visible en el dashboard', 'Se actualizó el campo userName del usuario administrador desde Ajustes.', 'cambio', 'admin'],
    [0, 'Cierre de sesión', 'Sesión finalizada en dispositivo móvil', 'Token de sesión revocado tras 30 minutos de inactividad.', 'seguridad', 'admin'],
    [1, 'Alta de tarea', 'Se creó la tarea "Implementar login con JWT"', 'Tarea asociada al proyecto Portal de Clientes con prioridad urgente.', 'cambio', 'admin'],
    [1, 'Revisión de permisos', 'Verificación de rol super-admin', 'Se comprobó el acceso a la sección de gestión de usuarios.', 'revision', 'sistema'],
    [2, 'Optimización de base de datos', 'Índice agregado en movimientos financieros', 'Consulta de resumen mensual bajó de 820 ms a 95 ms.', 'optimizacion', 'sistema'],
    [3, 'Importación de datos', 'Importación masiva de clientes (5 registros)', 'Archivo CSV procesado sin filas rechazadas.', 'cambio', 'admin'],
    [4, 'Soporte técnico', 'Incidente de sincronización resuelto', 'Se reinstaló la cola de sincronización offline del equipo de ventas.', 'soporte', 'soporte'],
    [5, 'Cambio de contraseña', 'Actualización de credenciales', 'Contraseña actualizada desde el módulo de Ajustes (AJUSTES-03).', 'seguridad', 'admin'],
    [6, 'Respaldo automático', 'Backup diario completado', 'Copia diaria de la base local almacenada correctamente.', 'optimizacion', 'sistema'],
    [8, 'Revisión de auditoría', 'Auditoría trimestral de accesos', 'Revisión de los 128 eventos registrados en el período.', 'revision', 'admin'],
  ];
  return seed.map(([daysAgo, titulo, resumen, detalle, tipo, autor], i) => ({
    id: `audit_demo_${i}`,
    fecha: iso(-daysAgo, 8 + (i % 9), (i * 7) % 60),
    titulo,
    resumen,
    detalle,
    tipo,
    autor,
  }));
}

// ── Mi Band ─────────────────────────────────────────────────────────────

function buildBand(): { days: BandDayData[]; alarms: BandAlarm[] } {
  const days: BandDayData[] = [];
  for (let back = 89; back >= 0; back--) {
    const steps = rand(3800, 13500);
    const workouts: BandDayData['workouts'] = [];
    if (back % 3 === 0) {
      workouts.push({
        id: `wo_demo_${back}`,
        mode: back % 6 === 0 ? 'running' : 'walking',
        durationMin: rand(22, 55),
        calories: rand(140, 420),
        distanceKm: Number((steps * 0.0007).toFixed(2)),
        heartRateAvg: rand(112, 145),
        heartRateMax: rand(148, 172),
      });
    }
    const avg = rand(62, 78);
    days.push({
      date: dayISO(-back),
      steps,
      distanceKm: Number((steps * 0.0007).toFixed(2)),
      calories: rand(320, 780),
      activeMinutes: rand(18, 96),
      heartRate: { avg, resting: rand(50, 61), min: rand(46, 56), max: rand(118, 152) },
      spo2: rand(95, 98),
      stress: rand(18, 62),
      pai: rand(28, 145),
      energy: rand(45, 92),
      sleep: { deepMin: rand(85, 165), lightMin: rand(240, 360), remMin: rand(70, 140), awakeMin: rand(5, 40) },
      workouts,
      lastSyncAt: null,
    });
  }

  const alarms: BandAlarm[] = [
    { id: 'alarm_1', time: '06:30', label: 'Despertar', repeatDays: [1, 2, 3, 4, 5], enabled: true, smartWake: true, snooze: true },
    { id: 'alarm_2', time: '08:00', label: 'Tomar medicamentos', repeatDays: [0, 1, 2, 3, 4, 5, 6], enabled: true, smartWake: false, snooze: true },
    { id: 'alarm_3', time: '21:30', label: 'Cierre del día', repeatDays: [], enabled: false, smartWake: false, snooze: false },
  ];

  return { days, alarms };
}

// ── Solicitudes del portal ──────────────────────────────────────────────

function buildPortalRequests() {
  return [
    { id: 'REQ-483921', name: 'Marcelo Díaz', company: 'Transportes Andes', email: 'mdiaz@transportesandes.cl', serviceType: 'Desarrollo Web', description: 'Portal de seguimiento de envíos con login de clientes.', budget: '$3.000.000 - $5.000.000', status: 'received', submittedAt: new Date().toLocaleDateString() },
    { id: 'REQ-291847', name: 'Fernanda Vera', company: 'Clínica Sur', email: 'fvera@clinicasur.cl', serviceType: 'App Móvil', description: 'App de recordatorios de medicamentos y citas.', budget: '$5.000.000 - $8.000.000', status: 'review', submittedAt: shiftDate(-3).toLocaleDateString() },
    { id: 'REQ-774205', name: 'Luis Torres', company: 'Empaque Ltda', email: 'ltorres@empaqueltda.cl', serviceType: 'Automatización', description: 'Automatizar facturación y stock con el ERP actual.', budget: '$8.000.000+', status: 'received', submittedAt: shiftDate(-6).toLocaleDateString() },
  ];
}

// ── Carga principal ─────────────────────────────────────────────────────

const SYNCED_MODULES = [
  'tasks',
  'habits',
  'finance',
  'budgets',
  'bujo',
  'clients',
  'goals',
  'health',
  'messages',
  'pomodoro',
  'shopping',
  'band',
  'registro',
];

/**
 * Escribe datos de ejemplo en todos los módulos y recarga la app.
 * Reemplaza lo que haya en local (se pide confirmación antes de llamar).
 */
export function loadDemoData(): void {
  const bujo = buildBujo();
  const health = buildHealth();
  const band = buildBand();

  write('quincha_projects_v2', PROJECTS);
  write('quincha_tasks_v2', buildTasks());
  write('quincha_habits_v2', buildHabits());
  write('quincha_finance_movimientos_v2', buildMovimientos());
  write('quincha_finance_deudas_v2', buildDeudas());
  write('quincha_finance_budgets', buildPresupuestos());
  write('quincha_bujo_entries_v2', bujo.entries);
  write('quincha_bujo_moods_v2', bujo.moods);
  write('quincha_bujo_checkins_v2', bujo.checkins);
  write('quincha_health_data_v2', health);
  write('quincha_clients_v2', buildClients());
  write('quincha_goals_v2', buildGoals());
  write('quincha_shopping_products_v2', buildShopping());
  write('quincha_pomodoro_logs_v2', buildPomodoros());
  write('quincha_messages_v2', buildMessages());
  write('quincha_read_notifications_v2', []);
  write('quincha_auditorias_v2', buildAuditorias());
  write('quincha_band_miband5_v2', band.days);
  write('quincha_band_alarms_v3', band.alarms);
  write('quincha_band_source_v2', 'simulated');
  write('quincha_client_requests_v2', buildPortalRequests());

  // Marca los módulos como modificados para que el pull no los reemplace
  // con lo que haya en el servidor.
  SYNCED_MODULES.forEach((module) => DataSyncService.markDirty(module));

  window.setTimeout(() => window.location.reload(), 250);
}
