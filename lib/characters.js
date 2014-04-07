var extend = require('xtend');
var async  = require('async');

var Character = require('./character');


module.exports = Characters;

var defaultOptions = {
};

function Characters(board, options) {
  var self = {};

  self.loaded = false;
  self.characters = [];
  self.board = board;
  self.willPlace = [];

  options = extend({}, defaultOptions, options || {});

  self.load   = load;
  self.create = create;
  self.place  = place;

  return self;
}

function create(options) {
  var character = Character(this.board, options);
  this.characters.push(character)
  return character;
}

function load(cb) {
  var self = this;
  if (self.loaded) return cb();
  async.each(this.characters, loadOne, loaded);

  function loadOne(character, cb) {
    character.load(cb);
  }

  function loaded(err) {
    console.log('loaded', err);
    if (err) return cb(err);
    self.loaded = true;
    console.log('will place %d', self.willPlace.length);
    self.willPlace.forEach(function(call) {
      self.place.apply(self, call);
    });
    self.willPlace = [];
    cb();
  }
}

function place(character, options) {
  if (! this.loaded) {
    this.willPlace.push(arguments);
    return;
  }

  console.log('actually placing', character);

  if (! options) options = {};
  if (options.x) character.x = options.x;
  if (options.y) character.y = options.y;
  var placed = this.board.place(character);
  if (placed) {
    this.characters.push(character);
  }
  return placed;
}