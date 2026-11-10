import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { buscarCuentaActiva } from '../repositorios/repositorioUsuarios';
import { entorno } from '../config/entorno';
import { ErrorAplicacion } from '../utilidades/errores';

interface ContenidoToken {
  sub: string;
}

export const autenticarJwt: RequestHandler = async (req, res, next) => {
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

  const id = Number(contenido.sub);
  const cuenta = Number.isSafeInteger(id) && id > 0 ? await buscarCuentaActiva(id) : null;
  if (!cuenta) {
    throw new ErrorAplicacion(401, 'TOKEN_INVALIDO', 'El token de acceso es inválido o está vencido');
  }
  req.usuario = cuenta;
  next();
};
