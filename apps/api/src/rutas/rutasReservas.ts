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

rutasReservas.get('/', autenticarJwt, requerirRol('docente', 'administrador'), controladorReservas.listarTodas);

// RF-08
rutasReservas.post(
  '/',
  autenticarJwt,
  requerirRol('docente', 'administrador'),
  validar(esquemaCrearReserva),
  controladorReservas.crear,
);

rutasReservas.get('/students', autenticarJwt, requerirRol('docente', 'administrador'), controladorReservas.listarEstudiantes);

// RF-09
rutasReservas.get('/me', autenticarJwt, controladorReservas.listarMias);

// RF-10
rutasReservas.delete(
  '/:id',
  autenticarJwt,
  requerirRol('docente', 'administrador'),
  validar(esquemaParametroId, 'params'),
  controladorReservas.cancelar,
);
