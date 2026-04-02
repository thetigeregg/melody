FROM node:22-alpine AS build
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages ./packages

RUN npm install
RUN npm run build

FROM node:22-alpine
WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages

CMD ["node", "packages/api/dist/index.js"]

