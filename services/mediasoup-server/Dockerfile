FROM node:20-alpine

# Install build + runtime dependencies for MediaSoup
RUN apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    gcc \
    linux-headers \
    libstdc++

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies (mediasoup будет скомпилирован)
RUN npm install

# Copy application code
COPY . .

EXPOSE 4001
EXPOSE 40000-40100/udp
EXPOSE 40000-40100/tcp

CMD ["npm", "start"]

