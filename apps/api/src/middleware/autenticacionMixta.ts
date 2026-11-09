// DUEÑA: Integrante C (stub creado por A)
import type {
  NextFunction,
  Request,
  RequestHandler,
  Response
} from 'express';

import type { Permiso } from '@reservalab/shared';

import { autenticarApiKey } from './autenticarApiKey';
import { autenticarJwt } from './autenticarJwt';
import { limitarSolicitudes } from './limitarSolicitudes';
import { requerirPermiso } from './requerirPermiso';

// Ejecuta un middleware y espera a que llame a next()
function ejecutar(
  middleware: RequestHandler,
  req: Request,
  res: Response
): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const siguiente: NextFunction = (error?: unknown) =>
      error ? rechazar(error) : resolver();

    Promise.resolve(
      middleware(req, res, siguiente)
    ).catch(rechazar);
  });
}

// Permite autenticación con JWT o API key
export const autenticarJwtOApiKey = (
  permiso: Permiso
): RequestHandler => {
  const verificarPermiso = requerirPermiso(permiso);

  return async (req, res, next) => {
    // Si no se envía API key, utiliza JWT
    if (!req.header('X-API-Key')) {
      return autenticarJwt(req, res, next);
    }

    try {
      // 1. Validar la llave API
      await ejecutar(autenticarApiKey, req, res);

      // 2. Comprobar el límite de solicitudes
      await ejecutar(limitarSolicitudes, req, res);

      // 3. Verificar los permisos
      await ejecutar(verificarPermiso, req, res);
    } catch (error) {
      return next(error);
    }

    next();
  };
};
