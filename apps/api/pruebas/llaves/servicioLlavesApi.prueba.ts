//dueño del archivo integrante c
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PREFIJO_LLAVE } from '@reservalab/shared';
import { hashSha256 } from '../../src/utilidades/hash';

// Simular las operaciones del repositorio
vi.mock('../../src/repositorios/repositorioLlavesApi', () => ({
  crear: vi.fn(),
  listar: vi.fn(),
  buscarPorId: vi.fn(),
  revocar: vi.fn(),
}));

import * as repositorioLlavesApi from '../../src/repositorios/repositorioLlavesApi';
import * as servicioLlavesApi from '../../src/servicios/servicioLlavesApi';

const fecha = new Date('2026-11-09T15:00:00.000Z');

// Simular una llave almacenada en la base de datos
function fila(cambios: Record<string, unknown> = {}) {
  return {
    id: 3,
    nombre: 'Pantalla edificio B',
    prefijo: 'rl_live_abcd',
    hashLlave: 'hash-secreto',
    permisos: ['read:now'],
    limitePorMinuto: 60,
    ultimoUso: null,
    revocada: false,
    creadaEn: fecha,
    ...cambios,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ========================================
// CREACIÓN DE LLAVES API
// ========================================

describe('servicioLlavesApi.crear', () => {
  it('genera una llave y guarda solamente su hash', async () => {
    vi.mocked(repositorioLlavesApi.crear).mockImplementation(
      async (datos) => fila(datos)
    );

    const creada = await servicioLlavesApi.crear({
      nombre: 'Pantalla edificio B',
      permisos: ['read:now'],
      limitePorMinuto: 30,
    });

    // Verificar formato de la llave
    expect(creada.llave).toMatch(
      new RegExp(`^${PREFIJO_LLAVE}[0-9a-f]{48}$`)
    );

    const guardado = vi.mocked(
      repositorioLlavesApi.crear
    ).mock.calls[0][0];

    // Debe almacenarse el hash, no la llave original
    expect(guardado.hashLlave).toBe(
      hashSha256(creada.llave)
    );

    expect(guardado.prefijo).toBe(
      creada.llave.slice(0, 12)
    );

    expect(guardado).not.toHaveProperty('llave');

    expect(guardado.limitePorMinuto).toBe(30);

    // La respuesta pública no debe incluir el hash
    expect(creada).not.toHaveProperty('hashLlave');
  });

  it('genera dos llaves distintas', async () => {
    vi.mocked(repositorioLlavesApi.crear).mockImplementation(
      async (datos) => fila(datos)
    );

    const primera = await servicioLlavesApi.crear({
      nombre: 'Uno',
      permisos: ['read:now'],
      limitePorMinuto: 60,
    });

    const segunda = await servicioLlavesApi.crear({
      nombre: 'Dos',
      permisos: ['read:now'],
      limitePorMinuto: 60,
    });

    expect(primera.llave).not.toBe(segunda.llave);
  });
});

// ========================================
// LISTADO DE LLAVES API
// ========================================

describe('servicioLlavesApi.listar', () => {
  it('devuelve llaves públicas sin hash y con fechas ISO', async () => {
    vi.mocked(repositorioLlavesApi.listar).mockResolvedValue([
      fila({ ultimoUso: fecha }),
    ]);

    const [llave] = await servicioLlavesApi.listar();

    expect(llave).not.toHaveProperty('hashLlave');

    expect(llave.creadaEn).toBe(
      '2026-11-09T15:00:00.000Z'
    );

    expect(llave.ultimoUso).toBe(
      '2026-11-09T15:00:00.000Z'
    );
  });
});

// ========================================
// REVOCACIÓN DE LLAVES API
// ========================================

describe('servicioLlavesApi.revocar', () => {
  it('devuelve 404 cuando la llave no existe', async () => {
    vi.mocked(
      repositorioLlavesApi.buscarPorId
    ).mockResolvedValue(null);

    await expect(
      servicioLlavesApi.revocar(99)
    ).rejects.toMatchObject({
      estado: 404,
      codigo: 'NO_ENCONTRADO',
    });

    expect(
      repositorioLlavesApi.revocar
    ).not.toHaveBeenCalled();
  });

  it('marca una llave como revocada', async () => {
    vi.mocked(
      repositorioLlavesApi.buscarPorId
    ).mockResolvedValue(fila());

    vi.mocked(
      repositorioLlavesApi.revocar
    ).mockResolvedValue(fila({ revocada: true }));

    const llave = await servicioLlavesApi.revocar(3);

    expect(
      repositorioLlavesApi.revocar
    ).toHaveBeenCalledWith(3);

    expect(llave.revocada).toBe(true);
  });
});
