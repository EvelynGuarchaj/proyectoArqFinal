import type { ErrorRequestHandler } from 'express';
import type { RespuestaError } from '@reservalab/shared';
import { ErrorAplicacion } from '../utilidades/errores';

export const manejadorErrores: ErrorRequestHandler = (error, req, res, next) => {
  if (error instanceof ErrorAplicacion) {
    const cuerpo: RespuestaError = {
      error: { codigo: error.codigo, mensaje: error.message, detalles: error.detalles ?? null },
    };
    res.status(error.estado).json(cuerpo);
    return;
  }

  console.error('Error no controlado:', error);
  const cuerpo: RespuestaError = {
    error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error interno en el servidor', detalles: null },
  };
  res.status(500).json(cuerpo);
};
