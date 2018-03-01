const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const port = require('./config').server.listenPort;

const accountRouter = require('./routers/account');
const allocationsRouter = require('./routers/allocations');
const subsidiesRouter = require('./routers/subsidies');
const paymentsRouter = require('./routers/payments');
const metersRouter = require('./routers/meters');
const authRouter = require('./routers/auth');
const API_ENDPOINT = require('./config').API_ENDPOINT;

app.use(cors());
app.use(bodyParser.json());

app.use(API_ENDPOINT, accountRouter);
app.use(API_ENDPOINT, allocationsRouter);
app.use(API_ENDPOINT, subsidiesRouter);
app.use(API_ENDPOINT, paymentsRouter);
app.use(API_ENDPOINT, metersRouter);
app.use(API_ENDPOINT, authRouter);

app.listen(port , () => {
	console.info(`API Personal Cabinet Service start at ${port} port...`);
});