var fs = require('fs');
var path = require('path');
var file = path.join(__dirname, '..', 'src', 'views', 'System', 'Settings', 'index.vue');
var c = fs.readFileSync(file, 'utf8');
var lines = c.split('\n');
var out = [];
var i;
for (i = 0; i < lines.length; i++) {
  var l = lines[i].trim();
  if (l.indexOf('const ') === 0 && (l.indexOf('= (') > 0 || l.indexOf('= async (') > 0 || l.indexOf('= async ') > 0)) {
    out.push((i+1) + ': ' + l.substring(0, 90));
  }
}
fs.writeFileSync(path.join(__dirname, 'temp-result.txt'), out.join('\n'), 'utf8');



