/** Content-owned optional integrations, registered through KubeJS's native tooltip event. */
namespace ItemTooltips {
    const entries:{[id:string]:{item:string;text:any}}=Object.create(null);
    let registered=false;
    export function addIfMod(id:string,mod:string,item:string,text:any):boolean {
        if(!Platform.isLoaded(mod))return false;
        if(entries[id])throw new Error("Duplicate item tooltip: "+id);
        entries[id]={item,text};
        if(!registered){registered=true;ItemEvents.modifyTooltips(event=>{
            Object.keys(entries).forEach(key=>{const entry=entries[key];event.add(entry.item,[UiSurfaces.text(entry.text)]);});
        });}
        return true;
    }
}
