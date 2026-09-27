/** One carrier owns fire removal; empty remaining types stay empty, and other type sources survive cleanup. */
namespace PokemonSkills {
    const burnupWindow = "world_combat:burnup_window";
    export function burnupSpend(world: CombatWorld, actor: CombatActor, ticks: number): boolean {
        const carrier = MobEffects.apply(world, actor, burnupSpentEffect, ticks, 0);
        if (!carrier) return false;
        // 统一临时类型叠层：由本次燃尽载体负责去掉火属性，随载体到期/驱散一起收，和别的类型层按创建顺序交互。
        CombatTypes.apply(world, actor, { operation: "remove", types: ["fire"] }, carrier);
        world.effect(burnupWindow, actor, JSON.stringify({ carrier: MobEffects.anchor(carrier) }), ticks);
        return true;
    }
    WorldCombat.effect(burnupWindow, 1, 1200000, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(burnupWindow, "start", effect => {
        const world = effect.world(), actor = effect.target(), data = JSON.parse(effect.state()), body = world.observe(actor);
        if (!body || !MobEffects.matches(world, actor, data.carrier)) { effect.end(); return; }
        data.lease = MobEffects.bind(world, actor, burnupSpentEffect); effect.state(JSON.stringify(data));
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
