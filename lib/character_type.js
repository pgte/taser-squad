var async = require('async');
var extend = require('xtend');

var defaultOptions = {
  sprites: {
    south: '/sprites/soldier/south.png',
    south_west: '/sprites/soldier/south_west.png',
    west:       '/sprites/soldier/west.png',
    north_west: '/sprites/soldier/north_west.png',
    north:      '/sprites/soldier/north.png',
    north_east: '/sprites/soldier/north_east.png',
    east:       '/sprites/soldier/east.png',
    south_east: '/sprites/soldier/south_east.png'
  },
  sounds: {
    'walk': '/sound/soldier/walk.mp3',
    'turn': '/sound/soldier/turn.mp3',
    'bump': '/sound/soldier/bump.mp3'
  }
};

module.exports = CharacterType;

function CharacterType(options) {
  var self = {};

  options = extend({}, defaultOptions, options || {});

  self.sprites = extend({}, options.sprites);
  self.sounds = extend({}, options.sounds);

  self.loaded = false;

  self.load = load;
  self.copySounds = copySounds;
  self.copySprites = copySprites;

  return self;
}

function load(cb) {
  var self = this;
  if (self.loaded) return cb();

  async.parallel([
    loadSprites,
    loadSounds
    ], loaded);

  function loadSprites(cb) {
    async.each(Object.keys(self.sprites), loadOne, cb);

    function loadOne(spriteKey, cb) {
      var src = self.sprites[spriteKey];

      var im = new Image;

      im.addEventListener('load', function () {
        self.sprites[spriteKey] = im;
        cb();
      });
      im.addEventListener('error', cb);
      im.src = src;
    }
  }

  function loadSounds(cb) {
    async.each(Object.keys(self.sounds), loadOne, cb);

    function loadOne(soundKey, cb) {
      var src = self.sounds[soundKey];

      var au = new Howl({
        urls: [src],
        autoplay: false,
        loop: false,
        onload: onLoad,
        onloaderror: onLoadError
      });

      function onLoad() {
        self.sounds[soundKey] = au;
        cb();
      }

      function onLoadError(err) {
        cb(err);
      }
    }
  }


  function loaded(err) {
    self.loaded = true;
    if (cb) cb();
  }
}

function copySounds() {
  if (! this.loaded) throw new Error('Character type is not loaded yet');
  return this.sounds;
}

function copySprites() {
  if (! this.loaded) throw new Error('Character type is not loaded yet');
  return this.sprites;
}