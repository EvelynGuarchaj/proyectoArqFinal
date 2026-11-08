import type { Rol, Permiso } from '@reservalab/shared';

declare global {
  namespace Express {
    interface Request {
      usuario?: { id: number; rol: Rol };                                       // lo pone autenticarJwt
      llaveApi?: { id: number; permisos: Permiso[]; limitePorMinuto: number };  // lo pone autenticarApiKey
    }
  }
}
export {};
