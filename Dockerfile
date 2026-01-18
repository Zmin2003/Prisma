# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Production stage - Running dev server to preserve API proxy functionality
FROM node:20-alpine

WORKDIR /app

# Copy from builder
COPY --from=builder /app ./

# Expose port
EXPOSE 3000

# Environment variable placeholder
ENV GEMINI_API_KEY=""

# Start dev server (preserves proxy functionality)
CMD ["npm", "run", "dev"]
