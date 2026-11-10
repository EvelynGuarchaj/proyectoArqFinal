import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/config/baseDatos';
import { clienteRedis } from '../../src/config/redis';
import * as servicioSalud from '../../src/servicios/servicioSalud';
import { app } from '../ayudantes';

// Se simulan la base de datos y Redis para forzar fallas sin apagar los contenedores
vi.mock('../../src/config/baseDatos', () => ({
  prisma: { $queryRaw: vi.fn() },
}));

vi.mock('../../src/config/redis', () => ({
  clienteRedis: { ping: vi.fn() },
}));

const consultaBaseDatos = vi.mocked(prisma.$queryRaw);
const pingRedis = vi.mocked(clienteRedis.ping);

beforeEach(() => {
  vi.clearAllMocks();
  consultaBaseDatos.mockResolvedValue([{ '?column?': 1 }] as never);
  pingRedis.mockResolvedValue('PONG' as never);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('servicioSalud.obtenerEstado (degradado)', () => {
  it('marca la base de datos con error si la consulta falla', async () => {
    consultaBaseDatos.mockRejectedValue(new Error('sin conexión') as never);

    const estado = await servicioSalud.obtenerEstado();

    expect(estado).toEqual({ estado: 'degradado', api: 'ok', baseDatos: 'error', cache: 'ok' });
  });

  it('marca la caché con error si Redis falla', async () => {
    pingRedis.mockRejectedValue(new Error('sin conexión') as never);

    const estado = await servicioSalud.obtenerEstado();

    expect(estado).toEqual({ estado: 'degradado', api: 'ok', baseDatos: 'ok', cache: 'error' });
  });

  it('marca error si un servicio tarda más de 2 s en responder', async () => {
    vi.useFakeTimers();
    pingRedis.mockReturnValue(new Promise(() => {}) as never);

    const promesa = servicioSalud.obtenerEstado();
    await vi.advanceTimersByTimeAsync(2000);

    expect(await promesa).toMatchObject({ estado: 'degradado', cache: 'error' });
  });
});

describe('GET /api/v1/health (degradado)', () => {
  it('responde 503 si algún servicio falla', async () => {
    consultaBaseDatos.mockRejectedValue(new Error('sin conexión') as never);
    pingRedis.mockRejectedValue(new Error('sin conexión') as never);

    const respuesta = await request(app).get('/api/v1/health');

    expect(respuesta.status).toBe(503);
    expect(respuesta.body).toEqual({ estado: 'degradado', api: 'ok', baseDatos: 'error', cache: 'error' });
  });
});
