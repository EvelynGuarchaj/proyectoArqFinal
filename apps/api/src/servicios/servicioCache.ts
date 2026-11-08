// DUEÑA: Integrante B (stub creado por A)
import { entorno } from '../config/entorno';
export async function obtenerOGuardar<T>(clave: string, generar: () => Promise<T>, ttlSegundos = entorno.ttlCacheSegundos): Promise<{ datos: T; cache: 'HIT' | 'MISS' }> {
  return { datos: await generar(), cache: 'MISS' };
}
export async function invalidarPorPatron(patron: string): Promise<void> {}
