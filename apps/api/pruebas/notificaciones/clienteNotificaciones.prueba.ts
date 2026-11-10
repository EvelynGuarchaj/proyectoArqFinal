// DUEÑA: B — Cliente de notificaciones contra Mockoon (necesita `pnpm servicios`)
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NotificacionReserva } from '@reservalab/shared';
import { enviar } from '../../src/clientes/clienteNotificaciones';

const notificacion: NotificacionReserva = {
  tipo: 'reserva_confirmada',
  reservaId: 1,
  espacioId: 1,
  usuarioId: 2,
  inicio: '2030-01-15T14:00:00.000Z',
  fin: '2030-01-15T16:00:00.000Z',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('clienteNotificaciones.enviar', () => {
  it('integración: el contenedor de Mockoon responde 202', async () => {
    const espiaFetch = vi.spyOn(globalThis, 'fetch');
    const resultado = await enviar(notificacion);

    expect(resultado).toBe(true);
    const respuesta = await espiaFetch.mock.results[0].value;
    expect(respuesta.status).toBe(202);
    expect(await respuesta.json()).toEqual({ recibido: true });
  });

  it('envía POST /notificaciones con el cuerpo NotificacionReserva', async () => {
    const espiaFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 202 }));
    await enviar(notificacion);

    const [url, opciones] = espiaFetch.mock.calls[0];
    expect(String(url)).toMatch(/\/notificaciones$/);
    expect(opciones?.method).toBe('POST');
    expect(JSON.parse(String(opciones?.body))).toEqual(notificacion);
    expect(opciones?.signal).toBeInstanceOf(AbortSignal);
  });

  it('si el servicio falla no lanza error: devuelve false y registra en consola', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));
    const espiaConsola = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(enviar(notificacion)).resolves.toBe(false);
    expect(espiaConsola).toHaveBeenCalled();
  });

  it('si el servicio responde 500 devuelve false', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(enviar(notificacion)).resolves.toBe(false);
  });

  it('corta la espera a los 2 segundos', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_url, opciones) =>
        new Promise((_resolver, rechazar) => {
          opciones?.signal?.addEventListener('abort', () => rechazar(opciones.signal?.reason));
        }),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const antes = Date.now();
    await expect(enviar(notificacion)).resolves.toBe(false);
    const transcurrido = Date.now() - antes;
    expect(transcurrido).toBeGreaterThanOrEqual(1900);
    expect(transcurrido).toBeLessThan(4000);
  });
});
