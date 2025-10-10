FROM node:20-alpine

# Устанавливаем только runtime зависимости (без компиляторов)
RUN apk add --no-cache \
    python3 \
    libstdc++

WORKDIR /app

# Копируем все файлы включая уже собранные node_modules с хост-машины
COPY . .

EXPOSE 4001
EXPOSE 40000-40100/udp
EXPOSE 40000-40100/tcp

CMD ["npm", "start"]

