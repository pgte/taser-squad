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
  sounds: {
    'walk': '/sound/soldier/walk.mp3',
    'turn': '/sound/soldier/turn.mp3',
    'bump': '/sound/soldier/bump.mp3'
  },
  collides: true,
  walkable: false,
  controllerFunction: require('../controllers/character')
};

function Character(board, options) {
  var self = {};

  /// Methods

  self.load      = load;
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
  self.sprites = extend({}, options.sprites);
  self.sounds = extend({}, options.sounds);
  self.collides = options.collides;
  self.walkable = options.walkable;
  self.controllerFunction = options.controllerFunction;


  self.state = {
    visible: options.visible || false
  };

  if (self.state.visible) self.visible(true);

  return self;
}

function load(cb) {
  var self = this;
  if (self.loaded) return cb();

  async.parallel([
    loadSprites,
    loadSounds
    ], loaded);

  function loadSprites(cb) {
    async.each(Object.keys(self.sprites), loadOne, cb);

    function loadOne(spriteKey, cb) {
      var src = self.sprites[spriteKey];

      var im = new Image;

      im.addEventListener('load', function () {
        self.sprites[spriteKey] = im;
        cb();
      });
      im.addEventListener('error', cb);
      im.src = src;
    }
  }

  function loadSounds(cb) {
    async.each(Object.keys(self.sounds), loadOne, cb);

    function loadOne(soundKey, cb) {
      var src = self.sounds[soundKey];

      var au = new Howl({
        urls: [src],
        autoplay: false,
        loop: false,
        onload: onLoad,
        onloaderror: onLoadError
      });

      function onLoad() {
        self.sounds[soundKey] = au;
        cb();
      }

      function onLoadError(err) {
        cb(err);
      }
    }
  }


  function loaded(err) {
    self.loaded = true;
    if (cb) cb();
  }
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