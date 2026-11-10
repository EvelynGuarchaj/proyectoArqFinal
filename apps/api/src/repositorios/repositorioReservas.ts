// DUEÑA: B
// Solo consultas con Prisma. No conoce HTTP.
import { prisma } from '../config/baseDatos';
import { ErrorAplicacion } from '../utilidades/errores';

export interface DatosNuevaReserva {
  espacioId: number;
  usuarioId: number;
  estudianteId?: number;
  inicio: Date;
  fin: Date;
  motivo: string;
}

// La restricción de exclusión de PostgreSQL (reservas_sin_traslape) rechazó la fila.
// Código de PostgreSQL: 23P01 (exclusion_violation).
function esErrorDeTraslape(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { message?: unknown; meta?: unknown; cause?: unknown };
  const texto = [String(e.message ?? ''), JSON.stringify(e.meta ?? {}), String(e.cause ?? '')].join(' ');
  return texto.includes('23P01') || texto.includes('reservas_sin_traslape');
}

// Dos rangos [a, b) y [c, d) se traslapan si a < d y c < b.
// Por eso 08–10 y 10–11 NO se traslapan (contiguas).
export async function existeTraslape(espacioId: number, inicio: Date, fin: Date): Promise<boolean> {
  const cantidad = await prisma.reserva.count({
    where: {
      espacioId,
      estado: 'confirmada',
      inicio: { lt: fin },
      fin: { gt: inicio },
    },
  });
  return cantidad > 0;
}

export async function crear(datos: DatosNuevaReserva) {
  try {
    const estudianteId = datos.estudianteId;
    if (estudianteId === undefined) return await prisma.reserva.create({ data: datos });

    return await prisma.$transaction(async (tx) => {
      const estudiantes = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM usuarios
        WHERE id = ${estudianteId} AND activo AND rol = 'estudiante'
        FOR SHARE
      `;
      if (estudiantes.length === 0) {
        throw new ErrorAplicacion(400, 'VALIDACION', 'Selecciona un estudiante activo');
      }
      return tx.reserva.create({ data: datos });
    });
  } catch (error) {
    if (esErrorDeTraslape(error)) {
      throw new ErrorAplicacion(409, 'TRASLAPE', 'El espacio ya está reservado en ese horario');
    }
    throw error;
  }
}

export function listarConfirmadasEnRango(espacioId: number, desde: Date, hasta: Date) {
  return prisma.reserva.findMany({
    where: {
      espacioId,
      estado: 'confirmada',
      inicio: { lt: hasta },
      fin: { gt: desde },
    },
    orderBy: { inicio: 'asc' },
  });
}

export function listarPorUsuario(usuarioId: number, esEstudiante: boolean) {
  const where = esEstudiante
    ? { OR: [{ estudianteId: usuarioId }, { usuarioId, estudianteId: null }] }
    : { usuarioId };
  return prisma.reserva.findMany({
    where,
    include: { espacio: { select: { nombre: true, edificio: true } } },
    orderBy: { inicio: 'asc' },
  });
}

export function buscarPorId(id: number) {
  return prisma.reserva.findUnique({ where: { id } });
}

export function cancelar(id: number) {
  return prisma.reserva.update({ where: { id }, data: { estado: 'cancelada' } });
}
