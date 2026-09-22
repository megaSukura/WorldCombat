import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root=path.resolve('content/moves'), report=[];
const str=n=>n&&(ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n))?n.text:'';
const prop=(n,key)=>n&&ts.isObjectLiteralExpression(n)?n.properties.find(p=>p.name&&(p.name.text===key))?.initializer:null;
function walk(n,fn){fn(n);ts.forEachChild(n,c=>walk(c,fn));}
for(const id of fs.readdirSync(root)){
 const file=path.join(root,id,'parameters.ts');if(!fs.existsSync(file))continue;
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true), visual=new Set(),paras=[];
 walk(source,n=>{
  if(!ts.isCallExpression(n))return;
  if(n.expression.getText(source).endsWith('actionParameters.define')&&ts.isObjectLiteralExpression(n.arguments[1]))for(const p of n.arguments[1].properties){
   if(!ts.isPropertyAssignment(p))continue;const key=p.name.text,body=p.initializer.getText(source);
   if(/(?:粒子|光点|风点|火星|烟点|光屑|液滴|光环|拖尾|残影).{0,8}(?:数量|个数|点数|密度)|(?:particle|mote|spark).{0,12}(?:count|density)/i.test(body))visual.add(key);
  }
  if(n.expression.getText(source)==='describe'&&ts.isArrayLiteralExpression(n.arguments[1]))for(const p of n.arguments[1].elements){const values=prop(p,'values');if(values&&ts.isArrayLiteralExpression(values))paras.push({key:str(prop(p,'key')),values:values.elements.map(str)});}
 });
 const zhfile=path.join(root,id,'lang/zh_cn.json');if(!fs.existsSync(zhfile))continue;const zh=JSON.parse(fs.readFileSync(zhfile,'utf8'));
 const affected=paras.filter(p=>{const text=zh[`worldcombat.skill.${id}.${p.key}`]||'';return [...text.matchAll(/%(\d+)\$s/g)].some(m=>visual.has(p.values[Number(m[1])-1]));});
 const editorial=Object.entries(zh).filter(([k,v])=>/\.summary$|\.description\.|\.use\./.test(k)&&/本族|读法|设计|发射器|共享|验收|实现了|测试/.test(v));
 if(affected.length||editorial.length)report.push({id,visual:[...visual],paragraphs:affected.map(p=>({...p,text:zh[`worldcombat.skill.${id}.${p.key}`]})),editorial});
}
fs.mkdirSync('build/feedback-audit',{recursive:true});fs.writeFileSync('build/feedback-audit/copy-current.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({moves:report.length,visualParagraphs:report.reduce((n,r)=>n+r.paragraphs.length,0),editorial:report.reduce((n,r)=>n+r.editorial.length,0)},null,2));
for(const r of report.slice(0,12))console.log(r.id,JSON.stringify({visual:r.visual,paragraphs:r.paragraphs,editorial:r.editorial}).slice(0,1100));
