var Menu = require('./menu');

module.exports = Menus;

function Menus(container) {
  var self = {};

  self.container = container;

  self.create = create;

  return self;
}


/// create

function create(spec, options, cb) {
  if ('function' == typeof options) {
    cb = options;
    options = undefined;
  }
  return Menu(this.container, spec, options, cb);
}