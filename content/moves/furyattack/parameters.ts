/**
 * 乱击 / furyattack —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：**一般**／物理／威力 15／命中 85／PP 20／接触（`contact: 1`）／单体／连续 2～5 次
 *   （`multihit: [2, 5]`）。描述「用角或喙刺向对手进行攻击，连续攻击2～5次」，约 53 位学习者。
 *
 * 翻译：把「用角或喙连续刺」落成**原地定点突刺**——施法者扎住脚步，用角／喙朝同一个点一下一下地戳；每一下把
 *   对手顶退一点，退到够不着的地方这串就断。它是本族唯一**站定不动、把对手推着打**的连击：贴着墙的对手躲不开，
 *   会被整串吃满；站在空地上的人会被一路顶出射程，这串自然提前收场。
 *   与同族分开：乱抓会绕圈换位、扫尾拍打是原地整圈旋尾、骨棒乱打是掷骨夯地；只有乱击把「顶退」做进连击里。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   jab       每刺威力：物攻定这一戳有多沉；追击式略轻、顶退式略重。
 *   jabs      刺数：物攻定收角多快、等级定耐力，决定这一串最多几刺。
 *   reach     刺距：身高定角与喙的长度；追击式伸得更远，也是本招的实际射程来源。
 *   tipWidth  刺面半宽：身宽定角尖多粗（命中面窄，是定点招）。
 *   push      顶退：物攻与体重决定每刺把对手顶开多远——顶得越狠，越容易把它推出射程、提前收场。
 *   step      追步：速度决定追击式每刺向前跟多少；顶退式站定不追。
 *   maxTargets 最多刺到几个：身宽决定角尖扫到几条线。
 *   gap       两刺间隔：速度决定戳得有多密。
 *   accuracy  每刺命中率：速度提高它（原生 85% 起）。
 *   sparks    尘点数量：物攻换算的角风碎屑量，直接驱动发射数量。
 *   tempo／settle／recharge：速度与等级定起手、收招与冷却。
 *
 * 配置 `close`（追击式）双向取舍（默认关，即顶退式）：
 *   开（追击）＝每刺后施法者向前跟 `step` 格、命中面略伸远，把整串吃满；代价是每刺 ×0.9、顶退 ×0.35（几乎不推人）。
 *     适用：目标爱走位时保证连满。
 *   关（顶退，原生式）＝站定不动、顶退 ×1.2、每刺 ×1.05，一路把目标推出去；代价是它很快被推出射程，这串提前断。
 *     适用：把人从某个点顶开、或把它推到队友的招里。
 *
 * 伤害段 `jab` 与参数同名：每刺各自结算一次接触伤害（共享换算乘入物攻、对手物防、相性与暴击）。
 */
namespace PokemonSkills {
    export const furyattackId = "furyattack";
    export const furyattackScene = "world_combat:move_furyattack";
    export const furyattackMissText = "world_combat.move.furyattack.text.miss";
    export const furyattackOutText = "world_combat.move.furyattack.text.out";
    export const furyattackTallyText = "world_combat.move.furyattack.text.tally";

    actionParameters.define(furyattackId, {
        /** 每刺威力：15 + 物攻偏移[−4,9]×0.1；顶退 ×1.05 / 追击 ×0.9；夹 8..30。 */
        jab: formula(
            F.base(15).plus(F.stat("attack").minus(55).times(0.1).clamp(-4, 9))
                .times(F.when(F.pref("close", text("worldcombat.skill.furyattack.preference.close")), F.const(0.9), F.const(1.05)))
                .clamp(8, 30).round(1),
            "每刺威力", { base: 15,
                unit: "威力",
                description: "每一刺各自结算的威力；物攻越高戳得越沉。顶退式更重、追击式略轻。对手物防、相性与暴击在每刺命中时另算。"
            }),
        /** 刺数：2 + 物攻偏移[0,1.6] + 等级(≥22)偏移[0,1.2]；向下取整；夹 2..5。 */
        jabs: formula(
            F.base(2)
                .plus(F.stat("attack").minus(55).times(0.02).clamp(0, 1.6))
                .plus(F.level().minus(22).times(0.025).clamp(0, 1.2))
                .floor().clamp(2, 5),
            "刺数", {
                unit: "刺",
                description: "这一串最多刺出几下（原生 2～5）；物攻定收角速度、等级定耐力。中途落空或目标被顶出射程，这串就断。"
            }),
        /** 刺距：2.6 + 身高偏移[−0.2,0.9]×0.7 + 速度偏移[−0.15,0.4]×0.01；追击 ×1.05；夹 2.0..4.0。 */
        reach: formula(
            F.base(2.6).plus(F.body("height").minus(1.4).times(0.7).clamp(-0.2, 0.9))
                .plus(F.stat("speed").minus(55).times(0.01).clamp(-0.15, 0.4))
                .times(F.when(F.pref("close", text("worldcombat.skill.furyattack.preference.close")), F.const(1.05), F.const(1)))
                .clamp(2.0, 4.0).round(2),
            "刺距", { base: 2.6,
                unit: "格",
                description: "角或喙能够到多远；身高越高的个体伸得越远，也是本招的实际射程来源。追击式略远一点。"
            }),
        /** 刺面半宽：0.38 + 身宽偏移[−0.04,0.26]×0.3；夹 0.3..0.68。 */
        tipWidth: formula(
            F.base(0.38).plus(F.body("width").minus(0.9).times(0.3).clamp(-0.04, 0.26)).clamp(0.3, 0.68).round(2),
            "刺面半宽", {
                unit: "格",
                description: "这一刺在身前扫过多窄的一条；身宽的个体角尖更粗。命中面很窄，是定点招；画面里的走廊宽度与它一致。"
            }),
        /** 顶退：0.35 + 物攻偏移[−0.05,0.5]×0.004 + 体重偏移[−0.05,0.4]×0.003；顶退 ×1.2 / 追击 ×0.35；夹 0.1..1.0。 */
        push: formula(
            F.base(0.35).plus(F.stat("attack").minus(55).times(0.004).clamp(-0.05, 0.5))
                .plus(F.body("weight").minus(60).times(0.003).clamp(-0.05, 0.4))
                .times(F.when(F.pref("close", text("worldcombat.skill.furyattack.preference.close")), F.const(0.35), F.const(1.2)))
                .clamp(0.1, 1.0).round(2),
            "顶退", { base: 0.35,
                unit: "格",
                description: "每一刺把目标沿刺击方向顶开多远；物攻与体重越大顶得越狠。顶得越狠，越容易把它推出射程而提前收场——顶退式正是靠这个把人推开。"
            }),
        /** 追步：0.45 + 速度偏移[−0.1,0.5]×0.005；追击 ×1.2 / 顶退 ×0；夹 0..1.1。 */
        step: formula(
            F.base(0.45).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.1, 0.5))
                .times(F.when(F.pref("close", text("worldcombat.skill.furyattack.preference.close")), F.const(1.2), F.const(0)))
                .clamp(0, 1.1).round(2),
            "追步", {
                unit: "格",
                description: "追击式每一刺后向前跟多远，把距离重新压回射程内；速度越快跟得越紧。顶退式站定不动，这一项为 0。"
            }),
        /** 最多刺到几个：1 + 身宽偏移[0,1]；向下取整；夹 1..2。 */
        maxTargets: formula(
            F.base(1).plus(F.body("width").minus(1.0).times(1.2).clamp(0, 1)).floor().clamp(1, 2),
            "最多刺到", {
                unit: "个",
                description: "一刺最多同时刺到几个非友方目标；身宽的个体角尖能盖到并排的第二个。"
            }),
        /** 间隔：3 − 速度偏移[−0.6,1.0]×0.02；夹 2..5。 */
        gap: seconds(
            F.base(3).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.6, 1.0)).clamp(2, 5).round(0),
            "间隔", "两刺之间隔多久；速度越快戳得越密。"),
        /** 每刺命中率：0.85 + 速度偏移[−0.03,0.06]；夹 0.72..0.97。 */
        accuracy: percent(
            F.base(0.85).plus(F.stat("speed").minus(55).times(0.001).clamp(-0.03, 0.06)).clamp(0.72, 0.97).round(3),
            "每刺命中率", "每一刺独立掷的命中率（原生 85% 起）；速度提高它。落空一刺这串就断。"),
        /** 尘点数量：12 + 物攻偏移[−3,12]；夹 8..30。 */
        sparks: formula(
            F.base(12).plus(F.stat("attack").minus(55).times(0.12).clamp(-3, 12)).clamp(8, 30).round(0),
            "尘点数量", {
                unit: "点",
                description: "每一刺带起的角风碎屑数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：5 − 速度偏移[−0.8,1.3]；夹 3..8。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-0.8, 1.3)).clamp(3, 8).round(0),
            "起手", "低头压角到第一刺戳出的时间；速度越快越短。"),
        /** 收招：6 − 速度偏移[−0.6,1.2]；夹 3..9。 */
        settle: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.015).clamp(-0.6, 1.2)).clamp(3, 9).round(0),
            "收招", "这一串刺完收回站姿的时间；速度越快收得越快。"),
        /** 冷却：24 − 速度偏移[−3,4]；夹 14..34。 */
        recharge: seconds(
            F.base(24).minus(F.stat("speed").minus(55).times(0.05).clamp(-3, 4)).clamp(14, 34).round(0),
            "冷却", "再起一串突刺前等待多久；速度越快回得越快。PP 20 的代价。")
    });

    defineDamage(furyattackId, "jab", {}, { contact: true });

    stages(furyattackId, [
        { level: 22, values: { jab: 18 } },
        { level: 40, values: { jab: 22, reach: 3.0 } },
        { level: 58, values: { jab: 26, push: 0.6 } }
    ]);

    describe(furyattackId, [
        { key: "description.0", values: ["jab","jabs","accuracy"] },
        { key: "description.1", values: ["reach", "tipWidth", "push", "gap"] },
        { key: "description.2", values: ["step","maxTargets"] },
        { key: "close.on", values: [], when: function (context) { return read(context.detail.values, ["close"]) === true; } },
        { key: "close.off", values: [], when: function (context) { return read(context.detail.values, ["close"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.jab"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.jab", "tier.1.reach"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.jab", "tier.2.push"] }
    ]);
}
