import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { ErrorAplicacion } from '../utilidades/errores';

type Origen = 'body' | 'query' | 'params';

// Express 5 no deja reemplazar req.query, por eso los datos validados van a res.locals
const destinos = { body: 'cuerpo', query: 'consulta', params: 'parametros' } as const;

export function validar(esquema: ZodTypeAny, origen: Origen = 'body'): RequestHandler {
  return (req, res, next) => {
    const resultado = esquema.safeParse(req[origen]);
    if (!resultado.success) {
      throw new ErrorAplicacion(400, 'VALIDACION', 'Los datos enviados no son válidos', resultado.error.flatten());
    }
    res.locals[destinos[origen]] = resultado.data;
    next();
  };
}
