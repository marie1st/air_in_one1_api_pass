FROM node:14-alpine

ENV STARTMODE production

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app
RUN npm install

COPY . /usr/src/app

EXPOSE 3000

CMD [ "sh", "-c", "npm run ${STARTMODE}" ]