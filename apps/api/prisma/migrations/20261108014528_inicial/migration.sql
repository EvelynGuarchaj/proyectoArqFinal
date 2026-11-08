-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('administrador', 'docente', 'estudiante');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('confirmada', 'cancelada');

-- CreateEnum
CREATE TYPE "TipoEspacio" AS ENUM ('laboratorio', 'salon');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "hashContrasena" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'estudiante',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_refresco" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "hashToken" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "revocado" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_refresco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "espacios" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "edificio" TEXT NOT NULL,
    "capacidad" INTEGER NOT NULL,
    "tipo" "TipoEspacio" NOT NULL,
    "horaApertura" INTEGER NOT NULL DEFAULT 7,
    "horaCierre" INTEGER NOT NULL DEFAULT 21,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "espacios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservas" (
    "id" SERIAL NOT NULL,
    "espacioId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fin" TIMESTAMPTZ(3) NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'confirmada',
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llaves_api" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "prefijo" TEXT NOT NULL,
    "hashLlave" TEXT NOT NULL,
    "permisos" TEXT[],
    "limitePorMinuto" INTEGER NOT NULL DEFAULT 60,
    "ultimoUso" TIMESTAMP(3),
    "revocada" BOOLEAN NOT NULL DEFAULT false,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llaves_api_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_refresco_hashToken_key" ON "tokens_refresco"("hashToken");

-- CreateIndex
CREATE UNIQUE INDEX "espacios_nombre_key" ON "espacios"("nombre");

-- CreateIndex
CREATE INDEX "reservas_espacioId_inicio_idx" ON "reservas"("espacioId", "inicio");

-- CreateIndex
CREATE UNIQUE INDEX "llaves_api_hashLlave_key" ON "llaves_api"("hashLlave");

-- AddForeignKey
ALTER TABLE "tokens_refresco" ADD CONSTRAINT "tokens_refresco_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_espacioId_fkey" FOREIGN KEY ("espacioId") REFERENCES "espacios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservas" ADD CONSTRAINT "reservas_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- SQL extra (contrato, sección 3.6)
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "reservas" ADD CONSTRAINT "reservas_fin_mayor_inicio" CHECK ("fin" > "inicio");

ALTER TABLE "reservas" ADD CONSTRAINT "reservas_sin_traslape"
  EXCLUDE USING gist ("espacioId" WITH =, tstzrange("inicio", "fin", '[)') WITH &&)
  WHERE ("estado" = 'confirmada');
