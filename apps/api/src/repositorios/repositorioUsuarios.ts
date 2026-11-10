import type { Rol } from '@reservalab/shared';
import { prisma } from '../config/baseDatos';

interface DatosNuevoUsuario {
  nombre: string;
  correo: string;
  hashContrasena: string;
  rol: Rol;
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
