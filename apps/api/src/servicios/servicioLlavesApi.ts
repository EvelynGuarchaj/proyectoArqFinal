//dueño del archivo integrante C
import { randomBytes } from 'node:crypto';

import {
  PREFIJO_LLAVE,
  type DatosCrearLlaveApi,
  type LlaveApiCreada,
  type LlaveApiPublica,
  type Permiso,
} from '@reservalab/shared';

import * as repositorioLlavesApi from '../repositorios/repositorioLlavesApi';
import { ErrorAplicacion } from '../utilidades/errores';
import { hashSha256 } from '../utilidades/hash';

interface FilaLlave {
  id: number;
  nombre: string;
  prefijo: string;
  permisos: string[];
  limitePorMinuto: number;
  ultimoUso: Date | null;
  revocada: boolean;
  creadaEn: Date;
}

// Convertir una llave de la BD a una respuesta pública
// Nunca devolver el hash de la llave
export function aLlavePublica(fila: FilaLlave): LlaveApiPublica {
  return {
    id: fila.id,
    nombre: fila.nombre,
    prefijo: fila.prefijo,
    permisos: fila.permisos as Permiso[],
    limitePorMinuto: fila.limitePorMinuto,
    ultimoUso: fila.ultimoUso
      ? fila.ultimoUso.toISOString()
      : null,
    revocada: fila.revocada,
    creadaEn: fila.creadaEn.toISOString(),
  };
}

// Crear una nueva llave API
export async function crear(
  datos: DatosCrearLlaveApi
): Promise<LlaveApiCreada> {
  const llave = PREFIJO_LLAVE + randomBytes(24).toString('hex');

  const fila = await repositorioLlavesApi.crear({
    nombre: datos.nombre,
    prefijo: llave.slice(0, 12),
    hashLlave: hashSha256(llave),
    permisos: datos.permisos,
    limitePorMinuto: datos.limitePorMinuto,
  });

  // La llave completa se devuelve una sola vez
  return {
    ...aLlavePublica(fila),
    llave,
  };
}

// Listar las llaves API
export async function listar(): Promise<LlaveApiPublica[]> {
  const filas = await repositorioLlavesApi.listar();

  return filas.map(aLlavePublica);
}

// Revocar una llave API
export async function revocar(
  id: number
): Promise<LlaveApiPublica> {
  const existente = await repositorioLlavesApi.buscarPorId(id);

  if (!existente) {
    throw new ErrorAplicacion(
      404,
      'NO_ENCONTRADO',
      'La llave API no existe'
    );
  }

  const fila = await repositorioLlavesApi.revocar(id);

  return aLlavePublica(fila);
}
