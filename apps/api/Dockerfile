FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/
RUN npm install

COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

WORKDIR /app/apps/api
EXPOSE 3000
CMD ["node", "--max-old-space-size=256", "dist/main"]
