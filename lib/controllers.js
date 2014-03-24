module.exports = Controllers;

function Controllers() {
  var self = {};

  self.control = control;

  return self;
}

function control(object) {
  var controllerFn = object.controllerFunction;
  if (! controllerFn) throw new Error('object does not define a controller function');
  var controller = new controllerFn(object);
  controller.activate();

  return controller;
}