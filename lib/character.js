var extend = require('xtend');

module.exports = Character;

var defaultCharacterOptions = {
  x: 0,
  y: 0,
  facing: 'south',
  sprites: {
    south: '/sprites/soldier/south.png'
  },
  collides: true,
  walkable: false,
};

function Character(board, options) {
  var self = {};

  /// Methods

  self.visible   = visible;
  self.invisible = invisible;
  self.image     = image;
  self.moveTo    = moveTo;
  self.move      = move;


  /// Init

  self.board = board;

  options = extend({}, defaultCharacterOptions, options || {});
  self.x = options.x;
  self.y = options.y;
  self.facing = options.facing;
  self.sprites = options.sprites;
  self.collides = options.collides;
  self.walkable = options.walkable;


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

function moveTo(x, y) {
  var self = this;
  return this.board.moveTo(this, x, y, moved);

  function moved() {
    self.x = x;
    self.y = y;
  }
}

function move(x, y) {
  return this.moveTo(this.x + x, this.y + y);
}