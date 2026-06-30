# Node <= 24
FROM node:24-alpine

WORKDIR /app

# Install dependencies first (caching layer)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "run", "dev"]