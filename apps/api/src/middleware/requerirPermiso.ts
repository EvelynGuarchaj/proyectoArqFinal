// DUEÑA: Integrante C (stub creado por A)
import type { RequestHandler } from 'express';
import type { Permiso } from '@reservalab/shared';
export const requerirPermiso = (permiso: Permiso): RequestHandler => (req, res, next) => next();
