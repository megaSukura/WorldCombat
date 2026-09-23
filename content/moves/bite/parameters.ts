/**
 * 咬住 / bite 的参数与伤害段。
 *
 * 原生事实：Dark／物理／威力 60／命中 100／PP 25／接触／咬合（bite）／30% 畏缩（Cobblemon 1.8，215 位学习者）。
 * 翻译：把“用尖锐的牙咬住对手”落成一记**钩住不松的扑咬**——沿瞄准方向短促扑出，一口咬实后
 * 獠牙钩住皮肉、把目标朝自己**拽近**一步；那一下的刺痛和失衡让它有机会一滞。
 * 它是畏缩家族里最便宜、最快的一式：冷却短、起手短，代价是单发不高、拽近之后彼此更近。
 *
 * 与同族分开：头锤把人顶开、意念头锤会拐弯，虫咬/精神之牙咬的是树果与屏障；
 * **只有咬住把目标拽回自己身前**（`drag` 方向朝向施法者），因此它是连段与留人的起手。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   fang          咬合威力 60 + 物攻偏移 + 速度偏移（快口咬得更实）；死咬式 ×0.90、快咬 ×1.06。
 *   reach         扑出距离 2.0 + 速度偏移；也是实际射程来源。
 *   lunge         扑咬速度 0.72 + 速度偏移。
 *   drag          拽回距离 0.30 + 体重偏移 + 物攻偏移（越重、越有力拽得越远）；死咬式 ×1.6。
 *   grip          獠牙判定 0.40 + 身高偏移。
 *   flinchChance  畏缩几率 0.30 + 速度偏移；死咬式 ×1.18。
 *   flinchTicks   畏缩持续 10 刻，死咬式 +4。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却。
 *
 * 配置 `deep`（死咬式）双向取舍：开启＝咬得更深、拽得更近、畏缩更久更易，但起手更慢、单发略轻、冷却更长；
 * 关闭＝快咬，出手快、单发更高，但拽不回多少。两个方向各有适用局面（留人 vs 抢节奏）。
 *
 * 伤害段 `fang` 与参数同名，走共享换算（原生类别 Physical，Dark 属性）；接触与咬合标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    actionParameters.define("bite", {
        /** 咬合威力：攻击每比 50 多 1 加 0.34（上限 +36），速度每比 55 快 1 加 0.10（上限 +12）；
         *  死咬 ×0.90、快咬 ×1.06；夹在 30..116。 */
        fang: formula(
            F.base(60).plus(F.stat("attack").minus(50).times(0.34).clamp(-14, 36))
                .plus(F.stat("speed").minus(55).times(0.10).clamp(-4, 12))
                .times(F.when(F.pref("deep", text("worldcombat.skill.bite.preference.deep")), F.const(0.90), F.const(1.06)))
                .clamp(30, 116).round(1),
            "咬合威力", {
                unit: "威力",
                description: "獠牙咬合这一下的基础威力；物攻给出咬合力、速度让口齿更快更实。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扑出距离：基础 2.0 格，速度每比 55 快 1 加 0.012（上限 +0.9）；死咬 ×0.88 / 快咬 ×1.05；夹在 1.4..3.2。 */
        reach: formula(
            F.base(2.0).plus(F.stat("speed").minus(55).times(0.012).clamp(-0.3, 0.9))
                .times(F.when(F.pref("deep", text("worldcombat.skill.bite.preference.deep")), F.const(0.88), F.const(1.05)))
                .clamp(1.4, 3.2).round(2),
            "扑出距离", {
                unit: "格",
                description: "从起步到咬到的总位移，也是本招的实际射程来源；腿快的个体扑得更远。死咬式收得更短。"
            }),
        /** 扑咬速度：基础 0.72 格/刻，速度每比 55 快 1 加 0.005（上限 +0.3）；死咬 ×0.90 / 快咬 ×1.08；夹在 0.5..1.1。 */
        lunge: formula(
            F.base(0.72).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.12, 0.3))
                .times(F.when(F.pref("deep", text("worldcombat.skill.bite.preference.deep")), F.const(0.90), F.const(1.08)))
                .clamp(0.5, 1.1).round(2),
            "扑咬速度", {
                unit: "格/刻",
                description: "扑出时每刻前进的距离；快咬式起得更快，死咬式沉一点但咬得更死。"
            }),
        /** 拽回距离：体重每比 50 多 1 加 0.0022（上限 +0.5），物攻每比 50 多 1 加 0.0012（上限 +0.3）；
         *  基础 0.30；死咬 ×1.6 / 快咬 ×0.8；夹在 0.12..1.1。 */
        drag: formula(
            F.base(0.30).plus(F.body("weight").minus(50).times(0.0022).clamp(-0.06, 0.5))
                .plus(F.stat("attack").minus(50).times(0.0012).clamp(-0.05, 0.3))
                .times(F.when(F.pref("deep", text("worldcombat.skill.bite.preference.deep")), F.const(1.6), F.const(0.8)))
                .clamp(0.12, 1.1).round(2),
            "拽回距离", {
                unit: "格",
                description: "咬实后把目标朝施法者拽近多远；越重、物攻越高拽得越远。死咬式拽得最狠——这是它把人留在身前的代价。"
            }),
        /** 獠牙判定：基础 0.40 格，碰撞箱每比 1.4 高 1 格加 0.14（上限 +0.28）；夹在 0.3..0.7。 */
        grip: formula(
            F.base(0.40).plus(F.body("height").minus(1.4).times(0.14).clamp(-0.06, 0.28)).clamp(0.3, 0.7).round(2),
            "獠牙判定", {
                unit: "格",
                description: "这一口扫过的横向判定半径；口部越大咬得越宽，越不容易被侧身让开。"
            }),
        /** 畏缩几率：基础 0.30，速度每比 55 快 1 加 0.0011（上限 +0.11）；死咬 ×1.18；夹在 0.16..0.46。 */
        flinchChance: percent(
            F.base(0.30).plus(F.stat("speed").minus(55).times(0.0011).clamp(-0.05, 0.11))
                .times(F.when(F.pref("deep", text("worldcombat.skill.bite.preference.deep")), F.const(1.18), F.const(1))).clamp(0.16, 0.46),
            "畏缩几率", "咬实时的畏缩几率（原生 30%）；速度越快越容易一口把对手咬懵，死咬式再抬一档。"),
        /** 畏缩持续：基础 10 刻，死咬式 +4；夹在 8..20 刻。 */
        flinchTicks: seconds(
            F.base(10).plus(F.when(F.pref("deep", text("worldcombat.skill.bite.preference.deep")), F.const(4), F.const(0))).clamp(8, 20).round(0),
            "畏缩持续", "被咬懵的人在这段时间内无法开始新动作；伤害阶段不受影响，仍可被打。"),
        /** 起手：基础 5 刻，速度每比 55 快 1 减 0.015（下限 −1.5）；死咬 +3；夹在 3..11。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.015).clamp(-2.5, 1.5))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.bite.preference.deep")), F.const(3), F.const(0)))
                .clamp(3, 11).round(0),
            "起手", "压低身子蓄到能扑出去的时间；速度越快越短，死咬式要沉得更久。"),
        /** 收招：基础 6 刻，速度每比 55 快 1 减 0.015（下限 −1.5）；死咬 +2；夹在 3..12。 */
        aftercast: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.015).clamp(-2.5, 1.5))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.bite.preference.deep")), F.const(2), F.const(0)))
                .clamp(3, 12).round(0),
            "收招", "咬完松口、退开半步的收势；死咬式拽得更久，收得更慢。"),
        /** 冷却：基础 14 刻，速度每比 55 快 1 减 0.03（下限 −2）；死咬 +6；夹在 8..26。 */
        recharge: seconds(
            F.base(14).minus(F.stat("speed").minus(55).times(0.03).clamp(-4, 2))
                .plus(F.when(F.pref("deep", text("worldcombat.skill.bite.preference.deep")), F.const(6), F.const(0)))
                .clamp(8, 26).round(0),
            "冷却", "两次咬住之间的等待；它是本组最短的冷却，快咬式回得尤其快。"),
        traceAhead: hidden(0.9),
        minimumMove: hidden(0.04)
    });

    stages("bite", [
        { level: 20, values: { fang: 54 } },
        { level: 38, values: { fang: 66, drag: 0.5, flinchChance: 0.34 } }
    ]);

    defineDamage("bite", "fang", { defenceCoefficient: 0.005,
        rationale: "尖锐獠牙的接触咬合；防御按默认系数减伤。" }, { contact: true, bite: true });

    describe("bite", [
        { key: "description.0", values: ["fang", "grip"] },
        { key: "description.1", values: ["reach","lunge","drag"] },
        { key: "description.2", values: ["flinchChance","flinchTicks"] },
        { key: "deep.on", values: [], when: function (context) { return read(context.detail.values, ["deep"]) === true; } },
        { key: "deep.off", values: [], when: function (context) { return read(context.detail.values, ["deep"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.fang"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.fang", "tier.1.drag", "tier.1.flinchChance"] }
    ]);
}
