/**
 * 迷昏拳 / dizzypunch 的参数与伤害段。
 *
 * 原生事实：Normal、物理、威力 70、命中 100、PP 10、接触、拳类，命中后 20% 概率使目标混乱
 *   （Cobblemon 1.8 / Showdown），全招 14 位学习者。
 *
 * 翻译：把「有节奏地出拳」落成一串**按固定节拍交替打出的连拳**——节拍就是它的身份：不是一记重拳，
 * 而是一下接一下、节奏分明的点打，快的人打更多下；每一下都短促地扫过身前的小扇面，挨打的人被
 * 打得脑袋发懵。原生「一次 20% 混乱」被翻成：整串打完再按概率让被打中的人天旋地转——挨得越多
 * 越可能晕；被迷昏的人出手会打偏、还会被自己的力气带倒（自伤）。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   flurry     每拳威力：物攻定拳头的分量。
 *   beats      拳数：速度决定打出几拳（快的人打更多下），疾风连打再 +1。
 *   interval   节拍：速度决定两拳间隔；疾风更紧。
 *   reach      拳程：实时碰撞箱宽度决定能探多远。
 *   arc        扇面角度：碰撞箱宽度决定拳面张角。
 *   dazeTicks  混乱时长：物攻与等级决定晕多久；疾风更短。
 *   chance     混乱概率：原生 20% 起，物攻提高；疾风略降。
 *   fumble     失手概率：混乱期间每次想出手被打散的概率，物攻越高越晕。
 *   stars      星星数：拳数与物攻派生，表现按它发射。
 *   起手／收招／冷却：速度决定。
 *
 * 配置 `rapid`（疾风连打）双向取舍：开启＝多打一拳、节拍更紧、起手收招冷却更短，但每拳更轻、
 * 混乱更短更少见；关闭（重拳节拍）＝拳少而重、更容易打晕。
 *
 * 伤害段 `flurry` 每拳各结算一次，走共享换算；接触与拳类标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    /** 拳数节点：速度越高打得越多，疾风连打 +1；两级起、最多五拳。两个参数共用同一棵树。 */
    function dizzypunchBeatsNode() {
        return F.base(2).plus(F.stat("speed").minus(45).times(0.03).clamp(0, 3))
            .plus(F.when(F.pref("rapid", text("worldcombat.skill.dizzypunch.preference.rapid")), F.const(1), F.const(0)))
            .clamp(2, 5).round(0);
    }

    actionParameters.define("dizzypunch", {
        flurry: formula(
            F.base(24).plus(F.stat("attack").minus(55).times(0.09).clamp(-5, 12))
                .times(F.when(F.pref("rapid", text("worldcombat.skill.dizzypunch.preference.rapid")), F.const(0.82), F.const(1)))
                .clamp(12, 44).round(1),
            "每拳威力", {
                unit: "威力",
                description: "连拳里每一拳的基础威力；物攻越高每拳越重，疾风连打把每一拳摊薄。总伤害是这一项乘以拳数。对手防御、相性与暴击在每拳命中时另算。"
            }),
        beats: formula(
            dizzypunchBeatsNode(),
            "拳数", {
                unit: "拳",
                description: "这一串连拳打出几拳；速度越快打得越多，疾风连打再 +1。表现里的拳击爆点数量与它一致。"
            }),
        interval: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .minus(F.when(F.pref("rapid", text("worldcombat.skill.dizzypunch.preference.rapid")), F.const(1), F.const(0)))
                .clamp(3, 8).round(0),
            "节拍", "两拳之间隔多久；速度越快节拍越紧，疾风连打更紧。"),
        reach: formula(
            F.base(2.2).plus(F.body("width").minus(0.9).times(0.25).clamp(-0.1, 0.4)).clamp(2.1, 2.6).round(2),
            "拳程", {
                unit: "格",
                description: "每一拳能探到的距离；身体越宽够得越远。它加上一点出手余量就是本招的实际射程。"
            }),
        arc: formula(
            F.base(90).plus(F.body("width").minus(0.9).times(25).clamp(-10, 40)).clamp(70, 150).round(0),
            "扇面角度", {
                unit: "度",
                description: "每一拳扫过的扇面张角；身体越宽抡得越开。画面里闪过的拳面就是判定范围。"
            }),
        dazeTicks: seconds(
            F.base(170).plus(F.stat("attack").minus(55).times(0.4).clamp(-20, 60))
                .plus(F.level().minus(28).times(1).clamp(0, 36))
                .times(F.when(F.pref("rapid", text("worldcombat.skill.dizzypunch.preference.rapid")), F.const(0.85), F.const(1)))
                .clamp(110, 320).round(0),
            "混乱时长", "被打得脑袋发懵后陷入混乱的时长；物攻越高、等级越高晕得越久，疾风更短。"),
        chance: percent(
            F.base(0.20).plus(F.stat("attack").minus(55).times(0.0014).clamp(-0.05, 0.12))
                .minus(F.when(F.pref("rapid", text("worldcombat.skill.dizzypunch.preference.rapid")), F.const(0.05), F.const(0)))
                .clamp(0.1, 0.4).round(3),
            "混乱概率", "整串打完时，被打中的人陷入混乱的概率；原生 20% 起，物攻越高越容易，疾风更少见。"),
        fumble: percent(
            F.base(0.34).plus(F.stat("attack").minus(55).times(0.0012).clamp(-0.05, 0.1)).clamp(0.2, 0.5).round(3),
            "失手概率", "混乱期间目标每次想出手被打散的概率；物攻越高的施法者打得越懵。"),
        stars: formula(
            F.base(6).plus(dizzypunchBeatsNode().times(2))
                .plus(F.stat("attack").minus(55).times(0.08).clamp(-2, 10))
                .clamp(8, 28).round(0),
            "星星数", {
                unit: "颗",
                description: "被打懵时头顶冒出的星星数量，随拳数与物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.04).clamp(-2, 3))
                .minus(F.when(F.pref("rapid", text("worldcombat.skill.dizzypunch.preference.rapid")), F.const(2), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "双拳交替摆动、踏出节拍到能出第一拳的时间；速度越快越短，疾风更短。"),
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2))
                .minus(F.when(F.pref("rapid", text("worldcombat.skill.dizzypunch.preference.rapid")), F.const(2), F.const(0)))
                .clamp(4, 14).round(0),
            "收招", "打完一串拳后收势的时间；疾风收得更快。"),
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(55).times(0.04).clamp(-3, 6))
                .minus(F.when(F.pref("rapid", text("worldcombat.skill.dizzypunch.preference.rapid")), F.const(4), F.const(0)))
                .clamp(18, 44).round(0),
            "冷却", "再次起节拍前的等待；速度越快回得越快，疾风循环更顺。")
    });

    stages("dizzypunch", [
        { level: 30, values: { flurry: 27, beats: 3 } },
        { level: 48, values: { flurry: 31, dazeTicks: 210 } }
    ]);

    defineDamage("dizzypunch", "flurry", {}, { contact: true, punch: true });

    describe("dizzypunch", [
        { key: "description.0", values: ["flurry","beats","interval","arc","reach"] },
        { key: "description.1", values: ["chance","dazeTicks","fumble"] },
        { key: "rapid.on", values: [], when: function (context) { return read(context.detail.values, ["rapid"]) === true; } },
        { key: "rapid.off", values: [], when: function (context) { return read(context.detail.values, ["rapid"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.flurry", "tier.0.beats"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.flurry", "tier.1.dazeTicks"] }
    ]);
}
