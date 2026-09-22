/**
 * 冰雹 / hail 的参数。
 *
 * 原生事实：Ice／变化／威力 —／命中 —／PP 10／场上冰雹 5 回合；除冰属性外都会受伤（每回合 1/16 最大生命）。
 * 世界化：冰雹不是慢慢下雪，而是**一块块冰从头顶砸下来**——施法者把上空的水汽冻成硬雹、朝选定的那片压下去，
 * 冰柱崩落后贴地碎开：除冰属性外，露在外面的活体被一趟趟砸掉生命（每趟 1/16 上下），撞地时升起霜雾；
 * 冰属性的身体不受砸，反而被冷气裹上一层白霜；落下的雹砸碎在地表，留下一片冻硬的冰。
 * 免疫：按原生属性读 Ice；无属性者照单全收。
 *
 * 数值来源（每个参数读不同的个体数据）：
 *   gather         起手：基础 12 刻，速度每快 1 点减 0.04，夹在 8..20。
 *   settle         收招：基础 9 刻，速度每快 1 点减 0.02，夹在 6..14。
 *   reach          施放距离：基础 14 格，20 级起每级 +0.08，夹在 10..18。
 *   stormRadius    雹区半径：基础 9 格 +（特攻超过 60）×0.02 +（身高超过 1.4）×1.5，再乘雹法系数，夹在 6..16。
 *   stormTicks     雹区持续：基础 360 刻 + 20 级起每级 6 刻，再乘雹法系数，夹在 240..700。
 *   struckTicks    带雹余韵：基础 80 刻 + 速度 ×0.6，再乘雹法系数，夹在 50..200。
 *   pelt           每趟砸击：基础 6.25% 最大生命 +（特攻超过 60）×0.07%，再乘雹法系数，夹在 3%..13%。
 *   stoneInterval  砸击间隔：基础 78 刻 −（速度超过 40）×0.1，再乘雹法系数，夹在 50..95 刻；下得越急砸得越勤。
 *   stoneDensity   冰雹密度：基础 30 + 特攻 ÷ 9，再乘雹法系数，夹在 16..72；直接驱动粒子数量。
 *   shardCells     碎冰格数：基础 18 +（体重超过 60）×0.1，夹在 8..44；落在多少格地上留冰。
 * 配置 squall 在「暴风冰雹」和「细密冰雹」之间取舍：暴风更广更密更狠、碎冰更多，但更短更勤、冷却更长；
 * 细密反过来更省、更久，但砸得轻、范围小。
 */
namespace PokemonSkills {
    export const hailScene = "world_combat:move_hail";
    export const hailField = "world_combat:field/hail";
    export const hailMark = "world_combat:hail_struck";
    export const hailPeltText = "world_combat.move.hail.text.pelt";
    export const hailCoatText = "world_combat.move.hail.text.coat";
    // 语义天气：冰雹对所有共享读取者意味着被云雹压暗的日照。
    WorldEnvironment.defineWeather("hail", { sunlight: 0.45 });

    actionParameters.define("hail", {
        gather: seconds(F.base(12).plus(F.stat("speed").minus(40).max(0).times(0.04).clamp(0, 6)).clamp(8, 20),
            "起手", "把上空的水汽冻成硬雹需要多少时间；速度越快，雹子越快成形。"),
        settle: seconds(F.base(9).plus(F.stat("speed").minus(40).max(0).times(0.02).clamp(0, 4)).clamp(6, 14),
            "收招", "雹子落完后的收势时间；速度越快越利落。"),
        reach: formula(F.base(14).plus(F.level().minus(20).max(0).times(0.08)).clamp(10, 18).round(1),
            "施放距离", { unit: " 格", description: "能在多远的地面压下这片冰雹；等级越高够得越远。" }),
        stormRadius: formula(
            F.base(9).plus(F.stat("specialAttack").minus(60).max(0).times(0.02))
                .plus(F.body("height").minus(1.4).max(0).times(1.5))
                .times(F.when(F.pref("squall"), F.const(1.15), F.const(0.9)))
                .clamp(6, 16).round(2),
            "雹区半径", { unit: " 格", description: "冰雹砸在多大的一片区域上；特攻越高、体型越大越广，暴风 ×1.15、细密 ×0.9。" }),
        stormTicks: seconds(
            F.base(360).plus(F.level().minus(20).max(0).times(6))
                .times(F.when(F.pref("squall"), F.const(0.78), F.const(1.22)))
                .clamp(240, 700),
            "雹区持续", "这片冰雹下多久；细密更久（×1.22）、暴风更短（×0.78），等级提升会延长。"),
        struckTicks: seconds(
            F.base(80).plus(F.stat("speed").times(0.6))
                .times(F.when(F.pref("squall"), F.const(1.3), F.const(0.85)))
                .clamp(50, 200),
            "带雹余韵", "离开雹区后身上还带着雹子多久；速度越快越甩不掉，暴风更久、细密更短。"),
        pelt: percent(
            F.base(0.0625).plus(F.stat("specialAttack").minus(60).max(0).times(0.0007))
                .times(F.when(F.pref("squall"), F.const(1.3), F.const(0.8)))
                .clamp(0.03, 0.13),
            "每趟砸击", "每一阵冰雹砸掉多少最大生命；特攻越高砸得越狠。"),
        stoneInterval: seconds(
            F.base(78).minus(F.stat("speed").minus(40).max(0).times(0.1))
                .times(F.when(F.pref("squall"), F.const(0.82), F.const(1.18)))
                .clamp(50, 95).round(),
            "砸击间隔", "冰雹每隔多久砸一趟；暴风砸得急、细密砸得慢。"),
        stoneDensity: formula(
            F.base(30).plus(F.stat("specialAttack").div(9))
                .times(F.when(F.pref("squall"), F.const(1.4), F.const(0.85)))
                .clamp(16, 72).round(),
            "冰雹密度", { unit: " 点", description: "雹区里冰雹的数量；特攻越高铺得越密，粒子直接按它发射。" }),
        shardCells: formula(
            F.base(18).plus(F.body("weight").minus(60).max(0).times(0.1))
                .times(F.when(F.pref("squall"), F.const(1.3), F.const(0.85)))
                .clamp(8, 44).round(),
            "碎冰格数", { unit: " 格", description: "落地的雹子砸碎后在地表留冰的格数；身体越重、暴风时留得越多。" })
    });

    stages("hail", [{ level: 40, values: { cooldown: 126 } }, { level: 55, values: { cooldown: 108 } }]);
    describe("hail", [
        { key: "description.0", values: ["stormRadius", "stormTicks"] },
        { key: "description.1", values: ["pelt", "struckTicks", "stoneInterval"] },
        { key: "description.2", values: ["shardCells", "stoneDensity"] },
        { key: "description.3", values: ["gather", "settle"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
