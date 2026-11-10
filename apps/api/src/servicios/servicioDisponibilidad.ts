// DUEÑA: B
// Bloques de disponibilidad (RF-07) y utilidades de hora de Guatemala.
import {
  DURACION_BLOQUE_MINUTOS,
  ZONA_HORARIA,
  type BloqueDisponibilidad,
  type Disponibilidad,
} from '@reservalab/shared';
import { clavesCache } from '../config/clavesCache';
import * as repositorioEspacios from '../repositorios/repositorioEspacios';
import * as repositorioReservas from '../repositorios/repositorioReservas';
import { ErrorAplicacion } from '../utilidades/errores';
import * as servicioCache from './servicioCache';

const MS_POR_MINUTO = 60_000;
const MS_POR_HORA = 60 * MS_POR_MINUTO;

// '-06:00' -> -360 minutos
function desfaseMinutos(): number {
  const signo = ZONA_HORARIA.startsWith('-') ? -1 : 1;
  const [horas, minutos] = ZONA_HORARIA.slice(1).split(':').map(Number);
  return signo * (horas * 60 + minutos);
}

// Medianoche (hora Guatemala) de una fecha 'AAAA-MM-DD'
export function inicioDelDia(fecha: string): Date {
  return new Date(`${fecha}T00:00:00${ZONA_HORARIA}`);
}

// Fecha 'AAAA-MM-DD' (hora Guatemala) de un instante
export function fechaLocal(instante: Date): string {
  return new Date(instante.getTime() + desfaseMinutos() * MS_POR_MINUTO).toISOString().slice(0, 10);
}

// '2026-02-31' pasa el regex pero no existe: JS lo convierte en 3 de marzo
export function esFechaValida(fecha: string): boolean {
  const dia = inicioDelDia(fecha);
  return !Number.isNaN(dia.getTime()) && fechaLocal(dia) === fecha;
}

// Función pura: no toca BD ni Redis. Fácil de probar.
export function generarBloques(
  fecha: string,
  horaApertura: number,
  horaCierre: number,
  reservas: Array<{ inicio: Date; fin: Date }>,
): BloqueDisponibilidad[] {
  const medianoche = inicioDelDia(fecha).getTime();
  const apertura = medianoche + horaApertura * MS_POR_HORA;
  const cierre = medianoche + horaCierre * MS_POR_HORA;
  const duracion = DURACION_BLOQUE_MINUTOS * MS_POR_MINUTO;

  const bloques: BloqueDisponibilidad[] = [];
  for (let inicio = apertura; inicio + duracion <= cierre; inicio += duracion) {
    const fin = inicio + duracion;
    const ocupado = reservas.some((r) => r.inicio.getTime() < fin && r.fin.getTime() > inicio);
    bloques.push({
      inicio: new Date(inicio).toISOString(),
      fin: new Date(fin).toISOString(),
      estado: ocupado ? 'ocupado' : 'libre',
    });
  }
  return bloques;
}

export async function obtenerDisponibilidad(espacioId: number, fecha: string) {
  if (!esFechaValida(fecha)) {
    throw new ErrorAplicacion(400, 'VALIDACION', 'La fecha no existe');
  }

  return servicioCache.obtenerOGuardar<Disponibilidad>(clavesCache.disponibilidad(espacioId, fecha), async () => {
    const espacio = await repositorioEspacios.buscarPorId(espacioId);
    if (!espacio || !espacio.activo) {
      throw new ErrorAplicacion(404, 'NO_ENCONTRADO', 'El espacio no existe');
    }

    const desde = inicioDelDia(fecha);
    const hasta = new Date(desde.getTime() + 24 * MS_POR_HORA);
    const reservas = await repositorioReservas.listarConfirmadasEnRango(espacioId, desde, hasta);

    return {
      espacioId,
      fecha,
      bloques: generarBloques(fecha, espacio.horaApertura, espacio.horaCierre, reservas),
    };
  });
}
