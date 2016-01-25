'use strict';

var path = process.cwd();
var mongoose = require('mongoose');
var Url = require('../models/url');
var id = null;

module.exports = function(app){
	app.route('/').get(function(req,res){res.sendFile(path + '/public/index.html');});
	// count existing collections - debug
	mongoose.connect(process.env.MONGO_URI,function(err,db){
		if (err) throw err;
		var con = mongoose.connection;
		con.on('error', console.error);
		con.once('open', function(){
			console.log('> test connection established');
			/* initialize "urls" collection
			con.db.collection('urls').remove({
				_id: "56a6289ce1f532fd0b25dea9"
			}, function(err,data){
				if(err) throw err;
				console.log('removed');
			});
			*/
		    con.db.listCollections().toArray(function(err,data){
		    	if (err) throw err;
		        console.log('listCollections: '+JSON.stringify(data));
		        if (data.length == 0) console.log('"urls" collection should be created');
		        else console.log('"urls" collection exists');
		        con.close();
		    });
		});
		con.once('close', function(){console.log('> test connection closed');});
	});
	var urlPattern = new RegExp(/^https?:\/\/(www\.)?[0-9a-zA-Z][0-9a-zA-Z_-]+\.[a-zA-Z][a-zA-Z]+$/);
	// resolve shortened urls
	var digitsPattern = new RegExp(/\/[0-9]+/);
	app.route(digitsPattern).get(function(req,res){
		var shortId = req.url.substring(1,req.url.length);
		var shortURL = null;
		var longURL = null;
		mongoose.connect(process.env.MONGO_URI,function(err){
			if (err) throw err;
			var con = mongoose.connection;
			con.on('error', console.error);
			con.once('open', function(){
				console.log('> connection established on endpoint: /[0-9]+/');
				console.log('passed id: '+shortId);
		        con.db.collection('urls').find({"_id": parseInt(shortId,10)}).toArray(function(err,doc){
					if(err) throw err;
					console.log('"urls" collection document by id: '+JSON.stringify(doc));
					if (doc[0]){
						shortURL = doc[0].shortUrl;
						longURL = doc[0].longUrl;
					}
					console.log('resolved short url: '+shortURL);
					con.close();
				});
			});
			con.once('close', function(){
				var isURL = longURL.match(urlPattern);
				console.log('> connection closed on endpoint: /[0-9]+/');
				res.format({
					'text/html': function(){
						if (longURL != null && isURL != null) res.send('<meta http-equiv="refresh" content="2,url='+longURL+'" >'+'<p>You are being redirected to <a href="'+longURL+'">'+longURL+'</a></p>');
						else if (longURL != null && isURL == null) res.send('<p>For unknown reason someone decided to store an invalid URL: <a href="'+longURL+'" target=_blank>'+longURL+'</a></p>');
						else res.send('<p>Record with id '+shortId+' does not exist.</p>');
		        		res.end();
					}
				});
			});
		});
	});
	// handle url shortening
	var endpointPattern = new RegExp(/^\/new\/.+/);
	var overridePattern = new RegExp(/.+\?allow\=true$/);
	app.route(endpointPattern).get(function(req,res){
		var urlParam = req.url.substr(5,req.url.length);
		var urlMatches = urlParam.match(urlPattern);
		var overrideMatch = urlParam.match(overridePattern);
		var originalURL = urlParam;
		var shortURL = "https://url-shortener-rfprod.c9users.io/";
		var allow = false;
		var output = "";
		mongoose.connect(process.env.MONGO_URI,function(err){
			if (err) throw err;
			var con = mongoose.connection;
			con.on('error', console.error);
			con.once('open', function(){
				console.log('> connection established on endpoint: /new/');
			    con.db.collection('urls').find().toArray(function(err,data){
			    	if (err) throw err;
			        console.log('"urls" collection documents: '+JSON.stringify(data));
			        id = data.length + 1;
			        shortURL += id;
			        // form output and params depending on user input
			        if (urlMatches !== null) {
						output = "{\"_id\":\""+id+"\",\"original_url\":\""+originalURL+"\",\"short_url\":\""+shortURL+"\",\"allow\":\""+allow+"\"}";
					}else if (overrideMatch){
						allow = true;
						originalURL = originalURL.substr(0,originalURL.indexOf('?'));
						output = "{\"_id\":\""+id+"\",\"original_url\":\""+originalURL+"\",\"short_url\":\""+shortURL+"\",\"allow\":\""+allow+"\"}";
					}else{
						shortURL = null;
						output = "{\"error\":\"provided parameter is not a valid url\",\"original_url\":\""+originalURL+"\",\"short_url\":\""+shortURL+"\",\"override invalid url\":\""+allow+"\"}";
					}
				    // prepare new record
				    var newUrl = new Url();
					newUrl._id = id;
					newUrl.longUrl = originalURL;
					newUrl.shortUrl = shortURL;
					newUrl.allow = allow;
					// insert record
					if (shortURL != null){
						newUrl.save(function (err) {
							if (err) throw err;
							console.log('data saved');
							con.close();
						});
					}
					console.log(newUrl);
			        //con.close();
			    });
			});
			con.once('close', function(){
				console.log('> connection closed on endpoint: /new/');
				// write response
		        res.format({
					'application/json': function(){
						res.send(output);
		        		res.end();
					}
				});
			});
		});
	});
	// utility - shoe all stored urls
	app.route('/showall/').get(function(req,res){
		mongoose.connect(process.env.MONGO_URI,function(err,db){
		if (err) throw err;
		var all = "";
		var con = mongoose.connection;
		con.on('error', console.error);
		con.once('open', function(){
			console.log('> connection established on endpoint: /showall/');
		    con.db.collection('urls').find().toArray(function(err,data){
		    	if (err) throw err;
		    	for (var i=0; i<data.length; i++){
		    		if (i == 0) all += "id\tshort url\t\t\t\t\tlong url\n";
		    		all += ""+data[i]._id+"\t"+data[i].shortUrl+"\t"+data[i].longUrl+"\n";
		    	}
		        console.log('all docs: '+JSON.stringify(data));
		        con.close();
		    });
		});
		con.once('close', function(){
			console.log('> connection closed on endpoint: /showall/');
			res.format({
				'application/json': function(){
					res.send(all);
	        		res.end();
				}
			});
		});
	});
	});
};