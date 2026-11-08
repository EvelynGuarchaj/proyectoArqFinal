// DUEÑA: Integrante C (stub creado por A)
import type { RequestHandler } from 'express';
import type { Permiso } from '@reservalab/shared';
import { autenticarJwt } from './autenticarJwt';
export const autenticarJwtOApiKey = (permiso: Permiso): RequestHandler => autenticarJwt;
