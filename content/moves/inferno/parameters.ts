/**
 * 炼狱 / inferno 的参数与伤害段。
 *
 * 原生事实：Fire／特殊／威力 100／命中 50／PP 5／100% 灼伤。
 * 翻译：把「用烈焰包裹住对手」翻成**一枚先埋后爆的火印**——落点先被一圈焦黑的热痕圈住、闷响预热（长起手），
 *   随后烈焰从地里涌起、向上卷成一根把里面整个包住的火柱。命中的一刻**必定**把里面的人点着（原生 100%）。
 *   原生 50% 的命中被翻成「看得见的闪避窗口」：预热够长、范围不宽，走出火印的人就真的躲开了——
 *   命中率由对手的站位与速度决定，而不是掷骰子。
 *   它是这一族里唯一必定灼伤、也最慢最重的一招；火柱烧完只留下目标身上不灭的火。
 * 与同族分开：热水是水洼、热风是扇面、热沙大地留沙；只有炼狱必灼、且把一切都交给那一段预热。
 *
 * 数值来源（每项读不同的精灵数据，分散到不同参数）：
 *   pyre         火柱威力：特攻定火有多旺、等级给成长；烈日更烈、雨天更淡；追身式收力。
 *   reach        落点距离：特攻决定能点多远。
 *   bloomRadius  火柱半径：特攻与体型高度决定包住多大一圈。
 *   fuse         预热时间：速度决定对手有多少闪避窗口；追身式更长（因为会跟）。
 *   pinInterval  追身间隔：速度（追身式才使用）。
 *   pinTicks     追身持续：等级（追身式才使用）。
 *   pinEcho      追身余波：每道后续火柱占首爆的比例（追身式才使用）。
 *   embers       火星数：特攻与等级派生，表现按它发射。
 *   kindle/quench/recharge：速度决定起手、收招、冷却。
 * 配置 pin（追身式）双向取舍：开启＝火柱跟着目标连烧几道、半径更大、更容易命中，但每道威力 ×0.82、预热更长、冷却 +12；
 * 关闭（定点式）＝一发更重、预热更短、冷却 −4，但人走开就落空。两向各有适用局面（必中 vs 一击）。
 *
 * 伤害段 pyre 走共享换算（原始类别 Special）；灼伤以 chance=1 经同一条共享状态路落到任何目标上。
 */
namespace PokemonSkills {
    actionParameters.define("inferno", {
        /** 火柱威力：100 + 特攻偏移[−16,46] + 等级(≥35)偏移[0,12]；追身 ×0.82／定点 ×1.06；烈日 ×1.22；雨天 ×0.82；夹 70..190。 */
        pyre: formula(
            F.base(100)
                .plus(F.stat("specialAttack").minus(60).times(0.26).clamp(-16, 46))
                .plus(F.level().minus(35).times(0.06).clamp(0, 12))
                .times(F.when(F.pref("pin", text("worldcombat.skill.inferno.preference.pin")), F.const(0.82), F.const(1.06)))
                .times(F.when(F.world("sunlight", text("worldcombat.value.sunlight")).gte(0.5), F.const(1.22), F.const(1)))
                .times(F.when(F.world("rain", text("worldcombat.skill.inferno.value.rain")).gt(0.2), F.const(0.82), F.const(1)))
                .clamp(70, 190).round(1),
            "火柱威力", {
                unit: "威力",
                description: "火柱涌起时对圈内每人结算的威力；特攻越高、等级越高越烈，烈日更烈、雨天被压。对手特防、相性与暴击在命中时另算。"
            }),
        /** 落点距离：11 + 特攻偏移[−1,3]；夹 8..15。 */
        reach: formula(
            F.base(11).plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-1, 3)).clamp(8, 15).round(1),
            "落点距离", {
                unit: "格",
                description: "火印能被点在多远的地面；特攻高够得越远。它也是本招的实际射程来源。"
            }),
        /** 火柱半径：2.1 + 特攻偏移[−0.3,0.6] + 高度偏移[−0.15,0.6]；追身 ×1.15／定点 ×0.95；夹 1.6..3.4。 */
        bloomRadius: formula(
            F.base(2.1)
                .plus(F.stat("specialAttack").minus(60).times(0.008).clamp(-0.3, 0.6))
                .plus(F.body("height").minus(1.4).times(0.3).clamp(-0.15, 0.6))
                .times(F.when(F.pref("pin"), F.const(1.15), F.const(0.95)))
                .clamp(1.6, 3.4).round(2),
            "火柱半径", {
                unit: "格",
                description: "火柱从落点向外包住多大一圈；特攻高、体型大的个体烧得更开，追身式更大。它也是对手必须走出的闪避范围。"
            }),
        /** 预热时间：13 − 速度偏移[−1.5,3] + 追身 4／定点 −2；夹 9..24。 */
        fuse: seconds(
            F.base(13).minus(F.stat("speed").minus(55).times(0.015).clamp(-1.5, 3))
                .plus(F.when(F.pref("pin"), F.const(4), F.const(-2)))
                .clamp(9, 24).round(0),
            "预热时间", "火印在地上闷响、预热多久才涌起火柱；这一段就是对手走出范围的闪避窗口，追身式更长。"),
        /** 追身间隔：8 − 速度偏移[−1.5,2]；夹 6..11。 */
        pinInterval: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.012).clamp(-1.5, 2)).clamp(6, 11).round(0),
            "追身间隔", "追身式下，两道火柱之间隔多久；速度快的个体烧得更急。"),
        /** 追身持续：26 + 等级(≥35)偏移[0,10]；夹 20..40。 */
        pinTicks: seconds(
            F.base(26).plus(F.level().minus(35).times(0.4).clamp(0, 10)).clamp(20, 40).round(0),
            "追身持续", "追身式下，火柱跟着目标连烧多久；这段里它走到哪，火就压到哪。"),
        /** 追身余波：0.45 + 特攻偏移[−0.08,0.15]；夹 0.30..0.66。 */
        pinEcho: percent(
            F.base(0.45).plus(F.stat("specialAttack").minus(60).times(0.0008).clamp(-0.08, 0.15)).clamp(0.30, 0.66).round(3),
            "追身余波", "追身式下，第二道起的每道火柱占首爆火柱的比例；特攻越高，后续火柱也越旺。"),
        /** 火星数：20 + 特攻偏移[−4,24] + 等级(≥35)偏移[0,8]；夹 16..56。 */
        embers: formula(
            F.base(20)
                .plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-4, 24))
                .plus(F.level().minus(35).times(0.2).clamp(0, 8))
                .clamp(16, 56).round(0),
            "火星数", {
                unit: "个",
                description: "火柱里翻涌的火星与外焰数量，也驱动表现中的密度；特攻与等级越高烧得越满。"
            }),
        /** 起手：8 − 速度偏移[−1.5,2]；夹 5..12。 */
        kindle: seconds(
            F.base(8).minus(F.stat("speed").minus(55).times(0.02).clamp(-1.5, 2)).clamp(5, 12).round(0),
            "起手", "点火、把火引到落点的准备时间；速度越快越短。"),
        /** 收招：9 − 速度偏移[−1.5,2]；夹 5..12。 */
        quench: seconds(
            F.base(9).minus(F.stat("speed").minus(55).times(0.015).clamp(-1.5, 2)).clamp(5, 12).round(0),
            "收招", "火柱熄下后收势的时间；速度越快越利落。"),
        /** 冷却：34 − 速度偏移[−4,5] + 追身 12／定点 −4；夹 24..54。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(55).times(0.02).clamp(-4, 5))
                .plus(F.when(F.pref("pin"), F.const(12), F.const(-4)))
                .clamp(24, 54).round(0),
            "冷却", "再点一枚火印前的等待；速度越快回得越快，追身式重新积火更久。")
    });

    defineDamage("inferno", "pyre", {});

    stages("inferno", [
        { level: 45, values: { pyre: 120, fuse: 11 } },
        { level: 60, values: { pyre: 138, bloomRadius: 2.6 } }
    ]);

    describe("inferno", [
        { key: "description.0", values: ["pyre"] },
        { key: "description.1", values: ["reach", "bloomRadius", "fuse"] },
        { key: "description.2", values: ["embers"] },
        { key: "rule.guaranteed", values: [] },
        { key: "pin.on", values: ["pinTicks", "pinInterval", "pinEcho"],
            when: function (context) { return read(context.detail.values, ["pin"]) === true; } },
        { key: "pin.off", values: [], when: function (context) { return read(context.detail.values, ["pin"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.pyre", "tier.0.fuse"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.pyre", "tier.1.bloomRadius"] }
    ]);
}
