/**
 * config.js -- конфигурация приложения
 */
require('dotenv').config();

module.exports = {
	db: {
		host: process.env.FIREBIRD_BASE_HOST,
		port: process.env.FIREBIRD_BASE_PORT,
		database: process.env.FIREBIRD_BASE_DATABASE,
		user: process.env.FIREBIRD_BASE_USER,
		password: process.env.FIREBIRD_BASE_PASSWORD,
		lowercase_keys: false,
		role: null,
		pageSize: 4096
	},
	security: {
		appKeys: [
			{owner: 'ООО АЗОВГАЗ', key: process.env.AZOVGAZ_APP_KEY},
			{owner: 'ПАО Мариупольгаз', key: process.env.MARIUPOLGAZ_APP_KEY},
		],
		secret: process.env.SECRET,
	},
	server: {
		listenPort: 1001,
		securePort: 10433
	},
};

module.exports.API_ENDPOINT = '/personal-cabinet/v1';