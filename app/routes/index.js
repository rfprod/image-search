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
		var urlParams = null;
		var searchTerm = null;
		var offsetValue = null;
		if (req.url.match(offsetParam)){
			// first url param is search term, second one is offset ['term','offset']
			urlParams = req.url.substr(13,req.url.length).split('?');
			urlParams[1] = '?'+urlParams[1];
			searchTerm = urlParams[0];
			offsetValue = urlParams[1].split('=')[1];
		}else{
			urlParams = req.url.substr(13,req.url.length);
			searchTerm = urlParams;
			offsetValue = 1;
			console.log(urlParams+" | "+searchTerm+" | "+offsetValue);
		}
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
		var urlPath = "https://www.googleapis.com/customsearch/v1?q="+searchTerm+"&num=5&start="+offsetValue+"&cx="+process.env.CUSTOM_SEARCH_API_CX+"&key="+process.env.CUSTOM_SEARCH_API_KEY;
		var apiResponse = "";
		https.get(urlPath, (response) => {
			response.setEncoding('utf-8');
			response.on('data', (chunk) => {
				apiResponse += chunk;
	      	});
	      	response.on('end', () => {
				//console.log(apiResponse);
				var jsonedItems = JSON.parse(apiResponse)['items'];
				if (jsonedItems){
					for (var i=0;i<jsonedItems.length;i++){
						var snippet = jsonedItems[i]['snippet'].replace(/\n/gm,"");
						var context = jsonedItems[i]['link'];
						var url = "null";
						var thumbnail = "null";
	
						if (jsonedItems[i]['pagemap']['cse_image']) url = jsonedItems[i]['pagemap']['cse_image'][0]['src'];
						else if (jsonedItems[i]['pagemap']['imageobject']) url = jsonedItems[i]['pagemap']['imageobject'][0]['url'];
						
						if (jsonedItems[i]['pagemap']['cse_thumbnail']) thumbnail = jsonedItems[i]['pagemap']['cse_thumbnail'][0]['src'];
	
						var item = "{\"url\":\""+url+"\",\"snippet\":\""+snippet+"\",\"thumbnail\":\""+thumbnail+"\",\"context\":\""+context+"\"}";
						
						// check if JSON is ok
						if (/^[\],:{}\s]*$/.test(item.replace(/\\["\\\/bfnrtu]/g, '@').
						replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').
						replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
						  	console.log('JSON is OK.');
						  	output.push(JSON.parse(item));
						}else{
							output.push(JSON.parse('{"Error":"There was an error parsing JSON. This is most probably due data from Custom Search service response."}'));
						}
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
	      		}else{
	      			var errorResponse = JSON.parse(apiResponse)['error']; 
	      			if (errorResponse){
		      			res.format({
							'application/json': function(){
								res.send(errorResponse);
				        		res.end();
							}
						});
	      			}else{
	      				res.format({
							'application/json': function(){
								res.send("{\"Error\":\"This is most probably JSON parsing error. It occurs for unknown reason when parsing specific urls.\"}");
				        		res.end();
							}
						});
	      			}
	      		}
			});
	   	}).on('error', (e) => {
			console.log(`Got error: ${e.message}`);
		});
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