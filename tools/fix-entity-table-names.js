const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (f.endsWith('.entity.ts')) out.push(p);
  }
  return out;
}

(async () => {
  const conn = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: '', database: 'slns_db' });
  const [tables] = await conn.query('SHOW TABLES');
  const dbTables = new Set(tables.map((r) => Object.values(r)[0]));
  await conn.end();

  const files = [...walk('modules'), ...walk('libs'), ...walk('apps')];
  let changed = 0;
  let skipped = 0;

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const m = src.match(/@Entity\(\s*'([^']+)'\s*\)/);
    if (!m) {
      skipped++;
      continue;
    }
    const declared = m[1];
    const actual = [...dbTables].find((t) => t.toLowerCase() === declared.toLowerCase());
    if (!actual) {
      console.log(`SKIP (no DB table): ${declared} in ${file}`);
      skipped++;
      continue;
    }
    if (declared === actual) continue; // already exact
    const fixed = src.replace(/@Entity\(\s*'[^']+'\s*\)/, `@Entity('${actual}')`);
    fs.writeFileSync(file, fixed);
    console.log(`${declared} -> ${actual}  (${file.split(path.sep).join('/')})`);
    changed++;
  }

  console.log(`\nDone: ${changed} entity table names fixed, ${skipped} skipped.`);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
