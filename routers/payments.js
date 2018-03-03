const router = require('express').Router();
const getPayments = require('../lib/gasolina').getPayments;
const verifyRequest = require('../lib/authorization').verifyRequest;

router.get('/payments/:ls', (req, res) => {
	const ls = req.params.ls;
	const authField = req.header('Authorization');
	
	verifyRequest(authField, ls)
		.then(() => getPayments(ls))
		.then(result => res.json(result))
		.catch(err => res.json(err));
});

module.exports = router;