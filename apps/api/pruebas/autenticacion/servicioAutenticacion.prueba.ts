import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { ErrorAplicacion } from '../../src/utilidades/errores';
import * as repositorioUsuarios from '../../src/repositorios/repositorioUsuarios';
import * as repositorioTokensRefresco from '../../src/repositorios/repositorioTokensRefresco';
import * as servicioAutenticacion from '../../src/servicios/servicioAutenticacion';

// Pruebas unitarias: los repositorios se simulan, no se toca la base de datos
vi.mock('../../src/repositorios/repositorioUsuarios', () => ({
  buscarPorCorreo: vi.fn(),
  buscarPorId: vi.fn(),
  crear: vi.fn(),
}));

vi.mock('../../src/repositorios/repositorioTokensRefresco', () => ({
  crear: vi.fn(),
  buscarPorHash: vi.fn(),
  revocar: vi.fn(),
}));

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const usuarioSemilla = {
  id: 1,
  nombre: 'Usuario Prueba',
  correo: 'prueba@reservalab.edu',
  hashContrasena: bcrypt.hashSync('Correcta1234', 4),
  rol: 'estudiante' as const,
  creadoEn: new Date(),
  activo: true,
};

function registroToken(cambios: Partial<{ revocado: boolean; expiraEn: Date; usuarioId: number }> = {}) {
  return {
    id: 10,
    usuarioId: usuarioSemilla.id,
    hashToken: 'hash',
    revocado: false,
    expiraEn: new Date(Date.now() + 7 * MS_POR_DIA),
    creadoEn: new Date(),
    usuario: usuarioSemilla,
    ...cambios,
  };
}

async function capturarError(promesa: Promise<unknown>): Promise<ErrorAplicacion> {
  try {
    await promesa;
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorAplicacion);
    return error as ErrorAplicacion;
  }
  throw new Error('Se esperaba que la promesa fallara');
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('servicioAutenticacion.registrar', () => {
  it('rechaza un correo repetido con 409 DUPLICADO', async () => {
    vi.mocked(repositorioUsuarios.buscarPorCorreo).mockResolvedValue(usuarioSemilla as never);

    const error = await capturarError(
      servicioAutenticacion.registrar({ nombre: 'Otra', correo: usuarioSemilla.correo, contrasena: 'Clave12345' }),
    );

    expect(error.estado).toBe(409);
    expect(error.codigo).toBe('DUPLICADO');
    expect(repositorioUsuarios.crear).not.toHaveBeenCalled();
  });

  it('crea al usuario como estudiante y no devuelve el hash', async () => {
    vi.mocked(repositorioUsuarios.buscarPorCorreo).mockResolvedValue(null);
    vi.mocked(repositorioUsuarios.crear).mockImplementation(
      (datos) => Promise.resolve({ id: 2, creadoEn: new Date(), ...datos }) as never,
    );

    const usuario = await servicioAutenticacion.registrar({
      nombre: 'Nueva',
      correo: 'nueva@reservalab.edu',
      contrasena: 'Clave12345',
    });

    expect(usuario).toEqual({ id: 2, nombre: 'Nueva', correo: 'nueva@reservalab.edu', rol: 'estudiante' });
    const datosCreados = vi.mocked(repositorioUsuarios.crear).mock.calls[0][0];
    expect(datosCreados.hashContrasena).not.toBe('Clave12345');
  });
});

describe('servicioAutenticacion.iniciarSesion', () => {
  it('rechaza una contraseña incorrecta con 401 CREDENCIALES_INVALIDAS', async () => {
    vi.mocked(repositorioUsuarios.buscarPorCorreo).mockResolvedValue(usuarioSemilla as never);

    const error = await capturarError(
      servicioAutenticacion.iniciarSesion({ correo: usuarioSemilla.correo, contrasena: 'Incorrecta1234' }),
    );

    expect(error.estado).toBe(401);
    expect(error.codigo).toBe('CREDENCIALES_INVALIDAS');
    expect(repositorioTokensRefresco.crear).not.toHaveBeenCalled();
  });

  it('rechaza un correo inexistente con 401 CREDENCIALES_INVALIDAS', async () => {
    vi.mocked(repositorioUsuarios.buscarPorCorreo).mockResolvedValue(null);

    const error = await capturarError(
      servicioAutenticacion.iniciarSesion({ correo: 'nadie@reservalab.edu', contrasena: 'Correcta1234' }),
    );

    expect(error.estado).toBe(401);
    expect(error.codigo).toBe('CREDENCIALES_INVALIDAS');
  });

  it('devuelve los dos tokens y guarda solo el hash del token de refresco', async () => {
    vi.mocked(repositorioUsuarios.buscarPorCorreo).mockResolvedValue(usuarioSemilla as never);

    const respuesta = await servicioAutenticacion.iniciarSesion({
      correo: usuarioSemilla.correo,
      contrasena: 'Correcta1234',
    });

    expect(respuesta.tokenAcceso).toBeTypeOf('string');
    expect(respuesta.tokenRefresco).toHaveLength(96);
    expect(respuesta.usuario).not.toHaveProperty('hashContrasena');
    const datosToken = vi.mocked(repositorioTokensRefresco.crear).mock.calls[0][0];
    expect(datosToken.hashToken).not.toBe(respuesta.tokenRefresco);
    expect(datosToken.expiraEn.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('servicioAutenticacion.refrescar', () => {
  it('rechaza un token revocado con 401 TOKEN_INVALIDO', async () => {
    vi.mocked(repositorioTokensRefresco.buscarPorHash).mockResolvedValue(registroToken({ revocado: true }) as never);

    const error = await capturarError(servicioAutenticacion.refrescar('token-revocado'));

    expect(error.estado).toBe(401);
    expect(error.codigo).toBe('TOKEN_INVALIDO');
  });

  it('rechaza un token vencido con 401 TOKEN_INVALIDO', async () => {
    vi.mocked(repositorioTokensRefresco.buscarPorHash).mockResolvedValue(
      registroToken({ expiraEn: new Date(Date.now() - 1000) }) as never,
    );

    const error = await capturarError(servicioAutenticacion.refrescar('token-vencido'));

    expect(error.estado).toBe(401);
    expect(error.codigo).toBe('TOKEN_INVALIDO');
  });

  it('rechaza un token que no existe con 401 TOKEN_INVALIDO', async () => {
    vi.mocked(repositorioTokensRefresco.buscarPorHash).mockResolvedValue(null);

    const error = await capturarError(servicioAutenticacion.refrescar('token-inexistente'));

    expect(error.estado).toBe(401);
  });

  it('devuelve un nuevo token de acceso si el token es válido', async () => {
    vi.mocked(repositorioTokensRefresco.buscarPorHash).mockResolvedValue(registroToken() as never);

    const respuesta = await servicioAutenticacion.refrescar('token-valido');

    expect(respuesta.tokenAcceso).toBeTypeOf('string');
  });
});

describe('servicioAutenticacion.cerrarSesion', () => {
  it('rechaza el token de otro usuario con 401 y no lo revoca', async () => {
    vi.mocked(repositorioTokensRefresco.buscarPorHash).mockResolvedValue(registroToken({ usuarioId: 99 }) as never);

    const error = await capturarError(servicioAutenticacion.cerrarSesion(usuarioSemilla.id, 'token-ajeno'));

    expect(error.estado).toBe(401);
    expect(error.codigo).toBe('TOKEN_INVALIDO');
    expect(repositorioTokensRefresco.revocar).not.toHaveBeenCalled();
  });

  it('revoca el token si es del usuario autenticado', async () => {
    vi.mocked(repositorioTokensRefresco.buscarPorHash).mockResolvedValue(registroToken() as never);

    await servicioAutenticacion.cerrarSesion(usuarioSemilla.id, 'token-propio');

    expect(repositorioTokensRefresco.revocar).toHaveBeenCalledWith(10);
  });
});
