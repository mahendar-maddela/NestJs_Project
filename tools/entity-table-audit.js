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
  const files = [...walk('modules'), ...walk('libs'), ...walk('apps')];
  const mismatches = [];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const m = src.match(/@Entity\(\s*'([^']+)'\s*\)/);
    if (m) {
      const declared = m[1];
      if (!dbTables.has(declared)) {
        const actual = [...dbTables].filter((t) => t.toLowerCase() === declared.toLowerCase()).join(',') || 'NOT FOUND';
        mismatches.push({ file: file.split(path.sep).join('/'), declared, actual });
      }
    }
  }
  console.log('=== MISMATCHED @Entity table names (declared vs actual DB) ===');
  for (const mm of mismatches) console.log(`${mm.declared} -> declared | actual: ${mm.actual} | ${mm.file}`);
  console.log('total mismatches:', mismatches.length);
  await conn.end();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
