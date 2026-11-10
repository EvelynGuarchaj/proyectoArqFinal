// DUEÑA: B
// Documentación OpenAPI de RF-05, RF-06 y RF-07. A la une en openapi/index.ts
// Formato de error de la sección 3.8 (en línea para no depender de otro archivo)
const errorRef = {
  type: 'object',
  properties: {
    error: {
      type: 'object',
      properties: { codigo: { type: 'string' }, mensaje: { type: 'string' }, detalles: { nullable: true } },
    },
  },
};
const respuestaError = (descripcion: string) => ({
  description: descripcion,
  content: { 'application/json': { schema: errorRef } },
});
const encabezadoCache = {
  'X-Cache': { description: 'HIT si vino de Redis, MISS si se calculó', schema: { type: 'string', enum: ['HIT', 'MISS'] } },
};
const parametroId = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } };

const esquemaEspacio = {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    nombre: { type: 'string', example: 'Laboratorio 1' },
    edificio: { type: 'string', example: 'D' },
    capacidad: { type: 'integer', example: 24 },
    tipo: { type: 'string', enum: ['laboratorio', 'salon'] },
    horaApertura: { type: 'integer', example: 7 },
    horaCierre: { type: 'integer', example: 21 },
    activo: { type: 'boolean', example: true },
  },
};

const cuerpoEspacio = {
  type: 'object',
  properties: {
    nombre: { type: 'string', minLength: 2, maxLength: 100, example: 'Laboratorio 3' },
    edificio: { type: 'string', minLength: 1, maxLength: 50, example: 'E' },
    capacidad: { type: 'integer', minimum: 1, example: 20 },
    tipo: { type: 'string', enum: ['laboratorio', 'salon'] },
    horaApertura: { type: 'integer', minimum: 0, maximum: 23, default: 7 },
    horaCierre: { type: 'integer', minimum: 1, maximum: 24, default: 21 },
  },
};

export const rutasDocEspacios: Record<string, unknown> = {
  '/spaces': {
    get: {
      tags: ['Espacios'],
      summary: 'RF-05 Listar espacios activos (con caché)',
      security: [{ jwt: [] }, { llaveApi: [] }],
      parameters: [
        { name: 'edificio', in: 'query', schema: { type: 'string' }, example: 'H' },
        { name: 'capacidadMinima', in: 'query', schema: { type: 'integer', minimum: 1 }, example: 25 },
      ],
      responses: {
        200: {
          description: 'Lista de espacios',
          headers: encabezadoCache,
          content: { 'application/json': { schema: { type: 'array', items: esquemaEspacio } } },
        },
        400: respuestaError('VALIDACION'),
        401: respuestaError('NO_AUTENTICADO / TOKEN_INVALIDO / LLAVE_INVALIDA'),
        403: respuestaError('PERMISO_INSUFICIENTE (llave sin read:spaces)'),
      },
    },
    post: {
      tags: ['Espacios'],
      summary: 'RF-06 Crear espacio (solo administrador)',
      security: [{ jwt: [] }],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: { ...cuerpoEspacio, required: ['nombre', 'edificio', 'capacidad', 'tipo'] } } },
      },
      responses: {
        201: { description: 'Espacio creado', content: { 'application/json': { schema: esquemaEspacio } } },
        400: respuestaError('VALIDACION'),
        401: respuestaError('NO_AUTENTICADO'),
        403: respuestaError('PROHIBIDO'),
        409: respuestaError('DUPLICADO'),
      },
    },
  },
  '/spaces/{id}': {
    patch: {
      tags: ['Espacios'],
      summary: 'RF-06 Editar espacio (solo administrador)',
      security: [{ jwt: [] }],
      parameters: [parametroId],
      requestBody: { required: true, content: { 'application/json': { schema: cuerpoEspacio } } },
      responses: {
        200: { description: 'Espacio actualizado', content: { 'application/json': { schema: esquemaEspacio } } },
        400: respuestaError('VALIDACION'),
        401: respuestaError('NO_AUTENTICADO'),
        403: respuestaError('PROHIBIDO'),
        404: respuestaError('NO_ENCONTRADO'),
        409: respuestaError('DUPLICADO'),
      },
    },
    delete: {
      tags: ['Espacios'],
      summary: 'RF-06 Desactivar espacio (activo = false, no se borra)',
      security: [{ jwt: [] }],
      parameters: [parametroId],
      responses: {
        204: { description: 'Espacio desactivado' },
        401: respuestaError('NO_AUTENTICADO'),
        403: respuestaError('PROHIBIDO'),
        404: respuestaError('NO_ENCONTRADO'),
      },
    },
  },
  '/spaces/{id}/availability': {
    get: {
      tags: ['Espacios'],
      summary: 'RF-07 Bloques de 60 min libres y ocupados en una fecha (con caché)',
      security: [{ jwt: [] }, { llaveApi: [] }],
      parameters: [
        parametroId,
        { name: 'date', in: 'query', required: true, schema: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }, example: '2026-11-10' },
      ],
      responses: {
        200: {
          description: 'Disponibilidad del día (horas en ISO 8601, UTC)',
          headers: encabezadoCache,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  espacioId: { type: 'integer' },
                  fecha: { type: 'string', example: '2026-11-10' },
                  bloques: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        inicio: { type: 'string', format: 'date-time' },
                        fin: { type: 'string', format: 'date-time' },
                        estado: { type: 'string', enum: ['libre', 'ocupado'] },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        400: respuestaError('VALIDACION'),
        401: respuestaError('NO_AUTENTICADO / LLAVE_INVALIDA'),
        403: respuestaError('PERMISO_INSUFICIENTE'),
        404: respuestaError('NO_ENCONTRADO'),
      },
    },
  },
};
