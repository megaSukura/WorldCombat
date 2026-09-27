/** Read-only native-stat inspector. Stable widgets preserve hover and scroll on RPC updates. */
namespace AttributeView {
    export interface Row { id: string; label: any; description: any; group: string; format: string; value: any; sources: any[]; unknown?: any[]; }
    const text = (id: string, ...args: any[]) => ({ key: "worldcombat.attributes." + id, args });
    function display(value: any, format = "number"): string {
        if (value === null || value === undefined || typeof value === "number" && !isFinite(value)) return "—";
        if (typeof value !== "number") return typeof value === "object" ? JSON.stringify(value) : UiSurfaces.plain(value);
        const number = Math.round(value * (format === "percent" ? 100 : 1) * 100) / 100;
        return (format === "bonus" && number > 0 ? "+" : "") + number + (format === "percent" || format === "bonus" ? "%" : format === "multiplier" ? "×" : "");
    }
    function explanation(row: Row): string[] {
        const lines = [UiSurfaces.plain(row.label) + ": " + display(row.value, row.format), UiSurfaces.plain(row.description)].filter(Boolean);
        const add = (source: any, depth: number) => {
            lines.push(new Array(depth + 1).join("  ") + UiSurfaces.plain(source.label || source.id) + ": " + display(source.value, source.format) + UiSurfaces.plain(source.unit || "") +
                (source.operation ? " · " + UiSurfaces.plain(text("operation." + source.operation)) : ""));
            (source.sources || []).forEach((part: any) => add(part, depth + 1));
        };
        (row.sources || []).forEach(source => add(source, 0));
        (row.unknown || []).forEach(item => lines.push(UiSurfaces.plain(item)));
        return lines;
    }
    export class View {
        private identity = "";
        private signature = "";
        private rows: Row[] = [];
        private nature: any = null;
        private refreshers: (() => void)[] = [];
        private footer: any = null;
        private message: any = null;
        private scroll: any = null;
        private offsets: { [identity: string]: number } = Object.create(null);
        private folded: { [key: string]: boolean } = Object.create(null);
        notice(value: any): void { this.message = value; if (this.footer) this.footer.setText(UiSurfaces.text(value || text("footer"))); }
        constructor(private close: () => void) {}
        private remember(): void { if (this.scroll && this.identity) this.offsets[this.identity] = UiSurfaces.scrollPosition(this.scroll); }
        invalidate(): void { this.remember(); this.signature = ""; this.footer = null; this.message = null; this.scroll = null; }
        present(identity: string, name: string, rows: Row[] | null, nature: any, refresh: () => void): void {
            this.remember(); this.identity = identity; this.rows = rows || []; this.nature = nature;
            const width = Math.min(510, UiSurfaces.Host.width() - 20), height = Math.min(420, UiSurfaces.Host.height() - 20), colors = UiSurfaces.palette;
            const signature = JSON.stringify([identity, name, !!rows, this.rows.map(row => [row.id, row.group, row.label]), width, height, UiSurfaces.locale()]);
            if (signature === this.signature && UiSurfaces.active(this)) { this.refreshers.forEach(run => run()); return; }
            this.signature = signature; this.refreshers = [];
            const root = UiSurfaces.root(), panel = UiSurfaces.panel(UiSurfaces.element((UiSurfaces.Host.width() - width) / 2, (UiSurfaces.Host.height() - height) / 2, width, height));
            root.addChild(panel);
            const heading = UiSurfaces.label(panel, UiSurfaces.fit(text("heading", name), width - 126), 14, 15, width - 126);
            UiSurfaces.tooltip(heading, [UiSurfaces.plain(text("heading", name))]);
            UiSurfaces.button(panel, text("refresh"), width - 103, 8, 62, 23, refresh);
            UiSurfaces.tooltip(UiSurfaces.button(panel, "×", width - 34, 8, 22, 23, this.close), [UiSurfaces.plain({key:"worldcombat.ui.close"})]);
            const about = UiSurfaces.label(panel, "", 14, 39, width - 28, colors.muted);
            this.refreshers.push(() => {const value=this.nature?text("nature",this.nature):rows?"":text("loading");about.setText(UiSurfaces.text(UiSurfaces.fit(value,width-28)));UiSurfaces.tooltip(about,[UiSurfaces.plain(value)]);});
            const scroll = UiSurfaces.scroll(panel, 12, 61, width - 24, Math.max(30, height - 99)), content = UiSurfaces.scrollContent(scroll), innerWidth = width - 44;
            this.scroll = scroll;
            const groups: string[] = [];
            this.rows.forEach(row => { if (groups.indexOf(row.group) < 0) groups.push(row.group); });
            const sections: {group:string;heading:any;body:any;height:number}[] = [];
            const layout = () => {
                const position = UiSurfaces.scrollPosition(scroll); let y = 0;
                sections.forEach(section => {
                    const folded = !!this.folded[identity + "/" + section.group];
                    section.heading.lss("top", y);section.heading.setText(UiSurfaces.text((folded?"▸ ":"▾ ") + UiSurfaces.plain(text("group." + section.group))));
                    section.body.lss("top",y+29).lss("display",folded?"none":"flex");y += 29+(folded?0:section.height)+9;
                });content.lss("height",Math.max(30,y));UiSurfaces.restoreScroll(scroll,position);
            };
            groups.forEach(group => {
                const key=identity+"/"+group, header=UiSurfaces.button(content,"",0,0,innerWidth,23,()=>{this.folded[key]=!this.folded[key];layout();});
                const body=UiSurfaces.element(0,0,innerWidth,0);content.addChild(body);let y=0;
                this.rows.filter(row => row.group === group).forEach((row,index) => {
                    const captionWidth=Math.floor(innerWidth*.67)-18,valueWidth=innerWidth-captionWidth-30;
                    const lines=UiSurfaces.lines(UiSurfaces.plain(row.label),captionWidth),rowHeight=Math.max(28,lines.length*12+12);
                    const tile=UiSurfaces.surface(UiSurfaces.element(0,y,innerWidth,rowHeight),index%2?0x442b393b:0x702b393b,0);body.addChild(tile);
                    const caption = UiSurfaces.label(tile, lines.join("\n"), 9, 7, captionWidth);caption.lss("height",rowHeight-10);
                    const value = UiSurfaces.align(UiSurfaces.label(tile, "", innerWidth-valueWidth-10, 7, valueWidth, colors.accent),"right");
                    this.refreshers.push(() => {
                        const current = this.rows.filter(item => item.id === row.id)[0] || row;
                        value.setText(UiSurfaces.text(UiSurfaces.fit(display(current.value, current.format),valueWidth)));
                        const lines = explanation(current); UiSurfaces.tooltip(caption, lines); UiSurfaces.tooltip(value, lines);
                    });
                    y += rowHeight+2;
                });
                body.lss("height",y);sections.push({group,heading:header,body,height:y});
            });
            if (!rows) UiSurfaces.label(content, text("loading"), 6, 12, innerWidth-12,colors.muted);
            else if(!rows.length) UiSurfaces.wrap(UiSurfaces.label(content,text("empty"),6,12,innerWidth-12,colors.muted)).lss("height",30);
            layout();
            this.footer = UiSurfaces.wrap(UiSurfaces.label(panel, this.message || text("footer"), 14, height - 29, width - 28,colors.muted));this.footer.lss("height",25);
            this.refreshers.forEach(run => run()); UiSurfaces.open(root, text("title"), this);UiSurfaces.restoreScroll(scroll,this.offsets[identity]||0);
        }
    }
}
