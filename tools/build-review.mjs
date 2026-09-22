/** Assemble the installed play profile plus its authored scenarios, without changing any move. */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {loadContentManifest, resolvePackages} from './content-manifest.mjs';
const root = path.resolve(import.meta.dirname, '..');
const production = path.join(root, 'build/content/profiles/play');
const output = path.join(root, 'build/review-content');
if (!fs.existsSync(path.join(production, 'p1_demo.js'))) throw Error('Build the play content before preparing review');
const profile = JSON.parse(fs.readFileSync(path.join(production,'content-profile.json'),'utf8'));
const moves = Object.keys(profile.packages).filter(id => id.startsWith('world_combat:move/')).map(id => id.slice('world_combat:move/'.length)).sort();
if (!moves.length) throw Error('The installed play profile has no moves');
const runtime = path.join(root, 'content/smoke/runtime.ts');
const config = ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile);
const options = ts.convertCompilerOptionsFromJson(config.config.compilerOptions,root).options;
const manifest=loadContentManifest('content/packs.json',root);
const shared=resolvePackages(manifest,['world_combat:companion_repertoire']).flatMap(id=>manifest.packages[id].sources||[]);
const check = ts.createProgram(['sdk/core/index.d.ts','sdk/core/world.d.ts','sdk/cobblemon/index.d.ts','sdk/smoke/index.d.ts',...shared, 'content/smoke/runtime.ts'].map(f=>path.join(root,f)),{...options,noEmit:true});
const errors=ts.getPreEmitDiagnostics(check);
if(errors.length) throw Error(ts.formatDiagnosticsWithColorAndContext(errors,{getCurrentDirectory:()=>root,getCanonicalFileName:x=>x,getNewLine:()=>String.fromCharCode(10)}));
function compile(file) {
 const result=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES5,module:ts.ModuleKind.CommonJS},reportDiagnostics:true});
 if(result.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error)) throw Error('Review syntax: '+file);
 return result.outputText;
}
const sources=moves.map(id=>path.join(root,'content/moves',id,'scenario.ts'));
for(const file of sources) if(!fs.existsSync(file)) throw Error('Missing authored scene: '+file);
fs.cpSync(production,output,{recursive:true});
let result=fs.readFileSync(path.join(production,'p1_demo.js'),'utf8').replace(/\/\/# sourceMappingURL=.*$/m,'');
result+='\n// Interactive review: guarded even when this bundle is accidentally installed elsewhere.\nif (Java.loadClass("java.lang.Boolean").getBoolean("worldcombat.review")) {\n';
result+=compile(runtime);
for(const file of sources) result+='\n// '+path.relative(root,file).replaceAll('\\','/')+'\n(function(){\n'+compile(file)+'\n})();\n';
result+='\n}\n//# sourceMappingURL=p1_demo.js.map\n';
fs.writeFileSync(path.join(output,'p1_demo.js'),result);
// Production line positions are preserved; appended scenario failures also report their scene id in review-events.
fs.writeFileSync(path.join(output,'review-catalog.json'),JSON.stringify({schema:1,moves,scenarios:sources.map(f=>path.relative(root,f).replaceAll('\\','/'))},null,2)+'\n');
console.log('Review bundle ready: '+moves.length+' moves and authored scenes; production content unchanged');
