FROM node:26-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY angular.json tsconfig.json tsconfig.app.json ./
COPY src ./src
COPY public ./public

RUN npm install
RUN npm run build -- --configuration production

FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/iptv-store/. /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
