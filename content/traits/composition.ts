/** Open rule composition. Trait identities, hook names and payloads belong to content. */
namespace WorldTraits {
    export interface Bag { [key: string]: any; }
    export interface Definition<C> {
        id: string;
        data?: Bag;
        order?: number;
        applies?: (context: C) => boolean;
        hooks?: { [event: string]: (context: C, value: any, trait: string) => void };
    }
    interface Provider<C> { id: string; read: (context: C) => string[]; }
    function copy(value: any): any { return JSON.parse(JSON.stringify(value)); }
    export class Registry<C> {
        private entries: { [id: string]: Definition<C> } = Object.create(null);
        private providers: Provider<C>[] = [];
        define(definition: Definition<C>): void {
            if (!definition.id || this.entries[definition.id]) throw new Error("Missing or duplicate trait: " + definition.id);
            if (definition.order !== undefined && !isFinite(definition.order)) throw new Error("Invalid trait order");
            var hooks: any = Object.create(null);
            Object.keys(definition.hooks || {}).forEach(function (name) {
                if (!name || typeof definition.hooks![name] !== "function") throw new Error("Invalid trait hook");
                hooks[name] = definition.hooks![name];
            });
            this.entries[definition.id] = { id: definition.id, order: definition.order || 0, applies: definition.applies,
                data: copy(definition.data || {}), hooks: hooks };
        }
        provide(id: string, read: (context: C) => string[]): void {
            if (!id || this.providers.some(function (entry) { return entry.id === id; })) throw new Error("Duplicate trait provider: " + id);
            this.providers.push({ id: id, read: read });
        }
        /** Explicit content overrides and additive contributions keep revisions out of the dispatcher. */
        replace(definition: Definition<C>): void {
            var previous = this.entries[definition.id];
            delete this.entries[definition.id];
            try { this.define(definition); }
            catch (error) { if (previous) this.entries[definition.id] = previous; throw error; }
        }
        remove(id: string): boolean { var exists = !!this.entries[id]; delete this.entries[id]; return exists; }
        extend(id: string, contribution: { data?: Bag; hooks?: Definition<C>["hooks"] }): void {
            var previous = this.entries[id]; if (!previous) throw new Error("Unknown trait: " + id);
            var data = this.data(id), hooks: any = Object.create(null);
            Object.keys(contribution.data || {}).forEach(function (key) { data[key] = copy(contribution.data![key]); });
            Object.keys(previous.hooks || {}).forEach(function (event) { hooks[event] = previous.hooks![event]; });
            Object.keys(contribution.hooks || {}).forEach(function (event) {
                var before = hooks[event], after = contribution.hooks![event];
                if (typeof after !== "function") throw new Error("Invalid trait hook");
                hooks[event] = before ? function (context: C, value: any, trait: string) { before(context, value, trait); after(context, value, trait); } : after;
            });
            this.replace({ id: id, data: data, hooks: hooks, applies: previous.applies, order: previous.order });
        }
        data(id: string): Bag { return this.entries[id] ? copy(this.entries[id].data) : {}; }
        has(id: string): boolean { return !!this.entries[id]; }
        references(context: C, initial: string[] = []): string[] {
            var values = initial.slice(), result: string[] = [], entries = this.entries;
            this.providers.forEach(function (provider) { values = values.concat(provider.read(context)); });
            values.forEach(function (id) {
                if (typeof id !== "string") throw new Error("Trait provider returned a non-string identity");
                var definition = entries[id];
                if (definition && result.indexOf(id) < 0 && (!definition.applies || definition.applies(context))) result.push(id);
            });
            return result.sort(function (a, b) { return (entries[a].order! - entries[b].order!) || (a < b ? -1 : a > b ? 1 : 0); });
        }
        /** The caller owns the payload and may introduce new events without changing this library. */
        dispatch<T>(event: string, context: C, value: T, initial: string[] = []): T {
            var entries = this.entries;
            this.references(context, initial).forEach(function (id) {
                var hook = entries[id].hooks![event]; if (hook) hook(context, value, id);
            });
            return value;
        }
    }
}
