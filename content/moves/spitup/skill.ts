/** Cash in the successfully consumed shared stockpile at launch; flight uses that fixed resource snapshot. */
namespace PokemonSkills {
    const spitupSpitText = "world_combat.move.spitup.text.spit";
    const spitupMissText = "world_combat.move.spitup.text.miss";

    /** 喷散锥形的三个顶点（源点、左右两条边）：判定 `WorldGeometry.sector` 与表现同一组顶点。 */
    function spitupCone(origin: CombatPoint, direction: CombatPoint, reach: number, degrees: number): any[] {
        const heading = WorldCombat.point(direction.x(), 0, direction.z());
        const base = heading.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : heading.unit();
        const half = Math.min(89, Math.max(5, degrees / 2)) * Math.PI / 180, cos = Math.cos(half), sin = Math.sin(half);
        const left = WorldCombat.point(base.x() * cos - base.z() * sin, 0, base.x() * sin + base.z() * cos).scale(reach);
        const right = WorldCombat.point(base.x() * cos + base.z() * sin, 0, -base.x() * sin + base.z() * cos).scale(reach);
        return [[origin.x(), origin.y(), origin.z()],
            [origin.x() + left.x(), origin.y(), origin.z() + left.z()],
            [origin.x() + right.x(), origin.y(), origin.z() + right.z()]];
    }

    define({
        id: spitupId,
        cooldownParameter: "recharge",
        name: "Spit Up",
        description: "把蓄力攒下的压缩力一口吐出去：蓄了几层就有多重，弹体更大更快；没有蓄力层时这一招根本使不出。出手会一次放空全部层数，那几层防御与特防加成也跟着交出去。喷散式把这一口摊成身前一整片锥形，一次罩住多个敌人，但每个目标更轻。",
        uses: ["先蓄力攒层，再一口把攒下的力全吐出去", "喷散式一次罩住站成一排的敌人", "把层数留着当保险，等对手露出破绽再全放"],
        kind: "aim",
        range: 10,
        maxRange: 18,
        prepare: 6,
        active: 14,
        recover: 6,
        cooldown: 20,
        style: "spit",
        defaults: { spray: false, ai: { maxChase: 12, minLayers: 1 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(spitupId, "reach", pokemon), geometry: config && config.spray === true ? "area" : "circle",
                style: "spit", color: 0xF0B23A, label: config && config.spray === true ? "喷出 · 喷散式" : "喷出 · 直喷式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[spitupId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            const spray = !!(config && config.spray);
            return {
                prepare: Math.round(p(spitupId, "tempo", context)),
                recover: Math.round(p(spitupId, "aftercast", context)),
                cooldown: Math.round(p(spitupId, "recharge", context)),
                active: skills[spitupId].active,
                // 喷散式贴着身前一截（锥形摊开），直喷式能吐得更远。
                range: p(spitupId, "reach", context) * (spray ? 0.72 : 1)
            };
        },
        ready: function (action, _config) {
            return spitupLayers(action.sense(), action.actor()) < 1 ? "no-charge" : "";
        },
        windup: function (action, config, prepare) {
            const layers = spitupLayers(action.sense(), action.actor());
            action.present("world_combat:move_spitup:gather", spitupScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", layers: layers, spray: config && config.spray === true ? 1 : 0, windup: prepare }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const consumed = MobEffects.consumeTagged(world, actor, StatusVocabulary.tag(spitupStockpile));
            const layers = consumed.reduce((count, value) => Math.max(count, Math.min(3, value.amplifier())), 0);
            action.data("world_combat:spitup/layers", JSON.stringify({ layers: layers }));
            if (layers < 1) {
                WorldFeedback.emit(world, spitupScene, 1, origin, { moment: "whiff", layers: 0 }, 18);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), spitupMissText, [], 22);
                done(action);
                return;
            }
            const power = p(spitupId, "spit", action);
            const motes = Math.max(10, Math.round(p(spitupId, "motes", action)));
            const spray = !!(config && config.spray);
            if (spray) {
                const direction = aim(action);
                const reach = Math.max(4, p(spitupId, "reach", action) * 0.72);
                const degrees = Math.max(30, p(spitupId, "spread", action));
                const path = spitupCone(origin, direction, reach, degrees);
                const region = WorldGeometry.sector(origin, direction, reach, degrees, { below: 2, above: 3 });
                let hits = 0;
                WorldGeometry.selectEnemies(world, region, function (victim, facts) {
                    const landed = hurt(action, victim, spitupId, power, { damage: damageSpec(spitupId, "spit") });
                    if (!landed) return;
                    hits++;
                    WorldFeedback.emit(world, spitupScene, 1, facts.position(),
                        { moment: "burst", target: String(victim.ref()), motes: motes, layers: layers,
                            intensity: Math.max(0.6, Math.min(2.4, power / 120)) }, 26);
                });
                WorldFeedback.emit(world, spitupScene, 1, origin,
                    { moment: "spray", path: path, motes: motes, layers: layers, hits: hits, reach: reach, degrees: degrees,
                        intensity: Math.max(0.6, Math.min(2.4, power / 120)) }, 30);
                sound(action, "minecraft:entity.llama.spit");
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), spitupSpitText, [layers, hits], 26);
                done(action);
                return;
            }
            const speed = Math.max(0.6, p(spitupId, "speed", action));
            const radius = Math.max(0.14, p(spitupId, "nozzle", action));
            const reach = Math.max(5, p(spitupId, "reach", action));
            const scale = radius / spitupReference;
            let struck = false;
            const launch = aim(action);
            WorldFeedback.emit(world, spitupScene, 1, origin,
                { moment: "spit", motes: motes, layers: layers, scale: scale, direction: [launch.x(), launch.y(), launch.z()],
                    intensity: Math.max(0.6, Math.min(2.4, power / 120)) }, 22);
            sound(action, "minecraft:entity.llama.spit");
            LivingActions.projectile(action, {
                speed: speed, range: reach, radius: radius,
                appearance: { sprite: "cobblemon:generic/orb/energyorb", tint: 0xF0B23A, glow: true,
                    scale: Math.max(0.8, Math.min(1.8, radius / 0.22)) } as any,
                impact: function (current, hit, _age) {
                    if (hit.target() === null) return;
                    const landed = impact(current, hit, spitupId, power, { damage: damageSpec(spitupId, "spit") });
                    if (!landed) return;
                    struck = true;
                    WorldFeedback.emit(current.world(), spitupScene, 1, hit.position(),
                        { moment: "burst", target: String(hit.target()!.ref()), motes: motes, layers: layers,
                            intensity: Math.max(0.6, Math.min(2.4, power / 120)) }, 28);
                    WorldFeedback.text(current.world(), hit.position().plus(WorldCombat.point(0, 1.1, 0)), spitupSpitText, [layers, 1], 24);
                    current.world().sound("minecraft:entity.wind_charge.wind_burst", hit.position(), 14, "{}");
                }
            }, function (current) {
                const scope = current.world();
                if (!struck) {
                    WorldFeedback.emit(scope, spitupScene, 1, current.targetPosition(),
                        { moment: "whiff", motes: Math.round(motes * 0.6), layers: layers }, 18);
                    WorldFeedback.text(scope, current.targetPosition().plus(WorldCombat.point(0, 1.1, 0)), spitupMissText, [], 22);
                }
                done(current);
            });
        }
    });
}
