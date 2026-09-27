/**
 * 扑击 / bodypress 的参数与伤害段。
 *
 * 原生事实：Fighting、物理、威力 80、命中 100、PP 10、接触、以施法者的**防御**代替攻击参与伤害（Cobblemon 1.8，129 位学习者）。
 * 翻译：把「用身体撞过去、防御越高伤越高」做成**以守为攻的短踏肩压**——先压低重心、架住肩甲站定，再朝正前方短踏一步，
 * 用身体前方的宽肩横边把挡路者一起压退。撞上不再顶住某一个人不放；单次推进里最多压到 3 个实际触体，主伤与总推距按触体均分。
 *
 * **防御是本招的武器**：威力、架式时长、推进速度、顶推距离全随防御走，体重给出质量，攻击只留一点身体成分；速度越快架得越快。
 * 配置 wide（宽面／窄面）只换覆盖：宽面把肩线外扩最多 0.3 格、更容易一次压到多人（每人份额更小）；窄面贴着自身身板只压近身一两个。
 *
 * 伤害段名 drive：这一压随精灵数据变化的那部分；spec 的 `attackStat: def` 让防御作为攻击项进入结算。
 */
namespace PokemonSkills {
    actionParameters.define("bodypress", {
        /** 顶击威力预算：防御每比 60 多 1 加 0.42（上限 +55），体重每比 60 多 1 加 0.1（上限 +22），攻击每比 60 多 1 加 0.08（上限 +10）；夹在 55..175。 */
        drive: formula(
            F.base(78).plus(F.stat("defence").minus(60).times(0.42).clamp(-16, 55))
                .plus(F.body("weight").minus(60).times(0.1).clamp(-4, 22))
                .plus(F.stat("attack").minus(60).times(0.08).clamp(-4, 10))
                .clamp(55, 175).round(1),
            "顶击威力", {
                base: 78, unit: "威力",
                description: "整副身板正面压上去的总威力；防御给出护甲的分量、体重给出质量，攻击只补一点。它是一次推进里所有实际触体共享的总预算，触体越多每人分到的越少。对手防御、相性与暴击在命中时另算。"
            }),
        /** 架式时长：基础 10 刻，速度每比 55 快 1 少 0.03 刻（上限 −2）；夹在 7..16。 */
        brace: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.03).clamp(-2, 4))
                .clamp(7, 16).round(0),
            "架式时长", "压低重心、架住肩甲站定需要多久；天生快的个体架得更快。"),
        /** 推进速度：基础 0.34 格/刻，防御每比 60 多 1 加 0.0012（上限 +0.16），体重每比 60 多 1 加 0.002（上限 +0.14）；夹在 0.26..0.6。 */
        advanceSpeed: formula(
            F.base(0.34).plus(F.stat("defence").minus(60).times(0.0012).clamp(-0.04, 0.16))
                .plus(F.body("weight").minus(60).times(0.002).clamp(-0.06, 0.14))
                .clamp(0.26, 0.6).round(2),
            "推进速度", {
                unit: "格/刻",
                description: "把身板推出去时每刻前进的距离；它是一记短促的肩压，防高身重者推得更稳。"
            }),
        /** 推进预算：基础 3.0 格，碰撞箱每比 1.4 高 1 格加 0.3（上限 +1.2），防御每比 60 多 1 加 0.004（上限 +0.8）；夹在 2.6..4.6。实际短踏取 min(1.2, 本值/3)。 */
        lunge: formula(
            F.base(3.0).plus(F.body("height").minus(1.4).times(0.3).clamp(-0.3, 1.2))
                .plus(F.stat("defence").minus(60).times(0.004).clamp(-0.2, 0.8))
                .clamp(2.6, 4.6).round(2),
            "推进预算", {
                unit: "格",
                description: "身板能够到的推进预算；实际只踏出它的三分之一（最多 1.2 格），余下的力道交给肩面横压。身板越大、护甲越厚，短踏越扎实。"
            }),
        /** 顶推距离：基础 0.9 格，防御每比 60 多 1 加 0.014（上限 +1.6），体重每比 60 多 1 加 0.004（上限 +0.8）；夹在 0.4..3.0。 */
        shove: formula(
            F.base(0.9).plus(F.stat("defence").minus(60).times(0.014).clamp(-0.2, 1.6))
                .plus(F.body("weight").minus(60).times(0.004).clamp(-0.2, 0.8))
                .clamp(0.4, 3.0).round(2),
            "顶推距离", {
                base: 0.9, unit: "格",
                description: "这一次肩压把触体沿推进方向推走的总距离；它同样按实际触体均分，防御越高顶得越远。目标走原生受击位移，抗击退者照样受伤但不保证被推开。"
            }),
        /** 判定半径：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.16；夹在 0.36..0.95。 */
        collisionRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.16)).clamp(0.36, 0.95).round(2),
            "判定半径", {
                unit: "格",
                description: "肩面压过时判定的前后厚度与贴身余量；身板越高越厚。"
            }),
        facePad: hidden(0.3),
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
        { key: "description.2", values: ["shove"] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.drive"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.drive", "tier.1.shove"] }
    ]);
}
