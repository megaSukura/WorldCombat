/** Ordered, named contributions. Context and result semantics belong to each consumer. */
namespace WorldContributions {
    export interface Rule<C> { id: string; after?: string[]; before?: string[]; applies?(context: C): boolean; apply(context: C): void; }
    export class Registry<C> {
        private entries: { [id: string]: Rule<C> } = Object.create(null);
        private ordered: Rule<C>[] | null = null;
        define(rule: Rule<C>): void {
            if (!rule.id || this.entries[rule.id]) throw new Error("Duplicate contribution: " + rule.id);
            this.entries[rule.id] = rule; this.ordered = null;
        }
        replace(rule: Rule<C>): void { if (!rule.id) throw new Error("Unnamed contribution"); this.entries[rule.id] = rule; this.ordered = null; }
        remove(id: string): boolean { var found = !!this.entries[id]; delete this.entries[id]; this.ordered = null; return found; }
        has(id: string): boolean { return !!this.entries[id]; }
        private resolve(): Rule<C>[] {
            if (this.ordered) return this.ordered;
            var entries = this.entries, result: Rule<C>[] = [], visiting: string[] = [], done: string[] = [];
            function visit(id: string): void {
                if (done.indexOf(id) >= 0) return;
                if (visiting.indexOf(id) >= 0) throw new Error("Contribution order cycle: " + visiting.concat([id]).join(" -> "));
                visiting.push(id);
                var rule = entries[id];
                (rule.after || []).forEach(function (parent) { if (entries[parent]) visit(parent); });
                Object.keys(entries).sort().forEach(function (parent) { if ((entries[parent].before || []).indexOf(id) >= 0) visit(parent); });
                visiting.pop(); done.push(id); result.push(rule);
            }
            Object.keys(entries).sort().forEach(visit);
            this.ordered = result; return result;
        }
        apply(context: C): C {
            this.resolve().forEach(function (rule) { if (!rule.applies || rule.applies(context)) rule.apply(context); });
            return context;
        }
    }
}
