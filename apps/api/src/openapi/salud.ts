const esquemaEstadoSalud = {
  type: 'object',
  required: ['estado', 'api', 'baseDatos', 'cache'],
  properties: {
    estado: { type: 'string', enum: ['ok', 'degradado'] },
    api: { type: 'string', enum: ['ok'] },
    baseDatos: { type: 'string', enum: ['ok', 'error'] },
    cache: { type: 'string', enum: ['ok', 'error'] },
  },
};

export const rutasDocSalud: Record<string, unknown> = {
  '/health': {
    get: {
      tags: ['Salud'],
      summary: 'Estado de la API, la base de datos y la caché (RF-13)',
      description: 'No requiere autenticación. Responde 503 si la base de datos o Redis no responden.',
      responses: {
        200: {
          description: 'Todo funciona',
          content: {
            'application/json': {
              schema: esquemaEstadoSalud,
              example: { estado: 'ok', api: 'ok', baseDatos: 'ok', cache: 'ok' },
            },
          },
        },
        503: {
          description: 'Algún servicio de apoyo falla',
          content: {
            'application/json': {
              schema: esquemaEstadoSalud,
              example: { estado: 'degradado', api: 'ok', baseDatos: 'ok', cache: 'error' },
            },
          },
        },
      },
    },
  },
};
