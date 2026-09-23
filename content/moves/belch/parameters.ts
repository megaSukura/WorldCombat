/**
 * 打嗝 / belch 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8 / Showdown）：毒、特殊、威力 120、命中 90、PP 10、单目标、
 *   只有在战斗中吃过树果（ateBerry）才能使出；无次要效果。
 *
 * 翻译：把「如果不吃树果则无法使出」当成这一招的骨架——先咬碎吞下手里那颗树果，再把压不住的一口气
 *   整团喷向前方：一团又短又宽的毒气罩住面前一片，站在气里的人都挨伤、多半中毒，气团再在原地飘一会儿。
 *   树果是这一发的燃料：果没了，招也不成形。这是本组唯一「先付出一样东西再打出」的一招。
 * 与同族分开：
 *   浊雾   —— 细而长的一束毒雾，主要造成中毒；
 *   污泥炸弹 —— 落地插引信的延时爆弹；
 *   打嗝   —— 短而宽的一团、威力高、被树果卡着，吃下去的果子同时也是这一口的代价。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   gas          毒气威力 96 + 特攻偏移 + 等级偏移（特攻越强喷得越重）。
 *   reach        气团长度 3.2 格 + 身高偏移 + 特攻偏移（个子高、气足喷得更远）。
 *   arc          气团张角 74 度 + 特攻偏移（特攻越强气团越开）。
 *   poisonChance 中毒概率 0.28 + 特攻偏移 + 等级偏移（气里的毒越浓越容易中毒）。
 *   poisonTicks  中毒时长 180 刻 + 特攻偏移 + 等级偏移。
 *   hazeTicks    残气时长 70 刻 + 特攻偏移（气团在原地飘多久，纯表现）。
 *   motes        气团粒子量 30 + 特攻偏移（同时驱动画面密度）。
 *   tempo/aftercast/recharge  速度决定咬果、收招与冷却。
 *
 * 配置 acrid（呛辣式）双向取舍：开＝中毒概率 +0.18、中毒时长 ×1.4、残气 ×1.4，代价是威力 ×0.88；
 *   关（烈性）＝威力 ×1.15，中毒概率与残留都低。两向各有局面（留一片毒区 vs 打一记重的）。
 *
 * 伤害段 gas 与参数同名，走共享换算（原始类别 Special）。
 */
namespace PokemonSkills {
    /** 手里那颗树果；不是树果（或无持有物、非宝可梦）时返回 null（没得吃，也就使不出这一招）。 */
    export function belchBerryOf(pokemon: CombatPokemon | null): { key: string; name: string } | null {
        if (!pokemon || typeof pokemon.heldTag !== "function") return null;
        var id = String(pokemon.heldItem());
        if (!id || !pokemon.heldTag("cobblemon:berries")) return null;
        return { key: String(pokemon.heldKey()), name: "item." + id.replace(":", ".") };
    }

    actionParameters.define("belch", {
        /** 毒气威力：96 + 特攻偏移[−18,52] + 等级(≥30)偏移[0,10]；呛辣 ×0.88 / 烈性 ×1.15；夹 60..190。 */
        gas: formula(
            F.base(96)
                .plus(F.stat("specialAttack").minus(60).times(0.38).clamp(-18, 52))
                .plus(F.level().minus(30).times(0.3).clamp(0, 10))
                .times(F.when(F.pref("acrid", text("worldcombat.skill.belch.preference.acrid")), F.const(0.88), F.const(1.15)))
                .clamp(60, 190).round(1),
            "毒气威力", {
                unit: "威力",
                description: "这一口毒气对每个被罩住的人结算的基础威力；特攻越强、等级越高喷得越重。对手特防、相性与暴击在命中时另算。"
            }),
        /** 气团长度：3.2 + 身高偏移[−0.3,1.2] + 特攻偏移[0,0.9]；夹 2.4..6.4。 */
        reach: formula(
            F.base(3.2)
                .plus(F.body("height").minus(1.4).times(0.7).clamp(-0.3, 1.2))
                .plus(F.stat("specialAttack").minus(60).times(0.012).clamp(0, 0.9))
                .clamp(2.4, 6.4).round(2),
            "气团长度", {
                unit: "格",
                description: "毒气从身前喷到多远；个子高、特攻强的个体喷得更远。它也是本招的实际射程。"
            }),
        /** 气团张角：74 + 特攻偏移[−6,18]；夹 44..120。 */
        arc: formula(
            F.base(74).plus(F.stat("specialAttack").minus(60).times(0.18).clamp(-6, 18)).clamp(44, 120).round(0),
            "气团张角", {
                unit: "度",
                description: "毒气张开的总角度；这一口短而宽，特攻越高罩得越开，比龙息更扁更胖。"
            }),
        /** 中毒概率：0.28 + 特攻偏移[0,0.18] + 等级(≥30)偏移[0,0.08] + 呛辣 0.18；夹 0.12..0.62。 */
        poisonChance: percent(
            F.base(0.28)
                .plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(0, 0.18))
                .plus(F.level().minus(30).times(0.0015).clamp(0, 0.08))
                .plus(F.when(F.pref("acrid", text("worldcombat.skill.belch.preference.acrid")), F.const(0.18), F.const(0)))
                .clamp(0.12, 0.62).round(3),
            "中毒概率", "被这团毒气罩到后中毒的概率；特攻越强、等级越高、开了呛辣式，气里的毒越浓。"),
        /** 中毒时长：180 + 特攻偏移[−20,60] + 等级(≥30)偏移[0,20]；呛辣 ×1.4；夹 120..380。 */
        poisonTicks: seconds(
            F.base(180)
                .plus(F.stat("specialAttack").minus(60).times(0.6).clamp(-20, 60))
                .plus(F.level().minus(30).times(0.5).clamp(0, 20))
                .times(F.when(F.pref("acrid", text("worldcombat.skill.belch.preference.acrid")), F.const(1.4), F.const(1)))
                .clamp(120, 380).round(0),
            "中毒时长", "中毒后带着共享中毒身份掉血的时间；特攻越强、等级越高、呛辣式越久。"),
        /** 残气时长：70 + 特攻偏移[−10,30]；呛辣 ×1.4；夹 40..160。 */
        hazeTicks: seconds(
            F.base(70).plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-10, 30))
                .times(F.when(F.pref("acrid", text("worldcombat.skill.belch.preference.acrid")), F.const(1.4), F.const(1)))
                .clamp(40, 160).round(0),
            "残气时长", "喷出去的气团在原地飘多久（只作画面，不再结算）；气足的个体和呛辣式留得更久。"),
        /** 气团粒子量：30 + 特攻偏移[−8,22]；夹 18..70。同时驱动画面密度。 */
        motes: formula(
            F.base(30).plus(F.stat("specialAttack").minus(60).times(0.25).clamp(-8, 22)).clamp(18, 70).round(0),
            "气团粒子量", {
                unit: "个",
                description: "喷出与残留时翻涌的毒气粒子数量；随特攻增长，粒子按它发射，画面里的数量与机制一致。"
            }),
        /** 起手：7 − 速度偏移[−1.5,3]；呛辣 +2；夹 4..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 3))
                .plus(F.when(F.pref("acrid", text("worldcombat.skill.belch.preference.acrid")), F.const(2), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "咬碎吞下树果、把气顶到喉咙口的时间；快的个体起得短，呛辣式多含一会儿。"),
        /** 收招：8 − 速度偏移[−1.5,3]；夹 5..12。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-1.5, 3)).clamp(5, 12).round(0),
            "收招", "把最后一口气和果渣咽下去、收口的时间。"),
        /** 冷却：30 − 速度偏移[−4,6]；呛辣 +6；夹 20..44。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.05).clamp(-4, 6))
                .plus(F.when(F.pref("acrid", text("worldcombat.skill.belch.preference.acrid")), F.const(6), F.const(0)))
                .clamp(20, 44).round(0),
            "冷却", "两次打嗝之间的等待；气足的人回得快，呛辣式缓得更久。"),
        maxTargets: hidden(8)
    });

    defineDamage("belch", "gas", {});

    stages("belch", [
        { level: 40, values: { gas: 112 } }
    ]);

    describe("belch", [
        { key: "description.0", values: ["gas"] },
        { key: "description.1", values: ["reach", "arc", "poisonChance", "poisonTicks"] },
        { key: "acrid.on", values: [], when: function (context) { return read(context.detail.values, ["acrid"]) === true; } },
        { key: "acrid.off", values: [], when: function (context) { return read(context.detail.values, ["acrid"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.gas"] }
    ]);
}
