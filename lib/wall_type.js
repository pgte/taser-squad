var extend = require('xtend');
var async  = require('async');

module.exports = WallType;

var defaultOptions = {
  images: {
    left: '/sprites/walls/plain/left.png',
    right: '/sprites/walls/plain/right.png'
  },
  traversable: false
}

function WallType(options) {
  var self = {};

  options = extend({}, defaultOptions, options || {});

  self.loaded = false;
  self.images = extend({}, options.images);


  /// methods

  self.load  = load;
  self.image = image;


  return self;
}


function load(cb) {
  var self = this;

  async.each(Object.keys(this.images), loadOne, cb);

  function loadOne(key, cb) {
    var src = self.images[key];

    var im = new Image;

    im.addEventListener('load', function () {
      self.loaded = true;
      self.images[key] = im;
      cb();
    });
    im.addEventListener('error', cb);
    im.src = src;
  }
}


function image(orientation) {
  var img = this.images[orientation];
  if (! img) throw new Error('no image for orientation ' + orientation);
  return img;
}