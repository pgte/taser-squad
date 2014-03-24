var extend = require('xtend');

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
  x: 0,
  y: 0,
  facing: 'south',
  sprites: {
    south: '/sprites/soldier/south.png',
    south_west: '/sprites/soldier/south_west.png',
    west:       '/sprites/soldier/west.png',
    north_west: '/sprites/soldier/north_west.png',
    north:      '/sprites/soldier/north.png',
    north_east: '/sprites/soldier/north_east.png',
    east:       '/sprites/soldier/east.png',
    south_east: '/sprites/soldier/south_east.png'
  },
  collides: true,
  walkable: false,
  controllerFunction: require('../controllers/character')
};

function Character(board, options) {
  var self = {};

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


  /// Init

  self.board = board;

  options = extend({}, defaultCharacterOptions, options || {});
  self.x = options.x;
  self.y = options.y;
  self.facing = options.facing;
  self.sprites = options.sprites;
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
  return this.sprites[this.facing];
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

function moveTo(x, y) {
  return this.board.moveTo(this, x, y);
}

function move(x, y) {
  return this.moveTo(this.x + x, this.y + y);
}

function turnLeft() {
  this.facing = nextOnLeftTurn[this.facing];
  this.board.update(this);
}

function turnRight() {
  this.facing = nextOnRightTurn[this.facing];
  this.board.update(this);
}

function walk() {
  var direction = walkDirections[this.facing];
  return this.move(direction.x, direction.y);
}

function walkBack() {
  var direction = walkDirections[this.facing];
  return this.move(- direction.x, - direction.y);
}