/**
 * 冷冻干燥 / freezedry 的出手方式。
 *
 * 核心念头：一口气把水汽冻成一根冰晶射出去，命中即冻伤，还有概率把目标整个冻住；
 *   冰对水本是半效，这一招偏偏对水（和世界里湿透的）目标效果绝佳。
 *
 * 两幕（一击完成）：
 *   起：提交前 windup 在嘴边凝起冷雾（action.present）。
 *   击：提交后冰晶沿瞄准方向直线射出（`kind: "aim"`，可打实体也可空放）；命中活体先结算一次
 *      冰属性特殊伤害，只有这次伤害真的落地，才按 freezeChance 掷冰冻并播出命中／湿身裂冻的霜爆。
 *      水属性或湿透的目标相性翻成 2 倍（PokemonDamage.metadata 覆写相性），画面也换成更厚的霜爆。
 * 反制：冰晶有飞行时间，掩体可以挡下；冰冻是概率，不是必定。
 * 落点：撞到方块或被非生物实体挡下就在真实接触点碎裂；全程无人可打则飞完后在真实末点消散，
 *   不在原瞄准点补一次假命中。
 * 配置 deep：更慢的起手与更长的冷却，换更高威力与更高冰冻概率。
 */
namespace PokemonSkills {
    /** 水属性或湿透的目标：冰对水本是半效，这一招把它翻成 2 倍。 */
    function freezedrySoaked(world: CombatWorld, target: CombatActor): boolean {
        const body = world.observe(target);
        if (body !== null && body.wet()) return true;
        const types = PokemonDamage.combatants.read(world, target).types;
        return types.indexOf("water") >= 0;
    }

    // 相性覆写：命中结算前把这一招的威力乘上 2 / 冰对水的原始倍率，使命中相性恰好变成 2 倍。
    // 只在这一招、且已有命中目标时生效；悬浮预览没有目标，因此显示基础威力。
    PokemonDamage.metadata.define({
        id: "world_combat:freezedry/water",
        applies: function (context) { return context.metadata.move === "freezedry" && !!context.targetFacts; },
        apply: function (context) {
            if (!context.targetFacts || !context.world || !context.target) return;
            const types = context.targetFacts.types || [];
            const water = types.indexOf("water") >= 0;
            const soaked = water || freezedrySoaked(context.world, context.target);
            if (!soaked) return;
            const base = water ? CobblemonCombat.typeEffectiveness("ice", "water") : 0;
            context.metadata.power *= water ? (base > 0 ? 2 / base : 2) : 2;
        }
    });

    define({
        id: "freezedry",
        cooldownParameter: "wait",
        name: "冷冻干燥",
        description: "把水汽冻成一根冰晶射向目标，命中造成冰属性伤害并有概率把它冻住，冻住期间无法移动与出招；对水属性或湿透的目标效果绝佳。",
        uses: ["隔空点掉水系与湿身的目标", "用冰冻概率让对方一段时间无法行动", "对远处的高威胁目标先手压制"],
        kind: "aim",
        range: 9,
        maxRange: 14,
        prepare: 10,
        active: 1,
        recover: 7,
        cooldown: 60,
        style: "frost",
        defaults: { deep: false, ai: { maxChase: 14, soaked: true, leaveStation: true } },
        fields: [flag("deep", "深冻")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["freezedry"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const deep = !!(config && config.deep);
            return {
                prepare: Math.round(p("freezedry", "tempo", context) + (deep ? 3 : 0)),
                recover: Math.round(p("freezedry", "aftermath", context)),
                cooldown: Math.round(p("freezedry", "wait", context) * (deep ? 1.15 : 1)),
                active: 1,
                range: p("freezedry", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const deep = !!(config && config.deep);
            action.present("freezedry:windup", freezedryScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", deep: deep ? 1 : 0, intensity: deep ? 1.3 : 1 }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: 9, geometry: "line", style: "frost", label: config && config.deep ? "冷冻干燥·深冻" : "冷冻干燥" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const scenes = WorldFeedback.actionScenes(freezedryScene);
            const speed = Math.max(0.5, p("freezedry", "shardSpeed", action));
            const radius = Math.max(0.15, p("freezedry", "collision", action));
            const power = p("freezedry", "shard", action);
            const chance = Math.max(0, Math.min(1, p("freezedry", "freezeChance", action)));
            const target = action.target();
            const targetRef = target === null ? "" : String(target.ref());
            const origin = action.origin(), reach = action.range();
            const direction = aim(action);
            // 无人可打时冰晶飞完全程；末点按真实的航向与原生阻尼求解，逐刻推进到消散那一刻。
            let endPoint = origin.plus(direction.scale(reach)), landed = false, contacted = false;
            sound(action, "cobblemon:move.icebeam.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: reach, radius: radius, lifetime: 90, direction: direction,
                appearance: { sprite: "cobblemon:particle/generic/ice/iceshard", glow: true, scale: 0.9 },
                impact: function (current, hit) {
                    const scope = current.world();
                    const struck = hit.target(), point = hit.position();
                    endPoint = point;
                    // 方块或非生物实体接触：在真实接触点碎开，不在原瞄准点补一次假命中。
                    if (struck === null || !scope.valid(struck)) {
                        if (!hit.blocked() && !hit.hitEntity()) return;
                        contacted = true;
                        scenes.stop(current, "bolt");
                        WorldFeedback.emit(scope, freezedryScene, 1, point, { moment: "fizzle" }, 20);
                        sound(current, "minecraft:block.glass.break");
                        return;
                    }
                    const soaked = freezedrySoaked(scope, struck);
                    // 先结算伤害：被免疫或被拒时这次接触不算命中，也不播成功冻结。
                    const applied = impact(current, hit, "freezedry", power,
                        { damage: damageSpec("freezedry", "shard"), status: "frozen", chance: chance });
                    if (!applied) return;
                    landed = true;
                    scenes.stop(current, "bolt");
                    WorldFeedback.emit(scope, freezedryScene, 1, point,
                        { moment: soaked ? "soaked" : "hit", target: String(struck.ref()),
                            intensity: Math.max(0.6, Math.min(2, power / 70)) }, 30);
                    sound(current, "cobblemon:move.icebeam.target_1");
                }
            }, function (current) {
                if (!landed && !contacted)
                    WorldFeedback.emit(current.world(), freezedryScene, 1, endPoint, { moment: "fizzle" }, 18);
                scenes.finish(current, done);
            });
            // 飞行物不是活体，actor() 解析不到；冰晶无重力、不追踪，按原生 0.99 水平阻尼累计的真实位移
            // 逐刻推进末点，不必读取实体。撞墙或命中会在回调里另记真实接触点。
            let flown = 0;
            function track(current: CombatAction): void {
                if (landed || contacted) return;
                flown++;
                endPoint = origin.plus(direction.scale(speed * (1 - Math.pow(0.99, flown)) / 0.01));
                current.after(1, track);
            }
            action.after(1, track);
            scenes.show(action, "bolt", origin,
                { moment: "bolt", projectile: flight, target: targetRef, power: power });
        }
    });
}
