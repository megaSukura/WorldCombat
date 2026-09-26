/** Maintain a close constriction while holding the action; distance, interruption or release ends every owned layer. */
namespace PokemonSkills {
    const wrapScene = "world_combat:move_wrap";
    const wrapCoil = "world_combat:wrap_coil";
    const wrapBond = "world_combat:wrap_bond";
    const wrapCoilKey = "wrap:coil:";
    const wrapCoilText = "world_combat.move.wrap.text.coil";
    const wrapCrushText = "world_combat.move.wrap.text.crush";
    const wrapReleaseText = "world_combat.move.wrap.text.release";
    const wrapTornText = "world_combat.move.wrap.text.torn";

    function wrapBondData(json: string): string {
        const value = JSON.parse(json);
        ["crush", "interval", "coilHeight", "tearSpeed", "next"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid wrap bond");
        });
        if (value.interval < 1 || value.coilHeight <= 0 || value.tearSpeed <= 0) throw new Error("Invalid wrap bond");
        return JSON.stringify(value);
    }

    WorldCombat.effect(wrapBond, 1, 400, "action", wrapBondData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(wrapBond, "start", function (effect) { effect.schedule("squeeze", "squeeze", 1, "{}"); });
    WorldCombat.effectHandler(wrapBond, "squeeze", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim)) { effect.end(); return; }
        if (world.mobEffect(victim, wrapCoil) === null) { data.reason = "released"; effect.state(JSON.stringify(data)); effect.end(); return; }
        const source = world.observe(effect.source()), body = world.observe(victim);
        if (!source || !body || source.position().minus(body.position()).length() > data.reach || !world.clear(source.position(), body.position())) { effect.end(); return; }
        if (body === null) { effect.end(); return; }
        if (world.tick() > (data.grace || 0) && body.velocity().length() > data.tearSpeed) {
            data.reason = "torn"; effect.state(JSON.stringify(data)); effect.end(); return;
        }
        if (world.tick() >= data.next) {
            data.next = world.tick() + Math.max(6, Math.round(data.interval));
            data.pulses = (data.pulses || 0) + 1;
            effect.state(JSON.stringify(data));
            hurt(world, victim, "wrap", data.crush, { damage: damageSpec("wrap", "crush"), contact: true });
            if (!world.valid(victim)) { effect.end(); return; }
            const at = world.observe(victim);
            if (at !== null) {
                WorldFeedback.emit(world, wrapScene, 1, at.position(),
                    { moment: "crush", target: String(victim.ref()), notes: data.notes, pulses: data.pulses,
                        intensity: Math.max(0.5, Math.min(2.2, data.crush / 18)) }, 18);
                WorldFeedback.text(world, at.position().plus(WorldCombat.point(0, 1.3, 0)), wrapCrushText, [data.pulses], 18);
            }
            world.sound("minecraft:block.wool.step", at !== null ? at.position() : body.position(), 14, "{}");
        }
        effect.schedule("squeeze", "squeeze", 2, "{}");
    });
    WorldCombat.effectHandler(wrapBond, "end", function (effect) {
        const world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (world.valid(victim)) {
            const coil = MobEffects.read(world, victim, wrapCoil);
            if (coil !== null && data.carrier && MobEffects.matches(world, victim, data.carrier)) world.removeMobEffect(victim, wrapCoil, coil.key());
            const body = world.observe(victim);
            if (body !== null) {
                WorldFeedback.emit(world, wrapScene, 1, body.position(),
                    { moment: data.reason === "torn" ? "torn" : "release", target: String(victim.ref()) }, 22);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)),
                    data.reason === "torn" ? wrapTornText : wrapReleaseText, [], 22);
            }
        }
    });
    WorldCombat.effectHandler(wrapBond, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: "wrap",
        cooldownParameter: "recharge",
        name: "Wrap",
        description: "按住技能维持贴身紧束，自己放慢脚步，目标暂时降低攻击并定期受到绞击。松手、拉开距离、断视线或被打断会松开；目标仍能移动。",
        uses: ["贴身维持紧束并压住危险目标的攻击", "把对手按在原地交给队友", "用藤茧独自磨掉一个难缠的近战目标"],
        kind: "aim",
        range: 2.7,
        maxRange: 3.8,
        prepare: 8,
        active: 14,
        recover: 7,
        cooldown: 38,
        style: "coil",
        defaults: { cocoon: false, ai: { maxChase: 5, preferHard: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("wrap", "reach", pokemon) + 0.2, geometry: "circle", style: "coil", color: 0x7E9C5A,
                label: config && config.cocoon === true ? "密缠式" : "速缠式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["wrap"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("wrap", "tempo", context)),
                recover: Math.round(p("wrap", "aftercast", context)),
                cooldown: Math.round(p("wrap", "recharge", context)),
                active: skills["wrap"].active,
                range: p("wrap", "reach", context) + 0.2
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_wrap:coil", wrapScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", cocoon: config && config.cocoon === true ? 1 : 0, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const direction = aim(action);
            const reach = Math.max(2.0, p("wrap", "reach", action));
            const grip = Math.max(0.35, p("wrap", "grip", action));
            const end = origin.plus(direction.scale(reach));
            WorldFeedback.emit(world, wrapScene, 1, origin,
                { moment: "lash", path: [[origin.x(), origin.y(), origin.z()], [end.x(), end.y(), end.z()]] }, 14);
            sound(action, "minecraft:block.vine.place");

            const grab = action.trace(origin, end, grip);
            const target = grab.hitEntity() ? grab.target() : null;
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, wrapScene, 1, end, { moment: "whiff" }, 16);
                done(action);
                return;
            }
            const context: NumberContext = { pokemon: CobblemonCombat.pokemon(action.actor()), skill: skills["wrap"],
                detail: { values: config }, world: world, actor: action.actor(), target: { world: world, actor: target } };
            const crush = p("wrap", "crush", action);
            const coilTicks = Math.max(60, Math.round(p("wrap", "coilTicks", action)));
            const interval = Math.max(6, Math.round(p("wrap", "interval", action)));
            const stages = Math.max(1, Math.round(p("wrap", "atkStages", context)));
            const coilHeight = Math.max(0.9, p("wrap", "coilHeight", context));
            const tearSpeed = Math.max(0.2, p("wrap", "tearSpeed", action));
            const notes = Math.max(8, Math.round(p("wrap", "notes", action)));

            if (!hurt(action, target, "wrap", crush, { damage: damageSpec("wrap", "crush"), contact: true })) { done(action); return; }
            if (!CombatStatus.apply(world, target, "partiallytrapped", wrapCoil, coilTicks, 0, { unique: true })) { done(action); return; }
            const carrier = MobEffects.read(world, target, wrapCoil);
            if (!carrier) { done(action); return; }
            NativeEffects.boostWindow(world, target, { atk: -stages }, coilTicks, "world_combat:move/wrap", carrier);
            world.attribute(action.actor(), "minecraft:generic.movement_speed", -.45, "add_multiplied_total");
            const body = world.observe(target);
            if (body === null) { done(action); return; }
            const state = { crush: crush, interval: interval, coilHeight: coilHeight, tearSpeed: tearSpeed, notes: notes,
                reach: reach + 1, carrier: MobEffects.anchor(carrier), next: world.tick() + interval, grace: world.tick() + 8, pulses: 0, reason: "" };
            const existing = world.effects(target, wrapBond);
            for (let i = 0; i < existing.length; i++) world.operation(existing[i].id(), "world_combat:dispel", "{}");
            const bond = action.effect(wrapBond, target, JSON.stringify(state), coilTicks);
            WorldFeedback.onEffect(world, bond, wrapCoilKey + bond, wrapScene, 1, body.position(),
                { moment: "coil", target: String(target.ref()), path: [String(action.actor().ref()), String(target.ref())], height: coilHeight, notes: notes });
            WorldFeedback.emit(world, wrapScene, 1, body.position(),
                { moment: "seize", target: String(target.ref()), height: coilHeight, notes: notes, stages: stages }, 26);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), wrapCoilText, [stages], 24);
            sound(action, "cobblemon:impact.normal");
            const began = world.tick();
            function maintain(current: CombatAction): void {
                const scope = current.world();
                if (scope.tick() - began >= coilTicks || !scope.valid(target!) || !scope.effects(target!, wrapBond).some(view => view.id() === bond)) { done(current); return; }
                current.after(2, maintain);
            }
            maintain(action);
        }
    });
    WorldCombat.preview("world_combat:wrap", JSON.stringify({ radius: .5, lineOfSight: true, input: { version: 1, steps: ["point"], sustained: true } }));
}
