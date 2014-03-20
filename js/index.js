var tilemap = require('tilemap');

var grid = tilemap(window.outerWidth, window.outerHeight);
grid.appendTo(document.body);

for (var x = -10; x < 10; x++) {
  for (var y = -10; y < 10; y++) {
    createTile(x, y);
  }
}

window.addEventListener('resize', function (ev) {
    grid.resize(window.outerWidth, window.outerHeight);
});

function createTile (x, y) {
  var tile = grid.createTile(x, y);
  tile.element.attr('fill', 'rgba(210,210,210,1.0)');
  tile.element.attr('stroke-width', '1');
  tile.element.attr('stroke', 'rgb(255,255,200)');

  tile.on('mouseover', function () {
    tile.element.toFront();
    tile.element.attr('fill', 'rgba(255,127,127,0.8)');
  });

  tile.on('mouseout', function () {
    tile.element.toBack();
    tile.element.attr('fill', 'rgba(210,210,210,1.0)');
  });

  tile.on('mousedown', function () {
    if (grid.itemAt(tile.x, tile.y)) {
      grid.removeItem(tile.x, tile.y);
    }
    else grid.createItem(
      'http://substack.net/projects/datacenter/rack_0.png',
      tile.x, tile.y
    );
});
}