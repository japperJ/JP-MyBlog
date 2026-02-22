# Multi-stage production Dockerfile for Next.js
FROM node:20-alpine AS deps
WORKDIR /app

# Install OpenSSL (required for Prisma)
RUN apk add --no-cache openssl

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install OpenSSL (required for Prisma)
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

# Install OpenSSL (required for Prisma)
RUN apk add --no-cache openssl

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create uploads directory
RUN mkdir -p ./public/uploads && chown -R nextjs:nodejs ./public/uploads

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
