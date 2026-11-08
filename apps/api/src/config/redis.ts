import { Redis } from 'ioredis';
import { entorno } from './entorno';

// Una sola conexión a Redis (caché y límite de solicitudes)
export const clienteRedis = new Redis(entorno.urlRedis, { maxRetriesPerRequest: 1 });
