var inherits       = require('util').inherits;
var ControllerBase = require('./base');

module.exports = MenuController;

function MenuController(game, menu) {
  ControllerBase.call(this, game);

  this.menu = menu;
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
};

MC.up = function up() {
  this.option = this.menu.up();
};

MC.down = function down() {
  this.option = this.menu.down();
};

MC.select = function select() {
  this.menu.select();
  if (this.cb) this.cb.call(this.option);
  this.stop();
};