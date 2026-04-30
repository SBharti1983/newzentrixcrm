# ZentrixCRM Backend — Production Dockerfile
FROM node:22-alpine

WORKDIR /app

# Copy package files first for optimal Docker layer caching
COPY package.json package-lock.json ./

# Install ALL dependencies (includes typescript for build)
RUN npm install

# Copy the rest of the server source
COPY . .

# Compile TypeScript to JavaScript
RUN npx tsc --project tsconfig.json

# Expose port (Railway injects $PORT at runtime)
EXPOSE 4000

# Start the compiled server
CMD ["node", "dist/src/index.js"]
