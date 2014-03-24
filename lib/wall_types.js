var WallType = require('./wall_type');

module.exports = WallTypes;

function WallTypes(board) {
  var self = {};

  self.board = board;


  /// methods

  self.create = create;

  return self;
}

function create(options) {
  return WallType(options);
}