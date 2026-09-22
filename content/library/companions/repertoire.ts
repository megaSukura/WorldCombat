/** Optional native-move content contributes to a shared catalogue; companion behavior can exist with it empty. */
namespace CompanionRepertoire {
    export const catalogue = NativeRepertoire.create({ namespace: "world_combat", legacyNamespaces: ["verdant"] });
    export function describe(world: CombatWorld, actor: CombatActor, id: string): PokemonBehaviorHost.Skill | null {
        const skill = catalogue.skills[id];
        if (!skill) return null;
        const config = catalogue.config(world, actor, id), pokemon = CobblemonCombat.pokemon(actor);
        const resolved = skill.resolve ? skill.resolve(pokemon, config, world, actor) : skill;
        return { range: resolved.range === undefined ? skill.range : resolved.range, kind: skill.kind, config };
    }
    NativeCompanionMenus.install("world_combat", catalogue.menus, catalogue.skills);
    catalogue.installChannel();
}
