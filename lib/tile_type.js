var Snap = require('snapsvg');
var extend = require('xtend');

var defaultOptions = {
  loadTimeout: 5000,
  svgURL: '/tiles/earth_thin.svg'
};

module.exports = TileType;

function TileType(options) {
  var self = {};

  self.options = extend({}, defaultOptions, options || {});

  self.load = load;
  self.element = element;

  return self;
}


/// load

function load(cb) {
  var self = this;

  if (self.svg) return cb();

  Snap.ajax(this.options.svgURL, loaded);

  function loaded(res) {
    if (res.status != 200)
      return cb(new Error('Error loading ' + self.options.svgURL));
    self.svg = res.response;
    cb();
  }
}


/// svg

function element() {
  if (! this.svg)
    throw new Error('not loaded yet');
  return Snap.parse(this.svg);
}