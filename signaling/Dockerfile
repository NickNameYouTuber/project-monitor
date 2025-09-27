FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm ci --omit=dev
COPY server.js ./
EXPOSE 7673
ENV PORT=7673
CMD ["node", "server.js"]


