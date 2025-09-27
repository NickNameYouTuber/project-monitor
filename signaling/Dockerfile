FROM node:20-alpine
WORKDIR /app
COPY server.js ./
RUN npm init -y && npm install express socket.io cors
EXPOSE 7673
CMD ["node", "server.js"]


