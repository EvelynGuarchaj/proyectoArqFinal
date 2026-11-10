import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, USUARIOS_PRUEBA } from '../ayudantes';

// Pruebas de integración: requieren `pnpm servicios` y la semilla cargada
describe('Flujo de autenticación (integración)', () => {
  const datos = {
    nombre: 'Usuario Flujo',
    correo: `flujo.${Date.now()}@reservalab.edu`,
    contrasena: 'ClaveFlujo1234',
  };

  it('registro → login → refresh → logout → refresh da 401', async () => {
    const registro = await request(app).post('/api/v1/auth/register').send(datos);
    expect(registro.status).toBe(201);
    expect(registro.body).toMatchObject({ correo: datos.correo, nombre: datos.nombre, rol: 'estudiante' });
    expect(registro.body).not.toHaveProperty('hashContrasena');

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: datos.correo, contrasena: datos.contrasena });
    expect(login.status).toBe(200);
    const { tokenAcceso, tokenRefresco } = login.body;
    expect(tokenAcceso).toBeTypeOf('string');
    expect(tokenRefresco).toBeTypeOf('string');

    const refresco = await request(app).post('/api/v1/auth/refresh').send({ tokenRefresco });
    expect(refresco.status).toBe(200);
    expect(refresco.body.tokenAcceso).toBeTypeOf('string');

    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${tokenAcceso}`)
      .send({ tokenRefresco });
    expect(logout.status).toBe(204);

    const refrescoRevocado = await request(app).post('/api/v1/auth/refresh').send({ tokenRefresco });
    expect(refrescoRevocado.status).toBe(401);
    expect(refrescoRevocado.body.error.codigo).toBe('TOKEN_INVALIDO');
  });

  it('registrar el mismo correo dos veces da 409 DUPLICADO', async () => {
    const respuesta = await request(app).post('/api/v1/auth/register').send(datos);

    expect(respuesta.status).toBe(409);
    expect(respuesta.body.error.codigo).toBe('DUPLICADO');
  });

  it('POST /auth/register con datos inválidos da 400 VALIDACION', async () => {
    const respuesta = await request(app)
      .post('/api/v1/auth/register')
      .send({ nombre: 'X', correo: 'no-es-correo', contrasena: '123' });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error.codigo).toBe('VALIDACION');
    expect(respuesta.body.error.detalles).not.toBeNull();
  });

  it('login con contraseña incorrecta da 401 CREDENCIALES_INVALIDAS', async () => {
    const respuesta = await request(app)
      .post('/api/v1/auth/login')
      .send({ correo: USUARIOS_PRUEBA.administrador.correo, contrasena: 'Incorrecta1234' });

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error.codigo).toBe('CREDENCIALES_INVALIDAS');
  });

  it('un endpoint protegido sin token da 401 NO_AUTENTICADO', async () => {
    const respuesta = await request(app).post('/api/v1/auth/logout').send({ tokenRefresco: 'x'.repeat(20) });

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.error.codigo).toBe('NO_AUTENTICADO');
  });
});
