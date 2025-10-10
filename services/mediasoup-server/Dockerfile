FROM node:20-alpine

# Install dependencies for MediaSoup (включая pip)
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    gcc \
    linux-headers

WORKDIR /app

COPY package*.json ./
COPY package-lock.json ./

# Установка с прогрессом и использованием prebuilt binaries где возможно
RUN npm install --omit=dev --prefer-offline --no-audit --progress=true

COPY . .

EXPOSE 4001
EXPOSE 40000-40100/udp
EXPOSE 40000-40100/tcp

CMD ["npm", "start"]

