/**
 * 火焰球 / pyroball 的出手方式。
 *
 * 核心念头：捡起脚边的小石、点燃它，再像抽射一样把火球踢出去——火球带着焰尾沿一道低弧飞出，命中
 * 炸开成一团火与碎石，并可能把目标引燃。原生的 90 命中在这里是「这一脚踢得正不正」：火球出膛带一点
 * 散布，速度快的个体踢得更直，蛮踢式更野；玩家从火球偏没偏就能读出这一脚。
 *
 * 三幕：
 *   起（windup，提交前）：小石在脚边被点着、火苗从脚面升起，只播预告。
 *   飞（flight，提交后）：火球沿低弧飞出，拖着焰尾与脱落的小火星。
 *   爆（burst / scorch / burn）：命中活物时结算 blast 物理伤害，并按概率把它引燃（共享灼伤默认效果）；
 *       落点炸开火与碎石，地上留下一圈按 scorchTicks 淡去的焦土。
 *
 * 与同族分开：喷火是持续的焰流、喷烟是烟幕；火焰球是**踢出去的一颗实心火石**，先起脚、再走低弧、
 * 落点留焦土，命中还能引燃。
 * 配置 `savage` 由 resolve 改时序、由公式改威力／散布／射程，提交后才触碰世界。
 */
namespace PokemonSkills {
    const pyroballScene = "world_combat:move_pyroball";
    const pyroballBurnText = "world_combat.move.pyroball.text.burn";

    /** 把方向绕 Y 轴旋转 angle 弧度；用于给这一脚加一点出膛散布。 */
    function pyroballRotate(direction: CombatPoint, angle: number): CombatPoint {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);
    }

    /** 落点下方第一块实心方块的顶面位置；给焦土一个贴地的锚点。 */
    function pyroballGround(world: CombatWorld, point: CombatPoint): CombatPoint {
        const x = Math.floor(point.x()), z = Math.floor(point.z()), base = Math.floor(point.y());
        for (let dy = 0; dy <= 5; dy++) {
            const y = base - dy;
            const block = world.block(WorldCombat.point(x, y, z));
            if (block === null) continue;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            return WorldCombat.point(x + 0.5, y + 1.02, z + 0.5);
        }
        return point;
    }

    define({
        id: "pyroball",
        cooldownParameter: "recharge",
        name: "Pyro Ball",
        description: "点燃脚边的小石，再像抽射一样把火球踢出去：火球带焰尾沿低弧飞出，命中炸开成一团火与碎石，并可能把目标引燃；落点留下一圈慢慢淡去的焦土。",
        uses: ["中远距离的高威力火球点射", "用一脚抽射压血并可能引燃", "在落点留下焦土标记这一脚"],
        kind: "enemy",
        range: 14,
        maxRange: 20,
        prepare: 14,
        active: 0,
        recover: 10,
        cooldown: 46,
        style: "fire",
        defaults: { savage: false, ai: { maxChase: 20, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("pyroball", "heat", pokemon), geometry: "line", style: "fire",
                color: 0xFF8A3C, label: config && config.savage === true ? "蛮踢火焰球" : "火焰球" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["pyroball"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("pyroball", "tempo", context)),
                recover: Math.round(p("pyroball", "aftercast", context)),
                cooldown: Math.round(p("pyroball", "recharge", context)),
                active: 0,
                range: p("pyroball", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("pyroball:gather", pyroballScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", savage: config && config.savage === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const power = p("pyroball", "blast", action);
            const speed = p("pyroball", "velocity", action);
            const gravity = p("pyroball", "gravity", action);
            const radius = p("pyroball", "radius", action);
            const scatter = p("pyroball", "scatter", action);
            const burnChance = Math.max(0.01, Math.min(0.5, p("pyroball", "burnChance", action)));
            const sparks = Math.max(8, Math.round(p("pyroball", "sparks", action)));
            const heat = p("pyroball", "heat", action);
            const scorchTicks = Math.max(40, Math.round(p("pyroball", "scorchTicks", action)));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.26));
            const intensity = Math.max(0.6, Math.min(2.4, power / 120));
            const base = aim(action);
            const angle = (world.random() * 2 - 1) * scatter * Math.PI / 180;
            const direction = pyroballRotate(base, angle);
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "cobblemon:move.ember.actor");
            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/fire/flame", tint: 0xFF8A3C, glow: true,
                scale: Math.max(0.8, Math.min(1.8, radius / 0.26))
            };
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, gravity: gravity, lifetime: 200,
                direction: direction, appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const point = hit.position();
                    const target = hit.target();
                    if (target !== null && scope.valid(target) && !scope.friendly(target)) {
                        const landed = impact(current, hit, "pyroball", power,
                            { damage: damageSpec("pyroball", "blast"), status: "burn", chance: burnChance });
                        if (landed && scope.valid(target)) {
                            const body = scope.observe(target);
                            const at = body !== null ? body.position() : point;
                            WorldFeedback.emit(scope, pyroballScene, 1, at,
                                { moment: "burn", target: String(target.ref()), sparks: sparks, heat: heat, intensity: intensity }, 120);
                            if (CombatStatus.has(scope, target, "burn"))
                                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.3, 0)), pyroballBurnText, [], 30);
                        }
                    }
                    WorldFeedback.emit(scope, pyroballScene, 1, point,
                        { moment: "burst", target: target !== null ? String(target.ref()) : "", sparks: sparks,
                            heat: heat, scale: scale, intensity: intensity }, 30);
                    sound(current, "cobblemon:impact.fire");
                    sound(current, "minecraft:entity.generic.explode");
                    const ground = pyroballGround(scope, point);
                    WorldFeedback.emit(scope, pyroballScene, 1, ground,
                        { moment: "scorch", heat: heat, scorch: scorchTicks, sparks: sparks, intensity: intensity }, Math.min(1200, scorchTicks));
                    finish(current);
                }
            }, function (current: CombatAction) { finish(current); });
            WorldFeedback.keep(world, "pyroball:trail:" + action.id(), pyroballScene, 1, origin,
                { moment: "flight", projectile: flight, scale: scale, intensity: intensity }, 120);
        }
    });
}
