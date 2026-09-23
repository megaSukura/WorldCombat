/**
 * 拍击 / pound 的参数与伤害段。
 *
 * 原生事实：Normal／物理／威力 40／命中 100／PP 35／优先度 0／接触，无追加效果（Cobblemon 1.8，82 位学习者）。
 * 描述「使用长长的尾巴或手等拍打对手进行攻击」。
 *
 * 翻译：把「用前肢或尾巴拍一下」翻成**抬手就扫的一记短扇面**——不蓄势、不冲步，拍面覆盖身前一段扇形，
 * 站在扇面里的非友方各挨一拍、各被拍开一点。它全族最便宜：没有起手、收招极短、冷却最短，
 * 代价是单发最低、扇面很浅，只有贴身并排的目标才一起吃到。
 *
 * 与同族分开（打击对的两招，都不留状态）：
 *   摔打 —— 高高扬起再砸下，慢、重、打点会落空；
 *   拍击 —— 抬手即出、扇面扫过，便宜、快、一次拍到几个。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   swat     拍击威力：物攻定掌劲，速度给抬手的利落；重拍式更沉、快拍式更轻。
 *   arc      拍面张角：体宽决定这一巴掌铺多开；重拍式再放开一截。
 *   reach    拍击探距：身高给前肢长度，也是实际射程。
 *   nudge    拍开距离：施法者体重把目标推离一步；重拍式推得更明显。
 *   crumble  碎屑数量：物攻换算，表现按它发射。
 *   tempo／aftercast／recharge：速度定节奏，等级让冷却回得更快；快拍式没有起手。
 *
 * 配置 `heavy`（重拍式，默认关）双向取舍：开＝拍得更重、扇面更宽、能拍开一步，但多出起手与更长的冷却；
 * 关（快拍式）＝瞬发、冷却最短、随时能拍，但单发最低、不推人。两向各有局面（贴身缠斗 vs 扫小目标）。
 *
 * 伤害段 `swat` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("pound", {
        /** 拍击威力：40 + 物攻偏移[−12,34] + 速度偏移[−3,9]；重拍 ×1.12 / 快拍 ×0.92；夹 30..112。 */
        swat: formula(
            F.base(40)
                .plus(F.stat("attack").minus(50).times(0.34).clamp(-12, 34))
                .plus(F.stat("speed").minus(55).times(0.09).clamp(-3, 9))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.pound.preference.heavy")), F.const(1.12), F.const(0.92)))
                .clamp(30, 112).round(1),
            "拍击威力", {
                unit: "威力",
                description: "这一巴掌拍到一下的基础威力；物攻定掌劲、速度让抬手更利落。重拍式更沉，快拍式更轻。对手防御、相性与暴击在命中时另算。"
            }),
        /** 拍面张角：96 + 体宽偏移[−14,42] + 重拍 +30 / 快拍 +0；夹 70..172 度。 */
        arc: formula(
            F.base(96).plus(F.body("width").minus(0.9).times(40).clamp(-14, 42))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.pound.preference.heavy")), F.const(30), F.const(0)))
                .clamp(70, 172).round(0),
            "拍面张角", {
                unit: "度",
                description: "一巴掌在身前铺开多大的扇面；身板越宽铺得越开，重拍式再放开一截。画面里那道扇形就是判定范围，站到侧面就拍不到。"
            }),
        /** 拍击探距：1.75 + 身高偏移[−0.18,0.6] + 重拍 +0.25；夹 1.5..2.6 格。 */
        reach: formula(
            F.base(1.75).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.18, 0.6))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.pound.preference.heavy")), F.const(0.25), F.const(0)))
                .clamp(1.5, 2.6).round(2),
            "拍击探距", {
                unit: "格",
                description: "前肢或尾巴能够到的距离；身高给臂展长度，也是本招的实际射程来源。"
            }),
        /** 拍开距离：0.12 + 体重偏移[0,0.3]；重拍 ×1.8；夹 0.08..0.7 格。 */
        nudge: formula(
            F.base(0.12).plus(F.body("weight").minus(50).times(0.0016).clamp(0, 0.3))
                .times(F.when(F.pref("heavy", text("worldcombat.skill.pound.preference.heavy")), F.const(1.8), F.const(1)))
                .clamp(0.08, 0.7).round(2),
            "拍开距离", {
                unit: "格",
                description: "拍中后把目标推离的一小步；越重推得越明显，重拍式推得更远。快拍式几乎只原地晃一下。"
            }),
        /** 碎屑数量：14 + 物攻偏移[−3,10]；夹 10..30 个。 */
        crumble: formula(
            F.base(14).plus(F.stat("attack").minus(50).times(0.10).clamp(-3, 10)).clamp(10, 30).round(0),
            "碎屑数量", {
                unit: "个",
                description: "每一拍命中处崩出的细屑数量，由物攻换算；表现按它发射，画面里的数量与机制一致。"
            }),
        /** 起手：快拍 0；重拍 6 − 速度偏移[−1,2]；夹 3..9 刻。 */
        tempo: seconds(
            F.when(F.pref("heavy", text("worldcombat.skill.pound.preference.heavy")),
                F.base(6).minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2)).clamp(3, 9),
                F.const(0)),
            "起手", "把掌抬起来的时间；快拍式抬手即出（0），重拍式要多停一拍。"),
        /** 收招：3 − 速度偏移[−1,1.5] + 重拍 +3；夹 1..9 刻。 */
        aftercast: seconds(
            F.base(3).minus(F.stat("speed").minus(55).times(0.012).clamp(-1, 1.5))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.pound.preference.heavy")), F.const(3), F.const(0)))
                .clamp(1, 9).round(0),
            "收招", "拍完把手收回的时间；快拍式几乎立刻能再动，重拍式要多收一拍。"),
        /** 冷却：16 − 速度偏移[−3,5] − 等级(≥15)偏移[0,4] + 重拍 +8；夹 8..30 刻。 */
        recharge: seconds(
            F.base(16).minus(F.stat("speed").minus(55).times(0.05).clamp(-3, 5))
                .minus(F.level().minus(15).times(0.04).clamp(0, 4))
                .plus(F.when(F.pref("heavy", text("worldcombat.skill.pound.preference.heavy")), F.const(8), F.const(0)))
                .clamp(8, 30).round(0),
            "冷却", "两巴掌之间的等待；这是全族最短的冷却，快拍式回得尤其快，重拍式要缓一缓。")
    });

    stages("pound", [
        { level: 20, values: { swat: 48 } },
        { level: 36, values: { swat: 56, arc: 108 } }
    ]);

    defineDamage("pound", "swat", {}, { contact: true });

    describe("pound", [
        { key: "description.0", values: ["swat","arc","reach"] },
        { key: "description.1", values: ["nudge"] },
        { key: "heavy.on", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) === true; } },
        { key: "heavy.off", values: [], when: function (context) { return read(context.detail.values, ["heavy"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.swat"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.swat", "tier.1.arc"] }
    ]);
}
