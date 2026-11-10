# ADR 0005 — Caché en Redis con TTL de 60 s e invalidación por patrón

- **Estado:** aceptada
- **Fecha:** 2026-11-08
- **Responsable:** Integrante B

## Contexto

`GET /spaces` (RF-05), `GET /spaces/:id/availability` (RF-07) y `GET /now` (RF-11) se consultan mucho (la pantalla informativa refresca cada 30 s) y cambian poco. El enunciado pide guardarlas 60 s en Redis, invalidarlas cuando se crea o cancela una reserva del espacio afectado (nunca mostrar libre un espacio recién reservado) y responder con `X-Cache: HIT` o `MISS`.

## Decisión

- `servicioCache.obtenerOGuardar(clave, generar, ttl)`: `GET clave`; si existe → `HIT`; si no, ejecuta `generar()`, guarda con `SET clave valor EX 60` y devuelve `MISS`. El controlador pone el encabezado `X-Cache`.
- Las claves están centralizadas en `config/clavesCache.ts` (`cache:espacios:<edificio>:<capacidad>`, `cache:disponibilidad:<id>:<fecha>`, `cache:ahora`).
- `servicioCache.invalidarPorPatron(patron)` recorre con `SCAN` (no `KEYS`, que bloquea Redis) y borra con `DEL`.
- Reglas: crear o cancelar reserva → `cache:disponibilidad:<id>:*` y `cache:ahora`. Crear, editar o desactivar espacio → además `cache:espacios:*`.
- Se guardan datos ya convertidos a JSON (fechas como texto ISO), así la respuesta HIT es idéntica a la MISS.
- Si Redis falla, la API responde sin caché (`MISS`) y lo registra en consola.

## Alternativas descartadas

| Alternativa | Por qué se descartó |
|---|---|
| Sin caché | Cada refresco de cada pantalla consulta PostgreSQL. No cumple el enunciado (10 puntos de la rúbrica). |
| Caché en memoria del proceso (`Map`) | Se pierde al reiniciar y no se comparte si hay más de una instancia de la API; la invalidación de una instancia no llega a las otras. Además Redis ya es obligatorio para el límite de solicitudes. |
| Solo TTL, sin invalidación | Durante hasta 60 s se vería libre un espacio recién reservado; el enunciado lo prohíbe. |
| Invalidar con `KEYS patron` | `KEYS` bloquea Redis mientras recorre todas las claves; `SCAN` lo hace por partes. |

## Consecuencias

- **Positivas:** respuestas HIT más rápidas (meta: < 50 ms), menos carga en PostgreSQL, comportamiento demostrable con `X-Cache`. Prueba: `pruebas/cache/cacheDisponibilidad.prueba.ts` (MISS → HIT → reservar → MISS).
- **Negativas:** cada servicio que modifica datos debe acordarse de invalidar; un patrón olvidado da datos viejos hasta 60 s. Se mitiga con las reglas escritas en el contrato y con pruebas.
