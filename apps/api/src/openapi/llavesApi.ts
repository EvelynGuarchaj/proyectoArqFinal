// DUEÑA: Integrante C (stub creado por A)
const esquemaError = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        codigo: { type: 'string', example: 'PROHIBIDO' },
        mensaje: { type: 'string' },
        detalles: {},
      },
    },
  },
};

const llavePublica = {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 2 },
    nombre: { type: 'string', example: 'Pantalla edificio B' },
    prefijo: { type: 'string', example: 'rl_live_a1b2' },
    permisos: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['read:spaces', 'read:now'],
      },
    },
    limitePorMinuto: { type: 'integer', example: 60 },
    ultimoUso: {
      type: 'string',
      format: 'date-time',
      nullable: true,
    },
    revocada: { type: 'boolean', example: false },
    creadaEn: { type: 'string', format: 'date-time' },
  },
};

const respuestasComunes = {
  401: {
    description: 'Sin token o token inválido',
    content: {
      'application/json': { schema: esquemaError },
    },
  },
  403: {
    description: 'El usuario no es administrador',
    content: {
      'application/json': { schema: esquemaError },
    },
  },
};

export const rutasDocLlavesApi: Record<string, unknown> = {
  '/api-keys': {
    post: {
      tags: ['Llaves API'],
      summary: 'RF-12 Crear llave API (solo administrador)',
      description:
        'La llave completa se devuelve UNA sola vez. En la base solo se guarda su hash SHA-256.',
      security: [{ jwt: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['nombre', 'permisos'],
              properties: {
                nombre: {
                  type: 'string',
                  minLength: 3,
                  maxLength: 100,
                  example: 'Pantalla edificio B',
                },
                permisos: {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'string',
                    enum: ['read:spaces', 'read:now'],
                  },
                  example: ['read:now', 'read:spaces'],
                },
                limitePorMinuto: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 1000,
                  default: 60,
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'Llave creada',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  llavePublica,
                  {
                    type: 'object',
                    properties: {
                      llave: {
                        type: 'string',
                        example: 'rl_live_0f3c...',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        400: {
          description: 'Datos inválidos (VALIDACION)',
          content: {
            'application/json': { schema: esquemaError },
          },
        },
        ...respuestasComunes,
      },
    },

    get: {
      tags: ['Llaves API'],
      summary: 'RF-12 Listar llaves API (sin hash)',
      security: [{ jwt: [] }],
      responses: {
        200: {
          description: 'Lista de llaves',
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: llavePublica,
              },
            },
          },
        },
        ...respuestasComunes,
      },
    },
  },

  '/api-keys/{id}': {
    delete: {
      tags: ['Llaves API'],
      summary: 'RF-12 Revocar llave API',
      security: [{ jwt: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'integer' },
        },
      ],
      responses: {
        200: {
          description: 'Llave revocada',
          content: {
            'application/json': { schema: llavePublica },
          },
        },
        404: {
          description: 'La llave no existe (NO_ENCONTRADO)',
          content: {
            'application/json': { schema: esquemaError },
          },
        },
        ...respuestasComunes,
      },
    },
  },
};
