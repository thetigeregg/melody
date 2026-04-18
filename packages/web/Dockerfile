# Node image tracks root .nvmrc (24.14.x)
FROM node:24.14-alpine AS build
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages ./packages

RUN npm install
RUN npm run build -w @melody/web

FROM nginx:1.27-alpine

COPY --from=build /app/packages/web/dist/web/browser /usr/share/nginx/html

