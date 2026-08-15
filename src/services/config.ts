import { isTauri } from '@tauri-apps/api/core';

/**
 * Base URL de la API.
 * - Web: relativa `/api` (servida por Express en el mismo origen, o proxy en dev).
 * - Desktop (Tauri): absoluta, contra el servidor de sincronización remoto.
 */
export const API_BASE =
  (isTauri() ? (import.meta.env.VITE_DESKTOP_API_BASE || 'https://quincha.cl') : '') +
  (import.meta.env.VITE_API_BASE || '/api');
