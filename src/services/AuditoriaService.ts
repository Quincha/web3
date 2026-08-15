import { getProfile } from './ApiClient';
import { DataSyncService } from './DataSyncService';
import { storage } from './storage';

export const AUDIT_STORAGE_KEY = 'quincha_auditorias_v2';

export type AuditTipo = 'cambio' | 'revision' | 'seguridad' | 'optimizacion' | 'soporte' | 'otro';

export interface Auditoria {
  id: string;
  fecha: string;
  titulo: string;
  resumen: string;
  detalle: string;
  tipo: AuditTipo | string;
  autor: string;
}

export const TIPO_LABELS: Record<string, string> = {
  cambio: 'Cambio',
  revision: 'Revisión',
  seguridad: 'Seguridad',
  optimizacion: 'Optimización',
  soporte: 'Soporte',
  otro: 'Otro',
};

export const TIPO_COLORS: Record<string, string> = {
  cambio: 'var(--accent-green)',
  revision: 'var(--accent-cyan)',
  seguridad: 'var(--accent-danger)',
  optimizacion: 'var(--accent-warning)',
  soporte: 'var(--accent-bright)',
  otro: 'var(--text-muted)',
};

function readJSON(key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    /* cuota llena o modo privado: se ignora */
  }
}

export function getAuditorias(): Auditoria[] {
  const value = readJSON(AUDIT_STORAGE_KEY);
  return Array.isArray(value) ? (value as Auditoria[]) : [];
}

export function persistAuditorias(list: Auditoria[]): void {
  writeJSON(AUDIT_STORAGE_KEY, list);
  DataSyncService.markDirty('registro');
}

export function crearAuditoria(
  input: Omit<Auditoria, 'id' | 'fecha' | 'autor'>,
): Auditoria {
  return {
    ...input,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    fecha: new Date().toISOString(),
    autor: getProfile()?.username || 'sistema',
  };
}

export function agregarAuditoria(input: Omit<Auditoria, 'id' | 'fecha' | 'autor'>): Auditoria {
  const nueva = crearAuditoria(input);
  persistAuditorias([nueva, ...getAuditorias()]);
  return nueva;
}

export function actualizarAuditoria(id: string, changes: Partial<Auditoria>): void {
  persistAuditorias(getAuditorias().map((a) => (a.id === id ? { ...a, ...changes } : a)));
}

export function eliminarAuditoria(id: string): void {
  persistAuditorias(getAuditorias().filter((a) => a.id !== id));
}

export function formatearFecha(iso: string): { dia: string; hora: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { dia: iso, hora: '' };
  const dia = d.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    weekday: 'long',
  });
  const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  return { dia, hora };
}
