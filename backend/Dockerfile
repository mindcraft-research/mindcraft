FROM node:20-slim AS builder

WORKDIR /app

# Build tools for native modules (bcrypt, sharp)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

# ── Production image ──
FROM node:20-slim

WORKDIR /app

# Runtime libs needed by bcrypt/sharp native binaries
RUN apt-get update && \
    apt-get install -y --no-install-recommends libstdc++6 && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
RUN mkdir -p uploads

EXPOSE 8080

CMD ["node", "src/server.js"]
