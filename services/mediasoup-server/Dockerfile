FROM node:20-alpine

# Install dependencies for MediaSoup
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    linux-headers

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 4001
EXPOSE 40000-40100/udp
EXPOSE 40000-40100/tcp

CMD ["npm", "start"]

