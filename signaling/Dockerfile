FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
# Нет lock-файла в репозитории — ставим прод-зависимости обычным install
RUN npm install --omit=dev --no-audit --no-fund
COPY server.js ./
EXPOSE 7673
ENV PORT=7673
CMD ["node", "server.js"]


