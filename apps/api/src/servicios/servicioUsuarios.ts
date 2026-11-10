import { Prisma } from '@prisma/client';
import type { DatosCrearUsuario, DatosEditarUsuario } from '@reservalab/shared';
import * as repositorioUsuarios from '../repositorios/repositorioUsuarios';
import { ErrorAplicacion } from '../utilidades/errores';
import { crearUsuario } from './servicioAutenticacion';

export const listar = repositorioUsuarios.listar;

async function guardar<T>(operacion: () => Promise<T>): Promise<T> {
  try {
    return await operacion();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ErrorAplicacion(409, 'DUPLICADO', 'Ya existe un usuario con ese correo');
      }
      if (error.code === 'P2025') {
        throw new ErrorAplicacion(404, 'NO_ENCONTRADO', 'El usuario no existe');
      }
    }
    throw error;
  }
}

export function crear(datos: DatosCrearUsuario) {
  return guardar(async () => {
    const usuario = await crearUsuario(datos, datos.rol);
    return { ...usuario, activo: true };
  });
}

export async function editar(id: number, datos: DatosEditarUsuario, administradorId: number) {
  if (id === administradorId && datos.rol && datos.rol !== 'administrador') {
    throw new ErrorAplicacion(403, 'PROHIBIDO', 'No puedes quitarte tu propio rol de administrador');
  }
  const usuario = await guardar(() => repositorioUsuarios.actualizar(id, datos, administradorId));
  if (!usuario) throw new ErrorAplicacion(403, 'PROHIBIDO', 'La cuenta ya no tiene permisos de administrador');
  return usuario;
}

export async function desactivar(id: number, administradorId: number) {
  if (id === administradorId) {
    throw new ErrorAplicacion(403, 'PROHIBIDO', 'No puedes desactivar tu propia cuenta');
  }
  const usuario = await guardar(() => repositorioUsuarios.actualizar(id, { activo: false }, administradorId));
  if (!usuario) throw new ErrorAplicacion(403, 'PROHIBIDO', 'La cuenta ya no tiene permisos de administrador');
}
