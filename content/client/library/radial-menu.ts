/** Click-through command wheel with held quick selection; content contributes the hierarchy. */
namespace RadialMenu {
    const tr=(key:string,...args:any[])=>UiSurfaces.plain({key:"worldcombat.ui."+key,args});
    type Hit={x:number;y:number;width:number;height:number;run:()=>void};
    export class View {
        readonly tree=new UiState.MenuTree();
        private source:UiState.MenuItem[]=[];
        private items:UiState.MenuItem[]=[];
        private viewSignature="";
        private viewport="";
        private pages:{[path:string]:number}=Object.create(null);
        private page=0;private pageCount=1;private capacity=8;
        private segments:any[]=[];
        private heading:any;private detail:any;private breadcrumb:any;private title:any;private hint:any;
        private itemButtons:any[]=[];private controls:Hit[]=[];
        private layout:UiState.MenuLayout=UiState.menuLayout({});
        private radius=100;private inner=32;private cx=0;private cy=0;private contentWidth=0;
        private active=false;
        private clickToChoose=false;
        private edit:SchemaEditor.Editor|null=null;
        private editSelected="display";
        private store:any=null;
        constructor(private options:{title():any;backLabel():any;choose(item:UiState.MenuItem):void;close():void;reject(reason:any):void;
            id?:string;legacyIds?:string[];emptyLabel?:any;base?:number;highlight?:number;accent?:number;customize?():void;customized?():void;
            confirmLabel?():string;commandLabel?():string;
            renderItem?(root:any,item:UiState.MenuItem,x:number,y:number,choose:()=>void):void;}){}
        private storage():any{return this.store||(this.store=Java.loadClass("dev.worldcombat.core.client.UiPreferences"));}
        private reload():void{
            const key=this.options.id||"command-wheel"; let raw=String(this.storage().read(key));
            if(raw==="{}") (this.options.legacyIds||[]).some(previous=>{
                const saved=String(this.storage().read(previous)); if(saved==="{}")return false;
                raw=saved;this.storage().write(key,saved);return true;
            });
            let saved:any={};try{saved=JSON.parse(raw);}catch(_error){/* A damaged personal layout can be replaced from the editor. */}
            this.layout=UiState.menuLayout(saved);
            this.source.forEach(item=>{if(this.layout.order.indexOf(item.id)<0)this.layout.order.push(item.id);});
            this.tree.items=UiState.arrangeMenu(this.source,this.layout);
            this.tree.reconcile();
        }
        private signature():string{
            return JSON.stringify([this.tree.path,this.tree.current().map(item=>item.id)]);
        }
        updateItems(items:UiState.MenuItem[]):void{
            this.source=items;this.reload();
            if(this.active&&UiSurfaces.active(this)){
                if(this.signature()!==this.viewSignature){
                    // Changed positions require an explicit click: a held key must not dispatch a replacement under the cursor.
                    this.open(false,true);
                }else if(this.options.renderItem){
                    const current=this.tree.current().slice(this.page*this.capacity,(this.page+1)*this.capacity);
                    if(JSON.stringify(current)!==JSON.stringify(this.items))this.open(false,this.clickToChoose);
                }else{
                    this.items=this.tree.current().slice(this.page*this.capacity,(this.page+1)*this.capacity);
                    this.updateLabels();this.refresh();
                }
            }
        }
        private mesh(root:any,vertices:number[],color:number):any{
            const widget=UiSurfaces.element(this.cx-this.radius,this.cy-this.radius,this.radius*2,this.radius*2);
            widget.getStyle().backgroundTexture(UiSurfaces.Host.meshTexture(JSON.stringify(vertices),color));root.addChild(widget);return widget;
        }
        private arc(start:number,end:number,inner:number,outer:number):number[]{
            const vertices:number[]=[],steps=Math.max(6,Math.ceil((end-start)*12));
            for(let step=0;step<steps;step++){
                const a=start+(end-start)*step/steps,b=start+(end-start)*(step+1)/steps;
                [[a,inner],[b,inner],[b,outer],[a,outer]].forEach(point=>vertices.push(.5+Math.cos(point[0])*point[1]/(this.radius*2),.5+Math.sin(point[0])*point[1]/(this.radius*2)));
            }return vertices;
        }
        private control(root:any,value:any,x:number,y:number,width:number,height:number,run:()=>void):any{
            const button=UiSurfaces.button(root,value,x,y,width,height,run);this.controls.push({x,y,width,height,run});return button;
        }
        private inside(hit:{x:number;y:number;width:number;height:number},x:number,y:number):boolean{
            return x>=hit.x&&x<hit.x+hit.width&&y>=hit.y&&y<hit.y+hit.height;
        }
        private wrapped(value:any,width:number,maxLines=2):string{
            const all=UiSurfaces.lines(UiSurfaces.plain(value),Math.max(8,width)),visible=all.slice(0,maxLines);
            if(all.length>maxLines)visible[maxLines-1]=UiSurfaces.fit(visible[maxLines-1]+"…",Math.max(8,width));
            return visible.join("\n");
        }
        open(reset=true,clickToChoose=reset?false:this.clickToChoose):void{
            this.clickToChoose=clickToChoose;
            this.reload();this.active=true;this.tree.open(reset);
            const root=UiSurfaces.root(),w=UiSurfaces.Host.width(),h=UiSurfaces.Host.height();
            this.viewport=w+"/"+h;
            this.cx=Math.floor(w/2);this.cy=Math.floor((h-26)/2);
            this.radius=Math.floor(Math.min(116*this.layout.scale,(h-122)/2,w/2-18));
            this.radius=Math.max(32,this.radius);this.inner=Math.max(21,Math.floor(this.radius*this.layout.deadZone));
            this.capacity=this.radius<102?6:8;
            const all=this.tree.current(),path=JSON.stringify(this.tree.path);this.viewSignature=this.signature();
            this.pageCount=Math.max(1,Math.ceil(all.length/this.capacity));
            this.page=Math.min(this.pageCount-1,this.pages[path]||0);this.items=all.slice(this.page*this.capacity,(this.page+1)*this.capacity);
            const radius=this.radius,cx=this.cx,cy=this.cy;this.segments=[];this.itemButtons=[];this.controls=[];
            this.mesh(root,this.arc(0,Math.PI*2,this.inner-1,radius),0x66495559);
            this.items.forEach((item,index)=>{
                const half=Math.PI/this.items.length-.022,start=-Math.PI/2+index*Math.PI*2/this.items.length-half;
                const vertices=this.arc(start,start+2*half,this.inner+2,radius),mesh=JSON.stringify(vertices);
                const widget=this.mesh(root,vertices,this.options.base||0xe8172327);
                const base=UiSurfaces.Host.meshTexture(mesh,this.options.base||0xe8172327),highlight=UiSurfaces.Host.meshTexture(mesh,this.options.highlight||0xf0355558),disabled=UiSurfaces.Host.meshTexture(mesh,0xe821292b),blocked=UiSurfaces.Host.meshTexture(mesh,0xf04b3937);
                const rimVertices=this.arc(start,start+2*half,radius-3,radius),rim=this.mesh(root,rimVertices,0);
                this.segments.push({widget,base,highlight,disabled,blocked,rim,on:UiSurfaces.Host.meshTexture(JSON.stringify(rimVertices),this.options.accent||0xff84c8b8),off:UiSurfaces.Host.meshTexture(JSON.stringify(rimVertices),0)});
                const labelWidth=Math.max(30,Math.floor(radius*(this.items.length>6?.50:radius<70?.60:.75))),angle=-Math.PI/2+index*Math.PI*2/this.items.length,
                    x=Math.round(cx+Math.cos(angle)*radius*.73-labelWidth/2),y=Math.round(cy+Math.sin(angle)*radius*.73-12);
                if(this.options.renderItem)this.options.renderItem(root,item,x,y,()=>this.choose(index));
                else {
                    const button=UiSurfaces.button(root,"",x,y,labelWidth,24,()=>this.choose(index));
                    UiSurfaces.blankButton(button);UiSurfaces.align(button,"center");
                    this.itemButtons.push({button,x,y,width:labelWidth,height:24,index});
                }
            });
            this.mesh(root,this.arc(0,Math.PI*2,0,this.inner-2),0xf01b272c);
            const side=Math.max(20,Math.floor((this.inner-4)*Math.SQRT2));
            const centre=this.control(root,this.tree.path.length?"‹":"×",cx-side/2,cy-side/2,side,side,()=>this.back());
            UiSurfaces.blankButton(centre);UiSurfaces.tooltip(centre,[this.tree.path.length?tr("back"):tr("cancel")]);
            this.title=UiSurfaces.label(root,"",16,10,w-130,0xfff0eee6);
            this.breadcrumb=UiSurfaces.label(root,"",16,29,w-(this.pageCount>1?134:32),0xffaaa99f);
            this.control(root,tr("customize"),w-108,7,96,22,()=>this.beginCustomization());
            if(this.pageCount>1){
                const previous=this.control(root,"‹",w-112,30,22,20,()=>this.pageBy(-1));
                const next=this.control(root,"›",w-34,30,22,20,()=>this.pageBy(1));
                UiSurfaces.tooltip(previous,[tr("wheel.previous")]);UiSurfaces.tooltip(next,[tr("wheel.next")]);
                const page=UiSurfaces.label(root,(this.page+1)+" / "+this.pageCount,w-87,34,50,0xffccc9bf);UiSurfaces.align(page,"center");
            }
            const info=UiSurfaces.surface(UiSurfaces.element(12,h-70,w-24,49),0xe8182429,3);root.addChild(info);
            this.contentWidth=w-44;
            this.heading=UiSurfaces.label(info,"",10,6,this.contentWidth,0xfff0eee6);
            this.detail=UiSurfaces.label(info,"",10,22,this.contentWidth,0xffaaa99f);UiSurfaces.place(this.detail,10,22,this.contentWidth,24);
            this.hint=UiSurfaces.label(root,"",16,h-16,w-32,0xffaaa99f);
            this.updateLabels();this.refresh();UiSurfaces.open(root,this.options.title(),this);
        }
        private updateLabels():void{
            this.itemButtons.forEach(entry=>{
                const item=this.items[entry.index],label=UiSurfaces.plain(item.label)+(this.tree.children(item.id).length?" ›":"");
                entry.button.setText(UiSurfaces.text(this.wrapped(label,entry.width-2)));
                UiSurfaces.tooltip(entry.button,[UiSurfaces.plain(item.label),UiSurfaces.plain(item.disabled||item.detail||"")].filter(Boolean));
            });
        }
        private selection():number{
            const x=UiSurfaces.Host.mouseX(),y=UiSurfaces.Host.mouseY(),dx=x-this.cx,dy=y-this.cy;
            if(!this.items.length||dx*dx+dy*dy<this.inner*this.inner||dx*dx+dy*dy>Math.pow(this.radius+8,2))return -1;
            const button=this.itemButtons.filter(entry=>this.inside(entry,x,y))[0];
            if(button)return button.index;
            return Math.floor(((Math.atan2(dy,dx)+Math.PI/2+Math.PI*2+Math.PI/this.items.length)%(Math.PI*2))/(Math.PI*2/this.items.length));
        }
        choose(index:number):void{
            if(!this.active||index<0||index>=this.items.length)return;
            const item=this.items[index];
            if(item.disabled){this.clickToChoose=true;this.options.reject(UiSurfaces.plain(item.disabled));this.refresh();return;}
            if(this.tree.enter(item)){this.clickToChoose=true;this.open(false);}
            else {
                const current=this.source.filter(value=>value.id===(item.originalId||item.id))[0];
                if(!current||current.disabled){if(current?.disabled)this.options.reject(current.disabled);return;}
                this.active=false;this.options.choose(current);
            }
        }
        private pageBy(delta:number):void{this.pages[JSON.stringify(this.tree.path)]=(this.page+delta+this.pageCount)%this.pageCount;this.open(false,true);}
        private beginCustomization():void{this.active=false;this.options.customize?.();this.customize();}
        confirm():void{
            if(!this.active)return;
            const x=UiSurfaces.Host.mouseX(),y=UiSurfaces.Host.mouseY();
            // Semantic confirmation precedes LDLib mouse dispatch, so both use identical hit regions.
            const control=this.controls.filter(hit=>this.inside(hit,x,y))[0];if(control){control.run();return;}
            const hit=this.itemButtons.filter(entry=>this.inside(entry,x,y))[0];
            this.choose(hit?hit.index:this.selection());
        }
        release(quick=true):void{
            if(!this.active)return;
            const index=this.selection(),item=this.items[index];
            // A tap, explicit navigation, or the centre leaves the wheel available for ordinary mouse operation.
            if(!quick||this.clickToChoose||!item){this.clickToChoose=true;this.refresh();return;}
            if(item.disabled){this.clickToChoose=true;this.options.reject(UiSurfaces.plain(item.disabled));this.refresh();return;}
            this.choose(index);
        }
        back():void{if(this.tree.back())this.open(false,true);else{this.active=false;this.options.close();}}
        refresh():void{
            if(this.active&&UiSurfaces.active(this)&&this.viewport!==UiSurfaces.Host.width()+"/"+UiSurfaces.Host.height()){
                this.open(false,true);return;
            }
            if(!this.heading)return;const selected=this.selection(),item=this.items[selected];
            const path=this.tree.path.map(id=>this.tree.items.filter(value=>value.id===id)[0]).filter(Boolean).map(value=>UiSurfaces.plain(value.label));
            this.title.setText(UiSurfaces.text(UiSurfaces.fit(this.options.title(),UiSurfaces.Host.width()-130)));
            UiSurfaces.tooltip(this.title,[UiSurfaces.plain(this.options.title())]);
            const crumb=path.length?path.join("  ›  "):tr("wheel.root");
            this.breadcrumb.setText(UiSurfaces.text(UiSurfaces.fit(crumb,UiSurfaces.Host.width()-(this.pageCount>1?134:32))));UiSurfaces.tooltip(this.breadcrumb,[crumb]);
            const heading=item?UiSurfaces.plain(item.label)+(this.tree.children(item.id).length?"  ›":""):this.items.length?tr("wheel.choose"):this.options.emptyLabel||tr("wheel.empty");
            this.heading.setText(UiSurfaces.text(UiSurfaces.fit(heading,this.contentWidth)));UiSurfaces.tooltip(this.heading,[UiSurfaces.plain(heading)]);
            const description=item?(item.disabled||item.detail||""):this.items.length?tr("wheel_hint",this.options.confirmLabel?.()||"",this.options.backLabel()):"";
            this.detail.setText(UiSurfaces.text(this.wrapped(description,this.contentWidth)));this.detail.getTextStyle().textColor(UiSurfaces.intColor(item?.disabled?0xffe0a398:0xffaaa99f));UiSurfaces.tooltip(this.detail,[UiSurfaces.plain(description)]);
            const hint=this.clickToChoose?tr("wheel_click_hint",this.options.confirmLabel?.()||"",this.options.backLabel()):tr("wheel_hold_hint",this.options.commandLabel?.()||"",this.options.confirmLabel?.()||"");
            this.hint.setText(UiSurfaces.text(UiSurfaces.fit(hint,UiSurfaces.Host.width()-32)));
            this.segments.forEach((segment,index)=>{
                const blocked=!!this.items[index].disabled;
                segment.widget.getStyle().backgroundTexture(selected===index?(blocked?segment.blocked:segment.highlight):(blocked?segment.disabled:segment.base));
                segment.rim.getStyle().backgroundTexture(selected===index?segment.on:segment.off);
            });
            this.itemButtons.forEach(entry=>entry.button.textStyle((style:any)=>style.textColor(UiSurfaces.intColor(this.items[entry.index].disabled?0xff94938d:selected===entry.index?0xffc5f0df:0xffe9e7de))));
        }
        customize():void{
            const update=(tab:SchemaEditor.Tab,field:SchemaEditor.Field,value:any)=>{
                if(tab.id==="display")(<any>this.layout)[field.path[0]]=value;
                else{const id=tab.id,path=field.path[0];if(path==="order"){
                    this.layout.order=this.layout.order.filter(entry=>entry!==id);this.layout.order.splice(Math.max(0,value),0,id);
                }else{const list=path==="visible"?"hidden":"favorites",enabled=path==="visible"?!value:value;
                    this.layout[list]=this.layout[list].filter(entry=>entry!==id);if(enabled)this.layout[list].push(id);
                }}
                this.storage().write(this.options.id||"command-wheel",JSON.stringify(UiState.menuLayout(this.layout)));this.showLayout(tab.id);
            };
            if(!this.edit)this.edit=new SchemaEditor.Editor({initialMode:"fields",change:update,reset:(tab,field)=>update(tab,field,tab.id==="display"?field.path[0]==="scale"?1:.32:field.path[0]==="visible"?true:field.path[0]==="order"?0:false),select:id=>this.showLayout(id),close:()=>{this.options.customized?.();this.open(false,true);}});
            this.showLayout("display");
        }
        private showLayout(selected:string):void{
            this.editSelected=selected;
            const field=(path:string,label:string,kind:string,extra?:any)=>{const value:any={path:[path],label:{key:"worldcombat.ui."+label},kind};Object.keys(extra||{}).forEach(key=>{value[key]=extra[key];});return value;};
            const tabs:any[]=[{id:"display",name:tr("wheel_display"),fields:[field("scale","wheel_scale","number",{min:.7,max:1.3,step:.1,display:{scale:100,suffix:"%"}}),field("deadZone","wheel_deadzone","number",{min:.15,max:.5,step:.05,display:{scale:100,suffix:"%"}})],values:this.layout}];
            this.source.forEach(item=>{
                const fields=[field("visible","visible","boolean")];
                if(!this.source.some(child=>child.parent===item.id))fields.push(field("favorite","favorite","boolean"));
                fields.push(field("order","order","number",{min:0,max:this.source.length-1,step:1}));
                tabs.push({id:item.id,name:UiSurfaces.plain(item.label),fields,values:{visible:this.layout.hidden.indexOf(item.id)<0,favorite:this.layout.favorites.indexOf(item.id)>=0,order:Math.max(0,this.layout.order.indexOf(item.id))}});
            });
            this.edit!.present({identity:this.options.id||"command-wheel",title:tr("customize"),tabs,selected,footer:tr("layout_saved")});
        }
        refreshLocale():void{if(this.edit&&UiSurfaces.active(this.edit))this.showLayout(this.editSelected);}
    }
}
