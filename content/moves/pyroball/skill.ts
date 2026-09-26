/**
 * 火焰球 / pyroball 的出手方式。
 *
 * 核心念头：捡起脚边的小石、点燃它，再像抽射一样把火球踢出去——火球带着焰尾沿一道低弧飞出，命中
 * 炸开成一团火与碎石，并可能把目标引燃。原生的 90 命中在这里是「这一脚踢得正不正」：火球出膛带一点
 * 散布，速度快的个体踢得更直，蛮踢式更野；玩家从火球偏没偏就能读出这一脚。
 *
 * 选取：`kind: "aim"`——可点实体、也可点方向或世界点空踢；提交与执行都不要求存在敌人。
 * 火球撞墙或落地时在真实接触点碎开，不在原瞄准点补一次假命中。
 *
 * 三幕：
 *   起（windup，提交前）：脚边固定着一颗小石球、火苗从石面升起，只播预告。
 *   滚（roll，提交后）：同一颗小石球沿瞄准方向短滚到踢点，画面从脚下把它交代清楚。
 *   飞（flight → burst / scorch / burn）：火球以同一块「烧红的石」外观从踢点低弧飞出，拖着焰尾与
 *       脱落的小火星；命中活物时结算 blast 物理伤害并按概率引燃（共享灼伤默认效果）；落点炸开火与碎石，
 *       地上留下一圈很快淡去的焦痕——它只是短装饰，不代表持续灼烧的地面。
 *
 * 与同族分开：喷火是持续的焰流、喷烟是烟幕；火焰球是**从脚下踢出去的一颗实心火石**，先滚起脚、再走低弧。
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

    /** 落点下方第一块实心方块的顶面位置；给焦痕一个贴地的锚点。 */
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
        description: "点燃脚边的小石，再像抽射一样把火球踢出去：火球带焰尾沿低弧飞出，命中炸开成一团火与碎石，并可能把目标引燃；落点留下一圈很快淡去的焦痕。",
        uses: ["中远距离的高威力火球点射", "用一脚抽射压血并可能引燃", "在落点留下焦痕标记这一脚"],
        kind: "aim",
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
                JSON.stringify({ moment: "gather", savage: config && config.savage === true,
                    scale: Math.max(0.4, Math.min(0.6, p("pyroball", "radius", action) / 0.26 * 0.45)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(pyroballScene);
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }
            if (self === null) { finish(action); return; }

            const power = p("pyroball", "blast", action);
            const speed = p("pyroball", "velocity", action);
            const gravity = p("pyroball", "gravity", action);
            const radius = p("pyroball", "radius", action);
            const scatter = p("pyroball", "scatter", action);
            const burnChance = Math.max(0.01, Math.min(0.5, p("pyroball", "burnChance", action)));
            const sparks = Math.max(8, Math.round(p("pyroball", "sparks", action)));
            const heat = p("pyroball", "heat", action);
            const scorchTicks = Math.max(40, Math.min(120, Math.round(p("pyroball", "scorchTicks", action))));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.26));
            const intensity = Math.max(0.6, Math.min(2.4, power / 120));
            const base = aim(action);
            const angle = (world.random() * 2 - 1) * scatter * Math.PI / 180;
            const direction = pyroballRotate(base, angle);
            const flat = WorldGeometry.flatUnit(direction, action.direction());
            const rollTicks = Math.max(2, Math.min(6, Math.round(7 - (speed - 0.9) * 3)));
            const kickDistance = Math.max(0.3, Math.min(1.2, radius * 2 + 0.35));
            const appearance: LivingActions.ProjectileAppearance = {
                block: "minecraft:magma_block", glow: true,
                scale: Math.max(0.35, Math.min(0.7, radius / 0.26 * 0.5))
            };

            sound(action, "cobblemon:move.ember.actor");

            function kick(current: CombatAction): void {
                scenes.stop(current, "roll");
                const scope = current.world();
                const me = scope.observe(actor);
                if (me === null) { finish(current); return; }
                // 从脚下踢出：出膛点在脚前，不是嘴边。
                const foot = me.position().plus(WorldCombat.point(0, -me.height() * 0.5 + radius, 0)).plus(flat.scale(kickDistance));
                const flight = current.projectile(foot, direction.scale(speed), gravity, radius, current.range(), 200,
                    function (flightAction: CombatAction, hit: CombatImpact) {
                        const scope = flightAction.world();
                        const point = hit.position();
                        const target = hit.target();
                        if (target !== null && scope.valid(target) && !scope.friendly(target)) {
                            const landed = impact(flightAction, hit, "pyroball", power,
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
                        sound(flightAction, "cobblemon:impact.fire");
                        sound(flightAction, "minecraft:entity.generic.explode");
                        const ground = pyroballGround(scope, point);
                        // 焦痕只是短暂装饰，很快淡去，不表示地面持续燃烧。
                        WorldFeedback.emit(scope, pyroballScene, 1, ground,
                            { moment: "scorch", heat: heat, scorch: scorchTicks, sparks: sparks, intensity: intensity }, scorchTicks);
                        finish(flightAction);
                    }, function (flightAction: CombatAction) { finish(flightAction); }, JSON.stringify(appearance));
                WorldFeedback.keep(scope, "pyroball:trail:" + current.id(), pyroballScene, 1, foot,
                    { moment: "flight", projectile: flight, scale: scale, intensity: intensity }, 120);
            }

            function roll(current: CombatAction, elapsed: number): void {
                const scope = current.world();
                const me = scope.observe(actor);
                if (me === null) { finish(current); return; }
                const feet = me.position().plus(WorldCombat.point(0, -me.height() * 0.5 + radius, 0));
                const ratio = Math.min(1, elapsed / Math.max(1, rollTicks));
                const at = feet.plus(flat.scale(kickDistance * ratio));
                scenes.show(current, "roll", at, { moment: "roll", scale: Math.max(0.4, Math.min(0.6, radius / 0.26 * 0.45)), heat: heat });
                if (elapsed >= rollTicks) { kick(current); return; }
                current.after(1, function (next: CombatAction) { roll(next, elapsed + 1); });
            }

            roll(action, 0);
        }
    });
}
