// DUEÑA: B
// Reglas de negocio de reservas (RF-08, RF-09, RF-10). Nunca toca req ni res.
import type { DatosCrearReserva, Reserva, Rol } from '@reservalab/shared';
import * as clienteNotificaciones from '../clientes/clienteNotificaciones';
import { clavesCache, patronesCache } from '../config/clavesCache';
import * as repositorioEspacios from '../repositorios/repositorioEspacios';
import * as repositorioReservas from '../repositorios/repositorioReservas';
import { listarEstudiantesActivos } from '../repositorios/repositorioUsuarios';
import { ErrorAplicacion } from '../utilidades/errores';
import * as servicioCache from './servicioCache';
import { fechaLocal, inicioDelDia } from './servicioDisponibilidad';

const MS_POR_HORA = 3_600_000;

interface FilaReserva {
  id: number;
  espacioId: number;
  usuarioId: number;
  estudianteId?: number | null;
  inicio: Date;
  fin: Date;
  motivo: string;
  estado: Reserva['estado'];
  espacio?: { nombre: string; edificio: string };
}

function aReservaPublica(fila: FilaReserva): Reserva {
  return {
    id: fila.id,
    espacioId: fila.espacioId,
    usuarioId: fila.usuarioId,
    ...(fila.estudianteId != null ? { estudianteId: fila.estudianteId } : {}),
    inicio: fila.inicio.toISOString(),
    fin: fila.fin.toISOString(),
    motivo: fila.motivo,
    estado: fila.estado,
    ...(fila.espacio ? { espacio: { nombre: fila.espacio.nombre, edificio: fila.espacio.edificio } } : {}),
  };
}

// Regla de invalidación (sección 3.9): disponibilidad del espacio y /now
async function invalidarCacheDeReserva(espacioId: number) {
  await Promise.all([
    servicioCache.invalidarPorPatron(patronesCache.disponibilidadDeEspacio(espacioId)),
    servicioCache.invalidarPorPatron(clavesCache.ahora()),
  ]);
}

function notificar(tipo: 'reserva_confirmada' | 'reserva_cancelada', reserva: Reserva) {
  // Sin await: la respuesta HTTP no espera a Mockoon
  void clienteNotificaciones.enviar({
    tipo,
    reservaId: reserva.id,
    espacioId: reserva.espacioId,
    usuarioId: reserva.usuarioId,
    inicio: reserva.inicio,
    fin: reserva.fin,
  });
}

export async function crear(usuarioId: number, datos: DatosCrearReserva): Promise<Reserva> {
  // 1. El espacio existe y está activo
  const espacio = await repositorioEspacios.buscarPorId(datos.espacioId);
  if (!espacio || !espacio.activo) {
    throw new ErrorAplicacion(404, 'NO_ENCONTRADO', 'El espacio no existe');
  }

  // 2. fin > inicio, mismo día y dentro del horario del espacio (hora Guatemala)
  const inicio = new Date(datos.inicio);
  const fin = new Date(datos.fin);
  const medianoche = inicioDelDia(fechaLocal(inicio)).getTime();
  const apertura = medianoche + espacio.horaApertura * MS_POR_HORA;
  const cierre = medianoche + espacio.horaCierre * MS_POR_HORA;
  const dentroDelHorario =
    fin.getTime() > inicio.getTime() && inicio.getTime() >= apertura && fin.getTime() <= cierre;
  if (!dentroDelHorario) {
    throw new ErrorAplicacion(
      400,
      'FUERA_DE_HORARIO',
      `La reserva debe ser el mismo día, entre las ${espacio.horaApertura}:00 y las ${espacio.horaCierre}:00`,
    );
  }

  // 3. Validación en la aplicación
  if (await repositorioReservas.existeTraslape(datos.espacioId, inicio, fin)) {
    throw new ErrorAplicacion(409, 'TRASLAPE', 'El espacio ya está reservado en ese horario');
  }

  if (inicio.getTime() < Date.now()) {
    throw new ErrorAplicacion(400, 'FUERA_DE_HORARIO', 'No puedes reservar un horario que ya comenzó');
  }

  // 4. Crear (si llegan dos al mismo tiempo, la BD rechaza una y el repositorio la convierte en 409)
  const fila = await repositorioReservas.crear({
    espacioId: datos.espacioId,
    usuarioId,
    inicio,
    fin,
    motivo: datos.motivo,
    ...(datos.estudianteId !== undefined ? { estudianteId: datos.estudianteId } : {}),
  });
  const reserva = aReservaPublica(fila);

  // 5. Invalidar caché y notificar sin esperar
  await invalidarCacheDeReserva(reserva.espacioId);
  notificar('reserva_confirmada', reserva);

  return reserva;
}

export const listarEstudiantes = listarEstudiantesActivos;

export async function listarTodas(): Promise<Reserva[]> {
  return (await repositorioReservas.listarTodas()).map(aReservaPublica);
}

export async function listarMias(usuarioId: number, rol: Rol): Promise<Reserva[]> {
  const filas = await repositorioReservas.listarPorUsuario(usuarioId, rol === 'estudiante');
  return filas.map(aReservaPublica);
}

export async function cancelar(id: number, usuario: { id: number; rol: Rol }): Promise<Reserva> {
  const fila = await repositorioReservas.buscarPorId(id);
  if (!fila) {
    throw new ErrorAplicacion(404, 'NO_ENCONTRADO', 'La reserva no existe');
  }
  if (fila.usuarioId !== usuario.id && usuario.rol !== 'administrador') {
    throw new ErrorAplicacion(403, 'PROHIBIDO', 'Solo el dueño o un administrador puede cancelar esta reserva');
  }
  if (fila.estado === 'cancelada') {
    return aReservaPublica(fila); // ya estaba cancelada: no se repite nada
  }

  if (fila.fin.getTime() <= Date.now()) {
    throw new ErrorAplicacion(400, 'FUERA_DE_HORARIO', 'La reserva ya terminó');
  }

  const reserva = aReservaPublica(await repositorioReservas.cancelar(id));
  await invalidarCacheDeReserva(reserva.espacioId);
  notificar('reserva_cancelada', reserva);
  return reserva;
}
