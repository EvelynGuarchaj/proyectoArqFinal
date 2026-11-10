# 03 — Vista de procesos

Esta vista muestra qué pasa en el tiempo cuando llegan solicitudes, en especial la creación de una reserva, que es el flujo con la regla de negocio más importante (no hay dos reservas traslapadas).

## Crear reserva (RF-08)

```mermaid
sequenceDiagram
    autonumber
    actor D as Docente (web)
    participant R as rutasReservas + middleware
    participant C as controladorReservas
    participant S as servicioReservas
    participant RE as repositorioEspacios
    participant RR as repositorioReservas
    participant BD as PostgreSQL
    participant CA as Redis (servicioCache)
    participant M as Mockoon

    D->>R: POST /api/v1/reservations (Bearer JWT)
    R->>R: autenticarJwt → requerirRol → validar(esquemaCrearReserva)
    alt token o rol inválido / datos inválidos
        R-->>D: 401 / 403 / 400 VALIDACION
    end
    R->>C: crear(req, res)
    C->>S: crear(usuarioId, datos)
    S->>RE: buscarPorId(espacioId)
    RE->>BD: SELECT espacio
    alt no existe o inactivo
        S-->>D: 404 NO_ENCONTRADO
    end
    S->>S: ¿fin > inicio, mismo día, dentro del horario?
    alt fuera de horario
        S-->>D: 400 FUERA_DE_HORARIO
    end
    S->>RR: existeTraslape(espacioId, inicio, fin)
    RR->>BD: SELECT count(*) ... estado = confirmada
    alt ya hay traslape
        S-->>D: 409 TRASLAPE
    end
    S->>RR: crear(datos)
    RR->>BD: INSERT reserva
    alt otra solicitud ganó al mismo tiempo
        BD-->>RR: error 23P01 (reservas_sin_traslape)
        RR-->>D: 409 TRASLAPE
    end
    BD-->>RR: fila creada
    S->>CA: invalidarPorPatron(cache:disponibilidad:id:*) y cache:ahora
    S--)M: POST /notificaciones (sin esperar, máx. 2 s)
    S-->>C: Reserva
    C-->>D: 201 Created
    M--)S: 202 { recibido: true } (o error que solo se registra)
```

## Dos solicitudes al mismo tiempo

```mermaid
sequenceDiagram
    participant A as Solicitud A
    participant B as Solicitud B
    participant S as servicioReservas
    participant BD as PostgreSQL

    A->>S: crear 14:00–15:00
    B->>S: crear 14:00–15:00
    S->>BD: existeTraslape (A) → no
    S->>BD: existeTraslape (B) → no
    S->>BD: INSERT (A)
    BD-->>S: OK → 201
    S->>BD: INSERT (B)
    BD-->>S: 23P01 exclusion_violation → 409
```

La validación en el servicio da mensajes claros en el caso normal; la restricción de exclusión en la base de datos garantiza la regla cuando dos procesos pasan la validación al mismo tiempo (ver ADR 0004).

## Consultar disponibilidad con caché (RF-07)

```mermaid
sequenceDiagram
    actor U as Usuario o pantalla
    participant API as API (servicioDisponibilidad)
    participant CA as Redis
    participant BD as PostgreSQL

    U->>API: GET /spaces/1/availability?date=2026-11-10
    API->>CA: GET cache:disponibilidad:1:2026-11-10
    alt existe (HIT)
        CA-->>API: JSON
        API-->>U: 200 + X-Cache: HIT
    else no existe (MISS)
        API->>BD: espacio + reservas confirmadas del día
        API->>API: generarBloques (60 min)
        API->>CA: SET ... EX 60
        API-->>U: 200 + X-Cache: MISS
    end
    Note over API,CA: Crear o cancelar una reserva borra cache:disponibilidad:1:* y cache:ahora
```

## Procesos y concurrencia

| Proceso | Contenedor | Concurrencia |
|---|---|---|
| API (Node.js + Express 5) | `api` | Un proceso con event loop; atiende muchas solicitudes a la vez con E/S asíncrona |
| PostgreSQL | `basedatos` | Serializa los INSERT en conflicto mediante la restricción de exclusión |
| Redis | `cache` | Un hilo; `GET`/`SET`/`SCAN` atómicos |
| Mockoon | `notificaciones` | Independiente; si falla, la API sigue |
