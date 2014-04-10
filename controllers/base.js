var EventEmitter = require('events');
var inherits = require('util').inherits;
var keymaster = require('../lib/keymaster');

module.exports = ControllerBase;

function ControllerBase(game) {
  this.game = game;
  this.boundKeys = [];
}

inherits(ControllerBase, EventEmitter);

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

CB.start = function(cb) {
  this.stopCallback = cb;
  this.activate();
};

CB.stop = function() {
  this.deactivate();
  if (this.stopCallback) this.stopCallback.call();
  this.emit('stopped');
};

/// abstract methods

CB.activate = abstract;
CB.deactivate = abstract;


function abstract() {
  throw new Error('controller needs to implement activate');
}

