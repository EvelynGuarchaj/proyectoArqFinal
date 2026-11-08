import type { RequestHandler } from 'express';
import type { Rol } from '@reservalab/shared';
import { ErrorAplicacion } from '../utilidades/errores';

// Se usa después de autenticarJwt
export function requerirRol(...roles: Rol[]): RequestHandler {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      throw new ErrorAplicacion(403, 'PROHIBIDO', 'No tienes permiso para realizar esta acción');
    }
    next();
  };
}
