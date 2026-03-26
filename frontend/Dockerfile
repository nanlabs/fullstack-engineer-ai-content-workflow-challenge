FROM oven/bun:1.2.10 AS build

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

COPY package.json bun.lock tsconfig.json next.config.ts next-env.d.ts ./
RUN bun install --frozen-lockfile

COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public
RUN bun run build

FROM oven/bun:1.2.10

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000

CMD ["bun", "run", "start", "--hostname", "0.0.0.0", "--port", "3000"]
