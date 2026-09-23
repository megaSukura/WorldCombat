/**
 * 必杀门牙 / hyperfang —— 参数与伤害段。
 *
 * 原生事实：Normal／物理／威力 80／命中 90／PP 15／接触、咬击（bite）／10% 使目标畏缩
 * （Cobblemon 1.8，11 位学习者）。
 *
 * 翻译：把「用锋利门牙牢牢咬住」落成一记**钳住猛甩**——扑上去一口咬死，牙齿不松、身体左右甩，
 * 那一甩把猎物从站位里晃出来（沿侧面小幅位移）并按体重定住一小会儿；甩得够狠就把它甩懵。
 * 它是全族里直接伤害最高的一口，代价是没有持久削弱：不给缺口、不削半，只靠这一口与那一次甩懵。
 *
 * 与同族分开：咬住把人拽近、咬碎研磨压塌护甲、愤怒门牙削掉一半生命、贝壳刃横扫削甲；
 * 只有必杀门牙钳住**钉住并猛甩**，追求单口最重与一次震慑。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   fang         咬合威力 84 + 物攻偏移 + 体重偏移（身沉咬得重）；摆甩式 ×0.9 / 钳咬式 ×1.1。
 *   reach        扑咬距离 2.0 + 速度偏移；也是实际射程来源。
 *   lunge        扑咬速度 0.75 + 速度偏移。
 *   grip         咬合判定 0.45 + 身高偏移。
 *   pinTicks     钉住时长 6 刻 + 体重偏移；摆甩式 +4。
 *   shove        甩出的侧向位移 0.18 + 体重偏移；摆甩式 ×1.4。
 *   flinchChance 畏缩几率 0.10 + 体重偏移 + 等级偏移；摆甩式 ×1.5 / 钳咬式 ×0.8。
 *   flinchTicks  畏缩持续 9 刻；摆甩式 +4。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却，摆甩式更慢更久。
 *
 * 配置 `shake`（摆甩式）双向取舍：开启＝甩得更狠、钉得更久、畏缩几率更高，但单口威力 ×0.9、起手与冷却更长；
 * 关闭＝钳咬式，单口威力 ×1.1、出手更快，但位移、钉住与畏缩都更小。
 *
 * 伤害段 `fang`：咬实那一下，接触与咬击由共享结算按 contact／bite 处理。
 */
namespace PokemonSkills {
    actionParameters.define("hyperfang", {
        /** 咬合威力：基础 84，物攻每比 60 多 1 加 0.30（夹 −14..34），体重每比 60 重 1 加 0.04（夹 −3..16）；
         *  摆甩 ×0.9 / 钳咬 ×1.1；夹在 58..138。 */
        fang: formula(
            F.base(84)
                .plus(F.stat("attack").minus(60).times(0.30).clamp(-14, 34))
                .plus(F.body("weight").minus(60).times(0.04).clamp(-3, 16))
                .times(F.when(F.pref("shake", text("worldcombat.skill.hyperfang.preference.shake")), F.const(0.9), F.const(1.1)))
                .clamp(58, 138).round(1),
            "咬合威力", {
                unit: "威力",
                description: "钳住猛甩那一下的基础威力；物攻与体重一起决定这一口咬得多重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 扑咬距离：基础 2.0 格，速度每比 55 快 1 加 0.013（夹 −0.35..1.0）；夹 1.5..3.2。 */
        reach: formula(
            F.base(2.0).plus(F.stat("speed").minus(55).times(0.013).clamp(-0.35, 1.0)).clamp(1.5, 3.2).round(2),
            "扑咬距离", {
                unit: "格",
                description: "从起步到咬到的总位移，也是本招的实际射程来源；腿快的个体扑得更远。"
            }),
        /** 扑咬速度：基础 0.75 格/刻，速度每比 55 快 1 加 0.005（夹 −0.12..0.3）；夹 0.52..1.12。 */
        lunge: formula(
            F.base(0.75).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.12, 0.3)).clamp(0.52, 1.12).round(2),
            "扑咬速度", {
                unit: "格/刻",
                description: "扑出时每刻前进的距离；它决定这一口多快贴上目标。"
            }),
        /** 咬合判定：基础 0.45 格，碰撞箱每比 1.4 高 1 格加 0.14（夹 −0.08..0.3）；夹 0.33..0.8。 */
        grip: formula(
            F.base(0.45).plus(F.body("height").minus(1.4).times(0.14).clamp(-0.08, 0.3)).clamp(0.33, 0.8).round(2),
            "咬合判定", {
                unit: "格",
                description: "这一口能咬住多大一圈；口部越大的个体咬得越宽。"
            }),
        /** 钉住时长：基础 6 刻，体重每比 60 重 1 加 0.02（夹 −2..12）；摆甩 +4；夹 4..26。 */
        pinTicks: seconds(
            F.base(6).plus(F.body("weight").minus(60).times(0.02).clamp(-2, 12))
                .plus(F.when(F.pref("shake", text("worldcombat.skill.hyperfang.preference.shake")), F.const(4), F.const(0)))
                .clamp(4, 26).round(0),
            "钉住时长", "咬死不放、把目标钉在原地的时长；越重钉得越久，摆甩式再多一会儿。"),
        /** 侧向甩出：基础 0.18 格，体重每比 60 重 1 加 0.0015（夹 −0.05..0.35）；摆甩 ×1.4 / 钳咬 ×0.7；夹 0.08..0.6。 */
        shove: formula(
            F.base(0.18).plus(F.body("weight").minus(60).times(0.0015).clamp(-0.05, 0.35))
                .times(F.when(F.pref("shake", text("worldcombat.skill.hyperfang.preference.shake")), F.const(1.4), F.const(0.7)))
                .clamp(0.08, 0.6).round(2),
            "侧向甩出", {
                unit: "格",
                description: "牙齿钳住后左右猛甩、把目标从站位里晃出的侧向位移；越重甩得越开，摆甩式甩得最狠。"
            }),
        /** 畏缩几率：基础 0.10，体重每比 60 重 1 加 0.0012（夹 −0.04..0.22），等级 30 起每级 +0.0015（夹 −0.02..0.12）；
         *  摆甩 ×1.5 / 钳咬 ×0.8；夹 0.06..0.45。 */
        flinchChance: percent(
            F.base(0.10)
                .plus(F.body("weight").minus(60).times(0.0012).clamp(-0.04, 0.22))
                .plus(F.level().minus(30).times(0.0015).clamp(-0.02, 0.12))
                .times(F.when(F.pref("shake", text("worldcombat.skill.hyperfang.preference.shake")), F.const(1.5), F.const(0.8)))
                .clamp(0.06, 0.45),
            "畏缩几率", "甩中时把目标甩懵、在窗口内无法开始新动作的几率（原生 10%）；越重、等级越高越容易甩懵，摆甩式再抬一档。"),
        /** 畏缩持续：基础 9 刻；摆甩 +4；夹 6..20。 */
        flinchTicks: seconds(
            F.base(9).plus(F.when(F.pref("shake", text("worldcombat.skill.hyperfang.preference.shake")), F.const(4), F.const(0)))
                .clamp(6, 20).round(0),
            "畏缩持续", "被甩懵的人在这段时间内无法开始新动作；伤害阶段不受影响，仍可被打。"),
        /** 起手：基础 5 刻，速度每比 55 快 1 少 0.018（夹 −2..1.5）；摆甩 +2；夹 3..12。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").minus(55).times(0.018).clamp(-2, 1.5))
                .plus(F.when(F.pref("shake", text("worldcombat.skill.hyperfang.preference.shake")), F.const(2), F.const(0)))
                .clamp(3, 12).round(0),
            "起手", "张牙蓄势到能钳住的时间；速度越快越短，摆甩式先摆开身体。"),
        /** 收招：基础 7 刻，速度每比 55 快 1 少 0.015（夹 −2..1.5）；摆甩 +2；夹 3..13。 */
        aftercast: seconds(
            F.base(7).minus(F.stat("speed").minus(55).times(0.015).clamp(-2, 1.5))
                .plus(F.when(F.pref("shake", text("worldcombat.skill.hyperfang.preference.shake")), F.const(2), F.const(0)))
                .clamp(3, 13).round(0),
            "收招", "甩完松口、退开的收势；摆甩式甩得更久，收得更慢。"),
        /** 冷却：基础 18 刻，速度每比 55 快 1 少 0.05（夹 −4..2）；摆甩 +5；夹 11..34。 */
        recharge: seconds(
            F.base(18).minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 2))
                .plus(F.when(F.pref("shake", text("worldcombat.skill.hyperfang.preference.shake")), F.const(5), F.const(0)))
                .clamp(11, 34).round(0),
            "冷却", "两次钳咬之间的等待；摆甩式更久，换来更狠的一次震慑。"),
        traceAhead: hidden(0.9),
        minimumMove: hidden(0.04)
    });

    defineDamage("hyperfang", "fang", {}, { contact: true, bite: true });

    stages("hyperfang", [
        { level: 26, values: { fang: 92 } },
        { level: 44, values: { fang: 102, flinchChance: 0.16 } }
    ]);

    describe("hyperfang", [
        { key: "description.0", values: ["fang"] },
        { key: "description.1", values: ["reach", "lunge", "grip"] },
        { key: "description.2", values: ["pinTicks","shove"] },
        { key: "description.3", values: ["flinchChance","flinchTicks"] },
        { key: "shake.on", values: [], when: function (context) { return read(context.detail.values, ["shake"]) === true; } },
        { key: "shake.off", values: [], when: function (context) { return read(context.detail.values, ["shake"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.fang"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.fang", "tier.1.flinchChance"] }
    ]);
}
