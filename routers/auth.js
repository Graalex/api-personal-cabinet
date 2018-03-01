const router = require('express').Router();
const authAbonent = require('../lib/gasolina').authAbonent;

router.post('/auth', (req, res) => {
	const params = req.body;
	authAbonent(params)
		.then(result => res.json(result))
		.catch(err => res.json(err));
});

module.exports = router;