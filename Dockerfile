FROM node:carbon

LABEL version="1.0.0" \
			description="API для личного кабинета" \
			vendor="ПАО Мариупольгаз" \
			maintainer="Grigorchuk Aleksandr <aleksandr.grigorchuk@gmail.com>"

COPY . /api-personal-cabinet

WORKDIR /api-personal-cabinet

RUN npm install

EXPOSE 443

CMD ["npm", "start"]
