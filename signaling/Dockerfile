# syntax=docker/dockerfile:1
FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY server.js ./

ENV NODE_ENV=production
ENV PORT=7673
EXPOSE 7673

CMD ["node", "server.js"]
