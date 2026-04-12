FROM node:20-alpine

WORKDIR /app

# Install build tools for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

# All dependencies (including dev for prisma generate)
COPY package.json package-lock.json ./
RUN npm ci

# Prisma generate
COPY prisma ./prisma
RUN npx prisma generate

# Remove dev dependencies after prisma generate
RUN npm prune --omit=dev

# Clean build tools
RUN apk del python3 make g++

# Source
COPY src ./src

# Uploads directory
RUN mkdir -p uploads

EXPOSE 8080

CMD ["node", "src/server.js"]
