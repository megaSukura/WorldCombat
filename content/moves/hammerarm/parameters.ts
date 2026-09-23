/**
 * 臂锤 / hammerarm —— 参数与伤害段。本族「转体抡击」的单体重砸成员之一。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：Fighting／物理／威力 100／命中 90／PP 10／优先度 0／接触；
 *   `punch` 标记；`self: { boosts: { spe: -1 } }`（命中后自身速度 −1）、无次要效果；58 位学习者。
 *   描述「挥舞强力而沉重的拳头，给予对手伤害。自己的速度会降低。」
 *
 * 翻译：把「挥出强力沉重的拳头」翻成即时战斗里的一次**过顶横挥重砸**——把整条手臂抡过头顶、借上身重量
 *   砸在单个目标身上；砸实那一下把目标砸退，拳面落地处把地面砸出放射状裂痕，自己则因惯性踉跄、速度降 1 级。
 *
 * 与同族分开：狂舞挥打是原地转整圈的覆盖、疾速转轮是贴地旋转冲进；臂锤是**原地过顶的一次单体重砸**。
 *   与冰锤分开：臂锤是横挥斗气重拳，把目标砸退、地面留裂痕；冰锤是裹冰垂直下砸、留下冰面与冰缓。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   hammer     砸击威力：物攻定拳面、**体重**定下砸的份量、等级定发力；顺势式把力分薄。
 *   reach      出手距离：身高给臂长、速度给上前的半步。
 *   knock      砸退距离：物攻给推力，**目标体重**抵掉一部分；顺势式砸得更远。
 *   cleft      裂痕半径：体重决定拳面把地面砸裂多开。
 *   dents      裂地量：体重与物攻决定砸出多少块裂痕（顺带决定画面的碎屑量）。
 *   speedLoss  自身速度下降：原生固定 1 级，是无法回避的代价。
 *   tempo/aftercast/recharge：速度定起手与收招、等级定熟练度，顺势式更慢。
 *
 * 配置 `followthrough`（顺势式，默认关）双向取舍：开＝砸退 ×1.35、裂痕更大更密，代价是威力 ×0.9、
 *   起手 +2 刻、收招 +3 刻、冷却 +6 刻；关（屏息式）＝在接触前收住力，单发更重、出手更快，但砸退与
 *   裂地都小。两向各有适用局面（把人砸出阵地 vs 打实单发）。
 *
 * 伤害段 `hammer` 与参数同名，走共享换算（原始类别 Physical），接触＋拳击由 `punch` 标记落定。
 */
namespace PokemonSkills {
    /** 目标质量（百克＝hg）：宝可梦读原生体重，其他生物按碰撞箱体积估算。 */
    const hammerarmMass: Formula.Node = F.when(F.target("body.weight"),
        F.target("body.weight"),
        F.target("actor.width").times(F.target("actor.width")).times(F.target("actor.height")).times(1000)
    ).as("目标体重");

    actionParameters.define("hammerarm", {
        /** 砸击威力：基础 95；物攻每比 60 多 1 加 0.5（夹 −14..30）；体重每比 300hg 多 1hg 加 0.02（夹 −6..16）；
         *  等级每比 30 高 1 加 0.3（夹 −6..14）；顺势 ×0.9 / 屏息 ×1.0；夹 60..150。 */
        hammer: formula(
            F.base(95)
                .plus(F.stat("attack").minus(60).times(0.5).clamp(-14, 30))
                .plus(F.body("weight").minus(300).times(0.02).clamp(-6, 16))
                .plus(F.level().minus(30).times(0.3).clamp(-6, 14))
                .times(F.when(F.pref("followthrough", text("worldcombat.skill.hammerarm.preference.followthrough")), F.const(0.9), F.const(1.0)))
                .clamp(60, 150).round(1),
            "砸击威力", {
                unit: "威力",
                description: "过顶横挥砸中目标那一下的基础威力；物攻定拳面、身体越沉份量越大、等级越高越稳。顺势式把力分到砸退上，单发轻一点。对手防御、相性与暴击在命中时另算。"
            }),
        /** 出手距离：基础 2.6 格；身高每比 1.4 高 1 格加 0.45（夹 −0.25..0.7）；速度每比 55 快 1 加 0.006（夹 −0.15..0.35）；夹 2.2..3.6。 */
        reach: formula(
            F.base(2.6)
                .plus(F.body("height").minus(1.4).times(0.45).clamp(-0.25, 0.7))
                .plus(F.stat("speed").minus(55).times(0.006).clamp(-0.15, 0.35))
                .clamp(2.2, 3.6).round(2),
            "出手距离", {
                unit: "格",
                description: "抡起的手臂够到多近才砸得实；身高给臂长、速度给上前的半步。它也是本招的实际射程来源。"
            }),
        /** 砸退距离：基础 0.8 格；物攻每比 60 多 1 加 0.008（夹 −0.2..0.7）；目标体重每比 300hg 重 1hg 减 0.0005（最多减 0.6）；
         *  顺势 ×1.35；夹 0.3..2.4。 */
        knock: formula(
            F.base(0.8)
                .plus(F.stat("attack").minus(60).times(0.008).clamp(-0.2, 0.7))
                .minus(hammerarmMass.minus(300).times(0.0005).clamp(0, 0.6))
                .times(F.when(F.pref("followthrough", text("worldcombat.skill.hammerarm.preference.followthrough")), F.const(1.35), F.const(1.0)))
                .clamp(0.3, 2.4).round(2),
            "砸退距离", {
                unit: "格",
                description: "被这一记砸开多远；物攻越强推得越远，目标越重越推不动，顺势式把冲势全压在这一下上。"
            }),
        /** 裂痕半径：基础 1.1 格；体重每比 300hg 多 1hg 加 0.001（夹 −0.2..0.8）；顺势 ×1.25；夹 0.8..2.4。 */
        cleft: formula(
            F.base(1.1)
                .plus(F.body("weight").minus(300).times(0.001).clamp(-0.2, 0.8))
                .times(F.when(F.pref("followthrough", text("worldcombat.skill.hammerarm.preference.followthrough")), F.const(1.25), F.const(1.0)))
                .clamp(0.8, 2.4).round(2),
            "裂痕半径", {
                unit: "格",
                description: "拳面落地处把地面砸裂多开；身体越沉裂得越广，顺势式更大。画出的裂环就是这个半径。"
            }),
        /** 裂地量：基础 10；体重每比 300hg 多 1hg 加 0.03（夹 −2..8）；物攻每比 60 多 1 加 0.06（夹 −2..8）；
         *  顺势 +6；夹 6..30 并向下取整。 */
        dents: formula(
            F.base(10)
                .plus(F.body("weight").minus(300).times(0.03).clamp(-2, 8))
                .plus(F.stat("attack").minus(60).times(0.06).clamp(-2, 8))
                .plus(F.when(F.pref("followthrough", text("worldcombat.skill.hammerarm.preference.followthrough")), F.const(6), F.const(0)))
                .clamp(6, 30).floor(),
            "裂地量", {
                unit: "块",
                description: "砸出的裂痕块数；身体越沉、物攻越高裂得越多，顺势式再多裂一圈。它同时决定画面里崩出的碎屑量。"
            }),
        /** 自身速度下降级：原生固定 1 级；夹 1..6。 */
        speedLoss: formula(
            F.const(1).clamp(1, 6).round(0),
            "自身速度下降", {
                unit: "级",
                description: "这一记甩出去后自身速度下降的能力等级；原生固定 1 级，是无法回避的代价。"
            }),
        /** 起手：基础 14 刻；速度每比 55 快 1 减 0.04（夹 −2..3）；顺势 +2；夹 8..20。 */
        tempo: seconds(
            F.base(14).minus(F.stat("speed").minus(55).times(0.04).clamp(-2, 3))
                .plus(F.when(F.pref("followthrough", text("worldcombat.skill.hammerarm.preference.followthrough")), F.const(2), F.const(0)))
                .clamp(8, 20).round(0),
            "起手", "把整条手臂抡过头顶、聚起斗气的时间；速度越快越短，顺势式多沉一下。这段时间里可以被集火打断。"),
        /** 收招：基础 11 刻；速度每比 55 快 1 减 0.03（夹 −1.5..2.5）；顺势 +3；夹 6..18。 */
        aftercast: seconds(
            F.base(11).minus(F.stat("speed").minus(55).times(0.03).clamp(-1.5, 2.5))
                .plus(F.when(F.pref("followthrough", text("worldcombat.skill.hammerarm.preference.followthrough")), F.const(3), F.const(0)))
                .clamp(6, 18).round(0),
            "收招", "砸完把惯性收回来、重新站稳的时间；顺势式多压一下，收得更久。"),
        /** 冷却：基础 34 刻；速度每比 55 快 1 减 0.06（夹 −3..6）；顺势 +6；夹 22..52。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.06).clamp(-3, 6))
                .plus(F.when(F.pref("followthrough", text("worldcombat.skill.hammerarm.preference.followthrough")), F.const(6), F.const(0)))
                .clamp(22, 52).round(0),
            "冷却", "两次过顶重砸之间等多久；速度越快回气越快，顺势式缓得更久。")
    });

    stages("hammerarm", [
        { level: 34, values: { hammer: 105, knock: 0.9 } },
        { level: 50, values: { hammer: 116, dents: 16 } }
    ]);

    defineDamage("hammerarm", "hammer", {}, { contact: true, punch: true });

    describe("hammerarm", [
        { key: "description.0", values: ["hammer","reach"] },
        { key: "description.1", values: ["knock","speedLoss"] },
        { key: "description.ground", values: ["cleft","dents"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "followthrough.on", values: ["cleft", "dents"], when: function (context) { return read(context.detail.values, ["followthrough"]) === true; } },
        { key: "followthrough.off", values: [], when: function (context) { return read(context.detail.values, ["followthrough"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.hammer", "tier.0.knock"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.hammer", "tier.1.dents"] }
    ]);
}
