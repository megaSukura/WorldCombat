/**
 * 头锤 / headbutt 的参数与伤害段。
 *
 * 原生事实：Normal／物理／威力 70／命中 100／PP 15／接触／30% 畏缩（Cobblemon 1.8，481 位学习者）。
 * 翻译：把“将头伸出，笔直地扑向对手”落成一次**最短最便宜的头撞**——低头沿瞄准方向短促顶出一步，
 * 用整颗头撞上一个活体后立刻收住，撞实的人有几率被顶懵。它是全家的入门款：冷却短、无代价、随时能用，
 * 代价是单发不高、顶空就白伸一下。
 *
 * 与同族分开：铁头更慢更重、把目标砸得最远并掀离地面；意念头锤会制导拐弯；双刃头锤自损。只有头锤是
 * “贴着对手一记接一记”的压力招——**趁对手还在畏缩时再顶一记更狠**（畏缩身份由共享 tag 判定），
 * 所以它越连续越值钱，玩家凭“顶懵之后再顶的那一下更疼”把它认出来。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   smash        头撞威力 70 + 物攻偏移 + 体重偏移；对手正处于畏缩 ×1.25；猛顶式 ×1.10。
 *   lunge        顶出距离 2.0 + 速度偏移 + 体重偏移；猛顶式 ×1.30。
 *   rush         前伸速度 1.00 + 速度偏移；猛顶式起步稍缓。
 *   collisionRadius 头面判定 0.5 + 身高偏移。
 *   shove        顶开距离 0.45 + 体重偏移 + 物攻偏移。
 *   flinchChance 撞懵几率 0.28 + 物攻偏移；猛顶式 ×1.2（原生 30%）。
 *   flinchTicks  撞懵持续 12 刻。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却。
 *
 * 配置 `driving`（猛顶式）双向取舍：开启＝顶得更远、更重、更容易顶懵，但起手更久、起步稍缓、冷却更长；
 * 关闭＝短促快顶，出手快、位置稳。两个方向各有适用局面（追击 vs 缠斗）。
 *
 * 伤害段 `smash` 与参数同名，走共享换算；接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    actionParameters.define("headbutt", {
        /** 头撞威力：攻击每比 50 多 1 加 0.30（上限 +34），体重每比 50 多 1 加 0.05（上限 +12）；
         *  对手畏缩 ×1.25，猛顶 ×1.10 / 快顶 ×0.96；夹在 34..120。 */
        smash: formula(
            F.base(70).plus(F.stat("attack").minus(50).times(0.30).clamp(-14, 34))
                .plus(F.body("weight").minus(50).times(0.05).clamp(-3, 12))
                .times(F.when(F.target("status.flinch"), F.const(1.25), F.const(1)))
                .times(F.when(F.pref("driving", text("worldcombat.skill.headbutt.preference.driving")), F.const(1.10), F.const(0.96)))
                .clamp(34, 120).round(1),
            "头撞威力", {
                unit: "威力",
                description: "低头顶上去这一下能撞出的威力；攻击给出狠度、体重把份量压进去。对手还在畏缩时再顶更疼。对手防御、相性与暴击在命中时另算。"
            }),
        /** 顶出距离：基础 2.0 格，速度每比 55 快 1 加 0.015（上限 +1.2），体重每比 50 多 1 加 0.0015（上限 +0.6）；
         *  猛顶 ×1.30 / 快顶 ×0.92；夹在 1.4..3.0。 */
        lunge: formula(
            F.base(2.0).plus(F.stat("speed").minus(55).times(0.015).clamp(-0.4, 1.2))
                .plus(F.body("weight").minus(50).times(0.0015).clamp(-0.15, 0.6))
                .times(F.when(F.pref("driving", text("worldcombat.skill.headbutt.preference.driving")), F.const(1.30), F.const(0.92)))
                .clamp(1.4, 3.0).round(2),
            "顶出距离", {
                unit: "格",
                description: "从起步到收住的短促前伸，也是本招的实际射程来源；腿快的个体顶得更远。猛顶式拉得更长，也更容易顶过头。"
            }),
        /** 前伸速度：基础 1.00 格/刻，速度每比 55 快 1 加 0.004（上限 +0.35）；猛顶 ×0.94 / 快顶 ×1.06；夹在 0.7..1.5。 */
        rush: formula(
            F.base(1.0).plus(F.stat("speed").minus(55).times(0.004).clamp(-0.12, 0.35))
                .times(F.when(F.pref("driving", text("worldcombat.skill.headbutt.preference.driving")), F.const(0.94), F.const(1.06)))
                .clamp(0.7, 1.5).round(2),
            "前伸速度", {
                unit: "格/刻",
                description: "短伸时每刻前进的距离；快顶式起得更快，猛顶式起步稍缓但势更足。"
            }),
        /** 头面判定：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.15；夹在 0.36..0.85。 */
        collisionRadius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.15).clamp(-0.08, 0.3)).clamp(0.36, 0.85).round(2),
            "头面判定", {
                unit: "格",
                description: "这一头扫过的横向判定半径；脑袋越大扫得越宽，越不容易被侧身让开。"
            }),
        /** 顶开距离：基础 0.45 格，体重每比 50 多 1 加 0.0025（上限 +0.7），物攻每比 50 多 1 加 0.0015（上限 +0.4）；
         *  夹在 0.2..1.5。 */
        shove: formula(
            F.base(0.45).plus(F.body("weight").minus(50).times(0.0025).clamp(-0.1, 0.7))
                .plus(F.stat("attack").minus(50).times(0.0015).clamp(-0.06, 0.4))
                .clamp(0.2, 1.5).round(2),
            "顶开距离", {
                unit: "格",
                description: "撞实后把目标沿前伸方向顶开多远；越重、物攻越高顶得越远。"
            }),
        /** 撞懵几率：基础 0.28，物攻每比 50 多 1 加 0.0011（上限 +0.1）；猛顶 ×1.2；夹在 0.14..0.44。 */
        flinchChance: percent(
            F.base(0.28).plus(F.stat("attack").minus(50).times(0.0011).clamp(-0.05, 0.1))
                .times(F.when(F.pref("driving", text("worldcombat.skill.headbutt.preference.driving")), F.const(1.2), F.const(1))).clamp(0.14, 0.44),
            "撞懵几率", "撞实时的畏缩几率；物攻越高越容易把人顶懵，猛顶式再抬一档。"),
        flinchTicks: ticks(12, "撞懵持续", "被顶懵的人在这段时间内无法开始新动作；伤害阶段不受影响，仍可被打。"),
        /** 起手：基础 5 刻，速度每比 55 快 1 减 0.015 刻；猛顶 +2；夹在 3..10。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.015).clamp(-1.5, 2))
                .plus(F.when(F.pref("driving", text("worldcombat.skill.headbutt.preference.driving")), F.const(2), F.const(0)))
                .clamp(3, 10).round(0),
            "起手", "低头蓄势到能顶出去的时间；速度越快越短，猛顶式要沉得更久。"),
        /** 收招：基础 6 刻，速度每比 55 快 1 减 0.015 刻；猛顶 +2；夹在 3..11。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.015).clamp(-1.5, 2))
                .plus(F.when(F.pref("driving", text("worldcombat.skill.headbutt.preference.driving")), F.const(2), F.const(0)))
                .clamp(3, 11).round(0),
            "收招", "顶完收势的利落程度；速度越快越干脆，猛顶式冲得更远、收得更慢。"),
        /** 冷却：基础 14 刻，速度每比 55 快 1 减 0.03 刻；猛顶 +5；夹在 8..24。 */
        recharge: seconds(
            F.base(14).minus(F.stat("speed").minus(55).times(0.03).clamp(-2.5, 4))
                .plus(F.when(F.pref("driving", text("worldcombat.skill.headbutt.preference.driving")), F.const(5), F.const(0)))
                .clamp(8, 24).round(0),
            "冷却", "两次头锤之间的等待；这是全家最短的冷却，快顶式回得尤其快。"),
        minimumMove: hidden(0.03)
    });

    stages("headbutt", [
        { level: 18, values: { smash: 56 } },
        { level: 38, values: { smash: 66, lunge: 2.6, flinchChance: 0.34 } }
    ]);

    defineDamage("headbutt", "smash", { defenceCoefficient: 0.005,
        rationale: "标准钝撞；头锤不挑护甲，防御按默认系数减伤。" }, { contact: true });

    describe("headbutt", [
        { key: "description.0", values: ["smash","collisionRadius"] },
        { key: "description.1", values: ["lunge", "rush", "shove"] },
        { key: "description.2", values: ["flinchChance","flinchTicks"] },
        { key: "driving.on", values: [], when: function (context) { return read(context.detail.values, ["driving"]) === true; } },
        { key: "driving.off", values: [], when: function (context) { return read(context.detail.values, ["driving"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.smash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.smash", "tier.1.lunge", "tier.1.flinchChance"] }
    ]);
}
