/** Public individual values always have a default. Native facts keep their native authority. */
namespace IndividualAttributes {
    export interface Storage {
        read(key: string): string | null;
        compare(key: string, expected: string | null, value: string | null): boolean;
    }
    export interface Context {
        pokemon: CombatPokemon;
        world: CombatWorld | null;
        actor: CombatActor | null;
        storage: Storage;
    }
    export interface Definition<T> {
        label: RuleValues.Text | string;
        description?: RuleValues.Text | string;
        group?: string;
        format?: "number" | "percent" | "bonus" | "multiplier";
        base: RuleValues.Formula<Context, T>;
        valid(value: T): boolean;
        /** Stored values belong to the individual; computed/native facts use contributions instead. */
        writable?: boolean;
        /** Registered MC Attribute ID. Its native base/modifiers own the value. */
        nativeAttribute?: string;
    }
    const definitions: { [id: string]: Definition<any> } = Object.create(null);
    export const rules = new RuleValues.Registry<Context>();
    function key(id: string): string { return id.replace(":", ":attribute/"); }
    function copy<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
    function valid<T>(id: string, value: T): T {
        const definition = definitions[id];
        if (!definition) throw new Error("Unknown public attribute: " + id);
        if (value === undefined || !definition.valid(value)) throw new Error("Invalid public attribute: " + id);
        return copy(value);
    }
    export function define<T>(id: string, definition: Definition<T>): void {
        if (!/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(id) || definitions[id]) throw new Error("Invalid or duplicate public attribute: " + id);
        definitions[id] = definition;
        rules.define<T>(id, { label: definition.label, valid: definition.valid, value: scope => {
            if (definition.nativeAttribute) {
                const context = scope.context;
                const pokemon = context.world && context.actor ? CobblemonCombat.pokemon(context.actor) : context.pokemon;
                const native = pokemon.attribute(definition.nativeAttribute);
                if (!native) throw new Error("Missing registered MC attribute: " + definition.nativeAttribute);
                scope.fact(id + "/base", { key: "worldcombat.attributes.source.base" }, native.base());
                JSON.parse(String(native.modifiers())).forEach((term: any) => {
                    scope.term(String(term.id), String(term.id), term.amount, term.operation);
                });
                return valid<T>(id, <any>native.value());
            }
            const stored = definition.writable ? scope.context.storage.read(key(id)) : null;
            if (stored !== null) {
                const envelope = JSON.parse(stored);
                if (envelope.schema !== 1) throw new Error("Unsupported attribute storage: " + id);
                return scope.fact(id + "/individual", { key: "worldcombat.attributes.source.individual" }, valid(id, envelope.value));
            }
            const value = typeof definition.base === "function" ? (definition.base as (scope: RuleValues.Scope<Context>) => T)(scope) : definition.base;
            const result = valid(id, value);
            if (!scope.sources.length) scope.fact(id + "/base", { key: "worldcombat.attributes.source.base" }, result);
            return result;
        } });
        if (!definition.nativeAttribute) NativeRuleValues.bind(rules, id, context => context);
    }
    export function ids(): string[] { return Object.keys(definitions); }
    export function has(id: string): boolean { return !!definitions[id]; }
    /** Definitions carry player-facing meaning; the same evaluated values drive the inspector and consumers. */
    export function describe(context: Context): any[] {
        return ids().map(id => {
            const definition = definitions[id], result = inspect<any>(context, id);
            return { id, label: definition.label, description: definition.description || "", group: definition.group || "other",
                format: definition.format || "number", value: result.value, sources: result.sources, unknown: result.unknown };
        });
    }
    export function inspect<T>(context: Context, id: string): RuleValues.Result<T> {
        const result = rules.evaluate<T>(id, context);
        result.value = valid(id, result.value); return result;
    }
    export function read<T>(context: Context, id: string): T { return inspect<T>(context, id).value; }
    /** Mutations compare the raw stored value. Contributions affect reads, never accumulate into storage. */
    export function update<T>(context: Context, id: string, change: (base: T) => T): boolean {
        const definition = definitions[id];
        if (!definition || !definition.writable) throw new Error("Attribute is computed or native: " + id);
        if (definition.nativeAttribute) {
            if (!context.world || !context.actor) throw new Error("Native base writes require a live writable world scope");
            const native = CobblemonCombat.pokemon(context.actor).attribute(definition.nativeAttribute);
            if (!native) throw new Error("Missing registered MC attribute: " + definition.nativeAttribute);
            const value = valid(id, change(<any>native.base()));
            return CobblemonCombat.attributeBase(context.world, context.actor, definition.nativeAttribute, native.base(), <any>value);
        }
        const previous = context.storage.read(key(id));
        let base: T;
        if (previous === null) {
            const scope = new RuleValues.Scope(context, rules, [id]);
            base = typeof definition.base === "function" ? definition.base(scope) : copy(definition.base);
        } else {
            const envelope = JSON.parse(previous);
            if (envelope.schema !== 1) throw new Error("Unsupported attribute storage: " + id);
            base = envelope.value;
        }
        const value = valid(id, change(valid<T>(id, base)));
        return context.storage.compare(key(id), previous, JSON.stringify({ schema: 1, value }));
    }
    export function reset(context: Context, id: string): boolean {
        if (!definitions[id] || !definitions[id].writable) throw new Error("Attribute is computed or native: " + id);
        if (definitions[id].nativeAttribute) return update(context, id, () => {
            const scope = new RuleValues.Scope(context, rules, [id]);
            return typeof definitions[id].base === "function" ? definitions[id].base(scope) : definitions[id].base;
        });
        const previous = context.storage.read(key(id));
        return previous === null || context.storage.compare(key(id), previous, null);
    }
    export function live(world: CombatWorld, actor: CombatActor): Context {
        return { pokemon: CobblemonCombat.pokemon(actor), world, actor, storage: {
            read: id => CobblemonCombat.data(world, actor, id),
            compare: (id, expected, value) => CobblemonCombat.compareData(world, actor, id, expected, value)
        } };
    }
    /** The same values remain available to owned-party UI while the individual is recalled. */
    export function request(request: CombatContentRequest): Context {
        return { pokemon: request.pokemon(), world: request.world ? request.world() : null, actor: request.actor ? request.actor() : null, storage: {
            read: id => request.data(id), compare: (id, expected, value) => request.compareData(id, expected, value)
        } };
    }
}
