// DUEÑA: B
// Reglas de negocio de espacios (RF-05 y RF-06). Nunca toca req ni res.
import type {
  DatosActualizarEspacio,
  DatosCrearEspacio,
  Espacio,
  FiltrosEspacios,
} from '@reservalab/shared';
import { clavesCache, patronesCache } from '../config/clavesCache';
import * as repositorioEspacios from '../repositorios/repositorioEspacios';
import { ErrorAplicacion } from '../utilidades/errores';
import * as servicioCache from './servicioCache';

type FilaEspacio = NonNullable<Awaited<ReturnType<typeof repositorioEspacios.buscarPorId>>>;

// Quita creadoEn y deja solo lo que define el tipo compartido
function aEspacioPublico(fila: FilaEspacio): Espacio {
  return {
    id: fila.id,
    nombre: fila.nombre,
    edificio: fila.edificio,
    capacidad: fila.capacidad,
    tipo: fila.tipo,
    horaApertura: fila.horaApertura,
    horaCierre: fila.horaCierre,
    activo: fila.activo,
  };
}

function validarHorario(horaApertura: number, horaCierre: number) {
  if (horaApertura >= horaCierre) {
    throw new ErrorAplicacion(400, 'VALIDACION', 'La hora de apertura debe ser menor que la de cierre');
  }
}

// Regla de invalidación (sección 3.9): espacios, disponibilidad del espacio y /now
async function invalidarCacheDeEspacio(espacioId: number) {
  await Promise.all([
    servicioCache.invalidarPorPatron(patronesCache.todosLosEspacios),
    servicioCache.invalidarPorPatron(patronesCache.disponibilidadDeEspacio(espacioId)),
    servicioCache.invalidarPorPatron(clavesCache.ahora()),
  ]);
}

async function obtenerActivoOFallar(id: number): Promise<FilaEspacio> {
  const espacio = await repositorioEspacios.buscarPorId(id);
  if (!espacio || !espacio.activo) {
    throw new ErrorAplicacion(404, 'NO_ENCONTRADO', 'El espacio no existe');
  }
  return espacio;
}

export async function listar(filtros: FiltrosEspacios) {
  return servicioCache.obtenerOGuardar<Espacio[]>(
    clavesCache.espacios(filtros.edificio, filtros.capacidadMinima),
    async () => (await repositorioEspacios.listarActivos(filtros)).map(aEspacioPublico),
  );
}

export async function crear(datos: DatosCrearEspacio): Promise<Espacio> {
  validarHorario(datos.horaApertura, datos.horaCierre);
  if (await repositorioEspacios.buscarPorNombre(datos.nombre)) {
    throw new ErrorAplicacion(409, 'DUPLICADO', 'Ya existe un espacio con ese nombre');
  }
  const espacio = await repositorioEspacios.crear(datos);
  await invalidarCacheDeEspacio(espacio.id);
  return aEspacioPublico(espacio);
}

export async function actualizar(id: number, datos: DatosActualizarEspacio): Promise<Espacio> {
  const actual = await obtenerActivoOFallar(id);
  validarHorario(datos.horaApertura ?? actual.horaApertura, datos.horaCierre ?? actual.horaCierre);

  if (datos.nombre && datos.nombre !== actual.nombre) {
    const otro = await repositorioEspacios.buscarPorNombre(datos.nombre);
    if (otro && otro.id !== id) {
      throw new ErrorAplicacion(409, 'DUPLICADO', 'Ya existe un espacio con ese nombre');
    }
  }

  const espacio = await repositorioEspacios.actualizar(id, datos);
  await invalidarCacheDeEspacio(id);
  return aEspacioPublico(espacio);
}

export async function desactivar(id: number): Promise<void> {
  await obtenerActivoOFallar(id);
  await repositorioEspacios.desactivar(id);
  await invalidarCacheDeEspacio(id);
}
