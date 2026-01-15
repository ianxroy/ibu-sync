FROM node:18-slim

# DATA PRIVACY POLICY: 
# Credentials are used only for real-time scraping and are never stored.
# This container does not persist any student data.

# Install Google Chrome Stable and necessary libs
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./

# Install dependencies and clean cache to save space
RUN npm install && npm cache clean --force

COPY . .

ENV PORT=5000
ENV CHROME_BIN=/usr/bin/google-chrome
# Chrome flags for low-resource environments
ENV CHROME_PATH=/usr/bin/google-chrome

EXPOSE 5000

CMD ["node", "server.js"]