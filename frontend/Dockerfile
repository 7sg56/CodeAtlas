FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Build the Next.js application
# NEXT_PUBLIC_API_URL must be set as a build-time env var on Railway
# (Settings → Variables → "Available at build time")
ARG NEXT_PUBLIC_API_URL
RUN NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL npm run build

# Expose frontend port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
