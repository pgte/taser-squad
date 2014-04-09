var Snap = require('snapsvg');
var Board = require('./board');
var extend = require('xtend');
var Monitor = require('./monitor');
var Controllers = require('./controllers');

module.exports = Game;

var defaultOptions = {
  width: window.outerWidth,
  height: window.outerHeight,
  board: {
    size: 20,
    zoom: 1
  },
  monitor: {
    width: 200,
    height: window.outerHeight,
  }
};

function Game(element, options) {

  options = extend({}, defaultOptions, options || {});

  var self = {};

  self.options = options;

  self.s = Snap(element);
  self.containers = {};

  var monitorOptions = self.monitorOptions = extend({}, defaultOptions.monitor, options.monitor);
  monitorOptions.height = options.height;

  var boardOptions = self.boardOptions = extend({}, defaultOptions.board, options.board);
  boardOptions.height = options.height;
  boardOptions.width = options.width - monitorOptions.width;

  self.containers.board = self.s.group();

  self.containers.monitor = self.s.group();
  var monitorTransform = new Snap.Matrix()
  monitorTransform.translate(options.width - monitorOptions.width, 0);
  self.containers.monitor.transform(monitorTransform);

  self.board = Board(self.containers.board, boardOptions);
  self.monitor = Monitor(self.containers.monitor, monitorOptions);

  self.controllers = Controllers(self);


  /// Methods

  self.load   = load;
  self.resize = resize;

  return self;
}


/// load

function load(cb) {
  this.board.load(cb);
}


/// resize

function resize(w, h) {
  var boardWidth = w - this.monitorOptions.width;
  this.board.resize(boardWidth, h);
  this.monitor.resize(this.monitorOptions.width, h);

  var monitorTransform = new Snap.Matrix()
  monitorTransform.translate(boardWidth, 0);
  this.containers.monitor.transform(monitorTransform);
}