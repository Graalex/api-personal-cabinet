FROM node:carbon

MAINTAINER grigorchuk68 <aleksandr.grigorchuk@gmail.com>

COPY . /api-personal-cabinet

WORKDIR /api-personal-cabinet

RUN npm install

EXPOSE 10001

CMD ["npm", "start"]
