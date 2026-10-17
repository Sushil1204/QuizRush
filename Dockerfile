FROM node:22.14.0-alpine AS build

WORKDIR /app

COPY client/package.json client/package-lock.json ./client/
RUN npm ci --prefix client

COPY client ./client
RUN npm run build --prefix client

FROM nginx:1.27-alpine

COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
