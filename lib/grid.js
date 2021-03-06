var Snap = require('snapsvg');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var text = require('./text');

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


/// resize

G.resize = function(w, h) {
  this.size = [w, h];
  this._setView();
};

/// group

G.group = function(parent) {
  var g = this.items.group();
  if (parent) g.insertBefore(parent);
  return g;
};

/// Create Tile

G.createTile = function (t, x, y) {
  var self = this;

  var tile = new EventEmitter;
  tile.x = x;
  tile.y = y;
  tile.type = 'tile';
  tile.element = this.floor.group();
  tile.element.append(t.element());

  var pt = self.toWorld(x, y);
  var matrix = new Snap.Matrix();
  matrix.translate(pt[0], pt[1]);
  tile.element.transform(matrix);
  tile.screenX = pt[0];
  tile.screenY = pt[1];

  self.tiles[x + ',' + y] = tile;

  return tile;
};

G.createTileOld = function (t, x, y) {
  console.log('create tile', x, y);
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

G.createItem = function (image, x, y, group, cb) {
  var self = this;

  var item = new EventEmitter;
  var imagePos = self.imagePos(image, x, y);
  item.element = group.image(
    image.src,
    imagePos.x, imagePos.y,
    image.width, image.height
    );
  item.image = image;
  item.x = x;
  item.y = y;

  var pt = self.toWorld(x, y);
  item.screenX = pt[0];
  item.screenY = pt[1];
  item.imageX = imagePos.x;
  item.imageY = imagePos.y;

  if (typeof cb === 'function') cb(null, item);

  return item;
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