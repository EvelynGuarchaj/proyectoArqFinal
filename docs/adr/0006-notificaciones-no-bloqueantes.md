# ADR 0006 — Notificaciones no bloqueantes al servicio externo

- **Estado:** aceptada
- **Fecha:** 2026-11-08
- **Responsable:** Integrante B

## Contexto

Al confirmar o cancelar una reserva, la API debe avisar a un servicio externo de notificaciones que todavía no existe; se simula con Mockoon (`POST /notificaciones` → `202 { "recibido": true }`). Ese servicio puede estar caído o lento, y eso no debe impedir reservar.

## Decisión

- `clientes/clienteNotificaciones.enviar(notificacion)` hace `fetch` a `${URL_NOTIFICACIONES}/notificaciones` con `AbortSignal.timeout(2000)` y un `try/catch` que solo hace `console.error`. Nunca lanza errores; devuelve `true` si recibió 2xx y `false` en otro caso.
- `servicioReservas` lo llama **después** de guardar la reserva e invalidar la caché, y **sin esperar**: `void clienteNotificaciones.enviar(...)`. La respuesta 201/200 sale aunque Mockoon tarde o falle.
- El cuerpo es el tipo compartido `NotificacionReserva`.

## Alternativas descartadas

| Alternativa | Por qué se descartó |
|---|---|
| Llamada síncrona (`await` antes de responder) | Si el servicio tarda, la reserva tarda; si falla, habría que decidir entre fallar la reserva (mala experiencia) o ignorar el error (igual que la opción elegida, pero más lento). |
| Cola de mensajes (Redis Streams, RabbitMQ, BullMQ) | Garantiza entrega con reintentos, pero agrega un componente y un proceso trabajador más, y dependencias nuevas. Excede el alcance y el tiempo del proyecto. |
| Patrón outbox (tabla de notificaciones pendientes) | Entrega garantizada, pero requiere tabla nueva y un proceso que la lea. Se deja como mejora futura. |

## Consecuencias

- **Positivas:** la disponibilidad de la API no depende del servicio externo; la latencia de crear reserva no incluye a Mockoon. Prueba: `pruebas/notificaciones/clienteNotificaciones.prueba.ts` (202 contra el contenedor, error sin excepción, corte a los 2 s).
- **Negativas:** entrega "como máximo una vez": si Mockoon está caído, la notificación se pierde (solo queda en el registro). Si el servicio real lo exige, migrar a outbox o cola.
