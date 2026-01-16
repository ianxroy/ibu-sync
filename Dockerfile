FROM node:18-slim

# DATA PRIVACY POLICY: 
# Credentials are used only for real-time scraping and are never stored.
# This container does not persist any student data.

# Install Google Chrome Stable, procps, and dumb-init
# dumb-init is critical for Node.js in Docker to handle signals and reap zombie processes created by Puppeteer
# Fonts are installed to ensure consistent rendering if scraping relies on layout metrics
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    dumb-init \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./

# Install dependencies (including devDependencies for building)
RUN npm install && npm cache clean --force

COPY . .

# Build the frontend (Vite)
RUN npm run build

# Set Port to 8080 as requested
ENV PORT=8080
ENV CHROME_BIN=/usr/bin/google-chrome
# Chrome flags for low-resource environments
ENV CHROME_PATH=/usr/bin/google-chrome
# Skip downloading Chromium since we installed google-chrome-stable manually
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

EXPOSE 8080

# Use dumb-init as the entrypoint to manage processes
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

CMD ["node", "server.js"]