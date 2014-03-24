(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var keymaster = require('../lib/keymaster');
// keymaster.noConflict();

module.exports = ControllerBase;

function ControllerBase() {
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


},{"../lib/keymaster":9}],2:[function(require,module,exports){
var inherits       = require('util').inherits;
var ControllerBase = require('./base');

module.exports = CharacterController;

function CharacterController(character) {
  ControllerBase.apply(this);

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
  this.character.walk();
};


/// walkBack

CC.walkBack = function walkBack() {
  this.character.walkBack();
};
},{"./base":1,"util":21}],3:[function(require,module,exports){
(function (global){
var Game = require('./lib/game');

var window = global;

var options = {
  width: $(window.document.body).width(),
  height: $(window.document.body).height()
};

var game = Game(document.body, options);


/// soldiers

var soldiers = [];

(function() {
  var soldierCount = 5
  for(var i = 0; i < soldierCount; i ++) {
    var soldier = game.board.characters.create();
    soldiers.push(soldier);
    var place = { x:i, y: i};
    var placed = game.board.characters.place(soldier, place);
    if (! placed) console.log('Failed to place soldier in ', place);
  }

}());



/// walls

(function() {
  var wallType = game.board.wallTypes.create();

  // var start = {x: -5.5, y: -5.5};
  // var end = {x: -5.5, y: 5.5};
  // game.board.walls.place(wallType, start, end);


  start = {x: -5.5, y: -5.5};
  end = {x: 5.5, y: -5.5};
  game.board.walls.place(wallType, start, end);

  start = {x: 5.5, y: 5.5};
  end = {x: 5.5, y: -5.5};
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
var tilemap = require('tilemap');
var _       = require('underscore');

var Tiles       = require('./tiles');
var Characters  = require('./characters');
var WallTypes   = require('./wall_types');
var Walls       = require('./walls');

module.exports = Board;

var defaultOptions = {
  width: window.outerWidth,
  height: window.outerHeight,
  size: 20,
  zoom: 0.5
};

function Board(element, options) {
  var self = {};

  options = extend({}, defaultOptions, options || {});


  /// Methods

  self.zoom = zoom;

  self.place  = place;
  self.remove = remove;
  self.moveTo = moveTo;

  self.walkable = walkable;
  self.traversable = traversable;
  self.objectsAt = objectsAt;


  /// Init

  self.grid = tilemap(options.width, options.height);

  self.zoom(options.zoom);
  self.tiles = Tiles(self.grid);
  self.characters = Characters(self);
  self.wallTypes = WallTypes(self);

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

  self.grid.appendTo(element);

  return self;
}

/// place

function place(object, options) {
  options = extend({
    x: object.x,
    y: object.y
  }, options || {});

  var placed = false;
  if (object.collides)
    placed = this.walkable(options.x, options.y);

  if (placed) {
    this.grid.createItem(object.image(), options.x, options.y);
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
    }
  }
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
    this.remove(object);
    this.place(object, to);
    if (cb) cb();
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
},{"./characters":6,"./tiles":10,"./wall_types":12,"./walls":13,"tilemap":14,"underscore":16,"xtend":23}],5:[function(require,module,exports){
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
  var self = this;
  return this.board.moveTo(this, x, y);
}

function move(x, y) {
  return this.moveTo(this.x + x, this.y + y);
}

function turnLeft() {
  this.facing = nextOnLeftTurn[this.facing];
  // Hack
  this.board.remove(this);
  this.board.place(this);
}

function turnRight() {
  this.facing = nextOnRightTurn[this.facing];
  // Hack
  this.board.remove(this);
  this.board.place(this);
}

function walk() {
  var direction = walkDirections[this.facing];
  return this.move(direction.x, direction.y);
}

function walkBack() {
  var direction = walkDirections[this.facing];
  return this.move(- direction.x, - direction.y);
}
},{"../controllers/character":2,"xtend":23}],6:[function(require,module,exports){
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
},{"./character":5,"xtend":23}],7:[function(require,module,exports){
module.exports = Controllers;

function Controllers() {
  var self = {};

  self.control = control;

  return self;
}

function control(object) {
  if (! object) throw new Error('no object to control');
  var controllerFn = object.controllerFunction;
  if (! controllerFn) throw new Error('object does not define a controller function');
  var controller = new controllerFn(object);
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
  self.controllers = Controllers();


  /// Methods

  self.start = start;

  return self;
}

/// start

function start() {

}
},{"./board":4,"./controllers":7}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
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
    tile.element.toFront();
    tile.element.attr('fill', 'rgba(255,127,127,0.8)');
  });

  tile.on('mouseout', function () {
    tile.element.toBack();
    tile.element.attr('fill', 'rgba(210,210,210,1.0)');
  });

  this.tiles.push(tile);

  return tile;
}
},{}],11:[function(require,module,exports){
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
},{"xtend":23}],12:[function(require,module,exports){
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
},{"./wall_type":11}],13:[function(require,module,exports){
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

  this.board.grid.createWall(image, from, to);
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
},{"underscore":16}],14:[function(require,module,exports){
var raphael = require('raphael-browserify');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = function (width, height) {
    return new TileMap(width, height);
};

function TileMap (width, height) {
    EventEmitter.call(this);

    this.element = document.createElement('div');
    this.paper = raphael(this.element, width, height);
    this.size = [ width, height ];
    this.zoomLevel = 1;

    this.tiles = {};

    this.items = {};
    this.itemStack = [];
    this.itemSet = this.paper.set();
    this.images = {};

    this.points = {};

    this.tied = [];
    this.selected = [];

    this.moveTo(0, 0);

    var self = this;
    // process.nextTick(function () {
    //     if (self.tied.length === 0) {
    //         self.tie(window);
    //     }
    // });
}

util.inherits(TileMap, EventEmitter);

TileMap.prototype.resize = function (width, height) {
    this.size = [ width, height ];
    this.paper.setSize(width, height);
    this._setView();
};

TileMap.prototype.createTile = function (x, y) {
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
    tile.element = self.paper.path(polygon(poly));

    var pt = self.toWorld(x, y);
    tile.screenX = pt[0];
    tile.screenY = pt[1];

    self.tiles[x + ',' + y] = tile;

    var created = [];
    var pts = points.map(function (pt, ix) {
        var key = pt[0] + ',' + pt[1];
        var xy = self.toWorld(pt[0], pt[1]);
        var x = xy[0], y = xy[1];

        var point = self.points[key];
        if (!point) {
            point = self.points[key] = new EventEmitter;
            point.x = pt[0];
            point.y = pt[1];
            point.type = 'point';
            point.element = self.paper.circle(x - 5, y - 5, 10);
            point.element.attr('fill', 'transparent');
            point.element.attr('stroke', 'transparent');
            point.tiles = {};
            created.push(point);
        }
        var d = [ 's', 'e', 'n', 'w' ][ix];
        point.tiles[d] = tile;

        return point;
    });
    tile.points = { n : pts[0], w : pts[1], s : pts[2], e : pts[3] };

    created.forEach(function (pt) {
        self.emit('createPoint', pt);
    });

    return tile;
};

TileMap.prototype.tileAt = function (x, y) {
    return this.tiles[x + ',' + y];
};

TileMap.prototype.pointAt = function (x, y) {
    return this.points[x + ',' + y];
};

TileMap.prototype.createItem = function (src, x, y, cb) {
    var self = this;
    var im = new Image;
    var w = self.toWorld(x, y);

    im.addEventListener('load', function () {
        var item = new EventEmitter;
        item.element = self.paper.image(
            src,
            w[0] - im.width / 2, w[1] - im.height + 25,
            im.width, im.height
        );
        item.x = x;
        item.y = y;

        var pt = self.toWorld(x, y);
        item.screenX = pt[0];
        item.screenY = pt[1];

        for (var i = 0; i < self.itemStack.length; i++) {
            if (pt[1] <= self.itemStack[i].screenY) {
                self.itemStack.splice(i, 0, item);
                self.itemSet.splice(i, 0, item.element);
                break;
            }
        }
        if (i === self.itemStack.length) {
            self.itemStack.push(item);
            self.itemSet.push(item.element);
        }

        self.itemSet.toFront();
        self.items[x + ',' + y] = item;

        if (typeof cb === 'function') cb(null, item);
    });
    im.addEventListener('error', cb);
    im.src = src;
};

TileMap.prototype.removeItem = function (x, y) {
    var item = this.itemAt(x, y);
    if (item) {
        delete this.items[x + ',' + y];
        item.element.remove();
        for (var i = 0; i < this.itemStack.length; i++) {
            if (item === this.itemStack[i]) {
                this.itemStack.splice(i, 1);
                this.itemSet.splice(i, 1);
                break;
            }
        }
        this.itemSet.toFront();
    }
};

TileMap.prototype.itemAt = function (x, y) {
    return this.items[x + ',' + y];
};

TileMap.prototype.createWall = function (src, pt0, pt1, cb) {
    if (pt0.y === pt1.y) {
        var x0 = Math.min(pt0.x, pt1.x);
        var xt = Math.max(pt0.x, pt1.x);
        for (var x = x0; x < xt; x++) {
            this.createItem(src, x + 0.75, pt0.y - 0.25);
        }
    }
    else if (pt0.x === pt1.x) {
        var y0 = Math.min(pt0.y, pt1.y);
        var yt = Math.max(pt0.y, pt1.y);
        for (var y = y0; y < yt; y++) {
            this.createItem(src, pt0.x + 0.25, y + 0.25);
        }
    }
};

TileMap.prototype.move = function (x, y) {
    this.moveTo(this.position[0] + x, this.position[1] + y);
};

TileMap.prototype.moveTo = function (x, y) {
    this.position = [ x, y ];
    this._setView();
};

TileMap.prototype.pan = function (x, y) {
    var tx = x / 2 + y / 2;
    var ty = x / 2 - y / 2;

    this.move(
        tx / Math.pow(this.zoomLevel, 0.5),
        ty / Math.pow(this.zoomLevel, 0.5)
    );
};

TileMap.prototype.zoom = function (level) {
    this.zoomLevel = level;
    this._setView();
};

TileMap.prototype._setView = function () {
    var w = this.size[0] / this.zoomLevel;
    var h = this.size[1] / this.zoomLevel;

    var pt = this.toWorld(this.position[0], this.position[1]);
    var x = pt[0] - w / 2;
    var y = pt[1] - h / 2;

    this.paper.setViewBox(x, y, w, h);
};

TileMap.prototype.toWorld = function (x, y) {
    var tx = x / 2 + y / 2;
    var ty = -x / 2 + y / 2;
    return [ tx * 100, ty * 50 ];
};

TileMap.prototype.fromWorld = function (tx, ty) {
    var x = tx / 100;
    var y = ty / 50;
    return [ x - y, x + y ];
};

function polygon (points) {
    var xs = points.map(function (p) { return p.join(',') });
    return 'M' + xs[0] + ' L' + xs.slice(1).join(' ') + ' Z';
}

TileMap.prototype.appendTo = function (target) {
    target.appendChild(this.element);
};

// TileMap.prototype.tie = function (win) {
//     var self = this;
//     self.tied.push(win);

//     var on = typeof win.addEventListener === 'function'
//         ? win.addEventListener
//         : win.on
//     ;
//     on.call(win, 'keydown', function (ev) {
//         var e = Object.keys(ev).reduce(function (acc, key) {
//             acc[key] = ev[key];
//             return acc;
//         }, {});
//         var prevented = false;
//         e.preventDefault = function () {
//             prevented = true;
//             ev.preventDefault();
//         };
//         self.emit('keydown', e);
//         if (prevented) return;

//         var key = ev.keyIdentifier.toLowerCase();
//         var dz = {
//             187 : 1 / 0.9,
//             189 : 0.9,
//         }[ev.keyCode];
//         if (dz) return self.zoom(self.zoomLevel * dz);
//         if (ev.keyCode === 49) return self.zoom(1);

//         var dxy = {
//             down : [ 0, -1 ],
//             up : [ 0, +1 ],
//             left : [ -1, 0 ],
//             right : [ +1, 0 ]
//         }[key];

//         if (dxy) {
//             ev.preventDefault();
//             self.pan(dxy[0], dxy[1]);
//         }
//     });

//     (function () {
//         var selected = {};
//         self.selected.push(selected);

//         on.call(win, 'mousemove', function (ev) {
//             var xy = self.fromWorld(
//                 (ev.clientX - self.size[0] / 2) / self.zoomLevel,
//                 (ev.clientY - self.size[1] / 2) / self.zoomLevel
//             );

//             var tx = Math.round(xy[0] + self.position[0]);
//             var ty = Math.round(xy[1] + self.position[1]);
//             var tile = self.tileAt(tx, ty);

//             if (tile && tile !== selected.tile) {
//                 if (selected.tile) {
//                     selected.tile.emit('mouseout', ev);
//                     self.emit('mouseout', selected.tile, ev);
//                 }
//                 selected.tile = tile;
//                 tile.emit('mouseover', ev);
//                 self.emit('mouseover', tile, ev);
//             }

//             var px = Math.floor(xy[0] + self.position[0]) + 0.5;
//             var py = Math.floor(xy[1] + self.position[1]) + 0.5;
//             var pt = self.pointAt(px, py);

//             if (pt && pt !== selected.point) {
//                 if (selected.point) {
//                     selected.point.emit('mouseout', ev);
//                     self.emit('mouseout', selected.point, ev);
//                 }
//                 selected.point = pt;
//                 pt.emit('mouseover', ev);
//                 self.emit('mouseout', pt, ev);
//             }
//         });

//         [ 'click', 'mousedown', 'mouseup' ].forEach(function (evName) {
//             on.call(win, evName, function (ev) {
//                 if (selected.tile) {
//                     selected.tile.emit(evName, ev);
//                     self.emit(evName, selected.tile, ev);
//                 }
//                 if (selected.point) {
//                     selected.point.emit(evName, ev);
//                     self.emit(evName, selected.point, ev);
//                 }
//             });
//         });
//     })();
// };

TileMap.prototype.release = function (mode) {
    this.selected.forEach(function (s) {
        if (s[mode]) s[mode].emit('mouseout');
    });
};

},{"events":17,"raphael-browserify":15,"util":21}],15:[function(require,module,exports){
// Browserify modifications by Brenton Partridge, released into the public domain

// BEGIN BROWSERIFY MOD
var eve, Raphael = 'foo';
// END BROWSERIFY MOD

// ┌────────────────────────────────────────────────────────────────────┐ \\
// │ Raphaël 2.1.0 - JavaScript Vector Library                          │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright © 2008-2012 Dmitry Baranovskiy (http://raphaeljs.com)    │ \\
// │ Copyright © 2008-2012 Sencha Labs (http://sencha.com)              │ \\
// ├────────────────────────────────────────────────────────────────────┤ \\
// │ Licensed under the MIT (http://raphaeljs.com/license.html) license.│ \\
// └────────────────────────────────────────────────────────────────────┘ \\

// ┌──────────────────────────────────────────────────────────────────────────────────────┐ \\
// │ Eve 0.3.4 - JavaScript Events Library                                                │ \\
// ├──────────────────────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright (c) 2008-2011 Dmitry Baranovskiy (http://dmitry.baranovskiy.com/)          │ \\
// │ Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license. │ \\
// └──────────────────────────────────────────────────────────────────────────────────────┘ \\

(function (glob) {
    var version = "0.3.4",
        has = "hasOwnProperty",
        separator = /[\.\/]/,
        wildcard = "*",
        fun = function () {},
        numsort = function (a, b) {
            return a - b;
        },
        current_event,
        stop,
        events = {n: {}};
    
    // BROWSERIFY MOD: make eve a top-level-scope variable instead of function-scope.
    eve = function (name, scope) {
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
    
    
    eve.on = function (name, f) {
        var names = name.split(separator),
            e = events;
        for (var i = 0, ii = names.length; i < ii; i++) {
            e = e.n;
            !e[names[i]] && (e[names[i]] = {n: {}});
            e = e[names[i]];
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
    
    eve.stop = function () {
        stop = 1;
    };
    
    eve.nt = function (subname) {
        if (subname) {
            return new RegExp("(?:\\.|\\/|^)" + subname + "(?:\\.|\\/|$)").test(current_event);
        }
        return current_event;
    };
    
    
    eve.off = eve.unbind = function (name, f) {
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
    
    eve.once = function (name, f) {
        var f2 = function () {
            var res = f.apply(this, arguments);
            eve.unbind(name, f2);
            return res;
        };
        return eve.on(name, f2);
    };
    
    eve.version = version;
    eve.toString = function () {
        return "You are running Eve " + version;
    };
    // BROWSERIFY MOD: do not set module.exports = eve
})(this);


// ┌─────────────────────────────────────────────────────────────────────┐ \\
// │ "Raphaël 2.1.0" - JavaScript Vector Library                         │ \\
// ├─────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright (c) 2008-2011 Dmitry Baranovskiy (http://raphaeljs.com)   │ \\
// │ Copyright (c) 2008-2011 Sencha Labs (http://sencha.com)             │ \\
// │ Licensed under the MIT (http://raphaeljs.com/license.html) license. │ \\
// └─────────────────────────────────────────────────────────────────────┘ \\
(function () {
    
    function R(first) {
        if (R.is(first, "function")) {
            return loaded ? first() : eve.on("raphael.DOMload", first);
        } else if (R.is(first, array)) {
            return R._engine.create[apply](R, first.splice(0, 3 + R.is(first[0], nu))).add(first);
        } else {
            var args = Array.prototype.slice.call(arguments, 0);
            if (R.is(args[args.length - 1], "function")) {
                var f = args.pop();
                return loaded ? f.call(R._engine.create[apply](R, args)) : eve.on("raphael.DOMload", function () {
                    f.call(R._engine.create[apply](R, args));
                });
            } else {
                return R._engine.create[apply](R, arguments);
            }
        }
    }
    R.version = "2.1.0";
    R.eve = eve;
    var loaded,
        separator = /[, ]+/,
        elements = {circle: 1, rect: 1, path: 1, ellipse: 1, text: 1, image: 1},
        formatrg = /\{(\d+)\}/g,
        proto = "prototype",
        has = "hasOwnProperty",
        g = (function() {
            var _g = {};
            if (typeof window !== 'undefined') {
                _g.win = window;
                _g.doc = document;
            }
            else if (typeof require !== 'undefined') {
                // Keep browserify from including jsdom.
                eval("_g.doc = require('jsdom').jsdom()");
                _g.win = _g.doc.createWindow();
                _g.win.document = _g.doc;
                _g.doc.implementation.addFeature(
            "http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1")
            }
            return _g;
        })(),
        oldRaphael = {
            was: Object.prototype[has].call(g.win, "Raphael"),
            is: g.win.Raphael
        },
        Paper = function () {
            
            
            this.ca = this.customAttributes = {};
        },
        paperproto,
        appendChild = "appendChild",
        apply = "apply",
        concat = "concat",
        supportsTouch = "createTouch" in g.doc,
        E = "",
        S = " ",
        Str = String,
        split = "split",
        events = "click dblclick mousedown mousemove mouseout mouseover mouseup touchstart touchmove touchend touchcancel"[split](S),
        touchMap = {
            mousedown: "touchstart",
            mousemove: "touchmove",
            mouseup: "touchend"
        },
        lowerCase = Str.prototype.toLowerCase,
        math = Math,
        mmax = math.max,
        mmin = math.min,
        abs = math.abs,
        pow = math.pow,
        PI = math.PI,
        nu = "number",
        string = "string",
        array = "array",
        toString = "toString",
        fillString = "fill",
        objectToString = Object.prototype.toString,
        paper = {},
        push = "push",
        ISURL = R._ISURL = /^url\(['"]?([^\)]+?)['"]?\)$/i,
        colourRegExp = /^\s*((#[a-f\d]{6})|(#[a-f\d]{3})|rgba?\(\s*([\d\.]+%?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+%?(?:\s*,\s*[\d\.]+%?)?)\s*\)|hsba?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+(?:%?\s*,\s*[\d\.]+)?)%?\s*\)|hsla?\(\s*([\d\.]+(?:deg|\xb0|%)?\s*,\s*[\d\.]+%?\s*,\s*[\d\.]+(?:%?\s*,\s*[\d\.]+)?)%?\s*\))\s*$/i,
        isnan = {"NaN": 1, "Infinity": 1, "-Infinity": 1},
        bezierrg = /^(?:cubic-)?bezier\(([^,]+),([^,]+),([^,]+),([^\)]+)\)/,
        round = math.round,
        setAttribute = "setAttribute",
        toFloat = parseFloat,
        toInt = parseInt,
        upperCase = Str.prototype.toUpperCase,
        availableAttrs = R._availableAttrs = {
            "arrow-end": "none",
            "arrow-start": "none",
            blur: 0,
            "clip-rect": "0 0 1e9 1e9",
            cursor: "default",
            cx: 0,
            cy: 0,
            fill: "#fff",
            "fill-opacity": 1,
            font: '10px "Arial"',
            "font-family": '"Arial"',
            "font-size": "10",
            "font-style": "normal",
            "font-weight": 400,
            gradient: 0,
            height: 0,
            href: "http://raphaeljs.com/",
            "letter-spacing": 0,
            opacity: 1,
            path: "M0,0",
            r: 0,
            rx: 0,
            ry: 0,
            src: "",
            stroke: "#000",
            "stroke-dasharray": "",
            "stroke-linecap": "butt",
            "stroke-linejoin": "butt",
            "stroke-miterlimit": 0,
            "stroke-opacity": 1,
            "stroke-width": 1,
            target: "_blank",
            "text-anchor": "middle",
            title: "Raphael",
            transform: "",
            width: 0,
            x: 0,
            y: 0
        },
        availableAnimAttrs = R._availableAnimAttrs = {
            blur: nu,
            "clip-rect": "csv",
            cx: nu,
            cy: nu,
            fill: "colour",
            "fill-opacity": nu,
            "font-size": nu,
            height: nu,
            opacity: nu,
            path: "path",
            r: nu,
            rx: nu,
            ry: nu,
            stroke: "colour",
            "stroke-opacity": nu,
            "stroke-width": nu,
            transform: "transform",
            width: nu,
            x: nu,
            y: nu
        },
        whitespace = /[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]/g,
        commaSpaces = /[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*,[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*/,
        hsrg = {hs: 1, rg: 1},
        p2s = /,?([achlmqrstvxz]),?/gi,
        pathCommand = /([achlmrqstvz])[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029,]*((-?\d*\.?\d*(?:e[\-+]?\d+)?[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*,?[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*)+)/ig,
        tCommand = /([rstm])[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029,]*((-?\d*\.?\d*(?:e[\-+]?\d+)?[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*,?[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*)+)/ig,
        pathValues = /(-?\d*\.?\d*(?:e[\-+]?\d+)?)[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*,?[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*/ig,
        radial_gradient = R._radial_gradient = /^r(?:\(([^,]+?)[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*,[\x09\x0a\x0b\x0c\x0d\x20\xa0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000\u2028\u2029]*([^\)]+?)\))?/,
        eldata = {},
        sortByKey = function (a, b) {
            return a.key - b.key;
        },
        sortByNumber = function (a, b) {
            return toFloat(a) - toFloat(b);
        },
        fun = function () {},
        pipe = function (x) {
            return x;
        },
        rectPath = R._rectPath = function (x, y, w, h, r) {
            if (r) {
                return [["M", x + r, y], ["l", w - r * 2, 0], ["a", r, r, 0, 0, 1, r, r], ["l", 0, h - r * 2], ["a", r, r, 0, 0, 1, -r, r], ["l", r * 2 - w, 0], ["a", r, r, 0, 0, 1, -r, -r], ["l", 0, r * 2 - h], ["a", r, r, 0, 0, 1, r, -r], ["z"]];
            }
            return [["M", x, y], ["l", w, 0], ["l", 0, h], ["l", -w, 0], ["z"]];
        },
        ellipsePath = function (x, y, rx, ry) {
            if (ry == null) {
                ry = rx;
            }
            return [["M", x, y], ["m", 0, -ry], ["a", rx, ry, 0, 1, 1, 0, 2 * ry], ["a", rx, ry, 0, 1, 1, 0, -2 * ry], ["z"]];
        },
        getPath = R._getPath = {
            path: function (el) {
                return el.attr("path");
            },
            circle: function (el) {
                var a = el.attrs;
                return ellipsePath(a.cx, a.cy, a.r);
            },
            ellipse: function (el) {
                var a = el.attrs;
                return ellipsePath(a.cx, a.cy, a.rx, a.ry);
            },
            rect: function (el) {
                var a = el.attrs;
                return rectPath(a.x, a.y, a.width, a.height, a.r);
            },
            image: function (el) {
                var a = el.attrs;
                return rectPath(a.x, a.y, a.width, a.height);
            },
            text: function (el) {
                var bbox = el._getBBox();
                return rectPath(bbox.x, bbox.y, bbox.width, bbox.height);
            }
        },
        
        mapPath = R.mapPath = function (path, matrix) {
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
        };

    R._g = g;
    
    
    R.type = (g.win.SVGAngle || g.doc.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1") ? "SVG" : "VML");
    if (R.type == "VML") {
        var d = g.doc.createElement("div"),
            b;
        d.innerHTML = '<v:shape adj="1"/>';
        b = d.firstChild;
        b.style.behavior = "url(#default#VML)";
        if (!(b && typeof b.adj == "object")) {
            return (R.type = E);
        }
        d = null;
    }

    
    R.svg = !(R.vml = R.type == "VML");
    R._Paper = Paper;
    
    R.fn = paperproto = Paper.prototype = R.prototype;
    R._id = 0;
    R._oid = 0;
    
    R.is = function (o, type) {
        type = lowerCase.call(type);
        if (type == "finite") {
            return !isnan[has](+o);
        }
        if (type == "array") {
            return o instanceof Array;
        }
        return  (type == "null" && o === null) ||
                (type == typeof o && o !== null) ||
                (type == "object" && o === Object(o)) ||
                (type == "array" && Array.isArray && Array.isArray(o)) ||
                objectToString.call(o).slice(8, -1).toLowerCase() == type;
    };

    function clone(obj) {
        if (Object(obj) !== obj) {
            return obj;
        }
        var res = new obj.constructor;
        for (var key in obj) if (obj[has](key)) {
            res[key] = clone(obj[key]);
        }
        return res;
    }

    
    R.angle = function (x1, y1, x2, y2, x3, y3) {
        if (x3 == null) {
            var x = x1 - x2,
                y = y1 - y2;
            if (!x && !y) {
                return 0;
            }
            return (180 + math.atan2(-y, -x) * 180 / PI + 360) % 360;
        } else {
            return R.angle(x1, y1, x3, y3) - R.angle(x2, y2, x3, y3);
        }
    };
    
    R.rad = function (deg) {
        return deg % 360 * PI / 180;
    };
    
    R.deg = function (rad) {
        return rad * 180 / PI % 360;
    };
    
    R.snapTo = function (values, value, tolerance) {
        tolerance = R.is(tolerance, "finite") ? tolerance : 10;
        if (R.is(values, array)) {
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
    
    
    var createUUID = R.createUUID = (function (uuidRegEx, uuidReplacer) {
        return function () {
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(uuidRegEx, uuidReplacer).toUpperCase();
        };
    })(/[xy]/g, function (c) {
        var r = math.random() * 16 | 0,
            v = c == "x" ? r : (r & 3 | 8);
        return v.toString(16);
    });

    
    R.setWindow = function (newwin) {
        eve("raphael.setWindow", R, g.win, newwin);
        g.win = newwin;
        g.doc = g.win.document;
        if (R._engine.initWin) {
            R._engine.initWin(g.win);
        }
    };
    var toHex = function (color) {
        if (R.vml) {
            // http://dean.edwards.name/weblog/2009/10/convert-any-colour-value-to-hex-in-msie/
            var trim = /^\s+|\s+$/g;
            var bod;
            try {
                var docum = new ActiveXObject("htmlfile");
                docum.write("<body>");
                docum.close();
                bod = docum.body;
            } catch(e) {
                bod = createPopup().document.body;
            }
            var range = bod.createTextRange();
            toHex = cacher(function (color) {
                try {
                    bod.style.color = Str(color).replace(trim, E);
                    var value = range.queryCommandValue("ForeColor");
                    value = ((value & 255) << 16) | (value & 65280) | ((value & 16711680) >>> 16);
                    return "#" + ("000000" + value.toString(16)).slice(-6);
                } catch(e) {
                    return "none";
                }
            });
        } else {
            var i = g.doc.createElement("i");
            i.title = "Rapha\xebl Colour Picker";
            i.style.display = "none";
            g.doc.body.appendChild(i);
            toHex = cacher(function (color) {
                i.style.color = color;
                return g.doc.defaultView.getComputedStyle(i, E).getPropertyValue("color");
            });
        }
        return toHex(color);
    },
    hsbtoString = function () {
        return "hsb(" + [this.h, this.s, this.b] + ")";
    },
    hsltoString = function () {
        return "hsl(" + [this.h, this.s, this.l] + ")";
    },
    rgbtoString = function () {
        return this.hex;
    },
    prepareRGB = function (r, g, b) {
        if (g == null && R.is(r, "object") && "r" in r && "g" in r && "b" in r) {
            b = r.b;
            g = r.g;
            r = r.r;
        }
        if (g == null && R.is(r, string)) {
            var clr = R.getRGB(r);
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
        r *= 255;
        g *= 255;
        b *= 255;
        var rgb = {
            r: r,
            g: g,
            b: b,
            hex: R.rgb(r, g, b),
            toString: rgbtoString
        };
        R.is(o, "finite") && (rgb.opacity = o);
        return rgb;
    };
    
    
    R.color = function (clr) {
        var rgb;
        if (R.is(clr, "object") && "h" in clr && "s" in clr && "b" in clr) {
            rgb = R.hsb2rgb(clr);
            clr.r = rgb.r;
            clr.g = rgb.g;
            clr.b = rgb.b;
            clr.hex = rgb.hex;
        } else if (R.is(clr, "object") && "h" in clr && "s" in clr && "l" in clr) {
            rgb = R.hsl2rgb(clr);
            clr.r = rgb.r;
            clr.g = rgb.g;
            clr.b = rgb.b;
            clr.hex = rgb.hex;
        } else {
            if (R.is(clr, "string")) {
                clr = R.getRGB(clr);
            }
            if (R.is(clr, "object") && "r" in clr && "g" in clr && "b" in clr) {
                rgb = R.rgb2hsl(clr);
                clr.h = rgb.h;
                clr.s = rgb.s;
                clr.l = rgb.l;
                rgb = R.rgb2hsb(clr);
                clr.v = rgb.b;
            } else {
                clr = {hex: "none"};
                clr.r = clr.g = clr.b = clr.h = clr.s = clr.v = clr.l = -1;
            }
        }
        clr.toString = rgbtoString;
        return clr;
    };
    
    R.hsb2rgb = function (h, s, v, o) {
        if (this.is(h, "object") && "h" in h && "s" in h && "b" in h) {
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
    
    R.hsl2rgb = function (h, s, l, o) {
        if (this.is(h, "object") && "h" in h && "s" in h && "l" in h) {
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
    
    R.rgb2hsb = function (r, g, b) {
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
    
    R.rgb2hsl = function (r, g, b) {
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
    R._path2string = function () {
        return this.join(",").replace(p2s, "$1");
    };
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
            cache[args] = f[apply](scope, arg);
            return postprocessor ? postprocessor(cache[args]) : cache[args];
        }
        return newf;
    }

    var preload = R._preload = function (src, f) {
        var img = g.doc.createElement("img");
        img.style.cssText = "position:absolute;left:-9999em;top:-9999em";
        img.onload = function () {
            f.call(this);
            this.onload = null;
            g.doc.body.removeChild(this);
        };
        img.onerror = function () {
            g.doc.body.removeChild(this);
        };
        g.doc.body.appendChild(img);
        img.src = src;
    };
    
    function clrToString() {
        return this.hex;
    }

    
    R.getRGB = cacher(function (colour) {
        if (!colour || !!((colour = Str(colour)).indexOf("-") + 1)) {
            return {r: -1, g: -1, b: -1, hex: "none", error: 1, toString: clrToString};
        }
        if (colour == "none") {
            return {r: -1, g: -1, b: -1, hex: "none", toString: clrToString};
        }
        !(hsrg[has](colour.toLowerCase().substring(0, 2)) || colour.charAt() == "#") && (colour = toHex(colour));
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
                values = rgb[4][split](commaSpaces);
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
                values = rgb[5][split](commaSpaces);
                red = toFloat(values[0]);
                values[0].slice(-1) == "%" && (red *= 2.55);
                green = toFloat(values[1]);
                values[1].slice(-1) == "%" && (green *= 2.55);
                blue = toFloat(values[2]);
                values[2].slice(-1) == "%" && (blue *= 2.55);
                (values[0].slice(-3) == "deg" || values[0].slice(-1) == "\xb0") && (red /= 360);
                rgb[1].toLowerCase().slice(0, 4) == "hsba" && (opacity = toFloat(values[3]));
                values[3] && values[3].slice(-1) == "%" && (opacity /= 100);
                return R.hsb2rgb(red, green, blue, opacity);
            }
            if (rgb[6]) {
                values = rgb[6][split](commaSpaces);
                red = toFloat(values[0]);
                values[0].slice(-1) == "%" && (red *= 2.55);
                green = toFloat(values[1]);
                values[1].slice(-1) == "%" && (green *= 2.55);
                blue = toFloat(values[2]);
                values[2].slice(-1) == "%" && (blue *= 2.55);
                (values[0].slice(-3) == "deg" || values[0].slice(-1) == "\xb0") && (red /= 360);
                rgb[1].toLowerCase().slice(0, 4) == "hsla" && (opacity = toFloat(values[3]));
                values[3] && values[3].slice(-1) == "%" && (opacity /= 100);
                return R.hsl2rgb(red, green, blue, opacity);
            }
            rgb = {r: red, g: green, b: blue, toString: clrToString};
            rgb.hex = "#" + (16777216 | blue | (green << 8) | (red << 16)).toString(16).slice(1);
            R.is(opacity, "finite") && (rgb.opacity = opacity);
            return rgb;
        }
        return {r: -1, g: -1, b: -1, hex: "none", error: 1, toString: clrToString};
    }, R);
    
    R.hsb = cacher(function (h, s, b) {
        return R.hsb2rgb(h, s, b).hex;
    });
    
    R.hsl = cacher(function (h, s, l) {
        return R.hsl2rgb(h, s, l).hex;
    });
    
    R.rgb = cacher(function (r, g, b) {
        return "#" + (16777216 | b | (g << 8) | (r << 16)).toString(16).slice(1);
    });
    
    R.getColor = function (value) {
        var start = this.getColor.start = this.getColor.start || {h: 0, s: 1, b: value || .75},
            rgb = this.hsb2rgb(start.h, start.s, start.b);
        start.h += .075;
        if (start.h > 1) {
            start.h = 0;
            start.s -= .2;
            start.s <= 0 && (this.getColor.start = {h: 0, s: 1, b: start.b});
        }
        return rgb.hex;
    };
    
    R.getColor.reset = function () {
        delete this.start;
    };

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
    
    R.parsePathString = function (pathString) {
        if (!pathString) {
            return null;
        }
        var pth = paths(pathString);
        if (pth.arr) {
            return pathClone(pth.arr);
        }
        
        var paramCounts = {a: 7, c: 6, h: 1, l: 2, m: 2, r: 4, q: 4, s: 4, t: 2, v: 1, z: 0},
            data = [];
        if (R.is(pathString, array) && R.is(pathString[0], array)) { // rough assumption
            data = pathClone(pathString);
        }
        if (!data.length) {
            Str(pathString).replace(pathCommand, function (a, b, c) {
                var params = [],
                    name = b.toLowerCase();
                c.replace(pathValues, function (a, b) {
                    b && params.push(+b);
                });
                if (name == "m" && params.length > 2) {
                    data.push([b][concat](params.splice(0, 2)));
                    name = "l";
                    b = b == "m" ? "l" : "L";
                }
                if (name == "r") {
                    data.push([b][concat](params));
                } else while (params.length >= paramCounts[name]) {
                    data.push([b][concat](params.splice(0, paramCounts[name])));
                    if (!paramCounts[name]) {
                        break;
                    }
                }
            });
        }
        data.toString = R._path2string;
        pth.arr = pathClone(data);
        return data;
    };
    
    R.parseTransformString = cacher(function (TString) {
        if (!TString) {
            return null;
        }
        var paramCounts = {r: 3, s: 4, t: 2, m: 6},
            data = [];
        if (R.is(TString, array) && R.is(TString[0], array)) { // rough assumption
            data = pathClone(TString);
        }
        if (!data.length) {
            Str(TString).replace(tCommand, function (a, b, c) {
                var params = [],
                    name = lowerCase.call(b);
                c.replace(pathValues, function (a, b) {
                    b && params.push(+b);
                });
                data.push([b][concat](params));
            });
        }
        data.toString = R._path2string;
        return data;
    });
    // PATHS
    var paths = function (ps) {
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
    };
    
    R.findDotsAtSegment = function (p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t) {
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
        (mx > nx || my < ny) && (alpha += 180);
        return {
            x: x,
            y: y,
            m: {x: mx, y: my},
            n: {x: nx, y: ny},
            start: {x: ax, y: ay},
            end: {x: cx, y: cy},
            alpha: alpha
        };
    };
    
    R.bezierBBox = function (p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y) {
        if (!R.is(p1x, "array")) {
            p1x = [p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y];
        }
        var bbox = curveDim.apply(null, p1x);
        return {
            x: bbox.min.x,
            y: bbox.min.y,
            x2: bbox.max.x,
            y2: bbox.max.y,
            width: bbox.max.x - bbox.min.x,
            height: bbox.max.y - bbox.min.y
        };
    };
    
    R.isPointInsideBBox = function (bbox, x, y) {
        return x >= bbox.x && x <= bbox.x2 && y >= bbox.y && y <= bbox.y2;
    };
    
    R.isBBoxIntersect = function (bbox1, bbox2) {
        var i = R.isPointInsideBBox;
        return i(bbox2, bbox1.x, bbox1.y)
            || i(bbox2, bbox1.x2, bbox1.y)
            || i(bbox2, bbox1.x, bbox1.y2)
            || i(bbox2, bbox1.x2, bbox1.y2)
            || i(bbox1, bbox2.x, bbox2.y)
            || i(bbox1, bbox2.x2, bbox2.y)
            || i(bbox1, bbox2.x, bbox2.y2)
            || i(bbox1, bbox2.x2, bbox2.y2)
            || (bbox1.x < bbox2.x2 && bbox1.x > bbox2.x || bbox2.x < bbox1.x2 && bbox2.x > bbox1.x)
            && (bbox1.y < bbox2.y2 && bbox1.y > bbox2.y || bbox2.y < bbox1.y2 && bbox2.y > bbox1.y);
    };
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
            Tvalues = [-0.1252,0.1252,-0.3678,0.3678,-0.5873,0.5873,-0.7699,0.7699,-0.9041,0.9041,-0.9816,0.9816],
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
    function getTatLen(x1, y1, x2, y2, x3, y3, x4, y4, ll) {
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
        var bbox1 = R.bezierBBox(bez1),
            bbox2 = R.bezierBBox(bez2);
        if (!R.isBBoxIntersect(bbox1, bbox2)) {
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
            var p = R.findDotsAtSegment.apply(R, bez1.concat(i / n1));
            dots1.push({x: p.x, y: p.y, t: i / n1});
        }
        for (i = 0; i < n2 + 1; i++) {
            p = R.findDotsAtSegment.apply(R, bez2.concat(i / n2));
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
    
    R.pathIntersection = function (path1, path2) {
        return interPathHelper(path1, path2);
    };
    R.pathIntersectionNumber = function (path1, path2) {
        return interPathHelper(path1, path2, 1);
    };
    function interPathHelper(path1, path2, justCount) {
        path1 = R._path2curve(path1);
        path2 = R._path2curve(path2);
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
    
    R.isPointInsidePath = function (path, x, y) {
        var bbox = R.pathBBox(path);
        return R.isPointInsideBBox(bbox, x, y) &&
               interPathHelper(path, [["M", x, y], ["H", bbox.x2 + 10]], 1) % 2 == 1;
    };
    R._removedFactory = function (methodname) {
        return function () {
            eve("raphael.log", null, "Rapha\xebl: you are calling to method \u201c" + methodname + "\u201d of removed object", methodname);
        };
    };
    
    var pathDimensions = R.pathBBox = function (path) {
        var pth = paths(path);
        if (pth.bbox) {
            return pth.bbox;
        }
        if (!path) {
            return {x: 0, y: 0, width: 0, height: 0, x2: 0, y2: 0};
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
                X = X[concat](dim.min.x, dim.max.x);
                Y = Y[concat](dim.min.y, dim.max.y);
                x = p[5];
                y = p[6];
            }
        }
        var xmin = mmin[apply](0, X),
            ymin = mmin[apply](0, Y),
            xmax = mmax[apply](0, X),
            ymax = mmax[apply](0, Y),
            bb = {
                x: xmin,
                y: ymin,
                x2: xmax,
                y2: ymax,
                width: xmax - xmin,
                height: ymax - ymin
            };
        pth.bbox = clone(bb);
        return bb;
    },
        pathClone = function (pathArray) {
            var res = clone(pathArray);
            res.toString = R._path2string;
            return res;
        },
        pathToRelative = R._pathToRelative = function (pathArray) {
            var pth = paths(pathArray);
            if (pth.rel) {
                return pathClone(pth.rel);
            }
            if (!R.is(pathArray, array) || !R.is(pathArray && pathArray[0], array)) { // rough assumption
                pathArray = R.parsePathString(pathArray);
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
            res.toString = R._path2string;
            pth.rel = pathClone(res);
            return res;
        },
        pathToAbsolute = R._pathToAbsolute = function (pathArray) {
            var pth = paths(pathArray);
            if (pth.abs) {
                return pathClone(pth.abs);
            }
            if (!R.is(pathArray, array) || !R.is(pathArray && pathArray[0], array)) { // rough assumption
                pathArray = R.parsePathString(pathArray);
            }
            if (!pathArray || !pathArray.length) {
                return [["M", 0, 0]];
            }
            var res = [],
                x = 0,
                y = 0,
                mx = 0,
                my = 0,
                start = 0;
            if (pathArray[0][0] == "M") {
                x = +pathArray[0][1];
                y = +pathArray[0][2];
                mx = x;
                my = y;
                start++;
                res[0] = ["M", x, y];
            }
            var crz = pathArray.length == 3 && pathArray[0][0] == "M" && pathArray[1][0].toUpperCase() == "R" && pathArray[2][0].toUpperCase() == "Z";
            for (var r, pa, i = start, ii = pathArray.length; i < ii; i++) {
                res.push(r = []);
                pa = pathArray[i];
                if (pa[0] != upperCase.call(pa[0])) {
                    r[0] = upperCase.call(pa[0]);
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
                            var dots = [x, y][concat](pa.slice(1));
                            for (var j = 2, jj = dots.length; j < jj; j++) {
                                dots[j] = +dots[j] + x;
                                dots[++j] = +dots[j] + y;
                            }
                            res.pop();
                            res = res[concat](catmullRom2bezier(dots, crz));
                            break;
                        case "M":
                            mx = +pa[1] + x;
                            my = +pa[2] + y;
                        default:
                            for (j = 1, jj = pa.length; j < jj; j++) {
                                r[j] = +pa[j] + ((j % 2) ? x : y);
                            }
                    }
                } else if (pa[0] == "R") {
                    dots = [x, y][concat](pa.slice(1));
                    res.pop();
                    res = res[concat](catmullRom2bezier(dots, crz));
                    r = ["R"][concat](pa.slice(-2));
                } else {
                    for (var k = 0, kk = pa.length; k < kk; k++) {
                        r[k] = pa[k];
                    }
                }
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
            res.toString = R._path2string;
            pth.abs = pathClone(res);
            return res;
        },
        l2c = function (x1, y1, x2, y2) {
            return [x1, y1, x2, y2, x2, y2];
        },
        q2c = function (x1, y1, ax, ay, x2, y2) {
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
        },
        a2c = function (x1, y1, rx, ry, angle, large_arc_flag, sweep_flag, x2, y2, recursive) {
            // for more information of where this math came from visit:
            // http://www.w3.org/TR/SVG11/implnote.html#ArcImplementationNotes
            var _120 = PI * 120 / 180,
                rad = PI / 180 * (+angle || 0),
                res = [],
                xy,
                rotate = cacher(function (x, y, rad) {
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
                return [m2, m3, m4][concat](res);
            } else {
                res = [m2, m3, m4][concat](res).join()[split](",");
                var newres = [];
                for (var i = 0, ii = res.length; i < ii; i++) {
                    newres[i] = i % 2 ? rotate(res[i - 1], res[i], rad).y : rotate(res[i], res[i + 1], rad).x;
                }
                return newres;
            }
        },
        findDotAtSegment = function (p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, t) {
            var t1 = 1 - t;
            return {
                x: pow(t1, 3) * p1x + pow(t1, 2) * 3 * t * c1x + t1 * 3 * t * t * c2x + pow(t, 3) * p2x,
                y: pow(t1, 3) * p1y + pow(t1, 2) * 3 * t * c1y + t1 * 3 * t * t * c2y + pow(t, 3) * p2y
            };
        },
        curveDim = cacher(function (p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y) {
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
                min: {x: mmin[apply](0, x), y: mmin[apply](0, y)},
                max: {x: mmax[apply](0, x), y: mmax[apply](0, y)}
            };
        }),
        path2curve = R._path2curve = cacher(function (path, path2) {
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
                            path = ["C"][concat](a2c[apply](0, [d.x, d.y][concat](path.slice(1))));
                            break;
                        case "S":
                            nx = d.x + (d.x - (d.bx || d.x));
                            ny = d.y + (d.y - (d.by || d.y));
                            path = ["C", nx, ny][concat](path.slice(1));
                            break;
                        case "T":
                            d.qx = d.x + (d.x - (d.qx || d.x));
                            d.qy = d.y + (d.y - (d.qy || d.y));
                            path = ["C"][concat](q2c(d.x, d.y, d.qx, d.qy, path[1], path[2]));
                            break;
                        case "Q":
                            d.qx = path[1];
                            d.qy = path[2];
                            path = ["C"][concat](q2c(d.x, d.y, path[1], path[2], path[3], path[4]));
                            break;
                        case "L":
                            path = ["C"][concat](l2c(d.x, d.y, path[1], path[2]));
                            break;
                        case "H":
                            path = ["C"][concat](l2c(d.x, d.y, path[1], d.y));
                            break;
                        case "V":
                            path = ["C"][concat](l2c(d.x, d.y, d.x, path[1]));
                            break;
                        case "Z":
                            path = ["C"][concat](l2c(d.x, d.y, d.X, d.Y));
                            break;
                    }
                    return path;
                },
                fixArc = function (pp, i) {
                    if (pp[i].length > 7) {
                        pp[i].shift();
                        var pi = pp[i];
                        while (pi.length) {
                            pp.splice(i++, 0, ["C"][concat](pi.splice(0, 6)));
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
        }, null, pathClone),
        parseDots = R._parseDots = cacher(function (gradient) {
            var dots = [];
            for (var i = 0, ii = gradient.length; i < ii; i++) {
                var dot = {},
                    par = gradient[i].match(/^([^:]*):?([\d\.]*)/);
                dot.color = R.getRGB(par[1]);
                if (dot.color.error) {
                    return null;
                }
                dot.color = dot.color.hex;
                par[2] && (dot.offset = par[2] + "%");
                dots.push(dot);
            }
            for (i = 1, ii = dots.length - 1; i < ii; i++) {
                if (!dots[i].offset) {
                    var start = toFloat(dots[i - 1].offset || 0),
                        end = 0;
                    for (var j = i + 1; j < ii; j++) {
                        if (dots[j].offset) {
                            end = dots[j].offset;
                            break;
                        }
                    }
                    if (!end) {
                        end = 100;
                        j = ii;
                    }
                    end = toFloat(end);
                    var d = (end - start) / (j - i + 1);
                    for (; i < j; i++) {
                        start += d;
                        dots[i].offset = start + "%";
                    }
                }
            }
            return dots;
        }),
        tear = R._tear = function (el, paper) {
            el == paper.top && (paper.top = el.prev);
            el == paper.bottom && (paper.bottom = el.next);
            el.next && (el.next.prev = el.prev);
            el.prev && (el.prev.next = el.next);
        },
        tofront = R._tofront = function (el, paper) {
            if (paper.top === el) {
                return;
            }
            tear(el, paper);
            el.next = null;
            el.prev = paper.top;
            paper.top.next = el;
            paper.top = el;
        },
        toback = R._toback = function (el, paper) {
            if (paper.bottom === el) {
                return;
            }
            tear(el, paper);
            el.next = paper.bottom;
            el.prev = null;
            paper.bottom.prev = el;
            paper.bottom = el;
        },
        insertafter = R._insertafter = function (el, el2, paper) {
            tear(el, paper);
            el2 == paper.top && (paper.top = el);
            el2.next && (el2.next.prev = el);
            el.next = el2.next;
            el.prev = el2;
            el2.next = el;
        },
        insertbefore = R._insertbefore = function (el, el2, paper) {
            tear(el, paper);
            el2 == paper.bottom && (paper.bottom = el);
            el2.prev && (el2.prev.next = el);
            el.prev = el2.prev;
            el2.prev = el;
            el.next = el2;
        },
        
        toMatrix = R.toMatrix = function (path, transform) {
            var bb = pathDimensions(path),
                el = {
                    _: {
                        transform: E
                    },
                    getBBox: function () {
                        return bb;
                    }
                };
            extractTransform(el, transform);
            return el.matrix;
        },
        
        transformPath = R.transformPath = function (path, transform) {
            return mapPath(path, toMatrix(path, transform));
        },
        extractTransform = R._extractTransform = function (el, tstr) {
            if (tstr == null) {
                return el._.transform;
            }
            tstr = Str(tstr).replace(/\.{3}|\u2026/g, el._.transform || E);
            var tdata = R.parseTransformString(tstr),
                deg = 0,
                dx = 0,
                dy = 0,
                sx = 1,
                sy = 1,
                _ = el._,
                m = new Matrix;
            _.transform = tdata || [];
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
                    if (command == "t" && tlen == 3) {
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
                            bb = bb || el.getBBox(1);
                            m.rotate(t[1], bb.x + bb.width / 2, bb.y + bb.height / 2);
                            deg += t[1];
                        } else if (tlen == 4) {
                            if (absolute) {
                                x2 = inver.x(t[2], t[3]);
                                y2 = inver.y(t[2], t[3]);
                                m.rotate(t[1], x2, y2);
                            } else {
                                m.rotate(t[1], t[2], t[3]);
                            }
                            deg += t[1];
                        }
                    } else if (command == "s") {
                        if (tlen == 2 || tlen == 3) {
                            bb = bb || el.getBBox(1);
                            m.scale(t[1], t[tlen - 1], bb.x + bb.width / 2, bb.y + bb.height / 2);
                            sx *= t[1];
                            sy *= t[tlen - 1];
                        } else if (tlen == 5) {
                            if (absolute) {
                                x2 = inver.x(t[3], t[4]);
                                y2 = inver.y(t[3], t[4]);
                                m.scale(t[1], t[2], x2, y2);
                            } else {
                                m.scale(t[1], t[2], t[3], t[4]);
                            }
                            sx *= t[1];
                            sy *= t[2];
                        }
                    } else if (command == "m" && tlen == 7) {
                        m.add(t[1], t[2], t[3], t[4], t[5], t[6]);
                    }
                    _.dirtyT = 1;
                    el.matrix = m;
                }
            }

            
            el.matrix = m;

            _.sx = sx;
            _.sy = sy;
            _.deg = deg;
            _.dx = dx = m.e;
            _.dy = dy = m.f;

            if (sx == 1 && sy == 1 && !deg && _.bbox) {
                _.bbox.x += +dx;
                _.bbox.y += +dy;
            } else {
                _.dirtyT = 1;
            }
        },
        getEmpty = function (item) {
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
        },
        equaliseTransform = R._equaliseTransform = function (t1, t2) {
            t2 = Str(t2).replace(/\.{3}|\u2026/g, t1);
            t1 = R.parseTransformString(t1) || [];
            t2 = R.parseTransformString(t2) || [];
            var maxlength = mmax(t1.length, t2.length),
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
                    return;
                }
                from[i] = [];
                to[i] = [];
                for (j = 0, jj = mmax(tt1.length, tt2.length); j < jj; j++) {
                    j in tt1 && (from[i][j] = tt1[j]);
                    j in tt2 && (to[i][j] = tt2[j]);
                }
            }
            return {
                from: from,
                to: to
            };
        };
    R._getContainer = function (x, y, w, h) {
        var container;
        container = h == null && !R.is(x, "object") ? g.doc.getElementById(x) : x;
        if (container == null) {
            return;
        }
        if (container.tagName) {
            if (y == null) {
                return {
                    container: container,
                    width: container.style.pixelWidth || container.offsetWidth,
                    height: container.style.pixelHeight || container.offsetHeight
                };
            } else {
                return {
                    container: container,
                    width: y,
                    height: w
                };
            }
        }
        return {
            container: 1,
            x: x,
            y: y,
            width: w,
            height: h
        };
    };
    
    R.pathToRelative = pathToRelative;
    R._engine = {};
    
    R.path2curve = path2curve;
    
    R.matrix = function (a, b, c, d, e, f) {
        return new Matrix(a, b, c, d, e, f);
    };
    function Matrix(a, b, c, d, e, f) {
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
        };
        
        matrixproto.invert = function () {
            var me = this,
                x = me.a * me.d - me.b * me.c;
            return new Matrix(me.d / x, -me.b / x, -me.c / x, me.a / x, (me.c * me.f - me.d * me.e) / x, (me.b * me.e - me.a * me.f) / x);
        };
        
        matrixproto.clone = function () {
            return new Matrix(this.a, this.b, this.c, this.d, this.e, this.f);
        };
        
        matrixproto.translate = function (x, y) {
            this.add(1, 0, 0, 1, x, y);
        };
        
        matrixproto.scale = function (x, y, cx, cy) {
            y == null && (y = x);
            (cx || cy) && this.add(1, 0, 0, 1, cx, cy);
            this.add(x, 0, 0, y, 0, 0);
            (cx || cy) && this.add(1, 0, 0, 1, -cx, -cy);
        };
        
        matrixproto.rotate = function (a, x, y) {
            a = R.rad(a);
            x = x || 0;
            y = y || 0;
            var cos = +math.cos(a).toFixed(9),
                sin = +math.sin(a).toFixed(9);
            this.add(cos, sin, -sin, cos, x, y);
            this.add(1, 0, 0, 1, -x, -y);
        };
        
        matrixproto.x = function (x, y) {
            return x * this.a + y * this.c + this.e;
        };
        
        matrixproto.y = function (x, y) {
            return x * this.b + y * this.d + this.f;
        };
        matrixproto.get = function (i) {
            return +this[Str.fromCharCode(97 + i)].toFixed(4);
        };
        matrixproto.toString = function () {
            return R.svg ?
                "matrix(" + [this.get(0), this.get(1), this.get(2), this.get(3), this.get(4), this.get(5)].join() + ")" :
                [this.get(0), this.get(2), this.get(1), this.get(3), 0, 0].join();
        };
        matrixproto.toFilter = function () {
            return "progid:DXImageTransform.Microsoft.Matrix(M11=" + this.get(0) +
                ", M12=" + this.get(2) + ", M21=" + this.get(1) + ", M22=" + this.get(3) +
                ", Dx=" + this.get(4) + ", Dy=" + this.get(5) + ", sizingmethod='auto expand')";
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
                out.rotate = R.deg(math.acos(cos));
                if (sin < 0) {
                    out.rotate = 360 - out.rotate;
                }
            } else {
                out.rotate = R.deg(math.asin(sin));
            }

            out.isSimple = !+out.shear.toFixed(9) && (out.scalex.toFixed(9) == out.scaley.toFixed(9) || !out.rotate);
            out.isSuperSimple = !+out.shear.toFixed(9) && out.scalex.toFixed(9) == out.scaley.toFixed(9) && !out.rotate;
            out.noRotation = !+out.shear.toFixed(9) && !out.rotate;
            return out;
        };
        
        matrixproto.toTransformString = function (shorter) {
            var s = shorter || this[split]();
            if (s.isSimple) {
                s.scalex = +s.scalex.toFixed(4);
                s.scaley = +s.scaley.toFixed(4);
                s.rotate = +s.rotate.toFixed(4);
                return  (s.dx || s.dy ? "t" + [s.dx, s.dy] : E) + 
                        (s.scalex != 1 || s.scaley != 1 ? "s" + [s.scalex, s.scaley, 0, 0] : E) +
                        (s.rotate ? "r" + [s.rotate, 0, 0] : E);
            } else {
                return "m" + [this.get(0), this.get(1), this.get(2), this.get(3), this.get(4), this.get(5)];
            }
        };
    })(Matrix.prototype);

    // WebKit rendering bug workaround method
    // BROWSERIFY MOD: don't assume navigator exists
    if (typeof navigator !== 'undefined') {
        var version = navigator.userAgent.match(/Version\/(.*?)\s/) || navigator.userAgent.match(/Chrome\/(\d+)/);
        if ((navigator.vendor == "Apple Computer, Inc.") && (version && version[1] < 4 || navigator.platform.slice(0, 2) == "iP") ||
            (navigator.vendor == "Google Inc." && version && version[1] < 8)) {
            
            paperproto.safari = function () {
                var rect = this.rect(-99, -99, this.width + 99, this.height + 99).attr({stroke: "none"});
                setTimeout(function () {rect.remove();});
            };
        } else {
            paperproto.safari = fun;
        }
    } else {
        paperproto.safari = fun;
    }
 
    var preventDefault = function () {
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
        if (g.doc.addEventListener) {
            return function (obj, type, fn, element) {
                var realName = supportsTouch && touchMap[type] ? touchMap[type] : type,
                    f = function (e) {
                        var scrollY = g.doc.documentElement.scrollTop || g.doc.body.scrollTop,
                            scrollX = g.doc.documentElement.scrollLeft || g.doc.body.scrollLeft,
                            x = e.clientX + scrollX,
                            y = e.clientY + scrollY;
                    if (supportsTouch && touchMap[has](type)) {
                        for (var i = 0, ii = e.targetTouches && e.targetTouches.length; i < ii; i++) {
                            if (e.targetTouches[i].target == obj) {
                                var olde = e;
                                e = e.targetTouches[i];
                                e.originalEvent = olde;
                                e.preventDefault = preventTouch;
                                e.stopPropagation = stopTouch;
                                break;
                            }
                        }
                    }
                    return fn.call(element, e, x, y);
                };
                obj.addEventListener(realName, f, false);
                return function () {
                    obj.removeEventListener(realName, f, false);
                    return true;
                };
            };
        } else if (g.doc.attachEvent) {
            return function (obj, type, fn, element) {
                var f = function (e) {
                    e = e || g.win.event;
                    var scrollY = g.doc.documentElement.scrollTop || g.doc.body.scrollTop,
                        scrollX = g.doc.documentElement.scrollLeft || g.doc.body.scrollLeft,
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
            scrollY = g.doc.documentElement.scrollTop || g.doc.body.scrollTop,
            scrollX = g.doc.documentElement.scrollLeft || g.doc.body.scrollLeft,
            dragi,
            j = drag.length;
        while (j--) {
            dragi = drag[j];
            if (supportsTouch) {
                var i = e.touches.length,
                    touch;
                while (i--) {
                    touch = e.touches[i];
                    if (touch.identifier == dragi.el._drag.id) {
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
                next = node.nextSibling,
                parent = node.parentNode,
                display = node.style.display;
            g.win.opera && parent.removeChild(node);
            node.style.display = "none";
            o = dragi.el.paper.getElementByPoint(x, y);
            node.style.display = display;
            g.win.opera && (next ? parent.insertBefore(node, next) : parent.appendChild(node));
            o && eve("raphael.drag.over." + dragi.el.id, dragi.el, o);
            x += scrollX;
            y += scrollY;
            eve("raphael.drag.move." + dragi.el.id, dragi.move_scope || dragi.el, x - dragi.el._drag.x, y - dragi.el._drag.y, x, y, e);
        }
    },
    dragUp = function (e) {
        R.unmousemove(dragMove).unmouseup(dragUp);
        var i = drag.length,
            dragi;
        while (i--) {
            dragi = drag[i];
            dragi.el._drag = {};
            eve("raphael.drag.end." + dragi.el.id, dragi.end_scope || dragi.start_scope || dragi.move_scope || dragi.el, e);
        }
        drag = [];
    },
    
    elproto = R.el = {};
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    for (var i = events.length; i--;) {
        (function (eventName) {
            R[eventName] = elproto[eventName] = function (fn, scope) {
                if (R.is(fn, "function")) {
                    this.events = this.events || [];
                    this.events.push({name: eventName, f: fn, unbind: addEvent(this.shape || this.node || g.doc, eventName, fn, scope || this)});
                }
                return this;
            };
            R["un" + eventName] = elproto["un" + eventName] = function (fn) {
                var events = this.events || [],
                    l = events.length;
                while (l--) if (events[l].name == eventName && events[l].f == fn) {
                    events[l].unbind();
                    events.splice(l, 1);
                    !events.length && delete this.events;
                    return this;
                }
                return this;
            };
        })(events[i]);
    }
    
    
    elproto.data = function (key, value) {
        var data = eldata[this.id] = eldata[this.id] || {};
        if (arguments.length == 1) {
            if (R.is(key, "object")) {
                for (var i in key) if (key[has](i)) {
                    this.data(i, key[i]);
                }
                return this;
            }
            eve("raphael.data.get." + this.id, this, data[key], key);
            return data[key];
        }
        data[key] = value;
        eve("raphael.data.set." + this.id, this, value, key);
        return this;
    };
    
    elproto.removeData = function (key) {
        if (key == null) {
            eldata[this.id] = {};
        } else {
            eldata[this.id] && delete eldata[this.id][key];
        }
        return this;
    };
    
    elproto.hover = function (f_in, f_out, scope_in, scope_out) {
        return this.mouseover(f_in, scope_in).mouseout(f_out, scope_out || scope_in);
    };
    
    elproto.unhover = function (f_in, f_out) {
        return this.unmouseover(f_in).unmouseout(f_out);
    };
    var draggable = [];
    
    elproto.drag = function (onmove, onstart, onend, move_scope, start_scope, end_scope) {
        function start(e) {
            (e.originalEvent || e).preventDefault();
            var scrollY = g.doc.documentElement.scrollTop || g.doc.body.scrollTop,
                scrollX = g.doc.documentElement.scrollLeft || g.doc.body.scrollLeft;
            this._drag.x = e.clientX + scrollX;
            this._drag.y = e.clientY + scrollY;
            this._drag.id = e.identifier;
            !drag.length && R.mousemove(dragMove).mouseup(dragUp);
            drag.push({el: this, move_scope: move_scope, start_scope: start_scope, end_scope: end_scope});
            onstart && eve.on("raphael.drag.start." + this.id, onstart);
            onmove && eve.on("raphael.drag.move." + this.id, onmove);
            onend && eve.on("raphael.drag.end." + this.id, onend);
            eve("raphael.drag.start." + this.id, start_scope || move_scope || this, e.clientX + scrollX, e.clientY + scrollY, e);
        }
        this._drag = {};
        draggable.push({el: this, start: start});
        this.mousedown(start);
        return this;
    };
    
    elproto.onDragOver = function (f) {
        f ? eve.on("raphael.drag.over." + this.id, f) : eve.unbind("raphael.drag.over." + this.id);
    };
    
    elproto.undrag = function () {
        var i = draggable.length;
        while (i--) if (draggable[i].el == this) {
            this.unmousedown(draggable[i].start);
            draggable.splice(i, 1);
            eve.unbind("raphael.drag.*." + this.id);
        }
        !draggable.length && R.unmousemove(dragMove).unmouseup(dragUp);
    };
    
    paperproto.circle = function (x, y, r) {
        var out = R._engine.circle(this, x || 0, y || 0, r || 0);
        this.__set__ && this.__set__.push(out);
        return out;
    };
    
    paperproto.rect = function (x, y, w, h, r) {
        var out = R._engine.rect(this, x || 0, y || 0, w || 0, h || 0, r || 0);
        this.__set__ && this.__set__.push(out);
        return out;
    };
    
    paperproto.ellipse = function (x, y, rx, ry) {
        var out = R._engine.ellipse(this, x || 0, y || 0, rx || 0, ry || 0);
        this.__set__ && this.__set__.push(out);
        return out;
    };
    
    paperproto.path = function (pathString) {
        pathString && !R.is(pathString, string) && !R.is(pathString[0], array) && (pathString += E);
        var out = R._engine.path(R.format[apply](R, arguments), this);
        this.__set__ && this.__set__.push(out);
        return out;
    };
    
    paperproto.image = function (src, x, y, w, h) {
        var out = R._engine.image(this, src || "about:blank", x || 0, y || 0, w || 0, h || 0);
        this.__set__ && this.__set__.push(out);
        return out;
    };
    
    paperproto.text = function (x, y, text) {
        var out = R._engine.text(this, x || 0, y || 0, Str(text));
        this.__set__ && this.__set__.push(out);
        return out;
    };
    
    paperproto.set = function (itemsArray) {
        !R.is(itemsArray, "array") && (itemsArray = Array.prototype.splice.call(arguments, 0, arguments.length));
        var out = new Set(itemsArray);
        this.__set__ && this.__set__.push(out);
        return out;
    };
    
    paperproto.setStart = function (set) {
        this.__set__ = set || this.set();
    };
    
    paperproto.setFinish = function (set) {
        var out = this.__set__;
        delete this.__set__;
        return out;
    };
    
    paperproto.setSize = function (width, height) {
        return R._engine.setSize.call(this, width, height);
    };
    
    paperproto.setViewBox = function (x, y, w, h, fit) {
        return R._engine.setViewBox.call(this, x, y, w, h, fit);
    };
    
    
    paperproto.top = paperproto.bottom = null;
    
    paperproto.raphael = R;
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
    
    paperproto.getElementByPoint = function (x, y) {
        var paper = this,
            svg = paper.canvas,
            target = g.doc.elementFromPoint(x, y);
        if (g.win.opera && target.tagName == "svg") {
            var so = getOffset(svg),
                sr = svg.createSVGRect();
            sr.x = x - so.x;
            sr.y = y - so.y;
            sr.width = sr.height = 1;
            var hits = svg.getIntersectionList(sr, null);
            if (hits.length) {
                target = hits[hits.length - 1];
            }
        }
        if (!target) {
            return null;
        }
        while (target.parentNode && target != svg.parentNode && !target.raphael) {
            target = target.parentNode;
        }
        target == paper.canvas.parentNode && (target = svg);
        target = target && target.raphael ? paper.getById(target.raphaelid) : null;
        return target;
    };
    
    paperproto.getById = function (id) {
        var bot = this.bottom;
        while (bot) {
            if (bot.id == id) {
                return bot;
            }
            bot = bot.next;
        }
        return null;
    };
    
    paperproto.forEach = function (callback, thisArg) {
        var bot = this.bottom;
        while (bot) {
            if (callback.call(thisArg, bot) === false) {
                return this;
            }
            bot = bot.next;
        }
        return this;
    };
    
    paperproto.getElementsByPoint = function (x, y) {
        var set = this.set();
        this.forEach(function (el) {
            if (el.isPointInside(x, y)) {
                set.push(el);
            }
        });
        return set;
    };
    function x_y() {
        return this.x + S + this.y;
    }
    function x_y_w_h() {
        return this.x + S + this.y + S + this.width + " \xd7 " + this.height;
    }
    
    elproto.isPointInside = function (x, y) {
        var rp = this.realPath = this.realPath || getPath[this.type](this);
        return R.isPointInsidePath(rp, x, y);
    };
    
    elproto.getBBox = function (isWithoutTransform) {
        if (this.removed) {
            return {};
        }
        var _ = this._;
        if (isWithoutTransform) {
            if (_.dirty || !_.bboxwt) {
                this.realPath = getPath[this.type](this);
                _.bboxwt = pathDimensions(this.realPath);
                _.bboxwt.toString = x_y_w_h;
                _.dirty = 0;
            }
            return _.bboxwt;
        }
        if (_.dirty || _.dirtyT || !_.bbox) {
            if (_.dirty || !this.realPath) {
                _.bboxwt = 0;
                this.realPath = getPath[this.type](this);
            }
            _.bbox = pathDimensions(mapPath(this.realPath, this.matrix));
            _.bbox.toString = x_y_w_h;
            _.dirty = _.dirtyT = 0;
        }
        return _.bbox;
    };
    
    elproto.clone = function () {
        if (this.removed) {
            return null;
        }
        var out = this.paper[this.type]().attr(this.attr());
        this.__set__ && this.__set__.push(out);
        return out;
    };
    
    elproto.glow = function (glow) {
        if (this.type == "text") {
            return null;
        }
        glow = glow || {};
        var s = {
            width: (glow.width || 10) + (+this.attr("stroke-width") || 1),
            fill: glow.fill || false,
            opacity: glow.opacity || .5,
            offsetx: glow.offsetx || 0,
            offsety: glow.offsety || 0,
            color: glow.color || "#000"
        },
            c = s.width / 2,
            r = this.paper,
            out = r.set(),
            path = this.realPath || getPath[this.type](this);
        path = this.matrix ? mapPath(path, this.matrix) : path;
        for (var i = 1; i < c + 1; i++) {
            out.push(r.path(path).attr({
                stroke: s.color,
                fill: s.fill ? s.color : "none",
                "stroke-linejoin": "round",
                "stroke-linecap": "round",
                "stroke-width": +(s.width / c * i).toFixed(3),
                opacity: +(s.opacity / c).toFixed(3)
            }));
        }
        return out.insertBefore(this).translate(s.offsetx, s.offsety);
    };
    var curveslengths = {},
    getPointAtSegmentLength = function (p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, length) {
        if (length == null) {
            return bezlen(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y);
        } else {
            return R.findDotsAtSegment(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, getTatLen(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, length));
        }
    },
    getLengthFactory = function (istotal, subpath) {
        return function (path, length, onlystart) {
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
                            sp += ["C" + point.start.x, point.start.y, point.m.x, point.m.y, point.x, point.y];
                            if (onlystart) {return sp;}
                            subpaths.start = sp;
                            sp = ["M" + point.x, point.y + "C" + point.n.x, point.n.y, point.end.x, point.end.y, p[5], p[6]].join();
                            len += l;
                            x = +p[5];
                            y = +p[6];
                            continue;
                        }
                        if (!istotal && !subpath) {
                            point = getPointAtSegmentLength(x, y, p[1], p[2], p[3], p[4], p[5], p[6], length - len);
                            return {x: point.x, y: point.y, alpha: point.alpha};
                        }
                    }
                    len += l;
                    x = +p[5];
                    y = +p[6];
                }
                sp += p.shift() + p;
            }
            subpaths.end = sp;
            point = istotal ? len : subpath ? subpaths : R.findDotsAtSegment(x, y, p[0], p[1], p[2], p[3], p[4], p[5], 1);
            point.alpha && (point = {x: point.x, y: point.y, alpha: point.alpha});
            return point;
        };
    };
    var getTotalLength = getLengthFactory(1),
        getPointAtLength = getLengthFactory(),
        getSubpathsAtLength = getLengthFactory(0, 1);
    
    R.getTotalLength = getTotalLength;
    
    R.getPointAtLength = getPointAtLength;
    
    R.getSubpath = function (path, from, to) {
        if (this.getTotalLength(path) - to < 1e-6) {
            return getSubpathsAtLength(path, from).end;
        }
        var a = getSubpathsAtLength(path, to, 1);
        return from ? getSubpathsAtLength(a, from).end : a;
    };
    
    elproto.getTotalLength = function () {
        if (this.type != "path") {return;}
        if (this.node.getTotalLength) {
            return this.node.getTotalLength();
        }
        return getTotalLength(this.attrs.path);
    };
    
    elproto.getPointAtLength = function (length) {
        if (this.type != "path") {return;}
        return getPointAtLength(this.attrs.path, length);
    };
    
    elproto.getSubpath = function (from, to) {
        if (this.type != "path") {return;}
        return R.getSubpath(this.attrs.path, from, to);
    };
    
    var ef = R.easing_formulas = {
        linear: function (n) {
            return n;
        },
        "<": function (n) {
            return pow(n, 1.7);
        },
        ">": function (n) {
            return pow(n, .48);
        },
        "<>": function (n) {
            var q = .48 - n / 1.04,
                Q = math.sqrt(.1734 + q * q),
                x = Q - q,
                X = pow(abs(x), 1 / 3) * (x < 0 ? -1 : 1),
                y = -Q - q,
                Y = pow(abs(y), 1 / 3) * (y < 0 ? -1 : 1),
                t = X + Y + .5;
            return (1 - t) * 3 * t * t + t * t * t;
        },
        backIn: function (n) {
            var s = 1.70158;
            return n * n * ((s + 1) * n - s);
        },
        backOut: function (n) {
            n = n - 1;
            var s = 1.70158;
            return n * n * ((s + 1) * n + s) + 1;
        },
        elastic: function (n) {
            if (n == !!n) {
                return n;
            }
            return pow(2, -10 * n) * math.sin((n - .075) * (2 * PI) / .3) + 1;
        },
        bounce: function (n) {
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
        }
    };
    ef.easeIn = ef["ease-in"] = ef["<"];
    ef.easeOut = ef["ease-out"] = ef[">"];
    ef.easeInOut = ef["ease-in-out"] = ef["<>"];
    ef["back-in"] = ef.backIn;
    ef["back-out"] = ef.backOut;

    // BROWSERIFY MOD: use R._g.win here instead of window
    var animationElements = [],
        requestAnimFrame = R._g.win.requestAnimationFrame       ||
                           R._g.win.webkitRequestAnimationFrame ||
                           R._g.win.mozRequestAnimationFrame    ||
                           R._g.win.oRequestAnimationFrame      ||
                           R._g.win.msRequestAnimationFrame     ||
                           function (callback) {
                               setTimeout(callback, 16);
                           },
        animation = function () {
            var Now = +new Date,
                l = 0;
            for (; l < animationElements.length; l++) {
                var e = animationElements[l];
                if (e.el.removed || e.paused) {
                    continue;
                }
                var time = Now - e.start,
                    ms = e.ms,
                    easing = e.easing,
                    from = e.from,
                    diff = e.diff,
                    to = e.to,
                    t = e.t,
                    that = e.el,
                    set = {},
                    now,
                    init = {},
                    key;
                if (e.initstatus) {
                    time = (e.initstatus * e.anim.top - e.prev) / (e.percent - e.prev) * ms;
                    e.status = e.initstatus;
                    delete e.initstatus;
                    e.stop && animationElements.splice(l--, 1);
                } else {
                    e.status = (e.prev + (e.percent - e.prev) * (time / ms)) / e.anim.top;
                }
                if (time < 0) {
                    continue;
                }
                if (time < ms) {
                    var pos = easing(time / ms);
                    for (var attr in from) if (from[has](attr)) {
                        switch (availableAnimAttrs[attr]) {
                            case nu:
                                now = +from[attr] + pos * ms * diff[attr];
                                break;
                            case "colour":
                                now = "rgb(" + [
                                    upto255(round(from[attr].r + pos * ms * diff[attr].r)),
                                    upto255(round(from[attr].g + pos * ms * diff[attr].g)),
                                    upto255(round(from[attr].b + pos * ms * diff[attr].b))
                                ].join(",") + ")";
                                break;
                            case "path":
                                now = [];
                                for (var i = 0, ii = from[attr].length; i < ii; i++) {
                                    now[i] = [from[attr][i][0]];
                                    for (var j = 1, jj = from[attr][i].length; j < jj; j++) {
                                        now[i][j] = +from[attr][i][j] + pos * ms * diff[attr][i][j];
                                    }
                                    now[i] = now[i].join(S);
                                }
                                now = now.join(S);
                                break;
                            case "transform":
                                if (diff[attr].real) {
                                    now = [];
                                    for (i = 0, ii = from[attr].length; i < ii; i++) {
                                        now[i] = [from[attr][i][0]];
                                        for (j = 1, jj = from[attr][i].length; j < jj; j++) {
                                            now[i][j] = from[attr][i][j] + pos * ms * diff[attr][i][j];
                                        }
                                    }
                                } else {
                                    var get = function (i) {
                                        return +from[attr][i] + pos * ms * diff[attr][i];
                                    };
                                    // now = [["r", get(2), 0, 0], ["t", get(3), get(4)], ["s", get(0), get(1), 0, 0]];
                                    now = [["m", get(0), get(1), get(2), get(3), get(4), get(5)]];
                                }
                                break;
                            case "csv":
                                if (attr == "clip-rect") {
                                    now = [];
                                    i = 4;
                                    while (i--) {
                                        now[i] = +from[attr][i] + pos * ms * diff[attr][i];
                                    }
                                }
                                break;
                            default:
                                var from2 = [][concat](from[attr]);
                                now = [];
                                i = that.paper.customAttributes[attr].length;
                                while (i--) {
                                    now[i] = +from2[i] + pos * ms * diff[attr][i];
                                }
                                break;
                        }
                        set[attr] = now;
                    }
                    that.attr(set);
                    (function (id, that, anim) {
                        setTimeout(function () {
                            eve("raphael.anim.frame." + id, that, anim);
                        });
                    })(that.id, that, e.anim);
                } else {
                    (function(f, el, a) {
                        setTimeout(function() {
                            eve("raphael.anim.frame." + el.id, el, a);
                            eve("raphael.anim.finish." + el.id, el, a);
                            R.is(f, "function") && f.call(el);
                        });
                    })(e.callback, that, e.anim);
                    that.attr(to);
                    animationElements.splice(l--, 1);
                    if (e.repeat > 1 && !e.next) {
                        for (key in to) if (to[has](key)) {
                            init[key] = e.totalOrigin[key];
                        }
                        e.el.attr(init);
                        runAnimation(e.anim, e.el, e.anim.percents[0], null, e.totalOrigin, e.repeat - 1);
                    }
                    if (e.next && !e.stop) {
                        runAnimation(e.anim, e.el, e.next, null, e.totalOrigin, e.repeat);
                    }
                }
            }
            R.svg && that && that.paper && that.paper.safari();
            animationElements.length && requestAnimFrame(animation);
        },
        upto255 = function (color) {
            return color > 255 ? 255 : color < 0 ? 0 : color;
        };
    
    elproto.animateWith = function (el, anim, params, ms, easing, callback) {
        var element = this;
        if (element.removed) {
            callback && callback.call(element);
            return element;
        }
        var a = params instanceof Animation ? params : R.animation(params, ms, easing, callback),
            x, y;
        runAnimation(a, element, a.percents[0], null, element.attr());
        for (var i = 0, ii = animationElements.length; i < ii; i++) {
            if (animationElements[i].anim == anim && animationElements[i].el == el) {
                animationElements[ii - 1].start = animationElements[i].start;
                break;
            }
        }
        return element;
        // 
        // 
        // var a = params ? R.animation(params, ms, easing, callback) : anim,
        //     status = element.status(anim);
        // return this.animate(a).status(a, status * anim.ms / a.ms);
    };
    function CubicBezierAtTime(t, p1x, p1y, p2x, p2y, duration) {
        var cx = 3 * p1x,
            bx = 3 * (p2x - p1x) - cx,
            ax = 1 - cx - bx,
            cy = 3 * p1y,
            by = 3 * (p2y - p1y) - cy,
            ay = 1 - cy - by;
        function sampleCurveX(t) {
            return ((ax * t + bx) * t + cx) * t;
        }
        function solve(x, epsilon) {
            var t = solveCurveX(x, epsilon);
            return ((ay * t + by) * t + cy) * t;
        }
        function solveCurveX(x, epsilon) {
            var t0, t1, t2, x2, d2, i;
            for(t2 = x, i = 0; i < 8; i++) {
                x2 = sampleCurveX(t2) - x;
                if (abs(x2) < epsilon) {
                    return t2;
                }
                d2 = (3 * ax * t2 + 2 * bx) * t2 + cx;
                if (abs(d2) < 1e-6) {
                    break;
                }
                t2 = t2 - x2 / d2;
            }
            t0 = 0;
            t1 = 1;
            t2 = x;
            if (t2 < t0) {
                return t0;
            }
            if (t2 > t1) {
                return t1;
            }
            while (t0 < t1) {
                x2 = sampleCurveX(t2);
                if (abs(x2 - x) < epsilon) {
                    return t2;
                }
                if (x > x2) {
                    t0 = t2;
                } else {
                    t1 = t2;
                }
                t2 = (t1 - t0) / 2 + t0;
            }
            return t2;
        }
        return solve(t, 1 / (200 * duration));
    }
    elproto.onAnimation = function (f) {
        f ? eve.on("raphael.anim.frame." + this.id, f) : eve.unbind("raphael.anim.frame." + this.id);
        return this;
    };
    function Animation(anim, ms) {
        var percents = [],
            newAnim = {};
        this.ms = ms;
        this.times = 1;
        if (anim) {
            for (var attr in anim) if (anim[has](attr)) {
                newAnim[toFloat(attr)] = anim[attr];
                percents.push(toFloat(attr));
            }
            percents.sort(sortByNumber);
        }
        this.anim = newAnim;
        this.top = percents[percents.length - 1];
        this.percents = percents;
    }
    
    Animation.prototype.delay = function (delay) {
        var a = new Animation(this.anim, this.ms);
        a.times = this.times;
        a.del = +delay || 0;
        return a;
    };
    
    Animation.prototype.repeat = function (times) { 
        var a = new Animation(this.anim, this.ms);
        a.del = this.del;
        a.times = math.floor(mmax(times, 0)) || 1;
        return a;
    };
    function runAnimation(anim, element, percent, status, totalOrigin, times) {
        percent = toFloat(percent);
        var params,
            isInAnim,
            isInAnimSet,
            percents = [],
            next,
            prev,
            timestamp,
            ms = anim.ms,
            from = {},
            to = {},
            diff = {};
        if (status) {
            for (i = 0, ii = animationElements.length; i < ii; i++) {
                var e = animationElements[i];
                if (e.el.id == element.id && e.anim == anim) {
                    if (e.percent != percent) {
                        animationElements.splice(i, 1);
                        isInAnimSet = 1;
                    } else {
                        isInAnim = e;
                    }
                    element.attr(e.totalOrigin);
                    break;
                }
            }
        } else {
            status = +to; // NaN
        }
        for (var i = 0, ii = anim.percents.length; i < ii; i++) {
            if (anim.percents[i] == percent || anim.percents[i] > status * anim.top) {
                percent = anim.percents[i];
                prev = anim.percents[i - 1] || 0;
                ms = ms / anim.top * (percent - prev);
                next = anim.percents[i + 1];
                params = anim.anim[percent];
                break;
            } else if (status) {
                element.attr(anim.anim[anim.percents[i]]);
            }
        }
        if (!params) {
            return;
        }
        if (!isInAnim) {
            for (var attr in params) if (params[has](attr)) {
                if (availableAnimAttrs[has](attr) || element.paper.customAttributes[has](attr)) {
                    from[attr] = element.attr(attr);
                    (from[attr] == null) && (from[attr] = availableAttrs[attr]);
                    to[attr] = params[attr];
                    switch (availableAnimAttrs[attr]) {
                        case nu:
                            diff[attr] = (to[attr] - from[attr]) / ms;
                            break;
                        case "colour":
                            from[attr] = R.getRGB(from[attr]);
                            var toColour = R.getRGB(to[attr]);
                            diff[attr] = {
                                r: (toColour.r - from[attr].r) / ms,
                                g: (toColour.g - from[attr].g) / ms,
                                b: (toColour.b - from[attr].b) / ms
                            };
                            break;
                        case "path":
                            var pathes = path2curve(from[attr], to[attr]),
                                toPath = pathes[1];
                            from[attr] = pathes[0];
                            diff[attr] = [];
                            for (i = 0, ii = from[attr].length; i < ii; i++) {
                                diff[attr][i] = [0];
                                for (var j = 1, jj = from[attr][i].length; j < jj; j++) {
                                    diff[attr][i][j] = (toPath[i][j] - from[attr][i][j]) / ms;
                                }
                            }
                            break;
                        case "transform":
                            var _ = element._,
                                eq = equaliseTransform(_[attr], to[attr]);
                            if (eq) {
                                from[attr] = eq.from;
                                to[attr] = eq.to;
                                diff[attr] = [];
                                diff[attr].real = true;
                                for (i = 0, ii = from[attr].length; i < ii; i++) {
                                    diff[attr][i] = [from[attr][i][0]];
                                    for (j = 1, jj = from[attr][i].length; j < jj; j++) {
                                        diff[attr][i][j] = (to[attr][i][j] - from[attr][i][j]) / ms;
                                    }
                                }
                            } else {
                                var m = (element.matrix || new Matrix),
                                    to2 = {
                                        _: {transform: _.transform},
                                        getBBox: function () {
                                            return element.getBBox(1);
                                        }
                                    };
                                from[attr] = [
                                    m.a,
                                    m.b,
                                    m.c,
                                    m.d,
                                    m.e,
                                    m.f
                                ];
                                extractTransform(to2, to[attr]);
                                to[attr] = to2._.transform;
                                diff[attr] = [
                                    (to2.matrix.a - m.a) / ms,
                                    (to2.matrix.b - m.b) / ms,
                                    (to2.matrix.c - m.c) / ms,
                                    (to2.matrix.d - m.d) / ms,
                                    (to2.matrix.e - m.e) / ms,
                                    (to2.matrix.f - m.f) / ms
                                ];
                                // from[attr] = [_.sx, _.sy, _.deg, _.dx, _.dy];
                                // var to2 = {_:{}, getBBox: function () { return element.getBBox(); }};
                                // extractTransform(to2, to[attr]);
                                // diff[attr] = [
                                //     (to2._.sx - _.sx) / ms,
                                //     (to2._.sy - _.sy) / ms,
                                //     (to2._.deg - _.deg) / ms,
                                //     (to2._.dx - _.dx) / ms,
                                //     (to2._.dy - _.dy) / ms
                                // ];
                            }
                            break;
                        case "csv":
                            var values = Str(params[attr])[split](separator),
                                from2 = Str(from[attr])[split](separator);
                            if (attr == "clip-rect") {
                                from[attr] = from2;
                                diff[attr] = [];
                                i = from2.length;
                                while (i--) {
                                    diff[attr][i] = (values[i] - from[attr][i]) / ms;
                                }
                            }
                            to[attr] = values;
                            break;
                        default:
                            values = [][concat](params[attr]);
                            from2 = [][concat](from[attr]);
                            diff[attr] = [];
                            i = element.paper.customAttributes[attr].length;
                            while (i--) {
                                diff[attr][i] = ((values[i] || 0) - (from2[i] || 0)) / ms;
                            }
                            break;
                    }
                }
            }
            var easing = params.easing,
                easyeasy = R.easing_formulas[easing];
            if (!easyeasy) {
                easyeasy = Str(easing).match(bezierrg);
                if (easyeasy && easyeasy.length == 5) {
                    var curve = easyeasy;
                    easyeasy = function (t) {
                        return CubicBezierAtTime(t, +curve[1], +curve[2], +curve[3], +curve[4], ms);
                    };
                } else {
                    easyeasy = pipe;
                }
            }
            timestamp = params.start || anim.start || +new Date;
            e = {
                anim: anim,
                percent: percent,
                timestamp: timestamp,
                start: timestamp + (anim.del || 0),
                status: 0,
                initstatus: status || 0,
                stop: false,
                ms: ms,
                easing: easyeasy,
                from: from,
                diff: diff,
                to: to,
                el: element,
                callback: params.callback,
                prev: prev,
                next: next,
                repeat: times || anim.times,
                origin: element.attr(),
                totalOrigin: totalOrigin
            };
            animationElements.push(e);
            if (status && !isInAnim && !isInAnimSet) {
                e.stop = true;
                e.start = new Date - ms * status;
                if (animationElements.length == 1) {
                    return animation();
                }
            }
            if (isInAnimSet) {
                e.start = new Date - e.ms * status;
            }
            animationElements.length == 1 && requestAnimFrame(animation);
        } else {
            isInAnim.initstatus = status;
            isInAnim.start = new Date - isInAnim.ms * status;
        }
        eve("raphael.anim.start." + element.id, element, anim);
    }
    
    R.animation = function (params, ms, easing, callback) {
        if (params instanceof Animation) {
            return params;
        }
        if (R.is(easing, "function") || !easing) {
            callback = callback || easing || null;
            easing = null;
        }
        params = Object(params);
        ms = +ms || 0;
        var p = {},
            json,
            attr;
        for (attr in params) if (params[has](attr) && toFloat(attr) != attr && toFloat(attr) + "%" != attr) {
            json = true;
            p[attr] = params[attr];
        }
        if (!json) {
            return new Animation(params, ms);
        } else {
            easing && (p.easing = easing);
            callback && (p.callback = callback);
            return new Animation({100: p}, ms);
        }
    };
    
    elproto.animate = function (params, ms, easing, callback) {
        var element = this;
        if (element.removed) {
            callback && callback.call(element);
            return element;
        }
        var anim = params instanceof Animation ? params : R.animation(params, ms, easing, callback);
        runAnimation(anim, element, anim.percents[0], null, element.attr());
        return element;
    };
    
    elproto.setTime = function (anim, value) {
        if (anim && value != null) {
            this.status(anim, mmin(value, anim.ms) / anim.ms);
        }
        return this;
    };
    
    elproto.status = function (anim, value) {
        var out = [],
            i = 0,
            len,
            e;
        if (value != null) {
            runAnimation(anim, this, -1, mmin(value, 1));
            return this;
        } else {
            len = animationElements.length;
            for (; i < len; i++) {
                e = animationElements[i];
                if (e.el.id == this.id && (!anim || e.anim == anim)) {
                    if (anim) {
                        return e.status;
                    }
                    out.push({
                        anim: e.anim,
                        status: e.status
                    });
                }
            }
            if (anim) {
                return 0;
            }
            return out;
        }
    };
    
    elproto.pause = function (anim) {
        for (var i = 0; i < animationElements.length; i++) if (animationElements[i].el.id == this.id && (!anim || animationElements[i].anim == anim)) {
            if (eve("raphael.anim.pause." + this.id, this, animationElements[i].anim) !== false) {
                animationElements[i].paused = true;
            }
        }
        return this;
    };
    
    elproto.resume = function (anim) {
        for (var i = 0; i < animationElements.length; i++) if (animationElements[i].el.id == this.id && (!anim || animationElements[i].anim == anim)) {
            var e = animationElements[i];
            if (eve("raphael.anim.resume." + this.id, this, e.anim) !== false) {
                delete e.paused;
                this.status(e.anim, e.status);
            }
        }
        return this;
    };
    
    elproto.stop = function (anim) {
        for (var i = 0; i < animationElements.length; i++) if (animationElements[i].el.id == this.id && (!anim || animationElements[i].anim == anim)) {
            if (eve("raphael.anim.stop." + this.id, this, animationElements[i].anim) !== false) {
                animationElements.splice(i--, 1);
            }
        }
        return this;
    };
    function stopAnimation(paper) {
        for (var i = 0; i < animationElements.length; i++) if (animationElements[i].el.paper == paper) {
            animationElements.splice(i--, 1);
        }
    }
    eve.on("raphael.remove", stopAnimation);
    eve.on("raphael.clear", stopAnimation);
    elproto.toString = function () {
        return "Rapha\xebl\u2019s object";
    };

    // Set
    var Set = function (items) {
        this.items = [];
        this.length = 0;
        this.type = "set";
        if (items) {
            for (var i = 0, ii = items.length; i < ii; i++) {
                if (items[i] && (items[i].constructor == elproto.constructor || items[i].constructor == Set)) {
                    this[this.items.length] = this.items[this.items.length] = items[i];
                    this.length++;
                }
            }
        }
    },
    setproto = Set.prototype;
    
    setproto.push = function () {
        var item,
            len;
        for (var i = 0, ii = arguments.length; i < ii; i++) {
            item = arguments[i];
            if (item && (item.constructor == elproto.constructor || item.constructor == Set)) {
                len = this.items.length;
                this[len] = this.items[len] = item;
                this.length++;
            }
        }
        return this;
    };
    
    setproto.pop = function () {
        this.length && delete this[this.length--];
        return this.items.pop();
    };
    
    setproto.forEach = function (callback, thisArg) {
        for (var i = 0, ii = this.items.length; i < ii; i++) {
            if (callback.call(thisArg, this.items[i], i) === false) {
                return this;
            }
        }
        return this;
    };
    for (var method in elproto) if (elproto[has](method)) {
        setproto[method] = (function (methodname) {
            return function () {
                var arg = arguments;
                return this.forEach(function (el) {
                    el[methodname][apply](el, arg);
                });
            };
        })(method);
    }
    setproto.attr = function (name, value) {
        if (name && R.is(name, array) && R.is(name[0], "object")) {
            for (var j = 0, jj = name.length; j < jj; j++) {
                this.items[j].attr(name[j]);
            }
        } else {
            for (var i = 0, ii = this.items.length; i < ii; i++) {
                this.items[i].attr(name, value);
            }
        }
        return this;
    };
    
    setproto.clear = function () {
        while (this.length) {
            this.pop();
        }
    };
    
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
    
    setproto.exclude = function (el) {
        for (var i = 0, ii = this.length; i < ii; i++) if (this[i] == el) {
            this.splice(i, 1);
            return true;
        }
    };
    setproto.animate = function (params, ms, easing, callback) {
        (R.is(easing, "function") || !easing) && (callback = easing || null);
        var len = this.items.length,
            i = len,
            item,
            set = this,
            collector;
        if (!len) {
            return this;
        }
        callback && (collector = function () {
            !--len && callback.call(set);
        });
        easing = R.is(easing, string) ? easing : collector;
        var anim = R.animation(params, ms, easing, collector);
        item = this.items[--i].animate(anim);
        while (i--) {
            this.items[i] && !this.items[i].removed && this.items[i].animateWith(item, anim, anim);
        }
        return this;
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
        x = mmin[apply](0, x);
        y = mmin[apply](0, y);
        x2 = mmax[apply](0, x2);
        y2 = mmax[apply](0, y2);
        return {
            x: x,
            y: y,
            x2: x2,
            y2: y2,
            width: x2 - x,
            height: y2 - y
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
        return "Rapha\xebl\u2018s set";
    };

    
    R.registerFont = function (font) {
        if (!font.face) {
            return font;
        }
        this.fonts = this.fonts || {};
        var fontcopy = {
                w: font.w,
                face: {},
                glyphs: {}
            },
            family = font.face["font-family"];
        for (var prop in font.face) if (font.face[has](prop)) {
            fontcopy.face[prop] = font.face[prop];
        }
        if (this.fonts[family]) {
            this.fonts[family].push(fontcopy);
        } else {
            this.fonts[family] = [fontcopy];
        }
        if (!font.svg) {
            fontcopy.face["units-per-em"] = toInt(font.face["units-per-em"], 10);
            for (var glyph in font.glyphs) if (font.glyphs[has](glyph)) {
                var path = font.glyphs[glyph];
                fontcopy.glyphs[glyph] = {
                    w: path.w,
                    k: {},
                    d: path.d && "M" + path.d.replace(/[mlcxtrv]/g, function (command) {
                            return {l: "L", c: "C", x: "z", t: "m", r: "l", v: "c"}[command] || "M";
                        }) + "z"
                };
                if (path.k) {
                    for (var k in path.k) if (path[has](k)) {
                        fontcopy.glyphs[glyph].k[k] = path.k[k];
                    }
                }
            }
        }
        return font;
    };
    
    paperproto.getFont = function (family, weight, style, stretch) {
        stretch = stretch || "normal";
        style = style || "normal";
        weight = +weight || {normal: 400, bold: 700, lighter: 300, bolder: 800}[weight] || 400;
        if (!R.fonts) {
            return;
        }
        var font = R.fonts[family];
        if (!font) {
            var name = new RegExp("(^|\\s)" + family.replace(/[^\w\d\s+!~.:_-]/g, E) + "(\\s|$)", "i");
            for (var fontName in R.fonts) if (R.fonts[has](fontName)) {
                if (name.test(fontName)) {
                    font = R.fonts[fontName];
                    break;
                }
            }
        }
        var thefont;
        if (font) {
            for (var i = 0, ii = font.length; i < ii; i++) {
                thefont = font[i];
                if (thefont.face["font-weight"] == weight && (thefont.face["font-style"] == style || !thefont.face["font-style"]) && thefont.face["font-stretch"] == stretch) {
                    break;
                }
            }
        }
        return thefont;
    };
    
    paperproto.print = function (x, y, string, font, size, origin, letter_spacing) {
        origin = origin || "middle"; // baseline|middle
        letter_spacing = mmax(mmin(letter_spacing || 0, 1), -1);
        var letters = Str(string)[split](E),
            shift = 0,
            notfirst = 0,
            path = E,
            scale;
        R.is(font, string) && (font = this.getFont(font));
        if (font) {
            scale = (size || 16) / font.face["units-per-em"];
            var bb = font.face.bbox[split](separator),
                top = +bb[0],
                lineHeight = bb[3] - bb[1],
                shifty = 0,
                height = +bb[1] + (origin == "baseline" ? lineHeight + (+font.face.descent) : lineHeight / 2);
            for (var i = 0, ii = letters.length; i < ii; i++) {
                if (letters[i] == "\n") {
                    shift = 0;
                    curr = 0;
                    notfirst = 0;
                    shifty += lineHeight;
                } else {
                    var prev = notfirst && font.glyphs[letters[i - 1]] || {},
                        curr = font.glyphs[letters[i]];
                    shift += notfirst ? (prev.w || font.w) + (prev.k && prev.k[letters[i]] || 0) + (font.w * letter_spacing) : 0;
                    notfirst = 1;
                }
                if (curr && curr.d) {
                    path += R.transformPath(curr.d, ["t", shift * scale, shifty * scale, "s", scale, scale, top, height, "t", (x - top) / scale, (y - height) / scale]);
                }
            }
        }
        return this.path(path).attr({
            fill: "#000",
            stroke: "none"
        });
    };

    
    paperproto.add = function (json) {
        if (R.is(json, "array")) {
            var res = this.set(),
                i = 0,
                ii = json.length,
                j;
            for (; i < ii; i++) {
                j = json[i] || {};
                elements[has](j.type) && res.push(this[j.type]().attr(j));
            }
        }
        return res;
    };

    
    R.format = function (token, params) {
        var args = R.is(params, array) ? [0][concat](params) : arguments;
        token && R.is(token, string) && args.length - 1 && (token = token.replace(formatrg, function (str, i) {
            return args[++i] == null ? E : args[i];
        }));
        return token || E;
    };
    
    R.fullfill = (function () {
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
            return String(str).replace(tokenRegex, function (all, key) {
                return replacer(all, key, obj);
            });
        };
    })();
    
    R.ninja = function () {
        oldRaphael.was ? (g.win.Raphael = oldRaphael.is) : delete Raphael;
        return R;
    };
    
    R.st = setproto;
    // BROWSERIFY MOD: use R._g.doc instead of document
    // Firefox <3.6 fix: http://webreflection.blogspot.com/2009/11/195-chars-to-help-lazy-loading.html
    (function (doc, loaded, f) {
        if (doc.readyState == null && doc.addEventListener){
            doc.addEventListener(loaded, f = function () {
                doc.removeEventListener(loaded, f, false);
                doc.readyState = "complete";
            }, false);
            doc.readyState = "loading";
        }
        function isLoaded() {
            (/in/).test(doc.readyState) ? setTimeout(isLoaded, 9) : R.eve("raphael.DOMload");
        }
        isLoaded();
    })(R._g.doc, "DOMContentLoaded");

    // BROWSERIFY MOD: always set file-scope Raphael = R
    // oldRaphael.was ? (g.win.Raphael = R) : (Raphael = R);
    // if (oldRaphael.was) g.win.Raphael = R;
    Raphael = R;
    
    eve.on("raphael.DOMload", function () {
        loaded = true;
    });
})();

// console.log(Raphael);

// ┌─────────────────────────────────────────────────────────────────────┐ \\
// │ Raphaël - JavaScript Vector Library                                 │ \\
// ├─────────────────────────────────────────────────────────────────────┤ \\
// │ SVG Module                                                          │ \\
// ├─────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright (c) 2008-2011 Dmitry Baranovskiy (http://raphaeljs.com)   │ \\
// │ Copyright (c) 2008-2011 Sencha Labs (http://sencha.com)             │ \\
// │ Licensed under the MIT (http://raphaeljs.com/license.html) license. │ \\
// └─────────────────────────────────────────────────────────────────────┘ \\
// BROWSERIFY MOD: use Raphael instead of window.raphael
Raphael.svg && function (R) {
    var has = "hasOwnProperty",
        Str = String,
        toFloat = parseFloat,
        toInt = parseInt,
        math = Math,
        mmax = math.max,
        abs = math.abs,
        pow = math.pow,
        separator = /[, ]+/,
        eve = R.eve,
        E = "",
        S = " ";
    var xlink = "http://www.w3.org/1999/xlink",
        markers = {
            block: "M5,0 0,2.5 5,5z",
            classic: "M5,0 0,2.5 5,5 3.5,3 3.5,2z",
            diamond: "M2.5,0 5,2.5 2.5,5 0,2.5z",
            open: "M6,1 1,3.5 6,6",
            oval: "M2.5,0A2.5,2.5,0,0,1,2.5,5 2.5,2.5,0,0,1,2.5,0z"
        },
        markerCounter = {};
    R.toString = function () {
        return  "Your browser supports SVG.\nYou are running Rapha\xebl " + this.version;
    };
    var $ = function (el, attr) {
        if (attr) {
            if (typeof el == "string") {
                el = $(el);
            }
            for (var key in attr) if (attr[has](key)) {
                if (key.substring(0, 6) == "xlink:") {
                    el.setAttributeNS(xlink, key.substring(6), Str(attr[key]));
                } else {
                    el.setAttribute(key, Str(attr[key]));
                }
            }
        } else {
            el = R._g.doc.createElementNS("http://www.w3.org/2000/svg", el);
            el.style && (el.style.webkitTapHighlightColor = "rgba(0,0,0,0)");
        }
        return el;
    },
    addGradientFill = function (element, gradient) {
        var type = "linear",
            id = element.id + gradient,
            fx = .5, fy = .5,
            o = element.node,
            SVG = element.paper,
            s = o.style,
            el = R._g.doc.getElementById(id);
        if (!el) {
            gradient = Str(gradient).replace(R._radial_gradient, function (all, _fx, _fy) {
                type = "radial";
                if (_fx && _fy) {
                    fx = toFloat(_fx);
                    fy = toFloat(_fy);
                    var dir = ((fy > .5) * 2 - 1);
                    pow(fx - .5, 2) + pow(fy - .5, 2) > .25 &&
                        (fy = math.sqrt(.25 - pow(fx - .5, 2)) * dir + .5) &&
                        fy != .5 &&
                        (fy = fy.toFixed(5) - 1e-5 * dir);
                }
                return E;
            });
            gradient = gradient.split(/\s*\-\s*/);
            if (type == "linear") {
                var angle = gradient.shift();
                angle = -toFloat(angle);
                if (isNaN(angle)) {
                    return null;
                }
                var vector = [0, 0, math.cos(R.rad(angle)), math.sin(R.rad(angle))],
                    max = 1 / (mmax(abs(vector[2]), abs(vector[3])) || 1);
                vector[2] *= max;
                vector[3] *= max;
                if (vector[2] < 0) {
                    vector[0] = -vector[2];
                    vector[2] = 0;
                }
                if (vector[3] < 0) {
                    vector[1] = -vector[3];
                    vector[3] = 0;
                }
            }
            var dots = R._parseDots(gradient);
            if (!dots) {
                return null;
            }
            id = id.replace(/[\(\)\s,\xb0#]/g, "_");
            
            if (element.gradient && id != element.gradient.id) {
                SVG.defs.removeChild(element.gradient);
                delete element.gradient;
            }

            if (!element.gradient) {
                el = $(type + "Gradient", {id: id});
                element.gradient = el;
                $(el, type == "radial" ? {
                    fx: fx,
                    fy: fy
                } : {
                    x1: vector[0],
                    y1: vector[1],
                    x2: vector[2],
                    y2: vector[3],
                    gradientTransform: element.matrix.invert()
                });
                SVG.defs.appendChild(el);
                for (var i = 0, ii = dots.length; i < ii; i++) {
                    el.appendChild($("stop", {
                        offset: dots[i].offset ? dots[i].offset : i ? "100%" : "0%",
                        "stop-color": dots[i].color || "#fff"
                    }));
                }
            }
        }
        $(o, {
            fill: "url(#" + id + ")",
            opacity: 1,
            "fill-opacity": 1
        });
        s.fill = E;
        s.opacity = 1;
        s.fillOpacity = 1;
        return 1;
    },
    updatePosition = function (o) {
        var bbox = o.getBBox(1);
        $(o.pattern, {patternTransform: o.matrix.invert() + " translate(" + bbox.x + "," + bbox.y + ")"});
    },
    addArrow = function (o, value, isEnd) {
        if (o.type == "path") {
            var values = Str(value).toLowerCase().split("-"),
                p = o.paper,
                se = isEnd ? "end" : "start",
                node = o.node,
                attrs = o.attrs,
                stroke = attrs["stroke-width"],
                i = values.length,
                type = "classic",
                from,
                to,
                dx,
                refX,
                attr,
                w = 3,
                h = 3,
                t = 5;
            while (i--) {
                switch (values[i]) {
                    case "block":
                    case "classic":
                    case "oval":
                    case "diamond":
                    case "open":
                    case "none":
                        type = values[i];
                        break;
                    case "wide": h = 5; break;
                    case "narrow": h = 2; break;
                    case "long": w = 5; break;
                    case "short": w = 2; break;
                }
            }
            if (type == "open") {
                w += 2;
                h += 2;
                t += 2;
                dx = 1;
                refX = isEnd ? 4 : 1;
                attr = {
                    fill: "none",
                    stroke: attrs.stroke
                };
            } else {
                refX = dx = w / 2;
                attr = {
                    fill: attrs.stroke,
                    stroke: "none"
                };
            }
            if (o._.arrows) {
                if (isEnd) {
                    o._.arrows.endPath && markerCounter[o._.arrows.endPath]--;
                    o._.arrows.endMarker && markerCounter[o._.arrows.endMarker]--;
                } else {
                    o._.arrows.startPath && markerCounter[o._.arrows.startPath]--;
                    o._.arrows.startMarker && markerCounter[o._.arrows.startMarker]--;
                }
            } else {
                o._.arrows = {};
            }
            if (type != "none") {
                var pathId = "raphael-marker-" + type,
                    markerId = "raphael-marker-" + se + type + w + h;
                if (!R._g.doc.getElementById(pathId)) {
                    p.defs.appendChild($($("path"), {
                        "stroke-linecap": "round",
                        d: markers[type],
                        id: pathId
                    }));
                    markerCounter[pathId] = 1;
                } else {
                    markerCounter[pathId]++;
                }
                var marker = R._g.doc.getElementById(markerId),
                    use;
                if (!marker) {
                    marker = $($("marker"), {
                        id: markerId,
                        markerHeight: h,
                        markerWidth: w,
                        orient: "auto",
                        refX: refX,
                        refY: h / 2
                    });
                    use = $($("use"), {
                        "xlink:href": "#" + pathId,
                        transform: (isEnd ? "rotate(180 " + w / 2 + " " + h / 2 + ") " : E) + "scale(" + w / t + "," + h / t + ")",
                        "stroke-width": (1 / ((w / t + h / t) / 2)).toFixed(4)
                    });
                    marker.appendChild(use);
                    p.defs.appendChild(marker);
                    markerCounter[markerId] = 1;
                } else {
                    markerCounter[markerId]++;
                    use = marker.getElementsByTagName("use")[0];
                }
                $(use, attr);
                var delta = dx * (type != "diamond" && type != "oval");
                if (isEnd) {
                    from = o._.arrows.startdx * stroke || 0;
                    to = R.getTotalLength(attrs.path) - delta * stroke;
                } else {
                    from = delta * stroke;
                    to = R.getTotalLength(attrs.path) - (o._.arrows.enddx * stroke || 0);
                }
                attr = {};
                attr["marker-" + se] = "url(#" + markerId + ")";
                if (to || from) {
                    attr.d = Raphael.getSubpath(attrs.path, from, to);
                }
                $(node, attr);
                o._.arrows[se + "Path"] = pathId;
                o._.arrows[se + "Marker"] = markerId;
                o._.arrows[se + "dx"] = delta;
                o._.arrows[se + "Type"] = type;
                o._.arrows[se + "String"] = value;
            } else {
                if (isEnd) {
                    from = o._.arrows.startdx * stroke || 0;
                    to = R.getTotalLength(attrs.path) - from;
                } else {
                    from = 0;
                    to = R.getTotalLength(attrs.path) - (o._.arrows.enddx * stroke || 0);
                }
                o._.arrows[se + "Path"] && $(node, {d: Raphael.getSubpath(attrs.path, from, to)});
                delete o._.arrows[se + "Path"];
                delete o._.arrows[se + "Marker"];
                delete o._.arrows[se + "dx"];
                delete o._.arrows[se + "Type"];
                delete o._.arrows[se + "String"];
            }
            for (attr in markerCounter) if (markerCounter[has](attr) && !markerCounter[attr]) {
                var item = R._g.doc.getElementById(attr);
                item && item.parentNode.removeChild(item);
            }
        }
    },
    dasharray = {
        "": [0],
        "none": [0],
        "-": [3, 1],
        ".": [1, 1],
        "-.": [3, 1, 1, 1],
        "-..": [3, 1, 1, 1, 1, 1],
        ". ": [1, 3],
        "- ": [4, 3],
        "--": [8, 3],
        "- .": [4, 3, 1, 3],
        "--.": [8, 3, 1, 3],
        "--..": [8, 3, 1, 3, 1, 3]
    },
    addDashes = function (o, value, params) {
        value = dasharray[Str(value).toLowerCase()];
        if (value) {
            var width = o.attrs["stroke-width"] || "1",
                butt = {round: width, square: width, butt: 0}[o.attrs["stroke-linecap"] || params["stroke-linecap"]] || 0,
                dashes = [],
                i = value.length;
            while (i--) {
                dashes[i] = value[i] * width + ((i % 2) ? 1 : -1) * butt;
            }
            $(o.node, {"stroke-dasharray": dashes.join(",")});
        }
    },
    setFillAndStroke = function (o, params) {
        var node = o.node,
            attrs = o.attrs,
            vis = node.style.visibility;
        node.style.visibility = "hidden";
        for (var att in params) {
            if (params[has](att)) {
                if (!R._availableAttrs[has](att)) {
                    continue;
                }
                var value = params[att];
                attrs[att] = value;
                switch (att) {
                    case "blur":
                        o.blur(value);
                        break;
                    case "href":
                    case "title":
                    case "target":
                        var pn = node.parentNode;
                        if (pn.tagName.toLowerCase() != "a") {
                            var hl = $("a");
                            pn.insertBefore(hl, node);
                            hl.appendChild(node);
                            pn = hl;
                        }
                        if (att == "target") {
                            pn.setAttributeNS(xlink, "show", value == "blank" ? "new" : value);
                        } else {
                            pn.setAttributeNS(xlink, att, value);
                        }
                        break;
                    case "cursor":
                        node.style.cursor = value;
                        break;
                    case "transform":
                        o.transform(value);
                        break;
                    case "arrow-start":
                        addArrow(o, value);
                        break;
                    case "arrow-end":
                        addArrow(o, value, 1);
                        break;
                    case "clip-rect":
                        var rect = Str(value).split(separator);
                        if (rect.length == 4) {
                            o.clip && o.clip.parentNode.parentNode.removeChild(o.clip.parentNode);
                            var el = $("clipPath"),
                                rc = $("rect");
                            el.id = R.createUUID();
                            $(rc, {
                                x: rect[0],
                                y: rect[1],
                                width: rect[2],
                                height: rect[3]
                            });
                            el.appendChild(rc);
                            o.paper.defs.appendChild(el);
                            $(node, {"clip-path": "url(#" + el.id + ")"});
                            o.clip = rc;
                        }
                        if (!value) {
                            var path = node.getAttribute("clip-path");
                            if (path) {
                                var clip = R._g.doc.getElementById(path.replace(/(^url\(#|\)$)/g, E));
                                clip && clip.parentNode.removeChild(clip);
                                $(node, {"clip-path": E});
                                delete o.clip;
                            }
                        }
                    break;
                    case "path":
                        if (o.type == "path") {
                            $(node, {d: value ? attrs.path = R._pathToAbsolute(value) : "M0,0"});
                            o._.dirty = 1;
                            if (o._.arrows) {
                                "startString" in o._.arrows && addArrow(o, o._.arrows.startString);
                                "endString" in o._.arrows && addArrow(o, o._.arrows.endString, 1);
                            }
                        }
                        break;
                    case "width":
                        node.setAttribute(att, value);
                        o._.dirty = 1;
                        if (attrs.fx) {
                            att = "x";
                            value = attrs.x;
                        } else {
                            break;
                        }
                    case "x":
                        if (attrs.fx) {
                            value = -attrs.x - (attrs.width || 0);
                        }
                    case "rx":
                        if (att == "rx" && o.type == "rect") {
                            break;
                        }
                    case "cx":
                        node.setAttribute(att, value);
                        o.pattern && updatePosition(o);
                        o._.dirty = 1;
                        break;
                    case "height":
                        node.setAttribute(att, value);
                        o._.dirty = 1;
                        if (attrs.fy) {
                            att = "y";
                            value = attrs.y;
                        } else {
                            break;
                        }
                    case "y":
                        if (attrs.fy) {
                            value = -attrs.y - (attrs.height || 0);
                        }
                    case "ry":
                        if (att == "ry" && o.type == "rect") {
                            break;
                        }
                    case "cy":
                        node.setAttribute(att, value);
                        o.pattern && updatePosition(o);
                        o._.dirty = 1;
                        break;
                    case "r":
                        if (o.type == "rect") {
                            $(node, {rx: value, ry: value});
                        } else {
                            node.setAttribute(att, value);
                        }
                        o._.dirty = 1;
                        break;
                    case "src":
                        if (o.type == "image") {
                            node.setAttributeNS(xlink, "href", value);
                        }
                        break;
                    case "stroke-width":
                        if (o._.sx != 1 || o._.sy != 1) {
                            value /= mmax(abs(o._.sx), abs(o._.sy)) || 1;
                        }
                        if (o.paper._vbSize) {
                            value *= o.paper._vbSize;
                        }
                        node.setAttribute(att, value);
                        if (attrs["stroke-dasharray"]) {
                            addDashes(o, attrs["stroke-dasharray"], params);
                        }
                        if (o._.arrows) {
                            "startString" in o._.arrows && addArrow(o, o._.arrows.startString);
                            "endString" in o._.arrows && addArrow(o, o._.arrows.endString, 1);
                        }
                        break;
                    case "stroke-dasharray":
                        addDashes(o, value, params);
                        break;
                    case "fill":
                        var isURL = Str(value).match(R._ISURL);
                        if (isURL) {
                            el = $("pattern");
                            var ig = $("image");
                            el.id = R.createUUID();
                            $(el, {x: 0, y: 0, patternUnits: "userSpaceOnUse", height: 1, width: 1});
                            $(ig, {x: 0, y: 0, "xlink:href": isURL[1]});
                            el.appendChild(ig);

                            (function (el) {
                                R._preload(isURL[1], function () {
                                    var w = this.offsetWidth,
                                        h = this.offsetHeight;
                                    $(el, {width: w, height: h});
                                    $(ig, {width: w, height: h});
                                    o.paper.safari();
                                });
                            })(el);
                            o.paper.defs.appendChild(el);
                            $(node, {fill: "url(#" + el.id + ")"});
                            o.pattern = el;
                            o.pattern && updatePosition(o);
                            break;
                        }
                        var clr = R.getRGB(value);
                        if (!clr.error) {
                            delete params.gradient;
                            delete attrs.gradient;
                            !R.is(attrs.opacity, "undefined") &&
                                R.is(params.opacity, "undefined") &&
                                $(node, {opacity: attrs.opacity});
                            !R.is(attrs["fill-opacity"], "undefined") &&
                                R.is(params["fill-opacity"], "undefined") &&
                                $(node, {"fill-opacity": attrs["fill-opacity"]});
                        } else if ((o.type == "circle" || o.type == "ellipse" || Str(value).charAt() != "r") && addGradientFill(o, value)) {
                            if ("opacity" in attrs || "fill-opacity" in attrs) {
                                var gradient = R._g.doc.getElementById(node.getAttribute("fill").replace(/^url\(#|\)$/g, E));
                                if (gradient) {
                                    var stops = gradient.getElementsByTagName("stop");
                                    $(stops[stops.length - 1], {"stop-opacity": ("opacity" in attrs ? attrs.opacity : 1) * ("fill-opacity" in attrs ? attrs["fill-opacity"] : 1)});
                                }
                            }
                            attrs.gradient = value;
                            attrs.fill = "none";
                            break;
                        }
                        clr[has]("opacity") && $(node, {"fill-opacity": clr.opacity > 1 ? clr.opacity / 100 : clr.opacity});
                    case "stroke":
                        clr = R.getRGB(value);
                        node.setAttribute(att, clr.hex);
                        att == "stroke" && clr[has]("opacity") && $(node, {"stroke-opacity": clr.opacity > 1 ? clr.opacity / 100 : clr.opacity});
                        if (att == "stroke" && o._.arrows) {
                            "startString" in o._.arrows && addArrow(o, o._.arrows.startString);
                            "endString" in o._.arrows && addArrow(o, o._.arrows.endString, 1);
                        }
                        break;
                    case "gradient":
                        (o.type == "circle" || o.type == "ellipse" || Str(value).charAt() != "r") && addGradientFill(o, value);
                        break;
                    case "opacity":
                        if (attrs.gradient && !attrs[has]("stroke-opacity")) {
                            $(node, {"stroke-opacity": value > 1 ? value / 100 : value});
                        }
                        // fall
                    case "fill-opacity":
                        if (attrs.gradient) {
                            gradient = R._g.doc.getElementById(node.getAttribute("fill").replace(/^url\(#|\)$/g, E));
                            if (gradient) {
                                stops = gradient.getElementsByTagName("stop");
                                $(stops[stops.length - 1], {"stop-opacity": value});
                            }
                            break;
                        }
                    default:
                        att == "font-size" && (value = toInt(value, 10) + "px");
                        var cssrule = att.replace(/(\-.)/g, function (w) {
                            return w.substring(1).toUpperCase();
                        });
                        node.style[cssrule] = value;
                        o._.dirty = 1;
                        node.setAttribute(att, value);
                        break;
                }
            }
        }

        tuneText(o, params);
        node.style.visibility = vis;
    },
    leading = 1.2,
    tuneText = function (el, params) {
        if (el.type != "text" || !(params[has]("text") || params[has]("font") || params[has]("font-size") || params[has]("x") || params[has]("y"))) {
            return;
        }
        var a = el.attrs,
            node = el.node,
            fontSize = node.firstChild ? toInt(R._g.doc.defaultView.getComputedStyle(node.firstChild, E).getPropertyValue("font-size"), 10) : 10;

        if (params[has]("text")) {
            a.text = params.text;
            while (node.firstChild) {
                node.removeChild(node.firstChild);
            }
            var texts = Str(params.text).split("\n"),
                tspans = [],
                tspan;
            for (var i = 0, ii = texts.length; i < ii; i++) {
                tspan = $("tspan");
                i && $(tspan, {dy: fontSize * leading, x: a.x});
                tspan.appendChild(R._g.doc.createTextNode(texts[i]));
                node.appendChild(tspan);
                tspans[i] = tspan;
            }
        } else {
            tspans = node.getElementsByTagName("tspan");
            for (i = 0, ii = tspans.length; i < ii; i++) if (i) {
                $(tspans[i], {dy: fontSize * leading, x: a.x});
            } else {
                $(tspans[0], {dy: 0});
            }
        }
        $(node, {x: a.x, y: a.y});
        el._.dirty = 1;
        var bb = el._getBBox(),
            dif = a.y - (bb.y + bb.height / 2);
        dif && R.is(dif, "finite") && $(tspans[0], {dy: dif});
    },
    Element = function (node, svg) {
        var X = 0,
            Y = 0;
        
        this[0] = this.node = node;
        
        node.raphael = true;
        
        this.id = R._oid++;
        node.raphaelid = this.id;
        this.matrix = R.matrix();
        this.realPath = null;
        
        this.paper = svg;
        this.attrs = this.attrs || {};
        this._ = {
            transform: [],
            sx: 1,
            sy: 1,
            deg: 0,
            dx: 0,
            dy: 0,
            dirty: 1
        };
        !svg.bottom && (svg.bottom = this);
        
        this.prev = svg.top;
        svg.top && (svg.top.next = this);
        svg.top = this;
        
        this.next = null;
    },
    elproto = R.el;

    Element.prototype = elproto;
    elproto.constructor = Element;

    R._engine.path = function (pathString, SVG) {
        var el = $("path");
        SVG.canvas && SVG.canvas.appendChild(el);
        var p = new Element(el, SVG);
        p.type = "path";
        setFillAndStroke(p, {
            fill: "none",
            stroke: "#000",
            path: pathString
        });
        return p;
    };
    
    elproto.rotate = function (deg, cx, cy) {
        if (this.removed) {
            return this;
        }
        deg = Str(deg).split(separator);
        if (deg.length - 1) {
            cx = toFloat(deg[1]);
            cy = toFloat(deg[2]);
        }
        deg = toFloat(deg[0]);
        (cy == null) && (cx = cy);
        if (cx == null || cy == null) {
            var bbox = this.getBBox(1);
            cx = bbox.x + bbox.width / 2;
            cy = bbox.y + bbox.height / 2;
        }
        this.transform(this._.transform.concat([["r", deg, cx, cy]]));
        return this;
    };
    
    elproto.scale = function (sx, sy, cx, cy) {
        if (this.removed) {
            return this;
        }
        sx = Str(sx).split(separator);
        if (sx.length - 1) {
            sy = toFloat(sx[1]);
            cx = toFloat(sx[2]);
            cy = toFloat(sx[3]);
        }
        sx = toFloat(sx[0]);
        (sy == null) && (sy = sx);
        (cy == null) && (cx = cy);
        if (cx == null || cy == null) {
            var bbox = this.getBBox(1);
        }
        cx = cx == null ? bbox.x + bbox.width / 2 : cx;
        cy = cy == null ? bbox.y + bbox.height / 2 : cy;
        this.transform(this._.transform.concat([["s", sx, sy, cx, cy]]));
        return this;
    };
    
    elproto.translate = function (dx, dy) {
        if (this.removed) {
            return this;
        }
        dx = Str(dx).split(separator);
        if (dx.length - 1) {
            dy = toFloat(dx[1]);
        }
        dx = toFloat(dx[0]) || 0;
        dy = +dy || 0;
        this.transform(this._.transform.concat([["t", dx, dy]]));
        return this;
    };
    
    elproto.transform = function (tstr) {
        var _ = this._;
        if (tstr == null) {
            return _.transform;
        }
        R._extractTransform(this, tstr);

        this.clip && $(this.clip, {transform: this.matrix.invert()});
        this.pattern && updatePosition(this);
        this.node && $(this.node, {transform: this.matrix});
    
        if (_.sx != 1 || _.sy != 1) {
            var sw = this.attrs[has]("stroke-width") ? this.attrs["stroke-width"] : 1;
            this.attr({"stroke-width": sw});
        }

        return this;
    };
    
    elproto.hide = function () {
        !this.removed && this.paper.safari(this.node.style.display = "none");
        return this;
    };
    
    elproto.show = function () {
        !this.removed && this.paper.safari(this.node.style.display = "");
        return this;
    };
    
    elproto.remove = function () {
        if (this.removed || !this.node.parentNode) {
            return;
        }
        var paper = this.paper;
        paper.__set__ && paper.__set__.exclude(this);
        eve.unbind("raphael.*.*." + this.id);
        if (this.gradient) {
            paper.defs.removeChild(this.gradient);
        }
        R._tear(this, paper);
        if (this.node.parentNode.tagName.toLowerCase() == "a") {
            this.node.parentNode.parentNode.removeChild(this.node.parentNode);
        } else {
            this.node.parentNode.removeChild(this.node);
        }
        for (var i in this) {
            this[i] = typeof this[i] == "function" ? R._removedFactory(i) : null;
        }
        this.removed = true;
    };
    elproto._getBBox = function () {
        if (this.node.style.display == "none") {
            this.show();
            var hide = true;
        }
        var bbox = {};
        try {
            bbox = this.node.getBBox();
        } catch(e) {
            // Firefox 3.0.x plays badly here
        } finally {
            bbox = bbox || {};
        }
        hide && this.hide();
        return bbox;
    };
    
    elproto.attr = function (name, value) {
        if (this.removed) {
            return this;
        }
        if (name == null) {
            var res = {};
            for (var a in this.attrs) if (this.attrs[has](a)) {
                res[a] = this.attrs[a];
            }
            res.gradient && res.fill == "none" && (res.fill = res.gradient) && delete res.gradient;
            res.transform = this._.transform;
            return res;
        }
        if (value == null && R.is(name, "string")) {
            if (name == "fill" && this.attrs.fill == "none" && this.attrs.gradient) {
                return this.attrs.gradient;
            }
            if (name == "transform") {
                return this._.transform;
            }
            var names = name.split(separator),
                out = {};
            for (var i = 0, ii = names.length; i < ii; i++) {
                name = names[i];
                if (name in this.attrs) {
                    out[name] = this.attrs[name];
                } else if (R.is(this.paper.customAttributes[name], "function")) {
                    out[name] = this.paper.customAttributes[name].def;
                } else {
                    out[name] = R._availableAttrs[name];
                }
            }
            return ii - 1 ? out : out[names[0]];
        }
        if (value == null && R.is(name, "array")) {
            out = {};
            for (i = 0, ii = name.length; i < ii; i++) {
                out[name[i]] = this.attr(name[i]);
            }
            return out;
        }
        if (value != null) {
            var params = {};
            params[name] = value;
        } else if (name != null && R.is(name, "object")) {
            params = name;
        }
        for (var key in params) {
            eve("raphael.attr." + key + "." + this.id, this, params[key]);
        }
        for (key in this.paper.customAttributes) if (this.paper.customAttributes[has](key) && params[has](key) && R.is(this.paper.customAttributes[key], "function")) {
            var par = this.paper.customAttributes[key].apply(this, [].concat(params[key]));
            this.attrs[key] = params[key];
            for (var subkey in par) if (par[has](subkey)) {
                params[subkey] = par[subkey];
            }
        }
        setFillAndStroke(this, params);
        return this;
    };
    
    elproto.toFront = function () {
        if (this.removed) {
            return this;
        }
        if (this.node.parentNode.tagName.toLowerCase() == "a") {
            this.node.parentNode.parentNode.appendChild(this.node.parentNode);
        } else {
            this.node.parentNode.appendChild(this.node);
        }
        var svg = this.paper;
        svg.top != this && R._tofront(this, svg);
        return this;
    };
    
    elproto.toBack = function () {
        if (this.removed) {
            return this;
        }
        var parent = this.node.parentNode;
        if (parent.tagName.toLowerCase() == "a") {
            parent.parentNode.insertBefore(this.node.parentNode, this.node.parentNode.parentNode.firstChild); 
        } else if (parent.firstChild != this.node) {
            parent.insertBefore(this.node, this.node.parentNode.firstChild);
        }
        R._toback(this, this.paper);
        var svg = this.paper;
        return this;
    };
    
    elproto.insertAfter = function (element) {
        if (this.removed) {
            return this;
        }
        var node = element.node || element[element.length - 1].node;
        if (node.nextSibling) {
            node.parentNode.insertBefore(this.node, node.nextSibling);
        } else {
            node.parentNode.appendChild(this.node);
        }
        R._insertafter(this, element, this.paper);
        return this;
    };
    
    elproto.insertBefore = function (element) {
        if (this.removed) {
            return this;
        }
        var node = element.node || element[0].node;
        node.parentNode.insertBefore(this.node, node);
        R._insertbefore(this, element, this.paper);
        return this;
    };
    elproto.blur = function (size) {
        // Experimental. No Safari support. Use it on your own risk.
        var t = this;
        if (+size !== 0) {
            var fltr = $("filter"),
                blur = $("feGaussianBlur");
            t.attrs.blur = size;
            fltr.id = R.createUUID();
            $(blur, {stdDeviation: +size || 1.5});
            fltr.appendChild(blur);
            t.paper.defs.appendChild(fltr);
            t._blur = fltr;
            $(t.node, {filter: "url(#" + fltr.id + ")"});
        } else {
            if (t._blur) {
                t._blur.parentNode.removeChild(t._blur);
                delete t._blur;
                delete t.attrs.blur;
            }
            t.node.removeAttribute("filter");
        }
    };
    R._engine.circle = function (svg, x, y, r) {
        var el = $("circle");
        svg.canvas && svg.canvas.appendChild(el);
        var res = new Element(el, svg);
        res.attrs = {cx: x, cy: y, r: r, fill: "none", stroke: "#000"};
        res.type = "circle";
        $(el, res.attrs);
        return res;
    };
    R._engine.rect = function (svg, x, y, w, h, r) {
        var el = $("rect");
        svg.canvas && svg.canvas.appendChild(el);
        var res = new Element(el, svg);
        res.attrs = {x: x, y: y, width: w, height: h, r: r || 0, rx: r || 0, ry: r || 0, fill: "none", stroke: "#000"};
        res.type = "rect";
        $(el, res.attrs);
        return res;
    };
    R._engine.ellipse = function (svg, x, y, rx, ry) {
        var el = $("ellipse");
        svg.canvas && svg.canvas.appendChild(el);
        var res = new Element(el, svg);
        res.attrs = {cx: x, cy: y, rx: rx, ry: ry, fill: "none", stroke: "#000"};
        res.type = "ellipse";
        $(el, res.attrs);
        return res;
    };
    R._engine.image = function (svg, src, x, y, w, h) {
        var el = $("image");
        $(el, {x: x, y: y, width: w, height: h, preserveAspectRatio: "none"});
        el.setAttributeNS(xlink, "href", src);
        svg.canvas && svg.canvas.appendChild(el);
        var res = new Element(el, svg);
        res.attrs = {x: x, y: y, width: w, height: h, src: src};
        res.type = "image";
        return res;
    };
    R._engine.text = function (svg, x, y, text) {
        var el = $("text");
        svg.canvas && svg.canvas.appendChild(el);
        var res = new Element(el, svg);
        res.attrs = {
            x: x,
            y: y,
            "text-anchor": "middle",
            text: text,
            font: R._availableAttrs.font,
            stroke: "none",
            fill: "#000"
        };
        res.type = "text";
        setFillAndStroke(res, res.attrs);
        return res;
    };
    R._engine.setSize = function (width, height) {
        this.width = width || this.width;
        this.height = height || this.height;
        this.canvas.setAttribute("width", this.width);
        this.canvas.setAttribute("height", this.height);
        if (this._viewBox) {
            this.setViewBox.apply(this, this._viewBox);
        }
        return this;
    };
    R._engine.create = function () {
        var con = R._getContainer.apply(0, arguments),
            container = con && con.container,
            x = con.x,
            y = con.y,
            width = con.width,
            height = con.height;
        if (!container) {
            throw new Error("SVG container not found.");
        }
        var cnvs = $("svg"),
            css = "overflow:hidden;",
            isFloating;
        x = x || 0;
        y = y || 0;
        width = width || 512;
        height = height || 342;
        $(cnvs, {
            height: height,
            version: 1.1,
            width: width,
            xmlns: "http://www.w3.org/2000/svg"
        });
        if (container == 1) {
            cnvs.style.cssText = css + "position:absolute;left:" + x + "px;top:" + y + "px";
            R._g.doc.body.appendChild(cnvs);
            isFloating = 1;
        } else {
            cnvs.style.cssText = css + "position:relative";
            if (container.firstChild) {
                container.insertBefore(cnvs, container.firstChild);
            } else {
                container.appendChild(cnvs);
            }
        }
        container = new R._Paper;
        container.width = width;
        container.height = height;
        container.canvas = cnvs;
        container.clear();
        container._left = container._top = 0;
        isFloating && (container.renderfix = function () {});
        container.renderfix();
        return container;
    };
    R._engine.setViewBox = function (x, y, w, h, fit) {
        eve("raphael.setViewBox", this, this._viewBox, [x, y, w, h, fit]);
        var size = mmax(w / this.width, h / this.height),
            top = this.top,
            aspectRatio = fit ? "meet" : "xMinYMin",
            vb,
            sw;
        if (x == null) {
            if (this._vbSize) {
                size = 1;
            }
            delete this._vbSize;
            vb = "0 0 " + this.width + S + this.height;
        } else {
            this._vbSize = size;
            vb = x + S + y + S + w + S + h;
        }
        $(this.canvas, {
            viewBox: vb,
            preserveAspectRatio: aspectRatio
        });
        while (size && top) {
            sw = "stroke-width" in top.attrs ? top.attrs["stroke-width"] : 1;
            top.attr({"stroke-width": sw});
            top._.dirty = 1;
            top._.dirtyT = 1;
            top = top.prev;
        }
        this._viewBox = [x, y, w, h, !!fit];
        return this;
    };
    
    R.prototype.renderfix = function () {
        var cnvs = this.canvas,
            s = cnvs.style,
            pos;
        try {
            pos = cnvs.getScreenCTM() || cnvs.createSVGMatrix();
        } catch (e) {
            // BROWSERIFY MOD: this will fail with jsdom since it's SVG 1.0,
            // but in jsdom this whole function isn't needed anyways
            try {
                pos = cnvs.createSVGMatrix();
            } catch (e) {
                return;
            }
        }
        var left = -pos.e % 1,
            top = -pos.f % 1;
        if (left || top) {
            if (left) {
                this._left = (this._left + left) % 1;
                s.left = this._left + "px";
            }
            if (top) {
                this._top = (this._top + top) % 1;
                s.top = this._top + "px";
            }
        }
    };
    
    R.prototype.clear = function () {
        R.eve("raphael.clear", this);
        var c = this.canvas;
        while (c.firstChild) {
            c.removeChild(c.firstChild);
        }
        this.bottom = this.top = null;
        (this.desc = $("desc")).appendChild(R._g.doc.createTextNode("Created with Rapha\xebl " + R.version));
        c.appendChild(this.desc);
        c.appendChild(this.defs = $("defs"));
    };
    
    R.prototype.remove = function () {
        eve("raphael.remove", this);
        this.canvas.parentNode && this.canvas.parentNode.removeChild(this.canvas);
        for (var i in this) {
            this[i] = typeof this[i] == "function" ? R._removedFactory(i) : null;
        }
    };
    var setproto = R.st;
    for (var method in elproto) if (elproto[has](method) && !setproto[has](method)) {
        setproto[method] = (function (methodname) {
            return function () {
                var arg = arguments;
                return this.forEach(function (el) {
                    el[methodname].apply(el, arg);
                });
            };
        })(method);
    }
}(Raphael);

// ┌─────────────────────────────────────────────────────────────────────┐ \\
// │ Raphaël - JavaScript Vector Library                                 │ \\
// ├─────────────────────────────────────────────────────────────────────┤ \\
// │ VML Module                                                          │ \\
// ├─────────────────────────────────────────────────────────────────────┤ \\
// │ Copyright (c) 2008-2011 Dmitry Baranovskiy (http://raphaeljs.com)   │ \\
// │ Copyright (c) 2008-2011 Sencha Labs (http://sencha.com)             │ \\
// │ Licensed under the MIT (http://raphaeljs.com/license.html) license. │ \\
// └─────────────────────────────────────────────────────────────────────┘ \\
Raphael.vml && function (R) {
    var has = "hasOwnProperty",
        Str = String,
        toFloat = parseFloat,
        math = Math,
        round = math.round,
        mmax = math.max,
        mmin = math.min,
        abs = math.abs,
        fillString = "fill",
        separator = /[, ]+/,
        eve = R.eve,
        ms = " progid:DXImageTransform.Microsoft",
        S = " ",
        E = "",
        map = {M: "m", L: "l", C: "c", Z: "x", m: "t", l: "r", c: "v", z: "x"},
        bites = /([clmz]),?([^clmz]*)/gi,
        blurregexp = / progid:\S+Blur\([^\)]+\)/g,
        val = /-?[^,\s-]+/g,
        cssDot = "position:absolute;left:0;top:0;width:1px;height:1px",
        zoom = 21600,
        pathTypes = {path: 1, rect: 1, image: 1},
        ovalTypes = {circle: 1, ellipse: 1},
        path2vml = function (path) {
            var total =  /[ahqstv]/ig,
                command = R._pathToAbsolute;
            Str(path).match(total) && (command = R._path2curve);
            total = /[clmz]/g;
            if (command == R._pathToAbsolute && !Str(path).match(total)) {
                var res = Str(path).replace(bites, function (all, command, args) {
                    var vals = [],
                        isMove = command.toLowerCase() == "m",
                        res = map[command];
                    args.replace(val, function (value) {
                        if (isMove && vals.length == 2) {
                            res += vals + map[command == "m" ? "l" : "L"];
                            vals = [];
                        }
                        vals.push(round(value * zoom));
                    });
                    return res + vals;
                });
                return res;
            }
            var pa = command(path), p, r;
            res = [];
            for (var i = 0, ii = pa.length; i < ii; i++) {
                p = pa[i];
                r = pa[i][0].toLowerCase();
                r == "z" && (r = "x");
                for (var j = 1, jj = p.length; j < jj; j++) {
                    r += round(p[j] * zoom) + (j != jj - 1 ? "," : E);
                }
                res.push(r);
            }
            return res.join(S);
        },
        compensation = function (deg, dx, dy) {
            var m = R.matrix();
            m.rotate(-deg, .5, .5);
            return {
                dx: m.x(dx, dy),
                dy: m.y(dx, dy)
            };
        },
        setCoords = function (p, sx, sy, dx, dy, deg) {
            var _ = p._,
                m = p.matrix,
                fillpos = _.fillpos,
                o = p.node,
                s = o.style,
                y = 1,
                flip = "",
                dxdy,
                kx = zoom / sx,
                ky = zoom / sy;
            s.visibility = "hidden";
            if (!sx || !sy) {
                return;
            }
            o.coordsize = abs(kx) + S + abs(ky);
            s.rotation = deg * (sx * sy < 0 ? -1 : 1);
            if (deg) {
                var c = compensation(deg, dx, dy);
                dx = c.dx;
                dy = c.dy;
            }
            sx < 0 && (flip += "x");
            sy < 0 && (flip += " y") && (y = -1);
            s.flip = flip;
            o.coordorigin = (dx * -kx) + S + (dy * -ky);
            if (fillpos || _.fillsize) {
                var fill = o.getElementsByTagName(fillString);
                fill = fill && fill[0];
                o.removeChild(fill);
                if (fillpos) {
                    c = compensation(deg, m.x(fillpos[0], fillpos[1]), m.y(fillpos[0], fillpos[1]));
                    fill.position = c.dx * y + S + c.dy * y;
                }
                if (_.fillsize) {
                    fill.size = _.fillsize[0] * abs(sx) + S + _.fillsize[1] * abs(sy);
                }
                o.appendChild(fill);
            }
            s.visibility = "visible";
        };
    R.toString = function () {
        return  "Your browser doesn\u2019t support SVG. Falling down to VML.\nYou are running Rapha\xebl " + this.version;
    };
    var addArrow = function (o, value, isEnd) {
        var values = Str(value).toLowerCase().split("-"),
            se = isEnd ? "end" : "start",
            i = values.length,
            type = "classic",
            w = "medium",
            h = "medium";
        while (i--) {
            switch (values[i]) {
                case "block":
                case "classic":
                case "oval":
                case "diamond":
                case "open":
                case "none":
                    type = values[i];
                    break;
                case "wide":
                case "narrow": h = values[i]; break;
                case "long":
                case "short": w = values[i]; break;
            }
        }
        var stroke = o.node.getElementsByTagName("stroke")[0];
        stroke[se + "arrow"] = type;
        stroke[se + "arrowlength"] = w;
        stroke[se + "arrowwidth"] = h;
    },
    setFillAndStroke = function (o, params) {
        // o.paper.canvas.style.display = "none";
        o.attrs = o.attrs || {};
        var node = o.node,
            a = o.attrs,
            s = node.style,
            xy,
            newpath = pathTypes[o.type] && (params.x != a.x || params.y != a.y || params.width != a.width || params.height != a.height || params.cx != a.cx || params.cy != a.cy || params.rx != a.rx || params.ry != a.ry || params.r != a.r),
            isOval = ovalTypes[o.type] && (a.cx != params.cx || a.cy != params.cy || a.r != params.r || a.rx != params.rx || a.ry != params.ry),
            res = o;


        for (var par in params) if (params[has](par)) {
            a[par] = params[par];
        }
        if (newpath) {
            a.path = R._getPath[o.type](o);
            o._.dirty = 1;
        }
        params.href && (node.href = params.href);
        params.title && (node.title = params.title);
        params.target && (node.target = params.target);
        params.cursor && (s.cursor = params.cursor);
        "blur" in params && o.blur(params.blur);
        if (params.path && o.type == "path" || newpath) {
            node.path = path2vml(~Str(a.path).toLowerCase().indexOf("r") ? R._pathToAbsolute(a.path) : a.path);
            if (o.type == "image") {
                o._.fillpos = [a.x, a.y];
                o._.fillsize = [a.width, a.height];
                setCoords(o, 1, 1, 0, 0, 0);
            }
        }
        "transform" in params && o.transform(params.transform);
        if (isOval) {
            var cx = +a.cx,
                cy = +a.cy,
                rx = +a.rx || +a.r || 0,
                ry = +a.ry || +a.r || 0;
            node.path = R.format("ar{0},{1},{2},{3},{4},{1},{4},{1}x", round((cx - rx) * zoom), round((cy - ry) * zoom), round((cx + rx) * zoom), round((cy + ry) * zoom), round(cx * zoom));
        }
        if ("clip-rect" in params) {
            var rect = Str(params["clip-rect"]).split(separator);
            if (rect.length == 4) {
                rect[2] = +rect[2] + (+rect[0]);
                rect[3] = +rect[3] + (+rect[1]);
                var div = node.clipRect || R._g.doc.createElement("div"),
                    dstyle = div.style;
                dstyle.clip = R.format("rect({1}px {2}px {3}px {0}px)", rect);
                if (!node.clipRect) {
                    dstyle.position = "absolute";
                    dstyle.top = 0;
                    dstyle.left = 0;
                    dstyle.width = o.paper.width + "px";
                    dstyle.height = o.paper.height + "px";
                    node.parentNode.insertBefore(div, node);
                    div.appendChild(node);
                    node.clipRect = div;
                }
            }
            if (!params["clip-rect"]) {
                node.clipRect && (node.clipRect.style.clip = "auto");
            }
        }
        if (o.textpath) {
            var textpathStyle = o.textpath.style;
            params.font && (textpathStyle.font = params.font);
            params["font-family"] && (textpathStyle.fontFamily = '"' + params["font-family"].split(",")[0].replace(/^['"]+|['"]+$/g, E) + '"');
            params["font-size"] && (textpathStyle.fontSize = params["font-size"]);
            params["font-weight"] && (textpathStyle.fontWeight = params["font-weight"]);
            params["font-style"] && (textpathStyle.fontStyle = params["font-style"]);
        }
        if ("arrow-start" in params) {
            addArrow(res, params["arrow-start"]);
        }
        if ("arrow-end" in params) {
            addArrow(res, params["arrow-end"], 1);
        }
        if (params.opacity != null || 
            params["stroke-width"] != null ||
            params.fill != null ||
            params.src != null ||
            params.stroke != null ||
            params["stroke-width"] != null ||
            params["stroke-opacity"] != null ||
            params["fill-opacity"] != null ||
            params["stroke-dasharray"] != null ||
            params["stroke-miterlimit"] != null ||
            params["stroke-linejoin"] != null ||
            params["stroke-linecap"] != null) {
            var fill = node.getElementsByTagName(fillString),
                newfill = false;
            fill = fill && fill[0];
            !fill && (newfill = fill = createNode(fillString));
            if (o.type == "image" && params.src) {
                fill.src = params.src;
            }
            params.fill && (fill.on = true);
            if (fill.on == null || params.fill == "none" || params.fill === null) {
                fill.on = false;
            }
            if (fill.on && params.fill) {
                var isURL = Str(params.fill).match(R._ISURL);
                if (isURL) {
                    fill.parentNode == node && node.removeChild(fill);
                    fill.rotate = true;
                    fill.src = isURL[1];
                    fill.type = "tile";
                    var bbox = o.getBBox(1);
                    fill.position = bbox.x + S + bbox.y;
                    o._.fillpos = [bbox.x, bbox.y];

                    R._preload(isURL[1], function () {
                        o._.fillsize = [this.offsetWidth, this.offsetHeight];
                    });
                } else {
                    fill.color = R.getRGB(params.fill).hex;
                    fill.src = E;
                    fill.type = "solid";
                    if (R.getRGB(params.fill).error && (res.type in {circle: 1, ellipse: 1} || Str(params.fill).charAt() != "r") && addGradientFill(res, params.fill, fill)) {
                        a.fill = "none";
                        a.gradient = params.fill;
                        fill.rotate = false;
                    }
                }
            }
            if ("fill-opacity" in params || "opacity" in params) {
                var opacity = ((+a["fill-opacity"] + 1 || 2) - 1) * ((+a.opacity + 1 || 2) - 1) * ((+R.getRGB(params.fill).o + 1 || 2) - 1);
                opacity = mmin(mmax(opacity, 0), 1);
                fill.opacity = opacity;
                if (fill.src) {
                    fill.color = "none";
                }
            }
            node.appendChild(fill);
            var stroke = (node.getElementsByTagName("stroke") && node.getElementsByTagName("stroke")[0]),
            newstroke = false;
            !stroke && (newstroke = stroke = createNode("stroke"));
            if ((params.stroke && params.stroke != "none") ||
                params["stroke-width"] ||
                params["stroke-opacity"] != null ||
                params["stroke-dasharray"] ||
                params["stroke-miterlimit"] ||
                params["stroke-linejoin"] ||
                params["stroke-linecap"]) {
                stroke.on = true;
            }
            (params.stroke == "none" || params.stroke === null || stroke.on == null || params.stroke == 0 || params["stroke-width"] == 0) && (stroke.on = false);
            var strokeColor = R.getRGB(params.stroke);
            stroke.on && params.stroke && (stroke.color = strokeColor.hex);
            opacity = ((+a["stroke-opacity"] + 1 || 2) - 1) * ((+a.opacity + 1 || 2) - 1) * ((+strokeColor.o + 1 || 2) - 1);
            var width = (toFloat(params["stroke-width"]) || 1) * .75;
            opacity = mmin(mmax(opacity, 0), 1);
            params["stroke-width"] == null && (width = a["stroke-width"]);
            params["stroke-width"] && (stroke.weight = width);
            width && width < 1 && (opacity *= width) && (stroke.weight = 1);
            stroke.opacity = opacity;
        
            params["stroke-linejoin"] && (stroke.joinstyle = params["stroke-linejoin"] || "miter");
            stroke.miterlimit = params["stroke-miterlimit"] || 8;
            params["stroke-linecap"] && (stroke.endcap = params["stroke-linecap"] == "butt" ? "flat" : params["stroke-linecap"] == "square" ? "square" : "round");
            if (params["stroke-dasharray"]) {
                var dasharray = {
                    "-": "shortdash",
                    ".": "shortdot",
                    "-.": "shortdashdot",
                    "-..": "shortdashdotdot",
                    ". ": "dot",
                    "- ": "dash",
                    "--": "longdash",
                    "- .": "dashdot",
                    "--.": "longdashdot",
                    "--..": "longdashdotdot"
                };
                stroke.dashstyle = dasharray[has](params["stroke-dasharray"]) ? dasharray[params["stroke-dasharray"]] : E;
            }
            newstroke && node.appendChild(stroke);
        }
        if (res.type == "text") {
            res.paper.canvas.style.display = E;
            var span = res.paper.span,
                m = 100,
                fontSize = a.font && a.font.match(/\d+(?:\.\d*)?(?=px)/);
            s = span.style;
            a.font && (s.font = a.font);
            a["font-family"] && (s.fontFamily = a["font-family"]);
            a["font-weight"] && (s.fontWeight = a["font-weight"]);
            a["font-style"] && (s.fontStyle = a["font-style"]);
            fontSize = toFloat(a["font-size"] || fontSize && fontSize[0]) || 10;
            s.fontSize = fontSize * m + "px";
            res.textpath.string && (span.innerHTML = Str(res.textpath.string).replace(/</g, "&#60;").replace(/&/g, "&#38;").replace(/\n/g, "<br>"));
            var brect = span.getBoundingClientRect();
            res.W = a.w = (brect.right - brect.left) / m;
            res.H = a.h = (brect.bottom - brect.top) / m;
            // res.paper.canvas.style.display = "none";
            res.X = a.x;
            res.Y = a.y + res.H / 2;

            ("x" in params || "y" in params) && (res.path.v = R.format("m{0},{1}l{2},{1}", round(a.x * zoom), round(a.y * zoom), round(a.x * zoom) + 1));
            var dirtyattrs = ["x", "y", "text", "font", "font-family", "font-weight", "font-style", "font-size"];
            for (var d = 0, dd = dirtyattrs.length; d < dd; d++) if (dirtyattrs[d] in params) {
                res._.dirty = 1;
                break;
            }
        
            // text-anchor emulation
            switch (a["text-anchor"]) {
                case "start":
                    res.textpath.style["v-text-align"] = "left";
                    res.bbx = res.W / 2;
                break;
                case "end":
                    res.textpath.style["v-text-align"] = "right";
                    res.bbx = -res.W / 2;
                break;
                default:
                    res.textpath.style["v-text-align"] = "center";
                    res.bbx = 0;
                break;
            }
            res.textpath.style["v-text-kern"] = true;
        }
        // res.paper.canvas.style.display = E;
    },
    addGradientFill = function (o, gradient, fill) {
        o.attrs = o.attrs || {};
        var attrs = o.attrs,
            pow = Math.pow,
            opacity,
            oindex,
            type = "linear",
            fxfy = ".5 .5";
        o.attrs.gradient = gradient;
        gradient = Str(gradient).replace(R._radial_gradient, function (all, fx, fy) {
            type = "radial";
            if (fx && fy) {
                fx = toFloat(fx);
                fy = toFloat(fy);
                pow(fx - .5, 2) + pow(fy - .5, 2) > .25 && (fy = math.sqrt(.25 - pow(fx - .5, 2)) * ((fy > .5) * 2 - 1) + .5);
                fxfy = fx + S + fy;
            }
            return E;
        });
        gradient = gradient.split(/\s*\-\s*/);
        if (type == "linear") {
            var angle = gradient.shift();
            angle = -toFloat(angle);
            if (isNaN(angle)) {
                return null;
            }
        }
        var dots = R._parseDots(gradient);
        if (!dots) {
            return null;
        }
        o = o.shape || o.node;
        if (dots.length) {
            o.removeChild(fill);
            fill.on = true;
            fill.method = "none";
            fill.color = dots[0].color;
            fill.color2 = dots[dots.length - 1].color;
            var clrs = [];
            for (var i = 0, ii = dots.length; i < ii; i++) {
                dots[i].offset && clrs.push(dots[i].offset + S + dots[i].color);
            }
            fill.colors = clrs.length ? clrs.join() : "0% " + fill.color;
            if (type == "radial") {
                fill.type = "gradientTitle";
                fill.focus = "100%";
                fill.focussize = "0 0";
                fill.focusposition = fxfy;
                fill.angle = 0;
            } else {
                // fill.rotate= true;
                fill.type = "gradient";
                fill.angle = (270 - angle) % 360;
            }
            o.appendChild(fill);
        }
        return 1;
    },
    Element = function (node, vml) {
        this[0] = this.node = node;
        node.raphael = true;
        this.id = R._oid++;
        node.raphaelid = this.id;
        this.X = 0;
        this.Y = 0;
        this.attrs = {};
        this.paper = vml;
        this.matrix = R.matrix();
        this._ = {
            transform: [],
            sx: 1,
            sy: 1,
            dx: 0,
            dy: 0,
            deg: 0,
            dirty: 1,
            dirtyT: 1
        };
        !vml.bottom && (vml.bottom = this);
        this.prev = vml.top;
        vml.top && (vml.top.next = this);
        vml.top = this;
        this.next = null;
    };
    var elproto = R.el;

    Element.prototype = elproto;
    elproto.constructor = Element;
    elproto.transform = function (tstr) {
        if (tstr == null) {
            return this._.transform;
        }
        var vbs = this.paper._viewBoxShift,
            vbt = vbs ? "s" + [vbs.scale, vbs.scale] + "-1-1t" + [vbs.dx, vbs.dy] : E,
            oldt;
        if (vbs) {
            oldt = tstr = Str(tstr).replace(/\.{3}|\u2026/g, this._.transform || E);
        }
        R._extractTransform(this, vbt + tstr);
        var matrix = this.matrix.clone(),
            skew = this.skew,
            o = this.node,
            split,
            isGrad = ~Str(this.attrs.fill).indexOf("-"),
            isPatt = !Str(this.attrs.fill).indexOf("url(");
        matrix.translate(-.5, -.5);
        if (isPatt || isGrad || this.type == "image") {
            skew.matrix = "1 0 0 1";
            skew.offset = "0 0";
            split = matrix.split();
            if ((isGrad && split.noRotation) || !split.isSimple) {
                o.style.filter = matrix.toFilter();
                var bb = this.getBBox(),
                    bbt = this.getBBox(1),
                    dx = bb.x - bbt.x,
                    dy = bb.y - bbt.y;
                o.coordorigin = (dx * -zoom) + S + (dy * -zoom);
                setCoords(this, 1, 1, dx, dy, 0);
            } else {
                o.style.filter = E;
                setCoords(this, split.scalex, split.scaley, split.dx, split.dy, split.rotate);
            }
        } else {
            o.style.filter = E;
            skew.matrix = Str(matrix);
            skew.offset = matrix.offset();
        }
        oldt && (this._.transform = oldt);
        return this;
    };
    elproto.rotate = function (deg, cx, cy) {
        if (this.removed) {
            return this;
        }
        if (deg == null) {
            return;
        }
        deg = Str(deg).split(separator);
        if (deg.length - 1) {
            cx = toFloat(deg[1]);
            cy = toFloat(deg[2]);
        }
        deg = toFloat(deg[0]);
        (cy == null) && (cx = cy);
        if (cx == null || cy == null) {
            var bbox = this.getBBox(1);
            cx = bbox.x + bbox.width / 2;
            cy = bbox.y + bbox.height / 2;
        }
        this._.dirtyT = 1;
        this.transform(this._.transform.concat([["r", deg, cx, cy]]));
        return this;
    };
    elproto.translate = function (dx, dy) {
        if (this.removed) {
            return this;
        }
        dx = Str(dx).split(separator);
        if (dx.length - 1) {
            dy = toFloat(dx[1]);
        }
        dx = toFloat(dx[0]) || 0;
        dy = +dy || 0;
        if (this._.bbox) {
            this._.bbox.x += dx;
            this._.bbox.y += dy;
        }
        this.transform(this._.transform.concat([["t", dx, dy]]));
        return this;
    };
    elproto.scale = function (sx, sy, cx, cy) {
        if (this.removed) {
            return this;
        }
        sx = Str(sx).split(separator);
        if (sx.length - 1) {
            sy = toFloat(sx[1]);
            cx = toFloat(sx[2]);
            cy = toFloat(sx[3]);
            isNaN(cx) && (cx = null);
            isNaN(cy) && (cy = null);
        }
        sx = toFloat(sx[0]);
        (sy == null) && (sy = sx);
        (cy == null) && (cx = cy);
        if (cx == null || cy == null) {
            var bbox = this.getBBox(1);
        }
        cx = cx == null ? bbox.x + bbox.width / 2 : cx;
        cy = cy == null ? bbox.y + bbox.height / 2 : cy;
    
        this.transform(this._.transform.concat([["s", sx, sy, cx, cy]]));
        this._.dirtyT = 1;
        return this;
    };
    elproto.hide = function () {
        !this.removed && (this.node.style.display = "none");
        return this;
    };
    elproto.show = function () {
        !this.removed && (this.node.style.display = E);
        return this;
    };
    elproto._getBBox = function () {
        if (this.removed) {
            return {};
        }
        return {
            x: this.X + (this.bbx || 0) - this.W / 2,
            y: this.Y - this.H,
            width: this.W,
            height: this.H
        };
    };
    elproto.remove = function () {
        if (this.removed || !this.node.parentNode) {
            return;
        }
        this.paper.__set__ && this.paper.__set__.exclude(this);
        R.eve.unbind("raphael.*.*." + this.id);
        R._tear(this, this.paper);
        this.node.parentNode.removeChild(this.node);
        this.shape && this.shape.parentNode.removeChild(this.shape);
        for (var i in this) {
            this[i] = typeof this[i] == "function" ? R._removedFactory(i) : null;
        }
        this.removed = true;
    };
    elproto.attr = function (name, value) {
        if (this.removed) {
            return this;
        }
        if (name == null) {
            var res = {};
            for (var a in this.attrs) if (this.attrs[has](a)) {
                res[a] = this.attrs[a];
            }
            res.gradient && res.fill == "none" && (res.fill = res.gradient) && delete res.gradient;
            res.transform = this._.transform;
            return res;
        }
        if (value == null && R.is(name, "string")) {
            if (name == fillString && this.attrs.fill == "none" && this.attrs.gradient) {
                return this.attrs.gradient;
            }
            var names = name.split(separator),
                out = {};
            for (var i = 0, ii = names.length; i < ii; i++) {
                name = names[i];
                if (name in this.attrs) {
                    out[name] = this.attrs[name];
                } else if (R.is(this.paper.customAttributes[name], "function")) {
                    out[name] = this.paper.customAttributes[name].def;
                } else {
                    out[name] = R._availableAttrs[name];
                }
            }
            return ii - 1 ? out : out[names[0]];
        }
        if (this.attrs && value == null && R.is(name, "array")) {
            out = {};
            for (i = 0, ii = name.length; i < ii; i++) {
                out[name[i]] = this.attr(name[i]);
            }
            return out;
        }
        var params;
        if (value != null) {
            params = {};
            params[name] = value;
        }
        value == null && R.is(name, "object") && (params = name);
        for (var key in params) {
            eve("raphael.attr." + key + "." + this.id, this, params[key]);
        }
        if (params) {
            for (key in this.paper.customAttributes) if (this.paper.customAttributes[has](key) && params[has](key) && R.is(this.paper.customAttributes[key], "function")) {
                var par = this.paper.customAttributes[key].apply(this, [].concat(params[key]));
                this.attrs[key] = params[key];
                for (var subkey in par) if (par[has](subkey)) {
                    params[subkey] = par[subkey];
                }
            }
            // this.paper.canvas.style.display = "none";
            if (params.text && this.type == "text") {
                this.textpath.string = params.text;
            }
            setFillAndStroke(this, params);
            // this.paper.canvas.style.display = E;
        }
        return this;
    };
    elproto.toFront = function () {
        !this.removed && this.node.parentNode.appendChild(this.node);
        this.paper && this.paper.top != this && R._tofront(this, this.paper);
        return this;
    };
    elproto.toBack = function () {
        if (this.removed) {
            return this;
        }
        if (this.node.parentNode.firstChild != this.node) {
            this.node.parentNode.insertBefore(this.node, this.node.parentNode.firstChild);
            R._toback(this, this.paper);
        }
        return this;
    };
    elproto.insertAfter = function (element) {
        if (this.removed) {
            return this;
        }
        if (element.constructor == R.st.constructor) {
            element = element[element.length - 1];
        }
        if (element.node.nextSibling) {
            element.node.parentNode.insertBefore(this.node, element.node.nextSibling);
        } else {
            element.node.parentNode.appendChild(this.node);
        }
        R._insertafter(this, element, this.paper);
        return this;
    };
    elproto.insertBefore = function (element) {
        if (this.removed) {
            return this;
        }
        if (element.constructor == R.st.constructor) {
            element = element[0];
        }
        element.node.parentNode.insertBefore(this.node, element.node);
        R._insertbefore(this, element, this.paper);
        return this;
    };
    elproto.blur = function (size) {
        var s = this.node.runtimeStyle,
            f = s.filter;
        f = f.replace(blurregexp, E);
        if (+size !== 0) {
            this.attrs.blur = size;
            s.filter = f + S + ms + ".Blur(pixelradius=" + (+size || 1.5) + ")";
            s.margin = R.format("-{0}px 0 0 -{0}px", round(+size || 1.5));
        } else {
            s.filter = f;
            s.margin = 0;
            delete this.attrs.blur;
        }
    };

    R._engine.path = function (pathString, vml) {
        var el = createNode("shape");
        el.style.cssText = cssDot;
        el.coordsize = zoom + S + zoom;
        el.coordorigin = vml.coordorigin;
        var p = new Element(el, vml),
            attr = {fill: "none", stroke: "#000"};
        pathString && (attr.path = pathString);
        p.type = "path";
        p.path = [];
        p.Path = E;
        setFillAndStroke(p, attr);
        vml.canvas.appendChild(el);
        var skew = createNode("skew");
        skew.on = true;
        el.appendChild(skew);
        p.skew = skew;
        p.transform(E);
        return p;
    };
    R._engine.rect = function (vml, x, y, w, h, r) {
        var path = R._rectPath(x, y, w, h, r),
            res = vml.path(path),
            a = res.attrs;
        res.X = a.x = x;
        res.Y = a.y = y;
        res.W = a.width = w;
        res.H = a.height = h;
        a.r = r;
        a.path = path;
        res.type = "rect";
        return res;
    };
    R._engine.ellipse = function (vml, x, y, rx, ry) {
        var res = vml.path(),
            a = res.attrs;
        res.X = x - rx;
        res.Y = y - ry;
        res.W = rx * 2;
        res.H = ry * 2;
        res.type = "ellipse";
        setFillAndStroke(res, {
            cx: x,
            cy: y,
            rx: rx,
            ry: ry
        });
        return res;
    };
    R._engine.circle = function (vml, x, y, r) {
        var res = vml.path(),
            a = res.attrs;
        res.X = x - r;
        res.Y = y - r;
        res.W = res.H = r * 2;
        res.type = "circle";
        setFillAndStroke(res, {
            cx: x,
            cy: y,
            r: r
        });
        return res;
    };
    R._engine.image = function (vml, src, x, y, w, h) {
        var path = R._rectPath(x, y, w, h),
            res = vml.path(path).attr({stroke: "none"}),
            a = res.attrs,
            node = res.node,
            fill = node.getElementsByTagName(fillString)[0];
        a.src = src;
        res.X = a.x = x;
        res.Y = a.y = y;
        res.W = a.width = w;
        res.H = a.height = h;
        a.path = path;
        res.type = "image";
        fill.parentNode == node && node.removeChild(fill);
        fill.rotate = true;
        fill.src = src;
        fill.type = "tile";
        res._.fillpos = [x, y];
        res._.fillsize = [w, h];
        node.appendChild(fill);
        setCoords(res, 1, 1, 0, 0, 0);
        return res;
    };
    R._engine.text = function (vml, x, y, text) {
        var el = createNode("shape"),
            path = createNode("path"),
            o = createNode("textpath");
        x = x || 0;
        y = y || 0;
        text = text || "";
        path.v = R.format("m{0},{1}l{2},{1}", round(x * zoom), round(y * zoom), round(x * zoom) + 1);
        path.textpathok = true;
        o.string = Str(text);
        o.on = true;
        el.style.cssText = cssDot;
        el.coordsize = zoom + S + zoom;
        el.coordorigin = "0 0";
        var p = new Element(el, vml),
            attr = {
                fill: "#000",
                stroke: "none",
                font: R._availableAttrs.font,
                text: text
            };
        p.shape = el;
        p.path = path;
        p.textpath = o;
        p.type = "text";
        p.attrs.text = Str(text);
        p.attrs.x = x;
        p.attrs.y = y;
        p.attrs.w = 1;
        p.attrs.h = 1;
        setFillAndStroke(p, attr);
        el.appendChild(o);
        el.appendChild(path);
        vml.canvas.appendChild(el);
        var skew = createNode("skew");
        skew.on = true;
        el.appendChild(skew);
        p.skew = skew;
        p.transform(E);
        return p;
    };
    R._engine.setSize = function (width, height) {
        var cs = this.canvas.style;
        this.width = width;
        this.height = height;
        width == +width && (width += "px");
        height == +height && (height += "px");
        cs.width = width;
        cs.height = height;
        cs.clip = "rect(0 " + width + " " + height + " 0)";
        if (this._viewBox) {
            R._engine.setViewBox.apply(this, this._viewBox);
        }
        return this;
    };
    R._engine.setViewBox = function (x, y, w, h, fit) {
        R.eve("raphael.setViewBox", this, this._viewBox, [x, y, w, h, fit]);
        var width = this.width,
            height = this.height,
            size = 1 / mmax(w / width, h / height),
            H, W;
        if (fit) {
            H = height / h;
            W = width / w;
            if (w * H < width) {
                x -= (width - w * H) / 2 / H;
            }
            if (h * W < height) {
                y -= (height - h * W) / 2 / W;
            }
        }
        this._viewBox = [x, y, w, h, !!fit];
        this._viewBoxShift = {
            dx: -x,
            dy: -y,
            scale: size
        };
        this.forEach(function (el) {
            el.transform("...");
        });
        return this;
    };
    var createNode;
    R._engine.initWin = function (win) {
            var doc = win.document;
            doc.createStyleSheet().addRule(".rvml", "behavior:url(#default#VML)");
            try {
                !doc.namespaces.rvml && doc.namespaces.add("rvml", "urn:schemas-microsoft-com:vml");
                createNode = function (tagName) {
                    return doc.createElement('<rvml:' + tagName + ' class="rvml">');
                };
            } catch (e) {
                createNode = function (tagName) {
                    return doc.createElement('<' + tagName + ' xmlns="urn:schemas-microsoft.com:vml" class="rvml">');
                };
            }
        };
    R._engine.initWin(R._g.win);
    R._engine.create = function () {
        var con = R._getContainer.apply(0, arguments),
            container = con.container,
            height = con.height,
            s,
            width = con.width,
            x = con.x,
            y = con.y;
        if (!container) {
            throw new Error("VML container not found.");
        }
        var res = new R._Paper,
            c = res.canvas = R._g.doc.createElement("div"),
            cs = c.style;
        x = x || 0;
        y = y || 0;
        width = width || 512;
        height = height || 342;
        res.width = width;
        res.height = height;
        width == +width && (width += "px");
        height == +height && (height += "px");
        res.coordsize = zoom * 1e3 + S + zoom * 1e3;
        res.coordorigin = "0 0";
        res.span = R._g.doc.createElement("span");
        res.span.style.cssText = "position:absolute;left:-9999em;top:-9999em;padding:0;margin:0;line-height:1;";
        c.appendChild(res.span);
        cs.cssText = R.format("top:0;left:0;width:{0};height:{1};display:inline-block;position:relative;clip:rect(0 {0} {1} 0);overflow:hidden", width, height);
        if (container == 1) {
            R._g.doc.body.appendChild(c);
            cs.left = x + "px";
            cs.top = y + "px";
            cs.position = "absolute";
        } else {
            if (container.firstChild) {
                container.insertBefore(c, container.firstChild);
            } else {
                container.appendChild(c);
            }
        }
        res.renderfix = function () {};
        return res;
    };
    R.prototype.clear = function () {
        R.eve("raphael.clear", this);
        this.canvas.innerHTML = E;
        this.span = R._g.doc.createElement("span");
        this.span.style.cssText = "position:absolute;left:-9999em;top:-9999em;padding:0;margin:0;line-height:1;display:inline;";
        this.canvas.appendChild(this.span);
        this.bottom = this.top = null;
    };
    R.prototype.remove = function () {
        R.eve("raphael.remove", this);
        this.canvas.parentNode.removeChild(this.canvas);
        for (var i in this) {
            this[i] = typeof this[i] == "function" ? R._removedFactory(i) : null;
        }
        return true;
    };

    var setproto = R.st;
    for (var method in elproto) if (elproto[has](method) && !setproto[has](method)) {
        setproto[method] = (function (methodname) {
            return function () {
                var arg = arguments;
                return this.forEach(function (el) {
                    el[methodname].apply(el, arg);
                });
            };
        })(method);
    }
}(Raphael);

// BROWSERIFY MOD: export Raphael
if (typeof module !== 'undefined') {
    module.exports = Raphael;
}

},{}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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

},{}],18:[function(require,module,exports){
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

},{}],19:[function(require,module,exports){
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

},{}],20:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],21:[function(require,module,exports){
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
},{"./support/isBuffer":20,"/Users/pedroteixeira/projects/taser-squad/node_modules/watchify/node_modules/browserify/node_modules/insert-module-globals/node_modules/process/browser.js":19,"inherits":18}],22:[function(require,module,exports){
module.exports = hasKeys

function hasKeys(source) {
    return source !== null &&
        (typeof source === "object" ||
        typeof source === "function")
}

},{}],23:[function(require,module,exports){
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

},{"./has-keys":22,"object-keys":25}],24:[function(require,module,exports){
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


},{}],25:[function(require,module,exports){
module.exports = Object.keys || require('./shim');


},{"./shim":27}],26:[function(require,module,exports){
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


},{}],27:[function(require,module,exports){
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


},{"./foreach":24,"./isArguments":26}]},{},[3])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2NvbnRyb2xsZXJzL2Jhc2UuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9jb250cm9sbGVycy9jaGFyYWN0ZXIuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9pbmRleC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi9ib2FyZC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi9jaGFyYWN0ZXIuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9saWIvY2hhcmFjdGVycy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi9jb250cm9sbGVycy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi9nYW1lLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbGliL2tleW1hc3Rlci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi90aWxlcy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi93YWxsX3R5cGUuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9saWIvd2FsbF90eXBlcy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi93YWxscy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL25vZGVfbW9kdWxlcy90aWxlbWFwL2luZGV4LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3RpbGVtYXAvbm9kZV9tb2R1bGVzL3JhcGhhZWwtYnJvd3NlcmlmeS9yYXBoYWVsLWJyb3dzZXJpZnkuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9ub2RlX21vZHVsZXMvdW5kZXJzY29yZS91bmRlcnNjb3JlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbnNlcnQtbW9kdWxlLWdsb2JhbHMvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3h0ZW5kL2hhcy1rZXlzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3h0ZW5kL2luZGV4LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3h0ZW5kL25vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9mb3JlYWNoLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3h0ZW5kL25vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9pbmRleC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL25vZGVfbW9kdWxlcy94dGVuZC9ub2RlX21vZHVsZXMvb2JqZWN0LWtleXMvaXNBcmd1bWVudHMuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9ub2RlX21vZHVsZXMveHRlbmQvbm9kZV9tb2R1bGVzL29iamVjdC1rZXlzL3NoaW0uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbHVMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1a0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGtleW1hc3RlciA9IHJlcXVpcmUoJy4uL2xpYi9rZXltYXN0ZXInKTtcbi8vIGtleW1hc3Rlci5ub0NvbmZsaWN0KCk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udHJvbGxlckJhc2U7XG5cbmZ1bmN0aW9uIENvbnRyb2xsZXJCYXNlKCkge1xuICB0aGlzLmJvdW5kS2V5cyA9IFtdO1xufVxuXG52YXIgQ0IgPSBDb250cm9sbGVyQmFzZS5wcm90b3R5cGU7XG5cblxuLy8vIGtleVxuXG5DQi5rZXkgPSBmdW5jdGlvbiBrZXkoc3BlYywgZm4pIHtcbiAgdGhpcy5ib3VuZEtleXMucHVzaChzcGVjKSA7XG4gIGtleW1hc3RlcihzcGVjLCBmbik7XG59O1xuXG5DQi51bmJpbmRLZXlzID0gZnVuY3Rpb24gdW5iaW5kS2V5cygpIHtcbiAgdGhpcy5ib3VuZEtleXMuZm9yRWFjaCh0aGlzLnVuYmluZEtleS5iaW5kKHRoaXMpKTtcbiAgdGhpcy5ib3VuZEtleXMgPSBbXTtcbn07XG5cbkNCLnVuYmluZEtleSA9IGZ1bmN0aW9uIHVuYmluZEtleShzcGVjKSB7XG4gIGtleW1hc3Rlci51bmJpbmQoc3BlYyk7XG59O1xuXG5cbi8vLyBhYnN0cmFjdCBtZXRob2RzXG5cbkNCLmFjdGl2YXRlID0gYWJzdHJhY3Q7XG5DQi5kZWFjdGl2YXRlID0gYWJzdHJhY3Q7XG5cblxuZnVuY3Rpb24gYWJzdHJhY3QoKSB7XG4gIHRocm93IG5ldyBFcnJvcignY29udHJvbGxlciBuZWVkcyB0byBpbXBsZW1lbnQgYWN0aXZhdGUnKTtcbn1cblxuIiwidmFyIGluaGVyaXRzICAgICAgID0gcmVxdWlyZSgndXRpbCcpLmluaGVyaXRzO1xudmFyIENvbnRyb2xsZXJCYXNlID0gcmVxdWlyZSgnLi9iYXNlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhcmFjdGVyQ29udHJvbGxlcjtcblxuZnVuY3Rpb24gQ2hhcmFjdGVyQ29udHJvbGxlcihjaGFyYWN0ZXIpIHtcbiAgQ29udHJvbGxlckJhc2UuYXBwbHkodGhpcyk7XG5cbiAgdGhpcy5jaGFyYWN0ZXIgPSBjaGFyYWN0ZXI7XG59XG5cbmluaGVyaXRzKENoYXJhY3RlckNvbnRyb2xsZXIsIENvbnRyb2xsZXJCYXNlKTtcblxudmFyIENDID0gQ2hhcmFjdGVyQ29udHJvbGxlci5wcm90b3R5cGU7XG5cblxuLy8vIGFjdGl2YXRlXG5cbkNDLmFjdGl2YXRlID0gZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gIHRoaXMua2V5KCdsZWZ0JywgdGhpcy50dXJuTGVmdC5iaW5kKHRoaXMpKTtcbiAgdGhpcy5rZXkoJ3JpZ2h0JywgdGhpcy50dXJuUmlnaHQuYmluZCh0aGlzKSk7XG4gIHRoaXMua2V5KCd1cCcsIHRoaXMud2Fsay5iaW5kKHRoaXMpKTtcbiAgdGhpcy5rZXkoJ2Rvd24nLCB0aGlzLndhbGtCYWNrLmJpbmQodGhpcykpO1xufTtcblxuXG5DQy5kZWFjdGl2YXRlID0gZnVuY3Rpb24gZGVhY3RpdmF0ZSgpIHtcbiAgdGhpcy51bmJpbmRLZXlzKCk7XG59O1xuXG5cbi8vLyB0dXJuTGVmdFxuXG5DQy50dXJuTGVmdCA9IGZ1bmN0aW9uIHR1cm5MZWZ0KCkge1xuICB0aGlzLmNoYXJhY3Rlci50dXJuTGVmdCgpO1xufTtcblxuXG4vLy8gdHVyblJpZ2h0XG5cbkNDLnR1cm5SaWdodCA9IGZ1bmN0aW9uIHR1cm5SaWdodCgpIHtcbiAgdGhpcy5jaGFyYWN0ZXIudHVyblJpZ2h0KCk7XG59O1xuXG5cbi8vLyB3YWxrXG5cbkNDLndhbGsgPSBmdW5jdGlvbiB3YWxrKCkge1xuICB0aGlzLmNoYXJhY3Rlci53YWxrKCk7XG59O1xuXG5cbi8vLyB3YWxrQmFja1xuXG5DQy53YWxrQmFjayA9IGZ1bmN0aW9uIHdhbGtCYWNrKCkge1xuICB0aGlzLmNoYXJhY3Rlci53YWxrQmFjaygpO1xufTsiLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgR2FtZSA9IHJlcXVpcmUoJy4vbGliL2dhbWUnKTtcblxudmFyIHdpbmRvdyA9IGdsb2JhbDtcblxudmFyIG9wdGlvbnMgPSB7XG4gIHdpZHRoOiAkKHdpbmRvdy5kb2N1bWVudC5ib2R5KS53aWR0aCgpLFxuICBoZWlnaHQ6ICQod2luZG93LmRvY3VtZW50LmJvZHkpLmhlaWdodCgpXG59O1xuXG52YXIgZ2FtZSA9IEdhbWUoZG9jdW1lbnQuYm9keSwgb3B0aW9ucyk7XG5cblxuLy8vIHNvbGRpZXJzXG5cbnZhciBzb2xkaWVycyA9IFtdO1xuXG4oZnVuY3Rpb24oKSB7XG4gIHZhciBzb2xkaWVyQ291bnQgPSA1XG4gIGZvcih2YXIgaSA9IDA7IGkgPCBzb2xkaWVyQ291bnQ7IGkgKyspIHtcbiAgICB2YXIgc29sZGllciA9IGdhbWUuYm9hcmQuY2hhcmFjdGVycy5jcmVhdGUoKTtcbiAgICBzb2xkaWVycy5wdXNoKHNvbGRpZXIpO1xuICAgIHZhciBwbGFjZSA9IHsgeDppLCB5OiBpfTtcbiAgICB2YXIgcGxhY2VkID0gZ2FtZS5ib2FyZC5jaGFyYWN0ZXJzLnBsYWNlKHNvbGRpZXIsIHBsYWNlKTtcbiAgICBpZiAoISBwbGFjZWQpIGNvbnNvbGUubG9nKCdGYWlsZWQgdG8gcGxhY2Ugc29sZGllciBpbiAnLCBwbGFjZSk7XG4gIH1cblxufSgpKTtcblxuXG5cbi8vLyB3YWxsc1xuXG4oZnVuY3Rpb24oKSB7XG4gIHZhciB3YWxsVHlwZSA9IGdhbWUuYm9hcmQud2FsbFR5cGVzLmNyZWF0ZSgpO1xuXG4gIC8vIHZhciBzdGFydCA9IHt4OiAtNS41LCB5OiAtNS41fTtcbiAgLy8gdmFyIGVuZCA9IHt4OiAtNS41LCB5OiA1LjV9O1xuICAvLyBnYW1lLmJvYXJkLndhbGxzLnBsYWNlKHdhbGxUeXBlLCBzdGFydCwgZW5kKTtcblxuXG4gIHN0YXJ0ID0ge3g6IC01LjUsIHk6IC01LjV9O1xuICBlbmQgPSB7eDogNS41LCB5OiAtNS41fTtcbiAgZ2FtZS5ib2FyZC53YWxscy5wbGFjZSh3YWxsVHlwZSwgc3RhcnQsIGVuZCk7XG5cbiAgc3RhcnQgPSB7eDogNS41LCB5OiA1LjV9O1xuICBlbmQgPSB7eDogNS41LCB5OiAtNS41fTtcbiAgZ2FtZS5ib2FyZC53YWxscy5wbGFjZSh3YWxsVHlwZSwgc3RhcnQsIGVuZCk7XG5cbiAgY29uc29sZS5sb2coJ2dhbWUuYm9hcmQud2FsbHMud2FsbHM6JywgZ2FtZS5ib2FyZC53YWxscy53YWxscyk7XG5cbn0oKSk7XG5cblxuXG4vLy8gc3RhcnQgZ2FtZVxuXG5cbmdhbWUuc3RhcnQoKTtcblxudmFyIHNvbGRpZXJOciA9IC0xO1xudmFyIHNvbGRpZXI7XG52YXIgY29udHJvbGxlcjtcblxuc2V0SW50ZXJ2YWwoZnVuY3Rpb24oKSB7XG4gIGlmIChjb250cm9sbGVyKSBjb250cm9sbGVyLmRlYWN0aXZhdGUoKTtcbiAgc29sZGllck5yID0gKHNvbGRpZXJOciArIDEpICUgc29sZGllcnMubGVuZ3RoO1xuICBzb2xkaWVyID0gc29sZGllcnNbc29sZGllck5yXTtcbiAgY29udHJvbGxlciA9IGdhbWUuY29udHJvbGxlcnMuY29udHJvbChzb2xkaWVyKTtcbn0sIDMwMDApO1xufSkuY2FsbCh0aGlzLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSkiLCJ2YXIgZXh0ZW5kICA9IHJlcXVpcmUoJ3h0ZW5kJyk7XG52YXIgdGlsZW1hcCA9IHJlcXVpcmUoJ3RpbGVtYXAnKTtcbnZhciBfICAgICAgID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG52YXIgVGlsZXMgICAgICAgPSByZXF1aXJlKCcuL3RpbGVzJyk7XG52YXIgQ2hhcmFjdGVycyAgPSByZXF1aXJlKCcuL2NoYXJhY3RlcnMnKTtcbnZhciBXYWxsVHlwZXMgICA9IHJlcXVpcmUoJy4vd2FsbF90eXBlcycpO1xudmFyIFdhbGxzICAgICAgID0gcmVxdWlyZSgnLi93YWxscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJvYXJkO1xuXG52YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG4gIHdpZHRoOiB3aW5kb3cub3V0ZXJXaWR0aCxcbiAgaGVpZ2h0OiB3aW5kb3cub3V0ZXJIZWlnaHQsXG4gIHNpemU6IDIwLFxuICB6b29tOiAwLjVcbn07XG5cbmZ1bmN0aW9uIEJvYXJkKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB7fTtcblxuICBvcHRpb25zID0gZXh0ZW5kKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0aW9ucyB8fCB7fSk7XG5cblxuICAvLy8gTWV0aG9kc1xuXG4gIHNlbGYuem9vbSA9IHpvb207XG5cbiAgc2VsZi5wbGFjZSAgPSBwbGFjZTtcbiAgc2VsZi5yZW1vdmUgPSByZW1vdmU7XG4gIHNlbGYubW92ZVRvID0gbW92ZVRvO1xuXG4gIHNlbGYud2Fsa2FibGUgPSB3YWxrYWJsZTtcbiAgc2VsZi50cmF2ZXJzYWJsZSA9IHRyYXZlcnNhYmxlO1xuICBzZWxmLm9iamVjdHNBdCA9IG9iamVjdHNBdDtcblxuXG4gIC8vLyBJbml0XG5cbiAgc2VsZi5ncmlkID0gdGlsZW1hcChvcHRpb25zLndpZHRoLCBvcHRpb25zLmhlaWdodCk7XG5cbiAgc2VsZi56b29tKG9wdGlvbnMuem9vbSk7XG4gIHNlbGYudGlsZXMgPSBUaWxlcyhzZWxmLmdyaWQpO1xuICBzZWxmLmNoYXJhY3RlcnMgPSBDaGFyYWN0ZXJzKHNlbGYpO1xuICBzZWxmLndhbGxUeXBlcyA9IFdhbGxUeXBlcyhzZWxmKTtcblxuICBzZWxmLnNpemUgPSBvcHRpb25zLnNpemU7XG4gIHNlbGYub2JqZWN0cyA9IFtdO1xuICBzZWxmLndhbGxzID0gV2FsbHMoc2VsZik7XG5cbiAgZm9yKHZhciBpID0gMCA7IGkgPCBzZWxmLnNpemU7IGkgKyspIHtcbiAgICBzZWxmLm9iamVjdHMucHVzaChbXSk7XG4gICAgZm9yKHZhciBqID0gMCA7IGogPCBzZWxmLnNpemU7IGogKyspIHtcbiAgICAgIHNlbGYub2JqZWN0c1tpXS5wdXNoKFtdKTtcbiAgICAgIHNlbGYub2JqZWN0c1tpXVtqXSA9IFtdO1xuICAgIH1cbiAgfVxuXG4gIHZhciBoYWxmU2l6ZSA9IHNlbGYuc2l6ZSAvIDI7XG4gIGZvciAodmFyIHggPSAtaGFsZlNpemU7IHggPCBoYWxmU2l6ZTsgeCsrKSB7XG4gICAgZm9yICh2YXIgeSA9IC1oYWxmU2l6ZTsgeSA8IGhhbGZTaXplOyB5KyspIHtcbiAgICAgIHNlbGYudGlsZXMuY3JlYXRlKHgsIHkpO1xuICAgIH1cbiAgfVxuXG4gIHNlbGYuZ3JpZC5hcHBlbmRUbyhlbGVtZW50KTtcblxuICByZXR1cm4gc2VsZjtcbn1cblxuLy8vIHBsYWNlXG5cbmZ1bmN0aW9uIHBsYWNlKG9iamVjdCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gZXh0ZW5kKHtcbiAgICB4OiBvYmplY3QueCxcbiAgICB5OiBvYmplY3QueVxuICB9LCBvcHRpb25zIHx8IHt9KTtcblxuICB2YXIgcGxhY2VkID0gZmFsc2U7XG4gIGlmIChvYmplY3QuY29sbGlkZXMpXG4gICAgcGxhY2VkID0gdGhpcy53YWxrYWJsZShvcHRpb25zLngsIG9wdGlvbnMueSk7XG5cbiAgaWYgKHBsYWNlZCkge1xuICAgIHRoaXMuZ3JpZC5jcmVhdGVJdGVtKG9iamVjdC5pbWFnZSgpLCBvcHRpb25zLngsIG9wdGlvbnMueSk7XG4gICAgdmFyIGhhbGZTaXplID0gdGhpcy5zaXplIC8gMjtcbiAgICB2YXIgcm93ID0gdGhpcy5vYmplY3RzW29wdGlvbnMueCArIGhhbGZTaXplXTtcbiAgICB2YXIgY2VsbCA9IHJvdyAmJiByb3dbb3B0aW9ucy55ICsgaGFsZlNpemVdO1xuICAgIGlmIChjZWxsKSB7XG4gICAgICBjZWxsLnB1c2gob2JqZWN0KTtcbiAgICAgIG9iamVjdC54ID0gb3B0aW9ucy54O1xuICAgICAgb2JqZWN0LnkgPSBvcHRpb25zLnk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBsYWNlZDtcbn1cblxuXG4vLy8gcmVtb3ZlXG5cbmZ1bmN0aW9uIHJlbW92ZShvYmplY3QpIHtcbiAgdmFyIGhhbGZTaXplID0gdGhpcy5zaXplIC8gMjtcbiAgdmFyIHJvdyA9IHRoaXMub2JqZWN0c1tvYmplY3QueCArIGhhbGZTaXplXTtcbiAgdmFyIG9iamVjdHMgPSByb3cgJiYgcm93W29iamVjdC55ICsgaGFsZlNpemVdIHx8IFtdO1xuICBpZiAob2JqZWN0cy5sZW5ndGgpIHtcbiAgICB2YXIgaWR4ID0gb2JqZWN0cy5pbmRleE9mKG9iamVjdCk7XG4gICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICBvYmplY3RzLnNwbGljZShpZHgsIDEpO1xuICAgICAgdGhpcy5ncmlkLnJlbW92ZUl0ZW0ob2JqZWN0LngsIG9iamVjdC55KTtcbiAgICB9XG4gIH1cbn1cblxuXG4vLy8gbW92ZVRvXG5cbmZ1bmN0aW9uIG1vdmVUbyhvYmplY3QsIHgsIHksIGNiKSB7XG4gIGlmIChNYXRoLnJvdW5kKHgpICE9IHgpIHRocm93IG5ldyBFcnJvcignbXVzdCBtb3ZlIHRvIGludGVnZXIgeCcpO1xuICBpZiAoTWF0aC5yb3VuZCh5KSAhPSB5KSB0aHJvdyBuZXcgRXJyb3IoJ211c3QgbW92ZSB0byBpbnRlZ2VyIHknKTtcblxuICB2YXIgdG8gPSB7IHg6IHgsIHk6IHl9O1xuXG4gIHZhciBkaXN0YW5jZSA9IHtcbiAgICB4OiBNYXRoLmFicyhvYmplY3QueCAtIHgpLFxuICAgIHk6IE1hdGguYWJzKG9iamVjdC55IC0geSlcbiAgfTtcblxuICBpZiAoZGlzdGFuY2UueCA+IDEpIHRocm93IG5ldyBFcnJvcignZGlzdGFuY2UgaW4geCBtdXN0IGJlIDw9IDEnKTtcbiAgaWYgKGRpc3RhbmNlLnkgPiAxKSB0aHJvdyBuZXcgRXJyb3IoJ2Rpc3RhbmNlIGluIHkgbXVzdCBiZSA8PSAxJyk7XG5cblxuICB2YXIgbW92ZSA9IHRoaXMudHJhdmVyc2FibGUob2JqZWN0LCB0bykgJiYgdGhpcy53YWxrYWJsZSh4LCB5KTtcbiAgaWYgKG1vdmUpIHtcbiAgICB0aGlzLnJlbW92ZShvYmplY3QpO1xuICAgIHRoaXMucGxhY2Uob2JqZWN0LCB0byk7XG4gICAgaWYgKGNiKSBjYigpO1xuICB9XG4gIHJldHVybiBtb3ZlO1xufVxuXG5cbi8vLyBvYmplY3RzQXRcblxuZnVuY3Rpb24gb2JqZWN0c0F0KHgsIHkpIHtcbiAgeCArPSB0aGlzLnNpemUgLyAyO1xuICB5ICs9IHRoaXMuc2l6ZSAvIDI7XG4gIHZhciByb3cgPSB0aGlzLm9iamVjdHNbeF07XG4gIHJldHVybiByb3cgJiYgcm93W3ldIHx8IFtdO1xufVxuXG5cbi8vLyB3YWxrYWJsZVxuXG5mdW5jdGlvbiB3YWxrYWJsZSh4LCB5KSB7XG4gIHZhciBtYXggPSB0aGlzLnNpemUgLyAyO1xuICB2YXIgd2Fsa2FibGUgPSAoTWF0aC5hYnMoeCkgPD0gbWF4KSAmJiAoTWF0aC5hYnMoeSkgPD0gbWF4KTtcbiAgaWYgKHdhbGthYmxlKSB7XG4gICAgdmFyIG9iamVjdHMgPSB0aGlzLm9iamVjdHNBdCh4LCB5KTtcbiAgICBpZiAob2JqZWN0cy5sZW5ndGgpIHdhbGthYmxlID0gXy5ldmVyeShvYmplY3RzLCBpc1dhbGthYmxlKTtcbiAgfVxuICByZXR1cm4gd2Fsa2FibGU7XG59XG5cblxuLy8vIHRyYXZlcnNhYmxlXG5cbmZ1bmN0aW9uIHRyYXZlcnNhYmxlKGZyb20sIHRvKSB7XG4gIHJldHVybiB0aGlzLndhbGxzLnRyYXZlcnNhYmxlKGZyb20sIHRvKTtcbn1cblxuXG4vLy8gem9vbVxuXG5mdW5jdGlvbiB6b29tKGxldmVsKSB7XG4gIHRoaXMuZ3JpZC56b29tKGxldmVsKTtcbn1cblxuXG4vLy8gTWlzY1xuXG5mdW5jdGlvbiBpc1dhbGthYmxlKG8pIHtcbiAgcmV0dXJuIG8ud2Fsa2FibGU7XG59IiwidmFyIGV4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhcmFjdGVyO1xuXG52YXIgbmV4dE9uUmlnaHRUdXJuID0ge1xuICBzb3V0aDogICAgICAgJ3NvdXRoX3dlc3QnLFxuICBzb3V0aF93ZXN0OiAgJ3dlc3QnLFxuICB3ZXN0OiAgICAgICAgJ25vcnRoX3dlc3QnLFxuICBub3J0aF93ZXN0OiAgJ25vcnRoJyxcbiAgbm9ydGg6ICAgICAgICdub3J0aF9lYXN0JyxcbiAgbm9ydGhfZWFzdDogICdlYXN0JyxcbiAgZWFzdDogICAgICAgICdzb3V0aF9lYXN0JyxcbiAgc291dGhfZWFzdDogICdzb3V0aCdcbn07XG5cbnZhciBuZXh0T25MZWZ0VHVybiA9IHtcbiAgc291dGg6ICAgICAgJ3NvdXRoX2Vhc3QnLFxuICBzb3V0aF9lYXN0OiAnZWFzdCcsXG4gIGVhc3Q6ICAgICAgICdub3J0aF9lYXN0JyxcbiAgbm9ydGhfZWFzdDogJ25vcnRoJyxcbiAgbm9ydGg6ICAgICAgJ25vcnRoX3dlc3QnLFxuICBub3J0aF93ZXN0OiAnd2VzdCcsXG4gIHdlc3Q6ICAgICAgICdzb3V0aF93ZXN0JyxcbiAgc291dGhfd2VzdDogJ3NvdXRoJ1xufTtcblxudmFyIHdhbGtEaXJlY3Rpb25zID0ge1xuICBzb3V0aDogICAgICB7eDogLTEsIHk6IDF9LFxuICBzb3V0aF93ZXN0OiB7eDogLTEsIHk6IDB9LFxuICB3ZXN0OiAgICAgICB7eDogLTEsIHk6IC0xfSxcbiAgbm9ydGhfd2VzdDoge3g6IDAsICB5OiAtMX0sXG4gIG5vcnRoOiAgICAgIHt4OiAxLCAgeTogLTF9LFxuICBub3J0aF9lYXN0OiB7eDogMSwgIHk6IDB9LFxuICBlYXN0OiAgICAgICB7eDogMSwgIHk6IDF9LFxuICBzb3V0aF9lYXN0OiB7eDogMCwgIHk6IDF9XG59XG5cbnZhciBkZWZhdWx0Q2hhcmFjdGVyT3B0aW9ucyA9IHtcbiAgeDogMCxcbiAgeTogMCxcbiAgZmFjaW5nOiAnc291dGgnLFxuICBzcHJpdGVzOiB7XG4gICAgc291dGg6ICcvc3ByaXRlcy9zb2xkaWVyL3NvdXRoLnBuZycsXG4gICAgc291dGhfd2VzdDogJy9zcHJpdGVzL3NvbGRpZXIvc291dGhfd2VzdC5wbmcnLFxuICAgIHdlc3Q6ICAgICAgICcvc3ByaXRlcy9zb2xkaWVyL3dlc3QucG5nJyxcbiAgICBub3J0aF93ZXN0OiAnL3Nwcml0ZXMvc29sZGllci9ub3J0aF93ZXN0LnBuZycsXG4gICAgbm9ydGg6ICAgICAgJy9zcHJpdGVzL3NvbGRpZXIvbm9ydGgucG5nJyxcbiAgICBub3J0aF9lYXN0OiAnL3Nwcml0ZXMvc29sZGllci9ub3J0aF9lYXN0LnBuZycsXG4gICAgZWFzdDogICAgICAgJy9zcHJpdGVzL3NvbGRpZXIvZWFzdC5wbmcnLFxuICAgIHNvdXRoX2Vhc3Q6ICcvc3ByaXRlcy9zb2xkaWVyL3NvdXRoX2Vhc3QucG5nJ1xuICB9LFxuICBjb2xsaWRlczogdHJ1ZSxcbiAgd2Fsa2FibGU6IGZhbHNlLFxuICBjb250cm9sbGVyRnVuY3Rpb246IHJlcXVpcmUoJy4uL2NvbnRyb2xsZXJzL2NoYXJhY3RlcicpXG59O1xuXG5mdW5jdGlvbiBDaGFyYWN0ZXIoYm9hcmQsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB7fTtcblxuICAvLy8gTWV0aG9kc1xuXG4gIHNlbGYudmlzaWJsZSAgID0gdmlzaWJsZTtcbiAgc2VsZi5pbnZpc2libGUgPSBpbnZpc2libGU7XG4gIHNlbGYuaW1hZ2UgICAgID0gaW1hZ2U7XG5cbiAgLy8vIG1vdmVtZW50XG5cbiAgc2VsZi5tb3ZlVG8gICAgPSBtb3ZlVG87XG4gIHNlbGYubW92ZSAgICAgID0gbW92ZTtcbiAgc2VsZi50dXJuTGVmdCAgPSB0dXJuTGVmdFxuICBzZWxmLnR1cm5SaWdodCA9IHR1cm5SaWdodFxuICBzZWxmLndhbGsgICAgICA9IHdhbGs7XG4gIHNlbGYud2Fsa0JhY2sgID0gd2Fsa0JhY2s7XG5cblxuICAvLy8gSW5pdFxuXG4gIHNlbGYuYm9hcmQgPSBib2FyZDtcblxuICBvcHRpb25zID0gZXh0ZW5kKHt9LCBkZWZhdWx0Q2hhcmFjdGVyT3B0aW9ucywgb3B0aW9ucyB8fCB7fSk7XG4gIHNlbGYueCA9IG9wdGlvbnMueDtcbiAgc2VsZi55ID0gb3B0aW9ucy55O1xuICBzZWxmLmZhY2luZyA9IG9wdGlvbnMuZmFjaW5nO1xuICBzZWxmLnNwcml0ZXMgPSBvcHRpb25zLnNwcml0ZXM7XG4gIHNlbGYuY29sbGlkZXMgPSBvcHRpb25zLmNvbGxpZGVzO1xuICBzZWxmLndhbGthYmxlID0gb3B0aW9ucy53YWxrYWJsZTtcbiAgc2VsZi5jb250cm9sbGVyRnVuY3Rpb24gPSBvcHRpb25zLmNvbnRyb2xsZXJGdW5jdGlvbjtcblxuXG4gIHNlbGYuc3RhdGUgPSB7XG4gICAgdmlzaWJsZTogb3B0aW9ucy52aXNpYmxlIHx8IGZhbHNlXG4gIH07XG5cbiAgaWYgKHNlbGYuc3RhdGUudmlzaWJsZSkgc2VsZi52aXNpYmxlKHRydWUpO1xuXG4gIHJldHVybiBzZWxmO1xufVxuXG5mdW5jdGlvbiBpbWFnZSgpIHtcbiAgcmV0dXJuIHRoaXMuc3ByaXRlc1t0aGlzLmZhY2luZ107XG59XG5cbmZ1bmN0aW9uIHZpc2libGUoZm9yY2UpIHtcbiAgaWYgKGZvcmNlIHx8ICEgdGhpcy5zdGF0ZS52aXNpYmxlKSB7XG4gICAgdGhpcy5zdGF0ZS52aXNpYmxlID0gdHJ1ZTtcbiAgICB0aGlzLmJvYXJkLnBsYWNlKHRoaXMpO1xuIH1cbn1cblxuZnVuY3Rpb24gaW52aXNpYmxlKGZvcmNlKSB7XG4gIGlmIChmb3JjZSB8fCB0aGlzLnN0YXRlLnZpc2libGUpIHtcbiAgICB0aGlzLnN0YXRlLnZpc2libGUgPSBmYWxzZTtcbiAgICB0aGlzLmJvYXJkLnJlbW92ZSh0aGlzKTtcbiAgfVxufVxuXG5cbi8vLyBNb3ZlbWVudFxuXG5mdW5jdGlvbiBtb3ZlVG8oeCwgeSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHJldHVybiB0aGlzLmJvYXJkLm1vdmVUbyh0aGlzLCB4LCB5KTtcbn1cblxuZnVuY3Rpb24gbW92ZSh4LCB5KSB7XG4gIHJldHVybiB0aGlzLm1vdmVUbyh0aGlzLnggKyB4LCB0aGlzLnkgKyB5KTtcbn1cblxuZnVuY3Rpb24gdHVybkxlZnQoKSB7XG4gIHRoaXMuZmFjaW5nID0gbmV4dE9uTGVmdFR1cm5bdGhpcy5mYWNpbmddO1xuICAvLyBIYWNrXG4gIHRoaXMuYm9hcmQucmVtb3ZlKHRoaXMpO1xuICB0aGlzLmJvYXJkLnBsYWNlKHRoaXMpO1xufVxuXG5mdW5jdGlvbiB0dXJuUmlnaHQoKSB7XG4gIHRoaXMuZmFjaW5nID0gbmV4dE9uUmlnaHRUdXJuW3RoaXMuZmFjaW5nXTtcbiAgLy8gSGFja1xuICB0aGlzLmJvYXJkLnJlbW92ZSh0aGlzKTtcbiAgdGhpcy5ib2FyZC5wbGFjZSh0aGlzKTtcbn1cblxuZnVuY3Rpb24gd2FsaygpIHtcbiAgdmFyIGRpcmVjdGlvbiA9IHdhbGtEaXJlY3Rpb25zW3RoaXMuZmFjaW5nXTtcbiAgcmV0dXJuIHRoaXMubW92ZShkaXJlY3Rpb24ueCwgZGlyZWN0aW9uLnkpO1xufVxuXG5mdW5jdGlvbiB3YWxrQmFjaygpIHtcbiAgdmFyIGRpcmVjdGlvbiA9IHdhbGtEaXJlY3Rpb25zW3RoaXMuZmFjaW5nXTtcbiAgcmV0dXJuIHRoaXMubW92ZSgtIGRpcmVjdGlvbi54LCAtIGRpcmVjdGlvbi55KTtcbn0iLCJ2YXIgZXh0ZW5kID0gcmVxdWlyZSgneHRlbmQnKTtcblxudmFyIENoYXJhY3RlciA9IHJlcXVpcmUoJy4vY2hhcmFjdGVyJyk7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBDaGFyYWN0ZXJzO1xuXG52YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG5cbn07XG5cbmZ1bmN0aW9uIENoYXJhY3RlcnMoYm9hcmQsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB7fTtcblxuICBzZWxmLmNoYXJhY3RlcnMgPSBbXTtcbiAgc2VsZi5ib2FyZCA9IGJvYXJkO1xuXG4gIG9wdGlvbnMgPSBleHRlbmQoe30sIGRlZmF1bHRPcHRpb25zLCBvcHRpb25zIHx8IHt9KTtcblxuICBzZWxmLmNyZWF0ZSA9IGNyZWF0ZTtcbiAgc2VsZi5wbGFjZSAgPSBwbGFjZTtcblxuICByZXR1cm4gc2VsZjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlKG9wdGlvbnMpIHtcbiAgcmV0dXJuIENoYXJhY3Rlcih0aGlzLmJvYXJkLCBvcHRpb25zKTtcbn1cblxuZnVuY3Rpb24gcGxhY2UoY2hhcmFjdGVyLCBvcHRpb25zKSB7XG4gIGlmICghIG9wdGlvbnMpIG9wdGlvbnMgPSB7fTtcbiAgaWYgKG9wdGlvbnMueCkgY2hhcmFjdGVyLnggPSBvcHRpb25zLng7XG4gIGlmIChvcHRpb25zLnkpIGNoYXJhY3Rlci55ID0gb3B0aW9ucy55O1xuICB2YXIgcGxhY2VkID0gdGhpcy5ib2FyZC5wbGFjZShjaGFyYWN0ZXIpO1xuICBpZiAocGxhY2VkKSB7XG4gICAgdGhpcy5jaGFyYWN0ZXJzLnB1c2goY2hhcmFjdGVyKTtcbiAgfVxuICByZXR1cm4gcGxhY2VkO1xufSIsIm1vZHVsZS5leHBvcnRzID0gQ29udHJvbGxlcnM7XG5cbmZ1bmN0aW9uIENvbnRyb2xsZXJzKCkge1xuICB2YXIgc2VsZiA9IHt9O1xuXG4gIHNlbGYuY29udHJvbCA9IGNvbnRyb2w7XG5cbiAgcmV0dXJuIHNlbGY7XG59XG5cbmZ1bmN0aW9uIGNvbnRyb2wob2JqZWN0KSB7XG4gIGlmICghIG9iamVjdCkgdGhyb3cgbmV3IEVycm9yKCdubyBvYmplY3QgdG8gY29udHJvbCcpO1xuICB2YXIgY29udHJvbGxlckZuID0gb2JqZWN0LmNvbnRyb2xsZXJGdW5jdGlvbjtcbiAgaWYgKCEgY29udHJvbGxlckZuKSB0aHJvdyBuZXcgRXJyb3IoJ29iamVjdCBkb2VzIG5vdCBkZWZpbmUgYSBjb250cm9sbGVyIGZ1bmN0aW9uJyk7XG4gIHZhciBjb250cm9sbGVyID0gbmV3IGNvbnRyb2xsZXJGbihvYmplY3QpO1xuICBjb250cm9sbGVyLmFjdGl2YXRlKCk7XG5cbiAgcmV0dXJuIGNvbnRyb2xsZXI7XG59IiwidmFyIEJvYXJkID0gcmVxdWlyZSgnLi9ib2FyZCcpO1xudmFyIENvbnRyb2xsZXJzID0gcmVxdWlyZSgnLi9jb250cm9sbGVycycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdhbWU7XG5cbmZ1bmN0aW9uIEdhbWUoZWxlbWVudCwgb3B0aW9ucykge1xuXG4gIHZhciBzZWxmID0ge307XG5cbiAgc2VsZi5ib2FyZCA9IEJvYXJkKGVsZW1lbnQsIG9wdGlvbnMpO1xuICBzZWxmLmNvbnRyb2xsZXJzID0gQ29udHJvbGxlcnMoKTtcblxuXG4gIC8vLyBNZXRob2RzXG5cbiAgc2VsZi5zdGFydCA9IHN0YXJ0O1xuXG4gIHJldHVybiBzZWxmO1xufVxuXG4vLy8gc3RhcnRcblxuZnVuY3Rpb24gc3RhcnQoKSB7XG5cbn0iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG52YXIgayxcbiAgX2hhbmRsZXJzID0ge30sXG4gIF9tb2RzID0geyAxNjogZmFsc2UsIDE4OiBmYWxzZSwgMTc6IGZhbHNlLCA5MTogZmFsc2UgfSxcbiAgX3Njb3BlID0gJ2FsbCcsXG4gIC8vIG1vZGlmaWVyIGtleXNcbiAgX01PRElGSUVSUyA9IHtcbiAgICAnw6LigKHCpyc6IDE2LCBzaGlmdDogMTYsXG4gICAgJ8OixZLCpSc6IDE4LCBhbHQ6IDE4LCBvcHRpb246IDE4LFxuICAgICfDosWSxpInOiAxNywgY3RybDogMTcsIGNvbnRyb2w6IDE3LFxuICAgICfDosWSy5wnOiA5MSwgY29tbWFuZDogOTFcbiAgfSxcbiAgLy8gc3BlY2lhbCBrZXlzXG4gIF9NQVAgPSB7XG4gICAgYmFja3NwYWNlOiA4LCB0YWI6IDksIGNsZWFyOiAxMixcbiAgICBlbnRlcjogMTMsICdyZXR1cm4nOiAxMyxcbiAgICBlc2M6IDI3LCBlc2NhcGU6IDI3LCBzcGFjZTogMzIsXG4gICAgbGVmdDogMzcsIHVwOiAzOCxcbiAgICByaWdodDogMzksIGRvd246IDQwLFxuICAgIGRlbDogNDYsICdkZWxldGUnOiA0NixcbiAgICBob21lOiAzNiwgZW5kOiAzNSxcbiAgICBwYWdldXA6IDMzLCBwYWdlZG93bjogMzQsXG4gICAgJywnOiAxODgsICcuJzogMTkwLCAnLyc6IDE5MSxcbiAgICAnYCc6IDE5MiwgJy0nOiAxODksICc9JzogMTg3LFxuICAgICc7JzogMTg2LCAnXFwnJzogMjIyLFxuICAgICdbJzogMjE5LCAnXSc6IDIyMSwgJ1xcXFwnOiAyMjBcbiAgfSxcbiAgY29kZSA9IGZ1bmN0aW9uKHgpe1xuICAgIHJldHVybiBfTUFQW3hdIHx8IHgudG9VcHBlckNhc2UoKS5jaGFyQ29kZUF0KDApO1xuICB9LFxuICBfZG93bktleXMgPSBbXTtcblxuZm9yKGs9MTtrPDIwO2srKykgX01BUFsnZicra10gPSAxMTEraztcblxuLy8gSUUgZG9lc24ndCBzdXBwb3J0IEFycmF5I2luZGV4T2YsIHNvIGhhdmUgYSBzaW1wbGUgcmVwbGFjZW1lbnRcbmZ1bmN0aW9uIGluZGV4KGFycmF5LCBpdGVtKXtcbiAgdmFyIGkgPSBhcnJheS5sZW5ndGg7XG4gIHdoaWxlKGktLSkgaWYoYXJyYXlbaV09PT1pdGVtKSByZXR1cm4gaTtcbiAgcmV0dXJuIC0xO1xufVxuXG4vLyBmb3IgY29tcGFyaW5nIG1vZHMgYmVmb3JlIHVuYXNzaWdubWVudFxuZnVuY3Rpb24gY29tcGFyZUFycmF5KGExLCBhMikge1xuICBpZiAoYTEubGVuZ3RoICE9IGEyLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGExLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoYTFbaV0gIT09IGEyW2ldKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbnZhciBtb2RpZmllck1hcCA9IHtcbiAgICAxNjonc2hpZnRLZXknLFxuICAgIDE4OidhbHRLZXknLFxuICAgIDE3OidjdHJsS2V5JyxcbiAgICA5MTonbWV0YUtleSdcbn07XG5mdW5jdGlvbiB1cGRhdGVNb2RpZmllcktleShldmVudCkge1xuICAgIGZvcihrIGluIF9tb2RzKSBfbW9kc1trXSA9IGV2ZW50W21vZGlmaWVyTWFwW2tdXTtcbn07XG5cbi8vIGhhbmRsZSBrZXlkb3duIGV2ZW50XG5mdW5jdGlvbiBkaXNwYXRjaChldmVudCkge1xuICB2YXIga2V5LCBoYW5kbGVyLCBrLCBpLCBtb2RpZmllcnNNYXRjaCwgc2NvcGU7XG4gIGtleSA9IGV2ZW50LmtleUNvZGU7XG5cbiAgaWYgKGluZGV4KF9kb3duS2V5cywga2V5KSA9PSAtMSkge1xuICAgICAgX2Rvd25LZXlzLnB1c2goa2V5KTtcbiAgfVxuXG4gIC8vIGlmIGEgbW9kaWZpZXIga2V5LCBzZXQgdGhlIGtleS48bW9kaWZpZXJrZXluYW1lPiBwcm9wZXJ0eSB0byB0cnVlIGFuZCByZXR1cm5cbiAgaWYoa2V5ID09IDkzIHx8IGtleSA9PSAyMjQpIGtleSA9IDkxOyAvLyByaWdodCBjb21tYW5kIG9uIHdlYmtpdCwgY29tbWFuZCBvbiBHZWNrb1xuICBpZihrZXkgaW4gX21vZHMpIHtcbiAgICBfbW9kc1trZXldID0gdHJ1ZTtcbiAgICAvLyAnYXNzaWduS2V5JyBmcm9tIGluc2lkZSB0aGlzIGNsb3N1cmUgaXMgZXhwb3J0ZWQgdG8gd2luZG93LmtleVxuICAgIGZvcihrIGluIF9NT0RJRklFUlMpIGlmKF9NT0RJRklFUlNba10gPT0ga2V5KSBhc3NpZ25LZXlba10gPSB0cnVlO1xuICAgIHJldHVybjtcbiAgfVxuICB1cGRhdGVNb2RpZmllcktleShldmVudCk7XG5cbiAgLy8gc2VlIGlmIHdlIG5lZWQgdG8gaWdub3JlIHRoZSBrZXlwcmVzcyAoZmlsdGVyKCkgY2FuIGNhbiBiZSBvdmVycmlkZGVuKVxuICAvLyBieSBkZWZhdWx0IGlnbm9yZSBrZXkgcHJlc3NlcyBpZiBhIHNlbGVjdCwgdGV4dGFyZWEsIG9yIGlucHV0IGlzIGZvY3VzZWRcbiAgaWYoIWFzc2lnbktleS5maWx0ZXIuY2FsbCh0aGlzLCBldmVudCkpIHJldHVybjtcblxuICAvLyBhYm9ydCBpZiBubyBwb3RlbnRpYWxseSBtYXRjaGluZyBzaG9ydGN1dHMgZm91bmRcbiAgaWYgKCEoa2V5IGluIF9oYW5kbGVycykpIHJldHVybjtcblxuICBzY29wZSA9IGdldFNjb3BlKCk7XG5cbiAgLy8gZm9yIGVhY2ggcG90ZW50aWFsIHNob3J0Y3V0XG4gIGZvciAoaSA9IDA7IGkgPCBfaGFuZGxlcnNba2V5XS5sZW5ndGg7IGkrKykge1xuICAgIGhhbmRsZXIgPSBfaGFuZGxlcnNba2V5XVtpXTtcblxuICAgIC8vIHNlZSBpZiBpdCdzIGluIHRoZSBjdXJyZW50IHNjb3BlXG4gICAgaWYoaGFuZGxlci5zY29wZSA9PSBzY29wZSB8fCBoYW5kbGVyLnNjb3BlID09ICdhbGwnKXtcbiAgICAgIC8vIGNoZWNrIGlmIG1vZGlmaWVycyBtYXRjaCBpZiBhbnlcbiAgICAgIG1vZGlmaWVyc01hdGNoID0gaGFuZGxlci5tb2RzLmxlbmd0aCA+IDA7XG4gICAgICBmb3IoayBpbiBfbW9kcylcbiAgICAgICAgaWYoKCFfbW9kc1trXSAmJiBpbmRleChoYW5kbGVyLm1vZHMsICtrKSA+IC0xKSB8fFxuICAgICAgICAgIChfbW9kc1trXSAmJiBpbmRleChoYW5kbGVyLm1vZHMsICtrKSA9PSAtMSkpIG1vZGlmaWVyc01hdGNoID0gZmFsc2U7XG4gICAgICAvLyBjYWxsIHRoZSBoYW5kbGVyIGFuZCBzdG9wIHRoZSBldmVudCBpZiBuZWNjZXNzYXJ5XG4gICAgICBpZigoaGFuZGxlci5tb2RzLmxlbmd0aCA9PSAwICYmICFfbW9kc1sxNl0gJiYgIV9tb2RzWzE4XSAmJiAhX21vZHNbMTddICYmICFfbW9kc1s5MV0pIHx8IG1vZGlmaWVyc01hdGNoKXtcbiAgICAgICAgaWYoaGFuZGxlci5tZXRob2QoZXZlbnQsIGhhbmRsZXIpPT09ZmFsc2Upe1xuICAgICAgICAgIGlmKGV2ZW50LnByZXZlbnREZWZhdWx0KSBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgZWxzZSBldmVudC5yZXR1cm5WYWx1ZSA9IGZhbHNlO1xuICAgICAgICAgIGlmKGV2ZW50LnN0b3BQcm9wYWdhdGlvbikgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgaWYoZXZlbnQuY2FuY2VsQnViYmxlKSBldmVudC5jYW5jZWxCdWJibGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vLyB1bnNldCBtb2RpZmllciBrZXlzIG9uIGtleXVwXG5mdW5jdGlvbiBjbGVhck1vZGlmaWVyKGV2ZW50KXtcbiAgdmFyIGtleSA9IGV2ZW50LmtleUNvZGUsIGssXG4gICAgICBpID0gaW5kZXgoX2Rvd25LZXlzLCBrZXkpO1xuXG4gIC8vIHJlbW92ZSBrZXkgZnJvbSBfZG93bktleXNcbiAgaWYgKGkgPj0gMCkge1xuICAgICAgX2Rvd25LZXlzLnNwbGljZShpLCAxKTtcbiAgfVxuXG4gIGlmKGtleSA9PSA5MyB8fCBrZXkgPT0gMjI0KSBrZXkgPSA5MTtcbiAgaWYoa2V5IGluIF9tb2RzKSB7XG4gICAgX21vZHNba2V5XSA9IGZhbHNlO1xuICAgIGZvcihrIGluIF9NT0RJRklFUlMpIGlmKF9NT0RJRklFUlNba10gPT0ga2V5KSBhc3NpZ25LZXlba10gPSBmYWxzZTtcbiAgfVxufTtcblxuZnVuY3Rpb24gcmVzZXRNb2RpZmllcnMoKSB7XG4gIGZvcihrIGluIF9tb2RzKSBfbW9kc1trXSA9IGZhbHNlO1xuICBmb3IoayBpbiBfTU9ESUZJRVJTKSBhc3NpZ25LZXlba10gPSBmYWxzZTtcbn07XG5cbi8vIHBhcnNlIGFuZCBhc3NpZ24gc2hvcnRjdXRcbmZ1bmN0aW9uIGFzc2lnbktleShrZXksIHNjb3BlLCBtZXRob2Qpe1xuICB2YXIga2V5cywgbW9kcztcbiAga2V5cyA9IGdldEtleXMoa2V5KTtcbiAgaWYgKG1ldGhvZCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbWV0aG9kID0gc2NvcGU7XG4gICAgc2NvcGUgPSAnYWxsJztcbiAgfVxuXG4gIC8vIGZvciBlYWNoIHNob3J0Y3V0XG4gIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuICAgIC8vIHNldCBtb2RpZmllciBrZXlzIGlmIGFueVxuICAgIG1vZHMgPSBbXTtcbiAgICBrZXkgPSBrZXlzW2ldLnNwbGl0KCcrJyk7XG4gICAgaWYgKGtleS5sZW5ndGggPiAxKXtcbiAgICAgIG1vZHMgPSBnZXRNb2RzKGtleSk7XG4gICAgICBrZXkgPSBba2V5W2tleS5sZW5ndGgtMV1dO1xuICAgIH1cbiAgICAvLyBjb252ZXJ0IHRvIGtleWNvZGUgYW5kLi4uXG4gICAga2V5ID0ga2V5WzBdXG4gICAga2V5ID0gY29kZShrZXkpO1xuICAgIC8vIC4uLnN0b3JlIGhhbmRsZXJcbiAgICBpZiAoIShrZXkgaW4gX2hhbmRsZXJzKSkgX2hhbmRsZXJzW2tleV0gPSBbXTtcbiAgICBfaGFuZGxlcnNba2V5XS5wdXNoKHsgc2hvcnRjdXQ6IGtleXNbaV0sIHNjb3BlOiBzY29wZSwgbWV0aG9kOiBtZXRob2QsIGtleToga2V5c1tpXSwgbW9kczogbW9kcyB9KTtcbiAgfVxufTtcblxuLy8gdW5iaW5kIGFsbCBoYW5kbGVycyBmb3IgZ2l2ZW4ga2V5IGluIGN1cnJlbnQgc2NvcGVcbmZ1bmN0aW9uIHVuYmluZEtleShrZXksIHNjb3BlKSB7XG4gIHZhciBtdWx0aXBsZUtleXMsIGtleXMsXG4gICAgbW9kcyA9IFtdLFxuICAgIGksIGosIG9iajtcblxuICBtdWx0aXBsZUtleXMgPSBnZXRLZXlzKGtleSk7XG5cbiAgZm9yIChqID0gMDsgaiA8IG11bHRpcGxlS2V5cy5sZW5ndGg7IGorKykge1xuICAgIGtleXMgPSBtdWx0aXBsZUtleXNbal0uc3BsaXQoJysnKTtcblxuICAgIGlmIChrZXlzLmxlbmd0aCA+IDEpIHtcbiAgICAgIG1vZHMgPSBnZXRNb2RzKGtleXMpO1xuICAgICAga2V5ID0ga2V5c1trZXlzLmxlbmd0aCAtIDFdO1xuICAgIH1cblxuICAgIGtleSA9IGNvZGUoa2V5KTtcblxuICAgIGlmIChzY29wZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBzY29wZSA9IGdldFNjb3BlKCk7XG4gICAgfVxuICAgIGlmICghX2hhbmRsZXJzW2tleV0pIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yIChpID0gMDsgaSA8IF9oYW5kbGVyc1trZXldLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmogPSBfaGFuZGxlcnNba2V5XVtpXTtcbiAgICAgIC8vIG9ubHkgY2xlYXIgaGFuZGxlcnMgaWYgY29ycmVjdCBzY29wZSBhbmQgbW9kcyBtYXRjaFxuICAgICAgaWYgKG9iai5zY29wZSA9PT0gc2NvcGUgJiYgY29tcGFyZUFycmF5KG9iai5tb2RzLCBtb2RzKSkge1xuICAgICAgICBfaGFuZGxlcnNba2V5XVtpXSA9IHt9O1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLy8gUmV0dXJucyB0cnVlIGlmIHRoZSBrZXkgd2l0aCBjb2RlICdrZXlDb2RlJyBpcyBjdXJyZW50bHkgZG93blxuLy8gQ29udmVydHMgc3RyaW5ncyBpbnRvIGtleSBjb2Rlcy5cbmZ1bmN0aW9uIGlzUHJlc3NlZChrZXlDb2RlKSB7XG4gICAgaWYgKHR5cGVvZihrZXlDb2RlKT09J3N0cmluZycpIHtcbiAgICAgIGtleUNvZGUgPSBjb2RlKGtleUNvZGUpO1xuICAgIH1cbiAgICByZXR1cm4gaW5kZXgoX2Rvd25LZXlzLCBrZXlDb2RlKSAhPSAtMTtcbn1cblxuZnVuY3Rpb24gZ2V0UHJlc3NlZEtleUNvZGVzKCkge1xuICAgIHJldHVybiBfZG93bktleXMuc2xpY2UoMCk7XG59XG5cbmZ1bmN0aW9uIGZpbHRlcihldmVudCl7XG4gIHZhciB0YWdOYW1lID0gKGV2ZW50LnRhcmdldCB8fCBldmVudC5zcmNFbGVtZW50KS50YWdOYW1lO1xuICAvLyBpZ25vcmUga2V5cHJlc3NlZCBpbiBhbnkgZWxlbWVudHMgdGhhdCBzdXBwb3J0IGtleWJvYXJkIGRhdGEgaW5wdXRcbiAgcmV0dXJuICEodGFnTmFtZSA9PSAnSU5QVVQnIHx8IHRhZ05hbWUgPT0gJ1NFTEVDVCcgfHwgdGFnTmFtZSA9PSAnVEVYVEFSRUEnKTtcbn1cblxuLy8gaW5pdGlhbGl6ZSBrZXkuPG1vZGlmaWVyPiB0byBmYWxzZVxuZm9yKGsgaW4gX01PRElGSUVSUykgYXNzaWduS2V5W2tdID0gZmFsc2U7XG5cbi8vIHNldCBjdXJyZW50IHNjb3BlIChkZWZhdWx0ICdhbGwnKVxuZnVuY3Rpb24gc2V0U2NvcGUoc2NvcGUpeyBfc2NvcGUgPSBzY29wZSB8fCAnYWxsJyB9O1xuZnVuY3Rpb24gZ2V0U2NvcGUoKXsgcmV0dXJuIF9zY29wZSB8fCAnYWxsJyB9O1xuXG4vLyBkZWxldGUgYWxsIGhhbmRsZXJzIGZvciBhIGdpdmVuIHNjb3BlXG5mdW5jdGlvbiBkZWxldGVTY29wZShzY29wZSl7XG4gIHZhciBrZXksIGhhbmRsZXJzLCBpO1xuXG4gIGZvciAoa2V5IGluIF9oYW5kbGVycykge1xuICAgIGhhbmRsZXJzID0gX2hhbmRsZXJzW2tleV07XG4gICAgZm9yIChpID0gMDsgaSA8IGhhbmRsZXJzLmxlbmd0aDsgKSB7XG4gICAgICBpZiAoaGFuZGxlcnNbaV0uc2NvcGUgPT09IHNjb3BlKSBoYW5kbGVycy5zcGxpY2UoaSwgMSk7XG4gICAgICBlbHNlIGkrKztcbiAgICB9XG4gIH1cbn07XG5cbi8vIGFic3RyYWN0IGtleSBsb2dpYyBmb3IgYXNzaWduIGFuZCB1bmFzc2lnblxuZnVuY3Rpb24gZ2V0S2V5cyhrZXkpIHtcbiAgdmFyIGtleXM7XG4gIGtleSA9IGtleS5yZXBsYWNlKC9cXHMvZywgJycpO1xuICBrZXlzID0ga2V5LnNwbGl0KCcsJyk7XG4gIGlmICgoa2V5c1trZXlzLmxlbmd0aCAtIDFdKSA9PSAnJykge1xuICAgIGtleXNba2V5cy5sZW5ndGggLSAyXSArPSAnLCc7XG4gIH1cbiAgcmV0dXJuIGtleXM7XG59XG5cbi8vIGFic3RyYWN0IG1vZHMgbG9naWMgZm9yIGFzc2lnbiBhbmQgdW5hc3NpZ25cbmZ1bmN0aW9uIGdldE1vZHMoa2V5KSB7XG4gIHZhciBtb2RzID0ga2V5LnNsaWNlKDAsIGtleS5sZW5ndGggLSAxKTtcbiAgZm9yICh2YXIgbWkgPSAwOyBtaSA8IG1vZHMubGVuZ3RoOyBtaSsrKVxuICBtb2RzW21pXSA9IF9NT0RJRklFUlNbbW9kc1ttaV1dO1xuICByZXR1cm4gbW9kcztcbn1cblxuLy8gY3Jvc3MtYnJvd3NlciBldmVudHNcbmZ1bmN0aW9uIGFkZEV2ZW50KG9iamVjdCwgZXZlbnQsIG1ldGhvZCkge1xuICBpZiAob2JqZWN0LmFkZEV2ZW50TGlzdGVuZXIpXG4gICAgb2JqZWN0LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIG1ldGhvZCwgZmFsc2UpO1xuICBlbHNlIGlmKG9iamVjdC5hdHRhY2hFdmVudClcbiAgICBvYmplY3QuYXR0YWNoRXZlbnQoJ29uJytldmVudCwgZnVuY3Rpb24oKXsgbWV0aG9kKHdpbmRvdy5ldmVudCkgfSk7XG59O1xuXG4vLyBzZXQgdGhlIGhhbmRsZXJzIGdsb2JhbGx5IG9uIGRvY3VtZW50XG5hZGRFdmVudChkb2N1bWVudCwgJ2tleWRvd24nLCBmdW5jdGlvbihldmVudCkgeyBkaXNwYXRjaChldmVudCkgfSk7IC8vIFBhc3NpbmcgX3Njb3BlIHRvIGEgY2FsbGJhY2sgdG8gZW5zdXJlIGl0IHJlbWFpbnMgdGhlIHNhbWUgYnkgZXhlY3V0aW9uLiBGaXhlcyAjNDhcbmFkZEV2ZW50KGRvY3VtZW50LCAna2V5dXAnLCBjbGVhck1vZGlmaWVyKTtcblxuLy8gcmVzZXQgbW9kaWZpZXJzIHRvIGZhbHNlIHdoZW5ldmVyIHRoZSB3aW5kb3cgaXMgKHJlKWZvY3VzZWQuXG5hZGRFdmVudCh3aW5kb3csICdmb2N1cycsIHJlc2V0TW9kaWZpZXJzKTtcblxuLy8gc3RvcmUgcHJldmlvdXNseSBkZWZpbmVkIGtleVxudmFyIHByZXZpb3VzS2V5ID0gZ2xvYmFsLmtleTtcblxuLy8gcmVzdG9yZSBwcmV2aW91c2x5IGRlZmluZWQga2V5IGFuZCByZXR1cm4gcmVmZXJlbmNlIHRvIG91ciBrZXkgb2JqZWN0XG5mdW5jdGlvbiBub0NvbmZsaWN0KCkge1xuICB2YXIgayA9IGdsb2JhbC5rZXk7XG4gIGdsb2JhbC5rZXkgPSBwcmV2aW91c0tleTtcbiAgcmV0dXJuIGs7XG59XG5cbi8vIHNldCB3aW5kb3cua2V5IGFuZCB3aW5kb3cua2V5LnNldC9nZXQvZGVsZXRlU2NvcGUsIGFuZCB0aGUgZGVmYXVsdCBmaWx0ZXJcbmdsb2JhbC5rZXkgPSBhc3NpZ25LZXk7XG5nbG9iYWwua2V5LnNldFNjb3BlID0gc2V0U2NvcGU7XG5nbG9iYWwua2V5LmdldFNjb3BlID0gZ2V0U2NvcGU7XG5nbG9iYWwua2V5LmRlbGV0ZVNjb3BlID0gZGVsZXRlU2NvcGU7XG5nbG9iYWwua2V5LmZpbHRlciA9IGZpbHRlcjtcbmdsb2JhbC5rZXkuaXNQcmVzc2VkID0gaXNQcmVzc2VkO1xuZ2xvYmFsLmtleS5nZXRQcmVzc2VkS2V5Q29kZXMgPSBnZXRQcmVzc2VkS2V5Q29kZXM7XG5nbG9iYWwua2V5Lm5vQ29uZmxpY3QgPSBub0NvbmZsaWN0O1xuZ2xvYmFsLmtleS51bmJpbmQgPSB1bmJpbmRLZXk7XG5cbmlmKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnKSBtb2R1bGUuZXhwb3J0cyA9IGdsb2JhbC5rZXk7XG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIm1vZHVsZS5leHBvcnRzID0gVGlsZXM7XG5cbmZ1bmN0aW9uIFRpbGVzKGdyaWQpIHtcbiAgdmFyIHNlbGYgPSB7fTtcblxuICBzZWxmLnRpbGVzID0gW107XG5cbiAgc2VsZi5ncmlkID0gZ3JpZDtcblxuICBzZWxmLmNyZWF0ZSA9IGNyZWF0ZTtcblxuICByZXR1cm4gc2VsZjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlKHgsIHkpIHtcbiAgdmFyIHRpbGUgPSB0aGlzLmdyaWQuY3JlYXRlVGlsZSh4LCB5KTtcbiAgdGlsZS5lbGVtZW50LmF0dHIoJ2ZpbGwnLCAncmdiYSgyMTAsMjEwLDIxMCwxLjApJyk7XG4gIHRpbGUuZWxlbWVudC5hdHRyKCdzdHJva2Utd2lkdGgnLCAnMScpO1xuICB0aWxlLmVsZW1lbnQuYXR0cignc3Ryb2tlJywgJ3JnYigyNTUsMjU1LDIwMCknKTtcblxuICB0aWxlLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5sb2coJ2F0JywgdGlsZS54LCB0aWxlLnkpO1xuICAgIHRpbGUuZWxlbWVudC50b0Zyb250KCk7XG4gICAgdGlsZS5lbGVtZW50LmF0dHIoJ2ZpbGwnLCAncmdiYSgyNTUsMTI3LDEyNywwLjgpJyk7XG4gIH0pO1xuXG4gIHRpbGUub24oJ21vdXNlb3V0JywgZnVuY3Rpb24gKCkge1xuICAgIHRpbGUuZWxlbWVudC50b0JhY2soKTtcbiAgICB0aWxlLmVsZW1lbnQuYXR0cignZmlsbCcsICdyZ2JhKDIxMCwyMTAsMjEwLDEuMCknKTtcbiAgfSk7XG5cbiAgdGhpcy50aWxlcy5wdXNoKHRpbGUpO1xuXG4gIHJldHVybiB0aWxlO1xufSIsInZhciBleHRlbmQgPSByZXF1aXJlKCd4dGVuZCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFdhbGxUeXBlO1xuXG52YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG4gIGltYWdlczoge1xuICAgIGxlZnQ6ICcvc3ByaXRlcy93YWxscy9wbGFpbi9sZWZ0LnBuZycsXG4gICAgcmlnaHQ6ICcvc3ByaXRlcy93YWxscy9wbGFpbi9yaWdodC5wbmcnXG4gIH0sXG4gIHRyYXZlcnNhYmxlOiBmYWxzZVxufVxuXG5mdW5jdGlvbiBXYWxsVHlwZShvcHRpb25zKSB7XG4gIHZhciBzZWxmID0ge307XG5cbiAgb3B0aW9ucyA9IGV4dGVuZCh7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMgfHwge30pO1xuXG4gIHNlbGYuaW1hZ2VzID0gb3B0aW9ucy5pbWFnZXM7XG5cblxuICAvLy8gbWV0aG9kc1xuXG4gIHNlbGYuaW1hZ2UgPSBpbWFnZTtcblxuXG4gIHJldHVybiBzZWxmO1xufVxuXG5mdW5jdGlvbiBpbWFnZShvcmllbnRhdGlvbikge1xuICB2YXIgaW1nID0gdGhpcy5pbWFnZXNbb3JpZW50YXRpb25dO1xuICBpZiAoISBpbWcpIHRocm93IG5ldyBFcnJvcignbm8gaW1hZ2UgZm9yIG9yaWVudGF0aW9uICcgKyBvcmllbnRhdGlvbik7XG4gIHJldHVybiBpbWc7XG59IiwidmFyIFdhbGxUeXBlID0gcmVxdWlyZSgnLi93YWxsX3R5cGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBXYWxsVHlwZXM7XG5cbmZ1bmN0aW9uIFdhbGxUeXBlcyhib2FyZCkge1xuICB2YXIgc2VsZiA9IHt9O1xuXG4gIHNlbGYuYm9hcmQgPSBib2FyZDtcblxuXG4gIC8vLyBtZXRob2RzXG5cbiAgc2VsZi5jcmVhdGUgPSBjcmVhdGU7XG5cbiAgcmV0dXJuIHNlbGY7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZShvcHRpb25zKSB7XG4gIHJldHVybiBXYWxsVHlwZShvcHRpb25zKTtcbn0iLCJ2YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBXYWxscztcblxuZnVuY3Rpb24gV2FsbHMoYm9hcmQpIHtcbiAgdmFyIHNlbGYgPSB7fTtcblxuICBzZWxmLndhbGxzID0ge307XG5cbiAgc2VsZi5ib2FyZCA9IGJvYXJkO1xuXG4gIHNlbGYucGxhY2UgPSBwbGFjZTtcbiAgc2VsZi5wbGFjZU9uZSA9IHBsYWNlT25lO1xuICBzZWxmLmF0ID0gYXQ7XG4gIHNlbGYudHJhdmVyc2FibGUgPSB0cmF2ZXJzYWJsZTtcblxuICByZXR1cm4gc2VsZjtcbn1cblxuLy8vIHBsYWNlXG5cbmZ1bmN0aW9uIHBsYWNlKHdhbGxUeXBlLCBmcm9tLCB0bykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFsaWRhdGVJbml0aWFsV2FsbENvb3Jkcyhmcm9tKTtcbiAgdmFsaWRhdGVJbml0aWFsV2FsbENvb3Jkcyh0byk7XG5cbiAgaWYgKGZyb20ueCAhPSB0by54ICYmIGZyb20ueSAhPSB0by55KVxuICAgIHRocm93IG5ldyBFcnJvcignd2FsbHMgbXVzdCBiZSBkcmF3biBpbiBhIGxpbmUnKTtcblxuICBpZiAoZnJvbS54ID09IHRvLngpIHtcbiAgICB2YXIgbWF4WSA9IE1hdGgubWF4KGZyb20ueSwgdG8ueSk7XG4gICAgdmFyIG1pblkgPSBNYXRoLm1pbihmcm9tLnksIHRvLnkpO1xuICAgIGZvcih2YXIgeSA9IG1pblk7IHkgPCBtYXhZOyB5ID0geSArIDEpIHtcbiAgICAgIHNlbGYucGxhY2VPbmUod2FsbFR5cGUsIGZyb20ueCwgeSArIDAuNSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBtYXhYID0gTWF0aC5tYXgoZnJvbS54LCB0by54KTtcbiAgICB2YXIgbWluWCA9IE1hdGgubWluKGZyb20ueCwgdG8ueCk7XG4gICAgZm9yKHZhciB4ID0gbWluWDsgeCA8IG1heFg7IHggKz0gMSkge1xuICAgICAgc2VsZi5wbGFjZU9uZSh3YWxsVHlwZSwgeCArIDAuNSwgZnJvbS55KTtcbiAgICB9XG4gIH1cbn1cblxuXG4vLy8gcGxhY2VPbmVcblxuZnVuY3Rpb24gcGxhY2VPbmUod2FsbFR5cGUsIHgsIHkpIHtcblxuICB2YXIgb3JpZW50YXRpb247XG5cbiAgdmFyIHhJc1plcm8gPSB2YWxpZGF0ZU9uZVdhbGxDb29yZHMoeCwgeSk7XG4gIHZhciBmcm9tLCB0bztcbiAgaWYoeElzWmVybykge1xuICAgIGZyb20gPSB7XG4gICAgICB4OiB4IC0gMC41LFxuICAgICAgeTogeVxuICAgIH07XG5cbiAgICB0byA9IHtcbiAgICAgIHg6IHggKyAwLjUsXG4gICAgICB5OiB5XG4gICAgfVxuXG4gICAgb3JpZW50YXRpb24gPSAnbGVmdCc7XG4gIH0gZWxzZSB7XG4gICAgZnJvbSA9IHtcbiAgICAgIHg6IHgsXG4gICAgICB5OiB5IC0gMC41XG4gICAgfTtcblxuICAgIHRvID0ge1xuICAgICAgeDogeCxcbiAgICAgIHk6IHkgKyAwLjVcbiAgICB9XG5cbiAgICBvcmllbnRhdGlvbiA9ICdyaWdodCc7XG4gIH1cblxuICB2YXIgaW1hZ2UgPSB3YWxsVHlwZS5pbWFnZShvcmllbnRhdGlvbik7XG5cbiAgdmFyIHJvdyA9IHRoaXMud2FsbHNbeF07XG4gIGlmICghIHJvdykgcm93ID0gdGhpcy53YWxsc1t4XSA9IHt9O1xuICByb3dbeV0gPSB3YWxsVHlwZTtcblxuICB0aGlzLmJvYXJkLmdyaWQuY3JlYXRlV2FsbChpbWFnZSwgZnJvbSwgdG8pO1xufVxuXG5mdW5jdGlvbiBhdCh4LCB5KSB7XG4gIHZhciB3YWxsID0gdGhpcy53YWxsc1t4XTtcbiAgaWYgKHdhbGwpIHdhbGwgPSB3YWxsW3ldO1xuXG4gIHJldHVybiB3YWxsO1xufVxuXG5cbmZ1bmN0aW9uIHRyYXZlcnNhYmxlKGZyb20sIHRvKSB7XG4gIHZhciB3YWxsO1xuICB2YXIgd2FsbHM7XG4gIHZhciB0cmF2ZXJzYWJsZTtcblxuICB2YXIgZGlmZlggPSB0by54IC0gZnJvbS54O1xuICB2YXIgZGlmZlkgPSB0by55IC0gZnJvbS55O1xuXG4gIGlmIChNYXRoLmFicyhkaWZmWCkgPiAxIHx8IE1hdGguYWJzKGRpZmZZKSA+IDEpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgY2FsY3VsYXRlIHRyYXZlcnNhYmlsaXR5IGZvciBkaXN0YW5jZXMgPiAxJyk7XG5cbiAgdmFyIG1pZFggPSBmcm9tLnggKyBkaWZmWCAvIDI7XG4gIHZhciBtaWRZID0gZnJvbS55ICsgZGlmZlkgLyAyO1xuXG4gIGlmIChkaWZmWCA9PSAwIHx8IGRpZmZZID09IDApIHtcbiAgICAvLyBubyBkaWFnb25hbFxuICAgIHdhbGwgPSB0aGlzLmF0KG1pZFgsIG1pZFkpO1xuICAgIHRyYXZlcnNhYmxlID0gISB3YWxsIHx8IHdhbGwudHJhdmVyc2FibGU7XG4gIH0gZWxzZSB7XG4gICAgLy8gZGlhZ29uYWxcblxuICAgIHZhciB3YWxsMSA9IHRoaXMuYXQobWlkWCwgZnJvbS55KTtcbiAgICB3YWxsMSA9IHdhbGwxICYmICF3YWxsMS50cmF2ZXJzYWJsZTtcblxuICAgIHZhciB3YWxsMiA9IHRoaXMuYXQodG8ueCwgbWlkWSk7XG4gICAgd2FsbDIgPSB3YWxsMiAmJiAhd2FsbDIudHJhdmVyc2FibGU7XG5cbiAgICB2YXIgd2FsbDMgPSB0aGlzLmF0KG1pZFgsIHRvLnkpO1xuICAgIHdhbGwzID0gd2FsbDMgJiYgIXdhbGwzLnRyYXZlcnNhYmxlO1xuXG4gICAgdmFyIHdhbGw0ID0gdGhpcy5hdChmcm9tLngsIG1pZFkpO1xuICAgIHdhbGw0ID0gd2FsbDQgJiYgIXdhbGw0LnRyYXZlcnNhYmxlO1xuXG4gICAgdHJhdmVyc2FibGUgPSAoXG4gICAgICAgICAhKHdhbGwxICYmIHdhbGwyKVxuICAgICAgJiYgISh3YWxsMiAmJiB3YWxsMylcbiAgICAgICYmICEod2FsbDMgJiYgd2FsbDQpXG4gICAgICAmJiAhKHdhbGw0ICYmIHdhbGwxKVxuICAgICAgJiYgISh3YWxsMSAmJiB3YWxsMylcbiAgICAgICYmICEod2FsbDIgJiYgd2FsbDQpXG4gICAgICAmJiAhKHdhbGwzICYmIHdhbGwxKSk7XG4gIH1cblxuICByZXR1cm4gdHJhdmVyc2FibGU7XG59XG5cbmZ1bmN0aW9uIGlzVHJhdmVyc2FibGUod2FsbCkge1xuICByZXR1cm4gd2FsbC50cmF2ZXJzYWJsZTtcbn1cblxuXG5cbi8vLyBNaXNjXG5cbmZ1bmN0aW9uIHZhbGlkYXRlSW5pdGlhbFdhbGxDb29yZHMoY29vcmRzKSB7XG4gIHZhciB4ID0gY29vcmRzLng7XG4gIGlmIChNYXRoLmFicyhNYXRoLnJvdW5kKHgpIC0geCkgIT09IDAuNSkgdGhyb3cgbmV3IEVycm9yKCd3YWxsIHggY29vcmRpbmF0ZSBtdXN0IGJlIG4uNScpO1xuICB2YXIgeSA9IGNvb3Jkcy55O1xuICBpZiAoTWF0aC5hYnMoTWF0aC5yb3VuZCh5KSAtIHkpICE9PSAwLjUpIHRocm93IG5ldyBFcnJvcignd2FsbCB5IGNvb3JkaW5hdGUgbXVzdCBiZSBuLjUnKTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVPbmVXYWxsQ29vcmRzKHgsIHkpIHtcbiAgdmFyIHhGcmFjdGlvbiA9IE1hdGguYWJzKE1hdGgucm91bmQoeCkgLSB4KSA9PT0gMC41O1xuICB2YXIgeUZyYWN0aW9uID0gTWF0aC5hYnMoTWF0aC5yb3VuZCh5KSAtIHkpID09PSAwLjU7XG5cbiAgaWYgKHhGcmFjdGlvbiAmJiB5RnJhY3Rpb24gfHwgISAoeEZyYWN0aW9uIHx8IHlGcmFjdGlvbikpXG4gICAgdGhyb3cgbmV3IEVycm9yKCd3YWxsIGNhblxcJ3QgYmUgcGxhY2VkIGF0ICcgKyB4ICsgJywgJyArIHkpO1xuXG4gIHJldHVybiB4RnJhY3Rpb247XG59IiwidmFyIHJhcGhhZWwgPSByZXF1aXJlKCdyYXBoYWVsLWJyb3dzZXJpZnknKTtcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICAgIHJldHVybiBuZXcgVGlsZU1hcCh3aWR0aCwgaGVpZ2h0KTtcbn07XG5cbmZ1bmN0aW9uIFRpbGVNYXAgKHdpZHRoLCBoZWlnaHQpIHtcbiAgICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMucGFwZXIgPSByYXBoYWVsKHRoaXMuZWxlbWVudCwgd2lkdGgsIGhlaWdodCk7XG4gICAgdGhpcy5zaXplID0gWyB3aWR0aCwgaGVpZ2h0IF07XG4gICAgdGhpcy56b29tTGV2ZWwgPSAxO1xuXG4gICAgdGhpcy50aWxlcyA9IHt9O1xuXG4gICAgdGhpcy5pdGVtcyA9IHt9O1xuICAgIHRoaXMuaXRlbVN0YWNrID0gW107XG4gICAgdGhpcy5pdGVtU2V0ID0gdGhpcy5wYXBlci5zZXQoKTtcbiAgICB0aGlzLmltYWdlcyA9IHt9O1xuXG4gICAgdGhpcy5wb2ludHMgPSB7fTtcblxuICAgIHRoaXMudGllZCA9IFtdO1xuICAgIHRoaXMuc2VsZWN0ZWQgPSBbXTtcblxuICAgIHRoaXMubW92ZVRvKDAsIDApO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24gKCkge1xuICAgIC8vICAgICBpZiAoc2VsZi50aWVkLmxlbmd0aCA9PT0gMCkge1xuICAgIC8vICAgICAgICAgc2VsZi50aWUod2luZG93KTtcbiAgICAvLyAgICAgfVxuICAgIC8vIH0pO1xufVxuXG51dGlsLmluaGVyaXRzKFRpbGVNYXAsIEV2ZW50RW1pdHRlcik7XG5cblRpbGVNYXAucHJvdG90eXBlLnJlc2l6ZSA9IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdGhpcy5zaXplID0gWyB3aWR0aCwgaGVpZ2h0IF07XG4gICAgdGhpcy5wYXBlci5zZXRTaXplKHdpZHRoLCBoZWlnaHQpO1xuICAgIHRoaXMuX3NldFZpZXcoKTtcbn07XG5cblRpbGVNYXAucHJvdG90eXBlLmNyZWF0ZVRpbGUgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcG9pbnRzID0gW1xuICAgICAgICBbIHggLSAwLjUsIHkgKyAwLjUgXSxcbiAgICAgICAgWyB4IC0gMC41LCB5IC0gMC41IF0sXG4gICAgICAgIFsgeCArIDAuNSwgeSAtIDAuNSBdLFxuICAgICAgICBbIHggKyAwLjUsIHkgKyAwLjUgXVxuICAgIF07XG4gICAgdmFyIHBvbHkgPSBwb2ludHMubWFwKGZ1bmN0aW9uIChwdCkgeyByZXR1cm4gc2VsZi50b1dvcmxkKHB0WzBdLCBwdFsxXSkgfSk7XG5cbiAgICB2YXIgdGlsZSA9IG5ldyBFdmVudEVtaXR0ZXI7XG4gICAgdGlsZS54ID0geDtcbiAgICB0aWxlLnkgPSB5O1xuICAgIHRpbGUudHlwZSA9ICd0aWxlJztcbiAgICB0aWxlLmVsZW1lbnQgPSBzZWxmLnBhcGVyLnBhdGgocG9seWdvbihwb2x5KSk7XG5cbiAgICB2YXIgcHQgPSBzZWxmLnRvV29ybGQoeCwgeSk7XG4gICAgdGlsZS5zY3JlZW5YID0gcHRbMF07XG4gICAgdGlsZS5zY3JlZW5ZID0gcHRbMV07XG5cbiAgICBzZWxmLnRpbGVzW3ggKyAnLCcgKyB5XSA9IHRpbGU7XG5cbiAgICB2YXIgY3JlYXRlZCA9IFtdO1xuICAgIHZhciBwdHMgPSBwb2ludHMubWFwKGZ1bmN0aW9uIChwdCwgaXgpIHtcbiAgICAgICAgdmFyIGtleSA9IHB0WzBdICsgJywnICsgcHRbMV07XG4gICAgICAgIHZhciB4eSA9IHNlbGYudG9Xb3JsZChwdFswXSwgcHRbMV0pO1xuICAgICAgICB2YXIgeCA9IHh5WzBdLCB5ID0geHlbMV07XG5cbiAgICAgICAgdmFyIHBvaW50ID0gc2VsZi5wb2ludHNba2V5XTtcbiAgICAgICAgaWYgKCFwb2ludCkge1xuICAgICAgICAgICAgcG9pbnQgPSBzZWxmLnBvaW50c1trZXldID0gbmV3IEV2ZW50RW1pdHRlcjtcbiAgICAgICAgICAgIHBvaW50LnggPSBwdFswXTtcbiAgICAgICAgICAgIHBvaW50LnkgPSBwdFsxXTtcbiAgICAgICAgICAgIHBvaW50LnR5cGUgPSAncG9pbnQnO1xuICAgICAgICAgICAgcG9pbnQuZWxlbWVudCA9IHNlbGYucGFwZXIuY2lyY2xlKHggLSA1LCB5IC0gNSwgMTApO1xuICAgICAgICAgICAgcG9pbnQuZWxlbWVudC5hdHRyKCdmaWxsJywgJ3RyYW5zcGFyZW50Jyk7XG4gICAgICAgICAgICBwb2ludC5lbGVtZW50LmF0dHIoJ3N0cm9rZScsICd0cmFuc3BhcmVudCcpO1xuICAgICAgICAgICAgcG9pbnQudGlsZXMgPSB7fTtcbiAgICAgICAgICAgIGNyZWF0ZWQucHVzaChwb2ludCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGQgPSBbICdzJywgJ2UnLCAnbicsICd3JyBdW2l4XTtcbiAgICAgICAgcG9pbnQudGlsZXNbZF0gPSB0aWxlO1xuXG4gICAgICAgIHJldHVybiBwb2ludDtcbiAgICB9KTtcbiAgICB0aWxlLnBvaW50cyA9IHsgbiA6IHB0c1swXSwgdyA6IHB0c1sxXSwgcyA6IHB0c1syXSwgZSA6IHB0c1szXSB9O1xuXG4gICAgY3JlYXRlZC5mb3JFYWNoKGZ1bmN0aW9uIChwdCkge1xuICAgICAgICBzZWxmLmVtaXQoJ2NyZWF0ZVBvaW50JywgcHQpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRpbGU7XG59O1xuXG5UaWxlTWFwLnByb3RvdHlwZS50aWxlQXQgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHJldHVybiB0aGlzLnRpbGVzW3ggKyAnLCcgKyB5XTtcbn07XG5cblRpbGVNYXAucHJvdG90eXBlLnBvaW50QXQgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHJldHVybiB0aGlzLnBvaW50c1t4ICsgJywnICsgeV07XG59O1xuXG5UaWxlTWFwLnByb3RvdHlwZS5jcmVhdGVJdGVtID0gZnVuY3Rpb24gKHNyYywgeCwgeSwgY2IpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIGltID0gbmV3IEltYWdlO1xuICAgIHZhciB3ID0gc2VsZi50b1dvcmxkKHgsIHkpO1xuXG4gICAgaW0uYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGl0ZW0gPSBuZXcgRXZlbnRFbWl0dGVyO1xuICAgICAgICBpdGVtLmVsZW1lbnQgPSBzZWxmLnBhcGVyLmltYWdlKFxuICAgICAgICAgICAgc3JjLFxuICAgICAgICAgICAgd1swXSAtIGltLndpZHRoIC8gMiwgd1sxXSAtIGltLmhlaWdodCArIDI1LFxuICAgICAgICAgICAgaW0ud2lkdGgsIGltLmhlaWdodFxuICAgICAgICApO1xuICAgICAgICBpdGVtLnggPSB4O1xuICAgICAgICBpdGVtLnkgPSB5O1xuXG4gICAgICAgIHZhciBwdCA9IHNlbGYudG9Xb3JsZCh4LCB5KTtcbiAgICAgICAgaXRlbS5zY3JlZW5YID0gcHRbMF07XG4gICAgICAgIGl0ZW0uc2NyZWVuWSA9IHB0WzFdO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5pdGVtU3RhY2subGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChwdFsxXSA8PSBzZWxmLml0ZW1TdGFja1tpXS5zY3JlZW5ZKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5pdGVtU3RhY2suc3BsaWNlKGksIDAsIGl0ZW0pO1xuICAgICAgICAgICAgICAgIHNlbGYuaXRlbVNldC5zcGxpY2UoaSwgMCwgaXRlbS5lbGVtZW50KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaSA9PT0gc2VsZi5pdGVtU3RhY2subGVuZ3RoKSB7XG4gICAgICAgICAgICBzZWxmLml0ZW1TdGFjay5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgc2VsZi5pdGVtU2V0LnB1c2goaXRlbS5lbGVtZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNlbGYuaXRlbVNldC50b0Zyb250KCk7XG4gICAgICAgIHNlbGYuaXRlbXNbeCArICcsJyArIHldID0gaXRlbTtcblxuICAgICAgICBpZiAodHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSBjYihudWxsLCBpdGVtKTtcbiAgICB9KTtcbiAgICBpbS5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGNiKTtcbiAgICBpbS5zcmMgPSBzcmM7XG59O1xuXG5UaWxlTWFwLnByb3RvdHlwZS5yZW1vdmVJdGVtID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICB2YXIgaXRlbSA9IHRoaXMuaXRlbUF0KHgsIHkpO1xuICAgIGlmIChpdGVtKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLml0ZW1zW3ggKyAnLCcgKyB5XTtcbiAgICAgICAgaXRlbS5lbGVtZW50LnJlbW92ZSgpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuaXRlbVN0YWNrLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoaXRlbSA9PT0gdGhpcy5pdGVtU3RhY2tbaV0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLml0ZW1TdGFjay5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtU2V0LnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLml0ZW1TZXQudG9Gcm9udCgpO1xuICAgIH1cbn07XG5cblRpbGVNYXAucHJvdG90eXBlLml0ZW1BdCA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgcmV0dXJuIHRoaXMuaXRlbXNbeCArICcsJyArIHldO1xufTtcblxuVGlsZU1hcC5wcm90b3R5cGUuY3JlYXRlV2FsbCA9IGZ1bmN0aW9uIChzcmMsIHB0MCwgcHQxLCBjYikge1xuICAgIGlmIChwdDAueSA9PT0gcHQxLnkpIHtcbiAgICAgICAgdmFyIHgwID0gTWF0aC5taW4ocHQwLngsIHB0MS54KTtcbiAgICAgICAgdmFyIHh0ID0gTWF0aC5tYXgocHQwLngsIHB0MS54KTtcbiAgICAgICAgZm9yICh2YXIgeCA9IHgwOyB4IDwgeHQ7IHgrKykge1xuICAgICAgICAgICAgdGhpcy5jcmVhdGVJdGVtKHNyYywgeCArIDAuNzUsIHB0MC55IC0gMC4yNSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAocHQwLnggPT09IHB0MS54KSB7XG4gICAgICAgIHZhciB5MCA9IE1hdGgubWluKHB0MC55LCBwdDEueSk7XG4gICAgICAgIHZhciB5dCA9IE1hdGgubWF4KHB0MC55LCBwdDEueSk7XG4gICAgICAgIGZvciAodmFyIHkgPSB5MDsgeSA8IHl0OyB5KyspIHtcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlSXRlbShzcmMsIHB0MC54ICsgMC4yNSwgeSArIDAuMjUpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuVGlsZU1hcC5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgdGhpcy5tb3ZlVG8odGhpcy5wb3NpdGlvblswXSArIHgsIHRoaXMucG9zaXRpb25bMV0gKyB5KTtcbn07XG5cblRpbGVNYXAucHJvdG90eXBlLm1vdmVUbyA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgdGhpcy5wb3NpdGlvbiA9IFsgeCwgeSBdO1xuICAgIHRoaXMuX3NldFZpZXcoKTtcbn07XG5cblRpbGVNYXAucHJvdG90eXBlLnBhbiA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgdmFyIHR4ID0geCAvIDIgKyB5IC8gMjtcbiAgICB2YXIgdHkgPSB4IC8gMiAtIHkgLyAyO1xuXG4gICAgdGhpcy5tb3ZlKFxuICAgICAgICB0eCAvIE1hdGgucG93KHRoaXMuem9vbUxldmVsLCAwLjUpLFxuICAgICAgICB0eSAvIE1hdGgucG93KHRoaXMuem9vbUxldmVsLCAwLjUpXG4gICAgKTtcbn07XG5cblRpbGVNYXAucHJvdG90eXBlLnpvb20gPSBmdW5jdGlvbiAobGV2ZWwpIHtcbiAgICB0aGlzLnpvb21MZXZlbCA9IGxldmVsO1xuICAgIHRoaXMuX3NldFZpZXcoKTtcbn07XG5cblRpbGVNYXAucHJvdG90eXBlLl9zZXRWaWV3ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3ID0gdGhpcy5zaXplWzBdIC8gdGhpcy56b29tTGV2ZWw7XG4gICAgdmFyIGggPSB0aGlzLnNpemVbMV0gLyB0aGlzLnpvb21MZXZlbDtcblxuICAgIHZhciBwdCA9IHRoaXMudG9Xb3JsZCh0aGlzLnBvc2l0aW9uWzBdLCB0aGlzLnBvc2l0aW9uWzFdKTtcbiAgICB2YXIgeCA9IHB0WzBdIC0gdyAvIDI7XG4gICAgdmFyIHkgPSBwdFsxXSAtIGggLyAyO1xuXG4gICAgdGhpcy5wYXBlci5zZXRWaWV3Qm94KHgsIHksIHcsIGgpO1xufTtcblxuVGlsZU1hcC5wcm90b3R5cGUudG9Xb3JsZCA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgdmFyIHR4ID0geCAvIDIgKyB5IC8gMjtcbiAgICB2YXIgdHkgPSAteCAvIDIgKyB5IC8gMjtcbiAgICByZXR1cm4gWyB0eCAqIDEwMCwgdHkgKiA1MCBdO1xufTtcblxuVGlsZU1hcC5wcm90b3R5cGUuZnJvbVdvcmxkID0gZnVuY3Rpb24gKHR4LCB0eSkge1xuICAgIHZhciB4ID0gdHggLyAxMDA7XG4gICAgdmFyIHkgPSB0eSAvIDUwO1xuICAgIHJldHVybiBbIHggLSB5LCB4ICsgeSBdO1xufTtcblxuZnVuY3Rpb24gcG9seWdvbiAocG9pbnRzKSB7XG4gICAgdmFyIHhzID0gcG9pbnRzLm1hcChmdW5jdGlvbiAocCkgeyByZXR1cm4gcC5qb2luKCcsJykgfSk7XG4gICAgcmV0dXJuICdNJyArIHhzWzBdICsgJyBMJyArIHhzLnNsaWNlKDEpLmpvaW4oJyAnKSArICcgWic7XG59XG5cblRpbGVNYXAucHJvdG90eXBlLmFwcGVuZFRvID0gZnVuY3Rpb24gKHRhcmdldCkge1xuICAgIHRhcmdldC5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnQpO1xufTtcblxuLy8gVGlsZU1hcC5wcm90b3R5cGUudGllID0gZnVuY3Rpb24gKHdpbikge1xuLy8gICAgIHZhciBzZWxmID0gdGhpcztcbi8vICAgICBzZWxmLnRpZWQucHVzaCh3aW4pO1xuXG4vLyAgICAgdmFyIG9uID0gdHlwZW9mIHdpbi5hZGRFdmVudExpc3RlbmVyID09PSAnZnVuY3Rpb24nXG4vLyAgICAgICAgID8gd2luLmFkZEV2ZW50TGlzdGVuZXJcbi8vICAgICAgICAgOiB3aW4ub25cbi8vICAgICA7XG4vLyAgICAgb24uY2FsbCh3aW4sICdrZXlkb3duJywgZnVuY3Rpb24gKGV2KSB7XG4vLyAgICAgICAgIHZhciBlID0gT2JqZWN0LmtleXMoZXYpLnJlZHVjZShmdW5jdGlvbiAoYWNjLCBrZXkpIHtcbi8vICAgICAgICAgICAgIGFjY1trZXldID0gZXZba2V5XTtcbi8vICAgICAgICAgICAgIHJldHVybiBhY2M7XG4vLyAgICAgICAgIH0sIHt9KTtcbi8vICAgICAgICAgdmFyIHByZXZlbnRlZCA9IGZhbHNlO1xuLy8gICAgICAgICBlLnByZXZlbnREZWZhdWx0ID0gZnVuY3Rpb24gKCkge1xuLy8gICAgICAgICAgICAgcHJldmVudGVkID0gdHJ1ZTtcbi8vICAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG4vLyAgICAgICAgIH07XG4vLyAgICAgICAgIHNlbGYuZW1pdCgna2V5ZG93bicsIGUpO1xuLy8gICAgICAgICBpZiAocHJldmVudGVkKSByZXR1cm47XG5cbi8vICAgICAgICAgdmFyIGtleSA9IGV2LmtleUlkZW50aWZpZXIudG9Mb3dlckNhc2UoKTtcbi8vICAgICAgICAgdmFyIGR6ID0ge1xuLy8gICAgICAgICAgICAgMTg3IDogMSAvIDAuOSxcbi8vICAgICAgICAgICAgIDE4OSA6IDAuOSxcbi8vICAgICAgICAgfVtldi5rZXlDb2RlXTtcbi8vICAgICAgICAgaWYgKGR6KSByZXR1cm4gc2VsZi56b29tKHNlbGYuem9vbUxldmVsICogZHopO1xuLy8gICAgICAgICBpZiAoZXYua2V5Q29kZSA9PT0gNDkpIHJldHVybiBzZWxmLnpvb20oMSk7XG5cbi8vICAgICAgICAgdmFyIGR4eSA9IHtcbi8vICAgICAgICAgICAgIGRvd24gOiBbIDAsIC0xIF0sXG4vLyAgICAgICAgICAgICB1cCA6IFsgMCwgKzEgXSxcbi8vICAgICAgICAgICAgIGxlZnQgOiBbIC0xLCAwIF0sXG4vLyAgICAgICAgICAgICByaWdodCA6IFsgKzEsIDAgXVxuLy8gICAgICAgICB9W2tleV07XG5cbi8vICAgICAgICAgaWYgKGR4eSkge1xuLy8gICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbi8vICAgICAgICAgICAgIHNlbGYucGFuKGR4eVswXSwgZHh5WzFdKTtcbi8vICAgICAgICAgfVxuLy8gICAgIH0pO1xuXG4vLyAgICAgKGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICAgdmFyIHNlbGVjdGVkID0ge307XG4vLyAgICAgICAgIHNlbGYuc2VsZWN0ZWQucHVzaChzZWxlY3RlZCk7XG5cbi8vICAgICAgICAgb24uY2FsbCh3aW4sICdtb3VzZW1vdmUnLCBmdW5jdGlvbiAoZXYpIHtcbi8vICAgICAgICAgICAgIHZhciB4eSA9IHNlbGYuZnJvbVdvcmxkKFxuLy8gICAgICAgICAgICAgICAgIChldi5jbGllbnRYIC0gc2VsZi5zaXplWzBdIC8gMikgLyBzZWxmLnpvb21MZXZlbCxcbi8vICAgICAgICAgICAgICAgICAoZXYuY2xpZW50WSAtIHNlbGYuc2l6ZVsxXSAvIDIpIC8gc2VsZi56b29tTGV2ZWxcbi8vICAgICAgICAgICAgICk7XG5cbi8vICAgICAgICAgICAgIHZhciB0eCA9IE1hdGgucm91bmQoeHlbMF0gKyBzZWxmLnBvc2l0aW9uWzBdKTtcbi8vICAgICAgICAgICAgIHZhciB0eSA9IE1hdGgucm91bmQoeHlbMV0gKyBzZWxmLnBvc2l0aW9uWzFdKTtcbi8vICAgICAgICAgICAgIHZhciB0aWxlID0gc2VsZi50aWxlQXQodHgsIHR5KTtcblxuLy8gICAgICAgICAgICAgaWYgKHRpbGUgJiYgdGlsZSAhPT0gc2VsZWN0ZWQudGlsZSkge1xuLy8gICAgICAgICAgICAgICAgIGlmIChzZWxlY3RlZC50aWxlKSB7XG4vLyAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkLnRpbGUuZW1pdCgnbW91c2VvdXQnLCBldik7XG4vLyAgICAgICAgICAgICAgICAgICAgIHNlbGYuZW1pdCgnbW91c2VvdXQnLCBzZWxlY3RlZC50aWxlLCBldik7XG4vLyAgICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgICAgIHNlbGVjdGVkLnRpbGUgPSB0aWxlO1xuLy8gICAgICAgICAgICAgICAgIHRpbGUuZW1pdCgnbW91c2VvdmVyJywgZXYpO1xuLy8gICAgICAgICAgICAgICAgIHNlbGYuZW1pdCgnbW91c2VvdmVyJywgdGlsZSwgZXYpO1xuLy8gICAgICAgICAgICAgfVxuXG4vLyAgICAgICAgICAgICB2YXIgcHggPSBNYXRoLmZsb29yKHh5WzBdICsgc2VsZi5wb3NpdGlvblswXSkgKyAwLjU7XG4vLyAgICAgICAgICAgICB2YXIgcHkgPSBNYXRoLmZsb29yKHh5WzFdICsgc2VsZi5wb3NpdGlvblsxXSkgKyAwLjU7XG4vLyAgICAgICAgICAgICB2YXIgcHQgPSBzZWxmLnBvaW50QXQocHgsIHB5KTtcblxuLy8gICAgICAgICAgICAgaWYgKHB0ICYmIHB0ICE9PSBzZWxlY3RlZC5wb2ludCkge1xuLy8gICAgICAgICAgICAgICAgIGlmIChzZWxlY3RlZC5wb2ludCkge1xuLy8gICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZC5wb2ludC5lbWl0KCdtb3VzZW91dCcsIGV2KTtcbi8vICAgICAgICAgICAgICAgICAgICAgc2VsZi5lbWl0KCdtb3VzZW91dCcsIHNlbGVjdGVkLnBvaW50LCBldik7XG4vLyAgICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgICAgIHNlbGVjdGVkLnBvaW50ID0gcHQ7XG4vLyAgICAgICAgICAgICAgICAgcHQuZW1pdCgnbW91c2VvdmVyJywgZXYpO1xuLy8gICAgICAgICAgICAgICAgIHNlbGYuZW1pdCgnbW91c2VvdXQnLCBwdCwgZXYpO1xuLy8gICAgICAgICAgICAgfVxuLy8gICAgICAgICB9KTtcblxuLy8gICAgICAgICBbICdjbGljaycsICdtb3VzZWRvd24nLCAnbW91c2V1cCcgXS5mb3JFYWNoKGZ1bmN0aW9uIChldk5hbWUpIHtcbi8vICAgICAgICAgICAgIG9uLmNhbGwod2luLCBldk5hbWUsIGZ1bmN0aW9uIChldikge1xuLy8gICAgICAgICAgICAgICAgIGlmIChzZWxlY3RlZC50aWxlKSB7XG4vLyAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkLnRpbGUuZW1pdChldk5hbWUsIGV2KTtcbi8vICAgICAgICAgICAgICAgICAgICAgc2VsZi5lbWl0KGV2TmFtZSwgc2VsZWN0ZWQudGlsZSwgZXYpO1xuLy8gICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgICAgICBpZiAoc2VsZWN0ZWQucG9pbnQpIHtcbi8vICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQucG9pbnQuZW1pdChldk5hbWUsIGV2KTtcbi8vICAgICAgICAgICAgICAgICAgICAgc2VsZi5lbWl0KGV2TmFtZSwgc2VsZWN0ZWQucG9pbnQsIGV2KTtcbi8vICAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICB9KTtcbi8vICAgICAgICAgfSk7XG4vLyAgICAgfSkoKTtcbi8vIH07XG5cblRpbGVNYXAucHJvdG90eXBlLnJlbGVhc2UgPSBmdW5jdGlvbiAobW9kZSkge1xuICAgIHRoaXMuc2VsZWN0ZWQuZm9yRWFjaChmdW5jdGlvbiAocykge1xuICAgICAgICBpZiAoc1ttb2RlXSkgc1ttb2RlXS5lbWl0KCdtb3VzZW91dCcpO1xuICAgIH0pO1xufTtcbiIsIi8vIEJyb3dzZXJpZnkgbW9kaWZpY2F0aW9ucyBieSBCcmVudG9uIFBhcnRyaWRnZSwgcmVsZWFzZWQgaW50byB0aGUgcHVibGljIGRvbWFpblxuXG4vLyBCRUdJTiBCUk9XU0VSSUZZIE1PRFxudmFyIGV2ZSwgUmFwaGFlbCA9ICdmb28nO1xuLy8gRU5EIEJST1dTRVJJRlkgTU9EXG5cbi8vIOKUjOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUkCBcXFxcXG4vLyDilIIgUmFwaGHDq2wgMi4xLjAgLSBKYXZhU2NyaXB0IFZlY3RvciBMaWJyYXJ5ICAgICAgICAgICAgICAgICAgICAgICAgICDilIIgXFxcXFxuLy8g4pSc4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSkIFxcXFxcbi8vIOKUgiBDb3B5cmlnaHQgwqkgMjAwOC0yMDEyIERtaXRyeSBCYXJhbm92c2tpeSAoaHR0cDovL3JhcGhhZWxqcy5jb20pICAgIOKUgiBcXFxcXG4vLyDilIIgQ29weXJpZ2h0IMKpIDIwMDgtMjAxMiBTZW5jaGEgTGFicyAoaHR0cDovL3NlbmNoYS5jb20pICAgICAgICAgICAgICDilIIgXFxcXFxuLy8g4pSc4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSkIFxcXFxcbi8vIOKUgiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIChodHRwOi8vcmFwaGFlbGpzLmNvbS9saWNlbnNlLmh0bWwpIGxpY2Vuc2Uu4pSCIFxcXFxcbi8vIOKUlOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUmCBcXFxcXG5cbi8vIOKUjOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUkCBcXFxcXG4vLyDilIIgRXZlIDAuMy40IC0gSmF2YVNjcmlwdCBFdmVudHMgTGlicmFyeSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOKUgiBcXFxcXG4vLyDilJzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilKQgXFxcXFxuLy8g4pSCIENvcHlyaWdodCAoYykgMjAwOC0yMDExIERtaXRyeSBCYXJhbm92c2tpeSAoaHR0cDovL2RtaXRyeS5iYXJhbm92c2tpeS5jb20vKSAgICAgICAgICDilIIgXFxcXFxuLy8g4pSCIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgKGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwKSBsaWNlbnNlLiDilIIgXFxcXFxuLy8g4pSU4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSYIFxcXFxcblxuKGZ1bmN0aW9uIChnbG9iKSB7XG4gICAgdmFyIHZlcnNpb24gPSBcIjAuMy40XCIsXG4gICAgICAgIGhhcyA9IFwiaGFzT3duUHJvcGVydHlcIixcbiAgICAgICAgc2VwYXJhdG9yID0gL1tcXC5cXC9dLyxcbiAgICAgICAgd2lsZGNhcmQgPSBcIipcIixcbiAgICAgICAgZnVuID0gZnVuY3Rpb24gKCkge30sXG4gICAgICAgIG51bXNvcnQgPSBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuIGEgLSBiO1xuICAgICAgICB9LFxuICAgICAgICBjdXJyZW50X2V2ZW50LFxuICAgICAgICBzdG9wLFxuICAgICAgICBldmVudHMgPSB7bjoge319O1xuICAgIFxuICAgIC8vIEJST1dTRVJJRlkgTU9EOiBtYWtlIGV2ZSBhIHRvcC1sZXZlbC1zY29wZSB2YXJpYWJsZSBpbnN0ZWFkIG9mIGZ1bmN0aW9uLXNjb3BlLlxuICAgIGV2ZSA9IGZ1bmN0aW9uIChuYW1lLCBzY29wZSkge1xuICAgICAgICAgICAgdmFyIGUgPSBldmVudHMsXG4gICAgICAgICAgICAgICAgb2xkc3RvcCA9IHN0b3AsXG4gICAgICAgICAgICAgICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMiksXG4gICAgICAgICAgICAgICAgbGlzdGVuZXJzID0gZXZlLmxpc3RlbmVycyhuYW1lKSxcbiAgICAgICAgICAgICAgICB6ID0gMCxcbiAgICAgICAgICAgICAgICBmID0gZmFsc2UsXG4gICAgICAgICAgICAgICAgbCxcbiAgICAgICAgICAgICAgICBpbmRleGVkID0gW10sXG4gICAgICAgICAgICAgICAgcXVldWUgPSB7fSxcbiAgICAgICAgICAgICAgICBvdXQgPSBbXSxcbiAgICAgICAgICAgICAgICBjZSA9IGN1cnJlbnRfZXZlbnQsXG4gICAgICAgICAgICAgICAgZXJyb3JzID0gW107XG4gICAgICAgICAgICBjdXJyZW50X2V2ZW50ID0gbmFtZTtcbiAgICAgICAgICAgIHN0b3AgPSAwO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gbGlzdGVuZXJzLmxlbmd0aDsgaSA8IGlpOyBpKyspIGlmIChcInpJbmRleFwiIGluIGxpc3RlbmVyc1tpXSkge1xuICAgICAgICAgICAgICAgIGluZGV4ZWQucHVzaChsaXN0ZW5lcnNbaV0uekluZGV4KTtcbiAgICAgICAgICAgICAgICBpZiAobGlzdGVuZXJzW2ldLnpJbmRleCA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgcXVldWVbbGlzdGVuZXJzW2ldLnpJbmRleF0gPSBsaXN0ZW5lcnNbaV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaW5kZXhlZC5zb3J0KG51bXNvcnQpO1xuICAgICAgICAgICAgd2hpbGUgKGluZGV4ZWRbel0gPCAwKSB7XG4gICAgICAgICAgICAgICAgbCA9IHF1ZXVlW2luZGV4ZWRbeisrXV07XG4gICAgICAgICAgICAgICAgb3V0LnB1c2gobC5hcHBseShzY29wZSwgYXJncykpO1xuICAgICAgICAgICAgICAgIGlmIChzdG9wKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b3AgPSBvbGRzdG9wO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3V0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoaSA9IDA7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbCA9IGxpc3RlbmVyc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAoXCJ6SW5kZXhcIiBpbiBsKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsLnpJbmRleCA9PSBpbmRleGVkW3pdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQucHVzaChsLmFwcGx5KHNjb3BlLCBhcmdzKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgZG8ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHorKztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsID0gcXVldWVbaW5kZXhlZFt6XV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbCAmJiBvdXQucHVzaChsLmFwcGx5KHNjb3BlLCBhcmdzKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0b3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSB3aGlsZSAobClcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHF1ZXVlW2wuekluZGV4XSA9IGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXQucHVzaChsLmFwcGx5KHNjb3BlLCBhcmdzKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChzdG9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN0b3AgPSBvbGRzdG9wO1xuICAgICAgICAgICAgY3VycmVudF9ldmVudCA9IGNlO1xuICAgICAgICAgICAgcmV0dXJuIG91dC5sZW5ndGggPyBvdXQgOiBudWxsO1xuICAgICAgICB9O1xuICAgIFxuICAgIGV2ZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgICAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KHNlcGFyYXRvciksXG4gICAgICAgICAgICBlID0gZXZlbnRzLFxuICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgICAgIGl0ZW1zLFxuICAgICAgICAgICAgayxcbiAgICAgICAgICAgIGksXG4gICAgICAgICAgICBpaSxcbiAgICAgICAgICAgIGosXG4gICAgICAgICAgICBqaixcbiAgICAgICAgICAgIG5lcyxcbiAgICAgICAgICAgIGVzID0gW2VdLFxuICAgICAgICAgICAgb3V0ID0gW107XG4gICAgICAgIGZvciAoaSA9IDAsIGlpID0gbmFtZXMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgbmVzID0gW107XG4gICAgICAgICAgICBmb3IgKGogPSAwLCBqaiA9IGVzLmxlbmd0aDsgaiA8IGpqOyBqKyspIHtcbiAgICAgICAgICAgICAgICBlID0gZXNbal0ubjtcbiAgICAgICAgICAgICAgICBpdGVtcyA9IFtlW25hbWVzW2ldXSwgZVt3aWxkY2FyZF1dO1xuICAgICAgICAgICAgICAgIGsgPSAyO1xuICAgICAgICAgICAgICAgIHdoaWxlIChrLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgaXRlbSA9IGl0ZW1zW2tdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmVzLnB1c2goaXRlbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXQgPSBvdXQuY29uY2F0KGl0ZW0uZiB8fCBbXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlcyA9IG5lcztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG4gICAgXG4gICAgXG4gICAgZXZlLm9uID0gZnVuY3Rpb24gKG5hbWUsIGYpIHtcbiAgICAgICAgdmFyIG5hbWVzID0gbmFtZS5zcGxpdChzZXBhcmF0b3IpLFxuICAgICAgICAgICAgZSA9IGV2ZW50cztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gbmFtZXMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgZSA9IGUubjtcbiAgICAgICAgICAgICFlW25hbWVzW2ldXSAmJiAoZVtuYW1lc1tpXV0gPSB7bjoge319KTtcbiAgICAgICAgICAgIGUgPSBlW25hbWVzW2ldXTtcbiAgICAgICAgfVxuICAgICAgICBlLmYgPSBlLmYgfHwgW107XG4gICAgICAgIGZvciAoaSA9IDAsIGlpID0gZS5mLmxlbmd0aDsgaSA8IGlpOyBpKyspIGlmIChlLmZbaV0gPT0gZikge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bjtcbiAgICAgICAgfVxuICAgICAgICBlLmYucHVzaChmKTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh6SW5kZXgpIHtcbiAgICAgICAgICAgIGlmICgrekluZGV4ID09ICt6SW5kZXgpIHtcbiAgICAgICAgICAgICAgICBmLnpJbmRleCA9ICt6SW5kZXg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfTtcbiAgICBcbiAgICBldmUuc3RvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc3RvcCA9IDE7XG4gICAgfTtcbiAgICBcbiAgICBldmUubnQgPSBmdW5jdGlvbiAoc3VibmFtZSkge1xuICAgICAgICBpZiAoc3VibmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBSZWdFeHAoXCIoPzpcXFxcLnxcXFxcL3xeKVwiICsgc3VibmFtZSArIFwiKD86XFxcXC58XFxcXC98JClcIikudGVzdChjdXJyZW50X2V2ZW50KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY3VycmVudF9ldmVudDtcbiAgICB9O1xuICAgIFxuICAgIFxuICAgIGV2ZS5vZmYgPSBldmUudW5iaW5kID0gZnVuY3Rpb24gKG5hbWUsIGYpIHtcbiAgICAgICAgdmFyIG5hbWVzID0gbmFtZS5zcGxpdChzZXBhcmF0b3IpLFxuICAgICAgICAgICAgZSxcbiAgICAgICAgICAgIGtleSxcbiAgICAgICAgICAgIHNwbGljZSxcbiAgICAgICAgICAgIGksIGlpLCBqLCBqaixcbiAgICAgICAgICAgIGN1ciA9IFtldmVudHNdO1xuICAgICAgICBmb3IgKGkgPSAwLCBpaSA9IG5hbWVzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBjdXIubGVuZ3RoOyBqICs9IHNwbGljZS5sZW5ndGggLSAyKSB7XG4gICAgICAgICAgICAgICAgc3BsaWNlID0gW2osIDFdO1xuICAgICAgICAgICAgICAgIGUgPSBjdXJbal0ubjtcbiAgICAgICAgICAgICAgICBpZiAobmFtZXNbaV0gIT0gd2lsZGNhcmQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVbbmFtZXNbaV1dKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzcGxpY2UucHVzaChlW25hbWVzW2ldXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGtleSBpbiBlKSBpZiAoZVtoYXNdKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwbGljZS5wdXNoKGVba2V5XSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3VyLnNwbGljZS5hcHBseShjdXIsIHNwbGljZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMCwgaWkgPSBjdXIubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgZSA9IGN1cltpXTtcbiAgICAgICAgICAgIHdoaWxlIChlLm4pIHtcbiAgICAgICAgICAgICAgICBpZiAoZikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZS5mKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAwLCBqaiA9IGUuZi5sZW5ndGg7IGogPCBqajsgaisrKSBpZiAoZS5mW2pdID09IGYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLmYuc3BsaWNlKGosIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgIWUuZi5sZW5ndGggJiYgZGVsZXRlIGUuZjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmb3IgKGtleSBpbiBlLm4pIGlmIChlLm5baGFzXShrZXkpICYmIGUubltrZXldLmYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmdW5jcyA9IGUubltrZXldLmY7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAwLCBqaiA9IGZ1bmNzLmxlbmd0aDsgaiA8IGpqOyBqKyspIGlmIChmdW5jc1tqXSA9PSBmKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Muc3BsaWNlKGosIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgIWZ1bmNzLmxlbmd0aCAmJiBkZWxldGUgZS5uW2tleV0uZjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBlLmY7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoa2V5IGluIGUubikgaWYgKGUubltoYXNdKGtleSkgJiYgZS5uW2tleV0uZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGUubltrZXldLmY7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZSA9IGUubjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgZXZlLm9uY2UgPSBmdW5jdGlvbiAobmFtZSwgZikge1xuICAgICAgICB2YXIgZjIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcmVzID0gZi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgZXZlLnVuYmluZChuYW1lLCBmMik7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZXZlLm9uKG5hbWUsIGYyKTtcbiAgICB9O1xuICAgIFxuICAgIGV2ZS52ZXJzaW9uID0gdmVyc2lvbjtcbiAgICBldmUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBcIllvdSBhcmUgcnVubmluZyBFdmUgXCIgKyB2ZXJzaW9uO1xuICAgIH07XG4gICAgLy8gQlJPV1NFUklGWSBNT0Q6IGRvIG5vdCBzZXQgbW9kdWxlLmV4cG9ydHMgPSBldmVcbn0pKHRoaXMpO1xuXG5cbi8vIOKUjOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUkCBcXFxcXG4vLyDilIIgXCJSYXBoYcOrbCAyLjEuMFwiIC0gSmF2YVNjcmlwdCBWZWN0b3IgTGlicmFyeSAgICAgICAgICAgICAgICAgICAgICAgICDilIIgXFxcXFxuLy8g4pSc4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSkIFxcXFxcbi8vIOKUgiBDb3B5cmlnaHQgKGMpIDIwMDgtMjAxMSBEbWl0cnkgQmFyYW5vdnNraXkgKGh0dHA6Ly9yYXBoYWVsanMuY29tKSAgIOKUgiBcXFxcXG4vLyDilIIgQ29weXJpZ2h0IChjKSAyMDA4LTIwMTEgU2VuY2hhIExhYnMgKGh0dHA6Ly9zZW5jaGEuY29tKSAgICAgICAgICAgICDilIIgXFxcXFxuLy8g4pSCIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgKGh0dHA6Ly9yYXBoYWVsanMuY29tL2xpY2Vuc2UuaHRtbCkgbGljZW5zZS4g4pSCIFxcXFxcbi8vIOKUlOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUmCBcXFxcXG4oZnVuY3Rpb24gKCkge1xuICAgIFxuICAgIGZ1bmN0aW9uIFIoZmlyc3QpIHtcbiAgICAgICAgaWYgKFIuaXMoZmlyc3QsIFwiZnVuY3Rpb25cIikpIHtcbiAgICAgICAgICAgIHJldHVybiBsb2FkZWQgPyBmaXJzdCgpIDogZXZlLm9uKFwicmFwaGFlbC5ET01sb2FkXCIsIGZpcnN0KTtcbiAgICAgICAgfSBlbHNlIGlmIChSLmlzKGZpcnN0LCBhcnJheSkpIHtcbiAgICAgICAgICAgIHJldHVybiBSLl9lbmdpbmUuY3JlYXRlW2FwcGx5XShSLCBmaXJzdC5zcGxpY2UoMCwgMyArIFIuaXMoZmlyc3RbMF0sIG51KSkpLmFkZChmaXJzdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgICAgICAgICBpZiAoUi5pcyhhcmdzW2FyZ3MubGVuZ3RoIC0gMV0sIFwiZnVuY3Rpb25cIikpIHtcbiAgICAgICAgICAgICAgICB2YXIgZiA9IGFyZ3MucG9wKCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGxvYWRlZCA/IGYuY2FsbChSLl9lbmdpbmUuY3JlYXRlW2FwcGx5XShSLCBhcmdzKSkgOiBldmUub24oXCJyYXBoYWVsLkRPTWxvYWRcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBmLmNhbGwoUi5fZW5naW5lLmNyZWF0ZVthcHBseV0oUiwgYXJncykpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gUi5fZW5naW5lLmNyZWF0ZVthcHBseV0oUiwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICBSLnZlcnNpb24gPSBcIjIuMS4wXCI7XG4gICAgUi5ldmUgPSBldmU7XG4gICAgdmFyIGxvYWRlZCxcbiAgICAgICAgc2VwYXJhdG9yID0gL1ssIF0rLyxcbiAgICAgICAgZWxlbWVudHMgPSB7Y2lyY2xlOiAxLCByZWN0OiAxLCBwYXRoOiAxLCBlbGxpcHNlOiAxLCB0ZXh0OiAxLCBpbWFnZTogMX0sXG4gICAgICAgIGZvcm1hdHJnID0gL1xceyhcXGQrKVxcfS9nLFxuICAgICAgICBwcm90byA9IFwicHJvdG90eXBlXCIsXG4gICAgICAgIGhhcyA9IFwiaGFzT3duUHJvcGVydHlcIixcbiAgICAgICAgZyA9IChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBfZyA9IHt9O1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgX2cud2luID0gd2luZG93O1xuICAgICAgICAgICAgICAgIF9nLmRvYyA9IGRvY3VtZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIHJlcXVpcmUgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgLy8gS2VlcCBicm93c2VyaWZ5IGZyb20gaW5jbHVkaW5nIGpzZG9tLlxuICAgICAgICAgICAgICAgIGV2YWwoXCJfZy5kb2MgPSByZXF1aXJlKCdqc2RvbScpLmpzZG9tKClcIik7XG4gICAgICAgICAgICAgICAgX2cud2luID0gX2cuZG9jLmNyZWF0ZVdpbmRvdygpO1xuICAgICAgICAgICAgICAgIF9nLndpbi5kb2N1bWVudCA9IF9nLmRvYztcbiAgICAgICAgICAgICAgICBfZy5kb2MuaW1wbGVtZW50YXRpb24uYWRkRmVhdHVyZShcbiAgICAgICAgICAgIFwiaHR0cDovL3d3dy53My5vcmcvVFIvU1ZHMTEvZmVhdHVyZSNCYXNpY1N0cnVjdHVyZVwiLCBcIjEuMVwiKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIF9nO1xuICAgICAgICB9KSgpLFxuICAgICAgICBvbGRSYXBoYWVsID0ge1xuICAgICAgICAgICAgd2FzOiBPYmplY3QucHJvdG90eXBlW2hhc10uY2FsbChnLndpbiwgXCJSYXBoYWVsXCIpLFxuICAgICAgICAgICAgaXM6IGcud2luLlJhcGhhZWxcbiAgICAgICAgfSxcbiAgICAgICAgUGFwZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGhpcy5jYSA9IHRoaXMuY3VzdG9tQXR0cmlidXRlcyA9IHt9O1xuICAgICAgICB9LFxuICAgICAgICBwYXBlcnByb3RvLFxuICAgICAgICBhcHBlbmRDaGlsZCA9IFwiYXBwZW5kQ2hpbGRcIixcbiAgICAgICAgYXBwbHkgPSBcImFwcGx5XCIsXG4gICAgICAgIGNvbmNhdCA9IFwiY29uY2F0XCIsXG4gICAgICAgIHN1cHBvcnRzVG91Y2ggPSBcImNyZWF0ZVRvdWNoXCIgaW4gZy5kb2MsXG4gICAgICAgIEUgPSBcIlwiLFxuICAgICAgICBTID0gXCIgXCIsXG4gICAgICAgIFN0ciA9IFN0cmluZyxcbiAgICAgICAgc3BsaXQgPSBcInNwbGl0XCIsXG4gICAgICAgIGV2ZW50cyA9IFwiY2xpY2sgZGJsY2xpY2sgbW91c2Vkb3duIG1vdXNlbW92ZSBtb3VzZW91dCBtb3VzZW92ZXIgbW91c2V1cCB0b3VjaHN0YXJ0IHRvdWNobW92ZSB0b3VjaGVuZCB0b3VjaGNhbmNlbFwiW3NwbGl0XShTKSxcbiAgICAgICAgdG91Y2hNYXAgPSB7XG4gICAgICAgICAgICBtb3VzZWRvd246IFwidG91Y2hzdGFydFwiLFxuICAgICAgICAgICAgbW91c2Vtb3ZlOiBcInRvdWNobW92ZVwiLFxuICAgICAgICAgICAgbW91c2V1cDogXCJ0b3VjaGVuZFwiXG4gICAgICAgIH0sXG4gICAgICAgIGxvd2VyQ2FzZSA9IFN0ci5wcm90b3R5cGUudG9Mb3dlckNhc2UsXG4gICAgICAgIG1hdGggPSBNYXRoLFxuICAgICAgICBtbWF4ID0gbWF0aC5tYXgsXG4gICAgICAgIG1taW4gPSBtYXRoLm1pbixcbiAgICAgICAgYWJzID0gbWF0aC5hYnMsXG4gICAgICAgIHBvdyA9IG1hdGgucG93LFxuICAgICAgICBQSSA9IG1hdGguUEksXG4gICAgICAgIG51ID0gXCJudW1iZXJcIixcbiAgICAgICAgc3RyaW5nID0gXCJzdHJpbmdcIixcbiAgICAgICAgYXJyYXkgPSBcImFycmF5XCIsXG4gICAgICAgIHRvU3RyaW5nID0gXCJ0b1N0cmluZ1wiLFxuICAgICAgICBmaWxsU3RyaW5nID0gXCJmaWxsXCIsXG4gICAgICAgIG9iamVjdFRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyxcbiAgICAgICAgcGFwZXIgPSB7fSxcbiAgICAgICAgcHVzaCA9IFwicHVzaFwiLFxuICAgICAgICBJU1VSTCA9IFIuX0lTVVJMID0gL151cmxcXChbJ1wiXT8oW15cXCldKz8pWydcIl0/XFwpJC9pLFxuICAgICAgICBjb2xvdXJSZWdFeHAgPSAvXlxccyooKCNbYS1mXFxkXXs2fSl8KCNbYS1mXFxkXXszfSl8cmdiYT9cXChcXHMqKFtcXGRcXC5dKyU/XFxzKixcXHMqW1xcZFxcLl0rJT9cXHMqLFxccypbXFxkXFwuXSslPyg/OlxccyosXFxzKltcXGRcXC5dKyU/KT8pXFxzKlxcKXxoc2JhP1xcKFxccyooW1xcZFxcLl0rKD86ZGVnfFxceGIwfCUpP1xccyosXFxzKltcXGRcXC5dKyU/XFxzKixcXHMqW1xcZFxcLl0rKD86JT9cXHMqLFxccypbXFxkXFwuXSspPyklP1xccypcXCl8aHNsYT9cXChcXHMqKFtcXGRcXC5dKyg/OmRlZ3xcXHhiMHwlKT9cXHMqLFxccypbXFxkXFwuXSslP1xccyosXFxzKltcXGRcXC5dKyg/OiU/XFxzKixcXHMqW1xcZFxcLl0rKT8pJT9cXHMqXFwpKVxccyokL2ksXG4gICAgICAgIGlzbmFuID0ge1wiTmFOXCI6IDEsIFwiSW5maW5pdHlcIjogMSwgXCItSW5maW5pdHlcIjogMX0sXG4gICAgICAgIGJlemllcnJnID0gL14oPzpjdWJpYy0pP2JlemllclxcKChbXixdKyksKFteLF0rKSwoW14sXSspLChbXlxcKV0rKVxcKS8sXG4gICAgICAgIHJvdW5kID0gbWF0aC5yb3VuZCxcbiAgICAgICAgc2V0QXR0cmlidXRlID0gXCJzZXRBdHRyaWJ1dGVcIixcbiAgICAgICAgdG9GbG9hdCA9IHBhcnNlRmxvYXQsXG4gICAgICAgIHRvSW50ID0gcGFyc2VJbnQsXG4gICAgICAgIHVwcGVyQ2FzZSA9IFN0ci5wcm90b3R5cGUudG9VcHBlckNhc2UsXG4gICAgICAgIGF2YWlsYWJsZUF0dHJzID0gUi5fYXZhaWxhYmxlQXR0cnMgPSB7XG4gICAgICAgICAgICBcImFycm93LWVuZFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIFwiYXJyb3ctc3RhcnRcIjogXCJub25lXCIsXG4gICAgICAgICAgICBibHVyOiAwLFxuICAgICAgICAgICAgXCJjbGlwLXJlY3RcIjogXCIwIDAgMWU5IDFlOVwiLFxuICAgICAgICAgICAgY3Vyc29yOiBcImRlZmF1bHRcIixcbiAgICAgICAgICAgIGN4OiAwLFxuICAgICAgICAgICAgY3k6IDAsXG4gICAgICAgICAgICBmaWxsOiBcIiNmZmZcIixcbiAgICAgICAgICAgIFwiZmlsbC1vcGFjaXR5XCI6IDEsXG4gICAgICAgICAgICBmb250OiAnMTBweCBcIkFyaWFsXCInLFxuICAgICAgICAgICAgXCJmb250LWZhbWlseVwiOiAnXCJBcmlhbFwiJyxcbiAgICAgICAgICAgIFwiZm9udC1zaXplXCI6IFwiMTBcIixcbiAgICAgICAgICAgIFwiZm9udC1zdHlsZVwiOiBcIm5vcm1hbFwiLFxuICAgICAgICAgICAgXCJmb250LXdlaWdodFwiOiA0MDAsXG4gICAgICAgICAgICBncmFkaWVudDogMCxcbiAgICAgICAgICAgIGhlaWdodDogMCxcbiAgICAgICAgICAgIGhyZWY6IFwiaHR0cDovL3JhcGhhZWxqcy5jb20vXCIsXG4gICAgICAgICAgICBcImxldHRlci1zcGFjaW5nXCI6IDAsXG4gICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgcGF0aDogXCJNMCwwXCIsXG4gICAgICAgICAgICByOiAwLFxuICAgICAgICAgICAgcng6IDAsXG4gICAgICAgICAgICByeTogMCxcbiAgICAgICAgICAgIHNyYzogXCJcIixcbiAgICAgICAgICAgIHN0cm9rZTogXCIjMDAwXCIsXG4gICAgICAgICAgICBcInN0cm9rZS1kYXNoYXJyYXlcIjogXCJcIixcbiAgICAgICAgICAgIFwic3Ryb2tlLWxpbmVjYXBcIjogXCJidXR0XCIsXG4gICAgICAgICAgICBcInN0cm9rZS1saW5lam9pblwiOiBcImJ1dHRcIixcbiAgICAgICAgICAgIFwic3Ryb2tlLW1pdGVybGltaXRcIjogMCxcbiAgICAgICAgICAgIFwic3Ryb2tlLW9wYWNpdHlcIjogMSxcbiAgICAgICAgICAgIFwic3Ryb2tlLXdpZHRoXCI6IDEsXG4gICAgICAgICAgICB0YXJnZXQ6IFwiX2JsYW5rXCIsXG4gICAgICAgICAgICBcInRleHQtYW5jaG9yXCI6IFwibWlkZGxlXCIsXG4gICAgICAgICAgICB0aXRsZTogXCJSYXBoYWVsXCIsXG4gICAgICAgICAgICB0cmFuc2Zvcm06IFwiXCIsXG4gICAgICAgICAgICB3aWR0aDogMCxcbiAgICAgICAgICAgIHg6IDAsXG4gICAgICAgICAgICB5OiAwXG4gICAgICAgIH0sXG4gICAgICAgIGF2YWlsYWJsZUFuaW1BdHRycyA9IFIuX2F2YWlsYWJsZUFuaW1BdHRycyA9IHtcbiAgICAgICAgICAgIGJsdXI6IG51LFxuICAgICAgICAgICAgXCJjbGlwLXJlY3RcIjogXCJjc3ZcIixcbiAgICAgICAgICAgIGN4OiBudSxcbiAgICAgICAgICAgIGN5OiBudSxcbiAgICAgICAgICAgIGZpbGw6IFwiY29sb3VyXCIsXG4gICAgICAgICAgICBcImZpbGwtb3BhY2l0eVwiOiBudSxcbiAgICAgICAgICAgIFwiZm9udC1zaXplXCI6IG51LFxuICAgICAgICAgICAgaGVpZ2h0OiBudSxcbiAgICAgICAgICAgIG9wYWNpdHk6IG51LFxuICAgICAgICAgICAgcGF0aDogXCJwYXRoXCIsXG4gICAgICAgICAgICByOiBudSxcbiAgICAgICAgICAgIHJ4OiBudSxcbiAgICAgICAgICAgIHJ5OiBudSxcbiAgICAgICAgICAgIHN0cm9rZTogXCJjb2xvdXJcIixcbiAgICAgICAgICAgIFwic3Ryb2tlLW9wYWNpdHlcIjogbnUsXG4gICAgICAgICAgICBcInN0cm9rZS13aWR0aFwiOiBudSxcbiAgICAgICAgICAgIHRyYW5zZm9ybTogXCJ0cmFuc2Zvcm1cIixcbiAgICAgICAgICAgIHdpZHRoOiBudSxcbiAgICAgICAgICAgIHg6IG51LFxuICAgICAgICAgICAgeTogbnVcbiAgICAgICAgfSxcbiAgICAgICAgd2hpdGVzcGFjZSA9IC9bXFx4MDlcXHgwYVxceDBiXFx4MGNcXHgwZFxceDIwXFx4YTBcXHUxNjgwXFx1MTgwZVxcdTIwMDBcXHUyMDAxXFx1MjAwMlxcdTIwMDNcXHUyMDA0XFx1MjAwNVxcdTIwMDZcXHUyMDA3XFx1MjAwOFxcdTIwMDlcXHUyMDBhXFx1MjAyZlxcdTIwNWZcXHUzMDAwXFx1MjAyOFxcdTIwMjldL2csXG4gICAgICAgIGNvbW1hU3BhY2VzID0gL1tcXHgwOVxceDBhXFx4MGJcXHgwY1xceDBkXFx4MjBcXHhhMFxcdTE2ODBcXHUxODBlXFx1MjAwMFxcdTIwMDFcXHUyMDAyXFx1MjAwM1xcdTIwMDRcXHUyMDA1XFx1MjAwNlxcdTIwMDdcXHUyMDA4XFx1MjAwOVxcdTIwMGFcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHUyMDI4XFx1MjAyOV0qLFtcXHgwOVxceDBhXFx4MGJcXHgwY1xceDBkXFx4MjBcXHhhMFxcdTE2ODBcXHUxODBlXFx1MjAwMFxcdTIwMDFcXHUyMDAyXFx1MjAwM1xcdTIwMDRcXHUyMDA1XFx1MjAwNlxcdTIwMDdcXHUyMDA4XFx1MjAwOVxcdTIwMGFcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHUyMDI4XFx1MjAyOV0qLyxcbiAgICAgICAgaHNyZyA9IHtoczogMSwgcmc6IDF9LFxuICAgICAgICBwMnMgPSAvLD8oW2FjaGxtcXJzdHZ4el0pLD8vZ2ksXG4gICAgICAgIHBhdGhDb21tYW5kID0gLyhbYWNobG1ycXN0dnpdKVtcXHgwOVxceDBhXFx4MGJcXHgwY1xceDBkXFx4MjBcXHhhMFxcdTE2ODBcXHUxODBlXFx1MjAwMFxcdTIwMDFcXHUyMDAyXFx1MjAwM1xcdTIwMDRcXHUyMDA1XFx1MjAwNlxcdTIwMDdcXHUyMDA4XFx1MjAwOVxcdTIwMGFcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHUyMDI4XFx1MjAyOSxdKigoLT9cXGQqXFwuP1xcZCooPzplW1xcLStdP1xcZCspP1tcXHgwOVxceDBhXFx4MGJcXHgwY1xceDBkXFx4MjBcXHhhMFxcdTE2ODBcXHUxODBlXFx1MjAwMFxcdTIwMDFcXHUyMDAyXFx1MjAwM1xcdTIwMDRcXHUyMDA1XFx1MjAwNlxcdTIwMDdcXHUyMDA4XFx1MjAwOVxcdTIwMGFcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHUyMDI4XFx1MjAyOV0qLD9bXFx4MDlcXHgwYVxceDBiXFx4MGNcXHgwZFxceDIwXFx4YTBcXHUxNjgwXFx1MTgwZVxcdTIwMDBcXHUyMDAxXFx1MjAwMlxcdTIwMDNcXHUyMDA0XFx1MjAwNVxcdTIwMDZcXHUyMDA3XFx1MjAwOFxcdTIwMDlcXHUyMDBhXFx1MjAyZlxcdTIwNWZcXHUzMDAwXFx1MjAyOFxcdTIwMjldKikrKS9pZyxcbiAgICAgICAgdENvbW1hbmQgPSAvKFtyc3RtXSlbXFx4MDlcXHgwYVxceDBiXFx4MGNcXHgwZFxceDIwXFx4YTBcXHUxNjgwXFx1MTgwZVxcdTIwMDBcXHUyMDAxXFx1MjAwMlxcdTIwMDNcXHUyMDA0XFx1MjAwNVxcdTIwMDZcXHUyMDA3XFx1MjAwOFxcdTIwMDlcXHUyMDBhXFx1MjAyZlxcdTIwNWZcXHUzMDAwXFx1MjAyOFxcdTIwMjksXSooKC0/XFxkKlxcLj9cXGQqKD86ZVtcXC0rXT9cXGQrKT9bXFx4MDlcXHgwYVxceDBiXFx4MGNcXHgwZFxceDIwXFx4YTBcXHUxNjgwXFx1MTgwZVxcdTIwMDBcXHUyMDAxXFx1MjAwMlxcdTIwMDNcXHUyMDA0XFx1MjAwNVxcdTIwMDZcXHUyMDA3XFx1MjAwOFxcdTIwMDlcXHUyMDBhXFx1MjAyZlxcdTIwNWZcXHUzMDAwXFx1MjAyOFxcdTIwMjldKiw/W1xceDA5XFx4MGFcXHgwYlxceDBjXFx4MGRcXHgyMFxceGEwXFx1MTY4MFxcdTE4MGVcXHUyMDAwXFx1MjAwMVxcdTIwMDJcXHUyMDAzXFx1MjAwNFxcdTIwMDVcXHUyMDA2XFx1MjAwN1xcdTIwMDhcXHUyMDA5XFx1MjAwYVxcdTIwMmZcXHUyMDVmXFx1MzAwMFxcdTIwMjhcXHUyMDI5XSopKykvaWcsXG4gICAgICAgIHBhdGhWYWx1ZXMgPSAvKC0/XFxkKlxcLj9cXGQqKD86ZVtcXC0rXT9cXGQrKT8pW1xceDA5XFx4MGFcXHgwYlxceDBjXFx4MGRcXHgyMFxceGEwXFx1MTY4MFxcdTE4MGVcXHUyMDAwXFx1MjAwMVxcdTIwMDJcXHUyMDAzXFx1MjAwNFxcdTIwMDVcXHUyMDA2XFx1MjAwN1xcdTIwMDhcXHUyMDA5XFx1MjAwYVxcdTIwMmZcXHUyMDVmXFx1MzAwMFxcdTIwMjhcXHUyMDI5XSosP1tcXHgwOVxceDBhXFx4MGJcXHgwY1xceDBkXFx4MjBcXHhhMFxcdTE2ODBcXHUxODBlXFx1MjAwMFxcdTIwMDFcXHUyMDAyXFx1MjAwM1xcdTIwMDRcXHUyMDA1XFx1MjAwNlxcdTIwMDdcXHUyMDA4XFx1MjAwOVxcdTIwMGFcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHUyMDI4XFx1MjAyOV0qL2lnLFxuICAgICAgICByYWRpYWxfZ3JhZGllbnQgPSBSLl9yYWRpYWxfZ3JhZGllbnQgPSAvXnIoPzpcXCgoW14sXSs/KVtcXHgwOVxceDBhXFx4MGJcXHgwY1xceDBkXFx4MjBcXHhhMFxcdTE2ODBcXHUxODBlXFx1MjAwMFxcdTIwMDFcXHUyMDAyXFx1MjAwM1xcdTIwMDRcXHUyMDA1XFx1MjAwNlxcdTIwMDdcXHUyMDA4XFx1MjAwOVxcdTIwMGFcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHUyMDI4XFx1MjAyOV0qLFtcXHgwOVxceDBhXFx4MGJcXHgwY1xceDBkXFx4MjBcXHhhMFxcdTE2ODBcXHUxODBlXFx1MjAwMFxcdTIwMDFcXHUyMDAyXFx1MjAwM1xcdTIwMDRcXHUyMDA1XFx1MjAwNlxcdTIwMDdcXHUyMDA4XFx1MjAwOVxcdTIwMGFcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHUyMDI4XFx1MjAyOV0qKFteXFwpXSs/KVxcKSk/LyxcbiAgICAgICAgZWxkYXRhID0ge30sXG4gICAgICAgIHNvcnRCeUtleSA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICByZXR1cm4gYS5rZXkgLSBiLmtleTtcbiAgICAgICAgfSxcbiAgICAgICAgc29ydEJ5TnVtYmVyID0gZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgIHJldHVybiB0b0Zsb2F0KGEpIC0gdG9GbG9hdChiKTtcbiAgICAgICAgfSxcbiAgICAgICAgZnVuID0gZnVuY3Rpb24gKCkge30sXG4gICAgICAgIHBpcGUgPSBmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgIH0sXG4gICAgICAgIHJlY3RQYXRoID0gUi5fcmVjdFBhdGggPSBmdW5jdGlvbiAoeCwgeSwgdywgaCwgcikge1xuICAgICAgICAgICAgaWYgKHIpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW1tcIk1cIiwgeCArIHIsIHldLCBbXCJsXCIsIHcgLSByICogMiwgMF0sIFtcImFcIiwgciwgciwgMCwgMCwgMSwgciwgcl0sIFtcImxcIiwgMCwgaCAtIHIgKiAyXSwgW1wiYVwiLCByLCByLCAwLCAwLCAxLCAtciwgcl0sIFtcImxcIiwgciAqIDIgLSB3LCAwXSwgW1wiYVwiLCByLCByLCAwLCAwLCAxLCAtciwgLXJdLCBbXCJsXCIsIDAsIHIgKiAyIC0gaF0sIFtcImFcIiwgciwgciwgMCwgMCwgMSwgciwgLXJdLCBbXCJ6XCJdXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBbW1wiTVwiLCB4LCB5XSwgW1wibFwiLCB3LCAwXSwgW1wibFwiLCAwLCBoXSwgW1wibFwiLCAtdywgMF0sIFtcInpcIl1dO1xuICAgICAgICB9LFxuICAgICAgICBlbGxpcHNlUGF0aCA9IGZ1bmN0aW9uICh4LCB5LCByeCwgcnkpIHtcbiAgICAgICAgICAgIGlmIChyeSA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgcnkgPSByeDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBbW1wiTVwiLCB4LCB5XSwgW1wibVwiLCAwLCAtcnldLCBbXCJhXCIsIHJ4LCByeSwgMCwgMSwgMSwgMCwgMiAqIHJ5XSwgW1wiYVwiLCByeCwgcnksIDAsIDEsIDEsIDAsIC0yICogcnldLCBbXCJ6XCJdXTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0UGF0aCA9IFIuX2dldFBhdGggPSB7XG4gICAgICAgICAgICBwYXRoOiBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWwuYXR0cihcInBhdGhcIik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY2lyY2xlOiBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgICAgICB2YXIgYSA9IGVsLmF0dHJzO1xuICAgICAgICAgICAgICAgIHJldHVybiBlbGxpcHNlUGF0aChhLmN4LCBhLmN5LCBhLnIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVsbGlwc2U6IGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgICAgIHZhciBhID0gZWwuYXR0cnM7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsbGlwc2VQYXRoKGEuY3gsIGEuY3ksIGEucngsIGEucnkpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlY3Q6IGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgICAgIHZhciBhID0gZWwuYXR0cnM7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlY3RQYXRoKGEueCwgYS55LCBhLndpZHRoLCBhLmhlaWdodCwgYS5yKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBpbWFnZTogZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgICAgICAgICAgdmFyIGEgPSBlbC5hdHRycztcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVjdFBhdGgoYS54LCBhLnksIGEud2lkdGgsIGEuaGVpZ2h0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0ZXh0OiBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgICAgICB2YXIgYmJveCA9IGVsLl9nZXRCQm94KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlY3RQYXRoKGJib3gueCwgYmJveC55LCBiYm94LndpZHRoLCBiYm94LmhlaWdodCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICBtYXBQYXRoID0gUi5tYXBQYXRoID0gZnVuY3Rpb24gKHBhdGgsIG1hdHJpeCkge1xuICAgICAgICAgICAgaWYgKCFtYXRyaXgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGF0aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciB4LCB5LCBpLCBqLCBpaSwgamosIHBhdGhpO1xuICAgICAgICAgICAgcGF0aCA9IHBhdGgyY3VydmUocGF0aCk7XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBpaSA9IHBhdGgubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIHBhdGhpID0gcGF0aFtpXTtcbiAgICAgICAgICAgICAgICBmb3IgKGogPSAxLCBqaiA9IHBhdGhpLmxlbmd0aDsgaiA8IGpqOyBqICs9IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgeCA9IG1hdHJpeC54KHBhdGhpW2pdLCBwYXRoaVtqICsgMV0pO1xuICAgICAgICAgICAgICAgICAgICB5ID0gbWF0cml4LnkocGF0aGlbal0sIHBhdGhpW2ogKyAxXSk7XG4gICAgICAgICAgICAgICAgICAgIHBhdGhpW2pdID0geDtcbiAgICAgICAgICAgICAgICAgICAgcGF0aGlbaiArIDFdID0geTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcGF0aDtcbiAgICAgICAgfTtcblxuICAgIFIuX2cgPSBnO1xuICAgIFxuICAgIFxuICAgIFIudHlwZSA9IChnLndpbi5TVkdBbmdsZSB8fCBnLmRvYy5pbXBsZW1lbnRhdGlvbi5oYXNGZWF0dXJlKFwiaHR0cDovL3d3dy53My5vcmcvVFIvU1ZHMTEvZmVhdHVyZSNCYXNpY1N0cnVjdHVyZVwiLCBcIjEuMVwiKSA/IFwiU1ZHXCIgOiBcIlZNTFwiKTtcbiAgICBpZiAoUi50eXBlID09IFwiVk1MXCIpIHtcbiAgICAgICAgdmFyIGQgPSBnLmRvYy5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLFxuICAgICAgICAgICAgYjtcbiAgICAgICAgZC5pbm5lckhUTUwgPSAnPHY6c2hhcGUgYWRqPVwiMVwiLz4nO1xuICAgICAgICBiID0gZC5maXJzdENoaWxkO1xuICAgICAgICBiLnN0eWxlLmJlaGF2aW9yID0gXCJ1cmwoI2RlZmF1bHQjVk1MKVwiO1xuICAgICAgICBpZiAoIShiICYmIHR5cGVvZiBiLmFkaiA9PSBcIm9iamVjdFwiKSkge1xuICAgICAgICAgICAgcmV0dXJuIChSLnR5cGUgPSBFKTtcbiAgICAgICAgfVxuICAgICAgICBkID0gbnVsbDtcbiAgICB9XG5cbiAgICBcbiAgICBSLnN2ZyA9ICEoUi52bWwgPSBSLnR5cGUgPT0gXCJWTUxcIik7XG4gICAgUi5fUGFwZXIgPSBQYXBlcjtcbiAgICBcbiAgICBSLmZuID0gcGFwZXJwcm90byA9IFBhcGVyLnByb3RvdHlwZSA9IFIucHJvdG90eXBlO1xuICAgIFIuX2lkID0gMDtcbiAgICBSLl9vaWQgPSAwO1xuICAgIFxuICAgIFIuaXMgPSBmdW5jdGlvbiAobywgdHlwZSkge1xuICAgICAgICB0eXBlID0gbG93ZXJDYXNlLmNhbGwodHlwZSk7XG4gICAgICAgIGlmICh0eXBlID09IFwiZmluaXRlXCIpIHtcbiAgICAgICAgICAgIHJldHVybiAhaXNuYW5baGFzXSgrbyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHR5cGUgPT0gXCJhcnJheVwiKSB7XG4gICAgICAgICAgICByZXR1cm4gbyBpbnN0YW5jZW9mIEFycmF5O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAgKHR5cGUgPT0gXCJudWxsXCIgJiYgbyA9PT0gbnVsbCkgfHxcbiAgICAgICAgICAgICAgICAodHlwZSA9PSB0eXBlb2YgbyAmJiBvICE9PSBudWxsKSB8fFxuICAgICAgICAgICAgICAgICh0eXBlID09IFwib2JqZWN0XCIgJiYgbyA9PT0gT2JqZWN0KG8pKSB8fFxuICAgICAgICAgICAgICAgICh0eXBlID09IFwiYXJyYXlcIiAmJiBBcnJheS5pc0FycmF5ICYmIEFycmF5LmlzQXJyYXkobykpIHx8XG4gICAgICAgICAgICAgICAgb2JqZWN0VG9TdHJpbmcuY2FsbChvKS5zbGljZSg4LCAtMSkudG9Mb3dlckNhc2UoKSA9PSB0eXBlO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBjbG9uZShvYmopIHtcbiAgICAgICAgaWYgKE9iamVjdChvYmopICE9PSBvYmopIHtcbiAgICAgICAgICAgIHJldHVybiBvYmo7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJlcyA9IG5ldyBvYmouY29uc3RydWN0b3I7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChvYmpbaGFzXShrZXkpKSB7XG4gICAgICAgICAgICByZXNba2V5XSA9IGNsb25lKG9ialtrZXldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cblxuICAgIFxuICAgIFIuYW5nbGUgPSBmdW5jdGlvbiAoeDEsIHkxLCB4MiwgeTIsIHgzLCB5Mykge1xuICAgICAgICBpZiAoeDMgPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIHggPSB4MSAtIHgyLFxuICAgICAgICAgICAgICAgIHkgPSB5MSAtIHkyO1xuICAgICAgICAgICAgaWYgKCF4ICYmICF5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gKDE4MCArIG1hdGguYXRhbjIoLXksIC14KSAqIDE4MCAvIFBJICsgMzYwKSAlIDM2MDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBSLmFuZ2xlKHgxLCB5MSwgeDMsIHkzKSAtIFIuYW5nbGUoeDIsIHkyLCB4MywgeTMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICBSLnJhZCA9IGZ1bmN0aW9uIChkZWcpIHtcbiAgICAgICAgcmV0dXJuIGRlZyAlIDM2MCAqIFBJIC8gMTgwO1xuICAgIH07XG4gICAgXG4gICAgUi5kZWcgPSBmdW5jdGlvbiAocmFkKSB7XG4gICAgICAgIHJldHVybiByYWQgKiAxODAgLyBQSSAlIDM2MDtcbiAgICB9O1xuICAgIFxuICAgIFIuc25hcFRvID0gZnVuY3Rpb24gKHZhbHVlcywgdmFsdWUsIHRvbGVyYW5jZSkge1xuICAgICAgICB0b2xlcmFuY2UgPSBSLmlzKHRvbGVyYW5jZSwgXCJmaW5pdGVcIikgPyB0b2xlcmFuY2UgOiAxMDtcbiAgICAgICAgaWYgKFIuaXModmFsdWVzLCBhcnJheSkpIHtcbiAgICAgICAgICAgIHZhciBpID0gdmFsdWVzLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlIChpLS0pIGlmIChhYnModmFsdWVzW2ldIC0gdmFsdWUpIDw9IHRvbGVyYW5jZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZXNbaV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YWx1ZXMgPSArdmFsdWVzO1xuICAgICAgICAgICAgdmFyIHJlbSA9IHZhbHVlICUgdmFsdWVzO1xuICAgICAgICAgICAgaWYgKHJlbSA8IHRvbGVyYW5jZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSAtIHJlbTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZW0gPiB2YWx1ZXMgLSB0b2xlcmFuY2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUgLSByZW0gKyB2YWx1ZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG4gICAgXG4gICAgXG4gICAgdmFyIGNyZWF0ZVVVSUQgPSBSLmNyZWF0ZVVVSUQgPSAoZnVuY3Rpb24gKHV1aWRSZWdFeCwgdXVpZFJlcGxhY2VyKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJ4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHhcIi5yZXBsYWNlKHV1aWRSZWdFeCwgdXVpZFJlcGxhY2VyKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICB9O1xuICAgIH0pKC9beHldL2csIGZ1bmN0aW9uIChjKSB7XG4gICAgICAgIHZhciByID0gbWF0aC5yYW5kb20oKSAqIDE2IHwgMCxcbiAgICAgICAgICAgIHYgPSBjID09IFwieFwiID8gciA6IChyICYgMyB8IDgpO1xuICAgICAgICByZXR1cm4gdi50b1N0cmluZygxNik7XG4gICAgfSk7XG5cbiAgICBcbiAgICBSLnNldFdpbmRvdyA9IGZ1bmN0aW9uIChuZXd3aW4pIHtcbiAgICAgICAgZXZlKFwicmFwaGFlbC5zZXRXaW5kb3dcIiwgUiwgZy53aW4sIG5ld3dpbik7XG4gICAgICAgIGcud2luID0gbmV3d2luO1xuICAgICAgICBnLmRvYyA9IGcud2luLmRvY3VtZW50O1xuICAgICAgICBpZiAoUi5fZW5naW5lLmluaXRXaW4pIHtcbiAgICAgICAgICAgIFIuX2VuZ2luZS5pbml0V2luKGcud2luKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgdmFyIHRvSGV4ID0gZnVuY3Rpb24gKGNvbG9yKSB7XG4gICAgICAgIGlmIChSLnZtbCkge1xuICAgICAgICAgICAgLy8gaHR0cDovL2RlYW4uZWR3YXJkcy5uYW1lL3dlYmxvZy8yMDA5LzEwL2NvbnZlcnQtYW55LWNvbG91ci12YWx1ZS10by1oZXgtaW4tbXNpZS9cbiAgICAgICAgICAgIHZhciB0cmltID0gL15cXHMrfFxccyskL2c7XG4gICAgICAgICAgICB2YXIgYm9kO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB2YXIgZG9jdW0gPSBuZXcgQWN0aXZlWE9iamVjdChcImh0bWxmaWxlXCIpO1xuICAgICAgICAgICAgICAgIGRvY3VtLndyaXRlKFwiPGJvZHk+XCIpO1xuICAgICAgICAgICAgICAgIGRvY3VtLmNsb3NlKCk7XG4gICAgICAgICAgICAgICAgYm9kID0gZG9jdW0uYm9keTtcbiAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgIGJvZCA9IGNyZWF0ZVBvcHVwKCkuZG9jdW1lbnQuYm9keTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciByYW5nZSA9IGJvZC5jcmVhdGVUZXh0UmFuZ2UoKTtcbiAgICAgICAgICAgIHRvSGV4ID0gY2FjaGVyKGZ1bmN0aW9uIChjb2xvcikge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGJvZC5zdHlsZS5jb2xvciA9IFN0cihjb2xvcikucmVwbGFjZSh0cmltLCBFKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gcmFuZ2UucXVlcnlDb21tYW5kVmFsdWUoXCJGb3JlQ29sb3JcIik7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlID0gKCh2YWx1ZSAmIDI1NSkgPDwgMTYpIHwgKHZhbHVlICYgNjUyODApIHwgKCh2YWx1ZSAmIDE2NzExNjgwKSA+Pj4gMTYpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCIjXCIgKyAoXCIwMDAwMDBcIiArIHZhbHVlLnRvU3RyaW5nKDE2KSkuc2xpY2UoLTYpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJub25lXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgaSA9IGcuZG9jLmNyZWF0ZUVsZW1lbnQoXCJpXCIpO1xuICAgICAgICAgICAgaS50aXRsZSA9IFwiUmFwaGFcXHhlYmwgQ29sb3VyIFBpY2tlclwiO1xuICAgICAgICAgICAgaS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgICAgICBnLmRvYy5ib2R5LmFwcGVuZENoaWxkKGkpO1xuICAgICAgICAgICAgdG9IZXggPSBjYWNoZXIoZnVuY3Rpb24gKGNvbG9yKSB7XG4gICAgICAgICAgICAgICAgaS5zdHlsZS5jb2xvciA9IGNvbG9yO1xuICAgICAgICAgICAgICAgIHJldHVybiBnLmRvYy5kZWZhdWx0Vmlldy5nZXRDb21wdXRlZFN0eWxlKGksIEUpLmdldFByb3BlcnR5VmFsdWUoXCJjb2xvclwiKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0b0hleChjb2xvcik7XG4gICAgfSxcbiAgICBoc2J0b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFwiaHNiKFwiICsgW3RoaXMuaCwgdGhpcy5zLCB0aGlzLmJdICsgXCIpXCI7XG4gICAgfSxcbiAgICBoc2x0b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFwiaHNsKFwiICsgW3RoaXMuaCwgdGhpcy5zLCB0aGlzLmxdICsgXCIpXCI7XG4gICAgfSxcbiAgICByZ2J0b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGV4O1xuICAgIH0sXG4gICAgcHJlcGFyZVJHQiA9IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG4gICAgICAgIGlmIChnID09IG51bGwgJiYgUi5pcyhyLCBcIm9iamVjdFwiKSAmJiBcInJcIiBpbiByICYmIFwiZ1wiIGluIHIgJiYgXCJiXCIgaW4gcikge1xuICAgICAgICAgICAgYiA9IHIuYjtcbiAgICAgICAgICAgIGcgPSByLmc7XG4gICAgICAgICAgICByID0gci5yO1xuICAgICAgICB9XG4gICAgICAgIGlmIChnID09IG51bGwgJiYgUi5pcyhyLCBzdHJpbmcpKSB7XG4gICAgICAgICAgICB2YXIgY2xyID0gUi5nZXRSR0Iocik7XG4gICAgICAgICAgICByID0gY2xyLnI7XG4gICAgICAgICAgICBnID0gY2xyLmc7XG4gICAgICAgICAgICBiID0gY2xyLmI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHIgPiAxIHx8IGcgPiAxIHx8IGIgPiAxKSB7XG4gICAgICAgICAgICByIC89IDI1NTtcbiAgICAgICAgICAgIGcgLz0gMjU1O1xuICAgICAgICAgICAgYiAvPSAyNTU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBbciwgZywgYl07XG4gICAgfSxcbiAgICBwYWNrYWdlUkdCID0gZnVuY3Rpb24gKHIsIGcsIGIsIG8pIHtcbiAgICAgICAgciAqPSAyNTU7XG4gICAgICAgIGcgKj0gMjU1O1xuICAgICAgICBiICo9IDI1NTtcbiAgICAgICAgdmFyIHJnYiA9IHtcbiAgICAgICAgICAgIHI6IHIsXG4gICAgICAgICAgICBnOiBnLFxuICAgICAgICAgICAgYjogYixcbiAgICAgICAgICAgIGhleDogUi5yZ2IociwgZywgYiksXG4gICAgICAgICAgICB0b1N0cmluZzogcmdidG9TdHJpbmdcbiAgICAgICAgfTtcbiAgICAgICAgUi5pcyhvLCBcImZpbml0ZVwiKSAmJiAocmdiLm9wYWNpdHkgPSBvKTtcbiAgICAgICAgcmV0dXJuIHJnYjtcbiAgICB9O1xuICAgIFxuICAgIFxuICAgIFIuY29sb3IgPSBmdW5jdGlvbiAoY2xyKSB7XG4gICAgICAgIHZhciByZ2I7XG4gICAgICAgIGlmIChSLmlzKGNsciwgXCJvYmplY3RcIikgJiYgXCJoXCIgaW4gY2xyICYmIFwic1wiIGluIGNsciAmJiBcImJcIiBpbiBjbHIpIHtcbiAgICAgICAgICAgIHJnYiA9IFIuaHNiMnJnYihjbHIpO1xuICAgICAgICAgICAgY2xyLnIgPSByZ2IucjtcbiAgICAgICAgICAgIGNsci5nID0gcmdiLmc7XG4gICAgICAgICAgICBjbHIuYiA9IHJnYi5iO1xuICAgICAgICAgICAgY2xyLmhleCA9IHJnYi5oZXg7XG4gICAgICAgIH0gZWxzZSBpZiAoUi5pcyhjbHIsIFwib2JqZWN0XCIpICYmIFwiaFwiIGluIGNsciAmJiBcInNcIiBpbiBjbHIgJiYgXCJsXCIgaW4gY2xyKSB7XG4gICAgICAgICAgICByZ2IgPSBSLmhzbDJyZ2IoY2xyKTtcbiAgICAgICAgICAgIGNsci5yID0gcmdiLnI7XG4gICAgICAgICAgICBjbHIuZyA9IHJnYi5nO1xuICAgICAgICAgICAgY2xyLmIgPSByZ2IuYjtcbiAgICAgICAgICAgIGNsci5oZXggPSByZ2IuaGV4O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKFIuaXMoY2xyLCBcInN0cmluZ1wiKSkge1xuICAgICAgICAgICAgICAgIGNsciA9IFIuZ2V0UkdCKGNscik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoUi5pcyhjbHIsIFwib2JqZWN0XCIpICYmIFwiclwiIGluIGNsciAmJiBcImdcIiBpbiBjbHIgJiYgXCJiXCIgaW4gY2xyKSB7XG4gICAgICAgICAgICAgICAgcmdiID0gUi5yZ2IyaHNsKGNscik7XG4gICAgICAgICAgICAgICAgY2xyLmggPSByZ2IuaDtcbiAgICAgICAgICAgICAgICBjbHIucyA9IHJnYi5zO1xuICAgICAgICAgICAgICAgIGNsci5sID0gcmdiLmw7XG4gICAgICAgICAgICAgICAgcmdiID0gUi5yZ2IyaHNiKGNscik7XG4gICAgICAgICAgICAgICAgY2xyLnYgPSByZ2IuYjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY2xyID0ge2hleDogXCJub25lXCJ9O1xuICAgICAgICAgICAgICAgIGNsci5yID0gY2xyLmcgPSBjbHIuYiA9IGNsci5oID0gY2xyLnMgPSBjbHIudiA9IGNsci5sID0gLTE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY2xyLnRvU3RyaW5nID0gcmdidG9TdHJpbmc7XG4gICAgICAgIHJldHVybiBjbHI7XG4gICAgfTtcbiAgICBcbiAgICBSLmhzYjJyZ2IgPSBmdW5jdGlvbiAoaCwgcywgdiwgbykge1xuICAgICAgICBpZiAodGhpcy5pcyhoLCBcIm9iamVjdFwiKSAmJiBcImhcIiBpbiBoICYmIFwic1wiIGluIGggJiYgXCJiXCIgaW4gaCkge1xuICAgICAgICAgICAgdiA9IGguYjtcbiAgICAgICAgICAgIHMgPSBoLnM7XG4gICAgICAgICAgICBoID0gaC5oO1xuICAgICAgICAgICAgbyA9IGgubztcbiAgICAgICAgfVxuICAgICAgICBoICo9IDM2MDtcbiAgICAgICAgdmFyIFIsIEcsIEIsIFgsIEM7XG4gICAgICAgIGggPSAoaCAlIDM2MCkgLyA2MDtcbiAgICAgICAgQyA9IHYgKiBzO1xuICAgICAgICBYID0gQyAqICgxIC0gYWJzKGggJSAyIC0gMSkpO1xuICAgICAgICBSID0gRyA9IEIgPSB2IC0gQztcblxuICAgICAgICBoID0gfn5oO1xuICAgICAgICBSICs9IFtDLCBYLCAwLCAwLCBYLCBDXVtoXTtcbiAgICAgICAgRyArPSBbWCwgQywgQywgWCwgMCwgMF1baF07XG4gICAgICAgIEIgKz0gWzAsIDAsIFgsIEMsIEMsIFhdW2hdO1xuICAgICAgICByZXR1cm4gcGFja2FnZVJHQihSLCBHLCBCLCBvKTtcbiAgICB9O1xuICAgIFxuICAgIFIuaHNsMnJnYiA9IGZ1bmN0aW9uIChoLCBzLCBsLCBvKSB7XG4gICAgICAgIGlmICh0aGlzLmlzKGgsIFwib2JqZWN0XCIpICYmIFwiaFwiIGluIGggJiYgXCJzXCIgaW4gaCAmJiBcImxcIiBpbiBoKSB7XG4gICAgICAgICAgICBsID0gaC5sO1xuICAgICAgICAgICAgcyA9IGgucztcbiAgICAgICAgICAgIGggPSBoLmg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGggPiAxIHx8IHMgPiAxIHx8IGwgPiAxKSB7XG4gICAgICAgICAgICBoIC89IDM2MDtcbiAgICAgICAgICAgIHMgLz0gMTAwO1xuICAgICAgICAgICAgbCAvPSAxMDA7XG4gICAgICAgIH1cbiAgICAgICAgaCAqPSAzNjA7XG4gICAgICAgIHZhciBSLCBHLCBCLCBYLCBDO1xuICAgICAgICBoID0gKGggJSAzNjApIC8gNjA7XG4gICAgICAgIEMgPSAyICogcyAqIChsIDwgLjUgPyBsIDogMSAtIGwpO1xuICAgICAgICBYID0gQyAqICgxIC0gYWJzKGggJSAyIC0gMSkpO1xuICAgICAgICBSID0gRyA9IEIgPSBsIC0gQyAvIDI7XG5cbiAgICAgICAgaCA9IH5+aDtcbiAgICAgICAgUiArPSBbQywgWCwgMCwgMCwgWCwgQ11baF07XG4gICAgICAgIEcgKz0gW1gsIEMsIEMsIFgsIDAsIDBdW2hdO1xuICAgICAgICBCICs9IFswLCAwLCBYLCBDLCBDLCBYXVtoXTtcbiAgICAgICAgcmV0dXJuIHBhY2thZ2VSR0IoUiwgRywgQiwgbyk7XG4gICAgfTtcbiAgICBcbiAgICBSLnJnYjJoc2IgPSBmdW5jdGlvbiAociwgZywgYikge1xuICAgICAgICBiID0gcHJlcGFyZVJHQihyLCBnLCBiKTtcbiAgICAgICAgciA9IGJbMF07XG4gICAgICAgIGcgPSBiWzFdO1xuICAgICAgICBiID0gYlsyXTtcblxuICAgICAgICB2YXIgSCwgUywgViwgQztcbiAgICAgICAgViA9IG1tYXgociwgZywgYik7XG4gICAgICAgIEMgPSBWIC0gbW1pbihyLCBnLCBiKTtcbiAgICAgICAgSCA9IChDID09IDAgPyBudWxsIDpcbiAgICAgICAgICAgICBWID09IHIgPyAoZyAtIGIpIC8gQyA6XG4gICAgICAgICAgICAgViA9PSBnID8gKGIgLSByKSAvIEMgKyAyIDpcbiAgICAgICAgICAgICAgICAgICAgICAociAtIGcpIC8gQyArIDRcbiAgICAgICAgICAgICk7XG4gICAgICAgIEggPSAoKEggKyAzNjApICUgNikgKiA2MCAvIDM2MDtcbiAgICAgICAgUyA9IEMgPT0gMCA/IDAgOiBDIC8gVjtcbiAgICAgICAgcmV0dXJuIHtoOiBILCBzOiBTLCBiOiBWLCB0b1N0cmluZzogaHNidG9TdHJpbmd9O1xuICAgIH07XG4gICAgXG4gICAgUi5yZ2IyaHNsID0gZnVuY3Rpb24gKHIsIGcsIGIpIHtcbiAgICAgICAgYiA9IHByZXBhcmVSR0IociwgZywgYik7XG4gICAgICAgIHIgPSBiWzBdO1xuICAgICAgICBnID0gYlsxXTtcbiAgICAgICAgYiA9IGJbMl07XG5cbiAgICAgICAgdmFyIEgsIFMsIEwsIE0sIG0sIEM7XG4gICAgICAgIE0gPSBtbWF4KHIsIGcsIGIpO1xuICAgICAgICBtID0gbW1pbihyLCBnLCBiKTtcbiAgICAgICAgQyA9IE0gLSBtO1xuICAgICAgICBIID0gKEMgPT0gMCA/IG51bGwgOlxuICAgICAgICAgICAgIE0gPT0gciA/IChnIC0gYikgLyBDIDpcbiAgICAgICAgICAgICBNID09IGcgPyAoYiAtIHIpIC8gQyArIDIgOlxuICAgICAgICAgICAgICAgICAgICAgIChyIC0gZykgLyBDICsgNCk7XG4gICAgICAgIEggPSAoKEggKyAzNjApICUgNikgKiA2MCAvIDM2MDtcbiAgICAgICAgTCA9IChNICsgbSkgLyAyO1xuICAgICAgICBTID0gKEMgPT0gMCA/IDAgOlxuICAgICAgICAgICAgIEwgPCAuNSA/IEMgLyAoMiAqIEwpIDpcbiAgICAgICAgICAgICAgICAgICAgICBDIC8gKDIgLSAyICogTCkpO1xuICAgICAgICByZXR1cm4ge2g6IEgsIHM6IFMsIGw6IEwsIHRvU3RyaW5nOiBoc2x0b1N0cmluZ307XG4gICAgfTtcbiAgICBSLl9wYXRoMnN0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuam9pbihcIixcIikucmVwbGFjZShwMnMsIFwiJDFcIik7XG4gICAgfTtcbiAgICBmdW5jdGlvbiByZXB1c2goYXJyYXksIGl0ZW0pIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gYXJyYXkubGVuZ3RoOyBpIDwgaWk7IGkrKykgaWYgKGFycmF5W2ldID09PSBpdGVtKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJyYXkucHVzaChhcnJheS5zcGxpY2UoaSwgMSlbMF0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGNhY2hlcihmLCBzY29wZSwgcG9zdHByb2Nlc3Nvcikge1xuICAgICAgICBmdW5jdGlvbiBuZXdmKCkge1xuICAgICAgICAgICAgdmFyIGFyZyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCksXG4gICAgICAgICAgICAgICAgYXJncyA9IGFyZy5qb2luKFwiXFx1MjQwMFwiKSxcbiAgICAgICAgICAgICAgICBjYWNoZSA9IG5ld2YuY2FjaGUgPSBuZXdmLmNhY2hlIHx8IHt9LFxuICAgICAgICAgICAgICAgIGNvdW50ID0gbmV3Zi5jb3VudCA9IG5ld2YuY291bnQgfHwgW107XG4gICAgICAgICAgICBpZiAoY2FjaGVbaGFzXShhcmdzKSkge1xuICAgICAgICAgICAgICAgIHJlcHVzaChjb3VudCwgYXJncyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBvc3Rwcm9jZXNzb3IgPyBwb3N0cHJvY2Vzc29yKGNhY2hlW2FyZ3NdKSA6IGNhY2hlW2FyZ3NdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY291bnQubGVuZ3RoID49IDFlMyAmJiBkZWxldGUgY2FjaGVbY291bnQuc2hpZnQoKV07XG4gICAgICAgICAgICBjb3VudC5wdXNoKGFyZ3MpO1xuICAgICAgICAgICAgY2FjaGVbYXJnc10gPSBmW2FwcGx5XShzY29wZSwgYXJnKTtcbiAgICAgICAgICAgIHJldHVybiBwb3N0cHJvY2Vzc29yID8gcG9zdHByb2Nlc3NvcihjYWNoZVthcmdzXSkgOiBjYWNoZVthcmdzXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3ZjtcbiAgICB9XG5cbiAgICB2YXIgcHJlbG9hZCA9IFIuX3ByZWxvYWQgPSBmdW5jdGlvbiAoc3JjLCBmKSB7XG4gICAgICAgIHZhciBpbWcgPSBnLmRvYy5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xuICAgICAgICBpbWcuc3R5bGUuY3NzVGV4dCA9IFwicG9zaXRpb246YWJzb2x1dGU7bGVmdDotOTk5OWVtO3RvcDotOTk5OWVtXCI7XG4gICAgICAgIGltZy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmLmNhbGwodGhpcyk7XG4gICAgICAgICAgICB0aGlzLm9ubG9hZCA9IG51bGw7XG4gICAgICAgICAgICBnLmRvYy5ib2R5LnJlbW92ZUNoaWxkKHRoaXMpO1xuICAgICAgICB9O1xuICAgICAgICBpbWcub25lcnJvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGcuZG9jLmJvZHkucmVtb3ZlQ2hpbGQodGhpcyk7XG4gICAgICAgIH07XG4gICAgICAgIGcuZG9jLmJvZHkuYXBwZW5kQ2hpbGQoaW1nKTtcbiAgICAgICAgaW1nLnNyYyA9IHNyYztcbiAgICB9O1xuICAgIFxuICAgIGZ1bmN0aW9uIGNsclRvU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5oZXg7XG4gICAgfVxuXG4gICAgXG4gICAgUi5nZXRSR0IgPSBjYWNoZXIoZnVuY3Rpb24gKGNvbG91cikge1xuICAgICAgICBpZiAoIWNvbG91ciB8fCAhISgoY29sb3VyID0gU3RyKGNvbG91cikpLmluZGV4T2YoXCItXCIpICsgMSkpIHtcbiAgICAgICAgICAgIHJldHVybiB7cjogLTEsIGc6IC0xLCBiOiAtMSwgaGV4OiBcIm5vbmVcIiwgZXJyb3I6IDEsIHRvU3RyaW5nOiBjbHJUb1N0cmluZ307XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbG91ciA9PSBcIm5vbmVcIikge1xuICAgICAgICAgICAgcmV0dXJuIHtyOiAtMSwgZzogLTEsIGI6IC0xLCBoZXg6IFwibm9uZVwiLCB0b1N0cmluZzogY2xyVG9TdHJpbmd9O1xuICAgICAgICB9XG4gICAgICAgICEoaHNyZ1toYXNdKGNvbG91ci50b0xvd2VyQ2FzZSgpLnN1YnN0cmluZygwLCAyKSkgfHwgY29sb3VyLmNoYXJBdCgpID09IFwiI1wiKSAmJiAoY29sb3VyID0gdG9IZXgoY29sb3VyKSk7XG4gICAgICAgIHZhciByZXMsXG4gICAgICAgICAgICByZWQsXG4gICAgICAgICAgICBncmVlbixcbiAgICAgICAgICAgIGJsdWUsXG4gICAgICAgICAgICBvcGFjaXR5LFxuICAgICAgICAgICAgdCxcbiAgICAgICAgICAgIHZhbHVlcyxcbiAgICAgICAgICAgIHJnYiA9IGNvbG91ci5tYXRjaChjb2xvdXJSZWdFeHApO1xuICAgICAgICBpZiAocmdiKSB7XG4gICAgICAgICAgICBpZiAocmdiWzJdKSB7XG4gICAgICAgICAgICAgICAgYmx1ZSA9IHRvSW50KHJnYlsyXS5zdWJzdHJpbmcoNSksIDE2KTtcbiAgICAgICAgICAgICAgICBncmVlbiA9IHRvSW50KHJnYlsyXS5zdWJzdHJpbmcoMywgNSksIDE2KTtcbiAgICAgICAgICAgICAgICByZWQgPSB0b0ludChyZ2JbMl0uc3Vic3RyaW5nKDEsIDMpLCAxNik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmdiWzNdKSB7XG4gICAgICAgICAgICAgICAgYmx1ZSA9IHRvSW50KCh0ID0gcmdiWzNdLmNoYXJBdCgzKSkgKyB0LCAxNik7XG4gICAgICAgICAgICAgICAgZ3JlZW4gPSB0b0ludCgodCA9IHJnYlszXS5jaGFyQXQoMikpICsgdCwgMTYpO1xuICAgICAgICAgICAgICAgIHJlZCA9IHRvSW50KCh0ID0gcmdiWzNdLmNoYXJBdCgxKSkgKyB0LCAxNik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmdiWzRdKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzID0gcmdiWzRdW3NwbGl0XShjb21tYVNwYWNlcyk7XG4gICAgICAgICAgICAgICAgcmVkID0gdG9GbG9hdCh2YWx1ZXNbMF0pO1xuICAgICAgICAgICAgICAgIHZhbHVlc1swXS5zbGljZSgtMSkgPT0gXCIlXCIgJiYgKHJlZCAqPSAyLjU1KTtcbiAgICAgICAgICAgICAgICBncmVlbiA9IHRvRmxvYXQodmFsdWVzWzFdKTtcbiAgICAgICAgICAgICAgICB2YWx1ZXNbMV0uc2xpY2UoLTEpID09IFwiJVwiICYmIChncmVlbiAqPSAyLjU1KTtcbiAgICAgICAgICAgICAgICBibHVlID0gdG9GbG9hdCh2YWx1ZXNbMl0pO1xuICAgICAgICAgICAgICAgIHZhbHVlc1syXS5zbGljZSgtMSkgPT0gXCIlXCIgJiYgKGJsdWUgKj0gMi41NSk7XG4gICAgICAgICAgICAgICAgcmdiWzFdLnRvTG93ZXJDYXNlKCkuc2xpY2UoMCwgNCkgPT0gXCJyZ2JhXCIgJiYgKG9wYWNpdHkgPSB0b0Zsb2F0KHZhbHVlc1szXSkpO1xuICAgICAgICAgICAgICAgIHZhbHVlc1szXSAmJiB2YWx1ZXNbM10uc2xpY2UoLTEpID09IFwiJVwiICYmIChvcGFjaXR5IC89IDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmdiWzVdKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzID0gcmdiWzVdW3NwbGl0XShjb21tYVNwYWNlcyk7XG4gICAgICAgICAgICAgICAgcmVkID0gdG9GbG9hdCh2YWx1ZXNbMF0pO1xuICAgICAgICAgICAgICAgIHZhbHVlc1swXS5zbGljZSgtMSkgPT0gXCIlXCIgJiYgKHJlZCAqPSAyLjU1KTtcbiAgICAgICAgICAgICAgICBncmVlbiA9IHRvRmxvYXQodmFsdWVzWzFdKTtcbiAgICAgICAgICAgICAgICB2YWx1ZXNbMV0uc2xpY2UoLTEpID09IFwiJVwiICYmIChncmVlbiAqPSAyLjU1KTtcbiAgICAgICAgICAgICAgICBibHVlID0gdG9GbG9hdCh2YWx1ZXNbMl0pO1xuICAgICAgICAgICAgICAgIHZhbHVlc1syXS5zbGljZSgtMSkgPT0gXCIlXCIgJiYgKGJsdWUgKj0gMi41NSk7XG4gICAgICAgICAgICAgICAgKHZhbHVlc1swXS5zbGljZSgtMykgPT0gXCJkZWdcIiB8fCB2YWx1ZXNbMF0uc2xpY2UoLTEpID09IFwiXFx4YjBcIikgJiYgKHJlZCAvPSAzNjApO1xuICAgICAgICAgICAgICAgIHJnYlsxXS50b0xvd2VyQ2FzZSgpLnNsaWNlKDAsIDQpID09IFwiaHNiYVwiICYmIChvcGFjaXR5ID0gdG9GbG9hdCh2YWx1ZXNbM10pKTtcbiAgICAgICAgICAgICAgICB2YWx1ZXNbM10gJiYgdmFsdWVzWzNdLnNsaWNlKC0xKSA9PSBcIiVcIiAmJiAob3BhY2l0eSAvPSAxMDApO1xuICAgICAgICAgICAgICAgIHJldHVybiBSLmhzYjJyZ2IocmVkLCBncmVlbiwgYmx1ZSwgb3BhY2l0eSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmdiWzZdKSB7XG4gICAgICAgICAgICAgICAgdmFsdWVzID0gcmdiWzZdW3NwbGl0XShjb21tYVNwYWNlcyk7XG4gICAgICAgICAgICAgICAgcmVkID0gdG9GbG9hdCh2YWx1ZXNbMF0pO1xuICAgICAgICAgICAgICAgIHZhbHVlc1swXS5zbGljZSgtMSkgPT0gXCIlXCIgJiYgKHJlZCAqPSAyLjU1KTtcbiAgICAgICAgICAgICAgICBncmVlbiA9IHRvRmxvYXQodmFsdWVzWzFdKTtcbiAgICAgICAgICAgICAgICB2YWx1ZXNbMV0uc2xpY2UoLTEpID09IFwiJVwiICYmIChncmVlbiAqPSAyLjU1KTtcbiAgICAgICAgICAgICAgICBibHVlID0gdG9GbG9hdCh2YWx1ZXNbMl0pO1xuICAgICAgICAgICAgICAgIHZhbHVlc1syXS5zbGljZSgtMSkgPT0gXCIlXCIgJiYgKGJsdWUgKj0gMi41NSk7XG4gICAgICAgICAgICAgICAgKHZhbHVlc1swXS5zbGljZSgtMykgPT0gXCJkZWdcIiB8fCB2YWx1ZXNbMF0uc2xpY2UoLTEpID09IFwiXFx4YjBcIikgJiYgKHJlZCAvPSAzNjApO1xuICAgICAgICAgICAgICAgIHJnYlsxXS50b0xvd2VyQ2FzZSgpLnNsaWNlKDAsIDQpID09IFwiaHNsYVwiICYmIChvcGFjaXR5ID0gdG9GbG9hdCh2YWx1ZXNbM10pKTtcbiAgICAgICAgICAgICAgICB2YWx1ZXNbM10gJiYgdmFsdWVzWzNdLnNsaWNlKC0xKSA9PSBcIiVcIiAmJiAob3BhY2l0eSAvPSAxMDApO1xuICAgICAgICAgICAgICAgIHJldHVybiBSLmhzbDJyZ2IocmVkLCBncmVlbiwgYmx1ZSwgb3BhY2l0eSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZ2IgPSB7cjogcmVkLCBnOiBncmVlbiwgYjogYmx1ZSwgdG9TdHJpbmc6IGNsclRvU3RyaW5nfTtcbiAgICAgICAgICAgIHJnYi5oZXggPSBcIiNcIiArICgxNjc3NzIxNiB8IGJsdWUgfCAoZ3JlZW4gPDwgOCkgfCAocmVkIDw8IDE2KSkudG9TdHJpbmcoMTYpLnNsaWNlKDEpO1xuICAgICAgICAgICAgUi5pcyhvcGFjaXR5LCBcImZpbml0ZVwiKSAmJiAocmdiLm9wYWNpdHkgPSBvcGFjaXR5KTtcbiAgICAgICAgICAgIHJldHVybiByZ2I7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtyOiAtMSwgZzogLTEsIGI6IC0xLCBoZXg6IFwibm9uZVwiLCBlcnJvcjogMSwgdG9TdHJpbmc6IGNsclRvU3RyaW5nfTtcbiAgICB9LCBSKTtcbiAgICBcbiAgICBSLmhzYiA9IGNhY2hlcihmdW5jdGlvbiAoaCwgcywgYikge1xuICAgICAgICByZXR1cm4gUi5oc2IycmdiKGgsIHMsIGIpLmhleDtcbiAgICB9KTtcbiAgICBcbiAgICBSLmhzbCA9IGNhY2hlcihmdW5jdGlvbiAoaCwgcywgbCkge1xuICAgICAgICByZXR1cm4gUi5oc2wycmdiKGgsIHMsIGwpLmhleDtcbiAgICB9KTtcbiAgICBcbiAgICBSLnJnYiA9IGNhY2hlcihmdW5jdGlvbiAociwgZywgYikge1xuICAgICAgICByZXR1cm4gXCIjXCIgKyAoMTY3NzcyMTYgfCBiIHwgKGcgPDwgOCkgfCAociA8PCAxNikpLnRvU3RyaW5nKDE2KS5zbGljZSgxKTtcbiAgICB9KTtcbiAgICBcbiAgICBSLmdldENvbG9yID0gZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgIHZhciBzdGFydCA9IHRoaXMuZ2V0Q29sb3Iuc3RhcnQgPSB0aGlzLmdldENvbG9yLnN0YXJ0IHx8IHtoOiAwLCBzOiAxLCBiOiB2YWx1ZSB8fCAuNzV9LFxuICAgICAgICAgICAgcmdiID0gdGhpcy5oc2IycmdiKHN0YXJ0LmgsIHN0YXJ0LnMsIHN0YXJ0LmIpO1xuICAgICAgICBzdGFydC5oICs9IC4wNzU7XG4gICAgICAgIGlmIChzdGFydC5oID4gMSkge1xuICAgICAgICAgICAgc3RhcnQuaCA9IDA7XG4gICAgICAgICAgICBzdGFydC5zIC09IC4yO1xuICAgICAgICAgICAgc3RhcnQucyA8PSAwICYmICh0aGlzLmdldENvbG9yLnN0YXJ0ID0ge2g6IDAsIHM6IDEsIGI6IHN0YXJ0LmJ9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmdiLmhleDtcbiAgICB9O1xuICAgIFxuICAgIFIuZ2V0Q29sb3IucmVzZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLnN0YXJ0O1xuICAgIH07XG5cbiAgICAvLyBodHRwOi8vc2NoZXBlcnMuY2MvZ2V0dGluZy10by10aGUtcG9pbnRcbiAgICBmdW5jdGlvbiBjYXRtdWxsUm9tMmJlemllcihjcnAsIHopIHtcbiAgICAgICAgdmFyIGQgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlMZW4gPSBjcnAubGVuZ3RoOyBpTGVuIC0gMiAqICF6ID4gaTsgaSArPSAyKSB7XG4gICAgICAgICAgICB2YXIgcCA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIHt4OiArY3JwW2kgLSAyXSwgeTogK2NycFtpIC0gMV19LFxuICAgICAgICAgICAgICAgICAgICAgICAge3g6ICtjcnBbaV0sICAgICB5OiArY3JwW2kgKyAxXX0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7eDogK2NycFtpICsgMl0sIHk6ICtjcnBbaSArIDNdfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHt4OiArY3JwW2kgKyA0XSwgeTogK2NycFtpICsgNV19XG4gICAgICAgICAgICAgICAgICAgIF07XG4gICAgICAgICAgICBpZiAoeikge1xuICAgICAgICAgICAgICAgIGlmICghaSkge1xuICAgICAgICAgICAgICAgICAgICBwWzBdID0ge3g6ICtjcnBbaUxlbiAtIDJdLCB5OiArY3JwW2lMZW4gLSAxXX07XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpTGVuIC0gNCA9PSBpKSB7XG4gICAgICAgICAgICAgICAgICAgIHBbM10gPSB7eDogK2NycFswXSwgeTogK2NycFsxXX07XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpTGVuIC0gMiA9PSBpKSB7XG4gICAgICAgICAgICAgICAgICAgIHBbMl0gPSB7eDogK2NycFswXSwgeTogK2NycFsxXX07XG4gICAgICAgICAgICAgICAgICAgIHBbM10gPSB7eDogK2NycFsyXSwgeTogK2NycFszXX07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoaUxlbiAtIDQgPT0gaSkge1xuICAgICAgICAgICAgICAgICAgICBwWzNdID0gcFsyXTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFpKSB7XG4gICAgICAgICAgICAgICAgICAgIHBbMF0gPSB7eDogK2NycFtpXSwgeTogK2NycFtpICsgMV19O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGQucHVzaChbXCJDXCIsXG4gICAgICAgICAgICAgICAgICAoLXBbMF0ueCArIDYgKiBwWzFdLnggKyBwWzJdLngpIC8gNixcbiAgICAgICAgICAgICAgICAgICgtcFswXS55ICsgNiAqIHBbMV0ueSArIHBbMl0ueSkgLyA2LFxuICAgICAgICAgICAgICAgICAgKHBbMV0ueCArIDYgKiBwWzJdLnggLSBwWzNdLngpIC8gNixcbiAgICAgICAgICAgICAgICAgIChwWzFdLnkgKyA2KnBbMl0ueSAtIHBbM10ueSkgLyA2LFxuICAgICAgICAgICAgICAgICAgcFsyXS54LFxuICAgICAgICAgICAgICAgICAgcFsyXS55XG4gICAgICAgICAgICBdKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBkO1xuICAgIH1cbiAgICBcbiAgICBSLnBhcnNlUGF0aFN0cmluZyA9IGZ1bmN0aW9uIChwYXRoU3RyaW5nKSB7XG4gICAgICAgIGlmICghcGF0aFN0cmluZykge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHB0aCA9IHBhdGhzKHBhdGhTdHJpbmcpO1xuICAgICAgICBpZiAocHRoLmFycikge1xuICAgICAgICAgICAgcmV0dXJuIHBhdGhDbG9uZShwdGguYXJyKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgdmFyIHBhcmFtQ291bnRzID0ge2E6IDcsIGM6IDYsIGg6IDEsIGw6IDIsIG06IDIsIHI6IDQsIHE6IDQsIHM6IDQsIHQ6IDIsIHY6IDEsIHo6IDB9LFxuICAgICAgICAgICAgZGF0YSA9IFtdO1xuICAgICAgICBpZiAoUi5pcyhwYXRoU3RyaW5nLCBhcnJheSkgJiYgUi5pcyhwYXRoU3RyaW5nWzBdLCBhcnJheSkpIHsgLy8gcm91Z2ggYXNzdW1wdGlvblxuICAgICAgICAgICAgZGF0YSA9IHBhdGhDbG9uZShwYXRoU3RyaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWRhdGEubGVuZ3RoKSB7XG4gICAgICAgICAgICBTdHIocGF0aFN0cmluZykucmVwbGFjZShwYXRoQ29tbWFuZCwgZnVuY3Rpb24gKGEsIGIsIGMpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gW10sXG4gICAgICAgICAgICAgICAgICAgIG5hbWUgPSBiLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgYy5yZXBsYWNlKHBhdGhWYWx1ZXMsIGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICAgICAgICAgIGIgJiYgcGFyYW1zLnB1c2goK2IpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGlmIChuYW1lID09IFwibVwiICYmIHBhcmFtcy5sZW5ndGggPiAyKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEucHVzaChbYl1bY29uY2F0XShwYXJhbXMuc3BsaWNlKDAsIDIpKSk7XG4gICAgICAgICAgICAgICAgICAgIG5hbWUgPSBcImxcIjtcbiAgICAgICAgICAgICAgICAgICAgYiA9IGIgPT0gXCJtXCIgPyBcImxcIiA6IFwiTFwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobmFtZSA9PSBcInJcIikge1xuICAgICAgICAgICAgICAgICAgICBkYXRhLnB1c2goW2JdW2NvbmNhdF0ocGFyYW1zKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHdoaWxlIChwYXJhbXMubGVuZ3RoID49IHBhcmFtQ291bnRzW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEucHVzaChbYl1bY29uY2F0XShwYXJhbXMuc3BsaWNlKDAsIHBhcmFtQ291bnRzW25hbWVdKSkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXBhcmFtQ291bnRzW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGRhdGEudG9TdHJpbmcgPSBSLl9wYXRoMnN0cmluZztcbiAgICAgICAgcHRoLmFyciA9IHBhdGhDbG9uZShkYXRhKTtcbiAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfTtcbiAgICBcbiAgICBSLnBhcnNlVHJhbnNmb3JtU3RyaW5nID0gY2FjaGVyKGZ1bmN0aW9uIChUU3RyaW5nKSB7XG4gICAgICAgIGlmICghVFN0cmluZykge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhcmFtQ291bnRzID0ge3I6IDMsIHM6IDQsIHQ6IDIsIG06IDZ9LFxuICAgICAgICAgICAgZGF0YSA9IFtdO1xuICAgICAgICBpZiAoUi5pcyhUU3RyaW5nLCBhcnJheSkgJiYgUi5pcyhUU3RyaW5nWzBdLCBhcnJheSkpIHsgLy8gcm91Z2ggYXNzdW1wdGlvblxuICAgICAgICAgICAgZGF0YSA9IHBhdGhDbG9uZShUU3RyaW5nKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWRhdGEubGVuZ3RoKSB7XG4gICAgICAgICAgICBTdHIoVFN0cmluZykucmVwbGFjZSh0Q29tbWFuZCwgZnVuY3Rpb24gKGEsIGIsIGMpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gW10sXG4gICAgICAgICAgICAgICAgICAgIG5hbWUgPSBsb3dlckNhc2UuY2FsbChiKTtcbiAgICAgICAgICAgICAgICBjLnJlcGxhY2UocGF0aFZhbHVlcywgZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgYiAmJiBwYXJhbXMucHVzaCgrYik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgZGF0YS5wdXNoKFtiXVtjb25jYXRdKHBhcmFtcykpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZGF0YS50b1N0cmluZyA9IFIuX3BhdGgyc3RyaW5nO1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9KTtcbiAgICAvLyBQQVRIU1xuICAgIHZhciBwYXRocyA9IGZ1bmN0aW9uIChwcykge1xuICAgICAgICB2YXIgcCA9IHBhdGhzLnBzID0gcGF0aHMucHMgfHwge307XG4gICAgICAgIGlmIChwW3BzXSkge1xuICAgICAgICAgICAgcFtwc10uc2xlZXAgPSAxMDA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwW3BzXSA9IHtcbiAgICAgICAgICAgICAgICBzbGVlcDogMTAwXG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIHApIGlmIChwW2hhc10oa2V5KSAmJiBrZXkgIT0gcHMpIHtcbiAgICAgICAgICAgICAgICBwW2tleV0uc2xlZXAtLTtcbiAgICAgICAgICAgICAgICAhcFtrZXldLnNsZWVwICYmIGRlbGV0ZSBwW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcFtwc107XG4gICAgfTtcbiAgICBcbiAgICBSLmZpbmREb3RzQXRTZWdtZW50ID0gZnVuY3Rpb24gKHAxeCwgcDF5LCBjMXgsIGMxeSwgYzJ4LCBjMnksIHAyeCwgcDJ5LCB0KSB7XG4gICAgICAgIHZhciB0MSA9IDEgLSB0LFxuICAgICAgICAgICAgdDEzID0gcG93KHQxLCAzKSxcbiAgICAgICAgICAgIHQxMiA9IHBvdyh0MSwgMiksXG4gICAgICAgICAgICB0MiA9IHQgKiB0LFxuICAgICAgICAgICAgdDMgPSB0MiAqIHQsXG4gICAgICAgICAgICB4ID0gdDEzICogcDF4ICsgdDEyICogMyAqIHQgKiBjMXggKyB0MSAqIDMgKiB0ICogdCAqIGMyeCArIHQzICogcDJ4LFxuICAgICAgICAgICAgeSA9IHQxMyAqIHAxeSArIHQxMiAqIDMgKiB0ICogYzF5ICsgdDEgKiAzICogdCAqIHQgKiBjMnkgKyB0MyAqIHAyeSxcbiAgICAgICAgICAgIG14ID0gcDF4ICsgMiAqIHQgKiAoYzF4IC0gcDF4KSArIHQyICogKGMyeCAtIDIgKiBjMXggKyBwMXgpLFxuICAgICAgICAgICAgbXkgPSBwMXkgKyAyICogdCAqIChjMXkgLSBwMXkpICsgdDIgKiAoYzJ5IC0gMiAqIGMxeSArIHAxeSksXG4gICAgICAgICAgICBueCA9IGMxeCArIDIgKiB0ICogKGMyeCAtIGMxeCkgKyB0MiAqIChwMnggLSAyICogYzJ4ICsgYzF4KSxcbiAgICAgICAgICAgIG55ID0gYzF5ICsgMiAqIHQgKiAoYzJ5IC0gYzF5KSArIHQyICogKHAyeSAtIDIgKiBjMnkgKyBjMXkpLFxuICAgICAgICAgICAgYXggPSB0MSAqIHAxeCArIHQgKiBjMXgsXG4gICAgICAgICAgICBheSA9IHQxICogcDF5ICsgdCAqIGMxeSxcbiAgICAgICAgICAgIGN4ID0gdDEgKiBjMnggKyB0ICogcDJ4LFxuICAgICAgICAgICAgY3kgPSB0MSAqIGMyeSArIHQgKiBwMnksXG4gICAgICAgICAgICBhbHBoYSA9ICg5MCAtIG1hdGguYXRhbjIobXggLSBueCwgbXkgLSBueSkgKiAxODAgLyBQSSk7XG4gICAgICAgIChteCA+IG54IHx8IG15IDwgbnkpICYmIChhbHBoYSArPSAxODApO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogeCxcbiAgICAgICAgICAgIHk6IHksXG4gICAgICAgICAgICBtOiB7eDogbXgsIHk6IG15fSxcbiAgICAgICAgICAgIG46IHt4OiBueCwgeTogbnl9LFxuICAgICAgICAgICAgc3RhcnQ6IHt4OiBheCwgeTogYXl9LFxuICAgICAgICAgICAgZW5kOiB7eDogY3gsIHk6IGN5fSxcbiAgICAgICAgICAgIGFscGhhOiBhbHBoYVxuICAgICAgICB9O1xuICAgIH07XG4gICAgXG4gICAgUi5iZXppZXJCQm94ID0gZnVuY3Rpb24gKHAxeCwgcDF5LCBjMXgsIGMxeSwgYzJ4LCBjMnksIHAyeCwgcDJ5KSB7XG4gICAgICAgIGlmICghUi5pcyhwMXgsIFwiYXJyYXlcIikpIHtcbiAgICAgICAgICAgIHAxeCA9IFtwMXgsIHAxeSwgYzF4LCBjMXksIGMyeCwgYzJ5LCBwMngsIHAyeV07XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGJib3ggPSBjdXJ2ZURpbS5hcHBseShudWxsLCBwMXgpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogYmJveC5taW4ueCxcbiAgICAgICAgICAgIHk6IGJib3gubWluLnksXG4gICAgICAgICAgICB4MjogYmJveC5tYXgueCxcbiAgICAgICAgICAgIHkyOiBiYm94Lm1heC55LFxuICAgICAgICAgICAgd2lkdGg6IGJib3gubWF4LnggLSBiYm94Lm1pbi54LFxuICAgICAgICAgICAgaGVpZ2h0OiBiYm94Lm1heC55IC0gYmJveC5taW4ueVxuICAgICAgICB9O1xuICAgIH07XG4gICAgXG4gICAgUi5pc1BvaW50SW5zaWRlQkJveCA9IGZ1bmN0aW9uIChiYm94LCB4LCB5KSB7XG4gICAgICAgIHJldHVybiB4ID49IGJib3gueCAmJiB4IDw9IGJib3gueDIgJiYgeSA+PSBiYm94LnkgJiYgeSA8PSBiYm94LnkyO1xuICAgIH07XG4gICAgXG4gICAgUi5pc0JCb3hJbnRlcnNlY3QgPSBmdW5jdGlvbiAoYmJveDEsIGJib3gyKSB7XG4gICAgICAgIHZhciBpID0gUi5pc1BvaW50SW5zaWRlQkJveDtcbiAgICAgICAgcmV0dXJuIGkoYmJveDIsIGJib3gxLngsIGJib3gxLnkpXG4gICAgICAgICAgICB8fCBpKGJib3gyLCBiYm94MS54MiwgYmJveDEueSlcbiAgICAgICAgICAgIHx8IGkoYmJveDIsIGJib3gxLngsIGJib3gxLnkyKVxuICAgICAgICAgICAgfHwgaShiYm94MiwgYmJveDEueDIsIGJib3gxLnkyKVxuICAgICAgICAgICAgfHwgaShiYm94MSwgYmJveDIueCwgYmJveDIueSlcbiAgICAgICAgICAgIHx8IGkoYmJveDEsIGJib3gyLngyLCBiYm94Mi55KVxuICAgICAgICAgICAgfHwgaShiYm94MSwgYmJveDIueCwgYmJveDIueTIpXG4gICAgICAgICAgICB8fCBpKGJib3gxLCBiYm94Mi54MiwgYmJveDIueTIpXG4gICAgICAgICAgICB8fCAoYmJveDEueCA8IGJib3gyLngyICYmIGJib3gxLnggPiBiYm94Mi54IHx8IGJib3gyLnggPCBiYm94MS54MiAmJiBiYm94Mi54ID4gYmJveDEueClcbiAgICAgICAgICAgICYmIChiYm94MS55IDwgYmJveDIueTIgJiYgYmJveDEueSA+IGJib3gyLnkgfHwgYmJveDIueSA8IGJib3gxLnkyICYmIGJib3gyLnkgPiBiYm94MS55KTtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIGJhc2UzKHQsIHAxLCBwMiwgcDMsIHA0KSB7XG4gICAgICAgIHZhciB0MSA9IC0zICogcDEgKyA5ICogcDIgLSA5ICogcDMgKyAzICogcDQsXG4gICAgICAgICAgICB0MiA9IHQgKiB0MSArIDYgKiBwMSAtIDEyICogcDIgKyA2ICogcDM7XG4gICAgICAgIHJldHVybiB0ICogdDIgLSAzICogcDEgKyAzICogcDI7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGJlemxlbih4MSwgeTEsIHgyLCB5MiwgeDMsIHkzLCB4NCwgeTQsIHopIHtcbiAgICAgICAgaWYgKHogPT0gbnVsbCkge1xuICAgICAgICAgICAgeiA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgeiA9IHogPiAxID8gMSA6IHogPCAwID8gMCA6IHo7XG4gICAgICAgIHZhciB6MiA9IHogLyAyLFxuICAgICAgICAgICAgbiA9IDEyLFxuICAgICAgICAgICAgVHZhbHVlcyA9IFstMC4xMjUyLDAuMTI1MiwtMC4zNjc4LDAuMzY3OCwtMC41ODczLDAuNTg3MywtMC43Njk5LDAuNzY5OSwtMC45MDQxLDAuOTA0MSwtMC45ODE2LDAuOTgxNl0sXG4gICAgICAgICAgICBDdmFsdWVzID0gWzAuMjQ5MSwwLjI0OTEsMC4yMzM1LDAuMjMzNSwwLjIwMzIsMC4yMDMyLDAuMTYwMSwwLjE2MDEsMC4xMDY5LDAuMTA2OSwwLjA0NzIsMC4wNDcyXSxcbiAgICAgICAgICAgIHN1bSA9IDA7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgY3QgPSB6MiAqIFR2YWx1ZXNbaV0gKyB6MixcbiAgICAgICAgICAgICAgICB4YmFzZSA9IGJhc2UzKGN0LCB4MSwgeDIsIHgzLCB4NCksXG4gICAgICAgICAgICAgICAgeWJhc2UgPSBiYXNlMyhjdCwgeTEsIHkyLCB5MywgeTQpLFxuICAgICAgICAgICAgICAgIGNvbWIgPSB4YmFzZSAqIHhiYXNlICsgeWJhc2UgKiB5YmFzZTtcbiAgICAgICAgICAgIHN1bSArPSBDdmFsdWVzW2ldICogbWF0aC5zcXJ0KGNvbWIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB6MiAqIHN1bTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZ2V0VGF0TGVuKHgxLCB5MSwgeDIsIHkyLCB4MywgeTMsIHg0LCB5NCwgbGwpIHtcbiAgICAgICAgaWYgKGxsIDwgMCB8fCBiZXpsZW4oeDEsIHkxLCB4MiwgeTIsIHgzLCB5MywgeDQsIHk0KSA8IGxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHQgPSAxLFxuICAgICAgICAgICAgc3RlcCA9IHQgLyAyLFxuICAgICAgICAgICAgdDIgPSB0IC0gc3RlcCxcbiAgICAgICAgICAgIGwsXG4gICAgICAgICAgICBlID0gLjAxO1xuICAgICAgICBsID0gYmV6bGVuKHgxLCB5MSwgeDIsIHkyLCB4MywgeTMsIHg0LCB5NCwgdDIpO1xuICAgICAgICB3aGlsZSAoYWJzKGwgLSBsbCkgPiBlKSB7XG4gICAgICAgICAgICBzdGVwIC89IDI7XG4gICAgICAgICAgICB0MiArPSAobCA8IGxsID8gMSA6IC0xKSAqIHN0ZXA7XG4gICAgICAgICAgICBsID0gYmV6bGVuKHgxLCB5MSwgeDIsIHkyLCB4MywgeTMsIHg0LCB5NCwgdDIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0MjtcbiAgICB9XG4gICAgZnVuY3Rpb24gaW50ZXJzZWN0KHgxLCB5MSwgeDIsIHkyLCB4MywgeTMsIHg0LCB5NCkge1xuICAgICAgICBpZiAoXG4gICAgICAgICAgICBtbWF4KHgxLCB4MikgPCBtbWluKHgzLCB4NCkgfHxcbiAgICAgICAgICAgIG1taW4oeDEsIHgyKSA+IG1tYXgoeDMsIHg0KSB8fFxuICAgICAgICAgICAgbW1heCh5MSwgeTIpIDwgbW1pbih5MywgeTQpIHx8XG4gICAgICAgICAgICBtbWluKHkxLCB5MikgPiBtbWF4KHkzLCB5NClcbiAgICAgICAgKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG54ID0gKHgxICogeTIgLSB5MSAqIHgyKSAqICh4MyAtIHg0KSAtICh4MSAtIHgyKSAqICh4MyAqIHk0IC0geTMgKiB4NCksXG4gICAgICAgICAgICBueSA9ICh4MSAqIHkyIC0geTEgKiB4MikgKiAoeTMgLSB5NCkgLSAoeTEgLSB5MikgKiAoeDMgKiB5NCAtIHkzICogeDQpLFxuICAgICAgICAgICAgZGVub21pbmF0b3IgPSAoeDEgLSB4MikgKiAoeTMgLSB5NCkgLSAoeTEgLSB5MikgKiAoeDMgLSB4NCk7XG5cbiAgICAgICAgaWYgKCFkZW5vbWluYXRvcikge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBweCA9IG54IC8gZGVub21pbmF0b3IsXG4gICAgICAgICAgICBweSA9IG55IC8gZGVub21pbmF0b3IsXG4gICAgICAgICAgICBweDIgPSArcHgudG9GaXhlZCgyKSxcbiAgICAgICAgICAgIHB5MiA9ICtweS50b0ZpeGVkKDIpO1xuICAgICAgICBpZiAoXG4gICAgICAgICAgICBweDIgPCArbW1pbih4MSwgeDIpLnRvRml4ZWQoMikgfHxcbiAgICAgICAgICAgIHB4MiA+ICttbWF4KHgxLCB4MikudG9GaXhlZCgyKSB8fFxuICAgICAgICAgICAgcHgyIDwgK21taW4oeDMsIHg0KS50b0ZpeGVkKDIpIHx8XG4gICAgICAgICAgICBweDIgPiArbW1heCh4MywgeDQpLnRvRml4ZWQoMikgfHxcbiAgICAgICAgICAgIHB5MiA8ICttbWluKHkxLCB5MikudG9GaXhlZCgyKSB8fFxuICAgICAgICAgICAgcHkyID4gK21tYXgoeTEsIHkyKS50b0ZpeGVkKDIpIHx8XG4gICAgICAgICAgICBweTIgPCArbW1pbih5MywgeTQpLnRvRml4ZWQoMikgfHxcbiAgICAgICAgICAgIHB5MiA+ICttbWF4KHkzLCB5NCkudG9GaXhlZCgyKVxuICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge3g6IHB4LCB5OiBweX07XG4gICAgfVxuICAgIGZ1bmN0aW9uIGludGVyKGJlejEsIGJlejIpIHtcbiAgICAgICAgcmV0dXJuIGludGVySGVscGVyKGJlejEsIGJlejIpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbnRlckNvdW50KGJlejEsIGJlejIpIHtcbiAgICAgICAgcmV0dXJuIGludGVySGVscGVyKGJlejEsIGJlejIsIDEpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbnRlckhlbHBlcihiZXoxLCBiZXoyLCBqdXN0Q291bnQpIHtcbiAgICAgICAgdmFyIGJib3gxID0gUi5iZXppZXJCQm94KGJlejEpLFxuICAgICAgICAgICAgYmJveDIgPSBSLmJlemllckJCb3goYmV6Mik7XG4gICAgICAgIGlmICghUi5pc0JCb3hJbnRlcnNlY3QoYmJveDEsIGJib3gyKSkge1xuICAgICAgICAgICAgcmV0dXJuIGp1c3RDb3VudCA/IDAgOiBbXTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbDEgPSBiZXpsZW4uYXBwbHkoMCwgYmV6MSksXG4gICAgICAgICAgICBsMiA9IGJlemxlbi5hcHBseSgwLCBiZXoyKSxcbiAgICAgICAgICAgIG4xID0gfn4obDEgLyA1KSxcbiAgICAgICAgICAgIG4yID0gfn4obDIgLyA1KSxcbiAgICAgICAgICAgIGRvdHMxID0gW10sXG4gICAgICAgICAgICBkb3RzMiA9IFtdLFxuICAgICAgICAgICAgeHkgPSB7fSxcbiAgICAgICAgICAgIHJlcyA9IGp1c3RDb3VudCA/IDAgOiBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuMSArIDE7IGkrKykge1xuICAgICAgICAgICAgdmFyIHAgPSBSLmZpbmREb3RzQXRTZWdtZW50LmFwcGx5KFIsIGJlejEuY29uY2F0KGkgLyBuMSkpO1xuICAgICAgICAgICAgZG90czEucHVzaCh7eDogcC54LCB5OiBwLnksIHQ6IGkgLyBuMX0pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBuMiArIDE7IGkrKykge1xuICAgICAgICAgICAgcCA9IFIuZmluZERvdHNBdFNlZ21lbnQuYXBwbHkoUiwgYmV6Mi5jb25jYXQoaSAvIG4yKSk7XG4gICAgICAgICAgICBkb3RzMi5wdXNoKHt4OiBwLngsIHk6IHAueSwgdDogaSAvIG4yfSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG4xOyBpKyspIHtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbjI7IGorKykge1xuICAgICAgICAgICAgICAgIHZhciBkaSA9IGRvdHMxW2ldLFxuICAgICAgICAgICAgICAgICAgICBkaTEgPSBkb3RzMVtpICsgMV0sXG4gICAgICAgICAgICAgICAgICAgIGRqID0gZG90czJbal0sXG4gICAgICAgICAgICAgICAgICAgIGRqMSA9IGRvdHMyW2ogKyAxXSxcbiAgICAgICAgICAgICAgICAgICAgY2kgPSBhYnMoZGkxLnggLSBkaS54KSA8IC4wMDEgPyBcInlcIiA6IFwieFwiLFxuICAgICAgICAgICAgICAgICAgICBjaiA9IGFicyhkajEueCAtIGRqLngpIDwgLjAwMSA/IFwieVwiIDogXCJ4XCIsXG4gICAgICAgICAgICAgICAgICAgIGlzID0gaW50ZXJzZWN0KGRpLngsIGRpLnksIGRpMS54LCBkaTEueSwgZGoueCwgZGoueSwgZGoxLngsIGRqMS55KTtcbiAgICAgICAgICAgICAgICBpZiAoaXMpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHh5W2lzLngudG9GaXhlZCg0KV0gPT0gaXMueS50b0ZpeGVkKDQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB4eVtpcy54LnRvRml4ZWQoNCldID0gaXMueS50b0ZpeGVkKDQpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdDEgPSBkaS50ICsgYWJzKChpc1tjaV0gLSBkaVtjaV0pIC8gKGRpMVtjaV0gLSBkaVtjaV0pKSAqIChkaTEudCAtIGRpLnQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgdDIgPSBkai50ICsgYWJzKChpc1tjal0gLSBkaltjal0pIC8gKGRqMVtjal0gLSBkaltjal0pKSAqIChkajEudCAtIGRqLnQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodDEgPj0gMCAmJiB0MSA8PSAxICYmIHQyID49IDAgJiYgdDIgPD0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGp1c3RDb3VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcysrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IGlzLngsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IGlzLnksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHQxOiB0MSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdDI6IHQyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9XG4gICAgXG4gICAgUi5wYXRoSW50ZXJzZWN0aW9uID0gZnVuY3Rpb24gKHBhdGgxLCBwYXRoMikge1xuICAgICAgICByZXR1cm4gaW50ZXJQYXRoSGVscGVyKHBhdGgxLCBwYXRoMik7XG4gICAgfTtcbiAgICBSLnBhdGhJbnRlcnNlY3Rpb25OdW1iZXIgPSBmdW5jdGlvbiAocGF0aDEsIHBhdGgyKSB7XG4gICAgICAgIHJldHVybiBpbnRlclBhdGhIZWxwZXIocGF0aDEsIHBhdGgyLCAxKTtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIGludGVyUGF0aEhlbHBlcihwYXRoMSwgcGF0aDIsIGp1c3RDb3VudCkge1xuICAgICAgICBwYXRoMSA9IFIuX3BhdGgyY3VydmUocGF0aDEpO1xuICAgICAgICBwYXRoMiA9IFIuX3BhdGgyY3VydmUocGF0aDIpO1xuICAgICAgICB2YXIgeDEsIHkxLCB4MiwgeTIsIHgxbSwgeTFtLCB4Mm0sIHkybSwgYmV6MSwgYmV6MixcbiAgICAgICAgICAgIHJlcyA9IGp1c3RDb3VudCA/IDAgOiBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gcGF0aDEubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgdmFyIHBpID0gcGF0aDFbaV07XG4gICAgICAgICAgICBpZiAocGlbMF0gPT0gXCJNXCIpIHtcbiAgICAgICAgICAgICAgICB4MSA9IHgxbSA9IHBpWzFdO1xuICAgICAgICAgICAgICAgIHkxID0geTFtID0gcGlbMl07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChwaVswXSA9PSBcIkNcIikge1xuICAgICAgICAgICAgICAgICAgICBiZXoxID0gW3gxLCB5MV0uY29uY2F0KHBpLnNsaWNlKDEpKTtcbiAgICAgICAgICAgICAgICAgICAgeDEgPSBiZXoxWzZdO1xuICAgICAgICAgICAgICAgICAgICB5MSA9IGJlejFbN107XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYmV6MSA9IFt4MSwgeTEsIHgxLCB5MSwgeDFtLCB5MW0sIHgxbSwgeTFtXTtcbiAgICAgICAgICAgICAgICAgICAgeDEgPSB4MW07XG4gICAgICAgICAgICAgICAgICAgIHkxID0geTFtO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMCwgamogPSBwYXRoMi5sZW5ndGg7IGogPCBqajsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwaiA9IHBhdGgyW2pdO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGpbMF0gPT0gXCJNXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHgyID0geDJtID0gcGpbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICB5MiA9IHkybSA9IHBqWzJdO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBqWzBdID09IFwiQ1wiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmV6MiA9IFt4MiwgeTJdLmNvbmNhdChwai5zbGljZSgxKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDIgPSBiZXoyWzZdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHkyID0gYmV6Mls3XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmV6MiA9IFt4MiwgeTIsIHgyLCB5MiwgeDJtLCB5Mm0sIHgybSwgeTJtXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4MiA9IHgybTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5MiA9IHkybTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpbnRyID0gaW50ZXJIZWxwZXIoYmV6MSwgYmV6MiwganVzdENvdW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChqdXN0Q291bnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXMgKz0gaW50cjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgayA9IDAsIGtrID0gaW50ci5sZW5ndGg7IGsgPCBrazsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludHJba10uc2VnbWVudDEgPSBpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRyW2tdLnNlZ21lbnQyID0gajtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50cltrXS5iZXoxID0gYmV6MTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50cltrXS5iZXoyID0gYmV6MjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzID0gcmVzLmNvbmNhdChpbnRyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICBcbiAgICBSLmlzUG9pbnRJbnNpZGVQYXRoID0gZnVuY3Rpb24gKHBhdGgsIHgsIHkpIHtcbiAgICAgICAgdmFyIGJib3ggPSBSLnBhdGhCQm94KHBhdGgpO1xuICAgICAgICByZXR1cm4gUi5pc1BvaW50SW5zaWRlQkJveChiYm94LCB4LCB5KSAmJlxuICAgICAgICAgICAgICAgaW50ZXJQYXRoSGVscGVyKHBhdGgsIFtbXCJNXCIsIHgsIHldLCBbXCJIXCIsIGJib3gueDIgKyAxMF1dLCAxKSAlIDIgPT0gMTtcbiAgICB9O1xuICAgIFIuX3JlbW92ZWRGYWN0b3J5ID0gZnVuY3Rpb24gKG1ldGhvZG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGV2ZShcInJhcGhhZWwubG9nXCIsIG51bGwsIFwiUmFwaGFcXHhlYmw6IHlvdSBhcmUgY2FsbGluZyB0byBtZXRob2QgXFx1MjAxY1wiICsgbWV0aG9kbmFtZSArIFwiXFx1MjAxZCBvZiByZW1vdmVkIG9iamVjdFwiLCBtZXRob2RuYW1lKTtcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIFxuICAgIHZhciBwYXRoRGltZW5zaW9ucyA9IFIucGF0aEJCb3ggPSBmdW5jdGlvbiAocGF0aCkge1xuICAgICAgICB2YXIgcHRoID0gcGF0aHMocGF0aCk7XG4gICAgICAgIGlmIChwdGguYmJveCkge1xuICAgICAgICAgICAgcmV0dXJuIHB0aC5iYm94O1xuICAgICAgICB9XG4gICAgICAgIGlmICghcGF0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHt4OiAwLCB5OiAwLCB3aWR0aDogMCwgaGVpZ2h0OiAwLCB4MjogMCwgeTI6IDB9O1xuICAgICAgICB9XG4gICAgICAgIHBhdGggPSBwYXRoMmN1cnZlKHBhdGgpO1xuICAgICAgICB2YXIgeCA9IDAsIFxuICAgICAgICAgICAgeSA9IDAsXG4gICAgICAgICAgICBYID0gW10sXG4gICAgICAgICAgICBZID0gW10sXG4gICAgICAgICAgICBwO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBwYXRoLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIHAgPSBwYXRoW2ldO1xuICAgICAgICAgICAgaWYgKHBbMF0gPT0gXCJNXCIpIHtcbiAgICAgICAgICAgICAgICB4ID0gcFsxXTtcbiAgICAgICAgICAgICAgICB5ID0gcFsyXTtcbiAgICAgICAgICAgICAgICBYLnB1c2goeCk7XG4gICAgICAgICAgICAgICAgWS5wdXNoKHkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgZGltID0gY3VydmVEaW0oeCwgeSwgcFsxXSwgcFsyXSwgcFszXSwgcFs0XSwgcFs1XSwgcFs2XSk7XG4gICAgICAgICAgICAgICAgWCA9IFhbY29uY2F0XShkaW0ubWluLngsIGRpbS5tYXgueCk7XG4gICAgICAgICAgICAgICAgWSA9IFlbY29uY2F0XShkaW0ubWluLnksIGRpbS5tYXgueSk7XG4gICAgICAgICAgICAgICAgeCA9IHBbNV07XG4gICAgICAgICAgICAgICAgeSA9IHBbNl07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHhtaW4gPSBtbWluW2FwcGx5XSgwLCBYKSxcbiAgICAgICAgICAgIHltaW4gPSBtbWluW2FwcGx5XSgwLCBZKSxcbiAgICAgICAgICAgIHhtYXggPSBtbWF4W2FwcGx5XSgwLCBYKSxcbiAgICAgICAgICAgIHltYXggPSBtbWF4W2FwcGx5XSgwLCBZKSxcbiAgICAgICAgICAgIGJiID0ge1xuICAgICAgICAgICAgICAgIHg6IHhtaW4sXG4gICAgICAgICAgICAgICAgeTogeW1pbixcbiAgICAgICAgICAgICAgICB4MjogeG1heCxcbiAgICAgICAgICAgICAgICB5MjogeW1heCxcbiAgICAgICAgICAgICAgICB3aWR0aDogeG1heCAtIHhtaW4sXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiB5bWF4IC0geW1pblxuICAgICAgICAgICAgfTtcbiAgICAgICAgcHRoLmJib3ggPSBjbG9uZShiYik7XG4gICAgICAgIHJldHVybiBiYjtcbiAgICB9LFxuICAgICAgICBwYXRoQ2xvbmUgPSBmdW5jdGlvbiAocGF0aEFycmF5KSB7XG4gICAgICAgICAgICB2YXIgcmVzID0gY2xvbmUocGF0aEFycmF5KTtcbiAgICAgICAgICAgIHJlcy50b1N0cmluZyA9IFIuX3BhdGgyc3RyaW5nO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSxcbiAgICAgICAgcGF0aFRvUmVsYXRpdmUgPSBSLl9wYXRoVG9SZWxhdGl2ZSA9IGZ1bmN0aW9uIChwYXRoQXJyYXkpIHtcbiAgICAgICAgICAgIHZhciBwdGggPSBwYXRocyhwYXRoQXJyYXkpO1xuICAgICAgICAgICAgaWYgKHB0aC5yZWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcGF0aENsb25lKHB0aC5yZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFSLmlzKHBhdGhBcnJheSwgYXJyYXkpIHx8ICFSLmlzKHBhdGhBcnJheSAmJiBwYXRoQXJyYXlbMF0sIGFycmF5KSkgeyAvLyByb3VnaCBhc3N1bXB0aW9uXG4gICAgICAgICAgICAgICAgcGF0aEFycmF5ID0gUi5wYXJzZVBhdGhTdHJpbmcocGF0aEFycmF5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciByZXMgPSBbXSxcbiAgICAgICAgICAgICAgICB4ID0gMCxcbiAgICAgICAgICAgICAgICB5ID0gMCxcbiAgICAgICAgICAgICAgICBteCA9IDAsXG4gICAgICAgICAgICAgICAgbXkgPSAwLFxuICAgICAgICAgICAgICAgIHN0YXJ0ID0gMDtcbiAgICAgICAgICAgIGlmIChwYXRoQXJyYXlbMF1bMF0gPT0gXCJNXCIpIHtcbiAgICAgICAgICAgICAgICB4ID0gcGF0aEFycmF5WzBdWzFdO1xuICAgICAgICAgICAgICAgIHkgPSBwYXRoQXJyYXlbMF1bMl07XG4gICAgICAgICAgICAgICAgbXggPSB4O1xuICAgICAgICAgICAgICAgIG15ID0geTtcbiAgICAgICAgICAgICAgICBzdGFydCsrO1xuICAgICAgICAgICAgICAgIHJlcy5wdXNoKFtcIk1cIiwgeCwgeV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IHN0YXJ0LCBpaSA9IHBhdGhBcnJheS5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHIgPSByZXNbaV0gPSBbXSxcbiAgICAgICAgICAgICAgICAgICAgcGEgPSBwYXRoQXJyYXlbaV07XG4gICAgICAgICAgICAgICAgaWYgKHBhWzBdICE9IGxvd2VyQ2FzZS5jYWxsKHBhWzBdKSkge1xuICAgICAgICAgICAgICAgICAgICByWzBdID0gbG93ZXJDYXNlLmNhbGwocGFbMF0pO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHJbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJhXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgclsxXSA9IHBhWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJbMl0gPSBwYVsyXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByWzNdID0gcGFbM107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcls0XSA9IHBhWzRdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJbNV0gPSBwYVs1XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByWzZdID0gKyhwYVs2XSAtIHgpLnRvRml4ZWQoMyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcls3XSA9ICsocGFbN10gLSB5KS50b0ZpeGVkKDMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcInZcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByWzFdID0gKyhwYVsxXSAtIHkpLnRvRml4ZWQoMyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwibVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG14ID0gcGFbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXkgPSBwYVsyXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDEsIGpqID0gcGEubGVuZ3RoOyBqIDwgamo7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByW2pdID0gKyhwYVtqXSAtICgoaiAlIDIpID8geCA6IHkpKS50b0ZpeGVkKDMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHIgPSByZXNbaV0gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhWzBdID09IFwibVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBteCA9IHBhWzFdICsgeDtcbiAgICAgICAgICAgICAgICAgICAgICAgIG15ID0gcGFbMl0gKyB5O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGsgPSAwLCBrayA9IHBhLmxlbmd0aDsgayA8IGtrOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc1tpXVtrXSA9IHBhW2tdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBsZW4gPSByZXNbaV0ubGVuZ3RoO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAocmVzW2ldWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ6XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB4ID0gbXg7XG4gICAgICAgICAgICAgICAgICAgICAgICB5ID0gbXk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImhcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHggKz0gK3Jlc1tpXVtsZW4gLSAxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwidlwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgeSArPSArcmVzW2ldW2xlbiAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB4ICs9ICtyZXNbaV1bbGVuIC0gMl07XG4gICAgICAgICAgICAgICAgICAgICAgICB5ICs9ICtyZXNbaV1bbGVuIC0gMV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzLnRvU3RyaW5nID0gUi5fcGF0aDJzdHJpbmc7XG4gICAgICAgICAgICBwdGgucmVsID0gcGF0aENsb25lKHJlcyk7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9LFxuICAgICAgICBwYXRoVG9BYnNvbHV0ZSA9IFIuX3BhdGhUb0Fic29sdXRlID0gZnVuY3Rpb24gKHBhdGhBcnJheSkge1xuICAgICAgICAgICAgdmFyIHB0aCA9IHBhdGhzKHBhdGhBcnJheSk7XG4gICAgICAgICAgICBpZiAocHRoLmFicykge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoQ2xvbmUocHRoLmFicyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIVIuaXMocGF0aEFycmF5LCBhcnJheSkgfHwgIVIuaXMocGF0aEFycmF5ICYmIHBhdGhBcnJheVswXSwgYXJyYXkpKSB7IC8vIHJvdWdoIGFzc3VtcHRpb25cbiAgICAgICAgICAgICAgICBwYXRoQXJyYXkgPSBSLnBhcnNlUGF0aFN0cmluZyhwYXRoQXJyYXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFwYXRoQXJyYXkgfHwgIXBhdGhBcnJheS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW1tcIk1cIiwgMCwgMF1dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHJlcyA9IFtdLFxuICAgICAgICAgICAgICAgIHggPSAwLFxuICAgICAgICAgICAgICAgIHkgPSAwLFxuICAgICAgICAgICAgICAgIG14ID0gMCxcbiAgICAgICAgICAgICAgICBteSA9IDAsXG4gICAgICAgICAgICAgICAgc3RhcnQgPSAwO1xuICAgICAgICAgICAgaWYgKHBhdGhBcnJheVswXVswXSA9PSBcIk1cIikge1xuICAgICAgICAgICAgICAgIHggPSArcGF0aEFycmF5WzBdWzFdO1xuICAgICAgICAgICAgICAgIHkgPSArcGF0aEFycmF5WzBdWzJdO1xuICAgICAgICAgICAgICAgIG14ID0geDtcbiAgICAgICAgICAgICAgICBteSA9IHk7XG4gICAgICAgICAgICAgICAgc3RhcnQrKztcbiAgICAgICAgICAgICAgICByZXNbMF0gPSBbXCJNXCIsIHgsIHldO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGNyeiA9IHBhdGhBcnJheS5sZW5ndGggPT0gMyAmJiBwYXRoQXJyYXlbMF1bMF0gPT0gXCJNXCIgJiYgcGF0aEFycmF5WzFdWzBdLnRvVXBwZXJDYXNlKCkgPT0gXCJSXCIgJiYgcGF0aEFycmF5WzJdWzBdLnRvVXBwZXJDYXNlKCkgPT0gXCJaXCI7XG4gICAgICAgICAgICBmb3IgKHZhciByLCBwYSwgaSA9IHN0YXJ0LCBpaSA9IHBhdGhBcnJheS5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2gociA9IFtdKTtcbiAgICAgICAgICAgICAgICBwYSA9IHBhdGhBcnJheVtpXTtcbiAgICAgICAgICAgICAgICBpZiAocGFbMF0gIT0gdXBwZXJDYXNlLmNhbGwocGFbMF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJbMF0gPSB1cHBlckNhc2UuY2FsbChwYVswXSk7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoclswXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIkFcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByWzFdID0gcGFbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgclsyXSA9IHBhWzJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJbM10gPSBwYVszXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByWzRdID0gcGFbNF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcls1XSA9IHBhWzVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJbNl0gPSArKHBhWzZdICsgeCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcls3XSA9ICsocGFbN10gKyB5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJWXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgclsxXSA9ICtwYVsxXSArIHk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiSFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJbMV0gPSArcGFbMV0gKyB4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlJcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZG90cyA9IFt4LCB5XVtjb25jYXRdKHBhLnNsaWNlKDEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMiwgamogPSBkb3RzLmxlbmd0aDsgaiA8IGpqOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG90c1tqXSA9ICtkb3RzW2pdICsgeDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZG90c1srK2pdID0gK2RvdHNbal0gKyB5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXMucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzID0gcmVzW2NvbmNhdF0oY2F0bXVsbFJvbTJiZXppZXIoZG90cywgY3J6KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiTVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG14ID0gK3BhWzFdICsgeDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBteSA9ICtwYVsyXSArIHk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaiA9IDEsIGpqID0gcGEubGVuZ3RoOyBqIDwgamo7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByW2pdID0gK3BhW2pdICsgKChqICUgMikgPyB4IDogeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChwYVswXSA9PSBcIlJcIikge1xuICAgICAgICAgICAgICAgICAgICBkb3RzID0gW3gsIHldW2NvbmNhdF0ocGEuc2xpY2UoMSkpO1xuICAgICAgICAgICAgICAgICAgICByZXMucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgIHJlcyA9IHJlc1tjb25jYXRdKGNhdG11bGxSb20yYmV6aWVyKGRvdHMsIGNyeikpO1xuICAgICAgICAgICAgICAgICAgICByID0gW1wiUlwiXVtjb25jYXRdKHBhLnNsaWNlKC0yKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgayA9IDAsIGtrID0gcGEubGVuZ3RoOyBrIDwga2s7IGsrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcltrXSA9IHBhW2tdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHN3aXRjaCAoclswXSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiWlwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgeCA9IG14O1xuICAgICAgICAgICAgICAgICAgICAgICAgeSA9IG15O1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJIXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB4ID0gclsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiVlwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgeSA9IHJbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIk1cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG14ID0gcltyLmxlbmd0aCAtIDJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgbXkgPSByW3IubGVuZ3RoIC0gMV07XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICB4ID0gcltyLmxlbmd0aCAtIDJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgeSA9IHJbci5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXMudG9TdHJpbmcgPSBSLl9wYXRoMnN0cmluZztcbiAgICAgICAgICAgIHB0aC5hYnMgPSBwYXRoQ2xvbmUocmVzKTtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH0sXG4gICAgICAgIGwyYyA9IGZ1bmN0aW9uICh4MSwgeTEsIHgyLCB5Mikge1xuICAgICAgICAgICAgcmV0dXJuIFt4MSwgeTEsIHgyLCB5MiwgeDIsIHkyXTtcbiAgICAgICAgfSxcbiAgICAgICAgcTJjID0gZnVuY3Rpb24gKHgxLCB5MSwgYXgsIGF5LCB4MiwgeTIpIHtcbiAgICAgICAgICAgIHZhciBfMTMgPSAxIC8gMyxcbiAgICAgICAgICAgICAgICBfMjMgPSAyIC8gMztcbiAgICAgICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICAgICAgICAgIF8xMyAqIHgxICsgXzIzICogYXgsXG4gICAgICAgICAgICAgICAgICAgIF8xMyAqIHkxICsgXzIzICogYXksXG4gICAgICAgICAgICAgICAgICAgIF8xMyAqIHgyICsgXzIzICogYXgsXG4gICAgICAgICAgICAgICAgICAgIF8xMyAqIHkyICsgXzIzICogYXksXG4gICAgICAgICAgICAgICAgICAgIHgyLFxuICAgICAgICAgICAgICAgICAgICB5MlxuICAgICAgICAgICAgICAgIF07XG4gICAgICAgIH0sXG4gICAgICAgIGEyYyA9IGZ1bmN0aW9uICh4MSwgeTEsIHJ4LCByeSwgYW5nbGUsIGxhcmdlX2FyY19mbGFnLCBzd2VlcF9mbGFnLCB4MiwgeTIsIHJlY3Vyc2l2ZSkge1xuICAgICAgICAgICAgLy8gZm9yIG1vcmUgaW5mb3JtYXRpb24gb2Ygd2hlcmUgdGhpcyBtYXRoIGNhbWUgZnJvbSB2aXNpdDpcbiAgICAgICAgICAgIC8vIGh0dHA6Ly93d3cudzMub3JnL1RSL1NWRzExL2ltcGxub3RlLmh0bWwjQXJjSW1wbGVtZW50YXRpb25Ob3Rlc1xuICAgICAgICAgICAgdmFyIF8xMjAgPSBQSSAqIDEyMCAvIDE4MCxcbiAgICAgICAgICAgICAgICByYWQgPSBQSSAvIDE4MCAqICgrYW5nbGUgfHwgMCksXG4gICAgICAgICAgICAgICAgcmVzID0gW10sXG4gICAgICAgICAgICAgICAgeHksXG4gICAgICAgICAgICAgICAgcm90YXRlID0gY2FjaGVyKGZ1bmN0aW9uICh4LCB5LCByYWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIFggPSB4ICogbWF0aC5jb3MocmFkKSAtIHkgKiBtYXRoLnNpbihyYWQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgWSA9IHggKiBtYXRoLnNpbihyYWQpICsgeSAqIG1hdGguY29zKHJhZCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7eDogWCwgeTogWX07XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoIXJlY3Vyc2l2ZSkge1xuICAgICAgICAgICAgICAgIHh5ID0gcm90YXRlKHgxLCB5MSwgLXJhZCk7XG4gICAgICAgICAgICAgICAgeDEgPSB4eS54O1xuICAgICAgICAgICAgICAgIHkxID0geHkueTtcbiAgICAgICAgICAgICAgICB4eSA9IHJvdGF0ZSh4MiwgeTIsIC1yYWQpO1xuICAgICAgICAgICAgICAgIHgyID0geHkueDtcbiAgICAgICAgICAgICAgICB5MiA9IHh5Lnk7XG4gICAgICAgICAgICAgICAgdmFyIGNvcyA9IG1hdGguY29zKFBJIC8gMTgwICogYW5nbGUpLFxuICAgICAgICAgICAgICAgICAgICBzaW4gPSBtYXRoLnNpbihQSSAvIDE4MCAqIGFuZ2xlKSxcbiAgICAgICAgICAgICAgICAgICAgeCA9ICh4MSAtIHgyKSAvIDIsXG4gICAgICAgICAgICAgICAgICAgIHkgPSAoeTEgLSB5MikgLyAyO1xuICAgICAgICAgICAgICAgIHZhciBoID0gKHggKiB4KSAvIChyeCAqIHJ4KSArICh5ICogeSkgLyAocnkgKiByeSk7XG4gICAgICAgICAgICAgICAgaWYgKGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGggPSBtYXRoLnNxcnQoaCk7XG4gICAgICAgICAgICAgICAgICAgIHJ4ID0gaCAqIHJ4O1xuICAgICAgICAgICAgICAgICAgICByeSA9IGggKiByeTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHJ4MiA9IHJ4ICogcngsXG4gICAgICAgICAgICAgICAgICAgIHJ5MiA9IHJ5ICogcnksXG4gICAgICAgICAgICAgICAgICAgIGsgPSAobGFyZ2VfYXJjX2ZsYWcgPT0gc3dlZXBfZmxhZyA/IC0xIDogMSkgKlxuICAgICAgICAgICAgICAgICAgICAgICAgbWF0aC5zcXJ0KGFicygocngyICogcnkyIC0gcngyICogeSAqIHkgLSByeTIgKiB4ICogeCkgLyAocngyICogeSAqIHkgKyByeTIgKiB4ICogeCkpKSxcbiAgICAgICAgICAgICAgICAgICAgY3ggPSBrICogcnggKiB5IC8gcnkgKyAoeDEgKyB4MikgLyAyLFxuICAgICAgICAgICAgICAgICAgICBjeSA9IGsgKiAtcnkgKiB4IC8gcnggKyAoeTEgKyB5MikgLyAyLFxuICAgICAgICAgICAgICAgICAgICBmMSA9IG1hdGguYXNpbigoKHkxIC0gY3kpIC8gcnkpLnRvRml4ZWQoOSkpLFxuICAgICAgICAgICAgICAgICAgICBmMiA9IG1hdGguYXNpbigoKHkyIC0gY3kpIC8gcnkpLnRvRml4ZWQoOSkpO1xuXG4gICAgICAgICAgICAgICAgZjEgPSB4MSA8IGN4ID8gUEkgLSBmMSA6IGYxO1xuICAgICAgICAgICAgICAgIGYyID0geDIgPCBjeCA/IFBJIC0gZjIgOiBmMjtcbiAgICAgICAgICAgICAgICBmMSA8IDAgJiYgKGYxID0gUEkgKiAyICsgZjEpO1xuICAgICAgICAgICAgICAgIGYyIDwgMCAmJiAoZjIgPSBQSSAqIDIgKyBmMik7XG4gICAgICAgICAgICAgICAgaWYgKHN3ZWVwX2ZsYWcgJiYgZjEgPiBmMikge1xuICAgICAgICAgICAgICAgICAgICBmMSA9IGYxIC0gUEkgKiAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoIXN3ZWVwX2ZsYWcgJiYgZjIgPiBmMSkge1xuICAgICAgICAgICAgICAgICAgICBmMiA9IGYyIC0gUEkgKiAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZjEgPSByZWN1cnNpdmVbMF07XG4gICAgICAgICAgICAgICAgZjIgPSByZWN1cnNpdmVbMV07XG4gICAgICAgICAgICAgICAgY3ggPSByZWN1cnNpdmVbMl07XG4gICAgICAgICAgICAgICAgY3kgPSByZWN1cnNpdmVbM107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZGYgPSBmMiAtIGYxO1xuICAgICAgICAgICAgaWYgKGFicyhkZikgPiBfMTIwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGYyb2xkID0gZjIsXG4gICAgICAgICAgICAgICAgICAgIHgyb2xkID0geDIsXG4gICAgICAgICAgICAgICAgICAgIHkyb2xkID0geTI7XG4gICAgICAgICAgICAgICAgZjIgPSBmMSArIF8xMjAgKiAoc3dlZXBfZmxhZyAmJiBmMiA+IGYxID8gMSA6IC0xKTtcbiAgICAgICAgICAgICAgICB4MiA9IGN4ICsgcnggKiBtYXRoLmNvcyhmMik7XG4gICAgICAgICAgICAgICAgeTIgPSBjeSArIHJ5ICogbWF0aC5zaW4oZjIpO1xuICAgICAgICAgICAgICAgIHJlcyA9IGEyYyh4MiwgeTIsIHJ4LCByeSwgYW5nbGUsIDAsIHN3ZWVwX2ZsYWcsIHgyb2xkLCB5Mm9sZCwgW2YyLCBmMm9sZCwgY3gsIGN5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZiA9IGYyIC0gZjE7XG4gICAgICAgICAgICB2YXIgYzEgPSBtYXRoLmNvcyhmMSksXG4gICAgICAgICAgICAgICAgczEgPSBtYXRoLnNpbihmMSksXG4gICAgICAgICAgICAgICAgYzIgPSBtYXRoLmNvcyhmMiksXG4gICAgICAgICAgICAgICAgczIgPSBtYXRoLnNpbihmMiksXG4gICAgICAgICAgICAgICAgdCA9IG1hdGgudGFuKGRmIC8gNCksXG4gICAgICAgICAgICAgICAgaHggPSA0IC8gMyAqIHJ4ICogdCxcbiAgICAgICAgICAgICAgICBoeSA9IDQgLyAzICogcnkgKiB0LFxuICAgICAgICAgICAgICAgIG0xID0gW3gxLCB5MV0sXG4gICAgICAgICAgICAgICAgbTIgPSBbeDEgKyBoeCAqIHMxLCB5MSAtIGh5ICogYzFdLFxuICAgICAgICAgICAgICAgIG0zID0gW3gyICsgaHggKiBzMiwgeTIgLSBoeSAqIGMyXSxcbiAgICAgICAgICAgICAgICBtNCA9IFt4MiwgeTJdO1xuICAgICAgICAgICAgbTJbMF0gPSAyICogbTFbMF0gLSBtMlswXTtcbiAgICAgICAgICAgIG0yWzFdID0gMiAqIG0xWzFdIC0gbTJbMV07XG4gICAgICAgICAgICBpZiAocmVjdXJzaXZlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFttMiwgbTMsIG00XVtjb25jYXRdKHJlcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlcyA9IFttMiwgbTMsIG00XVtjb25jYXRdKHJlcykuam9pbigpW3NwbGl0XShcIixcIik7XG4gICAgICAgICAgICAgICAgdmFyIG5ld3JlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IHJlcy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld3Jlc1tpXSA9IGkgJSAyID8gcm90YXRlKHJlc1tpIC0gMV0sIHJlc1tpXSwgcmFkKS55IDogcm90YXRlKHJlc1tpXSwgcmVzW2kgKyAxXSwgcmFkKS54O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3cmVzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBmaW5kRG90QXRTZWdtZW50ID0gZnVuY3Rpb24gKHAxeCwgcDF5LCBjMXgsIGMxeSwgYzJ4LCBjMnksIHAyeCwgcDJ5LCB0KSB7XG4gICAgICAgICAgICB2YXIgdDEgPSAxIC0gdDtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgeDogcG93KHQxLCAzKSAqIHAxeCArIHBvdyh0MSwgMikgKiAzICogdCAqIGMxeCArIHQxICogMyAqIHQgKiB0ICogYzJ4ICsgcG93KHQsIDMpICogcDJ4LFxuICAgICAgICAgICAgICAgIHk6IHBvdyh0MSwgMykgKiBwMXkgKyBwb3codDEsIDIpICogMyAqIHQgKiBjMXkgKyB0MSAqIDMgKiB0ICogdCAqIGMyeSArIHBvdyh0LCAzKSAqIHAyeVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgICAgY3VydmVEaW0gPSBjYWNoZXIoZnVuY3Rpb24gKHAxeCwgcDF5LCBjMXgsIGMxeSwgYzJ4LCBjMnksIHAyeCwgcDJ5KSB7XG4gICAgICAgICAgICB2YXIgYSA9IChjMnggLSAyICogYzF4ICsgcDF4KSAtIChwMnggLSAyICogYzJ4ICsgYzF4KSxcbiAgICAgICAgICAgICAgICBiID0gMiAqIChjMXggLSBwMXgpIC0gMiAqIChjMnggLSBjMXgpLFxuICAgICAgICAgICAgICAgIGMgPSBwMXggLSBjMXgsXG4gICAgICAgICAgICAgICAgdDEgPSAoLWIgKyBtYXRoLnNxcnQoYiAqIGIgLSA0ICogYSAqIGMpKSAvIDIgLyBhLFxuICAgICAgICAgICAgICAgIHQyID0gKC1iIC0gbWF0aC5zcXJ0KGIgKiBiIC0gNCAqIGEgKiBjKSkgLyAyIC8gYSxcbiAgICAgICAgICAgICAgICB5ID0gW3AxeSwgcDJ5XSxcbiAgICAgICAgICAgICAgICB4ID0gW3AxeCwgcDJ4XSxcbiAgICAgICAgICAgICAgICBkb3Q7XG4gICAgICAgICAgICBhYnModDEpID4gXCIxZTEyXCIgJiYgKHQxID0gLjUpO1xuICAgICAgICAgICAgYWJzKHQyKSA+IFwiMWUxMlwiICYmICh0MiA9IC41KTtcbiAgICAgICAgICAgIGlmICh0MSA+IDAgJiYgdDEgPCAxKSB7XG4gICAgICAgICAgICAgICAgZG90ID0gZmluZERvdEF0U2VnbWVudChwMXgsIHAxeSwgYzF4LCBjMXksIGMyeCwgYzJ5LCBwMngsIHAyeSwgdDEpO1xuICAgICAgICAgICAgICAgIHgucHVzaChkb3QueCk7XG4gICAgICAgICAgICAgICAgeS5wdXNoKGRvdC55KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0MiA+IDAgJiYgdDIgPCAxKSB7XG4gICAgICAgICAgICAgICAgZG90ID0gZmluZERvdEF0U2VnbWVudChwMXgsIHAxeSwgYzF4LCBjMXksIGMyeCwgYzJ5LCBwMngsIHAyeSwgdDIpO1xuICAgICAgICAgICAgICAgIHgucHVzaChkb3QueCk7XG4gICAgICAgICAgICAgICAgeS5wdXNoKGRvdC55KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGEgPSAoYzJ5IC0gMiAqIGMxeSArIHAxeSkgLSAocDJ5IC0gMiAqIGMyeSArIGMxeSk7XG4gICAgICAgICAgICBiID0gMiAqIChjMXkgLSBwMXkpIC0gMiAqIChjMnkgLSBjMXkpO1xuICAgICAgICAgICAgYyA9IHAxeSAtIGMxeTtcbiAgICAgICAgICAgIHQxID0gKC1iICsgbWF0aC5zcXJ0KGIgKiBiIC0gNCAqIGEgKiBjKSkgLyAyIC8gYTtcbiAgICAgICAgICAgIHQyID0gKC1iIC0gbWF0aC5zcXJ0KGIgKiBiIC0gNCAqIGEgKiBjKSkgLyAyIC8gYTtcbiAgICAgICAgICAgIGFicyh0MSkgPiBcIjFlMTJcIiAmJiAodDEgPSAuNSk7XG4gICAgICAgICAgICBhYnModDIpID4gXCIxZTEyXCIgJiYgKHQyID0gLjUpO1xuICAgICAgICAgICAgaWYgKHQxID4gMCAmJiB0MSA8IDEpIHtcbiAgICAgICAgICAgICAgICBkb3QgPSBmaW5kRG90QXRTZWdtZW50KHAxeCwgcDF5LCBjMXgsIGMxeSwgYzJ4LCBjMnksIHAyeCwgcDJ5LCB0MSk7XG4gICAgICAgICAgICAgICAgeC5wdXNoKGRvdC54KTtcbiAgICAgICAgICAgICAgICB5LnB1c2goZG90LnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHQyID4gMCAmJiB0MiA8IDEpIHtcbiAgICAgICAgICAgICAgICBkb3QgPSBmaW5kRG90QXRTZWdtZW50KHAxeCwgcDF5LCBjMXgsIGMxeSwgYzJ4LCBjMnksIHAyeCwgcDJ5LCB0Mik7XG4gICAgICAgICAgICAgICAgeC5wdXNoKGRvdC54KTtcbiAgICAgICAgICAgICAgICB5LnB1c2goZG90LnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBtaW46IHt4OiBtbWluW2FwcGx5XSgwLCB4KSwgeTogbW1pblthcHBseV0oMCwgeSl9LFxuICAgICAgICAgICAgICAgIG1heDoge3g6IG1tYXhbYXBwbHldKDAsIHgpLCB5OiBtbWF4W2FwcGx5XSgwLCB5KX1cbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pLFxuICAgICAgICBwYXRoMmN1cnZlID0gUi5fcGF0aDJjdXJ2ZSA9IGNhY2hlcihmdW5jdGlvbiAocGF0aCwgcGF0aDIpIHtcbiAgICAgICAgICAgIHZhciBwdGggPSAhcGF0aDIgJiYgcGF0aHMocGF0aCk7XG4gICAgICAgICAgICBpZiAoIXBhdGgyICYmIHB0aC5jdXJ2ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoQ2xvbmUocHRoLmN1cnZlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBwID0gcGF0aFRvQWJzb2x1dGUocGF0aCksXG4gICAgICAgICAgICAgICAgcDIgPSBwYXRoMiAmJiBwYXRoVG9BYnNvbHV0ZShwYXRoMiksXG4gICAgICAgICAgICAgICAgYXR0cnMgPSB7eDogMCwgeTogMCwgYng6IDAsIGJ5OiAwLCBYOiAwLCBZOiAwLCBxeDogbnVsbCwgcXk6IG51bGx9LFxuICAgICAgICAgICAgICAgIGF0dHJzMiA9IHt4OiAwLCB5OiAwLCBieDogMCwgYnk6IDAsIFg6IDAsIFk6IDAsIHF4OiBudWxsLCBxeTogbnVsbH0sXG4gICAgICAgICAgICAgICAgcHJvY2Vzc1BhdGggPSBmdW5jdGlvbiAocGF0aCwgZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbngsIG55O1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBbXCJDXCIsIGQueCwgZC55LCBkLngsIGQueSwgZC54LCBkLnldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICEocGF0aFswXSBpbiB7VDoxLCBROjF9KSAmJiAoZC5xeCA9IGQucXkgPSBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChwYXRoWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiTVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGQuWCA9IHBhdGhbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZC5ZID0gcGF0aFsyXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJBXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aCA9IFtcIkNcIl1bY29uY2F0XShhMmNbYXBwbHldKDAsIFtkLngsIGQueV1bY29uY2F0XShwYXRoLnNsaWNlKDEpKSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlNcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBueCA9IGQueCArIChkLnggLSAoZC5ieCB8fCBkLngpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBueSA9IGQueSArIChkLnkgLSAoZC5ieSB8fCBkLnkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoID0gW1wiQ1wiLCBueCwgbnldW2NvbmNhdF0ocGF0aC5zbGljZSgxKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiVFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGQucXggPSBkLnggKyAoZC54IC0gKGQucXggfHwgZC54KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZC5xeSA9IGQueSArIChkLnkgLSAoZC5xeSB8fCBkLnkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoID0gW1wiQ1wiXVtjb25jYXRdKHEyYyhkLngsIGQueSwgZC5xeCwgZC5xeSwgcGF0aFsxXSwgcGF0aFsyXSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlFcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkLnF4ID0gcGF0aFsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkLnF5ID0gcGF0aFsyXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoID0gW1wiQ1wiXVtjb25jYXRdKHEyYyhkLngsIGQueSwgcGF0aFsxXSwgcGF0aFsyXSwgcGF0aFszXSwgcGF0aFs0XSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIkxcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoID0gW1wiQ1wiXVtjb25jYXRdKGwyYyhkLngsIGQueSwgcGF0aFsxXSwgcGF0aFsyXSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIkhcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoID0gW1wiQ1wiXVtjb25jYXRdKGwyYyhkLngsIGQueSwgcGF0aFsxXSwgZC55KSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiVlwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggPSBbXCJDXCJdW2NvbmNhdF0obDJjKGQueCwgZC55LCBkLngsIHBhdGhbMV0pKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJaXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aCA9IFtcIkNcIl1bY29uY2F0XShsMmMoZC54LCBkLnksIGQuWCwgZC5ZKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhdGg7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmaXhBcmMgPSBmdW5jdGlvbiAocHAsIGkpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBwW2ldLmxlbmd0aCA+IDcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBwW2ldLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGkgPSBwcFtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChwaS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcC5zcGxpY2UoaSsrLCAwLCBbXCJDXCJdW2NvbmNhdF0ocGkuc3BsaWNlKDAsIDYpKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBwcC5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpaSA9IG1tYXgocC5sZW5ndGgsIHAyICYmIHAyLmxlbmd0aCB8fCAwKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZml4TSA9IGZ1bmN0aW9uIChwYXRoMSwgcGF0aDIsIGExLCBhMiwgaSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGF0aDEgJiYgcGF0aDIgJiYgcGF0aDFbaV1bMF0gPT0gXCJNXCIgJiYgcGF0aDJbaV1bMF0gIT0gXCJNXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGgyLnNwbGljZShpLCAwLCBbXCJNXCIsIGEyLngsIGEyLnldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGExLmJ4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGExLmJ5ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGExLnggPSBwYXRoMVtpXVsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGExLnkgPSBwYXRoMVtpXVsyXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlpID0gbW1heChwLmxlbmd0aCwgcDIgJiYgcDIubGVuZ3RoIHx8IDApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IG1tYXgocC5sZW5ndGgsIHAyICYmIHAyLmxlbmd0aCB8fCAwKTsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBwW2ldID0gcHJvY2Vzc1BhdGgocFtpXSwgYXR0cnMpO1xuICAgICAgICAgICAgICAgIGZpeEFyYyhwLCBpKTtcbiAgICAgICAgICAgICAgICBwMiAmJiAocDJbaV0gPSBwcm9jZXNzUGF0aChwMltpXSwgYXR0cnMyKSk7XG4gICAgICAgICAgICAgICAgcDIgJiYgZml4QXJjKHAyLCBpKTtcbiAgICAgICAgICAgICAgICBmaXhNKHAsIHAyLCBhdHRycywgYXR0cnMyLCBpKTtcbiAgICAgICAgICAgICAgICBmaXhNKHAyLCBwLCBhdHRyczIsIGF0dHJzLCBpKTtcbiAgICAgICAgICAgICAgICB2YXIgc2VnID0gcFtpXSxcbiAgICAgICAgICAgICAgICAgICAgc2VnMiA9IHAyICYmIHAyW2ldLFxuICAgICAgICAgICAgICAgICAgICBzZWdsZW4gPSBzZWcubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICBzZWcybGVuID0gcDIgJiYgc2VnMi5sZW5ndGg7XG4gICAgICAgICAgICAgICAgYXR0cnMueCA9IHNlZ1tzZWdsZW4gLSAyXTtcbiAgICAgICAgICAgICAgICBhdHRycy55ID0gc2VnW3NlZ2xlbiAtIDFdO1xuICAgICAgICAgICAgICAgIGF0dHJzLmJ4ID0gdG9GbG9hdChzZWdbc2VnbGVuIC0gNF0pIHx8IGF0dHJzLng7XG4gICAgICAgICAgICAgICAgYXR0cnMuYnkgPSB0b0Zsb2F0KHNlZ1tzZWdsZW4gLSAzXSkgfHwgYXR0cnMueTtcbiAgICAgICAgICAgICAgICBhdHRyczIuYnggPSBwMiAmJiAodG9GbG9hdChzZWcyW3NlZzJsZW4gLSA0XSkgfHwgYXR0cnMyLngpO1xuICAgICAgICAgICAgICAgIGF0dHJzMi5ieSA9IHAyICYmICh0b0Zsb2F0KHNlZzJbc2VnMmxlbiAtIDNdKSB8fCBhdHRyczIueSk7XG4gICAgICAgICAgICAgICAgYXR0cnMyLnggPSBwMiAmJiBzZWcyW3NlZzJsZW4gLSAyXTtcbiAgICAgICAgICAgICAgICBhdHRyczIueSA9IHAyICYmIHNlZzJbc2VnMmxlbiAtIDFdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFwMikge1xuICAgICAgICAgICAgICAgIHB0aC5jdXJ2ZSA9IHBhdGhDbG9uZShwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwMiA/IFtwLCBwMl0gOiBwO1xuICAgICAgICB9LCBudWxsLCBwYXRoQ2xvbmUpLFxuICAgICAgICBwYXJzZURvdHMgPSBSLl9wYXJzZURvdHMgPSBjYWNoZXIoZnVuY3Rpb24gKGdyYWRpZW50KSB7XG4gICAgICAgICAgICB2YXIgZG90cyA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gZ3JhZGllbnQubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBkb3QgPSB7fSxcbiAgICAgICAgICAgICAgICAgICAgcGFyID0gZ3JhZGllbnRbaV0ubWF0Y2goL14oW146XSopOj8oW1xcZFxcLl0qKS8pO1xuICAgICAgICAgICAgICAgIGRvdC5jb2xvciA9IFIuZ2V0UkdCKHBhclsxXSk7XG4gICAgICAgICAgICAgICAgaWYgKGRvdC5jb2xvci5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZG90LmNvbG9yID0gZG90LmNvbG9yLmhleDtcbiAgICAgICAgICAgICAgICBwYXJbMl0gJiYgKGRvdC5vZmZzZXQgPSBwYXJbMl0gKyBcIiVcIik7XG4gICAgICAgICAgICAgICAgZG90cy5wdXNoKGRvdCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGkgPSAxLCBpaSA9IGRvdHMubGVuZ3RoIC0gMTsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoIWRvdHNbaV0ub2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzdGFydCA9IHRvRmxvYXQoZG90c1tpIC0gMV0ub2Zmc2V0IHx8IDApLFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IGkgKyAxOyBqIDwgaWk7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRvdHNbal0ub2Zmc2V0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gZG90c1tqXS5vZmZzZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKCFlbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuZCA9IDEwMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGogPSBpaTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbmQgPSB0b0Zsb2F0KGVuZCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkID0gKGVuZCAtIHN0YXJ0KSAvIChqIC0gaSArIDEpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKDsgaSA8IGo7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnQgKz0gZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvdHNbaV0ub2Zmc2V0ID0gc3RhcnQgKyBcIiVcIjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBkb3RzO1xuICAgICAgICB9KSxcbiAgICAgICAgdGVhciA9IFIuX3RlYXIgPSBmdW5jdGlvbiAoZWwsIHBhcGVyKSB7XG4gICAgICAgICAgICBlbCA9PSBwYXBlci50b3AgJiYgKHBhcGVyLnRvcCA9IGVsLnByZXYpO1xuICAgICAgICAgICAgZWwgPT0gcGFwZXIuYm90dG9tICYmIChwYXBlci5ib3R0b20gPSBlbC5uZXh0KTtcbiAgICAgICAgICAgIGVsLm5leHQgJiYgKGVsLm5leHQucHJldiA9IGVsLnByZXYpO1xuICAgICAgICAgICAgZWwucHJldiAmJiAoZWwucHJldi5uZXh0ID0gZWwubmV4dCk7XG4gICAgICAgIH0sXG4gICAgICAgIHRvZnJvbnQgPSBSLl90b2Zyb250ID0gZnVuY3Rpb24gKGVsLCBwYXBlcikge1xuICAgICAgICAgICAgaWYgKHBhcGVyLnRvcCA9PT0gZWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0ZWFyKGVsLCBwYXBlcik7XG4gICAgICAgICAgICBlbC5uZXh0ID0gbnVsbDtcbiAgICAgICAgICAgIGVsLnByZXYgPSBwYXBlci50b3A7XG4gICAgICAgICAgICBwYXBlci50b3AubmV4dCA9IGVsO1xuICAgICAgICAgICAgcGFwZXIudG9wID0gZWw7XG4gICAgICAgIH0sXG4gICAgICAgIHRvYmFjayA9IFIuX3RvYmFjayA9IGZ1bmN0aW9uIChlbCwgcGFwZXIpIHtcbiAgICAgICAgICAgIGlmIChwYXBlci5ib3R0b20gPT09IGVsKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGVhcihlbCwgcGFwZXIpO1xuICAgICAgICAgICAgZWwubmV4dCA9IHBhcGVyLmJvdHRvbTtcbiAgICAgICAgICAgIGVsLnByZXYgPSBudWxsO1xuICAgICAgICAgICAgcGFwZXIuYm90dG9tLnByZXYgPSBlbDtcbiAgICAgICAgICAgIHBhcGVyLmJvdHRvbSA9IGVsO1xuICAgICAgICB9LFxuICAgICAgICBpbnNlcnRhZnRlciA9IFIuX2luc2VydGFmdGVyID0gZnVuY3Rpb24gKGVsLCBlbDIsIHBhcGVyKSB7XG4gICAgICAgICAgICB0ZWFyKGVsLCBwYXBlcik7XG4gICAgICAgICAgICBlbDIgPT0gcGFwZXIudG9wICYmIChwYXBlci50b3AgPSBlbCk7XG4gICAgICAgICAgICBlbDIubmV4dCAmJiAoZWwyLm5leHQucHJldiA9IGVsKTtcbiAgICAgICAgICAgIGVsLm5leHQgPSBlbDIubmV4dDtcbiAgICAgICAgICAgIGVsLnByZXYgPSBlbDI7XG4gICAgICAgICAgICBlbDIubmV4dCA9IGVsO1xuICAgICAgICB9LFxuICAgICAgICBpbnNlcnRiZWZvcmUgPSBSLl9pbnNlcnRiZWZvcmUgPSBmdW5jdGlvbiAoZWwsIGVsMiwgcGFwZXIpIHtcbiAgICAgICAgICAgIHRlYXIoZWwsIHBhcGVyKTtcbiAgICAgICAgICAgIGVsMiA9PSBwYXBlci5ib3R0b20gJiYgKHBhcGVyLmJvdHRvbSA9IGVsKTtcbiAgICAgICAgICAgIGVsMi5wcmV2ICYmIChlbDIucHJldi5uZXh0ID0gZWwpO1xuICAgICAgICAgICAgZWwucHJldiA9IGVsMi5wcmV2O1xuICAgICAgICAgICAgZWwyLnByZXYgPSBlbDtcbiAgICAgICAgICAgIGVsLm5leHQgPSBlbDI7XG4gICAgICAgIH0sXG4gICAgICAgIFxuICAgICAgICB0b01hdHJpeCA9IFIudG9NYXRyaXggPSBmdW5jdGlvbiAocGF0aCwgdHJhbnNmb3JtKSB7XG4gICAgICAgICAgICB2YXIgYmIgPSBwYXRoRGltZW5zaW9ucyhwYXRoKSxcbiAgICAgICAgICAgICAgICBlbCA9IHtcbiAgICAgICAgICAgICAgICAgICAgXzoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtOiBFXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdldEJCb3g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBiYjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICBleHRyYWN0VHJhbnNmb3JtKGVsLCB0cmFuc2Zvcm0pO1xuICAgICAgICAgICAgcmV0dXJuIGVsLm1hdHJpeDtcbiAgICAgICAgfSxcbiAgICAgICAgXG4gICAgICAgIHRyYW5zZm9ybVBhdGggPSBSLnRyYW5zZm9ybVBhdGggPSBmdW5jdGlvbiAocGF0aCwgdHJhbnNmb3JtKSB7XG4gICAgICAgICAgICByZXR1cm4gbWFwUGF0aChwYXRoLCB0b01hdHJpeChwYXRoLCB0cmFuc2Zvcm0pKTtcbiAgICAgICAgfSxcbiAgICAgICAgZXh0cmFjdFRyYW5zZm9ybSA9IFIuX2V4dHJhY3RUcmFuc2Zvcm0gPSBmdW5jdGlvbiAoZWwsIHRzdHIpIHtcbiAgICAgICAgICAgIGlmICh0c3RyID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWwuXy50cmFuc2Zvcm07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0c3RyID0gU3RyKHRzdHIpLnJlcGxhY2UoL1xcLnszfXxcXHUyMDI2L2csIGVsLl8udHJhbnNmb3JtIHx8IEUpO1xuICAgICAgICAgICAgdmFyIHRkYXRhID0gUi5wYXJzZVRyYW5zZm9ybVN0cmluZyh0c3RyKSxcbiAgICAgICAgICAgICAgICBkZWcgPSAwLFxuICAgICAgICAgICAgICAgIGR4ID0gMCxcbiAgICAgICAgICAgICAgICBkeSA9IDAsXG4gICAgICAgICAgICAgICAgc3ggPSAxLFxuICAgICAgICAgICAgICAgIHN5ID0gMSxcbiAgICAgICAgICAgICAgICBfID0gZWwuXyxcbiAgICAgICAgICAgICAgICBtID0gbmV3IE1hdHJpeDtcbiAgICAgICAgICAgIF8udHJhbnNmb3JtID0gdGRhdGEgfHwgW107XG4gICAgICAgICAgICBpZiAodGRhdGEpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSB0ZGF0YS5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0ID0gdGRhdGFbaV0sXG4gICAgICAgICAgICAgICAgICAgICAgICB0bGVuID0gdC5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21tYW5kID0gU3RyKHRbMF0pLnRvTG93ZXJDYXNlKCksXG4gICAgICAgICAgICAgICAgICAgICAgICBhYnNvbHV0ZSA9IHRbMF0gIT0gY29tbWFuZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGludmVyID0gYWJzb2x1dGUgPyBtLmludmVydCgpIDogMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHgxLFxuICAgICAgICAgICAgICAgICAgICAgICAgeTEsXG4gICAgICAgICAgICAgICAgICAgICAgICB4MixcbiAgICAgICAgICAgICAgICAgICAgICAgIHkyLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmI7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjb21tYW5kID09IFwidFwiICYmIHRsZW4gPT0gMykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFic29sdXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeDEgPSBpbnZlci54KDAsIDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHkxID0gaW52ZXIueSgwLCAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4MiA9IGludmVyLngodFsxXSwgdFsyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTIgPSBpbnZlci55KHRbMV0sIHRbMl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG0udHJhbnNsYXRlKHgyIC0geDEsIHkyIC0geTEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLnRyYW5zbGF0ZSh0WzFdLCB0WzJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09IFwiclwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGxlbiA9PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmIgPSBiYiB8fCBlbC5nZXRCQm94KDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG0ucm90YXRlKHRbMV0sIGJiLnggKyBiYi53aWR0aCAvIDIsIGJiLnkgKyBiYi5oZWlnaHQgLyAyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWcgKz0gdFsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGxlbiA9PSA0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFic29sdXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHgyID0gaW52ZXIueCh0WzJdLCB0WzNdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTIgPSBpbnZlci55KHRbMl0sIHRbM10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLnJvdGF0ZSh0WzFdLCB4MiwgeTIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG0ucm90YXRlKHRbMV0sIHRbMl0sIHRbM10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWcgKz0gdFsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjb21tYW5kID09IFwic1wiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGxlbiA9PSAyIHx8IHRsZW4gPT0gMykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJiID0gYmIgfHwgZWwuZ2V0QkJveCgxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLnNjYWxlKHRbMV0sIHRbdGxlbiAtIDFdLCBiYi54ICsgYmIud2lkdGggLyAyLCBiYi55ICsgYmIuaGVpZ2h0IC8gMik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ggKj0gdFsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzeSAqPSB0W3RsZW4gLSAxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGxlbiA9PSA1KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFic29sdXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHgyID0gaW52ZXIueCh0WzNdLCB0WzRdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTIgPSBpbnZlci55KHRbM10sIHRbNF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLnNjYWxlKHRbMV0sIHRbMl0sIHgyLCB5Mik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbS5zY2FsZSh0WzFdLCB0WzJdLCB0WzNdLCB0WzRdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ggKj0gdFsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzeSAqPSB0WzJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT0gXCJtXCIgJiYgdGxlbiA9PSA3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBtLmFkZCh0WzFdLCB0WzJdLCB0WzNdLCB0WzRdLCB0WzVdLCB0WzZdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBfLmRpcnR5VCA9IDE7XG4gICAgICAgICAgICAgICAgICAgIGVsLm1hdHJpeCA9IG07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGVsLm1hdHJpeCA9IG07XG5cbiAgICAgICAgICAgIF8uc3ggPSBzeDtcbiAgICAgICAgICAgIF8uc3kgPSBzeTtcbiAgICAgICAgICAgIF8uZGVnID0gZGVnO1xuICAgICAgICAgICAgXy5keCA9IGR4ID0gbS5lO1xuICAgICAgICAgICAgXy5keSA9IGR5ID0gbS5mO1xuXG4gICAgICAgICAgICBpZiAoc3ggPT0gMSAmJiBzeSA9PSAxICYmICFkZWcgJiYgXy5iYm94KSB7XG4gICAgICAgICAgICAgICAgXy5iYm94LnggKz0gK2R4O1xuICAgICAgICAgICAgICAgIF8uYmJveC55ICs9ICtkeTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgXy5kaXJ0eVQgPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBnZXRFbXB0eSA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICB2YXIgbCA9IGl0ZW1bMF07XG4gICAgICAgICAgICBzd2l0Y2ggKGwudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICAgICAgICAgIGNhc2UgXCJ0XCI6IHJldHVybiBbbCwgMCwgMF07XG4gICAgICAgICAgICAgICAgY2FzZSBcIm1cIjogcmV0dXJuIFtsLCAxLCAwLCAwLCAxLCAwLCAwXTtcbiAgICAgICAgICAgICAgICBjYXNlIFwiclwiOiBpZiAoaXRlbS5sZW5ndGggPT0gNCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW2wsIDAsIGl0ZW1bMl0sIGl0ZW1bM11dO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbbCwgMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhc2UgXCJzXCI6IGlmIChpdGVtLmxlbmd0aCA9PSA1KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbbCwgMSwgMSwgaXRlbVszXSwgaXRlbVs0XV07XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLmxlbmd0aCA9PSAzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbbCwgMSwgMV07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtsLCAxXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGVxdWFsaXNlVHJhbnNmb3JtID0gUi5fZXF1YWxpc2VUcmFuc2Zvcm0gPSBmdW5jdGlvbiAodDEsIHQyKSB7XG4gICAgICAgICAgICB0MiA9IFN0cih0MikucmVwbGFjZSgvXFwuezN9fFxcdTIwMjYvZywgdDEpO1xuICAgICAgICAgICAgdDEgPSBSLnBhcnNlVHJhbnNmb3JtU3RyaW5nKHQxKSB8fCBbXTtcbiAgICAgICAgICAgIHQyID0gUi5wYXJzZVRyYW5zZm9ybVN0cmluZyh0MikgfHwgW107XG4gICAgICAgICAgICB2YXIgbWF4bGVuZ3RoID0gbW1heCh0MS5sZW5ndGgsIHQyLmxlbmd0aCksXG4gICAgICAgICAgICAgICAgZnJvbSA9IFtdLFxuICAgICAgICAgICAgICAgIHRvID0gW10sXG4gICAgICAgICAgICAgICAgaSA9IDAsIGosIGpqLFxuICAgICAgICAgICAgICAgIHR0MSwgdHQyO1xuICAgICAgICAgICAgZm9yICg7IGkgPCBtYXhsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIHR0MSA9IHQxW2ldIHx8IGdldEVtcHR5KHQyW2ldKTtcbiAgICAgICAgICAgICAgICB0dDIgPSB0MltpXSB8fCBnZXRFbXB0eSh0dDEpO1xuICAgICAgICAgICAgICAgIGlmICgodHQxWzBdICE9IHR0MlswXSkgfHxcbiAgICAgICAgICAgICAgICAgICAgKHR0MVswXS50b0xvd2VyQ2FzZSgpID09IFwiclwiICYmICh0dDFbMl0gIT0gdHQyWzJdIHx8IHR0MVszXSAhPSB0dDJbM10pKSB8fFxuICAgICAgICAgICAgICAgICAgICAodHQxWzBdLnRvTG93ZXJDYXNlKCkgPT0gXCJzXCIgJiYgKHR0MVszXSAhPSB0dDJbM10gfHwgdHQxWzRdICE9IHR0Mls0XSkpXG4gICAgICAgICAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZyb21baV0gPSBbXTtcbiAgICAgICAgICAgICAgICB0b1tpXSA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAoaiA9IDAsIGpqID0gbW1heCh0dDEubGVuZ3RoLCB0dDIubGVuZ3RoKTsgaiA8IGpqOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaiBpbiB0dDEgJiYgKGZyb21baV1bal0gPSB0dDFbal0pO1xuICAgICAgICAgICAgICAgICAgICBqIGluIHR0MiAmJiAodG9baV1bal0gPSB0dDJbal0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgZnJvbTogZnJvbSxcbiAgICAgICAgICAgICAgICB0bzogdG9cbiAgICAgICAgICAgIH07XG4gICAgICAgIH07XG4gICAgUi5fZ2V0Q29udGFpbmVyID0gZnVuY3Rpb24gKHgsIHksIHcsIGgpIHtcbiAgICAgICAgdmFyIGNvbnRhaW5lcjtcbiAgICAgICAgY29udGFpbmVyID0gaCA9PSBudWxsICYmICFSLmlzKHgsIFwib2JqZWN0XCIpID8gZy5kb2MuZ2V0RWxlbWVudEJ5SWQoeCkgOiB4O1xuICAgICAgICBpZiAoY29udGFpbmVyID09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29udGFpbmVyLnRhZ05hbWUpIHtcbiAgICAgICAgICAgIGlmICh5ID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBjb250YWluZXI6IGNvbnRhaW5lcixcbiAgICAgICAgICAgICAgICAgICAgd2lkdGg6IGNvbnRhaW5lci5zdHlsZS5waXhlbFdpZHRoIHx8IGNvbnRhaW5lci5vZmZzZXRXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiBjb250YWluZXIuc3R5bGUucGl4ZWxIZWlnaHQgfHwgY29udGFpbmVyLm9mZnNldEhlaWdodFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lcjogY29udGFpbmVyLFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogeSxcbiAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiB3XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgY29udGFpbmVyOiAxLFxuICAgICAgICAgICAgeDogeCxcbiAgICAgICAgICAgIHk6IHksXG4gICAgICAgICAgICB3aWR0aDogdyxcbiAgICAgICAgICAgIGhlaWdodDogaFxuICAgICAgICB9O1xuICAgIH07XG4gICAgXG4gICAgUi5wYXRoVG9SZWxhdGl2ZSA9IHBhdGhUb1JlbGF0aXZlO1xuICAgIFIuX2VuZ2luZSA9IHt9O1xuICAgIFxuICAgIFIucGF0aDJjdXJ2ZSA9IHBhdGgyY3VydmU7XG4gICAgXG4gICAgUi5tYXRyaXggPSBmdW5jdGlvbiAoYSwgYiwgYywgZCwgZSwgZikge1xuICAgICAgICByZXR1cm4gbmV3IE1hdHJpeChhLCBiLCBjLCBkLCBlLCBmKTtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIE1hdHJpeChhLCBiLCBjLCBkLCBlLCBmKSB7XG4gICAgICAgIGlmIChhICE9IG51bGwpIHtcbiAgICAgICAgICAgIHRoaXMuYSA9ICthO1xuICAgICAgICAgICAgdGhpcy5iID0gK2I7XG4gICAgICAgICAgICB0aGlzLmMgPSArYztcbiAgICAgICAgICAgIHRoaXMuZCA9ICtkO1xuICAgICAgICAgICAgdGhpcy5lID0gK2U7XG4gICAgICAgICAgICB0aGlzLmYgPSArZjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuYSA9IDE7XG4gICAgICAgICAgICB0aGlzLmIgPSAwO1xuICAgICAgICAgICAgdGhpcy5jID0gMDtcbiAgICAgICAgICAgIHRoaXMuZCA9IDE7XG4gICAgICAgICAgICB0aGlzLmUgPSAwO1xuICAgICAgICAgICAgdGhpcy5mID0gMDtcbiAgICAgICAgfVxuICAgIH1cbiAgICAoZnVuY3Rpb24gKG1hdHJpeHByb3RvKSB7XG4gICAgICAgIFxuICAgICAgICBtYXRyaXhwcm90by5hZGQgPSBmdW5jdGlvbiAoYSwgYiwgYywgZCwgZSwgZikge1xuICAgICAgICAgICAgdmFyIG91dCA9IFtbXSwgW10sIFtdXSxcbiAgICAgICAgICAgICAgICBtID0gW1t0aGlzLmEsIHRoaXMuYywgdGhpcy5lXSwgW3RoaXMuYiwgdGhpcy5kLCB0aGlzLmZdLCBbMCwgMCwgMV1dLFxuICAgICAgICAgICAgICAgIG1hdHJpeCA9IFtbYSwgYywgZV0sIFtiLCBkLCBmXSwgWzAsIDAsIDFdXSxcbiAgICAgICAgICAgICAgICB4LCB5LCB6LCByZXM7XG5cbiAgICAgICAgICAgIGlmIChhICYmIGEgaW5zdGFuY2VvZiBNYXRyaXgpIHtcbiAgICAgICAgICAgICAgICBtYXRyaXggPSBbW2EuYSwgYS5jLCBhLmVdLCBbYS5iLCBhLmQsIGEuZl0sIFswLCAwLCAxXV07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZvciAoeCA9IDA7IHggPCAzOyB4KyspIHtcbiAgICAgICAgICAgICAgICBmb3IgKHkgPSAwOyB5IDwgMzsgeSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcyA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoeiA9IDA7IHogPCAzOyB6KyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcyArPSBtW3hdW3pdICogbWF0cml4W3pdW3ldO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG91dFt4XVt5XSA9IHJlcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmEgPSBvdXRbMF1bMF07XG4gICAgICAgICAgICB0aGlzLmIgPSBvdXRbMV1bMF07XG4gICAgICAgICAgICB0aGlzLmMgPSBvdXRbMF1bMV07XG4gICAgICAgICAgICB0aGlzLmQgPSBvdXRbMV1bMV07XG4gICAgICAgICAgICB0aGlzLmUgPSBvdXRbMF1bMl07XG4gICAgICAgICAgICB0aGlzLmYgPSBvdXRbMV1bMl07XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBtYXRyaXhwcm90by5pbnZlcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgbWUgPSB0aGlzLFxuICAgICAgICAgICAgICAgIHggPSBtZS5hICogbWUuZCAtIG1lLmIgKiBtZS5jO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNYXRyaXgobWUuZCAvIHgsIC1tZS5iIC8geCwgLW1lLmMgLyB4LCBtZS5hIC8geCwgKG1lLmMgKiBtZS5mIC0gbWUuZCAqIG1lLmUpIC8geCwgKG1lLmIgKiBtZS5lIC0gbWUuYSAqIG1lLmYpIC8geCk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBtYXRyaXhwcm90by5jbG9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTWF0cml4KHRoaXMuYSwgdGhpcy5iLCB0aGlzLmMsIHRoaXMuZCwgdGhpcy5lLCB0aGlzLmYpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgbWF0cml4cHJvdG8udHJhbnNsYXRlID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgICAgIHRoaXMuYWRkKDEsIDAsIDAsIDEsIHgsIHkpO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgbWF0cml4cHJvdG8uc2NhbGUgPSBmdW5jdGlvbiAoeCwgeSwgY3gsIGN5KSB7XG4gICAgICAgICAgICB5ID09IG51bGwgJiYgKHkgPSB4KTtcbiAgICAgICAgICAgIChjeCB8fCBjeSkgJiYgdGhpcy5hZGQoMSwgMCwgMCwgMSwgY3gsIGN5KTtcbiAgICAgICAgICAgIHRoaXMuYWRkKHgsIDAsIDAsIHksIDAsIDApO1xuICAgICAgICAgICAgKGN4IHx8IGN5KSAmJiB0aGlzLmFkZCgxLCAwLCAwLCAxLCAtY3gsIC1jeSk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBtYXRyaXhwcm90by5yb3RhdGUgPSBmdW5jdGlvbiAoYSwgeCwgeSkge1xuICAgICAgICAgICAgYSA9IFIucmFkKGEpO1xuICAgICAgICAgICAgeCA9IHggfHwgMDtcbiAgICAgICAgICAgIHkgPSB5IHx8IDA7XG4gICAgICAgICAgICB2YXIgY29zID0gK21hdGguY29zKGEpLnRvRml4ZWQoOSksXG4gICAgICAgICAgICAgICAgc2luID0gK21hdGguc2luKGEpLnRvRml4ZWQoOSk7XG4gICAgICAgICAgICB0aGlzLmFkZChjb3MsIHNpbiwgLXNpbiwgY29zLCB4LCB5KTtcbiAgICAgICAgICAgIHRoaXMuYWRkKDEsIDAsIDAsIDEsIC14LCAteSk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBtYXRyaXhwcm90by54ID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgICAgIHJldHVybiB4ICogdGhpcy5hICsgeSAqIHRoaXMuYyArIHRoaXMuZTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIG1hdHJpeHByb3RvLnkgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICAgICAgcmV0dXJuIHggKiB0aGlzLmIgKyB5ICogdGhpcy5kICsgdGhpcy5mO1xuICAgICAgICB9O1xuICAgICAgICBtYXRyaXhwcm90by5nZXQgPSBmdW5jdGlvbiAoaSkge1xuICAgICAgICAgICAgcmV0dXJuICt0aGlzW1N0ci5mcm9tQ2hhckNvZGUoOTcgKyBpKV0udG9GaXhlZCg0KTtcbiAgICAgICAgfTtcbiAgICAgICAgbWF0cml4cHJvdG8udG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gUi5zdmcgP1xuICAgICAgICAgICAgICAgIFwibWF0cml4KFwiICsgW3RoaXMuZ2V0KDApLCB0aGlzLmdldCgxKSwgdGhpcy5nZXQoMiksIHRoaXMuZ2V0KDMpLCB0aGlzLmdldCg0KSwgdGhpcy5nZXQoNSldLmpvaW4oKSArIFwiKVwiIDpcbiAgICAgICAgICAgICAgICBbdGhpcy5nZXQoMCksIHRoaXMuZ2V0KDIpLCB0aGlzLmdldCgxKSwgdGhpcy5nZXQoMyksIDAsIDBdLmpvaW4oKTtcbiAgICAgICAgfTtcbiAgICAgICAgbWF0cml4cHJvdG8udG9GaWx0ZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gXCJwcm9naWQ6RFhJbWFnZVRyYW5zZm9ybS5NaWNyb3NvZnQuTWF0cml4KE0xMT1cIiArIHRoaXMuZ2V0KDApICtcbiAgICAgICAgICAgICAgICBcIiwgTTEyPVwiICsgdGhpcy5nZXQoMikgKyBcIiwgTTIxPVwiICsgdGhpcy5nZXQoMSkgKyBcIiwgTTIyPVwiICsgdGhpcy5nZXQoMykgK1xuICAgICAgICAgICAgICAgIFwiLCBEeD1cIiArIHRoaXMuZ2V0KDQpICsgXCIsIER5PVwiICsgdGhpcy5nZXQoNSkgKyBcIiwgc2l6aW5nbWV0aG9kPSdhdXRvIGV4cGFuZCcpXCI7XG4gICAgICAgIH07XG4gICAgICAgIG1hdHJpeHByb3RvLm9mZnNldCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBbdGhpcy5lLnRvRml4ZWQoNCksIHRoaXMuZi50b0ZpeGVkKDQpXTtcbiAgICAgICAgfTtcbiAgICAgICAgZnVuY3Rpb24gbm9ybShhKSB7XG4gICAgICAgICAgICByZXR1cm4gYVswXSAqIGFbMF0gKyBhWzFdICogYVsxXTtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBub3JtYWxpemUoYSkge1xuICAgICAgICAgICAgdmFyIG1hZyA9IG1hdGguc3FydChub3JtKGEpKTtcbiAgICAgICAgICAgIGFbMF0gJiYgKGFbMF0gLz0gbWFnKTtcbiAgICAgICAgICAgIGFbMV0gJiYgKGFbMV0gLz0gbWFnKTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgbWF0cml4cHJvdG8uc3BsaXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgb3V0ID0ge307XG4gICAgICAgICAgICAvLyB0cmFuc2xhdGlvblxuICAgICAgICAgICAgb3V0LmR4ID0gdGhpcy5lO1xuICAgICAgICAgICAgb3V0LmR5ID0gdGhpcy5mO1xuXG4gICAgICAgICAgICAvLyBzY2FsZSBhbmQgc2hlYXJcbiAgICAgICAgICAgIHZhciByb3cgPSBbW3RoaXMuYSwgdGhpcy5jXSwgW3RoaXMuYiwgdGhpcy5kXV07XG4gICAgICAgICAgICBvdXQuc2NhbGV4ID0gbWF0aC5zcXJ0KG5vcm0ocm93WzBdKSk7XG4gICAgICAgICAgICBub3JtYWxpemUocm93WzBdKTtcblxuICAgICAgICAgICAgb3V0LnNoZWFyID0gcm93WzBdWzBdICogcm93WzFdWzBdICsgcm93WzBdWzFdICogcm93WzFdWzFdO1xuICAgICAgICAgICAgcm93WzFdID0gW3Jvd1sxXVswXSAtIHJvd1swXVswXSAqIG91dC5zaGVhciwgcm93WzFdWzFdIC0gcm93WzBdWzFdICogb3V0LnNoZWFyXTtcblxuICAgICAgICAgICAgb3V0LnNjYWxleSA9IG1hdGguc3FydChub3JtKHJvd1sxXSkpO1xuICAgICAgICAgICAgbm9ybWFsaXplKHJvd1sxXSk7XG4gICAgICAgICAgICBvdXQuc2hlYXIgLz0gb3V0LnNjYWxleTtcblxuICAgICAgICAgICAgLy8gcm90YXRpb25cbiAgICAgICAgICAgIHZhciBzaW4gPSAtcm93WzBdWzFdLFxuICAgICAgICAgICAgICAgIGNvcyA9IHJvd1sxXVsxXTtcbiAgICAgICAgICAgIGlmIChjb3MgPCAwKSB7XG4gICAgICAgICAgICAgICAgb3V0LnJvdGF0ZSA9IFIuZGVnKG1hdGguYWNvcyhjb3MpKTtcbiAgICAgICAgICAgICAgICBpZiAoc2luIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBvdXQucm90YXRlID0gMzYwIC0gb3V0LnJvdGF0ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG91dC5yb3RhdGUgPSBSLmRlZyhtYXRoLmFzaW4oc2luKSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG91dC5pc1NpbXBsZSA9ICErb3V0LnNoZWFyLnRvRml4ZWQoOSkgJiYgKG91dC5zY2FsZXgudG9GaXhlZCg5KSA9PSBvdXQuc2NhbGV5LnRvRml4ZWQoOSkgfHwgIW91dC5yb3RhdGUpO1xuICAgICAgICAgICAgb3V0LmlzU3VwZXJTaW1wbGUgPSAhK291dC5zaGVhci50b0ZpeGVkKDkpICYmIG91dC5zY2FsZXgudG9GaXhlZCg5KSA9PSBvdXQuc2NhbGV5LnRvRml4ZWQoOSkgJiYgIW91dC5yb3RhdGU7XG4gICAgICAgICAgICBvdXQubm9Sb3RhdGlvbiA9ICErb3V0LnNoZWFyLnRvRml4ZWQoOSkgJiYgIW91dC5yb3RhdGU7XG4gICAgICAgICAgICByZXR1cm4gb3V0O1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgbWF0cml4cHJvdG8udG9UcmFuc2Zvcm1TdHJpbmcgPSBmdW5jdGlvbiAoc2hvcnRlcikge1xuICAgICAgICAgICAgdmFyIHMgPSBzaG9ydGVyIHx8IHRoaXNbc3BsaXRdKCk7XG4gICAgICAgICAgICBpZiAocy5pc1NpbXBsZSkge1xuICAgICAgICAgICAgICAgIHMuc2NhbGV4ID0gK3Muc2NhbGV4LnRvRml4ZWQoNCk7XG4gICAgICAgICAgICAgICAgcy5zY2FsZXkgPSArcy5zY2FsZXkudG9GaXhlZCg0KTtcbiAgICAgICAgICAgICAgICBzLnJvdGF0ZSA9ICtzLnJvdGF0ZS50b0ZpeGVkKDQpO1xuICAgICAgICAgICAgICAgIHJldHVybiAgKHMuZHggfHwgcy5keSA/IFwidFwiICsgW3MuZHgsIHMuZHldIDogRSkgKyBcbiAgICAgICAgICAgICAgICAgICAgICAgIChzLnNjYWxleCAhPSAxIHx8IHMuc2NhbGV5ICE9IDEgPyBcInNcIiArIFtzLnNjYWxleCwgcy5zY2FsZXksIDAsIDBdIDogRSkgK1xuICAgICAgICAgICAgICAgICAgICAgICAgKHMucm90YXRlID8gXCJyXCIgKyBbcy5yb3RhdGUsIDAsIDBdIDogRSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBcIm1cIiArIFt0aGlzLmdldCgwKSwgdGhpcy5nZXQoMSksIHRoaXMuZ2V0KDIpLCB0aGlzLmdldCgzKSwgdGhpcy5nZXQoNCksIHRoaXMuZ2V0KDUpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KShNYXRyaXgucHJvdG90eXBlKTtcblxuICAgIC8vIFdlYktpdCByZW5kZXJpbmcgYnVnIHdvcmthcm91bmQgbWV0aG9kXG4gICAgLy8gQlJPV1NFUklGWSBNT0Q6IGRvbid0IGFzc3VtZSBuYXZpZ2F0b3IgZXhpc3RzXG4gICAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHZhciB2ZXJzaW9uID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvVmVyc2lvblxcLyguKj8pXFxzLykgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudC5tYXRjaCgvQ2hyb21lXFwvKFxcZCspLyk7XG4gICAgICAgIGlmICgobmF2aWdhdG9yLnZlbmRvciA9PSBcIkFwcGxlIENvbXB1dGVyLCBJbmMuXCIpICYmICh2ZXJzaW9uICYmIHZlcnNpb25bMV0gPCA0IHx8IG5hdmlnYXRvci5wbGF0Zm9ybS5zbGljZSgwLCAyKSA9PSBcImlQXCIpIHx8XG4gICAgICAgICAgICAobmF2aWdhdG9yLnZlbmRvciA9PSBcIkdvb2dsZSBJbmMuXCIgJiYgdmVyc2lvbiAmJiB2ZXJzaW9uWzFdIDwgOCkpIHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcGFwZXJwcm90by5zYWZhcmkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlY3QgPSB0aGlzLnJlY3QoLTk5LCAtOTksIHRoaXMud2lkdGggKyA5OSwgdGhpcy5oZWlnaHQgKyA5OSkuYXR0cih7c3Ryb2tlOiBcIm5vbmVcIn0pO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge3JlY3QucmVtb3ZlKCk7fSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGFwZXJwcm90by5zYWZhcmkgPSBmdW47XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBwYXBlcnByb3RvLnNhZmFyaSA9IGZ1bjtcbiAgICB9XG4gXG4gICAgdmFyIHByZXZlbnREZWZhdWx0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJldHVyblZhbHVlID0gZmFsc2U7XG4gICAgfSxcbiAgICBwcmV2ZW50VG91Y2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9yaWdpbmFsRXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9LFxuICAgIHN0b3BQcm9wYWdhdGlvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5jYW5jZWxCdWJibGUgPSB0cnVlO1xuICAgIH0sXG4gICAgc3RvcFRvdWNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5vcmlnaW5hbEV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIH0sXG4gICAgYWRkRXZlbnQgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoZy5kb2MuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChvYmosIHR5cGUsIGZuLCBlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlYWxOYW1lID0gc3VwcG9ydHNUb3VjaCAmJiB0b3VjaE1hcFt0eXBlXSA/IHRvdWNoTWFwW3R5cGVdIDogdHlwZSxcbiAgICAgICAgICAgICAgICAgICAgZiA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2Nyb2xsWSA9IGcuZG9jLmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3AgfHwgZy5kb2MuYm9keS5zY3JvbGxUb3AsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsWCA9IGcuZG9jLmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0IHx8IGcuZG9jLmJvZHkuc2Nyb2xsTGVmdCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ID0gZS5jbGllbnRYICsgc2Nyb2xsWCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5ID0gZS5jbGllbnRZICsgc2Nyb2xsWTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN1cHBvcnRzVG91Y2ggJiYgdG91Y2hNYXBbaGFzXSh0eXBlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gZS50YXJnZXRUb3VjaGVzICYmIGUudGFyZ2V0VG91Y2hlcy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGUudGFyZ2V0VG91Y2hlc1tpXS50YXJnZXQgPT0gb2JqKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbGRlID0gZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZSA9IGUudGFyZ2V0VG91Y2hlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5vcmlnaW5hbEV2ZW50ID0gb2xkZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCA9IHByZXZlbnRUb3VjaDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24gPSBzdG9wVG91Y2g7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZm4uY2FsbChlbGVtZW50LCBlLCB4LCB5KTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIG9iai5hZGRFdmVudExpc3RlbmVyKHJlYWxOYW1lLCBmLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqLnJlbW92ZUV2ZW50TGlzdGVuZXIocmVhbE5hbWUsIGYsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAoZy5kb2MuYXR0YWNoRXZlbnQpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAob2JqLCB0eXBlLCBmbiwgZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIHZhciBmID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZSA9IGUgfHwgZy53aW4uZXZlbnQ7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY3JvbGxZID0gZy5kb2MuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCB8fCBnLmRvYy5ib2R5LnNjcm9sbFRvcCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjcm9sbFggPSBnLmRvYy5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdCB8fCBnLmRvYy5ib2R5LnNjcm9sbExlZnQsXG4gICAgICAgICAgICAgICAgICAgICAgICB4ID0gZS5jbGllbnRYICsgc2Nyb2xsWCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHkgPSBlLmNsaWVudFkgKyBzY3JvbGxZO1xuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0ID0gZS5wcmV2ZW50RGVmYXVsdCB8fCBwcmV2ZW50RGVmYXVsdDtcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24gPSBlLnN0b3BQcm9wYWdhdGlvbiB8fCBzdG9wUHJvcGFnYXRpb247XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmbi5jYWxsKGVsZW1lbnQsIGUsIHgsIHkpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgb2JqLmF0dGFjaEV2ZW50KFwib25cIiArIHR5cGUsIGYpO1xuICAgICAgICAgICAgICAgIHZhciBkZXRhY2hlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqLmRldGFjaEV2ZW50KFwib25cIiArIHR5cGUsIGYpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHJldHVybiBkZXRhY2hlcjtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9KSgpLFxuICAgIGRyYWcgPSBbXSxcbiAgICBkcmFnTW92ZSA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIHZhciB4ID0gZS5jbGllbnRYLFxuICAgICAgICAgICAgeSA9IGUuY2xpZW50WSxcbiAgICAgICAgICAgIHNjcm9sbFkgPSBnLmRvYy5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wIHx8IGcuZG9jLmJvZHkuc2Nyb2xsVG9wLFxuICAgICAgICAgICAgc2Nyb2xsWCA9IGcuZG9jLmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0IHx8IGcuZG9jLmJvZHkuc2Nyb2xsTGVmdCxcbiAgICAgICAgICAgIGRyYWdpLFxuICAgICAgICAgICAgaiA9IGRyYWcubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoai0tKSB7XG4gICAgICAgICAgICBkcmFnaSA9IGRyYWdbal07XG4gICAgICAgICAgICBpZiAoc3VwcG9ydHNUb3VjaCkge1xuICAgICAgICAgICAgICAgIHZhciBpID0gZS50b3VjaGVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgdG91Y2g7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgICAgICAgICB0b3VjaCA9IGUudG91Y2hlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvdWNoLmlkZW50aWZpZXIgPT0gZHJhZ2kuZWwuX2RyYWcuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHggPSB0b3VjaC5jbGllbnRYO1xuICAgICAgICAgICAgICAgICAgICAgICAgeSA9IHRvdWNoLmNsaWVudFk7XG4gICAgICAgICAgICAgICAgICAgICAgICAoZS5vcmlnaW5hbEV2ZW50ID8gZS5vcmlnaW5hbEV2ZW50IDogZSkucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbm9kZSA9IGRyYWdpLmVsLm5vZGUsXG4gICAgICAgICAgICAgICAgbyxcbiAgICAgICAgICAgICAgICBuZXh0ID0gbm9kZS5uZXh0U2libGluZyxcbiAgICAgICAgICAgICAgICBwYXJlbnQgPSBub2RlLnBhcmVudE5vZGUsXG4gICAgICAgICAgICAgICAgZGlzcGxheSA9IG5vZGUuc3R5bGUuZGlzcGxheTtcbiAgICAgICAgICAgIGcud2luLm9wZXJhICYmIHBhcmVudC5yZW1vdmVDaGlsZChub2RlKTtcbiAgICAgICAgICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICAgICAgbyA9IGRyYWdpLmVsLnBhcGVyLmdldEVsZW1lbnRCeVBvaW50KHgsIHkpO1xuICAgICAgICAgICAgbm9kZS5zdHlsZS5kaXNwbGF5ID0gZGlzcGxheTtcbiAgICAgICAgICAgIGcud2luLm9wZXJhICYmIChuZXh0ID8gcGFyZW50Lmluc2VydEJlZm9yZShub2RlLCBuZXh0KSA6IHBhcmVudC5hcHBlbmRDaGlsZChub2RlKSk7XG4gICAgICAgICAgICBvICYmIGV2ZShcInJhcGhhZWwuZHJhZy5vdmVyLlwiICsgZHJhZ2kuZWwuaWQsIGRyYWdpLmVsLCBvKTtcbiAgICAgICAgICAgIHggKz0gc2Nyb2xsWDtcbiAgICAgICAgICAgIHkgKz0gc2Nyb2xsWTtcbiAgICAgICAgICAgIGV2ZShcInJhcGhhZWwuZHJhZy5tb3ZlLlwiICsgZHJhZ2kuZWwuaWQsIGRyYWdpLm1vdmVfc2NvcGUgfHwgZHJhZ2kuZWwsIHggLSBkcmFnaS5lbC5fZHJhZy54LCB5IC0gZHJhZ2kuZWwuX2RyYWcueSwgeCwgeSwgZSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGRyYWdVcCA9IGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIFIudW5tb3VzZW1vdmUoZHJhZ01vdmUpLnVubW91c2V1cChkcmFnVXApO1xuICAgICAgICB2YXIgaSA9IGRyYWcubGVuZ3RoLFxuICAgICAgICAgICAgZHJhZ2k7XG4gICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgIGRyYWdpID0gZHJhZ1tpXTtcbiAgICAgICAgICAgIGRyYWdpLmVsLl9kcmFnID0ge307XG4gICAgICAgICAgICBldmUoXCJyYXBoYWVsLmRyYWcuZW5kLlwiICsgZHJhZ2kuZWwuaWQsIGRyYWdpLmVuZF9zY29wZSB8fCBkcmFnaS5zdGFydF9zY29wZSB8fCBkcmFnaS5tb3ZlX3Njb3BlIHx8IGRyYWdpLmVsLCBlKTtcbiAgICAgICAgfVxuICAgICAgICBkcmFnID0gW107XG4gICAgfSxcbiAgICBcbiAgICBlbHByb3RvID0gUi5lbCA9IHt9O1xuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIFxuICAgIGZvciAodmFyIGkgPSBldmVudHMubGVuZ3RoOyBpLS07KSB7XG4gICAgICAgIChmdW5jdGlvbiAoZXZlbnROYW1lKSB7XG4gICAgICAgICAgICBSW2V2ZW50TmFtZV0gPSBlbHByb3RvW2V2ZW50TmFtZV0gPSBmdW5jdGlvbiAoZm4sIHNjb3BlKSB7XG4gICAgICAgICAgICAgICAgaWYgKFIuaXMoZm4sIFwiZnVuY3Rpb25cIikpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudHMgPSB0aGlzLmV2ZW50cyB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ldmVudHMucHVzaCh7bmFtZTogZXZlbnROYW1lLCBmOiBmbiwgdW5iaW5kOiBhZGRFdmVudCh0aGlzLnNoYXBlIHx8IHRoaXMubm9kZSB8fCBnLmRvYywgZXZlbnROYW1lLCBmbiwgc2NvcGUgfHwgdGhpcyl9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgUltcInVuXCIgKyBldmVudE5hbWVdID0gZWxwcm90b1tcInVuXCIgKyBldmVudE5hbWVdID0gZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgdmFyIGV2ZW50cyA9IHRoaXMuZXZlbnRzIHx8IFtdLFxuICAgICAgICAgICAgICAgICAgICBsID0gZXZlbnRzLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB3aGlsZSAobC0tKSBpZiAoZXZlbnRzW2xdLm5hbWUgPT0gZXZlbnROYW1lICYmIGV2ZW50c1tsXS5mID09IGZuKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50c1tsXS51bmJpbmQoKTtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzLnNwbGljZShsLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgIWV2ZW50cy5sZW5ndGggJiYgZGVsZXRlIHRoaXMuZXZlbnRzO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KShldmVudHNbaV0pO1xuICAgIH1cbiAgICBcbiAgICBcbiAgICBlbHByb3RvLmRhdGEgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgICB2YXIgZGF0YSA9IGVsZGF0YVt0aGlzLmlkXSA9IGVsZGF0YVt0aGlzLmlkXSB8fCB7fTtcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgaWYgKFIuaXMoa2V5LCBcIm9iamVjdFwiKSkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4ga2V5KSBpZiAoa2V5W2hhc10oaSkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXRhKGksIGtleVtpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXZlKFwicmFwaGFlbC5kYXRhLmdldC5cIiArIHRoaXMuaWQsIHRoaXMsIGRhdGFba2V5XSwga2V5KTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgZGF0YVtrZXldID0gdmFsdWU7XG4gICAgICAgIGV2ZShcInJhcGhhZWwuZGF0YS5zZXQuXCIgKyB0aGlzLmlkLCB0aGlzLCB2YWx1ZSwga2V5KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLnJlbW92ZURhdGEgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIGlmIChrZXkgPT0gbnVsbCkge1xuICAgICAgICAgICAgZWxkYXRhW3RoaXMuaWRdID0ge307XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbGRhdGFbdGhpcy5pZF0gJiYgZGVsZXRlIGVsZGF0YVt0aGlzLmlkXVtrZXldO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgZWxwcm90by5ob3ZlciA9IGZ1bmN0aW9uIChmX2luLCBmX291dCwgc2NvcGVfaW4sIHNjb3BlX291dCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tb3VzZW92ZXIoZl9pbiwgc2NvcGVfaW4pLm1vdXNlb3V0KGZfb3V0LCBzY29wZV9vdXQgfHwgc2NvcGVfaW4pO1xuICAgIH07XG4gICAgXG4gICAgZWxwcm90by51bmhvdmVyID0gZnVuY3Rpb24gKGZfaW4sIGZfb3V0KSB7XG4gICAgICAgIHJldHVybiB0aGlzLnVubW91c2VvdmVyKGZfaW4pLnVubW91c2VvdXQoZl9vdXQpO1xuICAgIH07XG4gICAgdmFyIGRyYWdnYWJsZSA9IFtdO1xuICAgIFxuICAgIGVscHJvdG8uZHJhZyA9IGZ1bmN0aW9uIChvbm1vdmUsIG9uc3RhcnQsIG9uZW5kLCBtb3ZlX3Njb3BlLCBzdGFydF9zY29wZSwgZW5kX3Njb3BlKSB7XG4gICAgICAgIGZ1bmN0aW9uIHN0YXJ0KGUpIHtcbiAgICAgICAgICAgIChlLm9yaWdpbmFsRXZlbnQgfHwgZSkucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHZhciBzY3JvbGxZID0gZy5kb2MuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCB8fCBnLmRvYy5ib2R5LnNjcm9sbFRvcCxcbiAgICAgICAgICAgICAgICBzY3JvbGxYID0gZy5kb2MuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQgfHwgZy5kb2MuYm9keS5zY3JvbGxMZWZ0O1xuICAgICAgICAgICAgdGhpcy5fZHJhZy54ID0gZS5jbGllbnRYICsgc2Nyb2xsWDtcbiAgICAgICAgICAgIHRoaXMuX2RyYWcueSA9IGUuY2xpZW50WSArIHNjcm9sbFk7XG4gICAgICAgICAgICB0aGlzLl9kcmFnLmlkID0gZS5pZGVudGlmaWVyO1xuICAgICAgICAgICAgIWRyYWcubGVuZ3RoICYmIFIubW91c2Vtb3ZlKGRyYWdNb3ZlKS5tb3VzZXVwKGRyYWdVcCk7XG4gICAgICAgICAgICBkcmFnLnB1c2goe2VsOiB0aGlzLCBtb3ZlX3Njb3BlOiBtb3ZlX3Njb3BlLCBzdGFydF9zY29wZTogc3RhcnRfc2NvcGUsIGVuZF9zY29wZTogZW5kX3Njb3BlfSk7XG4gICAgICAgICAgICBvbnN0YXJ0ICYmIGV2ZS5vbihcInJhcGhhZWwuZHJhZy5zdGFydC5cIiArIHRoaXMuaWQsIG9uc3RhcnQpO1xuICAgICAgICAgICAgb25tb3ZlICYmIGV2ZS5vbihcInJhcGhhZWwuZHJhZy5tb3ZlLlwiICsgdGhpcy5pZCwgb25tb3ZlKTtcbiAgICAgICAgICAgIG9uZW5kICYmIGV2ZS5vbihcInJhcGhhZWwuZHJhZy5lbmQuXCIgKyB0aGlzLmlkLCBvbmVuZCk7XG4gICAgICAgICAgICBldmUoXCJyYXBoYWVsLmRyYWcuc3RhcnQuXCIgKyB0aGlzLmlkLCBzdGFydF9zY29wZSB8fCBtb3ZlX3Njb3BlIHx8IHRoaXMsIGUuY2xpZW50WCArIHNjcm9sbFgsIGUuY2xpZW50WSArIHNjcm9sbFksIGUpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX2RyYWcgPSB7fTtcbiAgICAgICAgZHJhZ2dhYmxlLnB1c2goe2VsOiB0aGlzLCBzdGFydDogc3RhcnR9KTtcbiAgICAgICAgdGhpcy5tb3VzZWRvd24oc3RhcnQpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFxuICAgIGVscHJvdG8ub25EcmFnT3ZlciA9IGZ1bmN0aW9uIChmKSB7XG4gICAgICAgIGYgPyBldmUub24oXCJyYXBoYWVsLmRyYWcub3Zlci5cIiArIHRoaXMuaWQsIGYpIDogZXZlLnVuYmluZChcInJhcGhhZWwuZHJhZy5vdmVyLlwiICsgdGhpcy5pZCk7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLnVuZHJhZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGkgPSBkcmFnZ2FibGUubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoaS0tKSBpZiAoZHJhZ2dhYmxlW2ldLmVsID09IHRoaXMpIHtcbiAgICAgICAgICAgIHRoaXMudW5tb3VzZWRvd24oZHJhZ2dhYmxlW2ldLnN0YXJ0KTtcbiAgICAgICAgICAgIGRyYWdnYWJsZS5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICBldmUudW5iaW5kKFwicmFwaGFlbC5kcmFnLiouXCIgKyB0aGlzLmlkKTtcbiAgICAgICAgfVxuICAgICAgICAhZHJhZ2dhYmxlLmxlbmd0aCAmJiBSLnVubW91c2Vtb3ZlKGRyYWdNb3ZlKS51bm1vdXNldXAoZHJhZ1VwKTtcbiAgICB9O1xuICAgIFxuICAgIHBhcGVycHJvdG8uY2lyY2xlID0gZnVuY3Rpb24gKHgsIHksIHIpIHtcbiAgICAgICAgdmFyIG91dCA9IFIuX2VuZ2luZS5jaXJjbGUodGhpcywgeCB8fCAwLCB5IHx8IDAsIHIgfHwgMCk7XG4gICAgICAgIHRoaXMuX19zZXRfXyAmJiB0aGlzLl9fc2V0X18ucHVzaChvdXQpO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG4gICAgXG4gICAgcGFwZXJwcm90by5yZWN0ID0gZnVuY3Rpb24gKHgsIHksIHcsIGgsIHIpIHtcbiAgICAgICAgdmFyIG91dCA9IFIuX2VuZ2luZS5yZWN0KHRoaXMsIHggfHwgMCwgeSB8fCAwLCB3IHx8IDAsIGggfHwgMCwgciB8fCAwKTtcbiAgICAgICAgdGhpcy5fX3NldF9fICYmIHRoaXMuX19zZXRfXy5wdXNoKG91dCk7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfTtcbiAgICBcbiAgICBwYXBlcnByb3RvLmVsbGlwc2UgPSBmdW5jdGlvbiAoeCwgeSwgcngsIHJ5KSB7XG4gICAgICAgIHZhciBvdXQgPSBSLl9lbmdpbmUuZWxsaXBzZSh0aGlzLCB4IHx8IDAsIHkgfHwgMCwgcnggfHwgMCwgcnkgfHwgMCk7XG4gICAgICAgIHRoaXMuX19zZXRfXyAmJiB0aGlzLl9fc2V0X18ucHVzaChvdXQpO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG4gICAgXG4gICAgcGFwZXJwcm90by5wYXRoID0gZnVuY3Rpb24gKHBhdGhTdHJpbmcpIHtcbiAgICAgICAgcGF0aFN0cmluZyAmJiAhUi5pcyhwYXRoU3RyaW5nLCBzdHJpbmcpICYmICFSLmlzKHBhdGhTdHJpbmdbMF0sIGFycmF5KSAmJiAocGF0aFN0cmluZyArPSBFKTtcbiAgICAgICAgdmFyIG91dCA9IFIuX2VuZ2luZS5wYXRoKFIuZm9ybWF0W2FwcGx5XShSLCBhcmd1bWVudHMpLCB0aGlzKTtcbiAgICAgICAgdGhpcy5fX3NldF9fICYmIHRoaXMuX19zZXRfXy5wdXNoKG91dCk7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfTtcbiAgICBcbiAgICBwYXBlcnByb3RvLmltYWdlID0gZnVuY3Rpb24gKHNyYywgeCwgeSwgdywgaCkge1xuICAgICAgICB2YXIgb3V0ID0gUi5fZW5naW5lLmltYWdlKHRoaXMsIHNyYyB8fCBcImFib3V0OmJsYW5rXCIsIHggfHwgMCwgeSB8fCAwLCB3IHx8IDAsIGggfHwgMCk7XG4gICAgICAgIHRoaXMuX19zZXRfXyAmJiB0aGlzLl9fc2V0X18ucHVzaChvdXQpO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG4gICAgXG4gICAgcGFwZXJwcm90by50ZXh0ID0gZnVuY3Rpb24gKHgsIHksIHRleHQpIHtcbiAgICAgICAgdmFyIG91dCA9IFIuX2VuZ2luZS50ZXh0KHRoaXMsIHggfHwgMCwgeSB8fCAwLCBTdHIodGV4dCkpO1xuICAgICAgICB0aGlzLl9fc2V0X18gJiYgdGhpcy5fX3NldF9fLnB1c2gob3V0KTtcbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9O1xuICAgIFxuICAgIHBhcGVycHJvdG8uc2V0ID0gZnVuY3Rpb24gKGl0ZW1zQXJyYXkpIHtcbiAgICAgICAgIVIuaXMoaXRlbXNBcnJheSwgXCJhcnJheVwiKSAmJiAoaXRlbXNBcnJheSA9IEFycmF5LnByb3RvdHlwZS5zcGxpY2UuY2FsbChhcmd1bWVudHMsIDAsIGFyZ3VtZW50cy5sZW5ndGgpKTtcbiAgICAgICAgdmFyIG91dCA9IG5ldyBTZXQoaXRlbXNBcnJheSk7XG4gICAgICAgIHRoaXMuX19zZXRfXyAmJiB0aGlzLl9fc2V0X18ucHVzaChvdXQpO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG4gICAgXG4gICAgcGFwZXJwcm90by5zZXRTdGFydCA9IGZ1bmN0aW9uIChzZXQpIHtcbiAgICAgICAgdGhpcy5fX3NldF9fID0gc2V0IHx8IHRoaXMuc2V0KCk7XG4gICAgfTtcbiAgICBcbiAgICBwYXBlcnByb3RvLnNldEZpbmlzaCA9IGZ1bmN0aW9uIChzZXQpIHtcbiAgICAgICAgdmFyIG91dCA9IHRoaXMuX19zZXRfXztcbiAgICAgICAgZGVsZXRlIHRoaXMuX19zZXRfXztcbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9O1xuICAgIFxuICAgIHBhcGVycHJvdG8uc2V0U2l6ZSA9IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgICAgIHJldHVybiBSLl9lbmdpbmUuc2V0U2l6ZS5jYWxsKHRoaXMsIHdpZHRoLCBoZWlnaHQpO1xuICAgIH07XG4gICAgXG4gICAgcGFwZXJwcm90by5zZXRWaWV3Qm94ID0gZnVuY3Rpb24gKHgsIHksIHcsIGgsIGZpdCkge1xuICAgICAgICByZXR1cm4gUi5fZW5naW5lLnNldFZpZXdCb3guY2FsbCh0aGlzLCB4LCB5LCB3LCBoLCBmaXQpO1xuICAgIH07XG4gICAgXG4gICAgXG4gICAgcGFwZXJwcm90by50b3AgPSBwYXBlcnByb3RvLmJvdHRvbSA9IG51bGw7XG4gICAgXG4gICAgcGFwZXJwcm90by5yYXBoYWVsID0gUjtcbiAgICB2YXIgZ2V0T2Zmc2V0ID0gZnVuY3Rpb24gKGVsZW0pIHtcbiAgICAgICAgdmFyIGJveCA9IGVsZW0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICAgICAgICBkb2MgPSBlbGVtLm93bmVyRG9jdW1lbnQsXG4gICAgICAgICAgICBib2R5ID0gZG9jLmJvZHksXG4gICAgICAgICAgICBkb2NFbGVtID0gZG9jLmRvY3VtZW50RWxlbWVudCxcbiAgICAgICAgICAgIGNsaWVudFRvcCA9IGRvY0VsZW0uY2xpZW50VG9wIHx8IGJvZHkuY2xpZW50VG9wIHx8IDAsIGNsaWVudExlZnQgPSBkb2NFbGVtLmNsaWVudExlZnQgfHwgYm9keS5jbGllbnRMZWZ0IHx8IDAsXG4gICAgICAgICAgICB0b3AgID0gYm94LnRvcCAgKyAoZy53aW4ucGFnZVlPZmZzZXQgfHwgZG9jRWxlbS5zY3JvbGxUb3AgfHwgYm9keS5zY3JvbGxUb3AgKSAtIGNsaWVudFRvcCxcbiAgICAgICAgICAgIGxlZnQgPSBib3gubGVmdCArIChnLndpbi5wYWdlWE9mZnNldCB8fCBkb2NFbGVtLnNjcm9sbExlZnQgfHwgYm9keS5zY3JvbGxMZWZ0KSAtIGNsaWVudExlZnQ7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB5OiB0b3AsXG4gICAgICAgICAgICB4OiBsZWZ0XG4gICAgICAgIH07XG4gICAgfTtcbiAgICBcbiAgICBwYXBlcnByb3RvLmdldEVsZW1lbnRCeVBvaW50ID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgdmFyIHBhcGVyID0gdGhpcyxcbiAgICAgICAgICAgIHN2ZyA9IHBhcGVyLmNhbnZhcyxcbiAgICAgICAgICAgIHRhcmdldCA9IGcuZG9jLmVsZW1lbnRGcm9tUG9pbnQoeCwgeSk7XG4gICAgICAgIGlmIChnLndpbi5vcGVyYSAmJiB0YXJnZXQudGFnTmFtZSA9PSBcInN2Z1wiKSB7XG4gICAgICAgICAgICB2YXIgc28gPSBnZXRPZmZzZXQoc3ZnKSxcbiAgICAgICAgICAgICAgICBzciA9IHN2Zy5jcmVhdGVTVkdSZWN0KCk7XG4gICAgICAgICAgICBzci54ID0geCAtIHNvLng7XG4gICAgICAgICAgICBzci55ID0geSAtIHNvLnk7XG4gICAgICAgICAgICBzci53aWR0aCA9IHNyLmhlaWdodCA9IDE7XG4gICAgICAgICAgICB2YXIgaGl0cyA9IHN2Zy5nZXRJbnRlcnNlY3Rpb25MaXN0KHNyLCBudWxsKTtcbiAgICAgICAgICAgIGlmIChoaXRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHRhcmdldCA9IGhpdHNbaGl0cy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIXRhcmdldCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgd2hpbGUgKHRhcmdldC5wYXJlbnROb2RlICYmIHRhcmdldCAhPSBzdmcucGFyZW50Tm9kZSAmJiAhdGFyZ2V0LnJhcGhhZWwpIHtcbiAgICAgICAgICAgIHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlO1xuICAgICAgICB9XG4gICAgICAgIHRhcmdldCA9PSBwYXBlci5jYW52YXMucGFyZW50Tm9kZSAmJiAodGFyZ2V0ID0gc3ZnKTtcbiAgICAgICAgdGFyZ2V0ID0gdGFyZ2V0ICYmIHRhcmdldC5yYXBoYWVsID8gcGFwZXIuZ2V0QnlJZCh0YXJnZXQucmFwaGFlbGlkKSA6IG51bGw7XG4gICAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfTtcbiAgICBcbiAgICBwYXBlcnByb3RvLmdldEJ5SWQgPSBmdW5jdGlvbiAoaWQpIHtcbiAgICAgICAgdmFyIGJvdCA9IHRoaXMuYm90dG9tO1xuICAgICAgICB3aGlsZSAoYm90KSB7XG4gICAgICAgICAgICBpZiAoYm90LmlkID09IGlkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGJvdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJvdCA9IGJvdC5uZXh0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH07XG4gICAgXG4gICAgcGFwZXJwcm90by5mb3JFYWNoID0gZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICAgIHZhciBib3QgPSB0aGlzLmJvdHRvbTtcbiAgICAgICAgd2hpbGUgKGJvdCkge1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrLmNhbGwodGhpc0FyZywgYm90KSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJvdCA9IGJvdC5uZXh0O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgcGFwZXJwcm90by5nZXRFbGVtZW50c0J5UG9pbnQgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICB2YXIgc2V0ID0gdGhpcy5zZXQoKTtcbiAgICAgICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgaWYgKGVsLmlzUG9pbnRJbnNpZGUoeCwgeSkpIHtcbiAgICAgICAgICAgICAgICBzZXQucHVzaChlbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gc2V0O1xuICAgIH07XG4gICAgZnVuY3Rpb24geF95KCkge1xuICAgICAgICByZXR1cm4gdGhpcy54ICsgUyArIHRoaXMueTtcbiAgICB9XG4gICAgZnVuY3Rpb24geF95X3dfaCgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMueCArIFMgKyB0aGlzLnkgKyBTICsgdGhpcy53aWR0aCArIFwiIFxceGQ3IFwiICsgdGhpcy5oZWlnaHQ7XG4gICAgfVxuICAgIFxuICAgIGVscHJvdG8uaXNQb2ludEluc2lkZSA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgIHZhciBycCA9IHRoaXMucmVhbFBhdGggPSB0aGlzLnJlYWxQYXRoIHx8IGdldFBhdGhbdGhpcy50eXBlXSh0aGlzKTtcbiAgICAgICAgcmV0dXJuIFIuaXNQb2ludEluc2lkZVBhdGgocnAsIHgsIHkpO1xuICAgIH07XG4gICAgXG4gICAgZWxwcm90by5nZXRCQm94ID0gZnVuY3Rpb24gKGlzV2l0aG91dFRyYW5zZm9ybSkge1xuICAgICAgICBpZiAodGhpcy5yZW1vdmVkKSB7XG4gICAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH1cbiAgICAgICAgdmFyIF8gPSB0aGlzLl87XG4gICAgICAgIGlmIChpc1dpdGhvdXRUcmFuc2Zvcm0pIHtcbiAgICAgICAgICAgIGlmIChfLmRpcnR5IHx8ICFfLmJib3h3dCkge1xuICAgICAgICAgICAgICAgIHRoaXMucmVhbFBhdGggPSBnZXRQYXRoW3RoaXMudHlwZV0odGhpcyk7XG4gICAgICAgICAgICAgICAgXy5iYm94d3QgPSBwYXRoRGltZW5zaW9ucyh0aGlzLnJlYWxQYXRoKTtcbiAgICAgICAgICAgICAgICBfLmJib3h3dC50b1N0cmluZyA9IHhfeV93X2g7XG4gICAgICAgICAgICAgICAgXy5kaXJ0eSA9IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gXy5iYm94d3Q7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKF8uZGlydHkgfHwgXy5kaXJ0eVQgfHwgIV8uYmJveCkge1xuICAgICAgICAgICAgaWYgKF8uZGlydHkgfHwgIXRoaXMucmVhbFBhdGgpIHtcbiAgICAgICAgICAgICAgICBfLmJib3h3dCA9IDA7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWFsUGF0aCA9IGdldFBhdGhbdGhpcy50eXBlXSh0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF8uYmJveCA9IHBhdGhEaW1lbnNpb25zKG1hcFBhdGgodGhpcy5yZWFsUGF0aCwgdGhpcy5tYXRyaXgpKTtcbiAgICAgICAgICAgIF8uYmJveC50b1N0cmluZyA9IHhfeV93X2g7XG4gICAgICAgICAgICBfLmRpcnR5ID0gXy5kaXJ0eVQgPSAwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBfLmJib3g7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLmNsb25lID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5yZW1vdmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgb3V0ID0gdGhpcy5wYXBlclt0aGlzLnR5cGVdKCkuYXR0cih0aGlzLmF0dHIoKSk7XG4gICAgICAgIHRoaXMuX19zZXRfXyAmJiB0aGlzLl9fc2V0X18ucHVzaChvdXQpO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG4gICAgXG4gICAgZWxwcm90by5nbG93ID0gZnVuY3Rpb24gKGdsb3cpIHtcbiAgICAgICAgaWYgKHRoaXMudHlwZSA9PSBcInRleHRcIikge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgZ2xvdyA9IGdsb3cgfHwge307XG4gICAgICAgIHZhciBzID0ge1xuICAgICAgICAgICAgd2lkdGg6IChnbG93LndpZHRoIHx8IDEwKSArICgrdGhpcy5hdHRyKFwic3Ryb2tlLXdpZHRoXCIpIHx8IDEpLFxuICAgICAgICAgICAgZmlsbDogZ2xvdy5maWxsIHx8IGZhbHNlLFxuICAgICAgICAgICAgb3BhY2l0eTogZ2xvdy5vcGFjaXR5IHx8IC41LFxuICAgICAgICAgICAgb2Zmc2V0eDogZ2xvdy5vZmZzZXR4IHx8IDAsXG4gICAgICAgICAgICBvZmZzZXR5OiBnbG93Lm9mZnNldHkgfHwgMCxcbiAgICAgICAgICAgIGNvbG9yOiBnbG93LmNvbG9yIHx8IFwiIzAwMFwiXG4gICAgICAgIH0sXG4gICAgICAgICAgICBjID0gcy53aWR0aCAvIDIsXG4gICAgICAgICAgICByID0gdGhpcy5wYXBlcixcbiAgICAgICAgICAgIG91dCA9IHIuc2V0KCksXG4gICAgICAgICAgICBwYXRoID0gdGhpcy5yZWFsUGF0aCB8fCBnZXRQYXRoW3RoaXMudHlwZV0odGhpcyk7XG4gICAgICAgIHBhdGggPSB0aGlzLm1hdHJpeCA/IG1hcFBhdGgocGF0aCwgdGhpcy5tYXRyaXgpIDogcGF0aDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBjICsgMTsgaSsrKSB7XG4gICAgICAgICAgICBvdXQucHVzaChyLnBhdGgocGF0aCkuYXR0cih7XG4gICAgICAgICAgICAgICAgc3Ryb2tlOiBzLmNvbG9yLFxuICAgICAgICAgICAgICAgIGZpbGw6IHMuZmlsbCA/IHMuY29sb3IgOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICBcInN0cm9rZS1saW5lam9pblwiOiBcInJvdW5kXCIsXG4gICAgICAgICAgICAgICAgXCJzdHJva2UtbGluZWNhcFwiOiBcInJvdW5kXCIsXG4gICAgICAgICAgICAgICAgXCJzdHJva2Utd2lkdGhcIjogKyhzLndpZHRoIC8gYyAqIGkpLnRvRml4ZWQoMyksXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogKyhzLm9wYWNpdHkgLyBjKS50b0ZpeGVkKDMpXG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dC5pbnNlcnRCZWZvcmUodGhpcykudHJhbnNsYXRlKHMub2Zmc2V0eCwgcy5vZmZzZXR5KTtcbiAgICB9O1xuICAgIHZhciBjdXJ2ZXNsZW5ndGhzID0ge30sXG4gICAgZ2V0UG9pbnRBdFNlZ21lbnRMZW5ndGggPSBmdW5jdGlvbiAocDF4LCBwMXksIGMxeCwgYzF5LCBjMngsIGMyeSwgcDJ4LCBwMnksIGxlbmd0aCkge1xuICAgICAgICBpZiAobGVuZ3RoID09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBiZXpsZW4ocDF4LCBwMXksIGMxeCwgYzF5LCBjMngsIGMyeSwgcDJ4LCBwMnkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFIuZmluZERvdHNBdFNlZ21lbnQocDF4LCBwMXksIGMxeCwgYzF5LCBjMngsIGMyeSwgcDJ4LCBwMnksIGdldFRhdExlbihwMXgsIHAxeSwgYzF4LCBjMXksIGMyeCwgYzJ5LCBwMngsIHAyeSwgbGVuZ3RoKSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGdldExlbmd0aEZhY3RvcnkgPSBmdW5jdGlvbiAoaXN0b3RhbCwgc3VicGF0aCkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHBhdGgsIGxlbmd0aCwgb25seXN0YXJ0KSB7XG4gICAgICAgICAgICBwYXRoID0gcGF0aDJjdXJ2ZShwYXRoKTtcbiAgICAgICAgICAgIHZhciB4LCB5LCBwLCBsLCBzcCA9IFwiXCIsIHN1YnBhdGhzID0ge30sIHBvaW50LFxuICAgICAgICAgICAgICAgIGxlbiA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBwYXRoLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBwID0gcGF0aFtpXTtcbiAgICAgICAgICAgICAgICBpZiAocFswXSA9PSBcIk1cIikge1xuICAgICAgICAgICAgICAgICAgICB4ID0gK3BbMV07XG4gICAgICAgICAgICAgICAgICAgIHkgPSArcFsyXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBsID0gZ2V0UG9pbnRBdFNlZ21lbnRMZW5ndGgoeCwgeSwgcFsxXSwgcFsyXSwgcFszXSwgcFs0XSwgcFs1XSwgcFs2XSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsZW4gKyBsID4gbGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3VicGF0aCAmJiAhc3VicGF0aHMuc3RhcnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb2ludCA9IGdldFBvaW50QXRTZWdtZW50TGVuZ3RoKHgsIHksIHBbMV0sIHBbMl0sIHBbM10sIHBbNF0sIHBbNV0sIHBbNl0sIGxlbmd0aCAtIGxlbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3AgKz0gW1wiQ1wiICsgcG9pbnQuc3RhcnQueCwgcG9pbnQuc3RhcnQueSwgcG9pbnQubS54LCBwb2ludC5tLnksIHBvaW50LngsIHBvaW50LnldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvbmx5c3RhcnQpIHtyZXR1cm4gc3A7fVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1YnBhdGhzLnN0YXJ0ID0gc3A7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3AgPSBbXCJNXCIgKyBwb2ludC54LCBwb2ludC55ICsgXCJDXCIgKyBwb2ludC5uLngsIHBvaW50Lm4ueSwgcG9pbnQuZW5kLngsIHBvaW50LmVuZC55LCBwWzVdLCBwWzZdXS5qb2luKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGVuICs9IGw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeCA9ICtwWzVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHkgPSArcFs2XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXN0b3RhbCAmJiAhc3VicGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50ID0gZ2V0UG9pbnRBdFNlZ21lbnRMZW5ndGgoeCwgeSwgcFsxXSwgcFsyXSwgcFszXSwgcFs0XSwgcFs1XSwgcFs2XSwgbGVuZ3RoIC0gbGVuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge3g6IHBvaW50LngsIHk6IHBvaW50LnksIGFscGhhOiBwb2ludC5hbHBoYX07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbGVuICs9IGw7XG4gICAgICAgICAgICAgICAgICAgIHggPSArcFs1XTtcbiAgICAgICAgICAgICAgICAgICAgeSA9ICtwWzZdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzcCArPSBwLnNoaWZ0KCkgKyBwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3VicGF0aHMuZW5kID0gc3A7XG4gICAgICAgICAgICBwb2ludCA9IGlzdG90YWwgPyBsZW4gOiBzdWJwYXRoID8gc3VicGF0aHMgOiBSLmZpbmREb3RzQXRTZWdtZW50KHgsIHksIHBbMF0sIHBbMV0sIHBbMl0sIHBbM10sIHBbNF0sIHBbNV0sIDEpO1xuICAgICAgICAgICAgcG9pbnQuYWxwaGEgJiYgKHBvaW50ID0ge3g6IHBvaW50LngsIHk6IHBvaW50LnksIGFscGhhOiBwb2ludC5hbHBoYX0pO1xuICAgICAgICAgICAgcmV0dXJuIHBvaW50O1xuICAgICAgICB9O1xuICAgIH07XG4gICAgdmFyIGdldFRvdGFsTGVuZ3RoID0gZ2V0TGVuZ3RoRmFjdG9yeSgxKSxcbiAgICAgICAgZ2V0UG9pbnRBdExlbmd0aCA9IGdldExlbmd0aEZhY3RvcnkoKSxcbiAgICAgICAgZ2V0U3VicGF0aHNBdExlbmd0aCA9IGdldExlbmd0aEZhY3RvcnkoMCwgMSk7XG4gICAgXG4gICAgUi5nZXRUb3RhbExlbmd0aCA9IGdldFRvdGFsTGVuZ3RoO1xuICAgIFxuICAgIFIuZ2V0UG9pbnRBdExlbmd0aCA9IGdldFBvaW50QXRMZW5ndGg7XG4gICAgXG4gICAgUi5nZXRTdWJwYXRoID0gZnVuY3Rpb24gKHBhdGgsIGZyb20sIHRvKSB7XG4gICAgICAgIGlmICh0aGlzLmdldFRvdGFsTGVuZ3RoKHBhdGgpIC0gdG8gPCAxZS02KSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0U3VicGF0aHNBdExlbmd0aChwYXRoLCBmcm9tKS5lbmQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGEgPSBnZXRTdWJwYXRoc0F0TGVuZ3RoKHBhdGgsIHRvLCAxKTtcbiAgICAgICAgcmV0dXJuIGZyb20gPyBnZXRTdWJwYXRoc0F0TGVuZ3RoKGEsIGZyb20pLmVuZCA6IGE7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLmdldFRvdGFsTGVuZ3RoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy50eXBlICE9IFwicGF0aFwiKSB7cmV0dXJuO31cbiAgICAgICAgaWYgKHRoaXMubm9kZS5nZXRUb3RhbExlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMubm9kZS5nZXRUb3RhbExlbmd0aCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBnZXRUb3RhbExlbmd0aCh0aGlzLmF0dHJzLnBhdGgpO1xuICAgIH07XG4gICAgXG4gICAgZWxwcm90by5nZXRQb2ludEF0TGVuZ3RoID0gZnVuY3Rpb24gKGxlbmd0aCkge1xuICAgICAgICBpZiAodGhpcy50eXBlICE9IFwicGF0aFwiKSB7cmV0dXJuO31cbiAgICAgICAgcmV0dXJuIGdldFBvaW50QXRMZW5ndGgodGhpcy5hdHRycy5wYXRoLCBsZW5ndGgpO1xuICAgIH07XG4gICAgXG4gICAgZWxwcm90by5nZXRTdWJwYXRoID0gZnVuY3Rpb24gKGZyb20sIHRvKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT0gXCJwYXRoXCIpIHtyZXR1cm47fVxuICAgICAgICByZXR1cm4gUi5nZXRTdWJwYXRoKHRoaXMuYXR0cnMucGF0aCwgZnJvbSwgdG8pO1xuICAgIH07XG4gICAgXG4gICAgdmFyIGVmID0gUi5lYXNpbmdfZm9ybXVsYXMgPSB7XG4gICAgICAgIGxpbmVhcjogZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICB9LFxuICAgICAgICBcIjxcIjogZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgIHJldHVybiBwb3cobiwgMS43KTtcbiAgICAgICAgfSxcbiAgICAgICAgXCI+XCI6IGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICByZXR1cm4gcG93KG4sIC40OCk7XG4gICAgICAgIH0sXG4gICAgICAgIFwiPD5cIjogZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgIHZhciBxID0gLjQ4IC0gbiAvIDEuMDQsXG4gICAgICAgICAgICAgICAgUSA9IG1hdGguc3FydCguMTczNCArIHEgKiBxKSxcbiAgICAgICAgICAgICAgICB4ID0gUSAtIHEsXG4gICAgICAgICAgICAgICAgWCA9IHBvdyhhYnMoeCksIDEgLyAzKSAqICh4IDwgMCA/IC0xIDogMSksXG4gICAgICAgICAgICAgICAgeSA9IC1RIC0gcSxcbiAgICAgICAgICAgICAgICBZID0gcG93KGFicyh5KSwgMSAvIDMpICogKHkgPCAwID8gLTEgOiAxKSxcbiAgICAgICAgICAgICAgICB0ID0gWCArIFkgKyAuNTtcbiAgICAgICAgICAgIHJldHVybiAoMSAtIHQpICogMyAqIHQgKiB0ICsgdCAqIHQgKiB0O1xuICAgICAgICB9LFxuICAgICAgICBiYWNrSW46IGZ1bmN0aW9uIChuKSB7XG4gICAgICAgICAgICB2YXIgcyA9IDEuNzAxNTg7XG4gICAgICAgICAgICByZXR1cm4gbiAqIG4gKiAoKHMgKyAxKSAqIG4gLSBzKTtcbiAgICAgICAgfSxcbiAgICAgICAgYmFja091dDogZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgIG4gPSBuIC0gMTtcbiAgICAgICAgICAgIHZhciBzID0gMS43MDE1ODtcbiAgICAgICAgICAgIHJldHVybiBuICogbiAqICgocyArIDEpICogbiArIHMpICsgMTtcbiAgICAgICAgfSxcbiAgICAgICAgZWxhc3RpYzogZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgIGlmIChuID09ICEhbikge1xuICAgICAgICAgICAgICAgIHJldHVybiBuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHBvdygyLCAtMTAgKiBuKSAqIG1hdGguc2luKChuIC0gLjA3NSkgKiAoMiAqIFBJKSAvIC4zKSArIDE7XG4gICAgICAgIH0sXG4gICAgICAgIGJvdW5jZTogZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgIHZhciBzID0gNy41NjI1LFxuICAgICAgICAgICAgICAgIHAgPSAyLjc1LFxuICAgICAgICAgICAgICAgIGw7XG4gICAgICAgICAgICBpZiAobiA8ICgxIC8gcCkpIHtcbiAgICAgICAgICAgICAgICBsID0gcyAqIG4gKiBuO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAobiA8ICgyIC8gcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgbiAtPSAoMS41IC8gcCk7XG4gICAgICAgICAgICAgICAgICAgIGwgPSBzICogbiAqIG4gKyAuNzU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG4gPCAoMi41IC8gcCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG4gLT0gKDIuMjUgLyBwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGwgPSBzICogbiAqIG4gKyAuOTM3NTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG4gLT0gKDIuNjI1IC8gcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBsID0gcyAqIG4gKiBuICsgLjk4NDM3NTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBsO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBlZi5lYXNlSW4gPSBlZltcImVhc2UtaW5cIl0gPSBlZltcIjxcIl07XG4gICAgZWYuZWFzZU91dCA9IGVmW1wiZWFzZS1vdXRcIl0gPSBlZltcIj5cIl07XG4gICAgZWYuZWFzZUluT3V0ID0gZWZbXCJlYXNlLWluLW91dFwiXSA9IGVmW1wiPD5cIl07XG4gICAgZWZbXCJiYWNrLWluXCJdID0gZWYuYmFja0luO1xuICAgIGVmW1wiYmFjay1vdXRcIl0gPSBlZi5iYWNrT3V0O1xuXG4gICAgLy8gQlJPV1NFUklGWSBNT0Q6IHVzZSBSLl9nLndpbiBoZXJlIGluc3RlYWQgb2Ygd2luZG93XG4gICAgdmFyIGFuaW1hdGlvbkVsZW1lbnRzID0gW10sXG4gICAgICAgIHJlcXVlc3RBbmltRnJhbWUgPSBSLl9nLndpbi5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgICAgICAgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFIuX2cud2luLndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgUi5fZy53aW4ubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lICAgIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBSLl9nLndpbi5vUmVxdWVzdEFuaW1hdGlvbkZyYW1lICAgICAgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFIuX2cud2luLm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lICAgICB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChjYWxsYmFjaywgMTYpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgYW5pbWF0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIE5vdyA9ICtuZXcgRGF0ZSxcbiAgICAgICAgICAgICAgICBsID0gMDtcbiAgICAgICAgICAgIGZvciAoOyBsIDwgYW5pbWF0aW9uRWxlbWVudHMubGVuZ3RoOyBsKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgZSA9IGFuaW1hdGlvbkVsZW1lbnRzW2xdO1xuICAgICAgICAgICAgICAgIGlmIChlLmVsLnJlbW92ZWQgfHwgZS5wYXVzZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciB0aW1lID0gTm93IC0gZS5zdGFydCxcbiAgICAgICAgICAgICAgICAgICAgbXMgPSBlLm1zLFxuICAgICAgICAgICAgICAgICAgICBlYXNpbmcgPSBlLmVhc2luZyxcbiAgICAgICAgICAgICAgICAgICAgZnJvbSA9IGUuZnJvbSxcbiAgICAgICAgICAgICAgICAgICAgZGlmZiA9IGUuZGlmZixcbiAgICAgICAgICAgICAgICAgICAgdG8gPSBlLnRvLFxuICAgICAgICAgICAgICAgICAgICB0ID0gZS50LFxuICAgICAgICAgICAgICAgICAgICB0aGF0ID0gZS5lbCxcbiAgICAgICAgICAgICAgICAgICAgc2V0ID0ge30sXG4gICAgICAgICAgICAgICAgICAgIG5vdyxcbiAgICAgICAgICAgICAgICAgICAgaW5pdCA9IHt9LFxuICAgICAgICAgICAgICAgICAgICBrZXk7XG4gICAgICAgICAgICAgICAgaWYgKGUuaW5pdHN0YXR1cykge1xuICAgICAgICAgICAgICAgICAgICB0aW1lID0gKGUuaW5pdHN0YXR1cyAqIGUuYW5pbS50b3AgLSBlLnByZXYpIC8gKGUucGVyY2VudCAtIGUucHJldikgKiBtcztcbiAgICAgICAgICAgICAgICAgICAgZS5zdGF0dXMgPSBlLmluaXRzdGF0dXM7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBlLmluaXRzdGF0dXM7XG4gICAgICAgICAgICAgICAgICAgIGUuc3RvcCAmJiBhbmltYXRpb25FbGVtZW50cy5zcGxpY2UobC0tLCAxKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlLnN0YXR1cyA9IChlLnByZXYgKyAoZS5wZXJjZW50IC0gZS5wcmV2KSAqICh0aW1lIC8gbXMpKSAvIGUuYW5pbS50b3A7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aW1lIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRpbWUgPCBtcykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcG9zID0gZWFzaW5nKHRpbWUgLyBtcyk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGF0dHIgaW4gZnJvbSkgaWYgKGZyb21baGFzXShhdHRyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChhdmFpbGFibGVBbmltQXR0cnNbYXR0cl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIG51OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3cgPSArZnJvbVthdHRyXSArIHBvcyAqIG1zICogZGlmZlthdHRyXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNvbG91clwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3cgPSBcInJnYihcIiArIFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwdG8yNTUocm91bmQoZnJvbVthdHRyXS5yICsgcG9zICogbXMgKiBkaWZmW2F0dHJdLnIpKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwdG8yNTUocm91bmQoZnJvbVthdHRyXS5nICsgcG9zICogbXMgKiBkaWZmW2F0dHJdLmcpKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwdG8yNTUocm91bmQoZnJvbVthdHRyXS5iICsgcG9zICogbXMgKiBkaWZmW2F0dHJdLmIpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdLmpvaW4oXCIsXCIpICsgXCIpXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJwYXRoXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vdyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBmcm9tW2F0dHJdLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vd1tpXSA9IFtmcm9tW2F0dHJdW2ldWzBdXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAxLCBqaiA9IGZyb21bYXR0cl1baV0ubGVuZ3RoOyBqIDwgamo7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vd1tpXVtqXSA9ICtmcm9tW2F0dHJdW2ldW2pdICsgcG9zICogbXMgKiBkaWZmW2F0dHJdW2ldW2pdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm93W2ldID0gbm93W2ldLmpvaW4oUyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm93ID0gbm93LmpvaW4oUyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ0cmFuc2Zvcm1cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRpZmZbYXR0cl0ucmVhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm93ID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwLCBpaSA9IGZyb21bYXR0cl0ubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vd1tpXSA9IFtmcm9tW2F0dHJdW2ldWzBdXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGogPSAxLCBqaiA9IGZyb21bYXR0cl1baV0ubGVuZ3RoOyBqIDwgamo7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3dbaV1bal0gPSBmcm9tW2F0dHJdW2ldW2pdICsgcG9zICogbXMgKiBkaWZmW2F0dHJdW2ldW2pdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBnZXQgPSBmdW5jdGlvbiAoaSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiArZnJvbVthdHRyXVtpXSArIHBvcyAqIG1zICogZGlmZlthdHRyXVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBub3cgPSBbW1wiclwiLCBnZXQoMiksIDAsIDBdLCBbXCJ0XCIsIGdldCgzKSwgZ2V0KDQpXSwgW1wic1wiLCBnZXQoMCksIGdldCgxKSwgMCwgMF1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm93ID0gW1tcIm1cIiwgZ2V0KDApLCBnZXQoMSksIGdldCgyKSwgZ2V0KDMpLCBnZXQoNCksIGdldCg1KV1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjc3ZcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHIgPT0gXCJjbGlwLXJlY3RcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm93ID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpID0gNDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3dbaV0gPSArZnJvbVthdHRyXVtpXSArIHBvcyAqIG1zICogZGlmZlthdHRyXVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZnJvbTIgPSBbXVtjb25jYXRdKGZyb21bYXR0cl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3cgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaSA9IHRoYXQucGFwZXIuY3VzdG9tQXR0cmlidXRlc1thdHRyXS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vd1tpXSA9ICtmcm9tMltpXSArIHBvcyAqIG1zICogZGlmZlthdHRyXVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFthdHRyXSA9IG5vdztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB0aGF0LmF0dHIoc2V0KTtcbiAgICAgICAgICAgICAgICAgICAgKGZ1bmN0aW9uIChpZCwgdGhhdCwgYW5pbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlKFwicmFwaGFlbC5hbmltLmZyYW1lLlwiICsgaWQsIHRoYXQsIGFuaW0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pKHRoYXQuaWQsIHRoYXQsIGUuYW5pbSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgKGZ1bmN0aW9uKGYsIGVsLCBhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV2ZShcInJhcGhhZWwuYW5pbS5mcmFtZS5cIiArIGVsLmlkLCBlbCwgYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlKFwicmFwaGFlbC5hbmltLmZpbmlzaC5cIiArIGVsLmlkLCBlbCwgYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgUi5pcyhmLCBcImZ1bmN0aW9uXCIpICYmIGYuY2FsbChlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSkoZS5jYWxsYmFjaywgdGhhdCwgZS5hbmltKTtcbiAgICAgICAgICAgICAgICAgICAgdGhhdC5hdHRyKHRvKTtcbiAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uRWxlbWVudHMuc3BsaWNlKGwtLSwgMSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlLnJlcGVhdCA+IDEgJiYgIWUubmV4dCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChrZXkgaW4gdG8pIGlmICh0b1toYXNdKGtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0W2tleV0gPSBlLnRvdGFsT3JpZ2luW2tleV07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBlLmVsLmF0dHIoaW5pdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBydW5BbmltYXRpb24oZS5hbmltLCBlLmVsLCBlLmFuaW0ucGVyY2VudHNbMF0sIG51bGwsIGUudG90YWxPcmlnaW4sIGUucmVwZWF0IC0gMSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGUubmV4dCAmJiAhZS5zdG9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBydW5BbmltYXRpb24oZS5hbmltLCBlLmVsLCBlLm5leHQsIG51bGwsIGUudG90YWxPcmlnaW4sIGUucmVwZWF0KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFIuc3ZnICYmIHRoYXQgJiYgdGhhdC5wYXBlciAmJiB0aGF0LnBhcGVyLnNhZmFyaSgpO1xuICAgICAgICAgICAgYW5pbWF0aW9uRWxlbWVudHMubGVuZ3RoICYmIHJlcXVlc3RBbmltRnJhbWUoYW5pbWF0aW9uKTtcbiAgICAgICAgfSxcbiAgICAgICAgdXB0bzI1NSA9IGZ1bmN0aW9uIChjb2xvcikge1xuICAgICAgICAgICAgcmV0dXJuIGNvbG9yID4gMjU1ID8gMjU1IDogY29sb3IgPCAwID8gMCA6IGNvbG9yO1xuICAgICAgICB9O1xuICAgIFxuICAgIGVscHJvdG8uYW5pbWF0ZVdpdGggPSBmdW5jdGlvbiAoZWwsIGFuaW0sIHBhcmFtcywgbXMsIGVhc2luZywgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSB0aGlzO1xuICAgICAgICBpZiAoZWxlbWVudC5yZW1vdmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjay5jYWxsKGVsZW1lbnQpO1xuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGEgPSBwYXJhbXMgaW5zdGFuY2VvZiBBbmltYXRpb24gPyBwYXJhbXMgOiBSLmFuaW1hdGlvbihwYXJhbXMsIG1zLCBlYXNpbmcsIGNhbGxiYWNrKSxcbiAgICAgICAgICAgIHgsIHk7XG4gICAgICAgIHJ1bkFuaW1hdGlvbihhLCBlbGVtZW50LCBhLnBlcmNlbnRzWzBdLCBudWxsLCBlbGVtZW50LmF0dHIoKSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IGFuaW1hdGlvbkVsZW1lbnRzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChhbmltYXRpb25FbGVtZW50c1tpXS5hbmltID09IGFuaW0gJiYgYW5pbWF0aW9uRWxlbWVudHNbaV0uZWwgPT0gZWwpIHtcbiAgICAgICAgICAgICAgICBhbmltYXRpb25FbGVtZW50c1tpaSAtIDFdLnN0YXJ0ID0gYW5pbWF0aW9uRWxlbWVudHNbaV0uc3RhcnQ7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgICAgIC8vIFxuICAgICAgICAvLyBcbiAgICAgICAgLy8gdmFyIGEgPSBwYXJhbXMgPyBSLmFuaW1hdGlvbihwYXJhbXMsIG1zLCBlYXNpbmcsIGNhbGxiYWNrKSA6IGFuaW0sXG4gICAgICAgIC8vICAgICBzdGF0dXMgPSBlbGVtZW50LnN0YXR1cyhhbmltKTtcbiAgICAgICAgLy8gcmV0dXJuIHRoaXMuYW5pbWF0ZShhKS5zdGF0dXMoYSwgc3RhdHVzICogYW5pbS5tcyAvIGEubXMpO1xuICAgIH07XG4gICAgZnVuY3Rpb24gQ3ViaWNCZXppZXJBdFRpbWUodCwgcDF4LCBwMXksIHAyeCwgcDJ5LCBkdXJhdGlvbikge1xuICAgICAgICB2YXIgY3ggPSAzICogcDF4LFxuICAgICAgICAgICAgYnggPSAzICogKHAyeCAtIHAxeCkgLSBjeCxcbiAgICAgICAgICAgIGF4ID0gMSAtIGN4IC0gYngsXG4gICAgICAgICAgICBjeSA9IDMgKiBwMXksXG4gICAgICAgICAgICBieSA9IDMgKiAocDJ5IC0gcDF5KSAtIGN5LFxuICAgICAgICAgICAgYXkgPSAxIC0gY3kgLSBieTtcbiAgICAgICAgZnVuY3Rpb24gc2FtcGxlQ3VydmVYKHQpIHtcbiAgICAgICAgICAgIHJldHVybiAoKGF4ICogdCArIGJ4KSAqIHQgKyBjeCkgKiB0O1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIHNvbHZlKHgsIGVwc2lsb24pIHtcbiAgICAgICAgICAgIHZhciB0ID0gc29sdmVDdXJ2ZVgoeCwgZXBzaWxvbik7XG4gICAgICAgICAgICByZXR1cm4gKChheSAqIHQgKyBieSkgKiB0ICsgY3kpICogdDtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBzb2x2ZUN1cnZlWCh4LCBlcHNpbG9uKSB7XG4gICAgICAgICAgICB2YXIgdDAsIHQxLCB0MiwgeDIsIGQyLCBpO1xuICAgICAgICAgICAgZm9yKHQyID0geCwgaSA9IDA7IGkgPCA4OyBpKyspIHtcbiAgICAgICAgICAgICAgICB4MiA9IHNhbXBsZUN1cnZlWCh0MikgLSB4O1xuICAgICAgICAgICAgICAgIGlmIChhYnMoeDIpIDwgZXBzaWxvbikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGQyID0gKDMgKiBheCAqIHQyICsgMiAqIGJ4KSAqIHQyICsgY3g7XG4gICAgICAgICAgICAgICAgaWYgKGFicyhkMikgPCAxZS02KSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0MiA9IHQyIC0geDIgLyBkMjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHQwID0gMDtcbiAgICAgICAgICAgIHQxID0gMTtcbiAgICAgICAgICAgIHQyID0geDtcbiAgICAgICAgICAgIGlmICh0MiA8IHQwKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHQwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHQyID4gdDEpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aGlsZSAodDAgPCB0MSkge1xuICAgICAgICAgICAgICAgIHgyID0gc2FtcGxlQ3VydmVYKHQyKTtcbiAgICAgICAgICAgICAgICBpZiAoYWJzKHgyIC0geCkgPCBlcHNpbG9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0MjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHggPiB4Mikge1xuICAgICAgICAgICAgICAgICAgICB0MCA9IHQyO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHQxID0gdDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHQyID0gKHQxIC0gdDApIC8gMiArIHQwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHQyO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzb2x2ZSh0LCAxIC8gKDIwMCAqIGR1cmF0aW9uKSk7XG4gICAgfVxuICAgIGVscHJvdG8ub25BbmltYXRpb24gPSBmdW5jdGlvbiAoZikge1xuICAgICAgICBmID8gZXZlLm9uKFwicmFwaGFlbC5hbmltLmZyYW1lLlwiICsgdGhpcy5pZCwgZikgOiBldmUudW5iaW5kKFwicmFwaGFlbC5hbmltLmZyYW1lLlwiICsgdGhpcy5pZCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgZnVuY3Rpb24gQW5pbWF0aW9uKGFuaW0sIG1zKSB7XG4gICAgICAgIHZhciBwZXJjZW50cyA9IFtdLFxuICAgICAgICAgICAgbmV3QW5pbSA9IHt9O1xuICAgICAgICB0aGlzLm1zID0gbXM7XG4gICAgICAgIHRoaXMudGltZXMgPSAxO1xuICAgICAgICBpZiAoYW5pbSkge1xuICAgICAgICAgICAgZm9yICh2YXIgYXR0ciBpbiBhbmltKSBpZiAoYW5pbVtoYXNdKGF0dHIpKSB7XG4gICAgICAgICAgICAgICAgbmV3QW5pbVt0b0Zsb2F0KGF0dHIpXSA9IGFuaW1bYXR0cl07XG4gICAgICAgICAgICAgICAgcGVyY2VudHMucHVzaCh0b0Zsb2F0KGF0dHIpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBlcmNlbnRzLnNvcnQoc29ydEJ5TnVtYmVyKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFuaW0gPSBuZXdBbmltO1xuICAgICAgICB0aGlzLnRvcCA9IHBlcmNlbnRzW3BlcmNlbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgICB0aGlzLnBlcmNlbnRzID0gcGVyY2VudHM7XG4gICAgfVxuICAgIFxuICAgIEFuaW1hdGlvbi5wcm90b3R5cGUuZGVsYXkgPSBmdW5jdGlvbiAoZGVsYXkpIHtcbiAgICAgICAgdmFyIGEgPSBuZXcgQW5pbWF0aW9uKHRoaXMuYW5pbSwgdGhpcy5tcyk7XG4gICAgICAgIGEudGltZXMgPSB0aGlzLnRpbWVzO1xuICAgICAgICBhLmRlbCA9ICtkZWxheSB8fCAwO1xuICAgICAgICByZXR1cm4gYTtcbiAgICB9O1xuICAgIFxuICAgIEFuaW1hdGlvbi5wcm90b3R5cGUucmVwZWF0ID0gZnVuY3Rpb24gKHRpbWVzKSB7IFxuICAgICAgICB2YXIgYSA9IG5ldyBBbmltYXRpb24odGhpcy5hbmltLCB0aGlzLm1zKTtcbiAgICAgICAgYS5kZWwgPSB0aGlzLmRlbDtcbiAgICAgICAgYS50aW1lcyA9IG1hdGguZmxvb3IobW1heCh0aW1lcywgMCkpIHx8IDE7XG4gICAgICAgIHJldHVybiBhO1xuICAgIH07XG4gICAgZnVuY3Rpb24gcnVuQW5pbWF0aW9uKGFuaW0sIGVsZW1lbnQsIHBlcmNlbnQsIHN0YXR1cywgdG90YWxPcmlnaW4sIHRpbWVzKSB7XG4gICAgICAgIHBlcmNlbnQgPSB0b0Zsb2F0KHBlcmNlbnQpO1xuICAgICAgICB2YXIgcGFyYW1zLFxuICAgICAgICAgICAgaXNJbkFuaW0sXG4gICAgICAgICAgICBpc0luQW5pbVNldCxcbiAgICAgICAgICAgIHBlcmNlbnRzID0gW10sXG4gICAgICAgICAgICBuZXh0LFxuICAgICAgICAgICAgcHJldixcbiAgICAgICAgICAgIHRpbWVzdGFtcCxcbiAgICAgICAgICAgIG1zID0gYW5pbS5tcyxcbiAgICAgICAgICAgIGZyb20gPSB7fSxcbiAgICAgICAgICAgIHRvID0ge30sXG4gICAgICAgICAgICBkaWZmID0ge307XG4gICAgICAgIGlmIChzdGF0dXMpIHtcbiAgICAgICAgICAgIGZvciAoaSA9IDAsIGlpID0gYW5pbWF0aW9uRWxlbWVudHMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIHZhciBlID0gYW5pbWF0aW9uRWxlbWVudHNbaV07XG4gICAgICAgICAgICAgICAgaWYgKGUuZWwuaWQgPT0gZWxlbWVudC5pZCAmJiBlLmFuaW0gPT0gYW5pbSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZS5wZXJjZW50ICE9IHBlcmNlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuaW1hdGlvbkVsZW1lbnRzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzSW5BbmltU2V0ID0gMTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzSW5BbmltID0gZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoZS50b3RhbE9yaWdpbik7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0YXR1cyA9ICt0bzsgLy8gTmFOXG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gYW5pbS5wZXJjZW50cy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYW5pbS5wZXJjZW50c1tpXSA9PSBwZXJjZW50IHx8IGFuaW0ucGVyY2VudHNbaV0gPiBzdGF0dXMgKiBhbmltLnRvcCkge1xuICAgICAgICAgICAgICAgIHBlcmNlbnQgPSBhbmltLnBlcmNlbnRzW2ldO1xuICAgICAgICAgICAgICAgIHByZXYgPSBhbmltLnBlcmNlbnRzW2kgLSAxXSB8fCAwO1xuICAgICAgICAgICAgICAgIG1zID0gbXMgLyBhbmltLnRvcCAqIChwZXJjZW50IC0gcHJldik7XG4gICAgICAgICAgICAgICAgbmV4dCA9IGFuaW0ucGVyY2VudHNbaSArIDFdO1xuICAgICAgICAgICAgICAgIHBhcmFtcyA9IGFuaW0uYW5pbVtwZXJjZW50XTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdHVzKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5hdHRyKGFuaW0uYW5pbVthbmltLnBlcmNlbnRzW2ldXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFwYXJhbXMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWlzSW5BbmltKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBhdHRyIGluIHBhcmFtcykgaWYgKHBhcmFtc1toYXNdKGF0dHIpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGF2YWlsYWJsZUFuaW1BdHRyc1toYXNdKGF0dHIpIHx8IGVsZW1lbnQucGFwZXIuY3VzdG9tQXR0cmlidXRlc1toYXNdKGF0dHIpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZyb21bYXR0cl0gPSBlbGVtZW50LmF0dHIoYXR0cik7XG4gICAgICAgICAgICAgICAgICAgIChmcm9tW2F0dHJdID09IG51bGwpICYmIChmcm9tW2F0dHJdID0gYXZhaWxhYmxlQXR0cnNbYXR0cl0pO1xuICAgICAgICAgICAgICAgICAgICB0b1thdHRyXSA9IHBhcmFtc1thdHRyXTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChhdmFpbGFibGVBbmltQXR0cnNbYXR0cl0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgbnU6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlmZlthdHRyXSA9ICh0b1thdHRyXSAtIGZyb21bYXR0cl0pIC8gbXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY29sb3VyXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJvbVthdHRyXSA9IFIuZ2V0UkdCKGZyb21bYXR0cl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB0b0NvbG91ciA9IFIuZ2V0UkdCKHRvW2F0dHJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWZmW2F0dHJdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByOiAodG9Db2xvdXIuciAtIGZyb21bYXR0cl0ucikgLyBtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZzogKHRvQ29sb3VyLmcgLSBmcm9tW2F0dHJdLmcpIC8gbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGI6ICh0b0NvbG91ci5iIC0gZnJvbVthdHRyXS5iKSAvIG1zXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJwYXRoXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhdGhlcyA9IHBhdGgyY3VydmUoZnJvbVthdHRyXSwgdG9bYXR0cl0pLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b1BhdGggPSBwYXRoZXNbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJvbVthdHRyXSA9IHBhdGhlc1swXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWZmW2F0dHJdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChpID0gMCwgaWkgPSBmcm9tW2F0dHJdLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlmZlthdHRyXVtpXSA9IFswXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDEsIGpqID0gZnJvbVthdHRyXVtpXS5sZW5ndGg7IGogPCBqajsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWZmW2F0dHJdW2ldW2pdID0gKHRvUGF0aFtpXVtqXSAtIGZyb21bYXR0cl1baV1bal0pIC8gbXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwidHJhbnNmb3JtXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIF8gPSBlbGVtZW50Ll8sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVxID0gZXF1YWxpc2VUcmFuc2Zvcm0oX1thdHRyXSwgdG9bYXR0cl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcm9tW2F0dHJdID0gZXEuZnJvbTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9bYXR0cl0gPSBlcS50bztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlmZlthdHRyXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWZmW2F0dHJdLnJlYWwgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwLCBpaSA9IGZyb21bYXR0cl0ubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlmZlthdHRyXVtpXSA9IFtmcm9tW2F0dHJdW2ldWzBdXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaiA9IDEsIGpqID0gZnJvbVthdHRyXVtpXS5sZW5ndGg7IGogPCBqajsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlmZlthdHRyXVtpXVtqXSA9ICh0b1thdHRyXVtpXVtqXSAtIGZyb21bYXR0cl1baV1bal0pIC8gbXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgbSA9IChlbGVtZW50Lm1hdHJpeCB8fCBuZXcgTWF0cml4KSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvMiA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfOiB7dHJhbnNmb3JtOiBfLnRyYW5zZm9ybX0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0QkJveDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC5nZXRCQm94KDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyb21bYXR0cl0gPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLmEsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLmIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLmMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLmQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLmUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLmZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXh0cmFjdFRyYW5zZm9ybSh0bzIsIHRvW2F0dHJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG9bYXR0cl0gPSB0bzIuXy50cmFuc2Zvcm07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZbYXR0cl0gPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodG8yLm1hdHJpeC5hIC0gbS5hKSAvIG1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRvMi5tYXRyaXguYiAtIG0uYikgLyBtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0bzIubWF0cml4LmMgLSBtLmMpIC8gbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodG8yLm1hdHJpeC5kIC0gbS5kKSAvIG1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRvMi5tYXRyaXguZSAtIG0uZSkgLyBtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0bzIubWF0cml4LmYgLSBtLmYpIC8gbXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZnJvbVthdHRyXSA9IFtfLnN4LCBfLnN5LCBfLmRlZywgXy5keCwgXy5keV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHZhciB0bzIgPSB7Xzp7fSwgZ2V0QkJveDogZnVuY3Rpb24gKCkgeyByZXR1cm4gZWxlbWVudC5nZXRCQm94KCk7IH19O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBleHRyYWN0VHJhbnNmb3JtKHRvMiwgdG9bYXR0cl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBkaWZmW2F0dHJdID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgKHRvMi5fLnN4IC0gXy5zeCkgLyBtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICh0bzIuXy5zeSAtIF8uc3kpIC8gbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAodG8yLl8uZGVnIC0gXy5kZWcpIC8gbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAodG8yLl8uZHggLSBfLmR4KSAvIG1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgKHRvMi5fLmR5IC0gXy5keSkgLyBtc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjc3ZcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWVzID0gU3RyKHBhcmFtc1thdHRyXSlbc3BsaXRdKHNlcGFyYXRvciksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyb20yID0gU3RyKGZyb21bYXR0cl0pW3NwbGl0XShzZXBhcmF0b3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRyID09IFwiY2xpcC1yZWN0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJvbVthdHRyXSA9IGZyb20yO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWZmW2F0dHJdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkgPSBmcm9tMi5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZbYXR0cl1baV0gPSAodmFsdWVzW2ldIC0gZnJvbVthdHRyXVtpXSkgLyBtcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b1thdHRyXSA9IHZhbHVlcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVzID0gW11bY29uY2F0XShwYXJhbXNbYXR0cl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyb20yID0gW11bY29uY2F0XShmcm9tW2F0dHJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWZmW2F0dHJdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaSA9IGVsZW1lbnQucGFwZXIuY3VzdG9tQXR0cmlidXRlc1thdHRyXS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWZmW2F0dHJdW2ldID0gKCh2YWx1ZXNbaV0gfHwgMCkgLSAoZnJvbTJbaV0gfHwgMCkpIC8gbXM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGVhc2luZyA9IHBhcmFtcy5lYXNpbmcsXG4gICAgICAgICAgICAgICAgZWFzeWVhc3kgPSBSLmVhc2luZ19mb3JtdWxhc1tlYXNpbmddO1xuICAgICAgICAgICAgaWYgKCFlYXN5ZWFzeSkge1xuICAgICAgICAgICAgICAgIGVhc3llYXN5ID0gU3RyKGVhc2luZykubWF0Y2goYmV6aWVycmcpO1xuICAgICAgICAgICAgICAgIGlmIChlYXN5ZWFzeSAmJiBlYXN5ZWFzeS5sZW5ndGggPT0gNSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY3VydmUgPSBlYXN5ZWFzeTtcbiAgICAgICAgICAgICAgICAgICAgZWFzeWVhc3kgPSBmdW5jdGlvbiAodCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEN1YmljQmV6aWVyQXRUaW1lKHQsICtjdXJ2ZVsxXSwgK2N1cnZlWzJdLCArY3VydmVbM10sICtjdXJ2ZVs0XSwgbXMpO1xuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGVhc3llYXN5ID0gcGlwZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aW1lc3RhbXAgPSBwYXJhbXMuc3RhcnQgfHwgYW5pbS5zdGFydCB8fCArbmV3IERhdGU7XG4gICAgICAgICAgICBlID0ge1xuICAgICAgICAgICAgICAgIGFuaW06IGFuaW0sXG4gICAgICAgICAgICAgICAgcGVyY2VudDogcGVyY2VudCxcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IHRpbWVzdGFtcCxcbiAgICAgICAgICAgICAgICBzdGFydDogdGltZXN0YW1wICsgKGFuaW0uZGVsIHx8IDApLFxuICAgICAgICAgICAgICAgIHN0YXR1czogMCxcbiAgICAgICAgICAgICAgICBpbml0c3RhdHVzOiBzdGF0dXMgfHwgMCxcbiAgICAgICAgICAgICAgICBzdG9wOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtczogbXMsXG4gICAgICAgICAgICAgICAgZWFzaW5nOiBlYXN5ZWFzeSxcbiAgICAgICAgICAgICAgICBmcm9tOiBmcm9tLFxuICAgICAgICAgICAgICAgIGRpZmY6IGRpZmYsXG4gICAgICAgICAgICAgICAgdG86IHRvLFxuICAgICAgICAgICAgICAgIGVsOiBlbGVtZW50LFxuICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBwYXJhbXMuY2FsbGJhY2ssXG4gICAgICAgICAgICAgICAgcHJldjogcHJldixcbiAgICAgICAgICAgICAgICBuZXh0OiBuZXh0LFxuICAgICAgICAgICAgICAgIHJlcGVhdDogdGltZXMgfHwgYW5pbS50aW1lcyxcbiAgICAgICAgICAgICAgICBvcmlnaW46IGVsZW1lbnQuYXR0cigpLFxuICAgICAgICAgICAgICAgIHRvdGFsT3JpZ2luOiB0b3RhbE9yaWdpblxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGFuaW1hdGlvbkVsZW1lbnRzLnB1c2goZSk7XG4gICAgICAgICAgICBpZiAoc3RhdHVzICYmICFpc0luQW5pbSAmJiAhaXNJbkFuaW1TZXQpIHtcbiAgICAgICAgICAgICAgICBlLnN0b3AgPSB0cnVlO1xuICAgICAgICAgICAgICAgIGUuc3RhcnQgPSBuZXcgRGF0ZSAtIG1zICogc3RhdHVzO1xuICAgICAgICAgICAgICAgIGlmIChhbmltYXRpb25FbGVtZW50cy5sZW5ndGggPT0gMSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYW5pbWF0aW9uKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlzSW5BbmltU2V0KSB7XG4gICAgICAgICAgICAgICAgZS5zdGFydCA9IG5ldyBEYXRlIC0gZS5tcyAqIHN0YXR1cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGFuaW1hdGlvbkVsZW1lbnRzLmxlbmd0aCA9PSAxICYmIHJlcXVlc3RBbmltRnJhbWUoYW5pbWF0aW9uKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlzSW5BbmltLmluaXRzdGF0dXMgPSBzdGF0dXM7XG4gICAgICAgICAgICBpc0luQW5pbS5zdGFydCA9IG5ldyBEYXRlIC0gaXNJbkFuaW0ubXMgKiBzdGF0dXM7XG4gICAgICAgIH1cbiAgICAgICAgZXZlKFwicmFwaGFlbC5hbmltLnN0YXJ0LlwiICsgZWxlbWVudC5pZCwgZWxlbWVudCwgYW5pbSk7XG4gICAgfVxuICAgIFxuICAgIFIuYW5pbWF0aW9uID0gZnVuY3Rpb24gKHBhcmFtcywgbXMsIGVhc2luZywgY2FsbGJhY2spIHtcbiAgICAgICAgaWYgKHBhcmFtcyBpbnN0YW5jZW9mIEFuaW1hdGlvbikge1xuICAgICAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICAgICAgfVxuICAgICAgICBpZiAoUi5pcyhlYXNpbmcsIFwiZnVuY3Rpb25cIikgfHwgIWVhc2luZykge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBjYWxsYmFjayB8fCBlYXNpbmcgfHwgbnVsbDtcbiAgICAgICAgICAgIGVhc2luZyA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcGFyYW1zID0gT2JqZWN0KHBhcmFtcyk7XG4gICAgICAgIG1zID0gK21zIHx8IDA7XG4gICAgICAgIHZhciBwID0ge30sXG4gICAgICAgICAgICBqc29uLFxuICAgICAgICAgICAgYXR0cjtcbiAgICAgICAgZm9yIChhdHRyIGluIHBhcmFtcykgaWYgKHBhcmFtc1toYXNdKGF0dHIpICYmIHRvRmxvYXQoYXR0cikgIT0gYXR0ciAmJiB0b0Zsb2F0KGF0dHIpICsgXCIlXCIgIT0gYXR0cikge1xuICAgICAgICAgICAganNvbiA9IHRydWU7XG4gICAgICAgICAgICBwW2F0dHJdID0gcGFyYW1zW2F0dHJdO1xuICAgICAgICB9XG4gICAgICAgIGlmICghanNvbikge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBBbmltYXRpb24ocGFyYW1zLCBtcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlYXNpbmcgJiYgKHAuZWFzaW5nID0gZWFzaW5nKTtcbiAgICAgICAgICAgIGNhbGxiYWNrICYmIChwLmNhbGxiYWNrID0gY2FsbGJhY2spO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBBbmltYXRpb24oezEwMDogcH0sIG1zKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgZWxwcm90by5hbmltYXRlID0gZnVuY3Rpb24gKHBhcmFtcywgbXMsIGVhc2luZywgY2FsbGJhY2spIHtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSB0aGlzO1xuICAgICAgICBpZiAoZWxlbWVudC5yZW1vdmVkKSB7XG4gICAgICAgICAgICBjYWxsYmFjayAmJiBjYWxsYmFjay5jYWxsKGVsZW1lbnQpO1xuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGFuaW0gPSBwYXJhbXMgaW5zdGFuY2VvZiBBbmltYXRpb24gPyBwYXJhbXMgOiBSLmFuaW1hdGlvbihwYXJhbXMsIG1zLCBlYXNpbmcsIGNhbGxiYWNrKTtcbiAgICAgICAgcnVuQW5pbWF0aW9uKGFuaW0sIGVsZW1lbnQsIGFuaW0ucGVyY2VudHNbMF0sIG51bGwsIGVsZW1lbnQuYXR0cigpKTtcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLnNldFRpbWUgPSBmdW5jdGlvbiAoYW5pbSwgdmFsdWUpIHtcbiAgICAgICAgaWYgKGFuaW0gJiYgdmFsdWUgIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5zdGF0dXMoYW5pbSwgbW1pbih2YWx1ZSwgYW5pbS5tcykgLyBhbmltLm1zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFxuICAgIGVscHJvdG8uc3RhdHVzID0gZnVuY3Rpb24gKGFuaW0sIHZhbHVlKSB7XG4gICAgICAgIHZhciBvdXQgPSBbXSxcbiAgICAgICAgICAgIGkgPSAwLFxuICAgICAgICAgICAgbGVuLFxuICAgICAgICAgICAgZTtcbiAgICAgICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJ1bkFuaW1hdGlvbihhbmltLCB0aGlzLCAtMSwgbW1pbih2YWx1ZSwgMSkpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBsZW4gPSBhbmltYXRpb25FbGVtZW50cy5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgICAgICAgICAgZSA9IGFuaW1hdGlvbkVsZW1lbnRzW2ldO1xuICAgICAgICAgICAgICAgIGlmIChlLmVsLmlkID09IHRoaXMuaWQgJiYgKCFhbmltIHx8IGUuYW5pbSA9PSBhbmltKSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYW5pbSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGUuc3RhdHVzO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuaW06IGUuYW5pbSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXR1czogZS5zdGF0dXNcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGFuaW0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIGVscHJvdG8ucGF1c2UgPSBmdW5jdGlvbiAoYW5pbSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFuaW1hdGlvbkVsZW1lbnRzLmxlbmd0aDsgaSsrKSBpZiAoYW5pbWF0aW9uRWxlbWVudHNbaV0uZWwuaWQgPT0gdGhpcy5pZCAmJiAoIWFuaW0gfHwgYW5pbWF0aW9uRWxlbWVudHNbaV0uYW5pbSA9PSBhbmltKSkge1xuICAgICAgICAgICAgaWYgKGV2ZShcInJhcGhhZWwuYW5pbS5wYXVzZS5cIiArIHRoaXMuaWQsIHRoaXMsIGFuaW1hdGlvbkVsZW1lbnRzW2ldLmFuaW0pICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIGFuaW1hdGlvbkVsZW1lbnRzW2ldLnBhdXNlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLnJlc3VtZSA9IGZ1bmN0aW9uIChhbmltKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYW5pbWF0aW9uRWxlbWVudHMubGVuZ3RoOyBpKyspIGlmIChhbmltYXRpb25FbGVtZW50c1tpXS5lbC5pZCA9PSB0aGlzLmlkICYmICghYW5pbSB8fCBhbmltYXRpb25FbGVtZW50c1tpXS5hbmltID09IGFuaW0pKSB7XG4gICAgICAgICAgICB2YXIgZSA9IGFuaW1hdGlvbkVsZW1lbnRzW2ldO1xuICAgICAgICAgICAgaWYgKGV2ZShcInJhcGhhZWwuYW5pbS5yZXN1bWUuXCIgKyB0aGlzLmlkLCB0aGlzLCBlLmFuaW0pICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBlLnBhdXNlZDtcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXR1cyhlLmFuaW0sIGUuc3RhdHVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFxuICAgIGVscHJvdG8uc3RvcCA9IGZ1bmN0aW9uIChhbmltKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYW5pbWF0aW9uRWxlbWVudHMubGVuZ3RoOyBpKyspIGlmIChhbmltYXRpb25FbGVtZW50c1tpXS5lbC5pZCA9PSB0aGlzLmlkICYmICghYW5pbSB8fCBhbmltYXRpb25FbGVtZW50c1tpXS5hbmltID09IGFuaW0pKSB7XG4gICAgICAgICAgICBpZiAoZXZlKFwicmFwaGFlbC5hbmltLnN0b3AuXCIgKyB0aGlzLmlkLCB0aGlzLCBhbmltYXRpb25FbGVtZW50c1tpXS5hbmltKSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBhbmltYXRpb25FbGVtZW50cy5zcGxpY2UoaS0tLCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIGZ1bmN0aW9uIHN0b3BBbmltYXRpb24ocGFwZXIpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbmltYXRpb25FbGVtZW50cy5sZW5ndGg7IGkrKykgaWYgKGFuaW1hdGlvbkVsZW1lbnRzW2ldLmVsLnBhcGVyID09IHBhcGVyKSB7XG4gICAgICAgICAgICBhbmltYXRpb25FbGVtZW50cy5zcGxpY2UoaS0tLCAxKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBldmUub24oXCJyYXBoYWVsLnJlbW92ZVwiLCBzdG9wQW5pbWF0aW9uKTtcbiAgICBldmUub24oXCJyYXBoYWVsLmNsZWFyXCIsIHN0b3BBbmltYXRpb24pO1xuICAgIGVscHJvdG8udG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBcIlJhcGhhXFx4ZWJsXFx1MjAxOXMgb2JqZWN0XCI7XG4gICAgfTtcblxuICAgIC8vIFNldFxuICAgIHZhciBTZXQgPSBmdW5jdGlvbiAoaXRlbXMpIHtcbiAgICAgICAgdGhpcy5pdGVtcyA9IFtdO1xuICAgICAgICB0aGlzLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMudHlwZSA9IFwic2V0XCI7XG4gICAgICAgIGlmIChpdGVtcykge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gaXRlbXMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChpdGVtc1tpXSAmJiAoaXRlbXNbaV0uY29uc3RydWN0b3IgPT0gZWxwcm90by5jb25zdHJ1Y3RvciB8fCBpdGVtc1tpXS5jb25zdHJ1Y3RvciA9PSBTZXQpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXNbdGhpcy5pdGVtcy5sZW5ndGhdID0gdGhpcy5pdGVtc1t0aGlzLml0ZW1zLmxlbmd0aF0gPSBpdGVtc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sZW5ndGgrKztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHNldHByb3RvID0gU2V0LnByb3RvdHlwZTtcbiAgICBcbiAgICBzZXRwcm90by5wdXNoID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaXRlbSxcbiAgICAgICAgICAgIGxlbjtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIGl0ZW0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgICAgICBpZiAoaXRlbSAmJiAoaXRlbS5jb25zdHJ1Y3RvciA9PSBlbHByb3RvLmNvbnN0cnVjdG9yIHx8IGl0ZW0uY29uc3RydWN0b3IgPT0gU2V0KSkge1xuICAgICAgICAgICAgICAgIGxlbiA9IHRoaXMuaXRlbXMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIHRoaXNbbGVuXSA9IHRoaXMuaXRlbXNbbGVuXSA9IGl0ZW07XG4gICAgICAgICAgICAgICAgdGhpcy5sZW5ndGgrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFxuICAgIHNldHByb3RvLnBvcCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5sZW5ndGggJiYgZGVsZXRlIHRoaXNbdGhpcy5sZW5ndGgtLV07XG4gICAgICAgIHJldHVybiB0aGlzLml0ZW1zLnBvcCgpO1xuICAgIH07XG4gICAgXG4gICAgc2V0cHJvdG8uZm9yRWFjaCA9IGZ1bmN0aW9uIChjYWxsYmFjaywgdGhpc0FyZykge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSB0aGlzLml0ZW1zLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChjYWxsYmFjay5jYWxsKHRoaXNBcmcsIHRoaXMuaXRlbXNbaV0sIGkpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgZm9yICh2YXIgbWV0aG9kIGluIGVscHJvdG8pIGlmIChlbHByb3RvW2hhc10obWV0aG9kKSkge1xuICAgICAgICBzZXRwcm90b1ttZXRob2RdID0gKGZ1bmN0aW9uIChtZXRob2RuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBhcmcgPSBhcmd1bWVudHM7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxbbWV0aG9kbmFtZV1bYXBwbHldKGVsLCBhcmcpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSkobWV0aG9kKTtcbiAgICB9XG4gICAgc2V0cHJvdG8uYXR0ciA9IGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSkge1xuICAgICAgICBpZiAobmFtZSAmJiBSLmlzKG5hbWUsIGFycmF5KSAmJiBSLmlzKG5hbWVbMF0sIFwib2JqZWN0XCIpKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMCwgamogPSBuYW1lLmxlbmd0aDsgaiA8IGpqOyBqKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLml0ZW1zW2pdLmF0dHIobmFtZVtqXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSB0aGlzLml0ZW1zLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0aGlzLml0ZW1zW2ldLmF0dHIobmFtZSwgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgc2V0cHJvdG8uY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdoaWxlICh0aGlzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5wb3AoKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgc2V0cHJvdG8uc3BsaWNlID0gZnVuY3Rpb24gKGluZGV4LCBjb3VudCwgaW5zZXJ0aW9uKSB7XG4gICAgICAgIGluZGV4ID0gaW5kZXggPCAwID8gbW1heCh0aGlzLmxlbmd0aCArIGluZGV4LCAwKSA6IGluZGV4O1xuICAgICAgICBjb3VudCA9IG1tYXgoMCwgbW1pbih0aGlzLmxlbmd0aCAtIGluZGV4LCBjb3VudCkpO1xuICAgICAgICB2YXIgdGFpbCA9IFtdLFxuICAgICAgICAgICAgdG9kZWwgPSBbXSxcbiAgICAgICAgICAgIGFyZ3MgPSBbXSxcbiAgICAgICAgICAgIGk7XG4gICAgICAgIGZvciAoaSA9IDI7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3MucHVzaChhcmd1bWVudHNbaV0pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICAgICAgICB0b2RlbC5wdXNoKHRoaXNbaW5kZXggKyBpXSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICg7IGkgPCB0aGlzLmxlbmd0aCAtIGluZGV4OyBpKyspIHtcbiAgICAgICAgICAgIHRhaWwucHVzaCh0aGlzW2luZGV4ICsgaV0pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBhcmdsZW4gPSBhcmdzLmxlbmd0aDtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGFyZ2xlbiArIHRhaWwubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMuaXRlbXNbaW5kZXggKyBpXSA9IHRoaXNbaW5kZXggKyBpXSA9IGkgPCBhcmdsZW4gPyBhcmdzW2ldIDogdGFpbFtpIC0gYXJnbGVuXTtcbiAgICAgICAgfVxuICAgICAgICBpID0gdGhpcy5pdGVtcy5sZW5ndGggPSB0aGlzLmxlbmd0aCAtPSBjb3VudCAtIGFyZ2xlbjtcbiAgICAgICAgd2hpbGUgKHRoaXNbaV0pIHtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzW2krK107XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBTZXQodG9kZWwpO1xuICAgIH07XG4gICAgXG4gICAgc2V0cHJvdG8uZXhjbHVkZSA9IGZ1bmN0aW9uIChlbCkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSB0aGlzLmxlbmd0aDsgaSA8IGlpOyBpKyspIGlmICh0aGlzW2ldID09IGVsKSB7XG4gICAgICAgICAgICB0aGlzLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBzZXRwcm90by5hbmltYXRlID0gZnVuY3Rpb24gKHBhcmFtcywgbXMsIGVhc2luZywgY2FsbGJhY2spIHtcbiAgICAgICAgKFIuaXMoZWFzaW5nLCBcImZ1bmN0aW9uXCIpIHx8ICFlYXNpbmcpICYmIChjYWxsYmFjayA9IGVhc2luZyB8fCBudWxsKTtcbiAgICAgICAgdmFyIGxlbiA9IHRoaXMuaXRlbXMubGVuZ3RoLFxuICAgICAgICAgICAgaSA9IGxlbixcbiAgICAgICAgICAgIGl0ZW0sXG4gICAgICAgICAgICBzZXQgPSB0aGlzLFxuICAgICAgICAgICAgY29sbGVjdG9yO1xuICAgICAgICBpZiAoIWxlbikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2sgJiYgKGNvbGxlY3RvciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICEtLWxlbiAmJiBjYWxsYmFjay5jYWxsKHNldCk7XG4gICAgICAgIH0pO1xuICAgICAgICBlYXNpbmcgPSBSLmlzKGVhc2luZywgc3RyaW5nKSA/IGVhc2luZyA6IGNvbGxlY3RvcjtcbiAgICAgICAgdmFyIGFuaW0gPSBSLmFuaW1hdGlvbihwYXJhbXMsIG1zLCBlYXNpbmcsIGNvbGxlY3Rvcik7XG4gICAgICAgIGl0ZW0gPSB0aGlzLml0ZW1zWy0taV0uYW5pbWF0ZShhbmltKTtcbiAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgdGhpcy5pdGVtc1tpXSAmJiAhdGhpcy5pdGVtc1tpXS5yZW1vdmVkICYmIHRoaXMuaXRlbXNbaV0uYW5pbWF0ZVdpdGgoaXRlbSwgYW5pbSwgYW5pbSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBzZXRwcm90by5pbnNlcnRBZnRlciA9IGZ1bmN0aW9uIChlbCkge1xuICAgICAgICB2YXIgaSA9IHRoaXMuaXRlbXMubGVuZ3RoO1xuICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICB0aGlzLml0ZW1zW2ldLmluc2VydEFmdGVyKGVsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIHNldHByb3RvLmdldEJCb3ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB4ID0gW10sXG4gICAgICAgICAgICB5ID0gW10sXG4gICAgICAgICAgICB4MiA9IFtdLFxuICAgICAgICAgICAgeTIgPSBbXTtcbiAgICAgICAgZm9yICh2YXIgaSA9IHRoaXMuaXRlbXMubGVuZ3RoOyBpLS07KSBpZiAoIXRoaXMuaXRlbXNbaV0ucmVtb3ZlZCkge1xuICAgICAgICAgICAgdmFyIGJveCA9IHRoaXMuaXRlbXNbaV0uZ2V0QkJveCgpO1xuICAgICAgICAgICAgeC5wdXNoKGJveC54KTtcbiAgICAgICAgICAgIHkucHVzaChib3gueSk7XG4gICAgICAgICAgICB4Mi5wdXNoKGJveC54ICsgYm94LndpZHRoKTtcbiAgICAgICAgICAgIHkyLnB1c2goYm94LnkgKyBib3guaGVpZ2h0KTtcbiAgICAgICAgfVxuICAgICAgICB4ID0gbW1pblthcHBseV0oMCwgeCk7XG4gICAgICAgIHkgPSBtbWluW2FwcGx5XSgwLCB5KTtcbiAgICAgICAgeDIgPSBtbWF4W2FwcGx5XSgwLCB4Mik7XG4gICAgICAgIHkyID0gbW1heFthcHBseV0oMCwgeTIpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogeCxcbiAgICAgICAgICAgIHk6IHksXG4gICAgICAgICAgICB4MjogeDIsXG4gICAgICAgICAgICB5MjogeTIsXG4gICAgICAgICAgICB3aWR0aDogeDIgLSB4LFxuICAgICAgICAgICAgaGVpZ2h0OiB5MiAtIHlcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIHNldHByb3RvLmNsb25lID0gZnVuY3Rpb24gKHMpIHtcbiAgICAgICAgcyA9IG5ldyBTZXQ7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IHRoaXMuaXRlbXMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgcy5wdXNoKHRoaXMuaXRlbXNbaV0uY2xvbmUoKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfTtcbiAgICBzZXRwcm90by50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFwiUmFwaGFcXHhlYmxcXHUyMDE4cyBzZXRcIjtcbiAgICB9O1xuXG4gICAgXG4gICAgUi5yZWdpc3RlckZvbnQgPSBmdW5jdGlvbiAoZm9udCkge1xuICAgICAgICBpZiAoIWZvbnQuZmFjZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZvbnQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5mb250cyA9IHRoaXMuZm9udHMgfHwge307XG4gICAgICAgIHZhciBmb250Y29weSA9IHtcbiAgICAgICAgICAgICAgICB3OiBmb250LncsXG4gICAgICAgICAgICAgICAgZmFjZToge30sXG4gICAgICAgICAgICAgICAgZ2x5cGhzOiB7fVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZhbWlseSA9IGZvbnQuZmFjZVtcImZvbnQtZmFtaWx5XCJdO1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIGZvbnQuZmFjZSkgaWYgKGZvbnQuZmFjZVtoYXNdKHByb3ApKSB7XG4gICAgICAgICAgICBmb250Y29weS5mYWNlW3Byb3BdID0gZm9udC5mYWNlW3Byb3BdO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLmZvbnRzW2ZhbWlseV0pIHtcbiAgICAgICAgICAgIHRoaXMuZm9udHNbZmFtaWx5XS5wdXNoKGZvbnRjb3B5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZm9udHNbZmFtaWx5XSA9IFtmb250Y29weV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFmb250LnN2Zykge1xuICAgICAgICAgICAgZm9udGNvcHkuZmFjZVtcInVuaXRzLXBlci1lbVwiXSA9IHRvSW50KGZvbnQuZmFjZVtcInVuaXRzLXBlci1lbVwiXSwgMTApO1xuICAgICAgICAgICAgZm9yICh2YXIgZ2x5cGggaW4gZm9udC5nbHlwaHMpIGlmIChmb250LmdseXBoc1toYXNdKGdseXBoKSkge1xuICAgICAgICAgICAgICAgIHZhciBwYXRoID0gZm9udC5nbHlwaHNbZ2x5cGhdO1xuICAgICAgICAgICAgICAgIGZvbnRjb3B5LmdseXBoc1tnbHlwaF0gPSB7XG4gICAgICAgICAgICAgICAgICAgIHc6IHBhdGgudyxcbiAgICAgICAgICAgICAgICAgICAgazoge30sXG4gICAgICAgICAgICAgICAgICAgIGQ6IHBhdGguZCAmJiBcIk1cIiArIHBhdGguZC5yZXBsYWNlKC9bbWxjeHRydl0vZywgZnVuY3Rpb24gKGNvbW1hbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4ge2w6IFwiTFwiLCBjOiBcIkNcIiwgeDogXCJ6XCIsIHQ6IFwibVwiLCByOiBcImxcIiwgdjogXCJjXCJ9W2NvbW1hbmRdIHx8IFwiTVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkgKyBcInpcIlxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgaWYgKHBhdGguaykge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrIGluIHBhdGguaykgaWYgKHBhdGhbaGFzXShrKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9udGNvcHkuZ2x5cGhzW2dseXBoXS5rW2tdID0gcGF0aC5rW2tdO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmb250O1xuICAgIH07XG4gICAgXG4gICAgcGFwZXJwcm90by5nZXRGb250ID0gZnVuY3Rpb24gKGZhbWlseSwgd2VpZ2h0LCBzdHlsZSwgc3RyZXRjaCkge1xuICAgICAgICBzdHJldGNoID0gc3RyZXRjaCB8fCBcIm5vcm1hbFwiO1xuICAgICAgICBzdHlsZSA9IHN0eWxlIHx8IFwibm9ybWFsXCI7XG4gICAgICAgIHdlaWdodCA9ICt3ZWlnaHQgfHwge25vcm1hbDogNDAwLCBib2xkOiA3MDAsIGxpZ2h0ZXI6IDMwMCwgYm9sZGVyOiA4MDB9W3dlaWdodF0gfHwgNDAwO1xuICAgICAgICBpZiAoIVIuZm9udHMpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZm9udCA9IFIuZm9udHNbZmFtaWx5XTtcbiAgICAgICAgaWYgKCFmb250KSB7XG4gICAgICAgICAgICB2YXIgbmFtZSA9IG5ldyBSZWdFeHAoXCIoXnxcXFxccylcIiArIGZhbWlseS5yZXBsYWNlKC9bXlxcd1xcZFxccyshfi46Xy1dL2csIEUpICsgXCIoXFxcXHN8JClcIiwgXCJpXCIpO1xuICAgICAgICAgICAgZm9yICh2YXIgZm9udE5hbWUgaW4gUi5mb250cykgaWYgKFIuZm9udHNbaGFzXShmb250TmFtZSkpIHtcbiAgICAgICAgICAgICAgICBpZiAobmFtZS50ZXN0KGZvbnROYW1lKSkge1xuICAgICAgICAgICAgICAgICAgICBmb250ID0gUi5mb250c1tmb250TmFtZV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgdGhlZm9udDtcbiAgICAgICAgaWYgKGZvbnQpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IGZvbnQubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIHRoZWZvbnQgPSBmb250W2ldO1xuICAgICAgICAgICAgICAgIGlmICh0aGVmb250LmZhY2VbXCJmb250LXdlaWdodFwiXSA9PSB3ZWlnaHQgJiYgKHRoZWZvbnQuZmFjZVtcImZvbnQtc3R5bGVcIl0gPT0gc3R5bGUgfHwgIXRoZWZvbnQuZmFjZVtcImZvbnQtc3R5bGVcIl0pICYmIHRoZWZvbnQuZmFjZVtcImZvbnQtc3RyZXRjaFwiXSA9PSBzdHJldGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhlZm9udDtcbiAgICB9O1xuICAgIFxuICAgIHBhcGVycHJvdG8ucHJpbnQgPSBmdW5jdGlvbiAoeCwgeSwgc3RyaW5nLCBmb250LCBzaXplLCBvcmlnaW4sIGxldHRlcl9zcGFjaW5nKSB7XG4gICAgICAgIG9yaWdpbiA9IG9yaWdpbiB8fCBcIm1pZGRsZVwiOyAvLyBiYXNlbGluZXxtaWRkbGVcbiAgICAgICAgbGV0dGVyX3NwYWNpbmcgPSBtbWF4KG1taW4obGV0dGVyX3NwYWNpbmcgfHwgMCwgMSksIC0xKTtcbiAgICAgICAgdmFyIGxldHRlcnMgPSBTdHIoc3RyaW5nKVtzcGxpdF0oRSksXG4gICAgICAgICAgICBzaGlmdCA9IDAsXG4gICAgICAgICAgICBub3RmaXJzdCA9IDAsXG4gICAgICAgICAgICBwYXRoID0gRSxcbiAgICAgICAgICAgIHNjYWxlO1xuICAgICAgICBSLmlzKGZvbnQsIHN0cmluZykgJiYgKGZvbnQgPSB0aGlzLmdldEZvbnQoZm9udCkpO1xuICAgICAgICBpZiAoZm9udCkge1xuICAgICAgICAgICAgc2NhbGUgPSAoc2l6ZSB8fCAxNikgLyBmb250LmZhY2VbXCJ1bml0cy1wZXItZW1cIl07XG4gICAgICAgICAgICB2YXIgYmIgPSBmb250LmZhY2UuYmJveFtzcGxpdF0oc2VwYXJhdG9yKSxcbiAgICAgICAgICAgICAgICB0b3AgPSArYmJbMF0sXG4gICAgICAgICAgICAgICAgbGluZUhlaWdodCA9IGJiWzNdIC0gYmJbMV0sXG4gICAgICAgICAgICAgICAgc2hpZnR5ID0gMCxcbiAgICAgICAgICAgICAgICBoZWlnaHQgPSArYmJbMV0gKyAob3JpZ2luID09IFwiYmFzZWxpbmVcIiA/IGxpbmVIZWlnaHQgKyAoK2ZvbnQuZmFjZS5kZXNjZW50KSA6IGxpbmVIZWlnaHQgLyAyKTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IGxldHRlcnMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChsZXR0ZXJzW2ldID09IFwiXFxuXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2hpZnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICBjdXJyID0gMDtcbiAgICAgICAgICAgICAgICAgICAgbm90Zmlyc3QgPSAwO1xuICAgICAgICAgICAgICAgICAgICBzaGlmdHkgKz0gbGluZUhlaWdodDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgcHJldiA9IG5vdGZpcnN0ICYmIGZvbnQuZ2x5cGhzW2xldHRlcnNbaSAtIDFdXSB8fCB7fSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnIgPSBmb250LmdseXBoc1tsZXR0ZXJzW2ldXTtcbiAgICAgICAgICAgICAgICAgICAgc2hpZnQgKz0gbm90Zmlyc3QgPyAocHJldi53IHx8IGZvbnQudykgKyAocHJldi5rICYmIHByZXYua1tsZXR0ZXJzW2ldXSB8fCAwKSArIChmb250LncgKiBsZXR0ZXJfc3BhY2luZykgOiAwO1xuICAgICAgICAgICAgICAgICAgICBub3RmaXJzdCA9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChjdXJyICYmIGN1cnIuZCkge1xuICAgICAgICAgICAgICAgICAgICBwYXRoICs9IFIudHJhbnNmb3JtUGF0aChjdXJyLmQsIFtcInRcIiwgc2hpZnQgKiBzY2FsZSwgc2hpZnR5ICogc2NhbGUsIFwic1wiLCBzY2FsZSwgc2NhbGUsIHRvcCwgaGVpZ2h0LCBcInRcIiwgKHggLSB0b3ApIC8gc2NhbGUsICh5IC0gaGVpZ2h0KSAvIHNjYWxlXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnBhdGgocGF0aCkuYXR0cih7XG4gICAgICAgICAgICBmaWxsOiBcIiMwMDBcIixcbiAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCJcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIFxuICAgIHBhcGVycHJvdG8uYWRkID0gZnVuY3Rpb24gKGpzb24pIHtcbiAgICAgICAgaWYgKFIuaXMoanNvbiwgXCJhcnJheVwiKSkge1xuICAgICAgICAgICAgdmFyIHJlcyA9IHRoaXMuc2V0KCksXG4gICAgICAgICAgICAgICAgaSA9IDAsXG4gICAgICAgICAgICAgICAgaWkgPSBqc29uLmxlbmd0aCxcbiAgICAgICAgICAgICAgICBqO1xuICAgICAgICAgICAgZm9yICg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaiA9IGpzb25baV0gfHwge307XG4gICAgICAgICAgICAgICAgZWxlbWVudHNbaGFzXShqLnR5cGUpICYmIHJlcy5wdXNoKHRoaXNbai50eXBlXSgpLmF0dHIoaikpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcblxuICAgIFxuICAgIFIuZm9ybWF0ID0gZnVuY3Rpb24gKHRva2VuLCBwYXJhbXMpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBSLmlzKHBhcmFtcywgYXJyYXkpID8gWzBdW2NvbmNhdF0ocGFyYW1zKSA6IGFyZ3VtZW50cztcbiAgICAgICAgdG9rZW4gJiYgUi5pcyh0b2tlbiwgc3RyaW5nKSAmJiBhcmdzLmxlbmd0aCAtIDEgJiYgKHRva2VuID0gdG9rZW4ucmVwbGFjZShmb3JtYXRyZywgZnVuY3Rpb24gKHN0ciwgaSkge1xuICAgICAgICAgICAgcmV0dXJuIGFyZ3NbKytpXSA9PSBudWxsID8gRSA6IGFyZ3NbaV07XG4gICAgICAgIH0pKTtcbiAgICAgICAgcmV0dXJuIHRva2VuIHx8IEU7XG4gICAgfTtcbiAgICBcbiAgICBSLmZ1bGxmaWxsID0gKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHRva2VuUmVnZXggPSAvXFx7KFteXFx9XSspXFx9L2csXG4gICAgICAgICAgICBvYmpOb3RhdGlvblJlZ2V4ID0gLyg/Oig/Ol58XFwuKSguKz8pKD89XFxbfFxcLnwkfFxcKCl8XFxbKCd8XCIpKC4rPylcXDJcXF0pKFxcKFxcKSk/L2csIC8vIG1hdGNoZXMgLnh4eHh4IG9yIFtcInh4eHh4XCJdIHRvIHJ1biBvdmVyIG9iamVjdCBwcm9wZXJ0aWVzXG4gICAgICAgICAgICByZXBsYWNlciA9IGZ1bmN0aW9uIChhbGwsIGtleSwgb2JqKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlcyA9IG9iajtcbiAgICAgICAgICAgICAgICBrZXkucmVwbGFjZShvYmpOb3RhdGlvblJlZ2V4LCBmdW5jdGlvbiAoYWxsLCBuYW1lLCBxdW90ZSwgcXVvdGVkTmFtZSwgaXNGdW5jKSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWUgPSBuYW1lIHx8IHF1b3RlZE5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuYW1lIGluIHJlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcyA9IHJlc1tuYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGVvZiByZXMgPT0gXCJmdW5jdGlvblwiICYmIGlzRnVuYyAmJiAocmVzID0gcmVzKCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmVzID0gKHJlcyA9PSBudWxsIHx8IHJlcyA9PSBvYmogPyBhbGwgOiByZXMpICsgXCJcIjtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChzdHIsIG9iaikge1xuICAgICAgICAgICAgcmV0dXJuIFN0cmluZyhzdHIpLnJlcGxhY2UodG9rZW5SZWdleCwgZnVuY3Rpb24gKGFsbCwga2V5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2VyKGFsbCwga2V5LCBvYmopO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgfSkoKTtcbiAgICBcbiAgICBSLm5pbmphID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBvbGRSYXBoYWVsLndhcyA/IChnLndpbi5SYXBoYWVsID0gb2xkUmFwaGFlbC5pcykgOiBkZWxldGUgUmFwaGFlbDtcbiAgICAgICAgcmV0dXJuIFI7XG4gICAgfTtcbiAgICBcbiAgICBSLnN0ID0gc2V0cHJvdG87XG4gICAgLy8gQlJPV1NFUklGWSBNT0Q6IHVzZSBSLl9nLmRvYyBpbnN0ZWFkIG9mIGRvY3VtZW50XG4gICAgLy8gRmlyZWZveCA8My42IGZpeDogaHR0cDovL3dlYnJlZmxlY3Rpb24uYmxvZ3Nwb3QuY29tLzIwMDkvMTEvMTk1LWNoYXJzLXRvLWhlbHAtbGF6eS1sb2FkaW5nLmh0bWxcbiAgICAoZnVuY3Rpb24gKGRvYywgbG9hZGVkLCBmKSB7XG4gICAgICAgIGlmIChkb2MucmVhZHlTdGF0ZSA9PSBudWxsICYmIGRvYy5hZGRFdmVudExpc3RlbmVyKXtcbiAgICAgICAgICAgIGRvYy5hZGRFdmVudExpc3RlbmVyKGxvYWRlZCwgZiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBkb2MucmVtb3ZlRXZlbnRMaXN0ZW5lcihsb2FkZWQsIGYsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBkb2MucmVhZHlTdGF0ZSA9IFwiY29tcGxldGVcIjtcbiAgICAgICAgICAgIH0sIGZhbHNlKTtcbiAgICAgICAgICAgIGRvYy5yZWFkeVN0YXRlID0gXCJsb2FkaW5nXCI7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gaXNMb2FkZWQoKSB7XG4gICAgICAgICAgICAoL2luLykudGVzdChkb2MucmVhZHlTdGF0ZSkgPyBzZXRUaW1lb3V0KGlzTG9hZGVkLCA5KSA6IFIuZXZlKFwicmFwaGFlbC5ET01sb2FkXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlzTG9hZGVkKCk7XG4gICAgfSkoUi5fZy5kb2MsIFwiRE9NQ29udGVudExvYWRlZFwiKTtcblxuICAgIC8vIEJST1dTRVJJRlkgTU9EOiBhbHdheXMgc2V0IGZpbGUtc2NvcGUgUmFwaGFlbCA9IFJcbiAgICAvLyBvbGRSYXBoYWVsLndhcyA/IChnLndpbi5SYXBoYWVsID0gUikgOiAoUmFwaGFlbCA9IFIpO1xuICAgIC8vIGlmIChvbGRSYXBoYWVsLndhcykgZy53aW4uUmFwaGFlbCA9IFI7XG4gICAgUmFwaGFlbCA9IFI7XG4gICAgXG4gICAgZXZlLm9uKFwicmFwaGFlbC5ET01sb2FkXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbG9hZGVkID0gdHJ1ZTtcbiAgICB9KTtcbn0pKCk7XG5cbi8vIGNvbnNvbGUubG9nKFJhcGhhZWwpO1xuXG4vLyDilIzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilJAgXFxcXFxuLy8g4pSCIFJhcGhhw6tsIC0gSmF2YVNjcmlwdCBWZWN0b3IgTGlicmFyeSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOKUgiBcXFxcXG4vLyDilJzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilKQgXFxcXFxuLy8g4pSCIFNWRyBNb2R1bGUgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4pSCIFxcXFxcbi8vIOKUnOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUpCBcXFxcXG4vLyDilIIgQ29weXJpZ2h0IChjKSAyMDA4LTIwMTEgRG1pdHJ5IEJhcmFub3Zza2l5IChodHRwOi8vcmFwaGFlbGpzLmNvbSkgICDilIIgXFxcXFxuLy8g4pSCIENvcHlyaWdodCAoYykgMjAwOC0yMDExIFNlbmNoYSBMYWJzIChodHRwOi8vc2VuY2hhLmNvbSkgICAgICAgICAgICAg4pSCIFxcXFxcbi8vIOKUgiBMaWNlbnNlZCB1bmRlciB0aGUgTUlUIChodHRwOi8vcmFwaGFlbGpzLmNvbS9saWNlbnNlLmh0bWwpIGxpY2Vuc2UuIOKUgiBcXFxcXG4vLyDilJTilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilJggXFxcXFxuLy8gQlJPV1NFUklGWSBNT0Q6IHVzZSBSYXBoYWVsIGluc3RlYWQgb2Ygd2luZG93LnJhcGhhZWxcblJhcGhhZWwuc3ZnICYmIGZ1bmN0aW9uIChSKSB7XG4gICAgdmFyIGhhcyA9IFwiaGFzT3duUHJvcGVydHlcIixcbiAgICAgICAgU3RyID0gU3RyaW5nLFxuICAgICAgICB0b0Zsb2F0ID0gcGFyc2VGbG9hdCxcbiAgICAgICAgdG9JbnQgPSBwYXJzZUludCxcbiAgICAgICAgbWF0aCA9IE1hdGgsXG4gICAgICAgIG1tYXggPSBtYXRoLm1heCxcbiAgICAgICAgYWJzID0gbWF0aC5hYnMsXG4gICAgICAgIHBvdyA9IG1hdGgucG93LFxuICAgICAgICBzZXBhcmF0b3IgPSAvWywgXSsvLFxuICAgICAgICBldmUgPSBSLmV2ZSxcbiAgICAgICAgRSA9IFwiXCIsXG4gICAgICAgIFMgPSBcIiBcIjtcbiAgICB2YXIgeGxpbmsgPSBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIixcbiAgICAgICAgbWFya2VycyA9IHtcbiAgICAgICAgICAgIGJsb2NrOiBcIk01LDAgMCwyLjUgNSw1elwiLFxuICAgICAgICAgICAgY2xhc3NpYzogXCJNNSwwIDAsMi41IDUsNSAzLjUsMyAzLjUsMnpcIixcbiAgICAgICAgICAgIGRpYW1vbmQ6IFwiTTIuNSwwIDUsMi41IDIuNSw1IDAsMi41elwiLFxuICAgICAgICAgICAgb3BlbjogXCJNNiwxIDEsMy41IDYsNlwiLFxuICAgICAgICAgICAgb3ZhbDogXCJNMi41LDBBMi41LDIuNSwwLDAsMSwyLjUsNSAyLjUsMi41LDAsMCwxLDIuNSwwelwiXG4gICAgICAgIH0sXG4gICAgICAgIG1hcmtlckNvdW50ZXIgPSB7fTtcbiAgICBSLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gIFwiWW91ciBicm93c2VyIHN1cHBvcnRzIFNWRy5cXG5Zb3UgYXJlIHJ1bm5pbmcgUmFwaGFcXHhlYmwgXCIgKyB0aGlzLnZlcnNpb247XG4gICAgfTtcbiAgICB2YXIgJCA9IGZ1bmN0aW9uIChlbCwgYXR0cikge1xuICAgICAgICBpZiAoYXR0cikge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBlbCA9PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgZWwgPSAkKGVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAodmFyIGtleSBpbiBhdHRyKSBpZiAoYXR0cltoYXNdKGtleSkpIHtcbiAgICAgICAgICAgICAgICBpZiAoa2V5LnN1YnN0cmluZygwLCA2KSA9PSBcInhsaW5rOlwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZU5TKHhsaW5rLCBrZXkuc3Vic3RyaW5nKDYpLCBTdHIoYXR0cltrZXldKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlKGtleSwgU3RyKGF0dHJba2V5XSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsID0gUi5fZy5kb2MuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiwgZWwpO1xuICAgICAgICAgICAgZWwuc3R5bGUgJiYgKGVsLnN0eWxlLndlYmtpdFRhcEhpZ2hsaWdodENvbG9yID0gXCJyZ2JhKDAsMCwwLDApXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbDtcbiAgICB9LFxuICAgIGFkZEdyYWRpZW50RmlsbCA9IGZ1bmN0aW9uIChlbGVtZW50LCBncmFkaWVudCkge1xuICAgICAgICB2YXIgdHlwZSA9IFwibGluZWFyXCIsXG4gICAgICAgICAgICBpZCA9IGVsZW1lbnQuaWQgKyBncmFkaWVudCxcbiAgICAgICAgICAgIGZ4ID0gLjUsIGZ5ID0gLjUsXG4gICAgICAgICAgICBvID0gZWxlbWVudC5ub2RlLFxuICAgICAgICAgICAgU1ZHID0gZWxlbWVudC5wYXBlcixcbiAgICAgICAgICAgIHMgPSBvLnN0eWxlLFxuICAgICAgICAgICAgZWwgPSBSLl9nLmRvYy5nZXRFbGVtZW50QnlJZChpZCk7XG4gICAgICAgIGlmICghZWwpIHtcbiAgICAgICAgICAgIGdyYWRpZW50ID0gU3RyKGdyYWRpZW50KS5yZXBsYWNlKFIuX3JhZGlhbF9ncmFkaWVudCwgZnVuY3Rpb24gKGFsbCwgX2Z4LCBfZnkpIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gXCJyYWRpYWxcIjtcbiAgICAgICAgICAgICAgICBpZiAoX2Z4ICYmIF9meSkge1xuICAgICAgICAgICAgICAgICAgICBmeCA9IHRvRmxvYXQoX2Z4KTtcbiAgICAgICAgICAgICAgICAgICAgZnkgPSB0b0Zsb2F0KF9meSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkaXIgPSAoKGZ5ID4gLjUpICogMiAtIDEpO1xuICAgICAgICAgICAgICAgICAgICBwb3coZnggLSAuNSwgMikgKyBwb3coZnkgLSAuNSwgMikgPiAuMjUgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIChmeSA9IG1hdGguc3FydCguMjUgLSBwb3coZnggLSAuNSwgMikpICogZGlyICsgLjUpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBmeSAhPSAuNSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgKGZ5ID0gZnkudG9GaXhlZCg1KSAtIDFlLTUgKiBkaXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gRTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZ3JhZGllbnQgPSBncmFkaWVudC5zcGxpdCgvXFxzKlxcLVxccyovKTtcbiAgICAgICAgICAgIGlmICh0eXBlID09IFwibGluZWFyXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgYW5nbGUgPSBncmFkaWVudC5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIGFuZ2xlID0gLXRvRmxvYXQoYW5nbGUpO1xuICAgICAgICAgICAgICAgIGlmIChpc05hTihhbmdsZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciB2ZWN0b3IgPSBbMCwgMCwgbWF0aC5jb3MoUi5yYWQoYW5nbGUpKSwgbWF0aC5zaW4oUi5yYWQoYW5nbGUpKV0sXG4gICAgICAgICAgICAgICAgICAgIG1heCA9IDEgLyAobW1heChhYnModmVjdG9yWzJdKSwgYWJzKHZlY3RvclszXSkpIHx8IDEpO1xuICAgICAgICAgICAgICAgIHZlY3RvclsyXSAqPSBtYXg7XG4gICAgICAgICAgICAgICAgdmVjdG9yWzNdICo9IG1heDtcbiAgICAgICAgICAgICAgICBpZiAodmVjdG9yWzJdIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICB2ZWN0b3JbMF0gPSAtdmVjdG9yWzJdO1xuICAgICAgICAgICAgICAgICAgICB2ZWN0b3JbMl0gPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodmVjdG9yWzNdIDwgMCkge1xuICAgICAgICAgICAgICAgICAgICB2ZWN0b3JbMV0gPSAtdmVjdG9yWzNdO1xuICAgICAgICAgICAgICAgICAgICB2ZWN0b3JbM10gPSAwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBkb3RzID0gUi5fcGFyc2VEb3RzKGdyYWRpZW50KTtcbiAgICAgICAgICAgIGlmICghZG90cykge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWQgPSBpZC5yZXBsYWNlKC9bXFwoXFwpXFxzLFxceGIwI10vZywgXCJfXCIpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoZWxlbWVudC5ncmFkaWVudCAmJiBpZCAhPSBlbGVtZW50LmdyYWRpZW50LmlkKSB7XG4gICAgICAgICAgICAgICAgU1ZHLmRlZnMucmVtb3ZlQ2hpbGQoZWxlbWVudC5ncmFkaWVudCk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGVsZW1lbnQuZ3JhZGllbnQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZWxlbWVudC5ncmFkaWVudCkge1xuICAgICAgICAgICAgICAgIGVsID0gJCh0eXBlICsgXCJHcmFkaWVudFwiLCB7aWQ6IGlkfSk7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5ncmFkaWVudCA9IGVsO1xuICAgICAgICAgICAgICAgICQoZWwsIHR5cGUgPT0gXCJyYWRpYWxcIiA/IHtcbiAgICAgICAgICAgICAgICAgICAgZng6IGZ4LFxuICAgICAgICAgICAgICAgICAgICBmeTogZnlcbiAgICAgICAgICAgICAgICB9IDoge1xuICAgICAgICAgICAgICAgICAgICB4MTogdmVjdG9yWzBdLFxuICAgICAgICAgICAgICAgICAgICB5MTogdmVjdG9yWzFdLFxuICAgICAgICAgICAgICAgICAgICB4MjogdmVjdG9yWzJdLFxuICAgICAgICAgICAgICAgICAgICB5MjogdmVjdG9yWzNdLFxuICAgICAgICAgICAgICAgICAgICBncmFkaWVudFRyYW5zZm9ybTogZWxlbWVudC5tYXRyaXguaW52ZXJ0KClcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBTVkcuZGVmcy5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gZG90cy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsLmFwcGVuZENoaWxkKCQoXCJzdG9wXCIsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9mZnNldDogZG90c1tpXS5vZmZzZXQgPyBkb3RzW2ldLm9mZnNldCA6IGkgPyBcIjEwMCVcIiA6IFwiMCVcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwic3RvcC1jb2xvclwiOiBkb3RzW2ldLmNvbG9yIHx8IFwiI2ZmZlwiXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJChvLCB7XG4gICAgICAgICAgICBmaWxsOiBcInVybCgjXCIgKyBpZCArIFwiKVwiLFxuICAgICAgICAgICAgb3BhY2l0eTogMSxcbiAgICAgICAgICAgIFwiZmlsbC1vcGFjaXR5XCI6IDFcbiAgICAgICAgfSk7XG4gICAgICAgIHMuZmlsbCA9IEU7XG4gICAgICAgIHMub3BhY2l0eSA9IDE7XG4gICAgICAgIHMuZmlsbE9wYWNpdHkgPSAxO1xuICAgICAgICByZXR1cm4gMTtcbiAgICB9LFxuICAgIHVwZGF0ZVBvc2l0aW9uID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgdmFyIGJib3ggPSBvLmdldEJCb3goMSk7XG4gICAgICAgICQoby5wYXR0ZXJuLCB7cGF0dGVyblRyYW5zZm9ybTogby5tYXRyaXguaW52ZXJ0KCkgKyBcIiB0cmFuc2xhdGUoXCIgKyBiYm94LnggKyBcIixcIiArIGJib3gueSArIFwiKVwifSk7XG4gICAgfSxcbiAgICBhZGRBcnJvdyA9IGZ1bmN0aW9uIChvLCB2YWx1ZSwgaXNFbmQpIHtcbiAgICAgICAgaWYgKG8udHlwZSA9PSBcInBhdGhcIikge1xuICAgICAgICAgICAgdmFyIHZhbHVlcyA9IFN0cih2YWx1ZSkudG9Mb3dlckNhc2UoKS5zcGxpdChcIi1cIiksXG4gICAgICAgICAgICAgICAgcCA9IG8ucGFwZXIsXG4gICAgICAgICAgICAgICAgc2UgPSBpc0VuZCA/IFwiZW5kXCIgOiBcInN0YXJ0XCIsXG4gICAgICAgICAgICAgICAgbm9kZSA9IG8ubm9kZSxcbiAgICAgICAgICAgICAgICBhdHRycyA9IG8uYXR0cnMsXG4gICAgICAgICAgICAgICAgc3Ryb2tlID0gYXR0cnNbXCJzdHJva2Utd2lkdGhcIl0sXG4gICAgICAgICAgICAgICAgaSA9IHZhbHVlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgdHlwZSA9IFwiY2xhc3NpY1wiLFxuICAgICAgICAgICAgICAgIGZyb20sXG4gICAgICAgICAgICAgICAgdG8sXG4gICAgICAgICAgICAgICAgZHgsXG4gICAgICAgICAgICAgICAgcmVmWCxcbiAgICAgICAgICAgICAgICBhdHRyLFxuICAgICAgICAgICAgICAgIHcgPSAzLFxuICAgICAgICAgICAgICAgIGggPSAzLFxuICAgICAgICAgICAgICAgIHQgPSA1O1xuICAgICAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodmFsdWVzW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJibG9ja1wiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY2xhc3NpY1wiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwib3ZhbFwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZGlhbW9uZFwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwib3BlblwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwibm9uZVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZSA9IHZhbHVlc1tpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwid2lkZVwiOiBoID0gNTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJuYXJyb3dcIjogaCA9IDI7IGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwibG9uZ1wiOiB3ID0gNTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJzaG9ydFwiOiB3ID0gMjsgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGUgPT0gXCJvcGVuXCIpIHtcbiAgICAgICAgICAgICAgICB3ICs9IDI7XG4gICAgICAgICAgICAgICAgaCArPSAyO1xuICAgICAgICAgICAgICAgIHQgKz0gMjtcbiAgICAgICAgICAgICAgICBkeCA9IDE7XG4gICAgICAgICAgICAgICAgcmVmWCA9IGlzRW5kID8gNCA6IDE7XG4gICAgICAgICAgICAgICAgYXR0ciA9IHtcbiAgICAgICAgICAgICAgICAgICAgZmlsbDogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgICAgIHN0cm9rZTogYXR0cnMuc3Ryb2tlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVmWCA9IGR4ID0gdyAvIDI7XG4gICAgICAgICAgICAgICAgYXR0ciA9IHtcbiAgICAgICAgICAgICAgICAgICAgZmlsbDogYXR0cnMuc3Ryb2tlLFxuICAgICAgICAgICAgICAgICAgICBzdHJva2U6IFwibm9uZVwiXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvLl8uYXJyb3dzKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzRW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIG8uXy5hcnJvd3MuZW5kUGF0aCAmJiBtYXJrZXJDb3VudGVyW28uXy5hcnJvd3MuZW5kUGF0aF0tLTtcbiAgICAgICAgICAgICAgICAgICAgby5fLmFycm93cy5lbmRNYXJrZXIgJiYgbWFya2VyQ291bnRlcltvLl8uYXJyb3dzLmVuZE1hcmtlcl0tLTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvLl8uYXJyb3dzLnN0YXJ0UGF0aCAmJiBtYXJrZXJDb3VudGVyW28uXy5hcnJvd3Muc3RhcnRQYXRoXS0tO1xuICAgICAgICAgICAgICAgICAgICBvLl8uYXJyb3dzLnN0YXJ0TWFya2VyICYmIG1hcmtlckNvdW50ZXJbby5fLmFycm93cy5zdGFydE1hcmtlcl0tLTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG8uXy5hcnJvd3MgPSB7fTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0eXBlICE9IFwibm9uZVwiKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhdGhJZCA9IFwicmFwaGFlbC1tYXJrZXItXCIgKyB0eXBlLFxuICAgICAgICAgICAgICAgICAgICBtYXJrZXJJZCA9IFwicmFwaGFlbC1tYXJrZXItXCIgKyBzZSArIHR5cGUgKyB3ICsgaDtcbiAgICAgICAgICAgICAgICBpZiAoIVIuX2cuZG9jLmdldEVsZW1lbnRCeUlkKHBhdGhJZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcC5kZWZzLmFwcGVuZENoaWxkKCQoJChcInBhdGhcIiksIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIFwic3Ryb2tlLWxpbmVjYXBcIjogXCJyb3VuZFwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgZDogbWFya2Vyc1t0eXBlXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBwYXRoSWRcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgICAgICBtYXJrZXJDb3VudGVyW3BhdGhJZF0gPSAxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcmtlckNvdW50ZXJbcGF0aElkXSsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgbWFya2VyID0gUi5fZy5kb2MuZ2V0RWxlbWVudEJ5SWQobWFya2VySWQpLFxuICAgICAgICAgICAgICAgICAgICB1c2U7XG4gICAgICAgICAgICAgICAgaWYgKCFtYXJrZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgbWFya2VyID0gJCgkKFwibWFya2VyXCIpLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZDogbWFya2VySWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJrZXJIZWlnaHQ6IGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXJrZXJXaWR0aDogdyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9yaWVudDogXCJhdXRvXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICByZWZYOiByZWZYLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVmWTogaCAvIDJcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHVzZSA9ICQoJChcInVzZVwiKSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJ4bGluazpocmVmXCI6IFwiI1wiICsgcGF0aElkLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHJhbnNmb3JtOiAoaXNFbmQgPyBcInJvdGF0ZSgxODAgXCIgKyB3IC8gMiArIFwiIFwiICsgaCAvIDIgKyBcIikgXCIgOiBFKSArIFwic2NhbGUoXCIgKyB3IC8gdCArIFwiLFwiICsgaCAvIHQgKyBcIilcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwic3Ryb2tlLXdpZHRoXCI6ICgxIC8gKCh3IC8gdCArIGggLyB0KSAvIDIpKS50b0ZpeGVkKDQpXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBtYXJrZXIuYXBwZW5kQ2hpbGQodXNlKTtcbiAgICAgICAgICAgICAgICAgICAgcC5kZWZzLmFwcGVuZENoaWxkKG1hcmtlcik7XG4gICAgICAgICAgICAgICAgICAgIG1hcmtlckNvdW50ZXJbbWFya2VySWRdID0gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBtYXJrZXJDb3VudGVyW21hcmtlcklkXSsrO1xuICAgICAgICAgICAgICAgICAgICB1c2UgPSBtYXJrZXIuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJ1c2VcIilbMF07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQodXNlLCBhdHRyKTtcbiAgICAgICAgICAgICAgICB2YXIgZGVsdGEgPSBkeCAqICh0eXBlICE9IFwiZGlhbW9uZFwiICYmIHR5cGUgIT0gXCJvdmFsXCIpO1xuICAgICAgICAgICAgICAgIGlmIChpc0VuZCkge1xuICAgICAgICAgICAgICAgICAgICBmcm9tID0gby5fLmFycm93cy5zdGFydGR4ICogc3Ryb2tlIHx8IDA7XG4gICAgICAgICAgICAgICAgICAgIHRvID0gUi5nZXRUb3RhbExlbmd0aChhdHRycy5wYXRoKSAtIGRlbHRhICogc3Ryb2tlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZyb20gPSBkZWx0YSAqIHN0cm9rZTtcbiAgICAgICAgICAgICAgICAgICAgdG8gPSBSLmdldFRvdGFsTGVuZ3RoKGF0dHJzLnBhdGgpIC0gKG8uXy5hcnJvd3MuZW5kZHggKiBzdHJva2UgfHwgMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGF0dHIgPSB7fTtcbiAgICAgICAgICAgICAgICBhdHRyW1wibWFya2VyLVwiICsgc2VdID0gXCJ1cmwoI1wiICsgbWFya2VySWQgKyBcIilcIjtcbiAgICAgICAgICAgICAgICBpZiAodG8gfHwgZnJvbSkge1xuICAgICAgICAgICAgICAgICAgICBhdHRyLmQgPSBSYXBoYWVsLmdldFN1YnBhdGgoYXR0cnMucGF0aCwgZnJvbSwgdG8pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKG5vZGUsIGF0dHIpO1xuICAgICAgICAgICAgICAgIG8uXy5hcnJvd3Nbc2UgKyBcIlBhdGhcIl0gPSBwYXRoSWQ7XG4gICAgICAgICAgICAgICAgby5fLmFycm93c1tzZSArIFwiTWFya2VyXCJdID0gbWFya2VySWQ7XG4gICAgICAgICAgICAgICAgby5fLmFycm93c1tzZSArIFwiZHhcIl0gPSBkZWx0YTtcbiAgICAgICAgICAgICAgICBvLl8uYXJyb3dzW3NlICsgXCJUeXBlXCJdID0gdHlwZTtcbiAgICAgICAgICAgICAgICBvLl8uYXJyb3dzW3NlICsgXCJTdHJpbmdcIl0gPSB2YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzRW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIGZyb20gPSBvLl8uYXJyb3dzLnN0YXJ0ZHggKiBzdHJva2UgfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgdG8gPSBSLmdldFRvdGFsTGVuZ3RoKGF0dHJzLnBhdGgpIC0gZnJvbTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmcm9tID0gMDtcbiAgICAgICAgICAgICAgICAgICAgdG8gPSBSLmdldFRvdGFsTGVuZ3RoKGF0dHJzLnBhdGgpIC0gKG8uXy5hcnJvd3MuZW5kZHggKiBzdHJva2UgfHwgMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG8uXy5hcnJvd3Nbc2UgKyBcIlBhdGhcIl0gJiYgJChub2RlLCB7ZDogUmFwaGFlbC5nZXRTdWJwYXRoKGF0dHJzLnBhdGgsIGZyb20sIHRvKX0pO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBvLl8uYXJyb3dzW3NlICsgXCJQYXRoXCJdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBvLl8uYXJyb3dzW3NlICsgXCJNYXJrZXJcIl07XG4gICAgICAgICAgICAgICAgZGVsZXRlIG8uXy5hcnJvd3Nbc2UgKyBcImR4XCJdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBvLl8uYXJyb3dzW3NlICsgXCJUeXBlXCJdO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBvLl8uYXJyb3dzW3NlICsgXCJTdHJpbmdcIl07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKGF0dHIgaW4gbWFya2VyQ291bnRlcikgaWYgKG1hcmtlckNvdW50ZXJbaGFzXShhdHRyKSAmJiAhbWFya2VyQ291bnRlclthdHRyXSkge1xuICAgICAgICAgICAgICAgIHZhciBpdGVtID0gUi5fZy5kb2MuZ2V0RWxlbWVudEJ5SWQoYXR0cik7XG4gICAgICAgICAgICAgICAgaXRlbSAmJiBpdGVtLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoaXRlbSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGRhc2hhcnJheSA9IHtcbiAgICAgICAgXCJcIjogWzBdLFxuICAgICAgICBcIm5vbmVcIjogWzBdLFxuICAgICAgICBcIi1cIjogWzMsIDFdLFxuICAgICAgICBcIi5cIjogWzEsIDFdLFxuICAgICAgICBcIi0uXCI6IFszLCAxLCAxLCAxXSxcbiAgICAgICAgXCItLi5cIjogWzMsIDEsIDEsIDEsIDEsIDFdLFxuICAgICAgICBcIi4gXCI6IFsxLCAzXSxcbiAgICAgICAgXCItIFwiOiBbNCwgM10sXG4gICAgICAgIFwiLS1cIjogWzgsIDNdLFxuICAgICAgICBcIi0gLlwiOiBbNCwgMywgMSwgM10sXG4gICAgICAgIFwiLS0uXCI6IFs4LCAzLCAxLCAzXSxcbiAgICAgICAgXCItLS4uXCI6IFs4LCAzLCAxLCAzLCAxLCAzXVxuICAgIH0sXG4gICAgYWRkRGFzaGVzID0gZnVuY3Rpb24gKG8sIHZhbHVlLCBwYXJhbXMpIHtcbiAgICAgICAgdmFsdWUgPSBkYXNoYXJyYXlbU3RyKHZhbHVlKS50b0xvd2VyQ2FzZSgpXTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgICB2YXIgd2lkdGggPSBvLmF0dHJzW1wic3Ryb2tlLXdpZHRoXCJdIHx8IFwiMVwiLFxuICAgICAgICAgICAgICAgIGJ1dHQgPSB7cm91bmQ6IHdpZHRoLCBzcXVhcmU6IHdpZHRoLCBidXR0OiAwfVtvLmF0dHJzW1wic3Ryb2tlLWxpbmVjYXBcIl0gfHwgcGFyYW1zW1wic3Ryb2tlLWxpbmVjYXBcIl1dIHx8IDAsXG4gICAgICAgICAgICAgICAgZGFzaGVzID0gW10sXG4gICAgICAgICAgICAgICAgaSA9IHZhbHVlLmxlbmd0aDtcbiAgICAgICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgICAgICBkYXNoZXNbaV0gPSB2YWx1ZVtpXSAqIHdpZHRoICsgKChpICUgMikgPyAxIDogLTEpICogYnV0dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoby5ub2RlLCB7XCJzdHJva2UtZGFzaGFycmF5XCI6IGRhc2hlcy5qb2luKFwiLFwiKX0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBzZXRGaWxsQW5kU3Ryb2tlID0gZnVuY3Rpb24gKG8sIHBhcmFtcykge1xuICAgICAgICB2YXIgbm9kZSA9IG8ubm9kZSxcbiAgICAgICAgICAgIGF0dHJzID0gby5hdHRycyxcbiAgICAgICAgICAgIHZpcyA9IG5vZGUuc3R5bGUudmlzaWJpbGl0eTtcbiAgICAgICAgbm9kZS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcbiAgICAgICAgZm9yICh2YXIgYXR0IGluIHBhcmFtcykge1xuICAgICAgICAgICAgaWYgKHBhcmFtc1toYXNdKGF0dCkpIHtcbiAgICAgICAgICAgICAgICBpZiAoIVIuX2F2YWlsYWJsZUF0dHJzW2hhc10oYXR0KSkge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHZhbHVlID0gcGFyYW1zW2F0dF07XG4gICAgICAgICAgICAgICAgYXR0cnNbYXR0XSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoYXR0KSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJibHVyXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBvLmJsdXIodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJocmVmXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ0aXRsZVwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwidGFyZ2V0XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgcG4gPSBub2RlLnBhcmVudE5vZGU7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocG4udGFnTmFtZS50b0xvd2VyQ2FzZSgpICE9IFwiYVwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGhsID0gJChcImFcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG4uaW5zZXJ0QmVmb3JlKGhsLCBub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBobC5hcHBlbmRDaGlsZChub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbiA9IGhsO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dCA9PSBcInRhcmdldFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG4uc2V0QXR0cmlidXRlTlMoeGxpbmssIFwic2hvd1wiLCB2YWx1ZSA9PSBcImJsYW5rXCIgPyBcIm5ld1wiIDogdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbi5zZXRBdHRyaWJ1dGVOUyh4bGluaywgYXR0LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImN1cnNvclwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5zdHlsZS5jdXJzb3IgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwidHJhbnNmb3JtXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBvLnRyYW5zZm9ybSh2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImFycm93LXN0YXJ0XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRBcnJvdyhvLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImFycm93LWVuZFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgYWRkQXJyb3cobywgdmFsdWUsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjbGlwLXJlY3RcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciByZWN0ID0gU3RyKHZhbHVlKS5zcGxpdChzZXBhcmF0b3IpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlY3QubGVuZ3RoID09IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvLmNsaXAgJiYgby5jbGlwLnBhcmVudE5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChvLmNsaXAucGFyZW50Tm9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVsID0gJChcImNsaXBQYXRoXCIpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByYyA9ICQoXCJyZWN0XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLmlkID0gUi5jcmVhdGVVVUlEKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChyYywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4OiByZWN0WzBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5OiByZWN0WzFdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aWR0aDogcmVjdFsyXSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVpZ2h0OiByZWN0WzNdXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwuYXBwZW5kQ2hpbGQocmMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG8ucGFwZXIuZGVmcy5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChub2RlLCB7XCJjbGlwLXBhdGhcIjogXCJ1cmwoI1wiICsgZWwuaWQgKyBcIilcIn0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG8uY2xpcCA9IHJjO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwYXRoID0gbm9kZS5nZXRBdHRyaWJ1dGUoXCJjbGlwLXBhdGhcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNsaXAgPSBSLl9nLmRvYy5nZXRFbGVtZW50QnlJZChwYXRoLnJlcGxhY2UoLyhedXJsXFwoI3xcXCkkKS9nLCBFKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaXAgJiYgY2xpcC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGNsaXApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKG5vZGUsIHtcImNsaXAtcGF0aFwiOiBFfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBvLmNsaXA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInBhdGhcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvLnR5cGUgPT0gXCJwYXRoXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKG5vZGUsIHtkOiB2YWx1ZSA/IGF0dHJzLnBhdGggPSBSLl9wYXRoVG9BYnNvbHV0ZSh2YWx1ZSkgOiBcIk0wLDBcIn0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG8uXy5kaXJ0eSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG8uXy5hcnJvd3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzdGFydFN0cmluZ1wiIGluIG8uXy5hcnJvd3MgJiYgYWRkQXJyb3cobywgby5fLmFycm93cy5zdGFydFN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZW5kU3RyaW5nXCIgaW4gby5fLmFycm93cyAmJiBhZGRBcnJvdyhvLCBvLl8uYXJyb3dzLmVuZFN0cmluZywgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ3aWR0aFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoYXR0LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvLl8uZGlydHkgPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJzLmZ4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0ID0gXCJ4XCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBhdHRycy54O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInhcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRycy5meCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gLWF0dHJzLnggLSAoYXR0cnMud2lkdGggfHwgMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJyeFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dCA9PSBcInJ4XCIgJiYgby50eXBlID09IFwicmVjdFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjeFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoYXR0LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvLnBhdHRlcm4gJiYgdXBkYXRlUG9zaXRpb24obyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvLl8uZGlydHkgPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJoZWlnaHRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKGF0dCwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgby5fLmRpcnR5ID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRycy5meSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dCA9IFwieVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gYXR0cnMueTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ5XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0cnMuZnkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IC1hdHRycy55IC0gKGF0dHJzLmhlaWdodCB8fCAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInJ5XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0ID09IFwicnlcIiAmJiBvLnR5cGUgPT0gXCJyZWN0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImN5XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShhdHQsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG8ucGF0dGVybiAmJiB1cGRhdGVQb3NpdGlvbihvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG8uXy5kaXJ0eSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInJcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvLnR5cGUgPT0gXCJyZWN0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKG5vZGUsIHtyeDogdmFsdWUsIHJ5OiB2YWx1ZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShhdHQsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG8uXy5kaXJ0eSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInNyY1wiOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG8udHlwZSA9PSBcImltYWdlXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZU5TKHhsaW5rLCBcImhyZWZcIiwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJzdHJva2Utd2lkdGhcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvLl8uc3ggIT0gMSB8fCBvLl8uc3kgIT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlIC89IG1tYXgoYWJzKG8uXy5zeCksIGFicyhvLl8uc3kpKSB8fCAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG8ucGFwZXIuX3ZiU2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlICo9IG8ucGFwZXIuX3ZiU2l6ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKGF0dCwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJzW1wic3Ryb2tlLWRhc2hhcnJheVwiXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZERhc2hlcyhvLCBhdHRyc1tcInN0cm9rZS1kYXNoYXJyYXlcIl0sIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoby5fLmFycm93cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwic3RhcnRTdHJpbmdcIiBpbiBvLl8uYXJyb3dzICYmIGFkZEFycm93KG8sIG8uXy5hcnJvd3Muc3RhcnRTdHJpbmcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZW5kU3RyaW5nXCIgaW4gby5fLmFycm93cyAmJiBhZGRBcnJvdyhvLCBvLl8uYXJyb3dzLmVuZFN0cmluZywgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInN0cm9rZS1kYXNoYXJyYXlcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZERhc2hlcyhvLCB2YWx1ZSwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZmlsbFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlzVVJMID0gU3RyKHZhbHVlKS5tYXRjaChSLl9JU1VSTCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNVUkwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbCA9ICQoXCJwYXR0ZXJuXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBpZyA9ICQoXCJpbWFnZVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5pZCA9IFIuY3JlYXRlVVVJRCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoZWwsIHt4OiAwLCB5OiAwLCBwYXR0ZXJuVW5pdHM6IFwidXNlclNwYWNlT25Vc2VcIiwgaGVpZ2h0OiAxLCB3aWR0aDogMX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoaWcsIHt4OiAwLCB5OiAwLCBcInhsaW5rOmhyZWZcIjogaXNVUkxbMV19KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5hcHBlbmRDaGlsZChpZyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFIuX3ByZWxvYWQoaXNVUkxbMV0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB3ID0gdGhpcy5vZmZzZXRXaWR0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoID0gdGhpcy5vZmZzZXRIZWlnaHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGVsLCB7d2lkdGg6IHcsIGhlaWdodDogaH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJChpZywge3dpZHRoOiB3LCBoZWlnaHQ6IGh9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG8ucGFwZXIuc2FmYXJpKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvLnBhcGVyLmRlZnMuYXBwZW5kQ2hpbGQoZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQobm9kZSwge2ZpbGw6IFwidXJsKCNcIiArIGVsLmlkICsgXCIpXCJ9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvLnBhdHRlcm4gPSBlbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvLnBhdHRlcm4gJiYgdXBkYXRlUG9zaXRpb24obyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2xyID0gUi5nZXRSR0IodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFjbHIuZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgcGFyYW1zLmdyYWRpZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBhdHRycy5ncmFkaWVudDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAhUi5pcyhhdHRycy5vcGFjaXR5LCBcInVuZGVmaW5lZFwiKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBSLmlzKHBhcmFtcy5vcGFjaXR5LCBcInVuZGVmaW5lZFwiKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKG5vZGUsIHtvcGFjaXR5OiBhdHRycy5vcGFjaXR5fSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIVIuaXMoYXR0cnNbXCJmaWxsLW9wYWNpdHlcIl0sIFwidW5kZWZpbmVkXCIpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFIuaXMocGFyYW1zW1wiZmlsbC1vcGFjaXR5XCJdLCBcInVuZGVmaW5lZFwiKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKG5vZGUsIHtcImZpbGwtb3BhY2l0eVwiOiBhdHRyc1tcImZpbGwtb3BhY2l0eVwiXX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICgoby50eXBlID09IFwiY2lyY2xlXCIgfHwgby50eXBlID09IFwiZWxsaXBzZVwiIHx8IFN0cih2YWx1ZSkuY2hhckF0KCkgIT0gXCJyXCIpICYmIGFkZEdyYWRpZW50RmlsbChvLCB2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoXCJvcGFjaXR5XCIgaW4gYXR0cnMgfHwgXCJmaWxsLW9wYWNpdHlcIiBpbiBhdHRycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZ3JhZGllbnQgPSBSLl9nLmRvYy5nZXRFbGVtZW50QnlJZChub2RlLmdldEF0dHJpYnV0ZShcImZpbGxcIikucmVwbGFjZSgvXnVybFxcKCN8XFwpJC9nLCBFKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChncmFkaWVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHN0b3BzID0gZ3JhZGllbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzdG9wXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJChzdG9wc1tzdG9wcy5sZW5ndGggLSAxXSwge1wic3RvcC1vcGFjaXR5XCI6IChcIm9wYWNpdHlcIiBpbiBhdHRycyA/IGF0dHJzLm9wYWNpdHkgOiAxKSAqIChcImZpbGwtb3BhY2l0eVwiIGluIGF0dHJzID8gYXR0cnNbXCJmaWxsLW9wYWNpdHlcIl0gOiAxKX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJzLmdyYWRpZW50ID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0cnMuZmlsbCA9IFwibm9uZVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY2xyW2hhc10oXCJvcGFjaXR5XCIpICYmICQobm9kZSwge1wiZmlsbC1vcGFjaXR5XCI6IGNsci5vcGFjaXR5ID4gMSA/IGNsci5vcGFjaXR5IC8gMTAwIDogY2xyLm9wYWNpdHl9KTtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInN0cm9rZVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgY2xyID0gUi5nZXRSR0IodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoYXR0LCBjbHIuaGV4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dCA9PSBcInN0cm9rZVwiICYmIGNscltoYXNdKFwib3BhY2l0eVwiKSAmJiAkKG5vZGUsIHtcInN0cm9rZS1vcGFjaXR5XCI6IGNsci5vcGFjaXR5ID4gMSA/IGNsci5vcGFjaXR5IC8gMTAwIDogY2xyLm9wYWNpdHl9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHQgPT0gXCJzdHJva2VcIiAmJiBvLl8uYXJyb3dzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzdGFydFN0cmluZ1wiIGluIG8uXy5hcnJvd3MgJiYgYWRkQXJyb3cobywgby5fLmFycm93cy5zdGFydFN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJlbmRTdHJpbmdcIiBpbiBvLl8uYXJyb3dzICYmIGFkZEFycm93KG8sIG8uXy5hcnJvd3MuZW5kU3RyaW5nLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZ3JhZGllbnRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIChvLnR5cGUgPT0gXCJjaXJjbGVcIiB8fCBvLnR5cGUgPT0gXCJlbGxpcHNlXCIgfHwgU3RyKHZhbHVlKS5jaGFyQXQoKSAhPSBcInJcIikgJiYgYWRkR3JhZGllbnRGaWxsKG8sIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwib3BhY2l0eVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJzLmdyYWRpZW50ICYmICFhdHRyc1toYXNdKFwic3Ryb2tlLW9wYWNpdHlcIikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKG5vZGUsIHtcInN0cm9rZS1vcGFjaXR5XCI6IHZhbHVlID4gMSA/IHZhbHVlIC8gMTAwIDogdmFsdWV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZhbGxcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImZpbGwtb3BhY2l0eVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJzLmdyYWRpZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ3JhZGllbnQgPSBSLl9nLmRvYy5nZXRFbGVtZW50QnlJZChub2RlLmdldEF0dHJpYnV0ZShcImZpbGxcIikucmVwbGFjZSgvXnVybFxcKCN8XFwpJC9nLCBFKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdyYWRpZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0b3BzID0gZ3JhZGllbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzdG9wXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHN0b3BzW3N0b3BzLmxlbmd0aCAtIDFdLCB7XCJzdG9wLW9wYWNpdHlcIjogdmFsdWV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICBhdHQgPT0gXCJmb250LXNpemVcIiAmJiAodmFsdWUgPSB0b0ludCh2YWx1ZSwgMTApICsgXCJweFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjc3NydWxlID0gYXR0LnJlcGxhY2UoLyhcXC0uKS9nLCBmdW5jdGlvbiAodykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB3LnN1YnN0cmluZygxKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnN0eWxlW2Nzc3J1bGVdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBvLl8uZGlydHkgPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoYXR0LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0dW5lVGV4dChvLCBwYXJhbXMpO1xuICAgICAgICBub2RlLnN0eWxlLnZpc2liaWxpdHkgPSB2aXM7XG4gICAgfSxcbiAgICBsZWFkaW5nID0gMS4yLFxuICAgIHR1bmVUZXh0ID0gZnVuY3Rpb24gKGVsLCBwYXJhbXMpIHtcbiAgICAgICAgaWYgKGVsLnR5cGUgIT0gXCJ0ZXh0XCIgfHwgIShwYXJhbXNbaGFzXShcInRleHRcIikgfHwgcGFyYW1zW2hhc10oXCJmb250XCIpIHx8IHBhcmFtc1toYXNdKFwiZm9udC1zaXplXCIpIHx8IHBhcmFtc1toYXNdKFwieFwiKSB8fCBwYXJhbXNbaGFzXShcInlcIikpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGEgPSBlbC5hdHRycyxcbiAgICAgICAgICAgIG5vZGUgPSBlbC5ub2RlLFxuICAgICAgICAgICAgZm9udFNpemUgPSBub2RlLmZpcnN0Q2hpbGQgPyB0b0ludChSLl9nLmRvYy5kZWZhdWx0Vmlldy5nZXRDb21wdXRlZFN0eWxlKG5vZGUuZmlyc3RDaGlsZCwgRSkuZ2V0UHJvcGVydHlWYWx1ZShcImZvbnQtc2l6ZVwiKSwgMTApIDogMTA7XG5cbiAgICAgICAgaWYgKHBhcmFtc1toYXNdKFwidGV4dFwiKSkge1xuICAgICAgICAgICAgYS50ZXh0ID0gcGFyYW1zLnRleHQ7XG4gICAgICAgICAgICB3aGlsZSAobm9kZS5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgbm9kZS5yZW1vdmVDaGlsZChub2RlLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHRleHRzID0gU3RyKHBhcmFtcy50ZXh0KS5zcGxpdChcIlxcblwiKSxcbiAgICAgICAgICAgICAgICB0c3BhbnMgPSBbXSxcbiAgICAgICAgICAgICAgICB0c3BhbjtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IHRleHRzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICB0c3BhbiA9ICQoXCJ0c3BhblwiKTtcbiAgICAgICAgICAgICAgICBpICYmICQodHNwYW4sIHtkeTogZm9udFNpemUgKiBsZWFkaW5nLCB4OiBhLnh9KTtcbiAgICAgICAgICAgICAgICB0c3Bhbi5hcHBlbmRDaGlsZChSLl9nLmRvYy5jcmVhdGVUZXh0Tm9kZSh0ZXh0c1tpXSkpO1xuICAgICAgICAgICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQodHNwYW4pO1xuICAgICAgICAgICAgICAgIHRzcGFuc1tpXSA9IHRzcGFuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdHNwYW5zID0gbm9kZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcInRzcGFuXCIpO1xuICAgICAgICAgICAgZm9yIChpID0gMCwgaWkgPSB0c3BhbnMubGVuZ3RoOyBpIDwgaWk7IGkrKykgaWYgKGkpIHtcbiAgICAgICAgICAgICAgICAkKHRzcGFuc1tpXSwge2R5OiBmb250U2l6ZSAqIGxlYWRpbmcsIHg6IGEueH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKHRzcGFuc1swXSwge2R5OiAwfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgJChub2RlLCB7eDogYS54LCB5OiBhLnl9KTtcbiAgICAgICAgZWwuXy5kaXJ0eSA9IDE7XG4gICAgICAgIHZhciBiYiA9IGVsLl9nZXRCQm94KCksXG4gICAgICAgICAgICBkaWYgPSBhLnkgLSAoYmIueSArIGJiLmhlaWdodCAvIDIpO1xuICAgICAgICBkaWYgJiYgUi5pcyhkaWYsIFwiZmluaXRlXCIpICYmICQodHNwYW5zWzBdLCB7ZHk6IGRpZn0pO1xuICAgIH0sXG4gICAgRWxlbWVudCA9IGZ1bmN0aW9uIChub2RlLCBzdmcpIHtcbiAgICAgICAgdmFyIFggPSAwLFxuICAgICAgICAgICAgWSA9IDA7XG4gICAgICAgIFxuICAgICAgICB0aGlzWzBdID0gdGhpcy5ub2RlID0gbm9kZTtcbiAgICAgICAgXG4gICAgICAgIG5vZGUucmFwaGFlbCA9IHRydWU7XG4gICAgICAgIFxuICAgICAgICB0aGlzLmlkID0gUi5fb2lkKys7XG4gICAgICAgIG5vZGUucmFwaGFlbGlkID0gdGhpcy5pZDtcbiAgICAgICAgdGhpcy5tYXRyaXggPSBSLm1hdHJpeCgpO1xuICAgICAgICB0aGlzLnJlYWxQYXRoID0gbnVsbDtcbiAgICAgICAgXG4gICAgICAgIHRoaXMucGFwZXIgPSBzdmc7XG4gICAgICAgIHRoaXMuYXR0cnMgPSB0aGlzLmF0dHJzIHx8IHt9O1xuICAgICAgICB0aGlzLl8gPSB7XG4gICAgICAgICAgICB0cmFuc2Zvcm06IFtdLFxuICAgICAgICAgICAgc3g6IDEsXG4gICAgICAgICAgICBzeTogMSxcbiAgICAgICAgICAgIGRlZzogMCxcbiAgICAgICAgICAgIGR4OiAwLFxuICAgICAgICAgICAgZHk6IDAsXG4gICAgICAgICAgICBkaXJ0eTogMVxuICAgICAgICB9O1xuICAgICAgICAhc3ZnLmJvdHRvbSAmJiAoc3ZnLmJvdHRvbSA9IHRoaXMpO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5wcmV2ID0gc3ZnLnRvcDtcbiAgICAgICAgc3ZnLnRvcCAmJiAoc3ZnLnRvcC5uZXh0ID0gdGhpcyk7XG4gICAgICAgIHN2Zy50b3AgPSB0aGlzO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5uZXh0ID0gbnVsbDtcbiAgICB9LFxuICAgIGVscHJvdG8gPSBSLmVsO1xuXG4gICAgRWxlbWVudC5wcm90b3R5cGUgPSBlbHByb3RvO1xuICAgIGVscHJvdG8uY29uc3RydWN0b3IgPSBFbGVtZW50O1xuXG4gICAgUi5fZW5naW5lLnBhdGggPSBmdW5jdGlvbiAocGF0aFN0cmluZywgU1ZHKSB7XG4gICAgICAgIHZhciBlbCA9ICQoXCJwYXRoXCIpO1xuICAgICAgICBTVkcuY2FudmFzICYmIFNWRy5jYW52YXMuYXBwZW5kQ2hpbGQoZWwpO1xuICAgICAgICB2YXIgcCA9IG5ldyBFbGVtZW50KGVsLCBTVkcpO1xuICAgICAgICBwLnR5cGUgPSBcInBhdGhcIjtcbiAgICAgICAgc2V0RmlsbEFuZFN0cm9rZShwLCB7XG4gICAgICAgICAgICBmaWxsOiBcIm5vbmVcIixcbiAgICAgICAgICAgIHN0cm9rZTogXCIjMDAwXCIsXG4gICAgICAgICAgICBwYXRoOiBwYXRoU3RyaW5nXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcDtcbiAgICB9O1xuICAgIFxuICAgIGVscHJvdG8ucm90YXRlID0gZnVuY3Rpb24gKGRlZywgY3gsIGN5KSB7XG4gICAgICAgIGlmICh0aGlzLnJlbW92ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGRlZyA9IFN0cihkZWcpLnNwbGl0KHNlcGFyYXRvcik7XG4gICAgICAgIGlmIChkZWcubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgY3ggPSB0b0Zsb2F0KGRlZ1sxXSk7XG4gICAgICAgICAgICBjeSA9IHRvRmxvYXQoZGVnWzJdKTtcbiAgICAgICAgfVxuICAgICAgICBkZWcgPSB0b0Zsb2F0KGRlZ1swXSk7XG4gICAgICAgIChjeSA9PSBudWxsKSAmJiAoY3ggPSBjeSk7XG4gICAgICAgIGlmIChjeCA9PSBudWxsIHx8IGN5ID09IG51bGwpIHtcbiAgICAgICAgICAgIHZhciBiYm94ID0gdGhpcy5nZXRCQm94KDEpO1xuICAgICAgICAgICAgY3ggPSBiYm94LnggKyBiYm94LndpZHRoIC8gMjtcbiAgICAgICAgICAgIGN5ID0gYmJveC55ICsgYmJveC5oZWlnaHQgLyAyO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudHJhbnNmb3JtKHRoaXMuXy50cmFuc2Zvcm0uY29uY2F0KFtbXCJyXCIsIGRlZywgY3gsIGN5XV0pKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLnNjYWxlID0gZnVuY3Rpb24gKHN4LCBzeSwgY3gsIGN5KSB7XG4gICAgICAgIGlmICh0aGlzLnJlbW92ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIHN4ID0gU3RyKHN4KS5zcGxpdChzZXBhcmF0b3IpO1xuICAgICAgICBpZiAoc3gubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgc3kgPSB0b0Zsb2F0KHN4WzFdKTtcbiAgICAgICAgICAgIGN4ID0gdG9GbG9hdChzeFsyXSk7XG4gICAgICAgICAgICBjeSA9IHRvRmxvYXQoc3hbM10pO1xuICAgICAgICB9XG4gICAgICAgIHN4ID0gdG9GbG9hdChzeFswXSk7XG4gICAgICAgIChzeSA9PSBudWxsKSAmJiAoc3kgPSBzeCk7XG4gICAgICAgIChjeSA9PSBudWxsKSAmJiAoY3ggPSBjeSk7XG4gICAgICAgIGlmIChjeCA9PSBudWxsIHx8IGN5ID09IG51bGwpIHtcbiAgICAgICAgICAgIHZhciBiYm94ID0gdGhpcy5nZXRCQm94KDEpO1xuICAgICAgICB9XG4gICAgICAgIGN4ID0gY3ggPT0gbnVsbCA/IGJib3gueCArIGJib3gud2lkdGggLyAyIDogY3g7XG4gICAgICAgIGN5ID0gY3kgPT0gbnVsbCA/IGJib3gueSArIGJib3guaGVpZ2h0IC8gMiA6IGN5O1xuICAgICAgICB0aGlzLnRyYW5zZm9ybSh0aGlzLl8udHJhbnNmb3JtLmNvbmNhdChbW1wic1wiLCBzeCwgc3ksIGN4LCBjeV1dKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgZWxwcm90by50cmFuc2xhdGUgPSBmdW5jdGlvbiAoZHgsIGR5KSB7XG4gICAgICAgIGlmICh0aGlzLnJlbW92ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGR4ID0gU3RyKGR4KS5zcGxpdChzZXBhcmF0b3IpO1xuICAgICAgICBpZiAoZHgubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgZHkgPSB0b0Zsb2F0KGR4WzFdKTtcbiAgICAgICAgfVxuICAgICAgICBkeCA9IHRvRmxvYXQoZHhbMF0pIHx8IDA7XG4gICAgICAgIGR5ID0gK2R5IHx8IDA7XG4gICAgICAgIHRoaXMudHJhbnNmb3JtKHRoaXMuXy50cmFuc2Zvcm0uY29uY2F0KFtbXCJ0XCIsIGR4LCBkeV1dKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgZWxwcm90by50cmFuc2Zvcm0gPSBmdW5jdGlvbiAodHN0cikge1xuICAgICAgICB2YXIgXyA9IHRoaXMuXztcbiAgICAgICAgaWYgKHRzdHIgPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIF8udHJhbnNmb3JtO1xuICAgICAgICB9XG4gICAgICAgIFIuX2V4dHJhY3RUcmFuc2Zvcm0odGhpcywgdHN0cik7XG5cbiAgICAgICAgdGhpcy5jbGlwICYmICQodGhpcy5jbGlwLCB7dHJhbnNmb3JtOiB0aGlzLm1hdHJpeC5pbnZlcnQoKX0pO1xuICAgICAgICB0aGlzLnBhdHRlcm4gJiYgdXBkYXRlUG9zaXRpb24odGhpcyk7XG4gICAgICAgIHRoaXMubm9kZSAmJiAkKHRoaXMubm9kZSwge3RyYW5zZm9ybTogdGhpcy5tYXRyaXh9KTtcbiAgICBcbiAgICAgICAgaWYgKF8uc3ggIT0gMSB8fCBfLnN5ICE9IDEpIHtcbiAgICAgICAgICAgIHZhciBzdyA9IHRoaXMuYXR0cnNbaGFzXShcInN0cm9rZS13aWR0aFwiKSA/IHRoaXMuYXR0cnNbXCJzdHJva2Utd2lkdGhcIl0gOiAxO1xuICAgICAgICAgICAgdGhpcy5hdHRyKHtcInN0cm9rZS13aWR0aFwiOiBzd30pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLmhpZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICF0aGlzLnJlbW92ZWQgJiYgdGhpcy5wYXBlci5zYWZhcmkodGhpcy5ub2RlLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgZWxwcm90by5zaG93ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAhdGhpcy5yZW1vdmVkICYmIHRoaXMucGFwZXIuc2FmYXJpKHRoaXMubm9kZS5zdHlsZS5kaXNwbGF5ID0gXCJcIik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgZWxwcm90by5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLnJlbW92ZWQgfHwgIXRoaXMubm9kZS5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhcGVyID0gdGhpcy5wYXBlcjtcbiAgICAgICAgcGFwZXIuX19zZXRfXyAmJiBwYXBlci5fX3NldF9fLmV4Y2x1ZGUodGhpcyk7XG4gICAgICAgIGV2ZS51bmJpbmQoXCJyYXBoYWVsLiouKi5cIiArIHRoaXMuaWQpO1xuICAgICAgICBpZiAodGhpcy5ncmFkaWVudCkge1xuICAgICAgICAgICAgcGFwZXIuZGVmcy5yZW1vdmVDaGlsZCh0aGlzLmdyYWRpZW50KTtcbiAgICAgICAgfVxuICAgICAgICBSLl90ZWFyKHRoaXMsIHBhcGVyKTtcbiAgICAgICAgaWYgKHRoaXMubm9kZS5wYXJlbnROb2RlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PSBcImFcIikge1xuICAgICAgICAgICAgdGhpcy5ub2RlLnBhcmVudE5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLm5vZGUucGFyZW50Tm9kZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLm5vZGUucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLm5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGkgaW4gdGhpcykge1xuICAgICAgICAgICAgdGhpc1tpXSA9IHR5cGVvZiB0aGlzW2ldID09IFwiZnVuY3Rpb25cIiA/IFIuX3JlbW92ZWRGYWN0b3J5KGkpIDogbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbW92ZWQgPSB0cnVlO1xuICAgIH07XG4gICAgZWxwcm90by5fZ2V0QkJveCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMubm9kZS5zdHlsZS5kaXNwbGF5ID09IFwibm9uZVwiKSB7XG4gICAgICAgICAgICB0aGlzLnNob3coKTtcbiAgICAgICAgICAgIHZhciBoaWRlID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYmJveCA9IHt9O1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYmJveCA9IHRoaXMubm9kZS5nZXRCQm94KCk7XG4gICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgLy8gRmlyZWZveCAzLjAueCBwbGF5cyBiYWRseSBoZXJlXG4gICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICBiYm94ID0gYmJveCB8fCB7fTtcbiAgICAgICAgfVxuICAgICAgICBoaWRlICYmIHRoaXMuaGlkZSgpO1xuICAgICAgICByZXR1cm4gYmJveDtcbiAgICB9O1xuICAgIFxuICAgIGVscHJvdG8uYXR0ciA9IGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSkge1xuICAgICAgICBpZiAodGhpcy5yZW1vdmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBpZiAobmFtZSA9PSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgcmVzID0ge307XG4gICAgICAgICAgICBmb3IgKHZhciBhIGluIHRoaXMuYXR0cnMpIGlmICh0aGlzLmF0dHJzW2hhc10oYSkpIHtcbiAgICAgICAgICAgICAgICByZXNbYV0gPSB0aGlzLmF0dHJzW2FdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzLmdyYWRpZW50ICYmIHJlcy5maWxsID09IFwibm9uZVwiICYmIChyZXMuZmlsbCA9IHJlcy5ncmFkaWVudCkgJiYgZGVsZXRlIHJlcy5ncmFkaWVudDtcbiAgICAgICAgICAgIHJlcy50cmFuc2Zvcm0gPSB0aGlzLl8udHJhbnNmb3JtO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCAmJiBSLmlzKG5hbWUsIFwic3RyaW5nXCIpKSB7XG4gICAgICAgICAgICBpZiAobmFtZSA9PSBcImZpbGxcIiAmJiB0aGlzLmF0dHJzLmZpbGwgPT0gXCJub25lXCIgJiYgdGhpcy5hdHRycy5ncmFkaWVudCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmF0dHJzLmdyYWRpZW50O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5hbWUgPT0gXCJ0cmFuc2Zvcm1cIikge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLl8udHJhbnNmb3JtO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG5hbWVzID0gbmFtZS5zcGxpdChzZXBhcmF0b3IpLFxuICAgICAgICAgICAgICAgIG91dCA9IHt9O1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gbmFtZXMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBuYW1lc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAobmFtZSBpbiB0aGlzLmF0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dFtuYW1lXSA9IHRoaXMuYXR0cnNbbmFtZV07XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChSLmlzKHRoaXMucGFwZXIuY3VzdG9tQXR0cmlidXRlc1tuYW1lXSwgXCJmdW5jdGlvblwiKSkge1xuICAgICAgICAgICAgICAgICAgICBvdXRbbmFtZV0gPSB0aGlzLnBhcGVyLmN1c3RvbUF0dHJpYnV0ZXNbbmFtZV0uZGVmO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG91dFtuYW1lXSA9IFIuX2F2YWlsYWJsZUF0dHJzW25hbWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpaSAtIDEgPyBvdXQgOiBvdXRbbmFtZXNbMF1dO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZSA9PSBudWxsICYmIFIuaXMobmFtZSwgXCJhcnJheVwiKSkge1xuICAgICAgICAgICAgb3V0ID0ge307XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBpaSA9IG5hbWUubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIG91dFtuYW1lW2ldXSA9IHRoaXMuYXR0cihuYW1lW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgICAgIHZhciBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHBhcmFtc1tuYW1lXSA9IHZhbHVlO1xuICAgICAgICB9IGVsc2UgaWYgKG5hbWUgIT0gbnVsbCAmJiBSLmlzKG5hbWUsIFwib2JqZWN0XCIpKSB7XG4gICAgICAgICAgICBwYXJhbXMgPSBuYW1lO1xuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBwYXJhbXMpIHtcbiAgICAgICAgICAgIGV2ZShcInJhcGhhZWwuYXR0ci5cIiArIGtleSArIFwiLlwiICsgdGhpcy5pZCwgdGhpcywgcGFyYW1zW2tleV0pO1xuICAgICAgICB9XG4gICAgICAgIGZvciAoa2V5IGluIHRoaXMucGFwZXIuY3VzdG9tQXR0cmlidXRlcykgaWYgKHRoaXMucGFwZXIuY3VzdG9tQXR0cmlidXRlc1toYXNdKGtleSkgJiYgcGFyYW1zW2hhc10oa2V5KSAmJiBSLmlzKHRoaXMucGFwZXIuY3VzdG9tQXR0cmlidXRlc1trZXldLCBcImZ1bmN0aW9uXCIpKSB7XG4gICAgICAgICAgICB2YXIgcGFyID0gdGhpcy5wYXBlci5jdXN0b21BdHRyaWJ1dGVzW2tleV0uYXBwbHkodGhpcywgW10uY29uY2F0KHBhcmFtc1trZXldKSk7XG4gICAgICAgICAgICB0aGlzLmF0dHJzW2tleV0gPSBwYXJhbXNba2V5XTtcbiAgICAgICAgICAgIGZvciAodmFyIHN1YmtleSBpbiBwYXIpIGlmIChwYXJbaGFzXShzdWJrZXkpKSB7XG4gICAgICAgICAgICAgICAgcGFyYW1zW3N1YmtleV0gPSBwYXJbc3Via2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzZXRGaWxsQW5kU3Ryb2tlKHRoaXMsIHBhcmFtcyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgZWxwcm90by50b0Zyb250ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5yZW1vdmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5ub2RlLnBhcmVudE5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09IFwiYVwiKSB7XG4gICAgICAgICAgICB0aGlzLm5vZGUucGFyZW50Tm9kZS5wYXJlbnROb2RlLmFwcGVuZENoaWxkKHRoaXMubm9kZS5wYXJlbnROb2RlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5wYXJlbnROb2RlLmFwcGVuZENoaWxkKHRoaXMubm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN2ZyA9IHRoaXMucGFwZXI7XG4gICAgICAgIHN2Zy50b3AgIT0gdGhpcyAmJiBSLl90b2Zyb250KHRoaXMsIHN2Zyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgZWxwcm90by50b0JhY2sgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLnJlbW92ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLm5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgaWYgKHBhcmVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT0gXCJhXCIpIHtcbiAgICAgICAgICAgIHBhcmVudC5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLm5vZGUucGFyZW50Tm9kZSwgdGhpcy5ub2RlLnBhcmVudE5vZGUucGFyZW50Tm9kZS5maXJzdENoaWxkKTsgXG4gICAgICAgIH0gZWxzZSBpZiAocGFyZW50LmZpcnN0Q2hpbGQgIT0gdGhpcy5ub2RlKSB7XG4gICAgICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKHRoaXMubm9kZSwgdGhpcy5ub2RlLnBhcmVudE5vZGUuZmlyc3RDaGlsZCk7XG4gICAgICAgIH1cbiAgICAgICAgUi5fdG9iYWNrKHRoaXMsIHRoaXMucGFwZXIpO1xuICAgICAgICB2YXIgc3ZnID0gdGhpcy5wYXBlcjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLmluc2VydEFmdGVyID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgaWYgKHRoaXMucmVtb3ZlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG5vZGUgPSBlbGVtZW50Lm5vZGUgfHwgZWxlbWVudFtlbGVtZW50Lmxlbmd0aCAtIDFdLm5vZGU7XG4gICAgICAgIGlmIChub2RlLm5leHRTaWJsaW5nKSB7XG4gICAgICAgICAgICBub2RlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubm9kZSwgbm9kZS5uZXh0U2libGluZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBub2RlLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQodGhpcy5ub2RlKTtcbiAgICAgICAgfVxuICAgICAgICBSLl9pbnNlcnRhZnRlcih0aGlzLCBlbGVtZW50LCB0aGlzLnBhcGVyKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLmluc2VydEJlZm9yZSA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIGlmICh0aGlzLnJlbW92ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIHZhciBub2RlID0gZWxlbWVudC5ub2RlIHx8IGVsZW1lbnRbMF0ubm9kZTtcbiAgICAgICAgbm9kZS5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLm5vZGUsIG5vZGUpO1xuICAgICAgICBSLl9pbnNlcnRiZWZvcmUodGhpcywgZWxlbWVudCwgdGhpcy5wYXBlcik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgZWxwcm90by5ibHVyID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgICAgICAgLy8gRXhwZXJpbWVudGFsLiBObyBTYWZhcmkgc3VwcG9ydC4gVXNlIGl0IG9uIHlvdXIgb3duIHJpc2suXG4gICAgICAgIHZhciB0ID0gdGhpcztcbiAgICAgICAgaWYgKCtzaXplICE9PSAwKSB7XG4gICAgICAgICAgICB2YXIgZmx0ciA9ICQoXCJmaWx0ZXJcIiksXG4gICAgICAgICAgICAgICAgYmx1ciA9ICQoXCJmZUdhdXNzaWFuQmx1clwiKTtcbiAgICAgICAgICAgIHQuYXR0cnMuYmx1ciA9IHNpemU7XG4gICAgICAgICAgICBmbHRyLmlkID0gUi5jcmVhdGVVVUlEKCk7XG4gICAgICAgICAgICAkKGJsdXIsIHtzdGREZXZpYXRpb246ICtzaXplIHx8IDEuNX0pO1xuICAgICAgICAgICAgZmx0ci5hcHBlbmRDaGlsZChibHVyKTtcbiAgICAgICAgICAgIHQucGFwZXIuZGVmcy5hcHBlbmRDaGlsZChmbHRyKTtcbiAgICAgICAgICAgIHQuX2JsdXIgPSBmbHRyO1xuICAgICAgICAgICAgJCh0Lm5vZGUsIHtmaWx0ZXI6IFwidXJsKCNcIiArIGZsdHIuaWQgKyBcIilcIn0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKHQuX2JsdXIpIHtcbiAgICAgICAgICAgICAgICB0Ll9ibHVyLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodC5fYmx1cik7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHQuX2JsdXI7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHQuYXR0cnMuYmx1cjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHQubm9kZS5yZW1vdmVBdHRyaWJ1dGUoXCJmaWx0ZXJcIik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFIuX2VuZ2luZS5jaXJjbGUgPSBmdW5jdGlvbiAoc3ZnLCB4LCB5LCByKSB7XG4gICAgICAgIHZhciBlbCA9ICQoXCJjaXJjbGVcIik7XG4gICAgICAgIHN2Zy5jYW52YXMgJiYgc3ZnLmNhbnZhcy5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgIHZhciByZXMgPSBuZXcgRWxlbWVudChlbCwgc3ZnKTtcbiAgICAgICAgcmVzLmF0dHJzID0ge2N4OiB4LCBjeTogeSwgcjogciwgZmlsbDogXCJub25lXCIsIHN0cm9rZTogXCIjMDAwXCJ9O1xuICAgICAgICByZXMudHlwZSA9IFwiY2lyY2xlXCI7XG4gICAgICAgICQoZWwsIHJlcy5hdHRycyk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcbiAgICBSLl9lbmdpbmUucmVjdCA9IGZ1bmN0aW9uIChzdmcsIHgsIHksIHcsIGgsIHIpIHtcbiAgICAgICAgdmFyIGVsID0gJChcInJlY3RcIik7XG4gICAgICAgIHN2Zy5jYW52YXMgJiYgc3ZnLmNhbnZhcy5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgIHZhciByZXMgPSBuZXcgRWxlbWVudChlbCwgc3ZnKTtcbiAgICAgICAgcmVzLmF0dHJzID0ge3g6IHgsIHk6IHksIHdpZHRoOiB3LCBoZWlnaHQ6IGgsIHI6IHIgfHwgMCwgcng6IHIgfHwgMCwgcnk6IHIgfHwgMCwgZmlsbDogXCJub25lXCIsIHN0cm9rZTogXCIjMDAwXCJ9O1xuICAgICAgICByZXMudHlwZSA9IFwicmVjdFwiO1xuICAgICAgICAkKGVsLCByZXMuYXR0cnMpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH07XG4gICAgUi5fZW5naW5lLmVsbGlwc2UgPSBmdW5jdGlvbiAoc3ZnLCB4LCB5LCByeCwgcnkpIHtcbiAgICAgICAgdmFyIGVsID0gJChcImVsbGlwc2VcIik7XG4gICAgICAgIHN2Zy5jYW52YXMgJiYgc3ZnLmNhbnZhcy5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgIHZhciByZXMgPSBuZXcgRWxlbWVudChlbCwgc3ZnKTtcbiAgICAgICAgcmVzLmF0dHJzID0ge2N4OiB4LCBjeTogeSwgcng6IHJ4LCByeTogcnksIGZpbGw6IFwibm9uZVwiLCBzdHJva2U6IFwiIzAwMFwifTtcbiAgICAgICAgcmVzLnR5cGUgPSBcImVsbGlwc2VcIjtcbiAgICAgICAgJChlbCwgcmVzLmF0dHJzKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9O1xuICAgIFIuX2VuZ2luZS5pbWFnZSA9IGZ1bmN0aW9uIChzdmcsIHNyYywgeCwgeSwgdywgaCkge1xuICAgICAgICB2YXIgZWwgPSAkKFwiaW1hZ2VcIik7XG4gICAgICAgICQoZWwsIHt4OiB4LCB5OiB5LCB3aWR0aDogdywgaGVpZ2h0OiBoLCBwcmVzZXJ2ZUFzcGVjdFJhdGlvOiBcIm5vbmVcIn0pO1xuICAgICAgICBlbC5zZXRBdHRyaWJ1dGVOUyh4bGluaywgXCJocmVmXCIsIHNyYyk7XG4gICAgICAgIHN2Zy5jYW52YXMgJiYgc3ZnLmNhbnZhcy5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgIHZhciByZXMgPSBuZXcgRWxlbWVudChlbCwgc3ZnKTtcbiAgICAgICAgcmVzLmF0dHJzID0ge3g6IHgsIHk6IHksIHdpZHRoOiB3LCBoZWlnaHQ6IGgsIHNyYzogc3JjfTtcbiAgICAgICAgcmVzLnR5cGUgPSBcImltYWdlXCI7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcbiAgICBSLl9lbmdpbmUudGV4dCA9IGZ1bmN0aW9uIChzdmcsIHgsIHksIHRleHQpIHtcbiAgICAgICAgdmFyIGVsID0gJChcInRleHRcIik7XG4gICAgICAgIHN2Zy5jYW52YXMgJiYgc3ZnLmNhbnZhcy5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgIHZhciByZXMgPSBuZXcgRWxlbWVudChlbCwgc3ZnKTtcbiAgICAgICAgcmVzLmF0dHJzID0ge1xuICAgICAgICAgICAgeDogeCxcbiAgICAgICAgICAgIHk6IHksXG4gICAgICAgICAgICBcInRleHQtYW5jaG9yXCI6IFwibWlkZGxlXCIsXG4gICAgICAgICAgICB0ZXh0OiB0ZXh0LFxuICAgICAgICAgICAgZm9udDogUi5fYXZhaWxhYmxlQXR0cnMuZm9udCxcbiAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCIsXG4gICAgICAgICAgICBmaWxsOiBcIiMwMDBcIlxuICAgICAgICB9O1xuICAgICAgICByZXMudHlwZSA9IFwidGV4dFwiO1xuICAgICAgICBzZXRGaWxsQW5kU3Ryb2tlKHJlcywgcmVzLmF0dHJzKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9O1xuICAgIFIuX2VuZ2luZS5zZXRTaXplID0gZnVuY3Rpb24gKHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgdGhpcy53aWR0aCA9IHdpZHRoIHx8IHRoaXMud2lkdGg7XG4gICAgICAgIHRoaXMuaGVpZ2h0ID0gaGVpZ2h0IHx8IHRoaXMuaGVpZ2h0O1xuICAgICAgICB0aGlzLmNhbnZhcy5zZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiLCB0aGlzLndpZHRoKTtcbiAgICAgICAgdGhpcy5jYW52YXMuc2V0QXR0cmlidXRlKFwiaGVpZ2h0XCIsIHRoaXMuaGVpZ2h0KTtcbiAgICAgICAgaWYgKHRoaXMuX3ZpZXdCb3gpIHtcbiAgICAgICAgICAgIHRoaXMuc2V0Vmlld0JveC5hcHBseSh0aGlzLCB0aGlzLl92aWV3Qm94KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFIuX2VuZ2luZS5jcmVhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjb24gPSBSLl9nZXRDb250YWluZXIuYXBwbHkoMCwgYXJndW1lbnRzKSxcbiAgICAgICAgICAgIGNvbnRhaW5lciA9IGNvbiAmJiBjb24uY29udGFpbmVyLFxuICAgICAgICAgICAgeCA9IGNvbi54LFxuICAgICAgICAgICAgeSA9IGNvbi55LFxuICAgICAgICAgICAgd2lkdGggPSBjb24ud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSBjb24uaGVpZ2h0O1xuICAgICAgICBpZiAoIWNvbnRhaW5lcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU1ZHIGNvbnRhaW5lciBub3QgZm91bmQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjbnZzID0gJChcInN2Z1wiKSxcbiAgICAgICAgICAgIGNzcyA9IFwib3ZlcmZsb3c6aGlkZGVuO1wiLFxuICAgICAgICAgICAgaXNGbG9hdGluZztcbiAgICAgICAgeCA9IHggfHwgMDtcbiAgICAgICAgeSA9IHkgfHwgMDtcbiAgICAgICAgd2lkdGggPSB3aWR0aCB8fCA1MTI7XG4gICAgICAgIGhlaWdodCA9IGhlaWdodCB8fCAzNDI7XG4gICAgICAgICQoY252cywge1xuICAgICAgICAgICAgaGVpZ2h0OiBoZWlnaHQsXG4gICAgICAgICAgICB2ZXJzaW9uOiAxLjEsXG4gICAgICAgICAgICB3aWR0aDogd2lkdGgsXG4gICAgICAgICAgICB4bWxuczogXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoY29udGFpbmVyID09IDEpIHtcbiAgICAgICAgICAgIGNudnMuc3R5bGUuY3NzVGV4dCA9IGNzcyArIFwicG9zaXRpb246YWJzb2x1dGU7bGVmdDpcIiArIHggKyBcInB4O3RvcDpcIiArIHkgKyBcInB4XCI7XG4gICAgICAgICAgICBSLl9nLmRvYy5ib2R5LmFwcGVuZENoaWxkKGNudnMpO1xuICAgICAgICAgICAgaXNGbG9hdGluZyA9IDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjbnZzLnN0eWxlLmNzc1RleHQgPSBjc3MgKyBcInBvc2l0aW9uOnJlbGF0aXZlXCI7XG4gICAgICAgICAgICBpZiAoY29udGFpbmVyLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICBjb250YWluZXIuaW5zZXJ0QmVmb3JlKGNudnMsIGNvbnRhaW5lci5maXJzdENoaWxkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGNudnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGNvbnRhaW5lciA9IG5ldyBSLl9QYXBlcjtcbiAgICAgICAgY29udGFpbmVyLndpZHRoID0gd2lkdGg7XG4gICAgICAgIGNvbnRhaW5lci5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIGNvbnRhaW5lci5jYW52YXMgPSBjbnZzO1xuICAgICAgICBjb250YWluZXIuY2xlYXIoKTtcbiAgICAgICAgY29udGFpbmVyLl9sZWZ0ID0gY29udGFpbmVyLl90b3AgPSAwO1xuICAgICAgICBpc0Zsb2F0aW5nICYmIChjb250YWluZXIucmVuZGVyZml4ID0gZnVuY3Rpb24gKCkge30pO1xuICAgICAgICBjb250YWluZXIucmVuZGVyZml4KCk7XG4gICAgICAgIHJldHVybiBjb250YWluZXI7XG4gICAgfTtcbiAgICBSLl9lbmdpbmUuc2V0Vmlld0JveCA9IGZ1bmN0aW9uICh4LCB5LCB3LCBoLCBmaXQpIHtcbiAgICAgICAgZXZlKFwicmFwaGFlbC5zZXRWaWV3Qm94XCIsIHRoaXMsIHRoaXMuX3ZpZXdCb3gsIFt4LCB5LCB3LCBoLCBmaXRdKTtcbiAgICAgICAgdmFyIHNpemUgPSBtbWF4KHcgLyB0aGlzLndpZHRoLCBoIC8gdGhpcy5oZWlnaHQpLFxuICAgICAgICAgICAgdG9wID0gdGhpcy50b3AsXG4gICAgICAgICAgICBhc3BlY3RSYXRpbyA9IGZpdCA/IFwibWVldFwiIDogXCJ4TWluWU1pblwiLFxuICAgICAgICAgICAgdmIsXG4gICAgICAgICAgICBzdztcbiAgICAgICAgaWYgKHggPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKHRoaXMuX3ZiU2l6ZSkge1xuICAgICAgICAgICAgICAgIHNpemUgPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuX3ZiU2l6ZTtcbiAgICAgICAgICAgIHZiID0gXCIwIDAgXCIgKyB0aGlzLndpZHRoICsgUyArIHRoaXMuaGVpZ2h0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fdmJTaXplID0gc2l6ZTtcbiAgICAgICAgICAgIHZiID0geCArIFMgKyB5ICsgUyArIHcgKyBTICsgaDtcbiAgICAgICAgfVxuICAgICAgICAkKHRoaXMuY2FudmFzLCB7XG4gICAgICAgICAgICB2aWV3Qm94OiB2YixcbiAgICAgICAgICAgIHByZXNlcnZlQXNwZWN0UmF0aW86IGFzcGVjdFJhdGlvXG4gICAgICAgIH0pO1xuICAgICAgICB3aGlsZSAoc2l6ZSAmJiB0b3ApIHtcbiAgICAgICAgICAgIHN3ID0gXCJzdHJva2Utd2lkdGhcIiBpbiB0b3AuYXR0cnMgPyB0b3AuYXR0cnNbXCJzdHJva2Utd2lkdGhcIl0gOiAxO1xuICAgICAgICAgICAgdG9wLmF0dHIoe1wic3Ryb2tlLXdpZHRoXCI6IHN3fSk7XG4gICAgICAgICAgICB0b3AuXy5kaXJ0eSA9IDE7XG4gICAgICAgICAgICB0b3AuXy5kaXJ0eVQgPSAxO1xuICAgICAgICAgICAgdG9wID0gdG9wLnByZXY7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fdmlld0JveCA9IFt4LCB5LCB3LCBoLCAhIWZpdF07XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgUi5wcm90b3R5cGUucmVuZGVyZml4ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY252cyA9IHRoaXMuY2FudmFzLFxuICAgICAgICAgICAgcyA9IGNudnMuc3R5bGUsXG4gICAgICAgICAgICBwb3M7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBwb3MgPSBjbnZzLmdldFNjcmVlbkNUTSgpIHx8IGNudnMuY3JlYXRlU1ZHTWF0cml4KCk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIC8vIEJST1dTRVJJRlkgTU9EOiB0aGlzIHdpbGwgZmFpbCB3aXRoIGpzZG9tIHNpbmNlIGl0J3MgU1ZHIDEuMCxcbiAgICAgICAgICAgIC8vIGJ1dCBpbiBqc2RvbSB0aGlzIHdob2xlIGZ1bmN0aW9uIGlzbid0IG5lZWRlZCBhbnl3YXlzXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHBvcyA9IGNudnMuY3JlYXRlU1ZHTWF0cml4KCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciBsZWZ0ID0gLXBvcy5lICUgMSxcbiAgICAgICAgICAgIHRvcCA9IC1wb3MuZiAlIDE7XG4gICAgICAgIGlmIChsZWZ0IHx8IHRvcCkge1xuICAgICAgICAgICAgaWYgKGxlZnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9sZWZ0ID0gKHRoaXMuX2xlZnQgKyBsZWZ0KSAlIDE7XG4gICAgICAgICAgICAgICAgcy5sZWZ0ID0gdGhpcy5fbGVmdCArIFwicHhcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0b3ApIHtcbiAgICAgICAgICAgICAgICB0aGlzLl90b3AgPSAodGhpcy5fdG9wICsgdG9wKSAlIDE7XG4gICAgICAgICAgICAgICAgcy50b3AgPSB0aGlzLl90b3AgKyBcInB4XCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIFIucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBSLmV2ZShcInJhcGhhZWwuY2xlYXJcIiwgdGhpcyk7XG4gICAgICAgIHZhciBjID0gdGhpcy5jYW52YXM7XG4gICAgICAgIHdoaWxlIChjLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIGMucmVtb3ZlQ2hpbGQoYy5maXJzdENoaWxkKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmJvdHRvbSA9IHRoaXMudG9wID0gbnVsbDtcbiAgICAgICAgKHRoaXMuZGVzYyA9ICQoXCJkZXNjXCIpKS5hcHBlbmRDaGlsZChSLl9nLmRvYy5jcmVhdGVUZXh0Tm9kZShcIkNyZWF0ZWQgd2l0aCBSYXBoYVxceGVibCBcIiArIFIudmVyc2lvbikpO1xuICAgICAgICBjLmFwcGVuZENoaWxkKHRoaXMuZGVzYyk7XG4gICAgICAgIGMuYXBwZW5kQ2hpbGQodGhpcy5kZWZzID0gJChcImRlZnNcIikpO1xuICAgIH07XG4gICAgXG4gICAgUi5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBldmUoXCJyYXBoYWVsLnJlbW92ZVwiLCB0aGlzKTtcbiAgICAgICAgdGhpcy5jYW52YXMucGFyZW50Tm9kZSAmJiB0aGlzLmNhbnZhcy5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuY2FudmFzKTtcbiAgICAgICAgZm9yICh2YXIgaSBpbiB0aGlzKSB7XG4gICAgICAgICAgICB0aGlzW2ldID0gdHlwZW9mIHRoaXNbaV0gPT0gXCJmdW5jdGlvblwiID8gUi5fcmVtb3ZlZEZhY3RvcnkoaSkgOiBudWxsO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgc2V0cHJvdG8gPSBSLnN0O1xuICAgIGZvciAodmFyIG1ldGhvZCBpbiBlbHByb3RvKSBpZiAoZWxwcm90b1toYXNdKG1ldGhvZCkgJiYgIXNldHByb3RvW2hhc10obWV0aG9kKSkge1xuICAgICAgICBzZXRwcm90b1ttZXRob2RdID0gKGZ1bmN0aW9uIChtZXRob2RuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBhcmcgPSBhcmd1bWVudHM7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxbbWV0aG9kbmFtZV0uYXBwbHkoZWwsIGFyZyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KShtZXRob2QpO1xuICAgIH1cbn0oUmFwaGFlbCk7XG5cbi8vIOKUjOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUkCBcXFxcXG4vLyDilIIgUmFwaGHDq2wgLSBKYXZhU2NyaXB0IFZlY3RvciBMaWJyYXJ5ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4pSCIFxcXFxcbi8vIOKUnOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUpCBcXFxcXG4vLyDilIIgVk1MIE1vZHVsZSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDilIIgXFxcXFxuLy8g4pSc4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSkIFxcXFxcbi8vIOKUgiBDb3B5cmlnaHQgKGMpIDIwMDgtMjAxMSBEbWl0cnkgQmFyYW5vdnNraXkgKGh0dHA6Ly9yYXBoYWVsanMuY29tKSAgIOKUgiBcXFxcXG4vLyDilIIgQ29weXJpZ2h0IChjKSAyMDA4LTIwMTEgU2VuY2hhIExhYnMgKGh0dHA6Ly9zZW5jaGEuY29tKSAgICAgICAgICAgICDilIIgXFxcXFxuLy8g4pSCIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgKGh0dHA6Ly9yYXBoYWVsanMuY29tL2xpY2Vuc2UuaHRtbCkgbGljZW5zZS4g4pSCIFxcXFxcbi8vIOKUlOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUmCBcXFxcXG5SYXBoYWVsLnZtbCAmJiBmdW5jdGlvbiAoUikge1xuICAgIHZhciBoYXMgPSBcImhhc093blByb3BlcnR5XCIsXG4gICAgICAgIFN0ciA9IFN0cmluZyxcbiAgICAgICAgdG9GbG9hdCA9IHBhcnNlRmxvYXQsXG4gICAgICAgIG1hdGggPSBNYXRoLFxuICAgICAgICByb3VuZCA9IG1hdGgucm91bmQsXG4gICAgICAgIG1tYXggPSBtYXRoLm1heCxcbiAgICAgICAgbW1pbiA9IG1hdGgubWluLFxuICAgICAgICBhYnMgPSBtYXRoLmFicyxcbiAgICAgICAgZmlsbFN0cmluZyA9IFwiZmlsbFwiLFxuICAgICAgICBzZXBhcmF0b3IgPSAvWywgXSsvLFxuICAgICAgICBldmUgPSBSLmV2ZSxcbiAgICAgICAgbXMgPSBcIiBwcm9naWQ6RFhJbWFnZVRyYW5zZm9ybS5NaWNyb3NvZnRcIixcbiAgICAgICAgUyA9IFwiIFwiLFxuICAgICAgICBFID0gXCJcIixcbiAgICAgICAgbWFwID0ge006IFwibVwiLCBMOiBcImxcIiwgQzogXCJjXCIsIFo6IFwieFwiLCBtOiBcInRcIiwgbDogXCJyXCIsIGM6IFwidlwiLCB6OiBcInhcIn0sXG4gICAgICAgIGJpdGVzID0gLyhbY2xtel0pLD8oW15jbG16XSopL2dpLFxuICAgICAgICBibHVycmVnZXhwID0gLyBwcm9naWQ6XFxTK0JsdXJcXChbXlxcKV0rXFwpL2csXG4gICAgICAgIHZhbCA9IC8tP1teLFxccy1dKy9nLFxuICAgICAgICBjc3NEb3QgPSBcInBvc2l0aW9uOmFic29sdXRlO2xlZnQ6MDt0b3A6MDt3aWR0aDoxcHg7aGVpZ2h0OjFweFwiLFxuICAgICAgICB6b29tID0gMjE2MDAsXG4gICAgICAgIHBhdGhUeXBlcyA9IHtwYXRoOiAxLCByZWN0OiAxLCBpbWFnZTogMX0sXG4gICAgICAgIG92YWxUeXBlcyA9IHtjaXJjbGU6IDEsIGVsbGlwc2U6IDF9LFxuICAgICAgICBwYXRoMnZtbCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgICAgICAgICB2YXIgdG90YWwgPSAgL1thaHFzdHZdL2lnLFxuICAgICAgICAgICAgICAgIGNvbW1hbmQgPSBSLl9wYXRoVG9BYnNvbHV0ZTtcbiAgICAgICAgICAgIFN0cihwYXRoKS5tYXRjaCh0b3RhbCkgJiYgKGNvbW1hbmQgPSBSLl9wYXRoMmN1cnZlKTtcbiAgICAgICAgICAgIHRvdGFsID0gL1tjbG16XS9nO1xuICAgICAgICAgICAgaWYgKGNvbW1hbmQgPT0gUi5fcGF0aFRvQWJzb2x1dGUgJiYgIVN0cihwYXRoKS5tYXRjaCh0b3RhbCkpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gU3RyKHBhdGgpLnJlcGxhY2UoYml0ZXMsIGZ1bmN0aW9uIChhbGwsIGNvbW1hbmQsIGFyZ3MpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHZhbHMgPSBbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzTW92ZSA9IGNvbW1hbmQudG9Mb3dlckNhc2UoKSA9PSBcIm1cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcyA9IG1hcFtjb21tYW5kXTtcbiAgICAgICAgICAgICAgICAgICAgYXJncy5yZXBsYWNlKHZhbCwgZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNNb3ZlICYmIHZhbHMubGVuZ3RoID09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXMgKz0gdmFscyArIG1hcFtjb21tYW5kID09IFwibVwiID8gXCJsXCIgOiBcIkxcIl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFscyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFscy5wdXNoKHJvdW5kKHZhbHVlICogem9vbSkpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcyArIHZhbHM7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBwYSA9IGNvbW1hbmQocGF0aCksIHAsIHI7XG4gICAgICAgICAgICByZXMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IHBhLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBwID0gcGFbaV07XG4gICAgICAgICAgICAgICAgciA9IHBhW2ldWzBdLnRvTG93ZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgciA9PSBcInpcIiAmJiAociA9IFwieFwiKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMSwgamogPSBwLmxlbmd0aDsgaiA8IGpqOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgciArPSByb3VuZChwW2pdICogem9vbSkgKyAoaiAhPSBqaiAtIDEgPyBcIixcIiA6IEUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXMucHVzaChyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXMuam9pbihTKTtcbiAgICAgICAgfSxcbiAgICAgICAgY29tcGVuc2F0aW9uID0gZnVuY3Rpb24gKGRlZywgZHgsIGR5KSB7XG4gICAgICAgICAgICB2YXIgbSA9IFIubWF0cml4KCk7XG4gICAgICAgICAgICBtLnJvdGF0ZSgtZGVnLCAuNSwgLjUpO1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBkeDogbS54KGR4LCBkeSksXG4gICAgICAgICAgICAgICAgZHk6IG0ueShkeCwgZHkpXG4gICAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgICBzZXRDb29yZHMgPSBmdW5jdGlvbiAocCwgc3gsIHN5LCBkeCwgZHksIGRlZykge1xuICAgICAgICAgICAgdmFyIF8gPSBwLl8sXG4gICAgICAgICAgICAgICAgbSA9IHAubWF0cml4LFxuICAgICAgICAgICAgICAgIGZpbGxwb3MgPSBfLmZpbGxwb3MsXG4gICAgICAgICAgICAgICAgbyA9IHAubm9kZSxcbiAgICAgICAgICAgICAgICBzID0gby5zdHlsZSxcbiAgICAgICAgICAgICAgICB5ID0gMSxcbiAgICAgICAgICAgICAgICBmbGlwID0gXCJcIixcbiAgICAgICAgICAgICAgICBkeGR5LFxuICAgICAgICAgICAgICAgIGt4ID0gem9vbSAvIHN4LFxuICAgICAgICAgICAgICAgIGt5ID0gem9vbSAvIHN5O1xuICAgICAgICAgICAgcy52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcbiAgICAgICAgICAgIGlmICghc3ggfHwgIXN5KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgby5jb29yZHNpemUgPSBhYnMoa3gpICsgUyArIGFicyhreSk7XG4gICAgICAgICAgICBzLnJvdGF0aW9uID0gZGVnICogKHN4ICogc3kgPCAwID8gLTEgOiAxKTtcbiAgICAgICAgICAgIGlmIChkZWcpIHtcbiAgICAgICAgICAgICAgICB2YXIgYyA9IGNvbXBlbnNhdGlvbihkZWcsIGR4LCBkeSk7XG4gICAgICAgICAgICAgICAgZHggPSBjLmR4O1xuICAgICAgICAgICAgICAgIGR5ID0gYy5keTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHN4IDwgMCAmJiAoZmxpcCArPSBcInhcIik7XG4gICAgICAgICAgICBzeSA8IDAgJiYgKGZsaXAgKz0gXCIgeVwiKSAmJiAoeSA9IC0xKTtcbiAgICAgICAgICAgIHMuZmxpcCA9IGZsaXA7XG4gICAgICAgICAgICBvLmNvb3Jkb3JpZ2luID0gKGR4ICogLWt4KSArIFMgKyAoZHkgKiAta3kpO1xuICAgICAgICAgICAgaWYgKGZpbGxwb3MgfHwgXy5maWxsc2l6ZSkge1xuICAgICAgICAgICAgICAgIHZhciBmaWxsID0gby5nZXRFbGVtZW50c0J5VGFnTmFtZShmaWxsU3RyaW5nKTtcbiAgICAgICAgICAgICAgICBmaWxsID0gZmlsbCAmJiBmaWxsWzBdO1xuICAgICAgICAgICAgICAgIG8ucmVtb3ZlQ2hpbGQoZmlsbCk7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGxwb3MpIHtcbiAgICAgICAgICAgICAgICAgICAgYyA9IGNvbXBlbnNhdGlvbihkZWcsIG0ueChmaWxscG9zWzBdLCBmaWxscG9zWzFdKSwgbS55KGZpbGxwb3NbMF0sIGZpbGxwb3NbMV0pKTtcbiAgICAgICAgICAgICAgICAgICAgZmlsbC5wb3NpdGlvbiA9IGMuZHggKiB5ICsgUyArIGMuZHkgKiB5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoXy5maWxsc2l6ZSkge1xuICAgICAgICAgICAgICAgICAgICBmaWxsLnNpemUgPSBfLmZpbGxzaXplWzBdICogYWJzKHN4KSArIFMgKyBfLmZpbGxzaXplWzFdICogYWJzKHN5KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgby5hcHBlbmRDaGlsZChmaWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHMudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xuICAgICAgICB9O1xuICAgIFIudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAgXCJZb3VyIGJyb3dzZXIgZG9lc25cXHUyMDE5dCBzdXBwb3J0IFNWRy4gRmFsbGluZyBkb3duIHRvIFZNTC5cXG5Zb3UgYXJlIHJ1bm5pbmcgUmFwaGFcXHhlYmwgXCIgKyB0aGlzLnZlcnNpb247XG4gICAgfTtcbiAgICB2YXIgYWRkQXJyb3cgPSBmdW5jdGlvbiAobywgdmFsdWUsIGlzRW5kKSB7XG4gICAgICAgIHZhciB2YWx1ZXMgPSBTdHIodmFsdWUpLnRvTG93ZXJDYXNlKCkuc3BsaXQoXCItXCIpLFxuICAgICAgICAgICAgc2UgPSBpc0VuZCA/IFwiZW5kXCIgOiBcInN0YXJ0XCIsXG4gICAgICAgICAgICBpID0gdmFsdWVzLmxlbmd0aCxcbiAgICAgICAgICAgIHR5cGUgPSBcImNsYXNzaWNcIixcbiAgICAgICAgICAgIHcgPSBcIm1lZGl1bVwiLFxuICAgICAgICAgICAgaCA9IFwibWVkaXVtXCI7XG4gICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgIHN3aXRjaCAodmFsdWVzW2ldKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBcImJsb2NrXCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcImNsYXNzaWNcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwib3ZhbFwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCJkaWFtb25kXCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIm9wZW5cIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwibm9uZVwiOlxuICAgICAgICAgICAgICAgICAgICB0eXBlID0gdmFsdWVzW2ldO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwid2lkZVwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCJuYXJyb3dcIjogaCA9IHZhbHVlc1tpXTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImxvbmdcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwic2hvcnRcIjogdyA9IHZhbHVlc1tpXTsgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHN0cm9rZSA9IG8ubm9kZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcInN0cm9rZVwiKVswXTtcbiAgICAgICAgc3Ryb2tlW3NlICsgXCJhcnJvd1wiXSA9IHR5cGU7XG4gICAgICAgIHN0cm9rZVtzZSArIFwiYXJyb3dsZW5ndGhcIl0gPSB3O1xuICAgICAgICBzdHJva2Vbc2UgKyBcImFycm93d2lkdGhcIl0gPSBoO1xuICAgIH0sXG4gICAgc2V0RmlsbEFuZFN0cm9rZSA9IGZ1bmN0aW9uIChvLCBwYXJhbXMpIHtcbiAgICAgICAgLy8gby5wYXBlci5jYW52YXMuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICBvLmF0dHJzID0gby5hdHRycyB8fCB7fTtcbiAgICAgICAgdmFyIG5vZGUgPSBvLm5vZGUsXG4gICAgICAgICAgICBhID0gby5hdHRycyxcbiAgICAgICAgICAgIHMgPSBub2RlLnN0eWxlLFxuICAgICAgICAgICAgeHksXG4gICAgICAgICAgICBuZXdwYXRoID0gcGF0aFR5cGVzW28udHlwZV0gJiYgKHBhcmFtcy54ICE9IGEueCB8fCBwYXJhbXMueSAhPSBhLnkgfHwgcGFyYW1zLndpZHRoICE9IGEud2lkdGggfHwgcGFyYW1zLmhlaWdodCAhPSBhLmhlaWdodCB8fCBwYXJhbXMuY3ggIT0gYS5jeCB8fCBwYXJhbXMuY3kgIT0gYS5jeSB8fCBwYXJhbXMucnggIT0gYS5yeCB8fCBwYXJhbXMucnkgIT0gYS5yeSB8fCBwYXJhbXMuciAhPSBhLnIpLFxuICAgICAgICAgICAgaXNPdmFsID0gb3ZhbFR5cGVzW28udHlwZV0gJiYgKGEuY3ggIT0gcGFyYW1zLmN4IHx8IGEuY3kgIT0gcGFyYW1zLmN5IHx8IGEuciAhPSBwYXJhbXMuciB8fCBhLnJ4ICE9IHBhcmFtcy5yeCB8fCBhLnJ5ICE9IHBhcmFtcy5yeSksXG4gICAgICAgICAgICByZXMgPSBvO1xuXG5cbiAgICAgICAgZm9yICh2YXIgcGFyIGluIHBhcmFtcykgaWYgKHBhcmFtc1toYXNdKHBhcikpIHtcbiAgICAgICAgICAgIGFbcGFyXSA9IHBhcmFtc1twYXJdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuZXdwYXRoKSB7XG4gICAgICAgICAgICBhLnBhdGggPSBSLl9nZXRQYXRoW28udHlwZV0obyk7XG4gICAgICAgICAgICBvLl8uZGlydHkgPSAxO1xuICAgICAgICB9XG4gICAgICAgIHBhcmFtcy5ocmVmICYmIChub2RlLmhyZWYgPSBwYXJhbXMuaHJlZik7XG4gICAgICAgIHBhcmFtcy50aXRsZSAmJiAobm9kZS50aXRsZSA9IHBhcmFtcy50aXRsZSk7XG4gICAgICAgIHBhcmFtcy50YXJnZXQgJiYgKG5vZGUudGFyZ2V0ID0gcGFyYW1zLnRhcmdldCk7XG4gICAgICAgIHBhcmFtcy5jdXJzb3IgJiYgKHMuY3Vyc29yID0gcGFyYW1zLmN1cnNvcik7XG4gICAgICAgIFwiYmx1clwiIGluIHBhcmFtcyAmJiBvLmJsdXIocGFyYW1zLmJsdXIpO1xuICAgICAgICBpZiAocGFyYW1zLnBhdGggJiYgby50eXBlID09IFwicGF0aFwiIHx8IG5ld3BhdGgpIHtcbiAgICAgICAgICAgIG5vZGUucGF0aCA9IHBhdGgydm1sKH5TdHIoYS5wYXRoKS50b0xvd2VyQ2FzZSgpLmluZGV4T2YoXCJyXCIpID8gUi5fcGF0aFRvQWJzb2x1dGUoYS5wYXRoKSA6IGEucGF0aCk7XG4gICAgICAgICAgICBpZiAoby50eXBlID09IFwiaW1hZ2VcIikge1xuICAgICAgICAgICAgICAgIG8uXy5maWxscG9zID0gW2EueCwgYS55XTtcbiAgICAgICAgICAgICAgICBvLl8uZmlsbHNpemUgPSBbYS53aWR0aCwgYS5oZWlnaHRdO1xuICAgICAgICAgICAgICAgIHNldENvb3JkcyhvLCAxLCAxLCAwLCAwLCAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBcInRyYW5zZm9ybVwiIGluIHBhcmFtcyAmJiBvLnRyYW5zZm9ybShwYXJhbXMudHJhbnNmb3JtKTtcbiAgICAgICAgaWYgKGlzT3ZhbCkge1xuICAgICAgICAgICAgdmFyIGN4ID0gK2EuY3gsXG4gICAgICAgICAgICAgICAgY3kgPSArYS5jeSxcbiAgICAgICAgICAgICAgICByeCA9ICthLnJ4IHx8ICthLnIgfHwgMCxcbiAgICAgICAgICAgICAgICByeSA9ICthLnJ5IHx8ICthLnIgfHwgMDtcbiAgICAgICAgICAgIG5vZGUucGF0aCA9IFIuZm9ybWF0KFwiYXJ7MH0sezF9LHsyfSx7M30sezR9LHsxfSx7NH0sezF9eFwiLCByb3VuZCgoY3ggLSByeCkgKiB6b29tKSwgcm91bmQoKGN5IC0gcnkpICogem9vbSksIHJvdW5kKChjeCArIHJ4KSAqIHpvb20pLCByb3VuZCgoY3kgKyByeSkgKiB6b29tKSwgcm91bmQoY3ggKiB6b29tKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFwiY2xpcC1yZWN0XCIgaW4gcGFyYW1zKSB7XG4gICAgICAgICAgICB2YXIgcmVjdCA9IFN0cihwYXJhbXNbXCJjbGlwLXJlY3RcIl0pLnNwbGl0KHNlcGFyYXRvcik7XG4gICAgICAgICAgICBpZiAocmVjdC5sZW5ndGggPT0gNCkge1xuICAgICAgICAgICAgICAgIHJlY3RbMl0gPSArcmVjdFsyXSArICgrcmVjdFswXSk7XG4gICAgICAgICAgICAgICAgcmVjdFszXSA9ICtyZWN0WzNdICsgKCtyZWN0WzFdKTtcbiAgICAgICAgICAgICAgICB2YXIgZGl2ID0gbm9kZS5jbGlwUmVjdCB8fCBSLl9nLmRvYy5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLFxuICAgICAgICAgICAgICAgICAgICBkc3R5bGUgPSBkaXYuc3R5bGU7XG4gICAgICAgICAgICAgICAgZHN0eWxlLmNsaXAgPSBSLmZvcm1hdChcInJlY3QoezF9cHggezJ9cHggezN9cHggezB9cHgpXCIsIHJlY3QpO1xuICAgICAgICAgICAgICAgIGlmICghbm9kZS5jbGlwUmVjdCkge1xuICAgICAgICAgICAgICAgICAgICBkc3R5bGUucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG4gICAgICAgICAgICAgICAgICAgIGRzdHlsZS50b3AgPSAwO1xuICAgICAgICAgICAgICAgICAgICBkc3R5bGUubGVmdCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGRzdHlsZS53aWR0aCA9IG8ucGFwZXIud2lkdGggKyBcInB4XCI7XG4gICAgICAgICAgICAgICAgICAgIGRzdHlsZS5oZWlnaHQgPSBvLnBhcGVyLmhlaWdodCArIFwicHhcIjtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5wYXJlbnROb2RlLmluc2VydEJlZm9yZShkaXYsIG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICBkaXYuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIG5vZGUuY2xpcFJlY3QgPSBkaXY7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFwYXJhbXNbXCJjbGlwLXJlY3RcIl0pIHtcbiAgICAgICAgICAgICAgICBub2RlLmNsaXBSZWN0ICYmIChub2RlLmNsaXBSZWN0LnN0eWxlLmNsaXAgPSBcImF1dG9cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG8udGV4dHBhdGgpIHtcbiAgICAgICAgICAgIHZhciB0ZXh0cGF0aFN0eWxlID0gby50ZXh0cGF0aC5zdHlsZTtcbiAgICAgICAgICAgIHBhcmFtcy5mb250ICYmICh0ZXh0cGF0aFN0eWxlLmZvbnQgPSBwYXJhbXMuZm9udCk7XG4gICAgICAgICAgICBwYXJhbXNbXCJmb250LWZhbWlseVwiXSAmJiAodGV4dHBhdGhTdHlsZS5mb250RmFtaWx5ID0gJ1wiJyArIHBhcmFtc1tcImZvbnQtZmFtaWx5XCJdLnNwbGl0KFwiLFwiKVswXS5yZXBsYWNlKC9eWydcIl0rfFsnXCJdKyQvZywgRSkgKyAnXCInKTtcbiAgICAgICAgICAgIHBhcmFtc1tcImZvbnQtc2l6ZVwiXSAmJiAodGV4dHBhdGhTdHlsZS5mb250U2l6ZSA9IHBhcmFtc1tcImZvbnQtc2l6ZVwiXSk7XG4gICAgICAgICAgICBwYXJhbXNbXCJmb250LXdlaWdodFwiXSAmJiAodGV4dHBhdGhTdHlsZS5mb250V2VpZ2h0ID0gcGFyYW1zW1wiZm9udC13ZWlnaHRcIl0pO1xuICAgICAgICAgICAgcGFyYW1zW1wiZm9udC1zdHlsZVwiXSAmJiAodGV4dHBhdGhTdHlsZS5mb250U3R5bGUgPSBwYXJhbXNbXCJmb250LXN0eWxlXCJdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoXCJhcnJvdy1zdGFydFwiIGluIHBhcmFtcykge1xuICAgICAgICAgICAgYWRkQXJyb3cocmVzLCBwYXJhbXNbXCJhcnJvdy1zdGFydFwiXSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKFwiYXJyb3ctZW5kXCIgaW4gcGFyYW1zKSB7XG4gICAgICAgICAgICBhZGRBcnJvdyhyZXMsIHBhcmFtc1tcImFycm93LWVuZFwiXSwgMSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhcmFtcy5vcGFjaXR5ICE9IG51bGwgfHwgXG4gICAgICAgICAgICBwYXJhbXNbXCJzdHJva2Utd2lkdGhcIl0gIT0gbnVsbCB8fFxuICAgICAgICAgICAgcGFyYW1zLmZpbGwgIT0gbnVsbCB8fFxuICAgICAgICAgICAgcGFyYW1zLnNyYyAhPSBudWxsIHx8XG4gICAgICAgICAgICBwYXJhbXMuc3Ryb2tlICE9IG51bGwgfHxcbiAgICAgICAgICAgIHBhcmFtc1tcInN0cm9rZS13aWR0aFwiXSAhPSBudWxsIHx8XG4gICAgICAgICAgICBwYXJhbXNbXCJzdHJva2Utb3BhY2l0eVwiXSAhPSBudWxsIHx8XG4gICAgICAgICAgICBwYXJhbXNbXCJmaWxsLW9wYWNpdHlcIl0gIT0gbnVsbCB8fFxuICAgICAgICAgICAgcGFyYW1zW1wic3Ryb2tlLWRhc2hhcnJheVwiXSAhPSBudWxsIHx8XG4gICAgICAgICAgICBwYXJhbXNbXCJzdHJva2UtbWl0ZXJsaW1pdFwiXSAhPSBudWxsIHx8XG4gICAgICAgICAgICBwYXJhbXNbXCJzdHJva2UtbGluZWpvaW5cIl0gIT0gbnVsbCB8fFxuICAgICAgICAgICAgcGFyYW1zW1wic3Ryb2tlLWxpbmVjYXBcIl0gIT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIGZpbGwgPSBub2RlLmdldEVsZW1lbnRzQnlUYWdOYW1lKGZpbGxTdHJpbmcpLFxuICAgICAgICAgICAgICAgIG5ld2ZpbGwgPSBmYWxzZTtcbiAgICAgICAgICAgIGZpbGwgPSBmaWxsICYmIGZpbGxbMF07XG4gICAgICAgICAgICAhZmlsbCAmJiAobmV3ZmlsbCA9IGZpbGwgPSBjcmVhdGVOb2RlKGZpbGxTdHJpbmcpKTtcbiAgICAgICAgICAgIGlmIChvLnR5cGUgPT0gXCJpbWFnZVwiICYmIHBhcmFtcy5zcmMpIHtcbiAgICAgICAgICAgICAgICBmaWxsLnNyYyA9IHBhcmFtcy5zcmM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwYXJhbXMuZmlsbCAmJiAoZmlsbC5vbiA9IHRydWUpO1xuICAgICAgICAgICAgaWYgKGZpbGwub24gPT0gbnVsbCB8fCBwYXJhbXMuZmlsbCA9PSBcIm5vbmVcIiB8fCBwYXJhbXMuZmlsbCA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGZpbGwub24gPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChmaWxsLm9uICYmIHBhcmFtcy5maWxsKSB7XG4gICAgICAgICAgICAgICAgdmFyIGlzVVJMID0gU3RyKHBhcmFtcy5maWxsKS5tYXRjaChSLl9JU1VSTCk7XG4gICAgICAgICAgICAgICAgaWYgKGlzVVJMKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGwucGFyZW50Tm9kZSA9PSBub2RlICYmIG5vZGUucmVtb3ZlQ2hpbGQoZmlsbCk7XG4gICAgICAgICAgICAgICAgICAgIGZpbGwucm90YXRlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgZmlsbC5zcmMgPSBpc1VSTFsxXTtcbiAgICAgICAgICAgICAgICAgICAgZmlsbC50eXBlID0gXCJ0aWxlXCI7XG4gICAgICAgICAgICAgICAgICAgIHZhciBiYm94ID0gby5nZXRCQm94KDEpO1xuICAgICAgICAgICAgICAgICAgICBmaWxsLnBvc2l0aW9uID0gYmJveC54ICsgUyArIGJib3gueTtcbiAgICAgICAgICAgICAgICAgICAgby5fLmZpbGxwb3MgPSBbYmJveC54LCBiYm94LnldO1xuXG4gICAgICAgICAgICAgICAgICAgIFIuX3ByZWxvYWQoaXNVUkxbMV0sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG8uXy5maWxsc2l6ZSA9IFt0aGlzLm9mZnNldFdpZHRoLCB0aGlzLm9mZnNldEhlaWdodF07XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGwuY29sb3IgPSBSLmdldFJHQihwYXJhbXMuZmlsbCkuaGV4O1xuICAgICAgICAgICAgICAgICAgICBmaWxsLnNyYyA9IEU7XG4gICAgICAgICAgICAgICAgICAgIGZpbGwudHlwZSA9IFwic29saWRcIjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKFIuZ2V0UkdCKHBhcmFtcy5maWxsKS5lcnJvciAmJiAocmVzLnR5cGUgaW4ge2NpcmNsZTogMSwgZWxsaXBzZTogMX0gfHwgU3RyKHBhcmFtcy5maWxsKS5jaGFyQXQoKSAhPSBcInJcIikgJiYgYWRkR3JhZGllbnRGaWxsKHJlcywgcGFyYW1zLmZpbGwsIGZpbGwpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhLmZpbGwgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGEuZ3JhZGllbnQgPSBwYXJhbXMuZmlsbDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGwucm90YXRlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoXCJmaWxsLW9wYWNpdHlcIiBpbiBwYXJhbXMgfHwgXCJvcGFjaXR5XCIgaW4gcGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgdmFyIG9wYWNpdHkgPSAoKCthW1wiZmlsbC1vcGFjaXR5XCJdICsgMSB8fCAyKSAtIDEpICogKCgrYS5vcGFjaXR5ICsgMSB8fCAyKSAtIDEpICogKCgrUi5nZXRSR0IocGFyYW1zLmZpbGwpLm8gKyAxIHx8IDIpIC0gMSk7XG4gICAgICAgICAgICAgICAgb3BhY2l0eSA9IG1taW4obW1heChvcGFjaXR5LCAwKSwgMSk7XG4gICAgICAgICAgICAgICAgZmlsbC5vcGFjaXR5ID0gb3BhY2l0eTtcbiAgICAgICAgICAgICAgICBpZiAoZmlsbC5zcmMpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlsbC5jb2xvciA9IFwibm9uZVwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoZmlsbCk7XG4gICAgICAgICAgICB2YXIgc3Ryb2tlID0gKG5vZGUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoXCJzdHJva2VcIikgJiYgbm9kZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcInN0cm9rZVwiKVswXSksXG4gICAgICAgICAgICBuZXdzdHJva2UgPSBmYWxzZTtcbiAgICAgICAgICAgICFzdHJva2UgJiYgKG5ld3N0cm9rZSA9IHN0cm9rZSA9IGNyZWF0ZU5vZGUoXCJzdHJva2VcIikpO1xuICAgICAgICAgICAgaWYgKChwYXJhbXMuc3Ryb2tlICYmIHBhcmFtcy5zdHJva2UgIT0gXCJub25lXCIpIHx8XG4gICAgICAgICAgICAgICAgcGFyYW1zW1wic3Ryb2tlLXdpZHRoXCJdIHx8XG4gICAgICAgICAgICAgICAgcGFyYW1zW1wic3Ryb2tlLW9wYWNpdHlcIl0gIT0gbnVsbCB8fFxuICAgICAgICAgICAgICAgIHBhcmFtc1tcInN0cm9rZS1kYXNoYXJyYXlcIl0gfHxcbiAgICAgICAgICAgICAgICBwYXJhbXNbXCJzdHJva2UtbWl0ZXJsaW1pdFwiXSB8fFxuICAgICAgICAgICAgICAgIHBhcmFtc1tcInN0cm9rZS1saW5lam9pblwiXSB8fFxuICAgICAgICAgICAgICAgIHBhcmFtc1tcInN0cm9rZS1saW5lY2FwXCJdKSB7XG4gICAgICAgICAgICAgICAgc3Ryb2tlLm9uID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIChwYXJhbXMuc3Ryb2tlID09IFwibm9uZVwiIHx8IHBhcmFtcy5zdHJva2UgPT09IG51bGwgfHwgc3Ryb2tlLm9uID09IG51bGwgfHwgcGFyYW1zLnN0cm9rZSA9PSAwIHx8IHBhcmFtc1tcInN0cm9rZS13aWR0aFwiXSA9PSAwKSAmJiAoc3Ryb2tlLm9uID0gZmFsc2UpO1xuICAgICAgICAgICAgdmFyIHN0cm9rZUNvbG9yID0gUi5nZXRSR0IocGFyYW1zLnN0cm9rZSk7XG4gICAgICAgICAgICBzdHJva2Uub24gJiYgcGFyYW1zLnN0cm9rZSAmJiAoc3Ryb2tlLmNvbG9yID0gc3Ryb2tlQ29sb3IuaGV4KTtcbiAgICAgICAgICAgIG9wYWNpdHkgPSAoKCthW1wic3Ryb2tlLW9wYWNpdHlcIl0gKyAxIHx8IDIpIC0gMSkgKiAoKCthLm9wYWNpdHkgKyAxIHx8IDIpIC0gMSkgKiAoKCtzdHJva2VDb2xvci5vICsgMSB8fCAyKSAtIDEpO1xuICAgICAgICAgICAgdmFyIHdpZHRoID0gKHRvRmxvYXQocGFyYW1zW1wic3Ryb2tlLXdpZHRoXCJdKSB8fCAxKSAqIC43NTtcbiAgICAgICAgICAgIG9wYWNpdHkgPSBtbWluKG1tYXgob3BhY2l0eSwgMCksIDEpO1xuICAgICAgICAgICAgcGFyYW1zW1wic3Ryb2tlLXdpZHRoXCJdID09IG51bGwgJiYgKHdpZHRoID0gYVtcInN0cm9rZS13aWR0aFwiXSk7XG4gICAgICAgICAgICBwYXJhbXNbXCJzdHJva2Utd2lkdGhcIl0gJiYgKHN0cm9rZS53ZWlnaHQgPSB3aWR0aCk7XG4gICAgICAgICAgICB3aWR0aCAmJiB3aWR0aCA8IDEgJiYgKG9wYWNpdHkgKj0gd2lkdGgpICYmIChzdHJva2Uud2VpZ2h0ID0gMSk7XG4gICAgICAgICAgICBzdHJva2Uub3BhY2l0eSA9IG9wYWNpdHk7XG4gICAgICAgIFxuICAgICAgICAgICAgcGFyYW1zW1wic3Ryb2tlLWxpbmVqb2luXCJdICYmIChzdHJva2Uuam9pbnN0eWxlID0gcGFyYW1zW1wic3Ryb2tlLWxpbmVqb2luXCJdIHx8IFwibWl0ZXJcIik7XG4gICAgICAgICAgICBzdHJva2UubWl0ZXJsaW1pdCA9IHBhcmFtc1tcInN0cm9rZS1taXRlcmxpbWl0XCJdIHx8IDg7XG4gICAgICAgICAgICBwYXJhbXNbXCJzdHJva2UtbGluZWNhcFwiXSAmJiAoc3Ryb2tlLmVuZGNhcCA9IHBhcmFtc1tcInN0cm9rZS1saW5lY2FwXCJdID09IFwiYnV0dFwiID8gXCJmbGF0XCIgOiBwYXJhbXNbXCJzdHJva2UtbGluZWNhcFwiXSA9PSBcInNxdWFyZVwiID8gXCJzcXVhcmVcIiA6IFwicm91bmRcIik7XG4gICAgICAgICAgICBpZiAocGFyYW1zW1wic3Ryb2tlLWRhc2hhcnJheVwiXSkge1xuICAgICAgICAgICAgICAgIHZhciBkYXNoYXJyYXkgPSB7XG4gICAgICAgICAgICAgICAgICAgIFwiLVwiOiBcInNob3J0ZGFzaFwiLFxuICAgICAgICAgICAgICAgICAgICBcIi5cIjogXCJzaG9ydGRvdFwiLFxuICAgICAgICAgICAgICAgICAgICBcIi0uXCI6IFwic2hvcnRkYXNoZG90XCIsXG4gICAgICAgICAgICAgICAgICAgIFwiLS4uXCI6IFwic2hvcnRkYXNoZG90ZG90XCIsXG4gICAgICAgICAgICAgICAgICAgIFwiLiBcIjogXCJkb3RcIixcbiAgICAgICAgICAgICAgICAgICAgXCItIFwiOiBcImRhc2hcIixcbiAgICAgICAgICAgICAgICAgICAgXCItLVwiOiBcImxvbmdkYXNoXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiLSAuXCI6IFwiZGFzaGRvdFwiLFxuICAgICAgICAgICAgICAgICAgICBcIi0tLlwiOiBcImxvbmdkYXNoZG90XCIsXG4gICAgICAgICAgICAgICAgICAgIFwiLS0uLlwiOiBcImxvbmdkYXNoZG90ZG90XCJcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIHN0cm9rZS5kYXNoc3R5bGUgPSBkYXNoYXJyYXlbaGFzXShwYXJhbXNbXCJzdHJva2UtZGFzaGFycmF5XCJdKSA/IGRhc2hhcnJheVtwYXJhbXNbXCJzdHJva2UtZGFzaGFycmF5XCJdXSA6IEU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBuZXdzdHJva2UgJiYgbm9kZS5hcHBlbmRDaGlsZChzdHJva2UpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZXMudHlwZSA9PSBcInRleHRcIikge1xuICAgICAgICAgICAgcmVzLnBhcGVyLmNhbnZhcy5zdHlsZS5kaXNwbGF5ID0gRTtcbiAgICAgICAgICAgIHZhciBzcGFuID0gcmVzLnBhcGVyLnNwYW4sXG4gICAgICAgICAgICAgICAgbSA9IDEwMCxcbiAgICAgICAgICAgICAgICBmb250U2l6ZSA9IGEuZm9udCAmJiBhLmZvbnQubWF0Y2goL1xcZCsoPzpcXC5cXGQqKT8oPz1weCkvKTtcbiAgICAgICAgICAgIHMgPSBzcGFuLnN0eWxlO1xuICAgICAgICAgICAgYS5mb250ICYmIChzLmZvbnQgPSBhLmZvbnQpO1xuICAgICAgICAgICAgYVtcImZvbnQtZmFtaWx5XCJdICYmIChzLmZvbnRGYW1pbHkgPSBhW1wiZm9udC1mYW1pbHlcIl0pO1xuICAgICAgICAgICAgYVtcImZvbnQtd2VpZ2h0XCJdICYmIChzLmZvbnRXZWlnaHQgPSBhW1wiZm9udC13ZWlnaHRcIl0pO1xuICAgICAgICAgICAgYVtcImZvbnQtc3R5bGVcIl0gJiYgKHMuZm9udFN0eWxlID0gYVtcImZvbnQtc3R5bGVcIl0pO1xuICAgICAgICAgICAgZm9udFNpemUgPSB0b0Zsb2F0KGFbXCJmb250LXNpemVcIl0gfHwgZm9udFNpemUgJiYgZm9udFNpemVbMF0pIHx8IDEwO1xuICAgICAgICAgICAgcy5mb250U2l6ZSA9IGZvbnRTaXplICogbSArIFwicHhcIjtcbiAgICAgICAgICAgIHJlcy50ZXh0cGF0aC5zdHJpbmcgJiYgKHNwYW4uaW5uZXJIVE1MID0gU3RyKHJlcy50ZXh0cGF0aC5zdHJpbmcpLnJlcGxhY2UoLzwvZywgXCImIzYwO1wiKS5yZXBsYWNlKC8mL2csIFwiJiMzODtcIikucmVwbGFjZSgvXFxuL2csIFwiPGJyPlwiKSk7XG4gICAgICAgICAgICB2YXIgYnJlY3QgPSBzcGFuLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICAgICAgcmVzLlcgPSBhLncgPSAoYnJlY3QucmlnaHQgLSBicmVjdC5sZWZ0KSAvIG07XG4gICAgICAgICAgICByZXMuSCA9IGEuaCA9IChicmVjdC5ib3R0b20gLSBicmVjdC50b3ApIC8gbTtcbiAgICAgICAgICAgIC8vIHJlcy5wYXBlci5jYW52YXMuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICAgICAgcmVzLlggPSBhLng7XG4gICAgICAgICAgICByZXMuWSA9IGEueSArIHJlcy5IIC8gMjtcblxuICAgICAgICAgICAgKFwieFwiIGluIHBhcmFtcyB8fCBcInlcIiBpbiBwYXJhbXMpICYmIChyZXMucGF0aC52ID0gUi5mb3JtYXQoXCJtezB9LHsxfWx7Mn0sezF9XCIsIHJvdW5kKGEueCAqIHpvb20pLCByb3VuZChhLnkgKiB6b29tKSwgcm91bmQoYS54ICogem9vbSkgKyAxKSk7XG4gICAgICAgICAgICB2YXIgZGlydHlhdHRycyA9IFtcInhcIiwgXCJ5XCIsIFwidGV4dFwiLCBcImZvbnRcIiwgXCJmb250LWZhbWlseVwiLCBcImZvbnQtd2VpZ2h0XCIsIFwiZm9udC1zdHlsZVwiLCBcImZvbnQtc2l6ZVwiXTtcbiAgICAgICAgICAgIGZvciAodmFyIGQgPSAwLCBkZCA9IGRpcnR5YXR0cnMubGVuZ3RoOyBkIDwgZGQ7IGQrKykgaWYgKGRpcnR5YXR0cnNbZF0gaW4gcGFyYW1zKSB7XG4gICAgICAgICAgICAgICAgcmVzLl8uZGlydHkgPSAxO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgICAgIC8vIHRleHQtYW5jaG9yIGVtdWxhdGlvblxuICAgICAgICAgICAgc3dpdGNoIChhW1widGV4dC1hbmNob3JcIl0pIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwic3RhcnRcIjpcbiAgICAgICAgICAgICAgICAgICAgcmVzLnRleHRwYXRoLnN0eWxlW1widi10ZXh0LWFsaWduXCJdID0gXCJsZWZ0XCI7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5iYnggPSByZXMuVyAvIDI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSBcImVuZFwiOlxuICAgICAgICAgICAgICAgICAgICByZXMudGV4dHBhdGguc3R5bGVbXCJ2LXRleHQtYWxpZ25cIl0gPSBcInJpZ2h0XCI7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5iYnggPSAtcmVzLlcgLyAyO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHJlcy50ZXh0cGF0aC5zdHlsZVtcInYtdGV4dC1hbGlnblwiXSA9IFwiY2VudGVyXCI7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5iYnggPSAwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzLnRleHRwYXRoLnN0eWxlW1widi10ZXh0LWtlcm5cIl0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIHJlcy5wYXBlci5jYW52YXMuc3R5bGUuZGlzcGxheSA9IEU7XG4gICAgfSxcbiAgICBhZGRHcmFkaWVudEZpbGwgPSBmdW5jdGlvbiAobywgZ3JhZGllbnQsIGZpbGwpIHtcbiAgICAgICAgby5hdHRycyA9IG8uYXR0cnMgfHwge307XG4gICAgICAgIHZhciBhdHRycyA9IG8uYXR0cnMsXG4gICAgICAgICAgICBwb3cgPSBNYXRoLnBvdyxcbiAgICAgICAgICAgIG9wYWNpdHksXG4gICAgICAgICAgICBvaW5kZXgsXG4gICAgICAgICAgICB0eXBlID0gXCJsaW5lYXJcIixcbiAgICAgICAgICAgIGZ4ZnkgPSBcIi41IC41XCI7XG4gICAgICAgIG8uYXR0cnMuZ3JhZGllbnQgPSBncmFkaWVudDtcbiAgICAgICAgZ3JhZGllbnQgPSBTdHIoZ3JhZGllbnQpLnJlcGxhY2UoUi5fcmFkaWFsX2dyYWRpZW50LCBmdW5jdGlvbiAoYWxsLCBmeCwgZnkpIHtcbiAgICAgICAgICAgIHR5cGUgPSBcInJhZGlhbFwiO1xuICAgICAgICAgICAgaWYgKGZ4ICYmIGZ5KSB7XG4gICAgICAgICAgICAgICAgZnggPSB0b0Zsb2F0KGZ4KTtcbiAgICAgICAgICAgICAgICBmeSA9IHRvRmxvYXQoZnkpO1xuICAgICAgICAgICAgICAgIHBvdyhmeCAtIC41LCAyKSArIHBvdyhmeSAtIC41LCAyKSA+IC4yNSAmJiAoZnkgPSBtYXRoLnNxcnQoLjI1IC0gcG93KGZ4IC0gLjUsIDIpKSAqICgoZnkgPiAuNSkgKiAyIC0gMSkgKyAuNSk7XG4gICAgICAgICAgICAgICAgZnhmeSA9IGZ4ICsgUyArIGZ5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIEU7XG4gICAgICAgIH0pO1xuICAgICAgICBncmFkaWVudCA9IGdyYWRpZW50LnNwbGl0KC9cXHMqXFwtXFxzKi8pO1xuICAgICAgICBpZiAodHlwZSA9PSBcImxpbmVhclwiKSB7XG4gICAgICAgICAgICB2YXIgYW5nbGUgPSBncmFkaWVudC5zaGlmdCgpO1xuICAgICAgICAgICAgYW5nbGUgPSAtdG9GbG9hdChhbmdsZSk7XG4gICAgICAgICAgICBpZiAoaXNOYU4oYW5nbGUpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGRvdHMgPSBSLl9wYXJzZURvdHMoZ3JhZGllbnQpO1xuICAgICAgICBpZiAoIWRvdHMpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIG8gPSBvLnNoYXBlIHx8IG8ubm9kZTtcbiAgICAgICAgaWYgKGRvdHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBvLnJlbW92ZUNoaWxkKGZpbGwpO1xuICAgICAgICAgICAgZmlsbC5vbiA9IHRydWU7XG4gICAgICAgICAgICBmaWxsLm1ldGhvZCA9IFwibm9uZVwiO1xuICAgICAgICAgICAgZmlsbC5jb2xvciA9IGRvdHNbMF0uY29sb3I7XG4gICAgICAgICAgICBmaWxsLmNvbG9yMiA9IGRvdHNbZG90cy5sZW5ndGggLSAxXS5jb2xvcjtcbiAgICAgICAgICAgIHZhciBjbHJzID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBkb3RzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBkb3RzW2ldLm9mZnNldCAmJiBjbHJzLnB1c2goZG90c1tpXS5vZmZzZXQgKyBTICsgZG90c1tpXS5jb2xvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmaWxsLmNvbG9ycyA9IGNscnMubGVuZ3RoID8gY2xycy5qb2luKCkgOiBcIjAlIFwiICsgZmlsbC5jb2xvcjtcbiAgICAgICAgICAgIGlmICh0eXBlID09IFwicmFkaWFsXCIpIHtcbiAgICAgICAgICAgICAgICBmaWxsLnR5cGUgPSBcImdyYWRpZW50VGl0bGVcIjtcbiAgICAgICAgICAgICAgICBmaWxsLmZvY3VzID0gXCIxMDAlXCI7XG4gICAgICAgICAgICAgICAgZmlsbC5mb2N1c3NpemUgPSBcIjAgMFwiO1xuICAgICAgICAgICAgICAgIGZpbGwuZm9jdXNwb3NpdGlvbiA9IGZ4Znk7XG4gICAgICAgICAgICAgICAgZmlsbC5hbmdsZSA9IDA7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGZpbGwucm90YXRlPSB0cnVlO1xuICAgICAgICAgICAgICAgIGZpbGwudHlwZSA9IFwiZ3JhZGllbnRcIjtcbiAgICAgICAgICAgICAgICBmaWxsLmFuZ2xlID0gKDI3MCAtIGFuZ2xlKSAlIDM2MDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG8uYXBwZW5kQ2hpbGQoZmlsbCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIDE7XG4gICAgfSxcbiAgICBFbGVtZW50ID0gZnVuY3Rpb24gKG5vZGUsIHZtbCkge1xuICAgICAgICB0aGlzWzBdID0gdGhpcy5ub2RlID0gbm9kZTtcbiAgICAgICAgbm9kZS5yYXBoYWVsID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5pZCA9IFIuX29pZCsrO1xuICAgICAgICBub2RlLnJhcGhhZWxpZCA9IHRoaXMuaWQ7XG4gICAgICAgIHRoaXMuWCA9IDA7XG4gICAgICAgIHRoaXMuWSA9IDA7XG4gICAgICAgIHRoaXMuYXR0cnMgPSB7fTtcbiAgICAgICAgdGhpcy5wYXBlciA9IHZtbDtcbiAgICAgICAgdGhpcy5tYXRyaXggPSBSLm1hdHJpeCgpO1xuICAgICAgICB0aGlzLl8gPSB7XG4gICAgICAgICAgICB0cmFuc2Zvcm06IFtdLFxuICAgICAgICAgICAgc3g6IDEsXG4gICAgICAgICAgICBzeTogMSxcbiAgICAgICAgICAgIGR4OiAwLFxuICAgICAgICAgICAgZHk6IDAsXG4gICAgICAgICAgICBkZWc6IDAsXG4gICAgICAgICAgICBkaXJ0eTogMSxcbiAgICAgICAgICAgIGRpcnR5VDogMVxuICAgICAgICB9O1xuICAgICAgICAhdm1sLmJvdHRvbSAmJiAodm1sLmJvdHRvbSA9IHRoaXMpO1xuICAgICAgICB0aGlzLnByZXYgPSB2bWwudG9wO1xuICAgICAgICB2bWwudG9wICYmICh2bWwudG9wLm5leHQgPSB0aGlzKTtcbiAgICAgICAgdm1sLnRvcCA9IHRoaXM7XG4gICAgICAgIHRoaXMubmV4dCA9IG51bGw7XG4gICAgfTtcbiAgICB2YXIgZWxwcm90byA9IFIuZWw7XG5cbiAgICBFbGVtZW50LnByb3RvdHlwZSA9IGVscHJvdG87XG4gICAgZWxwcm90by5jb25zdHJ1Y3RvciA9IEVsZW1lbnQ7XG4gICAgZWxwcm90by50cmFuc2Zvcm0gPSBmdW5jdGlvbiAodHN0cikge1xuICAgICAgICBpZiAodHN0ciA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fLnRyYW5zZm9ybTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdmJzID0gdGhpcy5wYXBlci5fdmlld0JveFNoaWZ0LFxuICAgICAgICAgICAgdmJ0ID0gdmJzID8gXCJzXCIgKyBbdmJzLnNjYWxlLCB2YnMuc2NhbGVdICsgXCItMS0xdFwiICsgW3Zicy5keCwgdmJzLmR5XSA6IEUsXG4gICAgICAgICAgICBvbGR0O1xuICAgICAgICBpZiAodmJzKSB7XG4gICAgICAgICAgICBvbGR0ID0gdHN0ciA9IFN0cih0c3RyKS5yZXBsYWNlKC9cXC57M318XFx1MjAyNi9nLCB0aGlzLl8udHJhbnNmb3JtIHx8IEUpO1xuICAgICAgICB9XG4gICAgICAgIFIuX2V4dHJhY3RUcmFuc2Zvcm0odGhpcywgdmJ0ICsgdHN0cik7XG4gICAgICAgIHZhciBtYXRyaXggPSB0aGlzLm1hdHJpeC5jbG9uZSgpLFxuICAgICAgICAgICAgc2tldyA9IHRoaXMuc2tldyxcbiAgICAgICAgICAgIG8gPSB0aGlzLm5vZGUsXG4gICAgICAgICAgICBzcGxpdCxcbiAgICAgICAgICAgIGlzR3JhZCA9IH5TdHIodGhpcy5hdHRycy5maWxsKS5pbmRleE9mKFwiLVwiKSxcbiAgICAgICAgICAgIGlzUGF0dCA9ICFTdHIodGhpcy5hdHRycy5maWxsKS5pbmRleE9mKFwidXJsKFwiKTtcbiAgICAgICAgbWF0cml4LnRyYW5zbGF0ZSgtLjUsIC0uNSk7XG4gICAgICAgIGlmIChpc1BhdHQgfHwgaXNHcmFkIHx8IHRoaXMudHlwZSA9PSBcImltYWdlXCIpIHtcbiAgICAgICAgICAgIHNrZXcubWF0cml4ID0gXCIxIDAgMCAxXCI7XG4gICAgICAgICAgICBza2V3Lm9mZnNldCA9IFwiMCAwXCI7XG4gICAgICAgICAgICBzcGxpdCA9IG1hdHJpeC5zcGxpdCgpO1xuICAgICAgICAgICAgaWYgKChpc0dyYWQgJiYgc3BsaXQubm9Sb3RhdGlvbikgfHwgIXNwbGl0LmlzU2ltcGxlKSB7XG4gICAgICAgICAgICAgICAgby5zdHlsZS5maWx0ZXIgPSBtYXRyaXgudG9GaWx0ZXIoKTtcbiAgICAgICAgICAgICAgICB2YXIgYmIgPSB0aGlzLmdldEJCb3goKSxcbiAgICAgICAgICAgICAgICAgICAgYmJ0ID0gdGhpcy5nZXRCQm94KDEpLFxuICAgICAgICAgICAgICAgICAgICBkeCA9IGJiLnggLSBiYnQueCxcbiAgICAgICAgICAgICAgICAgICAgZHkgPSBiYi55IC0gYmJ0Lnk7XG4gICAgICAgICAgICAgICAgby5jb29yZG9yaWdpbiA9IChkeCAqIC16b29tKSArIFMgKyAoZHkgKiAtem9vbSk7XG4gICAgICAgICAgICAgICAgc2V0Q29vcmRzKHRoaXMsIDEsIDEsIGR4LCBkeSwgMCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIG8uc3R5bGUuZmlsdGVyID0gRTtcbiAgICAgICAgICAgICAgICBzZXRDb29yZHModGhpcywgc3BsaXQuc2NhbGV4LCBzcGxpdC5zY2FsZXksIHNwbGl0LmR4LCBzcGxpdC5keSwgc3BsaXQucm90YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG8uc3R5bGUuZmlsdGVyID0gRTtcbiAgICAgICAgICAgIHNrZXcubWF0cml4ID0gU3RyKG1hdHJpeCk7XG4gICAgICAgICAgICBza2V3Lm9mZnNldCA9IG1hdHJpeC5vZmZzZXQoKTtcbiAgICAgICAgfVxuICAgICAgICBvbGR0ICYmICh0aGlzLl8udHJhbnNmb3JtID0gb2xkdCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgZWxwcm90by5yb3RhdGUgPSBmdW5jdGlvbiAoZGVnLCBjeCwgY3kpIHtcbiAgICAgICAgaWYgKHRoaXMucmVtb3ZlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRlZyA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZGVnID0gU3RyKGRlZykuc3BsaXQoc2VwYXJhdG9yKTtcbiAgICAgICAgaWYgKGRlZy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBjeCA9IHRvRmxvYXQoZGVnWzFdKTtcbiAgICAgICAgICAgIGN5ID0gdG9GbG9hdChkZWdbMl0pO1xuICAgICAgICB9XG4gICAgICAgIGRlZyA9IHRvRmxvYXQoZGVnWzBdKTtcbiAgICAgICAgKGN5ID09IG51bGwpICYmIChjeCA9IGN5KTtcbiAgICAgICAgaWYgKGN4ID09IG51bGwgfHwgY3kgPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIGJib3ggPSB0aGlzLmdldEJCb3goMSk7XG4gICAgICAgICAgICBjeCA9IGJib3gueCArIGJib3gud2lkdGggLyAyO1xuICAgICAgICAgICAgY3kgPSBiYm94LnkgKyBiYm94LmhlaWdodCAvIDI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fLmRpcnR5VCA9IDE7XG4gICAgICAgIHRoaXMudHJhbnNmb3JtKHRoaXMuXy50cmFuc2Zvcm0uY29uY2F0KFtbXCJyXCIsIGRlZywgY3gsIGN5XV0pKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBlbHByb3RvLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChkeCwgZHkpIHtcbiAgICAgICAgaWYgKHRoaXMucmVtb3ZlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgZHggPSBTdHIoZHgpLnNwbGl0KHNlcGFyYXRvcik7XG4gICAgICAgIGlmIChkeC5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBkeSA9IHRvRmxvYXQoZHhbMV0pO1xuICAgICAgICB9XG4gICAgICAgIGR4ID0gdG9GbG9hdChkeFswXSkgfHwgMDtcbiAgICAgICAgZHkgPSArZHkgfHwgMDtcbiAgICAgICAgaWYgKHRoaXMuXy5iYm94KSB7XG4gICAgICAgICAgICB0aGlzLl8uYmJveC54ICs9IGR4O1xuICAgICAgICAgICAgdGhpcy5fLmJib3gueSArPSBkeTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnRyYW5zZm9ybSh0aGlzLl8udHJhbnNmb3JtLmNvbmNhdChbW1widFwiLCBkeCwgZHldXSkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIGVscHJvdG8uc2NhbGUgPSBmdW5jdGlvbiAoc3gsIHN5LCBjeCwgY3kpIHtcbiAgICAgICAgaWYgKHRoaXMucmVtb3ZlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgc3ggPSBTdHIoc3gpLnNwbGl0KHNlcGFyYXRvcik7XG4gICAgICAgIGlmIChzeC5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBzeSA9IHRvRmxvYXQoc3hbMV0pO1xuICAgICAgICAgICAgY3ggPSB0b0Zsb2F0KHN4WzJdKTtcbiAgICAgICAgICAgIGN5ID0gdG9GbG9hdChzeFszXSk7XG4gICAgICAgICAgICBpc05hTihjeCkgJiYgKGN4ID0gbnVsbCk7XG4gICAgICAgICAgICBpc05hTihjeSkgJiYgKGN5ID0gbnVsbCk7XG4gICAgICAgIH1cbiAgICAgICAgc3ggPSB0b0Zsb2F0KHN4WzBdKTtcbiAgICAgICAgKHN5ID09IG51bGwpICYmIChzeSA9IHN4KTtcbiAgICAgICAgKGN5ID09IG51bGwpICYmIChjeCA9IGN5KTtcbiAgICAgICAgaWYgKGN4ID09IG51bGwgfHwgY3kgPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIGJib3ggPSB0aGlzLmdldEJCb3goMSk7XG4gICAgICAgIH1cbiAgICAgICAgY3ggPSBjeCA9PSBudWxsID8gYmJveC54ICsgYmJveC53aWR0aCAvIDIgOiBjeDtcbiAgICAgICAgY3kgPSBjeSA9PSBudWxsID8gYmJveC55ICsgYmJveC5oZWlnaHQgLyAyIDogY3k7XG4gICAgXG4gICAgICAgIHRoaXMudHJhbnNmb3JtKHRoaXMuXy50cmFuc2Zvcm0uY29uY2F0KFtbXCJzXCIsIHN4LCBzeSwgY3gsIGN5XV0pKTtcbiAgICAgICAgdGhpcy5fLmRpcnR5VCA9IDE7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgZWxwcm90by5oaWRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAhdGhpcy5yZW1vdmVkICYmICh0aGlzLm5vZGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBlbHByb3RvLnNob3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICF0aGlzLnJlbW92ZWQgJiYgKHRoaXMubm9kZS5zdHlsZS5kaXNwbGF5ID0gRSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgZWxwcm90by5fZ2V0QkJveCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMucmVtb3ZlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHt9O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiB0aGlzLlggKyAodGhpcy5iYnggfHwgMCkgLSB0aGlzLlcgLyAyLFxuICAgICAgICAgICAgeTogdGhpcy5ZIC0gdGhpcy5ILFxuICAgICAgICAgICAgd2lkdGg6IHRoaXMuVyxcbiAgICAgICAgICAgIGhlaWdodDogdGhpcy5IXG4gICAgICAgIH07XG4gICAgfTtcbiAgICBlbHByb3RvLnJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMucmVtb3ZlZCB8fCAhdGhpcy5ub2RlLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnBhcGVyLl9fc2V0X18gJiYgdGhpcy5wYXBlci5fX3NldF9fLmV4Y2x1ZGUodGhpcyk7XG4gICAgICAgIFIuZXZlLnVuYmluZChcInJhcGhhZWwuKi4qLlwiICsgdGhpcy5pZCk7XG4gICAgICAgIFIuX3RlYXIodGhpcywgdGhpcy5wYXBlcik7XG4gICAgICAgIHRoaXMubm9kZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMubm9kZSk7XG4gICAgICAgIHRoaXMuc2hhcGUgJiYgdGhpcy5zaGFwZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuc2hhcGUpO1xuICAgICAgICBmb3IgKHZhciBpIGluIHRoaXMpIHtcbiAgICAgICAgICAgIHRoaXNbaV0gPSB0eXBlb2YgdGhpc1tpXSA9PSBcImZ1bmN0aW9uXCIgPyBSLl9yZW1vdmVkRmFjdG9yeShpKSA6IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5yZW1vdmVkID0gdHJ1ZTtcbiAgICB9O1xuICAgIGVscHJvdG8uYXR0ciA9IGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSkge1xuICAgICAgICBpZiAodGhpcy5yZW1vdmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBpZiAobmFtZSA9PSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgcmVzID0ge307XG4gICAgICAgICAgICBmb3IgKHZhciBhIGluIHRoaXMuYXR0cnMpIGlmICh0aGlzLmF0dHJzW2hhc10oYSkpIHtcbiAgICAgICAgICAgICAgICByZXNbYV0gPSB0aGlzLmF0dHJzW2FdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmVzLmdyYWRpZW50ICYmIHJlcy5maWxsID09IFwibm9uZVwiICYmIChyZXMuZmlsbCA9IHJlcy5ncmFkaWVudCkgJiYgZGVsZXRlIHJlcy5ncmFkaWVudDtcbiAgICAgICAgICAgIHJlcy50cmFuc2Zvcm0gPSB0aGlzLl8udHJhbnNmb3JtO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWUgPT0gbnVsbCAmJiBSLmlzKG5hbWUsIFwic3RyaW5nXCIpKSB7XG4gICAgICAgICAgICBpZiAobmFtZSA9PSBmaWxsU3RyaW5nICYmIHRoaXMuYXR0cnMuZmlsbCA9PSBcIm5vbmVcIiAmJiB0aGlzLmF0dHJzLmdyYWRpZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXR0cnMuZ3JhZGllbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KHNlcGFyYXRvciksXG4gICAgICAgICAgICAgICAgb3V0ID0ge307XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBuYW1lcy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IG5hbWVzW2ldO1xuICAgICAgICAgICAgICAgIGlmIChuYW1lIGluIHRoaXMuYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0W25hbWVdID0gdGhpcy5hdHRyc1tuYW1lXTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKFIuaXModGhpcy5wYXBlci5jdXN0b21BdHRyaWJ1dGVzW25hbWVdLCBcImZ1bmN0aW9uXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dFtuYW1lXSA9IHRoaXMucGFwZXIuY3VzdG9tQXR0cmlidXRlc1tuYW1lXS5kZWY7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0W25hbWVdID0gUi5fYXZhaWxhYmxlQXR0cnNbbmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGlpIC0gMSA/IG91dCA6IG91dFtuYW1lc1swXV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuYXR0cnMgJiYgdmFsdWUgPT0gbnVsbCAmJiBSLmlzKG5hbWUsIFwiYXJyYXlcIikpIHtcbiAgICAgICAgICAgIG91dCA9IHt9O1xuICAgICAgICAgICAgZm9yIChpID0gMCwgaWkgPSBuYW1lLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBvdXRbbmFtZVtpXV0gPSB0aGlzLmF0dHIobmFtZVtpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb3V0O1xuICAgICAgICB9XG4gICAgICAgIHZhciBwYXJhbXM7XG4gICAgICAgIGlmICh2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAgICAgICBwYXJhbXMgPSB7fTtcbiAgICAgICAgICAgIHBhcmFtc1tuYW1lXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHZhbHVlID09IG51bGwgJiYgUi5pcyhuYW1lLCBcIm9iamVjdFwiKSAmJiAocGFyYW1zID0gbmFtZSk7XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBwYXJhbXMpIHtcbiAgICAgICAgICAgIGV2ZShcInJhcGhhZWwuYXR0ci5cIiArIGtleSArIFwiLlwiICsgdGhpcy5pZCwgdGhpcywgcGFyYW1zW2tleV0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYXJhbXMpIHtcbiAgICAgICAgICAgIGZvciAoa2V5IGluIHRoaXMucGFwZXIuY3VzdG9tQXR0cmlidXRlcykgaWYgKHRoaXMucGFwZXIuY3VzdG9tQXR0cmlidXRlc1toYXNdKGtleSkgJiYgcGFyYW1zW2hhc10oa2V5KSAmJiBSLmlzKHRoaXMucGFwZXIuY3VzdG9tQXR0cmlidXRlc1trZXldLCBcImZ1bmN0aW9uXCIpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhciA9IHRoaXMucGFwZXIuY3VzdG9tQXR0cmlidXRlc1trZXldLmFwcGx5KHRoaXMsIFtdLmNvbmNhdChwYXJhbXNba2V5XSkpO1xuICAgICAgICAgICAgICAgIHRoaXMuYXR0cnNba2V5XSA9IHBhcmFtc1trZXldO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIHN1YmtleSBpbiBwYXIpIGlmIChwYXJbaGFzXShzdWJrZXkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmFtc1tzdWJrZXldID0gcGFyW3N1YmtleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gdGhpcy5wYXBlci5jYW52YXMuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICAgICAgaWYgKHBhcmFtcy50ZXh0ICYmIHRoaXMudHlwZSA9PSBcInRleHRcIikge1xuICAgICAgICAgICAgICAgIHRoaXMudGV4dHBhdGguc3RyaW5nID0gcGFyYW1zLnRleHQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzZXRGaWxsQW5kU3Ryb2tlKHRoaXMsIHBhcmFtcyk7XG4gICAgICAgICAgICAvLyB0aGlzLnBhcGVyLmNhbnZhcy5zdHlsZS5kaXNwbGF5ID0gRTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIGVscHJvdG8udG9Gcm9udCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgIXRoaXMucmVtb3ZlZCAmJiB0aGlzLm5vZGUucGFyZW50Tm9kZS5hcHBlbmRDaGlsZCh0aGlzLm5vZGUpO1xuICAgICAgICB0aGlzLnBhcGVyICYmIHRoaXMucGFwZXIudG9wICE9IHRoaXMgJiYgUi5fdG9mcm9udCh0aGlzLCB0aGlzLnBhcGVyKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBlbHByb3RvLnRvQmFjayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMucmVtb3ZlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMubm9kZS5wYXJlbnROb2RlLmZpcnN0Q2hpbGQgIT0gdGhpcy5ub2RlKSB7XG4gICAgICAgICAgICB0aGlzLm5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5ub2RlLCB0aGlzLm5vZGUucGFyZW50Tm9kZS5maXJzdENoaWxkKTtcbiAgICAgICAgICAgIFIuX3RvYmFjayh0aGlzLCB0aGlzLnBhcGVyKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIGVscHJvdG8uaW5zZXJ0QWZ0ZXIgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICBpZiAodGhpcy5yZW1vdmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZWxlbWVudC5jb25zdHJ1Y3RvciA9PSBSLnN0LmNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudFtlbGVtZW50Lmxlbmd0aCAtIDFdO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbGVtZW50Lm5vZGUubmV4dFNpYmxpbmcpIHtcbiAgICAgICAgICAgIGVsZW1lbnQubm9kZS5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLm5vZGUsIGVsZW1lbnQubm9kZS5uZXh0U2libGluZyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbGVtZW50Lm5vZGUucGFyZW50Tm9kZS5hcHBlbmRDaGlsZCh0aGlzLm5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIFIuX2luc2VydGFmdGVyKHRoaXMsIGVsZW1lbnQsIHRoaXMucGFwZXIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIGVscHJvdG8uaW5zZXJ0QmVmb3JlID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgaWYgKHRoaXMucmVtb3ZlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVsZW1lbnQuY29uc3RydWN0b3IgPT0gUi5zdC5jb25zdHJ1Y3Rvcikge1xuICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnRbMF07XG4gICAgICAgIH1cbiAgICAgICAgZWxlbWVudC5ub2RlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubm9kZSwgZWxlbWVudC5ub2RlKTtcbiAgICAgICAgUi5faW5zZXJ0YmVmb3JlKHRoaXMsIGVsZW1lbnQsIHRoaXMucGFwZXIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIGVscHJvdG8uYmx1ciA9IGZ1bmN0aW9uIChzaXplKSB7XG4gICAgICAgIHZhciBzID0gdGhpcy5ub2RlLnJ1bnRpbWVTdHlsZSxcbiAgICAgICAgICAgIGYgPSBzLmZpbHRlcjtcbiAgICAgICAgZiA9IGYucmVwbGFjZShibHVycmVnZXhwLCBFKTtcbiAgICAgICAgaWYgKCtzaXplICE9PSAwKSB7XG4gICAgICAgICAgICB0aGlzLmF0dHJzLmJsdXIgPSBzaXplO1xuICAgICAgICAgICAgcy5maWx0ZXIgPSBmICsgUyArIG1zICsgXCIuQmx1cihwaXhlbHJhZGl1cz1cIiArICgrc2l6ZSB8fCAxLjUpICsgXCIpXCI7XG4gICAgICAgICAgICBzLm1hcmdpbiA9IFIuZm9ybWF0KFwiLXswfXB4IDAgMCAtezB9cHhcIiwgcm91bmQoK3NpemUgfHwgMS41KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzLmZpbHRlciA9IGY7XG4gICAgICAgICAgICBzLm1hcmdpbiA9IDA7XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5hdHRycy5ibHVyO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIFIuX2VuZ2luZS5wYXRoID0gZnVuY3Rpb24gKHBhdGhTdHJpbmcsIHZtbCkge1xuICAgICAgICB2YXIgZWwgPSBjcmVhdGVOb2RlKFwic2hhcGVcIik7XG4gICAgICAgIGVsLnN0eWxlLmNzc1RleHQgPSBjc3NEb3Q7XG4gICAgICAgIGVsLmNvb3Jkc2l6ZSA9IHpvb20gKyBTICsgem9vbTtcbiAgICAgICAgZWwuY29vcmRvcmlnaW4gPSB2bWwuY29vcmRvcmlnaW47XG4gICAgICAgIHZhciBwID0gbmV3IEVsZW1lbnQoZWwsIHZtbCksXG4gICAgICAgICAgICBhdHRyID0ge2ZpbGw6IFwibm9uZVwiLCBzdHJva2U6IFwiIzAwMFwifTtcbiAgICAgICAgcGF0aFN0cmluZyAmJiAoYXR0ci5wYXRoID0gcGF0aFN0cmluZyk7XG4gICAgICAgIHAudHlwZSA9IFwicGF0aFwiO1xuICAgICAgICBwLnBhdGggPSBbXTtcbiAgICAgICAgcC5QYXRoID0gRTtcbiAgICAgICAgc2V0RmlsbEFuZFN0cm9rZShwLCBhdHRyKTtcbiAgICAgICAgdm1sLmNhbnZhcy5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgIHZhciBza2V3ID0gY3JlYXRlTm9kZShcInNrZXdcIik7XG4gICAgICAgIHNrZXcub24gPSB0cnVlO1xuICAgICAgICBlbC5hcHBlbmRDaGlsZChza2V3KTtcbiAgICAgICAgcC5za2V3ID0gc2tldztcbiAgICAgICAgcC50cmFuc2Zvcm0oRSk7XG4gICAgICAgIHJldHVybiBwO1xuICAgIH07XG4gICAgUi5fZW5naW5lLnJlY3QgPSBmdW5jdGlvbiAodm1sLCB4LCB5LCB3LCBoLCByKSB7XG4gICAgICAgIHZhciBwYXRoID0gUi5fcmVjdFBhdGgoeCwgeSwgdywgaCwgciksXG4gICAgICAgICAgICByZXMgPSB2bWwucGF0aChwYXRoKSxcbiAgICAgICAgICAgIGEgPSByZXMuYXR0cnM7XG4gICAgICAgIHJlcy5YID0gYS54ID0geDtcbiAgICAgICAgcmVzLlkgPSBhLnkgPSB5O1xuICAgICAgICByZXMuVyA9IGEud2lkdGggPSB3O1xuICAgICAgICByZXMuSCA9IGEuaGVpZ2h0ID0gaDtcbiAgICAgICAgYS5yID0gcjtcbiAgICAgICAgYS5wYXRoID0gcGF0aDtcbiAgICAgICAgcmVzLnR5cGUgPSBcInJlY3RcIjtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9O1xuICAgIFIuX2VuZ2luZS5lbGxpcHNlID0gZnVuY3Rpb24gKHZtbCwgeCwgeSwgcngsIHJ5KSB7XG4gICAgICAgIHZhciByZXMgPSB2bWwucGF0aCgpLFxuICAgICAgICAgICAgYSA9IHJlcy5hdHRycztcbiAgICAgICAgcmVzLlggPSB4IC0gcng7XG4gICAgICAgIHJlcy5ZID0geSAtIHJ5O1xuICAgICAgICByZXMuVyA9IHJ4ICogMjtcbiAgICAgICAgcmVzLkggPSByeSAqIDI7XG4gICAgICAgIHJlcy50eXBlID0gXCJlbGxpcHNlXCI7XG4gICAgICAgIHNldEZpbGxBbmRTdHJva2UocmVzLCB7XG4gICAgICAgICAgICBjeDogeCxcbiAgICAgICAgICAgIGN5OiB5LFxuICAgICAgICAgICAgcng6IHJ4LFxuICAgICAgICAgICAgcnk6IHJ5XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH07XG4gICAgUi5fZW5naW5lLmNpcmNsZSA9IGZ1bmN0aW9uICh2bWwsIHgsIHksIHIpIHtcbiAgICAgICAgdmFyIHJlcyA9IHZtbC5wYXRoKCksXG4gICAgICAgICAgICBhID0gcmVzLmF0dHJzO1xuICAgICAgICByZXMuWCA9IHggLSByO1xuICAgICAgICByZXMuWSA9IHkgLSByO1xuICAgICAgICByZXMuVyA9IHJlcy5IID0gciAqIDI7XG4gICAgICAgIHJlcy50eXBlID0gXCJjaXJjbGVcIjtcbiAgICAgICAgc2V0RmlsbEFuZFN0cm9rZShyZXMsIHtcbiAgICAgICAgICAgIGN4OiB4LFxuICAgICAgICAgICAgY3k6IHksXG4gICAgICAgICAgICByOiByXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH07XG4gICAgUi5fZW5naW5lLmltYWdlID0gZnVuY3Rpb24gKHZtbCwgc3JjLCB4LCB5LCB3LCBoKSB7XG4gICAgICAgIHZhciBwYXRoID0gUi5fcmVjdFBhdGgoeCwgeSwgdywgaCksXG4gICAgICAgICAgICByZXMgPSB2bWwucGF0aChwYXRoKS5hdHRyKHtzdHJva2U6IFwibm9uZVwifSksXG4gICAgICAgICAgICBhID0gcmVzLmF0dHJzLFxuICAgICAgICAgICAgbm9kZSA9IHJlcy5ub2RlLFxuICAgICAgICAgICAgZmlsbCA9IG5vZGUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoZmlsbFN0cmluZylbMF07XG4gICAgICAgIGEuc3JjID0gc3JjO1xuICAgICAgICByZXMuWCA9IGEueCA9IHg7XG4gICAgICAgIHJlcy5ZID0gYS55ID0geTtcbiAgICAgICAgcmVzLlcgPSBhLndpZHRoID0gdztcbiAgICAgICAgcmVzLkggPSBhLmhlaWdodCA9IGg7XG4gICAgICAgIGEucGF0aCA9IHBhdGg7XG4gICAgICAgIHJlcy50eXBlID0gXCJpbWFnZVwiO1xuICAgICAgICBmaWxsLnBhcmVudE5vZGUgPT0gbm9kZSAmJiBub2RlLnJlbW92ZUNoaWxkKGZpbGwpO1xuICAgICAgICBmaWxsLnJvdGF0ZSA9IHRydWU7XG4gICAgICAgIGZpbGwuc3JjID0gc3JjO1xuICAgICAgICBmaWxsLnR5cGUgPSBcInRpbGVcIjtcbiAgICAgICAgcmVzLl8uZmlsbHBvcyA9IFt4LCB5XTtcbiAgICAgICAgcmVzLl8uZmlsbHNpemUgPSBbdywgaF07XG4gICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQoZmlsbCk7XG4gICAgICAgIHNldENvb3JkcyhyZXMsIDEsIDEsIDAsIDAsIDApO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH07XG4gICAgUi5fZW5naW5lLnRleHQgPSBmdW5jdGlvbiAodm1sLCB4LCB5LCB0ZXh0KSB7XG4gICAgICAgIHZhciBlbCA9IGNyZWF0ZU5vZGUoXCJzaGFwZVwiKSxcbiAgICAgICAgICAgIHBhdGggPSBjcmVhdGVOb2RlKFwicGF0aFwiKSxcbiAgICAgICAgICAgIG8gPSBjcmVhdGVOb2RlKFwidGV4dHBhdGhcIik7XG4gICAgICAgIHggPSB4IHx8IDA7XG4gICAgICAgIHkgPSB5IHx8IDA7XG4gICAgICAgIHRleHQgPSB0ZXh0IHx8IFwiXCI7XG4gICAgICAgIHBhdGgudiA9IFIuZm9ybWF0KFwibXswfSx7MX1sezJ9LHsxfVwiLCByb3VuZCh4ICogem9vbSksIHJvdW5kKHkgKiB6b29tKSwgcm91bmQoeCAqIHpvb20pICsgMSk7XG4gICAgICAgIHBhdGgudGV4dHBhdGhvayA9IHRydWU7XG4gICAgICAgIG8uc3RyaW5nID0gU3RyKHRleHQpO1xuICAgICAgICBvLm9uID0gdHJ1ZTtcbiAgICAgICAgZWwuc3R5bGUuY3NzVGV4dCA9IGNzc0RvdDtcbiAgICAgICAgZWwuY29vcmRzaXplID0gem9vbSArIFMgKyB6b29tO1xuICAgICAgICBlbC5jb29yZG9yaWdpbiA9IFwiMCAwXCI7XG4gICAgICAgIHZhciBwID0gbmV3IEVsZW1lbnQoZWwsIHZtbCksXG4gICAgICAgICAgICBhdHRyID0ge1xuICAgICAgICAgICAgICAgIGZpbGw6IFwiIzAwMFwiLFxuICAgICAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCIsXG4gICAgICAgICAgICAgICAgZm9udDogUi5fYXZhaWxhYmxlQXR0cnMuZm9udCxcbiAgICAgICAgICAgICAgICB0ZXh0OiB0ZXh0XG4gICAgICAgICAgICB9O1xuICAgICAgICBwLnNoYXBlID0gZWw7XG4gICAgICAgIHAucGF0aCA9IHBhdGg7XG4gICAgICAgIHAudGV4dHBhdGggPSBvO1xuICAgICAgICBwLnR5cGUgPSBcInRleHRcIjtcbiAgICAgICAgcC5hdHRycy50ZXh0ID0gU3RyKHRleHQpO1xuICAgICAgICBwLmF0dHJzLnggPSB4O1xuICAgICAgICBwLmF0dHJzLnkgPSB5O1xuICAgICAgICBwLmF0dHJzLncgPSAxO1xuICAgICAgICBwLmF0dHJzLmggPSAxO1xuICAgICAgICBzZXRGaWxsQW5kU3Ryb2tlKHAsIGF0dHIpO1xuICAgICAgICBlbC5hcHBlbmRDaGlsZChvKTtcbiAgICAgICAgZWwuYXBwZW5kQ2hpbGQocGF0aCk7XG4gICAgICAgIHZtbC5jYW52YXMuYXBwZW5kQ2hpbGQoZWwpO1xuICAgICAgICB2YXIgc2tldyA9IGNyZWF0ZU5vZGUoXCJza2V3XCIpO1xuICAgICAgICBza2V3Lm9uID0gdHJ1ZTtcbiAgICAgICAgZWwuYXBwZW5kQ2hpbGQoc2tldyk7XG4gICAgICAgIHAuc2tldyA9IHNrZXc7XG4gICAgICAgIHAudHJhbnNmb3JtKEUpO1xuICAgICAgICByZXR1cm4gcDtcbiAgICB9O1xuICAgIFIuX2VuZ2luZS5zZXRTaXplID0gZnVuY3Rpb24gKHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgdmFyIGNzID0gdGhpcy5jYW52YXMuc3R5bGU7XG4gICAgICAgIHRoaXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHdpZHRoID09ICt3aWR0aCAmJiAod2lkdGggKz0gXCJweFwiKTtcbiAgICAgICAgaGVpZ2h0ID09ICtoZWlnaHQgJiYgKGhlaWdodCArPSBcInB4XCIpO1xuICAgICAgICBjcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICBjcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIGNzLmNsaXAgPSBcInJlY3QoMCBcIiArIHdpZHRoICsgXCIgXCIgKyBoZWlnaHQgKyBcIiAwKVwiO1xuICAgICAgICBpZiAodGhpcy5fdmlld0JveCkge1xuICAgICAgICAgICAgUi5fZW5naW5lLnNldFZpZXdCb3guYXBwbHkodGhpcywgdGhpcy5fdmlld0JveCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBSLl9lbmdpbmUuc2V0Vmlld0JveCA9IGZ1bmN0aW9uICh4LCB5LCB3LCBoLCBmaXQpIHtcbiAgICAgICAgUi5ldmUoXCJyYXBoYWVsLnNldFZpZXdCb3hcIiwgdGhpcywgdGhpcy5fdmlld0JveCwgW3gsIHksIHcsIGgsIGZpdF0pO1xuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLndpZHRoLFxuICAgICAgICAgICAgaGVpZ2h0ID0gdGhpcy5oZWlnaHQsXG4gICAgICAgICAgICBzaXplID0gMSAvIG1tYXgodyAvIHdpZHRoLCBoIC8gaGVpZ2h0KSxcbiAgICAgICAgICAgIEgsIFc7XG4gICAgICAgIGlmIChmaXQpIHtcbiAgICAgICAgICAgIEggPSBoZWlnaHQgLyBoO1xuICAgICAgICAgICAgVyA9IHdpZHRoIC8gdztcbiAgICAgICAgICAgIGlmICh3ICogSCA8IHdpZHRoKSB7XG4gICAgICAgICAgICAgICAgeCAtPSAod2lkdGggLSB3ICogSCkgLyAyIC8gSDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChoICogVyA8IGhlaWdodCkge1xuICAgICAgICAgICAgICAgIHkgLT0gKGhlaWdodCAtIGggKiBXKSAvIDIgLyBXO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3ZpZXdCb3ggPSBbeCwgeSwgdywgaCwgISFmaXRdO1xuICAgICAgICB0aGlzLl92aWV3Qm94U2hpZnQgPSB7XG4gICAgICAgICAgICBkeDogLXgsXG4gICAgICAgICAgICBkeTogLXksXG4gICAgICAgICAgICBzY2FsZTogc2l6ZVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgICAgICBlbC50cmFuc2Zvcm0oXCIuLi5cIik7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIHZhciBjcmVhdGVOb2RlO1xuICAgIFIuX2VuZ2luZS5pbml0V2luID0gZnVuY3Rpb24gKHdpbikge1xuICAgICAgICAgICAgdmFyIGRvYyA9IHdpbi5kb2N1bWVudDtcbiAgICAgICAgICAgIGRvYy5jcmVhdGVTdHlsZVNoZWV0KCkuYWRkUnVsZShcIi5ydm1sXCIsIFwiYmVoYXZpb3I6dXJsKCNkZWZhdWx0I1ZNTClcIik7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICFkb2MubmFtZXNwYWNlcy5ydm1sICYmIGRvYy5uYW1lc3BhY2VzLmFkZChcInJ2bWxcIiwgXCJ1cm46c2NoZW1hcy1taWNyb3NvZnQtY29tOnZtbFwiKTtcbiAgICAgICAgICAgICAgICBjcmVhdGVOb2RlID0gZnVuY3Rpb24gKHRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRvYy5jcmVhdGVFbGVtZW50KCc8cnZtbDonICsgdGFnTmFtZSArICcgY2xhc3M9XCJydm1sXCI+Jyk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBjcmVhdGVOb2RlID0gZnVuY3Rpb24gKHRhZ05hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRvYy5jcmVhdGVFbGVtZW50KCc8JyArIHRhZ05hbWUgKyAnIHhtbG5zPVwidXJuOnNjaGVtYXMtbWljcm9zb2Z0LmNvbTp2bWxcIiBjbGFzcz1cInJ2bWxcIj4nKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIFIuX2VuZ2luZS5pbml0V2luKFIuX2cud2luKTtcbiAgICBSLl9lbmdpbmUuY3JlYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgY29uID0gUi5fZ2V0Q29udGFpbmVyLmFwcGx5KDAsIGFyZ3VtZW50cyksXG4gICAgICAgICAgICBjb250YWluZXIgPSBjb24uY29udGFpbmVyLFxuICAgICAgICAgICAgaGVpZ2h0ID0gY29uLmhlaWdodCxcbiAgICAgICAgICAgIHMsXG4gICAgICAgICAgICB3aWR0aCA9IGNvbi53aWR0aCxcbiAgICAgICAgICAgIHggPSBjb24ueCxcbiAgICAgICAgICAgIHkgPSBjb24ueTtcbiAgICAgICAgaWYgKCFjb250YWluZXIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlZNTCBjb250YWluZXIgbm90IGZvdW5kLlwiKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVzID0gbmV3IFIuX1BhcGVyLFxuICAgICAgICAgICAgYyA9IHJlcy5jYW52YXMgPSBSLl9nLmRvYy5jcmVhdGVFbGVtZW50KFwiZGl2XCIpLFxuICAgICAgICAgICAgY3MgPSBjLnN0eWxlO1xuICAgICAgICB4ID0geCB8fCAwO1xuICAgICAgICB5ID0geSB8fCAwO1xuICAgICAgICB3aWR0aCA9IHdpZHRoIHx8IDUxMjtcbiAgICAgICAgaGVpZ2h0ID0gaGVpZ2h0IHx8IDM0MjtcbiAgICAgICAgcmVzLndpZHRoID0gd2lkdGg7XG4gICAgICAgIHJlcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIHdpZHRoID09ICt3aWR0aCAmJiAod2lkdGggKz0gXCJweFwiKTtcbiAgICAgICAgaGVpZ2h0ID09ICtoZWlnaHQgJiYgKGhlaWdodCArPSBcInB4XCIpO1xuICAgICAgICByZXMuY29vcmRzaXplID0gem9vbSAqIDFlMyArIFMgKyB6b29tICogMWUzO1xuICAgICAgICByZXMuY29vcmRvcmlnaW4gPSBcIjAgMFwiO1xuICAgICAgICByZXMuc3BhbiA9IFIuX2cuZG9jLmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xuICAgICAgICByZXMuc3Bhbi5zdHlsZS5jc3NUZXh0ID0gXCJwb3NpdGlvbjphYnNvbHV0ZTtsZWZ0Oi05OTk5ZW07dG9wOi05OTk5ZW07cGFkZGluZzowO21hcmdpbjowO2xpbmUtaGVpZ2h0OjE7XCI7XG4gICAgICAgIGMuYXBwZW5kQ2hpbGQocmVzLnNwYW4pO1xuICAgICAgICBjcy5jc3NUZXh0ID0gUi5mb3JtYXQoXCJ0b3A6MDtsZWZ0OjA7d2lkdGg6ezB9O2hlaWdodDp7MX07ZGlzcGxheTppbmxpbmUtYmxvY2s7cG9zaXRpb246cmVsYXRpdmU7Y2xpcDpyZWN0KDAgezB9IHsxfSAwKTtvdmVyZmxvdzpoaWRkZW5cIiwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIGlmIChjb250YWluZXIgPT0gMSkge1xuICAgICAgICAgICAgUi5fZy5kb2MuYm9keS5hcHBlbmRDaGlsZChjKTtcbiAgICAgICAgICAgIGNzLmxlZnQgPSB4ICsgXCJweFwiO1xuICAgICAgICAgICAgY3MudG9wID0geSArIFwicHhcIjtcbiAgICAgICAgICAgIGNzLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGNvbnRhaW5lci5maXJzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLmluc2VydEJlZm9yZShjLCBjb250YWluZXIuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChjKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXMucmVuZGVyZml4ID0gZnVuY3Rpb24gKCkge307XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcbiAgICBSLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgUi5ldmUoXCJyYXBoYWVsLmNsZWFyXCIsIHRoaXMpO1xuICAgICAgICB0aGlzLmNhbnZhcy5pbm5lckhUTUwgPSBFO1xuICAgICAgICB0aGlzLnNwYW4gPSBSLl9nLmRvYy5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcbiAgICAgICAgdGhpcy5zcGFuLnN0eWxlLmNzc1RleHQgPSBcInBvc2l0aW9uOmFic29sdXRlO2xlZnQ6LTk5OTllbTt0b3A6LTk5OTllbTtwYWRkaW5nOjA7bWFyZ2luOjA7bGluZS1oZWlnaHQ6MTtkaXNwbGF5OmlubGluZTtcIjtcbiAgICAgICAgdGhpcy5jYW52YXMuYXBwZW5kQ2hpbGQodGhpcy5zcGFuKTtcbiAgICAgICAgdGhpcy5ib3R0b20gPSB0aGlzLnRvcCA9IG51bGw7XG4gICAgfTtcbiAgICBSLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIFIuZXZlKFwicmFwaGFlbC5yZW1vdmVcIiwgdGhpcyk7XG4gICAgICAgIHRoaXMuY2FudmFzLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5jYW52YXMpO1xuICAgICAgICBmb3IgKHZhciBpIGluIHRoaXMpIHtcbiAgICAgICAgICAgIHRoaXNbaV0gPSB0eXBlb2YgdGhpc1tpXSA9PSBcImZ1bmN0aW9uXCIgPyBSLl9yZW1vdmVkRmFjdG9yeShpKSA6IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIHZhciBzZXRwcm90byA9IFIuc3Q7XG4gICAgZm9yICh2YXIgbWV0aG9kIGluIGVscHJvdG8pIGlmIChlbHByb3RvW2hhc10obWV0aG9kKSAmJiAhc2V0cHJvdG9baGFzXShtZXRob2QpKSB7XG4gICAgICAgIHNldHByb3RvW21ldGhvZF0gPSAoZnVuY3Rpb24gKG1ldGhvZG5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZyA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgICAgICAgICBlbFttZXRob2RuYW1lXS5hcHBseShlbCwgYXJnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pKG1ldGhvZCk7XG4gICAgfVxufShSYXBoYWVsKTtcblxuLy8gQlJPV1NFUklGWSBNT0Q6IGV4cG9ydCBSYXBoYWVsXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFJhcGhhZWw7XG59XG4iLCIvLyAgICAgVW5kZXJzY29yZS5qcyAxLjYuMFxuLy8gICAgIGh0dHA6Ly91bmRlcnNjb3JlanMub3JnXG4vLyAgICAgKGMpIDIwMDktMjAxNCBKZXJlbXkgQXNoa2VuYXMsIERvY3VtZW50Q2xvdWQgYW5kIEludmVzdGlnYXRpdmUgUmVwb3J0ZXJzICYgRWRpdG9yc1xuLy8gICAgIFVuZGVyc2NvcmUgbWF5IGJlIGZyZWVseSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2UuXG5cbihmdW5jdGlvbigpIHtcblxuICAvLyBCYXNlbGluZSBzZXR1cFxuICAvLyAtLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEVzdGFibGlzaCB0aGUgcm9vdCBvYmplY3QsIGB3aW5kb3dgIGluIHRoZSBicm93c2VyLCBvciBgZXhwb3J0c2Agb24gdGhlIHNlcnZlci5cbiAgdmFyIHJvb3QgPSB0aGlzO1xuXG4gIC8vIFNhdmUgdGhlIHByZXZpb3VzIHZhbHVlIG9mIHRoZSBgX2AgdmFyaWFibGUuXG4gIHZhciBwcmV2aW91c1VuZGVyc2NvcmUgPSByb290Ll87XG5cbiAgLy8gRXN0YWJsaXNoIHRoZSBvYmplY3QgdGhhdCBnZXRzIHJldHVybmVkIHRvIGJyZWFrIG91dCBvZiBhIGxvb3AgaXRlcmF0aW9uLlxuICB2YXIgYnJlYWtlciA9IHt9O1xuXG4gIC8vIFNhdmUgYnl0ZXMgaW4gdGhlIG1pbmlmaWVkIChidXQgbm90IGd6aXBwZWQpIHZlcnNpb246XG4gIHZhciBBcnJheVByb3RvID0gQXJyYXkucHJvdG90eXBlLCBPYmpQcm90byA9IE9iamVjdC5wcm90b3R5cGUsIEZ1bmNQcm90byA9IEZ1bmN0aW9uLnByb3RvdHlwZTtcblxuICAvLyBDcmVhdGUgcXVpY2sgcmVmZXJlbmNlIHZhcmlhYmxlcyBmb3Igc3BlZWQgYWNjZXNzIHRvIGNvcmUgcHJvdG90eXBlcy5cbiAgdmFyXG4gICAgcHVzaCAgICAgICAgICAgICA9IEFycmF5UHJvdG8ucHVzaCxcbiAgICBzbGljZSAgICAgICAgICAgID0gQXJyYXlQcm90by5zbGljZSxcbiAgICBjb25jYXQgICAgICAgICAgID0gQXJyYXlQcm90by5jb25jYXQsXG4gICAgdG9TdHJpbmcgICAgICAgICA9IE9ialByb3RvLnRvU3RyaW5nLFxuICAgIGhhc093blByb3BlcnR5ICAgPSBPYmpQcm90by5oYXNPd25Qcm9wZXJ0eTtcblxuICAvLyBBbGwgKipFQ01BU2NyaXB0IDUqKiBuYXRpdmUgZnVuY3Rpb24gaW1wbGVtZW50YXRpb25zIHRoYXQgd2UgaG9wZSB0byB1c2VcbiAgLy8gYXJlIGRlY2xhcmVkIGhlcmUuXG4gIHZhclxuICAgIG5hdGl2ZUZvckVhY2ggICAgICA9IEFycmF5UHJvdG8uZm9yRWFjaCxcbiAgICBuYXRpdmVNYXAgICAgICAgICAgPSBBcnJheVByb3RvLm1hcCxcbiAgICBuYXRpdmVSZWR1Y2UgICAgICAgPSBBcnJheVByb3RvLnJlZHVjZSxcbiAgICBuYXRpdmVSZWR1Y2VSaWdodCAgPSBBcnJheVByb3RvLnJlZHVjZVJpZ2h0LFxuICAgIG5hdGl2ZUZpbHRlciAgICAgICA9IEFycmF5UHJvdG8uZmlsdGVyLFxuICAgIG5hdGl2ZUV2ZXJ5ICAgICAgICA9IEFycmF5UHJvdG8uZXZlcnksXG4gICAgbmF0aXZlU29tZSAgICAgICAgID0gQXJyYXlQcm90by5zb21lLFxuICAgIG5hdGl2ZUluZGV4T2YgICAgICA9IEFycmF5UHJvdG8uaW5kZXhPZixcbiAgICBuYXRpdmVMYXN0SW5kZXhPZiAgPSBBcnJheVByb3RvLmxhc3RJbmRleE9mLFxuICAgIG5hdGl2ZUlzQXJyYXkgICAgICA9IEFycmF5LmlzQXJyYXksXG4gICAgbmF0aXZlS2V5cyAgICAgICAgID0gT2JqZWN0LmtleXMsXG4gICAgbmF0aXZlQmluZCAgICAgICAgID0gRnVuY1Byb3RvLmJpbmQ7XG5cbiAgLy8gQ3JlYXRlIGEgc2FmZSByZWZlcmVuY2UgdG8gdGhlIFVuZGVyc2NvcmUgb2JqZWN0IGZvciB1c2UgYmVsb3cuXG4gIHZhciBfID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiBpbnN0YW5jZW9mIF8pIHJldHVybiBvYmo7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIF8pKSByZXR1cm4gbmV3IF8ob2JqKTtcbiAgICB0aGlzLl93cmFwcGVkID0gb2JqO1xuICB9O1xuXG4gIC8vIEV4cG9ydCB0aGUgVW5kZXJzY29yZSBvYmplY3QgZm9yICoqTm9kZS5qcyoqLCB3aXRoXG4gIC8vIGJhY2t3YXJkcy1jb21wYXRpYmlsaXR5IGZvciB0aGUgb2xkIGByZXF1aXJlKClgIEFQSS4gSWYgd2UncmUgaW5cbiAgLy8gdGhlIGJyb3dzZXIsIGFkZCBgX2AgYXMgYSBnbG9iYWwgb2JqZWN0IHZpYSBhIHN0cmluZyBpZGVudGlmaWVyLFxuICAvLyBmb3IgQ2xvc3VyZSBDb21waWxlciBcImFkdmFuY2VkXCIgbW9kZS5cbiAgaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgICAgZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gXztcbiAgICB9XG4gICAgZXhwb3J0cy5fID0gXztcbiAgfSBlbHNlIHtcbiAgICByb290Ll8gPSBfO1xuICB9XG5cbiAgLy8gQ3VycmVudCB2ZXJzaW9uLlxuICBfLlZFUlNJT04gPSAnMS42LjAnO1xuXG4gIC8vIENvbGxlY3Rpb24gRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gVGhlIGNvcm5lcnN0b25lLCBhbiBgZWFjaGAgaW1wbGVtZW50YXRpb24sIGFrYSBgZm9yRWFjaGAuXG4gIC8vIEhhbmRsZXMgb2JqZWN0cyB3aXRoIHRoZSBidWlsdC1pbiBgZm9yRWFjaGAsIGFycmF5cywgYW5kIHJhdyBvYmplY3RzLlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZm9yRWFjaGAgaWYgYXZhaWxhYmxlLlxuICB2YXIgZWFjaCA9IF8uZWFjaCA9IF8uZm9yRWFjaCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiBvYmo7XG4gICAgaWYgKG5hdGl2ZUZvckVhY2ggJiYgb2JqLmZvckVhY2ggPT09IG5hdGl2ZUZvckVhY2gpIHtcbiAgICAgIG9iai5mb3JFYWNoKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICB9IGVsc2UgaWYgKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSB7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gb2JqLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9ialtpXSwgaSwgb2JqKSA9PT0gYnJlYWtlcikgcmV0dXJuO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2tleXNbaV1dLCBrZXlzW2ldLCBvYmopID09PSBicmVha2VyKSByZXR1cm47XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSByZXN1bHRzIG9mIGFwcGx5aW5nIHRoZSBpdGVyYXRvciB0byBlYWNoIGVsZW1lbnQuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBtYXBgIGlmIGF2YWlsYWJsZS5cbiAgXy5tYXAgPSBfLmNvbGxlY3QgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHRzO1xuICAgIGlmIChuYXRpdmVNYXAgJiYgb2JqLm1hcCA9PT0gbmF0aXZlTWFwKSByZXR1cm4gb2JqLm1hcChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmVzdWx0cy5wdXNoKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgdmFyIHJlZHVjZUVycm9yID0gJ1JlZHVjZSBvZiBlbXB0eSBhcnJheSB3aXRoIG5vIGluaXRpYWwgdmFsdWUnO1xuXG4gIC8vICoqUmVkdWNlKiogYnVpbGRzIHVwIGEgc2luZ2xlIHJlc3VsdCBmcm9tIGEgbGlzdCBvZiB2YWx1ZXMsIGFrYSBgaW5qZWN0YCxcbiAgLy8gb3IgYGZvbGRsYC4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHJlZHVjZWAgaWYgYXZhaWxhYmxlLlxuICBfLnJlZHVjZSA9IF8uZm9sZGwgPSBfLmluamVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIG1lbW8sIGNvbnRleHQpIHtcbiAgICB2YXIgaW5pdGlhbCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyO1xuICAgIGlmIChvYmogPT0gbnVsbCkgb2JqID0gW107XG4gICAgaWYgKG5hdGl2ZVJlZHVjZSAmJiBvYmoucmVkdWNlID09PSBuYXRpdmVSZWR1Y2UpIHtcbiAgICAgIGlmIChjb250ZXh0KSBpdGVyYXRvciA9IF8uYmluZChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgICByZXR1cm4gaW5pdGlhbCA/IG9iai5yZWR1Y2UoaXRlcmF0b3IsIG1lbW8pIDogb2JqLnJlZHVjZShpdGVyYXRvcik7XG4gICAgfVxuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmICghaW5pdGlhbCkge1xuICAgICAgICBtZW1vID0gdmFsdWU7XG4gICAgICAgIGluaXRpYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWVtbyA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgbWVtbywgdmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWluaXRpYWwpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgIHJldHVybiBtZW1vO1xuICB9O1xuXG4gIC8vIFRoZSByaWdodC1hc3NvY2lhdGl2ZSB2ZXJzaW9uIG9mIHJlZHVjZSwgYWxzbyBrbm93biBhcyBgZm9sZHJgLlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgcmVkdWNlUmlnaHRgIGlmIGF2YWlsYWJsZS5cbiAgXy5yZWR1Y2VSaWdodCA9IF8uZm9sZHIgPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgdmFyIGluaXRpYWwgPSBhcmd1bWVudHMubGVuZ3RoID4gMjtcbiAgICBpZiAob2JqID09IG51bGwpIG9iaiA9IFtdO1xuICAgIGlmIChuYXRpdmVSZWR1Y2VSaWdodCAmJiBvYmoucmVkdWNlUmlnaHQgPT09IG5hdGl2ZVJlZHVjZVJpZ2h0KSB7XG4gICAgICBpZiAoY29udGV4dCkgaXRlcmF0b3IgPSBfLmJpbmQoaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgICAgcmV0dXJuIGluaXRpYWwgPyBvYmoucmVkdWNlUmlnaHQoaXRlcmF0b3IsIG1lbW8pIDogb2JqLnJlZHVjZVJpZ2h0KGl0ZXJhdG9yKTtcbiAgICB9XG4gICAgdmFyIGxlbmd0aCA9IG9iai5sZW5ndGg7XG4gICAgaWYgKGxlbmd0aCAhPT0gK2xlbmd0aCkge1xuICAgICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIH1cbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpbmRleCA9IGtleXMgPyBrZXlzWy0tbGVuZ3RoXSA6IC0tbGVuZ3RoO1xuICAgICAgaWYgKCFpbml0aWFsKSB7XG4gICAgICAgIG1lbW8gPSBvYmpbaW5kZXhdO1xuICAgICAgICBpbml0aWFsID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG1lbW8sIG9ialtpbmRleF0sIGluZGV4LCBsaXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpZiAoIWluaXRpYWwpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgIHJldHVybiBtZW1vO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgZmlyc3QgdmFsdWUgd2hpY2ggcGFzc2VzIGEgdHJ1dGggdGVzdC4gQWxpYXNlZCBhcyBgZGV0ZWN0YC5cbiAgXy5maW5kID0gXy5kZXRlY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHQ7XG4gICAgYW55KG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyB0aGF0IHBhc3MgYSB0cnV0aCB0ZXN0LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgZmlsdGVyYCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYHNlbGVjdGAuXG4gIF8uZmlsdGVyID0gXy5zZWxlY3QgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0cztcbiAgICBpZiAobmF0aXZlRmlsdGVyICYmIG9iai5maWx0ZXIgPT09IG5hdGl2ZUZpbHRlcikgcmV0dXJuIG9iai5maWx0ZXIocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkgcmVzdWx0cy5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBSZXR1cm4gYWxsIHRoZSBlbGVtZW50cyBmb3Igd2hpY2ggYSB0cnV0aCB0ZXN0IGZhaWxzLlxuICBfLnJlamVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICByZXR1cm4gIXByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCk7XG4gICAgfSwgY29udGV4dCk7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIHdoZXRoZXIgYWxsIG9mIHRoZSBlbGVtZW50cyBtYXRjaCBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBldmVyeWAgaWYgYXZhaWxhYmxlLlxuICAvLyBBbGlhc2VkIGFzIGBhbGxgLlxuICBfLmV2ZXJ5ID0gXy5hbGwgPSBmdW5jdGlvbihvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHByZWRpY2F0ZSB8fCAocHJlZGljYXRlID0gXy5pZGVudGl0eSk7XG4gICAgdmFyIHJlc3VsdCA9IHRydWU7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChuYXRpdmVFdmVyeSAmJiBvYmouZXZlcnkgPT09IG5hdGl2ZUV2ZXJ5KSByZXR1cm4gb2JqLmV2ZXJ5KHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKCEocmVzdWx0ID0gcmVzdWx0ICYmIHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpKSByZXR1cm4gYnJlYWtlcjtcbiAgICB9KTtcbiAgICByZXR1cm4gISFyZXN1bHQ7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIGF0IGxlYXN0IG9uZSBlbGVtZW50IGluIHRoZSBvYmplY3QgbWF0Y2hlcyBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBzb21lYCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYGFueWAuXG4gIHZhciBhbnkgPSBfLnNvbWUgPSBfLmFueSA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcHJlZGljYXRlIHx8IChwcmVkaWNhdGUgPSBfLmlkZW50aXR5KTtcbiAgICB2YXIgcmVzdWx0ID0gZmFsc2U7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0O1xuICAgIGlmIChuYXRpdmVTb21lICYmIG9iai5zb21lID09PSBuYXRpdmVTb21lKSByZXR1cm4gb2JqLnNvbWUocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAocmVzdWx0IHx8IChyZXN1bHQgPSBwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSkgcmV0dXJuIGJyZWFrZXI7XG4gICAgfSk7XG4gICAgcmV0dXJuICEhcmVzdWx0O1xuICB9O1xuXG4gIC8vIERldGVybWluZSBpZiB0aGUgYXJyYXkgb3Igb2JqZWN0IGNvbnRhaW5zIGEgZ2l2ZW4gdmFsdWUgKHVzaW5nIGA9PT1gKS5cbiAgLy8gQWxpYXNlZCBhcyBgaW5jbHVkZWAuXG4gIF8uY29udGFpbnMgPSBfLmluY2x1ZGUgPSBmdW5jdGlvbihvYmosIHRhcmdldCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChuYXRpdmVJbmRleE9mICYmIG9iai5pbmRleE9mID09PSBuYXRpdmVJbmRleE9mKSByZXR1cm4gb2JqLmluZGV4T2YodGFyZ2V0KSAhPSAtMTtcbiAgICByZXR1cm4gYW55KG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiB2YWx1ZSA9PT0gdGFyZ2V0O1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEludm9rZSBhIG1ldGhvZCAod2l0aCBhcmd1bWVudHMpIG9uIGV2ZXJ5IGl0ZW0gaW4gYSBjb2xsZWN0aW9uLlxuICBfLmludm9rZSA9IGZ1bmN0aW9uKG9iaiwgbWV0aG9kKSB7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgdmFyIGlzRnVuYyA9IF8uaXNGdW5jdGlvbihtZXRob2QpO1xuICAgIHJldHVybiBfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICByZXR1cm4gKGlzRnVuYyA/IG1ldGhvZCA6IHZhbHVlW21ldGhvZF0pLmFwcGx5KHZhbHVlLCBhcmdzKTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBtYXBgOiBmZXRjaGluZyBhIHByb3BlcnR5LlxuICBfLnBsdWNrID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gXy5tYXAob2JqLCBfLnByb3BlcnR5KGtleSkpO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbHRlcmA6IHNlbGVjdGluZyBvbmx5IG9iamVjdHNcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy53aGVyZSA9IGZ1bmN0aW9uKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIob2JqLCBfLm1hdGNoZXMoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBDb252ZW5pZW5jZSB2ZXJzaW9uIG9mIGEgY29tbW9uIHVzZSBjYXNlIG9mIGBmaW5kYDogZ2V0dGluZyB0aGUgZmlyc3Qgb2JqZWN0XG4gIC8vIGNvbnRhaW5pbmcgc3BlY2lmaWMgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8uZmluZFdoZXJlID0gZnVuY3Rpb24ob2JqLCBhdHRycykge1xuICAgIHJldHVybiBfLmZpbmQob2JqLCBfLm1hdGNoZXMoYXR0cnMpKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1heGltdW0gZWxlbWVudCBvciAoZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIC8vIENhbid0IG9wdGltaXplIGFycmF5cyBvZiBpbnRlZ2VycyBsb25nZXIgdGhhbiA2NSw1MzUgZWxlbWVudHMuXG4gIC8vIFNlZSBbV2ViS2l0IEJ1ZyA4MDc5N10oaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTgwNzk3KVxuICBfLm1heCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoIWl0ZXJhdG9yICYmIF8uaXNBcnJheShvYmopICYmIG9ialswXSA9PT0gK29ialswXSAmJiBvYmoubGVuZ3RoIDwgNjU1MzUpIHtcbiAgICAgIHJldHVybiBNYXRoLm1heC5hcHBseShNYXRoLCBvYmopO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gLUluZmluaXR5LCBsYXN0Q29tcHV0ZWQgPSAtSW5maW5pdHk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgdmFyIGNvbXB1dGVkID0gaXRlcmF0b3IgPyBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkgOiB2YWx1ZTtcbiAgICAgIGlmIChjb21wdXRlZCA+IGxhc3RDb21wdXRlZCkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgbGFzdENvbXB1dGVkID0gY29tcHV0ZWQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIG1pbmltdW0gZWxlbWVudCAob3IgZWxlbWVudC1iYXNlZCBjb21wdXRhdGlvbikuXG4gIF8ubWluID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmICghaXRlcmF0b3IgJiYgXy5pc0FycmF5KG9iaikgJiYgb2JqWzBdID09PSArb2JqWzBdICYmIG9iai5sZW5ndGggPCA2NTUzNSkge1xuICAgICAgcmV0dXJuIE1hdGgubWluLmFwcGx5KE1hdGgsIG9iaik7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSBJbmZpbml0eSwgbGFzdENvbXB1dGVkID0gSW5maW5pdHk7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgdmFyIGNvbXB1dGVkID0gaXRlcmF0b3IgPyBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkgOiB2YWx1ZTtcbiAgICAgIGlmIChjb21wdXRlZCA8IGxhc3RDb21wdXRlZCkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgbGFzdENvbXB1dGVkID0gY29tcHV0ZWQ7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBTaHVmZmxlIGFuIGFycmF5LCB1c2luZyB0aGUgbW9kZXJuIHZlcnNpb24gb2YgdGhlXG4gIC8vIFtGaXNoZXItWWF0ZXMgc2h1ZmZsZV0oaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9GaXNoZXLigJNZYXRlc19zaHVmZmxlKS5cbiAgXy5zaHVmZmxlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHJhbmQ7XG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIgc2h1ZmZsZWQgPSBbXTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJhbmQgPSBfLnJhbmRvbShpbmRleCsrKTtcbiAgICAgIHNodWZmbGVkW2luZGV4IC0gMV0gPSBzaHVmZmxlZFtyYW5kXTtcbiAgICAgIHNodWZmbGVkW3JhbmRdID0gdmFsdWU7XG4gICAgfSk7XG4gICAgcmV0dXJuIHNodWZmbGVkO1xuICB9O1xuXG4gIC8vIFNhbXBsZSAqKm4qKiByYW5kb20gdmFsdWVzIGZyb20gYSBjb2xsZWN0aW9uLlxuICAvLyBJZiAqKm4qKiBpcyBub3Qgc3BlY2lmaWVkLCByZXR1cm5zIGEgc2luZ2xlIHJhbmRvbSBlbGVtZW50LlxuICAvLyBUaGUgaW50ZXJuYWwgYGd1YXJkYCBhcmd1bWVudCBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBtYXBgLlxuICBfLnNhbXBsZSA9IGZ1bmN0aW9uKG9iaiwgbiwgZ3VhcmQpIHtcbiAgICBpZiAobiA9PSBudWxsIHx8IGd1YXJkKSB7XG4gICAgICBpZiAob2JqLmxlbmd0aCAhPT0gK29iai5sZW5ndGgpIG9iaiA9IF8udmFsdWVzKG9iaik7XG4gICAgICByZXR1cm4gb2JqW18ucmFuZG9tKG9iai5sZW5ndGggLSAxKV07XG4gICAgfVxuICAgIHJldHVybiBfLnNodWZmbGUob2JqKS5zbGljZSgwLCBNYXRoLm1heCgwLCBuKSk7XG4gIH07XG5cbiAgLy8gQW4gaW50ZXJuYWwgZnVuY3Rpb24gdG8gZ2VuZXJhdGUgbG9va3VwIGl0ZXJhdG9ycy5cbiAgdmFyIGxvb2t1cEl0ZXJhdG9yID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT0gbnVsbCkgcmV0dXJuIF8uaWRlbnRpdHk7XG4gICAgaWYgKF8uaXNGdW5jdGlvbih2YWx1ZSkpIHJldHVybiB2YWx1ZTtcbiAgICByZXR1cm4gXy5wcm9wZXJ0eSh2YWx1ZSk7XG4gIH07XG5cbiAgLy8gU29ydCB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uIHByb2R1Y2VkIGJ5IGFuIGl0ZXJhdG9yLlxuICBfLnNvcnRCeSA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKGl0ZXJhdG9yKTtcbiAgICByZXR1cm4gXy5wbHVjayhfLm1hcChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICBpbmRleDogaW5kZXgsXG4gICAgICAgIGNyaXRlcmlhOiBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdClcbiAgICAgIH07XG4gICAgfSkuc29ydChmdW5jdGlvbihsZWZ0LCByaWdodCkge1xuICAgICAgdmFyIGEgPSBsZWZ0LmNyaXRlcmlhO1xuICAgICAgdmFyIGIgPSByaWdodC5jcml0ZXJpYTtcbiAgICAgIGlmIChhICE9PSBiKSB7XG4gICAgICAgIGlmIChhID4gYiB8fCBhID09PSB2b2lkIDApIHJldHVybiAxO1xuICAgICAgICBpZiAoYSA8IGIgfHwgYiA9PT0gdm9pZCAwKSByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICByZXR1cm4gbGVmdC5pbmRleCAtIHJpZ2h0LmluZGV4O1xuICAgIH0pLCAndmFsdWUnKTtcbiAgfTtcblxuICAvLyBBbiBpbnRlcm5hbCBmdW5jdGlvbiB1c2VkIGZvciBhZ2dyZWdhdGUgXCJncm91cCBieVwiIG9wZXJhdGlvbnMuXG4gIHZhciBncm91cCA9IGZ1bmN0aW9uKGJlaGF2aW9yKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICAgIGl0ZXJhdG9yID0gbG9va3VwSXRlcmF0b3IoaXRlcmF0b3IpO1xuICAgICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCkge1xuICAgICAgICB2YXIga2V5ID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIG9iaik7XG4gICAgICAgIGJlaGF2aW9yKHJlc3VsdCwga2V5LCB2YWx1ZSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBHcm91cHMgdGhlIG9iamVjdCdzIHZhbHVlcyBieSBhIGNyaXRlcmlvbi4gUGFzcyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlXG4gIC8vIHRvIGdyb3VwIGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUgY3JpdGVyaW9uLlxuICBfLmdyb3VwQnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIGtleSwgdmFsdWUpIHtcbiAgICBfLmhhcyhyZXN1bHQsIGtleSkgPyByZXN1bHRba2V5XS5wdXNoKHZhbHVlKSA6IHJlc3VsdFtrZXldID0gW3ZhbHVlXTtcbiAgfSk7XG5cbiAgLy8gSW5kZXhlcyB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uLCBzaW1pbGFyIHRvIGBncm91cEJ5YCwgYnV0IGZvclxuICAvLyB3aGVuIHlvdSBrbm93IHRoYXQgeW91ciBpbmRleCB2YWx1ZXMgd2lsbCBiZSB1bmlxdWUuXG4gIF8uaW5kZXhCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwga2V5LCB2YWx1ZSkge1xuICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gIH0pO1xuXG4gIC8vIENvdW50cyBpbnN0YW5jZXMgb2YgYW4gb2JqZWN0IHRoYXQgZ3JvdXAgYnkgYSBjZXJ0YWluIGNyaXRlcmlvbi4gUGFzc1xuICAvLyBlaXRoZXIgYSBzdHJpbmcgYXR0cmlidXRlIHRvIGNvdW50IGJ5LCBvciBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGVcbiAgLy8gY3JpdGVyaW9uLlxuICBfLmNvdW50QnkgPSBncm91cChmdW5jdGlvbihyZXN1bHQsIGtleSkge1xuICAgIF8uaGFzKHJlc3VsdCwga2V5KSA/IHJlc3VsdFtrZXldKysgOiByZXN1bHRba2V5XSA9IDE7XG4gIH0pO1xuXG4gIC8vIFVzZSBhIGNvbXBhcmF0b3IgZnVuY3Rpb24gdG8gZmlndXJlIG91dCB0aGUgc21hbGxlc3QgaW5kZXggYXQgd2hpY2hcbiAgLy8gYW4gb2JqZWN0IHNob3VsZCBiZSBpbnNlcnRlZCBzbyBhcyB0byBtYWludGFpbiBvcmRlci4gVXNlcyBiaW5hcnkgc2VhcmNoLlxuICBfLnNvcnRlZEluZGV4ID0gZnVuY3Rpb24oYXJyYXksIG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpdGVyYXRvciA9IGxvb2t1cEl0ZXJhdG9yKGl0ZXJhdG9yKTtcbiAgICB2YXIgdmFsdWUgPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIG9iaik7XG4gICAgdmFyIGxvdyA9IDAsIGhpZ2ggPSBhcnJheS5sZW5ndGg7XG4gICAgd2hpbGUgKGxvdyA8IGhpZ2gpIHtcbiAgICAgIHZhciBtaWQgPSAobG93ICsgaGlnaCkgPj4+IDE7XG4gICAgICBpdGVyYXRvci5jYWxsKGNvbnRleHQsIGFycmF5W21pZF0pIDwgdmFsdWUgPyBsb3cgPSBtaWQgKyAxIDogaGlnaCA9IG1pZDtcbiAgICB9XG4gICAgcmV0dXJuIGxvdztcbiAgfTtcblxuICAvLyBTYWZlbHkgY3JlYXRlIGEgcmVhbCwgbGl2ZSBhcnJheSBmcm9tIGFueXRoaW5nIGl0ZXJhYmxlLlxuICBfLnRvQXJyYXkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIW9iaikgcmV0dXJuIFtdO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSkgcmV0dXJuIHNsaWNlLmNhbGwob2JqKTtcbiAgICBpZiAob2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGgpIHJldHVybiBfLm1hcChvYmosIF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBfLnZhbHVlcyhvYmopO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbnVtYmVyIG9mIGVsZW1lbnRzIGluIGFuIG9iamVjdC5cbiAgXy5zaXplID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gMDtcbiAgICByZXR1cm4gKG9iai5sZW5ndGggPT09ICtvYmoubGVuZ3RoKSA/IG9iai5sZW5ndGggOiBfLmtleXMob2JqKS5sZW5ndGg7XG4gIH07XG5cbiAgLy8gQXJyYXkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIEdldCB0aGUgZmlyc3QgZWxlbWVudCBvZiBhbiBhcnJheS4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiB0aGUgZmlyc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBBbGlhc2VkIGFzIGBoZWFkYCBhbmQgYHRha2VgLiBUaGUgKipndWFyZCoqIGNoZWNrXG4gIC8vIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5maXJzdCA9IF8uaGVhZCA9IF8udGFrZSA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmICgobiA9PSBudWxsKSB8fCBndWFyZCkgcmV0dXJuIGFycmF5WzBdO1xuICAgIGlmIChuIDwgMCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAwLCBuKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBsYXN0IGVudHJ5IG9mIHRoZSBhcnJheS4gRXNwZWNpYWxseSB1c2VmdWwgb25cbiAgLy8gdGhlIGFyZ3VtZW50cyBvYmplY3QuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gYWxsIHRoZSB2YWx1ZXMgaW5cbiAgLy8gdGhlIGFycmF5LCBleGNsdWRpbmcgdGhlIGxhc3QgTi4gVGhlICoqZ3VhcmQqKiBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoXG4gIC8vIGBfLm1hcGAuXG4gIF8uaW5pdGlhbCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAwLCBhcnJheS5sZW5ndGggLSAoKG4gPT0gbnVsbCkgfHwgZ3VhcmQgPyAxIDogbikpO1xuICB9O1xuXG4gIC8vIEdldCB0aGUgbGFzdCBlbGVtZW50IG9mIGFuIGFycmF5LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIHRoZSBsYXN0IE5cbiAgLy8gdmFsdWVzIGluIHRoZSBhcnJheS4gVGhlICoqZ3VhcmQqKiBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8ubGFzdCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIGlmICgobiA9PSBudWxsKSB8fCBndWFyZCkgcmV0dXJuIGFycmF5W2FycmF5Lmxlbmd0aCAtIDFdO1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCBNYXRoLm1heChhcnJheS5sZW5ndGggLSBuLCAwKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBldmVyeXRoaW5nIGJ1dCB0aGUgZmlyc3QgZW50cnkgb2YgdGhlIGFycmF5LiBBbGlhc2VkIGFzIGB0YWlsYCBhbmQgYGRyb3BgLlxuICAvLyBFc3BlY2lhbGx5IHVzZWZ1bCBvbiB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyBhbiAqKm4qKiB3aWxsIHJldHVyblxuICAvLyB0aGUgcmVzdCBOIHZhbHVlcyBpbiB0aGUgYXJyYXkuIFRoZSAqKmd1YXJkKipcbiAgLy8gY2hlY2sgYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLnJlc3QgPSBfLnRhaWwgPSBfLmRyb3AgPSBmdW5jdGlvbihhcnJheSwgbiwgZ3VhcmQpIHtcbiAgICByZXR1cm4gc2xpY2UuY2FsbChhcnJheSwgKG4gPT0gbnVsbCkgfHwgZ3VhcmQgPyAxIDogbik7XG4gIH07XG5cbiAgLy8gVHJpbSBvdXQgYWxsIGZhbHN5IHZhbHVlcyBmcm9tIGFuIGFycmF5LlxuICBfLmNvbXBhY3QgPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgXy5pZGVudGl0eSk7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgaW1wbGVtZW50YXRpb24gb2YgYSByZWN1cnNpdmUgYGZsYXR0ZW5gIGZ1bmN0aW9uLlxuICB2YXIgZmxhdHRlbiA9IGZ1bmN0aW9uKGlucHV0LCBzaGFsbG93LCBvdXRwdXQpIHtcbiAgICBpZiAoc2hhbGxvdyAmJiBfLmV2ZXJ5KGlucHV0LCBfLmlzQXJyYXkpKSB7XG4gICAgICByZXR1cm4gY29uY2F0LmFwcGx5KG91dHB1dCwgaW5wdXQpO1xuICAgIH1cbiAgICBlYWNoKGlucHV0LCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKF8uaXNBcnJheSh2YWx1ZSkgfHwgXy5pc0FyZ3VtZW50cyh2YWx1ZSkpIHtcbiAgICAgICAgc2hhbGxvdyA/IHB1c2guYXBwbHkob3V0cHV0LCB2YWx1ZSkgOiBmbGF0dGVuKHZhbHVlLCBzaGFsbG93LCBvdXRwdXQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0cHV0LnB1c2godmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvdXRwdXQ7XG4gIH07XG5cbiAgLy8gRmxhdHRlbiBvdXQgYW4gYXJyYXksIGVpdGhlciByZWN1cnNpdmVseSAoYnkgZGVmYXVsdCksIG9yIGp1c3Qgb25lIGxldmVsLlxuICBfLmZsYXR0ZW4gPSBmdW5jdGlvbihhcnJheSwgc2hhbGxvdykge1xuICAgIHJldHVybiBmbGF0dGVuKGFycmF5LCBzaGFsbG93LCBbXSk7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgdmVyc2lvbiBvZiB0aGUgYXJyYXkgdGhhdCBkb2VzIG5vdCBjb250YWluIHRoZSBzcGVjaWZpZWQgdmFsdWUocykuXG4gIF8ud2l0aG91dCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgcmV0dXJuIF8uZGlmZmVyZW5jZShhcnJheSwgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgfTtcblxuICAvLyBTcGxpdCBhbiBhcnJheSBpbnRvIHR3byBhcnJheXM6IG9uZSB3aG9zZSBlbGVtZW50cyBhbGwgc2F0aXNmeSB0aGUgZ2l2ZW5cbiAgLy8gcHJlZGljYXRlLCBhbmQgb25lIHdob3NlIGVsZW1lbnRzIGFsbCBkbyBub3Qgc2F0aXNmeSB0aGUgcHJlZGljYXRlLlxuICBfLnBhcnRpdGlvbiA9IGZ1bmN0aW9uKGFycmF5LCBwcmVkaWNhdGUpIHtcbiAgICB2YXIgcGFzcyA9IFtdLCBmYWlsID0gW107XG4gICAgZWFjaChhcnJheSwgZnVuY3Rpb24oZWxlbSkge1xuICAgICAgKHByZWRpY2F0ZShlbGVtKSA/IHBhc3MgOiBmYWlsKS5wdXNoKGVsZW0pO1xuICAgIH0pO1xuICAgIHJldHVybiBbcGFzcywgZmFpbF07XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhIGR1cGxpY2F0ZS1mcmVlIHZlcnNpb24gb2YgdGhlIGFycmF5LiBJZiB0aGUgYXJyYXkgaGFzIGFscmVhZHlcbiAgLy8gYmVlbiBzb3J0ZWQsIHlvdSBoYXZlIHRoZSBvcHRpb24gb2YgdXNpbmcgYSBmYXN0ZXIgYWxnb3JpdGhtLlxuICAvLyBBbGlhc2VkIGFzIGB1bmlxdWVgLlxuICBfLnVuaXEgPSBfLnVuaXF1ZSA9IGZ1bmN0aW9uKGFycmF5LCBpc1NvcnRlZCwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGlzU29ydGVkKSkge1xuICAgICAgY29udGV4dCA9IGl0ZXJhdG9yO1xuICAgICAgaXRlcmF0b3IgPSBpc1NvcnRlZDtcbiAgICAgIGlzU29ydGVkID0gZmFsc2U7XG4gICAgfVxuICAgIHZhciBpbml0aWFsID0gaXRlcmF0b3IgPyBfLm1hcChhcnJheSwgaXRlcmF0b3IsIGNvbnRleHQpIDogYXJyYXk7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICB2YXIgc2VlbiA9IFtdO1xuICAgIGVhY2goaW5pdGlhbCwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICBpZiAoaXNTb3J0ZWQgPyAoIWluZGV4IHx8IHNlZW5bc2Vlbi5sZW5ndGggLSAxXSAhPT0gdmFsdWUpIDogIV8uY29udGFpbnMoc2VlbiwgdmFsdWUpKSB7XG4gICAgICAgIHNlZW4ucHVzaCh2YWx1ZSk7XG4gICAgICAgIHJlc3VsdHMucHVzaChhcnJheVtpbmRleF0pO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyB0aGUgdW5pb246IGVhY2ggZGlzdGluY3QgZWxlbWVudCBmcm9tIGFsbCBvZlxuICAvLyB0aGUgcGFzc2VkLWluIGFycmF5cy5cbiAgXy51bmlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLnVuaXEoXy5mbGF0dGVuKGFyZ3VtZW50cywgdHJ1ZSkpO1xuICB9O1xuXG4gIC8vIFByb2R1Y2UgYW4gYXJyYXkgdGhhdCBjb250YWlucyBldmVyeSBpdGVtIHNoYXJlZCBiZXR3ZWVuIGFsbCB0aGVcbiAgLy8gcGFzc2VkLWluIGFycmF5cy5cbiAgXy5pbnRlcnNlY3Rpb24gPSBmdW5jdGlvbihhcnJheSkge1xuICAgIHZhciByZXN0ID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBfLmZpbHRlcihfLnVuaXEoYXJyYXkpLCBmdW5jdGlvbihpdGVtKSB7XG4gICAgICByZXR1cm4gXy5ldmVyeShyZXN0LCBmdW5jdGlvbihvdGhlcikge1xuICAgICAgICByZXR1cm4gXy5jb250YWlucyhvdGhlciwgaXRlbSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBUYWtlIHRoZSBkaWZmZXJlbmNlIGJldHdlZW4gb25lIGFycmF5IGFuZCBhIG51bWJlciBvZiBvdGhlciBhcnJheXMuXG4gIC8vIE9ubHkgdGhlIGVsZW1lbnRzIHByZXNlbnQgaW4ganVzdCB0aGUgZmlyc3QgYXJyYXkgd2lsbCByZW1haW4uXG4gIF8uZGlmZmVyZW5jZSA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3QgPSBjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICByZXR1cm4gXy5maWx0ZXIoYXJyYXksIGZ1bmN0aW9uKHZhbHVlKXsgcmV0dXJuICFfLmNvbnRhaW5zKHJlc3QsIHZhbHVlKTsgfSk7XG4gIH07XG5cbiAgLy8gWmlwIHRvZ2V0aGVyIG11bHRpcGxlIGxpc3RzIGludG8gYSBzaW5nbGUgYXJyYXkgLS0gZWxlbWVudHMgdGhhdCBzaGFyZVxuICAvLyBhbiBpbmRleCBnbyB0b2dldGhlci5cbiAgXy56aXAgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgbGVuZ3RoID0gXy5tYXgoXy5wbHVjayhhcmd1bWVudHMsICdsZW5ndGgnKS5jb25jYXQoMCkpO1xuICAgIHZhciByZXN1bHRzID0gbmV3IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgcmVzdWx0c1tpXSA9IF8ucGx1Y2soYXJndW1lbnRzLCAnJyArIGkpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICAvLyBDb252ZXJ0cyBsaXN0cyBpbnRvIG9iamVjdHMuIFBhc3MgZWl0aGVyIGEgc2luZ2xlIGFycmF5IG9mIGBba2V5LCB2YWx1ZV1gXG4gIC8vIHBhaXJzLCBvciB0d28gcGFyYWxsZWwgYXJyYXlzIG9mIHRoZSBzYW1lIGxlbmd0aCAtLSBvbmUgb2Yga2V5cywgYW5kIG9uZSBvZlxuICAvLyB0aGUgY29ycmVzcG9uZGluZyB2YWx1ZXMuXG4gIF8ub2JqZWN0ID0gZnVuY3Rpb24obGlzdCwgdmFsdWVzKSB7XG4gICAgaWYgKGxpc3QgPT0gbnVsbCkgcmV0dXJuIHt9O1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0gbGlzdC5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHZhbHVlcykge1xuICAgICAgICByZXN1bHRbbGlzdFtpXV0gPSB2YWx1ZXNbaV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXN1bHRbbGlzdFtpXVswXV0gPSBsaXN0W2ldWzFdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIElmIHRoZSBicm93c2VyIGRvZXNuJ3Qgc3VwcGx5IHVzIHdpdGggaW5kZXhPZiAoSSdtIGxvb2tpbmcgYXQgeW91LCAqKk1TSUUqKiksXG4gIC8vIHdlIG5lZWQgdGhpcyBmdW5jdGlvbi4gUmV0dXJuIHRoZSBwb3NpdGlvbiBvZiB0aGUgZmlyc3Qgb2NjdXJyZW5jZSBvZiBhblxuICAvLyBpdGVtIGluIGFuIGFycmF5LCBvciAtMSBpZiB0aGUgaXRlbSBpcyBub3QgaW5jbHVkZWQgaW4gdGhlIGFycmF5LlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgaW5kZXhPZmAgaWYgYXZhaWxhYmxlLlxuICAvLyBJZiB0aGUgYXJyYXkgaXMgbGFyZ2UgYW5kIGFscmVhZHkgaW4gc29ydCBvcmRlciwgcGFzcyBgdHJ1ZWBcbiAgLy8gZm9yICoqaXNTb3J0ZWQqKiB0byB1c2UgYmluYXJ5IHNlYXJjaC5cbiAgXy5pbmRleE9mID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGlzU29ydGVkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiAtMTtcbiAgICB2YXIgaSA9IDAsIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcbiAgICBpZiAoaXNTb3J0ZWQpIHtcbiAgICAgIGlmICh0eXBlb2YgaXNTb3J0ZWQgPT0gJ251bWJlcicpIHtcbiAgICAgICAgaSA9IChpc1NvcnRlZCA8IDAgPyBNYXRoLm1heCgwLCBsZW5ndGggKyBpc1NvcnRlZCkgOiBpc1NvcnRlZCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpID0gXy5zb3J0ZWRJbmRleChhcnJheSwgaXRlbSk7XG4gICAgICAgIHJldHVybiBhcnJheVtpXSA9PT0gaXRlbSA/IGkgOiAtMTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG5hdGl2ZUluZGV4T2YgJiYgYXJyYXkuaW5kZXhPZiA9PT0gbmF0aXZlSW5kZXhPZikgcmV0dXJuIGFycmF5LmluZGV4T2YoaXRlbSwgaXNTb3J0ZWQpO1xuICAgIGZvciAoOyBpIDwgbGVuZ3RoOyBpKyspIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xuICB9O1xuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBsYXN0SW5kZXhPZmAgaWYgYXZhaWxhYmxlLlxuICBfLmxhc3RJbmRleE9mID0gZnVuY3Rpb24oYXJyYXksIGl0ZW0sIGZyb20pIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIC0xO1xuICAgIHZhciBoYXNJbmRleCA9IGZyb20gIT0gbnVsbDtcbiAgICBpZiAobmF0aXZlTGFzdEluZGV4T2YgJiYgYXJyYXkubGFzdEluZGV4T2YgPT09IG5hdGl2ZUxhc3RJbmRleE9mKSB7XG4gICAgICByZXR1cm4gaGFzSW5kZXggPyBhcnJheS5sYXN0SW5kZXhPZihpdGVtLCBmcm9tKSA6IGFycmF5Lmxhc3RJbmRleE9mKGl0ZW0pO1xuICAgIH1cbiAgICB2YXIgaSA9IChoYXNJbmRleCA/IGZyb20gOiBhcnJheS5sZW5ndGgpO1xuICAgIHdoaWxlIChpLS0pIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xuICB9O1xuXG4gIC8vIEdlbmVyYXRlIGFuIGludGVnZXIgQXJyYXkgY29udGFpbmluZyBhbiBhcml0aG1ldGljIHByb2dyZXNzaW9uLiBBIHBvcnQgb2ZcbiAgLy8gdGhlIG5hdGl2ZSBQeXRob24gYHJhbmdlKClgIGZ1bmN0aW9uLiBTZWVcbiAgLy8gW3RoZSBQeXRob24gZG9jdW1lbnRhdGlvbl0oaHR0cDovL2RvY3MucHl0aG9uLm9yZy9saWJyYXJ5L2Z1bmN0aW9ucy5odG1sI3JhbmdlKS5cbiAgXy5yYW5nZSA9IGZ1bmN0aW9uKHN0YXJ0LCBzdG9wLCBzdGVwKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPD0gMSkge1xuICAgICAgc3RvcCA9IHN0YXJ0IHx8IDA7XG4gICAgICBzdGFydCA9IDA7XG4gICAgfVxuICAgIHN0ZXAgPSBhcmd1bWVudHNbMl0gfHwgMTtcblxuICAgIHZhciBsZW5ndGggPSBNYXRoLm1heChNYXRoLmNlaWwoKHN0b3AgLSBzdGFydCkgLyBzdGVwKSwgMCk7XG4gICAgdmFyIGlkeCA9IDA7XG4gICAgdmFyIHJhbmdlID0gbmV3IEFycmF5KGxlbmd0aCk7XG5cbiAgICB3aGlsZShpZHggPCBsZW5ndGgpIHtcbiAgICAgIHJhbmdlW2lkeCsrXSA9IHN0YXJ0O1xuICAgICAgc3RhcnQgKz0gc3RlcDtcbiAgICB9XG5cbiAgICByZXR1cm4gcmFuZ2U7XG4gIH07XG5cbiAgLy8gRnVuY3Rpb24gKGFoZW0pIEZ1bmN0aW9uc1xuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSZXVzYWJsZSBjb25zdHJ1Y3RvciBmdW5jdGlvbiBmb3IgcHJvdG90eXBlIHNldHRpbmcuXG4gIHZhciBjdG9yID0gZnVuY3Rpb24oKXt9O1xuXG4gIC8vIENyZWF0ZSBhIGZ1bmN0aW9uIGJvdW5kIHRvIGEgZ2l2ZW4gb2JqZWN0IChhc3NpZ25pbmcgYHRoaXNgLCBhbmQgYXJndW1lbnRzLFxuICAvLyBvcHRpb25hbGx5KS4gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYEZ1bmN0aW9uLmJpbmRgIGlmXG4gIC8vIGF2YWlsYWJsZS5cbiAgXy5iaW5kID0gZnVuY3Rpb24oZnVuYywgY29udGV4dCkge1xuICAgIHZhciBhcmdzLCBib3VuZDtcbiAgICBpZiAobmF0aXZlQmluZCAmJiBmdW5jLmJpbmQgPT09IG5hdGl2ZUJpbmQpIHJldHVybiBuYXRpdmVCaW5kLmFwcGx5KGZ1bmMsIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgaWYgKCFfLmlzRnVuY3Rpb24oZnVuYykpIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gYm91bmQgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBib3VuZCkpIHJldHVybiBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSBmdW5jLnByb3RvdHlwZTtcbiAgICAgIHZhciBzZWxmID0gbmV3IGN0b3I7XG4gICAgICBjdG9yLnByb3RvdHlwZSA9IG51bGw7XG4gICAgICB2YXIgcmVzdWx0ID0gZnVuYy5hcHBseShzZWxmLCBhcmdzLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cykpKTtcbiAgICAgIGlmIChPYmplY3QocmVzdWx0KSA9PT0gcmVzdWx0KSByZXR1cm4gcmVzdWx0O1xuICAgICAgcmV0dXJuIHNlbGY7XG4gICAgfTtcbiAgfTtcblxuICAvLyBQYXJ0aWFsbHkgYXBwbHkgYSBmdW5jdGlvbiBieSBjcmVhdGluZyBhIHZlcnNpb24gdGhhdCBoYXMgaGFkIHNvbWUgb2YgaXRzXG4gIC8vIGFyZ3VtZW50cyBwcmUtZmlsbGVkLCB3aXRob3V0IGNoYW5naW5nIGl0cyBkeW5hbWljIGB0aGlzYCBjb250ZXh0LiBfIGFjdHNcbiAgLy8gYXMgYSBwbGFjZWhvbGRlciwgYWxsb3dpbmcgYW55IGNvbWJpbmF0aW9uIG9mIGFyZ3VtZW50cyB0byBiZSBwcmUtZmlsbGVkLlxuICBfLnBhcnRpYWwgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgdmFyIGJvdW5kQXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgcG9zaXRpb24gPSAwO1xuICAgICAgdmFyIGFyZ3MgPSBib3VuZEFyZ3Muc2xpY2UoKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBhcmdzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChhcmdzW2ldID09PSBfKSBhcmdzW2ldID0gYXJndW1lbnRzW3Bvc2l0aW9uKytdO1xuICAgICAgfVxuICAgICAgd2hpbGUgKHBvc2l0aW9uIDwgYXJndW1lbnRzLmxlbmd0aCkgYXJncy5wdXNoKGFyZ3VtZW50c1twb3NpdGlvbisrXSk7XG4gICAgICByZXR1cm4gZnVuYy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEJpbmQgYSBudW1iZXIgb2YgYW4gb2JqZWN0J3MgbWV0aG9kcyB0byB0aGF0IG9iamVjdC4gUmVtYWluaW5nIGFyZ3VtZW50c1xuICAvLyBhcmUgdGhlIG1ldGhvZCBuYW1lcyB0byBiZSBib3VuZC4gVXNlZnVsIGZvciBlbnN1cmluZyB0aGF0IGFsbCBjYWxsYmFja3NcbiAgLy8gZGVmaW5lZCBvbiBhbiBvYmplY3QgYmVsb25nIHRvIGl0LlxuICBfLmJpbmRBbGwgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgZnVuY3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgaWYgKGZ1bmNzLmxlbmd0aCA9PT0gMCkgdGhyb3cgbmV3IEVycm9yKCdiaW5kQWxsIG11c3QgYmUgcGFzc2VkIGZ1bmN0aW9uIG5hbWVzJyk7XG4gICAgZWFjaChmdW5jcywgZnVuY3Rpb24oZikgeyBvYmpbZl0gPSBfLmJpbmQob2JqW2ZdLCBvYmopOyB9KTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIE1lbW9pemUgYW4gZXhwZW5zaXZlIGZ1bmN0aW9uIGJ5IHN0b3JpbmcgaXRzIHJlc3VsdHMuXG4gIF8ubWVtb2l6ZSA9IGZ1bmN0aW9uKGZ1bmMsIGhhc2hlcikge1xuICAgIHZhciBtZW1vID0ge307XG4gICAgaGFzaGVyIHx8IChoYXNoZXIgPSBfLmlkZW50aXR5KTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIga2V5ID0gaGFzaGVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICByZXR1cm4gXy5oYXMobWVtbywga2V5KSA/IG1lbW9ba2V5XSA6IChtZW1vW2tleV0gPSBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cykpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gRGVsYXlzIGEgZnVuY3Rpb24gZm9yIHRoZSBnaXZlbiBudW1iZXIgb2YgbWlsbGlzZWNvbmRzLCBhbmQgdGhlbiBjYWxsc1xuICAvLyBpdCB3aXRoIHRoZSBhcmd1bWVudHMgc3VwcGxpZWQuXG4gIF8uZGVsYXkgPSBmdW5jdGlvbihmdW5jLCB3YWl0KSB7XG4gICAgdmFyIGFyZ3MgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMik7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24oKXsgcmV0dXJuIGZ1bmMuYXBwbHkobnVsbCwgYXJncyk7IH0sIHdhaXQpO1xuICB9O1xuXG4gIC8vIERlZmVycyBhIGZ1bmN0aW9uLCBzY2hlZHVsaW5nIGl0IHRvIHJ1biBhZnRlciB0aGUgY3VycmVudCBjYWxsIHN0YWNrIGhhc1xuICAvLyBjbGVhcmVkLlxuICBfLmRlZmVyID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHJldHVybiBfLmRlbGF5LmFwcGx5KF8sIFtmdW5jLCAxXS5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKSk7XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCB3aGVuIGludm9rZWQsIHdpbGwgb25seSBiZSB0cmlnZ2VyZWQgYXQgbW9zdCBvbmNlXG4gIC8vIGR1cmluZyBhIGdpdmVuIHdpbmRvdyBvZiB0aW1lLiBOb3JtYWxseSwgdGhlIHRocm90dGxlZCBmdW5jdGlvbiB3aWxsIHJ1blxuICAvLyBhcyBtdWNoIGFzIGl0IGNhbiwgd2l0aG91dCBldmVyIGdvaW5nIG1vcmUgdGhhbiBvbmNlIHBlciBgd2FpdGAgZHVyYXRpb247XG4gIC8vIGJ1dCBpZiB5b3UnZCBsaWtlIHRvIGRpc2FibGUgdGhlIGV4ZWN1dGlvbiBvbiB0aGUgbGVhZGluZyBlZGdlLCBwYXNzXG4gIC8vIGB7bGVhZGluZzogZmFsc2V9YC4gVG8gZGlzYWJsZSBleGVjdXRpb24gb24gdGhlIHRyYWlsaW5nIGVkZ2UsIGRpdHRvLlxuICBfLnRocm90dGxlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgb3B0aW9ucykge1xuICAgIHZhciBjb250ZXh0LCBhcmdzLCByZXN1bHQ7XG4gICAgdmFyIHRpbWVvdXQgPSBudWxsO1xuICAgIHZhciBwcmV2aW91cyA9IDA7XG4gICAgb3B0aW9ucyB8fCAob3B0aW9ucyA9IHt9KTtcbiAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgIHByZXZpb3VzID0gb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSA/IDAgOiBfLm5vdygpO1xuICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgIH07XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5vdyA9IF8ubm93KCk7XG4gICAgICBpZiAoIXByZXZpb3VzICYmIG9wdGlvbnMubGVhZGluZyA9PT0gZmFsc2UpIHByZXZpb3VzID0gbm93O1xuICAgICAgdmFyIHJlbWFpbmluZyA9IHdhaXQgLSAobm93IC0gcHJldmlvdXMpO1xuICAgICAgY29udGV4dCA9IHRoaXM7XG4gICAgICBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgaWYgKHJlbWFpbmluZyA8PSAwKSB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgdGltZW91dCA9IG51bGw7XG4gICAgICAgIHByZXZpb3VzID0gbm93O1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICB9IGVsc2UgaWYgKCF0aW1lb3V0ICYmIG9wdGlvbnMudHJhaWxpbmcgIT09IGZhbHNlKSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCByZW1haW5pbmcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiwgdGhhdCwgYXMgbG9uZyBhcyBpdCBjb250aW51ZXMgdG8gYmUgaW52b2tlZCwgd2lsbCBub3RcbiAgLy8gYmUgdHJpZ2dlcmVkLiBUaGUgZnVuY3Rpb24gd2lsbCBiZSBjYWxsZWQgYWZ0ZXIgaXQgc3RvcHMgYmVpbmcgY2FsbGVkIGZvclxuICAvLyBOIG1pbGxpc2Vjb25kcy4gSWYgYGltbWVkaWF0ZWAgaXMgcGFzc2VkLCB0cmlnZ2VyIHRoZSBmdW5jdGlvbiBvbiB0aGVcbiAgLy8gbGVhZGluZyBlZGdlLCBpbnN0ZWFkIG9mIHRoZSB0cmFpbGluZy5cbiAgXy5kZWJvdW5jZSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQsIGltbWVkaWF0ZSkge1xuICAgIHZhciB0aW1lb3V0LCBhcmdzLCBjb250ZXh0LCB0aW1lc3RhbXAsIHJlc3VsdDtcblxuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGxhc3QgPSBfLm5vdygpIC0gdGltZXN0YW1wO1xuICAgICAgaWYgKGxhc3QgPCB3YWl0KSB7XG4gICAgICAgIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGxhdGVyLCB3YWl0IC0gbGFzdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgaWYgKCFpbW1lZGlhdGUpIHtcbiAgICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICB0aW1lc3RhbXAgPSBfLm5vdygpO1xuICAgICAgdmFyIGNhbGxOb3cgPSBpbW1lZGlhdGUgJiYgIXRpbWVvdXQ7XG4gICAgICBpZiAoIXRpbWVvdXQpIHtcbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xuICAgICAgfVxuICAgICAgaWYgKGNhbGxOb3cpIHtcbiAgICAgICAgcmVzdWx0ID0gZnVuYy5hcHBseShjb250ZXh0LCBhcmdzKTtcbiAgICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBiZSBleGVjdXRlZCBhdCBtb3N0IG9uZSB0aW1lLCBubyBtYXR0ZXIgaG93XG4gIC8vIG9mdGVuIHlvdSBjYWxsIGl0LiBVc2VmdWwgZm9yIGxhenkgaW5pdGlhbGl6YXRpb24uXG4gIF8ub25jZSA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICB2YXIgcmFuID0gZmFsc2UsIG1lbW87XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHJhbikgcmV0dXJuIG1lbW87XG4gICAgICByYW4gPSB0cnVlO1xuICAgICAgbWVtbyA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIGZ1bmMgPSBudWxsO1xuICAgICAgcmV0dXJuIG1lbW87XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIHRoZSBmaXJzdCBmdW5jdGlvbiBwYXNzZWQgYXMgYW4gYXJndW1lbnQgdG8gdGhlIHNlY29uZCxcbiAgLy8gYWxsb3dpbmcgeW91IHRvIGFkanVzdCBhcmd1bWVudHMsIHJ1biBjb2RlIGJlZm9yZSBhbmQgYWZ0ZXIsIGFuZFxuICAvLyBjb25kaXRpb25hbGx5IGV4ZWN1dGUgdGhlIG9yaWdpbmFsIGZ1bmN0aW9uLlxuICBfLndyYXAgPSBmdW5jdGlvbihmdW5jLCB3cmFwcGVyKSB7XG4gICAgcmV0dXJuIF8ucGFydGlhbCh3cmFwcGVyLCBmdW5jKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBpcyB0aGUgY29tcG9zaXRpb24gb2YgYSBsaXN0IG9mIGZ1bmN0aW9ucywgZWFjaFxuICAvLyBjb25zdW1pbmcgdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZnVuY3Rpb24gdGhhdCBmb2xsb3dzLlxuICBfLmNvbXBvc2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZnVuY3MgPSBhcmd1bWVudHM7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBmb3IgKHZhciBpID0gZnVuY3MubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgYXJncyA9IFtmdW5jc1tpXS5hcHBseSh0aGlzLCBhcmdzKV07XG4gICAgICB9XG4gICAgICByZXR1cm4gYXJnc1swXTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHdpbGwgb25seSBiZSBleGVjdXRlZCBhZnRlciBiZWluZyBjYWxsZWQgTiB0aW1lcy5cbiAgXy5hZnRlciA9IGZ1bmN0aW9uKHRpbWVzLCBmdW5jKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKC0tdGltZXMgPCAxKSB7XG4gICAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICB9XG4gICAgfTtcbiAgfTtcblxuICAvLyBPYmplY3QgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSZXRyaWV2ZSB0aGUgbmFtZXMgb2YgYW4gb2JqZWN0J3MgcHJvcGVydGllcy5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYE9iamVjdC5rZXlzYFxuICBfLmtleXMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIFtdO1xuICAgIGlmIChuYXRpdmVLZXlzKSByZXR1cm4gbmF0aXZlS2V5cyhvYmopO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gICAgcmV0dXJuIGtleXM7XG4gIH07XG5cbiAgLy8gUmV0cmlldmUgdGhlIHZhbHVlcyBvZiBhbiBvYmplY3QncyBwcm9wZXJ0aWVzLlxuICBfLnZhbHVlcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICB2YWx1ZXNbaV0gPSBvYmpba2V5c1tpXV07XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZXM7XG4gIH07XG5cbiAgLy8gQ29udmVydCBhbiBvYmplY3QgaW50byBhIGxpc3Qgb2YgYFtrZXksIHZhbHVlXWAgcGFpcnMuXG4gIF8ucGFpcnMgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgcGFpcnMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBwYWlyc1tpXSA9IFtrZXlzW2ldLCBvYmpba2V5c1tpXV1dO1xuICAgIH1cbiAgICByZXR1cm4gcGFpcnM7XG4gIH07XG5cbiAgLy8gSW52ZXJ0IHRoZSBrZXlzIGFuZCB2YWx1ZXMgb2YgYW4gb2JqZWN0LiBUaGUgdmFsdWVzIG11c3QgYmUgc2VyaWFsaXphYmxlLlxuICBfLmludmVydCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICByZXN1bHRbb2JqW2tleXNbaV1dXSA9IGtleXNbaV07XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgc29ydGVkIGxpc3Qgb2YgdGhlIGZ1bmN0aW9uIG5hbWVzIGF2YWlsYWJsZSBvbiB0aGUgb2JqZWN0LlxuICAvLyBBbGlhc2VkIGFzIGBtZXRob2RzYFxuICBfLmZ1bmN0aW9ucyA9IF8ubWV0aG9kcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBuYW1lcyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24ob2JqW2tleV0pKSBuYW1lcy5wdXNoKGtleSk7XG4gICAgfVxuICAgIHJldHVybiBuYW1lcy5zb3J0KCk7XG4gIH07XG5cbiAgLy8gRXh0ZW5kIGEgZ2l2ZW4gb2JqZWN0IHdpdGggYWxsIHRoZSBwcm9wZXJ0aWVzIGluIHBhc3NlZC1pbiBvYmplY3QocykuXG4gIF8uZXh0ZW5kID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IG9ubHkgY29udGFpbmluZyB0aGUgd2hpdGVsaXN0ZWQgcHJvcGVydGllcy5cbiAgXy5waWNrID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGNvcHkgPSB7fTtcbiAgICB2YXIga2V5cyA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIGVhY2goa2V5cywgZnVuY3Rpb24oa2V5KSB7XG4gICAgICBpZiAoa2V5IGluIG9iaikgY29weVtrZXldID0gb2JqW2tleV07XG4gICAgfSk7XG4gICAgcmV0dXJuIGNvcHk7XG4gIH07XG5cbiAgIC8vIFJldHVybiBhIGNvcHkgb2YgdGhlIG9iamVjdCB3aXRob3V0IHRoZSBibGFja2xpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLm9taXQgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgY29weSA9IHt9O1xuICAgIHZhciBrZXlzID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKCFfLmNvbnRhaW5zKGtleXMsIGtleSkpIGNvcHlba2V5XSA9IG9ialtrZXldO1xuICAgIH1cbiAgICByZXR1cm4gY29weTtcbiAgfTtcblxuICAvLyBGaWxsIGluIGEgZ2l2ZW4gb2JqZWN0IHdpdGggZGVmYXVsdCBwcm9wZXJ0aWVzLlxuICBfLmRlZmF1bHRzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgZWFjaChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSksIGZ1bmN0aW9uKHNvdXJjZSkge1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBmb3IgKHZhciBwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgIGlmIChvYmpbcHJvcF0gPT09IHZvaWQgMCkgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBDcmVhdGUgYSAoc2hhbGxvdy1jbG9uZWQpIGR1cGxpY2F0ZSBvZiBhbiBvYmplY3QuXG4gIF8uY2xvbmUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAoIV8uaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICByZXR1cm4gXy5pc0FycmF5KG9iaikgPyBvYmouc2xpY2UoKSA6IF8uZXh0ZW5kKHt9LCBvYmopO1xuICB9O1xuXG4gIC8vIEludm9rZXMgaW50ZXJjZXB0b3Igd2l0aCB0aGUgb2JqLCBhbmQgdGhlbiByZXR1cm5zIG9iai5cbiAgLy8gVGhlIHByaW1hcnkgcHVycG9zZSBvZiB0aGlzIG1ldGhvZCBpcyB0byBcInRhcCBpbnRvXCIgYSBtZXRob2QgY2hhaW4sIGluXG4gIC8vIG9yZGVyIHRvIHBlcmZvcm0gb3BlcmF0aW9ucyBvbiBpbnRlcm1lZGlhdGUgcmVzdWx0cyB3aXRoaW4gdGhlIGNoYWluLlxuICBfLnRhcCA9IGZ1bmN0aW9uKG9iaiwgaW50ZXJjZXB0b3IpIHtcbiAgICBpbnRlcmNlcHRvcihvYmopO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gSW50ZXJuYWwgcmVjdXJzaXZlIGNvbXBhcmlzb24gZnVuY3Rpb24gZm9yIGBpc0VxdWFsYC5cbiAgdmFyIGVxID0gZnVuY3Rpb24oYSwgYiwgYVN0YWNrLCBiU3RhY2spIHtcbiAgICAvLyBJZGVudGljYWwgb2JqZWN0cyBhcmUgZXF1YWwuIGAwID09PSAtMGAsIGJ1dCB0aGV5IGFyZW4ndCBpZGVudGljYWwuXG4gICAgLy8gU2VlIHRoZSBbSGFybW9ueSBgZWdhbGAgcHJvcG9zYWxdKGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6ZWdhbCkuXG4gICAgaWYgKGEgPT09IGIpIHJldHVybiBhICE9PSAwIHx8IDEgLyBhID09IDEgLyBiO1xuICAgIC8vIEEgc3RyaWN0IGNvbXBhcmlzb24gaXMgbmVjZXNzYXJ5IGJlY2F1c2UgYG51bGwgPT0gdW5kZWZpbmVkYC5cbiAgICBpZiAoYSA9PSBudWxsIHx8IGIgPT0gbnVsbCkgcmV0dXJuIGEgPT09IGI7XG4gICAgLy8gVW53cmFwIGFueSB3cmFwcGVkIG9iamVjdHMuXG4gICAgaWYgKGEgaW5zdGFuY2VvZiBfKSBhID0gYS5fd3JhcHBlZDtcbiAgICBpZiAoYiBpbnN0YW5jZW9mIF8pIGIgPSBiLl93cmFwcGVkO1xuICAgIC8vIENvbXBhcmUgYFtbQ2xhc3NdXWAgbmFtZXMuXG4gICAgdmFyIGNsYXNzTmFtZSA9IHRvU3RyaW5nLmNhbGwoYSk7XG4gICAgaWYgKGNsYXNzTmFtZSAhPSB0b1N0cmluZy5jYWxsKGIpKSByZXR1cm4gZmFsc2U7XG4gICAgc3dpdGNoIChjbGFzc05hbWUpIHtcbiAgICAgIC8vIFN0cmluZ3MsIG51bWJlcnMsIGRhdGVzLCBhbmQgYm9vbGVhbnMgYXJlIGNvbXBhcmVkIGJ5IHZhbHVlLlxuICAgICAgY2FzZSAnW29iamVjdCBTdHJpbmddJzpcbiAgICAgICAgLy8gUHJpbWl0aXZlcyBhbmQgdGhlaXIgY29ycmVzcG9uZGluZyBvYmplY3Qgd3JhcHBlcnMgYXJlIGVxdWl2YWxlbnQ7IHRodXMsIGBcIjVcImAgaXNcbiAgICAgICAgLy8gZXF1aXZhbGVudCB0byBgbmV3IFN0cmluZyhcIjVcIilgLlxuICAgICAgICByZXR1cm4gYSA9PSBTdHJpbmcoYik7XG4gICAgICBjYXNlICdbb2JqZWN0IE51bWJlcl0nOlxuICAgICAgICAvLyBgTmFOYHMgYXJlIGVxdWl2YWxlbnQsIGJ1dCBub24tcmVmbGV4aXZlLiBBbiBgZWdhbGAgY29tcGFyaXNvbiBpcyBwZXJmb3JtZWQgZm9yXG4gICAgICAgIC8vIG90aGVyIG51bWVyaWMgdmFsdWVzLlxuICAgICAgICByZXR1cm4gYSAhPSArYSA/IGIgIT0gK2IgOiAoYSA9PSAwID8gMSAvIGEgPT0gMSAvIGIgOiBhID09ICtiKTtcbiAgICAgIGNhc2UgJ1tvYmplY3QgRGF0ZV0nOlxuICAgICAgY2FzZSAnW29iamVjdCBCb29sZWFuXSc6XG4gICAgICAgIC8vIENvZXJjZSBkYXRlcyBhbmQgYm9vbGVhbnMgdG8gbnVtZXJpYyBwcmltaXRpdmUgdmFsdWVzLiBEYXRlcyBhcmUgY29tcGFyZWQgYnkgdGhlaXJcbiAgICAgICAgLy8gbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zLiBOb3RlIHRoYXQgaW52YWxpZCBkYXRlcyB3aXRoIG1pbGxpc2Vjb25kIHJlcHJlc2VudGF0aW9uc1xuICAgICAgICAvLyBvZiBgTmFOYCBhcmUgbm90IGVxdWl2YWxlbnQuXG4gICAgICAgIHJldHVybiArYSA9PSArYjtcbiAgICAgIC8vIFJlZ0V4cHMgYXJlIGNvbXBhcmVkIGJ5IHRoZWlyIHNvdXJjZSBwYXR0ZXJucyBhbmQgZmxhZ3MuXG4gICAgICBjYXNlICdbb2JqZWN0IFJlZ0V4cF0nOlxuICAgICAgICByZXR1cm4gYS5zb3VyY2UgPT0gYi5zb3VyY2UgJiZcbiAgICAgICAgICAgICAgIGEuZ2xvYmFsID09IGIuZ2xvYmFsICYmXG4gICAgICAgICAgICAgICBhLm11bHRpbGluZSA9PSBiLm11bHRpbGluZSAmJlxuICAgICAgICAgICAgICAgYS5pZ25vcmVDYXNlID09IGIuaWdub3JlQ2FzZTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBhICE9ICdvYmplY3QnIHx8IHR5cGVvZiBiICE9ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gQXNzdW1lIGVxdWFsaXR5IGZvciBjeWNsaWMgc3RydWN0dXJlcy4gVGhlIGFsZ29yaXRobSBmb3IgZGV0ZWN0aW5nIGN5Y2xpY1xuICAgIC8vIHN0cnVjdHVyZXMgaXMgYWRhcHRlZCBmcm9tIEVTIDUuMSBzZWN0aW9uIDE1LjEyLjMsIGFic3RyYWN0IG9wZXJhdGlvbiBgSk9gLlxuICAgIHZhciBsZW5ndGggPSBhU3RhY2subGVuZ3RoO1xuICAgIHdoaWxlIChsZW5ndGgtLSkge1xuICAgICAgLy8gTGluZWFyIHNlYXJjaC4gUGVyZm9ybWFuY2UgaXMgaW52ZXJzZWx5IHByb3BvcnRpb25hbCB0byB0aGUgbnVtYmVyIG9mXG4gICAgICAvLyB1bmlxdWUgbmVzdGVkIHN0cnVjdHVyZXMuXG4gICAgICBpZiAoYVN0YWNrW2xlbmd0aF0gPT0gYSkgcmV0dXJuIGJTdGFja1tsZW5ndGhdID09IGI7XG4gICAgfVxuICAgIC8vIE9iamVjdHMgd2l0aCBkaWZmZXJlbnQgY29uc3RydWN0b3JzIGFyZSBub3QgZXF1aXZhbGVudCwgYnV0IGBPYmplY3Rgc1xuICAgIC8vIGZyb20gZGlmZmVyZW50IGZyYW1lcyBhcmUuXG4gICAgdmFyIGFDdG9yID0gYS5jb25zdHJ1Y3RvciwgYkN0b3IgPSBiLmNvbnN0cnVjdG9yO1xuICAgIGlmIChhQ3RvciAhPT0gYkN0b3IgJiYgIShfLmlzRnVuY3Rpb24oYUN0b3IpICYmIChhQ3RvciBpbnN0YW5jZW9mIGFDdG9yKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBfLmlzRnVuY3Rpb24oYkN0b3IpICYmIChiQ3RvciBpbnN0YW5jZW9mIGJDdG9yKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICYmICgnY29uc3RydWN0b3InIGluIGEgJiYgJ2NvbnN0cnVjdG9yJyBpbiBiKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyBBZGQgdGhlIGZpcnN0IG9iamVjdCB0byB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgYVN0YWNrLnB1c2goYSk7XG4gICAgYlN0YWNrLnB1c2goYik7XG4gICAgdmFyIHNpemUgPSAwLCByZXN1bHQgPSB0cnVlO1xuICAgIC8vIFJlY3Vyc2l2ZWx5IGNvbXBhcmUgb2JqZWN0cyBhbmQgYXJyYXlzLlxuICAgIGlmIChjbGFzc05hbWUgPT0gJ1tvYmplY3QgQXJyYXldJykge1xuICAgICAgLy8gQ29tcGFyZSBhcnJheSBsZW5ndGhzIHRvIGRldGVybWluZSBpZiBhIGRlZXAgY29tcGFyaXNvbiBpcyBuZWNlc3NhcnkuXG4gICAgICBzaXplID0gYS5sZW5ndGg7XG4gICAgICByZXN1bHQgPSBzaXplID09IGIubGVuZ3RoO1xuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICAvLyBEZWVwIGNvbXBhcmUgdGhlIGNvbnRlbnRzLCBpZ25vcmluZyBub24tbnVtZXJpYyBwcm9wZXJ0aWVzLlxuICAgICAgICB3aGlsZSAoc2l6ZS0tKSB7XG4gICAgICAgICAgaWYgKCEocmVzdWx0ID0gZXEoYVtzaXplXSwgYltzaXplXSwgYVN0YWNrLCBiU3RhY2spKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gRGVlcCBjb21wYXJlIG9iamVjdHMuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gYSkge1xuICAgICAgICBpZiAoXy5oYXMoYSwga2V5KSkge1xuICAgICAgICAgIC8vIENvdW50IHRoZSBleHBlY3RlZCBudW1iZXIgb2YgcHJvcGVydGllcy5cbiAgICAgICAgICBzaXplKys7XG4gICAgICAgICAgLy8gRGVlcCBjb21wYXJlIGVhY2ggbWVtYmVyLlxuICAgICAgICAgIGlmICghKHJlc3VsdCA9IF8uaGFzKGIsIGtleSkgJiYgZXEoYVtrZXldLCBiW2tleV0sIGFTdGFjaywgYlN0YWNrKSkpIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICAvLyBFbnN1cmUgdGhhdCBib3RoIG9iamVjdHMgY29udGFpbiB0aGUgc2FtZSBudW1iZXIgb2YgcHJvcGVydGllcy5cbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgZm9yIChrZXkgaW4gYikge1xuICAgICAgICAgIGlmIChfLmhhcyhiLCBrZXkpICYmICEoc2l6ZS0tKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgcmVzdWx0ID0gIXNpemU7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIFJlbW92ZSB0aGUgZmlyc3Qgb2JqZWN0IGZyb20gdGhlIHN0YWNrIG9mIHRyYXZlcnNlZCBvYmplY3RzLlxuICAgIGFTdGFjay5wb3AoKTtcbiAgICBiU3RhY2sucG9wKCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBQZXJmb3JtIGEgZGVlcCBjb21wYXJpc29uIHRvIGNoZWNrIGlmIHR3byBvYmplY3RzIGFyZSBlcXVhbC5cbiAgXy5pc0VxdWFsID0gZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBlcShhLCBiLCBbXSwgW10pO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gYXJyYXksIHN0cmluZywgb3Igb2JqZWN0IGVtcHR5P1xuICAvLyBBbiBcImVtcHR5XCIgb2JqZWN0IGhhcyBubyBlbnVtZXJhYmxlIG93bi1wcm9wZXJ0aWVzLlxuICBfLmlzRW1wdHkgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiB0cnVlO1xuICAgIGlmIChfLmlzQXJyYXkob2JqKSB8fCBfLmlzU3RyaW5nKG9iaikpIHJldHVybiBvYmoubGVuZ3RoID09PSAwO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChfLmhhcyhvYmosIGtleSkpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgRE9NIGVsZW1lbnQ/XG4gIF8uaXNFbGVtZW50ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuICEhKG9iaiAmJiBvYmoubm9kZVR5cGUgPT09IDEpO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYW4gYXJyYXk/XG4gIC8vIERlbGVnYXRlcyB0byBFQ01BNSdzIG5hdGl2ZSBBcnJheS5pc0FycmF5XG4gIF8uaXNBcnJheSA9IG5hdGl2ZUlzQXJyYXkgfHwgZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBBcnJheV0nO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFyaWFibGUgYW4gb2JqZWN0P1xuICBfLmlzT2JqZWN0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gT2JqZWN0KG9iaik7XG4gIH07XG5cbiAgLy8gQWRkIHNvbWUgaXNUeXBlIG1ldGhvZHM6IGlzQXJndW1lbnRzLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzRGF0ZSwgaXNSZWdFeHAuXG4gIGVhY2goWydBcmd1bWVudHMnLCAnRnVuY3Rpb24nLCAnU3RyaW5nJywgJ051bWJlcicsICdEYXRlJywgJ1JlZ0V4cCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgX1snaXMnICsgbmFtZV0gPSBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgJyArIG5hbWUgKyAnXSc7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gRGVmaW5lIGEgZmFsbGJhY2sgdmVyc2lvbiBvZiB0aGUgbWV0aG9kIGluIGJyb3dzZXJzIChhaGVtLCBJRSksIHdoZXJlXG4gIC8vIHRoZXJlIGlzbid0IGFueSBpbnNwZWN0YWJsZSBcIkFyZ3VtZW50c1wiIHR5cGUuXG4gIGlmICghXy5pc0FyZ3VtZW50cyhhcmd1bWVudHMpKSB7XG4gICAgXy5pc0FyZ3VtZW50cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuICEhKG9iaiAmJiBfLmhhcyhvYmosICdjYWxsZWUnKSk7XG4gICAgfTtcbiAgfVxuXG4gIC8vIE9wdGltaXplIGBpc0Z1bmN0aW9uYCBpZiBhcHByb3ByaWF0ZS5cbiAgaWYgKHR5cGVvZiAoLy4vKSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIF8uaXNGdW5jdGlvbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdmdW5jdGlvbic7XG4gICAgfTtcbiAgfVxuXG4gIC8vIElzIGEgZ2l2ZW4gb2JqZWN0IGEgZmluaXRlIG51bWJlcj9cbiAgXy5pc0Zpbml0ZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBpc0Zpbml0ZShvYmopICYmICFpc05hTihwYXJzZUZsb2F0KG9iaikpO1xuICB9O1xuXG4gIC8vIElzIHRoZSBnaXZlbiB2YWx1ZSBgTmFOYD8gKE5hTiBpcyB0aGUgb25seSBudW1iZXIgd2hpY2ggZG9lcyBub3QgZXF1YWwgaXRzZWxmKS5cbiAgXy5pc05hTiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBfLmlzTnVtYmVyKG9iaikgJiYgb2JqICE9ICtvYmo7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhIGJvb2xlYW4/XG4gIF8uaXNCb29sZWFuID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gdHJ1ZSB8fCBvYmogPT09IGZhbHNlIHx8IHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBCb29sZWFuXSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBlcXVhbCB0byBudWxsP1xuICBfLmlzTnVsbCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IG51bGw7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSB1bmRlZmluZWQ/XG4gIF8uaXNVbmRlZmluZWQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB2b2lkIDA7XG4gIH07XG5cbiAgLy8gU2hvcnRjdXQgZnVuY3Rpb24gZm9yIGNoZWNraW5nIGlmIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBwcm9wZXJ0eSBkaXJlY3RseVxuICAvLyBvbiBpdHNlbGYgKGluIG90aGVyIHdvcmRzLCBub3Qgb24gYSBwcm90b3R5cGUpLlxuICBfLmhhcyA9IGZ1bmN0aW9uKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIGhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpO1xuICB9O1xuXG4gIC8vIFV0aWxpdHkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gUnVuIFVuZGVyc2NvcmUuanMgaW4gKm5vQ29uZmxpY3QqIG1vZGUsIHJldHVybmluZyB0aGUgYF9gIHZhcmlhYmxlIHRvIGl0c1xuICAvLyBwcmV2aW91cyBvd25lci4gUmV0dXJucyBhIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubm9Db25mbGljdCA9IGZ1bmN0aW9uKCkge1xuICAgIHJvb3QuXyA9IHByZXZpb3VzVW5kZXJzY29yZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvLyBLZWVwIHRoZSBpZGVudGl0eSBmdW5jdGlvbiBhcm91bmQgZm9yIGRlZmF1bHQgaXRlcmF0b3JzLlxuICBfLmlkZW50aXR5ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH07XG5cbiAgXy5jb25zdGFudCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9O1xuICB9O1xuXG4gIF8ucHJvcGVydHkgPSBmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gb2JqW2tleV07XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgcHJlZGljYXRlIGZvciBjaGVja2luZyB3aGV0aGVyIGFuIG9iamVjdCBoYXMgYSBnaXZlbiBzZXQgb2YgYGtleTp2YWx1ZWAgcGFpcnMuXG4gIF8ubWF0Y2hlcyA9IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgaWYgKG9iaiA9PT0gYXR0cnMpIHJldHVybiB0cnVlOyAvL2F2b2lkIGNvbXBhcmluZyBhbiBvYmplY3QgdG8gaXRzZWxmLlxuICAgICAgZm9yICh2YXIga2V5IGluIGF0dHJzKSB7XG4gICAgICAgIGlmIChhdHRyc1trZXldICE9PSBvYmpba2V5XSlcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH07XG5cbiAgLy8gUnVuIGEgZnVuY3Rpb24gKipuKiogdGltZXMuXG4gIF8udGltZXMgPSBmdW5jdGlvbihuLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIHZhciBhY2N1bSA9IEFycmF5KE1hdGgubWF4KDAsIG4pKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykgYWNjdW1baV0gPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIGkpO1xuICAgIHJldHVybiBhY2N1bTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSByYW5kb20gaW50ZWdlciBiZXR3ZWVuIG1pbiBhbmQgbWF4IChpbmNsdXNpdmUpLlxuICBfLnJhbmRvbSA9IGZ1bmN0aW9uKG1pbiwgbWF4KSB7XG4gICAgaWYgKG1heCA9PSBudWxsKSB7XG4gICAgICBtYXggPSBtaW47XG4gICAgICBtaW4gPSAwO1xuICAgIH1cbiAgICByZXR1cm4gbWluICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKTtcbiAgfTtcblxuICAvLyBBIChwb3NzaWJseSBmYXN0ZXIpIHdheSB0byBnZXQgdGhlIGN1cnJlbnQgdGltZXN0YW1wIGFzIGFuIGludGVnZXIuXG4gIF8ubm93ID0gRGF0ZS5ub3cgfHwgZnVuY3Rpb24oKSB7IHJldHVybiBuZXcgRGF0ZSgpLmdldFRpbWUoKTsgfTtcblxuICAvLyBMaXN0IG9mIEhUTUwgZW50aXRpZXMgZm9yIGVzY2FwaW5nLlxuICB2YXIgZW50aXR5TWFwID0ge1xuICAgIGVzY2FwZToge1xuICAgICAgJyYnOiAnJmFtcDsnLFxuICAgICAgJzwnOiAnJmx0OycsXG4gICAgICAnPic6ICcmZ3Q7JyxcbiAgICAgICdcIic6ICcmcXVvdDsnLFxuICAgICAgXCInXCI6ICcmI3gyNzsnXG4gICAgfVxuICB9O1xuICBlbnRpdHlNYXAudW5lc2NhcGUgPSBfLmludmVydChlbnRpdHlNYXAuZXNjYXBlKTtcblxuICAvLyBSZWdleGVzIGNvbnRhaW5pbmcgdGhlIGtleXMgYW5kIHZhbHVlcyBsaXN0ZWQgaW1tZWRpYXRlbHkgYWJvdmUuXG4gIHZhciBlbnRpdHlSZWdleGVzID0ge1xuICAgIGVzY2FwZTogICBuZXcgUmVnRXhwKCdbJyArIF8ua2V5cyhlbnRpdHlNYXAuZXNjYXBlKS5qb2luKCcnKSArICddJywgJ2cnKSxcbiAgICB1bmVzY2FwZTogbmV3IFJlZ0V4cCgnKCcgKyBfLmtleXMoZW50aXR5TWFwLnVuZXNjYXBlKS5qb2luKCd8JykgKyAnKScsICdnJylcbiAgfTtcblxuICAvLyBGdW5jdGlvbnMgZm9yIGVzY2FwaW5nIGFuZCB1bmVzY2FwaW5nIHN0cmluZ3MgdG8vZnJvbSBIVE1MIGludGVycG9sYXRpb24uXG4gIF8uZWFjaChbJ2VzY2FwZScsICd1bmVzY2FwZSddLCBmdW5jdGlvbihtZXRob2QpIHtcbiAgICBfW21ldGhvZF0gPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgIGlmIChzdHJpbmcgPT0gbnVsbCkgcmV0dXJuICcnO1xuICAgICAgcmV0dXJuICgnJyArIHN0cmluZykucmVwbGFjZShlbnRpdHlSZWdleGVzW21ldGhvZF0sIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgIHJldHVybiBlbnRpdHlNYXBbbWV0aG9kXVttYXRjaF07XG4gICAgICB9KTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBJZiB0aGUgdmFsdWUgb2YgdGhlIG5hbWVkIGBwcm9wZXJ0eWAgaXMgYSBmdW5jdGlvbiB0aGVuIGludm9rZSBpdCB3aXRoIHRoZVxuICAvLyBgb2JqZWN0YCBhcyBjb250ZXh0OyBvdGhlcndpc2UsIHJldHVybiBpdC5cbiAgXy5yZXN1bHQgPSBmdW5jdGlvbihvYmplY3QsIHByb3BlcnR5KSB7XG4gICAgaWYgKG9iamVjdCA9PSBudWxsKSByZXR1cm4gdm9pZCAwO1xuICAgIHZhciB2YWx1ZSA9IG9iamVjdFtwcm9wZXJ0eV07XG4gICAgcmV0dXJuIF8uaXNGdW5jdGlvbih2YWx1ZSkgPyB2YWx1ZS5jYWxsKG9iamVjdCkgOiB2YWx1ZTtcbiAgfTtcblxuICAvLyBBZGQgeW91ciBvd24gY3VzdG9tIGZ1bmN0aW9ucyB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QuXG4gIF8ubWl4aW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICBlYWNoKF8uZnVuY3Rpb25zKG9iaiksIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBmdW5jID0gX1tuYW1lXSA9IG9ialtuYW1lXTtcbiAgICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhcmdzID0gW3RoaXMuX3dyYXBwZWRdO1xuICAgICAgICBwdXNoLmFwcGx5KGFyZ3MsIGFyZ3VtZW50cyk7XG4gICAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBmdW5jLmFwcGx5KF8sIGFyZ3MpKTtcbiAgICAgIH07XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gR2VuZXJhdGUgYSB1bmlxdWUgaW50ZWdlciBpZCAodW5pcXVlIHdpdGhpbiB0aGUgZW50aXJlIGNsaWVudCBzZXNzaW9uKS5cbiAgLy8gVXNlZnVsIGZvciB0ZW1wb3JhcnkgRE9NIGlkcy5cbiAgdmFyIGlkQ291bnRlciA9IDA7XG4gIF8udW5pcXVlSWQgPSBmdW5jdGlvbihwcmVmaXgpIHtcbiAgICB2YXIgaWQgPSArK2lkQ291bnRlciArICcnO1xuICAgIHJldHVybiBwcmVmaXggPyBwcmVmaXggKyBpZCA6IGlkO1xuICB9O1xuXG4gIC8vIEJ5IGRlZmF1bHQsIFVuZGVyc2NvcmUgdXNlcyBFUkItc3R5bGUgdGVtcGxhdGUgZGVsaW1pdGVycywgY2hhbmdlIHRoZVxuICAvLyBmb2xsb3dpbmcgdGVtcGxhdGUgc2V0dGluZ3MgdG8gdXNlIGFsdGVybmF0aXZlIGRlbGltaXRlcnMuXG4gIF8udGVtcGxhdGVTZXR0aW5ncyA9IHtcbiAgICBldmFsdWF0ZSAgICA6IC88JShbXFxzXFxTXSs/KSU+L2csXG4gICAgaW50ZXJwb2xhdGUgOiAvPCU9KFtcXHNcXFNdKz8pJT4vZyxcbiAgICBlc2NhcGUgICAgICA6IC88JS0oW1xcc1xcU10rPyklPi9nXG4gIH07XG5cbiAgLy8gV2hlbiBjdXN0b21pemluZyBgdGVtcGxhdGVTZXR0aW5nc2AsIGlmIHlvdSBkb24ndCB3YW50IHRvIGRlZmluZSBhblxuICAvLyBpbnRlcnBvbGF0aW9uLCBldmFsdWF0aW9uIG9yIGVzY2FwaW5nIHJlZ2V4LCB3ZSBuZWVkIG9uZSB0aGF0IGlzXG4gIC8vIGd1YXJhbnRlZWQgbm90IHRvIG1hdGNoLlxuICB2YXIgbm9NYXRjaCA9IC8oLileLztcblxuICAvLyBDZXJ0YWluIGNoYXJhY3RlcnMgbmVlZCB0byBiZSBlc2NhcGVkIHNvIHRoYXQgdGhleSBjYW4gYmUgcHV0IGludG8gYVxuICAvLyBzdHJpbmcgbGl0ZXJhbC5cbiAgdmFyIGVzY2FwZXMgPSB7XG4gICAgXCInXCI6ICAgICAgXCInXCIsXG4gICAgJ1xcXFwnOiAgICAgJ1xcXFwnLFxuICAgICdcXHInOiAgICAgJ3InLFxuICAgICdcXG4nOiAgICAgJ24nLFxuICAgICdcXHQnOiAgICAgJ3QnLFxuICAgICdcXHUyMDI4JzogJ3UyMDI4JyxcbiAgICAnXFx1MjAyOSc6ICd1MjAyOSdcbiAgfTtcblxuICB2YXIgZXNjYXBlciA9IC9cXFxcfCd8XFxyfFxcbnxcXHR8XFx1MjAyOHxcXHUyMDI5L2c7XG5cbiAgLy8gSmF2YVNjcmlwdCBtaWNyby10ZW1wbGF0aW5nLCBzaW1pbGFyIHRvIEpvaG4gUmVzaWcncyBpbXBsZW1lbnRhdGlvbi5cbiAgLy8gVW5kZXJzY29yZSB0ZW1wbGF0aW5nIGhhbmRsZXMgYXJiaXRyYXJ5IGRlbGltaXRlcnMsIHByZXNlcnZlcyB3aGl0ZXNwYWNlLFxuICAvLyBhbmQgY29ycmVjdGx5IGVzY2FwZXMgcXVvdGVzIHdpdGhpbiBpbnRlcnBvbGF0ZWQgY29kZS5cbiAgXy50ZW1wbGF0ZSA9IGZ1bmN0aW9uKHRleHQsIGRhdGEsIHNldHRpbmdzKSB7XG4gICAgdmFyIHJlbmRlcjtcbiAgICBzZXR0aW5ncyA9IF8uZGVmYXVsdHMoe30sIHNldHRpbmdzLCBfLnRlbXBsYXRlU2V0dGluZ3MpO1xuXG4gICAgLy8gQ29tYmluZSBkZWxpbWl0ZXJzIGludG8gb25lIHJlZ3VsYXIgZXhwcmVzc2lvbiB2aWEgYWx0ZXJuYXRpb24uXG4gICAgdmFyIG1hdGNoZXIgPSBuZXcgUmVnRXhwKFtcbiAgICAgIChzZXR0aW5ncy5lc2NhcGUgfHwgbm9NYXRjaCkuc291cmNlLFxuICAgICAgKHNldHRpbmdzLmludGVycG9sYXRlIHx8IG5vTWF0Y2gpLnNvdXJjZSxcbiAgICAgIChzZXR0aW5ncy5ldmFsdWF0ZSB8fCBub01hdGNoKS5zb3VyY2VcbiAgICBdLmpvaW4oJ3wnKSArICd8JCcsICdnJyk7XG5cbiAgICAvLyBDb21waWxlIHRoZSB0ZW1wbGF0ZSBzb3VyY2UsIGVzY2FwaW5nIHN0cmluZyBsaXRlcmFscyBhcHByb3ByaWF0ZWx5LlxuICAgIHZhciBpbmRleCA9IDA7XG4gICAgdmFyIHNvdXJjZSA9IFwiX19wKz0nXCI7XG4gICAgdGV4dC5yZXBsYWNlKG1hdGNoZXIsIGZ1bmN0aW9uKG1hdGNoLCBlc2NhcGUsIGludGVycG9sYXRlLCBldmFsdWF0ZSwgb2Zmc2V0KSB7XG4gICAgICBzb3VyY2UgKz0gdGV4dC5zbGljZShpbmRleCwgb2Zmc2V0KVxuICAgICAgICAucmVwbGFjZShlc2NhcGVyLCBmdW5jdGlvbihtYXRjaCkgeyByZXR1cm4gJ1xcXFwnICsgZXNjYXBlc1ttYXRjaF07IH0pO1xuXG4gICAgICBpZiAoZXNjYXBlKSB7XG4gICAgICAgIHNvdXJjZSArPSBcIicrXFxuKChfX3Q9KFwiICsgZXNjYXBlICsgXCIpKT09bnVsbD8nJzpfLmVzY2FwZShfX3QpKStcXG4nXCI7XG4gICAgICB9XG4gICAgICBpZiAoaW50ZXJwb2xhdGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBpbnRlcnBvbGF0ZSArIFwiKSk9PW51bGw/Jyc6X190KStcXG4nXCI7XG4gICAgICB9XG4gICAgICBpZiAoZXZhbHVhdGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJztcXG5cIiArIGV2YWx1YXRlICsgXCJcXG5fX3ArPSdcIjtcbiAgICAgIH1cbiAgICAgIGluZGV4ID0gb2Zmc2V0ICsgbWF0Y2gubGVuZ3RoO1xuICAgICAgcmV0dXJuIG1hdGNoO1xuICAgIH0pO1xuICAgIHNvdXJjZSArPSBcIic7XFxuXCI7XG5cbiAgICAvLyBJZiBhIHZhcmlhYmxlIGlzIG5vdCBzcGVjaWZpZWQsIHBsYWNlIGRhdGEgdmFsdWVzIGluIGxvY2FsIHNjb3BlLlxuICAgIGlmICghc2V0dGluZ3MudmFyaWFibGUpIHNvdXJjZSA9ICd3aXRoKG9ianx8e30pe1xcbicgKyBzb3VyY2UgKyAnfVxcbic7XG5cbiAgICBzb3VyY2UgPSBcInZhciBfX3QsX19wPScnLF9faj1BcnJheS5wcm90b3R5cGUuam9pbixcIiArXG4gICAgICBcInByaW50PWZ1bmN0aW9uKCl7X19wKz1fX2ouY2FsbChhcmd1bWVudHMsJycpO307XFxuXCIgK1xuICAgICAgc291cmNlICsgXCJyZXR1cm4gX19wO1xcblwiO1xuXG4gICAgdHJ5IHtcbiAgICAgIHJlbmRlciA9IG5ldyBGdW5jdGlvbihzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJywgJ18nLCBzb3VyY2UpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGUuc291cmNlID0gc291cmNlO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICBpZiAoZGF0YSkgcmV0dXJuIHJlbmRlcihkYXRhLCBfKTtcbiAgICB2YXIgdGVtcGxhdGUgPSBmdW5jdGlvbihkYXRhKSB7XG4gICAgICByZXR1cm4gcmVuZGVyLmNhbGwodGhpcywgZGF0YSwgXyk7XG4gICAgfTtcblxuICAgIC8vIFByb3ZpZGUgdGhlIGNvbXBpbGVkIGZ1bmN0aW9uIHNvdXJjZSBhcyBhIGNvbnZlbmllbmNlIGZvciBwcmVjb21waWxhdGlvbi5cbiAgICB0ZW1wbGF0ZS5zb3VyY2UgPSAnZnVuY3Rpb24oJyArIChzZXR0aW5ncy52YXJpYWJsZSB8fCAnb2JqJykgKyAnKXtcXG4nICsgc291cmNlICsgJ30nO1xuXG4gICAgcmV0dXJuIHRlbXBsYXRlO1xuICB9O1xuXG4gIC8vIEFkZCBhIFwiY2hhaW5cIiBmdW5jdGlvbiwgd2hpY2ggd2lsbCBkZWxlZ2F0ZSB0byB0aGUgd3JhcHBlci5cbiAgXy5jaGFpbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBfKG9iaikuY2hhaW4oKTtcbiAgfTtcblxuICAvLyBPT1BcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG4gIC8vIElmIFVuZGVyc2NvcmUgaXMgY2FsbGVkIGFzIGEgZnVuY3Rpb24sIGl0IHJldHVybnMgYSB3cmFwcGVkIG9iamVjdCB0aGF0XG4gIC8vIGNhbiBiZSB1c2VkIE9PLXN0eWxlLiBUaGlzIHdyYXBwZXIgaG9sZHMgYWx0ZXJlZCB2ZXJzaW9ucyBvZiBhbGwgdGhlXG4gIC8vIHVuZGVyc2NvcmUgZnVuY3Rpb25zLiBXcmFwcGVkIG9iamVjdHMgbWF5IGJlIGNoYWluZWQuXG5cbiAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNvbnRpbnVlIGNoYWluaW5nIGludGVybWVkaWF0ZSByZXN1bHRzLlxuICB2YXIgcmVzdWx0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NoYWluID8gXyhvYmopLmNoYWluKCkgOiBvYmo7XG4gIH07XG5cbiAgLy8gQWRkIGFsbCBvZiB0aGUgVW5kZXJzY29yZSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIgb2JqZWN0LlxuICBfLm1peGluKF8pO1xuXG4gIC8vIEFkZCBhbGwgbXV0YXRvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIGVhY2goWydwb3AnLCAncHVzaCcsICdyZXZlcnNlJywgJ3NoaWZ0JywgJ3NvcnQnLCAnc3BsaWNlJywgJ3Vuc2hpZnQnXSwgZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBtZXRob2QgPSBBcnJheVByb3RvW25hbWVdO1xuICAgIF8ucHJvdG90eXBlW25hbWVdID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgb2JqID0gdGhpcy5fd3JhcHBlZDtcbiAgICAgIG1ldGhvZC5hcHBseShvYmosIGFyZ3VtZW50cyk7XG4gICAgICBpZiAoKG5hbWUgPT0gJ3NoaWZ0JyB8fCBuYW1lID09ICdzcGxpY2UnKSAmJiBvYmoubGVuZ3RoID09PSAwKSBkZWxldGUgb2JqWzBdO1xuICAgICAgcmV0dXJuIHJlc3VsdC5jYWxsKHRoaXMsIG9iaik7XG4gICAgfTtcbiAgfSk7XG5cbiAgLy8gQWRkIGFsbCBhY2Nlc3NvciBBcnJheSBmdW5jdGlvbnMgdG8gdGhlIHdyYXBwZXIuXG4gIGVhY2goWydjb25jYXQnLCAnam9pbicsICdzbGljZSddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiByZXN1bHQuY2FsbCh0aGlzLCBtZXRob2QuYXBwbHkodGhpcy5fd3JhcHBlZCwgYXJndW1lbnRzKSk7XG4gICAgfTtcbiAgfSk7XG5cbiAgXy5leHRlbmQoXy5wcm90b3R5cGUsIHtcblxuICAgIC8vIFN0YXJ0IGNoYWluaW5nIGEgd3JhcHBlZCBVbmRlcnNjb3JlIG9iamVjdC5cbiAgICBjaGFpbjogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLl9jaGFpbiA9IHRydWU7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuXG4gICAgLy8gRXh0cmFjdHMgdGhlIHJlc3VsdCBmcm9tIGEgd3JhcHBlZCBhbmQgY2hhaW5lZCBvYmplY3QuXG4gICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX3dyYXBwZWQ7XG4gICAgfVxuXG4gIH0pO1xuXG4gIC8vIEFNRCByZWdpc3RyYXRpb24gaGFwcGVucyBhdCB0aGUgZW5kIGZvciBjb21wYXRpYmlsaXR5IHdpdGggQU1EIGxvYWRlcnNcbiAgLy8gdGhhdCBtYXkgbm90IGVuZm9yY2UgbmV4dC10dXJuIHNlbWFudGljcyBvbiBtb2R1bGVzLiBFdmVuIHRob3VnaCBnZW5lcmFsXG4gIC8vIHByYWN0aWNlIGZvciBBTUQgcmVnaXN0cmF0aW9uIGlzIHRvIGJlIGFub255bW91cywgdW5kZXJzY29yZSByZWdpc3RlcnNcbiAgLy8gYXMgYSBuYW1lZCBtb2R1bGUgYmVjYXVzZSwgbGlrZSBqUXVlcnksIGl0IGlzIGEgYmFzZSBsaWJyYXJ5IHRoYXQgaXNcbiAgLy8gcG9wdWxhciBlbm91Z2ggdG8gYmUgYnVuZGxlZCBpbiBhIHRoaXJkIHBhcnR5IGxpYiwgYnV0IG5vdCBiZSBwYXJ0IG9mXG4gIC8vIGFuIEFNRCBsb2FkIHJlcXVlc3QuIFRob3NlIGNhc2VzIGNvdWxkIGdlbmVyYXRlIGFuIGVycm9yIHdoZW4gYW5cbiAgLy8gYW5vbnltb3VzIGRlZmluZSgpIGlzIGNhbGxlZCBvdXRzaWRlIG9mIGEgbG9hZGVyIHJlcXVlc3QuXG4gIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoJ3VuZGVyc2NvcmUnLCBbXSwgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gXztcbiAgICB9KTtcbiAgfVxufSkuY2FsbCh0aGlzKTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn1cblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0J1xuICAgICYmIHR5cGVvZiBhcmcuY29weSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcuZmlsbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcucmVhZFVJbnQ4ID09PSAnZnVuY3Rpb24nO1xufSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwpe1xuLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuXG59KS5jYWxsKHRoaXMscmVxdWlyZShcIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5zZXJ0LW1vZHVsZS1nbG9iYWxzL25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanNcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIm1vZHVsZS5leHBvcnRzID0gaGFzS2V5c1xuXG5mdW5jdGlvbiBoYXNLZXlzKHNvdXJjZSkge1xuICAgIHJldHVybiBzb3VyY2UgIT09IG51bGwgJiZcbiAgICAgICAgKHR5cGVvZiBzb3VyY2UgPT09IFwib2JqZWN0XCIgfHxcbiAgICAgICAgdHlwZW9mIHNvdXJjZSA9PT0gXCJmdW5jdGlvblwiKVxufVxuIiwidmFyIEtleXMgPSByZXF1aXJlKFwib2JqZWN0LWtleXNcIilcbnZhciBoYXNLZXlzID0gcmVxdWlyZShcIi4vaGFzLWtleXNcIilcblxubW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuICAgIHZhciB0YXJnZXQgPSB7fVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGlmICghaGFzS2V5cyhzb3VyY2UpKSB7XG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGtleXMgPSBLZXlzKHNvdXJjZSlcblxuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGtleXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIHZhciBuYW1lID0ga2V5c1tqXVxuICAgICAgICAgICAgdGFyZ2V0W25hbWVdID0gc291cmNlW25hbWVdXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0XG59XG4iLCJ2YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbnZhciBpc0Z1bmN0aW9uID0gZnVuY3Rpb24gKGZuKSB7XG5cdHZhciBpc0Z1bmMgPSAodHlwZW9mIGZuID09PSAnZnVuY3Rpb24nICYmICEoZm4gaW5zdGFuY2VvZiBSZWdFeHApKSB8fCB0b1N0cmluZy5jYWxsKGZuKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcblx0aWYgKCFpc0Z1bmMgJiYgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRpc0Z1bmMgPSBmbiA9PT0gd2luZG93LnNldFRpbWVvdXQgfHwgZm4gPT09IHdpbmRvdy5hbGVydCB8fCBmbiA9PT0gd2luZG93LmNvbmZpcm0gfHwgZm4gPT09IHdpbmRvdy5wcm9tcHQ7XG5cdH1cblx0cmV0dXJuIGlzRnVuYztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZm9yRWFjaChvYmosIGZuKSB7XG5cdGlmICghaXNGdW5jdGlvbihmbikpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdpdGVyYXRvciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblx0fVxuXHR2YXIgaSwgayxcblx0XHRpc1N0cmluZyA9IHR5cGVvZiBvYmogPT09ICdzdHJpbmcnLFxuXHRcdGwgPSBvYmoubGVuZ3RoLFxuXHRcdGNvbnRleHQgPSBhcmd1bWVudHMubGVuZ3RoID4gMiA/IGFyZ3VtZW50c1syXSA6IG51bGw7XG5cdGlmIChsID09PSArbCkge1xuXHRcdGZvciAoaSA9IDA7IGkgPCBsOyBpKyspIHtcblx0XHRcdGlmIChjb250ZXh0ID09PSBudWxsKSB7XG5cdFx0XHRcdGZuKGlzU3RyaW5nID8gb2JqLmNoYXJBdChpKSA6IG9ialtpXSwgaSwgb2JqKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGZuLmNhbGwoY29udGV4dCwgaXNTdHJpbmcgPyBvYmouY2hhckF0KGkpIDogb2JqW2ldLCBpLCBvYmopO1xuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRmb3IgKGsgaW4gb2JqKSB7XG5cdFx0XHRpZiAoaGFzT3duLmNhbGwob2JqLCBrKSkge1xuXHRcdFx0XHRpZiAoY29udGV4dCA9PT0gbnVsbCkge1xuXHRcdFx0XHRcdGZuKG9ialtrXSwgaywgb2JqKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRmbi5jYWxsKGNvbnRleHQsIG9ialtrXSwgaywgb2JqKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxufTtcblxuIiwibW9kdWxlLmV4cG9ydHMgPSBPYmplY3Qua2V5cyB8fCByZXF1aXJlKCcuL3NoaW0nKTtcblxuIiwidmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0FyZ3VtZW50cyh2YWx1ZSkge1xuXHR2YXIgc3RyID0gdG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG5cdHZhciBpc0FyZ3VtZW50cyA9IHN0ciA9PT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG5cdGlmICghaXNBcmd1bWVudHMpIHtcblx0XHRpc0FyZ3VtZW50cyA9IHN0ciAhPT0gJ1tvYmplY3QgQXJyYXldJ1xuXHRcdFx0JiYgdmFsdWUgIT09IG51bGxcblx0XHRcdCYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCdcblx0XHRcdCYmIHR5cGVvZiB2YWx1ZS5sZW5ndGggPT09ICdudW1iZXInXG5cdFx0XHQmJiB2YWx1ZS5sZW5ndGggPj0gMFxuXHRcdFx0JiYgdG9TdHJpbmcuY2FsbCh2YWx1ZS5jYWxsZWUpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuXHR9XG5cdHJldHVybiBpc0FyZ3VtZW50cztcbn07XG5cbiIsIihmdW5jdGlvbiAoKSB7XG5cdFwidXNlIHN0cmljdFwiO1xuXG5cdC8vIG1vZGlmaWVkIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2tyaXNrb3dhbC9lczUtc2hpbVxuXHR2YXIgaGFzID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSxcblx0XHR0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG5cdFx0Zm9yRWFjaCA9IHJlcXVpcmUoJy4vZm9yZWFjaCcpLFxuXHRcdGlzQXJncyA9IHJlcXVpcmUoJy4vaXNBcmd1bWVudHMnKSxcblx0XHRoYXNEb250RW51bUJ1ZyA9ICEoeyd0b1N0cmluZyc6IG51bGx9KS5wcm9wZXJ0eUlzRW51bWVyYWJsZSgndG9TdHJpbmcnKSxcblx0XHRoYXNQcm90b0VudW1CdWcgPSAoZnVuY3Rpb24gKCkge30pLnByb3BlcnR5SXNFbnVtZXJhYmxlKCdwcm90b3R5cGUnKSxcblx0XHRkb250RW51bXMgPSBbXG5cdFx0XHRcInRvU3RyaW5nXCIsXG5cdFx0XHRcInRvTG9jYWxlU3RyaW5nXCIsXG5cdFx0XHRcInZhbHVlT2ZcIixcblx0XHRcdFwiaGFzT3duUHJvcGVydHlcIixcblx0XHRcdFwiaXNQcm90b3R5cGVPZlwiLFxuXHRcdFx0XCJwcm9wZXJ0eUlzRW51bWVyYWJsZVwiLFxuXHRcdFx0XCJjb25zdHJ1Y3RvclwiXG5cdFx0XSxcblx0XHRrZXlzU2hpbTtcblxuXHRrZXlzU2hpbSA9IGZ1bmN0aW9uIGtleXMob2JqZWN0KSB7XG5cdFx0dmFyIGlzT2JqZWN0ID0gb2JqZWN0ICE9PSBudWxsICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnLFxuXHRcdFx0aXNGdW5jdGlvbiA9IHRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJyxcblx0XHRcdGlzQXJndW1lbnRzID0gaXNBcmdzKG9iamVjdCksXG5cdFx0XHR0aGVLZXlzID0gW107XG5cblx0XHRpZiAoIWlzT2JqZWN0ICYmICFpc0Z1bmN0aW9uICYmICFpc0FyZ3VtZW50cykge1xuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdC5rZXlzIGNhbGxlZCBvbiBhIG5vbi1vYmplY3RcIik7XG5cdFx0fVxuXG5cdFx0aWYgKGlzQXJndW1lbnRzKSB7XG5cdFx0XHRmb3JFYWNoKG9iamVjdCwgZnVuY3Rpb24gKHZhbHVlKSB7XG5cdFx0XHRcdHRoZUtleXMucHVzaCh2YWx1ZSk7XG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIG5hbWUsXG5cdFx0XHRcdHNraXBQcm90byA9IGhhc1Byb3RvRW51bUJ1ZyAmJiBpc0Z1bmN0aW9uO1xuXG5cdFx0XHRmb3IgKG5hbWUgaW4gb2JqZWN0KSB7XG5cdFx0XHRcdGlmICghKHNraXBQcm90byAmJiBuYW1lID09PSAncHJvdG90eXBlJykgJiYgaGFzLmNhbGwob2JqZWN0LCBuYW1lKSkge1xuXHRcdFx0XHRcdHRoZUtleXMucHVzaChuYW1lKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmIChoYXNEb250RW51bUJ1Zykge1xuXHRcdFx0dmFyIGN0b3IgPSBvYmplY3QuY29uc3RydWN0b3IsXG5cdFx0XHRcdHNraXBDb25zdHJ1Y3RvciA9IGN0b3IgJiYgY3Rvci5wcm90b3R5cGUgPT09IG9iamVjdDtcblxuXHRcdFx0Zm9yRWFjaChkb250RW51bXMsIGZ1bmN0aW9uIChkb250RW51bSkge1xuXHRcdFx0XHRpZiAoIShza2lwQ29uc3RydWN0b3IgJiYgZG9udEVudW0gPT09ICdjb25zdHJ1Y3RvcicpICYmIGhhcy5jYWxsKG9iamVjdCwgZG9udEVudW0pKSB7XG5cdFx0XHRcdFx0dGhlS2V5cy5wdXNoKGRvbnRFbnVtKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGVLZXlzO1xuXHR9O1xuXG5cdG1vZHVsZS5leHBvcnRzID0ga2V5c1NoaW07XG59KCkpO1xuXG4iXX0=
