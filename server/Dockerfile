FROM node:22.14.0-alpine

WORKDIR /app/server

COPY server/package.json server/package-lock.json ./
RUN npm ci

COPY server ./
RUN npm run build

EXPOSE 3001
CMD ["npm", "start"]
