module.exports = Floor;

function Floor(board) {
  var self = {};

  self.board = board;

  self.load = load;

  return self;
}

function load(map) {
  var self = this;

  if (!Array.isArray(map)) {
    map = map.split('\n');
  }
  if (map.length != this.board.size)
    throw new Error('board size is ' + this.board.size + ' and map is ' + map.length);

  var halfSize = this.board.size / 2;

  map.forEach(addRow);

  function addRow(row, index) {
    var y;
    var x = halfSize - index;
    for(var yy in row) {
      y = halfSize - yy;

      var tileTypeId = row[yy];
      var tileType = self.board.tiles.types.find(tileTypeId);
      if (! tileType) throw new Error('Unknown tile type: ' + tileTypeId);
      self.board.tiles.create(tileType, x, y);
    }
  }
}