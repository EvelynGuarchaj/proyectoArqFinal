//dueño del archivo integrante C

import { prisma } from '../config/baseDatos';

// Incluye la reserva actual y la próxima para saber cuándo caduca la ocupación.

export async function obtenerEspaciosConReservasVigentes(ahora: Date) {
  return prisma.espacio.findMany({
    where: {
      activo: true
    },
    orderBy: [
      { edificio: 'asc' },
      { nombre: 'asc' }
    ],
    include: {
      reservas: {
        where: {
          estado: 'confirmada',
          fin: { gt: ahora }
        },
        orderBy: {
          inicio: 'asc'
        },
        take: 2
      }
    }
  });
}
