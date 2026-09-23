/**
 * 蓄力 / stockpile — 参数与数值来源。
 *
 * 原生事实：Normal、变化、威力 —、命中必中、PP 20、目标 self、最多积蓄 3 次；每次 boosts { def: +1, spd: +1 }。
 *
 * 翻译：把「积蓄力量」翻成**一口口把力压进身体、身上箍起一层琥珀色的光壳**——每蓄一次多箍一圈，防御与特防各 +1，
 *   最多 3 圈。它在本组里是唯一**可以连放、层数会掉**的一招：每一圈都是一份真东西，被击中时崩掉一圈、那份等级
 *   跟着掉；壳全崩完，收益归零。取原生「防御 +1、特防 +1、最多 3 次、PP 20」；放弃回合制里由「喷出／吞下」消费
 *   的设定——即时交战里消费它的是对手的攻击，所以"该在什么时候挨打"成了这招真正的取舍。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   guard    每层防御等级：固定 1（原生 +1，本招的身份常数）。
 *   ward     每层特防等级：固定 1（原生 +1，本招的身份常数）。
 *   bond     蓄力时长：基础 140 刻 + 等级×2 + 特防×0.3；夹 100..300。等级与特防越高，压住的力撑得越久。
 *   rind     层环半径：基础 0.7 格 + 碰撞箱宽度×0.7；夹 0.6..1.8。体型越宽，光壳箍得越开（判定与表现同径）。
 *   charge   蓄力量：基础 10 + 体重（kg）×0.02 + 等级×0.1；夹 10..40。身体越沉、等级越高，一次压进的力越多，粒子按它发射。
 *   mend     破层回血比例：基础 5% + 特防×0.04%；夹 4%..14%。破层时按最大生命回复多少（选「回气」档）。
 *   shove    破层推开：基础 0.6 + 体重（kg）/120；夹 0.5..2.0 格。破层时把出手者推开多远（选「震开」档）。
 *   tempo    起手：基础 5 刻 − 速度×0.01；夹 3..7。蓄力很快，可以连着压。
 *   aftercast 收招：基础 4 刻 + 碰撞箱高度×0.8；夹 4..8。
 *   wait     冷却：基础 50 刻 − 等级×0.3；夹 30..75。本组最短的冷却，支撑「连放三层」。
 * 配置 break（破层去向）双向取舍：回气＝破掉的层化成少量回复，适合拉锯续命；震开＝把出手者推开，适合拉开距离、断开连击。
 *   两向各有局面，不改变每层给的等级。
 */
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
        /** 破层回血比例：选「回气」档时破层回复多少。 */
        mend: percent(
            F.base(0.05).plus(F.stat("specialDefence").times(0.0004)).clamp(0.04, 0.14),
            "破层回血", "破层去向选「回气」时，每崩掉一层按最大生命回复的比例；特防越高回得越多。"),
        /** 破层推开：选「震开」档时把出手者推开多远。 */
        shove: formula(
            F.base(0.6).plus(F.body("weight").div(120)).clamp(0.5, 2.0).round(2),
            "破层推开", {
                unit: " 格",
                description: "破层去向选「震开」时，每崩掉一层把出手者推开多远；身体越沉推得越远。"
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
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "break.mend", values: [], when: function (context) { return read(context.detail.values, ["break"]) !== "burst"; } },
        { key: "break.burst", values: [], when: function (context) { return read(context.detail.values, ["break"]) === "burst"; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bond", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.bond", "tier.1.wait"] }
    ]);
}
