FROM node:22-alpine

RUN apk add --no-cache bash

COPY ../build /zx/build
COPY ../package.json /zx/package.json

ENTRYPOINT ["node", "/zx/build/cli.js"]
