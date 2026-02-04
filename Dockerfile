FROM node:20-slim

WORKDIR /app

COPY package*.json ./
COPY tests/ ./tests/
COPY fixtures/ ./fixtures/


RUN npm install

RUN npx playwright install --with-deps chromium

COPY src/ ./src/

#CMD ["npx", "playwright", "test", "tests/example.spec.js"]

# Expose port
EXPOSE 8080

CMD ["npx", "tsx", "src/server.ts"]
