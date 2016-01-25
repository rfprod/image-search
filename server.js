'use strict';

var express = require('express');
var routes = require('./app/routes/index.js');
var session = require('express-session');

var app = express();
require('dotenv').load();

app.use('/public', express.static(process.cwd() + '/public'));

app.use(session({
	secret: 'secretClementine',
	resave: false,
	saveUninitialized: true
}));

routes(app);

var port = process.env.PORT || 8080;
app.listen(port,  function () {
	console.log('Node.js listening on port ' + port + '...');
});
