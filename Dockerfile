#Build stage
FROM node:18-alpine AS build

RUN apk add --no-cache git sed

WORKDIR /app

RUN git clone -b 'v0.6.17' --single-branch --depth 1 https://github.com/copystring/ioBroker.roborock.git .

RUN npm ci --omit=dev && npm install jszip

#Production stage
FROM node:18-alpine AS production

WORKDIR /app

COPY --from=build /app/ .

COPY rr2mqtt-adapter.js .

COPY rr2mqtt-main.js .

RUN sed -i 's/require("@iobroker\/adapter-core")/require(".\/rr2mqtt-adapter")/g' main.js

CMD ["node", "rr2mqtt-main.js"]