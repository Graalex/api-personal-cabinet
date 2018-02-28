/**
 * config.js -- конфигурация приложения
 */

module.exports = {
	db: {
		host: '192.168.0.211',
		port: 3050,
		database: 'E:/DATA/MARIUPOL.FDB',
		user: 'SYSDBA',
		password: 'masterkey',
		lowercase_keys: false,
		role: null,
		pageSize: 4096
	},
	security: {},
	server: {
		listenPort: 1001,
		securePort: 10433
	},
};

module.exports.API_ENDPOINT = '/personal-cabinet/v1';