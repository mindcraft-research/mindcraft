FROM node:25-bookworm-slim AS builder

WORKDIR /app

# Build tools for native modules (bcrypt, sharp)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

# ── Production image (same base = same OpenSSL) ──
FROM node:25-bookworm-slim

WORKDIR /app

# OpenSSL libs required by Prisma query engine at runtime
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma
COPY src ./src
RUN mkdir -p uploads

EXPOSE 8080

CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss 2>&1 || true && node src/server.js"]
