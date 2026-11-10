// DUEÑA: Integrante C (stub creado por A)
import type { RequestHandler } from 'express';
import { clavesCache } from '../config/clavesCache';
import { clienteRedis } from '../config/redis';
import { ErrorAplicacion } from '../utilidades/errores';

const DURACION_VENTANA_SEGUNDOS = 60;

// Limitar solicitudes por llave API en ventanas de un minuto
export const limitarSolicitudes: RequestHandler = async (req, res, next) => {
  if (!req.llaveApi) {
    return next(
      new ErrorAplicacion(
        401,
        'LLAVE_INVALIDA',
        'Llave API inválida o ausente'
      )
    );
  }

  const minuto = Math.floor(Date.now() / 60000);
  const clave = clavesCache.limite(req.llaveApi.id, minuto);

  const cantidad = await clienteRedis.incr(clave);

  if (cantidad === 1) {
    await clienteRedis.expire(clave, DURACION_VENTANA_SEGUNDOS);
  }

  if (cantidad > req.llaveApi.limitePorMinuto) {
    return next(
      new ErrorAplicacion(
        429,
        'LIMITE_EXCEDIDO',
        'Se excedió el límite de solicitudes por minuto',
        {
          limitePorMinuto: req.llaveApi.limitePorMinuto
        }
      )
    );
  }

  next();
};
