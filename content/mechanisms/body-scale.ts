/** Owned native shrinkage; once its carrier ends, only the tracked collision-safe restoration remains. */
namespace BodyScale {
    const definition = "world_combat:body_scale", attribute = "minecraft:generic.scale";
    export interface Change { world: CombatWorld; actor: CombatActor; effect: number; key: string; phase: "active" | "waiting" | "restored"; }
    export const changes = new WorldContributions.Registry<Change>();
    export function pending(world: CombatWorld, actor: CombatActor, key: string): boolean {
        return world.effects(actor, definition).some(view => JSON.parse(String(view.data())).key === key);
    }
    export function shrink(world: CombatWorld, actor: CombatActor, factor: number, carrier: CombatMobEffect, key: string): boolean {
        if (!isFinite(factor) || factor <= 0 || factor > 1) throw new Error("Shrink factor must be in (0,1]");
        if (!world.attributeValue(actor, attribute) || pending(world, actor, key)) return false;
        world.effect(definition, actor, JSON.stringify({ key: key, factor: factor, carrier: MobEffects.anchor(carrier), waiting: false }), 1200000);
        return true;
    }
    function publish(effect: CombatEffect, state: any, phase: Change["phase"]): void {
        changes.apply({ world: effect.world(), actor: effect.target(), effect: effect.id(), key: state.key, phase: phase });
    }
    WorldCombat.effect(definition, 1, 1200000, "actor", json => json, () => { throw new Error("Body scale ownership cannot migrate"); });
    WorldCombat.effectHandler(definition, "start", effect => {
        const state = JSON.parse(effect.state()), world = effect.world();
        if (!MobEffects.matches(world, effect.target(), state.carrier)
            || !world.attribute(effect.target(), attribute, state.factor - 1, "add_multiplied_total")) { effect.end(); return; }
        publish(effect, state, "active"); effect.schedule("restore", "restore", 1, "{}");
    });
    WorldCombat.effectHandler(definition, "restore", effect => {
        const world = effect.world(), actor = effect.target(), body = world.observe(actor), state = JSON.parse(effect.state());
        if (!body) { effect.end(); return; }
        if (MobEffects.matches(world, actor, state.carrier)) {
            effect.remaining(1200000); effect.schedule("restore", "restore", 1, "{}"); return;
        }
        const current = world.attributeValue(actor, attribute), original = world.attributeValue(actor, attribute, true);
        if (!current || !original) { effect.end(); return; }
        // The real current scale includes every other source. Only this instance's factor is removed.
        const ratio = original.value() / current.value(), width = body.width() * ratio, height = body.height() * ratio;
        let feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
        if (!world.freeSpace(feet, width, height)) {
            const candidate = LivingActions.freeSpot(world, feet, width, height, 3);
            if (candidate) {
                const shifted = candidate.plus(WorldCombat.point(0, body.height() / 2, 0));
                if (world.clear(body.position(), shifted)) {
                    // Native body collision controls the entire relocation, including broad bodies and narrow gaps.
                    world.displace(actor, candidate.minus(feet));
                    const moved = world.observe(actor); if (moved) feet = moved.position().plus(WorldCombat.point(0, -moved.height() / 2, 0));
                }
            }
        }
        if (world.freeSpace(feet, width, height)) {
            world.attribute(actor, attribute, 0, "add_multiplied_total"); publish(effect, state, "restored"); effect.end(); return;
        }
        if (!state.waiting) { state.waiting = true; effect.state(JSON.stringify(state)); publish(effect, state, "waiting"); }
        // A sealed pocket retains this owned restoration task, with no carrier or combat bonus. Actor departure releases it.
        effect.remaining(1200000); effect.schedule("restore", "restore", 20, "{}");
    });
}
