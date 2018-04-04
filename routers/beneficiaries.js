const router = require('express').Router();
const verifyRequest = require('../lib/authorization').verifyRequest;
const getBeneficiaries = require('../lib/gasolina').getBeneficiaries;

router.get('/beneficiaries/:ls', (req, res) => {
	const ls = req.params.ls;
	const authField = req.header('Authorization');
	
	verifyRequest(authField, ls)
		.then(() => getBeneficiaries(ls))
		.then(result => res.json(result))
		.catch (err => res.status(err.status).json(err));
});

module.exports = router;
