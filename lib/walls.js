var _ = require('underscore');
var async = require('async');

var WallTypes = require('./wall_types');

module.exports = Walls;

function Walls(board) {
  var self = {};

  self.loaded = false;
  self.types = WallTypes(self);
  self.walls = {};
  self.willPlace = [];

  self.board = board;

  self.load = load;
  self.place = place;
  self.placeOne = placeOne;
  self.at = at;
  self.traversable = traversable;

  return self;
}


/// load

function load(cb) {
  var self = this;

  if (this.loaded) return cb();

  this.types.load(loaded);

  function loaded(err) {
    if (err) return cb(err);

    self.loaded = true;

    self.willPlace.forEach(function(args) {
      self.place.apply(self, args);
    });
    self.willPlace = [];
    cb();
  }
}


/// place

function place(wallType, from, to) {
  var self = this;

  if (! self.loaded) {
    return self.willPlace.push(arguments);
  }

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