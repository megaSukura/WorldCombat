/**
 * 撞击 / tackle 的参数与伤害段。
 *
 * 原生事实：Normal、物理、威力 40、命中 100、PP 35、接触、无次要效果（Cobblemon 1.8，383 位学习者）。
 * 翻译：一记最朴素的助跑冲撞——跑起来，把整个身体撞上去，然后顺着势头从对方身侧滑过去。
 * **势（速度×体重）是本招的主角**：威力、助跑距离、冲撞速度与穿过距离都随速度与体重走，攻击给出撞击的狠度；
 * 等级只给一点上限。它是全家最便宜、最不用赌的一招：短冷却、无副作用，代价是单发不高、撞空就冲过头。
 * 配置 runUp（助跑式）把助跑与穿过距离拉长换取更高的收招与冷却；贴身式相反。
 *
 * 伤害段名 power：这一撞随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("tackle", {
        /** 撞击威力：攻击每比 50 多 1 加 0.32（上限 +34），速度每比 55 多 1 加 0.12（上限 +14），体重每比 50 多 1 加 0.06（上限 +12）；助跑 ×1.06、贴身 ×0.97；夹在 28..108。 */
        power: formula(
            F.base(40).plus(F.stat("attack").minus(50).times(0.32).clamp(-12, 34))
                .plus(F.stat("speed").minus(55).times(0.12).clamp(-5, 14))
                .plus(F.body("weight").minus(50).times(0.06).clamp(-2, 12))
                .times(F.when(F.pref("runUp", text("worldcombat.skill.tackle.preference.runUp")), F.const(1.06), F.const(0.97)))
                .clamp(28, 108).round(1),
            "撞击威力", {
                unit: "威力",
                description: "整个身体撞上去的基础威力；攻击给出狠度，速度与体重把这一下带得更沉。助跑式略微加重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 助跑距离：基础 3.2 格，速度每比 55 多 1 加 0.02（上限 +1.6）；助跑 ×1.15、贴身 ×0.95；夹在 2.4..5.4。 */
        charge: formula(
            F.base(3.2).plus(F.stat("speed").minus(55).times(0.02).clamp(-0.4, 1.6))
                .times(F.when(F.pref("runUp", text("worldcombat.skill.tackle.preference.runUp")), F.const(1.15), F.const(0.95)))
                .clamp(2.4, 5.4).round(2),
            "助跑距离", {
                unit: "格",
                description: "从起步到撞上的总位移；驱动目标接受范围。腿快的个体跑得更远。"
            }),
        /** 冲撞速度：基础 0.55 格/刻，速度每比 55 多 1 加 0.005（上限 +0.35）；助跑 ×0.95、贴身 ×1.05；夹在 0.4..1.05。 */
        runSpeed: formula(
            F.base(0.55).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.12, 0.35))
                .times(F.when(F.pref("runUp", text("worldcombat.skill.tackle.preference.runUp")), F.const(0.95), F.const(1.05)))
                .clamp(0.4, 1.05).round(2),
            "冲撞速度", {
                unit: "格/刻",
                description: "助跑时每刻前进的距离；贴身式起得更快，助跑式起步稍缓但势更足。"
            }),
        /** 穿过距离：基础 0.6 格，速度每比 55 多 1 加 0.012（上限 +0.7），体重每比 50 多 1 加 0.002（上限 +0.4）；助跑 ×1.2、贴身 ×0.8；夹在 0.2..1.8。 */
        carry: formula(
            F.base(0.6).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.2, 0.7))
                .plus(F.body("weight").minus(50).times(0.002).clamp(-0.1, 0.4))
                .times(F.when(F.pref("runUp", text("worldcombat.skill.tackle.preference.runUp")), F.const(1.2), F.const(0.8)))
                .clamp(0.2, 1.8).round(2),
            "穿过距离", {
                unit: "格",
                description: "撞实后顺着冲势从对方身侧滑过的距离；撞空则一路跑到助跑尽头，位置留得更靠前。"
            }),
        /** 顶开距离：基础 0.3 格，体重每比 50 多 1 加 0.002（上限 +0.6）；夹在 0.12..0.9。 */
        push: formula(
            F.base(0.3).plus(F.body("weight").minus(50).times(0.002).clamp(-0.08, 0.6)).clamp(0.12, 0.9).round(2),
            "顶开距离", {
                unit: "格",
                description: "撞实后把目标沿冲撞方向推开多远；越重推得越远。"
            }),
        /** 判定半径：基础 0.42 格，碰撞箱每比 1.4 高 1 格加 0.14；夹在 0.3..0.8。 */
        collisionRadius: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.14)).clamp(0.3, 0.8).round(2),
            "判定半径", {
                unit: "格",
                description: "撞上活体的横向判定半径；身板越大判定越宽。"
            }),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    stages("tackle", [
        { level: 20, values: { power: 54 } },
        { level: 38, values: { power: 64, charge: 3.8 } }
    ]);

    defineDamage("tackle", "power", { defenceCoefficient: 0.005 }, { contact: true });

    describe("tackle", [
        { key: "description.0", values: ["power", "collisionRadius"] },
        { key: "description.1", values: ["charge", "runSpeed", "carry"] },
        { key: "description.2", values: ["push"] },
        { key: "runUp.on", values: [], when: function (context) { return read(context.detail.values, ["runUp"]) === true; } },
        { key: "runUp.off", values: [], when: function (context) { return read(context.detail.values, ["runUp"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.power"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.power", "tier.1.charge"] }
    ]);
}
