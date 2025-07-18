# Stage 1: Build dependencies
FROM node:20-bullseye AS build

WORKDIR /app
COPY package.json yarn.lock ./

RUN yarn install

# Stage 2: Final image
FROM node:20-bullseye

WORKDIR /app

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/
COPY --from=build /app/yarn.lock /app/

COPY . .
COPY .env .env

RUN mkdir -p /app/logs

EXPOSE 5173

CMD ["yarn", "dev"]