var inherits       = require('util').inherits;
var ControllerBase = require('./base');

module.exports = MenuController;

function MenuController(game, menu) {
  ControllerBase.call(this, game);

  this.menu = menu;

  this.selected = false;
}

inherits(MenuController, ControllerBase);

var MC = MenuController.prototype;


/// activate

MC.activate = function activate() {
  this.key('up', this.up.bind(this));
  this.key('down', this.down.bind(this));
  this.key('space,enter', this.select.bind(this));

  this.menu.draw();
};


MC.deactivate = function deactivate() {
  this.unbindKeys();
  this.menu.clear();
};

MC.up = function up() {
  this.option = this.menu.up();
};

MC.down = function down() {
  this.option = this.menu.down();
};

MC.select = function select() {
  if (this.selected) return;
  this.selected = true;

  var self = this;
  this.menu.select(function() {
    if (self.cb) self.cb.call(self.option);
    self.stop();
  });
};