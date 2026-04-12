FROM node:20-alpine

WORKDIR /app

# Dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Prisma
COPY prisma ./prisma
RUN npx prisma generate

# Source
COPY src ./src

# Uploads directory
RUN mkdir -p uploads

# Demo study template
COPY src/lib/demoStudyTemplate.json ./src/lib/

EXPOSE 3002

CMD ["node", "src/server.js"]
