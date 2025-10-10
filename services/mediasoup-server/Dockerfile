FROM node:20-alpine

# Install runtime dependencies for MediaSoup
RUN apk add --no-cache \
    python3 \
    libstdc++

WORKDIR /app

# Копируем все файлы (включая уже собранные node_modules)
COPY . .

EXPOSE 4001
EXPOSE 40000-40100/udp
EXPOSE 40000-40100/tcp

CMD ["npm", "start"]

