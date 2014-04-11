var Game = require('./lib/game');

var window = global;

var container = $('#game');

var options = {
  width: container.width(),
  height: container.height(),
  board: {
    zoom: 0.5,
    size: 40
  }
};

var game = Game(container[0], options);

$(function() {
  var $window = $(window);
  $window.on('resize', function() {
    var width = $window.width();
    var height = $window.height();
    container.width(width);
    container.height(height);
    game.resize(width, height);
  });
});


/// tiles

var tileType = game.board.tiles.types.create();
var soldierType = game.board.characters.types.create();
var wallType = game.board.walls.types.create();


/// start game


game.load(function(err) {
  if (err) throw err;

  console.log('loaded all');


  /// tiles

  var halfSize = options.board.size / 2;
  for (var x = -halfSize; x < halfSize; x++) {
    for (var y = -halfSize; y < halfSize; y++) {
      game.board.tiles.create(tileType, x, y);
    }
  }


  /// walls

  (function() {

    var start = {x: -5.5, y: -5.5};
    var end = {x: -5.5, y: 5.5};
    game.board.walls.place(wallType, start, end);


    start = {x: -5.5, y: -5.5};
    end = {x: 5.5, y: -5.5};
    game.board.walls.place(wallType, start, end);

    start = {x: 5.5, y: 5.5};
    end = {x: 5.5, y: -5.5};
    game.board.walls.place(wallType, start, end);

  }());


  /// soldiers

  var soldiers = [];

  (function() {
    var soldierCount = 5;
    for(var i = 0; i < soldierCount; i ++) {
      var soldier = game.board.characters.create(soldierType);
      soldiers.push(soldier);
      var place = { x:i * 2, y: -i * 2};
      var placed = game.board.characters.place(soldier, place);
      if (! placed) console.log('Failed to place soldier in ', place);
    }

  }());



  var soldierNr = -1;
  var soldier;
  var controller;

  // setInterval(function() {
  if (controller) controller.deactivate();
  soldierNr = (soldierNr + 1) % soldiers.length;
  soldier = soldiers[soldierNr];
  controller = game.controllers.control(soldier);
  // }, 3000);

  setTimeout(showMenu, 1000);

});

function showMenu() {
  var menu = game.menus.create({
    options: [
      {
        label: 'Wow',
        value: 'wow'
      },
      {
        label: 'Zaa',
        value: 'zaa'
      },
      {
        label: 'Wagga',
        value: 'wagga'
      },
      {
        label: 'Binga',
        value: 'binga'
      }
    ]}, selectedMenu);

  var controller = game.controllers.control(menu);

  function selectedMenu(item) {
    console.log('selected', item);
    setTimeout(showMenu, 1000);
  }

}