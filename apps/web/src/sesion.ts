//dueño del archivo: Integrante C
import type {
  RespuestaLogin,
  UsuarioPublico
} from '@reservalab/shared';

// La sesión se guarda únicamente en memoria
let tokenAcceso: string | null = null;
let tokenRefresco: string | null = null;
let usuarioActual: UsuarioPublico | null = null;

// Guardar los datos después del login
export function guardarSesion(respuesta: RespuestaLogin): void {
  tokenAcceso = respuesta.tokenAcceso;
  tokenRefresco = respuesta.tokenRefresco;
  usuarioActual = respuesta.usuario;
}

// Obtener token de acceso
export function obtenerTokenAcceso(): string | null {
  return tokenAcceso;
}

// Obtener token de refresco
export function obtenerTokenRefresco(): string | null {
  return tokenRefresco;
}

// Obtener usuario autenticado
export function obtenerUsuario(): UsuarioPublico | null {
  return usuarioActual;
}

// Cerrar sesión y limpiar los datos
export function borrarSesion(): void {
  tokenAcceso = null;
  tokenRefresco = null;
  usuarioActual = null;
}
