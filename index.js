var Game = require('./lib/game');

var game = Game(document.body);

var soldierCount = 5
var soldiers = [];
for(var i = 0; i < soldierCount; i ++) {
  var soldier = game.board.characters.create();
  soldiers.push(soldier);
  var place = { x:i, y: i};
  var placed = game.board.characters.place(soldier, place);
  if (! placed) console.log('Failed to place soldier in ', place);
}

setInterval(function() {
  soldiers.forEach(function(soldier) {
    soldier.move(-1, -1);
  });
}, 1000);

game.start();