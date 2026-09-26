/** One carrier owns fire removal; empty remaining types stay empty, and other type sources survive cleanup. */
namespace PokemonSkills {
    const burnupWindow = "world_combat:burnup_window";
    export function burnupSpend(world: CombatWorld, actor: CombatActor, ticks: number): boolean {
        const types = PokemonDamage.combatants.read(world, actor).types.filter(type => type !== "fire");
        const carrier = MobEffects.apply(world, actor, burnupSpentEffect, ticks, 0); if (!carrier) return false;
        world.effect(burnupWindow, actor, JSON.stringify({ carrier: MobEffects.anchor(carrier), types: types }), ticks);
        return true;
    }
    PokemonDamage.combatants.resolved.define({ id: "world_combat:burnup/types", apply: context => {
        if (String(context.actor.domain()) === "cobblemon") return;
        const active = context.world.effects(context.actor, burnupWindow).some(view =>
            MobEffects.matches(context.world, context.actor, JSON.parse(String(view.data())).carrier));
        if (active) context.facts.types = context.facts.types.filter(type => type !== "fire");
    } });
    WorldCombat.effect(burnupWindow, 1, 1200000, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(burnupWindow, "start", effect => {
        const world = effect.world(), actor = effect.target(), data = JSON.parse(effect.state()), body = world.observe(actor);
        if (!body || !MobEffects.matches(world, actor, data.carrier)) { effect.end(); return; }
        data.lease = MobEffects.bind(world, actor, burnupSpentEffect); effect.state(JSON.stringify(data));
        if (String(actor.domain()) === "cobblemon") NativeModifiers.apply(world, actor, { types: data.types,
            owner: { id: effect.id(), definition: burnupWindow, actor: String(actor.ref()) } }, effect.remaining());
        WorldFeedback.onEffect(world, effect.id(), "spent", burnupScene, 1, body.position(), { moment: "spent", target: String(actor.ref()) });
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(burnupWindow, "watch", effect => {
        if (!MobEffects.present(effect.world(), JSON.parse(effect.state()).lease)) { effect.end(); return; }
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(burnupWindow, "end", effect => {
        const world = effect.world(), body = world.observe(effect.target());
        if (body) WorldFeedback.emit(world, burnupScene, 1, body.position(), { moment: "reignite", target: String(effect.target().ref()) }, 24);
    });
}
