/**
 * 电球 / electroball 的出手方式。
 *
 * 核心念头：把「自己比对手快多少」充进一颗电团，球越充越大越亮，然后笔直投出去撞上就炸；
 *   自己越快，这一发越沉。它是陀螺球的反方向——同一台秤，这次称的是自己的速度优势，并把它远远送出去。
 *
 * 两幕：
 *   起（windup，提交前）：手心拢起一颗电团，电火花向里收；`load`（速度差）越大球越亮越大，只播预告。
 *   投（execute，提交后）：电团沿瞄准方向飞出（LivingActions 原生投射物，bullet 无接触）；
 *       撞上首个非友方即按 `charge` 结算特殊伤害并炸开一圈电火花；没人被撞到则飞到尽头自行消散。
 *
 * 与同族分开：电球没有麻痹、不贴身，全部价值在一颗随速度比放大的远投弹；短距电刺是另一族的事。
 *   与陀螺球并排：一个贴身钢球称「对方快多少」，一个远投电团称「自己快多少」。
 */
namespace PokemonSkills {
    define({
        id: electroballId,
        cooldownParameter: "recharge",
        name: "Electro Ball",
        description: "The user hurls an electric orb at the target. The faster the user is than the target, the greater the move's power.",
        uses: ["自己比对手快时的远距离重炮", "在对手够不到的距离先手开火", "用速度比把电团越充越大"],
        kind: "enemy",
        range: 8,
        maxRange: 16,
        prepare: 6,
        active: 0,
        recover: 6,
        cooldown: 26,
        style: "bolt",
        defaults: { overcharge: false, ai: { maxChase: 14 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(electroballId, "reach", pokemon), geometry: "line", style: "bolt", color: 0xFFE14D,
                label: config && config.overcharge === true ? "过载电球" : "电球" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[electroballId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(electroballId, "tempo", context)),
                recover: Math.round(p(electroballId, "recover", context)),
                cooldown: Math.round(p(electroballId, "recharge", context)),
                active: 0,
                range: p(electroballId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("electroball:charge", electroballScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", load: p(electroballId, "load", action), windup: prepare,
                    overcharge: config && config.overcharge === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const body = world.observe(action.actor());
            const origin = body === null ? action.origin() : body.position();
            const power = p(electroballId, "charge", action);
            const speed = p(electroballId, "flight", action);
            const radius = p(electroballId, "collisionRadius", action);
            const sparks = Math.max(8, Math.round(p(electroballId, "sparks", action)));
            const load = p(electroballId, "load", action);
            const scale = Math.max(0.7, Math.min(2.0, 0.7 + load * 0.22));
            const intensity = Math.max(0.6, Math.min(2.2, power / 70));
            let settled = false, hits = 0;

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:particle/generic/orb/energyorb", tint: 0xFFE14D, glow: true,
                scale: Math.max(0.7, Math.min(1.8, 0.7 + load * 0.2))
            };
            sound(action, "cobblemon:move.thundershock.actor");

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), gravity: 0, radius: radius, lifetime: 180,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target(), point = hit.position();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) return;
                    const landed = impact(current, hit, electroballId, power, { damage: damageSpec(electroballId, "charge") });
                    hits++;
                    if (!landed) return;
                    WorldFeedback.emit(scope, electroballScene, 1, point,
                        { moment: "burst", target: String(victim.ref()), sparks: sparks, scale: scale,
                            intensity: intensity, load: Math.round(load * 100) / 100 }, 26);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.15, 0)),
                        load >= 2.5 ? electroballMaxText : electroballHitText, [Math.round(power)], 24);
                    scope.sound("cobblemon:impact.electric", point, 16, "{}");
                }
            }, function (current: CombatAction) {
                if (settled) return;
                settled = true;
                const scope = current.world(), self = scope.observe(action.actor());
                if (hits === 0 && self !== null) {
                    WorldFeedback.emit(scope, electroballScene, 1, self.position(), { moment: "fade", scale: scale }, 18);
                    WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.05, 0)), electroballMissText, [], 20);
                }
                done(current);
            });
            WorldFeedback.keep(world, "electroball:flight:" + action.id(), electroballScene, 1, origin,
                { moment: "flight", projectile: flight, scale: scale, intensity: intensity, sparks: sparks }, 120);
        }
    });
}
