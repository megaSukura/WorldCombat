/**
 * 求雨 / raindance 的参数。
 *
 * 原生事实：Water／变化／威力 —／命中 —／PP 5／场上天气 5 回合；水属性招式威力 ×1.5，火属性招式 ×0.5。
 * 世界化：把「5 回合的天气」翻成一场看得见的雨——施法者把雨叫到指定的那片天，天空真的阴下来
 * （`world.weather("rain")`），雨区里雨点砸地、活体被淋湿（共享身份 soaked，另带本招的 rained），
 * 水招更猛、火招被压低，身上的火与灼伤被浇灭，地面正在烧的野火也被这场雨按格扑灭。
 * 它同时改变属性结算和世界里真烧着的东西——一场雨落下的位置和时机就是这招的选择。
 *
 * 数值来源（每个参数读不同的个体数据，展开成场上看得见的差异）：
 *   gather        起手：基础 12 刻，速度每快 1 点减 0.04 刻，夹在 8..20。
 *   settle        收招：基础 9 刻，速度每快 1 点减 0.02 刻，夹在 6..14。
 *   reach         施放距离：基础 14 格，20 级起每级 +0.08，夹在 10..18。
 *   stormRadius   雨区半径：基础 9 格 +（特攻超过 60）×0.02 +（身高超过 1.4）×1.5，再乘铺法系数，夹在 6..16。
 *   stormTicks    雨区持续：基础 360 刻 + 20 级起每级 6 刻，再乘铺法系数，夹在 240..700。
 *   soakedTicks   淋湿持续：基础 80 刻 + 速度 ×0.6，再乘铺法系数，夹在 50..200。
 *   rainDensity   雨点密度：基础 30 + 特攻 ÷ 9，再乘铺法系数，夹在 16..72；直接驱动粒子数量。
 *   quench        每趟扑火：基础 6 + 特攻 ÷ 30，夹在 4..14 格；雨区每轮检查并扑灭的野火上限。
 * 配置 downpour 在「更大更密更湿的倾盆」和「更小更久更省的细雨」之间取舍，两个方向都要付出代价。
 */
namespace PokemonSkills {
    export const raindanceScene = "world_combat:move_raindance";
    export const raindanceField = "world_combat:field/raindance";
    export const raindanceMark = "world_combat:raindance_soaked";
    export const raindanceDrenchText = "world_combat.move.raindance.text.drench";
    export const raindanceDouseText = "world_combat.move.raindance.text.douse";
    // 语义天气：雨天对所有共享读取者意味着被压暗的日照。
    WorldEnvironment.defineWeather("rain", { sunlight: 0.35 });

    actionParameters.define("raindance", {
        gather: seconds(F.base(12).plus(F.stat("speed").minus(40).max(0).times(0.04).clamp(0, 6)).clamp(8, 20),
            "起手", "把雨叫来需要多少时间；速度越快，第一滴雨落得越早。"),
        settle: seconds(F.base(9).plus(F.stat("speed").minus(40).max(0).times(0.02).clamp(0, 4)).clamp(6, 14),
            "收招", "雨落下后收势需要多少时间；速度越快越利落。"),
        reach: formula(F.base(14).plus(F.level().minus(20).max(0).times(0.08)).clamp(10, 18).round(1),
            "施放距离", { unit: " 格", description: "能在多远的地面叫来这场雨；等级越高够得越远。" }),
        stormRadius: formula(
            F.base(9).plus(F.stat("specialAttack").minus(60).max(0).times(0.02))
                .plus(F.body("height").minus(1.4).max(0).times(1.5))
                .times(F.when(F.pref("downpour"), F.const(1.2), F.const(0.85)))
                .clamp(6, 16).round(2),
            "雨区半径", { unit: " 格", description: "雨落在多大的一片区域上；特攻越高、体型越大越广，倾盆 ×1.2、细雨 ×0.85。" }),
        stormTicks: seconds(
            F.base(360).plus(F.level().minus(20).max(0).times(6))
                .times(F.when(F.pref("downpour"), F.const(0.78), F.const(1.2)))
                .clamp(240, 700),
            "雨区持续", "这场雨下多久；细雨更久（×1.2）、倾盆更短（×0.78），等级提升会延长。"),
        soakedTicks: seconds(
            F.base(80).plus(F.stat("speed").times(0.6))
                .times(F.when(F.pref("downpour"), F.const(1.35), F.const(0.8)))
                .clamp(50, 200),
            "淋湿持续", "离开雨区后身上还湿多久；速度越快越难甩干，倾盆更久、细雨更短。"),
        rainDensity: formula(
            F.base(30).plus(F.stat("specialAttack").div(9))
                .times(F.when(F.pref("downpour"), F.const(1.4), F.const(0.8)))
                .clamp(16, 72).round(),
            "雨点密度", { unit: " 点", description: "雨区里雨点与波纹的数量；特攻越高铺得越密，粒子直接按它发射。" }),
        quench: formula(F.base(6).plus(F.stat("specialAttack").div(30)).clamp(4, 14).round(),
            "每趟扑火", { unit: " 格", description: "雨区每轮最多检查并扑灭多少格野火；特攻越高，每趟扫得越多。" })
    });

    stages("raindance", [{ level: 40, values: { cooldown: 126 } }, { level: 55, values: { cooldown: 108 } }]);
    describe("raindance", [
        { key: "description.0", values: ["stormRadius", "stormTicks"] },
        { key: "description.1", values: ["soakedTicks", "rainDensity"] },
        { key: "description.2", values: ["quench"] },
        { key: "description.3", values: ["gather", "settle"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
