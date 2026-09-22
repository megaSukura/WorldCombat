/** Content providers compose a stable command tree from the current individual and loadout. */
namespace CompanionMenus {
    export interface Item {
        id: string; parent?: string; label: any; detail: any; order?: number;
        command?: string; slot?: number; move?: string; target?: string; disabled?: any;
        /** Independent capability represented by this menu item. */
        capability?: string;
        continuous?: boolean;
    }
    export interface Contribution { items?: Item[]; remove?: string[]; }
    export class Commands<Context> {
        private handlers: { [id: string]: (context: Context) => void } = Object.create(null);
        register(id: string, handler: (context: Context) => void): void {
            if (!id || this.handlers[id]) throw new Error("Duplicate content command: " + id);
            this.handlers[id] = handler;
        }
        dispatch(id: string, context: Context): boolean {
            var handler = this.handlers[id]; if (!handler) return false;
            handler(context); return true;
        }
    }
    export class Registry<Context> {
        private providers: { id: string; apply: (context: Context) => Contribution }[] = [];
        provide(id: string, apply: (context: Context) => Contribution): void {
            if (!id || this.providers.some(function (provider) { return provider.id === id; })) throw new Error("Duplicate menu provider: " + id);
            this.providers.push({ id: id, apply: apply });
        }
        resolve(context: Context): Item[] {
            var items: { [id: string]: Item } = Object.create(null), order: string[] = [];
            this.providers.forEach(function (provider) {
                var change = provider.apply(context) || {};
                (change.remove || []).forEach(function (id) { delete items[id]; });
                (change.items || []).forEach(function (item) {
                    if (!item.id || !item.label || item.id === item.parent) throw new Error("Invalid command menu item");
                    if (order.indexOf(item.id) < 0) order.push(item.id);
                    items[item.id] = item;
                });
            });
            function reachable(item: Item, seen: string[]): boolean {
                if (seen.indexOf(item.id) >= 0) throw new Error("Command menu parent cycle");
                return !item.parent || !!items[item.parent] && reachable(items[item.parent], seen.concat([item.id]));
            }
            return order.filter(function (id) { return !!items[id] && reachable(items[id], []); })
                .map(function (id) { return items[id]; }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
        }
    }
}
