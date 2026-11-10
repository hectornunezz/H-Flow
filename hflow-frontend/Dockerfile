FROM node:20-alpine AS dependencies

WORKDIR /app
COPY hflow-frontend/package.json hflow-frontend/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL=/api
ARG BACKEND_INTERNAL_URL=http://hflow-backend:3000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    BACKEND_INTERNAL_URL=${BACKEND_INTERNAL_URL}

COPY --from=dependencies /app/node_modules ./node_modules
COPY hflow-frontend/ ./
RUN mkdir -p public \
    && npm run build \
    && test -s .next/standalone/server.js \
    && test -d .next/static

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3001

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001

CMD ["node", "server.js"]
