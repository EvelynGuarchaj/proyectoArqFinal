//dueño del archivo integrante c
import type { RespuestaAhora } from '@reservalab/shared';
import { solicitar } from './api';
import { crearElemento, hora } from './formato';

const INTERVALO_MS = 30_000;
const LLAVE = import.meta.env.VITE_LLAVE_API_PANTALLA;

// Elementos de la pantalla
const cuerpoTabla = document.querySelector<HTMLTableSectionElement>(
  '#tabla-ocupacion tbody'
);

const horaActualizacion = document.getElementById(
  'hora-actualizacion'
);

const mensaje = document.getElementById(
  'mensaje-pantalla'
);

// Consultar la ocupación actual
async function actualizar() {
  if (!cuerpoTabla || !horaActualizacion || !mensaje) {
    return;
  }

  try {
    const datos = await solicitar<RespuestaAhora>('/now', {
      headers: {
        'X-API-Key': LLAVE
      }
    });

    const filas: HTMLTableRowElement[] = [];

    for (const edificio of datos.edificios) {
      for (const espacio of edificio.espacios) {
        const fila = crearElemento(
          'tr',
          undefined,
          espacio.ocupado ? 'ocupado' : 'libre'
        );

        fila.append(
          crearElemento('td', edificio.edificio),
          crearElemento('td', espacio.nombre),
          crearElemento(
            'td',
            espacio.ocupado ? 'Ocupado' : 'Libre',
            'estado'
          ),
          crearElemento(
            'td',
            espacio.reservaActual
              ? `${hora(espacio.reservaActual.inicio)} – ${hora(espacio.reservaActual.fin)} · ${espacio.reservaActual.motivo}`
              : '—'
          )
        );

        filas.push(fila);
      }
    }

    cuerpoTabla.replaceChildren(...filas);

    horaActualizacion.textContent =
      `Actualizado a las ${hora(datos.generadoEn)} · se refresca cada 30 s`;

    mensaje.textContent = '';

  } catch (error) {
    // Mantener la última tabla si ocurre un error
    mensaje.textContent =
      error instanceof Error
        ? error.message
        : 'Error inesperado';

    mensaje.dataset.tipo = 'error';
  }
}

// Primera actualización
void actualizar();

// Actualización automática cada 30 segundos
setInterval(() => void actualizar(), INTERVALO_MS);
