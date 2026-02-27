FROM node:22-alpine

# Install git since simple-git requires the git binary
RUN apk add --no-cache git

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Expose backend port
EXPOSE 5001

# Start the server
CMD ["node", "index.js"]
