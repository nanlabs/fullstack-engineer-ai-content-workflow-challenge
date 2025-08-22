FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=development

# Keep base packages patched; install psql client for pg_isready
RUN apk update && apk upgrade --no-cache && apk add --no-cache postgresql16-client

# Install deps as root (avoids EACCES with bind mounts)
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Copy the rest
COPY . .

EXPOSE 3001
