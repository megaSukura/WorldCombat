/**
 * 顺风 / tailwind 的参数与数值来源。
 *
 * 原生事实：Flying、变化、威力 —、命中必中、PP 15、优先度 0、目标 allySide（己方场地），持续 4 回合，
 *   期间己方全员速度 ×2（等效 +2 级）；特性 Persistent 把它延到 6 回合。
 *
 * 核心念头：施法者当场搅起一股旋风，风先在脚边收成气旋、再猛地铺开扫过身边的伙伴——整支队伍被同一阵风托住，
 *   比对面先动。风以施法者为锚一路转着，谁站在风里谁就快一档。
 * 世界化：把「己方场地 4 回合」翻成一段落在每个伙伴身上的**风速窗口**——施法者与半径内的友方各挂一份
 *   共享身份 world_combat:status/tailwind 的真实 MobEffect（物品栏可见、/effect 可用），速度等级立刻写入
 *   公共能力阶梯；窗口走完或被清除时按各自实际抬到的级数原样收回。风以施法者为锚，表现每 20 刻跟着他转。
 *   原生「4 回合」在这里是众招里最长的加速窗口，代价是 PP 15、冷却也长，且不能与自身的高移动重复施放。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   reach    风场半径：基础 5 格 + 速度/110 + 碰撞箱高度×0.4；夹 4.5..8。速度与身板决定风铺多广。
 *   gift     提速等级：基础 2，基础速度 ≥ 95 再 +1；夹 2..3。天生快的个体把这一档推得更高。
 *   window   风速窗口：基础 220 刻 + 速度×1.1 + 等级×1.5；夹 200..520。速度与等级让风停得晚一些。
 *   motes    风点数量：基础 28 + 速度×0.35；夹 28..90。风点数量，驱动画面密度。
 *   streaks  疾线数：基础 6 + 速度/28；夹 6..14。每个伙伴身上拖出的风线数量，也驱动画面。
 *   tempo    起手：基础 8 刻 − 速度×0.025；夹 4..10。越快的个体越早起风。
 *   aftercast 收招：基础 6 刻 + 体重(kg)/10×0.02；夹 5..10。身体越重收得越慢。
 *   wait     冷却：基础 120 刻 − 等级×0.5；夹 80..140。等级越高越熟练。PP 15 的代价。
 * 配置 gale（风向）双向取舍：广风＝半径 ×1.25、风点 ×1.1，但窗口 ×0.8（铺得开、停得早）；
 *   长风＝窗口 ×1.35，但半径 ×0.85、风点 ×0.9（罩得紧、撑得久）。两向各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("tailwind", {
        /** 风场半径：速度与身板决定风铺多广。 */
        reach: formula(
            F.base(5).plus(F.stat("speed").div(110)).plus(F.body("height").times(0.4))
                .times(F.when(F.pref("gale", text("worldcombat.skill.tailwind.preference.gale")), F.const(1.25), F.const(0.85)))
                .clamp(4.5, 10).round(2),
            "风场半径", {
                unit: " 格",
                description: "旋风铺开的半径，也是判定与画面的同一块区域；速度越快、身板越高铺得越广，广风再 ×1.25。"
            }),
        /** 提速等级：天生快的个体再推一档。 */
        gift: formula(
            F.base(2).plus(F.when(F.stat("speed").gte(95), F.const(1), F.const(0))).clamp(2, 3).round(0),
            "提速等级", {
                unit: " 级",
                description: "风托起的整队速度等级；基础速度 ≥ 95 的个股多推一档。"
            }),
        /** 风速窗口：速度与等级让风停得晚一些。 */
        window: seconds(
            F.base(220).plus(F.stat("speed").times(1.1)).plus(F.level().times(1.5))
                .times(F.when(F.pref("gale", text("worldcombat.skill.tailwind.preference.gale")), F.const(0.8), F.const(1.35)))
                .clamp(160, 620).round(0),
            "风速窗口", "整队保持提速多久；速度与等级延长它，长风 ×1.35、广风 ×0.8。"),
        /** 风点数量：速度决定画面密度。 */
        motes: formula(
            F.base(28).plus(F.stat("speed").times(0.35))
                .times(F.when(F.pref("gale", text("worldcombat.skill.tailwind.preference.gale")), F.const(1.1), F.const(0.9)))
                .clamp(24, 100).round(0),
            "风点数量", {
                unit: " 点",
                description: "一次起风掀起的风点数量；速度越快越密，粒子按它发射。"
            }),
        /** 疾线数：每个伙伴身上拖出的风线数量。 */
        streaks: formula(
            F.base(6).plus(F.stat("speed").div(28)).clamp(6, 14).round(0),
            "疾线数", {
                unit: " 条",
                description: "每个被风托住的伙伴身上拖出的风线条数；速度越快越多，画面按它画。"
            }),
        /** 起手：速度决定起风多快。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").times(0.025)).clamp(4, 10).round(0),
            "起手", "把风搅起来需要多久；速度越快越短。"),
        /** 收招：身体越重收得越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("weight").div(10).times(0.02)).clamp(5, 10).round(0),
            "收招", "起风之后的收势；身体越重收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(120).minus(F.level().times(0.5)).clamp(80, 140).round(0),
            "冷却", "两次顺风之间的等待；等级越高越短。PP 15 的代价。")
    });

    describe("tailwind", [
        { key: "description.0", values: ["gift", "window"] },
        { key: "description.release", values: [] },
        { key: "description.1", values: ["reach"] },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "gale.wide", values: [], when: function (context) { return read(context.detail.values, ["gale"]) === 1; } },
        { key: "gale.long", values: [], when: function (context) { return read(context.detail.values, ["gale"]) !== 1; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
