/** Each stored layer owns its Defense/Sp. Def contribution until spent or its bond expires. */
namespace PokemonSkills {
    actionParameters.define("stockpile", {
        /** 每层防御等级：原生 +1，本招的身份常数。 */
        guard: formula(F.const(1), "每层防御等级", {
            unit: " 级",
            description: "每蓄一层把防御抬高多少级；原生 +1，层数最多 3。"
        }),
        /** 每层特防等级：原生 +1。 */
        ward: formula(F.const(1), "每层特防等级", {
            unit: " 级",
            description: "每蓄一层把特防抬高多少级；原生 +1，层数最多 3。"
        }),
        /** 蓄力时长：特防决定压住的力撑多久，等级由成长阶梯拉长。 */
        bond: seconds(
            F.base(140).plus(F.stat("specialDefence").times(0.3)).clamp(100, 300).round(0),
            "蓄力时长", "压进身体的力多久散去；特防越高越久，等级在同级台阶上再拉长。壳被击中会掉层，窗口走完与层数耗尽都会清空。"),
        /** 层环半径：体型越宽箍得越开。 */
        rind: formula(
            F.base(0.7).plus(F.body("width").times(0.7)).clamp(0.6, 1.8).round(2),
            "层环半径", {
                unit: " 格",
                description: "光壳箍住身体的半径；碰撞箱越宽箍得越开，表现里的壳环就是这个半径。"
            }),
        /** 蓄力量：身体越沉、等级越高越多。 */
        charge: formula(
            F.base(10).plus(F.body("weight").times(0.02)).plus(F.level().times(0.1)).clamp(10, 40).round(0),
            "蓄力量", {
                unit: " 点",
                description: "一次压进的力有多少；身体越沉、等级越高越多，粒子按它发射。"
            }),
        /** 释气回血比例：选「回气」档时释气回复多少。 */
        mend: percent(
            F.base(0.05).plus(F.stat("specialDefence").times(0.0004)).clamp(0.04, 0.14),
            "释气回血", "满层释气选「回气」时，主动放出一层时按最大生命回复的比例；特防越高回得越多。"),
        /** 释气推开：选「震开」档时把近处敌人推开多远。 */
        shove: formula(
            F.base(0.6).plus(F.body("weight").div(120)).clamp(0.5, 2.0).round(2),
            "释气推开", {
                unit: " 格",
                description: "满层释气选「震开」时，主动放出一层时把近处敌人推开多远；身体越沉推得越远。"
            }),
        /** 起手：蓄力很快，可以连着压。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").times(0.01)).clamp(3, 7).round(0),
            "起手", "把力压进身体需要多久；速度越快越短。本组最短的起手，支撑快速连放。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(4).plus(F.body("height").times(0.8)).clamp(4, 8).round(0),
            "收招", "压完之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级由成长阶梯缩短。 */
        wait: seconds(
            F.base(50).clamp(30, 75).round(0),
            "冷却", "两次蓄力之间的等待；等级越高越短。本组最短的冷却，配合最多 3 层。")
    });

    stages("stockpile", [
        { level: 30, values: { bond: 200, wait: 42 } },
        { level: 50, values: { bond: 240, wait: 36 } }
    ]);

    describe("stockpile", [
        { key: "description.0", values: ["guard", "ward"] },
        { key: "description.1", values: ["bond"] },
        { key: "description.crack", values: [] },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "break.mend", values: ["mend"], when: function (context) { return read(context.detail.values, ["break"]) !== "burst"; } },
        { key: "break.burst", values: ["shove"], when: function (context) { return read(context.detail.values, ["break"]) === "burst"; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bond", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.bond", "tier.1.wait"] }
    ]);
}
