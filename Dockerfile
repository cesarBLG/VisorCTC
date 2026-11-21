FROM docker.io/node:alpine
RUN apk add --no-cache git
WORKDIR /app
COPY . .
RUN npm install
WORKDIR /app/client
RUN npm install
RUN npm run build
WORKDIR /app

CMD ["node", "server.js"]
