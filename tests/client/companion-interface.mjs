import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {uiNativeMock,widgets} from './ui-native-mock.mjs';
const mock=uiNativeMock({'cobblemon.move.vinewhip':{zh_cn:'藤鞭',en_us:'Vine Whip'},'test.skill.description':{zh_cn:'造成 %1$s 伤害。',en_us:'Deal %1$s damage.'}});
let input,update,reply,screen=null,managed=null,parent=null,hud=null,indicator='',cursor=[240,70],activeSnapshot;const requests=[],commands=[],casts=[],dispatches=[],cleanups={},summary={};
const host={width:()=>480,height:()=>300,mouseX:()=>cursor[0],mouseY:()=>cursor[1],active:()=>!!managed&&screen===managed,themed:root=>{root.theme='minecraft';return root;},
 open:root=>{if(!host.active())parent=screen;screen=managed=root;root.onClose=host.close;},close:()=>{if(host.active())screen=parent;managed=parent=null;},reset:()=>{screen=managed=parent=null;hud=null;},hud:(_id,root)=>{hud=root;},meshTexture:(_json,color)=>{assert.equal(color,color|0);return {};}};
const aim={target:'target',point:{x:2,y:0,z:3}},party=new Map();let blockPick={target:'00000000-0000-0000-0000-000000000000',point:{x:2.5,y:0.5,z:3.5},reason:''};
const bridge={listen:(a,b,c)=>{input=a;update=b;reply=c;},request:(...args)=>{requests.push(args);return requests.length;},look:()=>JSON.stringify(aim),blockAim:()=>JSON.stringify(blockPick),aim:mode=>JSON.stringify({...aim,mode}),cast:(...args)=>casts.push(args),command:(...args)=>commands.push(args),indicator:value=>{indicator=value;},
 dispatch:(key,pokemon,move)=>{dispatches.push({key,pokemon,move});update(JSON.stringify({...activeSnapshot,...party.get(pokemon),pokemon,inspection:true,entityId:-1,skills:undefined}));return input(JSON.stringify({key,move,pressed:true}));}};
const summaryBridge={listen:(accepts,draw,click)=>Object.assign(summary,{accepts,draw,click})};
const classes={...mock.classes,NativeUiHost:host,CompanionContentClient:bridge,SummaryContentBridge:summaryBridge,Minecraft:{getInstance:()=>({font:{plainSubstrByWidth:value=>value,split:value=>({size:()=>1,get:()=>value})}})}};
const scenes=new Map();
const context=vm.createContext({Java:{loadClass:name=>{const type=classes[name.slice(name.lastIndexOf('.')+1)];assert(type,name);return type;}},WorldCombatClient:{scene:(id,_version,draw)=>scenes.set(id,draw),cleanup:(id,handler)=>{cleanups[id]=handler;}},
 CompanionWorldUi:{select(){},target(){},explainReason:key=>key}});
for(const file of ['../behavior/contributions','library/ui-state','library/ui-surfaces','library/attribute-view','library/schema-editor','library/radial-menu','library/indicator-geometry','adapters/cobblemon-companion-ui','companion-interface'])vm.runInContext(ts.transpileModule(fs.readFileSync('content/client/'+file+'.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES5,module:ts.ModuleKind.None}}).outputText,context);
const actor='test:companion';let snapshot={session:'one',epoch:1,pokemon:actor,name:'Partner',entityId:1,stage:'idle',intent:'follow',commandKey:'G',settingsKey:'H',confirmKey:'Mouse 1',backKey:'Mouse 2',precisionKey:'`',skills:[{id:'world_combat:vinewhip',label:'cobblemon.move.vinewhip',remaining:9,maximum:10}],keys:['Z']};activeSnapshot=snapshot;
const send=(key,pressed=true)=>input(JSON.stringify({key,pressed}));const respond=(data,pokemon=snapshot.pokemon)=>reply(JSON.stringify({channel:'world_combat:skills',pokemon,code:'ok',data:JSON.stringify(data)}));
const find=text=>widgets(screen).find(widget=>widget.text===text&&widget.click),click=text=>{assert(find(text),'Missing '+text);find(text).click();};
const menu=[{id:'company',label:'Company'},{id:'company/hold',parent:'company',label:'Wait',command:'hold',target:'none'},
{id:'work',label:'Work',command:'work',target:'point'}, {id:'skills',label:'Skills'},{id:'skills/vine',parent:'skills',label:'Vine'}, {id:'skills/vine/player',parent:'skills/vine',label:'On player',command:'cast',target:'owner',slot:0}, {id:'locked',label:'Locked',disabled:'Needs daylight',command:'cast',target:'self',slot:0}];
// The real production contribution provides only targeting callbacks; missing optional tick/status must leave updates alive.
update(JSON.stringify(snapshot));assert(widgets(hud).some(widget=>widget.text==='[Z] 藤鞭'));respond({skills:[],menu,supportedMoves:['vinewhip','solarbeam','tackle']});
const drawn=[];
scenes.get('world_combat:command')({data:()=>JSON.stringify({position:[2,3,4],data:{geometry:'circle',radius:2,color:0x77BB99}}),ring:(...args)=>drawn.push(args)});
assert.deepEqual(drawn,[[2,3,4,2,0xFF77BB99|0]]);
update(JSON.stringify({...snapshot,name:'Updated partner',skills:[{...snapshot.skills[0],remaining:4}]}));
assert(widgets(hud).some(widget=>String(widget.text).includes('Updated partner')));
send('command');click('Company ›');assert.equal(commands.length,0);click('Wait');assert.equal(commands.length,1,'A leaf click executes immediately');send('command',false);assert.equal(commands.at(-1)[0],'hold');assert.equal(screen,null);
cursor=[240,70];send('command');input(JSON.stringify({key:'command',pressed:false,heldMillis:60}));assert.equal(commands.length,1);assert(screen,'A quick tap keeps the wheel open even above a sector');send('cancel');cursor=[240,70];
send('command');click('Skills ›');click('Vine ›');click('On player');send('command',false);assert.equal(JSON.parse(casts.at(-1)[1]).mode,'player');
// Point selection remains semantic and uses the configured confirmation keys.
const singleWork={skills:[],menu:[menu[2]]};respond(singleWork);send('command');send('command',false);update(JSON.stringify(snapshot));assert(indicator);send('back');assert.equal(indicator,'');send('cancel');
send('command');send('command',false);update(JSON.stringify(snapshot));send('confirm');assert.equal(commands.at(-1)[0],'work');assert.equal(indicator,'');
// A conditional command disappears while choosing a target: do not submit the stale command.
send('command');send('command',false);update(JSON.stringify(snapshot));assert(indicator);const beforeWithdrawal=commands.length,requestsBeforeWithdrawal=requests.length;input(JSON.stringify({key:'invalidate',channel:'world_combat:skills',pokemon:snapshot.pokemon,revision:0}));update(JSON.stringify(snapshot));assert.equal(requests.length,requestsBeforeWithdrawal+1,'Conditional menu invalidation is read while picking in-world');respond({skills:[],menu:[]});assert.equal(indicator,'');assert.equal(send('confirm'),false);assert.equal(commands.length,beforeWithdrawal);respond(singleWork);
// Block commands select the actual cell centre, reject a ray miss, and draw twelve cell edges.
respond({skills:[],menu:[{id:'block-work',label:'Operate block',command:'block-work',target:'block'}]});send('command');click('Operate block');
blockPick.reason='no-surface';update(JSON.stringify(snapshot));assert.equal(indicator,'');const blockedCount=commands.length;send('confirm');assert.equal(commands.length,blockedCount);
blockPick.reason='';update(JSON.stringify(snapshot));const cell=JSON.parse(indicator);assert.deepEqual(cell.position,[2.5,.5,3.5]);assert.equal(cell.data.geometry,'block');
const edges=[];scenes.get('world_combat:command')({data:()=>indicator,line:(...line)=>edges.push(line)});assert.equal(edges.length,12);send('confirm');assert.equal(commands.at(-1)[0],'block-work');assert.equal(JSON.parse(commands.at(-1)[1]).target,blockPick.target);respond(singleWork);
// Rebound modifier combinations and selection instructions come from the live input snapshot.
update(JSON.stringify({...snapshot,castKeys:['Ctrl+7'],precisionHeld:true,previewSlot:0,cancelKey:'P'}));assert(widgets(hud).some(widget=>widget.text==='[Ctrl+7] 藤鞭'));assert(widgets(hud).some(widget=>String(widget.text).includes('P 取消')));update(JSON.stringify(snapshot));
const skill=(id='vinewhip',full=true)=>({id,name:id==='vinewhip'?'藤鞭':id,slot:0,detailsComplete:full,fields:full?[{path:['rescue'],label:'Rescue',kind:'boolean'},{path:['threshold'],kind:'number',label:'AI threshold',group:'ai',min:.1,max:.5,step:.05,display:{scale:100,suffix:'%'}}]:[],values:{rescue:true,threshold:.3},revision:null,
 description:full?{paragraphs:[{key:'test.skill.description',args:[{binding:'damage'}]}],bindings:{damage:{label:'Damage',value:'3.2',contributions:[{label:'Attack contribution',value:'+1.2'}]}}}:undefined});
respond({skills:[skill()],menu});send('settings');respond({skills:[skill()],menu});let prose=widgets(screen).find(widget=>widget.runs);assert.equal(prose.text,'造成 3.2 伤害。');assert(prose.runs.find(run=>run.text==='3.2').tooltip.includes('Attack contribution'));assert(!find('全部数值'));
click(mock.t('preferences'));const editable=find(mock.t('enabled'));editable.hovered=true;editable.click();assert.deepEqual(JSON.parse(requests.at(-1)[2]),{op:'configure',move:'vinewhip',expected:null,patch:{rescue:false}});const count=requests.length;editable.click();assert.equal(requests.length,count);
const changed={...skill(),revision:'v1',values:{rescue:false,threshold:.3}};respond({skills:[changed],menu});assert.equal(find(mock.t('disabled')),editable);assert(editable.hovered);
const stable=screen,scroll=widgets(screen).find(widget=>widget.viewContainer);scroll.offset=32;respond({skills:[{...changed,pp:8}],menu});assert.equal(screen,stable);assert.equal(scroll.offset,32);
click('▸ '+mock.t('ai_preferences'));assert(widgets(screen).some(widget=>widget.text==='30%'));click('+');assert.equal(JSON.parse(requests.at(-1)[2]).patch.threshold,.35);respond({skills:[changed],menu});
// Stale CAS feedback refreshes the correct selected subject without dropping the panel.
click(mock.t('disabled'));respond({error:'settings-changed'});assert(widgets(screen).some(widget=>String(widget.text).includes('偏好已有更新')));assert.equal(JSON.parse(requests.at(-1)[2]).op,'inspect');respond({skills:[changed],menu});
send('cancel');snapshot={...snapshot,pokemon:'empty',skills:[]};update(JSON.stringify(snapshot));respond({skills:[],menu:[{id:'hold',label:'Wait',command:'hold',target:'none'}]});assert.equal(hud,null);send('command');send('command',false);assert.equal(commands.at(-1)[0],'hold');
// Independent capabilities keep the command HUD usable without native move slots.
respond({skills:[],menu:[{id:'checks/work',capability:'checks:work',label:'Independent work',command:'checks-work',target:'none'}]});update(JSON.stringify(snapshot));assert(hud,'An independent capability displays its companion HUD');
send('command');click('Independent work');send('command',false);assert.equal(commands.at(-1)[0],'checks-work');
// M and H pass the same authored prose to the same editor; native Summary remains the parent screen.
snapshot={...snapshot,pokemon:actor,skills:[{id:'world_combat:vinewhip',label:'藤鞭',remaining:9,maximum:10}]};activeSnapshot=snapshot;update(JSON.stringify(snapshot));respond({skills:[skill()],menu,supportedMoves:['vinewhip','solarbeam','tackle']});
const inspected='another',nativeSummary={native:true};party.set(inspected,{name:'Other'});screen=nativeSummary;
assert(summary.accepts(JSON.stringify({pokemon:inspected,moves:['vinewhip'],species:'cobblemon:squirtle'})));assert(!summary.accepts(JSON.stringify({pokemon:'third',moves:['watergun']})));
const region={button:()=>-1,pokemon:()=>inspected,move:()=> 'solarbeam'};assert(summary.click(region));assert.equal(dispatches.at(-1).pokemon,inspected);assert.deepEqual(JSON.parse(requests.at(-1)[2]),{op:'inspect',move:'solarbeam'});
respond({skills:[skill('vinewhip',false)],requested:skill('solarbeam')},inspected);prose=widgets(screen).find(widget=>widget.runs);assert.equal(prose.text,'造成 3.2 伤害。');click(mock.t('return_moves'));assert.equal(screen,nativeSummary);
summary.click(region);respond({skills:[skill('vinewhip',false)],requested:skill('solarbeam')},inspected);screen.onClose();assert.equal(screen,nativeSummary);
update(JSON.stringify(snapshot));send('settings');respond({skills:[skill(),skill('tackle',false)],menu});click('tackle');assert.equal(JSON.parse(requests.at(-1)[2]).move,'tackle');respond({skills:[skill('vinewhip',false),skill('tackle')],menu});send('cancel');send('settings');assert.equal(JSON.parse(requests.at(-1)[2]).move,'tackle');respond({skills:[skill('vinewhip',false),skill('tackle')],menu});
const steady=requests.length;for(let i=0;i<600;i++)update(JSON.stringify(snapshot));assert.equal(requests.length,steady,'No periodic metadata request');
function invalidation(version){input(JSON.stringify({key:'invalidate',pressed:true,pokemon:actor,channel:'world_combat:skills',revision:version}));}
invalidation(1);invalidation(2);update(JSON.stringify(snapshot));assert.equal(requests.length,steady+1);invalidation(3);update(JSON.stringify(snapshot));assert.equal(requests.length,steady+1);respond({skills:[skill('vinewhip',false),skill('tackle')],menu});assert.equal(requests.length,steady+2);respond({skills:[skill('vinewhip',false),skill('tackle')],menu});
send('cancel');const closed=requests.length;invalidation(4);for(let i=0;i<30;i++)update(JSON.stringify(snapshot));assert.equal(requests.length,closed);send('settings');assert.equal(requests.length,closed+1);respond({skills:[skill('vinewhip',false),skill('tackle')],menu});
// Environment declarations are server-owned; matching invalidation refreshes only the selected live view.
respond({skills:[{...skill('tackle'),brief:{key:'worldcombat.ui.ready'},dependencies:['world.environment']}],dependencies:['world.environment'],menu});
const environmentScreen=screen,environmentProse=widgets(screen).find(widget=>widget.runs);environmentProse.hovered=true;invalidation(5);update(JSON.stringify(snapshot));respond({skills:[{...skill('tackle'),brief:{key:'worldcombat.ui.ready'},dependencies:['world.environment']}],dependencies:['world.environment'],menu});assert.equal(screen,environmentScreen);assert(environmentProse.hovered);
// A reply error cannot consume an external change that arrived while the request was running.
invalidation(6);update(JSON.stringify(snapshot));invalidation(7);send('cancel');const failedPending=requests.length;respond({error:'temporary-failure'});update(JSON.stringify(snapshot));assert.equal(requests.length,failedPending);send('settings');assert.equal(requests.length,failedPending+1);respond({skills:[skill('tackle')],menu});
const beforeLocale=requests.length;mock.setLocale('en_us');update(JSON.stringify(snapshot));assert.equal(requests.length,beforeLocale);assert(widgets(screen).some(widget=>widget.runs&&widget.text==='Deal 3.2 damage.'));
// The attribute inspector works without any authored move, keeps widgets on changes and does not poll.
send('cancel');
respond({skills:[],menu:[{id:'attributes',label:'Attributes',command:'attributes'}]});
assert(send('attributes'));
const rows=[{id:'world_combat:skill_haste',label:{key:'worldcombat.attributes.skill_haste'},description:{key:'worldcombat.attributes.skill_haste.help'},group:'combat',format:'number',value:25,sources:[{label:{key:'worldcombat.attributes.source.base'},value:25}]}];
respond({attributes:rows,nature:{key:'cobblemon.nature.timid'}});
assert(widgets(screen).some(widget=>widget.text==='Ability haste'));
const attributeScreen=screen, attributeValue=widgets(screen).find(widget=>widget.text==='25');attributeValue.hovered=true;
const quiet=requests.length;for(let i=0;i<120;i++)update(JSON.stringify(snapshot));assert.equal(requests.length,quiet);
input(JSON.stringify({key:'invalidate',pokemon:actor,channel:'world_combat:skills',revision:25}));update(JSON.stringify(snapshot));
assert.equal(JSON.parse(requests.at(-1)[2]).op,'attributes');respond({attributes:[{...rows[0],value:50}],nature:{key:'cobblemon.nature.timid'}});
assert.equal(screen,attributeScreen);assert(attributeValue.hovered);assert.equal(attributeValue.text,'50');
assert(attributeValue.tooltip.includes('cooldown'));mock.setLocale('zh_cn');update(JSON.stringify(snapshot));assert(widgets(screen).some(widget=>widget.text==='技能急速'));
send('cancel');
Object.values(cleanups).forEach(cleanup=>cleanup());assert.equal(input,null);assert.equal(screen,null);assert.equal(summary.draw,null);
console.log('PASS companion UI: click/held hierarchy, live withdrawn commands, remapped hints, player/point targeting; unsupported loadout management; authored M/H prose; stable CAS/hover/scroll; selected details; no polls; dirty coalescing; locale reload without RPC');
