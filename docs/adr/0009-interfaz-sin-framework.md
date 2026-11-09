# ADR 0009 — Interfaz web con HTML + TypeScript y Vite, sin framework

- **Estado:** aceptada
- **Fecha:** 2026-11-08
- **Responsable:** Integrante C

## Contexto

La web solo sirve para demostrar que la API funciona: inicio de sesión, ver bloques de disponibilidad, reservar, cancelar y una pantalla informativa que se refresca sola. Son tres vistas y el plazo es de tres días. El enfoque del curso es la arquitectura del backend.

## Decisión

- Vite como servidor de desarrollo y empaquetador, con dos entradas: `index.html` y `pantalla.html`.
- TypeScript sin framework, manipulando el DOM con `document.createElement` y `textContent` (no `innerHTML`, para no inyectar HTML de los motivos de las reservas).
- `index.html` es una sola página con dos secciones (inicio de sesión y reservas) para que el token, que se guarda **solo en memoria** (`sesion.ts`), no se pierda al cambiar de vista.
- Un único punto de acceso a la API: `solicitar<T>()` en `api.ts`, que agrega `Authorization` y convierte las respuestas de error en `Error` con el `mensaje` de la API.
- Tipos de `@reservalab/shared` (`Espacio`, `Disponibilidad`, `RespuestaAhora`…).

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| **React (o Vue/Angular)** | Agrega dependencias, JSX, manejo de estado y una curva de aprendizaje para quien no lo conoce, para solo tres vistas. El tiempo se aprovecha mejor en la API y las pruebas. |
| **HTML + JavaScript sin Vite** | Perderíamos los tipos compartidos de `@reservalab/shared` y la comprobación con `tsc`. Además Vite expone las variables `VITE_*` del `.env`. |
| **Renderizar en el servidor** (plantillas en Express) | Mezcla la interfaz con la API y rompe la separación del monorepo; la API debe ser solo JSON. |
| **Guardar el token en `localStorage`** | Cualquier script inyectado podría leerlo. Para la demostración basta con memoria, aunque al recargar haya que iniciar sesión otra vez. |

## Consecuencias

- **Positivas:** cero dependencias extra; compila con el mismo `tsc` que el resto; cualquier integrante entiende el código; la pantalla se puede abrir en cualquier navegador.
- **Negativas:** actualizar el DOM a mano es más verboso; si la interfaz creciera, convendría migrar a un framework. Al recargar la página se pierde la sesión.
