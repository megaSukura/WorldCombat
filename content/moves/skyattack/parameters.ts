/**
 * 神鸟猛击 / skyattack 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Flying／物理／威力 140／命中 90／PP 5／critRatio 2／30% 使目标畏缩／
 *   第 2 回合才攻击（charge，一回合蓄势）／带 distance 标记、能打到飞在空中的对手／不接触；62 位学习者。
 *
 * 翻译：把「第 2 回合攻击」落成**先在空中收光蓄一整拍，再垂直俯冲砸向一个点**的两幕——
 *   蓄势时施法者停在原地、周身聚起白光（对手看得见，可以在这段时间走开或打断）；
 *   蓄满后腾到 `altitude` 高度，对准目标所在的那一点笔直坠下；坠得越高威力越大，命中给重击并按
 *   `flinchChance` 使目标畏缩。它不接触、不反伤，打的是「从上方落下来」这件事。
 *
 * 与同族分开：勇鸟猛攻是贴地水平俯冲、穿过目标并反震自己；神鸟猛击是**蓄一拍后从高空垂直砸下**，
 *   不反伤，且蓄势那段是它独有的、可被读出来的破绽。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   plunge       坠落威力：物攻定重击，速度把俯冲动量压进去；高空式再抬一档。
 *   charge       蓄势拍：速度越快蓄得越短；高空式要蓄更久。
 *   altitude     蓄势高度：速度与等级决定能爬多高，高空式 ×1.3；也是本招射程基准。
 *   descend      坠落速度：速度决定每刻下落多少。
 *   impactRadius 落点半径：碰撞箱高度与宽度决定这一砸覆盖多大。
 *   flinchChance 畏缩几率：物攻派生。
 *   flinchTicks  畏缩持续：速度派生。
 *   shock        冲击环粒子数：物攻派生，表现按它发射。
 *   aftercast/recharge 时序：速度决定收招与冷却；高空式更慢。
 * 配置 highDive（高空式）双向取舍：开启＝爬得更高、坠得更狠，但蓄势与冷却更久——用更长的破绽换更重的一击；
 * 关闭（低空式）＝更快起手、更安全，威力与高度收一档。两个方向各有适用局面。
 *
 * 伤害段 plunge：这次坠落随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("skyattack", {
        /** 坠落威力：基础 126，物攻每比 70 多 1 加 0.5（夹 -18..34），速度每比 60 快 1 加 0.22（夹 -8..20）；高空 ×1.12；夹 90..200。 */
        plunge: formula(
            F.base(126).plus(F.stat("attack").minus(70).times(0.5).clamp(-18, 34))
                .plus(F.stat("speed").minus(60).times(0.22).clamp(-8, 20))
                .times(F.when(F.pref("highDive", text("worldcombat.skill.skyattack.preference.highDive")), F.const(1.12), F.const(1)))
                .clamp(90, 200).round(1),
            "坠落威力", {
                unit: "威力",
                description: "从高空砸实这一下的基础威力；物攻越重、下落越快越狠，高空式再抬一档。对手防御、相性与暴击在命中时另算。"
            }),
        /** 蓄势拍：基础 26 刻，速度每比 60 快 1 减 0.08（夹 -6..10），高空式 +6；夹 12..40。 */
        charge: seconds(
            F.base(26).minus(F.stat("speed").minus(60).times(0.08).clamp(-6, 10))
                .plus(F.when(F.pref("highDive", text("worldcombat.skill.skyattack.preference.highDive")), F.const(6), F.const(0)))
                .clamp(12, 40).round(0),
            "蓄势拍", "停在原地收光、爬高之前的蓄势时间；速度越快越短，高空式要蓄更久——这段是它明摆着的破绽。"),
        /** 蓄势高度：基础 5.0 格，速度每比 60 快 1 加 0.03（夹 -1.2..2.4），等级每比 30 高 1 加 0.03（夹 0..1.2）；高空 ×1.3；夹 3.0..9.0。 */
        altitude: formula(
            F.base(5.0).plus(F.stat("speed").minus(60).times(0.03).clamp(-1.2, 2.4))
                .plus(F.level().minus(30).times(0.03).clamp(0, 1.2))
                .times(F.when(F.pref("highDive", text("worldcombat.skill.skyattack.preference.highDive")), F.const(1.3), F.const(1)))
                .clamp(3.0, 9.0).round(2),
            "蓄势高度", {
                unit: "格",
                description: "蓄满后爬升到目标上方多高再开始坠落；速度越快、等级越高爬得越高，高空式 ×1.3。它也是本招射程的基准。"
            }),
        /** 坠落速度：基础 1.1 格/刻，速度每比 60 快 1 加 0.01（夹 -0.3..0.6）；夹 0.8..1.8。 */
        descend: formula(
            F.base(1.1).plus(F.stat("speed").minus(60).times(0.01).clamp(-0.3, 0.6)).clamp(0.8, 1.8).round(2),
            "坠落速度", {
                unit: "格/刻",
                description: "坠落时每刻下落多少；越快越难被走位让开，也越快落地。"
            }),
        /** 落点半径：基础 1.1 格，高度每比 1.4 高 1 加 0.2（夹 -0.15..0.6），体宽每比 0.9 宽 1 加 0.25（夹 -0.1..0.4）；夹 0.8..2.0。 */
        impactRadius: formula(
            F.base(1.1).plus(F.body("height").minus(1.4).times(0.2).clamp(-0.15, 0.6))
                .plus(F.body("width").minus(0.9).times(0.25).clamp(-0.1, 0.4))
                .clamp(0.8, 2.0).round(2),
            "落点半径", {
                unit: "格",
                description: "砸到落点时整个身架扫过多大范围；身板越大砸得越宽，越容易压到旁边的人。"
            }),
        /** 畏缩几率：基础 0.30，物攻每比 70 多 1 加 0.0018（夹 -0.08..0.2）；夹 0.18..0.55。 */
        flinchChance: percent(
            F.base(0.30).plus(F.stat("attack").minus(70).times(0.0018).clamp(-0.08, 0.2)).clamp(0.18, 0.55),
            "畏缩几率", "砸中后使目标畏缩的概率；物攻越重越容易把对手砸懵。"),
        /** 畏缩持续：基础 16 刻，速度每比 60 快 1 加 0.08（夹 -3..8）；夹 10..30。 */
        flinchTicks: seconds(
            F.base(16).plus(F.stat("speed").minus(60).times(0.08).clamp(-3, 8)).clamp(10, 30).round(0),
            "畏缩持续", "目标被砸懵后停手的时长；速度越快带起的冲击越短促。"),
        /** 冲击环粒子数：基础 24，物攻每比 70 多 1 加 0.3（夹 -8..20）；夹 16..60。 */
        shock: formula(
            F.base(24).plus(F.stat("attack").minus(70).times(0.3).clamp(-8, 20)).clamp(16, 60).round(0),
            "冲击环粒子数", {
                unit: "个",
                description: "落地时荡开的冲击环粒子数量，随物攻增长；表现按它发射，画面里的数量与机制一致。"
            }),
        /** 收招：基础 12 刻，速度每比 60 快 1 减 0.03（夹 -3..4），高空式 +3；夹 7..20。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 4))
                .plus(F.when(F.pref("highDive", text("worldcombat.skill.skyattack.preference.highDive")), F.const(3), F.const(0)))
                .clamp(7, 20).round(0),
            "收招", "落地站稳的收势；高空式落得更重、回得更慢。"),
        /** 冷却：基础 60 刻，速度每比 60 快 1 减 0.06（夹 -6..10），高空式 +12；夹 38..92。 */
        recharge: seconds(
            F.base(60).minus(F.stat("speed").minus(60).times(0.06).clamp(-6, 10))
                .plus(F.when(F.pref("highDive", text("worldcombat.skill.skyattack.preference.highDive")), F.const(12), F.const(0)))
                .clamp(38, 92).round(0),
            "冷却", "再次蓄势起飞之间的间隔；速度越快回得越快，高空式蓄得更久。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.02)
    });

    stages("skyattack", [
        { level: 40, values: { plunge: 150 } },
        { level: 58, values: { plunge: 162, flinchChance: 0.40 } }
    ]);

    defineDamage("skyattack", "plunge", { defenceCoefficient: 0.0044,
        rationale: "从上方整身砸下来的动量比平推更透护甲，让速度差在伤害上更明显。" }, { contact: false });

    describe("skyattack", [
        { key: "description.0", values: ["plunge", "altitude", "descend"] },
        { key: "description.1", values: ["charge", "impactRadius"] },
        { key: "description.2", values: ["flinchChance", "flinchTicks"] },
        { key: "highDive.on", values: [], when: function (context) { return read(context.detail.values, ["highDive"]) === true; } },
        { key: "highDive.off", values: [], when: function (context) { return read(context.detail.values, ["highDive"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.plunge"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.plunge", "tier.1.flinchChance"] }
    ]);
}
