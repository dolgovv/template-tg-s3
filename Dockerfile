FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# ---- runtime stage ----
FROM node:22-alpine AS runtime

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Only production deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output
COPY --from=builder /app/dist ./dist

CMD ["node", "dist/index.js"]
