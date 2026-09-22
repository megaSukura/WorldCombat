import {readFile,mkdir,copyFile,cp,rm,writeFile} from 'node:fs/promises';
import {resolve,dirname,relative,isAbsolute} from 'node:path';

export async function installContentResources(content,game){
  const root=resolve(game,'kubejs/data'),record=resolve(game,'kubejs/.worldcombat-content-data.json');
  const json=async file=>{try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return [];throw error;}};
  const files=await json(resolve(content,'content-data-files.json')),previous=await json(record);
  const target=name=>{const file=resolve(root,name),local=relative(root,file);if(!local||local.startsWith('..')||isAbsolute(local))throw Error('Content resource path escaped kubejs/data');return file;};
  files.concat(previous).forEach(target);
  for(const name of previous)if(!files.includes(name))await rm(target(name),{force:true});
  for(const name of files){const file=target(name);await mkdir(dirname(file),{recursive:true});await copyFile(resolve(content,'data',name),file);}
  await mkdir(dirname(record),{recursive:true});await writeFile(record,JSON.stringify(files,null,2)+'\n');
  const assetRoot=resolve(game,'kubejs/assets'),assetRecord=resolve(game,'kubejs/.worldcombat-content-assets.json');
  const assets=await json(resolve(content,'content-assets-files.json')),oldAssets=await json(assetRecord);
  const assetTarget=name=>{const file=resolve(assetRoot,name),local=relative(assetRoot,file);if(!local||local.startsWith('..')||isAbsolute(local))throw Error('Content asset escaped kubejs/assets');return file;};
  assets.concat(oldAssets).forEach(assetTarget);
  for(const name of oldAssets)if(!assets.includes(name))await rm(assetTarget(name),{force:true});
  if(assets.length){
    for(const name of assets){const file=assetTarget(name);await mkdir(dirname(file),{recursive:true});await copyFile(resolve(content,'assets',name),file);}
    await writeFile(assetRecord,JSON.stringify(assets,null,2)+'\n');
  }else await cp(resolve(content,'assets'),assetRoot,{recursive:true});
}
