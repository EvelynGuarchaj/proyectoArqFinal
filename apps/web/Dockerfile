# Contexto de construcción: raíz del repositorio
FROM node:20-slim

RUN npm i -g corepack@latest && corepack enable

WORKDIR /app
COPY . .

RUN pnpm install --frozen-lockfile

EXPOSE 5173

CMD ["pnpm", "--filter", "web", "dev"]
