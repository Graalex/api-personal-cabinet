const router = require('express').Router();
const getSubsidies = require('../lib/gasolina').getSubsidies;
const verifyRequest = require('../lib/authorization').verifyRequest;

router.get('/subsidies/:ls', (req, res) => {
	const ls = req.params.ls;
	const authField = req.header('Authorization');
	
	verifyRequest(authField, ls)
		.then(() => getSubsidies(ls))
		.then(result => res.json(result))
		.catch(err => res.status(err.status).json(err));
});

module.exports = router;