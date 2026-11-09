//propiedad de integrante c
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { prisma } from '../../src/config/baseDatos';
import { hashSha256 } from '../../src/utilidades/hash';
import { app, LLAVE_PANTALLA, obtenerToken } from '../ayudantes';

// Requiere PostgreSQL, Redis y la semilla cargada
let tokenAdmin: string;

beforeAll(async () => {
  tokenAdmin = await obtenerToken('administrador');
});

// Crear una llave de prueba
function crearLlave(
  permisos: string[],
  limitePorMinuto = 60
) {
  return request(app)
    .post('/api/v1/api-keys')
    .set('Authorization', `Bearer ${tokenAdmin}`)
    .send({
      nombre: `Llave prueba ${Date.now()}`,
      permisos,
      limitePorMinuto,
    });
}

describe('RF-12 /api-keys', () => {

  it('sin token responde 401', async () => {
    const respuesta = await request(app)
      .get('/api/v1/api-keys');

    expect(respuesta.status).toBe(401);
  });

  it('un docente no puede crear llaves (403)', async () => {
    const tokenDocente = await obtenerToken('docente');

    const respuesta = await request(app)
      .post('/api/v1/api-keys')
      .set('Authorization', `Bearer ${tokenDocente}`)
      .send({
        nombre: 'No deberia',
        permisos: ['read:now'],
      });

    expect(respuesta.status).toBe(403);
  });

  it('permiso inexistente responde 400 VALIDACION', async () => {
    const respuesta = await crearLlave(['write:todo']);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('VALIDACION');
  });

  it('crea la llave, guarda su hash y la lista sin hash', async () => {
    const respuesta = await crearLlave(['read:now']);

    expect(respuesta.status).toBe(201);

    expect(respuesta.body.llave).toMatch(
      /^rl_live_[0-9a-f]{48}$/
    );

    expect(respuesta.body.prefijo).toBe(
      respuesta.body.llave.slice(0, 12)
    );

    // Comprobar el valor almacenado en PostgreSQL
    const enBd = await prisma.llaveApi.findUnique({
      where: {
        id: respuesta.body.id,
      },
    });

    expect(enBd?.hashLlave).toBe(
      hashSha256(respuesta.body.llave)
    );

    expect(enBd?.hashLlave).not.toBe(
      respuesta.body.llave
    );

    // Consultar el listado público
    const lista = await request(app)
      .get('/api/v1/api-keys')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(lista.status).toBe(200);

    const encontrada = lista.body.find(
      (llave: { id: number }) =>
        llave.id === respuesta.body.id
    );

    expect(encontrada).toBeDefined();
    expect(encontrada).not.toHaveProperty('llave');
    expect(encontrada).not.toHaveProperty('hashLlave');
  });

  it('crear llave, usarla, revocarla y obtener 401', async () => {
    const creada = await crearLlave(['read:now']);

    expect(creada.status).toBe(201);

    const llave: string = creada.body.llave;

    // La llave recién creada debe funcionar
    const uso = await request(app)
      .get('/api/v1/now')
      .set('X-API-Key', llave);

    expect(uso.status).toBe(200);

    // Revocar la llave
    const revocada = await request(app)
      .delete(`/api/v1/api-keys/${creada.body.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(revocada.status).toBe(200);
    expect(revocada.body.revocada).toBe(true);

    // La llave revocada ya no debe funcionar
    const despues = await request(app)
      .get('/api/v1/now')
      .set('X-API-Key', llave);

    expect(despues.status).toBe(401);

    expect(despues.body.error.codigo).toBe(
      'LLAVE_INVALIDA'
    );
  });

  it('revocar una llave inexistente responde 404', async () => {
    const respuesta = await request(app)
      .delete('/api/v1/api-keys/999999')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(respuesta.status).toBe(404);
  });

  it('GET /spaces sin read:spaces responde 403', async () => {
    const creada = await crearLlave(['read:now']);

    expect(creada.status).toBe(201);

    const respuesta = await request(app)
      .get('/api/v1/spaces')
      .set('X-API-Key', creada.body.llave);

    expect(respuesta.status).toBe(403);

    expect(respuesta.body.error.codigo).toBe(
      'PERMISO_INSUFICIENTE'
    );
  });

  it('GET /spaces con llave demo responde 200', async () => {
    const respuesta = await request(app)
      .get('/api/v1/spaces')
      .set('X-API-Key', LLAVE_PANTALLA);

    expect(respuesta.status).toBe(200);
  });

  it('superar el límite por minuto responde 429', async () => {
    const creada = await crearLlave(['read:now'], 2);

    expect(creada.status).toBe(201);

    const llave: string = creada.body.llave;

    const primera = await request(app)
      .get('/api/v1/now')
      .set('X-API-Key', llave);

    const segunda = await request(app)
      .get('/api/v1/now')
      .set('X-API-Key', llave);

    const tercera = await request(app)
      .get('/api/v1/now')
      .set('X-API-Key', llave);

    expect([
      primera.status,
      segunda.status,
    ]).toEqual([200, 200]);

    expect(tercera.status).toBe(429);

    expect(tercera.body.error.codigo).toBe(
      'LIMITE_EXCEDIDO'
    );
  });

});
