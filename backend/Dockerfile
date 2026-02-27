FROM node:22-alpine

# Install git (for simple-git) and build tools (for tree-sitter native addons)
RUN apk add --no-cache git python3 make g++

WORKDIR /app

# Install dependencies (--legacy-peer-deps: tree-sitter-java peer expects ^0.21 but we use 0.25)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Expose backend port
EXPOSE ${PORT:-5001}

# Start the server
CMD ["node", "index.js"]
