# ADR 0002 — Prisma como ORM

## Estado

Aceptado.

## Contexto

La API guarda usuarios, tokens de refresco, espacios, reservas y llaves API en PostgreSQL 16. Necesitamos:

- Un esquema versionado con **migraciones** que estén en el repositorio y se apliquen solas al levantar Docker.
- Consultas con **tipos de TypeScript** para que los repositorios no devuelvan datos con forma desconocida.
- Una **semilla** con los datos de prueba.
- Poder agregar SQL propio de PostgreSQL: la restricción de exclusión `reservas_sin_traslape`
  (ver [ADR 0004](0004-restriccion-exclusion-traslapes.md)) no se puede expresar en un esquema de ORM.

## Decisión

Usar **Prisma 6** (no 7, porque la versión 7 cambió la forma de configurarlo):

- El modelo vive en `apps/api/prisma/schema.prisma` y genera el cliente con tipos.
- Las migraciones se crean con `prisma migrate dev` y se guardan en `apps/api/prisma/migrations/`. A la
  migración inicial se le agrega a mano el SQL de la restricción de exclusión.
- En Docker, la API ejecuta `prisma migrate deploy` y `prisma db seed` antes de arrancar.
- Hay un solo cliente, `prisma`, en `config/baseDatos.ts`, y **solo los repositorios lo importan**
  (los controladores y los servicios no).

## Alternativas descartadas

| Alternativa | Motivo del descarte |
|---|---|
| **SQL directo con `pg`** | Habría que escribir a mano los tipos de cada resultado y un sistema propio de migraciones. Es más código y más fácil equivocarse con los tipos. |
| **TypeORM** | Usa decoradores y clases de entidad, sus tipos en las consultas son menos precisos y su generación de migraciones es menos confiable. |
| **Knex (query builder)** | Tiene migraciones, pero los resultados no tienen tipos automáticos; habría que mantener interfaces a mano en paralelo con la base de datos. |

## Consecuencias

**Positivas**

- Las consultas de los repositorios tienen tipos completos; un error en el nombre de una columna aparece en
  `pnpm typecheck`, no en tiempo de ejecución.
- Migraciones y semilla reproducibles: `docker compose down -v && docker compose up --build` deja la base
  igual en cualquier máquina.
- Prisma Studio (`pnpm --filter api bd:studio`) ayuda a revisar los datos durante el desarrollo.

**Negativas**

- Las funciones propias de PostgreSQL (como `EXCLUDE USING gist`) quedan fuera del esquema de Prisma y hay
  que mantenerlas como SQL a mano en la migración.
- El error de la restricción (`23P01`) llega como un error genérico de Prisma, y el repositorio debe
  traducirlo a `ErrorAplicacion(409, 'TRASLAPE')`.
- Agrega un paso de generación (`prisma generate`) y el motor de Prisma necesita `openssl` en la imagen de Docker.
