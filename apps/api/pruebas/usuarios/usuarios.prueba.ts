import { randomUUID } from 'node:crypto';
import { afterAll, expect, it } from 'vitest';
import request from 'supertest';
import { app, obtenerToken } from '../ayudantes';
import { prisma } from '../../src/config/baseDatos';

const idPrueba = randomUUID();
const correo = `usuarios-${idPrueba}@reservalab.edu`;
const correoEditado = `editado-${idPrueba}@reservalab.edu`;
const contrasena = 'PruebaUsuario123';
const ruta = '/api/v1/users';

afterAll(async () => {
  await prisma.usuario.deleteMany({ where: { correo: { in: [correo, correoEditado] } } });
  await prisma.$disconnect();
});

it('solo el administrador puede gestionar usuarios y desactivar una cuenta invalida sus sesiones', async () => {
  const admin = `Bearer ${await obtenerToken('administrador')}`;
  const estudiante = `Bearer ${await obtenerToken('estudiante')}`;
  const alta = { nombre: 'Cuenta de prueba', correo, contrasena, rol: 'docente' };

  await request(app).get(ruta).set('Authorization', estudiante).expect(403);
  await request(app).post(ruta).set('Authorization', estudiante).send(alta).expect(403);
  const creada = await request(app).post(ruta).set('Authorization', admin).send(alta).expect(201);
  const usuarioRuta = `${ruta}/${creada.body.id}`;
  expect(creada.body).toEqual({ id: expect.any(Number), nombre: alta.nombre, correo, rol: 'docente', activo: true });
  await request(app).post(ruta).set('Authorization', admin).send(alta).expect(409);
  await request(app).patch(usuarioRuta).set('Authorization', estudiante).send({ rol: 'administrador' }).expect(403);
  await request(app).delete(usuarioRuta).set('Authorization', estudiante).expect(403);

  const sesion = await request(app).post('/api/v1/auth/login').send({ correo, contrasena }).expect(200);
  const token = `Bearer ${sesion.body.tokenAcceso}`;
  const editada = await request(app).patch(usuarioRuta).set('Authorization', admin)
    .send({ correo: correoEditado, rol: 'estudiante' }).expect(200);
  expect(editada.body).toMatchObject({ correo: correoEditado, rol: 'estudiante' });
  await request(app).delete('/api/v1/reservations/1').set('Authorization', token).expect(403);

  await request(app).delete(usuarioRuta).set('Authorization', admin).expect(204);
  const listado = await request(app).get(ruta).set('Authorization', admin).expect(200);
  expect(listado.body).toContainEqual({ ...editada.body, activo: false });
  await request(app).get('/api/v1/reservations/me').set('Authorization', token).expect(401);
  await request(app).post('/api/v1/auth/refresh').send({ tokenRefresco: sesion.body.tokenRefresco }).expect(401);
  await request(app).post('/api/v1/auth/login').send({ correo: correoEditado, contrasena }).expect(401);
});
