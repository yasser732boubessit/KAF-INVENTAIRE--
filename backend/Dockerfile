# Multi-stage Dockerfile for NestJS Backend
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy application source & prisma
COPY tsconfig.json ./
COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

# Build production bundle
RUN npm run build

# =========================================================
# Production runtime stage
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
RUN npm install --only=production

RUN npm install tsx typescript prisma

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]