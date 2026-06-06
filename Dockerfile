# Use Node.js 20 lightweight Alpine image
FROM node:20-alpine

# Set node environment to production
ENV NODE_ENV=production

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy remaining backend source code files
COPY . .

# Expose backend application port
EXPOSE 3000

# Start Express server
CMD ["node", "index.js"]
