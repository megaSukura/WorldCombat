/** Blocks healing at its native/shared entry, leaving unrelated health changes to their native owner. */
namespace PokemonSkills {
    export const healBlockObserved = "world_combat:healblock_observed_heal";
    const healBlockVisual = "world_combat:healblock_visual";
    WorldCombat.effect(healBlockObserved, 1, 600, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(healBlockObserved, "start", function () {});
    WorldCombat.effectHandler(healBlockObserved, "operation:world_combat:dispel", effect => effect.end());
    WorldCombat.effect(healBlockVisual, 1, 12000, "actor", json => json, EffectProtocols.unchanged);
    function healBlockWatch(effect: CombatEffect): void {
        const world = effect.world(), actor = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(actor) || !MobEffects.matches(world, actor, data.carrier)) { effect.end(); return; }
        effect.schedule("carrier", "carrier", 1, "{}");
    }
    WorldCombat.effectHandler(healBlockVisual, "start", healBlockWatch);
    WorldCombat.effectHandler(healBlockVisual, "carrier", healBlockWatch);
    WorldCombat.effectHandler(healBlockVisual, "operation:world_combat:dispel", effect => effect.end());

    function healBlockFeedback(world: CombatWorld, actor: CombatActor, amount: number): void {
        const body = world.observe(actor); if (!body) return;
        WorldFeedback.emit(world, healBlockScene, 1, body.position(), { moment: "block", target: String(actor.ref()),
            amount: amount, motes: Math.max(6, Math.min(32, Math.round(amount * 4))), intensity: Math.max(.6, Math.min(2, amount / body.maxHealth() * 12)) }, 18);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.2, 0)), healBlockTextDenied, [], 22);
    }
    // Native heal(), including other mods. A phase/maximum-health change is not a healing event.
    WorldCombat.on("world_combat:move_healblock/native", "world_combat:healing_incoming", "", function (event) {
        const world = event.world(), actor = event.actor(), data = JSON.parse(event.data());
        if (!world.valid(actor) || !(data.amount > 0)) return;
        world.effects(actor, healBlockObserved).forEach(view => world.operation(view.id(), "world_combat:dispel", "{}"));
        world.effect(healBlockObserved, actor, "{}", 600);
        if (!CombatStatus.has(world, actor, healBlockStatus)) return;
        const refused = data.amount; data.amount = 0; event.data(JSON.stringify(data));
        healBlockFeedback(world, actor, refused);
    });
    // Shared Pokemon healing policies can stop a heal before it reaches native health units.
    NativeEffects.healing.define({ id: "world_combat:move_healblock/gate", apply: function (context) {
        if (!CombatStatus.has(context.world, context.actor, healBlockStatus)) return;
        const amount = context.amount; context.amount = 0;
        if (amount > 0) healBlockFeedback(context.world, context.actor, amount);
    } });
    export function healBlockArm(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (!CombatStatus.apply(world, target, healBlockStatus, healBlockEffect, ticks, 0, { unique: true })) return false;
        const carrier = MobEffects.read(world, target, healBlockEffect), body = world.observe(target);
        if (carrier && body) {
            const effect = world.effect(healBlockVisual, target, JSON.stringify({ carrier: MobEffects.anchor(carrier) }), ticks);
            WorldFeedback.onEffect(world, effect, "healblock:hold:" + String(target.ref()), healBlockScene, 1, body.position(),
                { moment: "hold", target: String(target.ref()), rings: 10 });
        }
        return true;
    }
    WorldCombat.on("world_combat:move_healblock/end", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(event.data()); if (String(data.id) !== healBlockEffect) return;
        const world = event.world(), actor = event.actor(), body = world.valid(actor) ? world.observe(actor) : null;
        if (!body) return;
        const expired = String(data.cause) === "expired";
        WorldFeedback.emit(world, healBlockScene, 1, body.position(), { moment: expired ? "release" : "break", target: String(actor.ref()) }, 20);
    });
}
