import { PrismaClient, type Rol, type TipoEspacio } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ZONA_HORARIA } from '@reservalab/shared';
import { hashSha256 } from '../src/utilidades/hash';

// Semilla idempotente: se puede correr varias veces sin duplicar datos
const prisma = new PrismaClient();

const COSTO_BCRYPT = 10;

const usuarios: { nombre: string; correo: string; contrasena: string; rol: Rol }[] = [
  { nombre: 'Angela', correo: 'angela@reservalab.edu', contrasena: 'Admin1234', rol: 'administrador' },
  { nombre: 'Yaniz', correo: 'yaniz@reservalab.edu', contrasena: 'Docente1234', rol: 'docente' },
  { nombre: 'Ana', correo: 'ana@reservalab.edu', contrasena: 'Estudiante1234', rol: 'estudiante' },
];

const espacios: { nombre: string; edificio: string; capacidad: number; tipo: TipoEspacio }[] = [
  // Los 9 laboratorios del edificio D
  { nombre: 'Laboratorio de Electrónica', edificio: 'D', capacidad: 25, tipo: 'laboratorio' },
  { nombre: 'Laboratorio de Telecomunicaciones', edificio: 'D', capacidad: 25, tipo: 'laboratorio' },
  { nombre: 'Laboratorio de Electricidad', edificio: 'D', capacidad: 25, tipo: 'laboratorio' },
  { nombre: 'Laboratorio de Física', edificio: 'D', capacidad: 30, tipo: 'laboratorio' },
  { nombre: 'Laboratorio de Civil', edificio: 'D', capacidad: 30, tipo: 'laboratorio' },
  { nombre: 'Laboratorio de Computación 1', edificio: 'D', capacidad: 30, tipo: 'laboratorio' },
  { nombre: 'Laboratorio de Computación 2', edificio: 'D', capacidad: 30, tipo: 'laboratorio' },
  { nombre: 'Laboratorio de Computación 3', edificio: 'D', capacidad: 30, tipo: 'laboratorio' },
  { nombre: 'Laboratorio de Dibujo', edificio: 'D', capacidad: 35, tipo: 'laboratorio' },
];

const LLAVE_DEMO = 'rl_live_pantalla_demo_0123456789abcdef';
const NOMBRE_LLAVE_DEMO = 'Pantalla edificio D';

// Fecha de mañana (AAAA-MM-DD) según la hora de Guatemala
function fechaManana(): string {
  const ahoraGuatemala = new Date(Date.now() - 6 * 60 * 60 * 1000);
  ahoraGuatemala.setUTCDate(ahoraGuatemala.getUTCDate() + 1);
  return ahoraGuatemala.toISOString().slice(0, 10);
}

async function main() {
  for (const u of usuarios) {
    const hashContrasena = await bcrypt.hash(u.contrasena, COSTO_BCRYPT);
    await prisma.usuario.upsert({
      where: { correo: u.correo },
      update: { nombre: u.nombre, hashContrasena, rol: u.rol },
      create: { nombre: u.nombre, correo: u.correo, hashContrasena, rol: u.rol },
    });
  }

  for (const e of espacios) {
    await prisma.espacio.upsert({
      where: { nombre: e.nombre },
      update: { ...e, horaApertura: 7, horaCierre: 21, activo: true },
      create: { ...e, horaApertura: 7, horaCierre: 21 },
    });
  }

  const hashLlave = hashSha256(LLAVE_DEMO);
  await prisma.llaveApi.upsert({
    where: { hashLlave },
    update: { nombre: NOMBRE_LLAVE_DEMO, permisos: ['read:now', 'read:spaces'], revocada: false },
    create: {
      nombre: NOMBRE_LLAVE_DEMO,
      prefijo: LLAVE_DEMO.slice(0, 12), // 'rl_live_pant'
      hashLlave,
      permisos: ['read:now', 'read:spaces'],
    },
  });

  // Reserva de prueba: solo si ese horario no está ocupado ya
  const docente = await prisma.usuario.findUniqueOrThrow({ where: { correo: 'yaniz@reservalab.edu' } });
  const laboratorio = await prisma.espacio.findUniqueOrThrow({ where: { nombre: 'Laboratorio de Computación 1' } });
  const fecha = fechaManana();
  const inicio = new Date(`${fecha}T08:00:00${ZONA_HORARIA}`);
  const fin = new Date(`${fecha}T10:00:00${ZONA_HORARIA}`);

  const existente = await prisma.reserva.findFirst({
    where: { espacioId: laboratorio.id, estado: 'confirmada', inicio: { lt: fin }, fin: { gt: inicio } },
  });
  if (!existente) {
    await prisma.reserva.create({
      data: { espacioId: laboratorio.id, usuarioId: docente.id, inicio, fin, motivo: 'Clase de prueba' },
    });
  }

  console.log('Semilla cargada');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
