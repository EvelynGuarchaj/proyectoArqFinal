import { rutasDocAutenticacion } from './autenticacion';
import { rutasDocSalud } from './salud';
import { rutasDocEspacios } from './espacios';
import { rutasDocReservas } from './reservas';
import { rutasDocLlavesApi } from './llavesApi';
import { rutasDocAhora } from './ahora';

export const especificacionOpenApi = {
  openapi: '3.0.3',
  info: {
    title: 'ReservaLab API',
    version: '1.0.0',
    description: 'API para reservar laboratorios y salones.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      jwt: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      llaveApi: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
    },
  },
  paths: {
    ...rutasDocAutenticacion,
    ...rutasDocSalud,
    ...rutasDocEspacios,
    ...rutasDocReservas,
    ...rutasDocLlavesApi,
    ...rutasDocAhora,
  },
};
