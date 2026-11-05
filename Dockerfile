# ==============================================================================
# DOCKERFILE - TODOLIST BACKEND SERVICE
# ==============================================================================
# This Dockerfile builds a lightweight container running the Node.js / Express API.

# 1. Use the official lightweight Node.js 18 LTS Alpine base image
FROM node:18-alpine

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# 4. Install production dependencies only (keeps the image lean and fast)
RUN npm install --omit=dev

# 5. Copy the backend application source code and initialization scripts
COPY . .

# 6. Expose the API server port (default 5000)
EXPOSE 5000

# 7. Define the default command to start the Express application
CMD ["node", "server.js"]
