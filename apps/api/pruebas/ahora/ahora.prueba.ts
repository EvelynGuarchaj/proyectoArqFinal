//propiedad de integrante c
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import {
  app,
  LLAVE_PANTALLA,
  obtenerToken,
} from '../ayudantes';

// Requiere PostgreSQL, Redis y la semilla cargada
describe('RF-11 GET /now', () => {

  it('sin X-API-Key responde 401 LLAVE_INVALIDA', async () => {
    const respuesta = await request(app)
      .get('/api/v1/now');

    expect(respuesta.status).toBe(401);

    expect(respuesta.body.error.codigo).toBe(
      'LLAVE_INVALIDA'
    );
  });

  it('con una llave falsa responde 401', async () => {
    const respuesta = await request(app)
      .get('/api/v1/now')
      .set('X-API-Key', 'rl_live_falsa_000000000000');

    expect(respuesta.status).toBe(401);
  });

  it('con llave demo responde 200 y devuelve la ocupación', async () => {
    const respuesta = await request(app)
      .get('/api/v1/now')
      .set('X-API-Key', LLAVE_PANTALLA);

    expect(respuesta.status).toBe(200);

    expect(respuesta.headers['x-cache']).toMatch(
      /^(HIT|MISS)$/
    );

    expect(typeof respuesta.body.generadoEn).toBe(
      'string'
    );

    expect(Array.isArray(respuesta.body.edificios)).toBe(
      true
    );

    const edificioA = respuesta.body.edificios.find(
      (edificio: { edificio: string }) =>
        edificio.edificio === 'A'
    );

    expect(edificioA).toBeDefined();

    expect(edificioA.espacios[0]).toHaveProperty(
      'ocupado'
    );

    expect(edificioA.espacios[0]).toHaveProperty(
      'reservaActual'
    );
  });

  it('la segunda consulta utiliza la caché', async () => {
    await request(app)
      .get('/api/v1/now')
      .set('X-API-Key', LLAVE_PANTALLA);

    const respuesta = await request(app)
      .get('/api/v1/now')
      .set('X-API-Key', LLAVE_PANTALLA);

    expect(respuesta.headers['x-cache']).toBe('HIT');
  });

  it('un JWT no sirve para /now', async () => {
    const token = await obtenerToken('administrador');

    const respuesta = await request(app)
      .get('/api/v1/now')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(401);
  });

});
