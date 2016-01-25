'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Url = new Schema({
	_id: Number,
	longUrl: String,
	shortUrl: String,
    allow: Boolean
});

module.exports = mongoose.model('Url', Url);