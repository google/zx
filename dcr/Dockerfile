FROM node:24-alpine

RUN apk add --no-cache bash

COPY ../build /zx/build
COPY ../package.json /zx/package.json
COPY ../LICENSE /zx/LICENSE
COPY ../README.md /zx/README.md

ENTRYPOINT ["node", "/zx/build/cli.js"]
