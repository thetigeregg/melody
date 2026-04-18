# Node image tracks root .nvmrc (24.14.x)
FROM node:24.14-alpine AS build
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages ./packages

RUN npm install
RUN npm run build

FROM node:24.14-alpine
WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages

CMD ["node", "packages/api/dist/index.js"]

