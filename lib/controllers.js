module.exports = Controllers;

function Controllers(game) {
  var self = {};

  self.game = game;

  self.stack = [];

  self.control = control;

  return self;
}

function control(object) {
  if (! object) throw new Error('no object to control');
  var controllerFn = object.controllerFunction;
  if (! controllerFn) throw new Error('object does not define a controller function');
  var controller = new controllerFn(this.game, object);

  push.call(this, controller);

  return controller;
}

function push(controller) {
  var last = this.stack[this.stack.length - 1];
  if (last) last.deactivate();
  this.stack.push(controller);
  controller.once('stopped', pop.bind(this));
  controller.start();
}

function pop() {
  var controller = this.stack.pop();
  var previous = this.stack[this.stack.length - 1];
  if (previous) push.call(this, previous);
}