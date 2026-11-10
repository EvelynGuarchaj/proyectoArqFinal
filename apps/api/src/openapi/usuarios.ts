const propiedades = {
  nombre: { type: 'string', minLength: 2, maxLength: 100 },
  correo: { type: 'string', format: 'email' },
  rol: { type: 'string', enum: ['administrador', 'docente', 'estudiante'] },
};

const esquemaUsuario = {
  type: 'object',
  properties: { id: { type: 'integer' }, ...propiedades, activo: { type: 'boolean' } },
};

const acceso = {
  tags: ['Usuarios'],
  security: [{ jwt: [] }],
};

const errores = {
  401: { description: 'Se requiere una sesión activa' },
  403: { description: 'Operación no permitida' },
};

const parametros = [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } }];
const json = (schema: object) => ({ 'application/json': { schema } });

export const rutasDocUsuarios = {
  '/users': {
    get: {
      ...acceso,
      summary: 'Listar usuarios, incluidos los desactivados',
      responses: { 200: { description: 'Usuarios', content: json({ type: 'array', items: esquemaUsuario }) }, ...errores },
    },
    post: {
      ...acceso,
      summary: 'Crear usuario',
      requestBody: {
        required: true,
        content: json({
          type: 'object',
          required: ['nombre', 'correo', 'rol', 'contrasena'],
          properties: { ...propiedades, contrasena: { type: 'string', minLength: 8, maxLength: 72, writeOnly: true } },
        }),
      },
      responses: {
        201: { description: 'Usuario creado', content: json(esquemaUsuario) },
        400: { description: 'Datos inválidos' }, ...errores, 409: { description: 'Correo duplicado' },
      },
    },
  },
  '/users/{id}': {
    patch: {
      ...acceso, parameters: parametros,
      summary: 'Editar nombre, correo o rol',
      requestBody: { required: true, content: json({ type: 'object', properties: propiedades }) },
      responses: {
        200: { description: 'Usuario actualizado', content: json(esquemaUsuario) },
        400: { description: 'Datos inválidos' }, ...errores,
        404: { description: 'Usuario inexistente' }, 409: { description: 'Correo duplicado' },
      },
    },
    delete: {
      ...acceso, parameters: parametros,
      summary: 'Desactivar un usuario y conservar sus reservas',
      responses: { 204: { description: 'Usuario desactivado' }, ...errores, 404: { description: 'Usuario inexistente' } },
    },
  },
};
