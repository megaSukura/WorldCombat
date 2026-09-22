import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
const cp=JSON.parse(fs.readFileSync('build/p2-input-launch/client.json','utf8')).classpath,out=path.resolve('build/world-text-pixels');fs.mkdirSync(out,{recursive:true});
const home=process.env.JAVA_HOME||'C:/Program Files/Zulu/zulu-21',binary=name=>path.join(home,'bin',name+'.exe'),options={encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']};
try{
 execFileSync(binary('javac'),['-proc:none','-encoding','UTF-8','-cp',cp,'-d',out,'mods/world-combat-core/src/main/java/dev/worldcombat/core/client/ClientFrame.java','tests/client/WorldTextPixels.java'],options);
 console.log(execFileSync(binary('java'),['-Djava.awt.headless=true','-cp',out+path.delimiter+cp,'dev.worldcombat.core.client.WorldTextPixels',path.resolve('.gradle-user/caches/neoformruntime/assets'),out],{...options,cwd:out}).trim());
}catch(error){throw Error(String(error.stdout||'')+'\n'+String(error.stderr||error));}
