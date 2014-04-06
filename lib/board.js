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

  self.zIndexes = ZIndexes(self.grid, options.size);

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
      this.zIndexes.remove(object);
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

    var oldPos = {
      x: item.x,
      y: item.y
    };

    this.grid.moveItem(item, x, y);
    object.x = x;
    object.y = y;

    this.objectsAt(x, y).push(object);

    this.zIndexes.move(object, oldPos, item);

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


/// createWall

function createWall(image, from, to) {
  var self = this;

  var x = (from.x + to.x) / 2;
  var y = (from.y + to.y) / 2;
  var set = this.zIndexes.setFor(x, y);

  this.grid.createWall(image, from, to, set);

  // function createdItem(err, item) {
  //   // var y = Math.max(from.y, to.y);
  //   // var x = Math.min(from.x, to.x);

  //   var wall = {
  //     item: item,
  //     x: x,
  //     y: y,
  //     name: 'wall at ' + x + ', ' + y
  //   };
  // }
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