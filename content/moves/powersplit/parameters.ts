/**
 * 力量平分 / powersplit —— 参数与数值来源。
 *
 * 原生事实（Showdown / Cobblemon 1.8）：Psychic／变化／威力 0／命中必中／PP 10／目标 normal；
 *   `onHit` 把双方攻击与特攻的**原始数值**相加再均分（floor），两边分别取各自那一项的平均值；
 *   不涉及能力变化等级。
 *
 * 核心念头：把两个人的底子拉到同一个刻度——你和对手的攻/特攻各取平均，强的被压下来、弱的被抬上去，
 *   两人从此在同一把尺上出手。它不碰已经攒起来的等级，只改底子；平分的结果维持一段长窗口。
 *
 * 与「力量互换」分开：互换只交换已经攒起来的那几级、底子不动；平分把底子拉平，等级原样保留。
 *
 * 数值来源（每个参数读不同的精灵数据，分散到不同参数上）：
 *   reach     平分距离：特攻给出能够到的范围，身高决定臂展，夹 4..12，并作为本招实际射程。
 *   tempo     起手：攻击越高，把力一分为二越利落（越快）。
 *   aftercast 收招：速度决定平完后多久收回。
 *   recharge  冷却：等级决定这次落定的新刻度要维持多久才能再平一次。
 *   span      平分窗口：等级与特防决定这次平分维持多久。
 *   motes     汇流粒子数：特攻与身高决定画面里向中央汇、再平分回去的粒子基准数量。
 */
namespace PokemonSkills {
    actionParameters.define("powersplit", {
        reach: formula(
            F.base(6, "基础")
                .plus(F.stat("specialAttack").times(0.025).as("特攻"))
                .plus(F.body("height").times(1.1).as("体型"))
                .clamp(4, 12).round(1),
            "平分距离", {
                unit: " 格",
                description: "能够到多远之外那人一起平分；特攻越高、身板越大够得越远。它也是本招实际射程的来源。"
            }),
        tempo: seconds(
            F.base(10, "基础").minus(F.stat("attack").times(0.03).as("攻击")).clamp(4, 14).round(0),
            "起手", "把两人的攻势相加再平分需要多久；攻击越高越利落。"),
        aftercast: seconds(
            F.base(6, "基础").minus(F.stat("speed").times(0.02).as("速度")).clamp(3, 10).round(0),
            "收招", "平分完成后的收势；速度快的个体收得更利落。"),
        recharge: seconds(
            F.base(95, "基础").minus(F.level().times(0.3).as("等级")).clamp(45, 140).round(0),
            "冷却", "两次平分之间的等待；等级越高，冷却越短。"),
        span: seconds(
            F.base(260, "基础").plus(F.level().times(2.2).as("等级")).plus(F.stat("specialDefence").times(0.4).as("特防"))
                .clamp(180, 700).round(0),
            "平分窗口", "两人被拉到的同一刻度维持多久；等级与特防越高越久，窗口走完各自回到原来的数值。"),
        motes: formula(
            F.base(14, "基础").plus(F.stat("specialAttack").div(50).as("特攻")).plus(F.body("height").times(4).as("体型"))
                .clamp(12, 40).round(0),
            "汇流粒子数", { visible: false,
                unit: " 颗",
                description: "向中央汇、再平分回两人身上的光点基准数量；特攻越高、身板越高越多，实际发射量再按本次数值差放大。"
            })
    });

    stages("powersplit", [
        { level: 40, values: { reach: 8.6, span: 380 } },
        { level: 55, values: { reach: 9.6, span: 480 } }
    ]);

    describe("powersplit", [
        { key: "description.0", values: ["reach", "span"] },
        { key: "description.2", values: [] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reach", "tier.0.span"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach", "tier.1.span"] }
    ]);
}
