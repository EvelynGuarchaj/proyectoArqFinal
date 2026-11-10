import type { DatosEditarUsuario, Rol } from '@reservalab/shared';
import { prisma } from '../config/baseDatos';

interface DatosNuevoUsuario {
  nombre: string;
  correo: string;
  hashContrasena: string;
  rol: Rol;
}

const camposAdministracion = { id: true, nombre: true, correo: true, rol: true, activo: true } as const;

export function listarEstudiantesActivos() {
  return prisma.usuario.findMany({
    where: { activo: true, rol: 'estudiante' },
    select: { id: true, nombre: true },
    orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
  });
}

export function listar() {
  return prisma.usuario.findMany({ select: camposAdministracion, orderBy: { id: 'asc' } });
}

export function actualizar(id: number, datos: DatosEditarUsuario & { activo?: boolean }, administradorId: number) {
  return prisma.$transaction(async (tx) => {
    // Bloquear ambas cuentas en el mismo orden evita que dos administradores se desactiven mutuamente.
    await tx.$queryRaw`SELECT id FROM usuarios WHERE id IN (${id}, ${administradorId}) ORDER BY id FOR UPDATE`;
    const administrador = await tx.usuario.findUnique({
      where: { id: administradorId, activo: true, rol: 'administrador' },
      select: { id: true },
    });
    if (!administrador) return null;
    return tx.usuario.update({ where: { id }, data: datos, select: camposAdministracion });
  });
}

export function buscarCuentaActiva(id: number) {
  return prisma.usuario.findUnique({ where: { id, activo: true }, select: { id: true, rol: true } });
}

export function buscarPorCorreo(correo: string) {
  return prisma.usuario.findUnique({ where: { correo } });
}

export function buscarPorId(id: number) {
  return prisma.usuario.findUnique({ where: { id } });
}

export function crear(datos: DatosNuevoUsuario) {
  return prisma.usuario.create({ data: datos });
}
