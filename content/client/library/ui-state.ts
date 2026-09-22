/** Plain interaction state shared by editors, world views and content-specific adapters. */
namespace UiState {
    export class LeaseMap<T> {
        private entries: { [key: string]: { value: T; expires: number; serial: number } } = Object.create(null);
        private serial = 0;
        constructor(private now: () => number, private limit = 256) {}
        put(key: string, value: T, lifetime: number): void {
            this.prune();
            if (!this.entries[key] && Object.keys(this.entries).length >= this.limit) {
                const oldest = Object.keys(this.entries).sort((a, b) => this.entries[a].serial - this.entries[b].serial)[0];
                delete this.entries[oldest];
            }
            this.entries[key] = { value, expires: this.now() + Math.max(0, lifetime), serial: this.serial++ };
        }
        once(key: string, value: T, lifetime: number): boolean { if (this.get(key) !== null) return false; this.put(key, value, lifetime); return true; }
        get(key: string): T | null { this.prune(); return this.entries[key] ? this.entries[key].value : null; }
        values(): T[] { this.prune(); return Object.keys(this.entries).map(key => this.entries[key].value); }
        remove(key: string): void { delete this.entries[key]; }
        clear(): void { this.entries = Object.create(null); }
        private prune(): void { const now = this.now(); Object.keys(this.entries).forEach(key => { if (this.entries[key].expires <= now) delete this.entries[key]; }); }
    }
    export function read(object: any, path: string[]): any { let value = object; path.forEach(key => { value = value == null ? undefined : value[key]; }); return value; }
    export function patch(path: string[], value: any): any {
        const root: any = {}; let current = root;
        path.forEach((key, index) => {
            if (key === "__proto__" || key === "constructor" || key === "prototype") throw new Error("Unsafe editor path");
            if (index === path.length - 1) current[key] = value; else current = current[key] = {};
        }); return root;
    }
    export class RevisionGate {
        busy = false;
        begin(send: () => void): boolean { if (this.busy) return false; this.busy = true; try { send(); } catch (error) { this.busy = false; throw error; } return true; }
        finish(): boolean { const pending = this.busy; this.busy = false; return pending; }
    }
    export interface MenuItem { id: string; parent?: string; label: any; detail?: any; disabled?: any; [key: string]: any; }
    export interface MenuLayout { scale:number; deadZone:number; hidden:string[]; favorites:string[]; order:string[]; }
    export function menuLayout(value:any):MenuLayout {
        const ids=(values:any)=>Array.isArray(values)?values.filter((id:any,index:number)=>typeof id==="string"&&id.length<=160&&values.indexOf(id)===index).slice(0,256):[];
        const number=(n:any,min:number,max:number,fallback:number)=>typeof n==="number"&&isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
        return {scale:number(value?.scale,.7,1.3,1),deadZone:number(value?.deadZone,.15,.5,.32),hidden:ids(value?.hidden),favorites:ids(value?.favorites),order:ids(value?.order)};
    }
    export function arrangeMenu(items:MenuItem[],layout:MenuLayout):MenuItem[] {
        const visible=items.filter(item=>layout.hidden.indexOf(item.id)<0);
        const reachable=(item:MenuItem,seen:string[]):boolean=>!item.parent||seen.indexOf(item.id)<0&&visible.some(parent=>parent.id===item.parent&&reachable(parent,seen.concat(item.id)));
        const result=visible.filter(item=>reachable(item,[])).sort((a,b)=>{
            const index=(id:string)=>{const at=layout.order.indexOf(id);return at<0?layout.order.length:at;};return index(a.id)-index(b.id);
        });
        const favorites=layout.favorites.map(id=>items.filter(item=>item.id===id)[0]).filter(item=>item&&layout.hidden.indexOf(item.id)<0&&!items.some(child=>child.parent===item.id));
        if(favorites.length){result.unshift({id:"__favorites",label:{key:"worldcombat.ui.favorites"}});favorites.forEach(item=>{
            const copy:any={};Object.keys(item).forEach(key=>copy[key]=item[key]);copy.id="__favorite/"+item.id;copy.originalId=item.id;copy.parent="__favorites";result.push(copy);
        });}return result;
    }
    export class MenuTree {
        path: string[] = []; latched = false;
        constructor(public items: MenuItem[] = []) {}
        children(parent: string): MenuItem[] { return this.items.filter(item => (item.parent || "") === parent); }
        current(): MenuItem[] { return this.children(this.path.length ? this.path[this.path.length - 1] : ""); }
        open(reset = true): void { if (reset) { this.path = []; this.latched = false; } }
        enter(item: MenuItem): boolean { if (!this.children(item.id).length) return false; this.path.push(item.id); return true; }
        back(): boolean { if (!this.path.length) return false; this.path.pop(); return true; }
    }
    export class Selection<T, Value> {
        current: T | null = null;
        constructor(private options: { validate(item: T, value: Value): string; submit(item: T, value: Value): void;
            changed(item: T | null): void; reject(reason: string): void; continuous?(item: T): boolean; }) {}
        begin(item: T): void { this.current = item; this.options.changed(item); }
        confirm(value: Value): boolean {
            if (!this.current) return false;
            const item = this.current, reason = this.options.validate(item, value);
            if (reason) { this.options.reject(reason); return true; }
            this.options.submit(item, value);
            if (!this.options.continuous || !this.options.continuous(item)) this.cancel();
            return true;
        }
        cancel(): void { this.current = null; this.options.changed(null); }
    }
}
