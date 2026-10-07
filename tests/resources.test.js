// Verify release URLs without needing a server or browser.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const version=/<meta name="asset-version" content="([^"]+)">/.exec(html)?.[1];
assert.match(version,/^\d{8}-\d+$/);
const urls=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1]);
assert.equal(urls.filter(u=>u.startsWith('css/')).length,1);
assert.deepEqual(urls.filter(u=>u.startsWith('js/')).map(u=>u.split('?')[0]).sort(),['js/app.js','js/audio.js','js/core.js','js/keyboard.js','js/lessons.js']);
for(const url of urls){
 const [file,query]=url.split('?');assert.equal(query,'v='+version,`Release mismatch: ${url}`);
 assert.ok(fs.existsSync(path.join(root,file)),`Missing resource: ${file}`);
 assert.ok(!file.startsWith('/')&&!file.includes('://'),'Relative offline resource required');
}
console.log('PASS: one release version across CSS, all scripts and static SVGs; all resource paths exist');
