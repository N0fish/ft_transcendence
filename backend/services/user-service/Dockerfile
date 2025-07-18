# Stage 1: Build Stage
FROM node:20-bullseye AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma ./prisma/
COPY .env .env

RUN mkdir -p /app/prisma/data && \
  npx prisma generate

# Stage 2: Final Stage
FROM node:20-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/node_modules/@prisma /app/node_modules/@prisma

RUN mkdir -p /app/uploads /app/prisma/data

COPY .env .env

EXPOSE 3002

RUN printf '#!/bin/sh\n\
  set -e\n\
  if [ ! -f "$DATABASE_PATH" ]; then\n\
    echo "Running initial migration..."\n\
    npx prisma migrate deploy --schema=prisma/schema.prisma\n \
    npx prisma migrate dev --name init\n\
  fi\n\
  npx prisma generate\n\
  exec "$@"' > /docker-entrypoint.sh && \
  chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "start"]