// DUEÑA: Integrante C (stub creado por A)
import { Router } from 'express';
import * as controladorAhora from '../controladores/controladorAhora';
import { autenticarApiKey } from '../middleware/autenticarApiKey';
import { limitarSolicitudes } from '../middleware/limitarSolicitudes';
import { requerirPermiso } from '../middleware/requerirPermiso';

export const rutasAhora = Router();
// RF-11: Obtener ocupación actual
// Orden: autenticación -> límite -> permiso -> controlador
rutasAhora.get(
  '/',
  autenticarApiKey,
  limitarSolicitudes,
  requerirPermiso('read:now'),
  controladorAhora.obtener
);
