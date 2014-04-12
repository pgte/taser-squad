var TileTypes = require('./tile_types');

module.exports = Tiles;

function Tiles(grid) {
  var self = {};

  self.types = TileTypes();

  self.grid = grid;

  self.load = load;
  self.create = create;

  return self;
}

function load(cb) {
  this.types.load(cb);
}

function create(type, x, y) {

  var tile = this.grid.createTile(type, x, y);

  tile.on('mouseover', function () {
    // tile.element.toFront();
    tile.element.attr('fill', 'rgba(255,127,127,0.8)');
  });

  tile.on('mouseout', function () {
    // tile.element.toBack();
    tile.element.attr('fill', 'rgba(210,210,210,1.0)');
  });

  return tile;
}

function createOld(x, y) {

  var tile = this.grid.createTileOld(x, y);
  tile.element.attr('fill', 'rgba(210,210,210,1.0)');
  tile.element.attr('stroke-width', '1');
  tile.element.attr('stroke', 'rgb(255,255,200)');

  tile.on('mouseover', function () {
    // tile.element.toFront();
    tile.element.attr('fill', 'rgba(255,127,127,0.8)');
  });

  tile.on('mouseout', function () {
    // tile.element.toBack();
    tile.element.attr('fill', 'rgba(210,210,210,1.0)');
  });

  this.tiles.push(tile);

  return tile;
}