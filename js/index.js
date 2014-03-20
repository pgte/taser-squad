var tilemap = require('tilemap');

var grid = tilemap(window.outerWidth, window.outerHeight);
grid.on('createPoint', onCreatePoint);

var size = 10;

for (var x = -size / 2; x < size / 2; x++) {
  for (var y = -size / 2; y < size / 2; y++) {
    createTile(x, y);
  }
}

grid.appendTo(document.body);

window.addEventListener('resize', function (ev) {
  grid.resize(window.outerWidth, window.outerHeight);
});

var mode = 'tile';

grid.on('keydown', function (ev) {
    if (String.fromCharCode(ev.keyCode) === 'W') {
        if (selectedPoint) {
            var s = selectedPoint;
            selectedPoint = null;
            s.emit('mouseout');
        }
        grid.release(mode);
        mode = { tile : 'point', point : 'tile' }[mode];
    }
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

  // tile.on('mousedown', function () {
  //   if (grid.itemAt(tile.x, tile.y)) {
  //     grid.removeItem(tile.x, tile.y);
  //   }
  //   else grid.createItem(
  //     'http://substack.net/projects/datacenter/rack_0.png',
  //     tile.x, tile.y
  //   );
  // });
}

var selectedPoint = null;
function onCreatePoint (pt) {
    pt.on('mouseover', function () {
        if (mode !== 'point') return;

        if (!selectedPoint
        || selectedPoint.x === pt.x
        || selectedPoint.y === pt.y) {
            pt.element.toFront();
            pt.element.attr('fill', 'rgba(255,0,0,1)');
        }
    });

    pt.on('mouseout', function () {
        if (mode !== 'point') return;

        if (pt !== selectedPoint) {
            pt.element.attr('fill', 'transparent');
        }
    });

    pt.on('mousedown', function () {
        if (mode !== 'point') return;
        if (!selectedPoint) {
            pt.element.attr('fill', 'rgb(0,255,255,1)');
            selectedPoint = pt;
            return;
        }

        var walls = {
            left : 'http://substack.net/projects/datacenter/wall_left.png',
            right : 'http://substack.net/projects/datacenter/wall_right.png'
        };
        var src = selectedPoint.y === pt.y ? walls.right : walls.left;
        grid.createWall(src, selectedPoint, pt);

        selectedPoint.element.attr('fill', 'transparent');
        pt.element.attr('fill', 'transparent');
        selectedPoint = null;
    });
}