const router = require('express').Router();
const getMeters = require('../lib/gasolina').getMeters;
const verifyRequest = require('../lib/authorization').verifyRequest;

router.get('/meters/:ls', (req, res) => {
	const ls = req.params.ls;
	const authField = req.header('Authorization');
	verifyRequest(authField, ls)
		.then(() => getMeters(ls))
		.then(result => res.json(result))
		.catch(err => res.json(err));
});

module.exports = router;