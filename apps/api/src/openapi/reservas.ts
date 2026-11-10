// DUEÑA: B
// Documentación OpenAPI de RF-08, RF-09 y RF-10. A la une en openapi/index.ts
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

const esquemaReserva = {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    espacioId: { type: 'integer', example: 1 },
    usuarioId: { type: 'integer', example: 2 },
    estudianteId: { type: 'integer', description: 'Estudiante vinculado, si se indicó' },
    inicio: { type: 'string', format: 'date-time', example: '2026-11-10T14:00:00.000Z' },
    fin: { type: 'string', format: 'date-time', example: '2026-11-10T16:00:00.000Z' },
    motivo: { type: 'string', example: 'Clase de redes' },
    estado: { type: 'string', enum: ['confirmada', 'cancelada'] },
    espacio: {
      type: 'object',
      description: 'Incluido en los listados de reservas',
      properties: { nombre: { type: 'string' }, edificio: { type: 'string' } },
    },
  },
};

export const rutasDocReservas: Record<string, unknown> = {
  '/reservations': {
    get: {
      tags: ['Reservas'],
      summary: 'Listar todas las reservas (docente o administrador)',
      security: [{ jwt: [] }],
      responses: {
        200: { description: 'Todas las reservas', content: { 'application/json': { schema: { type: 'array', items: esquemaReserva } } } },
        401: respuestaError('NO_AUTENTICADO'),
        403: respuestaError('PROHIBIDO'),
      },
    },
    post: {
      tags: ['Reservas'],
      summary: 'RF-08 Crear reserva para un horario que aún no ha empezado (docente o administrador)',
      security: [{ jwt: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['espacioId', 'inicio', 'fin', 'motivo'],
              properties: {
                espacioId: { type: 'integer', example: 1 },
                estudianteId: { type: 'integer', minimum: 1, description: 'ID opcional de un estudiante activo' },
                inicio: { type: 'string', format: 'date-time', example: '2026-11-10T08:00:00-06:00' },
                fin: { type: 'string', format: 'date-time', example: '2026-11-10T10:00:00-06:00' },
                motivo: { type: 'string', minLength: 3, maxLength: 200, example: 'Clase de redes' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Reserva confirmada', content: { 'application/json': { schema: esquemaReserva } } },
        400: respuestaError('VALIDACION / FUERA_DE_HORARIO'),
        401: respuestaError('NO_AUTENTICADO'),
        403: respuestaError('PROHIBIDO (estudiante)'),
        404: respuestaError('NO_ENCONTRADO (espacio)'),
        409: respuestaError('TRASLAPE'),
      },
    },
  },
  '/reservations/students': {
    get: {
      tags: ['Reservas'],
      summary: 'Listar estudiantes activos para vincular (docente o administrador)',
      security: [{ jwt: [] }],
      responses: {
        200: {
          description: 'Identificadores y nombres de estudiantes activos',
          content: { 'application/json': { schema: {
            type: 'array',
            items: { type: 'object', properties: { id: { type: 'integer' }, nombre: { type: 'string' } } },
          } } },
        },
        401: respuestaError('NO_AUTENTICADO'),
        403: respuestaError('PROHIBIDO'),
      },
    },
  },
  '/reservations/me': {
    get: {
      tags: ['Reservas'],
      summary: 'RF-09 Reservas propias o vinculadas al estudiante autenticado',
      security: [{ jwt: [] }],
      responses: {
        200: { description: 'Mis reservas', content: { 'application/json': { schema: { type: 'array', items: esquemaReserva } } } },
        401: respuestaError('NO_AUTENTICADO'),
      },
    },
  },
  '/reservations/{id}': {
    delete: {
      tags: ['Reservas'],
      summary: 'RF-10 Cancelar reserva (docente dueño o administrador); cambia el estado a cancelada',
      security: [{ jwt: [] }],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }],
      responses: {
        200: { description: 'Reserva cancelada', content: { 'application/json': { schema: esquemaReserva } } },
        400: respuestaError('FUERA_DE_HORARIO (la reserva ya terminó)'),
        401: respuestaError('NO_AUTENTICADO'),
        403: respuestaError('PROHIBIDO (se requiere ser el docente dueño o un administrador)'),
        404: respuestaError('NO_ENCONTRADO'),
      },
    },
  },
};
