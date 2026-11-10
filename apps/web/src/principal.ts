//dueño del archivo: Integrante C
import type {
  Disponibilidad,
  Espacio,
  EstudianteSeleccionable,
  Reserva,
  RespuestaLogin
} from '@reservalab/shared';

import { solicitar } from './api';
import { cerrarPanelUsuarios, abrirPanelUsuarios } from './usuarios';
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
const dialogoReserva = porId<HTMLDialogElement>('dialogo-reserva');
const formularioReserva = porId<HTMLFormElement>('formulario-reserva');
const confirmarReserva = porId<HTMLButtonElement>('confirmar-reserva');
const horarioReserva = porId<HTMLParagraphElement>('horario-reserva');
const selectorFinReserva = porId<HTMLSelectElement>('selector-fin-reserva');
let reservaPendiente: { espacioId: number; inicio: string; fines: string[] } | undefined;
const selectorEstudiante = porId<HTMLSelectElement>('selector-estudiante');
const mensajeEstudiantes = porId<HTMLSpanElement>('mensaje-estudiantes');
const campoMotivo = porId<HTMLInputElement>('campo-motivo');
const mensajeReservas = porId<HTMLParagraphElement>('mensaje-reservas');
const listaBloques = porId<HTMLUListElement>('lista-bloques');
const listaMisReservas = porId<HTMLUListElement>('lista-mis-reservas');

const seccionAdministracion = porId<HTMLElement>('seccion-administracion');
const formularioEspacio = porId<HTMLFormElement>('formulario-espacio');
const camposEspacio = porId<HTMLFieldSetElement>('campos-espacio');
const botonDesactivar = porId<HTMLButtonElement>('boton-desactivar-espacio');
const selectorEdicion = porId<HTMLSelectElement>('selector-edicion');
const mensajeAdministracion = porId<HTMLParagraphElement>('mensaje-administracion');
const campoMotivoEtiqueta = porId<HTMLLabelElement>('etiqueta-motivo');
let espaciosDisponibles: Espacio[] = [];

function puedeReservar() {
  const rol = obtenerUsuario()?.rol;
  return rol === 'administrador' || rol === 'docente';
}

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
  cerrarPanelUsuarios();
  listaMisReservas.replaceChildren();
  reservaPendiente = undefined;
  dialogoReserva.close();
  selectorEstudiante.replaceChildren();

  formularioEspacio.reset();
  mostrarMensaje(mensajeAdministracion, '');
  botonDesactivar.hidden = true;
  seccionAdministracion.hidden = true;
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
  seccionAdministracion.hidden = usuario?.rol !== 'administrador';
  campoMotivoEtiqueta.hidden = !puedeReservar();
  listaBloques.replaceChildren();
  listaMisReservas.replaceChildren();

  if (!selectorFecha.value) {
    selectorFecha.value = hoyEnGuatemala();
  }

  await cargarEspacios();

  await Promise.all([
    cargarBloques(),
    cargarMisReservas(),
    abrirPanelUsuarios()
  ]);
}

// ========================================
// CONFIRMAR RESERVA
// ========================================

function mostrarHorarioReserva() {
  if (!reservaPendiente) return;
  const { inicio } = reservaPendiente;
  horarioReserva.textContent = `${fechaCorta(inicio)} · ${hora(inicio)} – ${hora(selectorFinReserva.value)}`;
}

selectorFinReserva.addEventListener('change', mostrarHorarioReserva);

async function abrirDialogoReserva(espacioId: number, inicio: string, fines: string[]) {
  if (!puedeReservar() || dialogoReserva.open) return;

  const pendiente = { espacioId, inicio, fines };
  reservaPendiente = pendiente;
  selectorFinReserva.replaceChildren(...fines.map((fin) => new Option(hora(fin), fin)));
  mostrarHorarioReserva();
  selectorEstudiante.replaceChildren(new Option('Sin estudiante vinculado', ''));
  selectorEstudiante.disabled = true;
  confirmarReserva.disabled = true;
  mensajeEstudiantes.textContent = 'Cargando estudiantes…';
  dialogoReserva.showModal();

  try {
    const estudiantes = await solicitar<EstudianteSeleccionable[]>('/reservations/students');
    if (reservaPendiente !== pendiente || !dialogoReserva.open) return;
    selectorEstudiante.append(
      ...estudiantes.map(({ id, nombre }) => new Option(`${nombre} (#${id})`, String(id)))
    );
    selectorEstudiante.disabled = false;
    mensajeEstudiantes.textContent = '';
  } catch (error) {
    if (reservaPendiente !== pendiente || !dialogoReserva.open) return;
    mensajeEstudiantes.textContent = textoDeError(error);
  } finally {
    if (reservaPendiente === pendiente && dialogoReserva.open) confirmarReserva.disabled = false;
  }
}

porId<HTMLButtonElement>('cancelar-dialogo-reserva').addEventListener('click', () => dialogoReserva.close());

formularioReserva.addEventListener('submit', (evento) => {
  evento.preventDefault();
  if (!dialogoReserva.open || !reservaPendiente || confirmarReserva.disabled || !puedeReservar()) return;

  const { espacioId, inicio, fines } = reservaPendiente;
  const fin = selectorFinReserva.value;
  if (!fines.includes(fin)) return;
  const estudianteId = selectorEstudiante.value ? Number(selectorEstudiante.value) : undefined;
  reservaPendiente = undefined;
  dialogoReserva.close();
  void reservar(espacioId, inicio, fin, estudianteId);
});

// ========================================
// CARGAR ESPACIOS
// ========================================

async function cargarEspacios() {
  try {
    const usuario = obtenerUsuario();
    const espacios = await solicitar<Espacio[]>('/spaces');
    if (obtenerUsuario() !== usuario) return;

    const espacioSeleccionado = selectorEspacio.value;
    const opciones = espacios.map((espacio) => new Option(
      `${espacio.nombre} — edificio ${espacio.edificio} (${espacio.capacidad})`,
      String(espacio.id)
    ));
    selectorEspacio.replaceChildren(...opciones);
    if (espacios.some((espacio) => String(espacio.id) === espacioSeleccionado)) {
      selectorEspacio.value = espacioSeleccionado;
    }

    if (usuario?.rol === 'administrador') {
      espaciosDisponibles = espacios;
      botonDesactivar.hidden = true;
      selectorEdicion.replaceChildren(
        new Option('Agregar un espacio nuevo', ''),
        ...opciones.map((opcion) => opcion.cloneNode(true))
      );
    }

  } catch (error) {
    mostrarMensaje(
      mensajeReservas,
      textoDeError(error),
      'error'
    );
  }
}

selectorEdicion.addEventListener('change', () => {
  const id = selectorEdicion.value;
  formularioEspacio.reset();
  selectorEdicion.value = id;
  botonDesactivar.hidden = !id;
  mostrarMensaje(mensajeAdministracion, '');

  const espacio = espaciosDisponibles.find((espacio) => String(espacio.id) === id);
  if (!espacio) return;

  for (const nombre of ['nombre', 'edificio', 'capacidad', 'tipo', 'horaApertura', 'horaCierre'] as const) {
    const campo = formularioEspacio.elements.namedItem(nombre) as HTMLInputElement | HTMLSelectElement;
    campo.value = String(espacio[nombre]);
  }
});

formularioEspacio.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const usuario = obtenerUsuario();
  if (usuario?.rol !== 'administrador') return;

  const id = selectorEdicion.value;
  const datos = new FormData(formularioEspacio);
  const espacio = {
    nombre: String(datos.get('nombre')).trim(),
    edificio: String(datos.get('edificio')).trim(),
    capacidad: Number(datos.get('capacidad')),
    tipo: datos.get('tipo'),
    horaApertura: Number(datos.get('horaApertura')),
    horaCierre: Number(datos.get('horaCierre'))
  };

  camposEspacio.disabled = true;
  mostrarMensaje(mensajeAdministracion, 'Guardando…');
  try {
    const guardado = await solicitar<Espacio>(id ? `/spaces/${id}` : '/spaces', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(espacio)
    });
    if (obtenerUsuario() !== usuario) return;

    formularioEspacio.reset();
    mostrarMensaje(mensajeAdministracion, `${guardado.nombre} guardado.`, 'exito');
    await cargarEspacios();
    if (obtenerUsuario() === usuario) await cargarBloques();
  } catch (error) {
    if (obtenerUsuario() === usuario) {
      mostrarMensaje(mensajeAdministracion, textoDeError(error), 'error');
    }
  } finally {
    camposEspacio.disabled = false;
  }
});

botonDesactivar.addEventListener('click', async () => {
  const usuario = obtenerUsuario();
  if (usuario?.rol !== 'administrador') return;

  const espacio = espaciosDisponibles.find((espacio) => String(espacio.id) === selectorEdicion.value);
  if (!espacio || !window.confirm(`¿Desactivar ${espacio.nombre}? Ya no aparecerá para nuevas reservas.`)) return;

  camposEspacio.disabled = true;
  mostrarMensaje(mensajeAdministracion, 'Desactivando…');
  try {
    await solicitar<void>(`/spaces/${espacio.id}`, { method: 'DELETE' });
    if (obtenerUsuario() !== usuario) return;

    formularioEspacio.reset();
    botonDesactivar.hidden = true;
    mostrarMensaje(mensajeAdministracion, `${espacio.nombre} desactivado.`, 'exito');
    await cargarEspacios();
    if (obtenerUsuario() === usuario) await cargarBloques();
  } catch (error) {
    if (obtenerUsuario() === usuario) {
      mostrarMensaje(mensajeAdministracion, textoDeError(error), 'error');
    }
  } finally {
    camposEspacio.disabled = false;
  }
});

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
      ...disponibilidad.bloques.map((bloque, indice) => {
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

        if (bloque.estado === 'libre' && puedeReservar()) {
          const boton = crearElemento('button', 'Reservar');

          boton.type = 'button';

          boton.addEventListener(
            'click',
            () => {
              const fines = [bloque.fin];
              for (const siguiente of disponibilidad.bloques.slice(indice + 1)) {
                if (siguiente.estado !== 'libre' || siguiente.inicio !== fines.at(-1)) break;
                fines.push(siguiente.fin);
              }
              void abrirDialogoReserva(espacioId, bloque.inicio, fines);
            }
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
  fin: string,
  estudianteId?: number
) {
  mostrarMensaje(mensajeReservas, 'Reservando…');

  try {
    await solicitar<Reserva>('/reservations', {
      method: 'POST',
      body: JSON.stringify({
        espacioId,
        inicio,
        fin,
        motivo: campoMotivo.value.trim(),
        estudianteId
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
  const sesion = obtenerUsuario();
  if (!sesion) return;

  try {
    const reservas = await solicitar<Reserva[]>('/reservations/me');
    if (obtenerUsuario() !== sesion) return;

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
          puedeReservar() &&
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
    if (obtenerUsuario() !== sesion) return;
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
