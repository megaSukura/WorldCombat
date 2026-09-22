import fs from 'node:fs';
import path from 'node:path';

/** Final authoring units own datapack JSON alongside their scripts. */
export function buildUnitData(directory,units,root=process.cwd()){
  const target=path.resolve(directory,'data'),build=path.resolve(root,'build');
  if(!target.startsWith(build+path.sep))throw Error('Generated unit data must stay inside build');
  fs.rmSync(target,{recursive:true,force:true});fs.mkdirSync(target,{recursive:true});
  const files=[];
  for(const unit of units){const folder=path.resolve(root,unit,'resources/data');if(!fs.existsSync(folder))continue;
    for(const relative of fs.readdirSync(folder,{recursive:true}).sort()){
      const source=path.join(folder,relative);if(!fs.statSync(source).isFile())continue;
      if(!relative.endsWith('.json'))throw Error('Unit datapack resource must be JSON: '+source);
      const name=relative.replaceAll('\\','/');if(files.includes(name))throw Error('Duplicate unit data resource: '+name);
      JSON.parse(fs.readFileSync(source,'utf8'));files.push(name);
      const output=path.join(target,relative);fs.mkdirSync(path.dirname(output),{recursive:true});fs.copyFileSync(source,output);
    }
  }
  fs.writeFileSync(path.join(directory,'content-data-files.json'),JSON.stringify(files.sort(),null,2)+'\n');
}
