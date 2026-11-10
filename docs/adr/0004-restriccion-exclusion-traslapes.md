# ADR 0004 — Restricción de exclusión para evitar reservas traslapadas

- **Estado:** aceptada
- **Fecha:** 2026-11-08
- **Responsable:** Integrante B

## Contexto

La regla de negocio más importante de ReservaLab es que un espacio no puede tener dos reservas confirmadas que se traslapen en el tiempo. El enunciado pide validarla en la capa de servicios **y** protegerla en la base de datos, para que se cumpla aunque dos solicitudes lleguen al mismo tiempo. Validar solo en el código tiene una condición de carrera: dos solicitudes pueden consultar "¿hay traslape?" antes de que cualquiera inserte, y ambas pasarían.

## Decisión

Usar dos niveles:

1. **Servicio** (`servicioReservas.crear`): `repositorioReservas.existeTraslape` antes de insertar, para responder 409 con un mensaje claro en el caso normal.
2. **Base de datos**: restricción de exclusión de PostgreSQL con `btree_gist`:

```sql
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_sin_traslape"
  EXCLUDE USING gist ("espacioId" WITH =, tstzrange("inicio", "fin", '[)') WITH &&)
  WHERE ("estado" = 'confirmada');
```

El rango `[)` (cerrado al inicio, abierto al final) permite reservas contiguas (08–10 y 10–11). El `WHERE` permite reusar un horario cancelado. Si PostgreSQL rechaza la fila (código `23P01`), `repositorioReservas.crear` lo convierte en `ErrorAplicacion(409, 'TRASLAPE')`.

## Alternativas descartadas

| Alternativa | Por qué se descartó |
|---|---|
| Solo validar en el código | Condición de carrera: con dos solicitudes simultáneas ambas pasan la validación. No cumple el enunciado. |
| `SELECT ... FOR UPDATE` en una transacción | Solo bloquea filas que ya existen; si todavía no hay reservas en ese horario no hay nada que bloquear. Habría que bloquear la fila del espacio (serializa todas las reservas del espacio) o usar aislamiento `SERIALIZABLE` con reintentos. Más código, más fácil de olvidar en otro punto de entrada. |
| Índice único (`espacioId`, `inicio`) | Solo evita reservas que empiezan a la misma hora; no detecta 08–10 contra 09–11. |
| Bloques fijos en una tabla aparte | Obliga a reservar en bloques exactos y multiplica filas. |

## Consecuencias

- **Positivas:** la integridad la garantiza la base de datos para cualquier cliente (API, scripts, semilla). Prueba: `pruebas/reservas/restriccionBaseDatos.prueba.ts` y la prueba de dos `POST` simultáneos (una 201 y otra 409).
- **Negativas:** depende de PostgreSQL y de la extensión `btree_gist`; Prisma no la puede expresar en `schema.prisma`, así que vive en SQL dentro de la migración. El repositorio debe traducir el error `23P01`.
