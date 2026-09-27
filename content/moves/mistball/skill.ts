/**
 * 薄雾球 / mistball —— 注册与动作。
 *
 * 两幕（空放多一幕）：
 *   起（windup，提交前）：身前吹起一团羽绒与雾，越吹越密，只播预告。
 *   抛（execute，提交后）：羽绒球沿一道弧线飞向准心（`ballistic` 求出落点速度），自由瞄准、可空投；
 *       首碰活物就炸开：先结算一次 `puff` 特殊伤害，再在命中点散开一团羽绒雾（短暂的 `cloud`）；
 *       真的造成伤害后按 `downChance` 掷一次——中了就实际施加 `world_combat:downcast`
 *       （移动变慢），并降 `dropStages` 级特攻（`NativeEffects.boost(..., "spa", -1)`）。
 *       只有该次附带真正挂上时，才创建一个跟随该目标、与状态同寿命的托管贴身雾（`mistballCling`）：
 *       雾贴在目标身上、随目标移动，状态被驱散就立即散。首碰方块或飞到射程尽头只留一撮羽绒（fizzle）。
 *
 * 与同族分开：月亮之力是一颗快而直的实球、看天吃饭；薄雾球是慢而弯的轻球、必留一片缠身的雾，
 * 也用它 5 点 PP 与长冷却换来本组最高的降攻概率。射程由独立的 `reach` 参数决定，与雾团半径无关。
 */
namespace PokemonSkills {
    /** 目标离场时冻结最后一个身体点；自由点输入原样返回。 */
    function mistballAimPoint(action: CombatAction, world: CombatWorld): CombatPoint {
        const target = action.target();
        if (target !== null && !world.valid(target)) action.releaseTarget();
        return action.targetPosition();
    }

    /** 沿解出的真实弹道逐段查墙（clipBlocks 畅通返回 MISS，用 WorldGeometry.blockHit 只认 BLOCK），
     * 并按球的判定半径向上下左右外扩一档，要求这一段净空容得下这颗球。 */
    export function mistballArcClear(world: CombatWorld, points: CombatPoint[], radius: number): boolean {
        for (let index = 1; index < points.length; index++) {
            const from = points[index - 1], to = points[index], delta = to.minus(from);
            if (delta.length() < 1e-6) continue;
            if (WorldGeometry.blockHit(world, from, to) !== null) return false;
            if (radius > 0) {
                const horizontal = WorldCombat.point(delta.x(), 0, delta.z());
                const side = horizontal.length() < 1e-6 ? WorldCombat.point(1, 0, 0)
                    : WorldCombat.point(-horizontal.z(), 0, horizontal.x()).unit();
                const up = WorldCombat.point(0, radius, 0), right = side.scale(radius);
                if (WorldGeometry.blockHit(world, from.plus(up), to.plus(up)) !== null) return false;
                if (WorldGeometry.blockHit(world, from.minus(up), to.minus(up)) !== null) return false;
                if (WorldGeometry.blockHit(world, from.plus(right), to.plus(right)) !== null) return false;
                if (WorldGeometry.blockHit(world, from.minus(right), to.minus(right)) !== null) return false;
            }
        }
        return true;
    }

    /** 这条初速与重力下真正可达、且净空容得下球的一条低弧/高弧解；从低弧起挑第一条畅通的，都没有就 null。 */
    export function mistballArc(world: CombatWorld, origin: CombatPoint, landing: CombatPoint, speed: number, gravity: number, radius: number): LivingActions.BallisticSolution | null {
        if (landing.minus(origin).length() < 0.05) return null;
        const solutions = LivingActions.ballisticSolutions(origin, landing, speed, gravity, mistballFlightTicks);
        for (let index = 0; index < solutions.length; index++)
            if (mistballArcClear(world, solutions[index].points, radius)) return solutions[index];
        return null;
    }

    // 贴身羽绒雾：由命中时这一次附带创建的托管效果拥有。start 绑定实际 downcast 载体的 lease，
    // 每 tick 复核载体是否还在——被牛奶／清除／替换后立即结束，画面随效果清理，绝不比状态多留。
    WorldCombat.effect(mistballCling, 1, 800, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        ["motes", "cloud", "stages"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid mistball cling: " + key);
        });
        if (value.motes < 0 || value.cloud <= 0 || value.stages < 0) throw new Error("Invalid mistball cling");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(mistballCling, "start", function (effect) {
        const world = effect.world(), target = effect.target();
        if (!world.valid(target)) { effect.end(); return; }
        const data = JSON.parse(effect.state());
        data.lease = MobEffects.bind(world, target, mistballEffect);
        effect.state(JSON.stringify(data));
        effect.schedule("watch", "watch", 1, "{}");
    });
    WorldCombat.effectHandler(mistballCling, "watch", function (effect) {
        const world = effect.world(), target = effect.target(), data = JSON.parse(effect.state()), body = world.observe(target);
        if (body === null || !MobEffects.present(world, data.lease)) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "mistball:cling", mistballScene, 1, body.position(),
            { moment: "cling", target: String(target.ref()), motes: data.motes, cloud: data.cloud });
        effect.schedule("watch", "watch", 1, "{}");
    });

    define({
        id: mistballId,
        cooldownParameter: "recharge",
        name: "Mist Ball",
        description: "把一团羽绒与雾揉成轻球抛向准心：命中造成超能力特殊伤害，并散开一团羽绒雾；有一半机会把雾糊在目标身上，压低它的特攻、拖慢它的脚步。浓雾式糊得更久更大，代价是球更轻更慢。可以对着空点空投，也可以点选任意一个敌人。",
        uses: ["从远处把一个威胁糊住、拖慢", "对上法系目标时高概率压特攻", "抛一道弧线越过前排够到后排"],
        kind: "aim",
        range: 10,
        maxRange: 18,
        prepare: 8,
        active: 0,
        recover: 9,
        cooldown: 90,
        style: "down",
        defaults: { suffuse: true, ai: { maxChase: 11 } },
        fields: [
            field(pathOf("suffuse"), "浓雾式", "boolean", {
                help: "开启：雾团画面 ×1.25、缠身概率 +0.10、缠身时长 ×1.25，代价是威力 ×0.88、抛球速度 ×0.9，用来看住一个目标。关闭（轻羽式）：威力 ×1.12、抛球速度 ×1.12、下坠更平，代价是雾团画面 ×0.85、缠身概率 −0.06，用来打一记快而轻的。"
            })
        ],
        indicator: function (config, pokemon) {
            const suffuse = !(config && config.suffuse === false);
            return { radius: p(mistballId, "reach", pokemon), geometry: "line", style: "down",
                color: 0xF3F0FF, label: suffuse ? "薄雾·浓雾" : "薄雾·轻羽" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[mistballId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(mistballId, "tempo", context)),
                recover: Math.round(p(mistballId, "aftercast", context)),
                cooldown: Math.round(p(mistballId, "recharge", context)),
                active: 0,
                range: p(mistballId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense();
            const cloud = p(mistballId, "cloud", action);
            const motes = Math.max(10, Math.round(p(mistballId, "motes", action)));
            const speed = Math.max(0.35, p(mistballId, "lob", action));
            const gravity = Math.max(0.01, p(mistballId, "fall", action));
            const radius = Math.max(0.15, p(mistballId, "collisionRadius", action));
            const self = world.observe(action.actor());
            const origin = self === null ? action.origin() : self.position();
            const reach = Math.max(1, p(mistballId, "reach", action));
            // 起手就把这一抛真正可达的弧线（低/高弧、按弧长预算）画成预告；解不出就不画，不冒充可达。
            let landing = action.targetPosition();
            const delta = landing.minus(origin);
            if (delta.length() < 0.05) {
                const heading = action.direction().length() < 1e-6 ? WorldCombat.point(0, 0, 1) : action.direction().unit();
                landing = origin.plus(heading.scale(reach));
            } else if (delta.length() > reach) landing = origin.plus(delta.unit().scale(reach));
            const solution = mistballArc(world, origin, landing, speed, gravity, radius);
            const path = solution === null ? [] : solution.points.map(function (v: CombatPoint): number[] { return [v.x(), v.y(), v.z()]; });
            action.present("world_combat:move_mistball:puff", mistballScene, 1, origin,
                JSON.stringify({ moment: "charge", cloud: cloud, motes: motes, path: path,
                    noarc: solution === null ? 1 : 0, suffuse: !(config && config.suffuse === false) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const selfActor: CombatActor = action.actor();
            const self = world.observe(selfActor);
            const origin = self === null ? action.origin() : self.position();
            const power = p(mistballId, "puff", action);
            const speed = Math.max(0.35, p(mistballId, "lob", action));
            const gravity = Math.max(0.01, p(mistballId, "fall", action));
            const radius = Math.max(0.15, p(mistballId, "collisionRadius", action));
            const chance = Math.max(0, Math.min(1, p(mistballId, "downChance", action)));
            const stages = Math.max(1, Math.round(p(mistballId, "dropStages", action)));
            const downTicks = Math.max(20, Math.round(p(mistballId, "downTicks", action)));
            const cloud = p(mistballId, "cloud", action);
            const motes = Math.max(10, Math.round(p(mistballId, "motes", action)));
            const scenes = WorldFeedback.actionScenes(mistballScene, 1);

            // 落点：给定世界点/实体点直接读；只给方向时沿方向取射程，并一律夹在本招射程内，
            // 目标远移不会把单发射程拉长。
            const reach = Math.max(1, action.range());
            const aimPoint = mistballAimPoint(action, world);
            let landing = aimPoint;
            const delta = landing.minus(origin);
            if (delta.length() < 0.05) {
                const heading = action.direction().length() < 1e-6 ? WorldCombat.point(0, 0, 1) : action.direction().unit();
                landing = origin.plus(heading.scale(reach));
            } else if (delta.length() > reach) {
                landing = origin.plus(delta.unit().scale(reach));
            }

            sound(action, "cobblemon:move.mist.actor");
            // 只有真实可达且净空容得下球的低/高弧才发；解不出就不假直射越障，原地只散一撮羽绒。
            const solution = mistballArc(world, origin, landing, speed, gravity, radius);
            if (solution === null) {
                WorldFeedback.emit(world, mistballScene, 1, origin,
                    { moment: "fizzle", cloud: cloud }, 24);
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.0, 0)), mistballMissText, [], 22);
                scenes.finish(action, done);
                return;
            }
            const direction = solution.direction;
            const flightRange = Math.max(1.5, solution.length + 0.6);
            const flightLifetime = Math.max(24, Math.ceil(solution.ticks) + 10);

            let struck = false;
            const flight = LivingActions.projectile(action, {
                speed: speed, range: flightRange, radius: radius, gravity: gravity, direction: direction, lifetime: flightLifetime,
                appearance: { sprite: "cobblemon:generic/orb/largesmokeorb", tint: 0xF3F0FF, glow: true, scale: 0.9 },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    struck = true;
                    const scope = current.world(), target = hit.target(), at = hit.position();
                    scenes.stop(current, "flight");
                    // 首碰方块或友方：只散一撮羽绒，不成伤、不粘雾。
                    if (target === null || !scope.valid(target) || scope.friendly(target)) {
                        WorldFeedback.emit(scope, mistballScene, 1, at, { moment: "fizzle", cloud: cloud }, 22);
                        sound(current, "minecraft:block.wool.place");
                        return;
                    }
                    const landed = impact(current, hit, mistballId, power, { damage: damageSpec(mistballId, "puff") });
                    if (!landed) {
                        WorldFeedback.emit(scope, mistballScene, 1, at, { moment: "fizzle", cloud: cloud }, 22);
                        return;
                    }
                    WorldFeedback.emit(scope, mistballScene, 1, at,
                        { moment: "burst", target: String(target.ref()), cloud: cloud, motes: motes,
                            intensity: Math.max(0.5, Math.min(2.2, power / 90)) }, 26);
                    WorldFeedback.emit(scope, mistballScene, 1, at,
                        { moment: "cloud", target: String(target.ref()), cloud: cloud, motes: motes }, 40);
                    sound(current, "cobblemon:impact.psychic");
                    if (scope.valid(target) && scope.random() < chance) {
                        // 特攻等级下降（普通能力等级，持久）与有限减速（downcast 载体，到期/驱散即恢复）各自独立结算。
                        const dropped = NativeEffects.boost(scope, target, "spa", -stages);
                        const carrier = MobEffects.apply(scope, target, mistballEffect, downTicks, 0);
                        if (carrier !== null) {
                            // 后挂雾与减速载体同一份有限责任公司：载体在，雾在；载体被清即散。
                            scope.effect(mistballCling, target,
                                JSON.stringify({ motes: motes, cloud: cloud, stages: stages }), downTicks);
                        }
                        if (dropped !== 0) {
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), mistballDownText, [-dropped], 34);
                        }
                    }
                }
            }, function (current: CombatAction) {
                if (!struck) {
                    // 飞尽或用尽射程：落在 projectilePosition 的真实末点，不用旧瞄点或满射程点假造终点。
                    const scope = current.world(), end = scope.projectilePosition(flight) || origin;
                    WorldFeedback.emit(scope, mistballScene, 1, end,
                        { moment: "fizzle", cloud: cloud }, 24);
                    WorldFeedback.text(scope, end.plus(WorldCombat.point(0, 1.0, 0)), mistballMissText, [], 22);
                }
                scenes.finish(current, done);
            });
            scenes.show(action, "flight", origin, { moment: "flight", projectile: flight, cloud: cloud, motes: motes });
        }
    });
}
