/** Values carry their actual inputs. A caller owns the context, valid range and commit boundary. */
namespace RuleValues {
    export interface Text { key: string; args?: any[]; fallback?: string; }
    export interface Result<T> { value: T; sources: Source[]; unknown: Text[]; explanation?: Formula.Explanation; }
    export interface Source { id: string; label: Text | string; value: any; operation?: string; sources?: Source[]; }
    export type Formula<C, T> = T | ((scope: Scope<C>) => T);
    export interface Definition<C, T> { value: Formula<C, T>; label?: Text | string; valid?: (value: T) => boolean; }
    interface FormulaModifier { id: string; operation: string; node: Formula.Node; }
    export class Registry<C> {
        factsOf?: (context: C) => Formula.Facts;
        private definitions: { [id: string]: Definition<C, any> } = Object.create(null);
        private modifiers: { [id: string]: { id: string; apply: (scope: Scope<C>, value: any) => any }[] } = Object.create(null);
        /** Formula trees replace the legacy scope path for the parameters that have one. */
        private formulas: { [id: string]: Formula.Node } = Object.create(null);
        private compiled: { [id: string]: (facts: Formula.Facts) => number } = Object.create(null);
        private pending: { [id: string]: FormulaModifier[] } = Object.create(null);
        define<T>(id: string, definition: Definition<C, T>): void {
            if (this.definitions[id]) throw new Error("Duplicate value: " + id);
            this.definitions[id] = definition;
        }
        has(id: string): boolean { return !!this.definitions[id]; }
        label(id: string, value?: Text | string): Text | string {
            const definition = this.definitions[id];
            if (!definition) throw new Error("Missing value: " + id);
            if (value !== undefined) definition.label = value;
            return definition.label || id;
        }
        contribute(id: string, contributor: string, apply: (scope: Scope<C>, value: any) => any): void {
            const list = this.modifiers[id] || (this.modifiers[id] = []);
            if (list.some(item => item.id === contributor)) throw new Error("Duplicate value contribution: " + contributor);
            list.push({ id: contributor, apply });
        }
        remove(id: string, contributor: string): void { this.modifiers[id] = (this.modifiers[id] || []).filter(item => item.id !== contributor); }
        /** Attach the defining tree and compile it once; pending modifiers bake in here. */
        formula(id: string, node: Formula.Node): void {
            let value = node;
            const list = this.pending[id];
            if (list) { list.forEach(item => { value = item.operation === "×" ? value.times(item.node) : value.plus(item.node); }); delete this.pending[id]; }
            this.formulas[id] = value;
            this.compiled[id] = Formula.compile(value);
        }
        hasFormula(id: string): boolean { return !!this.formulas[id]; }
        formulaNode(id: string): Formula.Node { return this.formulas[id]; }
        formulaValue(id: string, facts: Formula.Facts): number {
            const compiled = this.compiled[id];
            if (!compiled) throw new Error("Missing formula: " + id);
            return compiled(facts);
        }
        explain(id: string, facts: Formula.Facts): Formula.Explanation {
            const node = this.formulas[id];
            if (!node) throw new Error("Missing formula: " + id);
            return Formula.explain(node, facts);
        }
        /** A modifier is a named term; it joins the tree as `+ value` or `× value`. */
        modify(id: string, contributor: string, operation: "+" | "×", node: Formula.Node): void {
            if (!Formula.labeled(node)) throw new Error("Formula modifier needs a label: " + id + "/" + contributor);
            if (this.formulas[id]) {
                this.formula(id, operation === "×" ? this.formulas[id].times(node) : this.formulas[id].plus(node));
                return;
            }
            const list = this.pending[id] || (this.pending[id] = []);
            if (list.some(item => item.id === contributor)) throw new Error("Duplicate value contribution: " + contributor);
            list.push({ id: contributor, operation: operation, node: node });
        }
        evaluate<T>(id: string, context: C, path: string[] = [], silent = false): Result<T> {
            if (path.indexOf(id) >= 0) throw new Error("Cyclic value: " + path.concat(id).join(" -> "));
            const definition = this.definitions[id];
            if (!definition) throw new Error("Missing value: " + id);
            const scope = new Scope(context, this, path.concat(id), silent);
            let value: any, explanation: Formula.Explanation | undefined;
            if (this.hasFormula(id)) {
                if (!this.factsOf) throw new Error("Formula value has no facts provider: " + id);
                const facts = Formula.snapshot(this.factsOf(context));
                if (silent) value = this.formulaValue(id, facts);
                else {
                    explanation = this.explain(id, facts); value = explanation.value;
                    explanation.terms.forEach((term, index) => scope.sources.push(explainedSource(id + "/" + index, term)));
                    if (explanation.unavailable && explanation.unavailable.length) scope.missing({ key: "worldcombat.value.unknown" });
                }
            } else value = typeof definition.value === "function" ? definition.value(scope) : definition.value;
            const knownUnknowns = scope.unknown.length;
            (this.modifiers[id] || []).forEach(item => {
                const before = value, start = scope.sources.length;
                value = item.apply(scope, value);
                if (explanation && typeof value === "number" && value !== before) {
                    const label = item.id, previous = explanation;
                    // Scope modifiers may implement arbitrary arithmetic. The observed delta records the exact final value.
                    explanation = { value, formula: ["("].concat(<any>previous.formula || [previous.label || String(before)], [")", "+", label]),
                        terms: previous.terms.concat([sourceExplanation({ id: item.id, label, value: value - before, sources: scope.sources.slice(start) })]),
                        note: previous.note, unavailable: previous.unavailable };
                }
            });
            if (explanation && scope.unknown.length > knownUnknowns) explanation.note =
                (explanation.note ? Array.isArray(explanation.note) ? explanation.note : [explanation.note] : []).concat(scope.unknown.slice(knownUnknowns));
            if (typeof value === "number" && !isFinite(value) || definition.valid && !definition.valid(value)) throw new Error("Invalid value: " + id);
            return { value, sources: scope.sources, unknown: scope.unknown, explanation };
        }
    }
    function explainedSource(id: string, item: Formula.Explanation): Source {
        return { id, label: item.label || id, value: item.value, sources: item.terms.map((term, index) => explainedSource(id + "/" + index, term)) };
    }
    function sourceExplanation(source: Source): Formula.Explanation {
        const terms: Formula.Explanation[] = [], notes: Formula.Text[] = [];
        (source.sources || []).forEach(item => {
            if (Formula.fact(item.value) !== undefined) terms.push(sourceExplanation(item));
            else notes.push({ key: "worldcombat.ui.value_line", args: [item.label, item.value] });
        });
        return { label: source.label, value: Number(source.value), terms, note: notes.length ? notes : undefined };
    }
    /** A numeric result can retain data-driven and textual sources when nested in another explanation. */
    export function explanation(result: Result<number>, label: Formula.Text): Formula.Explanation {
        if (result.explanation) return result.explanation;
        const value = sourceExplanation({ id: "", label, value: result.value, sources: result.sources });
        value.note = (Array.isArray(value.note) ? value.note : value.note ? [value.note] : []).concat(result.unknown);
        return value;
    }
    export class Scope<C> {
        sources: Source[] = [];
        unknown: Text[] = [];
        constructor(public context: C, private registry: Registry<C>, private path: string[], public silent = false) {}
        fact<T>(id: string, label: Text | string, value: T): T { if (!this.silent) this.sources.push({ id, label, value }); return value; }
        read<T>(id: string): T {
            const result = this.registry.evaluate<T>(id, this.context, this.path, this.silent);
            if (!this.silent) { this.sources.push({ id, label: this.registry.label(id), value: result.value, sources: result.sources }); this.unknown = this.unknown.concat(result.unknown); }
            return result.value;
        }
        missing(label: Text): void { if (!this.silent) this.unknown.push(label); }
        term(id: string, label: Text | string, value: number, operation = "+"): number {
            if (!this.silent) this.sources.push({ id, label, value, operation }); return value;
        }
    }
}

/** Authored values and their explanations share one registry; preferences belong to each action. */
namespace ActionParameters {
    export interface Contribution { label: string; value: string; description?: string; translationKey?: string; contributions?: Contribution[]; }
    export interface Entry<C> { value: number; label: string; group?: string; unit?: string; presentation?: string; description?: string; formula?: Formula.Node;
        evaluate?: (scope: RuleValues.Scope<C>, base: number) => number;
        visible?: boolean; format?: (value: number, context: C) => string; contributions?: (value: number, context: C) => Contribution[]; }
    export interface Readout extends Contribution { group?: string; }
    export class Registry<C> {
        private actions: { [id: string]: { [key: string]: Entry<C> } } = Object.create(null);
        readonly rules = new RuleValues.Registry<C>();
        /** Turns the live context into the facts a compiled formula reads; it is small and reads on demand. */
        factsOf?: (context: C) => Formula.Facts;
        constructor() {
            this.rules.factsOf = context => {
                if (!this.factsOf) throw new Error("Formula parameter has no facts provider");
                return this.factsOf(context);
            };
        }
        define(id: string, entries: { [key: string]: Entry<C> }): void {
            if (this.actions[id]) throw new Error("Duplicate parameter owner: " + id);
            Object.keys(entries).forEach(key => { if (!isFinite(entries[key].value)) throw new Error("Non-finite action parameter: " + key); });
            this.actions[id] = entries;
            Object.keys(entries).forEach(key => {
                const entry = entries[key];
                this.rules.define<number>(id + "/" + key, { value: scope => entry.evaluate ? entry.evaluate(scope, entry.value) : entry.value });
                if (entry.formula) this.rules.formula(id + "/" + key, entry.formula);
            });
        }
        value(id: string, key: string, context?: C): number {
            const entry = this.actions[String(id)] && this.actions[String(id)][key];
            if (!entry) throw new Error("Missing action parameter: " + id + "/" + key);
            if (context === undefined) return entry.value;
            return this.rules.evaluate<number>(id + "/" + key, context, [], true).value;
        }
        evaluate(id: string, key: string, context: C): RuleValues.Result<number> { return this.rules.evaluate<number>(id + "/" + key, context); }
        entries(id: string): { [key: string]: Entry<C> } { return this.actions[id] || {}; }
        describe(id: string, context: C): Readout[] {
            const entries = this.entries(id);
            return Object.keys(entries).filter(key => entries[key].visible !== false).map(key => {
                const entry = entries[key], value = this.value(id, key, context); return { group: entry.group || "作用参数", label: entry.label,
                    value: entry.format ? entry.format(value, context) : String(value) + (entry.unit || ""), description: entry.description,
                    contributions: entry.contributions ? entry.contributions(value, context) : undefined };
            });
        }
    }
}
