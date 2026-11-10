//propiedad de integrante c 
import type {
  RespuestaError,
  RespuestaLogin
} from '@reservalab/shared';

import { configuracion } from './configuracion';

export class ErrorCli extends Error {}

// Realizar solicitudes HTTP a la API
export async function solicitar<T>(
  ruta: string,
  opciones: RequestInit = {},
  token?: string
): Promise<T> {
  const encabezados = new Headers(opciones.headers);

  if (opciones.body !== undefined) {
    encabezados.set('Content-Type', 'application/json');
  }

  if (token) {
    encabezados.set('Authorization', `Bearer ${token}`);
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${configuracion.urlApi}${ruta}`,
      {
        ...opciones,
        headers: encabezados
      }
    );
  } catch {
    throw new ErrorCli(
      `No se pudo conectar con la API en ${configuracion.urlApi}. ¿Está corriendo?`
    );
  }

  const texto = await respuesta.text();
  const cuerpo: unknown = texto ? JSON.parse(texto) : null;

  if (!respuesta.ok) {
    const error = (cuerpo as RespuestaError | null)?.error;

    throw new ErrorCli(
      `${respuesta.status} ${error?.codigo ?? ''}: ${error?.mensaje ?? 'Error de la API'}`
    );
  }

  return cuerpo as T;
}

// Iniciar sesión como administrador
export async function iniciarSesionAdministrador(
  correo: string,
  contrasena: string
): Promise<string> {
  const respuesta = await solicitar<RespuestaLogin>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({
        correo,
        contrasena
      })
    }
  );

  if (respuesta.usuario.rol !== 'administrador') {
    throw new ErrorCli('El usuario no es administrador');
  }

  return respuesta.tokenAcceso;
}
