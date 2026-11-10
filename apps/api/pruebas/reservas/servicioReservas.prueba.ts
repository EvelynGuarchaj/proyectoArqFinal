// DUEÑA: B — Pruebas unitarias de servicioReservas (repositorios, caché y notificaciones simulados)
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/repositorios/repositorioEspacios', () => ({
  buscarPorId: vi.fn(),
}));
vi.mock('../../src/repositorios/repositorioReservas', () => ({
  existeTraslape: vi.fn(),
  crear: vi.fn(),
  buscarPorId: vi.fn(),
  cancelar: vi.fn(),
  listarPorUsuario: vi.fn(),
}));
vi.mock('../../src/servicios/servicioCache', () => ({
  obtenerOGuardar: vi.fn(),
  invalidarPorPatron: vi.fn(),
}));
vi.mock('../../src/clientes/clienteNotificaciones', () => ({
  enviar: vi.fn(),
}));

import * as clienteNotificaciones from '../../src/clientes/clienteNotificaciones';
import * as repositorioEspacios from '../../src/repositorios/repositorioEspacios';
import * as repositorioReservas from '../../src/repositorios/repositorioReservas';
import * as servicioCache from '../../src/servicios/servicioCache';
import * as servicioReservas from '../../src/servicios/servicioReservas';
import { patronesCache } from '../../src/config/clavesCache';

const espacioActivo = {
  id: 5, nombre: 'Lab 5', edificio: 'A', capacidad: 20, tipo: 'laboratorio' as const,
  horaApertura: 7, horaCierre: 21, activo: true, creadoEn: new Date(),
};

const datosValidos = {
  espacioId: 5,
  inicio: '2030-01-15T08:00:00-06:00',
  fin: '2030-01-15T10:00:00-06:00',
  motivo: 'Clase de prueba',
};

const filaReserva = {
  id: 99, espacioId: 5, usuarioId: 2, estudianteId: null,
  inicio: new Date(datosValidos.inicio), fin: new Date(datosValidos.fin),
  motivo: 'Clase de prueba', estado: 'confirmada' as const, creadaEn: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repositorioEspacios.buscarPorId).mockResolvedValue(espacioActivo);
  vi.mocked(repositorioReservas.existeTraslape).mockResolvedValue(false);
  vi.mocked(repositorioReservas.crear).mockResolvedValue(filaReserva);
});

describe('servicioReservas.crear', () => {
  it('crea la reserva, invalida la caché y envía la notificación', async () => {
    const reserva = await servicioReservas.crear(2, datosValidos);

    expect(reserva).toMatchObject({ id: 99, estado: 'confirmada', inicio: '2030-01-15T14:00:00.000Z' });
    expect(servicioCache.invalidarPorPatron).toHaveBeenCalledWith(patronesCache.disponibilidadDeEspacio(5));
    expect(servicioCache.invalidarPorPatron).toHaveBeenCalledWith('cache:ahora');
    expect(clienteNotificaciones.enviar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'reserva_confirmada', reservaId: 99, espacioId: 5, usuarioId: 2 }),
    );
  });

  it('responde 404 si el espacio no existe', async () => {
    vi.mocked(repositorioEspacios.buscarPorId).mockResolvedValue(null);
    await expect(servicioReservas.crear(2, datosValidos)).rejects.toMatchObject({ estado: 404, codigo: 'NO_ENCONTRADO' });
  });

  it('responde 404 si el espacio está inactivo', async () => {
    vi.mocked(repositorioEspacios.buscarPorId).mockResolvedValue({ ...espacioActivo, activo: false });
    await expect(servicioReservas.crear(2, datosValidos)).rejects.toMatchObject({ estado: 404 });
  });

  it('responde 409 TRASLAPE si ya hay una reserva en ese horario', async () => {
    vi.mocked(repositorioReservas.existeTraslape).mockResolvedValue(true);
    await expect(servicioReservas.crear(2, datosValidos)).rejects.toMatchObject({ estado: 409, codigo: 'TRASLAPE' });
    expect(repositorioReservas.crear).not.toHaveBeenCalled();
    expect(clienteNotificaciones.enviar).not.toHaveBeenCalled();
  });

  it.each([
    ['antes de la apertura', '2030-01-15T06:00:00-06:00', '2030-01-15T08:00:00-06:00'],
    ['después del cierre', '2030-01-15T20:00:00-06:00', '2030-01-15T22:00:00-06:00'],
    ['fin antes que inicio', '2030-01-15T10:00:00-06:00', '2030-01-15T08:00:00-06:00'],
    ['fin igual a inicio', '2030-01-15T10:00:00-06:00', '2030-01-15T10:00:00-06:00'],
    ['otro día', '2030-01-15T20:00:00-06:00', '2030-01-16T08:00:00-06:00'],
  ])('responde 400 FUERA_DE_HORARIO (%s)', async (_caso, inicio, fin) => {
    await expect(servicioReservas.crear(2, { ...datosValidos, inicio, fin })).rejects.toMatchObject({
      estado: 400,
      codigo: 'FUERA_DE_HORARIO',
    });
  });

  it('acepta horas en UTC si caen dentro del horario de Guatemala', async () => {
    await servicioReservas.crear(2, { ...datosValidos, inicio: '2030-01-15T14:00:00Z', fin: '2030-01-15T16:00:00Z' });
    expect(repositorioReservas.crear).toHaveBeenCalled();
  });

  it('propaga el 409 cuando la base de datos rechaza el traslape (solicitudes simultáneas)', async () => {
    const { ErrorAplicacion } = await import('../../src/utilidades/errores');
    vi.mocked(repositorioReservas.crear).mockRejectedValue(new ErrorAplicacion(409, 'TRASLAPE', 'traslape'));
    await expect(servicioReservas.crear(2, datosValidos)).rejects.toMatchObject({ estado: 409 });
    expect(clienteNotificaciones.enviar).not.toHaveBeenCalled();
  });
});

describe('servicioReservas.cancelar', () => {
  beforeEach(() => {
    vi.mocked(repositorioReservas.buscarPorId).mockResolvedValue(filaReserva);
    vi.mocked(repositorioReservas.cancelar).mockResolvedValue({ ...filaReserva, estado: 'cancelada' });
  });

  it('responde 404 si la reserva no existe', async () => {
    vi.mocked(repositorioReservas.buscarPorId).mockResolvedValue(null);
    await expect(servicioReservas.cancelar(99, { id: 2, rol: 'docente' })).rejects.toMatchObject({ estado: 404 });
  });

  it('responde 403 si la reserva es de otra persona', async () => {
    await expect(servicioReservas.cancelar(99, { id: 3, rol: 'docente' })).rejects.toMatchObject({
      estado: 403,
      codigo: 'PROHIBIDO',
    });
    expect(repositorioReservas.cancelar).not.toHaveBeenCalled();
  });

  it('el dueño cancela: invalida la caché y notifica reserva_cancelada', async () => {
    const reserva = await servicioReservas.cancelar(99, { id: 2, rol: 'docente' });
    expect(reserva.estado).toBe('cancelada');
    expect(servicioCache.invalidarPorPatron).toHaveBeenCalledWith(patronesCache.disponibilidadDeEspacio(5));
    expect(clienteNotificaciones.enviar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'reserva_cancelada' }));
  });

  it('un administrador puede cancelar una reserva ajena', async () => {
    const reserva = await servicioReservas.cancelar(99, { id: 1, rol: 'administrador' });
    expect(reserva.estado).toBe('cancelada');
  });

  it('si ya estaba cancelada no vuelve a notificar', async () => {
    vi.mocked(repositorioReservas.buscarPorId).mockResolvedValue({ ...filaReserva, estado: 'cancelada' });
    await servicioReservas.cancelar(99, { id: 2, rol: 'docente' });
    expect(repositorioReservas.cancelar).not.toHaveBeenCalled();
    expect(clienteNotificaciones.enviar).not.toHaveBeenCalled();
  });
});

describe('servicioReservas.listarMias', () => {
  it('devuelve las reservas con fechas ISO y datos del espacio', async () => {
    vi.mocked(repositorioReservas.listarPorUsuario).mockResolvedValue([
      { ...filaReserva, espacio: { nombre: 'Lab 5', edificio: 'A' } },
    ]);
    const reservas = await servicioReservas.listarMias(2, 'docente');
    expect(reservas).toEqual([
      expect.objectContaining({ id: 99, inicio: '2030-01-15T14:00:00.000Z', espacio: { nombre: 'Lab 5', edificio: 'A' } }),
    ]);
  });
});
