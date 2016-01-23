'use strict';

var path = process.cwd();

module.exports = function (app, passport) {

	app.route('/')
		.get(function (req, res) {
			res.sendFile(path + '/public/index.html');
		});

	app.route('/whoami').get(function (req, res) {
		//console.log(req.url);
		var headers = req.headers;
		var userIP = null;
		var userLang = null;
		var userSoft = null;
		if (userIP != "") userIP = headers['x-forwarded-for'];
		if (userLang != "") userLang = headers['accept-language'].substr(0,headers['accept-language'].indexOf(','));
		if (userSoft != "") userSoft = headers['user-agent'].substring(headers['user-agent'].indexOf('(')+1,headers['user-agent'].indexOf(')'));
		var output = "{\"ipaddress\":\""+userIP+"\",\"language\":\""+userLang+"\",\"software\":\""+userSoft+"\"}";
		res.format({
			'application/json': function(){
				res.send(output);
        		res.end();
			}
		});
	});
};
