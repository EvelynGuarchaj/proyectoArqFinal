// DUEÑA: B — Pruebas de integración de espacios (necesita `pnpm servicios` y la semilla)
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { app, obtenerToken } from '../ayudantes';

let tokenAdmin: string;
let tokenDocente: string;
const sufijo = Date.now();
const edificio = `E${sufijo}`;

beforeAll(async () => {
  [tokenAdmin, tokenDocente] = await Promise.all([obtenerToken('administrador'), obtenerToken('docente')]);
});

const crearEspacio = (token: string, datos: Record<string, unknown>) =>
  request(app).post('/api/v1/spaces').set('Authorization', `Bearer ${token}`).send(datos);

describe('Espacios (RF-05, RF-06, RF-07)', () => {
  let espacioId: number;

  it('el administrador crea un espacio (201) con horario por defecto 7–21', async () => {
    const respuesta = await crearEspacio(tokenAdmin, { nombre: `Lab prueba ${sufijo}`, edificio, capacidad: 30, tipo: 'laboratorio' });
    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toMatchObject({ edificio, horaApertura: 7, horaCierre: 21, activo: true });
    expect(respuesta.body).not.toHaveProperty('creadoEn');
    espacioId = respuesta.body.id;
  });

  it('nombre repetido da 409 DUPLICADO', async () => {
    const respuesta = await crearEspacio(tokenAdmin, { nombre: `Lab prueba ${sufijo}`, edificio, capacidad: 10, tipo: 'salon' });
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('DUPLICADO');
  });

  it('un docente no puede crear espacios (403)', async () => {
    const respuesta = await crearEspacio(tokenDocente, { nombre: `Otro ${sufijo}`, edificio, capacidad: 10, tipo: 'salon' });
    expect(respuesta.status).toBe(403);
  });

  it('apertura mayor o igual que cierre da 400', async () => {
    const respuesta = await crearEspacio(tokenAdmin, {
      nombre: `Horario malo ${sufijo}`, edificio, capacidad: 10, tipo: 'salon', horaApertura: 20, horaCierre: 8,
    });
    expect(respuesta.status).toBe(400);
  });

  it('filtra por edificio y capacidad mínima', async () => {
    await crearEspacio(tokenAdmin, { nombre: `Salon chico ${sufijo}`, edificio, capacidad: 5, tipo: 'salon' });
    const respuesta = await request(app)
      .get(`/api/v1/spaces?edificio=${edificio}&capacidadMinima=10`)
      .set('Authorization', `Bearer ${tokenDocente}`);
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.map((e: { capacidad: number }) => e.capacidad)).toEqual([30]);
  });

  it('PATCH edita el espacio (200)', async () => {
    const respuesta = await request(app)
      .patch(`/api/v1/spaces/${espacioId}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ capacidad: 35 });
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.capacidad).toBe(35);
  });

  it('disponibilidad: 14 bloques libres y fecha inválida da 400', async () => {
    const ok = await request(app)
      .get(`/api/v1/spaces/${espacioId}/availability?date=2030-01-20`)
      .set('Authorization', `Bearer ${tokenDocente}`);
    expect(ok.status).toBe(200);
    expect(ok.body.bloques).toHaveLength(14);

    const mala = await request(app)
      .get(`/api/v1/spaces/${espacioId}/availability?date=2030-02-31`)
      .set('Authorization', `Bearer ${tokenDocente}`);
    expect(mala.status).toBe(400);
  });

  it('DELETE desactiva (204): ya no aparece y su disponibilidad da 404', async () => {
    const borrar = await request(app).delete(`/api/v1/spaces/${espacioId}`).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(borrar.status).toBe(204);

    const lista = await request(app).get(`/api/v1/spaces?edificio=${edificio}`).set('Authorization', `Bearer ${tokenDocente}`);
    expect(lista.body.some((e: { id: number }) => e.id === espacioId)).toBe(false);

    const disp = await request(app)
      .get(`/api/v1/spaces/${espacioId}/availability?date=2030-01-20`)
      .set('Authorization', `Bearer ${tokenDocente}`);
    expect(disp.status).toBe(404);

    const otraVez = await request(app).delete(`/api/v1/spaces/${espacioId}`).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(otraVez.status).toBe(404);
  });
});
