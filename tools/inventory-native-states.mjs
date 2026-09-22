import fs from 'node:fs';
import ts from 'typescript';
import {execFileSync} from 'node:child_process';

// Read the pinned dependency's syntax; battle scripts are never executed by this inventory.
const root = 'build/state-inventory';
if(process.argv.includes('--extract') || !fs.existsSync(`${root}/sources.json`)) {
  const version=fs.readFileSync('manifests/dependencies.toml','utf8').match(/^cobblemon\s*=\s*"([^"]+)"/m)?.[1];
  if(!version)throw Error('Pinned Cobblemon version missing');
  execFileSync('python',['-c',String.raw`
from pathlib import Path
import sys,zipfile,io,json
version=sys.argv[1]
jarpath=next((Path('.gradle-user/caches/modules-2/files-2.1/com.cobblemon/neoforge')/version).rglob('neoforge-'+version+'.jar'))
out=Path('build/state-inventory');dest=out/'source';dest.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(jarpath) as jar:
 archive=zipfile.ZipFile(io.BytesIO(jar.read('data/cobblemon/showdown.zip')))
 files=[]
 for folder in ['data','data/mods/cobblemon']:
  for table in ['conditions','moves','abilities','items','scripts']:
   path=f'{folder}/{table}.js'
   if path in archive.namelist():
    file=path.replace('/','__');(dest/file).write_bytes(archive.read(path));files.append({'path':path,'file':file})
 (out/'sources.json').write_text(json.dumps({'version':'Cobblemon '+version,'showdown':json.loads(jar.read('data/cobblemon/showdown.json').decode('utf-8-sig')),'files':files},ensure_ascii=False,indent=2),encoding='utf-8')
 (out/'zh_cn.json').write_text(jar.read('assets/cobblemon/lang/zh_cn.json').decode('utf-8'),encoding='utf-8')
`,version],{windowsHide:true,stdio:'pipe'});
}
const input = JSON.parse(fs.readFileSync(`${root}/sources.json`, 'utf8'));
const tables = {Conditions:new Map(), Moves:new Map(), Abilities:new Map(), Items:new Map()};
const name = node => ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node) ? node.text : node.getText();
const literal = node => node && (ts.isStringLiteral(node) || ts.isNumericLiteral(node)) ? node.text : node?.kind===ts.SyntaxKind.TrueKeyword ? true : null;
const fields = object => new Map(object.properties.map(p=>[name(p.name),p]));
const records=[];
for (const source of input.files) {
  const text=fs.readFileSync(`${root}/source/${source.file}`,'utf8'), ast=ts.createSourceFile(source.path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  function visit(node) {
    if(ts.isVariableDeclaration(node)&&tables[node.name?.text]&&node.initializer&&ts.isObjectLiteralExpression(node.initializer)) {
      const table=tables[node.name.text];
      for(const entry of node.initializer.properties) {
        if(!entry.initializer||!ts.isObjectLiteralExpression(entry.initializer))continue;
        const id=name(entry.name), props=fields(entry.initializer), old=table.get(id);
        const merged=literal(props.get('inherit')?.initializer)===true&&old ? new Map([...old.props,...props]) : props;
        table.set(id,{id,table:node.name.text,props:merged,source:source.path,line:ast.getLineAndCharacterOfPosition(entry.getStart()).line+1,ast});
      }
    }
    ts.forEachChild(node,visit);
  }
  visit(ast);
}
for(const [table,entries] of Object.entries(tables)) for(const entry of entries.values()) {
  const condition=table==='Conditions'?entry.props:entry.props.get('condition')?.initializer;
  if(!condition)continue;
  const props=condition instanceof Map?condition:ts.isObjectLiteralExpression(condition)?fields(condition):null;
  if(!props)continue;
  records.push({id:entry.id,table,source:entry.source,line:entry.line,name:literal(entry.props.get('name')?.initializer)||entry.id,
    declaredType:literal(props.get('effectType')?.initializer)||'Condition',nonstandard:literal(entry.props.get('isNonstandard')?.initializer),hooks:[...props.keys()].filter(k=>/^on[A-Z]/.test(k)),
    duration:literal(props.get('duration')?.initializer),references:[]});
}
const routes=new Map(), unresolved=[];
function add(id,route,entry) {
  if(!id)return;
  id=String(id).toLowerCase().replace(/[^a-z0-9]/g,'');
  const key=`${id}\0${route}`; let row=routes.get(key);
  if(!row){row={id,route,users:[]};routes.set(key,row);}
  if(!row.users.some(u=>u.table===entry.table&&u.id===entry.id))row.users.push({table:entry.table,id:entry.id,source:entry.source,line:entry.line});
}
const members={status:'status',volatileStatus:'volatile',sideCondition:'side',slotCondition:'slot',weather:'weather',terrain:'terrain',pseudoWeather:'field'};
const methods={addVolatile:'volatile',removeVolatile:'volatile',getVolatile:'volatile',setStatus:'status',trySetStatus:'status',addSideCondition:'side',removeSideCondition:'side',addSlotCondition:'slot',removeSlotCondition:'slot',setWeather:'weather',isWeather:'weather',setTerrain:'terrain',addPseudoWeather:'field',removePseudoWeather:'field'};
for(const [table,entries] of Object.entries(tables))for(const entry of entries.values())for(const property of entry.props.values()){
  function visit(node){
    if(ts.isPropertyAssignment(node)&&members[name(node.name)])add(literal(node.initializer),members[name(node.name)],entry);
    if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&methods[node.expression.name.text]){
      const argument=node.arguments[/SlotCondition$/.test(node.expression.name.text)?1:0], id=literal(argument);
      if(id)add(id,methods[node.expression.name.text],entry);
      else unresolved.push({owner:`${table}:${entry.id}`,method:node.expression.name.text,argument:argument?.getText().slice(0,120)||'',source:entry.source});
    }
    if(ts.isPropertyAccessExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='volatiles')add(node.name.text,'volatile',entry);
    if(ts.isElementAccessExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='volatiles')add(literal(node.argumentExpression),'volatile',entry);
    ts.forEachChild(node,visit);
  }
  visit(property);
}
const rank={Conditions:0,Moves:1,Abilities:2,Items:3}, resolved=new Map();
for(const entry of records.sort((a,b)=>rank[a.table]-rank[b.table]))if(!resolved.has(entry.id))resolved.set(entry.id,entry);
for(const row of routes.values()) {
  const entry=resolved.get(row.id); if(entry)entry.references.push(row);
}
const result={source:{version:input.version,showdown:input.showdown},counts:{tables:Object.fromEntries(Object.entries(tables).map(([k,v])=>[k,v.size])),definitions:records.length,uniqueConditions:resolved.size,
  definitionsByOwner:Object.fromEntries(Object.keys(tables).map(k=>[k,records.filter(r=>r.table===k).length])),routes:Object.fromEntries([...new Set([...routes.values()].map(r=>r.route))].sort().map(route=>[route,new Set([...routes.values()].filter(r=>r.route===route).map(r=>r.id)).size]))},
  conditions:[...resolved.values()].sort((a,b)=>a.id.localeCompare(b.id)),references:[...routes.values()],dynamicReferences:unresolved};
result.counts.resolvedDomains=Object.fromEntries(Object.keys(result.counts.routes).map(route=>[route,result.conditions.filter(c=>c.references.some(r=>r.route===route)).length]));
result.referenceOnly=result.references.filter(reference=>!resolved.has(reference.id));
result.counts.unclassified=result.conditions.filter(c=>!c.references.length).length;
fs.writeFileSync(`${root}/inventory.json`,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.counts,null,2));
console.log('By route:',Object.fromEntries(Object.keys(result.counts.routes).map(route=>[route,[...routes.values()].filter(r=>r.route===route).map(r=>r.id).sort().join(', ')])));
console.log('Definitions without literal application references:',result.conditions.filter(c=>!c.references.length).map(c=>c.id).join(', '));
