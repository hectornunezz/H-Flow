FROM node:20-bookworm-slim AS build

WORKDIR /app/hflow-backend

COPY hflow-backend/package.json hflow-backend/package-lock.json ./
COPY hflow-backend/prisma ./prisma
RUN npm ci

COPY hflow-backend/tsconfig.json ./
COPY hflow-backend/src ./src
RUN npx prisma generate && npm run build

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    HOME=/home/node

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      fonts-liberation \
      libasound2 \
      libatk-bridge2.0-0 \
      libatk1.0-0 \
      libatspi2.0-0 \
      libcairo2 \
      libcups2 \
      libdbus-1-3 \
      libdrm2 \
      libgbm1 \
      libglib2.0-0 \
      libgtk-3-0 \
      libnspr4 \
      libnss3 \
      libpango-1.0-0 \
      libx11-6 \
      libx11-xcb1 \
      libxcb1 \
      libxcomposite1 \
      libxdamage1 \
      libxext6 \
      libxfixes3 \
      libxkbcommon0 \
      libxrandr2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/hflow-backend

COPY hflow-backend/package.json hflow-backend/package-lock.json ./
COPY hflow-backend/prisma ./prisma
RUN npm ci --omit=dev

COPY --from=build /app/hflow-backend/dist ./dist
COPY src/remotion /app/hflow-backend/src/remotion
RUN mkdir -p logs uploads storage/marketing/videos /app/video-generador/public/audio \
    && chown -R node:node /app/hflow-backend /app/video-generador /home/node

USER node
RUN npm exec remotion -- browser ensure

EXPOSE 3000

CMD ["sh", "-c", "npm run prisma:migrate:deploy && exec npm start"]
