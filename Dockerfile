FROM node:carbon

LABEL version="0.1.3" \
			description="API для личного кабинета" \
			vendor="ПАО Мариупольгаз" \
			maintainer="Grigorchuk Aleksandr <aleksandr.grigorchuk@gmail.com>"

COPY . /api-personal-cabinet

WORKDIR /api-personal-cabinet

RUN npm install

EXPOSE 10002

CMD ["npm", "start"]
