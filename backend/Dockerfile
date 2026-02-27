FROM node:22-alpine

# Install git (for simple-git) and build tools (for tree-sitter native addons)
RUN apk add --no-cache git python3 make g++

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Expose backend port
EXPOSE ${PORT:-5001}

# Start the server
CMD ["node", "index.js"]
