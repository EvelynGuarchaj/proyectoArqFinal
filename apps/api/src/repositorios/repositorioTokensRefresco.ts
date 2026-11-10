import { prisma } from '../config/baseDatos';

interface DatosNuevoToken {
  usuarioId: number;
  hashToken: string;
  expiraEn: Date;
}

export function crear(datos: DatosNuevoToken) {
  return prisma.tokenRefresco.create({ data: datos });
}

// Incluye al usuario para poder firmar un nuevo token de acceso con su rol actual
export function buscarPorHash(hashToken: string) {
  return prisma.tokenRefresco.findUnique({
    where: { hashToken },
    include: { usuario: true },
  });
}

export function revocar(id: number) {
  return prisma.tokenRefresco.update({ where: { id }, data: { revocado: true } });
}
