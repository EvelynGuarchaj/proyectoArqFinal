// DUEÑA: B — La base de datos rechaza el traslape aunque la validación del servicio no se ejecute
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/config/baseDatos';
import * as repositorioEspacios from '../../src/repositorios/repositorioEspacios';
import * as repositorioReservas from '../../src/repositorios/repositorioReservas';
import { USUARIOS_PRUEBA } from '../ayudantes';

let espacioId: number;
let usuarioId: number;

beforeAll(async () => {
  const docente = await prisma.usuario.findUniqueOrThrow({ where: { correo: USUARIOS_PRUEBA.docente.correo } });
  usuarioId = docente.id;
  const espacio = await repositorioEspacios.crear({
    nombre: `Lab prueba restriccion ${Date.now()}`, edificio: 'Z', capacidad: 10, tipo: 'laboratorio', horaApertura: 7, horaCierre: 21,
  });
  espacioId = espacio.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

const nueva = (inicio: string, fin: string) => ({
  espacioId, usuarioId, motivo: 'Prueba BD',
  inicio: new Date(`2030-01-17T${inicio}:00-06:00`),
  fin: new Date(`2030-01-17T${fin}:00-06:00`),
});

describe('Restricción reservas_sin_traslape (PostgreSQL)', () => {
  it('la segunda inserción traslapada se convierte en ErrorAplicacion 409 TRASLAPE', async () => {
    await repositorioReservas.crear(nueva('08:00', '10:00'));
    await expect(repositorioReservas.crear(nueva('09:00', '11:00'))).rejects.toMatchObject({
      estado: 409,
      codigo: 'TRASLAPE',
    });
  });

  it('permite reservas contiguas (10–11)', async () => {
    await expect(repositorioReservas.crear(nueva('10:00', '11:00'))).resolves.toMatchObject({ estado: 'confirmada' });
  });

  it('permite reusar un horario cancelado', async () => {
    const reserva = await repositorioReservas.crear(nueva('12:00', '13:00'));
    await repositorioReservas.cancelar(reserva.id);
    await expect(repositorioReservas.crear(nueva('12:00', '13:00'))).resolves.toMatchObject({ estado: 'confirmada' });
  });

  it('existeTraslape detecta el choque y no las contiguas', async () => {
    expect(await repositorioReservas.existeTraslape(espacioId, nueva('09:30', '09:45').inicio, nueva('09:30', '09:45').fin)).toBe(true);
    expect(await repositorioReservas.existeTraslape(espacioId, nueva('11:00', '12:00').inicio, nueva('11:00', '12:00').fin)).toBe(false);
  });
});
