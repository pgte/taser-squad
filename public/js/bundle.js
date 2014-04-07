(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var keymaster = require('../lib/keymaster');
// keymaster.noConflict();

module.exports = ControllerBase;

function ControllerBase(game) {
  this.game = game;
  this.boundKeys = [];
}

var CB = ControllerBase.prototype;


/// key

CB.key = function key(spec, fn) {
  this.boundKeys.push(spec) ;
  keymaster(spec, fn);
};

CB.unbindKeys = function unbindKeys() {
  this.boundKeys.forEach(this.unbindKey.bind(this));
  this.boundKeys = [];
};

CB.unbindKey = function unbindKey(spec) {
  keymaster.unbind(spec);
};


/// abstract methods

CB.activate = abstract;
CB.deactivate = abstract;


function abstract() {
  throw new Error('controller needs to implement activate');
}


},{"../lib/keymaster":10}],2:[function(require,module,exports){
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

  this.game.board.grid.moveTo(this.character.x, this.character.y);
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
},{"./base":1,"util":23}],3:[function(require,module,exports){
(function (global){
var Game = require('./lib/game');

var window = global;

var container = $('#game');

var options = {
  width: container.width(),
  height: container.height(),
  zoom: 0.5,
  size: 40
};

var game = Game(container[0], options);

/// soldiers

var soldiers = [];

(function() {
  var soldierCount = 5;
  for(var i = 0; i < soldierCount; i ++) {
    var soldier = game.board.characters.create({name: 'soldier ' + i});
    soldiers.push(soldier);
    var place = { x:i * 2, y: -i * 2};
    var placed = game.board.characters.place(soldier, place);
    if (! placed) console.log('Failed to place soldier in ', place);
  }

}());



/// walls

(function() {
  var wallType = game.board.wallTypes.create();

  var start = {x: -5.5, y: -5.5};
  var end = {x: -5.5, y: 5.5};
  game.board.walls.place(wallType, start, end);


  start = {x: -5.5, y: -5.5};
  end = {x: 5.5, y: -5.5};
  game.board.walls.place(wallType, start, end);

  start = {x: 5.5, y: 5.5};
  end = {x: 5.5, y: -5.5};
  console.log('adding wall');
  game.board.walls.place(wallType, start, end);

  console.log('game.board.walls.walls:', game.board.walls.walls);

}());



/// start game


game.start();

var soldierNr = -1;
var soldier;
var controller;

setInterval(function() {
  if (controller) controller.deactivate();
  soldierNr = (soldierNr + 1) % soldiers.length;
  soldier = soldiers[soldierNr];
  controller = game.controllers.control(soldier);
}, 3000);
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./lib/game":8}],4:[function(require,module,exports){
var extend  = require('xtend');
var _       = require('underscore');

var Grid        = require('./grid');
var Tiles       = require('./tiles');
var Characters  = require('./characters');
var WallTypes   = require('./wall_types');
var Walls       = require('./walls');
var ZIndexes    = require('./z_indexes');

module.exports = Board;

var defaultOptions = {
  width: window.outerWidth,
  height: window.outerHeight,
  size: 20,
  // zoom: 0.5
  zoom: 1
};

function Board(element, options) {
  var self = {};

  options = extend({}, defaultOptions, options || {});

  /// Methods

  self.zoom = zoom;

  self.place  = place;
  self.remove = remove;
  self.moveTo = moveTo;
  self.update = update;

  self.createWall = createWall;

  self.walkable = walkable;
  self.traversable = traversable;
  self.objectsAt = objectsAt;


  /// Init

  self.grid = Grid(element, options.width, options.height, options.size);

  self.zoom(options.zoom);
  self.tiles = Tiles(self.grid);
  self.characters = Characters(self);
  self.wallTypes = WallTypes(self);

  self.zIndexes = ZIndexes(self.grid, options.size);

  self.size = options.size;
  self.objects = [];
  self.walls = Walls(self);

  for(var i = 0 ; i < self.size; i ++) {
    self.objects.push([]);
    for(var j = 0 ; j < self.size; j ++) {
      self.objects[i].push([]);
      self.objects[i][j] = [];
    }
  }

  var halfSize = self.size / 2;
  for (var x = -halfSize; x < halfSize; x++) {
    for (var y = -halfSize; y < halfSize; y++) {
      self.tiles.create(x, y);
    }
  }

  return self;
}

/// place

function place(object, options) {
  var self = this;

  options = extend({
    x: object.x,
    y: object.y
  }, options || {});

  var placed = false;
  if (object.collides)
    placed = this.walkable(options.x, options.y);

  if (placed) {
    var set = this.zIndexes.setFor(options.x, options.y);
    var item = this.grid.createItem(object.image(), options.x, options.y, set, createdItem);
    object.item = item;
    var halfSize = this.size / 2;
    var row = this.objects[options.x + halfSize];
    var cell = row && row[options.y + halfSize];
    if (cell) {
      cell.push(object);
      object.x = options.x;
      object.y = options.y;
    }
  }
  return placed;

  function createdItem(err, item) {
    if (err) throw err;
    object.item = item;
  }
}


/// remove

function remove(object) {
  var halfSize = this.size / 2;
  var row = this.objects[object.x + halfSize];
  var objects = row && row[object.y + halfSize] || [];
  if (objects.length) {
    var idx = objects.indexOf(object);
    if (idx >= 0) {
      objects.splice(idx, 1);
      this.grid.removeItem(object.x, object.y);
      this.zIndexes.remove(object.item);
    }
  }
}


/// update

function update(object) {
  var item = object.item;
  if (! item) throw new Error('No object.item');
  var oldImage = item.element.attr('href');
  var newImage = object.image();
  if (oldImage != newImage)
    item.element.attr('href', newImage);
}


/// moveTo

function moveTo(object, x, y, cb) {
  if (Math.round(x) != x) throw new Error('must move to integer x');
  if (Math.round(y) != y) throw new Error('must move to integer y');

  var to = { x: x, y: y};

  var distance = {
    x: Math.abs(object.x - x),
    y: Math.abs(object.y - y)
  };

  if (distance.x > 1) throw new Error('distance in x must be <= 1');
  if (distance.y > 1) throw new Error('distance in y must be <= 1');


  var move = this.traversable(object, to) && this.walkable(x, y);
  if (move) {
    var item = object.item;
    if (! item) throw new Error('no object.item');

    var objects = this.objectsAt(object.x, object.y);
    var idx = objects.indexOf(object);
    if (idx >= 0) objects.splice(idx, 1);

    var oldPos = {
      x: item.x,
      y: item.y
    };

    this.grid.moveItem(item, x, y, cb);
    object.x = x;
    object.y = y;

    this.objectsAt(x, y).push(object);

    this.zIndexes.move(object.item, oldPos, item);
  }
  return move;
}


/// objectsAt

function objectsAt(x, y) {
  x += this.size / 2;
  y += this.size / 2;
  var row = this.objects[x];
  return row && row[y] || [];
}


/// walkable

function walkable(x, y) {
  var max = this.size / 2;
  var walkable = (Math.abs(x) <= max) && (Math.abs(y) <= max);
  if (walkable) {
    var objects = this.objectsAt(x, y);
    if (objects.length) walkable = _.every(objects, isWalkable);
  }
  return walkable;
}


/// createWall

function createWall(image, from, to) {
  var self = this;

  var x = (from.x + to.x) / 2;
  var y = (from.y + to.y) / 2;
  var set = this.zIndexes.setFor(x, y);

  this.grid.createWall(image, from, to, set);
}


/// traversable

function traversable(from, to) {
  return this.walls.traversable(from, to);
}


/// zoom

function zoom(level) {
  this.grid.zoom(level);
}


/// Misc

function isWalkable(o) {
  return o.walkable;
}
},{"./characters":6,"./grid":9,"./tiles":11,"./wall_types":13,"./walls":14,"./z_indexes":15,"underscore":18,"xtend":25}],5:[function(require,module,exports){
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
  self.name = options.name;
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

function moveTo(x, y, cb) {
  return this.board.moveTo(this, x, y, cb);
}

function move(x, y, cb) {
  return this.moveTo(this.x + x, this.y + y, cb);
}

function turnLeft() {
  this.facing = nextOnLeftTurn[this.facing];
  this.board.update(this);
}

function turnRight() {
  this.facing = nextOnRightTurn[this.facing];
  this.board.update(this);
}

function walk(cb) {
  var direction = walkDirections[this.facing];
  return this.move(direction.x, direction.y, cb);
}

function walkBack(cb) {
  var direction = walkDirections[this.facing];
  return this.move(- direction.x, - direction.y, cb);
}
},{"../controllers/character":2,"xtend":25}],6:[function(require,module,exports){
var extend = require('xtend');

var Character = require('./character');


module.exports = Characters;

var defaultOptions = {
};

function Characters(board, options) {
  var self = {};

  self.characters = [];
  self.board = board;

  options = extend({}, defaultOptions, options || {});

  self.create = create;
  self.place  = place;

  return self;
}

function create(options) {
  return Character(this.board, options);
}

function place(character, options) {
  if (! options) options = {};
  if (options.x) character.x = options.x;
  if (options.y) character.y = options.y;
  var placed = this.board.place(character);
  if (placed) {
    this.characters.push(character);
  }
  return placed;
}
},{"./character":5,"xtend":25}],7:[function(require,module,exports){
module.exports = Controllers;

function Controllers(game) {
  var self = {};

  self.game = game;
  self.control = control;

  return self;
}

function control(object) {
  if (! object) throw new Error('no object to control');
  var controllerFn = object.controllerFunction;
  if (! controllerFn) throw new Error('object does not define a controller function');
  var controller = new controllerFn(this.game, object);
  controller.activate();

  return controller;
}
},{}],8:[function(require,module,exports){
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
},{"./board":4,"./controllers":7}],9:[function(require,module,exports){
(function (global){
var Snap = require('snapsvg');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var matrixAnimatedElems = ['a', 'd', 'e', 'f'];
var moveAnimationDuration = 100;

module.exports = function (el, width, height, size) {
  return new Grid(el, width, height, size);
};

function Grid (el, width, height, size) {

  EventEmitter.call(this);

  var s = Snap(el);
  this.s = s.group();
  this.floor = this.s.group();
  this.items = this.s.group();

  this.size = [ width, height ];
  this.zoomLevel = 1;
  this.viewMatrix = new Snap.Matrix();
  this.tiles = {};
  this.points = {};
  this.selected = [];

  this.moveTo(0, 0);

  setEventHandlers.call(this);
}

util.inherits(Grid, EventEmitter);

var G = Grid.prototype;


/// group

G.group = function(parent) {
  if (! parent) parent = this.items;
  var g = parent.group();
  return g;
};

/// Create Tile

G.createTile = function (x, y) {
  var self = this;
  var points = [
  [ x - 0.5, y + 0.5 ],
  [ x - 0.5, y - 0.5 ],
  [ x + 0.5, y - 0.5 ],
  [ x + 0.5, y + 0.5 ]
  ];
  var poly = points.map(function (pt) { return self.toWorld(pt[0], pt[1]) });

  var tile = new EventEmitter;
  tile.x = x;
  tile.y = y;
  tile.type = 'tile';
  tile.element = self.floor.path(polygon(poly));

  var pt = self.toWorld(x, y);
  tile.screenX = pt[0];
  tile.screenY = pt[1];

  self.tiles[x + ',' + y] = tile;

  return tile;
};

G.tileAt = function (x, y) {
  return this.tiles[x + ',' + y];
};

G.pointAt = function (x, y) {
  return this.points[x + ',' + y];
};

G.imagePos = function (image, x, y) {
  var w = this.toWorld(x, y);

  return {
    x: w[0] - image.width / 2,
    y: w[1] - image.height + 25
  };
}

G.createItem = function (src, x, y, group, cb) {
  var self = this;
  var im = new Image;

  im.addEventListener('load', function () {
    var item = new EventEmitter;
    var imagePos = self.imagePos(im, x, y);
    item.element = group.image(
      src,
      imagePos.x, imagePos.y,
      im.width, im.height
      );
    item.image = im;
    item.x = x;
    item.y = y;

    var pt = self.toWorld(x, y);
    item.screenX = pt[0];
    item.screenY = pt[1];
    item.imageX = imagePos.x;
    item.imageY = imagePos.y;

    if (typeof cb === 'function') cb(null, item);
  });
  im.addEventListener('error', cb);
  im.src = src;
};

G.removeItem = function (item, cb) {
  item.element.remove();
};

G.moveItem = function(item, x, y, cb) {
  var self = this;
  var from = {x: item.imageX, y: item.imageY};
  var to = this.imagePos(item.image, x, y);

  item.x = x;
  item.screenX = to.x;
  item.imageX = to.x;
  item.y = y;
  item.screenY = to.y;
  item.imageY = to.y;

  item.element.animate({x: item.imageX, y: item.imageY}, 100, cb);
};

G.createWall = function (src, pt0, pt1, set, cb) {
  if (pt0.y === pt1.y) {
    var x0 = Math.min(pt0.x, pt1.x);
    var xt = Math.max(pt0.x, pt1.x);
    for (var x = x0; x < xt; x++) {
      this.createItem(src, x + 0.75, pt0.y - 0.25, set, cb);
    }
  }
  else if (pt0.x === pt1.x) {
    var y0 = Math.min(pt0.y, pt1.y);
    var yt = Math.max(pt0.y, pt1.y);
    for (var y = y0; y < yt; y++) {
      this.createItem(src, pt0.x + 0.25, y + 0.25, set, cb);
    }
  }
};

G.move = function (x, y) {
  this.moveTo(this.position[0] + x, this.position[1] + y);
};

G.moveTo = function (x, y) {
  this.position = [ x, y ];
  this._setView();
};

G.pan = function (x, y) {
  var tx = x / 2 + y / 2;
  var ty = x / 2 - y / 2;

  this.move(
    tx / Math.pow(this.zoomLevel, 0.5),
    ty / Math.pow(this.zoomLevel, 0.5)
    );
};

G.zoom = function (level) {
  this.zoomLevel = level;
  this._setView();
};

G._setView = function (duration, cb) {
  if ('function' == typeof duration) {
    cb = duration;
    duration = undefined;
  }

  if (! duration) duration = moveAnimationDuration;

  var self = this;
  var w = this.size[0] / this.zoomLevel;
  var h = this.size[1] / this.zoomLevel;

  var pt = this.toWorld(this.position[0], this.position[1]);
  var x = pt[0] - w / 2;
  var y = pt[1] - h / 2;

  x = -x;
  y = -y;

  var oldMatrix = this.viewMatrix;
  var newMatrix = new Snap.Matrix();
  newMatrix.scale(this.zoomLevel);
  newMatrix.translate(x, y);
  this.viewMatrix = newMatrix;


  // we need to animate matrix elements, a, d, e and f (translate and scale)
  // reference: http://apike.ca/prog_svg_transform.html

  var pending = matrixAnimatedElems.length;

  matrixAnimatedElems.forEach(function(elem) {
    Snap.animate(oldMatrix[elem], newMatrix[elem], setter, duration, oneDone);

    function setter(val) {
      oldMatrix[elem] = val;
      self.s.transform(oldMatrix);
    }

    function oneDone() {
      if (-- pending == 0) done();
    }
  });

  function done() {
      if (cb) cb();
  }
};

G.toWorld = function (x, y) {
  var tx = x / 2 + y / 2;
  var ty = -x / 2 + y / 2;
  return [ tx * 100, ty * 50 ];
};

G.fromWorld = function (tx, ty) {
  var x = tx / 100;
  var y = ty / 50;
  return [ x - y, x + y ];
};

function polygon (points) {
  var xs = points.map(function (p) { return p.join(',') });
  return 'M' + xs[0] + ' L' + xs.slice(1).join(' ') + ' Z';
}

function setEventHandlers() {
  var win = global;
  var self = this;

  var on = typeof win.addEventListener === 'function'
  ? win.addEventListener
  : win.on
  ;
  // on.call(win, 'keydown', function (ev) {
  //     var e = Object.keys(ev).reduce(function (acc, key) {
  //         acc[key] = ev[key];
  //         return acc;
  //     }, {});
  //     var prevented = false;
  //     e.preventDefault = function () {
  //         prevented = true;
  //         ev.preventDefault();
  //     };
  //     self.emit('keydown', e);
  //     if (prevented) return;

  //     var key = ev.keyIdentifier.toLowerCase();
  //     var dz = {
  //         187 : 1 / 0.9,
  //         189 : 0.9,
  //     }[ev.keyCode];
  //     if (dz) return self.zoom(self.zoomLevel * dz);
  //     if (ev.keyCode === 49) return self.zoom(1);

  //     var dxy = {
  //         down : [ 0, -1 ],
  //         up : [ 0, +1 ],
  //         left : [ -1, 0 ],
  //         right : [ +1, 0 ]
  //     }[key];

  //     if (dxy) {
  //         ev.preventDefault();
  //         self.pan(dxy[0], dxy[1]);
  //     }
  // });

  var selected = {};
  self.selected.push(selected);

  on.call(win, 'mousemove', function (ev) {
    var xy = self.fromWorld(
      (ev.clientX - self.size[0] / 2) / self.zoomLevel,
      (ev.clientY - self.size[1] / 2) / self.zoomLevel
      );

    var tx = Math.round(xy[0] + self.position[0]);
    var ty = Math.round(xy[1] + self.position[1]);
    var tile = self.tileAt(tx, ty);

    if (tile && tile !== selected.tile) {
      if (selected.tile) {
        selected.tile.emit('mouseout', ev);
        self.emit('mouseout', selected.tile, ev);
      }
      selected.tile = tile;
      tile.emit('mouseover', ev);
      self.emit('mouseover', tile, ev);
    }

    var px = Math.floor(xy[0] + self.position[0]) + 0.5;
    var py = Math.floor(xy[1] + self.position[1]) + 0.5;
    var pt = self.pointAt(px, py);

    if (pt && pt !== selected.point) {
      if (selected.point) {
        selected.point.emit('mouseout', ev);
        self.emit('mouseout', selected.point, ev);
      }
      selected.point = pt;
      pt.emit('mouseover', ev);
      self.emit('mouseout', pt, ev);
    }
  });

  [ 'click', 'mousedown', 'mouseup' ].forEach(function (evName) {
    on.call(win, evName, function (ev) {
      if (selected.tile) {
        selected.tile.emit(evName, ev);
        self.emit(evName, selected.tile, ev);
      }
      if (selected.point) {
        selected.point.emit(evName, ev);
        self.emit(evName, selected.point, ev);
      }
    });
  });
};
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"events":19,"snapsvg":17,"util":23}],10:[function(require,module,exports){
(function (global){
var k,
  _handlers = {},
  _mods = { 16: false, 18: false, 17: false, 91: false },
  _scope = 'all',
  // modifier keys
  _MODIFIERS = {
    'â‡§': 16, shift: 16,
    'âŒ¥': 18, alt: 18, option: 18,
    'âŒƒ': 17, ctrl: 17, control: 17,
    'âŒ˜': 91, command: 91
  },
  // special keys
  _MAP = {
    backspace: 8, tab: 9, clear: 12,
    enter: 13, 'return': 13,
    esc: 27, escape: 27, space: 32,
    left: 37, up: 38,
    right: 39, down: 40,
    del: 46, 'delete': 46,
    home: 36, end: 35,
    pageup: 33, pagedown: 34,
    ',': 188, '.': 190, '/': 191,
    '`': 192, '-': 189, '=': 187,
    ';': 186, '\'': 222,
    '[': 219, ']': 221, '\\': 220
  },
  code = function(x){
    return _MAP[x] || x.toUpperCase().charCodeAt(0);
  },
  _downKeys = [];

for(k=1;k<20;k++) _MAP['f'+k] = 111+k;

// IE doesn't support Array#indexOf, so have a simple replacement
function index(array, item){
  var i = array.length;
  while(i--) if(array[i]===item) return i;
  return -1;
}

// for comparing mods before unassignment
function compareArray(a1, a2) {
  if (a1.length != a2.length) return false;
  for (var i = 0; i < a1.length; i++) {
      if (a1[i] !== a2[i]) return false;
  }
  return true;
}

var modifierMap = {
    16:'shiftKey',
    18:'altKey',
    17:'ctrlKey',
    91:'metaKey'
};
function updateModifierKey(event) {
    for(k in _mods) _mods[k] = event[modifierMap[k]];
};

// handle keydown event
function dispatch(event) {
  var key, handler, k, i, modifiersMatch, scope;
  key = event.keyCode;

  if (index(_downKeys, key) == -1) {
      _downKeys.push(key);
  }

  // if a modifier key, set the key.<modifierkeyname> property to true and return
  if(key == 93 || key == 224) key = 91; // right command on webkit, command on Gecko
  if(key in _mods) {
    _mods[key] = true;
    // 'assignKey' from inside this closure is exported to window.key
    for(k in _MODIFIERS) if(_MODIFIERS[k] == key) assignKey[k] = true;
    return;
  }
  updateModifierKey(event);

  // see if we need to ignore the keypress (filter() can can be overridden)
  // by default ignore key presses if a select, textarea, or input is focused
  if(!assignKey.filter.call(this, event)) return;

  // abort if no potentially matching shortcuts found
  if (!(key in _handlers)) return;

  scope = getScope();

  // for each potential shortcut
  for (i = 0; i < _handlers[key].length; i++) {
    handler = _handlers[key][i];

    // see if it's in the current scope
    if(handler.scope == scope || handler.scope == 'all'){
      // check if modifiers match if any
      modifiersMatch = handler.mods.length > 0;
      for(k in _mods)
        if((!_mods[k] && index(handler.mods, +k) > -1) ||
          (_mods[k] && index(handler.mods, +k) == -1)) modifiersMatch = false;
      // call the handler and stop the event if neccessary
      if((handler.mods.length == 0 && !_mods[16] && !_mods[18] && !_mods[17] && !_mods[91]) || modifiersMatch){
        if(handler.method(event, handler)===false){
          if(event.preventDefault) event.preventDefault();
            else event.returnValue = false;
          if(event.stopPropagation) event.stopPropagation();
          if(event.cancelBubble) event.cancelBubble = true;
        }
      }
    }
  }
};

// unset modifier keys on keyup
function clearModifier(event){
  var key = event.keyCode, k,
      i = index(_downKeys, key);

  // remove key from _downKeys
  if (i >= 0) {
      _downKeys.splice(i, 1);
  }

  if(key == 93 || key == 224) key = 91;
  if(key in _mods) {
    _mods[key] = false;
    for(k in _MODIFIERS) if(_MODIFIERS[k] == key) assignKey[k] = false;
  }
};

function resetModifiers() {
  for(k in _mods) _mods[k] = false;
  for(k in _MODIFIERS) assignKey[k] = false;
};

// parse and assign shortcut
function assignKey(key, scope, method){
  var keys, mods;
  keys = getKeys(key);
  if (method === undefined) {
    method = scope;
    scope = 'all';
  }

  // for each shortcut
  for (var i = 0; i < keys.length; i++) {
    // set modifier keys if any
    mods = [];
    key = keys[i].split('+');
    if (key.length > 1){
      mods = getMods(key);
      key = [key[key.length-1]];
    }
    // convert to keycode and...
    key = key[0]
    key = code(key);
    // ...store handler
    if (!(key in _handlers)) _handlers[key] = [];
    _handlers[key].push({ shortcut: keys[i], scope: scope, method: method, key: keys[i], mods: mods });
  }
};

// unbind all handlers for given key in current scope
function unbindKey(key, scope) {
  var multipleKeys, keys,
    mods = [],
    i, j, obj;

  multipleKeys = getKeys(key);

  for (j = 0; j < multipleKeys.length; j++) {
    keys = multipleKeys[j].split('+');

    if (keys.length > 1) {
      mods = getMods(keys);
      key = keys[keys.length - 1];
    }

    key = code(key);

    if (scope === undefined) {
      scope = getScope();
    }
    if (!_handlers[key]) {
      return;
    }
    for (i = 0; i < _handlers[key].length; i++) {
      obj = _handlers[key][i];
      // only clear handlers if correct scope and mods match
      if (obj.scope === scope && compareArray(obj.mods, mods)) {
        _handlers[key][i] = {};
      }
    }
  }
};

// Returns true if the key with code 'keyCode' is currently down
// Converts strings into key codes.
function isPressed(keyCode) {
    if (typeof(keyCode)=='string') {
      keyCode = code(keyCode);
    }
    return index(_downKeys, keyCode) != -1;
}

function getPressedKeyCodes() {
    return _downKeys.slice(0);
}

function filter(event){
  var tagName = (event.target || event.srcElement).tagName;
  // ignore keypressed in any elements that support keyboard data input
  return !(tagName == 'INPUT' || tagName == 'SELECT' || tagName == 'TEXTAREA');
}

// initialize key.<modifier> to false
for(k in _MODIFIERS) assignKey[k] = false;

// set current scope (default 'all')
function setScope(scope){ _scope = scope || 'all' };
function getScope(){ return _scope || 'all' };

// delete all handlers for a given scope
function deleteScope(scope){
  var key, handlers, i;

  for (key in _handlers) {
    handlers = _handlers[key];
    for (i = 0; i < handlers.length; ) {
      if (handlers[i].scope === scope) handlers.splice(i, 1);
      else i++;
    }
  }
};

// abstract key logic for assign and unassign
function getKeys(key) {
  var keys;
  key = key.replace(/\s/g, '');
  keys = key.split(',');
  if ((keys[keys.length - 1]) == '') {
    keys[keys.length - 2] += ',';
  }
  return keys;
}

// abstract mods logic for assign and unassign
function getMods(key) {
  var mods = key.slice(0, key.length - 1);
  for (var mi = 0; mi < mods.length; mi++)
  mods[mi] = _MODIFIERS[mods[mi]];
  return mods;
}

// cross-browser events
function addEvent(object, event, method) {
  if (object.addEventListener)
    object.addEventListener(event, method, false);
  else if(object.attachEvent)
    object.attachEvent('on'+event, function(){ method(window.event) });
};

// set the handlers globally on document
addEvent(document, 'keydown', function(event) { dispatch(event) }); // Passing _scope to a callback to ensure it remains the same by execution. Fixes #48
addEvent(document, 'keyup', clearModifier);

// reset modifiers to false whenever the window is (re)focused.
addEvent(window, 'focus', resetModifiers);

// store previously defined key
var previousKey = global.key;

// restore previously defined key and return reference to our key object
function noConflict() {
  var k = global.key;
  global.key = previousKey;
  return k;
}

// set window.key and window.key.set/get/deleteScope, and the default filter
global.key = assignKey;
global.key.setScope = setScope;
global.key.getScope = getScope;
global.key.deleteScope = deleteScope;
global.key.filter = filter;
global.key.isPressed = isPressed;
global.key.getPressedKeyCodes = getPressedKeyCodes;
global.key.noConflict = noConflict;
global.key.unbind = unbindKey;

if(typeof module !== 'undefined') module.exports = global.key;
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],11:[function(require,module,exports){
module.exports = Tiles;

function Tiles(grid) {
  var self = {};

  self.tiles = [];

  self.grid = grid;

  self.create = create;

  return self;
}

function create(x, y) {
  var tile = this.grid.createTile(x, y);
  tile.element.attr('fill', 'rgba(210,210,210,1.0)');
  tile.element.attr('stroke-width', '1');
  tile.element.attr('stroke', 'rgb(255,255,200)');

  tile.on('mouseover', function () {
    console.log('at', tile.x, tile.y);
    // tile.element.toFront();
    tile.element.attr('fill', 'rgba(255,127,127,0.8)');
  });

  tile.on('mouseout', function () {
    // tile.element.toBack();
    tile.element.attr('fill', 'rgba(210,210,210,1.0)');
  });

  this.tiles.push(tile);

  return tile;
}
},{}],12:[function(require,module,exports){
var extend = require('xtend');

module.exports = WallType;

var defaultOptions = {
  images: {
    left: '/sprites/walls/plain/left.png',
    right: '/sprites/walls/plain/right.png'
  },
  traversable: false
}

function WallType(options) {
  var self = {};

  options = extend({}, defaultOptions, options || {});

  self.images = options.images;


  /// methods

  self.image = image;


  return self;
}

function image(orientation) {
  var img = this.images[orientation];
  if (! img) throw new Error('no image for orientation ' + orientation);
  return img;
}
},{"xtend":25}],13:[function(require,module,exports){
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
},{"./wall_type":12}],14:[function(require,module,exports){
var _ = require('underscore');

module.exports = Walls;

function Walls(board) {
  var self = {};

  self.walls = {};

  self.board = board;

  self.place = place;
  self.placeOne = placeOne;
  self.at = at;
  self.traversable = traversable;

  return self;
}

/// place

function place(wallType, from, to) {
  var self = this;

  validateInitialWallCoords(from);
  validateInitialWallCoords(to);

  if (from.x != to.x && from.y != to.y)
    throw new Error('walls must be drawn in a line');

  if (from.x == to.x) {
    var maxY = Math.max(from.y, to.y);
    var minY = Math.min(from.y, to.y);
    for(var y = minY; y < maxY; y = y + 1) {
      self.placeOne(wallType, from.x, y + 0.5);
    }
  } else {
    var maxX = Math.max(from.x, to.x);
    var minX = Math.min(from.x, to.x);
    for(var x = minX; x < maxX; x += 1) {
      self.placeOne(wallType, x + 0.5, from.y);
    }
  }
}


/// placeOne

function placeOne(wallType, x, y) {

  var orientation;

  var xIsZero = validateOneWallCoords(x, y);
  var from, to;
  if(xIsZero) {
    from = {
      x: x - 0.5,
      y: y
    };

    to = {
      x: x + 0.5,
      y: y
    }

    orientation = 'left';
  } else {
    from = {
      x: x,
      y: y - 0.5
    };

    to = {
      x: x,
      y: y + 0.5
    }

    orientation = 'right';
  }

  var image = wallType.image(orientation);

  var row = this.walls[x];
  if (! row) row = this.walls[x] = {};
  row[y] = wallType;

  this.board.createWall(image, from, to);
}

function at(x, y) {
  var wall = this.walls[x];
  if (wall) wall = wall[y];

  return wall;
}


function traversable(from, to) {
  var wall;
  var walls;
  var traversable;

  var diffX = to.x - from.x;
  var diffY = to.y - from.y;

  if (Math.abs(diffX) > 1 || Math.abs(diffY) > 1)
    throw new Error('cannot calculate traversability for distances > 1');

  var midX = from.x + diffX / 2;
  var midY = from.y + diffY / 2;

  if (diffX == 0 || diffY == 0) {
    // no diagonal
    wall = this.at(midX, midY);
    traversable = ! wall || wall.traversable;
  } else {
    // diagonal

    var wall1 = this.at(midX, from.y);
    wall1 = wall1 && !wall1.traversable;

    var wall2 = this.at(to.x, midY);
    wall2 = wall2 && !wall2.traversable;

    var wall3 = this.at(midX, to.y);
    wall3 = wall3 && !wall3.traversable;

    var wall4 = this.at(from.x, midY);
    wall4 = wall4 && !wall4.traversable;

    traversable = (
         !(wall1 && wall2)
      && !(wall2 && wall3)
      && !(wall3 && wall4)
      && !(wall4 && wall1)
      && !(wall1 && wall3)
      && !(wall2 && wall4)
      && !(wall3 && wall1));
  }

  return traversable;
}

function isTraversable(wall) {
  return wall.traversable;
}



/// Misc

function validateInitialWallCoords(coords) {
  var x = coords.x;
  if (Math.abs(Math.round(x) - x) !== 0.5) throw new Error('wall x coordinate must be n.5');
  var y = coords.y;
  if (Math.abs(Math.round(y) - y) !== 0.5) throw new Error('wall y coordinate must be n.5');
}

function validateOneWallCoords(x, y) {
  var xFraction = Math.abs(Math.round(x) - x) === 0.5;
  var yFraction = Math.abs(Math.round(y) - y) === 0.5;

  if (xFraction && yFraction || ! (xFraction || yFraction))
    throw new Error('wall can\'t be placed at ' + x + ', ' + y);

  return xFraction;
}
},{"underscore":18}],15:[function(require,module,exports){
module.exports = ZIndexes;

function ZIndexes(grid, size) {

  var self = {};

  self.grid = grid;
  self.size = size;
  self.halfSize = size / 2;

  self.increments = 0.25;
  self.multiplyBy = 1 / self.increments;

  if (self.halfSize != Math.round(self.halfSize)) throw new Error('need even dimensions');

  self.sets = [];

  /// methods

  self.init = init;
  self.setFor = setFor;
  self.add = add;
  self.remove = remove;
  self.move = move;

  self.init();

  return self;
}


function init() {
  var order = 0;
  for(var i = 0; i < this.size; i += this.increments, order++) {
    var parent = this.sets[order -1];
    var set = this.grid.group(parent);
    set.__index = order;
    this.sets.push(set);
  }
}

function setFor(x, y) {
  x = x + this.halfSize;
  y = this.size - (y + this.halfSize);

  var setIndex = (((x + y) / 2) * this.multiplyBy);
  return  this.sets[setIndex];
}

function add(item) {
  var set = this.setFor(item.x, item.y);
  // console.log('adding %s to (%d, %d) -> set %d', item.name, item.x, item.y, set.__index);
  set.push(item.element);
}

function remove(item) {
  var set = this.setFor(item.x, item.y);
  set.exclude(item.element);
}

function move(item, from, to) {
  var originSet = this.setFor(from.x, from.y);
  var targetSet = this.setFor(item.x, item.y);

  if (originSet != targetSet) {
    targetSet.add(item.element);
  }

}
},{}],16:[function(require,module,exports){
// Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// ┌────────────────────────────────────────────────────────────┐ \\
// │ Eve 0.4.2 - JavaScript Events Library                      │ \\
// ├────────────────────────────────────────────────────────────┤ \\
// │ Author Dmitry Baranovskiy (http://dmitry.baranovskiy.com/) │ \\
// └────────────────────────────────────────────────────────────┘ \\

(function (glob) {
    var version = "0.4.2",
        has = "hasOwnProperty",
        separator = /[\.\/]/,
        wildcard = "*",
        fun = function () {},
        numsort = function (a, b) {
            return a - b;
        },
        current_event,
        stop,
        events = {n: {}},
    /*\
     * eve
     [ method ]

     * Fires event with given `name`, given scope and other parameters.

     > Arguments

     - name (string) name of the *event*, dot (`.`) or slash (`/`) separated
     - scope (object) context for the event handlers
     - varargs (...) the rest of arguments will be sent to event handlers

     = (object) array of returned values from the listeners
    \*/
        eve = function (name, scope) {
			name = String(name);
            var e = events,
                oldstop = stop,
                args = Array.prototype.slice.call(arguments, 2),
                listeners = eve.listeners(name),
                z = 0,
                f = false,
                l,
                indexed = [],
                queue = {},
                out = [],
                ce = current_event,
                errors = [];
            current_event = name;
            stop = 0;
            for (var i = 0, ii = listeners.length; i < ii; i++) if ("zIndex" in listeners[i]) {
                indexed.push(listeners[i].zIndex);
                if (listeners[i].zIndex < 0) {
                    queue[listeners[i].zIndex] = listeners[i];
                }
            }
            indexed.sort(numsort);
            while (indexed[z] < 0) {
                l = queue[indexed[z++]];
                out.push(l.apply(scope, args));
                if (stop) {
                    stop = oldstop;
                    return out;
                }
            }
            for (i = 0; i < ii; i++) {
                l = listeners[i];
                if ("zIndex" in l) {
                    if (l.zIndex == indexed[z]) {
                        out.push(l.apply(scope, args));
                        if (stop) {
                            break;
                        }
                        do {
                            z++;
                            l = queue[indexed[z]];
                            l && out.push(l.apply(scope, args));
                            if (stop) {
                                break;
                            }
                        } while (l)
                    } else {
                        queue[l.zIndex] = l;
                    }
                } else {
                    out.push(l.apply(scope, args));
                    if (stop) {
                        break;
                    }
                }
            }
            stop = oldstop;
            current_event = ce;
            return out.length ? out : null;
        };
		// Undocumented. Debug only.
		eve._events = events;
    /*\
     * eve.listeners
     [ method ]

     * Internal method which gives you array of all event handlers that will be triggered by the given `name`.

     > Arguments

     - name (string) name of the event, dot (`.`) or slash (`/`) separated

     = (array) array of event handlers
    \*/
    eve.listeners = function (name) {
        var names = name.split(separator),
            e = events,
            item,
            items,
            k,
            i,
            ii,
            j,
            jj,
            nes,
            es = [e],
            out = [];
        for (i = 0, ii = names.length; i < ii; i++) {
            nes = [];
            for (j = 0, jj = es.length; j < jj; j++) {
                e = es[j].n;
                items = [e[names[i]], e[wildcard]];
                k = 2;
                while (k--) {
                    item = items[k];
                    if (item) {
                        nes.push(item);
                        out = out.concat(item.f || []);
                    }
                }
            }
            es = nes;
        }
        return out;
    };
    
    /*\
     * eve.on
     [ method ]
     **
     * Binds given event handler with a given name. You can use wildcards “`*`” for the names:
     | eve.on("*.under.*", f);
     | eve("mouse.under.floor"); // triggers f
     * Use @eve to trigger the listener.
     **
     > Arguments
     **
     - name (string) name of the event, dot (`.`) or slash (`/`) separated, with optional wildcards
     - f (function) event handler function
     **
     = (function) returned function accepts a single numeric parameter that represents z-index of the handler. It is an optional feature and only used when you need to ensure that some subset of handlers will be invoked in a given order, despite of the order of assignment. 
     > Example:
     | eve.on("mouse", eatIt)(2);
     | eve.on("mouse", scream);
     | eve.on("mouse", catchIt)(1);
     * This will ensure that `catchIt()` function will be called before `eatIt()`.
	 *
     * If you want to put your handler before non-indexed handlers, specify a negative value.
     * Note: I assume most of the time you don’t need to worry about z-index, but it’s nice to have this feature “just in case”.
    \*/
    eve.on = function (name, f) {
		name = String(name);
		if (typeof f != "function") {
			return function () {};
		}
        var names = name.split(separator),
            e = events;
        for (var i = 0, ii = names.length; i < ii; i++) {
            e = e.n;
            e = e.hasOwnProperty(names[i]) && e[names[i]] || (e[names[i]] = {n: {}});
        }
        e.f = e.f || [];
        for (i = 0, ii = e.f.length; i < ii; i++) if (e.f[i] == f) {
            return fun;
        }
        e.f.push(f);
        return function (zIndex) {
            if (+zIndex == +zIndex) {
                f.zIndex = +zIndex;
            }
        };
    };
    /*\
     * eve.f
     [ method ]
     **
     * Returns function that will fire given event with optional arguments.
	 * Arguments that will be passed to the result function will be also
	 * concated to the list of final arguments.
 	 | el.onclick = eve.f("click", 1, 2);
 	 | eve.on("click", function (a, b, c) {
 	 |     console.log(a, b, c); // 1, 2, [event object]
 	 | });
     > Arguments
	 - event (string) event name
	 - varargs (…) and any other arguments
	 = (function) possible event handler function
    \*/
	eve.f = function (event) {
		var attrs = [].slice.call(arguments, 1);
		return function () {
			eve.apply(null, [event, null].concat(attrs).concat([].slice.call(arguments, 0)));
		};
	};
    /*\
     * eve.stop
     [ method ]
     **
     * Is used inside an event handler to stop the event, preventing any subsequent listeners from firing.
    \*/
    eve.stop = function () {
        stop = 1;
    };
    /*\
     * eve.nt
     [ method ]
     **
     * Could be used inside event handler to figure out actual name of the event.
     **
     > Arguments
     **
     - subname (string) #optional subname of the event
     **
     = (string) name of the event, if `subname` is not specified
     * or
     = (boolean) `true`, if current event’s name contains `subname`
    \*/
    eve.nt = function (subname) {
        if (subname) {
            return new RegExp("(?:\\.|\\/|^)" + subname + "(?:\\.|\\/|$)").test(current_event);
        }
        return current_event;
    };
    /*\
     * eve.nts
     [ method ]
     **
     * Could be used inside event handler to figure out actual name of the event.
     **
     **
     = (array) names of the event
    \*/
    eve.nts = function () {
        return current_event.split(separator);
    };
    /*\
     * eve.off
     [ method ]
     **
     * Removes given function from the list of event listeners assigned to given name.
	 * If no arguments specified all the events will be cleared.
     **
     > Arguments
     **
     - name (string) name of the event, dot (`.`) or slash (`/`) separated, with optional wildcards
     - f (function) event handler function
    \*/
    /*\
     * eve.unbind
     [ method ]
     **
     * See @eve.off
    \*/
    eve.off = eve.unbind = function (name, f) {
		if (!name) {
		    eve._events = events = {n: {}};
			return;
		}
        var names = name.split(separator),
            e,
            key,
            splice,
            i, ii, j, jj,
            cur = [events];
        for (i = 0, ii = names.length; i < ii; i++) {
            for (j = 0; j < cur.length; j += splice.length - 2) {
                splice = [j, 1];
                e = cur[j].n;
                if (names[i] != wildcard) {
                    if (e[names[i]]) {
                        splice.push(e[names[i]]);
                    }
                } else {
                    for (key in e) if (e[has](key)) {
                        splice.push(e[key]);
                    }
                }
                cur.splice.apply(cur, splice);
            }
        }
        for (i = 0, ii = cur.length; i < ii; i++) {
            e = cur[i];
            while (e.n) {
                if (f) {
                    if (e.f) {
                        for (j = 0, jj = e.f.length; j < jj; j++) if (e.f[j] == f) {
                            e.f.splice(j, 1);
                            break;
                        }
                        !e.f.length && delete e.f;
                    }
                    for (key in e.n) if (e.n[has](key) && e.n[key].f) {
                        var funcs = e.n[key].f;
                        for (j = 0, jj = funcs.length; j < jj; j++) if (funcs[j] == f) {
                            funcs.splice(j, 1);
                            break;
                        }
                        !funcs.length && delete e.n[key].f;
                    }
                } else {
                    delete e.f;
                    for (key in e.n) if (e.n[has](key) && e.n[key].f) {
                        delete e.n[key].f;
                    }
                }
                e = e.n;
            }
        }
    };
    /*\
     * eve.once
     [ method ]
     **
     * Binds given event handler with a given name to only run once then unbind itself.
     | eve.once("login", f);
     | eve("login"); // triggers f
     | eve("login"); // no listeners
     * Use @eve to trigger the listener.
     **
     > Arguments
     **
     - name (string) name of the event, dot (`.`) or slash (`/`) separated, with optional wildcards
     - f (function) event handler function
     **
     = (function) same return function as @eve.on
    \*/
    eve.once = function (name, f) {
        var f2 = function () {
            eve.unbind(name, f2);
            return f.apply(this, arguments);
        };
        return eve.on(name, f2);
    };
    /*\
     * eve.version
     [ property (string) ]
     **
     * Current version of the library.
    \*/
    eve.version = version;
    eve.toString = function () {
        return "You are running Eve " + version;
    };
    (typeof module != "undefined" && module.exports) ? (module.exports = eve) : (typeof define != "undefined" ? (define("eve", [], function() { return eve; })) : (glob.eve = eve));
})(this);

},{}],17:[function(require,module,exports){
// Snap.svg 0.2.0
// 
// Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// 
// build: 2014-02-08
// Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
// ┌────────────────────────────────────────────────────────────┐ \\
// │ Eve 0.4.2 - JavaScript Events Library                      │ \\
// ├────────────────────────────────────────────────────────────┤ \\
// │ Author Dmitry Baranovskiy (http://dmitry.baranovskiy.com/) │ \\
// └────────────────────────────────────────────────────────────┘ \\

(function (glob) {
    var version = "0.4.2",
        has = "hasOwnProperty",
        separator = /[\.\/]/,
        wildcard = "*",
        fun = function () {},
        numsort = function (a, b) {
            return a - b;
        },
        current_event,
        stop,
        events = {n: {}},
    /*\
     * eve
     [ method ]

     * Fires event with given `name`, given scope and other parameters.

     > Arguments

     - name (string) name of the *event*, dot (`.`) or slash (`/`) separated
     - scope (object) context for the event handlers
     - varargs (...) the rest of arguments will be sent to event handlers

     = (object) array of returned values from the listeners
    \*/
        eve = function (name, scope) {
			name = String(name);
            var e = events,
                oldstop = stop,
                args = Array.prototype.slice.call(arguments, 2),
                listeners = eve.listeners(name),
                z = 0,
                f = false,
                l,
                indexed = [],
                queue = {},
                out = [],
                ce = current_event,
                errors = [];
            current_event = name;
            stop = 0;
            for (var i = 0, ii = listeners.length; i < ii; i++) if ("zIndex" in listeners[i]) {
                indexed.push(listeners[i].zIndex);
                if (listeners[i].zIndex < 0) {
                    queue[listeners[i].zIndex] = listeners[i];
                }
            }
            indexed.sort(numsort);
            while (indexed[z] < 0) {
                l = queue[indexed[z++]];
                out.push(l.apply(scope, args));
                if (stop) {
                    stop = oldstop;
                    return out;
                }
            }
            for (i = 0; i < ii; i++) {
                l = listeners[i];
                if ("zIndex" in l) {
                    if (l.zIndex == indexed[z]) {
                        out.push(l.apply(scope, args));
                        if (stop) {
                            break;
                        }
                        do {
                            z++;
                            l = queue[indexed[z]];
                            l && out.push(l.apply(scope, args));
                            if (stop) {
                                break;
                            }
                        } while (l)
                    } else {
                        queue[l.zIndex] = l;
                    }
                } else {
                    out.push(l.apply(scope, args));
                    if (stop) {
                        break;
                    }
                }
            }
            stop = oldstop;
            current_event = ce;
            return out.length ? out : null;
        };
		// Undocumented. Debug only.
		eve._events = events;
    /*\
     * eve.listeners
     [ method ]

     * Internal method which gives you array of all event handlers that will be triggered by the given `name`.

     > Arguments

     - name (string) name of the event, dot (`.`) or slash (`/`) separated

     = (array) array of event handlers
    \*/
    eve.listeners = function (name) {
        var names = name.split(separator),
            e = events,
            item,
            items,
            k,
            i,
            ii,
            j,
            jj,
            nes,
            es = [e],
            out = [];
        for (i = 0, ii = names.length; i < ii; i++) {
            nes = [];
            for (j = 0, jj = es.length; j < jj; j++) {
                e = es[j].n;
                items = [e[names[i]], e[wildcard]];
                k = 2;
                while (k--) {
                    item = items[k];
                    if (item) {
                        nes.push(item);
                        out = out.concat(item.f || []);
                    }
                }
            }
            es = nes;
        }
        return out;
    };
    
    /*\
     * eve.on
     [ method ]
     **
     * Binds given event handler with a given name. You can use wildcards “`*`” for the names:
     | eve.on("*.under.*", f);
     | eve("mouse.under.floor"); // triggers f
     * Use @eve to trigger the listener.
     **
     > Arguments
     **
     - name (string) name of the event, dot (`.`) or slash (`/`) separated, with optional wildcards
     - f (function) event handler function
     **
     = (function) returned function accepts a single numeric parameter that represents z-index of the handler. It is an optional feature and only used when you need to ensure that some subset of handlers will be invoked in a given order, despite of the order of assignment. 
     > Example:
     | eve.on("mouse", eatIt)(2);
     | eve.on("mouse", scream);
     | eve.on("mouse", catchIt)(1);
     * This will ensure that `catchIt()` function will be called before `eatIt()`.
	 *
     * If you want to put your handler before non-indexed handlers, specify a negative value.
     * Note: I assume most of the time you don’t need to worry about z-index, but it’s nice to have this feature “just in case”.
    \*/
    eve.on = function (name, f) {
		name = String(name);
		if (typeof f != "function") {
			return function () {};
		}
        var names = name.split(separator),
            e = events;
        for (var i = 0, ii = names.length; i < ii; i++) {
            e = e.n;
            e = e.hasOwnProperty(names[i]) && e[names[i]] || (e[names[i]] = {n: {}});
        }
        e.f = e.f || [];
        for (i = 0, ii = e.f.length; i < ii; i++) if (e.f[i] == f) {
            return fun;
        }
        e.f.push(f);
        return function (zIndex) {
            if (+zIndex == +zIndex) {
                f.zIndex = +zIndex;
            }
        };
    };
    /*\
     * eve.f
     [ method ]
     **
     * Returns function that will fire given event with optional arguments.
	 * Arguments that will be passed to the result function will be also
	 * concated to the list of final arguments.
 	 | el.onclick = eve.f("click", 1, 2);
 	 | eve.on("click", function (a, b, c) {
 	 |     console.log(a, b, c); // 1, 2, [event object]
 	 | });
     > Arguments
	 - event (string) event name
	 - varargs (…) and any other arguments
	 = (function) possible event handler function
    \*/
	eve.f = function (event) {
		var attrs = [].slice.call(arguments, 1);
		return function () {
			eve.apply(null, [event, null].concat(attrs).concat([].slice.call(arguments, 0)));
		};
	};
    /*\
     * eve.stop
     [ method ]
     **
     * Is used inside an event handler to stop the event, preventing any subsequent listeners from firing.
    \*/
    eve.stop = function () {
        stop = 1;
    };
    /*\
     * eve.nt
     [ method ]
     **
     * Could be used inside event handler to figure out actual name of the event.
     **
     > Arguments
     **
     - subname (string) #optional subname of the event
     **
     = (string) name of the event, if `subname` is not specified
     * or
     = (boolean) `true`, if current event’s name contains `subname`
    \*/
    eve.nt = function (subname) {
        if (subname) {
            return new RegExp("(?:\\.|\\/|^)" + subname + "(?:\\.|\\/|$)").test(current_event);
        }
        return current_event;
    };
    /*\
     * eve.nts
     [ method ]
     **
     * Could be used inside event handler to figure out actual name of the event.
     **
     **
     = (array) names of the event
    \*/
    eve.nts = function () {
        return current_event.split(separator);
    };
    /*\
     * eve.off
     [ method ]
     **
     * Removes given function from the list of event listeners assigned to given name.
	 * If no arguments specified all the events will be cleared.
     **
     > Arguments
     **
     - name (string) name of the event, dot (`.`) or slash (`/`) separated, with optional wildcards
     - f (function) event handler function
    \*/
    /*\
     * eve.unbind
     [ method ]
     **
     * See @eve.off
    \*/
    eve.off = eve.unbind = function (name, f) {
		if (!name) {
		    eve._events = events = {n: {}};
			return;
		}
        var names = name.split(separator),
            e,
            key,
            splice,
            i, ii, j, jj,
            cur = [events];
        for (i = 0, ii = names.length; i < ii; i++) {
            for (j = 0; j < cur.length; j += splice.length - 2) {
                splice = [j, 1];
                e = cur[j].n;
                if (names[i] != wildcard) {
                    if (e[names[i]]) {
                        splice.push(e[names[i]]);
                    }
                } else {
                    for (key in e) if (e[has](key)) {
                        splice.push(e[key]);
                    }
                }
                cur.splice.apply(cur, splice);
            }
        }
        for (i = 0, ii = cur.length; i < ii; i++) {
            e = cur[i];
            while (e.n) {
                if (f) {
                    if (e.f) {
                        for (j = 0, jj = e.f.length; j < jj; j++) if (e.f[j] == f) {
                            e.f.splice(j, 1);
                            break;
                        }
                        !e.f.length && delete e.f;
                    }
                    for (key in e.n) if (e.n[has](key) && e.n[key].f) {
                        var funcs = e.n[key].f;
                        for (j = 0, jj = funcs.length; j < jj; j++) if (funcs[j] == f) {
                            funcs.splice(j, 1);
                            break;
                        }
                        !funcs.length && delete e.n[key].f;
                    }
                } else {
                    delete e.f;
                    for (key in e.n) if (e.n[has](key) && e.n[key].f) {
                        delete e.n[key].f;
                    }
                }
                e = e.n;
            }
        }
    };
    /*\
     * eve.once
     [ method ]
     **
     * Binds given event handler with a given name to only run once then unbind itself.
     | eve.once("login", f);
     | eve("login"); // triggers f
     | eve("login"); // no listeners
     * Use @eve to trigger the listener.
     **
     > Arguments
     **
     - name (string) name of the event, dot (`.`) or slash (`/`) separated, with optional wildcards
     - f (function) event handler function
     **
     = (function) same return function as @eve.on
    \*/
    eve.once = function (name, f) {
        var f2 = function () {
            eve.unbind(name, f2);
            return f.apply(this, arguments);
        };
        return eve.on(name, f2);
    };
    /*\
     * eve.version
     [ property (string) ]
     **
     * Current version of the library.
    \*/
    eve.version = version;
    eve.toString = function () {
        return "You are running Eve " + version;
    };
    (typeof module != "undefined" && module.exports) ? (module.exports = eve) : (typeof define != "undefined" ? (define("eve", [], function() { return eve; })) : (glob.eve = eve));
})(this);

(function (glob, factory) {
    // AMD support
    if (typeof define === "function" && define.amd) {
        // Define as an anonymous module
        define(["eve"], function( eve ) {
            return factory(glob, eve);
        });
    } else if (typeof exports !== 'undefined') {
        // Next for Node.js or CommonJS
        var eve = require('eve');
        module.exports = factory(glob, eve);
    } else {
        // Browser globals (glob is window)
        // Snap adds itself to window
        factory(glob, glob.eve);
    }
}(window || this, function (window, eve) {

// Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
var mina = (function (eve) {
    var animations = {},
    requestAnimFrame = window.requestAnimationFrame       ||
                       window.webkitRequestAnimationFrame ||
                       window.mozRequestAnimationFrame    ||
                       window.oRequestAnimationFrame      ||
                       window.msRequestAnimationFrame     ||
                       function (callback) {
                           setTimeout(callback, 16);
                       },
    isArray = Array.isArray || function (a) {
        return a instanceof Array ||
            Object.prototype.toString.call(a) == "[object Array]";
    },
    idgen = 0,
    idprefix = "M" + (+new Date).toString(36),
    ID = function () {
        return idprefix + (idgen++).toString(36);
    },
    diff = function (a, b, A, B) {
        if (isArray(a)) {
            res = [];
            for (var i = 0, ii = a.length; i < ii; i++) {
                res[i] = diff(a[i], b, A[i], B);
            }
            return res;
        }
        var dif = (A - a) / (B - b);
        return function (bb) {
            return a + dif * (bb - b);
        };
    },
    timer = Date.now || function () {
        return +new Date;
    },
    sta = function (val) {
        var a = this;
        if (val == null) {
            return a.s;
        }
        var ds = a.s - val;
        a.b += a.dur * ds;
        a.B += a.dur * ds;
        a.s = val;
    },
    speed = function (val) {
        var a = this;
        if (val == null) {
            return a.spd;
        }
        a.spd = val;
    },
    duration = function (val) {
        var a = this;
        if (val == null) {
            return a.dur;
        }
        a.s = a.s * val / a.dur;
        a.dur = val;
    },
    stopit = function () {
        var a = this;
        delete animations[a.id];
        eve("mina.stop." + a.id, a);
    },
    pause = function () {
        var a = this;
        if (a.pdif) {
            return;
        }
        delete animations[a.id];
        a.pdif = a.get() - a.b;
    },
    resume = function () {
        var a = this;
        if (!a.pdif) {
            return;
        }
        a.b = a.get() - a.pdif;
        delete a.pdif;
        animations[a.id] = a;
    },
    frame = function () {
        var len = 0;
        for (var i in animations) if (animations.hasOwnProperty(i)) {
            var a = animations[i],
                b = a.get(),
                res;
            len++;
            a.s = (b - a.b) / (a.dur / a.spd);
            if (a.s >= 1) {
                delete animations[i];
                a.s = 1;
                len--;
                (function (a) {
                    setTimeout(function () {
                        eve("mina.finish." + a.id, a);
                    });
                }(a));
            }
            if (isArray(a.start)) {
                res = [];
                for (var j = 0, jj = a.start.length; j < jj; j++) {
                    res[j] = +a.start[j] +
                        (a.end[j] - a.start[j]) * a.easing(a.s);
                }
            } else {
                res = +a.start + (a.end - a.start) * a.easing(a.s);
            }
            a.set(res);
        }
        len && requestAnimFrame(frame);
    },
    // SIERRA Unfamiliar with the word _slave_ in this context. Also, I don't know what _gereal_ means. Do you mean _general_?
    /*\
     * mina
     [ method ]
     **
     * Generic animation of numbers
     **
     - a (number) start _slave_ number
     - A (number) end _slave_ number
     - b (number) start _master_ number (start time in general case)
     - B (number) end _master_ number (end time in gereal case)
     - get (function) getter of _master_ number (see @mina.time)
     - set (function) setter of _slave_ number
     - easing (function) #optional easing function, default is @mina.linear
     = (object) animation descriptor
     o {
     o         id (string) animation id,
     o         start (number) start _slave_ number,
     o         end (number) end _slave_ number,
     o         b (number) start _master_ number,
     o         s (number) animation status (0..1),
     o         dur (number) animation duration,
     o         spd (number) animation speed,
     o         get (function) getter of _master_ number (see @mina.time),
     o         set (function) setter of _slave_ number,
     o         easing (function) easing function, default is @mina.linear,
     o         status (function) status getter/setter,
     o         speed (function) speed getter/setter,
     o         duration (function) duration getter/setter,
     o         stop (function) animation stopper
     o }
    \*/
    mina = function (a, A, b, B, get, set, easing) {
        var anim = {
            id: ID(),
            start: a,
            end: A,
            b: b,
            s: 0,
            dur: B - b,
            spd: 1,
            get: get,
            set: set,
            easing: easing || mina.linear,
            status: sta,
            speed: speed,
            duration: duration,
            stop: stopit,
            pause: pause,
            resume: resume
        };
        animations[anim.id] = anim;
        var len = 0, i;
        for (i in animations) if (animations.hasOwnProperty(i)) {
            len++;
            if (len == 2) {
                break;
            }
        }
        len == 1 && requestAnimFrame(frame);
        return anim;
    };
    /*\
     * mina.time
     [ method ]
     **
     * Returns the current time. Equivalent to:
     | function () {
     |     return (new Date).getTime();
     | }
    \*/
    mina.time = timer;
    /*\
     * mina.getById
     [ method ]
     **
     * Returns an animation by its id
     - id (string) animation's id
     = (object) See @mina
    \*/
    mina.getById = function (id) {
        return animations[id] || null;
    };

    /*\
     * mina.linear
     [ method ]
     **
     * Default linear easing
     - n (number) input 0..1
     = (number) output 0..1
    \*/
    mina.linear = function (n) {
        return n;
    };
    /*\
     * mina.easeout
     [ method ]
     **
     * Easeout easing
     - n (number) input 0..1
     = (number) output 0..1
    \*/
    mina.easeout = function (n) {
        return Math.pow(n, 1.7);
    };
    /*\
     * mina.easein
     [ method ]
     **
     * Easein easing
     - n (number) input 0..1
     = (number) output 0..1
    \*/
    mina.easein = function (n) {
        return Math.pow(n, .48);
    };
    /*\
     * mina.easeinout
     [ method ]
     **
     * Easeinout easing
     - n (number) input 0..1
     = (number) output 0..1
    \*/
    mina.easeinout = function (n) {
        if (n == 1) {
            return 1;
        }
        if (n == 0) {
            return 0;
        }
        var q = .48 - n / 1.04,
            Q = Math.sqrt(.1734 + q * q),
            x = Q - q,
            X = Math.pow(Math.abs(x), 1 / 3) * (x < 0 ? -1 : 1),
            y = -Q - q,
            Y = Math.pow(Math.abs(y), 1 / 3) * (y < 0 ? -1 : 1),
            t = X + Y + .5;
        return (1 - t) * 3 * t * t + t * t * t;
    };
    /*\
     * mina.backin
     [ method ]
     **
     * Backin easing
     - n (number) input 0..1
     = (number) output 0..1
    \*/
    mina.backin = function (n) {
        if (n == 1) {
            return 1;
        }
        var s = 1.70158;
        return n * n * ((s + 1) * n - s);
    };
    /*\
     * mina.backout
     [ method ]
     **
     * Backout easing
     - n (number) input 0..1
     = (number) output 0..1
    \*/
    mina.backout = function (n) {
        if (n == 0) {
            return 0;
        }
        n = n - 1;
        var s = 1.70158;
        return n * n * ((s + 1) * n + s) + 1;
    };
    /*\
     * mina.elastic
     [ method ]
     **
     * Elastic easing
     - n (number) input 0..1
     = (number) output 0..1
    \*/
    mina.elastic = function (n) {
        if (n == !!n) {
            return n;
        }
        return Math.pow(2, -10 * n) * Math.sin((n - .075) *
            (2 * Math.PI) / .3) + 1;
    };
    /*\
     * mina.bounce
     [ method ]
     **
     * Bounce easing
     - n (number) input 0..1
     = (number) output 0..1
    \*/
    mina.bounce = function (n) {
        var s = 7.5625,
            p = 2.75,
            l;
        if (n < (1 / p)) {
            l = s * n * n;
        } else {
            if (n < (2 / p)) {
                n -= (1.5 / p);
                l = s * n * n + .75;
            } else {
                if (n < (2.5 / p)) {
                    n -= (2.25 / p);
                    l = s * n * n + .9375;
                } else {
                    n -= (2.625 / p);
                    l = s * n * n + .984375;
                }
            }
        }
        return l;
    };
    window.mina = mina;
    return mina;
})(typeof eve == "undefined" ? function () {} : eve);
// Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var Snap = (function(root) {
Snap.version = "0.2.0";
/*\
 * Snap
 [ method ]
 **
 * Creates a drawing surface or wraps existing SVG element.
 **
 - width (number|string) width of surface
 - height (number|string) height of surface
 * or
 - DOM (SVGElement) element to be wrapped into Snap structure
 * or
 - query (string) CSS query selector
 = (object) @Element
\*/
function Snap(w, h) {
    if (w) {
        if (w.tagName) {
            return wrap(w);
        }
        if (w instanceof Element) {
            return w;
        }
        if (h == null) {
            w = glob.doc.querySelector(w);
            return wrap(w);
        }
    }
    w = w == null ? "100%" : w;
    h = h == null ? "100%" : h;
    return new Paper(w, h);
}
Snap.toString = function () {
    return "Snap v" + this.version;
};
Snap._ = {};
var glob = {
    win: root.window,
    doc: root.window.document
};
Snap._.glob = glob;
var has = "hasOwnProperty",
    Str = String,
    toFloat = parseFloat,
    toInt = parseInt,
    math = Math,
    mmax = math.max,
    mmin = math.min,
    abs = math.abs,
    pow = math.pow,
    PI = math.PI,
    round = math.round,
    E = "",
    S = " ",
    objectToString = Object.prototype.toString,
    ISURL = /^url\(['"]?([^\)]+?)['"]?\)$/i,
    colourRegExp = /^\s*((#[a-f\d]{6})|(#[a-f\d]{3})|rgba?\(\s*([\d\.]+%?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+%?)?)\s*\)|hsba?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+(?:%?\s*,\s*[\d\.]+)?%?)\s*\)|hsla?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+(?:%?\s*,\s*[\d\.]+)?%?)\s*\))\s*$/i,
    bezierrg = /^(?:cubic-)?bezier\(([^,]+),([^,]+),([^,]+),([^\)]+)\)/,
    reURLValue = /^url\(#?([^)]+)\)$/,
    spaces = "\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029",
    separator = new RegExp("[," + spaces + "]+"),
    whitespace = new RegExp("[" + spaces + "]", "g"),
    commaSpaces = new RegExp("[" + spaces + "]*,[" + spaces + "]*"),
    hsrg = {hs: 1, rg: 1},
    pathCommand = new RegExp("([a-z])[" + spaces + ",]*((-?\\d*\\.?\\d*(?:e[\\-+]?\\d+)?[" + spaces + "]*,?[" + spaces + "]*)+)", "ig"),
    tCommand = new RegExp("([rstm])[" + spaces + ",]*((-?\\d*\\.?\\d*(?:e[\\-+]?\\d+)?[" + spaces + "]*,?[" + spaces + "]*)+)", "ig"),
    pathValues = new RegExp("(-?\\d*\\.?\\d*(?:e[\\-+]?\\d+)?)[" + spaces + "]*,?[" + spaces + "]*", "ig"),
    idgen = 0,
    idprefix = "S" + (+new Date).toString(36),
    ID = function () {
        return idprefix + (idgen++).toString(36);
    },
    xlink = "http://www.w3.org/1999/xlink",
    xmlns = "http://www.w3.org/2000/svg",
    hub = {},
    URL = Snap.url = function (url) {
        return "url('#" + url + "')";
    };

function $(el, attr) {
    if (attr) {
        if (typeof el == "string") {
            el = $(el);
        }
        if (typeof attr == "string") {
            if (attr.substring(0, 6) == "xlink:") {
                return el.getAttributeNS(xlink, attr.substring(6));
            }
            if (attr.substring(0, 4) == "xml:") {
                return el.getAttributeNS(xmlns, attr.substring(4));
            }
            return el.getAttribute(attr);
        }
        for (var key in attr) if (attr[has](key)) {
            var val = Str(attr[key]);
            if (val) {
                if (key.substring(0, 6) == "xlink:") {
                    el.setAttributeNS(xlink, key.substring(6), val);
                } else if (key.substring(0, 4) == "xml:") {
                    el.setAttributeNS(xmlns, key.substring(4), val);
                } else {
                    el.setAttribute(key, val);
                }
            } else {
                el.removeAttribute(key);
            }
        }
    } else {
        el = glob.doc.createElementNS(xmlns, el);
        // el.style && (el.style.webkitTapHighlightColor = "rgba(0,0,0,0)");
    }
    return el;
}
Snap._.$ = $;
Snap._.id = ID;
function getAttrs(el) {
    var attrs = el.attributes,
        name,
        out = {};
    for (var i = 0; i < attrs.length; i++) {
        if (attrs[i].namespaceURI == xlink) {
            name = "xlink:";
        } else {
            name = "";
        }
        name += attrs[i].name;
        out[name] = attrs[i].textContent;
    }
    return out;
}
function is(o, type) {
    type = Str.prototype.toLowerCase.call(type);
    if (type == "finite") {
        return isFinite(o);
    }
    if (type == "array" &&
        (o instanceof Array || Array.isArray && Array.isArray(o))) {
        return true;
    }
    return  (type == "null" && o === null) ||
            (type == typeof o && o !== null) ||
            (type == "object" && o === Object(o)) ||
            objectToString.call(o).slice(8, -1).toLowerCase() == type;
}
/*\
 * Snap.format
 [ method ]
 **
 * Replaces construction of type `{<name>}` to the corresponding argument
 **
 - token (string) string to format
 - json (object) object which properties are used as a replacement
 = (string) formatted string
 > Usage
 | // this draws a rectangular shape equivalent to "M10,20h40v50h-40z"
 | paper.path(Snap.format("M{x},{y}h{dim.width}v{dim.height}h{dim['negative width']}z", {
 |     x: 10,
 |     y: 20,
 |     dim: {
 |         width: 40,
 |         height: 50,
 |         "negative width": -40
 |     }
 | }));
\*/
Snap.format = (function () {
    var tokenRegex = /\{([^\}]+)\}/g,
        objNotationRegex = /(?:(?:^|\.)(.+?)(?=\[|\.|$|\()|\[('|")(.+?)\2\])(\(\))?/g, // matches .xxxxx or ["xxxxx"] to run over object properties
        replacer = function (all, key, obj) {
            var res = obj;
            key.replace(objNotationRegex, function (all, name, quote, quotedName, isFunc) {
                name = name || quotedName;
                if (res) {
                    if (name in res) {
                        res = res[name];
                    }
                    typeof res == "function" && isFunc && (res = res());
                }
            });
            res = (res == null || res == obj ? all : res) + "";
            return res;
        };
    return function (str, obj) {
        return Str(str).replace(tokenRegex, function (all, key) {
            return replacer(all, key, obj);
        });
    };
})();
var preload = (function () {
    function onerror() {
        this.parentNode.removeChild(this);
    }
    return function (src, f) {
        var img = glob.doc.createElement("img"),
            body = glob.doc.body;
        img.style.cssText = "position:absolute;left:-9999em;top:-9999em";
        img.onload = function () {
            f.call(img);
            img.onload = img.onerror = null;
            body.removeChild(img);
        };
        img.onerror = onerror;
        body.appendChild(img);
        img.src = src;
    };
}());
function clone(obj) {
    if (typeof obj == "function" || Object(obj) !== obj) {
        return obj;
    }
    var res = new obj.constructor;
    for (var key in obj) if (obj[has](key)) {
        res[key] = clone(obj[key]);
    }
    return res;
}
Snap._.clone = clone;
function repush(array, item) {
    for (var i = 0, ii = array.length; i < ii; i++) if (array[i] === item) {
        return array.push(array.splice(i, 1)[0]);
    }
}
function cacher(f, scope, postprocessor) {
    function newf() {
        var arg = Array.prototype.slice.call(arguments, 0),
            args = arg.join("\u2400"),
            cache = newf.cache = newf.cache || {},
            count = newf.count = newf.count || [];
        if (cache[has](args)) {
            repush(count, args);
            return postprocessor ? postprocessor(cache[args]) : cache[args];
        }
        count.length >= 1e3 && delete cache[count.shift()];
        count.push(args);
        cache[args] = f.apply(scope, arg);
        return postprocessor ? postprocessor(cache[args]) : cache[args];
    }
    return newf;
}
Snap._.cacher = cacher;
function angle(x1, y1, x2, y2, x3, y3) {
    if (x3 == null) {
        var x = x1 - x2,
            y = y1 - y2;
        if (!x && !y) {
            return 0;
        }
        return (180 + math.atan2(-y, -x) * 180 / PI + 360) % 360;
    } else {
        return angle(x1, y1, x3, y3) - angle(x2, y2, x3, y3);
    }
}
function rad(deg) {
    return deg % 360 * PI / 180;
}
function deg(rad) {
    return rad * 180 / PI % 360;
}
function x_y() {
    return this.x + S + this.y;
}
function x_y_w_h() {
    return this.x + S + this.y + S + this.width + " \xd7 " + this.height;
}

/*\
 * Snap.rad
 [ method ]
 **
 * Transform angle to radians
 - deg (number) angle in degrees
 = (number) angle in radians
\*/
Snap.rad = rad;
/*\
 * Snap.deg
 [ method ]
 **
 * Transform angle to degrees
 - rad (number) angle in radians
 = (number) angle in degrees
\*/
Snap.deg = deg;
// SIERRA for which point is the angle calculated?
/*\
 * Snap.angle
 [ method ]
 **
 * Returns an angle between two or three points
 > Parameters
 - x1 (number) x coord of first point
 - y1 (number) y coord of first point
 - x2 (number) x coord of second point
 - y2 (number) y coord of second point
 - x3 (number) #optional x coord of third point
 - y3 (number) #optional y coord of third point
 = (number) angle in degrees
\*/
Snap.angle = angle;
/*\
 * Snap.is
 [ method ]
 **
 * Handy replacement for the `typeof` operator
 - o (…) any object or primitive
 - type (string) name of the type, e.g., `string`, `function`, `number`, etc.
 = (boolean) `true` if given value is of given type
\*/
Snap.is = is;
/*\
 * Snap.snapTo
 [ method ]
 **
 * Snaps given value to given grid
 - values (array|number) given array of values or step of the grid
 - value (number) value to adjust
 - tolerance (number) #optional maximum distance to the target value that would trigger the snap. Default is `10`.
 = (number) adjusted value
\*/
Snap.snapTo = function (values, value, tolerance) {
    tolerance = is(tolerance, "finite") ? tolerance : 10;
    if (is(values, "array")) {
        var i = values.length;
        while (i--) if (abs(values[i] - value) <= tolerance) {
            return values[i];
        }
    } else {
        values = +values;
        var rem = value % values;
        if (rem < tolerance) {
            return value - rem;
        }
        if (rem > values - tolerance) {
            return value - rem + values;
        }
    }
    return value;
};

// MATRIX
function Matrix(a, b, c, d, e, f) {
    if (b == null && objectToString.call(a) == "[object SVGMatrix]") {
        this.a = a.a;
        this.b = a.b;
        this.c = a.c;
        this.d = a.d;
        this.e = a.e;
        this.f = a.f;
        return;
    }
    if (a != null) {
        this.a = +a;
        this.b = +b;
        this.c = +c;
        this.d = +d;
        this.e = +e;
        this.f = +f;
    } else {
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.e = 0;
        this.f = 0;
    }
}
(function (matrixproto) {
    /*\
     * Matrix.add
     [ method ]
     **
     * Adds the given matrix to existing one
     - a (number)
     - b (number)
     - c (number)
     - d (number)
     - e (number)
     - f (number)
     * or
     - matrix (object) @Matrix
    \*/
    matrixproto.add = function (a, b, c, d, e, f) {
        var out = [[], [], []],
            m = [[this.a, this.c, this.e], [this.b, this.d, this.f], [0, 0, 1]],
            matrix = [[a, c, e], [b, d, f], [0, 0, 1]],
            x, y, z, res;

        if (a && a instanceof Matrix) {
            matrix = [[a.a, a.c, a.e], [a.b, a.d, a.f], [0, 0, 1]];
        }

        for (x = 0; x < 3; x++) {
            for (y = 0; y < 3; y++) {
                res = 0;
                for (z = 0; z < 3; z++) {
                    res += m[x][z] * matrix[z][y];
                }
                out[x][y] = res;
            }
        }
        this.a = out[0][0];
        this.b = out[1][0];
        this.c = out[0][1];
        this.d = out[1][1];
        this.e = out[0][2];
        this.f = out[1][2];
        return this;
    };
    /*\
     * Matrix.invert
     [ method ]
     **
     * Returns an inverted version of the matrix
     = (object) @Matrix
    \*/
    matrixproto.invert = function () {
        var me = this,
            x = me.a * me.d - me.b * me.c;
        return new Matrix(me.d / x, -me.b / x, -me.c / x, me.a / x, (me.c * me.f - me.d * me.e) / x, (me.b * me.e - me.a * me.f) / x);
    };
    /*\
     * Matrix.clone
     [ method ]
     **
     * Returns a copy of the matrix
     = (object) @Matrix
    \*/
    matrixproto.clone = function () {
        return new Matrix(this.a, this.b, this.c, this.d, this.e, this.f);
    };
    /*\
     * Matrix.translate
     [ method ]
     **
     * Translate the matrix
     - x (number) horizontal offset distance
     - y (number) vertical offset distance
    \*/
    matrixproto.translate = function (x, y) {
        return this.add(1, 0, 0, 1, x, y);
    };
    /*\
     * Matrix.scale
     [ method ]
     **
     * Scales the matrix
     - x (number) amount to be scaled, with `1` resulting in no change
     - y (number) #optional amount to scale along the vertical axis. (Otherwise `x` applies to both axes.)
     - cx (number) #optional horizontal origin point from which to scale
     - cy (number) #optional vertical origin point from which to scale
     * Default cx, cy is the middle point of the element.
    \*/
    matrixproto.scale = function (x, y, cx, cy) {
        y == null && (y = x);
        (cx || cy) && this.add(1, 0, 0, 1, cx, cy);
        this.add(x, 0, 0, y, 0, 0);
        (cx || cy) && this.add(1, 0, 0, 1, -cx, -cy);
        return this;
    };
    /*\
     * Matrix.rotate
     [ method ]
     **
     * Rotates the matrix
     - a (number) angle of rotation, in degrees
     - x (number) horizontal origin point from which to rotate
     - y (number) vertical origin point from which to rotate
    \*/
    matrixproto.rotate = function (a, x, y) {
        a = rad(a);
        x = x || 0;
        y = y || 0;
        var cos = +math.cos(a).toFixed(9),
            sin = +math.sin(a).toFixed(9);
        this.add(cos, sin, -sin, cos, x, y);
        return this.add(1, 0, 0, 1, -x, -y);
    };
    /*\
     * Matrix.x
     [ method ]
     **
     * Returns x coordinate for given point after transformation described by the matrix. See also @Matrix.y
     - x (number)
     - y (number)
     = (number) x
    \*/
    matrixproto.x = function (x, y) {
        return x * this.a + y * this.c + this.e;
    };
    /*\
     * Matrix.y
     [ method ]
     **
     * Returns y coordinate for given point after transformation described by the matrix. See also @Matrix.x
     - x (number)
     - y (number)
     = (number) y
    \*/
    matrixproto.y = function (x, y) {
        return x * this.b + y * this.d + this.f;
    };
    matrixproto.get = function (i) {
        return +this[Str.fromCharCode(97 + i)].toFixed(4);
    };
    matrixproto.toString = function () {
        return "matrix(" + [this.get(0), this.get(1), this.get(2), this.get(3), this.get(4), this.get(5)].join() + ")";
    };
    matrixproto.offset = function () {
        return [this.e.toFixed(4), this.f.toFixed(4)];
    };
    function norm(a) {
        return a[0] * a[0] + a[1] * a[1];
    }
    function normalize(a) {
        var mag = math.sqrt(norm(a));
        a[0] && (a[0] /= mag);
        a[1] && (a[1] /= mag);
    }
    /*\
     * Matrix.split
     [ method ]
     **
     * Splits matrix into primitive transformations
     = (object) in format:
     o dx (number) translation by x
     o dy (number) translation by y
     o scalex (number) scale by x
     o scaley (number) scale by y
     o shear (number) shear
     o rotate (number) rotation in deg
     o isSimple (boolean) could it be represented via simple transformations
    \*/
    matrixproto.split = function () {
        var out = {};
        // translation
        out.dx = this.e;
        out.dy = this.f;

        // scale and shear
        var row = [[this.a, this.c], [this.b, this.d]];
        out.scalex = math.sqrt(norm(row[0]));
        normalize(row[0]);

        out.shear = row[0][0] * row[1][0] + row[0][1] * row[1][1];
        row[1] = [row[1][0] - row[0][0] * out.shear, row[1][1] - row[0][1] * out.shear];

        out.scaley = math.sqrt(norm(row[1]));
        normalize(row[1]);
        out.shear /= out.scaley;

        // rotation
        var sin = -row[0][1],
            cos = row[1][1];
        if (cos < 0) {
            out.rotate = deg(math.acos(cos));
            if (sin < 0) {
                out.rotate = 360 - out.rotate;
            }
        } else {
            out.rotate = deg(math.asin(sin));
        }

        out.isSimple = !+out.shear.toFixed(9) && (out.scalex.toFixed(9) == out.scaley.toFixed(9) || !out.rotate);
        out.isSuperSimple = !+out.shear.toFixed(9) && out.scalex.toFixed(9) == out.scaley.toFixed(9) && !out.rotate;
        out.noRotation = !+out.shear.toFixed(9) && !out.rotate;
        return out;
    };
    /*\
     * Matrix.toTransformString
     [ method ]
     **
     * Returns transform string that represents given matrix
     = (string) transform string
    \*/
    matrixproto.toTransformString = function (shorter) {
        var s = shorter || this.split();
        if (s.isSimple) {
            s.scalex = +s.scalex.toFixed(4);
            s.scaley = +s.scaley.toFixed(4);
            s.rotate = +s.rotate.toFixed(4);
            return  (s.dx || s.dy ? "t" + [+s.dx.toFixed(4), +s.dy.toFixed(4)] : E) + 
                    (s.scalex != 1 || s.scaley != 1 ? "s" + [s.scalex, s.scaley, 0, 0] : E) +
                    (s.rotate ? "r" + [+s.rotate.toFixed(4), 0, 0] : E);
        } else {
            return "m" + [this.get(0), this.get(1), this.get(2), this.get(3), this.get(4), this.get(5)];
        }
    };
})(Matrix.prototype);
/*\
 * Snap.Matrix
 [ method ]
 **
 * Utility method
 **
 * Returns a matrix based on the given parameters
 - a (number)
 - b (number)
 - c (number)
 - d (number)
 - e (number)
 - f (number)
 * or
 - svgMatrix (SVGMatrix)
 = (object) @Matrix
\*/
Snap.Matrix = Matrix;
// Colour
/*\
 * Snap.getRGB
 [ method ]
 **
 * Parses color string as RGB object
 - color (string) color string in one of the following formats:
 # <ul>
 #     <li>Color name (<code>red</code>, <code>green</code>, <code>cornflowerblue</code>, etc)</li>
 #     <li>#••• — shortened HTML color: (<code>#000</code>, <code>#fc0</code>, etc.)</li>
 #     <li>#•••••• — full length HTML color: (<code>#000000</code>, <code>#bd2300</code>)</li>
 #     <li>rgb(•••, •••, •••) — red, green and blue channels values: (<code>rgb(200,&nbsp;100,&nbsp;0)</code>)</li>
 #     <li>rgba(•••, •••, •••, •••) — also with opacity</li>
 #     <li>rgb(•••%, •••%, •••%) — same as above, but in %: (<code>rgb(100%,&nbsp;175%,&nbsp;0%)</code>)</li>
 #     <li>rgba(•••%, •••%, •••%, •••%) — also with opacity</li>
 #     <li>hsb(•••, •••, •••) — hue, saturation and brightness values: (<code>hsb(0.5,&nbsp;0.25,&nbsp;1)</code>)</li>
 #     <li>hsba(•••, •••, •••, •••) — also with opacity</li>
 #     <li>hsb(•••%, •••%, •••%) — same as above, but in %</li>
 #     <li>hsba(•••%, •••%, •••%, •••%) — also with opacity</li>
 #     <li>hsl(•••, •••, •••) — hue, saturation and luminosity values: (<code>hsb(0.5,&nbsp;0.25,&nbsp;0.5)</code>)</li>
 #     <li>hsla(•••, •••, •••, •••) — also with opacity</li>
 #     <li>hsl(•••%, •••%, •••%) — same as above, but in %</li>
 #     <li>hsla(•••%, •••%, •••%, •••%) — also with opacity</li>
 # </ul>
 * Note that `%` can be used any time: `rgb(20%, 255, 50%)`.
 = (object) RGB object in the following format:
 o {
 o     r (number) red,
 o     g (number) green,
 o     b (number) blue,
 o     hex (string) color in HTML/CSS format: #••••••,
 o     error (boolean) true if string can't be parsed
 o }
\*/
Snap.getRGB = cacher(function (colour) {
    if (!colour || !!((colour = Str(colour)).indexOf("-") + 1)) {
        return {r: -1, g: -1, b: -1, hex: "none", error: 1, toString: rgbtoString};
    }
    if (colour == "none") {
        return {r: -1, g: -1, b: -1, hex: "none", toString: rgbtoString};
    }
    !(hsrg[has](colour.toLowerCase().substring(0, 2)) || colour.charAt() == "#") && (colour = toHex(colour));
    if (!colour) {
        return {r: -1, g: -1, b: -1, hex: "none", error: 1, toString: rgbtoString};
    }
    var res,
        red,
        green,
        blue,
        opacity,
        t,
        values,
        rgb = colour.match(colourRegExp);
    if (rgb) {
        if (rgb[2]) {
            blue = toInt(rgb[2].substring(5), 16);
            green = toInt(rgb[2].substring(3, 5), 16);
            red = toInt(rgb[2].substring(1, 3), 16);
        }
        if (rgb[3]) {
            blue = toInt((t = rgb[3].charAt(3)) + t, 16);
            green = toInt((t = rgb[3].charAt(2)) + t, 16);
            red = toInt((t = rgb[3].charAt(1)) + t, 16);
        }
        if (rgb[4]) {
            values = rgb[4].split(commaSpaces);
            red = toFloat(values[0]);
            values[0].slice(-1) == "%" && (red *= 2.55);
            green = toFloat(values[1]);
            values[1].slice(-1) == "%" && (green *= 2.55);
            blue = toFloat(values[2]);
            values[2].slice(-1) == "%" && (blue *= 2.55);
            rgb[1].toLowerCase().slice(0, 4) == "rgba" && (opacity = toFloat(values[3]));
            values[3] && values[3].slice(-1) == "%" && (opacity /= 100);
        }
        if (rgb[5]) {
            values = rgb[5].split(commaSpaces);
            red = toFloat(values[0]);
            values[0].slice(-1) == "%" && (red /= 100);
            green = toFloat(values[1]);
            values[1].slice(-1) == "%" && (green /= 100);
            blue = toFloat(values[2]);
            values[2].slice(-1) == "%" && (blue /= 100);
            (values[0].slice(-3) == "deg" || values[0].slice(-1) == "\xb0") && (red /= 360);
            rgb[1].toLowerCase().slice(0, 4) == "hsba" && (opacity = toFloat(values[3]));
            values[3] && values[3].slice(-1) == "%" && (opacity /= 100);
            return Snap.hsb2rgb(red, green, blue, opacity);
        }
        if (rgb[6]) {
            values = rgb[6].split(commaSpaces);
            red = toFloat(values[0]);
            values[0].slice(-1) == "%" && (red /= 100);
            green = toFloat(values[1]);
            values[1].slice(-1) == "%" && (green /= 100);
            blue = toFloat(values[2]);
            values[2].slice(-1) == "%" && (blue /= 100);
            (values[0].slice(-3) == "deg" || values[0].slice(-1) == "\xb0") && (red /= 360);
            rgb[1].toLowerCase().slice(0, 4) == "hsla" && (opacity = toFloat(values[3]));
            values[3] && values[3].slice(-1) == "%" && (opacity /= 100);
            return Snap.hsl2rgb(red, green, blue, opacity);
        }
        red = mmin(math.round(red), 255);
        green = mmin(math.round(green), 255);
        blue = mmin(math.round(blue), 255);
        opacity = mmin(mmax(opacity, 0), 1);
        rgb = {r: red, g: green, b: blue, toString: rgbtoString};
        rgb.hex = "#" + (16777216 | blue | (green << 8) | (red << 16)).toString(16).slice(1);
        rgb.opacity = is(opacity, "finite") ? opacity : 1;
        return rgb;
    }
    return {r: -1, g: -1, b: -1, hex: "none", error: 1, toString: rgbtoString};
}, Snap);
// SIERRA It seems odd that the following 3 conversion methods are not expressed as .this2that(), like the others.
/*\
 * Snap.hsb
 [ method ]
 **
 * Converts HSB values to a hex representation of the color
 - h (number) hue
 - s (number) saturation
 - b (number) value or brightness
 = (string) hex representation of the color
\*/
Snap.hsb = cacher(function (h, s, b) {
    return Snap.hsb2rgb(h, s, b).hex;
});
/*\
 * Snap.hsl
 [ method ]
 **
 * Converts HSL values to a hex representation of the color
 - h (number) hue
 - s (number) saturation
 - l (number) luminosity
 = (string) hex representation of the color
\*/
Snap.hsl = cacher(function (h, s, l) {
    return Snap.hsl2rgb(h, s, l).hex;
});
/*\
 * Snap.rgb
 [ method ]
 **
 * Converts RGB values to a hex representation of the color
 - r (number) red
 - g (number) green
 - b (number) blue
 = (string) hex representation of the color
\*/
Snap.rgb = cacher(function (r, g, b, o) {
    if (is(o, "finite")) {
        var round = math.round;
        return "rgba(" + [round(r), round(g), round(b), +o.toFixed(2)] + ")";
    }
    return "#" + (16777216 | b | (g << 8) | (r << 16)).toString(16).slice(1);
});
var toHex = function (color) {
    var i = glob.doc.getElementsByTagName("head")[0],
        red = "rgb(255, 0, 0)";
    toHex = cacher(function (color) {
        if (color.toLowerCase() == "red") {
            return red;
        }
        i.style.color = red;
        i.style.color = color;
        var out = glob.doc.defaultView.getComputedStyle(i, E).getPropertyValue("color");
        return out == red ? null : out;
    });
    return toHex(color);
},
hsbtoString = function () {
    return "hsb(" + [this.h, this.s, this.b] + ")";
},
hsltoString = function () {
    return "hsl(" + [this.h, this.s, this.l] + ")";
},
rgbtoString = function () {
    return this.opacity == 1 || this.opacity == null ?
            this.hex :
            "rgba(" + [this.r, this.g, this.b, this.opacity] + ")";
},
prepareRGB = function (r, g, b) {
    if (g == null && is(r, "object") && "r" in r && "g" in r && "b" in r) {
        b = r.b;
        g = r.g;
        r = r.r;
    }
    if (g == null && is(r, string)) {
        var clr = Snap.getRGB(r);
        r = clr.r;
        g = clr.g;
        b = clr.b;
    }
    if (r > 1 || g > 1 || b > 1) {
        r /= 255;
        g /= 255;
        b /= 255;
    }
    
    return [r, g, b];
},
packageRGB = function (r, g, b, o) {
    r = math.round(r * 255);
    g = math.round(g * 255);
    b = math.round(b * 255);
    var rgb = {
        r: r,
        g: g,
        b: b,
        opacity: is(o, "finite") ? o : 1,
        hex: Snap.rgb(r, g, b),
        toString: rgbtoString
    };
    is(o, "finite") && (rgb.opacity = o);
    return rgb;
};
// SIERRA Clarify if Snap does not support consolidated HSLA/RGBA colors. E.g., can you specify a semi-transparent value for Snap.filter.shadow()?
/*\
 * Snap.color
 [ method ]
 **
 * Parses the color string and returns an object featuring the color's component values
 - clr (string) color string in one of the supported formats (see @Snap.getRGB)
 = (object) Combined RGB/HSB object in the following format:
 o {
 o     r (number) red,
 o     g (number) green,
 o     b (number) blue,
 o     hex (string) color in HTML/CSS format: #••••••,
 o     error (boolean) `true` if string can't be parsed,
 o     h (number) hue,
 o     s (number) saturation,
 o     v (number) value (brightness),
 o     l (number) lightness
 o }
\*/
Snap.color = function (clr) {
    var rgb;
    if (is(clr, "object") && "h" in clr && "s" in clr && "b" in clr) {
        rgb = Snap.hsb2rgb(clr);
        clr.r = rgb.r;
        clr.g = rgb.g;
        clr.b = rgb.b;
        clr.opacity = 1;
        clr.hex = rgb.hex;
    } else if (is(clr, "object") && "h" in clr && "s" in clr && "l" in clr) {
        rgb = Snap.hsl2rgb(clr);
        clr.r = rgb.r;
        clr.g = rgb.g;
        clr.b = rgb.b;
        clr.opacity = 1;
        clr.hex = rgb.hex;
    } else {
        if (is(clr, "string")) {
            clr = Snap.getRGB(clr);
        }
        if (is(clr, "object") && "r" in clr && "g" in clr && "b" in clr && !("error" in clr)) {
            rgb = Snap.rgb2hsl(clr);
            clr.h = rgb.h;
            clr.s = rgb.s;
            clr.l = rgb.l;
            rgb = Snap.rgb2hsb(clr);
            clr.v = rgb.b;
        } else {
            clr = {hex: "none"};
            clr.r = clr.g = clr.b = clr.h = clr.s = clr.v = clr.l = -1;
            clr.error = 1;
        }
    }
    clr.toString = rgbtoString;
    return clr;
};
/*\
 * Snap.hsb2rgb
 [ method ]
 **
 * Converts HSB values to an RGB object
 - h (number) hue
 - s (number) saturation
 - v (number) value or brightness
 = (object) RGB object in the following format:
 o {
 o     r (number) red,
 o     g (number) green,
 o     b (number) blue,
 o     hex (string) color in HTML/CSS format: #••••••
 o }
\*/
Snap.hsb2rgb = function (h, s, v, o) {
    if (is(h, "object") && "h" in h && "s" in h && "b" in h) {
        v = h.b;
        s = h.s;
        h = h.h;
        o = h.o;
    }
    h *= 360;
    var R, G, B, X, C;
    h = (h % 360) / 60;
    C = v * s;
    X = C * (1 - abs(h % 2 - 1));
    R = G = B = v - C;

    h = ~~h;
    R += [C, X, 0, 0, X, C][h];
    G += [X, C, C, X, 0, 0][h];
    B += [0, 0, X, C, C, X][h];
    return packageRGB(R, G, B, o);
};
/*\
 * Snap.hsl2rgb
 [ method ]
 **
 * Converts HSL values to an RGB object
 - h (number) hue
 - s (number) saturation
 - l (number) luminosity
 = (object) RGB object in the following format:
 o {
 o     r (number) red,
 o     g (number) green,
 o     b (number) blue,
 o     hex (string) color in HTML/CSS format: #••••••
 o }
\*/
Snap.hsl2rgb = function (h, s, l, o) {
    if (is(h, "object") && "h" in h && "s" in h && "l" in h) {
        l = h.l;
        s = h.s;
        h = h.h;
    }
    if (h > 1 || s > 1 || l > 1) {
        h /= 360;
        s /= 100;
        l /= 100;
    }
    h *= 360;
    var R, G, B, X, C;
    h = (h % 360) / 60;
    C = 2 * s * (l < .5 ? l : 1 - l);
    X = C * (1 - abs(h % 2 - 1));
    R = G = B = l - C / 2;

    h = ~~h;
    R += [C, X, 0, 0, X, C][h];
    G += [X, C, C, X, 0, 0][h];
    B += [0, 0, X, C, C, X][h];
    return packageRGB(R, G, B, o);
};
/*\
 * Snap.rgb2hsb
 [ method ]
 **
 * Converts RGB values to an HSB object
 - r (number) red
 - g (number) green
 - b (number) blue
 = (object) HSB object in the following format:
 o {
 o     h (number) hue,
 o     s (number) saturation,
 o     b (number) brightness
 o }
\*/
Snap.rgb2hsb = function (r, g, b) {
    b = prepareRGB(r, g, b);
    r = b[0];
    g = b[1];
    b = b[2];

    var H, S, V, C;
    V = mmax(r, g, b);
    C = V - mmin(r, g, b);
    H = (C == 0 ? null :
         V == r ? (g - b) / C :
         V == g ? (b - r) / C + 2 :
                  (r - g) / C + 4
        );
    H = ((H + 360) % 6) * 60 / 360;
    S = C == 0 ? 0 : C / V;
    return {h: H, s: S, b: V, toString: hsbtoString};
};
/*\
 * Snap.rgb2hsl
 [ method ]
 **
 * Converts RGB values to an HSL object
 - r (number) red
 - g (number) green
 - b (number) blue
 = (object) HSL object in the following format:
 o {
 o     h (number) hue,
 o     s (number) saturation,
 o     l (number) luminosity
 o }
\*/
Snap.rgb2hsl = function (r, g, b) {
    b = prepareRGB(r, g, b);
    r = b[0];
    g = b[1];
    b = b[2];

    var H, S, L, M, m, C;
    M = mmax(r, g, b);
    m = mmin(r, g, b);
    C = M - m;
    H = (C == 0 ? null :
         M == r ? (g - b) / C :
         M == g ? (b - r) / C + 2 :
                  (r - g) / C + 4);
    H = ((H + 360) % 6) * 60 / 360;
    L = (M + m) / 2;
    S = (C == 0 ? 0 :
         L < .5 ? C / (2 * L) :
                  C / (2 - 2 * L));
    return {h: H, s: S, l: L, toString: hsltoString};
};

// Transformations
// SIERRA Snap.parsePathString(): By _array of arrays,_ I assume you mean a format like this for two separate segments? [ ["M10,10","L90,90"], ["M90,10","L10,90"] ] Otherwise how is each command structured?
/*\
 * Snap.parsePathString
 [ method ]
 **
 * Utility method
 **
 * Parses given path string into an array of arrays of path segments
 - pathString (string|array) path string or array of segments (in the last case it is returned straight away)
 = (array) array of segments
\*/
Snap.parsePathString = function (pathString) {
    if (!pathString) {
        return null;
    }
    var pth = Snap.path(pathString);
    if (pth.arr) {
        return Snap.path.clone(pth.arr);
    }
    
    var paramCounts = {a: 7, c: 6, o: 2, h: 1, l: 2, m: 2, r: 4, q: 4, s: 4, t: 2, v: 1, u: 3, z: 0},
        data = [];
    if (is(pathString, "array") && is(pathString[0], "array")) { // rough assumption
        data = Snap.path.clone(pathString);
    }
    if (!data.length) {
        Str(pathString).replace(pathCommand, function (a, b, c) {
            var params = [],
                name = b.toLowerCase();
            c.replace(pathValues, function (a, b) {
                b && params.push(+b);
            });
            if (name == "m" && params.length > 2) {
                data.push([b].concat(params.splice(0, 2)));
                name = "l";
                b = b == "m" ? "l" : "L";
            }
            if (name == "o" && params.length == 1) {
                data.push([b, params[0]]);
            }
            if (name == "r") {
                data.push([b].concat(params));
            } else while (params.length >= paramCounts[name]) {
                data.push([b].concat(params.splice(0, paramCounts[name])));
                if (!paramCounts[name]) {
                    break;
                }
            }
        });
    }
    data.toString = Snap.path.toString;
    pth.arr = Snap.path.clone(data);
    return data;
};
/*\
 * Snap.parseTransformString
 [ method ]
 **
 * Utility method
 **
 * Parses given transform string into an array of transformations
 - TString (string|array) transform string or array of transformations (in the last case it is returned straight away)
 = (array) array of transformations
\*/
var parseTransformString = Snap.parseTransformString = function (TString) {
    if (!TString) {
        return null;
    }
    var paramCounts = {r: 3, s: 4, t: 2, m: 6},
        data = [];
    if (is(TString, "array") && is(TString[0], "array")) { // rough assumption
        data = Snap.path.clone(TString);
    }
    if (!data.length) {
        Str(TString).replace(tCommand, function (a, b, c) {
            var params = [],
                name = b.toLowerCase();
            c.replace(pathValues, function (a, b) {
                b && params.push(+b);
            });
            data.push([b].concat(params));
        });
    }
    data.toString = Snap.path.toString;
    return data;
};
function svgTransform2string(tstr) {
    var res = [];
    tstr = tstr.replace(/(?:^|\s)(\w+)\(([^)]+)\)/g, function (all, name, params) {
        params = params.split(/\s*,\s*|\s+/);
        if (name == "rotate" && params.length == 1) {
            params.push(0, 0);
        }
        if (name == "scale") {
            if (params.length == 2) {
                params.push(0, 0);
            }
            if (params.length == 1) {
                params.push(params[0], 0, 0);
            }
        }
        if (name == "skewX") {
            res.push(["m", 1, 0, math.tan(rad(params[0])), 1, 0, 0]);
        } else if (name == "skewY") {
            res.push(["m", 1, math.tan(rad(params[0])), 0, 1, 0, 0]);
        } else {
            res.push([name.charAt(0)].concat(params));
        }
        return all;
    });
    return res;
}
Snap._.svgTransform2string = svgTransform2string;
Snap._.rgTransform = new RegExp("^[a-z][" + spaces + "]*-?\\.?\\d", "i");
function transform2matrix(tstr, bbox) {
    var tdata = parseTransformString(tstr),
        m = new Matrix;
    if (tdata) {
        for (var i = 0, ii = tdata.length; i < ii; i++) {
            var t = tdata[i],
                tlen = t.length,
                command = Str(t[0]).toLowerCase(),
                absolute = t[0] != command,
                inver = absolute ? m.invert() : 0,
                x1,
                y1,
                x2,
                y2,
                bb;
            if (command == "t" && tlen == 2){
                m.translate(t[1], 0);
            } else if (command == "t" && tlen == 3) {
                if (absolute) {
                    x1 = inver.x(0, 0);
                    y1 = inver.y(0, 0);
                    x2 = inver.x(t[1], t[2]);
                    y2 = inver.y(t[1], t[2]);
                    m.translate(x2 - x1, y2 - y1);
                } else {
                    m.translate(t[1], t[2]);
                }
            } else if (command == "r") {
                if (tlen == 2) {
                    bb = bb || bbox;
                    m.rotate(t[1], bb.x + bb.width / 2, bb.y + bb.height / 2);
                } else if (tlen == 4) {
                    if (absolute) {
                        x2 = inver.x(t[2], t[3]);
                        y2 = inver.y(t[2], t[3]);
                        m.rotate(t[1], x2, y2);
                    } else {
                        m.rotate(t[1], t[2], t[3]);
                    }
                }
            } else if (command == "s") {
                if (tlen == 2 || tlen == 3) {
                    bb = bb || bbox;
                    m.scale(t[1], t[tlen - 1], bb.x + bb.width / 2, bb.y + bb.height / 2);
                } else if (tlen == 4) {
                    if (absolute) {
                        x2 = inver.x(t[2], t[3]);
                        y2 = inver.y(t[2], t[3]);
                        m.scale(t[1], t[1], x2, y2);
                    } else {
                        m.scale(t[1], t[1], t[2], t[3]);
                    }
                } else if (tlen == 5) {
                    if (absolute) {
                        x2 = inver.x(t[3], t[4]);
                        y2 = inver.y(t[3], t[4]);
                        m.scale(t[1], t[2], x2, y2);
                    } else {
                        m.scale(t[1], t[2], t[3], t[4]);
                    }
                }
            } else if (command == "m" && tlen == 7) {
                m.add(t[1], t[2], t[3], t[4], t[5], t[6]);
            }
        }
    }
    return m;
}
Snap._.transform2matrix = transform2matrix;
function extractTransform(el, tstr) {
    if (tstr == null) {
        var doReturn = true;
        if (el.type == "linearGradient" || el.type == "radialGradient") {
            tstr = el.node.getAttribute("gradientTransform");
        } else if (el.type == "pattern") {
            tstr = el.node.getAttribute("patternTransform");
        } else {
            tstr = el.node.getAttribute("transform");
        }
        if (!tstr) {
            return new Matrix;
        }
        tstr = svgTransform2string(tstr);
    } else {
        if (!Snap._.rgTransform.test(tstr)) {
            tstr = svgTransform2string(tstr);
        } else {
            tstr = Str(tstr).replace(/\.{3}|\u2026/g, el._.transform || E);
        }
        if (is(tstr, "array")) {
            tstr = Snap.path ? Snap.path.toString.call(tstr) : Str(tstr);
        }
        el._.transform = tstr;
    }
    var m = transform2matrix(tstr, el.getBBox(1));
    if (doReturn) {
        return m;
    } else {
        el.matrix = m;
    }
}
Snap._unit2px = unit2px;
var contains = glob.doc.contains || glob.doc.compareDocumentPosition ?
    function (a, b) {
        var adown = a.nodeType == 9 ? a.documentElement : a,
            bup = b && b.parentNode;
            return a == bup || !!(bup && bup.nodeType == 1 && (
                adown.contains ?
                    adown.contains(bup) :
                    a.compareDocumentPosition && a.compareDocumentPosition(bup) & 16
            ));
    } :
    function (a, b) {
        if (b) {
            while (b) {
                b = b.parentNode;
                if (b == a) {
                    return true;
                }
            }
        }
        return false;
    };
function getSomeDefs(el) {
    var cache = Snap._.someDefs;
    if (cache && contains(cache.ownerDocument.documentElement, cache)) {
        return cache;
    }
    var p = (el.node.ownerSVGElement && wrap(el.node.ownerSVGElement)) ||
            (el.node.parentNode && wrap(el.node.parentNode)) ||
            Snap.select("svg") ||
            Snap(0, 0),
        pdefs = p.select("defs"),
        defs  = pdefs == null ? false : pdefs.node;
    if (!defs) {
        defs = make("defs", p.node).node;
    }
    Snap._.someDefs = defs;
    return defs;
}
Snap._.getSomeDefs = getSomeDefs;
function unit2px(el, name, value) {
    var defs = getSomeDefs(el),
        out = {},
        mgr = defs.querySelector(".svg---mgr");
    if (!mgr) {
        mgr = $("rect");
        $(mgr, {width: 10, height: 10, "class": "svg---mgr"});
        defs.appendChild(mgr);
    }
    function getW(val) {
        if (val == null) {
            return E;
        }
        if (val == +val) {
            return val;
        }
        $(mgr, {width: val});
        return mgr.getBBox().width;
    }
    function getH(val) {
        if (val == null) {
            return E;
        }
        if (val == +val) {
            return val;
        }
        $(mgr, {height: val});
        return mgr.getBBox().height;
    }
    function set(nam, f) {
        if (name == null) {
            out[nam] = f(el.attr(nam));
        } else if (nam == name) {
            out = f(value == null ? el.attr(nam) : value);
        }
    }
    switch (el.type) {
        case "rect":
            set("rx", getW);
            set("ry", getH);
        case "image":
            set("width", getW);
            set("height", getH);
        case "text":
            set("x", getW);
            set("y", getH);
        break;
        case "circle":
            set("cx", getW);
            set("cy", getH);
            set("r", getW);
        break;
        case "ellipse":
            set("cx", getW);
            set("cy", getH);
            set("rx", getW);
            set("ry", getH);
        break;
        case "line":
            set("x1", getW);
            set("x2", getW);
            set("y1", getH);
            set("y2", getH);
        break;
        case "marker":
            set("refX", getW);
            set("markerWidth", getW);
            set("refY", getH);
            set("markerHeight", getH);
        break;
        case "radialGradient":
            set("fx", getW);
            set("fy", getH);
        break;
        case "tspan":
            set("dx", getW);
            set("dy", getH);
        break;
        default:
            set(name, getW);
    }
    return out;
}
/*\
 * Snap.select
 [ method ]
 **
 * Wraps a DOM element specified by CSS selector as @Element
 - query (string) CSS selector of the element
 = (Element) the current element
\*/
Snap.select = function (query) {
    return wrap(glob.doc.querySelector(query));
};
/*\
 * Snap.selectAll
 [ method ]
 **
 * Wraps DOM elements specified by CSS selector as set or array of @Element
 - query (string) CSS selector of the element
 = (Element) the current element
\*/
Snap.selectAll = function (query) {
    var nodelist = glob.doc.querySelectorAll(query),
        set = (Snap.set || Array)();
    for (var i = 0; i < nodelist.length; i++) {
        set.push(wrap(nodelist[i]));
    }
    return set;
};

function add2group(list) {
    if (!is(list, "array")) {
        list = Array.prototype.slice.call(arguments, 0);
    }
    var i = 0,
        j = 0,
        node = this.node;
    while (this[i]) delete this[i++];
    for (i = 0; i < list.length; i++) {
        if (list[i].type == "set") {
            list[i].forEach(function (el) {
                node.appendChild(el.node);
            });
        } else {
            node.appendChild(list[i].node);
        }
    }
    var children = node.childNodes;
    for (i = 0; i < children.length; i++) {
        this[j++] = wrap(children[i]);
    }
    return this;
}
function Element(el) {
    if (el.snap in hub) {
        return hub[el.snap];
    }
    var id = this.id = ID(),
        svg;
    try {
        svg = el.ownerSVGElement;
    } catch(e) {}
    this.node = el;
    if (svg) {
        this.paper = new Paper(svg);
    }
    this.type = el.tagName;
    this.anims = {};
    this._ = {
        transform: []
    };
    el.snap = id;
    hub[id] = this;
    if (this.type == "g") {
        this.add = add2group;
        for (var method in Paper.prototype) if (Paper.prototype[has](method)) {
            this[method] = Paper.prototype[method];
        }
    }
}
function arrayFirstValue(arr) {
    var res;
    for (var i = 0, ii = arr.length; i < ii; i++) {
        res = res || arr[i];
        if (res) {
            return res;
        }
    }
}
(function (elproto) {
    /*\
     * Element.attr
     [ method ]
     **
     * Gets or sets given attributes of the element
     **
     - params (object) contains key-value pairs of attributes you want to set
     * or
     - param (string) name of the attribute
     = (Element) the current element
     * or
     = (string) value of attribute
     > Usage
     | el.attr({
     |     fill: "#fc0",
     |     stroke: "#000",
     |     strokeWidth: 2, // CamelCase...
     |     "fill-opacity": 0.5 // or dash-separated names
     | });
     | console.log(el.attr("fill")); // #fc0
    \*/
    elproto.attr = function (params, value) {
        var el = this,
            node = el.node;
        if (!params) {
            return el;
        }
        if (is(params, "string")) {
            if (arguments.length > 1) {
                var json = {};
                json[params] = value;
                params = json;
            } else {
                return arrayFirstValue(eve("snap.util.getattr."+params, el));
            }
        }
        for (var att in params) {
            if (params[has](att)) {
                eve("snap.util.attr." + att, el, params[att]);
            }
        }
        return el;
    };
// SIERRA Element.getBBox(): Unclear why you would want to express the dimension of the box as a path.
// SIERRA Element.getBBox(): Unclear why you would want to use r0/r1/r2. Also, basic definitions: wouldn't the _smallest circle that can be enclosed_ be a zero-radius point?
    /*\
     * Element.getBBox
     [ method ]
     **
     * Returns the bounding box descriptor for the given element
     **
     = (object) bounding box descriptor:
     o {
     o     cx: (number) x of the center,
     o     cy: (number) x of the center,
     o     h: (number) height,
     o     height: (number) height,
     o     path: (string) path command for the box,
     o     r0: (number) radius of a circle that fully encloses the box,
     o     r1: (number) radius of the smallest circle that can be enclosed,
     o     r2: (number) radius of the largest circle that can be enclosed,
     o     vb: (string) box as a viewbox command,
     o     w: (number) width,
     o     width: (number) width,
     o     x2: (number) x of the right side,
     o     x: (number) x of the left side,
     o     y2: (number) y of the bottom edge,
     o     y: (number) y of the top edge
     o }
    \*/
    elproto.getBBox = function (isWithoutTransform) {
        var el = this;
        if (el.type == "use") {
            el = el.original;
        }
        if (el.removed) {
            return {};
        }
        var _ = el._;
        if (isWithoutTransform) {
            _.bboxwt = Snap.path.get[el.type] ? Snap.path.getBBox(el.realPath = Snap.path.get[el.type](el)) : Snap._.box(el.node.getBBox());
            return Snap._.box(_.bboxwt);
        } else {
            el.realPath = (Snap.path.get[el.type] || Snap.path.get.deflt)(el);
            _.bbox = Snap.path.getBBox(Snap.path.map(el.realPath, el.matrix));
        }
        return Snap._.box(_.bbox);
    };
    var propString = function () {
        return this.string;
    };
// SIERRA Element.transform(): seems to allow two return values, one of which (_Element_) is undefined.
// SIERRA Element.transform(): if this only accepts one argument, it's unclear how it can both _get_ and _set_ a transform.
// SIERRA Element.transform(): Unclear how Snap transform string format differs from SVG's.
    /*\
     * Element.transform
     [ method ]
     **
     * Gets or sets transformation of the element
     **
     - tstr (string) transform string in Snap or SVG format
     = (Element) the current element
     * or
     = (object) transformation descriptor:
     o {
     o     string (string) transform string,
     o     globalMatrix (Matrix) matrix of all transformations applied to element or its parents,
     o     localMatrix (Matrix) matrix of transformations applied only to the element,
     o     diffMatrix (Matrix) matrix of difference between global and local transformations,
     o     global (string) global transformation as string,
     o     local (string) local transformation as string,
     o     toString (function) returns `string` property
     o }
    \*/
    elproto.transform = function (tstr) {
        var _ = this._;
        if (tstr == null) {
            var global = new Matrix(this.node.getCTM()),
                local = extractTransform(this),
                localString = local.toTransformString(),
                string = Str(local) == Str(this.matrix) ?
                            _.transform : localString;
            return {
                string: string,
                globalMatrix: global,
                localMatrix: local,
                diffMatrix: global.clone().add(local.invert()),
                global: global.toTransformString(),
                local: localString,
                toString: propString
            };
        }
        if (tstr instanceof Matrix) {
            // may be need to apply it directly
            // TODO: investigate
            tstr = tstr.toTransformString();
        }
        extractTransform(this, tstr);

        if (this.node) {
            if (this.type == "linearGradient" || this.type == "radialGradient") {
                $(this.node, {gradientTransform: this.matrix});
            } else if (this.type == "pattern") {
                $(this.node, {patternTransform: this.matrix});
            } else {
                $(this.node, {transform: this.matrix});
            }
        }

        return this;
    };
    /*\
     * Element.parent
     [ method ]
     **
     * Returns the element's parent
     **
     = (Element) the parent element
    \*/
    elproto.parent = function () {
        return wrap(this.node.parentNode);
    };
    /*\
     * Element.append
     [ method ]
     **
     * Appends the given element to current one
     **
     - el (Element|Set) element to append
     = (Element) the parent element
    \*/
    /*\
     * Element.add
     [ method ]
     **
     * See @Element.append
    \*/
    elproto.append = elproto.add = function (el) {
        if (el) {
            if (el.type == "set") {
                var it = this;
                el.forEach(function (el) {
                    it.add(el);
                });
                return this;
            }
            el = wrap(el);
            this.node.appendChild(el.node);
            el.paper = this.paper;
        }
        return this;
    };
    /*\
     * Element.appendTo
     [ method ]
     **
     * Appends the current element to the given one
     **
     - el (Element) parent element to append to
     = (Element) the child element
    \*/
    elproto.appendTo = function (el) {
        if (el) {
            el = wrap(el);
            el.append(this);
        }
        return this;
    };
    /*\
     * Element.prepend
     [ method ]
     **
     * Prepends the given element to the current one
     **
     - el (Element) element to prepend
     = (Element) the parent element
    \*/
    elproto.prepend = function (el) {
        if (el) {
            el = wrap(el);
            var parent = el.parent();
            this.node.insertBefore(el.node, this.node.firstChild);
            this.add && this.add();
            el.paper = this.paper;
            this.parent() && this.parent().add();
            parent && parent.add();
        }
        return this;
    };
    /*\
     * Element.prependTo
     [ method ]
     **
     * Prepends the current element to the given one
     **
     - el (Element) parent element to prepend to
     = (Element) the child element
    \*/
    elproto.prependTo = function (el) {
        el = wrap(el);
        el.prepend(this);
        return this;
    };
    /*\
     * Element.before
     [ method ]
     **
     * Inserts given element before the current one
     **
     - el (Element) element to insert
     = (Element) the parent element
    \*/
    elproto.before = function (el) {
        if (el.type == "set") {
            var it = this;
            el.forEach(function (el) {
                var parent = el.parent();
                it.node.parentNode.insertBefore(el.node, it.node);
                parent && parent.add();
            });
            this.parent().add();
            return this;
        }
        el = wrap(el);
        var parent = el.parent();
        this.node.parentNode.insertBefore(el.node, this.node);
        this.parent() && this.parent().add();
        parent && parent.add();
        el.paper = this.paper;
        return this;
    };
    /*\
     * Element.after
     [ method ]
     **
     * Inserts given element after the current one
     **
     - el (Element) element to insert
     = (Element) the parent element
    \*/
    elproto.after = function (el) {
        el = wrap(el);
        var parent = el.parent();
        if (this.node.nextSibling) {
            this.node.parentNode.insertBefore(el.node, this.node.nextSibling);
        } else {
            this.node.parentNode.appendChild(el.node);
        }
        this.parent() && this.parent().add();
        parent && parent.add();
        el.paper = this.paper;
        return this;
    };
    /*\
     * Element.insertBefore
     [ method ]
     **
     * Inserts the element after the given one
     **
     - el (Element) element next to whom insert to
     = (Element) the parent element
    \*/
    elproto.insertBefore = function (el) {
        el = wrap(el);
        var parent = this.parent();
        el.node.parentNode.insertBefore(this.node, el.node);
        this.paper = el.paper;
        parent && parent.add();
        el.parent() && el.parent().add();
        return this;
    };
    /*\
     * Element.insertAfter
     [ method ]
     **
     * Inserts the element after the given one
     **
     - el (Element) element next to whom insert to
     = (Element) the parent element
    \*/
    elproto.insertAfter = function (el) {
        el = wrap(el);
        var parent = this.parent();
        el.node.parentNode.insertBefore(this.node, el.node.nextSibling);
        this.paper = el.paper;
        parent && parent.add();
        el.parent() && el.parent().add();
        return this;
    };
    /*\
     * Element.remove
     [ method ]
     **
     * Removes element from the DOM
     = (Element) the detached element
    \*/
    elproto.remove = function () {
        var parent = this.parent();
        this.node.parentNode && this.node.parentNode.removeChild(this.node);
        delete this.paper;
        this.removed = true;
        parent && parent.add();
        return this;
    };
    /*\
     * Element.select
     [ method ]
     **
     * Gathers the nested @Element matching the given set of CSS selectors
     **
     - query (string) CSS selector
     = (Element) result of query selection
    \*/
    elproto.select = function (query) {
        return wrap(this.node.querySelector(query));
    };
    /*\
     * Element.selectAll
     [ method ]
     **
     * Gathers nested @Element objects matching the given set of CSS selectors
     **
     - query (string) CSS selector
     = (Set|array) result of query selection
    \*/
    elproto.selectAll = function (query) {
        var nodelist = this.node.querySelectorAll(query),
            set = (Snap.set || Array)();
        for (var i = 0; i < nodelist.length; i++) {
            set.push(wrap(nodelist[i]));
        }
        return set;
    };
    /*\
     * Element.asPX
     [ method ]
     **
     * Returns given attribute of the element as a `px` value (not %, em, etc.)
     **
     - attr (string) attribute name
     - value (string) #optional attribute value
     = (Element) result of query selection
    \*/
    elproto.asPX = function (attr, value) {
        if (value == null) {
            value = this.attr(attr);
        }
        return +unit2px(this, attr, value);
    };
    // SIERRA Element.use(): I suggest adding a note about how to access the original element the returned <use> instantiates. It's a part of SVG with which ordinary web developers may be least familiar.
    /*\
     * Element.use
     [ method ]
     **
     * Creates a `<use>` element linked to the current element
     **
     = (Element) the `<use>` element
    \*/
    elproto.use = function () {
        var use,
            id = this.node.id;
        if (!id) {
            id = this.id;
            $(this.node, {
                id: id
            });
        }
        if (this.type == "linearGradient" || this.type == "radialGradient" ||
            this.type == "pattern") {
            use = make(this.type, this.node.parentNode);
        } else {
            use = make("use", this.node.parentNode);
        }
        $(use.node, {
            "xlink:href": "#" + id
        });
        use.original = this;
        return use;
    };
    /*\
     * Element.clone
     [ method ]
     **
     * Creates a clone of the element and inserts it after the element
     **
     = (Element) the clone
    \*/
    function fixids(el) {
        var els = el.selectAll("*"),
            it,
            url = /^\s*url\(("|'|)(.*)\1\)\s*$/,
            ids = [],
            uses = {};
        function urltest(it, name) {
            var val = $(it.node, name);
            val = val && val.match(url);
            val = val && val[2];
            if (val && val.charAt() == "#") {
                val = val.substring(1);
            } else {
                return;
            }
            if (val) {
                uses[val] = (uses[val] || []).concat(function (id) {
                    var attr = {};
                    attr[name] = URL(id);
                    $(it.node, attr);
                });
            }
        }
        function linktest(it) {
            var val = $(it.node, "xlink:href");
            if (val && val.charAt() == "#") {
                val = val.substring(1);
            } else {
                return;
            }
            if (val) {
                uses[val] = (uses[val] || []).concat(function (id) {
                    it.attr("xlink:href", "#" + id);
                });
            }
        }
        for (var i = 0, ii = els.length; i < ii; i++) {
            it = els[i];
            urltest(it, "fill");
            urltest(it, "stroke");
            urltest(it, "filter");
            urltest(it, "mask");
            urltest(it, "clip-path");
            linktest(it);
            var oldid = $(it.node, "id");
            if (oldid) {
                $(it.node, {id: it.id});
                ids.push({
                    old: oldid,
                    id: it.id
                });
            }
        }
        for (i = 0, ii = ids.length; i < ii; i++) {
            var fs = uses[ids[i].old];
            if (fs) {
                for (var j = 0, jj = fs.length; j < jj; j++) {
                    fs[j](ids[i].id);
                }
            }
        }
    }
    elproto.clone = function () {
        var clone = wrap(this.node.cloneNode(true));
        if ($(clone.node, "id")) {
            $(clone.node, {id: clone.id});
        }
        fixids(clone);
        clone.insertAfter(this);
        return clone;
    };
// SIERRA Element.toDefs(): If this _moves_ an element to the <defs> region, why is the return value a _clone_? Also unclear why it's called the _relative_ <defs> section. Perhaps _shared_?
    /*\
     * Element.toDefs
     [ method ]
     **
     * Moves element to the shared `<defs>` area
     **
     = (Element) the clone
    \*/
    elproto.toDefs = function () {
        var defs = getSomeDefs(this);
        defs.appendChild(this.node);
        return this;
    };
// SIERRA Element.pattern(): x/y/width/height data types are listed as both String and Number. Is that an error, or does it mean strings are coerced?
// SIERRA Element.pattern(): clarify that x/y are offsets that e.g., may add gutters between the tiles.
    /*\
     * Element.pattern
     [ method ]
     **
     * Creates a `<pattern>` element from the current element
     **
     * To create a pattern you have to specify the pattern rect:
     - x (string|number)
     - y (string|number)
     - width (string|number)
     - height (string|number)
     = (Element) the `<pattern>` element
     * You can use pattern later on as an argument for `fill` attribute:
     | var p = paper.path("M10-5-10,15M15,0,0,15M0-5-20,15").attr({
     |         fill: "none",
     |         stroke: "#bada55",
     |         strokeWidth: 5
     |     }).pattern(0, 0, 10, 10),
     |     c = paper.circle(200, 200, 100);
     | c.attr({
     |     fill: p
     | });
    \*/
    elproto.pattern = function (x, y, width, height) {
        var p = make("pattern", getSomeDefs(this));
        if (x == null) {
            x = this.getBBox();
        }
        if (is(x, "object") && "x" in x) {
            y = x.y;
            width = x.width;
            height = x.height;
            x = x.x;
        }
        $(p.node, {
            x: x,
            y: y,
            width: width,
            height: height,
            patternUnits: "userSpaceOnUse",
            id: p.id,
            viewBox: [x, y, width, height].join(" ")
        });
        p.node.appendChild(this.node);
        return p;
    };
// SIERRA Element.marker(): clarify what a reference point is. E.g., helps you offset the object from its edge such as when centering it over a path.
// SIERRA Element.marker(): I suggest the method should accept default reference point values.  Perhaps centered with (refX = width/2) and (refY = height/2)? Also, couldn't it assume the element's current _width_ and _height_? And please specify what _x_ and _y_ mean: offsets? If so, from where?  Couldn't they also be assigned default values?
    /*\
     * Element.marker
     [ method ]
     **
     * Creates a `<marker>` element from the current element
     **
     * To create a marker you have to specify the bounding rect and reference point:
     - x (number)
     - y (number)
     - width (number)
     - height (number)
     - refX (number)
     - refY (number)
     = (Element) the `<marker>` element
     * You can specify the marker later as an argument for `marker-start`, `marker-end`, `marker-mid`, and `marker` attributes. The `marker` attribute places the marker at every point along the path, and `marker-mid` places them at every point except the start and end.
    \*/
    // TODO add usage for markers
    elproto.marker = function (x, y, width, height, refX, refY) {
        var p = make("marker", getSomeDefs(this));
        if (x == null) {
            x = this.getBBox();
        }
        if (is(x, "object") && "x" in x) {
            y = x.y;
            width = x.width;
            height = x.height;
            refX = x.refX || x.cx;
            refY = x.refY || x.cy;
            x = x.x;
        }
        $(p.node, {
            viewBox: [x, y, width, height].join(S),
            markerWidth: width,
            markerHeight: height,
            orient: "auto",
            refX: refX || 0,
            refY: refY || 0,
            id: p.id
        });
        p.node.appendChild(this.node);
        return p;
    };
    // animation
    function slice(from, to, f) {
        return function (arr) {
            var res = arr.slice(from, to);
            if (res.length == 1) {
                res = res[0];
            }
            return f ? f(res) : res;
        };
    }
    var Animation = function (attr, ms, easing, callback) {
        if (typeof easing == "function" && !easing.length) {
            callback = easing;
            easing = mina.linear;
        }
        this.attr = attr;
        this.dur = ms;
        easing && (this.easing = easing);
        callback && (this.callback = callback);
    };
    // SIERRA All object methods should feature sample code. This is just one instance.
    /*\
     * Snap.animation
     [ method ]
     **
     * Creates an animation object
     **
     - attr (object) attributes of final destination
     - duration (number) duration of the animation, in milliseconds
     - easing (function) #optional one of easing functions of @mina or custom one
     - callback (function) #optional callback function that fires when animation ends
     = (object) animation object
    \*/
    Snap.animation = function (attr, ms, easing, callback) {
        return new Animation(attr, ms, easing, callback);
    };
    /*\
     * Element.inAnim
     [ method ]
     **
     * Returns a set of animations that may be able to manipulate the current element
     **
     = (object) in format:
     o {
     o     anim (object) animation object,
     o     curStatus (number) 0..1 — status of the animation: 0 — just started, 1 — just finished,
     o     status (function) gets or sets the status of the animation,
     o     stop (function) stops the animation
     o }
    \*/
    elproto.inAnim = function () {
        var el = this,
            res = [];
        for (var id in el.anims) if (el.anims[has](id)) {
            (function (a) {
                res.push({
                    anim: new Animation(a._attrs, a.dur, a.easing, a._callback),
                    curStatus: a.status(),
                    status: function (val) {
                        return a.status(val);
                    },
                    stop: function () {
                        a.stop();
                    }
                });
            }(el.anims[id]));
        }
        return res;
    };
    /*\
     * Snap.animate
     [ method ]
     **
     * Runs generic animation of one number into another with a caring function
     **
     - from (number|array) number or array of numbers
     - to (number|array) number or array of numbers
     - setter (function) caring function that accepts one number argument
     - duration (number) duration, in milliseconds
     - easing (function) #optional easing function from @mina or custom
     - callback (function) #optional callback function to execute when animation ends
     = (object) animation object in @mina format
     o {
     o     id (string) animation id, consider it read-only,
     o     duration (function) gets or sets the duration of the animation,
     o     easing (function) easing,
     o     speed (function) gets or sets the speed of the animation,
     o     status (function) gets or sets the status of the animation,
     o     stop (function) stops the animation
     o }
     | var rect = Snap().rect(0, 0, 10, 10);
     | Snap.animate(0, 10, function (val) {
     |     rect.attr({
     |         x: val
     |     });
     | }, 1000);
     | // in given context is equivalent to
     | rect.animate({x: 10}, 1000);
    \*/
    Snap.animate = function (from, to, setter, ms, easing, callback) {
        if (typeof easing == "function" && !easing.length) {
            callback = easing;
            easing = mina.linear;
        }
        var now = mina.time(),
            anim = mina(from, to, now, now + ms, mina.time, setter, easing);
        callback && eve.once("mina.finish." + anim.id, callback);
        return anim;
    };
    /*\
     * Element.stop
     [ method ]
     **
     * Stops all the animations for the current element
     **
     = (Element) the current element
    \*/
    elproto.stop = function () {
        var anims = this.inAnim();
        for (var i = 0, ii = anims.length; i < ii; i++) {
            anims[i].stop();
        }
        return this;
    };
    // SIERRA Element.animate(): For _attrs_, clarify if they represent the destination values, and if the animation executes relative to the element's current attribute values.
    // SIERRA would a _custom_ animation function be an SVG keySplines value?
    /*\
     * Element.animate
     [ method ]
     **
     * Animates the given attributes of the element
     **
     - attrs (object) key-value pairs of destination attributes
     - duration (number) duration of the animation in milliseconds
     - easing (function) #optional easing function from @mina or custom
     - callback (function) #optional callback function that executes when the animation ends
     = (Element) the current element
    \*/
    elproto.animate = function (attrs, ms, easing, callback) {
        if (typeof easing == "function" && !easing.length) {
            callback = easing;
            easing = mina.linear;
        }
        if (attrs instanceof Animation) {
            callback = attrs.callback;
            easing = attrs.easing;
            ms = easing.dur;
            attrs = attrs.attr;
        }
        var fkeys = [], tkeys = [], keys = {}, from, to, f, eq,
            el = this;
        for (var key in attrs) if (attrs[has](key)) {
            if (el.equal) {
                eq = el.equal(key, Str(attrs[key]));
                from = eq.from;
                to = eq.to;
                f = eq.f;
            } else {
                from = +el.attr(key);
                to = +attrs[key];
            }
            var len = is(from, "array") ? from.length : 1;
            keys[key] = slice(fkeys.length, fkeys.length + len, f);
            fkeys = fkeys.concat(from);
            tkeys = tkeys.concat(to);
        }
        var now = mina.time(),
            anim = mina(fkeys, tkeys, now, now + ms, mina.time, function (val) {
                var attr = {};
                for (var key in keys) if (keys[has](key)) {
                    attr[key] = keys[key](val);
                }
                el.attr(attr);
            }, easing);
        el.anims[anim.id] = anim;
        anim._attrs = attrs;
        anim._callback = callback;
        eve.once("mina.finish." + anim.id, function () {
            delete el.anims[anim.id];
            callback && callback.call(el);
        });
        eve.once("mina.stop." + anim.id, function () {
            delete el.anims[anim.id];
        });
        return el;
    };
    var eldata = {};
    /*\
     * Element.data
     [ method ]
     **
     * Adds or retrieves given value associated with given key. (Don’t confuse
     * with `data-` attributes)
     *
     * See also @Element.removeData
     - key (string) key to store data
     - value (any) #optional value to store
     = (object) @Element
     * or, if value is not specified:
     = (any) value
     > Usage
     | for (var i = 0, i < 5, i++) {
     |     paper.circle(10 + 15 * i, 10, 10)
     |          .attr({fill: "#000"})
     |          .data("i", i)
     |          .click(function () {
     |             alert(this.data("i"));
     |          });
     | }
    \*/
    elproto.data = function (key, value) {
        var data = eldata[this.id] = eldata[this.id] || {};
        if (arguments.length == 0){
            eve("snap.data.get." + this.id, this, data, null);
            return data;
        }
        if (arguments.length == 1) {
            if (Snap.is(key, "object")) {
                for (var i in key) if (key[has](i)) {
                    this.data(i, key[i]);
                }
                return this;
            }
            eve("snap.data.get." + this.id, this, data[key], key);
            return data[key];
        }
        data[key] = value;
        eve("snap.data.set." + this.id, this, value, key);
        return this;
    };
    /*\
     * Element.removeData
     [ method ]
     **
     * Removes value associated with an element by given key.
     * If key is not provided, removes all the data of the element.
     - key (string) #optional key
     = (object) @Element
    \*/
    elproto.removeData = function (key) {
        if (key == null) {
            eldata[this.id] = {};
        } else {
            eldata[this.id] && delete eldata[this.id][key];
        }
        return this;
    };
    /*\
     * Element.outerSVG
     [ method ]
     **
     * Returns SVG code for the element, equivalent to HTML's `outerHTML`.
     *
     * See also @Element.innerSVG
     = (string) SVG code for the element
    \*/
    /*\
     * Element.toString
     [ method ]
     **
     * See @Element.outerSVG
    \*/
    elproto.outerSVG = elproto.toString = toString(1);
    /*\
     * Element.innerSVG
     [ method ]
     **
     * Returns SVG code for the element's contents, equivalent to HTML's `innerHTML`
     = (string) SVG code for the element
    \*/
    elproto.innerSVG = toString();
    function toString(type) {
        return function () {
            var res = type ? "<" + this.type : "",
                attr = this.node.attributes,
                chld = this.node.childNodes;
            if (type) {
                for (var i = 0, ii = attr.length; i < ii; i++) {
                    res += " " + attr[i].name + '="' +
                            attr[i].value.replace(/"/g, '\\"') + '"';
                }
            }
            if (chld.length) {
                type && (res += ">");
                for (i = 0, ii = chld.length; i < ii; i++) {
                    if (chld[i].nodeType == 3) {
                        res += chld[i].nodeValue;
                    } else if (chld[i].nodeType == 1) {
                        res += wrap(chld[i]).toString();
                    }
                }
                type && (res += "</" + this.type + ">");
            } else {
                type && (res += "/>");
            }
            return res;
        };
    }
}(Element.prototype));
// SIERRA Snap.parse() accepts & returns a fragment, but there's no info on what it does in between. What if it doesn't parse?
/*\
 * Snap.parse
 [ method ]
 **
 * Parses SVG fragment and converts it into a @Fragment
 **
 - svg (string) SVG string
 = (Fragment) the @Fragment
\*/
Snap.parse = function (svg) {
    var f = glob.doc.createDocumentFragment(),
        full = true,
        div = glob.doc.createElement("div");
    svg = Str(svg);
    if (!svg.match(/^\s*<\s*svg(?:\s|>)/)) {
        svg = "<svg>" + svg + "</svg>";
        full = false;
    }
    div.innerHTML = svg;
    svg = div.getElementsByTagName("svg")[0];
    if (svg) {
        if (full) {
            f = svg;
        } else {
            while (svg.firstChild) {
                f.appendChild(svg.firstChild);
            }
        }
    }
    div.innerHTML = E;
    return new Fragment(f);
};
function Fragment(frag) {
    this.node = frag;
}
/*\
 * Fragment.select
 [ method ]
 **
 * See @Element.select
\*/
Fragment.prototype.select = Element.prototype.select;
/*\
 * Fragment.selectAll
 [ method ]
 **
 * See @Element.selectAll
\*/
Fragment.prototype.selectAll = Element.prototype.selectAll;
// SIERRA Snap.fragment() could especially use a code example
/*\
 * Snap.fragment
 [ method ]
 **
 * Creates a DOM fragment from a given list of elements or strings
 **
 - varargs (…) SVG string
 = (Fragment) the @Fragment
\*/
Snap.fragment = function () {
    var args = Array.prototype.slice.call(arguments, 0),
        f = glob.doc.createDocumentFragment();
    for (var i = 0, ii = args.length; i < ii; i++) {
        var item = args[i];
        if (item.node && item.node.nodeType) {
            f.appendChild(item.node);
        }
        if (item.nodeType) {
            f.appendChild(item);
        }
        if (typeof item == "string") {
            f.appendChild(Snap.parse(item).node);
        }
    }
    return new Fragment(f);
};

function make(name, parent) {
    var res = $(name);
    parent.appendChild(res);
    var el = wrap(res);
    el.type = name;
    return el;
}
function Paper(w, h) {
    var res,
        desc,
        defs,
        proto = Paper.prototype;
    if (w && w.tagName == "svg") {
        if (w.snap in hub) {
            return hub[w.snap];
        }
        res = new Element(w);
        desc = w.getElementsByTagName("desc")[0];
        defs = w.getElementsByTagName("defs")[0];
        if (!desc) {
            desc = $("desc");
            desc.appendChild(glob.doc.createTextNode("Created with Snap"));
            res.node.appendChild(desc);
        }
        if (!defs) {
            defs = $("defs");
            res.node.appendChild(defs);
        }
        res.defs = defs;
        for (var key in proto) if (proto[has](key)) {
            res[key] = proto[key];
        }
        res.paper = res.root = res;
    } else {
        res = make("svg", glob.doc.body);
        $(res.node, {
            height: h,
            version: 1.1,
            width: w,
            xmlns: xmlns
        });
    }
    return res;
}
function wrap(dom) {
    if (!dom) {
        return dom;
    }
    if (dom instanceof Element || dom instanceof Fragment) {
        return dom;
    }
    if (dom.tagName == "svg") {
        return new Paper(dom);
    }
    return new Element(dom);
}
// gradients' helpers
function Gstops() {
    return this.selectAll("stop");
}
function GaddStop(color, offset) {
    var stop = $("stop"),
        attr = {
            offset: +offset + "%"
        };
    color = Snap.color(color);
    attr["stop-color"] = color.hex;
    if (color.opacity < 1) {
        attr["stop-opacity"] = color.opacity;
    }
    $(stop, attr);
    this.node.appendChild(stop);
    return this;
}
function GgetBBox() {
    if (this.type == "linearGradient") {
        var x1 = $(this.node, "x1") || 0,
            x2 = $(this.node, "x2") || 1,
            y1 = $(this.node, "y1") || 0,
            y2 = $(this.node, "y2") || 0;
        return Snap._.box(x1, y1, math.abs(x2 - x1), math.abs(y2 - y1));
    } else {
        var cx = this.node.cx || .5,
            cy = this.node.cy || .5,
            r = this.node.r || 0;
        return Snap._.box(cx - r, cy - r, r * 2, r * 2);
    }
}
function gradient(defs, str) {
    var grad = arrayFirstValue(eve("snap.util.grad.parse", null, str)),
        el;
    if (!grad) {
        return null;
    }
    grad.params.unshift(defs);
    if (grad.type.toLowerCase() == "l") {
        el = gradientLinear.apply(0, grad.params);
    } else {
        el = gradientRadial.apply(0, grad.params);
    }
    if (grad.type != grad.type.toLowerCase()) {
        $(el.node, {
            gradientUnits: "userSpaceOnUse"
        });
    }
    var stops = grad.stops,
        len = stops.length,
        start = 0,
        j = 0;
    function seed(i, end) {
        var step = (end - start) / (i - j);
        for (var k = j; k < i; k++) {
            stops[k].offset = +(+start + step * (k - j)).toFixed(2);
        }
        j = i;
        start = end;
    }
    len--;
    for (var i = 0; i < len; i++) if ("offset" in stops[i]) {
        seed(i, stops[i].offset);
    }
    stops[len].offset = stops[len].offset || 100;
    seed(len, stops[len].offset);
    for (i = 0; i <= len; i++) {
        var stop = stops[i];
        el.addStop(stop.color, stop.offset);
    }
    return el;
}
function gradientLinear(defs, x1, y1, x2, y2) {
    var el = make("linearGradient", defs);
    el.stops = Gstops;
    el.addStop = GaddStop;
    el.getBBox = GgetBBox;
    if (x1 != null) {
        $(el.node, {
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2
        });
    }
    return el;
}
function gradientRadial(defs, cx, cy, r, fx, fy) {
    var el = make("radialGradient", defs);
    el.stops = Gstops;
    el.addStop = GaddStop;
    el.getBBox = GgetBBox;
    if (cx != null) {
        $(el.node, {
            cx: cx,
            cy: cy,
            r: r
        });
    }
    if (fx != null && fy != null) {
        $(el.node, {
            fx: fx,
            fy: fy
        });
    }
    return el;
}
// Paper prototype methods
(function (proto) {
    /*\
     * Paper.el
     [ method ]
     **
     * Creates an element on paper with a given name and no attributes
     **
     - name (string) tag name
     - attr (object) attributes
     = (Element) the current element
     > Usage
     | var c = paper.circle(10, 10, 10); // is the same as...
     | var c = paper.el("circle").attr({
     |     cx: 10,
     |     cy: 10,
     |     r: 10
     | });
     | // and the same as
     | var c = paper.el("circle", {
     |     cx: 10,
     |     cy: 10,
     |     r: 10
     | });
    \*/
    proto.el = function (name, attr) {
        return make(name, this.node).attr(attr);
    };
    /*\
     * Paper.rect
     [ method ]
     *
     * Draws a rectangle
     **
     - x (number) x coordinate of the top left corner
     - y (number) y coordinate of the top left corner
     - width (number) width
     - height (number) height
     - rx (number) #optional horizontal radius for rounded corners, default is 0
     - ry (number) #optional vertical radius for rounded corners, default is rx or 0
     = (object) the `rect` element
     **
     > Usage
     | // regular rectangle
     | var c = paper.rect(10, 10, 50, 50);
     | // rectangle with rounded corners
     | var c = paper.rect(40, 40, 50, 50, 10);
    \*/
    proto.rect = function (x, y, w, h, rx, ry) {
        var attr;
        if (ry == null) {
            ry = rx;
        }
        if (is(x, "object") && "x" in x) {
            attr = x;
        } else if (x != null) {
            attr = {
                x: x,
                y: y,
                width: w,
                height: h
            };
            if (rx != null) {
                attr.rx = rx;
                attr.ry = ry;
            }
        }
        return this.el("rect", attr);
    };
    /*\
     * Paper.circle
     [ method ]
     **
     * Draws a circle
     **
     - x (number) x coordinate of the centre
     - y (number) y coordinate of the centre
     - r (number) radius
     = (object) the `circle` element
     **
     > Usage
     | var c = paper.circle(50, 50, 40);
    \*/
    proto.circle = function (cx, cy, r) {
        var attr;
        if (is(cx, "object") && "cx" in cx) {
            attr = cx;
        } else if (cx != null) {
            attr = {
                cx: cx,
                cy: cy,
                r: r
            };
        }
        return this.el("circle", attr);
    };

    /*\
     * Paper.image
     [ method ]
     **
     * Places an image on the surface
     **
     - src (string) URI of the source image
     - x (number) x offset position
     - y (number) y offset position
     - width (number) width of the image
     - height (number) height of the image
     = (object) the `image` element
     * or
     = (object) Snap element object with type `image`
     **
     > Usage
     | var c = paper.image("apple.png", 10, 10, 80, 80);
    \*/
    proto.image = function (src, x, y, width, height) {
        var el = make("image", this.node);
        if (is(src, "object") && "src" in src) {
            el.attr(src);
        } else if (src != null) {
            var set = {
                "xlink:href": src,
                preserveAspectRatio: "none"
            };
            if (x != null && y != null) {
                set.x = x;
                set.y = y;
            }
            if (width != null && height != null) {
                set.width = width;
                set.height = height;
            } else {
                preload(src, function () {
                    $(el.node, {
                        width: this.offsetWidth,
                        height: this.offsetHeight
                    });
                });
            }
            $(el.node, set);
        }
        return el;
    };
    /*\
     * Paper.ellipse
     [ method ]
     **
     * Draws an ellipse
     **
     - x (number) x coordinate of the centre
     - y (number) y coordinate of the centre
     - rx (number) horizontal radius
     - ry (number) vertical radius
     = (object) the `ellipse` element
     **
     > Usage
     | var c = paper.ellipse(50, 50, 40, 20);
    \*/
    proto.ellipse = function (cx, cy, rx, ry) {
        var el = make("ellipse", this.node);
        if (is(cx, "object") && "cx" in cx) {
            el.attr(cx);
        } else if (cx != null) {
            el.attr({
                cx: cx,
                cy: cy,
                rx: rx,
                ry: ry
            });
        }
        return el;
    };
    // SIERRA Paper.path(): Unclear from the link what a Catmull-Rom curveto is, and why it would make life any easier.
    /*\
     * Paper.path
     [ method ]
     **
     * Creates a `<path>` element using the given string as the path's definition
     - pathString (string) #optional path string in SVG format
     * Path string consists of one-letter commands, followed by comma seprarated arguments in numerical form. Example:
     | "M10,20L30,40"
     * This example features two commands: `M`, with arguments `(10, 20)` and `L` with arguments `(30, 40)`. Uppercase letter commands express coordinates in absolute terms, while lowercase commands express them in relative terms from the most recently declared coordinates.
     *
     # <p>Here is short list of commands available, for more details see <a href="http://www.w3.org/TR/SVG/paths.html#PathData" title="Details of a path's data attribute's format are described in the SVG specification.">SVG path string format</a> or <a href="https://developer.mozilla.org/en/SVG/Tutorial/Paths">article about path strings at MDN</a>.</p>
     # <table><thead><tr><th>Command</th><th>Name</th><th>Parameters</th></tr></thead><tbody>
     # <tr><td>M</td><td>moveto</td><td>(x y)+</td></tr>
     # <tr><td>Z</td><td>closepath</td><td>(none)</td></tr>
     # <tr><td>L</td><td>lineto</td><td>(x y)+</td></tr>
     # <tr><td>H</td><td>horizontal lineto</td><td>x+</td></tr>
     # <tr><td>V</td><td>vertical lineto</td><td>y+</td></tr>
     # <tr><td>C</td><td>curveto</td><td>(x1 y1 x2 y2 x y)+</td></tr>
     # <tr><td>S</td><td>smooth curveto</td><td>(x2 y2 x y)+</td></tr>
     # <tr><td>Q</td><td>quadratic Bézier curveto</td><td>(x1 y1 x y)+</td></tr>
     # <tr><td>T</td><td>smooth quadratic Bézier curveto</td><td>(x y)+</td></tr>
     # <tr><td>A</td><td>elliptical arc</td><td>(rx ry x-axis-rotation large-arc-flag sweep-flag x y)+</td></tr>
     # <tr><td>R</td><td><a href="http://en.wikipedia.org/wiki/Catmull–Rom_spline#Catmull.E2.80.93Rom_spline">Catmull-Rom curveto</a>*</td><td>x1 y1 (x y)+</td></tr></tbody></table>
     * * _Catmull-Rom curveto_ is a not standard SVG command and added to make life easier.
     * Note: there is a special case when a path consists of only three commands: `M10,10R…z`. In this case the path connects back to its starting point.
     > Usage
     | var c = paper.path("M10 10L90 90");
     | // draw a diagonal line:
     | // move to 10,10, line to 90,90
    \*/
    proto.path = function (d) {
        var el = make("path", this.node);
        if (is(d, "object") && !is(d, "array")) {
            el.attr(d);
        } else if (d) {
            el.attr({
                d: d
            });
        }
        return el;
    };
// SIERRA Paper.g(): Don't understand the code comment about the order being _different._ Wouldn't it be a rect followed by a circle?
    /*\
     * Paper.g
     [ method ]
     **
     * Creates a group element
     **
     - varargs (…) #optional elements to nest within the group
     = (object) the `g` element
     **
     > Usage
     | var c1 = paper.circle(),
     |     c2 = paper.rect(),
     |     g = paper.g(c2, c1); // note that the order of elements is different
     * or
     | var c1 = paper.circle(),
     |     c2 = paper.rect(),
     |     g = paper.g();
     | g.add(c2, c1);
    \*/
    /*\
     * Paper.group
     [ method ]
     **
     * See @Paper.g
    \*/
    proto.group = proto.g = function (first) {
        var el = make("g", this.node);
        el.add = add2group;
        for (var method in proto) if (proto[has](method)) {
            el[method] = proto[method];
        }
        if (arguments.length == 1 && first && !first.type) {
            el.attr(first);
        } else if (arguments.length) {
            el.add(Array.prototype.slice.call(arguments, 0));
        }
        return el;
    };
    /*\
     * Paper.text
     [ method ]
     **
     * Draws a text string
     **
     - x (number) x coordinate position
     - y (number) y coordinate position
     - text (string|array) The text string to draw or array of strings to nest within separate `<tspan>` elements
     = (object) the `text` element
     **
     > Usage
     | var t1 = paper.text(50, 50, "Snap");
     | var t2 = paper.text(50, 50, ["S","n","a","p"]);
     | // Text path usage
     | t1.attr({textpath: "M10,10L100,100"});
     | // or
     | var pth = paper.path("M10,10L100,100");
     | t1.attr({textpath: pth});
    \*/
    proto.text = function (x, y, text) {
        var el = make("text", this.node);
        if (is(x, "object")) {
            el.attr(x);
        } else if (x != null) {
            el.attr({
                x: x,
                y: y,
                text: text || ""
            });
        }
        return el;
    };
    /*\
     * Paper.line
     [ method ]
     **
     * Draws a line
     **
     - x1 (number) x coordinate position of the start
     - y1 (number) y coordinate position of the start
     - x2 (number) x coordinate position of the end
     - y2 (number) y coordinate position of the end
     = (object) the `line` element
     **
     > Usage
     | var t1 = paper.line(50, 50, 100, 100);
    \*/
    proto.line = function (x1, y1, x2, y2) {
        var el = make("line", this.node);
        if (is(x1, "object")) {
            el.attr(x1);
        } else if (x1 != null) {
            el.attr({
                x1: x1,
                x2: x2,
                y1: y1,
                y2: y2
            });
        }
        return el;
    };
    /*\
     * Paper.polyline
     [ method ]
     **
     * Draws a polyline
     **
     - points (array) array of points
     * or
     - varargs (…) points
     = (object) the `polyline` element
     **
     > Usage
     | var p1 = paper.polyline([10, 10, 100, 100]);
     | var p2 = paper.polyline(10, 10, 100, 100);
    \*/
    proto.polyline = function (points) {
        if (arguments.length > 1) {
            points = Array.prototype.slice.call(arguments, 0);
        }
        var el = make("polyline", this.node);
        if (is(points, "object") && !is(points, "array")) {
            el.attr(points);
        } else if (points != null) {
            el.attr({
                points: points
            });
        }
        return el;
    };
    /*\
     * Paper.polygon
     [ method ]
     **
     * Draws a polygon. See @Paper.polyline
    \*/
    proto.polygon = function (points) {
        if (arguments.length > 1) {
            points = Array.prototype.slice.call(arguments, 0);
        }
        var el = make("polygon", this.node);
        if (is(points, "object") && !is(points, "array")) {
            el.attr(points);
        } else if (points != null) {
            el.attr({
                points: points
            });
        }
        return el;
    };
    // gradients
    (function () {
        /*\
         * Paper.gradient
         [ method ]
         **
         * Creates a gradient element
         **
         - gradient (string) gradient descriptor
         > Gradient Descriptor
         * The gradient descriptor is an expression formatted as
         * follows: `<type>(<coords>)<colors>`.  The `<type>` can be
         * either linear or radial.  The uppercase `L` or `R` letters
         * indicate absolute coordinates offset from the SVG surface.
         * Lowercase `l` or `r` letters indicate coordinates
         * calculated relative to the element to which the gradient is
         * applied.  Coordinates specify a linear gradient vector as
         * `x1`, `y1`, `x2`, `y2`, or a radial gradient as `cx`, `cy`,
         * `r` and optional `fx`, `fy` specifying a focal point away
         * from the center of the circle. Specify `<colors>` as a list
         * of dash-separated CSS color values.  Each color may be
         * followed by a custom offset value, separated with a colon
         * character.
         > Examples
         * Linear gradient, relative from top-left corner to bottom-right
         * corner, from black through red to white:
         | var g = paper.gradient("l(0, 0, 1, 1)#000-#f00-#fff");
         * Linear gradient, absolute from (0, 0) to (100, 100), from black
         * through red at 25% to white:
         | var g = paper.gradient("L(0, 0, 100, 100)#000-#f00:25%-#fff");
         * Radial gradient, relative from the center of the element with radius
         * half the width, from black to white:
         | var g = paper.gradient("r(0.5, 0.5, 0.5)#000-#fff");
         * To apply the gradient:
         | paper.circle(50, 50, 40).attr({
         |     fill: g
         | });
         = (object) the `gradient` element
        \*/
        proto.gradient = function (str) {
            return gradient(this.defs, str);
        };
        proto.gradientLinear = function (x1, y1, x2, y2) {
            return gradientLinear(this.defs, x1, y1, x2, y2);
        };
        proto.gradientRadial = function (cx, cy, r, fx, fy) {
            return gradientRadial(this.defs, cx, cy, r, fx, fy);
        };
        /*\
         * Paper.toString
         [ method ]
         **
         * Returns SVG code for the @Paper
         = (string) SVG code for the @Paper
        \*/
        proto.toString = function () {
            var f = glob.doc.createDocumentFragment(),
                d = glob.doc.createElement("div"),
                svg = this.node.cloneNode(true),
                res;
            f.appendChild(d);
            d.appendChild(svg);
            $(svg, {xmlns: xmlns});
            res = d.innerHTML;
            f.removeChild(f.firstChild);
            return res;
        };
        /*\
         * Paper.clear
         [ method ]
         **
         * Removes all child nodes of the paper, except <defs>.
        \*/
        proto.clear = function () {
            var node = this.node.firstChild,
                next;
            while (node) {
                next = node.nextSibling;
                if (node.tagName != "defs") {
                    node.parentNode.removeChild(node);
                }
                node = next;
            }
        };
    }());
}(Paper.prototype));

// simple ajax
/*\
 * Snap.ajax
 [ method ]
 **
 * Simple implementation of Ajax
 **
 - url (string) URL
 - postData (object|string) data for post request
 - callback (function) callback
 - scope (object) #optional scope of callback
 * or
 - url (string) URL
 - callback (function) callback
 - scope (object) #optional scope of callback
 = (XMLHttpRequest) the XMLHttpRequest object, just in case
\*/
Snap.ajax = function (url, postData, callback, scope){
    var req = new XMLHttpRequest,
        id = ID();
    if (req) {
        if (is(postData, "function")) {
            scope = callback;
            callback = postData;
            postData = null;
        } else if (is(postData, "object")) {
            var pd = [];
            for (var key in postData) if (postData.hasOwnProperty(key)) {
                pd.push(encodeURIComponent(key) + "=" + encodeURIComponent(postData[key]));
            }
            postData = pd.join("&");
        }
        req.open((postData ? "POST" : "GET"), url, true);
        req.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        if (postData) {
            req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        }
        if (callback) {
            eve.once("snap.ajax." + id + ".0", callback);
            eve.once("snap.ajax." + id + ".200", callback);
            eve.once("snap.ajax." + id + ".304", callback);
        }
        req.onreadystatechange = function() {
            if (req.readyState != 4) return;
            eve("snap.ajax." + id + "." + req.status, scope, req);
        };
        if (req.readyState == 4) {
            return req;
        }
        req.send(postData);
        return req;
    }
};
/*\
 * Snap.load
 [ method ]
 **
 * Loads external SVG file as a @Fragment (see @Snap.ajax for more advanced AJAX)
 **
 - url (string) URL
 - callback (function) callback
 - scope (object) #optional scope of callback
\*/
Snap.load = function (url, callback, scope) {
    Snap.ajax(url, function (req) {
        var f = Snap.parse(req.responseText);
        scope ? callback.call(scope, f) : callback(f);
    });
};

// Attributes event handlers
eve.on("snap.util.attr.mask", function (value) {
    if (value instanceof Element || value instanceof Fragment) {
        eve.stop();
        if (value instanceof Fragment && value.node.childNodes.length == 1) {
            value = value.node.firstChild;
            getSomeDefs(this).appendChild(value);
            value = wrap(value);
        }
        if (value.type == "mask") {
            var mask = value;
        } else {
            mask = make("mask", getSomeDefs(this));
            mask.node.appendChild(value.node);
            !mask.node.id && $(mask.node, {
                id: mask.id
            });
        }
        $(this.node, {
            mask: URL(mask.id)
        });
    }
});
(function (clipIt) {
    eve.on("snap.util.attr.clip", clipIt);
    eve.on("snap.util.attr.clip-path", clipIt);
    eve.on("snap.util.attr.clipPath", clipIt);
}(function (value) {
    if (value instanceof Element || value instanceof Fragment) {
        eve.stop();
        if (value.type == "clipPath") {
            var clip = value;
        } else {
            clip = make("clipPath", getSomeDefs(this));
            clip.node.appendChild(value.node);
            !clip.node.id && $(clip.node, {
                id: clip.id
            });
        }
        $(this.node, {
            "clip-path": URL(clip.id)
        });
    }
}));
function fillStroke(name) {
    return function (value) {
        eve.stop();
        if (value instanceof Fragment && value.node.childNodes.length == 1 &&
            (value.node.firstChild.tagName == "radialGradient" ||
            value.node.firstChild.tagName == "linearGradient" ||
            value.node.firstChild.tagName == "pattern")) {
            value = value.node.firstChild;
            getSomeDefs(this).appendChild(value);
            value = wrap(value);
        }
        if (value instanceof Element) {
            if (value.type == "radialGradient" || value.type == "linearGradient"
               || value.type == "pattern") {
                if (!value.node.id) {
                    $(value.node, {
                        id: value.id
                    });
                }
                var fill = URL(value.node.id);
            } else {
                fill = value.attr(name);
            }
        } else {
            fill = Snap.color(value);
            if (fill.error) {
                var grad = gradient(getSomeDefs(this), value);
                if (grad) {
                    if (!grad.node.id) {
                        $(grad.node, {
                            id: grad.id
                        });
                    }
                    fill = URL(grad.node.id);
                } else {
                    fill = value;
                }
            } else {
                fill = Str(fill);
            }
        }
        var attrs = {};
        attrs[name] = fill;
        $(this.node, attrs);
        this.node.style[name] = E;
    };
}
eve.on("snap.util.attr.fill", fillStroke("fill"));
eve.on("snap.util.attr.stroke", fillStroke("stroke"));
var gradrg = /^([lr])(?:\(([^)]*)\))?(.*)$/i;
eve.on("snap.util.grad.parse", function parseGrad(string) {
    string = Str(string);
    var tokens = string.match(gradrg);
    if (!tokens) {
        return null;
    }
    var type = tokens[1],
        params = tokens[2],
        stops = tokens[3];
    params = params.split(/\s*,\s*/).map(function (el) {
        return +el == el ? +el : el;
    });
    if (params.length == 1 && params[0] == 0) {
        params = [];
    }
    stops = stops.split("-");
    stops = stops.map(function (el) {
        el = el.split(":");
        var out = {
            color: el[0]
        };
        if (el[1]) {
            out.offset = el[1];
        }
        return out;
    });
    return {
        type: type,
        params: params,
        stops: stops
    };
});

eve.on("snap.util.attr.d", function (value) {
    eve.stop();
    if (is(value, "array") && is(value[0], "array")) {
        value = Snap.path.toString.call(value);
    }
    value = Str(value);
    if (value.match(/[ruo]/i)) {
        value = Snap.path.toAbsolute(value);
    }
    $(this.node, {d: value});
})(-1);
eve.on("snap.util.attr.#text", function (value) {
    eve.stop();
    value = Str(value);
    var txt = glob.doc.createTextNode(value);
    while (this.node.firstChild) {
        this.node.removeChild(this.node.firstChild);
    }
    this.node.appendChild(txt);
})(-1);
eve.on("snap.util.attr.path", function (value) {
    eve.stop();
    this.attr({d: value});
})(-1);
eve.on("snap.util.attr.viewBox", function (value) {
    var vb;
    if (is(value, "object") && "x" in value) {
        vb = [value.x, value.y, value.width, value.height].join(" ");
    } else if (is(value, "array")) {
        vb = value.join(" ");
    } else {
        vb = value;
    }
    $(this.node, {
        viewBox: vb
    });
    eve.stop();
})(-1);
eve.on("snap.util.attr.transform", function (value) {
    this.transform(value);
    eve.stop();
})(-1);
eve.on("snap.util.attr.r", function (value) {
    if (this.type == "rect") {
        eve.stop();
        $(this.node, {
            rx: value,
            ry: value
        });
    }
})(-1);
eve.on("snap.util.attr.textpath", function (value) {
    eve.stop();
    if (this.type == "text") {
        var id, tp, node;
        if (!value && this.textPath) {
            tp = this.textPath;
            while (tp.node.firstChild) {
                this.node.appendChild(tp.node.firstChild);
            }
            tp.remove();
            delete this.textPath;
            return;
        }
        if (is(value, "string")) {
            var defs = getSomeDefs(this),
                path = wrap(defs.parentNode).path(value);
            defs.appendChild(path.node);
            id = path.id;
            path.attr({id: id});
        } else {
            value = wrap(value);
            if (value instanceof Element) {
                id = value.attr("id");
                if (!id) {
                    id = value.id;
                    value.attr({id: id});
                }
            }
        }
        if (id) {
            tp = this.textPath;
            node = this.node;
            if (tp) {
                tp.attr({"xlink:href": "#" + id});
            } else {
                tp = $("textPath", {
                    "xlink:href": "#" + id
                });
                while (node.firstChild) {
                    tp.appendChild(node.firstChild);
                }
                node.appendChild(tp);
                this.textPath = wrap(tp);
            }
        }
    }
})(-1);
eve.on("snap.util.attr.text", function (value) {
    if (this.type == "text") {
        var i = 0,
            node = this.node,
            tuner = function (chunk) {
                var out = $("tspan");
                if (is(chunk, "array")) {
                    for (var i = 0; i < chunk.length; i++) {
                        out.appendChild(tuner(chunk[i]));
                    }
                } else {
                    out.appendChild(glob.doc.createTextNode(chunk));
                }
                out.normalize && out.normalize();
                return out;
            };
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
        var tuned = tuner(value);
        while (tuned.firstChild) {
            node.appendChild(tuned.firstChild);
        }
    }
    eve.stop();
})(-1);
// default
var cssAttr = {
    "alignment-baseline": 0,
    "baseline-shift": 0,
    "clip": 0,
    "clip-path": 0,
    "clip-rule": 0,
    "color": 0,
    "color-interpolation": 0,
    "color-interpolation-filters": 0,
    "color-profile": 0,
    "color-rendering": 0,
    "cursor": 0,
    "direction": 0,
    "display": 0,
    "dominant-baseline": 0,
    "enable-background": 0,
    "fill": 0,
    "fill-opacity": 0,
    "fill-rule": 0,
    "filter": 0,
    "flood-color": 0,
    "flood-opacity": 0,
    "font": 0,
    "font-family": 0,
    "font-size": 0,
    "font-size-adjust": 0,
    "font-stretch": 0,
    "font-style": 0,
    "font-variant": 0,
    "font-weight": 0,
    "glyph-orientation-horizontal": 0,
    "glyph-orientation-vertical": 0,
    "image-rendering": 0,
    "kerning": 0,
    "letter-spacing": 0,
    "lighting-color": 0,
    "marker": 0,
    "marker-end": 0,
    "marker-mid": 0,
    "marker-start": 0,
    "mask": 0,
    "opacity": 0,
    "overflow": 0,
    "pointer-events": 0,
    "shape-rendering": 0,
    "stop-color": 0,
    "stop-opacity": 0,
    "stroke": 0,
    "stroke-dasharray": 0,
    "stroke-dashoffset": 0,
    "stroke-linecap": 0,
    "stroke-linejoin": 0,
    "stroke-miterlimit": 0,
    "stroke-opacity": 0,
    "stroke-width": 0,
    "text-anchor": 0,
    "text-decoration": 0,
    "text-rendering": 0,
    "unicode-bidi": 0,
    "visibility": 0,
    "word-spacing": 0,
    "writing-mode": 0
};

eve.on("snap.util.attr", function (value) {
    var att = eve.nt(),
        attr = {};
    att = att.substring(att.lastIndexOf(".") + 1);
    attr[att] = value;
    var style = att.replace(/-(\w)/gi, function (all, letter) {
            return letter.toUpperCase();
        }),
        css = att.replace(/[A-Z]/g, function (letter) {
            return "-" + letter.toLowerCase();
        });
    if (cssAttr[has](css)) {
        this.node.style[style] = value == null ? E : value;
    } else {
        $(this.node, attr);
    }
});
eve.on("snap.util.getattr.transform", function () {
    eve.stop();
    return this.transform();
})(-1);
eve.on("snap.util.getattr.textpath", function () {
    eve.stop();
    return this.textPath;
})(-1);
// Markers
(function () {
    function getter(end) {
        return function () {
            eve.stop();
            var style = glob.doc.defaultView.getComputedStyle(this.node, null).getPropertyValue("marker-" + end);
            if (style == "none") {
                return style;
            } else {
                return Snap(glob.doc.getElementById(style.match(reURLValue)[1]));
            }
        };
    }
    function setter(end) {
        return function (value) {
            eve.stop();
            var name = "marker" + end.charAt(0).toUpperCase() + end.substring(1);
            if (value == "" || !value) {
                this.node.style[name] = "none";
                return;
            }
            if (value.type == "marker") {
                var id = value.node.id;
                if (!id) {
                    $(value.node, {id: value.id});
                }
                this.node.style[name] = URL(id);
                return;
            }
        };
    }
    eve.on("snap.util.getattr.marker-end", getter("end"))(-1);
    eve.on("snap.util.getattr.markerEnd", getter("end"))(-1);
    eve.on("snap.util.getattr.marker-start", getter("start"))(-1);
    eve.on("snap.util.getattr.markerStart", getter("start"))(-1);
    eve.on("snap.util.getattr.marker-mid", getter("mid"))(-1);
    eve.on("snap.util.getattr.markerMid", getter("mid"))(-1);
    eve.on("snap.util.attr.marker-end", setter("end"))(-1);
    eve.on("snap.util.attr.markerEnd", setter("end"))(-1);
    eve.on("snap.util.attr.marker-start", setter("start"))(-1);
    eve.on("snap.util.attr.markerStart", setter("start"))(-1);
    eve.on("snap.util.attr.marker-mid", setter("mid"))(-1);
    eve.on("snap.util.attr.markerMid", setter("mid"))(-1);
}());
eve.on("snap.util.getattr.r", function () {
    if (this.type == "rect" && $(this.node, "rx") == $(this.node, "ry")) {
        eve.stop();
        return $(this.node, "rx");
    }
})(-1);
function textExtract(node) {
    var out = [];
    var children = node.childNodes;
    for (var i = 0, ii = children.length; i < ii; i++) {
        var chi = children[i];
        if (chi.nodeType == 3) {
            out.push(chi.nodeValue);
        }
        if (chi.tagName == "tspan") {
            if (chi.childNodes.length == 1 && chi.firstChild.nodeType == 3) {
                out.push(chi.firstChild.nodeValue);
            } else {
                out.push(textExtract(chi));
            }
        }
    }
    return out;
}
eve.on("snap.util.getattr.text", function () {
    if (this.type == "text" || this.type == "tspan") {
        eve.stop();
        var out = textExtract(this.node);
        return out.length == 1 ? out[0] : out;
    }
})(-1);
eve.on("snap.util.getattr.#text", function () {
    return this.node.textContent;
})(-1);
eve.on("snap.util.getattr.viewBox", function () {
    eve.stop();
    var vb = $(this.node, "viewBox").split(separator);
    return Snap._.box(+vb[0], +vb[1], +vb[2], +vb[3]);
    // TODO: investigate why I need to z-index it
})(-1);
eve.on("snap.util.getattr.points", function () {
    var p = $(this.node, "points");
    eve.stop();
    return p.split(separator);
});
eve.on("snap.util.getattr.path", function () {
    var p = $(this.node, "d");
    eve.stop();
    return p;
});
// default
eve.on("snap.util.getattr", function () {
    var att = eve.nt();
    att = att.substring(att.lastIndexOf(".") + 1);
    var css = att.replace(/[A-Z]/g, function (letter) {
        return "-" + letter.toLowerCase();
    });
    if (cssAttr[has](css)) {
        return glob.doc.defaultView.getComputedStyle(this.node, null).getPropertyValue(css);
    } else {
        return $(this.node, att);
    }
});
var getOffset = function (elem) {
    var box = elem.getBoundingClientRect(),
        doc = elem.ownerDocument,
        body = doc.body,
        docElem = doc.documentElement,
        clientTop = docElem.clientTop || body.clientTop || 0, clientLeft = docElem.clientLeft || body.clientLeft || 0,
        top  = box.top  + (g.win.pageYOffset || docElem.scrollTop || body.scrollTop ) - clientTop,
        left = box.left + (g.win.pageXOffset || docElem.scrollLeft || body.scrollLeft) - clientLeft;
    return {
        y: top,
        x: left
    };
};
/*\
 * Snap.getElementByPoint
 [ method ]
 **
 * Returns you topmost element under given point.
 **
 = (object) Snap element object
 - x (number) x coordinate from the top left corner of the window
 - y (number) y coordinate from the top left corner of the window
 > Usage
 | Snap.getElementByPoint(mouseX, mouseY).attr({stroke: "#f00"});
\*/
Snap.getElementByPoint = function (x, y) {
    var paper = this,
        svg = paper.canvas,
        target = glob.doc.elementFromPoint(x, y);
    if (glob.win.opera && target.tagName == "svg") {
        var so = getOffset(target),
            sr = target.createSVGRect();
        sr.x = x - so.x;
        sr.y = y - so.y;
        sr.width = sr.height = 1;
        var hits = target.getIntersectionList(sr, null);
        if (hits.length) {
            target = hits[hits.length - 1];
        }
    }
    if (!target) {
        return null;
    }
    return wrap(target);
};
/*\
 * Snap.plugin
 [ method ]
 **
 * Let you write plugins. You pass in a function with four arguments, like this:
 | Snap.plugin(function (Snap, Element, Paper, global) {
 |     Snap.newmethod = function () {};
 |     Element.prototype.newmethod = function () {};
 |     Paper.prototype.newmethod = function () {};
 | });
 * Inside the function you have access to all main objects (and their
 * prototypes). This allow you to extend anything you want.
 **
 - f (function) your plugin body
\*/
Snap.plugin = function (f) {
    f(Snap, Element, Paper, glob);
};
glob.win.Snap = Snap;
return Snap;
}(window || this));

// Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Snap.plugin(function (Snap, Element, Paper, glob) {
    var elproto = Element.prototype,
        is = Snap.is,
        clone = Snap._.clone,
        has = "hasOwnProperty",
        p2s = /,?([a-z]),?/gi,
        toFloat = parseFloat,
        math = Math,
        PI = math.PI,
        mmin = math.min,
        mmax = math.max,
        pow = math.pow,
        abs = math.abs;
    function paths(ps) {
        var p = paths.ps = paths.ps || {};
        if (p[ps]) {
            p[ps].sleep = 100;
        } else {
            p[ps] = {
                sleep: 100
            };
        }
        setTimeout(function () {
            for (var key in p) if (p[has](key) && key != ps) {
                p[key].sleep--;
                !p[key].sleep && delete p[key];
            }
        });
        return p[ps];
    }
    function box(x, y, width, height) {
        if (x == null) {
            x = y = width = height = 0;
        }
        if (y == null) {
            y = x.y;
            width = x.width;
            height = x.height;
            x = x.x;
        }
        return {
            x: x,
            y: y,
            width: width,
            w: width,
            height: height,
            h: height,
            x2: x + width,
            y2: y + height,
            cx: x + width / 2,
            cy: y + height / 2,
            r1: math.min(width, height) / 2,
            r2: math.max(width, height) / 2,
            r0: math.sqrt(width * width + height * height) / 2,
            path: rectPath(x, y, width, height),
            vb: [x, y, width, height].join(" ")
        };
    }
    function toString() {
        return this.join(",").replace(p2s, "$1");
    }
    function pathClone(pathArray) {
        var res = clone(pathArray);
        res.toString = toString;
        return res;
    }
    function getPointAtSegmentLength(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, length) {
        if (length == null) {
            return bezlen(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y);
        } else {
            return findDotsAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y,
                getTotLen(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, length));
        }
    }
    function getLengthFactory(istotal, subpath) {
        function O(val) {
            return +(+val).toFixed(3);
        }
        return Snap._.cacher(function (path, length, onlystart) {
            if (path instanceof Element) {
                path = path.attr("d");
            }
            path = path2curve(path);
            var x, y, p, l, sp = "", subpaths = {}, point,
                len = 0;
            for (var i = 0, ii = path.length; i < ii; i++) {
                p = path[i];
                if (p[0] == "M") {
                    x = +p[1];
                    y = +p[2];
                } else {
                    l = getPointAtSegmentLength(x, y, p[1], p[2], p[3], p[4], p[5], p[6]);
                    if (len + l > length) {
                        if (subpath && !subpaths.start) {
                            point = getPointAtSegmentLength(x, y, p[1], p[2], p[3], p[4], p[5], p[6], length - len);
                            sp += [
                                "C" + O(point.start.x),
                                O(point.start.y),
                                O(point.m.x),
                                O(point.m.y),
                                O(point.x),
                                O(point.y)
                            ];
                            if (onlystart) {return sp;}
                            subpaths.start = sp;
                            sp = [
                                "M" + O(point.x),
                                O(point.y) + "C" + O(point.n.x),
                                O(point.n.y),
                                O(point.end.x),
                                O(point.end.y),
                                O(p[5]),
                                O(p[6])
                            ].join();
                            len += l;
                            x = +p[5];
                            y = +p[6];
                            continue;
                        }
                        if (!istotal && !subpath) {
                            point = getPointAtSegmentLength(x, y, p[1], p[2], p[3], p[4], p[5], p[6], length - len);
                            return point;
                        }
                    }
                    len += l;
                    x = +p[5];
                    y = +p[6];
                }
                sp += p.shift() + p;
            }
            subpaths.end = sp;
            point = istotal ? len : subpath ? subpaths : findDotsAtSegment(x, y, p[0], p[1], p[2], p[3], p[4], p[5], 1);
            return point;
        }, null, Snap._.clone);
    }
    var getTotalLength = getLengthFactory(1),
        getPointAtLength = getLengthFactory(),
        getSubpathsAtLength = getLengthFactory(0, 1);
    function findDotsAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t) {
        var t1 = 1 - t,
            t13 = pow(t1, 3),
            t12 = pow(t1, 2),
            t2 = t * t,
            t3 = t2 * t,
            x = t13 * p1x + t12 * 3 * t * c1x + t1 * 3 * t * t * c2x + t3 * p2x,
            y = t13 * p1y + t12 * 3 * t * c1y + t1 * 3 * t * t * c2y + t3 * p2y,
            mx = p1x + 2 * t * (c1x - p1x) + t2 * (c2x - 2 * c1x + p1x),
            my = p1y + 2 * t * (c1y - p1y) + t2 * (c2y - 2 * c1y + p1y),
            nx = c1x + 2 * t * (c2x - c1x) + t2 * (p2x - 2 * c2x + c1x),
            ny = c1y + 2 * t * (c2y - c1y) + t2 * (p2y - 2 * c2y + c1y),
            ax = t1 * p1x + t * c1x,
            ay = t1 * p1y + t * c1y,
            cx = t1 * c2x + t * p2x,
            cy = t1 * c2y + t * p2y,
            alpha = (90 - math.atan2(mx - nx, my - ny) * 180 / PI);
        // (mx > nx || my < ny) && (alpha += 180);
        return {
            x: x,
            y: y,
            m: {x: mx, y: my},
            n: {x: nx, y: ny},
            start: {x: ax, y: ay},
            end: {x: cx, y: cy},
            alpha: alpha
        };
    }
    function bezierBBox(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y) {
        if (!Snap.is(p1x, "array")) {
            p1x = [p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y];
        }
        var bbox = curveDim.apply(null, p1x);
        return box(
            bbox.min.x,
            bbox.min.y,
            bbox.max.x - bbox.min.x,
            bbox.max.y - bbox.min.y
        );
    }
    function isPointInsideBBox(bbox, x, y) {
        return  x >= bbox.x &&
                x <= bbox.x + bbox.width &&
                y >= bbox.y &&
                y <= bbox.y + bbox.height;
    }
    function isBBoxIntersect(bbox1, bbox2) {
        bbox1 = box(bbox1);
        bbox2 = box(bbox2);
        return isPointInsideBBox(bbox2, bbox1.x, bbox1.y)
            || isPointInsideBBox(bbox2, bbox1.x2, bbox1.y)
            || isPointInsideBBox(bbox2, bbox1.x, bbox1.y2)
            || isPointInsideBBox(bbox2, bbox1.x2, bbox1.y2)
            || isPointInsideBBox(bbox1, bbox2.x, bbox2.y)
            || isPointInsideBBox(bbox1, bbox2.x2, bbox2.y)
            || isPointInsideBBox(bbox1, bbox2.x, bbox2.y2)
            || isPointInsideBBox(bbox1, bbox2.x2, bbox2.y2)
            || (bbox1.x < bbox2.x2 && bbox1.x > bbox2.x
                || bbox2.x < bbox1.x2 && bbox2.x > bbox1.x)
            && (bbox1.y < bbox2.y2 && bbox1.y > bbox2.y
                || bbox2.y < bbox1.y2 && bbox2.y > bbox1.y);
    }
    function base3(t, p1, p2, p3, p4) {
        var t1 = -3 * p1 + 9 * p2 - 9 * p3 + 3 * p4,
            t2 = t * t1 + 6 * p1 - 12 * p2 + 6 * p3;
        return t * t2 - 3 * p1 + 3 * p2;
    }
    function bezlen(x1, y1, x2, y2, x3, y3, x4, y4, z) {
        if (z == null) {
            z = 1;
        }
        z = z > 1 ? 1 : z < 0 ? 0 : z;
        var z2 = z / 2,
            n = 12,
            Tvalues = [-.1252,.1252,-.3678,.3678,-.5873,.5873,-.7699,.7699,-.9041,.9041,-.9816,.9816],
            Cvalues = [0.2491,0.2491,0.2335,0.2335,0.2032,0.2032,0.1601,0.1601,0.1069,0.1069,0.0472,0.0472],
            sum = 0;
        for (var i = 0; i < n; i++) {
            var ct = z2 * Tvalues[i] + z2,
                xbase = base3(ct, x1, x2, x3, x4),
                ybase = base3(ct, y1, y2, y3, y4),
                comb = xbase * xbase + ybase * ybase;
            sum += Cvalues[i] * math.sqrt(comb);
        }
        return z2 * sum;
    }
    function getTotLen(x1, y1, x2, y2, x3, y3, x4, y4, ll) {
        if (ll < 0 || bezlen(x1, y1, x2, y2, x3, y3, x4, y4) < ll) {
            return;
        }
        var t = 1,
            step = t / 2,
            t2 = t - step,
            l,
            e = .01;
        l = bezlen(x1, y1, x2, y2, x3, y3, x4, y4, t2);
        while (abs(l - ll) > e) {
            step /= 2;
            t2 += (l < ll ? 1 : -1) * step;
            l = bezlen(x1, y1, x2, y2, x3, y3, x4, y4, t2);
        }
        return t2;
    }
    function intersect(x1, y1, x2, y2, x3, y3, x4, y4) {
        if (
            mmax(x1, x2) < mmin(x3, x4) ||
            mmin(x1, x2) > mmax(x3, x4) ||
            mmax(y1, y2) < mmin(y3, y4) ||
            mmin(y1, y2) > mmax(y3, y4)
        ) {
            return;
        }
        var nx = (x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4),
            ny = (x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4),
            denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

        if (!denominator) {
            return;
        }
        var px = nx / denominator,
            py = ny / denominator,
            px2 = +px.toFixed(2),
            py2 = +py.toFixed(2);
        if (
            px2 < +mmin(x1, x2).toFixed(2) ||
            px2 > +mmax(x1, x2).toFixed(2) ||
            px2 < +mmin(x3, x4).toFixed(2) ||
            px2 > +mmax(x3, x4).toFixed(2) ||
            py2 < +mmin(y1, y2).toFixed(2) ||
            py2 > +mmax(y1, y2).toFixed(2) ||
            py2 < +mmin(y3, y4).toFixed(2) ||
            py2 > +mmax(y3, y4).toFixed(2)
        ) {
            return;
        }
        return {x: px, y: py};
    }
    function inter(bez1, bez2) {
        return interHelper(bez1, bez2);
    }
    function interCount(bez1, bez2) {
        return interHelper(bez1, bez2, 1);
    }
    function interHelper(bez1, bez2, justCount) {
        var bbox1 = bezierBBox(bez1),
            bbox2 = bezierBBox(bez2);
        if (!isBBoxIntersect(bbox1, bbox2)) {
            return justCount ? 0 : [];
        }
        var l1 = bezlen.apply(0, bez1),
            l2 = bezlen.apply(0, bez2),
            n1 = ~~(l1 / 5),
            n2 = ~~(l2 / 5),
            dots1 = [],
            dots2 = [],
            xy = {},
            res = justCount ? 0 : [];
        for (var i = 0; i < n1 + 1; i++) {
            var p = findDotsAtSegment.apply(0, bez1.concat(i / n1));
            dots1.push({x: p.x, y: p.y, t: i / n1});
        }
        for (i = 0; i < n2 + 1; i++) {
            p = findDotsAtSegment.apply(0, bez2.concat(i / n2));
            dots2.push({x: p.x, y: p.y, t: i / n2});
        }
        for (i = 0; i < n1; i++) {
            for (var j = 0; j < n2; j++) {
                var di = dots1[i],
                    di1 = dots1[i + 1],
                    dj = dots2[j],
                    dj1 = dots2[j + 1],
                    ci = abs(di1.x - di.x) < .001 ? "y" : "x",
                    cj = abs(dj1.x - dj.x) < .001 ? "y" : "x",
                    is = intersect(di.x, di.y, di1.x, di1.y, dj.x, dj.y, dj1.x, dj1.y);
                if (is) {
                    if (xy[is.x.toFixed(4)] == is.y.toFixed(4)) {
                        continue;
                    }
                    xy[is.x.toFixed(4)] = is.y.toFixed(4);
                    var t1 = di.t + abs((is[ci] - di[ci]) / (di1[ci] - di[ci])) * (di1.t - di.t),
                        t2 = dj.t + abs((is[cj] - dj[cj]) / (dj1[cj] - dj[cj])) * (dj1.t - dj.t);
                    if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
                        if (justCount) {
                            res++;
                        } else {
                            res.push({
                                x: is.x,
                                y: is.y,
                                t1: t1,
                                t2: t2
                            });
                        }
                    }
                }
            }
        }
        return res;
    }
    function pathIntersection(path1, path2) {
        return interPathHelper(path1, path2);
    }
    function pathIntersectionNumber(path1, path2) {
        return interPathHelper(path1, path2, 1);
    }
    function interPathHelper(path1, path2, justCount) {
        path1 = path2curve(path1);
        path2 = path2curve(path2);
        var x1, y1, x2, y2, x1m, y1m, x2m, y2m, bez1, bez2,
            res = justCount ? 0 : [];
        for (var i = 0, ii = path1.length; i < ii; i++) {
            var pi = path1[i];
            if (pi[0] == "M") {
                x1 = x1m = pi[1];
                y1 = y1m = pi[2];
            } else {
                if (pi[0] == "C") {
                    bez1 = [x1, y1].concat(pi.slice(1));
                    x1 = bez1[6];
                    y1 = bez1[7];
                } else {
                    bez1 = [x1, y1, x1, y1, x1m, y1m, x1m, y1m];
                    x1 = x1m;
                    y1 = y1m;
                }
                for (var j = 0, jj = path2.length; j < jj; j++) {
                    var pj = path2[j];
                    if (pj[0] == "M") {
                        x2 = x2m = pj[1];
                        y2 = y2m = pj[2];
                    } else {
                        if (pj[0] == "C") {
                            bez2 = [x2, y2].concat(pj.slice(1));
                            x2 = bez2[6];
                            y2 = bez2[7];
                        } else {
                            bez2 = [x2, y2, x2, y2, x2m, y2m, x2m, y2m];
                            x2 = x2m;
                            y2 = y2m;
                        }
                        var intr = interHelper(bez1, bez2, justCount);
                        if (justCount) {
                            res += intr;
                        } else {
                            for (var k = 0, kk = intr.length; k < kk; k++) {
                                intr[k].segment1 = i;
                                intr[k].segment2 = j;
                                intr[k].bez1 = bez1;
                                intr[k].bez2 = bez2;
                            }
                            res = res.concat(intr);
                        }
                    }
                }
            }
        }
        return res;
    }
    function isPointInsidePath(path, x, y) {
        var bbox = pathBBox(path);
        return isPointInsideBBox(bbox, x, y) &&
               interPathHelper(path, [["M", x, y], ["H", bbox.x2 + 10]], 1) % 2 == 1;
    }
    function pathBBox(path) {
        var pth = paths(path);
        if (pth.bbox) {
            return clone(pth.bbox);
        }
        if (!path) {
            return box();
        }
        path = path2curve(path);
        var x = 0, 
            y = 0,
            X = [],
            Y = [],
            p;
        for (var i = 0, ii = path.length; i < ii; i++) {
            p = path[i];
            if (p[0] == "M") {
                x = p[1];
                y = p[2];
                X.push(x);
                Y.push(y);
            } else {
                var dim = curveDim(x, y, p[1], p[2], p[3], p[4], p[5], p[6]);
                X = X.concat(dim.min.x, dim.max.x);
                Y = Y.concat(dim.min.y, dim.max.y);
                x = p[5];
                y = p[6];
            }
        }
        var xmin = mmin.apply(0, X),
            ymin = mmin.apply(0, Y),
            xmax = mmax.apply(0, X),
            ymax = mmax.apply(0, Y),
            bb = box(xmin, ymin, xmax - xmin, ymax - ymin);
        pth.bbox = clone(bb);
        return bb;
    }
    function rectPath(x, y, w, h, r) {
        if (r) {
            return [
                ["M", x + r, y],
                ["l", w - r * 2, 0],
                ["a", r, r, 0, 0, 1, r, r],
                ["l", 0, h - r * 2],
                ["a", r, r, 0, 0, 1, -r, r],
                ["l", r * 2 - w, 0],
                ["a", r, r, 0, 0, 1, -r, -r],
                ["l", 0, r * 2 - h],
                ["a", r, r, 0, 0, 1, r, -r],
                ["z"]
            ];
        }
        var res = [["M", x, y], ["l", w, 0], ["l", 0, h], ["l", -w, 0], ["z"]];
        res.toString = toString;
        return res;
    }
    function ellipsePath(x, y, rx, ry, a) {
        if (a == null && ry == null) {
            ry = rx;
        }
        if (a != null) {
            var rad = Math.PI / 180,
                x1 = x + rx * Math.cos(-ry * rad),
                x2 = x + rx * Math.cos(-a * rad),
                y1 = y + rx * Math.sin(-ry * rad),
                y2 = y + rx * Math.sin(-a * rad),
                res = [["M", x1, y1], ["A", rx, rx, 0, +(a - ry > 180), 0, x2, y2]];
        } else {
            res = [
                ["M", x, y],
                ["m", 0, -ry],
                ["a", rx, ry, 0, 1, 1, 0, 2 * ry],
                ["a", rx, ry, 0, 1, 1, 0, -2 * ry],
                ["z"]
            ];
        }
        res.toString = toString;
        return res;
    }
    var unit2px = Snap._unit2px,
        getPath = {
        path: function (el) {
            return el.attr("path");
        },
        circle: function (el) {
            var attr = unit2px(el);
            return ellipsePath(attr.cx, attr.cy, attr.r);
        },
        ellipse: function (el) {
            var attr = unit2px(el);
            return ellipsePath(attr.cx, attr.cy, attr.rx, attr.ry);
        },
        rect: function (el) {
            var attr = unit2px(el);
            return rectPath(attr.x, attr.y, attr.width, attr.height, attr.rx, attr.ry);
        },
        image: function (el) {
            var attr = unit2px(el);
            return rectPath(attr.x, attr.y, attr.width, attr.height);
        },
        text: function (el) {
            var bbox = el.node.getBBox();
            return rectPath(bbox.x, bbox.y, bbox.width, bbox.height);
        },
        g: function (el) {
            var bbox = el.node.getBBox();
            return rectPath(bbox.x, bbox.y, bbox.width, bbox.height);
        },
        symbol: function (el) {
            var bbox = el.getBBox();
            return rectPath(bbox.x, bbox.y, bbox.width, bbox.height);
        },
        line: function (el) {
            return "M" + [el.attr("x1"), el.attr("y1"), el.attr("x2"), el.attr("y2")];
        },
        polyline: function (el) {
            return "M" + el.attr("points");
        },
        polygon: function (el) {
            return "M" + el.attr("points") + "z";
        },
        svg: function (el) {
            var bbox = el.node.getBBox();
            return rectPath(bbox.x, bbox.y, bbox.width, bbox.height);
        },
        deflt: function (el) {
            var bbox = el.node.getBBox();
            return rectPath(bbox.x, bbox.y, bbox.width, bbox.height);
        }
    };
    function pathToRelative(pathArray) {
        var pth = paths(pathArray),
            lowerCase = String.prototype.toLowerCase;
        if (pth.rel) {
            return pathClone(pth.rel);
        }
        if (!Snap.is(pathArray, "array") || !Snap.is(pathArray && pathArray[0], "array")) {
            pathArray = Snap.parsePathString(pathArray);
        }
        var res = [],
            x = 0,
            y = 0,
            mx = 0,
            my = 0,
            start = 0;
        if (pathArray[0][0] == "M") {
            x = pathArray[0][1];
            y = pathArray[0][2];
            mx = x;
            my = y;
            start++;
            res.push(["M", x, y]);
        }
        for (var i = start, ii = pathArray.length; i < ii; i++) {
            var r = res[i] = [],
                pa = pathArray[i];
            if (pa[0] != lowerCase.call(pa[0])) {
                r[0] = lowerCase.call(pa[0]);
                switch (r[0]) {
                    case "a":
                        r[1] = pa[1];
                        r[2] = pa[2];
                        r[3] = pa[3];
                        r[4] = pa[4];
                        r[5] = pa[5];
                        r[6] = +(pa[6] - x).toFixed(3);
                        r[7] = +(pa[7] - y).toFixed(3);
                        break;
                    case "v":
                        r[1] = +(pa[1] - y).toFixed(3);
                        break;
                    case "m":
                        mx = pa[1];
                        my = pa[2];
                    default:
                        for (var j = 1, jj = pa.length; j < jj; j++) {
                            r[j] = +(pa[j] - ((j % 2) ? x : y)).toFixed(3);
                        }
                }
            } else {
                r = res[i] = [];
                if (pa[0] == "m") {
                    mx = pa[1] + x;
                    my = pa[2] + y;
                }
                for (var k = 0, kk = pa.length; k < kk; k++) {
                    res[i][k] = pa[k];
                }
            }
            var len = res[i].length;
            switch (res[i][0]) {
                case "z":
                    x = mx;
                    y = my;
                    break;
                case "h":
                    x += +res[i][len - 1];
                    break;
                case "v":
                    y += +res[i][len - 1];
                    break;
                default:
                    x += +res[i][len - 2];
                    y += +res[i][len - 1];
            }
        }
        res.toString = toString;
        pth.rel = pathClone(res);
        return res;
    }
    function pathToAbsolute(pathArray) {
        var pth = paths(pathArray);
        if (pth.abs) {
            return pathClone(pth.abs);
        }
        if (!is(pathArray, "array") || !is(pathArray && pathArray[0], "array")) { // rough assumption
            pathArray = Snap.parsePathString(pathArray);
        }
        if (!pathArray || !pathArray.length) {
            return [["M", 0, 0]];
        }
        var res = [],
            x = 0,
            y = 0,
            mx = 0,
            my = 0,
            start = 0,
            pa0;
        if (pathArray[0][0] == "M") {
            x = +pathArray[0][1];
            y = +pathArray[0][2];
            mx = x;
            my = y;
            start++;
            res[0] = ["M", x, y];
        }
        var crz = pathArray.length == 3 &&
            pathArray[0][0] == "M" &&
            pathArray[1][0].toUpperCase() == "R" &&
            pathArray[2][0].toUpperCase() == "Z";
        for (var r, pa, i = start, ii = pathArray.length; i < ii; i++) {
            res.push(r = []);
            pa = pathArray[i];
            pa0 = pa[0];
            if (pa0 != pa0.toUpperCase()) {
                r[0] = pa0.toUpperCase();
                switch (r[0]) {
                    case "A":
                        r[1] = pa[1];
                        r[2] = pa[2];
                        r[3] = pa[3];
                        r[4] = pa[4];
                        r[5] = pa[5];
                        r[6] = +(pa[6] + x);
                        r[7] = +(pa[7] + y);
                        break;
                    case "V":
                        r[1] = +pa[1] + y;
                        break;
                    case "H":
                        r[1] = +pa[1] + x;
                        break;
                    case "R":
                        var dots = [x, y].concat(pa.slice(1));
                        for (var j = 2, jj = dots.length; j < jj; j++) {
                            dots[j] = +dots[j] + x;
                            dots[++j] = +dots[j] + y;
                        }
                        res.pop();
                        res = res.concat(catmullRom2bezier(dots, crz));
                        break;
                    case "O":
                        res.pop();
                        dots = ellipsePath(x, y, pa[1], pa[2]);
                        dots.push(dots[0]);
                        res = res.concat(dots);
                        break;
                    case "U":
                        res.pop();
                        res = res.concat(ellipsePath(x, y, pa[1], pa[2], pa[3]));
                        r = ["U"].concat(res[res.length - 1].slice(-2));
                        break;
                    case "M":
                        mx = +pa[1] + x;
                        my = +pa[2] + y;
                    default:
                        for (j = 1, jj = pa.length; j < jj; j++) {
                            r[j] = +pa[j] + ((j % 2) ? x : y);
                        }
                }
            } else if (pa0 == "R") {
                dots = [x, y].concat(pa.slice(1));
                res.pop();
                res = res.concat(catmullRom2bezier(dots, crz));
                r = ["R"].concat(pa.slice(-2));
            } else if (pa0 == "O") {
                res.pop();
                dots = ellipsePath(x, y, pa[1], pa[2]);
                dots.push(dots[0]);
                res = res.concat(dots);
            } else if (pa0 == "U") {
                res.pop();
                res = res.concat(ellipsePath(x, y, pa[1], pa[2], pa[3]));
                r = ["U"].concat(res[res.length - 1].slice(-2));
            } else {
                for (var k = 0, kk = pa.length; k < kk; k++) {
                    r[k] = pa[k];
                }
            }
            pa0 = pa0.toUpperCase();
            if (pa0 != "O") {
                switch (r[0]) {
                    case "Z":
                        x = mx;
                        y = my;
                        break;
                    case "H":
                        x = r[1];
                        break;
                    case "V":
                        y = r[1];
                        break;
                    case "M":
                        mx = r[r.length - 2];
                        my = r[r.length - 1];
                    default:
                        x = r[r.length - 2];
                        y = r[r.length - 1];
                }
            }
        }
        res.toString = toString;
        pth.abs = pathClone(res);
        return res;
    }
    function l2c(x1, y1, x2, y2) {
        return [x1, y1, x2, y2, x2, y2];
    }
    function q2c(x1, y1, ax, ay, x2, y2) {
        var _13 = 1 / 3,
            _23 = 2 / 3;
        return [
                _13 * x1 + _23 * ax,
                _13 * y1 + _23 * ay,
                _13 * x2 + _23 * ax,
                _13 * y2 + _23 * ay,
                x2,
                y2
            ];
    }
    function a2c(x1, y1, rx, ry, angle, large_arc_flag, sweep_flag, x2, y2, recursive) {
        // for more information of where this math came from visit:
        // http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
        var _120 = PI * 120 / 180,
            rad = PI / 180 * (+angle || 0),
            res = [],
            xy,
            rotate = Snap._.cacher(function (x, y, rad) {
                var X = x * math.cos(rad) - y * math.sin(rad),
                    Y = x * math.sin(rad) + y * math.cos(rad);
                return {x: X, y: Y};
            });
        if (!recursive) {
            xy = rotate(x1, y1, -rad);
            x1 = xy.x;
            y1 = xy.y;
            xy = rotate(x2, y2, -rad);
            x2 = xy.x;
            y2 = xy.y;
            var cos = math.cos(PI / 180 * angle),
                sin = math.sin(PI / 180 * angle),
                x = (x1 - x2) / 2,
                y = (y1 - y2) / 2;
            var h = (x * x) / (rx * rx) + (y * y) / (ry * ry);
            if (h > 1) {
                h = math.sqrt(h);
                rx = h * rx;
                ry = h * ry;
            }
            var rx2 = rx * rx,
                ry2 = ry * ry,
                k = (large_arc_flag == sweep_flag ? -1 : 1) *
                    math.sqrt(abs((rx2 * ry2 - rx2 * y * y - ry2 * x * x) / (rx2 * y * y + ry2 * x * x))),
                cx = k * rx * y / ry + (x1 + x2) / 2,
                cy = k * -ry * x / rx + (y1 + y2) / 2,
                f1 = math.asin(((y1 - cy) / ry).toFixed(9)),
                f2 = math.asin(((y2 - cy) / ry).toFixed(9));

            f1 = x1 < cx ? PI - f1 : f1;
            f2 = x2 < cx ? PI - f2 : f2;
            f1 < 0 && (f1 = PI * 2 + f1);
            f2 < 0 && (f2 = PI * 2 + f2);
            if (sweep_flag && f1 > f2) {
                f1 = f1 - PI * 2;
            }
            if (!sweep_flag && f2 > f1) {
                f2 = f2 - PI * 2;
            }
        } else {
            f1 = recursive[0];
            f2 = recursive[1];
            cx = recursive[2];
            cy = recursive[3];
        }
        var df = f2 - f1;
        if (abs(df) > _120) {
            var f2old = f2,
                x2old = x2,
                y2old = y2;
            f2 = f1 + _120 * (sweep_flag && f2 > f1 ? 1 : -1);
            x2 = cx + rx * math.cos(f2);
            y2 = cy + ry * math.sin(f2);
            res = a2c(x2, y2, rx, ry, angle, 0, sweep_flag, x2old, y2old, [f2, f2old, cx, cy]);
        }
        df = f2 - f1;
        var c1 = math.cos(f1),
            s1 = math.sin(f1),
            c2 = math.cos(f2),
            s2 = math.sin(f2),
            t = math.tan(df / 4),
            hx = 4 / 3 * rx * t,
            hy = 4 / 3 * ry * t,
            m1 = [x1, y1],
            m2 = [x1 + hx * s1, y1 - hy * c1],
            m3 = [x2 + hx * s2, y2 - hy * c2],
            m4 = [x2, y2];
        m2[0] = 2 * m1[0] - m2[0];
        m2[1] = 2 * m1[1] - m2[1];
        if (recursive) {
            return [m2, m3, m4].concat(res);
        } else {
            res = [m2, m3, m4].concat(res).join().split(",");
            var newres = [];
            for (var i = 0, ii = res.length; i < ii; i++) {
                newres[i] = i % 2 ? rotate(res[i - 1], res[i], rad).y : rotate(res[i], res[i + 1], rad).x;
            }
            return newres;
        }
    }
    function findDotAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t) {
        var t1 = 1 - t;
        return {
            x: pow(t1, 3) * p1x + pow(t1, 2) * 3 * t * c1x + t1 * 3 * t * t * c2x + pow(t, 3) * p2x,
            y: pow(t1, 3) * p1y + pow(t1, 2) * 3 * t * c1y + t1 * 3 * t * t * c2y + pow(t, 3) * p2y
        };
    }
    function curveDim(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y) {
        var a = (c2x - 2 * c1x + p1x) - (p2x - 2 * c2x + c1x),
            b = 2 * (c1x - p1x) - 2 * (c2x - c1x),
            c = p1x - c1x,
            t1 = (-b + math.sqrt(b * b - 4 * a * c)) / 2 / a,
            t2 = (-b - math.sqrt(b * b - 4 * a * c)) / 2 / a,
            y = [p1y, p2y],
            x = [p1x, p2x],
            dot;
        abs(t1) > "1e12" && (t1 = .5);
        abs(t2) > "1e12" && (t2 = .5);
        if (t1 > 0 && t1 < 1) {
            dot = findDotAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t1);
            x.push(dot.x);
            y.push(dot.y);
        }
        if (t2 > 0 && t2 < 1) {
            dot = findDotAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t2);
            x.push(dot.x);
            y.push(dot.y);
        }
        a = (c2y - 2 * c1y + p1y) - (p2y - 2 * c2y + c1y);
        b = 2 * (c1y - p1y) - 2 * (c2y - c1y);
        c = p1y - c1y;
        t1 = (-b + math.sqrt(b * b - 4 * a * c)) / 2 / a;
        t2 = (-b - math.sqrt(b * b - 4 * a * c)) / 2 / a;
        abs(t1) > "1e12" && (t1 = .5);
        abs(t2) > "1e12" && (t2 = .5);
        if (t1 > 0 && t1 < 1) {
            dot = findDotAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t1);
            x.push(dot.x);
            y.push(dot.y);
        }
        if (t2 > 0 && t2 < 1) {
            dot = findDotAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t2);
            x.push(dot.x);
            y.push(dot.y);
        }
        return {
            min: {x: mmin.apply(0, x), y: mmin.apply(0, y)},
            max: {x: mmax.apply(0, x), y: mmax.apply(0, y)}
        };
    }
    function path2curve(path, path2) {
        var pth = !path2 && paths(path);
        if (!path2 && pth.curve) {
            return pathClone(pth.curve);
        }
        var p = pathToAbsolute(path),
            p2 = path2 && pathToAbsolute(path2),
            attrs = {x: 0, y: 0, bx: 0, by: 0, X: 0, Y: 0, qx: null, qy: null},
            attrs2 = {x: 0, y: 0, bx: 0, by: 0, X: 0, Y: 0, qx: null, qy: null},
            processPath = function (path, d) {
                var nx, ny;
                if (!path) {
                    return ["C", d.x, d.y, d.x, d.y, d.x, d.y];
                }
                !(path[0] in {T:1, Q:1}) && (d.qx = d.qy = null);
                switch (path[0]) {
                    case "M":
                        d.X = path[1];
                        d.Y = path[2];
                        break;
                    case "A":
                        path = ["C"].concat(a2c.apply(0, [d.x, d.y].concat(path.slice(1))));
                        break;
                    case "S":
                        nx = d.x + (d.x - (d.bx || d.x));
                        ny = d.y + (d.y - (d.by || d.y));
                        path = ["C", nx, ny].concat(path.slice(1));
                        break;
                    case "T":
                        d.qx = d.x + (d.x - (d.qx || d.x));
                        d.qy = d.y + (d.y - (d.qy || d.y));
                        path = ["C"].concat(q2c(d.x, d.y, d.qx, d.qy, path[1], path[2]));
                        break;
                    case "Q":
                        d.qx = path[1];
                        d.qy = path[2];
                        path = ["C"].concat(q2c(d.x, d.y, path[1], path[2], path[3], path[4]));
                        break;
                    case "L":
                        path = ["C"].concat(l2c(d.x, d.y, path[1], path[2]));
                        break;
                    case "H":
                        path = ["C"].concat(l2c(d.x, d.y, path[1], d.y));
                        break;
                    case "V":
                        path = ["C"].concat(l2c(d.x, d.y, d.x, path[1]));
                        break;
                    case "Z":
                        path = ["C"].concat(l2c(d.x, d.y, d.X, d.Y));
                        break;
                }
                return path;
            },
            fixArc = function (pp, i) {
                if (pp[i].length > 7) {
                    pp[i].shift();
                    var pi = pp[i];
                    while (pi.length) {
                        pp.splice(i++, 0, ["C"].concat(pi.splice(0, 6)));
                    }
                    pp.splice(i, 1);
                    ii = mmax(p.length, p2 && p2.length || 0);
                }
            },
            fixM = function (path1, path2, a1, a2, i) {
                if (path1 && path2 && path1[i][0] == "M" && path2[i][0] != "M") {
                    path2.splice(i, 0, ["M", a2.x, a2.y]);
                    a1.bx = 0;
                    a1.by = 0;
                    a1.x = path1[i][1];
                    a1.y = path1[i][2];
                    ii = mmax(p.length, p2 && p2.length || 0);
                }
            };
        for (var i = 0, ii = mmax(p.length, p2 && p2.length || 0); i < ii; i++) {
            p[i] = processPath(p[i], attrs);
            fixArc(p, i);
            p2 && (p2[i] = processPath(p2[i], attrs2));
            p2 && fixArc(p2, i);
            fixM(p, p2, attrs, attrs2, i);
            fixM(p2, p, attrs2, attrs, i);
            var seg = p[i],
                seg2 = p2 && p2[i],
                seglen = seg.length,
                seg2len = p2 && seg2.length;
            attrs.x = seg[seglen - 2];
            attrs.y = seg[seglen - 1];
            attrs.bx = toFloat(seg[seglen - 4]) || attrs.x;
            attrs.by = toFloat(seg[seglen - 3]) || attrs.y;
            attrs2.bx = p2 && (toFloat(seg2[seg2len - 4]) || attrs2.x);
            attrs2.by = p2 && (toFloat(seg2[seg2len - 3]) || attrs2.y);
            attrs2.x = p2 && seg2[seg2len - 2];
            attrs2.y = p2 && seg2[seg2len - 1];
        }
        if (!p2) {
            pth.curve = pathClone(p);
        }
        return p2 ? [p, p2] : p;
    }
    function mapPath(path, matrix) {
        if (!matrix) {
            return path;
        }
        var x, y, i, j, ii, jj, pathi;
        path = path2curve(path);
        for (i = 0, ii = path.length; i < ii; i++) {
            pathi = path[i];
            for (j = 1, jj = pathi.length; j < jj; j += 2) {
                x = matrix.x(pathi[j], pathi[j + 1]);
                y = matrix.y(pathi[j], pathi[j + 1]);
                pathi[j] = x;
                pathi[j + 1] = y;
            }
        }
        return path;
    }

    // http://schepers.cc/getting-to-the-point
    function catmullRom2bezier(crp, z) {
        var d = [];
        for (var i = 0, iLen = crp.length; iLen - 2 * !z > i; i += 2) {
            var p = [
                        {x: +crp[i - 2], y: +crp[i - 1]},
                        {x: +crp[i],     y: +crp[i + 1]},
                        {x: +crp[i + 2], y: +crp[i + 3]},
                        {x: +crp[i + 4], y: +crp[i + 5]}
                    ];
            if (z) {
                if (!i) {
                    p[0] = {x: +crp[iLen - 2], y: +crp[iLen - 1]};
                } else if (iLen - 4 == i) {
                    p[3] = {x: +crp[0], y: +crp[1]};
                } else if (iLen - 2 == i) {
                    p[2] = {x: +crp[0], y: +crp[1]};
                    p[3] = {x: +crp[2], y: +crp[3]};
                }
            } else {
                if (iLen - 4 == i) {
                    p[3] = p[2];
                } else if (!i) {
                    p[0] = {x: +crp[i], y: +crp[i + 1]};
                }
            }
            d.push(["C",
                  (-p[0].x + 6 * p[1].x + p[2].x) / 6,
                  (-p[0].y + 6 * p[1].y + p[2].y) / 6,
                  (p[1].x + 6 * p[2].x - p[3].x) / 6,
                  (p[1].y + 6*p[2].y - p[3].y) / 6,
                  p[2].x,
                  p[2].y
            ]);
        }

        return d;
    }

    // export
    Snap.path = paths;

    /*\
     * Snap.path.getTotalLength
     [ method ]
     **
     * Returns the length of the given path in pixels
     **
     - path (string) SVG path string
     **
     = (number) length
    \*/
    Snap.path.getTotalLength = getTotalLength;
    /*\
     * Snap.path.getPointAtLength
     [ method ]
     **
     * Returns the coordinates of the point located at the given length along the given path
     **
     - path (string) SVG path string
     - length (number) length, in pixels, from the start of the path, excluding non-rendering jumps
     **
     = (object) representation of the point:
     o {
     o     x: (number) x coordinate,
     o     y: (number) y coordinate,
     o     alpha: (number) angle of derivative
     o }
    \*/
    Snap.path.getPointAtLength = getPointAtLength;
    /*\
     * Snap.path.getSubpath
     [ method ]
     **
     * Returns the subpath of a given path between given start and end lengths
     **
     - path (string) SVG path string
     - from (number) length, in pixels, from the start of the path to the start of the segment
     - to (number) length, in pixels, from the start of the path to the end of the segment
     **
     = (string) path string definition for the segment
    \*/
    Snap.path.getSubpath = function (path, from, to) {
        if (this.getTotalLength(path) - to < 1e-6) {
            return getSubpathsAtLength(path, from).end;
        }
        var a = getSubpathsAtLength(path, to, 1);
        return from ? getSubpathsAtLength(a, from).end : a;
    };
    /*\
     * Element.getTotalLength
     [ method ]
     **
     * Returns the length of the path in pixels (only works for `path` elements)
     = (number) length
    \*/
    elproto.getTotalLength = function () {
        if (this.node.getTotalLength) {
            return this.node.getTotalLength();
        }
    };
    // SIERRA Element.getPointAtLength()/Element.getTotalLength(): If a <path> is broken into different segments, is the jump distance to the new coordinates set by the _M_ or _m_ commands calculated as part of the path's total length?
    /*\
     * Element.getPointAtLength
     [ method ]
     **
     * Returns coordinates of the point located at the given length on the given path (only works for `path` elements)
     **
     - length (number) length, in pixels, from the start of the path, excluding non-rendering jumps
     **
     = (object) representation of the point:
     o {
     o     x: (number) x coordinate,
     o     y: (number) y coordinate,
     o     alpha: (number) angle of derivative
     o }
    \*/
    elproto.getPointAtLength = function (length) {
        return getPointAtLength(this.attr("d"), length);
    };
    // SIERRA Element.getSubpath(): Similar to the problem for Element.getPointAtLength(). Unclear how this would work for a segmented path. Overall, the concept of _subpath_ and what I'm calling a _segment_ (series of non-_M_ or _Z_ commands) is unclear.
    /*\
     * Element.getSubpath
     [ method ]
     **
     * Returns subpath of a given element from given start and end lengths (only works for `path` elements)
     **
     - from (number) length, in pixels, from the start of the path to the start of the segment
     - to (number) length, in pixels, from the start of the path to the end of the segment
     **
     = (string) path string definition for the segment
    \*/
    elproto.getSubpath = function (from, to) {
        return Snap.path.getSubpath(this.attr("d"), from, to);
    };
    Snap._.box = box;
    /*\
     * Snap.path.findDotsAtSegment
     [ method ]
     **
     * Utility method
     **
     * Finds dot coordinates on the given cubic beziér curve at the given t
     - p1x (number) x of the first point of the curve
     - p1y (number) y of the first point of the curve
     - c1x (number) x of the first anchor of the curve
     - c1y (number) y of the first anchor of the curve
     - c2x (number) x of the second anchor of the curve
     - c2y (number) y of the second anchor of the curve
     - p2x (number) x of the second point of the curve
     - p2y (number) y of the second point of the curve
     - t (number) position on the curve (0..1)
     = (object) point information in format:
     o {
     o     x: (number) x coordinate of the point,
     o     y: (number) y coordinate of the point,
     o     m: {
     o         x: (number) x coordinate of the left anchor,
     o         y: (number) y coordinate of the left anchor
     o     },
     o     n: {
     o         x: (number) x coordinate of the right anchor,
     o         y: (number) y coordinate of the right anchor
     o     },
     o     start: {
     o         x: (number) x coordinate of the start of the curve,
     o         y: (number) y coordinate of the start of the curve
     o     },
     o     end: {
     o         x: (number) x coordinate of the end of the curve,
     o         y: (number) y coordinate of the end of the curve
     o     },
     o     alpha: (number) angle of the curve derivative at the point
     o }
    \*/
    Snap.path.findDotsAtSegment = findDotsAtSegment;
    /*\
     * Snap.path.bezierBBox
     [ method ]
     **
     * Utility method
     **
     * Returns the bounding box of a given cubic beziér curve
     - p1x (number) x of the first point of the curve
     - p1y (number) y of the first point of the curve
     - c1x (number) x of the first anchor of the curve
     - c1y (number) y of the first anchor of the curve
     - c2x (number) x of the second anchor of the curve
     - c2y (number) y of the second anchor of the curve
     - p2x (number) x of the second point of the curve
     - p2y (number) y of the second point of the curve
     * or
     - bez (array) array of six points for beziér curve
     = (object) bounding box
     o {
     o     x: (number) x coordinate of the left top point of the box,
     o     y: (number) y coordinate of the left top point of the box,
     o     x2: (number) x coordinate of the right bottom point of the box,
     o     y2: (number) y coordinate of the right bottom point of the box,
     o     width: (number) width of the box,
     o     height: (number) height of the box
     o }
    \*/
    Snap.path.bezierBBox = bezierBBox;
    /*\
     * Snap.path.isPointInsideBBox
     [ method ]
     **
     * Utility method
     **
     * Returns `true` if given point is inside bounding box
     - bbox (string) bounding box
     - x (string) x coordinate of the point
     - y (string) y coordinate of the point
     = (boolean) `true` if point is inside
    \*/
    Snap.path.isPointInsideBBox = isPointInsideBBox;
    /*\
     * Snap.path.isBBoxIntersect
     [ method ]
     **
     * Utility method
     **
     * Returns `true` if two bounding boxes intersect
     - bbox1 (string) first bounding box
     - bbox2 (string) second bounding box
     = (boolean) `true` if bounding boxes intersect
    \*/
    Snap.path.isBBoxIntersect = isBBoxIntersect;
    /*\
     * Snap.path.intersection
     [ method ]
     **
     * Utility method
     **
     * Finds intersections of two paths
     - path1 (string) path string
     - path2 (string) path string
     = (array) dots of intersection
     o [
     o     {
     o         x: (number) x coordinate of the point,
     o         y: (number) y coordinate of the point,
     o         t1: (number) t value for segment of path1,
     o         t2: (number) t value for segment of path2,
     o         segment1: (number) order number for segment of path1,
     o         segment2: (number) order number for segment of path2,
     o         bez1: (array) eight coordinates representing beziér curve for the segment of path1,
     o         bez2: (array) eight coordinates representing beziér curve for the segment of path2
     o     }
     o ]
    \*/
    Snap.path.intersection = pathIntersection;
    Snap.path.intersectionNumber = pathIntersectionNumber;
    /*\
     * Snap.path.isPointInside
     [ method ]
     **
     * Utility method
     **
     * Returns `true` if given point is inside a given closed path.
     *
     * Note: fill mode doesn’t affect the result of this method.
     - path (string) path string
     - x (number) x of the point
     - y (number) y of the point
     = (boolean) `true` if point is inside the path
    \*/
    Snap.path.isPointInside = isPointInsidePath;
    /*\
     * Snap.path.getBBox
     [ method ]
     **
     * Utility method
     **
     * Returns the bounding box of a given path
     - path (string) path string
     = (object) bounding box
     o {
     o     x: (number) x coordinate of the left top point of the box,
     o     y: (number) y coordinate of the left top point of the box,
     o     x2: (number) x coordinate of the right bottom point of the box,
     o     y2: (number) y coordinate of the right bottom point of the box,
     o     width: (number) width of the box,
     o     height: (number) height of the box
     o }
    \*/
    Snap.path.getBBox = pathBBox;
    Snap.path.get = getPath;
    /*\
     * Snap.path.toRelative
     [ method ]
     **
     * Utility method
     **
     * Converts path coordinates into relative values
     - path (string) path string
     = (array) path string
    \*/
    Snap.path.toRelative = pathToRelative;
    /*\
     * Snap.path.toAbsolute
     [ method ]
     **
     * Utility method
     **
     * Converts path coordinates into absolute values
     - path (string) path string
     = (array) path string
    \*/
    Snap.path.toAbsolute = pathToAbsolute;
    /*\
     * Snap.path.toCubic
     [ method ]
     **
     * Utility method
     **
     * Converts path to a new path where all segments are cubic beziér curves
     - pathString (string|array) path string or array of segments
     = (array) array of segments
    \*/
    Snap.path.toCubic = path2curve;
    /*\
     * Snap.path.map
     [ method ]
     **
     * Transform the path string with the given matrix
     - path (string) path string
     - matrix (object) see @Matrix
     = (string) transformed path string
    \*/
    Snap.path.map = mapPath;
    Snap.path.toString = toString;
    Snap.path.clone = pathClone;
});
// Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Snap.plugin(function (Snap, Element, Paper, glob) {
    var mmax = Math.max,
        mmin = Math.min;

    // Set
    var Set = function (items) {
        this.items = [];
        this.length = 0;
        this.type = "set";
        if (items) {
            for (var i = 0, ii = items.length; i < ii; i++) {
                if (items[i]) {
                    this[this.items.length] = this.items[this.items.length] = items[i];
                    this.length++;
                }
            }
        }
    },
    setproto = Set.prototype;
    /*\
     * Set.push
     [ method ]
     **
     * Adds each argument to the current set
     = (object) original element
    \*/
    setproto.push = function () {
        var item,
            len;
        for (var i = 0, ii = arguments.length; i < ii; i++) {
            item = arguments[i];
            if (item) {
                len = this.items.length;
                this[len] = this.items[len] = item;
                this.length++;
            }
        }
        return this;
    };
    /*\
     * Set.pop
     [ method ]
     **
     * Removes last element and returns it
     = (object) element
    \*/
    setproto.pop = function () {
        this.length && delete this[this.length--];
        return this.items.pop();
    };
    /*\
     * Set.forEach
     [ method ]
     **
     * Executes given function for each element in the set
     *
     * If the function returns `false`, the loop stops running.
     **
     - callback (function) function to run
     - thisArg (object) context object for the callback
     = (object) Set object
    \*/
    setproto.forEach = function (callback, thisArg) {
        for (var i = 0, ii = this.items.length; i < ii; i++) {
            if (callback.call(thisArg, this.items[i], i) === false) {
                return this;
            }
        }
        return this;
    };
    setproto.remove = function () {
        while (this.length) {
            this.pop().remove();
        }
        return this;
    };
    setproto.attr = function (value) {
        for (var i = 0, ii = this.items.length; i < ii; i++) {
            this.items[i].attr(value);
        }
        return this;
    };
    /*\
     * Set.clear
     [ method ]
     **
     * Removes all elements from the set
    \*/
    setproto.clear = function () {
        while (this.length) {
            this.pop();
        }
    };
    /*\
     * Set.splice
     [ method ]
     **
     * Removes range of elements from the set
     **
     - index (number) position of the deletion
     - count (number) number of element to remove
     - insertion… (object) #optional elements to insert
     = (object) set elements that were deleted
    \*/
    setproto.splice = function (index, count, insertion) {
        index = index < 0 ? mmax(this.length + index, 0) : index;
        count = mmax(0, mmin(this.length - index, count));
        var tail = [],
            todel = [],
            args = [],
            i;
        for (i = 2; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        for (i = 0; i < count; i++) {
            todel.push(this[index + i]);
        }
        for (; i < this.length - index; i++) {
            tail.push(this[index + i]);
        }
        var arglen = args.length;
        for (i = 0; i < arglen + tail.length; i++) {
            this.items[index + i] = this[index + i] = i < arglen ? args[i] : tail[i - arglen];
        }
        i = this.items.length = this.length -= count - arglen;
        while (this[i]) {
            delete this[i++];
        }
        return new Set(todel);
    };
    /*\
     * Set.exclude
     [ method ]
     **
     * Removes given element from the set
     **
     - element (object) element to remove
     = (boolean) `true` if object was found and removed from the set
    \*/
    setproto.exclude = function (el) {
        for (var i = 0, ii = this.length; i < ii; i++) if (this[i] == el) {
            this.splice(i, 1);
            return true;
        }
        return false;
    };
    setproto.insertAfter = function (el) {
        var i = this.items.length;
        while (i--) {
            this.items[i].insertAfter(el);
        }
        return this;
    };
    setproto.getBBox = function () {
        var x = [],
            y = [],
            x2 = [],
            y2 = [];
        for (var i = this.items.length; i--;) if (!this.items[i].removed) {
            var box = this.items[i].getBBox();
            x.push(box.x);
            y.push(box.y);
            x2.push(box.x + box.width);
            y2.push(box.y + box.height);
        }
        x = mmin.apply(0, x);
        y = mmin.apply(0, y);
        x2 = mmax.apply(0, x2);
        y2 = mmax.apply(0, y2);
        return {
            x: x,
            y: y,
            x2: x2,
            y2: y2,
            width: x2 - x,
            height: y2 - y,
            cx: x + (x2 - x) / 2,
            cy: y + (y2 - y) / 2
        };
    };
    setproto.clone = function (s) {
        s = new Set;
        for (var i = 0, ii = this.items.length; i < ii; i++) {
            s.push(this.items[i].clone());
        }
        return s;
    };
    setproto.toString = function () {
        return "Snap\u2018s set";
    };
    setproto.type = "set";
    // export
    Snap.set = function () {
        var set = new Set;
        if (arguments.length) {
            set.push.apply(set, Array.prototype.slice.call(arguments, 0));
        }
        return set;
    };
});
// Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Snap.plugin(function (Snap, Element, Paper, glob) {
    var names = {},
        reUnit = /[a-z]+$/i,
        Str = String;
    names.stroke = names.fill = "colour";
    function getEmpty(item) {
        var l = item[0];
        switch (l.toLowerCase()) {
            case "t": return [l, 0, 0];
            case "m": return [l, 1, 0, 0, 1, 0, 0];
            case "r": if (item.length == 4) {
                return [l, 0, item[2], item[3]];
            } else {
                return [l, 0];
            }
            case "s": if (item.length == 5) {
                return [l, 1, 1, item[3], item[4]];
            } else if (item.length == 3) {
                return [l, 1, 1];
            } else {
                return [l, 1];
            }
        }
    }
    function equaliseTransform(t1, t2, getBBox) {
        t2 = Str(t2).replace(/\.{3}|\u2026/g, t1);
        t1 = Snap.parseTransformString(t1) || [];
        t2 = Snap.parseTransformString(t2) || [];
        var maxlength = Math.max(t1.length, t2.length),
            from = [],
            to = [],
            i = 0, j, jj,
            tt1, tt2;
        for (; i < maxlength; i++) {
            tt1 = t1[i] || getEmpty(t2[i]);
            tt2 = t2[i] || getEmpty(tt1);
            if ((tt1[0] != tt2[0]) ||
                (tt1[0].toLowerCase() == "r" && (tt1[2] != tt2[2] || tt1[3] != tt2[3])) ||
                (tt1[0].toLowerCase() == "s" && (tt1[3] != tt2[3] || tt1[4] != tt2[4]))
                ) {
                    t1 = Snap._.transform2matrix(t1, getBBox());
                    t2 = Snap._.transform2matrix(t2, getBBox());
                    from = [["m", t1.a, t1.b, t1.c, t1.d, t1.e, t1.f]];
                    to = [["m", t2.a, t2.b, t2.c, t2.d, t2.e, t2.f]];
                    break;
            }
            from[i] = [];
            to[i] = [];
            for (j = 0, jj = Math.max(tt1.length, tt2.length); j < jj; j++) {
                j in tt1 && (from[i][j] = tt1[j]);
                j in tt2 && (to[i][j] = tt2[j]);
            }
        }
        return {
            from: path2array(from),
            to: path2array(to),
            f: getPath(from)
        };
    }
    function getNumber(val) {
        return val;
    }
    function getUnit(unit) {
        return function (val) {
            return +val.toFixed(3) + unit;
        };
    }
    function getColour(clr) {
        return Snap.rgb(clr[0], clr[1], clr[2]);
    }
    function getPath(path) {
        var k = 0, i, ii, j, jj, out, a, b = [];
        for (i = 0, ii = path.length; i < ii; i++) {
            out = "[";
            a = ['"' + path[i][0] + '"'];
            for (j = 1, jj = path[i].length; j < jj; j++) {
                a[j] = "val[" + (k++) + "]";
            }
            out += a + "]";
            b[i] = out;
        }
        return Function("val", "return Snap.path.toString.call([" + b + "])");
    }
    function path2array(path) {
        var out = [];
        for (var i = 0, ii = path.length; i < ii; i++) {
            for (var j = 1, jj = path[i].length; j < jj; j++) {
                out.push(path[i][j]);
            }
        }
        return out;
    }
    Element.prototype.equal = function (name, b) {
        var A, B, a = Str(this.attr(name) || ""),
            el = this;
        if (a == +a && b == +b) {
            return {
                from: +a,
                to: +b,
                f: getNumber
            };
        }
        if (names[name] == "colour") {
            A = Snap.color(a);
            B = Snap.color(b);
            return {
                from: [A.r, A.g, A.b, A.opacity],
                to: [B.r, B.g, B.b, B.opacity],
                f: getColour
            };
        }
        if (name == "transform" || name == "gradientTransform" || name == "patternTransform") {
            if (b instanceof Snap.Matrix) {
                b = b.toTransformString();
            }
            if (!Snap._.rgTransform.test(b)) {
                b = Snap._.svgTransform2string(b);
            }
            return equaliseTransform(a, b, function () {
                return el.getBBox(1);
            });
        }
        if (name == "d" || name == "path") {
            A = Snap.path.toCubic(a, b);
            return {
                from: path2array(A[0]),
                to: path2array(A[1]),
                f: getPath(A[0])
            };
        }
        if (name == "points") {
            A = Str(a).split(",");
            B = Str(b).split(",");
            return {
                from: A,
                to: B,
                f: function (val) { return val; }
            };
        }
        var aUnit = a.match(reUnit),
            bUnit = Str(b).match(reUnit);
        if (aUnit && aUnit == bUnit) {
            return {
                from: parseFloat(a),
                to: parseFloat(b),
                f: getUnit(aUnit)
            };
        } else {
            return {
                from: this.asPX(name),
                to: this.asPX(name, b),
                f: getNumber
            };
        }
    };
});
// Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Snap.plugin(function (Snap, Element, Paper, glob) {
    var elproto = Element.prototype,
    has = "hasOwnProperty",
    supportsTouch = "createTouch" in glob.doc,
    events = [
        "click", "dblclick", "mousedown", "mousemove", "mouseout",
        "mouseover", "mouseup", "touchstart", "touchmove", "touchend",
        "touchcancel"
    ],
    touchMap = {
        mousedown: "touchstart",
        mousemove: "touchmove",
        mouseup: "touchend"
    },
    getScroll = function (xy) {
        var name = xy == "y" ? "scrollTop" : "scrollLeft";
        return glob.doc.documentElement[name] || glob.doc.body[name];
    },
    preventDefault = function () {
        this.returnValue = false;
    },
    preventTouch = function () {
        return this.originalEvent.preventDefault();
    },
    stopPropagation = function () {
        this.cancelBubble = true;
    },
    stopTouch = function () {
        return this.originalEvent.stopPropagation();
    },
    addEvent = (function () {
        if (glob.doc.addEventListener) {
            return function (obj, type, fn, element) {
                var realName = supportsTouch && touchMap[type] ? touchMap[type] : type,
                    f = function (e) {
                        var scrollY = getScroll("y"),
                            scrollX = getScroll("x");
                        if (supportsTouch && touchMap[has](type)) {
                            for (var i = 0, ii = e.targetTouches && e.targetTouches.length; i < ii; i++) {
                                if (e.targetTouches[i].target == obj || obj.contains(e.targetTouches[i].target)) {
                                    var olde = e;
                                    e = e.targetTouches[i];
                                    e.originalEvent = olde;
                                    e.preventDefault = preventTouch;
                                    e.stopPropagation = stopTouch;
                                    break;
                                }
                            }
                        }
                        var x = e.clientX + scrollX,
                            y = e.clientY + scrollY;
                        return fn.call(element, e, x, y);
                    };

                if (type !== realName) {
                    obj.addEventListener(type, f, false);
                }

                obj.addEventListener(realName, f, false);

                return function () {
                    if (type !== realName) {
                        obj.removeEventListener(type, f, false);
                    }

                    obj.removeEventListener(realName, f, false);
                    return true;
                };
            };
        } else if (glob.doc.attachEvent) {
            return function (obj, type, fn, element) {
                var f = function (e) {
                    e = e || glob.win.event;
                    var scrollY = getScroll("y"),
                        scrollX = getScroll("x"),
                        x = e.clientX + scrollX,
                        y = e.clientY + scrollY;
                    e.preventDefault = e.preventDefault || preventDefault;
                    e.stopPropagation = e.stopPropagation || stopPropagation;
                    return fn.call(element, e, x, y);
                };
                obj.attachEvent("on" + type, f);
                var detacher = function () {
                    obj.detachEvent("on" + type, f);
                    return true;
                };
                return detacher;
            };
        }
    })(),
    drag = [],
    dragMove = function (e) {
        var x = e.clientX,
            y = e.clientY,
            scrollY = getScroll("y"),
            scrollX = getScroll("x"),
            dragi,
            j = drag.length;
        while (j--) {
            dragi = drag[j];
            if (supportsTouch) {
                var i = e.touches && e.touches.length,
                    touch;
                while (i--) {
                    touch = e.touches[i];
                    if (touch.identifier == dragi.el._drag.id || dragi.el.node.contains(touch.target)) {
                        x = touch.clientX;
                        y = touch.clientY;
                        (e.originalEvent ? e.originalEvent : e).preventDefault();
                        break;
                    }
                }
            } else {
                e.preventDefault();
            }
            var node = dragi.el.node,
                o,
                glob = Snap._.glob,
                next = node.nextSibling,
                parent = node.parentNode,
                display = node.style.display;
            // glob.win.opera && parent.removeChild(node);
            // node.style.display = "none";
            // o = dragi.el.paper.getElementByPoint(x, y);
            // node.style.display = display;
            // glob.win.opera && (next ? parent.insertBefore(node, next) : parent.appendChild(node));
            // o && eve("snap.drag.over." + dragi.el.id, dragi.el, o);
            x += scrollX;
            y += scrollY;
            eve("snap.drag.move." + dragi.el.id, dragi.move_scope || dragi.el, x - dragi.el._drag.x, y - dragi.el._drag.y, x, y, e);
        }
    },
    dragUp = function (e) {
        Snap.unmousemove(dragMove).unmouseup(dragUp);
        var i = drag.length,
            dragi;
        while (i--) {
            dragi = drag[i];
            dragi.el._drag = {};
            eve("snap.drag.end." + dragi.el.id, dragi.end_scope || dragi.start_scope || dragi.move_scope || dragi.el, e);
        }
        drag = [];
    };
    /*\
     * Element.click
     [ method ]
     **
     * Adds a click event handler to the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    /*\
     * Element.unclick
     [ method ]
     **
     * Removes a click event handler from the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    
    /*\
     * Element.dblclick
     [ method ]
     **
     * Adds a double click event handler to the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    /*\
     * Element.undblclick
     [ method ]
     **
     * Removes a double click event handler from the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    
    /*\
     * Element.mousedown
     [ method ]
     **
     * Adds a mousedown event handler to the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    /*\
     * Element.unmousedown
     [ method ]
     **
     * Removes a mousedown event handler from the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    
    /*\
     * Element.mousemove
     [ method ]
     **
     * Adds a mousemove event handler to the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    /*\
     * Element.unmousemove
     [ method ]
     **
     * Removes a mousemove event handler from the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    
    /*\
     * Element.mouseout
     [ method ]
     **
     * Adds a mouseout event handler to the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    /*\
     * Element.unmouseout
     [ method ]
     **
     * Removes a mouseout event handler from the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    
    /*\
     * Element.mouseover
     [ method ]
     **
     * Adds a mouseover event handler to the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    /*\
     * Element.unmouseover
     [ method ]
     **
     * Removes a mouseover event handler from the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    
    /*\
     * Element.mouseup
     [ method ]
     **
     * Adds a mouseup event handler to the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    /*\
     * Element.unmouseup
     [ method ]
     **
     * Removes a mouseup event handler from the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    
    /*\
     * Element.touchstart
     [ method ]
     **
     * Adds a touchstart event handler to the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    /*\
     * Element.untouchstart
     [ method ]
     **
     * Removes a touchstart event handler from the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    
    /*\
     * Element.touchmove
     [ method ]
     **
     * Adds a touchmove event handler to the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    /*\
     * Element.untouchmove
     [ method ]
     **
     * Removes a touchmove event handler from the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    
    /*\
     * Element.touchend
     [ method ]
     **
     * Adds a touchend event handler to the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    /*\
     * Element.untouchend
     [ method ]
     **
     * Removes a touchend event handler from the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    
    /*\
     * Element.touchcancel
     [ method ]
     **
     * Adds a touchcancel event handler to the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    /*\
     * Element.untouchcancel
     [ method ]
     **
     * Removes a touchcancel event handler from the element
     - handler (function) handler for the event
     = (object) @Element
    \*/
    for (var i = events.length; i--;) {
        (function (eventName) {
            Snap[eventName] = elproto[eventName] = function (fn, scope) {
                if (Snap.is(fn, "function")) {
                    this.events = this.events || [];
                    this.events.push({
                        name: eventName,
                        f: fn,
                        unbind: addEvent(this.shape || this.node || glob.doc, eventName, fn, scope || this)
                    });
                }
                return this;
            };
            Snap["un" + eventName] =
            elproto["un" + eventName] = function (fn) {
                var events = this.events || [],
                    l = events.length;
                while (l--) if (events[l].name == eventName &&
                               (events[l].f == fn || !fn)) {
                    events[l].unbind();
                    events.splice(l, 1);
                    !events.length && delete this.events;
                    return this;
                }
                return this;
            };
        })(events[i]);
    }
    /*\
     * Element.hover
     [ method ]
     **
     * Adds hover event handlers to the element
     - f_in (function) handler for hover in
     - f_out (function) handler for hover out
     - icontext (object) #optional context for hover in handler
     - ocontext (object) #optional context for hover out handler
     = (object) @Element
    \*/
    elproto.hover = function (f_in, f_out, scope_in, scope_out) {
        return this.mouseover(f_in, scope_in).mouseout(f_out, scope_out || scope_in);
    };
    /*\
     * Element.unhover
     [ method ]
     **
     * Removes hover event handlers from the element
     - f_in (function) handler for hover in
     - f_out (function) handler for hover out
     = (object) @Element
    \*/
    elproto.unhover = function (f_in, f_out) {
        return this.unmouseover(f_in).unmouseout(f_out);
    };
    var draggable = [];
    // SIERRA unclear what _context_ refers to for starting, ending, moving the drag gesture.
    // SIERRA Element.drag(): _x position of the mouse_: Where are the x/y values offset from?
    // SIERRA Element.drag(): much of this member's doc appears to be duplicated for some reason.
    // SIERRA Unclear about this sentence: _Additionally following drag events will be triggered: drag.start.<id> on start, drag.end.<id> on end and drag.move.<id> on every move._ Is there a global _drag_ object to which you can assign handlers keyed by an element's ID?
    /*\
     * Element.drag
     [ method ]
     **
     * Adds event handlers for an element's drag gesture
     **
     - onmove (function) handler for moving
     - onstart (function) handler for drag start
     - onend (function) handler for drag end
     - mcontext (object) #optional context for moving handler
     - scontext (object) #optional context for drag start handler
     - econtext (object) #optional context for drag end handler
     * Additionaly following `drag` events are triggered: `drag.start.<id>` on start, 
     * `drag.end.<id>` on end and `drag.move.<id>` on every move. When element is dragged over another element 
     * `drag.over.<id>` fires as well.
     *
     * Start event and start handler are called in specified context or in context of the element with following parameters:
     o x (number) x position of the mouse
     o y (number) y position of the mouse
     o event (object) DOM event object
     * Move event and move handler are called in specified context or in context of the element with following parameters:
     o dx (number) shift by x from the start point
     o dy (number) shift by y from the start point
     o x (number) x position of the mouse
     o y (number) y position of the mouse
     o event (object) DOM event object
     * End event and end handler are called in specified context or in context of the element with following parameters:
     o event (object) DOM event object
     = (object) @Element
    \*/
    elproto.drag = function (onmove, onstart, onend, move_scope, start_scope, end_scope) {
        if (!arguments.length) {
            var origTransform;
            return this.drag(function (dx, dy) {
                this.attr({
                    transform: origTransform + (origTransform ? "T" : "t") + [dx, dy]
                });
            }, function () {
                origTransform = this.transform().local;
            });
        }
        function start(e, x, y) {
            (e.originalEvent || e).preventDefault();
            this._drag.x = x;
            this._drag.y = y;
            this._drag.id = e.identifier;
            !drag.length && Snap.mousemove(dragMove).mouseup(dragUp);
            drag.push({el: this, move_scope: move_scope, start_scope: start_scope, end_scope: end_scope});
            onstart && eve.on("snap.drag.start." + this.id, onstart);
            onmove && eve.on("snap.drag.move." + this.id, onmove);
            onend && eve.on("snap.drag.end." + this.id, onend);
            eve("snap.drag.start." + this.id, start_scope || move_scope || this, x, y, e);
        }
        this._drag = {};
        draggable.push({el: this, start: start});
        this.mousedown(start);
        return this;
    };
    /*
     * Element.onDragOver
     [ method ]
     **
     * Shortcut to assign event handler for `drag.over.<id>` event, where `id` is the element's `id` (see @Element.id)
     - f (function) handler for event, first argument would be the element you are dragging over
    \*/
    // elproto.onDragOver = function (f) {
    //     f ? eve.on("snap.drag.over." + this.id, f) : eve.unbind("snap.drag.over." + this.id);
    // };
    /*\
     * Element.undrag
     [ method ]
     **
     * Removes all drag event handlers from the given element
    \*/
    elproto.undrag = function () {
        var i = draggable.length;
        while (i--) if (draggable[i].el == this) {
            this.unmousedown(draggable[i].start);
            draggable.splice(i, 1);
            eve.unbind("snap.drag.*." + this.id);
        }
        !draggable.length && Snap.unmousemove(dragMove).unmouseup(dragUp);
        return this;
    };
});
// Copyright (c) 2013 Adobe Systems Incorporated. All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
// http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Snap.plugin(function (Snap, Element, Paper, glob) {
    var elproto = Element.prototype,
        pproto = Paper.prototype,
        rgurl = /^\s*url\((.+)\)/,
        Str = String,
        $ = Snap._.$;
    Snap.filter = {};
// SIERRA Paper.filter(): I don't understand the note. Does that mean an HTML should dedicate a separate SVG region for a filter definition? What's the advantage over a DEFS?
    /*\
     * Paper.filter
     [ method ]
     **
     * Creates a `<filter>` element
     **
     - filstr (string) SVG fragment of filter provided as a string
     = (object) @Element
     * Note: It is recommended to use filters embedded into the page inside an empty SVG element.
     > Usage
     | var f = paper.filter('<feGaussianBlur stdDeviation="2"/>'),
     |     c = paper.circle(10, 10, 10).attr({
     |         filter: f
     |     });
    \*/
    pproto.filter = function (filstr) {
        var paper = this;
        if (paper.type != "svg") {
            paper = paper.paper;
        }
        var f = Snap.parse(Str(filstr)),
            id = Snap._.id(),
            width = paper.node.offsetWidth,
            height = paper.node.offsetHeight,
            filter = $("filter");
        $(filter, {
            id: id,
            filterUnits: "userSpaceOnUse"
        });
        filter.appendChild(f.node);
        paper.defs.appendChild(filter);
        return new Element(filter);
    };
    
    eve.on("snap.util.getattr.filter", function () {
        eve.stop();
        var p = $(this.node, "filter");
        if (p) {
            var match = Str(p).match(rgurl);
            return match && Snap.select(match[1]);
        }
    });
    eve.on("snap.util.attr.filter", function (value) {
        if (value instanceof Element && value.type == "filter") {
            eve.stop();
            var id = value.node.id;
            if (!id) {
                $(value.node, {id: value.id});
                id = value.id;
            }
            $(this.node, {
                filter: Snap.url(id)
            });
        }
        if (!value || value == "none") {
            eve.stop();
            this.node.removeAttribute("filter");
        }
    });
    /*\
     * Snap.filter.blur
     [ method ]
     **
     * Returns an SVG markup string for the blur filter
     **
     - x (number) amount of horizontal blur, in pixels
     - y (number) #optional amount of vertical blur, in pixels
     = (string) filter representation
     > Usage
     | var f = paper.filter(Snap.filter.blur(5, 10)),
     |     c = paper.circle(10, 10, 10).attr({
     |         filter: f
     |     });
    \*/
    Snap.filter.blur = function (x, y) {
        if (x == null) {
            x = 2;
        }
        var def = y == null ? x : [x, y];
        return Snap.format('\<feGaussianBlur stdDeviation="{def}"/>', {
            def: def
        });
    };
    Snap.filter.blur.toString = function () {
        return this();
    };
    /*\
     * Snap.filter.shadow
     [ method ]
     **
     * Returns an SVG markup string for the shadow filter
     **
     - dx (number) horizontal shift of the shadow, in pixels
     - dy (number) vertical shift of the shadow, in pixels
     - blur (number) #optional amount of blur
     - color (string) #optional color of the shadow
     = (string) filter representation
     > Usage
     | var f = paper.filter(Snap.filter.shadow(0, 2, 3)),
     |     c = paper.circle(10, 10, 10).attr({
     |         filter: f
     |     });
    \*/
    Snap.filter.shadow = function (dx, dy, blur, color) {
        color = color || "#000";
        if (blur == null) {
            blur = 4;
        }
        if (typeof blur == "string") {
            color = blur;
            blur = 4;
        }
        if (dx == null) {
            dx = 0;
            dy = 2;
        }
        if (dy == null) {
            dy = dx;
        }
        color = Snap.color(color);
        return Snap.format('<feGaussianBlur in="SourceAlpha" stdDeviation="{blur}"/><feOffset dx="{dx}" dy="{dy}" result="offsetblur"/><feFlood flood-color="{color}"/><feComposite in2="offsetblur" operator="in"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>', {
            color: color,
            dx: dx,
            dy: dy,
            blur: blur
        });
    };
    Snap.filter.shadow.toString = function () {
        return this();
    };
    /*\
     * Snap.filter.grayscale
     [ method ]
     **
     * Returns an SVG markup string for the grayscale filter
     **
     - amount (number) amount of filter (`0..1`)
     = (string) filter representation
    \*/
    Snap.filter.grayscale = function (amount) {
        if (amount == null) {
            amount = 1;
        }
        return Snap.format('<feColorMatrix type="matrix" values="{a} {b} {c} 0 0 {d} {e} {f} 0 0 {g} {b} {h} 0 0 0 0 0 1 0"/>', {
            a: 0.2126 + 0.7874 * (1 - amount),
            b: 0.7152 - 0.7152 * (1 - amount),
            c: 0.0722 - 0.0722 * (1 - amount),
            d: 0.2126 - 0.2126 * (1 - amount),
            e: 0.7152 + 0.2848 * (1 - amount),
            f: 0.0722 - 0.0722 * (1 - amount),
            g: 0.2126 - 0.2126 * (1 - amount),
            h: 0.0722 + 0.9278 * (1 - amount)
        });
    };
    Snap.filter.grayscale.toString = function () {
        return this();
    };
    /*\
     * Snap.filter.sepia
     [ method ]
     **
     * Returns an SVG markup string for the sepia filter
     **
     - amount (number) amount of filter (`0..1`)
     = (string) filter representation
    \*/
    Snap.filter.sepia = function (amount) {
        if (amount == null) {
            amount = 1;
        }
        return Snap.format('<feColorMatrix type="matrix" values="{a} {b} {c} 0 0 {d} {e} {f} 0 0 {g} {h} {i} 0 0 0 0 0 1 0"/>', {
            a: 0.393 + 0.607 * (1 - amount),
            b: 0.769 - 0.769 * (1 - amount),
            c: 0.189 - 0.189 * (1 - amount),
            d: 0.349 - 0.349 * (1 - amount),
            e: 0.686 + 0.314 * (1 - amount),
            f: 0.168 - 0.168 * (1 - amount),
            g: 0.272 - 0.272 * (1 - amount),
            h: 0.534 - 0.534 * (1 - amount),
            i: 0.131 + 0.869 * (1 - amount)
        });
    };
    Snap.filter.sepia.toString = function () {
        return this();
    };
    /*\
     * Snap.filter.saturate
     [ method ]
     **
     * Returns an SVG markup string for the saturate filter
     **
     - amount (number) amount of filter (`0..1`)
     = (string) filter representation
    \*/
    Snap.filter.saturate = function (amount) {
        if (amount == null) {
            amount = 1;
        }
        return Snap.format('<feColorMatrix type="saturate" values="{amount}"/>', {
            amount: 1 - amount
        });
    };
    Snap.filter.saturate.toString = function () {
        return this();
    };
    /*\
     * Snap.filter.hueRotate
     [ method ]
     **
     * Returns an SVG markup string for the hue-rotate filter
     **
     - angle (number) angle of rotation
     = (string) filter representation
    \*/
    Snap.filter.hueRotate = function (angle) {
        angle = angle || 0;
        return Snap.format('<feColorMatrix type="hueRotate" values="{angle}"/>', {
            angle: angle
        });
    };
    Snap.filter.hueRotate.toString = function () {
        return this();
    };
    /*\
     * Snap.filter.invert
     [ method ]
     **
     * Returns an SVG markup string for the invert filter
     **
     - amount (number) amount of filter (`0..1`)
     = (string) filter representation
    \*/
    Snap.filter.invert = function (amount) {
        if (amount == null) {
            amount = 1;
        }
        return Snap.format('<feComponentTransfer><feFuncR type="table" tableValues="{amount} {amount2}"/><feFuncG type="table" tableValues="{amount} {amount2}"/><feFuncB type="table" tableValues="{amount} {amount2}"/></feComponentTransfer>', {
            amount: amount,
            amount2: 1 - amount
        });
    };
    Snap.filter.invert.toString = function () {
        return this();
    };
    /*\
     * Snap.filter.brightness
     [ method ]
     **
     * Returns an SVG markup string for the brightness filter
     **
     - amount (number) amount of filter (`0..1`)
     = (string) filter representation
    \*/
    Snap.filter.brightness = function (amount) {
        if (amount == null) {
            amount = 1;
        }
        return Snap.format('<feComponentTransfer><feFuncR type="linear" slope="{amount}"/><feFuncG type="linear" slope="{amount}"/><feFuncB type="linear" slope="{amount}"/></feComponentTransfer>', {
            amount: amount
        });
    };
    Snap.filter.brightness.toString = function () {
        return this();
    };
    /*\
     * Snap.filter.contrast
     [ method ]
     **
     * Returns an SVG markup string for the contrast filter
     **
     - amount (number) amount of filter (`0..1`)
     = (string) filter representation
    \*/
    Snap.filter.contrast = function (amount) {
        if (amount == null) {
            amount = 1;
        }
        return Snap.format('<feComponentTransfer><feFuncR type="linear" slope="{amount}" intercept="{amount2}"/><feFuncG type="linear" slope="{amount}" intercept="{amount2}"/><feFuncB type="linear" slope="{amount}" intercept="{amount2}"/></feComponentTransfer>', {
            amount: amount,
            amount2: .5 - amount / 2
        });
    };
    Snap.filter.contrast.toString = function () {
        return this();
    };
});
return Snap;
}));
},{"eve":16}],18:[function(require,module,exports){
//     Underscore.js 1.6.0
//     http://underscorejs.org
//     (c) 2009-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `exports` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.6.0';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return obj;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, length = obj.length; i < length; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      var keys = _.keys(obj);
      for (var i = 0, length = keys.length; i < length; i++) {
        if (iterator.call(context, obj[keys[i]], keys[i], obj) === breaker) return;
      }
    }
    return obj;
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, predicate, context) {
    var result;
    any(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, predicate, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(predicate, context);
    each(obj, function(value, index, list) {
      if (predicate.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, predicate, context) {
    return _.filter(obj, function(value, index, list) {
      return !predicate.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(predicate, context);
    each(obj, function(value, index, list) {
      if (!(result = result && predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, predicate, context) {
    predicate || (predicate = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(predicate, context);
    each(obj, function(value, index, list) {
      if (result || (result = predicate.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, _.property(key));
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs) {
    return _.filter(obj, _.matches(attrs));
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.find(obj, _.matches(attrs));
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    var result = -Infinity, lastComputed = -Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed > lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    var result = Infinity, lastComputed = Infinity;
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      if (computed < lastComputed) {
        result = value;
        lastComputed = computed;
      }
    });
    return result;
  };

  // Shuffle an array, using the modern version of the
  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // Sample **n** random values from a collection.
  // If **n** is not specified, returns a single random element.
  // The internal `guard` argument allows it to work with `map`.
  _.sample = function(obj, n, guard) {
    if (n == null || guard) {
      if (obj.length !== +obj.length) obj = _.values(obj);
      return obj[_.random(obj.length - 1)];
    }
    return _.shuffle(obj).slice(0, Math.max(0, n));
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return value;
    return _.property(value);
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, iterator, context) {
    iterator = lookupIterator(iterator);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value: value,
        index: index,
        criteria: iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index - right.index;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(behavior) {
    return function(obj, iterator, context) {
      var result = {};
      iterator = lookupIterator(iterator);
      each(obj, function(value, index) {
        var key = iterator.call(context, value, index, obj);
        behavior(result, key, value);
      });
      return result;
    };
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = group(function(result, key, value) {
    _.has(result, key) ? result[key].push(value) : result[key] = [value];
  });

  // Indexes the object's values by a criterion, similar to `groupBy`, but for
  // when you know that your index values will be unique.
  _.indexBy = group(function(result, key, value) {
    result[key] = value;
  });

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = group(function(result, key) {
    _.has(result, key) ? result[key]++ : result[key] = 1;
  });

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely create a real, live array from anything iterable.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[0];
    if (n < 0) return [];
    return slice.call(array, 0, n);
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n == null) || guard) return array[array.length - 1];
    return slice.call(array, Math.max(array.length - n, 0));
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    if (shallow && _.every(input, _.isArray)) {
      return concat.apply(output, input);
    }
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Flatten out an array, either recursively (by default), or just one level.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Split an array into two arrays: one whose elements all satisfy the given
  // predicate, and one whose elements all do not satisfy the predicate.
  _.partition = function(array, predicate) {
    var pass = [], fail = [];
    each(array, function(elem) {
      (predicate(elem) ? pass : fail).push(elem);
    });
    return [pass, fail];
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.contains(other, item);
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var length = _.max(_.pluck(arguments, 'length').concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(arguments, '' + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, length = list.length; i < length; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, length = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, length + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < length; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var length = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(length);

    while(idx < length) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    var args, bound;
    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context. _ acts
  // as a placeholder, allowing any combination of arguments to be pre-filled.
  _.partial = function(func) {
    var boundArgs = slice.call(arguments, 1);
    return function() {
      var position = 0;
      var args = boundArgs.slice();
      for (var i = 0, length = args.length; i < length; i++) {
        if (args[i] === _) args[i] = arguments[position++];
      }
      while (position < arguments.length) args.push(arguments[position++]);
      return func.apply(this, args);
    };
  };

  // Bind a number of an object's methods to that object. Remaining arguments
  // are the method names to be bound. Useful for ensuring that all callbacks
  // defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error('bindAll must be passed function names');
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time. Normally, the throttled function will run
  // as much as it can, without ever going more than once per `wait` duration;
  // but if you'd like to disable the execution on the leading edge, pass
  // `{leading: false}`. To disable execution on the trailing edge, ditto.
  _.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});
    var later = function() {
      previous = options.leading === false ? 0 : _.now();
      timeout = null;
      result = func.apply(context, args);
      context = args = null;
    };
    return function() {
      var now = _.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
        context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, args, context, timestamp, result;

    var later = function() {
      var last = _.now() - timestamp;
      if (last < wait) {
        timeout = setTimeout(later, wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          context = args = null;
        }
      }
    };

    return function() {
      context = this;
      args = arguments;
      timestamp = _.now();
      var callNow = immediate && !timeout;
      if (!timeout) {
        timeout = setTimeout(later, wait);
      }
      if (callNow) {
        result = func.apply(context, args);
        context = args = null;
      }

      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return _.partial(wrapper, func);
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = function(obj) {
    if (!_.isObject(obj)) return [];
    if (nativeKeys) return nativeKeys(obj);
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var values = new Array(length);
    for (var i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var keys = _.keys(obj);
    var length = keys.length;
    var pairs = new Array(length);
    for (var i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    var keys = _.keys(obj);
    for (var i = 0, length = keys.length; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Objects with different constructors are not equivalent, but `Object`s
    // from different frames are.
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                             _.isFunction(bCtor) && (bCtor instanceof bCtor))
                        && ('constructor' in a && 'constructor' in b)) {
      return false;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  _.constant = function(value) {
    return function () {
      return value;
    };
  };

  _.property = function(key) {
    return function(obj) {
      return obj[key];
    };
  };

  // Returns a predicate for checking whether an object has a given set of `key:value` pairs.
  _.matches = function(attrs) {
    return function(obj) {
      if (obj === attrs) return true; //avoid comparing an object to itself.
      for (var key in attrs) {
        if (attrs[key] !== obj[key])
          return false;
      }
      return true;
    }
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // A (possibly faster) way to get the current timestamp as an integer.
  _.now = Date.now || function() { return new Date().getTime(); };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named `property` is a function then invoke it with the
  // `object` as context; otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name) {
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

  // AMD registration happens at the end for compatibility with AMD loaders
  // that may not enforce next-turn semantics on modules. Even though general
  // practice for AMD registration is to be anonymous, underscore registers
  // as a named module because, like jQuery, it is a base library that is
  // popular enough to be bundled in a third party lib, but not be part of
  // an AMD load request. Those cases could generate an error when an
  // anonymous define() is called outside of a loader request.
  if (typeof define === 'function' && define.amd) {
    define('underscore', [], function() {
      return _;
    });
  }
}).call(this);

},{}],19:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],20:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],21:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],22:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],23:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require("/Users/pedroteixeira/projects/taser-squad/node_modules/watchify/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":22,"/Users/pedroteixeira/projects/taser-squad/node_modules/watchify/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":21,"inherits":20}],24:[function(require,module,exports){
module.exports = hasKeys

function hasKeys(source) {
    return source !== null &&
        (typeof source === "object" ||
        typeof source === "function")
}

},{}],25:[function(require,module,exports){
var Keys = require("object-keys")
var hasKeys = require("./has-keys")

module.exports = extend

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        if (!hasKeys(source)) {
            continue
        }

        var keys = Keys(source)

        for (var j = 0; j < keys.length; j++) {
            var name = keys[j]
            target[name] = source[name]
        }
    }

    return target
}

},{"./has-keys":24,"object-keys":27}],26:[function(require,module,exports){
var hasOwn = Object.prototype.hasOwnProperty;
var toString = Object.prototype.toString;

var isFunction = function (fn) {
	var isFunc = (typeof fn === 'function' && !(fn instanceof RegExp)) || toString.call(fn) === '[object Function]';
	if (!isFunc && typeof window !== 'undefined') {
		isFunc = fn === window.setTimeout || fn === window.alert || fn === window.confirm || fn === window.prompt;
	}
	return isFunc;
};

module.exports = function forEach(obj, fn) {
	if (!isFunction(fn)) {
		throw new TypeError('iterator must be a function');
	}
	var i, k,
		isString = typeof obj === 'string',
		l = obj.length,
		context = arguments.length > 2 ? arguments[2] : null;
	if (l === +l) {
		for (i = 0; i < l; i++) {
			if (context === null) {
				fn(isString ? obj.charAt(i) : obj[i], i, obj);
			} else {
				fn.call(context, isString ? obj.charAt(i) : obj[i], i, obj);
			}
		}
	} else {
		for (k in obj) {
			if (hasOwn.call(obj, k)) {
				if (context === null) {
					fn(obj[k], k, obj);
				} else {
					fn.call(context, obj[k], k, obj);
				}
			}
		}
	}
};


},{}],27:[function(require,module,exports){
module.exports = Object.keys || require('./shim');


},{"./shim":29}],28:[function(require,module,exports){
var toString = Object.prototype.toString;

module.exports = function isArguments(value) {
	var str = toString.call(value);
	var isArguments = str === '[object Arguments]';
	if (!isArguments) {
		isArguments = str !== '[object Array]'
			&& value !== null
			&& typeof value === 'object'
			&& typeof value.length === 'number'
			&& value.length >= 0
			&& toString.call(value.callee) === '[object Function]';
	}
	return isArguments;
};


},{}],29:[function(require,module,exports){
(function () {
	"use strict";

	// modified from https://github.com/kriskowal/es5-shim
	var has = Object.prototype.hasOwnProperty,
		toString = Object.prototype.toString,
		forEach = require('./foreach'),
		isArgs = require('./isArguments'),
		hasDontEnumBug = !({'toString': null}).propertyIsEnumerable('toString'),
		hasProtoEnumBug = (function () {}).propertyIsEnumerable('prototype'),
		dontEnums = [
			"toString",
			"toLocaleString",
			"valueOf",
			"hasOwnProperty",
			"isPrototypeOf",
			"propertyIsEnumerable",
			"constructor"
		],
		keysShim;

	keysShim = function keys(object) {
		var isObject = object !== null && typeof object === 'object',
			isFunction = toString.call(object) === '[object Function]',
			isArguments = isArgs(object),
			theKeys = [];

		if (!isObject && !isFunction && !isArguments) {
			throw new TypeError("Object.keys called on a non-object");
		}

		if (isArguments) {
			forEach(object, function (value) {
				theKeys.push(value);
			});
		} else {
			var name,
				skipProto = hasProtoEnumBug && isFunction;

			for (name in object) {
				if (!(skipProto && name === 'prototype') && has.call(object, name)) {
					theKeys.push(name);
				}
			}
		}

		if (hasDontEnumBug) {
			var ctor = object.constructor,
				skipConstructor = ctor && ctor.prototype === object;

			forEach(dontEnums, function (dontEnum) {
				if (!(skipConstructor && dontEnum === 'constructor') && has.call(object, dontEnum)) {
					theKeys.push(dontEnum);
				}
			});
		}
		return theKeys;
	};

	module.exports = keysShim;
}());


},{"./foreach":26,"./isArguments":28}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2NvbnRyb2xsZXJzL2Jhc2UuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9jb250cm9sbGVycy9jaGFyYWN0ZXIuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9pbmRleC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi9ib2FyZC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi9jaGFyYWN0ZXIuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9saWIvY2hhcmFjdGVycy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi9jb250cm9sbGVycy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi9nYW1lLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbGliL2dyaWQuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9saWIva2V5bWFzdGVyLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbGliL3RpbGVzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbGliL3dhbGxfdHlwZS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi93YWxsX3R5cGVzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbGliL3dhbGxzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbGliL3pfaW5kZXhlcy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL25vZGVfbW9kdWxlcy9ldmUvZXZlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3NuYXBzdmcvZGlzdC9zbmFwLnN2Zy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL25vZGVfbW9kdWxlcy91bmRlcnNjb3JlL3VuZGVyc2NvcmUuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luc2VydC1tb2R1bGUtZ2xvYmFscy9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3N1cHBvcnQvaXNCdWZmZXJCcm93c2VyLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9ub2RlX21vZHVsZXMveHRlbmQvaGFzLWtleXMuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9ub2RlX21vZHVsZXMveHRlbmQvaW5kZXguanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9ub2RlX21vZHVsZXMveHRlbmQvbm9kZV9tb2R1bGVzL29iamVjdC1rZXlzL2ZvcmVhY2guanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9ub2RlX21vZHVsZXMveHRlbmQvbm9kZV9tb2R1bGVzL29iamVjdC1rZXlzL2luZGV4LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3h0ZW5kL25vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9pc0FyZ3VtZW50cy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL25vZGVfbW9kdWxlcy94dGVuZC9ub2RlX21vZHVsZXMvb2JqZWN0LWtleXMvc2hpbS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNU9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25YQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNseE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvekNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIga2V5bWFzdGVyID0gcmVxdWlyZSgnLi4vbGliL2tleW1hc3RlcicpO1xuLy8ga2V5bWFzdGVyLm5vQ29uZmxpY3QoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sbGVyQmFzZTtcblxuZnVuY3Rpb24gQ29udHJvbGxlckJhc2UoZ2FtZSkge1xuICB0aGlzLmdhbWUgPSBnYW1lO1xuICB0aGlzLmJvdW5kS2V5cyA9IFtdO1xufVxuXG52YXIgQ0IgPSBDb250cm9sbGVyQmFzZS5wcm90b3R5cGU7XG5cblxuLy8vIGtleVxuXG5DQi5rZXkgPSBmdW5jdGlvbiBrZXkoc3BlYywgZm4pIHtcbiAgdGhpcy5ib3VuZEtleXMucHVzaChzcGVjKSA7XG4gIGtleW1hc3RlcihzcGVjLCBmbik7XG59O1xuXG5DQi51bmJpbmRLZXlzID0gZnVuY3Rpb24gdW5iaW5kS2V5cygpIHtcbiAgdGhpcy5ib3VuZEtleXMuZm9yRWFjaCh0aGlzLnVuYmluZEtleS5iaW5kKHRoaXMpKTtcbiAgdGhpcy5ib3VuZEtleXMgPSBbXTtcbn07XG5cbkNCLnVuYmluZEtleSA9IGZ1bmN0aW9uIHVuYmluZEtleShzcGVjKSB7XG4gIGtleW1hc3Rlci51bmJpbmQoc3BlYyk7XG59O1xuXG5cbi8vLyBhYnN0cmFjdCBtZXRob2RzXG5cbkNCLmFjdGl2YXRlID0gYWJzdHJhY3Q7XG5DQi5kZWFjdGl2YXRlID0gYWJzdHJhY3Q7XG5cblxuZnVuY3Rpb24gYWJzdHJhY3QoKSB7XG4gIHRocm93IG5ldyBFcnJvcignY29udHJvbGxlciBuZWVkcyB0byBpbXBsZW1lbnQgYWN0aXZhdGUnKTtcbn1cblxuIiwidmFyIGluaGVyaXRzICAgICAgID0gcmVxdWlyZSgndXRpbCcpLmluaGVyaXRzO1xudmFyIENvbnRyb2xsZXJCYXNlID0gcmVxdWlyZSgnLi9iYXNlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhcmFjdGVyQ29udHJvbGxlcjtcblxuZnVuY3Rpb24gQ2hhcmFjdGVyQ29udHJvbGxlcihnYW1lLCBjaGFyYWN0ZXIpIHtcbiAgQ29udHJvbGxlckJhc2UuY2FsbCh0aGlzLCBnYW1lKTtcblxuICB0aGlzLmNoYXJhY3RlciA9IGNoYXJhY3Rlcjtcbn1cblxuaW5oZXJpdHMoQ2hhcmFjdGVyQ29udHJvbGxlciwgQ29udHJvbGxlckJhc2UpO1xuXG52YXIgQ0MgPSBDaGFyYWN0ZXJDb250cm9sbGVyLnByb3RvdHlwZTtcblxuXG4vLy8gYWN0aXZhdGVcblxuQ0MuYWN0aXZhdGUgPSBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcbiAgdGhpcy5rZXkoJ2xlZnQnLCB0aGlzLnR1cm5MZWZ0LmJpbmQodGhpcykpO1xuICB0aGlzLmtleSgncmlnaHQnLCB0aGlzLnR1cm5SaWdodC5iaW5kKHRoaXMpKTtcbiAgdGhpcy5rZXkoJ3VwJywgdGhpcy53YWxrLmJpbmQodGhpcykpO1xuICB0aGlzLmtleSgnZG93bicsIHRoaXMud2Fsa0JhY2suYmluZCh0aGlzKSk7XG5cbiAgdGhpcy5nYW1lLmJvYXJkLmdyaWQubW92ZVRvKHRoaXMuY2hhcmFjdGVyLngsIHRoaXMuY2hhcmFjdGVyLnkpO1xufTtcblxuXG5DQy5kZWFjdGl2YXRlID0gZnVuY3Rpb24gZGVhY3RpdmF0ZSgpIHtcbiAgdGhpcy51bmJpbmRLZXlzKCk7XG59O1xuXG5cbi8vLyB0dXJuTGVmdFxuXG5DQy50dXJuTGVmdCA9IGZ1bmN0aW9uIHR1cm5MZWZ0KCkge1xuICB0aGlzLmNoYXJhY3Rlci50dXJuTGVmdCgpO1xufTtcblxuXG4vLy8gdHVyblJpZ2h0XG5cbkNDLnR1cm5SaWdodCA9IGZ1bmN0aW9uIHR1cm5SaWdodCgpIHtcbiAgdGhpcy5jaGFyYWN0ZXIudHVyblJpZ2h0KCk7XG59O1xuXG5cbi8vLyB3YWxrXG5cbkNDLndhbGsgPSBmdW5jdGlvbiB3YWxrKCkge1xuICB0aGlzLmNoYXJhY3Rlci53YWxrKHRoaXMuY2VudGVyQm9hcmQuYmluZCh0aGlzKSk7XG59O1xuXG5cbi8vLyB3YWxrQmFja1xuXG5DQy53YWxrQmFjayA9IGZ1bmN0aW9uIHdhbGtCYWNrKCkge1xuICB0aGlzLmNoYXJhY3Rlci53YWxrQmFjayh0aGlzLmNlbnRlckJvYXJkLmJpbmQodGhpcykpO1xufTtcblxuXG4vLy8gY2VudGVyQm9hcmRcblxuQ0MuY2VudGVyQm9hcmQgPSBmdW5jdGlvbiBjZW50ZXJCb2FyZCgpIHtcbiAgdGhpcy5nYW1lLmJvYXJkLmdyaWQubW92ZVRvKHRoaXMuY2hhcmFjdGVyLngsIHRoaXMuY2hhcmFjdGVyLnkpO1xufSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciBHYW1lID0gcmVxdWlyZSgnLi9saWIvZ2FtZScpO1xuXG52YXIgd2luZG93ID0gZ2xvYmFsO1xuXG52YXIgY29udGFpbmVyID0gJCgnI2dhbWUnKTtcblxudmFyIG9wdGlvbnMgPSB7XG4gIHdpZHRoOiBjb250YWluZXIud2lkdGgoKSxcbiAgaGVpZ2h0OiBjb250YWluZXIuaGVpZ2h0KCksXG4gIHpvb206IDAuNSxcbiAgc2l6ZTogNDBcbn07XG5cbnZhciBnYW1lID0gR2FtZShjb250YWluZXJbMF0sIG9wdGlvbnMpO1xuXG4vLy8gc29sZGllcnNcblxudmFyIHNvbGRpZXJzID0gW107XG5cbihmdW5jdGlvbigpIHtcbiAgdmFyIHNvbGRpZXJDb3VudCA9IDU7XG4gIGZvcih2YXIgaSA9IDA7IGkgPCBzb2xkaWVyQ291bnQ7IGkgKyspIHtcbiAgICB2YXIgc29sZGllciA9IGdhbWUuYm9hcmQuY2hhcmFjdGVycy5jcmVhdGUoe25hbWU6ICdzb2xkaWVyICcgKyBpfSk7XG4gICAgc29sZGllcnMucHVzaChzb2xkaWVyKTtcbiAgICB2YXIgcGxhY2UgPSB7IHg6aSAqIDIsIHk6IC1pICogMn07XG4gICAgdmFyIHBsYWNlZCA9IGdhbWUuYm9hcmQuY2hhcmFjdGVycy5wbGFjZShzb2xkaWVyLCBwbGFjZSk7XG4gICAgaWYgKCEgcGxhY2VkKSBjb25zb2xlLmxvZygnRmFpbGVkIHRvIHBsYWNlIHNvbGRpZXIgaW4gJywgcGxhY2UpO1xuICB9XG5cbn0oKSk7XG5cblxuXG4vLy8gd2FsbHNcblxuKGZ1bmN0aW9uKCkge1xuICB2YXIgd2FsbFR5cGUgPSBnYW1lLmJvYXJkLndhbGxUeXBlcy5jcmVhdGUoKTtcblxuICB2YXIgc3RhcnQgPSB7eDogLTUuNSwgeTogLTUuNX07XG4gIHZhciBlbmQgPSB7eDogLTUuNSwgeTogNS41fTtcbiAgZ2FtZS5ib2FyZC53YWxscy5wbGFjZSh3YWxsVHlwZSwgc3RhcnQsIGVuZCk7XG5cblxuICBzdGFydCA9IHt4OiAtNS41LCB5OiAtNS41fTtcbiAgZW5kID0ge3g6IDUuNSwgeTogLTUuNX07XG4gIGdhbWUuYm9hcmQud2FsbHMucGxhY2Uod2FsbFR5cGUsIHN0YXJ0LCBlbmQpO1xuXG4gIHN0YXJ0ID0ge3g6IDUuNSwgeTogNS41fTtcbiAgZW5kID0ge3g6IDUuNSwgeTogLTUuNX07XG4gIGNvbnNvbGUubG9nKCdhZGRpbmcgd2FsbCcpO1xuICBnYW1lLmJvYXJkLndhbGxzLnBsYWNlKHdhbGxUeXBlLCBzdGFydCwgZW5kKTtcblxuICBjb25zb2xlLmxvZygnZ2FtZS5ib2FyZC53YWxscy53YWxsczonLCBnYW1lLmJvYXJkLndhbGxzLndhbGxzKTtcblxufSgpKTtcblxuXG5cbi8vLyBzdGFydCBnYW1lXG5cblxuZ2FtZS5zdGFydCgpO1xuXG52YXIgc29sZGllck5yID0gLTE7XG52YXIgc29sZGllcjtcbnZhciBjb250cm9sbGVyO1xuXG5zZXRJbnRlcnZhbChmdW5jdGlvbigpIHtcbiAgaWYgKGNvbnRyb2xsZXIpIGNvbnRyb2xsZXIuZGVhY3RpdmF0ZSgpO1xuICBzb2xkaWVyTnIgPSAoc29sZGllck5yICsgMSkgJSBzb2xkaWVycy5sZW5ndGg7XG4gIHNvbGRpZXIgPSBzb2xkaWVyc1tzb2xkaWVyTnJdO1xuICBjb250cm9sbGVyID0gZ2FtZS5jb250cm9sbGVycy5jb250cm9sKHNvbGRpZXIpO1xufSwgMzAwMCk7XG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsInZhciBleHRlbmQgID0gcmVxdWlyZSgneHRlbmQnKTtcbnZhciBfICAgICAgID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG52YXIgR3JpZCAgICAgICAgPSByZXF1aXJlKCcuL2dyaWQnKTtcbnZhciBUaWxlcyAgICAgICA9IHJlcXVpcmUoJy4vdGlsZXMnKTtcbnZhciBDaGFyYWN0ZXJzICA9IHJlcXVpcmUoJy4vY2hhcmFjdGVycycpO1xudmFyIFdhbGxUeXBlcyAgID0gcmVxdWlyZSgnLi93YWxsX3R5cGVzJyk7XG52YXIgV2FsbHMgICAgICAgPSByZXF1aXJlKCcuL3dhbGxzJyk7XG52YXIgWkluZGV4ZXMgICAgPSByZXF1aXJlKCcuL3pfaW5kZXhlcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJvYXJkO1xuXG52YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG4gIHdpZHRoOiB3aW5kb3cub3V0ZXJXaWR0aCxcbiAgaGVpZ2h0OiB3aW5kb3cub3V0ZXJIZWlnaHQsXG4gIHNpemU6IDIwLFxuICAvLyB6b29tOiAwLjVcbiAgem9vbTogMVxufTtcblxuZnVuY3Rpb24gQm9hcmQoZWxlbWVudCwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHt9O1xuXG4gIG9wdGlvbnMgPSBleHRlbmQoe30sIGRlZmF1bHRPcHRpb25zLCBvcHRpb25zIHx8IHt9KTtcblxuICAvLy8gTWV0aG9kc1xuXG4gIHNlbGYuem9vbSA9IHpvb207XG5cbiAgc2VsZi5wbGFjZSAgPSBwbGFjZTtcbiAgc2VsZi5yZW1vdmUgPSByZW1vdmU7XG4gIHNlbGYubW92ZVRvID0gbW92ZVRvO1xuICBzZWxmLnVwZGF0ZSA9IHVwZGF0ZTtcblxuICBzZWxmLmNyZWF0ZVdhbGwgPSBjcmVhdGVXYWxsO1xuXG4gIHNlbGYud2Fsa2FibGUgPSB3YWxrYWJsZTtcbiAgc2VsZi50cmF2ZXJzYWJsZSA9IHRyYXZlcnNhYmxlO1xuICBzZWxmLm9iamVjdHNBdCA9IG9iamVjdHNBdDtcblxuXG4gIC8vLyBJbml0XG5cbiAgc2VsZi5ncmlkID0gR3JpZChlbGVtZW50LCBvcHRpb25zLndpZHRoLCBvcHRpb25zLmhlaWdodCwgb3B0aW9ucy5zaXplKTtcblxuICBzZWxmLnpvb20ob3B0aW9ucy56b29tKTtcbiAgc2VsZi50aWxlcyA9IFRpbGVzKHNlbGYuZ3JpZCk7XG4gIHNlbGYuY2hhcmFjdGVycyA9IENoYXJhY3RlcnMoc2VsZik7XG4gIHNlbGYud2FsbFR5cGVzID0gV2FsbFR5cGVzKHNlbGYpO1xuXG4gIHNlbGYuekluZGV4ZXMgPSBaSW5kZXhlcyhzZWxmLmdyaWQsIG9wdGlvbnMuc2l6ZSk7XG5cbiAgc2VsZi5zaXplID0gb3B0aW9ucy5zaXplO1xuICBzZWxmLm9iamVjdHMgPSBbXTtcbiAgc2VsZi53YWxscyA9IFdhbGxzKHNlbGYpO1xuXG4gIGZvcih2YXIgaSA9IDAgOyBpIDwgc2VsZi5zaXplOyBpICsrKSB7XG4gICAgc2VsZi5vYmplY3RzLnB1c2goW10pO1xuICAgIGZvcih2YXIgaiA9IDAgOyBqIDwgc2VsZi5zaXplOyBqICsrKSB7XG4gICAgICBzZWxmLm9iamVjdHNbaV0ucHVzaChbXSk7XG4gICAgICBzZWxmLm9iamVjdHNbaV1bal0gPSBbXTtcbiAgICB9XG4gIH1cblxuICB2YXIgaGFsZlNpemUgPSBzZWxmLnNpemUgLyAyO1xuICBmb3IgKHZhciB4ID0gLWhhbGZTaXplOyB4IDwgaGFsZlNpemU7IHgrKykge1xuICAgIGZvciAodmFyIHkgPSAtaGFsZlNpemU7IHkgPCBoYWxmU2l6ZTsgeSsrKSB7XG4gICAgICBzZWxmLnRpbGVzLmNyZWF0ZSh4LCB5KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gc2VsZjtcbn1cblxuLy8vIHBsYWNlXG5cbmZ1bmN0aW9uIHBsYWNlKG9iamVjdCwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgb3B0aW9ucyA9IGV4dGVuZCh7XG4gICAgeDogb2JqZWN0LngsXG4gICAgeTogb2JqZWN0LnlcbiAgfSwgb3B0aW9ucyB8fCB7fSk7XG5cbiAgdmFyIHBsYWNlZCA9IGZhbHNlO1xuICBpZiAob2JqZWN0LmNvbGxpZGVzKVxuICAgIHBsYWNlZCA9IHRoaXMud2Fsa2FibGUob3B0aW9ucy54LCBvcHRpb25zLnkpO1xuXG4gIGlmIChwbGFjZWQpIHtcbiAgICB2YXIgc2V0ID0gdGhpcy56SW5kZXhlcy5zZXRGb3Iob3B0aW9ucy54LCBvcHRpb25zLnkpO1xuICAgIHZhciBpdGVtID0gdGhpcy5ncmlkLmNyZWF0ZUl0ZW0ob2JqZWN0LmltYWdlKCksIG9wdGlvbnMueCwgb3B0aW9ucy55LCBzZXQsIGNyZWF0ZWRJdGVtKTtcbiAgICBvYmplY3QuaXRlbSA9IGl0ZW07XG4gICAgdmFyIGhhbGZTaXplID0gdGhpcy5zaXplIC8gMjtcbiAgICB2YXIgcm93ID0gdGhpcy5vYmplY3RzW29wdGlvbnMueCArIGhhbGZTaXplXTtcbiAgICB2YXIgY2VsbCA9IHJvdyAmJiByb3dbb3B0aW9ucy55ICsgaGFsZlNpemVdO1xuICAgIGlmIChjZWxsKSB7XG4gICAgICBjZWxsLnB1c2gob2JqZWN0KTtcbiAgICAgIG9iamVjdC54ID0gb3B0aW9ucy54O1xuICAgICAgb2JqZWN0LnkgPSBvcHRpb25zLnk7XG4gICAgfVxuICB9XG4gIHJldHVybiBwbGFjZWQ7XG5cbiAgZnVuY3Rpb24gY3JlYXRlZEl0ZW0oZXJyLCBpdGVtKSB7XG4gICAgaWYgKGVycikgdGhyb3cgZXJyO1xuICAgIG9iamVjdC5pdGVtID0gaXRlbTtcbiAgfVxufVxuXG5cbi8vLyByZW1vdmVcblxuZnVuY3Rpb24gcmVtb3ZlKG9iamVjdCkge1xuICB2YXIgaGFsZlNpemUgPSB0aGlzLnNpemUgLyAyO1xuICB2YXIgcm93ID0gdGhpcy5vYmplY3RzW29iamVjdC54ICsgaGFsZlNpemVdO1xuICB2YXIgb2JqZWN0cyA9IHJvdyAmJiByb3dbb2JqZWN0LnkgKyBoYWxmU2l6ZV0gfHwgW107XG4gIGlmIChvYmplY3RzLmxlbmd0aCkge1xuICAgIHZhciBpZHggPSBvYmplY3RzLmluZGV4T2Yob2JqZWN0KTtcbiAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgIG9iamVjdHMuc3BsaWNlKGlkeCwgMSk7XG4gICAgICB0aGlzLmdyaWQucmVtb3ZlSXRlbShvYmplY3QueCwgb2JqZWN0LnkpO1xuICAgICAgdGhpcy56SW5kZXhlcy5yZW1vdmUob2JqZWN0Lml0ZW0pO1xuICAgIH1cbiAgfVxufVxuXG5cbi8vLyB1cGRhdGVcblxuZnVuY3Rpb24gdXBkYXRlKG9iamVjdCkge1xuICB2YXIgaXRlbSA9IG9iamVjdC5pdGVtO1xuICBpZiAoISBpdGVtKSB0aHJvdyBuZXcgRXJyb3IoJ05vIG9iamVjdC5pdGVtJyk7XG4gIHZhciBvbGRJbWFnZSA9IGl0ZW0uZWxlbWVudC5hdHRyKCdocmVmJyk7XG4gIHZhciBuZXdJbWFnZSA9IG9iamVjdC5pbWFnZSgpO1xuICBpZiAob2xkSW1hZ2UgIT0gbmV3SW1hZ2UpXG4gICAgaXRlbS5lbGVtZW50LmF0dHIoJ2hyZWYnLCBuZXdJbWFnZSk7XG59XG5cblxuLy8vIG1vdmVUb1xuXG5mdW5jdGlvbiBtb3ZlVG8ob2JqZWN0LCB4LCB5LCBjYikge1xuICBpZiAoTWF0aC5yb3VuZCh4KSAhPSB4KSB0aHJvdyBuZXcgRXJyb3IoJ211c3QgbW92ZSB0byBpbnRlZ2VyIHgnKTtcbiAgaWYgKE1hdGgucm91bmQoeSkgIT0geSkgdGhyb3cgbmV3IEVycm9yKCdtdXN0IG1vdmUgdG8gaW50ZWdlciB5Jyk7XG5cbiAgdmFyIHRvID0geyB4OiB4LCB5OiB5fTtcblxuICB2YXIgZGlzdGFuY2UgPSB7XG4gICAgeDogTWF0aC5hYnMob2JqZWN0LnggLSB4KSxcbiAgICB5OiBNYXRoLmFicyhvYmplY3QueSAtIHkpXG4gIH07XG5cbiAgaWYgKGRpc3RhbmNlLnggPiAxKSB0aHJvdyBuZXcgRXJyb3IoJ2Rpc3RhbmNlIGluIHggbXVzdCBiZSA8PSAxJyk7XG4gIGlmIChkaXN0YW5jZS55ID4gMSkgdGhyb3cgbmV3IEVycm9yKCdkaXN0YW5jZSBpbiB5IG11c3QgYmUgPD0gMScpO1xuXG5cbiAgdmFyIG1vdmUgPSB0aGlzLnRyYXZlcnNhYmxlKG9iamVjdCwgdG8pICYmIHRoaXMud2Fsa2FibGUoeCwgeSk7XG4gIGlmIChtb3ZlKSB7XG4gICAgdmFyIGl0ZW0gPSBvYmplY3QuaXRlbTtcbiAgICBpZiAoISBpdGVtKSB0aHJvdyBuZXcgRXJyb3IoJ25vIG9iamVjdC5pdGVtJyk7XG5cbiAgICB2YXIgb2JqZWN0cyA9IHRoaXMub2JqZWN0c0F0KG9iamVjdC54LCBvYmplY3QueSk7XG4gICAgdmFyIGlkeCA9IG9iamVjdHMuaW5kZXhPZihvYmplY3QpO1xuICAgIGlmIChpZHggPj0gMCkgb2JqZWN0cy5zcGxpY2UoaWR4LCAxKTtcblxuICAgIHZhciBvbGRQb3MgPSB7XG4gICAgICB4OiBpdGVtLngsXG4gICAgICB5OiBpdGVtLnlcbiAgICB9O1xuXG4gICAgdGhpcy5ncmlkLm1vdmVJdGVtKGl0ZW0sIHgsIHksIGNiKTtcbiAgICBvYmplY3QueCA9IHg7XG4gICAgb2JqZWN0LnkgPSB5O1xuXG4gICAgdGhpcy5vYmplY3RzQXQoeCwgeSkucHVzaChvYmplY3QpO1xuXG4gICAgdGhpcy56SW5kZXhlcy5tb3ZlKG9iamVjdC5pdGVtLCBvbGRQb3MsIGl0ZW0pO1xuICB9XG4gIHJldHVybiBtb3ZlO1xufVxuXG5cbi8vLyBvYmplY3RzQXRcblxuZnVuY3Rpb24gb2JqZWN0c0F0KHgsIHkpIHtcbiAgeCArPSB0aGlzLnNpemUgLyAyO1xuICB5ICs9IHRoaXMuc2l6ZSAvIDI7XG4gIHZhciByb3cgPSB0aGlzLm9iamVjdHNbeF07XG4gIHJldHVybiByb3cgJiYgcm93W3ldIHx8IFtdO1xufVxuXG5cbi8vLyB3YWxrYWJsZVxuXG5mdW5jdGlvbiB3YWxrYWJsZSh4LCB5KSB7XG4gIHZhciBtYXggPSB0aGlzLnNpemUgLyAyO1xuICB2YXIgd2Fsa2FibGUgPSAoTWF0aC5hYnMoeCkgPD0gbWF4KSAmJiAoTWF0aC5hYnMoeSkgPD0gbWF4KTtcbiAgaWYgKHdhbGthYmxlKSB7XG4gICAgdmFyIG9iamVjdHMgPSB0aGlzLm9iamVjdHNBdCh4LCB5KTtcbiAgICBpZiAob2JqZWN0cy5sZW5ndGgpIHdhbGthYmxlID0gXy5ldmVyeShvYmplY3RzLCBpc1dhbGthYmxlKTtcbiAgfVxuICByZXR1cm4gd2Fsa2FibGU7XG59XG5cblxuLy8vIGNyZWF0ZVdhbGxcblxuZnVuY3Rpb24gY3JlYXRlV2FsbChpbWFnZSwgZnJvbSwgdG8pIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciB4ID0gKGZyb20ueCArIHRvLngpIC8gMjtcbiAgdmFyIHkgPSAoZnJvbS55ICsgdG8ueSkgLyAyO1xuICB2YXIgc2V0ID0gdGhpcy56SW5kZXhlcy5zZXRGb3IoeCwgeSk7XG5cbiAgdGhpcy5ncmlkLmNyZWF0ZVdhbGwoaW1hZ2UsIGZyb20sIHRvLCBzZXQpO1xufVxuXG5cbi8vLyB0cmF2ZXJzYWJsZVxuXG5mdW5jdGlvbiB0cmF2ZXJzYWJsZShmcm9tLCB0bykge1xuICByZXR1cm4gdGhpcy53YWxscy50cmF2ZXJzYWJsZShmcm9tLCB0byk7XG59XG5cblxuLy8vIHpvb21cblxuZnVuY3Rpb24gem9vbShsZXZlbCkge1xuICB0aGlzLmdyaWQuem9vbShsZXZlbCk7XG59XG5cblxuLy8vIE1pc2NcblxuZnVuY3Rpb24gaXNXYWxrYWJsZShvKSB7XG4gIHJldHVybiBvLndhbGthYmxlO1xufSIsInZhciBleHRlbmQgPSByZXF1aXJlKCd4dGVuZCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENoYXJhY3RlcjtcblxudmFyIG5leHRPblJpZ2h0VHVybiA9IHtcbiAgc291dGg6ICAgICAgICdzb3V0aF93ZXN0JyxcbiAgc291dGhfd2VzdDogICd3ZXN0JyxcbiAgd2VzdDogICAgICAgICdub3J0aF93ZXN0JyxcbiAgbm9ydGhfd2VzdDogICdub3J0aCcsXG4gIG5vcnRoOiAgICAgICAnbm9ydGhfZWFzdCcsXG4gIG5vcnRoX2Vhc3Q6ICAnZWFzdCcsXG4gIGVhc3Q6ICAgICAgICAnc291dGhfZWFzdCcsXG4gIHNvdXRoX2Vhc3Q6ICAnc291dGgnXG59O1xuXG52YXIgbmV4dE9uTGVmdFR1cm4gPSB7XG4gIHNvdXRoOiAgICAgICdzb3V0aF9lYXN0JyxcbiAgc291dGhfZWFzdDogJ2Vhc3QnLFxuICBlYXN0OiAgICAgICAnbm9ydGhfZWFzdCcsXG4gIG5vcnRoX2Vhc3Q6ICdub3J0aCcsXG4gIG5vcnRoOiAgICAgICdub3J0aF93ZXN0JyxcbiAgbm9ydGhfd2VzdDogJ3dlc3QnLFxuICB3ZXN0OiAgICAgICAnc291dGhfd2VzdCcsXG4gIHNvdXRoX3dlc3Q6ICdzb3V0aCdcbn07XG5cbnZhciB3YWxrRGlyZWN0aW9ucyA9IHtcbiAgc291dGg6ICAgICAge3g6IC0xLCB5OiAxfSxcbiAgc291dGhfd2VzdDoge3g6IC0xLCB5OiAwfSxcbiAgd2VzdDogICAgICAge3g6IC0xLCB5OiAtMX0sXG4gIG5vcnRoX3dlc3Q6IHt4OiAwLCAgeTogLTF9LFxuICBub3J0aDogICAgICB7eDogMSwgIHk6IC0xfSxcbiAgbm9ydGhfZWFzdDoge3g6IDEsICB5OiAwfSxcbiAgZWFzdDogICAgICAge3g6IDEsICB5OiAxfSxcbiAgc291dGhfZWFzdDoge3g6IDAsICB5OiAxfVxufVxuXG52YXIgZGVmYXVsdENoYXJhY3Rlck9wdGlvbnMgPSB7XG4gIG5hbWU6ICd1bmtub3duJyxcbiAgeDogMCxcbiAgeTogMCxcbiAgZmFjaW5nOiAnc291dGgnLFxuICBzcHJpdGVzOiB7XG4gICAgc291dGg6ICcvc3ByaXRlcy9zb2xkaWVyL3NvdXRoLnBuZycsXG4gICAgc291dGhfd2VzdDogJy9zcHJpdGVzL3NvbGRpZXIvc291dGhfd2VzdC5wbmcnLFxuICAgIHdlc3Q6ICAgICAgICcvc3ByaXRlcy9zb2xkaWVyL3dlc3QucG5nJyxcbiAgICBub3J0aF93ZXN0OiAnL3Nwcml0ZXMvc29sZGllci9ub3J0aF93ZXN0LnBuZycsXG4gICAgbm9ydGg6ICAgICAgJy9zcHJpdGVzL3NvbGRpZXIvbm9ydGgucG5nJyxcbiAgICBub3J0aF9lYXN0OiAnL3Nwcml0ZXMvc29sZGllci9ub3J0aF9lYXN0LnBuZycsXG4gICAgZWFzdDogICAgICAgJy9zcHJpdGVzL3NvbGRpZXIvZWFzdC5wbmcnLFxuICAgIHNvdXRoX2Vhc3Q6ICcvc3ByaXRlcy9zb2xkaWVyL3NvdXRoX2Vhc3QucG5nJ1xuICB9LFxuICBjb2xsaWRlczogdHJ1ZSxcbiAgd2Fsa2FibGU6IGZhbHNlLFxuICBjb250cm9sbGVyRnVuY3Rpb246IHJlcXVpcmUoJy4uL2NvbnRyb2xsZXJzL2NoYXJhY3RlcicpXG59O1xuXG5mdW5jdGlvbiBDaGFyYWN0ZXIoYm9hcmQsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB7fTtcblxuICAvLy8gTWV0aG9kc1xuXG4gIHNlbGYudmlzaWJsZSAgID0gdmlzaWJsZTtcbiAgc2VsZi5pbnZpc2libGUgPSBpbnZpc2libGU7XG4gIHNlbGYuaW1hZ2UgICAgID0gaW1hZ2U7XG5cbiAgLy8vIG1vdmVtZW50XG5cbiAgc2VsZi5tb3ZlVG8gICAgPSBtb3ZlVG87XG4gIHNlbGYubW92ZSAgICAgID0gbW92ZTtcbiAgc2VsZi50dXJuTGVmdCAgPSB0dXJuTGVmdFxuICBzZWxmLnR1cm5SaWdodCA9IHR1cm5SaWdodFxuICBzZWxmLndhbGsgICAgICA9IHdhbGs7XG4gIHNlbGYud2Fsa0JhY2sgID0gd2Fsa0JhY2s7XG5cblxuICAvLy8gSW5pdFxuXG4gIHNlbGYuYm9hcmQgPSBib2FyZDtcblxuICBvcHRpb25zID0gZXh0ZW5kKHt9LCBkZWZhdWx0Q2hhcmFjdGVyT3B0aW9ucywgb3B0aW9ucyB8fCB7fSk7XG4gIHNlbGYubmFtZSA9IG9wdGlvbnMubmFtZTtcbiAgc2VsZi54ID0gb3B0aW9ucy54O1xuICBzZWxmLnkgPSBvcHRpb25zLnk7XG4gIHNlbGYuZmFjaW5nID0gb3B0aW9ucy5mYWNpbmc7XG4gIHNlbGYuc3ByaXRlcyA9IG9wdGlvbnMuc3ByaXRlcztcbiAgc2VsZi5jb2xsaWRlcyA9IG9wdGlvbnMuY29sbGlkZXM7XG4gIHNlbGYud2Fsa2FibGUgPSBvcHRpb25zLndhbGthYmxlO1xuICBzZWxmLmNvbnRyb2xsZXJGdW5jdGlvbiA9IG9wdGlvbnMuY29udHJvbGxlckZ1bmN0aW9uO1xuXG5cbiAgc2VsZi5zdGF0ZSA9IHtcbiAgICB2aXNpYmxlOiBvcHRpb25zLnZpc2libGUgfHwgZmFsc2VcbiAgfTtcblxuICBpZiAoc2VsZi5zdGF0ZS52aXNpYmxlKSBzZWxmLnZpc2libGUodHJ1ZSk7XG5cbiAgcmV0dXJuIHNlbGY7XG59XG5cbmZ1bmN0aW9uIGltYWdlKCkge1xuICByZXR1cm4gdGhpcy5zcHJpdGVzW3RoaXMuZmFjaW5nXTtcbn1cblxuZnVuY3Rpb24gdmlzaWJsZShmb3JjZSkge1xuICBpZiAoZm9yY2UgfHwgISB0aGlzLnN0YXRlLnZpc2libGUpIHtcbiAgICB0aGlzLnN0YXRlLnZpc2libGUgPSB0cnVlO1xuICAgIHRoaXMuYm9hcmQucGxhY2UodGhpcyk7XG4gfVxufVxuXG5mdW5jdGlvbiBpbnZpc2libGUoZm9yY2UpIHtcbiAgaWYgKGZvcmNlIHx8IHRoaXMuc3RhdGUudmlzaWJsZSkge1xuICAgIHRoaXMuc3RhdGUudmlzaWJsZSA9IGZhbHNlO1xuICAgIHRoaXMuYm9hcmQucmVtb3ZlKHRoaXMpO1xuICB9XG59XG5cblxuLy8vIE1vdmVtZW50XG5cbmZ1bmN0aW9uIG1vdmVUbyh4LCB5LCBjYikge1xuICByZXR1cm4gdGhpcy5ib2FyZC5tb3ZlVG8odGhpcywgeCwgeSwgY2IpO1xufVxuXG5mdW5jdGlvbiBtb3ZlKHgsIHksIGNiKSB7XG4gIHJldHVybiB0aGlzLm1vdmVUbyh0aGlzLnggKyB4LCB0aGlzLnkgKyB5LCBjYik7XG59XG5cbmZ1bmN0aW9uIHR1cm5MZWZ0KCkge1xuICB0aGlzLmZhY2luZyA9IG5leHRPbkxlZnRUdXJuW3RoaXMuZmFjaW5nXTtcbiAgdGhpcy5ib2FyZC51cGRhdGUodGhpcyk7XG59XG5cbmZ1bmN0aW9uIHR1cm5SaWdodCgpIHtcbiAgdGhpcy5mYWNpbmcgPSBuZXh0T25SaWdodFR1cm5bdGhpcy5mYWNpbmddO1xuICB0aGlzLmJvYXJkLnVwZGF0ZSh0aGlzKTtcbn1cblxuZnVuY3Rpb24gd2FsayhjYikge1xuICB2YXIgZGlyZWN0aW9uID0gd2Fsa0RpcmVjdGlvbnNbdGhpcy5mYWNpbmddO1xuICByZXR1cm4gdGhpcy5tb3ZlKGRpcmVjdGlvbi54LCBkaXJlY3Rpb24ueSwgY2IpO1xufVxuXG5mdW5jdGlvbiB3YWxrQmFjayhjYikge1xuICB2YXIgZGlyZWN0aW9uID0gd2Fsa0RpcmVjdGlvbnNbdGhpcy5mYWNpbmddO1xuICByZXR1cm4gdGhpcy5tb3ZlKC0gZGlyZWN0aW9uLngsIC0gZGlyZWN0aW9uLnksIGNiKTtcbn0iLCJ2YXIgZXh0ZW5kID0gcmVxdWlyZSgneHRlbmQnKTtcblxudmFyIENoYXJhY3RlciA9IHJlcXVpcmUoJy4vY2hhcmFjdGVyJyk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDaGFyYWN0ZXJzO1xuXG52YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG59O1xuXG5mdW5jdGlvbiBDaGFyYWN0ZXJzKGJvYXJkLCBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0ge307XG5cbiAgc2VsZi5jaGFyYWN0ZXJzID0gW107XG4gIHNlbGYuYm9hcmQgPSBib2FyZDtcblxuICBvcHRpb25zID0gZXh0ZW5kKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0aW9ucyB8fCB7fSk7XG5cbiAgc2VsZi5jcmVhdGUgPSBjcmVhdGU7XG4gIHNlbGYucGxhY2UgID0gcGxhY2U7XG5cbiAgcmV0dXJuIHNlbGY7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZShvcHRpb25zKSB7XG4gIHJldHVybiBDaGFyYWN0ZXIodGhpcy5ib2FyZCwgb3B0aW9ucyk7XG59XG5cbmZ1bmN0aW9uIHBsYWNlKGNoYXJhY3Rlciwgb3B0aW9ucykge1xuICBpZiAoISBvcHRpb25zKSBvcHRpb25zID0ge307XG4gIGlmIChvcHRpb25zLngpIGNoYXJhY3Rlci54ID0gb3B0aW9ucy54O1xuICBpZiAob3B0aW9ucy55KSBjaGFyYWN0ZXIueSA9IG9wdGlvbnMueTtcbiAgdmFyIHBsYWNlZCA9IHRoaXMuYm9hcmQucGxhY2UoY2hhcmFjdGVyKTtcbiAgaWYgKHBsYWNlZCkge1xuICAgIHRoaXMuY2hhcmFjdGVycy5wdXNoKGNoYXJhY3Rlcik7XG4gIH1cbiAgcmV0dXJuIHBsYWNlZDtcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xsZXJzO1xuXG5mdW5jdGlvbiBDb250cm9sbGVycyhnYW1lKSB7XG4gIHZhciBzZWxmID0ge307XG5cbiAgc2VsZi5nYW1lID0gZ2FtZTtcbiAgc2VsZi5jb250cm9sID0gY29udHJvbDtcblxuICByZXR1cm4gc2VsZjtcbn1cblxuZnVuY3Rpb24gY29udHJvbChvYmplY3QpIHtcbiAgaWYgKCEgb2JqZWN0KSB0aHJvdyBuZXcgRXJyb3IoJ25vIG9iamVjdCB0byBjb250cm9sJyk7XG4gIHZhciBjb250cm9sbGVyRm4gPSBvYmplY3QuY29udHJvbGxlckZ1bmN0aW9uO1xuICBpZiAoISBjb250cm9sbGVyRm4pIHRocm93IG5ldyBFcnJvcignb2JqZWN0IGRvZXMgbm90IGRlZmluZSBhIGNvbnRyb2xsZXIgZnVuY3Rpb24nKTtcbiAgdmFyIGNvbnRyb2xsZXIgPSBuZXcgY29udHJvbGxlckZuKHRoaXMuZ2FtZSwgb2JqZWN0KTtcbiAgY29udHJvbGxlci5hY3RpdmF0ZSgpO1xuXG4gIHJldHVybiBjb250cm9sbGVyO1xufSIsInZhciBCb2FyZCA9IHJlcXVpcmUoJy4vYm9hcmQnKTtcbnZhciBDb250cm9sbGVycyA9IHJlcXVpcmUoJy4vY29udHJvbGxlcnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBHYW1lO1xuXG5mdW5jdGlvbiBHYW1lKGVsZW1lbnQsIG9wdGlvbnMpIHtcblxuICB2YXIgc2VsZiA9IHt9O1xuXG4gIHNlbGYuYm9hcmQgPSBCb2FyZChlbGVtZW50LCBvcHRpb25zKTtcbiAgc2VsZi5jb250cm9sbGVycyA9IENvbnRyb2xsZXJzKHNlbGYpO1xuXG5cbiAgLy8vIE1ldGhvZHNcblxuICBzZWxmLnN0YXJ0ID0gc3RhcnQ7XG5cbiAgcmV0dXJuIHNlbGY7XG59XG5cbi8vLyBzdGFydFxuXG5mdW5jdGlvbiBzdGFydCgpIHtcblxufSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciBTbmFwID0gcmVxdWlyZSgnc25hcHN2ZycpO1xudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xuXG52YXIgbWF0cml4QW5pbWF0ZWRFbGVtcyA9IFsnYScsICdkJywgJ2UnLCAnZiddO1xudmFyIG1vdmVBbmltYXRpb25EdXJhdGlvbiA9IDEwMDtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoZWwsIHdpZHRoLCBoZWlnaHQsIHNpemUpIHtcbiAgcmV0dXJuIG5ldyBHcmlkKGVsLCB3aWR0aCwgaGVpZ2h0LCBzaXplKTtcbn07XG5cbmZ1bmN0aW9uIEdyaWQgKGVsLCB3aWR0aCwgaGVpZ2h0LCBzaXplKSB7XG5cbiAgRXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XG5cbiAgdmFyIHMgPSBTbmFwKGVsKTtcbiAgdGhpcy5zID0gcy5ncm91cCgpO1xuICB0aGlzLmZsb29yID0gdGhpcy5zLmdyb3VwKCk7XG4gIHRoaXMuaXRlbXMgPSB0aGlzLnMuZ3JvdXAoKTtcblxuICB0aGlzLnNpemUgPSBbIHdpZHRoLCBoZWlnaHQgXTtcbiAgdGhpcy56b29tTGV2ZWwgPSAxO1xuICB0aGlzLnZpZXdNYXRyaXggPSBuZXcgU25hcC5NYXRyaXgoKTtcbiAgdGhpcy50aWxlcyA9IHt9O1xuICB0aGlzLnBvaW50cyA9IHt9O1xuICB0aGlzLnNlbGVjdGVkID0gW107XG5cbiAgdGhpcy5tb3ZlVG8oMCwgMCk7XG5cbiAgc2V0RXZlbnRIYW5kbGVycy5jYWxsKHRoaXMpO1xufVxuXG51dGlsLmluaGVyaXRzKEdyaWQsIEV2ZW50RW1pdHRlcik7XG5cbnZhciBHID0gR3JpZC5wcm90b3R5cGU7XG5cblxuLy8vIGdyb3VwXG5cbkcuZ3JvdXAgPSBmdW5jdGlvbihwYXJlbnQpIHtcbiAgaWYgKCEgcGFyZW50KSBwYXJlbnQgPSB0aGlzLml0ZW1zO1xuICB2YXIgZyA9IHBhcmVudC5ncm91cCgpO1xuICByZXR1cm4gZztcbn07XG5cbi8vLyBDcmVhdGUgVGlsZVxuXG5HLmNyZWF0ZVRpbGUgPSBmdW5jdGlvbiAoeCwgeSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBwb2ludHMgPSBbXG4gIFsgeCAtIDAuNSwgeSArIDAuNSBdLFxuICBbIHggLSAwLjUsIHkgLSAwLjUgXSxcbiAgWyB4ICsgMC41LCB5IC0gMC41IF0sXG4gIFsgeCArIDAuNSwgeSArIDAuNSBdXG4gIF07XG4gIHZhciBwb2x5ID0gcG9pbnRzLm1hcChmdW5jdGlvbiAocHQpIHsgcmV0dXJuIHNlbGYudG9Xb3JsZChwdFswXSwgcHRbMV0pIH0pO1xuXG4gIHZhciB0aWxlID0gbmV3IEV2ZW50RW1pdHRlcjtcbiAgdGlsZS54ID0geDtcbiAgdGlsZS55ID0geTtcbiAgdGlsZS50eXBlID0gJ3RpbGUnO1xuICB0aWxlLmVsZW1lbnQgPSBzZWxmLmZsb29yLnBhdGgocG9seWdvbihwb2x5KSk7XG5cbiAgdmFyIHB0ID0gc2VsZi50b1dvcmxkKHgsIHkpO1xuICB0aWxlLnNjcmVlblggPSBwdFswXTtcbiAgdGlsZS5zY3JlZW5ZID0gcHRbMV07XG5cbiAgc2VsZi50aWxlc1t4ICsgJywnICsgeV0gPSB0aWxlO1xuXG4gIHJldHVybiB0aWxlO1xufTtcblxuRy50aWxlQXQgPSBmdW5jdGlvbiAoeCwgeSkge1xuICByZXR1cm4gdGhpcy50aWxlc1t4ICsgJywnICsgeV07XG59O1xuXG5HLnBvaW50QXQgPSBmdW5jdGlvbiAoeCwgeSkge1xuICByZXR1cm4gdGhpcy5wb2ludHNbeCArICcsJyArIHldO1xufTtcblxuRy5pbWFnZVBvcyA9IGZ1bmN0aW9uIChpbWFnZSwgeCwgeSkge1xuICB2YXIgdyA9IHRoaXMudG9Xb3JsZCh4LCB5KTtcblxuICByZXR1cm4ge1xuICAgIHg6IHdbMF0gLSBpbWFnZS53aWR0aCAvIDIsXG4gICAgeTogd1sxXSAtIGltYWdlLmhlaWdodCArIDI1XG4gIH07XG59XG5cbkcuY3JlYXRlSXRlbSA9IGZ1bmN0aW9uIChzcmMsIHgsIHksIGdyb3VwLCBjYikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBpbSA9IG5ldyBJbWFnZTtcblxuICBpbS5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24gKCkge1xuICAgIHZhciBpdGVtID0gbmV3IEV2ZW50RW1pdHRlcjtcbiAgICB2YXIgaW1hZ2VQb3MgPSBzZWxmLmltYWdlUG9zKGltLCB4LCB5KTtcbiAgICBpdGVtLmVsZW1lbnQgPSBncm91cC5pbWFnZShcbiAgICAgIHNyYyxcbiAgICAgIGltYWdlUG9zLngsIGltYWdlUG9zLnksXG4gICAgICBpbS53aWR0aCwgaW0uaGVpZ2h0XG4gICAgICApO1xuICAgIGl0ZW0uaW1hZ2UgPSBpbTtcbiAgICBpdGVtLnggPSB4O1xuICAgIGl0ZW0ueSA9IHk7XG5cbiAgICB2YXIgcHQgPSBzZWxmLnRvV29ybGQoeCwgeSk7XG4gICAgaXRlbS5zY3JlZW5YID0gcHRbMF07XG4gICAgaXRlbS5zY3JlZW5ZID0gcHRbMV07XG4gICAgaXRlbS5pbWFnZVggPSBpbWFnZVBvcy54O1xuICAgIGl0ZW0uaW1hZ2VZID0gaW1hZ2VQb3MueTtcblxuICAgIGlmICh0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpIGNiKG51bGwsIGl0ZW0pO1xuICB9KTtcbiAgaW0uYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBjYik7XG4gIGltLnNyYyA9IHNyYztcbn07XG5cbkcucmVtb3ZlSXRlbSA9IGZ1bmN0aW9uIChpdGVtLCBjYikge1xuICBpdGVtLmVsZW1lbnQucmVtb3ZlKCk7XG59O1xuXG5HLm1vdmVJdGVtID0gZnVuY3Rpb24oaXRlbSwgeCwgeSwgY2IpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgZnJvbSA9IHt4OiBpdGVtLmltYWdlWCwgeTogaXRlbS5pbWFnZVl9O1xuICB2YXIgdG8gPSB0aGlzLmltYWdlUG9zKGl0ZW0uaW1hZ2UsIHgsIHkpO1xuXG4gIGl0ZW0ueCA9IHg7XG4gIGl0ZW0uc2NyZWVuWCA9IHRvLng7XG4gIGl0ZW0uaW1hZ2VYID0gdG8ueDtcbiAgaXRlbS55ID0geTtcbiAgaXRlbS5zY3JlZW5ZID0gdG8ueTtcbiAgaXRlbS5pbWFnZVkgPSB0by55O1xuXG4gIGl0ZW0uZWxlbWVudC5hbmltYXRlKHt4OiBpdGVtLmltYWdlWCwgeTogaXRlbS5pbWFnZVl9LCAxMDAsIGNiKTtcbn07XG5cbkcuY3JlYXRlV2FsbCA9IGZ1bmN0aW9uIChzcmMsIHB0MCwgcHQxLCBzZXQsIGNiKSB7XG4gIGlmIChwdDAueSA9PT0gcHQxLnkpIHtcbiAgICB2YXIgeDAgPSBNYXRoLm1pbihwdDAueCwgcHQxLngpO1xuICAgIHZhciB4dCA9IE1hdGgubWF4KHB0MC54LCBwdDEueCk7XG4gICAgZm9yICh2YXIgeCA9IHgwOyB4IDwgeHQ7IHgrKykge1xuICAgICAgdGhpcy5jcmVhdGVJdGVtKHNyYywgeCArIDAuNzUsIHB0MC55IC0gMC4yNSwgc2V0LCBjYik7XG4gICAgfVxuICB9XG4gIGVsc2UgaWYgKHB0MC54ID09PSBwdDEueCkge1xuICAgIHZhciB5MCA9IE1hdGgubWluKHB0MC55LCBwdDEueSk7XG4gICAgdmFyIHl0ID0gTWF0aC5tYXgocHQwLnksIHB0MS55KTtcbiAgICBmb3IgKHZhciB5ID0geTA7IHkgPCB5dDsgeSsrKSB7XG4gICAgICB0aGlzLmNyZWF0ZUl0ZW0oc3JjLCBwdDAueCArIDAuMjUsIHkgKyAwLjI1LCBzZXQsIGNiKTtcbiAgICB9XG4gIH1cbn07XG5cbkcubW92ZSA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gIHRoaXMubW92ZVRvKHRoaXMucG9zaXRpb25bMF0gKyB4LCB0aGlzLnBvc2l0aW9uWzFdICsgeSk7XG59O1xuXG5HLm1vdmVUbyA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gIHRoaXMucG9zaXRpb24gPSBbIHgsIHkgXTtcbiAgdGhpcy5fc2V0VmlldygpO1xufTtcblxuRy5wYW4gPSBmdW5jdGlvbiAoeCwgeSkge1xuICB2YXIgdHggPSB4IC8gMiArIHkgLyAyO1xuICB2YXIgdHkgPSB4IC8gMiAtIHkgLyAyO1xuXG4gIHRoaXMubW92ZShcbiAgICB0eCAvIE1hdGgucG93KHRoaXMuem9vbUxldmVsLCAwLjUpLFxuICAgIHR5IC8gTWF0aC5wb3codGhpcy56b29tTGV2ZWwsIDAuNSlcbiAgICApO1xufTtcblxuRy56b29tID0gZnVuY3Rpb24gKGxldmVsKSB7XG4gIHRoaXMuem9vbUxldmVsID0gbGV2ZWw7XG4gIHRoaXMuX3NldFZpZXcoKTtcbn07XG5cbkcuX3NldFZpZXcgPSBmdW5jdGlvbiAoZHVyYXRpb24sIGNiKSB7XG4gIGlmICgnZnVuY3Rpb24nID09IHR5cGVvZiBkdXJhdGlvbikge1xuICAgIGNiID0gZHVyYXRpb247XG4gICAgZHVyYXRpb24gPSB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAoISBkdXJhdGlvbikgZHVyYXRpb24gPSBtb3ZlQW5pbWF0aW9uRHVyYXRpb247XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuICB2YXIgdyA9IHRoaXMuc2l6ZVswXSAvIHRoaXMuem9vbUxldmVsO1xuICB2YXIgaCA9IHRoaXMuc2l6ZVsxXSAvIHRoaXMuem9vbUxldmVsO1xuXG4gIHZhciBwdCA9IHRoaXMudG9Xb3JsZCh0aGlzLnBvc2l0aW9uWzBdLCB0aGlzLnBvc2l0aW9uWzFdKTtcbiAgdmFyIHggPSBwdFswXSAtIHcgLyAyO1xuICB2YXIgeSA9IHB0WzFdIC0gaCAvIDI7XG5cbiAgeCA9IC14O1xuICB5ID0gLXk7XG5cbiAgdmFyIG9sZE1hdHJpeCA9IHRoaXMudmlld01hdHJpeDtcbiAgdmFyIG5ld01hdHJpeCA9IG5ldyBTbmFwLk1hdHJpeCgpO1xuICBuZXdNYXRyaXguc2NhbGUodGhpcy56b29tTGV2ZWwpO1xuICBuZXdNYXRyaXgudHJhbnNsYXRlKHgsIHkpO1xuICB0aGlzLnZpZXdNYXRyaXggPSBuZXdNYXRyaXg7XG5cblxuICAvLyB3ZSBuZWVkIHRvIGFuaW1hdGUgbWF0cml4IGVsZW1lbnRzLCBhLCBkLCBlIGFuZCBmICh0cmFuc2xhdGUgYW5kIHNjYWxlKVxuICAvLyByZWZlcmVuY2U6IGh0dHA6Ly9hcGlrZS5jYS9wcm9nX3N2Z190cmFuc2Zvcm0uaHRtbFxuXG4gIHZhciBwZW5kaW5nID0gbWF0cml4QW5pbWF0ZWRFbGVtcy5sZW5ndGg7XG5cbiAgbWF0cml4QW5pbWF0ZWRFbGVtcy5mb3JFYWNoKGZ1bmN0aW9uKGVsZW0pIHtcbiAgICBTbmFwLmFuaW1hdGUob2xkTWF0cml4W2VsZW1dLCBuZXdNYXRyaXhbZWxlbV0sIHNldHRlciwgZHVyYXRpb24sIG9uZURvbmUpO1xuXG4gICAgZnVuY3Rpb24gc2V0dGVyKHZhbCkge1xuICAgICAgb2xkTWF0cml4W2VsZW1dID0gdmFsO1xuICAgICAgc2VsZi5zLnRyYW5zZm9ybShvbGRNYXRyaXgpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG9uZURvbmUoKSB7XG4gICAgICBpZiAoLS0gcGVuZGluZyA9PSAwKSBkb25lKCk7XG4gICAgfVxuICB9KTtcblxuICBmdW5jdGlvbiBkb25lKCkge1xuICAgICAgaWYgKGNiKSBjYigpO1xuICB9XG59O1xuXG5HLnRvV29ybGQgPSBmdW5jdGlvbiAoeCwgeSkge1xuICB2YXIgdHggPSB4IC8gMiArIHkgLyAyO1xuICB2YXIgdHkgPSAteCAvIDIgKyB5IC8gMjtcbiAgcmV0dXJuIFsgdHggKiAxMDAsIHR5ICogNTAgXTtcbn07XG5cbkcuZnJvbVdvcmxkID0gZnVuY3Rpb24gKHR4LCB0eSkge1xuICB2YXIgeCA9IHR4IC8gMTAwO1xuICB2YXIgeSA9IHR5IC8gNTA7XG4gIHJldHVybiBbIHggLSB5LCB4ICsgeSBdO1xufTtcblxuZnVuY3Rpb24gcG9seWdvbiAocG9pbnRzKSB7XG4gIHZhciB4cyA9IHBvaW50cy5tYXAoZnVuY3Rpb24gKHApIHsgcmV0dXJuIHAuam9pbignLCcpIH0pO1xuICByZXR1cm4gJ00nICsgeHNbMF0gKyAnIEwnICsgeHMuc2xpY2UoMSkuam9pbignICcpICsgJyBaJztcbn1cblxuZnVuY3Rpb24gc2V0RXZlbnRIYW5kbGVycygpIHtcbiAgdmFyIHdpbiA9IGdsb2JhbDtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBvbiA9IHR5cGVvZiB3aW4uYWRkRXZlbnRMaXN0ZW5lciA9PT0gJ2Z1bmN0aW9uJ1xuICA/IHdpbi5hZGRFdmVudExpc3RlbmVyXG4gIDogd2luLm9uXG4gIDtcbiAgLy8gb24uY2FsbCh3aW4sICdrZXlkb3duJywgZnVuY3Rpb24gKGV2KSB7XG4gIC8vICAgICB2YXIgZSA9IE9iamVjdC5rZXlzKGV2KS5yZWR1Y2UoZnVuY3Rpb24gKGFjYywga2V5KSB7XG4gIC8vICAgICAgICAgYWNjW2tleV0gPSBldltrZXldO1xuICAvLyAgICAgICAgIHJldHVybiBhY2M7XG4gIC8vICAgICB9LCB7fSk7XG4gIC8vICAgICB2YXIgcHJldmVudGVkID0gZmFsc2U7XG4gIC8vICAgICBlLnByZXZlbnREZWZhdWx0ID0gZnVuY3Rpb24gKCkge1xuICAvLyAgICAgICAgIHByZXZlbnRlZCA9IHRydWU7XG4gIC8vICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbiAgLy8gICAgIH07XG4gIC8vICAgICBzZWxmLmVtaXQoJ2tleWRvd24nLCBlKTtcbiAgLy8gICAgIGlmIChwcmV2ZW50ZWQpIHJldHVybjtcblxuICAvLyAgICAgdmFyIGtleSA9IGV2LmtleUlkZW50aWZpZXIudG9Mb3dlckNhc2UoKTtcbiAgLy8gICAgIHZhciBkeiA9IHtcbiAgLy8gICAgICAgICAxODcgOiAxIC8gMC45LFxuICAvLyAgICAgICAgIDE4OSA6IDAuOSxcbiAgLy8gICAgIH1bZXYua2V5Q29kZV07XG4gIC8vICAgICBpZiAoZHopIHJldHVybiBzZWxmLnpvb20oc2VsZi56b29tTGV2ZWwgKiBkeik7XG4gIC8vICAgICBpZiAoZXYua2V5Q29kZSA9PT0gNDkpIHJldHVybiBzZWxmLnpvb20oMSk7XG5cbiAgLy8gICAgIHZhciBkeHkgPSB7XG4gIC8vICAgICAgICAgZG93biA6IFsgMCwgLTEgXSxcbiAgLy8gICAgICAgICB1cCA6IFsgMCwgKzEgXSxcbiAgLy8gICAgICAgICBsZWZ0IDogWyAtMSwgMCBdLFxuICAvLyAgICAgICAgIHJpZ2h0IDogWyArMSwgMCBdXG4gIC8vICAgICB9W2tleV07XG5cbiAgLy8gICAgIGlmIChkeHkpIHtcbiAgLy8gICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xuICAvLyAgICAgICAgIHNlbGYucGFuKGR4eVswXSwgZHh5WzFdKTtcbiAgLy8gICAgIH1cbiAgLy8gfSk7XG5cbiAgdmFyIHNlbGVjdGVkID0ge307XG4gIHNlbGYuc2VsZWN0ZWQucHVzaChzZWxlY3RlZCk7XG5cbiAgb24uY2FsbCh3aW4sICdtb3VzZW1vdmUnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICB2YXIgeHkgPSBzZWxmLmZyb21Xb3JsZChcbiAgICAgIChldi5jbGllbnRYIC0gc2VsZi5zaXplWzBdIC8gMikgLyBzZWxmLnpvb21MZXZlbCxcbiAgICAgIChldi5jbGllbnRZIC0gc2VsZi5zaXplWzFdIC8gMikgLyBzZWxmLnpvb21MZXZlbFxuICAgICAgKTtcblxuICAgIHZhciB0eCA9IE1hdGgucm91bmQoeHlbMF0gKyBzZWxmLnBvc2l0aW9uWzBdKTtcbiAgICB2YXIgdHkgPSBNYXRoLnJvdW5kKHh5WzFdICsgc2VsZi5wb3NpdGlvblsxXSk7XG4gICAgdmFyIHRpbGUgPSBzZWxmLnRpbGVBdCh0eCwgdHkpO1xuXG4gICAgaWYgKHRpbGUgJiYgdGlsZSAhPT0gc2VsZWN0ZWQudGlsZSkge1xuICAgICAgaWYgKHNlbGVjdGVkLnRpbGUpIHtcbiAgICAgICAgc2VsZWN0ZWQudGlsZS5lbWl0KCdtb3VzZW91dCcsIGV2KTtcbiAgICAgICAgc2VsZi5lbWl0KCdtb3VzZW91dCcsIHNlbGVjdGVkLnRpbGUsIGV2KTtcbiAgICAgIH1cbiAgICAgIHNlbGVjdGVkLnRpbGUgPSB0aWxlO1xuICAgICAgdGlsZS5lbWl0KCdtb3VzZW92ZXInLCBldik7XG4gICAgICBzZWxmLmVtaXQoJ21vdXNlb3ZlcicsIHRpbGUsIGV2KTtcbiAgICB9XG5cbiAgICB2YXIgcHggPSBNYXRoLmZsb29yKHh5WzBdICsgc2VsZi5wb3NpdGlvblswXSkgKyAwLjU7XG4gICAgdmFyIHB5ID0gTWF0aC5mbG9vcih4eVsxXSArIHNlbGYucG9zaXRpb25bMV0pICsgMC41O1xuICAgIHZhciBwdCA9IHNlbGYucG9pbnRBdChweCwgcHkpO1xuXG4gICAgaWYgKHB0ICYmIHB0ICE9PSBzZWxlY3RlZC5wb2ludCkge1xuICAgICAgaWYgKHNlbGVjdGVkLnBvaW50KSB7XG4gICAgICAgIHNlbGVjdGVkLnBvaW50LmVtaXQoJ21vdXNlb3V0JywgZXYpO1xuICAgICAgICBzZWxmLmVtaXQoJ21vdXNlb3V0Jywgc2VsZWN0ZWQucG9pbnQsIGV2KTtcbiAgICAgIH1cbiAgICAgIHNlbGVjdGVkLnBvaW50ID0gcHQ7XG4gICAgICBwdC5lbWl0KCdtb3VzZW92ZXInLCBldik7XG4gICAgICBzZWxmLmVtaXQoJ21vdXNlb3V0JywgcHQsIGV2KTtcbiAgICB9XG4gIH0pO1xuXG4gIFsgJ2NsaWNrJywgJ21vdXNlZG93bicsICdtb3VzZXVwJyBdLmZvckVhY2goZnVuY3Rpb24gKGV2TmFtZSkge1xuICAgIG9uLmNhbGwod2luLCBldk5hbWUsIGZ1bmN0aW9uIChldikge1xuICAgICAgaWYgKHNlbGVjdGVkLnRpbGUpIHtcbiAgICAgICAgc2VsZWN0ZWQudGlsZS5lbWl0KGV2TmFtZSwgZXYpO1xuICAgICAgICBzZWxmLmVtaXQoZXZOYW1lLCBzZWxlY3RlZC50aWxlLCBldik7XG4gICAgICB9XG4gICAgICBpZiAoc2VsZWN0ZWQucG9pbnQpIHtcbiAgICAgICAgc2VsZWN0ZWQucG9pbnQuZW1pdChldk5hbWUsIGV2KTtcbiAgICAgICAgc2VsZi5lbWl0KGV2TmFtZSwgc2VsZWN0ZWQucG9pbnQsIGV2KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59O1xufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgayxcbiAgX2hhbmRsZXJzID0ge30sXG4gIF9tb2RzID0geyAxNjogZmFsc2UsIDE4OiBmYWxzZSwgMTc6IGZhbHNlLCA5MTogZmFsc2UgfSxcbiAgX3Njb3BlID0gJ2FsbCcsXG4gIC8vIG1vZGlmaWVyIGtleXNcbiAgX01PRElGSUVSUyA9IHtcbiAgICAnw6LigKHCpyc6IDE2LCBzaGlmdDogMTYsXG4gICAgJ8OixZLCpSc6IDE4LCBhbHQ6IDE4LCBvcHRpb246IDE4LFxuICAgICfDosWSxpInOiAxNywgY3RybDogMTcsIGNvbnRyb2w6IDE3LFxuICAgICfDosWSy5wnOiA5MSwgY29tbWFuZDogOTFcbiAgfSxcbiAgLy8gc3BlY2lhbCBrZXlzXG4gIF9NQVAgPSB7XG4gICAgYmFja3NwYWNlOiA4LCB0YWI6IDksIGNsZWFyOiAxMixcbiAgICBlbnRlcjogMTMsICdyZXR1cm4nOiAxMyxcbiAgICBlc2M6IDI3LCBlc2NhcGU6IDI3LCBzcGFjZTogMzIsXG4gICAgbGVmdDogMzcsIHVwOiAzOCxcbiAgICByaWdodDogMzksIGRvd246IDQwLFxuICAgIGRlbDogNDYsICdkZWxldGUnOiA0NixcbiAgICBob21lOiAzNiwgZW5kOiAzNSxcbiAgICBwYWdldXA6IDMzLCBwYWdlZG93bjogMzQsXG4gICAgJywnOiAxODgsICcuJzogMTkwLCAnLyc6IDE5MSxcbiAgICAnYCc6IDE5MiwgJy0nOiAxODksICc9JzogMTg3LFxuICAgICc7JzogMTg2LCAnXFwnJzogMjIyLFxuICAgICdbJzogMjE5LCAnXSc6IDIyMSwgJ1xcXFwnOiAyMjBcbiAgfSxcbiAgY29kZSA9IGZ1bmN0aW9uKHgpe1xuICAgIHJldHVybiBfTUFQW3hdIHx8IHgudG9VcHBlckNhc2UoKS5jaGFyQ29kZUF0KDApO1xuICB9LFxuICBfZG93bktleXMgPSBbXTtcblxuZm9yKGs9MTtrPDIwO2srKykgX01BUFsnZicra10gPSAxMTEraztcblxuLy8gSUUgZG9lc24ndCBzdXBwb3J0IEFycmF5I2luZGV4T2YsIHNvIGhhdmUgYSBzaW1wbGUgcmVwbGFjZW1lbnRcbmZ1bmN0aW9uIGluZGV4KGFycmF5LCBpdGVtKXtcbiAgdmFyIGkgPSBhcnJheS5sZW5ndGg7XG4gIHdoaWxlKGktLSkgaWYoYXJyYXlbaV09PT1pdGVtKSByZXR1cm4gaTtcbiAgcmV0dXJuIC0xO1xufVxuXG4vLyBmb3IgY29tcGFyaW5nIG1vZHMgYmVmb3JlIHVuYXNzaWdubWVudFxuZnVuY3Rpb24gY29tcGFyZUFycmF5KGExLCBhMikge1xuICBpZiAoYTEubGVuZ3RoICE9IGEyLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGExLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYTFbaV0gIT09IGEyW2ldKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbnZhciBtb2RpZmllck1hcCA9IHtcbiAgICAxNjonc2hpZnRLZXknLFxuICAgIDE4OidhbHRLZXknLFxuICAgIDE3OidjdHJsS2V5JyxcbiAgICA5MTonbWV0YUtleSdcbn07XG5mdW5jdGlvbiB1cGRhdGVNb2RpZmllcktleShldmVudCkge1xuICAgIGZvcihrIGluIF9tb2RzKSBfbW9kc1trXSA9IGV2ZW50W21vZGlmaWVyTWFwW2tdXTtcbn07XG5cbi8vIGhhbmRsZSBrZXlkb3duIGV2ZW50XG5mdW5jdGlvbiBkaXNwYXRjaChldmVudCkge1xuICB2YXIga2V5LCBoYW5kbGVyLCBrLCBpLCBtb2RpZmllcnNNYXRjaCwgc2NvcGU7XG4gIGtleSA9IGV2ZW50LmtleUNvZGU7XG5cbiAgaWYgKGluZGV4KF9kb3duS2V5cywga2V5KSA9PSAtMSkge1xuICAgICAgX2Rvd25LZXlzLnB1c2goa2V5KTtcbiAgfVxuXG4gIC8vIGlmIGEgbW9kaWZpZXIga2V5LCBzZXQgdGhlIGtleS48bW9kaWZpZXJrZXluYW1lPiBwcm9wZXJ0eSB0byB0cnVlIGFuZCByZXR1cm5cbiAgaWYoa2V5ID09IDkzIHx8IGtleSA9PSAyMjQpIGtleSA9IDkxOyAvLyByaWdodCBjb21tYW5kIG9uIHdlYmtpdCwgY29tbWFuZCBvbiBHZWNrb1xuICBpZihrZXkgaW4gX21vZHMpIHtcbiAgICBfbW9kc1trZXldID0gdHJ1ZTtcbiAgICAvLyAnYXNzaWduS2V5JyBmcm9tIGluc2lkZSB0aGlzIGNsb3N1cmUgaXMgZXhwb3J0ZWQgdG8gd2luZG93LmtleVxuICAgIGZvcihrIGluIF9NT0RJRklFUlMpIGlmKF9NT0RJRklFUlNba10gPT0ga2V5KSBhc3NpZ25LZXlba10gPSB0cnVlO1xuICAgIHJldHVybjtcbiAgfVxuICB1cGRhdGVNb2RpZmllcktleShldmVudCk7XG5cbiAgLy8gc2VlIGlmIHdlIG5lZWQgdG8gaWdub3JlIHRoZSBrZXlwcmVzcyAoZmlsdGVyKCkgY2FuIGNhbiBiZSBvdmVycmlkZGVuKVxuICAvLyBieSBkZWZhdWx0IGlnbm9yZSBrZXkgcHJlc3NlcyBpZiBhIHNlbGVjdCwgdGV4dGFyZWEsIG9yIGlucHV0IGlzIGZvY3VzZWRcbiAgaWYoIWFzc2lnbktleS5maWx0ZXIuY2FsbCh0aGlzLCBldmVudCkpIHJldHVybjtcblxuICAvLyBhYm9ydCBpZiBubyBwb3RlbnRpYWxseSBtYXRjaGluZyBzaG9ydGN1dHMgZm91bmRcbiAgaWYgKCEoa2V5IGluIF9oYW5kbGVycykpIHJldHVybjtcblxuICBzY29wZSA9IGdldFNjb3BlKCk7XG5cbiAgLy8gZm9yIGVhY2ggcG90ZW50aWFsIHNob3J0Y3V0XG4gIGZvciAoaSA9IDA7IGkgPCBfaGFuZGxlcnNba2V5XS5sZW5ndGg7IGkrKykge1xuICAgIGhhbmRsZXIgPSBfaGFuZGxlcnNba2V5XVtpXTtcblxuICAgIC8vIHNlZSBpZiBpdCdzIGluIHRoZSBjdXJyZW50IHNjb3BlXG4gICAgaWYoaGFuZGxlci5zY29wZSA9PSBzY29wZSB8fCBoYW5kbGVyLnNjb3BlID09ICdhbGwnKXtcbiAgICAgIC8vIGNoZWNrIGlmIG1vZGlmaWVycyBtYXRjaCBpZiBhbnlcbiAgICAgIG1vZGlmaWVyc01hdGNoID0gaGFuZGxlci5tb2RzLmxlbmd0aCA+IDA7XG4gICAgICBmb3IoayBpbiBfbW9kcylcbiAgICAgICAgaWYoKCFfbW9kc1trXSAmJiBpbmRleChoYW5kbGVyLm1vZHMsICtrKSA+IC0xKSB8fFxuICAgICAgICAgIChfbW9kc1trXSAmJiBpbmRleChoYW5kbGVyLm1vZHMsICtrKSA9PSAtMSkpIG1vZGlmaWVyc01hdGNoID0gZmFsc2U7XG4gICAgICAvLyBjYWxsIHRoZSBoYW5kbGVyIGFuZCBzdG9wIHRoZSBldmVudCBpZiBuZWNjZXNzYXJ5XG4gICAgICBpZigoaGFuZGxlci5tb2RzLmxlbmd0aCA9PSAwICYmICFfbW9kc1sxNl0gJiYgIV9tb2RzWzE4XSAmJiAhX21vZHNbMTddICYmICFfbW9kc1s5MV0pIHx8IG1vZGlmaWVyc01hdGNoKXtcbiAgICAgICAgaWYoaGFuZGxlci5tZXRob2QoZXZlbnQsIGhhbmRsZXIpPT09ZmFsc2Upe1xuICAgICAgICAgIGlmKGV2ZW50LnByZXZlbnREZWZhdWx0KSBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZWxzZSBldmVudC5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xuICAgICAgICAgIGlmKGV2ZW50LnN0b3BQcm9wYWdhdGlvbikgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgaWYoZXZlbnQuY2FuY2VsQnViYmxlKSBldmVudC5jYW5jZWxCdWJibGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vLyB1bnNldCBtb2RpZmllciBrZXlzIG9uIGtleXVwXG5mdW5jdGlvbiBjbGVhck1vZGlmaWVyKGV2ZW50KXtcbiAgdmFyIGtleSA9IGV2ZW50LmtleUNvZGUsIGssXG4gICAgICBpID0gaW5kZXgoX2Rvd25LZXlzLCBrZXkpO1xuXG4gIC8vIHJlbW92ZSBrZXkgZnJvbSBfZG93bktleXNcbiAgaWYgKGkgPj0gMCkge1xuICAgICAgX2Rvd25LZXlzLnNwbGljZShpLCAxKTtcbiAgfVxuXG4gIGlmKGtleSA9PSA5MyB8fCBrZXkgPT0gMjI0KSBrZXkgPSA5MTtcbiAgaWYoa2V5IGluIF9tb2RzKSB7XG4gICAgX21vZHNba2V5XSA9IGZhbHNlO1xuICAgIGZvcihrIGluIF9NT0RJRklFUlMpIGlmKF9NT0RJRklFUlNba10gPT0ga2V5KSBhc3NpZ25LZXlba10gPSBmYWxzZTtcbiAgfVxufTtcblxuZnVuY3Rpb24gcmVzZXRNb2RpZmllcnMoKSB7XG4gIGZvcihrIGluIF9tb2RzKSBfbW9kc1trXSA9IGZhbHNlO1xuICBmb3IoayBpbiBfTU9ESUZJRVJTKSBhc3NpZ25LZXlba10gPSBmYWxzZTtcbn07XG5cbi8vIHBhcnNlIGFuZCBhc3NpZ24gc2hvcnRjdXRcbmZ1bmN0aW9uIGFzc2lnbktleShrZXksIHNjb3BlLCBtZXRob2Qpe1xuICB2YXIga2V5cywgbW9kcztcbiAga2V5cyA9IGdldEtleXMoa2V5KTtcbiAgaWYgKG1ldGhvZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbWV0aG9kID0gc2NvcGU7XG4gICAgc2NvcGUgPSAnYWxsJztcbiAgfVxuXG4gIC8vIGZvciBlYWNoIHNob3J0Y3V0XG4gIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgIC8vIHNldCBtb2RpZmllciBrZXlzIGlmIGFueVxuICAgIG1vZHMgPSBbXTtcbiAgICBrZXkgPSBrZXlzW2ldLnNwbGl0KCcrJyk7XG4gICAgaWYgKGtleS5sZW5ndGggPiAxKXtcbiAgICAgIG1vZHMgPSBnZXRNb2RzKGtleSk7XG4gICAgICBrZXkgPSBba2V5W2tleS5sZW5ndGgtMV1dO1xuICAgIH1cbiAgICAvLyBjb252ZXJ0IHRvIGtleWNvZGUgYW5kLi4uXG4gICAga2V5ID0ga2V5WzBdXG4gICAga2V5ID0gY29kZShrZXkpO1xuICAgIC8vIC4uLnN0b3JlIGhhbmRsZXJcbiAgICBpZiAoIShrZXkgaW4gX2hhbmRsZXJzKSkgX2hhbmRsZXJzW2tleV0gPSBbXTtcbiAgICBfaGFuZGxlcnNba2V5XS5wdXNoKHsgc2hvcnRjdXQ6IGtleXNbaV0sIHNjb3BlOiBzY29wZSwgbWV0aG9kOiBtZXRob2QsIGtleToga2V5c1tpXSwgbW9kczogbW9kcyB9KTtcbiAgfVxufTtcblxuLy8gdW5iaW5kIGFsbCBoYW5kbGVycyBmb3IgZ2l2ZW4ga2V5IGluIGN1cnJlbnQgc2NvcGVcbmZ1bmN0aW9uIHVuYmluZEtleShrZXksIHNjb3BlKSB7XG4gIHZhciBtdWx0aXBsZUtleXMsIGtleXMsXG4gICAgbW9kcyA9IFtdLFxuICAgIGksIGosIG9iajtcblxuICBtdWx0aXBsZUtleXMgPSBnZXRLZXlzKGtleSk7XG5cbiAgZm9yIChqID0gMDsgaiA8IG11bHRpcGxlS2V5cy5sZW5ndGg7IGorKykge1xuICAgIGtleXMgPSBtdWx0aXBsZUtleXNbal0uc3BsaXQoJysnKTtcblxuICAgIGlmIChrZXlzLmxlbmd0aCA+IDEpIHtcbiAgICAgIG1vZHMgPSBnZXRNb2RzKGtleXMpO1xuICAgICAga2V5ID0ga2V5c1trZXlzLmxlbmd0aCAtIDFdO1xuICAgIH1cblxuICAgIGtleSA9IGNvZGUoa2V5KTtcblxuICAgIGlmIChzY29wZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBzY29wZSA9IGdldFNjb3BlKCk7XG4gICAgfVxuICAgIGlmICghX2hhbmRsZXJzW2tleV0pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IF9oYW5kbGVyc1trZXldLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmogPSBfaGFuZGxlcnNba2V5XVtpXTtcbiAgICAgIC8vIG9ubHkgY2xlYXIgaGFuZGxlcnMgaWYgY29ycmVjdCBzY29wZSBhbmQgbW9kcyBtYXRjaFxuICAgICAgaWYgKG9iai5zY29wZSA9PT0gc2NvcGUgJiYgY29tcGFyZUFycmF5KG9iai5tb2RzLCBtb2RzKSkge1xuICAgICAgICBfaGFuZGxlcnNba2V5XVtpXSA9IHt9O1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLy8gUmV0dXJucyB0cnVlIGlmIHRoZSBrZXkgd2l0aCBjb2RlICdrZXlDb2RlJyBpcyBjdXJyZW50bHkgZG93blxuLy8gQ29udmVydHMgc3RyaW5ncyBpbnRvIGtleSBjb2Rlcy5cbmZ1bmN0aW9uIGlzUHJlc3NlZChrZXlDb2RlKSB7XG4gICAgaWYgKHR5cGVvZihrZXlDb2RlKT09J3N0cmluZycpIHtcbiAgICAgIGtleUNvZGUgPSBjb2RlKGtleUNvZGUpO1xuICAgIH1cbiAgICByZXR1cm4gaW5kZXgoX2Rvd25LZXlzLCBrZXlDb2RlKSAhPSAtMTtcbn1cblxuZnVuY3Rpb24gZ2V0UHJlc3NlZEtleUNvZGVzKCkge1xuICAgIHJldHVybiBfZG93bktleXMuc2xpY2UoMCk7XG59XG5cbmZ1bmN0aW9uIGZpbHRlcihldmVudCl7XG4gIHZhciB0YWdOYW1lID0gKGV2ZW50LnRhcmdldCB8fCBldmVudC5zcmNFbGVtZW50KS50YWdOYW1lO1xuICAvLyBpZ25vcmUga2V5cHJlc3NlZCBpbiBhbnkgZWxlbWVudHMgdGhhdCBzdXBwb3J0IGtleWJvYXJkIGRhdGEgaW5wdXRcbiAgcmV0dXJuICEodGFnTmFtZSA9PSAnSU5QVVQnIHx8IHRhZ05hbWUgPT0gJ1NFTEVDVCcgfHwgdGFnTmFtZSA9PSAnVEVYVEFSRUEnKTtcbn1cblxuLy8gaW5pdGlhbGl6ZSBrZXkuPG1vZGlmaWVyPiB0byBmYWxzZVxuZm9yKGsgaW4gX01PRElGSUVSUykgYXNzaWduS2V5W2tdID0gZmFsc2U7XG5cbi8vIHNldCBjdXJyZW50IHNjb3BlIChkZWZhdWx0ICdhbGwnKVxuZnVuY3Rpb24gc2V0U2NvcGUoc2NvcGUpeyBfc2NvcGUgPSBzY29wZSB8fCAnYWxsJyB9O1xuZnVuY3Rpb24gZ2V0U2NvcGUoKXsgcmV0dXJuIF9zY29wZSB8fCAnYWxsJyB9O1xuXG4vLyBkZWxldGUgYWxsIGhhbmRsZXJzIGZvciBhIGdpdmVuIHNjb3BlXG5mdW5jdGlvbiBkZWxldGVTY29wZShzY29wZSl7XG4gIHZhciBrZXksIGhhbmRsZXJzLCBpO1xuXG4gIGZvciAoa2V5IGluIF9oYW5kbGVycykge1xuICAgIGhhbmRsZXJzID0gX2hhbmRsZXJzW2tleV07XG4gICAgZm9yIChpID0gMDsgaSA8IGhhbmRsZXJzLmxlbmd0aDsgKSB7XG4gICAgICBpZiAoaGFuZGxlcnNbaV0uc2NvcGUgPT09IHNjb3BlKSBoYW5kbGVycy5zcGxpY2UoaSwgMSk7XG4gICAgICBlbHNlIGkrKztcbiAgICB9XG4gIH1cbn07XG5cbi8vIGFic3RyYWN0IGtleSBsb2dpYyBmb3IgYXNzaWduIGFuZCB1bmFzc2lnblxuZnVuY3Rpb24gZ2V0S2V5cyhrZXkpIHtcbiAgdmFyIGtleXM7XG4gIGtleSA9IGtleS5yZXBsYWNlKC9cXHMvZywgJycpO1xuICBrZXlzID0ga2V5LnNwbGl0KCcsJyk7XG4gIGlmICgoa2V5c1trZXlzLmxlbmd0aCAtIDFdKSA9PSAnJykge1xuICAgIGtleXNba2V5cy5sZW5ndGggLSAyXSArPSAnLCc7XG4gIH1cbiAgcmV0dXJuIGtleXM7XG59XG5cbi8vIGFic3RyYWN0IG1vZHMgbG9naWMgZm9yIGFzc2lnbiBhbmQgdW5hc3NpZ25cbmZ1bmN0aW9uIGdldE1vZHMoa2V5KSB7XG4gIHZhciBtb2RzID0ga2V5LnNsaWNlKDAsIGtleS5sZW5ndGggLSAxKTtcbiAgZm9yICh2YXIgbWkgPSAwOyBtaSA8IG1vZHMubGVuZ3RoOyBtaSsrKVxuICBtb2RzW21pXSA9IF9NT0RJRklFUlNbbW9kc1ttaV1dO1xuICByZXR1cm4gbW9kcztcbn1cblxuLy8gY3Jvc3MtYnJvd3NlciBldmVudHNcbmZ1bmN0aW9uIGFkZEV2ZW50KG9iamVjdCwgZXZlbnQsIG1ldGhvZCkge1xuICBpZiAob2JqZWN0LmFkZEV2ZW50TGlzdGVuZXIpXG4gICAgb2JqZWN0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIG1ldGhvZCwgZmFsc2UpO1xuICBlbHNlIGlmKG9iamVjdC5hdHRhY2hFdmVudClcbiAgICBvYmplY3QuYXR0YWNoRXZlbnQoJ29uJytldmVudCwgZnVuY3Rpb24oKXsgbWV0aG9kKHdpbmRvdy5ldmVudCkgfSk7XG59O1xuXG4vLyBzZXQgdGhlIGhhbmRsZXJzIGdsb2JhbGx5IG9uIGRvY3VtZW50XG5hZGRFdmVudChkb2N1bWVudCwgJ2tleWRvd24nLCBmdW5jdGlvbihldmVudCkgeyBkaXNwYXRjaChldmVudCkgfSk7IC8vIFBhc3NpbmcgX3Njb3BlIHRvIGEgY2FsbGJhY2sgdG8gZW5zdXJlIGl0IHJlbWFpbnMgdGhlIHNhbWUgYnkgZXhlY3V0aW9uLiBGaXhlcyAjNDhcbmFkZEV2ZW50KGRvY3VtZW50LCAna2V5dXAnLCBjbGVhck1vZGlmaWVyKTtcblxuLy8gcmVzZXQgbW9kaWZpZXJzIHRvIGZhbHNlIHdoZW5ldmVyIHRoZSB3aW5kb3cgaXMgKHJlKWZvY3VzZWQuXG5hZGRFdmVudCh3aW5kb3csICdmb2N1cycsIHJlc2V0TW9kaWZpZXJzKTtcblxuLy8gc3RvcmUgcHJldmlvdXNseSBkZWZpbmVkIGtleVxudmFyIHByZXZpb3VzS2V5ID0gZ2xvYmFsLmtleTtcblxuLy8gcmVzdG9yZSBwcmV2aW91c2x5IGRlZmluZWQga2V5IGFuZCByZXR1cm4gcmVmZXJlbmNlIHRvIG91ciBrZXkgb2JqZWN0XG5mdW5jdGlvbiBub0NvbmZsaWN0KCkge1xuICB2YXIgayA9IGdsb2JhbC5rZXk7XG4gIGdsb2JhbC5rZXkgPSBwcmV2aW91c0tleTtcbiAgcmV0dXJuIGs7XG59XG5cbi8vIHNldCB3aW5kb3cua2V5IGFuZCB3aW5kb3cua2V5LnNldC9nZXQvZGVsZXRlU2NvcGUsIGFuZCB0aGUgZGVmYXVsdCBmaWx0ZXJcbmdsb2JhbC5rZXkgPSBhc3NpZ25LZXk7XG5nbG9iYWwua2V5LnNldFNjb3BlID0gc2V0U2NvcGU7XG5nbG9iYWwua2V5LmdldFNjb3BlID0gZ2V0U2NvcGU7XG5nbG9iYWwua2V5LmRlbGV0ZVNjb3BlID0gZGVsZXRlU2NvcGU7XG5nbG9iYWwua2V5LmZpbHRlciA9IGZpbHRlcjtcbmdsb2JhbC5rZXkuaXNQcmVzc2VkID0gaXNQcmVzc2VkO1xuZ2xvYmFsLmtleS5nZXRQcmVzc2VkS2V5Q29kZXMgPSBnZXRQcmVzc2VkS2V5Q29kZXM7XG5nbG9iYWwua2V5Lm5vQ29uZmxpY3QgPSBub0NvbmZsaWN0O1xuZ2xvYmFsLmtleS51bmJpbmQgPSB1bmJpbmRLZXk7XG5cbmlmKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSBtb2R1bGUuZXhwb3J0cyA9IGdsb2JhbC5rZXk7XG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIm1vZHVsZS5leHBvcnRzID0gVGlsZXM7XG5cbmZ1bmN0aW9uIFRpbGVzKGdyaWQpIHtcbiAgdmFyIHNlbGYgPSB7fTtcblxuICBzZWxmLnRpbGVzID0gW107XG5cbiAgc2VsZi5ncmlkID0gZ3JpZDtcblxuICBzZWxmLmNyZWF0ZSA9IGNyZWF0ZTtcblxuICByZXR1cm4gc2VsZjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlKHgsIHkpIHtcbiAgdmFyIHRpbGUgPSB0aGlzLmdyaWQuY3JlYXRlVGlsZSh4LCB5KTtcbiAgdGlsZS5lbGVtZW50LmF0dHIoJ2ZpbGwnLCAncmdiYSgyMTAsMjEwLDIxMCwxLjApJyk7XG4gIHRpbGUuZWxlbWVudC5hdHRyKCdzdHJva2Utd2lkdGgnLCAnMScpO1xuICB0aWxlLmVsZW1lbnQuYXR0cignc3Ryb2tlJywgJ3JnYigyNTUsMjU1LDIwMCknKTtcblxuICB0aWxlLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5sb2coJ2F0JywgdGlsZS54LCB0aWxlLnkpO1xuICAgIC8vIHRpbGUuZWxlbWVudC50b0Zyb250KCk7XG4gICAgdGlsZS5lbGVtZW50LmF0dHIoJ2ZpbGwnLCAncmdiYSgyNTUsMTI3LDEyNywwLjgpJyk7XG4gIH0pO1xuXG4gIHRpbGUub24oJ21vdXNlb3V0JywgZnVuY3Rpb24gKCkge1xuICAgIC8vIHRpbGUuZWxlbWVudC50b0JhY2soKTtcbiAgICB0aWxlLmVsZW1lbnQuYXR0cignZmlsbCcsICdyZ2JhKDIxMCwyMTAsMjEwLDEuMCknKTtcbiAgfSk7XG5cbiAgdGhpcy50aWxlcy5wdXNoKHRpbGUpO1xuXG4gIHJldHVybiB0aWxlO1xufSIsInZhciBleHRlbmQgPSByZXF1aXJlKCd4dGVuZCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFdhbGxUeXBlO1xuXG52YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG4gIGltYWdlczoge1xuICAgIGxlZnQ6ICcvc3ByaXRlcy93YWxscy9wbGFpbi9sZWZ0LnBuZycsXG4gICAgcmlnaHQ6ICcvc3ByaXRlcy93YWxscy9wbGFpbi9yaWdodC5wbmcnXG4gIH0sXG4gIHRyYXZlcnNhYmxlOiBmYWxzZVxufVxuXG5mdW5jdGlvbiBXYWxsVHlwZShvcHRpb25zKSB7XG4gIHZhciBzZWxmID0ge307XG5cbiAgb3B0aW9ucyA9IGV4dGVuZCh7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMgfHwge30pO1xuXG4gIHNlbGYuaW1hZ2VzID0gb3B0aW9ucy5pbWFnZXM7XG5cblxuICAvLy8gbWV0aG9kc1xuXG4gIHNlbGYuaW1hZ2UgPSBpbWFnZTtcblxuXG4gIHJldHVybiBzZWxmO1xufVxuXG5mdW5jdGlvbiBpbWFnZShvcmllbnRhdGlvbikge1xuICB2YXIgaW1nID0gdGhpcy5pbWFnZXNbb3JpZW50YXRpb25dO1xuICBpZiAoISBpbWcpIHRocm93IG5ldyBFcnJvcignbm8gaW1hZ2UgZm9yIG9yaWVudGF0aW9uICcgKyBvcmllbnRhdGlvbik7XG4gIHJldHVybiBpbWc7XG59IiwidmFyIFdhbGxUeXBlID0gcmVxdWlyZSgnLi93YWxsX3R5cGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBXYWxsVHlwZXM7XG5cbmZ1bmN0aW9uIFdhbGxUeXBlcyhib2FyZCkge1xuICB2YXIgc2VsZiA9IHt9O1xuXG4gIHNlbGYuYm9hcmQgPSBib2FyZDtcblxuXG4gIC8vLyBtZXRob2RzXG5cbiAgc2VsZi5jcmVhdGUgPSBjcmVhdGU7XG5cbiAgcmV0dXJuIHNlbGY7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZShvcHRpb25zKSB7XG4gIHJldHVybiBXYWxsVHlwZShvcHRpb25zKTtcbn0iLCJ2YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBXYWxscztcblxuZnVuY3Rpb24gV2FsbHMoYm9hcmQpIHtcbiAgdmFyIHNlbGYgPSB7fTtcblxuICBzZWxmLndhbGxzID0ge307XG5cbiAgc2VsZi5ib2FyZCA9IGJvYXJkO1xuXG4gIHNlbGYucGxhY2UgPSBwbGFjZTtcbiAgc2VsZi5wbGFjZU9uZSA9IHBsYWNlT25lO1xuICBzZWxmLmF0ID0gYXQ7XG4gIHNlbGYudHJhdmVyc2FibGUgPSB0cmF2ZXJzYWJsZTtcblxuICByZXR1cm4gc2VsZjtcbn1cblxuLy8vIHBsYWNlXG5cbmZ1bmN0aW9uIHBsYWNlKHdhbGxUeXBlLCBmcm9tLCB0bykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFsaWRhdGVJbml0aWFsV2FsbENvb3Jkcyhmcm9tKTtcbiAgdmFsaWRhdGVJbml0aWFsV2FsbENvb3Jkcyh0byk7XG5cbiAgaWYgKGZyb20ueCAhPSB0by54ICYmIGZyb20ueSAhPSB0by55KVxuICAgIHRocm93IG5ldyBFcnJvcignd2FsbHMgbXVzdCBiZSBkcmF3biBpbiBhIGxpbmUnKTtcblxuICBpZiAoZnJvbS54ID09IHRvLngpIHtcbiAgICB2YXIgbWF4WSA9IE1hdGgubWF4KGZyb20ueSwgdG8ueSk7XG4gICAgdmFyIG1pblkgPSBNYXRoLm1pbihmcm9tLnksIHRvLnkpO1xuICAgIGZvcih2YXIgeSA9IG1pblk7IHkgPCBtYXhZOyB5ID0geSArIDEpIHtcbiAgICAgIHNlbGYucGxhY2VPbmUod2FsbFR5cGUsIGZyb20ueCwgeSArIDAuNSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBtYXhYID0gTWF0aC5tYXgoZnJvbS54LCB0by54KTtcbiAgICB2YXIgbWluWCA9IE1hdGgubWluKGZyb20ueCwgdG8ueCk7XG4gICAgZm9yKHZhciB4ID0gbWluWDsgeCA8IG1heFg7IHggKz0gMSkge1xuICAgICAgc2VsZi5wbGFjZU9uZSh3YWxsVHlwZSwgeCArIDAuNSwgZnJvbS55KTtcbiAgICB9XG4gIH1cbn1cblxuXG4vLy8gcGxhY2VPbmVcblxuZnVuY3Rpb24gcGxhY2VPbmUod2FsbFR5cGUsIHgsIHkpIHtcblxuICB2YXIgb3JpZW50YXRpb247XG5cbiAgdmFyIHhJc1plcm8gPSB2YWxpZGF0ZU9uZVdhbGxDb29yZHMoeCwgeSk7XG4gIHZhciBmcm9tLCB0bztcbiAgaWYoeElzWmVybykge1xuICAgIGZyb20gPSB7XG4gICAgICB4OiB4IC0gMC41LFxuICAgICAgeTogeVxuICAgIH07XG5cbiAgICB0byA9IHtcbiAgICAgIHg6IHggKyAwLjUsXG4gICAgICB5OiB5XG4gICAgfVxuXG4gICAgb3JpZW50YXRpb24gPSAnbGVmdCc7XG4gIH0gZWxzZSB7XG4gICAgZnJvbSA9IHtcbiAgICAgIHg6IHgsXG4gICAgICB5OiB5IC0gMC41XG4gICAgfTtcblxuICAgIHRvID0ge1xuICAgICAgeDogeCxcbiAgICAgIHk6IHkgKyAwLjVcbiAgICB9XG5cbiAgICBvcmllbnRhdGlvbiA9ICdyaWdodCc7XG4gIH1cblxuICB2YXIgaW1hZ2UgPSB3YWxsVHlwZS5pbWFnZShvcmllbnRhdGlvbik7XG5cbiAgdmFyIHJvdyA9IHRoaXMud2FsbHNbeF07XG4gIGlmICghIHJvdykgcm93ID0gdGhpcy53YWxsc1t4XSA9IHt9O1xuICByb3dbeV0gPSB3YWxsVHlwZTtcblxuICB0aGlzLmJvYXJkLmNyZWF0ZVdhbGwoaW1hZ2UsIGZyb20sIHRvKTtcbn1cblxuZnVuY3Rpb24gYXQoeCwgeSkge1xuICB2YXIgd2FsbCA9IHRoaXMud2FsbHNbeF07XG4gIGlmICh3YWxsKSB3YWxsID0gd2FsbFt5XTtcblxuICByZXR1cm4gd2FsbDtcbn1cblxuXG5mdW5jdGlvbiB0cmF2ZXJzYWJsZShmcm9tLCB0bykge1xuICB2YXIgd2FsbDtcbiAgdmFyIHdhbGxzO1xuICB2YXIgdHJhdmVyc2FibGU7XG5cbiAgdmFyIGRpZmZYID0gdG8ueCAtIGZyb20ueDtcbiAgdmFyIGRpZmZZID0gdG8ueSAtIGZyb20ueTtcblxuICBpZiAoTWF0aC5hYnMoZGlmZlgpID4gMSB8fCBNYXRoLmFicyhkaWZmWSkgPiAxKVxuICAgIHRocm93IG5ldyBFcnJvcignY2Fubm90IGNhbGN1bGF0ZSB0cmF2ZXJzYWJpbGl0eSBmb3IgZGlzdGFuY2VzID4gMScpO1xuXG4gIHZhciBtaWRYID0gZnJvbS54ICsgZGlmZlggLyAyO1xuICB2YXIgbWlkWSA9IGZyb20ueSArIGRpZmZZIC8gMjtcblxuICBpZiAoZGlmZlggPT0gMCB8fCBkaWZmWSA9PSAwKSB7XG4gICAgLy8gbm8gZGlhZ29uYWxcbiAgICB3YWxsID0gdGhpcy5hdChtaWRYLCBtaWRZKTtcbiAgICB0cmF2ZXJzYWJsZSA9ICEgd2FsbCB8fCB3YWxsLnRyYXZlcnNhYmxlO1xuICB9IGVsc2Uge1xuICAgIC8vIGRpYWdvbmFsXG5cbiAgICB2YXIgd2FsbDEgPSB0aGlzLmF0KG1pZFgsIGZyb20ueSk7XG4gICAgd2FsbDEgPSB3YWxsMSAmJiAhd2FsbDEudHJhdmVyc2FibGU7XG5cbiAgICB2YXIgd2FsbDIgPSB0aGlzLmF0KHRvLngsIG1pZFkpO1xuICAgIHdhbGwyID0gd2FsbDIgJiYgIXdhbGwyLnRyYXZlcnNhYmxlO1xuXG4gICAgdmFyIHdhbGwzID0gdGhpcy5hdChtaWRYLCB0by55KTtcbiAgICB3YWxsMyA9IHdhbGwzICYmICF3YWxsMy50cmF2ZXJzYWJsZTtcblxuICAgIHZhciB3YWxsNCA9IHRoaXMuYXQoZnJvbS54LCBtaWRZKTtcbiAgICB3YWxsNCA9IHdhbGw0ICYmICF3YWxsNC50cmF2ZXJzYWJsZTtcblxuICAgIHRyYXZlcnNhYmxlID0gKFxuICAgICAgICAgISh3YWxsMSAmJiB3YWxsMilcbiAgICAgICYmICEod2FsbDIgJiYgd2FsbDMpXG4gICAgICAmJiAhKHdhbGwzICYmIHdhbGw0KVxuICAgICAgJiYgISh3YWxsNCAmJiB3YWxsMSlcbiAgICAgICYmICEod2FsbDEgJiYgd2FsbDMpXG4gICAgICAmJiAhKHdhbGwyICYmIHdhbGw0KVxuICAgICAgJiYgISh3YWxsMyAmJiB3YWxsMSkpO1xuICB9XG5cbiAgcmV0dXJuIHRyYXZlcnNhYmxlO1xufVxuXG5mdW5jdGlvbiBpc1RyYXZlcnNhYmxlKHdhbGwpIHtcbiAgcmV0dXJuIHdhbGwudHJhdmVyc2FibGU7XG59XG5cblxuXG4vLy8gTWlzY1xuXG5mdW5jdGlvbiB2YWxpZGF0ZUluaXRpYWxXYWxsQ29vcmRzKGNvb3Jkcykge1xuICB2YXIgeCA9IGNvb3Jkcy54O1xuICBpZiAoTWF0aC5hYnMoTWF0aC5yb3VuZCh4KSAtIHgpICE9PSAwLjUpIHRocm93IG5ldyBFcnJvcignd2FsbCB4IGNvb3JkaW5hdGUgbXVzdCBiZSBuLjUnKTtcbiAgdmFyIHkgPSBjb29yZHMueTtcbiAgaWYgKE1hdGguYWJzKE1hdGgucm91bmQoeSkgLSB5KSAhPT0gMC41KSB0aHJvdyBuZXcgRXJyb3IoJ3dhbGwgeSBjb29yZGluYXRlIG11c3QgYmUgbi41Jyk7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlT25lV2FsbENvb3Jkcyh4LCB5KSB7XG4gIHZhciB4RnJhY3Rpb24gPSBNYXRoLmFicyhNYXRoLnJvdW5kKHgpIC0geCkgPT09IDAuNTtcbiAgdmFyIHlGcmFjdGlvbiA9IE1hdGguYWJzKE1hdGgucm91bmQoeSkgLSB5KSA9PT0gMC41O1xuXG4gIGlmICh4RnJhY3Rpb24gJiYgeUZyYWN0aW9uIHx8ICEgKHhGcmFjdGlvbiB8fCB5RnJhY3Rpb24pKVxuICAgIHRocm93IG5ldyBFcnJvcignd2FsbCBjYW5cXCd0IGJlIHBsYWNlZCBhdCAnICsgeCArICcsICcgKyB5KTtcblxuICByZXR1cm4geEZyYWN0aW9uO1xufSIsIm1vZHVsZS5leHBvcnRzID0gWkluZGV4ZXM7XG5cbmZ1bmN0aW9uIFpJbmRleGVzKGdyaWQsIHNpemUpIHtcblxuICB2YXIgc2VsZiA9IHt9O1xuXG4gIHNlbGYuZ3JpZCA9IGdyaWQ7XG4gIHNlbGYuc2l6ZSA9IHNpemU7XG4gIHNlbGYuaGFsZlNpemUgPSBzaXplIC8gMjtcblxuICBzZWxmLmluY3JlbWVudHMgPSAwLjI1O1xuICBzZWxmLm11bHRpcGx5QnkgPSAxIC8gc2VsZi5pbmNyZW1lbnRzO1xuXG4gIGlmIChzZWxmLmhhbGZTaXplICE9IE1hdGgucm91bmQoc2VsZi5oYWxmU2l6ZSkpIHRocm93IG5ldyBFcnJvcignbmVlZCBldmVuIGRpbWVuc2lvbnMnKTtcblxuICBzZWxmLnNldHMgPSBbXTtcblxuICAvLy8gbWV0aG9kc1xuXG4gIHNlbGYuaW5pdCA9IGluaXQ7XG4gIHNlbGYuc2V0Rm9yID0gc2V0Rm9yO1xuICBzZWxmLmFkZCA9IGFkZDtcbiAgc2VsZi5yZW1vdmUgPSByZW1vdmU7XG4gIHNlbGYubW92ZSA9IG1vdmU7XG5cbiAgc2VsZi5pbml0KCk7XG5cbiAgcmV0dXJuIHNlbGY7XG59XG5cblxuZnVuY3Rpb24gaW5pdCgpIHtcbiAgdmFyIG9yZGVyID0gMDtcbiAgZm9yKHZhciBpID0gMDsgaSA8IHRoaXMuc2l6ZTsgaSArPSB0aGlzLmluY3JlbWVudHMsIG9yZGVyKyspIHtcbiAgICB2YXIgcGFyZW50ID0gdGhpcy5zZXRzW29yZGVyIC0xXTtcbiAgICB2YXIgc2V0ID0gdGhpcy5ncmlkLmdyb3VwKHBhcmVudCk7XG4gICAgc2V0Ll9faW5kZXggPSBvcmRlcjtcbiAgICB0aGlzLnNldHMucHVzaChzZXQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNldEZvcih4LCB5KSB7XG4gIHggPSB4ICsgdGhpcy5oYWxmU2l6ZTtcbiAgeSA9IHRoaXMuc2l6ZSAtICh5ICsgdGhpcy5oYWxmU2l6ZSk7XG5cbiAgdmFyIHNldEluZGV4ID0gKCgoeCArIHkpIC8gMikgKiB0aGlzLm11bHRpcGx5QnkpO1xuICByZXR1cm4gIHRoaXMuc2V0c1tzZXRJbmRleF07XG59XG5cbmZ1bmN0aW9uIGFkZChpdGVtKSB7XG4gIHZhciBzZXQgPSB0aGlzLnNldEZvcihpdGVtLngsIGl0ZW0ueSk7XG4gIC8vIGNvbnNvbGUubG9nKCdhZGRpbmcgJXMgdG8gKCVkLCAlZCkgLT4gc2V0ICVkJywgaXRlbS5uYW1lLCBpdGVtLngsIGl0ZW0ueSwgc2V0Ll9faW5kZXgpO1xuICBzZXQucHVzaChpdGVtLmVsZW1lbnQpO1xufVxuXG5mdW5jdGlvbiByZW1vdmUoaXRlbSkge1xuICB2YXIgc2V0ID0gdGhpcy5zZXRGb3IoaXRlbS54LCBpdGVtLnkpO1xuICBzZXQuZXhjbHVkZShpdGVtLmVsZW1lbnQpO1xufVxuXG5mdW5jdGlvbiBtb3ZlKGl0ZW0sIGZyb20sIHRvKSB7XG4gIHZhciBvcmlnaW5TZXQgPSB0aGlzLnNldEZvcihmcm9tLngsIGZyb20ueSk7XG4gIHZhciB0YXJnZXRTZXQgPSB0aGlzLnNldEZvcihpdGVtLngsIGl0ZW0ueSk7XG5cbiAgaWYgKG9yaWdpblNldCAhPSB0YXJnZXRTZXQpIHtcbiAgICB0YXJnZXRTZXQuYWRkKGl0ZW0uZWxlbWVudCk7XG4gIH1cblxufSIsIi8vIENvcHlyaWdodCAoYykgMjAxMyBBZG9iZSBTeXN0ZW1zIEluY29ycG9yYXRlZC4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIFxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8gXG4vLyBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vIFxuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbi8vIOKUjOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUkCBcXFxcXG4vLyDilIIgRXZlIDAuNC4yIC0gSmF2YVNjcmlwdCBFdmVudHMgTGlicmFyeSAgICAgICAgICAgICAgICAgICAgICDilIIgXFxcXFxuLy8g4pSc4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSkIFxcXFxcbi8vIOKUgiBBdXRob3IgRG1pdHJ5IEJhcmFub3Zza2l5IChodHRwOi8vZG1pdHJ5LmJhcmFub3Zza2l5LmNvbS8pIOKUgiBcXFxcXG4vLyDilJTilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilJggXFxcXFxuXG4oZnVuY3Rpb24gKGdsb2IpIHtcbiAgICB2YXIgdmVyc2lvbiA9IFwiMC40LjJcIixcbiAgICAgICAgaGFzID0gXCJoYXNPd25Qcm9wZXJ0eVwiLFxuICAgICAgICBzZXBhcmF0b3IgPSAvW1xcLlxcL10vLFxuICAgICAgICB3aWxkY2FyZCA9IFwiKlwiLFxuICAgICAgICBmdW4gPSBmdW5jdGlvbiAoKSB7fSxcbiAgICAgICAgbnVtc29ydCA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICByZXR1cm4gYSAtIGI7XG4gICAgICAgIH0sXG4gICAgICAgIGN1cnJlbnRfZXZlbnQsXG4gICAgICAgIHN0b3AsXG4gICAgICAgIGV2ZW50cyA9IHtuOiB7fX0sXG4gICAgLypcXFxuICAgICAqIGV2ZVxuICAgICBbIG1ldGhvZCBdXG5cbiAgICAgKiBGaXJlcyBldmVudCB3aXRoIGdpdmVuIGBuYW1lYCwgZ2l2ZW4gc2NvcGUgYW5kIG90aGVyIHBhcmFtZXRlcnMuXG5cbiAgICAgPiBBcmd1bWVudHNcblxuICAgICAtIG5hbWUgKHN0cmluZykgbmFtZSBvZiB0aGUgKmV2ZW50KiwgZG90IChgLmApIG9yIHNsYXNoIChgL2ApIHNlcGFyYXRlZFxuICAgICAtIHNjb3BlIChvYmplY3QpIGNvbnRleHQgZm9yIHRoZSBldmVudCBoYW5kbGVyc1xuICAgICAtIHZhcmFyZ3MgKC4uLikgdGhlIHJlc3Qgb2YgYXJndW1lbnRzIHdpbGwgYmUgc2VudCB0byBldmVudCBoYW5kbGVyc1xuXG4gICAgID0gKG9iamVjdCkgYXJyYXkgb2YgcmV0dXJuZWQgdmFsdWVzIGZyb20gdGhlIGxpc3RlbmVyc1xuICAgIFxcKi9cbiAgICAgICAgZXZlID0gZnVuY3Rpb24gKG5hbWUsIHNjb3BlKSB7XG5cdFx0XHRuYW1lID0gU3RyaW5nKG5hbWUpO1xuICAgICAgICAgICAgdmFyIGUgPSBldmVudHMsXG4gICAgICAgICAgICAgICAgb2xkc3RvcCA9IHN0b3AsXG4gICAgICAgICAgICAgICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMiksXG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzID0gZXZlLmxpc3RlbmVycyhuYW1lKSxcbiAgICAgICAgICAgICAgICB6ID0gMCxcbiAgICAgICAgICAgICAgICBmID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgbCxcbiAgICAgICAgICAgICAgICBpbmRleGVkID0gW10sXG4gICAgICAgICAgICAgICAgcXVldWUgPSB7fSxcbiAgICAgICAgICAgICAgICBvdXQgPSBbXSxcbiAgICAgICAgICAgICAgICBjZSA9IGN1cnJlbnRfZXZlbnQsXG4gICAgICAgICAgICAgICAgZXJyb3JzID0gW107XG4gICAgICAgICAgICBjdXJyZW50X2V2ZW50ID0gbmFtZTtcbiAgICAgICAgICAgIHN0b3AgPSAwO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gbGlzdGVuZXJzLmxlbmd0aDsgaSA8IGlpOyBpKyspIGlmIChcInpJbmRleFwiIGluIGxpc3RlbmVyc1tpXSkge1xuICAgICAgICAgICAgICAgIGluZGV4ZWQucHVzaChsaXN0ZW5lcnNbaV0uekluZGV4KTtcbiAgICAgICAgICAgICAgICBpZiAobGlzdGVuZXJzW2ldLnpJbmRleCA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcXVldWVbbGlzdGVuZXJzW2ldLnpJbmRleF0gPSBsaXN0ZW5lcnNbaV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW5kZXhlZC5zb3J0KG51bXNvcnQpO1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4ZWRbel0gPCAwKSB7XG4gICAgICAgICAgICAgICAgbCA9IHF1ZXVlW2luZGV4ZWRbeisrXV07XG4gICAgICAgICAgICAgICAgb3V0LnB1c2gobC5hcHBseShzY29wZSwgYXJncykpO1xuICAgICAgICAgICAgICAgIGlmIChzdG9wKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b3AgPSBvbGRzdG9wO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3V0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbCA9IGxpc3RlbmVyc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAoXCJ6SW5kZXhcIiBpbiBsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsLnpJbmRleCA9PSBpbmRleGVkW3pdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQucHVzaChsLmFwcGx5KHNjb3BlLCBhcmdzKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHorKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsID0gcXVldWVbaW5kZXhlZFt6XV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbCAmJiBvdXQucHVzaChsLmFwcGx5KHNjb3BlLCBhcmdzKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0b3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSB3aGlsZSAobClcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXVlW2wuekluZGV4XSA9IGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXQucHVzaChsLmFwcGx5KHNjb3BlLCBhcmdzKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdG9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0b3AgPSBvbGRzdG9wO1xuICAgICAgICAgICAgY3VycmVudF9ldmVudCA9IGNlO1xuICAgICAgICAgICAgcmV0dXJuIG91dC5sZW5ndGggPyBvdXQgOiBudWxsO1xuICAgICAgICB9O1xuXHRcdC8vIFVuZG9jdW1lbnRlZC4gRGVidWcgb25seS5cblx0XHRldmUuX2V2ZW50cyA9IGV2ZW50cztcbiAgICAvKlxcXG4gICAgICogZXZlLmxpc3RlbmVyc1xuICAgICBbIG1ldGhvZCBdXG5cbiAgICAgKiBJbnRlcm5hbCBtZXRob2Qgd2hpY2ggZ2l2ZXMgeW91IGFycmF5IG9mIGFsbCBldmVudCBoYW5kbGVycyB0aGF0IHdpbGwgYmUgdHJpZ2dlcmVkIGJ5IHRoZSBnaXZlbiBgbmFtZWAuXG5cbiAgICAgPiBBcmd1bWVudHNcblxuICAgICAtIG5hbWUgKHN0cmluZykgbmFtZSBvZiB0aGUgZXZlbnQsIGRvdCAoYC5gKSBvciBzbGFzaCAoYC9gKSBzZXBhcmF0ZWRcblxuICAgICA9IChhcnJheSkgYXJyYXkgb2YgZXZlbnQgaGFuZGxlcnNcbiAgICBcXCovXG4gICAgZXZlLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHZhciBuYW1lcyA9IG5hbWUuc3BsaXQoc2VwYXJhdG9yKSxcbiAgICAgICAgICAgIGUgPSBldmVudHMsXG4gICAgICAgICAgICBpdGVtLFxuICAgICAgICAgICAgaXRlbXMsXG4gICAgICAgICAgICBrLFxuICAgICAgICAgICAgaSxcbiAgICAgICAgICAgIGlpLFxuICAgICAgICAgICAgaixcbiAgICAgICAgICAgIGpqLFxuICAgICAgICAgICAgbmVzLFxuICAgICAgICAgICAgZXMgPSBbZV0sXG4gICAgICAgICAgICBvdXQgPSBbXTtcbiAgICAgICAgZm9yIChpID0gMCwgaWkgPSBuYW1lcy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICBuZXMgPSBbXTtcbiAgICAgICAgICAgIGZvciAoaiA9IDAsIGpqID0gZXMubGVuZ3RoOyBqIDwgamo7IGorKykge1xuICAgICAgICAgICAgICAgIGUgPSBlc1tqXS5uO1xuICAgICAgICAgICAgICAgIGl0ZW1zID0gW2VbbmFtZXNbaV1dLCBlW3dpbGRjYXJkXV07XG4gICAgICAgICAgICAgICAgayA9IDI7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGstLSkge1xuICAgICAgICAgICAgICAgICAgICBpdGVtID0gaXRlbXNba107XG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXMucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dCA9IG91dC5jb25jYXQoaXRlbS5mIHx8IFtdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVzID0gbmVzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfTtcbiAgICBcbiAgICAvKlxcXG4gICAgICogZXZlLm9uXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBCaW5kcyBnaXZlbiBldmVudCBoYW5kbGVyIHdpdGggYSBnaXZlbiBuYW1lLiBZb3UgY2FuIHVzZSB3aWxkY2FyZHMg4oCcYCpg4oCdIGZvciB0aGUgbmFtZXM6XG4gICAgIHwgZXZlLm9uKFwiKi51bmRlci4qXCIsIGYpO1xuICAgICB8IGV2ZShcIm1vdXNlLnVuZGVyLmZsb29yXCIpOyAvLyB0cmlnZ2VycyBmXG4gICAgICogVXNlIEBldmUgdG8gdHJpZ2dlciB0aGUgbGlzdGVuZXIuXG4gICAgICoqXG4gICAgID4gQXJndW1lbnRzXG4gICAgICoqXG4gICAgIC0gbmFtZSAoc3RyaW5nKSBuYW1lIG9mIHRoZSBldmVudCwgZG90IChgLmApIG9yIHNsYXNoIChgL2ApIHNlcGFyYXRlZCwgd2l0aCBvcHRpb25hbCB3aWxkY2FyZHNcbiAgICAgLSBmIChmdW5jdGlvbikgZXZlbnQgaGFuZGxlciBmdW5jdGlvblxuICAgICAqKlxuICAgICA9IChmdW5jdGlvbikgcmV0dXJuZWQgZnVuY3Rpb24gYWNjZXB0cyBhIHNpbmdsZSBudW1lcmljIHBhcmFtZXRlciB0aGF0IHJlcHJlc2VudHMgei1pbmRleCBvZiB0aGUgaGFuZGxlci4gSXQgaXMgYW4gb3B0aW9uYWwgZmVhdHVyZSBhbmQgb25seSB1c2VkIHdoZW4geW91IG5lZWQgdG8gZW5zdXJlIHRoYXQgc29tZSBzdWJzZXQgb2YgaGFuZGxlcnMgd2lsbCBiZSBpbnZva2VkIGluIGEgZ2l2ZW4gb3JkZXIsIGRlc3BpdGUgb2YgdGhlIG9yZGVyIG9mIGFzc2lnbm1lbnQuIFxuICAgICA+IEV4YW1wbGU6XG4gICAgIHwgZXZlLm9uKFwibW91c2VcIiwgZWF0SXQpKDIpO1xuICAgICB8IGV2ZS5vbihcIm1vdXNlXCIsIHNjcmVhbSk7XG4gICAgIHwgZXZlLm9uKFwibW91c2VcIiwgY2F0Y2hJdCkoMSk7XG4gICAgICogVGhpcyB3aWxsIGVuc3VyZSB0aGF0IGBjYXRjaEl0KClgIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIGJlZm9yZSBgZWF0SXQoKWAuXG5cdCAqXG4gICAgICogSWYgeW91IHdhbnQgdG8gcHV0IHlvdXIgaGFuZGxlciBiZWZvcmUgbm9uLWluZGV4ZWQgaGFuZGxlcnMsIHNwZWNpZnkgYSBuZWdhdGl2ZSB2YWx1ZS5cbiAgICAgKiBOb3RlOiBJIGFzc3VtZSBtb3N0IG9mIHRoZSB0aW1lIHlvdSBkb27igJl0IG5lZWQgdG8gd29ycnkgYWJvdXQgei1pbmRleCwgYnV0IGl04oCZcyBuaWNlIHRvIGhhdmUgdGhpcyBmZWF0dXJlIOKAnGp1c3QgaW4gY2FzZeKAnS5cbiAgICBcXCovXG4gICAgZXZlLm9uID0gZnVuY3Rpb24gKG5hbWUsIGYpIHtcblx0XHRuYW1lID0gU3RyaW5nKG5hbWUpO1xuXHRcdGlmICh0eXBlb2YgZiAhPSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoKSB7fTtcblx0XHR9XG4gICAgICAgIHZhciBuYW1lcyA9IG5hbWUuc3BsaXQoc2VwYXJhdG9yKSxcbiAgICAgICAgICAgIGUgPSBldmVudHM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IG5hbWVzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIGUgPSBlLm47XG4gICAgICAgICAgICBlID0gZS5oYXNPd25Qcm9wZXJ0eShuYW1lc1tpXSkgJiYgZVtuYW1lc1tpXV0gfHwgKGVbbmFtZXNbaV1dID0ge246IHt9fSk7XG4gICAgICAgIH1cbiAgICAgICAgZS5mID0gZS5mIHx8IFtdO1xuICAgICAgICBmb3IgKGkgPSAwLCBpaSA9IGUuZi5sZW5ndGg7IGkgPCBpaTsgaSsrKSBpZiAoZS5mW2ldID09IGYpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW47XG4gICAgICAgIH1cbiAgICAgICAgZS5mLnB1c2goZik7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoekluZGV4KSB7XG4gICAgICAgICAgICBpZiAoK3pJbmRleCA9PSArekluZGV4KSB7XG4gICAgICAgICAgICAgICAgZi56SW5kZXggPSArekluZGV4O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIGV2ZS5mXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZXR1cm5zIGZ1bmN0aW9uIHRoYXQgd2lsbCBmaXJlIGdpdmVuIGV2ZW50IHdpdGggb3B0aW9uYWwgYXJndW1lbnRzLlxuXHQgKiBBcmd1bWVudHMgdGhhdCB3aWxsIGJlIHBhc3NlZCB0byB0aGUgcmVzdWx0IGZ1bmN0aW9uIHdpbGwgYmUgYWxzb1xuXHQgKiBjb25jYXRlZCB0byB0aGUgbGlzdCBvZiBmaW5hbCBhcmd1bWVudHMuXG4gXHQgfCBlbC5vbmNsaWNrID0gZXZlLmYoXCJjbGlja1wiLCAxLCAyKTtcbiBcdCB8IGV2ZS5vbihcImNsaWNrXCIsIGZ1bmN0aW9uIChhLCBiLCBjKSB7XG4gXHQgfCAgICAgY29uc29sZS5sb2coYSwgYiwgYyk7IC8vIDEsIDIsIFtldmVudCBvYmplY3RdXG4gXHQgfCB9KTtcbiAgICAgPiBBcmd1bWVudHNcblx0IC0gZXZlbnQgKHN0cmluZykgZXZlbnQgbmFtZVxuXHQgLSB2YXJhcmdzICjigKYpIGFuZCBhbnkgb3RoZXIgYXJndW1lbnRzXG5cdCA9IChmdW5jdGlvbikgcG9zc2libGUgZXZlbnQgaGFuZGxlciBmdW5jdGlvblxuICAgIFxcKi9cblx0ZXZlLmYgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHR2YXIgYXR0cnMgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdGV2ZS5hcHBseShudWxsLCBbZXZlbnQsIG51bGxdLmNvbmNhdChhdHRycykuY29uY2F0KFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSkpO1xuXHRcdH07XG5cdH07XG4gICAgLypcXFxuICAgICAqIGV2ZS5zdG9wXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBJcyB1c2VkIGluc2lkZSBhbiBldmVudCBoYW5kbGVyIHRvIHN0b3AgdGhlIGV2ZW50LCBwcmV2ZW50aW5nIGFueSBzdWJzZXF1ZW50IGxpc3RlbmVycyBmcm9tIGZpcmluZy5cbiAgICBcXCovXG4gICAgZXZlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHN0b3AgPSAxO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIGV2ZS5udFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQ291bGQgYmUgdXNlZCBpbnNpZGUgZXZlbnQgaGFuZGxlciB0byBmaWd1cmUgb3V0IGFjdHVhbCBuYW1lIG9mIHRoZSBldmVudC5cbiAgICAgKipcbiAgICAgPiBBcmd1bWVudHNcbiAgICAgKipcbiAgICAgLSBzdWJuYW1lIChzdHJpbmcpICNvcHRpb25hbCBzdWJuYW1lIG9mIHRoZSBldmVudFxuICAgICAqKlxuICAgICA9IChzdHJpbmcpIG5hbWUgb2YgdGhlIGV2ZW50LCBpZiBgc3VibmFtZWAgaXMgbm90IHNwZWNpZmllZFxuICAgICAqIG9yXG4gICAgID0gKGJvb2xlYW4pIGB0cnVlYCwgaWYgY3VycmVudCBldmVudOKAmXMgbmFtZSBjb250YWlucyBgc3VibmFtZWBcbiAgICBcXCovXG4gICAgZXZlLm50ID0gZnVuY3Rpb24gKHN1Ym5hbWUpIHtcbiAgICAgICAgaWYgKHN1Ym5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUmVnRXhwKFwiKD86XFxcXC58XFxcXC98XilcIiArIHN1Ym5hbWUgKyBcIig/OlxcXFwufFxcXFwvfCQpXCIpLnRlc3QoY3VycmVudF9ldmVudCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnJlbnRfZXZlbnQ7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogZXZlLm50c1xuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQ291bGQgYmUgdXNlZCBpbnNpZGUgZXZlbnQgaGFuZGxlciB0byBmaWd1cmUgb3V0IGFjdHVhbCBuYW1lIG9mIHRoZSBldmVudC5cbiAgICAgKipcbiAgICAgKipcbiAgICAgPSAoYXJyYXkpIG5hbWVzIG9mIHRoZSBldmVudFxuICAgIFxcKi9cbiAgICBldmUubnRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gY3VycmVudF9ldmVudC5zcGxpdChzZXBhcmF0b3IpO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIGV2ZS5vZmZcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJlbW92ZXMgZ2l2ZW4gZnVuY3Rpb24gZnJvbSB0aGUgbGlzdCBvZiBldmVudCBsaXN0ZW5lcnMgYXNzaWduZWQgdG8gZ2l2ZW4gbmFtZS5cblx0ICogSWYgbm8gYXJndW1lbnRzIHNwZWNpZmllZCBhbGwgdGhlIGV2ZW50cyB3aWxsIGJlIGNsZWFyZWQuXG4gICAgICoqXG4gICAgID4gQXJndW1lbnRzXG4gICAgICoqXG4gICAgIC0gbmFtZSAoc3RyaW5nKSBuYW1lIG9mIHRoZSBldmVudCwgZG90IChgLmApIG9yIHNsYXNoIChgL2ApIHNlcGFyYXRlZCwgd2l0aCBvcHRpb25hbCB3aWxkY2FyZHNcbiAgICAgLSBmIChmdW5jdGlvbikgZXZlbnQgaGFuZGxlciBmdW5jdGlvblxuICAgIFxcKi9cbiAgICAvKlxcXG4gICAgICogZXZlLnVuYmluZFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogU2VlIEBldmUub2ZmXG4gICAgXFwqL1xuICAgIGV2ZS5vZmYgPSBldmUudW5iaW5kID0gZnVuY3Rpb24gKG5hbWUsIGYpIHtcblx0XHRpZiAoIW5hbWUpIHtcblx0XHQgICAgZXZlLl9ldmVudHMgPSBldmVudHMgPSB7bjoge319O1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cbiAgICAgICAgdmFyIG5hbWVzID0gbmFtZS5zcGxpdChzZXBhcmF0b3IpLFxuICAgICAgICAgICAgZSxcbiAgICAgICAgICAgIGtleSxcbiAgICAgICAgICAgIHNwbGljZSxcbiAgICAgICAgICAgIGksIGlpLCBqLCBqaixcbiAgICAgICAgICAgIGN1ciA9IFtldmVudHNdO1xuICAgICAgICBmb3IgKGkgPSAwLCBpaSA9IG5hbWVzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBjdXIubGVuZ3RoOyBqICs9IHNwbGljZS5sZW5ndGggLSAyKSB7XG4gICAgICAgICAgICAgICAgc3BsaWNlID0gW2osIDFdO1xuICAgICAgICAgICAgICAgIGUgPSBjdXJbal0ubjtcbiAgICAgICAgICAgICAgICBpZiAobmFtZXNbaV0gIT0gd2lsZGNhcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVbbmFtZXNbaV1dKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcGxpY2UucHVzaChlW25hbWVzW2ldXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGtleSBpbiBlKSBpZiAoZVtoYXNdKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwbGljZS5wdXNoKGVba2V5XSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3VyLnNwbGljZS5hcHBseShjdXIsIHNwbGljZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMCwgaWkgPSBjdXIubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgZSA9IGN1cltpXTtcbiAgICAgICAgICAgIHdoaWxlIChlLm4pIHtcbiAgICAgICAgICAgICAgICBpZiAoZikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZS5mKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAwLCBqaiA9IGUuZi5sZW5ndGg7IGogPCBqajsgaisrKSBpZiAoZS5mW2pdID09IGYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLmYuc3BsaWNlKGosIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgIWUuZi5sZW5ndGggJiYgZGVsZXRlIGUuZjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmb3IgKGtleSBpbiBlLm4pIGlmIChlLm5baGFzXShrZXkpICYmIGUubltrZXldLmYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmdW5jcyA9IGUubltrZXldLmY7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAwLCBqaiA9IGZ1bmNzLmxlbmd0aDsgaiA8IGpqOyBqKyspIGlmIChmdW5jc1tqXSA9PSBmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Muc3BsaWNlKGosIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgIWZ1bmNzLmxlbmd0aCAmJiBkZWxldGUgZS5uW2tleV0uZjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBlLmY7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoa2V5IGluIGUubikgaWYgKGUubltoYXNdKGtleSkgJiYgZS5uW2tleV0uZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGUubltrZXldLmY7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZSA9IGUubjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgLypcXFxuICAgICAqIGV2ZS5vbmNlXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBCaW5kcyBnaXZlbiBldmVudCBoYW5kbGVyIHdpdGggYSBnaXZlbiBuYW1lIHRvIG9ubHkgcnVuIG9uY2UgdGhlbiB1bmJpbmQgaXRzZWxmLlxuICAgICB8IGV2ZS5vbmNlKFwibG9naW5cIiwgZik7XG4gICAgIHwgZXZlKFwibG9naW5cIik7IC8vIHRyaWdnZXJzIGZcbiAgICAgfCBldmUoXCJsb2dpblwiKTsgLy8gbm8gbGlzdGVuZXJzXG4gICAgICogVXNlIEBldmUgdG8gdHJpZ2dlciB0aGUgbGlzdGVuZXIuXG4gICAgICoqXG4gICAgID4gQXJndW1lbnRzXG4gICAgICoqXG4gICAgIC0gbmFtZSAoc3RyaW5nKSBuYW1lIG9mIHRoZSBldmVudCwgZG90IChgLmApIG9yIHNsYXNoIChgL2ApIHNlcGFyYXRlZCwgd2l0aCBvcHRpb25hbCB3aWxkY2FyZHNcbiAgICAgLSBmIChmdW5jdGlvbikgZXZlbnQgaGFuZGxlciBmdW5jdGlvblxuICAgICAqKlxuICAgICA9IChmdW5jdGlvbikgc2FtZSByZXR1cm4gZnVuY3Rpb24gYXMgQGV2ZS5vblxuICAgIFxcKi9cbiAgICBldmUub25jZSA9IGZ1bmN0aW9uIChuYW1lLCBmKSB7XG4gICAgICAgIHZhciBmMiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGV2ZS51bmJpbmQobmFtZSwgZjIpO1xuICAgICAgICAgICAgcmV0dXJuIGYuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGV2ZS5vbihuYW1lLCBmMik7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogZXZlLnZlcnNpb25cbiAgICAgWyBwcm9wZXJ0eSAoc3RyaW5nKSBdXG4gICAgICoqXG4gICAgICogQ3VycmVudCB2ZXJzaW9uIG9mIHRoZSBsaWJyYXJ5LlxuICAgIFxcKi9cbiAgICBldmUudmVyc2lvbiA9IHZlcnNpb247XG4gICAgZXZlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gXCJZb3UgYXJlIHJ1bm5pbmcgRXZlIFwiICsgdmVyc2lvbjtcbiAgICB9O1xuICAgICh0eXBlb2YgbW9kdWxlICE9IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlLmV4cG9ydHMpID8gKG1vZHVsZS5leHBvcnRzID0gZXZlKSA6ICh0eXBlb2YgZGVmaW5lICE9IFwidW5kZWZpbmVkXCIgPyAoZGVmaW5lKFwiZXZlXCIsIFtdLCBmdW5jdGlvbigpIHsgcmV0dXJuIGV2ZTsgfSkpIDogKGdsb2IuZXZlID0gZXZlKSk7XG59KSh0aGlzKTtcbiIsIi8vIFNuYXAuc3ZnIDAuMi4wXG4vLyBcbi8vIENvcHlyaWdodCAoYykgMjAxMyBBZG9iZSBTeXN0ZW1zIEluY29ycG9yYXRlZC4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIFxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8gXG4vLyBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vIFxuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbi8vIFxuLy8gYnVpbGQ6IDIwMTQtMDItMDhcbi8vIENvcHlyaWdodCAoYykgMjAxMyBBZG9iZSBTeXN0ZW1zIEluY29ycG9yYXRlZC4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIFxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8gXG4vLyBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vIFxuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbi8vIOKUjOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUkCBcXFxcXG4vLyDilIIgRXZlIDAuNC4yIC0gSmF2YVNjcmlwdCBFdmVudHMgTGlicmFyeSAgICAgICAgICAgICAgICAgICAgICDilIIgXFxcXFxuLy8g4pSc4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSkIFxcXFxcbi8vIOKUgiBBdXRob3IgRG1pdHJ5IEJhcmFub3Zza2l5IChodHRwOi8vZG1pdHJ5LmJhcmFub3Zza2l5LmNvbS8pIOKUgiBcXFxcXG4vLyDilJTilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilJggXFxcXFxuXG4oZnVuY3Rpb24gKGdsb2IpIHtcbiAgICB2YXIgdmVyc2lvbiA9IFwiMC40LjJcIixcbiAgICAgICAgaGFzID0gXCJoYXNPd25Qcm9wZXJ0eVwiLFxuICAgICAgICBzZXBhcmF0b3IgPSAvW1xcLlxcL10vLFxuICAgICAgICB3aWxkY2FyZCA9IFwiKlwiLFxuICAgICAgICBmdW4gPSBmdW5jdGlvbiAoKSB7fSxcbiAgICAgICAgbnVtc29ydCA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICByZXR1cm4gYSAtIGI7XG4gICAgICAgIH0sXG4gICAgICAgIGN1cnJlbnRfZXZlbnQsXG4gICAgICAgIHN0b3AsXG4gICAgICAgIGV2ZW50cyA9IHtuOiB7fX0sXG4gICAgLypcXFxuICAgICAqIGV2ZVxuICAgICBbIG1ldGhvZCBdXG5cbiAgICAgKiBGaXJlcyBldmVudCB3aXRoIGdpdmVuIGBuYW1lYCwgZ2l2ZW4gc2NvcGUgYW5kIG90aGVyIHBhcmFtZXRlcnMuXG5cbiAgICAgPiBBcmd1bWVudHNcblxuICAgICAtIG5hbWUgKHN0cmluZykgbmFtZSBvZiB0aGUgKmV2ZW50KiwgZG90IChgLmApIG9yIHNsYXNoIChgL2ApIHNlcGFyYXRlZFxuICAgICAtIHNjb3BlIChvYmplY3QpIGNvbnRleHQgZm9yIHRoZSBldmVudCBoYW5kbGVyc1xuICAgICAtIHZhcmFyZ3MgKC4uLikgdGhlIHJlc3Qgb2YgYXJndW1lbnRzIHdpbGwgYmUgc2VudCB0byBldmVudCBoYW5kbGVyc1xuXG4gICAgID0gKG9iamVjdCkgYXJyYXkgb2YgcmV0dXJuZWQgdmFsdWVzIGZyb20gdGhlIGxpc3RlbmVyc1xuICAgIFxcKi9cbiAgICAgICAgZXZlID0gZnVuY3Rpb24gKG5hbWUsIHNjb3BlKSB7XG5cdFx0XHRuYW1lID0gU3RyaW5nKG5hbWUpO1xuICAgICAgICAgICAgdmFyIGUgPSBldmVudHMsXG4gICAgICAgICAgICAgICAgb2xkc3RvcCA9IHN0b3AsXG4gICAgICAgICAgICAgICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMiksXG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzID0gZXZlLmxpc3RlbmVycyhuYW1lKSxcbiAgICAgICAgICAgICAgICB6ID0gMCxcbiAgICAgICAgICAgICAgICBmID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgbCxcbiAgICAgICAgICAgICAgICBpbmRleGVkID0gW10sXG4gICAgICAgICAgICAgICAgcXVldWUgPSB7fSxcbiAgICAgICAgICAgICAgICBvdXQgPSBbXSxcbiAgICAgICAgICAgICAgICBjZSA9IGN1cnJlbnRfZXZlbnQsXG4gICAgICAgICAgICAgICAgZXJyb3JzID0gW107XG4gICAgICAgICAgICBjdXJyZW50X2V2ZW50ID0gbmFtZTtcbiAgICAgICAgICAgIHN0b3AgPSAwO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gbGlzdGVuZXJzLmxlbmd0aDsgaSA8IGlpOyBpKyspIGlmIChcInpJbmRleFwiIGluIGxpc3RlbmVyc1tpXSkge1xuICAgICAgICAgICAgICAgIGluZGV4ZWQucHVzaChsaXN0ZW5lcnNbaV0uekluZGV4KTtcbiAgICAgICAgICAgICAgICBpZiAobGlzdGVuZXJzW2ldLnpJbmRleCA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcXVldWVbbGlzdGVuZXJzW2ldLnpJbmRleF0gPSBsaXN0ZW5lcnNbaV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW5kZXhlZC5zb3J0KG51bXNvcnQpO1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4ZWRbel0gPCAwKSB7XG4gICAgICAgICAgICAgICAgbCA9IHF1ZXVlW2luZGV4ZWRbeisrXV07XG4gICAgICAgICAgICAgICAgb3V0LnB1c2gobC5hcHBseShzY29wZSwgYXJncykpO1xuICAgICAgICAgICAgICAgIGlmIChzdG9wKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b3AgPSBvbGRzdG9wO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3V0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbCA9IGxpc3RlbmVyc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAoXCJ6SW5kZXhcIiBpbiBsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsLnpJbmRleCA9PSBpbmRleGVkW3pdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQucHVzaChsLmFwcGx5KHNjb3BlLCBhcmdzKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHorKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsID0gcXVldWVbaW5kZXhlZFt6XV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbCAmJiBvdXQucHVzaChsLmFwcGx5KHNjb3BlLCBhcmdzKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0b3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSB3aGlsZSAobClcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXVlW2wuekluZGV4XSA9IGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXQucHVzaChsLmFwcGx5KHNjb3BlLCBhcmdzKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdG9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0b3AgPSBvbGRzdG9wO1xuICAgICAgICAgICAgY3VycmVudF9ldmVudCA9IGNlO1xuICAgICAgICAgICAgcmV0dXJuIG91dC5sZW5ndGggPyBvdXQgOiBudWxsO1xuICAgICAgICB9O1xuXHRcdC8vIFVuZG9jdW1lbnRlZC4gRGVidWcgb25seS5cblx0XHRldmUuX2V2ZW50cyA9IGV2ZW50cztcbiAgICAvKlxcXG4gICAgICogZXZlLmxpc3RlbmVyc1xuICAgICBbIG1ldGhvZCBdXG5cbiAgICAgKiBJbnRlcm5hbCBtZXRob2Qgd2hpY2ggZ2l2ZXMgeW91IGFycmF5IG9mIGFsbCBldmVudCBoYW5kbGVycyB0aGF0IHdpbGwgYmUgdHJpZ2dlcmVkIGJ5IHRoZSBnaXZlbiBgbmFtZWAuXG5cbiAgICAgPiBBcmd1bWVudHNcblxuICAgICAtIG5hbWUgKHN0cmluZykgbmFtZSBvZiB0aGUgZXZlbnQsIGRvdCAoYC5gKSBvciBzbGFzaCAoYC9gKSBzZXBhcmF0ZWRcblxuICAgICA9IChhcnJheSkgYXJyYXkgb2YgZXZlbnQgaGFuZGxlcnNcbiAgICBcXCovXG4gICAgZXZlLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHZhciBuYW1lcyA9IG5hbWUuc3BsaXQoc2VwYXJhdG9yKSxcbiAgICAgICAgICAgIGUgPSBldmVudHMsXG4gICAgICAgICAgICBpdGVtLFxuICAgICAgICAgICAgaXRlbXMsXG4gICAgICAgICAgICBrLFxuICAgICAgICAgICAgaSxcbiAgICAgICAgICAgIGlpLFxuICAgICAgICAgICAgaixcbiAgICAgICAgICAgIGpqLFxuICAgICAgICAgICAgbmVzLFxuICAgICAgICAgICAgZXMgPSBbZV0sXG4gICAgICAgICAgICBvdXQgPSBbXTtcbiAgICAgICAgZm9yIChpID0gMCwgaWkgPSBuYW1lcy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICBuZXMgPSBbXTtcbiAgICAgICAgICAgIGZvciAoaiA9IDAsIGpqID0gZXMubGVuZ3RoOyBqIDwgamo7IGorKykge1xuICAgICAgICAgICAgICAgIGUgPSBlc1tqXS5uO1xuICAgICAgICAgICAgICAgIGl0ZW1zID0gW2VbbmFtZXNbaV1dLCBlW3dpbGRjYXJkXV07XG4gICAgICAgICAgICAgICAgayA9IDI7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGstLSkge1xuICAgICAgICAgICAgICAgICAgICBpdGVtID0gaXRlbXNba107XG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXMucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dCA9IG91dC5jb25jYXQoaXRlbS5mIHx8IFtdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVzID0gbmVzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfTtcbiAgICBcbiAgICAvKlxcXG4gICAgICogZXZlLm9uXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBCaW5kcyBnaXZlbiBldmVudCBoYW5kbGVyIHdpdGggYSBnaXZlbiBuYW1lLiBZb3UgY2FuIHVzZSB3aWxkY2FyZHMg4oCcYCpg4oCdIGZvciB0aGUgbmFtZXM6XG4gICAgIHwgZXZlLm9uKFwiKi51bmRlci4qXCIsIGYpO1xuICAgICB8IGV2ZShcIm1vdXNlLnVuZGVyLmZsb29yXCIpOyAvLyB0cmlnZ2VycyBmXG4gICAgICogVXNlIEBldmUgdG8gdHJpZ2dlciB0aGUgbGlzdGVuZXIuXG4gICAgICoqXG4gICAgID4gQXJndW1lbnRzXG4gICAgICoqXG4gICAgIC0gbmFtZSAoc3RyaW5nKSBuYW1lIG9mIHRoZSBldmVudCwgZG90IChgLmApIG9yIHNsYXNoIChgL2ApIHNlcGFyYXRlZCwgd2l0aCBvcHRpb25hbCB3aWxkY2FyZHNcbiAgICAgLSBmIChmdW5jdGlvbikgZXZlbnQgaGFuZGxlciBmdW5jdGlvblxuICAgICAqKlxuICAgICA9IChmdW5jdGlvbikgcmV0dXJuZWQgZnVuY3Rpb24gYWNjZXB0cyBhIHNpbmdsZSBudW1lcmljIHBhcmFtZXRlciB0aGF0IHJlcHJlc2VudHMgei1pbmRleCBvZiB0aGUgaGFuZGxlci4gSXQgaXMgYW4gb3B0aW9uYWwgZmVhdHVyZSBhbmQgb25seSB1c2VkIHdoZW4geW91IG5lZWQgdG8gZW5zdXJlIHRoYXQgc29tZSBzdWJzZXQgb2YgaGFuZGxlcnMgd2lsbCBiZSBpbnZva2VkIGluIGEgZ2l2ZW4gb3JkZXIsIGRlc3BpdGUgb2YgdGhlIG9yZGVyIG9mIGFzc2lnbm1lbnQuIFxuICAgICA+IEV4YW1wbGU6XG4gICAgIHwgZXZlLm9uKFwibW91c2VcIiwgZWF0SXQpKDIpO1xuICAgICB8IGV2ZS5vbihcIm1vdXNlXCIsIHNjcmVhbSk7XG4gICAgIHwgZXZlLm9uKFwibW91c2VcIiwgY2F0Y2hJdCkoMSk7XG4gICAgICogVGhpcyB3aWxsIGVuc3VyZSB0aGF0IGBjYXRjaEl0KClgIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIGJlZm9yZSBgZWF0SXQoKWAuXG5cdCAqXG4gICAgICogSWYgeW91IHdhbnQgdG8gcHV0IHlvdXIgaGFuZGxlciBiZWZvcmUgbm9uLWluZGV4ZWQgaGFuZGxlcnMsIHNwZWNpZnkgYSBuZWdhdGl2ZSB2YWx1ZS5cbiAgICAgKiBOb3RlOiBJIGFzc3VtZSBtb3N0IG9mIHRoZSB0aW1lIHlvdSBkb27igJl0IG5lZWQgdG8gd29ycnkgYWJvdXQgei1pbmRleCwgYnV0IGl04oCZcyBuaWNlIHRvIGhhdmUgdGhpcyBmZWF0dXJlIOKAnGp1c3QgaW4gY2FzZeKAnS5cbiAgICBcXCovXG4gICAgZXZlLm9uID0gZnVuY3Rpb24gKG5hbWUsIGYpIHtcblx0XHRuYW1lID0gU3RyaW5nKG5hbWUpO1xuXHRcdGlmICh0eXBlb2YgZiAhPSBcImZ1bmN0aW9uXCIpIHtcblx0XHRcdHJldHVybiBmdW5jdGlvbiAoKSB7fTtcblx0XHR9XG4gICAgICAgIHZhciBuYW1lcyA9IG5hbWUuc3BsaXQoc2VwYXJhdG9yKSxcbiAgICAgICAgICAgIGUgPSBldmVudHM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IG5hbWVzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIGUgPSBlLm47XG4gICAgICAgICAgICBlID0gZS5oYXNPd25Qcm9wZXJ0eShuYW1lc1tpXSkgJiYgZVtuYW1lc1tpXV0gfHwgKGVbbmFtZXNbaV1dID0ge246IHt9fSk7XG4gICAgICAgIH1cbiAgICAgICAgZS5mID0gZS5mIHx8IFtdO1xuICAgICAgICBmb3IgKGkgPSAwLCBpaSA9IGUuZi5sZW5ndGg7IGkgPCBpaTsgaSsrKSBpZiAoZS5mW2ldID09IGYpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW47XG4gICAgICAgIH1cbiAgICAgICAgZS5mLnB1c2goZik7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoekluZGV4KSB7XG4gICAgICAgICAgICBpZiAoK3pJbmRleCA9PSArekluZGV4KSB7XG4gICAgICAgICAgICAgICAgZi56SW5kZXggPSArekluZGV4O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIGV2ZS5mXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZXR1cm5zIGZ1bmN0aW9uIHRoYXQgd2lsbCBmaXJlIGdpdmVuIGV2ZW50IHdpdGggb3B0aW9uYWwgYXJndW1lbnRzLlxuXHQgKiBBcmd1bWVudHMgdGhhdCB3aWxsIGJlIHBhc3NlZCB0byB0aGUgcmVzdWx0IGZ1bmN0aW9uIHdpbGwgYmUgYWxzb1xuXHQgKiBjb25jYXRlZCB0byB0aGUgbGlzdCBvZiBmaW5hbCBhcmd1bWVudHMuXG4gXHQgfCBlbC5vbmNsaWNrID0gZXZlLmYoXCJjbGlja1wiLCAxLCAyKTtcbiBcdCB8IGV2ZS5vbihcImNsaWNrXCIsIGZ1bmN0aW9uIChhLCBiLCBjKSB7XG4gXHQgfCAgICAgY29uc29sZS5sb2coYSwgYiwgYyk7IC8vIDEsIDIsIFtldmVudCBvYmplY3RdXG4gXHQgfCB9KTtcbiAgICAgPiBBcmd1bWVudHNcblx0IC0gZXZlbnQgKHN0cmluZykgZXZlbnQgbmFtZVxuXHQgLSB2YXJhcmdzICjigKYpIGFuZCBhbnkgb3RoZXIgYXJndW1lbnRzXG5cdCA9IChmdW5jdGlvbikgcG9zc2libGUgZXZlbnQgaGFuZGxlciBmdW5jdGlvblxuICAgIFxcKi9cblx0ZXZlLmYgPSBmdW5jdGlvbiAoZXZlbnQpIHtcblx0XHR2YXIgYXR0cnMgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uICgpIHtcblx0XHRcdGV2ZS5hcHBseShudWxsLCBbZXZlbnQsIG51bGxdLmNvbmNhdChhdHRycykuY29uY2F0KFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSkpO1xuXHRcdH07XG5cdH07XG4gICAgLypcXFxuICAgICAqIGV2ZS5zdG9wXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBJcyB1c2VkIGluc2lkZSBhbiBldmVudCBoYW5kbGVyIHRvIHN0b3AgdGhlIGV2ZW50LCBwcmV2ZW50aW5nIGFueSBzdWJzZXF1ZW50IGxpc3RlbmVycyBmcm9tIGZpcmluZy5cbiAgICBcXCovXG4gICAgZXZlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHN0b3AgPSAxO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIGV2ZS5udFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQ291bGQgYmUgdXNlZCBpbnNpZGUgZXZlbnQgaGFuZGxlciB0byBmaWd1cmUgb3V0IGFjdHVhbCBuYW1lIG9mIHRoZSBldmVudC5cbiAgICAgKipcbiAgICAgPiBBcmd1bWVudHNcbiAgICAgKipcbiAgICAgLSBzdWJuYW1lIChzdHJpbmcpICNvcHRpb25hbCBzdWJuYW1lIG9mIHRoZSBldmVudFxuICAgICAqKlxuICAgICA9IChzdHJpbmcpIG5hbWUgb2YgdGhlIGV2ZW50LCBpZiBgc3VibmFtZWAgaXMgbm90IHNwZWNpZmllZFxuICAgICAqIG9yXG4gICAgID0gKGJvb2xlYW4pIGB0cnVlYCwgaWYgY3VycmVudCBldmVudOKAmXMgbmFtZSBjb250YWlucyBgc3VibmFtZWBcbiAgICBcXCovXG4gICAgZXZlLm50ID0gZnVuY3Rpb24gKHN1Ym5hbWUpIHtcbiAgICAgICAgaWYgKHN1Ym5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUmVnRXhwKFwiKD86XFxcXC58XFxcXC98XilcIiArIHN1Ym5hbWUgKyBcIig/OlxcXFwufFxcXFwvfCQpXCIpLnRlc3QoY3VycmVudF9ldmVudCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGN1cnJlbnRfZXZlbnQ7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogZXZlLm50c1xuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQ291bGQgYmUgdXNlZCBpbnNpZGUgZXZlbnQgaGFuZGxlciB0byBmaWd1cmUgb3V0IGFjdHVhbCBuYW1lIG9mIHRoZSBldmVudC5cbiAgICAgKipcbiAgICAgKipcbiAgICAgPSAoYXJyYXkpIG5hbWVzIG9mIHRoZSBldmVudFxuICAgIFxcKi9cbiAgICBldmUubnRzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gY3VycmVudF9ldmVudC5zcGxpdChzZXBhcmF0b3IpO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIGV2ZS5vZmZcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJlbW92ZXMgZ2l2ZW4gZnVuY3Rpb24gZnJvbSB0aGUgbGlzdCBvZiBldmVudCBsaXN0ZW5lcnMgYXNzaWduZWQgdG8gZ2l2ZW4gbmFtZS5cblx0ICogSWYgbm8gYXJndW1lbnRzIHNwZWNpZmllZCBhbGwgdGhlIGV2ZW50cyB3aWxsIGJlIGNsZWFyZWQuXG4gICAgICoqXG4gICAgID4gQXJndW1lbnRzXG4gICAgICoqXG4gICAgIC0gbmFtZSAoc3RyaW5nKSBuYW1lIG9mIHRoZSBldmVudCwgZG90IChgLmApIG9yIHNsYXNoIChgL2ApIHNlcGFyYXRlZCwgd2l0aCBvcHRpb25hbCB3aWxkY2FyZHNcbiAgICAgLSBmIChmdW5jdGlvbikgZXZlbnQgaGFuZGxlciBmdW5jdGlvblxuICAgIFxcKi9cbiAgICAvKlxcXG4gICAgICogZXZlLnVuYmluZFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogU2VlIEBldmUub2ZmXG4gICAgXFwqL1xuICAgIGV2ZS5vZmYgPSBldmUudW5iaW5kID0gZnVuY3Rpb24gKG5hbWUsIGYpIHtcblx0XHRpZiAoIW5hbWUpIHtcblx0XHQgICAgZXZlLl9ldmVudHMgPSBldmVudHMgPSB7bjoge319O1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cbiAgICAgICAgdmFyIG5hbWVzID0gbmFtZS5zcGxpdChzZXBhcmF0b3IpLFxuICAgICAgICAgICAgZSxcbiAgICAgICAgICAgIGtleSxcbiAgICAgICAgICAgIHNwbGljZSxcbiAgICAgICAgICAgIGksIGlpLCBqLCBqaixcbiAgICAgICAgICAgIGN1ciA9IFtldmVudHNdO1xuICAgICAgICBmb3IgKGkgPSAwLCBpaSA9IG5hbWVzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBjdXIubGVuZ3RoOyBqICs9IHNwbGljZS5sZW5ndGggLSAyKSB7XG4gICAgICAgICAgICAgICAgc3BsaWNlID0gW2osIDFdO1xuICAgICAgICAgICAgICAgIGUgPSBjdXJbal0ubjtcbiAgICAgICAgICAgICAgICBpZiAobmFtZXNbaV0gIT0gd2lsZGNhcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVbbmFtZXNbaV1dKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcGxpY2UucHVzaChlW25hbWVzW2ldXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGtleSBpbiBlKSBpZiAoZVtoYXNdKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwbGljZS5wdXNoKGVba2V5XSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3VyLnNwbGljZS5hcHBseShjdXIsIHNwbGljZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMCwgaWkgPSBjdXIubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgZSA9IGN1cltpXTtcbiAgICAgICAgICAgIHdoaWxlIChlLm4pIHtcbiAgICAgICAgICAgICAgICBpZiAoZikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZS5mKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAwLCBqaiA9IGUuZi5sZW5ndGg7IGogPCBqajsgaisrKSBpZiAoZS5mW2pdID09IGYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLmYuc3BsaWNlKGosIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgIWUuZi5sZW5ndGggJiYgZGVsZXRlIGUuZjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmb3IgKGtleSBpbiBlLm4pIGlmIChlLm5baGFzXShrZXkpICYmIGUubltrZXldLmYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmdW5jcyA9IGUubltrZXldLmY7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAwLCBqaiA9IGZ1bmNzLmxlbmd0aDsgaiA8IGpqOyBqKyspIGlmIChmdW5jc1tqXSA9PSBmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Muc3BsaWNlKGosIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgIWZ1bmNzLmxlbmd0aCAmJiBkZWxldGUgZS5uW2tleV0uZjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBlLmY7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoa2V5IGluIGUubikgaWYgKGUubltoYXNdKGtleSkgJiYgZS5uW2tleV0uZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGUubltrZXldLmY7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZSA9IGUubjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgLypcXFxuICAgICAqIGV2ZS5vbmNlXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBCaW5kcyBnaXZlbiBldmVudCBoYW5kbGVyIHdpdGggYSBnaXZlbiBuYW1lIHRvIG9ubHkgcnVuIG9uY2UgdGhlbiB1bmJpbmQgaXRzZWxmLlxuICAgICB8IGV2ZS5vbmNlKFwibG9naW5cIiwgZik7XG4gICAgIHwgZXZlKFwibG9naW5cIik7IC8vIHRyaWdnZXJzIGZcbiAgICAgfCBldmUoXCJsb2dpblwiKTsgLy8gbm8gbGlzdGVuZXJzXG4gICAgICogVXNlIEBldmUgdG8gdHJpZ2dlciB0aGUgbGlzdGVuZXIuXG4gICAgICoqXG4gICAgID4gQXJndW1lbnRzXG4gICAgICoqXG4gICAgIC0gbmFtZSAoc3RyaW5nKSBuYW1lIG9mIHRoZSBldmVudCwgZG90IChgLmApIG9yIHNsYXNoIChgL2ApIHNlcGFyYXRlZCwgd2l0aCBvcHRpb25hbCB3aWxkY2FyZHNcbiAgICAgLSBmIChmdW5jdGlvbikgZXZlbnQgaGFuZGxlciBmdW5jdGlvblxuICAgICAqKlxuICAgICA9IChmdW5jdGlvbikgc2FtZSByZXR1cm4gZnVuY3Rpb24gYXMgQGV2ZS5vblxuICAgIFxcKi9cbiAgICBldmUub25jZSA9IGZ1bmN0aW9uIChuYW1lLCBmKSB7XG4gICAgICAgIHZhciBmMiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGV2ZS51bmJpbmQobmFtZSwgZjIpO1xuICAgICAgICAgICAgcmV0dXJuIGYuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGV2ZS5vbihuYW1lLCBmMik7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogZXZlLnZlcnNpb25cbiAgICAgWyBwcm9wZXJ0eSAoc3RyaW5nKSBdXG4gICAgICoqXG4gICAgICogQ3VycmVudCB2ZXJzaW9uIG9mIHRoZSBsaWJyYXJ5LlxuICAgIFxcKi9cbiAgICBldmUudmVyc2lvbiA9IHZlcnNpb247XG4gICAgZXZlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gXCJZb3UgYXJlIHJ1bm5pbmcgRXZlIFwiICsgdmVyc2lvbjtcbiAgICB9O1xuICAgICh0eXBlb2YgbW9kdWxlICE9IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlLmV4cG9ydHMpID8gKG1vZHVsZS5leHBvcnRzID0gZXZlKSA6ICh0eXBlb2YgZGVmaW5lICE9IFwidW5kZWZpbmVkXCIgPyAoZGVmaW5lKFwiZXZlXCIsIFtdLCBmdW5jdGlvbigpIHsgcmV0dXJuIGV2ZTsgfSkpIDogKGdsb2IuZXZlID0gZXZlKSk7XG59KSh0aGlzKTtcblxuKGZ1bmN0aW9uIChnbG9iLCBmYWN0b3J5KSB7XG4gICAgLy8gQU1EIHN1cHBvcnRcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgLy8gRGVmaW5lIGFzIGFuIGFub255bW91cyBtb2R1bGVcbiAgICAgICAgZGVmaW5lKFtcImV2ZVwiXSwgZnVuY3Rpb24oIGV2ZSApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWN0b3J5KGdsb2IsIGV2ZSk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vIE5leHQgZm9yIE5vZGUuanMgb3IgQ29tbW9uSlNcbiAgICAgICAgdmFyIGV2ZSA9IHJlcXVpcmUoJ2V2ZScpO1xuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGZhY3RvcnkoZ2xvYiwgZXZlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBCcm93c2VyIGdsb2JhbHMgKGdsb2IgaXMgd2luZG93KVxuICAgICAgICAvLyBTbmFwIGFkZHMgaXRzZWxmIHRvIHdpbmRvd1xuICAgICAgICBmYWN0b3J5KGdsb2IsIGdsb2IuZXZlKTtcbiAgICB9XG59KHdpbmRvdyB8fCB0aGlzLCBmdW5jdGlvbiAod2luZG93LCBldmUpIHtcblxuLy8gQ29weXJpZ2h0IChjKSAyMDEzIEFkb2JlIFN5c3RlbXMgSW5jb3Jwb3JhdGVkLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLyBcbi8vIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8gXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxudmFyIG1pbmEgPSAoZnVuY3Rpb24gKGV2ZSkge1xuICAgIHZhciBhbmltYXRpb25zID0ge30sXG4gICAgcmVxdWVzdEFuaW1GcmFtZSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgICAgICAgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICB3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lICAgIHx8XG4gICAgICAgICAgICAgICAgICAgICAgIHdpbmRvdy5vUmVxdWVzdEFuaW1hdGlvbkZyYW1lICAgICAgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgd2luZG93Lm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lICAgICB8fFxuICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoY2FsbGJhY2ssIDE2KTtcbiAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbiAoYSkge1xuICAgICAgICByZXR1cm4gYSBpbnN0YW5jZW9mIEFycmF5IHx8XG4gICAgICAgICAgICBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoYSkgPT0gXCJbb2JqZWN0IEFycmF5XVwiO1xuICAgIH0sXG4gICAgaWRnZW4gPSAwLFxuICAgIGlkcHJlZml4ID0gXCJNXCIgKyAoK25ldyBEYXRlKS50b1N0cmluZygzNiksXG4gICAgSUQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBpZHByZWZpeCArIChpZGdlbisrKS50b1N0cmluZygzNik7XG4gICAgfSxcbiAgICBkaWZmID0gZnVuY3Rpb24gKGEsIGIsIEEsIEIpIHtcbiAgICAgICAgaWYgKGlzQXJyYXkoYSkpIHtcbiAgICAgICAgICAgIHJlcyA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gYS5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcmVzW2ldID0gZGlmZihhW2ldLCBiLCBBW2ldLCBCKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGRpZiA9IChBIC0gYSkgLyAoQiAtIGIpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGJiKSB7XG4gICAgICAgICAgICByZXR1cm4gYSArIGRpZiAqIChiYiAtIGIpO1xuICAgICAgICB9O1xuICAgIH0sXG4gICAgdGltZXIgPSBEYXRlLm5vdyB8fCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiArbmV3IERhdGU7XG4gICAgfSxcbiAgICBzdGEgPSBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgIHZhciBhID0gdGhpcztcbiAgICAgICAgaWYgKHZhbCA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gYS5zO1xuICAgICAgICB9XG4gICAgICAgIHZhciBkcyA9IGEucyAtIHZhbDtcbiAgICAgICAgYS5iICs9IGEuZHVyICogZHM7XG4gICAgICAgIGEuQiArPSBhLmR1ciAqIGRzO1xuICAgICAgICBhLnMgPSB2YWw7XG4gICAgfSxcbiAgICBzcGVlZCA9IGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgdmFyIGEgPSB0aGlzO1xuICAgICAgICBpZiAodmFsID09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBhLnNwZDtcbiAgICAgICAgfVxuICAgICAgICBhLnNwZCA9IHZhbDtcbiAgICB9LFxuICAgIGR1cmF0aW9uID0gZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICB2YXIgYSA9IHRoaXM7XG4gICAgICAgIGlmICh2YWwgPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIGEuZHVyO1xuICAgICAgICB9XG4gICAgICAgIGEucyA9IGEucyAqIHZhbCAvIGEuZHVyO1xuICAgICAgICBhLmR1ciA9IHZhbDtcbiAgICB9LFxuICAgIHN0b3BpdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGEgPSB0aGlzO1xuICAgICAgICBkZWxldGUgYW5pbWF0aW9uc1thLmlkXTtcbiAgICAgICAgZXZlKFwibWluYS5zdG9wLlwiICsgYS5pZCwgYSk7XG4gICAgfSxcbiAgICBwYXVzZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGEgPSB0aGlzO1xuICAgICAgICBpZiAoYS5wZGlmKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIGFuaW1hdGlvbnNbYS5pZF07XG4gICAgICAgIGEucGRpZiA9IGEuZ2V0KCkgLSBhLmI7XG4gICAgfSxcbiAgICByZXN1bWUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBhID0gdGhpcztcbiAgICAgICAgaWYgKCFhLnBkaWYpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBhLmIgPSBhLmdldCgpIC0gYS5wZGlmO1xuICAgICAgICBkZWxldGUgYS5wZGlmO1xuICAgICAgICBhbmltYXRpb25zW2EuaWRdID0gYTtcbiAgICB9LFxuICAgIGZyYW1lID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgbGVuID0gMDtcbiAgICAgICAgZm9yICh2YXIgaSBpbiBhbmltYXRpb25zKSBpZiAoYW5pbWF0aW9ucy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICAgICAgdmFyIGEgPSBhbmltYXRpb25zW2ldLFxuICAgICAgICAgICAgICAgIGIgPSBhLmdldCgpLFxuICAgICAgICAgICAgICAgIHJlcztcbiAgICAgICAgICAgIGxlbisrO1xuICAgICAgICAgICAgYS5zID0gKGIgLSBhLmIpIC8gKGEuZHVyIC8gYS5zcGQpO1xuICAgICAgICAgICAgaWYgKGEucyA+PSAxKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGFuaW1hdGlvbnNbaV07XG4gICAgICAgICAgICAgICAgYS5zID0gMTtcbiAgICAgICAgICAgICAgICBsZW4tLTtcbiAgICAgICAgICAgICAgICAoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBldmUoXCJtaW5hLmZpbmlzaC5cIiArIGEuaWQsIGEpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KGEpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc0FycmF5KGEuc3RhcnQpKSB7XG4gICAgICAgICAgICAgICAgcmVzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDAsIGpqID0gYS5zdGFydC5sZW5ndGg7IGogPCBqajsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc1tqXSA9ICthLnN0YXJ0W2pdICtcbiAgICAgICAgICAgICAgICAgICAgICAgIChhLmVuZFtqXSAtIGEuc3RhcnRbal0pICogYS5lYXNpbmcoYS5zKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlcyA9ICthLnN0YXJ0ICsgKGEuZW5kIC0gYS5zdGFydCkgKiBhLmVhc2luZyhhLnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYS5zZXQocmVzKTtcbiAgICAgICAgfVxuICAgICAgICBsZW4gJiYgcmVxdWVzdEFuaW1GcmFtZShmcmFtZSk7XG4gICAgfSxcbiAgICAvLyBTSUVSUkEgVW5mYW1pbGlhciB3aXRoIHRoZSB3b3JkIF9zbGF2ZV8gaW4gdGhpcyBjb250ZXh0LiBBbHNvLCBJIGRvbid0IGtub3cgd2hhdCBfZ2VyZWFsXyBtZWFucy4gRG8geW91IG1lYW4gX2dlbmVyYWxfP1xuICAgIC8qXFxcbiAgICAgKiBtaW5hXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBHZW5lcmljIGFuaW1hdGlvbiBvZiBudW1iZXJzXG4gICAgICoqXG4gICAgIC0gYSAobnVtYmVyKSBzdGFydCBfc2xhdmVfIG51bWJlclxuICAgICAtIEEgKG51bWJlcikgZW5kIF9zbGF2ZV8gbnVtYmVyXG4gICAgIC0gYiAobnVtYmVyKSBzdGFydCBfbWFzdGVyXyBudW1iZXIgKHN0YXJ0IHRpbWUgaW4gZ2VuZXJhbCBjYXNlKVxuICAgICAtIEIgKG51bWJlcikgZW5kIF9tYXN0ZXJfIG51bWJlciAoZW5kIHRpbWUgaW4gZ2VyZWFsIGNhc2UpXG4gICAgIC0gZ2V0IChmdW5jdGlvbikgZ2V0dGVyIG9mIF9tYXN0ZXJfIG51bWJlciAoc2VlIEBtaW5hLnRpbWUpXG4gICAgIC0gc2V0IChmdW5jdGlvbikgc2V0dGVyIG9mIF9zbGF2ZV8gbnVtYmVyXG4gICAgIC0gZWFzaW5nIChmdW5jdGlvbikgI29wdGlvbmFsIGVhc2luZyBmdW5jdGlvbiwgZGVmYXVsdCBpcyBAbWluYS5saW5lYXJcbiAgICAgPSAob2JqZWN0KSBhbmltYXRpb24gZGVzY3JpcHRvclxuICAgICBvIHtcbiAgICAgbyAgICAgICAgIGlkIChzdHJpbmcpIGFuaW1hdGlvbiBpZCxcbiAgICAgbyAgICAgICAgIHN0YXJ0IChudW1iZXIpIHN0YXJ0IF9zbGF2ZV8gbnVtYmVyLFxuICAgICBvICAgICAgICAgZW5kIChudW1iZXIpIGVuZCBfc2xhdmVfIG51bWJlcixcbiAgICAgbyAgICAgICAgIGIgKG51bWJlcikgc3RhcnQgX21hc3Rlcl8gbnVtYmVyLFxuICAgICBvICAgICAgICAgcyAobnVtYmVyKSBhbmltYXRpb24gc3RhdHVzICgwLi4xKSxcbiAgICAgbyAgICAgICAgIGR1ciAobnVtYmVyKSBhbmltYXRpb24gZHVyYXRpb24sXG4gICAgIG8gICAgICAgICBzcGQgKG51bWJlcikgYW5pbWF0aW9uIHNwZWVkLFxuICAgICBvICAgICAgICAgZ2V0IChmdW5jdGlvbikgZ2V0dGVyIG9mIF9tYXN0ZXJfIG51bWJlciAoc2VlIEBtaW5hLnRpbWUpLFxuICAgICBvICAgICAgICAgc2V0IChmdW5jdGlvbikgc2V0dGVyIG9mIF9zbGF2ZV8gbnVtYmVyLFxuICAgICBvICAgICAgICAgZWFzaW5nIChmdW5jdGlvbikgZWFzaW5nIGZ1bmN0aW9uLCBkZWZhdWx0IGlzIEBtaW5hLmxpbmVhcixcbiAgICAgbyAgICAgICAgIHN0YXR1cyAoZnVuY3Rpb24pIHN0YXR1cyBnZXR0ZXIvc2V0dGVyLFxuICAgICBvICAgICAgICAgc3BlZWQgKGZ1bmN0aW9uKSBzcGVlZCBnZXR0ZXIvc2V0dGVyLFxuICAgICBvICAgICAgICAgZHVyYXRpb24gKGZ1bmN0aW9uKSBkdXJhdGlvbiBnZXR0ZXIvc2V0dGVyLFxuICAgICBvICAgICAgICAgc3RvcCAoZnVuY3Rpb24pIGFuaW1hdGlvbiBzdG9wcGVyXG4gICAgIG8gfVxuICAgIFxcKi9cbiAgICBtaW5hID0gZnVuY3Rpb24gKGEsIEEsIGIsIEIsIGdldCwgc2V0LCBlYXNpbmcpIHtcbiAgICAgICAgdmFyIGFuaW0gPSB7XG4gICAgICAgICAgICBpZDogSUQoKSxcbiAgICAgICAgICAgIHN0YXJ0OiBhLFxuICAgICAgICAgICAgZW5kOiBBLFxuICAgICAgICAgICAgYjogYixcbiAgICAgICAgICAgIHM6IDAsXG4gICAgICAgICAgICBkdXI6IEIgLSBiLFxuICAgICAgICAgICAgc3BkOiAxLFxuICAgICAgICAgICAgZ2V0OiBnZXQsXG4gICAgICAgICAgICBzZXQ6IHNldCxcbiAgICAgICAgICAgIGVhc2luZzogZWFzaW5nIHx8IG1pbmEubGluZWFyLFxuICAgICAgICAgICAgc3RhdHVzOiBzdGEsXG4gICAgICAgICAgICBzcGVlZDogc3BlZWQsXG4gICAgICAgICAgICBkdXJhdGlvbjogZHVyYXRpb24sXG4gICAgICAgICAgICBzdG9wOiBzdG9waXQsXG4gICAgICAgICAgICBwYXVzZTogcGF1c2UsXG4gICAgICAgICAgICByZXN1bWU6IHJlc3VtZVxuICAgICAgICB9O1xuICAgICAgICBhbmltYXRpb25zW2FuaW0uaWRdID0gYW5pbTtcbiAgICAgICAgdmFyIGxlbiA9IDAsIGk7XG4gICAgICAgIGZvciAoaSBpbiBhbmltYXRpb25zKSBpZiAoYW5pbWF0aW9ucy5oYXNPd25Qcm9wZXJ0eShpKSkge1xuICAgICAgICAgICAgbGVuKys7XG4gICAgICAgICAgICBpZiAobGVuID09IDIpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsZW4gPT0gMSAmJiByZXF1ZXN0QW5pbUZyYW1lKGZyYW1lKTtcbiAgICAgICAgcmV0dXJuIGFuaW07XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogbWluYS50aW1lXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjdXJyZW50IHRpbWUuIEVxdWl2YWxlbnQgdG86XG4gICAgIHwgZnVuY3Rpb24gKCkge1xuICAgICB8ICAgICByZXR1cm4gKG5ldyBEYXRlKS5nZXRUaW1lKCk7XG4gICAgIHwgfVxuICAgIFxcKi9cbiAgICBtaW5hLnRpbWUgPSB0aW1lcjtcbiAgICAvKlxcXG4gICAgICogbWluYS5nZXRCeUlkXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZXR1cm5zIGFuIGFuaW1hdGlvbiBieSBpdHMgaWRcbiAgICAgLSBpZCAoc3RyaW5nKSBhbmltYXRpb24ncyBpZFxuICAgICA9IChvYmplY3QpIFNlZSBAbWluYVxuICAgIFxcKi9cbiAgICBtaW5hLmdldEJ5SWQgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgcmV0dXJuIGFuaW1hdGlvbnNbaWRdIHx8IG51bGw7XG4gICAgfTtcblxuICAgIC8qXFxcbiAgICAgKiBtaW5hLmxpbmVhclxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogRGVmYXVsdCBsaW5lYXIgZWFzaW5nXG4gICAgIC0gbiAobnVtYmVyKSBpbnB1dCAwLi4xXG4gICAgID0gKG51bWJlcikgb3V0cHV0IDAuLjFcbiAgICBcXCovXG4gICAgbWluYS5saW5lYXIgPSBmdW5jdGlvbiAobikge1xuICAgICAgICByZXR1cm4gbjtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBtaW5hLmVhc2VvdXRcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIEVhc2VvdXQgZWFzaW5nXG4gICAgIC0gbiAobnVtYmVyKSBpbnB1dCAwLi4xXG4gICAgID0gKG51bWJlcikgb3V0cHV0IDAuLjFcbiAgICBcXCovXG4gICAgbWluYS5lYXNlb3V0ID0gZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgcmV0dXJuIE1hdGgucG93KG4sIDEuNyk7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogbWluYS5lYXNlaW5cbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIEVhc2VpbiBlYXNpbmdcbiAgICAgLSBuIChudW1iZXIpIGlucHV0IDAuLjFcbiAgICAgPSAobnVtYmVyKSBvdXRwdXQgMC4uMVxuICAgIFxcKi9cbiAgICBtaW5hLmVhc2VpbiA9IGZ1bmN0aW9uIChuKSB7XG4gICAgICAgIHJldHVybiBNYXRoLnBvdyhuLCAuNDgpO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIG1pbmEuZWFzZWlub3V0XG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBFYXNlaW5vdXQgZWFzaW5nXG4gICAgIC0gbiAobnVtYmVyKSBpbnB1dCAwLi4xXG4gICAgID0gKG51bWJlcikgb3V0cHV0IDAuLjFcbiAgICBcXCovXG4gICAgbWluYS5lYXNlaW5vdXQgPSBmdW5jdGlvbiAobikge1xuICAgICAgICBpZiAobiA9PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobiA9PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcSA9IC40OCAtIG4gLyAxLjA0LFxuICAgICAgICAgICAgUSA9IE1hdGguc3FydCguMTczNCArIHEgKiBxKSxcbiAgICAgICAgICAgIHggPSBRIC0gcSxcbiAgICAgICAgICAgIFggPSBNYXRoLnBvdyhNYXRoLmFicyh4KSwgMSAvIDMpICogKHggPCAwID8gLTEgOiAxKSxcbiAgICAgICAgICAgIHkgPSAtUSAtIHEsXG4gICAgICAgICAgICBZID0gTWF0aC5wb3coTWF0aC5hYnMoeSksIDEgLyAzKSAqICh5IDwgMCA/IC0xIDogMSksXG4gICAgICAgICAgICB0ID0gWCArIFkgKyAuNTtcbiAgICAgICAgcmV0dXJuICgxIC0gdCkgKiAzICogdCAqIHQgKyB0ICogdCAqIHQ7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogbWluYS5iYWNraW5cbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIEJhY2tpbiBlYXNpbmdcbiAgICAgLSBuIChudW1iZXIpIGlucHV0IDAuLjFcbiAgICAgPSAobnVtYmVyKSBvdXRwdXQgMC4uMVxuICAgIFxcKi9cbiAgICBtaW5hLmJhY2tpbiA9IGZ1bmN0aW9uIChuKSB7XG4gICAgICAgIGlmIChuID09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzID0gMS43MDE1ODtcbiAgICAgICAgcmV0dXJuIG4gKiBuICogKChzICsgMSkgKiBuIC0gcyk7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogbWluYS5iYWNrb3V0XG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBCYWNrb3V0IGVhc2luZ1xuICAgICAtIG4gKG51bWJlcikgaW5wdXQgMC4uMVxuICAgICA9IChudW1iZXIpIG91dHB1dCAwLi4xXG4gICAgXFwqL1xuICAgIG1pbmEuYmFja291dCA9IGZ1bmN0aW9uIChuKSB7XG4gICAgICAgIGlmIChuID09IDApIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICAgIG4gPSBuIC0gMTtcbiAgICAgICAgdmFyIHMgPSAxLjcwMTU4O1xuICAgICAgICByZXR1cm4gbiAqIG4gKiAoKHMgKyAxKSAqIG4gKyBzKSArIDE7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogbWluYS5lbGFzdGljXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBFbGFzdGljIGVhc2luZ1xuICAgICAtIG4gKG51bWJlcikgaW5wdXQgMC4uMVxuICAgICA9IChudW1iZXIpIG91dHB1dCAwLi4xXG4gICAgXFwqL1xuICAgIG1pbmEuZWxhc3RpYyA9IGZ1bmN0aW9uIChuKSB7XG4gICAgICAgIGlmIChuID09ICEhbikge1xuICAgICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE1hdGgucG93KDIsIC0xMCAqIG4pICogTWF0aC5zaW4oKG4gLSAuMDc1KSAqXG4gICAgICAgICAgICAoMiAqIE1hdGguUEkpIC8gLjMpICsgMTtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBtaW5hLmJvdW5jZVxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQm91bmNlIGVhc2luZ1xuICAgICAtIG4gKG51bWJlcikgaW5wdXQgMC4uMVxuICAgICA9IChudW1iZXIpIG91dHB1dCAwLi4xXG4gICAgXFwqL1xuICAgIG1pbmEuYm91bmNlID0gZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgdmFyIHMgPSA3LjU2MjUsXG4gICAgICAgICAgICBwID0gMi43NSxcbiAgICAgICAgICAgIGw7XG4gICAgICAgIGlmIChuIDwgKDEgLyBwKSkge1xuICAgICAgICAgICAgbCA9IHMgKiBuICogbjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChuIDwgKDIgLyBwKSkge1xuICAgICAgICAgICAgICAgIG4gLT0gKDEuNSAvIHApO1xuICAgICAgICAgICAgICAgIGwgPSBzICogbiAqIG4gKyAuNzU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChuIDwgKDIuNSAvIHApKSB7XG4gICAgICAgICAgICAgICAgICAgIG4gLT0gKDIuMjUgLyBwKTtcbiAgICAgICAgICAgICAgICAgICAgbCA9IHMgKiBuICogbiArIC45Mzc1O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG4gLT0gKDIuNjI1IC8gcCk7XG4gICAgICAgICAgICAgICAgICAgIGwgPSBzICogbiAqIG4gKyAuOTg0Mzc1O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbDtcbiAgICB9O1xuICAgIHdpbmRvdy5taW5hID0gbWluYTtcbiAgICByZXR1cm4gbWluYTtcbn0pKHR5cGVvZiBldmUgPT0gXCJ1bmRlZmluZWRcIiA/IGZ1bmN0aW9uICgpIHt9IDogZXZlKTtcbi8vIENvcHlyaWdodCAoYykgMjAxMyBBZG9iZSBTeXN0ZW1zIEluY29ycG9yYXRlZC4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIFxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8gXG4vLyBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vIFxuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxudmFyIFNuYXAgPSAoZnVuY3Rpb24ocm9vdCkge1xuU25hcC52ZXJzaW9uID0gXCIwLjIuMFwiO1xuLypcXFxuICogU25hcFxuIFsgbWV0aG9kIF1cbiAqKlxuICogQ3JlYXRlcyBhIGRyYXdpbmcgc3VyZmFjZSBvciB3cmFwcyBleGlzdGluZyBTVkcgZWxlbWVudC5cbiAqKlxuIC0gd2lkdGggKG51bWJlcnxzdHJpbmcpIHdpZHRoIG9mIHN1cmZhY2VcbiAtIGhlaWdodCAobnVtYmVyfHN0cmluZykgaGVpZ2h0IG9mIHN1cmZhY2VcbiAqIG9yXG4gLSBET00gKFNWR0VsZW1lbnQpIGVsZW1lbnQgdG8gYmUgd3JhcHBlZCBpbnRvIFNuYXAgc3RydWN0dXJlXG4gKiBvclxuIC0gcXVlcnkgKHN0cmluZykgQ1NTIHF1ZXJ5IHNlbGVjdG9yXG4gPSAob2JqZWN0KSBARWxlbWVudFxuXFwqL1xuZnVuY3Rpb24gU25hcCh3LCBoKSB7XG4gICAgaWYgKHcpIHtcbiAgICAgICAgaWYgKHcudGFnTmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIHdyYXAodyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHcgaW5zdGFuY2VvZiBFbGVtZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gdztcbiAgICAgICAgfVxuICAgICAgICBpZiAoaCA9PSBudWxsKSB7XG4gICAgICAgICAgICB3ID0gZ2xvYi5kb2MucXVlcnlTZWxlY3Rvcih3KTtcbiAgICAgICAgICAgIHJldHVybiB3cmFwKHcpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHcgPSB3ID09IG51bGwgPyBcIjEwMCVcIiA6IHc7XG4gICAgaCA9IGggPT0gbnVsbCA/IFwiMTAwJVwiIDogaDtcbiAgICByZXR1cm4gbmV3IFBhcGVyKHcsIGgpO1xufVxuU25hcC50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gXCJTbmFwIHZcIiArIHRoaXMudmVyc2lvbjtcbn07XG5TbmFwLl8gPSB7fTtcbnZhciBnbG9iID0ge1xuICAgIHdpbjogcm9vdC53aW5kb3csXG4gICAgZG9jOiByb290LndpbmRvdy5kb2N1bWVudFxufTtcblNuYXAuXy5nbG9iID0gZ2xvYjtcbnZhciBoYXMgPSBcImhhc093blByb3BlcnR5XCIsXG4gICAgU3RyID0gU3RyaW5nLFxuICAgIHRvRmxvYXQgPSBwYXJzZUZsb2F0LFxuICAgIHRvSW50ID0gcGFyc2VJbnQsXG4gICAgbWF0aCA9IE1hdGgsXG4gICAgbW1heCA9IG1hdGgubWF4LFxuICAgIG1taW4gPSBtYXRoLm1pbixcbiAgICBhYnMgPSBtYXRoLmFicyxcbiAgICBwb3cgPSBtYXRoLnBvdyxcbiAgICBQSSA9IG1hdGguUEksXG4gICAgcm91bmQgPSBtYXRoLnJvdW5kLFxuICAgIEUgPSBcIlwiLFxuICAgIFMgPSBcIiBcIixcbiAgICBvYmplY3RUb1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG4gICAgSVNVUkwgPSAvXnVybFxcKFsnXCJdPyhbXlxcKV0rPylbJ1wiXT9cXCkkL2ksXG4gICAgY29sb3VyUmVnRXhwID0gL15cXHMqKCgjW2EtZlxcZF17Nn0pfCgjW2EtZlxcZF17M30pfHJnYmE/XFwoXFxzKihbXFxkXFwuXSslP1xccyosXFxzKltcXGRcXC5dKyU/XFxzKixcXHMqW1xcZFxcLl0rJT8oPzpcXHMqLFxccypbXFxkXFwuXSslPyk/KVxccypcXCl8aHNiYT9cXChcXHMqKFtcXGRcXC5dKyg/OmRlZ3xcXHhiMHwlKT9cXHMqLFxccypbXFxkXFwuXSslP1xccyosXFxzKltcXGRcXC5dKyg/OiU/XFxzKixcXHMqW1xcZFxcLl0rKT8lPylcXHMqXFwpfGhzbGE/XFwoXFxzKihbXFxkXFwuXSsoPzpkZWd8XFx4YjB8JSk/XFxzKixcXHMqW1xcZFxcLl0rJT9cXHMqLFxccypbXFxkXFwuXSsoPzolP1xccyosXFxzKltcXGRcXC5dKyk/JT8pXFxzKlxcKSlcXHMqJC9pLFxuICAgIGJlemllcnJnID0gL14oPzpjdWJpYy0pP2JlemllclxcKChbXixdKyksKFteLF0rKSwoW14sXSspLChbXlxcKV0rKVxcKS8sXG4gICAgcmVVUkxWYWx1ZSA9IC9edXJsXFwoIz8oW14pXSspXFwpJC8sXG4gICAgc3BhY2VzID0gXCJcXHgwOVxceDBhXFx4MGJcXHgwY1xceDBkXFx4MjBcXHhhMFxcdTE2ODBcXHUxODBlXFx1MjAwMFxcdTIwMDFcXHUyMDAyXFx1MjAwM1xcdTIwMDRcXHUyMDA1XFx1MjAwNlxcdTIwMDdcXHUyMDA4XFx1MjAwOVxcdTIwMGFcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHUyMDI4XFx1MjAyOVwiLFxuICAgIHNlcGFyYXRvciA9IG5ldyBSZWdFeHAoXCJbLFwiICsgc3BhY2VzICsgXCJdK1wiKSxcbiAgICB3aGl0ZXNwYWNlID0gbmV3IFJlZ0V4cChcIltcIiArIHNwYWNlcyArIFwiXVwiLCBcImdcIiksXG4gICAgY29tbWFTcGFjZXMgPSBuZXcgUmVnRXhwKFwiW1wiICsgc3BhY2VzICsgXCJdKixbXCIgKyBzcGFjZXMgKyBcIl0qXCIpLFxuICAgIGhzcmcgPSB7aHM6IDEsIHJnOiAxfSxcbiAgICBwYXRoQ29tbWFuZCA9IG5ldyBSZWdFeHAoXCIoW2Etel0pW1wiICsgc3BhY2VzICsgXCIsXSooKC0/XFxcXGQqXFxcXC4/XFxcXGQqKD86ZVtcXFxcLStdP1xcXFxkKyk/W1wiICsgc3BhY2VzICsgXCJdKiw/W1wiICsgc3BhY2VzICsgXCJdKikrKVwiLCBcImlnXCIpLFxuICAgIHRDb21tYW5kID0gbmV3IFJlZ0V4cChcIihbcnN0bV0pW1wiICsgc3BhY2VzICsgXCIsXSooKC0/XFxcXGQqXFxcXC4/XFxcXGQqKD86ZVtcXFxcLStdP1xcXFxkKyk/W1wiICsgc3BhY2VzICsgXCJdKiw/W1wiICsgc3BhY2VzICsgXCJdKikrKVwiLCBcImlnXCIpLFxuICAgIHBhdGhWYWx1ZXMgPSBuZXcgUmVnRXhwKFwiKC0/XFxcXGQqXFxcXC4/XFxcXGQqKD86ZVtcXFxcLStdP1xcXFxkKyk/KVtcIiArIHNwYWNlcyArIFwiXSosP1tcIiArIHNwYWNlcyArIFwiXSpcIiwgXCJpZ1wiKSxcbiAgICBpZGdlbiA9IDAsXG4gICAgaWRwcmVmaXggPSBcIlNcIiArICgrbmV3IERhdGUpLnRvU3RyaW5nKDM2KSxcbiAgICBJRCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGlkcHJlZml4ICsgKGlkZ2VuKyspLnRvU3RyaW5nKDM2KTtcbiAgICB9LFxuICAgIHhsaW5rID0gXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIsXG4gICAgeG1sbnMgPSBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsXG4gICAgaHViID0ge30sXG4gICAgVVJMID0gU25hcC51cmwgPSBmdW5jdGlvbiAodXJsKSB7XG4gICAgICAgIHJldHVybiBcInVybCgnI1wiICsgdXJsICsgXCInKVwiO1xuICAgIH07XG5cbmZ1bmN0aW9uICQoZWwsIGF0dHIpIHtcbiAgICBpZiAoYXR0cikge1xuICAgICAgICBpZiAodHlwZW9mIGVsID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGVsID0gJChlbCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBhdHRyID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGlmIChhdHRyLnN1YnN0cmluZygwLCA2KSA9PSBcInhsaW5rOlwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsLmdldEF0dHJpYnV0ZU5TKHhsaW5rLCBhdHRyLnN1YnN0cmluZyg2KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYXR0ci5zdWJzdHJpbmcoMCwgNCkgPT0gXCJ4bWw6XCIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWwuZ2V0QXR0cmlidXRlTlMoeG1sbnMsIGF0dHIuc3Vic3RyaW5nKDQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBlbC5nZXRBdHRyaWJ1dGUoYXR0cik7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIga2V5IGluIGF0dHIpIGlmIChhdHRyW2hhc10oa2V5KSkge1xuICAgICAgICAgICAgdmFyIHZhbCA9IFN0cihhdHRyW2tleV0pO1xuICAgICAgICAgICAgaWYgKHZhbCkge1xuICAgICAgICAgICAgICAgIGlmIChrZXkuc3Vic3RyaW5nKDAsIDYpID09IFwieGxpbms6XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlTlMoeGxpbmssIGtleS5zdWJzdHJpbmcoNiksIHZhbCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChrZXkuc3Vic3RyaW5nKDAsIDQpID09IFwieG1sOlwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZU5TKHhtbG5zLCBrZXkuc3Vic3RyaW5nKDQpLCB2YWwpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZShrZXksIHZhbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlbC5yZW1vdmVBdHRyaWJ1dGUoa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGVsID0gZ2xvYi5kb2MuY3JlYXRlRWxlbWVudE5TKHhtbG5zLCBlbCk7XG4gICAgICAgIC8vIGVsLnN0eWxlICYmIChlbC5zdHlsZS53ZWJraXRUYXBIaWdobGlnaHRDb2xvciA9IFwicmdiYSgwLDAsMCwwKVwiKTtcbiAgICB9XG4gICAgcmV0dXJuIGVsO1xufVxuU25hcC5fLiQgPSAkO1xuU25hcC5fLmlkID0gSUQ7XG5mdW5jdGlvbiBnZXRBdHRycyhlbCkge1xuICAgIHZhciBhdHRycyA9IGVsLmF0dHJpYnV0ZXMsXG4gICAgICAgIG5hbWUsXG4gICAgICAgIG91dCA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXR0cnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGF0dHJzW2ldLm5hbWVzcGFjZVVSSSA9PSB4bGluaykge1xuICAgICAgICAgICAgbmFtZSA9IFwieGxpbms6XCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBuYW1lID0gXCJcIjtcbiAgICAgICAgfVxuICAgICAgICBuYW1lICs9IGF0dHJzW2ldLm5hbWU7XG4gICAgICAgIG91dFtuYW1lXSA9IGF0dHJzW2ldLnRleHRDb250ZW50O1xuICAgIH1cbiAgICByZXR1cm4gb3V0O1xufVxuZnVuY3Rpb24gaXMobywgdHlwZSkge1xuICAgIHR5cGUgPSBTdHIucHJvdG90eXBlLnRvTG93ZXJDYXNlLmNhbGwodHlwZSk7XG4gICAgaWYgKHR5cGUgPT0gXCJmaW5pdGVcIikge1xuICAgICAgICByZXR1cm4gaXNGaW5pdGUobyk7XG4gICAgfVxuICAgIGlmICh0eXBlID09IFwiYXJyYXlcIiAmJlxuICAgICAgICAobyBpbnN0YW5jZW9mIEFycmF5IHx8IEFycmF5LmlzQXJyYXkgJiYgQXJyYXkuaXNBcnJheShvKSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiAgKHR5cGUgPT0gXCJudWxsXCIgJiYgbyA9PT0gbnVsbCkgfHxcbiAgICAgICAgICAgICh0eXBlID09IHR5cGVvZiBvICYmIG8gIT09IG51bGwpIHx8XG4gICAgICAgICAgICAodHlwZSA9PSBcIm9iamVjdFwiICYmIG8gPT09IE9iamVjdChvKSkgfHxcbiAgICAgICAgICAgIG9iamVjdFRvU3RyaW5nLmNhbGwobykuc2xpY2UoOCwgLTEpLnRvTG93ZXJDYXNlKCkgPT0gdHlwZTtcbn1cbi8qXFxcbiAqIFNuYXAuZm9ybWF0XG4gWyBtZXRob2QgXVxuICoqXG4gKiBSZXBsYWNlcyBjb25zdHJ1Y3Rpb24gb2YgdHlwZSBgezxuYW1lPn1gIHRvIHRoZSBjb3JyZXNwb25kaW5nIGFyZ3VtZW50XG4gKipcbiAtIHRva2VuIChzdHJpbmcpIHN0cmluZyB0byBmb3JtYXRcbiAtIGpzb24gKG9iamVjdCkgb2JqZWN0IHdoaWNoIHByb3BlcnRpZXMgYXJlIHVzZWQgYXMgYSByZXBsYWNlbWVudFxuID0gKHN0cmluZykgZm9ybWF0dGVkIHN0cmluZ1xuID4gVXNhZ2VcbiB8IC8vIHRoaXMgZHJhd3MgYSByZWN0YW5ndWxhciBzaGFwZSBlcXVpdmFsZW50IHRvIFwiTTEwLDIwaDQwdjUwaC00MHpcIlxuIHwgcGFwZXIucGF0aChTbmFwLmZvcm1hdChcIk17eH0se3l9aHtkaW0ud2lkdGh9dntkaW0uaGVpZ2h0fWh7ZGltWyduZWdhdGl2ZSB3aWR0aCddfXpcIiwge1xuIHwgICAgIHg6IDEwLFxuIHwgICAgIHk6IDIwLFxuIHwgICAgIGRpbToge1xuIHwgICAgICAgICB3aWR0aDogNDAsXG4gfCAgICAgICAgIGhlaWdodDogNTAsXG4gfCAgICAgICAgIFwibmVnYXRpdmUgd2lkdGhcIjogLTQwXG4gfCAgICAgfVxuIHwgfSkpO1xuXFwqL1xuU25hcC5mb3JtYXQgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciB0b2tlblJlZ2V4ID0gL1xceyhbXlxcfV0rKVxcfS9nLFxuICAgICAgICBvYmpOb3RhdGlvblJlZ2V4ID0gLyg/Oig/Ol58XFwuKSguKz8pKD89XFxbfFxcLnwkfFxcKCl8XFxbKCd8XCIpKC4rPylcXDJcXF0pKFxcKFxcKSk/L2csIC8vIG1hdGNoZXMgLnh4eHh4IG9yIFtcInh4eHh4XCJdIHRvIHJ1biBvdmVyIG9iamVjdCBwcm9wZXJ0aWVzXG4gICAgICAgIHJlcGxhY2VyID0gZnVuY3Rpb24gKGFsbCwga2V5LCBvYmopIHtcbiAgICAgICAgICAgIHZhciByZXMgPSBvYmo7XG4gICAgICAgICAgICBrZXkucmVwbGFjZShvYmpOb3RhdGlvblJlZ2V4LCBmdW5jdGlvbiAoYWxsLCBuYW1lLCBxdW90ZSwgcXVvdGVkTmFtZSwgaXNGdW5jKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IG5hbWUgfHwgcXVvdGVkTmFtZTtcbiAgICAgICAgICAgICAgICBpZiAocmVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChuYW1lIGluIHJlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzID0gcmVzW25hbWVdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHR5cGVvZiByZXMgPT0gXCJmdW5jdGlvblwiICYmIGlzRnVuYyAmJiAocmVzID0gcmVzKCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmVzID0gKHJlcyA9PSBudWxsIHx8IHJlcyA9PSBvYmogPyBhbGwgOiByZXMpICsgXCJcIjtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH07XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChzdHIsIG9iaikge1xuICAgICAgICByZXR1cm4gU3RyKHN0cikucmVwbGFjZSh0b2tlblJlZ2V4LCBmdW5jdGlvbiAoYWxsLCBrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiByZXBsYWNlcihhbGwsIGtleSwgb2JqKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbn0pKCk7XG52YXIgcHJlbG9hZCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gb25lcnJvcigpIHtcbiAgICAgICAgdGhpcy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMpO1xuICAgIH1cbiAgICByZXR1cm4gZnVuY3Rpb24gKHNyYywgZikge1xuICAgICAgICB2YXIgaW1nID0gZ2xvYi5kb2MuY3JlYXRlRWxlbWVudChcImltZ1wiKSxcbiAgICAgICAgICAgIGJvZHkgPSBnbG9iLmRvYy5ib2R5O1xuICAgICAgICBpbWcuc3R5bGUuY3NzVGV4dCA9IFwicG9zaXRpb246YWJzb2x1dGU7bGVmdDotOTk5OWVtO3RvcDotOTk5OWVtXCI7XG4gICAgICAgIGltZy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmLmNhbGwoaW1nKTtcbiAgICAgICAgICAgIGltZy5vbmxvYWQgPSBpbWcub25lcnJvciA9IG51bGw7XG4gICAgICAgICAgICBib2R5LnJlbW92ZUNoaWxkKGltZyk7XG4gICAgICAgIH07XG4gICAgICAgIGltZy5vbmVycm9yID0gb25lcnJvcjtcbiAgICAgICAgYm9keS5hcHBlbmRDaGlsZChpbWcpO1xuICAgICAgICBpbWcuc3JjID0gc3JjO1xuICAgIH07XG59KCkpO1xuZnVuY3Rpb24gY2xvbmUob2JqKSB7XG4gICAgaWYgKHR5cGVvZiBvYmogPT0gXCJmdW5jdGlvblwiIHx8IE9iamVjdChvYmopICE9PSBvYmopIHtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG4gICAgdmFyIHJlcyA9IG5ldyBvYmouY29uc3RydWN0b3I7XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKG9ialtoYXNdKGtleSkpIHtcbiAgICAgICAgcmVzW2tleV0gPSBjbG9uZShvYmpba2V5XSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5TbmFwLl8uY2xvbmUgPSBjbG9uZTtcbmZ1bmN0aW9uIHJlcHVzaChhcnJheSwgaXRlbSkge1xuICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IGFycmF5Lmxlbmd0aDsgaSA8IGlpOyBpKyspIGlmIChhcnJheVtpXSA9PT0gaXRlbSkge1xuICAgICAgICByZXR1cm4gYXJyYXkucHVzaChhcnJheS5zcGxpY2UoaSwgMSlbMF0pO1xuICAgIH1cbn1cbmZ1bmN0aW9uIGNhY2hlcihmLCBzY29wZSwgcG9zdHByb2Nlc3Nvcikge1xuICAgIGZ1bmN0aW9uIG5ld2YoKSB7XG4gICAgICAgIHZhciBhcmcgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApLFxuICAgICAgICAgICAgYXJncyA9IGFyZy5qb2luKFwiXFx1MjQwMFwiKSxcbiAgICAgICAgICAgIGNhY2hlID0gbmV3Zi5jYWNoZSA9IG5ld2YuY2FjaGUgfHwge30sXG4gICAgICAgICAgICBjb3VudCA9IG5ld2YuY291bnQgPSBuZXdmLmNvdW50IHx8IFtdO1xuICAgICAgICBpZiAoY2FjaGVbaGFzXShhcmdzKSkge1xuICAgICAgICAgICAgcmVwdXNoKGNvdW50LCBhcmdzKTtcbiAgICAgICAgICAgIHJldHVybiBwb3N0cHJvY2Vzc29yID8gcG9zdHByb2Nlc3NvcihjYWNoZVthcmdzXSkgOiBjYWNoZVthcmdzXTtcbiAgICAgICAgfVxuICAgICAgICBjb3VudC5sZW5ndGggPj0gMWUzICYmIGRlbGV0ZSBjYWNoZVtjb3VudC5zaGlmdCgpXTtcbiAgICAgICAgY291bnQucHVzaChhcmdzKTtcbiAgICAgICAgY2FjaGVbYXJnc10gPSBmLmFwcGx5KHNjb3BlLCBhcmcpO1xuICAgICAgICByZXR1cm4gcG9zdHByb2Nlc3NvciA/IHBvc3Rwcm9jZXNzb3IoY2FjaGVbYXJnc10pIDogY2FjaGVbYXJnc107XG4gICAgfVxuICAgIHJldHVybiBuZXdmO1xufVxuU25hcC5fLmNhY2hlciA9IGNhY2hlcjtcbmZ1bmN0aW9uIGFuZ2xlKHgxLCB5MSwgeDIsIHkyLCB4MywgeTMpIHtcbiAgICBpZiAoeDMgPT0gbnVsbCkge1xuICAgICAgICB2YXIgeCA9IHgxIC0geDIsXG4gICAgICAgICAgICB5ID0geTEgLSB5MjtcbiAgICAgICAgaWYgKCF4ICYmICF5KSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gKDE4MCArIG1hdGguYXRhbjIoLXksIC14KSAqIDE4MCAvIFBJICsgMzYwKSAlIDM2MDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gYW5nbGUoeDEsIHkxLCB4MywgeTMpIC0gYW5nbGUoeDIsIHkyLCB4MywgeTMpO1xuICAgIH1cbn1cbmZ1bmN0aW9uIHJhZChkZWcpIHtcbiAgICByZXR1cm4gZGVnICUgMzYwICogUEkgLyAxODA7XG59XG5mdW5jdGlvbiBkZWcocmFkKSB7XG4gICAgcmV0dXJuIHJhZCAqIDE4MCAvIFBJICUgMzYwO1xufVxuZnVuY3Rpb24geF95KCkge1xuICAgIHJldHVybiB0aGlzLnggKyBTICsgdGhpcy55O1xufVxuZnVuY3Rpb24geF95X3dfaCgpIHtcbiAgICByZXR1cm4gdGhpcy54ICsgUyArIHRoaXMueSArIFMgKyB0aGlzLndpZHRoICsgXCIgXFx4ZDcgXCIgKyB0aGlzLmhlaWdodDtcbn1cblxuLypcXFxuICogU25hcC5yYWRcbiBbIG1ldGhvZCBdXG4gKipcbiAqIFRyYW5zZm9ybSBhbmdsZSB0byByYWRpYW5zXG4gLSBkZWcgKG51bWJlcikgYW5nbGUgaW4gZGVncmVlc1xuID0gKG51bWJlcikgYW5nbGUgaW4gcmFkaWFuc1xuXFwqL1xuU25hcC5yYWQgPSByYWQ7XG4vKlxcXG4gKiBTbmFwLmRlZ1xuIFsgbWV0aG9kIF1cbiAqKlxuICogVHJhbnNmb3JtIGFuZ2xlIHRvIGRlZ3JlZXNcbiAtIHJhZCAobnVtYmVyKSBhbmdsZSBpbiByYWRpYW5zXG4gPSAobnVtYmVyKSBhbmdsZSBpbiBkZWdyZWVzXG5cXCovXG5TbmFwLmRlZyA9IGRlZztcbi8vIFNJRVJSQSBmb3Igd2hpY2ggcG9pbnQgaXMgdGhlIGFuZ2xlIGNhbGN1bGF0ZWQ/XG4vKlxcXG4gKiBTbmFwLmFuZ2xlXG4gWyBtZXRob2QgXVxuICoqXG4gKiBSZXR1cm5zIGFuIGFuZ2xlIGJldHdlZW4gdHdvIG9yIHRocmVlIHBvaW50c1xuID4gUGFyYW1ldGVyc1xuIC0geDEgKG51bWJlcikgeCBjb29yZCBvZiBmaXJzdCBwb2ludFxuIC0geTEgKG51bWJlcikgeSBjb29yZCBvZiBmaXJzdCBwb2ludFxuIC0geDIgKG51bWJlcikgeCBjb29yZCBvZiBzZWNvbmQgcG9pbnRcbiAtIHkyIChudW1iZXIpIHkgY29vcmQgb2Ygc2Vjb25kIHBvaW50XG4gLSB4MyAobnVtYmVyKSAjb3B0aW9uYWwgeCBjb29yZCBvZiB0aGlyZCBwb2ludFxuIC0geTMgKG51bWJlcikgI29wdGlvbmFsIHkgY29vcmQgb2YgdGhpcmQgcG9pbnRcbiA9IChudW1iZXIpIGFuZ2xlIGluIGRlZ3JlZXNcblxcKi9cblNuYXAuYW5nbGUgPSBhbmdsZTtcbi8qXFxcbiAqIFNuYXAuaXNcbiBbIG1ldGhvZCBdXG4gKipcbiAqIEhhbmR5IHJlcGxhY2VtZW50IGZvciB0aGUgYHR5cGVvZmAgb3BlcmF0b3JcbiAtIG8gKOKApikgYW55IG9iamVjdCBvciBwcmltaXRpdmVcbiAtIHR5cGUgKHN0cmluZykgbmFtZSBvZiB0aGUgdHlwZSwgZS5nLiwgYHN0cmluZ2AsIGBmdW5jdGlvbmAsIGBudW1iZXJgLCBldGMuXG4gPSAoYm9vbGVhbikgYHRydWVgIGlmIGdpdmVuIHZhbHVlIGlzIG9mIGdpdmVuIHR5cGVcblxcKi9cblNuYXAuaXMgPSBpcztcbi8qXFxcbiAqIFNuYXAuc25hcFRvXG4gWyBtZXRob2QgXVxuICoqXG4gKiBTbmFwcyBnaXZlbiB2YWx1ZSB0byBnaXZlbiBncmlkXG4gLSB2YWx1ZXMgKGFycmF5fG51bWJlcikgZ2l2ZW4gYXJyYXkgb2YgdmFsdWVzIG9yIHN0ZXAgb2YgdGhlIGdyaWRcbiAtIHZhbHVlIChudW1iZXIpIHZhbHVlIHRvIGFkanVzdFxuIC0gdG9sZXJhbmNlIChudW1iZXIpICNvcHRpb25hbCBtYXhpbXVtIGRpc3RhbmNlIHRvIHRoZSB0YXJnZXQgdmFsdWUgdGhhdCB3b3VsZCB0cmlnZ2VyIHRoZSBzbmFwLiBEZWZhdWx0IGlzIGAxMGAuXG4gPSAobnVtYmVyKSBhZGp1c3RlZCB2YWx1ZVxuXFwqL1xuU25hcC5zbmFwVG8gPSBmdW5jdGlvbiAodmFsdWVzLCB2YWx1ZSwgdG9sZXJhbmNlKSB7XG4gICAgdG9sZXJhbmNlID0gaXModG9sZXJhbmNlLCBcImZpbml0ZVwiKSA/IHRvbGVyYW5jZSA6IDEwO1xuICAgIGlmIChpcyh2YWx1ZXMsIFwiYXJyYXlcIikpIHtcbiAgICAgICAgdmFyIGkgPSB2YWx1ZXMubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoaS0tKSBpZiAoYWJzKHZhbHVlc1tpXSAtIHZhbHVlKSA8PSB0b2xlcmFuY2UpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXNbaV07XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB2YWx1ZXMgPSArdmFsdWVzO1xuICAgICAgICB2YXIgcmVtID0gdmFsdWUgJSB2YWx1ZXM7XG4gICAgICAgIGlmIChyZW0gPCB0b2xlcmFuY2UpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZSAtIHJlbTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmVtID4gdmFsdWVzIC0gdG9sZXJhbmNlKSB7XG4gICAgICAgICAgICByZXR1cm4gdmFsdWUgLSByZW0gKyB2YWx1ZXM7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlO1xufTtcblxuLy8gTUFUUklYXG5mdW5jdGlvbiBNYXRyaXgoYSwgYiwgYywgZCwgZSwgZikge1xuICAgIGlmIChiID09IG51bGwgJiYgb2JqZWN0VG9TdHJpbmcuY2FsbChhKSA9PSBcIltvYmplY3QgU1ZHTWF0cml4XVwiKSB7XG4gICAgICAgIHRoaXMuYSA9IGEuYTtcbiAgICAgICAgdGhpcy5iID0gYS5iO1xuICAgICAgICB0aGlzLmMgPSBhLmM7XG4gICAgICAgIHRoaXMuZCA9IGEuZDtcbiAgICAgICAgdGhpcy5lID0gYS5lO1xuICAgICAgICB0aGlzLmYgPSBhLmY7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGEgIT0gbnVsbCkge1xuICAgICAgICB0aGlzLmEgPSArYTtcbiAgICAgICAgdGhpcy5iID0gK2I7XG4gICAgICAgIHRoaXMuYyA9ICtjO1xuICAgICAgICB0aGlzLmQgPSArZDtcbiAgICAgICAgdGhpcy5lID0gK2U7XG4gICAgICAgIHRoaXMuZiA9ICtmO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYSA9IDE7XG4gICAgICAgIHRoaXMuYiA9IDA7XG4gICAgICAgIHRoaXMuYyA9IDA7XG4gICAgICAgIHRoaXMuZCA9IDE7XG4gICAgICAgIHRoaXMuZSA9IDA7XG4gICAgICAgIHRoaXMuZiA9IDA7XG4gICAgfVxufVxuKGZ1bmN0aW9uIChtYXRyaXhwcm90bykge1xuICAgIC8qXFxcbiAgICAgKiBNYXRyaXguYWRkXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBBZGRzIHRoZSBnaXZlbiBtYXRyaXggdG8gZXhpc3Rpbmcgb25lXG4gICAgIC0gYSAobnVtYmVyKVxuICAgICAtIGIgKG51bWJlcilcbiAgICAgLSBjIChudW1iZXIpXG4gICAgIC0gZCAobnVtYmVyKVxuICAgICAtIGUgKG51bWJlcilcbiAgICAgLSBmIChudW1iZXIpXG4gICAgICogb3JcbiAgICAgLSBtYXRyaXggKG9iamVjdCkgQE1hdHJpeFxuICAgIFxcKi9cbiAgICBtYXRyaXhwcm90by5hZGQgPSBmdW5jdGlvbiAoYSwgYiwgYywgZCwgZSwgZikge1xuICAgICAgICB2YXIgb3V0ID0gW1tdLCBbXSwgW11dLFxuICAgICAgICAgICAgbSA9IFtbdGhpcy5hLCB0aGlzLmMsIHRoaXMuZV0sIFt0aGlzLmIsIHRoaXMuZCwgdGhpcy5mXSwgWzAsIDAsIDFdXSxcbiAgICAgICAgICAgIG1hdHJpeCA9IFtbYSwgYywgZV0sIFtiLCBkLCBmXSwgWzAsIDAsIDFdXSxcbiAgICAgICAgICAgIHgsIHksIHosIHJlcztcblxuICAgICAgICBpZiAoYSAmJiBhIGluc3RhbmNlb2YgTWF0cml4KSB7XG4gICAgICAgICAgICBtYXRyaXggPSBbW2EuYSwgYS5jLCBhLmVdLCBbYS5iLCBhLmQsIGEuZl0sIFswLCAwLCAxXV07XG4gICAgICAgIH1cblxuICAgICAgICBmb3IgKHggPSAwOyB4IDwgMzsgeCsrKSB7XG4gICAgICAgICAgICBmb3IgKHkgPSAwOyB5IDwgMzsgeSsrKSB7XG4gICAgICAgICAgICAgICAgcmVzID0gMDtcbiAgICAgICAgICAgICAgICBmb3IgKHogPSAwOyB6IDwgMzsgeisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcyArPSBtW3hdW3pdICogbWF0cml4W3pdW3ldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvdXRbeF1beV0gPSByZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hID0gb3V0WzBdWzBdO1xuICAgICAgICB0aGlzLmIgPSBvdXRbMV1bMF07XG4gICAgICAgIHRoaXMuYyA9IG91dFswXVsxXTtcbiAgICAgICAgdGhpcy5kID0gb3V0WzFdWzFdO1xuICAgICAgICB0aGlzLmUgPSBvdXRbMF1bMl07XG4gICAgICAgIHRoaXMuZiA9IG91dFsxXVsyXTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogTWF0cml4LmludmVydFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogUmV0dXJucyBhbiBpbnZlcnRlZCB2ZXJzaW9uIG9mIHRoZSBtYXRyaXhcbiAgICAgPSAob2JqZWN0KSBATWF0cml4XG4gICAgXFwqL1xuICAgIG1hdHJpeHByb3RvLmludmVydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG1lID0gdGhpcyxcbiAgICAgICAgICAgIHggPSBtZS5hICogbWUuZCAtIG1lLmIgKiBtZS5jO1xuICAgICAgICByZXR1cm4gbmV3IE1hdHJpeChtZS5kIC8geCwgLW1lLmIgLyB4LCAtbWUuYyAvIHgsIG1lLmEgLyB4LCAobWUuYyAqIG1lLmYgLSBtZS5kICogbWUuZSkgLyB4LCAobWUuYiAqIG1lLmUgLSBtZS5hICogbWUuZikgLyB4KTtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBNYXRyaXguY2xvbmVcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJldHVybnMgYSBjb3B5IG9mIHRoZSBtYXRyaXhcbiAgICAgPSAob2JqZWN0KSBATWF0cml4XG4gICAgXFwqL1xuICAgIG1hdHJpeHByb3RvLmNsb25lID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gbmV3IE1hdHJpeCh0aGlzLmEsIHRoaXMuYiwgdGhpcy5jLCB0aGlzLmQsIHRoaXMuZSwgdGhpcy5mKTtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBNYXRyaXgudHJhbnNsYXRlXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBUcmFuc2xhdGUgdGhlIG1hdHJpeFxuICAgICAtIHggKG51bWJlcikgaG9yaXpvbnRhbCBvZmZzZXQgZGlzdGFuY2VcbiAgICAgLSB5IChudW1iZXIpIHZlcnRpY2FsIG9mZnNldCBkaXN0YW5jZVxuICAgIFxcKi9cbiAgICBtYXRyaXhwcm90by50cmFuc2xhdGUgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICByZXR1cm4gdGhpcy5hZGQoMSwgMCwgMCwgMSwgeCwgeSk7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogTWF0cml4LnNjYWxlXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBTY2FsZXMgdGhlIG1hdHJpeFxuICAgICAtIHggKG51bWJlcikgYW1vdW50IHRvIGJlIHNjYWxlZCwgd2l0aCBgMWAgcmVzdWx0aW5nIGluIG5vIGNoYW5nZVxuICAgICAtIHkgKG51bWJlcikgI29wdGlvbmFsIGFtb3VudCB0byBzY2FsZSBhbG9uZyB0aGUgdmVydGljYWwgYXhpcy4gKE90aGVyd2lzZSBgeGAgYXBwbGllcyB0byBib3RoIGF4ZXMuKVxuICAgICAtIGN4IChudW1iZXIpICNvcHRpb25hbCBob3Jpem9udGFsIG9yaWdpbiBwb2ludCBmcm9tIHdoaWNoIHRvIHNjYWxlXG4gICAgIC0gY3kgKG51bWJlcikgI29wdGlvbmFsIHZlcnRpY2FsIG9yaWdpbiBwb2ludCBmcm9tIHdoaWNoIHRvIHNjYWxlXG4gICAgICogRGVmYXVsdCBjeCwgY3kgaXMgdGhlIG1pZGRsZSBwb2ludCBvZiB0aGUgZWxlbWVudC5cbiAgICBcXCovXG4gICAgbWF0cml4cHJvdG8uc2NhbGUgPSBmdW5jdGlvbiAoeCwgeSwgY3gsIGN5KSB7XG4gICAgICAgIHkgPT0gbnVsbCAmJiAoeSA9IHgpO1xuICAgICAgICAoY3ggfHwgY3kpICYmIHRoaXMuYWRkKDEsIDAsIDAsIDEsIGN4LCBjeSk7XG4gICAgICAgIHRoaXMuYWRkKHgsIDAsIDAsIHksIDAsIDApO1xuICAgICAgICAoY3ggfHwgY3kpICYmIHRoaXMuYWRkKDEsIDAsIDAsIDEsIC1jeCwgLWN5KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogTWF0cml4LnJvdGF0ZVxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogUm90YXRlcyB0aGUgbWF0cml4XG4gICAgIC0gYSAobnVtYmVyKSBhbmdsZSBvZiByb3RhdGlvbiwgaW4gZGVncmVlc1xuICAgICAtIHggKG51bWJlcikgaG9yaXpvbnRhbCBvcmlnaW4gcG9pbnQgZnJvbSB3aGljaCB0byByb3RhdGVcbiAgICAgLSB5IChudW1iZXIpIHZlcnRpY2FsIG9yaWdpbiBwb2ludCBmcm9tIHdoaWNoIHRvIHJvdGF0ZVxuICAgIFxcKi9cbiAgICBtYXRyaXhwcm90by5yb3RhdGUgPSBmdW5jdGlvbiAoYSwgeCwgeSkge1xuICAgICAgICBhID0gcmFkKGEpO1xuICAgICAgICB4ID0geCB8fCAwO1xuICAgICAgICB5ID0geSB8fCAwO1xuICAgICAgICB2YXIgY29zID0gK21hdGguY29zKGEpLnRvRml4ZWQoOSksXG4gICAgICAgICAgICBzaW4gPSArbWF0aC5zaW4oYSkudG9GaXhlZCg5KTtcbiAgICAgICAgdGhpcy5hZGQoY29zLCBzaW4sIC1zaW4sIGNvcywgeCwgeSk7XG4gICAgICAgIHJldHVybiB0aGlzLmFkZCgxLCAwLCAwLCAxLCAteCwgLXkpO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIE1hdHJpeC54XG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZXR1cm5zIHggY29vcmRpbmF0ZSBmb3IgZ2l2ZW4gcG9pbnQgYWZ0ZXIgdHJhbnNmb3JtYXRpb24gZGVzY3JpYmVkIGJ5IHRoZSBtYXRyaXguIFNlZSBhbHNvIEBNYXRyaXgueVxuICAgICAtIHggKG51bWJlcilcbiAgICAgLSB5IChudW1iZXIpXG4gICAgID0gKG51bWJlcikgeFxuICAgIFxcKi9cbiAgICBtYXRyaXhwcm90by54ID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIHggKiB0aGlzLmEgKyB5ICogdGhpcy5jICsgdGhpcy5lO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIE1hdHJpeC55XG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZXR1cm5zIHkgY29vcmRpbmF0ZSBmb3IgZ2l2ZW4gcG9pbnQgYWZ0ZXIgdHJhbnNmb3JtYXRpb24gZGVzY3JpYmVkIGJ5IHRoZSBtYXRyaXguIFNlZSBhbHNvIEBNYXRyaXgueFxuICAgICAtIHggKG51bWJlcilcbiAgICAgLSB5IChudW1iZXIpXG4gICAgID0gKG51bWJlcikgeVxuICAgIFxcKi9cbiAgICBtYXRyaXhwcm90by55ID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIHggKiB0aGlzLmIgKyB5ICogdGhpcy5kICsgdGhpcy5mO1xuICAgIH07XG4gICAgbWF0cml4cHJvdG8uZ2V0ID0gZnVuY3Rpb24gKGkpIHtcbiAgICAgICAgcmV0dXJuICt0aGlzW1N0ci5mcm9tQ2hhckNvZGUoOTcgKyBpKV0udG9GaXhlZCg0KTtcbiAgICB9O1xuICAgIG1hdHJpeHByb3RvLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gXCJtYXRyaXgoXCIgKyBbdGhpcy5nZXQoMCksIHRoaXMuZ2V0KDEpLCB0aGlzLmdldCgyKSwgdGhpcy5nZXQoMyksIHRoaXMuZ2V0KDQpLCB0aGlzLmdldCg1KV0uam9pbigpICsgXCIpXCI7XG4gICAgfTtcbiAgICBtYXRyaXhwcm90by5vZmZzZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBbdGhpcy5lLnRvRml4ZWQoNCksIHRoaXMuZi50b0ZpeGVkKDQpXTtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIG5vcm0oYSkge1xuICAgICAgICByZXR1cm4gYVswXSAqIGFbMF0gKyBhWzFdICogYVsxXTtcbiAgICB9XG4gICAgZnVuY3Rpb24gbm9ybWFsaXplKGEpIHtcbiAgICAgICAgdmFyIG1hZyA9IG1hdGguc3FydChub3JtKGEpKTtcbiAgICAgICAgYVswXSAmJiAoYVswXSAvPSBtYWcpO1xuICAgICAgICBhWzFdICYmIChhWzFdIC89IG1hZyk7XG4gICAgfVxuICAgIC8qXFxcbiAgICAgKiBNYXRyaXguc3BsaXRcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFNwbGl0cyBtYXRyaXggaW50byBwcmltaXRpdmUgdHJhbnNmb3JtYXRpb25zXG4gICAgID0gKG9iamVjdCkgaW4gZm9ybWF0OlxuICAgICBvIGR4IChudW1iZXIpIHRyYW5zbGF0aW9uIGJ5IHhcbiAgICAgbyBkeSAobnVtYmVyKSB0cmFuc2xhdGlvbiBieSB5XG4gICAgIG8gc2NhbGV4IChudW1iZXIpIHNjYWxlIGJ5IHhcbiAgICAgbyBzY2FsZXkgKG51bWJlcikgc2NhbGUgYnkgeVxuICAgICBvIHNoZWFyIChudW1iZXIpIHNoZWFyXG4gICAgIG8gcm90YXRlIChudW1iZXIpIHJvdGF0aW9uIGluIGRlZ1xuICAgICBvIGlzU2ltcGxlIChib29sZWFuKSBjb3VsZCBpdCBiZSByZXByZXNlbnRlZCB2aWEgc2ltcGxlIHRyYW5zZm9ybWF0aW9uc1xuICAgIFxcKi9cbiAgICBtYXRyaXhwcm90by5zcGxpdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIG91dCA9IHt9O1xuICAgICAgICAvLyB0cmFuc2xhdGlvblxuICAgICAgICBvdXQuZHggPSB0aGlzLmU7XG4gICAgICAgIG91dC5keSA9IHRoaXMuZjtcblxuICAgICAgICAvLyBzY2FsZSBhbmQgc2hlYXJcbiAgICAgICAgdmFyIHJvdyA9IFtbdGhpcy5hLCB0aGlzLmNdLCBbdGhpcy5iLCB0aGlzLmRdXTtcbiAgICAgICAgb3V0LnNjYWxleCA9IG1hdGguc3FydChub3JtKHJvd1swXSkpO1xuICAgICAgICBub3JtYWxpemUocm93WzBdKTtcblxuICAgICAgICBvdXQuc2hlYXIgPSByb3dbMF1bMF0gKiByb3dbMV1bMF0gKyByb3dbMF1bMV0gKiByb3dbMV1bMV07XG4gICAgICAgIHJvd1sxXSA9IFtyb3dbMV1bMF0gLSByb3dbMF1bMF0gKiBvdXQuc2hlYXIsIHJvd1sxXVsxXSAtIHJvd1swXVsxXSAqIG91dC5zaGVhcl07XG5cbiAgICAgICAgb3V0LnNjYWxleSA9IG1hdGguc3FydChub3JtKHJvd1sxXSkpO1xuICAgICAgICBub3JtYWxpemUocm93WzFdKTtcbiAgICAgICAgb3V0LnNoZWFyIC89IG91dC5zY2FsZXk7XG5cbiAgICAgICAgLy8gcm90YXRpb25cbiAgICAgICAgdmFyIHNpbiA9IC1yb3dbMF1bMV0sXG4gICAgICAgICAgICBjb3MgPSByb3dbMV1bMV07XG4gICAgICAgIGlmIChjb3MgPCAwKSB7XG4gICAgICAgICAgICBvdXQucm90YXRlID0gZGVnKG1hdGguYWNvcyhjb3MpKTtcbiAgICAgICAgICAgIGlmIChzaW4gPCAwKSB7XG4gICAgICAgICAgICAgICAgb3V0LnJvdGF0ZSA9IDM2MCAtIG91dC5yb3RhdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXQucm90YXRlID0gZGVnKG1hdGguYXNpbihzaW4pKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG91dC5pc1NpbXBsZSA9ICErb3V0LnNoZWFyLnRvRml4ZWQoOSkgJiYgKG91dC5zY2FsZXgudG9GaXhlZCg5KSA9PSBvdXQuc2NhbGV5LnRvRml4ZWQoOSkgfHwgIW91dC5yb3RhdGUpO1xuICAgICAgICBvdXQuaXNTdXBlclNpbXBsZSA9ICErb3V0LnNoZWFyLnRvRml4ZWQoOSkgJiYgb3V0LnNjYWxleC50b0ZpeGVkKDkpID09IG91dC5zY2FsZXkudG9GaXhlZCg5KSAmJiAhb3V0LnJvdGF0ZTtcbiAgICAgICAgb3V0Lm5vUm90YXRpb24gPSAhK291dC5zaGVhci50b0ZpeGVkKDkpICYmICFvdXQucm90YXRlO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIE1hdHJpeC50b1RyYW5zZm9ybVN0cmluZ1xuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogUmV0dXJucyB0cmFuc2Zvcm0gc3RyaW5nIHRoYXQgcmVwcmVzZW50cyBnaXZlbiBtYXRyaXhcbiAgICAgPSAoc3RyaW5nKSB0cmFuc2Zvcm0gc3RyaW5nXG4gICAgXFwqL1xuICAgIG1hdHJpeHByb3RvLnRvVHJhbnNmb3JtU3RyaW5nID0gZnVuY3Rpb24gKHNob3J0ZXIpIHtcbiAgICAgICAgdmFyIHMgPSBzaG9ydGVyIHx8IHRoaXMuc3BsaXQoKTtcbiAgICAgICAgaWYgKHMuaXNTaW1wbGUpIHtcbiAgICAgICAgICAgIHMuc2NhbGV4ID0gK3Muc2NhbGV4LnRvRml4ZWQoNCk7XG4gICAgICAgICAgICBzLnNjYWxleSA9ICtzLnNjYWxleS50b0ZpeGVkKDQpO1xuICAgICAgICAgICAgcy5yb3RhdGUgPSArcy5yb3RhdGUudG9GaXhlZCg0KTtcbiAgICAgICAgICAgIHJldHVybiAgKHMuZHggfHwgcy5keSA/IFwidFwiICsgWytzLmR4LnRvRml4ZWQoNCksICtzLmR5LnRvRml4ZWQoNCldIDogRSkgKyBcbiAgICAgICAgICAgICAgICAgICAgKHMuc2NhbGV4ICE9IDEgfHwgcy5zY2FsZXkgIT0gMSA/IFwic1wiICsgW3Muc2NhbGV4LCBzLnNjYWxleSwgMCwgMF0gOiBFKSArXG4gICAgICAgICAgICAgICAgICAgIChzLnJvdGF0ZSA/IFwiclwiICsgWytzLnJvdGF0ZS50b0ZpeGVkKDQpLCAwLCAwXSA6IEUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFwibVwiICsgW3RoaXMuZ2V0KDApLCB0aGlzLmdldCgxKSwgdGhpcy5nZXQoMiksIHRoaXMuZ2V0KDMpLCB0aGlzLmdldCg0KSwgdGhpcy5nZXQoNSldO1xuICAgICAgICB9XG4gICAgfTtcbn0pKE1hdHJpeC5wcm90b3R5cGUpO1xuLypcXFxuICogU25hcC5NYXRyaXhcbiBbIG1ldGhvZCBdXG4gKipcbiAqIFV0aWxpdHkgbWV0aG9kXG4gKipcbiAqIFJldHVybnMgYSBtYXRyaXggYmFzZWQgb24gdGhlIGdpdmVuIHBhcmFtZXRlcnNcbiAtIGEgKG51bWJlcilcbiAtIGIgKG51bWJlcilcbiAtIGMgKG51bWJlcilcbiAtIGQgKG51bWJlcilcbiAtIGUgKG51bWJlcilcbiAtIGYgKG51bWJlcilcbiAqIG9yXG4gLSBzdmdNYXRyaXggKFNWR01hdHJpeClcbiA9IChvYmplY3QpIEBNYXRyaXhcblxcKi9cblNuYXAuTWF0cml4ID0gTWF0cml4O1xuLy8gQ29sb3VyXG4vKlxcXG4gKiBTbmFwLmdldFJHQlxuIFsgbWV0aG9kIF1cbiAqKlxuICogUGFyc2VzIGNvbG9yIHN0cmluZyBhcyBSR0Igb2JqZWN0XG4gLSBjb2xvciAoc3RyaW5nKSBjb2xvciBzdHJpbmcgaW4gb25lIG9mIHRoZSBmb2xsb3dpbmcgZm9ybWF0czpcbiAjIDx1bD5cbiAjICAgICA8bGk+Q29sb3IgbmFtZSAoPGNvZGU+cmVkPC9jb2RlPiwgPGNvZGU+Z3JlZW48L2NvZGU+LCA8Y29kZT5jb3JuZmxvd2VyYmx1ZTwvY29kZT4sIGV0Yyk8L2xpPlxuICMgICAgIDxsaT4j4oCi4oCi4oCiIOKAlCBzaG9ydGVuZWQgSFRNTCBjb2xvcjogKDxjb2RlPiMwMDA8L2NvZGU+LCA8Y29kZT4jZmMwPC9jb2RlPiwgZXRjLik8L2xpPlxuICMgICAgIDxsaT4j4oCi4oCi4oCi4oCi4oCi4oCiIOKAlCBmdWxsIGxlbmd0aCBIVE1MIGNvbG9yOiAoPGNvZGU+IzAwMDAwMDwvY29kZT4sIDxjb2RlPiNiZDIzMDA8L2NvZGU+KTwvbGk+XG4gIyAgICAgPGxpPnJnYijigKLigKLigKIsIOKAouKAouKAoiwg4oCi4oCi4oCiKSDigJQgcmVkLCBncmVlbiBhbmQgYmx1ZSBjaGFubmVscyB2YWx1ZXM6ICg8Y29kZT5yZ2IoMjAwLCZuYnNwOzEwMCwmbmJzcDswKTwvY29kZT4pPC9saT5cbiAjICAgICA8bGk+cmdiYSjigKLigKLigKIsIOKAouKAouKAoiwg4oCi4oCi4oCiLCDigKLigKLigKIpIOKAlCBhbHNvIHdpdGggb3BhY2l0eTwvbGk+XG4gIyAgICAgPGxpPnJnYijigKLigKLigKIlLCDigKLigKLigKIlLCDigKLigKLigKIlKSDigJQgc2FtZSBhcyBhYm92ZSwgYnV0IGluICU6ICg8Y29kZT5yZ2IoMTAwJSwmbmJzcDsxNzUlLCZuYnNwOzAlKTwvY29kZT4pPC9saT5cbiAjICAgICA8bGk+cmdiYSjigKLigKLigKIlLCDigKLigKLigKIlLCDigKLigKLigKIlLCDigKLigKLigKIlKSDigJQgYWxzbyB3aXRoIG9wYWNpdHk8L2xpPlxuICMgICAgIDxsaT5oc2Io4oCi4oCi4oCiLCDigKLigKLigKIsIOKAouKAouKAoikg4oCUIGh1ZSwgc2F0dXJhdGlvbiBhbmQgYnJpZ2h0bmVzcyB2YWx1ZXM6ICg8Y29kZT5oc2IoMC41LCZuYnNwOzAuMjUsJm5ic3A7MSk8L2NvZGU+KTwvbGk+XG4gIyAgICAgPGxpPmhzYmEo4oCi4oCi4oCiLCDigKLigKLigKIsIOKAouKAouKAoiwg4oCi4oCi4oCiKSDigJQgYWxzbyB3aXRoIG9wYWNpdHk8L2xpPlxuICMgICAgIDxsaT5oc2Io4oCi4oCi4oCiJSwg4oCi4oCi4oCiJSwg4oCi4oCi4oCiJSkg4oCUIHNhbWUgYXMgYWJvdmUsIGJ1dCBpbiAlPC9saT5cbiAjICAgICA8bGk+aHNiYSjigKLigKLigKIlLCDigKLigKLigKIlLCDigKLigKLigKIlLCDigKLigKLigKIlKSDigJQgYWxzbyB3aXRoIG9wYWNpdHk8L2xpPlxuICMgICAgIDxsaT5oc2wo4oCi4oCi4oCiLCDigKLigKLigKIsIOKAouKAouKAoikg4oCUIGh1ZSwgc2F0dXJhdGlvbiBhbmQgbHVtaW5vc2l0eSB2YWx1ZXM6ICg8Y29kZT5oc2IoMC41LCZuYnNwOzAuMjUsJm5ic3A7MC41KTwvY29kZT4pPC9saT5cbiAjICAgICA8bGk+aHNsYSjigKLigKLigKIsIOKAouKAouKAoiwg4oCi4oCi4oCiLCDigKLigKLigKIpIOKAlCBhbHNvIHdpdGggb3BhY2l0eTwvbGk+XG4gIyAgICAgPGxpPmhzbCjigKLigKLigKIlLCDigKLigKLigKIlLCDigKLigKLigKIlKSDigJQgc2FtZSBhcyBhYm92ZSwgYnV0IGluICU8L2xpPlxuICMgICAgIDxsaT5oc2xhKOKAouKAouKAoiUsIOKAouKAouKAoiUsIOKAouKAouKAoiUsIOKAouKAouKAoiUpIOKAlCBhbHNvIHdpdGggb3BhY2l0eTwvbGk+XG4gIyA8L3VsPlxuICogTm90ZSB0aGF0IGAlYCBjYW4gYmUgdXNlZCBhbnkgdGltZTogYHJnYigyMCUsIDI1NSwgNTAlKWAuXG4gPSAob2JqZWN0KSBSR0Igb2JqZWN0IGluIHRoZSBmb2xsb3dpbmcgZm9ybWF0OlxuIG8ge1xuIG8gICAgIHIgKG51bWJlcikgcmVkLFxuIG8gICAgIGcgKG51bWJlcikgZ3JlZW4sXG4gbyAgICAgYiAobnVtYmVyKSBibHVlLFxuIG8gICAgIGhleCAoc3RyaW5nKSBjb2xvciBpbiBIVE1ML0NTUyBmb3JtYXQ6ICPigKLigKLigKLigKLigKLigKIsXG4gbyAgICAgZXJyb3IgKGJvb2xlYW4pIHRydWUgaWYgc3RyaW5nIGNhbid0IGJlIHBhcnNlZFxuIG8gfVxuXFwqL1xuU25hcC5nZXRSR0IgPSBjYWNoZXIoZnVuY3Rpb24gKGNvbG91cikge1xuICAgIGlmICghY29sb3VyIHx8ICEhKChjb2xvdXIgPSBTdHIoY29sb3VyKSkuaW5kZXhPZihcIi1cIikgKyAxKSkge1xuICAgICAgICByZXR1cm4ge3I6IC0xLCBnOiAtMSwgYjogLTEsIGhleDogXCJub25lXCIsIGVycm9yOiAxLCB0b1N0cmluZzogcmdidG9TdHJpbmd9O1xuICAgIH1cbiAgICBpZiAoY29sb3VyID09IFwibm9uZVwiKSB7XG4gICAgICAgIHJldHVybiB7cjogLTEsIGc6IC0xLCBiOiAtMSwgaGV4OiBcIm5vbmVcIiwgdG9TdHJpbmc6IHJnYnRvU3RyaW5nfTtcbiAgICB9XG4gICAgIShoc3JnW2hhc10oY29sb3VyLnRvTG93ZXJDYXNlKCkuc3Vic3RyaW5nKDAsIDIpKSB8fCBjb2xvdXIuY2hhckF0KCkgPT0gXCIjXCIpICYmIChjb2xvdXIgPSB0b0hleChjb2xvdXIpKTtcbiAgICBpZiAoIWNvbG91cikge1xuICAgICAgICByZXR1cm4ge3I6IC0xLCBnOiAtMSwgYjogLTEsIGhleDogXCJub25lXCIsIGVycm9yOiAxLCB0b1N0cmluZzogcmdidG9TdHJpbmd9O1xuICAgIH1cbiAgICB2YXIgcmVzLFxuICAgICAgICByZWQsXG4gICAgICAgIGdyZWVuLFxuICAgICAgICBibHVlLFxuICAgICAgICBvcGFjaXR5LFxuICAgICAgICB0LFxuICAgICAgICB2YWx1ZXMsXG4gICAgICAgIHJnYiA9IGNvbG91ci5tYXRjaChjb2xvdXJSZWdFeHApO1xuICAgIGlmIChyZ2IpIHtcbiAgICAgICAgaWYgKHJnYlsyXSkge1xuICAgICAgICAgICAgYmx1ZSA9IHRvSW50KHJnYlsyXS5zdWJzdHJpbmcoNSksIDE2KTtcbiAgICAgICAgICAgIGdyZWVuID0gdG9JbnQocmdiWzJdLnN1YnN0cmluZygzLCA1KSwgMTYpO1xuICAgICAgICAgICAgcmVkID0gdG9JbnQocmdiWzJdLnN1YnN0cmluZygxLCAzKSwgMTYpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZ2JbM10pIHtcbiAgICAgICAgICAgIGJsdWUgPSB0b0ludCgodCA9IHJnYlszXS5jaGFyQXQoMykpICsgdCwgMTYpO1xuICAgICAgICAgICAgZ3JlZW4gPSB0b0ludCgodCA9IHJnYlszXS5jaGFyQXQoMikpICsgdCwgMTYpO1xuICAgICAgICAgICAgcmVkID0gdG9JbnQoKHQgPSByZ2JbM10uY2hhckF0KDEpKSArIHQsIDE2KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmdiWzRdKSB7XG4gICAgICAgICAgICB2YWx1ZXMgPSByZ2JbNF0uc3BsaXQoY29tbWFTcGFjZXMpO1xuICAgICAgICAgICAgcmVkID0gdG9GbG9hdCh2YWx1ZXNbMF0pO1xuICAgICAgICAgICAgdmFsdWVzWzBdLnNsaWNlKC0xKSA9PSBcIiVcIiAmJiAocmVkICo9IDIuNTUpO1xuICAgICAgICAgICAgZ3JlZW4gPSB0b0Zsb2F0KHZhbHVlc1sxXSk7XG4gICAgICAgICAgICB2YWx1ZXNbMV0uc2xpY2UoLTEpID09IFwiJVwiICYmIChncmVlbiAqPSAyLjU1KTtcbiAgICAgICAgICAgIGJsdWUgPSB0b0Zsb2F0KHZhbHVlc1syXSk7XG4gICAgICAgICAgICB2YWx1ZXNbMl0uc2xpY2UoLTEpID09IFwiJVwiICYmIChibHVlICo9IDIuNTUpO1xuICAgICAgICAgICAgcmdiWzFdLnRvTG93ZXJDYXNlKCkuc2xpY2UoMCwgNCkgPT0gXCJyZ2JhXCIgJiYgKG9wYWNpdHkgPSB0b0Zsb2F0KHZhbHVlc1szXSkpO1xuICAgICAgICAgICAgdmFsdWVzWzNdICYmIHZhbHVlc1szXS5zbGljZSgtMSkgPT0gXCIlXCIgJiYgKG9wYWNpdHkgLz0gMTAwKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocmdiWzVdKSB7XG4gICAgICAgICAgICB2YWx1ZXMgPSByZ2JbNV0uc3BsaXQoY29tbWFTcGFjZXMpO1xuICAgICAgICAgICAgcmVkID0gdG9GbG9hdCh2YWx1ZXNbMF0pO1xuICAgICAgICAgICAgdmFsdWVzWzBdLnNsaWNlKC0xKSA9PSBcIiVcIiAmJiAocmVkIC89IDEwMCk7XG4gICAgICAgICAgICBncmVlbiA9IHRvRmxvYXQodmFsdWVzWzFdKTtcbiAgICAgICAgICAgIHZhbHVlc1sxXS5zbGljZSgtMSkgPT0gXCIlXCIgJiYgKGdyZWVuIC89IDEwMCk7XG4gICAgICAgICAgICBibHVlID0gdG9GbG9hdCh2YWx1ZXNbMl0pO1xuICAgICAgICAgICAgdmFsdWVzWzJdLnNsaWNlKC0xKSA9PSBcIiVcIiAmJiAoYmx1ZSAvPSAxMDApO1xuICAgICAgICAgICAgKHZhbHVlc1swXS5zbGljZSgtMykgPT0gXCJkZWdcIiB8fCB2YWx1ZXNbMF0uc2xpY2UoLTEpID09IFwiXFx4YjBcIikgJiYgKHJlZCAvPSAzNjApO1xuICAgICAgICAgICAgcmdiWzFdLnRvTG93ZXJDYXNlKCkuc2xpY2UoMCwgNCkgPT0gXCJoc2JhXCIgJiYgKG9wYWNpdHkgPSB0b0Zsb2F0KHZhbHVlc1szXSkpO1xuICAgICAgICAgICAgdmFsdWVzWzNdICYmIHZhbHVlc1szXS5zbGljZSgtMSkgPT0gXCIlXCIgJiYgKG9wYWNpdHkgLz0gMTAwKTtcbiAgICAgICAgICAgIHJldHVybiBTbmFwLmhzYjJyZ2IocmVkLCBncmVlbiwgYmx1ZSwgb3BhY2l0eSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJnYls2XSkge1xuICAgICAgICAgICAgdmFsdWVzID0gcmdiWzZdLnNwbGl0KGNvbW1hU3BhY2VzKTtcbiAgICAgICAgICAgIHJlZCA9IHRvRmxvYXQodmFsdWVzWzBdKTtcbiAgICAgICAgICAgIHZhbHVlc1swXS5zbGljZSgtMSkgPT0gXCIlXCIgJiYgKHJlZCAvPSAxMDApO1xuICAgICAgICAgICAgZ3JlZW4gPSB0b0Zsb2F0KHZhbHVlc1sxXSk7XG4gICAgICAgICAgICB2YWx1ZXNbMV0uc2xpY2UoLTEpID09IFwiJVwiICYmIChncmVlbiAvPSAxMDApO1xuICAgICAgICAgICAgYmx1ZSA9IHRvRmxvYXQodmFsdWVzWzJdKTtcbiAgICAgICAgICAgIHZhbHVlc1syXS5zbGljZSgtMSkgPT0gXCIlXCIgJiYgKGJsdWUgLz0gMTAwKTtcbiAgICAgICAgICAgICh2YWx1ZXNbMF0uc2xpY2UoLTMpID09IFwiZGVnXCIgfHwgdmFsdWVzWzBdLnNsaWNlKC0xKSA9PSBcIlxceGIwXCIpICYmIChyZWQgLz0gMzYwKTtcbiAgICAgICAgICAgIHJnYlsxXS50b0xvd2VyQ2FzZSgpLnNsaWNlKDAsIDQpID09IFwiaHNsYVwiICYmIChvcGFjaXR5ID0gdG9GbG9hdCh2YWx1ZXNbM10pKTtcbiAgICAgICAgICAgIHZhbHVlc1szXSAmJiB2YWx1ZXNbM10uc2xpY2UoLTEpID09IFwiJVwiICYmIChvcGFjaXR5IC89IDEwMCk7XG4gICAgICAgICAgICByZXR1cm4gU25hcC5oc2wycmdiKHJlZCwgZ3JlZW4sIGJsdWUsIG9wYWNpdHkpO1xuICAgICAgICB9XG4gICAgICAgIHJlZCA9IG1taW4obWF0aC5yb3VuZChyZWQpLCAyNTUpO1xuICAgICAgICBncmVlbiA9IG1taW4obWF0aC5yb3VuZChncmVlbiksIDI1NSk7XG4gICAgICAgIGJsdWUgPSBtbWluKG1hdGgucm91bmQoYmx1ZSksIDI1NSk7XG4gICAgICAgIG9wYWNpdHkgPSBtbWluKG1tYXgob3BhY2l0eSwgMCksIDEpO1xuICAgICAgICByZ2IgPSB7cjogcmVkLCBnOiBncmVlbiwgYjogYmx1ZSwgdG9TdHJpbmc6IHJnYnRvU3RyaW5nfTtcbiAgICAgICAgcmdiLmhleCA9IFwiI1wiICsgKDE2Nzc3MjE2IHwgYmx1ZSB8IChncmVlbiA8PCA4KSB8IChyZWQgPDwgMTYpKS50b1N0cmluZygxNikuc2xpY2UoMSk7XG4gICAgICAgIHJnYi5vcGFjaXR5ID0gaXMob3BhY2l0eSwgXCJmaW5pdGVcIikgPyBvcGFjaXR5IDogMTtcbiAgICAgICAgcmV0dXJuIHJnYjtcbiAgICB9XG4gICAgcmV0dXJuIHtyOiAtMSwgZzogLTEsIGI6IC0xLCBoZXg6IFwibm9uZVwiLCBlcnJvcjogMSwgdG9TdHJpbmc6IHJnYnRvU3RyaW5nfTtcbn0sIFNuYXApO1xuLy8gU0lFUlJBIEl0IHNlZW1zIG9kZCB0aGF0IHRoZSBmb2xsb3dpbmcgMyBjb252ZXJzaW9uIG1ldGhvZHMgYXJlIG5vdCBleHByZXNzZWQgYXMgLnRoaXMydGhhdCgpLCBsaWtlIHRoZSBvdGhlcnMuXG4vKlxcXG4gKiBTbmFwLmhzYlxuIFsgbWV0aG9kIF1cbiAqKlxuICogQ29udmVydHMgSFNCIHZhbHVlcyB0byBhIGhleCByZXByZXNlbnRhdGlvbiBvZiB0aGUgY29sb3JcbiAtIGggKG51bWJlcikgaHVlXG4gLSBzIChudW1iZXIpIHNhdHVyYXRpb25cbiAtIGIgKG51bWJlcikgdmFsdWUgb3IgYnJpZ2h0bmVzc1xuID0gKHN0cmluZykgaGV4IHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjb2xvclxuXFwqL1xuU25hcC5oc2IgPSBjYWNoZXIoZnVuY3Rpb24gKGgsIHMsIGIpIHtcbiAgICByZXR1cm4gU25hcC5oc2IycmdiKGgsIHMsIGIpLmhleDtcbn0pO1xuLypcXFxuICogU25hcC5oc2xcbiBbIG1ldGhvZCBdXG4gKipcbiAqIENvbnZlcnRzIEhTTCB2YWx1ZXMgdG8gYSBoZXggcmVwcmVzZW50YXRpb24gb2YgdGhlIGNvbG9yXG4gLSBoIChudW1iZXIpIGh1ZVxuIC0gcyAobnVtYmVyKSBzYXR1cmF0aW9uXG4gLSBsIChudW1iZXIpIGx1bWlub3NpdHlcbiA9IChzdHJpbmcpIGhleCByZXByZXNlbnRhdGlvbiBvZiB0aGUgY29sb3JcblxcKi9cblNuYXAuaHNsID0gY2FjaGVyKGZ1bmN0aW9uIChoLCBzLCBsKSB7XG4gICAgcmV0dXJuIFNuYXAuaHNsMnJnYihoLCBzLCBsKS5oZXg7XG59KTtcbi8qXFxcbiAqIFNuYXAucmdiXG4gWyBtZXRob2QgXVxuICoqXG4gKiBDb252ZXJ0cyBSR0IgdmFsdWVzIHRvIGEgaGV4IHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjb2xvclxuIC0gciAobnVtYmVyKSByZWRcbiAtIGcgKG51bWJlcikgZ3JlZW5cbiAtIGIgKG51bWJlcikgYmx1ZVxuID0gKHN0cmluZykgaGV4IHJlcHJlc2VudGF0aW9uIG9mIHRoZSBjb2xvclxuXFwqL1xuU25hcC5yZ2IgPSBjYWNoZXIoZnVuY3Rpb24gKHIsIGcsIGIsIG8pIHtcbiAgICBpZiAoaXMobywgXCJmaW5pdGVcIikpIHtcbiAgICAgICAgdmFyIHJvdW5kID0gbWF0aC5yb3VuZDtcbiAgICAgICAgcmV0dXJuIFwicmdiYShcIiArIFtyb3VuZChyKSwgcm91bmQoZyksIHJvdW5kKGIpLCArby50b0ZpeGVkKDIpXSArIFwiKVwiO1xuICAgIH1cbiAgICByZXR1cm4gXCIjXCIgKyAoMTY3NzcyMTYgfCBiIHwgKGcgPDwgOCkgfCAociA8PCAxNikpLnRvU3RyaW5nKDE2KS5zbGljZSgxKTtcbn0pO1xudmFyIHRvSGV4ID0gZnVuY3Rpb24gKGNvbG9yKSB7XG4gICAgdmFyIGkgPSBnbG9iLmRvYy5nZXRFbGVtZW50c0J5VGFnTmFtZShcImhlYWRcIilbMF0sXG4gICAgICAgIHJlZCA9IFwicmdiKDI1NSwgMCwgMClcIjtcbiAgICB0b0hleCA9IGNhY2hlcihmdW5jdGlvbiAoY29sb3IpIHtcbiAgICAgICAgaWYgKGNvbG9yLnRvTG93ZXJDYXNlKCkgPT0gXCJyZWRcIikge1xuICAgICAgICAgICAgcmV0dXJuIHJlZDtcbiAgICAgICAgfVxuICAgICAgICBpLnN0eWxlLmNvbG9yID0gcmVkO1xuICAgICAgICBpLnN0eWxlLmNvbG9yID0gY29sb3I7XG4gICAgICAgIHZhciBvdXQgPSBnbG9iLmRvYy5kZWZhdWx0Vmlldy5nZXRDb21wdXRlZFN0eWxlKGksIEUpLmdldFByb3BlcnR5VmFsdWUoXCJjb2xvclwiKTtcbiAgICAgICAgcmV0dXJuIG91dCA9PSByZWQgPyBudWxsIDogb3V0O1xuICAgIH0pO1xuICAgIHJldHVybiB0b0hleChjb2xvcik7XG59LFxuaHNidG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFwiaHNiKFwiICsgW3RoaXMuaCwgdGhpcy5zLCB0aGlzLmJdICsgXCIpXCI7XG59LFxuaHNsdG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFwiaHNsKFwiICsgW3RoaXMuaCwgdGhpcy5zLCB0aGlzLmxdICsgXCIpXCI7XG59LFxucmdidG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMub3BhY2l0eSA9PSAxIHx8IHRoaXMub3BhY2l0eSA9PSBudWxsID9cbiAgICAgICAgICAgIHRoaXMuaGV4IDpcbiAgICAgICAgICAgIFwicmdiYShcIiArIFt0aGlzLnIsIHRoaXMuZywgdGhpcy5iLCB0aGlzLm9wYWNpdHldICsgXCIpXCI7XG59LFxucHJlcGFyZVJHQiA9IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG4gICAgaWYgKGcgPT0gbnVsbCAmJiBpcyhyLCBcIm9iamVjdFwiKSAmJiBcInJcIiBpbiByICYmIFwiZ1wiIGluIHIgJiYgXCJiXCIgaW4gcikge1xuICAgICAgICBiID0gci5iO1xuICAgICAgICBnID0gci5nO1xuICAgICAgICByID0gci5yO1xuICAgIH1cbiAgICBpZiAoZyA9PSBudWxsICYmIGlzKHIsIHN0cmluZykpIHtcbiAgICAgICAgdmFyIGNsciA9IFNuYXAuZ2V0UkdCKHIpO1xuICAgICAgICByID0gY2xyLnI7XG4gICAgICAgIGcgPSBjbHIuZztcbiAgICAgICAgYiA9IGNsci5iO1xuICAgIH1cbiAgICBpZiAociA+IDEgfHwgZyA+IDEgfHwgYiA+IDEpIHtcbiAgICAgICAgciAvPSAyNTU7XG4gICAgICAgIGcgLz0gMjU1O1xuICAgICAgICBiIC89IDI1NTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIFtyLCBnLCBiXTtcbn0sXG5wYWNrYWdlUkdCID0gZnVuY3Rpb24gKHIsIGcsIGIsIG8pIHtcbiAgICByID0gbWF0aC5yb3VuZChyICogMjU1KTtcbiAgICBnID0gbWF0aC5yb3VuZChnICogMjU1KTtcbiAgICBiID0gbWF0aC5yb3VuZChiICogMjU1KTtcbiAgICB2YXIgcmdiID0ge1xuICAgICAgICByOiByLFxuICAgICAgICBnOiBnLFxuICAgICAgICBiOiBiLFxuICAgICAgICBvcGFjaXR5OiBpcyhvLCBcImZpbml0ZVwiKSA/IG8gOiAxLFxuICAgICAgICBoZXg6IFNuYXAucmdiKHIsIGcsIGIpLFxuICAgICAgICB0b1N0cmluZzogcmdidG9TdHJpbmdcbiAgICB9O1xuICAgIGlzKG8sIFwiZmluaXRlXCIpICYmIChyZ2Iub3BhY2l0eSA9IG8pO1xuICAgIHJldHVybiByZ2I7XG59O1xuLy8gU0lFUlJBIENsYXJpZnkgaWYgU25hcCBkb2VzIG5vdCBzdXBwb3J0IGNvbnNvbGlkYXRlZCBIU0xBL1JHQkEgY29sb3JzLiBFLmcuLCBjYW4geW91IHNwZWNpZnkgYSBzZW1pLXRyYW5zcGFyZW50IHZhbHVlIGZvciBTbmFwLmZpbHRlci5zaGFkb3coKT9cbi8qXFxcbiAqIFNuYXAuY29sb3JcbiBbIG1ldGhvZCBdXG4gKipcbiAqIFBhcnNlcyB0aGUgY29sb3Igc3RyaW5nIGFuZCByZXR1cm5zIGFuIG9iamVjdCBmZWF0dXJpbmcgdGhlIGNvbG9yJ3MgY29tcG9uZW50IHZhbHVlc1xuIC0gY2xyIChzdHJpbmcpIGNvbG9yIHN0cmluZyBpbiBvbmUgb2YgdGhlIHN1cHBvcnRlZCBmb3JtYXRzIChzZWUgQFNuYXAuZ2V0UkdCKVxuID0gKG9iamVjdCkgQ29tYmluZWQgUkdCL0hTQiBvYmplY3QgaW4gdGhlIGZvbGxvd2luZyBmb3JtYXQ6XG4gbyB7XG4gbyAgICAgciAobnVtYmVyKSByZWQsXG4gbyAgICAgZyAobnVtYmVyKSBncmVlbixcbiBvICAgICBiIChudW1iZXIpIGJsdWUsXG4gbyAgICAgaGV4IChzdHJpbmcpIGNvbG9yIGluIEhUTUwvQ1NTIGZvcm1hdDogI+KAouKAouKAouKAouKAouKAoixcbiBvICAgICBlcnJvciAoYm9vbGVhbikgYHRydWVgIGlmIHN0cmluZyBjYW4ndCBiZSBwYXJzZWQsXG4gbyAgICAgaCAobnVtYmVyKSBodWUsXG4gbyAgICAgcyAobnVtYmVyKSBzYXR1cmF0aW9uLFxuIG8gICAgIHYgKG51bWJlcikgdmFsdWUgKGJyaWdodG5lc3MpLFxuIG8gICAgIGwgKG51bWJlcikgbGlnaHRuZXNzXG4gbyB9XG5cXCovXG5TbmFwLmNvbG9yID0gZnVuY3Rpb24gKGNscikge1xuICAgIHZhciByZ2I7XG4gICAgaWYgKGlzKGNsciwgXCJvYmplY3RcIikgJiYgXCJoXCIgaW4gY2xyICYmIFwic1wiIGluIGNsciAmJiBcImJcIiBpbiBjbHIpIHtcbiAgICAgICAgcmdiID0gU25hcC5oc2IycmdiKGNscik7XG4gICAgICAgIGNsci5yID0gcmdiLnI7XG4gICAgICAgIGNsci5nID0gcmdiLmc7XG4gICAgICAgIGNsci5iID0gcmdiLmI7XG4gICAgICAgIGNsci5vcGFjaXR5ID0gMTtcbiAgICAgICAgY2xyLmhleCA9IHJnYi5oZXg7XG4gICAgfSBlbHNlIGlmIChpcyhjbHIsIFwib2JqZWN0XCIpICYmIFwiaFwiIGluIGNsciAmJiBcInNcIiBpbiBjbHIgJiYgXCJsXCIgaW4gY2xyKSB7XG4gICAgICAgIHJnYiA9IFNuYXAuaHNsMnJnYihjbHIpO1xuICAgICAgICBjbHIuciA9IHJnYi5yO1xuICAgICAgICBjbHIuZyA9IHJnYi5nO1xuICAgICAgICBjbHIuYiA9IHJnYi5iO1xuICAgICAgICBjbHIub3BhY2l0eSA9IDE7XG4gICAgICAgIGNsci5oZXggPSByZ2IuaGV4O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChpcyhjbHIsIFwic3RyaW5nXCIpKSB7XG4gICAgICAgICAgICBjbHIgPSBTbmFwLmdldFJHQihjbHIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpcyhjbHIsIFwib2JqZWN0XCIpICYmIFwiclwiIGluIGNsciAmJiBcImdcIiBpbiBjbHIgJiYgXCJiXCIgaW4gY2xyICYmICEoXCJlcnJvclwiIGluIGNscikpIHtcbiAgICAgICAgICAgIHJnYiA9IFNuYXAucmdiMmhzbChjbHIpO1xuICAgICAgICAgICAgY2xyLmggPSByZ2IuaDtcbiAgICAgICAgICAgIGNsci5zID0gcmdiLnM7XG4gICAgICAgICAgICBjbHIubCA9IHJnYi5sO1xuICAgICAgICAgICAgcmdiID0gU25hcC5yZ2IyaHNiKGNscik7XG4gICAgICAgICAgICBjbHIudiA9IHJnYi5iO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2xyID0ge2hleDogXCJub25lXCJ9O1xuICAgICAgICAgICAgY2xyLnIgPSBjbHIuZyA9IGNsci5iID0gY2xyLmggPSBjbHIucyA9IGNsci52ID0gY2xyLmwgPSAtMTtcbiAgICAgICAgICAgIGNsci5lcnJvciA9IDE7XG4gICAgICAgIH1cbiAgICB9XG4gICAgY2xyLnRvU3RyaW5nID0gcmdidG9TdHJpbmc7XG4gICAgcmV0dXJuIGNscjtcbn07XG4vKlxcXG4gKiBTbmFwLmhzYjJyZ2JcbiBbIG1ldGhvZCBdXG4gKipcbiAqIENvbnZlcnRzIEhTQiB2YWx1ZXMgdG8gYW4gUkdCIG9iamVjdFxuIC0gaCAobnVtYmVyKSBodWVcbiAtIHMgKG51bWJlcikgc2F0dXJhdGlvblxuIC0gdiAobnVtYmVyKSB2YWx1ZSBvciBicmlnaHRuZXNzXG4gPSAob2JqZWN0KSBSR0Igb2JqZWN0IGluIHRoZSBmb2xsb3dpbmcgZm9ybWF0OlxuIG8ge1xuIG8gICAgIHIgKG51bWJlcikgcmVkLFxuIG8gICAgIGcgKG51bWJlcikgZ3JlZW4sXG4gbyAgICAgYiAobnVtYmVyKSBibHVlLFxuIG8gICAgIGhleCAoc3RyaW5nKSBjb2xvciBpbiBIVE1ML0NTUyBmb3JtYXQ6ICPigKLigKLigKLigKLigKLigKJcbiBvIH1cblxcKi9cblNuYXAuaHNiMnJnYiA9IGZ1bmN0aW9uIChoLCBzLCB2LCBvKSB7XG4gICAgaWYgKGlzKGgsIFwib2JqZWN0XCIpICYmIFwiaFwiIGluIGggJiYgXCJzXCIgaW4gaCAmJiBcImJcIiBpbiBoKSB7XG4gICAgICAgIHYgPSBoLmI7XG4gICAgICAgIHMgPSBoLnM7XG4gICAgICAgIGggPSBoLmg7XG4gICAgICAgIG8gPSBoLm87XG4gICAgfVxuICAgIGggKj0gMzYwO1xuICAgIHZhciBSLCBHLCBCLCBYLCBDO1xuICAgIGggPSAoaCAlIDM2MCkgLyA2MDtcbiAgICBDID0gdiAqIHM7XG4gICAgWCA9IEMgKiAoMSAtIGFicyhoICUgMiAtIDEpKTtcbiAgICBSID0gRyA9IEIgPSB2IC0gQztcblxuICAgIGggPSB+fmg7XG4gICAgUiArPSBbQywgWCwgMCwgMCwgWCwgQ11baF07XG4gICAgRyArPSBbWCwgQywgQywgWCwgMCwgMF1baF07XG4gICAgQiArPSBbMCwgMCwgWCwgQywgQywgWF1baF07XG4gICAgcmV0dXJuIHBhY2thZ2VSR0IoUiwgRywgQiwgbyk7XG59O1xuLypcXFxuICogU25hcC5oc2wycmdiXG4gWyBtZXRob2QgXVxuICoqXG4gKiBDb252ZXJ0cyBIU0wgdmFsdWVzIHRvIGFuIFJHQiBvYmplY3RcbiAtIGggKG51bWJlcikgaHVlXG4gLSBzIChudW1iZXIpIHNhdHVyYXRpb25cbiAtIGwgKG51bWJlcikgbHVtaW5vc2l0eVxuID0gKG9iamVjdCkgUkdCIG9iamVjdCBpbiB0aGUgZm9sbG93aW5nIGZvcm1hdDpcbiBvIHtcbiBvICAgICByIChudW1iZXIpIHJlZCxcbiBvICAgICBnIChudW1iZXIpIGdyZWVuLFxuIG8gICAgIGIgKG51bWJlcikgYmx1ZSxcbiBvICAgICBoZXggKHN0cmluZykgY29sb3IgaW4gSFRNTC9DU1MgZm9ybWF0OiAj4oCi4oCi4oCi4oCi4oCi4oCiXG4gbyB9XG5cXCovXG5TbmFwLmhzbDJyZ2IgPSBmdW5jdGlvbiAoaCwgcywgbCwgbykge1xuICAgIGlmIChpcyhoLCBcIm9iamVjdFwiKSAmJiBcImhcIiBpbiBoICYmIFwic1wiIGluIGggJiYgXCJsXCIgaW4gaCkge1xuICAgICAgICBsID0gaC5sO1xuICAgICAgICBzID0gaC5zO1xuICAgICAgICBoID0gaC5oO1xuICAgIH1cbiAgICBpZiAoaCA+IDEgfHwgcyA+IDEgfHwgbCA+IDEpIHtcbiAgICAgICAgaCAvPSAzNjA7XG4gICAgICAgIHMgLz0gMTAwO1xuICAgICAgICBsIC89IDEwMDtcbiAgICB9XG4gICAgaCAqPSAzNjA7XG4gICAgdmFyIFIsIEcsIEIsIFgsIEM7XG4gICAgaCA9IChoICUgMzYwKSAvIDYwO1xuICAgIEMgPSAyICogcyAqIChsIDwgLjUgPyBsIDogMSAtIGwpO1xuICAgIFggPSBDICogKDEgLSBhYnMoaCAlIDIgLSAxKSk7XG4gICAgUiA9IEcgPSBCID0gbCAtIEMgLyAyO1xuXG4gICAgaCA9IH5+aDtcbiAgICBSICs9IFtDLCBYLCAwLCAwLCBYLCBDXVtoXTtcbiAgICBHICs9IFtYLCBDLCBDLCBYLCAwLCAwXVtoXTtcbiAgICBCICs9IFswLCAwLCBYLCBDLCBDLCBYXVtoXTtcbiAgICByZXR1cm4gcGFja2FnZVJHQihSLCBHLCBCLCBvKTtcbn07XG4vKlxcXG4gKiBTbmFwLnJnYjJoc2JcbiBbIG1ldGhvZCBdXG4gKipcbiAqIENvbnZlcnRzIFJHQiB2YWx1ZXMgdG8gYW4gSFNCIG9iamVjdFxuIC0gciAobnVtYmVyKSByZWRcbiAtIGcgKG51bWJlcikgZ3JlZW5cbiAtIGIgKG51bWJlcikgYmx1ZVxuID0gKG9iamVjdCkgSFNCIG9iamVjdCBpbiB0aGUgZm9sbG93aW5nIGZvcm1hdDpcbiBvIHtcbiBvICAgICBoIChudW1iZXIpIGh1ZSxcbiBvICAgICBzIChudW1iZXIpIHNhdHVyYXRpb24sXG4gbyAgICAgYiAobnVtYmVyKSBicmlnaHRuZXNzXG4gbyB9XG5cXCovXG5TbmFwLnJnYjJoc2IgPSBmdW5jdGlvbiAociwgZywgYikge1xuICAgIGIgPSBwcmVwYXJlUkdCKHIsIGcsIGIpO1xuICAgIHIgPSBiWzBdO1xuICAgIGcgPSBiWzFdO1xuICAgIGIgPSBiWzJdO1xuXG4gICAgdmFyIEgsIFMsIFYsIEM7XG4gICAgViA9IG1tYXgociwgZywgYik7XG4gICAgQyA9IFYgLSBtbWluKHIsIGcsIGIpO1xuICAgIEggPSAoQyA9PSAwID8gbnVsbCA6XG4gICAgICAgICBWID09IHIgPyAoZyAtIGIpIC8gQyA6XG4gICAgICAgICBWID09IGcgPyAoYiAtIHIpIC8gQyArIDIgOlxuICAgICAgICAgICAgICAgICAgKHIgLSBnKSAvIEMgKyA0XG4gICAgICAgICk7XG4gICAgSCA9ICgoSCArIDM2MCkgJSA2KSAqIDYwIC8gMzYwO1xuICAgIFMgPSBDID09IDAgPyAwIDogQyAvIFY7XG4gICAgcmV0dXJuIHtoOiBILCBzOiBTLCBiOiBWLCB0b1N0cmluZzogaHNidG9TdHJpbmd9O1xufTtcbi8qXFxcbiAqIFNuYXAucmdiMmhzbFxuIFsgbWV0aG9kIF1cbiAqKlxuICogQ29udmVydHMgUkdCIHZhbHVlcyB0byBhbiBIU0wgb2JqZWN0XG4gLSByIChudW1iZXIpIHJlZFxuIC0gZyAobnVtYmVyKSBncmVlblxuIC0gYiAobnVtYmVyKSBibHVlXG4gPSAob2JqZWN0KSBIU0wgb2JqZWN0IGluIHRoZSBmb2xsb3dpbmcgZm9ybWF0OlxuIG8ge1xuIG8gICAgIGggKG51bWJlcikgaHVlLFxuIG8gICAgIHMgKG51bWJlcikgc2F0dXJhdGlvbixcbiBvICAgICBsIChudW1iZXIpIGx1bWlub3NpdHlcbiBvIH1cblxcKi9cblNuYXAucmdiMmhzbCA9IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG4gICAgYiA9IHByZXBhcmVSR0IociwgZywgYik7XG4gICAgciA9IGJbMF07XG4gICAgZyA9IGJbMV07XG4gICAgYiA9IGJbMl07XG5cbiAgICB2YXIgSCwgUywgTCwgTSwgbSwgQztcbiAgICBNID0gbW1heChyLCBnLCBiKTtcbiAgICBtID0gbW1pbihyLCBnLCBiKTtcbiAgICBDID0gTSAtIG07XG4gICAgSCA9IChDID09IDAgPyBudWxsIDpcbiAgICAgICAgIE0gPT0gciA/IChnIC0gYikgLyBDIDpcbiAgICAgICAgIE0gPT0gZyA/IChiIC0gcikgLyBDICsgMiA6XG4gICAgICAgICAgICAgICAgICAociAtIGcpIC8gQyArIDQpO1xuICAgIEggPSAoKEggKyAzNjApICUgNikgKiA2MCAvIDM2MDtcbiAgICBMID0gKE0gKyBtKSAvIDI7XG4gICAgUyA9IChDID09IDAgPyAwIDpcbiAgICAgICAgIEwgPCAuNSA/IEMgLyAoMiAqIEwpIDpcbiAgICAgICAgICAgICAgICAgIEMgLyAoMiAtIDIgKiBMKSk7XG4gICAgcmV0dXJuIHtoOiBILCBzOiBTLCBsOiBMLCB0b1N0cmluZzogaHNsdG9TdHJpbmd9O1xufTtcblxuLy8gVHJhbnNmb3JtYXRpb25zXG4vLyBTSUVSUkEgU25hcC5wYXJzZVBhdGhTdHJpbmcoKTogQnkgX2FycmF5IG9mIGFycmF5cyxfIEkgYXNzdW1lIHlvdSBtZWFuIGEgZm9ybWF0IGxpa2UgdGhpcyBmb3IgdHdvIHNlcGFyYXRlIHNlZ21lbnRzPyBbIFtcIk0xMCwxMFwiLFwiTDkwLDkwXCJdLCBbXCJNOTAsMTBcIixcIkwxMCw5MFwiXSBdIE90aGVyd2lzZSBob3cgaXMgZWFjaCBjb21tYW5kIHN0cnVjdHVyZWQ/XG4vKlxcXG4gKiBTbmFwLnBhcnNlUGF0aFN0cmluZ1xuIFsgbWV0aG9kIF1cbiAqKlxuICogVXRpbGl0eSBtZXRob2RcbiAqKlxuICogUGFyc2VzIGdpdmVuIHBhdGggc3RyaW5nIGludG8gYW4gYXJyYXkgb2YgYXJyYXlzIG9mIHBhdGggc2VnbWVudHNcbiAtIHBhdGhTdHJpbmcgKHN0cmluZ3xhcnJheSkgcGF0aCBzdHJpbmcgb3IgYXJyYXkgb2Ygc2VnbWVudHMgKGluIHRoZSBsYXN0IGNhc2UgaXQgaXMgcmV0dXJuZWQgc3RyYWlnaHQgYXdheSlcbiA9IChhcnJheSkgYXJyYXkgb2Ygc2VnbWVudHNcblxcKi9cblNuYXAucGFyc2VQYXRoU3RyaW5nID0gZnVuY3Rpb24gKHBhdGhTdHJpbmcpIHtcbiAgICBpZiAoIXBhdGhTdHJpbmcpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIHZhciBwdGggPSBTbmFwLnBhdGgocGF0aFN0cmluZyk7XG4gICAgaWYgKHB0aC5hcnIpIHtcbiAgICAgICAgcmV0dXJuIFNuYXAucGF0aC5jbG9uZShwdGguYXJyKTtcbiAgICB9XG4gICAgXG4gICAgdmFyIHBhcmFtQ291bnRzID0ge2E6IDcsIGM6IDYsIG86IDIsIGg6IDEsIGw6IDIsIG06IDIsIHI6IDQsIHE6IDQsIHM6IDQsIHQ6IDIsIHY6IDEsIHU6IDMsIHo6IDB9LFxuICAgICAgICBkYXRhID0gW107XG4gICAgaWYgKGlzKHBhdGhTdHJpbmcsIFwiYXJyYXlcIikgJiYgaXMocGF0aFN0cmluZ1swXSwgXCJhcnJheVwiKSkgeyAvLyByb3VnaCBhc3N1bXB0aW9uXG4gICAgICAgIGRhdGEgPSBTbmFwLnBhdGguY2xvbmUocGF0aFN0cmluZyk7XG4gICAgfVxuICAgIGlmICghZGF0YS5sZW5ndGgpIHtcbiAgICAgICAgU3RyKHBhdGhTdHJpbmcpLnJlcGxhY2UocGF0aENvbW1hbmQsIGZ1bmN0aW9uIChhLCBiLCBjKSB7XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0gW10sXG4gICAgICAgICAgICAgICAgbmFtZSA9IGIudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgIGMucmVwbGFjZShwYXRoVmFsdWVzLCBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgIGIgJiYgcGFyYW1zLnB1c2goK2IpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAobmFtZSA9PSBcIm1cIiAmJiBwYXJhbXMubGVuZ3RoID4gMikge1xuICAgICAgICAgICAgICAgIGRhdGEucHVzaChbYl0uY29uY2F0KHBhcmFtcy5zcGxpY2UoMCwgMikpKTtcbiAgICAgICAgICAgICAgICBuYW1lID0gXCJsXCI7XG4gICAgICAgICAgICAgICAgYiA9IGIgPT0gXCJtXCIgPyBcImxcIiA6IFwiTFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5hbWUgPT0gXCJvXCIgJiYgcGFyYW1zLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5wdXNoKFtiLCBwYXJhbXNbMF1dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChuYW1lID09IFwiclwiKSB7XG4gICAgICAgICAgICAgICAgZGF0YS5wdXNoKFtiXS5jb25jYXQocGFyYW1zKSk7XG4gICAgICAgICAgICB9IGVsc2Ugd2hpbGUgKHBhcmFtcy5sZW5ndGggPj0gcGFyYW1Db3VudHNbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICBkYXRhLnB1c2goW2JdLmNvbmNhdChwYXJhbXMuc3BsaWNlKDAsIHBhcmFtQ291bnRzW25hbWVdKSkpO1xuICAgICAgICAgICAgICAgIGlmICghcGFyYW1Db3VudHNbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgZGF0YS50b1N0cmluZyA9IFNuYXAucGF0aC50b1N0cmluZztcbiAgICBwdGguYXJyID0gU25hcC5wYXRoLmNsb25lKGRhdGEpO1xuICAgIHJldHVybiBkYXRhO1xufTtcbi8qXFxcbiAqIFNuYXAucGFyc2VUcmFuc2Zvcm1TdHJpbmdcbiBbIG1ldGhvZCBdXG4gKipcbiAqIFV0aWxpdHkgbWV0aG9kXG4gKipcbiAqIFBhcnNlcyBnaXZlbiB0cmFuc2Zvcm0gc3RyaW5nIGludG8gYW4gYXJyYXkgb2YgdHJhbnNmb3JtYXRpb25zXG4gLSBUU3RyaW5nIChzdHJpbmd8YXJyYXkpIHRyYW5zZm9ybSBzdHJpbmcgb3IgYXJyYXkgb2YgdHJhbnNmb3JtYXRpb25zIChpbiB0aGUgbGFzdCBjYXNlIGl0IGlzIHJldHVybmVkIHN0cmFpZ2h0IGF3YXkpXG4gPSAoYXJyYXkpIGFycmF5IG9mIHRyYW5zZm9ybWF0aW9uc1xuXFwqL1xudmFyIHBhcnNlVHJhbnNmb3JtU3RyaW5nID0gU25hcC5wYXJzZVRyYW5zZm9ybVN0cmluZyA9IGZ1bmN0aW9uIChUU3RyaW5nKSB7XG4gICAgaWYgKCFUU3RyaW5nKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICB2YXIgcGFyYW1Db3VudHMgPSB7cjogMywgczogNCwgdDogMiwgbTogNn0sXG4gICAgICAgIGRhdGEgPSBbXTtcbiAgICBpZiAoaXMoVFN0cmluZywgXCJhcnJheVwiKSAmJiBpcyhUU3RyaW5nWzBdLCBcImFycmF5XCIpKSB7IC8vIHJvdWdoIGFzc3VtcHRpb25cbiAgICAgICAgZGF0YSA9IFNuYXAucGF0aC5jbG9uZShUU3RyaW5nKTtcbiAgICB9XG4gICAgaWYgKCFkYXRhLmxlbmd0aCkge1xuICAgICAgICBTdHIoVFN0cmluZykucmVwbGFjZSh0Q29tbWFuZCwgZnVuY3Rpb24gKGEsIGIsIGMpIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSBbXSxcbiAgICAgICAgICAgICAgICBuYW1lID0gYi50b0xvd2VyQ2FzZSgpO1xuICAgICAgICAgICAgYy5yZXBsYWNlKHBhdGhWYWx1ZXMsIGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgYiAmJiBwYXJhbXMucHVzaCgrYik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGRhdGEucHVzaChbYl0uY29uY2F0KHBhcmFtcykpO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgZGF0YS50b1N0cmluZyA9IFNuYXAucGF0aC50b1N0cmluZztcbiAgICByZXR1cm4gZGF0YTtcbn07XG5mdW5jdGlvbiBzdmdUcmFuc2Zvcm0yc3RyaW5nKHRzdHIpIHtcbiAgICB2YXIgcmVzID0gW107XG4gICAgdHN0ciA9IHRzdHIucmVwbGFjZSgvKD86XnxcXHMpKFxcdyspXFwoKFteKV0rKVxcKS9nLCBmdW5jdGlvbiAoYWxsLCBuYW1lLCBwYXJhbXMpIHtcbiAgICAgICAgcGFyYW1zID0gcGFyYW1zLnNwbGl0KC9cXHMqLFxccyp8XFxzKy8pO1xuICAgICAgICBpZiAobmFtZSA9PSBcInJvdGF0ZVwiICYmIHBhcmFtcy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgcGFyYW1zLnB1c2goMCwgMCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5hbWUgPT0gXCJzY2FsZVwiKSB7XG4gICAgICAgICAgICBpZiAocGFyYW1zLmxlbmd0aCA9PSAyKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnB1c2goMCwgMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocGFyYW1zLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zLnB1c2gocGFyYW1zWzBdLCAwLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAobmFtZSA9PSBcInNrZXdYXCIpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtcIm1cIiwgMSwgMCwgbWF0aC50YW4ocmFkKHBhcmFtc1swXSkpLCAxLCAwLCAwXSk7XG4gICAgICAgIH0gZWxzZSBpZiAobmFtZSA9PSBcInNrZXdZXCIpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtcIm1cIiwgMSwgbWF0aC50YW4ocmFkKHBhcmFtc1swXSkpLCAwLCAxLCAwLCAwXSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXMucHVzaChbbmFtZS5jaGFyQXQoMCldLmNvbmNhdChwYXJhbXMpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYWxsO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG59XG5TbmFwLl8uc3ZnVHJhbnNmb3JtMnN0cmluZyA9IHN2Z1RyYW5zZm9ybTJzdHJpbmc7XG5TbmFwLl8ucmdUcmFuc2Zvcm0gPSBuZXcgUmVnRXhwKFwiXlthLXpdW1wiICsgc3BhY2VzICsgXCJdKi0/XFxcXC4/XFxcXGRcIiwgXCJpXCIpO1xuZnVuY3Rpb24gdHJhbnNmb3JtMm1hdHJpeCh0c3RyLCBiYm94KSB7XG4gICAgdmFyIHRkYXRhID0gcGFyc2VUcmFuc2Zvcm1TdHJpbmcodHN0ciksXG4gICAgICAgIG0gPSBuZXcgTWF0cml4O1xuICAgIGlmICh0ZGF0YSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSB0ZGF0YS5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgdCA9IHRkYXRhW2ldLFxuICAgICAgICAgICAgICAgIHRsZW4gPSB0Lmxlbmd0aCxcbiAgICAgICAgICAgICAgICBjb21tYW5kID0gU3RyKHRbMF0pLnRvTG93ZXJDYXNlKCksXG4gICAgICAgICAgICAgICAgYWJzb2x1dGUgPSB0WzBdICE9IGNvbW1hbmQsXG4gICAgICAgICAgICAgICAgaW52ZXIgPSBhYnNvbHV0ZSA/IG0uaW52ZXJ0KCkgOiAwLFxuICAgICAgICAgICAgICAgIHgxLFxuICAgICAgICAgICAgICAgIHkxLFxuICAgICAgICAgICAgICAgIHgyLFxuICAgICAgICAgICAgICAgIHkyLFxuICAgICAgICAgICAgICAgIGJiO1xuICAgICAgICAgICAgaWYgKGNvbW1hbmQgPT0gXCJ0XCIgJiYgdGxlbiA9PSAyKXtcbiAgICAgICAgICAgICAgICBtLnRyYW5zbGF0ZSh0WzFdLCAwKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PSBcInRcIiAmJiB0bGVuID09IDMpIHtcbiAgICAgICAgICAgICAgICBpZiAoYWJzb2x1dGUpIHtcbiAgICAgICAgICAgICAgICAgICAgeDEgPSBpbnZlci54KDAsIDApO1xuICAgICAgICAgICAgICAgICAgICB5MSA9IGludmVyLnkoMCwgMCk7XG4gICAgICAgICAgICAgICAgICAgIHgyID0gaW52ZXIueCh0WzFdLCB0WzJdKTtcbiAgICAgICAgICAgICAgICAgICAgeTIgPSBpbnZlci55KHRbMV0sIHRbMl0pO1xuICAgICAgICAgICAgICAgICAgICBtLnRyYW5zbGF0ZSh4MiAtIHgxLCB5MiAtIHkxKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtLnRyYW5zbGF0ZSh0WzFdLCB0WzJdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT0gXCJyXCIpIHtcbiAgICAgICAgICAgICAgICBpZiAodGxlbiA9PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGJiID0gYmIgfHwgYmJveDtcbiAgICAgICAgICAgICAgICAgICAgbS5yb3RhdGUodFsxXSwgYmIueCArIGJiLndpZHRoIC8gMiwgYmIueSArIGJiLmhlaWdodCAvIDIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGxlbiA9PSA0KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhYnNvbHV0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgeDIgPSBpbnZlci54KHRbMl0sIHRbM10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgeTIgPSBpbnZlci55KHRbMl0sIHRbM10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgbS5yb3RhdGUodFsxXSwgeDIsIHkyKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG0ucm90YXRlKHRbMV0sIHRbMl0sIHRbM10pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09IFwic1wiKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRsZW4gPT0gMiB8fCB0bGVuID09IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgYmIgPSBiYiB8fCBiYm94O1xuICAgICAgICAgICAgICAgICAgICBtLnNjYWxlKHRbMV0sIHRbdGxlbiAtIDFdLCBiYi54ICsgYmIud2lkdGggLyAyLCBiYi55ICsgYmIuaGVpZ2h0IC8gMik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0bGVuID09IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFic29sdXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4MiA9IGludmVyLngodFsyXSwgdFszXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB5MiA9IGludmVyLnkodFsyXSwgdFszXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtLnNjYWxlKHRbMV0sIHRbMV0sIHgyLCB5Mik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtLnNjYWxlKHRbMV0sIHRbMV0sIHRbMl0sIHRbM10pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0bGVuID09IDUpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFic29sdXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4MiA9IGludmVyLngodFszXSwgdFs0XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB5MiA9IGludmVyLnkodFszXSwgdFs0XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBtLnNjYWxlKHRbMV0sIHRbMl0sIHgyLCB5Mik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtLnNjYWxlKHRbMV0sIHRbMl0sIHRbM10sIHRbNF0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09IFwibVwiICYmIHRsZW4gPT0gNykge1xuICAgICAgICAgICAgICAgIG0uYWRkKHRbMV0sIHRbMl0sIHRbM10sIHRbNF0sIHRbNV0sIHRbNl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBtO1xufVxuU25hcC5fLnRyYW5zZm9ybTJtYXRyaXggPSB0cmFuc2Zvcm0ybWF0cml4O1xuZnVuY3Rpb24gZXh0cmFjdFRyYW5zZm9ybShlbCwgdHN0cikge1xuICAgIGlmICh0c3RyID09IG51bGwpIHtcbiAgICAgICAgdmFyIGRvUmV0dXJuID0gdHJ1ZTtcbiAgICAgICAgaWYgKGVsLnR5cGUgPT0gXCJsaW5lYXJHcmFkaWVudFwiIHx8IGVsLnR5cGUgPT0gXCJyYWRpYWxHcmFkaWVudFwiKSB7XG4gICAgICAgICAgICB0c3RyID0gZWwubm9kZS5nZXRBdHRyaWJ1dGUoXCJncmFkaWVudFRyYW5zZm9ybVwiKTtcbiAgICAgICAgfSBlbHNlIGlmIChlbC50eXBlID09IFwicGF0dGVyblwiKSB7XG4gICAgICAgICAgICB0c3RyID0gZWwubm9kZS5nZXRBdHRyaWJ1dGUoXCJwYXR0ZXJuVHJhbnNmb3JtXCIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHN0ciA9IGVsLm5vZGUuZ2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghdHN0cikge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNYXRyaXg7XG4gICAgICAgIH1cbiAgICAgICAgdHN0ciA9IHN2Z1RyYW5zZm9ybTJzdHJpbmcodHN0cik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFTbmFwLl8ucmdUcmFuc2Zvcm0udGVzdCh0c3RyKSkge1xuICAgICAgICAgICAgdHN0ciA9IHN2Z1RyYW5zZm9ybTJzdHJpbmcodHN0cik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0c3RyID0gU3RyKHRzdHIpLnJlcGxhY2UoL1xcLnszfXxcXHUyMDI2L2csIGVsLl8udHJhbnNmb3JtIHx8IEUpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpcyh0c3RyLCBcImFycmF5XCIpKSB7XG4gICAgICAgICAgICB0c3RyID0gU25hcC5wYXRoID8gU25hcC5wYXRoLnRvU3RyaW5nLmNhbGwodHN0cikgOiBTdHIodHN0cik7XG4gICAgICAgIH1cbiAgICAgICAgZWwuXy50cmFuc2Zvcm0gPSB0c3RyO1xuICAgIH1cbiAgICB2YXIgbSA9IHRyYW5zZm9ybTJtYXRyaXgodHN0ciwgZWwuZ2V0QkJveCgxKSk7XG4gICAgaWYgKGRvUmV0dXJuKSB7XG4gICAgICAgIHJldHVybiBtO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGVsLm1hdHJpeCA9IG07XG4gICAgfVxufVxuU25hcC5fdW5pdDJweCA9IHVuaXQycHg7XG52YXIgY29udGFpbnMgPSBnbG9iLmRvYy5jb250YWlucyB8fCBnbG9iLmRvYy5jb21wYXJlRG9jdW1lbnRQb3NpdGlvbiA/XG4gICAgZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgdmFyIGFkb3duID0gYS5ub2RlVHlwZSA9PSA5ID8gYS5kb2N1bWVudEVsZW1lbnQgOiBhLFxuICAgICAgICAgICAgYnVwID0gYiAmJiBiLnBhcmVudE5vZGU7XG4gICAgICAgICAgICByZXR1cm4gYSA9PSBidXAgfHwgISEoYnVwICYmIGJ1cC5ub2RlVHlwZSA9PSAxICYmIChcbiAgICAgICAgICAgICAgICBhZG93bi5jb250YWlucyA/XG4gICAgICAgICAgICAgICAgICAgIGFkb3duLmNvbnRhaW5zKGJ1cCkgOlxuICAgICAgICAgICAgICAgICAgICBhLmNvbXBhcmVEb2N1bWVudFBvc2l0aW9uICYmIGEuY29tcGFyZURvY3VtZW50UG9zaXRpb24oYnVwKSAmIDE2XG4gICAgICAgICAgICApKTtcbiAgICB9IDpcbiAgICBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICBpZiAoYikge1xuICAgICAgICAgICAgd2hpbGUgKGIpIHtcbiAgICAgICAgICAgICAgICBiID0gYi5wYXJlbnROb2RlO1xuICAgICAgICAgICAgICAgIGlmIChiID09IGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuZnVuY3Rpb24gZ2V0U29tZURlZnMoZWwpIHtcbiAgICB2YXIgY2FjaGUgPSBTbmFwLl8uc29tZURlZnM7XG4gICAgaWYgKGNhY2hlICYmIGNvbnRhaW5zKGNhY2hlLm93bmVyRG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LCBjYWNoZSkpIHtcbiAgICAgICAgcmV0dXJuIGNhY2hlO1xuICAgIH1cbiAgICB2YXIgcCA9IChlbC5ub2RlLm93bmVyU1ZHRWxlbWVudCAmJiB3cmFwKGVsLm5vZGUub3duZXJTVkdFbGVtZW50KSkgfHxcbiAgICAgICAgICAgIChlbC5ub2RlLnBhcmVudE5vZGUgJiYgd3JhcChlbC5ub2RlLnBhcmVudE5vZGUpKSB8fFxuICAgICAgICAgICAgU25hcC5zZWxlY3QoXCJzdmdcIikgfHxcbiAgICAgICAgICAgIFNuYXAoMCwgMCksXG4gICAgICAgIHBkZWZzID0gcC5zZWxlY3QoXCJkZWZzXCIpLFxuICAgICAgICBkZWZzICA9IHBkZWZzID09IG51bGwgPyBmYWxzZSA6IHBkZWZzLm5vZGU7XG4gICAgaWYgKCFkZWZzKSB7XG4gICAgICAgIGRlZnMgPSBtYWtlKFwiZGVmc1wiLCBwLm5vZGUpLm5vZGU7XG4gICAgfVxuICAgIFNuYXAuXy5zb21lRGVmcyA9IGRlZnM7XG4gICAgcmV0dXJuIGRlZnM7XG59XG5TbmFwLl8uZ2V0U29tZURlZnMgPSBnZXRTb21lRGVmcztcbmZ1bmN0aW9uIHVuaXQycHgoZWwsIG5hbWUsIHZhbHVlKSB7XG4gICAgdmFyIGRlZnMgPSBnZXRTb21lRGVmcyhlbCksXG4gICAgICAgIG91dCA9IHt9LFxuICAgICAgICBtZ3IgPSBkZWZzLnF1ZXJ5U2VsZWN0b3IoXCIuc3ZnLS0tbWdyXCIpO1xuICAgIGlmICghbWdyKSB7XG4gICAgICAgIG1nciA9ICQoXCJyZWN0XCIpO1xuICAgICAgICAkKG1nciwge3dpZHRoOiAxMCwgaGVpZ2h0OiAxMCwgXCJjbGFzc1wiOiBcInN2Zy0tLW1nclwifSk7XG4gICAgICAgIGRlZnMuYXBwZW5kQ2hpbGQobWdyKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2V0Vyh2YWwpIHtcbiAgICAgICAgaWYgKHZhbCA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gRTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsID09ICt2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiB2YWw7XG4gICAgICAgIH1cbiAgICAgICAgJChtZ3IsIHt3aWR0aDogdmFsfSk7XG4gICAgICAgIHJldHVybiBtZ3IuZ2V0QkJveCgpLndpZHRoO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRIKHZhbCkge1xuICAgICAgICBpZiAodmFsID09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBFO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWwgPT0gK3ZhbCkge1xuICAgICAgICAgICAgcmV0dXJuIHZhbDtcbiAgICAgICAgfVxuICAgICAgICAkKG1nciwge2hlaWdodDogdmFsfSk7XG4gICAgICAgIHJldHVybiBtZ3IuZ2V0QkJveCgpLmhlaWdodDtcbiAgICB9XG4gICAgZnVuY3Rpb24gc2V0KG5hbSwgZikge1xuICAgICAgICBpZiAobmFtZSA9PSBudWxsKSB7XG4gICAgICAgICAgICBvdXRbbmFtXSA9IGYoZWwuYXR0cihuYW0pKTtcbiAgICAgICAgfSBlbHNlIGlmIChuYW0gPT0gbmFtZSkge1xuICAgICAgICAgICAgb3V0ID0gZih2YWx1ZSA9PSBudWxsID8gZWwuYXR0cihuYW0pIDogdmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHN3aXRjaCAoZWwudHlwZSkge1xuICAgICAgICBjYXNlIFwicmVjdFwiOlxuICAgICAgICAgICAgc2V0KFwicnhcIiwgZ2V0Vyk7XG4gICAgICAgICAgICBzZXQoXCJyeVwiLCBnZXRIKTtcbiAgICAgICAgY2FzZSBcImltYWdlXCI6XG4gICAgICAgICAgICBzZXQoXCJ3aWR0aFwiLCBnZXRXKTtcbiAgICAgICAgICAgIHNldChcImhlaWdodFwiLCBnZXRIKTtcbiAgICAgICAgY2FzZSBcInRleHRcIjpcbiAgICAgICAgICAgIHNldChcInhcIiwgZ2V0Vyk7XG4gICAgICAgICAgICBzZXQoXCJ5XCIsIGdldEgpO1xuICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcImNpcmNsZVwiOlxuICAgICAgICAgICAgc2V0KFwiY3hcIiwgZ2V0Vyk7XG4gICAgICAgICAgICBzZXQoXCJjeVwiLCBnZXRIKTtcbiAgICAgICAgICAgIHNldChcInJcIiwgZ2V0Vyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwiZWxsaXBzZVwiOlxuICAgICAgICAgICAgc2V0KFwiY3hcIiwgZ2V0Vyk7XG4gICAgICAgICAgICBzZXQoXCJjeVwiLCBnZXRIKTtcbiAgICAgICAgICAgIHNldChcInJ4XCIsIGdldFcpO1xuICAgICAgICAgICAgc2V0KFwicnlcIiwgZ2V0SCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwibGluZVwiOlxuICAgICAgICAgICAgc2V0KFwieDFcIiwgZ2V0Vyk7XG4gICAgICAgICAgICBzZXQoXCJ4MlwiLCBnZXRXKTtcbiAgICAgICAgICAgIHNldChcInkxXCIsIGdldEgpO1xuICAgICAgICAgICAgc2V0KFwieTJcIiwgZ2V0SCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIFwibWFya2VyXCI6XG4gICAgICAgICAgICBzZXQoXCJyZWZYXCIsIGdldFcpO1xuICAgICAgICAgICAgc2V0KFwibWFya2VyV2lkdGhcIiwgZ2V0Vyk7XG4gICAgICAgICAgICBzZXQoXCJyZWZZXCIsIGdldEgpO1xuICAgICAgICAgICAgc2V0KFwibWFya2VySGVpZ2h0XCIsIGdldEgpO1xuICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcInJhZGlhbEdyYWRpZW50XCI6XG4gICAgICAgICAgICBzZXQoXCJmeFwiLCBnZXRXKTtcbiAgICAgICAgICAgIHNldChcImZ5XCIsIGdldEgpO1xuICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBcInRzcGFuXCI6XG4gICAgICAgICAgICBzZXQoXCJkeFwiLCBnZXRXKTtcbiAgICAgICAgICAgIHNldChcImR5XCIsIGdldEgpO1xuICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHNldChuYW1lLCBnZXRXKTtcbiAgICB9XG4gICAgcmV0dXJuIG91dDtcbn1cbi8qXFxcbiAqIFNuYXAuc2VsZWN0XG4gWyBtZXRob2QgXVxuICoqXG4gKiBXcmFwcyBhIERPTSBlbGVtZW50IHNwZWNpZmllZCBieSBDU1Mgc2VsZWN0b3IgYXMgQEVsZW1lbnRcbiAtIHF1ZXJ5IChzdHJpbmcpIENTUyBzZWxlY3RvciBvZiB0aGUgZWxlbWVudFxuID0gKEVsZW1lbnQpIHRoZSBjdXJyZW50IGVsZW1lbnRcblxcKi9cblNuYXAuc2VsZWN0ID0gZnVuY3Rpb24gKHF1ZXJ5KSB7XG4gICAgcmV0dXJuIHdyYXAoZ2xvYi5kb2MucXVlcnlTZWxlY3RvcihxdWVyeSkpO1xufTtcbi8qXFxcbiAqIFNuYXAuc2VsZWN0QWxsXG4gWyBtZXRob2QgXVxuICoqXG4gKiBXcmFwcyBET00gZWxlbWVudHMgc3BlY2lmaWVkIGJ5IENTUyBzZWxlY3RvciBhcyBzZXQgb3IgYXJyYXkgb2YgQEVsZW1lbnRcbiAtIHF1ZXJ5IChzdHJpbmcpIENTUyBzZWxlY3RvciBvZiB0aGUgZWxlbWVudFxuID0gKEVsZW1lbnQpIHRoZSBjdXJyZW50IGVsZW1lbnRcblxcKi9cblNuYXAuc2VsZWN0QWxsID0gZnVuY3Rpb24gKHF1ZXJ5KSB7XG4gICAgdmFyIG5vZGVsaXN0ID0gZ2xvYi5kb2MucXVlcnlTZWxlY3RvckFsbChxdWVyeSksXG4gICAgICAgIHNldCA9IChTbmFwLnNldCB8fCBBcnJheSkoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHNldC5wdXNoKHdyYXAobm9kZWxpc3RbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIHNldDtcbn07XG5cbmZ1bmN0aW9uIGFkZDJncm91cChsaXN0KSB7XG4gICAgaWYgKCFpcyhsaXN0LCBcImFycmF5XCIpKSB7XG4gICAgICAgIGxpc3QgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgIH1cbiAgICB2YXIgaSA9IDAsXG4gICAgICAgIGogPSAwLFxuICAgICAgICBub2RlID0gdGhpcy5ub2RlO1xuICAgIHdoaWxlICh0aGlzW2ldKSBkZWxldGUgdGhpc1tpKytdO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChsaXN0W2ldLnR5cGUgPT0gXCJzZXRcIikge1xuICAgICAgICAgICAgbGlzdFtpXS5mb3JFYWNoKGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoZWwubm9kZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQobGlzdFtpXS5ub2RlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkTm9kZXM7XG4gICAgZm9yIChpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRoaXNbaisrXSA9IHdyYXAoY2hpbGRyZW5baV0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbn1cbmZ1bmN0aW9uIEVsZW1lbnQoZWwpIHtcbiAgICBpZiAoZWwuc25hcCBpbiBodWIpIHtcbiAgICAgICAgcmV0dXJuIGh1YltlbC5zbmFwXTtcbiAgICB9XG4gICAgdmFyIGlkID0gdGhpcy5pZCA9IElEKCksXG4gICAgICAgIHN2ZztcbiAgICB0cnkge1xuICAgICAgICBzdmcgPSBlbC5vd25lclNWR0VsZW1lbnQ7XG4gICAgfSBjYXRjaChlKSB7fVxuICAgIHRoaXMubm9kZSA9IGVsO1xuICAgIGlmIChzdmcpIHtcbiAgICAgICAgdGhpcy5wYXBlciA9IG5ldyBQYXBlcihzdmcpO1xuICAgIH1cbiAgICB0aGlzLnR5cGUgPSBlbC50YWdOYW1lO1xuICAgIHRoaXMuYW5pbXMgPSB7fTtcbiAgICB0aGlzLl8gPSB7XG4gICAgICAgIHRyYW5zZm9ybTogW11cbiAgICB9O1xuICAgIGVsLnNuYXAgPSBpZDtcbiAgICBodWJbaWRdID0gdGhpcztcbiAgICBpZiAodGhpcy50eXBlID09IFwiZ1wiKSB7XG4gICAgICAgIHRoaXMuYWRkID0gYWRkMmdyb3VwO1xuICAgICAgICBmb3IgKHZhciBtZXRob2QgaW4gUGFwZXIucHJvdG90eXBlKSBpZiAoUGFwZXIucHJvdG90eXBlW2hhc10obWV0aG9kKSkge1xuICAgICAgICAgICAgdGhpc1ttZXRob2RdID0gUGFwZXIucHJvdG90eXBlW21ldGhvZF07XG4gICAgICAgIH1cbiAgICB9XG59XG5mdW5jdGlvbiBhcnJheUZpcnN0VmFsdWUoYXJyKSB7XG4gICAgdmFyIHJlcztcbiAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBhcnIubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICByZXMgPSByZXMgfHwgYXJyW2ldO1xuICAgICAgICBpZiAocmVzKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9XG4gICAgfVxufVxuKGZ1bmN0aW9uIChlbHByb3RvKSB7XG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQuYXR0clxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogR2V0cyBvciBzZXRzIGdpdmVuIGF0dHJpYnV0ZXMgb2YgdGhlIGVsZW1lbnRcbiAgICAgKipcbiAgICAgLSBwYXJhbXMgKG9iamVjdCkgY29udGFpbnMga2V5LXZhbHVlIHBhaXJzIG9mIGF0dHJpYnV0ZXMgeW91IHdhbnQgdG8gc2V0XG4gICAgICogb3JcbiAgICAgLSBwYXJhbSAoc3RyaW5nKSBuYW1lIG9mIHRoZSBhdHRyaWJ1dGVcbiAgICAgPSAoRWxlbWVudCkgdGhlIGN1cnJlbnQgZWxlbWVudFxuICAgICAqIG9yXG4gICAgID0gKHN0cmluZykgdmFsdWUgb2YgYXR0cmlidXRlXG4gICAgID4gVXNhZ2VcbiAgICAgfCBlbC5hdHRyKHtcbiAgICAgfCAgICAgZmlsbDogXCIjZmMwXCIsXG4gICAgIHwgICAgIHN0cm9rZTogXCIjMDAwXCIsXG4gICAgIHwgICAgIHN0cm9rZVdpZHRoOiAyLCAvLyBDYW1lbENhc2UuLi5cbiAgICAgfCAgICAgXCJmaWxsLW9wYWNpdHlcIjogMC41IC8vIG9yIGRhc2gtc2VwYXJhdGVkIG5hbWVzXG4gICAgIHwgfSk7XG4gICAgIHwgY29uc29sZS5sb2coZWwuYXR0cihcImZpbGxcIikpOyAvLyAjZmMwXG4gICAgXFwqL1xuICAgIGVscHJvdG8uYXR0ciA9IGZ1bmN0aW9uIChwYXJhbXMsIHZhbHVlKSB7XG4gICAgICAgIHZhciBlbCA9IHRoaXMsXG4gICAgICAgICAgICBub2RlID0gZWwubm9kZTtcbiAgICAgICAgaWYgKCFwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybiBlbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXMocGFyYW1zLCBcInN0cmluZ1wiKSkge1xuICAgICAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgdmFyIGpzb24gPSB7fTtcbiAgICAgICAgICAgICAgICBqc29uW3BhcmFtc10gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBwYXJhbXMgPSBqc29uO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJyYXlGaXJzdFZhbHVlKGV2ZShcInNuYXAudXRpbC5nZXRhdHRyLlwiK3BhcmFtcywgZWwpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBhdHQgaW4gcGFyYW1zKSB7XG4gICAgICAgICAgICBpZiAocGFyYW1zW2hhc10oYXR0KSkge1xuICAgICAgICAgICAgICAgIGV2ZShcInNuYXAudXRpbC5hdHRyLlwiICsgYXR0LCBlbCwgcGFyYW1zW2F0dF0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbDtcbiAgICB9O1xuLy8gU0lFUlJBIEVsZW1lbnQuZ2V0QkJveCgpOiBVbmNsZWFyIHdoeSB5b3Ugd291bGQgd2FudCB0byBleHByZXNzIHRoZSBkaW1lbnNpb24gb2YgdGhlIGJveCBhcyBhIHBhdGguXG4vLyBTSUVSUkEgRWxlbWVudC5nZXRCQm94KCk6IFVuY2xlYXIgd2h5IHlvdSB3b3VsZCB3YW50IHRvIHVzZSByMC9yMS9yMi4gQWxzbywgYmFzaWMgZGVmaW5pdGlvbnM6IHdvdWxkbid0IHRoZSBfc21hbGxlc3QgY2lyY2xlIHRoYXQgY2FuIGJlIGVuY2xvc2VkXyBiZSBhIHplcm8tcmFkaXVzIHBvaW50P1xuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LmdldEJCb3hcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJldHVybnMgdGhlIGJvdW5kaW5nIGJveCBkZXNjcmlwdG9yIGZvciB0aGUgZ2l2ZW4gZWxlbWVudFxuICAgICAqKlxuICAgICA9IChvYmplY3QpIGJvdW5kaW5nIGJveCBkZXNjcmlwdG9yOlxuICAgICBvIHtcbiAgICAgbyAgICAgY3g6IChudW1iZXIpIHggb2YgdGhlIGNlbnRlcixcbiAgICAgbyAgICAgY3k6IChudW1iZXIpIHggb2YgdGhlIGNlbnRlcixcbiAgICAgbyAgICAgaDogKG51bWJlcikgaGVpZ2h0LFxuICAgICBvICAgICBoZWlnaHQ6IChudW1iZXIpIGhlaWdodCxcbiAgICAgbyAgICAgcGF0aDogKHN0cmluZykgcGF0aCBjb21tYW5kIGZvciB0aGUgYm94LFxuICAgICBvICAgICByMDogKG51bWJlcikgcmFkaXVzIG9mIGEgY2lyY2xlIHRoYXQgZnVsbHkgZW5jbG9zZXMgdGhlIGJveCxcbiAgICAgbyAgICAgcjE6IChudW1iZXIpIHJhZGl1cyBvZiB0aGUgc21hbGxlc3QgY2lyY2xlIHRoYXQgY2FuIGJlIGVuY2xvc2VkLFxuICAgICBvICAgICByMjogKG51bWJlcikgcmFkaXVzIG9mIHRoZSBsYXJnZXN0IGNpcmNsZSB0aGF0IGNhbiBiZSBlbmNsb3NlZCxcbiAgICAgbyAgICAgdmI6IChzdHJpbmcpIGJveCBhcyBhIHZpZXdib3ggY29tbWFuZCxcbiAgICAgbyAgICAgdzogKG51bWJlcikgd2lkdGgsXG4gICAgIG8gICAgIHdpZHRoOiAobnVtYmVyKSB3aWR0aCxcbiAgICAgbyAgICAgeDI6IChudW1iZXIpIHggb2YgdGhlIHJpZ2h0IHNpZGUsXG4gICAgIG8gICAgIHg6IChudW1iZXIpIHggb2YgdGhlIGxlZnQgc2lkZSxcbiAgICAgbyAgICAgeTI6IChudW1iZXIpIHkgb2YgdGhlIGJvdHRvbSBlZGdlLFxuICAgICBvICAgICB5OiAobnVtYmVyKSB5IG9mIHRoZSB0b3AgZWRnZVxuICAgICBvIH1cbiAgICBcXCovXG4gICAgZWxwcm90by5nZXRCQm94ID0gZnVuY3Rpb24gKGlzV2l0aG91dFRyYW5zZm9ybSkge1xuICAgICAgICB2YXIgZWwgPSB0aGlzO1xuICAgICAgICBpZiAoZWwudHlwZSA9PSBcInVzZVwiKSB7XG4gICAgICAgICAgICBlbCA9IGVsLm9yaWdpbmFsO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbC5yZW1vdmVkKSB7XG4gICAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF8gPSBlbC5fO1xuICAgICAgICBpZiAoaXNXaXRob3V0VHJhbnNmb3JtKSB7XG4gICAgICAgICAgICBfLmJib3h3dCA9IFNuYXAucGF0aC5nZXRbZWwudHlwZV0gPyBTbmFwLnBhdGguZ2V0QkJveChlbC5yZWFsUGF0aCA9IFNuYXAucGF0aC5nZXRbZWwudHlwZV0oZWwpKSA6IFNuYXAuXy5ib3goZWwubm9kZS5nZXRCQm94KCkpO1xuICAgICAgICAgICAgcmV0dXJuIFNuYXAuXy5ib3goXy5iYm94d3QpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWwucmVhbFBhdGggPSAoU25hcC5wYXRoLmdldFtlbC50eXBlXSB8fCBTbmFwLnBhdGguZ2V0LmRlZmx0KShlbCk7XG4gICAgICAgICAgICBfLmJib3ggPSBTbmFwLnBhdGguZ2V0QkJveChTbmFwLnBhdGgubWFwKGVsLnJlYWxQYXRoLCBlbC5tYXRyaXgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gU25hcC5fLmJveChfLmJib3gpO1xuICAgIH07XG4gICAgdmFyIHByb3BTdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN0cmluZztcbiAgICB9O1xuLy8gU0lFUlJBIEVsZW1lbnQudHJhbnNmb3JtKCk6IHNlZW1zIHRvIGFsbG93IHR3byByZXR1cm4gdmFsdWVzLCBvbmUgb2Ygd2hpY2ggKF9FbGVtZW50XykgaXMgdW5kZWZpbmVkLlxuLy8gU0lFUlJBIEVsZW1lbnQudHJhbnNmb3JtKCk6IGlmIHRoaXMgb25seSBhY2NlcHRzIG9uZSBhcmd1bWVudCwgaXQncyB1bmNsZWFyIGhvdyBpdCBjYW4gYm90aCBfZ2V0XyBhbmQgX3NldF8gYSB0cmFuc2Zvcm0uXG4vLyBTSUVSUkEgRWxlbWVudC50cmFuc2Zvcm0oKTogVW5jbGVhciBob3cgU25hcCB0cmFuc2Zvcm0gc3RyaW5nIGZvcm1hdCBkaWZmZXJzIGZyb20gU1ZHJ3MuXG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQudHJhbnNmb3JtXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBHZXRzIG9yIHNldHMgdHJhbnNmb3JtYXRpb24gb2YgdGhlIGVsZW1lbnRcbiAgICAgKipcbiAgICAgLSB0c3RyIChzdHJpbmcpIHRyYW5zZm9ybSBzdHJpbmcgaW4gU25hcCBvciBTVkcgZm9ybWF0XG4gICAgID0gKEVsZW1lbnQpIHRoZSBjdXJyZW50IGVsZW1lbnRcbiAgICAgKiBvclxuICAgICA9IChvYmplY3QpIHRyYW5zZm9ybWF0aW9uIGRlc2NyaXB0b3I6XG4gICAgIG8ge1xuICAgICBvICAgICBzdHJpbmcgKHN0cmluZykgdHJhbnNmb3JtIHN0cmluZyxcbiAgICAgbyAgICAgZ2xvYmFsTWF0cml4IChNYXRyaXgpIG1hdHJpeCBvZiBhbGwgdHJhbnNmb3JtYXRpb25zIGFwcGxpZWQgdG8gZWxlbWVudCBvciBpdHMgcGFyZW50cyxcbiAgICAgbyAgICAgbG9jYWxNYXRyaXggKE1hdHJpeCkgbWF0cml4IG9mIHRyYW5zZm9ybWF0aW9ucyBhcHBsaWVkIG9ubHkgdG8gdGhlIGVsZW1lbnQsXG4gICAgIG8gICAgIGRpZmZNYXRyaXggKE1hdHJpeCkgbWF0cml4IG9mIGRpZmZlcmVuY2UgYmV0d2VlbiBnbG9iYWwgYW5kIGxvY2FsIHRyYW5zZm9ybWF0aW9ucyxcbiAgICAgbyAgICAgZ2xvYmFsIChzdHJpbmcpIGdsb2JhbCB0cmFuc2Zvcm1hdGlvbiBhcyBzdHJpbmcsXG4gICAgIG8gICAgIGxvY2FsIChzdHJpbmcpIGxvY2FsIHRyYW5zZm9ybWF0aW9uIGFzIHN0cmluZyxcbiAgICAgbyAgICAgdG9TdHJpbmcgKGZ1bmN0aW9uKSByZXR1cm5zIGBzdHJpbmdgIHByb3BlcnR5XG4gICAgIG8gfVxuICAgIFxcKi9cbiAgICBlbHByb3RvLnRyYW5zZm9ybSA9IGZ1bmN0aW9uICh0c3RyKSB7XG4gICAgICAgIHZhciBfID0gdGhpcy5fO1xuICAgICAgICBpZiAodHN0ciA9PSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgZ2xvYmFsID0gbmV3IE1hdHJpeCh0aGlzLm5vZGUuZ2V0Q1RNKCkpLFxuICAgICAgICAgICAgICAgIGxvY2FsID0gZXh0cmFjdFRyYW5zZm9ybSh0aGlzKSxcbiAgICAgICAgICAgICAgICBsb2NhbFN0cmluZyA9IGxvY2FsLnRvVHJhbnNmb3JtU3RyaW5nKCksXG4gICAgICAgICAgICAgICAgc3RyaW5nID0gU3RyKGxvY2FsKSA9PSBTdHIodGhpcy5tYXRyaXgpID9cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLnRyYW5zZm9ybSA6IGxvY2FsU3RyaW5nO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdHJpbmc6IHN0cmluZyxcbiAgICAgICAgICAgICAgICBnbG9iYWxNYXRyaXg6IGdsb2JhbCxcbiAgICAgICAgICAgICAgICBsb2NhbE1hdHJpeDogbG9jYWwsXG4gICAgICAgICAgICAgICAgZGlmZk1hdHJpeDogZ2xvYmFsLmNsb25lKCkuYWRkKGxvY2FsLmludmVydCgpKSxcbiAgICAgICAgICAgICAgICBnbG9iYWw6IGdsb2JhbC50b1RyYW5zZm9ybVN0cmluZygpLFxuICAgICAgICAgICAgICAgIGxvY2FsOiBsb2NhbFN0cmluZyxcbiAgICAgICAgICAgICAgICB0b1N0cmluZzogcHJvcFN0cmluZ1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHN0ciBpbnN0YW5jZW9mIE1hdHJpeCkge1xuICAgICAgICAgICAgLy8gbWF5IGJlIG5lZWQgdG8gYXBwbHkgaXQgZGlyZWN0bHlcbiAgICAgICAgICAgIC8vIFRPRE86IGludmVzdGlnYXRlXG4gICAgICAgICAgICB0c3RyID0gdHN0ci50b1RyYW5zZm9ybVN0cmluZygpO1xuICAgICAgICB9XG4gICAgICAgIGV4dHJhY3RUcmFuc2Zvcm0odGhpcywgdHN0cik7XG5cbiAgICAgICAgaWYgKHRoaXMubm9kZSkge1xuICAgICAgICAgICAgaWYgKHRoaXMudHlwZSA9PSBcImxpbmVhckdyYWRpZW50XCIgfHwgdGhpcy50eXBlID09IFwicmFkaWFsR3JhZGllbnRcIikge1xuICAgICAgICAgICAgICAgICQodGhpcy5ub2RlLCB7Z3JhZGllbnRUcmFuc2Zvcm06IHRoaXMubWF0cml4fSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMudHlwZSA9PSBcInBhdHRlcm5cIikge1xuICAgICAgICAgICAgICAgICQodGhpcy5ub2RlLCB7cGF0dGVyblRyYW5zZm9ybTogdGhpcy5tYXRyaXh9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJCh0aGlzLm5vZGUsIHt0cmFuc2Zvcm06IHRoaXMubWF0cml4fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LnBhcmVudFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogUmV0dXJucyB0aGUgZWxlbWVudCdzIHBhcmVudFxuICAgICAqKlxuICAgICA9IChFbGVtZW50KSB0aGUgcGFyZW50IGVsZW1lbnRcbiAgICBcXCovXG4gICAgZWxwcm90by5wYXJlbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB3cmFwKHRoaXMubm9kZS5wYXJlbnROb2RlKTtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LmFwcGVuZFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQXBwZW5kcyB0aGUgZ2l2ZW4gZWxlbWVudCB0byBjdXJyZW50IG9uZVxuICAgICAqKlxuICAgICAtIGVsIChFbGVtZW50fFNldCkgZWxlbWVudCB0byBhcHBlbmRcbiAgICAgPSAoRWxlbWVudCkgdGhlIHBhcmVudCBlbGVtZW50XG4gICAgXFwqL1xuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LmFkZFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogU2VlIEBFbGVtZW50LmFwcGVuZFxuICAgIFxcKi9cbiAgICBlbHByb3RvLmFwcGVuZCA9IGVscHJvdG8uYWRkID0gZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgIGlmIChlbCkge1xuICAgICAgICAgICAgaWYgKGVsLnR5cGUgPT0gXCJzZXRcIikge1xuICAgICAgICAgICAgICAgIHZhciBpdCA9IHRoaXM7XG4gICAgICAgICAgICAgICAgZWwuZm9yRWFjaChmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgaXQuYWRkKGVsKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsID0gd3JhcChlbCk7XG4gICAgICAgICAgICB0aGlzLm5vZGUuYXBwZW5kQ2hpbGQoZWwubm9kZSk7XG4gICAgICAgICAgICBlbC5wYXBlciA9IHRoaXMucGFwZXI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogRWxlbWVudC5hcHBlbmRUb1xuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQXBwZW5kcyB0aGUgY3VycmVudCBlbGVtZW50IHRvIHRoZSBnaXZlbiBvbmVcbiAgICAgKipcbiAgICAgLSBlbCAoRWxlbWVudCkgcGFyZW50IGVsZW1lbnQgdG8gYXBwZW5kIHRvXG4gICAgID0gKEVsZW1lbnQpIHRoZSBjaGlsZCBlbGVtZW50XG4gICAgXFwqL1xuICAgIGVscHJvdG8uYXBwZW5kVG8gPSBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgaWYgKGVsKSB7XG4gICAgICAgICAgICBlbCA9IHdyYXAoZWwpO1xuICAgICAgICAgICAgZWwuYXBwZW5kKHRoaXMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQucHJlcGVuZFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogUHJlcGVuZHMgdGhlIGdpdmVuIGVsZW1lbnQgdG8gdGhlIGN1cnJlbnQgb25lXG4gICAgICoqXG4gICAgIC0gZWwgKEVsZW1lbnQpIGVsZW1lbnQgdG8gcHJlcGVuZFxuICAgICA9IChFbGVtZW50KSB0aGUgcGFyZW50IGVsZW1lbnRcbiAgICBcXCovXG4gICAgZWxwcm90by5wcmVwZW5kID0gZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgIGlmIChlbCkge1xuICAgICAgICAgICAgZWwgPSB3cmFwKGVsKTtcbiAgICAgICAgICAgIHZhciBwYXJlbnQgPSBlbC5wYXJlbnQoKTtcbiAgICAgICAgICAgIHRoaXMubm9kZS5pbnNlcnRCZWZvcmUoZWwubm9kZSwgdGhpcy5ub2RlLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgdGhpcy5hZGQgJiYgdGhpcy5hZGQoKTtcbiAgICAgICAgICAgIGVsLnBhcGVyID0gdGhpcy5wYXBlcjtcbiAgICAgICAgICAgIHRoaXMucGFyZW50KCkgJiYgdGhpcy5wYXJlbnQoKS5hZGQoKTtcbiAgICAgICAgICAgIHBhcmVudCAmJiBwYXJlbnQuYWRkKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogRWxlbWVudC5wcmVwZW5kVG9cbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFByZXBlbmRzIHRoZSBjdXJyZW50IGVsZW1lbnQgdG8gdGhlIGdpdmVuIG9uZVxuICAgICAqKlxuICAgICAtIGVsIChFbGVtZW50KSBwYXJlbnQgZWxlbWVudCB0byBwcmVwZW5kIHRvXG4gICAgID0gKEVsZW1lbnQpIHRoZSBjaGlsZCBlbGVtZW50XG4gICAgXFwqL1xuICAgIGVscHJvdG8ucHJlcGVuZFRvID0gZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgIGVsID0gd3JhcChlbCk7XG4gICAgICAgIGVsLnByZXBlbmQodGhpcyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQuYmVmb3JlXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBJbnNlcnRzIGdpdmVuIGVsZW1lbnQgYmVmb3JlIHRoZSBjdXJyZW50IG9uZVxuICAgICAqKlxuICAgICAtIGVsIChFbGVtZW50KSBlbGVtZW50IHRvIGluc2VydFxuICAgICA9IChFbGVtZW50KSB0aGUgcGFyZW50IGVsZW1lbnRcbiAgICBcXCovXG4gICAgZWxwcm90by5iZWZvcmUgPSBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgaWYgKGVsLnR5cGUgPT0gXCJzZXRcIikge1xuICAgICAgICAgICAgdmFyIGl0ID0gdGhpcztcbiAgICAgICAgICAgIGVsLmZvckVhY2goZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhcmVudCA9IGVsLnBhcmVudCgpO1xuICAgICAgICAgICAgICAgIGl0Lm5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoZWwubm9kZSwgaXQubm9kZSk7XG4gICAgICAgICAgICAgICAgcGFyZW50ICYmIHBhcmVudC5hZGQoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgdGhpcy5wYXJlbnQoKS5hZGQoKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGVsID0gd3JhcChlbCk7XG4gICAgICAgIHZhciBwYXJlbnQgPSBlbC5wYXJlbnQoKTtcbiAgICAgICAgdGhpcy5ub2RlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGVsLm5vZGUsIHRoaXMubm9kZSk7XG4gICAgICAgIHRoaXMucGFyZW50KCkgJiYgdGhpcy5wYXJlbnQoKS5hZGQoKTtcbiAgICAgICAgcGFyZW50ICYmIHBhcmVudC5hZGQoKTtcbiAgICAgICAgZWwucGFwZXIgPSB0aGlzLnBhcGVyO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LmFmdGVyXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBJbnNlcnRzIGdpdmVuIGVsZW1lbnQgYWZ0ZXIgdGhlIGN1cnJlbnQgb25lXG4gICAgICoqXG4gICAgIC0gZWwgKEVsZW1lbnQpIGVsZW1lbnQgdG8gaW5zZXJ0XG4gICAgID0gKEVsZW1lbnQpIHRoZSBwYXJlbnQgZWxlbWVudFxuICAgIFxcKi9cbiAgICBlbHByb3RvLmFmdGVyID0gZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgIGVsID0gd3JhcChlbCk7XG4gICAgICAgIHZhciBwYXJlbnQgPSBlbC5wYXJlbnQoKTtcbiAgICAgICAgaWYgKHRoaXMubm9kZS5uZXh0U2libGluZykge1xuICAgICAgICAgICAgdGhpcy5ub2RlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGVsLm5vZGUsIHRoaXMubm9kZS5uZXh0U2libGluZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm5vZGUucGFyZW50Tm9kZS5hcHBlbmRDaGlsZChlbC5ub2RlKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnBhcmVudCgpICYmIHRoaXMucGFyZW50KCkuYWRkKCk7XG4gICAgICAgIHBhcmVudCAmJiBwYXJlbnQuYWRkKCk7XG4gICAgICAgIGVsLnBhcGVyID0gdGhpcy5wYXBlcjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogRWxlbWVudC5pbnNlcnRCZWZvcmVcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIEluc2VydHMgdGhlIGVsZW1lbnQgYWZ0ZXIgdGhlIGdpdmVuIG9uZVxuICAgICAqKlxuICAgICAtIGVsIChFbGVtZW50KSBlbGVtZW50IG5leHQgdG8gd2hvbSBpbnNlcnQgdG9cbiAgICAgPSAoRWxlbWVudCkgdGhlIHBhcmVudCBlbGVtZW50XG4gICAgXFwqL1xuICAgIGVscHJvdG8uaW5zZXJ0QmVmb3JlID0gZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgIGVsID0gd3JhcChlbCk7XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLnBhcmVudCgpO1xuICAgICAgICBlbC5ub2RlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubm9kZSwgZWwubm9kZSk7XG4gICAgICAgIHRoaXMucGFwZXIgPSBlbC5wYXBlcjtcbiAgICAgICAgcGFyZW50ICYmIHBhcmVudC5hZGQoKTtcbiAgICAgICAgZWwucGFyZW50KCkgJiYgZWwucGFyZW50KCkuYWRkKCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQuaW5zZXJ0QWZ0ZXJcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIEluc2VydHMgdGhlIGVsZW1lbnQgYWZ0ZXIgdGhlIGdpdmVuIG9uZVxuICAgICAqKlxuICAgICAtIGVsIChFbGVtZW50KSBlbGVtZW50IG5leHQgdG8gd2hvbSBpbnNlcnQgdG9cbiAgICAgPSAoRWxlbWVudCkgdGhlIHBhcmVudCBlbGVtZW50XG4gICAgXFwqL1xuICAgIGVscHJvdG8uaW5zZXJ0QWZ0ZXIgPSBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgZWwgPSB3cmFwKGVsKTtcbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMucGFyZW50KCk7XG4gICAgICAgIGVsLm5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5ub2RlLCBlbC5ub2RlLm5leHRTaWJsaW5nKTtcbiAgICAgICAgdGhpcy5wYXBlciA9IGVsLnBhcGVyO1xuICAgICAgICBwYXJlbnQgJiYgcGFyZW50LmFkZCgpO1xuICAgICAgICBlbC5wYXJlbnQoKSAmJiBlbC5wYXJlbnQoKS5hZGQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogRWxlbWVudC5yZW1vdmVcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJlbW92ZXMgZWxlbWVudCBmcm9tIHRoZSBET01cbiAgICAgPSAoRWxlbWVudCkgdGhlIGRldGFjaGVkIGVsZW1lbnRcbiAgICBcXCovXG4gICAgZWxwcm90by5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLnBhcmVudCgpO1xuICAgICAgICB0aGlzLm5vZGUucGFyZW50Tm9kZSAmJiB0aGlzLm5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLm5vZGUpO1xuICAgICAgICBkZWxldGUgdGhpcy5wYXBlcjtcbiAgICAgICAgdGhpcy5yZW1vdmVkID0gdHJ1ZTtcbiAgICAgICAgcGFyZW50ICYmIHBhcmVudC5hZGQoKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogRWxlbWVudC5zZWxlY3RcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIEdhdGhlcnMgdGhlIG5lc3RlZCBARWxlbWVudCBtYXRjaGluZyB0aGUgZ2l2ZW4gc2V0IG9mIENTUyBzZWxlY3RvcnNcbiAgICAgKipcbiAgICAgLSBxdWVyeSAoc3RyaW5nKSBDU1Mgc2VsZWN0b3JcbiAgICAgPSAoRWxlbWVudCkgcmVzdWx0IG9mIHF1ZXJ5IHNlbGVjdGlvblxuICAgIFxcKi9cbiAgICBlbHByb3RvLnNlbGVjdCA9IGZ1bmN0aW9uIChxdWVyeSkge1xuICAgICAgICByZXR1cm4gd3JhcCh0aGlzLm5vZGUucXVlcnlTZWxlY3RvcihxdWVyeSkpO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQuc2VsZWN0QWxsXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBHYXRoZXJzIG5lc3RlZCBARWxlbWVudCBvYmplY3RzIG1hdGNoaW5nIHRoZSBnaXZlbiBzZXQgb2YgQ1NTIHNlbGVjdG9yc1xuICAgICAqKlxuICAgICAtIHF1ZXJ5IChzdHJpbmcpIENTUyBzZWxlY3RvclxuICAgICA9IChTZXR8YXJyYXkpIHJlc3VsdCBvZiBxdWVyeSBzZWxlY3Rpb25cbiAgICBcXCovXG4gICAgZWxwcm90by5zZWxlY3RBbGwgPSBmdW5jdGlvbiAocXVlcnkpIHtcbiAgICAgICAgdmFyIG5vZGVsaXN0ID0gdGhpcy5ub2RlLnF1ZXJ5U2VsZWN0b3JBbGwocXVlcnkpLFxuICAgICAgICAgICAgc2V0ID0gKFNuYXAuc2V0IHx8IEFycmF5KSgpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBzZXQucHVzaCh3cmFwKG5vZGVsaXN0W2ldKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNldDtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LmFzUFhcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJldHVybnMgZ2l2ZW4gYXR0cmlidXRlIG9mIHRoZSBlbGVtZW50IGFzIGEgYHB4YCB2YWx1ZSAobm90ICUsIGVtLCBldGMuKVxuICAgICAqKlxuICAgICAtIGF0dHIgKHN0cmluZykgYXR0cmlidXRlIG5hbWVcbiAgICAgLSB2YWx1ZSAoc3RyaW5nKSAjb3B0aW9uYWwgYXR0cmlidXRlIHZhbHVlXG4gICAgID0gKEVsZW1lbnQpIHJlc3VsdCBvZiBxdWVyeSBzZWxlY3Rpb25cbiAgICBcXCovXG4gICAgZWxwcm90by5hc1BYID0gZnVuY3Rpb24gKGF0dHIsIHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZSA9PSBudWxsKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHRoaXMuYXR0cihhdHRyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gK3VuaXQycHgodGhpcywgYXR0ciwgdmFsdWUpO1xuICAgIH07XG4gICAgLy8gU0lFUlJBIEVsZW1lbnQudXNlKCk6IEkgc3VnZ2VzdCBhZGRpbmcgYSBub3RlIGFib3V0IGhvdyB0byBhY2Nlc3MgdGhlIG9yaWdpbmFsIGVsZW1lbnQgdGhlIHJldHVybmVkIDx1c2U+IGluc3RhbnRpYXRlcy4gSXQncyBhIHBhcnQgb2YgU1ZHIHdpdGggd2hpY2ggb3JkaW5hcnkgd2ViIGRldmVsb3BlcnMgbWF5IGJlIGxlYXN0IGZhbWlsaWFyLlxuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LnVzZVxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQ3JlYXRlcyBhIGA8dXNlPmAgZWxlbWVudCBsaW5rZWQgdG8gdGhlIGN1cnJlbnQgZWxlbWVudFxuICAgICAqKlxuICAgICA9IChFbGVtZW50KSB0aGUgYDx1c2U+YCBlbGVtZW50XG4gICAgXFwqL1xuICAgIGVscHJvdG8udXNlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdXNlLFxuICAgICAgICAgICAgaWQgPSB0aGlzLm5vZGUuaWQ7XG4gICAgICAgIGlmICghaWQpIHtcbiAgICAgICAgICAgIGlkID0gdGhpcy5pZDtcbiAgICAgICAgICAgICQodGhpcy5ub2RlLCB7XG4gICAgICAgICAgICAgICAgaWQ6IGlkXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy50eXBlID09IFwibGluZWFyR3JhZGllbnRcIiB8fCB0aGlzLnR5cGUgPT0gXCJyYWRpYWxHcmFkaWVudFwiIHx8XG4gICAgICAgICAgICB0aGlzLnR5cGUgPT0gXCJwYXR0ZXJuXCIpIHtcbiAgICAgICAgICAgIHVzZSA9IG1ha2UodGhpcy50eXBlLCB0aGlzLm5vZGUucGFyZW50Tm9kZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB1c2UgPSBtYWtlKFwidXNlXCIsIHRoaXMubm9kZS5wYXJlbnROb2RlKTtcbiAgICAgICAgfVxuICAgICAgICAkKHVzZS5ub2RlLCB7XG4gICAgICAgICAgICBcInhsaW5rOmhyZWZcIjogXCIjXCIgKyBpZFxuICAgICAgICB9KTtcbiAgICAgICAgdXNlLm9yaWdpbmFsID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHVzZTtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LmNsb25lXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBDcmVhdGVzIGEgY2xvbmUgb2YgdGhlIGVsZW1lbnQgYW5kIGluc2VydHMgaXQgYWZ0ZXIgdGhlIGVsZW1lbnRcbiAgICAgKipcbiAgICAgPSAoRWxlbWVudCkgdGhlIGNsb25lXG4gICAgXFwqL1xuICAgIGZ1bmN0aW9uIGZpeGlkcyhlbCkge1xuICAgICAgICB2YXIgZWxzID0gZWwuc2VsZWN0QWxsKFwiKlwiKSxcbiAgICAgICAgICAgIGl0LFxuICAgICAgICAgICAgdXJsID0gL15cXHMqdXJsXFwoKFwifCd8KSguKilcXDFcXClcXHMqJC8sXG4gICAgICAgICAgICBpZHMgPSBbXSxcbiAgICAgICAgICAgIHVzZXMgPSB7fTtcbiAgICAgICAgZnVuY3Rpb24gdXJsdGVzdChpdCwgbmFtZSkge1xuICAgICAgICAgICAgdmFyIHZhbCA9ICQoaXQubm9kZSwgbmFtZSk7XG4gICAgICAgICAgICB2YWwgPSB2YWwgJiYgdmFsLm1hdGNoKHVybCk7XG4gICAgICAgICAgICB2YWwgPSB2YWwgJiYgdmFsWzJdO1xuICAgICAgICAgICAgaWYgKHZhbCAmJiB2YWwuY2hhckF0KCkgPT0gXCIjXCIpIHtcbiAgICAgICAgICAgICAgICB2YWwgPSB2YWwuc3Vic3RyaW5nKDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsKSB7XG4gICAgICAgICAgICAgICAgdXNlc1t2YWxdID0gKHVzZXNbdmFsXSB8fCBbXSkuY29uY2F0KGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXR0ciA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBhdHRyW25hbWVdID0gVVJMKGlkKTtcbiAgICAgICAgICAgICAgICAgICAgJChpdC5ub2RlLCBhdHRyKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBsaW5rdGVzdChpdCkge1xuICAgICAgICAgICAgdmFyIHZhbCA9ICQoaXQubm9kZSwgXCJ4bGluazpocmVmXCIpO1xuICAgICAgICAgICAgaWYgKHZhbCAmJiB2YWwuY2hhckF0KCkgPT0gXCIjXCIpIHtcbiAgICAgICAgICAgICAgICB2YWwgPSB2YWwuc3Vic3RyaW5nKDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodmFsKSB7XG4gICAgICAgICAgICAgICAgdXNlc1t2YWxdID0gKHVzZXNbdmFsXSB8fCBbXSkuY29uY2F0KGZ1bmN0aW9uIChpZCkge1xuICAgICAgICAgICAgICAgICAgICBpdC5hdHRyKFwieGxpbms6aHJlZlwiLCBcIiNcIiArIGlkKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBlbHMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgaXQgPSBlbHNbaV07XG4gICAgICAgICAgICB1cmx0ZXN0KGl0LCBcImZpbGxcIik7XG4gICAgICAgICAgICB1cmx0ZXN0KGl0LCBcInN0cm9rZVwiKTtcbiAgICAgICAgICAgIHVybHRlc3QoaXQsIFwiZmlsdGVyXCIpO1xuICAgICAgICAgICAgdXJsdGVzdChpdCwgXCJtYXNrXCIpO1xuICAgICAgICAgICAgdXJsdGVzdChpdCwgXCJjbGlwLXBhdGhcIik7XG4gICAgICAgICAgICBsaW5rdGVzdChpdCk7XG4gICAgICAgICAgICB2YXIgb2xkaWQgPSAkKGl0Lm5vZGUsIFwiaWRcIik7XG4gICAgICAgICAgICBpZiAob2xkaWQpIHtcbiAgICAgICAgICAgICAgICAkKGl0Lm5vZGUsIHtpZDogaXQuaWR9KTtcbiAgICAgICAgICAgICAgICBpZHMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG9sZDogb2xkaWQsXG4gICAgICAgICAgICAgICAgICAgIGlkOiBpdC5pZFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDAsIGlpID0gaWRzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBmcyA9IHVzZXNbaWRzW2ldLm9sZF07XG4gICAgICAgICAgICBpZiAoZnMpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMCwgamogPSBmcy5sZW5ndGg7IGogPCBqajsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIGZzW2pdKGlkc1tpXS5pZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGVscHJvdG8uY2xvbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjbG9uZSA9IHdyYXAodGhpcy5ub2RlLmNsb25lTm9kZSh0cnVlKSk7XG4gICAgICAgIGlmICgkKGNsb25lLm5vZGUsIFwiaWRcIikpIHtcbiAgICAgICAgICAgICQoY2xvbmUubm9kZSwge2lkOiBjbG9uZS5pZH0pO1xuICAgICAgICB9XG4gICAgICAgIGZpeGlkcyhjbG9uZSk7XG4gICAgICAgIGNsb25lLmluc2VydEFmdGVyKHRoaXMpO1xuICAgICAgICByZXR1cm4gY2xvbmU7XG4gICAgfTtcbi8vIFNJRVJSQSBFbGVtZW50LnRvRGVmcygpOiBJZiB0aGlzIF9tb3Zlc18gYW4gZWxlbWVudCB0byB0aGUgPGRlZnM+IHJlZ2lvbiwgd2h5IGlzIHRoZSByZXR1cm4gdmFsdWUgYSBfY2xvbmVfPyBBbHNvIHVuY2xlYXIgd2h5IGl0J3MgY2FsbGVkIHRoZSBfcmVsYXRpdmVfIDxkZWZzPiBzZWN0aW9uLiBQZXJoYXBzIF9zaGFyZWRfP1xuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LnRvRGVmc1xuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogTW92ZXMgZWxlbWVudCB0byB0aGUgc2hhcmVkIGA8ZGVmcz5gIGFyZWFcbiAgICAgKipcbiAgICAgPSAoRWxlbWVudCkgdGhlIGNsb25lXG4gICAgXFwqL1xuICAgIGVscHJvdG8udG9EZWZzID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZGVmcyA9IGdldFNvbWVEZWZzKHRoaXMpO1xuICAgICAgICBkZWZzLmFwcGVuZENoaWxkKHRoaXMubm9kZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4vLyBTSUVSUkEgRWxlbWVudC5wYXR0ZXJuKCk6IHgveS93aWR0aC9oZWlnaHQgZGF0YSB0eXBlcyBhcmUgbGlzdGVkIGFzIGJvdGggU3RyaW5nIGFuZCBOdW1iZXIuIElzIHRoYXQgYW4gZXJyb3IsIG9yIGRvZXMgaXQgbWVhbiBzdHJpbmdzIGFyZSBjb2VyY2VkP1xuLy8gU0lFUlJBIEVsZW1lbnQucGF0dGVybigpOiBjbGFyaWZ5IHRoYXQgeC95IGFyZSBvZmZzZXRzIHRoYXQgZS5nLiwgbWF5IGFkZCBndXR0ZXJzIGJldHdlZW4gdGhlIHRpbGVzLlxuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LnBhdHRlcm5cbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIENyZWF0ZXMgYSBgPHBhdHRlcm4+YCBlbGVtZW50IGZyb20gdGhlIGN1cnJlbnQgZWxlbWVudFxuICAgICAqKlxuICAgICAqIFRvIGNyZWF0ZSBhIHBhdHRlcm4geW91IGhhdmUgdG8gc3BlY2lmeSB0aGUgcGF0dGVybiByZWN0OlxuICAgICAtIHggKHN0cmluZ3xudW1iZXIpXG4gICAgIC0geSAoc3RyaW5nfG51bWJlcilcbiAgICAgLSB3aWR0aCAoc3RyaW5nfG51bWJlcilcbiAgICAgLSBoZWlnaHQgKHN0cmluZ3xudW1iZXIpXG4gICAgID0gKEVsZW1lbnQpIHRoZSBgPHBhdHRlcm4+YCBlbGVtZW50XG4gICAgICogWW91IGNhbiB1c2UgcGF0dGVybiBsYXRlciBvbiBhcyBhbiBhcmd1bWVudCBmb3IgYGZpbGxgIGF0dHJpYnV0ZTpcbiAgICAgfCB2YXIgcCA9IHBhcGVyLnBhdGgoXCJNMTAtNS0xMCwxNU0xNSwwLDAsMTVNMC01LTIwLDE1XCIpLmF0dHIoe1xuICAgICB8ICAgICAgICAgZmlsbDogXCJub25lXCIsXG4gICAgIHwgICAgICAgICBzdHJva2U6IFwiI2JhZGE1NVwiLFxuICAgICB8ICAgICAgICAgc3Ryb2tlV2lkdGg6IDVcbiAgICAgfCAgICAgfSkucGF0dGVybigwLCAwLCAxMCwgMTApLFxuICAgICB8ICAgICBjID0gcGFwZXIuY2lyY2xlKDIwMCwgMjAwLCAxMDApO1xuICAgICB8IGMuYXR0cih7XG4gICAgIHwgICAgIGZpbGw6IHBcbiAgICAgfCB9KTtcbiAgICBcXCovXG4gICAgZWxwcm90by5wYXR0ZXJuID0gZnVuY3Rpb24gKHgsIHksIHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgdmFyIHAgPSBtYWtlKFwicGF0dGVyblwiLCBnZXRTb21lRGVmcyh0aGlzKSk7XG4gICAgICAgIGlmICh4ID09IG51bGwpIHtcbiAgICAgICAgICAgIHggPSB0aGlzLmdldEJCb3goKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXMoeCwgXCJvYmplY3RcIikgJiYgXCJ4XCIgaW4geCkge1xuICAgICAgICAgICAgeSA9IHgueTtcbiAgICAgICAgICAgIHdpZHRoID0geC53aWR0aDtcbiAgICAgICAgICAgIGhlaWdodCA9IHguaGVpZ2h0O1xuICAgICAgICAgICAgeCA9IHgueDtcbiAgICAgICAgfVxuICAgICAgICAkKHAubm9kZSwge1xuICAgICAgICAgICAgeDogeCxcbiAgICAgICAgICAgIHk6IHksXG4gICAgICAgICAgICB3aWR0aDogd2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQ6IGhlaWdodCxcbiAgICAgICAgICAgIHBhdHRlcm5Vbml0czogXCJ1c2VyU3BhY2VPblVzZVwiLFxuICAgICAgICAgICAgaWQ6IHAuaWQsXG4gICAgICAgICAgICB2aWV3Qm94OiBbeCwgeSwgd2lkdGgsIGhlaWdodF0uam9pbihcIiBcIilcbiAgICAgICAgfSk7XG4gICAgICAgIHAubm9kZS5hcHBlbmRDaGlsZCh0aGlzLm5vZGUpO1xuICAgICAgICByZXR1cm4gcDtcbiAgICB9O1xuLy8gU0lFUlJBIEVsZW1lbnQubWFya2VyKCk6IGNsYXJpZnkgd2hhdCBhIHJlZmVyZW5jZSBwb2ludCBpcy4gRS5nLiwgaGVscHMgeW91IG9mZnNldCB0aGUgb2JqZWN0IGZyb20gaXRzIGVkZ2Ugc3VjaCBhcyB3aGVuIGNlbnRlcmluZyBpdCBvdmVyIGEgcGF0aC5cbi8vIFNJRVJSQSBFbGVtZW50Lm1hcmtlcigpOiBJIHN1Z2dlc3QgdGhlIG1ldGhvZCBzaG91bGQgYWNjZXB0IGRlZmF1bHQgcmVmZXJlbmNlIHBvaW50IHZhbHVlcy4gIFBlcmhhcHMgY2VudGVyZWQgd2l0aCAocmVmWCA9IHdpZHRoLzIpIGFuZCAocmVmWSA9IGhlaWdodC8yKT8gQWxzbywgY291bGRuJ3QgaXQgYXNzdW1lIHRoZSBlbGVtZW50J3MgY3VycmVudCBfd2lkdGhfIGFuZCBfaGVpZ2h0Xz8gQW5kIHBsZWFzZSBzcGVjaWZ5IHdoYXQgX3hfIGFuZCBfeV8gbWVhbjogb2Zmc2V0cz8gSWYgc28sIGZyb20gd2hlcmU/ICBDb3VsZG4ndCB0aGV5IGFsc28gYmUgYXNzaWduZWQgZGVmYXVsdCB2YWx1ZXM/XG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQubWFya2VyXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBDcmVhdGVzIGEgYDxtYXJrZXI+YCBlbGVtZW50IGZyb20gdGhlIGN1cnJlbnQgZWxlbWVudFxuICAgICAqKlxuICAgICAqIFRvIGNyZWF0ZSBhIG1hcmtlciB5b3UgaGF2ZSB0byBzcGVjaWZ5IHRoZSBib3VuZGluZyByZWN0IGFuZCByZWZlcmVuY2UgcG9pbnQ6XG4gICAgIC0geCAobnVtYmVyKVxuICAgICAtIHkgKG51bWJlcilcbiAgICAgLSB3aWR0aCAobnVtYmVyKVxuICAgICAtIGhlaWdodCAobnVtYmVyKVxuICAgICAtIHJlZlggKG51bWJlcilcbiAgICAgLSByZWZZIChudW1iZXIpXG4gICAgID0gKEVsZW1lbnQpIHRoZSBgPG1hcmtlcj5gIGVsZW1lbnRcbiAgICAgKiBZb3UgY2FuIHNwZWNpZnkgdGhlIG1hcmtlciBsYXRlciBhcyBhbiBhcmd1bWVudCBmb3IgYG1hcmtlci1zdGFydGAsIGBtYXJrZXItZW5kYCwgYG1hcmtlci1taWRgLCBhbmQgYG1hcmtlcmAgYXR0cmlidXRlcy4gVGhlIGBtYXJrZXJgIGF0dHJpYnV0ZSBwbGFjZXMgdGhlIG1hcmtlciBhdCBldmVyeSBwb2ludCBhbG9uZyB0aGUgcGF0aCwgYW5kIGBtYXJrZXItbWlkYCBwbGFjZXMgdGhlbSBhdCBldmVyeSBwb2ludCBleGNlcHQgdGhlIHN0YXJ0IGFuZCBlbmQuXG4gICAgXFwqL1xuICAgIC8vIFRPRE8gYWRkIHVzYWdlIGZvciBtYXJrZXJzXG4gICAgZWxwcm90by5tYXJrZXIgPSBmdW5jdGlvbiAoeCwgeSwgd2lkdGgsIGhlaWdodCwgcmVmWCwgcmVmWSkge1xuICAgICAgICB2YXIgcCA9IG1ha2UoXCJtYXJrZXJcIiwgZ2V0U29tZURlZnModGhpcykpO1xuICAgICAgICBpZiAoeCA9PSBudWxsKSB7XG4gICAgICAgICAgICB4ID0gdGhpcy5nZXRCQm94KCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzKHgsIFwib2JqZWN0XCIpICYmIFwieFwiIGluIHgpIHtcbiAgICAgICAgICAgIHkgPSB4Lnk7XG4gICAgICAgICAgICB3aWR0aCA9IHgud2lkdGg7XG4gICAgICAgICAgICBoZWlnaHQgPSB4LmhlaWdodDtcbiAgICAgICAgICAgIHJlZlggPSB4LnJlZlggfHwgeC5jeDtcbiAgICAgICAgICAgIHJlZlkgPSB4LnJlZlkgfHwgeC5jeTtcbiAgICAgICAgICAgIHggPSB4Lng7XG4gICAgICAgIH1cbiAgICAgICAgJChwLm5vZGUsIHtcbiAgICAgICAgICAgIHZpZXdCb3g6IFt4LCB5LCB3aWR0aCwgaGVpZ2h0XS5qb2luKFMpLFxuICAgICAgICAgICAgbWFya2VyV2lkdGg6IHdpZHRoLFxuICAgICAgICAgICAgbWFya2VySGVpZ2h0OiBoZWlnaHQsXG4gICAgICAgICAgICBvcmllbnQ6IFwiYXV0b1wiLFxuICAgICAgICAgICAgcmVmWDogcmVmWCB8fCAwLFxuICAgICAgICAgICAgcmVmWTogcmVmWSB8fCAwLFxuICAgICAgICAgICAgaWQ6IHAuaWRcbiAgICAgICAgfSk7XG4gICAgICAgIHAubm9kZS5hcHBlbmRDaGlsZCh0aGlzLm5vZGUpO1xuICAgICAgICByZXR1cm4gcDtcbiAgICB9O1xuICAgIC8vIGFuaW1hdGlvblxuICAgIGZ1bmN0aW9uIHNsaWNlKGZyb20sIHRvLCBmKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoYXJyKSB7XG4gICAgICAgICAgICB2YXIgcmVzID0gYXJyLnNsaWNlKGZyb20sIHRvKTtcbiAgICAgICAgICAgIGlmIChyZXMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgICAgICByZXMgPSByZXNbMF07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZiA/IGYocmVzKSA6IHJlcztcbiAgICAgICAgfTtcbiAgICB9XG4gICAgdmFyIEFuaW1hdGlvbiA9IGZ1bmN0aW9uIChhdHRyLCBtcywgZWFzaW5nLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAodHlwZW9mIGVhc2luZyA9PSBcImZ1bmN0aW9uXCIgJiYgIWVhc2luZy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gZWFzaW5nO1xuICAgICAgICAgICAgZWFzaW5nID0gbWluYS5saW5lYXI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5hdHRyID0gYXR0cjtcbiAgICAgICAgdGhpcy5kdXIgPSBtcztcbiAgICAgICAgZWFzaW5nICYmICh0aGlzLmVhc2luZyA9IGVhc2luZyk7XG4gICAgICAgIGNhbGxiYWNrICYmICh0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2spO1xuICAgIH07XG4gICAgLy8gU0lFUlJBIEFsbCBvYmplY3QgbWV0aG9kcyBzaG91bGQgZmVhdHVyZSBzYW1wbGUgY29kZS4gVGhpcyBpcyBqdXN0IG9uZSBpbnN0YW5jZS5cbiAgICAvKlxcXG4gICAgICogU25hcC5hbmltYXRpb25cbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIENyZWF0ZXMgYW4gYW5pbWF0aW9uIG9iamVjdFxuICAgICAqKlxuICAgICAtIGF0dHIgKG9iamVjdCkgYXR0cmlidXRlcyBvZiBmaW5hbCBkZXN0aW5hdGlvblxuICAgICAtIGR1cmF0aW9uIChudW1iZXIpIGR1cmF0aW9uIG9mIHRoZSBhbmltYXRpb24sIGluIG1pbGxpc2Vjb25kc1xuICAgICAtIGVhc2luZyAoZnVuY3Rpb24pICNvcHRpb25hbCBvbmUgb2YgZWFzaW5nIGZ1bmN0aW9ucyBvZiBAbWluYSBvciBjdXN0b20gb25lXG4gICAgIC0gY2FsbGJhY2sgKGZ1bmN0aW9uKSAjb3B0aW9uYWwgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBmaXJlcyB3aGVuIGFuaW1hdGlvbiBlbmRzXG4gICAgID0gKG9iamVjdCkgYW5pbWF0aW9uIG9iamVjdFxuICAgIFxcKi9cbiAgICBTbmFwLmFuaW1hdGlvbiA9IGZ1bmN0aW9uIChhdHRyLCBtcywgZWFzaW5nLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihhdHRyLCBtcywgZWFzaW5nLCBjYWxsYmFjayk7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogRWxlbWVudC5pbkFuaW1cbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJldHVybnMgYSBzZXQgb2YgYW5pbWF0aW9ucyB0aGF0IG1heSBiZSBhYmxlIHRvIG1hbmlwdWxhdGUgdGhlIGN1cnJlbnQgZWxlbWVudFxuICAgICAqKlxuICAgICA9IChvYmplY3QpIGluIGZvcm1hdDpcbiAgICAgbyB7XG4gICAgIG8gICAgIGFuaW0gKG9iamVjdCkgYW5pbWF0aW9uIG9iamVjdCxcbiAgICAgbyAgICAgY3VyU3RhdHVzIChudW1iZXIpIDAuLjEg4oCUIHN0YXR1cyBvZiB0aGUgYW5pbWF0aW9uOiAwIOKAlCBqdXN0IHN0YXJ0ZWQsIDEg4oCUIGp1c3QgZmluaXNoZWQsXG4gICAgIG8gICAgIHN0YXR1cyAoZnVuY3Rpb24pIGdldHMgb3Igc2V0cyB0aGUgc3RhdHVzIG9mIHRoZSBhbmltYXRpb24sXG4gICAgIG8gICAgIHN0b3AgKGZ1bmN0aW9uKSBzdG9wcyB0aGUgYW5pbWF0aW9uXG4gICAgIG8gfVxuICAgIFxcKi9cbiAgICBlbHByb3RvLmluQW5pbSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGVsID0gdGhpcyxcbiAgICAgICAgICAgIHJlcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpZCBpbiBlbC5hbmltcykgaWYgKGVsLmFuaW1zW2hhc10oaWQpKSB7XG4gICAgICAgICAgICAoZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIGFuaW06IG5ldyBBbmltYXRpb24oYS5fYXR0cnMsIGEuZHVyLCBhLmVhc2luZywgYS5fY2FsbGJhY2spLFxuICAgICAgICAgICAgICAgICAgICBjdXJTdGF0dXM6IGEuc3RhdHVzKCksXG4gICAgICAgICAgICAgICAgICAgIHN0YXR1czogZnVuY3Rpb24gKHZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGEuc3RhdHVzKHZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGEuc3RvcCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KGVsLmFuaW1zW2lkXSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogU25hcC5hbmltYXRlXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSdW5zIGdlbmVyaWMgYW5pbWF0aW9uIG9mIG9uZSBudW1iZXIgaW50byBhbm90aGVyIHdpdGggYSBjYXJpbmcgZnVuY3Rpb25cbiAgICAgKipcbiAgICAgLSBmcm9tIChudW1iZXJ8YXJyYXkpIG51bWJlciBvciBhcnJheSBvZiBudW1iZXJzXG4gICAgIC0gdG8gKG51bWJlcnxhcnJheSkgbnVtYmVyIG9yIGFycmF5IG9mIG51bWJlcnNcbiAgICAgLSBzZXR0ZXIgKGZ1bmN0aW9uKSBjYXJpbmcgZnVuY3Rpb24gdGhhdCBhY2NlcHRzIG9uZSBudW1iZXIgYXJndW1lbnRcbiAgICAgLSBkdXJhdGlvbiAobnVtYmVyKSBkdXJhdGlvbiwgaW4gbWlsbGlzZWNvbmRzXG4gICAgIC0gZWFzaW5nIChmdW5jdGlvbikgI29wdGlvbmFsIGVhc2luZyBmdW5jdGlvbiBmcm9tIEBtaW5hIG9yIGN1c3RvbVxuICAgICAtIGNhbGxiYWNrIChmdW5jdGlvbikgI29wdGlvbmFsIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGV4ZWN1dGUgd2hlbiBhbmltYXRpb24gZW5kc1xuICAgICA9IChvYmplY3QpIGFuaW1hdGlvbiBvYmplY3QgaW4gQG1pbmEgZm9ybWF0XG4gICAgIG8ge1xuICAgICBvICAgICBpZCAoc3RyaW5nKSBhbmltYXRpb24gaWQsIGNvbnNpZGVyIGl0IHJlYWQtb25seSxcbiAgICAgbyAgICAgZHVyYXRpb24gKGZ1bmN0aW9uKSBnZXRzIG9yIHNldHMgdGhlIGR1cmF0aW9uIG9mIHRoZSBhbmltYXRpb24sXG4gICAgIG8gICAgIGVhc2luZyAoZnVuY3Rpb24pIGVhc2luZyxcbiAgICAgbyAgICAgc3BlZWQgKGZ1bmN0aW9uKSBnZXRzIG9yIHNldHMgdGhlIHNwZWVkIG9mIHRoZSBhbmltYXRpb24sXG4gICAgIG8gICAgIHN0YXR1cyAoZnVuY3Rpb24pIGdldHMgb3Igc2V0cyB0aGUgc3RhdHVzIG9mIHRoZSBhbmltYXRpb24sXG4gICAgIG8gICAgIHN0b3AgKGZ1bmN0aW9uKSBzdG9wcyB0aGUgYW5pbWF0aW9uXG4gICAgIG8gfVxuICAgICB8IHZhciByZWN0ID0gU25hcCgpLnJlY3QoMCwgMCwgMTAsIDEwKTtcbiAgICAgfCBTbmFwLmFuaW1hdGUoMCwgMTAsIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgfCAgICAgcmVjdC5hdHRyKHtcbiAgICAgfCAgICAgICAgIHg6IHZhbFxuICAgICB8ICAgICB9KTtcbiAgICAgfCB9LCAxMDAwKTtcbiAgICAgfCAvLyBpbiBnaXZlbiBjb250ZXh0IGlzIGVxdWl2YWxlbnQgdG9cbiAgICAgfCByZWN0LmFuaW1hdGUoe3g6IDEwfSwgMTAwMCk7XG4gICAgXFwqL1xuICAgIFNuYXAuYW5pbWF0ZSA9IGZ1bmN0aW9uIChmcm9tLCB0bywgc2V0dGVyLCBtcywgZWFzaW5nLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAodHlwZW9mIGVhc2luZyA9PSBcImZ1bmN0aW9uXCIgJiYgIWVhc2luZy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gZWFzaW5nO1xuICAgICAgICAgICAgZWFzaW5nID0gbWluYS5saW5lYXI7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG5vdyA9IG1pbmEudGltZSgpLFxuICAgICAgICAgICAgYW5pbSA9IG1pbmEoZnJvbSwgdG8sIG5vdywgbm93ICsgbXMsIG1pbmEudGltZSwgc2V0dGVyLCBlYXNpbmcpO1xuICAgICAgICBjYWxsYmFjayAmJiBldmUub25jZShcIm1pbmEuZmluaXNoLlwiICsgYW5pbS5pZCwgY2FsbGJhY2spO1xuICAgICAgICByZXR1cm4gYW5pbTtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LnN0b3BcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFN0b3BzIGFsbCB0aGUgYW5pbWF0aW9ucyBmb3IgdGhlIGN1cnJlbnQgZWxlbWVudFxuICAgICAqKlxuICAgICA9IChFbGVtZW50KSB0aGUgY3VycmVudCBlbGVtZW50XG4gICAgXFwqL1xuICAgIGVscHJvdG8uc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFuaW1zID0gdGhpcy5pbkFuaW0oKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gYW5pbXMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgYW5pbXNbaV0uc3RvcCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgLy8gU0lFUlJBIEVsZW1lbnQuYW5pbWF0ZSgpOiBGb3IgX2F0dHJzXywgY2xhcmlmeSBpZiB0aGV5IHJlcHJlc2VudCB0aGUgZGVzdGluYXRpb24gdmFsdWVzLCBhbmQgaWYgdGhlIGFuaW1hdGlvbiBleGVjdXRlcyByZWxhdGl2ZSB0byB0aGUgZWxlbWVudCdzIGN1cnJlbnQgYXR0cmlidXRlIHZhbHVlcy5cbiAgICAvLyBTSUVSUkEgd291bGQgYSBfY3VzdG9tXyBhbmltYXRpb24gZnVuY3Rpb24gYmUgYW4gU1ZHIGtleVNwbGluZXMgdmFsdWU/XG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQuYW5pbWF0ZVxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQW5pbWF0ZXMgdGhlIGdpdmVuIGF0dHJpYnV0ZXMgb2YgdGhlIGVsZW1lbnRcbiAgICAgKipcbiAgICAgLSBhdHRycyAob2JqZWN0KSBrZXktdmFsdWUgcGFpcnMgb2YgZGVzdGluYXRpb24gYXR0cmlidXRlc1xuICAgICAtIGR1cmF0aW9uIChudW1iZXIpIGR1cmF0aW9uIG9mIHRoZSBhbmltYXRpb24gaW4gbWlsbGlzZWNvbmRzXG4gICAgIC0gZWFzaW5nIChmdW5jdGlvbikgI29wdGlvbmFsIGVhc2luZyBmdW5jdGlvbiBmcm9tIEBtaW5hIG9yIGN1c3RvbVxuICAgICAtIGNhbGxiYWNrIChmdW5jdGlvbikgI29wdGlvbmFsIGNhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgZXhlY3V0ZXMgd2hlbiB0aGUgYW5pbWF0aW9uIGVuZHNcbiAgICAgPSAoRWxlbWVudCkgdGhlIGN1cnJlbnQgZWxlbWVudFxuICAgIFxcKi9cbiAgICBlbHByb3RvLmFuaW1hdGUgPSBmdW5jdGlvbiAoYXR0cnMsIG1zLCBlYXNpbmcsIGNhbGxiYWNrKSB7XG4gICAgICAgIGlmICh0eXBlb2YgZWFzaW5nID09IFwiZnVuY3Rpb25cIiAmJiAhZWFzaW5nLmxlbmd0aCkge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBlYXNpbmc7XG4gICAgICAgICAgICBlYXNpbmcgPSBtaW5hLmxpbmVhcjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXR0cnMgaW5zdGFuY2VvZiBBbmltYXRpb24pIHtcbiAgICAgICAgICAgIGNhbGxiYWNrID0gYXR0cnMuY2FsbGJhY2s7XG4gICAgICAgICAgICBlYXNpbmcgPSBhdHRycy5lYXNpbmc7XG4gICAgICAgICAgICBtcyA9IGVhc2luZy5kdXI7XG4gICAgICAgICAgICBhdHRycyA9IGF0dHJzLmF0dHI7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGZrZXlzID0gW10sIHRrZXlzID0gW10sIGtleXMgPSB7fSwgZnJvbSwgdG8sIGYsIGVxLFxuICAgICAgICAgICAgZWwgPSB0aGlzO1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gYXR0cnMpIGlmIChhdHRyc1toYXNdKGtleSkpIHtcbiAgICAgICAgICAgIGlmIChlbC5lcXVhbCkge1xuICAgICAgICAgICAgICAgIGVxID0gZWwuZXF1YWwoa2V5LCBTdHIoYXR0cnNba2V5XSkpO1xuICAgICAgICAgICAgICAgIGZyb20gPSBlcS5mcm9tO1xuICAgICAgICAgICAgICAgIHRvID0gZXEudG87XG4gICAgICAgICAgICAgICAgZiA9IGVxLmY7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZyb20gPSArZWwuYXR0cihrZXkpO1xuICAgICAgICAgICAgICAgIHRvID0gK2F0dHJzW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbGVuID0gaXMoZnJvbSwgXCJhcnJheVwiKSA/IGZyb20ubGVuZ3RoIDogMTtcbiAgICAgICAgICAgIGtleXNba2V5XSA9IHNsaWNlKGZrZXlzLmxlbmd0aCwgZmtleXMubGVuZ3RoICsgbGVuLCBmKTtcbiAgICAgICAgICAgIGZrZXlzID0gZmtleXMuY29uY2F0KGZyb20pO1xuICAgICAgICAgICAgdGtleXMgPSB0a2V5cy5jb25jYXQodG8pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBub3cgPSBtaW5hLnRpbWUoKSxcbiAgICAgICAgICAgIGFuaW0gPSBtaW5hKGZrZXlzLCB0a2V5cywgbm93LCBub3cgKyBtcywgbWluYS50aW1lLCBmdW5jdGlvbiAodmFsKSB7XG4gICAgICAgICAgICAgICAgdmFyIGF0dHIgPSB7fTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4ga2V5cykgaWYgKGtleXNbaGFzXShrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIGF0dHJba2V5XSA9IGtleXNba2V5XSh2YWwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbC5hdHRyKGF0dHIpO1xuICAgICAgICAgICAgfSwgZWFzaW5nKTtcbiAgICAgICAgZWwuYW5pbXNbYW5pbS5pZF0gPSBhbmltO1xuICAgICAgICBhbmltLl9hdHRycyA9IGF0dHJzO1xuICAgICAgICBhbmltLl9jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgICAgICBldmUub25jZShcIm1pbmEuZmluaXNoLlwiICsgYW5pbS5pZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZGVsZXRlIGVsLmFuaW1zW2FuaW0uaWRdO1xuICAgICAgICAgICAgY2FsbGJhY2sgJiYgY2FsbGJhY2suY2FsbChlbCk7XG4gICAgICAgIH0pO1xuICAgICAgICBldmUub25jZShcIm1pbmEuc3RvcC5cIiArIGFuaW0uaWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBlbC5hbmltc1thbmltLmlkXTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBlbDtcbiAgICB9O1xuICAgIHZhciBlbGRhdGEgPSB7fTtcbiAgICAvKlxcXG4gICAgICogRWxlbWVudC5kYXRhXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBBZGRzIG9yIHJldHJpZXZlcyBnaXZlbiB2YWx1ZSBhc3NvY2lhdGVkIHdpdGggZ2l2ZW4ga2V5LiAoRG9u4oCZdCBjb25mdXNlXG4gICAgICogd2l0aCBgZGF0YS1gIGF0dHJpYnV0ZXMpXG4gICAgICpcbiAgICAgKiBTZWUgYWxzbyBARWxlbWVudC5yZW1vdmVEYXRhXG4gICAgIC0ga2V5IChzdHJpbmcpIGtleSB0byBzdG9yZSBkYXRhXG4gICAgIC0gdmFsdWUgKGFueSkgI29wdGlvbmFsIHZhbHVlIHRvIHN0b3JlXG4gICAgID0gKG9iamVjdCkgQEVsZW1lbnRcbiAgICAgKiBvciwgaWYgdmFsdWUgaXMgbm90IHNwZWNpZmllZDpcbiAgICAgPSAoYW55KSB2YWx1ZVxuICAgICA+IFVzYWdlXG4gICAgIHwgZm9yICh2YXIgaSA9IDAsIGkgPCA1LCBpKyspIHtcbiAgICAgfCAgICAgcGFwZXIuY2lyY2xlKDEwICsgMTUgKiBpLCAxMCwgMTApXG4gICAgIHwgICAgICAgICAgLmF0dHIoe2ZpbGw6IFwiIzAwMFwifSlcbiAgICAgfCAgICAgICAgICAuZGF0YShcImlcIiwgaSlcbiAgICAgfCAgICAgICAgICAuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICB8ICAgICAgICAgICAgIGFsZXJ0KHRoaXMuZGF0YShcImlcIikpO1xuICAgICB8ICAgICAgICAgIH0pO1xuICAgICB8IH1cbiAgICBcXCovXG4gICAgZWxwcm90by5kYXRhID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICAgICAgdmFyIGRhdGEgPSBlbGRhdGFbdGhpcy5pZF0gPSBlbGRhdGFbdGhpcy5pZF0gfHwge307XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09IDApe1xuICAgICAgICAgICAgZXZlKFwic25hcC5kYXRhLmdldC5cIiArIHRoaXMuaWQsIHRoaXMsIGRhdGEsIG51bGwpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgaWYgKFNuYXAuaXMoa2V5LCBcIm9iamVjdFwiKSkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4ga2V5KSBpZiAoa2V5W2hhc10oaSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhKGksIGtleVtpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXZlKFwic25hcC5kYXRhLmdldC5cIiArIHRoaXMuaWQsIHRoaXMsIGRhdGFba2V5XSwga2V5KTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgZGF0YVtrZXldID0gdmFsdWU7XG4gICAgICAgIGV2ZShcInNuYXAuZGF0YS5zZXQuXCIgKyB0aGlzLmlkLCB0aGlzLCB2YWx1ZSwga2V5KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogRWxlbWVudC5yZW1vdmVEYXRhXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZW1vdmVzIHZhbHVlIGFzc29jaWF0ZWQgd2l0aCBhbiBlbGVtZW50IGJ5IGdpdmVuIGtleS5cbiAgICAgKiBJZiBrZXkgaXMgbm90IHByb3ZpZGVkLCByZW1vdmVzIGFsbCB0aGUgZGF0YSBvZiB0aGUgZWxlbWVudC5cbiAgICAgLSBrZXkgKHN0cmluZykgI29wdGlvbmFsIGtleVxuICAgICA9IChvYmplY3QpIEBFbGVtZW50XG4gICAgXFwqL1xuICAgIGVscHJvdG8ucmVtb3ZlRGF0YSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgaWYgKGtleSA9PSBudWxsKSB7XG4gICAgICAgICAgICBlbGRhdGFbdGhpcy5pZF0gPSB7fTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsZGF0YVt0aGlzLmlkXSAmJiBkZWxldGUgZWxkYXRhW3RoaXMuaWRdW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogRWxlbWVudC5vdXRlclNWR1xuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogUmV0dXJucyBTVkcgY29kZSBmb3IgdGhlIGVsZW1lbnQsIGVxdWl2YWxlbnQgdG8gSFRNTCdzIGBvdXRlckhUTUxgLlxuICAgICAqXG4gICAgICogU2VlIGFsc28gQEVsZW1lbnQuaW5uZXJTVkdcbiAgICAgPSAoc3RyaW5nKSBTVkcgY29kZSBmb3IgdGhlIGVsZW1lbnRcbiAgICBcXCovXG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQudG9TdHJpbmdcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFNlZSBARWxlbWVudC5vdXRlclNWR1xuICAgIFxcKi9cbiAgICBlbHByb3RvLm91dGVyU1ZHID0gZWxwcm90by50b1N0cmluZyA9IHRvU3RyaW5nKDEpO1xuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LmlubmVyU1ZHXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZXR1cm5zIFNWRyBjb2RlIGZvciB0aGUgZWxlbWVudCdzIGNvbnRlbnRzLCBlcXVpdmFsZW50IHRvIEhUTUwncyBgaW5uZXJIVE1MYFxuICAgICA9IChzdHJpbmcpIFNWRyBjb2RlIGZvciB0aGUgZWxlbWVudFxuICAgIFxcKi9cbiAgICBlbHByb3RvLmlubmVyU1ZHID0gdG9TdHJpbmcoKTtcbiAgICBmdW5jdGlvbiB0b1N0cmluZyh0eXBlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcmVzID0gdHlwZSA/IFwiPFwiICsgdGhpcy50eXBlIDogXCJcIixcbiAgICAgICAgICAgICAgICBhdHRyID0gdGhpcy5ub2RlLmF0dHJpYnV0ZXMsXG4gICAgICAgICAgICAgICAgY2hsZCA9IHRoaXMubm9kZS5jaGlsZE5vZGVzO1xuICAgICAgICAgICAgaWYgKHR5cGUpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBhdHRyLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzICs9IFwiIFwiICsgYXR0cltpXS5uYW1lICsgJz1cIicgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJbaV0udmFsdWUucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpICsgJ1wiJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY2hsZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB0eXBlICYmIChyZXMgKz0gXCI+XCIpO1xuICAgICAgICAgICAgICAgIGZvciAoaSA9IDAsIGlpID0gY2hsZC5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGxkW2ldLm5vZGVUeXBlID09IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcyArPSBjaGxkW2ldLm5vZGVWYWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjaGxkW2ldLm5vZGVUeXBlID09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcyArPSB3cmFwKGNobGRbaV0pLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdHlwZSAmJiAocmVzICs9IFwiPC9cIiArIHRoaXMudHlwZSArIFwiPlwiKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdHlwZSAmJiAocmVzICs9IFwiLz5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9O1xuICAgIH1cbn0oRWxlbWVudC5wcm90b3R5cGUpKTtcbi8vIFNJRVJSQSBTbmFwLnBhcnNlKCkgYWNjZXB0cyAmIHJldHVybnMgYSBmcmFnbWVudCwgYnV0IHRoZXJlJ3Mgbm8gaW5mbyBvbiB3aGF0IGl0IGRvZXMgaW4gYmV0d2Vlbi4gV2hhdCBpZiBpdCBkb2Vzbid0IHBhcnNlP1xuLypcXFxuICogU25hcC5wYXJzZVxuIFsgbWV0aG9kIF1cbiAqKlxuICogUGFyc2VzIFNWRyBmcmFnbWVudCBhbmQgY29udmVydHMgaXQgaW50byBhIEBGcmFnbWVudFxuICoqXG4gLSBzdmcgKHN0cmluZykgU1ZHIHN0cmluZ1xuID0gKEZyYWdtZW50KSB0aGUgQEZyYWdtZW50XG5cXCovXG5TbmFwLnBhcnNlID0gZnVuY3Rpb24gKHN2Zykge1xuICAgIHZhciBmID0gZ2xvYi5kb2MuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpLFxuICAgICAgICBmdWxsID0gdHJ1ZSxcbiAgICAgICAgZGl2ID0gZ2xvYi5kb2MuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICBzdmcgPSBTdHIoc3ZnKTtcbiAgICBpZiAoIXN2Zy5tYXRjaCgvXlxccyo8XFxzKnN2Zyg/Olxcc3w+KS8pKSB7XG4gICAgICAgIHN2ZyA9IFwiPHN2Zz5cIiArIHN2ZyArIFwiPC9zdmc+XCI7XG4gICAgICAgIGZ1bGwgPSBmYWxzZTtcbiAgICB9XG4gICAgZGl2LmlubmVySFRNTCA9IHN2ZztcbiAgICBzdmcgPSBkaXYuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzdmdcIilbMF07XG4gICAgaWYgKHN2Zykge1xuICAgICAgICBpZiAoZnVsbCkge1xuICAgICAgICAgICAgZiA9IHN2ZztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdoaWxlIChzdmcuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgIGYuYXBwZW5kQ2hpbGQoc3ZnLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGRpdi5pbm5lckhUTUwgPSBFO1xuICAgIHJldHVybiBuZXcgRnJhZ21lbnQoZik7XG59O1xuZnVuY3Rpb24gRnJhZ21lbnQoZnJhZykge1xuICAgIHRoaXMubm9kZSA9IGZyYWc7XG59XG4vKlxcXG4gKiBGcmFnbWVudC5zZWxlY3RcbiBbIG1ldGhvZCBdXG4gKipcbiAqIFNlZSBARWxlbWVudC5zZWxlY3RcblxcKi9cbkZyYWdtZW50LnByb3RvdHlwZS5zZWxlY3QgPSBFbGVtZW50LnByb3RvdHlwZS5zZWxlY3Q7XG4vKlxcXG4gKiBGcmFnbWVudC5zZWxlY3RBbGxcbiBbIG1ldGhvZCBdXG4gKipcbiAqIFNlZSBARWxlbWVudC5zZWxlY3RBbGxcblxcKi9cbkZyYWdtZW50LnByb3RvdHlwZS5zZWxlY3RBbGwgPSBFbGVtZW50LnByb3RvdHlwZS5zZWxlY3RBbGw7XG4vLyBTSUVSUkEgU25hcC5mcmFnbWVudCgpIGNvdWxkIGVzcGVjaWFsbHkgdXNlIGEgY29kZSBleGFtcGxlXG4vKlxcXG4gKiBTbmFwLmZyYWdtZW50XG4gWyBtZXRob2QgXVxuICoqXG4gKiBDcmVhdGVzIGEgRE9NIGZyYWdtZW50IGZyb20gYSBnaXZlbiBsaXN0IG9mIGVsZW1lbnRzIG9yIHN0cmluZ3NcbiAqKlxuIC0gdmFyYXJncyAo4oCmKSBTVkcgc3RyaW5nXG4gPSAoRnJhZ21lbnQpIHRoZSBARnJhZ21lbnRcblxcKi9cblNuYXAuZnJhZ21lbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApLFxuICAgICAgICBmID0gZ2xvYi5kb2MuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xuICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IGFyZ3MubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICB2YXIgaXRlbSA9IGFyZ3NbaV07XG4gICAgICAgIGlmIChpdGVtLm5vZGUgJiYgaXRlbS5ub2RlLm5vZGVUeXBlKSB7XG4gICAgICAgICAgICBmLmFwcGVuZENoaWxkKGl0ZW0ubm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGl0ZW0ubm9kZVR5cGUpIHtcbiAgICAgICAgICAgIGYuYXBwZW5kQ2hpbGQoaXRlbSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgIGYuYXBwZW5kQ2hpbGQoU25hcC5wYXJzZShpdGVtKS5ub2RlKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3IEZyYWdtZW50KGYpO1xufTtcblxuZnVuY3Rpb24gbWFrZShuYW1lLCBwYXJlbnQpIHtcbiAgICB2YXIgcmVzID0gJChuYW1lKTtcbiAgICBwYXJlbnQuYXBwZW5kQ2hpbGQocmVzKTtcbiAgICB2YXIgZWwgPSB3cmFwKHJlcyk7XG4gICAgZWwudHlwZSA9IG5hbWU7XG4gICAgcmV0dXJuIGVsO1xufVxuZnVuY3Rpb24gUGFwZXIodywgaCkge1xuICAgIHZhciByZXMsXG4gICAgICAgIGRlc2MsXG4gICAgICAgIGRlZnMsXG4gICAgICAgIHByb3RvID0gUGFwZXIucHJvdG90eXBlO1xuICAgIGlmICh3ICYmIHcudGFnTmFtZSA9PSBcInN2Z1wiKSB7XG4gICAgICAgIGlmICh3LnNuYXAgaW4gaHViKSB7XG4gICAgICAgICAgICByZXR1cm4gaHViW3cuc25hcF07XG4gICAgICAgIH1cbiAgICAgICAgcmVzID0gbmV3IEVsZW1lbnQodyk7XG4gICAgICAgIGRlc2MgPSB3LmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiZGVzY1wiKVswXTtcbiAgICAgICAgZGVmcyA9IHcuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJkZWZzXCIpWzBdO1xuICAgICAgICBpZiAoIWRlc2MpIHtcbiAgICAgICAgICAgIGRlc2MgPSAkKFwiZGVzY1wiKTtcbiAgICAgICAgICAgIGRlc2MuYXBwZW5kQ2hpbGQoZ2xvYi5kb2MuY3JlYXRlVGV4dE5vZGUoXCJDcmVhdGVkIHdpdGggU25hcFwiKSk7XG4gICAgICAgICAgICByZXMubm9kZS5hcHBlbmRDaGlsZChkZXNjKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWRlZnMpIHtcbiAgICAgICAgICAgIGRlZnMgPSAkKFwiZGVmc1wiKTtcbiAgICAgICAgICAgIHJlcy5ub2RlLmFwcGVuZENoaWxkKGRlZnMpO1xuICAgICAgICB9XG4gICAgICAgIHJlcy5kZWZzID0gZGVmcztcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHByb3RvKSBpZiAocHJvdG9baGFzXShrZXkpKSB7XG4gICAgICAgICAgICByZXNba2V5XSA9IHByb3RvW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgcmVzLnBhcGVyID0gcmVzLnJvb3QgPSByZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmVzID0gbWFrZShcInN2Z1wiLCBnbG9iLmRvYy5ib2R5KTtcbiAgICAgICAgJChyZXMubm9kZSwge1xuICAgICAgICAgICAgaGVpZ2h0OiBoLFxuICAgICAgICAgICAgdmVyc2lvbjogMS4xLFxuICAgICAgICAgICAgd2lkdGg6IHcsXG4gICAgICAgICAgICB4bWxuczogeG1sbnNcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5mdW5jdGlvbiB3cmFwKGRvbSkge1xuICAgIGlmICghZG9tKSB7XG4gICAgICAgIHJldHVybiBkb207XG4gICAgfVxuICAgIGlmIChkb20gaW5zdGFuY2VvZiBFbGVtZW50IHx8IGRvbSBpbnN0YW5jZW9mIEZyYWdtZW50KSB7XG4gICAgICAgIHJldHVybiBkb207XG4gICAgfVxuICAgIGlmIChkb20udGFnTmFtZSA9PSBcInN2Z1wiKSB7XG4gICAgICAgIHJldHVybiBuZXcgUGFwZXIoZG9tKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBFbGVtZW50KGRvbSk7XG59XG4vLyBncmFkaWVudHMnIGhlbHBlcnNcbmZ1bmN0aW9uIEdzdG9wcygpIHtcbiAgICByZXR1cm4gdGhpcy5zZWxlY3RBbGwoXCJzdG9wXCIpO1xufVxuZnVuY3Rpb24gR2FkZFN0b3AoY29sb3IsIG9mZnNldCkge1xuICAgIHZhciBzdG9wID0gJChcInN0b3BcIiksXG4gICAgICAgIGF0dHIgPSB7XG4gICAgICAgICAgICBvZmZzZXQ6ICtvZmZzZXQgKyBcIiVcIlxuICAgICAgICB9O1xuICAgIGNvbG9yID0gU25hcC5jb2xvcihjb2xvcik7XG4gICAgYXR0cltcInN0b3AtY29sb3JcIl0gPSBjb2xvci5oZXg7XG4gICAgaWYgKGNvbG9yLm9wYWNpdHkgPCAxKSB7XG4gICAgICAgIGF0dHJbXCJzdG9wLW9wYWNpdHlcIl0gPSBjb2xvci5vcGFjaXR5O1xuICAgIH1cbiAgICAkKHN0b3AsIGF0dHIpO1xuICAgIHRoaXMubm9kZS5hcHBlbmRDaGlsZChzdG9wKTtcbiAgICByZXR1cm4gdGhpcztcbn1cbmZ1bmN0aW9uIEdnZXRCQm94KCkge1xuICAgIGlmICh0aGlzLnR5cGUgPT0gXCJsaW5lYXJHcmFkaWVudFwiKSB7XG4gICAgICAgIHZhciB4MSA9ICQodGhpcy5ub2RlLCBcIngxXCIpIHx8IDAsXG4gICAgICAgICAgICB4MiA9ICQodGhpcy5ub2RlLCBcIngyXCIpIHx8IDEsXG4gICAgICAgICAgICB5MSA9ICQodGhpcy5ub2RlLCBcInkxXCIpIHx8IDAsXG4gICAgICAgICAgICB5MiA9ICQodGhpcy5ub2RlLCBcInkyXCIpIHx8IDA7XG4gICAgICAgIHJldHVybiBTbmFwLl8uYm94KHgxLCB5MSwgbWF0aC5hYnMoeDIgLSB4MSksIG1hdGguYWJzKHkyIC0geTEpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgY3ggPSB0aGlzLm5vZGUuY3ggfHwgLjUsXG4gICAgICAgICAgICBjeSA9IHRoaXMubm9kZS5jeSB8fCAuNSxcbiAgICAgICAgICAgIHIgPSB0aGlzLm5vZGUuciB8fCAwO1xuICAgICAgICByZXR1cm4gU25hcC5fLmJveChjeCAtIHIsIGN5IC0gciwgciAqIDIsIHIgKiAyKTtcbiAgICB9XG59XG5mdW5jdGlvbiBncmFkaWVudChkZWZzLCBzdHIpIHtcbiAgICB2YXIgZ3JhZCA9IGFycmF5Rmlyc3RWYWx1ZShldmUoXCJzbmFwLnV0aWwuZ3JhZC5wYXJzZVwiLCBudWxsLCBzdHIpKSxcbiAgICAgICAgZWw7XG4gICAgaWYgKCFncmFkKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBncmFkLnBhcmFtcy51bnNoaWZ0KGRlZnMpO1xuICAgIGlmIChncmFkLnR5cGUudG9Mb3dlckNhc2UoKSA9PSBcImxcIikge1xuICAgICAgICBlbCA9IGdyYWRpZW50TGluZWFyLmFwcGx5KDAsIGdyYWQucGFyYW1zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBlbCA9IGdyYWRpZW50UmFkaWFsLmFwcGx5KDAsIGdyYWQucGFyYW1zKTtcbiAgICB9XG4gICAgaWYgKGdyYWQudHlwZSAhPSBncmFkLnR5cGUudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAkKGVsLm5vZGUsIHtcbiAgICAgICAgICAgIGdyYWRpZW50VW5pdHM6IFwidXNlclNwYWNlT25Vc2VcIlxuICAgICAgICB9KTtcbiAgICB9XG4gICAgdmFyIHN0b3BzID0gZ3JhZC5zdG9wcyxcbiAgICAgICAgbGVuID0gc3RvcHMubGVuZ3RoLFxuICAgICAgICBzdGFydCA9IDAsXG4gICAgICAgIGogPSAwO1xuICAgIGZ1bmN0aW9uIHNlZWQoaSwgZW5kKSB7XG4gICAgICAgIHZhciBzdGVwID0gKGVuZCAtIHN0YXJ0KSAvIChpIC0gaik7XG4gICAgICAgIGZvciAodmFyIGsgPSBqOyBrIDwgaTsgaysrKSB7XG4gICAgICAgICAgICBzdG9wc1trXS5vZmZzZXQgPSArKCtzdGFydCArIHN0ZXAgKiAoayAtIGopKS50b0ZpeGVkKDIpO1xuICAgICAgICB9XG4gICAgICAgIGogPSBpO1xuICAgICAgICBzdGFydCA9IGVuZDtcbiAgICB9XG4gICAgbGVuLS07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykgaWYgKFwib2Zmc2V0XCIgaW4gc3RvcHNbaV0pIHtcbiAgICAgICAgc2VlZChpLCBzdG9wc1tpXS5vZmZzZXQpO1xuICAgIH1cbiAgICBzdG9wc1tsZW5dLm9mZnNldCA9IHN0b3BzW2xlbl0ub2Zmc2V0IHx8IDEwMDtcbiAgICBzZWVkKGxlbiwgc3RvcHNbbGVuXS5vZmZzZXQpO1xuICAgIGZvciAoaSA9IDA7IGkgPD0gbGVuOyBpKyspIHtcbiAgICAgICAgdmFyIHN0b3AgPSBzdG9wc1tpXTtcbiAgICAgICAgZWwuYWRkU3RvcChzdG9wLmNvbG9yLCBzdG9wLm9mZnNldCk7XG4gICAgfVxuICAgIHJldHVybiBlbDtcbn1cbmZ1bmN0aW9uIGdyYWRpZW50TGluZWFyKGRlZnMsIHgxLCB5MSwgeDIsIHkyKSB7XG4gICAgdmFyIGVsID0gbWFrZShcImxpbmVhckdyYWRpZW50XCIsIGRlZnMpO1xuICAgIGVsLnN0b3BzID0gR3N0b3BzO1xuICAgIGVsLmFkZFN0b3AgPSBHYWRkU3RvcDtcbiAgICBlbC5nZXRCQm94ID0gR2dldEJCb3g7XG4gICAgaWYgKHgxICE9IG51bGwpIHtcbiAgICAgICAgJChlbC5ub2RlLCB7XG4gICAgICAgICAgICB4MTogeDEsXG4gICAgICAgICAgICB5MTogeTEsXG4gICAgICAgICAgICB4MjogeDIsXG4gICAgICAgICAgICB5MjogeTJcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBlbDtcbn1cbmZ1bmN0aW9uIGdyYWRpZW50UmFkaWFsKGRlZnMsIGN4LCBjeSwgciwgZngsIGZ5KSB7XG4gICAgdmFyIGVsID0gbWFrZShcInJhZGlhbEdyYWRpZW50XCIsIGRlZnMpO1xuICAgIGVsLnN0b3BzID0gR3N0b3BzO1xuICAgIGVsLmFkZFN0b3AgPSBHYWRkU3RvcDtcbiAgICBlbC5nZXRCQm94ID0gR2dldEJCb3g7XG4gICAgaWYgKGN4ICE9IG51bGwpIHtcbiAgICAgICAgJChlbC5ub2RlLCB7XG4gICAgICAgICAgICBjeDogY3gsXG4gICAgICAgICAgICBjeTogY3ksXG4gICAgICAgICAgICByOiByXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoZnggIT0gbnVsbCAmJiBmeSAhPSBudWxsKSB7XG4gICAgICAgICQoZWwubm9kZSwge1xuICAgICAgICAgICAgZng6IGZ4LFxuICAgICAgICAgICAgZnk6IGZ5XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZWw7XG59XG4vLyBQYXBlciBwcm90b3R5cGUgbWV0aG9kc1xuKGZ1bmN0aW9uIChwcm90bykge1xuICAgIC8qXFxcbiAgICAgKiBQYXBlci5lbFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQ3JlYXRlcyBhbiBlbGVtZW50IG9uIHBhcGVyIHdpdGggYSBnaXZlbiBuYW1lIGFuZCBubyBhdHRyaWJ1dGVzXG4gICAgICoqXG4gICAgIC0gbmFtZSAoc3RyaW5nKSB0YWcgbmFtZVxuICAgICAtIGF0dHIgKG9iamVjdCkgYXR0cmlidXRlc1xuICAgICA9IChFbGVtZW50KSB0aGUgY3VycmVudCBlbGVtZW50XG4gICAgID4gVXNhZ2VcbiAgICAgfCB2YXIgYyA9IHBhcGVyLmNpcmNsZSgxMCwgMTAsIDEwKTsgLy8gaXMgdGhlIHNhbWUgYXMuLi5cbiAgICAgfCB2YXIgYyA9IHBhcGVyLmVsKFwiY2lyY2xlXCIpLmF0dHIoe1xuICAgICB8ICAgICBjeDogMTAsXG4gICAgIHwgICAgIGN5OiAxMCxcbiAgICAgfCAgICAgcjogMTBcbiAgICAgfCB9KTtcbiAgICAgfCAvLyBhbmQgdGhlIHNhbWUgYXNcbiAgICAgfCB2YXIgYyA9IHBhcGVyLmVsKFwiY2lyY2xlXCIsIHtcbiAgICAgfCAgICAgY3g6IDEwLFxuICAgICB8ICAgICBjeTogMTAsXG4gICAgIHwgICAgIHI6IDEwXG4gICAgIHwgfSk7XG4gICAgXFwqL1xuICAgIHByb3RvLmVsID0gZnVuY3Rpb24gKG5hbWUsIGF0dHIpIHtcbiAgICAgICAgcmV0dXJuIG1ha2UobmFtZSwgdGhpcy5ub2RlKS5hdHRyKGF0dHIpO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIFBhcGVyLnJlY3RcbiAgICAgWyBtZXRob2QgXVxuICAgICAqXG4gICAgICogRHJhd3MgYSByZWN0YW5nbGVcbiAgICAgKipcbiAgICAgLSB4IChudW1iZXIpIHggY29vcmRpbmF0ZSBvZiB0aGUgdG9wIGxlZnQgY29ybmVyXG4gICAgIC0geSAobnVtYmVyKSB5IGNvb3JkaW5hdGUgb2YgdGhlIHRvcCBsZWZ0IGNvcm5lclxuICAgICAtIHdpZHRoIChudW1iZXIpIHdpZHRoXG4gICAgIC0gaGVpZ2h0IChudW1iZXIpIGhlaWdodFxuICAgICAtIHJ4IChudW1iZXIpICNvcHRpb25hbCBob3Jpem9udGFsIHJhZGl1cyBmb3Igcm91bmRlZCBjb3JuZXJzLCBkZWZhdWx0IGlzIDBcbiAgICAgLSByeSAobnVtYmVyKSAjb3B0aW9uYWwgdmVydGljYWwgcmFkaXVzIGZvciByb3VuZGVkIGNvcm5lcnMsIGRlZmF1bHQgaXMgcnggb3IgMFxuICAgICA9IChvYmplY3QpIHRoZSBgcmVjdGAgZWxlbWVudFxuICAgICAqKlxuICAgICA+IFVzYWdlXG4gICAgIHwgLy8gcmVndWxhciByZWN0YW5nbGVcbiAgICAgfCB2YXIgYyA9IHBhcGVyLnJlY3QoMTAsIDEwLCA1MCwgNTApO1xuICAgICB8IC8vIHJlY3RhbmdsZSB3aXRoIHJvdW5kZWQgY29ybmVyc1xuICAgICB8IHZhciBjID0gcGFwZXIucmVjdCg0MCwgNDAsIDUwLCA1MCwgMTApO1xuICAgIFxcKi9cbiAgICBwcm90by5yZWN0ID0gZnVuY3Rpb24gKHgsIHksIHcsIGgsIHJ4LCByeSkge1xuICAgICAgICB2YXIgYXR0cjtcbiAgICAgICAgaWYgKHJ5ID09IG51bGwpIHtcbiAgICAgICAgICAgIHJ5ID0gcng7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzKHgsIFwib2JqZWN0XCIpICYmIFwieFwiIGluIHgpIHtcbiAgICAgICAgICAgIGF0dHIgPSB4O1xuICAgICAgICB9IGVsc2UgaWYgKHggIT0gbnVsbCkge1xuICAgICAgICAgICAgYXR0ciA9IHtcbiAgICAgICAgICAgICAgICB4OiB4LFxuICAgICAgICAgICAgICAgIHk6IHksXG4gICAgICAgICAgICAgICAgd2lkdGg6IHcsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBoXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHJ4ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBhdHRyLnJ4ID0gcng7XG4gICAgICAgICAgICAgICAgYXR0ci5yeSA9IHJ5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmVsKFwicmVjdFwiLCBhdHRyKTtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBQYXBlci5jaXJjbGVcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIERyYXdzIGEgY2lyY2xlXG4gICAgICoqXG4gICAgIC0geCAobnVtYmVyKSB4IGNvb3JkaW5hdGUgb2YgdGhlIGNlbnRyZVxuICAgICAtIHkgKG51bWJlcikgeSBjb29yZGluYXRlIG9mIHRoZSBjZW50cmVcbiAgICAgLSByIChudW1iZXIpIHJhZGl1c1xuICAgICA9IChvYmplY3QpIHRoZSBgY2lyY2xlYCBlbGVtZW50XG4gICAgICoqXG4gICAgID4gVXNhZ2VcbiAgICAgfCB2YXIgYyA9IHBhcGVyLmNpcmNsZSg1MCwgNTAsIDQwKTtcbiAgICBcXCovXG4gICAgcHJvdG8uY2lyY2xlID0gZnVuY3Rpb24gKGN4LCBjeSwgcikge1xuICAgICAgICB2YXIgYXR0cjtcbiAgICAgICAgaWYgKGlzKGN4LCBcIm9iamVjdFwiKSAmJiBcImN4XCIgaW4gY3gpIHtcbiAgICAgICAgICAgIGF0dHIgPSBjeDtcbiAgICAgICAgfSBlbHNlIGlmIChjeCAhPSBudWxsKSB7XG4gICAgICAgICAgICBhdHRyID0ge1xuICAgICAgICAgICAgICAgIGN4OiBjeCxcbiAgICAgICAgICAgICAgICBjeTogY3ksXG4gICAgICAgICAgICAgICAgcjogclxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5lbChcImNpcmNsZVwiLCBhdHRyKTtcbiAgICB9O1xuXG4gICAgLypcXFxuICAgICAqIFBhcGVyLmltYWdlXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBQbGFjZXMgYW4gaW1hZ2Ugb24gdGhlIHN1cmZhY2VcbiAgICAgKipcbiAgICAgLSBzcmMgKHN0cmluZykgVVJJIG9mIHRoZSBzb3VyY2UgaW1hZ2VcbiAgICAgLSB4IChudW1iZXIpIHggb2Zmc2V0IHBvc2l0aW9uXG4gICAgIC0geSAobnVtYmVyKSB5IG9mZnNldCBwb3NpdGlvblxuICAgICAtIHdpZHRoIChudW1iZXIpIHdpZHRoIG9mIHRoZSBpbWFnZVxuICAgICAtIGhlaWdodCAobnVtYmVyKSBoZWlnaHQgb2YgdGhlIGltYWdlXG4gICAgID0gKG9iamVjdCkgdGhlIGBpbWFnZWAgZWxlbWVudFxuICAgICAqIG9yXG4gICAgID0gKG9iamVjdCkgU25hcCBlbGVtZW50IG9iamVjdCB3aXRoIHR5cGUgYGltYWdlYFxuICAgICAqKlxuICAgICA+IFVzYWdlXG4gICAgIHwgdmFyIGMgPSBwYXBlci5pbWFnZShcImFwcGxlLnBuZ1wiLCAxMCwgMTAsIDgwLCA4MCk7XG4gICAgXFwqL1xuICAgIHByb3RvLmltYWdlID0gZnVuY3Rpb24gKHNyYywgeCwgeSwgd2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgZWwgPSBtYWtlKFwiaW1hZ2VcIiwgdGhpcy5ub2RlKTtcbiAgICAgICAgaWYgKGlzKHNyYywgXCJvYmplY3RcIikgJiYgXCJzcmNcIiBpbiBzcmMpIHtcbiAgICAgICAgICAgIGVsLmF0dHIoc3JjKTtcbiAgICAgICAgfSBlbHNlIGlmIChzcmMgIT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIHNldCA9IHtcbiAgICAgICAgICAgICAgICBcInhsaW5rOmhyZWZcIjogc3JjLFxuICAgICAgICAgICAgICAgIHByZXNlcnZlQXNwZWN0UmF0aW86IFwibm9uZVwiXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHggIT0gbnVsbCAmJiB5ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBzZXQueCA9IHg7XG4gICAgICAgICAgICAgICAgc2V0LnkgPSB5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHdpZHRoICE9IG51bGwgJiYgaGVpZ2h0ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBzZXQud2lkdGggPSB3aWR0aDtcbiAgICAgICAgICAgICAgICBzZXQuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwcmVsb2FkKHNyYywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAkKGVsLm5vZGUsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiB0aGlzLm9mZnNldFdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB0aGlzLm9mZnNldEhlaWdodFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoZWwubm9kZSwgc2V0KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZWw7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogUGFwZXIuZWxsaXBzZVxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogRHJhd3MgYW4gZWxsaXBzZVxuICAgICAqKlxuICAgICAtIHggKG51bWJlcikgeCBjb29yZGluYXRlIG9mIHRoZSBjZW50cmVcbiAgICAgLSB5IChudW1iZXIpIHkgY29vcmRpbmF0ZSBvZiB0aGUgY2VudHJlXG4gICAgIC0gcnggKG51bWJlcikgaG9yaXpvbnRhbCByYWRpdXNcbiAgICAgLSByeSAobnVtYmVyKSB2ZXJ0aWNhbCByYWRpdXNcbiAgICAgPSAob2JqZWN0KSB0aGUgYGVsbGlwc2VgIGVsZW1lbnRcbiAgICAgKipcbiAgICAgPiBVc2FnZVxuICAgICB8IHZhciBjID0gcGFwZXIuZWxsaXBzZSg1MCwgNTAsIDQwLCAyMCk7XG4gICAgXFwqL1xuICAgIHByb3RvLmVsbGlwc2UgPSBmdW5jdGlvbiAoY3gsIGN5LCByeCwgcnkpIHtcbiAgICAgICAgdmFyIGVsID0gbWFrZShcImVsbGlwc2VcIiwgdGhpcy5ub2RlKTtcbiAgICAgICAgaWYgKGlzKGN4LCBcIm9iamVjdFwiKSAmJiBcImN4XCIgaW4gY3gpIHtcbiAgICAgICAgICAgIGVsLmF0dHIoY3gpO1xuICAgICAgICB9IGVsc2UgaWYgKGN4ICE9IG51bGwpIHtcbiAgICAgICAgICAgIGVsLmF0dHIoe1xuICAgICAgICAgICAgICAgIGN4OiBjeCxcbiAgICAgICAgICAgICAgICBjeTogY3ksXG4gICAgICAgICAgICAgICAgcng6IHJ4LFxuICAgICAgICAgICAgICAgIHJ5OiByeVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVsO1xuICAgIH07XG4gICAgLy8gU0lFUlJBIFBhcGVyLnBhdGgoKTogVW5jbGVhciBmcm9tIHRoZSBsaW5rIHdoYXQgYSBDYXRtdWxsLVJvbSBjdXJ2ZXRvIGlzLCBhbmQgd2h5IGl0IHdvdWxkIG1ha2UgbGlmZSBhbnkgZWFzaWVyLlxuICAgIC8qXFxcbiAgICAgKiBQYXBlci5wYXRoXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBDcmVhdGVzIGEgYDxwYXRoPmAgZWxlbWVudCB1c2luZyB0aGUgZ2l2ZW4gc3RyaW5nIGFzIHRoZSBwYXRoJ3MgZGVmaW5pdGlvblxuICAgICAtIHBhdGhTdHJpbmcgKHN0cmluZykgI29wdGlvbmFsIHBhdGggc3RyaW5nIGluIFNWRyBmb3JtYXRcbiAgICAgKiBQYXRoIHN0cmluZyBjb25zaXN0cyBvZiBvbmUtbGV0dGVyIGNvbW1hbmRzLCBmb2xsb3dlZCBieSBjb21tYSBzZXByYXJhdGVkIGFyZ3VtZW50cyBpbiBudW1lcmljYWwgZm9ybS4gRXhhbXBsZTpcbiAgICAgfCBcIk0xMCwyMEwzMCw0MFwiXG4gICAgICogVGhpcyBleGFtcGxlIGZlYXR1cmVzIHR3byBjb21tYW5kczogYE1gLCB3aXRoIGFyZ3VtZW50cyBgKDEwLCAyMClgIGFuZCBgTGAgd2l0aCBhcmd1bWVudHMgYCgzMCwgNDApYC4gVXBwZXJjYXNlIGxldHRlciBjb21tYW5kcyBleHByZXNzIGNvb3JkaW5hdGVzIGluIGFic29sdXRlIHRlcm1zLCB3aGlsZSBsb3dlcmNhc2UgY29tbWFuZHMgZXhwcmVzcyB0aGVtIGluIHJlbGF0aXZlIHRlcm1zIGZyb20gdGhlIG1vc3QgcmVjZW50bHkgZGVjbGFyZWQgY29vcmRpbmF0ZXMuXG4gICAgICpcbiAgICAgIyA8cD5IZXJlIGlzIHNob3J0IGxpc3Qgb2YgY29tbWFuZHMgYXZhaWxhYmxlLCBmb3IgbW9yZSBkZXRhaWxzIHNlZSA8YSBocmVmPVwiaHR0cDovL3d3dy53My5vcmcvVFIvU1ZHL3BhdGhzLmh0bWwjUGF0aERhdGFcIiB0aXRsZT1cIkRldGFpbHMgb2YgYSBwYXRoJ3MgZGF0YSBhdHRyaWJ1dGUncyBmb3JtYXQgYXJlIGRlc2NyaWJlZCBpbiB0aGUgU1ZHIHNwZWNpZmljYXRpb24uXCI+U1ZHIHBhdGggc3RyaW5nIGZvcm1hdDwvYT4gb3IgPGEgaHJlZj1cImh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuL1NWRy9UdXRvcmlhbC9QYXRoc1wiPmFydGljbGUgYWJvdXQgcGF0aCBzdHJpbmdzIGF0IE1ETjwvYT4uPC9wPlxuICAgICAjIDx0YWJsZT48dGhlYWQ+PHRyPjx0aD5Db21tYW5kPC90aD48dGg+TmFtZTwvdGg+PHRoPlBhcmFtZXRlcnM8L3RoPjwvdHI+PC90aGVhZD48dGJvZHk+XG4gICAgICMgPHRyPjx0ZD5NPC90ZD48dGQ+bW92ZXRvPC90ZD48dGQ+KHggeSkrPC90ZD48L3RyPlxuICAgICAjIDx0cj48dGQ+WjwvdGQ+PHRkPmNsb3NlcGF0aDwvdGQ+PHRkPihub25lKTwvdGQ+PC90cj5cbiAgICAgIyA8dHI+PHRkPkw8L3RkPjx0ZD5saW5ldG88L3RkPjx0ZD4oeCB5KSs8L3RkPjwvdHI+XG4gICAgICMgPHRyPjx0ZD5IPC90ZD48dGQ+aG9yaXpvbnRhbCBsaW5ldG88L3RkPjx0ZD54KzwvdGQ+PC90cj5cbiAgICAgIyA8dHI+PHRkPlY8L3RkPjx0ZD52ZXJ0aWNhbCBsaW5ldG88L3RkPjx0ZD55KzwvdGQ+PC90cj5cbiAgICAgIyA8dHI+PHRkPkM8L3RkPjx0ZD5jdXJ2ZXRvPC90ZD48dGQ+KHgxIHkxIHgyIHkyIHggeSkrPC90ZD48L3RyPlxuICAgICAjIDx0cj48dGQ+UzwvdGQ+PHRkPnNtb290aCBjdXJ2ZXRvPC90ZD48dGQ+KHgyIHkyIHggeSkrPC90ZD48L3RyPlxuICAgICAjIDx0cj48dGQ+UTwvdGQ+PHRkPnF1YWRyYXRpYyBCw6l6aWVyIGN1cnZldG88L3RkPjx0ZD4oeDEgeTEgeCB5KSs8L3RkPjwvdHI+XG4gICAgICMgPHRyPjx0ZD5UPC90ZD48dGQ+c21vb3RoIHF1YWRyYXRpYyBCw6l6aWVyIGN1cnZldG88L3RkPjx0ZD4oeCB5KSs8L3RkPjwvdHI+XG4gICAgICMgPHRyPjx0ZD5BPC90ZD48dGQ+ZWxsaXB0aWNhbCBhcmM8L3RkPjx0ZD4ocnggcnkgeC1heGlzLXJvdGF0aW9uIGxhcmdlLWFyYy1mbGFnIHN3ZWVwLWZsYWcgeCB5KSs8L3RkPjwvdHI+XG4gICAgICMgPHRyPjx0ZD5SPC90ZD48dGQ+PGEgaHJlZj1cImh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQ2F0bXVsbOKAk1JvbV9zcGxpbmUjQ2F0bXVsbC5FMi44MC45M1JvbV9zcGxpbmVcIj5DYXRtdWxsLVJvbSBjdXJ2ZXRvPC9hPio8L3RkPjx0ZD54MSB5MSAoeCB5KSs8L3RkPjwvdHI+PC90Ym9keT48L3RhYmxlPlxuICAgICAqICogX0NhdG11bGwtUm9tIGN1cnZldG9fIGlzIGEgbm90IHN0YW5kYXJkIFNWRyBjb21tYW5kIGFuZCBhZGRlZCB0byBtYWtlIGxpZmUgZWFzaWVyLlxuICAgICAqIE5vdGU6IHRoZXJlIGlzIGEgc3BlY2lhbCBjYXNlIHdoZW4gYSBwYXRoIGNvbnNpc3RzIG9mIG9ubHkgdGhyZWUgY29tbWFuZHM6IGBNMTAsMTBS4oCmemAuIEluIHRoaXMgY2FzZSB0aGUgcGF0aCBjb25uZWN0cyBiYWNrIHRvIGl0cyBzdGFydGluZyBwb2ludC5cbiAgICAgPiBVc2FnZVxuICAgICB8IHZhciBjID0gcGFwZXIucGF0aChcIk0xMCAxMEw5MCA5MFwiKTtcbiAgICAgfCAvLyBkcmF3IGEgZGlhZ29uYWwgbGluZTpcbiAgICAgfCAvLyBtb3ZlIHRvIDEwLDEwLCBsaW5lIHRvIDkwLDkwXG4gICAgXFwqL1xuICAgIHByb3RvLnBhdGggPSBmdW5jdGlvbiAoZCkge1xuICAgICAgICB2YXIgZWwgPSBtYWtlKFwicGF0aFwiLCB0aGlzLm5vZGUpO1xuICAgICAgICBpZiAoaXMoZCwgXCJvYmplY3RcIikgJiYgIWlzKGQsIFwiYXJyYXlcIikpIHtcbiAgICAgICAgICAgIGVsLmF0dHIoZCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZCkge1xuICAgICAgICAgICAgZWwuYXR0cih7XG4gICAgICAgICAgICAgICAgZDogZFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVsO1xuICAgIH07XG4vLyBTSUVSUkEgUGFwZXIuZygpOiBEb24ndCB1bmRlcnN0YW5kIHRoZSBjb2RlIGNvbW1lbnQgYWJvdXQgdGhlIG9yZGVyIGJlaW5nIF9kaWZmZXJlbnQuXyBXb3VsZG4ndCBpdCBiZSBhIHJlY3QgZm9sbG93ZWQgYnkgYSBjaXJjbGU/XG4gICAgLypcXFxuICAgICAqIFBhcGVyLmdcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIENyZWF0ZXMgYSBncm91cCBlbGVtZW50XG4gICAgICoqXG4gICAgIC0gdmFyYXJncyAo4oCmKSAjb3B0aW9uYWwgZWxlbWVudHMgdG8gbmVzdCB3aXRoaW4gdGhlIGdyb3VwXG4gICAgID0gKG9iamVjdCkgdGhlIGBnYCBlbGVtZW50XG4gICAgICoqXG4gICAgID4gVXNhZ2VcbiAgICAgfCB2YXIgYzEgPSBwYXBlci5jaXJjbGUoKSxcbiAgICAgfCAgICAgYzIgPSBwYXBlci5yZWN0KCksXG4gICAgIHwgICAgIGcgPSBwYXBlci5nKGMyLCBjMSk7IC8vIG5vdGUgdGhhdCB0aGUgb3JkZXIgb2YgZWxlbWVudHMgaXMgZGlmZmVyZW50XG4gICAgICogb3JcbiAgICAgfCB2YXIgYzEgPSBwYXBlci5jaXJjbGUoKSxcbiAgICAgfCAgICAgYzIgPSBwYXBlci5yZWN0KCksXG4gICAgIHwgICAgIGcgPSBwYXBlci5nKCk7XG4gICAgIHwgZy5hZGQoYzIsIGMxKTtcbiAgICBcXCovXG4gICAgLypcXFxuICAgICAqIFBhcGVyLmdyb3VwXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBTZWUgQFBhcGVyLmdcbiAgICBcXCovXG4gICAgcHJvdG8uZ3JvdXAgPSBwcm90by5nID0gZnVuY3Rpb24gKGZpcnN0KSB7XG4gICAgICAgIHZhciBlbCA9IG1ha2UoXCJnXCIsIHRoaXMubm9kZSk7XG4gICAgICAgIGVsLmFkZCA9IGFkZDJncm91cDtcbiAgICAgICAgZm9yICh2YXIgbWV0aG9kIGluIHByb3RvKSBpZiAocHJvdG9baGFzXShtZXRob2QpKSB7XG4gICAgICAgICAgICBlbFttZXRob2RdID0gcHJvdG9bbWV0aG9kXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAxICYmIGZpcnN0ICYmICFmaXJzdC50eXBlKSB7XG4gICAgICAgICAgICBlbC5hdHRyKGZpcnN0KTtcbiAgICAgICAgfSBlbHNlIGlmIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBlbC5hZGQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVsO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIFBhcGVyLnRleHRcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIERyYXdzIGEgdGV4dCBzdHJpbmdcbiAgICAgKipcbiAgICAgLSB4IChudW1iZXIpIHggY29vcmRpbmF0ZSBwb3NpdGlvblxuICAgICAtIHkgKG51bWJlcikgeSBjb29yZGluYXRlIHBvc2l0aW9uXG4gICAgIC0gdGV4dCAoc3RyaW5nfGFycmF5KSBUaGUgdGV4dCBzdHJpbmcgdG8gZHJhdyBvciBhcnJheSBvZiBzdHJpbmdzIHRvIG5lc3Qgd2l0aGluIHNlcGFyYXRlIGA8dHNwYW4+YCBlbGVtZW50c1xuICAgICA9IChvYmplY3QpIHRoZSBgdGV4dGAgZWxlbWVudFxuICAgICAqKlxuICAgICA+IFVzYWdlXG4gICAgIHwgdmFyIHQxID0gcGFwZXIudGV4dCg1MCwgNTAsIFwiU25hcFwiKTtcbiAgICAgfCB2YXIgdDIgPSBwYXBlci50ZXh0KDUwLCA1MCwgW1wiU1wiLFwiblwiLFwiYVwiLFwicFwiXSk7XG4gICAgIHwgLy8gVGV4dCBwYXRoIHVzYWdlXG4gICAgIHwgdDEuYXR0cih7dGV4dHBhdGg6IFwiTTEwLDEwTDEwMCwxMDBcIn0pO1xuICAgICB8IC8vIG9yXG4gICAgIHwgdmFyIHB0aCA9IHBhcGVyLnBhdGgoXCJNMTAsMTBMMTAwLDEwMFwiKTtcbiAgICAgfCB0MS5hdHRyKHt0ZXh0cGF0aDogcHRofSk7XG4gICAgXFwqL1xuICAgIHByb3RvLnRleHQgPSBmdW5jdGlvbiAoeCwgeSwgdGV4dCkge1xuICAgICAgICB2YXIgZWwgPSBtYWtlKFwidGV4dFwiLCB0aGlzLm5vZGUpO1xuICAgICAgICBpZiAoaXMoeCwgXCJvYmplY3RcIikpIHtcbiAgICAgICAgICAgIGVsLmF0dHIoeCk7XG4gICAgICAgIH0gZWxzZSBpZiAoeCAhPSBudWxsKSB7XG4gICAgICAgICAgICBlbC5hdHRyKHtcbiAgICAgICAgICAgICAgICB4OiB4LFxuICAgICAgICAgICAgICAgIHk6IHksXG4gICAgICAgICAgICAgICAgdGV4dDogdGV4dCB8fCBcIlwiXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZWw7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogUGFwZXIubGluZVxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogRHJhd3MgYSBsaW5lXG4gICAgICoqXG4gICAgIC0geDEgKG51bWJlcikgeCBjb29yZGluYXRlIHBvc2l0aW9uIG9mIHRoZSBzdGFydFxuICAgICAtIHkxIChudW1iZXIpIHkgY29vcmRpbmF0ZSBwb3NpdGlvbiBvZiB0aGUgc3RhcnRcbiAgICAgLSB4MiAobnVtYmVyKSB4IGNvb3JkaW5hdGUgcG9zaXRpb24gb2YgdGhlIGVuZFxuICAgICAtIHkyIChudW1iZXIpIHkgY29vcmRpbmF0ZSBwb3NpdGlvbiBvZiB0aGUgZW5kXG4gICAgID0gKG9iamVjdCkgdGhlIGBsaW5lYCBlbGVtZW50XG4gICAgICoqXG4gICAgID4gVXNhZ2VcbiAgICAgfCB2YXIgdDEgPSBwYXBlci5saW5lKDUwLCA1MCwgMTAwLCAxMDApO1xuICAgIFxcKi9cbiAgICBwcm90by5saW5lID0gZnVuY3Rpb24gKHgxLCB5MSwgeDIsIHkyKSB7XG4gICAgICAgIHZhciBlbCA9IG1ha2UoXCJsaW5lXCIsIHRoaXMubm9kZSk7XG4gICAgICAgIGlmIChpcyh4MSwgXCJvYmplY3RcIikpIHtcbiAgICAgICAgICAgIGVsLmF0dHIoeDEpO1xuICAgICAgICB9IGVsc2UgaWYgKHgxICE9IG51bGwpIHtcbiAgICAgICAgICAgIGVsLmF0dHIoe1xuICAgICAgICAgICAgICAgIHgxOiB4MSxcbiAgICAgICAgICAgICAgICB4MjogeDIsXG4gICAgICAgICAgICAgICAgeTE6IHkxLFxuICAgICAgICAgICAgICAgIHkyOiB5MlxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVsO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIFBhcGVyLnBvbHlsaW5lXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBEcmF3cyBhIHBvbHlsaW5lXG4gICAgICoqXG4gICAgIC0gcG9pbnRzIChhcnJheSkgYXJyYXkgb2YgcG9pbnRzXG4gICAgICogb3JcbiAgICAgLSB2YXJhcmdzICjigKYpIHBvaW50c1xuICAgICA9IChvYmplY3QpIHRoZSBgcG9seWxpbmVgIGVsZW1lbnRcbiAgICAgKipcbiAgICAgPiBVc2FnZVxuICAgICB8IHZhciBwMSA9IHBhcGVyLnBvbHlsaW5lKFsxMCwgMTAsIDEwMCwgMTAwXSk7XG4gICAgIHwgdmFyIHAyID0gcGFwZXIucG9seWxpbmUoMTAsIDEwLCAxMDAsIDEwMCk7XG4gICAgXFwqL1xuICAgIHByb3RvLnBvbHlsaW5lID0gZnVuY3Rpb24gKHBvaW50cykge1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIHBvaW50cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGVsID0gbWFrZShcInBvbHlsaW5lXCIsIHRoaXMubm9kZSk7XG4gICAgICAgIGlmIChpcyhwb2ludHMsIFwib2JqZWN0XCIpICYmICFpcyhwb2ludHMsIFwiYXJyYXlcIikpIHtcbiAgICAgICAgICAgIGVsLmF0dHIocG9pbnRzKTtcbiAgICAgICAgfSBlbHNlIGlmIChwb2ludHMgIT0gbnVsbCkge1xuICAgICAgICAgICAgZWwuYXR0cih7XG4gICAgICAgICAgICAgICAgcG9pbnRzOiBwb2ludHNcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbDtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBQYXBlci5wb2x5Z29uXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBEcmF3cyBhIHBvbHlnb24uIFNlZSBAUGFwZXIucG9seWxpbmVcbiAgICBcXCovXG4gICAgcHJvdG8ucG9seWdvbiA9IGZ1bmN0aW9uIChwb2ludHMpIHtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICBwb2ludHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgICAgICB9XG4gICAgICAgIHZhciBlbCA9IG1ha2UoXCJwb2x5Z29uXCIsIHRoaXMubm9kZSk7XG4gICAgICAgIGlmIChpcyhwb2ludHMsIFwib2JqZWN0XCIpICYmICFpcyhwb2ludHMsIFwiYXJyYXlcIikpIHtcbiAgICAgICAgICAgIGVsLmF0dHIocG9pbnRzKTtcbiAgICAgICAgfSBlbHNlIGlmIChwb2ludHMgIT0gbnVsbCkge1xuICAgICAgICAgICAgZWwuYXR0cih7XG4gICAgICAgICAgICAgICAgcG9pbnRzOiBwb2ludHNcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbDtcbiAgICB9O1xuICAgIC8vIGdyYWRpZW50c1xuICAgIChmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8qXFxcbiAgICAgICAgICogUGFwZXIuZ3JhZGllbnRcbiAgICAgICAgIFsgbWV0aG9kIF1cbiAgICAgICAgICoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBncmFkaWVudCBlbGVtZW50XG4gICAgICAgICAqKlxuICAgICAgICAgLSBncmFkaWVudCAoc3RyaW5nKSBncmFkaWVudCBkZXNjcmlwdG9yXG4gICAgICAgICA+IEdyYWRpZW50IERlc2NyaXB0b3JcbiAgICAgICAgICogVGhlIGdyYWRpZW50IGRlc2NyaXB0b3IgaXMgYW4gZXhwcmVzc2lvbiBmb3JtYXR0ZWQgYXNcbiAgICAgICAgICogZm9sbG93czogYDx0eXBlPig8Y29vcmRzPik8Y29sb3JzPmAuICBUaGUgYDx0eXBlPmAgY2FuIGJlXG4gICAgICAgICAqIGVpdGhlciBsaW5lYXIgb3IgcmFkaWFsLiAgVGhlIHVwcGVyY2FzZSBgTGAgb3IgYFJgIGxldHRlcnNcbiAgICAgICAgICogaW5kaWNhdGUgYWJzb2x1dGUgY29vcmRpbmF0ZXMgb2Zmc2V0IGZyb20gdGhlIFNWRyBzdXJmYWNlLlxuICAgICAgICAgKiBMb3dlcmNhc2UgYGxgIG9yIGByYCBsZXR0ZXJzIGluZGljYXRlIGNvb3JkaW5hdGVzXG4gICAgICAgICAqIGNhbGN1bGF0ZWQgcmVsYXRpdmUgdG8gdGhlIGVsZW1lbnQgdG8gd2hpY2ggdGhlIGdyYWRpZW50IGlzXG4gICAgICAgICAqIGFwcGxpZWQuICBDb29yZGluYXRlcyBzcGVjaWZ5IGEgbGluZWFyIGdyYWRpZW50IHZlY3RvciBhc1xuICAgICAgICAgKiBgeDFgLCBgeTFgLCBgeDJgLCBgeTJgLCBvciBhIHJhZGlhbCBncmFkaWVudCBhcyBgY3hgLCBgY3lgLFxuICAgICAgICAgKiBgcmAgYW5kIG9wdGlvbmFsIGBmeGAsIGBmeWAgc3BlY2lmeWluZyBhIGZvY2FsIHBvaW50IGF3YXlcbiAgICAgICAgICogZnJvbSB0aGUgY2VudGVyIG9mIHRoZSBjaXJjbGUuIFNwZWNpZnkgYDxjb2xvcnM+YCBhcyBhIGxpc3RcbiAgICAgICAgICogb2YgZGFzaC1zZXBhcmF0ZWQgQ1NTIGNvbG9yIHZhbHVlcy4gIEVhY2ggY29sb3IgbWF5IGJlXG4gICAgICAgICAqIGZvbGxvd2VkIGJ5IGEgY3VzdG9tIG9mZnNldCB2YWx1ZSwgc2VwYXJhdGVkIHdpdGggYSBjb2xvblxuICAgICAgICAgKiBjaGFyYWN0ZXIuXG4gICAgICAgICA+IEV4YW1wbGVzXG4gICAgICAgICAqIExpbmVhciBncmFkaWVudCwgcmVsYXRpdmUgZnJvbSB0b3AtbGVmdCBjb3JuZXIgdG8gYm90dG9tLXJpZ2h0XG4gICAgICAgICAqIGNvcm5lciwgZnJvbSBibGFjayB0aHJvdWdoIHJlZCB0byB3aGl0ZTpcbiAgICAgICAgIHwgdmFyIGcgPSBwYXBlci5ncmFkaWVudChcImwoMCwgMCwgMSwgMSkjMDAwLSNmMDAtI2ZmZlwiKTtcbiAgICAgICAgICogTGluZWFyIGdyYWRpZW50LCBhYnNvbHV0ZSBmcm9tICgwLCAwKSB0byAoMTAwLCAxMDApLCBmcm9tIGJsYWNrXG4gICAgICAgICAqIHRocm91Z2ggcmVkIGF0IDI1JSB0byB3aGl0ZTpcbiAgICAgICAgIHwgdmFyIGcgPSBwYXBlci5ncmFkaWVudChcIkwoMCwgMCwgMTAwLCAxMDApIzAwMC0jZjAwOjI1JS0jZmZmXCIpO1xuICAgICAgICAgKiBSYWRpYWwgZ3JhZGllbnQsIHJlbGF0aXZlIGZyb20gdGhlIGNlbnRlciBvZiB0aGUgZWxlbWVudCB3aXRoIHJhZGl1c1xuICAgICAgICAgKiBoYWxmIHRoZSB3aWR0aCwgZnJvbSBibGFjayB0byB3aGl0ZTpcbiAgICAgICAgIHwgdmFyIGcgPSBwYXBlci5ncmFkaWVudChcInIoMC41LCAwLjUsIDAuNSkjMDAwLSNmZmZcIik7XG4gICAgICAgICAqIFRvIGFwcGx5IHRoZSBncmFkaWVudDpcbiAgICAgICAgIHwgcGFwZXIuY2lyY2xlKDUwLCA1MCwgNDApLmF0dHIoe1xuICAgICAgICAgfCAgICAgZmlsbDogZ1xuICAgICAgICAgfCB9KTtcbiAgICAgICAgID0gKG9iamVjdCkgdGhlIGBncmFkaWVudGAgZWxlbWVudFxuICAgICAgICBcXCovXG4gICAgICAgIHByb3RvLmdyYWRpZW50ID0gZnVuY3Rpb24gKHN0cikge1xuICAgICAgICAgICAgcmV0dXJuIGdyYWRpZW50KHRoaXMuZGVmcywgc3RyKTtcbiAgICAgICAgfTtcbiAgICAgICAgcHJvdG8uZ3JhZGllbnRMaW5lYXIgPSBmdW5jdGlvbiAoeDEsIHkxLCB4MiwgeTIpIHtcbiAgICAgICAgICAgIHJldHVybiBncmFkaWVudExpbmVhcih0aGlzLmRlZnMsIHgxLCB5MSwgeDIsIHkyKTtcbiAgICAgICAgfTtcbiAgICAgICAgcHJvdG8uZ3JhZGllbnRSYWRpYWwgPSBmdW5jdGlvbiAoY3gsIGN5LCByLCBmeCwgZnkpIHtcbiAgICAgICAgICAgIHJldHVybiBncmFkaWVudFJhZGlhbCh0aGlzLmRlZnMsIGN4LCBjeSwgciwgZngsIGZ5KTtcbiAgICAgICAgfTtcbiAgICAgICAgLypcXFxuICAgICAgICAgKiBQYXBlci50b1N0cmluZ1xuICAgICAgICAgWyBtZXRob2QgXVxuICAgICAgICAgKipcbiAgICAgICAgICogUmV0dXJucyBTVkcgY29kZSBmb3IgdGhlIEBQYXBlclxuICAgICAgICAgPSAoc3RyaW5nKSBTVkcgY29kZSBmb3IgdGhlIEBQYXBlclxuICAgICAgICBcXCovXG4gICAgICAgIHByb3RvLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGYgPSBnbG9iLmRvYy5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCksXG4gICAgICAgICAgICAgICAgZCA9IGdsb2IuZG9jLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksXG4gICAgICAgICAgICAgICAgc3ZnID0gdGhpcy5ub2RlLmNsb25lTm9kZSh0cnVlKSxcbiAgICAgICAgICAgICAgICByZXM7XG4gICAgICAgICAgICBmLmFwcGVuZENoaWxkKGQpO1xuICAgICAgICAgICAgZC5hcHBlbmRDaGlsZChzdmcpO1xuICAgICAgICAgICAgJChzdmcsIHt4bWxuczogeG1sbnN9KTtcbiAgICAgICAgICAgIHJlcyA9IGQuaW5uZXJIVE1MO1xuICAgICAgICAgICAgZi5yZW1vdmVDaGlsZChmLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfTtcbiAgICAgICAgLypcXFxuICAgICAgICAgKiBQYXBlci5jbGVhclxuICAgICAgICAgWyBtZXRob2QgXVxuICAgICAgICAgKipcbiAgICAgICAgICogUmVtb3ZlcyBhbGwgY2hpbGQgbm9kZXMgb2YgdGhlIHBhcGVyLCBleGNlcHQgPGRlZnM+LlxuICAgICAgICBcXCovXG4gICAgICAgIHByb3RvLmNsZWFyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIG5vZGUgPSB0aGlzLm5vZGUuZmlyc3RDaGlsZCxcbiAgICAgICAgICAgICAgICBuZXh0O1xuICAgICAgICAgICAgd2hpbGUgKG5vZGUpIHtcbiAgICAgICAgICAgICAgICBuZXh0ID0gbm9kZS5uZXh0U2libGluZztcbiAgICAgICAgICAgICAgICBpZiAobm9kZS50YWdOYW1lICE9IFwiZGVmc1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChub2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbm9kZSA9IG5leHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSgpKTtcbn0oUGFwZXIucHJvdG90eXBlKSk7XG5cbi8vIHNpbXBsZSBhamF4XG4vKlxcXG4gKiBTbmFwLmFqYXhcbiBbIG1ldGhvZCBdXG4gKipcbiAqIFNpbXBsZSBpbXBsZW1lbnRhdGlvbiBvZiBBamF4XG4gKipcbiAtIHVybCAoc3RyaW5nKSBVUkxcbiAtIHBvc3REYXRhIChvYmplY3R8c3RyaW5nKSBkYXRhIGZvciBwb3N0IHJlcXVlc3RcbiAtIGNhbGxiYWNrIChmdW5jdGlvbikgY2FsbGJhY2tcbiAtIHNjb3BlIChvYmplY3QpICNvcHRpb25hbCBzY29wZSBvZiBjYWxsYmFja1xuICogb3JcbiAtIHVybCAoc3RyaW5nKSBVUkxcbiAtIGNhbGxiYWNrIChmdW5jdGlvbikgY2FsbGJhY2tcbiAtIHNjb3BlIChvYmplY3QpICNvcHRpb25hbCBzY29wZSBvZiBjYWxsYmFja1xuID0gKFhNTEh0dHBSZXF1ZXN0KSB0aGUgWE1MSHR0cFJlcXVlc3Qgb2JqZWN0LCBqdXN0IGluIGNhc2VcblxcKi9cblNuYXAuYWpheCA9IGZ1bmN0aW9uICh1cmwsIHBvc3REYXRhLCBjYWxsYmFjaywgc2NvcGUpe1xuICAgIHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QsXG4gICAgICAgIGlkID0gSUQoKTtcbiAgICBpZiAocmVxKSB7XG4gICAgICAgIGlmIChpcyhwb3N0RGF0YSwgXCJmdW5jdGlvblwiKSkge1xuICAgICAgICAgICAgc2NvcGUgPSBjYWxsYmFjaztcbiAgICAgICAgICAgIGNhbGxiYWNrID0gcG9zdERhdGE7XG4gICAgICAgICAgICBwb3N0RGF0YSA9IG51bGw7XG4gICAgICAgIH0gZWxzZSBpZiAoaXMocG9zdERhdGEsIFwib2JqZWN0XCIpKSB7XG4gICAgICAgICAgICB2YXIgcGQgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBwb3N0RGF0YSkgaWYgKHBvc3REYXRhLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICAgICAgICBwZC5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChrZXkpICsgXCI9XCIgKyBlbmNvZGVVUklDb21wb25lbnQocG9zdERhdGFba2V5XSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcG9zdERhdGEgPSBwZC5qb2luKFwiJlwiKTtcbiAgICAgICAgfVxuICAgICAgICByZXEub3BlbigocG9zdERhdGEgPyBcIlBPU1RcIiA6IFwiR0VUXCIpLCB1cmwsIHRydWUpO1xuICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcihcIlgtUmVxdWVzdGVkLVdpdGhcIiwgXCJYTUxIdHRwUmVxdWVzdFwiKTtcbiAgICAgICAgaWYgKHBvc3REYXRhKSB7XG4gICAgICAgICAgICByZXEuc2V0UmVxdWVzdEhlYWRlcihcIkNvbnRlbnQtdHlwZVwiLCBcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZFwiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGV2ZS5vbmNlKFwic25hcC5hamF4LlwiICsgaWQgKyBcIi4wXCIsIGNhbGxiYWNrKTtcbiAgICAgICAgICAgIGV2ZS5vbmNlKFwic25hcC5hamF4LlwiICsgaWQgKyBcIi4yMDBcIiwgY2FsbGJhY2spO1xuICAgICAgICAgICAgZXZlLm9uY2UoXCJzbmFwLmFqYXguXCIgKyBpZCArIFwiLjMwNFwiLCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICAgICAgcmVxLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlICE9IDQpIHJldHVybjtcbiAgICAgICAgICAgIGV2ZShcInNuYXAuYWpheC5cIiArIGlkICsgXCIuXCIgKyByZXEuc3RhdHVzLCBzY29wZSwgcmVxKTtcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgICAgIHJldHVybiByZXE7XG4gICAgICAgIH1cbiAgICAgICAgcmVxLnNlbmQocG9zdERhdGEpO1xuICAgICAgICByZXR1cm4gcmVxO1xuICAgIH1cbn07XG4vKlxcXG4gKiBTbmFwLmxvYWRcbiBbIG1ldGhvZCBdXG4gKipcbiAqIExvYWRzIGV4dGVybmFsIFNWRyBmaWxlIGFzIGEgQEZyYWdtZW50IChzZWUgQFNuYXAuYWpheCBmb3IgbW9yZSBhZHZhbmNlZCBBSkFYKVxuICoqXG4gLSB1cmwgKHN0cmluZykgVVJMXG4gLSBjYWxsYmFjayAoZnVuY3Rpb24pIGNhbGxiYWNrXG4gLSBzY29wZSAob2JqZWN0KSAjb3B0aW9uYWwgc2NvcGUgb2YgY2FsbGJhY2tcblxcKi9cblNuYXAubG9hZCA9IGZ1bmN0aW9uICh1cmwsIGNhbGxiYWNrLCBzY29wZSkge1xuICAgIFNuYXAuYWpheCh1cmwsIGZ1bmN0aW9uIChyZXEpIHtcbiAgICAgICAgdmFyIGYgPSBTbmFwLnBhcnNlKHJlcS5yZXNwb25zZVRleHQpO1xuICAgICAgICBzY29wZSA/IGNhbGxiYWNrLmNhbGwoc2NvcGUsIGYpIDogY2FsbGJhY2soZik7XG4gICAgfSk7XG59O1xuXG4vLyBBdHRyaWJ1dGVzIGV2ZW50IGhhbmRsZXJzXG5ldmUub24oXCJzbmFwLnV0aWwuYXR0ci5tYXNrXCIsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEVsZW1lbnQgfHwgdmFsdWUgaW5zdGFuY2VvZiBGcmFnbWVudCkge1xuICAgICAgICBldmUuc3RvcCgpO1xuICAgICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBGcmFnbWVudCAmJiB2YWx1ZS5ub2RlLmNoaWxkTm9kZXMubGVuZ3RoID09IDEpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUubm9kZS5maXJzdENoaWxkO1xuICAgICAgICAgICAgZ2V0U29tZURlZnModGhpcykuYXBwZW5kQ2hpbGQodmFsdWUpO1xuICAgICAgICAgICAgdmFsdWUgPSB3cmFwKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWUudHlwZSA9PSBcIm1hc2tcIikge1xuICAgICAgICAgICAgdmFyIG1hc2sgPSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG1hc2sgPSBtYWtlKFwibWFza1wiLCBnZXRTb21lRGVmcyh0aGlzKSk7XG4gICAgICAgICAgICBtYXNrLm5vZGUuYXBwZW5kQ2hpbGQodmFsdWUubm9kZSk7XG4gICAgICAgICAgICAhbWFzay5ub2RlLmlkICYmICQobWFzay5ub2RlLCB7XG4gICAgICAgICAgICAgICAgaWQ6IG1hc2suaWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgICQodGhpcy5ub2RlLCB7XG4gICAgICAgICAgICBtYXNrOiBVUkwobWFzay5pZClcbiAgICAgICAgfSk7XG4gICAgfVxufSk7XG4oZnVuY3Rpb24gKGNsaXBJdCkge1xuICAgIGV2ZS5vbihcInNuYXAudXRpbC5hdHRyLmNsaXBcIiwgY2xpcEl0KTtcbiAgICBldmUub24oXCJzbmFwLnV0aWwuYXR0ci5jbGlwLXBhdGhcIiwgY2xpcEl0KTtcbiAgICBldmUub24oXCJzbmFwLnV0aWwuYXR0ci5jbGlwUGF0aFwiLCBjbGlwSXQpO1xufShmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBFbGVtZW50IHx8IHZhbHVlIGluc3RhbmNlb2YgRnJhZ21lbnQpIHtcbiAgICAgICAgZXZlLnN0b3AoKTtcbiAgICAgICAgaWYgKHZhbHVlLnR5cGUgPT0gXCJjbGlwUGF0aFwiKSB7XG4gICAgICAgICAgICB2YXIgY2xpcCA9IHZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2xpcCA9IG1ha2UoXCJjbGlwUGF0aFwiLCBnZXRTb21lRGVmcyh0aGlzKSk7XG4gICAgICAgICAgICBjbGlwLm5vZGUuYXBwZW5kQ2hpbGQodmFsdWUubm9kZSk7XG4gICAgICAgICAgICAhY2xpcC5ub2RlLmlkICYmICQoY2xpcC5ub2RlLCB7XG4gICAgICAgICAgICAgICAgaWQ6IGNsaXAuaWRcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgICQodGhpcy5ub2RlLCB7XG4gICAgICAgICAgICBcImNsaXAtcGF0aFwiOiBVUkwoY2xpcC5pZClcbiAgICAgICAgfSk7XG4gICAgfVxufSkpO1xuZnVuY3Rpb24gZmlsbFN0cm9rZShuYW1lKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBldmUuc3RvcCgpO1xuICAgICAgICBpZiAodmFsdWUgaW5zdGFuY2VvZiBGcmFnbWVudCAmJiB2YWx1ZS5ub2RlLmNoaWxkTm9kZXMubGVuZ3RoID09IDEgJiZcbiAgICAgICAgICAgICh2YWx1ZS5ub2RlLmZpcnN0Q2hpbGQudGFnTmFtZSA9PSBcInJhZGlhbEdyYWRpZW50XCIgfHxcbiAgICAgICAgICAgIHZhbHVlLm5vZGUuZmlyc3RDaGlsZC50YWdOYW1lID09IFwibGluZWFyR3JhZGllbnRcIiB8fFxuICAgICAgICAgICAgdmFsdWUubm9kZS5maXJzdENoaWxkLnRhZ05hbWUgPT0gXCJwYXR0ZXJuXCIpKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IHZhbHVlLm5vZGUuZmlyc3RDaGlsZDtcbiAgICAgICAgICAgIGdldFNvbWVEZWZzKHRoaXMpLmFwcGVuZENoaWxkKHZhbHVlKTtcbiAgICAgICAgICAgIHZhbHVlID0gd3JhcCh2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRWxlbWVudCkge1xuICAgICAgICAgICAgaWYgKHZhbHVlLnR5cGUgPT0gXCJyYWRpYWxHcmFkaWVudFwiIHx8IHZhbHVlLnR5cGUgPT0gXCJsaW5lYXJHcmFkaWVudFwiXG4gICAgICAgICAgICAgICB8fCB2YWx1ZS50eXBlID09IFwicGF0dGVyblwiKSB7XG4gICAgICAgICAgICAgICAgaWYgKCF2YWx1ZS5ub2RlLmlkKSB7XG4gICAgICAgICAgICAgICAgICAgICQodmFsdWUubm9kZSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHZhbHVlLmlkXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgZmlsbCA9IFVSTCh2YWx1ZS5ub2RlLmlkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZmlsbCA9IHZhbHVlLmF0dHIobmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmaWxsID0gU25hcC5jb2xvcih2YWx1ZSk7XG4gICAgICAgICAgICBpZiAoZmlsbC5lcnJvcikge1xuICAgICAgICAgICAgICAgIHZhciBncmFkID0gZ3JhZGllbnQoZ2V0U29tZURlZnModGhpcyksIHZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAoZ3JhZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWdyYWQubm9kZS5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJChncmFkLm5vZGUsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogZ3JhZC5pZFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZmlsbCA9IFVSTChncmFkLm5vZGUuaWQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGwgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZpbGwgPSBTdHIoZmlsbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGF0dHJzID0ge307XG4gICAgICAgIGF0dHJzW25hbWVdID0gZmlsbDtcbiAgICAgICAgJCh0aGlzLm5vZGUsIGF0dHJzKTtcbiAgICAgICAgdGhpcy5ub2RlLnN0eWxlW25hbWVdID0gRTtcbiAgICB9O1xufVxuZXZlLm9uKFwic25hcC51dGlsLmF0dHIuZmlsbFwiLCBmaWxsU3Ryb2tlKFwiZmlsbFwiKSk7XG5ldmUub24oXCJzbmFwLnV0aWwuYXR0ci5zdHJva2VcIiwgZmlsbFN0cm9rZShcInN0cm9rZVwiKSk7XG52YXIgZ3JhZHJnID0gL14oW2xyXSkoPzpcXCgoW14pXSopXFwpKT8oLiopJC9pO1xuZXZlLm9uKFwic25hcC51dGlsLmdyYWQucGFyc2VcIiwgZnVuY3Rpb24gcGFyc2VHcmFkKHN0cmluZykge1xuICAgIHN0cmluZyA9IFN0cihzdHJpbmcpO1xuICAgIHZhciB0b2tlbnMgPSBzdHJpbmcubWF0Y2goZ3JhZHJnKTtcbiAgICBpZiAoIXRva2Vucykge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgdmFyIHR5cGUgPSB0b2tlbnNbMV0sXG4gICAgICAgIHBhcmFtcyA9IHRva2Vuc1syXSxcbiAgICAgICAgc3RvcHMgPSB0b2tlbnNbM107XG4gICAgcGFyYW1zID0gcGFyYW1zLnNwbGl0KC9cXHMqLFxccyovKS5tYXAoZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgIHJldHVybiArZWwgPT0gZWwgPyArZWwgOiBlbDtcbiAgICB9KTtcbiAgICBpZiAocGFyYW1zLmxlbmd0aCA9PSAxICYmIHBhcmFtc1swXSA9PSAwKSB7XG4gICAgICAgIHBhcmFtcyA9IFtdO1xuICAgIH1cbiAgICBzdG9wcyA9IHN0b3BzLnNwbGl0KFwiLVwiKTtcbiAgICBzdG9wcyA9IHN0b3BzLm1hcChmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgZWwgPSBlbC5zcGxpdChcIjpcIik7XG4gICAgICAgIHZhciBvdXQgPSB7XG4gICAgICAgICAgICBjb2xvcjogZWxbMF1cbiAgICAgICAgfTtcbiAgICAgICAgaWYgKGVsWzFdKSB7XG4gICAgICAgICAgICBvdXQub2Zmc2V0ID0gZWxbMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9KTtcbiAgICByZXR1cm4ge1xuICAgICAgICB0eXBlOiB0eXBlLFxuICAgICAgICBwYXJhbXM6IHBhcmFtcyxcbiAgICAgICAgc3RvcHM6IHN0b3BzXG4gICAgfTtcbn0pO1xuXG5ldmUub24oXCJzbmFwLnV0aWwuYXR0ci5kXCIsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGV2ZS5zdG9wKCk7XG4gICAgaWYgKGlzKHZhbHVlLCBcImFycmF5XCIpICYmIGlzKHZhbHVlWzBdLCBcImFycmF5XCIpKSB7XG4gICAgICAgIHZhbHVlID0gU25hcC5wYXRoLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICAgIH1cbiAgICB2YWx1ZSA9IFN0cih2YWx1ZSk7XG4gICAgaWYgKHZhbHVlLm1hdGNoKC9bcnVvXS9pKSkge1xuICAgICAgICB2YWx1ZSA9IFNuYXAucGF0aC50b0Fic29sdXRlKHZhbHVlKTtcbiAgICB9XG4gICAgJCh0aGlzLm5vZGUsIHtkOiB2YWx1ZX0pO1xufSkoLTEpO1xuZXZlLm9uKFwic25hcC51dGlsLmF0dHIuI3RleHRcIiwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgZXZlLnN0b3AoKTtcbiAgICB2YWx1ZSA9IFN0cih2YWx1ZSk7XG4gICAgdmFyIHR4dCA9IGdsb2IuZG9jLmNyZWF0ZVRleHROb2RlKHZhbHVlKTtcbiAgICB3aGlsZSAodGhpcy5ub2RlLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgdGhpcy5ub2RlLnJlbW92ZUNoaWxkKHRoaXMubm9kZS5maXJzdENoaWxkKTtcbiAgICB9XG4gICAgdGhpcy5ub2RlLmFwcGVuZENoaWxkKHR4dCk7XG59KSgtMSk7XG5ldmUub24oXCJzbmFwLnV0aWwuYXR0ci5wYXRoXCIsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGV2ZS5zdG9wKCk7XG4gICAgdGhpcy5hdHRyKHtkOiB2YWx1ZX0pO1xufSkoLTEpO1xuZXZlLm9uKFwic25hcC51dGlsLmF0dHIudmlld0JveFwiLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgdmI7XG4gICAgaWYgKGlzKHZhbHVlLCBcIm9iamVjdFwiKSAmJiBcInhcIiBpbiB2YWx1ZSkge1xuICAgICAgICB2YiA9IFt2YWx1ZS54LCB2YWx1ZS55LCB2YWx1ZS53aWR0aCwgdmFsdWUuaGVpZ2h0XS5qb2luKFwiIFwiKTtcbiAgICB9IGVsc2UgaWYgKGlzKHZhbHVlLCBcImFycmF5XCIpKSB7XG4gICAgICAgIHZiID0gdmFsdWUuam9pbihcIiBcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmIgPSB2YWx1ZTtcbiAgICB9XG4gICAgJCh0aGlzLm5vZGUsIHtcbiAgICAgICAgdmlld0JveDogdmJcbiAgICB9KTtcbiAgICBldmUuc3RvcCgpO1xufSkoLTEpO1xuZXZlLm9uKFwic25hcC51dGlsLmF0dHIudHJhbnNmb3JtXCIsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIHRoaXMudHJhbnNmb3JtKHZhbHVlKTtcbiAgICBldmUuc3RvcCgpO1xufSkoLTEpO1xuZXZlLm9uKFwic25hcC51dGlsLmF0dHIuclwiLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICBpZiAodGhpcy50eXBlID09IFwicmVjdFwiKSB7XG4gICAgICAgIGV2ZS5zdG9wKCk7XG4gICAgICAgICQodGhpcy5ub2RlLCB7XG4gICAgICAgICAgICByeDogdmFsdWUsXG4gICAgICAgICAgICByeTogdmFsdWVcbiAgICAgICAgfSk7XG4gICAgfVxufSkoLTEpO1xuZXZlLm9uKFwic25hcC51dGlsLmF0dHIudGV4dHBhdGhcIiwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgZXZlLnN0b3AoKTtcbiAgICBpZiAodGhpcy50eXBlID09IFwidGV4dFwiKSB7XG4gICAgICAgIHZhciBpZCwgdHAsIG5vZGU7XG4gICAgICAgIGlmICghdmFsdWUgJiYgdGhpcy50ZXh0UGF0aCkge1xuICAgICAgICAgICAgdHAgPSB0aGlzLnRleHRQYXRoO1xuICAgICAgICAgICAgd2hpbGUgKHRwLm5vZGUuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgIHRoaXMubm9kZS5hcHBlbmRDaGlsZCh0cC5ub2RlLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdHAucmVtb3ZlKCk7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy50ZXh0UGF0aDtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXModmFsdWUsIFwic3RyaW5nXCIpKSB7XG4gICAgICAgICAgICB2YXIgZGVmcyA9IGdldFNvbWVEZWZzKHRoaXMpLFxuICAgICAgICAgICAgICAgIHBhdGggPSB3cmFwKGRlZnMucGFyZW50Tm9kZSkucGF0aCh2YWx1ZSk7XG4gICAgICAgICAgICBkZWZzLmFwcGVuZENoaWxkKHBhdGgubm9kZSk7XG4gICAgICAgICAgICBpZCA9IHBhdGguaWQ7XG4gICAgICAgICAgICBwYXRoLmF0dHIoe2lkOiBpZH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWUgPSB3cmFwKHZhbHVlKTtcbiAgICAgICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIEVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBpZCA9IHZhbHVlLmF0dHIoXCJpZFwiKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGlkID0gdmFsdWUuaWQ7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlLmF0dHIoe2lkOiBpZH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaWQpIHtcbiAgICAgICAgICAgIHRwID0gdGhpcy50ZXh0UGF0aDtcbiAgICAgICAgICAgIG5vZGUgPSB0aGlzLm5vZGU7XG4gICAgICAgICAgICBpZiAodHApIHtcbiAgICAgICAgICAgICAgICB0cC5hdHRyKHtcInhsaW5rOmhyZWZcIjogXCIjXCIgKyBpZH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0cCA9ICQoXCJ0ZXh0UGF0aFwiLCB7XG4gICAgICAgICAgICAgICAgICAgIFwieGxpbms6aHJlZlwiOiBcIiNcIiArIGlkXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgd2hpbGUgKG5vZGUuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICB0cC5hcHBlbmRDaGlsZChub2RlLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBub2RlLmFwcGVuZENoaWxkKHRwKTtcbiAgICAgICAgICAgICAgICB0aGlzLnRleHRQYXRoID0gd3JhcCh0cCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59KSgtMSk7XG5ldmUub24oXCJzbmFwLnV0aWwuYXR0ci50ZXh0XCIsIGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGlmICh0aGlzLnR5cGUgPT0gXCJ0ZXh0XCIpIHtcbiAgICAgICAgdmFyIGkgPSAwLFxuICAgICAgICAgICAgbm9kZSA9IHRoaXMubm9kZSxcbiAgICAgICAgICAgIHR1bmVyID0gZnVuY3Rpb24gKGNodW5rKSB7XG4gICAgICAgICAgICAgICAgdmFyIG91dCA9ICQoXCJ0c3BhblwiKTtcbiAgICAgICAgICAgICAgICBpZiAoaXMoY2h1bmssIFwiYXJyYXlcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaHVuay5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0LmFwcGVuZENoaWxkKHR1bmVyKGNodW5rW2ldKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXQuYXBwZW5kQ2hpbGQoZ2xvYi5kb2MuY3JlYXRlVGV4dE5vZGUoY2h1bmspKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgb3V0Lm5vcm1hbGl6ZSAmJiBvdXQubm9ybWFsaXplKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgICAgICAgIH07XG4gICAgICAgIHdoaWxlIChub2RlLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIG5vZGUucmVtb3ZlQ2hpbGQobm9kZS5maXJzdENoaWxkKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdHVuZWQgPSB0dW5lcih2YWx1ZSk7XG4gICAgICAgIHdoaWxlICh0dW5lZC5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICBub2RlLmFwcGVuZENoaWxkKHR1bmVkLmZpcnN0Q2hpbGQpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGV2ZS5zdG9wKCk7XG59KSgtMSk7XG4vLyBkZWZhdWx0XG52YXIgY3NzQXR0ciA9IHtcbiAgICBcImFsaWdubWVudC1iYXNlbGluZVwiOiAwLFxuICAgIFwiYmFzZWxpbmUtc2hpZnRcIjogMCxcbiAgICBcImNsaXBcIjogMCxcbiAgICBcImNsaXAtcGF0aFwiOiAwLFxuICAgIFwiY2xpcC1ydWxlXCI6IDAsXG4gICAgXCJjb2xvclwiOiAwLFxuICAgIFwiY29sb3ItaW50ZXJwb2xhdGlvblwiOiAwLFxuICAgIFwiY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzXCI6IDAsXG4gICAgXCJjb2xvci1wcm9maWxlXCI6IDAsXG4gICAgXCJjb2xvci1yZW5kZXJpbmdcIjogMCxcbiAgICBcImN1cnNvclwiOiAwLFxuICAgIFwiZGlyZWN0aW9uXCI6IDAsXG4gICAgXCJkaXNwbGF5XCI6IDAsXG4gICAgXCJkb21pbmFudC1iYXNlbGluZVwiOiAwLFxuICAgIFwiZW5hYmxlLWJhY2tncm91bmRcIjogMCxcbiAgICBcImZpbGxcIjogMCxcbiAgICBcImZpbGwtb3BhY2l0eVwiOiAwLFxuICAgIFwiZmlsbC1ydWxlXCI6IDAsXG4gICAgXCJmaWx0ZXJcIjogMCxcbiAgICBcImZsb29kLWNvbG9yXCI6IDAsXG4gICAgXCJmbG9vZC1vcGFjaXR5XCI6IDAsXG4gICAgXCJmb250XCI6IDAsXG4gICAgXCJmb250LWZhbWlseVwiOiAwLFxuICAgIFwiZm9udC1zaXplXCI6IDAsXG4gICAgXCJmb250LXNpemUtYWRqdXN0XCI6IDAsXG4gICAgXCJmb250LXN0cmV0Y2hcIjogMCxcbiAgICBcImZvbnQtc3R5bGVcIjogMCxcbiAgICBcImZvbnQtdmFyaWFudFwiOiAwLFxuICAgIFwiZm9udC13ZWlnaHRcIjogMCxcbiAgICBcImdseXBoLW9yaWVudGF0aW9uLWhvcml6b250YWxcIjogMCxcbiAgICBcImdseXBoLW9yaWVudGF0aW9uLXZlcnRpY2FsXCI6IDAsXG4gICAgXCJpbWFnZS1yZW5kZXJpbmdcIjogMCxcbiAgICBcImtlcm5pbmdcIjogMCxcbiAgICBcImxldHRlci1zcGFjaW5nXCI6IDAsXG4gICAgXCJsaWdodGluZy1jb2xvclwiOiAwLFxuICAgIFwibWFya2VyXCI6IDAsXG4gICAgXCJtYXJrZXItZW5kXCI6IDAsXG4gICAgXCJtYXJrZXItbWlkXCI6IDAsXG4gICAgXCJtYXJrZXItc3RhcnRcIjogMCxcbiAgICBcIm1hc2tcIjogMCxcbiAgICBcIm9wYWNpdHlcIjogMCxcbiAgICBcIm92ZXJmbG93XCI6IDAsXG4gICAgXCJwb2ludGVyLWV2ZW50c1wiOiAwLFxuICAgIFwic2hhcGUtcmVuZGVyaW5nXCI6IDAsXG4gICAgXCJzdG9wLWNvbG9yXCI6IDAsXG4gICAgXCJzdG9wLW9wYWNpdHlcIjogMCxcbiAgICBcInN0cm9rZVwiOiAwLFxuICAgIFwic3Ryb2tlLWRhc2hhcnJheVwiOiAwLFxuICAgIFwic3Ryb2tlLWRhc2hvZmZzZXRcIjogMCxcbiAgICBcInN0cm9rZS1saW5lY2FwXCI6IDAsXG4gICAgXCJzdHJva2UtbGluZWpvaW5cIjogMCxcbiAgICBcInN0cm9rZS1taXRlcmxpbWl0XCI6IDAsXG4gICAgXCJzdHJva2Utb3BhY2l0eVwiOiAwLFxuICAgIFwic3Ryb2tlLXdpZHRoXCI6IDAsXG4gICAgXCJ0ZXh0LWFuY2hvclwiOiAwLFxuICAgIFwidGV4dC1kZWNvcmF0aW9uXCI6IDAsXG4gICAgXCJ0ZXh0LXJlbmRlcmluZ1wiOiAwLFxuICAgIFwidW5pY29kZS1iaWRpXCI6IDAsXG4gICAgXCJ2aXNpYmlsaXR5XCI6IDAsXG4gICAgXCJ3b3JkLXNwYWNpbmdcIjogMCxcbiAgICBcIndyaXRpbmctbW9kZVwiOiAwXG59O1xuXG5ldmUub24oXCJzbmFwLnV0aWwuYXR0clwiLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICB2YXIgYXR0ID0gZXZlLm50KCksXG4gICAgICAgIGF0dHIgPSB7fTtcbiAgICBhdHQgPSBhdHQuc3Vic3RyaW5nKGF0dC5sYXN0SW5kZXhPZihcIi5cIikgKyAxKTtcbiAgICBhdHRyW2F0dF0gPSB2YWx1ZTtcbiAgICB2YXIgc3R5bGUgPSBhdHQucmVwbGFjZSgvLShcXHcpL2dpLCBmdW5jdGlvbiAoYWxsLCBsZXR0ZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBsZXR0ZXIudG9VcHBlckNhc2UoKTtcbiAgICAgICAgfSksXG4gICAgICAgIGNzcyA9IGF0dC5yZXBsYWNlKC9bQS1aXS9nLCBmdW5jdGlvbiAobGV0dGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gXCItXCIgKyBsZXR0ZXIudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgfSk7XG4gICAgaWYgKGNzc0F0dHJbaGFzXShjc3MpKSB7XG4gICAgICAgIHRoaXMubm9kZS5zdHlsZVtzdHlsZV0gPSB2YWx1ZSA9PSBudWxsID8gRSA6IHZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgICQodGhpcy5ub2RlLCBhdHRyKTtcbiAgICB9XG59KTtcbmV2ZS5vbihcInNuYXAudXRpbC5nZXRhdHRyLnRyYW5zZm9ybVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgZXZlLnN0b3AoKTtcbiAgICByZXR1cm4gdGhpcy50cmFuc2Zvcm0oKTtcbn0pKC0xKTtcbmV2ZS5vbihcInNuYXAudXRpbC5nZXRhdHRyLnRleHRwYXRoXCIsIGZ1bmN0aW9uICgpIHtcbiAgICBldmUuc3RvcCgpO1xuICAgIHJldHVybiB0aGlzLnRleHRQYXRoO1xufSkoLTEpO1xuLy8gTWFya2Vyc1xuKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBnZXR0ZXIoZW5kKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBldmUuc3RvcCgpO1xuICAgICAgICAgICAgdmFyIHN0eWxlID0gZ2xvYi5kb2MuZGVmYXVsdFZpZXcuZ2V0Q29tcHV0ZWRTdHlsZSh0aGlzLm5vZGUsIG51bGwpLmdldFByb3BlcnR5VmFsdWUoXCJtYXJrZXItXCIgKyBlbmQpO1xuICAgICAgICAgICAgaWYgKHN0eWxlID09IFwibm9uZVwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHN0eWxlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gU25hcChnbG9iLmRvYy5nZXRFbGVtZW50QnlJZChzdHlsZS5tYXRjaChyZVVSTFZhbHVlKVsxXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBzZXR0ZXIoZW5kKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgIGV2ZS5zdG9wKCk7XG4gICAgICAgICAgICB2YXIgbmFtZSA9IFwibWFya2VyXCIgKyBlbmQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBlbmQuc3Vic3RyaW5nKDEpO1xuICAgICAgICAgICAgaWYgKHZhbHVlID09IFwiXCIgfHwgIXZhbHVlKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ub2RlLnN0eWxlW25hbWVdID0gXCJub25lXCI7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHZhbHVlLnR5cGUgPT0gXCJtYXJrZXJcIikge1xuICAgICAgICAgICAgICAgIHZhciBpZCA9IHZhbHVlLm5vZGUuaWQ7XG4gICAgICAgICAgICAgICAgaWYgKCFpZCkge1xuICAgICAgICAgICAgICAgICAgICAkKHZhbHVlLm5vZGUsIHtpZDogdmFsdWUuaWR9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdGhpcy5ub2RlLnN0eWxlW25hbWVdID0gVVJMKGlkKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfVxuICAgIGV2ZS5vbihcInNuYXAudXRpbC5nZXRhdHRyLm1hcmtlci1lbmRcIiwgZ2V0dGVyKFwiZW5kXCIpKSgtMSk7XG4gICAgZXZlLm9uKFwic25hcC51dGlsLmdldGF0dHIubWFya2VyRW5kXCIsIGdldHRlcihcImVuZFwiKSkoLTEpO1xuICAgIGV2ZS5vbihcInNuYXAudXRpbC5nZXRhdHRyLm1hcmtlci1zdGFydFwiLCBnZXR0ZXIoXCJzdGFydFwiKSkoLTEpO1xuICAgIGV2ZS5vbihcInNuYXAudXRpbC5nZXRhdHRyLm1hcmtlclN0YXJ0XCIsIGdldHRlcihcInN0YXJ0XCIpKSgtMSk7XG4gICAgZXZlLm9uKFwic25hcC51dGlsLmdldGF0dHIubWFya2VyLW1pZFwiLCBnZXR0ZXIoXCJtaWRcIikpKC0xKTtcbiAgICBldmUub24oXCJzbmFwLnV0aWwuZ2V0YXR0ci5tYXJrZXJNaWRcIiwgZ2V0dGVyKFwibWlkXCIpKSgtMSk7XG4gICAgZXZlLm9uKFwic25hcC51dGlsLmF0dHIubWFya2VyLWVuZFwiLCBzZXR0ZXIoXCJlbmRcIikpKC0xKTtcbiAgICBldmUub24oXCJzbmFwLnV0aWwuYXR0ci5tYXJrZXJFbmRcIiwgc2V0dGVyKFwiZW5kXCIpKSgtMSk7XG4gICAgZXZlLm9uKFwic25hcC51dGlsLmF0dHIubWFya2VyLXN0YXJ0XCIsIHNldHRlcihcInN0YXJ0XCIpKSgtMSk7XG4gICAgZXZlLm9uKFwic25hcC51dGlsLmF0dHIubWFya2VyU3RhcnRcIiwgc2V0dGVyKFwic3RhcnRcIikpKC0xKTtcbiAgICBldmUub24oXCJzbmFwLnV0aWwuYXR0ci5tYXJrZXItbWlkXCIsIHNldHRlcihcIm1pZFwiKSkoLTEpO1xuICAgIGV2ZS5vbihcInNuYXAudXRpbC5hdHRyLm1hcmtlck1pZFwiLCBzZXR0ZXIoXCJtaWRcIikpKC0xKTtcbn0oKSk7XG5ldmUub24oXCJzbmFwLnV0aWwuZ2V0YXR0ci5yXCIsIGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy50eXBlID09IFwicmVjdFwiICYmICQodGhpcy5ub2RlLCBcInJ4XCIpID09ICQodGhpcy5ub2RlLCBcInJ5XCIpKSB7XG4gICAgICAgIGV2ZS5zdG9wKCk7XG4gICAgICAgIHJldHVybiAkKHRoaXMubm9kZSwgXCJyeFwiKTtcbiAgICB9XG59KSgtMSk7XG5mdW5jdGlvbiB0ZXh0RXh0cmFjdChub2RlKSB7XG4gICAgdmFyIG91dCA9IFtdO1xuICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGROb2RlcztcbiAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBjaGlsZHJlbi5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgIHZhciBjaGkgPSBjaGlsZHJlbltpXTtcbiAgICAgICAgaWYgKGNoaS5ub2RlVHlwZSA9PSAzKSB7XG4gICAgICAgICAgICBvdXQucHVzaChjaGkubm9kZVZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hpLnRhZ05hbWUgPT0gXCJ0c3BhblwiKSB7XG4gICAgICAgICAgICBpZiAoY2hpLmNoaWxkTm9kZXMubGVuZ3RoID09IDEgJiYgY2hpLmZpcnN0Q2hpbGQubm9kZVR5cGUgPT0gMykge1xuICAgICAgICAgICAgICAgIG91dC5wdXNoKGNoaS5maXJzdENoaWxkLm5vZGVWYWx1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dC5wdXNoKHRleHRFeHRyYWN0KGNoaSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG59XG5ldmUub24oXCJzbmFwLnV0aWwuZ2V0YXR0ci50ZXh0XCIsIGZ1bmN0aW9uICgpIHtcbiAgICBpZiAodGhpcy50eXBlID09IFwidGV4dFwiIHx8IHRoaXMudHlwZSA9PSBcInRzcGFuXCIpIHtcbiAgICAgICAgZXZlLnN0b3AoKTtcbiAgICAgICAgdmFyIG91dCA9IHRleHRFeHRyYWN0KHRoaXMubm9kZSk7XG4gICAgICAgIHJldHVybiBvdXQubGVuZ3RoID09IDEgPyBvdXRbMF0gOiBvdXQ7XG4gICAgfVxufSkoLTEpO1xuZXZlLm9uKFwic25hcC51dGlsLmdldGF0dHIuI3RleHRcIiwgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLm5vZGUudGV4dENvbnRlbnQ7XG59KSgtMSk7XG5ldmUub24oXCJzbmFwLnV0aWwuZ2V0YXR0ci52aWV3Qm94XCIsIGZ1bmN0aW9uICgpIHtcbiAgICBldmUuc3RvcCgpO1xuICAgIHZhciB2YiA9ICQodGhpcy5ub2RlLCBcInZpZXdCb3hcIikuc3BsaXQoc2VwYXJhdG9yKTtcbiAgICByZXR1cm4gU25hcC5fLmJveCgrdmJbMF0sICt2YlsxXSwgK3ZiWzJdLCArdmJbM10pO1xuICAgIC8vIFRPRE86IGludmVzdGlnYXRlIHdoeSBJIG5lZWQgdG8gei1pbmRleCBpdFxufSkoLTEpO1xuZXZlLm9uKFwic25hcC51dGlsLmdldGF0dHIucG9pbnRzXCIsIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcCA9ICQodGhpcy5ub2RlLCBcInBvaW50c1wiKTtcbiAgICBldmUuc3RvcCgpO1xuICAgIHJldHVybiBwLnNwbGl0KHNlcGFyYXRvcik7XG59KTtcbmV2ZS5vbihcInNuYXAudXRpbC5nZXRhdHRyLnBhdGhcIiwgZnVuY3Rpb24gKCkge1xuICAgIHZhciBwID0gJCh0aGlzLm5vZGUsIFwiZFwiKTtcbiAgICBldmUuc3RvcCgpO1xuICAgIHJldHVybiBwO1xufSk7XG4vLyBkZWZhdWx0XG5ldmUub24oXCJzbmFwLnV0aWwuZ2V0YXR0clwiLCBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGF0dCA9IGV2ZS5udCgpO1xuICAgIGF0dCA9IGF0dC5zdWJzdHJpbmcoYXR0Lmxhc3RJbmRleE9mKFwiLlwiKSArIDEpO1xuICAgIHZhciBjc3MgPSBhdHQucmVwbGFjZSgvW0EtWl0vZywgZnVuY3Rpb24gKGxldHRlcikge1xuICAgICAgICByZXR1cm4gXCItXCIgKyBsZXR0ZXIudG9Mb3dlckNhc2UoKTtcbiAgICB9KTtcbiAgICBpZiAoY3NzQXR0cltoYXNdKGNzcykpIHtcbiAgICAgICAgcmV0dXJuIGdsb2IuZG9jLmRlZmF1bHRWaWV3LmdldENvbXB1dGVkU3R5bGUodGhpcy5ub2RlLCBudWxsKS5nZXRQcm9wZXJ0eVZhbHVlKGNzcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuICQodGhpcy5ub2RlLCBhdHQpO1xuICAgIH1cbn0pO1xudmFyIGdldE9mZnNldCA9IGZ1bmN0aW9uIChlbGVtKSB7XG4gICAgdmFyIGJveCA9IGVsZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICAgIGRvYyA9IGVsZW0ub3duZXJEb2N1bWVudCxcbiAgICAgICAgYm9keSA9IGRvYy5ib2R5LFxuICAgICAgICBkb2NFbGVtID0gZG9jLmRvY3VtZW50RWxlbWVudCxcbiAgICAgICAgY2xpZW50VG9wID0gZG9jRWxlbS5jbGllbnRUb3AgfHwgYm9keS5jbGllbnRUb3AgfHwgMCwgY2xpZW50TGVmdCA9IGRvY0VsZW0uY2xpZW50TGVmdCB8fCBib2R5LmNsaWVudExlZnQgfHwgMCxcbiAgICAgICAgdG9wICA9IGJveC50b3AgICsgKGcud2luLnBhZ2VZT2Zmc2V0IHx8IGRvY0VsZW0uc2Nyb2xsVG9wIHx8IGJvZHkuc2Nyb2xsVG9wICkgLSBjbGllbnRUb3AsXG4gICAgICAgIGxlZnQgPSBib3gubGVmdCArIChnLndpbi5wYWdlWE9mZnNldCB8fCBkb2NFbGVtLnNjcm9sbExlZnQgfHwgYm9keS5zY3JvbGxMZWZ0KSAtIGNsaWVudExlZnQ7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgeTogdG9wLFxuICAgICAgICB4OiBsZWZ0XG4gICAgfTtcbn07XG4vKlxcXG4gKiBTbmFwLmdldEVsZW1lbnRCeVBvaW50XG4gWyBtZXRob2QgXVxuICoqXG4gKiBSZXR1cm5zIHlvdSB0b3Btb3N0IGVsZW1lbnQgdW5kZXIgZ2l2ZW4gcG9pbnQuXG4gKipcbiA9IChvYmplY3QpIFNuYXAgZWxlbWVudCBvYmplY3RcbiAtIHggKG51bWJlcikgeCBjb29yZGluYXRlIGZyb20gdGhlIHRvcCBsZWZ0IGNvcm5lciBvZiB0aGUgd2luZG93XG4gLSB5IChudW1iZXIpIHkgY29vcmRpbmF0ZSBmcm9tIHRoZSB0b3AgbGVmdCBjb3JuZXIgb2YgdGhlIHdpbmRvd1xuID4gVXNhZ2VcbiB8IFNuYXAuZ2V0RWxlbWVudEJ5UG9pbnQobW91c2VYLCBtb3VzZVkpLmF0dHIoe3N0cm9rZTogXCIjZjAwXCJ9KTtcblxcKi9cblNuYXAuZ2V0RWxlbWVudEJ5UG9pbnQgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHZhciBwYXBlciA9IHRoaXMsXG4gICAgICAgIHN2ZyA9IHBhcGVyLmNhbnZhcyxcbiAgICAgICAgdGFyZ2V0ID0gZ2xvYi5kb2MuZWxlbWVudEZyb21Qb2ludCh4LCB5KTtcbiAgICBpZiAoZ2xvYi53aW4ub3BlcmEgJiYgdGFyZ2V0LnRhZ05hbWUgPT0gXCJzdmdcIikge1xuICAgICAgICB2YXIgc28gPSBnZXRPZmZzZXQodGFyZ2V0KSxcbiAgICAgICAgICAgIHNyID0gdGFyZ2V0LmNyZWF0ZVNWR1JlY3QoKTtcbiAgICAgICAgc3IueCA9IHggLSBzby54O1xuICAgICAgICBzci55ID0geSAtIHNvLnk7XG4gICAgICAgIHNyLndpZHRoID0gc3IuaGVpZ2h0ID0gMTtcbiAgICAgICAgdmFyIGhpdHMgPSB0YXJnZXQuZ2V0SW50ZXJzZWN0aW9uTGlzdChzciwgbnVsbCk7XG4gICAgICAgIGlmIChoaXRzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGFyZ2V0ID0gaGl0c1toaXRzLmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgfVxuICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gd3JhcCh0YXJnZXQpO1xufTtcbi8qXFxcbiAqIFNuYXAucGx1Z2luXG4gWyBtZXRob2QgXVxuICoqXG4gKiBMZXQgeW91IHdyaXRlIHBsdWdpbnMuIFlvdSBwYXNzIGluIGEgZnVuY3Rpb24gd2l0aCBmb3VyIGFyZ3VtZW50cywgbGlrZSB0aGlzOlxuIHwgU25hcC5wbHVnaW4oZnVuY3Rpb24gKFNuYXAsIEVsZW1lbnQsIFBhcGVyLCBnbG9iYWwpIHtcbiB8ICAgICBTbmFwLm5ld21ldGhvZCA9IGZ1bmN0aW9uICgpIHt9O1xuIHwgICAgIEVsZW1lbnQucHJvdG90eXBlLm5ld21ldGhvZCA9IGZ1bmN0aW9uICgpIHt9O1xuIHwgICAgIFBhcGVyLnByb3RvdHlwZS5uZXdtZXRob2QgPSBmdW5jdGlvbiAoKSB7fTtcbiB8IH0pO1xuICogSW5zaWRlIHRoZSBmdW5jdGlvbiB5b3UgaGF2ZSBhY2Nlc3MgdG8gYWxsIG1haW4gb2JqZWN0cyAoYW5kIHRoZWlyXG4gKiBwcm90b3R5cGVzKS4gVGhpcyBhbGxvdyB5b3UgdG8gZXh0ZW5kIGFueXRoaW5nIHlvdSB3YW50LlxuICoqXG4gLSBmIChmdW5jdGlvbikgeW91ciBwbHVnaW4gYm9keVxuXFwqL1xuU25hcC5wbHVnaW4gPSBmdW5jdGlvbiAoZikge1xuICAgIGYoU25hcCwgRWxlbWVudCwgUGFwZXIsIGdsb2IpO1xufTtcbmdsb2Iud2luLlNuYXAgPSBTbmFwO1xucmV0dXJuIFNuYXA7XG59KHdpbmRvdyB8fCB0aGlzKSk7XG5cbi8vIENvcHlyaWdodCAoYykgMjAxMyBBZG9iZSBTeXN0ZW1zIEluY29ycG9yYXRlZC4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIFxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8gXG4vLyBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vIFxuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblNuYXAucGx1Z2luKGZ1bmN0aW9uIChTbmFwLCBFbGVtZW50LCBQYXBlciwgZ2xvYikge1xuICAgIHZhciBlbHByb3RvID0gRWxlbWVudC5wcm90b3R5cGUsXG4gICAgICAgIGlzID0gU25hcC5pcyxcbiAgICAgICAgY2xvbmUgPSBTbmFwLl8uY2xvbmUsXG4gICAgICAgIGhhcyA9IFwiaGFzT3duUHJvcGVydHlcIixcbiAgICAgICAgcDJzID0gLyw/KFthLXpdKSw/L2dpLFxuICAgICAgICB0b0Zsb2F0ID0gcGFyc2VGbG9hdCxcbiAgICAgICAgbWF0aCA9IE1hdGgsXG4gICAgICAgIFBJID0gbWF0aC5QSSxcbiAgICAgICAgbW1pbiA9IG1hdGgubWluLFxuICAgICAgICBtbWF4ID0gbWF0aC5tYXgsXG4gICAgICAgIHBvdyA9IG1hdGgucG93LFxuICAgICAgICBhYnMgPSBtYXRoLmFicztcbiAgICBmdW5jdGlvbiBwYXRocyhwcykge1xuICAgICAgICB2YXIgcCA9IHBhdGhzLnBzID0gcGF0aHMucHMgfHwge307XG4gICAgICAgIGlmIChwW3BzXSkge1xuICAgICAgICAgICAgcFtwc10uc2xlZXAgPSAxMDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwW3BzXSA9IHtcbiAgICAgICAgICAgICAgICBzbGVlcDogMTAwXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHApIGlmIChwW2hhc10oa2V5KSAmJiBrZXkgIT0gcHMpIHtcbiAgICAgICAgICAgICAgICBwW2tleV0uc2xlZXAtLTtcbiAgICAgICAgICAgICAgICAhcFtrZXldLnNsZWVwICYmIGRlbGV0ZSBwW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcFtwc107XG4gICAgfVxuICAgIGZ1bmN0aW9uIGJveCh4LCB5LCB3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIGlmICh4ID09IG51bGwpIHtcbiAgICAgICAgICAgIHggPSB5ID0gd2lkdGggPSBoZWlnaHQgPSAwO1xuICAgICAgICB9XG4gICAgICAgIGlmICh5ID09IG51bGwpIHtcbiAgICAgICAgICAgIHkgPSB4Lnk7XG4gICAgICAgICAgICB3aWR0aCA9IHgud2lkdGg7XG4gICAgICAgICAgICBoZWlnaHQgPSB4LmhlaWdodDtcbiAgICAgICAgICAgIHggPSB4Lng7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IHgsXG4gICAgICAgICAgICB5OiB5LFxuICAgICAgICAgICAgd2lkdGg6IHdpZHRoLFxuICAgICAgICAgICAgdzogd2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQ6IGhlaWdodCxcbiAgICAgICAgICAgIGg6IGhlaWdodCxcbiAgICAgICAgICAgIHgyOiB4ICsgd2lkdGgsXG4gICAgICAgICAgICB5MjogeSArIGhlaWdodCxcbiAgICAgICAgICAgIGN4OiB4ICsgd2lkdGggLyAyLFxuICAgICAgICAgICAgY3k6IHkgKyBoZWlnaHQgLyAyLFxuICAgICAgICAgICAgcjE6IG1hdGgubWluKHdpZHRoLCBoZWlnaHQpIC8gMixcbiAgICAgICAgICAgIHIyOiBtYXRoLm1heCh3aWR0aCwgaGVpZ2h0KSAvIDIsXG4gICAgICAgICAgICByMDogbWF0aC5zcXJ0KHdpZHRoICogd2lkdGggKyBoZWlnaHQgKiBoZWlnaHQpIC8gMixcbiAgICAgICAgICAgIHBhdGg6IHJlY3RQYXRoKHgsIHksIHdpZHRoLCBoZWlnaHQpLFxuICAgICAgICAgICAgdmI6IFt4LCB5LCB3aWR0aCwgaGVpZ2h0XS5qb2luKFwiIFwiKVxuICAgICAgICB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuam9pbihcIixcIikucmVwbGFjZShwMnMsIFwiJDFcIik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBhdGhDbG9uZShwYXRoQXJyYXkpIHtcbiAgICAgICAgdmFyIHJlcyA9IGNsb25lKHBhdGhBcnJheSk7XG4gICAgICAgIHJlcy50b1N0cmluZyA9IHRvU3RyaW5nO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRQb2ludEF0U2VnbWVudExlbmd0aChwMXgsIHAxeSwgYzF4LCBjMXksIGMyeCwgYzJ5LCBwMngsIHAyeSwgbGVuZ3RoKSB7XG4gICAgICAgIGlmIChsZW5ndGggPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIGJlemxlbihwMXgsIHAxeSwgYzF4LCBjMXksIGMyeCwgYzJ5LCBwMngsIHAyeSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gZmluZERvdHNBdFNlZ21lbnQocDF4LCBwMXksIGMxeCwgYzF5LCBjMngsIGMyeSwgcDJ4LCBwMnksXG4gICAgICAgICAgICAgICAgZ2V0VG90TGVuKHAxeCwgcDF5LCBjMXgsIGMxeSwgYzJ4LCBjMnksIHAyeCwgcDJ5LCBsZW5ndGgpKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRMZW5ndGhGYWN0b3J5KGlzdG90YWwsIHN1YnBhdGgpIHtcbiAgICAgICAgZnVuY3Rpb24gTyh2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiArKCt2YWwpLnRvRml4ZWQoMyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFNuYXAuXy5jYWNoZXIoZnVuY3Rpb24gKHBhdGgsIGxlbmd0aCwgb25seXN0YXJ0KSB7XG4gICAgICAgICAgICBpZiAocGF0aCBpbnN0YW5jZW9mIEVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBwYXRoID0gcGF0aC5hdHRyKFwiZFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhdGggPSBwYXRoMmN1cnZlKHBhdGgpO1xuICAgICAgICAgICAgdmFyIHgsIHksIHAsIGwsIHNwID0gXCJcIiwgc3VicGF0aHMgPSB7fSwgcG9pbnQsXG4gICAgICAgICAgICAgICAgbGVuID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IHBhdGgubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIHAgPSBwYXRoW2ldO1xuICAgICAgICAgICAgICAgIGlmIChwWzBdID09IFwiTVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHggPSArcFsxXTtcbiAgICAgICAgICAgICAgICAgICAgeSA9ICtwWzJdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGwgPSBnZXRQb2ludEF0U2VnbWVudExlbmd0aCh4LCB5LCBwWzFdLCBwWzJdLCBwWzNdLCBwWzRdLCBwWzVdLCBwWzZdKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxlbiArIGwgPiBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdWJwYXRoICYmICFzdWJwYXRocy5zdGFydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50ID0gZ2V0UG9pbnRBdFNlZ21lbnRMZW5ndGgoeCwgeSwgcFsxXSwgcFsyXSwgcFszXSwgcFs0XSwgcFs1XSwgcFs2XSwgbGVuZ3RoIC0gbGVuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcCArPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQ1wiICsgTyhwb2ludC5zdGFydC54KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTyhwb2ludC5zdGFydC55KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTyhwb2ludC5tLngpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBPKHBvaW50Lm0ueSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE8ocG9pbnQueCksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE8ocG9pbnQueSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbmx5c3RhcnQpIHtyZXR1cm4gc3A7fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1YnBhdGhzLnN0YXJ0ID0gc3A7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3AgPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiTVwiICsgTyhwb2ludC54KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTyhwb2ludC55KSArIFwiQ1wiICsgTyhwb2ludC5uLngpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBPKHBvaW50Lm4ueSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE8ocG9pbnQuZW5kLngpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBPKHBvaW50LmVuZC55KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTyhwWzVdKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTyhwWzZdKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0uam9pbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxlbiArPSBsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggPSArcFs1XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5ID0gK3BbNl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzdG90YWwgJiYgIXN1YnBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb2ludCA9IGdldFBvaW50QXRTZWdtZW50TGVuZ3RoKHgsIHksIHBbMV0sIHBbMl0sIHBbM10sIHBbNF0sIHBbNV0sIHBbNl0sIGxlbmd0aCAtIGxlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBvaW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGxlbiArPSBsO1xuICAgICAgICAgICAgICAgICAgICB4ID0gK3BbNV07XG4gICAgICAgICAgICAgICAgICAgIHkgPSArcFs2XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3AgKz0gcC5zaGlmdCgpICsgcDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN1YnBhdGhzLmVuZCA9IHNwO1xuICAgICAgICAgICAgcG9pbnQgPSBpc3RvdGFsID8gbGVuIDogc3VicGF0aCA/IHN1YnBhdGhzIDogZmluZERvdHNBdFNlZ21lbnQoeCwgeSwgcFswXSwgcFsxXSwgcFsyXSwgcFszXSwgcFs0XSwgcFs1XSwgMSk7XG4gICAgICAgICAgICByZXR1cm4gcG9pbnQ7XG4gICAgICAgIH0sIG51bGwsIFNuYXAuXy5jbG9uZSk7XG4gICAgfVxuICAgIHZhciBnZXRUb3RhbExlbmd0aCA9IGdldExlbmd0aEZhY3RvcnkoMSksXG4gICAgICAgIGdldFBvaW50QXRMZW5ndGggPSBnZXRMZW5ndGhGYWN0b3J5KCksXG4gICAgICAgIGdldFN1YnBhdGhzQXRMZW5ndGggPSBnZXRMZW5ndGhGYWN0b3J5KDAsIDEpO1xuICAgIGZ1bmN0aW9uIGZpbmREb3RzQXRTZWdtZW50KHAxeCwgcDF5LCBjMXgsIGMxeSwgYzJ4LCBjMnksIHAyeCwgcDJ5LCB0KSB7XG4gICAgICAgIHZhciB0MSA9IDEgLSB0LFxuICAgICAgICAgICAgdDEzID0gcG93KHQxLCAzKSxcbiAgICAgICAgICAgIHQxMiA9IHBvdyh0MSwgMiksXG4gICAgICAgICAgICB0MiA9IHQgKiB0LFxuICAgICAgICAgICAgdDMgPSB0MiAqIHQsXG4gICAgICAgICAgICB4ID0gdDEzICogcDF4ICsgdDEyICogMyAqIHQgKiBjMXggKyB0MSAqIDMgKiB0ICogdCAqIGMyeCArIHQzICogcDJ4LFxuICAgICAgICAgICAgeSA9IHQxMyAqIHAxeSArIHQxMiAqIDMgKiB0ICogYzF5ICsgdDEgKiAzICogdCAqIHQgKiBjMnkgKyB0MyAqIHAyeSxcbiAgICAgICAgICAgIG14ID0gcDF4ICsgMiAqIHQgKiAoYzF4IC0gcDF4KSArIHQyICogKGMyeCAtIDIgKiBjMXggKyBwMXgpLFxuICAgICAgICAgICAgbXkgPSBwMXkgKyAyICogdCAqIChjMXkgLSBwMXkpICsgdDIgKiAoYzJ5IC0gMiAqIGMxeSArIHAxeSksXG4gICAgICAgICAgICBueCA9IGMxeCArIDIgKiB0ICogKGMyeCAtIGMxeCkgKyB0MiAqIChwMnggLSAyICogYzJ4ICsgYzF4KSxcbiAgICAgICAgICAgIG55ID0gYzF5ICsgMiAqIHQgKiAoYzJ5IC0gYzF5KSArIHQyICogKHAyeSAtIDIgKiBjMnkgKyBjMXkpLFxuICAgICAgICAgICAgYXggPSB0MSAqIHAxeCArIHQgKiBjMXgsXG4gICAgICAgICAgICBheSA9IHQxICogcDF5ICsgdCAqIGMxeSxcbiAgICAgICAgICAgIGN4ID0gdDEgKiBjMnggKyB0ICogcDJ4LFxuICAgICAgICAgICAgY3kgPSB0MSAqIGMyeSArIHQgKiBwMnksXG4gICAgICAgICAgICBhbHBoYSA9ICg5MCAtIG1hdGguYXRhbjIobXggLSBueCwgbXkgLSBueSkgKiAxODAgLyBQSSk7XG4gICAgICAgIC8vIChteCA+IG54IHx8IG15IDwgbnkpICYmIChhbHBoYSArPSAxODApO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogeCxcbiAgICAgICAgICAgIHk6IHksXG4gICAgICAgICAgICBtOiB7eDogbXgsIHk6IG15fSxcbiAgICAgICAgICAgIG46IHt4OiBueCwgeTogbnl9LFxuICAgICAgICAgICAgc3RhcnQ6IHt4OiBheCwgeTogYXl9LFxuICAgICAgICAgICAgZW5kOiB7eDogY3gsIHk6IGN5fSxcbiAgICAgICAgICAgIGFscGhhOiBhbHBoYVxuICAgICAgICB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBiZXppZXJCQm94KHAxeCwgcDF5LCBjMXgsIGMxeSwgYzJ4LCBjMnksIHAyeCwgcDJ5KSB7XG4gICAgICAgIGlmICghU25hcC5pcyhwMXgsIFwiYXJyYXlcIikpIHtcbiAgICAgICAgICAgIHAxeCA9IFtwMXgsIHAxeSwgYzF4LCBjMXksIGMyeCwgYzJ5LCBwMngsIHAyeV07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJib3ggPSBjdXJ2ZURpbS5hcHBseShudWxsLCBwMXgpO1xuICAgICAgICByZXR1cm4gYm94KFxuICAgICAgICAgICAgYmJveC5taW4ueCxcbiAgICAgICAgICAgIGJib3gubWluLnksXG4gICAgICAgICAgICBiYm94Lm1heC54IC0gYmJveC5taW4ueCxcbiAgICAgICAgICAgIGJib3gubWF4LnkgLSBiYm94Lm1pbi55XG4gICAgICAgICk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlzUG9pbnRJbnNpZGVCQm94KGJib3gsIHgsIHkpIHtcbiAgICAgICAgcmV0dXJuICB4ID49IGJib3gueCAmJlxuICAgICAgICAgICAgICAgIHggPD0gYmJveC54ICsgYmJveC53aWR0aCAmJlxuICAgICAgICAgICAgICAgIHkgPj0gYmJveC55ICYmXG4gICAgICAgICAgICAgICAgeSA8PSBiYm94LnkgKyBiYm94LmhlaWdodDtcbiAgICB9XG4gICAgZnVuY3Rpb24gaXNCQm94SW50ZXJzZWN0KGJib3gxLCBiYm94Mikge1xuICAgICAgICBiYm94MSA9IGJveChiYm94MSk7XG4gICAgICAgIGJib3gyID0gYm94KGJib3gyKTtcbiAgICAgICAgcmV0dXJuIGlzUG9pbnRJbnNpZGVCQm94KGJib3gyLCBiYm94MS54LCBiYm94MS55KVxuICAgICAgICAgICAgfHwgaXNQb2ludEluc2lkZUJCb3goYmJveDIsIGJib3gxLngyLCBiYm94MS55KVxuICAgICAgICAgICAgfHwgaXNQb2ludEluc2lkZUJCb3goYmJveDIsIGJib3gxLngsIGJib3gxLnkyKVxuICAgICAgICAgICAgfHwgaXNQb2ludEluc2lkZUJCb3goYmJveDIsIGJib3gxLngyLCBiYm94MS55MilcbiAgICAgICAgICAgIHx8IGlzUG9pbnRJbnNpZGVCQm94KGJib3gxLCBiYm94Mi54LCBiYm94Mi55KVxuICAgICAgICAgICAgfHwgaXNQb2ludEluc2lkZUJCb3goYmJveDEsIGJib3gyLngyLCBiYm94Mi55KVxuICAgICAgICAgICAgfHwgaXNQb2ludEluc2lkZUJCb3goYmJveDEsIGJib3gyLngsIGJib3gyLnkyKVxuICAgICAgICAgICAgfHwgaXNQb2ludEluc2lkZUJCb3goYmJveDEsIGJib3gyLngyLCBiYm94Mi55MilcbiAgICAgICAgICAgIHx8IChiYm94MS54IDwgYmJveDIueDIgJiYgYmJveDEueCA+IGJib3gyLnhcbiAgICAgICAgICAgICAgICB8fCBiYm94Mi54IDwgYmJveDEueDIgJiYgYmJveDIueCA+IGJib3gxLngpXG4gICAgICAgICAgICAmJiAoYmJveDEueSA8IGJib3gyLnkyICYmIGJib3gxLnkgPiBiYm94Mi55XG4gICAgICAgICAgICAgICAgfHwgYmJveDIueSA8IGJib3gxLnkyICYmIGJib3gyLnkgPiBiYm94MS55KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gYmFzZTModCwgcDEsIHAyLCBwMywgcDQpIHtcbiAgICAgICAgdmFyIHQxID0gLTMgKiBwMSArIDkgKiBwMiAtIDkgKiBwMyArIDMgKiBwNCxcbiAgICAgICAgICAgIHQyID0gdCAqIHQxICsgNiAqIHAxIC0gMTIgKiBwMiArIDYgKiBwMztcbiAgICAgICAgcmV0dXJuIHQgKiB0MiAtIDMgKiBwMSArIDMgKiBwMjtcbiAgICB9XG4gICAgZnVuY3Rpb24gYmV6bGVuKHgxLCB5MSwgeDIsIHkyLCB4MywgeTMsIHg0LCB5NCwgeikge1xuICAgICAgICBpZiAoeiA9PSBudWxsKSB7XG4gICAgICAgICAgICB6ID0gMTtcbiAgICAgICAgfVxuICAgICAgICB6ID0geiA+IDEgPyAxIDogeiA8IDAgPyAwIDogejtcbiAgICAgICAgdmFyIHoyID0geiAvIDIsXG4gICAgICAgICAgICBuID0gMTIsXG4gICAgICAgICAgICBUdmFsdWVzID0gWy0uMTI1MiwuMTI1MiwtLjM2NzgsLjM2NzgsLS41ODczLC41ODczLC0uNzY5OSwuNzY5OSwtLjkwNDEsLjkwNDEsLS45ODE2LC45ODE2XSxcbiAgICAgICAgICAgIEN2YWx1ZXMgPSBbMC4yNDkxLDAuMjQ5MSwwLjIzMzUsMC4yMzM1LDAuMjAzMiwwLjIwMzIsMC4xNjAxLDAuMTYwMSwwLjEwNjksMC4xMDY5LDAuMDQ3MiwwLjA0NzJdLFxuICAgICAgICAgICAgc3VtID0gMDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjdCA9IHoyICogVHZhbHVlc1tpXSArIHoyLFxuICAgICAgICAgICAgICAgIHhiYXNlID0gYmFzZTMoY3QsIHgxLCB4MiwgeDMsIHg0KSxcbiAgICAgICAgICAgICAgICB5YmFzZSA9IGJhc2UzKGN0LCB5MSwgeTIsIHkzLCB5NCksXG4gICAgICAgICAgICAgICAgY29tYiA9IHhiYXNlICogeGJhc2UgKyB5YmFzZSAqIHliYXNlO1xuICAgICAgICAgICAgc3VtICs9IEN2YWx1ZXNbaV0gKiBtYXRoLnNxcnQoY29tYik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHoyICogc3VtO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRUb3RMZW4oeDEsIHkxLCB4MiwgeTIsIHgzLCB5MywgeDQsIHk0LCBsbCkge1xuICAgICAgICBpZiAobGwgPCAwIHx8IGJlemxlbih4MSwgeTEsIHgyLCB5MiwgeDMsIHkzLCB4NCwgeTQpIDwgbGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdCA9IDEsXG4gICAgICAgICAgICBzdGVwID0gdCAvIDIsXG4gICAgICAgICAgICB0MiA9IHQgLSBzdGVwLFxuICAgICAgICAgICAgbCxcbiAgICAgICAgICAgIGUgPSAuMDE7XG4gICAgICAgIGwgPSBiZXpsZW4oeDEsIHkxLCB4MiwgeTIsIHgzLCB5MywgeDQsIHk0LCB0Mik7XG4gICAgICAgIHdoaWxlIChhYnMobCAtIGxsKSA+IGUpIHtcbiAgICAgICAgICAgIHN0ZXAgLz0gMjtcbiAgICAgICAgICAgIHQyICs9IChsIDwgbGwgPyAxIDogLTEpICogc3RlcDtcbiAgICAgICAgICAgIGwgPSBiZXpsZW4oeDEsIHkxLCB4MiwgeTIsIHgzLCB5MywgeDQsIHk0LCB0Mik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHQyO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbnRlcnNlY3QoeDEsIHkxLCB4MiwgeTIsIHgzLCB5MywgeDQsIHk0KSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIG1tYXgoeDEsIHgyKSA8IG1taW4oeDMsIHg0KSB8fFxuICAgICAgICAgICAgbW1pbih4MSwgeDIpID4gbW1heCh4MywgeDQpIHx8XG4gICAgICAgICAgICBtbWF4KHkxLCB5MikgPCBtbWluKHkzLCB5NCkgfHxcbiAgICAgICAgICAgIG1taW4oeTEsIHkyKSA+IG1tYXgoeTMsIHk0KVxuICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbnggPSAoeDEgKiB5MiAtIHkxICogeDIpICogKHgzIC0geDQpIC0gKHgxIC0geDIpICogKHgzICogeTQgLSB5MyAqIHg0KSxcbiAgICAgICAgICAgIG55ID0gKHgxICogeTIgLSB5MSAqIHgyKSAqICh5MyAtIHk0KSAtICh5MSAtIHkyKSAqICh4MyAqIHk0IC0geTMgKiB4NCksXG4gICAgICAgICAgICBkZW5vbWluYXRvciA9ICh4MSAtIHgyKSAqICh5MyAtIHk0KSAtICh5MSAtIHkyKSAqICh4MyAtIHg0KTtcblxuICAgICAgICBpZiAoIWRlbm9taW5hdG9yKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHB4ID0gbnggLyBkZW5vbWluYXRvcixcbiAgICAgICAgICAgIHB5ID0gbnkgLyBkZW5vbWluYXRvcixcbiAgICAgICAgICAgIHB4MiA9ICtweC50b0ZpeGVkKDIpLFxuICAgICAgICAgICAgcHkyID0gK3B5LnRvRml4ZWQoMik7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIHB4MiA8ICttbWluKHgxLCB4MikudG9GaXhlZCgyKSB8fFxuICAgICAgICAgICAgcHgyID4gK21tYXgoeDEsIHgyKS50b0ZpeGVkKDIpIHx8XG4gICAgICAgICAgICBweDIgPCArbW1pbih4MywgeDQpLnRvRml4ZWQoMikgfHxcbiAgICAgICAgICAgIHB4MiA+ICttbWF4KHgzLCB4NCkudG9GaXhlZCgyKSB8fFxuICAgICAgICAgICAgcHkyIDwgK21taW4oeTEsIHkyKS50b0ZpeGVkKDIpIHx8XG4gICAgICAgICAgICBweTIgPiArbW1heCh5MSwgeTIpLnRvRml4ZWQoMikgfHxcbiAgICAgICAgICAgIHB5MiA8ICttbWluKHkzLCB5NCkudG9GaXhlZCgyKSB8fFxuICAgICAgICAgICAgcHkyID4gK21tYXgoeTMsIHk0KS50b0ZpeGVkKDIpXG4gICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7eDogcHgsIHk6IHB5fTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaW50ZXIoYmV6MSwgYmV6Mikge1xuICAgICAgICByZXR1cm4gaW50ZXJIZWxwZXIoYmV6MSwgYmV6Mik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGludGVyQ291bnQoYmV6MSwgYmV6Mikge1xuICAgICAgICByZXR1cm4gaW50ZXJIZWxwZXIoYmV6MSwgYmV6MiwgMSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGludGVySGVscGVyKGJlejEsIGJlejIsIGp1c3RDb3VudCkge1xuICAgICAgICB2YXIgYmJveDEgPSBiZXppZXJCQm94KGJlejEpLFxuICAgICAgICAgICAgYmJveDIgPSBiZXppZXJCQm94KGJlejIpO1xuICAgICAgICBpZiAoIWlzQkJveEludGVyc2VjdChiYm94MSwgYmJveDIpKSB7XG4gICAgICAgICAgICByZXR1cm4ganVzdENvdW50ID8gMCA6IFtdO1xuICAgICAgICB9XG4gICAgICAgIHZhciBsMSA9IGJlemxlbi5hcHBseSgwLCBiZXoxKSxcbiAgICAgICAgICAgIGwyID0gYmV6bGVuLmFwcGx5KDAsIGJlejIpLFxuICAgICAgICAgICAgbjEgPSB+fihsMSAvIDUpLFxuICAgICAgICAgICAgbjIgPSB+fihsMiAvIDUpLFxuICAgICAgICAgICAgZG90czEgPSBbXSxcbiAgICAgICAgICAgIGRvdHMyID0gW10sXG4gICAgICAgICAgICB4eSA9IHt9LFxuICAgICAgICAgICAgcmVzID0ganVzdENvdW50ID8gMCA6IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG4xICsgMTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcCA9IGZpbmREb3RzQXRTZWdtZW50LmFwcGx5KDAsIGJlejEuY29uY2F0KGkgLyBuMSkpO1xuICAgICAgICAgICAgZG90czEucHVzaCh7eDogcC54LCB5OiBwLnksIHQ6IGkgLyBuMX0pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBuMiArIDE7IGkrKykge1xuICAgICAgICAgICAgcCA9IGZpbmREb3RzQXRTZWdtZW50LmFwcGx5KDAsIGJlejIuY29uY2F0KGkgLyBuMikpO1xuICAgICAgICAgICAgZG90czIucHVzaCh7eDogcC54LCB5OiBwLnksIHQ6IGkgLyBuMn0pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBuMTsgaSsrKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG4yOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZGkgPSBkb3RzMVtpXSxcbiAgICAgICAgICAgICAgICAgICAgZGkxID0gZG90czFbaSArIDFdLFxuICAgICAgICAgICAgICAgICAgICBkaiA9IGRvdHMyW2pdLFxuICAgICAgICAgICAgICAgICAgICBkajEgPSBkb3RzMltqICsgMV0sXG4gICAgICAgICAgICAgICAgICAgIGNpID0gYWJzKGRpMS54IC0gZGkueCkgPCAuMDAxID8gXCJ5XCIgOiBcInhcIixcbiAgICAgICAgICAgICAgICAgICAgY2ogPSBhYnMoZGoxLnggLSBkai54KSA8IC4wMDEgPyBcInlcIiA6IFwieFwiLFxuICAgICAgICAgICAgICAgICAgICBpcyA9IGludGVyc2VjdChkaS54LCBkaS55LCBkaTEueCwgZGkxLnksIGRqLngsIGRqLnksIGRqMS54LCBkajEueSk7XG4gICAgICAgICAgICAgICAgaWYgKGlzKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh4eVtpcy54LnRvRml4ZWQoNCldID09IGlzLnkudG9GaXhlZCg0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgeHlbaXMueC50b0ZpeGVkKDQpXSA9IGlzLnkudG9GaXhlZCg0KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHQxID0gZGkudCArIGFicygoaXNbY2ldIC0gZGlbY2ldKSAvIChkaTFbY2ldIC0gZGlbY2ldKSkgKiAoZGkxLnQgLSBkaS50KSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHQyID0gZGoudCArIGFicygoaXNbY2pdIC0gZGpbY2pdKSAvIChkajFbY2pdIC0gZGpbY2pdKSkgKiAoZGoxLnQgLSBkai50KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHQxID49IDAgJiYgdDEgPD0gMSAmJiB0MiA+PSAwICYmIHQyIDw9IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChqdXN0Q291bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXMrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiBpcy54LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiBpcy55LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0MTogdDEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQyOiB0MlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBhdGhJbnRlcnNlY3Rpb24ocGF0aDEsIHBhdGgyKSB7XG4gICAgICAgIHJldHVybiBpbnRlclBhdGhIZWxwZXIocGF0aDEsIHBhdGgyKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGF0aEludGVyc2VjdGlvbk51bWJlcihwYXRoMSwgcGF0aDIpIHtcbiAgICAgICAgcmV0dXJuIGludGVyUGF0aEhlbHBlcihwYXRoMSwgcGF0aDIsIDEpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbnRlclBhdGhIZWxwZXIocGF0aDEsIHBhdGgyLCBqdXN0Q291bnQpIHtcbiAgICAgICAgcGF0aDEgPSBwYXRoMmN1cnZlKHBhdGgxKTtcbiAgICAgICAgcGF0aDIgPSBwYXRoMmN1cnZlKHBhdGgyKTtcbiAgICAgICAgdmFyIHgxLCB5MSwgeDIsIHkyLCB4MW0sIHkxbSwgeDJtLCB5Mm0sIGJlejEsIGJlejIsXG4gICAgICAgICAgICByZXMgPSBqdXN0Q291bnQgPyAwIDogW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IHBhdGgxLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBwaSA9IHBhdGgxW2ldO1xuICAgICAgICAgICAgaWYgKHBpWzBdID09IFwiTVwiKSB7XG4gICAgICAgICAgICAgICAgeDEgPSB4MW0gPSBwaVsxXTtcbiAgICAgICAgICAgICAgICB5MSA9IHkxbSA9IHBpWzJdO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAocGlbMF0gPT0gXCJDXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgYmV6MSA9IFt4MSwgeTFdLmNvbmNhdChwaS5zbGljZSgxKSk7XG4gICAgICAgICAgICAgICAgICAgIHgxID0gYmV6MVs2XTtcbiAgICAgICAgICAgICAgICAgICAgeTEgPSBiZXoxWzddO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGJlejEgPSBbeDEsIHkxLCB4MSwgeTEsIHgxbSwgeTFtLCB4MW0sIHkxbV07XG4gICAgICAgICAgICAgICAgICAgIHgxID0geDFtO1xuICAgICAgICAgICAgICAgICAgICB5MSA9IHkxbTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDAsIGpqID0gcGF0aDIubGVuZ3RoOyBqIDwgamo7IGorKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcGogPSBwYXRoMltqXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBqWzBdID09IFwiTVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB4MiA9IHgybSA9IHBqWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgeTIgPSB5Mm0gPSBwalsyXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwalswXSA9PSBcIkNcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlejIgPSBbeDIsIHkyXS5jb25jYXQocGouc2xpY2UoMSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHgyID0gYmV6Mls2XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5MiA9IGJlejJbN107XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJlejIgPSBbeDIsIHkyLCB4MiwgeTIsIHgybSwgeTJtLCB4Mm0sIHkybV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDIgPSB4Mm07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTIgPSB5Mm07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaW50ciA9IGludGVySGVscGVyKGJlejEsIGJlejIsIGp1c3RDb3VudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoanVzdENvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzICs9IGludHI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGsgPSAwLCBrayA9IGludHIubGVuZ3RoOyBrIDwga2s7IGsrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRyW2tdLnNlZ21lbnQxID0gaTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50cltrXS5zZWdtZW50MiA9IGo7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludHJba10uYmV6MSA9IGJlejE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludHJba10uYmV6MiA9IGJlejI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcyA9IHJlcy5jb25jYXQoaW50cik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgZnVuY3Rpb24gaXNQb2ludEluc2lkZVBhdGgocGF0aCwgeCwgeSkge1xuICAgICAgICB2YXIgYmJveCA9IHBhdGhCQm94KHBhdGgpO1xuICAgICAgICByZXR1cm4gaXNQb2ludEluc2lkZUJCb3goYmJveCwgeCwgeSkgJiZcbiAgICAgICAgICAgICAgIGludGVyUGF0aEhlbHBlcihwYXRoLCBbW1wiTVwiLCB4LCB5XSwgW1wiSFwiLCBiYm94LngyICsgMTBdXSwgMSkgJSAyID09IDE7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBhdGhCQm94KHBhdGgpIHtcbiAgICAgICAgdmFyIHB0aCA9IHBhdGhzKHBhdGgpO1xuICAgICAgICBpZiAocHRoLmJib3gpIHtcbiAgICAgICAgICAgIHJldHVybiBjbG9uZShwdGguYmJveCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFwYXRoKSB7XG4gICAgICAgICAgICByZXR1cm4gYm94KCk7XG4gICAgICAgIH1cbiAgICAgICAgcGF0aCA9IHBhdGgyY3VydmUocGF0aCk7XG4gICAgICAgIHZhciB4ID0gMCwgXG4gICAgICAgICAgICB5ID0gMCxcbiAgICAgICAgICAgIFggPSBbXSxcbiAgICAgICAgICAgIFkgPSBbXSxcbiAgICAgICAgICAgIHA7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IHBhdGgubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgcCA9IHBhdGhbaV07XG4gICAgICAgICAgICBpZiAocFswXSA9PSBcIk1cIikge1xuICAgICAgICAgICAgICAgIHggPSBwWzFdO1xuICAgICAgICAgICAgICAgIHkgPSBwWzJdO1xuICAgICAgICAgICAgICAgIFgucHVzaCh4KTtcbiAgICAgICAgICAgICAgICBZLnB1c2goeSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBkaW0gPSBjdXJ2ZURpbSh4LCB5LCBwWzFdLCBwWzJdLCBwWzNdLCBwWzRdLCBwWzVdLCBwWzZdKTtcbiAgICAgICAgICAgICAgICBYID0gWC5jb25jYXQoZGltLm1pbi54LCBkaW0ubWF4LngpO1xuICAgICAgICAgICAgICAgIFkgPSBZLmNvbmNhdChkaW0ubWluLnksIGRpbS5tYXgueSk7XG4gICAgICAgICAgICAgICAgeCA9IHBbNV07XG4gICAgICAgICAgICAgICAgeSA9IHBbNl07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHhtaW4gPSBtbWluLmFwcGx5KDAsIFgpLFxuICAgICAgICAgICAgeW1pbiA9IG1taW4uYXBwbHkoMCwgWSksXG4gICAgICAgICAgICB4bWF4ID0gbW1heC5hcHBseSgwLCBYKSxcbiAgICAgICAgICAgIHltYXggPSBtbWF4LmFwcGx5KDAsIFkpLFxuICAgICAgICAgICAgYmIgPSBib3goeG1pbiwgeW1pbiwgeG1heCAtIHhtaW4sIHltYXggLSB5bWluKTtcbiAgICAgICAgcHRoLmJib3ggPSBjbG9uZShiYik7XG4gICAgICAgIHJldHVybiBiYjtcbiAgICB9XG4gICAgZnVuY3Rpb24gcmVjdFBhdGgoeCwgeSwgdywgaCwgcikge1xuICAgICAgICBpZiAocikge1xuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICBbXCJNXCIsIHggKyByLCB5XSxcbiAgICAgICAgICAgICAgICBbXCJsXCIsIHcgLSByICogMiwgMF0sXG4gICAgICAgICAgICAgICAgW1wiYVwiLCByLCByLCAwLCAwLCAxLCByLCByXSxcbiAgICAgICAgICAgICAgICBbXCJsXCIsIDAsIGggLSByICogMl0sXG4gICAgICAgICAgICAgICAgW1wiYVwiLCByLCByLCAwLCAwLCAxLCAtciwgcl0sXG4gICAgICAgICAgICAgICAgW1wibFwiLCByICogMiAtIHcsIDBdLFxuICAgICAgICAgICAgICAgIFtcImFcIiwgciwgciwgMCwgMCwgMSwgLXIsIC1yXSxcbiAgICAgICAgICAgICAgICBbXCJsXCIsIDAsIHIgKiAyIC0gaF0sXG4gICAgICAgICAgICAgICAgW1wiYVwiLCByLCByLCAwLCAwLCAxLCByLCAtcl0sXG4gICAgICAgICAgICAgICAgW1wielwiXVxuICAgICAgICAgICAgXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVzID0gW1tcIk1cIiwgeCwgeV0sIFtcImxcIiwgdywgMF0sIFtcImxcIiwgMCwgaF0sIFtcImxcIiwgLXcsIDBdLCBbXCJ6XCJdXTtcbiAgICAgICAgcmVzLnRvU3RyaW5nID0gdG9TdHJpbmc7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGVsbGlwc2VQYXRoKHgsIHksIHJ4LCByeSwgYSkge1xuICAgICAgICBpZiAoYSA9PSBudWxsICYmIHJ5ID09IG51bGwpIHtcbiAgICAgICAgICAgIHJ5ID0gcng7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGEgIT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIHJhZCA9IE1hdGguUEkgLyAxODAsXG4gICAgICAgICAgICAgICAgeDEgPSB4ICsgcnggKiBNYXRoLmNvcygtcnkgKiByYWQpLFxuICAgICAgICAgICAgICAgIHgyID0geCArIHJ4ICogTWF0aC5jb3MoLWEgKiByYWQpLFxuICAgICAgICAgICAgICAgIHkxID0geSArIHJ4ICogTWF0aC5zaW4oLXJ5ICogcmFkKSxcbiAgICAgICAgICAgICAgICB5MiA9IHkgKyByeCAqIE1hdGguc2luKC1hICogcmFkKSxcbiAgICAgICAgICAgICAgICByZXMgPSBbW1wiTVwiLCB4MSwgeTFdLCBbXCJBXCIsIHJ4LCByeCwgMCwgKyhhIC0gcnkgPiAxODApLCAwLCB4MiwgeTJdXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlcyA9IFtcbiAgICAgICAgICAgICAgICBbXCJNXCIsIHgsIHldLFxuICAgICAgICAgICAgICAgIFtcIm1cIiwgMCwgLXJ5XSxcbiAgICAgICAgICAgICAgICBbXCJhXCIsIHJ4LCByeSwgMCwgMSwgMSwgMCwgMiAqIHJ5XSxcbiAgICAgICAgICAgICAgICBbXCJhXCIsIHJ4LCByeSwgMCwgMSwgMSwgMCwgLTIgKiByeV0sXG4gICAgICAgICAgICAgICAgW1wielwiXVxuICAgICAgICAgICAgXTtcbiAgICAgICAgfVxuICAgICAgICByZXMudG9TdHJpbmcgPSB0b1N0cmluZztcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgdmFyIHVuaXQycHggPSBTbmFwLl91bml0MnB4LFxuICAgICAgICBnZXRQYXRoID0ge1xuICAgICAgICBwYXRoOiBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgIHJldHVybiBlbC5hdHRyKFwicGF0aFwiKTtcbiAgICAgICAgfSxcbiAgICAgICAgY2lyY2xlOiBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgIHZhciBhdHRyID0gdW5pdDJweChlbCk7XG4gICAgICAgICAgICByZXR1cm4gZWxsaXBzZVBhdGgoYXR0ci5jeCwgYXR0ci5jeSwgYXR0ci5yKTtcbiAgICAgICAgfSxcbiAgICAgICAgZWxsaXBzZTogZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgICAgICB2YXIgYXR0ciA9IHVuaXQycHgoZWwpO1xuICAgICAgICAgICAgcmV0dXJuIGVsbGlwc2VQYXRoKGF0dHIuY3gsIGF0dHIuY3ksIGF0dHIucngsIGF0dHIucnkpO1xuICAgICAgICB9LFxuICAgICAgICByZWN0OiBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgIHZhciBhdHRyID0gdW5pdDJweChlbCk7XG4gICAgICAgICAgICByZXR1cm4gcmVjdFBhdGgoYXR0ci54LCBhdHRyLnksIGF0dHIud2lkdGgsIGF0dHIuaGVpZ2h0LCBhdHRyLnJ4LCBhdHRyLnJ5KTtcbiAgICAgICAgfSxcbiAgICAgICAgaW1hZ2U6IGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgdmFyIGF0dHIgPSB1bml0MnB4KGVsKTtcbiAgICAgICAgICAgIHJldHVybiByZWN0UGF0aChhdHRyLngsIGF0dHIueSwgYXR0ci53aWR0aCwgYXR0ci5oZWlnaHQpO1xuICAgICAgICB9LFxuICAgICAgICB0ZXh0OiBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgIHZhciBiYm94ID0gZWwubm9kZS5nZXRCQm94KCk7XG4gICAgICAgICAgICByZXR1cm4gcmVjdFBhdGgoYmJveC54LCBiYm94LnksIGJib3gud2lkdGgsIGJib3guaGVpZ2h0KTtcbiAgICAgICAgfSxcbiAgICAgICAgZzogZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgICAgICB2YXIgYmJveCA9IGVsLm5vZGUuZ2V0QkJveCgpO1xuICAgICAgICAgICAgcmV0dXJuIHJlY3RQYXRoKGJib3gueCwgYmJveC55LCBiYm94LndpZHRoLCBiYm94LmhlaWdodCk7XG4gICAgICAgIH0sXG4gICAgICAgIHN5bWJvbDogZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgICAgICB2YXIgYmJveCA9IGVsLmdldEJCb3goKTtcbiAgICAgICAgICAgIHJldHVybiByZWN0UGF0aChiYm94LngsIGJib3gueSwgYmJveC53aWR0aCwgYmJveC5oZWlnaHQpO1xuICAgICAgICB9LFxuICAgICAgICBsaW5lOiBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgIHJldHVybiBcIk1cIiArIFtlbC5hdHRyKFwieDFcIiksIGVsLmF0dHIoXCJ5MVwiKSwgZWwuYXR0cihcIngyXCIpLCBlbC5hdHRyKFwieTJcIildO1xuICAgICAgICB9LFxuICAgICAgICBwb2x5bGluZTogZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJNXCIgKyBlbC5hdHRyKFwicG9pbnRzXCIpO1xuICAgICAgICB9LFxuICAgICAgICBwb2x5Z29uOiBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgIHJldHVybiBcIk1cIiArIGVsLmF0dHIoXCJwb2ludHNcIikgKyBcInpcIjtcbiAgICAgICAgfSxcbiAgICAgICAgc3ZnOiBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgIHZhciBiYm94ID0gZWwubm9kZS5nZXRCQm94KCk7XG4gICAgICAgICAgICByZXR1cm4gcmVjdFBhdGgoYmJveC54LCBiYm94LnksIGJib3gud2lkdGgsIGJib3guaGVpZ2h0KTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVmbHQ6IGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgdmFyIGJib3ggPSBlbC5ub2RlLmdldEJCb3goKTtcbiAgICAgICAgICAgIHJldHVybiByZWN0UGF0aChiYm94LngsIGJib3gueSwgYmJveC53aWR0aCwgYmJveC5oZWlnaHQpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBmdW5jdGlvbiBwYXRoVG9SZWxhdGl2ZShwYXRoQXJyYXkpIHtcbiAgICAgICAgdmFyIHB0aCA9IHBhdGhzKHBhdGhBcnJheSksXG4gICAgICAgICAgICBsb3dlckNhc2UgPSBTdHJpbmcucHJvdG90eXBlLnRvTG93ZXJDYXNlO1xuICAgICAgICBpZiAocHRoLnJlbCkge1xuICAgICAgICAgICAgcmV0dXJuIHBhdGhDbG9uZShwdGgucmVsKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIVNuYXAuaXMocGF0aEFycmF5LCBcImFycmF5XCIpIHx8ICFTbmFwLmlzKHBhdGhBcnJheSAmJiBwYXRoQXJyYXlbMF0sIFwiYXJyYXlcIikpIHtcbiAgICAgICAgICAgIHBhdGhBcnJheSA9IFNuYXAucGFyc2VQYXRoU3RyaW5nKHBhdGhBcnJheSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlcyA9IFtdLFxuICAgICAgICAgICAgeCA9IDAsXG4gICAgICAgICAgICB5ID0gMCxcbiAgICAgICAgICAgIG14ID0gMCxcbiAgICAgICAgICAgIG15ID0gMCxcbiAgICAgICAgICAgIHN0YXJ0ID0gMDtcbiAgICAgICAgaWYgKHBhdGhBcnJheVswXVswXSA9PSBcIk1cIikge1xuICAgICAgICAgICAgeCA9IHBhdGhBcnJheVswXVsxXTtcbiAgICAgICAgICAgIHkgPSBwYXRoQXJyYXlbMF1bMl07XG4gICAgICAgICAgICBteCA9IHg7XG4gICAgICAgICAgICBteSA9IHk7XG4gICAgICAgICAgICBzdGFydCsrO1xuICAgICAgICAgICAgcmVzLnB1c2goW1wiTVwiLCB4LCB5XSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IHN0YXJ0LCBpaSA9IHBhdGhBcnJheS5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgciA9IHJlc1tpXSA9IFtdLFxuICAgICAgICAgICAgICAgIHBhID0gcGF0aEFycmF5W2ldO1xuICAgICAgICAgICAgaWYgKHBhWzBdICE9IGxvd2VyQ2FzZS5jYWxsKHBhWzBdKSkge1xuICAgICAgICAgICAgICAgIHJbMF0gPSBsb3dlckNhc2UuY2FsbChwYVswXSk7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChyWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJhXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICByWzFdID0gcGFbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICByWzJdID0gcGFbMl07XG4gICAgICAgICAgICAgICAgICAgICAgICByWzNdID0gcGFbM107XG4gICAgICAgICAgICAgICAgICAgICAgICByWzRdID0gcGFbNF07XG4gICAgICAgICAgICAgICAgICAgICAgICByWzVdID0gcGFbNV07XG4gICAgICAgICAgICAgICAgICAgICAgICByWzZdID0gKyhwYVs2XSAtIHgpLnRvRml4ZWQoMyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByWzddID0gKyhwYVs3XSAtIHkpLnRvRml4ZWQoMyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInZcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJbMV0gPSArKHBhWzFdIC0geSkudG9GaXhlZCgzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwibVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgbXggPSBwYVsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG15ID0gcGFbMl07XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMSwgamogPSBwYS5sZW5ndGg7IGogPCBqajsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcltqXSA9ICsocGFbal0gLSAoKGogJSAyKSA/IHggOiB5KSkudG9GaXhlZCgzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHIgPSByZXNbaV0gPSBbXTtcbiAgICAgICAgICAgICAgICBpZiAocGFbMF0gPT0gXCJtXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgbXggPSBwYVsxXSArIHg7XG4gICAgICAgICAgICAgICAgICAgIG15ID0gcGFbMl0gKyB5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrID0gMCwga2sgPSBwYS5sZW5ndGg7IGsgPCBrazsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc1tpXVtrXSA9IHBhW2tdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBsZW4gPSByZXNbaV0ubGVuZ3RoO1xuICAgICAgICAgICAgc3dpdGNoIChyZXNbaV1bMF0pIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwielwiOlxuICAgICAgICAgICAgICAgICAgICB4ID0gbXg7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBteTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImhcIjpcbiAgICAgICAgICAgICAgICAgICAgeCArPSArcmVzW2ldW2xlbiAtIDFdO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwidlwiOlxuICAgICAgICAgICAgICAgICAgICB5ICs9ICtyZXNbaV1bbGVuIC0gMV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHggKz0gK3Jlc1tpXVtsZW4gLSAyXTtcbiAgICAgICAgICAgICAgICAgICAgeSArPSArcmVzW2ldW2xlbiAtIDFdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJlcy50b1N0cmluZyA9IHRvU3RyaW5nO1xuICAgICAgICBwdGgucmVsID0gcGF0aENsb25lKHJlcyk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHBhdGhUb0Fic29sdXRlKHBhdGhBcnJheSkge1xuICAgICAgICB2YXIgcHRoID0gcGF0aHMocGF0aEFycmF5KTtcbiAgICAgICAgaWYgKHB0aC5hYnMpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXRoQ2xvbmUocHRoLmFicyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFpcyhwYXRoQXJyYXksIFwiYXJyYXlcIikgfHwgIWlzKHBhdGhBcnJheSAmJiBwYXRoQXJyYXlbMF0sIFwiYXJyYXlcIikpIHsgLy8gcm91Z2ggYXNzdW1wdGlvblxuICAgICAgICAgICAgcGF0aEFycmF5ID0gU25hcC5wYXJzZVBhdGhTdHJpbmcocGF0aEFycmF5KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXBhdGhBcnJheSB8fCAhcGF0aEFycmF5Lmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIFtbXCJNXCIsIDAsIDBdXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVzID0gW10sXG4gICAgICAgICAgICB4ID0gMCxcbiAgICAgICAgICAgIHkgPSAwLFxuICAgICAgICAgICAgbXggPSAwLFxuICAgICAgICAgICAgbXkgPSAwLFxuICAgICAgICAgICAgc3RhcnQgPSAwLFxuICAgICAgICAgICAgcGEwO1xuICAgICAgICBpZiAocGF0aEFycmF5WzBdWzBdID09IFwiTVwiKSB7XG4gICAgICAgICAgICB4ID0gK3BhdGhBcnJheVswXVsxXTtcbiAgICAgICAgICAgIHkgPSArcGF0aEFycmF5WzBdWzJdO1xuICAgICAgICAgICAgbXggPSB4O1xuICAgICAgICAgICAgbXkgPSB5O1xuICAgICAgICAgICAgc3RhcnQrKztcbiAgICAgICAgICAgIHJlc1swXSA9IFtcIk1cIiwgeCwgeV07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNyeiA9IHBhdGhBcnJheS5sZW5ndGggPT0gMyAmJlxuICAgICAgICAgICAgcGF0aEFycmF5WzBdWzBdID09IFwiTVwiICYmXG4gICAgICAgICAgICBwYXRoQXJyYXlbMV1bMF0udG9VcHBlckNhc2UoKSA9PSBcIlJcIiAmJlxuICAgICAgICAgICAgcGF0aEFycmF5WzJdWzBdLnRvVXBwZXJDYXNlKCkgPT0gXCJaXCI7XG4gICAgICAgIGZvciAodmFyIHIsIHBhLCBpID0gc3RhcnQsIGlpID0gcGF0aEFycmF5Lmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKHIgPSBbXSk7XG4gICAgICAgICAgICBwYSA9IHBhdGhBcnJheVtpXTtcbiAgICAgICAgICAgIHBhMCA9IHBhWzBdO1xuICAgICAgICAgICAgaWYgKHBhMCAhPSBwYTAudG9VcHBlckNhc2UoKSkge1xuICAgICAgICAgICAgICAgIHJbMF0gPSBwYTAudG9VcHBlckNhc2UoKTtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHJbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIkFcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJbMV0gPSBwYVsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJbMl0gPSBwYVsyXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJbM10gPSBwYVszXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJbNF0gPSBwYVs0XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJbNV0gPSBwYVs1XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJbNl0gPSArKHBhWzZdICsgeCk7XG4gICAgICAgICAgICAgICAgICAgICAgICByWzddID0gKyhwYVs3XSArIHkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJWXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICByWzFdID0gK3BhWzFdICsgeTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiSFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgclsxXSA9ICtwYVsxXSArIHg7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlJcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkb3RzID0gW3gsIHldLmNvbmNhdChwYS5zbGljZSgxKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMiwgamogPSBkb3RzLmxlbmd0aDsgaiA8IGpqOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb3RzW2pdID0gK2RvdHNbal0gKyB4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRvdHNbKytqXSA9ICtkb3RzW2pdICsgeTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcyA9IHJlcy5jb25jYXQoY2F0bXVsbFJvbTJiZXppZXIoZG90cywgY3J6KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIk9cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvdHMgPSBlbGxpcHNlUGF0aCh4LCB5LCBwYVsxXSwgcGFbMl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgZG90cy5wdXNoKGRvdHNbMF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzID0gcmVzLmNvbmNhdChkb3RzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiVVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnBvcCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzID0gcmVzLmNvbmNhdChlbGxpcHNlUGF0aCh4LCB5LCBwYVsxXSwgcGFbMl0sIHBhWzNdKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICByID0gW1wiVVwiXS5jb25jYXQocmVzW3Jlcy5sZW5ndGggLSAxXS5zbGljZSgtMikpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJNXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBteCA9ICtwYVsxXSArIHg7XG4gICAgICAgICAgICAgICAgICAgICAgICBteSA9ICtwYVsyXSArIHk7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAxLCBqaiA9IHBhLmxlbmd0aDsgaiA8IGpqOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByW2pdID0gK3BhW2pdICsgKChqICUgMikgPyB4IDogeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChwYTAgPT0gXCJSXCIpIHtcbiAgICAgICAgICAgICAgICBkb3RzID0gW3gsIHldLmNvbmNhdChwYS5zbGljZSgxKSk7XG4gICAgICAgICAgICAgICAgcmVzLnBvcCgpO1xuICAgICAgICAgICAgICAgIHJlcyA9IHJlcy5jb25jYXQoY2F0bXVsbFJvbTJiZXppZXIoZG90cywgY3J6KSk7XG4gICAgICAgICAgICAgICAgciA9IFtcIlJcIl0uY29uY2F0KHBhLnNsaWNlKC0yKSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhMCA9PSBcIk9cIikge1xuICAgICAgICAgICAgICAgIHJlcy5wb3AoKTtcbiAgICAgICAgICAgICAgICBkb3RzID0gZWxsaXBzZVBhdGgoeCwgeSwgcGFbMV0sIHBhWzJdKTtcbiAgICAgICAgICAgICAgICBkb3RzLnB1c2goZG90c1swXSk7XG4gICAgICAgICAgICAgICAgcmVzID0gcmVzLmNvbmNhdChkb3RzKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGEwID09IFwiVVwiKSB7XG4gICAgICAgICAgICAgICAgcmVzLnBvcCgpO1xuICAgICAgICAgICAgICAgIHJlcyA9IHJlcy5jb25jYXQoZWxsaXBzZVBhdGgoeCwgeSwgcGFbMV0sIHBhWzJdLCBwYVszXSkpO1xuICAgICAgICAgICAgICAgIHIgPSBbXCJVXCJdLmNvbmNhdChyZXNbcmVzLmxlbmd0aCAtIDFdLnNsaWNlKC0yKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGsgPSAwLCBrayA9IHBhLmxlbmd0aDsgayA8IGtrOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgcltrXSA9IHBhW2tdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhMCA9IHBhMC50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgaWYgKHBhMCAhPSBcIk9cIikge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoclswXSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiWlwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgeCA9IG14O1xuICAgICAgICAgICAgICAgICAgICAgICAgeSA9IG15O1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJIXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB4ID0gclsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiVlwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgeSA9IHJbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIk1cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG14ID0gcltyLmxlbmd0aCAtIDJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgbXkgPSByW3IubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB4ID0gcltyLmxlbmd0aCAtIDJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgeSA9IHJbci5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmVzLnRvU3RyaW5nID0gdG9TdHJpbmc7XG4gICAgICAgIHB0aC5hYnMgPSBwYXRoQ2xvbmUocmVzKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgZnVuY3Rpb24gbDJjKHgxLCB5MSwgeDIsIHkyKSB7XG4gICAgICAgIHJldHVybiBbeDEsIHkxLCB4MiwgeTIsIHgyLCB5Ml07XG4gICAgfVxuICAgIGZ1bmN0aW9uIHEyYyh4MSwgeTEsIGF4LCBheSwgeDIsIHkyKSB7XG4gICAgICAgIHZhciBfMTMgPSAxIC8gMyxcbiAgICAgICAgICAgIF8yMyA9IDIgLyAzO1xuICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgICAgIF8xMyAqIHgxICsgXzIzICogYXgsXG4gICAgICAgICAgICAgICAgXzEzICogeTEgKyBfMjMgKiBheSxcbiAgICAgICAgICAgICAgICBfMTMgKiB4MiArIF8yMyAqIGF4LFxuICAgICAgICAgICAgICAgIF8xMyAqIHkyICsgXzIzICogYXksXG4gICAgICAgICAgICAgICAgeDIsXG4gICAgICAgICAgICAgICAgeTJcbiAgICAgICAgICAgIF07XG4gICAgfVxuICAgIGZ1bmN0aW9uIGEyYyh4MSwgeTEsIHJ4LCByeSwgYW5nbGUsIGxhcmdlX2FyY19mbGFnLCBzd2VlcF9mbGFnLCB4MiwgeTIsIHJlY3Vyc2l2ZSkge1xuICAgICAgICAvLyBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvZiB3aGVyZSB0aGlzIG1hdGggY2FtZSBmcm9tIHZpc2l0OlxuICAgICAgICAvLyBodHRwOi8vd3d3LnczLm9yZy9UUi9TVkcxMS9pbXBsbm90ZS5odG1sI0FyY0ltcGxlbWVudGF0aW9uTm90ZXNcbiAgICAgICAgdmFyIF8xMjAgPSBQSSAqIDEyMCAvIDE4MCxcbiAgICAgICAgICAgIHJhZCA9IFBJIC8gMTgwICogKCthbmdsZSB8fCAwKSxcbiAgICAgICAgICAgIHJlcyA9IFtdLFxuICAgICAgICAgICAgeHksXG4gICAgICAgICAgICByb3RhdGUgPSBTbmFwLl8uY2FjaGVyKGZ1bmN0aW9uICh4LCB5LCByYWQpIHtcbiAgICAgICAgICAgICAgICB2YXIgWCA9IHggKiBtYXRoLmNvcyhyYWQpIC0geSAqIG1hdGguc2luKHJhZCksXG4gICAgICAgICAgICAgICAgICAgIFkgPSB4ICogbWF0aC5zaW4ocmFkKSArIHkgKiBtYXRoLmNvcyhyYWQpO1xuICAgICAgICAgICAgICAgIHJldHVybiB7eDogWCwgeTogWX07XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgaWYgKCFyZWN1cnNpdmUpIHtcbiAgICAgICAgICAgIHh5ID0gcm90YXRlKHgxLCB5MSwgLXJhZCk7XG4gICAgICAgICAgICB4MSA9IHh5Lng7XG4gICAgICAgICAgICB5MSA9IHh5Lnk7XG4gICAgICAgICAgICB4eSA9IHJvdGF0ZSh4MiwgeTIsIC1yYWQpO1xuICAgICAgICAgICAgeDIgPSB4eS54O1xuICAgICAgICAgICAgeTIgPSB4eS55O1xuICAgICAgICAgICAgdmFyIGNvcyA9IG1hdGguY29zKFBJIC8gMTgwICogYW5nbGUpLFxuICAgICAgICAgICAgICAgIHNpbiA9IG1hdGguc2luKFBJIC8gMTgwICogYW5nbGUpLFxuICAgICAgICAgICAgICAgIHggPSAoeDEgLSB4MikgLyAyLFxuICAgICAgICAgICAgICAgIHkgPSAoeTEgLSB5MikgLyAyO1xuICAgICAgICAgICAgdmFyIGggPSAoeCAqIHgpIC8gKHJ4ICogcngpICsgKHkgKiB5KSAvIChyeSAqIHJ5KTtcbiAgICAgICAgICAgIGlmIChoID4gMSkge1xuICAgICAgICAgICAgICAgIGggPSBtYXRoLnNxcnQoaCk7XG4gICAgICAgICAgICAgICAgcnggPSBoICogcng7XG4gICAgICAgICAgICAgICAgcnkgPSBoICogcnk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgcngyID0gcnggKiByeCxcbiAgICAgICAgICAgICAgICByeTIgPSByeSAqIHJ5LFxuICAgICAgICAgICAgICAgIGsgPSAobGFyZ2VfYXJjX2ZsYWcgPT0gc3dlZXBfZmxhZyA/IC0xIDogMSkgKlxuICAgICAgICAgICAgICAgICAgICBtYXRoLnNxcnQoYWJzKChyeDIgKiByeTIgLSByeDIgKiB5ICogeSAtIHJ5MiAqIHggKiB4KSAvIChyeDIgKiB5ICogeSArIHJ5MiAqIHggKiB4KSkpLFxuICAgICAgICAgICAgICAgIGN4ID0gayAqIHJ4ICogeSAvIHJ5ICsgKHgxICsgeDIpIC8gMixcbiAgICAgICAgICAgICAgICBjeSA9IGsgKiAtcnkgKiB4IC8gcnggKyAoeTEgKyB5MikgLyAyLFxuICAgICAgICAgICAgICAgIGYxID0gbWF0aC5hc2luKCgoeTEgLSBjeSkgLyByeSkudG9GaXhlZCg5KSksXG4gICAgICAgICAgICAgICAgZjIgPSBtYXRoLmFzaW4oKCh5MiAtIGN5KSAvIHJ5KS50b0ZpeGVkKDkpKTtcblxuICAgICAgICAgICAgZjEgPSB4MSA8IGN4ID8gUEkgLSBmMSA6IGYxO1xuICAgICAgICAgICAgZjIgPSB4MiA8IGN4ID8gUEkgLSBmMiA6IGYyO1xuICAgICAgICAgICAgZjEgPCAwICYmIChmMSA9IFBJICogMiArIGYxKTtcbiAgICAgICAgICAgIGYyIDwgMCAmJiAoZjIgPSBQSSAqIDIgKyBmMik7XG4gICAgICAgICAgICBpZiAoc3dlZXBfZmxhZyAmJiBmMSA+IGYyKSB7XG4gICAgICAgICAgICAgICAgZjEgPSBmMSAtIFBJICogMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghc3dlZXBfZmxhZyAmJiBmMiA+IGYxKSB7XG4gICAgICAgICAgICAgICAgZjIgPSBmMiAtIFBJICogMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGYxID0gcmVjdXJzaXZlWzBdO1xuICAgICAgICAgICAgZjIgPSByZWN1cnNpdmVbMV07XG4gICAgICAgICAgICBjeCA9IHJlY3Vyc2l2ZVsyXTtcbiAgICAgICAgICAgIGN5ID0gcmVjdXJzaXZlWzNdO1xuICAgICAgICB9XG4gICAgICAgIHZhciBkZiA9IGYyIC0gZjE7XG4gICAgICAgIGlmIChhYnMoZGYpID4gXzEyMCkge1xuICAgICAgICAgICAgdmFyIGYyb2xkID0gZjIsXG4gICAgICAgICAgICAgICAgeDJvbGQgPSB4MixcbiAgICAgICAgICAgICAgICB5Mm9sZCA9IHkyO1xuICAgICAgICAgICAgZjIgPSBmMSArIF8xMjAgKiAoc3dlZXBfZmxhZyAmJiBmMiA+IGYxID8gMSA6IC0xKTtcbiAgICAgICAgICAgIHgyID0gY3ggKyByeCAqIG1hdGguY29zKGYyKTtcbiAgICAgICAgICAgIHkyID0gY3kgKyByeSAqIG1hdGguc2luKGYyKTtcbiAgICAgICAgICAgIHJlcyA9IGEyYyh4MiwgeTIsIHJ4LCByeSwgYW5nbGUsIDAsIHN3ZWVwX2ZsYWcsIHgyb2xkLCB5Mm9sZCwgW2YyLCBmMm9sZCwgY3gsIGN5XSk7XG4gICAgICAgIH1cbiAgICAgICAgZGYgPSBmMiAtIGYxO1xuICAgICAgICB2YXIgYzEgPSBtYXRoLmNvcyhmMSksXG4gICAgICAgICAgICBzMSA9IG1hdGguc2luKGYxKSxcbiAgICAgICAgICAgIGMyID0gbWF0aC5jb3MoZjIpLFxuICAgICAgICAgICAgczIgPSBtYXRoLnNpbihmMiksXG4gICAgICAgICAgICB0ID0gbWF0aC50YW4oZGYgLyA0KSxcbiAgICAgICAgICAgIGh4ID0gNCAvIDMgKiByeCAqIHQsXG4gICAgICAgICAgICBoeSA9IDQgLyAzICogcnkgKiB0LFxuICAgICAgICAgICAgbTEgPSBbeDEsIHkxXSxcbiAgICAgICAgICAgIG0yID0gW3gxICsgaHggKiBzMSwgeTEgLSBoeSAqIGMxXSxcbiAgICAgICAgICAgIG0zID0gW3gyICsgaHggKiBzMiwgeTIgLSBoeSAqIGMyXSxcbiAgICAgICAgICAgIG00ID0gW3gyLCB5Ml07XG4gICAgICAgIG0yWzBdID0gMiAqIG0xWzBdIC0gbTJbMF07XG4gICAgICAgIG0yWzFdID0gMiAqIG0xWzFdIC0gbTJbMV07XG4gICAgICAgIGlmIChyZWN1cnNpdmUpIHtcbiAgICAgICAgICAgIHJldHVybiBbbTIsIG0zLCBtNF0uY29uY2F0KHJlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXMgPSBbbTIsIG0zLCBtNF0uY29uY2F0KHJlcykuam9pbigpLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIHZhciBuZXdyZXMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IHJlcy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbmV3cmVzW2ldID0gaSAlIDIgPyByb3RhdGUocmVzW2kgLSAxXSwgcmVzW2ldLCByYWQpLnkgOiByb3RhdGUocmVzW2ldLCByZXNbaSArIDFdLCByYWQpLng7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbmV3cmVzO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGZpbmREb3RBdFNlZ21lbnQocDF4LCBwMXksIGMxeCwgYzF5LCBjMngsIGMyeSwgcDJ4LCBwMnksIHQpIHtcbiAgICAgICAgdmFyIHQxID0gMSAtIHQ7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBwb3codDEsIDMpICogcDF4ICsgcG93KHQxLCAyKSAqIDMgKiB0ICogYzF4ICsgdDEgKiAzICogdCAqIHQgKiBjMnggKyBwb3codCwgMykgKiBwMngsXG4gICAgICAgICAgICB5OiBwb3codDEsIDMpICogcDF5ICsgcG93KHQxLCAyKSAqIDMgKiB0ICogYzF5ICsgdDEgKiAzICogdCAqIHQgKiBjMnkgKyBwb3codCwgMykgKiBwMnlcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gY3VydmVEaW0ocDF4LCBwMXksIGMxeCwgYzF5LCBjMngsIGMyeSwgcDJ4LCBwMnkpIHtcbiAgICAgICAgdmFyIGEgPSAoYzJ4IC0gMiAqIGMxeCArIHAxeCkgLSAocDJ4IC0gMiAqIGMyeCArIGMxeCksXG4gICAgICAgICAgICBiID0gMiAqIChjMXggLSBwMXgpIC0gMiAqIChjMnggLSBjMXgpLFxuICAgICAgICAgICAgYyA9IHAxeCAtIGMxeCxcbiAgICAgICAgICAgIHQxID0gKC1iICsgbWF0aC5zcXJ0KGIgKiBiIC0gNCAqIGEgKiBjKSkgLyAyIC8gYSxcbiAgICAgICAgICAgIHQyID0gKC1iIC0gbWF0aC5zcXJ0KGIgKiBiIC0gNCAqIGEgKiBjKSkgLyAyIC8gYSxcbiAgICAgICAgICAgIHkgPSBbcDF5LCBwMnldLFxuICAgICAgICAgICAgeCA9IFtwMXgsIHAyeF0sXG4gICAgICAgICAgICBkb3Q7XG4gICAgICAgIGFicyh0MSkgPiBcIjFlMTJcIiAmJiAodDEgPSAuNSk7XG4gICAgICAgIGFicyh0MikgPiBcIjFlMTJcIiAmJiAodDIgPSAuNSk7XG4gICAgICAgIGlmICh0MSA+IDAgJiYgdDEgPCAxKSB7XG4gICAgICAgICAgICBkb3QgPSBmaW5kRG90QXRTZWdtZW50KHAxeCwgcDF5LCBjMXgsIGMxeSwgYzJ4LCBjMnksIHAyeCwgcDJ5LCB0MSk7XG4gICAgICAgICAgICB4LnB1c2goZG90LngpO1xuICAgICAgICAgICAgeS5wdXNoKGRvdC55KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodDIgPiAwICYmIHQyIDwgMSkge1xuICAgICAgICAgICAgZG90ID0gZmluZERvdEF0U2VnbWVudChwMXgsIHAxeSwgYzF4LCBjMXksIGMyeCwgYzJ5LCBwMngsIHAyeSwgdDIpO1xuICAgICAgICAgICAgeC5wdXNoKGRvdC54KTtcbiAgICAgICAgICAgIHkucHVzaChkb3QueSk7XG4gICAgICAgIH1cbiAgICAgICAgYSA9IChjMnkgLSAyICogYzF5ICsgcDF5KSAtIChwMnkgLSAyICogYzJ5ICsgYzF5KTtcbiAgICAgICAgYiA9IDIgKiAoYzF5IC0gcDF5KSAtIDIgKiAoYzJ5IC0gYzF5KTtcbiAgICAgICAgYyA9IHAxeSAtIGMxeTtcbiAgICAgICAgdDEgPSAoLWIgKyBtYXRoLnNxcnQoYiAqIGIgLSA0ICogYSAqIGMpKSAvIDIgLyBhO1xuICAgICAgICB0MiA9ICgtYiAtIG1hdGguc3FydChiICogYiAtIDQgKiBhICogYykpIC8gMiAvIGE7XG4gICAgICAgIGFicyh0MSkgPiBcIjFlMTJcIiAmJiAodDEgPSAuNSk7XG4gICAgICAgIGFicyh0MikgPiBcIjFlMTJcIiAmJiAodDIgPSAuNSk7XG4gICAgICAgIGlmICh0MSA+IDAgJiYgdDEgPCAxKSB7XG4gICAgICAgICAgICBkb3QgPSBmaW5kRG90QXRTZWdtZW50KHAxeCwgcDF5LCBjMXgsIGMxeSwgYzJ4LCBjMnksIHAyeCwgcDJ5LCB0MSk7XG4gICAgICAgICAgICB4LnB1c2goZG90LngpO1xuICAgICAgICAgICAgeS5wdXNoKGRvdC55KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodDIgPiAwICYmIHQyIDwgMSkge1xuICAgICAgICAgICAgZG90ID0gZmluZERvdEF0U2VnbWVudChwMXgsIHAxeSwgYzF4LCBjMXksIGMyeCwgYzJ5LCBwMngsIHAyeSwgdDIpO1xuICAgICAgICAgICAgeC5wdXNoKGRvdC54KTtcbiAgICAgICAgICAgIHkucHVzaChkb3QueSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG1pbjoge3g6IG1taW4uYXBwbHkoMCwgeCksIHk6IG1taW4uYXBwbHkoMCwgeSl9LFxuICAgICAgICAgICAgbWF4OiB7eDogbW1heC5hcHBseSgwLCB4KSwgeTogbW1heC5hcHBseSgwLCB5KX1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcGF0aDJjdXJ2ZShwYXRoLCBwYXRoMikge1xuICAgICAgICB2YXIgcHRoID0gIXBhdGgyICYmIHBhdGhzKHBhdGgpO1xuICAgICAgICBpZiAoIXBhdGgyICYmIHB0aC5jdXJ2ZSkge1xuICAgICAgICAgICAgcmV0dXJuIHBhdGhDbG9uZShwdGguY3VydmUpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwID0gcGF0aFRvQWJzb2x1dGUocGF0aCksXG4gICAgICAgICAgICBwMiA9IHBhdGgyICYmIHBhdGhUb0Fic29sdXRlKHBhdGgyKSxcbiAgICAgICAgICAgIGF0dHJzID0ge3g6IDAsIHk6IDAsIGJ4OiAwLCBieTogMCwgWDogMCwgWTogMCwgcXg6IG51bGwsIHF5OiBudWxsfSxcbiAgICAgICAgICAgIGF0dHJzMiA9IHt4OiAwLCB5OiAwLCBieDogMCwgYnk6IDAsIFg6IDAsIFk6IDAsIHF4OiBudWxsLCBxeTogbnVsbH0sXG4gICAgICAgICAgICBwcm9jZXNzUGF0aCA9IGZ1bmN0aW9uIChwYXRoLCBkKSB7XG4gICAgICAgICAgICAgICAgdmFyIG54LCBueTtcbiAgICAgICAgICAgICAgICBpZiAoIXBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtcIkNcIiwgZC54LCBkLnksIGQueCwgZC55LCBkLngsIGQueV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICEocGF0aFswXSBpbiB7VDoxLCBROjF9KSAmJiAoZC5xeCA9IGQucXkgPSBudWxsKTtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHBhdGhbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIk1cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGQuWCA9IHBhdGhbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICBkLlkgPSBwYXRoWzJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJBXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoID0gW1wiQ1wiXS5jb25jYXQoYTJjLmFwcGx5KDAsIFtkLngsIGQueV0uY29uY2F0KHBhdGguc2xpY2UoMSkpKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlNcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG54ID0gZC54ICsgKGQueCAtIChkLmJ4IHx8IGQueCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbnkgPSBkLnkgKyAoZC55IC0gKGQuYnkgfHwgZC55KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoID0gW1wiQ1wiLCBueCwgbnldLmNvbmNhdChwYXRoLnNsaWNlKDEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiVFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgZC5xeCA9IGQueCArIChkLnggLSAoZC5xeCB8fCBkLngpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGQucXkgPSBkLnkgKyAoZC55IC0gKGQucXkgfHwgZC55KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoID0gW1wiQ1wiXS5jb25jYXQocTJjKGQueCwgZC55LCBkLnF4LCBkLnF5LCBwYXRoWzFdLCBwYXRoWzJdKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlFcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGQucXggPSBwYXRoWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZC5xeSA9IHBhdGhbMl07XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoID0gW1wiQ1wiXS5jb25jYXQocTJjKGQueCwgZC55LCBwYXRoWzFdLCBwYXRoWzJdLCBwYXRoWzNdLCBwYXRoWzRdKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIkxcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggPSBbXCJDXCJdLmNvbmNhdChsMmMoZC54LCBkLnksIHBhdGhbMV0sIHBhdGhbMl0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiSFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aCA9IFtcIkNcIl0uY29uY2F0KGwyYyhkLngsIGQueSwgcGF0aFsxXSwgZC55KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlZcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggPSBbXCJDXCJdLmNvbmNhdChsMmMoZC54LCBkLnksIGQueCwgcGF0aFsxXSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJaXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoID0gW1wiQ1wiXS5jb25jYXQobDJjKGQueCwgZC55LCBkLlgsIGQuWSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZpeEFyYyA9IGZ1bmN0aW9uIChwcCwgaSkge1xuICAgICAgICAgICAgICAgIGlmIChwcFtpXS5sZW5ndGggPiA3KSB7XG4gICAgICAgICAgICAgICAgICAgIHBwW2ldLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwaSA9IHBwW2ldO1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAocGkubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwcC5zcGxpY2UoaSsrLCAwLCBbXCJDXCJdLmNvbmNhdChwaS5zcGxpY2UoMCwgNikpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBwcC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIGlpID0gbW1heChwLmxlbmd0aCwgcDIgJiYgcDIubGVuZ3RoIHx8IDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmaXhNID0gZnVuY3Rpb24gKHBhdGgxLCBwYXRoMiwgYTEsIGEyLCBpKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhdGgxICYmIHBhdGgyICYmIHBhdGgxW2ldWzBdID09IFwiTVwiICYmIHBhdGgyW2ldWzBdICE9IFwiTVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhdGgyLnNwbGljZShpLCAwLCBbXCJNXCIsIGEyLngsIGEyLnldKTtcbiAgICAgICAgICAgICAgICAgICAgYTEuYnggPSAwO1xuICAgICAgICAgICAgICAgICAgICBhMS5ieSA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGExLnggPSBwYXRoMVtpXVsxXTtcbiAgICAgICAgICAgICAgICAgICAgYTEueSA9IHBhdGgxW2ldWzJdO1xuICAgICAgICAgICAgICAgICAgICBpaSA9IG1tYXgocC5sZW5ndGgsIHAyICYmIHAyLmxlbmd0aCB8fCAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBtbWF4KHAubGVuZ3RoLCBwMiAmJiBwMi5sZW5ndGggfHwgMCk7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICBwW2ldID0gcHJvY2Vzc1BhdGgocFtpXSwgYXR0cnMpO1xuICAgICAgICAgICAgZml4QXJjKHAsIGkpO1xuICAgICAgICAgICAgcDIgJiYgKHAyW2ldID0gcHJvY2Vzc1BhdGgocDJbaV0sIGF0dHJzMikpO1xuICAgICAgICAgICAgcDIgJiYgZml4QXJjKHAyLCBpKTtcbiAgICAgICAgICAgIGZpeE0ocCwgcDIsIGF0dHJzLCBhdHRyczIsIGkpO1xuICAgICAgICAgICAgZml4TShwMiwgcCwgYXR0cnMyLCBhdHRycywgaSk7XG4gICAgICAgICAgICB2YXIgc2VnID0gcFtpXSxcbiAgICAgICAgICAgICAgICBzZWcyID0gcDIgJiYgcDJbaV0sXG4gICAgICAgICAgICAgICAgc2VnbGVuID0gc2VnLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBzZWcybGVuID0gcDIgJiYgc2VnMi5sZW5ndGg7XG4gICAgICAgICAgICBhdHRycy54ID0gc2VnW3NlZ2xlbiAtIDJdO1xuICAgICAgICAgICAgYXR0cnMueSA9IHNlZ1tzZWdsZW4gLSAxXTtcbiAgICAgICAgICAgIGF0dHJzLmJ4ID0gdG9GbG9hdChzZWdbc2VnbGVuIC0gNF0pIHx8IGF0dHJzLng7XG4gICAgICAgICAgICBhdHRycy5ieSA9IHRvRmxvYXQoc2VnW3NlZ2xlbiAtIDNdKSB8fCBhdHRycy55O1xuICAgICAgICAgICAgYXR0cnMyLmJ4ID0gcDIgJiYgKHRvRmxvYXQoc2VnMltzZWcybGVuIC0gNF0pIHx8IGF0dHJzMi54KTtcbiAgICAgICAgICAgIGF0dHJzMi5ieSA9IHAyICYmICh0b0Zsb2F0KHNlZzJbc2VnMmxlbiAtIDNdKSB8fCBhdHRyczIueSk7XG4gICAgICAgICAgICBhdHRyczIueCA9IHAyICYmIHNlZzJbc2VnMmxlbiAtIDJdO1xuICAgICAgICAgICAgYXR0cnMyLnkgPSBwMiAmJiBzZWcyW3NlZzJsZW4gLSAxXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXAyKSB7XG4gICAgICAgICAgICBwdGguY3VydmUgPSBwYXRoQ2xvbmUocCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHAyID8gW3AsIHAyXSA6IHA7XG4gICAgfVxuICAgIGZ1bmN0aW9uIG1hcFBhdGgocGF0aCwgbWF0cml4KSB7XG4gICAgICAgIGlmICghbWF0cml4KSB7XG4gICAgICAgICAgICByZXR1cm4gcGF0aDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgeCwgeSwgaSwgaiwgaWksIGpqLCBwYXRoaTtcbiAgICAgICAgcGF0aCA9IHBhdGgyY3VydmUocGF0aCk7XG4gICAgICAgIGZvciAoaSA9IDAsIGlpID0gcGF0aC5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICBwYXRoaSA9IHBhdGhbaV07XG4gICAgICAgICAgICBmb3IgKGogPSAxLCBqaiA9IHBhdGhpLmxlbmd0aDsgaiA8IGpqOyBqICs9IDIpIHtcbiAgICAgICAgICAgICAgICB4ID0gbWF0cml4LngocGF0aGlbal0sIHBhdGhpW2ogKyAxXSk7XG4gICAgICAgICAgICAgICAgeSA9IG1hdHJpeC55KHBhdGhpW2pdLCBwYXRoaVtqICsgMV0pO1xuICAgICAgICAgICAgICAgIHBhdGhpW2pdID0geDtcbiAgICAgICAgICAgICAgICBwYXRoaVtqICsgMV0gPSB5O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXRoO1xuICAgIH1cblxuICAgIC8vIGh0dHA6Ly9zY2hlcGVycy5jYy9nZXR0aW5nLXRvLXRoZS1wb2ludFxuICAgIGZ1bmN0aW9uIGNhdG11bGxSb20yYmV6aWVyKGNycCwgeikge1xuICAgICAgICB2YXIgZCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IGNycC5sZW5ndGg7IGlMZW4gLSAyICogIXogPiBpOyBpICs9IDIpIHtcbiAgICAgICAgICAgIHZhciBwID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAge3g6ICtjcnBbaSAtIDJdLCB5OiArY3JwW2kgLSAxXX0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7eDogK2NycFtpXSwgICAgIHk6ICtjcnBbaSArIDFdfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHt4OiArY3JwW2kgKyAyXSwgeTogK2NycFtpICsgM119LFxuICAgICAgICAgICAgICAgICAgICAgICAge3g6ICtjcnBbaSArIDRdLCB5OiArY3JwW2kgKyA1XX1cbiAgICAgICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIGlmICh6KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpKSB7XG4gICAgICAgICAgICAgICAgICAgIHBbMF0gPSB7eDogK2NycFtpTGVuIC0gMl0sIHk6ICtjcnBbaUxlbiAtIDFdfTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlMZW4gLSA0ID09IGkpIHtcbiAgICAgICAgICAgICAgICAgICAgcFszXSA9IHt4OiArY3JwWzBdLCB5OiArY3JwWzFdfTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlMZW4gLSAyID09IGkpIHtcbiAgICAgICAgICAgICAgICAgICAgcFsyXSA9IHt4OiArY3JwWzBdLCB5OiArY3JwWzFdfTtcbiAgICAgICAgICAgICAgICAgICAgcFszXSA9IHt4OiArY3JwWzJdLCB5OiArY3JwWzNdfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChpTGVuIC0gNCA9PSBpKSB7XG4gICAgICAgICAgICAgICAgICAgIHBbM10gPSBwWzJdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWkpIHtcbiAgICAgICAgICAgICAgICAgICAgcFswXSA9IHt4OiArY3JwW2ldLCB5OiArY3JwW2kgKyAxXX07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZC5wdXNoKFtcIkNcIixcbiAgICAgICAgICAgICAgICAgICgtcFswXS54ICsgNiAqIHBbMV0ueCArIHBbMl0ueCkgLyA2LFxuICAgICAgICAgICAgICAgICAgKC1wWzBdLnkgKyA2ICogcFsxXS55ICsgcFsyXS55KSAvIDYsXG4gICAgICAgICAgICAgICAgICAocFsxXS54ICsgNiAqIHBbMl0ueCAtIHBbM10ueCkgLyA2LFxuICAgICAgICAgICAgICAgICAgKHBbMV0ueSArIDYqcFsyXS55IC0gcFszXS55KSAvIDYsXG4gICAgICAgICAgICAgICAgICBwWzJdLngsXG4gICAgICAgICAgICAgICAgICBwWzJdLnlcbiAgICAgICAgICAgIF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGQ7XG4gICAgfVxuXG4gICAgLy8gZXhwb3J0XG4gICAgU25hcC5wYXRoID0gcGF0aHM7XG5cbiAgICAvKlxcXG4gICAgICogU25hcC5wYXRoLmdldFRvdGFsTGVuZ3RoXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZXR1cm5zIHRoZSBsZW5ndGggb2YgdGhlIGdpdmVuIHBhdGggaW4gcGl4ZWxzXG4gICAgICoqXG4gICAgIC0gcGF0aCAoc3RyaW5nKSBTVkcgcGF0aCBzdHJpbmdcbiAgICAgKipcbiAgICAgPSAobnVtYmVyKSBsZW5ndGhcbiAgICBcXCovXG4gICAgU25hcC5wYXRoLmdldFRvdGFsTGVuZ3RoID0gZ2V0VG90YWxMZW5ndGg7XG4gICAgLypcXFxuICAgICAqIFNuYXAucGF0aC5nZXRQb2ludEF0TGVuZ3RoXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZXR1cm5zIHRoZSBjb29yZGluYXRlcyBvZiB0aGUgcG9pbnQgbG9jYXRlZCBhdCB0aGUgZ2l2ZW4gbGVuZ3RoIGFsb25nIHRoZSBnaXZlbiBwYXRoXG4gICAgICoqXG4gICAgIC0gcGF0aCAoc3RyaW5nKSBTVkcgcGF0aCBzdHJpbmdcbiAgICAgLSBsZW5ndGggKG51bWJlcikgbGVuZ3RoLCBpbiBwaXhlbHMsIGZyb20gdGhlIHN0YXJ0IG9mIHRoZSBwYXRoLCBleGNsdWRpbmcgbm9uLXJlbmRlcmluZyBqdW1wc1xuICAgICAqKlxuICAgICA9IChvYmplY3QpIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBwb2ludDpcbiAgICAgbyB7XG4gICAgIG8gICAgIHg6IChudW1iZXIpIHggY29vcmRpbmF0ZSxcbiAgICAgbyAgICAgeTogKG51bWJlcikgeSBjb29yZGluYXRlLFxuICAgICBvICAgICBhbHBoYTogKG51bWJlcikgYW5nbGUgb2YgZGVyaXZhdGl2ZVxuICAgICBvIH1cbiAgICBcXCovXG4gICAgU25hcC5wYXRoLmdldFBvaW50QXRMZW5ndGggPSBnZXRQb2ludEF0TGVuZ3RoO1xuICAgIC8qXFxcbiAgICAgKiBTbmFwLnBhdGguZ2V0U3VicGF0aFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogUmV0dXJucyB0aGUgc3VicGF0aCBvZiBhIGdpdmVuIHBhdGggYmV0d2VlbiBnaXZlbiBzdGFydCBhbmQgZW5kIGxlbmd0aHNcbiAgICAgKipcbiAgICAgLSBwYXRoIChzdHJpbmcpIFNWRyBwYXRoIHN0cmluZ1xuICAgICAtIGZyb20gKG51bWJlcikgbGVuZ3RoLCBpbiBwaXhlbHMsIGZyb20gdGhlIHN0YXJ0IG9mIHRoZSBwYXRoIHRvIHRoZSBzdGFydCBvZiB0aGUgc2VnbWVudFxuICAgICAtIHRvIChudW1iZXIpIGxlbmd0aCwgaW4gcGl4ZWxzLCBmcm9tIHRoZSBzdGFydCBvZiB0aGUgcGF0aCB0byB0aGUgZW5kIG9mIHRoZSBzZWdtZW50XG4gICAgICoqXG4gICAgID0gKHN0cmluZykgcGF0aCBzdHJpbmcgZGVmaW5pdGlvbiBmb3IgdGhlIHNlZ21lbnRcbiAgICBcXCovXG4gICAgU25hcC5wYXRoLmdldFN1YnBhdGggPSBmdW5jdGlvbiAocGF0aCwgZnJvbSwgdG8pIHtcbiAgICAgICAgaWYgKHRoaXMuZ2V0VG90YWxMZW5ndGgocGF0aCkgLSB0byA8IDFlLTYpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRTdWJwYXRoc0F0TGVuZ3RoKHBhdGgsIGZyb20pLmVuZDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYSA9IGdldFN1YnBhdGhzQXRMZW5ndGgocGF0aCwgdG8sIDEpO1xuICAgICAgICByZXR1cm4gZnJvbSA/IGdldFN1YnBhdGhzQXRMZW5ndGgoYSwgZnJvbSkuZW5kIDogYTtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LmdldFRvdGFsTGVuZ3RoXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZXR1cm5zIHRoZSBsZW5ndGggb2YgdGhlIHBhdGggaW4gcGl4ZWxzIChvbmx5IHdvcmtzIGZvciBgcGF0aGAgZWxlbWVudHMpXG4gICAgID0gKG51bWJlcikgbGVuZ3RoXG4gICAgXFwqL1xuICAgIGVscHJvdG8uZ2V0VG90YWxMZW5ndGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLm5vZGUuZ2V0VG90YWxMZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm5vZGUuZ2V0VG90YWxMZW5ndGgoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgLy8gU0lFUlJBIEVsZW1lbnQuZ2V0UG9pbnRBdExlbmd0aCgpL0VsZW1lbnQuZ2V0VG90YWxMZW5ndGgoKTogSWYgYSA8cGF0aD4gaXMgYnJva2VuIGludG8gZGlmZmVyZW50IHNlZ21lbnRzLCBpcyB0aGUganVtcCBkaXN0YW5jZSB0byB0aGUgbmV3IGNvb3JkaW5hdGVzIHNldCBieSB0aGUgX01fIG9yIF9tXyBjb21tYW5kcyBjYWxjdWxhdGVkIGFzIHBhcnQgb2YgdGhlIHBhdGgncyB0b3RhbCBsZW5ndGg/XG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQuZ2V0UG9pbnRBdExlbmd0aFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogUmV0dXJucyBjb29yZGluYXRlcyBvZiB0aGUgcG9pbnQgbG9jYXRlZCBhdCB0aGUgZ2l2ZW4gbGVuZ3RoIG9uIHRoZSBnaXZlbiBwYXRoIChvbmx5IHdvcmtzIGZvciBgcGF0aGAgZWxlbWVudHMpXG4gICAgICoqXG4gICAgIC0gbGVuZ3RoIChudW1iZXIpIGxlbmd0aCwgaW4gcGl4ZWxzLCBmcm9tIHRoZSBzdGFydCBvZiB0aGUgcGF0aCwgZXhjbHVkaW5nIG5vbi1yZW5kZXJpbmcganVtcHNcbiAgICAgKipcbiAgICAgPSAob2JqZWN0KSByZXByZXNlbnRhdGlvbiBvZiB0aGUgcG9pbnQ6XG4gICAgIG8ge1xuICAgICBvICAgICB4OiAobnVtYmVyKSB4IGNvb3JkaW5hdGUsXG4gICAgIG8gICAgIHk6IChudW1iZXIpIHkgY29vcmRpbmF0ZSxcbiAgICAgbyAgICAgYWxwaGE6IChudW1iZXIpIGFuZ2xlIG9mIGRlcml2YXRpdmVcbiAgICAgbyB9XG4gICAgXFwqL1xuICAgIGVscHJvdG8uZ2V0UG9pbnRBdExlbmd0aCA9IGZ1bmN0aW9uIChsZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGdldFBvaW50QXRMZW5ndGgodGhpcy5hdHRyKFwiZFwiKSwgbGVuZ3RoKTtcbiAgICB9O1xuICAgIC8vIFNJRVJSQSBFbGVtZW50LmdldFN1YnBhdGgoKTogU2ltaWxhciB0byB0aGUgcHJvYmxlbSBmb3IgRWxlbWVudC5nZXRQb2ludEF0TGVuZ3RoKCkuIFVuY2xlYXIgaG93IHRoaXMgd291bGQgd29yayBmb3IgYSBzZWdtZW50ZWQgcGF0aC4gT3ZlcmFsbCwgdGhlIGNvbmNlcHQgb2YgX3N1YnBhdGhfIGFuZCB3aGF0IEknbSBjYWxsaW5nIGEgX3NlZ21lbnRfIChzZXJpZXMgb2Ygbm9uLV9NXyBvciBfWl8gY29tbWFuZHMpIGlzIHVuY2xlYXIuXG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQuZ2V0U3VicGF0aFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogUmV0dXJucyBzdWJwYXRoIG9mIGEgZ2l2ZW4gZWxlbWVudCBmcm9tIGdpdmVuIHN0YXJ0IGFuZCBlbmQgbGVuZ3RocyAob25seSB3b3JrcyBmb3IgYHBhdGhgIGVsZW1lbnRzKVxuICAgICAqKlxuICAgICAtIGZyb20gKG51bWJlcikgbGVuZ3RoLCBpbiBwaXhlbHMsIGZyb20gdGhlIHN0YXJ0IG9mIHRoZSBwYXRoIHRvIHRoZSBzdGFydCBvZiB0aGUgc2VnbWVudFxuICAgICAtIHRvIChudW1iZXIpIGxlbmd0aCwgaW4gcGl4ZWxzLCBmcm9tIHRoZSBzdGFydCBvZiB0aGUgcGF0aCB0byB0aGUgZW5kIG9mIHRoZSBzZWdtZW50XG4gICAgICoqXG4gICAgID0gKHN0cmluZykgcGF0aCBzdHJpbmcgZGVmaW5pdGlvbiBmb3IgdGhlIHNlZ21lbnRcbiAgICBcXCovXG4gICAgZWxwcm90by5nZXRTdWJwYXRoID0gZnVuY3Rpb24gKGZyb20sIHRvKSB7XG4gICAgICAgIHJldHVybiBTbmFwLnBhdGguZ2V0U3VicGF0aCh0aGlzLmF0dHIoXCJkXCIpLCBmcm9tLCB0byk7XG4gICAgfTtcbiAgICBTbmFwLl8uYm94ID0gYm94O1xuICAgIC8qXFxcbiAgICAgKiBTbmFwLnBhdGguZmluZERvdHNBdFNlZ21lbnRcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFV0aWxpdHkgbWV0aG9kXG4gICAgICoqXG4gICAgICogRmluZHMgZG90IGNvb3JkaW5hdGVzIG9uIHRoZSBnaXZlbiBjdWJpYyBiZXppw6lyIGN1cnZlIGF0IHRoZSBnaXZlbiB0XG4gICAgIC0gcDF4IChudW1iZXIpIHggb2YgdGhlIGZpcnN0IHBvaW50IG9mIHRoZSBjdXJ2ZVxuICAgICAtIHAxeSAobnVtYmVyKSB5IG9mIHRoZSBmaXJzdCBwb2ludCBvZiB0aGUgY3VydmVcbiAgICAgLSBjMXggKG51bWJlcikgeCBvZiB0aGUgZmlyc3QgYW5jaG9yIG9mIHRoZSBjdXJ2ZVxuICAgICAtIGMxeSAobnVtYmVyKSB5IG9mIHRoZSBmaXJzdCBhbmNob3Igb2YgdGhlIGN1cnZlXG4gICAgIC0gYzJ4IChudW1iZXIpIHggb2YgdGhlIHNlY29uZCBhbmNob3Igb2YgdGhlIGN1cnZlXG4gICAgIC0gYzJ5IChudW1iZXIpIHkgb2YgdGhlIHNlY29uZCBhbmNob3Igb2YgdGhlIGN1cnZlXG4gICAgIC0gcDJ4IChudW1iZXIpIHggb2YgdGhlIHNlY29uZCBwb2ludCBvZiB0aGUgY3VydmVcbiAgICAgLSBwMnkgKG51bWJlcikgeSBvZiB0aGUgc2Vjb25kIHBvaW50IG9mIHRoZSBjdXJ2ZVxuICAgICAtIHQgKG51bWJlcikgcG9zaXRpb24gb24gdGhlIGN1cnZlICgwLi4xKVxuICAgICA9IChvYmplY3QpIHBvaW50IGluZm9ybWF0aW9uIGluIGZvcm1hdDpcbiAgICAgbyB7XG4gICAgIG8gICAgIHg6IChudW1iZXIpIHggY29vcmRpbmF0ZSBvZiB0aGUgcG9pbnQsXG4gICAgIG8gICAgIHk6IChudW1iZXIpIHkgY29vcmRpbmF0ZSBvZiB0aGUgcG9pbnQsXG4gICAgIG8gICAgIG06IHtcbiAgICAgbyAgICAgICAgIHg6IChudW1iZXIpIHggY29vcmRpbmF0ZSBvZiB0aGUgbGVmdCBhbmNob3IsXG4gICAgIG8gICAgICAgICB5OiAobnVtYmVyKSB5IGNvb3JkaW5hdGUgb2YgdGhlIGxlZnQgYW5jaG9yXG4gICAgIG8gICAgIH0sXG4gICAgIG8gICAgIG46IHtcbiAgICAgbyAgICAgICAgIHg6IChudW1iZXIpIHggY29vcmRpbmF0ZSBvZiB0aGUgcmlnaHQgYW5jaG9yLFxuICAgICBvICAgICAgICAgeTogKG51bWJlcikgeSBjb29yZGluYXRlIG9mIHRoZSByaWdodCBhbmNob3JcbiAgICAgbyAgICAgfSxcbiAgICAgbyAgICAgc3RhcnQ6IHtcbiAgICAgbyAgICAgICAgIHg6IChudW1iZXIpIHggY29vcmRpbmF0ZSBvZiB0aGUgc3RhcnQgb2YgdGhlIGN1cnZlLFxuICAgICBvICAgICAgICAgeTogKG51bWJlcikgeSBjb29yZGluYXRlIG9mIHRoZSBzdGFydCBvZiB0aGUgY3VydmVcbiAgICAgbyAgICAgfSxcbiAgICAgbyAgICAgZW5kOiB7XG4gICAgIG8gICAgICAgICB4OiAobnVtYmVyKSB4IGNvb3JkaW5hdGUgb2YgdGhlIGVuZCBvZiB0aGUgY3VydmUsXG4gICAgIG8gICAgICAgICB5OiAobnVtYmVyKSB5IGNvb3JkaW5hdGUgb2YgdGhlIGVuZCBvZiB0aGUgY3VydmVcbiAgICAgbyAgICAgfSxcbiAgICAgbyAgICAgYWxwaGE6IChudW1iZXIpIGFuZ2xlIG9mIHRoZSBjdXJ2ZSBkZXJpdmF0aXZlIGF0IHRoZSBwb2ludFxuICAgICBvIH1cbiAgICBcXCovXG4gICAgU25hcC5wYXRoLmZpbmREb3RzQXRTZWdtZW50ID0gZmluZERvdHNBdFNlZ21lbnQ7XG4gICAgLypcXFxuICAgICAqIFNuYXAucGF0aC5iZXppZXJCQm94XG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBVdGlsaXR5IG1ldGhvZFxuICAgICAqKlxuICAgICAqIFJldHVybnMgdGhlIGJvdW5kaW5nIGJveCBvZiBhIGdpdmVuIGN1YmljIGJlemnDqXIgY3VydmVcbiAgICAgLSBwMXggKG51bWJlcikgeCBvZiB0aGUgZmlyc3QgcG9pbnQgb2YgdGhlIGN1cnZlXG4gICAgIC0gcDF5IChudW1iZXIpIHkgb2YgdGhlIGZpcnN0IHBvaW50IG9mIHRoZSBjdXJ2ZVxuICAgICAtIGMxeCAobnVtYmVyKSB4IG9mIHRoZSBmaXJzdCBhbmNob3Igb2YgdGhlIGN1cnZlXG4gICAgIC0gYzF5IChudW1iZXIpIHkgb2YgdGhlIGZpcnN0IGFuY2hvciBvZiB0aGUgY3VydmVcbiAgICAgLSBjMnggKG51bWJlcikgeCBvZiB0aGUgc2Vjb25kIGFuY2hvciBvZiB0aGUgY3VydmVcbiAgICAgLSBjMnkgKG51bWJlcikgeSBvZiB0aGUgc2Vjb25kIGFuY2hvciBvZiB0aGUgY3VydmVcbiAgICAgLSBwMnggKG51bWJlcikgeCBvZiB0aGUgc2Vjb25kIHBvaW50IG9mIHRoZSBjdXJ2ZVxuICAgICAtIHAyeSAobnVtYmVyKSB5IG9mIHRoZSBzZWNvbmQgcG9pbnQgb2YgdGhlIGN1cnZlXG4gICAgICogb3JcbiAgICAgLSBiZXogKGFycmF5KSBhcnJheSBvZiBzaXggcG9pbnRzIGZvciBiZXppw6lyIGN1cnZlXG4gICAgID0gKG9iamVjdCkgYm91bmRpbmcgYm94XG4gICAgIG8ge1xuICAgICBvICAgICB4OiAobnVtYmVyKSB4IGNvb3JkaW5hdGUgb2YgdGhlIGxlZnQgdG9wIHBvaW50IG9mIHRoZSBib3gsXG4gICAgIG8gICAgIHk6IChudW1iZXIpIHkgY29vcmRpbmF0ZSBvZiB0aGUgbGVmdCB0b3AgcG9pbnQgb2YgdGhlIGJveCxcbiAgICAgbyAgICAgeDI6IChudW1iZXIpIHggY29vcmRpbmF0ZSBvZiB0aGUgcmlnaHQgYm90dG9tIHBvaW50IG9mIHRoZSBib3gsXG4gICAgIG8gICAgIHkyOiAobnVtYmVyKSB5IGNvb3JkaW5hdGUgb2YgdGhlIHJpZ2h0IGJvdHRvbSBwb2ludCBvZiB0aGUgYm94LFxuICAgICBvICAgICB3aWR0aDogKG51bWJlcikgd2lkdGggb2YgdGhlIGJveCxcbiAgICAgbyAgICAgaGVpZ2h0OiAobnVtYmVyKSBoZWlnaHQgb2YgdGhlIGJveFxuICAgICBvIH1cbiAgICBcXCovXG4gICAgU25hcC5wYXRoLmJlemllckJCb3ggPSBiZXppZXJCQm94O1xuICAgIC8qXFxcbiAgICAgKiBTbmFwLnBhdGguaXNQb2ludEluc2lkZUJCb3hcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFV0aWxpdHkgbWV0aG9kXG4gICAgICoqXG4gICAgICogUmV0dXJucyBgdHJ1ZWAgaWYgZ2l2ZW4gcG9pbnQgaXMgaW5zaWRlIGJvdW5kaW5nIGJveFxuICAgICAtIGJib3ggKHN0cmluZykgYm91bmRpbmcgYm94XG4gICAgIC0geCAoc3RyaW5nKSB4IGNvb3JkaW5hdGUgb2YgdGhlIHBvaW50XG4gICAgIC0geSAoc3RyaW5nKSB5IGNvb3JkaW5hdGUgb2YgdGhlIHBvaW50XG4gICAgID0gKGJvb2xlYW4pIGB0cnVlYCBpZiBwb2ludCBpcyBpbnNpZGVcbiAgICBcXCovXG4gICAgU25hcC5wYXRoLmlzUG9pbnRJbnNpZGVCQm94ID0gaXNQb2ludEluc2lkZUJCb3g7XG4gICAgLypcXFxuICAgICAqIFNuYXAucGF0aC5pc0JCb3hJbnRlcnNlY3RcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFV0aWxpdHkgbWV0aG9kXG4gICAgICoqXG4gICAgICogUmV0dXJucyBgdHJ1ZWAgaWYgdHdvIGJvdW5kaW5nIGJveGVzIGludGVyc2VjdFxuICAgICAtIGJib3gxIChzdHJpbmcpIGZpcnN0IGJvdW5kaW5nIGJveFxuICAgICAtIGJib3gyIChzdHJpbmcpIHNlY29uZCBib3VuZGluZyBib3hcbiAgICAgPSAoYm9vbGVhbikgYHRydWVgIGlmIGJvdW5kaW5nIGJveGVzIGludGVyc2VjdFxuICAgIFxcKi9cbiAgICBTbmFwLnBhdGguaXNCQm94SW50ZXJzZWN0ID0gaXNCQm94SW50ZXJzZWN0O1xuICAgIC8qXFxcbiAgICAgKiBTbmFwLnBhdGguaW50ZXJzZWN0aW9uXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBVdGlsaXR5IG1ldGhvZFxuICAgICAqKlxuICAgICAqIEZpbmRzIGludGVyc2VjdGlvbnMgb2YgdHdvIHBhdGhzXG4gICAgIC0gcGF0aDEgKHN0cmluZykgcGF0aCBzdHJpbmdcbiAgICAgLSBwYXRoMiAoc3RyaW5nKSBwYXRoIHN0cmluZ1xuICAgICA9IChhcnJheSkgZG90cyBvZiBpbnRlcnNlY3Rpb25cbiAgICAgbyBbXG4gICAgIG8gICAgIHtcbiAgICAgbyAgICAgICAgIHg6IChudW1iZXIpIHggY29vcmRpbmF0ZSBvZiB0aGUgcG9pbnQsXG4gICAgIG8gICAgICAgICB5OiAobnVtYmVyKSB5IGNvb3JkaW5hdGUgb2YgdGhlIHBvaW50LFxuICAgICBvICAgICAgICAgdDE6IChudW1iZXIpIHQgdmFsdWUgZm9yIHNlZ21lbnQgb2YgcGF0aDEsXG4gICAgIG8gICAgICAgICB0MjogKG51bWJlcikgdCB2YWx1ZSBmb3Igc2VnbWVudCBvZiBwYXRoMixcbiAgICAgbyAgICAgICAgIHNlZ21lbnQxOiAobnVtYmVyKSBvcmRlciBudW1iZXIgZm9yIHNlZ21lbnQgb2YgcGF0aDEsXG4gICAgIG8gICAgICAgICBzZWdtZW50MjogKG51bWJlcikgb3JkZXIgbnVtYmVyIGZvciBzZWdtZW50IG9mIHBhdGgyLFxuICAgICBvICAgICAgICAgYmV6MTogKGFycmF5KSBlaWdodCBjb29yZGluYXRlcyByZXByZXNlbnRpbmcgYmV6acOpciBjdXJ2ZSBmb3IgdGhlIHNlZ21lbnQgb2YgcGF0aDEsXG4gICAgIG8gICAgICAgICBiZXoyOiAoYXJyYXkpIGVpZ2h0IGNvb3JkaW5hdGVzIHJlcHJlc2VudGluZyBiZXppw6lyIGN1cnZlIGZvciB0aGUgc2VnbWVudCBvZiBwYXRoMlxuICAgICBvICAgICB9XG4gICAgIG8gXVxuICAgIFxcKi9cbiAgICBTbmFwLnBhdGguaW50ZXJzZWN0aW9uID0gcGF0aEludGVyc2VjdGlvbjtcbiAgICBTbmFwLnBhdGguaW50ZXJzZWN0aW9uTnVtYmVyID0gcGF0aEludGVyc2VjdGlvbk51bWJlcjtcbiAgICAvKlxcXG4gICAgICogU25hcC5wYXRoLmlzUG9pbnRJbnNpZGVcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFV0aWxpdHkgbWV0aG9kXG4gICAgICoqXG4gICAgICogUmV0dXJucyBgdHJ1ZWAgaWYgZ2l2ZW4gcG9pbnQgaXMgaW5zaWRlIGEgZ2l2ZW4gY2xvc2VkIHBhdGguXG4gICAgICpcbiAgICAgKiBOb3RlOiBmaWxsIG1vZGUgZG9lc27igJl0IGFmZmVjdCB0aGUgcmVzdWx0IG9mIHRoaXMgbWV0aG9kLlxuICAgICAtIHBhdGggKHN0cmluZykgcGF0aCBzdHJpbmdcbiAgICAgLSB4IChudW1iZXIpIHggb2YgdGhlIHBvaW50XG4gICAgIC0geSAobnVtYmVyKSB5IG9mIHRoZSBwb2ludFxuICAgICA9IChib29sZWFuKSBgdHJ1ZWAgaWYgcG9pbnQgaXMgaW5zaWRlIHRoZSBwYXRoXG4gICAgXFwqL1xuICAgIFNuYXAucGF0aC5pc1BvaW50SW5zaWRlID0gaXNQb2ludEluc2lkZVBhdGg7XG4gICAgLypcXFxuICAgICAqIFNuYXAucGF0aC5nZXRCQm94XG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBVdGlsaXR5IG1ldGhvZFxuICAgICAqKlxuICAgICAqIFJldHVybnMgdGhlIGJvdW5kaW5nIGJveCBvZiBhIGdpdmVuIHBhdGhcbiAgICAgLSBwYXRoIChzdHJpbmcpIHBhdGggc3RyaW5nXG4gICAgID0gKG9iamVjdCkgYm91bmRpbmcgYm94XG4gICAgIG8ge1xuICAgICBvICAgICB4OiAobnVtYmVyKSB4IGNvb3JkaW5hdGUgb2YgdGhlIGxlZnQgdG9wIHBvaW50IG9mIHRoZSBib3gsXG4gICAgIG8gICAgIHk6IChudW1iZXIpIHkgY29vcmRpbmF0ZSBvZiB0aGUgbGVmdCB0b3AgcG9pbnQgb2YgdGhlIGJveCxcbiAgICAgbyAgICAgeDI6IChudW1iZXIpIHggY29vcmRpbmF0ZSBvZiB0aGUgcmlnaHQgYm90dG9tIHBvaW50IG9mIHRoZSBib3gsXG4gICAgIG8gICAgIHkyOiAobnVtYmVyKSB5IGNvb3JkaW5hdGUgb2YgdGhlIHJpZ2h0IGJvdHRvbSBwb2ludCBvZiB0aGUgYm94LFxuICAgICBvICAgICB3aWR0aDogKG51bWJlcikgd2lkdGggb2YgdGhlIGJveCxcbiAgICAgbyAgICAgaGVpZ2h0OiAobnVtYmVyKSBoZWlnaHQgb2YgdGhlIGJveFxuICAgICBvIH1cbiAgICBcXCovXG4gICAgU25hcC5wYXRoLmdldEJCb3ggPSBwYXRoQkJveDtcbiAgICBTbmFwLnBhdGguZ2V0ID0gZ2V0UGF0aDtcbiAgICAvKlxcXG4gICAgICogU25hcC5wYXRoLnRvUmVsYXRpdmVcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFV0aWxpdHkgbWV0aG9kXG4gICAgICoqXG4gICAgICogQ29udmVydHMgcGF0aCBjb29yZGluYXRlcyBpbnRvIHJlbGF0aXZlIHZhbHVlc1xuICAgICAtIHBhdGggKHN0cmluZykgcGF0aCBzdHJpbmdcbiAgICAgPSAoYXJyYXkpIHBhdGggc3RyaW5nXG4gICAgXFwqL1xuICAgIFNuYXAucGF0aC50b1JlbGF0aXZlID0gcGF0aFRvUmVsYXRpdmU7XG4gICAgLypcXFxuICAgICAqIFNuYXAucGF0aC50b0Fic29sdXRlXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBVdGlsaXR5IG1ldGhvZFxuICAgICAqKlxuICAgICAqIENvbnZlcnRzIHBhdGggY29vcmRpbmF0ZXMgaW50byBhYnNvbHV0ZSB2YWx1ZXNcbiAgICAgLSBwYXRoIChzdHJpbmcpIHBhdGggc3RyaW5nXG4gICAgID0gKGFycmF5KSBwYXRoIHN0cmluZ1xuICAgIFxcKi9cbiAgICBTbmFwLnBhdGgudG9BYnNvbHV0ZSA9IHBhdGhUb0Fic29sdXRlO1xuICAgIC8qXFxcbiAgICAgKiBTbmFwLnBhdGgudG9DdWJpY1xuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogVXRpbGl0eSBtZXRob2RcbiAgICAgKipcbiAgICAgKiBDb252ZXJ0cyBwYXRoIHRvIGEgbmV3IHBhdGggd2hlcmUgYWxsIHNlZ21lbnRzIGFyZSBjdWJpYyBiZXppw6lyIGN1cnZlc1xuICAgICAtIHBhdGhTdHJpbmcgKHN0cmluZ3xhcnJheSkgcGF0aCBzdHJpbmcgb3IgYXJyYXkgb2Ygc2VnbWVudHNcbiAgICAgPSAoYXJyYXkpIGFycmF5IG9mIHNlZ21lbnRzXG4gICAgXFwqL1xuICAgIFNuYXAucGF0aC50b0N1YmljID0gcGF0aDJjdXJ2ZTtcbiAgICAvKlxcXG4gICAgICogU25hcC5wYXRoLm1hcFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogVHJhbnNmb3JtIHRoZSBwYXRoIHN0cmluZyB3aXRoIHRoZSBnaXZlbiBtYXRyaXhcbiAgICAgLSBwYXRoIChzdHJpbmcpIHBhdGggc3RyaW5nXG4gICAgIC0gbWF0cml4IChvYmplY3QpIHNlZSBATWF0cml4XG4gICAgID0gKHN0cmluZykgdHJhbnNmb3JtZWQgcGF0aCBzdHJpbmdcbiAgICBcXCovXG4gICAgU25hcC5wYXRoLm1hcCA9IG1hcFBhdGg7XG4gICAgU25hcC5wYXRoLnRvU3RyaW5nID0gdG9TdHJpbmc7XG4gICAgU25hcC5wYXRoLmNsb25lID0gcGF0aENsb25lO1xufSk7XG4vLyBDb3B5cmlnaHQgKGMpIDIwMTMgQWRvYmUgU3lzdGVtcyBJbmNvcnBvcmF0ZWQuIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4vLyBcbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vIFxuLy8gaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vLyBcbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5TbmFwLnBsdWdpbihmdW5jdGlvbiAoU25hcCwgRWxlbWVudCwgUGFwZXIsIGdsb2IpIHtcbiAgICB2YXIgbW1heCA9IE1hdGgubWF4LFxuICAgICAgICBtbWluID0gTWF0aC5taW47XG5cbiAgICAvLyBTZXRcbiAgICB2YXIgU2V0ID0gZnVuY3Rpb24gKGl0ZW1zKSB7XG4gICAgICAgIHRoaXMuaXRlbXMgPSBbXTtcbiAgICAgICAgdGhpcy5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLnR5cGUgPSBcInNldFwiO1xuICAgICAgICBpZiAoaXRlbXMpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IGl0ZW1zLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoaXRlbXNbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1t0aGlzLml0ZW1zLmxlbmd0aF0gPSB0aGlzLml0ZW1zW3RoaXMuaXRlbXMubGVuZ3RoXSA9IGl0ZW1zW2ldO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxlbmd0aCsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgc2V0cHJvdG8gPSBTZXQucHJvdG90eXBlO1xuICAgIC8qXFxcbiAgICAgKiBTZXQucHVzaFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQWRkcyBlYWNoIGFyZ3VtZW50IHRvIHRoZSBjdXJyZW50IHNldFxuICAgICA9IChvYmplY3QpIG9yaWdpbmFsIGVsZW1lbnRcbiAgICBcXCovXG4gICAgc2V0cHJvdG8ucHVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGl0ZW0sXG4gICAgICAgICAgICBsZW47XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICBpdGVtID0gYXJndW1lbnRzW2ldO1xuICAgICAgICAgICAgaWYgKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICBsZW4gPSB0aGlzLml0ZW1zLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB0aGlzW2xlbl0gPSB0aGlzLml0ZW1zW2xlbl0gPSBpdGVtO1xuICAgICAgICAgICAgICAgIHRoaXMubGVuZ3RoKys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogU2V0LnBvcFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogUmVtb3ZlcyBsYXN0IGVsZW1lbnQgYW5kIHJldHVybnMgaXRcbiAgICAgPSAob2JqZWN0KSBlbGVtZW50XG4gICAgXFwqL1xuICAgIHNldHByb3RvLnBvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5sZW5ndGggJiYgZGVsZXRlIHRoaXNbdGhpcy5sZW5ndGgtLV07XG4gICAgICAgIHJldHVybiB0aGlzLml0ZW1zLnBvcCgpO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIFNldC5mb3JFYWNoXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBFeGVjdXRlcyBnaXZlbiBmdW5jdGlvbiBmb3IgZWFjaCBlbGVtZW50IGluIHRoZSBzZXRcbiAgICAgKlxuICAgICAqIElmIHRoZSBmdW5jdGlvbiByZXR1cm5zIGBmYWxzZWAsIHRoZSBsb29wIHN0b3BzIHJ1bm5pbmcuXG4gICAgICoqXG4gICAgIC0gY2FsbGJhY2sgKGZ1bmN0aW9uKSBmdW5jdGlvbiB0byBydW5cbiAgICAgLSB0aGlzQXJnIChvYmplY3QpIGNvbnRleHQgb2JqZWN0IGZvciB0aGUgY2FsbGJhY2tcbiAgICAgPSAob2JqZWN0KSBTZXQgb2JqZWN0XG4gICAgXFwqL1xuICAgIHNldHByb3RvLmZvckVhY2ggPSBmdW5jdGlvbiAoY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gdGhpcy5pdGVtcy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2suY2FsbCh0aGlzQXJnLCB0aGlzLml0ZW1zW2ldLCBpKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIHNldHByb3RvLnJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2hpbGUgKHRoaXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnBvcCgpLnJlbW92ZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgc2V0cHJvdG8uYXR0ciA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSB0aGlzLml0ZW1zLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuaXRlbXNbaV0uYXR0cih2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogU2V0LmNsZWFyXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZW1vdmVzIGFsbCBlbGVtZW50cyBmcm9tIHRoZSBzZXRcbiAgICBcXCovXG4gICAgc2V0cHJvdG8uY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdoaWxlICh0aGlzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5wb3AoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgLypcXFxuICAgICAqIFNldC5zcGxpY2VcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJlbW92ZXMgcmFuZ2Ugb2YgZWxlbWVudHMgZnJvbSB0aGUgc2V0XG4gICAgICoqXG4gICAgIC0gaW5kZXggKG51bWJlcikgcG9zaXRpb24gb2YgdGhlIGRlbGV0aW9uXG4gICAgIC0gY291bnQgKG51bWJlcikgbnVtYmVyIG9mIGVsZW1lbnQgdG8gcmVtb3ZlXG4gICAgIC0gaW5zZXJ0aW9u4oCmIChvYmplY3QpICNvcHRpb25hbCBlbGVtZW50cyB0byBpbnNlcnRcbiAgICAgPSAob2JqZWN0KSBzZXQgZWxlbWVudHMgdGhhdCB3ZXJlIGRlbGV0ZWRcbiAgICBcXCovXG4gICAgc2V0cHJvdG8uc3BsaWNlID0gZnVuY3Rpb24gKGluZGV4LCBjb3VudCwgaW5zZXJ0aW9uKSB7XG4gICAgICAgIGluZGV4ID0gaW5kZXggPCAwID8gbW1heCh0aGlzLmxlbmd0aCArIGluZGV4LCAwKSA6IGluZGV4O1xuICAgICAgICBjb3VudCA9IG1tYXgoMCwgbW1pbih0aGlzLmxlbmd0aCAtIGluZGV4LCBjb3VudCkpO1xuICAgICAgICB2YXIgdGFpbCA9IFtdLFxuICAgICAgICAgICAgdG9kZWwgPSBbXSxcbiAgICAgICAgICAgIGFyZ3MgPSBbXSxcbiAgICAgICAgICAgIGk7XG4gICAgICAgIGZvciAoaSA9IDI7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3MucHVzaChhcmd1bWVudHNbaV0pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICAgICAgICB0b2RlbC5wdXNoKHRoaXNbaW5kZXggKyBpXSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICg7IGkgPCB0aGlzLmxlbmd0aCAtIGluZGV4OyBpKyspIHtcbiAgICAgICAgICAgIHRhaWwucHVzaCh0aGlzW2luZGV4ICsgaV0pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBhcmdsZW4gPSBhcmdzLmxlbmd0aDtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGFyZ2xlbiArIHRhaWwubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuaXRlbXNbaW5kZXggKyBpXSA9IHRoaXNbaW5kZXggKyBpXSA9IGkgPCBhcmdsZW4gPyBhcmdzW2ldIDogdGFpbFtpIC0gYXJnbGVuXTtcbiAgICAgICAgfVxuICAgICAgICBpID0gdGhpcy5pdGVtcy5sZW5ndGggPSB0aGlzLmxlbmd0aCAtPSBjb3VudCAtIGFyZ2xlbjtcbiAgICAgICAgd2hpbGUgKHRoaXNbaV0pIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzW2krK107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBTZXQodG9kZWwpO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIFNldC5leGNsdWRlXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZW1vdmVzIGdpdmVuIGVsZW1lbnQgZnJvbSB0aGUgc2V0XG4gICAgICoqXG4gICAgIC0gZWxlbWVudCAob2JqZWN0KSBlbGVtZW50IHRvIHJlbW92ZVxuICAgICA9IChib29sZWFuKSBgdHJ1ZWAgaWYgb2JqZWN0IHdhcyBmb3VuZCBhbmQgcmVtb3ZlZCBmcm9tIHRoZSBzZXRcbiAgICBcXCovXG4gICAgc2V0cHJvdG8uZXhjbHVkZSA9IGZ1bmN0aW9uIChlbCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSB0aGlzLmxlbmd0aDsgaSA8IGlpOyBpKyspIGlmICh0aGlzW2ldID09IGVsKSB7XG4gICAgICAgICAgICB0aGlzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICAgIHNldHByb3RvLmluc2VydEFmdGVyID0gZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgIHZhciBpID0gdGhpcy5pdGVtcy5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgIHRoaXMuaXRlbXNbaV0uaW5zZXJ0QWZ0ZXIoZWwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgc2V0cHJvdG8uZ2V0QkJveCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHggPSBbXSxcbiAgICAgICAgICAgIHkgPSBbXSxcbiAgICAgICAgICAgIHgyID0gW10sXG4gICAgICAgICAgICB5MiA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gdGhpcy5pdGVtcy5sZW5ndGg7IGktLTspIGlmICghdGhpcy5pdGVtc1tpXS5yZW1vdmVkKSB7XG4gICAgICAgICAgICB2YXIgYm94ID0gdGhpcy5pdGVtc1tpXS5nZXRCQm94KCk7XG4gICAgICAgICAgICB4LnB1c2goYm94LngpO1xuICAgICAgICAgICAgeS5wdXNoKGJveC55KTtcbiAgICAgICAgICAgIHgyLnB1c2goYm94LnggKyBib3gud2lkdGgpO1xuICAgICAgICAgICAgeTIucHVzaChib3gueSArIGJveC5oZWlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIHggPSBtbWluLmFwcGx5KDAsIHgpO1xuICAgICAgICB5ID0gbW1pbi5hcHBseSgwLCB5KTtcbiAgICAgICAgeDIgPSBtbWF4LmFwcGx5KDAsIHgyKTtcbiAgICAgICAgeTIgPSBtbWF4LmFwcGx5KDAsIHkyKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IHgsXG4gICAgICAgICAgICB5OiB5LFxuICAgICAgICAgICAgeDI6IHgyLFxuICAgICAgICAgICAgeTI6IHkyLFxuICAgICAgICAgICAgd2lkdGg6IHgyIC0geCxcbiAgICAgICAgICAgIGhlaWdodDogeTIgLSB5LFxuICAgICAgICAgICAgY3g6IHggKyAoeDIgLSB4KSAvIDIsXG4gICAgICAgICAgICBjeTogeSArICh5MiAtIHkpIC8gMlxuICAgICAgICB9O1xuICAgIH07XG4gICAgc2V0cHJvdG8uY2xvbmUgPSBmdW5jdGlvbiAocykge1xuICAgICAgICBzID0gbmV3IFNldDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gdGhpcy5pdGVtcy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICBzLnB1c2godGhpcy5pdGVtc1tpXS5jbG9uZSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcztcbiAgICB9O1xuICAgIHNldHByb3RvLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gXCJTbmFwXFx1MjAxOHMgc2V0XCI7XG4gICAgfTtcbiAgICBzZXRwcm90by50eXBlID0gXCJzZXRcIjtcbiAgICAvLyBleHBvcnRcbiAgICBTbmFwLnNldCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHNldCA9IG5ldyBTZXQ7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBzZXQucHVzaC5hcHBseShzZXQsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzZXQ7XG4gICAgfTtcbn0pO1xuLy8gQ29weXJpZ2h0IChjKSAyMDEzIEFkb2JlIFN5c3RlbXMgSW5jb3Jwb3JhdGVkLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLyBcbi8vIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8gXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuU25hcC5wbHVnaW4oZnVuY3Rpb24gKFNuYXAsIEVsZW1lbnQsIFBhcGVyLCBnbG9iKSB7XG4gICAgdmFyIG5hbWVzID0ge30sXG4gICAgICAgIHJlVW5pdCA9IC9bYS16XSskL2ksXG4gICAgICAgIFN0ciA9IFN0cmluZztcbiAgICBuYW1lcy5zdHJva2UgPSBuYW1lcy5maWxsID0gXCJjb2xvdXJcIjtcbiAgICBmdW5jdGlvbiBnZXRFbXB0eShpdGVtKSB7XG4gICAgICAgIHZhciBsID0gaXRlbVswXTtcbiAgICAgICAgc3dpdGNoIChsLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICAgIGNhc2UgXCJ0XCI6IHJldHVybiBbbCwgMCwgMF07XG4gICAgICAgICAgICBjYXNlIFwibVwiOiByZXR1cm4gW2wsIDEsIDAsIDAsIDEsIDAsIDBdO1xuICAgICAgICAgICAgY2FzZSBcInJcIjogaWYgKGl0ZW0ubGVuZ3RoID09IDQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2wsIDAsIGl0ZW1bMl0sIGl0ZW1bM11dO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2wsIDBdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FzZSBcInNcIjogaWYgKGl0ZW0ubGVuZ3RoID09IDUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW2wsIDEsIDEsIGl0ZW1bM10sIGl0ZW1bNF1dO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLmxlbmd0aCA9PSAzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtsLCAxLCAxXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFtsLCAxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBlcXVhbGlzZVRyYW5zZm9ybSh0MSwgdDIsIGdldEJCb3gpIHtcbiAgICAgICAgdDIgPSBTdHIodDIpLnJlcGxhY2UoL1xcLnszfXxcXHUyMDI2L2csIHQxKTtcbiAgICAgICAgdDEgPSBTbmFwLnBhcnNlVHJhbnNmb3JtU3RyaW5nKHQxKSB8fCBbXTtcbiAgICAgICAgdDIgPSBTbmFwLnBhcnNlVHJhbnNmb3JtU3RyaW5nKHQyKSB8fCBbXTtcbiAgICAgICAgdmFyIG1heGxlbmd0aCA9IE1hdGgubWF4KHQxLmxlbmd0aCwgdDIubGVuZ3RoKSxcbiAgICAgICAgICAgIGZyb20gPSBbXSxcbiAgICAgICAgICAgIHRvID0gW10sXG4gICAgICAgICAgICBpID0gMCwgaiwgamosXG4gICAgICAgICAgICB0dDEsIHR0MjtcbiAgICAgICAgZm9yICg7IGkgPCBtYXhsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdHQxID0gdDFbaV0gfHwgZ2V0RW1wdHkodDJbaV0pO1xuICAgICAgICAgICAgdHQyID0gdDJbaV0gfHwgZ2V0RW1wdHkodHQxKTtcbiAgICAgICAgICAgIGlmICgodHQxWzBdICE9IHR0MlswXSkgfHxcbiAgICAgICAgICAgICAgICAodHQxWzBdLnRvTG93ZXJDYXNlKCkgPT0gXCJyXCIgJiYgKHR0MVsyXSAhPSB0dDJbMl0gfHwgdHQxWzNdICE9IHR0MlszXSkpIHx8XG4gICAgICAgICAgICAgICAgKHR0MVswXS50b0xvd2VyQ2FzZSgpID09IFwic1wiICYmICh0dDFbM10gIT0gdHQyWzNdIHx8IHR0MVs0XSAhPSB0dDJbNF0pKVxuICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICB0MSA9IFNuYXAuXy50cmFuc2Zvcm0ybWF0cml4KHQxLCBnZXRCQm94KCkpO1xuICAgICAgICAgICAgICAgICAgICB0MiA9IFNuYXAuXy50cmFuc2Zvcm0ybWF0cml4KHQyLCBnZXRCQm94KCkpO1xuICAgICAgICAgICAgICAgICAgICBmcm9tID0gW1tcIm1cIiwgdDEuYSwgdDEuYiwgdDEuYywgdDEuZCwgdDEuZSwgdDEuZl1dO1xuICAgICAgICAgICAgICAgICAgICB0byA9IFtbXCJtXCIsIHQyLmEsIHQyLmIsIHQyLmMsIHQyLmQsIHQyLmUsIHQyLmZdXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmcm9tW2ldID0gW107XG4gICAgICAgICAgICB0b1tpXSA9IFtdO1xuICAgICAgICAgICAgZm9yIChqID0gMCwgamogPSBNYXRoLm1heCh0dDEubGVuZ3RoLCB0dDIubGVuZ3RoKTsgaiA8IGpqOyBqKyspIHtcbiAgICAgICAgICAgICAgICBqIGluIHR0MSAmJiAoZnJvbVtpXVtqXSA9IHR0MVtqXSk7XG4gICAgICAgICAgICAgICAgaiBpbiB0dDIgJiYgKHRvW2ldW2pdID0gdHQyW2pdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZnJvbTogcGF0aDJhcnJheShmcm9tKSxcbiAgICAgICAgICAgIHRvOiBwYXRoMmFycmF5KHRvKSxcbiAgICAgICAgICAgIGY6IGdldFBhdGgoZnJvbSlcbiAgICAgICAgfTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2V0TnVtYmVyKHZhbCkge1xuICAgICAgICByZXR1cm4gdmFsO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRVbml0KHVuaXQpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh2YWwpIHtcbiAgICAgICAgICAgIHJldHVybiArdmFsLnRvRml4ZWQoMykgKyB1bml0O1xuICAgICAgICB9O1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRDb2xvdXIoY2xyKSB7XG4gICAgICAgIHJldHVybiBTbmFwLnJnYihjbHJbMF0sIGNsclsxXSwgY2xyWzJdKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2V0UGF0aChwYXRoKSB7XG4gICAgICAgIHZhciBrID0gMCwgaSwgaWksIGosIGpqLCBvdXQsIGEsIGIgPSBbXTtcbiAgICAgICAgZm9yIChpID0gMCwgaWkgPSBwYXRoLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIG91dCA9IFwiW1wiO1xuICAgICAgICAgICAgYSA9IFsnXCInICsgcGF0aFtpXVswXSArICdcIiddO1xuICAgICAgICAgICAgZm9yIChqID0gMSwgamogPSBwYXRoW2ldLmxlbmd0aDsgaiA8IGpqOyBqKyspIHtcbiAgICAgICAgICAgICAgICBhW2pdID0gXCJ2YWxbXCIgKyAoaysrKSArIFwiXVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3V0ICs9IGEgKyBcIl1cIjtcbiAgICAgICAgICAgIGJbaV0gPSBvdXQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIEZ1bmN0aW9uKFwidmFsXCIsIFwicmV0dXJuIFNuYXAucGF0aC50b1N0cmluZy5jYWxsKFtcIiArIGIgKyBcIl0pXCIpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBwYXRoMmFycmF5KHBhdGgpIHtcbiAgICAgICAgdmFyIG91dCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBwYXRoLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAxLCBqaiA9IHBhdGhbaV0ubGVuZ3RoOyBqIDwgamo7IGorKykge1xuICAgICAgICAgICAgICAgIG91dC5wdXNoKHBhdGhbaV1bal0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfVxuICAgIEVsZW1lbnQucHJvdG90eXBlLmVxdWFsID0gZnVuY3Rpb24gKG5hbWUsIGIpIHtcbiAgICAgICAgdmFyIEEsIEIsIGEgPSBTdHIodGhpcy5hdHRyKG5hbWUpIHx8IFwiXCIpLFxuICAgICAgICAgICAgZWwgPSB0aGlzO1xuICAgICAgICBpZiAoYSA9PSArYSAmJiBiID09ICtiKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGZyb206ICthLFxuICAgICAgICAgICAgICAgIHRvOiArYixcbiAgICAgICAgICAgICAgICBmOiBnZXROdW1iZXJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5hbWVzW25hbWVdID09IFwiY29sb3VyXCIpIHtcbiAgICAgICAgICAgIEEgPSBTbmFwLmNvbG9yKGEpO1xuICAgICAgICAgICAgQiA9IFNuYXAuY29sb3IoYik7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGZyb206IFtBLnIsIEEuZywgQS5iLCBBLm9wYWNpdHldLFxuICAgICAgICAgICAgICAgIHRvOiBbQi5yLCBCLmcsIEIuYiwgQi5vcGFjaXR5XSxcbiAgICAgICAgICAgICAgICBmOiBnZXRDb2xvdXJcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5hbWUgPT0gXCJ0cmFuc2Zvcm1cIiB8fCBuYW1lID09IFwiZ3JhZGllbnRUcmFuc2Zvcm1cIiB8fCBuYW1lID09IFwicGF0dGVyblRyYW5zZm9ybVwiKSB7XG4gICAgICAgICAgICBpZiAoYiBpbnN0YW5jZW9mIFNuYXAuTWF0cml4KSB7XG4gICAgICAgICAgICAgICAgYiA9IGIudG9UcmFuc2Zvcm1TdHJpbmcoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghU25hcC5fLnJnVHJhbnNmb3JtLnRlc3QoYikpIHtcbiAgICAgICAgICAgICAgICBiID0gU25hcC5fLnN2Z1RyYW5zZm9ybTJzdHJpbmcoYik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZXF1YWxpc2VUcmFuc2Zvcm0oYSwgYiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBlbC5nZXRCQm94KDEpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5hbWUgPT0gXCJkXCIgfHwgbmFtZSA9PSBcInBhdGhcIikge1xuICAgICAgICAgICAgQSA9IFNuYXAucGF0aC50b0N1YmljKGEsIGIpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBmcm9tOiBwYXRoMmFycmF5KEFbMF0pLFxuICAgICAgICAgICAgICAgIHRvOiBwYXRoMmFycmF5KEFbMV0pLFxuICAgICAgICAgICAgICAgIGY6IGdldFBhdGgoQVswXSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5hbWUgPT0gXCJwb2ludHNcIikge1xuICAgICAgICAgICAgQSA9IFN0cihhKS5zcGxpdChcIixcIik7XG4gICAgICAgICAgICBCID0gU3RyKGIpLnNwbGl0KFwiLFwiKTtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgZnJvbTogQSxcbiAgICAgICAgICAgICAgICB0bzogQixcbiAgICAgICAgICAgICAgICBmOiBmdW5jdGlvbiAodmFsKSB7IHJldHVybiB2YWw7IH1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGFVbml0ID0gYS5tYXRjaChyZVVuaXQpLFxuICAgICAgICAgICAgYlVuaXQgPSBTdHIoYikubWF0Y2gocmVVbml0KTtcbiAgICAgICAgaWYgKGFVbml0ICYmIGFVbml0ID09IGJVbml0KSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGZyb206IHBhcnNlRmxvYXQoYSksXG4gICAgICAgICAgICAgICAgdG86IHBhcnNlRmxvYXQoYiksXG4gICAgICAgICAgICAgICAgZjogZ2V0VW5pdChhVW5pdClcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGZyb206IHRoaXMuYXNQWChuYW1lKSxcbiAgICAgICAgICAgICAgICB0bzogdGhpcy5hc1BYKG5hbWUsIGIpLFxuICAgICAgICAgICAgICAgIGY6IGdldE51bWJlclxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH07XG59KTtcbi8vIENvcHlyaWdodCAoYykgMjAxMyBBZG9iZSBTeXN0ZW1zIEluY29ycG9yYXRlZC4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cbi8vIFxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy8gXG4vLyBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vIFxuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblNuYXAucGx1Z2luKGZ1bmN0aW9uIChTbmFwLCBFbGVtZW50LCBQYXBlciwgZ2xvYikge1xuICAgIHZhciBlbHByb3RvID0gRWxlbWVudC5wcm90b3R5cGUsXG4gICAgaGFzID0gXCJoYXNPd25Qcm9wZXJ0eVwiLFxuICAgIHN1cHBvcnRzVG91Y2ggPSBcImNyZWF0ZVRvdWNoXCIgaW4gZ2xvYi5kb2MsXG4gICAgZXZlbnRzID0gW1xuICAgICAgICBcImNsaWNrXCIsIFwiZGJsY2xpY2tcIiwgXCJtb3VzZWRvd25cIiwgXCJtb3VzZW1vdmVcIiwgXCJtb3VzZW91dFwiLFxuICAgICAgICBcIm1vdXNlb3ZlclwiLCBcIm1vdXNldXBcIiwgXCJ0b3VjaHN0YXJ0XCIsIFwidG91Y2htb3ZlXCIsIFwidG91Y2hlbmRcIixcbiAgICAgICAgXCJ0b3VjaGNhbmNlbFwiXG4gICAgXSxcbiAgICB0b3VjaE1hcCA9IHtcbiAgICAgICAgbW91c2Vkb3duOiBcInRvdWNoc3RhcnRcIixcbiAgICAgICAgbW91c2Vtb3ZlOiBcInRvdWNobW92ZVwiLFxuICAgICAgICBtb3VzZXVwOiBcInRvdWNoZW5kXCJcbiAgICB9LFxuICAgIGdldFNjcm9sbCA9IGZ1bmN0aW9uICh4eSkge1xuICAgICAgICB2YXIgbmFtZSA9IHh5ID09IFwieVwiID8gXCJzY3JvbGxUb3BcIiA6IFwic2Nyb2xsTGVmdFwiO1xuICAgICAgICByZXR1cm4gZ2xvYi5kb2MuZG9jdW1lbnRFbGVtZW50W25hbWVdIHx8IGdsb2IuZG9jLmJvZHlbbmFtZV07XG4gICAgfSxcbiAgICBwcmV2ZW50RGVmYXVsdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xuICAgIH0sXG4gICAgcHJldmVudFRvdWNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vcmlnaW5hbEV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfSxcbiAgICBzdG9wUHJvcGFnYXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuY2FuY2VsQnViYmxlID0gdHJ1ZTtcbiAgICB9LFxuICAgIHN0b3BUb3VjaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3JpZ2luYWxFdmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9LFxuICAgIGFkZEV2ZW50ID0gKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGdsb2IuZG9jLmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAob2JqLCB0eXBlLCBmbiwgZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIHZhciByZWFsTmFtZSA9IHN1cHBvcnRzVG91Y2ggJiYgdG91Y2hNYXBbdHlwZV0gPyB0b3VjaE1hcFt0eXBlXSA6IHR5cGUsXG4gICAgICAgICAgICAgICAgICAgIGYgPSBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2Nyb2xsWSA9IGdldFNjcm9sbChcInlcIiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsWCA9IGdldFNjcm9sbChcInhcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3VwcG9ydHNUb3VjaCAmJiB0b3VjaE1hcFtoYXNdKHR5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBlLnRhcmdldFRvdWNoZXMgJiYgZS50YXJnZXRUb3VjaGVzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXRUb3VjaGVzW2ldLnRhcmdldCA9PSBvYmogfHwgb2JqLmNvbnRhaW5zKGUudGFyZ2V0VG91Y2hlc1tpXS50YXJnZXQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbGRlID0gZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUgPSBlLnRhcmdldFRvdWNoZXNbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLm9yaWdpbmFsRXZlbnQgPSBvbGRlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCA9IHByZXZlbnRUb3VjaDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uID0gc3RvcFRvdWNoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgeCA9IGUuY2xpZW50WCArIHNjcm9sbFgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeSA9IGUuY2xpZW50WSArIHNjcm9sbFk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm4uY2FsbChlbGVtZW50LCBlLCB4LCB5KTtcclxuICAgICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgICAgaWYgKHR5cGUgIT09IHJlYWxOYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb2JqLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZiwgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgb2JqLmFkZEV2ZW50TGlzdGVuZXIocmVhbE5hbWUsIGYsIGZhbHNlKTtcblxuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlICE9PSByZWFsTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmoucmVtb3ZlRXZlbnRMaXN0ZW5lcih0eXBlLCBmLCBmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIG9iai5yZW1vdmVFdmVudExpc3RlbmVyKHJlYWxOYW1lLCBmLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKGdsb2IuZG9jLmF0dGFjaEV2ZW50KSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKG9iaiwgdHlwZSwgZm4sIGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgZiA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIGUgPSBlIHx8IGdsb2Iud2luLmV2ZW50O1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2Nyb2xsWSA9IGdldFNjcm9sbChcInlcIiksXG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxYID0gZ2V0U2Nyb2xsKFwieFwiKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHggPSBlLmNsaWVudFggKyBzY3JvbGxYLFxuICAgICAgICAgICAgICAgICAgICAgICAgeSA9IGUuY2xpZW50WSArIHNjcm9sbFk7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQgPSBlLnByZXZlbnREZWZhdWx0IHx8IHByZXZlbnREZWZhdWx0O1xuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbiA9IGUuc3RvcFByb3BhZ2F0aW9uIHx8IHN0b3BQcm9wYWdhdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZuLmNhbGwoZWxlbWVudCwgZSwgeCwgeSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBvYmouYXR0YWNoRXZlbnQoXCJvblwiICsgdHlwZSwgZik7XG4gICAgICAgICAgICAgICAgdmFyIGRldGFjaGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBvYmouZGV0YWNoRXZlbnQoXCJvblwiICsgdHlwZSwgZik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRldGFjaGVyO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH0pKCksXG4gICAgZHJhZyA9IFtdLFxuICAgIGRyYWdNb3ZlID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgdmFyIHggPSBlLmNsaWVudFgsXG4gICAgICAgICAgICB5ID0gZS5jbGllbnRZLFxuICAgICAgICAgICAgc2Nyb2xsWSA9IGdldFNjcm9sbChcInlcIiksXG4gICAgICAgICAgICBzY3JvbGxYID0gZ2V0U2Nyb2xsKFwieFwiKSxcbiAgICAgICAgICAgIGRyYWdpLFxuICAgICAgICAgICAgaiA9IGRyYWcubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoai0tKSB7XG4gICAgICAgICAgICBkcmFnaSA9IGRyYWdbal07XG4gICAgICAgICAgICBpZiAoc3VwcG9ydHNUb3VjaCkge1xuICAgICAgICAgICAgICAgIHZhciBpID0gZS50b3VjaGVzICYmIGUudG91Y2hlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHRvdWNoO1xuICAgICAgICAgICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgdG91Y2ggPSBlLnRvdWNoZXNbaV07XG4gICAgICAgICAgICAgICAgICAgIGlmICh0b3VjaC5pZGVudGlmaWVyID09IGRyYWdpLmVsLl9kcmFnLmlkIHx8IGRyYWdpLmVsLm5vZGUuY29udGFpbnModG91Y2gudGFyZ2V0KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgeCA9IHRvdWNoLmNsaWVudFg7XG4gICAgICAgICAgICAgICAgICAgICAgICB5ID0gdG91Y2guY2xpZW50WTtcbiAgICAgICAgICAgICAgICAgICAgICAgIChlLm9yaWdpbmFsRXZlbnQgPyBlLm9yaWdpbmFsRXZlbnQgOiBlKS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBub2RlID0gZHJhZ2kuZWwubm9kZSxcbiAgICAgICAgICAgICAgICBvLFxuICAgICAgICAgICAgICAgIGdsb2IgPSBTbmFwLl8uZ2xvYixcbiAgICAgICAgICAgICAgICBuZXh0ID0gbm9kZS5uZXh0U2libGluZyxcbiAgICAgICAgICAgICAgICBwYXJlbnQgPSBub2RlLnBhcmVudE5vZGUsXG4gICAgICAgICAgICAgICAgZGlzcGxheSA9IG5vZGUuc3R5bGUuZGlzcGxheTtcbiAgICAgICAgICAgIC8vIGdsb2Iud2luLm9wZXJhICYmIHBhcmVudC5yZW1vdmVDaGlsZChub2RlKTtcbiAgICAgICAgICAgIC8vIG5vZGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICAgICAgLy8gbyA9IGRyYWdpLmVsLnBhcGVyLmdldEVsZW1lbnRCeVBvaW50KHgsIHkpO1xuICAgICAgICAgICAgLy8gbm9kZS5zdHlsZS5kaXNwbGF5ID0gZGlzcGxheTtcbiAgICAgICAgICAgIC8vIGdsb2Iud2luLm9wZXJhICYmIChuZXh0ID8gcGFyZW50Lmluc2VydEJlZm9yZShub2RlLCBuZXh0KSA6IHBhcmVudC5hcHBlbmRDaGlsZChub2RlKSk7XG4gICAgICAgICAgICAvLyBvICYmIGV2ZShcInNuYXAuZHJhZy5vdmVyLlwiICsgZHJhZ2kuZWwuaWQsIGRyYWdpLmVsLCBvKTtcbiAgICAgICAgICAgIHggKz0gc2Nyb2xsWDtcbiAgICAgICAgICAgIHkgKz0gc2Nyb2xsWTtcbiAgICAgICAgICAgIGV2ZShcInNuYXAuZHJhZy5tb3ZlLlwiICsgZHJhZ2kuZWwuaWQsIGRyYWdpLm1vdmVfc2NvcGUgfHwgZHJhZ2kuZWwsIHggLSBkcmFnaS5lbC5fZHJhZy54LCB5IC0gZHJhZ2kuZWwuX2RyYWcueSwgeCwgeSwgZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGRyYWdVcCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIFNuYXAudW5tb3VzZW1vdmUoZHJhZ01vdmUpLnVubW91c2V1cChkcmFnVXApO1xuICAgICAgICB2YXIgaSA9IGRyYWcubGVuZ3RoLFxuICAgICAgICAgICAgZHJhZ2k7XG4gICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgIGRyYWdpID0gZHJhZ1tpXTtcbiAgICAgICAgICAgIGRyYWdpLmVsLl9kcmFnID0ge307XG4gICAgICAgICAgICBldmUoXCJzbmFwLmRyYWcuZW5kLlwiICsgZHJhZ2kuZWwuaWQsIGRyYWdpLmVuZF9zY29wZSB8fCBkcmFnaS5zdGFydF9zY29wZSB8fCBkcmFnaS5tb3ZlX3Njb3BlIHx8IGRyYWdpLmVsLCBlKTtcbiAgICAgICAgfVxuICAgICAgICBkcmFnID0gW107XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogRWxlbWVudC5jbGlja1xuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQWRkcyBhIGNsaWNrIGV2ZW50IGhhbmRsZXIgdG8gdGhlIGVsZW1lbnRcbiAgICAgLSBoYW5kbGVyIChmdW5jdGlvbikgaGFuZGxlciBmb3IgdGhlIGV2ZW50XG4gICAgID0gKG9iamVjdCkgQEVsZW1lbnRcbiAgICBcXCovXG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQudW5jbGlja1xuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogUmVtb3ZlcyBhIGNsaWNrIGV2ZW50IGhhbmRsZXIgZnJvbSB0aGUgZWxlbWVudFxuICAgICAtIGhhbmRsZXIgKGZ1bmN0aW9uKSBoYW5kbGVyIGZvciB0aGUgZXZlbnRcbiAgICAgPSAob2JqZWN0KSBARWxlbWVudFxuICAgIFxcKi9cbiAgICBcbiAgICAvKlxcXG4gICAgICogRWxlbWVudC5kYmxjbGlja1xuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQWRkcyBhIGRvdWJsZSBjbGljayBldmVudCBoYW5kbGVyIHRvIHRoZSBlbGVtZW50XG4gICAgIC0gaGFuZGxlciAoZnVuY3Rpb24pIGhhbmRsZXIgZm9yIHRoZSBldmVudFxuICAgICA9IChvYmplY3QpIEBFbGVtZW50XG4gICAgXFwqL1xuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LnVuZGJsY2xpY2tcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJlbW92ZXMgYSBkb3VibGUgY2xpY2sgZXZlbnQgaGFuZGxlciBmcm9tIHRoZSBlbGVtZW50XG4gICAgIC0gaGFuZGxlciAoZnVuY3Rpb24pIGhhbmRsZXIgZm9yIHRoZSBldmVudFxuICAgICA9IChvYmplY3QpIEBFbGVtZW50XG4gICAgXFwqL1xuICAgIFxuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50Lm1vdXNlZG93blxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQWRkcyBhIG1vdXNlZG93biBldmVudCBoYW5kbGVyIHRvIHRoZSBlbGVtZW50XG4gICAgIC0gaGFuZGxlciAoZnVuY3Rpb24pIGhhbmRsZXIgZm9yIHRoZSBldmVudFxuICAgICA9IChvYmplY3QpIEBFbGVtZW50XG4gICAgXFwqL1xuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LnVubW91c2Vkb3duXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZW1vdmVzIGEgbW91c2Vkb3duIGV2ZW50IGhhbmRsZXIgZnJvbSB0aGUgZWxlbWVudFxuICAgICAtIGhhbmRsZXIgKGZ1bmN0aW9uKSBoYW5kbGVyIGZvciB0aGUgZXZlbnRcbiAgICAgPSAob2JqZWN0KSBARWxlbWVudFxuICAgIFxcKi9cbiAgICBcbiAgICAvKlxcXG4gICAgICogRWxlbWVudC5tb3VzZW1vdmVcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIEFkZHMgYSBtb3VzZW1vdmUgZXZlbnQgaGFuZGxlciB0byB0aGUgZWxlbWVudFxuICAgICAtIGhhbmRsZXIgKGZ1bmN0aW9uKSBoYW5kbGVyIGZvciB0aGUgZXZlbnRcbiAgICAgPSAob2JqZWN0KSBARWxlbWVudFxuICAgIFxcKi9cbiAgICAvKlxcXG4gICAgICogRWxlbWVudC51bm1vdXNlbW92ZVxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogUmVtb3ZlcyBhIG1vdXNlbW92ZSBldmVudCBoYW5kbGVyIGZyb20gdGhlIGVsZW1lbnRcbiAgICAgLSBoYW5kbGVyIChmdW5jdGlvbikgaGFuZGxlciBmb3IgdGhlIGV2ZW50XG4gICAgID0gKG9iamVjdCkgQEVsZW1lbnRcbiAgICBcXCovXG4gICAgXG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQubW91c2VvdXRcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIEFkZHMgYSBtb3VzZW91dCBldmVudCBoYW5kbGVyIHRvIHRoZSBlbGVtZW50XG4gICAgIC0gaGFuZGxlciAoZnVuY3Rpb24pIGhhbmRsZXIgZm9yIHRoZSBldmVudFxuICAgICA9IChvYmplY3QpIEBFbGVtZW50XG4gICAgXFwqL1xuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LnVubW91c2VvdXRcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJlbW92ZXMgYSBtb3VzZW91dCBldmVudCBoYW5kbGVyIGZyb20gdGhlIGVsZW1lbnRcbiAgICAgLSBoYW5kbGVyIChmdW5jdGlvbikgaGFuZGxlciBmb3IgdGhlIGV2ZW50XG4gICAgID0gKG9iamVjdCkgQEVsZW1lbnRcbiAgICBcXCovXG4gICAgXG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQubW91c2VvdmVyXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBBZGRzIGEgbW91c2VvdmVyIGV2ZW50IGhhbmRsZXIgdG8gdGhlIGVsZW1lbnRcbiAgICAgLSBoYW5kbGVyIChmdW5jdGlvbikgaGFuZGxlciBmb3IgdGhlIGV2ZW50XG4gICAgID0gKG9iamVjdCkgQEVsZW1lbnRcbiAgICBcXCovXG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQudW5tb3VzZW92ZXJcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJlbW92ZXMgYSBtb3VzZW92ZXIgZXZlbnQgaGFuZGxlciBmcm9tIHRoZSBlbGVtZW50XG4gICAgIC0gaGFuZGxlciAoZnVuY3Rpb24pIGhhbmRsZXIgZm9yIHRoZSBldmVudFxuICAgICA9IChvYmplY3QpIEBFbGVtZW50XG4gICAgXFwqL1xuICAgIFxuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50Lm1vdXNldXBcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIEFkZHMgYSBtb3VzZXVwIGV2ZW50IGhhbmRsZXIgdG8gdGhlIGVsZW1lbnRcbiAgICAgLSBoYW5kbGVyIChmdW5jdGlvbikgaGFuZGxlciBmb3IgdGhlIGV2ZW50XG4gICAgID0gKG9iamVjdCkgQEVsZW1lbnRcbiAgICBcXCovXG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQudW5tb3VzZXVwXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZW1vdmVzIGEgbW91c2V1cCBldmVudCBoYW5kbGVyIGZyb20gdGhlIGVsZW1lbnRcbiAgICAgLSBoYW5kbGVyIChmdW5jdGlvbikgaGFuZGxlciBmb3IgdGhlIGV2ZW50XG4gICAgID0gKG9iamVjdCkgQEVsZW1lbnRcbiAgICBcXCovXG4gICAgXG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQudG91Y2hzdGFydFxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQWRkcyBhIHRvdWNoc3RhcnQgZXZlbnQgaGFuZGxlciB0byB0aGUgZWxlbWVudFxuICAgICAtIGhhbmRsZXIgKGZ1bmN0aW9uKSBoYW5kbGVyIGZvciB0aGUgZXZlbnRcbiAgICAgPSAob2JqZWN0KSBARWxlbWVudFxuICAgIFxcKi9cbiAgICAvKlxcXG4gICAgICogRWxlbWVudC51bnRvdWNoc3RhcnRcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJlbW92ZXMgYSB0b3VjaHN0YXJ0IGV2ZW50IGhhbmRsZXIgZnJvbSB0aGUgZWxlbWVudFxuICAgICAtIGhhbmRsZXIgKGZ1bmN0aW9uKSBoYW5kbGVyIGZvciB0aGUgZXZlbnRcbiAgICAgPSAob2JqZWN0KSBARWxlbWVudFxuICAgIFxcKi9cbiAgICBcbiAgICAvKlxcXG4gICAgICogRWxlbWVudC50b3VjaG1vdmVcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIEFkZHMgYSB0b3VjaG1vdmUgZXZlbnQgaGFuZGxlciB0byB0aGUgZWxlbWVudFxuICAgICAtIGhhbmRsZXIgKGZ1bmN0aW9uKSBoYW5kbGVyIGZvciB0aGUgZXZlbnRcbiAgICAgPSAob2JqZWN0KSBARWxlbWVudFxuICAgIFxcKi9cbiAgICAvKlxcXG4gICAgICogRWxlbWVudC51bnRvdWNobW92ZVxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogUmVtb3ZlcyBhIHRvdWNobW92ZSBldmVudCBoYW5kbGVyIGZyb20gdGhlIGVsZW1lbnRcbiAgICAgLSBoYW5kbGVyIChmdW5jdGlvbikgaGFuZGxlciBmb3IgdGhlIGV2ZW50XG4gICAgID0gKG9iamVjdCkgQEVsZW1lbnRcbiAgICBcXCovXG4gICAgXG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQudG91Y2hlbmRcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIEFkZHMgYSB0b3VjaGVuZCBldmVudCBoYW5kbGVyIHRvIHRoZSBlbGVtZW50XG4gICAgIC0gaGFuZGxlciAoZnVuY3Rpb24pIGhhbmRsZXIgZm9yIHRoZSBldmVudFxuICAgICA9IChvYmplY3QpIEBFbGVtZW50XG4gICAgXFwqL1xuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LnVudG91Y2hlbmRcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJlbW92ZXMgYSB0b3VjaGVuZCBldmVudCBoYW5kbGVyIGZyb20gdGhlIGVsZW1lbnRcbiAgICAgLSBoYW5kbGVyIChmdW5jdGlvbikgaGFuZGxlciBmb3IgdGhlIGV2ZW50XG4gICAgID0gKG9iamVjdCkgQEVsZW1lbnRcbiAgICBcXCovXG4gICAgXG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQudG91Y2hjYW5jZWxcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIEFkZHMgYSB0b3VjaGNhbmNlbCBldmVudCBoYW5kbGVyIHRvIHRoZSBlbGVtZW50XG4gICAgIC0gaGFuZGxlciAoZnVuY3Rpb24pIGhhbmRsZXIgZm9yIHRoZSBldmVudFxuICAgICA9IChvYmplY3QpIEBFbGVtZW50XG4gICAgXFwqL1xuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LnVudG91Y2hjYW5jZWxcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJlbW92ZXMgYSB0b3VjaGNhbmNlbCBldmVudCBoYW5kbGVyIGZyb20gdGhlIGVsZW1lbnRcbiAgICAgLSBoYW5kbGVyIChmdW5jdGlvbikgaGFuZGxlciBmb3IgdGhlIGV2ZW50XG4gICAgID0gKG9iamVjdCkgQEVsZW1lbnRcbiAgICBcXCovXG4gICAgZm9yICh2YXIgaSA9IGV2ZW50cy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgKGZ1bmN0aW9uIChldmVudE5hbWUpIHtcbiAgICAgICAgICAgIFNuYXBbZXZlbnROYW1lXSA9IGVscHJvdG9bZXZlbnROYW1lXSA9IGZ1bmN0aW9uIChmbiwgc2NvcGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoU25hcC5pcyhmbiwgXCJmdW5jdGlvblwiKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cyA9IHRoaXMuZXZlbnRzIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGV2ZW50TmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGY6IGZuLFxuICAgICAgICAgICAgICAgICAgICAgICAgdW5iaW5kOiBhZGRFdmVudCh0aGlzLnNoYXBlIHx8IHRoaXMubm9kZSB8fCBnbG9iLmRvYywgZXZlbnROYW1lLCBmbiwgc2NvcGUgfHwgdGhpcylcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIFNuYXBbXCJ1blwiICsgZXZlbnROYW1lXSA9XG4gICAgICAgICAgICBlbHByb3RvW1widW5cIiArIGV2ZW50TmFtZV0gPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnRzID0gdGhpcy5ldmVudHMgfHwgW10sXG4gICAgICAgICAgICAgICAgICAgIGwgPSBldmVudHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIHdoaWxlIChsLS0pIGlmIChldmVudHNbbF0ubmFtZSA9PSBldmVudE5hbWUgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZXZlbnRzW2xdLmYgPT0gZm4gfHwgIWZuKSkge1xuICAgICAgICAgICAgICAgICAgICBldmVudHNbbF0udW5iaW5kKCk7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50cy5zcGxpY2UobCwgMSk7XG4gICAgICAgICAgICAgICAgICAgICFldmVudHMubGVuZ3RoICYmIGRlbGV0ZSB0aGlzLmV2ZW50cztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSkoZXZlbnRzW2ldKTtcbiAgICB9XG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQuaG92ZXJcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIEFkZHMgaG92ZXIgZXZlbnQgaGFuZGxlcnMgdG8gdGhlIGVsZW1lbnRcbiAgICAgLSBmX2luIChmdW5jdGlvbikgaGFuZGxlciBmb3IgaG92ZXIgaW5cbiAgICAgLSBmX291dCAoZnVuY3Rpb24pIGhhbmRsZXIgZm9yIGhvdmVyIG91dFxuICAgICAtIGljb250ZXh0IChvYmplY3QpICNvcHRpb25hbCBjb250ZXh0IGZvciBob3ZlciBpbiBoYW5kbGVyXG4gICAgIC0gb2NvbnRleHQgKG9iamVjdCkgI29wdGlvbmFsIGNvbnRleHQgZm9yIGhvdmVyIG91dCBoYW5kbGVyXG4gICAgID0gKG9iamVjdCkgQEVsZW1lbnRcbiAgICBcXCovXG4gICAgZWxwcm90by5ob3ZlciA9IGZ1bmN0aW9uIChmX2luLCBmX291dCwgc2NvcGVfaW4sIHNjb3BlX291dCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tb3VzZW92ZXIoZl9pbiwgc2NvcGVfaW4pLm1vdXNlb3V0KGZfb3V0LCBzY29wZV9vdXQgfHwgc2NvcGVfaW4pO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIEVsZW1lbnQudW5ob3ZlclxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogUmVtb3ZlcyBob3ZlciBldmVudCBoYW5kbGVycyBmcm9tIHRoZSBlbGVtZW50XG4gICAgIC0gZl9pbiAoZnVuY3Rpb24pIGhhbmRsZXIgZm9yIGhvdmVyIGluXG4gICAgIC0gZl9vdXQgKGZ1bmN0aW9uKSBoYW5kbGVyIGZvciBob3ZlciBvdXRcbiAgICAgPSAob2JqZWN0KSBARWxlbWVudFxuICAgIFxcKi9cbiAgICBlbHByb3RvLnVuaG92ZXIgPSBmdW5jdGlvbiAoZl9pbiwgZl9vdXQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudW5tb3VzZW92ZXIoZl9pbikudW5tb3VzZW91dChmX291dCk7XG4gICAgfTtcbiAgICB2YXIgZHJhZ2dhYmxlID0gW107XG4gICAgLy8gU0lFUlJBIHVuY2xlYXIgd2hhdCBfY29udGV4dF8gcmVmZXJzIHRvIGZvciBzdGFydGluZywgZW5kaW5nLCBtb3ZpbmcgdGhlIGRyYWcgZ2VzdHVyZS5cbiAgICAvLyBTSUVSUkEgRWxlbWVudC5kcmFnKCk6IF94IHBvc2l0aW9uIG9mIHRoZSBtb3VzZV86IFdoZXJlIGFyZSB0aGUgeC95IHZhbHVlcyBvZmZzZXQgZnJvbT9cbiAgICAvLyBTSUVSUkEgRWxlbWVudC5kcmFnKCk6IG11Y2ggb2YgdGhpcyBtZW1iZXIncyBkb2MgYXBwZWFycyB0byBiZSBkdXBsaWNhdGVkIGZvciBzb21lIHJlYXNvbi5cbiAgICAvLyBTSUVSUkEgVW5jbGVhciBhYm91dCB0aGlzIHNlbnRlbmNlOiBfQWRkaXRpb25hbGx5IGZvbGxvd2luZyBkcmFnIGV2ZW50cyB3aWxsIGJlIHRyaWdnZXJlZDogZHJhZy5zdGFydC48aWQ+IG9uIHN0YXJ0LCBkcmFnLmVuZC48aWQ+IG9uIGVuZCBhbmQgZHJhZy5tb3ZlLjxpZD4gb24gZXZlcnkgbW92ZS5fIElzIHRoZXJlIGEgZ2xvYmFsIF9kcmFnXyBvYmplY3QgdG8gd2hpY2ggeW91IGNhbiBhc3NpZ24gaGFuZGxlcnMga2V5ZWQgYnkgYW4gZWxlbWVudCdzIElEP1xuICAgIC8qXFxcbiAgICAgKiBFbGVtZW50LmRyYWdcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIEFkZHMgZXZlbnQgaGFuZGxlcnMgZm9yIGFuIGVsZW1lbnQncyBkcmFnIGdlc3R1cmVcbiAgICAgKipcbiAgICAgLSBvbm1vdmUgKGZ1bmN0aW9uKSBoYW5kbGVyIGZvciBtb3ZpbmdcbiAgICAgLSBvbnN0YXJ0IChmdW5jdGlvbikgaGFuZGxlciBmb3IgZHJhZyBzdGFydFxuICAgICAtIG9uZW5kIChmdW5jdGlvbikgaGFuZGxlciBmb3IgZHJhZyBlbmRcbiAgICAgLSBtY29udGV4dCAob2JqZWN0KSAjb3B0aW9uYWwgY29udGV4dCBmb3IgbW92aW5nIGhhbmRsZXJcbiAgICAgLSBzY29udGV4dCAob2JqZWN0KSAjb3B0aW9uYWwgY29udGV4dCBmb3IgZHJhZyBzdGFydCBoYW5kbGVyXG4gICAgIC0gZWNvbnRleHQgKG9iamVjdCkgI29wdGlvbmFsIGNvbnRleHQgZm9yIGRyYWcgZW5kIGhhbmRsZXJcbiAgICAgKiBBZGRpdGlvbmFseSBmb2xsb3dpbmcgYGRyYWdgIGV2ZW50cyBhcmUgdHJpZ2dlcmVkOiBgZHJhZy5zdGFydC48aWQ+YCBvbiBzdGFydCwgXG4gICAgICogYGRyYWcuZW5kLjxpZD5gIG9uIGVuZCBhbmQgYGRyYWcubW92ZS48aWQ+YCBvbiBldmVyeSBtb3ZlLiBXaGVuIGVsZW1lbnQgaXMgZHJhZ2dlZCBvdmVyIGFub3RoZXIgZWxlbWVudCBcbiAgICAgKiBgZHJhZy5vdmVyLjxpZD5gIGZpcmVzIGFzIHdlbGwuXG4gICAgICpcbiAgICAgKiBTdGFydCBldmVudCBhbmQgc3RhcnQgaGFuZGxlciBhcmUgY2FsbGVkIGluIHNwZWNpZmllZCBjb250ZXh0IG9yIGluIGNvbnRleHQgb2YgdGhlIGVsZW1lbnQgd2l0aCBmb2xsb3dpbmcgcGFyYW1ldGVyczpcbiAgICAgbyB4IChudW1iZXIpIHggcG9zaXRpb24gb2YgdGhlIG1vdXNlXG4gICAgIG8geSAobnVtYmVyKSB5IHBvc2l0aW9uIG9mIHRoZSBtb3VzZVxuICAgICBvIGV2ZW50IChvYmplY3QpIERPTSBldmVudCBvYmplY3RcbiAgICAgKiBNb3ZlIGV2ZW50IGFuZCBtb3ZlIGhhbmRsZXIgYXJlIGNhbGxlZCBpbiBzcGVjaWZpZWQgY29udGV4dCBvciBpbiBjb250ZXh0IG9mIHRoZSBlbGVtZW50IHdpdGggZm9sbG93aW5nIHBhcmFtZXRlcnM6XG4gICAgIG8gZHggKG51bWJlcikgc2hpZnQgYnkgeCBmcm9tIHRoZSBzdGFydCBwb2ludFxuICAgICBvIGR5IChudW1iZXIpIHNoaWZ0IGJ5IHkgZnJvbSB0aGUgc3RhcnQgcG9pbnRcbiAgICAgbyB4IChudW1iZXIpIHggcG9zaXRpb24gb2YgdGhlIG1vdXNlXG4gICAgIG8geSAobnVtYmVyKSB5IHBvc2l0aW9uIG9mIHRoZSBtb3VzZVxuICAgICBvIGV2ZW50IChvYmplY3QpIERPTSBldmVudCBvYmplY3RcbiAgICAgKiBFbmQgZXZlbnQgYW5kIGVuZCBoYW5kbGVyIGFyZSBjYWxsZWQgaW4gc3BlY2lmaWVkIGNvbnRleHQgb3IgaW4gY29udGV4dCBvZiB0aGUgZWxlbWVudCB3aXRoIGZvbGxvd2luZyBwYXJhbWV0ZXJzOlxuICAgICBvIGV2ZW50IChvYmplY3QpIERPTSBldmVudCBvYmplY3RcbiAgICAgPSAob2JqZWN0KSBARWxlbWVudFxuICAgIFxcKi9cbiAgICBlbHByb3RvLmRyYWcgPSBmdW5jdGlvbiAob25tb3ZlLCBvbnN0YXJ0LCBvbmVuZCwgbW92ZV9zY29wZSwgc3RhcnRfc2NvcGUsIGVuZF9zY29wZSkge1xuICAgICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHZhciBvcmlnVHJhbnNmb3JtO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZHJhZyhmdW5jdGlvbiAoZHgsIGR5KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hdHRyKHtcbiAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtOiBvcmlnVHJhbnNmb3JtICsgKG9yaWdUcmFuc2Zvcm0gPyBcIlRcIiA6IFwidFwiKSArIFtkeCwgZHldXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgb3JpZ1RyYW5zZm9ybSA9IHRoaXMudHJhbnNmb3JtKCkubG9jYWw7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBzdGFydChlLCB4LCB5KSB7XG4gICAgICAgICAgICAoZS5vcmlnaW5hbEV2ZW50IHx8IGUpLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB0aGlzLl9kcmFnLnggPSB4O1xuICAgICAgICAgICAgdGhpcy5fZHJhZy55ID0geTtcbiAgICAgICAgICAgIHRoaXMuX2RyYWcuaWQgPSBlLmlkZW50aWZpZXI7XG4gICAgICAgICAgICAhZHJhZy5sZW5ndGggJiYgU25hcC5tb3VzZW1vdmUoZHJhZ01vdmUpLm1vdXNldXAoZHJhZ1VwKTtcbiAgICAgICAgICAgIGRyYWcucHVzaCh7ZWw6IHRoaXMsIG1vdmVfc2NvcGU6IG1vdmVfc2NvcGUsIHN0YXJ0X3Njb3BlOiBzdGFydF9zY29wZSwgZW5kX3Njb3BlOiBlbmRfc2NvcGV9KTtcbiAgICAgICAgICAgIG9uc3RhcnQgJiYgZXZlLm9uKFwic25hcC5kcmFnLnN0YXJ0LlwiICsgdGhpcy5pZCwgb25zdGFydCk7XG4gICAgICAgICAgICBvbm1vdmUgJiYgZXZlLm9uKFwic25hcC5kcmFnLm1vdmUuXCIgKyB0aGlzLmlkLCBvbm1vdmUpO1xuICAgICAgICAgICAgb25lbmQgJiYgZXZlLm9uKFwic25hcC5kcmFnLmVuZC5cIiArIHRoaXMuaWQsIG9uZW5kKTtcbiAgICAgICAgICAgIGV2ZShcInNuYXAuZHJhZy5zdGFydC5cIiArIHRoaXMuaWQsIHN0YXJ0X3Njb3BlIHx8IG1vdmVfc2NvcGUgfHwgdGhpcywgeCwgeSwgZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZHJhZyA9IHt9O1xuICAgICAgICBkcmFnZ2FibGUucHVzaCh7ZWw6IHRoaXMsIHN0YXJ0OiBzdGFydH0pO1xuICAgICAgICB0aGlzLm1vdXNlZG93bihzdGFydCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgLypcbiAgICAgKiBFbGVtZW50Lm9uRHJhZ092ZXJcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFNob3J0Y3V0IHRvIGFzc2lnbiBldmVudCBoYW5kbGVyIGZvciBgZHJhZy5vdmVyLjxpZD5gIGV2ZW50LCB3aGVyZSBgaWRgIGlzIHRoZSBlbGVtZW50J3MgYGlkYCAoc2VlIEBFbGVtZW50LmlkKVxuICAgICAtIGYgKGZ1bmN0aW9uKSBoYW5kbGVyIGZvciBldmVudCwgZmlyc3QgYXJndW1lbnQgd291bGQgYmUgdGhlIGVsZW1lbnQgeW91IGFyZSBkcmFnZ2luZyBvdmVyXG4gICAgXFwqL1xuICAgIC8vIGVscHJvdG8ub25EcmFnT3ZlciA9IGZ1bmN0aW9uIChmKSB7XG4gICAgLy8gICAgIGYgPyBldmUub24oXCJzbmFwLmRyYWcub3Zlci5cIiArIHRoaXMuaWQsIGYpIDogZXZlLnVuYmluZChcInNuYXAuZHJhZy5vdmVyLlwiICsgdGhpcy5pZCk7XG4gICAgLy8gfTtcbiAgICAvKlxcXG4gICAgICogRWxlbWVudC51bmRyYWdcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJlbW92ZXMgYWxsIGRyYWcgZXZlbnQgaGFuZGxlcnMgZnJvbSB0aGUgZ2l2ZW4gZWxlbWVudFxuICAgIFxcKi9cbiAgICBlbHByb3RvLnVuZHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGkgPSBkcmFnZ2FibGUubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoaS0tKSBpZiAoZHJhZ2dhYmxlW2ldLmVsID09IHRoaXMpIHtcbiAgICAgICAgICAgIHRoaXMudW5tb3VzZWRvd24oZHJhZ2dhYmxlW2ldLnN0YXJ0KTtcbiAgICAgICAgICAgIGRyYWdnYWJsZS5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICBldmUudW5iaW5kKFwic25hcC5kcmFnLiouXCIgKyB0aGlzLmlkKTtcbiAgICAgICAgfVxuICAgICAgICAhZHJhZ2dhYmxlLmxlbmd0aCAmJiBTbmFwLnVubW91c2Vtb3ZlKGRyYWdNb3ZlKS51bm1vdXNldXAoZHJhZ1VwKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbn0pO1xuLy8gQ29weXJpZ2h0IChjKSAyMDEzIEFkb2JlIFN5c3RlbXMgSW5jb3Jwb3JhdGVkLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuLy8gXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vLyBcbi8vIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy8gXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuU25hcC5wbHVnaW4oZnVuY3Rpb24gKFNuYXAsIEVsZW1lbnQsIFBhcGVyLCBnbG9iKSB7XG4gICAgdmFyIGVscHJvdG8gPSBFbGVtZW50LnByb3RvdHlwZSxcbiAgICAgICAgcHByb3RvID0gUGFwZXIucHJvdG90eXBlLFxuICAgICAgICByZ3VybCA9IC9eXFxzKnVybFxcKCguKylcXCkvLFxuICAgICAgICBTdHIgPSBTdHJpbmcsXG4gICAgICAgICQgPSBTbmFwLl8uJDtcbiAgICBTbmFwLmZpbHRlciA9IHt9O1xuLy8gU0lFUlJBIFBhcGVyLmZpbHRlcigpOiBJIGRvbid0IHVuZGVyc3RhbmQgdGhlIG5vdGUuIERvZXMgdGhhdCBtZWFuIGFuIEhUTUwgc2hvdWxkIGRlZGljYXRlIGEgc2VwYXJhdGUgU1ZHIHJlZ2lvbiBmb3IgYSBmaWx0ZXIgZGVmaW5pdGlvbj8gV2hhdCdzIHRoZSBhZHZhbnRhZ2Ugb3ZlciBhIERFRlM/XG4gICAgLypcXFxuICAgICAqIFBhcGVyLmZpbHRlclxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogQ3JlYXRlcyBhIGA8ZmlsdGVyPmAgZWxlbWVudFxuICAgICAqKlxuICAgICAtIGZpbHN0ciAoc3RyaW5nKSBTVkcgZnJhZ21lbnQgb2YgZmlsdGVyIHByb3ZpZGVkIGFzIGEgc3RyaW5nXG4gICAgID0gKG9iamVjdCkgQEVsZW1lbnRcbiAgICAgKiBOb3RlOiBJdCBpcyByZWNvbW1lbmRlZCB0byB1c2UgZmlsdGVycyBlbWJlZGRlZCBpbnRvIHRoZSBwYWdlIGluc2lkZSBhbiBlbXB0eSBTVkcgZWxlbWVudC5cbiAgICAgPiBVc2FnZVxuICAgICB8IHZhciBmID0gcGFwZXIuZmlsdGVyKCc8ZmVHYXVzc2lhbkJsdXIgc3RkRGV2aWF0aW9uPVwiMlwiLz4nKSxcbiAgICAgfCAgICAgYyA9IHBhcGVyLmNpcmNsZSgxMCwgMTAsIDEwKS5hdHRyKHtcbiAgICAgfCAgICAgICAgIGZpbHRlcjogZlxuICAgICB8ICAgICB9KTtcbiAgICBcXCovXG4gICAgcHByb3RvLmZpbHRlciA9IGZ1bmN0aW9uIChmaWxzdHIpIHtcbiAgICAgICAgdmFyIHBhcGVyID0gdGhpcztcbiAgICAgICAgaWYgKHBhcGVyLnR5cGUgIT0gXCJzdmdcIikge1xuICAgICAgICAgICAgcGFwZXIgPSBwYXBlci5wYXBlcjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZiA9IFNuYXAucGFyc2UoU3RyKGZpbHN0cikpLFxuICAgICAgICAgICAgaWQgPSBTbmFwLl8uaWQoKSxcbiAgICAgICAgICAgIHdpZHRoID0gcGFwZXIubm9kZS5vZmZzZXRXaWR0aCxcbiAgICAgICAgICAgIGhlaWdodCA9IHBhcGVyLm5vZGUub2Zmc2V0SGVpZ2h0LFxuICAgICAgICAgICAgZmlsdGVyID0gJChcImZpbHRlclwiKTtcbiAgICAgICAgJChmaWx0ZXIsIHtcbiAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgIGZpbHRlclVuaXRzOiBcInVzZXJTcGFjZU9uVXNlXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGZpbHRlci5hcHBlbmRDaGlsZChmLm5vZGUpO1xuICAgICAgICBwYXBlci5kZWZzLmFwcGVuZENoaWxkKGZpbHRlcik7XG4gICAgICAgIHJldHVybiBuZXcgRWxlbWVudChmaWx0ZXIpO1xuICAgIH07XG4gICAgXG4gICAgZXZlLm9uKFwic25hcC51dGlsLmdldGF0dHIuZmlsdGVyXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZXZlLnN0b3AoKTtcbiAgICAgICAgdmFyIHAgPSAkKHRoaXMubm9kZSwgXCJmaWx0ZXJcIik7XG4gICAgICAgIGlmIChwKSB7XG4gICAgICAgICAgICB2YXIgbWF0Y2ggPSBTdHIocCkubWF0Y2gocmd1cmwpO1xuICAgICAgICAgICAgcmV0dXJuIG1hdGNoICYmIFNuYXAuc2VsZWN0KG1hdGNoWzFdKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGV2ZS5vbihcInNuYXAudXRpbC5hdHRyLmZpbHRlclwiLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgaWYgKHZhbHVlIGluc3RhbmNlb2YgRWxlbWVudCAmJiB2YWx1ZS50eXBlID09IFwiZmlsdGVyXCIpIHtcbiAgICAgICAgICAgIGV2ZS5zdG9wKCk7XG4gICAgICAgICAgICB2YXIgaWQgPSB2YWx1ZS5ub2RlLmlkO1xuICAgICAgICAgICAgaWYgKCFpZCkge1xuICAgICAgICAgICAgICAgICQodmFsdWUubm9kZSwge2lkOiB2YWx1ZS5pZH0pO1xuICAgICAgICAgICAgICAgIGlkID0gdmFsdWUuaWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKHRoaXMubm9kZSwge1xuICAgICAgICAgICAgICAgIGZpbHRlcjogU25hcC51cmwoaWQpXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlID09IFwibm9uZVwiKSB7XG4gICAgICAgICAgICBldmUuc3RvcCgpO1xuICAgICAgICAgICAgdGhpcy5ub2RlLnJlbW92ZUF0dHJpYnV0ZShcImZpbHRlclwiKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIC8qXFxcbiAgICAgKiBTbmFwLmZpbHRlci5ibHVyXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZXR1cm5zIGFuIFNWRyBtYXJrdXAgc3RyaW5nIGZvciB0aGUgYmx1ciBmaWx0ZXJcbiAgICAgKipcbiAgICAgLSB4IChudW1iZXIpIGFtb3VudCBvZiBob3Jpem9udGFsIGJsdXIsIGluIHBpeGVsc1xuICAgICAtIHkgKG51bWJlcikgI29wdGlvbmFsIGFtb3VudCBvZiB2ZXJ0aWNhbCBibHVyLCBpbiBwaXhlbHNcbiAgICAgPSAoc3RyaW5nKSBmaWx0ZXIgcmVwcmVzZW50YXRpb25cbiAgICAgPiBVc2FnZVxuICAgICB8IHZhciBmID0gcGFwZXIuZmlsdGVyKFNuYXAuZmlsdGVyLmJsdXIoNSwgMTApKSxcbiAgICAgfCAgICAgYyA9IHBhcGVyLmNpcmNsZSgxMCwgMTAsIDEwKS5hdHRyKHtcbiAgICAgfCAgICAgICAgIGZpbHRlcjogZlxuICAgICB8ICAgICB9KTtcbiAgICBcXCovXG4gICAgU25hcC5maWx0ZXIuYmx1ciA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgIGlmICh4ID09IG51bGwpIHtcbiAgICAgICAgICAgIHggPSAyO1xuICAgICAgICB9XG4gICAgICAgIHZhciBkZWYgPSB5ID09IG51bGwgPyB4IDogW3gsIHldO1xuICAgICAgICByZXR1cm4gU25hcC5mb3JtYXQoJ1xcPGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj1cIntkZWZ9XCIvPicsIHtcbiAgICAgICAgICAgIGRlZjogZGVmXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgU25hcC5maWx0ZXIuYmx1ci50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMoKTtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBTbmFwLmZpbHRlci5zaGFkb3dcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJldHVybnMgYW4gU1ZHIG1hcmt1cCBzdHJpbmcgZm9yIHRoZSBzaGFkb3cgZmlsdGVyXG4gICAgICoqXG4gICAgIC0gZHggKG51bWJlcikgaG9yaXpvbnRhbCBzaGlmdCBvZiB0aGUgc2hhZG93LCBpbiBwaXhlbHNcbiAgICAgLSBkeSAobnVtYmVyKSB2ZXJ0aWNhbCBzaGlmdCBvZiB0aGUgc2hhZG93LCBpbiBwaXhlbHNcbiAgICAgLSBibHVyIChudW1iZXIpICNvcHRpb25hbCBhbW91bnQgb2YgYmx1clxuICAgICAtIGNvbG9yIChzdHJpbmcpICNvcHRpb25hbCBjb2xvciBvZiB0aGUgc2hhZG93XG4gICAgID0gKHN0cmluZykgZmlsdGVyIHJlcHJlc2VudGF0aW9uXG4gICAgID4gVXNhZ2VcbiAgICAgfCB2YXIgZiA9IHBhcGVyLmZpbHRlcihTbmFwLmZpbHRlci5zaGFkb3coMCwgMiwgMykpLFxuICAgICB8ICAgICBjID0gcGFwZXIuY2lyY2xlKDEwLCAxMCwgMTApLmF0dHIoe1xuICAgICB8ICAgICAgICAgZmlsdGVyOiBmXG4gICAgIHwgICAgIH0pO1xuICAgIFxcKi9cbiAgICBTbmFwLmZpbHRlci5zaGFkb3cgPSBmdW5jdGlvbiAoZHgsIGR5LCBibHVyLCBjb2xvcikge1xuICAgICAgICBjb2xvciA9IGNvbG9yIHx8IFwiIzAwMFwiO1xuICAgICAgICBpZiAoYmx1ciA9PSBudWxsKSB7XG4gICAgICAgICAgICBibHVyID0gNDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIGJsdXIgPT0gXCJzdHJpbmdcIikge1xuICAgICAgICAgICAgY29sb3IgPSBibHVyO1xuICAgICAgICAgICAgYmx1ciA9IDQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGR4ID09IG51bGwpIHtcbiAgICAgICAgICAgIGR4ID0gMDtcbiAgICAgICAgICAgIGR5ID0gMjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZHkgPT0gbnVsbCkge1xuICAgICAgICAgICAgZHkgPSBkeDtcbiAgICAgICAgfVxuICAgICAgICBjb2xvciA9IFNuYXAuY29sb3IoY29sb3IpO1xuICAgICAgICByZXR1cm4gU25hcC5mb3JtYXQoJzxmZUdhdXNzaWFuQmx1ciBpbj1cIlNvdXJjZUFscGhhXCIgc3RkRGV2aWF0aW9uPVwie2JsdXJ9XCIvPjxmZU9mZnNldCBkeD1cIntkeH1cIiBkeT1cIntkeX1cIiByZXN1bHQ9XCJvZmZzZXRibHVyXCIvPjxmZUZsb29kIGZsb29kLWNvbG9yPVwie2NvbG9yfVwiLz48ZmVDb21wb3NpdGUgaW4yPVwib2Zmc2V0Ymx1clwiIG9wZXJhdG9yPVwiaW5cIi8+PGZlTWVyZ2U+PGZlTWVyZ2VOb2RlLz48ZmVNZXJnZU5vZGUgaW49XCJTb3VyY2VHcmFwaGljXCIvPjwvZmVNZXJnZT4nLCB7XG4gICAgICAgICAgICBjb2xvcjogY29sb3IsXG4gICAgICAgICAgICBkeDogZHgsXG4gICAgICAgICAgICBkeTogZHksXG4gICAgICAgICAgICBibHVyOiBibHVyXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgU25hcC5maWx0ZXIuc2hhZG93LnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcygpO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIFNuYXAuZmlsdGVyLmdyYXlzY2FsZVxuICAgICBbIG1ldGhvZCBdXG4gICAgICoqXG4gICAgICogUmV0dXJucyBhbiBTVkcgbWFya3VwIHN0cmluZyBmb3IgdGhlIGdyYXlzY2FsZSBmaWx0ZXJcbiAgICAgKipcbiAgICAgLSBhbW91bnQgKG51bWJlcikgYW1vdW50IG9mIGZpbHRlciAoYDAuLjFgKVxuICAgICA9IChzdHJpbmcpIGZpbHRlciByZXByZXNlbnRhdGlvblxuICAgIFxcKi9cbiAgICBTbmFwLmZpbHRlci5ncmF5c2NhbGUgPSBmdW5jdGlvbiAoYW1vdW50KSB7XG4gICAgICAgIGlmIChhbW91bnQgPT0gbnVsbCkge1xuICAgICAgICAgICAgYW1vdW50ID0gMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gU25hcC5mb3JtYXQoJzxmZUNvbG9yTWF0cml4IHR5cGU9XCJtYXRyaXhcIiB2YWx1ZXM9XCJ7YX0ge2J9IHtjfSAwIDAge2R9IHtlfSB7Zn0gMCAwIHtnfSB7Yn0ge2h9IDAgMCAwIDAgMCAxIDBcIi8+Jywge1xuICAgICAgICAgICAgYTogMC4yMTI2ICsgMC43ODc0ICogKDEgLSBhbW91bnQpLFxuICAgICAgICAgICAgYjogMC43MTUyIC0gMC43MTUyICogKDEgLSBhbW91bnQpLFxuICAgICAgICAgICAgYzogMC4wNzIyIC0gMC4wNzIyICogKDEgLSBhbW91bnQpLFxuICAgICAgICAgICAgZDogMC4yMTI2IC0gMC4yMTI2ICogKDEgLSBhbW91bnQpLFxuICAgICAgICAgICAgZTogMC43MTUyICsgMC4yODQ4ICogKDEgLSBhbW91bnQpLFxuICAgICAgICAgICAgZjogMC4wNzIyIC0gMC4wNzIyICogKDEgLSBhbW91bnQpLFxuICAgICAgICAgICAgZzogMC4yMTI2IC0gMC4yMTI2ICogKDEgLSBhbW91bnQpLFxuICAgICAgICAgICAgaDogMC4wNzIyICsgMC45Mjc4ICogKDEgLSBhbW91bnQpXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgU25hcC5maWx0ZXIuZ3JheXNjYWxlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcygpO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIFNuYXAuZmlsdGVyLnNlcGlhXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZXR1cm5zIGFuIFNWRyBtYXJrdXAgc3RyaW5nIGZvciB0aGUgc2VwaWEgZmlsdGVyXG4gICAgICoqXG4gICAgIC0gYW1vdW50IChudW1iZXIpIGFtb3VudCBvZiBmaWx0ZXIgKGAwLi4xYClcbiAgICAgPSAoc3RyaW5nKSBmaWx0ZXIgcmVwcmVzZW50YXRpb25cbiAgICBcXCovXG4gICAgU25hcC5maWx0ZXIuc2VwaWEgPSBmdW5jdGlvbiAoYW1vdW50KSB7XG4gICAgICAgIGlmIChhbW91bnQgPT0gbnVsbCkge1xuICAgICAgICAgICAgYW1vdW50ID0gMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gU25hcC5mb3JtYXQoJzxmZUNvbG9yTWF0cml4IHR5cGU9XCJtYXRyaXhcIiB2YWx1ZXM9XCJ7YX0ge2J9IHtjfSAwIDAge2R9IHtlfSB7Zn0gMCAwIHtnfSB7aH0ge2l9IDAgMCAwIDAgMCAxIDBcIi8+Jywge1xuICAgICAgICAgICAgYTogMC4zOTMgKyAwLjYwNyAqICgxIC0gYW1vdW50KSxcbiAgICAgICAgICAgIGI6IDAuNzY5IC0gMC43NjkgKiAoMSAtIGFtb3VudCksXG4gICAgICAgICAgICBjOiAwLjE4OSAtIDAuMTg5ICogKDEgLSBhbW91bnQpLFxuICAgICAgICAgICAgZDogMC4zNDkgLSAwLjM0OSAqICgxIC0gYW1vdW50KSxcbiAgICAgICAgICAgIGU6IDAuNjg2ICsgMC4zMTQgKiAoMSAtIGFtb3VudCksXG4gICAgICAgICAgICBmOiAwLjE2OCAtIDAuMTY4ICogKDEgLSBhbW91bnQpLFxuICAgICAgICAgICAgZzogMC4yNzIgLSAwLjI3MiAqICgxIC0gYW1vdW50KSxcbiAgICAgICAgICAgIGg6IDAuNTM0IC0gMC41MzQgKiAoMSAtIGFtb3VudCksXG4gICAgICAgICAgICBpOiAwLjEzMSArIDAuODY5ICogKDEgLSBhbW91bnQpXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgU25hcC5maWx0ZXIuc2VwaWEudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzKCk7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogU25hcC5maWx0ZXIuc2F0dXJhdGVcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJldHVybnMgYW4gU1ZHIG1hcmt1cCBzdHJpbmcgZm9yIHRoZSBzYXR1cmF0ZSBmaWx0ZXJcbiAgICAgKipcbiAgICAgLSBhbW91bnQgKG51bWJlcikgYW1vdW50IG9mIGZpbHRlciAoYDAuLjFgKVxuICAgICA9IChzdHJpbmcpIGZpbHRlciByZXByZXNlbnRhdGlvblxuICAgIFxcKi9cbiAgICBTbmFwLmZpbHRlci5zYXR1cmF0ZSA9IGZ1bmN0aW9uIChhbW91bnQpIHtcbiAgICAgICAgaWYgKGFtb3VudCA9PSBudWxsKSB7XG4gICAgICAgICAgICBhbW91bnQgPSAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBTbmFwLmZvcm1hdCgnPGZlQ29sb3JNYXRyaXggdHlwZT1cInNhdHVyYXRlXCIgdmFsdWVzPVwie2Ftb3VudH1cIi8+Jywge1xuICAgICAgICAgICAgYW1vdW50OiAxIC0gYW1vdW50XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgU25hcC5maWx0ZXIuc2F0dXJhdGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzKCk7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogU25hcC5maWx0ZXIuaHVlUm90YXRlXG4gICAgIFsgbWV0aG9kIF1cbiAgICAgKipcbiAgICAgKiBSZXR1cm5zIGFuIFNWRyBtYXJrdXAgc3RyaW5nIGZvciB0aGUgaHVlLXJvdGF0ZSBmaWx0ZXJcbiAgICAgKipcbiAgICAgLSBhbmdsZSAobnVtYmVyKSBhbmdsZSBvZiByb3RhdGlvblxuICAgICA9IChzdHJpbmcpIGZpbHRlciByZXByZXNlbnRhdGlvblxuICAgIFxcKi9cbiAgICBTbmFwLmZpbHRlci5odWVSb3RhdGUgPSBmdW5jdGlvbiAoYW5nbGUpIHtcbiAgICAgICAgYW5nbGUgPSBhbmdsZSB8fCAwO1xuICAgICAgICByZXR1cm4gU25hcC5mb3JtYXQoJzxmZUNvbG9yTWF0cml4IHR5cGU9XCJodWVSb3RhdGVcIiB2YWx1ZXM9XCJ7YW5nbGV9XCIvPicsIHtcbiAgICAgICAgICAgIGFuZ2xlOiBhbmdsZVxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIFNuYXAuZmlsdGVyLmh1ZVJvdGF0ZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMoKTtcbiAgICB9O1xuICAgIC8qXFxcbiAgICAgKiBTbmFwLmZpbHRlci5pbnZlcnRcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJldHVybnMgYW4gU1ZHIG1hcmt1cCBzdHJpbmcgZm9yIHRoZSBpbnZlcnQgZmlsdGVyXG4gICAgICoqXG4gICAgIC0gYW1vdW50IChudW1iZXIpIGFtb3VudCBvZiBmaWx0ZXIgKGAwLi4xYClcbiAgICAgPSAoc3RyaW5nKSBmaWx0ZXIgcmVwcmVzZW50YXRpb25cbiAgICBcXCovXG4gICAgU25hcC5maWx0ZXIuaW52ZXJ0ID0gZnVuY3Rpb24gKGFtb3VudCkge1xuICAgICAgICBpZiAoYW1vdW50ID09IG51bGwpIHtcbiAgICAgICAgICAgIGFtb3VudCA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFNuYXAuZm9ybWF0KCc8ZmVDb21wb25lbnRUcmFuc2Zlcj48ZmVGdW5jUiB0eXBlPVwidGFibGVcIiB0YWJsZVZhbHVlcz1cInthbW91bnR9IHthbW91bnQyfVwiLz48ZmVGdW5jRyB0eXBlPVwidGFibGVcIiB0YWJsZVZhbHVlcz1cInthbW91bnR9IHthbW91bnQyfVwiLz48ZmVGdW5jQiB0eXBlPVwidGFibGVcIiB0YWJsZVZhbHVlcz1cInthbW91bnR9IHthbW91bnQyfVwiLz48L2ZlQ29tcG9uZW50VHJhbnNmZXI+Jywge1xuICAgICAgICAgICAgYW1vdW50OiBhbW91bnQsXG4gICAgICAgICAgICBhbW91bnQyOiAxIC0gYW1vdW50XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgU25hcC5maWx0ZXIuaW52ZXJ0LnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcygpO1xuICAgIH07XG4gICAgLypcXFxuICAgICAqIFNuYXAuZmlsdGVyLmJyaWdodG5lc3NcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJldHVybnMgYW4gU1ZHIG1hcmt1cCBzdHJpbmcgZm9yIHRoZSBicmlnaHRuZXNzIGZpbHRlclxuICAgICAqKlxuICAgICAtIGFtb3VudCAobnVtYmVyKSBhbW91bnQgb2YgZmlsdGVyIChgMC4uMWApXG4gICAgID0gKHN0cmluZykgZmlsdGVyIHJlcHJlc2VudGF0aW9uXG4gICAgXFwqL1xuICAgIFNuYXAuZmlsdGVyLmJyaWdodG5lc3MgPSBmdW5jdGlvbiAoYW1vdW50KSB7XG4gICAgICAgIGlmIChhbW91bnQgPT0gbnVsbCkge1xuICAgICAgICAgICAgYW1vdW50ID0gMTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gU25hcC5mb3JtYXQoJzxmZUNvbXBvbmVudFRyYW5zZmVyPjxmZUZ1bmNSIHR5cGU9XCJsaW5lYXJcIiBzbG9wZT1cInthbW91bnR9XCIvPjxmZUZ1bmNHIHR5cGU9XCJsaW5lYXJcIiBzbG9wZT1cInthbW91bnR9XCIvPjxmZUZ1bmNCIHR5cGU9XCJsaW5lYXJcIiBzbG9wZT1cInthbW91bnR9XCIvPjwvZmVDb21wb25lbnRUcmFuc2Zlcj4nLCB7XG4gICAgICAgICAgICBhbW91bnQ6IGFtb3VudFxuICAgICAgICB9KTtcbiAgICB9O1xuICAgIFNuYXAuZmlsdGVyLmJyaWdodG5lc3MudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzKCk7XG4gICAgfTtcbiAgICAvKlxcXG4gICAgICogU25hcC5maWx0ZXIuY29udHJhc3RcbiAgICAgWyBtZXRob2QgXVxuICAgICAqKlxuICAgICAqIFJldHVybnMgYW4gU1ZHIG1hcmt1cCBzdHJpbmcgZm9yIHRoZSBjb250cmFzdCBmaWx0ZXJcbiAgICAgKipcbiAgICAgLSBhbW91bnQgKG51bWJlcikgYW1vdW50IG9mIGZpbHRlciAoYDAuLjFgKVxuICAgICA9IChzdHJpbmcpIGZpbHRlciByZXByZXNlbnRhdGlvblxuICAgIFxcKi9cbiAgICBTbmFwLmZpbHRlci5jb250cmFzdCA9IGZ1bmN0aW9uIChhbW91bnQpIHtcbiAgICAgICAgaWYgKGFtb3VudCA9PSBudWxsKSB7XG4gICAgICAgICAgICBhbW91bnQgPSAxO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBTbmFwLmZvcm1hdCgnPGZlQ29tcG9uZW50VHJhbnNmZXI+PGZlRnVuY1IgdHlwZT1cImxpbmVhclwiIHNsb3BlPVwie2Ftb3VudH1cIiBpbnRlcmNlcHQ9XCJ7YW1vdW50Mn1cIi8+PGZlRnVuY0cgdHlwZT1cImxpbmVhclwiIHNsb3BlPVwie2Ftb3VudH1cIiBpbnRlcmNlcHQ9XCJ7YW1vdW50Mn1cIi8+PGZlRnVuY0IgdHlwZT1cImxpbmVhclwiIHNsb3BlPVwie2Ftb3VudH1cIiBpbnRlcmNlcHQ9XCJ7YW1vdW50Mn1cIi8+PC9mZUNvbXBvbmVudFRyYW5zZmVyPicsIHtcbiAgICAgICAgICAgIGFtb3VudDogYW1vdW50LFxuICAgICAgICAgICAgYW1vdW50MjogLjUgLSBhbW91bnQgLyAyXG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgU25hcC5maWx0ZXIuY29udHJhc3QudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzKCk7XG4gICAgfTtcbn0pO1xucmV0dXJuIFNuYXA7XG59KSk7IiwiLy8gICAgIFVuZGVyc2NvcmUuanMgMS42LjBcbi8vICAgICBodHRwOi8vdW5kZXJzY29yZWpzLm9yZ1xuLy8gICAgIChjKSAyMDA5LTIwMTQgSmVyZW15IEFzaGtlbmFzLCBEb2N1bWVudENsb3VkIGFuZCBJbnZlc3RpZ2F0aXZlIFJlcG9ydGVycyAmIEVkaXRvcnNcbi8vICAgICBVbmRlcnNjb3JlIG1heSBiZSBmcmVlbHkgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlLlxuXG4oZnVuY3Rpb24oKSB7XG5cbiAgLy8gQmFzZWxpbmUgc2V0dXBcbiAgLy8gLS0tLS0tLS0tLS0tLS1cblxuICAvLyBFc3RhYmxpc2ggdGhlIHJvb3Qgb2JqZWN0LCBgd2luZG93YCBpbiB0aGUgYnJvd3Nlciwgb3IgYGV4cG9ydHNgIG9uIHRoZSBzZXJ2ZXIuXG4gIHZhciByb290ID0gdGhpcztcblxuICAvLyBTYXZlIHRoZSBwcmV2aW91cyB2YWx1ZSBvZiB0aGUgYF9gIHZhcmlhYmxlLlxuICB2YXIgcHJldmlvdXNVbmRlcnNjb3JlID0gcm9vdC5fO1xuXG4gIC8vIEVzdGFibGlzaCB0aGUgb2JqZWN0IHRoYXQgZ2V0cyByZXR1cm5lZCB0byBicmVhayBvdXQgb2YgYSBsb29wIGl0ZXJhdGlvbi5cbiAgdmFyIGJyZWFrZXIgPSB7fTtcblxuICAvLyBTYXZlIGJ5dGVzIGluIHRoZSBtaW5pZmllZCAoYnV0IG5vdCBnemlwcGVkKSB2ZXJzaW9uOlxuICB2YXIgQXJyYXlQcm90byA9IEFycmF5LnByb3RvdHlwZSwgT2JqUHJvdG8gPSBPYmplY3QucHJvdG90eXBlLCBGdW5jUHJvdG8gPSBGdW5jdGlvbi5wcm90b3R5cGU7XG5cbiAgLy8gQ3JlYXRlIHF1aWNrIHJlZmVyZW5jZSB2YXJpYWJsZXMgZm9yIHNwZWVkIGFjY2VzcyB0byBjb3JlIHByb3RvdHlwZXMuXG4gIHZhclxuICAgIHB1c2ggICAgICAgICAgICAgPSBBcnJheVByb3RvLnB1c2gsXG4gICAgc2xpY2UgICAgICAgICAgICA9IEFycmF5UHJvdG8uc2xpY2UsXG4gICAgY29uY2F0ICAgICAgICAgICA9IEFycmF5UHJvdG8uY29uY2F0LFxuICAgIHRvU3RyaW5nICAgICAgICAgPSBPYmpQcm90by50b1N0cmluZyxcbiAgICBoYXNPd25Qcm9wZXJ0eSAgID0gT2JqUHJvdG8uaGFzT3duUHJvcGVydHk7XG5cbiAgLy8gQWxsICoqRUNNQVNjcmlwdCA1KiogbmF0aXZlIGZ1bmN0aW9uIGltcGxlbWVudGF0aW9ucyB0aGF0IHdlIGhvcGUgdG8gdXNlXG4gIC8vIGFyZSBkZWNsYXJlZCBoZXJlLlxuICB2YXJcbiAgICBuYXRpdmVGb3JFYWNoICAgICAgPSBBcnJheVByb3RvLmZvckVhY2gsXG4gICAgbmF0aXZlTWFwICAgICAgICAgID0gQXJyYXlQcm90by5tYXAsXG4gICAgbmF0aXZlUmVkdWNlICAgICAgID0gQXJyYXlQcm90by5yZWR1Y2UsXG4gICAgbmF0aXZlUmVkdWNlUmlnaHQgID0gQXJyYXlQcm90by5yZWR1Y2VSaWdodCxcbiAgICBuYXRpdmVGaWx0ZXIgICAgICAgPSBBcnJheVByb3RvLmZpbHRlcixcbiAgICBuYXRpdmVFdmVyeSAgICAgICAgPSBBcnJheVByb3RvLmV2ZXJ5LFxuICAgIG5hdGl2ZVNvbWUgICAgICAgICA9IEFycmF5UHJvdG8uc29tZSxcbiAgICBuYXRpdmVJbmRleE9mICAgICAgPSBBcnJheVByb3RvLmluZGV4T2YsXG4gICAgbmF0aXZlTGFzdEluZGV4T2YgID0gQXJyYXlQcm90by5sYXN0SW5kZXhPZixcbiAgICBuYXRpdmVJc0FycmF5ICAgICAgPSBBcnJheS5pc0FycmF5LFxuICAgIG5hdGl2ZUtleXMgICAgICAgICA9IE9iamVjdC5rZXlzLFxuICAgIG5hdGl2ZUJpbmQgICAgICAgICA9IEZ1bmNQcm90by5iaW5kO1xuXG4gIC8vIENyZWF0ZSBhIHNhZmUgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgdXNlIGJlbG93LlxuICB2YXIgXyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogaW5zdGFuY2VvZiBfKSByZXR1cm4gb2JqO1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBfKSkgcmV0dXJuIG5ldyBfKG9iaik7XG4gICAgdGhpcy5fd3JhcHBlZCA9IG9iajtcbiAgfTtcblxuICAvLyBFeHBvcnQgdGhlIFVuZGVyc2NvcmUgb2JqZWN0IGZvciAqKk5vZGUuanMqKiwgd2l0aFxuICAvLyBiYWNrd2FyZHMtY29tcGF0aWJpbGl0eSBmb3IgdGhlIG9sZCBgcmVxdWlyZSgpYCBBUEkuIElmIHdlJ3JlIGluXG4gIC8vIHRoZSBicm93c2VyLCBhZGQgYF9gIGFzIGEgZ2xvYmFsIG9iamVjdCB2aWEgYSBzdHJpbmcgaWRlbnRpZmllcixcbiAgLy8gZm9yIENsb3N1cmUgQ29tcGlsZXIgXCJhZHZhbmNlZFwiIG1vZGUuXG4gIGlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICAgIGV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IF87XG4gICAgfVxuICAgIGV4cG9ydHMuXyA9IF87XG4gIH0gZWxzZSB7XG4gICAgcm9vdC5fID0gXztcbiAgfVxuXG4gIC8vIEN1cnJlbnQgdmVyc2lvbi5cbiAgXy5WRVJTSU9OID0gJzEuNi4wJztcblxuICAvLyBDb2xsZWN0aW9uIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFRoZSBjb3JuZXJzdG9uZSwgYW4gYGVhY2hgIGltcGxlbWVudGF0aW9uLCBha2EgYGZvckVhY2hgLlxuICAvLyBIYW5kbGVzIG9iamVjdHMgd2l0aCB0aGUgYnVpbHQtaW4gYGZvckVhY2hgLCBhcnJheXMsIGFuZCByYXcgb2JqZWN0cy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGZvckVhY2hgIGlmIGF2YWlsYWJsZS5cbiAgdmFyIGVhY2ggPSBfLmVhY2ggPSBfLmZvckVhY2ggPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gb2JqO1xuICAgIGlmIChuYXRpdmVGb3JFYWNoICYmIG9iai5mb3JFYWNoID09PSBuYXRpdmVGb3JFYWNoKSB7XG4gICAgICBvYmouZm9yRWFjaChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgfSBlbHNlIGlmIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkge1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IG9iai5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpbaV0sIGksIG9iaikgPT09IGJyZWFrZXIpIHJldHVybjtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtrZXlzW2ldXSwga2V5c1tpXSwgb2JqKSA9PT0gYnJlYWtlcikgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgcmVzdWx0cyBvZiBhcHBseWluZyB0aGUgaXRlcmF0b3IgdG8gZWFjaCBlbGVtZW50LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgbWFwYCBpZiBhdmFpbGFibGUuXG4gIF8ubWFwID0gXy5jb2xsZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0cztcbiAgICBpZiAobmF0aXZlTWFwICYmIG9iai5tYXAgPT09IG5hdGl2ZU1hcCkgcmV0dXJuIG9iai5tYXAoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJlc3VsdHMucHVzaChpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIHZhciByZWR1Y2VFcnJvciA9ICdSZWR1Y2Ugb2YgZW1wdHkgYXJyYXkgd2l0aCBubyBpbml0aWFsIHZhbHVlJztcblxuICAvLyAqKlJlZHVjZSoqIGJ1aWxkcyB1cCBhIHNpbmdsZSByZXN1bHQgZnJvbSBhIGxpc3Qgb2YgdmFsdWVzLCBha2EgYGluamVjdGAsXG4gIC8vIG9yIGBmb2xkbGAuIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGByZWR1Y2VgIGlmIGF2YWlsYWJsZS5cbiAgXy5yZWR1Y2UgPSBfLmZvbGRsID0gXy5pbmplY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgdmFyIGluaXRpYWwgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcbiAgICBpZiAob2JqID09IG51bGwpIG9iaiA9IFtdO1xuICAgIGlmIChuYXRpdmVSZWR1Y2UgJiYgb2JqLnJlZHVjZSA9PT0gbmF0aXZlUmVkdWNlKSB7XG4gICAgICBpZiAoY29udGV4dCkgaXRlcmF0b3IgPSBfLmJpbmQoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIGluaXRpYWwgPyBvYmoucmVkdWNlKGl0ZXJhdG9yLCBtZW1vKSA6IG9iai5yZWR1Y2UoaXRlcmF0b3IpO1xuICAgIH1cbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAoIWluaXRpYWwpIHtcbiAgICAgICAgbWVtbyA9IHZhbHVlO1xuICAgICAgICBpbml0aWFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG1lbW8sIHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCFpbml0aWFsKSB0aHJvdyBuZXcgVHlwZUVycm9yKHJlZHVjZUVycm9yKTtcbiAgICByZXR1cm4gbWVtbztcbiAgfTtcblxuICAvLyBUaGUgcmlnaHQtYXNzb2NpYXRpdmUgdmVyc2lvbiBvZiByZWR1Y2UsIGFsc28ga25vd24gYXMgYGZvbGRyYC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHJlZHVjZVJpZ2h0YCBpZiBhdmFpbGFibGUuXG4gIF8ucmVkdWNlUmlnaHQgPSBfLmZvbGRyID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgbWVtbywgY29udGV4dCkge1xuICAgIHZhciBpbml0aWFsID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XG4gICAgaWYgKG9iaiA9PSBudWxsKSBvYmogPSBbXTtcbiAgICBpZiAobmF0aXZlUmVkdWNlUmlnaHQgJiYgb2JqLnJlZHVjZVJpZ2h0ID09PSBuYXRpdmVSZWR1Y2VSaWdodCkge1xuICAgICAgaWYgKGNvbnRleHQpIGl0ZXJhdG9yID0gXy5iaW5kKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiBpbml0aWFsID8gb2JqLnJlZHVjZVJpZ2h0KGl0ZXJhdG9yLCBtZW1vKSA6IG9iai5yZWR1Y2VSaWdodChpdGVyYXRvcik7XG4gICAgfVxuICAgIHZhciBsZW5ndGggPSBvYmoubGVuZ3RoO1xuICAgIGlmIChsZW5ndGggIT09ICtsZW5ndGgpIHtcbiAgICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgICBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB9XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaW5kZXggPSBrZXlzID8ga2V5c1stLWxlbmd0aF0gOiAtLWxlbmd0aDtcbiAgICAgIGlmICghaW5pdGlhbCkge1xuICAgICAgICBtZW1vID0gb2JqW2luZGV4XTtcbiAgICAgICAgaW5pdGlhbCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtZW1vID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBtZW1vLCBvYmpbaW5kZXhdLCBpbmRleCwgbGlzdCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKCFpbml0aWFsKSB0aHJvdyBuZXcgVHlwZUVycm9yKHJlZHVjZUVycm9yKTtcbiAgICByZXR1cm4gbWVtbztcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIGZpcnN0IHZhbHVlIHdoaWNoIHBhc3NlcyBhIHRydXRoIHRlc3QuIEFsaWFzZWQgYXMgYGRldGVjdGAuXG4gIF8uZmluZCA9IF8uZGV0ZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0O1xuICAgIGFueShvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpIHtcbiAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGFsbCB0aGUgZWxlbWVudHMgdGhhdCBwYXNzIGEgdHJ1dGggdGVzdC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGZpbHRlcmAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBzZWxlY3RgLlxuICBfLmZpbHRlciA9IF8uc2VsZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdHM7XG4gICAgaWYgKG5hdGl2ZUZpbHRlciAmJiBvYmouZmlsdGVyID09PSBuYXRpdmVGaWx0ZXIpIHJldHVybiBvYmouZmlsdGVyKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpIHJlc3VsdHMucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGFsbCB0aGUgZWxlbWVudHMgZm9yIHdoaWNoIGEgdHJ1dGggdGVzdCBmYWlscy5cbiAgXy5yZWplY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiBfLmZpbHRlcihvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuICFwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpO1xuICAgIH0sIGNvbnRleHQpO1xuICB9O1xuXG4gIC8vIERldGVybWluZSB3aGV0aGVyIGFsbCBvZiB0aGUgZWxlbWVudHMgbWF0Y2ggYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZXZlcnlgIGlmIGF2YWlsYWJsZS5cbiAgLy8gQWxpYXNlZCBhcyBgYWxsYC5cbiAgXy5ldmVyeSA9IF8uYWxsID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgfHwgKHByZWRpY2F0ZSA9IF8uaWRlbnRpdHkpO1xuICAgIHZhciByZXN1bHQgPSB0cnVlO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAobmF0aXZlRXZlcnkgJiYgb2JqLmV2ZXJ5ID09PSBuYXRpdmVFdmVyeSkgcmV0dXJuIG9iai5ldmVyeShwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmICghKHJlc3VsdCA9IHJlc3VsdCAmJiBwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSkgcmV0dXJuIGJyZWFrZXI7XG4gICAgfSk7XG4gICAgcmV0dXJuICEhcmVzdWx0O1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiBhdCBsZWFzdCBvbmUgZWxlbWVudCBpbiB0aGUgb2JqZWN0IG1hdGNoZXMgYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgc29tZWAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBhbnlgLlxuICB2YXIgYW55ID0gXy5zb21lID0gXy5hbnkgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSB8fCAocHJlZGljYXRlID0gXy5pZGVudGl0eSk7XG4gICAgdmFyIHJlc3VsdCA9IGZhbHNlO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdDtcbiAgICBpZiAobmF0aXZlU29tZSAmJiBvYmouc29tZSA9PT0gbmF0aXZlU29tZSkgcmV0dXJuIG9iai5zb21lKHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKHJlc3VsdCB8fCAocmVzdWx0ID0gcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkpIHJldHVybiBicmVha2VyO1xuICAgIH0pO1xuICAgIHJldHVybiAhIXJlc3VsdDtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgaWYgdGhlIGFycmF5IG9yIG9iamVjdCBjb250YWlucyBhIGdpdmVuIHZhbHVlICh1c2luZyBgPT09YCkuXG4gIC8vIEFsaWFzZWQgYXMgYGluY2x1ZGVgLlxuICBfLmNvbnRhaW5zID0gXy5pbmNsdWRlID0gZnVuY3Rpb24ob2JqLCB0YXJnZXQpIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiBmYWxzZTtcbiAgICBpZiAobmF0aXZlSW5kZXhPZiAmJiBvYmouaW5kZXhPZiA9PT0gbmF0aXZlSW5kZXhPZikgcmV0dXJuIG9iai5pbmRleE9mKHRhcmdldCkgIT0gLTE7XG4gICAgcmV0dXJuIGFueShvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gdmFsdWUgPT09IHRhcmdldDtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBJbnZva2UgYSBtZXRob2QgKHdpdGggYXJndW1lbnRzKSBvbiBldmVyeSBpdGVtIGluIGEgY29sbGVjdGlvbi5cbiAgXy5pbnZva2UgPSBmdW5jdGlvbihvYmosIG1ldGhvZCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHZhciBpc0Z1bmMgPSBfLmlzRnVuY3Rpb24obWV0aG9kKTtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIChpc0Z1bmMgPyBtZXRob2QgOiB2YWx1ZVttZXRob2RdKS5hcHBseSh2YWx1ZSwgYXJncyk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgbWFwYDogZmV0Y2hpbmcgYSBwcm9wZXJ0eS5cbiAgXy5wbHVjayA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgXy5wcm9wZXJ0eShrZXkpKTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaWx0ZXJgOiBzZWxlY3Rpbmcgb25seSBvYmplY3RzXG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ud2hlcmUgPSBmdW5jdGlvbihvYmosIGF0dHJzKSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgXy5tYXRjaGVzKGF0dHJzKSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgZmluZGA6IGdldHRpbmcgdGhlIGZpcnN0IG9iamVjdFxuICAvLyBjb250YWluaW5nIHNwZWNpZmljIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLmZpbmRXaGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy5maW5kKG9iaiwgXy5tYXRjaGVzKGF0dHJzKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtYXhpbXVtIGVsZW1lbnQgb3IgKGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICAvLyBDYW4ndCBvcHRpbWl6ZSBhcnJheXMgb2YgaW50ZWdlcnMgbG9uZ2VyIHRoYW4gNjUsNTM1IGVsZW1lbnRzLlxuICAvLyBTZWUgW1dlYktpdCBCdWcgODA3OTddKGh0dHBzOi8vYnVncy53ZWJraXQub3JnL3Nob3dfYnVnLmNnaT9pZD04MDc5NylcbiAgXy5tYXggPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKCFpdGVyYXRvciAmJiBfLmlzQXJyYXkob2JqKSAmJiBvYmpbMF0gPT09ICtvYmpbMF0gJiYgb2JqLmxlbmd0aCA8IDY1NTM1KSB7XG4gICAgICByZXR1cm4gTWF0aC5tYXguYXBwbHkoTWF0aCwgb2JqKTtcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IC1JbmZpbml0eSwgbGFzdENvbXB1dGVkID0gLUluZmluaXR5O1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHZhciBjb21wdXRlZCA9IGl0ZXJhdG9yID8gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpIDogdmFsdWU7XG4gICAgICBpZiAoY29tcHV0ZWQgPiBsYXN0Q29tcHV0ZWQpIHtcbiAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIGxhc3RDb21wdXRlZCA9IGNvbXB1dGVkO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBtaW5pbXVtIGVsZW1lbnQgKG9yIGVsZW1lbnQtYmFzZWQgY29tcHV0YXRpb24pLlxuICBfLm1pbiA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoIWl0ZXJhdG9yICYmIF8uaXNBcnJheShvYmopICYmIG9ialswXSA9PT0gK29ialswXSAmJiBvYmoubGVuZ3RoIDwgNjU1MzUpIHtcbiAgICAgIHJldHVybiBNYXRoLm1pbi5hcHBseShNYXRoLCBvYmopO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gSW5maW5pdHksIGxhc3RDb21wdXRlZCA9IEluZmluaXR5O1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHZhciBjb21wdXRlZCA9IGl0ZXJhdG9yID8gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpIDogdmFsdWU7XG4gICAgICBpZiAoY29tcHV0ZWQgPCBsYXN0Q29tcHV0ZWQpIHtcbiAgICAgICAgcmVzdWx0ID0gdmFsdWU7XG4gICAgICAgIGxhc3RDb21wdXRlZCA9IGNvbXB1dGVkO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gU2h1ZmZsZSBhbiBhcnJheSwgdXNpbmcgdGhlIG1vZGVybiB2ZXJzaW9uIG9mIHRoZVxuICAvLyBbRmlzaGVyLVlhdGVzIHNodWZmbGVdKGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvRmlzaGVy4oCTWWF0ZXNfc2h1ZmZsZSkuXG4gIF8uc2h1ZmZsZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciByYW5kO1xuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHNodWZmbGVkID0gW107XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByYW5kID0gXy5yYW5kb20oaW5kZXgrKyk7XG4gICAgICBzaHVmZmxlZFtpbmRleCAtIDFdID0gc2h1ZmZsZWRbcmFuZF07XG4gICAgICBzaHVmZmxlZFtyYW5kXSA9IHZhbHVlO1xuICAgIH0pO1xuICAgIHJldHVybiBzaHVmZmxlZDtcbiAgfTtcblxuICAvLyBTYW1wbGUgKipuKiogcmFuZG9tIHZhbHVlcyBmcm9tIGEgY29sbGVjdGlvbi5cbiAgLy8gSWYgKipuKiogaXMgbm90IHNwZWNpZmllZCwgcmV0dXJucyBhIHNpbmdsZSByYW5kb20gZWxlbWVudC5cbiAgLy8gVGhlIGludGVybmFsIGBndWFyZGAgYXJndW1lbnQgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgbWFwYC5cbiAgXy5zYW1wbGUgPSBmdW5jdGlvbihvYmosIG4sIGd1YXJkKSB7XG4gICAgaWYgKG4gPT0gbnVsbCB8fCBndWFyZCkge1xuICAgICAgaWYgKG9iai5sZW5ndGggIT09ICtvYmoubGVuZ3RoKSBvYmogPSBfLnZhbHVlcyhvYmopO1xuICAgICAgcmV0dXJuIG9ialtfLnJhbmRvbShvYmoubGVuZ3RoIC0gMSldO1xuICAgIH1cbiAgICByZXR1cm4gXy5zaHVmZmxlKG9iaikuc2xpY2UoMCwgTWF0aC5tYXgoMCwgbikpO1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIHRvIGdlbmVyYXRlIGxvb2t1cCBpdGVyYXRvcnMuXG4gIHZhciBsb29rdXBJdGVyYXRvciA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09IG51bGwpIHJldHVybiBfLmlkZW50aXR5O1xuICAgIGlmIChfLmlzRnVuY3Rpb24odmFsdWUpKSByZXR1cm4gdmFsdWU7XG4gICAgcmV0dXJuIF8ucHJvcGVydHkodmFsdWUpO1xuICB9O1xuXG4gIC8vIFNvcnQgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbiBwcm9kdWNlZCBieSBhbiBpdGVyYXRvci5cbiAgXy5zb3J0QnkgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0b3IgPSBsb29rdXBJdGVyYXRvcihpdGVyYXRvcik7XG4gICAgcmV0dXJuIF8ucGx1Y2soXy5tYXAob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgaW5kZXg6IGluZGV4LFxuICAgICAgICBjcml0ZXJpYTogaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpXG4gICAgICB9O1xuICAgIH0pLnNvcnQoZnVuY3Rpb24obGVmdCwgcmlnaHQpIHtcbiAgICAgIHZhciBhID0gbGVmdC5jcml0ZXJpYTtcbiAgICAgIHZhciBiID0gcmlnaHQuY3JpdGVyaWE7XG4gICAgICBpZiAoYSAhPT0gYikge1xuICAgICAgICBpZiAoYSA+IGIgfHwgYSA9PT0gdm9pZCAwKSByZXR1cm4gMTtcbiAgICAgICAgaWYgKGEgPCBiIHx8IGIgPT09IHZvaWQgMCkgcmV0dXJuIC0xO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGxlZnQuaW5kZXggLSByaWdodC5pbmRleDtcbiAgICB9KSwgJ3ZhbHVlJyk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdXNlZCBmb3IgYWdncmVnYXRlIFwiZ3JvdXAgYnlcIiBvcGVyYXRpb25zLlxuICB2YXIgZ3JvdXAgPSBmdW5jdGlvbihiZWhhdmlvcikge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKGl0ZXJhdG9yKTtcbiAgICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgICAgdmFyIGtleSA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBvYmopO1xuICAgICAgICBiZWhhdmlvcihyZXN1bHQsIGtleSwgdmFsdWUpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gR3JvdXBzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24uIFBhc3MgZWl0aGVyIGEgc3RyaW5nIGF0dHJpYnV0ZVxuICAvLyB0byBncm91cCBieSwgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlIGNyaXRlcmlvbi5cbiAgXy5ncm91cEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCBrZXksIHZhbHVlKSB7XG4gICAgXy5oYXMocmVzdWx0LCBrZXkpID8gcmVzdWx0W2tleV0ucHVzaCh2YWx1ZSkgOiByZXN1bHRba2V5XSA9IFt2YWx1ZV07XG4gIH0pO1xuXG4gIC8vIEluZGV4ZXMgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbiwgc2ltaWxhciB0byBgZ3JvdXBCeWAsIGJ1dCBmb3JcbiAgLy8gd2hlbiB5b3Uga25vdyB0aGF0IHlvdXIgaW5kZXggdmFsdWVzIHdpbGwgYmUgdW5pcXVlLlxuICBfLmluZGV4QnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIGtleSwgdmFsdWUpIHtcbiAgICByZXN1bHRba2V5XSA9IHZhbHVlO1xuICB9KTtcblxuICAvLyBDb3VudHMgaW5zdGFuY2VzIG9mIGFuIG9iamVjdCB0aGF0IGdyb3VwIGJ5IGEgY2VydGFpbiBjcml0ZXJpb24uIFBhc3NcbiAgLy8gZWl0aGVyIGEgc3RyaW5nIGF0dHJpYnV0ZSB0byBjb3VudCBieSwgb3IgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgdGhlXG4gIC8vIGNyaXRlcmlvbi5cbiAgXy5jb3VudEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCBrZXkpIHtcbiAgICBfLmhhcyhyZXN1bHQsIGtleSkgPyByZXN1bHRba2V5XSsrIDogcmVzdWx0W2tleV0gPSAxO1xuICB9KTtcblxuICAvLyBVc2UgYSBjb21wYXJhdG9yIGZ1bmN0aW9uIHRvIGZpZ3VyZSBvdXQgdGhlIHNtYWxsZXN0IGluZGV4IGF0IHdoaWNoXG4gIC8vIGFuIG9iamVjdCBzaG91bGQgYmUgaW5zZXJ0ZWQgc28gYXMgdG8gbWFpbnRhaW4gb3JkZXIuIFVzZXMgYmluYXJ5IHNlYXJjaC5cbiAgXy5zb3J0ZWRJbmRleCA9IGZ1bmN0aW9uKGFycmF5LCBvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaXRlcmF0b3IgPSBsb29rdXBJdGVyYXRvcihpdGVyYXRvcik7XG4gICAgdmFyIHZhbHVlID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmopO1xuICAgIHZhciBsb3cgPSAwLCBoaWdoID0gYXJyYXkubGVuZ3RoO1xuICAgIHdoaWxlIChsb3cgPCBoaWdoKSB7XG4gICAgICB2YXIgbWlkID0gKGxvdyArIGhpZ2gpID4+PiAxO1xuICAgICAgaXRlcmF0b3IuY2FsbChjb250ZXh0LCBhcnJheVttaWRdKSA8IHZhbHVlID8gbG93ID0gbWlkICsgMSA6IGhpZ2ggPSBtaWQ7XG4gICAgfVxuICAgIHJldHVybiBsb3c7XG4gIH07XG5cbiAgLy8gU2FmZWx5IGNyZWF0ZSBhIHJlYWwsIGxpdmUgYXJyYXkgZnJvbSBhbnl0aGluZyBpdGVyYWJsZS5cbiAgXy50b0FycmF5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFvYmopIHJldHVybiBbXTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikpIHJldHVybiBzbGljZS5jYWxsKG9iaik7XG4gICAgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSByZXR1cm4gXy5tYXAob2JqLCBfLmlkZW50aXR5KTtcbiAgICByZXR1cm4gXy52YWx1ZXMob2JqKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG51bWJlciBvZiBlbGVtZW50cyBpbiBhbiBvYmplY3QuXG4gIF8uc2l6ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIDA7XG4gICAgcmV0dXJuIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkgPyBvYmoubGVuZ3RoIDogXy5rZXlzKG9iaikubGVuZ3RoO1xuICB9O1xuXG4gIC8vIEFycmF5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS1cblxuICAvLyBHZXQgdGhlIGZpcnN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGZpcnN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgaGVhZGAgYW5kIGB0YWtlYC4gVGhlICoqZ3VhcmQqKiBjaGVja1xuICAvLyBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8uZmlyc3QgPSBfLmhlYWQgPSBfLnRha2UgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICBpZiAoKG4gPT0gbnVsbCkgfHwgZ3VhcmQpIHJldHVybiBhcnJheVswXTtcbiAgICBpZiAobiA8IDApIHJldHVybiBbXTtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgMCwgbik7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBldmVyeXRoaW5nIGJ1dCB0aGUgbGFzdCBlbnRyeSBvZiB0aGUgYXJyYXkuIEVzcGVjaWFsbHkgdXNlZnVsIG9uXG4gIC8vIHRoZSBhcmd1bWVudHMgb2JqZWN0LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIGFsbCB0aGUgdmFsdWVzIGluXG4gIC8vIHRoZSBhcnJheSwgZXhjbHVkaW5nIHRoZSBsYXN0IE4uIFRoZSAqKmd1YXJkKiogY2hlY2sgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aFxuICAvLyBgXy5tYXBgLlxuICBfLmluaXRpYWwgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgMCwgYXJyYXkubGVuZ3RoIC0gKChuID09IG51bGwpIHx8IGd1YXJkID8gMSA6IG4pKTtcbiAgfTtcblxuICAvLyBHZXQgdGhlIGxhc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgbGFzdCBOXG4gIC8vIHZhbHVlcyBpbiB0aGUgYXJyYXkuIFRoZSAqKmd1YXJkKiogY2hlY2sgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLmxhc3QgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICBpZiAoKG4gPT0gbnVsbCkgfHwgZ3VhcmQpIHJldHVybiBhcnJheVthcnJheS5sZW5ndGggLSAxXTtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgTWF0aC5tYXgoYXJyYXkubGVuZ3RoIC0gbiwgMCkpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGZpcnN0IGVudHJ5IG9mIHRoZSBhcnJheS4gQWxpYXNlZCBhcyBgdGFpbGAgYW5kIGBkcm9wYC5cbiAgLy8gRXNwZWNpYWxseSB1c2VmdWwgb24gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgYW4gKipuKiogd2lsbCByZXR1cm5cbiAgLy8gdGhlIHJlc3QgTiB2YWx1ZXMgaW4gdGhlIGFycmF5LiBUaGUgKipndWFyZCoqXG4gIC8vIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5yZXN0ID0gXy50YWlsID0gXy5kcm9wID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIChuID09IG51bGwpIHx8IGd1YXJkID8gMSA6IG4pO1xuICB9O1xuXG4gIC8vIFRyaW0gb3V0IGFsbCBmYWxzeSB2YWx1ZXMgZnJvbSBhbiBhcnJheS5cbiAgXy5jb21wYWN0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIF8uaWRlbnRpdHkpO1xuICB9O1xuXG4gIC8vIEludGVybmFsIGltcGxlbWVudGF0aW9uIG9mIGEgcmVjdXJzaXZlIGBmbGF0dGVuYCBmdW5jdGlvbi5cbiAgdmFyIGZsYXR0ZW4gPSBmdW5jdGlvbihpbnB1dCwgc2hhbGxvdywgb3V0cHV0KSB7XG4gICAgaWYgKHNoYWxsb3cgJiYgXy5ldmVyeShpbnB1dCwgXy5pc0FycmF5KSkge1xuICAgICAgcmV0dXJuIGNvbmNhdC5hcHBseShvdXRwdXQsIGlucHV0KTtcbiAgICB9XG4gICAgZWFjaChpbnB1dCwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmIChfLmlzQXJyYXkodmFsdWUpIHx8IF8uaXNBcmd1bWVudHModmFsdWUpKSB7XG4gICAgICAgIHNoYWxsb3cgPyBwdXNoLmFwcGx5KG91dHB1dCwgdmFsdWUpIDogZmxhdHRlbih2YWx1ZSwgc2hhbGxvdywgb3V0cHV0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dHB1dC5wdXNoKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb3V0cHV0O1xuICB9O1xuXG4gIC8vIEZsYXR0ZW4gb3V0IGFuIGFycmF5LCBlaXRoZXIgcmVjdXJzaXZlbHkgKGJ5IGRlZmF1bHQpLCBvciBqdXN0IG9uZSBsZXZlbC5cbiAgXy5mbGF0dGVuID0gZnVuY3Rpb24oYXJyYXksIHNoYWxsb3cpIHtcbiAgICByZXR1cm4gZmxhdHRlbihhcnJheSwgc2hhbGxvdywgW10pO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHZlcnNpb24gb2YgdGhlIGFycmF5IHRoYXQgZG9lcyBub3QgY29udGFpbiB0aGUgc3BlY2lmaWVkIHZhbHVlKHMpLlxuICBfLndpdGhvdXQgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmRpZmZlcmVuY2UoYXJyYXksIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gIH07XG5cbiAgLy8gU3BsaXQgYW4gYXJyYXkgaW50byB0d28gYXJyYXlzOiBvbmUgd2hvc2UgZWxlbWVudHMgYWxsIHNhdGlzZnkgdGhlIGdpdmVuXG4gIC8vIHByZWRpY2F0ZSwgYW5kIG9uZSB3aG9zZSBlbGVtZW50cyBhbGwgZG8gbm90IHNhdGlzZnkgdGhlIHByZWRpY2F0ZS5cbiAgXy5wYXJ0aXRpb24gPSBmdW5jdGlvbihhcnJheSwgcHJlZGljYXRlKSB7XG4gICAgdmFyIHBhc3MgPSBbXSwgZmFpbCA9IFtdO1xuICAgIGVhY2goYXJyYXksIGZ1bmN0aW9uKGVsZW0pIHtcbiAgICAgIChwcmVkaWNhdGUoZWxlbSkgPyBwYXNzIDogZmFpbCkucHVzaChlbGVtKTtcbiAgICB9KTtcbiAgICByZXR1cm4gW3Bhc3MsIGZhaWxdO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYSBkdXBsaWNhdGUtZnJlZSB2ZXJzaW9uIG9mIHRoZSBhcnJheS4gSWYgdGhlIGFycmF5IGhhcyBhbHJlYWR5XG4gIC8vIGJlZW4gc29ydGVkLCB5b3UgaGF2ZSB0aGUgb3B0aW9uIG9mIHVzaW5nIGEgZmFzdGVyIGFsZ29yaXRobS5cbiAgLy8gQWxpYXNlZCBhcyBgdW5pcXVlYC5cbiAgXy51bmlxID0gXy51bmlxdWUgPSBmdW5jdGlvbihhcnJheSwgaXNTb3J0ZWQsIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihpc1NvcnRlZCkpIHtcbiAgICAgIGNvbnRleHQgPSBpdGVyYXRvcjtcbiAgICAgIGl0ZXJhdG9yID0gaXNTb3J0ZWQ7XG4gICAgICBpc1NvcnRlZCA9IGZhbHNlO1xuICAgIH1cbiAgICB2YXIgaW5pdGlhbCA9IGl0ZXJhdG9yID8gXy5tYXAoYXJyYXksIGl0ZXJhdG9yLCBjb250ZXh0KSA6IGFycmF5O1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgdmFyIHNlZW4gPSBbXTtcbiAgICBlYWNoKGluaXRpYWwsIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgaWYgKGlzU29ydGVkID8gKCFpbmRleCB8fCBzZWVuW3NlZW4ubGVuZ3RoIC0gMV0gIT09IHZhbHVlKSA6ICFfLmNvbnRhaW5zKHNlZW4sIHZhbHVlKSkge1xuICAgICAgICBzZWVuLnB1c2godmFsdWUpO1xuICAgICAgICByZXN1bHRzLnB1c2goYXJyYXlbaW5kZXhdKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgdGhlIHVuaW9uOiBlYWNoIGRpc3RpbmN0IGVsZW1lbnQgZnJvbSBhbGwgb2ZcbiAgLy8gdGhlIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8udW5pb24gPSBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gXy51bmlxKF8uZmxhdHRlbihhcmd1bWVudHMsIHRydWUpKTtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGFuIGFycmF5IHRoYXQgY29udGFpbnMgZXZlcnkgaXRlbSBzaGFyZWQgYmV0d2VlbiBhbGwgdGhlXG4gIC8vIHBhc3NlZC1pbiBhcnJheXMuXG4gIF8uaW50ZXJzZWN0aW9uID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgcmVzdCA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gXy5maWx0ZXIoXy51bmlxKGFycmF5KSwgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgcmV0dXJuIF8uZXZlcnkocmVzdCwgZnVuY3Rpb24ob3RoZXIpIHtcbiAgICAgICAgcmV0dXJuIF8uY29udGFpbnMob3RoZXIsIGl0ZW0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gVGFrZSB0aGUgZGlmZmVyZW5jZSBiZXR3ZWVuIG9uZSBhcnJheSBhbmQgYSBudW1iZXIgb2Ygb3RoZXIgYXJyYXlzLlxuICAvLyBPbmx5IHRoZSBlbGVtZW50cyBwcmVzZW50IGluIGp1c3QgdGhlIGZpcnN0IGFycmF5IHdpbGwgcmVtYWluLlxuICBfLmRpZmZlcmVuY2UgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgcmV0dXJuIF8uZmlsdGVyKGFycmF5LCBmdW5jdGlvbih2YWx1ZSl7IHJldHVybiAhXy5jb250YWlucyhyZXN0LCB2YWx1ZSk7IH0pO1xuICB9O1xuXG4gIC8vIFppcCB0b2dldGhlciBtdWx0aXBsZSBsaXN0cyBpbnRvIGEgc2luZ2xlIGFycmF5IC0tIGVsZW1lbnRzIHRoYXQgc2hhcmVcbiAgLy8gYW4gaW5kZXggZ28gdG9nZXRoZXIuXG4gIF8uemlwID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGxlbmd0aCA9IF8ubWF4KF8ucGx1Y2soYXJndW1lbnRzLCAnbGVuZ3RoJykuY29uY2F0KDApKTtcbiAgICB2YXIgcmVzdWx0cyA9IG5ldyBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlc3VsdHNbaV0gPSBfLnBsdWNrKGFyZ3VtZW50cywgJycgKyBpKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gQ29udmVydHMgbGlzdHMgaW50byBvYmplY3RzLiBQYXNzIGVpdGhlciBhIHNpbmdsZSBhcnJheSBvZiBgW2tleSwgdmFsdWVdYFxuICAvLyBwYWlycywgb3IgdHdvIHBhcmFsbGVsIGFycmF5cyBvZiB0aGUgc2FtZSBsZW5ndGggLS0gb25lIG9mIGtleXMsIGFuZCBvbmUgb2ZcbiAgLy8gdGhlIGNvcnJlc3BvbmRpbmcgdmFsdWVzLlxuICBfLm9iamVjdCA9IGZ1bmN0aW9uKGxpc3QsIHZhbHVlcykge1xuICAgIGlmIChsaXN0ID09IG51bGwpIHJldHVybiB7fTtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGxpc3QubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICh2YWx1ZXMpIHtcbiAgICAgICAgcmVzdWx0W2xpc3RbaV1dID0gdmFsdWVzW2ldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzdWx0W2xpc3RbaV1bMF1dID0gbGlzdFtpXVsxXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBJZiB0aGUgYnJvd3NlciBkb2Vzbid0IHN1cHBseSB1cyB3aXRoIGluZGV4T2YgKEknbSBsb29raW5nIGF0IHlvdSwgKipNU0lFKiopLFxuICAvLyB3ZSBuZWVkIHRoaXMgZnVuY3Rpb24uIFJldHVybiB0aGUgcG9zaXRpb24gb2YgdGhlIGZpcnN0IG9jY3VycmVuY2Ugb2YgYW5cbiAgLy8gaXRlbSBpbiBhbiBhcnJheSwgb3IgLTEgaWYgdGhlIGl0ZW0gaXMgbm90IGluY2x1ZGVkIGluIHRoZSBhcnJheS5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGluZGV4T2ZgIGlmIGF2YWlsYWJsZS5cbiAgLy8gSWYgdGhlIGFycmF5IGlzIGxhcmdlIGFuZCBhbHJlYWR5IGluIHNvcnQgb3JkZXIsIHBhc3MgYHRydWVgXG4gIC8vIGZvciAqKmlzU29ydGVkKiogdG8gdXNlIGJpbmFyeSBzZWFyY2guXG4gIF8uaW5kZXhPZiA9IGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBpc1NvcnRlZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gLTE7XG4gICAgdmFyIGkgPSAwLCBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG4gICAgaWYgKGlzU29ydGVkKSB7XG4gICAgICBpZiAodHlwZW9mIGlzU29ydGVkID09ICdudW1iZXInKSB7XG4gICAgICAgIGkgPSAoaXNTb3J0ZWQgPCAwID8gTWF0aC5tYXgoMCwgbGVuZ3RoICsgaXNTb3J0ZWQpIDogaXNTb3J0ZWQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaSA9IF8uc29ydGVkSW5kZXgoYXJyYXksIGl0ZW0pO1xuICAgICAgICByZXR1cm4gYXJyYXlbaV0gPT09IGl0ZW0gPyBpIDogLTE7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChuYXRpdmVJbmRleE9mICYmIGFycmF5LmluZGV4T2YgPT09IG5hdGl2ZUluZGV4T2YpIHJldHVybiBhcnJheS5pbmRleE9mKGl0ZW0sIGlzU29ydGVkKTtcbiAgICBmb3IgKDsgaSA8IGxlbmd0aDsgaSsrKSBpZiAoYXJyYXlbaV0gPT09IGl0ZW0pIHJldHVybiBpO1xuICAgIHJldHVybiAtMTtcbiAgfTtcblxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgbGFzdEluZGV4T2ZgIGlmIGF2YWlsYWJsZS5cbiAgXy5sYXN0SW5kZXhPZiA9IGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBmcm9tKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiAtMTtcbiAgICB2YXIgaGFzSW5kZXggPSBmcm9tICE9IG51bGw7XG4gICAgaWYgKG5hdGl2ZUxhc3RJbmRleE9mICYmIGFycmF5Lmxhc3RJbmRleE9mID09PSBuYXRpdmVMYXN0SW5kZXhPZikge1xuICAgICAgcmV0dXJuIGhhc0luZGV4ID8gYXJyYXkubGFzdEluZGV4T2YoaXRlbSwgZnJvbSkgOiBhcnJheS5sYXN0SW5kZXhPZihpdGVtKTtcbiAgICB9XG4gICAgdmFyIGkgPSAoaGFzSW5kZXggPyBmcm9tIDogYXJyYXkubGVuZ3RoKTtcbiAgICB3aGlsZSAoaS0tKSBpZiAoYXJyYXlbaV0gPT09IGl0ZW0pIHJldHVybiBpO1xuICAgIHJldHVybiAtMTtcbiAgfTtcblxuICAvLyBHZW5lcmF0ZSBhbiBpbnRlZ2VyIEFycmF5IGNvbnRhaW5pbmcgYW4gYXJpdGhtZXRpYyBwcm9ncmVzc2lvbi4gQSBwb3J0IG9mXG4gIC8vIHRoZSBuYXRpdmUgUHl0aG9uIGByYW5nZSgpYCBmdW5jdGlvbi4gU2VlXG4gIC8vIFt0aGUgUHl0aG9uIGRvY3VtZW50YXRpb25dKGh0dHA6Ly9kb2NzLnB5dGhvbi5vcmcvbGlicmFyeS9mdW5jdGlvbnMuaHRtbCNyYW5nZSkuXG4gIF8ucmFuZ2UgPSBmdW5jdGlvbihzdGFydCwgc3RvcCwgc3RlcCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDw9IDEpIHtcbiAgICAgIHN0b3AgPSBzdGFydCB8fCAwO1xuICAgICAgc3RhcnQgPSAwO1xuICAgIH1cbiAgICBzdGVwID0gYXJndW1lbnRzWzJdIHx8IDE7XG5cbiAgICB2YXIgbGVuZ3RoID0gTWF0aC5tYXgoTWF0aC5jZWlsKChzdG9wIC0gc3RhcnQpIC8gc3RlcCksIDApO1xuICAgIHZhciBpZHggPSAwO1xuICAgIHZhciByYW5nZSA9IG5ldyBBcnJheShsZW5ndGgpO1xuXG4gICAgd2hpbGUoaWR4IDwgbGVuZ3RoKSB7XG4gICAgICByYW5nZVtpZHgrK10gPSBzdGFydDtcbiAgICAgIHN0YXJ0ICs9IHN0ZXA7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJhbmdlO1xuICB9O1xuXG4gIC8vIEZ1bmN0aW9uIChhaGVtKSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUmV1c2FibGUgY29uc3RydWN0b3IgZnVuY3Rpb24gZm9yIHByb3RvdHlwZSBzZXR0aW5nLlxuICB2YXIgY3RvciA9IGZ1bmN0aW9uKCl7fTtcblxuICAvLyBDcmVhdGUgYSBmdW5jdGlvbiBib3VuZCB0byBhIGdpdmVuIG9iamVjdCAoYXNzaWduaW5nIGB0aGlzYCwgYW5kIGFyZ3VtZW50cyxcbiAgLy8gb3B0aW9uYWxseSkuIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBGdW5jdGlvbi5iaW5kYCBpZlxuICAvLyBhdmFpbGFibGUuXG4gIF8uYmluZCA9IGZ1bmN0aW9uKGZ1bmMsIGNvbnRleHQpIHtcbiAgICB2YXIgYXJncywgYm91bmQ7XG4gICAgaWYgKG5hdGl2ZUJpbmQgJiYgZnVuYy5iaW5kID09PSBuYXRpdmVCaW5kKSByZXR1cm4gbmF0aXZlQmluZC5hcHBseShmdW5jLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGlmICghXy5pc0Z1bmN0aW9uKGZ1bmMpKSB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICAgIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgcmV0dXJuIGJvdW5kID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgYm91bmQpKSByZXR1cm4gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgIGN0b3IucHJvdG90eXBlID0gZnVuYy5wcm90b3R5cGU7XG4gICAgICB2YXIgc2VsZiA9IG5ldyBjdG9yO1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSBudWxsO1xuICAgICAgdmFyIHJlc3VsdCA9IGZ1bmMuYXBwbHkoc2VsZiwgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgICBpZiAoT2JqZWN0KHJlc3VsdCkgPT09IHJlc3VsdCkgcmV0dXJuIHJlc3VsdDtcbiAgICAgIHJldHVybiBzZWxmO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUGFydGlhbGx5IGFwcGx5IGEgZnVuY3Rpb24gYnkgY3JlYXRpbmcgYSB2ZXJzaW9uIHRoYXQgaGFzIGhhZCBzb21lIG9mIGl0c1xuICAvLyBhcmd1bWVudHMgcHJlLWZpbGxlZCwgd2l0aG91dCBjaGFuZ2luZyBpdHMgZHluYW1pYyBgdGhpc2AgY29udGV4dC4gXyBhY3RzXG4gIC8vIGFzIGEgcGxhY2Vob2xkZXIsIGFsbG93aW5nIGFueSBjb21iaW5hdGlvbiBvZiBhcmd1bWVudHMgdG8gYmUgcHJlLWZpbGxlZC5cbiAgXy5wYXJ0aWFsID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHZhciBib3VuZEFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHBvc2l0aW9uID0gMDtcbiAgICAgIHZhciBhcmdzID0gYm91bmRBcmdzLnNsaWNlKCk7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gYXJncy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoYXJnc1tpXSA9PT0gXykgYXJnc1tpXSA9IGFyZ3VtZW50c1twb3NpdGlvbisrXTtcbiAgICAgIH1cbiAgICAgIHdoaWxlIChwb3NpdGlvbiA8IGFyZ3VtZW50cy5sZW5ndGgpIGFyZ3MucHVzaChhcmd1bWVudHNbcG9zaXRpb24rK10pO1xuICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBCaW5kIGEgbnVtYmVyIG9mIGFuIG9iamVjdCdzIG1ldGhvZHMgdG8gdGhhdCBvYmplY3QuIFJlbWFpbmluZyBhcmd1bWVudHNcbiAgLy8gYXJlIHRoZSBtZXRob2QgbmFtZXMgdG8gYmUgYm91bmQuIFVzZWZ1bCBmb3IgZW5zdXJpbmcgdGhhdCBhbGwgY2FsbGJhY2tzXG4gIC8vIGRlZmluZWQgb24gYW4gb2JqZWN0IGJlbG9uZyB0byBpdC5cbiAgXy5iaW5kQWxsID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGZ1bmNzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIGlmIChmdW5jcy5sZW5ndGggPT09IDApIHRocm93IG5ldyBFcnJvcignYmluZEFsbCBtdXN0IGJlIHBhc3NlZCBmdW5jdGlvbiBuYW1lcycpO1xuICAgIGVhY2goZnVuY3MsIGZ1bmN0aW9uKGYpIHsgb2JqW2ZdID0gXy5iaW5kKG9ialtmXSwgb2JqKTsgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBNZW1vaXplIGFuIGV4cGVuc2l2ZSBmdW5jdGlvbiBieSBzdG9yaW5nIGl0cyByZXN1bHRzLlxuICBfLm1lbW9pemUgPSBmdW5jdGlvbihmdW5jLCBoYXNoZXIpIHtcbiAgICB2YXIgbWVtbyA9IHt9O1xuICAgIGhhc2hlciB8fCAoaGFzaGVyID0gXy5pZGVudGl0eSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGtleSA9IGhhc2hlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIF8uaGFzKG1lbW8sIGtleSkgPyBtZW1vW2tleV0gOiAobWVtb1trZXldID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIERlbGF5cyBhIGZ1bmN0aW9uIGZvciB0aGUgZ2l2ZW4gbnVtYmVyIG9mIG1pbGxpc2Vjb25kcywgYW5kIHRoZW4gY2FsbHNcbiAgLy8gaXQgd2l0aCB0aGUgYXJndW1lbnRzIHN1cHBsaWVkLlxuICBfLmRlbGF5ID0gZnVuY3Rpb24oZnVuYywgd2FpdCkge1xuICAgIHZhciBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7IHJldHVybiBmdW5jLmFwcGx5KG51bGwsIGFyZ3MpOyB9LCB3YWl0KTtcbiAgfTtcblxuICAvLyBEZWZlcnMgYSBmdW5jdGlvbiwgc2NoZWR1bGluZyBpdCB0byBydW4gYWZ0ZXIgdGhlIGN1cnJlbnQgY2FsbCBzdGFjayBoYXNcbiAgLy8gY2xlYXJlZC5cbiAgXy5kZWZlciA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICByZXR1cm4gXy5kZWxheS5hcHBseShfLCBbZnVuYywgMV0uY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSkpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgd2hlbiBpbnZva2VkLCB3aWxsIG9ubHkgYmUgdHJpZ2dlcmVkIGF0IG1vc3Qgb25jZVxuICAvLyBkdXJpbmcgYSBnaXZlbiB3aW5kb3cgb2YgdGltZS4gTm9ybWFsbHksIHRoZSB0aHJvdHRsZWQgZnVuY3Rpb24gd2lsbCBydW5cbiAgLy8gYXMgbXVjaCBhcyBpdCBjYW4sIHdpdGhvdXQgZXZlciBnb2luZyBtb3JlIHRoYW4gb25jZSBwZXIgYHdhaXRgIGR1cmF0aW9uO1xuICAvLyBidXQgaWYgeW91J2QgbGlrZSB0byBkaXNhYmxlIHRoZSBleGVjdXRpb24gb24gdGhlIGxlYWRpbmcgZWRnZSwgcGFzc1xuICAvLyBge2xlYWRpbmc6IGZhbHNlfWAuIFRvIGRpc2FibGUgZXhlY3V0aW9uIG9uIHRoZSB0cmFpbGluZyBlZGdlLCBkaXR0by5cbiAgXy50aHJvdHRsZSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQsIG9wdGlvbnMpIHtcbiAgICB2YXIgY29udGV4dCwgYXJncywgcmVzdWx0O1xuICAgIHZhciB0aW1lb3V0ID0gbnVsbDtcbiAgICB2YXIgcHJldmlvdXMgPSAwO1xuICAgIG9wdGlvbnMgfHwgKG9wdGlvbnMgPSB7fSk7XG4gICAgdmFyIGxhdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICBwcmV2aW91cyA9IG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UgPyAwIDogXy5ub3coKTtcbiAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICB9O1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBub3cgPSBfLm5vdygpO1xuICAgICAgaWYgKCFwcmV2aW91cyAmJiBvcHRpb25zLmxlYWRpbmcgPT09IGZhbHNlKSBwcmV2aW91cyA9IG5vdztcbiAgICAgIHZhciByZW1haW5pbmcgPSB3YWl0IC0gKG5vdyAtIHByZXZpb3VzKTtcbiAgICAgIGNvbnRleHQgPSB0aGlzO1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIGlmIChyZW1haW5pbmcgPD0gMCkge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICBwcmV2aW91cyA9IG5vdztcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfSBlbHNlIGlmICghdGltZW91dCAmJiBvcHRpb25zLnRyYWlsaW5nICE9PSBmYWxzZSkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgcmVtYWluaW5nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIGFzIGxvbmcgYXMgaXQgY29udGludWVzIHRvIGJlIGludm9rZWQsIHdpbGwgbm90XG4gIC8vIGJlIHRyaWdnZXJlZC4gVGhlIGZ1bmN0aW9uIHdpbGwgYmUgY2FsbGVkIGFmdGVyIGl0IHN0b3BzIGJlaW5nIGNhbGxlZCBmb3JcbiAgLy8gTiBtaWxsaXNlY29uZHMuIElmIGBpbW1lZGlhdGVgIGlzIHBhc3NlZCwgdHJpZ2dlciB0aGUgZnVuY3Rpb24gb24gdGhlXG4gIC8vIGxlYWRpbmcgZWRnZSwgaW5zdGVhZCBvZiB0aGUgdHJhaWxpbmcuXG4gIF8uZGVib3VuY2UgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBpbW1lZGlhdGUpIHtcbiAgICB2YXIgdGltZW91dCwgYXJncywgY29udGV4dCwgdGltZXN0YW1wLCByZXN1bHQ7XG5cbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBsYXN0ID0gXy5ub3coKSAtIHRpbWVzdGFtcDtcbiAgICAgIGlmIChsYXN0IDwgd2FpdCkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCAtIGxhc3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIGlmICghaW1tZWRpYXRlKSB7XG4gICAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgdGltZXN0YW1wID0gXy5ub3coKTtcbiAgICAgIHZhciBjYWxsTm93ID0gaW1tZWRpYXRlICYmICF0aW1lb3V0O1xuICAgICAgaWYgKCF0aW1lb3V0KSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0KTtcbiAgICAgIH1cbiAgICAgIGlmIChjYWxsTm93KSB7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgYmUgZXhlY3V0ZWQgYXQgbW9zdCBvbmUgdGltZSwgbm8gbWF0dGVyIGhvd1xuICAvLyBvZnRlbiB5b3UgY2FsbCBpdC4gVXNlZnVsIGZvciBsYXp5IGluaXRpYWxpemF0aW9uLlxuICBfLm9uY2UgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIHJhbiA9IGZhbHNlLCBtZW1vO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmIChyYW4pIHJldHVybiBtZW1vO1xuICAgICAgcmFuID0gdHJ1ZTtcbiAgICAgIG1lbW8gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICBmdW5jID0gbnVsbDtcbiAgICAgIHJldHVybiBtZW1vO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyB0aGUgZmlyc3QgZnVuY3Rpb24gcGFzc2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBzZWNvbmQsXG4gIC8vIGFsbG93aW5nIHlvdSB0byBhZGp1c3QgYXJndW1lbnRzLCBydW4gY29kZSBiZWZvcmUgYW5kIGFmdGVyLCBhbmRcbiAgLy8gY29uZGl0aW9uYWxseSBleGVjdXRlIHRoZSBvcmlnaW5hbCBmdW5jdGlvbi5cbiAgXy53cmFwID0gZnVuY3Rpb24oZnVuYywgd3JhcHBlcikge1xuICAgIHJldHVybiBfLnBhcnRpYWwod3JhcHBlciwgZnVuYyk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgaXMgdGhlIGNvbXBvc2l0aW9uIG9mIGEgbGlzdCBvZiBmdW5jdGlvbnMsIGVhY2hcbiAgLy8gY29uc3VtaW5nIHRoZSByZXR1cm4gdmFsdWUgb2YgdGhlIGZ1bmN0aW9uIHRoYXQgZm9sbG93cy5cbiAgXy5jb21wb3NlID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGZ1bmNzID0gYXJndW1lbnRzO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgZm9yICh2YXIgaSA9IGZ1bmNzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgIGFyZ3MgPSBbZnVuY3NbaV0uYXBwbHkodGhpcywgYXJncyldO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGFyZ3NbMF07XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIG9ubHkgYmUgZXhlY3V0ZWQgYWZ0ZXIgYmVpbmcgY2FsbGVkIE4gdGltZXMuXG4gIF8uYWZ0ZXIgPSBmdW5jdGlvbih0aW1lcywgZnVuYykge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICgtLXRpbWVzIDwgMSkge1xuICAgICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgfVxuICAgIH07XG4gIH07XG5cbiAgLy8gT2JqZWN0IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUmV0cmlldmUgdGhlIG5hbWVzIG9mIGFuIG9iamVjdCdzIHByb3BlcnRpZXMuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBPYmplY3Qua2V5c2BcbiAgXy5rZXlzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KG9iaikpIHJldHVybiBbXTtcbiAgICBpZiAobmF0aXZlS2V5cykgcmV0dXJuIG5hdGl2ZUtleXMob2JqKTtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICAgIHJldHVybiBrZXlzO1xuICB9O1xuXG4gIC8vIFJldHJpZXZlIHRoZSB2YWx1ZXMgb2YgYW4gb2JqZWN0J3MgcHJvcGVydGllcy5cbiAgXy52YWx1ZXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgdmFsdWVzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgdmFsdWVzW2ldID0gb2JqW2tleXNbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWVzO1xuICB9O1xuXG4gIC8vIENvbnZlcnQgYW4gb2JqZWN0IGludG8gYSBsaXN0IG9mIGBba2V5LCB2YWx1ZV1gIHBhaXJzLlxuICBfLnBhaXJzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgdmFyIHBhaXJzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcGFpcnNbaV0gPSBba2V5c1tpXSwgb2JqW2tleXNbaV1dXTtcbiAgICB9XG4gICAgcmV0dXJuIHBhaXJzO1xuICB9O1xuXG4gIC8vIEludmVydCB0aGUga2V5cyBhbmQgdmFsdWVzIG9mIGFuIG9iamVjdC4gVGhlIHZhbHVlcyBtdXN0IGJlIHNlcmlhbGl6YWJsZS5cbiAgXy5pbnZlcnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0W29ialtrZXlzW2ldXV0gPSBrZXlzW2ldO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHNvcnRlZCBsaXN0IG9mIHRoZSBmdW5jdGlvbiBuYW1lcyBhdmFpbGFibGUgb24gdGhlIG9iamVjdC5cbiAgLy8gQWxpYXNlZCBhcyBgbWV0aG9kc2BcbiAgXy5mdW5jdGlvbnMgPSBfLm1ldGhvZHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgbmFtZXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAoXy5pc0Z1bmN0aW9uKG9ialtrZXldKSkgbmFtZXMucHVzaChrZXkpO1xuICAgIH1cbiAgICByZXR1cm4gbmFtZXMuc29ydCgpO1xuICB9O1xuXG4gIC8vIEV4dGVuZCBhIGdpdmVuIG9iamVjdCB3aXRoIGFsbCB0aGUgcHJvcGVydGllcyBpbiBwYXNzZWQtaW4gb2JqZWN0KHMpLlxuICBfLmV4dGVuZCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGVhY2goc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLCBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgIGlmIChzb3VyY2UpIHtcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgICBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCBvbmx5IGNvbnRhaW5pbmcgdGhlIHdoaXRlbGlzdGVkIHByb3BlcnRpZXMuXG4gIF8ucGljayA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBjb3B5ID0ge307XG4gICAgdmFyIGtleXMgPSBjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBlYWNoKGtleXMsIGZ1bmN0aW9uKGtleSkge1xuICAgICAgaWYgKGtleSBpbiBvYmopIGNvcHlba2V5XSA9IG9ialtrZXldO1xuICAgIH0pO1xuICAgIHJldHVybiBjb3B5O1xuICB9O1xuXG4gICAvLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBvYmplY3Qgd2l0aG91dCB0aGUgYmxhY2tsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5vbWl0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGNvcHkgPSB7fTtcbiAgICB2YXIga2V5cyA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmICghXy5jb250YWlucyhrZXlzLCBrZXkpKSBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgICB9XG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgLy8gRmlsbCBpbiBhIGdpdmVuIG9iamVjdCB3aXRoIGRlZmF1bHQgcHJvcGVydGllcy5cbiAgXy5kZWZhdWx0cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGVhY2goc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLCBmdW5jdGlvbihzb3VyY2UpIHtcbiAgICAgIGlmIChzb3VyY2UpIHtcbiAgICAgICAgZm9yICh2YXIgcHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgICBpZiAob2JqW3Byb3BdID09PSB2b2lkIDApIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gQ3JlYXRlIGEgKHNoYWxsb3ctY2xvbmVkKSBkdXBsaWNhdGUgb2YgYW4gb2JqZWN0LlxuICBfLmNsb25lID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKCFfLmlzT2JqZWN0KG9iaikpIHJldHVybiBvYmo7XG4gICAgcmV0dXJuIF8uaXNBcnJheShvYmopID8gb2JqLnNsaWNlKCkgOiBfLmV4dGVuZCh7fSwgb2JqKTtcbiAgfTtcblxuICAvLyBJbnZva2VzIGludGVyY2VwdG9yIHdpdGggdGhlIG9iaiwgYW5kIHRoZW4gcmV0dXJucyBvYmouXG4gIC8vIFRoZSBwcmltYXJ5IHB1cnBvc2Ugb2YgdGhpcyBtZXRob2QgaXMgdG8gXCJ0YXAgaW50b1wiIGEgbWV0aG9kIGNoYWluLCBpblxuICAvLyBvcmRlciB0byBwZXJmb3JtIG9wZXJhdGlvbnMgb24gaW50ZXJtZWRpYXRlIHJlc3VsdHMgd2l0aGluIHRoZSBjaGFpbi5cbiAgXy50YXAgPSBmdW5jdGlvbihvYmosIGludGVyY2VwdG9yKSB7XG4gICAgaW50ZXJjZXB0b3Iob2JqKTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIEludGVybmFsIHJlY3Vyc2l2ZSBjb21wYXJpc29uIGZ1bmN0aW9uIGZvciBgaXNFcXVhbGAuXG4gIHZhciBlcSA9IGZ1bmN0aW9uKGEsIGIsIGFTdGFjaywgYlN0YWNrKSB7XG4gICAgLy8gSWRlbnRpY2FsIG9iamVjdHMgYXJlIGVxdWFsLiBgMCA9PT0gLTBgLCBidXQgdGhleSBhcmVuJ3QgaWRlbnRpY2FsLlxuICAgIC8vIFNlZSB0aGUgW0hhcm1vbnkgYGVnYWxgIHByb3Bvc2FsXShodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmVnYWwpLlxuICAgIGlmIChhID09PSBiKSByZXR1cm4gYSAhPT0gMCB8fCAxIC8gYSA9PSAxIC8gYjtcbiAgICAvLyBBIHN0cmljdCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeSBiZWNhdXNlIGBudWxsID09IHVuZGVmaW5lZGAuXG4gICAgaWYgKGEgPT0gbnVsbCB8fCBiID09IG51bGwpIHJldHVybiBhID09PSBiO1xuICAgIC8vIFVud3JhcCBhbnkgd3JhcHBlZCBvYmplY3RzLlxuICAgIGlmIChhIGluc3RhbmNlb2YgXykgYSA9IGEuX3dyYXBwZWQ7XG4gICAgaWYgKGIgaW5zdGFuY2VvZiBfKSBiID0gYi5fd3JhcHBlZDtcbiAgICAvLyBDb21wYXJlIGBbW0NsYXNzXV1gIG5hbWVzLlxuICAgIHZhciBjbGFzc05hbWUgPSB0b1N0cmluZy5jYWxsKGEpO1xuICAgIGlmIChjbGFzc05hbWUgIT0gdG9TdHJpbmcuY2FsbChiKSkgcmV0dXJuIGZhbHNlO1xuICAgIHN3aXRjaCAoY2xhc3NOYW1lKSB7XG4gICAgICAvLyBTdHJpbmdzLCBudW1iZXJzLCBkYXRlcywgYW5kIGJvb2xlYW5zIGFyZSBjb21wYXJlZCBieSB2YWx1ZS5cbiAgICAgIGNhc2UgJ1tvYmplY3QgU3RyaW5nXSc6XG4gICAgICAgIC8vIFByaW1pdGl2ZXMgYW5kIHRoZWlyIGNvcnJlc3BvbmRpbmcgb2JqZWN0IHdyYXBwZXJzIGFyZSBlcXVpdmFsZW50OyB0aHVzLCBgXCI1XCJgIGlzXG4gICAgICAgIC8vIGVxdWl2YWxlbnQgdG8gYG5ldyBTdHJpbmcoXCI1XCIpYC5cbiAgICAgICAgcmV0dXJuIGEgPT0gU3RyaW5nKGIpO1xuICAgICAgY2FzZSAnW29iamVjdCBOdW1iZXJdJzpcbiAgICAgICAgLy8gYE5hTmBzIGFyZSBlcXVpdmFsZW50LCBidXQgbm9uLXJlZmxleGl2ZS4gQW4gYGVnYWxgIGNvbXBhcmlzb24gaXMgcGVyZm9ybWVkIGZvclxuICAgICAgICAvLyBvdGhlciBudW1lcmljIHZhbHVlcy5cbiAgICAgICAgcmV0dXJuIGEgIT0gK2EgPyBiICE9ICtiIDogKGEgPT0gMCA/IDEgLyBhID09IDEgLyBiIDogYSA9PSArYik7XG4gICAgICBjYXNlICdbb2JqZWN0IERhdGVdJzpcbiAgICAgIGNhc2UgJ1tvYmplY3QgQm9vbGVhbl0nOlxuICAgICAgICAvLyBDb2VyY2UgZGF0ZXMgYW5kIGJvb2xlYW5zIHRvIG51bWVyaWMgcHJpbWl0aXZlIHZhbHVlcy4gRGF0ZXMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyXG4gICAgICAgIC8vIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9ucy4gTm90ZSB0aGF0IGludmFsaWQgZGF0ZXMgd2l0aCBtaWxsaXNlY29uZCByZXByZXNlbnRhdGlvbnNcbiAgICAgICAgLy8gb2YgYE5hTmAgYXJlIG5vdCBlcXVpdmFsZW50LlxuICAgICAgICByZXR1cm4gK2EgPT0gK2I7XG4gICAgICAvLyBSZWdFeHBzIGFyZSBjb21wYXJlZCBieSB0aGVpciBzb3VyY2UgcGF0dGVybnMgYW5kIGZsYWdzLlxuICAgICAgY2FzZSAnW29iamVjdCBSZWdFeHBdJzpcbiAgICAgICAgcmV0dXJuIGEuc291cmNlID09IGIuc291cmNlICYmXG4gICAgICAgICAgICAgICBhLmdsb2JhbCA9PSBiLmdsb2JhbCAmJlxuICAgICAgICAgICAgICAgYS5tdWx0aWxpbmUgPT0gYi5tdWx0aWxpbmUgJiZcbiAgICAgICAgICAgICAgIGEuaWdub3JlQ2FzZSA9PSBiLmlnbm9yZUNhc2U7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgYSAhPSAnb2JqZWN0JyB8fCB0eXBlb2YgYiAhPSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xuICAgIC8vIEFzc3VtZSBlcXVhbGl0eSBmb3IgY3ljbGljIHN0cnVjdHVyZXMuIFRoZSBhbGdvcml0aG0gZm9yIGRldGVjdGluZyBjeWNsaWNcbiAgICAvLyBzdHJ1Y3R1cmVzIGlzIGFkYXB0ZWQgZnJvbSBFUyA1LjEgc2VjdGlvbiAxNS4xMi4zLCBhYnN0cmFjdCBvcGVyYXRpb24gYEpPYC5cbiAgICB2YXIgbGVuZ3RoID0gYVN0YWNrLmxlbmd0aDtcbiAgICB3aGlsZSAobGVuZ3RoLS0pIHtcbiAgICAgIC8vIExpbmVhciBzZWFyY2guIFBlcmZvcm1hbmNlIGlzIGludmVyc2VseSBwcm9wb3J0aW9uYWwgdG8gdGhlIG51bWJlciBvZlxuICAgICAgLy8gdW5pcXVlIG5lc3RlZCBzdHJ1Y3R1cmVzLlxuICAgICAgaWYgKGFTdGFja1tsZW5ndGhdID09IGEpIHJldHVybiBiU3RhY2tbbGVuZ3RoXSA9PSBiO1xuICAgIH1cbiAgICAvLyBPYmplY3RzIHdpdGggZGlmZmVyZW50IGNvbnN0cnVjdG9ycyBhcmUgbm90IGVxdWl2YWxlbnQsIGJ1dCBgT2JqZWN0YHNcbiAgICAvLyBmcm9tIGRpZmZlcmVudCBmcmFtZXMgYXJlLlxuICAgIHZhciBhQ3RvciA9IGEuY29uc3RydWN0b3IsIGJDdG9yID0gYi5jb25zdHJ1Y3RvcjtcbiAgICBpZiAoYUN0b3IgIT09IGJDdG9yICYmICEoXy5pc0Z1bmN0aW9uKGFDdG9yKSAmJiAoYUN0b3IgaW5zdGFuY2VvZiBhQ3RvcikgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXy5pc0Z1bmN0aW9uKGJDdG9yKSAmJiAoYkN0b3IgaW5zdGFuY2VvZiBiQ3RvcikpXG4gICAgICAgICAgICAgICAgICAgICAgICAmJiAoJ2NvbnN0cnVjdG9yJyBpbiBhICYmICdjb25zdHJ1Y3RvcicgaW4gYikpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8gQWRkIHRoZSBmaXJzdCBvYmplY3QgdG8gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIGFTdGFjay5wdXNoKGEpO1xuICAgIGJTdGFjay5wdXNoKGIpO1xuICAgIHZhciBzaXplID0gMCwgcmVzdWx0ID0gdHJ1ZTtcbiAgICAvLyBSZWN1cnNpdmVseSBjb21wYXJlIG9iamVjdHMgYW5kIGFycmF5cy5cbiAgICBpZiAoY2xhc3NOYW1lID09ICdbb2JqZWN0IEFycmF5XScpIHtcbiAgICAgIC8vIENvbXBhcmUgYXJyYXkgbGVuZ3RocyB0byBkZXRlcm1pbmUgaWYgYSBkZWVwIGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5LlxuICAgICAgc2l6ZSA9IGEubGVuZ3RoO1xuICAgICAgcmVzdWx0ID0gc2l6ZSA9PSBiLmxlbmd0aDtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgLy8gRGVlcCBjb21wYXJlIHRoZSBjb250ZW50cywgaWdub3Jpbmcgbm9uLW51bWVyaWMgcHJvcGVydGllcy5cbiAgICAgICAgd2hpbGUgKHNpemUtLSkge1xuICAgICAgICAgIGlmICghKHJlc3VsdCA9IGVxKGFbc2l6ZV0sIGJbc2l6ZV0sIGFTdGFjaywgYlN0YWNrKSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIERlZXAgY29tcGFyZSBvYmplY3RzLlxuICAgICAgZm9yICh2YXIga2V5IGluIGEpIHtcbiAgICAgICAgaWYgKF8uaGFzKGEsIGtleSkpIHtcbiAgICAgICAgICAvLyBDb3VudCB0aGUgZXhwZWN0ZWQgbnVtYmVyIG9mIHByb3BlcnRpZXMuXG4gICAgICAgICAgc2l6ZSsrO1xuICAgICAgICAgIC8vIERlZXAgY29tcGFyZSBlYWNoIG1lbWJlci5cbiAgICAgICAgICBpZiAoIShyZXN1bHQgPSBfLmhhcyhiLCBrZXkpICYmIGVxKGFba2V5XSwgYltrZXldLCBhU3RhY2ssIGJTdGFjaykpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgLy8gRW5zdXJlIHRoYXQgYm90aCBvYmplY3RzIGNvbnRhaW4gdGhlIHNhbWUgbnVtYmVyIG9mIHByb3BlcnRpZXMuXG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIGZvciAoa2V5IGluIGIpIHtcbiAgICAgICAgICBpZiAoXy5oYXMoYiwga2V5KSAmJiAhKHNpemUtLSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdCA9ICFzaXplO1xuICAgICAgfVxuICAgIH1cbiAgICAvLyBSZW1vdmUgdGhlIGZpcnN0IG9iamVjdCBmcm9tIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucG9wKCk7XG4gICAgYlN0YWNrLnBvcCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUGVyZm9ybSBhIGRlZXAgY29tcGFyaXNvbiB0byBjaGVjayBpZiB0d28gb2JqZWN0cyBhcmUgZXF1YWwuXG4gIF8uaXNFcXVhbCA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICByZXR1cm4gZXEoYSwgYiwgW10sIFtdKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIGFycmF5LCBzdHJpbmcsIG9yIG9iamVjdCBlbXB0eT9cbiAgLy8gQW4gXCJlbXB0eVwiIG9iamVjdCBoYXMgbm8gZW51bWVyYWJsZSBvd24tcHJvcGVydGllcy5cbiAgXy5pc0VtcHR5ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoXy5pc0FycmF5KG9iaikgfHwgXy5pc1N0cmluZyhvYmopKSByZXR1cm4gb2JqLmxlbmd0aCA9PT0gMDtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBpZiAoXy5oYXMob2JqLCBrZXkpKSByZXR1cm4gZmFsc2U7XG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIERPTSBlbGVtZW50P1xuICBfLmlzRWxlbWVudCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiAhIShvYmogJiYgb2JqLm5vZGVUeXBlID09PSAxKTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGFuIGFycmF5P1xuICAvLyBEZWxlZ2F0ZXMgdG8gRUNNQTUncyBuYXRpdmUgQXJyYXkuaXNBcnJheVxuICBfLmlzQXJyYXkgPSBuYXRpdmVJc0FycmF5IHx8IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhcmlhYmxlIGFuIG9iamVjdD9cbiAgXy5pc09iamVjdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IE9iamVjdChvYmopO1xuICB9O1xuXG4gIC8vIEFkZCBzb21lIGlzVHlwZSBtZXRob2RzOiBpc0FyZ3VtZW50cywgaXNGdW5jdGlvbiwgaXNTdHJpbmcsIGlzTnVtYmVyLCBpc0RhdGUsIGlzUmVnRXhwLlxuICBlYWNoKFsnQXJndW1lbnRzJywgJ0Z1bmN0aW9uJywgJ1N0cmluZycsICdOdW1iZXInLCAnRGF0ZScsICdSZWdFeHAnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIF9bJ2lzJyArIG5hbWVdID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0ICcgKyBuYW1lICsgJ10nO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIERlZmluZSBhIGZhbGxiYWNrIHZlcnNpb24gb2YgdGhlIG1ldGhvZCBpbiBicm93c2VycyAoYWhlbSwgSUUpLCB3aGVyZVxuICAvLyB0aGVyZSBpc24ndCBhbnkgaW5zcGVjdGFibGUgXCJBcmd1bWVudHNcIiB0eXBlLlxuICBpZiAoIV8uaXNBcmd1bWVudHMoYXJndW1lbnRzKSkge1xuICAgIF8uaXNBcmd1bWVudHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiAhIShvYmogJiYgXy5oYXMob2JqLCAnY2FsbGVlJykpO1xuICAgIH07XG4gIH1cblxuICAvLyBPcHRpbWl6ZSBgaXNGdW5jdGlvbmAgaWYgYXBwcm9wcmlhdGUuXG4gIGlmICh0eXBlb2YgKC8uLykgIT09ICdmdW5jdGlvbicpIHtcbiAgICBfLmlzRnVuY3Rpb24gPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nO1xuICAgIH07XG4gIH1cblxuICAvLyBJcyBhIGdpdmVuIG9iamVjdCBhIGZpbml0ZSBudW1iZXI/XG4gIF8uaXNGaW5pdGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gaXNGaW5pdGUob2JqKSAmJiAhaXNOYU4ocGFyc2VGbG9hdChvYmopKTtcbiAgfTtcblxuICAvLyBJcyB0aGUgZ2l2ZW4gdmFsdWUgYE5hTmA/IChOYU4gaXMgdGhlIG9ubHkgbnVtYmVyIHdoaWNoIGRvZXMgbm90IGVxdWFsIGl0c2VsZikuXG4gIF8uaXNOYU4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXy5pc051bWJlcihvYmopICYmIG9iaiAhPSArb2JqO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYSBib29sZWFuP1xuICBfLmlzQm9vbGVhbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHRydWUgfHwgb2JqID09PSBmYWxzZSB8fCB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgZXF1YWwgdG8gbnVsbD9cbiAgXy5pc051bGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBudWxsO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgdW5kZWZpbmVkP1xuICBfLmlzVW5kZWZpbmVkID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdm9pZCAwO1xuICB9O1xuXG4gIC8vIFNob3J0Y3V0IGZ1bmN0aW9uIGZvciBjaGVja2luZyBpZiBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gcHJvcGVydHkgZGlyZWN0bHlcbiAgLy8gb24gaXRzZWxmIChpbiBvdGhlciB3b3Jkcywgbm90IG9uIGEgcHJvdG90eXBlKS5cbiAgXy5oYXMgPSBmdW5jdGlvbihvYmosIGtleSkge1xuICAgIHJldHVybiBoYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KTtcbiAgfTtcblxuICAvLyBVdGlsaXR5IEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJ1biBVbmRlcnNjb3JlLmpzIGluICpub0NvbmZsaWN0KiBtb2RlLCByZXR1cm5pbmcgdGhlIGBfYCB2YXJpYWJsZSB0byBpdHNcbiAgLy8gcHJldmlvdXMgb3duZXIuIFJldHVybnMgYSByZWZlcmVuY2UgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm5vQ29uZmxpY3QgPSBmdW5jdGlvbigpIHtcbiAgICByb290Ll8gPSBwcmV2aW91c1VuZGVyc2NvcmU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbiAgLy8gS2VlcCB0aGUgaWRlbnRpdHkgZnVuY3Rpb24gYXJvdW5kIGZvciBkZWZhdWx0IGl0ZXJhdG9ycy5cbiAgXy5pZGVudGl0eSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9O1xuXG4gIF8uY29uc3RhbnQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgfTtcblxuICBfLnByb3BlcnR5ID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIG9ialtrZXldO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIHByZWRpY2F0ZSBmb3IgY2hlY2tpbmcgd2hldGhlciBhbiBvYmplY3QgaGFzIGEgZ2l2ZW4gc2V0IG9mIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLm1hdGNoZXMgPSBmdW5jdGlvbihhdHRycykge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgIGlmIChvYmogPT09IGF0dHJzKSByZXR1cm4gdHJ1ZTsgLy9hdm9pZCBjb21wYXJpbmcgYW4gb2JqZWN0IHRvIGl0c2VsZi5cbiAgICAgIGZvciAodmFyIGtleSBpbiBhdHRycykge1xuICAgICAgICBpZiAoYXR0cnNba2V5XSAhPT0gb2JqW2tleV0pXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9O1xuXG4gIC8vIFJ1biBhIGZ1bmN0aW9uICoqbioqIHRpbWVzLlxuICBfLnRpbWVzID0gZnVuY3Rpb24obiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgYWNjdW0gPSBBcnJheShNYXRoLm1heCgwLCBuKSk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIGFjY3VtW2ldID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBpKTtcbiAgICByZXR1cm4gYWNjdW07XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgcmFuZG9tIGludGVnZXIgYmV0d2VlbiBtaW4gYW5kIG1heCAoaW5jbHVzaXZlKS5cbiAgXy5yYW5kb20gPSBmdW5jdGlvbihtaW4sIG1heCkge1xuICAgIGlmIChtYXggPT0gbnVsbCkge1xuICAgICAgbWF4ID0gbWluO1xuICAgICAgbWluID0gMDtcbiAgICB9XG4gICAgcmV0dXJuIG1pbiArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSk7XG4gIH07XG5cbiAgLy8gQSAocG9zc2libHkgZmFzdGVyKSB3YXkgdG8gZ2V0IHRoZSBjdXJyZW50IHRpbWVzdGFtcCBhcyBhbiBpbnRlZ2VyLlxuICBfLm5vdyA9IERhdGUubm93IHx8IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmV3IERhdGUoKS5nZXRUaW1lKCk7IH07XG5cbiAgLy8gTGlzdCBvZiBIVE1MIGVudGl0aWVzIGZvciBlc2NhcGluZy5cbiAgdmFyIGVudGl0eU1hcCA9IHtcbiAgICBlc2NhcGU6IHtcbiAgICAgICcmJzogJyZhbXA7JyxcbiAgICAgICc8JzogJyZsdDsnLFxuICAgICAgJz4nOiAnJmd0OycsXG4gICAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICAgIFwiJ1wiOiAnJiN4Mjc7J1xuICAgIH1cbiAgfTtcbiAgZW50aXR5TWFwLnVuZXNjYXBlID0gXy5pbnZlcnQoZW50aXR5TWFwLmVzY2FwZSk7XG5cbiAgLy8gUmVnZXhlcyBjb250YWluaW5nIHRoZSBrZXlzIGFuZCB2YWx1ZXMgbGlzdGVkIGltbWVkaWF0ZWx5IGFib3ZlLlxuICB2YXIgZW50aXR5UmVnZXhlcyA9IHtcbiAgICBlc2NhcGU6ICAgbmV3IFJlZ0V4cCgnWycgKyBfLmtleXMoZW50aXR5TWFwLmVzY2FwZSkuam9pbignJykgKyAnXScsICdnJyksXG4gICAgdW5lc2NhcGU6IG5ldyBSZWdFeHAoJygnICsgXy5rZXlzKGVudGl0eU1hcC51bmVzY2FwZSkuam9pbignfCcpICsgJyknLCAnZycpXG4gIH07XG5cbiAgLy8gRnVuY3Rpb25zIGZvciBlc2NhcGluZyBhbmQgdW5lc2NhcGluZyBzdHJpbmdzIHRvL2Zyb20gSFRNTCBpbnRlcnBvbGF0aW9uLlxuICBfLmVhY2goWydlc2NhcGUnLCAndW5lc2NhcGUnXSwgZnVuY3Rpb24obWV0aG9kKSB7XG4gICAgX1ttZXRob2RdID0gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICBpZiAoc3RyaW5nID09IG51bGwpIHJldHVybiAnJztcbiAgICAgIHJldHVybiAoJycgKyBzdHJpbmcpLnJlcGxhY2UoZW50aXR5UmVnZXhlc1ttZXRob2RdLCBmdW5jdGlvbihtYXRjaCkge1xuICAgICAgICByZXR1cm4gZW50aXR5TWFwW21ldGhvZF1bbWF0Y2hdO1xuICAgICAgfSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gSWYgdGhlIHZhbHVlIG9mIHRoZSBuYW1lZCBgcHJvcGVydHlgIGlzIGEgZnVuY3Rpb24gdGhlbiBpbnZva2UgaXQgd2l0aCB0aGVcbiAgLy8gYG9iamVjdGAgYXMgY29udGV4dDsgb3RoZXJ3aXNlLCByZXR1cm4gaXQuXG4gIF8ucmVzdWx0ID0gZnVuY3Rpb24ob2JqZWN0LCBwcm9wZXJ0eSkge1xuICAgIGlmIChvYmplY3QgPT0gbnVsbCkgcmV0dXJuIHZvaWQgMDtcbiAgICB2YXIgdmFsdWUgPSBvYmplY3RbcHJvcGVydHldO1xuICAgIHJldHVybiBfLmlzRnVuY3Rpb24odmFsdWUpID8gdmFsdWUuY2FsbChvYmplY3QpIDogdmFsdWU7XG4gIH07XG5cbiAgLy8gQWRkIHlvdXIgb3duIGN1c3RvbSBmdW5jdGlvbnMgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0LlxuICBfLm1peGluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChfLmZ1bmN0aW9ucyhvYmopLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgICB2YXIgZnVuYyA9IF9bbmFtZV0gPSBvYmpbbmFtZV07XG4gICAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYXJncyA9IFt0aGlzLl93cmFwcGVkXTtcbiAgICAgICAgcHVzaC5hcHBseShhcmdzLCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgZnVuYy5hcHBseShfLCBhcmdzKSk7XG4gICAgICB9O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGEgdW5pcXVlIGludGVnZXIgaWQgKHVuaXF1ZSB3aXRoaW4gdGhlIGVudGlyZSBjbGllbnQgc2Vzc2lvbikuXG4gIC8vIFVzZWZ1bCBmb3IgdGVtcG9yYXJ5IERPTSBpZHMuXG4gIHZhciBpZENvdW50ZXIgPSAwO1xuICBfLnVuaXF1ZUlkID0gZnVuY3Rpb24ocHJlZml4KSB7XG4gICAgdmFyIGlkID0gKytpZENvdW50ZXIgKyAnJztcbiAgICByZXR1cm4gcHJlZml4ID8gcHJlZml4ICsgaWQgOiBpZDtcbiAgfTtcblxuICAvLyBCeSBkZWZhdWx0LCBVbmRlcnNjb3JlIHVzZXMgRVJCLXN0eWxlIHRlbXBsYXRlIGRlbGltaXRlcnMsIGNoYW5nZSB0aGVcbiAgLy8gZm9sbG93aW5nIHRlbXBsYXRlIHNldHRpbmdzIHRvIHVzZSBhbHRlcm5hdGl2ZSBkZWxpbWl0ZXJzLlxuICBfLnRlbXBsYXRlU2V0dGluZ3MgPSB7XG4gICAgZXZhbHVhdGUgICAgOiAvPCUoW1xcc1xcU10rPyklPi9nLFxuICAgIGludGVycG9sYXRlIDogLzwlPShbXFxzXFxTXSs/KSU+L2csXG4gICAgZXNjYXBlICAgICAgOiAvPCUtKFtcXHNcXFNdKz8pJT4vZ1xuICB9O1xuXG4gIC8vIFdoZW4gY3VzdG9taXppbmcgYHRlbXBsYXRlU2V0dGluZ3NgLCBpZiB5b3UgZG9uJ3Qgd2FudCB0byBkZWZpbmUgYW5cbiAgLy8gaW50ZXJwb2xhdGlvbiwgZXZhbHVhdGlvbiBvciBlc2NhcGluZyByZWdleCwgd2UgbmVlZCBvbmUgdGhhdCBpc1xuICAvLyBndWFyYW50ZWVkIG5vdCB0byBtYXRjaC5cbiAgdmFyIG5vTWF0Y2ggPSAvKC4pXi87XG5cbiAgLy8gQ2VydGFpbiBjaGFyYWN0ZXJzIG5lZWQgdG8gYmUgZXNjYXBlZCBzbyB0aGF0IHRoZXkgY2FuIGJlIHB1dCBpbnRvIGFcbiAgLy8gc3RyaW5nIGxpdGVyYWwuXG4gIHZhciBlc2NhcGVzID0ge1xuICAgIFwiJ1wiOiAgICAgIFwiJ1wiLFxuICAgICdcXFxcJzogICAgICdcXFxcJyxcbiAgICAnXFxyJzogICAgICdyJyxcbiAgICAnXFxuJzogICAgICduJyxcbiAgICAnXFx0JzogICAgICd0JyxcbiAgICAnXFx1MjAyOCc6ICd1MjAyOCcsXG4gICAgJ1xcdTIwMjknOiAndTIwMjknXG4gIH07XG5cbiAgdmFyIGVzY2FwZXIgPSAvXFxcXHwnfFxccnxcXG58XFx0fFxcdTIwMjh8XFx1MjAyOS9nO1xuXG4gIC8vIEphdmFTY3JpcHQgbWljcm8tdGVtcGxhdGluZywgc2ltaWxhciB0byBKb2huIFJlc2lnJ3MgaW1wbGVtZW50YXRpb24uXG4gIC8vIFVuZGVyc2NvcmUgdGVtcGxhdGluZyBoYW5kbGVzIGFyYml0cmFyeSBkZWxpbWl0ZXJzLCBwcmVzZXJ2ZXMgd2hpdGVzcGFjZSxcbiAgLy8gYW5kIGNvcnJlY3RseSBlc2NhcGVzIHF1b3RlcyB3aXRoaW4gaW50ZXJwb2xhdGVkIGNvZGUuXG4gIF8udGVtcGxhdGUgPSBmdW5jdGlvbih0ZXh0LCBkYXRhLCBzZXR0aW5ncykge1xuICAgIHZhciByZW5kZXI7XG4gICAgc2V0dGluZ3MgPSBfLmRlZmF1bHRzKHt9LCBzZXR0aW5ncywgXy50ZW1wbGF0ZVNldHRpbmdzKTtcblxuICAgIC8vIENvbWJpbmUgZGVsaW1pdGVycyBpbnRvIG9uZSByZWd1bGFyIGV4cHJlc3Npb24gdmlhIGFsdGVybmF0aW9uLlxuICAgIHZhciBtYXRjaGVyID0gbmV3IFJlZ0V4cChbXG4gICAgICAoc2V0dGluZ3MuZXNjYXBlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5pbnRlcnBvbGF0ZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuZXZhbHVhdGUgfHwgbm9NYXRjaCkuc291cmNlXG4gICAgXS5qb2luKCd8JykgKyAnfCQnLCAnZycpO1xuXG4gICAgLy8gQ29tcGlsZSB0aGUgdGVtcGxhdGUgc291cmNlLCBlc2NhcGluZyBzdHJpbmcgbGl0ZXJhbHMgYXBwcm9wcmlhdGVseS5cbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBzb3VyY2UgPSBcIl9fcCs9J1wiO1xuICAgIHRleHQucmVwbGFjZShtYXRjaGVyLCBmdW5jdGlvbihtYXRjaCwgZXNjYXBlLCBpbnRlcnBvbGF0ZSwgZXZhbHVhdGUsIG9mZnNldCkge1xuICAgICAgc291cmNlICs9IHRleHQuc2xpY2UoaW5kZXgsIG9mZnNldClcbiAgICAgICAgLnJlcGxhY2UoZXNjYXBlciwgZnVuY3Rpb24obWF0Y2gpIHsgcmV0dXJuICdcXFxcJyArIGVzY2FwZXNbbWF0Y2hdOyB9KTtcblxuICAgICAgaWYgKGVzY2FwZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInK1xcbigoX190PShcIiArIGVzY2FwZSArIFwiKSk9PW51bGw/Jyc6Xy5lc2NhcGUoX190KSkrXFxuJ1wiO1xuICAgICAgfVxuICAgICAgaWYgKGludGVycG9sYXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgaW50ZXJwb2xhdGUgKyBcIikpPT1udWxsPycnOl9fdCkrXFxuJ1wiO1xuICAgICAgfVxuICAgICAgaWYgKGV2YWx1YXRlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIic7XFxuXCIgKyBldmFsdWF0ZSArIFwiXFxuX19wKz0nXCI7XG4gICAgICB9XG4gICAgICBpbmRleCA9IG9mZnNldCArIG1hdGNoLmxlbmd0aDtcbiAgICAgIHJldHVybiBtYXRjaDtcbiAgICB9KTtcbiAgICBzb3VyY2UgKz0gXCInO1xcblwiO1xuXG4gICAgLy8gSWYgYSB2YXJpYWJsZSBpcyBub3Qgc3BlY2lmaWVkLCBwbGFjZSBkYXRhIHZhbHVlcyBpbiBsb2NhbCBzY29wZS5cbiAgICBpZiAoIXNldHRpbmdzLnZhcmlhYmxlKSBzb3VyY2UgPSAnd2l0aChvYmp8fHt9KXtcXG4nICsgc291cmNlICsgJ31cXG4nO1xuXG4gICAgc291cmNlID0gXCJ2YXIgX190LF9fcD0nJyxfX2o9QXJyYXkucHJvdG90eXBlLmpvaW4sXCIgK1xuICAgICAgXCJwcmludD1mdW5jdGlvbigpe19fcCs9X19qLmNhbGwoYXJndW1lbnRzLCcnKTt9O1xcblwiICtcbiAgICAgIHNvdXJjZSArIFwicmV0dXJuIF9fcDtcXG5cIjtcblxuICAgIHRyeSB7XG4gICAgICByZW5kZXIgPSBuZXcgRnVuY3Rpb24oc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicsICdfJywgc291cmNlKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBlLnNvdXJjZSA9IHNvdXJjZTtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgaWYgKGRhdGEpIHJldHVybiByZW5kZXIoZGF0YSwgXyk7XG4gICAgdmFyIHRlbXBsYXRlID0gZnVuY3Rpb24oZGF0YSkge1xuICAgICAgcmV0dXJuIHJlbmRlci5jYWxsKHRoaXMsIGRhdGEsIF8pO1xuICAgIH07XG5cbiAgICAvLyBQcm92aWRlIHRoZSBjb21waWxlZCBmdW5jdGlvbiBzb3VyY2UgYXMgYSBjb252ZW5pZW5jZSBmb3IgcHJlY29tcGlsYXRpb24uXG4gICAgdGVtcGxhdGUuc291cmNlID0gJ2Z1bmN0aW9uKCcgKyAoc2V0dGluZ3MudmFyaWFibGUgfHwgJ29iaicpICsgJyl7XFxuJyArIHNvdXJjZSArICd9JztcblxuICAgIHJldHVybiB0ZW1wbGF0ZTtcbiAgfTtcblxuICAvLyBBZGQgYSBcImNoYWluXCIgZnVuY3Rpb24sIHdoaWNoIHdpbGwgZGVsZWdhdGUgdG8gdGhlIHdyYXBwZXIuXG4gIF8uY2hhaW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gXyhvYmopLmNoYWluKCk7XG4gIH07XG5cbiAgLy8gT09QXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuICAvLyBJZiBVbmRlcnNjb3JlIGlzIGNhbGxlZCBhcyBhIGZ1bmN0aW9uLCBpdCByZXR1cm5zIGEgd3JhcHBlZCBvYmplY3QgdGhhdFxuICAvLyBjYW4gYmUgdXNlZCBPTy1zdHlsZS4gVGhpcyB3cmFwcGVyIGhvbGRzIGFsdGVyZWQgdmVyc2lvbnMgb2YgYWxsIHRoZVxuICAvLyB1bmRlcnNjb3JlIGZ1bmN0aW9ucy4gV3JhcHBlZCBvYmplY3RzIG1heSBiZSBjaGFpbmVkLlxuXG4gIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjb250aW51ZSBjaGFpbmluZyBpbnRlcm1lZGlhdGUgcmVzdWx0cy5cbiAgdmFyIHJlc3VsdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiB0aGlzLl9jaGFpbiA/IF8ob2JqKS5jaGFpbigpIDogb2JqO1xuICB9O1xuXG4gIC8vIEFkZCBhbGwgb2YgdGhlIFVuZGVyc2NvcmUgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyIG9iamVjdC5cbiAgXy5taXhpbihfKTtcblxuICAvLyBBZGQgYWxsIG11dGF0b3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBlYWNoKFsncG9wJywgJ3B1c2gnLCAncmV2ZXJzZScsICdzaGlmdCcsICdzb3J0JywgJ3NwbGljZScsICd1bnNoaWZ0J10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgbWV0aG9kID0gQXJyYXlQcm90b1tuYW1lXTtcbiAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG9iaiA9IHRoaXMuX3dyYXBwZWQ7XG4gICAgICBtZXRob2QuYXBwbHkob2JqLCBhcmd1bWVudHMpO1xuICAgICAgaWYgKChuYW1lID09ICdzaGlmdCcgfHwgbmFtZSA9PSAnc3BsaWNlJykgJiYgb2JqLmxlbmd0aCA9PT0gMCkgZGVsZXRlIG9ialswXTtcbiAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBvYmopO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIEFkZCBhbGwgYWNjZXNzb3IgQXJyYXkgZnVuY3Rpb25zIHRvIHRoZSB3cmFwcGVyLlxuICBlYWNoKFsnY29uY2F0JywgJ2pvaW4nLCAnc2xpY2UnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgbWV0aG9kLmFwcGx5KHRoaXMuX3dyYXBwZWQsIGFyZ3VtZW50cykpO1xuICAgIH07XG4gIH0pO1xuXG4gIF8uZXh0ZW5kKF8ucHJvdG90eXBlLCB7XG5cbiAgICAvLyBTdGFydCBjaGFpbmluZyBhIHdyYXBwZWQgVW5kZXJzY29yZSBvYmplY3QuXG4gICAgY2hhaW46IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy5fY2hhaW4gPSB0cnVlO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcblxuICAgIC8vIEV4dHJhY3RzIHRoZSByZXN1bHQgZnJvbSBhIHdyYXBwZWQgYW5kIGNoYWluZWQgb2JqZWN0LlxuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl93cmFwcGVkO1xuICAgIH1cblxuICB9KTtcblxuICAvLyBBTUQgcmVnaXN0cmF0aW9uIGhhcHBlbnMgYXQgdGhlIGVuZCBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIEFNRCBsb2FkZXJzXG4gIC8vIHRoYXQgbWF5IG5vdCBlbmZvcmNlIG5leHQtdHVybiBzZW1hbnRpY3Mgb24gbW9kdWxlcy4gRXZlbiB0aG91Z2ggZ2VuZXJhbFxuICAvLyBwcmFjdGljZSBmb3IgQU1EIHJlZ2lzdHJhdGlvbiBpcyB0byBiZSBhbm9ueW1vdXMsIHVuZGVyc2NvcmUgcmVnaXN0ZXJzXG4gIC8vIGFzIGEgbmFtZWQgbW9kdWxlIGJlY2F1c2UsIGxpa2UgalF1ZXJ5LCBpdCBpcyBhIGJhc2UgbGlicmFyeSB0aGF0IGlzXG4gIC8vIHBvcHVsYXIgZW5vdWdoIHRvIGJlIGJ1bmRsZWQgaW4gYSB0aGlyZCBwYXJ0eSBsaWIsIGJ1dCBub3QgYmUgcGFydCBvZlxuICAvLyBhbiBBTUQgbG9hZCByZXF1ZXN0LiBUaG9zZSBjYXNlcyBjb3VsZCBnZW5lcmF0ZSBhbiBlcnJvciB3aGVuIGFuXG4gIC8vIGFub255bW91cyBkZWZpbmUoKSBpcyBjYWxsZWQgb3V0c2lkZSBvZiBhIGxvYWRlciByZXF1ZXN0LlxuICBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKCd1bmRlcnNjb3JlJywgW10sIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIF87XG4gICAgfSk7XG4gIH1cbn0pLmNhbGwodGhpcyk7XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgdmFyIHF1ZXVlID0gW107XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBhcmcgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCdcbiAgICAmJiB0eXBlb2YgYXJnLmNvcHkgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLmZpbGwgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLnJlYWRVSW50OCA9PT0gJ2Z1bmN0aW9uJztcbn0iLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsKXtcbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2luc2VydC1tb2R1bGUtZ2xvYmFscy9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJtb2R1bGUuZXhwb3J0cyA9IGhhc0tleXNcblxuZnVuY3Rpb24gaGFzS2V5cyhzb3VyY2UpIHtcbiAgICByZXR1cm4gc291cmNlICE9PSBudWxsICYmXG4gICAgICAgICh0eXBlb2Ygc291cmNlID09PSBcIm9iamVjdFwiIHx8XG4gICAgICAgIHR5cGVvZiBzb3VyY2UgPT09IFwiZnVuY3Rpb25cIilcbn1cbiIsInZhciBLZXlzID0gcmVxdWlyZShcIm9iamVjdC1rZXlzXCIpXG52YXIgaGFzS2V5cyA9IHJlcXVpcmUoXCIuL2hhcy1rZXlzXCIpXG5cbm1vZHVsZS5leHBvcnRzID0gZXh0ZW5kXG5cbmZ1bmN0aW9uIGV4dGVuZCgpIHtcbiAgICB2YXIgdGFyZ2V0ID0ge31cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV1cblxuICAgICAgICBpZiAoIWhhc0tleXMoc291cmNlKSkge1xuICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBrZXlzID0gS2V5cyhzb3VyY2UpXG5cbiAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBrZXlzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICB2YXIgbmFtZSA9IGtleXNbal1cbiAgICAgICAgICAgIHRhcmdldFtuYW1lXSA9IHNvdXJjZVtuYW1lXVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhcmdldFxufVxuIiwidmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG52YXIgaXNGdW5jdGlvbiA9IGZ1bmN0aW9uIChmbikge1xuXHR2YXIgaXNGdW5jID0gKHR5cGVvZiBmbiA9PT0gJ2Z1bmN0aW9uJyAmJiAhKGZuIGluc3RhbmNlb2YgUmVnRXhwKSkgfHwgdG9TdHJpbmcuY2FsbChmbikgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG5cdGlmICghaXNGdW5jICYmIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG5cdFx0aXNGdW5jID0gZm4gPT09IHdpbmRvdy5zZXRUaW1lb3V0IHx8IGZuID09PSB3aW5kb3cuYWxlcnQgfHwgZm4gPT09IHdpbmRvdy5jb25maXJtIHx8IGZuID09PSB3aW5kb3cucHJvbXB0O1xuXHR9XG5cdHJldHVybiBpc0Z1bmM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZvckVhY2gob2JqLCBmbikge1xuXHRpZiAoIWlzRnVuY3Rpb24oZm4pKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignaXRlcmF0b3IgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cdH1cblx0dmFyIGksIGssXG5cdFx0aXNTdHJpbmcgPSB0eXBlb2Ygb2JqID09PSAnc3RyaW5nJyxcblx0XHRsID0gb2JqLmxlbmd0aCxcblx0XHRjb250ZXh0ID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgPyBhcmd1bWVudHNbMl0gOiBudWxsO1xuXHRpZiAobCA9PT0gK2wpIHtcblx0XHRmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7XG5cdFx0XHRpZiAoY29udGV4dCA9PT0gbnVsbCkge1xuXHRcdFx0XHRmbihpc1N0cmluZyA/IG9iai5jaGFyQXQoaSkgOiBvYmpbaV0sIGksIG9iaik7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmbi5jYWxsKGNvbnRleHQsIGlzU3RyaW5nID8gb2JqLmNoYXJBdChpKSA6IG9ialtpXSwgaSwgb2JqKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0Zm9yIChrIGluIG9iaikge1xuXHRcdFx0aWYgKGhhc093bi5jYWxsKG9iaiwgaykpIHtcblx0XHRcdFx0aWYgKGNvbnRleHQgPT09IG51bGwpIHtcblx0XHRcdFx0XHRmbihvYmpba10sIGssIG9iaik7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Zm4uY2FsbChjb250ZXh0LCBvYmpba10sIGssIG9iaik7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cbn07XG5cbiIsIm1vZHVsZS5leHBvcnRzID0gT2JqZWN0LmtleXMgfHwgcmVxdWlyZSgnLi9zaGltJyk7XG5cbiIsInZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNBcmd1bWVudHModmFsdWUpIHtcblx0dmFyIHN0ciA9IHRvU3RyaW5nLmNhbGwodmFsdWUpO1xuXHR2YXIgaXNBcmd1bWVudHMgPSBzdHIgPT09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xuXHRpZiAoIWlzQXJndW1lbnRzKSB7XG5cdFx0aXNBcmd1bWVudHMgPSBzdHIgIT09ICdbb2JqZWN0IEFycmF5XSdcblx0XHRcdCYmIHZhbHVlICE9PSBudWxsXG5cdFx0XHQmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnXG5cdFx0XHQmJiB0eXBlb2YgdmFsdWUubGVuZ3RoID09PSAnbnVtYmVyJ1xuXHRcdFx0JiYgdmFsdWUubGVuZ3RoID49IDBcblx0XHRcdCYmIHRvU3RyaW5nLmNhbGwodmFsdWUuY2FsbGVlKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcblx0fVxuXHRyZXR1cm4gaXNBcmd1bWVudHM7XG59O1xuXG4iLCIoZnVuY3Rpb24gKCkge1xuXHRcInVzZSBzdHJpY3RcIjtcblxuXHQvLyBtb2RpZmllZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9rcmlza293YWwvZXM1LXNoaW1cblx0dmFyIGhhcyA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHksXG5cdFx0dG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLFxuXHRcdGZvckVhY2ggPSByZXF1aXJlKCcuL2ZvcmVhY2gnKSxcblx0XHRpc0FyZ3MgPSByZXF1aXJlKCcuL2lzQXJndW1lbnRzJyksXG5cdFx0aGFzRG9udEVudW1CdWcgPSAhKHsndG9TdHJpbmcnOiBudWxsfSkucHJvcGVydHlJc0VudW1lcmFibGUoJ3RvU3RyaW5nJyksXG5cdFx0aGFzUHJvdG9FbnVtQnVnID0gKGZ1bmN0aW9uICgpIHt9KS5wcm9wZXJ0eUlzRW51bWVyYWJsZSgncHJvdG90eXBlJyksXG5cdFx0ZG9udEVudW1zID0gW1xuXHRcdFx0XCJ0b1N0cmluZ1wiLFxuXHRcdFx0XCJ0b0xvY2FsZVN0cmluZ1wiLFxuXHRcdFx0XCJ2YWx1ZU9mXCIsXG5cdFx0XHRcImhhc093blByb3BlcnR5XCIsXG5cdFx0XHRcImlzUHJvdG90eXBlT2ZcIixcblx0XHRcdFwicHJvcGVydHlJc0VudW1lcmFibGVcIixcblx0XHRcdFwiY29uc3RydWN0b3JcIlxuXHRcdF0sXG5cdFx0a2V5c1NoaW07XG5cblx0a2V5c1NoaW0gPSBmdW5jdGlvbiBrZXlzKG9iamVjdCkge1xuXHRcdHZhciBpc09iamVjdCA9IG9iamVjdCAhPT0gbnVsbCAmJiB0eXBlb2Ygb2JqZWN0ID09PSAnb2JqZWN0Jyxcblx0XHRcdGlzRnVuY3Rpb24gPSB0b1N0cmluZy5jYWxsKG9iamVjdCkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXScsXG5cdFx0XHRpc0FyZ3VtZW50cyA9IGlzQXJncyhvYmplY3QpLFxuXHRcdFx0dGhlS2V5cyA9IFtdO1xuXG5cdFx0aWYgKCFpc09iamVjdCAmJiAhaXNGdW5jdGlvbiAmJiAhaXNBcmd1bWVudHMpIHtcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3Qua2V5cyBjYWxsZWQgb24gYSBub24tb2JqZWN0XCIpO1xuXHRcdH1cblxuXHRcdGlmIChpc0FyZ3VtZW50cykge1xuXHRcdFx0Zm9yRWFjaChvYmplY3QsIGZ1bmN0aW9uICh2YWx1ZSkge1xuXHRcdFx0XHR0aGVLZXlzLnB1c2godmFsdWUpO1xuXHRcdFx0fSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHZhciBuYW1lLFxuXHRcdFx0XHRza2lwUHJvdG8gPSBoYXNQcm90b0VudW1CdWcgJiYgaXNGdW5jdGlvbjtcblxuXHRcdFx0Zm9yIChuYW1lIGluIG9iamVjdCkge1xuXHRcdFx0XHRpZiAoIShza2lwUHJvdG8gJiYgbmFtZSA9PT0gJ3Byb3RvdHlwZScpICYmIGhhcy5jYWxsKG9iamVjdCwgbmFtZSkpIHtcblx0XHRcdFx0XHR0aGVLZXlzLnB1c2gobmFtZSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAoaGFzRG9udEVudW1CdWcpIHtcblx0XHRcdHZhciBjdG9yID0gb2JqZWN0LmNvbnN0cnVjdG9yLFxuXHRcdFx0XHRza2lwQ29uc3RydWN0b3IgPSBjdG9yICYmIGN0b3IucHJvdG90eXBlID09PSBvYmplY3Q7XG5cblx0XHRcdGZvckVhY2goZG9udEVudW1zLCBmdW5jdGlvbiAoZG9udEVudW0pIHtcblx0XHRcdFx0aWYgKCEoc2tpcENvbnN0cnVjdG9yICYmIGRvbnRFbnVtID09PSAnY29uc3RydWN0b3InKSAmJiBoYXMuY2FsbChvYmplY3QsIGRvbnRFbnVtKSkge1xuXHRcdFx0XHRcdHRoZUtleXMucHVzaChkb250RW51bSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhlS2V5cztcblx0fTtcblxuXHRtb2R1bGUuZXhwb3J0cyA9IGtleXNTaGltO1xufSgpKTtcblxuIl19
