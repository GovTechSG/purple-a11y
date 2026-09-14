# Use Microsoft Playwright image as base image
# Node version is v22
FROM mcr.microsoft.com/playwright:v1.61.1-noble


# Installation of packages for oobee
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    unzip \
    zip \
    && rm -rf /var/lib/apt/lists/*

# =============================================================================
# Google Chrome installation for Safe Browsing support
# =============================================================================
# WHY: Chrome downloads local hash-prefix threat databases (UrlSoceng, UrlMalware)
#      at runtime using standard protection mode. These databases enable local URL
#      matching to block phishing/malware pages.
#      This is Chrome-only; Chromium lacks the required proprietary API keys.
#
# SUPPORTED ARCHITECTURES:
#   Chrome .deb packages are available for amd64 (x86_64) and arm64 (aarch64).
#   Other architectures will skip this step and Safe Browsing will not be available.
#
# INTEGRITY (asgard-0009): We no longer download the "current" .deb directly
# from dl.google.com, which had no independent integrity check. Instead we
# register Google's signed apt repository with the Linux signing key, and
# install google-chrome-stable via apt so every package is verified
# against Google's release signature by apt itself. Applies uniformly to
# amd64 and arm64 (Google ships both from the same signed repo).
# Optionally set --build-arg GOOGLE_CHROME_SIGNING_KEY_SHA256=<sha256> to
# additionally pin the fetched signing key against a known SHA-256; the
# default (empty) trusts TLS to dl.google.com for the key itself and lets
# apt's GPG verification catch package tampering.
#
# TO ENABLE: Set env var GOOGLE_SAFE_BROWSING=1 when running the container.
# =============================================================================
ARG GOOGLE_CHROME_SIGNING_KEY_SHA256=
RUN ARCH="$(dpkg --print-architecture)"; \
    if [ "$ARCH" = "amd64" ] || [ "$ARCH" = "arm64" ]; then \
      set -e; \
      TMPKEY="$(mktemp)"; \
      wget -q -O "$TMPKEY" https://dl.google.com/linux/linux_signing_key.pub; \
      if [ -n "$GOOGLE_CHROME_SIGNING_KEY_SHA256" ]; then \
        ACTUAL_KEY_SHA256="$(sha256sum "$TMPKEY" | awk '{print $1}')"; \
        if [ "$ACTUAL_KEY_SHA256" != "$GOOGLE_CHROME_SIGNING_KEY_SHA256" ]; then \
          echo "ERROR: Google Chrome signing key SHA-256 mismatch"; \
          echo "  expected: $GOOGLE_CHROME_SIGNING_KEY_SHA256"; \
          echo "  actual:   $ACTUAL_KEY_SHA256"; \
          rm -f "$TMPKEY"; \
          exit 1; \
        fi; \
      fi; \
      install -d -m 0755 /usr/share/keyrings; \
      install -m 0644 "$TMPKEY" /usr/share/keyrings/google-chrome.asc; \
      rm -f "$TMPKEY"; \
      echo "deb [arch=${ARCH} signed-by=/usr/share/keyrings/google-chrome.asc] https://dl.google.com/linux/chrome/deb/ stable main" \
        > /etc/apt/sources.list.d/google-chrome.list; \
      apt-get update && \
      apt-get install -y --no-install-recommends google-chrome-stable && \
      apt-mark hold google-chrome-stable && \
      rm -rf /var/lib/apt/lists/*; \
    else \
      echo "NOTICE: Skipping Chrome install (Safe Browsing unavailable on $ARCH)"; \
    fi

# --- App code (changes here don't invalidate Chrome layers above) ---

# Environment variables for node and Playwright
ENV NODE_ENV=production
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD="true"

# Add non-privileged user before app copy so ownership can be set during COPY.
# Also pre-create the Safe Browsing profile directory owned by `purple` so the
# warmup step below (which runs Chrome — Chrome refuses to launch as root
# without --no-sandbox) can write to it without a later root switch.
RUN groupadd -r purple && useradd -r -g purple purple && \
  mkdir -p /home/purple /app/oobee /data/chrome-profile && \
  chown purple:purple /home/purple /app /app/oobee /data /data/chrome-profile

WORKDIR /app/oobee

# Run app build steps as non-root to avoid a full recursive chown later.
USER purple

# Install dependencies first (cached unless package.json/package-lock.json change)
COPY --chown=purple:purple package.json package-lock.json ./
RUN npm install --omit=dev

# Install Playwright browsers no longer needed since we are using Google Chrome for Safe Browsing
# RUN npx playwright install chromium

# Copy source and compile TypeScript
COPY --chown=purple:purple . .
RUN npm run build || true # true exits with code 0 - workaround for TS errors

# Pre-warm Safe Browsing DB at build time so concurrent scans don't each
# trigger a 10 minutes warmup (or fight over a lock). The DB is baked into the image.
# Runs as `purple` (not root) so Chrome will launch — Chrome refuses to run as
# root without --no-sandbox, which we intentionally dropped from the warmup args.
RUN ARCH="$(dpkg --print-architecture)"; \
    if [ "$ARCH" = "amd64" ] || [ "$ARCH" = "arm64" ]; then \
      GOOGLE_SAFE_BROWSING=1 SB_PROFILE_DIR=/data/chrome-profile node scripts/warmup-safe-browsing.mjs --timeout 1200000; \
    else \
      echo "NOTICE: Skipping Safe Browsing warmup (unsupported architecture: $ARCH)"; \
    fi
