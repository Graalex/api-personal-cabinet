const router = require('express').Router();
const getSubsidies = require('../lib/gasolina').getSubsidies;

router.get('/subsidies/:ls', (req, res) => {
	const ls = req.params.ls;
	getSubsidies(ls)
		.then(result => res.json(result))
		.catch(err => res.json(err));
});

module.exports = router;