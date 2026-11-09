import { prisma } from '../config/baseDatos';

// Buscar una llave por su hash
export async function buscarPorHash(hashLlave: string) {
  return prisma.llaveApi.findUnique({
    where: { hashLlave }
  });
}

// Buscar una llave por ID
export async function buscarPorId(id: number) {
  return prisma.llaveApi.findUnique({
    where: { id }
  });
}

// Listar todas las llaves API
export async function listar() {
  return prisma.llaveApi.findMany({
    orderBy: { creadaEn: 'desc' }
  });
}

// Crear una nueva llave API
export async function crear(datos: {
  nombre: string;
  prefijo: string;
  hashLlave: string;
  permisos: string[];
  limitePorMinuto: number;
}) {
  return prisma.llaveApi.create({
    data: datos
  });
}

// Revocar una llave sin eliminarla de la BD
export async function revocar(id: number) {
  return prisma.llaveApi.update({
    where: { id },
    data: { revocada: true }
  });
}

// Actualizar la fecha del último uso
export async function actualizarUltimoUso(id: number) {
  return prisma.llaveApi.update({
    where: { id },
    data: { ultimoUso: new Date() }
  });
}
