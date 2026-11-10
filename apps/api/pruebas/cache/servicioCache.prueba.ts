// DUEÑA: B — Prueba unitaria de servicioCache (Redis simulado)
import { beforeEach, describe, expect, it, vi } from 'vitest';

const redisFalso = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  scan: vi.fn(),
  del: vi.fn(),
}));
vi.mock('../../src/config/redis', () => ({ clienteRedis: redisFalso }));

import { invalidarPorPatron, obtenerOGuardar } from '../../src/servicios/servicioCache';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('obtenerOGuardar', () => {
  it('MISS: ejecuta generar y guarda con SET ... EX ttl', async () => {
    redisFalso.get.mockResolvedValue(null);
    const generar = vi.fn().mockResolvedValue({ a: 1 });

    const resultado = await obtenerOGuardar('cache:prueba', generar, 60);

    expect(resultado).toEqual({ datos: { a: 1 }, cache: 'MISS' });
    expect(generar).toHaveBeenCalledOnce();
    expect(redisFalso.set).toHaveBeenCalledWith('cache:prueba', '{"a":1}', 'EX', 60);
  });

  it('HIT: devuelve lo guardado y no ejecuta generar', async () => {
    redisFalso.get.mockResolvedValue('{"a":1}');
    const generar = vi.fn();

    const resultado = await obtenerOGuardar('cache:prueba', generar);

    expect(resultado).toEqual({ datos: { a: 1 }, cache: 'HIT' });
    expect(generar).not.toHaveBeenCalled();
  });

  it('si generar lanza un error no se guarda nada', async () => {
    redisFalso.get.mockResolvedValue(null);
    await expect(obtenerOGuardar('cache:prueba', () => Promise.reject(new Error('404')))).rejects.toThrow('404');
    expect(redisFalso.set).not.toHaveBeenCalled();
  });

  it('si Redis falla, responde igual con MISS', async () => {
    redisFalso.get.mockRejectedValue(new Error('Redis caído'));
    redisFalso.set.mockRejectedValue(new Error('Redis caído'));
    const resultado = await obtenerOGuardar('cache:prueba', async () => 'ok');
    expect(resultado).toEqual({ datos: 'ok', cache: 'MISS' });
  });
});

describe('invalidarPorPatron', () => {
  it('recorre con SCAN hasta que el cursor vuelve a 0 y borra las claves', async () => {
    redisFalso.scan
      .mockResolvedValueOnce(['7', ['cache:disponibilidad:5:2030-01-15']])
      .mockResolvedValueOnce(['0', ['cache:disponibilidad:5:2030-01-16']]);

    await invalidarPorPatron('cache:disponibilidad:5:*');

    expect(redisFalso.scan).toHaveBeenNthCalledWith(1, '0', 'MATCH', 'cache:disponibilidad:5:*', 'COUNT', 100);
    expect(redisFalso.scan).toHaveBeenNthCalledWith(2, '7', 'MATCH', 'cache:disponibilidad:5:*', 'COUNT', 100);
    expect(redisFalso.del).toHaveBeenCalledTimes(2);
  });

  it('no llama a DEL si no hay claves', async () => {
    redisFalso.scan.mockResolvedValueOnce(['0', []]);
    await invalidarPorPatron('cache:espacios:*');
    expect(redisFalso.del).not.toHaveBeenCalled();
  });

  it('si Redis falla no lanza error', async () => {
    redisFalso.scan.mockRejectedValue(new Error('Redis caído'));
    await expect(invalidarPorPatron('cache:espacios:*')).resolves.toBeUndefined();
  });
});
