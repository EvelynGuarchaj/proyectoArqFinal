// DUEÑA: B
// Solo consultas con Prisma. No conoce HTTP.
import type { DatosActualizarEspacio, DatosCrearEspacio, FiltrosEspacios } from '@reservalab/shared';
import { prisma } from '../config/baseDatos';
import { ErrorAplicacion } from '../utilidades/errores';

function esNombreDuplicado(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}

export function listarActivos(filtros: FiltrosEspacios) {
  return prisma.espacio.findMany({
    where: {
      activo: true,
      ...(filtros.edificio ? { edificio: filtros.edificio } : {}),
      ...(filtros.capacidadMinima ? { capacidad: { gte: filtros.capacidadMinima } } : {}),
    },
    orderBy: [{ edificio: 'asc' }, { nombre: 'asc' }],
  });
}

export function buscarPorId(id: number) {
  return prisma.espacio.findUnique({ where: { id } });
}

export function buscarPorNombre(nombre: string) {
  return prisma.espacio.findUnique({ where: { nombre } });
}

export async function crear(datos: DatosCrearEspacio) {
  try {
    return await prisma.espacio.create({ data: datos });
  } catch (error) {
    if (esNombreDuplicado(error)) {
      throw new ErrorAplicacion(409, 'DUPLICADO', 'Ya existe un espacio con ese nombre');
    }
    throw error;
  }
}

export async function actualizar(id: number, datos: DatosActualizarEspacio) {
  try {
    return await prisma.espacio.update({ where: { id }, data: datos });
  } catch (error) {
    if (esNombreDuplicado(error)) {
      throw new ErrorAplicacion(409, 'DUPLICADO', 'Ya existe un espacio con ese nombre');
    }
    throw error;
  }
}

export function desactivar(id: number) {
  return prisma.espacio.update({ where: { id }, data: { activo: false } });
}
