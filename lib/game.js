var Board = require('./board');
var Controllers = require('./controllers');

module.exports = Game;

function Game(element, options) {

  var self = {};

  self.board = Board(element, options);
  self.controllers = Controllers(self);


  /// Methods

  self.start = start;

  return self;
}

/// start

function start() {

}