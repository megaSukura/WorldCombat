/**
 * 扑击 / bodypress 的参数与伤害段。
 *
 * 原生事实：Fighting、物理、威力 80、命中 100、PP 10、接触、以施法者的**防御**代替攻击参与伤害（Cobblemon 1.8，129 位学习者）。
 * 翻译：把「用身体撞过去、防御越高伤越高」做成**以守为攻的架肩顶推**——先压低重心、架住肩甲站定，再把整副身板
 * 连同护甲一起推出去；撞上不滑开、顶着对方一路碾过去。
 * **防御是本招的武器**：威力、架式时长、推进速度、顶推距离全随防御走，体重给出质量，攻击只留一点身体成分；
 * 速度越快架得越快。配置 grind（碾推）把撞击摊成更长的持续顶推、推得更远，但单发更轻；硬停式相反。
 *
 * 伤害段名 drive：这一顶随精灵数据变化的那部分；spec 的 `attackStat: def` 让防御作为攻击项进入结算。
 */
namespace PokemonSkills {
    actionParameters.define("bodypress", {
        /** 顶击威力：防御每比 60 多 1 加 0.42（上限 +55），体重每比 60 多 1 加 0.1（上限 +22），攻击每比 60 多 1 加 0.08（上限 +10）；碾推 ×0.9 / 硬停 ×1.08；夹在 55..175。 */
        drive: formula(
            F.base(78).plus(F.stat("defence").minus(60).times(0.42).clamp(-16, 55))
                .plus(F.body("weight").minus(60).times(0.1).clamp(-4, 22))
                .plus(F.stat("attack").minus(60).times(0.08).clamp(-4, 10))
                .times(F.when(F.pref("grind", text("worldcombat.skill.bodypress.preference.grind")), F.const(0.9), F.const(1.08)))
                .clamp(55, 175).round(1),
            "顶击威力", {
                base: 78, unit: "威力",
                description: "整副身板顶上去的基础威力；防御给出护甲的分量、体重给出质量，攻击只补一点。碾推式把力道摊到整段顶推里，单发更轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 架式时长：基础 10 刻，速度每比 55 快 1 少 0.03 刻（上限 −2），碾推 +2；夹在 7..16。 */
        brace: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 4))
                .plus(F.when(F.pref("grind", text("worldcombat.skill.bodypress.preference.grind")), F.const(2), F.const(0)))
                .clamp(7, 16).round(0),
            "架式时长", "压低重心、架住肩甲站定需要多久；天生快的个体架得更快，碾推式要多花一点时间。"),
        /** 推进速度：基础 0.34 格/刻，防御每比 60 多 1 加 0.0012（上限 +0.16），体重每比 60 多 1 加 0.002（上限 +0.14）；夹在 0.26..0.6。 */
        advanceSpeed: formula(
            F.base(0.34).plus(F.stat("defence").minus(60).times(0.0012).clamp(-0.04, 0.16))
                .plus(F.body("weight").minus(60).times(0.002).clamp(-0.06, 0.14))
                .clamp(0.26, 0.6).round(2),
            "推进速度", {
                unit: "格/刻",
                description: "把身板推出去时每刻前进的距离；它是一招慢推，防高身重者推得更稳。"
            }),
        /** 推进距离：基础 3.0 格，碰撞箱每比 1.4 高 1 格加 0.3（上限 +1.2），防御每比 60 多 1 加 0.004（上限 +0.8）；夹在 2.6..4.6。 */
        lunge: formula(
            F.base(3.0).plus(F.body("height").minus(1.4).times(0.3).clamp(-0.3, 1.2))
                .plus(F.stat("defence").minus(60).times(0.004).clamp(-0.2, 0.8))
                .clamp(2.6, 4.6).round(2),
            "推进距离", {
                unit: "格",
                description: "从站定到顶上的总位移；驱动目标接受范围。身板越大、护甲越厚，够得越远。"
            }),
        /** 顶推距离：基础 0.9 格，防御每比 60 多 1 加 0.014（上限 +1.6），体重每比 60 多 1 加 0.004（上限 +0.8）；碾推 ×1.25 / 硬停 ×0.7；夹在 0.4..3.0。 */
        shove: formula(
            F.base(0.9).plus(F.stat("defence").minus(60).times(0.014).clamp(-0.2, 1.6))
                .plus(F.body("weight").minus(60).times(0.004).clamp(-0.2, 0.8))
                .times(F.when(F.pref("grind", text("worldcombat.skill.bodypress.preference.grind")), F.const(1.25), F.const(0.7)))
                .clamp(0.4, 3.0).round(2),
            "顶推距离", {
                base: 0.9, unit: "格",
                description: "顶上之后把目标沿推进方向推走的总距离；防御越高顶得越远，碾推式把这一下摊得更长。"
            }),
        /** 顶推时长：基础 10 刻，防御每比 60 多 1 加 0.06 刻（上限 +10）；碾推 ×1.3 / 硬停 ×0.7；夹在 6..20。 */
        grindTicks: seconds(
            F.base(10).plus(F.stat("defence").minus(60).times(0.06).clamp(0, 10))
                .times(F.when(F.pref("grind", text("worldcombat.skill.bodypress.preference.grind")), F.const(1.3), F.const(0.7)))
                .clamp(6, 20).round(0),
            "顶推时长", "顶着目标一路推走的时间；硬停式几乎一下推完，碾推式慢慢碾过去。"),
        /** 判定半径：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.16；夹在 0.36..0.95。 */
        collisionRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.16)).clamp(0.36, 0.95).round(2),
            "判定半径", {
                unit: "格",
                description: "顶住活体时判定能不能顶上的横向半径。"
            }),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    stages("bodypress", [
        { level: 28, values: { drive: 90 } },
        { level: 46, values: { drive: 100, shove: 1.4 } }
    ]);

    defineDamage("bodypress", "drive", { defenceCoefficient: 0.0048, attackStat: "def" }, { contact: true });

    describe("bodypress", [
        { key: "description.0", values: ["drive", "collisionRadius"] },
        { key: "description.1", values: ["brace", "lunge", "advanceSpeed"] },
        { key: "description.2", values: ["shove", "grindTicks"] },
        { key: "grind.on", values: [], when: function (context) { return read(context.detail.values, ["grind"]) === true; } },
        { key: "grind.off", values: [], when: function (context) { return read(context.detail.values, ["grind"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.drive"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.drive", "tier.1.shove"] }
    ]);
}
