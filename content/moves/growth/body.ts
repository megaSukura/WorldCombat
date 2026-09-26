/** Temporary native scale, checked against the actual future collision volume before each enlargement. */
namespace PokemonSkills {
    const growthCarrier = "world_combat:grown", growthWindow = "world_combat:growth_body";
    function growthBodyStep(effect: CombatEffect): void {
        const world = effect.world(), actor = effect.target(), state = JSON.parse(effect.state());
        if (!world.valid(actor) || !MobEffects.matches(world, actor, state.carrier)) { effect.end(); return; }
        const body = world.observe(actor)!;
        const progress = Math.min(1, (world.tick() - state.start) / 12);
        let desired = state.initial + (state.maximum - state.initial) * progress;
        if (effect.remaining() < 12) desired = Math.min(desired, state.maximum * effect.remaining() / 12);
        if (Math.abs(desired - state.applied) > 0.0001) {
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            const ratio = (1 + desired) / (1 + state.applied);
            if (desired > state.applied && !world.freeSpace(feet, body.width() * ratio, body.height() * ratio)) {
                state.maximum = state.applied;
                WorldFeedback.text(world, body.position(), "world_combat.move.growth.text.crowded", [], 28);
            } else if (world.attribute(actor, "minecraft:generic.scale", desired, "add_multiplied_total")) state.applied = desired;
            else state.maximum = state.applied;
        }
        effect.state(JSON.stringify(state));
        effect.schedule("shape", "shape", 2, "{}");
    }
    WorldCombat.effect(growthWindow, 1, 1200000, "actor", json => {
        const state = JSON.parse(json);
        if (!MobEffects.validAnchor(state.carrier) || state.carrier.id !== growthCarrier ||
            ![state.maximum, state.initial, state.applied, state.start].every(value => typeof value === "number" && isFinite(value) && value >= 0))
            throw new Error("Invalid growth body state");
        return JSON.stringify(state);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(growthWindow, "start", effect => {
        const world = effect.world(), body = world.observe(effect.target());
        if (body) world.present("leaves", "world_combat:move_growth", 1, body.position(),
            JSON.stringify({ moment: "grown", target: String(effect.target().ref()) }));
        growthBodyStep(effect);
    });
    WorldCombat.effectHandler(growthWindow, "shape", growthBodyStep);
    WorldCombat.effectHandler(growthWindow, "operation:world_combat:dispel", effect => effect.end());
    WorldCombat.effectHandler(growthWindow, "operation:world_combat:refresh", effect => {
        if (String(effect.caller().key()) !== String(effect.source().key())) { effect.reject("growth-not-owned"); return; }
        const request = JSON.parse(effect.input()), state = JSON.parse(effect.state());
        state.carrier = request.carrier; state.initial = state.applied; state.maximum = request.maximum; state.start = effect.world().tick();
        effect.state(JSON.stringify(state)); effect.remaining(request.ticks); growthBodyStep(effect);
    });
    export function growBody(world: CombatWorld, actor: CombatActor, amount: number, ticks: number): void {
        const carrier = MobEffects.apply(world, actor, growthCarrier, ticks, 0); if (!carrier) return;
        const windows = world.effects(actor, growthWindow);
        if (windows.length) {
            world.operation(windows[0].id(), "world_combat:refresh", JSON.stringify({ carrier: MobEffects.anchor(carrier), maximum: amount, ticks: carrier.duration() }));
        } else world.effect(growthWindow, actor, JSON.stringify({ carrier: MobEffects.anchor(carrier), maximum: amount,
            initial: 0, applied: 0, start: world.tick() }), carrier.duration());
    }
}
