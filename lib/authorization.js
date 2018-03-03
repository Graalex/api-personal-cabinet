const jwt = require('jsonwebtoken');
const secret = require('../config').security.secret;

module.exports.verifyRequest = async (authField, ls) => {
	return new Promise((resolve, reject) => {
		if (!authField) reject({status: 401, message: 'Неавторизированный запрос'});
		
		const token = authField.substr(6).trim();
		jwt.verify(token, secret, (err, payload) => {
			if (err) reject({status: 401, message: 'Неавторизированный запрос'});
			if (!payload) reject({status: 403, message: 'Неавторизированный запрос'});
			if (payload.ls != ls) reject({status: 403, message: 'Доступ запрещен'});
			
			resolve();
		});
	});

};

module.exports.createToken = async (ls, owner) => {
	const token = jwt.sign({ls, owner}, secret, {expiresIn: '1h'});
	return token;
};