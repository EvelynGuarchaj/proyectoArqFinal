# Documento de arquitectura — ReservaLab

Este índice reúne las vistas de arquitectura y las decisiones (ADR) del sistema ReservaLab.
Cada documento indica quién lo escribió.

## Vistas de arquitectura

| # | Documento | Contenido | Autora |
|---|---|---|---|
| 1 | [Contexto y requisitos](01-contexto-y-requisitos.md) | Problema, tipos de usuario, requisitos funcionales y diagrama de contexto | Integrante A |
| 2 | [Vista lógica: capas y MVC](02-vista-logica-capas-mvc.md) | Las 4 capas de la API y qué archivo va en cada una | Integrante B |
| 3 | [Vista de procesos](03-vista-procesos.md) | Secuencia de crear una reserva (validación, base de datos, caché, notificación) | Integrante B |
| 4 | [Vista de desarrollo: monorepo](04-vista-desarrollo-monorepo.md) | Paquetes del monorepo y sus dependencias | Integrante C |
| 5 | [Vista física: despliegue](05-vista-fisica-despliegue.md) | Los 5 contenedores de Docker Compose, puertos y variables de entorno | Integrante A |
| 6 | [Atributos de calidad](06-atributos-de-calidad.md) | Atributos medibles: seguridad, rendimiento, integridad, disponibilidad | Integrante C |

## Decisiones de arquitectura (ADR)

| ADR | Decisión | Autora |
|---|---|---|
| [0001](../adr/0001-monorepo-pnpm-turborepo.md) | Monorepo con pnpm y Turborepo | Integrante A |
| [0002](../adr/0002-prisma-como-orm.md) | Prisma como ORM | Integrante A |
| [0003](../adr/0003-jwt-acceso-y-refresco.md) | JWT de acceso de 15 min y token de refresco opaco de 7 días | Integrante A |
| [0004](../adr/0004-restriccion-exclusion-traslapes.md) | Restricción de exclusión en PostgreSQL contra traslapes | Integrante B |
| [0005](../adr/0005-cache-redis-con-invalidacion.md) | Caché en Redis con invalidación | Integrante B |
| [0006](../adr/0006-notificaciones-no-bloqueantes.md) | Notificaciones no bloqueantes | Integrante B |
| [0007](../adr/0007-llaves-api-con-hash-y-prefijo.md) | Llaves API con hash y prefijo | Integrante C |
| [0008](../adr/0008-limite-solicitudes-ventana-fija.md) | Límite de solicitudes con ventana fija | Integrante C |
| [0009](../adr/0009-interfaz-sin-framework.md) | Interfaz web sin framework | Integrante C |

## Formato de los ADR

Cada ADR tiene las mismas secciones: **Estado**, **Contexto**, **Decisión**, **Alternativas descartadas** (con el motivo) y **Consecuencias** (positivas y negativas).
