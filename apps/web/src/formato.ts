//dueño del archivo: Integrante C
const ZONA = 'America/Guatemala';

// Mostrar una hora en formato de 24 horas
export function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-GT', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: ZONA
  });
}

// Mostrar una fecha corta en español
export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-GT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: ZONA
  });
}

// Obtener la fecha actual en Guatemala (AAAA-MM-DD)
export function hoyEnGuatemala(): string {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: ZONA
  });
}

// Crear elementos HTML de forma segura
export function crearElemento<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  texto?: string,
  clase?: string
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(etiqueta);

  if (texto !== undefined) {
    elemento.textContent = texto;
  }

  if (clase) {
    elemento.className = clase;
  }

  return elemento;
}
