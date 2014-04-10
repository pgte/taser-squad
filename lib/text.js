module.exports = text;

function text(text, pos, parent, size) {
  var t = parent.text(pos.x, pos.y, text);
  t.attr('font-family', 'VT323');
  t.attr('font-size', size + 'px');
  t.attr('fill', 'rgba(255,255,255,1.0)');

  return t;
}