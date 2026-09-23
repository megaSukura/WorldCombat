/**
 * 雪景 / snowscape 的参数。
 *
 * 原生事实：Ice／变化／威力 —／命中 —／PP 10／场上下雪 5 回合；冰属性的防御提高（不造成伤害）。
 * 世界化：雪景的念头是「静」——一场不伤人的雪慢慢压下来，落在哪里就把哪里收进安静里：
 * 雪铺满地表，冰之躯在冷里把身体绷紧（冰属性 防御 +1 级，出圈即散），露天的水面被冻成能站人的冰。
 * 和冰雹分开：冰雹是砸人的硬雹，雪景是覆盖的软雪；一个改生命，一个改地面。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   gather        起手：基础 12 刻，速度每快 1 点减 0.04，夹在 8..20。
 *   settle        收招：基础 9 刻，速度每快 1 点减 0.02，夹在 6..14。
 *   reach         施放距离：基础 14 格，20 级起每级 +0.08，夹在 10..18。
 *   snowRadius    雪区半径：基础 10 格 +（特防超过 60）×0.02 +（身高超过 1.4）×1.5，再乘落法系数，夹在 6..17。
 *   snowTicks     雪区持续：基础 400 刻 + 20 级起每级 6 刻，再乘落法系数，夹在 260..720；安静的雪比雹久。
 *   powderTicks   带雪余韵：基础 90 刻 + 速度 ×0.6，再乘落法系数，夹在 60..220。
 *   coverCells    覆雪格数：基础 26 + 生命 ÷ 20，再乘落法系数，夹在 12..60。
 *   freezeCells   冻水格数：基础 4 + 特防 ÷ 30，再乘落法系数，夹在 2..14。
 *   flakeDensity  雪花密度：基础 30 + 特防 ÷ 9，再乘落法系数，夹在 16..72；直接驱动粒子数量。
 * 配置 deep 在「厚覆」和「薄雪」之间取舍：厚覆更广、覆雪与冻水更多，但更短、冷却更长；
 * 薄雪更小、覆得更少，但更久更省。
 */
namespace PokemonSkills {
    export const snowscapeScene = "world_combat:move_snowscape";
    export const snowscapeField = "world_combat:field/snowscape";
    export const snowscapeMark = "world_combat:snowscape_powder";
    export const snowscapeCrispText = "world_combat.move.snowscape.text.crisp";
    export const snowscapeCoverText = "world_combat.move.snowscape.text.cover";
    export const snowscapeLockText = "world_combat.move.snowscape.text.lock";
    // 语义天气：雪对所有共享读取者意味着被云雪压暗的日照。
    WorldEnvironment.defineWeather("snow", { sunlight: 0.4 });

    actionParameters.define("snowscape", {
        gather: seconds(F.base(12).plus(F.stat("speed").minus(40).max(0).times(0.04).clamp(0, 6)).clamp(8, 20),
            "起手", "让雪落下来需要多少时间；速度越快，雪落得越早。"),
        settle: seconds(F.base(9).plus(F.stat("speed").minus(40).max(0).times(0.02).clamp(0, 4)).clamp(6, 14),
            "收招", "雪落下后的收势时间；速度越快越利落。"),
        reach: formula(F.base(14).plus(F.level().minus(20).max(0).times(0.08)).clamp(10, 18).round(1),
            "施放距离", { unit: " 格", description: "能在多远的地面叫来这场雪；等级越高够得越远。" }),
        snowRadius: formula(
            F.base(10).plus(F.stat("specialDefence").minus(60).max(0).times(0.02))
                .plus(F.body("height").minus(1.4).max(0).times(1.5))
                .times(F.when(F.pref("deep"), F.const(1.15), F.const(0.9)))
                .clamp(6, 17).round(2),
            "雪区半径", { unit: " 格", description: "雪落满多大的一片区域；特防越高、体型越大越广，厚覆 ×1.15、薄雪 ×0.9。" }),
        snowTicks: seconds(
            F.base(400).plus(F.level().minus(20).max(0).times(6))
                .times(F.when(F.pref("deep"), F.const(0.8), F.const(1.2)))
                .clamp(260, 720),
            "雪区持续", "这场雪下多久；薄雪更久（×1.2）、厚覆更短（×0.8），等级提升会延长。"),
        powderTicks: seconds(
            F.base(90).plus(F.stat("speed").times(0.6))
                .times(F.when(F.pref("deep"), F.const(1.3), F.const(0.85)))
                .clamp(60, 220),
            "带雪余韵", "离开雪区后身上还带着雪多久；速度越快越掸不掉，厚覆更久、薄雪更短。"),
        coverCells: formula(
            F.base(26).plus(F.stat("hp").div(20))
                .times(F.when(F.pref("deep"), F.const(1.35), F.const(0.85)))
                .clamp(12, 60).round(),
            "覆雪格数", { unit: " 格", description: "这场雪在地表盖住多少格；生命越厚越铺得开，厚覆 ×1.35、薄雪 ×0.85。" }),
        freezeCells: formula(
            F.base(4).plus(F.stat("specialDefence").div(30))
                .times(F.when(F.pref("deep"), F.const(1.4), F.const(0.8)))
                .clamp(2, 14).round(),
            "冻水格数", { unit: " 格", description: "露天水面被冻成冰的格数；特防越高冻得越多，厚覆 ×1.4、薄雪 ×0.8。" }),
        flakeDensity: formula(
            F.base(30).plus(F.stat("specialDefence").div(9))
                .times(F.when(F.pref("deep"), F.const(1.35), F.const(0.85)))
                .clamp(16, 72).round(),
            "雪花密度", { unit: " 点", description: "雪区里雪花的数量；特防越高落得越密，粒子直接按它发射。" })
    });

    stages("snowscape", [{ level: 40, values: { cooldown: 126 } }, { level: 55, values: { cooldown: 108 } }]);
    describe("snowscape", [
        { key: "description.0", values: ["snowRadius", "snowTicks"] },
        { key: "description.3", values: [] },
        { key: "description.1", values: ["coverCells", "freezeCells", "groundDuration"] },
        { key: "description.4", values: [] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ], {
        groundDuration: context => {
            const snow = Math.max(120, Math.round(p("snowscape", "snowTicks", context)));
            const result = valueBinding(rounded(Math.max(80, Math.round(snow * 0.7)) / 20),
                text("worldcombat.skill.snowscape.value.groundDuration"), [parameterBinding(context, "snowTicks")]);
            result.unitKind = "seconds"; result.unit = text("worldcombat.value.unit.seconds"); return result;
        }
    });
}
