import { z } from 'zod';

// ===== Constantes =====
export const PREFIJO_API = '/api/v1';
export const PREFIJO_LLAVE = 'rl_live_';
export const ZONA_HORARIA = '-06:00'; // Guatemala, sin horario de verano
export const DURACION_BLOQUE_MINUTOS = 60;

export const ROLES = ['administrador', 'docente', 'estudiante'] as const;
export type Rol = (typeof ROLES)[number];

export const PERMISOS = ['read:spaces', 'read:now'] as const;
export type Permiso = (typeof PERMISOS)[number];

export const TIPOS_ESPACIO = ['laboratorio', 'salon'] as const;
export type TipoEspacio = (typeof TIPOS_ESPACIO)[number];

export const ESTADOS_RESERVA = ['confirmada', 'cancelada'] as const;
export type EstadoReserva = (typeof ESTADOS_RESERVA)[number];

export const CODIGOS_ERROR = [
  'VALIDACION', 'NO_AUTENTICADO', 'CREDENCIALES_INVALIDAS', 'TOKEN_INVALIDO',
  'LLAVE_INVALIDA', 'PROHIBIDO', 'PERMISO_INSUFICIENTE', 'NO_ENCONTRADO',
  'DUPLICADO', 'TRASLAPE', 'FUERA_DE_HORARIO', 'LIMITE_EXCEDIDO', 'ERROR_INTERNO',
] as const;
export type CodigoError = (typeof CODIGOS_ERROR)[number];

// ===== Esquemas Zod (validación) =====
export const esquemaRegistro = z.object({
  nombre: z.string().min(2).max(100),
  correo: z.string().email(),
  contrasena: z.string().min(8).max(72),
});

export const esquemaCrearUsuario = esquemaRegistro.extend({ rol: z.enum(ROLES) });
export const esquemaEditarUsuario = esquemaCrearUsuario.omit({ contrasena: true }).partial();
export type DatosCrearUsuario = z.infer<typeof esquemaCrearUsuario>;
export type DatosEditarUsuario = z.infer<typeof esquemaEditarUsuario>;

export const esquemaLogin = z.object({
  correo: z.string().email(),
  contrasena: z.string().min(1),
});

export const esquemaTokenRefresco = z.object({
  tokenRefresco: z.string().min(10),
});

const camposEspacio = {
  nombre: z.string().min(2).max(100),
  edificio: z.string().min(1).max(50),
  capacidad: z.number().int().positive(),
  tipo: z.enum(TIPOS_ESPACIO),
  horaApertura: z.number().int().min(0).max(23),
  horaCierre: z.number().int().min(1).max(24),
};

export const esquemaCrearEspacio = z.object({
  ...camposEspacio,
  horaApertura: camposEspacio.horaApertura.default(7),
  horaCierre: camposEspacio.horaCierre.default(21),
});

export const esquemaActualizarEspacio = z.object(camposEspacio).partial();

export const esquemaFiltrosEspacios = z.object({
  edificio: z.string().min(1).optional(),
  capacidadMinima: z.coerce.number().int().positive().optional(),
});

export const esquemaConsultaDisponibilidad = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: AAAA-MM-DD'),
});

export const esquemaCrearReserva = z.object({
  espacioId: z.number().int().positive(),
  estudianteId: z.number().int().positive().optional(),
  inicio: z.string().datetime({ offset: true }),
  fin: z.string().datetime({ offset: true }),
  motivo: z.string().min(3).max(200),
});

export const esquemaCrearLlaveApi = z.object({
  nombre: z.string().min(3).max(100),
  permisos: z.array(z.enum(PERMISOS)).min(1),
  limitePorMinuto: z.number().int().positive().max(1000).default(60),
});

export const esquemaParametroId = z.object({
  id: z.coerce.number().int().positive(),
});

// ===== Tipos de entrada (inferidos) =====
export type DatosRegistro = z.infer<typeof esquemaRegistro>;
export type DatosLogin = z.infer<typeof esquemaLogin>;
export type DatosCrearEspacio = z.infer<typeof esquemaCrearEspacio>;
export type DatosActualizarEspacio = z.infer<typeof esquemaActualizarEspacio>;
export type FiltrosEspacios = z.infer<typeof esquemaFiltrosEspacios>;
export type DatosCrearReserva = z.infer<typeof esquemaCrearReserva>;
export type DatosCrearLlaveApi = z.infer<typeof esquemaCrearLlaveApi>;

// ===== Tipos de respuesta (lo que devuelve la API) =====
export interface UsuarioPublico { id: number; nombre: string; correo: string; rol: Rol; }
export type EstudianteSeleccionable = Pick<UsuarioPublico, 'id' | 'nombre'>;
export interface UsuarioAdministrado extends UsuarioPublico { activo: boolean; }
export interface RespuestaLogin { tokenAcceso: string; tokenRefresco: string; usuario: UsuarioPublico; }
export interface RespuestaRefresco { tokenAcceso: string; }

export interface Espacio {
  id: number; nombre: string; edificio: string; capacidad: number; tipo: TipoEspacio;
  horaApertura: number; horaCierre: number; activo: boolean;
}

export interface Reserva {
  id: number; espacioId: number; usuarioId: number;
  estudianteId?: number;
  inicio: string; fin: string; // ISO 8601
  motivo: string; estado: EstadoReserva;
  espacio?: { nombre: string; edificio: string };
}

export interface BloqueDisponibilidad { inicio: string; fin: string; estado: 'libre' | 'ocupado'; }
export interface Disponibilidad { espacioId: number; fecha: string; bloques: BloqueDisponibilidad[]; }

export interface EspacioAhora {
  espacioId: number; nombre: string; ocupado: boolean;
  reservaActual: { inicio: string; fin: string; motivo: string } | null;
}
export interface OcupacionEdificio { edificio: string; espacios: EspacioAhora[]; }
export interface RespuestaAhora { generadoEn: string; edificios: OcupacionEdificio[]; }

export interface LlaveApiPublica {
  id: number; nombre: string; prefijo: string; permisos: Permiso[];
  limitePorMinuto: number; ultimoUso: string | null; revocada: boolean; creadaEn: string;
}
export interface LlaveApiCreada extends LlaveApiPublica { llave: string; } // se muestra UNA sola vez

export interface EstadoSalud {
  estado: 'ok' | 'degradado'; api: 'ok'; baseDatos: 'ok' | 'error'; cache: 'ok' | 'error';
}

export interface NotificacionReserva {
  tipo: 'reserva_confirmada' | 'reserva_cancelada';
  reservaId: number; espacioId: number; usuarioId: number; inicio: string; fin: string;
}

export interface RespuestaError { error: { codigo: CodigoError; mensaje: string; detalles?: unknown }; }
