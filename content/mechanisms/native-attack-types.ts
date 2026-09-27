/** Opt-in elemental conversions of real native attacks, preserving their original damage and provenance. */
namespace NativeAttackTypes {
    export interface Context extends NativeEffects.Hit { baseType: string; type: string; }
    /** Exact native damage ids/tags can declare a base element. Unknown mod attacks stay unknown. */
    export const classifications = new WorldContributions.Registry<Context>();
    /** Content opts a known native attack into type interactions by changing its element. */
    export const conversions = new WorldContributions.Registry<Context>();
    const normal = ["minecraft:mob_attack", "minecraft:mob_attack_no_aggro", "minecraft:player_attack", "minecraft:sting",
        "minecraft:ram", "minecraft:mace_smash", "minecraft:arrow", "minecraft:trident", "minecraft:thrown"];
    classifications.define({ id: "world_combat:native_attack/physical", apply: context => {
        if (normal.indexOf(String(context.data.damageType)) >= 0) context.baseType = "normal";
    } });
    DamageSemantics.adaptations.define({ id: "world_combat:native_attack/types", apply: hit => {
        const data = hit.data;
        if (data.scripted || data.kind || data.calculation || !(data.amount > 0) || data.bypassesInvulnerability
            || !DamageSemantics.read(data).attack || !hit.world.valid(hit.source) || !hit.world.valid(hit.target)) return;
        const context: Context = { world: hit.world, source: hit.source, target: hit.target, data, baseType: "", type: "" };
        classifications.apply(context);
        if (!context.baseType) return;
        context.type = context.baseType;
        conversions.apply(context);
        // Unmodified native combat retains its existing rules. Merely identifying a sword is not
        // a request to turn every vanilla attack into a Pokemon move.
        if (!context.type || context.type === context.baseType) return;
        const source = PokemonDamage.combatants.read(hit.world, hit.source), target = PokemonDamage.combatants.read(hit.world, hit.target);
        let factor = 1;
        target.types.forEach(type => factor *= CobblemonCombat.typeEffectiveness(context.type, type));
        data.type = context.type;
        const match: PokemonDamage.EffectivenessContext = { world: hit.world, actor: hit.source, target: hit.target,
            sourceFacts: source, targetFacts: target, move: null, preview: false, data,
            moveType: context.type, targetTypes: target.types.slice(), effectiveness: factor };
        PokemonDamage.effectiveness.apply(match);
        if (!isFinite(match.effectiveness) || match.effectiveness < 0) throw new Error("Invalid native type effectiveness");
        data.nativeBaseType = context.baseType;
        data.effectiveness = match.effectiveness;
        data.sameTypeMultiplier = PokemonDamage.sameType(source, context.type);
        data.sameTypeType = context.type;
        data.amount *= data.sameTypeMultiplier * data.effectiveness;
        if (data.amount === 0) PokemonDamage.immune(hit.world, hit.target, JSON.stringify(data));
    } });
}
