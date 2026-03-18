FROM node:22-alpine

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./ 

RUN npm install

COPY frontend ./frontend

WORKDIR /app/frontend

ENV VITE_API_BASE_URL=http://localhost:8000

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

