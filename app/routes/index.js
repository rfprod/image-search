'use strict';

var path = process.cwd();
var https = require('https');
var mongoose = require('mongoose');
var Query = require('../models/query');
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
			/* initialize collection
			con.db.collection('queries').remove({}, function(err,data){
				if(err) throw err;
				console.log('removed');
				con.close();
			});
			*/
		    con.db.listCollections().toArray(function(err,data){
		    	if (err) throw err;
		        console.log('listCollections: '+JSON.stringify(data));
		        if (data.length == 0) console.log('"queries" collection should be created');
		        else console.log('"queries" collection exists');
		        con.close();
		    });
		    //
		});
		con.once('close', function(){console.log('> test connection closed');});
	});
	// handle Custom API image search request
	var endpointPattern = new RegExp(/^\/imagesearch\/.+/);
	var offsetParam = new RegExp(/.+\?offset\=[1-9][0-9]*$/);
	app.route(endpointPattern).get(function(req,res){
		// first url param is search term, second one is offset ['term','offset']
		if (req.url.match(offsetParam)){
			var urlParams = req.url.substr(13,req.url.length).split('?');
			urlParams[1] = '?'+urlParams[1];
			var searchTerm = urlParams[0];
			var offsetValue = urlParams[1].split('=')[1];
			var output = [];
			// get current date
			var dateLog = "";
			var date = new Date();
			var year = date.getFullYear();
			var month = date.getMonth()+1;
			if (month <10) month = "0"+month;
			var day = date.getDate();
			var hours = date.getHours();
			var minutes = date.getMinutes();
			if (minutes <10) minutes = "0"+minutes;
			dateLog = year+"-"+month+"-"+day+" "+hours+":"+minutes;
			mongoose.connect(process.env.MONGO_URI,function(err){
				if (err) throw err;
				var con = mongoose.connection;
				con.on('error', console.error);
				con.once('open', function(){
					console.log('> connection established on endpoint: /imagesearch/');
					console.log('urlParams: '+JSON.stringify(urlParams));
					console.log('offset value: '+offsetValue);
					console.log('dateLog: '+dateLog);
				    con.db.collection('queries').find().toArray(function(err,data){
				    	if (err) throw err;
				        console.log('"queries" collection: '+JSON.stringify(data));
				        id = data.length + 1;
				        console.log('next id: '+id);
					    // prepare new record
					    var newQuery = new Query();
						newQuery._id = id;
						newQuery.term = searchTerm;
						newQuery.when = dateLog;
						newQuery.save(function (err) {
							if (err) throw err;
							console.log('data saved');
							con.close();
						});
						console.log(newQuery);
						//output = newQuery;
				        //con.close();
				    });
				});
				con.once('close', function(){
					console.log('> connection closed on endpoint: /imagesearch/');
					/*
			        res.format({
						'application/json': function(){
							if (output != "") res.send(output);
							else res.send(searchTerm+', '+dateLog);
			        		res.end();
						}
					});
					*/
				});
			});
			// connect to Custom Search API
			var urlPath = "https://www.googleapis.com/customsearch/v1?q="+searchTerm+"&num="+offsetValue+"&cx="+process.env.CUSTOM_SEARCH_API_CX+"&key="+process.env.CUSTOM_SEARCH_API_KEY;
			var apiResponse = "";
			https.get(urlPath, (response) => {
				//console.log('Got response: '+response.statusCode);                               
				//console.log('Headers:\n'+JSON.stringify(response.headers));                      
				response.setEncoding('utf-8');
				response.on('data', (chunk) => {
					apiResponse += chunk;
					//console.log(chunk);
		      	});
		      	response.on('end', () => {
					//console.log(apiResponse);
					var jsonedItems = JSON.parse(apiResponse)['items'];
					console.log(jsonedItems.length);
					console.log();
					for (var i=0;i<jsonedItems.length;i++){
						var snippet = jsonedItems[i]['title'];
						var context = jsonedItems[i]['link'];
						var url = "";
						var thumbnail = "";
						if (jsonedItems[i]['pagemap']['cse_image']){
							url = jsonedItems[i]['pagemap']['cse_image'][0]['src'];
							thumbnail = jsonedItems[i]['pagemap']['cse_thumbnail'][0]['src'];
						}else{
							url = jsonedItems[i]['pagemap']['imageobject'][0]['url'];
							thumbnail = "null";
						}
						console.log(snippet+" | "+context+" | "+url+" | "+thumbnail);
						var item = "{\"url\":\""+url+"\",\"snippet\":\""+snippet+"\",\"thumbnail\":\""+thumbnail+"\",\"context\":\""+context+"\"}";
						output.push(JSON.parse(item));
					}
					console.log(output);
					//console.log('No more data in response.') 
					res.format({
						'application/json': function(){
							if (output.length > 0) res.send(output);
							else res.send(searchTerm+', '+dateLog);
			        		res.end();
						}
					});
				});
		   	}).on('error', (e) => {
				console.log(`Got error: ${e.message}`);
			});
			//
		}else{
			res.format({
				'application/json': function(){
					res.send('Error: ?offset=number is not defined.\nYou requested: '+req.url);
	        		res.end();
				}
			});
		}
	});
	// show queries log
	app.route('/latest/imagesearch/').get(function(req,res){
		mongoose.connect(process.env.MONGO_URI,function(err,db){
		if (err) throw err;
		var output = "";
		var con = mongoose.connection;
		con.on('error', console.error);
		con.once('open', function(){
			console.log('> connection established on endpoint: /latest/imagesearch/');
		    con.db.collection('queries').find().toArray(function(err,data){
		    	if (err) throw err;
		    	console.log('all docs: '+JSON.stringify(data));
		    	for (var i=0; i<data.length; i++){
		    		delete data[i]["_id"];
		    		delete data[i]["__v"];
		    	}
		    	output = data;
		        con.close();
		    });
		});
		con.once('close', function(){
			console.log('> connection closed on endpoint: /latest/imagesearch/');
			res.format({
				'application/json': function(){
					if (output.length > 0) res.send(output);
					else res.send('There are no query records yet.');
	        		res.end();
				}
			});
		});
	});
	});
};