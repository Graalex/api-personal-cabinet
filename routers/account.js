const router = require('express').Router();

const getAccountInfo = require('../lib/gasolina').getAccountInfo;
const verifyRequest = require('../lib/authorization').verifyRequest;

router.get('/accounts/:ls', (req, res) => {
	const ls = req.params.ls;
	const authField = req.header('Authorization');
	
	verifyRequest(authField, ls)
		.then(() => getAccountInfo(ls))
		.then(result => res.json(result))
		.catch(err => res.status(err.status).json(err));
});

module.exports = router;