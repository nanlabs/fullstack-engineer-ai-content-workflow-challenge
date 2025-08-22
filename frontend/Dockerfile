FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=development

# install dependencies
COPY package*.json ./
RUN npm install

# copy source (se sobrescribe por el volumen en docker-compose)
COPY . .

EXPOSE 3000
