FROM node:18-slim

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
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package definition
COPY package.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Set environment variables
ENV PORT=5000
ENV CHROME_BIN=/usr/bin/google-chrome

# Expose the port
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]