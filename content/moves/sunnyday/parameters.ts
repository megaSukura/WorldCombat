/**
 * 大晴天 / sunnyday 的参数。
 *
 * 原生事实：Fire／变化／威力 —／命中 —／PP 5／场上天气 5 回合；火属性招式威力 ×1.5，水属性招式 ×0.5。
 * 世界化：把「5 回合的晴天」翻成一片压下来的烈日——施法者把太阳叫到指定的那片天，乌云散尽、天空转晴
 * （`world.weather("clear")`），日轮落点张开一片烈日区；区里的活体带上 sunlit 身份，火招更猛、水招被晒弱；
 * 冻结被晒化（Gen 8 晴天下冰冻会解除），身上的水也被晒干（共享 soaked 身份被蒸掉）。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   gather       起手：基础 12 刻，速度每快 1 点减 0.04 刻，夹在 8..20。
 *   settle       收招：基础 9 刻，速度每快 1 点减 0.02 刻，夹在 6..14。
 *   reach        施放距离：基础 14 格，20 级起每级 +0.08，夹在 10..18。
 *   sunRadius    烈日区半径：基础 9 格 +（特攻超过 60）×0.02 +（身高超过 1.4）×1.5，再乘天候系数，夹在 6..16。
 *   sunTicks     烈日持续：基础 360 刻 + 20 级起每级 6 刻，再乘天候系数，夹在 240..700。
 *   sunlitTicks  晴天余温：基础 80 刻 + 速度 ×0.6，再乘天候系数，夹在 50..200。
 *   sunDensity   日光密度：基础 30 + 特攻 ÷ 9，再乘天候系数，夹在 16..72；直接驱动粒子数量。
 * 配置 blazing 在「更大更烈更久的烈日」和「更小更久更省的温阳」之间取舍，两个方向都要付出代价。
 */
namespace PokemonSkills {
    export const sunnyScene = "world_combat:move_sunnyday";
    export const sunnyField = "world_combat:field/sunnyday";
    export const sunnyMark = "world_combat:sunnyday_sunlit";
    export const sunnyLitText = "world_combat.move.sunnyday.text.sunlit";
    export const sunnyDryText = "world_combat.move.sunnyday.text.dry";
    export const sunnyThawText = "world_combat.move.sunnyday.text.thaw";
    // 语义天气：烈日对所有共享读取者意味着强日照（正午夜里都算烈日当空）。
    WorldEnvironment.defineWeather("sun", { sunlight: 1 });

    actionParameters.define("sunnyday", {
        gather: seconds(F.base(12).plus(F.stat("speed").minus(40).max(0).times(0.04).clamp(0, 6)).clamp(8, 20),
            "起手", "把太阳叫来需要多少时间；速度越快，晴得越早。"),
        settle: seconds(F.base(9).plus(F.stat("speed").minus(40).max(0).times(0.02).clamp(0, 4)).clamp(6, 14),
            "收招", "烈日落下后收势需要多少时间；速度越快越利落。"),
        reach: formula(F.base(14).plus(F.level().minus(20).max(0).times(0.08)).clamp(10, 18).round(1),
            "施放距离", { unit: " 格", description: "能在多远的地面叫来这片烈日；等级越高够得越远。" }),
        sunRadius: formula(
            F.base(9).plus(F.stat("specialAttack").minus(60).max(0).times(0.02))
                .plus(F.body("height").minus(1.4).max(0).times(1.5))
                .times(F.when(F.pref("blazing"), F.const(1.2), F.const(0.85)))
                .clamp(6, 16).round(2),
            "烈日半径", { unit: " 格", description: "烈日罩住多大的一片区域；特攻越高、体型越大越广，烈日 ×1.2、温阳 ×0.85。" }),
        sunTicks: seconds(
            F.base(360).plus(F.level().minus(20).max(0).times(6))
                .times(F.when(F.pref("blazing"), F.const(0.78), F.const(1.2)))
                .clamp(240, 700),
            "烈日持续", "这片烈日晒多久；温阳更久（×1.2）、烈日更短（×0.78），等级提升会延长。"),
        sunlitTicks: seconds(
            F.base(80).plus(F.stat("speed").times(0.6))
                .times(F.when(F.pref("blazing"), F.const(1.35), F.const(0.8)))
                .clamp(50, 200),
            "晴天余温", "离开烈日区后身上还暖多久；速度越快越难凉下来，烈日更久、温阳更短。"),
        sunDensity: formula(
            F.base(30).plus(F.stat("specialAttack").div(9))
                .times(F.when(F.pref("blazing"), F.const(1.4), F.const(0.8)))
                .clamp(16, 72).round(),
            "日光密度", { unit: " 点", description: "烈日区里光尘与日耀的数量；特攻越高铺得越密，粒子直接按它发射。" })
    });

    stages("sunnyday", [{ level: 40, values: { cooldown: 126 } }, { level: 55, values: { cooldown: 108 } }]);
    describe("sunnyday", [
        { key: "description.0", values: ["sunRadius", "sunTicks"] },
        { key: "description.1", values: ["sunlitTicks", "sunDensity"] },
        { key: "description.2", values: ["gather", "settle"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
