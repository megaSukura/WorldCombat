/**
 * 龙息 / dragonbreath 的参数与伤害段。
 *
 * 原生事实：Dragon、特殊、威力 60、命中 100、PP 20、30% 令对手麻痹（Cobblemon 1.8）。
 * 翻译：把「将强烈的气息吹向对手」做成一道**从嘴里喷出的扇形吐息**：贴地张开、由近及远逐步铺满，
 * 站在锥形里的所有敌人一起被扫到，越远力道越弱。这是本组唯一的范围吐息——前摇是吸气，过程是气流铺开，
 * 收尾留一缕散去的雾气。数据分散：特攻决定伤害、锥长、张角与麻痹概率；身高决定嘴到地面的展开尺度；
 * 等级决定吐息持续与上限。配置 wide（广息式）把锥张得更开但更短更轻，聚焦式相反。
 *
 * 伤害段名 breath：这一口龙息随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("dragonbreath", {
        /** 龙息威力：特攻每比 55 多 1 加 0.4（上限 +42）；广息 ×0.92、聚焦 ×1.1；夹在 36..120。 */
        breath: formula(
            F.base(48).plus(F.stat("specialAttack").minus(55).times(0.4).clamp(-12, 42))
                .times(F.when(F.pref("wide"), F.const(0.92), F.const(1.1)))
                .clamp(36, 120).round(1),
            "龙息威力", {
                unit: "威力",
                description: "本段伤害的基础威力；特攻越强气息越利，聚焦式把力道收在更窄的一束里。对手特防、相性与暴击在命中时另算。"
            }),
        /** 吐息长度：基础 3.0 格加碰撞箱高度 ×0.7，特攻每比 60 多 1 加 0.012（上限 +0.8）；广息 ×0.9、聚焦 ×1.15；夹在 2.6..7.0。 */
        reach: formula(
            F.base(3.0).plus(F.body("height").times(0.7))
                .plus(F.stat("specialAttack").minus(60).times(0.012).clamp(0, 0.8))
                .times(F.when(F.pref("wide"), F.const(0.9), F.const(1.15)))
                .clamp(2.6, 7.0).round(2),
            "吐息长度", {
                unit: "格",
                description: "气息从身前铺到多远；个子高、特攻强的个体喷得更远，聚焦式把气息拉长。"
            }),
        /** 吐息张角：基础 48 度加特攻项（±22 度）；广息 ×1.25、聚焦 ×0.7；夹在 30..110。 */
        arc: formula(
            F.base(48).plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-8, 22))
                .times(F.when(F.pref("wide"), F.const(1.25), F.const(0.7)))
                .clamp(30, 110).round(0),
            "吐息张角", {
                unit: "度",
                description: "扇形吐息张开的总角度；广息式罩住更多人，聚焦式收成一束。"
            }),
        /** 吐息持续：基础 10 刻，等级每比 20 高 1 级加 0.08（上限 +6）；夹在 8..18。 */
        breathTicks: seconds(
            F.base(10).plus(F.level().minus(20).times(0.08).clamp(0, 6)).clamp(8, 18).round(0),
            "吐息持续", "从喷出到铺满整个扇形的时长；等级越高气息越绵长。"),
        /** 麻痹概率：基础 0.16，特攻每比 60 多 1 加 0.0012（上限 +0.2），等级每高 1 级加 0.0015（上限 +0.08）；夹在 0.10..0.46。 */
        numbChance: percent(
            F.base(0.16).plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(0, 0.2))
                .plus(F.level().minus(20).times(0.0015).clamp(0, 0.08))
                .clamp(0.10, 0.46).round(3),
            "麻痹概率", "被这道龙息扫到后陷入麻痹的概率；特攻越强、等级越高，气息里的麻意越重。"),
        maxTargets: hidden(8)
    });

    stages("dragonbreath", [
        { level: 32, values: { breath: 68 } }
    ]);

    defineDamage("dragonbreath", "breath", { defenceCoefficient: 0.0048 });

    describe("dragonbreath", [
        { key: "description.0", values: ["breath"] },
        { key: "description.1", values: ["reach","arc","maxTargets"] },
        { key: "description.2", values: ["numbChance","breathTicks"] }
    ]);
}
