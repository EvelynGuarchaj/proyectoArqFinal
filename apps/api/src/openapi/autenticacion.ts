const esquemaUsuarioPublico = {
  type: 'object',
  required: ['id', 'nombre', 'correo', 'rol'],
  properties: {
    id: { type: 'integer' },
    nombre: { type: 'string' },
    correo: { type: 'string', format: 'email' },
    rol: { type: 'string', enum: ['administrador', 'docente', 'estudiante'] },
  },
};

const esquemaTokenRefresco = {
  type: 'object',
  required: ['tokenRefresco'],
  properties: { tokenRefresco: { type: 'string', minLength: 10 } },
};

const ejemploUsuario = { id: 4, nombre: 'Ana López', correo: 'ana@reservalab.edu', rol: 'estudiante' };
const ejemploTokenRefresco = { tokenRefresco: '3f9a1c...e07b (96 caracteres hexadecimales)' };

function respuestaError(descripcion: string, codigo: string, mensaje: string) {
  return {
    description: descripcion,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              required: ['codigo', 'mensaje'],
              properties: {
                codigo: { type: 'string' },
                mensaje: { type: 'string' },
                detalles: {},
              },
            },
          },
        },
        example: { error: { codigo, mensaje, detalles: null } },
      },
    },
  };
}

const errorValidacion = respuestaError('Datos inválidos', 'VALIDACION', 'Los datos enviados no son válidos');
const errorTokenInvalido = respuestaError(
  'Token de refresco inválido, revocado o vencido',
  'TOKEN_INVALIDO',
  'El token de refresco es inválido o está vencido',
);

export const rutasDocAutenticacion: Record<string, unknown> = {
  '/auth/register': {
    post: {
      tags: ['Autenticación'],
      summary: 'Registrar un usuario nuevo (RF-01)',
      description: 'El usuario se crea siempre con rol estudiante.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['nombre', 'correo', 'contrasena'],
              properties: {
                nombre: { type: 'string', minLength: 2, maxLength: 100 },
                correo: { type: 'string', format: 'email' },
                contrasena: { type: 'string', minLength: 8, maxLength: 72 },
              },
            },
            example: { nombre: 'Ana López', correo: 'ana@reservalab.edu', contrasena: 'Segura1234' },
          },
        },
      },
      responses: {
        201: {
          description: 'Usuario creado',
          content: { 'application/json': { schema: esquemaUsuarioPublico, example: ejemploUsuario } },
        },
        400: errorValidacion,
        409: respuestaError('El correo ya está registrado', 'DUPLICADO', 'Ya existe un usuario con ese correo'),
      },
    },
  },

  '/auth/login': {
    post: {
      tags: ['Autenticación'],
      summary: 'Iniciar sesión (RF-02)',
      description:
        'Devuelve un token de acceso (JWT, 15 min) y un token de refresco (7 días). El token de refresco solo se muestra aquí.',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['correo', 'contrasena'],
              properties: {
                correo: { type: 'string', format: 'email' },
                contrasena: { type: 'string' },
              },
            },
            example: { correo: 'docente@reservalab.edu', contrasena: 'Docente1234' },
          },
        },
      },
      responses: {
        200: {
          description: 'Sesión iniciada',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['tokenAcceso', 'tokenRefresco', 'usuario'],
                properties: {
                  tokenAcceso: { type: 'string' },
                  tokenRefresco: { type: 'string' },
                  usuario: esquemaUsuarioPublico,
                },
              },
              example: {
                tokenAcceso: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                tokenRefresco: ejemploTokenRefresco.tokenRefresco,
                usuario: { id: 2, nombre: 'Docente', correo: 'docente@reservalab.edu', rol: 'docente' },
              },
            },
          },
        },
        400: errorValidacion,
        401: respuestaError(
          'Correo o contraseña incorrectos',
          'CREDENCIALES_INVALIDAS',
          'Correo o contraseña incorrectos',
        ),
      },
    },
  },

  '/auth/refresh': {
    post: {
      tags: ['Autenticación'],
      summary: 'Obtener un nuevo token de acceso (RF-03)',
      requestBody: {
        required: true,
        content: { 'application/json': { schema: esquemaTokenRefresco, example: ejemploTokenRefresco } },
      },
      responses: {
        200: {
          description: 'Nuevo token de acceso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['tokenAcceso'],
                properties: { tokenAcceso: { type: 'string' } },
              },
              example: { tokenAcceso: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            },
          },
        },
        400: errorValidacion,
        401: errorTokenInvalido,
      },
    },
  },

  '/auth/logout': {
    post: {
      tags: ['Autenticación'],
      summary: 'Cerrar sesión: revoca el token de refresco (RF-04)',
      description: 'El token de refresco debe pertenecer al usuario autenticado.',
      security: [{ jwt: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: esquemaTokenRefresco, example: ejemploTokenRefresco } },
      },
      responses: {
        204: { description: 'Sesión cerrada (token de refresco revocado)' },
        400: errorValidacion,
        401: {
          ...errorTokenInvalido,
          description:
            'Falta el token de acceso (NO_AUTENTICADO), es inválido (TOKEN_INVALIDO) o el token de refresco no es del usuario (TOKEN_INVALIDO)',
        },
      },
    },
  },
};
