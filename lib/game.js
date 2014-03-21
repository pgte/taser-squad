var Board = require('./board');

module.exports = Game;

function Game(element) {

  var self = {};

  self.board = Board(element);


  /// Methods

  self.start = start;

  return self;
}

/// start

function start() {

}