# Builder
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy root workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# Copy the service package.json
COPY frontend/package.json ./frontend/
# Enable workspace feature
RUN pnpm config set node-linker hoisted

# Install dependencies using the workspace
# RUN pnpm install --frozen-lockfile --prod # TODO: Fix this issue when building
RUN pnpm install

# Copy the rest of the service files
COPY frontend ./frontend
# Copy necessary lib files
COPY libs ./libs

# Build from the service directory
WORKDIR /app/frontend
RUN pnpm install
RUN pnpm run build

# Runner
FROM node:22-alpine AS runner
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy root workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY frontend/package.json ./frontend

# Enable workspace feature
RUN pnpm config set node-linker hoisted

# Install only production dependencies
# RUN pnpm install --frozen-lockfile --prod # TODO: Fix this issue when building
RUN pnpm install

WORKDIR /app/frontend
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["pnpm", "start"]
