var extend = require('xtend');
var async  = require('async');

var Character = require('./character');
var CharacterTypes = require('./character_types');


module.exports = Characters;

var defaultOptions = {
};

function Characters(board, options) {
  var self = {};

  self.types = CharacterTypes();

  self.characters = [];
  self.board = board;

  options = extend({}, defaultOptions, options || {});

  self.load   = load;
  self.create = create;
  self.place  = place;

  return self;
}

function create(type, options) {
  var character = Character(this.board, type, options);
  this.characters.push(character)
  return character;
}

function load(cb) {
  this.types.load(cb);
}

function place(character, options) {
  if (! options) options = {};
  if (options.x) character.x = options.x;
  if (options.y) character.y = options.y;
  var placed = this.board.place(character);
  if (placed) {
    this.characters.push(character);
  }
  return placed;
}