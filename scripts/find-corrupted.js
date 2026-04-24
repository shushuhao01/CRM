const fs = require('fs'), path = require('path');
function walk(d) {
  let r = [];
  try {
    fs.readdirSync(d).forEach(f => {
      let p = path.join(d, f);
      if (fs.statSync(p).isDirectory() && !f.includes('node_modules') && !f.includes('.git') && !f.includes('dist'))
        r.push(...walk(p));
      else if (f.endsWith('.vue') || f.endsWith('.ts'))
        r.push(p);
    });
  } catch(e) {}
  return r;
}

// Pattern: Chinese char followed by ? then / or < (broken tag closing)
// Or Chinese char followed by ? then ) or , or ' (broken string)
const pattern = /[\u4e00-\u9fff]\u00bf\u00bd/;
const pattern2 = /[\u4e00-\u9fff]\ufffd/;

walk('src').forEach(f => {
  const c = fs.readFileSync(f, 'utf8');
  const lines = c.split('\n');
  lines.forEach((line, i) => {
    if (pattern.test(line) || pattern2.test(line)) {
      console.log(f + ':' + (i+1) + ': ' + line.trim().substring(0, 100));
    }
  });
});

