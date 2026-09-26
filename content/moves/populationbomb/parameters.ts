/**
 * 鼠数儿 / populationbomb 的参数与伤害段。
 *
 * 原生事实：一般、物理、威力 20、命中 90、PP 10、接触、切割（slicing）、连续 10 次（`multihit: 10`）、
 * 每次独立判定命中（`multiaccuracy`，一次落空就中断）。全招 2 位学习者（一家鼠一族）。
 *
 * 翻译：把「伙伴们纷纷赶来集合、以群体行动连续命中 1～10 次」翻成**一串先后扑上来的伙伴**——先在施法者
 *   身边预留真实可放的位置排出一支短队（muster），然后一只接一只从自己的队伍位置扑向该次释放的瞄准点，
 *   每只命中结算一小段 `swarm`；每只独立掷命中，且只有真实撞上目标才算，一只扑空（掷空偏航、撞墙、
 *   目标横移走开或飞出射程）这一串就到此为止。所以这一串能拉多长不确定：可能是可怜的一下，也可能是一连十下。
 *   原生的回合制「1～10 次」被翻成一次出手里上限可变、随时可能断掉的连段。
 *
 * 数据分散（每个参数读不同的精灵数据，小差距因此能看出不同）：
 *   swarm    每下威力：物攻定扑击的狠、速度定扑上的快；配置决定「多而轻」还是「少而重」。
 *   comrades 连段上限：等级与速度决定最多能叫来几只（配置再收缩或放开）。
 *   accuracy 每下命中率：原生 90% 起，速度提高；配置两向微调。
 *   gap      伙伴之间的间隔：速度决定扑得多急；配置的「鼠海」更密。
 *   flight   扑击速度：速度派生。
 *   reach    出动距离：等级与速度决定伙伴能锁定多远，也是本招实际射程来源。
 *   radius   伙伴判定：身高决定一只伙伴的碰撞半径，撞上实体或方块都按它结算。
 *   ring     集结半径：碰撞箱宽度决定队伍在施术者身边排多开（画面里的队伍路径就是它）。
 *   lurk     队列高度：身高决定排队伙伴相对施术者脚边抬起多高。
 *   motes    尘土点数：物攻派生，表现按它发射。
 *   muster/tempo/recover/recharge：速度与配置共同决定集合、起手、收招与冷却。
 *
 * 配置 `swarm`（鼠海）双向取舍：开启（默认）＝连段上限抬到 10、间隔更密、更早出手，但每下轻 15%、
 *   每次命中率 −5%——长而不稳；关闭（精锐合击）＝上限收到 5、每下重 30%、命中率 +5%，但间隔更慢、
 *   冷却更短——短而可靠。两个方向各有适用局面。
 *
 * 伤害段 `swarm` 走共享换算（对手防御、相性、暴击在命中时每下另算）；接触与切割标记写在 defineDamage 上。
 */
namespace PokemonSkills {
    actionParameters.define("populationbomb", {
        /** 每下威力：11 + 物攻偏移[−3,12] + 速度偏移[−1,4]；鼠海 ×0.85 / 精锐 ×1.3；夹 7..26。 */
        swarm: formula(
            F.base(11)
                .plus(F.stat("attack").minus(45).times(0.08).clamp(-3, 12))
                .plus(F.stat("speed").minus(45).times(0.03).clamp(-1, 4))
                .times(F.when(F.pref("swarm", text("worldcombat.skill.populationbomb.preference.swarm")), F.const(0.85), F.const(1.3)))
                .clamp(7, 26).round(1),
            "每下威力", {
                unit: "威力",
                description: "每一只伙伴扑上来的威力；总数乘起来才是这招的分量。物攻定狠度、速度定扑上的快慢，配置决定让每一只更轻还是更重。对手防御、相性与暴击在每下命中时另算。"
            }),
        /** 连段上限：5 + 等级≥25偏移[0,2.5] + 速度偏移[−0.5,2]；鼠海 ×1.7 / 精锐 ×1；夹 3..10。 */
        comrades: formula(
            F.base(5)
                .plus(F.level().minus(25).times(0.1).clamp(0, 2.5))
                .plus(F.stat("speed").minus(45).times(0.02).clamp(-0.5, 2))
                .times(F.when(F.pref("swarm", text("worldcombat.skill.populationbomb.preference.swarm")), F.const(1.7), F.const(1)))
                .clamp(3, 10).round(0),
            "连段上限", {
                unit: "只",
                description: "这一串最多能叫来几只伙伴；等级越高、出手越快越多，鼠海再放宽到十只。实际只数还要看每一只是否都扑中。"
            }),
        /** 每下命中率：0.9 + 速度偏移[−0.06,0.08]；鼠海 −0.05 / 精锐 +0.05；夹 0.72..0.98。 */
        accuracy: percent(
            F.base(0.9)
                .plus(F.stat("speed").minus(45).times(0.001).clamp(-0.06, 0.08))
                .plus(F.when(F.pref("swarm", text("worldcombat.skill.populationbomb.preference.swarm")), F.const(-0.05), F.const(0.05)))
                .clamp(0.72, 0.98).round(3),
            "每下命中率", "每一只伙伴独立掷的命中率（原生 90% 起）；速度提高它，鼠海降低它。一只扑空，这一串就到此为止。"),
        /** 间隔：5 − 速度偏移[−1,1.5]；鼠海 −1 / 精锐 +1.5；夹 3..9。 */
        gap: seconds(
            F.base(5).minus(F.stat("speed").minus(45).times(0.02).clamp(-1, 1.5))
                .plus(F.when(F.pref("swarm", text("worldcombat.skill.populationbomb.preference.swarm")), F.const(-1), F.const(1.5)))
                .clamp(3, 9).round(0),
            "间隔", "两只伙伴之间隔多久扑上；速度越快越密，鼠海更急、精锐更从容。"),
        /** 扑击速度：1.2 + 速度偏移[−0.15,0.35]；夹 0.8..1.8。 */
        flight: formula(
            F.base(1.2).plus(F.stat("speed").minus(45).times(0.008).clamp(-0.15, 0.35)).clamp(0.8, 1.8).round(2),
            "扑击速度", {
                unit: "格/刻",
                description: "伙伴朝目标扑去的速度；速度快的个体叫来的伙伴也更利落。"
            }),
        /** 出动距离：7 + 等级≥25偏移[0,3] + 速度偏移[−1,1.5]；夹 5..12。 */
        reach: formula(
            F.base(7)
                .plus(F.level().minus(25).times(0.1).clamp(0, 3))
                .plus(F.stat("speed").minus(45).times(0.03).clamp(-1, 1.5))
                .clamp(5, 12).round(2),
            "出动距离", {
                unit: "格",
                description: "伙伴能从多远扑回目标；等级越高、出手越快够得越远。它也是本招的实际射程来源。"
            }),
        /** 伙伴判定：0.28 + 身高偏移[−0.03,0.16]；夹 0.2..0.5。 */
        radius: formula(
            F.base(0.28).plus(F.body("height").minus(1.4).times(0.06).clamp(-0.03, 0.16)).clamp(0.2, 0.5).round(2),
            "伙伴判定", {
                unit: "格",
                description: "一只伙伴扑击时的碰撞半径；撞上非友方活体才结算，撞上方块就落空。大个子叫来的伙伴身板也大。"
            }),
        /** 集结半径：3.5 + 碰撞箱宽度偏移[−0.5,1.6]；夹 2.5..5。 */
        ring: formula(
            F.base(3.5).plus(F.body("width").minus(0.9).times(0.8).clamp(-0.5, 1.6)).clamp(2.5, 5).round(2),
            "集结半径", {
                unit: "格",
                description: "伙伴在施术者身边多远处排成队伍；身体越宽排得越开。画面里的队伍路径就是它。"
            }),
        /** 扑击高度：0.6 + 身高偏移[−0.1,0.5]；夹 0.4..1.4。 */
        lurk: formula(
            F.base(0.6).plus(F.body("height").minus(1.4).times(0.15).clamp(-0.1, 0.5)).clamp(0.4, 1.4).round(2),
            "队列高度", {
                unit: "格",
                description: "排队伙伴相对施术者脚边抬起多高；大个子叫来的伙伴排得更高。"
            }),
        /** 尘土点数：14 + 物攻偏移[−3,16]；夹 10..34。 */
        motes: formula(
            F.base(14).plus(F.stat("attack").minus(45).times(0.12).clamp(-3, 16)).clamp(10, 34).round(0),
            "尘土点数", {
                unit: "点",
                description: "伙伴扑过与命中时带起的尘土数量，随物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 集合：8 − 速度偏移[−1.5,2]；夹 4..12。 */
        muster: seconds(
            F.base(8).minus(F.stat("speed").minus(45).times(0.025).clamp(-1.5, 2)).clamp(4, 12).round(0),
            "集合", "召唤伙伴在身边聚齐需要多久；速度越快越早出手。"),
        /** 起手：= 集合（两者一起决定第一只扑出的时刻）。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").minus(45).times(0.025).clamp(-1.5, 2)).clamp(4, 12).round(0),
            "起手", "从起手到第一只伙伴扑出的时间；与集合同步。"),
        /** 收招：7 − 速度偏移[−1,2]；夹 4..10。 */
        recover: seconds(
            F.base(7).minus(F.stat("speed").minus(45).times(0.02).clamp(-1, 2)).clamp(4, 10).round(0),
            "收招", "这一串结束后收势的时间；速度越快收得越快。"),
        /** 冷却：30 − 速度偏移[−2,5]；鼠海 +4 / 精锐 −2；夹 18..44。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(45).times(0.05).clamp(-2, 5))
                .plus(F.when(F.pref("swarm", text("worldcombat.skill.populationbomb.preference.swarm")), F.const(4), F.const(-2)))
                .clamp(18, 44).round(0),
            "冷却", "再叫一次伙伴前的等待；速度越快回得越快，鼠海更久、精锐更短。PP 10 的代价。")
    });

    stages("populationbomb", [
        { level: 25, values: { swarm: 13, comrades: 6 } },
        { level: 46, values: { swarm: 17, comrades: 8, reach: 9 } }
    ]);

    defineDamage("populationbomb", "swarm", {}, { contact: true, slice: true });

    describe("populationbomb", [
        { key: "description.0", values: ["swarm","comrades","accuracy","gap"] },
        { key: "description.1", values: ["flight","reach","radius","ring","lurk"] },
        { key: "description.2", values: ["muster"] },
        { key: "swarm.on", values: [], when: function (context) { return read(context.detail.values, ["swarm"]) === true; } },
        { key: "swarm.off", values: [], when: function (context) { return read(context.detail.values, ["swarm"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.swarm", "tier.0.comrades"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.swarm", "tier.1.comrades", "tier.1.reach"] }
    ]);
}
