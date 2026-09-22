import fs from 'node:fs';
import {localization} from '../../tools/build-localization.mjs';

/** Widget harness only. Native Component formatting/hover and int boundaries also run in rhino-g-ui. */
export function uiNativeMock(extra={}) {
  const languages=localization([]), preferences=new Map();let locale='zh_cn';
  for(const key of Object.keys(extra))for(const language of ['zh_cn','en_us'])languages[language][key]=extra[key][language];
  const plain=value=>value==null?'':typeof value==='object'?value.getString?.()??String(value):String(value);
  function parse(value,bindings={},visiting=new Set()){
    if(value==null)return [];
    if(Array.isArray(value))return value.flatMap(item=>parse(item,bindings,visiting));
    if(typeof value!=='object')return [{text:String(value)}];
    if(value.paragraphs)return value.paragraphs.flatMap((paragraph,index)=>[...(index?[{text:'\n\n'}]:[]),...parse(paragraph,value.bindings||{},visiting)]);
    if(value.binding){
      if(visiting.has(value.binding)||!bindings[value.binding])return [{text:'?'}];
      const number=bindings[value.binding],nested=new Set(visiting);nested.add(value.binding);
      const label=parse(number.label,bindings,nested).map(run=>run.text).join('');
      const runs=parse(number.value,bindings,nested).concat(parse(number.unit,bindings,nested));
      const lines=[label+': '+runs.map(run=>run.text).join(''),...explain(number,bindings,nested)];
      return runs.map(run=>({...run,tooltip:lines.join('\n')}));
    }
    if(value.key){
      const format=languages[locale][value.key]??value.fallback??value.key,args=value.args||[];let next=0,index=0;const output=[];
      for(const match of format.matchAll(/%(?:(\d+)\$)?s|%%/g)){
        if(match.index>index)output.push({text:format.slice(index,match.index)});
        output.push(...(match[0]==='%%'?[{text:'%'}]:parse(args[match[1]?Number(match[1])-1:next++],bindings,visiting)));index=match.index+match[0].length;
      }if(index<format.length)output.push({text:format.slice(index)});return output;
    }
    return [{text:plain(value.text??value.value??''),tooltip:(value.tooltip||[]).map(part=>parse(part,bindings,visiting).map(run=>run.text).join('')).join('\n')}];
  }
  function explain(number,bindings,visiting){return [number.description?parse(number.description,bindings,visiting).map(run=>run.text).join(''):'',...(number.contributions||[]).flatMap(part=>[parse({key:'worldcombat.ui.value_line',args:[part.label,part.value]},bindings,visiting).map(run=>run.text).join(''),...explain(part,bindings,visiting)])].filter(Boolean);}
  class NativeText{constructor(runs){this.runs=runs;this.kind='component';}getString(){return this.runs.map(run=>run.text).join('');}toString(){return this.getString();}}
  const UiText={component:json=>new NativeText(parse(JSON.parse(json))),plain:json=>parse(JSON.parse(json)).map(run=>run.text).join(''),locale:()=>locale};
  class Widget{
    constructor(){this.children=[];this.layout={};this.properties=this.layout;this.classes=[];this.visible=true;}
    lss(name,value){this.layout[name]=value;if(name==='display')this.visible=value!=='none';return this;}addChild(child){this.children.push(child);return this;}
    addClass(name){this.classes.push(name);return this;}
    setText(value){this.text=plain(value);return this;}setDocument(json){this.runs=UiText.component(json).runs;this.text=this.runs.map(run=>run.text).join('');return this;}
    getStyle(){return this;}getTextStyle(){return this;}getButtonStyle(){return this;}textColor(){return this;}textWrap(){return this;}adaptiveHeight(){return this;}
    backgroundTexture(){return this;}baseTexture(){return this;}hoverTexture(){return this;}pressedTexture(){return this;}
    setOnClick(callback){this.click=callback;return this;}appendTooltipsString(value){this.tooltip=plain(value);return this;}
    ['tooltips(com.lowdragmc.lowdraglib2.gui.ui.data.Tooltips)'](values){this.tooltip=values.map(plain).join('\n');return this;}
  }
  class ScrollerView extends Widget{constructor(){super();this.viewContainer=new Widget();this.addChild(this.viewContainer);}['viewContainer(java.util.function.Consumer)'](consumer){consumer(this.viewContainer);return this;}getScrollerViewStyle(){return this;}mode(){return this;}addScrollViewChild(child){this.viewContainer.addChild(child);return this;}}
  const classes={UiText,UiPreferences:{read:key=>preferences.get(key)||'{}',write:(key,value)=>preferences.set(key,value)},UIElement:Widget,Button:Widget,Label:Widget,RichTextLabel:Widget,ScrollerView,ScrollerMode:{VERTICAL:'vertical'},
    UI:{of:value=>value},ModularUI:{of:value=>value},TextWrap:{WRAP:'wrap'},ArrayList:class extends Array{add(value){this.push(value);}},Tooltips:{'of(java.util.List)':value=>value},ClientCallbacks:{runnable:(_id,run)=>({run})},
    SDFRectTexture:{of:()=>({setRadius(){return this;},setStroke(){return this;},setBorderColor(){return this;},draw(){}})},Component:{literal:value=>new NativeText([{text:plain(value)}]),translatable:key=>UiText.component(JSON.stringify({key}))}};
  return {classes,UiText,Widget,preferences,parse,setLocale:value=>{locale=value;},t:key=>UiText.plain(JSON.stringify({key:'worldcombat.ui.'+key}))};
}
export function widgets(root){return[root,...(root?.children||[]).flatMap(widgets)];}
