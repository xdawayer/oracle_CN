FROM node:20-alpine

# 构建阶段需要的工具（swisseph 原生模块编译）
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 先复制依赖文件，利用 Docker 层缓存
COPY package*.json ./
COPY tsconfig.json ./
COPY scripts/ ./scripts/

# 安装全部依赖（含 devDependencies，用于编译）
RUN npm ci

# 复制源码并编译
COPY src/ ./src/
RUN npm run build

# 删除 devDependencies，减小镜像体积
RUN npm prune --omit=dev && apk del python3 make g++

RUN mkdir -p uploads/avatars
EXPOSE 3001
CMD ["node", "dist/index.js"]
