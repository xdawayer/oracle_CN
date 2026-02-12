FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && apk del python3 make g++
COPY dist/ ./dist/
RUN mkdir -p uploads/avatars
EXPOSE 3001
CMD ["node", "dist/index.js"]
