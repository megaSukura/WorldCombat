/**
 * 自然之力 / Nature Power —— 参数、伤害段与场所读取。
 *
 * 核心念头：你脚下的土地决定这一击是什么。施法者把站立处的地面叫起来，沿地面冲过去，在目标处按地形爆发：
 *   草木→缠绕麻痹、水流→冲推、地火→灼伤、岩石→碎裂降防并顶开，踩不到地面时只剩一记普通冲击。
 * 数值来源（原生）：Status／Normal／PP 20；这里翻译成真正的招式：基础威力与特攻、等级一起成长，属性按
 *   脚下场地变化（草→草、水→水、火→火、石→岩、其余→普通）。
 * 「催发」档位把准备拉长、换取更高威力与更远射程——两侧都有代价，由玩家在快打与重击之间取舍。
 * 事实接入：场地读取在命中/预览时由同一读取器给出，配合 defineDamage 的 resolve 决定属性；预览与命中同源。
 */
namespace PokemonSkills {
    export const naturepowerId = "naturepower";

    actionParameters.define(naturepowerId, {
        power: formula(F.base(64)
            .plus(F.stat("specialAttack").minus(60).times(0.22).as("特攻成长"))
            .plus(F.level().minus(30).times(0.4).as("等级成长"))
            .times(F.when(F.pref("charged"), F.const(1.25), F.const(1)).as("催发档位"))
            .clamp(45, 135).round(1),
            "威力", { base: 64, unit: "威力", description: "按脚下场地变成不同属性的一击；催发档位 ×1.25。" }),
        reach: formula(F.base(10)
            .plus(F.stat("speed").minus(40).max(0).times(0.05).as("速度修正"))
            .plus(F.when(F.pref("charged"), F.const(2), F.const(0)))
            .clamp(9, 17).round(1),
            "涌动距离", { unit: " 格", description: "地脉能从脚下涌出多远；越快越远，催发档位多 2 格。" }),
        surgeWidth: formula(F.base(0.7).plus(F.body("width").times(0.5)).clamp(0.7, 1.6).round(2),
            "涌动宽度", { unit: " 格", description: "地脉涌动的半宽；身体越宽，扫过的面越大。" }),
        surgeSpeed: formula(F.base(0.5).plus(F.stat("speed").minus(40).max(0).times(0.004)).clamp(0.4, 0.85).round(2),
            "涌动速度", { unit: " 格/刻", description: "地脉推进的速度；越快越难躲。" }),
        chance: percent(F.base(0.35).plus(F.stat("specialAttack").minus(60).max(0).times(0.001)).clamp(0.2, 0.8),
            "追加概率", "草木缠绕与地火灼伤的触发概率；特攻越高越容易把场地效果带出来。"),
        push: formula(F.base(0.22).plus(F.body("weight").div(10).times(0.03)).clamp(0.15, 0.7).round(2),
            "顶推强度", { unit: " 格", description: "命中时的顶开距离；越重推得越远，水流与岩石的场地会放大它。" }),
        bursts: formula(F.base(16).plus(F.stat("specialAttack").minus(60).max(0).times(0.2)).clamp(12, 46).round(0),
            "爆发数量", { unit: " 个", description: "命中处喷发的场地粒子数量；特攻越高越密，粒子按它发射。" }),
        windupTicks: seconds(F.base(10)
            .minus(F.stat("speed").minus(40).max(0).times(0.05))
            .plus(F.when(F.pref("charged"), F.const(6), F.const(0)))
            .clamp(6, 20).round(0),
            "催动时长", "把地脉从脚下叫起来的时间；催发档位更长，也更值得用于重击。")
    });
    defineCategory(naturepowerId, "special");
    defineDamage(naturepowerId, "power", { defenceCoefficient: 0.0048, rationale: "地脉一击穿透略强，让脚下场地与距离的差别更可见。" }, {
        resolve: function (damage: PokemonDamage.FeatureContext): PokemonDamage.Metadata | undefined {
            if (!damage.world || !damage.actor) return undefined;
            var body = damage.world.observe(damage.actor);
            if (!body) return undefined;
            var foot = WorldCombat.point(body.position().x(), body.position().y() - 1, body.position().z());
            return { type: naturepowerSites[naturepowerSiteAt(damage.world, foot)].type };
        }
    });
    stages(naturepowerId, [
        { level: 40, values: { cooldown: 26 } },
        { level: 60, values: { cooldown: 22 } }
    ]);
    describe(naturepowerId, [
        { key: "description.0", values: ["power"] },
        { key: "description.1", values: ["reach","surgeWidth","chance"] },
        { key: "description.push", values: ["push"] },
        { key: "stance.charged", values: ["windupTicks"], when: function (context) { return read(context.detail.values, ["charged"]) === true; } },
        { key: "stance.quick", values: [], when: function (context) { return read(context.detail.values, ["charged"]) !== true; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
