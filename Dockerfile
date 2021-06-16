# syntax=docker/dockerfile:1
FROM keymetrics/pm2:16-buster
WORKDIR /app
COPY . .
RUN npm install
CMD [ "pm2-runtime", "start", "pm2.json", "--watch"]
