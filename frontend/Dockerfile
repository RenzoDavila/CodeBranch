FROM node:22-alpine

WORKDIR /app

ENV NG_CLI_ANALYTICS=false
ENV NODE_OPTIONS=--max-old-space-size=2048

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 4200

CMD ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "4200"]
