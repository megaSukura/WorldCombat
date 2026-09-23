/** Public values have actual consumers; labels and explanations travel as translation keys. */
namespace PokemonAttributes {
    export const finite = (value: any): value is number => typeof value === "number" && isFinite(value);
    export const nonnegative = (value: any): value is number => finite(value) && value >= 0;
    const text = (id: string): RuleValues.Text => ({ key: "worldcombat.attributes." + id });
    function native(id: string, group: string, read: (pokemon: CombatPokemon) => number): void {
        IndividualAttributes.define<number>("world_combat:" + id, { label: text(id), description: text(id + ".help"), group, valid: nonnegative,
            base: scope => scope.fact("native:" + id, text("source.native"), read(scope.context.pokemon)) });
    }
    native("level", "growth", pokemon => pokemon.level());
    native("health", "combat", pokemon => pokemon.health());
    native("max_health", "combat", pokemon => pokemon.maxHealth());
    ["atk", "def", "spa", "spd", "spe"].forEach(id => IndividualAttributes.define<number>("world_combat:"+id, {
        label:text(id),description:text(id+".help"),group:"combat",valid:nonnegative,
        base:scope=>{
            const context=scope.context,pokemon=context.pokemon;
            const state=context.world&&context.actor?NativeEffects.read(context.world,context.actor):NativeEffects.empty();
            const base=scope.fact("native:"+id,text("source.native"),pokemon.stat(id));
            const adjusted=NativeEffects.stat(pokemon,state,id),stage=NativeEffects.stage(state,id),factor=NativeEffects.multiplier(stage);
            if(adjusted!==base)scope.term("temporary:"+id,text("source.temporary_stat"),adjusted-base,"+");
            scope.fact("stage:"+id,text("source.stat_stage"),stage);
            if(factor!==1)scope.term("stage-factor:"+id,text("source.stage_multiplier"),factor,"×");
            return adjusted*factor;
        }
    }));
    native("friendship", "growth", pokemon => pokemon.friendship());
    // Cobblemon stores species weight in hectograms; this informational value uses kilograms.
    native("mass", "growth", pokemon => pokemon.weight() / 10);
    function critical(scope: RuleValues.Scope<IndividualAttributes.Context>): PokemonDamage.CriticalProfile {
        const context = scope.context, pokemon = context.pokemon;
        const state = context.world && context.actor ? NativeEffects.read(context.world, context.actor) : NativeEffects.empty();
        const ability = NativeEffects.ability(pokemon, state), held = NativeEffects.item(pokemon, state);
        const result = PokemonDamage.criticalProfile(undefined, ability, held, String(pokemon.species()));
        scope.fact("critical:base", text("source.critical_base"), result.baseChance);
        if (ability) scope.fact("native:ability", { key: "cobblemon.ability." + ability }, result.abilityStage);
        if (held) scope.fact("native:item", { key: String(pokemon.heldDescriptionId()) }, result.itemStage);
        return result;
    }
    IndividualAttributes.define<number>("world_combat:critical_chance", { label: text("critical_chance"), description: text("critical_chance.help"),
        group: "combat", format: "percent", valid: nonnegative, base: scope => critical(scope).chance });
    IndividualAttributes.define<number>("world_combat:critical_multiplier", { label: text("critical_multiplier"), description: text("critical_multiplier.help"),
        group: "combat", format: "multiplier", valid: nonnegative, base: scope => critical(scope).multiplier });
    IndividualAttributes.define<number>("world_combat:skill_haste", { label: text("skill_haste"), description: text("skill_haste.help"),
        group: "combat", nativeAttribute: "world_combat:skill_haste", base: 0, valid: value => finite(value) && value > -100, writable: true });
    IndividualAttributes.define<number>("world_combat:healing_received", { label: text("healing_received"), description: text("healing_received.help"),
        group: "combat", format: "bonus", nativeAttribute: "world_combat:healing_received", base: 0, valid: value => finite(value) && value >= -100, writable: true });
    // These three values already alter the shared AI's exploration, retreat and persistence decisions.
    ["curiosity", "risk", "persistence"].forEach(id => IndividualAttributes.define<number>("world_combat:" + id,
        { label: text(id), description: text(id + ".help"), group: "personality", nativeAttribute: "world_combat:" + id, base: 0, valid: finite, writable: true }));

    export function value<T, C>(scope: RuleValues.Scope<C>, context: IndividualAttributes.Context, id: string): T {
        const result = IndividualAttributes.inspect<T>(context, id);
        scope.sources.push({ id, label: IndividualAttributes.rules.label(id), value: result.value, sources: result.sources });
        scope.unknown = scope.unknown.concat(result.unknown); return result.value;
    }
    /** Preview helper. Commit receives the authored duration; ActionCooldowns applies haste once at final reservation. */
    export function cooldown<C>(scope: RuleValues.Scope<C>, context: IndividualAttributes.Context, ticks: number): number {
        const haste = value<number, C>(scope, context, "world_combat:skill_haste");
        return Math.max(0, Math.round(ticks * 100 / (100 + haste)));
    }
    export function receivedHealing(context: IndividualAttributes.Context, amount: number): number {
        return amount * (1 + IndividualAttributes.read<number>(context, "world_combat:healing_received") / 100);
    }
    NativeEffects.healing.define({ id: "world_combat:healing_received", apply: context => {
        context.amount = receivedHealing(IndividualAttributes.live(context.world, context.actor), context.amount);
    } });
}
