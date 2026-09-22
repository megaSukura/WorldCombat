/**
 * 冷冻干燥 / freezedry 的出手方式。
 *
 * 核心念头：一口气把水汽冻成一根冰晶射出去，命中即冻伤，还有概率把目标整个冻住；
 *   冰对水本是半效，这一招偏偏对水（和世界里湿透的）目标效果绝佳。
 *
 * 两幕（一击完成）：
 *   起：提交前 windup 在嘴边凝起冷雾（action.present）。
 *   击：提交后冰晶沿直线射出；命中活体结算一次冰属性特殊伤害，并按 freezeChance 掷一次冰冻。
 *      水属性或湿透的目标相性翻成 2 倍（PokemonDamage.metadata 覆写相性），画面也换成更厚的霜爆。
 * 反制：冰晶有飞行时间，掩体可以挡下；冰冻是概率，不是必定。
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
        name: "冷冻干燥",
        description: "把水汽冻成一根冰晶射向目标，命中造成冰属性伤害并有概率把它冻住；对水属性或湿透的目标效果绝佳。",
        uses: ["隔空点掉水系与湿身的目标", "用冰冻概率打断对方的节奏", "对远处的高威胁目标先手压制"],
        kind: "enemy",
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
            action.present("freezedry:windup", freezedryScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", deep: config && config.deep ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: 9, geometry: "line", style: "frost", label: config && config.deep ? "冷冻干燥·深冻" : "冷冻干燥" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const speed = Math.max(0.5, p("freezedry", "shardSpeed", action));
            const radius = Math.max(0.15, p("freezedry", "collision", action));
            const power = p("freezedry", "shard", action);
            const chance = Math.max(0, Math.min(1, p("freezedry", "freezeChance", action)));
            const target = action.target();
            const targetRef = target === null ? "" : String(target.ref());
            sound(action, "cobblemon:move.icebeam.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 90,
                appearance: { sprite: "cobblemon:particle/generic/ice/iceshard", glow: true, scale: 0.9 },
                impact: function (current, hit) {
                    const scope = current.world();
                    const struck = hit.target();
                    if (struck === null || !scope.valid(struck)) {
                        WorldFeedback.emit(scope, freezedryScene, 1, hit.position(), { moment: "fizzle" }, 20);
                        sound(current, "minecraft:block.glass.break");
                        return;
                    }
                    const point = hit.position(), soaked = freezedrySoaked(scope, struck);
                    impact(current, hit, "freezedry", power,
                        { damage: damageSpec("freezedry", "shard"), status: "frozen", chance: chance });
                    WorldFeedback.emit(scope, freezedryScene, 1, point,
                        { moment: soaked ? "soaked" : "hit", target: String(struck.ref()),
                            intensity: Math.max(0.6, Math.min(2, power / 70)), soaked: soaked ? 1 : 0, chance: chance }, 30);
                    sound(current, "cobblemon:move.icebeam.target_1");
                }
            }, function (current) {
                WorldFeedback.emit(current.world(), freezedryScene, 1, current.targetPosition(), { moment: "fizzle" }, 18);
                done(current);
            });
            WorldFeedback.emit(world, freezedryScene, 1, action.origin(),
                { moment: "bolt", projectile: flight, target: targetRef, power: power }, 44);
        }
    });
}
