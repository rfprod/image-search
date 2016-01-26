'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Query = new Schema({
	_id: Number,
	term: String,
	when: String
});

module.exports = mongoose.model('Query', Query);