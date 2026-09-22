/**
 * 生长 / growth 的参数与数值来源。
 *
 * 原生事实：Normal、Status、威力 —、命中 —、PP 20、目标 self、boosts { atk:+1, spa:+1 }；
 *   原作在大晴天／大日照下改成 { atk:+2, spa:+2 }。
 *
 * 翻译：把「让身体一下子长大」翻成一次自发的抽长——身体猛地撑大一圈、脚下的土地跟着冒出一层草皮，
 * 攻击与特攻一起抬起来；阳光足时这一下翻倍（照搬原作的太阳加成，只是把它读成现场的阳光而非天气状态）。
 * 与同族的自我激励分开：自我激励快、吃自己的伤；生长慢、吃太阳、并且真的在世上留下一块草地。
 * 两项提升都走 NativeEffects.boost 一条路径；草皮走 world.terrain 租借（linger，到期原方块回来）。
 *
 * 数值来源（每个参数读不同的精灵数据或现场事实）：
 *   atkGift  阳光 ≥ 0.6 时 +2，否则 +1；夹 1..2。读现场光照与天气。
 *   spaGift  同上一份阳光事实，喂给另一个公式叶子；两项各自成项，悬浮里分别展开。
 *   spread   草皮半径：基础 1.8 格 + 碰撞箱高度×0.5，枝繁叶茂 ×1.25；夹 1.4..4.5。
 *   blades   草叶量：基础 10 + 体重/40，枝繁叶茂 ×1.35；夹 8..30。粒子与草皮格子按它铺。
 *   grownTicks 长大窗口：基础 220 刻 + 等级×4，枝繁叶茂 ×1.5；夹 160..700。地面草皮同寿。
 *   tempo    起手：速度每比 60 快 1 减 0.03 刻，枝繁叶茂 +2；夹 6..13。
 *   aftercast 收招：基础 6 + 碰撞箱高度×1.5；夹 6..11。
 *   wait     冷却：基础 90 刻 − 等级×0.5，枝繁叶茂 +15；夹 55..100。PP 20 的代价。
 * 配置 thicket（枝繁叶茂）：铺得更开、草皮与窗口更久，代价是起手 +2 刻、冷却 +15。
 */
namespace PokemonSkills {
    /** 阳光门槛：0..1 的 WorldEnvironment.sunlight 观测值；公式与表现读同一个常量。 */
    export const growthSunlight = 0.6;

    actionParameters.define("growth", {
        /** 攻击提升：阳光足时 +2。 */
        atkGift: formula(
            F.base(1).plus(F.when(F.world("sunlight").gte(F.const(growthSunlight)), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "攻击提升", {
                unit: " 级",
                description: "生长带来的物攻等级；站在阳光下时多长一级。"
            }),
        /** 特攻提升：阳光足时 +2。 */
        spaGift: formula(
            F.base(1).plus(F.when(F.world("sunlight").gte(F.const(growthSunlight)), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "特攻提升", {
                unit: " 级",
                description: "生长带来的特攻等级；站在阳光下时多长一级。"
            }),
        /** 草皮半径：身板越大铺得越开。 */
        spread: formula(
            F.base(1.8).plus(F.body("height").times(0.5))
                .times(F.when(F.pref("thicket", text("worldcombat.skill.growth.preference.thicket")), F.const(1.25), F.const(1)))
                .clamp(1.4, 4.5).round(2),
            "草皮半径", {
                unit: " 格",
                description: "脚下长出的草皮覆盖半径；碰撞箱越高铺得越开，枝繁叶茂再 ×1.25。画面里的地环就是这个半径。"
            }),
        /** 草叶量：体重决定一次冒出多少。 */
        blades: formula(
            F.base(10).plus(F.body("weight").div(40))
                .times(F.when(F.pref("thicket", text("worldcombat.skill.growth.preference.thicket")), F.const(1.35), F.const(1)))
                .clamp(8, 30).round(0),
            "草叶量", {
                unit: " 片",
                description: "一次破土而出的草叶数量；体重越大冒出的越多，粒子按它发射。"
            }),
        /** 长大窗口：标记与草皮的时长。 */
        grownTicks: seconds(
            F.base(220).plus(F.level().times(4))
                .times(F.when(F.pref("thicket", text("worldcombat.skill.growth.preference.thicket")), F.const(1.5), F.const(1)))
                .clamp(160, 700).round(0),
            "长大窗口", "「长大」标记与地面草皮一起存在多久；等级越高、枝繁叶茂后越久。"),
        /** 起手：速度决定抽长多快。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03))
                .plus(F.when(F.pref("thicket", text("worldcombat.skill.growth.preference.thicket")), F.const(2), F.const(0))).clamp(6, 13).round(0),
            "起手", "把身体撑大一圆需要多久；速度越高越快，枝繁叶茂要更久。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(1.5)).clamp(6, 11).round(0),
            "收招", "抽长之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(90).minus(F.level().times(0.5))
                .plus(F.when(F.pref("thicket", text("worldcombat.skill.growth.preference.thicket")), F.const(15), F.const(0))).clamp(55, 100).round(0),
            "冷却", "两次生长之间的等待；等级越高越短，枝繁叶茂更长。PP 20 的代价。")
    });

    describe("growth", [
        { key: "description.0", values: ["atkGift", "spaGift"] },
        { key: "description.1", values: ["spread", "blades"] },
        { key: "description.2", values: ["grownTicks", "tempo", "aftercast", "wait"] },
        { key: "timing", values: [] }
    ]);
}
