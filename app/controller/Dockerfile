FROM node:15-alpine

LABEL org.opencontainers.image.source https://github.com/GijsvanDulmen/tekton-serval

WORKDIR /usr/src/app

COPY lib/ ./lib
COPY handlers/ ./handlers
COPY package.json ./

RUN npm install

COPY index.js ./

CMD [ "node", "index.js" ]