const router = require('express').Router();
const verifyRequest = require('../lib/authorization').verifyRequest;
const getEquipments = require('../lib/gasolina').getEquipments;

router.get('/equipments/:ls', (req, res) => {
	const ls = req.params.ls;
	const authField = req.header('Authorization');
	
	verifyRequest(authField, ls)
		.then(() => getEquipments(ls))
		.then(result => res.json(result))
		.catch (err => res.status(err.status).json(err));
});

module.exports = router;
