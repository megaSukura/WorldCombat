import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {execFileSync} from 'node:child_process';
import {loadContentManifest} from '../../tools/content-manifest.mjs';
import {localization,buildLocalization} from '../../tools/build-localization.mjs';
import {uiNativeMock} from './ui-native-mock.mjs';
import {buildUnitData} from '../../tools/build-unit-data.mjs';
import {installContentResources} from '../../tools/install-content-resources.mjs';
const manifest=loadContentManifest(),ids=[];
function visit(id){if(ids.includes(id))return;Object.keys(manifest.packages[id].requires||{}).forEach(visit);ids.push(id);}
manifest.profiles['training-compass'].forEach(visit);
const server=ids.flatMap(id=>manifest.packages[id].sources||[]),client=ids.flatMap(id=>manifest.packages[id].clientSources||[]);
assert(!server.concat(client).some(file=>file.startsWith('content/skills/')),'Training charm profile loads without any authored skill');
assert(!manifest.packages['world_combat:companions'].sources.some(file=>file.includes('training-compass')),'The companion library does not include a concrete equipment recipe');
const output=path.resolve('build/training-compass-check');fs.mkdirSync(output,{recursive:true});
const config=ts.convertCompilerOptionsFromJson(ts.readConfigFile('tsconfig.json',ts.sys.readFile).config.compilerOptions,process.cwd()).options;
for(const [name,sdk,files]of [['server',['sdk/core/index.d.ts','sdk/core/world.d.ts','sdk/cobblemon/index.d.ts'],server],['client',['sdk/client/index.d.ts'],client]]){
 const program=ts.createProgram([...sdk,...files],{...config,outFile:path.join(output,name+'.js')}),errors=ts.getPreEmitDiagnostics(program);assert.equal(errors.length,0,ts.formatDiagnosticsWithColorAndContext(errors,{getCurrentDirectory:()=>process.cwd(),getCanonicalFileName:value=>value,getNewLine:()=> '\n'}));assert(!program.emit().emitSkipped);
}
buildLocalization(output,['content/items/training-compass']);const language=localization(['content/items/training-compass']);
buildUnitData(output,['content/items/training-compass']);
assert(language.zh_cn['worldcombat.equipment.compass']);assert(language.en_us['curios.identifier.training_charm']);
const itemText=Object.fromEntries(Object.keys(language.zh_cn).map(key=>[key,{zh_cn:language.zh_cn[key],en_us:language.en_us[key]}]));
const code=fs.readFileSync(path.join(output,'client.js'),'utf8');
for(const installed of [false,true]){
 const callbacks=[],mock=uiNativeMock(itemText),nativeReads=[];
 vm.runInNewContext(code,{Java:{loadClass:name=>{nativeReads.push(name);assert.equal(name,'dev.worldcombat.core.client.UiText');return mock.UiText;}},Platform:{isLoaded:id=>installed&&id==='curios'},ItemEvents:{modifyTooltips:callback=>callbacks.push(callback)}});
 assert.equal(callbacks.length,installed?1:0);if(!installed){assert.equal(nativeReads.length,0);continue;}
 for(const [locale,phrase]of [['zh_cn','探索半径 +3 格'],['en_us','+3 blocks']]){mock.setLocale(locale);const lines=[];callbacks[0]({add:(filter,parts)=>lines.push({filter,text:parts.map(part=>part.getString()).join('')})});assert.equal(lines.length,1);assert.equal(lines[0].filter,'minecraft:compass');assert(lines[0].text.includes(phrase));assert(lines[0].text.includes('+4'));}
}
const calls=[];const api=name=>new Proxy({},{get:(_target,method)=>(...args)=>calls.push({name,method,args})});
const serverContext=vm.createContext({WorldCombat:api('core'),CobblemonCombat:api('native')});vm.runInContext(fs.readFileSync(path.join(output,'server.js'),'utf8'),serverContext);
const frame={};serverContext.EquipmentBehavior.apply({equipment:()=>[{provider:()=> 'curios',item:()=> 'minecraft:compass'}]},null,null,frame);assert.equal(serverContext.BehaviorProfiles.value(frame,'explorationRadius',0),3);assert.equal(serverContext.BehaviorProfiles.value(frame,'searchRadius',0),4);
assert(!fs.readFileSync(path.join(output,'server.js'),'utf8').includes('ItemEvents'),'No client tooltip events register on the server');
const noGear={};serverContext.EquipmentBehavior.apply({equipment:()=>[]},null,null,noGear);assert.equal(serverContext.BehaviorProfiles.value(noGear,'explorationRadius',0),0);
const dataFiles=JSON.parse(fs.readFileSync(path.join(output,'content-data-files.json'),'utf8'));assert.equal(dataFiles.length,3);
const expected=['world_combat/curios/slots/training_charm.json','world_combat/curios/entities/training_charm.json','curios/tags/item/training_charm.json'];assert.deepEqual(dataFiles.slice().sort(),expected.slice().sort());
for(const name of expected)assert(!fs.existsSync(path.join('mods/world-combat-core/src/main/resources/data',name)),'Concrete training slot leaked into core resources');
const baseline=path.join(output,'base');buildLocalization(baseline,[]);buildUnitData(baseline,[]);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(baseline,'content-data-files.json'),'utf8')),[]);
assert(!JSON.parse(fs.readFileSync(path.join(baseline,'assets/world_combat_core/lang/en_us.json'),'utf8'))['curios.identifier.training_charm']);
const installers=[['node',async(directory,game)=>installContentResources(directory,game)],['python',async(directory,game)=>execFileSync('python',['-c','import sys;from pathlib import Path;sys.path.insert(0,"tools");from content_resources import install_content_resources;install_content_resources(Path(sys.argv[1]),Path(sys.argv[2]))',directory,game],{windowsHide:true,encoding:'utf8'})]];
for(const [kind,install]of installers){
 const game=path.join(output,'install-'+kind),unrelated=path.join(game,'kubejs/data/other/content.json');fs.mkdirSync(path.dirname(unrelated),{recursive:true});fs.writeFileSync(unrelated,'{}');
 await install(output,game);for(const name of expected)assert(fs.existsSync(path.join(game,'kubejs/data',name)),kind+' missed '+name);
 const installedLang=JSON.parse(fs.readFileSync(path.join(game,'kubejs/assets/world_combat_core/lang/zh_cn.json'),'utf8'));assert(installedLang['curios.identifier.training_charm']);assert(installedLang['worldcombat.equipment.compass']);
 await install(baseline,game);for(const name of expected)assert(!fs.existsSync(path.join(game,'kubejs/data',name)),kind+' left concrete data after selecting base');assert(fs.existsSync(unrelated));
}
console.log('PASS training compass independent profile: emitted client/server roles, optional native tooltip hook, same-source modifiers, bilingual unit resources');
