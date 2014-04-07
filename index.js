var Game = require('./lib/game');

var window = global;

var container = $('#game');

var options = {
  width: container.width(),
  height: container.height(),
  zoom: 0.5,
  size: 40
};

var game = Game(container[0], options);

/// soldiers

var soldiers = [];

(function() {
  var soldierCount = 5;
  for(var i = 0; i < soldierCount; i ++) {
    var soldier = game.board.characters.create({name: 'soldier ' + i});
    soldiers.push(soldier);
    var place = { x:i * 2, y: -i * 2};
    var placed = game.board.characters.place(soldier, place);
    if (! placed) console.log('Failed to place soldier in ', place);
  }

}());



/// walls

(function() {
  var wallType = game.board.walls.types.create();

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



/// start game


game.load(function(err) {
  if (err) throw err;

  console.log('loaded all');

  var soldierNr = -1;
  var soldier;
  var controller;

  // setInterval(function() {
    if (controller) controller.deactivate();
    soldierNr = (soldierNr + 1) % soldiers.length;
    soldier = soldiers[soldierNr];
    controller = game.controllers.control(soldier);
  // }, 3000);
});

