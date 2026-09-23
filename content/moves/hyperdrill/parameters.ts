/**
 * 强力钻 / hyperdrill —— 参数与伤害段。本组「旋身破缚」的破守·重击成员。
 *
 * 原生事实：Normal／物理／威力 100／命中 100／PP 5／contact／**不带 protect 旗标**（即无视守住、看穿这类守护）、
 *   无次要效果、无 breaksProtect（Cobblemon 1.8 / Showdown）。学习者仅 2 位。
 *   描述「急速旋转尖锐的身体部位贯穿对手。可以无视守住和看穿等招式。」
 *
 * 翻译：把「旋转尖锐部位贯穿对手、无视守护」翻成一次**压上全部重量的直线凿穿**——身体最尖的一点高速旋成
 *   钻头，沿着瞄准方向钻进目标，先把撑在它外面的守护整层凿开，再按这一记的重力砸进去；贯穿式会一路穿过多
 *   个目标。它是本组最贵、最重的一次出手（PP 5）。
 *
 * 与同族分开：佯攻是**先掀后戳**的轻快探路，强力钻是**连撕带砸**的重型直线凿穿；玩家凭「慢、猛、一条线
 *   凿过去」认出它。
 *
 * 数据分散（每个参数读不同的精灵数据，小差距才在场上看得出来）：
 *   drill      凿击威力：**物攻**给钻头的狠度，**速度**给旋转的动量，等级定发力；贯穿式 ×0.9 / 定钻式 ×1.2。
 *   reach/rush 冲距与冲速：**速度**决定起步与每刻推进，身高决定步幅；贯穿式冲得更远更快。
 *   shred      凿护层数：等级与物攻决定一次凿开几层守护，夹 1..3。
 *   pierce     贯穿人数：贯穿式下由等级决定能一路穿过几人，夹 1..3。
 *   radius     钻头判定半径：碰撞箱宽度与身高。
 *   push       钻开距离：物攻决定把目标顶多远，体重抵掉一部分。
 *   grains     钻屑数量：物攻与速度派生，直接驱动画面发射量。
 *   tempo/recover/recharge：速度与等级定时序；贯穿式更慢更费。
 *
 * 配置 `through`（贯穿式，默认关）双向取舍：开＝一路贯穿最多 `pierce` 个目标、射程 ×1.15、钻速 ×1.1，代价
 *   是每记 ×0.9、起手 +2 刻、冷却 +8 刻；关（定钻式）＝钻到第一个目标就收，这一记 ×1.2、出手快、冷却短，
 *   但只打一个。两向各有适用局面（凿穿一排 vs 集中砸穿一个）。
 *
 * 伤害段 `drill` 与参数同名，标 contact（原生接触）。
 */
namespace PokemonSkills {
    /** 目标质量（百克＝hg）：宝可梦读原生体重，其他生物按碰撞箱体积估算。 */
    const hyperdrillMass: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");

    actionParameters.define("hyperdrill", {
        /** 凿击威力：基础 100；物攻每比 60 多 1 加 0.34（夹 −14..44）；速度每比 55 快 1 加 0.28（夹 −6..16）；
         *  等级每比 40 高 1 加 0.35（夹 −6..16）；贯穿 ×0.9 / 定钻 ×1.2；夹 60..168。 */
        drill: formula(
            F.base(100)
                .plus(F.stat("attack").minus(60).times(0.34).clamp(-14, 44))
                .plus(F.stat("speed").minus(55).times(0.28).clamp(-6, 16))
                .plus(F.level().minus(40).times(0.35).clamp(-6, 16))
                .times(F.when(F.pref("through", text("worldcombat.skill.hyperdrill.preference.through")), F.const(0.9), F.const(1.2)))
                .clamp(60, 168).round(1),
            "凿击威力", {
                unit: "威力",
                description: "钻头凿进去那一下的基础威力；物攻给狠度、速度给旋转动量、等级越高打得越稳。对手防御、相性与暴击在命中时另算。贯穿式分薄到多人，每一记更轻；定钻式只钻一个，更重。"
            }),
        /** 冲距：基础 2.8；速度偏移[−0.25,0.9] + 身高偏移[−0.15,0.6]；贯穿 ×1.15；夹 2.0..5.6。 */
        reach: formula(
            F.base(2.8)
                .plus(F.stat("speed").minus(55).times(0.012).clamp(-0.25, 0.9))
                .plus(F.body("height").minus(1.4).times(0.35).clamp(-0.15, 0.6))
                .times(F.when(F.pref("through"), F.const(1.15), F.const(1)))
                .clamp(2.0, 5.6).round(2),
            "冲距", {
                unit: "格",
                description: "钻头从起步到停下能钻多远，也是本招的实际射程来源；速度决定起步、身高决定步幅，贯穿式钻得更远。"
            }),
        /** 冲速：基础 0.55 + 速度偏移[−0.08,0.25]；贯穿 ×1.1；夹 0.4..1.0。 */
        rush: formula(
            F.base(0.55).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.08, 0.25))
                .times(F.when(F.pref("through"), F.const(1.1), F.const(1)))
                .clamp(0.4, 1.0).round(2),
            "冲速", {
                unit: "格/刻",
                description: "钻头每刻推进的距离；速度快的个体转得更急，贯穿式钻得更快。"
            }),
        /** 凿护层数：基础 1 + 等级每 25 级 +1（夹 0..2）+ 物攻每比 70 多 1 加 0.02（夹 0..1）；夹 1..3 向下取整。 */
        shred: formula(
            F.base(1)
                .plus(F.level().minus(25).div(25).clamp(0, 2))
                .plus(F.stat("attack").minus(70).times(0.02).clamp(0, 1))
                .clamp(1, 3).floor(),
            "凿护层数", {
                unit: "层",
                description: "钻头一次能凿开目标身上几层守护（守住、看穿、广域防守、硬化都是同一套守护机制）；等级与物攻越高凿得越深。"
            }),
        /** 贯穿人数：贯穿式下 1 + 等级每 30 级 +1（夹 0..2）；定钻式恒为 1；夹 1..3 向下取整。 */
        pierce: formula(
            F.when(F.pref("through", text("worldcombat.skill.hyperdrill.preference.through")),
                F.const(1).plus(F.level().div(30).clamp(0, 2)),
                F.const(1))
                .clamp(1, 3).floor(),
            "贯穿人数", {
                unit: "个",
                description: "贯穿式下一次冲刺最多一路钻穿几个目标（按离自己的远近排序）；定钻式只钻第一个。等级越高穿得越多。"
            }),
        /** 判定半径：基础 0.5 + 宽度偏移[−0.06,0.32] + 高度偏移[−0.04,0.2]；夹 0.42..1.0。 */
        radius: formula(
            F.base(0.5)
                .plus(F.body("width").minus(0.9).times(0.4).clamp(-0.06, 0.32))
                .plus(F.body("height").minus(1.4).times(0.12).clamp(-0.04, 0.2))
                .clamp(0.42, 1.0).round(2),
            "钻头半径", {
                unit: "格",
                description: "钻头轮缘能碰到的横向半径；身板越宽越容易钻到，画面里的钻头也与它一致。"
            }),
        /** 钻开距离：基础 0.5 + 物攻偏移[−0.1,0.9] − 目标体重偏移[0,0.6]；夹 0.15..1.8。 */
        push: formula(
            F.base(0.5)
                .plus(F.stat("attack").minus(60).times(0.008).clamp(-0.1, 0.9))
                .minus(hyperdrillMass.minus(300).times(0.0005).clamp(0, 0.6))
                .clamp(0.15, 1.8).round(2),
            "钻开距离", {
                unit: "格",
                description: "被钻到的目标沿钻进方向被顶开多远；物攻越高顶得越远，目标越重越顶不动。"
            }),
        /** 钻屑数量：基础 16 + 物攻偏移[−3,16] + 速度偏移[−2,10]；夹 10..44。 */
        grains: formula(
            F.base(16)
                .plus(F.stat("attack").minus(60).times(0.14).clamp(-3, 16))
                .plus(F.stat("speed").minus(55).times(0.15).clamp(-2, 10))
                .clamp(10, 44).round(0),
            "钻屑数量", {
                unit: "点",
                description: "钻头旋转与凿穿时迸出的钻屑数量，随物攻与速度增长；粒子按它发射，画面里的数量与机制一致。"
            }),
        /** 起手：基础 9 − 速度偏移[−1.5,3]；贯穿 +2；夹 5..16。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 3))
                .plus(F.when(F.pref("through"), F.const(2), F.const(0))).clamp(5, 16).round(0),
            "起手", "把尖端旋起来、压低重心的时间；速度越快越好转，贯穿式先蓄一段更长的势。"),
        /** 收招：基础 9 − 速度偏移[−1.5,3]；夹 4..14。 */
        recover: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 3)).clamp(4, 14).round(0),
            "收招", "钻完把转速刹住、重新站稳的时间；速度越快收得越利落。"),
        /** 冷却：基础 34 − 等级偏移[−3,8]；贯穿 +8；夹 20..54。 */
        recharge: seconds(
            F.base(34).minus(F.level().minus(30).times(0.12).clamp(-3, 8))
                .plus(F.when(F.pref("through"), F.const(8), F.const(0))).clamp(20, 54).round(0),
            "冷却", "两次凿穿之间的等待；等级越高回气越快，贯穿式更费。PP 5 的代价。")
    });

    defineDamage("hyperdrill", "drill", {}, { contact: true });

    stages("hyperdrill", [
        { level: 34, values: { drill: 112, shred: 2 } },
        { level: 52, values: { drill: 128, reach: 3.8 } }
    ]);

    describe("hyperdrill", [
        { key: "description.0", values: ["drill"] },
        { key: "description.1", values: ["reach", "rush", "radius"] },
        { key: "description.2", values: ["shred", "pierce", "push"] },
        { key: "through.on", values: [], when: function (context) { return read(context.detail.values, ["through"]) === true; } },
        { key: "through.off", values: [], when: function (context) { return read(context.detail.values, ["through"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "recover", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.drill", "tier.0.shred"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.drill", "tier.1.reach"] }
    ]);
}
