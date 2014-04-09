var extend  = require('xtend');
var _       = require('underscore');
var async   = require('async');

var Grid        = require('./grid');
var Tiles       = require('./tiles');
var Characters  = require('./characters');
var Walls       = require('./walls');
var ZIndexes    = require('./z_indexes');

module.exports = Board;

var defaultOptions = {
  width: window.outerWidth,
  height: window.outerHeight,
  size: 20,
  zoom: 1
};

function Board(element, options) {
  var self = {};

  options = extend({}, defaultOptions, options || {});

  /// Methods

  self.load = load;
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


/// load

function load(cb) {
  async.parallel([
    this.characters.load.bind(this.characters),
    this.walls.load.bind(this.walls),
    ], cb);
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
  var newImage = object.image().src;

  if (oldImage != newImage) {
    item.element.attr('href', newImage);
  }
}


/// moveTo

function moveTo(object, x, y, cb) {
  var self = this;

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

    this.grid.moveItem(item, x, y, moved);
    object.x = x;
    object.y = y;

    this.objectsAt(x, y).push(object);
  }
  return move;

  function moved() {
    self.zIndexes.move(object.item, oldPos, item);
    cb();
  }
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