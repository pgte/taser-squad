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
  self.update = update;
  self.setFor = setFor;
  self.add = add;
  self.remove = remove;
  self.move = move;

  self.init();

  //self.update();

  return self;
}


function init() {
  var order = 0;
  for(var i = 0; i < this.size; i += this.increments, order++) {
    var set = this.grid.group();
    console.log('set:', set);
    set.__index = order;
    this.sets.push(set);
    if (i > 0) {
      var previous = this.sets[order - 1];
      previous.insertAfter(set);
    }
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
  console.log('adding %s to (%d, %d) -> set %d', item.name, item.x, item.y, set.__index);
  set.push(item.element);
  this.update(set);
}

function remove(item) {
  var set = this.setFor(item.x, item.y);
  set.exclude(item.element);
  this.update(set);
}

function move(item, from, to) {
  var originSet = this.setFor(from.x, from.y);
  var targetSet = this.setFor(item.x, item.y);

  if (originSet != targetSet) {
    console.log('%s moving from layer %d to layer %d', item.name, originSet.__index, targetSet.__index);
    originSet.exclude(item.element);
    targetSet.push(item.element);

    // update(originSet);
    this.update(targetSet);
  }

}

function update(set) {
  var self = this;
  this.sets.forEach(function(set, index) {
    var before = self.sets[index - 1];
    if (before) set.insertAfter(before);

    var next = self.sets[index + 1];
    if (next) next.insertAfter(set);
  });
}