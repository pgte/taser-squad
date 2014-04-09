module.exports = text;

function text(text, pos, parent, size) {
  var t = parent.text(pos.x, pos.y, text);
  t.attr('font-family', 'VT323');
  t.attr('font-size', size + 'px');

  return t;
}