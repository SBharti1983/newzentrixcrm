# ZentrixCRM Backend — Production Dockerfile for Railway
FROM node:20-alpine

WORKDIR /app

# Copy only server package files first for optimal layer caching
COPY server/package.json server/package-lock.json ./

# Install ALL dependencies (including typescript for build)
RUN npm install

# Copy the rest of the server source code
COPY server/ ./

# Build TypeScript to JavaScript
RUN npm run build

# Expose the port Railway will inject via $PORT
EXPOSE 4000

# Start the compiled server
CMD ["npm", "start"]
