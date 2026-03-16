FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
FROM node:20-alpine

WORKDIR /app

# Placeholder frontend Dockerfile.
# Replace with your frontend app build/run commands.
CMD ["sh", "-c", "echo 'Frontend scaffold ready' && sleep infinity"]
