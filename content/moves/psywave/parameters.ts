/**
 * 精神波 / psywave —— 参数与伤害段。
 *
 * 原生事实：Psychic／特殊／威力 0／命中 100／PP 15／单体／65 位学习者（Cobblemon 1.8，Showdown）；
 *   原生伤害为 `random(50,151) × 等级 / 100`，描述「向对手发射神奇的念波进行攻击。每次使用，伤害都会改变。」
 *
 * 翻译：把「每次使用伤害都会改变」做成本招的核心——施法者朝目标推出一道**不稳定的念力波前**；它比别的念波更散、
 *   会穿透一排人，每次出手摇出的强度不同。画面上的环数与亮度直接对应当前这一次的强弱，所以对手一眼能读出
 *   这一发是强是弱。它是念波家族里唯一会穿透、也是唯一把随机性当作身份的招。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   wave     波击威力：特攻决定念力多强，等级让波更凝。
 *   swing    波动幅度：等级越高越稳定（幅度越小）；配置再调整。
 *   pierce   穿透数：特攻与等级决定波前能穿几个。
 *   reach    射程：特攻决定推得多远。
 *   velocity 波速：速度决定推得多急。
 *   width    波宽：施法者体型（碰撞箱高度）。
 *   rings    环数：特攻与等级派生，是画面的基准环数（实际按本此强度系数增减）。
 *   起手／收招／冷却：速度决定。
 *
 * 配置 `surge`（涌动）双向取舍：开启＝威力 ×1.2、波动幅度 ×1.5（更容易摇出高低两端），但射程不变、收招 −3 刻
 *   更利落；关闭（稳流）＝威力 ×0.88、波动幅度 ×0.5、射程 ×1.1、冷却 −3 刻，稳而远。
 *
 * 伤害段 `wave` 走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    export const psywaveId = "psywave";
    export const psywaveScene = "world_combat:move_psywave";
    export const psywaveHitText = "world_combat.move.psywave.text.hit";
    export const psywaveMissText = "world_combat.move.psywave.text.miss";

    actionParameters.define(psywaveId, {
        /** 波击威力：46 + 特攻偏移[−10,30] + 等级(≥30)偏移[0,12]，涌动 ×1.2 / 稳流 ×0.88；夹 28..96。 */
        wave: formula(
            F.base(46)
                .plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-10, 30))
                .plus(F.level().minus(30).times(0.4).clamp(0, 12))
                .times(F.when(F.pref("surge"), F.const(1.2), F.const(0.88)))
                .clamp(28, 96).round(1),
            "波击威力", {
                unit: "威力",
                description: "念力波命中时的基准威力，每次出手再乘一个本此摇出的强度系数；特攻越高波越强，等级让波更凝。对手特防、相性与暴击在命中时另算。"
            }),
        /** 波动幅度：0.55 − 等级(≥30)偏移[0,0.30]，涌动 ×1.5 / 稳流 ×0.5；夹 0.12..0.80。 */
        swing: formula(
            F.base(0.55)
                .minus(F.level().minus(30).times(0.004).clamp(0, 0.30))
                .times(F.when(F.pref("surge"), F.const(1.5), F.const(0.5)))
                .clamp(0.12, 0.80).round(3),
            "波动幅度", {
                unit: "比例",
                description: "本此强度系数相对 1 的上下浮动：实际伤害在基准的 (1 − 幅度) 到 (1 + 幅度) 之间。等级越高越稳定；涌动式明显更飘。"
            }),
        /** 穿透数：2 + 特攻偏移[0,4] + 等级(≥30)偏移[0,3]；夹 1..9。 */
        pierce: formula(
            F.base(2)
                .plus(F.stat("specialAttack").minus(60).times(0.03).clamp(0, 4))
                .plus(F.level().minus(30).times(0.05).clamp(0, 3))
                .clamp(1, 9).round(0),
            "穿透数", {
                unit: "个",
                description: "波前能穿过的目标数；特攻与等级越高穿得越多。念力波会从第一个目标身上继续推向下一个。"
            }),
        /** 射程：12 + 特攻偏移[−2,4]，稳流 ×1.1；夹 9..18。 */
        reach: formula(
            F.base(12)
                .plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-2, 4))
                .times(F.when(F.pref("surge"), F.const(1.0), F.const(1.1)))
                .clamp(9, 18).round(1),
            "射程", {
                unit: "格",
                description: "念力波能推多远；特攻越高越远，稳流式再远一成。它也是本招的实际射程。"
            }),
        /** 波速：1.3 + 速度偏移[−0.2,0.5]；夹 0.9..2.2。 */
        velocity: formula(
            F.base(1.3)
                .plus(F.stat("speed").minus(55).times(0.01).clamp(-0.2, 0.5))
                .clamp(0.9, 2.2).round(2),
            "波速", {
                unit: "格/刻",
                description: "波前每刻推进的距离；速度快的个体推得更急。"
            }),
        /** 波宽：0.55 + 碰撞箱高度偏移[−0.06,0.30]；夹 0.40..1.00。 */
        width: formula(
            F.base(0.55)
                .plus(F.body("height").minus(1.4).times(0.16).clamp(-0.06, 0.30))
                .clamp(0.40, 1.00).round(2),
            "波宽", {
                unit: "格",
                description: "波前横向的判定半径；大个子的波更宽，也更容易一次罩住并排的人。"
            }),
        /** 环数：3 + 特攻偏移[0,3] + 等级(≥30)偏移[0,3]；夹 3..9。 */
        rings: formula(
            F.base(3)
                .plus(F.stat("specialAttack").minus(60).times(0.05).clamp(0, 3))
                .plus(F.level().minus(30).times(0.06).clamp(0, 3))
                .clamp(3, 9).round(0),
            "环数", {
                unit: "环",
                description: "波前的基准环数，随特攻与等级增长；本此摇出的强度会让环数在它上下浮动，画面里的数量和机制一致。"
            }),
        /** 起手：10 − 速度偏移[−2,4]；夹 5..16。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 4)).clamp(5, 16).round(0),
            "起手", "把不稳的念力压成一道波需要多久；速度越快越短。"),
        /** 收招：8 − 速度偏移[−1,2]，涌动 −3；夹 3..11。 */
        aftercast: seconds(
            F.base(8)
                .minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .minus(F.when(F.pref("surge"), F.const(3), F.const(0)))
                .clamp(3, 11).round(0),
            "收招", "推出后的收势；速度越快越利落，涌动式收得更快。"),
        /** 冷却：24 − 速度偏移[−4,6]，稳流 −3；夹 12..36。 */
        recharge: seconds(
            F.base(24)
                .minus(F.stat("speed").minus(55).times(0.04).clamp(-4, 6))
                .minus(F.when(F.pref("surge"), F.const(0), F.const(3)))
                .clamp(12, 36).round(0),
            "冷却", "再推一道波之间的等待；速度越快回得越快，稳流式更短。")
    });

    defineDamage(psywaveId, "wave", {});

    stages(psywaveId, [
        { level: 34, values: { wave: 58, pierce: 3 } },
        { level: 50, values: { wave: 70, swing: 0.35 } }
    ]);

    describe(psywaveId, [
        { key: "description.0", values: ["wave", "swing"] },
        { key: "description.1", values: ["reach", "velocity", "width"] },
        { key: "description.2", values: ["pierce", "rings"] },
        { key: "surge.on", values: [], when: function (context) { return read(context.detail.values, ["surge"]) === true; } },
        { key: "surge.off", values: [], when: function (context) { return read(context.detail.values, ["surge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.wave", "tier.0.pierce"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.wave", "tier.1.swing"] }
    ]);
}
