import fs from 'node:fs';
import path from 'node:path';

/** Merge owned language fragments without making translators edit a global generated dictionary. */
export function localization(units=[],root=process.cwd()) {
  const directories=[];
  const shared=path.join(root,'content/localization');
  if(fs.existsSync(shared))for(const item of fs.readdirSync(shared,{withFileTypes:true}))if(item.isDirectory())directories.push(path.join(shared,item.name));
  for(const unit of units) directories.push(path.join(root,unit,'lang'));
  const output={zh_cn:{},en_us:{}};
  for(const directory of [...new Set(directories)].sort()){
    const fragment={};
    for(const language of Object.keys(output)){
      const file=path.join(directory,language+'.json');if(!fs.existsSync(file))continue;
      fragment[language]=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
      for(const [key,text]of Object.entries(fragment[language])){
        if(typeof text!=='string')throw Error('Translation must be text: '+file+' '+key);
        if(key in output[language]&&output[language][key]!==text)throw Error('Conflicting translation: '+key);
        output[language][key]=text;
      }
    }
    if(Object.keys(fragment).length){const zh=Object.keys(fragment.zh_cn||{}).sort(),en=Object.keys(fragment.en_us||{}).sort();if(JSON.stringify(zh)!==JSON.stringify(en))throw Error('Incomplete bilingual fragment: '+directory);}
  }
  return output;
}
export function buildLocalization(directory,units,root=process.cwd()){
  const folder=path.join(directory,'assets/world_combat_core/lang');fs.mkdirSync(folder,{recursive:true});
  for(const [language,values]of Object.entries(localization(units,root)))fs.writeFileSync(path.join(folder,language+'.json'),JSON.stringify(values,null,2)+'\n');
}
