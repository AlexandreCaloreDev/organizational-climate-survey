### Multi-stage Dockerfile para Next.js (produção)
FROM node:20-alpine AS builder
WORKDIR /app

# Habilita corepack para pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copia manifests e instala dependências
COPY package.json pnpm-lock.yaml .npmrc* ./
RUN pnpm install --no-frozen-lockfile

# Copia o restante do código e build
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copia artefatos de build
COPY --from=builder /app/.next .next
COPY --from=builder /app/public public
COPY --from=builder /app/package.json package.json

# Instala apenas dependências de produção
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm install --prod --no-frozen-lockfile

EXPOSE 3000

CMD ["pnpm", "start"]
