/**
 * 意念头锤 / zenheadbutt 的参数与伤害段。
 *
 * 原生事实：Psychic／物理／威力 80／命中 90／PP 15／接触／20% 畏缩（Cobblemon 1.8，281 位学习者）。
 * 翻译：把“将思念的力量集中在前额进行攻击”落成一次**先锁后撞的制导冲刺**——前额聚起念力、在目标身上
 * 留下一个锁定光环，然后低头扑出去，冲刺每一刻都朝锁定的方向拐弯去追。命中率 90 落成“拐弯有上限”：
 * 直线跑不掉，但急折或绕背能甩开制导，它就会沿着最后的方向冲空。
 *
 * 与同族分开：头锤是笔直、便宜、连续压制的入门款；铁头是短程重砸；双刃头锤自损。只有意念头锤会追人，
 * 且追的能力来自**特攻**（念力），撞击的狠度来自物攻——两套数据写在不同的参数上，两只精灵放同一招，
 * 拐弯的圈明显不同大。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   smash        念力头撞威力 80 + 物攻偏移 + 特攻偏移 + 体重偏移；制导式 ×1.08。
 *   lockRange    锁定距离 10 + 特攻偏移 + 等级偏移；驱动实际射程。
 *   drive        冲刺距离 4.2 + 速度偏移 + 特攻偏移；制导式 ×1.15。
 *   cruise       冲刺速度 0.7 + 速度偏移；制导式起步稍缓。
 *   turnRate     每刻最大转向 12° + 特攻偏移；制导式 ×1.4（这是“追得上追不上”的那条）。
 *   collisionRadius 头面判定 0.48 + 身高偏移。
 *   shove        顶开距离 0.4 + 物攻偏移。
 *   flinchChance 撞懵几率 0.18 + 特攻偏移（原生 20%）。
 *   flinchTicks  撞懵持续 14 刻。
 *   lockTicks    锁定印记停留 10 刻 + 特攻偏移（表现用，读同一条机制值）。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却，制导式额外加长。
 *
 * 配置 `guided`（制导式）双向取舍：开启＝转向更紧、冲得更远，但起步更慢、起手与冷却更久；
 * 关闭＝贴身直撞，出手快、冷却短，但拐不过弯。两个方向各有适用局面（追逃 vs 缠斗）。
 *
 * 伤害段 `smash` 与参数同名，走共享换算；接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    actionParameters.define("zenheadbutt", {
        /** 念力头撞威力：攻击每比 50 多 1 加 0.26（上限 +30），特攻每比 50 多 1 加 0.16（上限 +22），
         *  体重每比 50 多 1 加 0.03（上限 +8）；制导 ×1.08 / 直撞 ×0.98；夹在 40..135。 */
        smash: formula(
            F.base(80).plus(F.stat("attack").minus(50).times(0.26).clamp(-12, 30))
                .plus(F.stat("specialAttack").minus(50).times(0.16).clamp(-10, 22))
                .plus(F.body("weight").minus(50).times(0.03).clamp(-2, 8))
                .times(F.when(F.pref("guided", text("worldcombat.skill.zenheadbutt.preference.guided")), F.const(1.08), F.const(0.98)))
                .clamp(40, 135).round(1),
            "念力头撞威力", {
                unit: "威力",
                description: "带着念力撞上去这一下的威力；物攻给出身体的狠度，特攻给出聚在额前的那份力量。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲刺距离：基础 5.5 格，速度每比 55 快 1 加 0.02（上限 +1.6），特攻每比 50 多 1 加 0.012（上限 +0.8）；
         *  制导 ×1.15 / 直撞 ×0.92；夹在 3.5..8.0。它加 0.6 就是本招的实际射程。 */
        drive: formula(
            F.base(5.5).plus(F.stat("speed").minus(55).times(0.02).clamp(-0.6, 1.6))
                .plus(F.stat("specialAttack").minus(50).times(0.012).clamp(-0.4, 0.8))
                .times(F.when(F.pref("guided", text("worldcombat.skill.zenheadbutt.preference.guided")), F.const(1.15), F.const(0.92)))
                .clamp(3.5, 8.0).round(2),
            "冲刺距离", {
                unit: "格",
                description: "锁定之后一路向前冲的总位移；它加半格多就是本招的实际射程。制导式冲得更远，也更难被短距离绕开。"
            }),
        /** 念力牵引：基础 10 格，特攻每比 50 多 1 加 0.05（上限 +3.5），等级每 1 级加 0.04（上限 +2）；夹在 7..15。 */
        lockRange: formula(
            F.base(10).plus(F.stat("specialAttack").minus(50).times(0.05).clamp(0, 3.5))
                .plus(F.level().minus(25).times(0.04).clamp(0, 2)).clamp(7, 15).round(2),
            "念力牵引", {
                unit: "格",
                description: "念力能牵引多远的目标：冲刺途中目标若被拉到比这更远，制导就断开，这一记沿最后方向冲出去。它不是射程，只是追得动追不动的那条线。"
            }),
        /** 冲刺速度：基础 0.7 格/刻，速度每比 55 快 1 加 0.006（上限 +0.45）；制导 ×0.94 / 直撞 ×1.05；夹在 0.5..1.25。 */
        cruise: formula(
            F.base(0.7).plus(F.stat("speed").minus(55).times(0.006).clamp(-0.16, 0.45))
                .times(F.when(F.pref("guided", text("worldcombat.skill.zenheadbutt.preference.guided")), F.const(0.94), F.const(1.05)))
                .clamp(0.5, 1.25).round(2),
            "冲刺速度", {
                unit: "格/刻",
                description: "冲刺时每刻前进的距离；直撞式起得更快，制导式略缓但一边走一边咬住目标。"
            }),
        /** 每刻最大转向：基础 12°，特攻每比 50 多 1 加 0.16°（上限 +12°）；制导 ×1.4 / 直撞 ×0.7；夹在 6..34。 */
        turnRate: formula(
            F.base(12).plus(F.stat("specialAttack").minus(50).times(0.16).clamp(0, 12))
                .times(F.when(F.pref("guided", text("worldcombat.skill.zenheadbutt.preference.guided")), F.const(1.4), F.const(0.7)))
                .clamp(6, 34).round(1),
            "每刻转向", {
                unit: "度/刻",
                description: "每一刻最多朝目标方向拐多少度；这个数越大越咬得住直线逃跑的目标，越小越容易被急折甩开。特攻决定它，制导式再放大。"
            }),
        /** 头面判定：基础 0.48 格，碰撞箱每比 1.4 高 1 格加 0.14；夹在 0.34..0.82。 */
        collisionRadius: formula(
            F.base(0.48).plus(F.body("height").minus(1.4).times(0.14).clamp(-0.08, 0.3)).clamp(0.34, 0.82).round(2),
            "头面判定", {
                unit: "格",
                description: "这一头扫过的横向判定半径；脑袋越大扫得越宽。"
            }),
        /** 顶开距离：基础 0.4 格，物攻每比 50 多 1 加 0.0018（上限 +0.5）；夹在 0.18..1.1。 */
        shove: formula(
            F.base(0.4).plus(F.stat("attack").minus(50).times(0.0018).clamp(-0.05, 0.5)).clamp(0.18, 1.1).round(2),
            "顶开距离", {
                unit: "格",
                description: "撞实后把目标沿最后冲刺方向顶开多远；物攻越高推得越远。"
            }),
        /** 撞懵几率：基础 0.18，特攻每比 50 多 1 加 0.001（上限 +0.08）；夹在 0.1..0.32。 */
        flinchChance: percent(
            F.base(0.18).plus(F.stat("specialAttack").minus(50).times(0.001).clamp(-0.03, 0.08)).clamp(0.1, 0.32),
            "撞懵几率", "撞实时的畏缩几率；额前的念力越强，撞完越容易让人一滞。"),
        flinchTicks: ticks(14, "撞懵持续", "被撞懵的人在这段时间内无法开始新动作；伤害阶段不受影响，仍可被打。"),
        /** 锁定印记：基础 10 刻，特攻每比 50 多 1 加 0.1 刻；夹在 6..20。 */
        lockTicks: seconds(
            F.base(10).plus(F.stat("specialAttack").minus(50).times(0.1).clamp(-2, 6)).clamp(6, 20).round(0),
            "锁定印记", "念力在目标身上停留多久；印记越久，画面里那道锁定环越明显。"),
        /** 起手：基础 9 刻，速度每比 55 快 1 减 0.02 刻；制导 +4；夹在 6..18。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.02).clamp(-3, 3))
                .plus(F.when(F.pref("guided", text("worldcombat.skill.zenheadbutt.preference.guided")), F.const(4), F.const(0)))
                .clamp(6, 18).round(0),
            "起手", "聚念、锁定到能撞出去的时间；速度越快越短，制导式要先把锁定咬稳。"),
        /** 收招：基础 10 刻，速度每比 55 快 1 减 0.02 刻；制导 +2；夹在 5..16。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(55).times(0.02).clamp(-3, 3))
                .plus(F.when(F.pref("guided", text("worldcombat.skill.zenheadbutt.preference.guided")), F.const(2), F.const(0)))
                .clamp(5, 16).round(0),
            "收招", "撞完稳住念力的收势；速度越快越利落。"),
        /** 冷却：基础 28 刻，速度每比 55 快 1 减 0.05 刻；制导 +6；夹在 18..44。 */
        recharge: seconds(
            F.base(28).minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 6))
                .plus(F.when(F.pref("guided", text("worldcombat.skill.zenheadbutt.preference.guided")), F.const(6), F.const(0)))
                .clamp(18, 44).round(0),
            "冷却", "两次意念头锤之间的等待；比头锤久，直撞式回得更快。"),
        traceAhead: hidden(1.15),
        minimumMove: hidden(0.05)
    });

    stages("zenheadbutt", [
        { level: 30, values: { smash: 88, turnRate: 15 } },
        { level: 48, values: { smash: 96, lockRange: 12, drive: 6.4, turnRate: 19 } }
    ]);

    defineDamage("zenheadbutt", "smash", { defenceCoefficient: 0.005,
        rationale: "标准钝撞；念力只推方向，不改变减伤规则。" }, { contact: true });

    describe("zenheadbutt", [
        { key: "description.0", values: ["smash", "collisionRadius"] },
        { key: "description.1", values: ["drive", "cruise", "lockRange"] },
        { key: "description.2", values: ["turnRate", "shove"] },
        { key: "description.3", values: ["flinchChance","flinchTicks"] },
        { key: "guided.on", values: [], when: function (context) { return read(context.detail.values, ["guided"]) === true; } },
        { key: "guided.off", values: [], when: function (context) { return read(context.detail.values, ["guided"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.smash", "tier.0.turnRate"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.smash", "tier.1.lockRange", "tier.1.drive", "tier.1.turnRate"] }
    ]);
}
