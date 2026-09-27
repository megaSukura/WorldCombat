import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {uiNativeMock,widgets} from './ui-native-mock.mjs';

const native=uiNativeMock();
let width=480,height=300,screen=null,cursor=[240,70],opened=0,customized=0;
const commands=[],errors=[];
const host={width:()=>width,height:()=>height,mouseX:()=>cursor[0],mouseY:()=>cursor[1],active:()=>!!screen,
  open:root=>{screen=root;opened++;},close:()=>{screen=null;},reset:()=>{screen=null;},hud(){},themed:root=>root,
  meshTexture:(json,color)=>{const mesh=JSON.parse(json);assert(mesh.length>0&&mesh.length%8===0);assert(mesh.every(value=>Number.isFinite(value)&&value>=0&&value<=1),'Every annulus and highlight is a native normalized mesh');assert.equal(color,color|0);return{mesh,color};}};
const classes={...native.classes,NativeUiHost:host};
const context=vm.createContext({Java:{loadClass:name=>{const type=classes[name.slice(name.lastIndexOf('.')+1)];assert(type,name);return type;}}});
for(const name of ['ui-state','ui-surfaces','schema-editor','radial-menu'])vm.runInContext(ts.transpileModule(fs.readFileSync('content/client/library/'+name+'.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES5,module:ts.ModuleKind.None}}).outputText,context);
const {RadialMenu,UiState}=context;
const find=text=>widgets(screen).find(widget=>widget.text===text&&widget.click);
const click=text=>{const widget=find(text);assert(widget,'Missing '+text);widget.click();};
const create=id=>new RadialMenu.View({id,title:()=> 'A companion with a very long translated name',backLabel:()=> 'Mouse 2',confirmLabel:()=> 'Mouse 1',commandLabel:()=> 'G',
  choose:item=>{commands.push(item);host.close();},close:host.close,reject:value=>errors.push(value),customized:()=>customized++});

const menu=create('dynamic');
let items=[{id:'work',label:'Work'},{id:'work/route',parent:'work',label:'Route'},{id:'work/route/place',parent:'work/route',label:'Place',command:'place',detail:'Place a supported block.'},
  {id:'work/route/pump',parent:'work/route',label:'Pump',command:'pump',disabled:'Needs daylight'}, {id:'travel',label:'Travel',command:'travel'}];
menu.updateItems(items);menu.open();click('Work ›');click('Route ›');
let initial=screen,button=find('Place'),before=opened;button.hovered=true;
items=items.map(item=>item.id==='work/route/place'?{...item,label:'Set',detail:'Place a supported block with the latest reach.'}:item);
menu.updateItems(items);
assert.equal(screen,initial,'A live label/detail update keeps the same native screen');assert.equal(opened,before);
assert.equal(find('Set'),button);assert(button.hovered);assert(button.tooltip.includes('latest reach'));
items=items.map(item=>item.id==='work/route/place'?{...item,disabled:'No supported surface'}:item);menu.updateItems(items);click('Set');assert.equal(errors.at(-1),'No supported surface');assert.equal(commands.length,0);
menu.release();assert(screen,'A denied command keeps the menu and reason available');
items=items.map(item=>item.id==='work/route/place'?{...item,disabled:undefined}:item);menu.updateItems(items);click('Set');assert.equal(commands.at(-1).id,'work/route/place');

menu.open();click('Work ›');click('Route ›');
items=items.map(item=>item.id==='work/route'?{...item,parent:undefined}:item);menu.updateItems(items);
assert.deepEqual(Array.from(menu.tree.path),[],'Reparenting invalidates the stale ancestor chain');
const count=commands.length;menu.release();assert.equal(commands.length,count,'A structural update never sends a replacement on key release');
click('Route ›');assert.equal(menu.tree.path[0],'work/route');
items=items.filter(item=>item.id!=='work/route/place'&&item.id!=='work/route/pump');menu.updateItems(items);assert.deepEqual(Array.from(menu.tree.path),[],'An emptied category returns to its nearest live ancestor');

const unavailable=create('disabled');unavailable.updateItems([{id:'day',label:'Day',disabled:'Needs daylight'}]);unavailable.open();unavailable.release();assert(screen);assert.equal(errors.at(-1),'Needs daylight');

for(const dimensions of [[320,240],[480,300],[720,405]]){
  [width,height]=dimensions;cursor=[width/2,(height-26)/2];
  const dense=create(dimensions.join('x'));
  dense.updateItems(Array.from({length:27},(_,index)=>({id:'custom:'+index,label:'Command '+index,command:'other-mod:custom'})));dense.open();
  const labels=widgets(screen).filter(widget=>widget.click&&String(widget.tooltip||'').startsWith('Command '));
  const expected=height===405?8:6;assert.equal(labels.length,expected,'Compact screens use fewer legible sectors');
  for(const label of labels){
    assert(label.layout.left>=0&&label.layout.top>=0&&label.layout.left+label.layout.width<=width&&label.layout.top+label.layout.height<=height);
    assert(label.text.split('\n').length<=2);assert(label.text.split('\n').every(line=>native.classes.Minecraft.getInstance().font.width(line)<=label.layout.width));
  }
  for(let a=0;a<labels.length;a++)for(let b=a+1;b<labels.length;b++){
    const first=labels[a].layout,second=labels[b].layout;
    assert(first.left+first.width<=second.left||second.left+second.width<=first.left||first.top+first.height<=second.top||second.top+second.height<=first.top,'Sector labels do not overlap: '+JSON.stringify({dimensions,a,b,first,second}));
  }
  const centre=find('×'),box=centre.layout;
  cursor=[box.left+box.width/2,box.top+box.height/2];const previous=commands.length;dense.confirm();assert.equal(screen,null);assert.equal(commands.length,previous,'Centre closes without issuing a sector command');
  dense.open();const next=widgets(screen).find(widget=>widget.click&&widget.tooltip===native.t('wheel.next'));assert(next);
  cursor=[next.layout.left+3,next.layout.top+3];dense.confirm();assert(widgets(screen).some(widget=>String(widget.tooltip||'').startsWith('Command '+expected)));
  dense.release();assert(screen,'Explicit paging stays in click mode');
}

width=480;height=300;cursor=[240,70];const long=create('long');long.updateItems([{id:'extended',label:'An extended command supplied by another mod',detail:'A full command explanation that remains available in its tooltip even on a small screen.',command:'other:extended'}]);long.open();
const leaf=widgets(screen).find(widget=>widget.click&&String(widget.tooltip||'').startsWith('An extended command'));
assert(leaf.text.includes('…'));assert(leaf.tooltip.includes('another mod'));leaf.click();assert.equal(commands.at(-1).command,'other:extended');
long.open();click(native.t('customize'));click('×');assert.equal(customized,1);assert(screen&&widgets(screen).some(widget=>String(widget.tooltip||'').startsWith('An extended command')),'Closing customization returns directly to commands');

const resized=create('resize');resized.updateItems([{id:'branch',label:'Branch'},{id:'branch/leaf',parent:'branch',label:'Leaf',command:'leaf'}]);resized.open();click('Branch ›');
const beforeResize=screen,beforeResizeCommands=commands.length;width=720;height=405;cursor=[360,99];resized.refresh();
assert.notEqual(screen,beforeResize);assert.equal(screen.layout.width,720);assert.equal(screen.layout.height,405);assert.deepEqual(Array.from(resized.tree.path),['branch']);
resized.release();assert.equal(commands.length,beforeResizeCommands,'Changing GUI scale or window size cannot fire the newly laid-out sector');resized.confirm();assert.equal(commands.at(-1).id,'branch/leaf');

const tree=new UiState.MenuTree([{id:'a',label:'A'},{id:'a/b',parent:'a',label:'B'},{id:'a/b/c',parent:'a/b',label:'C'}]);
assert(!tree.enter(tree.items[1]),'A stale descendant cannot skip its current ancestor');assert(tree.enter(tree.items[0]));assert(tree.enter(tree.items[1]));tree.items=tree.items.filter(item=>item.id!=='a/b/c');tree.reconcile();assert.deepEqual(Array.from(tree.path),['a']);
native.preferences.set('broken','{');const broken=create('broken');broken.updateItems([{id:'ok',label:'Okay'}]);broken.open();assert(find('Okay'),'Damaged personal JSON does not crash G');
console.log('PASS command wheel: normalized native meshes, responsive non-overlapping labels, stable live updates/hover, valid reparenting, disabled reasons, click/held safety, paging, custom contributions and return from customization');
