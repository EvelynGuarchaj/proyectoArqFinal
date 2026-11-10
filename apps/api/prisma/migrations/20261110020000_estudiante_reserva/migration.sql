ALTER TABLE "reservas" ADD COLUMN "estudianteId" INTEGER;

CREATE INDEX "reservas_estudianteId_idx" ON "reservas"("estudianteId");

ALTER TABLE "reservas" ADD CONSTRAINT "reservas_estudianteId_fkey"
  FOREIGN KEY ("estudianteId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
