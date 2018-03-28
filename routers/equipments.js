const router = require('express').Router();
const verifyRequest = require('../lib/authorization').verifyRequest;
const getgetEquipments = require('../lib/gasolina').getEquipments;

router.get('/equipments/:ls', (req, res) => {
	const ls = req.params.ls;
	const authField = req.header('Authorization');
	
	verifyRequest(authField, ls)
		.then(() => getgetEquipments(ls))
		.then(result => res.json(result))
		.catch (err => res.json(err));
});

module.exports = router;
