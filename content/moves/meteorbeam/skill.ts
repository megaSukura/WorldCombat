/**
 * 流星光束 / meteorbeam —— 出手方式。
 *
 * 核心念头：把天上的碎星拉下来收进身体（特攻抬一级），再朝瞄准的点或实体抛出一颗走真实抛物线的陨石；
 *           弧线必须先解算得出来、再逐刻确认没有被真实方块截断，才允许发出。它越过真正挡得住的掩体落下，
 *           正面砸中的身体单独吃一记重击，落点半径内、从落点真正可达的别的敌人各吃一记溅射并被顶开。
 *
 * 两幕：
 *   起（gather，提交前）：星点从高空落向施法者；只播预告，可被打断（打断不花 PP，也不给特攻）。
 *   击（throw → flight → burst / miss）：提交后先结算特攻提升，再用共享 `LivingActions.ballisticSolutions`
 *       在低/高两条弧里挑一条真实可达、且逐刻不被方块挡住的；找不到可达弧就明确拒绝/落空，绝不改直射假称命中。
 *
 * 可达与掩体：`meteorbeamPlan` 是执行与 AI 共用的唯一规划函数。低弧用其逐刻点先试，挡住才试能越掩体的高弧；
 *   沿途的水、后加的墙都由原生弹体按真实物理处理。射程仍限制瞄准距离，弧长与到达刻数只决定飞行预算与寿命。
 * 命中：大身体正面命中独立结算一次，不受落点半径的中心距离限制；旁人按真实身体箱落在半径内、且从落点可达才吃一记。
 *
 * 与同族分开：电光束是雨天里的即时电矛；流星光束是唯一「一定蓄、一定走弧、且弧必须先被证明可达」的那个。
 */
namespace PokemonSkills {
    const meteorbeamScene = "world_combat:move_meteorbeam";
    const meteorbeamBoostText = "world_combat.move.meteorbeam.text.boost";
    const meteorbeamShatterText = "world_combat.move.meteorbeam.text.shatter";
    const meteorbeamMissText = "world_combat.move.meteorbeam.text.miss";

    /** 原版投掷物的空气阻力与重力（见 LivingActions.ballisticPath 的逐刻递推）。 */
    const meteorbeamGravity = 0.05;
    /** 陨石存活上限；高弧也必须在这 160 刻内到达，不能暗中加射程。 */
    const meteorbeamLifetime = 160;
    /** presentation 里 `data.scale` 的参考落点半径，与实际 blast 相除后交给客户端。 */
    const meteorbeamReferenceBlast = 1.9;

    /** 一条可达弧：真实初速方向、到达刻数、路径长度、是否为高弧，以及逐刻世界点。 */
    export interface MeteorbeamPlan {
        launch: CombatPoint;
        ticks: number;
        length: number;
        high: boolean;
        points: CombatPoint[];
    }

    /** 当前施法者的初速参数；执行传动作，AI 传自己的世界作用域。 */
    export function meteorbeamSpeed(source: ParameterSource): number {
        return p("meteorbeam", "velocity", source);
    }

    /** 逐刻点里只要有一段真实撞到方块，这条弧就不算通达。 */
    function meteorbeamArcClear(world: CombatWorld, points: CombatPoint[]): boolean {
        for (let i = 1; i < points.length; i++) {
            const hit = world.clipBlocks(points[i - 1], points[i]);
            if (hit === null) return false;
            if (hit.blocked() && !(i === points.length - 1 && hit.position().minus(points[i]).length() <= 0.02)) return false;
        }
        return true;
    }

    /**
     * 执行与 AI 共用的唯一规划函数：共享几何给出低/高两条弧（按到达先后），逐条用真实方块检查其逐刻路径。
     * 第一条通达的弧胜出，所以低弧优先、高弧只在真的能越掩体时采用。null 表示当前速度在寿命内没有可达弧，
     * 调用方必须明确失败，不能补一发射向瞄准点的直球再声称命中。
     */
    export function meteorbeamPlan(world: CombatWorld, origin: CombatPoint, target: CombatPoint, speed: number): MeteorbeamPlan | null {
        const solutions = LivingActions.ballisticSolutions(origin, target, speed, meteorbeamGravity, meteorbeamLifetime);
        for (let i = 0; i < solutions.length; i++) {
            const solution = solutions[i];
            if (meteorbeamArcClear(world, solution.points)) {
                return { launch: solution.direction, ticks: solution.ticks, length: solution.length, high: i > 0, points: solution.points };
            }
        }
        return null;
    }

    define({
        id: "meteorbeam",
        name: "流星光束",
        description: "站定聚星，提高特攻，随后抛出一颗陨石。陨石能越过低矮掩体；直接命中的敌人受到重击，落点附近的敌人受到溅射并被推开。",
        uses: ["越过低矮掩体", "蓄势提高特攻", "击散落点附近的敌人"],
        kind: "aim",
        range: 14,
        maxRange: 22,
        prepare: 30,
        active: 60,
        recover: 10,
        cooldown: 52,
        style: "meteor",
        stationary: true,
        defaults: { deep: false, ai: { maxChase: 20, minRange: 4 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("meteorbeam", "blast", pokemon), geometry: "area", style: "meteor", color: 0x9A8A72,
                label: config && config.deep ? "深空流星光束" : "流星光束" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["meteorbeam"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            const deep = !!(config && config.deep);
            return {
                prepare: Math.round(p("meteorbeam", "charge", context)),
                recover: Math.round(p("meteorbeam", "recover", context)),
                cooldown: Math.round(p("meteorbeam", "cooldown", context)) + (deep ? 5 : 0),
                active: skills["meteorbeam"].active,
                range: skills["meteorbeam"].range
            };
        },
        // 提交前先解算一次可达弧：没有可达弧就不进入施放，不花 PP，也不假装能砸到。
        ready: function (action) {
            const speed = meteorbeamSpeed(action);
            if (meteorbeamPlan(action.sense(), action.origin(), action.targetPosition(), speed) !== null) return "";
            const reachable = LivingActions.ballisticSolutions(action.origin(), action.targetPosition(), speed, meteorbeamGravity, meteorbeamLifetime).length > 0;
            return reachable ? "target-not-visible" : "out-of-range";
        },
        windup: function (action, config, prepare) {
            const stars = Math.max(8, Math.round(p("meteorbeam", "starlight", action)));
            action.present("meteorbeam:gather", meteorbeamScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, starlight: stars, deep: config && config.deep ? 1 : 0, target: String(action.actor().ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const point = action.targetPosition();
            const power = p("meteorbeam", "meteor", action);
            const splash = p("meteorbeam", "splash", action);
            const speed = p("meteorbeam", "velocity", action);
            const blast = p("meteorbeam", "blast", action);
            const stone = p("meteorbeam", "stone", action);
            const blowback = p("meteorbeam", "blowback", action);
            const stars = Math.max(8, Math.round(p("meteorbeam", "starlight", action)));
            const stages = Math.max(1, Math.round(p("meteorbeam", "boost", action)));
            const scale = blast / meteorbeamReferenceBlast;
            const intensity = Math.max(0.6, Math.min(2.6, power / 120));
            const scenes = WorldFeedback.actionScenes(meteorbeamScene, 1);
            let settled = false, landing: CombatPoint | null = null, victim: CombatActor | null = null, flightId = "", contact: CombatImpact | null = null;

            // 聚星完成：特攻提升落在共享能力等级上，命中与否都保留。
            const gained = NativeEffects.boost(world, actor, "spa", stages);
            const body = world.observe(actor);
            if (body !== null && gained > 0) {
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), meteorbeamBoostText, [gained], 28);
                WorldFeedback.emit(world, meteorbeamScene, 1, body.position(), { moment: "boost", target: String(actor.ref()), starlight: stars, scale: scale }, 24);
            }
            sound(action, "minecraft:entity.ender_dragon.shoot");

            const plan = meteorbeamPlan(world, origin, point, speed);
            if (plan === null) {
                // 提交到执行之间地形变了、不再有可达弧：保留特攻，不发射，只在身体处报落空。
                if (body !== null) {
                    WorldFeedback.emit(world, meteorbeamScene, 1, body.position(), { moment: "miss", scale: scale, starlight: stars }, 20);
                    WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.0, 0)), meteorbeamMissText, [], 24);
                }
                scenes.finish(action, done);
                return;
            }
            const route: MeteorbeamPlan = plan;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                scenes.stop(current, "flight");
                const scope = current.world();
                if (landing === null) {
                    const end = scope.projectilePosition(flightId);
                    if (end !== null) {
                        WorldFeedback.emit(scope, meteorbeamScene, 1, end, { moment: "miss", scale: scale, starlight: stars }, 20);
                        WorldFeedback.text(scope, end.plus(WorldCombat.point(0, 1.0, 0)), meteorbeamMissText, [], 24);
                    }
                    scenes.finish(current, done);
                    return;
                }
                const at = landing;
                const direct = victim !== null && scope.valid(victim) ? victim : null;
                let hits = 0;

                // 正面命中的身体独立结算一次：大身体中心哪怕在落点半径之外，也不漏掉这一记主伤。
                if (direct !== null) {
                    const struck = scope.observe(direct);
                    if (contact && impact(current, contact, "meteorbeam", power, { damage: damageSpec("meteorbeam", "meteor") })) {
                        hits++;
                        if (struck !== null) {
                            const outward = struck.position().minus(at);
                            if (outward.length() >= 0.05) scope.hitDisplace(direct, outward.unit().scale(blowback));
                        }
                        WorldFeedback.emit(scope, meteorbeamScene, 1, at,
                            { moment: "burst", target: String(direct.ref()), starlight: stars, scale: scale, direct: 1,
                                intensity: Math.max(0.6, Math.min(2.6, power / 120)) }, 26);
                    }
                }

                // 旁人按真实身体箱落在落点半径内、且从落点真正可达（隔墙不穿）才各吃一次溅射，正面那个不重复。
                WorldGeometry.selectBodies(scope, WorldGeometry.bodySphere(at, blast), function (enemy, facts) {
                    if (facts.friendly()) return;
                    if (direct !== null && String(enemy.ref()) === String(direct.ref())) return;
                    if (!scope.clear(at, facts.position())) return;
                    if (!hurt(current, enemy, "meteorbeam", splash, { damage: damageSpec("meteorbeam", "splash") })) return;
                    hits++;
                    const outward = facts.position().minus(at);
                    if (outward.length() >= 0.05 && scope.valid(enemy)) scope.hitDisplace(enemy, outward.unit().scale(blowback));
                    WorldFeedback.emit(scope, meteorbeamScene, 1, facts.position(),
                        { moment: "burst", target: String(enemy.ref()), starlight: stars, scale: scale, direct: 0,
                            intensity: Math.max(0.6, Math.min(2.6, splash / 120)) }, 26);
                });

                // 落点只留一记短促碎石与尘；地面方块不被改写，碎石铺开的范围读取实际 blast。
                WorldFeedback.emit(scope, meteorbeamScene, 1, at,
                    { moment: "debris", point: [at.x(), at.y(), at.z()], scale: scale, starlight: stars, blast: blast,
                        hits: hits, debris: Math.max(6, 8 + hits), stones: Math.max(3, 4 + hits), intensity: intensity }, 30);
                sound(current, "minecraft:entity.generic.explode");
                sound(current, "cobblemon:impact.rock");
                if (hits > 0) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), meteorbeamShatterText, [hits], 28);
                else WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), meteorbeamMissText, [], 24);
                scenes.finish(current, done);
            }

            // 真实原生弹体：实际起点与解算初速、真实重力；距离预算取实际弧长，寿命取到达刻数并受 160 刻上限约束。
            const budget = Math.max(1, Math.ceil(route.length) + 1);
            const lifetime = Math.max(1, Math.min(meteorbeamLifetime, Math.ceil(route.ticks) + 6));
            flightId = action.projectile(origin, route.launch.scale(speed), meteorbeamGravity, stone, budget, lifetime,
                function (current, hit) {
                    if (landing === null) {
                        landing = hit.position(); victim = hit.hitEntity() ? hit.target() : null; contact = hit;
                        if (hit.blocked()) {
                            const face: { [key: string]: number[] } = { up:[0,1,0],down:[0,-1,0],north:[0,0,-1],south:[0,0,1],west:[-1,0,0],east:[1,0,0] };
                            const normal = face[hit.blockFace()];
                            if (normal) landing = landing.plus(WorldCombat.point(normal[0],normal[1],normal[2]).scale(.02));
                        }
                    }
                    finish(current);
                },
                function (current) { finish(current); },
                JSON.stringify({ sprite: "cobblemon:particle/moves/meteor", scale: Math.max(0.9, stone * 2.4), glow: true, spin: true }));
            scenes.show(action, "flight", origin,
                { moment: "flight", projectile: flightId, scale: scale, starlight: stars, intensity: intensity, blast: blast,
                    direction: [route.launch.x(), route.launch.y(), route.launch.z()] });
        }
    });
}
