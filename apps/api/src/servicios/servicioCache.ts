// DUEÑA: B
// Cache con Redis. Mismas firmas que el stub del commit cero.
import { entorno } from '../config/entorno';
import { clienteRedis } from '../config/redis';

export async function obtenerOGuardar<T>(
  clave: string,
  generar: () => Promise<T>,
  ttlSegundos = entorno.ttlCacheSegundos,
): Promise<{ datos: T; cache: 'HIT' | 'MISS' }> {
  let guardado: string | null = null;
  try {
    guardado = await clienteRedis.get(clave);
  } catch (error) {
    // Si Redis falla, la API sigue respondiendo (sin cache)
    console.error('[cache] no se pudo leer de Redis:', error);
  }

  if (guardado !== null) {
    return { datos: JSON.parse(guardado) as T, cache: 'HIT' };
  }

  // Si generar() lanza un error (por ejemplo 404), no se guarda nada
  const datos = await generar();

  try {
    await clienteRedis.set(clave, JSON.stringify(datos), 'EX', ttlSegundos);
  } catch (error) {
    console.error('[cache] no se pudo guardar en Redis:', error);
  }

  return { datos, cache: 'MISS' };
}

export async function invalidarPorPatron(patron: string): Promise<void> {
  try {
    let cursor = '0';
    do {
      const [siguiente, claves] = await clienteRedis.scan(cursor, 'MATCH', patron, 'COUNT', 100);
      cursor = siguiente;
      if (claves.length > 0) {
        await clienteRedis.del(...claves);
      }
    } while (cursor !== '0');
  } catch (error) {
    console.error(`[cache] no se pudo invalidar el patrón ${patron}:`, error);
  }
}
