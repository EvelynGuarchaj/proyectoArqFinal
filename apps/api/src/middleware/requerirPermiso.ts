// DUEÑA: Integrante C (stub creado por A)
import type { RequestHandler } from 'express';
import type { Permiso } from '@reservalab/shared';
import { ErrorAplicacion } from '../utilidades/errores';

export const requerirPermiso =
  (permiso: Permiso): RequestHandler =>
    (req, res, next) => {
      if (!req.llaveApi || !req.llaveApi.permisos.includes(permiso)) {
        return next(
          new ErrorAplicacion(
            403,
            'PERMISO_INSUFICIENTE',
            `La llave no tiene el permiso ${permiso}`
          )
        );
      }

      next();
    };
