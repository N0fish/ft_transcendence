# Stage 1: Build Prisma Client on your local machine
FROM node:20-bullseye AS build
WORKDIR /app

COPY package*.json ./
RUN rm -rf /app/node_modules/
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

# Stage 2: The final Docker image
FROM node:20-bullseye
WORKDIR /app

COPY package*.json ./
RUN rm -rf /app/node_modules/
RUN npm install --omit=dev

COPY . .
RUN npx prisma generate

COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/node_modules/@prisma /app/node_modules/@prisma

COPY .env .env

RUN mkdir -p /app/prisma/data

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

EXPOSE 3004
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "start"]