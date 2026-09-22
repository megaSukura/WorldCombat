/** Click-through command wheel with held quick selection; content contributes the hierarchy. */
namespace RadialMenu {
    const tr=(key:string,...args:any[])=>UiSurfaces.plain({key:"worldcombat.ui."+key,args});
    export class View {
        readonly tree=new UiState.MenuTree();
        private source:UiState.MenuItem[]=[];
        private items:UiState.MenuItem[]=[];
        private viewSignature="";
        private pages:{[path:string]:number}=Object.create(null);
        private page=0;private pageCount=1;
        private segments:any[]=[];
        private heading:any;private detail:any;private breadcrumb:any;
        private itemButtons:any[]=[];
        private layout:UiState.MenuLayout=UiState.menuLayout({});
        private radius=100;
        private active=false;
        private clickToChoose=false;
        private edit:SchemaEditor.Editor|null=null;
        private editSelected="display";
        private store:any=null;
        constructor(private options:{title():any;backLabel():any;choose(item:UiState.MenuItem):void;close():void;reject(reason:any):void;
            id?:string;legacyIds?:string[];emptyLabel?:any;base?:number;highlight?:number;accent?:number;customize?():void;
            confirmLabel?():string;commandLabel?():string;
            renderItem?(root:any,item:UiState.MenuItem,x:number,y:number,choose:()=>void):void;}){}
        private storage():any{return this.store||(this.store=Java.loadClass("dev.worldcombat.core.client.UiPreferences"));}
        private reload():void{
            const key=this.options.id||"command-wheel"; let raw=String(this.storage().read(key));
            if(raw==="{}") (this.options.legacyIds||[]).some(previous=>{
                const saved=String(this.storage().read(previous)); if(saved==="{}")return false;
                raw=saved;this.storage().write(key,saved);return true;
            });
            this.layout=UiState.menuLayout(JSON.parse(raw));
            this.source.forEach(item=>{if(this.layout.order.indexOf(item.id)<0)this.layout.order.push(item.id);});
            this.tree.items=UiState.arrangeMenu(this.source,this.layout);
        }
        updateItems(items:UiState.MenuItem[]):void{
            this.source=items;this.reload();
            if(this.active&&UiSurfaces.active(this)){
                const current=this.tree.current();if(JSON.stringify(current)!==this.viewSignature)this.open(false);
            }
        }
        open(reset=true,clickToChoose=reset?false:this.clickToChoose):void{
            this.clickToChoose=clickToChoose;
            this.reload();this.active=true;this.tree.open(reset);
            while(this.tree.path.length&&!this.tree.current().length)this.tree.back();
            const all=this.tree.current(),path=JSON.stringify(this.tree.path);this.viewSignature=JSON.stringify(all);this.pageCount=Math.max(1,Math.ceil(all.length/8));
            this.page=Math.min(this.pageCount-1,this.pages[path]||0);this.items=all.slice(this.page*8,this.page*8+8);
            const root=UiSurfaces.root(),cx=UiSurfaces.Host.width()/2,cy=UiSurfaces.Host.height()/2;
            this.radius=Math.floor(Math.min(120,UiSurfaces.Host.height()*.34)*this.layout.scale);
            this.radius=Math.min(this.radius,UiSurfaces.Host.height()/2-40,UiSurfaces.Host.width()/2-30);
            const radius=this.radius;this.segments=[];this.itemButtons=[];
            this.items.forEach((item,index)=>{
                const vertices:number[]=[],half=Math.PI/this.items.length-.025,start=-Math.PI/2+index*Math.PI*2/this.items.length-half;
                for(let step=0;step<16;step++){
                    const a=start+2*half*step/16,b=start+2*half*(step+1)/16;
                    [[a,this.layout.deadZone*.5],[b,this.layout.deadZone*.5],[b,.5],[a,.5]].forEach(point=>vertices.push(Math.round((.5+Math.cos(point[0])*point[1])*radius*2)/(radius*2),Math.round((.5+Math.sin(point[0])*point[1])*radius*2)/(radius*2)));
                }
                const widget=UiSurfaces.element(cx-radius,cy-radius,radius*2,radius*2),mesh=JSON.stringify(vertices);
                const base=UiSurfaces.Host.meshTexture(mesh,item.disabled?0xc0353535:this.options.base||0xdc252a30),highlight=UiSurfaces.Host.meshTexture(mesh,item.disabled?0xe04b3434:this.options.highlight||0xed526e74);
                widget.getStyle().backgroundTexture(base);root.addChild(widget);this.segments.push({widget,base,highlight});
                const labelWidth=Math.max(42,Math.min(76,radius*.72)),angle=-Math.PI/2+index*Math.PI*2/this.items.length,
                    x=cx+Math.cos(angle)*radius*.79-labelWidth/2,y=cy+Math.sin(angle)*radius*.79-9;
                if(this.options.renderItem)this.options.renderItem(root,item,x,y,()=>this.choose(index));
                else {
                    const button=UiSurfaces.button(root,UiSurfaces.plain(item.label)+(this.tree.children(item.id).length?" ›":""),x,y,labelWidth,18,()=>this.choose(index));
                    UiSurfaces.tooltip(button,[item.label,item.disabled||item.detail||""]);this.itemButtons.push({button,x,y,width:labelWidth,height:18,index});
                }
            });
            const centre=UiSurfaces.panel(UiSurfaces.element(cx-32,cy-16,64,32));root.addChild(centre);
            UiSurfaces.button(centre,this.tree.path.length?tr("back"):tr("cancel"),4,5,56,22,()=>this.back());
            this.breadcrumb=UiSurfaces.label(root,this.options.title(),14,34,UiSurfaces.Host.width()-28,0xffededed);
            this.heading=UiSurfaces.label(root,"",14,UiSurfaces.Host.height()-35,UiSurfaces.Host.width()-28,0xfff6edcf);
            this.detail=UiSurfaces.label(root,this.items.length?"":this.options.emptyLabel||tr("loading"),14,UiSurfaces.Host.height()-19,UiSurfaces.Host.width()-28,0xffededed);
            UiSurfaces.button(root,tr("customize"),UiSurfaces.Host.width()-112,8,102,22,()=>this.beginCustomization());
            if(this.pageCount>1){
                UiSurfaces.button(root,"‹",12,8,24,22,()=>this.pageBy(-1));UiSurfaces.button(root,"›",40,8,24,22,()=>this.pageBy(1));
                UiSurfaces.label(root,(this.page+1)+" / "+this.pageCount,70,13,60,0xffeeeeee);
            }
            this.refresh();UiSurfaces.open(root,this.options.title(),this);
        }
        private selection():number{
            const dx=UiSurfaces.Host.mouseX()-UiSurfaces.Host.width()/2,dy=UiSurfaces.Host.mouseY()-UiSurfaces.Host.height()/2;
            if(!this.items.length||dx*dx+dy*dy<Math.pow(this.radius*this.layout.deadZone,2)||dx*dx+dy*dy>Math.pow(this.radius+12,2))return -1;
            return Math.floor(((Math.atan2(dy,dx)+Math.PI/2+Math.PI*2+Math.PI/this.items.length)%(Math.PI*2))/(Math.PI*2/this.items.length));
        }
        choose(index:number):void{
            if(index<0||index>=this.items.length)return;
            const item=this.items[index];
            if(item.disabled){this.options.reject(UiSurfaces.plain(item.disabled));return;}
            if(this.tree.enter(item)){this.clickToChoose=true;this.open(false);}
            else {
                const current=this.source.filter(value=>value.id===(item.originalId||item.id))[0];
                if(!current||current.disabled){if(current?.disabled)this.options.reject(current.disabled);return;}
                this.active=false;this.options.choose(current);
            }
        }
        private pageBy(delta:number):void{this.pages[JSON.stringify(this.tree.path)]=(this.page+delta+this.pageCount)%this.pageCount;this.open(false);}
        private beginCustomization():void{this.active=false;this.options.customize?.();this.customize();}
        confirm():void{
            const x=UiSurfaces.Host.mouseX(),y=UiSurfaces.Host.mouseY(),width=UiSurfaces.Host.width(),cy=UiSurfaces.Host.height()/2;
            // Semantic confirm is consumed before LDLib's mouse event; include the native button hit areas.
            if(x>=width-112&&x<width-10&&y>=8&&y<30){this.beginCustomization();return;}
            if(this.pageCount>1&&y>=8&&y<30){if(x>=12&&x<36){this.pageBy(-1);return;}if(x>=40&&x<64){this.pageBy(1);return;}}
            if(x>=width/2-28&&x<width/2+28&&y>=cy-11&&y<cy+11){this.back();return;}
            const hit=this.itemButtons.filter(entry=>x>=entry.x&&x<entry.x+entry.width&&y>=entry.y&&y<entry.y+entry.height)[0];
            this.choose(hit?hit.index:this.selection());
        }
        release(quick=true):void{
            if(!this.active)return;
            const index=this.selection(),item=this.items[index];
            // A tap, or a branch entered by clicking, leaves the wheel available for ordinary mouse operation.
            if(!quick||this.clickToChoose||!item){this.clickToChoose=true;this.refresh();return;}
            if(this.tree.children(item.id).length){this.choose(index);return;}
            this.active=false;
            if(item.disabled){this.options.close();this.options.reject(UiSurfaces.plain(item.disabled));return;}
            const current=this.source.filter(value=>value.id===(item.originalId||item.id))[0];
            if(!current||current.disabled){this.options.close();if(current?.disabled)this.options.reject(UiSurfaces.plain(current.disabled));return;}
            this.options.choose(current);
        }
        back():void{if(this.tree.back())this.open(false);else{this.active=false;this.options.close();}}
        refresh():void{
            if(!this.heading)return;const selected=this.selection(),item=this.items[selected];
            const path=this.tree.path.map(id=>this.tree.items.filter(value=>value.id===id)[0]).filter(Boolean).map(value=>UiSurfaces.plain(value.label));
            this.breadcrumb.setText(UiSurfaces.text(UiSurfaces.plain(this.options.title())+(path.length?"  ›  "+path.join("  ›  "):"")));
            this.heading.setText(UiSurfaces.text(item?(item.disabled||item.detail||item.label):this.items.length?tr("wheel_hint",this.options.confirmLabel?.()||"",this.options.backLabel()):this.options.emptyLabel||tr("loading")));
            const hint=this.clickToChoose?tr("wheel_click_hint",this.options.confirmLabel?.()||"",this.options.backLabel()):tr("wheel_hold_hint",this.options.commandLabel?.()||"",this.options.confirmLabel?.()||"");
            this.detail.setText(UiSurfaces.text(hint));
            this.segments.forEach((segment,index)=>segment.widget.getStyle().backgroundTexture(selected===index?segment.highlight:segment.base));
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
            if(!this.edit)this.edit=new SchemaEditor.Editor({change:update,reset:(tab,field)=>update(tab,field,tab.id==="display"?field.path[0]==="scale"?1:.32:field.path[0]==="visible"?true:field.path[0]==="order"?0:false),select:id=>this.showLayout(id),close:()=>this.options.close()});
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
