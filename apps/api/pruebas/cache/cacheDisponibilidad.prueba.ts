// DUEÑA: B — Integración de la caché: MISS → HIT → reservar → MISS (necesita `pnpm servicios`)
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { app, obtenerToken } from '../ayudantes';

const FECHA = '2030-01-16';
let tokenAdmin: string;
let tokenDocente: string;
let espacioId: number;
const edificioUnico = `P${Date.now()}`;

beforeAll(async () => {
  [tokenAdmin, tokenDocente] = await Promise.all([obtenerToken('administrador'), obtenerToken('docente')]);
  const respuesta = await request(app)
    .post('/api/v1/spaces')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({ nombre: `Lab prueba cache ${Date.now()}`, edificio: edificioUnico, capacidad: 15, tipo: 'laboratorio' });
  espacioId = respuesta.body.id;
});

const disponibilidad = () =>
  request(app)
    .get(`/api/v1/spaces/${espacioId}/availability?date=${FECHA}`)
    .set('Authorization', `Bearer ${tokenDocente}`);

describe('Caché de disponibilidad (RF-07)', () => {
  it('MISS → HIT → reservar → MISS (y el bloque aparece ocupado)', async () => {
    const primera = await disponibilidad();
    expect(primera.status).toBe(200);
    expect(primera.headers['x-cache']).toBe('MISS');

    const segunda = await disponibilidad();
    expect(segunda.headers['x-cache']).toBe('HIT');
    expect(segunda.body).toEqual(primera.body);

    const reserva = await request(app)
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${tokenDocente}`)
      .send({ espacioId, inicio: `${FECHA}T09:00:00-06:00`, fin: `${FECHA}T10:00:00-06:00`, motivo: 'Prueba de caché' });
    expect(reserva.status).toBe(201);

    const tercera = await disponibilidad();
    expect(tercera.headers['x-cache']).toBe('MISS');
    const bloque9 = tercera.body.bloques.find((b: { inicio: string }) => b.inicio === '2030-01-16T15:00:00.000Z');
    expect(bloque9.estado).toBe('ocupado');

    // Cancelar también invalida
    await request(app).delete(`/api/v1/reservations/${reserva.body.id}`).set('Authorization', `Bearer ${tokenDocente}`);
    const cuarta = await disponibilidad();
    expect(cuarta.headers['x-cache']).toBe('MISS');
  });
});

describe('Caché de espacios (RF-05)', () => {
  it('MISS → HIT, y crear un espacio invalida', async () => {
    const listar = () =>
      request(app).get(`/api/v1/spaces?edificio=${edificioUnico}`).set('Authorization', `Bearer ${tokenDocente}`);

    expect((await listar()).headers['x-cache']).toBe('MISS');
    const hit = await listar();
    expect(hit.headers['x-cache']).toBe('HIT');
    expect(hit.body).toHaveLength(1);

    await request(app)
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: `Lab prueba cache 2 ${Date.now()}`, edificio: edificioUnico, capacidad: 15, tipo: 'salon' });

    const despues = await listar();
    expect(despues.headers['x-cache']).toBe('MISS');
    expect(despues.body).toHaveLength(2);
  });
});
