// DUEÑA: B
// Cliente del servicio de notificaciones (simulado con Mockoon).
// Nunca lanza errores: si Mockoon falla o tarda más de 2 s, solo se registra en consola.
import type { NotificacionReserva } from '@reservalab/shared';
import { entorno } from '../config/entorno';

const TIEMPO_MAXIMO_MS = 2000;

// Devuelve true si el servicio respondió 2xx (útil para las pruebas)
export async function enviar(notificacion: NotificacionReserva): Promise<boolean> {
  try {
    const respuesta = await fetch(`${entorno.urlNotificaciones}/notificaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notificacion),
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });
    if (!respuesta.ok) {
      console.error(`[notificaciones] respuesta inesperada: ${respuesta.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[notificaciones] no se pudo enviar la notificación:', error);
    return false;
  }
}
