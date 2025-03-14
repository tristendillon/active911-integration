FROM node:18-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/

# Install dependencies
RUN pnpm install

# Copy the frontend app
COPY frontend/ ./frontend/

# Build the app
WORKDIR /app/frontend
RUN pnpm build

# Production image
FROM node:18-alpine AS runner
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY package.json pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/

# Install production dependencies
RUN pnpm install --prod

# Set up the app directory
WORKDIR /app/frontend

# Copy built app
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/next.config.ts ./next.config.ts

EXPOSE 3000

# Start the app
CMD ["pnpm", "start"]