FROM oven/bun:1
WORKDIR /app
COPY package.json ./
RUN bun install --frozen-lockfile
COPY index.ts ./
EXPOSE 3003
CMD ["bun", "index.ts"]
