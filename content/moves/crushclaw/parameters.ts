/**
 * 撕裂爪 / crushclaw 的参数与伤害段。
 *
 * 原生事实：Normal／物理／威力 75／命中 95／PP 10／接触（Cobblemon 1.8，38 位学习者）。
 * 次要效果：50% 让目标防御下降 1 级。
 *
 * 翻译：把“用坚硬锐爪劈开对手”落成一记踏前交叉撕抓——双爪在身前划出一个 X，撕中的那一下让护甲外翻、防御下降。
 * 它是破防四打里最“准”的一记：命中 95 落成短而直的突进（只要目标在正前方就能撕到），撕甲几率最高；
 * 而且它主动利用别人开出的缺口：目标已经带着破防身份时，这一撕掀得更深。
 *
 * 数据分散：
 *   slash       撕抓威力：物攻定爪劲。
 *   lunge       突进距离：速度定扑过去的多远，也决定实际射程。
 *   width       判定半宽：碰撞箱宽度定双爪张开的宽度。
 *   tearChance  撕甲几率：等级定撕开护甲的把握（全族最高）。
 *   tearStages  撕甲等级：本招固定 1 级。
 *   deepen      加深等级：目标已带破防身份时额外多降的级数——先砸缺口再撕，值得一次配合。
 *   tearTicks   撕开标记时长：等级定外翻的护甲留多久。
 *
 * 伤害段 slash：交叉撕中的那一下，slice 与 contact 交给共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("crushclaw", {
        /** 撕抓威力：基础 68，物攻每比 60 多 1 加 0.12，夹在 44..108。 */
        slash: formula(
            F.base(68).plus(F.stat("attack").minus(60).times(0.12).clamp(-16, 26)).clamp(44, 108).round(1),
            "撕抓威力", {
                unit: "威力",
                description: "双爪交叉撕中的基础威力；物攻越高撕得越狠。对手防御、相性与暴击在命中时另算。"
            }),
        /** 突进距离：基础 2.4 格，速度每比 55 快 1 加 0.01，夹在 2.0..3.2。 */
        lunge: formula(
            F.base(2.4).plus(F.stat("speed").minus(55).times(0.01)).clamp(2.0, 3.2).round(2),
            "突进距离", {
                unit: "格",
                description: "踏前一步撕抓能覆盖的直距；速度快的个体扑得更远。它也是本招的实际射程来源。"
            }),
        /** 判定半宽：基础 0.55 格，碰撞箱每比 0.9 宽 1 格加 0.4，夹在 0.45..1.0。 */
        width: formula(
            F.base(0.55).plus(F.body("width").minus(0.9).times(0.4)).clamp(0.45, 1.0).round(2),
            "判定半宽", {
                unit: "格",
                description: "双爪张开覆盖的横向半宽；身体越宽的个体撕面越大。"
            }),
        /** 撕甲几率：基础 0.5，等级每比 30 高 1 加 0.002，夹在 0.4..0.65。 */
        tearChance: percent(
            F.base(0.5).plus(F.level().minus(30).times(0.002)).clamp(0.4, 0.65),
            "撕甲几率", "撕中时让目标防御下降的几率；等级越高撕得越准，是全族最高的一档。"),
        /** 撕甲等级：固定 1 级。 */
        tearStages: formula(
            F.base(1),
            "撕甲等级", {
                unit: "级",
                description: "一次撕甲让目标防御下降的能力等级。"
            }),
        /** 加深等级：目标已带破防身份时额外多降 1 级。 */
        deepen: formula(
            F.base(1),
            "加深等级", {
                unit: "级",
                description: "目标身上已带任何来源的破防身份时，这一撕额外多降的级数——先把缺口砸开再撕，收益更高。"
            }),
        /** 撕开标记时长：基础 90 刻，等级每比 30 高 1 加 1.5 刻，夹在 70..220。 */
        tearTicks: seconds(
            F.base(90).plus(F.level().minus(30).times(1.5)).clamp(70, 220).round(0),
            "撕开标记时长", "目标身上撕开标记停留的时长；等级越高外翻的护甲留得越久。")
    });

    defineDamage("crushclaw", "slash", {}, { contact: true, slice: true });

    stages("crushclaw", [
        { level: 32, values: { slash: 78 } },
        { level: 52, values: { tearChance: 0.58 } }
    ]);

    describe("crushclaw", [
        { key: "description.0", values: ["slash"] },
        { key: "description.1", values: ["lunge", "width"] },
        { key: "description.2", values: ["tearChance", "tearStages", "deepen", "tearTicks"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.tearChance"] }
    ]);
}
