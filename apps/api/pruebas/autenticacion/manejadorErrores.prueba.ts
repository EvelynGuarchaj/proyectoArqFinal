import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { manejadorErrores } from '../../src/middleware/manejadorErrores';
import { ErrorAplicacion } from '../../src/utilidades/errores';

// Pruebas unitarias del manejador de errores con un res falso
function crearRespuesta() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

function ejecutar(error: unknown) {
  const res = crearRespuesta();
  manejadorErrores(error, {} as Request, res as unknown as Response, vi.fn() as NextFunction);
  return res;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('manejadorErrores', () => {
  it('responde 500 ERROR_INTERNO ante un error no controlado sin filtrar el mensaje original', () => {
    const consola = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = ejecutar(new Error('detalle interno de la base de datos'));

    expect(res.status).toHaveBeenCalledWith(500);
    const cuerpo = res.json.mock.calls[0][0];
    expect(cuerpo).toEqual({
      error: { codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error interno en el servidor', detalles: null },
    });
    expect(JSON.stringify(cuerpo)).not.toContain('detalle interno');
    expect(consola).toHaveBeenCalledOnce();
  });

  it('responde con el estado y el código de un ErrorAplicacion', () => {
    const res = ejecutar(new ErrorAplicacion(409, 'DUPLICADO', 'Ya existe', { campo: 'correo' }));

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: { codigo: 'DUPLICADO', mensaje: 'Ya existe', detalles: { campo: 'correo' } },
    });
  });
});
