var text = require('./text');
var extend = require('xtend');
var controllerFunction = require('../controllers/menu');

var defaultOptions = {
  itemHeight: 40,
  fontSize: 40,
  marginLeft: 40,
  marginTop: 20,
  selectBackground: 'rgba(255,0,0,1.0)'
};

module.exports = Menu;

function Menu(container, spec, options, cb) {
  var self = {};

  self.options = extend({}, defaultOptions, options || {});

  self.container = container;
  self.items = spec.options.slice(0);
  self.cb = cb;
  self.item = 0;
  self.drawn = false;

  self.textItems = []

  self.draw = draw;
  self.up = up;
  self.down = down;
  self.select = select;
  self.value = value;

  self.controllerFunction = controllerFunction;

  return self;
}

function draw() {
  this.drawn = true;
  drawSelectBox.call(this);
  this.textItems = this.items.map(drawItem.bind(this));
  console.log('drawn items');
}

function drawSelectBox() {
  var x = this.options.marginLeft;
  var y = Math.round(this.options.marginTop +  + this.options.itemHeight / 4);
  this.selectRectangle = this.container.rect(x, y, 150, this.options.itemHeight);
  this.selectRectangle.attr('fill', this.options.selectBackground);
}

function drawItem(item, index) {
  var pos = {
    x: this.options.marginLeft,
    y: (index + 1) * this.options.itemHeight + this.options.marginTop
  };
  return text(
    item.label.toUpperCase(), pos, this.container, this.options.fontSize);
}

function up() {
  this.item = (this.item - 1 + this.items.length) % this.items.length;
  moveSelectBox.call(this);
  return this.value();
}

function down() {
  this.item = (this.item + 1) % this.items.length;
  moveSelectBox.call(this);
  return this.value();
}

function moveSelectBox() {
  var y = Math.round((1 + this.item) * this.options.marginTop +  + this.options.itemHeight / 4);
  this.selectRectangle.attr('y', y);
}

function value() {
  return this.items[this.item].value;
}

function select() {
  /// Some animation
  if (this.cb) this.cb.call(null, this.value());
}