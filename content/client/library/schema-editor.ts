/** Localized prose and grouped preferences; transport and field renderers are supplied by consumers. */
namespace SchemaEditor {
    export interface Field { path: string[]; label: any; kind: string; help?: any; group?: string; groupLabel?: any; [key: string]: any; }
    export interface Readout { id?: string; label: any; value: any; unit?: any; description?: any; translationKey?: string; contributions?: Readout[]; [key: string]: any; }
    export interface Span { text?: string; number?: Readout | number; color?: number; }
    export interface Section { group?: string; values: Readout[]; }
    export interface Tab { id: string; name: any; description?: any; summary?: Span[][]; numbers?: Readout[]; sections?: Section[]; lines?: any[]; fields: Field[]; values: any; revision?: string | null; [key: string]: any; }
    export interface Model { identity: string; title: any; tabs: Tab[]; selected: string; message?: any; returnLabel?: any; footer?: any; }
    export interface FieldContext { parent: any; field: Field; x: number; y: number; width: number; value(): any; change(value: any): void; }
    export type Renderer = (context: FieldContext) => () => void;
    const renderers: { [kind: string]: Renderer } = Object.create(null);
    const tr = (key: string, ...args: any[]) => UiSurfaces.plain({key:"worldcombat.ui."+key,args});
    export function field(kind: string, renderer: Renderer): void { if (!kind || renderers[kind]) throw new Error("Duplicate editor field: " + kind); renderers[kind] = renderer; }
    function display(context: FieldContext): string {
        const value = context.value(), format = context.field.display || {};
        return typeof value === "number" ? String(Math.round(value * (format.scale === undefined ? 1 : format.scale) * 10000) / 10000) + UiSurfaces.plain(format.suffix || "") : UiSurfaces.plain(value);
    }
    field("boolean", context => {
        const widget=UiSurfaces.button(context.parent,"",context.x,context.y,context.width,24,()=>context.change(!context.value()));
        return ()=>widget.setText(UiSurfaces.text(context.value()?context.field.trueLabel||tr("enabled"):context.field.falseLabel||tr("disabled")));
    });
    field("choice",context=>{
        const options=context.field.options||[];
        const widget=UiSurfaces.button(context.parent,"",context.x,context.y,context.width,24,()=>{
            let index=-1;options.forEach((entry:any,at:number)=>{if(entry.value===context.value())index=at;});
            if(options.length)context.change(options[(index+1)%options.length].value);
        });
        return ()=>{const option=options.filter((entry:any)=>entry.value===context.value())[0];widget.setText(UiSurfaces.text(option?option.label:display(context)));};
    });
    field("number",context=>{
        const delta=(sign:number)=>context.change(Math.max(context.field.min,Math.min(context.field.max,Math.round((Number(context.value())+sign*(context.field.step||1))*10000)/10000)));
        UiSurfaces.button(context.parent,"−",context.x,context.y,24,24,()=>delta(-1));
        const label=UiSurfaces.label(context.parent,"",context.x+29,context.y+7,context.width-57);
        UiSurfaces.button(context.parent,"+",context.x+context.width-24,context.y,24,24,()=>delta(1));
        return ()=>label.setText(UiSurfaces.text(display(context)));
    });
    /** Older fixtures may supply literal runs; authored production prose uses stable named bindings. */
    export function runs(paragraphs: Span[][], numbers: Readout[] = []): any[] {
        const output:any[]=[];
        const explain=(entry:Readout):any[]=>[entry.description||""].concat((entry.contributions||[]).map(part=>({key:"worldcombat.ui.value_line",args:[part.label,part.value]})));
        paragraphs.forEach((paragraph,index)=>{if(index)output.push({text:"\n\n"});paragraph.forEach(span=>{
            const value=typeof span.number==="number"?numbers[span.number]:span.number;
            output.push({text:span.text===undefined?value?value.value:"":span.text,tooltip:value?[{key:"worldcombat.ui.value_line",args:[value.label,value.value]}].concat(explain(value)):[]});
        });});return output;
    }
    function document(tab:Tab|null,message:any):any {
        if(!tab)return message||"";
        if(tab.description&&typeof tab.description==="object")return tab.description;
        if(tab.summary&&tab.summary.length)return runs(tab.summary,tab.numbers);
        return tab.description||message||"";
    }
    export class Editor {
        private model:Model|null=null;
        private signature="";
        private refreshers:(()=>void)[]=[];
        private expanded:{[id:string]:boolean}=Object.create(null);
        private modes:{[id:string]:string}=Object.create(null);
        private tabPages:{[id:string]:number}=Object.create(null);
        private lastSelection:{[id:string]:string}=Object.create(null);
        private footer:any=null;
        private noticeText:any="";
        constructor(private options:{title?:any;change(tab:Tab,field:Field,value:any):void;reset(tab:Tab,field:Field):void;select(id:string):void;close():void;
            background?:number;accent?:number;readoutLabel?:any;readoutFooter?:any;settingsLabel?:any;renderer?(kind:string):Renderer|null;readout?:any;}){}
        invalidate():void{this.signature="";this.footer=null;}
        notice(value:any):void{this.noticeText=value;if(this.footer)this.footer.setText(UiSurfaces.text(value||this.model?.footer||""));}
        private tab():Tab|null{return this.model&&this.model.tabs.filter(tab=>tab.id===this.model!.selected)[0]||null;}
        present(model:Model):void{
            this.model=model;const tab=this.tab(),width=Math.min(540,UiSurfaces.Host.width()-24),height=Math.min(380,UiSurfaces.Host.height()-24);
            const subject=JSON.stringify([model.identity,model.selected]),fields=tab?.fields||[],hasDescription=!!(tab&&(tab.description||tab.summary));
            const mode=this.modes[subject]||(hasDescription?"description":"fields");
            const selectedIndex=model.tabs.map(tab=>tab.id).indexOf(model.selected),pageCount=Math.max(1,Math.ceil(model.tabs.length/4));
            if(this.lastSelection[model.identity]!==model.selected){this.lastSelection[model.identity]=model.selected;this.tabPages[model.identity]=Math.floor(Math.max(0,selectedIndex)/4);}
            const tabPage=Math.min(pageCount-1,this.tabPages[model.identity]||0);
            const signature=JSON.stringify([model.identity,model.selected,model.tabs.map(tab=>tab.id),width,height,mode,fields,UiSurfaces.locale(),tabPage]);
            if(signature===this.signature&&UiSurfaces.active(this)){this.refreshers.forEach(refresh=>refresh());return;}
            this.signature=signature;this.refreshers=[];
            const root=UiSurfaces.root(),panel=UiSurfaces.panel(UiSurfaces.element((UiSurfaces.Host.width()-width)/2,(UiSurfaces.Host.height()-height)/2,width,height));root.addChild(panel);
            const heading=UiSurfaces.label(panel,model.title,14,13,width-118);this.refreshers.push(()=>heading.setText(UiSurfaces.text(this.model!.title)));
            if(model.returnLabel)UiSurfaces.button(panel,model.returnLabel,width-116,7,75,23,()=>this.options.close());
            UiSurfaces.button(panel,"×",width-36,7,23,23,()=>this.options.close());
            const tabMargin=pageCount>1?40:12,tabWidth=(width-tabMargin*2)/Math.max(1,Math.min(4,model.tabs.length));
            model.tabs.slice(tabPage*4,tabPage*4+4).forEach((value,index)=>UiSurfaces.button(panel,value.name,tabMargin+index*tabWidth,36,tabWidth-4,23,()=>this.options.select(value.id)));
            if(pageCount>1){
                UiSurfaces.button(panel,"‹",12,36,22,23,()=>{this.tabPages[model.identity]=(tabPage+pageCount-1)%pageCount;this.present(this.model!);});
                UiSurfaces.button(panel,"›",width-34,36,22,23,()=>{this.tabPages[model.identity]=(tabPage+1)%pageCount;this.present(this.model!);});
            }
            UiSurfaces.button(panel,this.options.readoutLabel||tr("description"),14,66,(width-34)/2,23,()=>{this.modes[subject]="description";this.present(this.model!);});
            UiSurfaces.button(panel,this.options.settingsLabel||tr("preferences"),20+(width-34)/2,66,(width-34)/2,23,()=>{this.modes[subject]="fields";this.present(this.model!);});
            const scroll=UiSurfaces.scroll(panel,14,96,width-28,height-130),content=UiSurfaces.scrollContent(scroll);
            if(mode==="description"){
                const prose=UiSurfaces.rich(content,0,0,width-48,14);prose.lss("position","relative");prose.getTextStyle().adaptiveHeight(true);
                this.refreshers.push(()=>prose.setDocument(JSON.stringify(document(this.tab(),this.model!.message))));
            }else{
                const groups:{[id:string]:Field[]}=Object.create(null),order:string[]=[];
                fields.forEach(field=>{const id=field.group||"general";if(!groups[id]){groups[id]=[];order.push(id);}groups[id].push(field);});
                const containers:{id:string;head:any;body:any;count:number}[]=[];
                const relayout=()=>{
                    let y=0;containers.forEach(group=>{const open=this.expanded[subject+"/"+group.id]!==false;
                        group.head.lss("top",y);group.body.lss("top",y+28);group.body.lss("display",open?"flex":"none");group.head.setText(UiSurfaces.text((open?"▾ ":"▸ ")+UiSurfaces.plain(groups[group.id][0].groupLabel||tr(group.id==="ai"?"ai_preferences":"use_preferences"))));
                        y+=28+(open?group.count*34:0);
                    });content.lss("height",Math.max(30,y));
                };
                order.forEach(id=>{
                    const key=subject+"/"+id;if(this.expanded[key]===undefined)this.expanded[key]=id!=="ai";
                    const head=UiSurfaces.button(content,"",0,0,width-48,24,()=>{this.expanded[key]=!this.expanded[key];relayout();});
                    const body=UiSurfaces.element(0,0,width-48,groups[id].length*34);scroll.addScrollViewChild(body);containers.push({id,head,body,count:groups[id].length});
                    groups[id].forEach((field,index)=>{
                        const y=index*34,caption=UiSurfaces.label(body,field.label,2,y+8,(width-48)*.46);
                        if(field.help)UiSurfaces.tooltip(caption,[field.help]);
                        const renderer=this.options.renderer?.(field.kind)||renderers[field.kind];
                        if(renderer)this.refreshers.push(renderer({parent:body,field,x:(width-48)*.47,y,width:(width-48)*.40,value:()=>UiState.read(this.tab()!.values,field.path),change:value=>this.options.change(this.tab()!,field,value)}));
                        else UiSurfaces.label(body,tr("unsupported_field"),(width-48)*.47,y+8,(width-48)*.4);
                        UiSurfaces.button(body,"↺",width-73,y,23,23,()=>this.options.reset(this.tab()!,field));
                    });
                });
                if(!fields.length)UiSurfaces.label(content,model.message||tr("no_preferences"),0,0,width-48);
                relayout();
            }
            this.footer=UiSurfaces.label(panel,"",14,height-23,width-28);
            this.refreshers.push(()=>this.footer.setText(UiSurfaces.text(this.noticeText||(mode==="description"?this.options.readoutFooter||tr("hover_values"):this.model!.footer||tr("reset_hint")))));
            this.refreshers.forEach(refresh=>refresh());UiSurfaces.open(root,this.options.title||model.title,this);
        }
    }
}
