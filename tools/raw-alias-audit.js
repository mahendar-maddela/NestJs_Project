const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (f.endsWith('.ts') && !f.endsWith('.spec.ts')) out.push(p);
  }
  return out;
}

const dirs = ['modules', 'libs', 'apps', 'integrations'];
const files = [];
for (const d of dirs) if (fs.existsSync(d)) walk(d, files);

console.log('=== createQueryBuilder sites with dotted alias selects (.select([\'x.y\']) / .select(\'x.y\')) ===');
let count = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    // select(['alias.col', ...]) or select('alias.col')
    if (/\.select\(\s*\[/.test(line) && /'[a-z_]+\.\w+'/i.test(line)) {
      console.log(`${file.split(path.sep).join('/')}:${i + 1}: ${line.trim().slice(0, 140)}`);
      count++;
    } else if (/\.select\(\s*'[a-z_]+\.\w+'/i.test(line)) {
      console.log(`${file.split(path.sep).join('/')}:${i + 1}: ${line.trim().slice(0, 140)}`);
      count++;
    }
  });
}
console.log('total dotted-alias select sites:', count);
