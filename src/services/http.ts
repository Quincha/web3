/**
 * Transporte HTTP unificado.
 *
 * - En navegador (web): `window.fetch` (como hoy).
 * - En la app de escritorio (Tauri): fetch nativo del plugin HTTP, que evita
 *   problemas de CORS al hablar con el servidor remoto.
 */

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { isTauri } from '@tauri-apps/api/core';

export const httpFetch: typeof fetch = isTauri() ? (tauriFetch as unknown as typeof fetch) : fetch;

/** EventSource no funciona a través del fetch nativo de Tauri. */
export function isTauriRuntime(): boolean {
  return isTauri();
}
