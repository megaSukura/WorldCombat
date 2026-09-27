/** Localized prose and grouped preferences; transport and field renderers are supplied by consumers. */
namespace SchemaEditor {
    export interface Field { path: string[]; label: any; kind: string; help?: any; group?: string; groupLabel?: any; [key: string]: any; }
    export interface Readout { id?: string; label: any; value: any; unit?: any; description?: any; translationKey?: string; contributions?: Readout[]; [key: string]: any; }
    export interface Span { text?: string; number?: Readout | number; color?: number; }
    export interface Section { group?: string; values: Readout[]; }
    export interface Tab { id: string; name: any; description?: any; summary?: Span[][]; numbers?: Readout[]; sections?: Section[]; lines?: any[]; fields: Field[]; values: any; revision?: string | null; [key: string]: any; }
    export interface Model { identity: string; title: any; tabs: Tab[]; selected: string; message?: any; returnLabel?: any; footer?: any; }
    export interface FieldContext { parent: any; field: Field; x: number; y: number; width: number; value(): any; change(value: any): void; resize?(height: number): void; }
    export type Renderer = (context: FieldContext) => () => void;
    const renderers: { [kind: string]: Renderer } = Object.create(null);
    const tr = (key: string, ...args: any[]) => UiSurfaces.plain({key:"worldcombat.ui."+key,args});
    const ink=0xffeee9de,muted=0xffb7b3a7,accent=0xff9ed0bc;
    export function field(kind: string, renderer: Renderer): void { if (!kind || renderers[kind]) throw new Error("Duplicate editor field: " + kind); renderers[kind] = renderer; }
    function display(context: FieldContext): string {
        const value = context.value(), format = context.field.display || {};
        return typeof value === "number" ? String(Math.round(value * (format.scale === undefined ? 1 : format.scale) * 10000) / 10000) + UiSurfaces.plain(format.suffix || "") : UiSurfaces.plain(value);
    }
    function paragraph(parent:any,value:any,x:number,y:number,width:number,color=ink):{widget:any;height:number} {
        const lines=UiSurfaces.lines(UiSurfaces.plain(value),Math.max(1,width)),height=Math.max(14,lines.length*12);
        const widget=UiSurfaces.label(parent,lines.join("\n"),x,y,width,color);widget.lss("height",height);return {widget,height};
    }
    function hint(widget:any,value:any):void{UiSurfaces.tooltip(widget,[UiSurfaces.plain(value)]);}
    field("boolean", context => {
        const widget=UiSurfaces.button(context.parent,"",context.x,context.y,context.width,24,()=>context.change(!context.value()));
        hint(widget,context.field.help||context.field.label);
        return ()=>widget.setText(UiSurfaces.text(context.value()?context.field.trueLabel||tr("enabled"):context.field.falseLabel||tr("disabled")));
    });
    field("choice",context=>{
        const options=context.field.options||[];let open=false;
        const entries:{widget:any;value:any}[]=[];
        const list=UiSurfaces.element(context.x,context.y+28,context.width,0);context.parent.addChild(list);
        let height=0;
        const paint=()=>{
            list.lss("display",open?"flex":"none");
            const selected=options.filter((entry:any)=>entry.value===context.value())[0],label=selected?selected.label:display(context);
            widget.setText(UiSurfaces.text(UiSurfaces.fit(label,Math.max(8,context.width-24))+(open?" ▴":" ▾")));hint(widget,label);
            entries.forEach(entry=>entry.widget.setText(UiSurfaces.text((entry.value===context.value()?"● ":"○ ")+UiSurfaces.fit(options.filter((option:any)=>option.value===entry.value)[0].label,Math.max(8,context.width-28)))));
            if(context.resize)context.resize(open?height+28:24);
        };
        const widget=UiSurfaces.button(context.parent,"",context.x,context.y,context.width,24,()=>{if(options.length){open=!open;paint();}});
        options.forEach((entry:any)=>{
            const option=UiSurfaces.button(list,"",0,height,context.width,24,()=>{open=false;paint();if(entry.value!==context.value())context.change(entry.value);});
            hint(option,entry.help||entry.label);entries.push({widget:option,value:entry.value});height+=27;
        });list.lss("height",height);list.lss("display","none");return paint;
    });
    field("number",context=>{
        const delta=(sign:number)=>{
            const raw=Number(context.value()),step=typeof context.field.step==="number"&&isFinite(context.field.step)&&context.field.step>0?context.field.step:1;
            let next=Math.round(((isFinite(raw)?raw:0)+sign*step)*10000)/10000;
            if(typeof context.field.min==="number"&&isFinite(context.field.min))next=Math.max(context.field.min,next);
            if(typeof context.field.max==="number"&&isFinite(context.field.max))next=Math.min(context.field.max,next);
            if(next!==raw)context.change(next);
        };
        const down=UiSurfaces.button(context.parent,"−",context.x,context.y,24,24,()=>delta(-1));hint(down,tr("decrease",context.field.label));
        const label=UiSurfaces.label(context.parent,"",context.x+29,context.y+7,Math.max(1,context.width-58),accent);
        const up=UiSurfaces.button(context.parent,"+",context.x+context.width-24,context.y,24,24,()=>delta(1));hint(up,tr("increase",context.field.label));
        return ()=>{const value=display(context);label.setText(UiSurfaces.text(UiSurfaces.fit(value,Math.max(1,context.width-58))));hint(label,value);};
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
        private offsets:{[id:string]:number}=Object.create(null);
        private scroll:any=null;
        private scrollKey="";
        private footer:any=null;
        private noticeText:any="";
        constructor(private options:{title?:any;change(tab:Tab,field:Field,value:any):void;reset(tab:Tab,field:Field):void;select(id:string):void;close():void;
            background?:number;accent?:number;readoutLabel?:any;readoutFooter?:any;settingsLabel?:any;initialMode?:"description"|"fields";renderer?(kind:string):Renderer|null;readout?:any;}){}
        private remember():void{if(this.scroll&&this.scrollKey)this.offsets[this.scrollKey]=UiSurfaces.scrollPosition(this.scroll);}
        invalidate():void{this.remember();this.signature="";this.footer=null;this.scroll=null;}
        notice(value:any):void{this.noticeText=value;if(this.footer)this.refreshFooter();}
        private refreshFooter():void {
            if(!this.footer||!this.model)return;
            const subject=JSON.stringify([this.model.identity,this.model.selected]),mode=this.modes[subject]||this.options.initialMode||(this.tab()?.description||this.tab()?.summary?"description":"fields");
            const value=this.noticeText||(mode==="description"?this.options.readoutFooter||tr("hover_values"):this.model.footer||tr("reset_hint"));
            this.footer.setText(UiSurfaces.text(value));hint(this.footer,value);
        }
        private tab():Tab|null{return this.model&&this.model.tabs.filter(tab=>tab.id===this.model!.selected)[0]||null;}
        present(model:Model):void{
            this.model=model;const tab=this.tab(),width=Math.min(590,UiSurfaces.Host.width()-20),height=Math.min(420,UiSurfaces.Host.height()-20);
            const subject=JSON.stringify([model.identity,model.selected]),fields=tab?.fields||[],hasDescription=!!(tab&&(tab.description||tab.summary));
            const mode=this.modes[subject]||this.options.initialMode||(hasDescription?"description":"fields");
            const selectedIndex=model.tabs.map(tab=>tab.id).indexOf(model.selected),pageCount=Math.max(1,Math.ceil(model.tabs.length/4));
            if(this.lastSelection[model.identity]!==model.selected){this.lastSelection[model.identity]=model.selected;this.tabPages[model.identity]=Math.floor(Math.max(0,selectedIndex)/4);}
            const tabPage=Math.min(pageCount-1,this.tabPages[model.identity]||0);
            const signature=JSON.stringify([model.identity,model.selected,model.tabs.map(tab=>[tab.id,tab.name]),width,height,mode,fields,UiSurfaces.locale(),tabPage,!!model.returnLabel]);
            if(signature===this.signature&&UiSurfaces.active(this)){this.refreshers.forEach(refresh=>refresh());return;}
            this.remember();this.signature=signature;this.refreshers=[];
            const root=UiSurfaces.root(),panel=UiSurfaces.panel(UiSurfaces.element((UiSurfaces.Host.width()-width)/2,(UiSurfaces.Host.height()-height)/2,width,height));root.addChild(panel);
            const titleWidth=width-(model.returnLabel?136:58),heading=UiSurfaces.label(panel,"",14,15,titleWidth,ink);
            this.refreshers.push(()=>{heading.setText(UiSurfaces.text(UiSurfaces.fit(this.model!.title,titleWidth)));hint(heading,this.model!.title);});
            if(model.returnLabel)UiSurfaces.button(panel,model.returnLabel,width-118,8,78,23,()=>this.options.close());
            hint(UiSurfaces.button(panel,"×",width-33,8,23,23,()=>this.options.close()),tr("close"));
            const tabMargin=pageCount>1?40:12,tabWidth=(width-tabMargin*2)/Math.max(1,Math.min(4,model.tabs.length));
            model.tabs.slice(tabPage*4,tabPage*4+4).forEach((value,index)=>{
                const button=UiSurfaces.button(panel,UiSurfaces.fit(value.name,tabWidth-16),tabMargin+index*tabWidth,39,tabWidth-4,24,()=>this.options.select(value.id));hint(button,value.name);
                if(value.id===model.selected)panel.addChild(UiSurfaces.surface(UiSurfaces.element(tabMargin+index*tabWidth+2,63,tabWidth-8,2),accent,0));
            });
            if(pageCount>1){
                hint(UiSurfaces.button(panel,"‹",12,39,22,24,()=>{this.tabPages[model.identity]=(tabPage+pageCount-1)%pageCount;this.present(this.model!);}),tr("previous_page",tabPage+1,pageCount));
                hint(UiSurfaces.button(panel,"›",width-34,39,22,24,()=>{this.tabPages[model.identity]=(tabPage+1)%pageCount;this.present(this.model!);}),tr("next_page",tabPage+1,pageCount));
            }
            const half=(width-32)/2;
            UiSurfaces.button(panel,this.options.readoutLabel||tr("description"),12,73,half,23,()=>{this.modes[subject]="description";this.present(this.model!);});
            UiSurfaces.button(panel,this.options.settingsLabel||tr("preferences"),20+half,73,half,23,()=>{this.modes[subject]="fields";this.present(this.model!);});
            panel.addChild(UiSurfaces.surface(UiSurfaces.element(mode==="description"?14:22+half,96,half-4,2),accent,0));
            const scroll=UiSurfaces.scroll(panel,12,107,width-24,Math.max(32,height-146)),content=UiSurfaces.scrollContent(scroll),contentWidth=width-44;
            this.scroll=scroll;this.scrollKey=subject+"/"+mode;
            if(mode==="description"){
                const prose=UiSurfaces.rich(content,6,4,contentWidth-12,14);prose.lss("position","relative");prose.getTextStyle().adaptiveHeight(true);
                this.refreshers.push(()=>prose.setDocument(JSON.stringify(document(this.tab(),this.model!.message))));
            }else{
                const groups:{[id:string]:Field[]}=Object.create(null),order:string[]=[];
                fields.forEach(field=>{const id=field.group||"general";if(!groups[id]){groups[id]=[];order.push(id);}groups[id].push(field);});
                const containers:{id:string;head:any;body:any;rows:{element:any;height:number}[]}[]=[];
                const relayout=()=>{
                    const position=UiSurfaces.scrollPosition(scroll);let y=0;
                    containers.forEach(group=>{
                        const open=this.expanded[subject+"/"+group.id]!==false;let groupHeight=0;
                        group.rows.forEach(row=>{row.element.lss("top",groupHeight);groupHeight+=row.height+8;});
                        group.head.lss("top",y);group.body.lss("top",y+29).lss("height",groupHeight).lss("display",open?"flex":"none");
                        group.head.setText(UiSurfaces.text((open?"▾ ":"▸ ")+UiSurfaces.plain(groups[group.id][0].groupLabel||tr(group.id==="ai"?"ai_preferences":"use_preferences"))));
                        y+=29+(open?groupHeight:0)+6;
                    });content.lss("height",Math.max(30,y));UiSurfaces.restoreScroll(scroll,position);
                };
                order.forEach(id=>{
                    const key=subject+"/"+id;if(this.expanded[key]===undefined)this.expanded[key]=id!=="ai";
                    const head=UiSurfaces.button(content,"",0,0,contentWidth,23,()=>{this.expanded[key]=!this.expanded[key];relayout();});
                    const body=UiSurfaces.element(0,0,contentWidth,0);content.addChild(body);
                    const group={id,head,body,rows:[] as {element:any;height:number}[]};containers.push(group);
                    groups[id].forEach(field=>{
                        const row=UiSurfaces.surface(UiSurfaces.element(0,0,contentWidth,24),0x502d3835,0);body.addChild(row);
                        const compact=width<440,labelWidth=compact?contentWidth-45:Math.floor(contentWidth*.51)-14;
                        const title=paragraph(row,field.label,9,9,labelWidth),help=field.help?paragraph(row,field.help,9,13+title.height,labelWidth,muted):null;
                        const copyHeight=title.height+(help?help.height+4:0)+18,controlY=compact?copyHeight:8;
                        const controlX=compact?9:Math.floor(contentWidth*.51),controlWidth=contentWidth-controlX-37;
                        const record={element:row,height:Math.max(copyHeight,controlY+24+8)};group.rows.push(record);
                        const resize=(size:number)=>{const next=Math.max(copyHeight,controlY+size+8);if(record.height!==next){record.height=next;row.lss("height",next);relayout();}};
                        row.lss("height",record.height);hint(title.widget,field.help||field.label);
                        const renderer=this.options.renderer?.(field.kind)||renderers[field.kind];
                        if(renderer)this.refreshers.push(renderer({parent:row,field,x:controlX,y:controlY,width:controlWidth,resize,value:()=>UiState.read(this.tab()!.values,field.path),change:value=>this.options.change(this.tab()!,field,value)}));
                        else paragraph(row,tr("unsupported_field"),controlX,controlY+6,controlWidth,muted);
                        hint(UiSurfaces.button(row,"↺",contentWidth-29,controlY,23,23,()=>this.options.reset(this.tab()!,field)),tr("reset_field",field.label));
                    });
                });
                if(!fields.length)paragraph(content,model.message||tr("no_preferences"),6,12,contentWidth-12,muted);
                relayout();
            }
            this.footer=UiSurfaces.wrap(UiSurfaces.label(panel,"",14,height-29,width-28,muted));this.footer.lss("height",25);
            this.refreshers.push(()=>this.refreshFooter());this.refreshers.forEach(refresh=>refresh());
            UiSurfaces.open(root,this.options.title||model.title,this);UiSurfaces.restoreScroll(scroll,this.offsets[this.scrollKey]||0);
        }
    }
}
