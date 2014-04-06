module.exports = ZIndexes;

function ZIndexes(grid, size) {

  var self = {};

  self.grid = grid;
  self.size = size;
  self.halfSize = size / 2;

  self.increments = 0.25;
  self.multiplyBy = 1 / self.increments;

  if (self.halfSize != Math.round(self.halfSize)) throw new Error('need even dimensions');

  self.sets = [];

  /// methods

  self.init = init;
  self.setFor = setFor;
  self.add = add;
  self.remove = remove;
  self.move = move;

  self.init();

  return self;
}


function init() {
  var order = 0;
  for(var i = 0; i < this.size; i += this.increments, order++) {
    var parent = this.sets[order -1];
    var set = this.grid.group(parent);
    set.__index = order;
    this.sets.push(set);
  }
}

function setFor(x, y) {
  x = x + this.halfSize;
  y = this.size - (y + this.halfSize);

  var setIndex = (((x + y) / 2) * this.multiplyBy);
  return  this.sets[setIndex];
}

function add(item) {
  var set = this.setFor(item.x, item.y);
  // console.log('adding %s to (%d, %d) -> set %d', item.name, item.x, item.y, set.__index);
  set.push(item.element);
}

function remove(item) {
  var set = this.setFor(item.x, item.y);
  set.exclude(item.element);
}

function move(item, from, to) {
  var originSet = this.setFor(from.x, from.y);
  var targetSet = this.setFor(item.x, item.y);

  if (originSet != targetSet) {
    targetSet.add(item.element);
  }

}