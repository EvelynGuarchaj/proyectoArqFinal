# Contexto de construcción: raíz del repositorio
FROM node:20-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm i -g corepack@latest && corepack enable

WORKDIR /app
COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter api exec prisma generate

EXPOSE 3000

# Al arrancar: aplicar migraciones, cargar la semilla y levantar la API
CMD ["sh", "-c", "pnpm --filter api exec prisma migrate deploy && pnpm --filter api exec prisma db seed -- --si-vacia && pnpm --filter api start"]
