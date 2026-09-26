/**
 * 沙暴 / sandstorm 的参数。
 *
 * 原生事实：Rock／变化／威力 —／命中 —／PP 10／场上沙暴 5 回合；除岩石、地面、钢属性外都会受伤
 * （每回合 1/16 最大生命），岩石属性的特防提高。
 * 世界化：沙暴不是一片天，而是一团**有固定风向的磨蚀沙幕**——施法者把沙石卷起来、朝选定的那片砸下去，
 * 风向就定格在施法者到落点的水平方向；沙幕张开后，一条条顺风窄带从沙幕上风缘推向下风缘。只有站在当次
 * 条带里、且朝上风方向没有实心掩体的人被磨掉血（按趟结算 1/16 上下），并被统一顺风推走；绕到掩体背风面
 * 就能喘息。岩石之躯在沙里把沙砾嵌进裂缝、特防提高（本场沙幕一份窗口，出圈即散）；地表只留表面沙痕。
 * 免疫：场上判定用原生属性（Rock／Ground／Steel）读取，不分对象是宝可梦、原版生物还是玩家——
 * 有属性者按属性免疫，无属性者照单全收。
 *
 * 数值来源（每个参数读不同的个体数据，展开成场上看得见的差异）：
 *   gather         起手：基础 12 刻，速度每快 1 点减 0.04 刻，夹在 8..20。
 *   settle         收招：基础 9 刻，速度每快 1 点减 0.02 刻，夹在 6..14。
 *   reach          施放距离：基础 14 格，20 级起每级 +0.08，夹在 10..18。
 *   stormRadius    沙暴半径：基础 9 格 +（攻击超过 60）×0.02 +（身高超过 1.4）×1.5，再乘磨法系数，夹在 6..16。
 *   stormTicks     沙暴持续：基础 360 刻 + 20 级起每级 6 刻，再乘磨法系数，夹在 240..700。
 *   sweptTicks     带沙余韵：基础 80 刻 + 速度 ×0.6，再乘磨法系数，夹在 50..200。
 *   scour          每趟磨蚀：基础 6.25% 最大生命 +（攻击超过 60）×0.07%，再乘磨法系数，夹在 3%..13%。
 *   drift          每趟推沙：基础 0.16 格 +（速度超过 40）×0.002，再乘磨法系数，夹在 0.08..0.4 格；统一顺风。
 *   grainInterval  磨蚀间隔：基础 78 刻 −（速度超过 40）×0.1，再乘磨法系数，夹在 50..95 刻；越快磨得越勤。
 *   grainDensity   沙粒密度：基础 30 + 攻击 ÷ 9，再乘磨法系数，夹在 16..72；直接驱动粒子数量。
 *   gustWidth      沙阵条带：基础 2.6 格 +（身高超过 1.4）×0.9 + 攻击 ÷ 60，再乘磨法系数，夹在 1.5..6 格。
 *   gustStep       每趟推进：基础 4 格 +（速度超过 40）×0.06，再乘磨法系数，夹在 2..9 格；风越大带得越远。
 * 配置 abrasive 在「磨蚀狂沙」和「缓沙覆盖」之间取舍：狂沙更广更密更磨人、条带更宽推得动身体，但更短更勤、冷却更长；
 * 缓沙反过来更省、更久，但磨得轻、范围小、条带更窄。
 */
namespace PokemonSkills {
    export const sandstormScene = "world_combat:move_sandstorm";
    export const sandstormField = "world_combat:field/sandstorm";
    export const sandstormMark = "world_combat:sandstorm_swept";
    export const sandstormScourText = "world_combat.move.sandstorm.text.scour";
    export const sandstormHardenText = "world_combat.move.sandstorm.text.harden";
    // 语义天气：沙暴对所有共享读取者意味着被沙幕压暗的日照。
    WorldEnvironment.defineWeather("sandstorm", { sunlight: 0.5 });

    actionParameters.define("sandstorm", {
        gather: seconds(F.base(12).plus(F.stat("speed").minus(40).max(0).times(0.04).clamp(0, 6)).clamp(8, 20),
            "起手", "把地面的沙卷起来需要多少时间；速度越快，沙幕张得越早。"),
        settle: seconds(F.base(9).plus(F.stat("speed").minus(40).max(0).times(0.02).clamp(0, 4)).clamp(6, 14),
            "收招", "沙幕落下后收势需要多少时间；速度越快越利落。"),
        reach: formula(F.base(14).plus(F.level().minus(20).max(0).times(0.08)).clamp(10, 18).round(1),
            "施放距离", { unit: " 格", description: "能在多远的地面扬起这片沙暴；等级越高够得越远。" }),
        stormRadius: formula(
            F.base(9).plus(F.stat("attack").minus(60).max(0).times(0.02))
                .plus(F.body("height").minus(1.4).max(0).times(1.5))
                .times(F.when(F.pref("abrasive"), F.const(1.15), F.const(0.9)))
                .clamp(6, 16).round(2),
            "沙暴半径", { unit: " 格", description: "沙幕扫过多大的一片区域；攻击越高、体型越大越广，磨蚀狂沙 ×1.15、缓沙 ×0.9。" }),
        stormTicks: seconds(
            F.base(360).plus(F.level().minus(20).max(0).times(6))
                .times(F.when(F.pref("abrasive"), F.const(0.78), F.const(1.22)))
                .clamp(240, 700),
            "沙暴持续", "这片沙幕刮多久；缓沙更久（×1.22）、狂沙更短（×0.78），等级提升会延长。"),
        sweptTicks: seconds(
            F.base(80).plus(F.stat("speed").times(0.6))
                .times(F.when(F.pref("abrasive"), F.const(1.3), F.const(0.85)))
                .clamp(50, 200),
            "带沙余韵", "离开沙幕后身上还带着沙砾多久；速度越快越甩不掉，狂沙更久、缓沙更短。"),
        scour: percent(
            F.base(0.0625).plus(F.stat("attack").minus(60).max(0).times(0.0007))
                .times(F.when(F.pref("abrasive"), F.const(1.3), F.const(0.8)))
                .clamp(0.03, 0.13),
            "每趟磨蚀", "沙幕每一趟从暴露的活体身上磨掉多少最大生命；攻击越高越狠。"),
        drift: formula(
            F.base(0.16).plus(F.stat("speed").minus(40).max(0).times(0.002))
                .times(F.when(F.pref("abrasive"), F.const(1.35), F.const(0.8)))
                .clamp(0.08, 0.4).round(2),
            "每趟推沙", { unit: " 格", description: "每趟把受磨的活体往外推多远；风越大推得越动。" }),
        grainInterval: seconds(
            F.base(78).minus(F.stat("speed").minus(40).max(0).times(0.1))
                .times(F.when(F.pref("abrasive"), F.const(0.82), F.const(1.18)))
                .clamp(50, 95).round(),
            "磨蚀间隔", "沙幕每隔多久磨一趟；狂沙磨得勤、缓沙磨得慢。"),
        grainDensity: formula(
            F.base(30).plus(F.stat("attack").div(9))
                .times(F.when(F.pref("abrasive"), F.const(1.4), F.const(0.85)))
                .clamp(16, 72).round(),
            "沙粒密度", { unit: " 点", description: "沙幕里飞沙的数量；攻击越高铺得越密，粒子直接按它发射。" }),
        gustWidth: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).max(0).times(0.9)).plus(F.stat("attack").div(60))
                .times(F.when(F.pref("abrasive"), F.const(1.25), F.const(0.8)))
                .clamp(1.5, 6).round(2),
            "沙阵条带", { unit: " 格", description: "每趟沿风向推进的窄带有多宽；攻击越高、体型越大越宽，磨蚀狂沙 ×1.25、缓沙 ×0.8。" }),
        gustStep: formula(
            F.base(4).plus(F.stat("speed").minus(40).max(0).times(0.06))
                .times(F.when(F.pref("abrasive"), F.const(1.2), F.const(0.85)))
                .clamp(2, 9).round(2),
            "每趟推进", { unit: " 格", description: "每趟沙阵沿风向推进多远；速度越快带得越远，决定条带扫过全场的快慢。" })
    });

    stages("sandstorm", [{ level: 40, values: { cooldown: 126 } }, { level: 55, values: { cooldown: 108 } }]);
    describe("sandstorm", [
        { key: "description.0", values: ["stormRadius","stormTicks"] },
        { key: "description.1", values: ["gustWidth","scour","drift"] },
        { key: "description.2", values: ["sweptTicks","grainInterval"] },
        { key: "description.3", values: ["gather", "settle"] },
        { key: "description.4", values: ["gustStep"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.cooldown"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.cooldown"] }
    ]);
}
