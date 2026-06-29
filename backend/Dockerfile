FROM oven/bun:1

WORKDIR /app

COPY package.json ./
# If bun.lockb exists, it will be copied, but if we don't have it, it's fine.
COPY bun.lockb* ./

RUN bun install

COPY . .

EXPOSE 3000

CMD ["bun", "run", "dev"]
