var extend = require('xtend');

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

  self.images = options.images;


  /// methods

  self.image = image;


  return self;
}

function image(orientation) {
  var img = this.images[orientation];
  if (! img) throw new Error('no image for orientation ' + orientation);
  return img;
}