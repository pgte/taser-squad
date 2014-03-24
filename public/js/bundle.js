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

// setInterval(function() {
//   if (controller) controller.deactivate();
  soldierNr = (soldierNr + 1) % soldiers.length;
  soldier = soldiers[soldierNr];
  controller = game.controllers.control(soldier);
// }, 3000);
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./lib/game":8}],4:[function(require,module,exports){
var extend  = require('xtend');
var tilemap = require('./tilemap');
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
  self.update = update;

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
    var item = this.grid.createItem(object.image(), options.x, options.y, createdItem);
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
    }
  }
}


/// update

function update(object) {
  var item = object.item;
  if (! item) throw new Error('No object.item');
  item.element.attr('src', object.image());
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

    this.grid.moveItem(item, x, y);
    object.x = x;
    object.y = y;

    this.objectsAt(x, y).push(object);

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
},{"./characters":6,"./tilemap":10,"./tiles":11,"./wall_types":13,"./walls":14,"underscore":16,"xtend":23}],5:[function(require,module,exports){
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

TileMap.prototype.imagePos = function (image, x, y) {
    var w = this.toWorld(x, y);

    return {
        x: w[0] - image.width / 2,
        y: w[1] - image.height + 25
    };
}

TileMap.prototype.createItem = function (src, x, y, cb) {
    var self = this;
    var im = new Image;

    im.addEventListener('load', function () {
        var item = new EventEmitter;
        var imagePos = self.imagePos(im, x, y);
        item.element = self.paper.image(
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

TileMap.prototype.moveItem = function(item, x, y) {
    var from = {x: item.imageX, y: item.imageY};
    var to = this.imagePos(item.image, x, y);
    delete this.items[from.x + ',' + from.y];

    item.x = x;
    item.screenX = to.x;
    item.imageX = to.x;
    item.y = y;
    item.screenY = to.y;
    item.imageY = to.y;

    this.itemSet.push(item.element);
    this.itemStack.push(item);
    this.itemSet.toFront();

    this.items[x + ',' + y] = item;

    // item.element.attr({x: item.imageX, y: item.imageY});
    item.element.animate({x: item.imageX, y: item.imageY}, 300, '>');
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

},{"events":17,"raphael-browserify":15,"util":21}],11:[function(require,module,exports){
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
},{"xtend":23}],13:[function(require,module,exports){
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
},{"underscore":16}],15:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2NvbnRyb2xsZXJzL2Jhc2UuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9jb250cm9sbGVycy9jaGFyYWN0ZXIuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9pbmRleC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi9ib2FyZC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi9jaGFyYWN0ZXIuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9saWIvY2hhcmFjdGVycy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi9jb250cm9sbGVycy5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi9nYW1lLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbGliL2tleW1hc3Rlci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi90aWxlbWFwLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbGliL3RpbGVzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbGliL3dhbGxfdHlwZS5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL2xpYi93YWxsX3R5cGVzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbGliL3dhbGxzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3JhcGhhZWwtYnJvd3NlcmlmeS9yYXBoYWVsLWJyb3dzZXJpZnkuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9ub2RlX21vZHVsZXMvdW5kZXJzY29yZS91bmRlcnNjb3JlLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbnNlcnQtbW9kdWxlLWdsb2JhbHMvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3h0ZW5kL2hhcy1rZXlzLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3h0ZW5kL2luZGV4LmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3h0ZW5kL25vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9mb3JlYWNoLmpzIiwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3h0ZW5kL25vZGVfbW9kdWxlcy9vYmplY3Qta2V5cy9pbmRleC5qcyIsIi9Vc2Vycy9wZWRyb3RlaXhlaXJhL3Byb2plY3RzL3Rhc2VyLXNxdWFkL25vZGVfbW9kdWxlcy94dGVuZC9ub2RlX21vZHVsZXMvb2JqZWN0LWtleXMvaXNBcmd1bWVudHMuanMiLCIvVXNlcnMvcGVkcm90ZWl4ZWlyYS9wcm9qZWN0cy90YXNlci1zcXVhZC9ub2RlX21vZHVsZXMveHRlbmQvbm9kZV9tb2R1bGVzL29iamVjdC1rZXlzL3NoaW0uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2x1TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy96Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNWtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBrZXltYXN0ZXIgPSByZXF1aXJlKCcuLi9saWIva2V5bWFzdGVyJyk7XG4vLyBrZXltYXN0ZXIubm9Db25mbGljdCgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xsZXJCYXNlO1xuXG5mdW5jdGlvbiBDb250cm9sbGVyQmFzZSgpIHtcbiAgdGhpcy5ib3VuZEtleXMgPSBbXTtcbn1cblxudmFyIENCID0gQ29udHJvbGxlckJhc2UucHJvdG90eXBlO1xuXG5cbi8vLyBrZXlcblxuQ0Iua2V5ID0gZnVuY3Rpb24ga2V5KHNwZWMsIGZuKSB7XG4gIHRoaXMuYm91bmRLZXlzLnB1c2goc3BlYykgO1xuICBrZXltYXN0ZXIoc3BlYywgZm4pO1xufTtcblxuQ0IudW5iaW5kS2V5cyA9IGZ1bmN0aW9uIHVuYmluZEtleXMoKSB7XG4gIHRoaXMuYm91bmRLZXlzLmZvckVhY2godGhpcy51bmJpbmRLZXkuYmluZCh0aGlzKSk7XG4gIHRoaXMuYm91bmRLZXlzID0gW107XG59O1xuXG5DQi51bmJpbmRLZXkgPSBmdW5jdGlvbiB1bmJpbmRLZXkoc3BlYykge1xuICBrZXltYXN0ZXIudW5iaW5kKHNwZWMpO1xufTtcblxuXG4vLy8gYWJzdHJhY3QgbWV0aG9kc1xuXG5DQi5hY3RpdmF0ZSA9IGFic3RyYWN0O1xuQ0IuZGVhY3RpdmF0ZSA9IGFic3RyYWN0O1xuXG5cbmZ1bmN0aW9uIGFic3RyYWN0KCkge1xuICB0aHJvdyBuZXcgRXJyb3IoJ2NvbnRyb2xsZXIgbmVlZHMgdG8gaW1wbGVtZW50IGFjdGl2YXRlJyk7XG59XG5cbiIsInZhciBpbmhlcml0cyAgICAgICA9IHJlcXVpcmUoJ3V0aWwnKS5pbmhlcml0cztcbnZhciBDb250cm9sbGVyQmFzZSA9IHJlcXVpcmUoJy4vYmFzZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENoYXJhY3RlckNvbnRyb2xsZXI7XG5cbmZ1bmN0aW9uIENoYXJhY3RlckNvbnRyb2xsZXIoY2hhcmFjdGVyKSB7XG4gIENvbnRyb2xsZXJCYXNlLmFwcGx5KHRoaXMpO1xuXG4gIHRoaXMuY2hhcmFjdGVyID0gY2hhcmFjdGVyO1xufVxuXG5pbmhlcml0cyhDaGFyYWN0ZXJDb250cm9sbGVyLCBDb250cm9sbGVyQmFzZSk7XG5cbnZhciBDQyA9IENoYXJhY3RlckNvbnRyb2xsZXIucHJvdG90eXBlO1xuXG5cbi8vLyBhY3RpdmF0ZVxuXG5DQy5hY3RpdmF0ZSA9IGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuICB0aGlzLmtleSgnbGVmdCcsIHRoaXMudHVybkxlZnQuYmluZCh0aGlzKSk7XG4gIHRoaXMua2V5KCdyaWdodCcsIHRoaXMudHVyblJpZ2h0LmJpbmQodGhpcykpO1xuICB0aGlzLmtleSgndXAnLCB0aGlzLndhbGsuYmluZCh0aGlzKSk7XG4gIHRoaXMua2V5KCdkb3duJywgdGhpcy53YWxrQmFjay5iaW5kKHRoaXMpKTtcbn07XG5cblxuQ0MuZGVhY3RpdmF0ZSA9IGZ1bmN0aW9uIGRlYWN0aXZhdGUoKSB7XG4gIHRoaXMudW5iaW5kS2V5cygpO1xufTtcblxuXG4vLy8gdHVybkxlZnRcblxuQ0MudHVybkxlZnQgPSBmdW5jdGlvbiB0dXJuTGVmdCgpIHtcbiAgdGhpcy5jaGFyYWN0ZXIudHVybkxlZnQoKTtcbn07XG5cblxuLy8vIHR1cm5SaWdodFxuXG5DQy50dXJuUmlnaHQgPSBmdW5jdGlvbiB0dXJuUmlnaHQoKSB7XG4gIHRoaXMuY2hhcmFjdGVyLnR1cm5SaWdodCgpO1xufTtcblxuXG4vLy8gd2Fsa1xuXG5DQy53YWxrID0gZnVuY3Rpb24gd2FsaygpIHtcbiAgdGhpcy5jaGFyYWN0ZXIud2FsaygpO1xufTtcblxuXG4vLy8gd2Fsa0JhY2tcblxuQ0Mud2Fsa0JhY2sgPSBmdW5jdGlvbiB3YWxrQmFjaygpIHtcbiAgdGhpcy5jaGFyYWN0ZXIud2Fsa0JhY2soKTtcbn07IiwiKGZ1bmN0aW9uIChnbG9iYWwpe1xudmFyIEdhbWUgPSByZXF1aXJlKCcuL2xpYi9nYW1lJyk7XG5cbnZhciB3aW5kb3cgPSBnbG9iYWw7XG5cbnZhciBvcHRpb25zID0ge1xuICB3aWR0aDogJCh3aW5kb3cuZG9jdW1lbnQuYm9keSkud2lkdGgoKSxcbiAgaGVpZ2h0OiAkKHdpbmRvdy5kb2N1bWVudC5ib2R5KS5oZWlnaHQoKVxufTtcblxudmFyIGdhbWUgPSBHYW1lKGRvY3VtZW50LmJvZHksIG9wdGlvbnMpO1xuXG5cbi8vLyBzb2xkaWVyc1xuXG52YXIgc29sZGllcnMgPSBbXTtcblxuKGZ1bmN0aW9uKCkge1xuICB2YXIgc29sZGllckNvdW50ID0gNVxuICBmb3IodmFyIGkgPSAwOyBpIDwgc29sZGllckNvdW50OyBpICsrKSB7XG4gICAgdmFyIHNvbGRpZXIgPSBnYW1lLmJvYXJkLmNoYXJhY3RlcnMuY3JlYXRlKCk7XG4gICAgc29sZGllcnMucHVzaChzb2xkaWVyKTtcbiAgICB2YXIgcGxhY2UgPSB7IHg6aSwgeTogaX07XG4gICAgdmFyIHBsYWNlZCA9IGdhbWUuYm9hcmQuY2hhcmFjdGVycy5wbGFjZShzb2xkaWVyLCBwbGFjZSk7XG4gICAgaWYgKCEgcGxhY2VkKSBjb25zb2xlLmxvZygnRmFpbGVkIHRvIHBsYWNlIHNvbGRpZXIgaW4gJywgcGxhY2UpO1xuICB9XG5cbn0oKSk7XG5cblxuXG4vLy8gd2FsbHNcblxuKGZ1bmN0aW9uKCkge1xuICB2YXIgd2FsbFR5cGUgPSBnYW1lLmJvYXJkLndhbGxUeXBlcy5jcmVhdGUoKTtcblxuICAvLyB2YXIgc3RhcnQgPSB7eDogLTUuNSwgeTogLTUuNX07XG4gIC8vIHZhciBlbmQgPSB7eDogLTUuNSwgeTogNS41fTtcbiAgLy8gZ2FtZS5ib2FyZC53YWxscy5wbGFjZSh3YWxsVHlwZSwgc3RhcnQsIGVuZCk7XG5cblxuICBzdGFydCA9IHt4OiAtNS41LCB5OiAtNS41fTtcbiAgZW5kID0ge3g6IDUuNSwgeTogLTUuNX07XG4gIGdhbWUuYm9hcmQud2FsbHMucGxhY2Uod2FsbFR5cGUsIHN0YXJ0LCBlbmQpO1xuXG4gIHN0YXJ0ID0ge3g6IDUuNSwgeTogNS41fTtcbiAgZW5kID0ge3g6IDUuNSwgeTogLTUuNX07XG4gIGdhbWUuYm9hcmQud2FsbHMucGxhY2Uod2FsbFR5cGUsIHN0YXJ0LCBlbmQpO1xuXG4gIGNvbnNvbGUubG9nKCdnYW1lLmJvYXJkLndhbGxzLndhbGxzOicsIGdhbWUuYm9hcmQud2FsbHMud2FsbHMpO1xuXG59KCkpO1xuXG5cblxuLy8vIHN0YXJ0IGdhbWVcblxuXG5nYW1lLnN0YXJ0KCk7XG5cbnZhciBzb2xkaWVyTnIgPSAtMTtcbnZhciBzb2xkaWVyO1xudmFyIGNvbnRyb2xsZXI7XG5cbi8vIHNldEludGVydmFsKGZ1bmN0aW9uKCkge1xuLy8gICBpZiAoY29udHJvbGxlcikgY29udHJvbGxlci5kZWFjdGl2YXRlKCk7XG4gIHNvbGRpZXJOciA9IChzb2xkaWVyTnIgKyAxKSAlIHNvbGRpZXJzLmxlbmd0aDtcbiAgc29sZGllciA9IHNvbGRpZXJzW3NvbGRpZXJOcl07XG4gIGNvbnRyb2xsZXIgPSBnYW1lLmNvbnRyb2xsZXJzLmNvbnRyb2woc29sZGllcik7XG4vLyB9LCAzMDAwKTtcbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwidmFyIGV4dGVuZCAgPSByZXF1aXJlKCd4dGVuZCcpO1xudmFyIHRpbGVtYXAgPSByZXF1aXJlKCcuL3RpbGVtYXAnKTtcbnZhciBfICAgICAgID0gcmVxdWlyZSgndW5kZXJzY29yZScpO1xuXG52YXIgVGlsZXMgICAgICAgPSByZXF1aXJlKCcuL3RpbGVzJyk7XG52YXIgQ2hhcmFjdGVycyAgPSByZXF1aXJlKCcuL2NoYXJhY3RlcnMnKTtcbnZhciBXYWxsVHlwZXMgICA9IHJlcXVpcmUoJy4vd2FsbF90eXBlcycpO1xudmFyIFdhbGxzICAgICAgID0gcmVxdWlyZSgnLi93YWxscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJvYXJkO1xuXG52YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG4gIHdpZHRoOiB3aW5kb3cub3V0ZXJXaWR0aCxcbiAgaGVpZ2h0OiB3aW5kb3cub3V0ZXJIZWlnaHQsXG4gIHNpemU6IDIwLFxuICB6b29tOiAwLjVcbn07XG5cbmZ1bmN0aW9uIEJvYXJkKGVsZW1lbnQsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB7fTtcblxuICBvcHRpb25zID0gZXh0ZW5kKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0aW9ucyB8fCB7fSk7XG5cblxuICAvLy8gTWV0aG9kc1xuXG4gIHNlbGYuem9vbSA9IHpvb207XG5cbiAgc2VsZi5wbGFjZSAgPSBwbGFjZTtcbiAgc2VsZi5yZW1vdmUgPSByZW1vdmU7XG4gIHNlbGYubW92ZVRvID0gbW92ZVRvO1xuICBzZWxmLnVwZGF0ZSA9IHVwZGF0ZTtcblxuICBzZWxmLndhbGthYmxlID0gd2Fsa2FibGU7XG4gIHNlbGYudHJhdmVyc2FibGUgPSB0cmF2ZXJzYWJsZTtcbiAgc2VsZi5vYmplY3RzQXQgPSBvYmplY3RzQXQ7XG5cblxuICAvLy8gSW5pdFxuXG4gIHNlbGYuZ3JpZCA9IHRpbGVtYXAob3B0aW9ucy53aWR0aCwgb3B0aW9ucy5oZWlnaHQpO1xuXG4gIHNlbGYuem9vbShvcHRpb25zLnpvb20pO1xuICBzZWxmLnRpbGVzID0gVGlsZXMoc2VsZi5ncmlkKTtcbiAgc2VsZi5jaGFyYWN0ZXJzID0gQ2hhcmFjdGVycyhzZWxmKTtcbiAgc2VsZi53YWxsVHlwZXMgPSBXYWxsVHlwZXMoc2VsZik7XG5cbiAgc2VsZi5zaXplID0gb3B0aW9ucy5zaXplO1xuICBzZWxmLm9iamVjdHMgPSBbXTtcbiAgc2VsZi53YWxscyA9IFdhbGxzKHNlbGYpO1xuXG4gIGZvcih2YXIgaSA9IDAgOyBpIDwgc2VsZi5zaXplOyBpICsrKSB7XG4gICAgc2VsZi5vYmplY3RzLnB1c2goW10pO1xuICAgIGZvcih2YXIgaiA9IDAgOyBqIDwgc2VsZi5zaXplOyBqICsrKSB7XG4gICAgICBzZWxmLm9iamVjdHNbaV0ucHVzaChbXSk7XG4gICAgICBzZWxmLm9iamVjdHNbaV1bal0gPSBbXTtcbiAgICB9XG4gIH1cblxuICB2YXIgaGFsZlNpemUgPSBzZWxmLnNpemUgLyAyO1xuICBmb3IgKHZhciB4ID0gLWhhbGZTaXplOyB4IDwgaGFsZlNpemU7IHgrKykge1xuICAgIGZvciAodmFyIHkgPSAtaGFsZlNpemU7IHkgPCBoYWxmU2l6ZTsgeSsrKSB7XG4gICAgICBzZWxmLnRpbGVzLmNyZWF0ZSh4LCB5KTtcbiAgICB9XG4gIH1cblxuICBzZWxmLmdyaWQuYXBwZW5kVG8oZWxlbWVudCk7XG5cbiAgcmV0dXJuIHNlbGY7XG59XG5cbi8vLyBwbGFjZVxuXG5mdW5jdGlvbiBwbGFjZShvYmplY3QsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IGV4dGVuZCh7XG4gICAgeDogb2JqZWN0LngsXG4gICAgeTogb2JqZWN0LnlcbiAgfSwgb3B0aW9ucyB8fCB7fSk7XG5cbiAgdmFyIHBsYWNlZCA9IGZhbHNlO1xuICBpZiAob2JqZWN0LmNvbGxpZGVzKVxuICAgIHBsYWNlZCA9IHRoaXMud2Fsa2FibGUob3B0aW9ucy54LCBvcHRpb25zLnkpO1xuXG4gIGlmIChwbGFjZWQpIHtcbiAgICB2YXIgaXRlbSA9IHRoaXMuZ3JpZC5jcmVhdGVJdGVtKG9iamVjdC5pbWFnZSgpLCBvcHRpb25zLngsIG9wdGlvbnMueSwgY3JlYXRlZEl0ZW0pO1xuICAgIG9iamVjdC5pdGVtID0gaXRlbTtcbiAgICB2YXIgaGFsZlNpemUgPSB0aGlzLnNpemUgLyAyO1xuICAgIHZhciByb3cgPSB0aGlzLm9iamVjdHNbb3B0aW9ucy54ICsgaGFsZlNpemVdO1xuICAgIHZhciBjZWxsID0gcm93ICYmIHJvd1tvcHRpb25zLnkgKyBoYWxmU2l6ZV07XG4gICAgaWYgKGNlbGwpIHtcbiAgICAgIGNlbGwucHVzaChvYmplY3QpO1xuICAgICAgb2JqZWN0LnggPSBvcHRpb25zLng7XG4gICAgICBvYmplY3QueSA9IG9wdGlvbnMueTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHBsYWNlZDtcblxuICBmdW5jdGlvbiBjcmVhdGVkSXRlbShlcnIsIGl0ZW0pIHtcbiAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gICAgb2JqZWN0Lml0ZW0gPSBpdGVtO1xuICB9XG59XG5cblxuLy8vIHJlbW92ZVxuXG5mdW5jdGlvbiByZW1vdmUob2JqZWN0KSB7XG4gIHZhciBoYWxmU2l6ZSA9IHRoaXMuc2l6ZSAvIDI7XG4gIHZhciByb3cgPSB0aGlzLm9iamVjdHNbb2JqZWN0LnggKyBoYWxmU2l6ZV07XG4gIHZhciBvYmplY3RzID0gcm93ICYmIHJvd1tvYmplY3QueSArIGhhbGZTaXplXSB8fCBbXTtcbiAgaWYgKG9iamVjdHMubGVuZ3RoKSB7XG4gICAgdmFyIGlkeCA9IG9iamVjdHMuaW5kZXhPZihvYmplY3QpO1xuICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgb2JqZWN0cy5zcGxpY2UoaWR4LCAxKTtcbiAgICAgIHRoaXMuZ3JpZC5yZW1vdmVJdGVtKG9iamVjdC54LCBvYmplY3QueSk7XG4gICAgfVxuICB9XG59XG5cblxuLy8vIHVwZGF0ZVxuXG5mdW5jdGlvbiB1cGRhdGUob2JqZWN0KSB7XG4gIHZhciBpdGVtID0gb2JqZWN0Lml0ZW07XG4gIGlmICghIGl0ZW0pIHRocm93IG5ldyBFcnJvcignTm8gb2JqZWN0Lml0ZW0nKTtcbiAgaXRlbS5lbGVtZW50LmF0dHIoJ3NyYycsIG9iamVjdC5pbWFnZSgpKTtcbn1cblxuXG4vLy8gbW92ZVRvXG5cbmZ1bmN0aW9uIG1vdmVUbyhvYmplY3QsIHgsIHksIGNiKSB7XG4gIGlmIChNYXRoLnJvdW5kKHgpICE9IHgpIHRocm93IG5ldyBFcnJvcignbXVzdCBtb3ZlIHRvIGludGVnZXIgeCcpO1xuICBpZiAoTWF0aC5yb3VuZCh5KSAhPSB5KSB0aHJvdyBuZXcgRXJyb3IoJ211c3QgbW92ZSB0byBpbnRlZ2VyIHknKTtcblxuICB2YXIgdG8gPSB7IHg6IHgsIHk6IHl9O1xuXG4gIHZhciBkaXN0YW5jZSA9IHtcbiAgICB4OiBNYXRoLmFicyhvYmplY3QueCAtIHgpLFxuICAgIHk6IE1hdGguYWJzKG9iamVjdC55IC0geSlcbiAgfTtcblxuICBpZiAoZGlzdGFuY2UueCA+IDEpIHRocm93IG5ldyBFcnJvcignZGlzdGFuY2UgaW4geCBtdXN0IGJlIDw9IDEnKTtcbiAgaWYgKGRpc3RhbmNlLnkgPiAxKSB0aHJvdyBuZXcgRXJyb3IoJ2Rpc3RhbmNlIGluIHkgbXVzdCBiZSA8PSAxJyk7XG5cblxuICB2YXIgbW92ZSA9IHRoaXMudHJhdmVyc2FibGUob2JqZWN0LCB0bykgJiYgdGhpcy53YWxrYWJsZSh4LCB5KTtcbiAgaWYgKG1vdmUpIHtcbiAgICB2YXIgaXRlbSA9IG9iamVjdC5pdGVtO1xuICAgIGlmICghIGl0ZW0pIHRocm93IG5ldyBFcnJvcignbm8gb2JqZWN0Lml0ZW0nKTtcblxuICAgIHZhciBvYmplY3RzID0gdGhpcy5vYmplY3RzQXQob2JqZWN0LngsIG9iamVjdC55KTtcbiAgICB2YXIgaWR4ID0gb2JqZWN0cy5pbmRleE9mKG9iamVjdCk7XG4gICAgaWYgKGlkeCA+PSAwKSBvYmplY3RzLnNwbGljZShpZHgsIDEpO1xuXG4gICAgdGhpcy5ncmlkLm1vdmVJdGVtKGl0ZW0sIHgsIHkpO1xuICAgIG9iamVjdC54ID0geDtcbiAgICBvYmplY3QueSA9IHk7XG5cbiAgICB0aGlzLm9iamVjdHNBdCh4LCB5KS5wdXNoKG9iamVjdCk7XG5cbiAgICBpZiAoY2IpIGNiKCk7XG4gIH1cbiAgcmV0dXJuIG1vdmU7XG59XG5cblxuLy8vIG9iamVjdHNBdFxuXG5mdW5jdGlvbiBvYmplY3RzQXQoeCwgeSkge1xuICB4ICs9IHRoaXMuc2l6ZSAvIDI7XG4gIHkgKz0gdGhpcy5zaXplIC8gMjtcbiAgdmFyIHJvdyA9IHRoaXMub2JqZWN0c1t4XTtcbiAgcmV0dXJuIHJvdyAmJiByb3dbeV0gfHwgW107XG59XG5cblxuLy8vIHdhbGthYmxlXG5cbmZ1bmN0aW9uIHdhbGthYmxlKHgsIHkpIHtcbiAgdmFyIG1heCA9IHRoaXMuc2l6ZSAvIDI7XG4gIHZhciB3YWxrYWJsZSA9IChNYXRoLmFicyh4KSA8PSBtYXgpICYmIChNYXRoLmFicyh5KSA8PSBtYXgpO1xuICBpZiAod2Fsa2FibGUpIHtcbiAgICB2YXIgb2JqZWN0cyA9IHRoaXMub2JqZWN0c0F0KHgsIHkpO1xuICAgIGlmIChvYmplY3RzLmxlbmd0aCkgd2Fsa2FibGUgPSBfLmV2ZXJ5KG9iamVjdHMsIGlzV2Fsa2FibGUpO1xuICB9XG4gIHJldHVybiB3YWxrYWJsZTtcbn1cblxuXG4vLy8gdHJhdmVyc2FibGVcblxuZnVuY3Rpb24gdHJhdmVyc2FibGUoZnJvbSwgdG8pIHtcbiAgcmV0dXJuIHRoaXMud2FsbHMudHJhdmVyc2FibGUoZnJvbSwgdG8pO1xufVxuXG5cbi8vLyB6b29tXG5cbmZ1bmN0aW9uIHpvb20obGV2ZWwpIHtcbiAgdGhpcy5ncmlkLnpvb20obGV2ZWwpO1xufVxuXG5cbi8vLyBNaXNjXG5cbmZ1bmN0aW9uIGlzV2Fsa2FibGUobykge1xuICByZXR1cm4gby53YWxrYWJsZTtcbn0iLCJ2YXIgZXh0ZW5kID0gcmVxdWlyZSgneHRlbmQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBDaGFyYWN0ZXI7XG5cbnZhciBuZXh0T25SaWdodFR1cm4gPSB7XG4gIHNvdXRoOiAgICAgICAnc291dGhfd2VzdCcsXG4gIHNvdXRoX3dlc3Q6ICAnd2VzdCcsXG4gIHdlc3Q6ICAgICAgICAnbm9ydGhfd2VzdCcsXG4gIG5vcnRoX3dlc3Q6ICAnbm9ydGgnLFxuICBub3J0aDogICAgICAgJ25vcnRoX2Vhc3QnLFxuICBub3J0aF9lYXN0OiAgJ2Vhc3QnLFxuICBlYXN0OiAgICAgICAgJ3NvdXRoX2Vhc3QnLFxuICBzb3V0aF9lYXN0OiAgJ3NvdXRoJ1xufTtcblxudmFyIG5leHRPbkxlZnRUdXJuID0ge1xuICBzb3V0aDogICAgICAnc291dGhfZWFzdCcsXG4gIHNvdXRoX2Vhc3Q6ICdlYXN0JyxcbiAgZWFzdDogICAgICAgJ25vcnRoX2Vhc3QnLFxuICBub3J0aF9lYXN0OiAnbm9ydGgnLFxuICBub3J0aDogICAgICAnbm9ydGhfd2VzdCcsXG4gIG5vcnRoX3dlc3Q6ICd3ZXN0JyxcbiAgd2VzdDogICAgICAgJ3NvdXRoX3dlc3QnLFxuICBzb3V0aF93ZXN0OiAnc291dGgnXG59O1xuXG52YXIgd2Fsa0RpcmVjdGlvbnMgPSB7XG4gIHNvdXRoOiAgICAgIHt4OiAtMSwgeTogMX0sXG4gIHNvdXRoX3dlc3Q6IHt4OiAtMSwgeTogMH0sXG4gIHdlc3Q6ICAgICAgIHt4OiAtMSwgeTogLTF9LFxuICBub3J0aF93ZXN0OiB7eDogMCwgIHk6IC0xfSxcbiAgbm9ydGg6ICAgICAge3g6IDEsICB5OiAtMX0sXG4gIG5vcnRoX2Vhc3Q6IHt4OiAxLCAgeTogMH0sXG4gIGVhc3Q6ICAgICAgIHt4OiAxLCAgeTogMX0sXG4gIHNvdXRoX2Vhc3Q6IHt4OiAwLCAgeTogMX1cbn1cblxudmFyIGRlZmF1bHRDaGFyYWN0ZXJPcHRpb25zID0ge1xuICB4OiAwLFxuICB5OiAwLFxuICBmYWNpbmc6ICdzb3V0aCcsXG4gIHNwcml0ZXM6IHtcbiAgICBzb3V0aDogJy9zcHJpdGVzL3NvbGRpZXIvc291dGgucG5nJyxcbiAgICBzb3V0aF93ZXN0OiAnL3Nwcml0ZXMvc29sZGllci9zb3V0aF93ZXN0LnBuZycsXG4gICAgd2VzdDogICAgICAgJy9zcHJpdGVzL3NvbGRpZXIvd2VzdC5wbmcnLFxuICAgIG5vcnRoX3dlc3Q6ICcvc3ByaXRlcy9zb2xkaWVyL25vcnRoX3dlc3QucG5nJyxcbiAgICBub3J0aDogICAgICAnL3Nwcml0ZXMvc29sZGllci9ub3J0aC5wbmcnLFxuICAgIG5vcnRoX2Vhc3Q6ICcvc3ByaXRlcy9zb2xkaWVyL25vcnRoX2Vhc3QucG5nJyxcbiAgICBlYXN0OiAgICAgICAnL3Nwcml0ZXMvc29sZGllci9lYXN0LnBuZycsXG4gICAgc291dGhfZWFzdDogJy9zcHJpdGVzL3NvbGRpZXIvc291dGhfZWFzdC5wbmcnXG4gIH0sXG4gIGNvbGxpZGVzOiB0cnVlLFxuICB3YWxrYWJsZTogZmFsc2UsXG4gIGNvbnRyb2xsZXJGdW5jdGlvbjogcmVxdWlyZSgnLi4vY29udHJvbGxlcnMvY2hhcmFjdGVyJylcbn07XG5cbmZ1bmN0aW9uIENoYXJhY3Rlcihib2FyZCwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHt9O1xuXG4gIC8vLyBNZXRob2RzXG5cbiAgc2VsZi52aXNpYmxlICAgPSB2aXNpYmxlO1xuICBzZWxmLmludmlzaWJsZSA9IGludmlzaWJsZTtcbiAgc2VsZi5pbWFnZSAgICAgPSBpbWFnZTtcblxuICAvLy8gbW92ZW1lbnRcblxuICBzZWxmLm1vdmVUbyAgICA9IG1vdmVUbztcbiAgc2VsZi5tb3ZlICAgICAgPSBtb3ZlO1xuICBzZWxmLnR1cm5MZWZ0ICA9IHR1cm5MZWZ0XG4gIHNlbGYudHVyblJpZ2h0ID0gdHVyblJpZ2h0XG4gIHNlbGYud2FsayAgICAgID0gd2FsaztcbiAgc2VsZi53YWxrQmFjayAgPSB3YWxrQmFjaztcblxuXG4gIC8vLyBJbml0XG5cbiAgc2VsZi5ib2FyZCA9IGJvYXJkO1xuXG4gIG9wdGlvbnMgPSBleHRlbmQoe30sIGRlZmF1bHRDaGFyYWN0ZXJPcHRpb25zLCBvcHRpb25zIHx8IHt9KTtcbiAgc2VsZi54ID0gb3B0aW9ucy54O1xuICBzZWxmLnkgPSBvcHRpb25zLnk7XG4gIHNlbGYuZmFjaW5nID0gb3B0aW9ucy5mYWNpbmc7XG4gIHNlbGYuc3ByaXRlcyA9IG9wdGlvbnMuc3ByaXRlcztcbiAgc2VsZi5jb2xsaWRlcyA9IG9wdGlvbnMuY29sbGlkZXM7XG4gIHNlbGYud2Fsa2FibGUgPSBvcHRpb25zLndhbGthYmxlO1xuICBzZWxmLmNvbnRyb2xsZXJGdW5jdGlvbiA9IG9wdGlvbnMuY29udHJvbGxlckZ1bmN0aW9uO1xuXG5cbiAgc2VsZi5zdGF0ZSA9IHtcbiAgICB2aXNpYmxlOiBvcHRpb25zLnZpc2libGUgfHwgZmFsc2VcbiAgfTtcblxuICBpZiAoc2VsZi5zdGF0ZS52aXNpYmxlKSBzZWxmLnZpc2libGUodHJ1ZSk7XG5cbiAgcmV0dXJuIHNlbGY7XG59XG5cbmZ1bmN0aW9uIGltYWdlKCkge1xuICByZXR1cm4gdGhpcy5zcHJpdGVzW3RoaXMuZmFjaW5nXTtcbn1cblxuZnVuY3Rpb24gdmlzaWJsZShmb3JjZSkge1xuICBpZiAoZm9yY2UgfHwgISB0aGlzLnN0YXRlLnZpc2libGUpIHtcbiAgICB0aGlzLnN0YXRlLnZpc2libGUgPSB0cnVlO1xuICAgIHRoaXMuYm9hcmQucGxhY2UodGhpcyk7XG4gfVxufVxuXG5mdW5jdGlvbiBpbnZpc2libGUoZm9yY2UpIHtcbiAgaWYgKGZvcmNlIHx8IHRoaXMuc3RhdGUudmlzaWJsZSkge1xuICAgIHRoaXMuc3RhdGUudmlzaWJsZSA9IGZhbHNlO1xuICAgIHRoaXMuYm9hcmQucmVtb3ZlKHRoaXMpO1xuICB9XG59XG5cblxuLy8vIE1vdmVtZW50XG5cbmZ1bmN0aW9uIG1vdmVUbyh4LCB5KSB7XG4gIHJldHVybiB0aGlzLmJvYXJkLm1vdmVUbyh0aGlzLCB4LCB5KTtcbn1cblxuZnVuY3Rpb24gbW92ZSh4LCB5KSB7XG4gIHJldHVybiB0aGlzLm1vdmVUbyh0aGlzLnggKyB4LCB0aGlzLnkgKyB5KTtcbn1cblxuZnVuY3Rpb24gdHVybkxlZnQoKSB7XG4gIHRoaXMuZmFjaW5nID0gbmV4dE9uTGVmdFR1cm5bdGhpcy5mYWNpbmddO1xuICB0aGlzLmJvYXJkLnVwZGF0ZSh0aGlzKTtcbn1cblxuZnVuY3Rpb24gdHVyblJpZ2h0KCkge1xuICB0aGlzLmZhY2luZyA9IG5leHRPblJpZ2h0VHVyblt0aGlzLmZhY2luZ107XG4gIHRoaXMuYm9hcmQudXBkYXRlKHRoaXMpO1xufVxuXG5mdW5jdGlvbiB3YWxrKCkge1xuICB2YXIgZGlyZWN0aW9uID0gd2Fsa0RpcmVjdGlvbnNbdGhpcy5mYWNpbmddO1xuICByZXR1cm4gdGhpcy5tb3ZlKGRpcmVjdGlvbi54LCBkaXJlY3Rpb24ueSk7XG59XG5cbmZ1bmN0aW9uIHdhbGtCYWNrKCkge1xuICB2YXIgZGlyZWN0aW9uID0gd2Fsa0RpcmVjdGlvbnNbdGhpcy5mYWNpbmddO1xuICByZXR1cm4gdGhpcy5tb3ZlKC0gZGlyZWN0aW9uLngsIC0gZGlyZWN0aW9uLnkpO1xufSIsInZhciBleHRlbmQgPSByZXF1aXJlKCd4dGVuZCcpO1xuXG52YXIgQ2hhcmFjdGVyID0gcmVxdWlyZSgnLi9jaGFyYWN0ZXInKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IENoYXJhY3RlcnM7XG5cbnZhciBkZWZhdWx0T3B0aW9ucyA9IHtcblxufTtcblxuZnVuY3Rpb24gQ2hhcmFjdGVycyhib2FyZCwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHt9O1xuXG4gIHNlbGYuY2hhcmFjdGVycyA9IFtdO1xuICBzZWxmLmJvYXJkID0gYm9hcmQ7XG5cbiAgb3B0aW9ucyA9IGV4dGVuZCh7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMgfHwge30pO1xuXG4gIHNlbGYuY3JlYXRlID0gY3JlYXRlO1xuICBzZWxmLnBsYWNlICA9IHBsYWNlO1xuXG4gIHJldHVybiBzZWxmO1xufVxuXG5mdW5jdGlvbiBjcmVhdGUob3B0aW9ucykge1xuICByZXR1cm4gQ2hhcmFjdGVyKHRoaXMuYm9hcmQsIG9wdGlvbnMpO1xufVxuXG5mdW5jdGlvbiBwbGFjZShjaGFyYWN0ZXIsIG9wdGlvbnMpIHtcbiAgaWYgKCEgb3B0aW9ucykgb3B0aW9ucyA9IHt9O1xuICBpZiAob3B0aW9ucy54KSBjaGFyYWN0ZXIueCA9IG9wdGlvbnMueDtcbiAgaWYgKG9wdGlvbnMueSkgY2hhcmFjdGVyLnkgPSBvcHRpb25zLnk7XG4gIHZhciBwbGFjZWQgPSB0aGlzLmJvYXJkLnBsYWNlKGNoYXJhY3Rlcik7XG4gIGlmIChwbGFjZWQpIHtcbiAgICB0aGlzLmNoYXJhY3RlcnMucHVzaChjaGFyYWN0ZXIpO1xuICB9XG4gIHJldHVybiBwbGFjZWQ7XG59IiwibW9kdWxlLmV4cG9ydHMgPSBDb250cm9sbGVycztcblxuZnVuY3Rpb24gQ29udHJvbGxlcnMoKSB7XG4gIHZhciBzZWxmID0ge307XG5cbiAgc2VsZi5jb250cm9sID0gY29udHJvbDtcblxuICByZXR1cm4gc2VsZjtcbn1cblxuZnVuY3Rpb24gY29udHJvbChvYmplY3QpIHtcbiAgaWYgKCEgb2JqZWN0KSB0aHJvdyBuZXcgRXJyb3IoJ25vIG9iamVjdCB0byBjb250cm9sJyk7XG4gIHZhciBjb250cm9sbGVyRm4gPSBvYmplY3QuY29udHJvbGxlckZ1bmN0aW9uO1xuICBpZiAoISBjb250cm9sbGVyRm4pIHRocm93IG5ldyBFcnJvcignb2JqZWN0IGRvZXMgbm90IGRlZmluZSBhIGNvbnRyb2xsZXIgZnVuY3Rpb24nKTtcbiAgdmFyIGNvbnRyb2xsZXIgPSBuZXcgY29udHJvbGxlckZuKG9iamVjdCk7XG4gIGNvbnRyb2xsZXIuYWN0aXZhdGUoKTtcblxuICByZXR1cm4gY29udHJvbGxlcjtcbn0iLCJ2YXIgQm9hcmQgPSByZXF1aXJlKCcuL2JvYXJkJyk7XG52YXIgQ29udHJvbGxlcnMgPSByZXF1aXJlKCcuL2NvbnRyb2xsZXJzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gR2FtZTtcblxuZnVuY3Rpb24gR2FtZShlbGVtZW50LCBvcHRpb25zKSB7XG5cbiAgdmFyIHNlbGYgPSB7fTtcblxuICBzZWxmLmJvYXJkID0gQm9hcmQoZWxlbWVudCwgb3B0aW9ucyk7XG4gIHNlbGYuY29udHJvbGxlcnMgPSBDb250cm9sbGVycygpO1xuXG5cbiAgLy8vIE1ldGhvZHNcblxuICBzZWxmLnN0YXJ0ID0gc3RhcnQ7XG5cbiAgcmV0dXJuIHNlbGY7XG59XG5cbi8vLyBzdGFydFxuXG5mdW5jdGlvbiBzdGFydCgpIHtcblxufSIsIihmdW5jdGlvbiAoZ2xvYmFsKXtcbnZhciBrLFxuICBfaGFuZGxlcnMgPSB7fSxcbiAgX21vZHMgPSB7IDE2OiBmYWxzZSwgMTg6IGZhbHNlLCAxNzogZmFsc2UsIDkxOiBmYWxzZSB9LFxuICBfc2NvcGUgPSAnYWxsJyxcbiAgLy8gbW9kaWZpZXIga2V5c1xuICBfTU9ESUZJRVJTID0ge1xuICAgICfDouKAocKnJzogMTYsIHNoaWZ0OiAxNixcbiAgICAnw6LFksKlJzogMTgsIGFsdDogMTgsIG9wdGlvbjogMTgsXG4gICAgJ8OixZLGkic6IDE3LCBjdHJsOiAxNywgY29udHJvbDogMTcsXG4gICAgJ8OixZLLnCc6IDkxLCBjb21tYW5kOiA5MVxuICB9LFxuICAvLyBzcGVjaWFsIGtleXNcbiAgX01BUCA9IHtcbiAgICBiYWNrc3BhY2U6IDgsIHRhYjogOSwgY2xlYXI6IDEyLFxuICAgIGVudGVyOiAxMywgJ3JldHVybic6IDEzLFxuICAgIGVzYzogMjcsIGVzY2FwZTogMjcsIHNwYWNlOiAzMixcbiAgICBsZWZ0OiAzNywgdXA6IDM4LFxuICAgIHJpZ2h0OiAzOSwgZG93bjogNDAsXG4gICAgZGVsOiA0NiwgJ2RlbGV0ZSc6IDQ2LFxuICAgIGhvbWU6IDM2LCBlbmQ6IDM1LFxuICAgIHBhZ2V1cDogMzMsIHBhZ2Vkb3duOiAzNCxcbiAgICAnLCc6IDE4OCwgJy4nOiAxOTAsICcvJzogMTkxLFxuICAgICdgJzogMTkyLCAnLSc6IDE4OSwgJz0nOiAxODcsXG4gICAgJzsnOiAxODYsICdcXCcnOiAyMjIsXG4gICAgJ1snOiAyMTksICddJzogMjIxLCAnXFxcXCc6IDIyMFxuICB9LFxuICBjb2RlID0gZnVuY3Rpb24oeCl7XG4gICAgcmV0dXJuIF9NQVBbeF0gfHwgeC50b1VwcGVyQ2FzZSgpLmNoYXJDb2RlQXQoMCk7XG4gIH0sXG4gIF9kb3duS2V5cyA9IFtdO1xuXG5mb3Ioaz0xO2s8MjA7aysrKSBfTUFQWydmJytrXSA9IDExMStrO1xuXG4vLyBJRSBkb2Vzbid0IHN1cHBvcnQgQXJyYXkjaW5kZXhPZiwgc28gaGF2ZSBhIHNpbXBsZSByZXBsYWNlbWVudFxuZnVuY3Rpb24gaW5kZXgoYXJyYXksIGl0ZW0pe1xuICB2YXIgaSA9IGFycmF5Lmxlbmd0aDtcbiAgd2hpbGUoaS0tKSBpZihhcnJheVtpXT09PWl0ZW0pIHJldHVybiBpO1xuICByZXR1cm4gLTE7XG59XG5cbi8vIGZvciBjb21wYXJpbmcgbW9kcyBiZWZvcmUgdW5hc3NpZ25tZW50XG5mdW5jdGlvbiBjb21wYXJlQXJyYXkoYTEsIGEyKSB7XG4gIGlmIChhMS5sZW5ndGggIT0gYTIubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYTEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChhMVtpXSAhPT0gYTJbaV0pIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxudmFyIG1vZGlmaWVyTWFwID0ge1xuICAgIDE2OidzaGlmdEtleScsXG4gICAgMTg6J2FsdEtleScsXG4gICAgMTc6J2N0cmxLZXknLFxuICAgIDkxOidtZXRhS2V5J1xufTtcbmZ1bmN0aW9uIHVwZGF0ZU1vZGlmaWVyS2V5KGV2ZW50KSB7XG4gICAgZm9yKGsgaW4gX21vZHMpIF9tb2RzW2tdID0gZXZlbnRbbW9kaWZpZXJNYXBba11dO1xufTtcblxuLy8gaGFuZGxlIGtleWRvd24gZXZlbnRcbmZ1bmN0aW9uIGRpc3BhdGNoKGV2ZW50KSB7XG4gIHZhciBrZXksIGhhbmRsZXIsIGssIGksIG1vZGlmaWVyc01hdGNoLCBzY29wZTtcbiAga2V5ID0gZXZlbnQua2V5Q29kZTtcblxuICBpZiAoaW5kZXgoX2Rvd25LZXlzLCBrZXkpID09IC0xKSB7XG4gICAgICBfZG93bktleXMucHVzaChrZXkpO1xuICB9XG5cbiAgLy8gaWYgYSBtb2RpZmllciBrZXksIHNldCB0aGUga2V5Ljxtb2RpZmllcmtleW5hbWU+IHByb3BlcnR5IHRvIHRydWUgYW5kIHJldHVyblxuICBpZihrZXkgPT0gOTMgfHwga2V5ID09IDIyNCkga2V5ID0gOTE7IC8vIHJpZ2h0IGNvbW1hbmQgb24gd2Via2l0LCBjb21tYW5kIG9uIEdlY2tvXG4gIGlmKGtleSBpbiBfbW9kcykge1xuICAgIF9tb2RzW2tleV0gPSB0cnVlO1xuICAgIC8vICdhc3NpZ25LZXknIGZyb20gaW5zaWRlIHRoaXMgY2xvc3VyZSBpcyBleHBvcnRlZCB0byB3aW5kb3cua2V5XG4gICAgZm9yKGsgaW4gX01PRElGSUVSUykgaWYoX01PRElGSUVSU1trXSA9PSBrZXkpIGFzc2lnbktleVtrXSA9IHRydWU7XG4gICAgcmV0dXJuO1xuICB9XG4gIHVwZGF0ZU1vZGlmaWVyS2V5KGV2ZW50KTtcblxuICAvLyBzZWUgaWYgd2UgbmVlZCB0byBpZ25vcmUgdGhlIGtleXByZXNzIChmaWx0ZXIoKSBjYW4gY2FuIGJlIG92ZXJyaWRkZW4pXG4gIC8vIGJ5IGRlZmF1bHQgaWdub3JlIGtleSBwcmVzc2VzIGlmIGEgc2VsZWN0LCB0ZXh0YXJlYSwgb3IgaW5wdXQgaXMgZm9jdXNlZFxuICBpZighYXNzaWduS2V5LmZpbHRlci5jYWxsKHRoaXMsIGV2ZW50KSkgcmV0dXJuO1xuXG4gIC8vIGFib3J0IGlmIG5vIHBvdGVudGlhbGx5IG1hdGNoaW5nIHNob3J0Y3V0cyBmb3VuZFxuICBpZiAoIShrZXkgaW4gX2hhbmRsZXJzKSkgcmV0dXJuO1xuXG4gIHNjb3BlID0gZ2V0U2NvcGUoKTtcblxuICAvLyBmb3IgZWFjaCBwb3RlbnRpYWwgc2hvcnRjdXRcbiAgZm9yIChpID0gMDsgaSA8IF9oYW5kbGVyc1trZXldLmxlbmd0aDsgaSsrKSB7XG4gICAgaGFuZGxlciA9IF9oYW5kbGVyc1trZXldW2ldO1xuXG4gICAgLy8gc2VlIGlmIGl0J3MgaW4gdGhlIGN1cnJlbnQgc2NvcGVcbiAgICBpZihoYW5kbGVyLnNjb3BlID09IHNjb3BlIHx8IGhhbmRsZXIuc2NvcGUgPT0gJ2FsbCcpe1xuICAgICAgLy8gY2hlY2sgaWYgbW9kaWZpZXJzIG1hdGNoIGlmIGFueVxuICAgICAgbW9kaWZpZXJzTWF0Y2ggPSBoYW5kbGVyLm1vZHMubGVuZ3RoID4gMDtcbiAgICAgIGZvcihrIGluIF9tb2RzKVxuICAgICAgICBpZigoIV9tb2RzW2tdICYmIGluZGV4KGhhbmRsZXIubW9kcywgK2spID4gLTEpIHx8XG4gICAgICAgICAgKF9tb2RzW2tdICYmIGluZGV4KGhhbmRsZXIubW9kcywgK2spID09IC0xKSkgbW9kaWZpZXJzTWF0Y2ggPSBmYWxzZTtcbiAgICAgIC8vIGNhbGwgdGhlIGhhbmRsZXIgYW5kIHN0b3AgdGhlIGV2ZW50IGlmIG5lY2Nlc3NhcnlcbiAgICAgIGlmKChoYW5kbGVyLm1vZHMubGVuZ3RoID09IDAgJiYgIV9tb2RzWzE2XSAmJiAhX21vZHNbMThdICYmICFfbW9kc1sxN10gJiYgIV9tb2RzWzkxXSkgfHwgbW9kaWZpZXJzTWF0Y2gpe1xuICAgICAgICBpZihoYW5kbGVyLm1ldGhvZChldmVudCwgaGFuZGxlcik9PT1mYWxzZSl7XG4gICAgICAgICAgaWYoZXZlbnQucHJldmVudERlZmF1bHQpIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBlbHNlIGV2ZW50LnJldHVyblZhbHVlID0gZmFsc2U7XG4gICAgICAgICAgaWYoZXZlbnQuc3RvcFByb3BhZ2F0aW9uKSBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICBpZihldmVudC5jYW5jZWxCdWJibGUpIGV2ZW50LmNhbmNlbEJ1YmJsZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbi8vIHVuc2V0IG1vZGlmaWVyIGtleXMgb24ga2V5dXBcbmZ1bmN0aW9uIGNsZWFyTW9kaWZpZXIoZXZlbnQpe1xuICB2YXIga2V5ID0gZXZlbnQua2V5Q29kZSwgayxcbiAgICAgIGkgPSBpbmRleChfZG93bktleXMsIGtleSk7XG5cbiAgLy8gcmVtb3ZlIGtleSBmcm9tIF9kb3duS2V5c1xuICBpZiAoaSA+PSAwKSB7XG4gICAgICBfZG93bktleXMuc3BsaWNlKGksIDEpO1xuICB9XG5cbiAgaWYoa2V5ID09IDkzIHx8IGtleSA9PSAyMjQpIGtleSA9IDkxO1xuICBpZihrZXkgaW4gX21vZHMpIHtcbiAgICBfbW9kc1trZXldID0gZmFsc2U7XG4gICAgZm9yKGsgaW4gX01PRElGSUVSUykgaWYoX01PRElGSUVSU1trXSA9PSBrZXkpIGFzc2lnbktleVtrXSA9IGZhbHNlO1xuICB9XG59O1xuXG5mdW5jdGlvbiByZXNldE1vZGlmaWVycygpIHtcbiAgZm9yKGsgaW4gX21vZHMpIF9tb2RzW2tdID0gZmFsc2U7XG4gIGZvcihrIGluIF9NT0RJRklFUlMpIGFzc2lnbktleVtrXSA9IGZhbHNlO1xufTtcblxuLy8gcGFyc2UgYW5kIGFzc2lnbiBzaG9ydGN1dFxuZnVuY3Rpb24gYXNzaWduS2V5KGtleSwgc2NvcGUsIG1ldGhvZCl7XG4gIHZhciBrZXlzLCBtb2RzO1xuICBrZXlzID0gZ2V0S2V5cyhrZXkpO1xuICBpZiAobWV0aG9kID09PSB1bmRlZmluZWQpIHtcbiAgICBtZXRob2QgPSBzY29wZTtcbiAgICBzY29wZSA9ICdhbGwnO1xuICB9XG5cbiAgLy8gZm9yIGVhY2ggc2hvcnRjdXRcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgLy8gc2V0IG1vZGlmaWVyIGtleXMgaWYgYW55XG4gICAgbW9kcyA9IFtdO1xuICAgIGtleSA9IGtleXNbaV0uc3BsaXQoJysnKTtcbiAgICBpZiAoa2V5Lmxlbmd0aCA+IDEpe1xuICAgICAgbW9kcyA9IGdldE1vZHMoa2V5KTtcbiAgICAgIGtleSA9IFtrZXlba2V5Lmxlbmd0aC0xXV07XG4gICAgfVxuICAgIC8vIGNvbnZlcnQgdG8ga2V5Y29kZSBhbmQuLi5cbiAgICBrZXkgPSBrZXlbMF1cbiAgICBrZXkgPSBjb2RlKGtleSk7XG4gICAgLy8gLi4uc3RvcmUgaGFuZGxlclxuICAgIGlmICghKGtleSBpbiBfaGFuZGxlcnMpKSBfaGFuZGxlcnNba2V5XSA9IFtdO1xuICAgIF9oYW5kbGVyc1trZXldLnB1c2goeyBzaG9ydGN1dDoga2V5c1tpXSwgc2NvcGU6IHNjb3BlLCBtZXRob2Q6IG1ldGhvZCwga2V5OiBrZXlzW2ldLCBtb2RzOiBtb2RzIH0pO1xuICB9XG59O1xuXG4vLyB1bmJpbmQgYWxsIGhhbmRsZXJzIGZvciBnaXZlbiBrZXkgaW4gY3VycmVudCBzY29wZVxuZnVuY3Rpb24gdW5iaW5kS2V5KGtleSwgc2NvcGUpIHtcbiAgdmFyIG11bHRpcGxlS2V5cywga2V5cyxcbiAgICBtb2RzID0gW10sXG4gICAgaSwgaiwgb2JqO1xuXG4gIG11bHRpcGxlS2V5cyA9IGdldEtleXMoa2V5KTtcblxuICBmb3IgKGogPSAwOyBqIDwgbXVsdGlwbGVLZXlzLmxlbmd0aDsgaisrKSB7XG4gICAga2V5cyA9IG11bHRpcGxlS2V5c1tqXS5zcGxpdCgnKycpO1xuXG4gICAgaWYgKGtleXMubGVuZ3RoID4gMSkge1xuICAgICAgbW9kcyA9IGdldE1vZHMoa2V5cyk7XG4gICAgICBrZXkgPSBrZXlzW2tleXMubGVuZ3RoIC0gMV07XG4gICAgfVxuXG4gICAga2V5ID0gY29kZShrZXkpO1xuXG4gICAgaWYgKHNjb3BlID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHNjb3BlID0gZ2V0U2NvcGUoKTtcbiAgICB9XG4gICAgaWYgKCFfaGFuZGxlcnNba2V5XSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBmb3IgKGkgPSAwOyBpIDwgX2hhbmRsZXJzW2tleV0ubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iaiA9IF9oYW5kbGVyc1trZXldW2ldO1xuICAgICAgLy8gb25seSBjbGVhciBoYW5kbGVycyBpZiBjb3JyZWN0IHNjb3BlIGFuZCBtb2RzIG1hdGNoXG4gICAgICBpZiAob2JqLnNjb3BlID09PSBzY29wZSAmJiBjb21wYXJlQXJyYXkob2JqLm1vZHMsIG1vZHMpKSB7XG4gICAgICAgIF9oYW5kbGVyc1trZXldW2ldID0ge307XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG4vLyBSZXR1cm5zIHRydWUgaWYgdGhlIGtleSB3aXRoIGNvZGUgJ2tleUNvZGUnIGlzIGN1cnJlbnRseSBkb3duXG4vLyBDb252ZXJ0cyBzdHJpbmdzIGludG8ga2V5IGNvZGVzLlxuZnVuY3Rpb24gaXNQcmVzc2VkKGtleUNvZGUpIHtcbiAgICBpZiAodHlwZW9mKGtleUNvZGUpPT0nc3RyaW5nJykge1xuICAgICAga2V5Q29kZSA9IGNvZGUoa2V5Q29kZSk7XG4gICAgfVxuICAgIHJldHVybiBpbmRleChfZG93bktleXMsIGtleUNvZGUpICE9IC0xO1xufVxuXG5mdW5jdGlvbiBnZXRQcmVzc2VkS2V5Q29kZXMoKSB7XG4gICAgcmV0dXJuIF9kb3duS2V5cy5zbGljZSgwKTtcbn1cblxuZnVuY3Rpb24gZmlsdGVyKGV2ZW50KXtcbiAgdmFyIHRhZ05hbWUgPSAoZXZlbnQudGFyZ2V0IHx8IGV2ZW50LnNyY0VsZW1lbnQpLnRhZ05hbWU7XG4gIC8vIGlnbm9yZSBrZXlwcmVzc2VkIGluIGFueSBlbGVtZW50cyB0aGF0IHN1cHBvcnQga2V5Ym9hcmQgZGF0YSBpbnB1dFxuICByZXR1cm4gISh0YWdOYW1lID09ICdJTlBVVCcgfHwgdGFnTmFtZSA9PSAnU0VMRUNUJyB8fCB0YWdOYW1lID09ICdURVhUQVJFQScpO1xufVxuXG4vLyBpbml0aWFsaXplIGtleS48bW9kaWZpZXI+IHRvIGZhbHNlXG5mb3IoayBpbiBfTU9ESUZJRVJTKSBhc3NpZ25LZXlba10gPSBmYWxzZTtcblxuLy8gc2V0IGN1cnJlbnQgc2NvcGUgKGRlZmF1bHQgJ2FsbCcpXG5mdW5jdGlvbiBzZXRTY29wZShzY29wZSl7IF9zY29wZSA9IHNjb3BlIHx8ICdhbGwnIH07XG5mdW5jdGlvbiBnZXRTY29wZSgpeyByZXR1cm4gX3Njb3BlIHx8ICdhbGwnIH07XG5cbi8vIGRlbGV0ZSBhbGwgaGFuZGxlcnMgZm9yIGEgZ2l2ZW4gc2NvcGVcbmZ1bmN0aW9uIGRlbGV0ZVNjb3BlKHNjb3BlKXtcbiAgdmFyIGtleSwgaGFuZGxlcnMsIGk7XG5cbiAgZm9yIChrZXkgaW4gX2hhbmRsZXJzKSB7XG4gICAgaGFuZGxlcnMgPSBfaGFuZGxlcnNba2V5XTtcbiAgICBmb3IgKGkgPSAwOyBpIDwgaGFuZGxlcnMubGVuZ3RoOyApIHtcbiAgICAgIGlmIChoYW5kbGVyc1tpXS5zY29wZSA9PT0gc2NvcGUpIGhhbmRsZXJzLnNwbGljZShpLCAxKTtcbiAgICAgIGVsc2UgaSsrO1xuICAgIH1cbiAgfVxufTtcblxuLy8gYWJzdHJhY3Qga2V5IGxvZ2ljIGZvciBhc3NpZ24gYW5kIHVuYXNzaWduXG5mdW5jdGlvbiBnZXRLZXlzKGtleSkge1xuICB2YXIga2V5cztcbiAga2V5ID0ga2V5LnJlcGxhY2UoL1xccy9nLCAnJyk7XG4gIGtleXMgPSBrZXkuc3BsaXQoJywnKTtcbiAgaWYgKChrZXlzW2tleXMubGVuZ3RoIC0gMV0pID09ICcnKSB7XG4gICAga2V5c1trZXlzLmxlbmd0aCAtIDJdICs9ICcsJztcbiAgfVxuICByZXR1cm4ga2V5cztcbn1cblxuLy8gYWJzdHJhY3QgbW9kcyBsb2dpYyBmb3IgYXNzaWduIGFuZCB1bmFzc2lnblxuZnVuY3Rpb24gZ2V0TW9kcyhrZXkpIHtcbiAgdmFyIG1vZHMgPSBrZXkuc2xpY2UoMCwga2V5Lmxlbmd0aCAtIDEpO1xuICBmb3IgKHZhciBtaSA9IDA7IG1pIDwgbW9kcy5sZW5ndGg7IG1pKyspXG4gIG1vZHNbbWldID0gX01PRElGSUVSU1ttb2RzW21pXV07XG4gIHJldHVybiBtb2RzO1xufVxuXG4vLyBjcm9zcy1icm93c2VyIGV2ZW50c1xuZnVuY3Rpb24gYWRkRXZlbnQob2JqZWN0LCBldmVudCwgbWV0aG9kKSB7XG4gIGlmIChvYmplY3QuYWRkRXZlbnRMaXN0ZW5lcilcbiAgICBvYmplY3QuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgbWV0aG9kLCBmYWxzZSk7XG4gIGVsc2UgaWYob2JqZWN0LmF0dGFjaEV2ZW50KVxuICAgIG9iamVjdC5hdHRhY2hFdmVudCgnb24nK2V2ZW50LCBmdW5jdGlvbigpeyBtZXRob2Qod2luZG93LmV2ZW50KSB9KTtcbn07XG5cbi8vIHNldCB0aGUgaGFuZGxlcnMgZ2xvYmFsbHkgb24gZG9jdW1lbnRcbmFkZEV2ZW50KGRvY3VtZW50LCAna2V5ZG93bicsIGZ1bmN0aW9uKGV2ZW50KSB7IGRpc3BhdGNoKGV2ZW50KSB9KTsgLy8gUGFzc2luZyBfc2NvcGUgdG8gYSBjYWxsYmFjayB0byBlbnN1cmUgaXQgcmVtYWlucyB0aGUgc2FtZSBieSBleGVjdXRpb24uIEZpeGVzICM0OFxuYWRkRXZlbnQoZG9jdW1lbnQsICdrZXl1cCcsIGNsZWFyTW9kaWZpZXIpO1xuXG4vLyByZXNldCBtb2RpZmllcnMgdG8gZmFsc2Ugd2hlbmV2ZXIgdGhlIHdpbmRvdyBpcyAocmUpZm9jdXNlZC5cbmFkZEV2ZW50KHdpbmRvdywgJ2ZvY3VzJywgcmVzZXRNb2RpZmllcnMpO1xuXG4vLyBzdG9yZSBwcmV2aW91c2x5IGRlZmluZWQga2V5XG52YXIgcHJldmlvdXNLZXkgPSBnbG9iYWwua2V5O1xuXG4vLyByZXN0b3JlIHByZXZpb3VzbHkgZGVmaW5lZCBrZXkgYW5kIHJldHVybiByZWZlcmVuY2UgdG8gb3VyIGtleSBvYmplY3RcbmZ1bmN0aW9uIG5vQ29uZmxpY3QoKSB7XG4gIHZhciBrID0gZ2xvYmFsLmtleTtcbiAgZ2xvYmFsLmtleSA9IHByZXZpb3VzS2V5O1xuICByZXR1cm4gaztcbn1cblxuLy8gc2V0IHdpbmRvdy5rZXkgYW5kIHdpbmRvdy5rZXkuc2V0L2dldC9kZWxldGVTY29wZSwgYW5kIHRoZSBkZWZhdWx0IGZpbHRlclxuZ2xvYmFsLmtleSA9IGFzc2lnbktleTtcbmdsb2JhbC5rZXkuc2V0U2NvcGUgPSBzZXRTY29wZTtcbmdsb2JhbC5rZXkuZ2V0U2NvcGUgPSBnZXRTY29wZTtcbmdsb2JhbC5rZXkuZGVsZXRlU2NvcGUgPSBkZWxldGVTY29wZTtcbmdsb2JhbC5rZXkuZmlsdGVyID0gZmlsdGVyO1xuZ2xvYmFsLmtleS5pc1ByZXNzZWQgPSBpc1ByZXNzZWQ7XG5nbG9iYWwua2V5LmdldFByZXNzZWRLZXlDb2RlcyA9IGdldFByZXNzZWRLZXlDb2Rlcztcbmdsb2JhbC5rZXkubm9Db25mbGljdCA9IG5vQ29uZmxpY3Q7XG5nbG9iYWwua2V5LnVuYmluZCA9IHVuYmluZEtleTtcblxuaWYodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcpIG1vZHVsZS5leHBvcnRzID0gZ2xvYmFsLmtleTtcbn0pLmNhbGwodGhpcyx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwidmFyIHJhcGhhZWwgPSByZXF1aXJlKCdyYXBoYWVsLWJyb3dzZXJpZnknKTtcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICAgIHJldHVybiBuZXcgVGlsZU1hcCh3aWR0aCwgaGVpZ2h0KTtcbn07XG5cbmZ1bmN0aW9uIFRpbGVNYXAgKHdpZHRoLCBoZWlnaHQpIHtcbiAgICBFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuICAgIHRoaXMuZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMucGFwZXIgPSByYXBoYWVsKHRoaXMuZWxlbWVudCwgd2lkdGgsIGhlaWdodCk7XG4gICAgdGhpcy5zaXplID0gWyB3aWR0aCwgaGVpZ2h0IF07XG4gICAgdGhpcy56b29tTGV2ZWwgPSAxO1xuXG4gICAgdGhpcy50aWxlcyA9IHt9O1xuXG4gICAgdGhpcy5pdGVtcyA9IHt9O1xuICAgIHRoaXMuaXRlbVN0YWNrID0gW107XG4gICAgdGhpcy5pdGVtU2V0ID0gdGhpcy5wYXBlci5zZXQoKTtcbiAgICB0aGlzLmltYWdlcyA9IHt9O1xuXG4gICAgdGhpcy5wb2ludHMgPSB7fTtcblxuICAgIHRoaXMudGllZCA9IFtdO1xuICAgIHRoaXMuc2VsZWN0ZWQgPSBbXTtcblxuICAgIHRoaXMubW92ZVRvKDAsIDApO1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xufVxuXG51dGlsLmluaGVyaXRzKFRpbGVNYXAsIEV2ZW50RW1pdHRlcik7XG5cblRpbGVNYXAucHJvdG90eXBlLnJlc2l6ZSA9IGZ1bmN0aW9uICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdGhpcy5zaXplID0gWyB3aWR0aCwgaGVpZ2h0IF07XG4gICAgdGhpcy5wYXBlci5zZXRTaXplKHdpZHRoLCBoZWlnaHQpO1xuICAgIHRoaXMuX3NldFZpZXcoKTtcbn07XG5cblRpbGVNYXAucHJvdG90eXBlLmNyZWF0ZVRpbGUgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB2YXIgcG9pbnRzID0gW1xuICAgICAgICBbIHggLSAwLjUsIHkgKyAwLjUgXSxcbiAgICAgICAgWyB4IC0gMC41LCB5IC0gMC41IF0sXG4gICAgICAgIFsgeCArIDAuNSwgeSAtIDAuNSBdLFxuICAgICAgICBbIHggKyAwLjUsIHkgKyAwLjUgXVxuICAgIF07XG4gICAgdmFyIHBvbHkgPSBwb2ludHMubWFwKGZ1bmN0aW9uIChwdCkgeyByZXR1cm4gc2VsZi50b1dvcmxkKHB0WzBdLCBwdFsxXSkgfSk7XG5cbiAgICB2YXIgdGlsZSA9IG5ldyBFdmVudEVtaXR0ZXI7XG4gICAgdGlsZS54ID0geDtcbiAgICB0aWxlLnkgPSB5O1xuICAgIHRpbGUudHlwZSA9ICd0aWxlJztcbiAgICB0aWxlLmVsZW1lbnQgPSBzZWxmLnBhcGVyLnBhdGgocG9seWdvbihwb2x5KSk7XG5cbiAgICB2YXIgcHQgPSBzZWxmLnRvV29ybGQoeCwgeSk7XG4gICAgdGlsZS5zY3JlZW5YID0gcHRbMF07XG4gICAgdGlsZS5zY3JlZW5ZID0gcHRbMV07XG5cbiAgICBzZWxmLnRpbGVzW3ggKyAnLCcgKyB5XSA9IHRpbGU7XG5cbiAgICB2YXIgY3JlYXRlZCA9IFtdO1xuICAgIHZhciBwdHMgPSBwb2ludHMubWFwKGZ1bmN0aW9uIChwdCwgaXgpIHtcbiAgICAgICAgdmFyIGtleSA9IHB0WzBdICsgJywnICsgcHRbMV07XG4gICAgICAgIHZhciB4eSA9IHNlbGYudG9Xb3JsZChwdFswXSwgcHRbMV0pO1xuICAgICAgICB2YXIgeCA9IHh5WzBdLCB5ID0geHlbMV07XG5cbiAgICAgICAgdmFyIHBvaW50ID0gc2VsZi5wb2ludHNba2V5XTtcbiAgICAgICAgaWYgKCFwb2ludCkge1xuICAgICAgICAgICAgcG9pbnQgPSBzZWxmLnBvaW50c1trZXldID0gbmV3IEV2ZW50RW1pdHRlcjtcbiAgICAgICAgICAgIHBvaW50LnggPSBwdFswXTtcbiAgICAgICAgICAgIHBvaW50LnkgPSBwdFsxXTtcbiAgICAgICAgICAgIHBvaW50LnR5cGUgPSAncG9pbnQnO1xuICAgICAgICAgICAgcG9pbnQuZWxlbWVudCA9IHNlbGYucGFwZXIuY2lyY2xlKHggLSA1LCB5IC0gNSwgMTApO1xuICAgICAgICAgICAgcG9pbnQuZWxlbWVudC5hdHRyKCdmaWxsJywgJ3RyYW5zcGFyZW50Jyk7XG4gICAgICAgICAgICBwb2ludC5lbGVtZW50LmF0dHIoJ3N0cm9rZScsICd0cmFuc3BhcmVudCcpO1xuICAgICAgICAgICAgcG9pbnQudGlsZXMgPSB7fTtcbiAgICAgICAgICAgIGNyZWF0ZWQucHVzaChwb2ludCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGQgPSBbICdzJywgJ2UnLCAnbicsICd3JyBdW2l4XTtcbiAgICAgICAgcG9pbnQudGlsZXNbZF0gPSB0aWxlO1xuXG4gICAgICAgIHJldHVybiBwb2ludDtcbiAgICB9KTtcbiAgICB0aWxlLnBvaW50cyA9IHsgbiA6IHB0c1swXSwgdyA6IHB0c1sxXSwgcyA6IHB0c1syXSwgZSA6IHB0c1szXSB9O1xuXG4gICAgY3JlYXRlZC5mb3JFYWNoKGZ1bmN0aW9uIChwdCkge1xuICAgICAgICBzZWxmLmVtaXQoJ2NyZWF0ZVBvaW50JywgcHQpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHRpbGU7XG59O1xuXG5UaWxlTWFwLnByb3RvdHlwZS50aWxlQXQgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHJldHVybiB0aGlzLnRpbGVzW3ggKyAnLCcgKyB5XTtcbn07XG5cblRpbGVNYXAucHJvdG90eXBlLnBvaW50QXQgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHJldHVybiB0aGlzLnBvaW50c1t4ICsgJywnICsgeV07XG59O1xuXG5UaWxlTWFwLnByb3RvdHlwZS5pbWFnZVBvcyA9IGZ1bmN0aW9uIChpbWFnZSwgeCwgeSkge1xuICAgIHZhciB3ID0gdGhpcy50b1dvcmxkKHgsIHkpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgeDogd1swXSAtIGltYWdlLndpZHRoIC8gMixcbiAgICAgICAgeTogd1sxXSAtIGltYWdlLmhlaWdodCArIDI1XG4gICAgfTtcbn1cblxuVGlsZU1hcC5wcm90b3R5cGUuY3JlYXRlSXRlbSA9IGZ1bmN0aW9uIChzcmMsIHgsIHksIGNiKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciBpbSA9IG5ldyBJbWFnZTtcblxuICAgIGltLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpdGVtID0gbmV3IEV2ZW50RW1pdHRlcjtcbiAgICAgICAgdmFyIGltYWdlUG9zID0gc2VsZi5pbWFnZVBvcyhpbSwgeCwgeSk7XG4gICAgICAgIGl0ZW0uZWxlbWVudCA9IHNlbGYucGFwZXIuaW1hZ2UoXG4gICAgICAgICAgICBzcmMsXG4gICAgICAgICAgICBpbWFnZVBvcy54LCBpbWFnZVBvcy55LFxuICAgICAgICAgICAgaW0ud2lkdGgsIGltLmhlaWdodFxuICAgICAgICApO1xuICAgICAgICBpdGVtLmltYWdlID0gaW07XG4gICAgICAgIGl0ZW0ueCA9IHg7XG4gICAgICAgIGl0ZW0ueSA9IHk7XG5cbiAgICAgICAgdmFyIHB0ID0gc2VsZi50b1dvcmxkKHgsIHkpO1xuICAgICAgICBpdGVtLnNjcmVlblggPSBwdFswXTtcbiAgICAgICAgaXRlbS5zY3JlZW5ZID0gcHRbMV07XG4gICAgICAgIGl0ZW0uaW1hZ2VYID0gaW1hZ2VQb3MueDtcbiAgICAgICAgaXRlbS5pbWFnZVkgPSBpbWFnZVBvcy55O1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2VsZi5pdGVtU3RhY2subGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChwdFsxXSA8PSBzZWxmLml0ZW1TdGFja1tpXS5zY3JlZW5ZKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5pdGVtU3RhY2suc3BsaWNlKGksIDAsIGl0ZW0pO1xuICAgICAgICAgICAgICAgIHNlbGYuaXRlbVNldC5zcGxpY2UoaSwgMCwgaXRlbS5lbGVtZW50KTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaSA9PT0gc2VsZi5pdGVtU3RhY2subGVuZ3RoKSB7XG4gICAgICAgICAgICBzZWxmLml0ZW1TdGFjay5wdXNoKGl0ZW0pO1xuICAgICAgICAgICAgc2VsZi5pdGVtU2V0LnB1c2goaXRlbS5lbGVtZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNlbGYuaXRlbVNldC50b0Zyb250KCk7XG4gICAgICAgIHNlbGYuaXRlbXNbeCArICcsJyArIHldID0gaXRlbTtcblxuICAgICAgICBpZiAodHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSBjYihudWxsLCBpdGVtKTtcbiAgICB9KTtcbiAgICBpbS5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGNiKTtcbiAgICBpbS5zcmMgPSBzcmM7XG59O1xuXG5UaWxlTWFwLnByb3RvdHlwZS5yZW1vdmVJdGVtID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICB2YXIgaXRlbSA9IHRoaXMuaXRlbUF0KHgsIHkpO1xuICAgIGlmIChpdGVtKSB7XG4gICAgICAgIGRlbGV0ZSB0aGlzLml0ZW1zW3ggKyAnLCcgKyB5XTtcbiAgICAgICAgaXRlbS5lbGVtZW50LnJlbW92ZSgpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuaXRlbVN0YWNrLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoaXRlbSA9PT0gdGhpcy5pdGVtU3RhY2tbaV0pIHtcbiAgICAgICAgICAgICAgICB0aGlzLml0ZW1TdGFjay5zcGxpY2UoaSwgMSk7XG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtU2V0LnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB0aGlzLml0ZW1TZXQudG9Gcm9udCgpO1xuICAgIH1cbn07XG5cblRpbGVNYXAucHJvdG90eXBlLml0ZW1BdCA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgcmV0dXJuIHRoaXMuaXRlbXNbeCArICcsJyArIHldO1xufTtcblxuVGlsZU1hcC5wcm90b3R5cGUuY3JlYXRlV2FsbCA9IGZ1bmN0aW9uIChzcmMsIHB0MCwgcHQxLCBjYikge1xuICAgIGlmIChwdDAueSA9PT0gcHQxLnkpIHtcbiAgICAgICAgdmFyIHgwID0gTWF0aC5taW4ocHQwLngsIHB0MS54KTtcbiAgICAgICAgdmFyIHh0ID0gTWF0aC5tYXgocHQwLngsIHB0MS54KTtcbiAgICAgICAgZm9yICh2YXIgeCA9IHgwOyB4IDwgeHQ7IHgrKykge1xuICAgICAgICAgICAgdGhpcy5jcmVhdGVJdGVtKHNyYywgeCArIDAuNzUsIHB0MC55IC0gMC4yNSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZWxzZSBpZiAocHQwLnggPT09IHB0MS54KSB7XG4gICAgICAgIHZhciB5MCA9IE1hdGgubWluKHB0MC55LCBwdDEueSk7XG4gICAgICAgIHZhciB5dCA9IE1hdGgubWF4KHB0MC55LCBwdDEueSk7XG4gICAgICAgIGZvciAodmFyIHkgPSB5MDsgeSA8IHl0OyB5KyspIHtcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlSXRlbShzcmMsIHB0MC54ICsgMC4yNSwgeSArIDAuMjUpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuVGlsZU1hcC5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgdGhpcy5tb3ZlVG8odGhpcy5wb3NpdGlvblswXSArIHgsIHRoaXMucG9zaXRpb25bMV0gKyB5KTtcbn07XG5cblRpbGVNYXAucHJvdG90eXBlLm1vdmVUbyA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgdGhpcy5wb3NpdGlvbiA9IFsgeCwgeSBdO1xuICAgIHRoaXMuX3NldFZpZXcoKTtcbn07XG5cblRpbGVNYXAucHJvdG90eXBlLm1vdmVJdGVtID0gZnVuY3Rpb24oaXRlbSwgeCwgeSkge1xuICAgIHZhciBmcm9tID0ge3g6IGl0ZW0uaW1hZ2VYLCB5OiBpdGVtLmltYWdlWX07XG4gICAgdmFyIHRvID0gdGhpcy5pbWFnZVBvcyhpdGVtLmltYWdlLCB4LCB5KTtcbiAgICBkZWxldGUgdGhpcy5pdGVtc1tmcm9tLnggKyAnLCcgKyBmcm9tLnldO1xuXG4gICAgaXRlbS54ID0geDtcbiAgICBpdGVtLnNjcmVlblggPSB0by54O1xuICAgIGl0ZW0uaW1hZ2VYID0gdG8ueDtcbiAgICBpdGVtLnkgPSB5O1xuICAgIGl0ZW0uc2NyZWVuWSA9IHRvLnk7XG4gICAgaXRlbS5pbWFnZVkgPSB0by55O1xuXG4gICAgdGhpcy5pdGVtU2V0LnB1c2goaXRlbS5lbGVtZW50KTtcbiAgICB0aGlzLml0ZW1TdGFjay5wdXNoKGl0ZW0pO1xuICAgIHRoaXMuaXRlbVNldC50b0Zyb250KCk7XG5cbiAgICB0aGlzLml0ZW1zW3ggKyAnLCcgKyB5XSA9IGl0ZW07XG5cbiAgICAvLyBpdGVtLmVsZW1lbnQuYXR0cih7eDogaXRlbS5pbWFnZVgsIHk6IGl0ZW0uaW1hZ2VZfSk7XG4gICAgaXRlbS5lbGVtZW50LmFuaW1hdGUoe3g6IGl0ZW0uaW1hZ2VYLCB5OiBpdGVtLmltYWdlWX0sIDMwMCwgJz4nKTtcbn07XG5cblRpbGVNYXAucHJvdG90eXBlLnBhbiA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgdmFyIHR4ID0geCAvIDIgKyB5IC8gMjtcbiAgICB2YXIgdHkgPSB4IC8gMiAtIHkgLyAyO1xuXG4gICAgdGhpcy5tb3ZlKFxuICAgICAgICB0eCAvIE1hdGgucG93KHRoaXMuem9vbUxldmVsLCAwLjUpLFxuICAgICAgICB0eSAvIE1hdGgucG93KHRoaXMuem9vbUxldmVsLCAwLjUpXG4gICAgKTtcbn07XG5cblRpbGVNYXAucHJvdG90eXBlLnpvb20gPSBmdW5jdGlvbiAobGV2ZWwpIHtcbiAgICB0aGlzLnpvb21MZXZlbCA9IGxldmVsO1xuICAgIHRoaXMuX3NldFZpZXcoKTtcbn07XG5cblRpbGVNYXAucHJvdG90eXBlLl9zZXRWaWV3ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciB3ID0gdGhpcy5zaXplWzBdIC8gdGhpcy56b29tTGV2ZWw7XG4gICAgdmFyIGggPSB0aGlzLnNpemVbMV0gLyB0aGlzLnpvb21MZXZlbDtcblxuICAgIHZhciBwdCA9IHRoaXMudG9Xb3JsZCh0aGlzLnBvc2l0aW9uWzBdLCB0aGlzLnBvc2l0aW9uWzFdKTtcbiAgICB2YXIgeCA9IHB0WzBdIC0gdyAvIDI7XG4gICAgdmFyIHkgPSBwdFsxXSAtIGggLyAyO1xuXG4gICAgdGhpcy5wYXBlci5zZXRWaWV3Qm94KHgsIHksIHcsIGgpO1xufTtcblxuVGlsZU1hcC5wcm90b3R5cGUudG9Xb3JsZCA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgdmFyIHR4ID0geCAvIDIgKyB5IC8gMjtcbiAgICB2YXIgdHkgPSAteCAvIDIgKyB5IC8gMjtcbiAgICByZXR1cm4gWyB0eCAqIDEwMCwgdHkgKiA1MCBdO1xufTtcblxuVGlsZU1hcC5wcm90b3R5cGUuZnJvbVdvcmxkID0gZnVuY3Rpb24gKHR4LCB0eSkge1xuICAgIHZhciB4ID0gdHggLyAxMDA7XG4gICAgdmFyIHkgPSB0eSAvIDUwO1xuICAgIHJldHVybiBbIHggLSB5LCB4ICsgeSBdO1xufTtcblxuZnVuY3Rpb24gcG9seWdvbiAocG9pbnRzKSB7XG4gICAgdmFyIHhzID0gcG9pbnRzLm1hcChmdW5jdGlvbiAocCkgeyByZXR1cm4gcC5qb2luKCcsJykgfSk7XG4gICAgcmV0dXJuICdNJyArIHhzWzBdICsgJyBMJyArIHhzLnNsaWNlKDEpLmpvaW4oJyAnKSArICcgWic7XG59XG5cblRpbGVNYXAucHJvdG90eXBlLmFwcGVuZFRvID0gZnVuY3Rpb24gKHRhcmdldCkge1xuICAgIHRhcmdldC5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnQpO1xufTtcblxuLy8gVGlsZU1hcC5wcm90b3R5cGUudGllID0gZnVuY3Rpb24gKHdpbikge1xuLy8gICAgIHZhciBzZWxmID0gdGhpcztcbi8vICAgICBzZWxmLnRpZWQucHVzaCh3aW4pO1xuXG4vLyAgICAgdmFyIG9uID0gdHlwZW9mIHdpbi5hZGRFdmVudExpc3RlbmVyID09PSAnZnVuY3Rpb24nXG4vLyAgICAgICAgID8gd2luLmFkZEV2ZW50TGlzdGVuZXJcbi8vICAgICAgICAgOiB3aW4ub25cbi8vICAgICA7XG4vLyAgICAgb24uY2FsbCh3aW4sICdrZXlkb3duJywgZnVuY3Rpb24gKGV2KSB7XG4vLyAgICAgICAgIHZhciBlID0gT2JqZWN0LmtleXMoZXYpLnJlZHVjZShmdW5jdGlvbiAoYWNjLCBrZXkpIHtcbi8vICAgICAgICAgICAgIGFjY1trZXldID0gZXZba2V5XTtcbi8vICAgICAgICAgICAgIHJldHVybiBhY2M7XG4vLyAgICAgICAgIH0sIHt9KTtcbi8vICAgICAgICAgdmFyIHByZXZlbnRlZCA9IGZhbHNlO1xuLy8gICAgICAgICBlLnByZXZlbnREZWZhdWx0ID0gZnVuY3Rpb24gKCkge1xuLy8gICAgICAgICAgICAgcHJldmVudGVkID0gdHJ1ZTtcbi8vICAgICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XG4vLyAgICAgICAgIH07XG4vLyAgICAgICAgIHNlbGYuZW1pdCgna2V5ZG93bicsIGUpO1xuLy8gICAgICAgICBpZiAocHJldmVudGVkKSByZXR1cm47XG5cbi8vICAgICAgICAgdmFyIGtleSA9IGV2LmtleUlkZW50aWZpZXIudG9Mb3dlckNhc2UoKTtcbi8vICAgICAgICAgdmFyIGR6ID0ge1xuLy8gICAgICAgICAgICAgMTg3IDogMSAvIDAuOSxcbi8vICAgICAgICAgICAgIDE4OSA6IDAuOSxcbi8vICAgICAgICAgfVtldi5rZXlDb2RlXTtcbi8vICAgICAgICAgaWYgKGR6KSByZXR1cm4gc2VsZi56b29tKHNlbGYuem9vbUxldmVsICogZHopO1xuLy8gICAgICAgICBpZiAoZXYua2V5Q29kZSA9PT0gNDkpIHJldHVybiBzZWxmLnpvb20oMSk7XG5cbi8vICAgICAgICAgdmFyIGR4eSA9IHtcbi8vICAgICAgICAgICAgIGRvd24gOiBbIDAsIC0xIF0sXG4vLyAgICAgICAgICAgICB1cCA6IFsgMCwgKzEgXSxcbi8vICAgICAgICAgICAgIGxlZnQgOiBbIC0xLCAwIF0sXG4vLyAgICAgICAgICAgICByaWdodCA6IFsgKzEsIDAgXVxuLy8gICAgICAgICB9W2tleV07XG5cbi8vICAgICAgICAgaWYgKGR4eSkge1xuLy8gICAgICAgICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcbi8vICAgICAgICAgICAgIHNlbGYucGFuKGR4eVswXSwgZHh5WzFdKTtcbi8vICAgICAgICAgfVxuLy8gICAgIH0pO1xuXG4vLyAgICAgKGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICAgdmFyIHNlbGVjdGVkID0ge307XG4vLyAgICAgICAgIHNlbGYuc2VsZWN0ZWQucHVzaChzZWxlY3RlZCk7XG5cbi8vICAgICAgICAgb24uY2FsbCh3aW4sICdtb3VzZW1vdmUnLCBmdW5jdGlvbiAoZXYpIHtcbi8vICAgICAgICAgICAgIHZhciB4eSA9IHNlbGYuZnJvbVdvcmxkKFxuLy8gICAgICAgICAgICAgICAgIChldi5jbGllbnRYIC0gc2VsZi5zaXplWzBdIC8gMikgLyBzZWxmLnpvb21MZXZlbCxcbi8vICAgICAgICAgICAgICAgICAoZXYuY2xpZW50WSAtIHNlbGYuc2l6ZVsxXSAvIDIpIC8gc2VsZi56b29tTGV2ZWxcbi8vICAgICAgICAgICAgICk7XG5cbi8vICAgICAgICAgICAgIHZhciB0eCA9IE1hdGgucm91bmQoeHlbMF0gKyBzZWxmLnBvc2l0aW9uWzBdKTtcbi8vICAgICAgICAgICAgIHZhciB0eSA9IE1hdGgucm91bmQoeHlbMV0gKyBzZWxmLnBvc2l0aW9uWzFdKTtcbi8vICAgICAgICAgICAgIHZhciB0aWxlID0gc2VsZi50aWxlQXQodHgsIHR5KTtcblxuLy8gICAgICAgICAgICAgaWYgKHRpbGUgJiYgdGlsZSAhPT0gc2VsZWN0ZWQudGlsZSkge1xuLy8gICAgICAgICAgICAgICAgIGlmIChzZWxlY3RlZC50aWxlKSB7XG4vLyAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkLnRpbGUuZW1pdCgnbW91c2VvdXQnLCBldik7XG4vLyAgICAgICAgICAgICAgICAgICAgIHNlbGYuZW1pdCgnbW91c2VvdXQnLCBzZWxlY3RlZC50aWxlLCBldik7XG4vLyAgICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgICAgIHNlbGVjdGVkLnRpbGUgPSB0aWxlO1xuLy8gICAgICAgICAgICAgICAgIHRpbGUuZW1pdCgnbW91c2VvdmVyJywgZXYpO1xuLy8gICAgICAgICAgICAgICAgIHNlbGYuZW1pdCgnbW91c2VvdmVyJywgdGlsZSwgZXYpO1xuLy8gICAgICAgICAgICAgfVxuXG4vLyAgICAgICAgICAgICB2YXIgcHggPSBNYXRoLmZsb29yKHh5WzBdICsgc2VsZi5wb3NpdGlvblswXSkgKyAwLjU7XG4vLyAgICAgICAgICAgICB2YXIgcHkgPSBNYXRoLmZsb29yKHh5WzFdICsgc2VsZi5wb3NpdGlvblsxXSkgKyAwLjU7XG4vLyAgICAgICAgICAgICB2YXIgcHQgPSBzZWxmLnBvaW50QXQocHgsIHB5KTtcblxuLy8gICAgICAgICAgICAgaWYgKHB0ICYmIHB0ICE9PSBzZWxlY3RlZC5wb2ludCkge1xuLy8gICAgICAgICAgICAgICAgIGlmIChzZWxlY3RlZC5wb2ludCkge1xuLy8gICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZC5wb2ludC5lbWl0KCdtb3VzZW91dCcsIGV2KTtcbi8vICAgICAgICAgICAgICAgICAgICAgc2VsZi5lbWl0KCdtb3VzZW91dCcsIHNlbGVjdGVkLnBvaW50LCBldik7XG4vLyAgICAgICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICAgICAgIHNlbGVjdGVkLnBvaW50ID0gcHQ7XG4vLyAgICAgICAgICAgICAgICAgcHQuZW1pdCgnbW91c2VvdmVyJywgZXYpO1xuLy8gICAgICAgICAgICAgICAgIHNlbGYuZW1pdCgnbW91c2VvdXQnLCBwdCwgZXYpO1xuLy8gICAgICAgICAgICAgfVxuLy8gICAgICAgICB9KTtcblxuLy8gICAgICAgICBbICdjbGljaycsICdtb3VzZWRvd24nLCAnbW91c2V1cCcgXS5mb3JFYWNoKGZ1bmN0aW9uIChldk5hbWUpIHtcbi8vICAgICAgICAgICAgIG9uLmNhbGwod2luLCBldk5hbWUsIGZ1bmN0aW9uIChldikge1xuLy8gICAgICAgICAgICAgICAgIGlmIChzZWxlY3RlZC50aWxlKSB7XG4vLyAgICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkLnRpbGUuZW1pdChldk5hbWUsIGV2KTtcbi8vICAgICAgICAgICAgICAgICAgICAgc2VsZi5lbWl0KGV2TmFtZSwgc2VsZWN0ZWQudGlsZSwgZXYpO1xuLy8gICAgICAgICAgICAgICAgIH1cbi8vICAgICAgICAgICAgICAgICBpZiAoc2VsZWN0ZWQucG9pbnQpIHtcbi8vICAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQucG9pbnQuZW1pdChldk5hbWUsIGV2KTtcbi8vICAgICAgICAgICAgICAgICAgICAgc2VsZi5lbWl0KGV2TmFtZSwgc2VsZWN0ZWQucG9pbnQsIGV2KTtcbi8vICAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICB9KTtcbi8vICAgICAgICAgfSk7XG4vLyAgICAgfSkoKTtcbi8vIH07XG5cblRpbGVNYXAucHJvdG90eXBlLnJlbGVhc2UgPSBmdW5jdGlvbiAobW9kZSkge1xuICAgIHRoaXMuc2VsZWN0ZWQuZm9yRWFjaChmdW5jdGlvbiAocykge1xuICAgICAgICBpZiAoc1ttb2RlXSkgc1ttb2RlXS5lbWl0KCdtb3VzZW91dCcpO1xuICAgIH0pO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gVGlsZXM7XG5cbmZ1bmN0aW9uIFRpbGVzKGdyaWQpIHtcbiAgdmFyIHNlbGYgPSB7fTtcblxuICBzZWxmLnRpbGVzID0gW107XG5cbiAgc2VsZi5ncmlkID0gZ3JpZDtcblxuICBzZWxmLmNyZWF0ZSA9IGNyZWF0ZTtcblxuICByZXR1cm4gc2VsZjtcbn1cblxuZnVuY3Rpb24gY3JlYXRlKHgsIHkpIHtcbiAgdmFyIHRpbGUgPSB0aGlzLmdyaWQuY3JlYXRlVGlsZSh4LCB5KTtcbiAgdGlsZS5lbGVtZW50LmF0dHIoJ2ZpbGwnLCAncmdiYSgyMTAsMjEwLDIxMCwxLjApJyk7XG4gIHRpbGUuZWxlbWVudC5hdHRyKCdzdHJva2Utd2lkdGgnLCAnMScpO1xuICB0aWxlLmVsZW1lbnQuYXR0cignc3Ryb2tlJywgJ3JnYigyNTUsMjU1LDIwMCknKTtcblxuICB0aWxlLm9uKCdtb3VzZW92ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5sb2coJ2F0JywgdGlsZS54LCB0aWxlLnkpO1xuICAgIHRpbGUuZWxlbWVudC50b0Zyb250KCk7XG4gICAgdGlsZS5lbGVtZW50LmF0dHIoJ2ZpbGwnLCAncmdiYSgyNTUsMTI3LDEyNywwLjgpJyk7XG4gIH0pO1xuXG4gIHRpbGUub24oJ21vdXNlb3V0JywgZnVuY3Rpb24gKCkge1xuICAgIHRpbGUuZWxlbWVudC50b0JhY2soKTtcbiAgICB0aWxlLmVsZW1lbnQuYXR0cignZmlsbCcsICdyZ2JhKDIxMCwyMTAsMjEwLDEuMCknKTtcbiAgfSk7XG5cbiAgdGhpcy50aWxlcy5wdXNoKHRpbGUpO1xuXG4gIHJldHVybiB0aWxlO1xufSIsInZhciBleHRlbmQgPSByZXF1aXJlKCd4dGVuZCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFdhbGxUeXBlO1xuXG52YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG4gIGltYWdlczoge1xuICAgIGxlZnQ6ICcvc3ByaXRlcy93YWxscy9wbGFpbi9sZWZ0LnBuZycsXG4gICAgcmlnaHQ6ICcvc3ByaXRlcy93YWxscy9wbGFpbi9yaWdodC5wbmcnXG4gIH0sXG4gIHRyYXZlcnNhYmxlOiBmYWxzZVxufVxuXG5mdW5jdGlvbiBXYWxsVHlwZShvcHRpb25zKSB7XG4gIHZhciBzZWxmID0ge307XG5cbiAgb3B0aW9ucyA9IGV4dGVuZCh7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMgfHwge30pO1xuXG4gIHNlbGYuaW1hZ2VzID0gb3B0aW9ucy5pbWFnZXM7XG5cblxuICAvLy8gbWV0aG9kc1xuXG4gIHNlbGYuaW1hZ2UgPSBpbWFnZTtcblxuXG4gIHJldHVybiBzZWxmO1xufVxuXG5mdW5jdGlvbiBpbWFnZShvcmllbnRhdGlvbikge1xuICB2YXIgaW1nID0gdGhpcy5pbWFnZXNbb3JpZW50YXRpb25dO1xuICBpZiAoISBpbWcpIHRocm93IG5ldyBFcnJvcignbm8gaW1hZ2UgZm9yIG9yaWVudGF0aW9uICcgKyBvcmllbnRhdGlvbik7XG4gIHJldHVybiBpbWc7XG59IiwidmFyIFdhbGxUeXBlID0gcmVxdWlyZSgnLi93YWxsX3R5cGUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBXYWxsVHlwZXM7XG5cbmZ1bmN0aW9uIFdhbGxUeXBlcyhib2FyZCkge1xuICB2YXIgc2VsZiA9IHt9O1xuXG4gIHNlbGYuYm9hcmQgPSBib2FyZDtcblxuXG4gIC8vLyBtZXRob2RzXG5cbiAgc2VsZi5jcmVhdGUgPSBjcmVhdGU7XG5cbiAgcmV0dXJuIHNlbGY7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZShvcHRpb25zKSB7XG4gIHJldHVybiBXYWxsVHlwZShvcHRpb25zKTtcbn0iLCJ2YXIgXyA9IHJlcXVpcmUoJ3VuZGVyc2NvcmUnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBXYWxscztcblxuZnVuY3Rpb24gV2FsbHMoYm9hcmQpIHtcbiAgdmFyIHNlbGYgPSB7fTtcblxuICBzZWxmLndhbGxzID0ge307XG5cbiAgc2VsZi5ib2FyZCA9IGJvYXJkO1xuXG4gIHNlbGYucGxhY2UgPSBwbGFjZTtcbiAgc2VsZi5wbGFjZU9uZSA9IHBsYWNlT25lO1xuICBzZWxmLmF0ID0gYXQ7XG4gIHNlbGYudHJhdmVyc2FibGUgPSB0cmF2ZXJzYWJsZTtcblxuICByZXR1cm4gc2VsZjtcbn1cblxuLy8vIHBsYWNlXG5cbmZ1bmN0aW9uIHBsYWNlKHdhbGxUeXBlLCBmcm9tLCB0bykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFsaWRhdGVJbml0aWFsV2FsbENvb3Jkcyhmcm9tKTtcbiAgdmFsaWRhdGVJbml0aWFsV2FsbENvb3Jkcyh0byk7XG5cbiAgaWYgKGZyb20ueCAhPSB0by54ICYmIGZyb20ueSAhPSB0by55KVxuICAgIHRocm93IG5ldyBFcnJvcignd2FsbHMgbXVzdCBiZSBkcmF3biBpbiBhIGxpbmUnKTtcblxuICBpZiAoZnJvbS54ID09IHRvLngpIHtcbiAgICB2YXIgbWF4WSA9IE1hdGgubWF4KGZyb20ueSwgdG8ueSk7XG4gICAgdmFyIG1pblkgPSBNYXRoLm1pbihmcm9tLnksIHRvLnkpO1xuICAgIGZvcih2YXIgeSA9IG1pblk7IHkgPCBtYXhZOyB5ID0geSArIDEpIHtcbiAgICAgIHNlbGYucGxhY2VPbmUod2FsbFR5cGUsIGZyb20ueCwgeSArIDAuNSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHZhciBtYXhYID0gTWF0aC5tYXgoZnJvbS54LCB0by54KTtcbiAgICB2YXIgbWluWCA9IE1hdGgubWluKGZyb20ueCwgdG8ueCk7XG4gICAgZm9yKHZhciB4ID0gbWluWDsgeCA8IG1heFg7IHggKz0gMSkge1xuICAgICAgc2VsZi5wbGFjZU9uZSh3YWxsVHlwZSwgeCArIDAuNSwgZnJvbS55KTtcbiAgICB9XG4gIH1cbn1cblxuXG4vLy8gcGxhY2VPbmVcblxuZnVuY3Rpb24gcGxhY2VPbmUod2FsbFR5cGUsIHgsIHkpIHtcblxuICB2YXIgb3JpZW50YXRpb247XG5cbiAgdmFyIHhJc1plcm8gPSB2YWxpZGF0ZU9uZVdhbGxDb29yZHMoeCwgeSk7XG4gIHZhciBmcm9tLCB0bztcbiAgaWYoeElzWmVybykge1xuICAgIGZyb20gPSB7XG4gICAgICB4OiB4IC0gMC41LFxuICAgICAgeTogeVxuICAgIH07XG5cbiAgICB0byA9IHtcbiAgICAgIHg6IHggKyAwLjUsXG4gICAgICB5OiB5XG4gICAgfVxuXG4gICAgb3JpZW50YXRpb24gPSAnbGVmdCc7XG4gIH0gZWxzZSB7XG4gICAgZnJvbSA9IHtcbiAgICAgIHg6IHgsXG4gICAgICB5OiB5IC0gMC41XG4gICAgfTtcblxuICAgIHRvID0ge1xuICAgICAgeDogeCxcbiAgICAgIHk6IHkgKyAwLjVcbiAgICB9XG5cbiAgICBvcmllbnRhdGlvbiA9ICdyaWdodCc7XG4gIH1cblxuICB2YXIgaW1hZ2UgPSB3YWxsVHlwZS5pbWFnZShvcmllbnRhdGlvbik7XG5cbiAgdmFyIHJvdyA9IHRoaXMud2FsbHNbeF07XG4gIGlmICghIHJvdykgcm93ID0gdGhpcy53YWxsc1t4XSA9IHt9O1xuICByb3dbeV0gPSB3YWxsVHlwZTtcblxuICB0aGlzLmJvYXJkLmdyaWQuY3JlYXRlV2FsbChpbWFnZSwgZnJvbSwgdG8pO1xufVxuXG5mdW5jdGlvbiBhdCh4LCB5KSB7XG4gIHZhciB3YWxsID0gdGhpcy53YWxsc1t4XTtcbiAgaWYgKHdhbGwpIHdhbGwgPSB3YWxsW3ldO1xuXG4gIHJldHVybiB3YWxsO1xufVxuXG5cbmZ1bmN0aW9uIHRyYXZlcnNhYmxlKGZyb20sIHRvKSB7XG4gIHZhciB3YWxsO1xuICB2YXIgd2FsbHM7XG4gIHZhciB0cmF2ZXJzYWJsZTtcblxuICB2YXIgZGlmZlggPSB0by54IC0gZnJvbS54O1xuICB2YXIgZGlmZlkgPSB0by55IC0gZnJvbS55O1xuXG4gIGlmIChNYXRoLmFicyhkaWZmWCkgPiAxIHx8IE1hdGguYWJzKGRpZmZZKSA+IDEpXG4gICAgdGhyb3cgbmV3IEVycm9yKCdjYW5ub3QgY2FsY3VsYXRlIHRyYXZlcnNhYmlsaXR5IGZvciBkaXN0YW5jZXMgPiAxJyk7XG5cbiAgdmFyIG1pZFggPSBmcm9tLnggKyBkaWZmWCAvIDI7XG4gIHZhciBtaWRZID0gZnJvbS55ICsgZGlmZlkgLyAyO1xuXG4gIGlmIChkaWZmWCA9PSAwIHx8IGRpZmZZID09IDApIHtcbiAgICAvLyBubyBkaWFnb25hbFxuICAgIHdhbGwgPSB0aGlzLmF0KG1pZFgsIG1pZFkpO1xuICAgIHRyYXZlcnNhYmxlID0gISB3YWxsIHx8IHdhbGwudHJhdmVyc2FibGU7XG4gIH0gZWxzZSB7XG4gICAgLy8gZGlhZ29uYWxcblxuICAgIHZhciB3YWxsMSA9IHRoaXMuYXQobWlkWCwgZnJvbS55KTtcbiAgICB3YWxsMSA9IHdhbGwxICYmICF3YWxsMS50cmF2ZXJzYWJsZTtcblxuICAgIHZhciB3YWxsMiA9IHRoaXMuYXQodG8ueCwgbWlkWSk7XG4gICAgd2FsbDIgPSB3YWxsMiAmJiAhd2FsbDIudHJhdmVyc2FibGU7XG5cbiAgICB2YXIgd2FsbDMgPSB0aGlzLmF0KG1pZFgsIHRvLnkpO1xuICAgIHdhbGwzID0gd2FsbDMgJiYgIXdhbGwzLnRyYXZlcnNhYmxlO1xuXG4gICAgdmFyIHdhbGw0ID0gdGhpcy5hdChmcm9tLngsIG1pZFkpO1xuICAgIHdhbGw0ID0gd2FsbDQgJiYgIXdhbGw0LnRyYXZlcnNhYmxlO1xuXG4gICAgdHJhdmVyc2FibGUgPSAoXG4gICAgICAgICAhKHdhbGwxICYmIHdhbGwyKVxuICAgICAgJiYgISh3YWxsMiAmJiB3YWxsMylcbiAgICAgICYmICEod2FsbDMgJiYgd2FsbDQpXG4gICAgICAmJiAhKHdhbGw0ICYmIHdhbGwxKVxuICAgICAgJiYgISh3YWxsMSAmJiB3YWxsMylcbiAgICAgICYmICEod2FsbDIgJiYgd2FsbDQpXG4gICAgICAmJiAhKHdhbGwzICYmIHdhbGwxKSk7XG4gIH1cblxuICByZXR1cm4gdHJhdmVyc2FibGU7XG59XG5cbmZ1bmN0aW9uIGlzVHJhdmVyc2FibGUod2FsbCkge1xuICByZXR1cm4gd2FsbC50cmF2ZXJzYWJsZTtcbn1cblxuXG5cbi8vLyBNaXNjXG5cbmZ1bmN0aW9uIHZhbGlkYXRlSW5pdGlhbFdhbGxDb29yZHMoY29vcmRzKSB7XG4gIHZhciB4ID0gY29vcmRzLng7XG4gIGlmIChNYXRoLmFicyhNYXRoLnJvdW5kKHgpIC0geCkgIT09IDAuNSkgdGhyb3cgbmV3IEVycm9yKCd3YWxsIHggY29vcmRpbmF0ZSBtdXN0IGJlIG4uNScpO1xuICB2YXIgeSA9IGNvb3Jkcy55O1xuICBpZiAoTWF0aC5hYnMoTWF0aC5yb3VuZCh5KSAtIHkpICE9PSAwLjUpIHRocm93IG5ldyBFcnJvcignd2FsbCB5IGNvb3JkaW5hdGUgbXVzdCBiZSBuLjUnKTtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVPbmVXYWxsQ29vcmRzKHgsIHkpIHtcbiAgdmFyIHhGcmFjdGlvbiA9IE1hdGguYWJzKE1hdGgucm91bmQoeCkgLSB4KSA9PT0gMC41O1xuICB2YXIgeUZyYWN0aW9uID0gTWF0aC5hYnMoTWF0aC5yb3VuZCh5KSAtIHkpID09PSAwLjU7XG5cbiAgaWYgKHhGcmFjdGlvbiAmJiB5RnJhY3Rpb24gfHwgISAoeEZyYWN0aW9uIHx8IHlGcmFjdGlvbikpXG4gICAgdGhyb3cgbmV3IEVycm9yKCd3YWxsIGNhblxcJ3QgYmUgcGxhY2VkIGF0ICcgKyB4ICsgJywgJyArIHkpO1xuXG4gIHJldHVybiB4RnJhY3Rpb247XG59IiwiLy8gQnJvd3NlcmlmeSBtb2RpZmljYXRpb25zIGJ5IEJyZW50b24gUGFydHJpZGdlLCByZWxlYXNlZCBpbnRvIHRoZSBwdWJsaWMgZG9tYWluXG5cbi8vIEJFR0lOIEJST1dTRVJJRlkgTU9EXG52YXIgZXZlLCBSYXBoYWVsID0gJ2Zvbyc7XG4vLyBFTkQgQlJPV1NFUklGWSBNT0RcblxuLy8g4pSM4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSQIFxcXFxcbi8vIOKUgiBSYXBoYcOrbCAyLjEuMCAtIEphdmFTY3JpcHQgVmVjdG9yIExpYnJhcnkgICAgICAgICAgICAgICAgICAgICAgICAgIOKUgiBcXFxcXG4vLyDilJzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilKQgXFxcXFxuLy8g4pSCIENvcHlyaWdodCDCqSAyMDA4LTIwMTIgRG1pdHJ5IEJhcmFub3Zza2l5IChodHRwOi8vcmFwaGFlbGpzLmNvbSkgICAg4pSCIFxcXFxcbi8vIOKUgiBDb3B5cmlnaHQgwqkgMjAwOC0yMDEyIFNlbmNoYSBMYWJzIChodHRwOi8vc2VuY2hhLmNvbSkgICAgICAgICAgICAgIOKUgiBcXFxcXG4vLyDilJzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilKQgXFxcXFxuLy8g4pSCIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgKGh0dHA6Ly9yYXBoYWVsanMuY29tL2xpY2Vuc2UuaHRtbCkgbGljZW5zZS7ilIIgXFxcXFxuLy8g4pSU4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSYIFxcXFxcblxuLy8g4pSM4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSQIFxcXFxcbi8vIOKUgiBFdmUgMC4zLjQgLSBKYXZhU2NyaXB0IEV2ZW50cyBMaWJyYXJ5ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4pSCIFxcXFxcbi8vIOKUnOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUpCBcXFxcXG4vLyDilIIgQ29weXJpZ2h0IChjKSAyMDA4LTIwMTEgRG1pdHJ5IEJhcmFub3Zza2l5IChodHRwOi8vZG1pdHJ5LmJhcmFub3Zza2l5LmNvbS8pICAgICAgICAgIOKUgiBcXFxcXG4vLyDilIIgTGljZW5zZWQgdW5kZXIgdGhlIE1JVCAoaHR0cDovL3d3dy5vcGVuc291cmNlLm9yZy9saWNlbnNlcy9taXQtbGljZW5zZS5waHApIGxpY2Vuc2UuIOKUgiBcXFxcXG4vLyDilJTilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilJggXFxcXFxuXG4oZnVuY3Rpb24gKGdsb2IpIHtcbiAgICB2YXIgdmVyc2lvbiA9IFwiMC4zLjRcIixcbiAgICAgICAgaGFzID0gXCJoYXNPd25Qcm9wZXJ0eVwiLFxuICAgICAgICBzZXBhcmF0b3IgPSAvW1xcLlxcL10vLFxuICAgICAgICB3aWxkY2FyZCA9IFwiKlwiLFxuICAgICAgICBmdW4gPSBmdW5jdGlvbiAoKSB7fSxcbiAgICAgICAgbnVtc29ydCA9IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgICByZXR1cm4gYSAtIGI7XG4gICAgICAgIH0sXG4gICAgICAgIGN1cnJlbnRfZXZlbnQsXG4gICAgICAgIHN0b3AsXG4gICAgICAgIGV2ZW50cyA9IHtuOiB7fX07XG4gICAgXG4gICAgLy8gQlJPV1NFUklGWSBNT0Q6IG1ha2UgZXZlIGEgdG9wLWxldmVsLXNjb3BlIHZhcmlhYmxlIGluc3RlYWQgb2YgZnVuY3Rpb24tc2NvcGUuXG4gICAgZXZlID0gZnVuY3Rpb24gKG5hbWUsIHNjb3BlKSB7XG4gICAgICAgICAgICB2YXIgZSA9IGV2ZW50cyxcbiAgICAgICAgICAgICAgICBvbGRzdG9wID0gc3RvcCxcbiAgICAgICAgICAgICAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSxcbiAgICAgICAgICAgICAgICBsaXN0ZW5lcnMgPSBldmUubGlzdGVuZXJzKG5hbWUpLFxuICAgICAgICAgICAgICAgIHogPSAwLFxuICAgICAgICAgICAgICAgIGYgPSBmYWxzZSxcbiAgICAgICAgICAgICAgICBsLFxuICAgICAgICAgICAgICAgIGluZGV4ZWQgPSBbXSxcbiAgICAgICAgICAgICAgICBxdWV1ZSA9IHt9LFxuICAgICAgICAgICAgICAgIG91dCA9IFtdLFxuICAgICAgICAgICAgICAgIGNlID0gY3VycmVudF9ldmVudCxcbiAgICAgICAgICAgICAgICBlcnJvcnMgPSBbXTtcbiAgICAgICAgICAgIGN1cnJlbnRfZXZlbnQgPSBuYW1lO1xuICAgICAgICAgICAgc3RvcCA9IDA7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBsaXN0ZW5lcnMubGVuZ3RoOyBpIDwgaWk7IGkrKykgaWYgKFwiekluZGV4XCIgaW4gbGlzdGVuZXJzW2ldKSB7XG4gICAgICAgICAgICAgICAgaW5kZXhlZC5wdXNoKGxpc3RlbmVyc1tpXS56SW5kZXgpO1xuICAgICAgICAgICAgICAgIGlmIChsaXN0ZW5lcnNbaV0uekluZGV4IDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBxdWV1ZVtsaXN0ZW5lcnNbaV0uekluZGV4XSA9IGxpc3RlbmVyc1tpXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpbmRleGVkLnNvcnQobnVtc29ydCk7XG4gICAgICAgICAgICB3aGlsZSAoaW5kZXhlZFt6XSA8IDApIHtcbiAgICAgICAgICAgICAgICBsID0gcXVldWVbaW5kZXhlZFt6KytdXTtcbiAgICAgICAgICAgICAgICBvdXQucHVzaChsLmFwcGx5KHNjb3BlLCBhcmdzKSk7XG4gICAgICAgICAgICAgICAgaWYgKHN0b3ApIHtcbiAgICAgICAgICAgICAgICAgICAgc3RvcCA9IG9sZHN0b3A7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yIChpID0gMDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBsID0gbGlzdGVuZXJzW2ldO1xuICAgICAgICAgICAgICAgIGlmIChcInpJbmRleFwiIGluIGwpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGwuekluZGV4ID09IGluZGV4ZWRbel0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKGwuYXBwbHkoc2NvcGUsIGFyZ3MpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdG9wKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBkbyB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeisrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGwgPSBxdWV1ZVtpbmRleGVkW3pdXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsICYmIG91dC5wdXNoKGwuYXBwbHkoc2NvcGUsIGFyZ3MpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RvcCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IHdoaWxlIChsKVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcXVldWVbbC56SW5kZXhdID0gbDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG91dC5wdXNoKGwuYXBwbHkoc2NvcGUsIGFyZ3MpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHN0b3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3RvcCA9IG9sZHN0b3A7XG4gICAgICAgICAgICBjdXJyZW50X2V2ZW50ID0gY2U7XG4gICAgICAgICAgICByZXR1cm4gb3V0Lmxlbmd0aCA/IG91dCA6IG51bGw7XG4gICAgICAgIH07XG4gICAgXG4gICAgZXZlLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHZhciBuYW1lcyA9IG5hbWUuc3BsaXQoc2VwYXJhdG9yKSxcbiAgICAgICAgICAgIGUgPSBldmVudHMsXG4gICAgICAgICAgICBpdGVtLFxuICAgICAgICAgICAgaXRlbXMsXG4gICAgICAgICAgICBrLFxuICAgICAgICAgICAgaSxcbiAgICAgICAgICAgIGlpLFxuICAgICAgICAgICAgaixcbiAgICAgICAgICAgIGpqLFxuICAgICAgICAgICAgbmVzLFxuICAgICAgICAgICAgZXMgPSBbZV0sXG4gICAgICAgICAgICBvdXQgPSBbXTtcbiAgICAgICAgZm9yIChpID0gMCwgaWkgPSBuYW1lcy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICBuZXMgPSBbXTtcbiAgICAgICAgICAgIGZvciAoaiA9IDAsIGpqID0gZXMubGVuZ3RoOyBqIDwgamo7IGorKykge1xuICAgICAgICAgICAgICAgIGUgPSBlc1tqXS5uO1xuICAgICAgICAgICAgICAgIGl0ZW1zID0gW2VbbmFtZXNbaV1dLCBlW3dpbGRjYXJkXV07XG4gICAgICAgICAgICAgICAgayA9IDI7XG4gICAgICAgICAgICAgICAgd2hpbGUgKGstLSkge1xuICAgICAgICAgICAgICAgICAgICBpdGVtID0gaXRlbXNba107XG4gICAgICAgICAgICAgICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXMucHVzaChpdGVtKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dCA9IG91dC5jb25jYXQoaXRlbS5mIHx8IFtdKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVzID0gbmVzO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfTtcbiAgICBcbiAgICBcbiAgICBldmUub24gPSBmdW5jdGlvbiAobmFtZSwgZikge1xuICAgICAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KHNlcGFyYXRvciksXG4gICAgICAgICAgICBlID0gZXZlbnRzO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBuYW1lcy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICBlID0gZS5uO1xuICAgICAgICAgICAgIWVbbmFtZXNbaV1dICYmIChlW25hbWVzW2ldXSA9IHtuOiB7fX0pO1xuICAgICAgICAgICAgZSA9IGVbbmFtZXNbaV1dO1xuICAgICAgICB9XG4gICAgICAgIGUuZiA9IGUuZiB8fCBbXTtcbiAgICAgICAgZm9yIChpID0gMCwgaWkgPSBlLmYubGVuZ3RoOyBpIDwgaWk7IGkrKykgaWYgKGUuZltpXSA9PSBmKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuO1xuICAgICAgICB9XG4gICAgICAgIGUuZi5wdXNoKGYpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHpJbmRleCkge1xuICAgICAgICAgICAgaWYgKCt6SW5kZXggPT0gK3pJbmRleCkge1xuICAgICAgICAgICAgICAgIGYuekluZGV4ID0gK3pJbmRleDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9O1xuICAgIFxuICAgIGV2ZS5zdG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBzdG9wID0gMTtcbiAgICB9O1xuICAgIFxuICAgIGV2ZS5udCA9IGZ1bmN0aW9uIChzdWJuYW1lKSB7XG4gICAgICAgIGlmIChzdWJuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFJlZ0V4cChcIig/OlxcXFwufFxcXFwvfF4pXCIgKyBzdWJuYW1lICsgXCIoPzpcXFxcLnxcXFxcL3wkKVwiKS50ZXN0KGN1cnJlbnRfZXZlbnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJyZW50X2V2ZW50O1xuICAgIH07XG4gICAgXG4gICAgXG4gICAgZXZlLm9mZiA9IGV2ZS51bmJpbmQgPSBmdW5jdGlvbiAobmFtZSwgZikge1xuICAgICAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KHNlcGFyYXRvciksXG4gICAgICAgICAgICBlLFxuICAgICAgICAgICAga2V5LFxuICAgICAgICAgICAgc3BsaWNlLFxuICAgICAgICAgICAgaSwgaWksIGosIGpqLFxuICAgICAgICAgICAgY3VyID0gW2V2ZW50c107XG4gICAgICAgIGZvciAoaSA9IDAsIGlpID0gbmFtZXMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IGN1ci5sZW5ndGg7IGogKz0gc3BsaWNlLmxlbmd0aCAtIDIpIHtcbiAgICAgICAgICAgICAgICBzcGxpY2UgPSBbaiwgMV07XG4gICAgICAgICAgICAgICAgZSA9IGN1cltqXS5uO1xuICAgICAgICAgICAgICAgIGlmIChuYW1lc1tpXSAhPSB3aWxkY2FyZCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZVtuYW1lc1tpXV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNwbGljZS5wdXNoKGVbbmFtZXNbaV1dKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoa2V5IGluIGUpIGlmIChlW2hhc10oa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3BsaWNlLnB1c2goZVtrZXldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjdXIuc3BsaWNlLmFwcGx5KGN1ciwgc3BsaWNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwLCBpaSA9IGN1ci5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICBlID0gY3VyW2ldO1xuICAgICAgICAgICAgd2hpbGUgKGUubikge1xuICAgICAgICAgICAgICAgIGlmIChmKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlLmYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaiA9IDAsIGpqID0gZS5mLmxlbmd0aDsgaiA8IGpqOyBqKyspIGlmIChlLmZbal0gPT0gZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGUuZi5zcGxpY2UoaiwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAhZS5mLmxlbmd0aCAmJiBkZWxldGUgZS5mO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZvciAoa2V5IGluIGUubikgaWYgKGUubltoYXNdKGtleSkgJiYgZS5uW2tleV0uZikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGZ1bmNzID0gZS5uW2tleV0uZjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaiA9IDAsIGpqID0gZnVuY3MubGVuZ3RoOyBqIDwgamo7IGorKykgaWYgKGZ1bmNzW2pdID09IGYpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jcy5zcGxpY2UoaiwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAhZnVuY3MubGVuZ3RoICYmIGRlbGV0ZSBlLm5ba2V5XS5mO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGUuZjtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChrZXkgaW4gZS5uKSBpZiAoZS5uW2hhc10oa2V5KSAmJiBlLm5ba2V5XS5mKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgZS5uW2tleV0uZjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlID0gZS5uO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICBldmUub25jZSA9IGZ1bmN0aW9uIChuYW1lLCBmKSB7XG4gICAgICAgIHZhciBmMiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciByZXMgPSBmLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgICAgICBldmUudW5iaW5kKG5hbWUsIGYyKTtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBldmUub24obmFtZSwgZjIpO1xuICAgIH07XG4gICAgXG4gICAgZXZlLnZlcnNpb24gPSB2ZXJzaW9uO1xuICAgIGV2ZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFwiWW91IGFyZSBydW5uaW5nIEV2ZSBcIiArIHZlcnNpb247XG4gICAgfTtcbiAgICAvLyBCUk9XU0VSSUZZIE1PRDogZG8gbm90IHNldCBtb2R1bGUuZXhwb3J0cyA9IGV2ZVxufSkodGhpcyk7XG5cblxuLy8g4pSM4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSQIFxcXFxcbi8vIOKUgiBcIlJhcGhhw6tsIDIuMS4wXCIgLSBKYXZhU2NyaXB0IFZlY3RvciBMaWJyYXJ5ICAgICAgICAgICAgICAgICAgICAgICAgIOKUgiBcXFxcXG4vLyDilJzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilKQgXFxcXFxuLy8g4pSCIENvcHlyaWdodCAoYykgMjAwOC0yMDExIERtaXRyeSBCYXJhbm92c2tpeSAoaHR0cDovL3JhcGhhZWxqcy5jb20pICAg4pSCIFxcXFxcbi8vIOKUgiBDb3B5cmlnaHQgKGMpIDIwMDgtMjAxMSBTZW5jaGEgTGFicyAoaHR0cDovL3NlbmNoYS5jb20pICAgICAgICAgICAgIOKUgiBcXFxcXG4vLyDilIIgTGljZW5zZWQgdW5kZXIgdGhlIE1JVCAoaHR0cDovL3JhcGhhZWxqcy5jb20vbGljZW5zZS5odG1sKSBsaWNlbnNlLiDilIIgXFxcXFxuLy8g4pSU4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSYIFxcXFxcbihmdW5jdGlvbiAoKSB7XG4gICAgXG4gICAgZnVuY3Rpb24gUihmaXJzdCkge1xuICAgICAgICBpZiAoUi5pcyhmaXJzdCwgXCJmdW5jdGlvblwiKSkge1xuICAgICAgICAgICAgcmV0dXJuIGxvYWRlZCA/IGZpcnN0KCkgOiBldmUub24oXCJyYXBoYWVsLkRPTWxvYWRcIiwgZmlyc3QpO1xuICAgICAgICB9IGVsc2UgaWYgKFIuaXMoZmlyc3QsIGFycmF5KSkge1xuICAgICAgICAgICAgcmV0dXJuIFIuX2VuZ2luZS5jcmVhdGVbYXBwbHldKFIsIGZpcnN0LnNwbGljZSgwLCAzICsgUi5pcyhmaXJzdFswXSwgbnUpKSkuYWRkKGZpcnN0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgICAgICAgICAgIGlmIChSLmlzKGFyZ3NbYXJncy5sZW5ndGggLSAxXSwgXCJmdW5jdGlvblwiKSkge1xuICAgICAgICAgICAgICAgIHZhciBmID0gYXJncy5wb3AoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbG9hZGVkID8gZi5jYWxsKFIuX2VuZ2luZS5jcmVhdGVbYXBwbHldKFIsIGFyZ3MpKSA6IGV2ZS5vbihcInJhcGhhZWwuRE9NbG9hZFwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGYuY2FsbChSLl9lbmdpbmUuY3JlYXRlW2FwcGx5XShSLCBhcmdzKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBSLl9lbmdpbmUuY3JlYXRlW2FwcGx5XShSLCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIFIudmVyc2lvbiA9IFwiMi4xLjBcIjtcbiAgICBSLmV2ZSA9IGV2ZTtcbiAgICB2YXIgbG9hZGVkLFxuICAgICAgICBzZXBhcmF0b3IgPSAvWywgXSsvLFxuICAgICAgICBlbGVtZW50cyA9IHtjaXJjbGU6IDEsIHJlY3Q6IDEsIHBhdGg6IDEsIGVsbGlwc2U6IDEsIHRleHQ6IDEsIGltYWdlOiAxfSxcbiAgICAgICAgZm9ybWF0cmcgPSAvXFx7KFxcZCspXFx9L2csXG4gICAgICAgIHByb3RvID0gXCJwcm90b3R5cGVcIixcbiAgICAgICAgaGFzID0gXCJoYXNPd25Qcm9wZXJ0eVwiLFxuICAgICAgICBnID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIF9nID0ge307XG4gICAgICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBfZy53aW4gPSB3aW5kb3c7XG4gICAgICAgICAgICAgICAgX2cuZG9jID0gZG9jdW1lbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICh0eXBlb2YgcmVxdWlyZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAvLyBLZWVwIGJyb3dzZXJpZnkgZnJvbSBpbmNsdWRpbmcganNkb20uXG4gICAgICAgICAgICAgICAgZXZhbChcIl9nLmRvYyA9IHJlcXVpcmUoJ2pzZG9tJykuanNkb20oKVwiKTtcbiAgICAgICAgICAgICAgICBfZy53aW4gPSBfZy5kb2MuY3JlYXRlV2luZG93KCk7XG4gICAgICAgICAgICAgICAgX2cud2luLmRvY3VtZW50ID0gX2cuZG9jO1xuICAgICAgICAgICAgICAgIF9nLmRvYy5pbXBsZW1lbnRhdGlvbi5hZGRGZWF0dXJlKFxuICAgICAgICAgICAgXCJodHRwOi8vd3d3LnczLm9yZy9UUi9TVkcxMS9mZWF0dXJlI0Jhc2ljU3RydWN0dXJlXCIsIFwiMS4xXCIpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gX2c7XG4gICAgICAgIH0pKCksXG4gICAgICAgIG9sZFJhcGhhZWwgPSB7XG4gICAgICAgICAgICB3YXM6IE9iamVjdC5wcm90b3R5cGVbaGFzXS5jYWxsKGcud2luLCBcIlJhcGhhZWxcIiksXG4gICAgICAgICAgICBpczogZy53aW4uUmFwaGFlbFxuICAgICAgICB9LFxuICAgICAgICBQYXBlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aGlzLmNhID0gdGhpcy5jdXN0b21BdHRyaWJ1dGVzID0ge307XG4gICAgICAgIH0sXG4gICAgICAgIHBhcGVycHJvdG8sXG4gICAgICAgIGFwcGVuZENoaWxkID0gXCJhcHBlbmRDaGlsZFwiLFxuICAgICAgICBhcHBseSA9IFwiYXBwbHlcIixcbiAgICAgICAgY29uY2F0ID0gXCJjb25jYXRcIixcbiAgICAgICAgc3VwcG9ydHNUb3VjaCA9IFwiY3JlYXRlVG91Y2hcIiBpbiBnLmRvYyxcbiAgICAgICAgRSA9IFwiXCIsXG4gICAgICAgIFMgPSBcIiBcIixcbiAgICAgICAgU3RyID0gU3RyaW5nLFxuICAgICAgICBzcGxpdCA9IFwic3BsaXRcIixcbiAgICAgICAgZXZlbnRzID0gXCJjbGljayBkYmxjbGljayBtb3VzZWRvd24gbW91c2Vtb3ZlIG1vdXNlb3V0IG1vdXNlb3ZlciBtb3VzZXVwIHRvdWNoc3RhcnQgdG91Y2htb3ZlIHRvdWNoZW5kIHRvdWNoY2FuY2VsXCJbc3BsaXRdKFMpLFxuICAgICAgICB0b3VjaE1hcCA9IHtcbiAgICAgICAgICAgIG1vdXNlZG93bjogXCJ0b3VjaHN0YXJ0XCIsXG4gICAgICAgICAgICBtb3VzZW1vdmU6IFwidG91Y2htb3ZlXCIsXG4gICAgICAgICAgICBtb3VzZXVwOiBcInRvdWNoZW5kXCJcbiAgICAgICAgfSxcbiAgICAgICAgbG93ZXJDYXNlID0gU3RyLnByb3RvdHlwZS50b0xvd2VyQ2FzZSxcbiAgICAgICAgbWF0aCA9IE1hdGgsXG4gICAgICAgIG1tYXggPSBtYXRoLm1heCxcbiAgICAgICAgbW1pbiA9IG1hdGgubWluLFxuICAgICAgICBhYnMgPSBtYXRoLmFicyxcbiAgICAgICAgcG93ID0gbWF0aC5wb3csXG4gICAgICAgIFBJID0gbWF0aC5QSSxcbiAgICAgICAgbnUgPSBcIm51bWJlclwiLFxuICAgICAgICBzdHJpbmcgPSBcInN0cmluZ1wiLFxuICAgICAgICBhcnJheSA9IFwiYXJyYXlcIixcbiAgICAgICAgdG9TdHJpbmcgPSBcInRvU3RyaW5nXCIsXG4gICAgICAgIGZpbGxTdHJpbmcgPSBcImZpbGxcIixcbiAgICAgICAgb2JqZWN0VG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLFxuICAgICAgICBwYXBlciA9IHt9LFxuICAgICAgICBwdXNoID0gXCJwdXNoXCIsXG4gICAgICAgIElTVVJMID0gUi5fSVNVUkwgPSAvXnVybFxcKFsnXCJdPyhbXlxcKV0rPylbJ1wiXT9cXCkkL2ksXG4gICAgICAgIGNvbG91clJlZ0V4cCA9IC9eXFxzKigoI1thLWZcXGRdezZ9KXwoI1thLWZcXGRdezN9KXxyZ2JhP1xcKFxccyooW1xcZFxcLl0rJT9cXHMqLFxccypbXFxkXFwuXSslP1xccyosXFxzKltcXGRcXC5dKyU/KD86XFxzKixcXHMqW1xcZFxcLl0rJT8pPylcXHMqXFwpfGhzYmE/XFwoXFxzKihbXFxkXFwuXSsoPzpkZWd8XFx4YjB8JSk/XFxzKixcXHMqW1xcZFxcLl0rJT9cXHMqLFxccypbXFxkXFwuXSsoPzolP1xccyosXFxzKltcXGRcXC5dKyk/KSU/XFxzKlxcKXxoc2xhP1xcKFxccyooW1xcZFxcLl0rKD86ZGVnfFxceGIwfCUpP1xccyosXFxzKltcXGRcXC5dKyU/XFxzKixcXHMqW1xcZFxcLl0rKD86JT9cXHMqLFxccypbXFxkXFwuXSspPyklP1xccypcXCkpXFxzKiQvaSxcbiAgICAgICAgaXNuYW4gPSB7XCJOYU5cIjogMSwgXCJJbmZpbml0eVwiOiAxLCBcIi1JbmZpbml0eVwiOiAxfSxcbiAgICAgICAgYmV6aWVycmcgPSAvXig/OmN1YmljLSk/YmV6aWVyXFwoKFteLF0rKSwoW14sXSspLChbXixdKyksKFteXFwpXSspXFwpLyxcbiAgICAgICAgcm91bmQgPSBtYXRoLnJvdW5kLFxuICAgICAgICBzZXRBdHRyaWJ1dGUgPSBcInNldEF0dHJpYnV0ZVwiLFxuICAgICAgICB0b0Zsb2F0ID0gcGFyc2VGbG9hdCxcbiAgICAgICAgdG9JbnQgPSBwYXJzZUludCxcbiAgICAgICAgdXBwZXJDYXNlID0gU3RyLnByb3RvdHlwZS50b1VwcGVyQ2FzZSxcbiAgICAgICAgYXZhaWxhYmxlQXR0cnMgPSBSLl9hdmFpbGFibGVBdHRycyA9IHtcbiAgICAgICAgICAgIFwiYXJyb3ctZW5kXCI6IFwibm9uZVwiLFxuICAgICAgICAgICAgXCJhcnJvdy1zdGFydFwiOiBcIm5vbmVcIixcbiAgICAgICAgICAgIGJsdXI6IDAsXG4gICAgICAgICAgICBcImNsaXAtcmVjdFwiOiBcIjAgMCAxZTkgMWU5XCIsXG4gICAgICAgICAgICBjdXJzb3I6IFwiZGVmYXVsdFwiLFxuICAgICAgICAgICAgY3g6IDAsXG4gICAgICAgICAgICBjeTogMCxcbiAgICAgICAgICAgIGZpbGw6IFwiI2ZmZlwiLFxuICAgICAgICAgICAgXCJmaWxsLW9wYWNpdHlcIjogMSxcbiAgICAgICAgICAgIGZvbnQ6ICcxMHB4IFwiQXJpYWxcIicsXG4gICAgICAgICAgICBcImZvbnQtZmFtaWx5XCI6ICdcIkFyaWFsXCInLFxuICAgICAgICAgICAgXCJmb250LXNpemVcIjogXCIxMFwiLFxuICAgICAgICAgICAgXCJmb250LXN0eWxlXCI6IFwibm9ybWFsXCIsXG4gICAgICAgICAgICBcImZvbnQtd2VpZ2h0XCI6IDQwMCxcbiAgICAgICAgICAgIGdyYWRpZW50OiAwLFxuICAgICAgICAgICAgaGVpZ2h0OiAwLFxuICAgICAgICAgICAgaHJlZjogXCJodHRwOi8vcmFwaGFlbGpzLmNvbS9cIixcbiAgICAgICAgICAgIFwibGV0dGVyLXNwYWNpbmdcIjogMCxcbiAgICAgICAgICAgIG9wYWNpdHk6IDEsXG4gICAgICAgICAgICBwYXRoOiBcIk0wLDBcIixcbiAgICAgICAgICAgIHI6IDAsXG4gICAgICAgICAgICByeDogMCxcbiAgICAgICAgICAgIHJ5OiAwLFxuICAgICAgICAgICAgc3JjOiBcIlwiLFxuICAgICAgICAgICAgc3Ryb2tlOiBcIiMwMDBcIixcbiAgICAgICAgICAgIFwic3Ryb2tlLWRhc2hhcnJheVwiOiBcIlwiLFxuICAgICAgICAgICAgXCJzdHJva2UtbGluZWNhcFwiOiBcImJ1dHRcIixcbiAgICAgICAgICAgIFwic3Ryb2tlLWxpbmVqb2luXCI6IFwiYnV0dFwiLFxuICAgICAgICAgICAgXCJzdHJva2UtbWl0ZXJsaW1pdFwiOiAwLFxuICAgICAgICAgICAgXCJzdHJva2Utb3BhY2l0eVwiOiAxLFxuICAgICAgICAgICAgXCJzdHJva2Utd2lkdGhcIjogMSxcbiAgICAgICAgICAgIHRhcmdldDogXCJfYmxhbmtcIixcbiAgICAgICAgICAgIFwidGV4dC1hbmNob3JcIjogXCJtaWRkbGVcIixcbiAgICAgICAgICAgIHRpdGxlOiBcIlJhcGhhZWxcIixcbiAgICAgICAgICAgIHRyYW5zZm9ybTogXCJcIixcbiAgICAgICAgICAgIHdpZHRoOiAwLFxuICAgICAgICAgICAgeDogMCxcbiAgICAgICAgICAgIHk6IDBcbiAgICAgICAgfSxcbiAgICAgICAgYXZhaWxhYmxlQW5pbUF0dHJzID0gUi5fYXZhaWxhYmxlQW5pbUF0dHJzID0ge1xuICAgICAgICAgICAgYmx1cjogbnUsXG4gICAgICAgICAgICBcImNsaXAtcmVjdFwiOiBcImNzdlwiLFxuICAgICAgICAgICAgY3g6IG51LFxuICAgICAgICAgICAgY3k6IG51LFxuICAgICAgICAgICAgZmlsbDogXCJjb2xvdXJcIixcbiAgICAgICAgICAgIFwiZmlsbC1vcGFjaXR5XCI6IG51LFxuICAgICAgICAgICAgXCJmb250LXNpemVcIjogbnUsXG4gICAgICAgICAgICBoZWlnaHQ6IG51LFxuICAgICAgICAgICAgb3BhY2l0eTogbnUsXG4gICAgICAgICAgICBwYXRoOiBcInBhdGhcIixcbiAgICAgICAgICAgIHI6IG51LFxuICAgICAgICAgICAgcng6IG51LFxuICAgICAgICAgICAgcnk6IG51LFxuICAgICAgICAgICAgc3Ryb2tlOiBcImNvbG91clwiLFxuICAgICAgICAgICAgXCJzdHJva2Utb3BhY2l0eVwiOiBudSxcbiAgICAgICAgICAgIFwic3Ryb2tlLXdpZHRoXCI6IG51LFxuICAgICAgICAgICAgdHJhbnNmb3JtOiBcInRyYW5zZm9ybVwiLFxuICAgICAgICAgICAgd2lkdGg6IG51LFxuICAgICAgICAgICAgeDogbnUsXG4gICAgICAgICAgICB5OiBudVxuICAgICAgICB9LFxuICAgICAgICB3aGl0ZXNwYWNlID0gL1tcXHgwOVxceDBhXFx4MGJcXHgwY1xceDBkXFx4MjBcXHhhMFxcdTE2ODBcXHUxODBlXFx1MjAwMFxcdTIwMDFcXHUyMDAyXFx1MjAwM1xcdTIwMDRcXHUyMDA1XFx1MjAwNlxcdTIwMDdcXHUyMDA4XFx1MjAwOVxcdTIwMGFcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHUyMDI4XFx1MjAyOV0vZyxcbiAgICAgICAgY29tbWFTcGFjZXMgPSAvW1xceDA5XFx4MGFcXHgwYlxceDBjXFx4MGRcXHgyMFxceGEwXFx1MTY4MFxcdTE4MGVcXHUyMDAwXFx1MjAwMVxcdTIwMDJcXHUyMDAzXFx1MjAwNFxcdTIwMDVcXHUyMDA2XFx1MjAwN1xcdTIwMDhcXHUyMDA5XFx1MjAwYVxcdTIwMmZcXHUyMDVmXFx1MzAwMFxcdTIwMjhcXHUyMDI5XSosW1xceDA5XFx4MGFcXHgwYlxceDBjXFx4MGRcXHgyMFxceGEwXFx1MTY4MFxcdTE4MGVcXHUyMDAwXFx1MjAwMVxcdTIwMDJcXHUyMDAzXFx1MjAwNFxcdTIwMDVcXHUyMDA2XFx1MjAwN1xcdTIwMDhcXHUyMDA5XFx1MjAwYVxcdTIwMmZcXHUyMDVmXFx1MzAwMFxcdTIwMjhcXHUyMDI5XSovLFxuICAgICAgICBoc3JnID0ge2hzOiAxLCByZzogMX0sXG4gICAgICAgIHAycyA9IC8sPyhbYWNobG1xcnN0dnh6XSksPy9naSxcbiAgICAgICAgcGF0aENvbW1hbmQgPSAvKFthY2hsbXJxc3R2el0pW1xceDA5XFx4MGFcXHgwYlxceDBjXFx4MGRcXHgyMFxceGEwXFx1MTY4MFxcdTE4MGVcXHUyMDAwXFx1MjAwMVxcdTIwMDJcXHUyMDAzXFx1MjAwNFxcdTIwMDVcXHUyMDA2XFx1MjAwN1xcdTIwMDhcXHUyMDA5XFx1MjAwYVxcdTIwMmZcXHUyMDVmXFx1MzAwMFxcdTIwMjhcXHUyMDI5LF0qKCgtP1xcZCpcXC4/XFxkKig/OmVbXFwtK10/XFxkKyk/W1xceDA5XFx4MGFcXHgwYlxceDBjXFx4MGRcXHgyMFxceGEwXFx1MTY4MFxcdTE4MGVcXHUyMDAwXFx1MjAwMVxcdTIwMDJcXHUyMDAzXFx1MjAwNFxcdTIwMDVcXHUyMDA2XFx1MjAwN1xcdTIwMDhcXHUyMDA5XFx1MjAwYVxcdTIwMmZcXHUyMDVmXFx1MzAwMFxcdTIwMjhcXHUyMDI5XSosP1tcXHgwOVxceDBhXFx4MGJcXHgwY1xceDBkXFx4MjBcXHhhMFxcdTE2ODBcXHUxODBlXFx1MjAwMFxcdTIwMDFcXHUyMDAyXFx1MjAwM1xcdTIwMDRcXHUyMDA1XFx1MjAwNlxcdTIwMDdcXHUyMDA4XFx1MjAwOVxcdTIwMGFcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHUyMDI4XFx1MjAyOV0qKSspL2lnLFxuICAgICAgICB0Q29tbWFuZCA9IC8oW3JzdG1dKVtcXHgwOVxceDBhXFx4MGJcXHgwY1xceDBkXFx4MjBcXHhhMFxcdTE2ODBcXHUxODBlXFx1MjAwMFxcdTIwMDFcXHUyMDAyXFx1MjAwM1xcdTIwMDRcXHUyMDA1XFx1MjAwNlxcdTIwMDdcXHUyMDA4XFx1MjAwOVxcdTIwMGFcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHUyMDI4XFx1MjAyOSxdKigoLT9cXGQqXFwuP1xcZCooPzplW1xcLStdP1xcZCspP1tcXHgwOVxceDBhXFx4MGJcXHgwY1xceDBkXFx4MjBcXHhhMFxcdTE2ODBcXHUxODBlXFx1MjAwMFxcdTIwMDFcXHUyMDAyXFx1MjAwM1xcdTIwMDRcXHUyMDA1XFx1MjAwNlxcdTIwMDdcXHUyMDA4XFx1MjAwOVxcdTIwMGFcXHUyMDJmXFx1MjA1ZlxcdTMwMDBcXHUyMDI4XFx1MjAyOV0qLD9bXFx4MDlcXHgwYVxceDBiXFx4MGNcXHgwZFxceDIwXFx4YTBcXHUxNjgwXFx1MTgwZVxcdTIwMDBcXHUyMDAxXFx1MjAwMlxcdTIwMDNcXHUyMDA0XFx1MjAwNVxcdTIwMDZcXHUyMDA3XFx1MjAwOFxcdTIwMDlcXHUyMDBhXFx1MjAyZlxcdTIwNWZcXHUzMDAwXFx1MjAyOFxcdTIwMjldKikrKS9pZyxcbiAgICAgICAgcGF0aFZhbHVlcyA9IC8oLT9cXGQqXFwuP1xcZCooPzplW1xcLStdP1xcZCspPylbXFx4MDlcXHgwYVxceDBiXFx4MGNcXHgwZFxceDIwXFx4YTBcXHUxNjgwXFx1MTgwZVxcdTIwMDBcXHUyMDAxXFx1MjAwMlxcdTIwMDNcXHUyMDA0XFx1MjAwNVxcdTIwMDZcXHUyMDA3XFx1MjAwOFxcdTIwMDlcXHUyMDBhXFx1MjAyZlxcdTIwNWZcXHUzMDAwXFx1MjAyOFxcdTIwMjldKiw/W1xceDA5XFx4MGFcXHgwYlxceDBjXFx4MGRcXHgyMFxceGEwXFx1MTY4MFxcdTE4MGVcXHUyMDAwXFx1MjAwMVxcdTIwMDJcXHUyMDAzXFx1MjAwNFxcdTIwMDVcXHUyMDA2XFx1MjAwN1xcdTIwMDhcXHUyMDA5XFx1MjAwYVxcdTIwMmZcXHUyMDVmXFx1MzAwMFxcdTIwMjhcXHUyMDI5XSovaWcsXG4gICAgICAgIHJhZGlhbF9ncmFkaWVudCA9IFIuX3JhZGlhbF9ncmFkaWVudCA9IC9ecig/OlxcKChbXixdKz8pW1xceDA5XFx4MGFcXHgwYlxceDBjXFx4MGRcXHgyMFxceGEwXFx1MTY4MFxcdTE4MGVcXHUyMDAwXFx1MjAwMVxcdTIwMDJcXHUyMDAzXFx1MjAwNFxcdTIwMDVcXHUyMDA2XFx1MjAwN1xcdTIwMDhcXHUyMDA5XFx1MjAwYVxcdTIwMmZcXHUyMDVmXFx1MzAwMFxcdTIwMjhcXHUyMDI5XSosW1xceDA5XFx4MGFcXHgwYlxceDBjXFx4MGRcXHgyMFxceGEwXFx1MTY4MFxcdTE4MGVcXHUyMDAwXFx1MjAwMVxcdTIwMDJcXHUyMDAzXFx1MjAwNFxcdTIwMDVcXHUyMDA2XFx1MjAwN1xcdTIwMDhcXHUyMDA5XFx1MjAwYVxcdTIwMmZcXHUyMDVmXFx1MzAwMFxcdTIwMjhcXHUyMDI5XSooW15cXCldKz8pXFwpKT8vLFxuICAgICAgICBlbGRhdGEgPSB7fSxcbiAgICAgICAgc29ydEJ5S2V5ID0gZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgIHJldHVybiBhLmtleSAtIGIua2V5O1xuICAgICAgICB9LFxuICAgICAgICBzb3J0QnlOdW1iZXIgPSBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgcmV0dXJuIHRvRmxvYXQoYSkgLSB0b0Zsb2F0KGIpO1xuICAgICAgICB9LFxuICAgICAgICBmdW4gPSBmdW5jdGlvbiAoKSB7fSxcbiAgICAgICAgcGlwZSA9IGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgfSxcbiAgICAgICAgcmVjdFBhdGggPSBSLl9yZWN0UGF0aCA9IGZ1bmN0aW9uICh4LCB5LCB3LCBoLCByKSB7XG4gICAgICAgICAgICBpZiAocikge1xuICAgICAgICAgICAgICAgIHJldHVybiBbW1wiTVwiLCB4ICsgciwgeV0sIFtcImxcIiwgdyAtIHIgKiAyLCAwXSwgW1wiYVwiLCByLCByLCAwLCAwLCAxLCByLCByXSwgW1wibFwiLCAwLCBoIC0gciAqIDJdLCBbXCJhXCIsIHIsIHIsIDAsIDAsIDEsIC1yLCByXSwgW1wibFwiLCByICogMiAtIHcsIDBdLCBbXCJhXCIsIHIsIHIsIDAsIDAsIDEsIC1yLCAtcl0sIFtcImxcIiwgMCwgciAqIDIgLSBoXSwgW1wiYVwiLCByLCByLCAwLCAwLCAxLCByLCAtcl0sIFtcInpcIl1dO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFtbXCJNXCIsIHgsIHldLCBbXCJsXCIsIHcsIDBdLCBbXCJsXCIsIDAsIGhdLCBbXCJsXCIsIC13LCAwXSwgW1wielwiXV07XG4gICAgICAgIH0sXG4gICAgICAgIGVsbGlwc2VQYXRoID0gZnVuY3Rpb24gKHgsIHksIHJ4LCByeSkge1xuICAgICAgICAgICAgaWYgKHJ5ID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICByeSA9IHJ4O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIFtbXCJNXCIsIHgsIHldLCBbXCJtXCIsIDAsIC1yeV0sIFtcImFcIiwgcngsIHJ5LCAwLCAxLCAxLCAwLCAyICogcnldLCBbXCJhXCIsIHJ4LCByeSwgMCwgMSwgMSwgMCwgLTIgKiByeV0sIFtcInpcIl1dO1xuICAgICAgICB9LFxuICAgICAgICBnZXRQYXRoID0gUi5fZ2V0UGF0aCA9IHtcbiAgICAgICAgICAgIHBhdGg6IGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBlbC5hdHRyKFwicGF0aFwiKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjaXJjbGU6IGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgICAgIHZhciBhID0gZWwuYXR0cnM7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsbGlwc2VQYXRoKGEuY3gsIGEuY3ksIGEucik7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZWxsaXBzZTogZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgICAgICAgICAgdmFyIGEgPSBlbC5hdHRycztcbiAgICAgICAgICAgICAgICByZXR1cm4gZWxsaXBzZVBhdGgoYS5jeCwgYS5jeSwgYS5yeCwgYS5yeSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVjdDogZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgICAgICAgICAgdmFyIGEgPSBlbC5hdHRycztcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVjdFBhdGgoYS54LCBhLnksIGEud2lkdGgsIGEuaGVpZ2h0LCBhLnIpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGltYWdlOiBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgICAgICB2YXIgYSA9IGVsLmF0dHJzO1xuICAgICAgICAgICAgICAgIHJldHVybiByZWN0UGF0aChhLngsIGEueSwgYS53aWR0aCwgYS5oZWlnaHQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRleHQ6IGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgICAgIHZhciBiYm94ID0gZWwuX2dldEJCb3goKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVjdFBhdGgoYmJveC54LCBiYm94LnksIGJib3gud2lkdGgsIGJib3guaGVpZ2h0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgXG4gICAgICAgIG1hcFBhdGggPSBSLm1hcFBhdGggPSBmdW5jdGlvbiAocGF0aCwgbWF0cml4KSB7XG4gICAgICAgICAgICBpZiAoIW1hdHJpeCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHgsIHksIGksIGosIGlpLCBqaiwgcGF0aGk7XG4gICAgICAgICAgICBwYXRoID0gcGF0aDJjdXJ2ZShwYXRoKTtcbiAgICAgICAgICAgIGZvciAoaSA9IDAsIGlpID0gcGF0aC5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgcGF0aGkgPSBwYXRoW2ldO1xuICAgICAgICAgICAgICAgIGZvciAoaiA9IDEsIGpqID0gcGF0aGkubGVuZ3RoOyBqIDwgamo7IGogKz0gMikge1xuICAgICAgICAgICAgICAgICAgICB4ID0gbWF0cml4LngocGF0aGlbal0sIHBhdGhpW2ogKyAxXSk7XG4gICAgICAgICAgICAgICAgICAgIHkgPSBtYXRyaXgueShwYXRoaVtqXSwgcGF0aGlbaiArIDFdKTtcbiAgICAgICAgICAgICAgICAgICAgcGF0aGlbal0gPSB4O1xuICAgICAgICAgICAgICAgICAgICBwYXRoaVtqICsgMV0gPSB5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBwYXRoO1xuICAgICAgICB9O1xuXG4gICAgUi5fZyA9IGc7XG4gICAgXG4gICAgXG4gICAgUi50eXBlID0gKGcud2luLlNWR0FuZ2xlIHx8IGcuZG9jLmltcGxlbWVudGF0aW9uLmhhc0ZlYXR1cmUoXCJodHRwOi8vd3d3LnczLm9yZy9UUi9TVkcxMS9mZWF0dXJlI0Jhc2ljU3RydWN0dXJlXCIsIFwiMS4xXCIpID8gXCJTVkdcIiA6IFwiVk1MXCIpO1xuICAgIGlmIChSLnR5cGUgPT0gXCJWTUxcIikge1xuICAgICAgICB2YXIgZCA9IGcuZG9jLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksXG4gICAgICAgICAgICBiO1xuICAgICAgICBkLmlubmVySFRNTCA9ICc8djpzaGFwZSBhZGo9XCIxXCIvPic7XG4gICAgICAgIGIgPSBkLmZpcnN0Q2hpbGQ7XG4gICAgICAgIGIuc3R5bGUuYmVoYXZpb3IgPSBcInVybCgjZGVmYXVsdCNWTUwpXCI7XG4gICAgICAgIGlmICghKGIgJiYgdHlwZW9mIGIuYWRqID09IFwib2JqZWN0XCIpKSB7XG4gICAgICAgICAgICByZXR1cm4gKFIudHlwZSA9IEUpO1xuICAgICAgICB9XG4gICAgICAgIGQgPSBudWxsO1xuICAgIH1cblxuICAgIFxuICAgIFIuc3ZnID0gIShSLnZtbCA9IFIudHlwZSA9PSBcIlZNTFwiKTtcbiAgICBSLl9QYXBlciA9IFBhcGVyO1xuICAgIFxuICAgIFIuZm4gPSBwYXBlcnByb3RvID0gUGFwZXIucHJvdG90eXBlID0gUi5wcm90b3R5cGU7XG4gICAgUi5faWQgPSAwO1xuICAgIFIuX29pZCA9IDA7XG4gICAgXG4gICAgUi5pcyA9IGZ1bmN0aW9uIChvLCB0eXBlKSB7XG4gICAgICAgIHR5cGUgPSBsb3dlckNhc2UuY2FsbCh0eXBlKTtcbiAgICAgICAgaWYgKHR5cGUgPT0gXCJmaW5pdGVcIikge1xuICAgICAgICAgICAgcmV0dXJuICFpc25hbltoYXNdKCtvKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZSA9PSBcImFycmF5XCIpIHtcbiAgICAgICAgICAgIHJldHVybiBvIGluc3RhbmNlb2YgQXJyYXk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICAodHlwZSA9PSBcIm51bGxcIiAmJiBvID09PSBudWxsKSB8fFxuICAgICAgICAgICAgICAgICh0eXBlID09IHR5cGVvZiBvICYmIG8gIT09IG51bGwpIHx8XG4gICAgICAgICAgICAgICAgKHR5cGUgPT0gXCJvYmplY3RcIiAmJiBvID09PSBPYmplY3QobykpIHx8XG4gICAgICAgICAgICAgICAgKHR5cGUgPT0gXCJhcnJheVwiICYmIEFycmF5LmlzQXJyYXkgJiYgQXJyYXkuaXNBcnJheShvKSkgfHxcbiAgICAgICAgICAgICAgICBvYmplY3RUb1N0cmluZy5jYWxsKG8pLnNsaWNlKDgsIC0xKS50b0xvd2VyQ2FzZSgpID09IHR5cGU7XG4gICAgfTtcblxuICAgIGZ1bmN0aW9uIGNsb25lKG9iaikge1xuICAgICAgICBpZiAoT2JqZWN0KG9iaikgIT09IG9iaikge1xuICAgICAgICAgICAgcmV0dXJuIG9iajtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcmVzID0gbmV3IG9iai5jb25zdHJ1Y3RvcjtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKG9ialtoYXNdKGtleSkpIHtcbiAgICAgICAgICAgIHJlc1trZXldID0gY2xvbmUob2JqW2tleV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuXG4gICAgXG4gICAgUi5hbmdsZSA9IGZ1bmN0aW9uICh4MSwgeTEsIHgyLCB5MiwgeDMsIHkzKSB7XG4gICAgICAgIGlmICh4MyA9PSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgeCA9IHgxIC0geDIsXG4gICAgICAgICAgICAgICAgeSA9IHkxIC0geTI7XG4gICAgICAgICAgICBpZiAoIXggJiYgIXkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAoMTgwICsgbWF0aC5hdGFuMigteSwgLXgpICogMTgwIC8gUEkgKyAzNjApICUgMzYwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIFIuYW5nbGUoeDEsIHkxLCB4MywgeTMpIC0gUi5hbmdsZSh4MiwgeTIsIHgzLCB5Myk7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIFIucmFkID0gZnVuY3Rpb24gKGRlZykge1xuICAgICAgICByZXR1cm4gZGVnICUgMzYwICogUEkgLyAxODA7XG4gICAgfTtcbiAgICBcbiAgICBSLmRlZyA9IGZ1bmN0aW9uIChyYWQpIHtcbiAgICAgICAgcmV0dXJuIHJhZCAqIDE4MCAvIFBJICUgMzYwO1xuICAgIH07XG4gICAgXG4gICAgUi5zbmFwVG8gPSBmdW5jdGlvbiAodmFsdWVzLCB2YWx1ZSwgdG9sZXJhbmNlKSB7XG4gICAgICAgIHRvbGVyYW5jZSA9IFIuaXModG9sZXJhbmNlLCBcImZpbml0ZVwiKSA/IHRvbGVyYW5jZSA6IDEwO1xuICAgICAgICBpZiAoUi5pcyh2YWx1ZXMsIGFycmF5KSkge1xuICAgICAgICAgICAgdmFyIGkgPSB2YWx1ZXMubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKGktLSkgaWYgKGFicyh2YWx1ZXNbaV0gLSB2YWx1ZSkgPD0gdG9sZXJhbmNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlcyA9ICt2YWx1ZXM7XG4gICAgICAgICAgICB2YXIgcmVtID0gdmFsdWUgJSB2YWx1ZXM7XG4gICAgICAgICAgICBpZiAocmVtIDwgdG9sZXJhbmNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlIC0gcmVtO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlbSA+IHZhbHVlcyAtIHRvbGVyYW5jZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZSAtIHJlbSArIHZhbHVlcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfTtcbiAgICBcbiAgICBcbiAgICB2YXIgY3JlYXRlVVVJRCA9IFIuY3JlYXRlVVVJRCA9IChmdW5jdGlvbiAodXVpZFJlZ0V4LCB1dWlkUmVwbGFjZXIpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBcInh4eHh4eHh4LXh4eHgtNHh4eC15eHh4LXh4eHh4eHh4eHh4eFwiLnJlcGxhY2UodXVpZFJlZ0V4LCB1dWlkUmVwbGFjZXIpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgIH07XG4gICAgfSkoL1t4eV0vZywgZnVuY3Rpb24gKGMpIHtcbiAgICAgICAgdmFyIHIgPSBtYXRoLnJhbmRvbSgpICogMTYgfCAwLFxuICAgICAgICAgICAgdiA9IGMgPT0gXCJ4XCIgPyByIDogKHIgJiAzIHwgOCk7XG4gICAgICAgIHJldHVybiB2LnRvU3RyaW5nKDE2KTtcbiAgICB9KTtcblxuICAgIFxuICAgIFIuc2V0V2luZG93ID0gZnVuY3Rpb24gKG5ld3dpbikge1xuICAgICAgICBldmUoXCJyYXBoYWVsLnNldFdpbmRvd1wiLCBSLCBnLndpbiwgbmV3d2luKTtcbiAgICAgICAgZy53aW4gPSBuZXd3aW47XG4gICAgICAgIGcuZG9jID0gZy53aW4uZG9jdW1lbnQ7XG4gICAgICAgIGlmIChSLl9lbmdpbmUuaW5pdFdpbikge1xuICAgICAgICAgICAgUi5fZW5naW5lLmluaXRXaW4oZy53aW4pO1xuICAgICAgICB9XG4gICAgfTtcbiAgICB2YXIgdG9IZXggPSBmdW5jdGlvbiAoY29sb3IpIHtcbiAgICAgICAgaWYgKFIudm1sKSB7XG4gICAgICAgICAgICAvLyBodHRwOi8vZGVhbi5lZHdhcmRzLm5hbWUvd2VibG9nLzIwMDkvMTAvY29udmVydC1hbnktY29sb3VyLXZhbHVlLXRvLWhleC1pbi1tc2llL1xuICAgICAgICAgICAgdmFyIHRyaW0gPSAvXlxccyt8XFxzKyQvZztcbiAgICAgICAgICAgIHZhciBib2Q7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIHZhciBkb2N1bSA9IG5ldyBBY3RpdmVYT2JqZWN0KFwiaHRtbGZpbGVcIik7XG4gICAgICAgICAgICAgICAgZG9jdW0ud3JpdGUoXCI8Ym9keT5cIik7XG4gICAgICAgICAgICAgICAgZG9jdW0uY2xvc2UoKTtcbiAgICAgICAgICAgICAgICBib2QgPSBkb2N1bS5ib2R5O1xuICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgYm9kID0gY3JlYXRlUG9wdXAoKS5kb2N1bWVudC5ib2R5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHJhbmdlID0gYm9kLmNyZWF0ZVRleHRSYW5nZSgpO1xuICAgICAgICAgICAgdG9IZXggPSBjYWNoZXIoZnVuY3Rpb24gKGNvbG9yKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgYm9kLnN0eWxlLmNvbG9yID0gU3RyKGNvbG9yKS5yZXBsYWNlKHRyaW0sIEUpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSByYW5nZS5xdWVyeUNvbW1hbmRWYWx1ZShcIkZvcmVDb2xvclwiKTtcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSAoKHZhbHVlICYgMjU1KSA8PCAxNikgfCAodmFsdWUgJiA2NTI4MCkgfCAoKHZhbHVlICYgMTY3MTE2ODApID4+PiAxNik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIiNcIiArIChcIjAwMDAwMFwiICsgdmFsdWUudG9TdHJpbmcoMTYpKS5zbGljZSgtNik7XG4gICAgICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIm5vbmVcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBpID0gZy5kb2MuY3JlYXRlRWxlbWVudChcImlcIik7XG4gICAgICAgICAgICBpLnRpdGxlID0gXCJSYXBoYVxceGVibCBDb2xvdXIgUGlja2VyXCI7XG4gICAgICAgICAgICBpLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgIGcuZG9jLmJvZHkuYXBwZW5kQ2hpbGQoaSk7XG4gICAgICAgICAgICB0b0hleCA9IGNhY2hlcihmdW5jdGlvbiAoY29sb3IpIHtcbiAgICAgICAgICAgICAgICBpLnN0eWxlLmNvbG9yID0gY29sb3I7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGcuZG9jLmRlZmF1bHRWaWV3LmdldENvbXB1dGVkU3R5bGUoaSwgRSkuZ2V0UHJvcGVydHlWYWx1ZShcImNvbG9yXCIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRvSGV4KGNvbG9yKTtcbiAgICB9LFxuICAgIGhzYnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gXCJoc2IoXCIgKyBbdGhpcy5oLCB0aGlzLnMsIHRoaXMuYl0gKyBcIilcIjtcbiAgICB9LFxuICAgIGhzbHRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gXCJoc2woXCIgKyBbdGhpcy5oLCB0aGlzLnMsIHRoaXMubF0gKyBcIilcIjtcbiAgICB9LFxuICAgIHJnYnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5oZXg7XG4gICAgfSxcbiAgICBwcmVwYXJlUkdCID0gZnVuY3Rpb24gKHIsIGcsIGIpIHtcbiAgICAgICAgaWYgKGcgPT0gbnVsbCAmJiBSLmlzKHIsIFwib2JqZWN0XCIpICYmIFwiclwiIGluIHIgJiYgXCJnXCIgaW4gciAmJiBcImJcIiBpbiByKSB7XG4gICAgICAgICAgICBiID0gci5iO1xuICAgICAgICAgICAgZyA9IHIuZztcbiAgICAgICAgICAgIHIgPSByLnI7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGcgPT0gbnVsbCAmJiBSLmlzKHIsIHN0cmluZykpIHtcbiAgICAgICAgICAgIHZhciBjbHIgPSBSLmdldFJHQihyKTtcbiAgICAgICAgICAgIHIgPSBjbHIucjtcbiAgICAgICAgICAgIGcgPSBjbHIuZztcbiAgICAgICAgICAgIGIgPSBjbHIuYjtcbiAgICAgICAgfVxuICAgICAgICBpZiAociA+IDEgfHwgZyA+IDEgfHwgYiA+IDEpIHtcbiAgICAgICAgICAgIHIgLz0gMjU1O1xuICAgICAgICAgICAgZyAvPSAyNTU7XG4gICAgICAgICAgICBiIC89IDI1NTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIFtyLCBnLCBiXTtcbiAgICB9LFxuICAgIHBhY2thZ2VSR0IgPSBmdW5jdGlvbiAociwgZywgYiwgbykge1xuICAgICAgICByICo9IDI1NTtcbiAgICAgICAgZyAqPSAyNTU7XG4gICAgICAgIGIgKj0gMjU1O1xuICAgICAgICB2YXIgcmdiID0ge1xuICAgICAgICAgICAgcjogcixcbiAgICAgICAgICAgIGc6IGcsXG4gICAgICAgICAgICBiOiBiLFxuICAgICAgICAgICAgaGV4OiBSLnJnYihyLCBnLCBiKSxcbiAgICAgICAgICAgIHRvU3RyaW5nOiByZ2J0b1N0cmluZ1xuICAgICAgICB9O1xuICAgICAgICBSLmlzKG8sIFwiZmluaXRlXCIpICYmIChyZ2Iub3BhY2l0eSA9IG8pO1xuICAgICAgICByZXR1cm4gcmdiO1xuICAgIH07XG4gICAgXG4gICAgXG4gICAgUi5jb2xvciA9IGZ1bmN0aW9uIChjbHIpIHtcbiAgICAgICAgdmFyIHJnYjtcbiAgICAgICAgaWYgKFIuaXMoY2xyLCBcIm9iamVjdFwiKSAmJiBcImhcIiBpbiBjbHIgJiYgXCJzXCIgaW4gY2xyICYmIFwiYlwiIGluIGNscikge1xuICAgICAgICAgICAgcmdiID0gUi5oc2IycmdiKGNscik7XG4gICAgICAgICAgICBjbHIuciA9IHJnYi5yO1xuICAgICAgICAgICAgY2xyLmcgPSByZ2IuZztcbiAgICAgICAgICAgIGNsci5iID0gcmdiLmI7XG4gICAgICAgICAgICBjbHIuaGV4ID0gcmdiLmhleDtcbiAgICAgICAgfSBlbHNlIGlmIChSLmlzKGNsciwgXCJvYmplY3RcIikgJiYgXCJoXCIgaW4gY2xyICYmIFwic1wiIGluIGNsciAmJiBcImxcIiBpbiBjbHIpIHtcbiAgICAgICAgICAgIHJnYiA9IFIuaHNsMnJnYihjbHIpO1xuICAgICAgICAgICAgY2xyLnIgPSByZ2IucjtcbiAgICAgICAgICAgIGNsci5nID0gcmdiLmc7XG4gICAgICAgICAgICBjbHIuYiA9IHJnYi5iO1xuICAgICAgICAgICAgY2xyLmhleCA9IHJnYi5oZXg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoUi5pcyhjbHIsIFwic3RyaW5nXCIpKSB7XG4gICAgICAgICAgICAgICAgY2xyID0gUi5nZXRSR0IoY2xyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChSLmlzKGNsciwgXCJvYmplY3RcIikgJiYgXCJyXCIgaW4gY2xyICYmIFwiZ1wiIGluIGNsciAmJiBcImJcIiBpbiBjbHIpIHtcbiAgICAgICAgICAgICAgICByZ2IgPSBSLnJnYjJoc2woY2xyKTtcbiAgICAgICAgICAgICAgICBjbHIuaCA9IHJnYi5oO1xuICAgICAgICAgICAgICAgIGNsci5zID0gcmdiLnM7XG4gICAgICAgICAgICAgICAgY2xyLmwgPSByZ2IubDtcbiAgICAgICAgICAgICAgICByZ2IgPSBSLnJnYjJoc2IoY2xyKTtcbiAgICAgICAgICAgICAgICBjbHIudiA9IHJnYi5iO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjbHIgPSB7aGV4OiBcIm5vbmVcIn07XG4gICAgICAgICAgICAgICAgY2xyLnIgPSBjbHIuZyA9IGNsci5iID0gY2xyLmggPSBjbHIucyA9IGNsci52ID0gY2xyLmwgPSAtMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBjbHIudG9TdHJpbmcgPSByZ2J0b1N0cmluZztcbiAgICAgICAgcmV0dXJuIGNscjtcbiAgICB9O1xuICAgIFxuICAgIFIuaHNiMnJnYiA9IGZ1bmN0aW9uIChoLCBzLCB2LCBvKSB7XG4gICAgICAgIGlmICh0aGlzLmlzKGgsIFwib2JqZWN0XCIpICYmIFwiaFwiIGluIGggJiYgXCJzXCIgaW4gaCAmJiBcImJcIiBpbiBoKSB7XG4gICAgICAgICAgICB2ID0gaC5iO1xuICAgICAgICAgICAgcyA9IGgucztcbiAgICAgICAgICAgIGggPSBoLmg7XG4gICAgICAgICAgICBvID0gaC5vO1xuICAgICAgICB9XG4gICAgICAgIGggKj0gMzYwO1xuICAgICAgICB2YXIgUiwgRywgQiwgWCwgQztcbiAgICAgICAgaCA9IChoICUgMzYwKSAvIDYwO1xuICAgICAgICBDID0gdiAqIHM7XG4gICAgICAgIFggPSBDICogKDEgLSBhYnMoaCAlIDIgLSAxKSk7XG4gICAgICAgIFIgPSBHID0gQiA9IHYgLSBDO1xuXG4gICAgICAgIGggPSB+fmg7XG4gICAgICAgIFIgKz0gW0MsIFgsIDAsIDAsIFgsIENdW2hdO1xuICAgICAgICBHICs9IFtYLCBDLCBDLCBYLCAwLCAwXVtoXTtcbiAgICAgICAgQiArPSBbMCwgMCwgWCwgQywgQywgWF1baF07XG4gICAgICAgIHJldHVybiBwYWNrYWdlUkdCKFIsIEcsIEIsIG8pO1xuICAgIH07XG4gICAgXG4gICAgUi5oc2wycmdiID0gZnVuY3Rpb24gKGgsIHMsIGwsIG8pIHtcbiAgICAgICAgaWYgKHRoaXMuaXMoaCwgXCJvYmplY3RcIikgJiYgXCJoXCIgaW4gaCAmJiBcInNcIiBpbiBoICYmIFwibFwiIGluIGgpIHtcbiAgICAgICAgICAgIGwgPSBoLmw7XG4gICAgICAgICAgICBzID0gaC5zO1xuICAgICAgICAgICAgaCA9IGguaDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaCA+IDEgfHwgcyA+IDEgfHwgbCA+IDEpIHtcbiAgICAgICAgICAgIGggLz0gMzYwO1xuICAgICAgICAgICAgcyAvPSAxMDA7XG4gICAgICAgICAgICBsIC89IDEwMDtcbiAgICAgICAgfVxuICAgICAgICBoICo9IDM2MDtcbiAgICAgICAgdmFyIFIsIEcsIEIsIFgsIEM7XG4gICAgICAgIGggPSAoaCAlIDM2MCkgLyA2MDtcbiAgICAgICAgQyA9IDIgKiBzICogKGwgPCAuNSA/IGwgOiAxIC0gbCk7XG4gICAgICAgIFggPSBDICogKDEgLSBhYnMoaCAlIDIgLSAxKSk7XG4gICAgICAgIFIgPSBHID0gQiA9IGwgLSBDIC8gMjtcblxuICAgICAgICBoID0gfn5oO1xuICAgICAgICBSICs9IFtDLCBYLCAwLCAwLCBYLCBDXVtoXTtcbiAgICAgICAgRyArPSBbWCwgQywgQywgWCwgMCwgMF1baF07XG4gICAgICAgIEIgKz0gWzAsIDAsIFgsIEMsIEMsIFhdW2hdO1xuICAgICAgICByZXR1cm4gcGFja2FnZVJHQihSLCBHLCBCLCBvKTtcbiAgICB9O1xuICAgIFxuICAgIFIucmdiMmhzYiA9IGZ1bmN0aW9uIChyLCBnLCBiKSB7XG4gICAgICAgIGIgPSBwcmVwYXJlUkdCKHIsIGcsIGIpO1xuICAgICAgICByID0gYlswXTtcbiAgICAgICAgZyA9IGJbMV07XG4gICAgICAgIGIgPSBiWzJdO1xuXG4gICAgICAgIHZhciBILCBTLCBWLCBDO1xuICAgICAgICBWID0gbW1heChyLCBnLCBiKTtcbiAgICAgICAgQyA9IFYgLSBtbWluKHIsIGcsIGIpO1xuICAgICAgICBIID0gKEMgPT0gMCA/IG51bGwgOlxuICAgICAgICAgICAgIFYgPT0gciA/IChnIC0gYikgLyBDIDpcbiAgICAgICAgICAgICBWID09IGcgPyAoYiAtIHIpIC8gQyArIDIgOlxuICAgICAgICAgICAgICAgICAgICAgIChyIC0gZykgLyBDICsgNFxuICAgICAgICAgICAgKTtcbiAgICAgICAgSCA9ICgoSCArIDM2MCkgJSA2KSAqIDYwIC8gMzYwO1xuICAgICAgICBTID0gQyA9PSAwID8gMCA6IEMgLyBWO1xuICAgICAgICByZXR1cm4ge2g6IEgsIHM6IFMsIGI6IFYsIHRvU3RyaW5nOiBoc2J0b1N0cmluZ307XG4gICAgfTtcbiAgICBcbiAgICBSLnJnYjJoc2wgPSBmdW5jdGlvbiAociwgZywgYikge1xuICAgICAgICBiID0gcHJlcGFyZVJHQihyLCBnLCBiKTtcbiAgICAgICAgciA9IGJbMF07XG4gICAgICAgIGcgPSBiWzFdO1xuICAgICAgICBiID0gYlsyXTtcblxuICAgICAgICB2YXIgSCwgUywgTCwgTSwgbSwgQztcbiAgICAgICAgTSA9IG1tYXgociwgZywgYik7XG4gICAgICAgIG0gPSBtbWluKHIsIGcsIGIpO1xuICAgICAgICBDID0gTSAtIG07XG4gICAgICAgIEggPSAoQyA9PSAwID8gbnVsbCA6XG4gICAgICAgICAgICAgTSA9PSByID8gKGcgLSBiKSAvIEMgOlxuICAgICAgICAgICAgIE0gPT0gZyA/IChiIC0gcikgLyBDICsgMiA6XG4gICAgICAgICAgICAgICAgICAgICAgKHIgLSBnKSAvIEMgKyA0KTtcbiAgICAgICAgSCA9ICgoSCArIDM2MCkgJSA2KSAqIDYwIC8gMzYwO1xuICAgICAgICBMID0gKE0gKyBtKSAvIDI7XG4gICAgICAgIFMgPSAoQyA9PSAwID8gMCA6XG4gICAgICAgICAgICAgTCA8IC41ID8gQyAvICgyICogTCkgOlxuICAgICAgICAgICAgICAgICAgICAgIEMgLyAoMiAtIDIgKiBMKSk7XG4gICAgICAgIHJldHVybiB7aDogSCwgczogUywgbDogTCwgdG9TdHJpbmc6IGhzbHRvU3RyaW5nfTtcbiAgICB9O1xuICAgIFIuX3BhdGgyc3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5qb2luKFwiLFwiKS5yZXBsYWNlKHAycywgXCIkMVwiKTtcbiAgICB9O1xuICAgIGZ1bmN0aW9uIHJlcHVzaChhcnJheSwgaXRlbSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBhcnJheS5sZW5ndGg7IGkgPCBpaTsgaSsrKSBpZiAoYXJyYXlbaV0gPT09IGl0ZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBhcnJheS5wdXNoKGFycmF5LnNwbGljZShpLCAxKVswXSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gY2FjaGVyKGYsIHNjb3BlLCBwb3N0cHJvY2Vzc29yKSB7XG4gICAgICAgIGZ1bmN0aW9uIG5ld2YoKSB7XG4gICAgICAgICAgICB2YXIgYXJnID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKSxcbiAgICAgICAgICAgICAgICBhcmdzID0gYXJnLmpvaW4oXCJcXHUyNDAwXCIpLFxuICAgICAgICAgICAgICAgIGNhY2hlID0gbmV3Zi5jYWNoZSA9IG5ld2YuY2FjaGUgfHwge30sXG4gICAgICAgICAgICAgICAgY291bnQgPSBuZXdmLmNvdW50ID0gbmV3Zi5jb3VudCB8fCBbXTtcbiAgICAgICAgICAgIGlmIChjYWNoZVtoYXNdKGFyZ3MpKSB7XG4gICAgICAgICAgICAgICAgcmVwdXNoKGNvdW50LCBhcmdzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcG9zdHByb2Nlc3NvciA/IHBvc3Rwcm9jZXNzb3IoY2FjaGVbYXJnc10pIDogY2FjaGVbYXJnc107XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb3VudC5sZW5ndGggPj0gMWUzICYmIGRlbGV0ZSBjYWNoZVtjb3VudC5zaGlmdCgpXTtcbiAgICAgICAgICAgIGNvdW50LnB1c2goYXJncyk7XG4gICAgICAgICAgICBjYWNoZVthcmdzXSA9IGZbYXBwbHldKHNjb3BlLCBhcmcpO1xuICAgICAgICAgICAgcmV0dXJuIHBvc3Rwcm9jZXNzb3IgPyBwb3N0cHJvY2Vzc29yKGNhY2hlW2FyZ3NdKSA6IGNhY2hlW2FyZ3NdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXdmO1xuICAgIH1cblxuICAgIHZhciBwcmVsb2FkID0gUi5fcHJlbG9hZCA9IGZ1bmN0aW9uIChzcmMsIGYpIHtcbiAgICAgICAgdmFyIGltZyA9IGcuZG9jLmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XG4gICAgICAgIGltZy5zdHlsZS5jc3NUZXh0ID0gXCJwb3NpdGlvbjphYnNvbHV0ZTtsZWZ0Oi05OTk5ZW07dG9wOi05OTk5ZW1cIjtcbiAgICAgICAgaW1nLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGYuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIHRoaXMub25sb2FkID0gbnVsbDtcbiAgICAgICAgICAgIGcuZG9jLmJvZHkucmVtb3ZlQ2hpbGQodGhpcyk7XG4gICAgICAgIH07XG4gICAgICAgIGltZy5vbmVycm9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZy5kb2MuYm9keS5yZW1vdmVDaGlsZCh0aGlzKTtcbiAgICAgICAgfTtcbiAgICAgICAgZy5kb2MuYm9keS5hcHBlbmRDaGlsZChpbWcpO1xuICAgICAgICBpbWcuc3JjID0gc3JjO1xuICAgIH07XG4gICAgXG4gICAgZnVuY3Rpb24gY2xyVG9TdHJpbmcoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmhleDtcbiAgICB9XG5cbiAgICBcbiAgICBSLmdldFJHQiA9IGNhY2hlcihmdW5jdGlvbiAoY29sb3VyKSB7XG4gICAgICAgIGlmICghY29sb3VyIHx8ICEhKChjb2xvdXIgPSBTdHIoY29sb3VyKSkuaW5kZXhPZihcIi1cIikgKyAxKSkge1xuICAgICAgICAgICAgcmV0dXJuIHtyOiAtMSwgZzogLTEsIGI6IC0xLCBoZXg6IFwibm9uZVwiLCBlcnJvcjogMSwgdG9TdHJpbmc6IGNsclRvU3RyaW5nfTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY29sb3VyID09IFwibm9uZVwiKSB7XG4gICAgICAgICAgICByZXR1cm4ge3I6IC0xLCBnOiAtMSwgYjogLTEsIGhleDogXCJub25lXCIsIHRvU3RyaW5nOiBjbHJUb1N0cmluZ307XG4gICAgICAgIH1cbiAgICAgICAgIShoc3JnW2hhc10oY29sb3VyLnRvTG93ZXJDYXNlKCkuc3Vic3RyaW5nKDAsIDIpKSB8fCBjb2xvdXIuY2hhckF0KCkgPT0gXCIjXCIpICYmIChjb2xvdXIgPSB0b0hleChjb2xvdXIpKTtcbiAgICAgICAgdmFyIHJlcyxcbiAgICAgICAgICAgIHJlZCxcbiAgICAgICAgICAgIGdyZWVuLFxuICAgICAgICAgICAgYmx1ZSxcbiAgICAgICAgICAgIG9wYWNpdHksXG4gICAgICAgICAgICB0LFxuICAgICAgICAgICAgdmFsdWVzLFxuICAgICAgICAgICAgcmdiID0gY29sb3VyLm1hdGNoKGNvbG91clJlZ0V4cCk7XG4gICAgICAgIGlmIChyZ2IpIHtcbiAgICAgICAgICAgIGlmIChyZ2JbMl0pIHtcbiAgICAgICAgICAgICAgICBibHVlID0gdG9JbnQocmdiWzJdLnN1YnN0cmluZyg1KSwgMTYpO1xuICAgICAgICAgICAgICAgIGdyZWVuID0gdG9JbnQocmdiWzJdLnN1YnN0cmluZygzLCA1KSwgMTYpO1xuICAgICAgICAgICAgICAgIHJlZCA9IHRvSW50KHJnYlsyXS5zdWJzdHJpbmcoMSwgMyksIDE2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZ2JbM10pIHtcbiAgICAgICAgICAgICAgICBibHVlID0gdG9JbnQoKHQgPSByZ2JbM10uY2hhckF0KDMpKSArIHQsIDE2KTtcbiAgICAgICAgICAgICAgICBncmVlbiA9IHRvSW50KCh0ID0gcmdiWzNdLmNoYXJBdCgyKSkgKyB0LCAxNik7XG4gICAgICAgICAgICAgICAgcmVkID0gdG9JbnQoKHQgPSByZ2JbM10uY2hhckF0KDEpKSArIHQsIDE2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZ2JbNF0pIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMgPSByZ2JbNF1bc3BsaXRdKGNvbW1hU3BhY2VzKTtcbiAgICAgICAgICAgICAgICByZWQgPSB0b0Zsb2F0KHZhbHVlc1swXSk7XG4gICAgICAgICAgICAgICAgdmFsdWVzWzBdLnNsaWNlKC0xKSA9PSBcIiVcIiAmJiAocmVkICo9IDIuNTUpO1xuICAgICAgICAgICAgICAgIGdyZWVuID0gdG9GbG9hdCh2YWx1ZXNbMV0pO1xuICAgICAgICAgICAgICAgIHZhbHVlc1sxXS5zbGljZSgtMSkgPT0gXCIlXCIgJiYgKGdyZWVuICo9IDIuNTUpO1xuICAgICAgICAgICAgICAgIGJsdWUgPSB0b0Zsb2F0KHZhbHVlc1syXSk7XG4gICAgICAgICAgICAgICAgdmFsdWVzWzJdLnNsaWNlKC0xKSA9PSBcIiVcIiAmJiAoYmx1ZSAqPSAyLjU1KTtcbiAgICAgICAgICAgICAgICByZ2JbMV0udG9Mb3dlckNhc2UoKS5zbGljZSgwLCA0KSA9PSBcInJnYmFcIiAmJiAob3BhY2l0eSA9IHRvRmxvYXQodmFsdWVzWzNdKSk7XG4gICAgICAgICAgICAgICAgdmFsdWVzWzNdICYmIHZhbHVlc1szXS5zbGljZSgtMSkgPT0gXCIlXCIgJiYgKG9wYWNpdHkgLz0gMTAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZ2JbNV0pIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMgPSByZ2JbNV1bc3BsaXRdKGNvbW1hU3BhY2VzKTtcbiAgICAgICAgICAgICAgICByZWQgPSB0b0Zsb2F0KHZhbHVlc1swXSk7XG4gICAgICAgICAgICAgICAgdmFsdWVzWzBdLnNsaWNlKC0xKSA9PSBcIiVcIiAmJiAocmVkICo9IDIuNTUpO1xuICAgICAgICAgICAgICAgIGdyZWVuID0gdG9GbG9hdCh2YWx1ZXNbMV0pO1xuICAgICAgICAgICAgICAgIHZhbHVlc1sxXS5zbGljZSgtMSkgPT0gXCIlXCIgJiYgKGdyZWVuICo9IDIuNTUpO1xuICAgICAgICAgICAgICAgIGJsdWUgPSB0b0Zsb2F0KHZhbHVlc1syXSk7XG4gICAgICAgICAgICAgICAgdmFsdWVzWzJdLnNsaWNlKC0xKSA9PSBcIiVcIiAmJiAoYmx1ZSAqPSAyLjU1KTtcbiAgICAgICAgICAgICAgICAodmFsdWVzWzBdLnNsaWNlKC0zKSA9PSBcImRlZ1wiIHx8IHZhbHVlc1swXS5zbGljZSgtMSkgPT0gXCJcXHhiMFwiKSAmJiAocmVkIC89IDM2MCk7XG4gICAgICAgICAgICAgICAgcmdiWzFdLnRvTG93ZXJDYXNlKCkuc2xpY2UoMCwgNCkgPT0gXCJoc2JhXCIgJiYgKG9wYWNpdHkgPSB0b0Zsb2F0KHZhbHVlc1szXSkpO1xuICAgICAgICAgICAgICAgIHZhbHVlc1szXSAmJiB2YWx1ZXNbM10uc2xpY2UoLTEpID09IFwiJVwiICYmIChvcGFjaXR5IC89IDEwMCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFIuaHNiMnJnYihyZWQsIGdyZWVuLCBibHVlLCBvcGFjaXR5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZ2JbNl0pIHtcbiAgICAgICAgICAgICAgICB2YWx1ZXMgPSByZ2JbNl1bc3BsaXRdKGNvbW1hU3BhY2VzKTtcbiAgICAgICAgICAgICAgICByZWQgPSB0b0Zsb2F0KHZhbHVlc1swXSk7XG4gICAgICAgICAgICAgICAgdmFsdWVzWzBdLnNsaWNlKC0xKSA9PSBcIiVcIiAmJiAocmVkICo9IDIuNTUpO1xuICAgICAgICAgICAgICAgIGdyZWVuID0gdG9GbG9hdCh2YWx1ZXNbMV0pO1xuICAgICAgICAgICAgICAgIHZhbHVlc1sxXS5zbGljZSgtMSkgPT0gXCIlXCIgJiYgKGdyZWVuICo9IDIuNTUpO1xuICAgICAgICAgICAgICAgIGJsdWUgPSB0b0Zsb2F0KHZhbHVlc1syXSk7XG4gICAgICAgICAgICAgICAgdmFsdWVzWzJdLnNsaWNlKC0xKSA9PSBcIiVcIiAmJiAoYmx1ZSAqPSAyLjU1KTtcbiAgICAgICAgICAgICAgICAodmFsdWVzWzBdLnNsaWNlKC0zKSA9PSBcImRlZ1wiIHx8IHZhbHVlc1swXS5zbGljZSgtMSkgPT0gXCJcXHhiMFwiKSAmJiAocmVkIC89IDM2MCk7XG4gICAgICAgICAgICAgICAgcmdiWzFdLnRvTG93ZXJDYXNlKCkuc2xpY2UoMCwgNCkgPT0gXCJoc2xhXCIgJiYgKG9wYWNpdHkgPSB0b0Zsb2F0KHZhbHVlc1szXSkpO1xuICAgICAgICAgICAgICAgIHZhbHVlc1szXSAmJiB2YWx1ZXNbM10uc2xpY2UoLTEpID09IFwiJVwiICYmIChvcGFjaXR5IC89IDEwMCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFIuaHNsMnJnYihyZWQsIGdyZWVuLCBibHVlLCBvcGFjaXR5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJnYiA9IHtyOiByZWQsIGc6IGdyZWVuLCBiOiBibHVlLCB0b1N0cmluZzogY2xyVG9TdHJpbmd9O1xuICAgICAgICAgICAgcmdiLmhleCA9IFwiI1wiICsgKDE2Nzc3MjE2IHwgYmx1ZSB8IChncmVlbiA8PCA4KSB8IChyZWQgPDwgMTYpKS50b1N0cmluZygxNikuc2xpY2UoMSk7XG4gICAgICAgICAgICBSLmlzKG9wYWNpdHksIFwiZmluaXRlXCIpICYmIChyZ2Iub3BhY2l0eSA9IG9wYWNpdHkpO1xuICAgICAgICAgICAgcmV0dXJuIHJnYjtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4ge3I6IC0xLCBnOiAtMSwgYjogLTEsIGhleDogXCJub25lXCIsIGVycm9yOiAxLCB0b1N0cmluZzogY2xyVG9TdHJpbmd9O1xuICAgIH0sIFIpO1xuICAgIFxuICAgIFIuaHNiID0gY2FjaGVyKGZ1bmN0aW9uIChoLCBzLCBiKSB7XG4gICAgICAgIHJldHVybiBSLmhzYjJyZ2IoaCwgcywgYikuaGV4O1xuICAgIH0pO1xuICAgIFxuICAgIFIuaHNsID0gY2FjaGVyKGZ1bmN0aW9uIChoLCBzLCBsKSB7XG4gICAgICAgIHJldHVybiBSLmhzbDJyZ2IoaCwgcywgbCkuaGV4O1xuICAgIH0pO1xuICAgIFxuICAgIFIucmdiID0gY2FjaGVyKGZ1bmN0aW9uIChyLCBnLCBiKSB7XG4gICAgICAgIHJldHVybiBcIiNcIiArICgxNjc3NzIxNiB8IGIgfCAoZyA8PCA4KSB8IChyIDw8IDE2KSkudG9TdHJpbmcoMTYpLnNsaWNlKDEpO1xuICAgIH0pO1xuICAgIFxuICAgIFIuZ2V0Q29sb3IgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgdmFyIHN0YXJ0ID0gdGhpcy5nZXRDb2xvci5zdGFydCA9IHRoaXMuZ2V0Q29sb3Iuc3RhcnQgfHwge2g6IDAsIHM6IDEsIGI6IHZhbHVlIHx8IC43NX0sXG4gICAgICAgICAgICByZ2IgPSB0aGlzLmhzYjJyZ2Ioc3RhcnQuaCwgc3RhcnQucywgc3RhcnQuYik7XG4gICAgICAgIHN0YXJ0LmggKz0gLjA3NTtcbiAgICAgICAgaWYgKHN0YXJ0LmggPiAxKSB7XG4gICAgICAgICAgICBzdGFydC5oID0gMDtcbiAgICAgICAgICAgIHN0YXJ0LnMgLT0gLjI7XG4gICAgICAgICAgICBzdGFydC5zIDw9IDAgJiYgKHRoaXMuZ2V0Q29sb3Iuc3RhcnQgPSB7aDogMCwgczogMSwgYjogc3RhcnQuYn0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZ2IuaGV4O1xuICAgIH07XG4gICAgXG4gICAgUi5nZXRDb2xvci5yZXNldCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuc3RhcnQ7XG4gICAgfTtcblxuICAgIC8vIGh0dHA6Ly9zY2hlcGVycy5jYy9nZXR0aW5nLXRvLXRoZS1wb2ludFxuICAgIGZ1bmN0aW9uIGNhdG11bGxSb20yYmV6aWVyKGNycCwgeikge1xuICAgICAgICB2YXIgZCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaUxlbiA9IGNycC5sZW5ndGg7IGlMZW4gLSAyICogIXogPiBpOyBpICs9IDIpIHtcbiAgICAgICAgICAgIHZhciBwID0gW1xuICAgICAgICAgICAgICAgICAgICAgICAge3g6ICtjcnBbaSAtIDJdLCB5OiArY3JwW2kgLSAxXX0sXG4gICAgICAgICAgICAgICAgICAgICAgICB7eDogK2NycFtpXSwgICAgIHk6ICtjcnBbaSArIDFdfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHt4OiArY3JwW2kgKyAyXSwgeTogK2NycFtpICsgM119LFxuICAgICAgICAgICAgICAgICAgICAgICAge3g6ICtjcnBbaSArIDRdLCB5OiArY3JwW2kgKyA1XX1cbiAgICAgICAgICAgICAgICAgICAgXTtcbiAgICAgICAgICAgIGlmICh6KSB7XG4gICAgICAgICAgICAgICAgaWYgKCFpKSB7XG4gICAgICAgICAgICAgICAgICAgIHBbMF0gPSB7eDogK2NycFtpTGVuIC0gMl0sIHk6ICtjcnBbaUxlbiAtIDFdfTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlMZW4gLSA0ID09IGkpIHtcbiAgICAgICAgICAgICAgICAgICAgcFszXSA9IHt4OiArY3JwWzBdLCB5OiArY3JwWzFdfTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGlMZW4gLSAyID09IGkpIHtcbiAgICAgICAgICAgICAgICAgICAgcFsyXSA9IHt4OiArY3JwWzBdLCB5OiArY3JwWzFdfTtcbiAgICAgICAgICAgICAgICAgICAgcFszXSA9IHt4OiArY3JwWzJdLCB5OiArY3JwWzNdfTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChpTGVuIC0gNCA9PSBpKSB7XG4gICAgICAgICAgICAgICAgICAgIHBbM10gPSBwWzJdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIWkpIHtcbiAgICAgICAgICAgICAgICAgICAgcFswXSA9IHt4OiArY3JwW2ldLCB5OiArY3JwW2kgKyAxXX07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZC5wdXNoKFtcIkNcIixcbiAgICAgICAgICAgICAgICAgICgtcFswXS54ICsgNiAqIHBbMV0ueCArIHBbMl0ueCkgLyA2LFxuICAgICAgICAgICAgICAgICAgKC1wWzBdLnkgKyA2ICogcFsxXS55ICsgcFsyXS55KSAvIDYsXG4gICAgICAgICAgICAgICAgICAocFsxXS54ICsgNiAqIHBbMl0ueCAtIHBbM10ueCkgLyA2LFxuICAgICAgICAgICAgICAgICAgKHBbMV0ueSArIDYqcFsyXS55IC0gcFszXS55KSAvIDYsXG4gICAgICAgICAgICAgICAgICBwWzJdLngsXG4gICAgICAgICAgICAgICAgICBwWzJdLnlcbiAgICAgICAgICAgIF0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGQ7XG4gICAgfVxuICAgIFxuICAgIFIucGFyc2VQYXRoU3RyaW5nID0gZnVuY3Rpb24gKHBhdGhTdHJpbmcpIHtcbiAgICAgICAgaWYgKCFwYXRoU3RyaW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcHRoID0gcGF0aHMocGF0aFN0cmluZyk7XG4gICAgICAgIGlmIChwdGguYXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gcGF0aENsb25lKHB0aC5hcnIpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB2YXIgcGFyYW1Db3VudHMgPSB7YTogNywgYzogNiwgaDogMSwgbDogMiwgbTogMiwgcjogNCwgcTogNCwgczogNCwgdDogMiwgdjogMSwgejogMH0sXG4gICAgICAgICAgICBkYXRhID0gW107XG4gICAgICAgIGlmIChSLmlzKHBhdGhTdHJpbmcsIGFycmF5KSAmJiBSLmlzKHBhdGhTdHJpbmdbMF0sIGFycmF5KSkgeyAvLyByb3VnaCBhc3N1bXB0aW9uXG4gICAgICAgICAgICBkYXRhID0gcGF0aENsb25lKHBhdGhTdHJpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZGF0YS5sZW5ndGgpIHtcbiAgICAgICAgICAgIFN0cihwYXRoU3RyaW5nKS5yZXBsYWNlKHBhdGhDb21tYW5kLCBmdW5jdGlvbiAoYSwgYiwgYykge1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSBbXSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZSA9IGIudG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICBjLnJlcGxhY2UocGF0aFZhbHVlcywgZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICAgICAgICAgICAgYiAmJiBwYXJhbXMucHVzaCgrYik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaWYgKG5hbWUgPT0gXCJtXCIgJiYgcGFyYW1zLmxlbmd0aCA+IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5wdXNoKFtiXVtjb25jYXRdKHBhcmFtcy5zcGxpY2UoMCwgMikpKTtcbiAgICAgICAgICAgICAgICAgICAgbmFtZSA9IFwibFwiO1xuICAgICAgICAgICAgICAgICAgICBiID0gYiA9PSBcIm1cIiA/IFwibFwiIDogXCJMXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChuYW1lID09IFwiclwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGEucHVzaChbYl1bY29uY2F0XShwYXJhbXMpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Ugd2hpbGUgKHBhcmFtcy5sZW5ndGggPj0gcGFyYW1Db3VudHNbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0YS5wdXNoKFtiXVtjb25jYXRdKHBhcmFtcy5zcGxpY2UoMCwgcGFyYW1Db3VudHNbbmFtZV0pKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcGFyYW1Db3VudHNbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgZGF0YS50b1N0cmluZyA9IFIuX3BhdGgyc3RyaW5nO1xuICAgICAgICBwdGguYXJyID0gcGF0aENsb25lKGRhdGEpO1xuICAgICAgICByZXR1cm4gZGF0YTtcbiAgICB9O1xuICAgIFxuICAgIFIucGFyc2VUcmFuc2Zvcm1TdHJpbmcgPSBjYWNoZXIoZnVuY3Rpb24gKFRTdHJpbmcpIHtcbiAgICAgICAgaWYgKCFUU3RyaW5nKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcGFyYW1Db3VudHMgPSB7cjogMywgczogNCwgdDogMiwgbTogNn0sXG4gICAgICAgICAgICBkYXRhID0gW107XG4gICAgICAgIGlmIChSLmlzKFRTdHJpbmcsIGFycmF5KSAmJiBSLmlzKFRTdHJpbmdbMF0sIGFycmF5KSkgeyAvLyByb3VnaCBhc3N1bXB0aW9uXG4gICAgICAgICAgICBkYXRhID0gcGF0aENsb25lKFRTdHJpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZGF0YS5sZW5ndGgpIHtcbiAgICAgICAgICAgIFN0cihUU3RyaW5nKS5yZXBsYWNlKHRDb21tYW5kLCBmdW5jdGlvbiAoYSwgYiwgYykge1xuICAgICAgICAgICAgICAgIHZhciBwYXJhbXMgPSBbXSxcbiAgICAgICAgICAgICAgICAgICAgbmFtZSA9IGxvd2VyQ2FzZS5jYWxsKGIpO1xuICAgICAgICAgICAgICAgIGMucmVwbGFjZShwYXRoVmFsdWVzLCBmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICAgICAgICAgICAgICBiICYmIHBhcmFtcy5wdXNoKCtiKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBkYXRhLnB1c2goW2JdW2NvbmNhdF0ocGFyYW1zKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBkYXRhLnRvU3RyaW5nID0gUi5fcGF0aDJzdHJpbmc7XG4gICAgICAgIHJldHVybiBkYXRhO1xuICAgIH0pO1xuICAgIC8vIFBBVEhTXG4gICAgdmFyIHBhdGhzID0gZnVuY3Rpb24gKHBzKSB7XG4gICAgICAgIHZhciBwID0gcGF0aHMucHMgPSBwYXRocy5wcyB8fCB7fTtcbiAgICAgICAgaWYgKHBbcHNdKSB7XG4gICAgICAgICAgICBwW3BzXS5zbGVlcCA9IDEwMDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBbcHNdID0ge1xuICAgICAgICAgICAgICAgIHNsZWVwOiAxMDBcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gcCkgaWYgKHBbaGFzXShrZXkpICYmIGtleSAhPSBwcykge1xuICAgICAgICAgICAgICAgIHBba2V5XS5zbGVlcC0tO1xuICAgICAgICAgICAgICAgICFwW2tleV0uc2xlZXAgJiYgZGVsZXRlIHBba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBwW3BzXTtcbiAgICB9O1xuICAgIFxuICAgIFIuZmluZERvdHNBdFNlZ21lbnQgPSBmdW5jdGlvbiAocDF4LCBwMXksIGMxeCwgYzF5LCBjMngsIGMyeSwgcDJ4LCBwMnksIHQpIHtcbiAgICAgICAgdmFyIHQxID0gMSAtIHQsXG4gICAgICAgICAgICB0MTMgPSBwb3codDEsIDMpLFxuICAgICAgICAgICAgdDEyID0gcG93KHQxLCAyKSxcbiAgICAgICAgICAgIHQyID0gdCAqIHQsXG4gICAgICAgICAgICB0MyA9IHQyICogdCxcbiAgICAgICAgICAgIHggPSB0MTMgKiBwMXggKyB0MTIgKiAzICogdCAqIGMxeCArIHQxICogMyAqIHQgKiB0ICogYzJ4ICsgdDMgKiBwMngsXG4gICAgICAgICAgICB5ID0gdDEzICogcDF5ICsgdDEyICogMyAqIHQgKiBjMXkgKyB0MSAqIDMgKiB0ICogdCAqIGMyeSArIHQzICogcDJ5LFxuICAgICAgICAgICAgbXggPSBwMXggKyAyICogdCAqIChjMXggLSBwMXgpICsgdDIgKiAoYzJ4IC0gMiAqIGMxeCArIHAxeCksXG4gICAgICAgICAgICBteSA9IHAxeSArIDIgKiB0ICogKGMxeSAtIHAxeSkgKyB0MiAqIChjMnkgLSAyICogYzF5ICsgcDF5KSxcbiAgICAgICAgICAgIG54ID0gYzF4ICsgMiAqIHQgKiAoYzJ4IC0gYzF4KSArIHQyICogKHAyeCAtIDIgKiBjMnggKyBjMXgpLFxuICAgICAgICAgICAgbnkgPSBjMXkgKyAyICogdCAqIChjMnkgLSBjMXkpICsgdDIgKiAocDJ5IC0gMiAqIGMyeSArIGMxeSksXG4gICAgICAgICAgICBheCA9IHQxICogcDF4ICsgdCAqIGMxeCxcbiAgICAgICAgICAgIGF5ID0gdDEgKiBwMXkgKyB0ICogYzF5LFxuICAgICAgICAgICAgY3ggPSB0MSAqIGMyeCArIHQgKiBwMngsXG4gICAgICAgICAgICBjeSA9IHQxICogYzJ5ICsgdCAqIHAyeSxcbiAgICAgICAgICAgIGFscGhhID0gKDkwIC0gbWF0aC5hdGFuMihteCAtIG54LCBteSAtIG55KSAqIDE4MCAvIFBJKTtcbiAgICAgICAgKG14ID4gbnggfHwgbXkgPCBueSkgJiYgKGFscGhhICs9IDE4MCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiB4LFxuICAgICAgICAgICAgeTogeSxcbiAgICAgICAgICAgIG06IHt4OiBteCwgeTogbXl9LFxuICAgICAgICAgICAgbjoge3g6IG54LCB5OiBueX0sXG4gICAgICAgICAgICBzdGFydDoge3g6IGF4LCB5OiBheX0sXG4gICAgICAgICAgICBlbmQ6IHt4OiBjeCwgeTogY3l9LFxuICAgICAgICAgICAgYWxwaGE6IGFscGhhXG4gICAgICAgIH07XG4gICAgfTtcbiAgICBcbiAgICBSLmJlemllckJCb3ggPSBmdW5jdGlvbiAocDF4LCBwMXksIGMxeCwgYzF5LCBjMngsIGMyeSwgcDJ4LCBwMnkpIHtcbiAgICAgICAgaWYgKCFSLmlzKHAxeCwgXCJhcnJheVwiKSkge1xuICAgICAgICAgICAgcDF4ID0gW3AxeCwgcDF5LCBjMXgsIGMxeSwgYzJ4LCBjMnksIHAyeCwgcDJ5XTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYmJveCA9IGN1cnZlRGltLmFwcGx5KG51bGwsIHAxeCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBiYm94Lm1pbi54LFxuICAgICAgICAgICAgeTogYmJveC5taW4ueSxcbiAgICAgICAgICAgIHgyOiBiYm94Lm1heC54LFxuICAgICAgICAgICAgeTI6IGJib3gubWF4LnksXG4gICAgICAgICAgICB3aWR0aDogYmJveC5tYXgueCAtIGJib3gubWluLngsXG4gICAgICAgICAgICBoZWlnaHQ6IGJib3gubWF4LnkgLSBiYm94Lm1pbi55XG4gICAgICAgIH07XG4gICAgfTtcbiAgICBcbiAgICBSLmlzUG9pbnRJbnNpZGVCQm94ID0gZnVuY3Rpb24gKGJib3gsIHgsIHkpIHtcbiAgICAgICAgcmV0dXJuIHggPj0gYmJveC54ICYmIHggPD0gYmJveC54MiAmJiB5ID49IGJib3gueSAmJiB5IDw9IGJib3gueTI7XG4gICAgfTtcbiAgICBcbiAgICBSLmlzQkJveEludGVyc2VjdCA9IGZ1bmN0aW9uIChiYm94MSwgYmJveDIpIHtcbiAgICAgICAgdmFyIGkgPSBSLmlzUG9pbnRJbnNpZGVCQm94O1xuICAgICAgICByZXR1cm4gaShiYm94MiwgYmJveDEueCwgYmJveDEueSlcbiAgICAgICAgICAgIHx8IGkoYmJveDIsIGJib3gxLngyLCBiYm94MS55KVxuICAgICAgICAgICAgfHwgaShiYm94MiwgYmJveDEueCwgYmJveDEueTIpXG4gICAgICAgICAgICB8fCBpKGJib3gyLCBiYm94MS54MiwgYmJveDEueTIpXG4gICAgICAgICAgICB8fCBpKGJib3gxLCBiYm94Mi54LCBiYm94Mi55KVxuICAgICAgICAgICAgfHwgaShiYm94MSwgYmJveDIueDIsIGJib3gyLnkpXG4gICAgICAgICAgICB8fCBpKGJib3gxLCBiYm94Mi54LCBiYm94Mi55MilcbiAgICAgICAgICAgIHx8IGkoYmJveDEsIGJib3gyLngyLCBiYm94Mi55MilcbiAgICAgICAgICAgIHx8IChiYm94MS54IDwgYmJveDIueDIgJiYgYmJveDEueCA+IGJib3gyLnggfHwgYmJveDIueCA8IGJib3gxLngyICYmIGJib3gyLnggPiBiYm94MS54KVxuICAgICAgICAgICAgJiYgKGJib3gxLnkgPCBiYm94Mi55MiAmJiBiYm94MS55ID4gYmJveDIueSB8fCBiYm94Mi55IDwgYmJveDEueTIgJiYgYmJveDIueSA+IGJib3gxLnkpO1xuICAgIH07XG4gICAgZnVuY3Rpb24gYmFzZTModCwgcDEsIHAyLCBwMywgcDQpIHtcbiAgICAgICAgdmFyIHQxID0gLTMgKiBwMSArIDkgKiBwMiAtIDkgKiBwMyArIDMgKiBwNCxcbiAgICAgICAgICAgIHQyID0gdCAqIHQxICsgNiAqIHAxIC0gMTIgKiBwMiArIDYgKiBwMztcbiAgICAgICAgcmV0dXJuIHQgKiB0MiAtIDMgKiBwMSArIDMgKiBwMjtcbiAgICB9XG4gICAgZnVuY3Rpb24gYmV6bGVuKHgxLCB5MSwgeDIsIHkyLCB4MywgeTMsIHg0LCB5NCwgeikge1xuICAgICAgICBpZiAoeiA9PSBudWxsKSB7XG4gICAgICAgICAgICB6ID0gMTtcbiAgICAgICAgfVxuICAgICAgICB6ID0geiA+IDEgPyAxIDogeiA8IDAgPyAwIDogejtcbiAgICAgICAgdmFyIHoyID0geiAvIDIsXG4gICAgICAgICAgICBuID0gMTIsXG4gICAgICAgICAgICBUdmFsdWVzID0gWy0wLjEyNTIsMC4xMjUyLC0wLjM2NzgsMC4zNjc4LC0wLjU4NzMsMC41ODczLC0wLjc2OTksMC43Njk5LC0wLjkwNDEsMC45MDQxLC0wLjk4MTYsMC45ODE2XSxcbiAgICAgICAgICAgIEN2YWx1ZXMgPSBbMC4yNDkxLDAuMjQ5MSwwLjIzMzUsMC4yMzM1LDAuMjAzMiwwLjIwMzIsMC4xNjAxLDAuMTYwMSwwLjEwNjksMC4xMDY5LDAuMDQ3MiwwLjA0NzJdLFxuICAgICAgICAgICAgc3VtID0gMDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBjdCA9IHoyICogVHZhbHVlc1tpXSArIHoyLFxuICAgICAgICAgICAgICAgIHhiYXNlID0gYmFzZTMoY3QsIHgxLCB4MiwgeDMsIHg0KSxcbiAgICAgICAgICAgICAgICB5YmFzZSA9IGJhc2UzKGN0LCB5MSwgeTIsIHkzLCB5NCksXG4gICAgICAgICAgICAgICAgY29tYiA9IHhiYXNlICogeGJhc2UgKyB5YmFzZSAqIHliYXNlO1xuICAgICAgICAgICAgc3VtICs9IEN2YWx1ZXNbaV0gKiBtYXRoLnNxcnQoY29tYik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHoyICogc3VtO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRUYXRMZW4oeDEsIHkxLCB4MiwgeTIsIHgzLCB5MywgeDQsIHk0LCBsbCkge1xuICAgICAgICBpZiAobGwgPCAwIHx8IGJlemxlbih4MSwgeTEsIHgyLCB5MiwgeDMsIHkzLCB4NCwgeTQpIDwgbGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgdCA9IDEsXG4gICAgICAgICAgICBzdGVwID0gdCAvIDIsXG4gICAgICAgICAgICB0MiA9IHQgLSBzdGVwLFxuICAgICAgICAgICAgbCxcbiAgICAgICAgICAgIGUgPSAuMDE7XG4gICAgICAgIGwgPSBiZXpsZW4oeDEsIHkxLCB4MiwgeTIsIHgzLCB5MywgeDQsIHk0LCB0Mik7XG4gICAgICAgIHdoaWxlIChhYnMobCAtIGxsKSA+IGUpIHtcbiAgICAgICAgICAgIHN0ZXAgLz0gMjtcbiAgICAgICAgICAgIHQyICs9IChsIDwgbGwgPyAxIDogLTEpICogc3RlcDtcbiAgICAgICAgICAgIGwgPSBiZXpsZW4oeDEsIHkxLCB4MiwgeTIsIHgzLCB5MywgeDQsIHk0LCB0Mik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHQyO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpbnRlcnNlY3QoeDEsIHkxLCB4MiwgeTIsIHgzLCB5MywgeDQsIHk0KSB7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIG1tYXgoeDEsIHgyKSA8IG1taW4oeDMsIHg0KSB8fFxuICAgICAgICAgICAgbW1pbih4MSwgeDIpID4gbW1heCh4MywgeDQpIHx8XG4gICAgICAgICAgICBtbWF4KHkxLCB5MikgPCBtbWluKHkzLCB5NCkgfHxcbiAgICAgICAgICAgIG1taW4oeTEsIHkyKSA+IG1tYXgoeTMsIHk0KVxuICAgICAgICApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbnggPSAoeDEgKiB5MiAtIHkxICogeDIpICogKHgzIC0geDQpIC0gKHgxIC0geDIpICogKHgzICogeTQgLSB5MyAqIHg0KSxcbiAgICAgICAgICAgIG55ID0gKHgxICogeTIgLSB5MSAqIHgyKSAqICh5MyAtIHk0KSAtICh5MSAtIHkyKSAqICh4MyAqIHk0IC0geTMgKiB4NCksXG4gICAgICAgICAgICBkZW5vbWluYXRvciA9ICh4MSAtIHgyKSAqICh5MyAtIHk0KSAtICh5MSAtIHkyKSAqICh4MyAtIHg0KTtcblxuICAgICAgICBpZiAoIWRlbm9taW5hdG9yKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHB4ID0gbnggLyBkZW5vbWluYXRvcixcbiAgICAgICAgICAgIHB5ID0gbnkgLyBkZW5vbWluYXRvcixcbiAgICAgICAgICAgIHB4MiA9ICtweC50b0ZpeGVkKDIpLFxuICAgICAgICAgICAgcHkyID0gK3B5LnRvRml4ZWQoMik7XG4gICAgICAgIGlmIChcbiAgICAgICAgICAgIHB4MiA8ICttbWluKHgxLCB4MikudG9GaXhlZCgyKSB8fFxuICAgICAgICAgICAgcHgyID4gK21tYXgoeDEsIHgyKS50b0ZpeGVkKDIpIHx8XG4gICAgICAgICAgICBweDIgPCArbW1pbih4MywgeDQpLnRvRml4ZWQoMikgfHxcbiAgICAgICAgICAgIHB4MiA+ICttbWF4KHgzLCB4NCkudG9GaXhlZCgyKSB8fFxuICAgICAgICAgICAgcHkyIDwgK21taW4oeTEsIHkyKS50b0ZpeGVkKDIpIHx8XG4gICAgICAgICAgICBweTIgPiArbW1heCh5MSwgeTIpLnRvRml4ZWQoMikgfHxcbiAgICAgICAgICAgIHB5MiA8ICttbWluKHkzLCB5NCkudG9GaXhlZCgyKSB8fFxuICAgICAgICAgICAgcHkyID4gK21tYXgoeTMsIHk0KS50b0ZpeGVkKDIpXG4gICAgICAgICkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7eDogcHgsIHk6IHB5fTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaW50ZXIoYmV6MSwgYmV6Mikge1xuICAgICAgICByZXR1cm4gaW50ZXJIZWxwZXIoYmV6MSwgYmV6Mik7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGludGVyQ291bnQoYmV6MSwgYmV6Mikge1xuICAgICAgICByZXR1cm4gaW50ZXJIZWxwZXIoYmV6MSwgYmV6MiwgMSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGludGVySGVscGVyKGJlejEsIGJlejIsIGp1c3RDb3VudCkge1xuICAgICAgICB2YXIgYmJveDEgPSBSLmJlemllckJCb3goYmV6MSksXG4gICAgICAgICAgICBiYm94MiA9IFIuYmV6aWVyQkJveChiZXoyKTtcbiAgICAgICAgaWYgKCFSLmlzQkJveEludGVyc2VjdChiYm94MSwgYmJveDIpKSB7XG4gICAgICAgICAgICByZXR1cm4ganVzdENvdW50ID8gMCA6IFtdO1xuICAgICAgICB9XG4gICAgICAgIHZhciBsMSA9IGJlemxlbi5hcHBseSgwLCBiZXoxKSxcbiAgICAgICAgICAgIGwyID0gYmV6bGVuLmFwcGx5KDAsIGJlejIpLFxuICAgICAgICAgICAgbjEgPSB+fihsMSAvIDUpLFxuICAgICAgICAgICAgbjIgPSB+fihsMiAvIDUpLFxuICAgICAgICAgICAgZG90czEgPSBbXSxcbiAgICAgICAgICAgIGRvdHMyID0gW10sXG4gICAgICAgICAgICB4eSA9IHt9LFxuICAgICAgICAgICAgcmVzID0ganVzdENvdW50ID8gMCA6IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG4xICsgMTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcCA9IFIuZmluZERvdHNBdFNlZ21lbnQuYXBwbHkoUiwgYmV6MS5jb25jYXQoaSAvIG4xKSk7XG4gICAgICAgICAgICBkb3RzMS5wdXNoKHt4OiBwLngsIHk6IHAueSwgdDogaSAvIG4xfSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IG4yICsgMTsgaSsrKSB7XG4gICAgICAgICAgICBwID0gUi5maW5kRG90c0F0U2VnbWVudC5hcHBseShSLCBiZXoyLmNvbmNhdChpIC8gbjIpKTtcbiAgICAgICAgICAgIGRvdHMyLnB1c2goe3g6IHAueCwgeTogcC55LCB0OiBpIC8gbjJ9KTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbjE7IGkrKykge1xuICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBuMjsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRpID0gZG90czFbaV0sXG4gICAgICAgICAgICAgICAgICAgIGRpMSA9IGRvdHMxW2kgKyAxXSxcbiAgICAgICAgICAgICAgICAgICAgZGogPSBkb3RzMltqXSxcbiAgICAgICAgICAgICAgICAgICAgZGoxID0gZG90czJbaiArIDFdLFxuICAgICAgICAgICAgICAgICAgICBjaSA9IGFicyhkaTEueCAtIGRpLngpIDwgLjAwMSA/IFwieVwiIDogXCJ4XCIsXG4gICAgICAgICAgICAgICAgICAgIGNqID0gYWJzKGRqMS54IC0gZGoueCkgPCAuMDAxID8gXCJ5XCIgOiBcInhcIixcbiAgICAgICAgICAgICAgICAgICAgaXMgPSBpbnRlcnNlY3QoZGkueCwgZGkueSwgZGkxLngsIGRpMS55LCBkai54LCBkai55LCBkajEueCwgZGoxLnkpO1xuICAgICAgICAgICAgICAgIGlmIChpcykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoeHlbaXMueC50b0ZpeGVkKDQpXSA9PSBpcy55LnRvRml4ZWQoNCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHh5W2lzLngudG9GaXhlZCg0KV0gPSBpcy55LnRvRml4ZWQoNCk7XG4gICAgICAgICAgICAgICAgICAgIHZhciB0MSA9IGRpLnQgKyBhYnMoKGlzW2NpXSAtIGRpW2NpXSkgLyAoZGkxW2NpXSAtIGRpW2NpXSkpICogKGRpMS50IC0gZGkudCksXG4gICAgICAgICAgICAgICAgICAgICAgICB0MiA9IGRqLnQgKyBhYnMoKGlzW2NqXSAtIGRqW2NqXSkgLyAoZGoxW2NqXSAtIGRqW2NqXSkpICogKGRqMS50IC0gZGoudCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0MSA+PSAwICYmIHQxIDw9IDEgJiYgdDIgPj0gMCAmJiB0MiA8PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoanVzdENvdW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzKys7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDogaXMueCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeTogaXMueSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdDE6IHQxLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0MjogdDJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH1cbiAgICBcbiAgICBSLnBhdGhJbnRlcnNlY3Rpb24gPSBmdW5jdGlvbiAocGF0aDEsIHBhdGgyKSB7XG4gICAgICAgIHJldHVybiBpbnRlclBhdGhIZWxwZXIocGF0aDEsIHBhdGgyKTtcbiAgICB9O1xuICAgIFIucGF0aEludGVyc2VjdGlvbk51bWJlciA9IGZ1bmN0aW9uIChwYXRoMSwgcGF0aDIpIHtcbiAgICAgICAgcmV0dXJuIGludGVyUGF0aEhlbHBlcihwYXRoMSwgcGF0aDIsIDEpO1xuICAgIH07XG4gICAgZnVuY3Rpb24gaW50ZXJQYXRoSGVscGVyKHBhdGgxLCBwYXRoMiwganVzdENvdW50KSB7XG4gICAgICAgIHBhdGgxID0gUi5fcGF0aDJjdXJ2ZShwYXRoMSk7XG4gICAgICAgIHBhdGgyID0gUi5fcGF0aDJjdXJ2ZShwYXRoMik7XG4gICAgICAgIHZhciB4MSwgeTEsIHgyLCB5MiwgeDFtLCB5MW0sIHgybSwgeTJtLCBiZXoxLCBiZXoyLFxuICAgICAgICAgICAgcmVzID0ganVzdENvdW50ID8gMCA6IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBwYXRoMS5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcGkgPSBwYXRoMVtpXTtcbiAgICAgICAgICAgIGlmIChwaVswXSA9PSBcIk1cIikge1xuICAgICAgICAgICAgICAgIHgxID0geDFtID0gcGlbMV07XG4gICAgICAgICAgICAgICAgeTEgPSB5MW0gPSBwaVsyXTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaWYgKHBpWzBdID09IFwiQ1wiKSB7XG4gICAgICAgICAgICAgICAgICAgIGJlejEgPSBbeDEsIHkxXS5jb25jYXQocGkuc2xpY2UoMSkpO1xuICAgICAgICAgICAgICAgICAgICB4MSA9IGJlejFbNl07XG4gICAgICAgICAgICAgICAgICAgIHkxID0gYmV6MVs3XTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBiZXoxID0gW3gxLCB5MSwgeDEsIHkxLCB4MW0sIHkxbSwgeDFtLCB5MW1dO1xuICAgICAgICAgICAgICAgICAgICB4MSA9IHgxbTtcbiAgICAgICAgICAgICAgICAgICAgeTEgPSB5MW07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwLCBqaiA9IHBhdGgyLmxlbmd0aDsgaiA8IGpqOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBqID0gcGF0aDJbal07XG4gICAgICAgICAgICAgICAgICAgIGlmIChwalswXSA9PSBcIk1cIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgeDIgPSB4Mm0gPSBwalsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHkyID0geTJtID0gcGpbMl07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGpbMF0gPT0gXCJDXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZXoyID0gW3gyLCB5Ml0uY29uY2F0KHBqLnNsaWNlKDEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4MiA9IGJlejJbNl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTIgPSBiZXoyWzddO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiZXoyID0gW3gyLCB5MiwgeDIsIHkyLCB4Mm0sIHkybSwgeDJtLCB5Mm1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHgyID0geDJtO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHkyID0geTJtO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGludHIgPSBpbnRlckhlbHBlcihiZXoxLCBiZXoyLCBqdXN0Q291bnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGp1c3RDb3VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcyArPSBpbnRyO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrID0gMCwga2sgPSBpbnRyLmxlbmd0aDsgayA8IGtrOyBrKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaW50cltrXS5zZWdtZW50MSA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGludHJba10uc2VnbWVudDIgPSBqO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRyW2tdLmJlejEgPSBiZXoxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnRyW2tdLmJlejIgPSBiZXoyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXMgPSByZXMuY29uY2F0KGludHIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfVxuICAgIFxuICAgIFIuaXNQb2ludEluc2lkZVBhdGggPSBmdW5jdGlvbiAocGF0aCwgeCwgeSkge1xuICAgICAgICB2YXIgYmJveCA9IFIucGF0aEJCb3gocGF0aCk7XG4gICAgICAgIHJldHVybiBSLmlzUG9pbnRJbnNpZGVCQm94KGJib3gsIHgsIHkpICYmXG4gICAgICAgICAgICAgICBpbnRlclBhdGhIZWxwZXIocGF0aCwgW1tcIk1cIiwgeCwgeV0sIFtcIkhcIiwgYmJveC54MiArIDEwXV0sIDEpICUgMiA9PSAxO1xuICAgIH07XG4gICAgUi5fcmVtb3ZlZEZhY3RvcnkgPSBmdW5jdGlvbiAobWV0aG9kbmFtZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZXZlKFwicmFwaGFlbC5sb2dcIiwgbnVsbCwgXCJSYXBoYVxceGVibDogeW91IGFyZSBjYWxsaW5nIHRvIG1ldGhvZCBcXHUyMDFjXCIgKyBtZXRob2RuYW1lICsgXCJcXHUyMDFkIG9mIHJlbW92ZWQgb2JqZWN0XCIsIG1ldGhvZG5hbWUpO1xuICAgICAgICB9O1xuICAgIH07XG4gICAgXG4gICAgdmFyIHBhdGhEaW1lbnNpb25zID0gUi5wYXRoQkJveCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgICAgIHZhciBwdGggPSBwYXRocyhwYXRoKTtcbiAgICAgICAgaWYgKHB0aC5iYm94KSB7XG4gICAgICAgICAgICByZXR1cm4gcHRoLmJib3g7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFwYXRoKSB7XG4gICAgICAgICAgICByZXR1cm4ge3g6IDAsIHk6IDAsIHdpZHRoOiAwLCBoZWlnaHQ6IDAsIHgyOiAwLCB5MjogMH07XG4gICAgICAgIH1cbiAgICAgICAgcGF0aCA9IHBhdGgyY3VydmUocGF0aCk7XG4gICAgICAgIHZhciB4ID0gMCwgXG4gICAgICAgICAgICB5ID0gMCxcbiAgICAgICAgICAgIFggPSBbXSxcbiAgICAgICAgICAgIFkgPSBbXSxcbiAgICAgICAgICAgIHA7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IHBhdGgubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgcCA9IHBhdGhbaV07XG4gICAgICAgICAgICBpZiAocFswXSA9PSBcIk1cIikge1xuICAgICAgICAgICAgICAgIHggPSBwWzFdO1xuICAgICAgICAgICAgICAgIHkgPSBwWzJdO1xuICAgICAgICAgICAgICAgIFgucHVzaCh4KTtcbiAgICAgICAgICAgICAgICBZLnB1c2goeSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBkaW0gPSBjdXJ2ZURpbSh4LCB5LCBwWzFdLCBwWzJdLCBwWzNdLCBwWzRdLCBwWzVdLCBwWzZdKTtcbiAgICAgICAgICAgICAgICBYID0gWFtjb25jYXRdKGRpbS5taW4ueCwgZGltLm1heC54KTtcbiAgICAgICAgICAgICAgICBZID0gWVtjb25jYXRdKGRpbS5taW4ueSwgZGltLm1heC55KTtcbiAgICAgICAgICAgICAgICB4ID0gcFs1XTtcbiAgICAgICAgICAgICAgICB5ID0gcFs2XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgeG1pbiA9IG1taW5bYXBwbHldKDAsIFgpLFxuICAgICAgICAgICAgeW1pbiA9IG1taW5bYXBwbHldKDAsIFkpLFxuICAgICAgICAgICAgeG1heCA9IG1tYXhbYXBwbHldKDAsIFgpLFxuICAgICAgICAgICAgeW1heCA9IG1tYXhbYXBwbHldKDAsIFkpLFxuICAgICAgICAgICAgYmIgPSB7XG4gICAgICAgICAgICAgICAgeDogeG1pbixcbiAgICAgICAgICAgICAgICB5OiB5bWluLFxuICAgICAgICAgICAgICAgIHgyOiB4bWF4LFxuICAgICAgICAgICAgICAgIHkyOiB5bWF4LFxuICAgICAgICAgICAgICAgIHdpZHRoOiB4bWF4IC0geG1pbixcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IHltYXggLSB5bWluXG4gICAgICAgICAgICB9O1xuICAgICAgICBwdGguYmJveCA9IGNsb25lKGJiKTtcbiAgICAgICAgcmV0dXJuIGJiO1xuICAgIH0sXG4gICAgICAgIHBhdGhDbG9uZSA9IGZ1bmN0aW9uIChwYXRoQXJyYXkpIHtcbiAgICAgICAgICAgIHZhciByZXMgPSBjbG9uZShwYXRoQXJyYXkpO1xuICAgICAgICAgICAgcmVzLnRvU3RyaW5nID0gUi5fcGF0aDJzdHJpbmc7XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9LFxuICAgICAgICBwYXRoVG9SZWxhdGl2ZSA9IFIuX3BhdGhUb1JlbGF0aXZlID0gZnVuY3Rpb24gKHBhdGhBcnJheSkge1xuICAgICAgICAgICAgdmFyIHB0aCA9IHBhdGhzKHBhdGhBcnJheSk7XG4gICAgICAgICAgICBpZiAocHRoLnJlbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoQ2xvbmUocHRoLnJlbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIVIuaXMocGF0aEFycmF5LCBhcnJheSkgfHwgIVIuaXMocGF0aEFycmF5ICYmIHBhdGhBcnJheVswXSwgYXJyYXkpKSB7IC8vIHJvdWdoIGFzc3VtcHRpb25cbiAgICAgICAgICAgICAgICBwYXRoQXJyYXkgPSBSLnBhcnNlUGF0aFN0cmluZyhwYXRoQXJyYXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHJlcyA9IFtdLFxuICAgICAgICAgICAgICAgIHggPSAwLFxuICAgICAgICAgICAgICAgIHkgPSAwLFxuICAgICAgICAgICAgICAgIG14ID0gMCxcbiAgICAgICAgICAgICAgICBteSA9IDAsXG4gICAgICAgICAgICAgICAgc3RhcnQgPSAwO1xuICAgICAgICAgICAgaWYgKHBhdGhBcnJheVswXVswXSA9PSBcIk1cIikge1xuICAgICAgICAgICAgICAgIHggPSBwYXRoQXJyYXlbMF1bMV07XG4gICAgICAgICAgICAgICAgeSA9IHBhdGhBcnJheVswXVsyXTtcbiAgICAgICAgICAgICAgICBteCA9IHg7XG4gICAgICAgICAgICAgICAgbXkgPSB5O1xuICAgICAgICAgICAgICAgIHN0YXJ0Kys7XG4gICAgICAgICAgICAgICAgcmVzLnB1c2goW1wiTVwiLCB4LCB5XSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gc3RhcnQsIGlpID0gcGF0aEFycmF5Lmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICB2YXIgciA9IHJlc1tpXSA9IFtdLFxuICAgICAgICAgICAgICAgICAgICBwYSA9IHBhdGhBcnJheVtpXTtcbiAgICAgICAgICAgICAgICBpZiAocGFbMF0gIT0gbG93ZXJDYXNlLmNhbGwocGFbMF0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJbMF0gPSBsb3dlckNhc2UuY2FsbChwYVswXSk7XG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoclswXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImFcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByWzFdID0gcGFbMV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgclsyXSA9IHBhWzJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJbM10gPSBwYVszXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByWzRdID0gcGFbNF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcls1XSA9IHBhWzVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJbNl0gPSArKHBhWzZdIC0geCkudG9GaXhlZCgzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByWzddID0gKyhwYVs3XSAtIHkpLnRvRml4ZWQoMyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwidlwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJbMV0gPSArKHBhWzFdIC0geSkudG9GaXhlZCgzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJtXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXggPSBwYVsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBteSA9IHBhWzJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMSwgamogPSBwYS5sZW5ndGg7IGogPCBqajsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJbal0gPSArKHBhW2pdIC0gKChqICUgMikgPyB4IDogeSkpLnRvRml4ZWQoMyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgciA9IHJlc1tpXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFbMF0gPT0gXCJtXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG14ID0gcGFbMV0gKyB4O1xuICAgICAgICAgICAgICAgICAgICAgICAgbXkgPSBwYVsyXSArIHk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgayA9IDAsIGtrID0gcGEubGVuZ3RoOyBrIDwga2s7IGsrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzW2ldW2tdID0gcGFba107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIGxlbiA9IHJlc1tpXS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChyZXNbaV1bMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInpcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHggPSBteDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHkgPSBteTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiaFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgeCArPSArcmVzW2ldW2xlbiAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ2XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB5ICs9ICtyZXNbaV1bbGVuIC0gMV07XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHggKz0gK3Jlc1tpXVtsZW4gLSAyXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHkgKz0gK3Jlc1tpXVtsZW4gLSAxXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXMudG9TdHJpbmcgPSBSLl9wYXRoMnN0cmluZztcbiAgICAgICAgICAgIHB0aC5yZWwgPSBwYXRoQ2xvbmUocmVzKTtcbiAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgIH0sXG4gICAgICAgIHBhdGhUb0Fic29sdXRlID0gUi5fcGF0aFRvQWJzb2x1dGUgPSBmdW5jdGlvbiAocGF0aEFycmF5KSB7XG4gICAgICAgICAgICB2YXIgcHRoID0gcGF0aHMocGF0aEFycmF5KTtcbiAgICAgICAgICAgIGlmIChwdGguYWJzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhdGhDbG9uZShwdGguYWJzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghUi5pcyhwYXRoQXJyYXksIGFycmF5KSB8fCAhUi5pcyhwYXRoQXJyYXkgJiYgcGF0aEFycmF5WzBdLCBhcnJheSkpIHsgLy8gcm91Z2ggYXNzdW1wdGlvblxuICAgICAgICAgICAgICAgIHBhdGhBcnJheSA9IFIucGFyc2VQYXRoU3RyaW5nKHBhdGhBcnJheSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXBhdGhBcnJheSB8fCAhcGF0aEFycmF5Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBbW1wiTVwiLCAwLCAwXV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgcmVzID0gW10sXG4gICAgICAgICAgICAgICAgeCA9IDAsXG4gICAgICAgICAgICAgICAgeSA9IDAsXG4gICAgICAgICAgICAgICAgbXggPSAwLFxuICAgICAgICAgICAgICAgIG15ID0gMCxcbiAgICAgICAgICAgICAgICBzdGFydCA9IDA7XG4gICAgICAgICAgICBpZiAocGF0aEFycmF5WzBdWzBdID09IFwiTVwiKSB7XG4gICAgICAgICAgICAgICAgeCA9ICtwYXRoQXJyYXlbMF1bMV07XG4gICAgICAgICAgICAgICAgeSA9ICtwYXRoQXJyYXlbMF1bMl07XG4gICAgICAgICAgICAgICAgbXggPSB4O1xuICAgICAgICAgICAgICAgIG15ID0geTtcbiAgICAgICAgICAgICAgICBzdGFydCsrO1xuICAgICAgICAgICAgICAgIHJlc1swXSA9IFtcIk1cIiwgeCwgeV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgY3J6ID0gcGF0aEFycmF5Lmxlbmd0aCA9PSAzICYmIHBhdGhBcnJheVswXVswXSA9PSBcIk1cIiAmJiBwYXRoQXJyYXlbMV1bMF0udG9VcHBlckNhc2UoKSA9PSBcIlJcIiAmJiBwYXRoQXJyYXlbMl1bMF0udG9VcHBlckNhc2UoKSA9PSBcIlpcIjtcbiAgICAgICAgICAgIGZvciAodmFyIHIsIHBhLCBpID0gc3RhcnQsIGlpID0gcGF0aEFycmF5Lmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICByZXMucHVzaChyID0gW10pO1xuICAgICAgICAgICAgICAgIHBhID0gcGF0aEFycmF5W2ldO1xuICAgICAgICAgICAgICAgIGlmIChwYVswXSAhPSB1cHBlckNhc2UuY2FsbChwYVswXSkpIHtcbiAgICAgICAgICAgICAgICAgICAgclswXSA9IHVwcGVyQ2FzZS5jYWxsKHBhWzBdKTtcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChyWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiQVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJbMV0gPSBwYVsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByWzJdID0gcGFbMl07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgclszXSA9IHBhWzNdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJbNF0gPSBwYVs0XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByWzVdID0gcGFbNV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcls2XSA9ICsocGFbNl0gKyB4KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByWzddID0gKyhwYVs3XSArIHkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlZcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByWzFdID0gK3BhWzFdICsgeTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJIXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgclsxXSA9ICtwYVsxXSArIHg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiUlwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBkb3RzID0gW3gsIHldW2NvbmNhdF0ocGEuc2xpY2UoMSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAyLCBqaiA9IGRvdHMubGVuZ3RoOyBqIDwgamo7IGorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb3RzW2pdID0gK2RvdHNbal0gKyB4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb3RzWysral0gPSArZG90c1tqXSArIHk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXMgPSByZXNbY29uY2F0XShjYXRtdWxsUm9tMmJlemllcihkb3RzLCBjcnopKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJNXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbXggPSArcGFbMV0gKyB4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG15ID0gK3BhWzJdICsgeTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChqID0gMSwgamogPSBwYS5sZW5ndGg7IGogPCBqajsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJbal0gPSArcGFbal0gKyAoKGogJSAyKSA/IHggOiB5KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBhWzBdID09IFwiUlwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvdHMgPSBbeCwgeV1bY29uY2F0XShwYS5zbGljZSgxKSk7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzID0gcmVzW2NvbmNhdF0oY2F0bXVsbFJvbTJiZXppZXIoZG90cywgY3J6KSk7XG4gICAgICAgICAgICAgICAgICAgIHIgPSBbXCJSXCJdW2NvbmNhdF0ocGEuc2xpY2UoLTIpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBrID0gMCwga2sgPSBwYS5sZW5ndGg7IGsgPCBrazsgaysrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByW2tdID0gcGFba107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc3dpdGNoIChyWzBdKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJaXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB4ID0gbXg7XG4gICAgICAgICAgICAgICAgICAgICAgICB5ID0gbXk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIkhcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHggPSByWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJWXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB5ID0gclsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiTVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgbXggPSByW3IubGVuZ3RoIC0gMl07XG4gICAgICAgICAgICAgICAgICAgICAgICBteSA9IHJbci5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIHggPSByW3IubGVuZ3RoIC0gMl07XG4gICAgICAgICAgICAgICAgICAgICAgICB5ID0gcltyLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJlcy50b1N0cmluZyA9IFIuX3BhdGgyc3RyaW5nO1xuICAgICAgICAgICAgcHRoLmFicyA9IHBhdGhDbG9uZShyZXMpO1xuICAgICAgICAgICAgcmV0dXJuIHJlcztcbiAgICAgICAgfSxcbiAgICAgICAgbDJjID0gZnVuY3Rpb24gKHgxLCB5MSwgeDIsIHkyKSB7XG4gICAgICAgICAgICByZXR1cm4gW3gxLCB5MSwgeDIsIHkyLCB4MiwgeTJdO1xuICAgICAgICB9LFxuICAgICAgICBxMmMgPSBmdW5jdGlvbiAoeDEsIHkxLCBheCwgYXksIHgyLCB5Mikge1xuICAgICAgICAgICAgdmFyIF8xMyA9IDEgLyAzLFxuICAgICAgICAgICAgICAgIF8yMyA9IDIgLyAzO1xuICAgICAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgICAgICAgICAgXzEzICogeDEgKyBfMjMgKiBheCxcbiAgICAgICAgICAgICAgICAgICAgXzEzICogeTEgKyBfMjMgKiBheSxcbiAgICAgICAgICAgICAgICAgICAgXzEzICogeDIgKyBfMjMgKiBheCxcbiAgICAgICAgICAgICAgICAgICAgXzEzICogeTIgKyBfMjMgKiBheSxcbiAgICAgICAgICAgICAgICAgICAgeDIsXG4gICAgICAgICAgICAgICAgICAgIHkyXG4gICAgICAgICAgICAgICAgXTtcbiAgICAgICAgfSxcbiAgICAgICAgYTJjID0gZnVuY3Rpb24gKHgxLCB5MSwgcngsIHJ5LCBhbmdsZSwgbGFyZ2VfYXJjX2ZsYWcsIHN3ZWVwX2ZsYWcsIHgyLCB5MiwgcmVjdXJzaXZlKSB7XG4gICAgICAgICAgICAvLyBmb3IgbW9yZSBpbmZvcm1hdGlvbiBvZiB3aGVyZSB0aGlzIG1hdGggY2FtZSBmcm9tIHZpc2l0OlxuICAgICAgICAgICAgLy8gaHR0cDovL3d3dy53My5vcmcvVFIvU1ZHMTEvaW1wbG5vdGUuaHRtbCNBcmNJbXBsZW1lbnRhdGlvbk5vdGVzXG4gICAgICAgICAgICB2YXIgXzEyMCA9IFBJICogMTIwIC8gMTgwLFxuICAgICAgICAgICAgICAgIHJhZCA9IFBJIC8gMTgwICogKCthbmdsZSB8fCAwKSxcbiAgICAgICAgICAgICAgICByZXMgPSBbXSxcbiAgICAgICAgICAgICAgICB4eSxcbiAgICAgICAgICAgICAgICByb3RhdGUgPSBjYWNoZXIoZnVuY3Rpb24gKHgsIHksIHJhZCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgWCA9IHggKiBtYXRoLmNvcyhyYWQpIC0geSAqIG1hdGguc2luKHJhZCksXG4gICAgICAgICAgICAgICAgICAgICAgICBZID0geCAqIG1hdGguc2luKHJhZCkgKyB5ICogbWF0aC5jb3MocmFkKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHt4OiBYLCB5OiBZfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGlmICghcmVjdXJzaXZlKSB7XG4gICAgICAgICAgICAgICAgeHkgPSByb3RhdGUoeDEsIHkxLCAtcmFkKTtcbiAgICAgICAgICAgICAgICB4MSA9IHh5Lng7XG4gICAgICAgICAgICAgICAgeTEgPSB4eS55O1xuICAgICAgICAgICAgICAgIHh5ID0gcm90YXRlKHgyLCB5MiwgLXJhZCk7XG4gICAgICAgICAgICAgICAgeDIgPSB4eS54O1xuICAgICAgICAgICAgICAgIHkyID0geHkueTtcbiAgICAgICAgICAgICAgICB2YXIgY29zID0gbWF0aC5jb3MoUEkgLyAxODAgKiBhbmdsZSksXG4gICAgICAgICAgICAgICAgICAgIHNpbiA9IG1hdGguc2luKFBJIC8gMTgwICogYW5nbGUpLFxuICAgICAgICAgICAgICAgICAgICB4ID0gKHgxIC0geDIpIC8gMixcbiAgICAgICAgICAgICAgICAgICAgeSA9ICh5MSAtIHkyKSAvIDI7XG4gICAgICAgICAgICAgICAgdmFyIGggPSAoeCAqIHgpIC8gKHJ4ICogcngpICsgKHkgKiB5KSAvIChyeSAqIHJ5KTtcbiAgICAgICAgICAgICAgICBpZiAoaCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgaCA9IG1hdGguc3FydChoKTtcbiAgICAgICAgICAgICAgICAgICAgcnggPSBoICogcng7XG4gICAgICAgICAgICAgICAgICAgIHJ5ID0gaCAqIHJ5O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgcngyID0gcnggKiByeCxcbiAgICAgICAgICAgICAgICAgICAgcnkyID0gcnkgKiByeSxcbiAgICAgICAgICAgICAgICAgICAgayA9IChsYXJnZV9hcmNfZmxhZyA9PSBzd2VlcF9mbGFnID8gLTEgOiAxKSAqXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXRoLnNxcnQoYWJzKChyeDIgKiByeTIgLSByeDIgKiB5ICogeSAtIHJ5MiAqIHggKiB4KSAvIChyeDIgKiB5ICogeSArIHJ5MiAqIHggKiB4KSkpLFxuICAgICAgICAgICAgICAgICAgICBjeCA9IGsgKiByeCAqIHkgLyByeSArICh4MSArIHgyKSAvIDIsXG4gICAgICAgICAgICAgICAgICAgIGN5ID0gayAqIC1yeSAqIHggLyByeCArICh5MSArIHkyKSAvIDIsXG4gICAgICAgICAgICAgICAgICAgIGYxID0gbWF0aC5hc2luKCgoeTEgLSBjeSkgLyByeSkudG9GaXhlZCg5KSksXG4gICAgICAgICAgICAgICAgICAgIGYyID0gbWF0aC5hc2luKCgoeTIgLSBjeSkgLyByeSkudG9GaXhlZCg5KSk7XG5cbiAgICAgICAgICAgICAgICBmMSA9IHgxIDwgY3ggPyBQSSAtIGYxIDogZjE7XG4gICAgICAgICAgICAgICAgZjIgPSB4MiA8IGN4ID8gUEkgLSBmMiA6IGYyO1xuICAgICAgICAgICAgICAgIGYxIDwgMCAmJiAoZjEgPSBQSSAqIDIgKyBmMSk7XG4gICAgICAgICAgICAgICAgZjIgPCAwICYmIChmMiA9IFBJICogMiArIGYyKTtcbiAgICAgICAgICAgICAgICBpZiAoc3dlZXBfZmxhZyAmJiBmMSA+IGYyKSB7XG4gICAgICAgICAgICAgICAgICAgIGYxID0gZjEgLSBQSSAqIDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghc3dlZXBfZmxhZyAmJiBmMiA+IGYxKSB7XG4gICAgICAgICAgICAgICAgICAgIGYyID0gZjIgLSBQSSAqIDI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBmMSA9IHJlY3Vyc2l2ZVswXTtcbiAgICAgICAgICAgICAgICBmMiA9IHJlY3Vyc2l2ZVsxXTtcbiAgICAgICAgICAgICAgICBjeCA9IHJlY3Vyc2l2ZVsyXTtcbiAgICAgICAgICAgICAgICBjeSA9IHJlY3Vyc2l2ZVszXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBkZiA9IGYyIC0gZjE7XG4gICAgICAgICAgICBpZiAoYWJzKGRmKSA+IF8xMjApIHtcbiAgICAgICAgICAgICAgICB2YXIgZjJvbGQgPSBmMixcbiAgICAgICAgICAgICAgICAgICAgeDJvbGQgPSB4MixcbiAgICAgICAgICAgICAgICAgICAgeTJvbGQgPSB5MjtcbiAgICAgICAgICAgICAgICBmMiA9IGYxICsgXzEyMCAqIChzd2VlcF9mbGFnICYmIGYyID4gZjEgPyAxIDogLTEpO1xuICAgICAgICAgICAgICAgIHgyID0gY3ggKyByeCAqIG1hdGguY29zKGYyKTtcbiAgICAgICAgICAgICAgICB5MiA9IGN5ICsgcnkgKiBtYXRoLnNpbihmMik7XG4gICAgICAgICAgICAgICAgcmVzID0gYTJjKHgyLCB5MiwgcngsIHJ5LCBhbmdsZSwgMCwgc3dlZXBfZmxhZywgeDJvbGQsIHkyb2xkLCBbZjIsIGYyb2xkLCBjeCwgY3ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRmID0gZjIgLSBmMTtcbiAgICAgICAgICAgIHZhciBjMSA9IG1hdGguY29zKGYxKSxcbiAgICAgICAgICAgICAgICBzMSA9IG1hdGguc2luKGYxKSxcbiAgICAgICAgICAgICAgICBjMiA9IG1hdGguY29zKGYyKSxcbiAgICAgICAgICAgICAgICBzMiA9IG1hdGguc2luKGYyKSxcbiAgICAgICAgICAgICAgICB0ID0gbWF0aC50YW4oZGYgLyA0KSxcbiAgICAgICAgICAgICAgICBoeCA9IDQgLyAzICogcnggKiB0LFxuICAgICAgICAgICAgICAgIGh5ID0gNCAvIDMgKiByeSAqIHQsXG4gICAgICAgICAgICAgICAgbTEgPSBbeDEsIHkxXSxcbiAgICAgICAgICAgICAgICBtMiA9IFt4MSArIGh4ICogczEsIHkxIC0gaHkgKiBjMV0sXG4gICAgICAgICAgICAgICAgbTMgPSBbeDIgKyBoeCAqIHMyLCB5MiAtIGh5ICogYzJdLFxuICAgICAgICAgICAgICAgIG00ID0gW3gyLCB5Ml07XG4gICAgICAgICAgICBtMlswXSA9IDIgKiBtMVswXSAtIG0yWzBdO1xuICAgICAgICAgICAgbTJbMV0gPSAyICogbTFbMV0gLSBtMlsxXTtcbiAgICAgICAgICAgIGlmIChyZWN1cnNpdmUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gW20yLCBtMywgbTRdW2NvbmNhdF0ocmVzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzID0gW20yLCBtMywgbTRdW2NvbmNhdF0ocmVzKS5qb2luKClbc3BsaXRdKFwiLFwiKTtcbiAgICAgICAgICAgICAgICB2YXIgbmV3cmVzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gcmVzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3cmVzW2ldID0gaSAlIDIgPyByb3RhdGUocmVzW2kgLSAxXSwgcmVzW2ldLCByYWQpLnkgOiByb3RhdGUocmVzW2ldLCByZXNbaSArIDFdLCByYWQpLng7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBuZXdyZXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGZpbmREb3RBdFNlZ21lbnQgPSBmdW5jdGlvbiAocDF4LCBwMXksIGMxeCwgYzF5LCBjMngsIGMyeSwgcDJ4LCBwMnksIHQpIHtcbiAgICAgICAgICAgIHZhciB0MSA9IDEgLSB0O1xuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICB4OiBwb3codDEsIDMpICogcDF4ICsgcG93KHQxLCAyKSAqIDMgKiB0ICogYzF4ICsgdDEgKiAzICogdCAqIHQgKiBjMnggKyBwb3codCwgMykgKiBwMngsXG4gICAgICAgICAgICAgICAgeTogcG93KHQxLCAzKSAqIHAxeSArIHBvdyh0MSwgMikgKiAzICogdCAqIGMxeSArIHQxICogMyAqIHQgKiB0ICogYzJ5ICsgcG93KHQsIDMpICogcDJ5XG4gICAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgICBjdXJ2ZURpbSA9IGNhY2hlcihmdW5jdGlvbiAocDF4LCBwMXksIGMxeCwgYzF5LCBjMngsIGMyeSwgcDJ4LCBwMnkpIHtcbiAgICAgICAgICAgIHZhciBhID0gKGMyeCAtIDIgKiBjMXggKyBwMXgpIC0gKHAyeCAtIDIgKiBjMnggKyBjMXgpLFxuICAgICAgICAgICAgICAgIGIgPSAyICogKGMxeCAtIHAxeCkgLSAyICogKGMyeCAtIGMxeCksXG4gICAgICAgICAgICAgICAgYyA9IHAxeCAtIGMxeCxcbiAgICAgICAgICAgICAgICB0MSA9ICgtYiArIG1hdGguc3FydChiICogYiAtIDQgKiBhICogYykpIC8gMiAvIGEsXG4gICAgICAgICAgICAgICAgdDIgPSAoLWIgLSBtYXRoLnNxcnQoYiAqIGIgLSA0ICogYSAqIGMpKSAvIDIgLyBhLFxuICAgICAgICAgICAgICAgIHkgPSBbcDF5LCBwMnldLFxuICAgICAgICAgICAgICAgIHggPSBbcDF4LCBwMnhdLFxuICAgICAgICAgICAgICAgIGRvdDtcbiAgICAgICAgICAgIGFicyh0MSkgPiBcIjFlMTJcIiAmJiAodDEgPSAuNSk7XG4gICAgICAgICAgICBhYnModDIpID4gXCIxZTEyXCIgJiYgKHQyID0gLjUpO1xuICAgICAgICAgICAgaWYgKHQxID4gMCAmJiB0MSA8IDEpIHtcbiAgICAgICAgICAgICAgICBkb3QgPSBmaW5kRG90QXRTZWdtZW50KHAxeCwgcDF5LCBjMXgsIGMxeSwgYzJ4LCBjMnksIHAyeCwgcDJ5LCB0MSk7XG4gICAgICAgICAgICAgICAgeC5wdXNoKGRvdC54KTtcbiAgICAgICAgICAgICAgICB5LnB1c2goZG90LnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHQyID4gMCAmJiB0MiA8IDEpIHtcbiAgICAgICAgICAgICAgICBkb3QgPSBmaW5kRG90QXRTZWdtZW50KHAxeCwgcDF5LCBjMXgsIGMxeSwgYzJ4LCBjMnksIHAyeCwgcDJ5LCB0Mik7XG4gICAgICAgICAgICAgICAgeC5wdXNoKGRvdC54KTtcbiAgICAgICAgICAgICAgICB5LnB1c2goZG90LnkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYSA9IChjMnkgLSAyICogYzF5ICsgcDF5KSAtIChwMnkgLSAyICogYzJ5ICsgYzF5KTtcbiAgICAgICAgICAgIGIgPSAyICogKGMxeSAtIHAxeSkgLSAyICogKGMyeSAtIGMxeSk7XG4gICAgICAgICAgICBjID0gcDF5IC0gYzF5O1xuICAgICAgICAgICAgdDEgPSAoLWIgKyBtYXRoLnNxcnQoYiAqIGIgLSA0ICogYSAqIGMpKSAvIDIgLyBhO1xuICAgICAgICAgICAgdDIgPSAoLWIgLSBtYXRoLnNxcnQoYiAqIGIgLSA0ICogYSAqIGMpKSAvIDIgLyBhO1xuICAgICAgICAgICAgYWJzKHQxKSA+IFwiMWUxMlwiICYmICh0MSA9IC41KTtcbiAgICAgICAgICAgIGFicyh0MikgPiBcIjFlMTJcIiAmJiAodDIgPSAuNSk7XG4gICAgICAgICAgICBpZiAodDEgPiAwICYmIHQxIDwgMSkge1xuICAgICAgICAgICAgICAgIGRvdCA9IGZpbmREb3RBdFNlZ21lbnQocDF4LCBwMXksIGMxeCwgYzF5LCBjMngsIGMyeSwgcDJ4LCBwMnksIHQxKTtcbiAgICAgICAgICAgICAgICB4LnB1c2goZG90LngpO1xuICAgICAgICAgICAgICAgIHkucHVzaChkb3QueSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodDIgPiAwICYmIHQyIDwgMSkge1xuICAgICAgICAgICAgICAgIGRvdCA9IGZpbmREb3RBdFNlZ21lbnQocDF4LCBwMXksIGMxeCwgYzF5LCBjMngsIGMyeSwgcDJ4LCBwMnksIHQyKTtcbiAgICAgICAgICAgICAgICB4LnB1c2goZG90LngpO1xuICAgICAgICAgICAgICAgIHkucHVzaChkb3QueSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIG1pbjoge3g6IG1taW5bYXBwbHldKDAsIHgpLCB5OiBtbWluW2FwcGx5XSgwLCB5KX0sXG4gICAgICAgICAgICAgICAgbWF4OiB7eDogbW1heFthcHBseV0oMCwgeCksIHk6IG1tYXhbYXBwbHldKDAsIHkpfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSksXG4gICAgICAgIHBhdGgyY3VydmUgPSBSLl9wYXRoMmN1cnZlID0gY2FjaGVyKGZ1bmN0aW9uIChwYXRoLCBwYXRoMikge1xuICAgICAgICAgICAgdmFyIHB0aCA9ICFwYXRoMiAmJiBwYXRocyhwYXRoKTtcbiAgICAgICAgICAgIGlmICghcGF0aDIgJiYgcHRoLmN1cnZlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhdGhDbG9uZShwdGguY3VydmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHAgPSBwYXRoVG9BYnNvbHV0ZShwYXRoKSxcbiAgICAgICAgICAgICAgICBwMiA9IHBhdGgyICYmIHBhdGhUb0Fic29sdXRlKHBhdGgyKSxcbiAgICAgICAgICAgICAgICBhdHRycyA9IHt4OiAwLCB5OiAwLCBieDogMCwgYnk6IDAsIFg6IDAsIFk6IDAsIHF4OiBudWxsLCBxeTogbnVsbH0sXG4gICAgICAgICAgICAgICAgYXR0cnMyID0ge3g6IDAsIHk6IDAsIGJ4OiAwLCBieTogMCwgWDogMCwgWTogMCwgcXg6IG51bGwsIHF5OiBudWxsfSxcbiAgICAgICAgICAgICAgICBwcm9jZXNzUGF0aCA9IGZ1bmN0aW9uIChwYXRoLCBkKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBueCwgbnk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtcIkNcIiwgZC54LCBkLnksIGQueCwgZC55LCBkLngsIGQueV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgIShwYXRoWzBdIGluIHtUOjEsIFE6MX0pICYmIChkLnF4ID0gZC5xeSA9IG51bGwpO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHBhdGhbMF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJNXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZC5YID0gcGF0aFsxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkLlkgPSBwYXRoWzJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIkFcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoID0gW1wiQ1wiXVtjb25jYXRdKGEyY1thcHBseV0oMCwgW2QueCwgZC55XVtjb25jYXRdKHBhdGguc2xpY2UoMSkpKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiU1wiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG54ID0gZC54ICsgKGQueCAtIChkLmJ4IHx8IGQueCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG55ID0gZC55ICsgKGQueSAtIChkLmJ5IHx8IGQueSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggPSBbXCJDXCIsIG54LCBueV1bY29uY2F0XShwYXRoLnNsaWNlKDEpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJUXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZC5xeCA9IGQueCArIChkLnggLSAoZC5xeCB8fCBkLngpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkLnF5ID0gZC55ICsgKGQueSAtIChkLnF5IHx8IGQueSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggPSBbXCJDXCJdW2NvbmNhdF0ocTJjKGQueCwgZC55LCBkLnF4LCBkLnF5LCBwYXRoWzFdLCBwYXRoWzJdKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiUVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGQucXggPSBwYXRoWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGQucXkgPSBwYXRoWzJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggPSBbXCJDXCJdW2NvbmNhdF0ocTJjKGQueCwgZC55LCBwYXRoWzFdLCBwYXRoWzJdLCBwYXRoWzNdLCBwYXRoWzRdKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiTFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggPSBbXCJDXCJdW2NvbmNhdF0obDJjKGQueCwgZC55LCBwYXRoWzFdLCBwYXRoWzJdKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiSFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGggPSBbXCJDXCJdW2NvbmNhdF0obDJjKGQueCwgZC55LCBwYXRoWzFdLCBkLnkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJWXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aCA9IFtcIkNcIl1bY29uY2F0XShsMmMoZC54LCBkLnksIGQueCwgcGF0aFsxXSkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlpcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoID0gW1wiQ1wiXVtjb25jYXRdKGwyYyhkLngsIGQueSwgZC5YLCBkLlkpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGF0aDtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZpeEFyYyA9IGZ1bmN0aW9uIChwcCwgaSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAocHBbaV0ubGVuZ3RoID4gNykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHBbaV0uc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwaSA9IHBwW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHBpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBwLnNwbGljZShpKyssIDAsIFtcIkNcIl1bY29uY2F0XShwaS5zcGxpY2UoMCwgNikpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHBwLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlpID0gbW1heChwLmxlbmd0aCwgcDIgJiYgcDIubGVuZ3RoIHx8IDApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmaXhNID0gZnVuY3Rpb24gKHBhdGgxLCBwYXRoMiwgYTEsIGEyLCBpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXRoMSAmJiBwYXRoMiAmJiBwYXRoMVtpXVswXSA9PSBcIk1cIiAmJiBwYXRoMltpXVswXSAhPSBcIk1cIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDIuc3BsaWNlKGksIDAsIFtcIk1cIiwgYTIueCwgYTIueV0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgYTEuYnggPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgYTEuYnkgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgYTEueCA9IHBhdGgxW2ldWzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgYTEueSA9IHBhdGgxW2ldWzJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWkgPSBtbWF4KHAubGVuZ3RoLCBwMiAmJiBwMi5sZW5ndGggfHwgMCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gbW1heChwLmxlbmd0aCwgcDIgJiYgcDIubGVuZ3RoIHx8IDApOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIHBbaV0gPSBwcm9jZXNzUGF0aChwW2ldLCBhdHRycyk7XG4gICAgICAgICAgICAgICAgZml4QXJjKHAsIGkpO1xuICAgICAgICAgICAgICAgIHAyICYmIChwMltpXSA9IHByb2Nlc3NQYXRoKHAyW2ldLCBhdHRyczIpKTtcbiAgICAgICAgICAgICAgICBwMiAmJiBmaXhBcmMocDIsIGkpO1xuICAgICAgICAgICAgICAgIGZpeE0ocCwgcDIsIGF0dHJzLCBhdHRyczIsIGkpO1xuICAgICAgICAgICAgICAgIGZpeE0ocDIsIHAsIGF0dHJzMiwgYXR0cnMsIGkpO1xuICAgICAgICAgICAgICAgIHZhciBzZWcgPSBwW2ldLFxuICAgICAgICAgICAgICAgICAgICBzZWcyID0gcDIgJiYgcDJbaV0sXG4gICAgICAgICAgICAgICAgICAgIHNlZ2xlbiA9IHNlZy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIHNlZzJsZW4gPSBwMiAmJiBzZWcyLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBhdHRycy54ID0gc2VnW3NlZ2xlbiAtIDJdO1xuICAgICAgICAgICAgICAgIGF0dHJzLnkgPSBzZWdbc2VnbGVuIC0gMV07XG4gICAgICAgICAgICAgICAgYXR0cnMuYnggPSB0b0Zsb2F0KHNlZ1tzZWdsZW4gLSA0XSkgfHwgYXR0cnMueDtcbiAgICAgICAgICAgICAgICBhdHRycy5ieSA9IHRvRmxvYXQoc2VnW3NlZ2xlbiAtIDNdKSB8fCBhdHRycy55O1xuICAgICAgICAgICAgICAgIGF0dHJzMi5ieCA9IHAyICYmICh0b0Zsb2F0KHNlZzJbc2VnMmxlbiAtIDRdKSB8fCBhdHRyczIueCk7XG4gICAgICAgICAgICAgICAgYXR0cnMyLmJ5ID0gcDIgJiYgKHRvRmxvYXQoc2VnMltzZWcybGVuIC0gM10pIHx8IGF0dHJzMi55KTtcbiAgICAgICAgICAgICAgICBhdHRyczIueCA9IHAyICYmIHNlZzJbc2VnMmxlbiAtIDJdO1xuICAgICAgICAgICAgICAgIGF0dHJzMi55ID0gcDIgJiYgc2VnMltzZWcybGVuIC0gMV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXAyKSB7XG4gICAgICAgICAgICAgICAgcHRoLmN1cnZlID0gcGF0aENsb25lKHApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHAyID8gW3AsIHAyXSA6IHA7XG4gICAgICAgIH0sIG51bGwsIHBhdGhDbG9uZSksXG4gICAgICAgIHBhcnNlRG90cyA9IFIuX3BhcnNlRG90cyA9IGNhY2hlcihmdW5jdGlvbiAoZ3JhZGllbnQpIHtcbiAgICAgICAgICAgIHZhciBkb3RzID0gW107XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBncmFkaWVudC5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRvdCA9IHt9LFxuICAgICAgICAgICAgICAgICAgICBwYXIgPSBncmFkaWVudFtpXS5tYXRjaCgvXihbXjpdKik6PyhbXFxkXFwuXSopLyk7XG4gICAgICAgICAgICAgICAgZG90LmNvbG9yID0gUi5nZXRSR0IocGFyWzFdKTtcbiAgICAgICAgICAgICAgICBpZiAoZG90LmNvbG9yLmVycm9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkb3QuY29sb3IgPSBkb3QuY29sb3IuaGV4O1xuICAgICAgICAgICAgICAgIHBhclsyXSAmJiAoZG90Lm9mZnNldCA9IHBhclsyXSArIFwiJVwiKTtcbiAgICAgICAgICAgICAgICBkb3RzLnB1c2goZG90KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoaSA9IDEsIGlpID0gZG90cy5sZW5ndGggLSAxOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmICghZG90c1tpXS5vZmZzZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHN0YXJ0ID0gdG9GbG9hdChkb3RzW2kgLSAxXS5vZmZzZXQgfHwgMCksXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmQgPSAwO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gaSArIDE7IGogPCBpaTsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZG90c1tqXS5vZmZzZXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmQgPSBkb3RzW2pdLm9mZnNldDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoIWVuZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5kID0gMTAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgaiA9IGlpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVuZCA9IHRvRmxvYXQoZW5kKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGQgPSAoZW5kIC0gc3RhcnQpIC8gKGogLSBpICsgMSk7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoOyBpIDwgajsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydCArPSBkO1xuICAgICAgICAgICAgICAgICAgICAgICAgZG90c1tpXS5vZmZzZXQgPSBzdGFydCArIFwiJVwiO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGRvdHM7XG4gICAgICAgIH0pLFxuICAgICAgICB0ZWFyID0gUi5fdGVhciA9IGZ1bmN0aW9uIChlbCwgcGFwZXIpIHtcbiAgICAgICAgICAgIGVsID09IHBhcGVyLnRvcCAmJiAocGFwZXIudG9wID0gZWwucHJldik7XG4gICAgICAgICAgICBlbCA9PSBwYXBlci5ib3R0b20gJiYgKHBhcGVyLmJvdHRvbSA9IGVsLm5leHQpO1xuICAgICAgICAgICAgZWwubmV4dCAmJiAoZWwubmV4dC5wcmV2ID0gZWwucHJldik7XG4gICAgICAgICAgICBlbC5wcmV2ICYmIChlbC5wcmV2Lm5leHQgPSBlbC5uZXh0KTtcbiAgICAgICAgfSxcbiAgICAgICAgdG9mcm9udCA9IFIuX3RvZnJvbnQgPSBmdW5jdGlvbiAoZWwsIHBhcGVyKSB7XG4gICAgICAgICAgICBpZiAocGFwZXIudG9wID09PSBlbCkge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRlYXIoZWwsIHBhcGVyKTtcbiAgICAgICAgICAgIGVsLm5leHQgPSBudWxsO1xuICAgICAgICAgICAgZWwucHJldiA9IHBhcGVyLnRvcDtcbiAgICAgICAgICAgIHBhcGVyLnRvcC5uZXh0ID0gZWw7XG4gICAgICAgICAgICBwYXBlci50b3AgPSBlbDtcbiAgICAgICAgfSxcbiAgICAgICAgdG9iYWNrID0gUi5fdG9iYWNrID0gZnVuY3Rpb24gKGVsLCBwYXBlcikge1xuICAgICAgICAgICAgaWYgKHBhcGVyLmJvdHRvbSA9PT0gZWwpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0ZWFyKGVsLCBwYXBlcik7XG4gICAgICAgICAgICBlbC5uZXh0ID0gcGFwZXIuYm90dG9tO1xuICAgICAgICAgICAgZWwucHJldiA9IG51bGw7XG4gICAgICAgICAgICBwYXBlci5ib3R0b20ucHJldiA9IGVsO1xuICAgICAgICAgICAgcGFwZXIuYm90dG9tID0gZWw7XG4gICAgICAgIH0sXG4gICAgICAgIGluc2VydGFmdGVyID0gUi5faW5zZXJ0YWZ0ZXIgPSBmdW5jdGlvbiAoZWwsIGVsMiwgcGFwZXIpIHtcbiAgICAgICAgICAgIHRlYXIoZWwsIHBhcGVyKTtcbiAgICAgICAgICAgIGVsMiA9PSBwYXBlci50b3AgJiYgKHBhcGVyLnRvcCA9IGVsKTtcbiAgICAgICAgICAgIGVsMi5uZXh0ICYmIChlbDIubmV4dC5wcmV2ID0gZWwpO1xuICAgICAgICAgICAgZWwubmV4dCA9IGVsMi5uZXh0O1xuICAgICAgICAgICAgZWwucHJldiA9IGVsMjtcbiAgICAgICAgICAgIGVsMi5uZXh0ID0gZWw7XG4gICAgICAgIH0sXG4gICAgICAgIGluc2VydGJlZm9yZSA9IFIuX2luc2VydGJlZm9yZSA9IGZ1bmN0aW9uIChlbCwgZWwyLCBwYXBlcikge1xuICAgICAgICAgICAgdGVhcihlbCwgcGFwZXIpO1xuICAgICAgICAgICAgZWwyID09IHBhcGVyLmJvdHRvbSAmJiAocGFwZXIuYm90dG9tID0gZWwpO1xuICAgICAgICAgICAgZWwyLnByZXYgJiYgKGVsMi5wcmV2Lm5leHQgPSBlbCk7XG4gICAgICAgICAgICBlbC5wcmV2ID0gZWwyLnByZXY7XG4gICAgICAgICAgICBlbDIucHJldiA9IGVsO1xuICAgICAgICAgICAgZWwubmV4dCA9IGVsMjtcbiAgICAgICAgfSxcbiAgICAgICAgXG4gICAgICAgIHRvTWF0cml4ID0gUi50b01hdHJpeCA9IGZ1bmN0aW9uIChwYXRoLCB0cmFuc2Zvcm0pIHtcbiAgICAgICAgICAgIHZhciBiYiA9IHBhdGhEaW1lbnNpb25zKHBhdGgpLFxuICAgICAgICAgICAgICAgIGVsID0ge1xuICAgICAgICAgICAgICAgICAgICBfOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06IEVcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2V0QkJveDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJiO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGV4dHJhY3RUcmFuc2Zvcm0oZWwsIHRyYW5zZm9ybSk7XG4gICAgICAgICAgICByZXR1cm4gZWwubWF0cml4O1xuICAgICAgICB9LFxuICAgICAgICBcbiAgICAgICAgdHJhbnNmb3JtUGF0aCA9IFIudHJhbnNmb3JtUGF0aCA9IGZ1bmN0aW9uIChwYXRoLCB0cmFuc2Zvcm0pIHtcbiAgICAgICAgICAgIHJldHVybiBtYXBQYXRoKHBhdGgsIHRvTWF0cml4KHBhdGgsIHRyYW5zZm9ybSkpO1xuICAgICAgICB9LFxuICAgICAgICBleHRyYWN0VHJhbnNmb3JtID0gUi5fZXh0cmFjdFRyYW5zZm9ybSA9IGZ1bmN0aW9uIChlbCwgdHN0cikge1xuICAgICAgICAgICAgaWYgKHRzdHIgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBlbC5fLnRyYW5zZm9ybTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRzdHIgPSBTdHIodHN0cikucmVwbGFjZSgvXFwuezN9fFxcdTIwMjYvZywgZWwuXy50cmFuc2Zvcm0gfHwgRSk7XG4gICAgICAgICAgICB2YXIgdGRhdGEgPSBSLnBhcnNlVHJhbnNmb3JtU3RyaW5nKHRzdHIpLFxuICAgICAgICAgICAgICAgIGRlZyA9IDAsXG4gICAgICAgICAgICAgICAgZHggPSAwLFxuICAgICAgICAgICAgICAgIGR5ID0gMCxcbiAgICAgICAgICAgICAgICBzeCA9IDEsXG4gICAgICAgICAgICAgICAgc3kgPSAxLFxuICAgICAgICAgICAgICAgIF8gPSBlbC5fLFxuICAgICAgICAgICAgICAgIG0gPSBuZXcgTWF0cml4O1xuICAgICAgICAgICAgXy50cmFuc2Zvcm0gPSB0ZGF0YSB8fCBbXTtcbiAgICAgICAgICAgIGlmICh0ZGF0YSkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IHRkYXRhLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHQgPSB0ZGF0YVtpXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRsZW4gPSB0Lmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1hbmQgPSBTdHIodFswXSkudG9Mb3dlckNhc2UoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFic29sdXRlID0gdFswXSAhPSBjb21tYW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW52ZXIgPSBhYnNvbHV0ZSA/IG0uaW52ZXJ0KCkgOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgeDEsXG4gICAgICAgICAgICAgICAgICAgICAgICB5MSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHgyLFxuICAgICAgICAgICAgICAgICAgICAgICAgeTIsXG4gICAgICAgICAgICAgICAgICAgICAgICBiYjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNvbW1hbmQgPT0gXCJ0XCIgJiYgdGxlbiA9PSAzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWJzb2x1dGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4MSA9IGludmVyLngoMCwgMCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeTEgPSBpbnZlci55KDAsIDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHgyID0gaW52ZXIueCh0WzFdLCB0WzJdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB5MiA9IGludmVyLnkodFsxXSwgdFsyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbS50cmFuc2xhdGUoeDIgLSB4MSwgeTIgLSB5MSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG0udHJhbnNsYXRlKHRbMV0sIHRbMl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT0gXCJyXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0bGVuID09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBiYiA9IGJiIHx8IGVsLmdldEJCb3goMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbS5yb3RhdGUodFsxXSwgYmIueCArIGJiLndpZHRoIC8gMiwgYmIueSArIGJiLmhlaWdodCAvIDIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZyArPSB0WzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0bGVuID09IDQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWJzb2x1dGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDIgPSBpbnZlci54KHRbMl0sIHRbM10pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5MiA9IGludmVyLnkodFsyXSwgdFszXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG0ucm90YXRlKHRbMV0sIHgyLCB5Mik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbS5yb3RhdGUodFsxXSwgdFsyXSwgdFszXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZyArPSB0WzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvbW1hbmQgPT0gXCJzXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0bGVuID09IDIgfHwgdGxlbiA9PSAzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYmIgPSBiYiB8fCBlbC5nZXRCQm94KDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG0uc2NhbGUodFsxXSwgdFt0bGVuIC0gMV0sIGJiLnggKyBiYi53aWR0aCAvIDIsIGJiLnkgKyBiYi5oZWlnaHQgLyAyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzeCAqPSB0WzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN5ICo9IHRbdGxlbiAtIDFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0bGVuID09IDUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWJzb2x1dGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeDIgPSBpbnZlci54KHRbM10sIHRbNF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5MiA9IGludmVyLnkodFszXSwgdFs0XSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG0uc2NhbGUodFsxXSwgdFsyXSwgeDIsIHkyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtLnNjYWxlKHRbMV0sIHRbMl0sIHRbM10sIHRbNF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzeCAqPSB0WzFdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN5ICo9IHRbMl07XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY29tbWFuZCA9PSBcIm1cIiAmJiB0bGVuID09IDcpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG0uYWRkKHRbMV0sIHRbMl0sIHRbM10sIHRbNF0sIHRbNV0sIHRbNl0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIF8uZGlydHlUID0gMTtcbiAgICAgICAgICAgICAgICAgICAgZWwubWF0cml4ID0gbTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgZWwubWF0cml4ID0gbTtcblxuICAgICAgICAgICAgXy5zeCA9IHN4O1xuICAgICAgICAgICAgXy5zeSA9IHN5O1xuICAgICAgICAgICAgXy5kZWcgPSBkZWc7XG4gICAgICAgICAgICBfLmR4ID0gZHggPSBtLmU7XG4gICAgICAgICAgICBfLmR5ID0gZHkgPSBtLmY7XG5cbiAgICAgICAgICAgIGlmIChzeCA9PSAxICYmIHN5ID09IDEgJiYgIWRlZyAmJiBfLmJib3gpIHtcbiAgICAgICAgICAgICAgICBfLmJib3gueCArPSArZHg7XG4gICAgICAgICAgICAgICAgXy5iYm94LnkgKz0gK2R5O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBfLmRpcnR5VCA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGdldEVtcHR5ID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgIHZhciBsID0gaXRlbVswXTtcbiAgICAgICAgICAgIHN3aXRjaCAobC50b0xvd2VyQ2FzZSgpKSB7XG4gICAgICAgICAgICAgICAgY2FzZSBcInRcIjogcmV0dXJuIFtsLCAwLCAwXTtcbiAgICAgICAgICAgICAgICBjYXNlIFwibVwiOiByZXR1cm4gW2wsIDEsIDAsIDAsIDEsIDAsIDBdO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJyXCI6IGlmIChpdGVtLmxlbmd0aCA9PSA0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBbbCwgMCwgaXRlbVsyXSwgaXRlbVszXV07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtsLCAwXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FzZSBcInNcIjogaWYgKGl0ZW0ubGVuZ3RoID09IDUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtsLCAxLCAxLCBpdGVtWzNdLCBpdGVtWzRdXTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0ubGVuZ3RoID09IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFtsLCAxLCAxXTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gW2wsIDFdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgZXF1YWxpc2VUcmFuc2Zvcm0gPSBSLl9lcXVhbGlzZVRyYW5zZm9ybSA9IGZ1bmN0aW9uICh0MSwgdDIpIHtcbiAgICAgICAgICAgIHQyID0gU3RyKHQyKS5yZXBsYWNlKC9cXC57M318XFx1MjAyNi9nLCB0MSk7XG4gICAgICAgICAgICB0MSA9IFIucGFyc2VUcmFuc2Zvcm1TdHJpbmcodDEpIHx8IFtdO1xuICAgICAgICAgICAgdDIgPSBSLnBhcnNlVHJhbnNmb3JtU3RyaW5nKHQyKSB8fCBbXTtcbiAgICAgICAgICAgIHZhciBtYXhsZW5ndGggPSBtbWF4KHQxLmxlbmd0aCwgdDIubGVuZ3RoKSxcbiAgICAgICAgICAgICAgICBmcm9tID0gW10sXG4gICAgICAgICAgICAgICAgdG8gPSBbXSxcbiAgICAgICAgICAgICAgICBpID0gMCwgaiwgamosXG4gICAgICAgICAgICAgICAgdHQxLCB0dDI7XG4gICAgICAgICAgICBmb3IgKDsgaSA8IG1heGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdHQxID0gdDFbaV0gfHwgZ2V0RW1wdHkodDJbaV0pO1xuICAgICAgICAgICAgICAgIHR0MiA9IHQyW2ldIHx8IGdldEVtcHR5KHR0MSk7XG4gICAgICAgICAgICAgICAgaWYgKCh0dDFbMF0gIT0gdHQyWzBdKSB8fFxuICAgICAgICAgICAgICAgICAgICAodHQxWzBdLnRvTG93ZXJDYXNlKCkgPT0gXCJyXCIgJiYgKHR0MVsyXSAhPSB0dDJbMl0gfHwgdHQxWzNdICE9IHR0MlszXSkpIHx8XG4gICAgICAgICAgICAgICAgICAgICh0dDFbMF0udG9Mb3dlckNhc2UoKSA9PSBcInNcIiAmJiAodHQxWzNdICE9IHR0MlszXSB8fCB0dDFbNF0gIT0gdHQyWzRdKSlcbiAgICAgICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZnJvbVtpXSA9IFtdO1xuICAgICAgICAgICAgICAgIHRvW2ldID0gW107XG4gICAgICAgICAgICAgICAgZm9yIChqID0gMCwgamogPSBtbWF4KHR0MS5sZW5ndGgsIHR0Mi5sZW5ndGgpOyBqIDwgamo7IGorKykge1xuICAgICAgICAgICAgICAgICAgICBqIGluIHR0MSAmJiAoZnJvbVtpXVtqXSA9IHR0MVtqXSk7XG4gICAgICAgICAgICAgICAgICAgIGogaW4gdHQyICYmICh0b1tpXVtqXSA9IHR0MltqXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBmcm9tOiBmcm9tLFxuICAgICAgICAgICAgICAgIHRvOiB0b1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICBSLl9nZXRDb250YWluZXIgPSBmdW5jdGlvbiAoeCwgeSwgdywgaCkge1xuICAgICAgICB2YXIgY29udGFpbmVyO1xuICAgICAgICBjb250YWluZXIgPSBoID09IG51bGwgJiYgIVIuaXMoeCwgXCJvYmplY3RcIikgPyBnLmRvYy5nZXRFbGVtZW50QnlJZCh4KSA6IHg7XG4gICAgICAgIGlmIChjb250YWluZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb250YWluZXIudGFnTmFtZSkge1xuICAgICAgICAgICAgaWYgKHkgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lcjogY29udGFpbmVyLFxuICAgICAgICAgICAgICAgICAgICB3aWR0aDogY29udGFpbmVyLnN0eWxlLnBpeGVsV2lkdGggfHwgY29udGFpbmVyLm9mZnNldFdpZHRoLFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IGNvbnRhaW5lci5zdHlsZS5waXhlbEhlaWdodCB8fCBjb250YWluZXIub2Zmc2V0SGVpZ2h0XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyOiBjb250YWluZXIsXG4gICAgICAgICAgICAgICAgICAgIHdpZHRoOiB5LFxuICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHdcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjb250YWluZXI6IDEsXG4gICAgICAgICAgICB4OiB4LFxuICAgICAgICAgICAgeTogeSxcbiAgICAgICAgICAgIHdpZHRoOiB3LFxuICAgICAgICAgICAgaGVpZ2h0OiBoXG4gICAgICAgIH07XG4gICAgfTtcbiAgICBcbiAgICBSLnBhdGhUb1JlbGF0aXZlID0gcGF0aFRvUmVsYXRpdmU7XG4gICAgUi5fZW5naW5lID0ge307XG4gICAgXG4gICAgUi5wYXRoMmN1cnZlID0gcGF0aDJjdXJ2ZTtcbiAgICBcbiAgICBSLm1hdHJpeCA9IGZ1bmN0aW9uIChhLCBiLCBjLCBkLCBlLCBmKSB7XG4gICAgICAgIHJldHVybiBuZXcgTWF0cml4KGEsIGIsIGMsIGQsIGUsIGYpO1xuICAgIH07XG4gICAgZnVuY3Rpb24gTWF0cml4KGEsIGIsIGMsIGQsIGUsIGYpIHtcbiAgICAgICAgaWYgKGEgIT0gbnVsbCkge1xuICAgICAgICAgICAgdGhpcy5hID0gK2E7XG4gICAgICAgICAgICB0aGlzLmIgPSArYjtcbiAgICAgICAgICAgIHRoaXMuYyA9ICtjO1xuICAgICAgICAgICAgdGhpcy5kID0gK2Q7XG4gICAgICAgICAgICB0aGlzLmUgPSArZTtcbiAgICAgICAgICAgIHRoaXMuZiA9ICtmO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5hID0gMTtcbiAgICAgICAgICAgIHRoaXMuYiA9IDA7XG4gICAgICAgICAgICB0aGlzLmMgPSAwO1xuICAgICAgICAgICAgdGhpcy5kID0gMTtcbiAgICAgICAgICAgIHRoaXMuZSA9IDA7XG4gICAgICAgICAgICB0aGlzLmYgPSAwO1xuICAgICAgICB9XG4gICAgfVxuICAgIChmdW5jdGlvbiAobWF0cml4cHJvdG8pIHtcbiAgICAgICAgXG4gICAgICAgIG1hdHJpeHByb3RvLmFkZCA9IGZ1bmN0aW9uIChhLCBiLCBjLCBkLCBlLCBmKSB7XG4gICAgICAgICAgICB2YXIgb3V0ID0gW1tdLCBbXSwgW11dLFxuICAgICAgICAgICAgICAgIG0gPSBbW3RoaXMuYSwgdGhpcy5jLCB0aGlzLmVdLCBbdGhpcy5iLCB0aGlzLmQsIHRoaXMuZl0sIFswLCAwLCAxXV0sXG4gICAgICAgICAgICAgICAgbWF0cml4ID0gW1thLCBjLCBlXSwgW2IsIGQsIGZdLCBbMCwgMCwgMV1dLFxuICAgICAgICAgICAgICAgIHgsIHksIHosIHJlcztcblxuICAgICAgICAgICAgaWYgKGEgJiYgYSBpbnN0YW5jZW9mIE1hdHJpeCkge1xuICAgICAgICAgICAgICAgIG1hdHJpeCA9IFtbYS5hLCBhLmMsIGEuZV0sIFthLmIsIGEuZCwgYS5mXSwgWzAsIDAsIDFdXTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZm9yICh4ID0gMDsgeCA8IDM7IHgrKykge1xuICAgICAgICAgICAgICAgIGZvciAoeSA9IDA7IHkgPCAzOyB5KyspIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh6ID0gMDsgeiA8IDM7IHorKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzICs9IG1beF1bel0gKiBtYXRyaXhbel1beV07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb3V0W3hdW3ldID0gcmVzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuYSA9IG91dFswXVswXTtcbiAgICAgICAgICAgIHRoaXMuYiA9IG91dFsxXVswXTtcbiAgICAgICAgICAgIHRoaXMuYyA9IG91dFswXVsxXTtcbiAgICAgICAgICAgIHRoaXMuZCA9IG91dFsxXVsxXTtcbiAgICAgICAgICAgIHRoaXMuZSA9IG91dFswXVsyXTtcbiAgICAgICAgICAgIHRoaXMuZiA9IG91dFsxXVsyXTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIG1hdHJpeHByb3RvLmludmVydCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBtZSA9IHRoaXMsXG4gICAgICAgICAgICAgICAgeCA9IG1lLmEgKiBtZS5kIC0gbWUuYiAqIG1lLmM7XG4gICAgICAgICAgICByZXR1cm4gbmV3IE1hdHJpeChtZS5kIC8geCwgLW1lLmIgLyB4LCAtbWUuYyAvIHgsIG1lLmEgLyB4LCAobWUuYyAqIG1lLmYgLSBtZS5kICogbWUuZSkgLyB4LCAobWUuYiAqIG1lLmUgLSBtZS5hICogbWUuZikgLyB4KTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIG1hdHJpeHByb3RvLmNsb25lID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBNYXRyaXgodGhpcy5hLCB0aGlzLmIsIHRoaXMuYywgdGhpcy5kLCB0aGlzLmUsIHRoaXMuZik7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBtYXRyaXhwcm90by50cmFuc2xhdGUgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICAgICAgdGhpcy5hZGQoMSwgMCwgMCwgMSwgeCwgeSk7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBtYXRyaXhwcm90by5zY2FsZSA9IGZ1bmN0aW9uICh4LCB5LCBjeCwgY3kpIHtcbiAgICAgICAgICAgIHkgPT0gbnVsbCAmJiAoeSA9IHgpO1xuICAgICAgICAgICAgKGN4IHx8IGN5KSAmJiB0aGlzLmFkZCgxLCAwLCAwLCAxLCBjeCwgY3kpO1xuICAgICAgICAgICAgdGhpcy5hZGQoeCwgMCwgMCwgeSwgMCwgMCk7XG4gICAgICAgICAgICAoY3ggfHwgY3kpICYmIHRoaXMuYWRkKDEsIDAsIDAsIDEsIC1jeCwgLWN5KTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIG1hdHJpeHByb3RvLnJvdGF0ZSA9IGZ1bmN0aW9uIChhLCB4LCB5KSB7XG4gICAgICAgICAgICBhID0gUi5yYWQoYSk7XG4gICAgICAgICAgICB4ID0geCB8fCAwO1xuICAgICAgICAgICAgeSA9IHkgfHwgMDtcbiAgICAgICAgICAgIHZhciBjb3MgPSArbWF0aC5jb3MoYSkudG9GaXhlZCg5KSxcbiAgICAgICAgICAgICAgICBzaW4gPSArbWF0aC5zaW4oYSkudG9GaXhlZCg5KTtcbiAgICAgICAgICAgIHRoaXMuYWRkKGNvcywgc2luLCAtc2luLCBjb3MsIHgsIHkpO1xuICAgICAgICAgICAgdGhpcy5hZGQoMSwgMCwgMCwgMSwgLXgsIC15KTtcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIG1hdHJpeHByb3RvLnggPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICAgICAgcmV0dXJuIHggKiB0aGlzLmEgKyB5ICogdGhpcy5jICsgdGhpcy5lO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgbWF0cml4cHJvdG8ueSA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgICAgICByZXR1cm4geCAqIHRoaXMuYiArIHkgKiB0aGlzLmQgKyB0aGlzLmY7XG4gICAgICAgIH07XG4gICAgICAgIG1hdHJpeHByb3RvLmdldCA9IGZ1bmN0aW9uIChpKSB7XG4gICAgICAgICAgICByZXR1cm4gK3RoaXNbU3RyLmZyb21DaGFyQ29kZSg5NyArIGkpXS50b0ZpeGVkKDQpO1xuICAgICAgICB9O1xuICAgICAgICBtYXRyaXhwcm90by50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBSLnN2ZyA/XG4gICAgICAgICAgICAgICAgXCJtYXRyaXgoXCIgKyBbdGhpcy5nZXQoMCksIHRoaXMuZ2V0KDEpLCB0aGlzLmdldCgyKSwgdGhpcy5nZXQoMyksIHRoaXMuZ2V0KDQpLCB0aGlzLmdldCg1KV0uam9pbigpICsgXCIpXCIgOlxuICAgICAgICAgICAgICAgIFt0aGlzLmdldCgwKSwgdGhpcy5nZXQoMiksIHRoaXMuZ2V0KDEpLCB0aGlzLmdldCgzKSwgMCwgMF0uam9pbigpO1xuICAgICAgICB9O1xuICAgICAgICBtYXRyaXhwcm90by50b0ZpbHRlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBcInByb2dpZDpEWEltYWdlVHJhbnNmb3JtLk1pY3Jvc29mdC5NYXRyaXgoTTExPVwiICsgdGhpcy5nZXQoMCkgK1xuICAgICAgICAgICAgICAgIFwiLCBNMTI9XCIgKyB0aGlzLmdldCgyKSArIFwiLCBNMjE9XCIgKyB0aGlzLmdldCgxKSArIFwiLCBNMjI9XCIgKyB0aGlzLmdldCgzKSArXG4gICAgICAgICAgICAgICAgXCIsIER4PVwiICsgdGhpcy5nZXQoNCkgKyBcIiwgRHk9XCIgKyB0aGlzLmdldCg1KSArIFwiLCBzaXppbmdtZXRob2Q9J2F1dG8gZXhwYW5kJylcIjtcbiAgICAgICAgfTtcbiAgICAgICAgbWF0cml4cHJvdG8ub2Zmc2V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIFt0aGlzLmUudG9GaXhlZCg0KSwgdGhpcy5mLnRvRml4ZWQoNCldO1xuICAgICAgICB9O1xuICAgICAgICBmdW5jdGlvbiBub3JtKGEpIHtcbiAgICAgICAgICAgIHJldHVybiBhWzBdICogYVswXSArIGFbMV0gKiBhWzFdO1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIG5vcm1hbGl6ZShhKSB7XG4gICAgICAgICAgICB2YXIgbWFnID0gbWF0aC5zcXJ0KG5vcm0oYSkpO1xuICAgICAgICAgICAgYVswXSAmJiAoYVswXSAvPSBtYWcpO1xuICAgICAgICAgICAgYVsxXSAmJiAoYVsxXSAvPSBtYWcpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBtYXRyaXhwcm90by5zcGxpdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBvdXQgPSB7fTtcbiAgICAgICAgICAgIC8vIHRyYW5zbGF0aW9uXG4gICAgICAgICAgICBvdXQuZHggPSB0aGlzLmU7XG4gICAgICAgICAgICBvdXQuZHkgPSB0aGlzLmY7XG5cbiAgICAgICAgICAgIC8vIHNjYWxlIGFuZCBzaGVhclxuICAgICAgICAgICAgdmFyIHJvdyA9IFtbdGhpcy5hLCB0aGlzLmNdLCBbdGhpcy5iLCB0aGlzLmRdXTtcbiAgICAgICAgICAgIG91dC5zY2FsZXggPSBtYXRoLnNxcnQobm9ybShyb3dbMF0pKTtcbiAgICAgICAgICAgIG5vcm1hbGl6ZShyb3dbMF0pO1xuXG4gICAgICAgICAgICBvdXQuc2hlYXIgPSByb3dbMF1bMF0gKiByb3dbMV1bMF0gKyByb3dbMF1bMV0gKiByb3dbMV1bMV07XG4gICAgICAgICAgICByb3dbMV0gPSBbcm93WzFdWzBdIC0gcm93WzBdWzBdICogb3V0LnNoZWFyLCByb3dbMV1bMV0gLSByb3dbMF1bMV0gKiBvdXQuc2hlYXJdO1xuXG4gICAgICAgICAgICBvdXQuc2NhbGV5ID0gbWF0aC5zcXJ0KG5vcm0ocm93WzFdKSk7XG4gICAgICAgICAgICBub3JtYWxpemUocm93WzFdKTtcbiAgICAgICAgICAgIG91dC5zaGVhciAvPSBvdXQuc2NhbGV5O1xuXG4gICAgICAgICAgICAvLyByb3RhdGlvblxuICAgICAgICAgICAgdmFyIHNpbiA9IC1yb3dbMF1bMV0sXG4gICAgICAgICAgICAgICAgY29zID0gcm93WzFdWzFdO1xuICAgICAgICAgICAgaWYgKGNvcyA8IDApIHtcbiAgICAgICAgICAgICAgICBvdXQucm90YXRlID0gUi5kZWcobWF0aC5hY29zKGNvcykpO1xuICAgICAgICAgICAgICAgIGlmIChzaW4gPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dC5yb3RhdGUgPSAzNjAgLSBvdXQucm90YXRlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgb3V0LnJvdGF0ZSA9IFIuZGVnKG1hdGguYXNpbihzaW4pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgb3V0LmlzU2ltcGxlID0gIStvdXQuc2hlYXIudG9GaXhlZCg5KSAmJiAob3V0LnNjYWxleC50b0ZpeGVkKDkpID09IG91dC5zY2FsZXkudG9GaXhlZCg5KSB8fCAhb3V0LnJvdGF0ZSk7XG4gICAgICAgICAgICBvdXQuaXNTdXBlclNpbXBsZSA9ICErb3V0LnNoZWFyLnRvRml4ZWQoOSkgJiYgb3V0LnNjYWxleC50b0ZpeGVkKDkpID09IG91dC5zY2FsZXkudG9GaXhlZCg5KSAmJiAhb3V0LnJvdGF0ZTtcbiAgICAgICAgICAgIG91dC5ub1JvdGF0aW9uID0gIStvdXQuc2hlYXIudG9GaXhlZCg5KSAmJiAhb3V0LnJvdGF0ZTtcbiAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBtYXRyaXhwcm90by50b1RyYW5zZm9ybVN0cmluZyA9IGZ1bmN0aW9uIChzaG9ydGVyKSB7XG4gICAgICAgICAgICB2YXIgcyA9IHNob3J0ZXIgfHwgdGhpc1tzcGxpdF0oKTtcbiAgICAgICAgICAgIGlmIChzLmlzU2ltcGxlKSB7XG4gICAgICAgICAgICAgICAgcy5zY2FsZXggPSArcy5zY2FsZXgudG9GaXhlZCg0KTtcbiAgICAgICAgICAgICAgICBzLnNjYWxleSA9ICtzLnNjYWxleS50b0ZpeGVkKDQpO1xuICAgICAgICAgICAgICAgIHMucm90YXRlID0gK3Mucm90YXRlLnRvRml4ZWQoNCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICAocy5keCB8fCBzLmR5ID8gXCJ0XCIgKyBbcy5keCwgcy5keV0gOiBFKSArIFxuICAgICAgICAgICAgICAgICAgICAgICAgKHMuc2NhbGV4ICE9IDEgfHwgcy5zY2FsZXkgIT0gMSA/IFwic1wiICsgW3Muc2NhbGV4LCBzLnNjYWxleSwgMCwgMF0gOiBFKSArXG4gICAgICAgICAgICAgICAgICAgICAgICAocy5yb3RhdGUgPyBcInJcIiArIFtzLnJvdGF0ZSwgMCwgMF0gOiBFKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFwibVwiICsgW3RoaXMuZ2V0KDApLCB0aGlzLmdldCgxKSwgdGhpcy5nZXQoMiksIHRoaXMuZ2V0KDMpLCB0aGlzLmdldCg0KSwgdGhpcy5nZXQoNSldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pKE1hdHJpeC5wcm90b3R5cGUpO1xuXG4gICAgLy8gV2ViS2l0IHJlbmRlcmluZyBidWcgd29ya2Fyb3VuZCBtZXRob2RcbiAgICAvLyBCUk9XU0VSSUZZIE1PRDogZG9uJ3QgYXNzdW1lIG5hdmlnYXRvciBleGlzdHNcbiAgICBpZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgdmFyIHZlcnNpb24gPSBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9WZXJzaW9uXFwvKC4qPylcXHMvKSB8fCBuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC9DaHJvbWVcXC8oXFxkKykvKTtcbiAgICAgICAgaWYgKChuYXZpZ2F0b3IudmVuZG9yID09IFwiQXBwbGUgQ29tcHV0ZXIsIEluYy5cIikgJiYgKHZlcnNpb24gJiYgdmVyc2lvblsxXSA8IDQgfHwgbmF2aWdhdG9yLnBsYXRmb3JtLnNsaWNlKDAsIDIpID09IFwiaVBcIikgfHxcbiAgICAgICAgICAgIChuYXZpZ2F0b3IudmVuZG9yID09IFwiR29vZ2xlIEluYy5cIiAmJiB2ZXJzaW9uICYmIHZlcnNpb25bMV0gPCA4KSkge1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBwYXBlcnByb3RvLnNhZmFyaSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVjdCA9IHRoaXMucmVjdCgtOTksIC05OSwgdGhpcy53aWR0aCArIDk5LCB0aGlzLmhlaWdodCArIDk5KS5hdHRyKHtzdHJva2U6IFwibm9uZVwifSk7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7cmVjdC5yZW1vdmUoKTt9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwYXBlcnByb3RvLnNhZmFyaSA9IGZ1bjtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcGVycHJvdG8uc2FmYXJpID0gZnVuO1xuICAgIH1cbiBcbiAgICB2YXIgcHJldmVudERlZmF1bHQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucmV0dXJuVmFsdWUgPSBmYWxzZTtcbiAgICB9LFxuICAgIHByZXZlbnRUb3VjaCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMub3JpZ2luYWxFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH0sXG4gICAgc3RvcFByb3BhZ2F0aW9uID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmNhbmNlbEJ1YmJsZSA9IHRydWU7XG4gICAgfSxcbiAgICBzdG9wVG91Y2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLm9yaWdpbmFsRXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgfSxcbiAgICBhZGRFdmVudCA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChnLmRvYy5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKG9iaiwgdHlwZSwgZm4sIGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVhbE5hbWUgPSBzdXBwb3J0c1RvdWNoICYmIHRvdWNoTWFwW3R5cGVdID8gdG91Y2hNYXBbdHlwZV0gOiB0eXBlLFxuICAgICAgICAgICAgICAgICAgICBmID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzY3JvbGxZID0gZy5kb2MuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCB8fCBnLmRvYy5ib2R5LnNjcm9sbFRvcCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY3JvbGxYID0gZy5kb2MuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQgfHwgZy5kb2MuYm9keS5zY3JvbGxMZWZ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggPSBlLmNsaWVudFggKyBzY3JvbGxYLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHkgPSBlLmNsaWVudFkgKyBzY3JvbGxZO1xuICAgICAgICAgICAgICAgICAgICBpZiAoc3VwcG9ydHNUb3VjaCAmJiB0b3VjaE1hcFtoYXNdKHR5cGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBlLnRhcmdldFRvdWNoZXMgJiYgZS50YXJnZXRUb3VjaGVzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZS50YXJnZXRUb3VjaGVzW2ldLnRhcmdldCA9PSBvYmopIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIG9sZGUgPSBlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlID0gZS50YXJnZXRUb3VjaGVzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLm9yaWdpbmFsRXZlbnQgPSBvbGRlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0ID0gcHJldmVudFRvdWNoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbiA9IHN0b3BUb3VjaDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmbi5jYWxsKGVsZW1lbnQsIGUsIHgsIHkpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgb2JqLmFkZEV2ZW50TGlzdGVuZXIocmVhbE5hbWUsIGYsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBvYmoucmVtb3ZlRXZlbnRMaXN0ZW5lcihyZWFsTmFtZSwgZiwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmIChnLmRvYy5hdHRhY2hFdmVudCkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChvYmosIHR5cGUsIGZuLCBlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgdmFyIGYgPSBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgICAgICBlID0gZSB8fCBnLndpbi5ldmVudDtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNjcm9sbFkgPSBnLmRvYy5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wIHx8IGcuZG9jLmJvZHkuc2Nyb2xsVG9wLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2Nyb2xsWCA9IGcuZG9jLmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0IHx8IGcuZG9jLmJvZHkuc2Nyb2xsTGVmdCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHggPSBlLmNsaWVudFggKyBzY3JvbGxYLFxuICAgICAgICAgICAgICAgICAgICAgICAgeSA9IGUuY2xpZW50WSArIHNjcm9sbFk7XG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQgPSBlLnByZXZlbnREZWZhdWx0IHx8IHByZXZlbnREZWZhdWx0O1xuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbiA9IGUuc3RvcFByb3BhZ2F0aW9uIHx8IHN0b3BQcm9wYWdhdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZuLmNhbGwoZWxlbWVudCwgZSwgeCwgeSk7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBvYmouYXR0YWNoRXZlbnQoXCJvblwiICsgdHlwZSwgZik7XG4gICAgICAgICAgICAgICAgdmFyIGRldGFjaGVyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBvYmouZGV0YWNoRXZlbnQoXCJvblwiICsgdHlwZSwgZik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgcmV0dXJuIGRldGFjaGVyO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH0pKCksXG4gICAgZHJhZyA9IFtdLFxuICAgIGRyYWdNb3ZlID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgdmFyIHggPSBlLmNsaWVudFgsXG4gICAgICAgICAgICB5ID0gZS5jbGllbnRZLFxuICAgICAgICAgICAgc2Nyb2xsWSA9IGcuZG9jLmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3AgfHwgZy5kb2MuYm9keS5zY3JvbGxUb3AsXG4gICAgICAgICAgICBzY3JvbGxYID0gZy5kb2MuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQgfHwgZy5kb2MuYm9keS5zY3JvbGxMZWZ0LFxuICAgICAgICAgICAgZHJhZ2ksXG4gICAgICAgICAgICBqID0gZHJhZy5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChqLS0pIHtcbiAgICAgICAgICAgIGRyYWdpID0gZHJhZ1tqXTtcbiAgICAgICAgICAgIGlmIChzdXBwb3J0c1RvdWNoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGkgPSBlLnRvdWNoZXMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICB0b3VjaDtcbiAgICAgICAgICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICAgICAgICAgIHRvdWNoID0gZS50b3VjaGVzW2ldO1xuICAgICAgICAgICAgICAgICAgICBpZiAodG91Y2guaWRlbnRpZmllciA9PSBkcmFnaS5lbC5fZHJhZy5pZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgeCA9IHRvdWNoLmNsaWVudFg7XG4gICAgICAgICAgICAgICAgICAgICAgICB5ID0gdG91Y2guY2xpZW50WTtcbiAgICAgICAgICAgICAgICAgICAgICAgIChlLm9yaWdpbmFsRXZlbnQgPyBlLm9yaWdpbmFsRXZlbnQgOiBlKS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBub2RlID0gZHJhZ2kuZWwubm9kZSxcbiAgICAgICAgICAgICAgICBvLFxuICAgICAgICAgICAgICAgIG5leHQgPSBub2RlLm5leHRTaWJsaW5nLFxuICAgICAgICAgICAgICAgIHBhcmVudCA9IG5vZGUucGFyZW50Tm9kZSxcbiAgICAgICAgICAgICAgICBkaXNwbGF5ID0gbm9kZS5zdHlsZS5kaXNwbGF5O1xuICAgICAgICAgICAgZy53aW4ub3BlcmEgJiYgcGFyZW50LnJlbW92ZUNoaWxkKG5vZGUpO1xuICAgICAgICAgICAgbm9kZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgICAgICBvID0gZHJhZ2kuZWwucGFwZXIuZ2V0RWxlbWVudEJ5UG9pbnQoeCwgeSk7XG4gICAgICAgICAgICBub2RlLnN0eWxlLmRpc3BsYXkgPSBkaXNwbGF5O1xuICAgICAgICAgICAgZy53aW4ub3BlcmEgJiYgKG5leHQgPyBwYXJlbnQuaW5zZXJ0QmVmb3JlKG5vZGUsIG5leHQpIDogcGFyZW50LmFwcGVuZENoaWxkKG5vZGUpKTtcbiAgICAgICAgICAgIG8gJiYgZXZlKFwicmFwaGFlbC5kcmFnLm92ZXIuXCIgKyBkcmFnaS5lbC5pZCwgZHJhZ2kuZWwsIG8pO1xuICAgICAgICAgICAgeCArPSBzY3JvbGxYO1xuICAgICAgICAgICAgeSArPSBzY3JvbGxZO1xuICAgICAgICAgICAgZXZlKFwicmFwaGFlbC5kcmFnLm1vdmUuXCIgKyBkcmFnaS5lbC5pZCwgZHJhZ2kubW92ZV9zY29wZSB8fCBkcmFnaS5lbCwgeCAtIGRyYWdpLmVsLl9kcmFnLngsIHkgLSBkcmFnaS5lbC5fZHJhZy55LCB4LCB5LCBlKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZHJhZ1VwID0gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgUi51bm1vdXNlbW92ZShkcmFnTW92ZSkudW5tb3VzZXVwKGRyYWdVcCk7XG4gICAgICAgIHZhciBpID0gZHJhZy5sZW5ndGgsXG4gICAgICAgICAgICBkcmFnaTtcbiAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgZHJhZ2kgPSBkcmFnW2ldO1xuICAgICAgICAgICAgZHJhZ2kuZWwuX2RyYWcgPSB7fTtcbiAgICAgICAgICAgIGV2ZShcInJhcGhhZWwuZHJhZy5lbmQuXCIgKyBkcmFnaS5lbC5pZCwgZHJhZ2kuZW5kX3Njb3BlIHx8IGRyYWdpLnN0YXJ0X3Njb3BlIHx8IGRyYWdpLm1vdmVfc2NvcGUgfHwgZHJhZ2kuZWwsIGUpO1xuICAgICAgICB9XG4gICAgICAgIGRyYWcgPSBbXTtcbiAgICB9LFxuICAgIFxuICAgIGVscHJvdG8gPSBSLmVsID0ge307XG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgXG4gICAgZm9yICh2YXIgaSA9IGV2ZW50cy5sZW5ndGg7IGktLTspIHtcbiAgICAgICAgKGZ1bmN0aW9uIChldmVudE5hbWUpIHtcbiAgICAgICAgICAgIFJbZXZlbnROYW1lXSA9IGVscHJvdG9bZXZlbnROYW1lXSA9IGZ1bmN0aW9uIChmbiwgc2NvcGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoUi5pcyhmbiwgXCJmdW5jdGlvblwiKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cyA9IHRoaXMuZXZlbnRzIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmV2ZW50cy5wdXNoKHtuYW1lOiBldmVudE5hbWUsIGY6IGZuLCB1bmJpbmQ6IGFkZEV2ZW50KHRoaXMuc2hhcGUgfHwgdGhpcy5ub2RlIHx8IGcuZG9jLCBldmVudE5hbWUsIGZuLCBzY29wZSB8fCB0aGlzKX0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBSW1widW5cIiArIGV2ZW50TmFtZV0gPSBlbHByb3RvW1widW5cIiArIGV2ZW50TmFtZV0gPSBmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICB2YXIgZXZlbnRzID0gdGhpcy5ldmVudHMgfHwgW10sXG4gICAgICAgICAgICAgICAgICAgIGwgPSBldmVudHMubGVuZ3RoO1xuICAgICAgICAgICAgICAgIHdoaWxlIChsLS0pIGlmIChldmVudHNbbF0ubmFtZSA9PSBldmVudE5hbWUgJiYgZXZlbnRzW2xdLmYgPT0gZm4pIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnRzW2xdLnVuYmluZCgpO1xuICAgICAgICAgICAgICAgICAgICBldmVudHMuc3BsaWNlKGwsIDEpO1xuICAgICAgICAgICAgICAgICAgICAhZXZlbnRzLmxlbmd0aCAmJiBkZWxldGUgdGhpcy5ldmVudHM7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pKGV2ZW50c1tpXSk7XG4gICAgfVxuICAgIFxuICAgIFxuICAgIGVscHJvdG8uZGF0YSA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gICAgICAgIHZhciBkYXRhID0gZWxkYXRhW3RoaXMuaWRdID0gZWxkYXRhW3RoaXMuaWRdIHx8IHt9O1xuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICBpZiAoUi5pcyhrZXksIFwib2JqZWN0XCIpKSB7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBrZXkpIGlmIChrZXlbaGFzXShpKSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhdGEoaSwga2V5W2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBldmUoXCJyYXBoYWVsLmRhdGEuZ2V0LlwiICsgdGhpcy5pZCwgdGhpcywgZGF0YVtrZXldLCBrZXkpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGFba2V5XTtcbiAgICAgICAgfVxuICAgICAgICBkYXRhW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgZXZlKFwicmFwaGFlbC5kYXRhLnNldC5cIiArIHRoaXMuaWQsIHRoaXMsIHZhbHVlLCBrZXkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFxuICAgIGVscHJvdG8ucmVtb3ZlRGF0YSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgaWYgKGtleSA9PSBudWxsKSB7XG4gICAgICAgICAgICBlbGRhdGFbdGhpcy5pZF0gPSB7fTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsZGF0YVt0aGlzLmlkXSAmJiBkZWxldGUgZWxkYXRhW3RoaXMuaWRdW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLmhvdmVyID0gZnVuY3Rpb24gKGZfaW4sIGZfb3V0LCBzY29wZV9pbiwgc2NvcGVfb3V0KSB7XG4gICAgICAgIHJldHVybiB0aGlzLm1vdXNlb3ZlcihmX2luLCBzY29wZV9pbikubW91c2VvdXQoZl9vdXQsIHNjb3BlX291dCB8fCBzY29wZV9pbik7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLnVuaG92ZXIgPSBmdW5jdGlvbiAoZl9pbiwgZl9vdXQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMudW5tb3VzZW92ZXIoZl9pbikudW5tb3VzZW91dChmX291dCk7XG4gICAgfTtcbiAgICB2YXIgZHJhZ2dhYmxlID0gW107XG4gICAgXG4gICAgZWxwcm90by5kcmFnID0gZnVuY3Rpb24gKG9ubW92ZSwgb25zdGFydCwgb25lbmQsIG1vdmVfc2NvcGUsIHN0YXJ0X3Njb3BlLCBlbmRfc2NvcGUpIHtcbiAgICAgICAgZnVuY3Rpb24gc3RhcnQoZSkge1xuICAgICAgICAgICAgKGUub3JpZ2luYWxFdmVudCB8fCBlKS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgdmFyIHNjcm9sbFkgPSBnLmRvYy5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wIHx8IGcuZG9jLmJvZHkuc2Nyb2xsVG9wLFxuICAgICAgICAgICAgICAgIHNjcm9sbFggPSBnLmRvYy5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdCB8fCBnLmRvYy5ib2R5LnNjcm9sbExlZnQ7XG4gICAgICAgICAgICB0aGlzLl9kcmFnLnggPSBlLmNsaWVudFggKyBzY3JvbGxYO1xuICAgICAgICAgICAgdGhpcy5fZHJhZy55ID0gZS5jbGllbnRZICsgc2Nyb2xsWTtcbiAgICAgICAgICAgIHRoaXMuX2RyYWcuaWQgPSBlLmlkZW50aWZpZXI7XG4gICAgICAgICAgICAhZHJhZy5sZW5ndGggJiYgUi5tb3VzZW1vdmUoZHJhZ01vdmUpLm1vdXNldXAoZHJhZ1VwKTtcbiAgICAgICAgICAgIGRyYWcucHVzaCh7ZWw6IHRoaXMsIG1vdmVfc2NvcGU6IG1vdmVfc2NvcGUsIHN0YXJ0X3Njb3BlOiBzdGFydF9zY29wZSwgZW5kX3Njb3BlOiBlbmRfc2NvcGV9KTtcbiAgICAgICAgICAgIG9uc3RhcnQgJiYgZXZlLm9uKFwicmFwaGFlbC5kcmFnLnN0YXJ0LlwiICsgdGhpcy5pZCwgb25zdGFydCk7XG4gICAgICAgICAgICBvbm1vdmUgJiYgZXZlLm9uKFwicmFwaGFlbC5kcmFnLm1vdmUuXCIgKyB0aGlzLmlkLCBvbm1vdmUpO1xuICAgICAgICAgICAgb25lbmQgJiYgZXZlLm9uKFwicmFwaGFlbC5kcmFnLmVuZC5cIiArIHRoaXMuaWQsIG9uZW5kKTtcbiAgICAgICAgICAgIGV2ZShcInJhcGhhZWwuZHJhZy5zdGFydC5cIiArIHRoaXMuaWQsIHN0YXJ0X3Njb3BlIHx8IG1vdmVfc2NvcGUgfHwgdGhpcywgZS5jbGllbnRYICsgc2Nyb2xsWCwgZS5jbGllbnRZICsgc2Nyb2xsWSwgZSk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fZHJhZyA9IHt9O1xuICAgICAgICBkcmFnZ2FibGUucHVzaCh7ZWw6IHRoaXMsIHN0YXJ0OiBzdGFydH0pO1xuICAgICAgICB0aGlzLm1vdXNlZG93bihzdGFydCk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgZWxwcm90by5vbkRyYWdPdmVyID0gZnVuY3Rpb24gKGYpIHtcbiAgICAgICAgZiA/IGV2ZS5vbihcInJhcGhhZWwuZHJhZy5vdmVyLlwiICsgdGhpcy5pZCwgZikgOiBldmUudW5iaW5kKFwicmFwaGFlbC5kcmFnLm92ZXIuXCIgKyB0aGlzLmlkKTtcbiAgICB9O1xuICAgIFxuICAgIGVscHJvdG8udW5kcmFnID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgaSA9IGRyYWdnYWJsZS5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChpLS0pIGlmIChkcmFnZ2FibGVbaV0uZWwgPT0gdGhpcykge1xuICAgICAgICAgICAgdGhpcy51bm1vdXNlZG93bihkcmFnZ2FibGVbaV0uc3RhcnQpO1xuICAgICAgICAgICAgZHJhZ2dhYmxlLnNwbGljZShpLCAxKTtcbiAgICAgICAgICAgIGV2ZS51bmJpbmQoXCJyYXBoYWVsLmRyYWcuKi5cIiArIHRoaXMuaWQpO1xuICAgICAgICB9XG4gICAgICAgICFkcmFnZ2FibGUubGVuZ3RoICYmIFIudW5tb3VzZW1vdmUoZHJhZ01vdmUpLnVubW91c2V1cChkcmFnVXApO1xuICAgIH07XG4gICAgXG4gICAgcGFwZXJwcm90by5jaXJjbGUgPSBmdW5jdGlvbiAoeCwgeSwgcikge1xuICAgICAgICB2YXIgb3V0ID0gUi5fZW5naW5lLmNpcmNsZSh0aGlzLCB4IHx8IDAsIHkgfHwgMCwgciB8fCAwKTtcbiAgICAgICAgdGhpcy5fX3NldF9fICYmIHRoaXMuX19zZXRfXy5wdXNoKG91dCk7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfTtcbiAgICBcbiAgICBwYXBlcnByb3RvLnJlY3QgPSBmdW5jdGlvbiAoeCwgeSwgdywgaCwgcikge1xuICAgICAgICB2YXIgb3V0ID0gUi5fZW5naW5lLnJlY3QodGhpcywgeCB8fCAwLCB5IHx8IDAsIHcgfHwgMCwgaCB8fCAwLCByIHx8IDApO1xuICAgICAgICB0aGlzLl9fc2V0X18gJiYgdGhpcy5fX3NldF9fLnB1c2gob3V0KTtcbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9O1xuICAgIFxuICAgIHBhcGVycHJvdG8uZWxsaXBzZSA9IGZ1bmN0aW9uICh4LCB5LCByeCwgcnkpIHtcbiAgICAgICAgdmFyIG91dCA9IFIuX2VuZ2luZS5lbGxpcHNlKHRoaXMsIHggfHwgMCwgeSB8fCAwLCByeCB8fCAwLCByeSB8fCAwKTtcbiAgICAgICAgdGhpcy5fX3NldF9fICYmIHRoaXMuX19zZXRfXy5wdXNoKG91dCk7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfTtcbiAgICBcbiAgICBwYXBlcnByb3RvLnBhdGggPSBmdW5jdGlvbiAocGF0aFN0cmluZykge1xuICAgICAgICBwYXRoU3RyaW5nICYmICFSLmlzKHBhdGhTdHJpbmcsIHN0cmluZykgJiYgIVIuaXMocGF0aFN0cmluZ1swXSwgYXJyYXkpICYmIChwYXRoU3RyaW5nICs9IEUpO1xuICAgICAgICB2YXIgb3V0ID0gUi5fZW5naW5lLnBhdGgoUi5mb3JtYXRbYXBwbHldKFIsIGFyZ3VtZW50cyksIHRoaXMpO1xuICAgICAgICB0aGlzLl9fc2V0X18gJiYgdGhpcy5fX3NldF9fLnB1c2gob3V0KTtcbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9O1xuICAgIFxuICAgIHBhcGVycHJvdG8uaW1hZ2UgPSBmdW5jdGlvbiAoc3JjLCB4LCB5LCB3LCBoKSB7XG4gICAgICAgIHZhciBvdXQgPSBSLl9lbmdpbmUuaW1hZ2UodGhpcywgc3JjIHx8IFwiYWJvdXQ6YmxhbmtcIiwgeCB8fCAwLCB5IHx8IDAsIHcgfHwgMCwgaCB8fCAwKTtcbiAgICAgICAgdGhpcy5fX3NldF9fICYmIHRoaXMuX19zZXRfXy5wdXNoKG91dCk7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfTtcbiAgICBcbiAgICBwYXBlcnByb3RvLnRleHQgPSBmdW5jdGlvbiAoeCwgeSwgdGV4dCkge1xuICAgICAgICB2YXIgb3V0ID0gUi5fZW5naW5lLnRleHQodGhpcywgeCB8fCAwLCB5IHx8IDAsIFN0cih0ZXh0KSk7XG4gICAgICAgIHRoaXMuX19zZXRfXyAmJiB0aGlzLl9fc2V0X18ucHVzaChvdXQpO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG4gICAgXG4gICAgcGFwZXJwcm90by5zZXQgPSBmdW5jdGlvbiAoaXRlbXNBcnJheSkge1xuICAgICAgICAhUi5pcyhpdGVtc0FycmF5LCBcImFycmF5XCIpICYmIChpdGVtc0FycmF5ID0gQXJyYXkucHJvdG90eXBlLnNwbGljZS5jYWxsKGFyZ3VtZW50cywgMCwgYXJndW1lbnRzLmxlbmd0aCkpO1xuICAgICAgICB2YXIgb3V0ID0gbmV3IFNldChpdGVtc0FycmF5KTtcbiAgICAgICAgdGhpcy5fX3NldF9fICYmIHRoaXMuX19zZXRfXy5wdXNoKG91dCk7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfTtcbiAgICBcbiAgICBwYXBlcnByb3RvLnNldFN0YXJ0ID0gZnVuY3Rpb24gKHNldCkge1xuICAgICAgICB0aGlzLl9fc2V0X18gPSBzZXQgfHwgdGhpcy5zZXQoKTtcbiAgICB9O1xuICAgIFxuICAgIHBhcGVycHJvdG8uc2V0RmluaXNoID0gZnVuY3Rpb24gKHNldCkge1xuICAgICAgICB2YXIgb3V0ID0gdGhpcy5fX3NldF9fO1xuICAgICAgICBkZWxldGUgdGhpcy5fX3NldF9fO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG4gICAgXG4gICAgcGFwZXJwcm90by5zZXRTaXplID0gZnVuY3Rpb24gKHdpZHRoLCBoZWlnaHQpIHtcbiAgICAgICAgcmV0dXJuIFIuX2VuZ2luZS5zZXRTaXplLmNhbGwodGhpcywgd2lkdGgsIGhlaWdodCk7XG4gICAgfTtcbiAgICBcbiAgICBwYXBlcnByb3RvLnNldFZpZXdCb3ggPSBmdW5jdGlvbiAoeCwgeSwgdywgaCwgZml0KSB7XG4gICAgICAgIHJldHVybiBSLl9lbmdpbmUuc2V0Vmlld0JveC5jYWxsKHRoaXMsIHgsIHksIHcsIGgsIGZpdCk7XG4gICAgfTtcbiAgICBcbiAgICBcbiAgICBwYXBlcnByb3RvLnRvcCA9IHBhcGVycHJvdG8uYm90dG9tID0gbnVsbDtcbiAgICBcbiAgICBwYXBlcnByb3RvLnJhcGhhZWwgPSBSO1xuICAgIHZhciBnZXRPZmZzZXQgPSBmdW5jdGlvbiAoZWxlbSkge1xuICAgICAgICB2YXIgYm94ID0gZWxlbS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSxcbiAgICAgICAgICAgIGRvYyA9IGVsZW0ub3duZXJEb2N1bWVudCxcbiAgICAgICAgICAgIGJvZHkgPSBkb2MuYm9keSxcbiAgICAgICAgICAgIGRvY0VsZW0gPSBkb2MuZG9jdW1lbnRFbGVtZW50LFxuICAgICAgICAgICAgY2xpZW50VG9wID0gZG9jRWxlbS5jbGllbnRUb3AgfHwgYm9keS5jbGllbnRUb3AgfHwgMCwgY2xpZW50TGVmdCA9IGRvY0VsZW0uY2xpZW50TGVmdCB8fCBib2R5LmNsaWVudExlZnQgfHwgMCxcbiAgICAgICAgICAgIHRvcCAgPSBib3gudG9wICArIChnLndpbi5wYWdlWU9mZnNldCB8fCBkb2NFbGVtLnNjcm9sbFRvcCB8fCBib2R5LnNjcm9sbFRvcCApIC0gY2xpZW50VG9wLFxuICAgICAgICAgICAgbGVmdCA9IGJveC5sZWZ0ICsgKGcud2luLnBhZ2VYT2Zmc2V0IHx8IGRvY0VsZW0uc2Nyb2xsTGVmdCB8fCBib2R5LnNjcm9sbExlZnQpIC0gY2xpZW50TGVmdDtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHk6IHRvcCxcbiAgICAgICAgICAgIHg6IGxlZnRcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIFxuICAgIHBhcGVycHJvdG8uZ2V0RWxlbWVudEJ5UG9pbnQgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgICAgICB2YXIgcGFwZXIgPSB0aGlzLFxuICAgICAgICAgICAgc3ZnID0gcGFwZXIuY2FudmFzLFxuICAgICAgICAgICAgdGFyZ2V0ID0gZy5kb2MuZWxlbWVudEZyb21Qb2ludCh4LCB5KTtcbiAgICAgICAgaWYgKGcud2luLm9wZXJhICYmIHRhcmdldC50YWdOYW1lID09IFwic3ZnXCIpIHtcbiAgICAgICAgICAgIHZhciBzbyA9IGdldE9mZnNldChzdmcpLFxuICAgICAgICAgICAgICAgIHNyID0gc3ZnLmNyZWF0ZVNWR1JlY3QoKTtcbiAgICAgICAgICAgIHNyLnggPSB4IC0gc28ueDtcbiAgICAgICAgICAgIHNyLnkgPSB5IC0gc28ueTtcbiAgICAgICAgICAgIHNyLndpZHRoID0gc3IuaGVpZ2h0ID0gMTtcbiAgICAgICAgICAgIHZhciBoaXRzID0gc3ZnLmdldEludGVyc2VjdGlvbkxpc3Qoc3IsIG51bGwpO1xuICAgICAgICAgICAgaWYgKGhpdHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0ID0gaGl0c1toaXRzLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmICghdGFyZ2V0KSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB3aGlsZSAodGFyZ2V0LnBhcmVudE5vZGUgJiYgdGFyZ2V0ICE9IHN2Zy5wYXJlbnROb2RlICYmICF0YXJnZXQucmFwaGFlbCkge1xuICAgICAgICAgICAgdGFyZ2V0ID0gdGFyZ2V0LnBhcmVudE5vZGU7XG4gICAgICAgIH1cbiAgICAgICAgdGFyZ2V0ID09IHBhcGVyLmNhbnZhcy5wYXJlbnROb2RlICYmICh0YXJnZXQgPSBzdmcpO1xuICAgICAgICB0YXJnZXQgPSB0YXJnZXQgJiYgdGFyZ2V0LnJhcGhhZWwgPyBwYXBlci5nZXRCeUlkKHRhcmdldC5yYXBoYWVsaWQpIDogbnVsbDtcbiAgICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9O1xuICAgIFxuICAgIHBhcGVycHJvdG8uZ2V0QnlJZCA9IGZ1bmN0aW9uIChpZCkge1xuICAgICAgICB2YXIgYm90ID0gdGhpcy5ib3R0b207XG4gICAgICAgIHdoaWxlIChib3QpIHtcbiAgICAgICAgICAgIGlmIChib3QuaWQgPT0gaWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYm90O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYm90ID0gYm90Lm5leHQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfTtcbiAgICBcbiAgICBwYXBlcnByb3RvLmZvckVhY2ggPSBmdW5jdGlvbiAoY2FsbGJhY2ssIHRoaXNBcmcpIHtcbiAgICAgICAgdmFyIGJvdCA9IHRoaXMuYm90dG9tO1xuICAgICAgICB3aGlsZSAoYm90KSB7XG4gICAgICAgICAgICBpZiAoY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBib3QpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYm90ID0gYm90Lm5leHQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICBwYXBlcnByb3RvLmdldEVsZW1lbnRzQnlQb2ludCA9IGZ1bmN0aW9uICh4LCB5KSB7XG4gICAgICAgIHZhciBzZXQgPSB0aGlzLnNldCgpO1xuICAgICAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgICAgICBpZiAoZWwuaXNQb2ludEluc2lkZSh4LCB5KSkge1xuICAgICAgICAgICAgICAgIHNldC5wdXNoKGVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBzZXQ7XG4gICAgfTtcbiAgICBmdW5jdGlvbiB4X3koKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnggKyBTICsgdGhpcy55O1xuICAgIH1cbiAgICBmdW5jdGlvbiB4X3lfd19oKCkge1xuICAgICAgICByZXR1cm4gdGhpcy54ICsgUyArIHRoaXMueSArIFMgKyB0aGlzLndpZHRoICsgXCIgXFx4ZDcgXCIgKyB0aGlzLmhlaWdodDtcbiAgICB9XG4gICAgXG4gICAgZWxwcm90by5pc1BvaW50SW5zaWRlID0gZnVuY3Rpb24gKHgsIHkpIHtcbiAgICAgICAgdmFyIHJwID0gdGhpcy5yZWFsUGF0aCA9IHRoaXMucmVhbFBhdGggfHwgZ2V0UGF0aFt0aGlzLnR5cGVdKHRoaXMpO1xuICAgICAgICByZXR1cm4gUi5pc1BvaW50SW5zaWRlUGF0aChycCwgeCwgeSk7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLmdldEJCb3ggPSBmdW5jdGlvbiAoaXNXaXRob3V0VHJhbnNmb3JtKSB7XG4gICAgICAgIGlmICh0aGlzLnJlbW92ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB7fTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgXyA9IHRoaXMuXztcbiAgICAgICAgaWYgKGlzV2l0aG91dFRyYW5zZm9ybSkge1xuICAgICAgICAgICAgaWYgKF8uZGlydHkgfHwgIV8uYmJveHd0KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5yZWFsUGF0aCA9IGdldFBhdGhbdGhpcy50eXBlXSh0aGlzKTtcbiAgICAgICAgICAgICAgICBfLmJib3h3dCA9IHBhdGhEaW1lbnNpb25zKHRoaXMucmVhbFBhdGgpO1xuICAgICAgICAgICAgICAgIF8uYmJveHd0LnRvU3RyaW5nID0geF95X3dfaDtcbiAgICAgICAgICAgICAgICBfLmRpcnR5ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBfLmJib3h3dDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoXy5kaXJ0eSB8fCBfLmRpcnR5VCB8fCAhXy5iYm94KSB7XG4gICAgICAgICAgICBpZiAoXy5kaXJ0eSB8fCAhdGhpcy5yZWFsUGF0aCkge1xuICAgICAgICAgICAgICAgIF8uYmJveHd0ID0gMDtcbiAgICAgICAgICAgICAgICB0aGlzLnJlYWxQYXRoID0gZ2V0UGF0aFt0aGlzLnR5cGVdKHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXy5iYm94ID0gcGF0aERpbWVuc2lvbnMobWFwUGF0aCh0aGlzLnJlYWxQYXRoLCB0aGlzLm1hdHJpeCkpO1xuICAgICAgICAgICAgXy5iYm94LnRvU3RyaW5nID0geF95X3dfaDtcbiAgICAgICAgICAgIF8uZGlydHkgPSBfLmRpcnR5VCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIF8uYmJveDtcbiAgICB9O1xuICAgIFxuICAgIGVscHJvdG8uY2xvbmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLnJlbW92ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHZhciBvdXQgPSB0aGlzLnBhcGVyW3RoaXMudHlwZV0oKS5hdHRyKHRoaXMuYXR0cigpKTtcbiAgICAgICAgdGhpcy5fX3NldF9fICYmIHRoaXMuX19zZXRfXy5wdXNoKG91dCk7XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLmdsb3cgPSBmdW5jdGlvbiAoZ2xvdykge1xuICAgICAgICBpZiAodGhpcy50eXBlID09IFwidGV4dFwiKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBnbG93ID0gZ2xvdyB8fCB7fTtcbiAgICAgICAgdmFyIHMgPSB7XG4gICAgICAgICAgICB3aWR0aDogKGdsb3cud2lkdGggfHwgMTApICsgKCt0aGlzLmF0dHIoXCJzdHJva2Utd2lkdGhcIikgfHwgMSksXG4gICAgICAgICAgICBmaWxsOiBnbG93LmZpbGwgfHwgZmFsc2UsXG4gICAgICAgICAgICBvcGFjaXR5OiBnbG93Lm9wYWNpdHkgfHwgLjUsXG4gICAgICAgICAgICBvZmZzZXR4OiBnbG93Lm9mZnNldHggfHwgMCxcbiAgICAgICAgICAgIG9mZnNldHk6IGdsb3cub2Zmc2V0eSB8fCAwLFxuICAgICAgICAgICAgY29sb3I6IGdsb3cuY29sb3IgfHwgXCIjMDAwXCJcbiAgICAgICAgfSxcbiAgICAgICAgICAgIGMgPSBzLndpZHRoIC8gMixcbiAgICAgICAgICAgIHIgPSB0aGlzLnBhcGVyLFxuICAgICAgICAgICAgb3V0ID0gci5zZXQoKSxcbiAgICAgICAgICAgIHBhdGggPSB0aGlzLnJlYWxQYXRoIHx8IGdldFBhdGhbdGhpcy50eXBlXSh0aGlzKTtcbiAgICAgICAgcGF0aCA9IHRoaXMubWF0cml4ID8gbWFwUGF0aChwYXRoLCB0aGlzLm1hdHJpeCkgOiBwYXRoO1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGMgKyAxOyBpKyspIHtcbiAgICAgICAgICAgIG91dC5wdXNoKHIucGF0aChwYXRoKS5hdHRyKHtcbiAgICAgICAgICAgICAgICBzdHJva2U6IHMuY29sb3IsXG4gICAgICAgICAgICAgICAgZmlsbDogcy5maWxsID8gcy5jb2xvciA6IFwibm9uZVwiLFxuICAgICAgICAgICAgICAgIFwic3Ryb2tlLWxpbmVqb2luXCI6IFwicm91bmRcIixcbiAgICAgICAgICAgICAgICBcInN0cm9rZS1saW5lY2FwXCI6IFwicm91bmRcIixcbiAgICAgICAgICAgICAgICBcInN0cm9rZS13aWR0aFwiOiArKHMud2lkdGggLyBjICogaSkudG9GaXhlZCgzKSxcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiArKHMub3BhY2l0eSAvIGMpLnRvRml4ZWQoMylcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0Lmluc2VydEJlZm9yZSh0aGlzKS50cmFuc2xhdGUocy5vZmZzZXR4LCBzLm9mZnNldHkpO1xuICAgIH07XG4gICAgdmFyIGN1cnZlc2xlbmd0aHMgPSB7fSxcbiAgICBnZXRQb2ludEF0U2VnbWVudExlbmd0aCA9IGZ1bmN0aW9uIChwMXgsIHAxeSwgYzF4LCBjMXksIGMyeCwgYzJ5LCBwMngsIHAyeSwgbGVuZ3RoKSB7XG4gICAgICAgIGlmIChsZW5ndGggPT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIGJlemxlbihwMXgsIHAxeSwgYzF4LCBjMXksIGMyeCwgYzJ5LCBwMngsIHAyeSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gUi5maW5kRG90c0F0U2VnbWVudChwMXgsIHAxeSwgYzF4LCBjMXksIGMyeCwgYzJ5LCBwMngsIHAyeSwgZ2V0VGF0TGVuKHAxeCwgcDF5LCBjMXgsIGMxeSwgYzJ4LCBjMnksIHAyeCwgcDJ5LCBsZW5ndGgpKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgZ2V0TGVuZ3RoRmFjdG9yeSA9IGZ1bmN0aW9uIChpc3RvdGFsLCBzdWJwYXRoKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAocGF0aCwgbGVuZ3RoLCBvbmx5c3RhcnQpIHtcbiAgICAgICAgICAgIHBhdGggPSBwYXRoMmN1cnZlKHBhdGgpO1xuICAgICAgICAgICAgdmFyIHgsIHksIHAsIGwsIHNwID0gXCJcIiwgc3VicGF0aHMgPSB7fSwgcG9pbnQsXG4gICAgICAgICAgICAgICAgbGVuID0gMDtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IHBhdGgubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIHAgPSBwYXRoW2ldO1xuICAgICAgICAgICAgICAgIGlmIChwWzBdID09IFwiTVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIHggPSArcFsxXTtcbiAgICAgICAgICAgICAgICAgICAgeSA9ICtwWzJdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGwgPSBnZXRQb2ludEF0U2VnbWVudExlbmd0aCh4LCB5LCBwWzFdLCBwWzJdLCBwWzNdLCBwWzRdLCBwWzVdLCBwWzZdKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxlbiArIGwgPiBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdWJwYXRoICYmICFzdWJwYXRocy5zdGFydCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvaW50ID0gZ2V0UG9pbnRBdFNlZ21lbnRMZW5ndGgoeCwgeSwgcFsxXSwgcFsyXSwgcFszXSwgcFs0XSwgcFs1XSwgcFs2XSwgbGVuZ3RoIC0gbGVuKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcCArPSBbXCJDXCIgKyBwb2ludC5zdGFydC54LCBwb2ludC5zdGFydC55LCBwb2ludC5tLngsIHBvaW50Lm0ueSwgcG9pbnQueCwgcG9pbnQueV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9ubHlzdGFydCkge3JldHVybiBzcDt9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VicGF0aHMuc3RhcnQgPSBzcDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcCA9IFtcIk1cIiArIHBvaW50LngsIHBvaW50LnkgKyBcIkNcIiArIHBvaW50Lm4ueCwgcG9pbnQubi55LCBwb2ludC5lbmQueCwgcG9pbnQuZW5kLnksIHBbNV0sIHBbNl1dLmpvaW4oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZW4gKz0gbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ID0gK3BbNV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeSA9ICtwWzZdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc3RvdGFsICYmICFzdWJwYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9pbnQgPSBnZXRQb2ludEF0U2VnbWVudExlbmd0aCh4LCB5LCBwWzFdLCBwWzJdLCBwWzNdLCBwWzRdLCBwWzVdLCBwWzZdLCBsZW5ndGggLSBsZW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7eDogcG9pbnQueCwgeTogcG9pbnQueSwgYWxwaGE6IHBvaW50LmFscGhhfTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBsZW4gKz0gbDtcbiAgICAgICAgICAgICAgICAgICAgeCA9ICtwWzVdO1xuICAgICAgICAgICAgICAgICAgICB5ID0gK3BbNl07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNwICs9IHAuc2hpZnQoKSArIHA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBzdWJwYXRocy5lbmQgPSBzcDtcbiAgICAgICAgICAgIHBvaW50ID0gaXN0b3RhbCA/IGxlbiA6IHN1YnBhdGggPyBzdWJwYXRocyA6IFIuZmluZERvdHNBdFNlZ21lbnQoeCwgeSwgcFswXSwgcFsxXSwgcFsyXSwgcFszXSwgcFs0XSwgcFs1XSwgMSk7XG4gICAgICAgICAgICBwb2ludC5hbHBoYSAmJiAocG9pbnQgPSB7eDogcG9pbnQueCwgeTogcG9pbnQueSwgYWxwaGE6IHBvaW50LmFscGhhfSk7XG4gICAgICAgICAgICByZXR1cm4gcG9pbnQ7XG4gICAgICAgIH07XG4gICAgfTtcbiAgICB2YXIgZ2V0VG90YWxMZW5ndGggPSBnZXRMZW5ndGhGYWN0b3J5KDEpLFxuICAgICAgICBnZXRQb2ludEF0TGVuZ3RoID0gZ2V0TGVuZ3RoRmFjdG9yeSgpLFxuICAgICAgICBnZXRTdWJwYXRoc0F0TGVuZ3RoID0gZ2V0TGVuZ3RoRmFjdG9yeSgwLCAxKTtcbiAgICBcbiAgICBSLmdldFRvdGFsTGVuZ3RoID0gZ2V0VG90YWxMZW5ndGg7XG4gICAgXG4gICAgUi5nZXRQb2ludEF0TGVuZ3RoID0gZ2V0UG9pbnRBdExlbmd0aDtcbiAgICBcbiAgICBSLmdldFN1YnBhdGggPSBmdW5jdGlvbiAocGF0aCwgZnJvbSwgdG8pIHtcbiAgICAgICAgaWYgKHRoaXMuZ2V0VG90YWxMZW5ndGgocGF0aCkgLSB0byA8IDFlLTYpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRTdWJwYXRoc0F0TGVuZ3RoKHBhdGgsIGZyb20pLmVuZDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYSA9IGdldFN1YnBhdGhzQXRMZW5ndGgocGF0aCwgdG8sIDEpO1xuICAgICAgICByZXR1cm4gZnJvbSA/IGdldFN1YnBhdGhzQXRMZW5ndGgoYSwgZnJvbSkuZW5kIDogYTtcbiAgICB9O1xuICAgIFxuICAgIGVscHJvdG8uZ2V0VG90YWxMZW5ndGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT0gXCJwYXRoXCIpIHtyZXR1cm47fVxuICAgICAgICBpZiAodGhpcy5ub2RlLmdldFRvdGFsTGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5ub2RlLmdldFRvdGFsTGVuZ3RoKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGdldFRvdGFsTGVuZ3RoKHRoaXMuYXR0cnMucGF0aCk7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLmdldFBvaW50QXRMZW5ndGggPSBmdW5jdGlvbiAobGVuZ3RoKSB7XG4gICAgICAgIGlmICh0aGlzLnR5cGUgIT0gXCJwYXRoXCIpIHtyZXR1cm47fVxuICAgICAgICByZXR1cm4gZ2V0UG9pbnRBdExlbmd0aCh0aGlzLmF0dHJzLnBhdGgsIGxlbmd0aCk7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLmdldFN1YnBhdGggPSBmdW5jdGlvbiAoZnJvbSwgdG8pIHtcbiAgICAgICAgaWYgKHRoaXMudHlwZSAhPSBcInBhdGhcIikge3JldHVybjt9XG4gICAgICAgIHJldHVybiBSLmdldFN1YnBhdGgodGhpcy5hdHRycy5wYXRoLCBmcm9tLCB0byk7XG4gICAgfTtcbiAgICBcbiAgICB2YXIgZWYgPSBSLmVhc2luZ19mb3JtdWxhcyA9IHtcbiAgICAgICAgbGluZWFyOiBmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgIH0sXG4gICAgICAgIFwiPFwiOiBmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgcmV0dXJuIHBvdyhuLCAxLjcpO1xuICAgICAgICB9LFxuICAgICAgICBcIj5cIjogZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgIHJldHVybiBwb3cobiwgLjQ4KTtcbiAgICAgICAgfSxcbiAgICAgICAgXCI8PlwiOiBmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgdmFyIHEgPSAuNDggLSBuIC8gMS4wNCxcbiAgICAgICAgICAgICAgICBRID0gbWF0aC5zcXJ0KC4xNzM0ICsgcSAqIHEpLFxuICAgICAgICAgICAgICAgIHggPSBRIC0gcSxcbiAgICAgICAgICAgICAgICBYID0gcG93KGFicyh4KSwgMSAvIDMpICogKHggPCAwID8gLTEgOiAxKSxcbiAgICAgICAgICAgICAgICB5ID0gLVEgLSBxLFxuICAgICAgICAgICAgICAgIFkgPSBwb3coYWJzKHkpLCAxIC8gMykgKiAoeSA8IDAgPyAtMSA6IDEpLFxuICAgICAgICAgICAgICAgIHQgPSBYICsgWSArIC41O1xuICAgICAgICAgICAgcmV0dXJuICgxIC0gdCkgKiAzICogdCAqIHQgKyB0ICogdCAqIHQ7XG4gICAgICAgIH0sXG4gICAgICAgIGJhY2tJbjogZnVuY3Rpb24gKG4pIHtcbiAgICAgICAgICAgIHZhciBzID0gMS43MDE1ODtcbiAgICAgICAgICAgIHJldHVybiBuICogbiAqICgocyArIDEpICogbiAtIHMpO1xuICAgICAgICB9LFxuICAgICAgICBiYWNrT3V0OiBmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgbiA9IG4gLSAxO1xuICAgICAgICAgICAgdmFyIHMgPSAxLjcwMTU4O1xuICAgICAgICAgICAgcmV0dXJuIG4gKiBuICogKChzICsgMSkgKiBuICsgcykgKyAxO1xuICAgICAgICB9LFxuICAgICAgICBlbGFzdGljOiBmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgaWYgKG4gPT0gISFuKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcG93KDIsIC0xMCAqIG4pICogbWF0aC5zaW4oKG4gLSAuMDc1KSAqICgyICogUEkpIC8gLjMpICsgMTtcbiAgICAgICAgfSxcbiAgICAgICAgYm91bmNlOiBmdW5jdGlvbiAobikge1xuICAgICAgICAgICAgdmFyIHMgPSA3LjU2MjUsXG4gICAgICAgICAgICAgICAgcCA9IDIuNzUsXG4gICAgICAgICAgICAgICAgbDtcbiAgICAgICAgICAgIGlmIChuIDwgKDEgLyBwKSkge1xuICAgICAgICAgICAgICAgIGwgPSBzICogbiAqIG47XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChuIDwgKDIgLyBwKSkge1xuICAgICAgICAgICAgICAgICAgICBuIC09ICgxLjUgLyBwKTtcbiAgICAgICAgICAgICAgICAgICAgbCA9IHMgKiBuICogbiArIC43NTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAobiA8ICgyLjUgLyBwKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbiAtPSAoMi4yNSAvIHApO1xuICAgICAgICAgICAgICAgICAgICAgICAgbCA9IHMgKiBuICogbiArIC45Mzc1O1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgbiAtPSAoMi42MjUgLyBwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGwgPSBzICogbiAqIG4gKyAuOTg0Mzc1O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGw7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIGVmLmVhc2VJbiA9IGVmW1wiZWFzZS1pblwiXSA9IGVmW1wiPFwiXTtcbiAgICBlZi5lYXNlT3V0ID0gZWZbXCJlYXNlLW91dFwiXSA9IGVmW1wiPlwiXTtcbiAgICBlZi5lYXNlSW5PdXQgPSBlZltcImVhc2UtaW4tb3V0XCJdID0gZWZbXCI8PlwiXTtcbiAgICBlZltcImJhY2staW5cIl0gPSBlZi5iYWNrSW47XG4gICAgZWZbXCJiYWNrLW91dFwiXSA9IGVmLmJhY2tPdXQ7XG5cbiAgICAvLyBCUk9XU0VSSUZZIE1PRDogdXNlIFIuX2cud2luIGhlcmUgaW5zdGVhZCBvZiB3aW5kb3dcbiAgICB2YXIgYW5pbWF0aW9uRWxlbWVudHMgPSBbXSxcbiAgICAgICAgcmVxdWVzdEFuaW1GcmFtZSA9IFIuX2cud2luLnJlcXVlc3RBbmltYXRpb25GcmFtZSAgICAgICB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgUi5fZy53aW4ud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBSLl9nLndpbi5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgICAgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFIuX2cud2luLm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUgICAgICB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgUi5fZy53aW4ubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgICAgIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGNhbGxiYWNrLCAxNik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICBhbmltYXRpb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgTm93ID0gK25ldyBEYXRlLFxuICAgICAgICAgICAgICAgIGwgPSAwO1xuICAgICAgICAgICAgZm9yICg7IGwgPCBhbmltYXRpb25FbGVtZW50cy5sZW5ndGg7IGwrKykge1xuICAgICAgICAgICAgICAgIHZhciBlID0gYW5pbWF0aW9uRWxlbWVudHNbbF07XG4gICAgICAgICAgICAgICAgaWYgKGUuZWwucmVtb3ZlZCB8fCBlLnBhdXNlZCkge1xuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHRpbWUgPSBOb3cgLSBlLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICBtcyA9IGUubXMsXG4gICAgICAgICAgICAgICAgICAgIGVhc2luZyA9IGUuZWFzaW5nLFxuICAgICAgICAgICAgICAgICAgICBmcm9tID0gZS5mcm9tLFxuICAgICAgICAgICAgICAgICAgICBkaWZmID0gZS5kaWZmLFxuICAgICAgICAgICAgICAgICAgICB0byA9IGUudG8sXG4gICAgICAgICAgICAgICAgICAgIHQgPSBlLnQsXG4gICAgICAgICAgICAgICAgICAgIHRoYXQgPSBlLmVsLFxuICAgICAgICAgICAgICAgICAgICBzZXQgPSB7fSxcbiAgICAgICAgICAgICAgICAgICAgbm93LFxuICAgICAgICAgICAgICAgICAgICBpbml0ID0ge30sXG4gICAgICAgICAgICAgICAgICAgIGtleTtcbiAgICAgICAgICAgICAgICBpZiAoZS5pbml0c3RhdHVzKSB7XG4gICAgICAgICAgICAgICAgICAgIHRpbWUgPSAoZS5pbml0c3RhdHVzICogZS5hbmltLnRvcCAtIGUucHJldikgLyAoZS5wZXJjZW50IC0gZS5wcmV2KSAqIG1zO1xuICAgICAgICAgICAgICAgICAgICBlLnN0YXR1cyA9IGUuaW5pdHN0YXR1cztcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGUuaW5pdHN0YXR1cztcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wICYmIGFuaW1hdGlvbkVsZW1lbnRzLnNwbGljZShsLS0sIDEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGUuc3RhdHVzID0gKGUucHJldiArIChlLnBlcmNlbnQgLSBlLnByZXYpICogKHRpbWUgLyBtcykpIC8gZS5hbmltLnRvcDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRpbWUgPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGltZSA8IG1zKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwb3MgPSBlYXNpbmcodGltZSAvIG1zKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgYXR0ciBpbiBmcm9tKSBpZiAoZnJvbVtoYXNdKGF0dHIpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGF2YWlsYWJsZUFuaW1BdHRyc1thdHRyXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgbnU6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vdyA9ICtmcm9tW2F0dHJdICsgcG9zICogbXMgKiBkaWZmW2F0dHJdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY29sb3VyXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vdyA9IFwicmdiKFwiICsgW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXB0bzI1NShyb3VuZChmcm9tW2F0dHJdLnIgKyBwb3MgKiBtcyAqIGRpZmZbYXR0cl0ucikpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXB0bzI1NShyb3VuZChmcm9tW2F0dHJdLmcgKyBwb3MgKiBtcyAqIGRpZmZbYXR0cl0uZykpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXB0bzI1NShyb3VuZChmcm9tW2F0dHJdLmIgKyBwb3MgKiBtcyAqIGRpZmZbYXR0cl0uYikpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0uam9pbihcIixcIikgKyBcIilcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcInBhdGhcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm93ID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IGZyb21bYXR0cl0ubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm93W2ldID0gW2Zyb21bYXR0cl1baV1bMF1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDEsIGpqID0gZnJvbVthdHRyXVtpXS5sZW5ndGg7IGogPCBqajsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm93W2ldW2pdID0gK2Zyb21bYXR0cl1baV1bal0gKyBwb3MgKiBtcyAqIGRpZmZbYXR0cl1baV1bal07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3dbaV0gPSBub3dbaV0uam9pbihTKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3cgPSBub3cuam9pbihTKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcInRyYW5zZm9ybVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGlmZlthdHRyXS5yZWFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3cgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDAsIGlpID0gZnJvbVthdHRyXS5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm93W2ldID0gW2Zyb21bYXR0cl1baV1bMF1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaiA9IDEsIGpqID0gZnJvbVthdHRyXVtpXS5sZW5ndGg7IGogPCBqajsgaisrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vd1tpXVtqXSA9IGZyb21bYXR0cl1baV1bal0gKyBwb3MgKiBtcyAqIGRpZmZbYXR0cl1baV1bal07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGdldCA9IGZ1bmN0aW9uIChpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuICtmcm9tW2F0dHJdW2ldICsgcG9zICogbXMgKiBkaWZmW2F0dHJdW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG5vdyA9IFtbXCJyXCIsIGdldCgyKSwgMCwgMF0sIFtcInRcIiwgZ2V0KDMpLCBnZXQoNCldLCBbXCJzXCIsIGdldCgwKSwgZ2V0KDEpLCAwLCAwXV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3cgPSBbW1wibVwiLCBnZXQoMCksIGdldCgxKSwgZ2V0KDIpLCBnZXQoMyksIGdldCg0KSwgZ2V0KDUpXV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNzdlwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0ciA9PSBcImNsaXAtcmVjdFwiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3cgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGkgPSA0O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vd1tpXSA9ICtmcm9tW2F0dHJdW2ldICsgcG9zICogbXMgKiBkaWZmW2F0dHJdW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBmcm9tMiA9IFtdW2NvbmNhdF0oZnJvbVthdHRyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vdyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpID0gdGhhdC5wYXBlci5jdXN0b21BdHRyaWJ1dGVzW2F0dHJdLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm93W2ldID0gK2Zyb20yW2ldICsgcG9zICogbXMgKiBkaWZmW2F0dHJdW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0W2F0dHJdID0gbm93O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRoYXQuYXR0cihzZXQpO1xuICAgICAgICAgICAgICAgICAgICAoZnVuY3Rpb24gKGlkLCB0aGF0LCBhbmltKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmUoXCJyYXBoYWVsLmFuaW0uZnJhbWUuXCIgKyBpZCwgdGhhdCwgYW5pbSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSkodGhhdC5pZCwgdGhhdCwgZS5hbmltKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAoZnVuY3Rpb24oZiwgZWwsIGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlKFwicmFwaGFlbC5hbmltLmZyYW1lLlwiICsgZWwuaWQsIGVsLCBhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmUoXCJyYXBoYWVsLmFuaW0uZmluaXNoLlwiICsgZWwuaWQsIGVsLCBhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBSLmlzKGYsIFwiZnVuY3Rpb25cIikgJiYgZi5jYWxsKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9KShlLmNhbGxiYWNrLCB0aGF0LCBlLmFuaW0pO1xuICAgICAgICAgICAgICAgICAgICB0aGF0LmF0dHIodG8pO1xuICAgICAgICAgICAgICAgICAgICBhbmltYXRpb25FbGVtZW50cy5zcGxpY2UobC0tLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGUucmVwZWF0ID4gMSAmJiAhZS5uZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGtleSBpbiB0bykgaWYgKHRvW2hhc10oa2V5KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRba2V5XSA9IGUudG90YWxPcmlnaW5ba2V5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGUuZWwuYXR0cihpbml0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bkFuaW1hdGlvbihlLmFuaW0sIGUuZWwsIGUuYW5pbS5wZXJjZW50c1swXSwgbnVsbCwgZS50b3RhbE9yaWdpbiwgZS5yZXBlYXQgLSAxKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoZS5uZXh0ICYmICFlLnN0b3ApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJ1bkFuaW1hdGlvbihlLmFuaW0sIGUuZWwsIGUubmV4dCwgbnVsbCwgZS50b3RhbE9yaWdpbiwgZS5yZXBlYXQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgUi5zdmcgJiYgdGhhdCAmJiB0aGF0LnBhcGVyICYmIHRoYXQucGFwZXIuc2FmYXJpKCk7XG4gICAgICAgICAgICBhbmltYXRpb25FbGVtZW50cy5sZW5ndGggJiYgcmVxdWVzdEFuaW1GcmFtZShhbmltYXRpb24pO1xuICAgICAgICB9LFxuICAgICAgICB1cHRvMjU1ID0gZnVuY3Rpb24gKGNvbG9yKSB7XG4gICAgICAgICAgICByZXR1cm4gY29sb3IgPiAyNTUgPyAyNTUgOiBjb2xvciA8IDAgPyAwIDogY29sb3I7XG4gICAgICAgIH07XG4gICAgXG4gICAgZWxwcm90by5hbmltYXRlV2l0aCA9IGZ1bmN0aW9uIChlbCwgYW5pbSwgcGFyYW1zLCBtcywgZWFzaW5nLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgZWxlbWVudCA9IHRoaXM7XG4gICAgICAgIGlmIChlbGVtZW50LnJlbW92ZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrLmNhbGwoZWxlbWVudCk7XG4gICAgICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYSA9IHBhcmFtcyBpbnN0YW5jZW9mIEFuaW1hdGlvbiA/IHBhcmFtcyA6IFIuYW5pbWF0aW9uKHBhcmFtcywgbXMsIGVhc2luZywgY2FsbGJhY2spLFxuICAgICAgICAgICAgeCwgeTtcbiAgICAgICAgcnVuQW5pbWF0aW9uKGEsIGVsZW1lbnQsIGEucGVyY2VudHNbMF0sIG51bGwsIGVsZW1lbnQuYXR0cigpKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gYW5pbWF0aW9uRWxlbWVudHMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgaWYgKGFuaW1hdGlvbkVsZW1lbnRzW2ldLmFuaW0gPT0gYW5pbSAmJiBhbmltYXRpb25FbGVtZW50c1tpXS5lbCA9PSBlbCkge1xuICAgICAgICAgICAgICAgIGFuaW1hdGlvbkVsZW1lbnRzW2lpIC0gMV0uc3RhcnQgPSBhbmltYXRpb25FbGVtZW50c1tpXS5zdGFydDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgICAgLy8gXG4gICAgICAgIC8vIFxuICAgICAgICAvLyB2YXIgYSA9IHBhcmFtcyA/IFIuYW5pbWF0aW9uKHBhcmFtcywgbXMsIGVhc2luZywgY2FsbGJhY2spIDogYW5pbSxcbiAgICAgICAgLy8gICAgIHN0YXR1cyA9IGVsZW1lbnQuc3RhdHVzKGFuaW0pO1xuICAgICAgICAvLyByZXR1cm4gdGhpcy5hbmltYXRlKGEpLnN0YXR1cyhhLCBzdGF0dXMgKiBhbmltLm1zIC8gYS5tcyk7XG4gICAgfTtcbiAgICBmdW5jdGlvbiBDdWJpY0JlemllckF0VGltZSh0LCBwMXgsIHAxeSwgcDJ4LCBwMnksIGR1cmF0aW9uKSB7XG4gICAgICAgIHZhciBjeCA9IDMgKiBwMXgsXG4gICAgICAgICAgICBieCA9IDMgKiAocDJ4IC0gcDF4KSAtIGN4LFxuICAgICAgICAgICAgYXggPSAxIC0gY3ggLSBieCxcbiAgICAgICAgICAgIGN5ID0gMyAqIHAxeSxcbiAgICAgICAgICAgIGJ5ID0gMyAqIChwMnkgLSBwMXkpIC0gY3ksXG4gICAgICAgICAgICBheSA9IDEgLSBjeSAtIGJ5O1xuICAgICAgICBmdW5jdGlvbiBzYW1wbGVDdXJ2ZVgodCkge1xuICAgICAgICAgICAgcmV0dXJuICgoYXggKiB0ICsgYngpICogdCArIGN4KSAqIHQ7XG4gICAgICAgIH1cbiAgICAgICAgZnVuY3Rpb24gc29sdmUoeCwgZXBzaWxvbikge1xuICAgICAgICAgICAgdmFyIHQgPSBzb2x2ZUN1cnZlWCh4LCBlcHNpbG9uKTtcbiAgICAgICAgICAgIHJldHVybiAoKGF5ICogdCArIGJ5KSAqIHQgKyBjeSkgKiB0O1xuICAgICAgICB9XG4gICAgICAgIGZ1bmN0aW9uIHNvbHZlQ3VydmVYKHgsIGVwc2lsb24pIHtcbiAgICAgICAgICAgIHZhciB0MCwgdDEsIHQyLCB4MiwgZDIsIGk7XG4gICAgICAgICAgICBmb3IodDIgPSB4LCBpID0gMDsgaSA8IDg7IGkrKykge1xuICAgICAgICAgICAgICAgIHgyID0gc2FtcGxlQ3VydmVYKHQyKSAtIHg7XG4gICAgICAgICAgICAgICAgaWYgKGFicyh4MikgPCBlcHNpbG9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0MjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZDIgPSAoMyAqIGF4ICogdDIgKyAyICogYngpICogdDIgKyBjeDtcbiAgICAgICAgICAgICAgICBpZiAoYWJzKGQyKSA8IDFlLTYpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHQyID0gdDIgLSB4MiAvIGQyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdDAgPSAwO1xuICAgICAgICAgICAgdDEgPSAxO1xuICAgICAgICAgICAgdDIgPSB4O1xuICAgICAgICAgICAgaWYgKHQyIDwgdDApIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodDIgPiB0MSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0MTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdoaWxlICh0MCA8IHQxKSB7XG4gICAgICAgICAgICAgICAgeDIgPSBzYW1wbGVDdXJ2ZVgodDIpO1xuICAgICAgICAgICAgICAgIGlmIChhYnMoeDIgLSB4KSA8IGVwc2lsb24pIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHQyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoeCA+IHgyKSB7XG4gICAgICAgICAgICAgICAgICAgIHQwID0gdDI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdDEgPSB0MjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdDIgPSAodDEgLSB0MCkgLyAyICsgdDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdDI7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNvbHZlKHQsIDEgLyAoMjAwICogZHVyYXRpb24pKTtcbiAgICB9XG4gICAgZWxwcm90by5vbkFuaW1hdGlvbiA9IGZ1bmN0aW9uIChmKSB7XG4gICAgICAgIGYgPyBldmUub24oXCJyYXBoYWVsLmFuaW0uZnJhbWUuXCIgKyB0aGlzLmlkLCBmKSA6IGV2ZS51bmJpbmQoXCJyYXBoYWVsLmFuaW0uZnJhbWUuXCIgKyB0aGlzLmlkKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBmdW5jdGlvbiBBbmltYXRpb24oYW5pbSwgbXMpIHtcbiAgICAgICAgdmFyIHBlcmNlbnRzID0gW10sXG4gICAgICAgICAgICBuZXdBbmltID0ge307XG4gICAgICAgIHRoaXMubXMgPSBtcztcbiAgICAgICAgdGhpcy50aW1lcyA9IDE7XG4gICAgICAgIGlmIChhbmltKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBhdHRyIGluIGFuaW0pIGlmIChhbmltW2hhc10oYXR0cikpIHtcbiAgICAgICAgICAgICAgICBuZXdBbmltW3RvRmxvYXQoYXR0cildID0gYW5pbVthdHRyXTtcbiAgICAgICAgICAgICAgICBwZXJjZW50cy5wdXNoKHRvRmxvYXQoYXR0cikpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGVyY2VudHMuc29ydChzb3J0QnlOdW1iZXIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYW5pbSA9IG5ld0FuaW07XG4gICAgICAgIHRoaXMudG9wID0gcGVyY2VudHNbcGVyY2VudHMubGVuZ3RoIC0gMV07XG4gICAgICAgIHRoaXMucGVyY2VudHMgPSBwZXJjZW50cztcbiAgICB9XG4gICAgXG4gICAgQW5pbWF0aW9uLnByb3RvdHlwZS5kZWxheSA9IGZ1bmN0aW9uIChkZWxheSkge1xuICAgICAgICB2YXIgYSA9IG5ldyBBbmltYXRpb24odGhpcy5hbmltLCB0aGlzLm1zKTtcbiAgICAgICAgYS50aW1lcyA9IHRoaXMudGltZXM7XG4gICAgICAgIGEuZGVsID0gK2RlbGF5IHx8IDA7XG4gICAgICAgIHJldHVybiBhO1xuICAgIH07XG4gICAgXG4gICAgQW5pbWF0aW9uLnByb3RvdHlwZS5yZXBlYXQgPSBmdW5jdGlvbiAodGltZXMpIHsgXG4gICAgICAgIHZhciBhID0gbmV3IEFuaW1hdGlvbih0aGlzLmFuaW0sIHRoaXMubXMpO1xuICAgICAgICBhLmRlbCA9IHRoaXMuZGVsO1xuICAgICAgICBhLnRpbWVzID0gbWF0aC5mbG9vcihtbWF4KHRpbWVzLCAwKSkgfHwgMTtcbiAgICAgICAgcmV0dXJuIGE7XG4gICAgfTtcbiAgICBmdW5jdGlvbiBydW5BbmltYXRpb24oYW5pbSwgZWxlbWVudCwgcGVyY2VudCwgc3RhdHVzLCB0b3RhbE9yaWdpbiwgdGltZXMpIHtcbiAgICAgICAgcGVyY2VudCA9IHRvRmxvYXQocGVyY2VudCk7XG4gICAgICAgIHZhciBwYXJhbXMsXG4gICAgICAgICAgICBpc0luQW5pbSxcbiAgICAgICAgICAgIGlzSW5BbmltU2V0LFxuICAgICAgICAgICAgcGVyY2VudHMgPSBbXSxcbiAgICAgICAgICAgIG5leHQsXG4gICAgICAgICAgICBwcmV2LFxuICAgICAgICAgICAgdGltZXN0YW1wLFxuICAgICAgICAgICAgbXMgPSBhbmltLm1zLFxuICAgICAgICAgICAgZnJvbSA9IHt9LFxuICAgICAgICAgICAgdG8gPSB7fSxcbiAgICAgICAgICAgIGRpZmYgPSB7fTtcbiAgICAgICAgaWYgKHN0YXR1cykge1xuICAgICAgICAgICAgZm9yIChpID0gMCwgaWkgPSBhbmltYXRpb25FbGVtZW50cy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGUgPSBhbmltYXRpb25FbGVtZW50c1tpXTtcbiAgICAgICAgICAgICAgICBpZiAoZS5lbC5pZCA9PSBlbGVtZW50LmlkICYmIGUuYW5pbSA9PSBhbmltKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlLnBlcmNlbnQgIT0gcGVyY2VudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbWF0aW9uRWxlbWVudHMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNJbkFuaW1TZXQgPSAxO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgaXNJbkFuaW0gPSBlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYXR0cihlLnRvdGFsT3JpZ2luKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdHVzID0gK3RvOyAvLyBOYU5cbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBhbmltLnBlcmNlbnRzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChhbmltLnBlcmNlbnRzW2ldID09IHBlcmNlbnQgfHwgYW5pbS5wZXJjZW50c1tpXSA+IHN0YXR1cyAqIGFuaW0udG9wKSB7XG4gICAgICAgICAgICAgICAgcGVyY2VudCA9IGFuaW0ucGVyY2VudHNbaV07XG4gICAgICAgICAgICAgICAgcHJldiA9IGFuaW0ucGVyY2VudHNbaSAtIDFdIHx8IDA7XG4gICAgICAgICAgICAgICAgbXMgPSBtcyAvIGFuaW0udG9wICogKHBlcmNlbnQgLSBwcmV2KTtcbiAgICAgICAgICAgICAgICBuZXh0ID0gYW5pbS5wZXJjZW50c1tpICsgMV07XG4gICAgICAgICAgICAgICAgcGFyYW1zID0gYW5pbS5hbmltW3BlcmNlbnRdO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzdGF0dXMpIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50LmF0dHIoYW5pbS5hbmltW2FuaW0ucGVyY2VudHNbaV1dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoIXBhcmFtcykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGlmICghaXNJbkFuaW0pIHtcbiAgICAgICAgICAgIGZvciAodmFyIGF0dHIgaW4gcGFyYW1zKSBpZiAocGFyYW1zW2hhc10oYXR0cikpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXZhaWxhYmxlQW5pbUF0dHJzW2hhc10oYXR0cikgfHwgZWxlbWVudC5wYXBlci5jdXN0b21BdHRyaWJ1dGVzW2hhc10oYXR0cikpIHtcbiAgICAgICAgICAgICAgICAgICAgZnJvbVthdHRyXSA9IGVsZW1lbnQuYXR0cihhdHRyKTtcbiAgICAgICAgICAgICAgICAgICAgKGZyb21bYXR0cl0gPT0gbnVsbCkgJiYgKGZyb21bYXR0cl0gPSBhdmFpbGFibGVBdHRyc1thdHRyXSk7XG4gICAgICAgICAgICAgICAgICAgIHRvW2F0dHJdID0gcGFyYW1zW2F0dHJdO1xuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGF2YWlsYWJsZUFuaW1BdHRyc1thdHRyXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBudTpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWZmW2F0dHJdID0gKHRvW2F0dHJdIC0gZnJvbVthdHRyXSkgLyBtcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjb2xvdXJcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcm9tW2F0dHJdID0gUi5nZXRSR0IoZnJvbVthdHRyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHRvQ29sb3VyID0gUi5nZXRSR0IodG9bYXR0cl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZbYXR0cl0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHI6ICh0b0NvbG91ci5yIC0gZnJvbVthdHRyXS5yKSAvIG1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnOiAodG9Db2xvdXIuZyAtIGZyb21bYXR0cl0uZykgLyBtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYjogKHRvQ29sb3VyLmIgLSBmcm9tW2F0dHJdLmIpIC8gbXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcInBhdGhcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgcGF0aGVzID0gcGF0aDJjdXJ2ZShmcm9tW2F0dHJdLCB0b1thdHRyXSksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvUGF0aCA9IHBhdGhlc1sxXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcm9tW2F0dHJdID0gcGF0aGVzWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZbYXR0cl0gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGkgPSAwLCBpaSA9IGZyb21bYXR0cl0ubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWZmW2F0dHJdW2ldID0gWzBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMSwgamogPSBmcm9tW2F0dHJdW2ldLmxlbmd0aDsgaiA8IGpqOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZbYXR0cl1baV1bal0gPSAodG9QYXRoW2ldW2pdIC0gZnJvbVthdHRyXVtpXVtqXSkgLyBtcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ0cmFuc2Zvcm1cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgXyA9IGVsZW1lbnQuXyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXEgPSBlcXVhbGlzZVRyYW5zZm9ybShfW2F0dHJdLCB0b1thdHRyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZyb21bYXR0cl0gPSBlcS5mcm9tO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b1thdHRyXSA9IGVxLnRvO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWZmW2F0dHJdID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZbYXR0cl0ucmVhbCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoaSA9IDAsIGlpID0gZnJvbVthdHRyXS5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWZmW2F0dHJdW2ldID0gW2Zyb21bYXR0cl1baV1bMF1dO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChqID0gMSwgamogPSBmcm9tW2F0dHJdW2ldLmxlbmd0aDsgaiA8IGpqOyBqKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaWZmW2F0dHJdW2ldW2pdID0gKHRvW2F0dHJdW2ldW2pdIC0gZnJvbVthdHRyXVtpXVtqXSkgLyBtcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBtID0gKGVsZW1lbnQubWF0cml4IHx8IG5ldyBNYXRyaXgpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdG8yID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF86IHt0cmFuc2Zvcm06IF8udHJhbnNmb3JtfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZXRCQm94OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50LmdldEJCb3goMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJvbVthdHRyXSA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG0uYSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG0uYixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG0uYyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG0uZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG0uZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG0uZlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHRyYWN0VHJhbnNmb3JtKHRvMiwgdG9bYXR0cl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0b1thdHRyXSA9IHRvMi5fLnRyYW5zZm9ybTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlmZlthdHRyXSA9IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0bzIubWF0cml4LmEgLSBtLmEpIC8gbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodG8yLm1hdHJpeC5iIC0gbS5iKSAvIG1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRvMi5tYXRyaXguYyAtIG0uYykgLyBtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICh0bzIubWF0cml4LmQgLSBtLmQpIC8gbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodG8yLm1hdHJpeC5lIC0gbS5lKSAvIG1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKHRvMi5tYXRyaXguZiAtIG0uZikgLyBtc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBmcm9tW2F0dHJdID0gW18uc3gsIF8uc3ksIF8uZGVnLCBfLmR4LCBfLmR5XTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdmFyIHRvMiA9IHtfOnt9LCBnZXRCQm94OiBmdW5jdGlvbiAoKSB7IHJldHVybiBlbGVtZW50LmdldEJCb3goKTsgfX07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGV4dHJhY3RUcmFuc2Zvcm0odG8yLCB0b1thdHRyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGRpZmZbYXR0cl0gPSBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAodG8yLl8uc3ggLSBfLnN4KSAvIG1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgKHRvMi5fLnN5IC0gXy5zeSkgLyBtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICh0bzIuXy5kZWcgLSBfLmRlZykgLyBtcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgICh0bzIuXy5keCAtIF8uZHgpIC8gbXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICAodG8yLl8uZHkgLSBfLmR5KSAvIG1zXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIF07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNzdlwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciB2YWx1ZXMgPSBTdHIocGFyYW1zW2F0dHJdKVtzcGxpdF0oc2VwYXJhdG9yKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJvbTIgPSBTdHIoZnJvbVthdHRyXSlbc3BsaXRdKHNlcGFyYXRvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHIgPT0gXCJjbGlwLXJlY3RcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmcm9tW2F0dHJdID0gZnJvbTI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZbYXR0cl0gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaSA9IGZyb20yLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGlmZlthdHRyXVtpXSA9ICh2YWx1ZXNbaV0gLSBmcm9tW2F0dHJdW2ldKSAvIG1zO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvW2F0dHJdID0gdmFsdWVzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXMgPSBbXVtjb25jYXRdKHBhcmFtc1thdHRyXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnJvbTIgPSBbXVtjb25jYXRdKGZyb21bYXR0cl0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZbYXR0cl0gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpID0gZWxlbWVudC5wYXBlci5jdXN0b21BdHRyaWJ1dGVzW2F0dHJdLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZbYXR0cl1baV0gPSAoKHZhbHVlc1tpXSB8fCAwKSAtIChmcm9tMltpXSB8fCAwKSkgLyBtcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgZWFzaW5nID0gcGFyYW1zLmVhc2luZyxcbiAgICAgICAgICAgICAgICBlYXN5ZWFzeSA9IFIuZWFzaW5nX2Zvcm11bGFzW2Vhc2luZ107XG4gICAgICAgICAgICBpZiAoIWVhc3llYXN5KSB7XG4gICAgICAgICAgICAgICAgZWFzeWVhc3kgPSBTdHIoZWFzaW5nKS5tYXRjaChiZXppZXJyZyk7XG4gICAgICAgICAgICAgICAgaWYgKGVhc3llYXN5ICYmIGVhc3llYXN5Lmxlbmd0aCA9PSA1KSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjdXJ2ZSA9IGVhc3llYXN5O1xuICAgICAgICAgICAgICAgICAgICBlYXN5ZWFzeSA9IGZ1bmN0aW9uICh0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gQ3ViaWNCZXppZXJBdFRpbWUodCwgK2N1cnZlWzFdLCArY3VydmVbMl0sICtjdXJ2ZVszXSwgK2N1cnZlWzRdLCBtcyk7XG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZWFzeWVhc3kgPSBwaXBlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRpbWVzdGFtcCA9IHBhcmFtcy5zdGFydCB8fCBhbmltLnN0YXJ0IHx8ICtuZXcgRGF0ZTtcbiAgICAgICAgICAgIGUgPSB7XG4gICAgICAgICAgICAgICAgYW5pbTogYW5pbSxcbiAgICAgICAgICAgICAgICBwZXJjZW50OiBwZXJjZW50LFxuICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogdGltZXN0YW1wLFxuICAgICAgICAgICAgICAgIHN0YXJ0OiB0aW1lc3RhbXAgKyAoYW5pbS5kZWwgfHwgMCksXG4gICAgICAgICAgICAgICAgc3RhdHVzOiAwLFxuICAgICAgICAgICAgICAgIGluaXRzdGF0dXM6IHN0YXR1cyB8fCAwLFxuICAgICAgICAgICAgICAgIHN0b3A6IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1zOiBtcyxcbiAgICAgICAgICAgICAgICBlYXNpbmc6IGVhc3llYXN5LFxuICAgICAgICAgICAgICAgIGZyb206IGZyb20sXG4gICAgICAgICAgICAgICAgZGlmZjogZGlmZixcbiAgICAgICAgICAgICAgICB0bzogdG8sXG4gICAgICAgICAgICAgICAgZWw6IGVsZW1lbnQsXG4gICAgICAgICAgICAgICAgY2FsbGJhY2s6IHBhcmFtcy5jYWxsYmFjayxcbiAgICAgICAgICAgICAgICBwcmV2OiBwcmV2LFxuICAgICAgICAgICAgICAgIG5leHQ6IG5leHQsXG4gICAgICAgICAgICAgICAgcmVwZWF0OiB0aW1lcyB8fCBhbmltLnRpbWVzLFxuICAgICAgICAgICAgICAgIG9yaWdpbjogZWxlbWVudC5hdHRyKCksXG4gICAgICAgICAgICAgICAgdG90YWxPcmlnaW46IHRvdGFsT3JpZ2luXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgYW5pbWF0aW9uRWxlbWVudHMucHVzaChlKTtcbiAgICAgICAgICAgIGlmIChzdGF0dXMgJiYgIWlzSW5BbmltICYmICFpc0luQW5pbVNldCkge1xuICAgICAgICAgICAgICAgIGUuc3RvcCA9IHRydWU7XG4gICAgICAgICAgICAgICAgZS5zdGFydCA9IG5ldyBEYXRlIC0gbXMgKiBzdGF0dXM7XG4gICAgICAgICAgICAgICAgaWYgKGFuaW1hdGlvbkVsZW1lbnRzLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhbmltYXRpb24oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXNJbkFuaW1TZXQpIHtcbiAgICAgICAgICAgICAgICBlLnN0YXJ0ID0gbmV3IERhdGUgLSBlLm1zICogc3RhdHVzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYW5pbWF0aW9uRWxlbWVudHMubGVuZ3RoID09IDEgJiYgcmVxdWVzdEFuaW1GcmFtZShhbmltYXRpb24pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaXNJbkFuaW0uaW5pdHN0YXR1cyA9IHN0YXR1cztcbiAgICAgICAgICAgIGlzSW5BbmltLnN0YXJ0ID0gbmV3IERhdGUgLSBpc0luQW5pbS5tcyAqIHN0YXR1cztcbiAgICAgICAgfVxuICAgICAgICBldmUoXCJyYXBoYWVsLmFuaW0uc3RhcnQuXCIgKyBlbGVtZW50LmlkLCBlbGVtZW50LCBhbmltKTtcbiAgICB9XG4gICAgXG4gICAgUi5hbmltYXRpb24gPSBmdW5jdGlvbiAocGFyYW1zLCBtcywgZWFzaW5nLCBjYWxsYmFjaykge1xuICAgICAgICBpZiAocGFyYW1zIGluc3RhbmNlb2YgQW5pbWF0aW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyYW1zO1xuICAgICAgICB9XG4gICAgICAgIGlmIChSLmlzKGVhc2luZywgXCJmdW5jdGlvblwiKSB8fCAhZWFzaW5nKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IGNhbGxiYWNrIHx8IGVhc2luZyB8fCBudWxsO1xuICAgICAgICAgICAgZWFzaW5nID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBwYXJhbXMgPSBPYmplY3QocGFyYW1zKTtcbiAgICAgICAgbXMgPSArbXMgfHwgMDtcbiAgICAgICAgdmFyIHAgPSB7fSxcbiAgICAgICAgICAgIGpzb24sXG4gICAgICAgICAgICBhdHRyO1xuICAgICAgICBmb3IgKGF0dHIgaW4gcGFyYW1zKSBpZiAocGFyYW1zW2hhc10oYXR0cikgJiYgdG9GbG9hdChhdHRyKSAhPSBhdHRyICYmIHRvRmxvYXQoYXR0cikgKyBcIiVcIiAhPSBhdHRyKSB7XG4gICAgICAgICAgICBqc29uID0gdHJ1ZTtcbiAgICAgICAgICAgIHBbYXR0cl0gPSBwYXJhbXNbYXR0cl07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFqc29uKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEFuaW1hdGlvbihwYXJhbXMsIG1zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVhc2luZyAmJiAocC5lYXNpbmcgPSBlYXNpbmcpO1xuICAgICAgICAgICAgY2FsbGJhY2sgJiYgKHAuY2FsbGJhY2sgPSBjYWxsYmFjayk7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEFuaW1hdGlvbih7MTAwOiBwfSwgbXMpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLmFuaW1hdGUgPSBmdW5jdGlvbiAocGFyYW1zLCBtcywgZWFzaW5nLCBjYWxsYmFjaykge1xuICAgICAgICB2YXIgZWxlbWVudCA9IHRoaXM7XG4gICAgICAgIGlmIChlbGVtZW50LnJlbW92ZWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrLmNhbGwoZWxlbWVudCk7XG4gICAgICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYW5pbSA9IHBhcmFtcyBpbnN0YW5jZW9mIEFuaW1hdGlvbiA/IHBhcmFtcyA6IFIuYW5pbWF0aW9uKHBhcmFtcywgbXMsIGVhc2luZywgY2FsbGJhY2spO1xuICAgICAgICBydW5BbmltYXRpb24oYW5pbSwgZWxlbWVudCwgYW5pbS5wZXJjZW50c1swXSwgbnVsbCwgZWxlbWVudC5hdHRyKCkpO1xuICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICB9O1xuICAgIFxuICAgIGVscHJvdG8uc2V0VGltZSA9IGZ1bmN0aW9uIChhbmltLCB2YWx1ZSkge1xuICAgICAgICBpZiAoYW5pbSAmJiB2YWx1ZSAhPSBudWxsKSB7XG4gICAgICAgICAgICB0aGlzLnN0YXR1cyhhbmltLCBtbWluKHZhbHVlLCBhbmltLm1zKSAvIGFuaW0ubXMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgZWxwcm90by5zdGF0dXMgPSBmdW5jdGlvbiAoYW5pbSwgdmFsdWUpIHtcbiAgICAgICAgdmFyIG91dCA9IFtdLFxuICAgICAgICAgICAgaSA9IDAsXG4gICAgICAgICAgICBsZW4sXG4gICAgICAgICAgICBlO1xuICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgICAgICAgcnVuQW5pbWF0aW9uKGFuaW0sIHRoaXMsIC0xLCBtbWluKHZhbHVlLCAxKSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxlbiA9IGFuaW1hdGlvbkVsZW1lbnRzLmxlbmd0aDtcbiAgICAgICAgICAgIGZvciAoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgICAgICAgICBlID0gYW5pbWF0aW9uRWxlbWVudHNbaV07XG4gICAgICAgICAgICAgICAgaWYgKGUuZWwuaWQgPT0gdGhpcy5pZCAmJiAoIWFuaW0gfHwgZS5hbmltID09IGFuaW0pKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhbmltKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZS5zdGF0dXM7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgb3V0LnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgYW5pbTogZS5hbmltLFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzOiBlLnN0YXR1c1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYW5pbSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgZWxwcm90by5wYXVzZSA9IGZ1bmN0aW9uIChhbmltKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYW5pbWF0aW9uRWxlbWVudHMubGVuZ3RoOyBpKyspIGlmIChhbmltYXRpb25FbGVtZW50c1tpXS5lbC5pZCA9PSB0aGlzLmlkICYmICghYW5pbSB8fCBhbmltYXRpb25FbGVtZW50c1tpXS5hbmltID09IGFuaW0pKSB7XG4gICAgICAgICAgICBpZiAoZXZlKFwicmFwaGFlbC5hbmltLnBhdXNlLlwiICsgdGhpcy5pZCwgdGhpcywgYW5pbWF0aW9uRWxlbWVudHNbaV0uYW5pbSkgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgYW5pbWF0aW9uRWxlbWVudHNbaV0ucGF1c2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFxuICAgIGVscHJvdG8ucmVzdW1lID0gZnVuY3Rpb24gKGFuaW0pIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbmltYXRpb25FbGVtZW50cy5sZW5ndGg7IGkrKykgaWYgKGFuaW1hdGlvbkVsZW1lbnRzW2ldLmVsLmlkID09IHRoaXMuaWQgJiYgKCFhbmltIHx8IGFuaW1hdGlvbkVsZW1lbnRzW2ldLmFuaW0gPT0gYW5pbSkpIHtcbiAgICAgICAgICAgIHZhciBlID0gYW5pbWF0aW9uRWxlbWVudHNbaV07XG4gICAgICAgICAgICBpZiAoZXZlKFwicmFwaGFlbC5hbmltLnJlc3VtZS5cIiArIHRoaXMuaWQsIHRoaXMsIGUuYW5pbSkgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIGUucGF1c2VkO1xuICAgICAgICAgICAgICAgIHRoaXMuc3RhdHVzKGUuYW5pbSwgZS5zdGF0dXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgZWxwcm90by5zdG9wID0gZnVuY3Rpb24gKGFuaW0pIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhbmltYXRpb25FbGVtZW50cy5sZW5ndGg7IGkrKykgaWYgKGFuaW1hdGlvbkVsZW1lbnRzW2ldLmVsLmlkID09IHRoaXMuaWQgJiYgKCFhbmltIHx8IGFuaW1hdGlvbkVsZW1lbnRzW2ldLmFuaW0gPT0gYW5pbSkpIHtcbiAgICAgICAgICAgIGlmIChldmUoXCJyYXBoYWVsLmFuaW0uc3RvcC5cIiArIHRoaXMuaWQsIHRoaXMsIGFuaW1hdGlvbkVsZW1lbnRzW2ldLmFuaW0pICE9PSBmYWxzZSkge1xuICAgICAgICAgICAgICAgIGFuaW1hdGlvbkVsZW1lbnRzLnNwbGljZShpLS0sIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgZnVuY3Rpb24gc3RvcEFuaW1hdGlvbihwYXBlcikge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFuaW1hdGlvbkVsZW1lbnRzLmxlbmd0aDsgaSsrKSBpZiAoYW5pbWF0aW9uRWxlbWVudHNbaV0uZWwucGFwZXIgPT0gcGFwZXIpIHtcbiAgICAgICAgICAgIGFuaW1hdGlvbkVsZW1lbnRzLnNwbGljZShpLS0sIDEpO1xuICAgICAgICB9XG4gICAgfVxuICAgIGV2ZS5vbihcInJhcGhhZWwucmVtb3ZlXCIsIHN0b3BBbmltYXRpb24pO1xuICAgIGV2ZS5vbihcInJhcGhhZWwuY2xlYXJcIiwgc3RvcEFuaW1hdGlvbik7XG4gICAgZWxwcm90by50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFwiUmFwaGFcXHhlYmxcXHUyMDE5cyBvYmplY3RcIjtcbiAgICB9O1xuXG4gICAgLy8gU2V0XG4gICAgdmFyIFNldCA9IGZ1bmN0aW9uIChpdGVtcykge1xuICAgICAgICB0aGlzLml0ZW1zID0gW107XG4gICAgICAgIHRoaXMubGVuZ3RoID0gMDtcbiAgICAgICAgdGhpcy50eXBlID0gXCJzZXRcIjtcbiAgICAgICAgaWYgKGl0ZW1zKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBpdGVtcy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGl0ZW1zW2ldICYmIChpdGVtc1tpXS5jb25zdHJ1Y3RvciA9PSBlbHByb3RvLmNvbnN0cnVjdG9yIHx8IGl0ZW1zW2ldLmNvbnN0cnVjdG9yID09IFNldCkpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpc1t0aGlzLml0ZW1zLmxlbmd0aF0gPSB0aGlzLml0ZW1zW3RoaXMuaXRlbXMubGVuZ3RoXSA9IGl0ZW1zW2ldO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxlbmd0aCsrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgc2V0cHJvdG8gPSBTZXQucHJvdG90eXBlO1xuICAgIFxuICAgIHNldHByb3RvLnB1c2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpdGVtLFxuICAgICAgICAgICAgbGVuO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgaXRlbSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgIGlmIChpdGVtICYmIChpdGVtLmNvbnN0cnVjdG9yID09IGVscHJvdG8uY29uc3RydWN0b3IgfHwgaXRlbS5jb25zdHJ1Y3RvciA9PSBTZXQpKSB7XG4gICAgICAgICAgICAgICAgbGVuID0gdGhpcy5pdGVtcy5sZW5ndGg7XG4gICAgICAgICAgICAgICAgdGhpc1tsZW5dID0gdGhpcy5pdGVtc1tsZW5dID0gaXRlbTtcbiAgICAgICAgICAgICAgICB0aGlzLmxlbmd0aCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgXG4gICAgc2V0cHJvdG8ucG9wID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmxlbmd0aCAmJiBkZWxldGUgdGhpc1t0aGlzLmxlbmd0aC0tXTtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXRlbXMucG9wKCk7XG4gICAgfTtcbiAgICBcbiAgICBzZXRwcm90by5mb3JFYWNoID0gZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IHRoaXMuaXRlbXMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrLmNhbGwodGhpc0FyZywgdGhpcy5pdGVtc1tpXSwgaSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBmb3IgKHZhciBtZXRob2QgaW4gZWxwcm90bykgaWYgKGVscHJvdG9baGFzXShtZXRob2QpKSB7XG4gICAgICAgIHNldHByb3RvW21ldGhvZF0gPSAoZnVuY3Rpb24gKG1ldGhvZG5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZyA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgICAgICAgICBlbFttZXRob2RuYW1lXVthcHBseV0oZWwsIGFyZyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICB9KShtZXRob2QpO1xuICAgIH1cbiAgICBzZXRwcm90by5hdHRyID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIGlmIChuYW1lICYmIFIuaXMobmFtZSwgYXJyYXkpICYmIFIuaXMobmFtZVswXSwgXCJvYmplY3RcIikpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwLCBqaiA9IG5hbWUubGVuZ3RoOyBqIDwgamo7IGorKykge1xuICAgICAgICAgICAgICAgIHRoaXMuaXRlbXNbal0uYXR0cihuYW1lW2pdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IHRoaXMuaXRlbXMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIHRoaXMuaXRlbXNbaV0uYXR0cihuYW1lLCB2YWx1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICBzZXRwcm90by5jbGVhciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2hpbGUgKHRoaXMubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLnBvcCgpO1xuICAgICAgICB9XG4gICAgfTtcbiAgICBcbiAgICBzZXRwcm90by5zcGxpY2UgPSBmdW5jdGlvbiAoaW5kZXgsIGNvdW50LCBpbnNlcnRpb24pIHtcbiAgICAgICAgaW5kZXggPSBpbmRleCA8IDAgPyBtbWF4KHRoaXMubGVuZ3RoICsgaW5kZXgsIDApIDogaW5kZXg7XG4gICAgICAgIGNvdW50ID0gbW1heCgwLCBtbWluKHRoaXMubGVuZ3RoIC0gaW5kZXgsIGNvdW50KSk7XG4gICAgICAgIHZhciB0YWlsID0gW10sXG4gICAgICAgICAgICB0b2RlbCA9IFtdLFxuICAgICAgICAgICAgYXJncyA9IFtdLFxuICAgICAgICAgICAgaTtcbiAgICAgICAgZm9yIChpID0gMjsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJncy5wdXNoKGFyZ3VtZW50c1tpXSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgICAgICAgIHRvZGVsLnB1c2godGhpc1tpbmRleCArIGldKTtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKDsgaSA8IHRoaXMubGVuZ3RoIC0gaW5kZXg7IGkrKykge1xuICAgICAgICAgICAgdGFpbC5wdXNoKHRoaXNbaW5kZXggKyBpXSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGFyZ2xlbiA9IGFyZ3MubGVuZ3RoO1xuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgYXJnbGVuICsgdGFpbC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5pdGVtc1tpbmRleCArIGldID0gdGhpc1tpbmRleCArIGldID0gaSA8IGFyZ2xlbiA/IGFyZ3NbaV0gOiB0YWlsW2kgLSBhcmdsZW5dO1xuICAgICAgICB9XG4gICAgICAgIGkgPSB0aGlzLml0ZW1zLmxlbmd0aCA9IHRoaXMubGVuZ3RoIC09IGNvdW50IC0gYXJnbGVuO1xuICAgICAgICB3aGlsZSAodGhpc1tpXSkge1xuICAgICAgICAgICAgZGVsZXRlIHRoaXNbaSsrXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFNldCh0b2RlbCk7XG4gICAgfTtcbiAgICBcbiAgICBzZXRwcm90by5leGNsdWRlID0gZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IHRoaXMubGVuZ3RoOyBpIDwgaWk7IGkrKykgaWYgKHRoaXNbaV0gPT0gZWwpIHtcbiAgICAgICAgICAgIHRoaXMuc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHNldHByb3RvLmFuaW1hdGUgPSBmdW5jdGlvbiAocGFyYW1zLCBtcywgZWFzaW5nLCBjYWxsYmFjaykge1xuICAgICAgICAoUi5pcyhlYXNpbmcsIFwiZnVuY3Rpb25cIikgfHwgIWVhc2luZykgJiYgKGNhbGxiYWNrID0gZWFzaW5nIHx8IG51bGwpO1xuICAgICAgICB2YXIgbGVuID0gdGhpcy5pdGVtcy5sZW5ndGgsXG4gICAgICAgICAgICBpID0gbGVuLFxuICAgICAgICAgICAgaXRlbSxcbiAgICAgICAgICAgIHNldCA9IHRoaXMsXG4gICAgICAgICAgICBjb2xsZWN0b3I7XG4gICAgICAgIGlmICghbGVuKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjayAmJiAoY29sbGVjdG9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgIS0tbGVuICYmIGNhbGxiYWNrLmNhbGwoc2V0KTtcbiAgICAgICAgfSk7XG4gICAgICAgIGVhc2luZyA9IFIuaXMoZWFzaW5nLCBzdHJpbmcpID8gZWFzaW5nIDogY29sbGVjdG9yO1xuICAgICAgICB2YXIgYW5pbSA9IFIuYW5pbWF0aW9uKHBhcmFtcywgbXMsIGVhc2luZywgY29sbGVjdG9yKTtcbiAgICAgICAgaXRlbSA9IHRoaXMuaXRlbXNbLS1pXS5hbmltYXRlKGFuaW0pO1xuICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICB0aGlzLml0ZW1zW2ldICYmICF0aGlzLml0ZW1zW2ldLnJlbW92ZWQgJiYgdGhpcy5pdGVtc1tpXS5hbmltYXRlV2l0aChpdGVtLCBhbmltLCBhbmltKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIHNldHByb3RvLmluc2VydEFmdGVyID0gZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgIHZhciBpID0gdGhpcy5pdGVtcy5sZW5ndGg7XG4gICAgICAgIHdoaWxlIChpLS0pIHtcbiAgICAgICAgICAgIHRoaXMuaXRlbXNbaV0uaW5zZXJ0QWZ0ZXIoZWwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgc2V0cHJvdG8uZ2V0QkJveCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHggPSBbXSxcbiAgICAgICAgICAgIHkgPSBbXSxcbiAgICAgICAgICAgIHgyID0gW10sXG4gICAgICAgICAgICB5MiA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gdGhpcy5pdGVtcy5sZW5ndGg7IGktLTspIGlmICghdGhpcy5pdGVtc1tpXS5yZW1vdmVkKSB7XG4gICAgICAgICAgICB2YXIgYm94ID0gdGhpcy5pdGVtc1tpXS5nZXRCQm94KCk7XG4gICAgICAgICAgICB4LnB1c2goYm94LngpO1xuICAgICAgICAgICAgeS5wdXNoKGJveC55KTtcbiAgICAgICAgICAgIHgyLnB1c2goYm94LnggKyBib3gud2lkdGgpO1xuICAgICAgICAgICAgeTIucHVzaChib3gueSArIGJveC5oZWlnaHQpO1xuICAgICAgICB9XG4gICAgICAgIHggPSBtbWluW2FwcGx5XSgwLCB4KTtcbiAgICAgICAgeSA9IG1taW5bYXBwbHldKDAsIHkpO1xuICAgICAgICB4MiA9IG1tYXhbYXBwbHldKDAsIHgyKTtcbiAgICAgICAgeTIgPSBtbWF4W2FwcGx5XSgwLCB5Mik7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiB4LFxuICAgICAgICAgICAgeTogeSxcbiAgICAgICAgICAgIHgyOiB4MixcbiAgICAgICAgICAgIHkyOiB5MixcbiAgICAgICAgICAgIHdpZHRoOiB4MiAtIHgsXG4gICAgICAgICAgICBoZWlnaHQ6IHkyIC0geVxuICAgICAgICB9O1xuICAgIH07XG4gICAgc2V0cHJvdG8uY2xvbmUgPSBmdW5jdGlvbiAocykge1xuICAgICAgICBzID0gbmV3IFNldDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gdGhpcy5pdGVtcy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICBzLnB1c2godGhpcy5pdGVtc1tpXS5jbG9uZSgpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcztcbiAgICB9O1xuICAgIHNldHByb3RvLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gXCJSYXBoYVxceGVibFxcdTIwMThzIHNldFwiO1xuICAgIH07XG5cbiAgICBcbiAgICBSLnJlZ2lzdGVyRm9udCA9IGZ1bmN0aW9uIChmb250KSB7XG4gICAgICAgIGlmICghZm9udC5mYWNlKSB7XG4gICAgICAgICAgICByZXR1cm4gZm9udDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZvbnRzID0gdGhpcy5mb250cyB8fCB7fTtcbiAgICAgICAgdmFyIGZvbnRjb3B5ID0ge1xuICAgICAgICAgICAgICAgIHc6IGZvbnQudyxcbiAgICAgICAgICAgICAgICBmYWNlOiB7fSxcbiAgICAgICAgICAgICAgICBnbHlwaHM6IHt9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZmFtaWx5ID0gZm9udC5mYWNlW1wiZm9udC1mYW1pbHlcIl07XG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gZm9udC5mYWNlKSBpZiAoZm9udC5mYWNlW2hhc10ocHJvcCkpIHtcbiAgICAgICAgICAgIGZvbnRjb3B5LmZhY2VbcHJvcF0gPSBmb250LmZhY2VbcHJvcF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuZm9udHNbZmFtaWx5XSkge1xuICAgICAgICAgICAgdGhpcy5mb250c1tmYW1pbHldLnB1c2goZm9udGNvcHkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5mb250c1tmYW1pbHldID0gW2ZvbnRjb3B5XTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWZvbnQuc3ZnKSB7XG4gICAgICAgICAgICBmb250Y29weS5mYWNlW1widW5pdHMtcGVyLWVtXCJdID0gdG9JbnQoZm9udC5mYWNlW1widW5pdHMtcGVyLWVtXCJdLCAxMCk7XG4gICAgICAgICAgICBmb3IgKHZhciBnbHlwaCBpbiBmb250LmdseXBocykgaWYgKGZvbnQuZ2x5cGhzW2hhc10oZ2x5cGgpKSB7XG4gICAgICAgICAgICAgICAgdmFyIHBhdGggPSBmb250LmdseXBoc1tnbHlwaF07XG4gICAgICAgICAgICAgICAgZm9udGNvcHkuZ2x5cGhzW2dseXBoXSA9IHtcbiAgICAgICAgICAgICAgICAgICAgdzogcGF0aC53LFxuICAgICAgICAgICAgICAgICAgICBrOiB7fSxcbiAgICAgICAgICAgICAgICAgICAgZDogcGF0aC5kICYmIFwiTVwiICsgcGF0aC5kLnJlcGxhY2UoL1ttbGN4dHJ2XS9nLCBmdW5jdGlvbiAoY29tbWFuZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7bDogXCJMXCIsIGM6IFwiQ1wiLCB4OiBcInpcIiwgdDogXCJtXCIsIHI6IFwibFwiLCB2OiBcImNcIn1bY29tbWFuZF0gfHwgXCJNXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KSArIFwielwiXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBpZiAocGF0aC5rKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAodmFyIGsgaW4gcGF0aC5rKSBpZiAocGF0aFtoYXNdKGspKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb250Y29weS5nbHlwaHNbZ2x5cGhdLmtba10gPSBwYXRoLmtba107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZvbnQ7XG4gICAgfTtcbiAgICBcbiAgICBwYXBlcnByb3RvLmdldEZvbnQgPSBmdW5jdGlvbiAoZmFtaWx5LCB3ZWlnaHQsIHN0eWxlLCBzdHJldGNoKSB7XG4gICAgICAgIHN0cmV0Y2ggPSBzdHJldGNoIHx8IFwibm9ybWFsXCI7XG4gICAgICAgIHN0eWxlID0gc3R5bGUgfHwgXCJub3JtYWxcIjtcbiAgICAgICAgd2VpZ2h0ID0gK3dlaWdodCB8fCB7bm9ybWFsOiA0MDAsIGJvbGQ6IDcwMCwgbGlnaHRlcjogMzAwLCBib2xkZXI6IDgwMH1bd2VpZ2h0XSB8fCA0MDA7XG4gICAgICAgIGlmICghUi5mb250cykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBmb250ID0gUi5mb250c1tmYW1pbHldO1xuICAgICAgICBpZiAoIWZvbnQpIHtcbiAgICAgICAgICAgIHZhciBuYW1lID0gbmV3IFJlZ0V4cChcIihefFxcXFxzKVwiICsgZmFtaWx5LnJlcGxhY2UoL1teXFx3XFxkXFxzKyF+LjpfLV0vZywgRSkgKyBcIihcXFxcc3wkKVwiLCBcImlcIik7XG4gICAgICAgICAgICBmb3IgKHZhciBmb250TmFtZSBpbiBSLmZvbnRzKSBpZiAoUi5mb250c1toYXNdKGZvbnROYW1lKSkge1xuICAgICAgICAgICAgICAgIGlmIChuYW1lLnRlc3QoZm9udE5hbWUpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvbnQgPSBSLmZvbnRzW2ZvbnROYW1lXTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHZhciB0aGVmb250O1xuICAgICAgICBpZiAoZm9udCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gZm9udC5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdGhlZm9udCA9IGZvbnRbaV07XG4gICAgICAgICAgICAgICAgaWYgKHRoZWZvbnQuZmFjZVtcImZvbnQtd2VpZ2h0XCJdID09IHdlaWdodCAmJiAodGhlZm9udC5mYWNlW1wiZm9udC1zdHlsZVwiXSA9PSBzdHlsZSB8fCAhdGhlZm9udC5mYWNlW1wiZm9udC1zdHlsZVwiXSkgJiYgdGhlZm9udC5mYWNlW1wiZm9udC1zdHJldGNoXCJdID09IHN0cmV0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGVmb250O1xuICAgIH07XG4gICAgXG4gICAgcGFwZXJwcm90by5wcmludCA9IGZ1bmN0aW9uICh4LCB5LCBzdHJpbmcsIGZvbnQsIHNpemUsIG9yaWdpbiwgbGV0dGVyX3NwYWNpbmcpIHtcbiAgICAgICAgb3JpZ2luID0gb3JpZ2luIHx8IFwibWlkZGxlXCI7IC8vIGJhc2VsaW5lfG1pZGRsZVxuICAgICAgICBsZXR0ZXJfc3BhY2luZyA9IG1tYXgobW1pbihsZXR0ZXJfc3BhY2luZyB8fCAwLCAxKSwgLTEpO1xuICAgICAgICB2YXIgbGV0dGVycyA9IFN0cihzdHJpbmcpW3NwbGl0XShFKSxcbiAgICAgICAgICAgIHNoaWZ0ID0gMCxcbiAgICAgICAgICAgIG5vdGZpcnN0ID0gMCxcbiAgICAgICAgICAgIHBhdGggPSBFLFxuICAgICAgICAgICAgc2NhbGU7XG4gICAgICAgIFIuaXMoZm9udCwgc3RyaW5nKSAmJiAoZm9udCA9IHRoaXMuZ2V0Rm9udChmb250KSk7XG4gICAgICAgIGlmIChmb250KSB7XG4gICAgICAgICAgICBzY2FsZSA9IChzaXplIHx8IDE2KSAvIGZvbnQuZmFjZVtcInVuaXRzLXBlci1lbVwiXTtcbiAgICAgICAgICAgIHZhciBiYiA9IGZvbnQuZmFjZS5iYm94W3NwbGl0XShzZXBhcmF0b3IpLFxuICAgICAgICAgICAgICAgIHRvcCA9ICtiYlswXSxcbiAgICAgICAgICAgICAgICBsaW5lSGVpZ2h0ID0gYmJbM10gLSBiYlsxXSxcbiAgICAgICAgICAgICAgICBzaGlmdHkgPSAwLFxuICAgICAgICAgICAgICAgIGhlaWdodCA9ICtiYlsxXSArIChvcmlnaW4gPT0gXCJiYXNlbGluZVwiID8gbGluZUhlaWdodCArICgrZm9udC5mYWNlLmRlc2NlbnQpIDogbGluZUhlaWdodCAvIDIpO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gbGV0dGVycy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxldHRlcnNbaV0gPT0gXCJcXG5cIikge1xuICAgICAgICAgICAgICAgICAgICBzaGlmdCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGN1cnIgPSAwO1xuICAgICAgICAgICAgICAgICAgICBub3RmaXJzdCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIHNoaWZ0eSArPSBsaW5lSGVpZ2h0O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwcmV2ID0gbm90Zmlyc3QgJiYgZm9udC5nbHlwaHNbbGV0dGVyc1tpIC0gMV1dIHx8IHt9LFxuICAgICAgICAgICAgICAgICAgICAgICAgY3VyciA9IGZvbnQuZ2x5cGhzW2xldHRlcnNbaV1dO1xuICAgICAgICAgICAgICAgICAgICBzaGlmdCArPSBub3RmaXJzdCA/IChwcmV2LncgfHwgZm9udC53KSArIChwcmV2LmsgJiYgcHJldi5rW2xldHRlcnNbaV1dIHx8IDApICsgKGZvbnQudyAqIGxldHRlcl9zcGFjaW5nKSA6IDA7XG4gICAgICAgICAgICAgICAgICAgIG5vdGZpcnN0ID0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGN1cnIgJiYgY3Vyci5kKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhdGggKz0gUi50cmFuc2Zvcm1QYXRoKGN1cnIuZCwgW1widFwiLCBzaGlmdCAqIHNjYWxlLCBzaGlmdHkgKiBzY2FsZSwgXCJzXCIsIHNjYWxlLCBzY2FsZSwgdG9wLCBoZWlnaHQsIFwidFwiLCAoeCAtIHRvcCkgLyBzY2FsZSwgKHkgLSBoZWlnaHQpIC8gc2NhbGVdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMucGF0aChwYXRoKS5hdHRyKHtcbiAgICAgICAgICAgIGZpbGw6IFwiIzAwMFwiLFxuICAgICAgICAgICAgc3Ryb2tlOiBcIm5vbmVcIlxuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgXG4gICAgcGFwZXJwcm90by5hZGQgPSBmdW5jdGlvbiAoanNvbikge1xuICAgICAgICBpZiAoUi5pcyhqc29uLCBcImFycmF5XCIpKSB7XG4gICAgICAgICAgICB2YXIgcmVzID0gdGhpcy5zZXQoKSxcbiAgICAgICAgICAgICAgICBpID0gMCxcbiAgICAgICAgICAgICAgICBpaSA9IGpzb24ubGVuZ3RoLFxuICAgICAgICAgICAgICAgIGo7XG4gICAgICAgICAgICBmb3IgKDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBqID0ganNvbltpXSB8fCB7fTtcbiAgICAgICAgICAgICAgICBlbGVtZW50c1toYXNdKGoudHlwZSkgJiYgcmVzLnB1c2godGhpc1tqLnR5cGVdKCkuYXR0cihqKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9O1xuXG4gICAgXG4gICAgUi5mb3JtYXQgPSBmdW5jdGlvbiAodG9rZW4sIHBhcmFtcykge1xuICAgICAgICB2YXIgYXJncyA9IFIuaXMocGFyYW1zLCBhcnJheSkgPyBbMF1bY29uY2F0XShwYXJhbXMpIDogYXJndW1lbnRzO1xuICAgICAgICB0b2tlbiAmJiBSLmlzKHRva2VuLCBzdHJpbmcpICYmIGFyZ3MubGVuZ3RoIC0gMSAmJiAodG9rZW4gPSB0b2tlbi5yZXBsYWNlKGZvcm1hdHJnLCBmdW5jdGlvbiAoc3RyLCBpKSB7XG4gICAgICAgICAgICByZXR1cm4gYXJnc1srK2ldID09IG51bGwgPyBFIDogYXJnc1tpXTtcbiAgICAgICAgfSkpO1xuICAgICAgICByZXR1cm4gdG9rZW4gfHwgRTtcbiAgICB9O1xuICAgIFxuICAgIFIuZnVsbGZpbGwgPSAoZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgdG9rZW5SZWdleCA9IC9cXHsoW15cXH1dKylcXH0vZyxcbiAgICAgICAgICAgIG9iak5vdGF0aW9uUmVnZXggPSAvKD86KD86XnxcXC4pKC4rPykoPz1cXFt8XFwufCR8XFwoKXxcXFsoJ3xcIikoLis/KVxcMlxcXSkoXFwoXFwpKT8vZywgLy8gbWF0Y2hlcyAueHh4eHggb3IgW1wieHh4eHhcIl0gdG8gcnVuIG92ZXIgb2JqZWN0IHByb3BlcnRpZXNcbiAgICAgICAgICAgIHJlcGxhY2VyID0gZnVuY3Rpb24gKGFsbCwga2V5LCBvYmopIHtcbiAgICAgICAgICAgICAgICB2YXIgcmVzID0gb2JqO1xuICAgICAgICAgICAgICAgIGtleS5yZXBsYWNlKG9iak5vdGF0aW9uUmVnZXgsIGZ1bmN0aW9uIChhbGwsIG5hbWUsIHF1b3RlLCBxdW90ZWROYW1lLCBpc0Z1bmMpIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZSA9IG5hbWUgfHwgcXVvdGVkTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUgaW4gcmVzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzID0gcmVzW25hbWVdO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIHJlcyA9PSBcImZ1bmN0aW9uXCIgJiYgaXNGdW5jICYmIChyZXMgPSByZXMoKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXMgPSAocmVzID09IG51bGwgfHwgcmVzID09IG9iaiA/IGFsbCA6IHJlcykgKyBcIlwiO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXM7XG4gICAgICAgICAgICB9O1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHN0ciwgb2JqKSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nKHN0cikucmVwbGFjZSh0b2tlblJlZ2V4LCBmdW5jdGlvbiAoYWxsLCBrZXkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVwbGFjZXIoYWxsLCBrZXksIG9iaik7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICB9KSgpO1xuICAgIFxuICAgIFIubmluamEgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG9sZFJhcGhhZWwud2FzID8gKGcud2luLlJhcGhhZWwgPSBvbGRSYXBoYWVsLmlzKSA6IGRlbGV0ZSBSYXBoYWVsO1xuICAgICAgICByZXR1cm4gUjtcbiAgICB9O1xuICAgIFxuICAgIFIuc3QgPSBzZXRwcm90bztcbiAgICAvLyBCUk9XU0VSSUZZIE1PRDogdXNlIFIuX2cuZG9jIGluc3RlYWQgb2YgZG9jdW1lbnRcbiAgICAvLyBGaXJlZm94IDwzLjYgZml4OiBodHRwOi8vd2VicmVmbGVjdGlvbi5ibG9nc3BvdC5jb20vMjAwOS8xMS8xOTUtY2hhcnMtdG8taGVscC1sYXp5LWxvYWRpbmcuaHRtbFxuICAgIChmdW5jdGlvbiAoZG9jLCBsb2FkZWQsIGYpIHtcbiAgICAgICAgaWYgKGRvYy5yZWFkeVN0YXRlID09IG51bGwgJiYgZG9jLmFkZEV2ZW50TGlzdGVuZXIpe1xuICAgICAgICAgICAgZG9jLmFkZEV2ZW50TGlzdGVuZXIobG9hZGVkLCBmID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGRvYy5yZW1vdmVFdmVudExpc3RlbmVyKGxvYWRlZCwgZiwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGRvYy5yZWFkeVN0YXRlID0gXCJjb21wbGV0ZVwiO1xuICAgICAgICAgICAgfSwgZmFsc2UpO1xuICAgICAgICAgICAgZG9jLnJlYWR5U3RhdGUgPSBcImxvYWRpbmdcIjtcbiAgICAgICAgfVxuICAgICAgICBmdW5jdGlvbiBpc0xvYWRlZCgpIHtcbiAgICAgICAgICAgICgvaW4vKS50ZXN0KGRvYy5yZWFkeVN0YXRlKSA/IHNldFRpbWVvdXQoaXNMb2FkZWQsIDkpIDogUi5ldmUoXCJyYXBoYWVsLkRPTWxvYWRcIik7XG4gICAgICAgIH1cbiAgICAgICAgaXNMb2FkZWQoKTtcbiAgICB9KShSLl9nLmRvYywgXCJET01Db250ZW50TG9hZGVkXCIpO1xuXG4gICAgLy8gQlJPV1NFUklGWSBNT0Q6IGFsd2F5cyBzZXQgZmlsZS1zY29wZSBSYXBoYWVsID0gUlxuICAgIC8vIG9sZFJhcGhhZWwud2FzID8gKGcud2luLlJhcGhhZWwgPSBSKSA6IChSYXBoYWVsID0gUik7XG4gICAgLy8gaWYgKG9sZFJhcGhhZWwud2FzKSBnLndpbi5SYXBoYWVsID0gUjtcbiAgICBSYXBoYWVsID0gUjtcbiAgICBcbiAgICBldmUub24oXCJyYXBoYWVsLkRPTWxvYWRcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICBsb2FkZWQgPSB0cnVlO1xuICAgIH0pO1xufSkoKTtcblxuLy8gY29uc29sZS5sb2coUmFwaGFlbCk7XG5cbi8vIOKUjOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUkCBcXFxcXG4vLyDilIIgUmFwaGHDq2wgLSBKYXZhU2NyaXB0IFZlY3RvciBMaWJyYXJ5ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4pSCIFxcXFxcbi8vIOKUnOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUpCBcXFxcXG4vLyDilIIgU1ZHIE1vZHVsZSAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDilIIgXFxcXFxuLy8g4pSc4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSkIFxcXFxcbi8vIOKUgiBDb3B5cmlnaHQgKGMpIDIwMDgtMjAxMSBEbWl0cnkgQmFyYW5vdnNraXkgKGh0dHA6Ly9yYXBoYWVsanMuY29tKSAgIOKUgiBcXFxcXG4vLyDilIIgQ29weXJpZ2h0IChjKSAyMDA4LTIwMTEgU2VuY2hhIExhYnMgKGh0dHA6Ly9zZW5jaGEuY29tKSAgICAgICAgICAgICDilIIgXFxcXFxuLy8g4pSCIExpY2Vuc2VkIHVuZGVyIHRoZSBNSVQgKGh0dHA6Ly9yYXBoYWVsanMuY29tL2xpY2Vuc2UuaHRtbCkgbGljZW5zZS4g4pSCIFxcXFxcbi8vIOKUlOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUmCBcXFxcXG4vLyBCUk9XU0VSSUZZIE1PRDogdXNlIFJhcGhhZWwgaW5zdGVhZCBvZiB3aW5kb3cucmFwaGFlbFxuUmFwaGFlbC5zdmcgJiYgZnVuY3Rpb24gKFIpIHtcbiAgICB2YXIgaGFzID0gXCJoYXNPd25Qcm9wZXJ0eVwiLFxuICAgICAgICBTdHIgPSBTdHJpbmcsXG4gICAgICAgIHRvRmxvYXQgPSBwYXJzZUZsb2F0LFxuICAgICAgICB0b0ludCA9IHBhcnNlSW50LFxuICAgICAgICBtYXRoID0gTWF0aCxcbiAgICAgICAgbW1heCA9IG1hdGgubWF4LFxuICAgICAgICBhYnMgPSBtYXRoLmFicyxcbiAgICAgICAgcG93ID0gbWF0aC5wb3csXG4gICAgICAgIHNlcGFyYXRvciA9IC9bLCBdKy8sXG4gICAgICAgIGV2ZSA9IFIuZXZlLFxuICAgICAgICBFID0gXCJcIixcbiAgICAgICAgUyA9IFwiIFwiO1xuICAgIHZhciB4bGluayA9IFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiLFxuICAgICAgICBtYXJrZXJzID0ge1xuICAgICAgICAgICAgYmxvY2s6IFwiTTUsMCAwLDIuNSA1LDV6XCIsXG4gICAgICAgICAgICBjbGFzc2ljOiBcIk01LDAgMCwyLjUgNSw1IDMuNSwzIDMuNSwyelwiLFxuICAgICAgICAgICAgZGlhbW9uZDogXCJNMi41LDAgNSwyLjUgMi41LDUgMCwyLjV6XCIsXG4gICAgICAgICAgICBvcGVuOiBcIk02LDEgMSwzLjUgNiw2XCIsXG4gICAgICAgICAgICBvdmFsOiBcIk0yLjUsMEEyLjUsMi41LDAsMCwxLDIuNSw1IDIuNSwyLjUsMCwwLDEsMi41LDB6XCJcbiAgICAgICAgfSxcbiAgICAgICAgbWFya2VyQ291bnRlciA9IHt9O1xuICAgIFIudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAgXCJZb3VyIGJyb3dzZXIgc3VwcG9ydHMgU1ZHLlxcbllvdSBhcmUgcnVubmluZyBSYXBoYVxceGVibCBcIiArIHRoaXMudmVyc2lvbjtcbiAgICB9O1xuICAgIHZhciAkID0gZnVuY3Rpb24gKGVsLCBhdHRyKSB7XG4gICAgICAgIGlmIChhdHRyKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGVsID09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgICAgICAgICBlbCA9ICQoZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yICh2YXIga2V5IGluIGF0dHIpIGlmIChhdHRyW2hhc10oa2V5KSkge1xuICAgICAgICAgICAgICAgIGlmIChrZXkuc3Vic3RyaW5nKDAsIDYpID09IFwieGxpbms6XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlTlMoeGxpbmssIGtleS5zdWJzdHJpbmcoNiksIFN0cihhdHRyW2tleV0pKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoa2V5LCBTdHIoYXR0cltrZXldKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWwgPSBSLl9nLmRvYy5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLCBlbCk7XG4gICAgICAgICAgICBlbC5zdHlsZSAmJiAoZWwuc3R5bGUud2Via2l0VGFwSGlnaGxpZ2h0Q29sb3IgPSBcInJnYmEoMCwwLDAsMClcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVsO1xuICAgIH0sXG4gICAgYWRkR3JhZGllbnRGaWxsID0gZnVuY3Rpb24gKGVsZW1lbnQsIGdyYWRpZW50KSB7XG4gICAgICAgIHZhciB0eXBlID0gXCJsaW5lYXJcIixcbiAgICAgICAgICAgIGlkID0gZWxlbWVudC5pZCArIGdyYWRpZW50LFxuICAgICAgICAgICAgZnggPSAuNSwgZnkgPSAuNSxcbiAgICAgICAgICAgIG8gPSBlbGVtZW50Lm5vZGUsXG4gICAgICAgICAgICBTVkcgPSBlbGVtZW50LnBhcGVyLFxuICAgICAgICAgICAgcyA9IG8uc3R5bGUsXG4gICAgICAgICAgICBlbCA9IFIuX2cuZG9jLmdldEVsZW1lbnRCeUlkKGlkKTtcbiAgICAgICAgaWYgKCFlbCkge1xuICAgICAgICAgICAgZ3JhZGllbnQgPSBTdHIoZ3JhZGllbnQpLnJlcGxhY2UoUi5fcmFkaWFsX2dyYWRpZW50LCBmdW5jdGlvbiAoYWxsLCBfZngsIF9meSkge1xuICAgICAgICAgICAgICAgIHR5cGUgPSBcInJhZGlhbFwiO1xuICAgICAgICAgICAgICAgIGlmIChfZnggJiYgX2Z5KSB7XG4gICAgICAgICAgICAgICAgICAgIGZ4ID0gdG9GbG9hdChfZngpO1xuICAgICAgICAgICAgICAgICAgICBmeSA9IHRvRmxvYXQoX2Z5KTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRpciA9ICgoZnkgPiAuNSkgKiAyIC0gMSk7XG4gICAgICAgICAgICAgICAgICAgIHBvdyhmeCAtIC41LCAyKSArIHBvdyhmeSAtIC41LCAyKSA+IC4yNSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgKGZ5ID0gbWF0aC5zcXJ0KC4yNSAtIHBvdyhmeCAtIC41LCAyKSkgKiBkaXIgKyAuNSkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ5ICE9IC41ICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAoZnkgPSBmeS50b0ZpeGVkKDUpIC0gMWUtNSAqIGRpcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBFO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBncmFkaWVudCA9IGdyYWRpZW50LnNwbGl0KC9cXHMqXFwtXFxzKi8pO1xuICAgICAgICAgICAgaWYgKHR5cGUgPT0gXCJsaW5lYXJcIikge1xuICAgICAgICAgICAgICAgIHZhciBhbmdsZSA9IGdyYWRpZW50LnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgYW5nbGUgPSAtdG9GbG9hdChhbmdsZSk7XG4gICAgICAgICAgICAgICAgaWYgKGlzTmFOKGFuZ2xlKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIHZlY3RvciA9IFswLCAwLCBtYXRoLmNvcyhSLnJhZChhbmdsZSkpLCBtYXRoLnNpbihSLnJhZChhbmdsZSkpXSxcbiAgICAgICAgICAgICAgICAgICAgbWF4ID0gMSAvIChtbWF4KGFicyh2ZWN0b3JbMl0pLCBhYnModmVjdG9yWzNdKSkgfHwgMSk7XG4gICAgICAgICAgICAgICAgdmVjdG9yWzJdICo9IG1heDtcbiAgICAgICAgICAgICAgICB2ZWN0b3JbM10gKj0gbWF4O1xuICAgICAgICAgICAgICAgIGlmICh2ZWN0b3JbMl0gPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZlY3RvclswXSA9IC12ZWN0b3JbMl07XG4gICAgICAgICAgICAgICAgICAgIHZlY3RvclsyXSA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh2ZWN0b3JbM10gPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZlY3RvclsxXSA9IC12ZWN0b3JbM107XG4gICAgICAgICAgICAgICAgICAgIHZlY3RvclszXSA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGRvdHMgPSBSLl9wYXJzZURvdHMoZ3JhZGllbnQpO1xuICAgICAgICAgICAgaWYgKCFkb3RzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZCA9IGlkLnJlcGxhY2UoL1tcXChcXClcXHMsXFx4YjAjXS9nLCBcIl9cIik7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChlbGVtZW50LmdyYWRpZW50ICYmIGlkICE9IGVsZW1lbnQuZ3JhZGllbnQuaWQpIHtcbiAgICAgICAgICAgICAgICBTVkcuZGVmcy5yZW1vdmVDaGlsZChlbGVtZW50LmdyYWRpZW50KTtcbiAgICAgICAgICAgICAgICBkZWxldGUgZWxlbWVudC5ncmFkaWVudDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFlbGVtZW50LmdyYWRpZW50KSB7XG4gICAgICAgICAgICAgICAgZWwgPSAkKHR5cGUgKyBcIkdyYWRpZW50XCIsIHtpZDogaWR9KTtcbiAgICAgICAgICAgICAgICBlbGVtZW50LmdyYWRpZW50ID0gZWw7XG4gICAgICAgICAgICAgICAgJChlbCwgdHlwZSA9PSBcInJhZGlhbFwiID8ge1xuICAgICAgICAgICAgICAgICAgICBmeDogZngsXG4gICAgICAgICAgICAgICAgICAgIGZ5OiBmeVxuICAgICAgICAgICAgICAgIH0gOiB7XG4gICAgICAgICAgICAgICAgICAgIHgxOiB2ZWN0b3JbMF0sXG4gICAgICAgICAgICAgICAgICAgIHkxOiB2ZWN0b3JbMV0sXG4gICAgICAgICAgICAgICAgICAgIHgyOiB2ZWN0b3JbMl0sXG4gICAgICAgICAgICAgICAgICAgIHkyOiB2ZWN0b3JbM10sXG4gICAgICAgICAgICAgICAgICAgIGdyYWRpZW50VHJhbnNmb3JtOiBlbGVtZW50Lm1hdHJpeC5pbnZlcnQoKVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFNWRy5kZWZzLmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBkb3RzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgZWwuYXBwZW5kQ2hpbGQoJChcInN0b3BcIiwge1xuICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0OiBkb3RzW2ldLm9mZnNldCA/IGRvdHNbaV0ub2Zmc2V0IDogaSA/IFwiMTAwJVwiIDogXCIwJVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJzdG9wLWNvbG9yXCI6IGRvdHNbaV0uY29sb3IgfHwgXCIjZmZmXCJcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkKG8sIHtcbiAgICAgICAgICAgIGZpbGw6IFwidXJsKCNcIiArIGlkICsgXCIpXCIsXG4gICAgICAgICAgICBvcGFjaXR5OiAxLFxuICAgICAgICAgICAgXCJmaWxsLW9wYWNpdHlcIjogMVxuICAgICAgICB9KTtcbiAgICAgICAgcy5maWxsID0gRTtcbiAgICAgICAgcy5vcGFjaXR5ID0gMTtcbiAgICAgICAgcy5maWxsT3BhY2l0eSA9IDE7XG4gICAgICAgIHJldHVybiAxO1xuICAgIH0sXG4gICAgdXBkYXRlUG9zaXRpb24gPSBmdW5jdGlvbiAobykge1xuICAgICAgICB2YXIgYmJveCA9IG8uZ2V0QkJveCgxKTtcbiAgICAgICAgJChvLnBhdHRlcm4sIHtwYXR0ZXJuVHJhbnNmb3JtOiBvLm1hdHJpeC5pbnZlcnQoKSArIFwiIHRyYW5zbGF0ZShcIiArIGJib3gueCArIFwiLFwiICsgYmJveC55ICsgXCIpXCJ9KTtcbiAgICB9LFxuICAgIGFkZEFycm93ID0gZnVuY3Rpb24gKG8sIHZhbHVlLCBpc0VuZCkge1xuICAgICAgICBpZiAoby50eXBlID09IFwicGF0aFwiKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWVzID0gU3RyKHZhbHVlKS50b0xvd2VyQ2FzZSgpLnNwbGl0KFwiLVwiKSxcbiAgICAgICAgICAgICAgICBwID0gby5wYXBlcixcbiAgICAgICAgICAgICAgICBzZSA9IGlzRW5kID8gXCJlbmRcIiA6IFwic3RhcnRcIixcbiAgICAgICAgICAgICAgICBub2RlID0gby5ub2RlLFxuICAgICAgICAgICAgICAgIGF0dHJzID0gby5hdHRycyxcbiAgICAgICAgICAgICAgICBzdHJva2UgPSBhdHRyc1tcInN0cm9rZS13aWR0aFwiXSxcbiAgICAgICAgICAgICAgICBpID0gdmFsdWVzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICB0eXBlID0gXCJjbGFzc2ljXCIsXG4gICAgICAgICAgICAgICAgZnJvbSxcbiAgICAgICAgICAgICAgICB0byxcbiAgICAgICAgICAgICAgICBkeCxcbiAgICAgICAgICAgICAgICByZWZYLFxuICAgICAgICAgICAgICAgIGF0dHIsXG4gICAgICAgICAgICAgICAgdyA9IDMsXG4gICAgICAgICAgICAgICAgaCA9IDMsXG4gICAgICAgICAgICAgICAgdCA9IDU7XG4gICAgICAgICAgICB3aGlsZSAoaS0tKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoICh2YWx1ZXNbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImJsb2NrXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJjbGFzc2ljXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJvdmFsXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJkaWFtb25kXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJvcGVuXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJub25lXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlID0gdmFsdWVzW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ3aWRlXCI6IGggPSA1OyBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIm5hcnJvd1wiOiBoID0gMjsgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJsb25nXCI6IHcgPSA1OyBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInNob3J0XCI6IHcgPSAyOyBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAodHlwZSA9PSBcIm9wZW5cIikge1xuICAgICAgICAgICAgICAgIHcgKz0gMjtcbiAgICAgICAgICAgICAgICBoICs9IDI7XG4gICAgICAgICAgICAgICAgdCArPSAyO1xuICAgICAgICAgICAgICAgIGR4ID0gMTtcbiAgICAgICAgICAgICAgICByZWZYID0gaXNFbmQgPyA0IDogMTtcbiAgICAgICAgICAgICAgICBhdHRyID0ge1xuICAgICAgICAgICAgICAgICAgICBmaWxsOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICAgICAgc3Ryb2tlOiBhdHRycy5zdHJva2VcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWZYID0gZHggPSB3IC8gMjtcbiAgICAgICAgICAgICAgICBhdHRyID0ge1xuICAgICAgICAgICAgICAgICAgICBmaWxsOiBhdHRycy5zdHJva2UsXG4gICAgICAgICAgICAgICAgICAgIHN0cm9rZTogXCJub25lXCJcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG8uXy5hcnJvd3MpIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNFbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgby5fLmFycm93cy5lbmRQYXRoICYmIG1hcmtlckNvdW50ZXJbby5fLmFycm93cy5lbmRQYXRoXS0tO1xuICAgICAgICAgICAgICAgICAgICBvLl8uYXJyb3dzLmVuZE1hcmtlciAmJiBtYXJrZXJDb3VudGVyW28uXy5hcnJvd3MuZW5kTWFya2VyXS0tO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG8uXy5hcnJvd3Muc3RhcnRQYXRoICYmIG1hcmtlckNvdW50ZXJbby5fLmFycm93cy5zdGFydFBhdGhdLS07XG4gICAgICAgICAgICAgICAgICAgIG8uXy5hcnJvd3Muc3RhcnRNYXJrZXIgJiYgbWFya2VyQ291bnRlcltvLl8uYXJyb3dzLnN0YXJ0TWFya2VyXS0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgby5fLmFycm93cyA9IHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHR5cGUgIT0gXCJub25lXCIpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGF0aElkID0gXCJyYXBoYWVsLW1hcmtlci1cIiArIHR5cGUsXG4gICAgICAgICAgICAgICAgICAgIG1hcmtlcklkID0gXCJyYXBoYWVsLW1hcmtlci1cIiArIHNlICsgdHlwZSArIHcgKyBoO1xuICAgICAgICAgICAgICAgIGlmICghUi5fZy5kb2MuZ2V0RWxlbWVudEJ5SWQocGF0aElkKSkge1xuICAgICAgICAgICAgICAgICAgICBwLmRlZnMuYXBwZW5kQ2hpbGQoJCgkKFwicGF0aFwiKSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJzdHJva2UtbGluZWNhcFwiOiBcInJvdW5kXCIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkOiBtYXJrZXJzW3R5cGVdLFxuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHBhdGhJZFxuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgICAgIG1hcmtlckNvdW50ZXJbcGF0aElkXSA9IDE7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgbWFya2VyQ291bnRlcltwYXRoSWRdKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBtYXJrZXIgPSBSLl9nLmRvYy5nZXRFbGVtZW50QnlJZChtYXJrZXJJZCksXG4gICAgICAgICAgICAgICAgICAgIHVzZTtcbiAgICAgICAgICAgICAgICBpZiAoIW1hcmtlcikge1xuICAgICAgICAgICAgICAgICAgICBtYXJrZXIgPSAkKCQoXCJtYXJrZXJcIiksIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBtYXJrZXJJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmtlckhlaWdodDogaCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hcmtlcldpZHRoOiB3LFxuICAgICAgICAgICAgICAgICAgICAgICAgb3JpZW50OiBcImF1dG9cIixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZlg6IHJlZlgsXG4gICAgICAgICAgICAgICAgICAgICAgICByZWZZOiBoIC8gMlxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgdXNlID0gJCgkKFwidXNlXCIpLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBcInhsaW5rOmhyZWZcIjogXCIjXCIgKyBwYXRoSWQsXG4gICAgICAgICAgICAgICAgICAgICAgICB0cmFuc2Zvcm06IChpc0VuZCA/IFwicm90YXRlKDE4MCBcIiArIHcgLyAyICsgXCIgXCIgKyBoIC8gMiArIFwiKSBcIiA6IEUpICsgXCJzY2FsZShcIiArIHcgLyB0ICsgXCIsXCIgKyBoIC8gdCArIFwiKVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgXCJzdHJva2Utd2lkdGhcIjogKDEgLyAoKHcgLyB0ICsgaCAvIHQpIC8gMikpLnRvRml4ZWQoNClcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIG1hcmtlci5hcHBlbmRDaGlsZCh1c2UpO1xuICAgICAgICAgICAgICAgICAgICBwLmRlZnMuYXBwZW5kQ2hpbGQobWFya2VyKTtcbiAgICAgICAgICAgICAgICAgICAgbWFya2VyQ291bnRlclttYXJrZXJJZF0gPSAxO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG1hcmtlckNvdW50ZXJbbWFya2VySWRdKys7XG4gICAgICAgICAgICAgICAgICAgIHVzZSA9IG1hcmtlci5nZXRFbGVtZW50c0J5VGFnTmFtZShcInVzZVwiKVswXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJCh1c2UsIGF0dHIpO1xuICAgICAgICAgICAgICAgIHZhciBkZWx0YSA9IGR4ICogKHR5cGUgIT0gXCJkaWFtb25kXCIgJiYgdHlwZSAhPSBcIm92YWxcIik7XG4gICAgICAgICAgICAgICAgaWYgKGlzRW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIGZyb20gPSBvLl8uYXJyb3dzLnN0YXJ0ZHggKiBzdHJva2UgfHwgMDtcbiAgICAgICAgICAgICAgICAgICAgdG8gPSBSLmdldFRvdGFsTGVuZ3RoKGF0dHJzLnBhdGgpIC0gZGVsdGEgKiBzdHJva2U7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZnJvbSA9IGRlbHRhICogc3Ryb2tlO1xuICAgICAgICAgICAgICAgICAgICB0byA9IFIuZ2V0VG90YWxMZW5ndGgoYXR0cnMucGF0aCkgLSAoby5fLmFycm93cy5lbmRkeCAqIHN0cm9rZSB8fCAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYXR0ciA9IHt9O1xuICAgICAgICAgICAgICAgIGF0dHJbXCJtYXJrZXItXCIgKyBzZV0gPSBcInVybCgjXCIgKyBtYXJrZXJJZCArIFwiKVwiO1xuICAgICAgICAgICAgICAgIGlmICh0byB8fCBmcm9tKSB7XG4gICAgICAgICAgICAgICAgICAgIGF0dHIuZCA9IFJhcGhhZWwuZ2V0U3VicGF0aChhdHRycy5wYXRoLCBmcm9tLCB0byk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQobm9kZSwgYXR0cik7XG4gICAgICAgICAgICAgICAgby5fLmFycm93c1tzZSArIFwiUGF0aFwiXSA9IHBhdGhJZDtcbiAgICAgICAgICAgICAgICBvLl8uYXJyb3dzW3NlICsgXCJNYXJrZXJcIl0gPSBtYXJrZXJJZDtcbiAgICAgICAgICAgICAgICBvLl8uYXJyb3dzW3NlICsgXCJkeFwiXSA9IGRlbHRhO1xuICAgICAgICAgICAgICAgIG8uXy5hcnJvd3Nbc2UgKyBcIlR5cGVcIl0gPSB0eXBlO1xuICAgICAgICAgICAgICAgIG8uXy5hcnJvd3Nbc2UgKyBcIlN0cmluZ1wiXSA9IHZhbHVlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoaXNFbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgZnJvbSA9IG8uXy5hcnJvd3Muc3RhcnRkeCAqIHN0cm9rZSB8fCAwO1xuICAgICAgICAgICAgICAgICAgICB0byA9IFIuZ2V0VG90YWxMZW5ndGgoYXR0cnMucGF0aCkgLSBmcm9tO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGZyb20gPSAwO1xuICAgICAgICAgICAgICAgICAgICB0byA9IFIuZ2V0VG90YWxMZW5ndGgoYXR0cnMucGF0aCkgLSAoby5fLmFycm93cy5lbmRkeCAqIHN0cm9rZSB8fCAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgby5fLmFycm93c1tzZSArIFwiUGF0aFwiXSAmJiAkKG5vZGUsIHtkOiBSYXBoYWVsLmdldFN1YnBhdGgoYXR0cnMucGF0aCwgZnJvbSwgdG8pfSk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIG8uXy5hcnJvd3Nbc2UgKyBcIlBhdGhcIl07XG4gICAgICAgICAgICAgICAgZGVsZXRlIG8uXy5hcnJvd3Nbc2UgKyBcIk1hcmtlclwiXTtcbiAgICAgICAgICAgICAgICBkZWxldGUgby5fLmFycm93c1tzZSArIFwiZHhcIl07XG4gICAgICAgICAgICAgICAgZGVsZXRlIG8uXy5hcnJvd3Nbc2UgKyBcIlR5cGVcIl07XG4gICAgICAgICAgICAgICAgZGVsZXRlIG8uXy5hcnJvd3Nbc2UgKyBcIlN0cmluZ1wiXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciAoYXR0ciBpbiBtYXJrZXJDb3VudGVyKSBpZiAobWFya2VyQ291bnRlcltoYXNdKGF0dHIpICYmICFtYXJrZXJDb3VudGVyW2F0dHJdKSB7XG4gICAgICAgICAgICAgICAgdmFyIGl0ZW0gPSBSLl9nLmRvYy5nZXRFbGVtZW50QnlJZChhdHRyKTtcbiAgICAgICAgICAgICAgICBpdGVtICYmIGl0ZW0ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChpdGVtKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgZGFzaGFycmF5ID0ge1xuICAgICAgICBcIlwiOiBbMF0sXG4gICAgICAgIFwibm9uZVwiOiBbMF0sXG4gICAgICAgIFwiLVwiOiBbMywgMV0sXG4gICAgICAgIFwiLlwiOiBbMSwgMV0sXG4gICAgICAgIFwiLS5cIjogWzMsIDEsIDEsIDFdLFxuICAgICAgICBcIi0uLlwiOiBbMywgMSwgMSwgMSwgMSwgMV0sXG4gICAgICAgIFwiLiBcIjogWzEsIDNdLFxuICAgICAgICBcIi0gXCI6IFs0LCAzXSxcbiAgICAgICAgXCItLVwiOiBbOCwgM10sXG4gICAgICAgIFwiLSAuXCI6IFs0LCAzLCAxLCAzXSxcbiAgICAgICAgXCItLS5cIjogWzgsIDMsIDEsIDNdLFxuICAgICAgICBcIi0tLi5cIjogWzgsIDMsIDEsIDMsIDEsIDNdXG4gICAgfSxcbiAgICBhZGREYXNoZXMgPSBmdW5jdGlvbiAobywgdmFsdWUsIHBhcmFtcykge1xuICAgICAgICB2YWx1ZSA9IGRhc2hhcnJheVtTdHIodmFsdWUpLnRvTG93ZXJDYXNlKCldO1xuICAgICAgICBpZiAodmFsdWUpIHtcbiAgICAgICAgICAgIHZhciB3aWR0aCA9IG8uYXR0cnNbXCJzdHJva2Utd2lkdGhcIl0gfHwgXCIxXCIsXG4gICAgICAgICAgICAgICAgYnV0dCA9IHtyb3VuZDogd2lkdGgsIHNxdWFyZTogd2lkdGgsIGJ1dHQ6IDB9W28uYXR0cnNbXCJzdHJva2UtbGluZWNhcFwiXSB8fCBwYXJhbXNbXCJzdHJva2UtbGluZWNhcFwiXV0gfHwgMCxcbiAgICAgICAgICAgICAgICBkYXNoZXMgPSBbXSxcbiAgICAgICAgICAgICAgICBpID0gdmFsdWUubGVuZ3RoO1xuICAgICAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgICAgIGRhc2hlc1tpXSA9IHZhbHVlW2ldICogd2lkdGggKyAoKGkgJSAyKSA/IDEgOiAtMSkgKiBidXR0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJChvLm5vZGUsIHtcInN0cm9rZS1kYXNoYXJyYXlcIjogZGFzaGVzLmpvaW4oXCIsXCIpfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIHNldEZpbGxBbmRTdHJva2UgPSBmdW5jdGlvbiAobywgcGFyYW1zKSB7XG4gICAgICAgIHZhciBub2RlID0gby5ub2RlLFxuICAgICAgICAgICAgYXR0cnMgPSBvLmF0dHJzLFxuICAgICAgICAgICAgdmlzID0gbm9kZS5zdHlsZS52aXNpYmlsaXR5O1xuICAgICAgICBub2RlLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xuICAgICAgICBmb3IgKHZhciBhdHQgaW4gcGFyYW1zKSB7XG4gICAgICAgICAgICBpZiAocGFyYW1zW2hhc10oYXR0KSkge1xuICAgICAgICAgICAgICAgIGlmICghUi5fYXZhaWxhYmxlQXR0cnNbaGFzXShhdHQpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB2YXIgdmFsdWUgPSBwYXJhbXNbYXR0XTtcbiAgICAgICAgICAgICAgICBhdHRyc1thdHRdID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChhdHQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImJsdXJcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG8uYmx1cih2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImhyZWZcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInRpdGxlXCI6XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ0YXJnZXRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwbiA9IG5vZGUucGFyZW50Tm9kZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwbi50YWdOYW1lLnRvTG93ZXJDYXNlKCkgIT0gXCJhXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgaGwgPSAkKFwiYVwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbi5pbnNlcnRCZWZvcmUoaGwsIG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhsLmFwcGVuZENoaWxkKG5vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBuID0gaGw7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0ID09IFwidGFyZ2V0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwbi5zZXRBdHRyaWJ1dGVOUyh4bGluaywgXCJzaG93XCIsIHZhbHVlID09IFwiYmxhbmtcIiA/IFwibmV3XCIgOiB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBuLnNldEF0dHJpYnV0ZU5TKHhsaW5rLCBhdHQsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY3Vyc29yXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnN0eWxlLmN1cnNvciA9IHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ0cmFuc2Zvcm1cIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG8udHJhbnNmb3JtKHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiYXJyb3ctc3RhcnRcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZEFycm93KG8sIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiYXJyb3ctZW5kXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRBcnJvdyhvLCB2YWx1ZSwgMSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNsaXAtcmVjdFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHJlY3QgPSBTdHIodmFsdWUpLnNwbGl0KHNlcGFyYXRvcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVjdC5sZW5ndGggPT0gNCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG8uY2xpcCAmJiBvLmNsaXAucGFyZW50Tm9kZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG8uY2xpcC5wYXJlbnROb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgZWwgPSAkKFwiY2xpcFBhdGhcIiksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJjID0gJChcInJlY3RcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWwuaWQgPSBSLmNyZWF0ZVVVSUQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHJjLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHg6IHJlY3RbMF0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHk6IHJlY3RbMV0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdpZHRoOiByZWN0WzJdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoZWlnaHQ6IHJlY3RbM11cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbC5hcHBlbmRDaGlsZChyYyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgby5wYXBlci5kZWZzLmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKG5vZGUsIHtcImNsaXAtcGF0aFwiOiBcInVybCgjXCIgKyBlbC5pZCArIFwiKVwifSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgby5jbGlwID0gcmM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHBhdGggPSBub2RlLmdldEF0dHJpYnV0ZShcImNsaXAtcGF0aFwiKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgY2xpcCA9IFIuX2cuZG9jLmdldEVsZW1lbnRCeUlkKHBhdGgucmVwbGFjZSgvKF51cmxcXCgjfFxcKSQpL2csIEUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpcCAmJiBjbGlwLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoY2xpcCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQobm9kZSwge1wiY2xpcC1wYXRoXCI6IEV9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIG8uY2xpcDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwicGF0aFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG8udHlwZSA9PSBcInBhdGhcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQobm9kZSwge2Q6IHZhbHVlID8gYXR0cnMucGF0aCA9IFIuX3BhdGhUb0Fic29sdXRlKHZhbHVlKSA6IFwiTTAsMFwifSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgby5fLmRpcnR5ID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoby5fLmFycm93cykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInN0YXJ0U3RyaW5nXCIgaW4gby5fLmFycm93cyAmJiBhZGRBcnJvdyhvLCBvLl8uYXJyb3dzLnN0YXJ0U3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJlbmRTdHJpbmdcIiBpbiBvLl8uYXJyb3dzICYmIGFkZEFycm93KG8sIG8uXy5hcnJvd3MuZW5kU3RyaW5nLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIndpZHRoXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShhdHQsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG8uXy5kaXJ0eSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0cnMuZngpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHQgPSBcInhcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IGF0dHJzLng7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwieFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJzLmZ4KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSAtYXR0cnMueCAtIChhdHRycy53aWR0aCB8fCAwKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInJ4XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0ID09IFwicnhcIiAmJiBvLnR5cGUgPT0gXCJyZWN0XCIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImN4XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShhdHQsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG8ucGF0dGVybiAmJiB1cGRhdGVQb3NpdGlvbihvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG8uXy5kaXJ0eSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImhlaWdodFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoYXR0LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBvLl8uZGlydHkgPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dHJzLmZ5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0ID0gXCJ5XCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBhdHRycy55O1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInlcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHRycy5meSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gLWF0dHJzLnkgLSAoYXR0cnMuaGVpZ2h0IHx8IDApO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwicnlcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhdHQgPT0gXCJyeVwiICYmIG8udHlwZSA9PSBcInJlY3RcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiY3lcIjpcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKGF0dCwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgby5wYXR0ZXJuICYmIHVwZGF0ZVBvc2l0aW9uKG8pO1xuICAgICAgICAgICAgICAgICAgICAgICAgby5fLmRpcnR5ID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiclwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG8udHlwZSA9PSBcInJlY3RcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQobm9kZSwge3J4OiB2YWx1ZSwgcnk6IHZhbHVlfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKGF0dCwgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgby5fLmRpcnR5ID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3JjXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoby50eXBlID09IFwiaW1hZ2VcIikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuc2V0QXR0cmlidXRlTlMoeGxpbmssIFwiaHJlZlwiLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcInN0cm9rZS13aWR0aFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG8uXy5zeCAhPSAxIHx8IG8uXy5zeSAhPSAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgLz0gbW1heChhYnMoby5fLnN4KSwgYWJzKG8uXy5zeSkpIHx8IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoby5wYXBlci5fdmJTaXplKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgKj0gby5wYXBlci5fdmJTaXplO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoYXR0LCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0cnNbXCJzdHJva2UtZGFzaGFycmF5XCJdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkRGFzaGVzKG8sIGF0dHJzW1wic3Ryb2tlLWRhc2hhcnJheVwiXSwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvLl8uYXJyb3dzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJzdGFydFN0cmluZ1wiIGluIG8uXy5hcnJvd3MgJiYgYWRkQXJyb3cobywgby5fLmFycm93cy5zdGFydFN0cmluZyk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJlbmRTdHJpbmdcIiBpbiBvLl8uYXJyb3dzICYmIGFkZEFycm93KG8sIG8uXy5hcnJvd3MuZW5kU3RyaW5nLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3Ryb2tlLWRhc2hhcnJheVwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgYWRkRGFzaGVzKG8sIHZhbHVlLCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJmaWxsXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgaXNVUkwgPSBTdHIodmFsdWUpLm1hdGNoKFIuX0lTVVJMKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc1VSTCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsID0gJChcInBhdHRlcm5cIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGlnID0gJChcImltYWdlXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLmlkID0gUi5jcmVhdGVVVUlEKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChlbCwge3g6IDAsIHk6IDAsIHBhdHRlcm5Vbml0czogXCJ1c2VyU3BhY2VPblVzZVwiLCBoZWlnaHQ6IDEsIHdpZHRoOiAxfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChpZywge3g6IDAsIHk6IDAsIFwieGxpbms6aHJlZlwiOiBpc1VSTFsxXX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsLmFwcGVuZENoaWxkKGlnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUi5fcHJlbG9hZChpc1VSTFsxXSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHcgPSB0aGlzLm9mZnNldFdpZHRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGggPSB0aGlzLm9mZnNldEhlaWdodDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoZWwsIHt3aWR0aDogdywgaGVpZ2h0OiBofSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKGlnLCB7d2lkdGg6IHcsIGhlaWdodDogaH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgby5wYXBlci5zYWZhcmkoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkoZWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG8ucGFwZXIuZGVmcy5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJChub2RlLCB7ZmlsbDogXCJ1cmwoI1wiICsgZWwuaWQgKyBcIilcIn0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG8ucGF0dGVybiA9IGVsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG8ucGF0dGVybiAmJiB1cGRhdGVQb3NpdGlvbihvKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBjbHIgPSBSLmdldFJHQih2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNsci5lcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBwYXJhbXMuZ3JhZGllbnQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGF0dHJzLmdyYWRpZW50O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICFSLmlzKGF0dHJzLm9wYWNpdHksIFwidW5kZWZpbmVkXCIpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFIuaXMocGFyYW1zLm9wYWNpdHksIFwidW5kZWZpbmVkXCIpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQobm9kZSwge29wYWNpdHk6IGF0dHJzLm9wYWNpdHl9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAhUi5pcyhhdHRyc1tcImZpbGwtb3BhY2l0eVwiXSwgXCJ1bmRlZmluZWRcIikgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgUi5pcyhwYXJhbXNbXCJmaWxsLW9wYWNpdHlcIl0sIFwidW5kZWZpbmVkXCIpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQobm9kZSwge1wiZmlsbC1vcGFjaXR5XCI6IGF0dHJzW1wiZmlsbC1vcGFjaXR5XCJdfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKChvLnR5cGUgPT0gXCJjaXJjbGVcIiB8fCBvLnR5cGUgPT0gXCJlbGxpcHNlXCIgfHwgU3RyKHZhbHVlKS5jaGFyQXQoKSAhPSBcInJcIikgJiYgYWRkR3JhZGllbnRGaWxsKG8sIHZhbHVlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChcIm9wYWNpdHlcIiBpbiBhdHRycyB8fCBcImZpbGwtb3BhY2l0eVwiIGluIGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBncmFkaWVudCA9IFIuX2cuZG9jLmdldEVsZW1lbnRCeUlkKG5vZGUuZ2V0QXR0cmlidXRlKFwiZmlsbFwiKS5yZXBsYWNlKC9edXJsXFwoI3xcXCkkL2csIEUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGdyYWRpZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3RvcHMgPSBncmFkaWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInN0b3BcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkKHN0b3BzW3N0b3BzLmxlbmd0aCAtIDFdLCB7XCJzdG9wLW9wYWNpdHlcIjogKFwib3BhY2l0eVwiIGluIGF0dHJzID8gYXR0cnMub3BhY2l0eSA6IDEpICogKFwiZmlsbC1vcGFjaXR5XCIgaW4gYXR0cnMgPyBhdHRyc1tcImZpbGwtb3BhY2l0eVwiXSA6IDEpfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0cnMuZ3JhZGllbnQgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRycy5maWxsID0gXCJub25lXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjbHJbaGFzXShcIm9wYWNpdHlcIikgJiYgJChub2RlLCB7XCJmaWxsLW9wYWNpdHlcIjogY2xyLm9wYWNpdHkgPiAxID8gY2xyLm9wYWNpdHkgLyAxMDAgOiBjbHIub3BhY2l0eX0pO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3Ryb2tlXCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBjbHIgPSBSLmdldFJHQih2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShhdHQsIGNsci5oZXgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXR0ID09IFwic3Ryb2tlXCIgJiYgY2xyW2hhc10oXCJvcGFjaXR5XCIpICYmICQobm9kZSwge1wic3Ryb2tlLW9wYWNpdHlcIjogY2xyLm9wYWNpdHkgPiAxID8gY2xyLm9wYWNpdHkgLyAxMDAgOiBjbHIub3BhY2l0eX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF0dCA9PSBcInN0cm9rZVwiICYmIG8uXy5hcnJvd3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInN0YXJ0U3RyaW5nXCIgaW4gby5fLmFycm93cyAmJiBhZGRBcnJvdyhvLCBvLl8uYXJyb3dzLnN0YXJ0U3RyaW5nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImVuZFN0cmluZ1wiIGluIG8uXy5hcnJvd3MgJiYgYWRkQXJyb3cobywgby5fLmFycm93cy5lbmRTdHJpbmcsIDEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJncmFkaWVudFwiOlxuICAgICAgICAgICAgICAgICAgICAgICAgKG8udHlwZSA9PSBcImNpcmNsZVwiIHx8IG8udHlwZSA9PSBcImVsbGlwc2VcIiB8fCBTdHIodmFsdWUpLmNoYXJBdCgpICE9IFwiclwiKSAmJiBhZGRHcmFkaWVudEZpbGwobywgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJvcGFjaXR5XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0cnMuZ3JhZGllbnQgJiYgIWF0dHJzW2hhc10oXCJzdHJva2Utb3BhY2l0eVwiKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICQobm9kZSwge1wic3Ryb2tlLW9wYWNpdHlcIjogdmFsdWUgPiAxID8gdmFsdWUgLyAxMDAgOiB2YWx1ZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZmFsbFxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZmlsbC1vcGFjaXR5XCI6XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXR0cnMuZ3JhZGllbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBncmFkaWVudCA9IFIuX2cuZG9jLmdldEVsZW1lbnRCeUlkKG5vZGUuZ2V0QXR0cmlidXRlKFwiZmlsbFwiKS5yZXBsYWNlKC9edXJsXFwoI3xcXCkkL2csIEUpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZ3JhZGllbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcHMgPSBncmFkaWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZShcInN0b3BcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICQoc3RvcHNbc3RvcHMubGVuZ3RoIC0gMV0sIHtcInN0b3Atb3BhY2l0eVwiOiB2YWx1ZX0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dCA9PSBcImZvbnQtc2l6ZVwiICYmICh2YWx1ZSA9IHRvSW50KHZhbHVlLCAxMCkgKyBcInB4XCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGNzc3J1bGUgPSBhdHQucmVwbGFjZSgvKFxcLS4pL2csIGZ1bmN0aW9uICh3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHcuc3Vic3RyaW5nKDEpLnRvVXBwZXJDYXNlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUuc3R5bGVbY3NzcnVsZV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIG8uXy5kaXJ0eSA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnNldEF0dHJpYnV0ZShhdHQsIHZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHR1bmVUZXh0KG8sIHBhcmFtcyk7XG4gICAgICAgIG5vZGUuc3R5bGUudmlzaWJpbGl0eSA9IHZpcztcbiAgICB9LFxuICAgIGxlYWRpbmcgPSAxLjIsXG4gICAgdHVuZVRleHQgPSBmdW5jdGlvbiAoZWwsIHBhcmFtcykge1xuICAgICAgICBpZiAoZWwudHlwZSAhPSBcInRleHRcIiB8fCAhKHBhcmFtc1toYXNdKFwidGV4dFwiKSB8fCBwYXJhbXNbaGFzXShcImZvbnRcIikgfHwgcGFyYW1zW2hhc10oXCJmb250LXNpemVcIikgfHwgcGFyYW1zW2hhc10oXCJ4XCIpIHx8IHBhcmFtc1toYXNdKFwieVwiKSkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYSA9IGVsLmF0dHJzLFxuICAgICAgICAgICAgbm9kZSA9IGVsLm5vZGUsXG4gICAgICAgICAgICBmb250U2l6ZSA9IG5vZGUuZmlyc3RDaGlsZCA/IHRvSW50KFIuX2cuZG9jLmRlZmF1bHRWaWV3LmdldENvbXB1dGVkU3R5bGUobm9kZS5maXJzdENoaWxkLCBFKS5nZXRQcm9wZXJ0eVZhbHVlKFwiZm9udC1zaXplXCIpLCAxMCkgOiAxMDtcblxuICAgICAgICBpZiAocGFyYW1zW2hhc10oXCJ0ZXh0XCIpKSB7XG4gICAgICAgICAgICBhLnRleHQgPSBwYXJhbXMudGV4dDtcbiAgICAgICAgICAgIHdoaWxlIChub2RlLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICBub2RlLnJlbW92ZUNoaWxkKG5vZGUuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgdGV4dHMgPSBTdHIocGFyYW1zLnRleHQpLnNwbGl0KFwiXFxuXCIpLFxuICAgICAgICAgICAgICAgIHRzcGFucyA9IFtdLFxuICAgICAgICAgICAgICAgIHRzcGFuO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gdGV4dHMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIHRzcGFuID0gJChcInRzcGFuXCIpO1xuICAgICAgICAgICAgICAgIGkgJiYgJCh0c3Bhbiwge2R5OiBmb250U2l6ZSAqIGxlYWRpbmcsIHg6IGEueH0pO1xuICAgICAgICAgICAgICAgIHRzcGFuLmFwcGVuZENoaWxkKFIuX2cuZG9jLmNyZWF0ZVRleHROb2RlKHRleHRzW2ldKSk7XG4gICAgICAgICAgICAgICAgbm9kZS5hcHBlbmRDaGlsZCh0c3Bhbik7XG4gICAgICAgICAgICAgICAgdHNwYW5zW2ldID0gdHNwYW47XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0c3BhbnMgPSBub2RlLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwidHNwYW5cIik7XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBpaSA9IHRzcGFucy5sZW5ndGg7IGkgPCBpaTsgaSsrKSBpZiAoaSkge1xuICAgICAgICAgICAgICAgICQodHNwYW5zW2ldLCB7ZHk6IGZvbnRTaXplICogbGVhZGluZywgeDogYS54fSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQodHNwYW5zWzBdLCB7ZHk6IDB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAkKG5vZGUsIHt4OiBhLngsIHk6IGEueX0pO1xuICAgICAgICBlbC5fLmRpcnR5ID0gMTtcbiAgICAgICAgdmFyIGJiID0gZWwuX2dldEJCb3goKSxcbiAgICAgICAgICAgIGRpZiA9IGEueSAtIChiYi55ICsgYmIuaGVpZ2h0IC8gMik7XG4gICAgICAgIGRpZiAmJiBSLmlzKGRpZiwgXCJmaW5pdGVcIikgJiYgJCh0c3BhbnNbMF0sIHtkeTogZGlmfSk7XG4gICAgfSxcbiAgICBFbGVtZW50ID0gZnVuY3Rpb24gKG5vZGUsIHN2Zykge1xuICAgICAgICB2YXIgWCA9IDAsXG4gICAgICAgICAgICBZID0gMDtcbiAgICAgICAgXG4gICAgICAgIHRoaXNbMF0gPSB0aGlzLm5vZGUgPSBub2RlO1xuICAgICAgICBcbiAgICAgICAgbm9kZS5yYXBoYWVsID0gdHJ1ZTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuaWQgPSBSLl9vaWQrKztcbiAgICAgICAgbm9kZS5yYXBoYWVsaWQgPSB0aGlzLmlkO1xuICAgICAgICB0aGlzLm1hdHJpeCA9IFIubWF0cml4KCk7XG4gICAgICAgIHRoaXMucmVhbFBhdGggPSBudWxsO1xuICAgICAgICBcbiAgICAgICAgdGhpcy5wYXBlciA9IHN2ZztcbiAgICAgICAgdGhpcy5hdHRycyA9IHRoaXMuYXR0cnMgfHwge307XG4gICAgICAgIHRoaXMuXyA9IHtcbiAgICAgICAgICAgIHRyYW5zZm9ybTogW10sXG4gICAgICAgICAgICBzeDogMSxcbiAgICAgICAgICAgIHN5OiAxLFxuICAgICAgICAgICAgZGVnOiAwLFxuICAgICAgICAgICAgZHg6IDAsXG4gICAgICAgICAgICBkeTogMCxcbiAgICAgICAgICAgIGRpcnR5OiAxXG4gICAgICAgIH07XG4gICAgICAgICFzdmcuYm90dG9tICYmIChzdmcuYm90dG9tID0gdGhpcyk7XG4gICAgICAgIFxuICAgICAgICB0aGlzLnByZXYgPSBzdmcudG9wO1xuICAgICAgICBzdmcudG9wICYmIChzdmcudG9wLm5leHQgPSB0aGlzKTtcbiAgICAgICAgc3ZnLnRvcCA9IHRoaXM7XG4gICAgICAgIFxuICAgICAgICB0aGlzLm5leHQgPSBudWxsO1xuICAgIH0sXG4gICAgZWxwcm90byA9IFIuZWw7XG5cbiAgICBFbGVtZW50LnByb3RvdHlwZSA9IGVscHJvdG87XG4gICAgZWxwcm90by5jb25zdHJ1Y3RvciA9IEVsZW1lbnQ7XG5cbiAgICBSLl9lbmdpbmUucGF0aCA9IGZ1bmN0aW9uIChwYXRoU3RyaW5nLCBTVkcpIHtcbiAgICAgICAgdmFyIGVsID0gJChcInBhdGhcIik7XG4gICAgICAgIFNWRy5jYW52YXMgJiYgU1ZHLmNhbnZhcy5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgIHZhciBwID0gbmV3IEVsZW1lbnQoZWwsIFNWRyk7XG4gICAgICAgIHAudHlwZSA9IFwicGF0aFwiO1xuICAgICAgICBzZXRGaWxsQW5kU3Ryb2tlKHAsIHtcbiAgICAgICAgICAgIGZpbGw6IFwibm9uZVwiLFxuICAgICAgICAgICAgc3Ryb2tlOiBcIiMwMDBcIixcbiAgICAgICAgICAgIHBhdGg6IHBhdGhTdHJpbmdcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBwO1xuICAgIH07XG4gICAgXG4gICAgZWxwcm90by5yb3RhdGUgPSBmdW5jdGlvbiAoZGVnLCBjeCwgY3kpIHtcbiAgICAgICAgaWYgKHRoaXMucmVtb3ZlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgZGVnID0gU3RyKGRlZykuc3BsaXQoc2VwYXJhdG9yKTtcbiAgICAgICAgaWYgKGRlZy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBjeCA9IHRvRmxvYXQoZGVnWzFdKTtcbiAgICAgICAgICAgIGN5ID0gdG9GbG9hdChkZWdbMl0pO1xuICAgICAgICB9XG4gICAgICAgIGRlZyA9IHRvRmxvYXQoZGVnWzBdKTtcbiAgICAgICAgKGN5ID09IG51bGwpICYmIChjeCA9IGN5KTtcbiAgICAgICAgaWYgKGN4ID09IG51bGwgfHwgY3kgPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIGJib3ggPSB0aGlzLmdldEJCb3goMSk7XG4gICAgICAgICAgICBjeCA9IGJib3gueCArIGJib3gud2lkdGggLyAyO1xuICAgICAgICAgICAgY3kgPSBiYm94LnkgKyBiYm94LmhlaWdodCAvIDI7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy50cmFuc2Zvcm0odGhpcy5fLnRyYW5zZm9ybS5jb25jYXQoW1tcInJcIiwgZGVnLCBjeCwgY3ldXSkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFxuICAgIGVscHJvdG8uc2NhbGUgPSBmdW5jdGlvbiAoc3gsIHN5LCBjeCwgY3kpIHtcbiAgICAgICAgaWYgKHRoaXMucmVtb3ZlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgc3ggPSBTdHIoc3gpLnNwbGl0KHNlcGFyYXRvcik7XG4gICAgICAgIGlmIChzeC5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBzeSA9IHRvRmxvYXQoc3hbMV0pO1xuICAgICAgICAgICAgY3ggPSB0b0Zsb2F0KHN4WzJdKTtcbiAgICAgICAgICAgIGN5ID0gdG9GbG9hdChzeFszXSk7XG4gICAgICAgIH1cbiAgICAgICAgc3ggPSB0b0Zsb2F0KHN4WzBdKTtcbiAgICAgICAgKHN5ID09IG51bGwpICYmIChzeSA9IHN4KTtcbiAgICAgICAgKGN5ID09IG51bGwpICYmIChjeCA9IGN5KTtcbiAgICAgICAgaWYgKGN4ID09IG51bGwgfHwgY3kgPT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIGJib3ggPSB0aGlzLmdldEJCb3goMSk7XG4gICAgICAgIH1cbiAgICAgICAgY3ggPSBjeCA9PSBudWxsID8gYmJveC54ICsgYmJveC53aWR0aCAvIDIgOiBjeDtcbiAgICAgICAgY3kgPSBjeSA9PSBudWxsID8gYmJveC55ICsgYmJveC5oZWlnaHQgLyAyIDogY3k7XG4gICAgICAgIHRoaXMudHJhbnNmb3JtKHRoaXMuXy50cmFuc2Zvcm0uY29uY2F0KFtbXCJzXCIsIHN4LCBzeSwgY3gsIGN5XV0pKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uIChkeCwgZHkpIHtcbiAgICAgICAgaWYgKHRoaXMucmVtb3ZlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgZHggPSBTdHIoZHgpLnNwbGl0KHNlcGFyYXRvcik7XG4gICAgICAgIGlmIChkeC5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICBkeSA9IHRvRmxvYXQoZHhbMV0pO1xuICAgICAgICB9XG4gICAgICAgIGR4ID0gdG9GbG9hdChkeFswXSkgfHwgMDtcbiAgICAgICAgZHkgPSArZHkgfHwgMDtcbiAgICAgICAgdGhpcy50cmFuc2Zvcm0odGhpcy5fLnRyYW5zZm9ybS5jb25jYXQoW1tcInRcIiwgZHgsIGR5XV0pKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLnRyYW5zZm9ybSA9IGZ1bmN0aW9uICh0c3RyKSB7XG4gICAgICAgIHZhciBfID0gdGhpcy5fO1xuICAgICAgICBpZiAodHN0ciA9PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gXy50cmFuc2Zvcm07XG4gICAgICAgIH1cbiAgICAgICAgUi5fZXh0cmFjdFRyYW5zZm9ybSh0aGlzLCB0c3RyKTtcblxuICAgICAgICB0aGlzLmNsaXAgJiYgJCh0aGlzLmNsaXAsIHt0cmFuc2Zvcm06IHRoaXMubWF0cml4LmludmVydCgpfSk7XG4gICAgICAgIHRoaXMucGF0dGVybiAmJiB1cGRhdGVQb3NpdGlvbih0aGlzKTtcbiAgICAgICAgdGhpcy5ub2RlICYmICQodGhpcy5ub2RlLCB7dHJhbnNmb3JtOiB0aGlzLm1hdHJpeH0pO1xuICAgIFxuICAgICAgICBpZiAoXy5zeCAhPSAxIHx8IF8uc3kgIT0gMSkge1xuICAgICAgICAgICAgdmFyIHN3ID0gdGhpcy5hdHRyc1toYXNdKFwic3Ryb2tlLXdpZHRoXCIpID8gdGhpcy5hdHRyc1tcInN0cm9rZS13aWR0aFwiXSA6IDE7XG4gICAgICAgICAgICB0aGlzLmF0dHIoe1wic3Ryb2tlLXdpZHRoXCI6IHN3fSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFxuICAgIGVscHJvdG8uaGlkZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgIXRoaXMucmVtb3ZlZCAmJiB0aGlzLnBhcGVyLnNhZmFyaSh0aGlzLm5vZGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLnNob3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICF0aGlzLnJlbW92ZWQgJiYgdGhpcy5wYXBlci5zYWZhcmkodGhpcy5ub2RlLnN0eWxlLmRpc3BsYXkgPSBcIlwiKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLnJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMucmVtb3ZlZCB8fCAhdGhpcy5ub2RlLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcGFwZXIgPSB0aGlzLnBhcGVyO1xuICAgICAgICBwYXBlci5fX3NldF9fICYmIHBhcGVyLl9fc2V0X18uZXhjbHVkZSh0aGlzKTtcbiAgICAgICAgZXZlLnVuYmluZChcInJhcGhhZWwuKi4qLlwiICsgdGhpcy5pZCk7XG4gICAgICAgIGlmICh0aGlzLmdyYWRpZW50KSB7XG4gICAgICAgICAgICBwYXBlci5kZWZzLnJlbW92ZUNoaWxkKHRoaXMuZ3JhZGllbnQpO1xuICAgICAgICB9XG4gICAgICAgIFIuX3RlYXIodGhpcywgcGFwZXIpO1xuICAgICAgICBpZiAodGhpcy5ub2RlLnBhcmVudE5vZGUudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09IFwiYVwiKSB7XG4gICAgICAgICAgICB0aGlzLm5vZGUucGFyZW50Tm9kZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMubm9kZS5wYXJlbnROb2RlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMubm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIgaSBpbiB0aGlzKSB7XG4gICAgICAgICAgICB0aGlzW2ldID0gdHlwZW9mIHRoaXNbaV0gPT0gXCJmdW5jdGlvblwiID8gUi5fcmVtb3ZlZEZhY3RvcnkoaSkgOiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucmVtb3ZlZCA9IHRydWU7XG4gICAgfTtcbiAgICBlbHByb3RvLl9nZXRCQm94ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5ub2RlLnN0eWxlLmRpc3BsYXkgPT0gXCJub25lXCIpIHtcbiAgICAgICAgICAgIHRoaXMuc2hvdygpO1xuICAgICAgICAgICAgdmFyIGhpZGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBiYm94ID0ge307XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBiYm94ID0gdGhpcy5ub2RlLmdldEJCb3goKTtcbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAvLyBGaXJlZm94IDMuMC54IHBsYXlzIGJhZGx5IGhlcmVcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgIGJib3ggPSBiYm94IHx8IHt9O1xuICAgICAgICB9XG4gICAgICAgIGhpZGUgJiYgdGhpcy5oaWRlKCk7XG4gICAgICAgIHJldHVybiBiYm94O1xuICAgIH07XG4gICAgXG4gICAgZWxwcm90by5hdHRyID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIGlmICh0aGlzLnJlbW92ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuYW1lID09IG51bGwpIHtcbiAgICAgICAgICAgIHZhciByZXMgPSB7fTtcbiAgICAgICAgICAgIGZvciAodmFyIGEgaW4gdGhpcy5hdHRycykgaWYgKHRoaXMuYXR0cnNbaGFzXShhKSkge1xuICAgICAgICAgICAgICAgIHJlc1thXSA9IHRoaXMuYXR0cnNbYV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXMuZ3JhZGllbnQgJiYgcmVzLmZpbGwgPT0gXCJub25lXCIgJiYgKHJlcy5maWxsID0gcmVzLmdyYWRpZW50KSAmJiBkZWxldGUgcmVzLmdyYWRpZW50O1xuICAgICAgICAgICAgcmVzLnRyYW5zZm9ybSA9IHRoaXMuXy50cmFuc2Zvcm07XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZSA9PSBudWxsICYmIFIuaXMobmFtZSwgXCJzdHJpbmdcIikpIHtcbiAgICAgICAgICAgIGlmIChuYW1lID09IFwiZmlsbFwiICYmIHRoaXMuYXR0cnMuZmlsbCA9PSBcIm5vbmVcIiAmJiB0aGlzLmF0dHJzLmdyYWRpZW50KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXR0cnMuZ3JhZGllbnQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobmFtZSA9PSBcInRyYW5zZm9ybVwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuXy50cmFuc2Zvcm07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB2YXIgbmFtZXMgPSBuYW1lLnNwbGl0KHNlcGFyYXRvciksXG4gICAgICAgICAgICAgICAgb3V0ID0ge307XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBuYW1lcy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IG5hbWVzW2ldO1xuICAgICAgICAgICAgICAgIGlmIChuYW1lIGluIHRoaXMuYXR0cnMpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0W25hbWVdID0gdGhpcy5hdHRyc1tuYW1lXTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKFIuaXModGhpcy5wYXBlci5jdXN0b21BdHRyaWJ1dGVzW25hbWVdLCBcImZ1bmN0aW9uXCIpKSB7XG4gICAgICAgICAgICAgICAgICAgIG91dFtuYW1lXSA9IHRoaXMucGFwZXIuY3VzdG9tQXR0cmlidXRlc1tuYW1lXS5kZWY7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0W25hbWVdID0gUi5fYXZhaWxhYmxlQXR0cnNbbmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGlpIC0gMSA/IG91dCA6IG91dFtuYW1lc1swXV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHZhbHVlID09IG51bGwgJiYgUi5pcyhuYW1lLCBcImFycmF5XCIpKSB7XG4gICAgICAgICAgICBvdXQgPSB7fTtcbiAgICAgICAgICAgIGZvciAoaSA9IDAsIGlpID0gbmFtZS5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgb3V0W25hbWVbaV1dID0gdGhpcy5hdHRyKG5hbWVbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG91dDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodmFsdWUgIT0gbnVsbCkge1xuICAgICAgICAgICAgdmFyIHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zW25hbWVdID0gdmFsdWU7XG4gICAgICAgIH0gZWxzZSBpZiAobmFtZSAhPSBudWxsICYmIFIuaXMobmFtZSwgXCJvYmplY3RcIikpIHtcbiAgICAgICAgICAgIHBhcmFtcyA9IG5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgZm9yICh2YXIga2V5IGluIHBhcmFtcykge1xuICAgICAgICAgICAgZXZlKFwicmFwaGFlbC5hdHRyLlwiICsga2V5ICsgXCIuXCIgKyB0aGlzLmlkLCB0aGlzLCBwYXJhbXNba2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgZm9yIChrZXkgaW4gdGhpcy5wYXBlci5jdXN0b21BdHRyaWJ1dGVzKSBpZiAodGhpcy5wYXBlci5jdXN0b21BdHRyaWJ1dGVzW2hhc10oa2V5KSAmJiBwYXJhbXNbaGFzXShrZXkpICYmIFIuaXModGhpcy5wYXBlci5jdXN0b21BdHRyaWJ1dGVzW2tleV0sIFwiZnVuY3Rpb25cIikpIHtcbiAgICAgICAgICAgIHZhciBwYXIgPSB0aGlzLnBhcGVyLmN1c3RvbUF0dHJpYnV0ZXNba2V5XS5hcHBseSh0aGlzLCBbXS5jb25jYXQocGFyYW1zW2tleV0pKTtcbiAgICAgICAgICAgIHRoaXMuYXR0cnNba2V5XSA9IHBhcmFtc1trZXldO1xuICAgICAgICAgICAgZm9yICh2YXIgc3Via2V5IGluIHBhcikgaWYgKHBhcltoYXNdKHN1YmtleSkpIHtcbiAgICAgICAgICAgICAgICBwYXJhbXNbc3Via2V5XSA9IHBhcltzdWJrZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHNldEZpbGxBbmRTdHJva2UodGhpcywgcGFyYW1zKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLnRvRnJvbnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLnJlbW92ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLm5vZGUucGFyZW50Tm9kZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT0gXCJhXCIpIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5wYXJlbnROb2RlLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQodGhpcy5ub2RlLnBhcmVudE5vZGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5ub2RlLnBhcmVudE5vZGUuYXBwZW5kQ2hpbGQodGhpcy5ub2RlKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgc3ZnID0gdGhpcy5wYXBlcjtcbiAgICAgICAgc3ZnLnRvcCAhPSB0aGlzICYmIFIuX3RvZnJvbnQodGhpcywgc3ZnKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICBlbHByb3RvLnRvQmFjayA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMucmVtb3ZlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMubm9kZS5wYXJlbnROb2RlO1xuICAgICAgICBpZiAocGFyZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PSBcImFcIikge1xuICAgICAgICAgICAgcGFyZW50LnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubm9kZS5wYXJlbnROb2RlLCB0aGlzLm5vZGUucGFyZW50Tm9kZS5wYXJlbnROb2RlLmZpcnN0Q2hpbGQpOyBcbiAgICAgICAgfSBlbHNlIGlmIChwYXJlbnQuZmlyc3RDaGlsZCAhPSB0aGlzLm5vZGUpIHtcbiAgICAgICAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUodGhpcy5ub2RlLCB0aGlzLm5vZGUucGFyZW50Tm9kZS5maXJzdENoaWxkKTtcbiAgICAgICAgfVxuICAgICAgICBSLl90b2JhY2sodGhpcywgdGhpcy5wYXBlcik7XG4gICAgICAgIHZhciBzdmcgPSB0aGlzLnBhcGVyO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFxuICAgIGVscHJvdG8uaW5zZXJ0QWZ0ZXIgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICBpZiAodGhpcy5yZW1vdmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICB2YXIgbm9kZSA9IGVsZW1lbnQubm9kZSB8fCBlbGVtZW50W2VsZW1lbnQubGVuZ3RoIC0gMV0ubm9kZTtcbiAgICAgICAgaWYgKG5vZGUubmV4dFNpYmxpbmcpIHtcbiAgICAgICAgICAgIG5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5ub2RlLCBub2RlLm5leHRTaWJsaW5nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5vZGUucGFyZW50Tm9kZS5hcHBlbmRDaGlsZCh0aGlzLm5vZGUpO1xuICAgICAgICB9XG4gICAgICAgIFIuX2luc2VydGFmdGVyKHRoaXMsIGVsZW1lbnQsIHRoaXMucGFwZXIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFxuICAgIGVscHJvdG8uaW5zZXJ0QmVmb3JlID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgICAgICAgaWYgKHRoaXMucmVtb3ZlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG5vZGUgPSBlbGVtZW50Lm5vZGUgfHwgZWxlbWVudFswXS5ub2RlO1xuICAgICAgICBub2RlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubm9kZSwgbm9kZSk7XG4gICAgICAgIFIuX2luc2VydGJlZm9yZSh0aGlzLCBlbGVtZW50LCB0aGlzLnBhcGVyKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBlbHByb3RvLmJsdXIgPSBmdW5jdGlvbiAoc2l6ZSkge1xuICAgICAgICAvLyBFeHBlcmltZW50YWwuIE5vIFNhZmFyaSBzdXBwb3J0LiBVc2UgaXQgb24geW91ciBvd24gcmlzay5cbiAgICAgICAgdmFyIHQgPSB0aGlzO1xuICAgICAgICBpZiAoK3NpemUgIT09IDApIHtcbiAgICAgICAgICAgIHZhciBmbHRyID0gJChcImZpbHRlclwiKSxcbiAgICAgICAgICAgICAgICBibHVyID0gJChcImZlR2F1c3NpYW5CbHVyXCIpO1xuICAgICAgICAgICAgdC5hdHRycy5ibHVyID0gc2l6ZTtcbiAgICAgICAgICAgIGZsdHIuaWQgPSBSLmNyZWF0ZVVVSUQoKTtcbiAgICAgICAgICAgICQoYmx1ciwge3N0ZERldmlhdGlvbjogK3NpemUgfHwgMS41fSk7XG4gICAgICAgICAgICBmbHRyLmFwcGVuZENoaWxkKGJsdXIpO1xuICAgICAgICAgICAgdC5wYXBlci5kZWZzLmFwcGVuZENoaWxkKGZsdHIpO1xuICAgICAgICAgICAgdC5fYmx1ciA9IGZsdHI7XG4gICAgICAgICAgICAkKHQubm9kZSwge2ZpbHRlcjogXCJ1cmwoI1wiICsgZmx0ci5pZCArIFwiKVwifSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAodC5fYmx1cikge1xuICAgICAgICAgICAgICAgIHQuX2JsdXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0Ll9ibHVyKTtcbiAgICAgICAgICAgICAgICBkZWxldGUgdC5fYmx1cjtcbiAgICAgICAgICAgICAgICBkZWxldGUgdC5hdHRycy5ibHVyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdC5ub2RlLnJlbW92ZUF0dHJpYnV0ZShcImZpbHRlclwiKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgUi5fZW5naW5lLmNpcmNsZSA9IGZ1bmN0aW9uIChzdmcsIHgsIHksIHIpIHtcbiAgICAgICAgdmFyIGVsID0gJChcImNpcmNsZVwiKTtcbiAgICAgICAgc3ZnLmNhbnZhcyAmJiBzdmcuY2FudmFzLmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgdmFyIHJlcyA9IG5ldyBFbGVtZW50KGVsLCBzdmcpO1xuICAgICAgICByZXMuYXR0cnMgPSB7Y3g6IHgsIGN5OiB5LCByOiByLCBmaWxsOiBcIm5vbmVcIiwgc3Ryb2tlOiBcIiMwMDBcIn07XG4gICAgICAgIHJlcy50eXBlID0gXCJjaXJjbGVcIjtcbiAgICAgICAgJChlbCwgcmVzLmF0dHJzKTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9O1xuICAgIFIuX2VuZ2luZS5yZWN0ID0gZnVuY3Rpb24gKHN2ZywgeCwgeSwgdywgaCwgcikge1xuICAgICAgICB2YXIgZWwgPSAkKFwicmVjdFwiKTtcbiAgICAgICAgc3ZnLmNhbnZhcyAmJiBzdmcuY2FudmFzLmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgdmFyIHJlcyA9IG5ldyBFbGVtZW50KGVsLCBzdmcpO1xuICAgICAgICByZXMuYXR0cnMgPSB7eDogeCwgeTogeSwgd2lkdGg6IHcsIGhlaWdodDogaCwgcjogciB8fCAwLCByeDogciB8fCAwLCByeTogciB8fCAwLCBmaWxsOiBcIm5vbmVcIiwgc3Ryb2tlOiBcIiMwMDBcIn07XG4gICAgICAgIHJlcy50eXBlID0gXCJyZWN0XCI7XG4gICAgICAgICQoZWwsIHJlcy5hdHRycyk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcbiAgICBSLl9lbmdpbmUuZWxsaXBzZSA9IGZ1bmN0aW9uIChzdmcsIHgsIHksIHJ4LCByeSkge1xuICAgICAgICB2YXIgZWwgPSAkKFwiZWxsaXBzZVwiKTtcbiAgICAgICAgc3ZnLmNhbnZhcyAmJiBzdmcuY2FudmFzLmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgdmFyIHJlcyA9IG5ldyBFbGVtZW50KGVsLCBzdmcpO1xuICAgICAgICByZXMuYXR0cnMgPSB7Y3g6IHgsIGN5OiB5LCByeDogcngsIHJ5OiByeSwgZmlsbDogXCJub25lXCIsIHN0cm9rZTogXCIjMDAwXCJ9O1xuICAgICAgICByZXMudHlwZSA9IFwiZWxsaXBzZVwiO1xuICAgICAgICAkKGVsLCByZXMuYXR0cnMpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH07XG4gICAgUi5fZW5naW5lLmltYWdlID0gZnVuY3Rpb24gKHN2Zywgc3JjLCB4LCB5LCB3LCBoKSB7XG4gICAgICAgIHZhciBlbCA9ICQoXCJpbWFnZVwiKTtcbiAgICAgICAgJChlbCwge3g6IHgsIHk6IHksIHdpZHRoOiB3LCBoZWlnaHQ6IGgsIHByZXNlcnZlQXNwZWN0UmF0aW86IFwibm9uZVwifSk7XG4gICAgICAgIGVsLnNldEF0dHJpYnV0ZU5TKHhsaW5rLCBcImhyZWZcIiwgc3JjKTtcbiAgICAgICAgc3ZnLmNhbnZhcyAmJiBzdmcuY2FudmFzLmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgdmFyIHJlcyA9IG5ldyBFbGVtZW50KGVsLCBzdmcpO1xuICAgICAgICByZXMuYXR0cnMgPSB7eDogeCwgeTogeSwgd2lkdGg6IHcsIGhlaWdodDogaCwgc3JjOiBzcmN9O1xuICAgICAgICByZXMudHlwZSA9IFwiaW1hZ2VcIjtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9O1xuICAgIFIuX2VuZ2luZS50ZXh0ID0gZnVuY3Rpb24gKHN2ZywgeCwgeSwgdGV4dCkge1xuICAgICAgICB2YXIgZWwgPSAkKFwidGV4dFwiKTtcbiAgICAgICAgc3ZnLmNhbnZhcyAmJiBzdmcuY2FudmFzLmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgdmFyIHJlcyA9IG5ldyBFbGVtZW50KGVsLCBzdmcpO1xuICAgICAgICByZXMuYXR0cnMgPSB7XG4gICAgICAgICAgICB4OiB4LFxuICAgICAgICAgICAgeTogeSxcbiAgICAgICAgICAgIFwidGV4dC1hbmNob3JcIjogXCJtaWRkbGVcIixcbiAgICAgICAgICAgIHRleHQ6IHRleHQsXG4gICAgICAgICAgICBmb250OiBSLl9hdmFpbGFibGVBdHRycy5mb250LFxuICAgICAgICAgICAgc3Ryb2tlOiBcIm5vbmVcIixcbiAgICAgICAgICAgIGZpbGw6IFwiIzAwMFwiXG4gICAgICAgIH07XG4gICAgICAgIHJlcy50eXBlID0gXCJ0ZXh0XCI7XG4gICAgICAgIHNldEZpbGxBbmRTdHJva2UocmVzLCByZXMuYXR0cnMpO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH07XG4gICAgUi5fZW5naW5lLnNldFNpemUgPSBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICAgICAgICB0aGlzLndpZHRoID0gd2lkdGggfHwgdGhpcy53aWR0aDtcbiAgICAgICAgdGhpcy5oZWlnaHQgPSBoZWlnaHQgfHwgdGhpcy5oZWlnaHQ7XG4gICAgICAgIHRoaXMuY2FudmFzLnNldEF0dHJpYnV0ZShcIndpZHRoXCIsIHRoaXMud2lkdGgpO1xuICAgICAgICB0aGlzLmNhbnZhcy5zZXRBdHRyaWJ1dGUoXCJoZWlnaHRcIiwgdGhpcy5oZWlnaHQpO1xuICAgICAgICBpZiAodGhpcy5fdmlld0JveCkge1xuICAgICAgICAgICAgdGhpcy5zZXRWaWV3Qm94LmFwcGx5KHRoaXMsIHRoaXMuX3ZpZXdCb3gpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgUi5fZW5naW5lLmNyZWF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNvbiA9IFIuX2dldENvbnRhaW5lci5hcHBseSgwLCBhcmd1bWVudHMpLFxuICAgICAgICAgICAgY29udGFpbmVyID0gY29uICYmIGNvbi5jb250YWluZXIsXG4gICAgICAgICAgICB4ID0gY29uLngsXG4gICAgICAgICAgICB5ID0gY29uLnksXG4gICAgICAgICAgICB3aWR0aCA9IGNvbi53aWR0aCxcbiAgICAgICAgICAgIGhlaWdodCA9IGNvbi5oZWlnaHQ7XG4gICAgICAgIGlmICghY29udGFpbmVyKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTVkcgY29udGFpbmVyIG5vdCBmb3VuZC5cIik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNudnMgPSAkKFwic3ZnXCIpLFxuICAgICAgICAgICAgY3NzID0gXCJvdmVyZmxvdzpoaWRkZW47XCIsXG4gICAgICAgICAgICBpc0Zsb2F0aW5nO1xuICAgICAgICB4ID0geCB8fCAwO1xuICAgICAgICB5ID0geSB8fCAwO1xuICAgICAgICB3aWR0aCA9IHdpZHRoIHx8IDUxMjtcbiAgICAgICAgaGVpZ2h0ID0gaGVpZ2h0IHx8IDM0MjtcbiAgICAgICAgJChjbnZzLCB7XG4gICAgICAgICAgICBoZWlnaHQ6IGhlaWdodCxcbiAgICAgICAgICAgIHZlcnNpb246IDEuMSxcbiAgICAgICAgICAgIHdpZHRoOiB3aWR0aCxcbiAgICAgICAgICAgIHhtbG5zOiBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCJcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChjb250YWluZXIgPT0gMSkge1xuICAgICAgICAgICAgY252cy5zdHlsZS5jc3NUZXh0ID0gY3NzICsgXCJwb3NpdGlvbjphYnNvbHV0ZTtsZWZ0OlwiICsgeCArIFwicHg7dG9wOlwiICsgeSArIFwicHhcIjtcbiAgICAgICAgICAgIFIuX2cuZG9jLmJvZHkuYXBwZW5kQ2hpbGQoY252cyk7XG4gICAgICAgICAgICBpc0Zsb2F0aW5nID0gMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNudnMuc3R5bGUuY3NzVGV4dCA9IGNzcyArIFwicG9zaXRpb246cmVsYXRpdmVcIjtcbiAgICAgICAgICAgIGlmIChjb250YWluZXIuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5pbnNlcnRCZWZvcmUoY252cywgY29udGFpbmVyLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQoY252cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgY29udGFpbmVyID0gbmV3IFIuX1BhcGVyO1xuICAgICAgICBjb250YWluZXIud2lkdGggPSB3aWR0aDtcbiAgICAgICAgY29udGFpbmVyLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgY29udGFpbmVyLmNhbnZhcyA9IGNudnM7XG4gICAgICAgIGNvbnRhaW5lci5jbGVhcigpO1xuICAgICAgICBjb250YWluZXIuX2xlZnQgPSBjb250YWluZXIuX3RvcCA9IDA7XG4gICAgICAgIGlzRmxvYXRpbmcgJiYgKGNvbnRhaW5lci5yZW5kZXJmaXggPSBmdW5jdGlvbiAoKSB7fSk7XG4gICAgICAgIGNvbnRhaW5lci5yZW5kZXJmaXgoKTtcbiAgICAgICAgcmV0dXJuIGNvbnRhaW5lcjtcbiAgICB9O1xuICAgIFIuX2VuZ2luZS5zZXRWaWV3Qm94ID0gZnVuY3Rpb24gKHgsIHksIHcsIGgsIGZpdCkge1xuICAgICAgICBldmUoXCJyYXBoYWVsLnNldFZpZXdCb3hcIiwgdGhpcywgdGhpcy5fdmlld0JveCwgW3gsIHksIHcsIGgsIGZpdF0pO1xuICAgICAgICB2YXIgc2l6ZSA9IG1tYXgodyAvIHRoaXMud2lkdGgsIGggLyB0aGlzLmhlaWdodCksXG4gICAgICAgICAgICB0b3AgPSB0aGlzLnRvcCxcbiAgICAgICAgICAgIGFzcGVjdFJhdGlvID0gZml0ID8gXCJtZWV0XCIgOiBcInhNaW5ZTWluXCIsXG4gICAgICAgICAgICB2YixcbiAgICAgICAgICAgIHN3O1xuICAgICAgICBpZiAoeCA9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fdmJTaXplKSB7XG4gICAgICAgICAgICAgICAgc2l6ZSA9IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWxldGUgdGhpcy5fdmJTaXplO1xuICAgICAgICAgICAgdmIgPSBcIjAgMCBcIiArIHRoaXMud2lkdGggKyBTICsgdGhpcy5oZWlnaHQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLl92YlNpemUgPSBzaXplO1xuICAgICAgICAgICAgdmIgPSB4ICsgUyArIHkgKyBTICsgdyArIFMgKyBoO1xuICAgICAgICB9XG4gICAgICAgICQodGhpcy5jYW52YXMsIHtcbiAgICAgICAgICAgIHZpZXdCb3g6IHZiLFxuICAgICAgICAgICAgcHJlc2VydmVBc3BlY3RSYXRpbzogYXNwZWN0UmF0aW9cbiAgICAgICAgfSk7XG4gICAgICAgIHdoaWxlIChzaXplICYmIHRvcCkge1xuICAgICAgICAgICAgc3cgPSBcInN0cm9rZS13aWR0aFwiIGluIHRvcC5hdHRycyA/IHRvcC5hdHRyc1tcInN0cm9rZS13aWR0aFwiXSA6IDE7XG4gICAgICAgICAgICB0b3AuYXR0cih7XCJzdHJva2Utd2lkdGhcIjogc3d9KTtcbiAgICAgICAgICAgIHRvcC5fLmRpcnR5ID0gMTtcbiAgICAgICAgICAgIHRvcC5fLmRpcnR5VCA9IDE7XG4gICAgICAgICAgICB0b3AgPSB0b3AucHJldjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl92aWV3Qm94ID0gW3gsIHksIHcsIGgsICEhZml0XTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBcbiAgICBSLnByb3RvdHlwZS5yZW5kZXJmaXggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjbnZzID0gdGhpcy5jYW52YXMsXG4gICAgICAgICAgICBzID0gY252cy5zdHlsZSxcbiAgICAgICAgICAgIHBvcztcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHBvcyA9IGNudnMuZ2V0U2NyZWVuQ1RNKCkgfHwgY252cy5jcmVhdGVTVkdNYXRyaXgoKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgLy8gQlJPV1NFUklGWSBNT0Q6IHRoaXMgd2lsbCBmYWlsIHdpdGgganNkb20gc2luY2UgaXQncyBTVkcgMS4wLFxuICAgICAgICAgICAgLy8gYnV0IGluIGpzZG9tIHRoaXMgd2hvbGUgZnVuY3Rpb24gaXNuJ3QgbmVlZGVkIGFueXdheXNcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgcG9zID0gY252cy5jcmVhdGVTVkdNYXRyaXgoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGxlZnQgPSAtcG9zLmUgJSAxLFxuICAgICAgICAgICAgdG9wID0gLXBvcy5mICUgMTtcbiAgICAgICAgaWYgKGxlZnQgfHwgdG9wKSB7XG4gICAgICAgICAgICBpZiAobGVmdCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX2xlZnQgPSAodGhpcy5fbGVmdCArIGxlZnQpICUgMTtcbiAgICAgICAgICAgICAgICBzLmxlZnQgPSB0aGlzLl9sZWZ0ICsgXCJweFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRvcCkge1xuICAgICAgICAgICAgICAgIHRoaXMuX3RvcCA9ICh0aGlzLl90b3AgKyB0b3ApICUgMTtcbiAgICAgICAgICAgICAgICBzLnRvcCA9IHRoaXMuX3RvcCArIFwicHhcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG4gICAgXG4gICAgUi5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIFIuZXZlKFwicmFwaGFlbC5jbGVhclwiLCB0aGlzKTtcbiAgICAgICAgdmFyIGMgPSB0aGlzLmNhbnZhcztcbiAgICAgICAgd2hpbGUgKGMuZmlyc3RDaGlsZCkge1xuICAgICAgICAgICAgYy5yZW1vdmVDaGlsZChjLmZpcnN0Q2hpbGQpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYm90dG9tID0gdGhpcy50b3AgPSBudWxsO1xuICAgICAgICAodGhpcy5kZXNjID0gJChcImRlc2NcIikpLmFwcGVuZENoaWxkKFIuX2cuZG9jLmNyZWF0ZVRleHROb2RlKFwiQ3JlYXRlZCB3aXRoIFJhcGhhXFx4ZWJsIFwiICsgUi52ZXJzaW9uKSk7XG4gICAgICAgIGMuYXBwZW5kQ2hpbGQodGhpcy5kZXNjKTtcbiAgICAgICAgYy5hcHBlbmRDaGlsZCh0aGlzLmRlZnMgPSAkKFwiZGVmc1wiKSk7XG4gICAgfTtcbiAgICBcbiAgICBSLnByb3RvdHlwZS5yZW1vdmUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGV2ZShcInJhcGhhZWwucmVtb3ZlXCIsIHRoaXMpO1xuICAgICAgICB0aGlzLmNhbnZhcy5wYXJlbnROb2RlICYmIHRoaXMuY2FudmFzLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5jYW52YXMpO1xuICAgICAgICBmb3IgKHZhciBpIGluIHRoaXMpIHtcbiAgICAgICAgICAgIHRoaXNbaV0gPSB0eXBlb2YgdGhpc1tpXSA9PSBcImZ1bmN0aW9uXCIgPyBSLl9yZW1vdmVkRmFjdG9yeShpKSA6IG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHZhciBzZXRwcm90byA9IFIuc3Q7XG4gICAgZm9yICh2YXIgbWV0aG9kIGluIGVscHJvdG8pIGlmIChlbHByb3RvW2hhc10obWV0aG9kKSAmJiAhc2V0cHJvdG9baGFzXShtZXRob2QpKSB7XG4gICAgICAgIHNldHByb3RvW21ldGhvZF0gPSAoZnVuY3Rpb24gKG1ldGhvZG5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFyZyA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5mb3JFYWNoKGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgICAgICAgICBlbFttZXRob2RuYW1lXS5hcHBseShlbCwgYXJnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0pKG1ldGhvZCk7XG4gICAgfVxufShSYXBoYWVsKTtcblxuLy8g4pSM4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSQIFxcXFxcbi8vIOKUgiBSYXBoYcOrbCAtIEphdmFTY3JpcHQgVmVjdG9yIExpYnJhcnkgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDilIIgXFxcXFxuLy8g4pSc4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSkIFxcXFxcbi8vIOKUgiBWTUwgTW9kdWxlICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOKUgiBcXFxcXG4vLyDilJzilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilKQgXFxcXFxuLy8g4pSCIENvcHlyaWdodCAoYykgMjAwOC0yMDExIERtaXRyeSBCYXJhbm92c2tpeSAoaHR0cDovL3JhcGhhZWxqcy5jb20pICAg4pSCIFxcXFxcbi8vIOKUgiBDb3B5cmlnaHQgKGMpIDIwMDgtMjAxMSBTZW5jaGEgTGFicyAoaHR0cDovL3NlbmNoYS5jb20pICAgICAgICAgICAgIOKUgiBcXFxcXG4vLyDilIIgTGljZW5zZWQgdW5kZXIgdGhlIE1JVCAoaHR0cDovL3JhcGhhZWxqcy5jb20vbGljZW5zZS5odG1sKSBsaWNlbnNlLiDilIIgXFxcXFxuLy8g4pSU4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSYIFxcXFxcblJhcGhhZWwudm1sICYmIGZ1bmN0aW9uIChSKSB7XG4gICAgdmFyIGhhcyA9IFwiaGFzT3duUHJvcGVydHlcIixcbiAgICAgICAgU3RyID0gU3RyaW5nLFxuICAgICAgICB0b0Zsb2F0ID0gcGFyc2VGbG9hdCxcbiAgICAgICAgbWF0aCA9IE1hdGgsXG4gICAgICAgIHJvdW5kID0gbWF0aC5yb3VuZCxcbiAgICAgICAgbW1heCA9IG1hdGgubWF4LFxuICAgICAgICBtbWluID0gbWF0aC5taW4sXG4gICAgICAgIGFicyA9IG1hdGguYWJzLFxuICAgICAgICBmaWxsU3RyaW5nID0gXCJmaWxsXCIsXG4gICAgICAgIHNlcGFyYXRvciA9IC9bLCBdKy8sXG4gICAgICAgIGV2ZSA9IFIuZXZlLFxuICAgICAgICBtcyA9IFwiIHByb2dpZDpEWEltYWdlVHJhbnNmb3JtLk1pY3Jvc29mdFwiLFxuICAgICAgICBTID0gXCIgXCIsXG4gICAgICAgIEUgPSBcIlwiLFxuICAgICAgICBtYXAgPSB7TTogXCJtXCIsIEw6IFwibFwiLCBDOiBcImNcIiwgWjogXCJ4XCIsIG06IFwidFwiLCBsOiBcInJcIiwgYzogXCJ2XCIsIHo6IFwieFwifSxcbiAgICAgICAgYml0ZXMgPSAvKFtjbG16XSksPyhbXmNsbXpdKikvZ2ksXG4gICAgICAgIGJsdXJyZWdleHAgPSAvIHByb2dpZDpcXFMrQmx1clxcKFteXFwpXStcXCkvZyxcbiAgICAgICAgdmFsID0gLy0/W14sXFxzLV0rL2csXG4gICAgICAgIGNzc0RvdCA9IFwicG9zaXRpb246YWJzb2x1dGU7bGVmdDowO3RvcDowO3dpZHRoOjFweDtoZWlnaHQ6MXB4XCIsXG4gICAgICAgIHpvb20gPSAyMTYwMCxcbiAgICAgICAgcGF0aFR5cGVzID0ge3BhdGg6IDEsIHJlY3Q6IDEsIGltYWdlOiAxfSxcbiAgICAgICAgb3ZhbFR5cGVzID0ge2NpcmNsZTogMSwgZWxsaXBzZTogMX0sXG4gICAgICAgIHBhdGgydm1sID0gZnVuY3Rpb24gKHBhdGgpIHtcbiAgICAgICAgICAgIHZhciB0b3RhbCA9ICAvW2FocXN0dl0vaWcsXG4gICAgICAgICAgICAgICAgY29tbWFuZCA9IFIuX3BhdGhUb0Fic29sdXRlO1xuICAgICAgICAgICAgU3RyKHBhdGgpLm1hdGNoKHRvdGFsKSAmJiAoY29tbWFuZCA9IFIuX3BhdGgyY3VydmUpO1xuICAgICAgICAgICAgdG90YWwgPSAvW2NsbXpdL2c7XG4gICAgICAgICAgICBpZiAoY29tbWFuZCA9PSBSLl9wYXRoVG9BYnNvbHV0ZSAmJiAhU3RyKHBhdGgpLm1hdGNoKHRvdGFsKSkge1xuICAgICAgICAgICAgICAgIHZhciByZXMgPSBTdHIocGF0aCkucmVwbGFjZShiaXRlcywgZnVuY3Rpb24gKGFsbCwgY29tbWFuZCwgYXJncykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgdmFscyA9IFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgaXNNb3ZlID0gY29tbWFuZC50b0xvd2VyQ2FzZSgpID09IFwibVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzID0gbWFwW2NvbW1hbmRdO1xuICAgICAgICAgICAgICAgICAgICBhcmdzLnJlcGxhY2UodmFsLCBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc01vdmUgJiYgdmFscy5sZW5ndGggPT0gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcyArPSB2YWxzICsgbWFwW2NvbW1hbmQgPT0gXCJtXCIgPyBcImxcIiA6IFwiTFwiXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWxzID0gW107XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWxzLnB1c2gocm91bmQodmFsdWUgKiB6b29tKSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzICsgdmFscztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHBhID0gY29tbWFuZChwYXRoKSwgcCwgcjtcbiAgICAgICAgICAgIHJlcyA9IFtdO1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGlpID0gcGEubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIHAgPSBwYVtpXTtcbiAgICAgICAgICAgICAgICByID0gcGFbaV1bMF0udG9Mb3dlckNhc2UoKTtcbiAgICAgICAgICAgICAgICByID09IFwielwiICYmIChyID0gXCJ4XCIpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAxLCBqaiA9IHAubGVuZ3RoOyBqIDwgamo7IGorKykge1xuICAgICAgICAgICAgICAgICAgICByICs9IHJvdW5kKHBbal0gKiB6b29tKSArIChqICE9IGpqIC0gMSA/IFwiLFwiIDogRSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlcy5wdXNoKHIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlcy5qb2luKFMpO1xuICAgICAgICB9LFxuICAgICAgICBjb21wZW5zYXRpb24gPSBmdW5jdGlvbiAoZGVnLCBkeCwgZHkpIHtcbiAgICAgICAgICAgIHZhciBtID0gUi5tYXRyaXgoKTtcbiAgICAgICAgICAgIG0ucm90YXRlKC1kZWcsIC41LCAuNSk7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIGR4OiBtLngoZHgsIGR5KSxcbiAgICAgICAgICAgICAgICBkeTogbS55KGR4LCBkeSlcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0sXG4gICAgICAgIHNldENvb3JkcyA9IGZ1bmN0aW9uIChwLCBzeCwgc3ksIGR4LCBkeSwgZGVnKSB7XG4gICAgICAgICAgICB2YXIgXyA9IHAuXyxcbiAgICAgICAgICAgICAgICBtID0gcC5tYXRyaXgsXG4gICAgICAgICAgICAgICAgZmlsbHBvcyA9IF8uZmlsbHBvcyxcbiAgICAgICAgICAgICAgICBvID0gcC5ub2RlLFxuICAgICAgICAgICAgICAgIHMgPSBvLnN0eWxlLFxuICAgICAgICAgICAgICAgIHkgPSAxLFxuICAgICAgICAgICAgICAgIGZsaXAgPSBcIlwiLFxuICAgICAgICAgICAgICAgIGR4ZHksXG4gICAgICAgICAgICAgICAga3ggPSB6b29tIC8gc3gsXG4gICAgICAgICAgICAgICAga3kgPSB6b29tIC8gc3k7XG4gICAgICAgICAgICBzLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xuICAgICAgICAgICAgaWYgKCFzeCB8fCAhc3kpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvLmNvb3Jkc2l6ZSA9IGFicyhreCkgKyBTICsgYWJzKGt5KTtcbiAgICAgICAgICAgIHMucm90YXRpb24gPSBkZWcgKiAoc3ggKiBzeSA8IDAgPyAtMSA6IDEpO1xuICAgICAgICAgICAgaWYgKGRlZykge1xuICAgICAgICAgICAgICAgIHZhciBjID0gY29tcGVuc2F0aW9uKGRlZywgZHgsIGR5KTtcbiAgICAgICAgICAgICAgICBkeCA9IGMuZHg7XG4gICAgICAgICAgICAgICAgZHkgPSBjLmR5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3ggPCAwICYmIChmbGlwICs9IFwieFwiKTtcbiAgICAgICAgICAgIHN5IDwgMCAmJiAoZmxpcCArPSBcIiB5XCIpICYmICh5ID0gLTEpO1xuICAgICAgICAgICAgcy5mbGlwID0gZmxpcDtcbiAgICAgICAgICAgIG8uY29vcmRvcmlnaW4gPSAoZHggKiAta3gpICsgUyArIChkeSAqIC1reSk7XG4gICAgICAgICAgICBpZiAoZmlsbHBvcyB8fCBfLmZpbGxzaXplKSB7XG4gICAgICAgICAgICAgICAgdmFyIGZpbGwgPSBvLmdldEVsZW1lbnRzQnlUYWdOYW1lKGZpbGxTdHJpbmcpO1xuICAgICAgICAgICAgICAgIGZpbGwgPSBmaWxsICYmIGZpbGxbMF07XG4gICAgICAgICAgICAgICAgby5yZW1vdmVDaGlsZChmaWxsKTtcbiAgICAgICAgICAgICAgICBpZiAoZmlsbHBvcykge1xuICAgICAgICAgICAgICAgICAgICBjID0gY29tcGVuc2F0aW9uKGRlZywgbS54KGZpbGxwb3NbMF0sIGZpbGxwb3NbMV0pLCBtLnkoZmlsbHBvc1swXSwgZmlsbHBvc1sxXSkpO1xuICAgICAgICAgICAgICAgICAgICBmaWxsLnBvc2l0aW9uID0gYy5keCAqIHkgKyBTICsgYy5keSAqIHk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChfLmZpbGxzaXplKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbGwuc2l6ZSA9IF8uZmlsbHNpemVbMF0gKiBhYnMoc3gpICsgUyArIF8uZmlsbHNpemVbMV0gKiBhYnMoc3kpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvLmFwcGVuZENoaWxkKGZpbGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcy52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XG4gICAgICAgIH07XG4gICAgUi50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICBcIllvdXIgYnJvd3NlciBkb2VzblxcdTIwMTl0IHN1cHBvcnQgU1ZHLiBGYWxsaW5nIGRvd24gdG8gVk1MLlxcbllvdSBhcmUgcnVubmluZyBSYXBoYVxceGVibCBcIiArIHRoaXMudmVyc2lvbjtcbiAgICB9O1xuICAgIHZhciBhZGRBcnJvdyA9IGZ1bmN0aW9uIChvLCB2YWx1ZSwgaXNFbmQpIHtcbiAgICAgICAgdmFyIHZhbHVlcyA9IFN0cih2YWx1ZSkudG9Mb3dlckNhc2UoKS5zcGxpdChcIi1cIiksXG4gICAgICAgICAgICBzZSA9IGlzRW5kID8gXCJlbmRcIiA6IFwic3RhcnRcIixcbiAgICAgICAgICAgIGkgPSB2YWx1ZXMubGVuZ3RoLFxuICAgICAgICAgICAgdHlwZSA9IFwiY2xhc3NpY1wiLFxuICAgICAgICAgICAgdyA9IFwibWVkaXVtXCIsXG4gICAgICAgICAgICBoID0gXCJtZWRpdW1cIjtcbiAgICAgICAgd2hpbGUgKGktLSkge1xuICAgICAgICAgICAgc3dpdGNoICh2YWx1ZXNbaV0pIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiYmxvY2tcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwiY2xhc3NpY1wiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCJvdmFsXCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcImRpYW1vbmRcIjpcbiAgICAgICAgICAgICAgICBjYXNlIFwib3BlblwiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCJub25lXCI6XG4gICAgICAgICAgICAgICAgICAgIHR5cGUgPSB2YWx1ZXNbaV07XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgXCJ3aWRlXCI6XG4gICAgICAgICAgICAgICAgY2FzZSBcIm5hcnJvd1wiOiBoID0gdmFsdWVzW2ldOyBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwibG9uZ1wiOlxuICAgICAgICAgICAgICAgIGNhc2UgXCJzaG9ydFwiOiB3ID0gdmFsdWVzW2ldOyBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgc3Ryb2tlID0gby5ub2RlLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic3Ryb2tlXCIpWzBdO1xuICAgICAgICBzdHJva2Vbc2UgKyBcImFycm93XCJdID0gdHlwZTtcbiAgICAgICAgc3Ryb2tlW3NlICsgXCJhcnJvd2xlbmd0aFwiXSA9IHc7XG4gICAgICAgIHN0cm9rZVtzZSArIFwiYXJyb3d3aWR0aFwiXSA9IGg7XG4gICAgfSxcbiAgICBzZXRGaWxsQW5kU3Ryb2tlID0gZnVuY3Rpb24gKG8sIHBhcmFtcykge1xuICAgICAgICAvLyBvLnBhcGVyLmNhbnZhcy5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgIG8uYXR0cnMgPSBvLmF0dHJzIHx8IHt9O1xuICAgICAgICB2YXIgbm9kZSA9IG8ubm9kZSxcbiAgICAgICAgICAgIGEgPSBvLmF0dHJzLFxuICAgICAgICAgICAgcyA9IG5vZGUuc3R5bGUsXG4gICAgICAgICAgICB4eSxcbiAgICAgICAgICAgIG5ld3BhdGggPSBwYXRoVHlwZXNbby50eXBlXSAmJiAocGFyYW1zLnggIT0gYS54IHx8IHBhcmFtcy55ICE9IGEueSB8fCBwYXJhbXMud2lkdGggIT0gYS53aWR0aCB8fCBwYXJhbXMuaGVpZ2h0ICE9IGEuaGVpZ2h0IHx8IHBhcmFtcy5jeCAhPSBhLmN4IHx8IHBhcmFtcy5jeSAhPSBhLmN5IHx8IHBhcmFtcy5yeCAhPSBhLnJ4IHx8IHBhcmFtcy5yeSAhPSBhLnJ5IHx8IHBhcmFtcy5yICE9IGEuciksXG4gICAgICAgICAgICBpc092YWwgPSBvdmFsVHlwZXNbby50eXBlXSAmJiAoYS5jeCAhPSBwYXJhbXMuY3ggfHwgYS5jeSAhPSBwYXJhbXMuY3kgfHwgYS5yICE9IHBhcmFtcy5yIHx8IGEucnggIT0gcGFyYW1zLnJ4IHx8IGEucnkgIT0gcGFyYW1zLnJ5KSxcbiAgICAgICAgICAgIHJlcyA9IG87XG5cblxuICAgICAgICBmb3IgKHZhciBwYXIgaW4gcGFyYW1zKSBpZiAocGFyYW1zW2hhc10ocGFyKSkge1xuICAgICAgICAgICAgYVtwYXJdID0gcGFyYW1zW3Bhcl07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5ld3BhdGgpIHtcbiAgICAgICAgICAgIGEucGF0aCA9IFIuX2dldFBhdGhbby50eXBlXShvKTtcbiAgICAgICAgICAgIG8uXy5kaXJ0eSA9IDE7XG4gICAgICAgIH1cbiAgICAgICAgcGFyYW1zLmhyZWYgJiYgKG5vZGUuaHJlZiA9IHBhcmFtcy5ocmVmKTtcbiAgICAgICAgcGFyYW1zLnRpdGxlICYmIChub2RlLnRpdGxlID0gcGFyYW1zLnRpdGxlKTtcbiAgICAgICAgcGFyYW1zLnRhcmdldCAmJiAobm9kZS50YXJnZXQgPSBwYXJhbXMudGFyZ2V0KTtcbiAgICAgICAgcGFyYW1zLmN1cnNvciAmJiAocy5jdXJzb3IgPSBwYXJhbXMuY3Vyc29yKTtcbiAgICAgICAgXCJibHVyXCIgaW4gcGFyYW1zICYmIG8uYmx1cihwYXJhbXMuYmx1cik7XG4gICAgICAgIGlmIChwYXJhbXMucGF0aCAmJiBvLnR5cGUgPT0gXCJwYXRoXCIgfHwgbmV3cGF0aCkge1xuICAgICAgICAgICAgbm9kZS5wYXRoID0gcGF0aDJ2bWwoflN0cihhLnBhdGgpLnRvTG93ZXJDYXNlKCkuaW5kZXhPZihcInJcIikgPyBSLl9wYXRoVG9BYnNvbHV0ZShhLnBhdGgpIDogYS5wYXRoKTtcbiAgICAgICAgICAgIGlmIChvLnR5cGUgPT0gXCJpbWFnZVwiKSB7XG4gICAgICAgICAgICAgICAgby5fLmZpbGxwb3MgPSBbYS54LCBhLnldO1xuICAgICAgICAgICAgICAgIG8uXy5maWxsc2l6ZSA9IFthLndpZHRoLCBhLmhlaWdodF07XG4gICAgICAgICAgICAgICAgc2V0Q29vcmRzKG8sIDEsIDEsIDAsIDAsIDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFwidHJhbnNmb3JtXCIgaW4gcGFyYW1zICYmIG8udHJhbnNmb3JtKHBhcmFtcy50cmFuc2Zvcm0pO1xuICAgICAgICBpZiAoaXNPdmFsKSB7XG4gICAgICAgICAgICB2YXIgY3ggPSArYS5jeCxcbiAgICAgICAgICAgICAgICBjeSA9ICthLmN5LFxuICAgICAgICAgICAgICAgIHJ4ID0gK2EucnggfHwgK2EuciB8fCAwLFxuICAgICAgICAgICAgICAgIHJ5ID0gK2EucnkgfHwgK2EuciB8fCAwO1xuICAgICAgICAgICAgbm9kZS5wYXRoID0gUi5mb3JtYXQoXCJhcnswfSx7MX0sezJ9LHszfSx7NH0sezF9LHs0fSx7MX14XCIsIHJvdW5kKChjeCAtIHJ4KSAqIHpvb20pLCByb3VuZCgoY3kgLSByeSkgKiB6b29tKSwgcm91bmQoKGN4ICsgcngpICogem9vbSksIHJvdW5kKChjeSArIHJ5KSAqIHpvb20pLCByb3VuZChjeCAqIHpvb20pKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoXCJjbGlwLXJlY3RcIiBpbiBwYXJhbXMpIHtcbiAgICAgICAgICAgIHZhciByZWN0ID0gU3RyKHBhcmFtc1tcImNsaXAtcmVjdFwiXSkuc3BsaXQoc2VwYXJhdG9yKTtcbiAgICAgICAgICAgIGlmIChyZWN0Lmxlbmd0aCA9PSA0KSB7XG4gICAgICAgICAgICAgICAgcmVjdFsyXSA9ICtyZWN0WzJdICsgKCtyZWN0WzBdKTtcbiAgICAgICAgICAgICAgICByZWN0WzNdID0gK3JlY3RbM10gKyAoK3JlY3RbMV0pO1xuICAgICAgICAgICAgICAgIHZhciBkaXYgPSBub2RlLmNsaXBSZWN0IHx8IFIuX2cuZG9jLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksXG4gICAgICAgICAgICAgICAgICAgIGRzdHlsZSA9IGRpdi5zdHlsZTtcbiAgICAgICAgICAgICAgICBkc3R5bGUuY2xpcCA9IFIuZm9ybWF0KFwicmVjdCh7MX1weCB7Mn1weCB7M31weCB7MH1weClcIiwgcmVjdCk7XG4gICAgICAgICAgICAgICAgaWYgKCFub2RlLmNsaXBSZWN0KSB7XG4gICAgICAgICAgICAgICAgICAgIGRzdHlsZS5wb3NpdGlvbiA9IFwiYWJzb2x1dGVcIjtcbiAgICAgICAgICAgICAgICAgICAgZHN0eWxlLnRvcCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGRzdHlsZS5sZWZ0ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZHN0eWxlLndpZHRoID0gby5wYXBlci53aWR0aCArIFwicHhcIjtcbiAgICAgICAgICAgICAgICAgICAgZHN0eWxlLmhlaWdodCA9IG8ucGFwZXIuaGVpZ2h0ICsgXCJweFwiO1xuICAgICAgICAgICAgICAgICAgICBub2RlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKGRpdiwgbm9kZSk7XG4gICAgICAgICAgICAgICAgICAgIGRpdi5hcHBlbmRDaGlsZChub2RlKTtcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5jbGlwUmVjdCA9IGRpdjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXBhcmFtc1tcImNsaXAtcmVjdFwiXSkge1xuICAgICAgICAgICAgICAgIG5vZGUuY2xpcFJlY3QgJiYgKG5vZGUuY2xpcFJlY3Quc3R5bGUuY2xpcCA9IFwiYXV0b1wiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoby50ZXh0cGF0aCkge1xuICAgICAgICAgICAgdmFyIHRleHRwYXRoU3R5bGUgPSBvLnRleHRwYXRoLnN0eWxlO1xuICAgICAgICAgICAgcGFyYW1zLmZvbnQgJiYgKHRleHRwYXRoU3R5bGUuZm9udCA9IHBhcmFtcy5mb250KTtcbiAgICAgICAgICAgIHBhcmFtc1tcImZvbnQtZmFtaWx5XCJdICYmICh0ZXh0cGF0aFN0eWxlLmZvbnRGYW1pbHkgPSAnXCInICsgcGFyYW1zW1wiZm9udC1mYW1pbHlcIl0uc3BsaXQoXCIsXCIpWzBdLnJlcGxhY2UoL15bJ1wiXSt8WydcIl0rJC9nLCBFKSArICdcIicpO1xuICAgICAgICAgICAgcGFyYW1zW1wiZm9udC1zaXplXCJdICYmICh0ZXh0cGF0aFN0eWxlLmZvbnRTaXplID0gcGFyYW1zW1wiZm9udC1zaXplXCJdKTtcbiAgICAgICAgICAgIHBhcmFtc1tcImZvbnQtd2VpZ2h0XCJdICYmICh0ZXh0cGF0aFN0eWxlLmZvbnRXZWlnaHQgPSBwYXJhbXNbXCJmb250LXdlaWdodFwiXSk7XG4gICAgICAgICAgICBwYXJhbXNbXCJmb250LXN0eWxlXCJdICYmICh0ZXh0cGF0aFN0eWxlLmZvbnRTdHlsZSA9IHBhcmFtc1tcImZvbnQtc3R5bGVcIl0pO1xuICAgICAgICB9XG4gICAgICAgIGlmIChcImFycm93LXN0YXJ0XCIgaW4gcGFyYW1zKSB7XG4gICAgICAgICAgICBhZGRBcnJvdyhyZXMsIHBhcmFtc1tcImFycm93LXN0YXJ0XCJdKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoXCJhcnJvdy1lbmRcIiBpbiBwYXJhbXMpIHtcbiAgICAgICAgICAgIGFkZEFycm93KHJlcywgcGFyYW1zW1wiYXJyb3ctZW5kXCJdLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGFyYW1zLm9wYWNpdHkgIT0gbnVsbCB8fCBcbiAgICAgICAgICAgIHBhcmFtc1tcInN0cm9rZS13aWR0aFwiXSAhPSBudWxsIHx8XG4gICAgICAgICAgICBwYXJhbXMuZmlsbCAhPSBudWxsIHx8XG4gICAgICAgICAgICBwYXJhbXMuc3JjICE9IG51bGwgfHxcbiAgICAgICAgICAgIHBhcmFtcy5zdHJva2UgIT0gbnVsbCB8fFxuICAgICAgICAgICAgcGFyYW1zW1wic3Ryb2tlLXdpZHRoXCJdICE9IG51bGwgfHxcbiAgICAgICAgICAgIHBhcmFtc1tcInN0cm9rZS1vcGFjaXR5XCJdICE9IG51bGwgfHxcbiAgICAgICAgICAgIHBhcmFtc1tcImZpbGwtb3BhY2l0eVwiXSAhPSBudWxsIHx8XG4gICAgICAgICAgICBwYXJhbXNbXCJzdHJva2UtZGFzaGFycmF5XCJdICE9IG51bGwgfHxcbiAgICAgICAgICAgIHBhcmFtc1tcInN0cm9rZS1taXRlcmxpbWl0XCJdICE9IG51bGwgfHxcbiAgICAgICAgICAgIHBhcmFtc1tcInN0cm9rZS1saW5lam9pblwiXSAhPSBudWxsIHx8XG4gICAgICAgICAgICBwYXJhbXNbXCJzdHJva2UtbGluZWNhcFwiXSAhPSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgZmlsbCA9IG5vZGUuZ2V0RWxlbWVudHNCeVRhZ05hbWUoZmlsbFN0cmluZyksXG4gICAgICAgICAgICAgICAgbmV3ZmlsbCA9IGZhbHNlO1xuICAgICAgICAgICAgZmlsbCA9IGZpbGwgJiYgZmlsbFswXTtcbiAgICAgICAgICAgICFmaWxsICYmIChuZXdmaWxsID0gZmlsbCA9IGNyZWF0ZU5vZGUoZmlsbFN0cmluZykpO1xuICAgICAgICAgICAgaWYgKG8udHlwZSA9PSBcImltYWdlXCIgJiYgcGFyYW1zLnNyYykge1xuICAgICAgICAgICAgICAgIGZpbGwuc3JjID0gcGFyYW1zLnNyYztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhcmFtcy5maWxsICYmIChmaWxsLm9uID0gdHJ1ZSk7XG4gICAgICAgICAgICBpZiAoZmlsbC5vbiA9PSBudWxsIHx8IHBhcmFtcy5maWxsID09IFwibm9uZVwiIHx8IHBhcmFtcy5maWxsID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgZmlsbC5vbiA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGZpbGwub24gJiYgcGFyYW1zLmZpbGwpIHtcbiAgICAgICAgICAgICAgICB2YXIgaXNVUkwgPSBTdHIocGFyYW1zLmZpbGwpLm1hdGNoKFIuX0lTVVJMKTtcbiAgICAgICAgICAgICAgICBpZiAoaXNVUkwpIHtcbiAgICAgICAgICAgICAgICAgICAgZmlsbC5wYXJlbnROb2RlID09IG5vZGUgJiYgbm9kZS5yZW1vdmVDaGlsZChmaWxsKTtcbiAgICAgICAgICAgICAgICAgICAgZmlsbC5yb3RhdGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBmaWxsLnNyYyA9IGlzVVJMWzFdO1xuICAgICAgICAgICAgICAgICAgICBmaWxsLnR5cGUgPSBcInRpbGVcIjtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGJib3ggPSBvLmdldEJCb3goMSk7XG4gICAgICAgICAgICAgICAgICAgIGZpbGwucG9zaXRpb24gPSBiYm94LnggKyBTICsgYmJveC55O1xuICAgICAgICAgICAgICAgICAgICBvLl8uZmlsbHBvcyA9IFtiYm94LngsIGJib3gueV07XG5cbiAgICAgICAgICAgICAgICAgICAgUi5fcHJlbG9hZChpc1VSTFsxXSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgby5fLmZpbGxzaXplID0gW3RoaXMub2Zmc2V0V2lkdGgsIHRoaXMub2Zmc2V0SGVpZ2h0XTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZmlsbC5jb2xvciA9IFIuZ2V0UkdCKHBhcmFtcy5maWxsKS5oZXg7XG4gICAgICAgICAgICAgICAgICAgIGZpbGwuc3JjID0gRTtcbiAgICAgICAgICAgICAgICAgICAgZmlsbC50eXBlID0gXCJzb2xpZFwiO1xuICAgICAgICAgICAgICAgICAgICBpZiAoUi5nZXRSR0IocGFyYW1zLmZpbGwpLmVycm9yICYmIChyZXMudHlwZSBpbiB7Y2lyY2xlOiAxLCBlbGxpcHNlOiAxfSB8fCBTdHIocGFyYW1zLmZpbGwpLmNoYXJBdCgpICE9IFwiclwiKSAmJiBhZGRHcmFkaWVudEZpbGwocmVzLCBwYXJhbXMuZmlsbCwgZmlsbCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGEuZmlsbCA9IFwibm9uZVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgYS5ncmFkaWVudCA9IHBhcmFtcy5maWxsO1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsbC5yb3RhdGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChcImZpbGwtb3BhY2l0eVwiIGluIHBhcmFtcyB8fCBcIm9wYWNpdHlcIiBpbiBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICB2YXIgb3BhY2l0eSA9ICgoK2FbXCJmaWxsLW9wYWNpdHlcIl0gKyAxIHx8IDIpIC0gMSkgKiAoKCthLm9wYWNpdHkgKyAxIHx8IDIpIC0gMSkgKiAoKCtSLmdldFJHQihwYXJhbXMuZmlsbCkubyArIDEgfHwgMikgLSAxKTtcbiAgICAgICAgICAgICAgICBvcGFjaXR5ID0gbW1pbihtbWF4KG9wYWNpdHksIDApLCAxKTtcbiAgICAgICAgICAgICAgICBmaWxsLm9wYWNpdHkgPSBvcGFjaXR5O1xuICAgICAgICAgICAgICAgIGlmIChmaWxsLnNyYykge1xuICAgICAgICAgICAgICAgICAgICBmaWxsLmNvbG9yID0gXCJub25lXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbm9kZS5hcHBlbmRDaGlsZChmaWxsKTtcbiAgICAgICAgICAgIHZhciBzdHJva2UgPSAobm9kZS5nZXRFbGVtZW50c0J5VGFnTmFtZShcInN0cm9rZVwiKSAmJiBub2RlLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwic3Ryb2tlXCIpWzBdKSxcbiAgICAgICAgICAgIG5ld3N0cm9rZSA9IGZhbHNlO1xuICAgICAgICAgICAgIXN0cm9rZSAmJiAobmV3c3Ryb2tlID0gc3Ryb2tlID0gY3JlYXRlTm9kZShcInN0cm9rZVwiKSk7XG4gICAgICAgICAgICBpZiAoKHBhcmFtcy5zdHJva2UgJiYgcGFyYW1zLnN0cm9rZSAhPSBcIm5vbmVcIikgfHxcbiAgICAgICAgICAgICAgICBwYXJhbXNbXCJzdHJva2Utd2lkdGhcIl0gfHxcbiAgICAgICAgICAgICAgICBwYXJhbXNbXCJzdHJva2Utb3BhY2l0eVwiXSAhPSBudWxsIHx8XG4gICAgICAgICAgICAgICAgcGFyYW1zW1wic3Ryb2tlLWRhc2hhcnJheVwiXSB8fFxuICAgICAgICAgICAgICAgIHBhcmFtc1tcInN0cm9rZS1taXRlcmxpbWl0XCJdIHx8XG4gICAgICAgICAgICAgICAgcGFyYW1zW1wic3Ryb2tlLWxpbmVqb2luXCJdIHx8XG4gICAgICAgICAgICAgICAgcGFyYW1zW1wic3Ryb2tlLWxpbmVjYXBcIl0pIHtcbiAgICAgICAgICAgICAgICBzdHJva2Uub24gPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgKHBhcmFtcy5zdHJva2UgPT0gXCJub25lXCIgfHwgcGFyYW1zLnN0cm9rZSA9PT0gbnVsbCB8fCBzdHJva2Uub24gPT0gbnVsbCB8fCBwYXJhbXMuc3Ryb2tlID09IDAgfHwgcGFyYW1zW1wic3Ryb2tlLXdpZHRoXCJdID09IDApICYmIChzdHJva2Uub24gPSBmYWxzZSk7XG4gICAgICAgICAgICB2YXIgc3Ryb2tlQ29sb3IgPSBSLmdldFJHQihwYXJhbXMuc3Ryb2tlKTtcbiAgICAgICAgICAgIHN0cm9rZS5vbiAmJiBwYXJhbXMuc3Ryb2tlICYmIChzdHJva2UuY29sb3IgPSBzdHJva2VDb2xvci5oZXgpO1xuICAgICAgICAgICAgb3BhY2l0eSA9ICgoK2FbXCJzdHJva2Utb3BhY2l0eVwiXSArIDEgfHwgMikgLSAxKSAqICgoK2Eub3BhY2l0eSArIDEgfHwgMikgLSAxKSAqICgoK3N0cm9rZUNvbG9yLm8gKyAxIHx8IDIpIC0gMSk7XG4gICAgICAgICAgICB2YXIgd2lkdGggPSAodG9GbG9hdChwYXJhbXNbXCJzdHJva2Utd2lkdGhcIl0pIHx8IDEpICogLjc1O1xuICAgICAgICAgICAgb3BhY2l0eSA9IG1taW4obW1heChvcGFjaXR5LCAwKSwgMSk7XG4gICAgICAgICAgICBwYXJhbXNbXCJzdHJva2Utd2lkdGhcIl0gPT0gbnVsbCAmJiAod2lkdGggPSBhW1wic3Ryb2tlLXdpZHRoXCJdKTtcbiAgICAgICAgICAgIHBhcmFtc1tcInN0cm9rZS13aWR0aFwiXSAmJiAoc3Ryb2tlLndlaWdodCA9IHdpZHRoKTtcbiAgICAgICAgICAgIHdpZHRoICYmIHdpZHRoIDwgMSAmJiAob3BhY2l0eSAqPSB3aWR0aCkgJiYgKHN0cm9rZS53ZWlnaHQgPSAxKTtcbiAgICAgICAgICAgIHN0cm9rZS5vcGFjaXR5ID0gb3BhY2l0eTtcbiAgICAgICAgXG4gICAgICAgICAgICBwYXJhbXNbXCJzdHJva2UtbGluZWpvaW5cIl0gJiYgKHN0cm9rZS5qb2luc3R5bGUgPSBwYXJhbXNbXCJzdHJva2UtbGluZWpvaW5cIl0gfHwgXCJtaXRlclwiKTtcbiAgICAgICAgICAgIHN0cm9rZS5taXRlcmxpbWl0ID0gcGFyYW1zW1wic3Ryb2tlLW1pdGVybGltaXRcIl0gfHwgODtcbiAgICAgICAgICAgIHBhcmFtc1tcInN0cm9rZS1saW5lY2FwXCJdICYmIChzdHJva2UuZW5kY2FwID0gcGFyYW1zW1wic3Ryb2tlLWxpbmVjYXBcIl0gPT0gXCJidXR0XCIgPyBcImZsYXRcIiA6IHBhcmFtc1tcInN0cm9rZS1saW5lY2FwXCJdID09IFwic3F1YXJlXCIgPyBcInNxdWFyZVwiIDogXCJyb3VuZFwiKTtcbiAgICAgICAgICAgIGlmIChwYXJhbXNbXCJzdHJva2UtZGFzaGFycmF5XCJdKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRhc2hhcnJheSA9IHtcbiAgICAgICAgICAgICAgICAgICAgXCItXCI6IFwic2hvcnRkYXNoXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiLlwiOiBcInNob3J0ZG90XCIsXG4gICAgICAgICAgICAgICAgICAgIFwiLS5cIjogXCJzaG9ydGRhc2hkb3RcIixcbiAgICAgICAgICAgICAgICAgICAgXCItLi5cIjogXCJzaG9ydGRhc2hkb3Rkb3RcIixcbiAgICAgICAgICAgICAgICAgICAgXCIuIFwiOiBcImRvdFwiLFxuICAgICAgICAgICAgICAgICAgICBcIi0gXCI6IFwiZGFzaFwiLFxuICAgICAgICAgICAgICAgICAgICBcIi0tXCI6IFwibG9uZ2Rhc2hcIixcbiAgICAgICAgICAgICAgICAgICAgXCItIC5cIjogXCJkYXNoZG90XCIsXG4gICAgICAgICAgICAgICAgICAgIFwiLS0uXCI6IFwibG9uZ2Rhc2hkb3RcIixcbiAgICAgICAgICAgICAgICAgICAgXCItLS4uXCI6IFwibG9uZ2Rhc2hkb3Rkb3RcIlxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgc3Ryb2tlLmRhc2hzdHlsZSA9IGRhc2hhcnJheVtoYXNdKHBhcmFtc1tcInN0cm9rZS1kYXNoYXJyYXlcIl0pID8gZGFzaGFycmF5W3BhcmFtc1tcInN0cm9rZS1kYXNoYXJyYXlcIl1dIDogRTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG5ld3N0cm9rZSAmJiBub2RlLmFwcGVuZENoaWxkKHN0cm9rZSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJlcy50eXBlID09IFwidGV4dFwiKSB7XG4gICAgICAgICAgICByZXMucGFwZXIuY2FudmFzLnN0eWxlLmRpc3BsYXkgPSBFO1xuICAgICAgICAgICAgdmFyIHNwYW4gPSByZXMucGFwZXIuc3BhbixcbiAgICAgICAgICAgICAgICBtID0gMTAwLFxuICAgICAgICAgICAgICAgIGZvbnRTaXplID0gYS5mb250ICYmIGEuZm9udC5tYXRjaCgvXFxkKyg/OlxcLlxcZCopPyg/PXB4KS8pO1xuICAgICAgICAgICAgcyA9IHNwYW4uc3R5bGU7XG4gICAgICAgICAgICBhLmZvbnQgJiYgKHMuZm9udCA9IGEuZm9udCk7XG4gICAgICAgICAgICBhW1wiZm9udC1mYW1pbHlcIl0gJiYgKHMuZm9udEZhbWlseSA9IGFbXCJmb250LWZhbWlseVwiXSk7XG4gICAgICAgICAgICBhW1wiZm9udC13ZWlnaHRcIl0gJiYgKHMuZm9udFdlaWdodCA9IGFbXCJmb250LXdlaWdodFwiXSk7XG4gICAgICAgICAgICBhW1wiZm9udC1zdHlsZVwiXSAmJiAocy5mb250U3R5bGUgPSBhW1wiZm9udC1zdHlsZVwiXSk7XG4gICAgICAgICAgICBmb250U2l6ZSA9IHRvRmxvYXQoYVtcImZvbnQtc2l6ZVwiXSB8fCBmb250U2l6ZSAmJiBmb250U2l6ZVswXSkgfHwgMTA7XG4gICAgICAgICAgICBzLmZvbnRTaXplID0gZm9udFNpemUgKiBtICsgXCJweFwiO1xuICAgICAgICAgICAgcmVzLnRleHRwYXRoLnN0cmluZyAmJiAoc3Bhbi5pbm5lckhUTUwgPSBTdHIocmVzLnRleHRwYXRoLnN0cmluZykucmVwbGFjZSgvPC9nLCBcIiYjNjA7XCIpLnJlcGxhY2UoLyYvZywgXCImIzM4O1wiKS5yZXBsYWNlKC9cXG4vZywgXCI8YnI+XCIpKTtcbiAgICAgICAgICAgIHZhciBicmVjdCA9IHNwYW4uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgICByZXMuVyA9IGEudyA9IChicmVjdC5yaWdodCAtIGJyZWN0LmxlZnQpIC8gbTtcbiAgICAgICAgICAgIHJlcy5IID0gYS5oID0gKGJyZWN0LmJvdHRvbSAtIGJyZWN0LnRvcCkgLyBtO1xuICAgICAgICAgICAgLy8gcmVzLnBhcGVyLmNhbnZhcy5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgICAgICByZXMuWCA9IGEueDtcbiAgICAgICAgICAgIHJlcy5ZID0gYS55ICsgcmVzLkggLyAyO1xuXG4gICAgICAgICAgICAoXCJ4XCIgaW4gcGFyYW1zIHx8IFwieVwiIGluIHBhcmFtcykgJiYgKHJlcy5wYXRoLnYgPSBSLmZvcm1hdChcIm17MH0sezF9bHsyfSx7MX1cIiwgcm91bmQoYS54ICogem9vbSksIHJvdW5kKGEueSAqIHpvb20pLCByb3VuZChhLnggKiB6b29tKSArIDEpKTtcbiAgICAgICAgICAgIHZhciBkaXJ0eWF0dHJzID0gW1wieFwiLCBcInlcIiwgXCJ0ZXh0XCIsIFwiZm9udFwiLCBcImZvbnQtZmFtaWx5XCIsIFwiZm9udC13ZWlnaHRcIiwgXCJmb250LXN0eWxlXCIsIFwiZm9udC1zaXplXCJdO1xuICAgICAgICAgICAgZm9yICh2YXIgZCA9IDAsIGRkID0gZGlydHlhdHRycy5sZW5ndGg7IGQgPCBkZDsgZCsrKSBpZiAoZGlydHlhdHRyc1tkXSBpbiBwYXJhbXMpIHtcbiAgICAgICAgICAgICAgICByZXMuXy5kaXJ0eSA9IDE7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAgICAgLy8gdGV4dC1hbmNob3IgZW11bGF0aW9uXG4gICAgICAgICAgICBzd2l0Y2ggKGFbXCJ0ZXh0LWFuY2hvclwiXSkge1xuICAgICAgICAgICAgICAgIGNhc2UgXCJzdGFydFwiOlxuICAgICAgICAgICAgICAgICAgICByZXMudGV4dHBhdGguc3R5bGVbXCJ2LXRleHQtYWxpZ25cIl0gPSBcImxlZnRcIjtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmJieCA9IHJlcy5XIC8gMjtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIFwiZW5kXCI6XG4gICAgICAgICAgICAgICAgICAgIHJlcy50ZXh0cGF0aC5zdHlsZVtcInYtdGV4dC1hbGlnblwiXSA9IFwicmlnaHRcIjtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmJieCA9IC1yZXMuVyAvIDI7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgcmVzLnRleHRwYXRoLnN0eWxlW1widi10ZXh0LWFsaWduXCJdID0gXCJjZW50ZXJcIjtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmJieCA9IDA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXMudGV4dHBhdGguc3R5bGVbXCJ2LXRleHQta2VyblwiXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gcmVzLnBhcGVyLmNhbnZhcy5zdHlsZS5kaXNwbGF5ID0gRTtcbiAgICB9LFxuICAgIGFkZEdyYWRpZW50RmlsbCA9IGZ1bmN0aW9uIChvLCBncmFkaWVudCwgZmlsbCkge1xuICAgICAgICBvLmF0dHJzID0gby5hdHRycyB8fCB7fTtcbiAgICAgICAgdmFyIGF0dHJzID0gby5hdHRycyxcbiAgICAgICAgICAgIHBvdyA9IE1hdGgucG93LFxuICAgICAgICAgICAgb3BhY2l0eSxcbiAgICAgICAgICAgIG9pbmRleCxcbiAgICAgICAgICAgIHR5cGUgPSBcImxpbmVhclwiLFxuICAgICAgICAgICAgZnhmeSA9IFwiLjUgLjVcIjtcbiAgICAgICAgby5hdHRycy5ncmFkaWVudCA9IGdyYWRpZW50O1xuICAgICAgICBncmFkaWVudCA9IFN0cihncmFkaWVudCkucmVwbGFjZShSLl9yYWRpYWxfZ3JhZGllbnQsIGZ1bmN0aW9uIChhbGwsIGZ4LCBmeSkge1xuICAgICAgICAgICAgdHlwZSA9IFwicmFkaWFsXCI7XG4gICAgICAgICAgICBpZiAoZnggJiYgZnkpIHtcbiAgICAgICAgICAgICAgICBmeCA9IHRvRmxvYXQoZngpO1xuICAgICAgICAgICAgICAgIGZ5ID0gdG9GbG9hdChmeSk7XG4gICAgICAgICAgICAgICAgcG93KGZ4IC0gLjUsIDIpICsgcG93KGZ5IC0gLjUsIDIpID4gLjI1ICYmIChmeSA9IG1hdGguc3FydCguMjUgLSBwb3coZnggLSAuNSwgMikpICogKChmeSA+IC41KSAqIDIgLSAxKSArIC41KTtcbiAgICAgICAgICAgICAgICBmeGZ5ID0gZnggKyBTICsgZnk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gRTtcbiAgICAgICAgfSk7XG4gICAgICAgIGdyYWRpZW50ID0gZ3JhZGllbnQuc3BsaXQoL1xccypcXC1cXHMqLyk7XG4gICAgICAgIGlmICh0eXBlID09IFwibGluZWFyXCIpIHtcbiAgICAgICAgICAgIHZhciBhbmdsZSA9IGdyYWRpZW50LnNoaWZ0KCk7XG4gICAgICAgICAgICBhbmdsZSA9IC10b0Zsb2F0KGFuZ2xlKTtcbiAgICAgICAgICAgIGlmIChpc05hTihhbmdsZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICB2YXIgZG90cyA9IFIuX3BhcnNlRG90cyhncmFkaWVudCk7XG4gICAgICAgIGlmICghZG90cykge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgbyA9IG8uc2hhcGUgfHwgby5ub2RlO1xuICAgICAgICBpZiAoZG90cy5sZW5ndGgpIHtcbiAgICAgICAgICAgIG8ucmVtb3ZlQ2hpbGQoZmlsbCk7XG4gICAgICAgICAgICBmaWxsLm9uID0gdHJ1ZTtcbiAgICAgICAgICAgIGZpbGwubWV0aG9kID0gXCJub25lXCI7XG4gICAgICAgICAgICBmaWxsLmNvbG9yID0gZG90c1swXS5jb2xvcjtcbiAgICAgICAgICAgIGZpbGwuY29sb3IyID0gZG90c1tkb3RzLmxlbmd0aCAtIDFdLmNvbG9yO1xuICAgICAgICAgICAgdmFyIGNscnMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IGRvdHMubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIGRvdHNbaV0ub2Zmc2V0ICYmIGNscnMucHVzaChkb3RzW2ldLm9mZnNldCArIFMgKyBkb3RzW2ldLmNvbG9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZpbGwuY29sb3JzID0gY2xycy5sZW5ndGggPyBjbHJzLmpvaW4oKSA6IFwiMCUgXCIgKyBmaWxsLmNvbG9yO1xuICAgICAgICAgICAgaWYgKHR5cGUgPT0gXCJyYWRpYWxcIikge1xuICAgICAgICAgICAgICAgIGZpbGwudHlwZSA9IFwiZ3JhZGllbnRUaXRsZVwiO1xuICAgICAgICAgICAgICAgIGZpbGwuZm9jdXMgPSBcIjEwMCVcIjtcbiAgICAgICAgICAgICAgICBmaWxsLmZvY3Vzc2l6ZSA9IFwiMCAwXCI7XG4gICAgICAgICAgICAgICAgZmlsbC5mb2N1c3Bvc2l0aW9uID0gZnhmeTtcbiAgICAgICAgICAgICAgICBmaWxsLmFuZ2xlID0gMDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gZmlsbC5yb3RhdGU9IHRydWU7XG4gICAgICAgICAgICAgICAgZmlsbC50eXBlID0gXCJncmFkaWVudFwiO1xuICAgICAgICAgICAgICAgIGZpbGwuYW5nbGUgPSAoMjcwIC0gYW5nbGUpICUgMzYwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgby5hcHBlbmRDaGlsZChmaWxsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gMTtcbiAgICB9LFxuICAgIEVsZW1lbnQgPSBmdW5jdGlvbiAobm9kZSwgdm1sKSB7XG4gICAgICAgIHRoaXNbMF0gPSB0aGlzLm5vZGUgPSBub2RlO1xuICAgICAgICBub2RlLnJhcGhhZWwgPSB0cnVlO1xuICAgICAgICB0aGlzLmlkID0gUi5fb2lkKys7XG4gICAgICAgIG5vZGUucmFwaGFlbGlkID0gdGhpcy5pZDtcbiAgICAgICAgdGhpcy5YID0gMDtcbiAgICAgICAgdGhpcy5ZID0gMDtcbiAgICAgICAgdGhpcy5hdHRycyA9IHt9O1xuICAgICAgICB0aGlzLnBhcGVyID0gdm1sO1xuICAgICAgICB0aGlzLm1hdHJpeCA9IFIubWF0cml4KCk7XG4gICAgICAgIHRoaXMuXyA9IHtcbiAgICAgICAgICAgIHRyYW5zZm9ybTogW10sXG4gICAgICAgICAgICBzeDogMSxcbiAgICAgICAgICAgIHN5OiAxLFxuICAgICAgICAgICAgZHg6IDAsXG4gICAgICAgICAgICBkeTogMCxcbiAgICAgICAgICAgIGRlZzogMCxcbiAgICAgICAgICAgIGRpcnR5OiAxLFxuICAgICAgICAgICAgZGlydHlUOiAxXG4gICAgICAgIH07XG4gICAgICAgICF2bWwuYm90dG9tICYmICh2bWwuYm90dG9tID0gdGhpcyk7XG4gICAgICAgIHRoaXMucHJldiA9IHZtbC50b3A7XG4gICAgICAgIHZtbC50b3AgJiYgKHZtbC50b3AubmV4dCA9IHRoaXMpO1xuICAgICAgICB2bWwudG9wID0gdGhpcztcbiAgICAgICAgdGhpcy5uZXh0ID0gbnVsbDtcbiAgICB9O1xuICAgIHZhciBlbHByb3RvID0gUi5lbDtcblxuICAgIEVsZW1lbnQucHJvdG90eXBlID0gZWxwcm90bztcbiAgICBlbHByb3RvLmNvbnN0cnVjdG9yID0gRWxlbWVudDtcbiAgICBlbHByb3RvLnRyYW5zZm9ybSA9IGZ1bmN0aW9uICh0c3RyKSB7XG4gICAgICAgIGlmICh0c3RyID09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl8udHJhbnNmb3JtO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2YnMgPSB0aGlzLnBhcGVyLl92aWV3Qm94U2hpZnQsXG4gICAgICAgICAgICB2YnQgPSB2YnMgPyBcInNcIiArIFt2YnMuc2NhbGUsIHZicy5zY2FsZV0gKyBcIi0xLTF0XCIgKyBbdmJzLmR4LCB2YnMuZHldIDogRSxcbiAgICAgICAgICAgIG9sZHQ7XG4gICAgICAgIGlmICh2YnMpIHtcbiAgICAgICAgICAgIG9sZHQgPSB0c3RyID0gU3RyKHRzdHIpLnJlcGxhY2UoL1xcLnszfXxcXHUyMDI2L2csIHRoaXMuXy50cmFuc2Zvcm0gfHwgRSk7XG4gICAgICAgIH1cbiAgICAgICAgUi5fZXh0cmFjdFRyYW5zZm9ybSh0aGlzLCB2YnQgKyB0c3RyKTtcbiAgICAgICAgdmFyIG1hdHJpeCA9IHRoaXMubWF0cml4LmNsb25lKCksXG4gICAgICAgICAgICBza2V3ID0gdGhpcy5za2V3LFxuICAgICAgICAgICAgbyA9IHRoaXMubm9kZSxcbiAgICAgICAgICAgIHNwbGl0LFxuICAgICAgICAgICAgaXNHcmFkID0gflN0cih0aGlzLmF0dHJzLmZpbGwpLmluZGV4T2YoXCItXCIpLFxuICAgICAgICAgICAgaXNQYXR0ID0gIVN0cih0aGlzLmF0dHJzLmZpbGwpLmluZGV4T2YoXCJ1cmwoXCIpO1xuICAgICAgICBtYXRyaXgudHJhbnNsYXRlKC0uNSwgLS41KTtcbiAgICAgICAgaWYgKGlzUGF0dCB8fCBpc0dyYWQgfHwgdGhpcy50eXBlID09IFwiaW1hZ2VcIikge1xuICAgICAgICAgICAgc2tldy5tYXRyaXggPSBcIjEgMCAwIDFcIjtcbiAgICAgICAgICAgIHNrZXcub2Zmc2V0ID0gXCIwIDBcIjtcbiAgICAgICAgICAgIHNwbGl0ID0gbWF0cml4LnNwbGl0KCk7XG4gICAgICAgICAgICBpZiAoKGlzR3JhZCAmJiBzcGxpdC5ub1JvdGF0aW9uKSB8fCAhc3BsaXQuaXNTaW1wbGUpIHtcbiAgICAgICAgICAgICAgICBvLnN0eWxlLmZpbHRlciA9IG1hdHJpeC50b0ZpbHRlcigpO1xuICAgICAgICAgICAgICAgIHZhciBiYiA9IHRoaXMuZ2V0QkJveCgpLFxuICAgICAgICAgICAgICAgICAgICBiYnQgPSB0aGlzLmdldEJCb3goMSksXG4gICAgICAgICAgICAgICAgICAgIGR4ID0gYmIueCAtIGJidC54LFxuICAgICAgICAgICAgICAgICAgICBkeSA9IGJiLnkgLSBiYnQueTtcbiAgICAgICAgICAgICAgICBvLmNvb3Jkb3JpZ2luID0gKGR4ICogLXpvb20pICsgUyArIChkeSAqIC16b29tKTtcbiAgICAgICAgICAgICAgICBzZXRDb29yZHModGhpcywgMSwgMSwgZHgsIGR5LCAwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgby5zdHlsZS5maWx0ZXIgPSBFO1xuICAgICAgICAgICAgICAgIHNldENvb3Jkcyh0aGlzLCBzcGxpdC5zY2FsZXgsIHNwbGl0LnNjYWxleSwgc3BsaXQuZHgsIHNwbGl0LmR5LCBzcGxpdC5yb3RhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgby5zdHlsZS5maWx0ZXIgPSBFO1xuICAgICAgICAgICAgc2tldy5tYXRyaXggPSBTdHIobWF0cml4KTtcbiAgICAgICAgICAgIHNrZXcub2Zmc2V0ID0gbWF0cml4Lm9mZnNldCgpO1xuICAgICAgICB9XG4gICAgICAgIG9sZHQgJiYgKHRoaXMuXy50cmFuc2Zvcm0gPSBvbGR0KTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBlbHByb3RvLnJvdGF0ZSA9IGZ1bmN0aW9uIChkZWcsIGN4LCBjeSkge1xuICAgICAgICBpZiAodGhpcy5yZW1vdmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGVnID09IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBkZWcgPSBTdHIoZGVnKS5zcGxpdChzZXBhcmF0b3IpO1xuICAgICAgICBpZiAoZGVnLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIGN4ID0gdG9GbG9hdChkZWdbMV0pO1xuICAgICAgICAgICAgY3kgPSB0b0Zsb2F0KGRlZ1syXSk7XG4gICAgICAgIH1cbiAgICAgICAgZGVnID0gdG9GbG9hdChkZWdbMF0pO1xuICAgICAgICAoY3kgPT0gbnVsbCkgJiYgKGN4ID0gY3kpO1xuICAgICAgICBpZiAoY3ggPT0gbnVsbCB8fCBjeSA9PSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgYmJveCA9IHRoaXMuZ2V0QkJveCgxKTtcbiAgICAgICAgICAgIGN4ID0gYmJveC54ICsgYmJveC53aWR0aCAvIDI7XG4gICAgICAgICAgICBjeSA9IGJib3gueSArIGJib3guaGVpZ2h0IC8gMjtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl8uZGlydHlUID0gMTtcbiAgICAgICAgdGhpcy50cmFuc2Zvcm0odGhpcy5fLnRyYW5zZm9ybS5jb25jYXQoW1tcInJcIiwgZGVnLCBjeCwgY3ldXSkpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIGVscHJvdG8udHJhbnNsYXRlID0gZnVuY3Rpb24gKGR4LCBkeSkge1xuICAgICAgICBpZiAodGhpcy5yZW1vdmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBkeCA9IFN0cihkeCkuc3BsaXQoc2VwYXJhdG9yKTtcbiAgICAgICAgaWYgKGR4Lmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIGR5ID0gdG9GbG9hdChkeFsxXSk7XG4gICAgICAgIH1cbiAgICAgICAgZHggPSB0b0Zsb2F0KGR4WzBdKSB8fCAwO1xuICAgICAgICBkeSA9ICtkeSB8fCAwO1xuICAgICAgICBpZiAodGhpcy5fLmJib3gpIHtcbiAgICAgICAgICAgIHRoaXMuXy5iYm94LnggKz0gZHg7XG4gICAgICAgICAgICB0aGlzLl8uYmJveC55ICs9IGR5O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMudHJhbnNmb3JtKHRoaXMuXy50cmFuc2Zvcm0uY29uY2F0KFtbXCJ0XCIsIGR4LCBkeV1dKSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgZWxwcm90by5zY2FsZSA9IGZ1bmN0aW9uIChzeCwgc3ksIGN4LCBjeSkge1xuICAgICAgICBpZiAodGhpcy5yZW1vdmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBzeCA9IFN0cihzeCkuc3BsaXQoc2VwYXJhdG9yKTtcbiAgICAgICAgaWYgKHN4Lmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgIHN5ID0gdG9GbG9hdChzeFsxXSk7XG4gICAgICAgICAgICBjeCA9IHRvRmxvYXQoc3hbMl0pO1xuICAgICAgICAgICAgY3kgPSB0b0Zsb2F0KHN4WzNdKTtcbiAgICAgICAgICAgIGlzTmFOKGN4KSAmJiAoY3ggPSBudWxsKTtcbiAgICAgICAgICAgIGlzTmFOKGN5KSAmJiAoY3kgPSBudWxsKTtcbiAgICAgICAgfVxuICAgICAgICBzeCA9IHRvRmxvYXQoc3hbMF0pO1xuICAgICAgICAoc3kgPT0gbnVsbCkgJiYgKHN5ID0gc3gpO1xuICAgICAgICAoY3kgPT0gbnVsbCkgJiYgKGN4ID0gY3kpO1xuICAgICAgICBpZiAoY3ggPT0gbnVsbCB8fCBjeSA9PSBudWxsKSB7XG4gICAgICAgICAgICB2YXIgYmJveCA9IHRoaXMuZ2V0QkJveCgxKTtcbiAgICAgICAgfVxuICAgICAgICBjeCA9IGN4ID09IG51bGwgPyBiYm94LnggKyBiYm94LndpZHRoIC8gMiA6IGN4O1xuICAgICAgICBjeSA9IGN5ID09IG51bGwgPyBiYm94LnkgKyBiYm94LmhlaWdodCAvIDIgOiBjeTtcbiAgICBcbiAgICAgICAgdGhpcy50cmFuc2Zvcm0odGhpcy5fLnRyYW5zZm9ybS5jb25jYXQoW1tcInNcIiwgc3gsIHN5LCBjeCwgY3ldXSkpO1xuICAgICAgICB0aGlzLl8uZGlydHlUID0gMTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBlbHByb3RvLmhpZGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICF0aGlzLnJlbW92ZWQgJiYgKHRoaXMubm9kZS5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIGVscHJvdG8uc2hvdyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgIXRoaXMucmVtb3ZlZCAmJiAodGhpcy5ub2RlLnN0eWxlLmRpc3BsYXkgPSBFKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfTtcbiAgICBlbHByb3RvLl9nZXRCQm94ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5yZW1vdmVkKSB7XG4gICAgICAgICAgICByZXR1cm4ge307XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IHRoaXMuWCArICh0aGlzLmJieCB8fCAwKSAtIHRoaXMuVyAvIDIsXG4gICAgICAgICAgICB5OiB0aGlzLlkgLSB0aGlzLkgsXG4gICAgICAgICAgICB3aWR0aDogdGhpcy5XLFxuICAgICAgICAgICAgaGVpZ2h0OiB0aGlzLkhcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIGVscHJvdG8ucmVtb3ZlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5yZW1vdmVkIHx8ICF0aGlzLm5vZGUucGFyZW50Tm9kZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucGFwZXIuX19zZXRfXyAmJiB0aGlzLnBhcGVyLl9fc2V0X18uZXhjbHVkZSh0aGlzKTtcbiAgICAgICAgUi5ldmUudW5iaW5kKFwicmFwaGFlbC4qLiouXCIgKyB0aGlzLmlkKTtcbiAgICAgICAgUi5fdGVhcih0aGlzLCB0aGlzLnBhcGVyKTtcbiAgICAgICAgdGhpcy5ub2RlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5ub2RlKTtcbiAgICAgICAgdGhpcy5zaGFwZSAmJiB0aGlzLnNoYXBlLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5zaGFwZSk7XG4gICAgICAgIGZvciAodmFyIGkgaW4gdGhpcykge1xuICAgICAgICAgICAgdGhpc1tpXSA9IHR5cGVvZiB0aGlzW2ldID09IFwiZnVuY3Rpb25cIiA/IFIuX3JlbW92ZWRGYWN0b3J5KGkpIDogbnVsbDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnJlbW92ZWQgPSB0cnVlO1xuICAgIH07XG4gICAgZWxwcm90by5hdHRyID0gZnVuY3Rpb24gKG5hbWUsIHZhbHVlKSB7XG4gICAgICAgIGlmICh0aGlzLnJlbW92ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuYW1lID09IG51bGwpIHtcbiAgICAgICAgICAgIHZhciByZXMgPSB7fTtcbiAgICAgICAgICAgIGZvciAodmFyIGEgaW4gdGhpcy5hdHRycykgaWYgKHRoaXMuYXR0cnNbaGFzXShhKSkge1xuICAgICAgICAgICAgICAgIHJlc1thXSA9IHRoaXMuYXR0cnNbYV07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXMuZ3JhZGllbnQgJiYgcmVzLmZpbGwgPT0gXCJub25lXCIgJiYgKHJlcy5maWxsID0gcmVzLmdyYWRpZW50KSAmJiBkZWxldGUgcmVzLmdyYWRpZW50O1xuICAgICAgICAgICAgcmVzLnRyYW5zZm9ybSA9IHRoaXMuXy50cmFuc2Zvcm07XG4gICAgICAgICAgICByZXR1cm4gcmVzO1xuICAgICAgICB9XG4gICAgICAgIGlmICh2YWx1ZSA9PSBudWxsICYmIFIuaXMobmFtZSwgXCJzdHJpbmdcIikpIHtcbiAgICAgICAgICAgIGlmIChuYW1lID09IGZpbGxTdHJpbmcgJiYgdGhpcy5hdHRycy5maWxsID09IFwibm9uZVwiICYmIHRoaXMuYXR0cnMuZ3JhZGllbnQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5hdHRycy5ncmFkaWVudDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBuYW1lcyA9IG5hbWUuc3BsaXQoc2VwYXJhdG9yKSxcbiAgICAgICAgICAgICAgICBvdXQgPSB7fTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IG5hbWVzLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBuYW1lID0gbmFtZXNbaV07XG4gICAgICAgICAgICAgICAgaWYgKG5hbWUgaW4gdGhpcy5hdHRycykge1xuICAgICAgICAgICAgICAgICAgICBvdXRbbmFtZV0gPSB0aGlzLmF0dHJzW25hbWVdO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoUi5pcyh0aGlzLnBhcGVyLmN1c3RvbUF0dHJpYnV0ZXNbbmFtZV0sIFwiZnVuY3Rpb25cIikpIHtcbiAgICAgICAgICAgICAgICAgICAgb3V0W25hbWVdID0gdGhpcy5wYXBlci5jdXN0b21BdHRyaWJ1dGVzW25hbWVdLmRlZjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvdXRbbmFtZV0gPSBSLl9hdmFpbGFibGVBdHRyc1tuYW1lXTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gaWkgLSAxID8gb3V0IDogb3V0W25hbWVzWzBdXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5hdHRycyAmJiB2YWx1ZSA9PSBudWxsICYmIFIuaXMobmFtZSwgXCJhcnJheVwiKSkge1xuICAgICAgICAgICAgb3V0ID0ge307XG4gICAgICAgICAgICBmb3IgKGkgPSAwLCBpaSA9IG5hbWUubGVuZ3RoOyBpIDwgaWk7IGkrKykge1xuICAgICAgICAgICAgICAgIG91dFtuYW1lW2ldXSA9IHRoaXMuYXR0cihuYW1lW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBvdXQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhcmFtcztcbiAgICAgICAgaWYgKHZhbHVlICE9IG51bGwpIHtcbiAgICAgICAgICAgIHBhcmFtcyA9IHt9O1xuICAgICAgICAgICAgcGFyYW1zW25hbWVdID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgdmFsdWUgPT0gbnVsbCAmJiBSLmlzKG5hbWUsIFwib2JqZWN0XCIpICYmIChwYXJhbXMgPSBuYW1lKTtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHBhcmFtcykge1xuICAgICAgICAgICAgZXZlKFwicmFwaGFlbC5hdHRyLlwiICsga2V5ICsgXCIuXCIgKyB0aGlzLmlkLCB0aGlzLCBwYXJhbXNba2V5XSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhcmFtcykge1xuICAgICAgICAgICAgZm9yIChrZXkgaW4gdGhpcy5wYXBlci5jdXN0b21BdHRyaWJ1dGVzKSBpZiAodGhpcy5wYXBlci5jdXN0b21BdHRyaWJ1dGVzW2hhc10oa2V5KSAmJiBwYXJhbXNbaGFzXShrZXkpICYmIFIuaXModGhpcy5wYXBlci5jdXN0b21BdHRyaWJ1dGVzW2tleV0sIFwiZnVuY3Rpb25cIikpIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFyID0gdGhpcy5wYXBlci5jdXN0b21BdHRyaWJ1dGVzW2tleV0uYXBwbHkodGhpcywgW10uY29uY2F0KHBhcmFtc1trZXldKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5hdHRyc1trZXldID0gcGFyYW1zW2tleV07XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgc3Via2V5IGluIHBhcikgaWYgKHBhcltoYXNdKHN1YmtleSkpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zW3N1YmtleV0gPSBwYXJbc3Via2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyB0aGlzLnBhcGVyLmNhbnZhcy5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XG4gICAgICAgICAgICBpZiAocGFyYW1zLnRleHQgJiYgdGhpcy50eXBlID09IFwidGV4dFwiKSB7XG4gICAgICAgICAgICAgICAgdGhpcy50ZXh0cGF0aC5zdHJpbmcgPSBwYXJhbXMudGV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHNldEZpbGxBbmRTdHJva2UodGhpcywgcGFyYW1zKTtcbiAgICAgICAgICAgIC8vIHRoaXMucGFwZXIuY2FudmFzLnN0eWxlLmRpc3BsYXkgPSBFO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgZWxwcm90by50b0Zyb250ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAhdGhpcy5yZW1vdmVkICYmIHRoaXMubm9kZS5wYXJlbnROb2RlLmFwcGVuZENoaWxkKHRoaXMubm9kZSk7XG4gICAgICAgIHRoaXMucGFwZXIgJiYgdGhpcy5wYXBlci50b3AgIT0gdGhpcyAmJiBSLl90b2Zyb250KHRoaXMsIHRoaXMucGFwZXIpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIGVscHJvdG8udG9CYWNrID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5yZW1vdmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5ub2RlLnBhcmVudE5vZGUuZmlyc3RDaGlsZCAhPSB0aGlzLm5vZGUpIHtcbiAgICAgICAgICAgIHRoaXMubm9kZS5wYXJlbnROb2RlLmluc2VydEJlZm9yZSh0aGlzLm5vZGUsIHRoaXMubm9kZS5wYXJlbnROb2RlLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgUi5fdG9iYWNrKHRoaXMsIHRoaXMucGFwZXIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgZWxwcm90by5pbnNlcnRBZnRlciA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIGlmICh0aGlzLnJlbW92ZWQpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbGVtZW50LmNvbnN0cnVjdG9yID09IFIuc3QuY29uc3RydWN0b3IpIHtcbiAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50W2VsZW1lbnQubGVuZ3RoIC0gMV07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVsZW1lbnQubm9kZS5uZXh0U2libGluZykge1xuICAgICAgICAgICAgZWxlbWVudC5ub2RlLnBhcmVudE5vZGUuaW5zZXJ0QmVmb3JlKHRoaXMubm9kZSwgZWxlbWVudC5ub2RlLm5leHRTaWJsaW5nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsZW1lbnQubm9kZS5wYXJlbnROb2RlLmFwcGVuZENoaWxkKHRoaXMubm9kZSk7XG4gICAgICAgIH1cbiAgICAgICAgUi5faW5zZXJ0YWZ0ZXIodGhpcywgZWxlbWVudCwgdGhpcy5wYXBlcik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgZWxwcm90by5pbnNlcnRCZWZvcmUgPSBmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICBpZiAodGhpcy5yZW1vdmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBpZiAoZWxlbWVudC5jb25zdHJ1Y3RvciA9PSBSLnN0LmNvbnN0cnVjdG9yKSB7XG4gICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudFswXTtcbiAgICAgICAgfVxuICAgICAgICBlbGVtZW50Lm5vZGUucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUodGhpcy5ub2RlLCBlbGVtZW50Lm5vZGUpO1xuICAgICAgICBSLl9pbnNlcnRiZWZvcmUodGhpcywgZWxlbWVudCwgdGhpcy5wYXBlcik7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgZWxwcm90by5ibHVyID0gZnVuY3Rpb24gKHNpemUpIHtcbiAgICAgICAgdmFyIHMgPSB0aGlzLm5vZGUucnVudGltZVN0eWxlLFxuICAgICAgICAgICAgZiA9IHMuZmlsdGVyO1xuICAgICAgICBmID0gZi5yZXBsYWNlKGJsdXJyZWdleHAsIEUpO1xuICAgICAgICBpZiAoK3NpemUgIT09IDApIHtcbiAgICAgICAgICAgIHRoaXMuYXR0cnMuYmx1ciA9IHNpemU7XG4gICAgICAgICAgICBzLmZpbHRlciA9IGYgKyBTICsgbXMgKyBcIi5CbHVyKHBpeGVscmFkaXVzPVwiICsgKCtzaXplIHx8IDEuNSkgKyBcIilcIjtcbiAgICAgICAgICAgIHMubWFyZ2luID0gUi5mb3JtYXQoXCItezB9cHggMCAwIC17MH1weFwiLCByb3VuZCgrc2l6ZSB8fCAxLjUpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMuZmlsdGVyID0gZjtcbiAgICAgICAgICAgIHMubWFyZ2luID0gMDtcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmF0dHJzLmJsdXI7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgUi5fZW5naW5lLnBhdGggPSBmdW5jdGlvbiAocGF0aFN0cmluZywgdm1sKSB7XG4gICAgICAgIHZhciBlbCA9IGNyZWF0ZU5vZGUoXCJzaGFwZVwiKTtcbiAgICAgICAgZWwuc3R5bGUuY3NzVGV4dCA9IGNzc0RvdDtcbiAgICAgICAgZWwuY29vcmRzaXplID0gem9vbSArIFMgKyB6b29tO1xuICAgICAgICBlbC5jb29yZG9yaWdpbiA9IHZtbC5jb29yZG9yaWdpbjtcbiAgICAgICAgdmFyIHAgPSBuZXcgRWxlbWVudChlbCwgdm1sKSxcbiAgICAgICAgICAgIGF0dHIgPSB7ZmlsbDogXCJub25lXCIsIHN0cm9rZTogXCIjMDAwXCJ9O1xuICAgICAgICBwYXRoU3RyaW5nICYmIChhdHRyLnBhdGggPSBwYXRoU3RyaW5nKTtcbiAgICAgICAgcC50eXBlID0gXCJwYXRoXCI7XG4gICAgICAgIHAucGF0aCA9IFtdO1xuICAgICAgICBwLlBhdGggPSBFO1xuICAgICAgICBzZXRGaWxsQW5kU3Ryb2tlKHAsIGF0dHIpO1xuICAgICAgICB2bWwuY2FudmFzLmFwcGVuZENoaWxkKGVsKTtcbiAgICAgICAgdmFyIHNrZXcgPSBjcmVhdGVOb2RlKFwic2tld1wiKTtcbiAgICAgICAgc2tldy5vbiA9IHRydWU7XG4gICAgICAgIGVsLmFwcGVuZENoaWxkKHNrZXcpO1xuICAgICAgICBwLnNrZXcgPSBza2V3O1xuICAgICAgICBwLnRyYW5zZm9ybShFKTtcbiAgICAgICAgcmV0dXJuIHA7XG4gICAgfTtcbiAgICBSLl9lbmdpbmUucmVjdCA9IGZ1bmN0aW9uICh2bWwsIHgsIHksIHcsIGgsIHIpIHtcbiAgICAgICAgdmFyIHBhdGggPSBSLl9yZWN0UGF0aCh4LCB5LCB3LCBoLCByKSxcbiAgICAgICAgICAgIHJlcyA9IHZtbC5wYXRoKHBhdGgpLFxuICAgICAgICAgICAgYSA9IHJlcy5hdHRycztcbiAgICAgICAgcmVzLlggPSBhLnggPSB4O1xuICAgICAgICByZXMuWSA9IGEueSA9IHk7XG4gICAgICAgIHJlcy5XID0gYS53aWR0aCA9IHc7XG4gICAgICAgIHJlcy5IID0gYS5oZWlnaHQgPSBoO1xuICAgICAgICBhLnIgPSByO1xuICAgICAgICBhLnBhdGggPSBwYXRoO1xuICAgICAgICByZXMudHlwZSA9IFwicmVjdFwiO1xuICAgICAgICByZXR1cm4gcmVzO1xuICAgIH07XG4gICAgUi5fZW5naW5lLmVsbGlwc2UgPSBmdW5jdGlvbiAodm1sLCB4LCB5LCByeCwgcnkpIHtcbiAgICAgICAgdmFyIHJlcyA9IHZtbC5wYXRoKCksXG4gICAgICAgICAgICBhID0gcmVzLmF0dHJzO1xuICAgICAgICByZXMuWCA9IHggLSByeDtcbiAgICAgICAgcmVzLlkgPSB5IC0gcnk7XG4gICAgICAgIHJlcy5XID0gcnggKiAyO1xuICAgICAgICByZXMuSCA9IHJ5ICogMjtcbiAgICAgICAgcmVzLnR5cGUgPSBcImVsbGlwc2VcIjtcbiAgICAgICAgc2V0RmlsbEFuZFN0cm9rZShyZXMsIHtcbiAgICAgICAgICAgIGN4OiB4LFxuICAgICAgICAgICAgY3k6IHksXG4gICAgICAgICAgICByeDogcngsXG4gICAgICAgICAgICByeTogcnlcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcbiAgICBSLl9lbmdpbmUuY2lyY2xlID0gZnVuY3Rpb24gKHZtbCwgeCwgeSwgcikge1xuICAgICAgICB2YXIgcmVzID0gdm1sLnBhdGgoKSxcbiAgICAgICAgICAgIGEgPSByZXMuYXR0cnM7XG4gICAgICAgIHJlcy5YID0geCAtIHI7XG4gICAgICAgIHJlcy5ZID0geSAtIHI7XG4gICAgICAgIHJlcy5XID0gcmVzLkggPSByICogMjtcbiAgICAgICAgcmVzLnR5cGUgPSBcImNpcmNsZVwiO1xuICAgICAgICBzZXRGaWxsQW5kU3Ryb2tlKHJlcywge1xuICAgICAgICAgICAgY3g6IHgsXG4gICAgICAgICAgICBjeTogeSxcbiAgICAgICAgICAgIHI6IHJcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcbiAgICBSLl9lbmdpbmUuaW1hZ2UgPSBmdW5jdGlvbiAodm1sLCBzcmMsIHgsIHksIHcsIGgpIHtcbiAgICAgICAgdmFyIHBhdGggPSBSLl9yZWN0UGF0aCh4LCB5LCB3LCBoKSxcbiAgICAgICAgICAgIHJlcyA9IHZtbC5wYXRoKHBhdGgpLmF0dHIoe3N0cm9rZTogXCJub25lXCJ9KSxcbiAgICAgICAgICAgIGEgPSByZXMuYXR0cnMsXG4gICAgICAgICAgICBub2RlID0gcmVzLm5vZGUsXG4gICAgICAgICAgICBmaWxsID0gbm9kZS5nZXRFbGVtZW50c0J5VGFnTmFtZShmaWxsU3RyaW5nKVswXTtcbiAgICAgICAgYS5zcmMgPSBzcmM7XG4gICAgICAgIHJlcy5YID0gYS54ID0geDtcbiAgICAgICAgcmVzLlkgPSBhLnkgPSB5O1xuICAgICAgICByZXMuVyA9IGEud2lkdGggPSB3O1xuICAgICAgICByZXMuSCA9IGEuaGVpZ2h0ID0gaDtcbiAgICAgICAgYS5wYXRoID0gcGF0aDtcbiAgICAgICAgcmVzLnR5cGUgPSBcImltYWdlXCI7XG4gICAgICAgIGZpbGwucGFyZW50Tm9kZSA9PSBub2RlICYmIG5vZGUucmVtb3ZlQ2hpbGQoZmlsbCk7XG4gICAgICAgIGZpbGwucm90YXRlID0gdHJ1ZTtcbiAgICAgICAgZmlsbC5zcmMgPSBzcmM7XG4gICAgICAgIGZpbGwudHlwZSA9IFwidGlsZVwiO1xuICAgICAgICByZXMuXy5maWxscG9zID0gW3gsIHldO1xuICAgICAgICByZXMuXy5maWxsc2l6ZSA9IFt3LCBoXTtcbiAgICAgICAgbm9kZS5hcHBlbmRDaGlsZChmaWxsKTtcbiAgICAgICAgc2V0Q29vcmRzKHJlcywgMSwgMSwgMCwgMCwgMCk7XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfTtcbiAgICBSLl9lbmdpbmUudGV4dCA9IGZ1bmN0aW9uICh2bWwsIHgsIHksIHRleHQpIHtcbiAgICAgICAgdmFyIGVsID0gY3JlYXRlTm9kZShcInNoYXBlXCIpLFxuICAgICAgICAgICAgcGF0aCA9IGNyZWF0ZU5vZGUoXCJwYXRoXCIpLFxuICAgICAgICAgICAgbyA9IGNyZWF0ZU5vZGUoXCJ0ZXh0cGF0aFwiKTtcbiAgICAgICAgeCA9IHggfHwgMDtcbiAgICAgICAgeSA9IHkgfHwgMDtcbiAgICAgICAgdGV4dCA9IHRleHQgfHwgXCJcIjtcbiAgICAgICAgcGF0aC52ID0gUi5mb3JtYXQoXCJtezB9LHsxfWx7Mn0sezF9XCIsIHJvdW5kKHggKiB6b29tKSwgcm91bmQoeSAqIHpvb20pLCByb3VuZCh4ICogem9vbSkgKyAxKTtcbiAgICAgICAgcGF0aC50ZXh0cGF0aG9rID0gdHJ1ZTtcbiAgICAgICAgby5zdHJpbmcgPSBTdHIodGV4dCk7XG4gICAgICAgIG8ub24gPSB0cnVlO1xuICAgICAgICBlbC5zdHlsZS5jc3NUZXh0ID0gY3NzRG90O1xuICAgICAgICBlbC5jb29yZHNpemUgPSB6b29tICsgUyArIHpvb207XG4gICAgICAgIGVsLmNvb3Jkb3JpZ2luID0gXCIwIDBcIjtcbiAgICAgICAgdmFyIHAgPSBuZXcgRWxlbWVudChlbCwgdm1sKSxcbiAgICAgICAgICAgIGF0dHIgPSB7XG4gICAgICAgICAgICAgICAgZmlsbDogXCIjMDAwXCIsXG4gICAgICAgICAgICAgICAgc3Ryb2tlOiBcIm5vbmVcIixcbiAgICAgICAgICAgICAgICBmb250OiBSLl9hdmFpbGFibGVBdHRycy5mb250LFxuICAgICAgICAgICAgICAgIHRleHQ6IHRleHRcbiAgICAgICAgICAgIH07XG4gICAgICAgIHAuc2hhcGUgPSBlbDtcbiAgICAgICAgcC5wYXRoID0gcGF0aDtcbiAgICAgICAgcC50ZXh0cGF0aCA9IG87XG4gICAgICAgIHAudHlwZSA9IFwidGV4dFwiO1xuICAgICAgICBwLmF0dHJzLnRleHQgPSBTdHIodGV4dCk7XG4gICAgICAgIHAuYXR0cnMueCA9IHg7XG4gICAgICAgIHAuYXR0cnMueSA9IHk7XG4gICAgICAgIHAuYXR0cnMudyA9IDE7XG4gICAgICAgIHAuYXR0cnMuaCA9IDE7XG4gICAgICAgIHNldEZpbGxBbmRTdHJva2UocCwgYXR0cik7XG4gICAgICAgIGVsLmFwcGVuZENoaWxkKG8pO1xuICAgICAgICBlbC5hcHBlbmRDaGlsZChwYXRoKTtcbiAgICAgICAgdm1sLmNhbnZhcy5hcHBlbmRDaGlsZChlbCk7XG4gICAgICAgIHZhciBza2V3ID0gY3JlYXRlTm9kZShcInNrZXdcIik7XG4gICAgICAgIHNrZXcub24gPSB0cnVlO1xuICAgICAgICBlbC5hcHBlbmRDaGlsZChza2V3KTtcbiAgICAgICAgcC5za2V3ID0gc2tldztcbiAgICAgICAgcC50cmFuc2Zvcm0oRSk7XG4gICAgICAgIHJldHVybiBwO1xuICAgIH07XG4gICAgUi5fZW5naW5lLnNldFNpemUgPSBmdW5jdGlvbiAod2lkdGgsIGhlaWdodCkge1xuICAgICAgICB2YXIgY3MgPSB0aGlzLmNhbnZhcy5zdHlsZTtcbiAgICAgICAgdGhpcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICB0aGlzLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgd2lkdGggPT0gK3dpZHRoICYmICh3aWR0aCArPSBcInB4XCIpO1xuICAgICAgICBoZWlnaHQgPT0gK2hlaWdodCAmJiAoaGVpZ2h0ICs9IFwicHhcIik7XG4gICAgICAgIGNzLndpZHRoID0gd2lkdGg7XG4gICAgICAgIGNzLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgY3MuY2xpcCA9IFwicmVjdCgwIFwiICsgd2lkdGggKyBcIiBcIiArIGhlaWdodCArIFwiIDApXCI7XG4gICAgICAgIGlmICh0aGlzLl92aWV3Qm94KSB7XG4gICAgICAgICAgICBSLl9lbmdpbmUuc2V0Vmlld0JveC5hcHBseSh0aGlzLCB0aGlzLl92aWV3Qm94KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9O1xuICAgIFIuX2VuZ2luZS5zZXRWaWV3Qm94ID0gZnVuY3Rpb24gKHgsIHksIHcsIGgsIGZpdCkge1xuICAgICAgICBSLmV2ZShcInJhcGhhZWwuc2V0Vmlld0JveFwiLCB0aGlzLCB0aGlzLl92aWV3Qm94LCBbeCwgeSwgdywgaCwgZml0XSk7XG4gICAgICAgIHZhciB3aWR0aCA9IHRoaXMud2lkdGgsXG4gICAgICAgICAgICBoZWlnaHQgPSB0aGlzLmhlaWdodCxcbiAgICAgICAgICAgIHNpemUgPSAxIC8gbW1heCh3IC8gd2lkdGgsIGggLyBoZWlnaHQpLFxuICAgICAgICAgICAgSCwgVztcbiAgICAgICAgaWYgKGZpdCkge1xuICAgICAgICAgICAgSCA9IGhlaWdodCAvIGg7XG4gICAgICAgICAgICBXID0gd2lkdGggLyB3O1xuICAgICAgICAgICAgaWYgKHcgKiBIIDwgd2lkdGgpIHtcbiAgICAgICAgICAgICAgICB4IC09ICh3aWR0aCAtIHcgKiBIKSAvIDIgLyBIO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGggKiBXIDwgaGVpZ2h0KSB7XG4gICAgICAgICAgICAgICAgeSAtPSAoaGVpZ2h0IC0gaCAqIFcpIC8gMiAvIFc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fdmlld0JveCA9IFt4LCB5LCB3LCBoLCAhIWZpdF07XG4gICAgICAgIHRoaXMuX3ZpZXdCb3hTaGlmdCA9IHtcbiAgICAgICAgICAgIGR4OiAteCxcbiAgICAgICAgICAgIGR5OiAteSxcbiAgICAgICAgICAgIHNjYWxlOiBzaXplXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgICAgIGVsLnRyYW5zZm9ybShcIi4uLlwiKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH07XG4gICAgdmFyIGNyZWF0ZU5vZGU7XG4gICAgUi5fZW5naW5lLmluaXRXaW4gPSBmdW5jdGlvbiAod2luKSB7XG4gICAgICAgICAgICB2YXIgZG9jID0gd2luLmRvY3VtZW50O1xuICAgICAgICAgICAgZG9jLmNyZWF0ZVN0eWxlU2hlZXQoKS5hZGRSdWxlKFwiLnJ2bWxcIiwgXCJiZWhhdmlvcjp1cmwoI2RlZmF1bHQjVk1MKVwiKTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgIWRvYy5uYW1lc3BhY2VzLnJ2bWwgJiYgZG9jLm5hbWVzcGFjZXMuYWRkKFwicnZtbFwiLCBcInVybjpzY2hlbWFzLW1pY3Jvc29mdC1jb206dm1sXCIpO1xuICAgICAgICAgICAgICAgIGNyZWF0ZU5vZGUgPSBmdW5jdGlvbiAodGFnTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZG9jLmNyZWF0ZUVsZW1lbnQoJzxydm1sOicgKyB0YWdOYW1lICsgJyBjbGFzcz1cInJ2bWxcIj4nKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGNyZWF0ZU5vZGUgPSBmdW5jdGlvbiAodGFnTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZG9jLmNyZWF0ZUVsZW1lbnQoJzwnICsgdGFnTmFtZSArICcgeG1sbnM9XCJ1cm46c2NoZW1hcy1taWNyb3NvZnQuY29tOnZtbFwiIGNsYXNzPVwicnZtbFwiPicpO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgUi5fZW5naW5lLmluaXRXaW4oUi5fZy53aW4pO1xuICAgIFIuX2VuZ2luZS5jcmVhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBjb24gPSBSLl9nZXRDb250YWluZXIuYXBwbHkoMCwgYXJndW1lbnRzKSxcbiAgICAgICAgICAgIGNvbnRhaW5lciA9IGNvbi5jb250YWluZXIsXG4gICAgICAgICAgICBoZWlnaHQgPSBjb24uaGVpZ2h0LFxuICAgICAgICAgICAgcyxcbiAgICAgICAgICAgIHdpZHRoID0gY29uLndpZHRoLFxuICAgICAgICAgICAgeCA9IGNvbi54LFxuICAgICAgICAgICAgeSA9IGNvbi55O1xuICAgICAgICBpZiAoIWNvbnRhaW5lcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVk1MIGNvbnRhaW5lciBub3QgZm91bmQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciByZXMgPSBuZXcgUi5fUGFwZXIsXG4gICAgICAgICAgICBjID0gcmVzLmNhbnZhcyA9IFIuX2cuZG9jLmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiksXG4gICAgICAgICAgICBjcyA9IGMuc3R5bGU7XG4gICAgICAgIHggPSB4IHx8IDA7XG4gICAgICAgIHkgPSB5IHx8IDA7XG4gICAgICAgIHdpZHRoID0gd2lkdGggfHwgNTEyO1xuICAgICAgICBoZWlnaHQgPSBoZWlnaHQgfHwgMzQyO1xuICAgICAgICByZXMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgcmVzLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgd2lkdGggPT0gK3dpZHRoICYmICh3aWR0aCArPSBcInB4XCIpO1xuICAgICAgICBoZWlnaHQgPT0gK2hlaWdodCAmJiAoaGVpZ2h0ICs9IFwicHhcIik7XG4gICAgICAgIHJlcy5jb29yZHNpemUgPSB6b29tICogMWUzICsgUyArIHpvb20gKiAxZTM7XG4gICAgICAgIHJlcy5jb29yZG9yaWdpbiA9IFwiMCAwXCI7XG4gICAgICAgIHJlcy5zcGFuID0gUi5fZy5kb2MuY3JlYXRlRWxlbWVudChcInNwYW5cIik7XG4gICAgICAgIHJlcy5zcGFuLnN0eWxlLmNzc1RleHQgPSBcInBvc2l0aW9uOmFic29sdXRlO2xlZnQ6LTk5OTllbTt0b3A6LTk5OTllbTtwYWRkaW5nOjA7bWFyZ2luOjA7bGluZS1oZWlnaHQ6MTtcIjtcbiAgICAgICAgYy5hcHBlbmRDaGlsZChyZXMuc3Bhbik7XG4gICAgICAgIGNzLmNzc1RleHQgPSBSLmZvcm1hdChcInRvcDowO2xlZnQ6MDt3aWR0aDp7MH07aGVpZ2h0OnsxfTtkaXNwbGF5OmlubGluZS1ibG9jaztwb3NpdGlvbjpyZWxhdGl2ZTtjbGlwOnJlY3QoMCB7MH0gezF9IDApO292ZXJmbG93OmhpZGRlblwiLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgaWYgKGNvbnRhaW5lciA9PSAxKSB7XG4gICAgICAgICAgICBSLl9nLmRvYy5ib2R5LmFwcGVuZENoaWxkKGMpO1xuICAgICAgICAgICAgY3MubGVmdCA9IHggKyBcInB4XCI7XG4gICAgICAgICAgICBjcy50b3AgPSB5ICsgXCJweFwiO1xuICAgICAgICAgICAgY3MucG9zaXRpb24gPSBcImFic29sdXRlXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoY29udGFpbmVyLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICBjb250YWluZXIuaW5zZXJ0QmVmb3JlKGMsIGNvbnRhaW5lci5maXJzdENoaWxkKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJlcy5yZW5kZXJmaXggPSBmdW5jdGlvbiAoKSB7fTtcbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9O1xuICAgIFIucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBSLmV2ZShcInJhcGhhZWwuY2xlYXJcIiwgdGhpcyk7XG4gICAgICAgIHRoaXMuY2FudmFzLmlubmVySFRNTCA9IEU7XG4gICAgICAgIHRoaXMuc3BhbiA9IFIuX2cuZG9jLmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIpO1xuICAgICAgICB0aGlzLnNwYW4uc3R5bGUuY3NzVGV4dCA9IFwicG9zaXRpb246YWJzb2x1dGU7bGVmdDotOTk5OWVtO3RvcDotOTk5OWVtO3BhZGRpbmc6MDttYXJnaW46MDtsaW5lLWhlaWdodDoxO2Rpc3BsYXk6aW5saW5lO1wiO1xuICAgICAgICB0aGlzLmNhbnZhcy5hcHBlbmRDaGlsZCh0aGlzLnNwYW4pO1xuICAgICAgICB0aGlzLmJvdHRvbSA9IHRoaXMudG9wID0gbnVsbDtcbiAgICB9O1xuICAgIFIucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgUi5ldmUoXCJyYXBoYWVsLnJlbW92ZVwiLCB0aGlzKTtcbiAgICAgICAgdGhpcy5jYW52YXMucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmNhbnZhcyk7XG4gICAgICAgIGZvciAodmFyIGkgaW4gdGhpcykge1xuICAgICAgICAgICAgdGhpc1tpXSA9IHR5cGVvZiB0aGlzW2ldID09IFwiZnVuY3Rpb25cIiA/IFIuX3JlbW92ZWRGYWN0b3J5KGkpIDogbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgdmFyIHNldHByb3RvID0gUi5zdDtcbiAgICBmb3IgKHZhciBtZXRob2QgaW4gZWxwcm90bykgaWYgKGVscHJvdG9baGFzXShtZXRob2QpICYmICFzZXRwcm90b1toYXNdKG1ldGhvZCkpIHtcbiAgICAgICAgc2V0cHJvdG9bbWV0aG9kXSA9IChmdW5jdGlvbiAobWV0aG9kbmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXJnID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmZvckVhY2goZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsW21ldGhvZG5hbWVdLmFwcGx5KGVsLCBhcmcpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfSkobWV0aG9kKTtcbiAgICB9XG59KFJhcGhhZWwpO1xuXG4vLyBCUk9XU0VSSUZZIE1PRDogZXhwb3J0IFJhcGhhZWxcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gUmFwaGFlbDtcbn1cbiIsIi8vICAgICBVbmRlcnNjb3JlLmpzIDEuNi4wXG4vLyAgICAgaHR0cDovL3VuZGVyc2NvcmVqcy5vcmdcbi8vICAgICAoYykgMjAwOS0yMDE0IEplcmVteSBBc2hrZW5hcywgRG9jdW1lbnRDbG91ZCBhbmQgSW52ZXN0aWdhdGl2ZSBSZXBvcnRlcnMgJiBFZGl0b3JzXG4vLyAgICAgVW5kZXJzY29yZSBtYXkgYmUgZnJlZWx5IGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBNSVQgbGljZW5zZS5cblxuKGZ1bmN0aW9uKCkge1xuXG4gIC8vIEJhc2VsaW5lIHNldHVwXG4gIC8vIC0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gRXN0YWJsaXNoIHRoZSByb290IG9iamVjdCwgYHdpbmRvd2AgaW4gdGhlIGJyb3dzZXIsIG9yIGBleHBvcnRzYCBvbiB0aGUgc2VydmVyLlxuICB2YXIgcm9vdCA9IHRoaXM7XG5cbiAgLy8gU2F2ZSB0aGUgcHJldmlvdXMgdmFsdWUgb2YgdGhlIGBfYCB2YXJpYWJsZS5cbiAgdmFyIHByZXZpb3VzVW5kZXJzY29yZSA9IHJvb3QuXztcblxuICAvLyBFc3RhYmxpc2ggdGhlIG9iamVjdCB0aGF0IGdldHMgcmV0dXJuZWQgdG8gYnJlYWsgb3V0IG9mIGEgbG9vcCBpdGVyYXRpb24uXG4gIHZhciBicmVha2VyID0ge307XG5cbiAgLy8gU2F2ZSBieXRlcyBpbiB0aGUgbWluaWZpZWQgKGJ1dCBub3QgZ3ppcHBlZCkgdmVyc2lvbjpcbiAgdmFyIEFycmF5UHJvdG8gPSBBcnJheS5wcm90b3R5cGUsIE9ialByb3RvID0gT2JqZWN0LnByb3RvdHlwZSwgRnVuY1Byb3RvID0gRnVuY3Rpb24ucHJvdG90eXBlO1xuXG4gIC8vIENyZWF0ZSBxdWljayByZWZlcmVuY2UgdmFyaWFibGVzIGZvciBzcGVlZCBhY2Nlc3MgdG8gY29yZSBwcm90b3R5cGVzLlxuICB2YXJcbiAgICBwdXNoICAgICAgICAgICAgID0gQXJyYXlQcm90by5wdXNoLFxuICAgIHNsaWNlICAgICAgICAgICAgPSBBcnJheVByb3RvLnNsaWNlLFxuICAgIGNvbmNhdCAgICAgICAgICAgPSBBcnJheVByb3RvLmNvbmNhdCxcbiAgICB0b1N0cmluZyAgICAgICAgID0gT2JqUHJvdG8udG9TdHJpbmcsXG4gICAgaGFzT3duUHJvcGVydHkgICA9IE9ialByb3RvLmhhc093blByb3BlcnR5O1xuXG4gIC8vIEFsbCAqKkVDTUFTY3JpcHQgNSoqIG5hdGl2ZSBmdW5jdGlvbiBpbXBsZW1lbnRhdGlvbnMgdGhhdCB3ZSBob3BlIHRvIHVzZVxuICAvLyBhcmUgZGVjbGFyZWQgaGVyZS5cbiAgdmFyXG4gICAgbmF0aXZlRm9yRWFjaCAgICAgID0gQXJyYXlQcm90by5mb3JFYWNoLFxuICAgIG5hdGl2ZU1hcCAgICAgICAgICA9IEFycmF5UHJvdG8ubWFwLFxuICAgIG5hdGl2ZVJlZHVjZSAgICAgICA9IEFycmF5UHJvdG8ucmVkdWNlLFxuICAgIG5hdGl2ZVJlZHVjZVJpZ2h0ICA9IEFycmF5UHJvdG8ucmVkdWNlUmlnaHQsXG4gICAgbmF0aXZlRmlsdGVyICAgICAgID0gQXJyYXlQcm90by5maWx0ZXIsXG4gICAgbmF0aXZlRXZlcnkgICAgICAgID0gQXJyYXlQcm90by5ldmVyeSxcbiAgICBuYXRpdmVTb21lICAgICAgICAgPSBBcnJheVByb3RvLnNvbWUsXG4gICAgbmF0aXZlSW5kZXhPZiAgICAgID0gQXJyYXlQcm90by5pbmRleE9mLFxuICAgIG5hdGl2ZUxhc3RJbmRleE9mICA9IEFycmF5UHJvdG8ubGFzdEluZGV4T2YsXG4gICAgbmF0aXZlSXNBcnJheSAgICAgID0gQXJyYXkuaXNBcnJheSxcbiAgICBuYXRpdmVLZXlzICAgICAgICAgPSBPYmplY3Qua2V5cyxcbiAgICBuYXRpdmVCaW5kICAgICAgICAgPSBGdW5jUHJvdG8uYmluZDtcblxuICAvLyBDcmVhdGUgYSBzYWZlIHJlZmVyZW5jZSB0byB0aGUgVW5kZXJzY29yZSBvYmplY3QgZm9yIHVzZSBiZWxvdy5cbiAgdmFyIF8gPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqIGluc3RhbmNlb2YgXykgcmV0dXJuIG9iajtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgXykpIHJldHVybiBuZXcgXyhvYmopO1xuICAgIHRoaXMuX3dyYXBwZWQgPSBvYmo7XG4gIH07XG5cbiAgLy8gRXhwb3J0IHRoZSBVbmRlcnNjb3JlIG9iamVjdCBmb3IgKipOb2RlLmpzKiosIHdpdGhcbiAgLy8gYmFja3dhcmRzLWNvbXBhdGliaWxpdHkgZm9yIHRoZSBvbGQgYHJlcXVpcmUoKWAgQVBJLiBJZiB3ZSdyZSBpblxuICAvLyB0aGUgYnJvd3NlciwgYWRkIGBfYCBhcyBhIGdsb2JhbCBvYmplY3QgdmlhIGEgc3RyaW5nIGlkZW50aWZpZXIsXG4gIC8vIGZvciBDbG9zdXJlIENvbXBpbGVyIFwiYWR2YW5jZWRcIiBtb2RlLlxuICBpZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgICBleHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBfO1xuICAgIH1cbiAgICBleHBvcnRzLl8gPSBfO1xuICB9IGVsc2Uge1xuICAgIHJvb3QuXyA9IF87XG4gIH1cblxuICAvLyBDdXJyZW50IHZlcnNpb24uXG4gIF8uVkVSU0lPTiA9ICcxLjYuMCc7XG5cbiAgLy8gQ29sbGVjdGlvbiBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBUaGUgY29ybmVyc3RvbmUsIGFuIGBlYWNoYCBpbXBsZW1lbnRhdGlvbiwgYWthIGBmb3JFYWNoYC5cbiAgLy8gSGFuZGxlcyBvYmplY3RzIHdpdGggdGhlIGJ1aWx0LWluIGBmb3JFYWNoYCwgYXJyYXlzLCBhbmQgcmF3IG9iamVjdHMuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBmb3JFYWNoYCBpZiBhdmFpbGFibGUuXG4gIHZhciBlYWNoID0gXy5lYWNoID0gXy5mb3JFYWNoID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIG9iajtcbiAgICBpZiAobmF0aXZlRm9yRWFjaCAmJiBvYmouZm9yRWFjaCA9PT0gbmF0aXZlRm9yRWFjaCkge1xuICAgICAgb2JqLmZvckVhY2goaXRlcmF0b3IsIGNvbnRleHQpO1xuICAgIH0gZWxzZSBpZiAob2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGgpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBvYmoubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqW2ldLCBpLCBvYmopID09PSBicmVha2VyKSByZXR1cm47XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoaXRlcmF0b3IuY2FsbChjb250ZXh0LCBvYmpba2V5c1tpXV0sIGtleXNbaV0sIG9iaikgPT09IGJyZWFrZXIpIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBSZXR1cm4gdGhlIHJlc3VsdHMgb2YgYXBwbHlpbmcgdGhlIGl0ZXJhdG9yIHRvIGVhY2ggZWxlbWVudC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYG1hcGAgaWYgYXZhaWxhYmxlLlxuICBfLm1hcCA9IF8uY29sbGVjdCA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIGNvbnRleHQpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdHM7XG4gICAgaWYgKG5hdGl2ZU1hcCAmJiBvYmoubWFwID09PSBuYXRpdmVNYXApIHJldHVybiBvYmoubWFwKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICByZXN1bHRzLnB1c2goaXRlcmF0b3IuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbiAgfTtcblxuICB2YXIgcmVkdWNlRXJyb3IgPSAnUmVkdWNlIG9mIGVtcHR5IGFycmF5IHdpdGggbm8gaW5pdGlhbCB2YWx1ZSc7XG5cbiAgLy8gKipSZWR1Y2UqKiBidWlsZHMgdXAgYSBzaW5nbGUgcmVzdWx0IGZyb20gYSBsaXN0IG9mIHZhbHVlcywgYWthIGBpbmplY3RgLFxuICAvLyBvciBgZm9sZGxgLiBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgcmVkdWNlYCBpZiBhdmFpbGFibGUuXG4gIF8ucmVkdWNlID0gXy5mb2xkbCA9IF8uaW5qZWN0ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgbWVtbywgY29udGV4dCkge1xuICAgIHZhciBpbml0aWFsID0gYXJndW1lbnRzLmxlbmd0aCA+IDI7XG4gICAgaWYgKG9iaiA9PSBudWxsKSBvYmogPSBbXTtcbiAgICBpZiAobmF0aXZlUmVkdWNlICYmIG9iai5yZWR1Y2UgPT09IG5hdGl2ZVJlZHVjZSkge1xuICAgICAgaWYgKGNvbnRleHQpIGl0ZXJhdG9yID0gXy5iaW5kKGl0ZXJhdG9yLCBjb250ZXh0KTtcbiAgICAgIHJldHVybiBpbml0aWFsID8gb2JqLnJlZHVjZShpdGVyYXRvciwgbWVtbykgOiBvYmoucmVkdWNlKGl0ZXJhdG9yKTtcbiAgICB9XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgaWYgKCFpbml0aWFsKSB7XG4gICAgICAgIG1lbW8gPSB2YWx1ZTtcbiAgICAgICAgaW5pdGlhbCA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBtZW1vID0gaXRlcmF0b3IuY2FsbChjb250ZXh0LCBtZW1vLCB2YWx1ZSwgaW5kZXgsIGxpc3QpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghaW5pdGlhbCkgdGhyb3cgbmV3IFR5cGVFcnJvcihyZWR1Y2VFcnJvcik7XG4gICAgcmV0dXJuIG1lbW87XG4gIH07XG5cbiAgLy8gVGhlIHJpZ2h0LWFzc29jaWF0aXZlIHZlcnNpb24gb2YgcmVkdWNlLCBhbHNvIGtub3duIGFzIGBmb2xkcmAuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGByZWR1Y2VSaWdodGAgaWYgYXZhaWxhYmxlLlxuICBfLnJlZHVjZVJpZ2h0ID0gXy5mb2xkciA9IGZ1bmN0aW9uKG9iaiwgaXRlcmF0b3IsIG1lbW8sIGNvbnRleHQpIHtcbiAgICB2YXIgaW5pdGlhbCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyO1xuICAgIGlmIChvYmogPT0gbnVsbCkgb2JqID0gW107XG4gICAgaWYgKG5hdGl2ZVJlZHVjZVJpZ2h0ICYmIG9iai5yZWR1Y2VSaWdodCA9PT0gbmF0aXZlUmVkdWNlUmlnaHQpIHtcbiAgICAgIGlmIChjb250ZXh0KSBpdGVyYXRvciA9IF8uYmluZChpdGVyYXRvciwgY29udGV4dCk7XG4gICAgICByZXR1cm4gaW5pdGlhbCA/IG9iai5yZWR1Y2VSaWdodChpdGVyYXRvciwgbWVtbykgOiBvYmoucmVkdWNlUmlnaHQoaXRlcmF0b3IpO1xuICAgIH1cbiAgICB2YXIgbGVuZ3RoID0gb2JqLmxlbmd0aDtcbiAgICBpZiAobGVuZ3RoICE9PSArbGVuZ3RoKSB7XG4gICAgICB2YXIga2V5cyA9IF8ua2V5cyhvYmopO1xuICAgICAgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgfVxuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGluZGV4ID0ga2V5cyA/IGtleXNbLS1sZW5ndGhdIDogLS1sZW5ndGg7XG4gICAgICBpZiAoIWluaXRpYWwpIHtcbiAgICAgICAgbWVtbyA9IG9ialtpbmRleF07XG4gICAgICAgIGluaXRpYWwgPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbWVtbyA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgbWVtbywgb2JqW2luZGV4XSwgaW5kZXgsIGxpc3QpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIGlmICghaW5pdGlhbCkgdGhyb3cgbmV3IFR5cGVFcnJvcihyZWR1Y2VFcnJvcik7XG4gICAgcmV0dXJuIG1lbW87XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBmaXJzdCB2YWx1ZSB3aGljaCBwYXNzZXMgYSB0cnV0aCB0ZXN0LiBBbGlhc2VkIGFzIGBkZXRlY3RgLlxuICBfLmZpbmQgPSBfLmRldGVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdDtcbiAgICBhbnkob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSB7XG4gICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiBhbGwgdGhlIGVsZW1lbnRzIHRoYXQgcGFzcyBhIHRydXRoIHRlc3QuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBmaWx0ZXJgIGlmIGF2YWlsYWJsZS5cbiAgLy8gQWxpYXNlZCBhcyBgc2VsZWN0YC5cbiAgXy5maWx0ZXIgPSBfLnNlbGVjdCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHRzO1xuICAgIGlmIChuYXRpdmVGaWx0ZXIgJiYgb2JqLmZpbHRlciA9PT0gbmF0aXZlRmlsdGVyKSByZXR1cm4gb2JqLmZpbHRlcihwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbChjb250ZXh0LCB2YWx1ZSwgaW5kZXgsIGxpc3QpKSByZXN1bHRzLnB1c2godmFsdWUpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIFJldHVybiBhbGwgdGhlIGVsZW1lbnRzIGZvciB3aGljaCBhIHRydXRoIHRlc3QgZmFpbHMuXG4gIF8ucmVqZWN0ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gXy5maWx0ZXIob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIHJldHVybiAhcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KTtcbiAgICB9LCBjb250ZXh0KTtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgd2hldGhlciBhbGwgb2YgdGhlIGVsZW1lbnRzIG1hdGNoIGEgdHJ1dGggdGVzdC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGV2ZXJ5YCBpZiBhdmFpbGFibGUuXG4gIC8vIEFsaWFzZWQgYXMgYGFsbGAuXG4gIF8uZXZlcnkgPSBfLmFsbCA9IGZ1bmN0aW9uKG9iaiwgcHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgcHJlZGljYXRlIHx8IChwcmVkaWNhdGUgPSBfLmlkZW50aXR5KTtcbiAgICB2YXIgcmVzdWx0ID0gdHJ1ZTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKG5hdGl2ZUV2ZXJ5ICYmIG9iai5ldmVyeSA9PT0gbmF0aXZlRXZlcnkpIHJldHVybiBvYmouZXZlcnkocHJlZGljYXRlLCBjb250ZXh0KTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICBpZiAoIShyZXN1bHQgPSByZXN1bHQgJiYgcHJlZGljYXRlLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSkpIHJldHVybiBicmVha2VyO1xuICAgIH0pO1xuICAgIHJldHVybiAhIXJlc3VsdDtcbiAgfTtcblxuICAvLyBEZXRlcm1pbmUgaWYgYXQgbGVhc3Qgb25lIGVsZW1lbnQgaW4gdGhlIG9iamVjdCBtYXRjaGVzIGEgdHJ1dGggdGVzdC5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYHNvbWVgIGlmIGF2YWlsYWJsZS5cbiAgLy8gQWxpYXNlZCBhcyBgYW55YC5cbiAgdmFyIGFueSA9IF8uc29tZSA9IF8uYW55ID0gZnVuY3Rpb24ob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICBwcmVkaWNhdGUgfHwgKHByZWRpY2F0ZSA9IF8uaWRlbnRpdHkpO1xuICAgIHZhciByZXN1bHQgPSBmYWxzZTtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiByZXN1bHQ7XG4gICAgaWYgKG5hdGl2ZVNvbWUgJiYgb2JqLnNvbWUgPT09IG5hdGl2ZVNvbWUpIHJldHVybiBvYmouc29tZShwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgsIGxpc3QpIHtcbiAgICAgIGlmIChyZXN1bHQgfHwgKHJlc3VsdCA9IHByZWRpY2F0ZS5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgbGlzdCkpKSByZXR1cm4gYnJlYWtlcjtcbiAgICB9KTtcbiAgICByZXR1cm4gISFyZXN1bHQ7XG4gIH07XG5cbiAgLy8gRGV0ZXJtaW5lIGlmIHRoZSBhcnJheSBvciBvYmplY3QgY29udGFpbnMgYSBnaXZlbiB2YWx1ZSAodXNpbmcgYD09PWApLlxuICAvLyBBbGlhc2VkIGFzIGBpbmNsdWRlYC5cbiAgXy5jb250YWlucyA9IF8uaW5jbHVkZSA9IGZ1bmN0aW9uKG9iaiwgdGFyZ2V0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKG5hdGl2ZUluZGV4T2YgJiYgb2JqLmluZGV4T2YgPT09IG5hdGl2ZUluZGV4T2YpIHJldHVybiBvYmouaW5kZXhPZih0YXJnZXQpICE9IC0xO1xuICAgIHJldHVybiBhbnkob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIHZhbHVlID09PSB0YXJnZXQ7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gSW52b2tlIGEgbWV0aG9kICh3aXRoIGFyZ3VtZW50cykgb24gZXZlcnkgaXRlbSBpbiBhIGNvbGxlY3Rpb24uXG4gIF8uaW52b2tlID0gZnVuY3Rpb24ob2JqLCBtZXRob2QpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICB2YXIgaXNGdW5jID0gXy5pc0Z1bmN0aW9uKG1ldGhvZCk7XG4gICAgcmV0dXJuIF8ubWFwKG9iaiwgZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiAoaXNGdW5jID8gbWV0aG9kIDogdmFsdWVbbWV0aG9kXSkuYXBwbHkodmFsdWUsIGFyZ3MpO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYG1hcGA6IGZldGNoaW5nIGEgcHJvcGVydHkuXG4gIF8ucGx1Y2sgPSBmdW5jdGlvbihvYmosIGtleSkge1xuICAgIHJldHVybiBfLm1hcChvYmosIF8ucHJvcGVydHkoa2V5KSk7XG4gIH07XG5cbiAgLy8gQ29udmVuaWVuY2UgdmVyc2lvbiBvZiBhIGNvbW1vbiB1c2UgY2FzZSBvZiBgZmlsdGVyYDogc2VsZWN0aW5nIG9ubHkgb2JqZWN0c1xuICAvLyBjb250YWluaW5nIHNwZWNpZmljIGBrZXk6dmFsdWVgIHBhaXJzLlxuICBfLndoZXJlID0gZnVuY3Rpb24ob2JqLCBhdHRycykge1xuICAgIHJldHVybiBfLmZpbHRlcihvYmosIF8ubWF0Y2hlcyhhdHRycykpO1xuICB9O1xuXG4gIC8vIENvbnZlbmllbmNlIHZlcnNpb24gb2YgYSBjb21tb24gdXNlIGNhc2Ugb2YgYGZpbmRgOiBnZXR0aW5nIHRoZSBmaXJzdCBvYmplY3RcbiAgLy8gY29udGFpbmluZyBzcGVjaWZpYyBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy5maW5kV2hlcmUgPSBmdW5jdGlvbihvYmosIGF0dHJzKSB7XG4gICAgcmV0dXJuIF8uZmluZChvYmosIF8ubWF0Y2hlcyhhdHRycykpO1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbWF4aW11bSBlbGVtZW50IG9yIChlbGVtZW50LWJhc2VkIGNvbXB1dGF0aW9uKS5cbiAgLy8gQ2FuJ3Qgb3B0aW1pemUgYXJyYXlzIG9mIGludGVnZXJzIGxvbmdlciB0aGFuIDY1LDUzNSBlbGVtZW50cy5cbiAgLy8gU2VlIFtXZWJLaXQgQnVnIDgwNzk3XShodHRwczovL2J1Z3Mud2Via2l0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9ODA3OTcpXG4gIF8ubWF4ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmICghaXRlcmF0b3IgJiYgXy5pc0FycmF5KG9iaikgJiYgb2JqWzBdID09PSArb2JqWzBdICYmIG9iai5sZW5ndGggPCA2NTUzNSkge1xuICAgICAgcmV0dXJuIE1hdGgubWF4LmFwcGx5KE1hdGgsIG9iaik7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSAtSW5maW5pdHksIGxhc3RDb21wdXRlZCA9IC1JbmZpbml0eTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICB2YXIgY29tcHV0ZWQgPSBpdGVyYXRvciA/IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSA6IHZhbHVlO1xuICAgICAgaWYgKGNvbXB1dGVkID4gbGFzdENvbXB1dGVkKSB7XG4gICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICBsYXN0Q29tcHV0ZWQgPSBjb21wdXRlZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFJldHVybiB0aGUgbWluaW11bSBlbGVtZW50IChvciBlbGVtZW50LWJhc2VkIGNvbXB1dGF0aW9uKS5cbiAgXy5taW4gPSBmdW5jdGlvbihvYmosIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgaWYgKCFpdGVyYXRvciAmJiBfLmlzQXJyYXkob2JqKSAmJiBvYmpbMF0gPT09ICtvYmpbMF0gJiYgb2JqLmxlbmd0aCA8IDY1NTM1KSB7XG4gICAgICByZXR1cm4gTWF0aC5taW4uYXBwbHkoTWF0aCwgb2JqKTtcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IEluZmluaXR5LCBsYXN0Q29tcHV0ZWQgPSBJbmZpbml0eTtcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICB2YXIgY29tcHV0ZWQgPSBpdGVyYXRvciA/IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KSA6IHZhbHVlO1xuICAgICAgaWYgKGNvbXB1dGVkIDwgbGFzdENvbXB1dGVkKSB7XG4gICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICBsYXN0Q29tcHV0ZWQgPSBjb21wdXRlZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFNodWZmbGUgYW4gYXJyYXksIHVzaW5nIHRoZSBtb2Rlcm4gdmVyc2lvbiBvZiB0aGVcbiAgLy8gW0Zpc2hlci1ZYXRlcyBzaHVmZmxlXShodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0Zpc2hlcuKAk1lhdGVzX3NodWZmbGUpLlxuICBfLnNodWZmbGUgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgcmFuZDtcbiAgICB2YXIgaW5kZXggPSAwO1xuICAgIHZhciBzaHVmZmxlZCA9IFtdO1xuICAgIGVhY2gob2JqLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmFuZCA9IF8ucmFuZG9tKGluZGV4KyspO1xuICAgICAgc2h1ZmZsZWRbaW5kZXggLSAxXSA9IHNodWZmbGVkW3JhbmRdO1xuICAgICAgc2h1ZmZsZWRbcmFuZF0gPSB2YWx1ZTtcbiAgICB9KTtcbiAgICByZXR1cm4gc2h1ZmZsZWQ7XG4gIH07XG5cbiAgLy8gU2FtcGxlICoqbioqIHJhbmRvbSB2YWx1ZXMgZnJvbSBhIGNvbGxlY3Rpb24uXG4gIC8vIElmICoqbioqIGlzIG5vdCBzcGVjaWZpZWQsIHJldHVybnMgYSBzaW5nbGUgcmFuZG9tIGVsZW1lbnQuXG4gIC8vIFRoZSBpbnRlcm5hbCBgZ3VhcmRgIGFyZ3VtZW50IGFsbG93cyBpdCB0byB3b3JrIHdpdGggYG1hcGAuXG4gIF8uc2FtcGxlID0gZnVuY3Rpb24ob2JqLCBuLCBndWFyZCkge1xuICAgIGlmIChuID09IG51bGwgfHwgZ3VhcmQpIHtcbiAgICAgIGlmIChvYmoubGVuZ3RoICE9PSArb2JqLmxlbmd0aCkgb2JqID0gXy52YWx1ZXMob2JqKTtcbiAgICAgIHJldHVybiBvYmpbXy5yYW5kb20ob2JqLmxlbmd0aCAtIDEpXTtcbiAgICB9XG4gICAgcmV0dXJuIF8uc2h1ZmZsZShvYmopLnNsaWNlKDAsIE1hdGgubWF4KDAsIG4pKTtcbiAgfTtcblxuICAvLyBBbiBpbnRlcm5hbCBmdW5jdGlvbiB0byBnZW5lcmF0ZSBsb29rdXAgaXRlcmF0b3JzLlxuICB2YXIgbG9va3VwSXRlcmF0b3IgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PSBudWxsKSByZXR1cm4gXy5pZGVudGl0eTtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHZhbHVlKSkgcmV0dXJuIHZhbHVlO1xuICAgIHJldHVybiBfLnByb3BlcnR5KHZhbHVlKTtcbiAgfTtcblxuICAvLyBTb3J0IHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24gcHJvZHVjZWQgYnkgYW4gaXRlcmF0b3IuXG4gIF8uc29ydEJ5ID0gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGl0ZXJhdG9yID0gbG9va3VwSXRlcmF0b3IoaXRlcmF0b3IpO1xuICAgIHJldHVybiBfLnBsdWNrKF8ubWFwKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgIGluZGV4OiBpbmRleCxcbiAgICAgICAgY3JpdGVyaWE6IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgdmFsdWUsIGluZGV4LCBsaXN0KVxuICAgICAgfTtcbiAgICB9KS5zb3J0KGZ1bmN0aW9uKGxlZnQsIHJpZ2h0KSB7XG4gICAgICB2YXIgYSA9IGxlZnQuY3JpdGVyaWE7XG4gICAgICB2YXIgYiA9IHJpZ2h0LmNyaXRlcmlhO1xuICAgICAgaWYgKGEgIT09IGIpIHtcbiAgICAgICAgaWYgKGEgPiBiIHx8IGEgPT09IHZvaWQgMCkgcmV0dXJuIDE7XG4gICAgICAgIGlmIChhIDwgYiB8fCBiID09PSB2b2lkIDApIHJldHVybiAtMTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsZWZ0LmluZGV4IC0gcmlnaHQuaW5kZXg7XG4gICAgfSksICd2YWx1ZScpO1xuICB9O1xuXG4gIC8vIEFuIGludGVybmFsIGZ1bmN0aW9uIHVzZWQgZm9yIGFnZ3JlZ2F0ZSBcImdyb3VwIGJ5XCIgb3BlcmF0aW9ucy5cbiAgdmFyIGdyb3VwID0gZnVuY3Rpb24oYmVoYXZpb3IpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgICAgaXRlcmF0b3IgPSBsb29rdXBJdGVyYXRvcihpdGVyYXRvcik7XG4gICAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4KSB7XG4gICAgICAgIHZhciBrZXkgPSBpdGVyYXRvci5jYWxsKGNvbnRleHQsIHZhbHVlLCBpbmRleCwgb2JqKTtcbiAgICAgICAgYmVoYXZpb3IocmVzdWx0LCBrZXksIHZhbHVlKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9O1xuXG4gIC8vIEdyb3VwcyB0aGUgb2JqZWN0J3MgdmFsdWVzIGJ5IGEgY3JpdGVyaW9uLiBQYXNzIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGVcbiAgLy8gdG8gZ3JvdXAgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBjcml0ZXJpb24uXG4gIF8uZ3JvdXBCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwga2V5LCB2YWx1ZSkge1xuICAgIF8uaGFzKHJlc3VsdCwga2V5KSA/IHJlc3VsdFtrZXldLnB1c2godmFsdWUpIDogcmVzdWx0W2tleV0gPSBbdmFsdWVdO1xuICB9KTtcblxuICAvLyBJbmRleGVzIHRoZSBvYmplY3QncyB2YWx1ZXMgYnkgYSBjcml0ZXJpb24sIHNpbWlsYXIgdG8gYGdyb3VwQnlgLCBidXQgZm9yXG4gIC8vIHdoZW4geW91IGtub3cgdGhhdCB5b3VyIGluZGV4IHZhbHVlcyB3aWxsIGJlIHVuaXF1ZS5cbiAgXy5pbmRleEJ5ID0gZ3JvdXAoZnVuY3Rpb24ocmVzdWx0LCBrZXksIHZhbHVlKSB7XG4gICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgfSk7XG5cbiAgLy8gQ291bnRzIGluc3RhbmNlcyBvZiBhbiBvYmplY3QgdGhhdCBncm91cCBieSBhIGNlcnRhaW4gY3JpdGVyaW9uLiBQYXNzXG4gIC8vIGVpdGhlciBhIHN0cmluZyBhdHRyaWJ1dGUgdG8gY291bnQgYnksIG9yIGEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZVxuICAvLyBjcml0ZXJpb24uXG4gIF8uY291bnRCeSA9IGdyb3VwKGZ1bmN0aW9uKHJlc3VsdCwga2V5KSB7XG4gICAgXy5oYXMocmVzdWx0LCBrZXkpID8gcmVzdWx0W2tleV0rKyA6IHJlc3VsdFtrZXldID0gMTtcbiAgfSk7XG5cbiAgLy8gVXNlIGEgY29tcGFyYXRvciBmdW5jdGlvbiB0byBmaWd1cmUgb3V0IHRoZSBzbWFsbGVzdCBpbmRleCBhdCB3aGljaFxuICAvLyBhbiBvYmplY3Qgc2hvdWxkIGJlIGluc2VydGVkIHNvIGFzIHRvIG1haW50YWluIG9yZGVyLiBVc2VzIGJpbmFyeSBzZWFyY2guXG4gIF8uc29ydGVkSW5kZXggPSBmdW5jdGlvbihhcnJheSwgb2JqLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGl0ZXJhdG9yID0gbG9va3VwSXRlcmF0b3IoaXRlcmF0b3IpO1xuICAgIHZhciB2YWx1ZSA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgb2JqKTtcbiAgICB2YXIgbG93ID0gMCwgaGlnaCA9IGFycmF5Lmxlbmd0aDtcbiAgICB3aGlsZSAobG93IDwgaGlnaCkge1xuICAgICAgdmFyIG1pZCA9IChsb3cgKyBoaWdoKSA+Pj4gMTtcbiAgICAgIGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgYXJyYXlbbWlkXSkgPCB2YWx1ZSA/IGxvdyA9IG1pZCArIDEgOiBoaWdoID0gbWlkO1xuICAgIH1cbiAgICByZXR1cm4gbG93O1xuICB9O1xuXG4gIC8vIFNhZmVseSBjcmVhdGUgYSByZWFsLCBsaXZlIGFycmF5IGZyb20gYW55dGhpbmcgaXRlcmFibGUuXG4gIF8udG9BcnJheSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghb2JqKSByZXR1cm4gW107XG4gICAgaWYgKF8uaXNBcnJheShvYmopKSByZXR1cm4gc2xpY2UuY2FsbChvYmopO1xuICAgIGlmIChvYmoubGVuZ3RoID09PSArb2JqLmxlbmd0aCkgcmV0dXJuIF8ubWFwKG9iaiwgXy5pZGVudGl0eSk7XG4gICAgcmV0dXJuIF8udmFsdWVzKG9iaik7XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRoZSBudW1iZXIgb2YgZWxlbWVudHMgaW4gYW4gb2JqZWN0LlxuICBfLnNpemUgPSBmdW5jdGlvbihvYmopIHtcbiAgICBpZiAob2JqID09IG51bGwpIHJldHVybiAwO1xuICAgIHJldHVybiAob2JqLmxlbmd0aCA9PT0gK29iai5sZW5ndGgpID8gb2JqLmxlbmd0aCA6IF8ua2V5cyhvYmopLmxlbmd0aDtcbiAgfTtcblxuICAvLyBBcnJheSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tXG5cbiAgLy8gR2V0IHRoZSBmaXJzdCBlbGVtZW50IG9mIGFuIGFycmF5LiBQYXNzaW5nICoqbioqIHdpbGwgcmV0dXJuIHRoZSBmaXJzdCBOXG4gIC8vIHZhbHVlcyBpbiB0aGUgYXJyYXkuIEFsaWFzZWQgYXMgYGhlYWRgIGFuZCBgdGFrZWAuIFRoZSAqKmd1YXJkKiogY2hlY2tcbiAgLy8gYWxsb3dzIGl0IHRvIHdvcmsgd2l0aCBgXy5tYXBgLlxuICBfLmZpcnN0ID0gXy5oZWFkID0gXy50YWtlID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgaWYgKChuID09IG51bGwpIHx8IGd1YXJkKSByZXR1cm4gYXJyYXlbMF07XG4gICAgaWYgKG4gPCAwKSByZXR1cm4gW107XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIDAsIG4pO1xuICB9O1xuXG4gIC8vIFJldHVybnMgZXZlcnl0aGluZyBidXQgdGhlIGxhc3QgZW50cnkgb2YgdGhlIGFycmF5LiBFc3BlY2lhbGx5IHVzZWZ1bCBvblxuICAvLyB0aGUgYXJndW1lbnRzIG9iamVjdC4gUGFzc2luZyAqKm4qKiB3aWxsIHJldHVybiBhbGwgdGhlIHZhbHVlcyBpblxuICAvLyB0aGUgYXJyYXksIGV4Y2x1ZGluZyB0aGUgbGFzdCBOLiBUaGUgKipndWFyZCoqIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGhcbiAgLy8gYF8ubWFwYC5cbiAgXy5pbml0aWFsID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIDAsIGFycmF5Lmxlbmd0aCAtICgobiA9PSBudWxsKSB8fCBndWFyZCA/IDEgOiBuKSk7XG4gIH07XG5cbiAgLy8gR2V0IHRoZSBsYXN0IGVsZW1lbnQgb2YgYW4gYXJyYXkuIFBhc3NpbmcgKipuKiogd2lsbCByZXR1cm4gdGhlIGxhc3QgTlxuICAvLyB2YWx1ZXMgaW4gdGhlIGFycmF5LiBUaGUgKipndWFyZCoqIGNoZWNrIGFsbG93cyBpdCB0byB3b3JrIHdpdGggYF8ubWFwYC5cbiAgXy5sYXN0ID0gZnVuY3Rpb24oYXJyYXksIG4sIGd1YXJkKSB7XG4gICAgaWYgKGFycmF5ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgaWYgKChuID09IG51bGwpIHx8IGd1YXJkKSByZXR1cm4gYXJyYXlbYXJyYXkubGVuZ3RoIC0gMV07XG4gICAgcmV0dXJuIHNsaWNlLmNhbGwoYXJyYXksIE1hdGgubWF4KGFycmF5Lmxlbmd0aCAtIG4sIDApKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGV2ZXJ5dGhpbmcgYnV0IHRoZSBmaXJzdCBlbnRyeSBvZiB0aGUgYXJyYXkuIEFsaWFzZWQgYXMgYHRhaWxgIGFuZCBgZHJvcGAuXG4gIC8vIEVzcGVjaWFsbHkgdXNlZnVsIG9uIHRoZSBhcmd1bWVudHMgb2JqZWN0LiBQYXNzaW5nIGFuICoqbioqIHdpbGwgcmV0dXJuXG4gIC8vIHRoZSByZXN0IE4gdmFsdWVzIGluIHRoZSBhcnJheS4gVGhlICoqZ3VhcmQqKlxuICAvLyBjaGVjayBhbGxvd3MgaXQgdG8gd29yayB3aXRoIGBfLm1hcGAuXG4gIF8ucmVzdCA9IF8udGFpbCA9IF8uZHJvcCA9IGZ1bmN0aW9uKGFycmF5LCBuLCBndWFyZCkge1xuICAgIHJldHVybiBzbGljZS5jYWxsKGFycmF5LCAobiA9PSBudWxsKSB8fCBndWFyZCA/IDEgOiBuKTtcbiAgfTtcblxuICAvLyBUcmltIG91dCBhbGwgZmFsc3kgdmFsdWVzIGZyb20gYW4gYXJyYXkuXG4gIF8uY29tcGFjdCA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgcmV0dXJuIF8uZmlsdGVyKGFycmF5LCBfLmlkZW50aXR5KTtcbiAgfTtcblxuICAvLyBJbnRlcm5hbCBpbXBsZW1lbnRhdGlvbiBvZiBhIHJlY3Vyc2l2ZSBgZmxhdHRlbmAgZnVuY3Rpb24uXG4gIHZhciBmbGF0dGVuID0gZnVuY3Rpb24oaW5wdXQsIHNoYWxsb3csIG91dHB1dCkge1xuICAgIGlmIChzaGFsbG93ICYmIF8uZXZlcnkoaW5wdXQsIF8uaXNBcnJheSkpIHtcbiAgICAgIHJldHVybiBjb25jYXQuYXBwbHkob3V0cHV0LCBpbnB1dCk7XG4gICAgfVxuICAgIGVhY2goaW5wdXQsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAoXy5pc0FycmF5KHZhbHVlKSB8fCBfLmlzQXJndW1lbnRzKHZhbHVlKSkge1xuICAgICAgICBzaGFsbG93ID8gcHVzaC5hcHBseShvdXRwdXQsIHZhbHVlKSA6IGZsYXR0ZW4odmFsdWUsIHNoYWxsb3csIG91dHB1dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXRwdXQucHVzaCh2YWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfTtcblxuICAvLyBGbGF0dGVuIG91dCBhbiBhcnJheSwgZWl0aGVyIHJlY3Vyc2l2ZWx5IChieSBkZWZhdWx0KSwgb3IganVzdCBvbmUgbGV2ZWwuXG4gIF8uZmxhdHRlbiA9IGZ1bmN0aW9uKGFycmF5LCBzaGFsbG93KSB7XG4gICAgcmV0dXJuIGZsYXR0ZW4oYXJyYXksIHNoYWxsb3csIFtdKTtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSB2ZXJzaW9uIG9mIHRoZSBhcnJheSB0aGF0IGRvZXMgbm90IGNvbnRhaW4gdGhlIHNwZWNpZmllZCB2YWx1ZShzKS5cbiAgXy53aXRob3V0ID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gXy5kaWZmZXJlbmNlKGFycmF5LCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICB9O1xuXG4gIC8vIFNwbGl0IGFuIGFycmF5IGludG8gdHdvIGFycmF5czogb25lIHdob3NlIGVsZW1lbnRzIGFsbCBzYXRpc2Z5IHRoZSBnaXZlblxuICAvLyBwcmVkaWNhdGUsIGFuZCBvbmUgd2hvc2UgZWxlbWVudHMgYWxsIGRvIG5vdCBzYXRpc2Z5IHRoZSBwcmVkaWNhdGUuXG4gIF8ucGFydGl0aW9uID0gZnVuY3Rpb24oYXJyYXksIHByZWRpY2F0ZSkge1xuICAgIHZhciBwYXNzID0gW10sIGZhaWwgPSBbXTtcbiAgICBlYWNoKGFycmF5LCBmdW5jdGlvbihlbGVtKSB7XG4gICAgICAocHJlZGljYXRlKGVsZW0pID8gcGFzcyA6IGZhaWwpLnB1c2goZWxlbSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIFtwYXNzLCBmYWlsXTtcbiAgfTtcblxuICAvLyBQcm9kdWNlIGEgZHVwbGljYXRlLWZyZWUgdmVyc2lvbiBvZiB0aGUgYXJyYXkuIElmIHRoZSBhcnJheSBoYXMgYWxyZWFkeVxuICAvLyBiZWVuIHNvcnRlZCwgeW91IGhhdmUgdGhlIG9wdGlvbiBvZiB1c2luZyBhIGZhc3RlciBhbGdvcml0aG0uXG4gIC8vIEFsaWFzZWQgYXMgYHVuaXF1ZWAuXG4gIF8udW5pcSA9IF8udW5pcXVlID0gZnVuY3Rpb24oYXJyYXksIGlzU29ydGVkLCBpdGVyYXRvciwgY29udGV4dCkge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oaXNTb3J0ZWQpKSB7XG4gICAgICBjb250ZXh0ID0gaXRlcmF0b3I7XG4gICAgICBpdGVyYXRvciA9IGlzU29ydGVkO1xuICAgICAgaXNTb3J0ZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgdmFyIGluaXRpYWwgPSBpdGVyYXRvciA/IF8ubWFwKGFycmF5LCBpdGVyYXRvciwgY29udGV4dCkgOiBhcnJheTtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIHZhciBzZWVuID0gW107XG4gICAgZWFjaChpbml0aWFsLCBmdW5jdGlvbih2YWx1ZSwgaW5kZXgpIHtcbiAgICAgIGlmIChpc1NvcnRlZCA/ICghaW5kZXggfHwgc2VlbltzZWVuLmxlbmd0aCAtIDFdICE9PSB2YWx1ZSkgOiAhXy5jb250YWlucyhzZWVuLCB2YWx1ZSkpIHtcbiAgICAgICAgc2Vlbi5wdXNoKHZhbHVlKTtcbiAgICAgICAgcmVzdWx0cy5wdXNoKGFycmF5W2luZGV4XSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIHRoZSB1bmlvbjogZWFjaCBkaXN0aW5jdCBlbGVtZW50IGZyb20gYWxsIG9mXG4gIC8vIHRoZSBwYXNzZWQtaW4gYXJyYXlzLlxuICBfLnVuaW9uID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIF8udW5pcShfLmZsYXR0ZW4oYXJndW1lbnRzLCB0cnVlKSk7XG4gIH07XG5cbiAgLy8gUHJvZHVjZSBhbiBhcnJheSB0aGF0IGNvbnRhaW5zIGV2ZXJ5IGl0ZW0gc2hhcmVkIGJldHdlZW4gYWxsIHRoZVxuICAvLyBwYXNzZWQtaW4gYXJyYXlzLlxuICBfLmludGVyc2VjdGlvbiA9IGZ1bmN0aW9uKGFycmF5KSB7XG4gICAgdmFyIHJlc3QgPSBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgcmV0dXJuIF8uZmlsdGVyKF8udW5pcShhcnJheSksIGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHJldHVybiBfLmV2ZXJ5KHJlc3QsIGZ1bmN0aW9uKG90aGVyKSB7XG4gICAgICAgIHJldHVybiBfLmNvbnRhaW5zKG90aGVyLCBpdGVtKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIFRha2UgdGhlIGRpZmZlcmVuY2UgYmV0d2VlbiBvbmUgYXJyYXkgYW5kIGEgbnVtYmVyIG9mIG90aGVyIGFycmF5cy5cbiAgLy8gT25seSB0aGUgZWxlbWVudHMgcHJlc2VudCBpbiBqdXN0IHRoZSBmaXJzdCBhcnJheSB3aWxsIHJlbWFpbi5cbiAgXy5kaWZmZXJlbmNlID0gZnVuY3Rpb24oYXJyYXkpIHtcbiAgICB2YXIgcmVzdCA9IGNvbmNhdC5hcHBseShBcnJheVByb3RvLCBzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpO1xuICAgIHJldHVybiBfLmZpbHRlcihhcnJheSwgZnVuY3Rpb24odmFsdWUpeyByZXR1cm4gIV8uY29udGFpbnMocmVzdCwgdmFsdWUpOyB9KTtcbiAgfTtcblxuICAvLyBaaXAgdG9nZXRoZXIgbXVsdGlwbGUgbGlzdHMgaW50byBhIHNpbmdsZSBhcnJheSAtLSBlbGVtZW50cyB0aGF0IHNoYXJlXG4gIC8vIGFuIGluZGV4IGdvIHRvZ2V0aGVyLlxuICBfLnppcCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBsZW5ndGggPSBfLm1heChfLnBsdWNrKGFyZ3VtZW50cywgJ2xlbmd0aCcpLmNvbmNhdCgwKSk7XG4gICAgdmFyIHJlc3VsdHMgPSBuZXcgQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICByZXN1bHRzW2ldID0gXy5wbHVjayhhcmd1bWVudHMsICcnICsgaSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xuICB9O1xuXG4gIC8vIENvbnZlcnRzIGxpc3RzIGludG8gb2JqZWN0cy4gUGFzcyBlaXRoZXIgYSBzaW5nbGUgYXJyYXkgb2YgYFtrZXksIHZhbHVlXWBcbiAgLy8gcGFpcnMsIG9yIHR3byBwYXJhbGxlbCBhcnJheXMgb2YgdGhlIHNhbWUgbGVuZ3RoIC0tIG9uZSBvZiBrZXlzLCBhbmQgb25lIG9mXG4gIC8vIHRoZSBjb3JyZXNwb25kaW5nIHZhbHVlcy5cbiAgXy5vYmplY3QgPSBmdW5jdGlvbihsaXN0LCB2YWx1ZXMpIHtcbiAgICBpZiAobGlzdCA9PSBudWxsKSByZXR1cm4ge307XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW5ndGggPSBsaXN0Lmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodmFsdWVzKSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldXSA9IHZhbHVlc1tpXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlc3VsdFtsaXN0W2ldWzBdXSA9IGxpc3RbaV1bMV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLy8gSWYgdGhlIGJyb3dzZXIgZG9lc24ndCBzdXBwbHkgdXMgd2l0aCBpbmRleE9mIChJJ20gbG9va2luZyBhdCB5b3UsICoqTVNJRSoqKSxcbiAgLy8gd2UgbmVlZCB0aGlzIGZ1bmN0aW9uLiBSZXR1cm4gdGhlIHBvc2l0aW9uIG9mIHRoZSBmaXJzdCBvY2N1cnJlbmNlIG9mIGFuXG4gIC8vIGl0ZW0gaW4gYW4gYXJyYXksIG9yIC0xIGlmIHRoZSBpdGVtIGlzIG5vdCBpbmNsdWRlZCBpbiB0aGUgYXJyYXkuXG4gIC8vIERlbGVnYXRlcyB0byAqKkVDTUFTY3JpcHQgNSoqJ3MgbmF0aXZlIGBpbmRleE9mYCBpZiBhdmFpbGFibGUuXG4gIC8vIElmIHRoZSBhcnJheSBpcyBsYXJnZSBhbmQgYWxyZWFkeSBpbiBzb3J0IG9yZGVyLCBwYXNzIGB0cnVlYFxuICAvLyBmb3IgKippc1NvcnRlZCoqIHRvIHVzZSBiaW5hcnkgc2VhcmNoLlxuICBfLmluZGV4T2YgPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgaXNTb3J0ZWQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIC0xO1xuICAgIHZhciBpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuICAgIGlmIChpc1NvcnRlZCkge1xuICAgICAgaWYgKHR5cGVvZiBpc1NvcnRlZCA9PSAnbnVtYmVyJykge1xuICAgICAgICBpID0gKGlzU29ydGVkIDwgMCA/IE1hdGgubWF4KDAsIGxlbmd0aCArIGlzU29ydGVkKSA6IGlzU29ydGVkKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGkgPSBfLnNvcnRlZEluZGV4KGFycmF5LCBpdGVtKTtcbiAgICAgICAgcmV0dXJuIGFycmF5W2ldID09PSBpdGVtID8gaSA6IC0xO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAobmF0aXZlSW5kZXhPZiAmJiBhcnJheS5pbmRleE9mID09PSBuYXRpdmVJbmRleE9mKSByZXR1cm4gYXJyYXkuaW5kZXhPZihpdGVtLCBpc1NvcnRlZCk7XG4gICAgZm9yICg7IGkgPCBsZW5ndGg7IGkrKykgaWYgKGFycmF5W2ldID09PSBpdGVtKSByZXR1cm4gaTtcbiAgICByZXR1cm4gLTE7XG4gIH07XG5cbiAgLy8gRGVsZWdhdGVzIHRvICoqRUNNQVNjcmlwdCA1KioncyBuYXRpdmUgYGxhc3RJbmRleE9mYCBpZiBhdmFpbGFibGUuXG4gIF8ubGFzdEluZGV4T2YgPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgZnJvbSkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gLTE7XG4gICAgdmFyIGhhc0luZGV4ID0gZnJvbSAhPSBudWxsO1xuICAgIGlmIChuYXRpdmVMYXN0SW5kZXhPZiAmJiBhcnJheS5sYXN0SW5kZXhPZiA9PT0gbmF0aXZlTGFzdEluZGV4T2YpIHtcbiAgICAgIHJldHVybiBoYXNJbmRleCA/IGFycmF5Lmxhc3RJbmRleE9mKGl0ZW0sIGZyb20pIDogYXJyYXkubGFzdEluZGV4T2YoaXRlbSk7XG4gICAgfVxuICAgIHZhciBpID0gKGhhc0luZGV4ID8gZnJvbSA6IGFycmF5Lmxlbmd0aCk7XG4gICAgd2hpbGUgKGktLSkgaWYgKGFycmF5W2ldID09PSBpdGVtKSByZXR1cm4gaTtcbiAgICByZXR1cm4gLTE7XG4gIH07XG5cbiAgLy8gR2VuZXJhdGUgYW4gaW50ZWdlciBBcnJheSBjb250YWluaW5nIGFuIGFyaXRobWV0aWMgcHJvZ3Jlc3Npb24uIEEgcG9ydCBvZlxuICAvLyB0aGUgbmF0aXZlIFB5dGhvbiBgcmFuZ2UoKWAgZnVuY3Rpb24uIFNlZVxuICAvLyBbdGhlIFB5dGhvbiBkb2N1bWVudGF0aW9uXShodHRwOi8vZG9jcy5weXRob24ub3JnL2xpYnJhcnkvZnVuY3Rpb25zLmh0bWwjcmFuZ2UpLlxuICBfLnJhbmdlID0gZnVuY3Rpb24oc3RhcnQsIHN0b3AsIHN0ZXApIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8PSAxKSB7XG4gICAgICBzdG9wID0gc3RhcnQgfHwgMDtcbiAgICAgIHN0YXJ0ID0gMDtcbiAgICB9XG4gICAgc3RlcCA9IGFyZ3VtZW50c1syXSB8fCAxO1xuXG4gICAgdmFyIGxlbmd0aCA9IE1hdGgubWF4KE1hdGguY2VpbCgoc3RvcCAtIHN0YXJ0KSAvIHN0ZXApLCAwKTtcbiAgICB2YXIgaWR4ID0gMDtcbiAgICB2YXIgcmFuZ2UgPSBuZXcgQXJyYXkobGVuZ3RoKTtcblxuICAgIHdoaWxlKGlkeCA8IGxlbmd0aCkge1xuICAgICAgcmFuZ2VbaWR4KytdID0gc3RhcnQ7XG4gICAgICBzdGFydCArPSBzdGVwO1xuICAgIH1cblxuICAgIHJldHVybiByYW5nZTtcbiAgfTtcblxuICAvLyBGdW5jdGlvbiAoYWhlbSkgRnVuY3Rpb25zXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJldXNhYmxlIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIGZvciBwcm90b3R5cGUgc2V0dGluZy5cbiAgdmFyIGN0b3IgPSBmdW5jdGlvbigpe307XG5cbiAgLy8gQ3JlYXRlIGEgZnVuY3Rpb24gYm91bmQgdG8gYSBnaXZlbiBvYmplY3QgKGFzc2lnbmluZyBgdGhpc2AsIGFuZCBhcmd1bWVudHMsXG4gIC8vIG9wdGlvbmFsbHkpLiBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgRnVuY3Rpb24uYmluZGAgaWZcbiAgLy8gYXZhaWxhYmxlLlxuICBfLmJpbmQgPSBmdW5jdGlvbihmdW5jLCBjb250ZXh0KSB7XG4gICAgdmFyIGFyZ3MsIGJvdW5kO1xuICAgIGlmIChuYXRpdmVCaW5kICYmIGZ1bmMuYmluZCA9PT0gbmF0aXZlQmluZCkgcmV0dXJuIG5hdGl2ZUJpbmQuYXBwbHkoZnVuYywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBpZiAoIV8uaXNGdW5jdGlvbihmdW5jKSkgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgICBhcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuICAgIHJldHVybiBib3VuZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIGJvdW5kKSkgcmV0dXJuIGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncy5jb25jYXQoc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgICBjdG9yLnByb3RvdHlwZSA9IGZ1bmMucHJvdG90eXBlO1xuICAgICAgdmFyIHNlbGYgPSBuZXcgY3RvcjtcbiAgICAgIGN0b3IucHJvdG90eXBlID0gbnVsbDtcbiAgICAgIHZhciByZXN1bHQgPSBmdW5jLmFwcGx5KHNlbGYsIGFyZ3MuY29uY2F0KHNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgICAgaWYgKE9iamVjdChyZXN1bHQpID09PSByZXN1bHQpIHJldHVybiByZXN1bHQ7XG4gICAgICByZXR1cm4gc2VsZjtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFBhcnRpYWxseSBhcHBseSBhIGZ1bmN0aW9uIGJ5IGNyZWF0aW5nIGEgdmVyc2lvbiB0aGF0IGhhcyBoYWQgc29tZSBvZiBpdHNcbiAgLy8gYXJndW1lbnRzIHByZS1maWxsZWQsIHdpdGhvdXQgY2hhbmdpbmcgaXRzIGR5bmFtaWMgYHRoaXNgIGNvbnRleHQuIF8gYWN0c1xuICAvLyBhcyBhIHBsYWNlaG9sZGVyLCBhbGxvd2luZyBhbnkgY29tYmluYXRpb24gb2YgYXJndW1lbnRzIHRvIGJlIHByZS1maWxsZWQuXG4gIF8ucGFydGlhbCA9IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICB2YXIgYm91bmRBcmdzID0gc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBwb3NpdGlvbiA9IDA7XG4gICAgICB2YXIgYXJncyA9IGJvdW5kQXJncy5zbGljZSgpO1xuICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGFyZ3MubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGFyZ3NbaV0gPT09IF8pIGFyZ3NbaV0gPSBhcmd1bWVudHNbcG9zaXRpb24rK107XG4gICAgICB9XG4gICAgICB3aGlsZSAocG9zaXRpb24gPCBhcmd1bWVudHMubGVuZ3RoKSBhcmdzLnB1c2goYXJndW1lbnRzW3Bvc2l0aW9uKytdKTtcbiAgICAgIHJldHVybiBmdW5jLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gIH07XG5cbiAgLy8gQmluZCBhIG51bWJlciBvZiBhbiBvYmplY3QncyBtZXRob2RzIHRvIHRoYXQgb2JqZWN0LiBSZW1haW5pbmcgYXJndW1lbnRzXG4gIC8vIGFyZSB0aGUgbWV0aG9kIG5hbWVzIHRvIGJlIGJvdW5kLiBVc2VmdWwgZm9yIGVuc3VyaW5nIHRoYXQgYWxsIGNhbGxiYWNrc1xuICAvLyBkZWZpbmVkIG9uIGFuIG9iamVjdCBiZWxvbmcgdG8gaXQuXG4gIF8uYmluZEFsbCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBmdW5jcyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICBpZiAoZnVuY3MubGVuZ3RoID09PSAwKSB0aHJvdyBuZXcgRXJyb3IoJ2JpbmRBbGwgbXVzdCBiZSBwYXNzZWQgZnVuY3Rpb24gbmFtZXMnKTtcbiAgICBlYWNoKGZ1bmNzLCBmdW5jdGlvbihmKSB7IG9ialtmXSA9IF8uYmluZChvYmpbZl0sIG9iaik7IH0pO1xuICAgIHJldHVybiBvYmo7XG4gIH07XG5cbiAgLy8gTWVtb2l6ZSBhbiBleHBlbnNpdmUgZnVuY3Rpb24gYnkgc3RvcmluZyBpdHMgcmVzdWx0cy5cbiAgXy5tZW1vaXplID0gZnVuY3Rpb24oZnVuYywgaGFzaGVyKSB7XG4gICAgdmFyIG1lbW8gPSB7fTtcbiAgICBoYXNoZXIgfHwgKGhhc2hlciA9IF8uaWRlbnRpdHkpO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBrZXkgPSBoYXNoZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiBfLmhhcyhtZW1vLCBrZXkpID8gbWVtb1trZXldIDogKG1lbW9ba2V5XSA9IGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gICAgfTtcbiAgfTtcblxuICAvLyBEZWxheXMgYSBmdW5jdGlvbiBmb3IgdGhlIGdpdmVuIG51bWJlciBvZiBtaWxsaXNlY29uZHMsIGFuZCB0aGVuIGNhbGxzXG4gIC8vIGl0IHdpdGggdGhlIGFyZ3VtZW50cyBzdXBwbGllZC5cbiAgXy5kZWxheSA9IGZ1bmN0aW9uKGZ1bmMsIHdhaXQpIHtcbiAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKTtcbiAgICByZXR1cm4gc2V0VGltZW91dChmdW5jdGlvbigpeyByZXR1cm4gZnVuYy5hcHBseShudWxsLCBhcmdzKTsgfSwgd2FpdCk7XG4gIH07XG5cbiAgLy8gRGVmZXJzIGEgZnVuY3Rpb24sIHNjaGVkdWxpbmcgaXQgdG8gcnVuIGFmdGVyIHRoZSBjdXJyZW50IGNhbGwgc3RhY2sgaGFzXG4gIC8vIGNsZWFyZWQuXG4gIF8uZGVmZXIgPSBmdW5jdGlvbihmdW5jKSB7XG4gICAgcmV0dXJuIF8uZGVsYXkuYXBwbHkoXywgW2Z1bmMsIDFdLmNvbmNhdChzbGljZS5jYWxsKGFyZ3VtZW50cywgMSkpKTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24sIHRoYXQsIHdoZW4gaW52b2tlZCwgd2lsbCBvbmx5IGJlIHRyaWdnZXJlZCBhdCBtb3N0IG9uY2VcbiAgLy8gZHVyaW5nIGEgZ2l2ZW4gd2luZG93IG9mIHRpbWUuIE5vcm1hbGx5LCB0aGUgdGhyb3R0bGVkIGZ1bmN0aW9uIHdpbGwgcnVuXG4gIC8vIGFzIG11Y2ggYXMgaXQgY2FuLCB3aXRob3V0IGV2ZXIgZ29pbmcgbW9yZSB0aGFuIG9uY2UgcGVyIGB3YWl0YCBkdXJhdGlvbjtcbiAgLy8gYnV0IGlmIHlvdSdkIGxpa2UgdG8gZGlzYWJsZSB0aGUgZXhlY3V0aW9uIG9uIHRoZSBsZWFkaW5nIGVkZ2UsIHBhc3NcbiAgLy8gYHtsZWFkaW5nOiBmYWxzZX1gLiBUbyBkaXNhYmxlIGV4ZWN1dGlvbiBvbiB0aGUgdHJhaWxpbmcgZWRnZSwgZGl0dG8uXG4gIF8udGhyb3R0bGUgPSBmdW5jdGlvbihmdW5jLCB3YWl0LCBvcHRpb25zKSB7XG4gICAgdmFyIGNvbnRleHQsIGFyZ3MsIHJlc3VsdDtcbiAgICB2YXIgdGltZW91dCA9IG51bGw7XG4gICAgdmFyIHByZXZpb3VzID0gMDtcbiAgICBvcHRpb25zIHx8IChvcHRpb25zID0ge30pO1xuICAgIHZhciBsYXRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcHJldmlvdXMgPSBvcHRpb25zLmxlYWRpbmcgPT09IGZhbHNlID8gMCA6IF8ubm93KCk7XG4gICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgfTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbm93ID0gXy5ub3coKTtcbiAgICAgIGlmICghcHJldmlvdXMgJiYgb3B0aW9ucy5sZWFkaW5nID09PSBmYWxzZSkgcHJldmlvdXMgPSBub3c7XG4gICAgICB2YXIgcmVtYWluaW5nID0gd2FpdCAtIChub3cgLSBwcmV2aW91cyk7XG4gICAgICBjb250ZXh0ID0gdGhpcztcbiAgICAgIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICBpZiAocmVtYWluaW5nIDw9IDApIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIGNvbnRleHQgPSBhcmdzID0gbnVsbDtcbiAgICAgIH0gZWxzZSBpZiAoIXRpbWVvdXQgJiYgb3B0aW9ucy50cmFpbGluZyAhPT0gZmFsc2UpIHtcbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHJlbWFpbmluZyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uLCB0aGF0LCBhcyBsb25nIGFzIGl0IGNvbnRpbnVlcyB0byBiZSBpbnZva2VkLCB3aWxsIG5vdFxuICAvLyBiZSB0cmlnZ2VyZWQuIFRoZSBmdW5jdGlvbiB3aWxsIGJlIGNhbGxlZCBhZnRlciBpdCBzdG9wcyBiZWluZyBjYWxsZWQgZm9yXG4gIC8vIE4gbWlsbGlzZWNvbmRzLiBJZiBgaW1tZWRpYXRlYCBpcyBwYXNzZWQsIHRyaWdnZXIgdGhlIGZ1bmN0aW9uIG9uIHRoZVxuICAvLyBsZWFkaW5nIGVkZ2UsIGluc3RlYWQgb2YgdGhlIHRyYWlsaW5nLlxuICBfLmRlYm91bmNlID0gZnVuY3Rpb24oZnVuYywgd2FpdCwgaW1tZWRpYXRlKSB7XG4gICAgdmFyIHRpbWVvdXQsIGFyZ3MsIGNvbnRleHQsIHRpbWVzdGFtcCwgcmVzdWx0O1xuXG4gICAgdmFyIGxhdGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbGFzdCA9IF8ubm93KCkgLSB0aW1lc3RhbXA7XG4gICAgICBpZiAobGFzdCA8IHdhaXQpIHtcbiAgICAgICAgdGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQgLSBsYXN0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRpbWVvdXQgPSBudWxsO1xuICAgICAgICBpZiAoIWltbWVkaWF0ZSkge1xuICAgICAgICAgIHJlc3VsdCA9IGZ1bmMuYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgICAgY29udGV4dCA9IGFyZ3MgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGNvbnRleHQgPSB0aGlzO1xuICAgICAgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIHRpbWVzdGFtcCA9IF8ubm93KCk7XG4gICAgICB2YXIgY2FsbE5vdyA9IGltbWVkaWF0ZSAmJiAhdGltZW91dDtcbiAgICAgIGlmICghdGltZW91dCkge1xuICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCk7XG4gICAgICB9XG4gICAgICBpZiAoY2FsbE5vdykge1xuICAgICAgICByZXN1bHQgPSBmdW5jLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICBjb250ZXh0ID0gYXJncyA9IG51bGw7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfTtcblxuICAvLyBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCB3aWxsIGJlIGV4ZWN1dGVkIGF0IG1vc3Qgb25lIHRpbWUsIG5vIG1hdHRlciBob3dcbiAgLy8gb2Z0ZW4geW91IGNhbGwgaXQuIFVzZWZ1bCBmb3IgbGF6eSBpbml0aWFsaXphdGlvbi5cbiAgXy5vbmNlID0gZnVuY3Rpb24oZnVuYykge1xuICAgIHZhciByYW4gPSBmYWxzZSwgbWVtbztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAocmFuKSByZXR1cm4gbWVtbztcbiAgICAgIHJhbiA9IHRydWU7XG4gICAgICBtZW1vID0gZnVuYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgZnVuYyA9IG51bGw7XG4gICAgICByZXR1cm4gbWVtbztcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgdGhlIGZpcnN0IGZ1bmN0aW9uIHBhc3NlZCBhcyBhbiBhcmd1bWVudCB0byB0aGUgc2Vjb25kLFxuICAvLyBhbGxvd2luZyB5b3UgdG8gYWRqdXN0IGFyZ3VtZW50cywgcnVuIGNvZGUgYmVmb3JlIGFuZCBhZnRlciwgYW5kXG4gIC8vIGNvbmRpdGlvbmFsbHkgZXhlY3V0ZSB0aGUgb3JpZ2luYWwgZnVuY3Rpb24uXG4gIF8ud3JhcCA9IGZ1bmN0aW9uKGZ1bmMsIHdyYXBwZXIpIHtcbiAgICByZXR1cm4gXy5wYXJ0aWFsKHdyYXBwZXIsIGZ1bmMpO1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBmdW5jdGlvbiB0aGF0IGlzIHRoZSBjb21wb3NpdGlvbiBvZiBhIGxpc3Qgb2YgZnVuY3Rpb25zLCBlYWNoXG4gIC8vIGNvbnN1bWluZyB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBmdW5jdGlvbiB0aGF0IGZvbGxvd3MuXG4gIF8uY29tcG9zZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBmdW5jcyA9IGFyZ3VtZW50cztcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgICAgIGZvciAodmFyIGkgPSBmdW5jcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICBhcmdzID0gW2Z1bmNzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpXTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhcmdzWzBdO1xuICAgIH07XG4gIH07XG5cbiAgLy8gUmV0dXJucyBhIGZ1bmN0aW9uIHRoYXQgd2lsbCBvbmx5IGJlIGV4ZWN1dGVkIGFmdGVyIGJlaW5nIGNhbGxlZCBOIHRpbWVzLlxuICBfLmFmdGVyID0gZnVuY3Rpb24odGltZXMsIGZ1bmMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBpZiAoLS10aW1lcyA8IDEpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgIH1cbiAgICB9O1xuICB9O1xuXG4gIC8vIE9iamVjdCBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLVxuXG4gIC8vIFJldHJpZXZlIHRoZSBuYW1lcyBvZiBhbiBvYmplY3QncyBwcm9wZXJ0aWVzLlxuICAvLyBEZWxlZ2F0ZXMgdG8gKipFQ01BU2NyaXB0IDUqKidzIG5hdGl2ZSBgT2JqZWN0LmtleXNgXG4gIF8ua2V5cyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghXy5pc09iamVjdChvYmopKSByZXR1cm4gW107XG4gICAgaWYgKG5hdGl2ZUtleXMpIHJldHVybiBuYXRpdmVLZXlzKG9iaik7XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSBpZiAoXy5oYXMob2JqLCBrZXkpKSBrZXlzLnB1c2goa2V5KTtcbiAgICByZXR1cm4ga2V5cztcbiAgfTtcblxuICAvLyBSZXRyaWV2ZSB0aGUgdmFsdWVzIG9mIGFuIG9iamVjdCdzIHByb3BlcnRpZXMuXG4gIF8udmFsdWVzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIGtleXMgPSBfLmtleXMob2JqKTtcbiAgICB2YXIgbGVuZ3RoID0ga2V5cy5sZW5ndGg7XG4gICAgdmFyIHZhbHVlcyA9IG5ldyBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhbHVlc1tpXSA9IG9ialtrZXlzW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfTtcblxuICAvLyBDb252ZXJ0IGFuIG9iamVjdCBpbnRvIGEgbGlzdCBvZiBgW2tleSwgdmFsdWVdYCBwYWlycy5cbiAgXy5wYWlycyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciBwYWlycyA9IG5ldyBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHBhaXJzW2ldID0gW2tleXNbaV0sIG9ialtrZXlzW2ldXV07XG4gICAgfVxuICAgIHJldHVybiBwYWlycztcbiAgfTtcblxuICAvLyBJbnZlcnQgdGhlIGtleXMgYW5kIHZhbHVlcyBvZiBhbiBvYmplY3QuIFRoZSB2YWx1ZXMgbXVzdCBiZSBzZXJpYWxpemFibGUuXG4gIF8uaW52ZXJ0ID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgIHZhciBrZXlzID0gXy5rZXlzKG9iaik7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbmd0aCA9IGtleXMubGVuZ3RoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIHJlc3VsdFtvYmpba2V5c1tpXV1dID0ga2V5c1tpXTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSBzb3J0ZWQgbGlzdCBvZiB0aGUgZnVuY3Rpb24gbmFtZXMgYXZhaWxhYmxlIG9uIHRoZSBvYmplY3QuXG4gIC8vIEFsaWFzZWQgYXMgYG1ldGhvZHNgXG4gIF8uZnVuY3Rpb25zID0gXy5tZXRob2RzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgdmFyIG5hbWVzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihvYmpba2V5XSkpIG5hbWVzLnB1c2goa2V5KTtcbiAgICB9XG4gICAgcmV0dXJuIG5hbWVzLnNvcnQoKTtcbiAgfTtcblxuICAvLyBFeHRlbmQgYSBnaXZlbiBvYmplY3Qgd2l0aCBhbGwgdGhlIHByb3BlcnRpZXMgaW4gcGFzc2VkLWluIG9iamVjdChzKS5cbiAgXy5leHRlbmQgPSBmdW5jdGlvbihvYmopIHtcbiAgICBlYWNoKHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSwgZnVuY3Rpb24oc291cmNlKSB7XG4gICAgICBpZiAoc291cmNlKSB7XG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICAgICAgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBSZXR1cm4gYSBjb3B5IG9mIHRoZSBvYmplY3Qgb25seSBjb250YWluaW5nIHRoZSB3aGl0ZWxpc3RlZCBwcm9wZXJ0aWVzLlxuICBfLnBpY2sgPSBmdW5jdGlvbihvYmopIHtcbiAgICB2YXIgY29weSA9IHt9O1xuICAgIHZhciBrZXlzID0gY29uY2F0LmFwcGx5KEFycmF5UHJvdG8sIHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSk7XG4gICAgZWFjaChrZXlzLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgIGlmIChrZXkgaW4gb2JqKSBjb3B5W2tleV0gPSBvYmpba2V5XTtcbiAgICB9KTtcbiAgICByZXR1cm4gY29weTtcbiAgfTtcblxuICAgLy8gUmV0dXJuIGEgY29weSBvZiB0aGUgb2JqZWN0IHdpdGhvdXQgdGhlIGJsYWNrbGlzdGVkIHByb3BlcnRpZXMuXG4gIF8ub21pdCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHZhciBjb3B5ID0ge307XG4gICAgdmFyIGtleXMgPSBjb25jYXQuYXBwbHkoQXJyYXlQcm90bywgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAoIV8uY29udGFpbnMoa2V5cywga2V5KSkgY29weVtrZXldID0gb2JqW2tleV07XG4gICAgfVxuICAgIHJldHVybiBjb3B5O1xuICB9O1xuXG4gIC8vIEZpbGwgaW4gYSBnaXZlbiBvYmplY3Qgd2l0aCBkZWZhdWx0IHByb3BlcnRpZXMuXG4gIF8uZGVmYXVsdHMgPSBmdW5jdGlvbihvYmopIHtcbiAgICBlYWNoKHNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSwgZnVuY3Rpb24oc291cmNlKSB7XG4gICAgICBpZiAoc291cmNlKSB7XG4gICAgICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XG4gICAgICAgICAgaWYgKG9ialtwcm9wXSA9PT0gdm9pZCAwKSBvYmpbcHJvcF0gPSBzb3VyY2VbcHJvcF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gb2JqO1xuICB9O1xuXG4gIC8vIENyZWF0ZSBhIChzaGFsbG93LWNsb25lZCkgZHVwbGljYXRlIG9mIGFuIG9iamVjdC5cbiAgXy5jbG9uZSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmICghXy5pc09iamVjdChvYmopKSByZXR1cm4gb2JqO1xuICAgIHJldHVybiBfLmlzQXJyYXkob2JqKSA/IG9iai5zbGljZSgpIDogXy5leHRlbmQoe30sIG9iaik7XG4gIH07XG5cbiAgLy8gSW52b2tlcyBpbnRlcmNlcHRvciB3aXRoIHRoZSBvYmosIGFuZCB0aGVuIHJldHVybnMgb2JqLlxuICAvLyBUaGUgcHJpbWFyeSBwdXJwb3NlIG9mIHRoaXMgbWV0aG9kIGlzIHRvIFwidGFwIGludG9cIiBhIG1ldGhvZCBjaGFpbiwgaW5cbiAgLy8gb3JkZXIgdG8gcGVyZm9ybSBvcGVyYXRpb25zIG9uIGludGVybWVkaWF0ZSByZXN1bHRzIHdpdGhpbiB0aGUgY2hhaW4uXG4gIF8udGFwID0gZnVuY3Rpb24ob2JqLCBpbnRlcmNlcHRvcikge1xuICAgIGludGVyY2VwdG9yKG9iaik7XG4gICAgcmV0dXJuIG9iajtcbiAgfTtcblxuICAvLyBJbnRlcm5hbCByZWN1cnNpdmUgY29tcGFyaXNvbiBmdW5jdGlvbiBmb3IgYGlzRXF1YWxgLlxuICB2YXIgZXEgPSBmdW5jdGlvbihhLCBiLCBhU3RhY2ssIGJTdGFjaykge1xuICAgIC8vIElkZW50aWNhbCBvYmplY3RzIGFyZSBlcXVhbC4gYDAgPT09IC0wYCwgYnV0IHRoZXkgYXJlbid0IGlkZW50aWNhbC5cbiAgICAvLyBTZWUgdGhlIFtIYXJtb255IGBlZ2FsYCBwcm9wb3NhbF0oaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTplZ2FsKS5cbiAgICBpZiAoYSA9PT0gYikgcmV0dXJuIGEgIT09IDAgfHwgMSAvIGEgPT0gMSAvIGI7XG4gICAgLy8gQSBzdHJpY3QgY29tcGFyaXNvbiBpcyBuZWNlc3NhcnkgYmVjYXVzZSBgbnVsbCA9PSB1bmRlZmluZWRgLlxuICAgIGlmIChhID09IG51bGwgfHwgYiA9PSBudWxsKSByZXR1cm4gYSA9PT0gYjtcbiAgICAvLyBVbndyYXAgYW55IHdyYXBwZWQgb2JqZWN0cy5cbiAgICBpZiAoYSBpbnN0YW5jZW9mIF8pIGEgPSBhLl93cmFwcGVkO1xuICAgIGlmIChiIGluc3RhbmNlb2YgXykgYiA9IGIuX3dyYXBwZWQ7XG4gICAgLy8gQ29tcGFyZSBgW1tDbGFzc11dYCBuYW1lcy5cbiAgICB2YXIgY2xhc3NOYW1lID0gdG9TdHJpbmcuY2FsbChhKTtcbiAgICBpZiAoY2xhc3NOYW1lICE9IHRvU3RyaW5nLmNhbGwoYikpIHJldHVybiBmYWxzZTtcbiAgICBzd2l0Y2ggKGNsYXNzTmFtZSkge1xuICAgICAgLy8gU3RyaW5ncywgbnVtYmVycywgZGF0ZXMsIGFuZCBib29sZWFucyBhcmUgY29tcGFyZWQgYnkgdmFsdWUuXG4gICAgICBjYXNlICdbb2JqZWN0IFN0cmluZ10nOlxuICAgICAgICAvLyBQcmltaXRpdmVzIGFuZCB0aGVpciBjb3JyZXNwb25kaW5nIG9iamVjdCB3cmFwcGVycyBhcmUgZXF1aXZhbGVudDsgdGh1cywgYFwiNVwiYCBpc1xuICAgICAgICAvLyBlcXVpdmFsZW50IHRvIGBuZXcgU3RyaW5nKFwiNVwiKWAuXG4gICAgICAgIHJldHVybiBhID09IFN0cmluZyhiKTtcbiAgICAgIGNhc2UgJ1tvYmplY3QgTnVtYmVyXSc6XG4gICAgICAgIC8vIGBOYU5gcyBhcmUgZXF1aXZhbGVudCwgYnV0IG5vbi1yZWZsZXhpdmUuIEFuIGBlZ2FsYCBjb21wYXJpc29uIGlzIHBlcmZvcm1lZCBmb3JcbiAgICAgICAgLy8gb3RoZXIgbnVtZXJpYyB2YWx1ZXMuXG4gICAgICAgIHJldHVybiBhICE9ICthID8gYiAhPSArYiA6IChhID09IDAgPyAxIC8gYSA9PSAxIC8gYiA6IGEgPT0gK2IpO1xuICAgICAgY2FzZSAnW29iamVjdCBEYXRlXSc6XG4gICAgICBjYXNlICdbb2JqZWN0IEJvb2xlYW5dJzpcbiAgICAgICAgLy8gQ29lcmNlIGRhdGVzIGFuZCBib29sZWFucyB0byBudW1lcmljIHByaW1pdGl2ZSB2YWx1ZXMuIERhdGVzIGFyZSBjb21wYXJlZCBieSB0aGVpclxuICAgICAgICAvLyBtaWxsaXNlY29uZCByZXByZXNlbnRhdGlvbnMuIE5vdGUgdGhhdCBpbnZhbGlkIGRhdGVzIHdpdGggbWlsbGlzZWNvbmQgcmVwcmVzZW50YXRpb25zXG4gICAgICAgIC8vIG9mIGBOYU5gIGFyZSBub3QgZXF1aXZhbGVudC5cbiAgICAgICAgcmV0dXJuICthID09ICtiO1xuICAgICAgLy8gUmVnRXhwcyBhcmUgY29tcGFyZWQgYnkgdGhlaXIgc291cmNlIHBhdHRlcm5zIGFuZCBmbGFncy5cbiAgICAgIGNhc2UgJ1tvYmplY3QgUmVnRXhwXSc6XG4gICAgICAgIHJldHVybiBhLnNvdXJjZSA9PSBiLnNvdXJjZSAmJlxuICAgICAgICAgICAgICAgYS5nbG9iYWwgPT0gYi5nbG9iYWwgJiZcbiAgICAgICAgICAgICAgIGEubXVsdGlsaW5lID09IGIubXVsdGlsaW5lICYmXG4gICAgICAgICAgICAgICBhLmlnbm9yZUNhc2UgPT0gYi5pZ25vcmVDYXNlO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGEgIT0gJ29iamVjdCcgfHwgdHlwZW9mIGIgIT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcbiAgICAvLyBBc3N1bWUgZXF1YWxpdHkgZm9yIGN5Y2xpYyBzdHJ1Y3R1cmVzLiBUaGUgYWxnb3JpdGhtIGZvciBkZXRlY3RpbmcgY3ljbGljXG4gICAgLy8gc3RydWN0dXJlcyBpcyBhZGFwdGVkIGZyb20gRVMgNS4xIHNlY3Rpb24gMTUuMTIuMywgYWJzdHJhY3Qgb3BlcmF0aW9uIGBKT2AuXG4gICAgdmFyIGxlbmd0aCA9IGFTdGFjay5sZW5ndGg7XG4gICAgd2hpbGUgKGxlbmd0aC0tKSB7XG4gICAgICAvLyBMaW5lYXIgc2VhcmNoLiBQZXJmb3JtYW5jZSBpcyBpbnZlcnNlbHkgcHJvcG9ydGlvbmFsIHRvIHRoZSBudW1iZXIgb2ZcbiAgICAgIC8vIHVuaXF1ZSBuZXN0ZWQgc3RydWN0dXJlcy5cbiAgICAgIGlmIChhU3RhY2tbbGVuZ3RoXSA9PSBhKSByZXR1cm4gYlN0YWNrW2xlbmd0aF0gPT0gYjtcbiAgICB9XG4gICAgLy8gT2JqZWN0cyB3aXRoIGRpZmZlcmVudCBjb25zdHJ1Y3RvcnMgYXJlIG5vdCBlcXVpdmFsZW50LCBidXQgYE9iamVjdGBzXG4gICAgLy8gZnJvbSBkaWZmZXJlbnQgZnJhbWVzIGFyZS5cbiAgICB2YXIgYUN0b3IgPSBhLmNvbnN0cnVjdG9yLCBiQ3RvciA9IGIuY29uc3RydWN0b3I7XG4gICAgaWYgKGFDdG9yICE9PSBiQ3RvciAmJiAhKF8uaXNGdW5jdGlvbihhQ3RvcikgJiYgKGFDdG9yIGluc3RhbmNlb2YgYUN0b3IpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIF8uaXNGdW5jdGlvbihiQ3RvcikgJiYgKGJDdG9yIGluc3RhbmNlb2YgYkN0b3IpKVxuICAgICAgICAgICAgICAgICAgICAgICAgJiYgKCdjb25zdHJ1Y3RvcicgaW4gYSAmJiAnY29uc3RydWN0b3InIGluIGIpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIEFkZCB0aGUgZmlyc3Qgb2JqZWN0IHRvIHRoZSBzdGFjayBvZiB0cmF2ZXJzZWQgb2JqZWN0cy5cbiAgICBhU3RhY2sucHVzaChhKTtcbiAgICBiU3RhY2sucHVzaChiKTtcbiAgICB2YXIgc2l6ZSA9IDAsIHJlc3VsdCA9IHRydWU7XG4gICAgLy8gUmVjdXJzaXZlbHkgY29tcGFyZSBvYmplY3RzIGFuZCBhcnJheXMuXG4gICAgaWYgKGNsYXNzTmFtZSA9PSAnW29iamVjdCBBcnJheV0nKSB7XG4gICAgICAvLyBDb21wYXJlIGFycmF5IGxlbmd0aHMgdG8gZGV0ZXJtaW5lIGlmIGEgZGVlcCBjb21wYXJpc29uIGlzIG5lY2Vzc2FyeS5cbiAgICAgIHNpemUgPSBhLmxlbmd0aDtcbiAgICAgIHJlc3VsdCA9IHNpemUgPT0gYi5sZW5ndGg7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIC8vIERlZXAgY29tcGFyZSB0aGUgY29udGVudHMsIGlnbm9yaW5nIG5vbi1udW1lcmljIHByb3BlcnRpZXMuXG4gICAgICAgIHdoaWxlIChzaXplLS0pIHtcbiAgICAgICAgICBpZiAoIShyZXN1bHQgPSBlcShhW3NpemVdLCBiW3NpemVdLCBhU3RhY2ssIGJTdGFjaykpKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBEZWVwIGNvbXBhcmUgb2JqZWN0cy5cbiAgICAgIGZvciAodmFyIGtleSBpbiBhKSB7XG4gICAgICAgIGlmIChfLmhhcyhhLCBrZXkpKSB7XG4gICAgICAgICAgLy8gQ291bnQgdGhlIGV4cGVjdGVkIG51bWJlciBvZiBwcm9wZXJ0aWVzLlxuICAgICAgICAgIHNpemUrKztcbiAgICAgICAgICAvLyBEZWVwIGNvbXBhcmUgZWFjaCBtZW1iZXIuXG4gICAgICAgICAgaWYgKCEocmVzdWx0ID0gXy5oYXMoYiwga2V5KSAmJiBlcShhW2tleV0sIGJba2V5XSwgYVN0YWNrLCBiU3RhY2spKSkgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIEVuc3VyZSB0aGF0IGJvdGggb2JqZWN0cyBjb250YWluIHRoZSBzYW1lIG51bWJlciBvZiBwcm9wZXJ0aWVzLlxuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICBmb3IgKGtleSBpbiBiKSB7XG4gICAgICAgICAgaWYgKF8uaGFzKGIsIGtleSkgJiYgIShzaXplLS0pKSBicmVhaztcbiAgICAgICAgfVxuICAgICAgICByZXN1bHQgPSAhc2l6ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gUmVtb3ZlIHRoZSBmaXJzdCBvYmplY3QgZnJvbSB0aGUgc3RhY2sgb2YgdHJhdmVyc2VkIG9iamVjdHMuXG4gICAgYVN0YWNrLnBvcCgpO1xuICAgIGJTdGFjay5wb3AoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuXG4gIC8vIFBlcmZvcm0gYSBkZWVwIGNvbXBhcmlzb24gdG8gY2hlY2sgaWYgdHdvIG9iamVjdHMgYXJlIGVxdWFsLlxuICBfLmlzRXF1YWwgPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgcmV0dXJuIGVxKGEsIGIsIFtdLCBbXSk7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiBhcnJheSwgc3RyaW5nLCBvciBvYmplY3QgZW1wdHk/XG4gIC8vIEFuIFwiZW1wdHlcIiBvYmplY3QgaGFzIG5vIGVudW1lcmFibGUgb3duLXByb3BlcnRpZXMuXG4gIF8uaXNFbXB0eSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHRydWU7XG4gICAgaWYgKF8uaXNBcnJheShvYmopIHx8IF8uaXNTdHJpbmcob2JqKSkgcmV0dXJuIG9iai5sZW5ndGggPT09IDA7XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKF8uaGFzKG9iaiwga2V5KSkgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIC8vIElzIGEgZ2l2ZW4gdmFsdWUgYSBET00gZWxlbWVudD9cbiAgXy5pc0VsZW1lbnQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gISEob2JqICYmIG9iai5ub2RlVHlwZSA9PT0gMSk7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YWx1ZSBhbiBhcnJheT9cbiAgLy8gRGVsZWdhdGVzIHRvIEVDTUE1J3MgbmF0aXZlIEFycmF5LmlzQXJyYXlcbiAgXy5pc0FycmF5ID0gbmF0aXZlSXNBcnJheSB8fCBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH07XG5cbiAgLy8gSXMgYSBnaXZlbiB2YXJpYWJsZSBhbiBvYmplY3Q/XG4gIF8uaXNPYmplY3QgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBPYmplY3Qob2JqKTtcbiAgfTtcblxuICAvLyBBZGQgc29tZSBpc1R5cGUgbWV0aG9kczogaXNBcmd1bWVudHMsIGlzRnVuY3Rpb24sIGlzU3RyaW5nLCBpc051bWJlciwgaXNEYXRlLCBpc1JlZ0V4cC5cbiAgZWFjaChbJ0FyZ3VtZW50cycsICdGdW5jdGlvbicsICdTdHJpbmcnLCAnTnVtYmVyJywgJ0RhdGUnLCAnUmVnRXhwJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBfWydpcycgKyBuYW1lXSA9IGZ1bmN0aW9uKG9iaikge1xuICAgICAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCAnICsgbmFtZSArICddJztcbiAgICB9O1xuICB9KTtcblxuICAvLyBEZWZpbmUgYSBmYWxsYmFjayB2ZXJzaW9uIG9mIHRoZSBtZXRob2QgaW4gYnJvd3NlcnMgKGFoZW0sIElFKSwgd2hlcmVcbiAgLy8gdGhlcmUgaXNuJ3QgYW55IGluc3BlY3RhYmxlIFwiQXJndW1lbnRzXCIgdHlwZS5cbiAgaWYgKCFfLmlzQXJndW1lbnRzKGFyZ3VtZW50cykpIHtcbiAgICBfLmlzQXJndW1lbnRzID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gISEob2JqICYmIF8uaGFzKG9iaiwgJ2NhbGxlZScpKTtcbiAgICB9O1xuICB9XG5cbiAgLy8gT3B0aW1pemUgYGlzRnVuY3Rpb25gIGlmIGFwcHJvcHJpYXRlLlxuICBpZiAodHlwZW9mICgvLi8pICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgXy5pc0Z1bmN0aW9uID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ2Z1bmN0aW9uJztcbiAgICB9O1xuICB9XG5cbiAgLy8gSXMgYSBnaXZlbiBvYmplY3QgYSBmaW5pdGUgbnVtYmVyP1xuICBfLmlzRmluaXRlID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIGlzRmluaXRlKG9iaikgJiYgIWlzTmFOKHBhcnNlRmxvYXQob2JqKSk7XG4gIH07XG5cbiAgLy8gSXMgdGhlIGdpdmVuIHZhbHVlIGBOYU5gPyAoTmFOIGlzIHRoZSBvbmx5IG51bWJlciB3aGljaCBkb2VzIG5vdCBlcXVhbCBpdHNlbGYpLlxuICBfLmlzTmFOID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIF8uaXNOdW1iZXIob2JqKSAmJiBvYmogIT0gK29iajtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGEgYm9vbGVhbj9cbiAgXy5pc0Jvb2xlYW4gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB0cnVlIHx8IG9iaiA9PT0gZmFsc2UgfHwgdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0IEJvb2xlYW5dJztcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhbHVlIGVxdWFsIHRvIG51bGw/XG4gIF8uaXNOdWxsID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIG9iaiA9PT0gbnVsbDtcbiAgfTtcblxuICAvLyBJcyBhIGdpdmVuIHZhcmlhYmxlIHVuZGVmaW5lZD9cbiAgXy5pc1VuZGVmaW5lZCA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHZvaWQgMDtcbiAgfTtcblxuICAvLyBTaG9ydGN1dCBmdW5jdGlvbiBmb3IgY2hlY2tpbmcgaWYgYW4gb2JqZWN0IGhhcyBhIGdpdmVuIHByb3BlcnR5IGRpcmVjdGx5XG4gIC8vIG9uIGl0c2VsZiAoaW4gb3RoZXIgd29yZHMsIG5vdCBvbiBhIHByb3RvdHlwZSkuXG4gIF8uaGFzID0gZnVuY3Rpb24ob2JqLCBrZXkpIHtcbiAgICByZXR1cm4gaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSk7XG4gIH07XG5cbiAgLy8gVXRpbGl0eSBGdW5jdGlvbnNcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS1cblxuICAvLyBSdW4gVW5kZXJzY29yZS5qcyBpbiAqbm9Db25mbGljdCogbW9kZSwgcmV0dXJuaW5nIHRoZSBgX2AgdmFyaWFibGUgdG8gaXRzXG4gIC8vIHByZXZpb3VzIG93bmVyLiBSZXR1cm5zIGEgcmVmZXJlbmNlIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdC5cbiAgXy5ub0NvbmZsaWN0ID0gZnVuY3Rpb24oKSB7XG4gICAgcm9vdC5fID0gcHJldmlvdXNVbmRlcnNjb3JlO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4gIC8vIEtlZXAgdGhlIGlkZW50aXR5IGZ1bmN0aW9uIGFyb3VuZCBmb3IgZGVmYXVsdCBpdGVyYXRvcnMuXG4gIF8uaWRlbnRpdHkgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcblxuICBfLmNvbnN0YW50ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH07XG4gIH07XG5cbiAgXy5wcm9wZXJ0eSA9IGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgIHJldHVybiBvYmpba2V5XTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFJldHVybnMgYSBwcmVkaWNhdGUgZm9yIGNoZWNraW5nIHdoZXRoZXIgYW4gb2JqZWN0IGhhcyBhIGdpdmVuIHNldCBvZiBga2V5OnZhbHVlYCBwYWlycy5cbiAgXy5tYXRjaGVzID0gZnVuY3Rpb24oYXR0cnMpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICBpZiAob2JqID09PSBhdHRycykgcmV0dXJuIHRydWU7IC8vYXZvaWQgY29tcGFyaW5nIGFuIG9iamVjdCB0byBpdHNlbGYuXG4gICAgICBmb3IgKHZhciBrZXkgaW4gYXR0cnMpIHtcbiAgICAgICAgaWYgKGF0dHJzW2tleV0gIT09IG9ialtrZXldKVxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfTtcblxuICAvLyBSdW4gYSBmdW5jdGlvbiAqKm4qKiB0aW1lcy5cbiAgXy50aW1lcyA9IGZ1bmN0aW9uKG4sIGl0ZXJhdG9yLCBjb250ZXh0KSB7XG4gICAgdmFyIGFjY3VtID0gQXJyYXkoTWF0aC5tYXgoMCwgbikpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSBhY2N1bVtpXSA9IGl0ZXJhdG9yLmNhbGwoY29udGV4dCwgaSk7XG4gICAgcmV0dXJuIGFjY3VtO1xuICB9O1xuXG4gIC8vIFJldHVybiBhIHJhbmRvbSBpbnRlZ2VyIGJldHdlZW4gbWluIGFuZCBtYXggKGluY2x1c2l2ZSkuXG4gIF8ucmFuZG9tID0gZnVuY3Rpb24obWluLCBtYXgpIHtcbiAgICBpZiAobWF4ID09IG51bGwpIHtcbiAgICAgIG1heCA9IG1pbjtcbiAgICAgIG1pbiA9IDA7XG4gICAgfVxuICAgIHJldHVybiBtaW4gKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpO1xuICB9O1xuXG4gIC8vIEEgKHBvc3NpYmx5IGZhc3Rlcikgd2F5IHRvIGdldCB0aGUgY3VycmVudCB0aW1lc3RhbXAgYXMgYW4gaW50ZWdlci5cbiAgXy5ub3cgPSBEYXRlLm5vdyB8fCBmdW5jdGlvbigpIHsgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpOyB9O1xuXG4gIC8vIExpc3Qgb2YgSFRNTCBlbnRpdGllcyBmb3IgZXNjYXBpbmcuXG4gIHZhciBlbnRpdHlNYXAgPSB7XG4gICAgZXNjYXBlOiB7XG4gICAgICAnJic6ICcmYW1wOycsXG4gICAgICAnPCc6ICcmbHQ7JyxcbiAgICAgICc+JzogJyZndDsnLFxuICAgICAgJ1wiJzogJyZxdW90OycsXG4gICAgICBcIidcIjogJyYjeDI3OydcbiAgICB9XG4gIH07XG4gIGVudGl0eU1hcC51bmVzY2FwZSA9IF8uaW52ZXJ0KGVudGl0eU1hcC5lc2NhcGUpO1xuXG4gIC8vIFJlZ2V4ZXMgY29udGFpbmluZyB0aGUga2V5cyBhbmQgdmFsdWVzIGxpc3RlZCBpbW1lZGlhdGVseSBhYm92ZS5cbiAgdmFyIGVudGl0eVJlZ2V4ZXMgPSB7XG4gICAgZXNjYXBlOiAgIG5ldyBSZWdFeHAoJ1snICsgXy5rZXlzKGVudGl0eU1hcC5lc2NhcGUpLmpvaW4oJycpICsgJ10nLCAnZycpLFxuICAgIHVuZXNjYXBlOiBuZXcgUmVnRXhwKCcoJyArIF8ua2V5cyhlbnRpdHlNYXAudW5lc2NhcGUpLmpvaW4oJ3wnKSArICcpJywgJ2cnKVxuICB9O1xuXG4gIC8vIEZ1bmN0aW9ucyBmb3IgZXNjYXBpbmcgYW5kIHVuZXNjYXBpbmcgc3RyaW5ncyB0by9mcm9tIEhUTUwgaW50ZXJwb2xhdGlvbi5cbiAgXy5lYWNoKFsnZXNjYXBlJywgJ3VuZXNjYXBlJ10sIGZ1bmN0aW9uKG1ldGhvZCkge1xuICAgIF9bbWV0aG9kXSA9IGZ1bmN0aW9uKHN0cmluZykge1xuICAgICAgaWYgKHN0cmluZyA9PSBudWxsKSByZXR1cm4gJyc7XG4gICAgICByZXR1cm4gKCcnICsgc3RyaW5nKS5yZXBsYWNlKGVudGl0eVJlZ2V4ZXNbbWV0aG9kXSwgZnVuY3Rpb24obWF0Y2gpIHtcbiAgICAgICAgcmV0dXJuIGVudGl0eU1hcFttZXRob2RdW21hdGNoXTtcbiAgICAgIH0pO1xuICAgIH07XG4gIH0pO1xuXG4gIC8vIElmIHRoZSB2YWx1ZSBvZiB0aGUgbmFtZWQgYHByb3BlcnR5YCBpcyBhIGZ1bmN0aW9uIHRoZW4gaW52b2tlIGl0IHdpdGggdGhlXG4gIC8vIGBvYmplY3RgIGFzIGNvbnRleHQ7IG90aGVyd2lzZSwgcmV0dXJuIGl0LlxuICBfLnJlc3VsdCA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHtcbiAgICBpZiAob2JqZWN0ID09IG51bGwpIHJldHVybiB2b2lkIDA7XG4gICAgdmFyIHZhbHVlID0gb2JqZWN0W3Byb3BlcnR5XTtcbiAgICByZXR1cm4gXy5pc0Z1bmN0aW9uKHZhbHVlKSA/IHZhbHVlLmNhbGwob2JqZWN0KSA6IHZhbHVlO1xuICB9O1xuXG4gIC8vIEFkZCB5b3VyIG93biBjdXN0b20gZnVuY3Rpb25zIHRvIHRoZSBVbmRlcnNjb3JlIG9iamVjdC5cbiAgXy5taXhpbiA9IGZ1bmN0aW9uKG9iaikge1xuICAgIGVhY2goXy5mdW5jdGlvbnMob2JqKSwgZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGZ1bmMgPSBfW25hbWVdID0gb2JqW25hbWVdO1xuICAgICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbdGhpcy5fd3JhcHBlZF07XG4gICAgICAgIHB1c2guYXBwbHkoYXJncywgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdC5jYWxsKHRoaXMsIGZ1bmMuYXBwbHkoXywgYXJncykpO1xuICAgICAgfTtcbiAgICB9KTtcbiAgfTtcblxuICAvLyBHZW5lcmF0ZSBhIHVuaXF1ZSBpbnRlZ2VyIGlkICh1bmlxdWUgd2l0aGluIHRoZSBlbnRpcmUgY2xpZW50IHNlc3Npb24pLlxuICAvLyBVc2VmdWwgZm9yIHRlbXBvcmFyeSBET00gaWRzLlxuICB2YXIgaWRDb3VudGVyID0gMDtcbiAgXy51bmlxdWVJZCA9IGZ1bmN0aW9uKHByZWZpeCkge1xuICAgIHZhciBpZCA9ICsraWRDb3VudGVyICsgJyc7XG4gICAgcmV0dXJuIHByZWZpeCA/IHByZWZpeCArIGlkIDogaWQ7XG4gIH07XG5cbiAgLy8gQnkgZGVmYXVsdCwgVW5kZXJzY29yZSB1c2VzIEVSQi1zdHlsZSB0ZW1wbGF0ZSBkZWxpbWl0ZXJzLCBjaGFuZ2UgdGhlXG4gIC8vIGZvbGxvd2luZyB0ZW1wbGF0ZSBzZXR0aW5ncyB0byB1c2UgYWx0ZXJuYXRpdmUgZGVsaW1pdGVycy5cbiAgXy50ZW1wbGF0ZVNldHRpbmdzID0ge1xuICAgIGV2YWx1YXRlICAgIDogLzwlKFtcXHNcXFNdKz8pJT4vZyxcbiAgICBpbnRlcnBvbGF0ZSA6IC88JT0oW1xcc1xcU10rPyklPi9nLFxuICAgIGVzY2FwZSAgICAgIDogLzwlLShbXFxzXFxTXSs/KSU+L2dcbiAgfTtcblxuICAvLyBXaGVuIGN1c3RvbWl6aW5nIGB0ZW1wbGF0ZVNldHRpbmdzYCwgaWYgeW91IGRvbid0IHdhbnQgdG8gZGVmaW5lIGFuXG4gIC8vIGludGVycG9sYXRpb24sIGV2YWx1YXRpb24gb3IgZXNjYXBpbmcgcmVnZXgsIHdlIG5lZWQgb25lIHRoYXQgaXNcbiAgLy8gZ3VhcmFudGVlZCBub3QgdG8gbWF0Y2guXG4gIHZhciBub01hdGNoID0gLyguKV4vO1xuXG4gIC8vIENlcnRhaW4gY2hhcmFjdGVycyBuZWVkIHRvIGJlIGVzY2FwZWQgc28gdGhhdCB0aGV5IGNhbiBiZSBwdXQgaW50byBhXG4gIC8vIHN0cmluZyBsaXRlcmFsLlxuICB2YXIgZXNjYXBlcyA9IHtcbiAgICBcIidcIjogICAgICBcIidcIixcbiAgICAnXFxcXCc6ICAgICAnXFxcXCcsXG4gICAgJ1xccic6ICAgICAncicsXG4gICAgJ1xcbic6ICAgICAnbicsXG4gICAgJ1xcdCc6ICAgICAndCcsXG4gICAgJ1xcdTIwMjgnOiAndTIwMjgnLFxuICAgICdcXHUyMDI5JzogJ3UyMDI5J1xuICB9O1xuXG4gIHZhciBlc2NhcGVyID0gL1xcXFx8J3xcXHJ8XFxufFxcdHxcXHUyMDI4fFxcdTIwMjkvZztcblxuICAvLyBKYXZhU2NyaXB0IG1pY3JvLXRlbXBsYXRpbmcsIHNpbWlsYXIgdG8gSm9obiBSZXNpZydzIGltcGxlbWVudGF0aW9uLlxuICAvLyBVbmRlcnNjb3JlIHRlbXBsYXRpbmcgaGFuZGxlcyBhcmJpdHJhcnkgZGVsaW1pdGVycywgcHJlc2VydmVzIHdoaXRlc3BhY2UsXG4gIC8vIGFuZCBjb3JyZWN0bHkgZXNjYXBlcyBxdW90ZXMgd2l0aGluIGludGVycG9sYXRlZCBjb2RlLlxuICBfLnRlbXBsYXRlID0gZnVuY3Rpb24odGV4dCwgZGF0YSwgc2V0dGluZ3MpIHtcbiAgICB2YXIgcmVuZGVyO1xuICAgIHNldHRpbmdzID0gXy5kZWZhdWx0cyh7fSwgc2V0dGluZ3MsIF8udGVtcGxhdGVTZXR0aW5ncyk7XG5cbiAgICAvLyBDb21iaW5lIGRlbGltaXRlcnMgaW50byBvbmUgcmVndWxhciBleHByZXNzaW9uIHZpYSBhbHRlcm5hdGlvbi5cbiAgICB2YXIgbWF0Y2hlciA9IG5ldyBSZWdFeHAoW1xuICAgICAgKHNldHRpbmdzLmVzY2FwZSB8fCBub01hdGNoKS5zb3VyY2UsXG4gICAgICAoc2V0dGluZ3MuaW50ZXJwb2xhdGUgfHwgbm9NYXRjaCkuc291cmNlLFxuICAgICAgKHNldHRpbmdzLmV2YWx1YXRlIHx8IG5vTWF0Y2gpLnNvdXJjZVxuICAgIF0uam9pbignfCcpICsgJ3wkJywgJ2cnKTtcblxuICAgIC8vIENvbXBpbGUgdGhlIHRlbXBsYXRlIHNvdXJjZSwgZXNjYXBpbmcgc3RyaW5nIGxpdGVyYWxzIGFwcHJvcHJpYXRlbHkuXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICB2YXIgc291cmNlID0gXCJfX3ArPSdcIjtcbiAgICB0ZXh0LnJlcGxhY2UobWF0Y2hlciwgZnVuY3Rpb24obWF0Y2gsIGVzY2FwZSwgaW50ZXJwb2xhdGUsIGV2YWx1YXRlLCBvZmZzZXQpIHtcbiAgICAgIHNvdXJjZSArPSB0ZXh0LnNsaWNlKGluZGV4LCBvZmZzZXQpXG4gICAgICAgIC5yZXBsYWNlKGVzY2FwZXIsIGZ1bmN0aW9uKG1hdGNoKSB7IHJldHVybiAnXFxcXCcgKyBlc2NhcGVzW21hdGNoXTsgfSk7XG5cbiAgICAgIGlmIChlc2NhcGUpIHtcbiAgICAgICAgc291cmNlICs9IFwiJytcXG4oKF9fdD0oXCIgKyBlc2NhcGUgKyBcIikpPT1udWxsPycnOl8uZXNjYXBlKF9fdCkpK1xcbidcIjtcbiAgICAgIH1cbiAgICAgIGlmIChpbnRlcnBvbGF0ZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInK1xcbigoX190PShcIiArIGludGVycG9sYXRlICsgXCIpKT09bnVsbD8nJzpfX3QpK1xcbidcIjtcbiAgICAgIH1cbiAgICAgIGlmIChldmFsdWF0ZSkge1xuICAgICAgICBzb3VyY2UgKz0gXCInO1xcblwiICsgZXZhbHVhdGUgKyBcIlxcbl9fcCs9J1wiO1xuICAgICAgfVxuICAgICAgaW5kZXggPSBvZmZzZXQgKyBtYXRjaC5sZW5ndGg7XG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG4gICAgc291cmNlICs9IFwiJztcXG5cIjtcblxuICAgIC8vIElmIGEgdmFyaWFibGUgaXMgbm90IHNwZWNpZmllZCwgcGxhY2UgZGF0YSB2YWx1ZXMgaW4gbG9jYWwgc2NvcGUuXG4gICAgaWYgKCFzZXR0aW5ncy52YXJpYWJsZSkgc291cmNlID0gJ3dpdGgob2JqfHx7fSl7XFxuJyArIHNvdXJjZSArICd9XFxuJztcblxuICAgIHNvdXJjZSA9IFwidmFyIF9fdCxfX3A9JycsX19qPUFycmF5LnByb3RvdHlwZS5qb2luLFwiICtcbiAgICAgIFwicHJpbnQ9ZnVuY3Rpb24oKXtfX3ArPV9fai5jYWxsKGFyZ3VtZW50cywnJyk7fTtcXG5cIiArXG4gICAgICBzb3VyY2UgKyBcInJldHVybiBfX3A7XFxuXCI7XG5cbiAgICB0cnkge1xuICAgICAgcmVuZGVyID0gbmV3IEZ1bmN0aW9uKHNldHRpbmdzLnZhcmlhYmxlIHx8ICdvYmonLCAnXycsIHNvdXJjZSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgZS5zb3VyY2UgPSBzb3VyY2U7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cblxuICAgIGlmIChkYXRhKSByZXR1cm4gcmVuZGVyKGRhdGEsIF8pO1xuICAgIHZhciB0ZW1wbGF0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgIHJldHVybiByZW5kZXIuY2FsbCh0aGlzLCBkYXRhLCBfKTtcbiAgICB9O1xuXG4gICAgLy8gUHJvdmlkZSB0aGUgY29tcGlsZWQgZnVuY3Rpb24gc291cmNlIGFzIGEgY29udmVuaWVuY2UgZm9yIHByZWNvbXBpbGF0aW9uLlxuICAgIHRlbXBsYXRlLnNvdXJjZSA9ICdmdW5jdGlvbignICsgKHNldHRpbmdzLnZhcmlhYmxlIHx8ICdvYmonKSArICcpe1xcbicgKyBzb3VyY2UgKyAnfSc7XG5cbiAgICByZXR1cm4gdGVtcGxhdGU7XG4gIH07XG5cbiAgLy8gQWRkIGEgXCJjaGFpblwiIGZ1bmN0aW9uLCB3aGljaCB3aWxsIGRlbGVnYXRlIHRvIHRoZSB3cmFwcGVyLlxuICBfLmNoYWluID0gZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIF8ob2JqKS5jaGFpbigpO1xuICB9O1xuXG4gIC8vIE9PUFxuICAvLyAtLS0tLS0tLS0tLS0tLS1cbiAgLy8gSWYgVW5kZXJzY29yZSBpcyBjYWxsZWQgYXMgYSBmdW5jdGlvbiwgaXQgcmV0dXJucyBhIHdyYXBwZWQgb2JqZWN0IHRoYXRcbiAgLy8gY2FuIGJlIHVzZWQgT08tc3R5bGUuIFRoaXMgd3JhcHBlciBob2xkcyBhbHRlcmVkIHZlcnNpb25zIG9mIGFsbCB0aGVcbiAgLy8gdW5kZXJzY29yZSBmdW5jdGlvbnMuIFdyYXBwZWQgb2JqZWN0cyBtYXkgYmUgY2hhaW5lZC5cblxuICAvLyBIZWxwZXIgZnVuY3Rpb24gdG8gY29udGludWUgY2hhaW5pbmcgaW50ZXJtZWRpYXRlIHJlc3VsdHMuXG4gIHZhciByZXN1bHQgPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gdGhpcy5fY2hhaW4gPyBfKG9iaikuY2hhaW4oKSA6IG9iajtcbiAgfTtcblxuICAvLyBBZGQgYWxsIG9mIHRoZSBVbmRlcnNjb3JlIGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlciBvYmplY3QuXG4gIF8ubWl4aW4oXyk7XG5cbiAgLy8gQWRkIGFsbCBtdXRhdG9yIEFycmF5IGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlci5cbiAgZWFjaChbJ3BvcCcsICdwdXNoJywgJ3JldmVyc2UnLCAnc2hpZnQnLCAnc29ydCcsICdzcGxpY2UnLCAndW5zaGlmdCddLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIG1ldGhvZCA9IEFycmF5UHJvdG9bbmFtZV07XG4gICAgXy5wcm90b3R5cGVbbmFtZV0gPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBvYmogPSB0aGlzLl93cmFwcGVkO1xuICAgICAgbWV0aG9kLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcbiAgICAgIGlmICgobmFtZSA9PSAnc2hpZnQnIHx8IG5hbWUgPT0gJ3NwbGljZScpICYmIG9iai5sZW5ndGggPT09IDApIGRlbGV0ZSBvYmpbMF07XG4gICAgICByZXR1cm4gcmVzdWx0LmNhbGwodGhpcywgb2JqKTtcbiAgICB9O1xuICB9KTtcblxuICAvLyBBZGQgYWxsIGFjY2Vzc29yIEFycmF5IGZ1bmN0aW9ucyB0byB0aGUgd3JhcHBlci5cbiAgZWFjaChbJ2NvbmNhdCcsICdqb2luJywgJ3NsaWNlJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgbWV0aG9kID0gQXJyYXlQcm90b1tuYW1lXTtcbiAgICBfLnByb3RvdHlwZVtuYW1lXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHJlc3VsdC5jYWxsKHRoaXMsIG1ldGhvZC5hcHBseSh0aGlzLl93cmFwcGVkLCBhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9KTtcblxuICBfLmV4dGVuZChfLnByb3RvdHlwZSwge1xuXG4gICAgLy8gU3RhcnQgY2hhaW5pbmcgYSB3cmFwcGVkIFVuZGVyc2NvcmUgb2JqZWN0LlxuICAgIGNoYWluOiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMuX2NoYWluID0gdHJ1ZTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG5cbiAgICAvLyBFeHRyYWN0cyB0aGUgcmVzdWx0IGZyb20gYSB3cmFwcGVkIGFuZCBjaGFpbmVkIG9iamVjdC5cbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fd3JhcHBlZDtcbiAgICB9XG5cbiAgfSk7XG5cbiAgLy8gQU1EIHJlZ2lzdHJhdGlvbiBoYXBwZW5zIGF0IHRoZSBlbmQgZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBBTUQgbG9hZGVyc1xuICAvLyB0aGF0IG1heSBub3QgZW5mb3JjZSBuZXh0LXR1cm4gc2VtYW50aWNzIG9uIG1vZHVsZXMuIEV2ZW4gdGhvdWdoIGdlbmVyYWxcbiAgLy8gcHJhY3RpY2UgZm9yIEFNRCByZWdpc3RyYXRpb24gaXMgdG8gYmUgYW5vbnltb3VzLCB1bmRlcnNjb3JlIHJlZ2lzdGVyc1xuICAvLyBhcyBhIG5hbWVkIG1vZHVsZSBiZWNhdXNlLCBsaWtlIGpRdWVyeSwgaXQgaXMgYSBiYXNlIGxpYnJhcnkgdGhhdCBpc1xuICAvLyBwb3B1bGFyIGVub3VnaCB0byBiZSBidW5kbGVkIGluIGEgdGhpcmQgcGFydHkgbGliLCBidXQgbm90IGJlIHBhcnQgb2ZcbiAgLy8gYW4gQU1EIGxvYWQgcmVxdWVzdC4gVGhvc2UgY2FzZXMgY291bGQgZ2VuZXJhdGUgYW4gZXJyb3Igd2hlbiBhblxuICAvLyBhbm9ueW1vdXMgZGVmaW5lKCkgaXMgY2FsbGVkIG91dHNpZGUgb2YgYSBsb2FkZXIgcmVxdWVzdC5cbiAgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZSgndW5kZXJzY29yZScsIFtdLCBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBfO1xuICAgIH0pO1xuICB9XG59KS5jYWxsKHRoaXMpO1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHZhciBxdWV1ZSA9IFtdO1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuLy8gTWFyayB0aGF0IGEgbWV0aG9kIHNob3VsZCBub3QgYmUgdXNlZC5cbi8vIFJldHVybnMgYSBtb2RpZmllZCBmdW5jdGlvbiB3aGljaCB3YXJucyBvbmNlIGJ5IGRlZmF1bHQuXG4vLyBJZiAtLW5vLWRlcHJlY2F0aW9uIGlzIHNldCwgdGhlbiBpdCBpcyBhIG5vLW9wLlxuZXhwb3J0cy5kZXByZWNhdGUgPSBmdW5jdGlvbihmbiwgbXNnKSB7XG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmIChpc1VuZGVmaW5lZChnbG9iYWwucHJvY2VzcykpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0Vudmlyb247XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIGlmIChpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKVxuICAgIGRlYnVnRW52aXJvbiA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJyc7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKG5ldyBSZWdFeHAoJ1xcXFxiJyArIHNldCArICdcXFxcYicsICdpJykudGVzdChkZWJ1Z0Vudmlyb24pKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwiL1VzZXJzL3BlZHJvdGVpeGVpcmEvcHJvamVjdHMvdGFzZXItc3F1YWQvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9pbnNlcnQtbW9kdWxlLWdsb2JhbHMvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qc1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pIiwibW9kdWxlLmV4cG9ydHMgPSBoYXNLZXlzXG5cbmZ1bmN0aW9uIGhhc0tleXMoc291cmNlKSB7XG4gICAgcmV0dXJuIHNvdXJjZSAhPT0gbnVsbCAmJlxuICAgICAgICAodHlwZW9mIHNvdXJjZSA9PT0gXCJvYmplY3RcIiB8fFxuICAgICAgICB0eXBlb2Ygc291cmNlID09PSBcImZ1bmN0aW9uXCIpXG59XG4iLCJ2YXIgS2V5cyA9IHJlcXVpcmUoXCJvYmplY3Qta2V5c1wiKVxudmFyIGhhc0tleXMgPSByZXF1aXJlKFwiLi9oYXMta2V5c1wiKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGV4dGVuZFxuXG5mdW5jdGlvbiBleHRlbmQoKSB7XG4gICAgdmFyIHRhcmdldCA9IHt9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldXG5cbiAgICAgICAgaWYgKCFoYXNLZXlzKHNvdXJjZSkpIHtcbiAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cblxuICAgICAgICB2YXIga2V5cyA9IEtleXMoc291cmNlKVxuXG4gICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwga2V5cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgdmFyIG5hbWUgPSBrZXlzW2pdXG4gICAgICAgICAgICB0YXJnZXRbbmFtZV0gPSBzb3VyY2VbbmFtZV1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiIsInZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxudmFyIGlzRnVuY3Rpb24gPSBmdW5jdGlvbiAoZm4pIHtcblx0dmFyIGlzRnVuYyA9ICh0eXBlb2YgZm4gPT09ICdmdW5jdGlvbicgJiYgIShmbiBpbnN0YW5jZW9mIFJlZ0V4cCkpIHx8IHRvU3RyaW5nLmNhbGwoZm4pID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xuXHRpZiAoIWlzRnVuYyAmJiB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykge1xuXHRcdGlzRnVuYyA9IGZuID09PSB3aW5kb3cuc2V0VGltZW91dCB8fCBmbiA9PT0gd2luZG93LmFsZXJ0IHx8IGZuID09PSB3aW5kb3cuY29uZmlybSB8fCBmbiA9PT0gd2luZG93LnByb21wdDtcblx0fVxuXHRyZXR1cm4gaXNGdW5jO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmb3JFYWNoKG9iaiwgZm4pIHtcblx0aWYgKCFpc0Z1bmN0aW9uKGZuKSkge1xuXHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ2l0ZXJhdG9yIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXHR9XG5cdHZhciBpLCBrLFxuXHRcdGlzU3RyaW5nID0gdHlwZW9mIG9iaiA9PT0gJ3N0cmluZycsXG5cdFx0bCA9IG9iai5sZW5ndGgsXG5cdFx0Y29udGV4dCA9IGFyZ3VtZW50cy5sZW5ndGggPiAyID8gYXJndW1lbnRzWzJdIDogbnVsbDtcblx0aWYgKGwgPT09ICtsKSB7XG5cdFx0Zm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuXHRcdFx0aWYgKGNvbnRleHQgPT09IG51bGwpIHtcblx0XHRcdFx0Zm4oaXNTdHJpbmcgPyBvYmouY2hhckF0KGkpIDogb2JqW2ldLCBpLCBvYmopO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Zm4uY2FsbChjb250ZXh0LCBpc1N0cmluZyA/IG9iai5jaGFyQXQoaSkgOiBvYmpbaV0sIGksIG9iaik7XG5cdFx0XHR9XG5cdFx0fVxuXHR9IGVsc2Uge1xuXHRcdGZvciAoayBpbiBvYmopIHtcblx0XHRcdGlmIChoYXNPd24uY2FsbChvYmosIGspKSB7XG5cdFx0XHRcdGlmIChjb250ZXh0ID09PSBudWxsKSB7XG5cdFx0XHRcdFx0Zm4ob2JqW2tdLCBrLCBvYmopO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdGZuLmNhbGwoY29udGV4dCwgb2JqW2tdLCBrLCBvYmopO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59O1xuXG4iLCJtb2R1bGUuZXhwb3J0cyA9IE9iamVjdC5rZXlzIHx8IHJlcXVpcmUoJy4vc2hpbScpO1xuXG4iLCJ2YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQXJndW1lbnRzKHZhbHVlKSB7XG5cdHZhciBzdHIgPSB0b1N0cmluZy5jYWxsKHZhbHVlKTtcblx0dmFyIGlzQXJndW1lbnRzID0gc3RyID09PSAnW29iamVjdCBBcmd1bWVudHNdJztcblx0aWYgKCFpc0FyZ3VtZW50cykge1xuXHRcdGlzQXJndW1lbnRzID0gc3RyICE9PSAnW29iamVjdCBBcnJheV0nXG5cdFx0XHQmJiB2YWx1ZSAhPT0gbnVsbFxuXHRcdFx0JiYgdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0J1xuXHRcdFx0JiYgdHlwZW9mIHZhbHVlLmxlbmd0aCA9PT0gJ251bWJlcidcblx0XHRcdCYmIHZhbHVlLmxlbmd0aCA+PSAwXG5cdFx0XHQmJiB0b1N0cmluZy5jYWxsKHZhbHVlLmNhbGxlZSkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG5cdH1cblx0cmV0dXJuIGlzQXJndW1lbnRzO1xufTtcblxuIiwiKGZ1bmN0aW9uICgpIHtcblx0XCJ1c2Ugc3RyaWN0XCI7XG5cblx0Ly8gbW9kaWZpZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20va3Jpc2tvd2FsL2VzNS1zaGltXG5cdHZhciBoYXMgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LFxuXHRcdHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyxcblx0XHRmb3JFYWNoID0gcmVxdWlyZSgnLi9mb3JlYWNoJyksXG5cdFx0aXNBcmdzID0gcmVxdWlyZSgnLi9pc0FyZ3VtZW50cycpLFxuXHRcdGhhc0RvbnRFbnVtQnVnID0gISh7J3RvU3RyaW5nJzogbnVsbH0pLnByb3BlcnR5SXNFbnVtZXJhYmxlKCd0b1N0cmluZycpLFxuXHRcdGhhc1Byb3RvRW51bUJ1ZyA9IChmdW5jdGlvbiAoKSB7fSkucHJvcGVydHlJc0VudW1lcmFibGUoJ3Byb3RvdHlwZScpLFxuXHRcdGRvbnRFbnVtcyA9IFtcblx0XHRcdFwidG9TdHJpbmdcIixcblx0XHRcdFwidG9Mb2NhbGVTdHJpbmdcIixcblx0XHRcdFwidmFsdWVPZlwiLFxuXHRcdFx0XCJoYXNPd25Qcm9wZXJ0eVwiLFxuXHRcdFx0XCJpc1Byb3RvdHlwZU9mXCIsXG5cdFx0XHRcInByb3BlcnR5SXNFbnVtZXJhYmxlXCIsXG5cdFx0XHRcImNvbnN0cnVjdG9yXCJcblx0XHRdLFxuXHRcdGtleXNTaGltO1xuXG5cdGtleXNTaGltID0gZnVuY3Rpb24ga2V5cyhvYmplY3QpIHtcblx0XHR2YXIgaXNPYmplY3QgPSBvYmplY3QgIT09IG51bGwgJiYgdHlwZW9mIG9iamVjdCA9PT0gJ29iamVjdCcsXG5cdFx0XHRpc0Z1bmN0aW9uID0gdG9TdHJpbmcuY2FsbChvYmplY3QpID09PSAnW29iamVjdCBGdW5jdGlvbl0nLFxuXHRcdFx0aXNBcmd1bWVudHMgPSBpc0FyZ3Mob2JqZWN0KSxcblx0XHRcdHRoZUtleXMgPSBbXTtcblxuXHRcdGlmICghaXNPYmplY3QgJiYgIWlzRnVuY3Rpb24gJiYgIWlzQXJndW1lbnRzKSB7XG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0LmtleXMgY2FsbGVkIG9uIGEgbm9uLW9iamVjdFwiKTtcblx0XHR9XG5cblx0XHRpZiAoaXNBcmd1bWVudHMpIHtcblx0XHRcdGZvckVhY2gob2JqZWN0LCBmdW5jdGlvbiAodmFsdWUpIHtcblx0XHRcdFx0dGhlS2V5cy5wdXNoKHZhbHVlKTtcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR2YXIgbmFtZSxcblx0XHRcdFx0c2tpcFByb3RvID0gaGFzUHJvdG9FbnVtQnVnICYmIGlzRnVuY3Rpb247XG5cblx0XHRcdGZvciAobmFtZSBpbiBvYmplY3QpIHtcblx0XHRcdFx0aWYgKCEoc2tpcFByb3RvICYmIG5hbWUgPT09ICdwcm90b3R5cGUnKSAmJiBoYXMuY2FsbChvYmplY3QsIG5hbWUpKSB7XG5cdFx0XHRcdFx0dGhlS2V5cy5wdXNoKG5hbWUpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKGhhc0RvbnRFbnVtQnVnKSB7XG5cdFx0XHR2YXIgY3RvciA9IG9iamVjdC5jb25zdHJ1Y3Rvcixcblx0XHRcdFx0c2tpcENvbnN0cnVjdG9yID0gY3RvciAmJiBjdG9yLnByb3RvdHlwZSA9PT0gb2JqZWN0O1xuXG5cdFx0XHRmb3JFYWNoKGRvbnRFbnVtcywgZnVuY3Rpb24gKGRvbnRFbnVtKSB7XG5cdFx0XHRcdGlmICghKHNraXBDb25zdHJ1Y3RvciAmJiBkb250RW51bSA9PT0gJ2NvbnN0cnVjdG9yJykgJiYgaGFzLmNhbGwob2JqZWN0LCBkb250RW51bSkpIHtcblx0XHRcdFx0XHR0aGVLZXlzLnB1c2goZG9udEVudW0pO1xuXHRcdFx0XHR9XG5cdFx0XHR9KTtcblx0XHR9XG5cdFx0cmV0dXJuIHRoZUtleXM7XG5cdH07XG5cblx0bW9kdWxlLmV4cG9ydHMgPSBrZXlzU2hpbTtcbn0oKSk7XG5cbiJdfQ==
