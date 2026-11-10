//dueño del archivo integrante C
import type { RespuestaError } from '@reservalab/shared';
import { obtenerTokenAcceso } from './sesion';

const URL_API = import.meta.env.VITE_URL_API;

// Error personalizado para las respuestas de la API
export class ErrorApi extends Error {
  constructor(
    public estado: number,
    public codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

// Realizar solicitudes HTTP a ReservaLab
export async function solicitar<T>(
  ruta: string,
  opciones: RequestInit = {},
): Promise<T> {
  const encabezados = new Headers(opciones.headers);

  // Agregar Content-Type cuando enviamos datos
  if (
    opciones.body !== undefined &&
    !encabezados.has('Content-Type')
  ) {
    encabezados.set('Content-Type', 'application/json');
  }

  // Agregar el token JWT si existe una sesión
  const token = obtenerTokenAcceso();

  if (
    token &&
    !encabezados.has('Authorization') &&
    !encabezados.has('X-API-Key')
  ) {
    encabezados.set('Authorization', `Bearer ${token}`);
  }

  let respuesta: Response;

  try {
    respuesta = await fetch(`${URL_API}${ruta}`, {
      ...opciones,
      headers: encabezados,
    });
  } catch {
    throw new ErrorApi(
      0,
      'SIN_CONEXION',
      'No se pudo conectar con la API',
    );
  }

  // Leer la respuesta (204 puede venir sin contenido)
  const texto = await respuesta.text();
  const cuerpo: unknown = texto ? JSON.parse(texto) : null;

  // Manejar los errores devueltos por la API
  if (!respuesta.ok) {
    const error = (cuerpo as RespuestaError | null)?.error;

    throw new ErrorApi(
      respuesta.status,
      error?.codigo ?? 'ERROR_INTERNO',
      error?.mensaje ?? `Error ${respuesta.status}`,
    );
  }

  return cuerpo as T;
}
