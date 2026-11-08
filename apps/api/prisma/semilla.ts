import { PrismaClient, type Rol, type TipoEspacio } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { ZONA_HORARIA } from '@reservalab/shared';
import { hashSha256 } from '../src/utilidades/hash';

// Semilla idempotente: se puede correr varias veces sin duplicar datos
const prisma = new PrismaClient();

const COSTO_BCRYPT = 10;

const usuarios: { nombre: string; correo: string; contrasena: string; rol: Rol }[] = [
  { nombre: 'Administrador', correo: 'admin@reservalab.edu', contrasena: 'Admin1234', rol: 'administrador' },
  { nombre: 'Docente', correo: 'docente@reservalab.edu', contrasena: 'Docente1234', rol: 'docente' },
  { nombre: 'Estudiante', correo: 'estudiante@reservalab.edu', contrasena: 'Estudiante1234', rol: 'estudiante' },
];

const espacios: { nombre: string; edificio: string; capacidad: number; tipo: TipoEspacio }[] = [
  { nombre: 'Laboratorio 1', edificio: 'A', capacidad: 30, tipo: 'laboratorio' },
  { nombre: 'Laboratorio 2', edificio: 'A', capacidad: 25, tipo: 'laboratorio' },
  { nombre: 'Salon 101', edificio: 'B', capacidad: 40, tipo: 'salon' },
  { nombre: 'Salon 102', edificio: 'B', capacidad: 35, tipo: 'salon' },
];

const LLAVE_DEMO = 'rl_live_pantalla_demo_0123456789abcdef';

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
    update: { nombre: 'Pantalla edificio A', permisos: ['read:now', 'read:spaces'], revocada: false },
    create: {
      nombre: 'Pantalla edificio A',
      prefijo: LLAVE_DEMO.slice(0, 12), // 'rl_live_pant'
      hashLlave,
      permisos: ['read:now', 'read:spaces'],
    },
  });

  // Reserva de prueba: solo si ese horario no está ocupado ya
  const docente = await prisma.usuario.findUniqueOrThrow({ where: { correo: 'docente@reservalab.edu' } });
  const laboratorio1 = await prisma.espacio.findUniqueOrThrow({ where: { nombre: 'Laboratorio 1' } });
  const fecha = fechaManana();
  const inicio = new Date(`${fecha}T08:00:00${ZONA_HORARIA}`);
  const fin = new Date(`${fecha}T10:00:00${ZONA_HORARIA}`);

  const existente = await prisma.reserva.findFirst({
    where: { espacioId: laboratorio1.id, estado: 'confirmada', inicio: { lt: fin }, fin: { gt: inicio } },
  });
  if (!existente) {
    await prisma.reserva.create({
      data: { espacioId: laboratorio1.id, usuarioId: docente.id, inicio, fin, motivo: 'Clase de prueba' },
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
