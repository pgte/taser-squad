var async = require('async');
var TileType = require('./tile_type');

module.exports = TileTypes;

function TileTypes() {
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
  var tileType = TileType(options);
  this.types.push(tileType);
  return tileType;
}