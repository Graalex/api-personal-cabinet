const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const port = require('./config').server.listenPort;

const accountRouter = require('./routers/account');
const allocationsRouter = require('./routers/allocations');
const API_ENDPOINT = require('./config').API_ENDPOINT;

app.use(cors());
app.use(bodyParser.json());

app.use(API_ENDPOINT, accountRouter);
app.use(API_ENDPOINT, allocationsRouter);

app.listen(port , () => {
	console.info(`API Personal Cabinet Service start at ${port} port...`);
});