'use strict';

var path = process.cwd();

module.exports = function (app, passport) {

	app.route('/').get(function (req, res) {
		res.sendFile(path + '/public/index.html');
	});
	
	var digitsPattern = new RegExp(/\/[0-9]+/);
	app.route(digitsPattern).get(function (req, res) {
		res.format({
			'application/json': function(){
				res.send('this should print previously shortened url and reditect user there');
        		res.end();
			}
		});
	});
	
	var endpointPattern = new RegExp(/^\/new\/.+/);
	var urlPattern = new RegExp(/^https?:\/\/(www\.)?[0-9a-zA-Z][0-9a-zA-Z_-]+\.[a-zA-Z][a-zA-Z]+$/);
	var overridePattern = new RegExp(/.+\?allow\=true$/);
	app.route(endpointPattern).get(function (req, res) {
		var urlParam = req.url.substr(5,req.url.length);
		var urlMatches = urlParam.match(urlPattern);
		var overrideMatch = urlParam.match(overridePattern);
		var originalURL = null;
		var shortURL = null;
		var output = "{\"original_url\":\""+originalURL+"\",\"short_url\":\""+shortURL+"\"}";
		res.format({
			'application/json': function(){
				//res.send(output);
				if (urlMatches !== null) res.send(urlParam+"\n"+"url pattern match: "+urlMatches[0]);
				else res.send(urlParam+"\n"+"url pattern match: "+urlMatches+"\n"+"overriding url validation: "+overrideMatch);
        		res.end();
			}
		});
	});
};