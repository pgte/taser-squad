var Snap  = require('snapsvg');

module.exports = Monitor;

function Monitor(element, options) {

  var self = {};

  self.s = Snap(element);
  self.rect = self.s.rect(0, 0, options.width, options.height);


  /// methods

  self.resize = resize;

  return self;
}


function resize(w, h) {
  this.rect.attr('width', w);
  this.rect.attr('height', h);
}