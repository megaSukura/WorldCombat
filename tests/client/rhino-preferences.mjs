import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { loadContentManifest, resolvePackages } from '../../tools/content-manifest.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const javaHome = process.env.JAVA_HOME || 'C:/Program Files/Zulu/zulu-21';
const classpath = JSON.parse(fs.readFileSync(path.join(root, 'build/p2-input-launch/client.json'), 'utf8')).classpath;
const out = path.join(root, 'build/preferences-interop'); fs.mkdirSync(out, { recursive: true });
// Use the production package graph for the channel and its transitive server-library dependencies.
const selected = ['world_combat:companions'];
const manifest = loadContentManifest('content/packs.json', root, null, { units: selected });
const packages = resolvePackages(manifest, selected);
const sources = [...new Set(packages.flatMap(id => manifest.packages[id].sources || []))];
assert(sources.includes('content/mechanisms/native-repertoire.ts'), 'The selected package must provide the preference channel');
const script = `
var channels = Object.create(null);
function registration() {}
var WorldCombat = { on: registration, event: registration, phase: registration, effect: registration, effectHandler: registration, registerAction: registration };
var CobblemonCombat = { registerAction:registration, loadout:registration, growth:registration, capture:registration,
  channel: function(id, callback) { channels[String(id)] = callback; }, moveTemplate: function() { return { maxPp: function(){return 20;} }; } };
${sources.map(source => fs.readFileSync(path.join(root, source), 'utf8')).join('\n')}
var catalogue = NativeRepertoire.create({namespace:"interop"});
function check(value, message) { if (!value) throw new Error(message); }
catalogue.define({ id:'probe', name:'Probe', description:'', uses:[], kind:'friend', range:1, style:'fixture', fields: [
  catalogue.field(['enabled'], 'Enabled', 'boolean'), catalogue.field(['amount'], 'Amount', 'number', {min:.1,max:.5,step:.05}),
  catalogue.field(['mode'], 'Mode', 'choice', {options:[{value:'one',label:'One'},{value:'two',label:'Two'}]})
], defaults:{enabled:true,amount:.3,mode:'one'}, execute:function(){} });
catalogue.installChannel();
var channel = channels['interop:skills'];
check(typeof channel === 'function', 'The production preference channel must register');
var pokemon = { id:function(){return 'owned';}, species:function(){return 'fixture:individual';}, level:function(){return 20;},
  canAccessMove:function(){return true;}, activeState:function(){return 'inactive';}, vehicle:function(){return false;}, passenger:function(){return false;}, moveSlots:function(){return 1;},
  move:function(){return {id:function(){return 'probe';},pp:function(){return 12;},maxPp:function(){return 20;}};} };
var request={pokemon:function(){return pokemon;},input:function(){return nativeRequest.input();},data:function(key){return nativeRequest.data(key);},
 compareData:function(key,expected,value){return nativeRequest.compareData(key,expected,value);},reply:function(value){nativeRequest.reply(value);} };
function send(input) { nativeRequest.input(JSON.stringify(input)); channel(request); return JSON.parse(String(nativeRequest.result())); }
var initial=send({op:'inspect'}), old=initial.skills[0].revision;
check(old == null, 'Initial revision must be absent');
check(initial.skills[0].ppCost === 1, 'Details must use the real native default PP cost');
var changed=send({op:'configure',move:'probe',expected:old,patch:{enabled:false}});
check(!changed.error && changed.skills[0].values.enabled===false, 'First unset preference write failed');
var revision=changed.skills[0].revision;
check(typeof revision==='string', 'Server revision must cross as a plain string');
var second=send({op:'configure',move:'probe',expected:revision,patch:{amount:.35,mode:'two'}});
check(!second.error && second.skills[0].values.amount===.35 && second.skills[0].values.mode==='two', 'Existing native-string revision failed');
check(send({op:'configure',move:'probe',expected:revision,patch:{enabled:true}}).error==='settings-changed', 'Stale CAS overwrote newer preferences');
var reset=send({op:'reset',move:'probe',expected:second.skills[0].revision,path:['enabled']});
check(!reset.error && reset.skills[0].values.enabled===true && reset.skills[0].values.amount===.35, 'Path reset lost other overrides');
var clear=send({op:'reset',move:'probe',expected:reset.skills[0].revision});
check(!clear.error && clear.skills[0].revision==null && clear.skills[0].values.mode==='one', 'Full reset did not restore inheritance');
check(catalogue.preferences.resolve('probe','other',{read:function(){return null;},write:function(){throw new Error('Unexpected write');}}).enabled===true, 'Individual default isolation failed');
`;
const js = path.join(out, 'preferences.js');
fs.writeFileSync(js, ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES5, module: ts.ModuleKind.None, alwaysStrict: true } }).outputText);
const executable = name => path.join(javaHome, 'bin', `${name}.exe`), options = { cwd:root, encoding:'utf8', windowsHide:true, stdio:['ignore','pipe','pipe'] };
try {
  execFileSync(executable('javac'), ['-proc:none','-encoding','UTF-8','-cp',classpath,'-d',out,path.join(root,'tests/client/RhinoPreferencesInterop.java')], options);
  const result = execFileSync(executable('java'), ['-Djava.awt.headless=true','-cp',`${out}${path.delimiter}${classpath}`,'RhinoPreferencesInterop',js], options);
  assert.match(result, /PASS actual Rhino channel/); console.log(result.trim());
} catch(error) { throw new Error(`Native preference interop failed:\n${error.stderr || error.message}`); }
