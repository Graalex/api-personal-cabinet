const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const port = require('./config').server.listenPort;

const accountRouter = require('./routers/account');

app.use(cors());
app.use(bodyParser.json());

app.use('/personal-cabinet/v1', accountRouter);

app.listen(port , () => {
	console.info(`API Personal Cabinet Service start at ${port} port...`);
});