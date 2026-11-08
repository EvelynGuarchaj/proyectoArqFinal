export const clavesCache = {
  espacios: (edificio = 'todos', capacidadMinima = 0) => `cache:espacios:${edificio}:${capacidadMinima}`,
  disponibilidad: (espacioId: number, fecha: string) => `cache:disponibilidad:${espacioId}:${fecha}`,
  ahora: () => 'cache:ahora',
  limite: (llaveId: number, minuto: number) => `limite:${llaveId}:${minuto}`,
};

// Patrones para invalidar
export const patronesCache = {
  todosLosEspacios: 'cache:espacios:*',
  disponibilidadDeEspacio: (espacioId: number) => `cache:disponibilidad:${espacioId}:*`,
};
