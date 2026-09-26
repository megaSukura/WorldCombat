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
        description: "把「自己比对手快多少」充进一颗电团远投出去：速度比越大，电团越大越亮、撞上炸得越狠。它是陀螺球的反方向——同一台秤，这次称的是自己的速度优势，并把它远远送出去。可以瞄敌人也可只朝方向投；飞行途中撞到方块或第一个挡路的非友方就散开，不穿越它去锁后面的伤害。",
        uses: ["自己比对手快时的远距离重炮", "在对手够不到的距离先手开火", "用速度比把电团越充越大", "朝空方向投弹试探"],
        kind: "aim",
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
            const scenes = WorldFeedback.actionScenes(electroballScene);
            const world = action.world();
            const body = world.observe(action.actor());
            const origin = body === null ? action.origin() : body.position();
            // 发射外观按选中的预计目标载荷：没有实体目标时预计载荷按 0，只会得到一颗小球。
            const power = p(electroballId, "charge", action);
            const speed = p(electroballId, "flight", action);
            const radius = p(electroballId, "collisionRadius", action);
            const predictedSparks = Math.max(8, Math.round(p(electroballId, "sparks", action)));
            const predictedLoad = action.target() !== null ? p(electroballId, "load", action) : 0;
            const predictedScale = electroballScale(predictedLoad);
            const aimed = aim(action);
            let direction = WorldCombat.point(aimed.x(), 0, aimed.z());
            direction = direction.length() < 0.05 ? WorldCombat.point(0, 0, 1) : direction.unit();
            let settled = false;

            /** 速度比载荷 → 电团体积（发射外观与接触闪光共用同一条换算）。 */
            function electroballScale(load: number): number { return Math.max(0.7, Math.min(2.0, 0.7 + load * 0.22)); }
            /** 威力 → 电团亮度（发射与命中共用）。 */
            function electroballIntensity(value: number): number { return Math.max(0.6, Math.min(2.2, value / 70)); }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.finish(current, done);
            }

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:particle/generic/orb/energyorb", tint: 0xFFE14D, glow: true,
                scale: Math.max(0.7, Math.min(1.8, 0.7 + predictedLoad * 0.2))
            };
            sound(action, "cobblemon:move.thundershock.actor");

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), gravity: 0, radius: radius, lifetime: 180, direction: direction,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    if (settled) return;
                    const scope = current.world(), victim = hit.target(), point = hit.position();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        // 命中时按实际受击者重算速度比：发射外观是预计目标，接触闪光与伤害用实际载荷。
                        const actual = withTarget(factContext(current), victim);
                        const actualPower = p(electroballId, "charge", actual);
                        const actualLoad = p(electroballId, "load", actual);
                        const actualSparks = Math.max(8, Math.round(p(electroballId, "sparks", actual)));
                        const landed = impact(current, hit, electroballId, actualPower, { damage: damageSpec(electroballId, "charge") });
                        if (landed) {
                            WorldFeedback.emit(scope, electroballScene, 1, point,
                                { moment: "burst", target: String(victim.ref()), sparks: actualSparks, scale: electroballScale(actualLoad),
                                    intensity: electroballIntensity(actualPower), load: Math.round(actualLoad * 100) / 100 }, 26);
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.15, 0)),
                                actualLoad >= 2.5 ? electroballMaxText : electroballHitText, [Math.round(actualPower)], 24);
                            scope.sound("cobblemon:impact.electric", point, 16, "{}");
                        }
                        finish(current);
                        return;
                    }
                    // 撞到方块或第一个挡路的非友方：在真实接触点散开，不飞越它去锁后面的伤害。
                    const at = hit.blocked() && hit.blockPosition() !== null ? hit.blockPosition()! : point;
                    WorldFeedback.emit(scope, electroballScene, 1, at,
                        { moment: "fade", blocked: hit.blocked() ? 1 : 0, face: hit.blocked() ? hit.blockFace() : "",
                            scale: predictedScale, direction: [direction.x(), direction.y(), direction.z()] }, 20);
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.8, 0)), electroballMissText, [], 20);
                    finish(current);
                }
            }, function (current: CombatAction) {
                if (settled) return;
                // 飞满射程没碰到任何东西：在施法者身边收势解散。
                const scope = current.world(), self = scope.observe(action.actor());
                if (self !== null) {
                    WorldFeedback.emit(scope, electroballScene, 1, self.position(), { moment: "fade", scale: predictedScale }, 18);
                    WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.05, 0)), electroballMissText, [], 20);
                }
                finish(current);
            });
            scenes.show(action, "flight", origin, { moment: "flight", projectile: flight, scale: predictedScale,
                intensity: electroballIntensity(power), sparks: predictedSparks, direction: [direction.x(), direction.y(), direction.z()] });
        }
    });
}
