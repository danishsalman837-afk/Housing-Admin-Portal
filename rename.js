const fs = require('fs');
const path = require('path');

const files = fs.readdirSync('api');
files.forEach(f => {
  if(f.endsWith('.js')){
    const p = path.join('api', f);
    let c = fs.readFileSync(p, 'utf8');
    c = c.split('./supabaseClient').join('./_supabaseClient');
    c = c.split('../supabaseClient').join('../_supabaseClient');
    fs.writeFileSync(p, c);
  }
});
fs.renameSync('api/supabaseClient.js', 'api/_supabaseClient.js');
