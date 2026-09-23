/**
 * 十万伏特 / thunderbolt —— 出手方式。
 *
 * 核心念头：把电压成一团沿直线射出去的强电击——蓄一口气、放出去、命中处炸开一片电网。
 *   它是本族里最标准的一发：距离中等、飞行快、随时能放；代价是单体威力不是本族最高，麻人的机会也最小。
 *
 * 幕：
 *   起（windup，提交前）：指尖攒电、压成弹丸的预告（`action.present`，可被打断、不花 PP）。
 *   飞（travel）：提交后电弹沿直线飞向目标，只做有限修正；画面上拖一条剥落的电尾。
 *   击（burst / splash / fizzle）：命中处炸开电网并结算 `bolt`；扩散式下电花再分摊到落点周围最多
 *       `splashTargets` 个敌人（各按 `splashShare` 结算）。打空或撞墙只留一下散电。
 *
 * 与同族分开：电磁波是瞬发无伤的直线、电击波贴地必中、电击是贴身的短刺、电磁炮是要蓄的慢弹；
 *   十万伏特是唯一「飞行电弹 + 命中炸开」的那个，稳定输出，也最容易被打断在起手上。
 */
namespace PokemonSkills {
    const thunderboltScene = "world_combat:move_thunderbolt";
    const thunderboltTravelKey = "thunderbolt:travel:";
    const thunderboltBurstText = "world_combat.move.thunderbolt.text.burst";
    const thunderboltSplashText = "world_combat.move.thunderbolt.text.splash";
    const thunderboltFizzleText = "world_combat.move.thunderbolt.text.fizzle";

    define({
        id: thunderboltId,
        cooldownParameter: "recharge",
        name: "Thunderbolt",
        description: "把电压成一团沿直线射出去，命中处炸开一片电网；扩散式下电花再分摊到落点周围的几个敌人。命中后有小概率把目标麻住。电属性对麻痹免疫。",
        uses: ["中距离的单体点射", "在敌群里点一下顺带电到旁边的人", "隔着一段距离先手压血"],
        kind: "enemy",
        range: 9,
        maxRange: 14,
        prepare: 9,
        active: 0,
        recover: 6,
        cooldown: 26,
        style: "electric",
        defaults: { spread: false, ai: { maxChase: 13, preferCluster: true, seekUnparalysed: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[thunderboltId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(thunderboltId, "tempo", context)),
                recover: Math.round(p(thunderboltId, "recover", context)),
                cooldown: Math.round(p(thunderboltId, "recharge", context)),
                active: 0,
                range: p(thunderboltId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const arcs = Math.max(5, Math.round(p(thunderboltId, "arcs", action)));
            const power = p(thunderboltId, "bolt", action);
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            action.present("thunderbolt:charge:" + action.id(), thunderboltScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, arcs: arcs, intensity: intensity,
                    spread: config && config.spread ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[thunderboltId], detail: { values: config } };
            return { radius: p(thunderboltId, "reach", context), geometry: "line", style: "electric", color: 0xFFE14D,
                label: config && config.spread === true ? "十万伏特·扩散" : "十万伏特" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            const spread = !!(config && config.spread);
            const power = p(thunderboltId, "bolt", action);
            const speed = p(thunderboltId, "flightSpeed", action);
            const turn = p(thunderboltId, "homing", action);
            const radius = p(thunderboltId, "burstRadius", action);
            const chance = p(thunderboltId, "numbChance", action);
            const numbTicks = Math.round(p(thunderboltId, "numbTicks", action));
            const arcs = Math.max(5, Math.round(p(thunderboltId, "arcs", action)));
            const share = p(thunderboltId, "splashShare", action);
            const cap = Math.max(1, Math.round(p(thunderboltId, "splashTargets", action)));
            const scale = Math.max(0.6, Math.min(2.4, radius / 0.9));
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            const flow = Math.round(50 + power * 0.5);
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.thunderbolt.actor");

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:particle/generic/orb/energyorb", tint: 0xFFE14D, glow: true,
                scale: Math.max(0.8, Math.min(1.6, radius / 0.3))
            };
            if (target !== null && world.valid(target))
                appearance.homing = { target: String(target.ref()), turn: turn, delay: 0, range: action.range() + 5 };

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.3,
                lifetime: Math.max(30, Math.round(action.range() / Math.max(0.2, speed) + 24)),
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const point = hit.position();
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, thunderboltId, power,
                            { damage: damageSpec(thunderboltId, "bolt"), status: "paralysis", chance: chance, statusTicks: numbTicks });
                        WorldFeedback.emit(scope, thunderboltScene, 1, point,
                            { moment: "burst", target: String(victim.ref()), sparks: Math.round(16 + power * 0.6),
                                arcs: arcs, scale: scale, intensity: intensity }, 28);
                        sound(current, "cobblemon:move.thunderbolt.target");
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.1, 0)), thunderboltBurstText, [], 26);
                        if (spread && landed) {
                            let extra = 0;
                            WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, radius, { below: 2, above: 3 }),
                                function (other: CombatActor, facts: CombatObservation) {
                                    if (extra >= cap || String(other.ref()) === String(victim.ref())) return;
                                    if (hurt(current, other, thunderboltId, power * share, { damage: damageSpec(thunderboltId, "bolt") })) {
                                        extra++;
                                        WorldFeedback.emit(scope, thunderboltScene, 1, facts.position(),
                                            { moment: "splash", target: String(other.ref()),
                                                sparks: Math.round(8 + power * share * 0.6), scale: scale }, 24);
                                    }
                                });
                            if (extra > 0)
                                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.5, 0)), thunderboltSplashText, [extra], 26);
                        }
                    } else {
                        WorldFeedback.emit(scope, thunderboltScene, 1, point, { moment: "fizzle", arcs: arcs, scale: scale }, 22);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.6, 0)), thunderboltFizzleText, [], 24);
                    }
                }
            }, function (current: CombatAction) { finish(current); });

            WorldFeedback.keep(world, thunderboltTravelKey + action.id(), thunderboltScene, 1, action.origin(),
                { moment: "travel", projectile: flight, arcs: arcs, scale: scale, intensity: intensity, flow: flow }, 90);
        }
    });
}
