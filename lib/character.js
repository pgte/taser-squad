var extend = require('xtend');
var async  = require('async');
var Howl   = require('./howler').Howl;

module.exports = Character;

var nextOnRightTurn = {
  south:       'south_west',
  south_west:  'west',
  west:        'north_west',
  north_west:  'north',
  north:       'north_east',
  north_east:  'east',
  east:        'south_east',
  south_east:  'south'
};

var nextOnLeftTurn = {
  south:      'south_east',
  south_east: 'east',
  east:       'north_east',
  north_east: 'north',
  north:      'north_west',
  north_west: 'west',
  west:       'south_west',
  south_west: 'south'
};

var walkDirections = {
  south:      {x: -1, y: 1},
  south_west: {x: -1, y: 0},
  west:       {x: -1, y: -1},
  north_west: {x: 0,  y: -1},
  north:      {x: 1,  y: -1},
  north_east: {x: 1,  y: 0},
  east:       {x: 1,  y: 1},
  south_east: {x: 0,  y: 1}
}

var defaultCharacterOptions = {
  name: 'unknown',
  x: 0,
  y: 0,
  facing: 'south',
  collides: true,
  walkable: false,
  controllerFunction: require('../controllers/character')
};

function Character(board, type, options) {
  var self = {};

  /// type attributes

  self.sprites = type.copySprites();
  self.sounds = type.copySounds();

  /// Methods

  self.visible   = visible;
  self.invisible = invisible;
  self.image     = image;

  /// movement

  self.moveTo    = moveTo;
  self.move      = move;
  self.turnLeft  = turnLeft
  self.turnRight = turnRight
  self.walk      = walk;
  self.walkBack  = walkBack;

  /// sound

  self.play      = play;


  /// Init

  self.board = board;

  options = extend({}, defaultCharacterOptions, options || {});
  self.loaded = false;
  self.name = options.name;
  self.x = options.x;
  self.y = options.y;
  self.facing = options.facing;
  self.collides = options.collides;
  self.walkable = options.walkable;
  self.controllerFunction = options.controllerFunction;


  self.state = {
    visible: options.visible || false
  };

  if (self.state.visible) self.visible(true);

  return self;
}



function image() {
  var img = this.sprites[this.facing];
  return img;
}

function visible(force) {
  if (force || ! this.state.visible) {
    this.state.visible = true;
    this.board.place(this);
 }
}

function invisible(force) {
  if (force || this.state.visible) {
    this.state.visible = false;
    this.board.remove(this);
  }
}


/// Movement

function moveTo(x, y, cb) {
  return this.board.moveTo(this, x, y, cb);
}

function move(x, y, cb) {
  return this.moveTo(this.x + x, this.y + y, cb);
}

function turnLeft() {
  this.facing = nextOnLeftTurn[this.facing];
  this.board.update(this);
  this.play('turn');
}

function turnRight() {
  this.facing = nextOnRightTurn[this.facing];
  this.board.update(this);
  this.play('turn');
}

function walk(cb) {
  var self = this;
  var direction = walkDirections[this.facing];
  var moved = this.move(direction.x, direction.y, doneMoving);
  if (! moved) self.play('bump');
  function doneMoving() {
    self.play('walk');
    cb();
  }
  return moved;
}

function walkBack(cb) {
  var self = this;
  var direction = walkDirections[this.facing];
  var moved = this.move(- direction.x, - direction.y, doneMoving);
  if (! moved) self.play('bump');
  function doneMoving() {
    self.play('walk');
    cb();
  }
  return moved;
}


/// sound

function play(key) {
  var sound = this.sounds[key];
  if (sound) sound.play();
}