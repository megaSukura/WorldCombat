/** Read-only native-stat inspector. Stable widgets preserve hover and scroll on RPC updates. */
namespace AttributeView {
    export interface Row { id: string; label: any; description: any; group: string; format: string; value: any; sources: any[]; unknown?: any[]; }
    const text = (id: string, ...args: any[]) => ({ key: "worldcombat.attributes." + id, args });
    function display(value: any, format = "number"): string {
        if (typeof value !== "number") return typeof value === "object" ? JSON.stringify(value) : UiSurfaces.plain(value);
        const number = Math.round(value * (format === "percent" ? 100 : 1) * 100) / 100;
        return (format === "bonus" && number > 0 ? "+" : "") + number + (format === "percent" || format === "bonus" ? "%" : format === "multiplier" ? "×" : "");
    }
    function explanation(row: Row): string[] {
        const lines = [UiSurfaces.plain(row.description)];
        const add = (source: any, depth: number) => {
            lines.push(new Array(depth + 1).join("  ") + UiSurfaces.plain(source.label || source.id) + ": " + display(source.value) +
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
        private refreshers: (() => void)[] = [];
        private footer: any = null;
        private message: any = null;
        notice(value: any): void { this.message = value; if (this.footer) this.footer.setText(UiSurfaces.text(value || text("footer"))); }
        constructor(private close: () => void) {}
        invalidate(): void { this.signature = ""; this.footer = null; this.message = null; }
        present(identity: string, name: string, rows: Row[] | null, nature: any, refresh: () => void): void {
            this.identity = identity; this.rows = rows || [];
            const width = Math.min(510, UiSurfaces.Host.width() - 20), height = Math.min(380, UiSurfaces.Host.height() - 20);
            const signature = JSON.stringify([identity, name, nature, this.rows.map(row => [row.id, row.group]), width, height, UiSurfaces.locale()]);
            if (signature === this.signature && UiSurfaces.active(this)) { this.refreshers.forEach(run => run()); return; }
            this.signature = signature; this.refreshers = [];
            const root = UiSurfaces.root(), panel = UiSurfaces.panel(UiSurfaces.element((UiSurfaces.Host.width() - width) / 2, (UiSurfaces.Host.height() - height) / 2, width, height));
            root.addChild(panel);
            UiSurfaces.label(panel, text("heading", name), 14, 14, width - 126);
            UiSurfaces.button(panel, text("refresh"), width - 103, 8, 62, 23, refresh);
            UiSurfaces.button(panel, "×", width - 34, 8, 22, 23, this.close);
            const about = UiSurfaces.label(panel, nature ? text("nature", nature) : text("loading"), 14, 38, width - 28);
            this.refreshers.push(() => about.setText(UiSurfaces.text(nature ? text("nature", nature) : text("loading"))));
            const scroll = UiSurfaces.scroll(panel, 14, 61, width - 28, height - 90), content = UiSurfaces.scrollContent(scroll);
            const groups: string[] = [];
            this.rows.forEach(row => { if (groups.indexOf(row.group) < 0) groups.push(row.group); });
            let y = 0;
            groups.forEach(group => {
                UiSurfaces.label(content, text("group." + group), 2, y, width - 55, 0xff476650); y += 24;
                this.rows.filter(row => row.group === group).forEach(row => {
                    const caption = UiSurfaces.label(content, row.label, 5, y + 4, (width - 58) * .66);
                    const value = UiSurfaces.label(content, "", (width - 58) * .69, y + 4, (width - 58) * .28, 0xff294e64);
                    this.refreshers.push(() => {
                        const current = this.rows.filter(item => item.id === row.id)[0] || row;
                        value.setText(UiSurfaces.text(display(current.value, current.format)));
                        const lines = explanation(current); UiSurfaces.tooltip(caption, lines); UiSurfaces.tooltip(value, lines);
                    });
                    y += 27;
                });
                y += 7;
            });
            if (!rows) UiSurfaces.label(content, text("loading"), 2, 8, width - 55);
            content.lss("height", Math.max(30, y));
            this.footer = UiSurfaces.label(panel, this.message || text("footer"), 14, height - 21, width - 28);
            this.refreshers.forEach(run => run()); UiSurfaces.open(root, text("title"), this);
        }
    }
}
