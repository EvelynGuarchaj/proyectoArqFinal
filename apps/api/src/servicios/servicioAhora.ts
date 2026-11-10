//dueño del archivo integrante C
import type {
  OcupacionEdificio,
  RespuestaAhora
} from '@reservalab/shared';

import { entorno } from '../config/entorno';
import { clavesCache } from '../config/clavesCache';
import * as repositorioOcupacion from '../repositorios/repositorioOcupacion';
import * as servicioCache from './servicioCache';

interface EspacioConReservas {
  id: number;
  nombre: string;
  edificio: string;
  reservas: {
    inicio: Date;
    fin: Date;
    motivo: string;
  }[];
}

// Agrupar los espacios según su edificio
export function armarRespuestaAhora(
  espacios: EspacioConReservas[],
  ahora: Date
): RespuestaAhora {
  const porEdificio = new Map<string, OcupacionEdificio>();

  for (const espacio of espacios) {
    let grupo = porEdificio.get(espacio.edificio);

    if (!grupo) {
      grupo = {
        edificio: espacio.edificio,
        espacios: []
      };

      porEdificio.set(espacio.edificio, grupo);
    }

    const reserva = espacio.reservas.find(({ inicio, fin }) => inicio <= ahora && ahora < fin);

    grupo.espacios.push({
      espacioId: espacio.id,
      nombre: espacio.nombre,
      ocupado: Boolean(reserva),
      reservaActual: reserva
        ? {
            inicio: reserva.inicio.toISOString(),
            fin: reserva.fin.toISOString(),
            motivo: reserva.motivo
          }
        : null
    });
  }

  const edificios = [...porEdificio.values()].sort(
    (a, b) => a.edificio.localeCompare(b.edificio)
  );

  return {
    generadoEn: ahora.toISOString(),
    edificios
  };
}

// Obtener la ocupación actual utilizando la caché
export async function obtener() {
  let siguienteCambio = Infinity;
  return servicioCache.obtenerOGuardar(
    clavesCache.ahora(),
    async () => {
      const ahora = new Date();

      const espacios =
        await repositorioOcupacion.obtenerEspaciosConReservasVigentes(ahora);

      for (const { reservas } of espacios) {
        for (const { inicio, fin } of reservas) {
          const cambio = inicio > ahora ? inicio : fin;
          siguienteCambio = Math.min(siguienteCambio, cambio.getTime());
        }
      }
      return armarRespuestaAhora(espacios, ahora);
    },
    () => Math.min(entorno.ttlCacheSegundos, Math.floor((siguienteCambio - Date.now()) / 1000))
  );
}
