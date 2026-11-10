// DUEÑA: B
// Ruta: solo encadena middleware y controlador (orden de la sección 3.8).
// Las rutas son relativas: app.ts monta este router en /api/v1/spaces
import { Router } from 'express';
import {
  esquemaActualizarEspacio,
  esquemaConsultaDisponibilidad,
  esquemaCrearEspacio,
  esquemaFiltrosEspacios,
  esquemaParametroId,
} from '@reservalab/shared';
import * as controladorEspacios from '../controladores/controladorEspacios';
import { autenticarJwtOApiKey } from '../middleware/autenticacionMixta';
import { autenticarJwt } from '../middleware/autenticarJwt';
import { requerirRol } from '../middleware/requerirRol';
import { validar } from '../middleware/validar';

export const rutasEspacios = Router();

// RF-05
rutasEspacios.get(
  '/',
  autenticarJwtOApiKey('read:spaces'),
  validar(esquemaFiltrosEspacios, 'query'),
  controladorEspacios.listar,
);

// RF-06
rutasEspacios.post(
  '/',
  autenticarJwt,
  requerirRol('administrador'),
  validar(esquemaCrearEspacio),
  controladorEspacios.crear,
);

rutasEspacios.patch(
  '/:id',
  autenticarJwt,
  requerirRol('administrador'),
  validar(esquemaParametroId, 'params'),
  validar(esquemaActualizarEspacio),
  controladorEspacios.actualizar,
);

rutasEspacios.delete(
  '/:id',
  autenticarJwt,
  requerirRol('administrador'),
  validar(esquemaParametroId, 'params'),
  controladorEspacios.desactivar,
);

// RF-07
rutasEspacios.get(
  '/:id/availability',
  autenticarJwtOApiKey('read:spaces'),
  validar(esquemaParametroId, 'params'),
  validar(esquemaConsultaDisponibilidad, 'query'),
  controladorEspacios.disponibilidad,
);
