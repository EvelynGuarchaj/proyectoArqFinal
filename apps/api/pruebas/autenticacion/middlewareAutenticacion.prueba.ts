import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { entorno } from '../../src/config/entorno';
import { autenticarJwt } from '../../src/middleware/autenticarJwt';
import { requerirRol } from '../../src/middleware/requerirRol';
import { ErrorAplicacion } from '../../src/utilidades/errores';

// Pruebas unitarias de los middleware: se llaman directo con req/res falsos
function ejecutar(middleware: (req: Request, res: Response, next: NextFunction) => unknown, req: Partial<Request>) {
  const siguiente = vi.fn();
  let error: ErrorAplicacion | undefined;
  try {
    middleware(req as Request, {} as Response, siguiente);
  } catch (e) {
    error = e as ErrorAplicacion;
  }
  return { siguiente, error };
}

describe('requerirRol', () => {
  it('deja pasar al rol correcto', () => {
    const { siguiente, error } = ejecutar(requerirRol('administrador'), { usuario: { id: 1, rol: 'administrador' } });

    expect(error).toBeUndefined();
    expect(siguiente).toHaveBeenCalledOnce();
  });

  it('acepta cualquiera de varios roles', () => {
    const { siguiente } = ejecutar(requerirRol('docente', 'administrador'), { usuario: { id: 2, rol: 'docente' } });

    expect(siguiente).toHaveBeenCalledOnce();
  });

  it('responde 403 PROHIBIDO con otro rol', () => {
    const { siguiente, error } = ejecutar(requerirRol('administrador'), { usuario: { id: 3, rol: 'estudiante' } });

    expect(error).toBeInstanceOf(ErrorAplicacion);
    expect(error?.estado).toBe(403);
    expect(error?.codigo).toBe('PROHIBIDO');
    expect(siguiente).not.toHaveBeenCalled();
  });

  it('responde 403 si no hay usuario en la solicitud', () => {
    const { error } = ejecutar(requerirRol('administrador'), {});

    expect(error?.estado).toBe(403);
  });
});

describe('autenticarJwt', () => {
  it('responde 401 NO_AUTENTICADO sin encabezado Authorization', () => {
    const { siguiente, error } = ejecutar(autenticarJwt, { headers: {} });

    expect(error).toBeInstanceOf(ErrorAplicacion);
    expect(error?.estado).toBe(401);
    expect(error?.codigo).toBe('NO_AUTENTICADO');
    expect(siguiente).not.toHaveBeenCalled();
  });

  it('responde 401 TOKEN_INVALIDO con un token falso', () => {
    const { siguiente, error } = ejecutar(autenticarJwt, { headers: { authorization: 'Bearer token.falso.123' } });

    expect(error?.estado).toBe(401);
    expect(error?.codigo).toBe('TOKEN_INVALIDO');
    expect(siguiente).not.toHaveBeenCalled();
  });

  it('responde 401 TOKEN_INVALIDO con un token vencido', () => {
    const vencido = jwt.sign({ sub: '1', rol: 'docente', exp: Math.floor(Date.now() / 1000) - 60 }, entorno.secretoJwt);

    const { error } = ejecutar(autenticarJwt, { headers: { authorization: `Bearer ${vencido}` } });

    expect(error?.codigo).toBe('TOKEN_INVALIDO');
  });

  it('pone req.usuario con un token válido', () => {
    const token = jwt.sign({ sub: '7', rol: 'docente' }, entorno.secretoJwt, { expiresIn: '1m' });
    const req: Partial<Request> = { headers: { authorization: `Bearer ${token}` } };

    const { siguiente, error } = ejecutar(autenticarJwt, req);

    expect(error).toBeUndefined();
    expect(siguiente).toHaveBeenCalledOnce();
    expect(req.usuario).toEqual({ id: 7, rol: 'docente' });
  });
});
