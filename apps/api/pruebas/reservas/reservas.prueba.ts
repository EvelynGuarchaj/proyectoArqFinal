// DUEÑA: B — Pruebas de integración de reservas (necesita `pnpm servicios` y la semilla)
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { app, obtenerToken } from '../ayudantes';

const FECHA = '2030-01-15';
const hora = (h: string) => `${FECHA}T${h}:00-06:00`;

let tokenAdmin: string;
let tokenDocente: string;
let tokenEstudiante: string;
let espacioId: number;

beforeAll(async () => {
  [tokenAdmin, tokenDocente, tokenEstudiante] = await Promise.all([
    obtenerToken('administrador'),
    obtenerToken('docente'),
    obtenerToken('estudiante'),
  ]);
  const respuesta = await request(app)
    .post('/api/v1/spaces')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({ nombre: `Lab prueba reservas ${Date.now()}`, edificio: 'Z', capacidad: 20, tipo: 'laboratorio' });
  expect(respuesta.status).toBe(201);
  espacioId = respuesta.body.id;
});

const reservar = (token: string, inicio: string, fin: string) =>
  request(app)
    .post('/api/v1/reservations')
    .set('Authorization', `Bearer ${token}`)
    .send({ espacioId, inicio: hora(inicio), fin: hora(fin), motivo: 'Prueba de integración' });

describe('POST /reservations', () => {
  it('crea una reserva (201) y la misma otra vez da 409 TRASLAPE', async () => {
    const primera = await reservar(tokenDocente, '08:00', '10:00');
    expect(primera.status).toBe(201);
    expect(primera.body).toMatchObject({ espacioId, estado: 'confirmada' });

    const segunda = await reservar(tokenDocente, '08:00', '10:00');
    expect(segunda.status).toBe(409);
    expect(segunda.body.error.codigo).toBe('TRASLAPE');
  });

  it('un traslape parcial también da 409', async () => {
    const respuesta = await reservar(tokenAdmin, '09:30', '11:00');
    expect(respuesta.status).toBe(409);
  });

  it('una reserva contigua (10–11) sí se permite', async () => {
    const respuesta = await reservar(tokenDocente, '10:00', '11:00');
    expect(respuesta.status).toBe(201);
  });

  it('dos solicitudes simultáneas: una 201 y la otra 409', async () => {
    const respuestas = await Promise.all([
      reservar(tokenDocente, '14:00', '15:00'),
      reservar(tokenAdmin, '14:00', '15:00'),
    ]);
    expect(respuestas.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it('fuera de horario da 400 FUERA_DE_HORARIO', async () => {
    const respuesta = await reservar(tokenDocente, '05:00', '06:00');
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('FUERA_DE_HORARIO');
  });

  it('un estudiante no puede reservar (403)', async () => {
    const respuesta = await reservar(tokenEstudiante, '16:00', '17:00');
    expect(respuesta.status).toBe(403);
  });

  it('sin token da 401', async () => {
    const respuesta = await request(app).post('/api/v1/reservations').send({});
    expect(respuesta.status).toBe(401);
  });

  it('datos inválidos dan 400 VALIDACION', async () => {
    const respuesta = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${tokenDocente}`)
      .send({ espacioId, inicio: 'mañana', fin: 'pasado', motivo: 'x' });
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('VALIDACION');
  });

  it('espacio inexistente da 404', async () => {
    const respuesta = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${tokenDocente}`)
      .send({ espacioId: 999999, inicio: hora('08:00'), fin: hora('09:00'), motivo: 'Prueba' });
    expect(respuesta.status).toBe(404);
  });
});

describe('GET /reservations/me y DELETE /reservations/:id', () => {
  it('lista mis reservas con los datos del espacio, ordenadas por inicio', async () => {
    const respuesta = await request(app).get('/api/v1/reservations/me').set('Authorization', `Bearer ${tokenDocente}`);
    expect(respuesta.status).toBe(200);
    const mias = respuesta.body.filter((r: { espacioId: number }) => r.espacioId === espacioId);
    expect(mias.length).toBeGreaterThan(0);
    expect(mias[0].espacio).toHaveProperty('nombre');
    const inicios = respuesta.body.map((r: { inicio: string }) => r.inicio);
    expect([...inicios].sort()).toEqual(inicios);
  });

  it('cancelar: ajena 403, dueño 200, y el horario se puede volver a reservar', async () => {
    const creada = await reservar(tokenDocente, '18:00', '19:00');
    expect(creada.status).toBe(201);
    const id = creada.body.id;

    const ajena = await request(app).delete(`/api/v1/reservations/${id}`).set('Authorization', `Bearer ${tokenEstudiante}`);
    expect(ajena.status).toBe(403);

    const cancelada = await request(app).delete(`/api/v1/reservations/${id}`).set('Authorization', `Bearer ${tokenDocente}`);
    expect(cancelada.status).toBe(200);
    expect(cancelada.body.estado).toBe('cancelada');

    const otraVez = await reservar(tokenDocente, '18:00', '19:00');
    expect(otraVez.status).toBe(201);
  });

  it('cancelar una reserva que no existe da 404', async () => {
    const respuesta = await request(app).delete('/api/v1/reservations/999999').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(respuesta.status).toBe(404);
  });
});
