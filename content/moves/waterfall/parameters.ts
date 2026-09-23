/**
 * 攀瀑 / waterfall 的参数与伤害段。
 *
 * 原生事实：Water、物理、威力 80、命中 100、PP 15、接触，命中后 20% 概率使目标畏缩
 *   （Cobblemon 1.8 / Showdown），全招 147 位学习者。
 *
 * 翻译：把「以惊人的气势扑向对手」落成一次**贴身的水瀑扑撞**——水从身后涌起成一道竖直水帘，
 * 施法者缩身蓄势后整身扑出，像瀑布从高处砸下；撞实的一刻水帘拍在目标身上把它冲退并震懵。
 * 它比波动冲短、比铁头快，落点是「被水拍懵」而不是「被浇透或砸飞」。攀瀑之名还保留一层环境读法：
 * 下着雨时水势更盛，威力与震懵都抬一档。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   crash      扑击威力：物攻给狠度，速度把扑势压进去；雨中 ×1.14；瀑落式 ×1.08。
 *   pounce     扑击距离：速度与身高决定扑得多远，也是本招射程基准。
 *   pace       扑速：速度决定每刻推进多少。
 *   collisionRadius 判定半径：身高决定身周水墙多宽。
 *   flinchChance 畏缩概率：物攻与雨中加成决定，瀑落式再抬。
 *   flinchTicks  畏缩时长：等级决定；瀑落式更长。
 *   shove      冲开距离：体重与速度决定把目标冲退多远。
 *   spray      水花数：速度与物攻派生，表现按它发射。
 *   curtain    水帘高度：身高决定身后水帘多高，表现按它画。
 *   起手／收招／冷却：速度决定。
 *
 * 配置 `torrent`（瀑落式）双向取舍：开启＝扑得更远更重、震得更久、水帘更高，但扑速更慢、
 * 起手与冷却更久；关闭（急流式）＝更短更快、循环更顺，代价是单下更轻、震得更短。
 *
 * 伤害段 `crash` 走共享换算，接触标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    actionParameters.define("waterfall", {
        crash: formula(
            F.base(80).plus(F.stat("attack").minus(55).times(0.3).clamp(-15, 36))
                .plus(F.stat("speed").minus(55).times(0.12).clamp(-6, 20))
                .times(F.when(F.world("rain").gt(0.15), F.const(1.14), F.const(1)))
                .times(F.when(F.pref("torrent", text("worldcombat.skill.waterfall.preference.torrent")), F.const(1.08), F.const(1)))
                .clamp(50, 175).round(1),
            "扑击威力", {
                unit: "威力",
                description: "整身扑实这一下的基础威力；物攻越高、扑势越猛越狠，雨中水势更盛，瀑落式再抬一档。对手防御、相性与暴击在命中时另算。"
            }),
        pounce: formula(
            F.base(3.4).plus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .plus(F.body("height").minus(1.4).times(0.3).clamp(-0.2, 0.8))
                .times(F.when(F.pref("torrent", text("worldcombat.skill.waterfall.preference.torrent")), F.const(1.1), F.const(1)))
                .clamp(2.4, 6.0).round(2),
            "扑击距离", {
                unit: "格",
                description: "从起步到扑实的水帘总位移，也是本招的射程基准；冲得快、身架大扑得更远，瀑落式拉得更长。"
            }),
        pace: formula(
            F.base(0.95).plus(F.stat("speed").minus(55).times(0.007).clamp(-0.25, 0.55))
                .times(F.when(F.pref("torrent", text("worldcombat.skill.waterfall.preference.torrent")), F.const(0.92), F.const(1)))
                .clamp(0.6, 1.5).round(2),
            "扑速", {
                unit: "格/刻",
                description: "水帘每刻推进的距离；越快越难被侧移让开，瀑落式更沉更慢。"
            }),
        collisionRadius: formula(
            F.base(0.6).plus(F.body("height").minus(1.4).times(0.16).clamp(-0.08, 0.3)).clamp(0.45, 1.05).round(2),
            "判定半径", {
                unit: "格",
                description: "裹在身周的水墙宽度，也是本招的横向判定半径；身板越大水墙越宽。"
            }),
        flinchChance: percent(
            F.base(0.20).plus(F.stat("attack").minus(55).times(0.0012).clamp(-0.05, 0.1))
                .plus(F.when(F.world("rain").gt(0.15), F.const(0.08), F.const(0)))
                .times(F.when(F.pref("torrent", text("worldcombat.skill.waterfall.preference.torrent")), F.const(1.15), F.const(1)))
                .clamp(0.1, 0.45).round(3),
            "畏缩概率", "水帘拍中时把目标震懵的概率；原生 20% 起，物攻越高、雨势越大越容易，瀑落式再抬一档。"),
        flinchTicks: seconds(
            F.base(16).plus(F.level().minus(30).times(0.4).clamp(0, 12))
                .plus(F.when(F.pref("torrent", text("worldcombat.skill.waterfall.preference.torrent")), F.const(4), F.const(0)))
                .clamp(10, 36).round(0),
            "畏缩时长", "被水拍懵的人在这段时间内无法开始新动作；等级越高越久，瀑落式更长。"),
        shove: formula(
            F.base(1.1).plus(F.body("weight").minus(50).times(0.004).clamp(-0.2, 0.9))
                .plus(F.stat("speed").minus(55).times(0.002).clamp(-0.1, 0.4))
                .clamp(0.6, 2.4).round(2),
            "冲开距离", {
                unit: "格",
                description: "命中后把目标沿扑击方向冲开多远；越重、冲得越快的个体推得越远。"
            }),
        spray: formula(
            F.base(20).plus(F.stat("speed").minus(55).times(0.3).clamp(-6, 16))
                .plus(F.stat("attack").minus(55).times(0.12).clamp(-4, 10))
                .clamp(14, 58).round(0),
            "水花数", {
                unit: "个",
                description: "扑撞与命中溅起的水花数量，随速度与物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        curtain: formula(
            F.base(1.6).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.2, 1.2)).clamp(1.2, 3.0).round(2),
            "水帘高度", {
                unit: "格",
                description: "身后涌起的竖直水帘有多高；体型越高水帘越高。表现里的水帘按它铺开。"
            }),
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.04).clamp(-2, 3))
                .plus(F.when(F.pref("torrent", text("worldcombat.skill.waterfall.preference.torrent")), F.const(2), F.const(0)))
                .clamp(5, 15).round(0),
            "起手", "水从身后涌起、缩身蓄势到能扑出的时间；速度越快越短，瀑落式多蓄一点。"),
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2))
                .plus(F.when(F.pref("torrent", text("worldcombat.skill.waterfall.preference.torrent")), F.const(2), F.const(0)))
                .clamp(5, 15).round(0),
            "收招", "水帘散开、站稳的收势；瀑落式要多花一点时间卸掉水。"),
        recharge: seconds(
            F.base(38).minus(F.stat("speed").minus(55).times(0.05).clamp(-4, 7))
                .plus(F.when(F.pref("torrent", text("worldcombat.skill.waterfall.preference.torrent")), F.const(7), F.const(0)))
                .clamp(24, 56).round(0),
            "冷却", "再次涌水扑击前的等待；速度越快回得越快，瀑落式蓄得更久。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    stages("waterfall", [
        { level: 32, values: { crash: 90, pounce: 3.9 } },
        { level: 50, values: { crash: 100, pounce: 4.3, flinchChance: 0.26 } }
    ]);

    defineDamage("waterfall", "crash", { defenceCoefficient: 0.0052,
        rationale: "水帘拍上去把力摊开，钝撞更容易透过护甲，让体格与等级差更明显。" }, { contact: true });

    describe("waterfall", [
        { key: "description.0", values: ["crash","pounce","pace","collisionRadius"] },
        { key: "description.path", values: [] },
        { key: "description.1", values: ["shove","flinchChance","flinchTicks"] },
        { key: "description.rain", values: [] },
        { key: "torrent.on", values: [], when: function (context) { return read(context.detail.values, ["torrent"]) === true; } },
        { key: "torrent.off", values: [], when: function (context) { return read(context.detail.values, ["torrent"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.crash", "tier.0.pounce"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.crash", "tier.1.pounce", "tier.1.flinchChance"] }
    ]);
}
