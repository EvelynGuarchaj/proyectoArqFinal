import request from 'supertest';
import { crearApp } from '../src/app';

export const app = crearApp();

// Usuarios de la semilla (sección 3.10)
export const USUARIOS_PRUEBA = {
  administrador: { correo: 'admin@reservalab.edu', contrasena: 'Admin1234' },
  docente: { correo: 'docente@reservalab.edu', contrasena: 'Docente1234' },
  estudiante: { correo: 'estudiante@reservalab.edu', contrasena: 'Estudiante1234' },
};

export const LLAVE_PANTALLA = 'rl_live_pantalla_demo_0123456789abcdef';

export async function obtenerToken(rol: 'administrador' | 'docente' | 'estudiante'): Promise<string> {
  const respuesta = await request(app).post('/api/v1/auth/login').send(USUARIOS_PRUEBA[rol]);
  return respuesta.body.tokenAcceso;
}
