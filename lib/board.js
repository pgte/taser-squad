var extend  = require('xtend');
var tilemap = require('tilemap');
var _       = require('underscore');

var Tiles       = require('./tiles');
var Characters  = require('./characters');

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
  self.objectsAt = objectsAt;


  /// Init

  self.grid = tilemap(options.width, options.height);
  self.zoom(options.zoom);
  self.tiles = Tiles(self.grid);
  self.characters = Characters(self);

  self.size = options.size;
  self.objects = [];

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

  console.log('PLACE', options);

  var placed = false;
  if (object.collides)
    placed = this.walkable(options.x, options.y);

  if (placed) {
    console.log('PLACED');
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
  var move = this.walkable(x, y);
  if (move) {
    this.remove(object);
    this.place(object, {x: x, y: y});
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


/// zoom

function zoom(level) {
  this.grid.zoom(level);
}


/// Misc

function isWalkable(o) {
  return o.walkable;
}