import type { UsuarioAdministrado } from '@reservalab/shared';
import { solicitar } from './api';
import { obtenerUsuario } from './sesion';

const seccion = document.querySelector<HTMLElement>('#seccion-usuarios')!;
const formulario = document.querySelector<HTMLFormElement>('#formulario-usuario')!;
const campos = formulario.querySelector('fieldset')!;
const selector = formulario.querySelector<HTMLSelectElement>('[name="usuario"]')!;
const nombre = formulario.querySelector<HTMLInputElement>('[name="nombre"]')!;
const correo = formulario.querySelector<HTMLInputElement>('[name="correo"]')!;
const rol = formulario.querySelector<HTMLSelectElement>('[name="rol"]')!;
const contrasena = formulario.querySelector<HTMLInputElement>('[name="contrasena"]')!;
const etiquetaContrasena = document.querySelector<HTMLLabelElement>('#contrasena-nueva')!;
const desactivar = document.querySelector<HTMLButtonElement>('#boton-desactivar-usuario')!;
const mensaje = document.querySelector<HTMLParagraphElement>('#mensaje-usuarios')!;

let usuarios: UsuarioAdministrado[] = [];

function informar(texto: string, tipo = '') {
  mensaje.textContent = texto;
  mensaje.dataset.tipo = tipo;
}

function mostrarUsuario(id: string) {
  formulario.reset();
  selector.value = id;
  const usuario = usuarios.find((cuenta) => String(cuenta.id) === id);
  const cuentaPropia = usuario?.id === obtenerUsuario()?.id;
  nombre.value = usuario?.nombre ?? '';
  correo.value = usuario?.correo ?? '';
  rol.value = usuario?.rol ?? 'estudiante';
  rol.disabled = cuentaPropia;
  etiquetaContrasena.hidden = Boolean(usuario);
  contrasena.required = !usuario;
  desactivar.hidden = !usuario?.activo || cuentaPropia;
}

async function cargarUsuarios() {
  const sesion = obtenerUsuario();
  const cuentas = await solicitar<UsuarioAdministrado[]>('/users');
  if (obtenerUsuario() !== sesion) return;
  usuarios = cuentas;
  selector.replaceChildren(
    new Option('Crear un usuario nuevo', ''),
    ...usuarios.map((usuario) => {
      const estado = usuario.activo ? '' : ' · Desactivado';
      return new Option(`${usuario.nombre} · ${usuario.correo}${estado}`, String(usuario.id));
    })
  );
  mostrarUsuario('');
}

export async function abrirPanelUsuarios() {
  const sesion = obtenerUsuario();
  if (sesion?.rol !== 'administrador') return;

  seccion.hidden = false;
  campos.disabled = true;
  informar('Cargando usuarios…');
  try {
    await cargarUsuarios();
    if (obtenerUsuario() === sesion) informar('');
  } catch (error) {
    if (obtenerUsuario() === sesion) mostrarError(error);
  } finally {
    if (obtenerUsuario() === sesion) campos.disabled = false;
  }
}

export function cerrarPanelUsuarios() {
  seccion.hidden = true;
  usuarios = [];
  selector.replaceChildren();
  formulario.reset();
  informar('');
}

function mostrarError(error: unknown) {
  informar(error instanceof Error ? error.message : 'Error inesperado', 'error');
}

selector.addEventListener('change', () => {
  mostrarUsuario(selector.value);
  informar('');
});

async function guardar(ruta: string, opciones: RequestInit, confirmacion: string) {
  const sesion = obtenerUsuario();
  if (sesion?.rol !== 'administrador') return;

  campos.disabled = true;
  informar('Guardando…');
  try {
    await solicitar(ruta, opciones);
    if (obtenerUsuario() !== sesion) return;
    await cargarUsuarios();
    if (obtenerUsuario() === sesion) informar(confirmacion, 'exito');
  } catch (error) {
    if (obtenerUsuario() === sesion) mostrarError(error);
  } finally {
    if (obtenerUsuario() === sesion) campos.disabled = false;
  }
}

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const id = selector.value;
  const datos = { nombre: nombre.value.trim(), correo: correo.value.trim(), rol: rol.value };
  const body = JSON.stringify(id ? datos : { ...datos, contrasena: contrasena.value });
  void guardar(id ? `/users/${id}` : '/users', { method: id ? 'PATCH' : 'POST', body }, 'Usuario guardado.');
});

desactivar.addEventListener('click', () => {
  const id = selector.value;
  if (!id || !window.confirm(`¿Desactivar la cuenta de ${nombre.value}?`)) return;
  void guardar(`/users/${id}`, { method: 'DELETE' }, 'Usuario desactivado.');
});
