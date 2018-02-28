const router = require('express').Router();
const getPayments = require('../lib/gasolina').getPayments;

router.get('/payments/:ls', (req, res) => {
	const ls = req.params.ls;
	getPayments(ls)
		.then(result => res.json(result))
		.catch(err => res.json(err));
});

module.exports = router;