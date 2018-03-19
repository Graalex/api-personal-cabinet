const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const rfs = require('rotating-file-stream');
const fs = require('fs');
const path = require('path');

const accountRouter = require('./routers/account');
const allocationsRouter = require('./routers/allocations');
const subsidiesRouter = require('./routers/subsidies');
const paymentsRouter = require('./routers/payments');
const metersRouter = require('./routers/meters');
const authRouter = require('./routers/auth');

const API_ENDPOINT = require('./config').API_ENDPOINT;
const port = require('./config').server.listenPort;

const logDir = path.join(__dirname, 'logs');
fs.existsSync(logDir) || fs.mkdirSync(logDir);

logStream = rfs('access.log', {interval: '7d', path: logDir});

app.use(morgan('combined', {stream: logStream}));

app.use(cors({
	origin: ['http://office.azovgaz.com.ua', 'http://office.margaz.com.ua'],
	methods: ['GET', 'POST'],
	optionsSuccessStatus: 204,
}));

app.use(bodyParser.json());

app.use(API_ENDPOINT, accountRouter);
app.use(API_ENDPOINT, allocationsRouter);
app.use(API_ENDPOINT, subsidiesRouter);
app.use(API_ENDPOINT, paymentsRouter);
app.use(API_ENDPOINT, metersRouter);
app.use(API_ENDPOINT, authRouter);

app.all('*', (req, res) => {
	res.json({
		status: 403,
		message: 'Отказано в доступе.',
	});
});

app.listen(port , () => {
	console.info(`API Personal Cabinet Service start at ${port} port...`);
});