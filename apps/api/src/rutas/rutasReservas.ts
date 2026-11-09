// DUEÑA: B
// Ruta: solo encadena middleware y controlador (orden de la sección 3.8).
// Las rutas son relativas: app.ts monta este router en /api/v1/reservations
import { Router } from 'express';
import { esquemaCrearReserva, esquemaParametroId } from '@reservalab/shared';
import * as controladorReservas from '../controladores/controladorReservas';
import { autenticarJwt } from '../middleware/autenticarJwt';
import { requerirRol } from '../middleware/requerirRol';
import { validar } from '../middleware/validar';

export const rutasReservas = Router();

// RF-08
rutasReservas.post(
  '/',
  autenticarJwt,
  requerirRol('docente', 'administrador'),
  validar(esquemaCrearReserva),
  controladorReservas.crear,
);

// RF-09
rutasReservas.get('/me', autenticarJwt, controladorReservas.listarMias);

// RF-10
rutasReservas.delete(
  '/:id',
  autenticarJwt,
  validar(esquemaParametroId, 'params'),
  controladorReservas.cancelar,
);
