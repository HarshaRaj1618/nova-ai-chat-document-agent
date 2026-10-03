FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8789
CMD ["node", "index.js"] 
# Note: replace "index.js" with the actual entry point file if named differently
