# syntax=docker/dockerfile:1
FROM node:16
RUN apt install python g++ make
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "index.js"]
