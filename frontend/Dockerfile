FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY frontend/package*.json ./
RUN npm install

# Copy application code
COPY frontend .

# Build the Next.js application
RUN npm run build

# Expose frontend port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
