import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';

const cp=JSON.parse(fs.readFileSync('build/p2-input-launch/client.json','utf8')).classpath;
const out=path.resolve('build/rhino-g-ui');fs.mkdirSync(out,{recursive:true});
const bootstrap=`var Java={loadClass:function(name){var key=name.slice(name.lastIndexOf('.')+1);var types={
  NativeUiHost:Host,CompanionContentClient:Bridge,UIElement:Widget,Label:Widget,Button:Widget,SDFRectTexture:Rect,Component:Component,Tooltips:Tooltips,ArrayList:ArrayList,ClientCallbacks:ClientCallbacks,
  UiText:{component:function(json){return UiText.component(json);},locale:function(){return 'zh_cn';}},UiPreferences:UiPreferences,ScrollerView:Widget,ScrollerMode:{VERTICAL:'vertical'},
  UI:{of:function(value){return value;}},ModularUI:{of:function(value){return value;}},TextWrap:{WRAP:'wrap'},SummaryContentBridge:{listen:function(){}},Minecraft:{getInstance:function(){return {font:{plainSubstrByWidth:function(value){return value;}}};}}
};if(!types[key])throw Error('Unexpected native type '+name);return types[key];}};
var WorldCombatClient={cleanup:function(){},scene:function(){}};
var CompanionWorldUi={select:function(){},target:function(){},explainReason:function(){return '';}};
`;
const sources=['../behavior/contributions','library/ui-state','library/ui-surfaces','library/attribute-view','library/schema-editor','library/radial-menu','adapters/cobblemon-companion-ui','companion-interface'];
const emitted=ts.transpileModule(bootstrap+'\n'+sources.map(id=>fs.readFileSync(`content/client/${id}.ts`,'utf8')).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES5,module:ts.ModuleKind.None}}).outputText;
const script=path.join(out,'g-ui.js');fs.writeFileSync(script,emitted);
const editorScript=path.join(out,'native-editor.js');
const nativeBootstrap=`var nativeTypes={NativeUiHost:NativeEditorHost,UIElement:UIElement,Label:Label,Button:Button,ScrollerView:ScrollerView,ScrollerMode:ScrollerMode,TextWrap:TextWrap,Tooltips:Tooltips,ArrayList:ArrayList,ClientCallbacks:ClientCallbacks,UiPreferences:UiPreferences,RichTextLabel:RichTextLabel,UiText:{component:function(json){return UiText.component(json);},locale:function(){return 'en_us';}},UI:{},ModularUI:{},SDFRectTexture:{},Component:{}};
var Java={loadClass:function(name){var type=nativeTypes[name.slice(name.lastIndexOf('.')+1)];if(!type)throw Error(name);return type;}};`;
const editorScenario=`UiPreferences.write("native:wheel","{}"); var menu=new RadialMenu.View({id:'native:wheel',title:function(){return 'Native';},backLabel:function(){return 'Back';},choose:function(){},close:function(){NativeEditorHost.close();},reject:function(){}});
menu.updateItems([{id:'hold',label:'Hold',command:'hold'}]); menu.customize(); NativeEditorHost.click('+'); if(JSON.parse(UiPreferences.read('native:wheel')).scale!==1.1)throw Error('Native customization change failed');
var changed=0, editor=new SchemaEditor.Editor({change:function(tab,field,value){changed++;tab.values[field.path[0]]=value;editor.present(model);},reset:function(){},select:function(){},close:function(){}});
var model={identity:'native:skill',title:'Native skill',selected:'skill',tabs:[{id:'skill',name:'Skill',description:{paragraphs:['Native prose']},fields:[{path:['power'],label:'Power',kind:'number',min:1,max:9,step:1},{path:['active'],label:'Active',kind:'boolean',group:'ai'}],values:{power:3,active:true}}]};
editor.present(model);NativeEditorHost.click('worldcombat.ui.preferences');if(NativeEditorHost.groupDisplayed('Active'))throw Error('Native AI group did not collapse');NativeEditorHost.click('▸ worldcombat.ui.ai_preferences');if(!NativeEditorHost.groupDisplayed('Active'))throw Error('Native AI group did not expand');NativeEditorHost.click('+');if(changed!==1||model.tabs[0].values.power!==4)throw Error('Native grouped field change failed');NativeEditorHost.click('worldcombat.ui.description');var original=NativeEditorHost.opened;editor.present(model);if(original!==NativeEditorHost.opened)throw Error('Native editor refresh rebuilt widgets');`;
fs.writeFileSync(editorScript,ts.transpileModule(nativeBootstrap+'\n'+['../behavior/contributions','library/ui-state','library/ui-surfaces','library/attribute-view','library/schema-editor','library/radial-menu'].map(id=>fs.readFileSync('content/client/'+id+'.ts','utf8')).join('\n')+'\n'+editorScenario,{compilerOptions:{target:ts.ScriptTarget.ES5,module:ts.ModuleKind.None}}).outputText);
const tooltip=path.join(out,'item-tooltip.js');fs.writeFileSync(tooltip,ts.transpileModule(`var Java={loadClass:function(name){if(name==='dev.worldcombat.core.client.UiText')return UiText;throw Error(name);}};var Platform=ModInventory;var ItemEvents={modifyTooltips:ModifyTooltips};\n`+['content/client/library/ui-surfaces.ts','content/client/library/item-tooltips.ts','content/items/training-compass/values.ts','content/items/training-compass/tooltip.ts'].map(file=>fs.readFileSync(file,'utf8')).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES5,module:ts.ModuleKind.None}}).outputText);
const javaHome=process.env.JAVA_HOME||'C:/Program Files/Zulu/zulu-21';const opts={encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']};
try{
  const embedded=['META-INF/jarjar/taffy-1.1.4.jar','META-INF/jarjar/yoga-1.0.0.jar'];
  execFileSync(path.join(javaHome,'bin/jar.exe'),['xf',path.resolve('build/p5-research/ldlib2-all.jar'),...embedded],{...opts,cwd:out});
  const kubeEmbedded=['META-INF/jarjar/animated-gif-lib-for-java-animated-gif-lib-1.7.jar','META-INF/jarjar/better-advanced-tooltips-2101.1.0-build.1.jar','META-INF/jarjar/tiny-java-server-1.0.0-build.33.jar'];
  execFileSync(path.join(javaHome,'bin/jar.exe'),['xf',path.resolve('build/p0-research/kubejs_jar.jar'),...kubeEmbedded],{...opts,cwd:out});
  const runtimeCp=[out,cp,...embedded.concat(kubeEmbedded).map(file=>path.join(out,file))].join(path.delimiter);
  execFileSync(path.join(javaHome,'bin/javac.exe'),['-proc:none','-encoding','UTF-8','-cp',cp,'-d',out,'mods/world-combat-core/src/main/java/dev/worldcombat/core/client/ClientCallbacks.java','mods/world-combat-core/src/main/java/dev/worldcombat/core/client/ClientPresentation.java','mods/world-combat-core/src/main/java/dev/worldcombat/core/client/ClientFrame.java','mods/world-combat-core/src/main/java/dev/worldcombat/core/client/UiText.java','mods/world-combat-core/src/main/java/dev/worldcombat/core/client/UiPreferences.java','mods/world-combat-core/src/main/java/dev/worldcombat/core/client/RichTextLabel.java','mods/cobblemon-world-combat/src/main/java/dev/worldcombat/cobblemon/mixin/WorldPlayerWheelMixin.java','tests/client/NativeUiContractChecks.java','tests/client/NativeScrollerChecks.java','tests/client/ItemTooltipNativeChecks.java','tests/client/NativeTooltipBootstrap.java','tests/client/RhinoGUiChecks.java'],opts);
  execFileSync(path.join(javaHome,'bin/java.exe'),['-cp',cp+path.delimiter+out,'NativeTooltipBootstrap',out],{...opts,cwd:out});
  process.stdout.write(execFileSync(path.join(javaHome,'bin/java.exe'),['-Djava.awt.headless=true','-cp',runtimeCp,'RhinoGUiChecks',script,tooltip,editorScript],{...opts,cwd:out}));
}catch(error){throw new Error(error.stderr||error.message);}
