var async = require('async');
var CharacterType = require('./character_type');

module.exports = CharacterTypes;

function CharacterTypes() {
  var self = {};

  self.types = [];

  self.load = load;
  self.create = create;

  return self;
}

function load(cb) {
  async.each(this.types, loadOne, cb);
}

function loadOne(type, cb) {
  type.load(cb);
}

function create(options) {
  var characterType = CharacterType(options);
  this.types.push(characterType);
  return characterType;
}