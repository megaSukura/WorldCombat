namespace PokemonSkills {
    MoveExecutions.declarations.define({ id: "world_combat:skills/execution", apply: context => {
        let id = context.move === null ? String(context.action.content()).replace(/^world_combat:/, "") : String(context.move.id());
        if (!skills[id]) return;
        if (context.move === null) context.move = CobblemonCombat.moveTemplate(id);
        context.features = damageSegments(id).map(segment => damageFeatures(id, segment, {
            action: context.action, world: context.world, actor: context.actor, skill: skills[id]
        }));
    } });
}
