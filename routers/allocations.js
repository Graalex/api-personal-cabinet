const router = require('express').Router();
const getAllocations = require('../lib/gasolina').getAllocations;

router.get('/allocations/:ls', (req, res) => {
	const ls = req.params.ls;
	getAllocations(ls)
		.then(result => res.json(result))
		.catch (err => res.json(err));
});

module.exports = router;