/**
 * 扫尾拍打 / tailslap —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：**一般**／物理／威力 25／命中 85／PP 10／接触（`contact: 1`）／单体／连续 2～5 次
 *   （`multihit: [2, 5]`）。描述「用坚硬的尾巴拍打对手进行攻击，连续攻击2～5次」，约 27 位学习者。
 *
 * 翻译：把「用硬尾连续拍打」落成**原地整圈旋尾**——施法者以自己为轴快速旋转，坚硬的尾巴每一圈扫过身体周围
 *   整整一圈；转几圈由尾巴的分量决定，尾越沉甩得越多圈。它是本族唯一**打一整圈、同时招呼周围所有人**的招，
 *   被打中的人被沿背离方向推开，站得越近越难躲。旋转是连续的，所以某一圈没拍实也不会停手。
 *   与同族分开：乱抓会绕圈换位、乱击是站定定点突刺、骨棒乱打是掷骨夯地；只有扫尾把「转身」本身做成范围攻击。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   lash      每圈威力：物攻定拍得多重、体重定尾巴有多沉；砸尾式更重。
 *   laps      圈数：体重给出惯性、速度给出转速、等级给出耐力，共同决定最多转几圈。
 *   radius    扫过半径：身高定尾巴有多长、身宽定甩开的幅度，也是本招的作用范围来源。
 *   push      推开：体重与物攻决定每一圈把人推多远；砸尾式推得少、改为上挑。
 *   arc       扫过张角：砸尾式收成前向一段；旋扫式是整圈。
 *   lift      上挑：物攻决定把目标顶起多高；砸尾式挑得更高。
 *   gap       圈间隔：速度决定转得有多快。
 *   accuracy  每圈命中率：速度提高它（原生 85% 起）；没拍实的圈不伤人，但旋转继续。
 *   dust      扬尘数量：物攻换算的尾风碎屑量，直接驱动发射数量。
 *   tempo／settle／recharge：速度与等级定起手、收招与冷却。
 *
 * 配置 `smash`（砸尾式）双向取舍（默认关，即旋扫式）：
 *   开（砸尾）＝每圈威力 ×1.25、上挑 ×1.4，代价是只扫前向约 200° 一段（张角 ×0.55）、推开 ×0.8、间隔 +1 刻。
 *     适用：正面一个硬目标，把伤害集中在一面并把它挑起来。
 *   关（旋扫，原生式）＝整圈 360°、推开更足，代价是每圈略轻。适用：被围住时一次照顾四周所有人。
 *
 * 伤害段 `lash` 与参数同名：每圈各自对范围内目标结算一次接触伤害。
 */
namespace PokemonSkills {
    export const tailslapId = "tailslap";
    export const tailslapScene = "world_combat:move_tailslap";
    export const tailslapTallyText = "world_combat.move.tailslap.text.tally";

    actionParameters.define(tailslapId, {
        /** 每圈威力：25 + 物攻偏移[−5,13]×0.14 + 体重偏移[−4,12]×0.01；砸尾 ×1.25；夹 14..52。 */
        lash: formula(
            F.base(25).plus(F.stat("attack").minus(55).times(0.14).clamp(-5, 13))
                .plus(F.body("weight").minus(60).times(0.01).clamp(-4, 12))
                .times(F.when(F.pref("smash", text("worldcombat.skill.tailslap.preference.smash")), F.const(1.25), F.const(1)))
                .clamp(14, 52).round(1),
            "每圈威力", { base: 25,
                unit: "威力",
                description: "尾巴每一圈各自结算的威力；物攻越高拍得越重，体重越大尾巴越沉。砸尾式更重。对手物防、相性与暴击在每圈命中时另算。"
            }),
        /** 圈数：2 + 体重偏移[0,2]×0.012 + 速度偏移[0,1.4]×0.015 + 等级(≥24)偏移[0,0.9]；向下取整；夹 2..5。 */
        laps: formula(
            F.base(2)
                .plus(F.body("weight").minus(60).times(0.012).clamp(0, 2))
                .plus(F.stat("speed").minus(55).times(0.015).clamp(0, 1.4))
                .plus(F.level().minus(24).times(0.02).clamp(0, 0.9))
                .floor().clamp(2, 5),
            "圈数", {
                unit: "圈",
                description: "这一趟最多转几圈（原生 2～5）；尾巴越沉惯性越足、出手越快转得越多、等级定耐力。某一圈没拍实不会停手，旋转继续。"
            }),
        /** 扫过半径：3.0 + 身高偏移[−0.3,1.3]×0.9 + 身宽偏移[−0.1,0.5]×0.4；夹 2.2..4.6。 */
        radius: formula(
            F.base(3.0).plus(F.body("height").minus(1.4).times(0.9).clamp(-0.3, 1.3))
                .plus(F.body("width").minus(0.9).times(0.4).clamp(-0.1, 0.5))
                .clamp(2.2, 4.6).round(2),
            "扫过半径", { base: 3.0,
                unit: "格",
                description: "尾巴能扫到多远；身高定尾长、身宽定甩开的幅度，也是本招的作用范围。画面里那个圈就是判定范围。"
            }),
        /** 推开：0.4 + 体重偏移[−0.1,0.6]×0.004 + 物攻偏移[−0.05,0.4]×0.003；旋扫 ×1 / 砸尾 ×0.8；夹 0.15..1.2。 */
        push: formula(
            F.base(0.4).plus(F.body("weight").minus(60).times(0.004).clamp(-0.1, 0.6))
                .plus(F.stat("attack").minus(55).times(0.003).clamp(-0.05, 0.4))
                .times(F.when(F.pref("smash", text("worldcombat.skill.tailslap.preference.smash")), F.const(0.8), F.const(1)))
                .clamp(0.15, 1.2).round(2),
            "推开", { base: 0.4,
                unit: "格",
                description: "每一圈把圈内的人沿背离施法者的方向推开多远；体重与物攻越大推得越狠，旋扫式推得更足。"
            }),
        /** 扫过张角：360；砸尾 ×0.55；夹 120..360。 */
        arc: formula(
            F.base(360).times(F.when(F.pref("smash", text("worldcombat.skill.tailslap.preference.smash")), F.const(0.55), F.const(1)))
                .clamp(120, 360).round(0),
            "扫过张角", {
                unit: "度",
                description: "一圈扫过多大一段；旋扫式是整圈（360），砸尾式收成前向约 200° 一段，把伤害集中在一面。"
            }),
        /** 上挑：0.18 + 物攻偏移[0,0.35]×0.004；砸尾 ×1.4；夹 0.05..0.5。 */
        lift: formula(
            F.base(0.18).plus(F.stat("attack").minus(55).times(0.004).clamp(0, 0.35))
                .times(F.when(F.pref("smash", text("worldcombat.skill.tailslap.preference.smash")), F.const(1.4), F.const(1)))
                .clamp(0.05, 0.5).round(2),
            "上挑", {
                unit: "格",
                description: "被拍中的人沿垂直方向被顶起多高；物攻越大挑得越高，砸尾式挑得更高。"
            }),
        /** 圈间隔：5 − 速度偏移[−1,1.8]×0.02；旋扫 +0 / 砸尾 +1；夹 2..7。 */
        gap: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.8))
                .plus(F.when(F.pref("smash", text("worldcombat.skill.tailslap.preference.smash")), F.const(1), F.const(0)))
                .clamp(2, 7).round(0),
            "圈间隔", "两圈之间隔多久；速度越快转得越急，砸尾式略缓。"),
        /** 每圈命中率：0.85 + 速度偏移[−0.03,0.06]；夹 0.72..0.97。 */
        accuracy: percent(
            F.base(0.85).plus(F.stat("speed").minus(55).times(0.001).clamp(-0.03, 0.06)).clamp(0.72, 0.97).round(3),
            "每圈命中率", "每一圈独立掷的命中率（原生 85% 起）；速度提高它。没拍实的那一圈不伤人，但旋转会继续。"),
        /** 扬尘数量：16 + 物攻偏移[−4,16]；夹 10..36。 */
        dust: formula(
            F.base(16).plus(F.stat("attack").minus(55).times(0.12).clamp(-4, 16)).clamp(10, 36).round(0),
            "扬尘数量", {
                unit: "点",
                description: "每一圈带起的尾风碎屑数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：7 − 速度偏移[−1,1.6]；夹 4..10。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 1.6)).clamp(4, 10).round(0),
            "起手", "压低重心、把尾巴绷直到转起来的时间；速度越快越短。"),
        /** 收招：8 − 速度偏移[−1.2,1.8]；夹 4..12。 */
        settle: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.025).clamp(-1.2, 1.8)).clamp(4, 12).round(0),
            "收招", "转停、落回站姿的时间；速度越快收得越快。"),
        /** 冷却：26 − 速度偏移[−3,4]；夹 15..34。 */
        recharge: seconds(
            F.base(26).minus(F.stat("speed").minus(55).times(0.05).clamp(-3, 4)).clamp(15, 34).round(0),
            "冷却", "再起一圈扫尾前等待多久；速度越快回得越快。PP 10 的代价。")
    });

    defineDamage(tailslapId, "lash", {}, { contact: true });

    stages(tailslapId, [
        { level: 24, values: { lash: 31 } },
        { level: 42, values: { lash: 38, radius: 3.6 } },
        { level: 60, values: { lash: 44, push: 0.7 } }
    ]);

    describe(tailslapId, [
        { key: "description.0", values: ["lash", "laps", "accuracy"] },
        { key: "description.1", values: ["radius", "arc", "push", "lift"] },
        { key: "description.2", values: ["gap", "dust"] },
        { key: "smash.on", values: [], when: function (context) { return read(context.detail.values, ["smash"]) === true; } },
        { key: "smash.off", values: [], when: function (context) { return read(context.detail.values, ["smash"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.lash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.lash", "tier.1.radius"] },
        { key: "growth.2", values: ["tier.2.level", "tier.2.lash", "tier.2.push"] }
    ]);
}
