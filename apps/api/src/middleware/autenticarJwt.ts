import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { Rol } from '@reservalab/shared';
import { entorno } from '../config/entorno';
import { ErrorAplicacion } from '../utilidades/errores';

interface ContenidoToken {
  sub: string;
  rol: Rol;
}

export const autenticarJwt: RequestHandler = (req, res, next) => {
  const encabezado = req.headers.authorization;
  if (!encabezado?.startsWith('Bearer ')) {
    throw new ErrorAplicacion(401, 'NO_AUTENTICADO', 'Falta el token de acceso');
  }

  let contenido: ContenidoToken;
  try {
    contenido = jwt.verify(encabezado.slice(7), entorno.secretoJwt) as unknown as ContenidoToken;
  } catch {
    throw new ErrorAplicacion(401, 'TOKEN_INVALIDO', 'El token de acceso es inválido o está vencido');
  }

  req.usuario = { id: Number(contenido.sub), rol: contenido.rol };
  next();
};
