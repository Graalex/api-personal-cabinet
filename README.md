# api-personal-cabinet
API для личного кабинета ООО "АЗОВГАЗ" и ПАО "Мариупольгаз".

## Установка
```bash
# git репозитарий
git clone https://github.com/Graalex/api-personal-cabinet.git

# docker образ
sudo docker build -t margaz/api-personal-cabinet https://github.com/Graalex/api-personal-cabinet.git
```
Создайте в каталоге `api-personal-cabinet` следующие каталоги `env` и `cert`.
В `env` положите файл `.env` со следующими настройками
```dosini
# IP адрес вашей СУБД Firebird
FIREBIRD_BASE_HOST=127.0.0.1
# сетевой порт СУБД Firebird
FIREBIRD_BASE_PORT=3050
# Путь до файла базы данных
FIREBIRD_BASE_DATABASE=D:/DB/base.fdb
# Имя пользователя базы данных
FIREBIRD_BASE_USER=SYSDBA
# Пароль к базе данных
FIREBIRD_BASE_PASSWORD=masterkey
# Ключ приложения для сайта ООО "АЗОВГАЗ"
AZOVGAZ_APP_KEY=...VtF5cEx...
# Ключ приложения для сайта ПАО "Мариупольгаз"
MARIUPOLGAZ_APP_KEY=...BC9MKu...
# Пароль которым будет подписываться токен доступа
SECRET=...VExi5j43GZo3jrLQOEpOs9Y0rABfOE2...
# Номер порта который будет слушать приложение (HTTPS)
APP_PORT=443
# Основной путь к конецным точкам API
API_ENDPOINT=/personal-cabinet/v1
```
В `cert` положите файл `fullchain.pem`, содержащий Ваш SSL сертификат  и файл `privkey.pem`, содердащий приватный
ключ для Вашего сертификата.
Если Вы используете `docker` образ приложения, то создайте указанные выше каталоги и их содержимое и дополнительно
создайте пустой каталог `logs`.

## Запуск приложения
```bash
cd api-personal-cabinet
npm start

# docker
sudo docker run -d --name api-cabinet \
	-p 443:443 \
	-v [путь к logs]:/api-personal-cabinet/logs
	-v [путь к cert]:/api-personal-cabinet/cert:ro \
	--env-file [путь к env] \
	margaz/api-personal-cabinet
```
