/**
 * 千变万花 / flowertrick —— 注册与动作。
 *
 * 核心念头：一束做了手脚的花。出手前锁定一个可达落点，按真实抛物线抛出；出手后不再拐弯，落体第一次碰到敌人
 *   就整束绽开、花瓣全扑在薄弱处（必定击中要害）；碰到地面或墙只散瓣、不结算伤害。
 * 两种投法同出一束：平掷又快又远、威力更高，但低掩体就能挡住弧线；高抛按可达范围里最高的解飞得高、越过低掩体
 *   落到掩体后，但飞得慢、威力略低。
 *
 * 幕：
 *   起（windup，提交前）：把花束在手里理好、扬手蓄势，只播预告。
 *   投（flight → bloom / miss，提交后）：冻结当刻瞄点（实体身体点、世界点或方向端点）并夹在本招射程内，用共享
 *       `LivingActions.ballisticSolutions` 解出低弧或高弧，抛出真实物品弹体。命中非友方活体结算一次 `bloom` 草属性
 *       物理伤害（必定要害）；碰地、碰墙或碰友方只散瓣。飞尽没碰到就用弹体真实末点散瓣，不放大射程补伤。
 *
 * 选取 `kind: "aim"`：可点任意阵营实体、也能只给一个方向或世界点空投；没有活体时按方向端点解弧、落空只散瓣。
 * 与波导弹（长距追移动敌）、投球（多球逐次重瞄）、种子炸弹（落地浅弹引信）分开：它一次承诺、锁点不追、首体必暴。
 */
namespace PokemonSkills {
    /** 原版投掷物的空气阻力与重力（见 LivingActions.ballisticPath 的逐刻递推）。 */
    const flowertrickGravity = 0.05;
    /** 可达弧的时间预算；高弧必须在这段预算内到达，不暗中加射程。 */
    const flowertrickFlightTicks = 90;

    define({
        id: flowertrickId,
        cooldownParameter: "recharge",
        name: "Flower Trick",
        description: "锁定一个落点掷出一束做了手脚的花：出手后不再拐弯，第一次碰到敌人就整束绽开、花瓣全扑在薄弱处（必定击中要害）；碰到地面或墙只散瓣、不伤人。高抛式能越过低掩体落到掩体后，但飞得更慢。",
        uses: ["把可靠的一击压在一个目标身上", "越过低掩体打到掩体后的目标", "让停在原地或移动慢的目标吃下必定要害"],
        kind: "aim",
        range: 10,
        maxRange: 15,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 40,
        style: "bloom",
        defaults: { highArc: false, ai: { maxChase: 14, finish: true } },
        fields: [flag("highArc", "高抛")],
        indicator: function (config, pokemon) {
            return { radius: p(flowertrickId, "reach", pokemon), geometry: "line", style: "bloom", color: 0xF0A6C8,
                label: config && config.highArc === true ? "千变万花·高抛" : "千变万花·平掷" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[flowertrickId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(flowertrickId, "tempo", context)),
                recover: Math.round(p(flowertrickId, "aftercast", context)),
                cooldown: Math.round(p(flowertrickId, "recharge", context)),
                active: 0,
                range: p(flowertrickId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("flowertrick:ready", flowertrickScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare, highArc: !!(config && config.highArc) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p(flowertrickId, "bloom", action);
            const speed = Math.max(0.4, p(flowertrickId, "velocity", action));
            const radius = Math.max(0.15, p(flowertrickId, "radius", action));
            const reach = Math.max(4, p(flowertrickId, "reach", action));
            const petals = Math.max(12, Math.round(p(flowertrickId, "petals", action)));
            const highArc = !!(config && config.highArc);
            const scale = Math.max(0.7, Math.min(1.8, radius / 0.3));
            const intensity = Math.max(0.6, Math.min(2.2, power / 62));
            const scenes = WorldFeedback.actionScenes(flowertrickScene);
            let contacted = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            // 冻结当刻瞄点：实体取其身体瞄点、点/方向取端点；出手后不再追实体。
            const aim = action.targetPosition();
            action.releaseTarget();
            const raw = aim.minus(origin);
            const heading = raw.length() < 0.05 ? (action.direction().length() < 1e-6 ? WorldCombat.point(0, 0, 1) : action.direction().unit()) : raw.unit();
            const span = raw.length() < 0.05 ? reach : Math.min(raw.length(), reach);
            const landing = origin.plus(heading.scale(span));

            const solutions = LivingActions.ballisticSolutions(origin, landing, speed, flowertrickGravity, flowertrickFlightTicks);
            if (solutions.length === 0) {
                // 这一速度在这段预算里解不出可达弧：明确落空，不抛假花、不追到任意远。
                WorldFeedback.emit(world, flowertrickScene, 1, origin,
                    { moment: "miss", petals: Math.round(petals * 0.6), scale: scale }, 18);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.2, 0)), flowertrickMissText, [], 20);
                scenes.finish(action, done);
                return;
            }
            // 高抛取可达范围里最高的解；射程近到只有一条解时退回那一条，不假装有高弧。
            const solution = highArc && solutions.length > 1 ? solutions[solutions.length - 1] : solutions[0];

            sound(action, "minecraft:entity.firework_rocket.launch");
            const appearance: any = { item: "minecraft:pink_tulip", scale: Math.max(1, scale * 1.2), glow: true, spin: true };
            const flightRange = Math.max(2, solution.length + 1);
            const lifetime = Math.min(flowertrickFlightTicks + 10, Math.ceil(solution.ticks) + 6);
            let flight = "";
            flight = LivingActions.projectile(action, {
                speed: speed, range: flightRange, radius: radius, gravity: flowertrickGravity,
                direction: solution.direction, lifetime: lifetime, appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    contacted = true;
                    scenes.stop(current, "flight");
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    if (hit.hitEntity() && victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const landed = impact(current, hit, flowertrickId, power, { damage: damageSpec(flowertrickId, "bloom"), critical: true });
                        WorldFeedback.emit(scope, flowertrickScene, 1, point,
                            { moment: "bloom", target: String(victim.ref()), petals: petals, scale: scale, intensity: intensity, landed: landed ? 1 : 0 }, 26);
                        scope.sound("cobblemon:impact.grass", point, 14, "{}");
                        scope.sound("minecraft:block.pink_petals.break", point, 12, "{}");
                        if (landed) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), flowertrickBloomText, [], 22);
                    } else {
                        // 碰地/墙/友方：不结算伤害，只在真实接触点散瓣。
                        WorldFeedback.emit(scope, flowertrickScene, 1, point,
                            { moment: "miss", petals: Math.round(petals * 0.6), scale: scale }, 20);
                        scope.sound("minecraft:block.pink_petals.break", point, 12, "{}");
                    }
                    finish(current);
                }
            }, function (current: CombatAction) {
                if (!contacted) {
                    // 飞尽也没碰到：用弹体真实末点散瓣，不用满射程点或旧瞄准点假造终点。
                    const scope = current.world();
                    const end = scope.projectilePosition(flight);
                    if (end !== null) {
                        WorldFeedback.emit(scope, flowertrickScene, 1, end,
                            { moment: "miss", petals: Math.round(petals * 0.6), scale: scale }, 20);
                        WorldFeedback.text(scope, end.plus(WorldCombat.point(0, 1.0, 0)), flowertrickMissText, [], 20);
                    }
                }
                finish(current);
            });
            scenes.show(action, "flight", origin,
                { moment: "flight", projectile: flight, petals: petals, scale: scale, intensity: intensity,
                    highArc: highArc ? 1 : 0, direction: [solution.direction.x(), solution.direction.y(), solution.direction.z()] });
        }
    });
}
