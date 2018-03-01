const router = require('express').Router();
const getMeters = require('../lib/gasolina').getMeters;

router.get('/meters/:ls', (req, res) => {
	const ls = req.params.ls;
	getMeters(ls)
		.then(result => res.json(result))
		.catch(err => res.json(err));
});

module.exports = router;