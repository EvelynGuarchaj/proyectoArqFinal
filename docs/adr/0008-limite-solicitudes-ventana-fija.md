# ADR 0008 — Límite de solicitudes con ventana fija en Redis

- **Estado:** aceptada
- **Fecha:** 2026-11-08
- **Responsable:** Integrante C

## Contexto

Las llaves API dan acceso a sistemas automáticos. Un error en una pantalla (por ejemplo, un `setInterval` de 30 ms en lugar de 30 000 ms) podría saturar la API. El enunciado pide responder 429 al pasar el límite. La API puede correr en varias instancias (Docker Compose), así que el contador no puede vivir en la memoria de un solo proceso.

## Decisión

Middleware `limitarSolicitudes`, después de `autenticarApiKey`:

1. `minuto = Math.floor(Date.now() / 60000)`.
2. `INCR limite:<llaveId>:<minuto>` (clave de `clavesCache.limite`).
3. Si el resultado es 1 (primera solicitud del minuto), `EXPIRE` de 60 s.
4. Si el contador pasa de `req.llaveApi.limitePorMinuto` → 429 `LIMITE_EXCEDIDO`.

El límite es por llave (columna `limitePorMinuto`, por defecto 60).

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| **Contador en memoria** (un `Map` en el proceso) | Se pierde al reiniciar y no se comparte entre instancias: con 2 contenedores de API el límite real sería el doble. Además no tiene vencimiento automático. |
| **Ventana deslizante** (lista ordenada en Redis con marcas de tiempo, `ZADD` + `ZREMRANGEBYSCORE`) | Más precisa, pero guarda una entrada por solicitud y necesita varias operaciones por solicitud. Para el tamaño del proyecto la complejidad no se justifica. |
| **Cubeta de fichas (token bucket)** | Permite ráfagas controladas, pero necesita un script Lua para ser atómica. Más difícil de explicar y de probar. |
| **Paquete `express-rate-limit`** | Implica instalar una dependencia nueva y limita por IP por defecto; aquí el límite debe ser por llave y configurable por llave. |

## Consecuencias

- **Positivas:** una sola operación atómica (`INCR`) por solicitud; las claves se borran solas; funciona con varias instancias; fácil de probar simulando `clienteRedis`.
- **Negativas:** en el borde entre dos minutos una llave puede hacer hasta el doble del límite en poco tiempo (60 al final de un minuto y 60 al inicio del siguiente). Lo aceptamos.
- Si Redis no responde, la solicitud falla con 500 (se prefiere fallar cerrado a quedarse sin protección). `/health` lo reporta.
- Si `INCR` funciona pero `EXPIRE` falla, la clave queda sin vencimiento; el impacto es bajo porque la clave incluye el minuto y nunca se vuelve a usar.
