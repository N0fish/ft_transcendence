# Stage 1: Build dependencies
FROM node:20-bullseye AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# Stage 2: Final image
FROM node:20-bullseye

WORKDIR /app

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package*.json /app/

COPY . .
COPY .env .env

RUN mkdir -p /app/logs

EXPOSE 3003

CMD ["node", "src/server.js"]