// DUEÑA: Integrante C (stub creado por A)
import { Router } from 'express';
import {
  esquemaCrearLlaveApi,
  esquemaParametroId,
} from '@reservalab/shared';

import * as controladorLlavesApi from '../controladores/controladorLlavesApi';
import { autenticarJwt } from '../middleware/autenticarJwt';
import { requerirRol } from '../middleware/requerirRol';
import { validar } from '../middleware/validar';

export const rutasLlavesApi = Router();

// RF-12: Crear una llave API
rutasLlavesApi.post(
  '/',
  autenticarJwt,
  requerirRol('administrador'),
  validar(esquemaCrearLlaveApi),
  controladorLlavesApi.crear
);

// RF-12: Listar todas las llaves API
rutasLlavesApi.get(
  '/',
  autenticarJwt,
  requerirRol('administrador'),
  controladorLlavesApi.listar
);

// RF-12: Revocar una llave API
rutasLlavesApi.delete(
  '/:id',
  autenticarJwt,
  requerirRol('administrador'),
  validar(esquemaParametroId, 'params'),
  controladorLlavesApi.revocar
);
