import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { entorno } from './config/entorno';
import { especificacionOpenApi } from './openapi';
import { rutasAutenticacion } from './rutas/rutasAutenticacion';
import { rutasEspacios } from './rutas/rutasEspacios';
import { rutasReservas } from './rutas/rutasReservas';
import { rutasLlavesApi } from './rutas/rutasLlavesApi';
import { rutasAhora } from './rutas/rutasAhora';
import { rutasUsuarios } from './rutas/rutasUsuarios';
import { rutasSalud } from './rutas/rutasSalud';
import { manejadorErrores } from './middleware/manejadorErrores';

export function crearApp() {
  const app = express();
  app.use(cors({ origin: entorno.origenWeb, exposedHeaders: ['X-Cache'] }));
  app.use(express.json());
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(especificacionOpenApi));

  const v1 = express.Router();
  v1.use('/auth', rutasAutenticacion);
  v1.use('/spaces', rutasEspacios);
  v1.use('/reservations', rutasReservas);
  v1.use('/api-keys', rutasLlavesApi);
  v1.use('/now', rutasAhora);
  v1.use('/health', rutasSalud);
  v1.use('/users', rutasUsuarios);
  app.use('/api/v1', v1);

  app.use((req, res) => {
    res.status(404).json({ error: { codigo: 'NO_ENCONTRADO', mensaje: 'Ruta no encontrada' } });
  });
  app.use(manejadorErrores);
  return app;
}
