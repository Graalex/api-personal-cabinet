# api-personal-cabinet
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Graalex/api-personal-cabinet/blob/master/LICENSE)
![GitHub tag](https://img.shields.io/github/tag/expressjs/express.svg)

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

## Использование
### Авторизация
`POST https://api.margaz.com.ua/personal-cabinet/v1/auth`
В теле запроса передаем данные
```json
{
  "ls": 1, // Номер лицевого счета
  "family": "фамилия", // Фамилия абонента (без учета регистра символов)
  "key": "VtF5cE" // ключ приложения
}
```
В случае совпадения номера лицевого счета, фамилии абонента и ключа приложения сервис вернет ответ:
```json
{
"status": 200,
"message": "Успешное завершение запроса",
"data": "IsInR5c.0JLQk9CQ.uBweKh0U7h"
}
```
Поле `data` содержит авторизационный токен со сроком жизни 1 час
Этот токен должен быть вставлен в заголовок `Authorization` следующих запросов.
Пример: `Authorization: Bearer IsInR5c.0JLQk9CQ.uBweKh0U7h`

### Общая информация о лицевом счете
`GET https://api.margaz.com.ua/personal-cabinet/v1/accounts/[номер лицевого счета]`

### Информация о газовых приборах
`GET https://api.margaz.com.ua/personal-cabinet/v1/equipments/[номер лицевого счета]`

### Информация о льготах
`GET https://api.margaz.com.ua/personal-cabinet/v1/beneficiaries/[номер лицевого счета]`

### Информация о начислениях (свод помесячно)
`GET https://api.margaz.com.ua/personal-cabinet/v1/allocations/[номер лицевого счета]`

### Информация о платежах (свод помесячно)
`GET https://api.margaz.com.ua/personal-cabinet/v1/payments/[номер лицевого счета]`

### Информация о субсидиях (свод помесячно)
`GET https://api.margaz.com.ua/personal-cabinet/v1/subsidies/[номер лицевого счета]`
