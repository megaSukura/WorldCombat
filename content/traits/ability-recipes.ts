/** Composable recipes used by independent ability units. */
namespace NativeAbilityRecipes {
    export type Context = NativeAbilities.Context;
    export type Hook = (context: Context, value: any, trait: string) => void;
    function ensure(id: string): void { if (!NativeAbilities.registry.has(id)) NativeAbilities.define(id); }
    export function property(id: string, key: string, value: any): void {
        ensure(id); var data: any = {}; data[key] = value; NativeAbilities.registry.extend(id, { data: data });
    }
    export function on(id: string, event: string, hook: Hook): void {
        ensure(id); var hooks: any = {}; hooks[event] = hook; NativeAbilities.registry.extend(id, { hooks: hooks });
    }
    export function boost(context: Context, stat: string, amount: number, ignore?: boolean): void { NativeEffects.boost(context.world!, context.actor!, stat, amount, ignore); }
    export function heal(context: Context, ratio: number): void {
        NativeEffects.heal(context.world!, context.actor!, context.pokemon, context.pokemon.maxHealth() * ratio, "ability");
    }
    /** Absorbs damage of one move type; ordinary damage carries no type and passes through. */
    export function absorption(ids: string, type: string, recovery: number, stat?: string, stages = 1): void {
        on(ids, "incoming", function (context, data) {
            if (data.type !== type) return;
            data.amount = 0;
            if (recovery) heal(context, recovery);
            if (stat) boost(context, stat, stages);
        });
    }
    /** The condition sees every incoming hit; move fields (type, category, contact) are absent on ordinary damage. */
    export function incoming(ids: string, condition: (context: Context, data: any) => boolean, factor: number): void {
        on(ids, "incoming", function (context, data) { if (condition(context, data)) data.amount *= factor; });
    }
    export function power(ids: string, condition: (c: Context, d: any) => boolean, factor: number): void {
        on(ids, "move", function (c, d) { if (condition(c, d)) d.power *= factor; });
    }
}
