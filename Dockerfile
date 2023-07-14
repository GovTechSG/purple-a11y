# Use Node LTS alpine distribution
FROM node:lts-alpine

# Installation of packages for purple-hats and chromium
RUN apk add build-base gcompat g++ make python3 chromium zip bash git imagemagick
 
WORKDIR /app

# Copy package.json to working directory, perform npm install before copying the remaining files
COPY package*.json ./

# Environment variables for node
ENV NODE_ENV=production

# Install dependencies
RUN npm ci --omit=dev

# Add non-privileged user
RUN addgroup -S purple && adduser -S -G purple purple
RUN chown -R purple:purple ./

# Run everything after as non-privileged user.
USER purple

# Install Playwright browsers
RUN npx playwright install

# Copy application and support files
COPY . .
