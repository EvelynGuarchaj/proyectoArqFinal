// DUEÑA: Integrante C (stub creado por A)
const esquemaError = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: {
        codigo: { type: 'string' },
        mensaje: { type: 'string' },
        detalles: {},
      },
    },
  },
};

export const rutasDocAhora: Record<string, unknown> = {
  '/now': {
    get: {
      tags: ['Ocupación'],
      summary: 'RF-11 Ocupación actual por edificio (para pantallas)',
      description:
        'Requiere X-API-Key con el permiso read:now. ' +
        'Límite de solicitudes por minuto según la llave. ' +
        'Respuesta en caché; el encabezado X-Cache indica HIT o MISS.',
      security: [{ llaveApi: [] }],
      responses: {
        200: {
          description: 'Ocupación actual',
          headers: {
            'X-Cache': {
              schema: {
                type: 'string',
                enum: ['HIT', 'MISS'],
              },
            },
          },
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  generadoEn: {
                    type: 'string',
                    format: 'date-time',
                  },
                  edificios: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        edificio: {
                          type: 'string',
                          example: 'A',
                        },
                        espacios: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              espacioId: {
                                type: 'integer',
                              },
                              nombre: {
                                type: 'string',
                                example: 'Laboratorio 1',
                              },
                              ocupado: {
                                type: 'boolean',
                              },
                              reservaActual: {
                                type: 'object',
                                nullable: true,
                                properties: {
                                  inicio: {
                                    type: 'string',
                                    format: 'date-time',
                                  },
                                  fin: {
                                    type: 'string',
                                    format: 'date-time',
                                  },
                                  motivo: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: {
          description:
            'Llave ausente, inválida o revocada (LLAVE_INVALIDA)',
          content: {
            'application/json': {
              schema: esquemaError,
            },
          },
        },
        403: {
          description:
            'La llave no tiene read:now (PERMISO_INSUFICIENTE)',
          content: {
            'application/json': {
              schema: esquemaError,
            },
          },
        },
        429: {
          description:
            'Límite por minuto excedido (LIMITE_EXCEDIDO)',
          content: {
            'application/json': {
              schema: esquemaError,
            },
          },
        },
      },
    },
  },
};
