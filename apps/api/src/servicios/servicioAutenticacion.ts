import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type {
  DatosLogin,
  DatosRegistro,
  RespuestaLogin,
  RespuestaRefresco,
  Rol,
  UsuarioPublico,
} from '@reservalab/shared';
import { entorno } from '../config/entorno';
import { ErrorAplicacion } from '../utilidades/errores';
import { hashSha256 } from '../utilidades/hash';
import * as repositorioUsuarios from '../repositorios/repositorioUsuarios';
import * as repositorioTokensRefresco from '../repositorios/repositorioTokensRefresco';

const COSTO_BCRYPT = 10;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

function aUsuarioPublico(usuario: { id: number; nombre: string; correo: string; rol: Rol }): UsuarioPublico {
  return { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol };
}

function firmarTokenAcceso(usuario: { id: number; rol: Rol }): string {
  return jwt.sign({ sub: String(usuario.id), rol: usuario.rol }, entorno.secretoJwt, {
    expiresIn: entorno.duracionTokenAcceso as SignOptions['expiresIn'],
  });
}

function errorTokenInvalido() {
  return new ErrorAplicacion(401, 'TOKEN_INVALIDO', 'El token de refresco es inválido o está vencido');
}

// RF-01
export async function registrar(datos: DatosRegistro): Promise<UsuarioPublico> {
  return crearUsuario(datos, 'estudiante');
}

export async function crearUsuario(datos: DatosRegistro, rol: Rol): Promise<UsuarioPublico> {
  const existente = await repositorioUsuarios.buscarPorCorreo(datos.correo);
  if (existente) {
    throw new ErrorAplicacion(409, 'DUPLICADO', 'Ya existe un usuario con ese correo');
  }

  const hashContrasena = await bcrypt.hash(datos.contrasena, COSTO_BCRYPT);
  const usuario = await repositorioUsuarios.crear({
    nombre: datos.nombre,
    correo: datos.correo,
    hashContrasena,
    rol,
  });
  return aUsuarioPublico(usuario);
}

// RF-02
export async function iniciarSesion(datos: DatosLogin): Promise<RespuestaLogin> {
  const usuario = await repositorioUsuarios.buscarPorCorreo(datos.correo);
  const contrasenaValida = usuario ? await bcrypt.compare(datos.contrasena, usuario.hashContrasena) : false;
  if (!usuario?.activo || !contrasenaValida) {
    // Mismo mensaje para correo o contraseña incorrectos (no revela cuál falló)
    throw new ErrorAplicacion(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos');
  }

  const tokenAcceso = firmarTokenAcceso(usuario);
  const tokenRefresco = randomBytes(48).toString('hex');
  await repositorioTokensRefresco.crear({
    usuarioId: usuario.id,
    hashToken: hashSha256(tokenRefresco),
    expiraEn: new Date(Date.now() + entorno.diasTokenRefresco * MS_POR_DIA),
  });

  return { tokenAcceso, tokenRefresco, usuario: aUsuarioPublico(usuario) };
}

// RF-03
export async function refrescar(tokenRefresco: string): Promise<RespuestaRefresco> {
  const registro = await repositorioTokensRefresco.buscarPorHash(hashSha256(tokenRefresco));
  if (!registro?.usuario.activo || registro.revocado || registro.expiraEn.getTime() <= Date.now()) {
    throw errorTokenInvalido();
  }
  return { tokenAcceso: firmarTokenAcceso(registro.usuario) };
}

// RF-04
export async function cerrarSesion(usuarioId: number, tokenRefresco: string): Promise<void> {
  const registro = await repositorioTokensRefresco.buscarPorHash(hashSha256(tokenRefresco));
  if (!registro || registro.usuarioId !== usuarioId) {
    throw errorTokenInvalido();
  }
  await repositorioTokensRefresco.revocar(registro.id);
}
