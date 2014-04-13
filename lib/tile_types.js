var async = require('async');
var TileType = require('./tile_type');

module.exports = TileTypes;

function TileTypes() {
  var self = {};

  self.types = [];
  self.finder = {};

  self.load = load;
  self.create = create;
  self.find = find;

  return self;
}

function load(cb) {
  async.each(this.types, loadOne, cb);
}

function loadOne(type, cb) {
  type.load(cb);
}

function create(id, options) {
  var tileType = TileType(id, options);
  this.types.push(tileType);
  this.finder[id] = tileType;
  return tileType;
}

function find(id) {
  return this.finder[id];
}