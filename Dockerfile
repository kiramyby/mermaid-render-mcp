FROM node:18-alpine

# 安装 Chromium 和必要的依赖项
# @see https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    fontconfig \
    ttf-dejavu \
    font-noto-cjk

WORKDIR /app

COPY package*.json ./
# 安装所有依赖
RUN npm install

COPY . .

EXPOSE 3000

# 指定 Puppeteer 使用系统安装的 Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

CMD ["node", "png-server.js"]
