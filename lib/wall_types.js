var async   = require('async');

var WallType = require('./wall_type');

module.exports = WallTypes;

function WallTypes(board) {
  var self = {};

  self.loaded = false;
  self.board = board;
  self.wallTypes = [];


  /// methods

  self.load   = load;
  self.create = create;

  return self;
}

function load(cb) {
  var self = this;

  if (self.loaded) return cb();

  async.each(self.wallTypes, loadOne, loaded);

  function loadOne(wallType, cb) {
    wallType.load(cb);
  }

  function loaded(err) {
    if (err) cb(err);
    else {
      self.loaded = true;
      if (cb) cb();
    }
  }
}

function create(options) {
  var wallType = WallType(options);
  this.wallTypes.push(wallType);
  return wallType;
}