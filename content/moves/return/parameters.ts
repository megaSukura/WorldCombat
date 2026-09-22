/**
 * 报恩 / return — 参数与伤害段。
 *
 * 原生事实：一般、物理、命中 100、PP 20、接触、无次要效果；威力回调为 亲密度 × 10 / 25，
 * 即亲密度越高越强（0..102）（Cobblemon 1.8，742 位学习者）。
 *
 * 翻译：把「亲密度越高威力越大」翻成即时战斗里的一件事——**为训练家把这一下全力送出去**。亲密度是这招的读数：
 * 高亲密度让金色誓约在起手时聚得更亮、冲得更重、更远。它是本组的「单次重击」成员：一次清洁的冲锋只结算一段伤害，
 * 与同读亲密度、方向相反的迁怒（多段快抓）在场上靠「一道直冲的金光」与「一串暗色抓痕」分开。
 *
 * 数据分散：power 读亲密度与攻击；charge/runSpeed 读速度；carry 读速度与体重；push 读体重；collisionRadius 读体型。
 * 配置 devoted（受托式）：把誓约压得更重、冲得更远、撞实后顺势越过对手换位，代价是起手、收招与冷却更久——
 * 想换位或压重时用，只想快速点一下时关掉。
 */
namespace PokemonSkills {
    actionParameters.define("return", {
        /** 单次重击威力：基础 22，亲密度 × 0.42（0..107），攻击每比 55 多 1 加 0.2（夹 −6..+20），等级每高 1 加 0.25（夹 −4..+10）；受托 ×1.18；夹在 18..148。 */
        power: formula(
            F.base(22)
                .plus(F.individual("friendship", text("worldcombat.skill.return.value.friendship")).times(0.42).clamp(0, 107)
                    .as(text("worldcombat.skill.return.value.bond")))
                .plus(F.stat("attack").minus(55).times(0.2).clamp(-6, 20).as(text("worldcombat.skill.return.value.force")))
                .plus(F.level().minus(20).times(0.25).clamp(-4, 10).as(text("worldcombat.value.level")))
                .times(F.when(F.pref("devoted", text("worldcombat.skill.return.preference.devoted")), F.const(1.18), F.const(1)))
                .clamp(18, 148).round(1),
            "报恩威力", {
                unit: "威力",
                description: "这一记全力冲撞的基础威力；亲密度越高越重，攻击给出狠度。对手防御、相性与暴击在命中时另算。"
            }),
        /** 羁绊比例：亲密度 / 255，夹在 0..1；本招强度项的共同读数来源，也用于表现强度。 */
        bond: percent(
            F.individual("friendship", text("worldcombat.skill.return.value.friendship")).div(255).clamp(0, 1).round(3),
            "羁绊比例", "亲密度越高这个值越大；它同时放大这一记的威力、冲程与画面上金色誓约的亮度。"),
        /** 冲程：基础 2.8 格，速度每比 55 多 1 加 0.02（夹 −0.3..+1.4），受托 ×1.2；夹在 2.2..4.8。它同时是实际射程来源。 */
        charge: formula(
            F.base(2.8).plus(F.stat("speed").minus(55).times(0.02).clamp(-0.3, 1.4))
                .times(F.when(F.pref("devoted", text("worldcombat.skill.return.preference.devoted")), F.const(1.2), F.const(1)))
                .clamp(2.2, 4.8).round(2),
            "冲程", {
                unit: "格",
                description: "从起步到撞上的总位移；腿快的个体冲得更远，受托式把这一段拉长。"
            }),
        /** 冲锋速度：基础 0.7 格/刻，速度每比 55 多 1 加 0.004（夹 −0.12..+0.35）；夹在 0.5..1.25。 */
        runSpeed: formula(
            F.base(0.7).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.12, 0.35)).clamp(0.5, 1.25).round(2),
            "冲锋速度", {
                unit: "格/刻",
                description: "冲锋时每刻前进的距离；这一记要贴上去才撞得实。"
            }),
        /** 越过距离：基础 0.35 格，速度每比 55 多 1 加 0.008（夹 −0.1..+0.5），体重每比 50 重 1 加 0.0015（夹 −0.05..+0.35），受托 ×1.6；夹在 0.12..1.6。 */
        carry: formula(
            F.base(0.35).plus(F.stat("speed").minus(55).times(0.008).clamp(-0.1, 0.5))
                .plus(F.body("weight").minus(50).times(0.0015).clamp(-0.05, 0.35))
                .times(F.when(F.pref("devoted", text("worldcombat.skill.return.preference.devoted")), F.const(1.6), F.const(1)))
                .clamp(0.12, 1.6).round(2),
            "越过距离", {
                unit: "格",
                description: "撞实后顺势从对手身侧越过的距离；受托式越得远，可以借它换位。"
            }),
        /** 顶开距离：基础 0.3 格，体重每比 50 重 1 加 0.002（夹 −0.06..+0.6）；夹在 0.1..0.9。 */
        push: formula(
            F.base(0.3).plus(F.body("weight").minus(50).times(0.002).clamp(-0.06, 0.6)).clamp(0.1, 0.9).round(2),
            "顶开距离", {
                unit: "格",
                description: "撞实后把目标沿冲锋方向推开多远；越重推得越远。"
            }),
        /** 判定半径：基础 0.42 格，碰撞箱每比 1.4 高 1 格加 0.13；夹在 0.3..0.8。 */
        collisionRadius: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.13)).clamp(0.3, 0.8).round(2),
            "判定半径", {
                unit: "格",
                description: "冲撞的横向判定半径；身板越大判定越宽。"
            }),
        traceAhead: hidden(1.3),
        minimumMove: hidden(0.05)
    });

    defineDamage("return", "power", { defenceCoefficient: 0.005 }, { contact: true });

    describe("return", [
        { key: "description.0", values: ["power", "bond"] },
        { key: "description.1", values: ["charge", "runSpeed", "collisionRadius"] },
        { key: "description.2", values: ["carry", "push"] },
        { key: "devoted.on", values: [], when: function (context) { return read(context.detail.values, ["devoted"]) === true; } },
        { key: "devoted.off", values: [], when: function (context) { return read(context.detail.values, ["devoted"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
