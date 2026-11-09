import type { EstadoSalud } from '@reservalab/shared';
import { prisma } from '../config/baseDatos';
import { clienteRedis } from '../config/redis';

const TIEMPO_MAXIMO_MS = 2000;

// Evita que /health se quede colgado si un servicio no responde
function conTiempoMaximo<T>(promesa: Promise<T>): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<never>((_, rechazar) =>
      setTimeout(() => rechazar(new Error('Tiempo de espera agotado')), TIEMPO_MAXIMO_MS),
    ),
  ]);
}

async function revisarBaseDatos(): Promise<'ok' | 'error'> {
  try {
    await conTiempoMaximo(prisma.$queryRaw`SELECT 1`);
    return 'ok';
  } catch {
    return 'error';
  }
}

async function revisarCache(): Promise<'ok' | 'error'> {
  try {
    await conTiempoMaximo(clienteRedis.ping());
    return 'ok';
  } catch {
    return 'error';
  }
}

// RF-13
export async function obtenerEstado(): Promise<EstadoSalud> {
  const [baseDatos, cache] = await Promise.all([revisarBaseDatos(), revisarCache()]);
  const estado = baseDatos === 'ok' && cache === 'ok' ? 'ok' : 'degradado';
  return { estado, api: 'ok', baseDatos, cache };
}
