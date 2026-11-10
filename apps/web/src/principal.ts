//dueño del archivo: Integrante C
import type {
  Disponibilidad,
  Espacio,
  Reserva,
  RespuestaLogin
} from '@reservalab/shared';

import { solicitar } from './api';
import {
  crearElemento,
  fechaCorta,
  hora,
  hoyEnGuatemala
} from './formato';

import {
  borrarSesion,
  guardarSesion,
  obtenerTokenRefresco,
  obtenerUsuario
} from './sesion';

// Obtener elementos HTML por su ID
function porId<T extends HTMLElement>(id: string): T {
  const elemento = document.getElementById(id);

  if (!elemento) {
    throw new Error(`Falta el elemento #${id}`);
  }

  return elemento as T;
}

// Elementos del inicio de sesión
const formularioLogin = porId<HTMLFormElement>('formulario-login');
const campoCorreo = porId<HTMLInputElement>('campo-correo');
const campoContrasena = porId<HTMLInputElement>('campo-contrasena');
const mensajeLogin = porId<HTMLParagraphElement>('mensaje-login');

const seccionLogin = porId<HTMLElement>('seccion-login');
const seccionReservas = porId<HTMLElement>('seccion-reservas');

// Barra del usuario
const barraUsuario = porId<HTMLDivElement>('barra-usuario');
const nombreUsuario = porId<HTMLSpanElement>('nombre-usuario');
const botonSalir = porId<HTMLButtonElement>('boton-salir');

// Elementos de reservas
const selectorEspacio = porId<HTMLSelectElement>('selector-espacio');
const selectorFecha = porId<HTMLInputElement>('selector-fecha');
const campoMotivo = porId<HTMLInputElement>('campo-motivo');
const mensajeReservas = porId<HTMLParagraphElement>('mensaje-reservas');
const listaBloques = porId<HTMLUListElement>('lista-bloques');
const listaMisReservas = porId<HTMLUListElement>('lista-mis-reservas');

// Mostrar mensajes
function mostrarMensaje(
  elemento: HTMLElement,
  texto: string,
  tipo: 'error' | 'exito' | '' = ''
) {
  elemento.textContent = texto;
  elemento.dataset.tipo = tipo;
}

function textoDeError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Error inesperado';
}

// ========================================
// INICIO DE SESIÓN
// ========================================

formularioLogin.addEventListener('submit', async (evento) => {
  evento.preventDefault();

  mostrarMensaje(mensajeLogin, 'Entrando…');

  try {
    const respuesta = await solicitar<RespuestaLogin>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        correo: campoCorreo.value.trim(),
        contrasena: campoContrasena.value
      })
    });

    guardarSesion(respuesta);

    campoContrasena.value = '';
    mostrarMensaje(mensajeLogin, '');

    await entrarAReservas();

  } catch (error) {
    mostrarMensaje(
      mensajeLogin,
      textoDeError(error),
      'error'
    );
  }
});

// ========================================
// CERRAR SESIÓN
// ========================================

botonSalir.addEventListener('click', async () => {
  const tokenRefresco = obtenerTokenRefresco();

  try {
    if (tokenRefresco) {
      await solicitar('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ tokenRefresco })
      });
    }
  } catch {
    // La sesión local se elimina aunque falle el servidor
  }

  borrarSesion();

  seccionReservas.hidden = true;
  barraUsuario.hidden = true;
  seccionLogin.hidden = false;
});

// ========================================
// ENTRAR A RESERVAS
// ========================================

async function entrarAReservas() {
  const usuario = obtenerUsuario();

  nombreUsuario.textContent = usuario
    ? `${usuario.nombre} (${usuario.rol})`
    : '';

  seccionLogin.hidden = true;
  barraUsuario.hidden = false;
  seccionReservas.hidden = false;

  if (!selectorFecha.value) {
    selectorFecha.value = hoyEnGuatemala();
  }

  await cargarEspacios();

  await Promise.all([
    cargarBloques(),
    cargarMisReservas()
  ]);
}

// ========================================
// CARGAR ESPACIOS
// ========================================

async function cargarEspacios() {
  try {
    const espacios = await solicitar<Espacio[]>('/spaces');

    selectorEspacio.replaceChildren(
      ...espacios.map((espacio) => {
        const opcion = crearElemento(
          'option',
          `${espacio.nombre} — edificio ${espacio.edificio} (${espacio.capacidad})`
        );

        opcion.value = String(espacio.id);

        return opcion;
      })
    );

  } catch (error) {
    mostrarMensaje(
      mensajeReservas,
      textoDeError(error),
      'error'
    );
  }
}

selectorEspacio.addEventListener(
  'change',
  () => void cargarBloques()
);

selectorFecha.addEventListener(
  'change',
  () => void cargarBloques()
);

// ========================================
// BLOQUES DE DISPONIBILIDAD
// ========================================

async function cargarBloques() {
  const espacioId = Number(selectorEspacio.value);
  const fecha = selectorFecha.value;

  if (!espacioId || !fecha) {
    listaBloques.replaceChildren();
    return;
  }

  try {
    const disponibilidad = await solicitar<Disponibilidad>(
      `/spaces/${espacioId}/availability?date=${encodeURIComponent(fecha)}`
    );

    listaBloques.replaceChildren(
      ...disponibilidad.bloques.map((bloque) => {
        const elemento = crearElemento(
          'li',
          undefined,
          `bloque bloque-${bloque.estado}`
        );

        elemento.append(
          crearElemento(
            'span',
            `${hora(bloque.inicio)} – ${hora(bloque.fin)}`
          )
        );

        elemento.append(
          crearElemento(
            'span',
            bloque.estado === 'libre' ? 'Libre' : 'Ocupado',
            'estado'
          )
        );

        if (bloque.estado === 'libre') {
          const boton = crearElemento('button', 'Reservar');

          boton.type = 'button';

          boton.addEventListener(
            'click',
            () => void reservar(
              espacioId,
              bloque.inicio,
              bloque.fin
            )
          );

          elemento.append(boton);
        }

        return elemento;
      })
    );

  } catch (error) {
    listaBloques.replaceChildren();

    mostrarMensaje(
      mensajeReservas,
      textoDeError(error),
      'error'
    );
  }
}

// ========================================
// CREAR RESERVA
// ========================================

async function reservar(
  espacioId: number,
  inicio: string,
  fin: string
) {
  mostrarMensaje(mensajeReservas, 'Reservando…');

  try {
    await solicitar<Reserva>('/reservations', {
      method: 'POST',
      body: JSON.stringify({
        espacioId,
        inicio,
        fin,
        motivo: campoMotivo.value.trim()
      })
    });

    mostrarMensaje(
      mensajeReservas,
      `Reserva confirmada: ${hora(inicio)} – ${hora(fin)}`,
      'exito'
    );

  } catch (error) {
    mostrarMensaje(
      mensajeReservas,
      textoDeError(error),
      'error'
    );
  }

  await Promise.all([
    cargarBloques(),
    cargarMisReservas()
  ]);
}

// ========================================
// MIS RESERVAS
// ========================================

async function cargarMisReservas() {
  try {
    const reservas = await solicitar<Reserva[]>('/reservations/me');

    if (reservas.length === 0) {
      listaMisReservas.replaceChildren(
        crearElemento('li', 'No tienes reservas.', 'ayuda')
      );
      return;
    }

    listaMisReservas.replaceChildren(
      ...reservas.map((reserva) => {
        const elemento = crearElemento(
          'li',
          undefined,
          `reserva reserva-${reserva.estado}`
        );

        const lugar = reserva.espacio
          ? `${reserva.espacio.nombre} (${reserva.espacio.edificio})`
          : `Espacio ${reserva.espacioId}`;

        elemento.append(
          crearElemento(
            'span',
            `${fechaCorta(reserva.inicio)} ${hora(reserva.inicio)} – ${hora(reserva.fin)} · ${lugar} · ${reserva.motivo}`
          ),
          crearElemento('span', reserva.estado, 'estado')
        );

        if (
          reserva.estado === 'confirmada' &&
          new Date(reserva.fin) > new Date()
        ) {
          const boton = crearElemento('button', 'Cancelar');

          boton.type = 'button';

          boton.addEventListener(
            'click',
            () => void cancelar(reserva.id)
          );

          elemento.append(boton);
        }

        return elemento;
      })
    );

  } catch (error) {
    mostrarMensaje(
      mensajeReservas,
      textoDeError(error),
      'error'
    );
  }
}

// ========================================
// CANCELAR RESERVA
// ========================================

async function cancelar(id: number) {
  try {
    await solicitar(`/reservations/${id}`, {
      method: 'DELETE'
    });

    mostrarMensaje(
      mensajeReservas,
      'Reserva cancelada',
      'exito'
    );

  } catch (error) {
    mostrarMensaje(
      mensajeReservas,
      textoDeError(error),
      'error'
    );
  }

  await Promise.all([
    cargarBloques(),
    cargarMisReservas()
  ]);
}
