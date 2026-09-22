import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {localization,buildLocalization} from '../../tools/build-localization.mjs';
import {loadContentManifest} from '../../tools/content-manifest.mjs';
const manifest=loadContentManifest(),sources=Object.values(manifest.packages).flatMap(pkg=>pkg.resources||[]),languages=localization(sources);
assert.equal(Object.keys(languages.zh_cn).length,Object.keys(languages.en_us).length);
for(const unit of sources){
 const file=unit+'/lang/en_us.json';if(!fs.existsSync(file))continue;
 const fragment=JSON.parse(fs.readFileSync(file,'utf8'));for(const [key,value]of Object.entries(fragment))assert.equal(languages.en_us[key],value);
}
const directory=path.resolve('build/localization-check');buildLocalization(directory,sources);
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory,'assets/world_combat_core/lang/zh_cn.json'),'utf8')),languages.zh_cn);
// Skill prose belongs to formal move units; archived skills stay out of active resources.
const moveKeys=new Set(sources.filter(unit=>/(^|\/)content\/moves\//.test(unit.replaceAll('\\','/'))).flatMap(unit=>{const file=unit+'/lang/en_us.json';return fs.existsSync(file)?Object.keys(JSON.parse(fs.readFileSync(file,'utf8'))):[];}));
for(const key of Object.keys(languages.en_us))if(key.startsWith('worldcombat.skill.'))assert(moveKeys.has(key),'Skill prose outside content/moves entered active resources: '+key);
for(const [key,value]of Object.entries(languages.zh_cn)){
 const args=text=>[...text.matchAll(/%(\d+)\$s/g)].map(match=>match[1]).sort().join();assert.equal(args(languages.en_us[key]),args(value),'Bilingual argument roles: '+key);
}
console.log('PASS bilingual resource fragments: '+Object.keys(languages.zh_cn).length+' keys, same placeholder roles, selected-unit isolation and emitted resource layout');
await import('./training-compass.mjs');
