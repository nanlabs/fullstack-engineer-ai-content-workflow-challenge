FROM oven/bun:1.2.10

WORKDIR /app

COPY package.json tsconfig.json next.config.ts next-env.d.ts ./
RUN bun install

COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public

EXPOSE 3000

CMD ["bun", "run", "dev", "--hostname", "0.0.0.0", "--port", "3000"]
