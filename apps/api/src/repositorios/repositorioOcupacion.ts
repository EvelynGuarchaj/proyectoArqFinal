//dueño del archivo integrante C

import { prisma } from '../config/baseDatos';

// Espacios activos con la reserva confirmada que
// está ocurriendo en "ahora" (inicio <= ahora < fin).
// Como no hay traslapes, a lo mucho hay una.

export async function obtenerEspaciosConReservaActual(ahora: Date) {
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
          inicio: { lte: ahora },
          fin: { gt: ahora }
        },
        orderBy: {
          inicio: 'asc'
        },
        take: 1
      }
    }
  });
}
