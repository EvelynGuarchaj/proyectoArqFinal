// DUEÑA: Integrante C (stub creado por A)
import type { RequestHandler } from 'express';
import { PREFIJO_LLAVE, type Permiso } from '@reservalab/shared';
import * as repositorioLlavesApi from '../repositorios/repositorioLlavesApi';
import { ErrorAplicacion } from '../utilidades/errores';
import { hashSha256 } from '../utilidades/hash';

export const autenticarApiKey: RequestHandler = async (req, res, next) => {
  const llave = req.header('X-API-Key');

  if (!llave || !llave.startsWith(PREFIJO_LLAVE)) {
    return next(
      new ErrorAplicacion(
        401,
        'LLAVE_INVALIDA',
        'Llave API inválida o ausente'
      )
    );
  }

  const fila = await repositorioLlavesApi.buscarPorHash(
    hashSha256(llave)
  );

  if (!fila || fila.revocada) {
    return next(
      new ErrorAplicacion(
        401,
        'LLAVE_INVALIDA',
        'Llave API inválida o revocada'
      )
    );
  }

  req.llaveApi = {
    id: fila.id,
    permisos: fila.permisos as Permiso[],
    limitePorMinuto: fila.limitePorMinuto,
  };

  // Actualizar último uso sin bloquear la solicitud
  void repositorioLlavesApi.actualizarUltimoUso(fila.id).catch(
    (error: unknown) => {
      console.error(
        'No se pudo actualizar ultimoUso de la llave',
        fila.id,
        error
      );
    }
  );

  next();
};
