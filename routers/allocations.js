const router = require('express').Router();
const getAllocations = require('../lib/gasolina').getAllocations;
const verifyRequest = require('../lib/authorization').verifyRequest;

router.get('/allocations/:ls', (req, res) => {
	const ls = req.params.ls;
	const authField = req.header('Authorization');
	
	verifyRequest(authField, ls)
		.then(() => getAllocations(ls))
		.then(result => res.json(result))
		.catch (err => res.json(err));
});

module.exports = router;