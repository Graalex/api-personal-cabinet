const router = require('express').Router();
const getAccountInfo = require('../lib/gasolina').getAccountInfo;

router.get('/accounts/:ls', (req, res) => {
	const ls = req.params.ls;
	getAccountInfo(ls)
		.then(result => res.json(result))
		.catch(err => res.json(err));
});

module.exports = router;