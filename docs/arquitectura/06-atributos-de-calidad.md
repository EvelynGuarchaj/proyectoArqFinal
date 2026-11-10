# 6. Atributos de calidad

Cada atributo tiene una medida concreta y una forma de comprobarla en la demostración o en las pruebas.

| Atributo | Escenario | Medida (objetivo) | Cómo se logra | Cómo se comprueba |
|---|---|---|---|---|
| **Seguridad — secretos** | Alguien obtiene una copia de la base de datos | 0 contraseñas y 0 llaves API en texto plano | Contraseñas con bcryptjs (costo 10); tokens de refresco y llaves API como hash SHA-256 (`hashSha256`). La llave completa solo se devuelve una vez al crearla | Prueba `llavesApi.prueba.ts`: `hashLlave` en BD es igual a `hashSha256(llave)` y distinto de la llave. `GET /api-keys` no devuelve `hashLlave` |
| **Seguridad — sesiones** | Roban un token de acceso | Token válido como máximo 15 min | JWT de acceso de 15 min + token de refresco revocable (7 días) | Prueba de A: logout → refresh responde 401 |
| **Seguridad — mínimo privilegio** | Una pantalla con llave de solo lectura de ocupación intenta listar espacios | 403 `PERMISO_INSUFICIENTE` en el 100 % de los casos | Permisos por llave (`read:spaces`, `read:now`) y `requerirPermiso` | Prueba: `GET /spaces` con llave sin `read:spaces` → 403 |
| **Protección / disponibilidad ante abuso** | Un sistema externo hace un bucle de solicitudes | A partir de la solicitud 61 del mismo minuto: 429 `LIMITE_EXCEDIDO` (límite por defecto 60/min por llave) | Ventana fija en Redis: `INCR limite:<llaveId>:<minuto>` + `EXPIRE 60` | Prueba unitaria y de integración (llave con límite 2 → la tercera da 429) |
| **Rendimiento** | Muchas pantallas consultan `/now` | Respuesta con `X-Cache: HIT` en menos de 50 ms en local | Caché Redis (TTL 60 s) en `/spaces`, disponibilidad y `/now` | `curl.exe -w "%{time_total}"` dos veces: la segunda muestra `X-Cache: HIT` |
| **Integridad** | Dos personas reservan el mismo espacio y horario al mismo tiempo | 0 traslapes en la base aunque las solicitudes sean simultáneas | Validación en el servicio + restricción `EXCLUDE USING gist` (`reservas_sin_traslape`) en PostgreSQL | Prueba de B: dos `POST` con `Promise.all` → uno 201 y otro 409 |
| **Disponibilidad** | Se cae Redis o PostgreSQL | `/health` responde 503 `degradado` indicando qué componente falla | `GET /health` hace `SELECT 1` y `PING` | Detener el contenedor `cache` y consultar `/health` |
| **Tolerancia a fallos** | El servicio de notificaciones (Mockoon) no responde | La reserva se confirma igual; la notificación espera como máximo 2 s | Envío sin esperar con `AbortSignal.timeout(2000)` | Detener `notificaciones` y crear una reserva |
| **Mantenibilidad** | Cambia un esquema de entrada | Un solo archivo que editar; los 3 paquetes avisan al compilar | `packages/shared` con esquemas Zod y tipos | `pnpm typecheck` |
| **Capacidad de prueba** | Se entrega el proyecto | Cobertura de líneas ≥ 70 % | Servicios con repositorios simulados (`vi.mock`) + integración con Supertest | `pnpm --filter api test` muestra el reporte de cobertura |

## Compromisos (trade-offs)

- **Caché vs. datos frescos**: `/now` puede mostrar hasta 60 s de retraso cuando una reserva empieza o termina por el paso del tiempo (no hay evento que invalide). Crear o cancelar una reserva sí invalida `cache:ahora` al instante. Para una pantalla que se refresca cada 30 s es aceptable.
- **Ventana fija vs. deslizante**: permite hasta el doble del límite justo en el cambio de minuto (60 al final de un minuto + 60 al inicio del siguiente). Se aceptó por simplicidad (ver ADR 0008).
