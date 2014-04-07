var inherits       = require('util').inherits;
var ControllerBase = require('./base');

module.exports = CharacterController;

function CharacterController(game, character) {
  ControllerBase.call(this, game);

  this.character = character;
}

inherits(CharacterController, ControllerBase);

var CC = CharacterController.prototype;


/// activate

CC.activate = function activate() {
  this.key('left', this.turnLeft.bind(this));
  this.key('right', this.turnRight.bind(this));
  this.key('up', this.walk.bind(this));
  this.key('down', this.walkBack.bind(this));
};


CC.deactivate = function deactivate() {
  this.unbindKeys();
};


/// turnLeft

CC.turnLeft = function turnLeft() {
  this.character.turnLeft();
};


/// turnRight

CC.turnRight = function turnRight() {
  this.character.turnRight();
};


/// walk

CC.walk = function walk() {
  this.character.walk(this.centerBoard.bind(this));
};


/// walkBack

CC.walkBack = function walkBack() {
  this.character.walkBack(this.centerBoard.bind(this));
};


/// centerBoard

CC.centerBoard = function centerBoard() {
  this.game.board.grid.moveTo(this.character.x, this.character.y);
}