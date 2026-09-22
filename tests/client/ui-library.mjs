import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {uiNativeMock,widgets} from './ui-native-mock.mjs';
const native=uiNativeMock({'irrigation.prose':{zh_cn:'以 %1$s 水压持续供水 %2$s。',en_us:'Supply water for %2$s at %1$s pressure.'},'irrigation.pressure':{zh_cn:'出口压力',en_us:'Outlet pressure'}});
const reads=[],requests=[],errors=[];let screen=null,cursor=[240,70];
const host={width:()=>480,height:()=>300,mouseX:()=>cursor[0],mouseY:()=>cursor[1],active:()=>!!screen,
  open:root=>{screen=root;},close:()=>{screen=null;},reset:()=>{screen=null;},hud(){},themed:root=>{root.theme='minecraft';return root;},meshTexture:(_mesh,color)=>{assert.equal(color,color|0);return {};}};
const classes={...native.classes,NativeUiHost:host};
const context=vm.createContext({Java:{loadClass:name=>{reads.push(name);const value=classes[name.slice(name.lastIndexOf('.')+1)];assert(value,name);return value;}},WorldCombatClient:{cleanup(){}}});
for(const file of ['ui-state','ui-surfaces','schema-editor','radial-menu'])vm.runInContext(ts.transpileModule(fs.readFileSync('content/client/library/'+file+'.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES5,module:ts.ModuleKind.None}}).outputText,context);
assert.equal(reads.length,0);
const {UiState,UiSurfaces,SchemaEditor,RadialMenu}=context;
const find=text=>widgets(screen).find(widget=>widget.text===text),click=text=>{assert(find(text),'Missing widget '+text);find(text).click();};
SchemaEditor.field('outlet-routing',field=>{const button=UiSurfaces.button(field.parent,'',field.x,field.y,field.width,24,()=>field.change(field.value()==='north'?'south':'north'));return()=>button.setText('Route '+field.value());});
const gate=new UiState.RevisionGate();let model;
const editor=new SchemaEditor.Editor({change:(tab,field,value)=>gate.begin(()=>requests.push({revision:tab.revision,patch:UiState.patch(field.path,value)})),reset(){},select:id=>{model={...model,selected:id};editor.present(model);},close:host.close});
const bindings={'pressure':{label:{key:'irrigation.pressure'},value:'2.8',unit:' bar',contributions:[{label:'Pump contribution',value:'+0.7 bar'}]},'duration':{label:'Duration',value:'12 s'}};
model={identity:'irrigation:pump',title:'Irrigation planner',selected:'route',tabs:[{id:'route',name:'Outlet',description:{paragraphs:[{key:'irrigation.prose',args:[{binding:'pressure'},{binding:'duration'}]}],bindings},
 fields:[{kind:'outlet-routing',path:['direction'],label:'Direction'},{kind:'number',path:['rate'],label:'Rate',min:.1,max:.8,step:.05,display:{scale:100,suffix:'%'}},
 {kind:'boolean',path:['weather'],label:'Respect weather',group:'ai',groupLabel:{key:'worldcombat.ui.ai_preferences'}}],values:{direction:'north',rate:.3,weather:true},revision:'a'}]};
editor.present(model);assert.equal(screen.theme,'minecraft');assert(widgets(screen).some(widget=>widget.classes.includes('panel_bg')));
let prose=widgets(screen).find(widget=>widget.runs);assert.equal(prose.text,'以 2.8 bar 水压持续供水 12 s。');assert(prose.runs.find(run=>run.text==='2.8').tooltip.includes('Pump contribution'));
assert(!find('全部数值'));const oldScreen=screen;prose.hovered=true;const scroll=widgets(screen).find(widget=>widget.viewContainer);scroll.scrollOffset=89;
bindings.pressure.value='3.1';bindings.pressure.contributions[0].value='+1.0 bar';editor.present(model);
assert.equal(screen,oldScreen);assert(prose.hovered&&prose.text.includes('3.1 bar'));assert.equal(scroll.scrollOffset,89);assert(prose.runs.find(run=>run.text==='3.1').tooltip.includes('+1.0 bar'));
click(native.t('preferences'));assert(find('Route north'));assert(find('30%'));const ai=widgets(screen).find(widget=>widget.text==='Respect weather');assert.equal(widgets(screen).find(widget=>widget.children.includes(ai)).visible,false,'AI group is folded initially');
click('▸ '+native.t('ai_preferences'));assert.equal(widgets(screen).find(widget=>widget.children.includes(ai)).visible,true);
const stable=screen,button=find('Route north');button.hovered=true;button.click();button.click();assert.equal(requests.length,1);assert.deepEqual(JSON.parse(JSON.stringify(requests[0])),{revision:'a',patch:{direction:'south'}});
gate.finish();model.tabs[0].values.direction='south';model.tabs[0].revision='b';editor.present(model);assert.equal(screen,stable);assert.equal(find('Route south'),button);assert(button.hovered);
click('+');assert.equal(requests.at(-1).patch.rate,.35);assert.equal(requests.at(-1).revision,'b');gate.finish();
assert.throws(()=>UiState.patch(['__proto__','x'],1),/Unsafe/);
click(native.t('description'));native.setLocale('en_us');editor.present(model);prose=widgets(screen).find(widget=>widget.runs);assert.equal(prose.text,'Supply water for 12 s at 3.1 bar pressure.');assert(prose.runs.find(run=>run.text==='3.1').tooltip.startsWith('Outlet pressure'));
const tail='No truncation: '+('water '.repeat(700));model.tabs[0].description.paragraphs.push(tail);editor.present(model);assert(prose.text.endsWith(tail));
// More tabs than one row retain useful targets; selecting a later item does not reset its page on refresh.
model={...model,identity:'lots-of-devices',tabs:Array.from({length:19},(_,index)=>({id:'device'+index,name:'Device '+index,fields:[],values:{}})),selected:'device0'};editor.present(model);
assert.equal(widgets(screen).filter(widget=>/^Device /.test(widget.text||'')).length,4);click('›');click('Device 6');assert.equal(model.selected,'device6');const paged=screen;editor.present(model);assert.equal(screen,paged);

let chosen=[];const menu=new RadialMenu.View({id:'irrigation:wheel',title:()=> 'Irrigation',backLabel:()=> 'Mouse 2',choose:item=>{chosen.push(item);host.close();},close:host.close,reject:reason=>errors.push(reason)});
const items=[{id:'pipes',label:'Pipes'},{id:'pipes/outlets',parent:'pipes',label:'Outlets'},{id:'pipes/outlets/place',parent:'pipes/outlets',label:'Place',command:'place'},
 {id:'pipes/outlets/locked',parent:'pipes/outlets',label:'Locked',disabled:'Requires pump'},{id:'survey',label:'Survey',command:'survey'}];
menu.updateItems(items);menu.open();click('Pipes ›');assert.equal(chosen.length,0);menu.release();assert.equal(chosen.length,0);assert.equal(screen,null,'Releasing over an intermediate branch cancels');
menu.open();click('Pipes ›');click('Outlets ›');click('Place');assert.equal(chosen.length,0,'A leaf click never dispatches');menu.release();assert.equal(chosen.length,1);assert.equal(chosen[0].command,'place');menu.release();assert.equal(chosen.length,1);
menu.open();click('Pipes ›');click('Outlets ›');cursor=[240,230];menu.release();assert.equal(errors.at(-1),'Requires pump');assert.equal(chosen.length,1);
cursor=[240,150];menu.open();menu.release();assert.equal(chosen.length,1,'Centre is a real cancellation deadzone');cursor=[240,70];
menu.open();menu.customize();click(native.t('preferences'));click('+');assert.equal(JSON.parse(native.preferences.get('irrigation:wheel')).scale,1.1);
click('›');click('Survey');click(native.t('enabled'));assert(JSON.parse(native.preferences.get('irrigation:wheel')).hidden.includes('survey'));
const projected=UiState.arrangeMenu(items,UiState.menuLayout({favorites:['pipes/outlets/place'],hidden:['survey'],order:['pipes']}));assert(!projected.some(item=>item.id==='survey'));assert(projected.some(item=>item.originalId==='pipes/outlets/place'));
assert.equal(UiState.menuLayout({scale:99,deadZone:-1}).scale,1.3);assert.equal(UiState.menuLayout({scale:99,deadZone:-1}).deadZone,.15);
const fresh=new RadialMenu.View({id:'irrigation:wheel',title:()=> 'Loaded',backLabel:()=> 'Back',choose(){},close:host.close,reject(){}});fresh.updateItems(items);fresh.open();assert(!find('Survey'),'Personal hidden state is restored in a new consumer instance');
// Dense contributed categories page without compressing labels; semantic confirm reaches non-sector buttons.
const pagedMenu=new RadialMenu.View({id:'paged',title:()=> 'Jobs',backLabel:()=> 'Back',choose:item=>{chosen.push(item);host.close();},close:host.close,reject(){}});pagedMenu.updateItems(Array.from({length:19},(_,index)=>({id:'job'+index,label:'Job '+index,command:'job'})));pagedMenu.open();assert.equal(widgets(screen).filter(widget=>/^Job \d/.test(widget.text||'')&&widget.click).length,8);
cursor=[50,15];pagedMenu.confirm();assert(find('Job 8'));cursor=[240,70];pagedMenu.release();assert.equal(chosen.at(-1).id,'job8');
pagedMenu.open();cursor=[400,15];pagedMenu.confirm();assert(widgets(screen).some(widget=>widget.text===native.t('wheel_display')),'Semantic confirm opens the layout control before native mouse dispatch');pagedMenu.release();assert(screen,'G release leaves the explicitly opened layout editor available');cursor=[240,70];
let placements=[];const selection=new UiState.Selection({validate:(_item,aim)=>aim.x<0?'Blocked':'',submit:(_item,aim)=>placements.push(aim),changed(){},reject:reason=>errors.push(reason),continuous:item=>item.repeat});selection.begin({repeat:true});selection.confirm({x:-1});selection.confirm({x:2});selection.confirm({x:4});assert.equal(placements.length,2);assert(selection.current);selection.cancel();assert.equal(selection.current,null);
assert(!reads.some(name=>name.includes('cobblemon')||name.includes('photon')));
native.preferences.set('legacy:wheel',JSON.stringify({scale:1.2,hidden:['survey'],favorites:[],order:[]}));
const migrated=new RadialMenu.View({id:'current:wheel',legacyIds:['legacy:wheel'],title:()=> 'Migrated',backLabel:()=> 'Back',choose(){},close:host.close,reject(){}});
migrated.updateItems(items);assert.equal(JSON.parse(native.preferences.get('current:wheel')).scale,1.2);
native.preferences.set('current:wheel',JSON.stringify({scale:1,hidden:[],favorites:[],order:[]}));migrated.updateItems(items);
assert.equal(JSON.parse(native.preferences.get('current:wheel')).scale,1,'A new explicit layout takes precedence over the old identifier');
console.log('PASS reusable UI: native-theme selection; localized named numeric prose/hover; stable scroll and CAS; folded custom schemas; usable tab pages; held nested wheel/disabled leaves/centre; personal layout persistence; repeated grid selection');

await import('./world-library.mjs');
