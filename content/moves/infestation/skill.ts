/** 四簇虫附体持续啃咬；实际走过的路程逐簇甩落，余下虫份决定后续伤害。 */
namespace PokemonSkills {
    const infestationScene = "world_combat:move_infestation";
    const infestationSwarmEffect = "world_combat:infestation_swarm";
    const infestationBond = "world_combat:infestation_bond";
    const infestationClingText = "world_combat.move.infestation.text.cling";
    const infestationFizzleText = "world_combat.move.infestation.text.fizzle";
    const infestationReleaseText = "world_combat.move.infestation.text.release";

    const infestationGroups = 4;
    WorldCombat.effect(infestationBond, 1, 1200, "actor", json => json, EffectProtocols.unchanged);
    WorldCombat.effectHandler(infestationBond, "start", effect => {
        const world = effect.world(), target = effect.target(), body = world.observe(target), data = JSON.parse(effect.state());
        if (body === null) { effect.end(); return; }
        data.lease = MobEffects.bind(world, target, infestationSwarmEffect);
        data.last = [body.position().x(), body.position().y(), body.position().z()]; data.distance = 0;
        effect.state(JSON.stringify(data));
        effect.schedule("motion", "motion", 1, "{}");
        effect.schedule("pulse", "pulse", data.interval, "{}");
    });
    WorldCombat.effectHandler(infestationBond, "motion", effect => {
        const world = effect.world(), victim = effect.target(), body = world.observe(victim), data = JSON.parse(effect.state());
        if (body === null || !MobEffects.present(world, data.lease)) { effect.end(); return; }
        const at = body.position(), delta = at.minus(WorldCombat.point(data.last[0], data.last[1], data.last[2]));
        data.last = [at.x(), at.y(), at.z()]; data.distance += delta.length();
        const shed = Math.min(data.groups, Math.floor(data.distance / data.shakeDistance));
        if (shed > 0) {
            data.groups -= shed; data.distance -= shed * data.shakeDistance;
            WorldFeedback.emit(world, infestationScene, 1, at, { moment: "shed", count: shed,
                direction: [delta.x(), delta.y(), delta.z()] }, 16);
        }
        effect.state(JSON.stringify(data));
        if (data.groups <= 0) { effect.end(); return; }
        const view: any = { moment: "swarm", target: String(victim.ref()), groups: data.groups };
        for (let i = 0; i < infestationGroups; i++) view["g" + i] = data.groups > i ? 10 : 0;
        WorldFeedback.onEffect(world, effect.id(), "swarm", infestationScene, 1, at, view);
        effect.schedule("motion", "motion", 1, "{}");
    });
    WorldCombat.effectHandler(infestationBond, "pulse", effect => {
        const world = effect.world(), victim = effect.target(), body = world.observe(victim), data = JSON.parse(effect.state());
        if (body === null || !MobEffects.present(world, data.lease)) { effect.end(); return; }
        const amount = Math.max(1, Math.floor(body.maxHealth() * data.share)) * data.groups / infestationGroups;
        data.pulses++; effect.state(JSON.stringify(data));
        PokemonDamage.residual(world, victim, "infestation", amount, { share: data.share, groups: data.groups, pulses: data.pulses });
        effect.schedule("pulse", "pulse", data.interval, "{}");
    });
    WorldCombat.effectHandler(infestationBond, "operation:world_combat:dispel", effect => effect.end());
    WorldCombat.effectHandler(infestationBond, "end", effect => {
        const world = effect.world(), target = effect.target(), body = world.observe(target);
        if (body === null) return;
        WorldFeedback.emit(world, infestationScene, 1, body.position(), { moment: "release", target: String(target.ref()) }, 22);
        WorldFeedback.text(world, body.position(), infestationReleaseText, [], 24);
    });
    PokemonDamage.onDamageApplied("world_combat:infestation/residual", receipt => {
        const fact = WorldFeedback.receipt(receipt.event);
        if (fact === null || !(fact.actual > 0)) return;
        const world = receipt.world, at = fact.point, data = receipt.data;
        WorldFeedback.emit(world, infestationScene, 1, at, { moment: "bite", target: String(receipt.target.ref()),
            count: data.groups * 2, intensity: .6 + data.groups * .1, pulses: data.pulses }, 20);
        world.sound("cobblemon:move.infestation.residual", at, 16, "{}");
    }, { move: "infestation", segment: "residual" });

    define({
        id: "infestation",
        name: "Infestation",
        description: "甩出四簇虫黏住目标持续啃咬。目标可以移动，每跑过一段距离便甩落一簇，剩下的虫越少，啃咬越轻。",
        uses: ["给难缠的目标挂持续啃咬", "迫使站定输出的敌人走动甩虫", "逼对手先来清状态或反打"],
        kind: "aim",
        range: 12,
        maxRange: 18,
        prepare: 8,
        active: 40,
        recover: 8,
        cooldown: 46,
        style: "swarm",
        defaults: { ai: { maxChase: 14, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("infestation", "collisionRadius", pokemon) * 1.4, geometry: "line", style: "swarm", label: "死缠烂打" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["infestation"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: Math.round(p("infestation", "charge", context)),
                recover: 8,
                cooldown: Math.round(p("infestation", "duration", context) * 0.3) + 18,
                range: p("infestation", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_infestation:windup", infestationScene, 1, action.origin(), JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const speed = p("infestation", "speed", action);
            const radius = p("infestation", "collisionRadius", action);
            const bite = p("infestation", "bite", action);
            const share = p("infestation", "swarmShare", action);
            const ticks = Math.max(1, Math.round(p("infestation", "duration", action)));
            const interval = Math.max(1, Math.round(p("infestation", "interval", action)));
            const scale = radius / 0.35;
            sound(action, "cobblemon:move.infestation.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed,
                range: action.range(),
                radius: radius,
                appearance: { sprite: "cobblemon:particle/generic/ground_bugs", glow: true, scale: 1.2 },
                impact: function (current, hit, age) {
                    const body = current.world();
                    const target = hit.target();
                    if (target === null || !body.valid(target)) {
                        WorldFeedback.emit(body, infestationScene, 1, hit.position(), { moment: "fizzle" }, 18);
                        WorldFeedback.text(body, hit.position(), infestationFizzleText, [], 24);
                        sound(current, "minecraft:entity.generic.splash");
                        return;
                    }
                    if (!impact(current, hit, "infestation", bite, { damage: damageSpec("infestation", "bite"), contact: true })) return;
                    if (!CombatStatus.apply(body, target, "partiallytrapped", infestationSwarmEffect, ticks, 0, { unique: true })) {
                        WorldFeedback.emit(body, infestationScene, 1, hit.position(), { moment: "immune", target: String(target.ref()) }, 22);
                        return;
                    }
                    body.effects(target, infestationBond).forEach(effect => body.operation(effect.id(), "world_combat:dispel", "{}"));
                    body.effect(infestationBond, target, JSON.stringify({ interval: interval, share: share, pulses: 0,
                        groups: infestationGroups, shakeDistance: p("infestation", "shakeDistance", current) }), ticks);
                    const ref = String(target.ref());
                    WorldFeedback.emit(body, infestationScene, 1, hit.position(), { moment: "cling", target: ref, scale: scale, share: share }, 28);
                    WorldFeedback.text(body, hit.position(), infestationClingText, [Math.round(ticks / 20 * 10) / 10], 30);
                    sound(current, "cobblemon:move.infestation.target");
                }
            }, function complete(current: CombatAction) { done(current); });
            WorldFeedback.emit(world, infestationScene, 1, action.origin(), { moment: "cast", projectile: flight,
                target: action.target() ? String(action.target()!.ref()) : "" }, 70);
        }
    });

}
