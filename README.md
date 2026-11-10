# ReservaLab

Sistema cliente-servidor para reservar laboratorios y salones de la facultad de Ingeniería Universidad Mesoamericana Quetzaltenango.
Proyecto del curso Arquitectura de Sistemas I, sección D

- **API REST** (Express 5 + Prisma 6 + PostgreSQL 16 + Redis 7) con autenticación JWT, roles, llaves API,
  caché con invalidación, límite de solicitudes y documentación OpenAPI.
- **Interfaz web** para iniciar sesión, ver la disponibilidad y reservar.
- **Pantalla informativa** que muestra la ocupación actual de cada edificio usando una llave API.
- **CLI de administrador** para crear espacios y administrar llaves API.
- **Servicio de notificaciones** simulado con Mockoon.

La documentación de arquitectura y los ADR están en [`docs/arquitectura/`](docs/).

## Requisitos

- Docker y Docker Compose
- Node.js 20 y pnpm 9 (solo para desarrollo, pruebas y la CLI): `corepack enable`

## Cómo levantar todo

```bash
cp .env.example .env          # luego cambiar SECRETO_JWT por un texto largo y aleatorio
docker compose up --build
```

Esto levanta los 5 contenedores (`basedatos`, `cache`, `notificaciones`, `api`, `web`). Al arrancar, la API
aplica las migraciones y carga los datos de prueba si la base aún no tiene usuarios

Para empezar de cero (borrar los datos): `docker compose down -v && docker compose up --build`.

### URLs

| Qué | URL |
|---|---|
| API | http://localhost:3000/api/v1 |
| Documentación OpenAPI (Swagger UI) | http://localhost:3000/docs |
| Salud | http://localhost:3000/api/v1/health |
| Interfaz web | http://localhost:5173 |
| Pantalla informativa | http://localhost:5173/pantalla.html |
| Mockoon (notificaciones) | http://localhost:3001 |

### Usuarios de prueba (semilla)

| Rol | Nombre | Correo | Contraseña |
|---|---|---|---|
| Administrador | Angela | `angela@reservalab.edu` | `Admin1234` |
| Docente | Yaniz | `yaniz@reservalab.edu` | `Docente1234` |
| Estudiante | Ana | `ana@reservalab.edu` | `Estudiante1234` |

### Espacios (semilla)

Los 9 laboratorios del **edificio D**, todos de 7 a 21 h:

| Laboratorio | Capacidad |
|---|---|
| Laboratorio de Electrónica | 25 |
| Laboratorio de Telecomunicaciones | 25 |
| Laboratorio de Electricidad | 25 |
| Laboratorio de Física | 30 |
| Laboratorio de Civil | 30 |
| Laboratorio de Computación 1 | 30 |
| Laboratorio de Computación 2 | 30 |
| Laboratorio de Computación 3 | 30 |
| Laboratorio de Dibujo | 35 |

También crea una reserva de Yaniz (docente) en el `Laboratorio de Computación 1` mañana de 08:00 a 10:00.

### Llave API demo

| Nombre | Llave | Permisos |
|---|---|---|
| Pantalla edificio D | `rl_live_pantalla_demo_0123456789abcdef` | `read:now`, `read:spaces` |

```bash
curl -H "X-API-Key: rl_live_pantalla_demo_0123456789abcdef" http://localhost:3000/api/v1/now
```

En la base de datos solo se guarda el hash SHA-256 de la llave.

## Desarrollo

```bash
pnpm install
cp .env.example .env
pnpm servicios                     # levanta solo basedatos, cache y notificaciones en Docker
pnpm --filter api bd:migrar        # aplica las migraciones
pnpm --filter api bd:semilla       # carga los datos de prueba
pnpm --filter api dev              # API con recarga automática en http://localhost:3000
pnpm --filter web dev              # interfaz web en http://localhost:5173
```

CLI de administrador (ejemplo):

```bash
pnpm --filter cli cli crear-llave --correo angela@reservalab.edu --contrasena Admin1234 \
  --nombre "Pantalla edificio B" --permisos read:now,read:spaces
```
CLI ver todos los comandos:

```bash
pnpm --filter cli cli --ayuda
```


## Pruebas

Las pruebas de integración necesitan los servicios levantados y la semilla cargada:

```bash
pnpm servicios
pnpm --filter api bd:migrar && pnpm --filter api bd:semilla
pnpm --filter api test             # Vitest + Supertest, con reporte de cobertura (mínimo 70 %)
pnpm typecheck                     # revisa los tipos de todo el monorepo
```

Las pruebas están en `apps/api/pruebas/<modulo>/*.prueba.ts`:

- **Unitarias**: servicios y middleware con los repositorios simulados con `vi.mock`.
- **Integración**: Supertest contra la app real, la base de datos y Redis.

## Estructura del monorepo

```
reservalab/
├── apps/
│   ├── api/                 API REST (Express 5 + Prisma 6)
│   │   ├── prisma/          schema.prisma, migraciones y semilla
│   │   ├── src/
│   │   │   ├── rutas/           encadenan middleware y controlador
│   │   │   ├── controladores/   leen la solicitud y responden (no usan prisma)
│   │   │   ├── servicios/       reglas de negocio (no usan req/res)
│   │   │   ├── repositorios/    consultas con prisma (no conocen HTTP)
│   │   │   ├── middleware/      JWT, roles, llaves API, límite, validación, errores
│   │   │   ├── config/          entorno, baseDatos, redis, clavesCache
│   │   │   ├── clientes/        cliente de notificaciones (Mockoon)
│   │   │   └── openapi/         especificación para /docs
│   │   └── pruebas/         pruebas unitarias y de integración
│   ├── web/                 interfaz web y pantalla informativa (Vite, sin framework)
│   └── cli/                 CLI de administrador
├── packages/
│   └── shared/              tipos y esquemas Zod compartidos (@reservalab/shared)
├── mocks/                   entorno de Mockoon (notificaciones.json)
├── docs/
│   ├── arquitectura/        vistas de arquitectura
│   └── adr/                 decisiones de arquitectura (ADR 0001–0009)
├── docker-compose.yml
└── .env.example
```

## Qué hizo cada integrante

### Integrante A — Base y autenticación

- Estructura del monorepo (pnpm + Turborepo), `packages/shared` con el contrato de tipos y esquemas, y `.env.example`.
- `docker-compose.yml` con los 5 servicios y los Dockerfiles de la API y la web.
- Base de datos: esquema de Prisma, migración inicial (incluida la restricción `reservas_sin_traslape`) y semilla.
- Configuración compartida de la API: `entorno`, `prisma`, `clienteRedis`, `clavesCache`, `ErrorAplicacion`, `hashSha256` y `app.ts`.
- Middleware: `autenticarJwt`, `requerirRol`, `validar` y `manejadorErrores`.
- Autenticación (RF-01 a RF-04): registro, login con JWT de acceso y token de refresco con hash, refresh y logout con revocación.
- Salud (RF-13): estado de la API, la base de datos y Redis (200 o 503).
- OpenAPI: índice, autenticación y salud.
- Pruebas unitarias y de integración de autenticación, roles, manejo de errores y salud.
- Documentación: índice de arquitectura, contexto y requisitos, vista física, ADR 0001–0003 y este README.

### Integrante B — Espacios, reservas y caché
- RF-05 a RF-10: espacios, disponibilidad por bloques de 60 min y reservas.
- Regla de no traslape en el servicio y en PostgreSQL (restricción reservas_sin_traslape, ADR 0004).
- Caché Redis de 60 s con X-Cache e invalidación por patrón (ADR 0005).
- Mock de notificaciones en Mockoon y cliente no bloqueante (ADR 0006).
- Pruebas: unitarias con mocks, integración con Supertest y contra Mockoon.
- Documentación: vista lógica, vista de procesos y ADR 0004–0006.

### Integrante C — Llaves API y clientes
- Middleware `autenticarApiKey`, `limitarSolicitudes` (ventana fija en Redis), `requerirPermiso` y `autenticarJwtOApiKey`.
- RF-12 `POST/GET/DELETE /api-keys` (llave `rl_live_...` mostrada una sola vez, guardada como hash SHA-256).
- RF-11 `GET /now`: ocupación actual por edificio con caché y `X-Cache`.
- Interfaz web (`apps/web`): inicio de sesión y reservas en `index.html`, pantalla informativa en `pantalla.html` (refresco cada 30 s con la llave demo).
- CLI (`apps/cli`): `crear-espacio`, `crear-llave`, `listar-llaves`, `revocar-llave`.
- Pruebas en `pruebas/llaves` y `pruebas/ahora`; vista de desarrollo, atributos de calidad y ADR 0007–0009.

## Uso de IA
- Integrante A: Claude Code para generar diagramas y semillas de prueba
- Integrante B: Claude Code para generación de borradores de reservas y caché
- Integrante C: ChatGPT para apoyar la implementación de llaves API
