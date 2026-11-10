import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../ayudantes';

// Pruebas de integración: requieren `pnpm servicios` levantado
describe('GET /api/v1/health', () => {
  it('responde 200 con todos los servicios en ok', async () => {
    const respuesta = await request(app).get('/api/v1/health');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ estado: 'ok', api: 'ok', baseDatos: 'ok', cache: 'ok' });
  });
});

describe('Ruta inexistente', () => {
  it('responde 404 NO_ENCONTRADO', async () => {
    const respuesta = await request(app).get('/api/v1/no-existe');

    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error.codigo).toBe('NO_ENCONTRADO');
  });
});
