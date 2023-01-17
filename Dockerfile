FROM node:18.12.1-alpine3.16

# Installation of packages for purple-hats and chromium
RUN apk add --no-cache g++ make python3 chromium zip bash git xvfb

# Docker bits
RUN apk add --update docker

WORKDIR /app

# Copy package.json to working directory, perform npm install before copying the remaining files
COPY package*.json ./

# Environment variables for node
ENV NODE_ENV=production

RUN npm ci --omit=dev

COPY . .

# Add non-privileged user so we don't need puppeteer --no-sandbox.
RUN addgroup -S purple && adduser -S -G purple purple
RUN chown -R purple:purple ./

# Run everything after as non-privileged user.
USER purple

# Environment variables for chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

