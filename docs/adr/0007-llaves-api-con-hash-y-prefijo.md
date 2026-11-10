# ADR 0007 — Llaves API guardadas como hash SHA-256 con prefijo visible

- **Estado:** aceptada

## Contexto

Sistemas externos (pantallas informativas de cada edificio) deben consultar `GET /now` y `GET /spaces` sin un usuario humano que inicie sesión. Necesitamos una credencial de larga duración, revocable, con permisos limitados y con límite de solicitudes. Si la base de datos se filtra, las credenciales no deben poder usarse.

## Decisión

- La llave tiene la forma `rl_live_` + 48 caracteres hexadecimales (`randomBytes(24)`), es decir 192 bits aleatorios.
- En `llaves_api` se guarda solo `hashLlave = SHA-256(llave)` (único) y `prefijo = llave.slice(0, 12)` para que el administrador reconozca la llave en listados.
- La llave completa se devuelve **una sola vez** en `POST /api-keys` (`LlaveApiCreada`).
- El cliente la envía en el encabezado `X-API-Key`. `autenticarApiKey` rechaza con 401 `LLAVE_INVALIDA` si falta, no empieza con `rl_live_`, no existe o está revocada.
- Cada llave tiene `permisos` (`read:spaces`, `read:now`) y `limitePorMinuto`. Revocar = `revocada = true`.

## Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| **Guardar la llave en texto plano** | Una filtración de la base expone todas las llaves listas para usarse. No cumple el atributo "0 secretos en texto plano". |
| **bcrypt para las llaves** (como las contraseñas) | bcrypt es lento a propósito y usa sal aleatoria: no se puede buscar por hash con un índice, habría que comparar contra todas las llaves en cada solicitud. Las llaves ya tienen 192 bits de entropía, así que no necesitan un hash lento contra fuerza bruta. |
| **JWT firmado para sistemas** | No se puede revocar uno solo sin una lista negra, y se suele emitir con vencimiento. Una pantalla necesita una credencial que no caduque pero que el administrador pueda cortar al instante. |
| **Llave sin prefijo** | El prefijo `rl_live_` permite rechazar basura sin consultar la base, que los escáneres de secretos (por ejemplo, el de GitHub) la detecten si se sube por error, y que el administrador identifique cada llave por sus primeros 12 caracteres. |

## Consecuencias

- **Positivas:** búsqueda O(1) por índice único; revocación inmediata; una filtración de la base no compromete las llaves; permisos por llave.
- **Negativas:** si el administrador pierde la llave, no se puede recuperar: hay que crear otra y revocar la anterior. Cada solicitud con llave hace una consulta a la base (aceptable con el índice; se podría cachear más adelante).
- `ultimoUso` se actualiza sin esperar, así que puede quedar un poco atrasado si la base está lenta.
