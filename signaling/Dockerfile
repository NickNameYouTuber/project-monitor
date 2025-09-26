FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY signaling-server.js ./
ENV PORT=7673
ENV SIGNALING_PATH=/ws/signaling
EXPOSE 7673
CMD ["node", "signaling-server.js"]


