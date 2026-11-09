//propiedad de integrante c
import {
  esquemaCrearEspacio,
  esquemaCrearLlaveApi,
  esquemaParametroId,
  type Espacio,
  type LlaveApiCreada,
  type LlaveApiPublica,
} from '@reservalab/shared';

import {
  ErrorCli,
  iniciarSesionAdministrador,
  solicitar,
} from './clienteApi';

// Opciones que recibe el CLI
export interface Opciones {
  correo?: string;
  contrasena?: string;
  nombre?: string;
  edificio?: string;
  capacidad?: string;
  tipo?: string;
  apertura?: string;
  cierre?: string;
  permisos?: string;
  limite?: string;
  id?: string;
}

// Estructura mínima de errores de Zod
interface ErrorValidacion {
  issues: {
    path: (string | number)[];
    message: string;
  }[];
}

// Convertir errores de validación en mensajes legibles
function erroresLegibles(error: ErrorValidacion): string {
  return error.issues
    .map(
      (problema) =>
        ` --${problema.path.join('.') || 'datos'}: ${problema.message}`
    )
    .join('\n');
}

// Convertir números recibidos como texto
function numeroOpcional(valor?: string): number | undefined {
  return valor === undefined ? undefined : Number(valor);
}

// Obtener sesión de administrador
async function sesion(opciones: Opciones): Promise<string> {
  if (!opciones.correo || !opciones.contrasena) {
    throw new ErrorCli(
      'Faltan --correo y --contrasena (de un administrador)'
    );
  }

  return iniciarSesionAdministrador(
    opciones.correo,
    opciones.contrasena
  );
}

// ========================================
// CREAR ESPACIO
// ========================================

export async function crearEspacio(opciones: Opciones) {
  const validacion = esquemaCrearEspacio.safeParse({
    nombre: opciones.nombre,
    edificio: opciones.edificio,
    capacidad: numeroOpcional(opciones.capacidad),
    tipo: opciones.tipo,
    horaApertura: numeroOpcional(opciones.apertura),
    horaCierre: numeroOpcional(opciones.cierre),
  });

  if (!validacion.success) {
    throw new ErrorCli(
      `Datos inválidos:\n${erroresLegibles(validacion.error)}`
    );
  }

  const token = await sesion(opciones);

  const espacio = await solicitar<Espacio>(
    '/spaces',
    {
      method: 'POST',
      body: JSON.stringify(validacion.data),
    },
    token
  );

  console.log('Espacio creado:');
  console.table([espacio]);
}

// ========================================
// CREAR LLAVE API
// ========================================

export async function crearLlave(opciones: Opciones) {
  const validacion = esquemaCrearLlaveApi.safeParse({
    nombre: opciones.nombre,
    permisos: opciones.permisos
      ?.split(',')
      .map((permiso) => permiso.trim())
      .filter(Boolean),
    limitePorMinuto: numeroOpcional(opciones.limite),
  });

  if (!validacion.success) {
    throw new ErrorCli(
      `Datos inválidos:\n${erroresLegibles(validacion.error)}`
    );
  }

  const token = await sesion(opciones);

  const llave = await solicitar<LlaveApiCreada>(
    '/api-keys',
    {
      method: 'POST',
      body: JSON.stringify(validacion.data),
    },
    token
  );

  console.log(
    `Llave creada (id ${llave.id}). Guárdala ahora, no se volverá a mostrar:\n`
  );

  console.log(` ${llave.llave}\n`);

  console.log(
    `Permisos: ${llave.permisos.join(', ')} · Límite: ${llave.limitePorMinuto}/min`
  );
}

// ========================================
// LISTAR LLAVES API
// ========================================

export async function listarLlaves(opciones: Opciones) {
  const token = await sesion(opciones);

  const llaves = await solicitar<LlaveApiPublica[]>(
    '/api-keys',
    {},
    token
  );

  if (llaves.length === 0) {
    console.log('No hay llaves.');
    return;
  }

  console.table(
    llaves.map((llave) => ({
      id: llave.id,
      nombre: llave.nombre,
      prefijo: llave.prefijo,
      permisos: llave.permisos.join(','),
      limite: llave.limitePorMinuto,
      ultimoUso: llave.ultimoUso ?? '—',
      revocada: llave.revocada ? 'sí' : 'no',
    }))
  );
}

// ========================================
// REVOCAR LLAVE API
// ========================================

export async function revocarLlave(opciones: Opciones) {
  const validacion = esquemaParametroId.safeParse({
    id: opciones.id,
  });

  if (!validacion.success) {
    throw new ErrorCli(
      'Falta --id (número entero positivo)'
    );
  }

  const token = await sesion(opciones);

  const llave = await solicitar<LlaveApiPublica>(
    `/api-keys/${validacion.data.id}`,
    {
      method: 'DELETE',
    },
    token
  );

  console.log(
    `Llave ${llave.id} (${llave.nombre}) revocada.`
  );
}
