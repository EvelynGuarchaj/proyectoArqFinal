//propiedad integrante c
import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hashSha256 } from '../../src/utilidades/hash';
import { ErrorAplicacion } from '../../src/utilidades/errores';

// Simular el repositorio y Redis
vi.mock('../../src/repositorios/repositorioLlavesApi', () => ({
  buscarPorHash: vi.fn(),
  actualizarUltimoUso: vi.fn(),
}));

vi.mock('../../src/config/redis', () => ({
  clienteRedis: {
    incr: vi.fn(),
    expire: vi.fn(),
  },
}));

vi.mock('../../src/middleware/autenticarJwt', () => ({
  autenticarJwt: vi.fn(
    (req: Request, res: Response, next: NextFunction) => next()
  ),
}));

import * as repositorioLlavesApi from '../../src/repositorios/repositorioLlavesApi';
import { clienteRedis } from '../../src/config/redis';
import { autenticarJwt } from '../../src/middleware/autenticarJwt';
import { autenticarApiKey } from '../../src/middleware/autenticarApiKey';
import { limitarSolicitudes } from '../../src/middleware/limitarSolicitudes';
import { requerirPermiso } from '../../src/middleware/requerirPermiso';
import { autenticarJwtOApiKey } from '../../src/middleware/autenticacionMixta';

const LLAVE = 'rl_live_prueba_0123456789abcdef';

function filaLlave(
  cambios: Partial<{
    revocada: boolean;
    permisos: string[];
    limitePorMinuto: number;
  }> = {}
) {
  return {
    id: 7,
    nombre: 'Llave de prueba',
    prefijo: LLAVE.slice(0, 12),
    hashLlave: hashSha256(LLAVE),
    permisos: ['read:now'],
    limitePorMinuto: 60,
    ultimoUso: null,
    revocada: false,
    creadaEn: new Date(),
    ...cambios,
  };
}

function crearSolicitud(
  encabezados: Record<string, string> = {}
): Request {
  const minusculas = Object.fromEntries(
    Object.entries(encabezados).map(([k, v]) => [
      k.toLowerCase(),
      v,
    ])
  );

  return {
    header: (nombre: string) => minusculas[nombre.toLowerCase()],
  } as unknown as Request;
}

const res = {} as Response;

function errorDe(next: ReturnType<typeof vi.fn>) {
  return next.mock.calls[0]?.[0] as ErrorAplicacion | undefined;
}

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(
    repositorioLlavesApi.actualizarUltimoUso
  ).mockResolvedValue(filaLlave());
});

// ========================================
// AUTENTICACIÓN API KEY
// ========================================

describe('autenticarApiKey', () => {
  it('sin llave responde 401 LLAVE_INVALIDA', async () => {
    const next = vi.fn();

    await autenticarApiKey(crearSolicitud(), res, next);

    expect(errorDe(next)).toMatchObject({
      estado: 401,
      codigo: 'LLAVE_INVALIDA',
    });
  });

  it('llave sin prefijo responde 401', async () => {
    const next = vi.fn();

    await autenticarApiKey(
      crearSolicitud({ 'X-API-Key': 'otra_cosa' }),
      res,
      next
    );

    expect(errorDe(next)).toMatchObject({
      estado: 401,
      codigo: 'LLAVE_INVALIDA',
    });

    expect(
      repositorioLlavesApi.buscarPorHash
    ).not.toHaveBeenCalled();
  });

  it('llave inexistente responde 401', async () => {
    vi.mocked(
      repositorioLlavesApi.buscarPorHash
    ).mockResolvedValue(null);

    const next = vi.fn();

    await autenticarApiKey(
      crearSolicitud({ 'X-API-Key': LLAVE }),
      res,
      next
    );

    expect(errorDe(next)).toMatchObject({
      estado: 401,
      codigo: 'LLAVE_INVALIDA',
    });
  });

  it('llave revocada responde 401', async () => {
    vi.mocked(
      repositorioLlavesApi.buscarPorHash
    ).mockResolvedValue(filaLlave({ revocada: true }));

    const next = vi.fn();

    await autenticarApiKey(
      crearSolicitud({ 'X-API-Key': LLAVE }),
      res,
      next
    );

    expect(errorDe(next)).toMatchObject({
      estado: 401,
      codigo: 'LLAVE_INVALIDA',
    });
  });

  it('llave válida permite continuar', async () => {
    vi.mocked(
      repositorioLlavesApi.buscarPorHash
    ).mockResolvedValue(filaLlave());

    const req = crearSolicitud({ 'X-API-Key': LLAVE });
    const next = vi.fn();

    await autenticarApiKey(req, res, next);

    expect(
      repositorioLlavesApi.buscarPorHash
    ).toHaveBeenCalledWith(hashSha256(LLAVE));

    expect(next).toHaveBeenCalledWith();

    expect(req.llaveApi).toEqual({
      id: 7,
      permisos: ['read:now'],
      limitePorMinuto: 60,
    });

    expect(
      repositorioLlavesApi.actualizarUltimoUso
    ).toHaveBeenCalledWith(7);
  });

  it('si falla actualizar ultimoUso, la solicitud continúa', async () => {
    vi.mocked(
      repositorioLlavesApi.buscarPorHash
    ).mockResolvedValue(filaLlave());

    vi.mocked(
      repositorioLlavesApi.actualizarUltimoUso
    ).mockRejectedValue(new Error('BD caída'));

    const espiaConsola = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const next = vi.fn();

    await autenticarApiKey(
      crearSolicitud({ 'X-API-Key': LLAVE }),
      res,
      next
    );

    await new Promise((resolver) => setImmediate(resolver));

    expect(next).toHaveBeenCalledWith();
    expect(espiaConsola).toHaveBeenCalled();

    espiaConsola.mockRestore();
  });
});

// ========================================
// LÍMITE DE SOLICITUDES
// ========================================

describe('limitarSolicitudes', () => {
  function solicitudConLlave(limitePorMinuto = 2) {
    const req = crearSolicitud();

    req.llaveApi = {
      id: 7,
      permisos: ['read:now'],
      limitePorMinuto,
    };

    return req;
  }

  it('primera solicitud incrementa contador', async () => {
    vi.mocked(clienteRedis.incr).mockResolvedValue(1);

    const next = vi.fn();

    await limitarSolicitudes(
      solicitudConLlave(),
      res,
      next
    );

    const minuto = Math.floor(Date.now() / 60000);

    expect(clienteRedis.incr).toHaveBeenCalledWith(
      `limite:7:${minuto}`
    );

    expect(clienteRedis.expire).toHaveBeenCalledWith(
      `limite:7:${minuto}`,
      60
    );

    expect(next).toHaveBeenCalledWith();
  });

  it('justo en el límite todavía permite continuar', async () => {
    vi.mocked(clienteRedis.incr).mockResolvedValue(2);

    const next = vi.fn();

    await limitarSolicitudes(
      solicitudConLlave(2),
      res,
      next
    );

    expect(
      clienteRedis.expire
    ).not.toHaveBeenCalled();

    expect(next).toHaveBeenCalledWith();
  });

  it('superar el límite devuelve 429', async () => {
    vi.mocked(clienteRedis.incr).mockResolvedValue(3);

    const next = vi.fn();

    await limitarSolicitudes(
      solicitudConLlave(2),
      res,
      next
    );

    expect(errorDe(next)).toMatchObject({
      estado: 429,
      codigo: 'LIMITE_EXCEDIDO',
    });
  });

  it('sin llave API devuelve 401', async () => {
    const next = vi.fn();

    await limitarSolicitudes(
      crearSolicitud(),
      res,
      next
    );

    expect(errorDe(next)).toMatchObject({
      estado: 401,
      codigo: 'LLAVE_INVALIDA',
    });
  });
});

// ========================================
// VERIFICACIÓN DE PERMISOS
// ========================================

describe('requerirPermiso', () => {
  it('sin permiso responde 403', () => {
    const req = crearSolicitud();

    req.llaveApi = {
      id: 7,
      permisos: ['read:now'],
      limitePorMinuto: 60,
    };

    const next = vi.fn();

    requerirPermiso('read:spaces')(req, res, next);

    expect(errorDe(next)).toMatchObject({
      estado: 403,
      codigo: 'PERMISO_INSUFICIENTE',
    });
  });

  it('con permiso permite continuar', () => {
    const req = crearSolicitud();

    req.llaveApi = {
      id: 7,
      permisos: ['read:now', 'read:spaces'],
      limitePorMinuto: 60,
    };

    const next = vi.fn();

    requerirPermiso('read:spaces')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});

// ========================================
// AUTENTICACIÓN MIXTA JWT O API KEY
// ========================================

describe('autenticarJwtOApiKey', () => {
  it('sin X-API-Key utiliza JWT', async () => {
    const next = vi.fn();

    await autenticarJwtOApiKey('read:spaces')(
      crearSolicitud({ Authorization: 'Bearer x' }),
      res,
      next
    );

    expect(autenticarJwt).toHaveBeenCalled();

    expect(
      repositorioLlavesApi.buscarPorHash
    ).not.toHaveBeenCalled();

    expect(next).toHaveBeenCalledWith();
  });

  it('con llave válida y permiso permite continuar', async () => {
    vi.mocked(
      repositorioLlavesApi.buscarPorHash
    ).mockResolvedValue(
      filaLlave({ permisos: ['read:spaces'] })
    );

    vi.mocked(clienteRedis.incr).mockResolvedValue(1);

    const next = vi.fn();

    await autenticarJwtOApiKey('read:spaces')(
      crearSolicitud({ 'X-API-Key': LLAVE }),
      res,
      next
    );

    expect(autenticarJwt).not.toHaveBeenCalled();
    expect(clienteRedis.incr).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('con llave sin permiso responde 403', async () => {
    vi.mocked(
      repositorioLlavesApi.buscarPorHash
    ).mockResolvedValue(
      filaLlave({ permisos: ['read:now'] })
    );

    vi.mocked(clienteRedis.incr).mockResolvedValue(1);

    const next = vi.fn();

    await autenticarJwtOApiKey('read:spaces')(
      crearSolicitud({ 'X-API-Key': LLAVE }),
      res,
      next
    );

    expect(errorDe(next)).toMatchObject({
      estado: 403,
      codigo: 'PERMISO_INSUFICIENTE',
    });
  });

  it('con llave revocada responde 401', async () => {
    vi.mocked(
      repositorioLlavesApi.buscarPorHash
    ).mockResolvedValue(
      filaLlave({ revocada: true })
    );

    const next = vi.fn();

    await autenticarJwtOApiKey('read:spaces')(
      crearSolicitud({ 'X-API-Key': LLAVE }),
      res,
      next
    );

    expect(errorDe(next)).toMatchObject({
      estado: 401,
      codigo: 'LLAVE_INVALIDA',
    });

    expect(clienteRedis.incr).not.toHaveBeenCalled();
  });

  it('si Redis falla pasa el error a next()', async () => {
    vi.mocked(
      repositorioLlavesApi.buscarPorHash
    ).mockResolvedValue(
      filaLlave({ permisos: ['read:spaces'] })
    );

    vi.mocked(
      clienteRedis.incr
    ).mockRejectedValue(new Error('Redis caído'));

    const next = vi.fn();

    await autenticarJwtOApiKey('read:spaces')(
      crearSolicitud({ 'X-API-Key': LLAVE }),
      res,
      next
    );

    expect(errorDe(next)).toBeInstanceOf(Error);
  });
});
