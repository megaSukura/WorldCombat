import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {uiNativeMock,widgets} from './ui-native-mock.mjs';

const native=uiNativeMock();let screen=null,width=480;
const host={width:()=>width,height:()=>300,active:()=>!!screen,open:root=>{screen=root;},close:()=>{screen=null;},themed:root=>root};
const classes={...native.classes,NativeUiHost:host};
const context=vm.createContext({Java:{loadClass:name=>{const type=classes[name.slice(name.lastIndexOf('.')+1)];assert(type,name);return type;}}});
for(const name of ['ui-state','ui-surfaces','schema-editor','attribute-view'])vm.runInContext(ts.transpileModule(fs.readFileSync(`content/client/library/${name}.ts`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES5,module:ts.ModuleKind.None}}).outputText,context);
const {SchemaEditor,AttributeView,UiSurfaces}=context;
const visible=widget=>widget.visible!==false&&(!widget.parent||visible(widget.parent));
const find=text=>widgets(screen).find(widget=>visible(widget)&&widget.text===text);
const click=text=>{const widget=find(text);assert(widget,`Missing ${text}`);assert(widget.click,`Not a button: ${text}`);widget.click();};
const scroller=()=>widgets(screen).find(widget=>widget.viewContainer);
const changes=[];
let model={identity:'fixture:vent',title:'Field controller',selected:'air',tabs:[{id:'air',name:'Air flow',description:{paragraphs:['Choose when the device operates.']},fields:[
  {kind:'choice',path:['mode'],label:'Operating mode',help:'The selected mode controls when the vent operates.',options:[{label:'Automatic',value:'auto'},{label:'Manual',value:'manual'},{label:'Disabled',value:'off'}]},
  {kind:'number',path:['offset'],label:'Offset',step:.25},
  {kind:'number',path:['limit'],label:'Limit',min:0,max:1,step:.5}
],values:{mode:'auto',offset:2,limit:1}}]};
const editor=new SchemaEditor.Editor({change(tab,field,value){changes.push({path:field.path,value});tab.values[field.path[0]]=value;editor.present(model);},reset(){},select(){},close:host.close});
editor.present(model);scroller().normalized=.64;click(native.t('preferences'));assert.equal(scroller().normalized,0);
scroller().normalized=.31;click('Automatic ▾');assert(find('○ Manual'),'All options can be chosen directly');
const stable=screen;editor.present(model);assert.equal(screen,stable);assert(find('○ Manual'),'RPC refresh leaves an open choice in place');
click('○ Manual');assert.equal(changes.at(-1).value,'manual');assert(!find('○ Disabled'),'Picking an option closes its inline list');assert(find('Manual ▾'));assert.equal(scroller().normalized,.31);
click('+');assert.equal(changes.at(-1).value,2.25,'Unbounded number preferences remain finite');
const limitUp=widgets(screen).filter(widget=>visible(widget)&&widget.text==='+')[1],before=changes.length;limitUp.click();assert.equal(changes.length,before,'At the declared bound, a click does not send an unchanged write');
click(native.t('description'));assert.equal(scroller().normalized,.64,'Returning to prose restores reading position');
click(native.t('preferences'));assert.equal(scroller().normalized,.31,'Each pane keeps its own scroll position');
width=320;editor.present(model);assert.equal(scroller().normalized,.31);
const caption=widgets(screen).find(widget=>widget.text==='Operating mode'),mode=find('Manual ▾');
assert.equal(mode.parent,caption.parent);assert(mode.layout.top>caption.layout.top+caption.layout.height,'Narrow layouts place controls below their complete caption');
const help=widgets(screen).find(widget=>widget.text?.includes('The selected mode'));assert(help&&help.layout.height>14,'Long field help wraps and stays visible');
for(const widget of widgets(screen)){assert(!Object.values(widget.layout).some(value=>typeof value==='number'&&!Number.isFinite(value)),'Finite layout geometry');}

const attributes=new AttributeView.View(host.close),rows=[{id:'defense',label:'Defense',description:'Reduces physical damage.',group:'combat',format:'number',value:12,sources:[{id:'base',label:'Base',value:8},{id:'stage',label:'Current stage',value:4}]}];
attributes.present('fixture:unit','Unit',rows,'Calm',()=>{});scroller().normalized=.47;const original=screen,value=find('12');assert(value.tooltip.includes('Current stage: 4'));
rows[0].value=16;rows[0].sources[1].value=8;attributes.present('fixture:unit','Unit',rows,'Bold',()=>{});
assert.equal(screen,original,'Nature and numeric updates keep the inspector widgets');assert.equal(value.text,'16');assert(value.tooltip.includes('Current stage: 8'));assert.equal(scroller().normalized,.47);
click('▾ 战斗');assert(!find('Defense'));click('▸ 战斗');assert(find('Defense'));
attributes.present('fixture:empty','Unit',[],'Calm',()=>{});assert(find('当前没有可显示的属性。可刷新后重试。'));
assert.equal(UiSurfaces.fit('🚀 long',10),'…','Clipped labels never expose half a surrogate pair');
console.log('PASS details panels: explicit choices; bounded/unbounded numeric edits; RPC stability; per-pane scroll; narrow field help; live attributes/source tooltips; group navigation; empty state.');
