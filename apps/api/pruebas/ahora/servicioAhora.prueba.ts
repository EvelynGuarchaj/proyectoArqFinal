//dueño del archivo integrante c
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Simular el repositorio de ocupación
vi.mock('../../src/repositorios/repositorioOcupacion', () => ({
  obtenerEspaciosConReservaActual: vi.fn(),
}));

// Simular el servicio de caché
vi.mock('../../src/servicios/servicioCache', () => ({
  obtenerOGuardar: vi.fn(
    async (clave: string, generar: () => Promise<unknown>) => ({
      datos: await generar(),
      cache: 'MISS',
    })
  ),
  invalidarPorPatron: vi.fn(),
}));

import * as repositorioOcupacion from '../../src/repositorios/repositorioOcupacion';
import * as servicioCache from '../../src/servicios/servicioCache';
import * as servicioAhora from '../../src/servicios/servicioAhora';

// Fecha fija para obtener resultados reproducibles
const ahora = new Date('2026-11-09T15:30:00.000Z');

// Espacios simulados
const espacios = [
  {
    id: 1,
    nombre: 'Laboratorio 1',
    edificio: 'A',
    reservas: [
      {
        inicio: new Date('2026-11-09T14:00:00.000Z'),
        fin: new Date('2026-11-09T16:00:00.000Z'),
        motivo: 'Clase de prueba',
      },
    ],
  },
  {
    id: 2,
    nombre: 'Laboratorio 2',
    edificio: 'A',
    reservas: [],
  },
  {
    id: 3,
    nombre: 'Salon 101',
    edificio: 'B',
    reservas: [],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

// ========================================
// AGRUPACIÓN DE ESPACIOS POR EDIFICIO
// ========================================

describe('armarRespuestaAhora', () => {
  it('agrupa por edificio y marca ocupado con la reserva actual', () => {
    const respuesta = servicioAhora.armarRespuestaAhora(
      espacios,
      ahora
    );

    expect(respuesta.generadoEn).toBe(
      '2026-11-09T15:30:00.000Z'
    );

    expect(
      respuesta.edificios.map((edificio) => edificio.edificio)
    ).toEqual(['A', 'B']);

    expect(respuesta.edificios[0].espacios).toEqual([
      {
        espacioId: 1,
        nombre: 'Laboratorio 1',
        ocupado: true,
        reservaActual: {
          inicio: '2026-11-09T14:00:00.000Z',
          fin: '2026-11-09T16:00:00.000Z',
          motivo: 'Clase de prueba',
        },
      },
      {
        espacioId: 2,
        nombre: 'Laboratorio 2',
        ocupado: false,
        reservaActual: null,
      },
    ]);

    expect(
      respuesta.edificios[1].espacios[0].ocupado
    ).toBe(false);
  });

  it('sin espacios devuelve una lista vacía', () => {
    const respuesta = servicioAhora.armarRespuestaAhora(
      [],
      ahora
    );

    expect(respuesta.edificios).toEqual([]);
  });

  it('ordena los edificios aunque lleguen desordenados', () => {
    const respuesta = servicioAhora.armarRespuestaAhora(
      [espacios[2], espacios[0]],
      ahora
    );

    expect(
      respuesta.edificios.map((edificio) => edificio.edificio)
    ).toEqual(['A', 'B']);
  });
});

// ========================================
// SERVICIO DE OCUPACIÓN Y CACHÉ
// ========================================

describe('servicioAhora.obtener', () => {
  it('usa la clave cache:ahora y consulta el repositorio', async () => {
    vi.mocked(
      repositorioOcupacion.obtenerEspaciosConReservaActual
    ).mockResolvedValue(espacios as never);

    const resultado = await servicioAhora.obtener();

    expect(
      servicioCache.obtenerOGuardar
    ).toHaveBeenCalledWith(
      'cache:ahora',
      expect.any(Function)
    );

    expect(
      repositorioOcupacion.obtenerEspaciosConReservaActual
    ).toHaveBeenCalledWith(expect.any(Date));

    expect(resultado.cache).toBe('MISS');

    expect(resultado.datos.edificios).toHaveLength(2);
  });
});
