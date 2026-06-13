FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY server.ts tsconfig.json ./

EXPOSE 3000
CMD ["node", "--loader", "ts-node/esm", "server.ts"]
