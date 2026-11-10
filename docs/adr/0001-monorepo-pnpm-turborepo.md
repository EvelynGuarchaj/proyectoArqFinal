# ADR 0001 — Monorepo con pnpm y Turborepo

## Estado

Aceptado.

## Contexto

ReservaLab tiene tres aplicaciones (API, interfaz web y CLI) que comparten los mismos tipos y esquemas de
validación (`UsuarioPublico`, `Reserva`, `esquemaCrearReserva`, etc.).

Necesitamos:

- Que un cambio en un tipo compartido se refleje al mismo tiempo en la API y en los clientes.
- Instalar dependencias una sola vez y con versiones fijas para las tres.
- Correr `typecheck` y `test` de todo el proyecto con un solo comando.

## Decisión

Usar un **monorepo** con **pnpm 9 workspaces** y **Turborepo**:

- `pnpm-workspace.yaml` declara `apps/*` y `packages/*`.
- `packages/shared` (`@reservalab/shared`) contiene los tipos y esquemas Zod; las apps lo importan con
  `workspace:^`, sin compilarlo ni publicarlo.
- `turbo.json` define las tareas `dev`, `test` y `typecheck`; `pnpm typecheck` y `pnpm test` en la raíz
  las corren en todos los paquetes.
- Un solo `pnpm-lock.yaml`.

## Alternativas descartadas

| Alternativa | Motivo del descarte |
|---|---|
| **Un repositorio por aplicación** (api, web, cli) | Los tipos compartidos habría que copiarlos o publicarlos como paquete npm en cada cambio. Tres repositorios también triplican la configuración y complican revisar la integración en un solo PULL REQUEST. |
| **Monorepo con npm o Yarn workspaces, sin Turborepo** | npm instala más lento y deja que un paquete use dependencias que no declaró (dependencias "fantasma"); pnpm lo impide con su `node_modules` estricto. Sin Turborepo habría que escribir scripts propios para correr las tareas en orden en cada paquete. |
| **Nx** | Resuelve lo mismo, pero trae generadores, plugins y mucha configuración que no necesitamos en un proyecto de este tamaño ni en el tiempo disponible. |

## Consecuencias

**Positivas**

- Los tipos del contrato (`packages/shared`) son una sola fuente de verdad: si cambia un tipo, `pnpm typecheck`
  marca el error en la API y en los clientes.
- Un solo `git clone` + `pnpm install` deja todo listo.
- Turborepo corre las tareas en paralelo y guarda en caché el `typecheck`.

**Negativas**

- Hay que aprender pnpm y Turborepo, y los Dockerfiles deben construirse desde la raíz (copian todo el
  monorepo, lo que hace las imágenes más grandes).
- Un error en `packages/shared` afecta a las tres aplicaciones a la vez.
- Al compartir `pnpm-lock.yaml`, dos personas que agregan dependencias a la vez generan conflictos; por eso
  solo una integrante instala dependencias.
