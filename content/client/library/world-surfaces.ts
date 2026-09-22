/** Anchored panels, floating feedback and targeting overlays with open data projectors and row renderers. */
namespace WorldSurfaces {
    /** One receipt fans out once to independent presentation channels, even when another channel is full. */
    export class Results {
        private consumers: { [id: string]: (event: any) => void } = Object.create(null);
        private seen: UiState.LeaseMap<boolean>;
        constructor(now: () => number) { this.seen = new UiState.LeaseMap<boolean>(now, 512); }
        listen(id: string, consume: (event: any) => void): void {
            if (this.consumers[id]) throw new Error("Duplicate result channel " + id); this.consumers[id] = consume;
        }
        publish(key: string, event: any, lifetime: number): void {
            if (!this.seen.once(key, true, lifetime)) return;
            Object.keys(this.consumers).forEach(id => {
                try { this.consumers[id](event); }
                catch (failure) { Java.loadClass("dev.worldcombat.core.client.ClientPresentation").reportFailure("result/" + id, String(failure)); }
            });
        }
        clear(): void { this.seen.clear(); }
    }
    export interface Row { kind: string; height?: number; [key: string]: any; }
    export interface Card { actor: string; rows: Row[]; selected?: boolean; width?: number; background?: number; accent?: number; scale?: number; distance?: number; offset?: number; }
    export interface Record { actor: string; data: any; priority?: number; }
    export interface Floating { start: number; duration: number; position?: number[] | null; actor?: string; text?: string; color?: number; lane?: number; offset?: number; renderer?: string;
        priority?: number; amount?: number; count?: number; mergeKey?: string; format?: (value: Floating) => string; [key: string]: any; }
    export interface Overlay { actor?: string; point?: number[]; rows: Row[]; width?: number; offset?: number; scale?: number; background?: number; }
    export interface RowContext { frame: CombatClientFrame; row: Row; x: number; y: number; width: number; }
    const rowTypes: { [id: string]: { height: number; draw: (context: RowContext) => void } } = Object.create(null);
    export function row(id: string, height: number, draw: (context: RowContext) => void): void {
        if (!id || rowTypes[id]) throw new Error("Duplicate world row renderer: " + id); rowTypes[id] = { height, draw };
    }
    row("text", 11, context => context.frame.text(String(context.row.text || ""), context.x, context.y, (context.row.color || 0xffe8eef2) | 0, context.width));
    row("columns", 11, context => {
        const split = context.row.split || .75;
        context.frame.text(String(context.row.left || ""), context.x, context.y, (context.row.color || 0xffe8eef2) | 0, Math.floor(context.width * split));
        context.frame.text(String(context.row.right || ""), context.x + context.width * split, context.y, (context.row.secondary || 0xffc3d2db) | 0, Math.floor(context.width * (1 - split)));
    });
    row("meter", 6, context => {
        const ratio = Math.max(0, Math.min(1, Number(context.row.value || 0))), height = context.row.thickness || 2;
        UiSurfaces.rect(context.frame, context.x, context.y, context.width, height, context.row.track || 0xff344854, 1);
        UiSurfaces.rect(context.frame, context.x, context.y, Math.max(.1, context.width * ratio), height, context.row.color || 0xff94c8dc, 1);
    });
    row("pips", 10, context => {
        const labelWidth = context.row.label ? context.row.labelWidth || 31 : 0;
        if (labelWidth) context.frame.text(String(context.row.label), context.x, context.y, (context.row.labelColor || 0xffd9e4ec) | 0, labelWidth);
        const count = Math.max(1, Math.min(64, Number(context.row.maximum || 1))), step = Math.min(12, (context.width - labelWidth) / count);
        for (let index = 0; index < count; index++) UiSurfaces.rect(context.frame, context.x + labelWidth + index * step, context.y + 1, Math.max(1, step - 4), 5,
            index < context.row.value ? context.row.color || 0xffb2dcec : context.row.track || 0xff46545e, 2);
    });
    function height(rows: Row[]): number { return rows.reduce((sum, value) => sum + (value.height === undefined ? rowTypes[value.kind] ? rowTypes[value.kind].height : 11 : value.height), 0); }
    function drawRows(frame: CombatClientFrame, rows: Row[], width: number, top: number): void {
        let y = top;
        rows.forEach(value => { const renderer = rowTypes[value.kind]; if (renderer) renderer.draw({ frame, row: value, x: -width / 2 + 7, y, width: width - 14 }); y += value.height === undefined ? renderer ? renderer.height : 11 : value.height; });
    }
    export class Layer {
        private clocks: any;
        private worldValue: any = undefined;
        private stores: { [key: string]: UiState.LeaseMap<any> } = Object.create(null);
        private sources: { id: string; read: () => Record[] }[] = [];
        private floats: UiState.LeaseMap<Floating>;
        private seen: UiState.LeaseMap<boolean>;
        private records: UiState.LeaseMap<Record>;
        private overlayValue: Overlay | null = null;
        private serial = 0;
        private floatingRenderers: { [id: string]: (frame: CombatClientFrame, value: Floating, age: number) => void } = Object.create(null);
        constructor(private options: { id: string; project(actor: string, data: any, anchor: any): Card | null;
            clock?: () => number; world?: () => any; reset?(): void; before?(): void; limit?: number; }) {
            let presentation: any = null, minecraft: any = null;
            this.clocks = { now: options.clock || (() => Number((presentation || (presentation = Java.loadClass("dev.worldcombat.core.client.ClientPresentation"))).serverTick())),
                world: options.world || (() => (minecraft || (minecraft = Java.loadClass("net.minecraft.client.Minecraft"))).getInstance().level) };
            this.floats = this.store<Floating>("__floats", 48); this.records = this.store<Record>("__cards", 48);
            this.seen = this.store<boolean>("__seen", 512);
            this.floatingRenderer("text", (frame, value, age) => {
                const alpha = Math.round(255 * Math.min(1, (value.duration - age) / 12));
                const text = value.format ? value.format(value) : String(value.text || ""), width = Math.min(190, Math.max(45, frame.textWidth(text)));
                frame.wrappedText(text, Math.round(-width / 2), -9, (alpha << 24 | (value.color || 0xffeff4f7) & 0xffffff) | 0, width, 3);
            });
            WorldCombatClient.world(options.id, 1, frame => this.draw(frame));
            WorldCombatClient.cleanup(options.id, () => this.reset());
        }
        now(): number { return this.clocks.now(); }
        check(): void { const current = this.clocks.world(); if (current !== this.worldValue) { this.reset(); this.worldValue = current; } }
        reset(): void { Object.keys(this.stores).forEach(key => this.stores[key].clear()); this.overlayValue = null; if (this.options.reset) this.options.reset(); }
        store<T>(id: string, limit = 256): UiState.LeaseMap<T> { return this.stores[id] || (this.stores[id] = new UiState.LeaseMap<T>(() => this.now(), limit)); }
        card(key: string, record: Record, lifetime: number): void { this.check(); this.records.put(key, record, lifetime); }
        removeCard(key: string): void { this.records.remove(key); }
        source(id: string, read: () => Record[]): void { if (this.sources.some(source => source.id === id)) throw new Error("Duplicate world card source: " + id); this.sources.push({ id, read }); }
        floatingRenderer(id: string, draw: (frame: CombatClientFrame, value: Floating, age: number) => void): void {
            if (this.floatingRenderers[id]) throw new Error("Duplicate floating renderer: " + id); this.floatingRenderers[id] = draw;
        }
        float(key: string, value: Floating): boolean {
            this.check(); if (!isFinite(value.start) || !isFinite(value.duration) || value.duration <= 0 || this.now() >= value.start + value.duration) return false;
            if (!this.seen.once(key, true, value.duration + 20)) return false;
            const all = this.floats.values(), priority = value.priority || 0;
            if (value.mergeKey && priority < 2) {
                const existing = all.filter(item => item.mergeKey === value.mergeKey && this.now() - item.start < 8)[0];
                if (existing) {
                    existing.amount = (existing.amount || 0) + (value.amount || 0); existing.count = (existing.count || 1) + 1;
                    return true;
                }
            }
            if (all.length >= 48) {
                const ordered = all.slice().sort((a, b) => (a.priority || 0) - (b.priority || 0) || a.start - b.start);
                if ((ordered[0].priority || 0) > priority) return false;
                this.floats.remove(ordered[0]._key);
            }
            const stored: any = {}; Object.keys(value).forEach(name => { stored[name] = value[name]; });
            stored._key = key; stored.count = 1;
            if (value.position) stored.position = value.position.slice();
            if (stored.lane === undefined) {
                const local = all.filter(item => item.actor === value.actor && this.now() - item.start < 20);
                stored.lane = local.length % 4; stored.side = this.serial++ % 2 ? 1 : -1;
            }
            return this.floats.once(key, stored, value.start + value.duration - this.now());
        }
        overlay(value: Overlay | null): void { this.check(); this.overlayValue = value; }
        private draw(frame: CombatClientFrame): void {
            this.check(); if (this.options.before) this.options.before();
            let records = this.records.values(); this.sources.forEach(source => { records = records.concat(source.read()); });
            const actors: { [key: string]: any } = Object.create(null);
            records.sort((a, b) => (a.priority || 0) - (b.priority || 0)).forEach(record => {
                const data = actors[record.actor] || (actors[record.actor] = {});
                Object.keys(record.data || {}).forEach(key => { if (record.data[key] !== undefined) data[key] = record.data[key]; });
            });
            Object.keys(actors).slice(0, this.options.limit || 20).forEach(actor => {
                const anchor = JSON.parse(frame.anchor(actor)); if (!anchor) return;
                const model = this.options.project(actor, actors[actor], anchor); if (!model || anchor.distance > (model.distance || (model.selected ? 32 : 20))) return;
                const width = model.width || 112, size = height(model.rows) + 10;
                frame.billboard(actor, model.offset || .36, model.scale || (model.selected ? .015 : .013), surface => {
                    UiSurfaces.rect(surface, -width / 2, -size, width, size, model.background || 0xe625343f, 5);
                    UiSurfaces.rect(surface, -width / 2, -size, 3, size, model.accent || 0xff9ecbdc, 1);
                    drawRows(surface, model.rows, width, -size + 5);
                });
            });
            this.floats.values().forEach(value => {
                const age = Math.max(0, this.now() - value.start);
                if (!value.position && value.actor) { const anchor = JSON.parse(frame.anchor(value.actor)); if (anchor) { value.position = [anchor.x, anchor.y, anchor.z]; value.offset = anchor.height + .2; } }
                const point = value.position; if (!point || point.length !== 3) return;
                if (value.offset == null) { const anchor = value.actor && JSON.parse(frame.anchor(value.actor)); value.offset = anchor ? Math.max(.5, anchor.height * .65) : .65; }
                const renderer = this.floatingRenderers[value.renderer || "text"]; if (!renderer) return;
                const distance = frame.distance(point[0], point[1], point[2]), important = (value.priority || 0) >= 2;
                const pixel = Math.max(.018, Math.min(.065, distance * .0022)) * (important ? 1.2 : 1);
                const rise = .25 * (1 - Math.exp(-age / 6)) + age * .008, lane = value.lane || 0;
                frame.billboard(point[0] + (value.side || 0) * lane * .12, point[1] + value.offset! + rise + lane * .3,
                    point[2], pixel, surface => renderer(surface, value, age));
            });
            const overlay = this.overlayValue; if (!overlay) return;
            const width = overlay.width || 98, size = height(overlay.rows) + 10;
            const draw = (surface: CombatClientFrame) => { UiSurfaces.rect(surface, -width / 2, -size, width, size, overlay.background || 0xed294956, 7); drawRows(surface, overlay.rows, width, -size + 5); };
            if (overlay.actor) frame.billboard(overlay.actor, overlay.offset || .75, overlay.scale || .017, draw);
            else if (overlay.point) frame.billboard(overlay.point[0], overlay.point[1] + (overlay.offset || .5), overlay.point[2], overlay.scale || .018, draw);
        }
    }
}
