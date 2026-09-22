/**
 * 电击 / thundershock —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Electric／特殊／威力 40／命中 100／PP 30／单体／10% 令对手麻痹。
 * 翻译：把「发出电流刺激对手」翻成一道**贴身短促的电刺**——瞬间扎上去，几乎没有起手，冷却最短；
 *   代价是射程本族最短、威力最小。它的身份在「刺激」：对**已经麻痹**的目标更狠，并把麻痹续长一截，
 *   所以它是本族的追打手——同族先麻住，电击跟着扎，两只精灵的差距在这一下上被放大。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数（同一招在不同个体手里读起来不同）：
 *   jab         电刺威力：特攻决定电压；对已麻痹目标 ×1.38（这一项直接画进伤害公式，悬浮里读得到）。
 *   numbChance  麻痹几率：特攻＋等级，本族最低的概率。
 *   numbTicks   首次麻痹时长：特攻。
 *   linger      续麻时长：等级；命中已麻目标时把麻痹补到这个时长，只补不缩。
 *   reach       射程：等级＋特攻，本族最短。
 *   radius      判定半径：碰撞箱高度。
 *   arcs        电弧条数：特攻；同时是画面里的电弧数量。
 *   tempo       起手：速度（几乎为零）。
 *   recharge    冷却：速度＋等级，本族最短。
 *
 * 本招没有玩家可见的配置项：它是本族里最便宜、最随手的一发，身份来自「追打」而不是取舍。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const thundershockId = "thundershock";

    actionParameters.define(thundershockId, {
        /** 威力：30 + 特攻偏移[−8,20]；目标已麻痹 ×1.38；夹 16..56。 */
        jab: formula(
            F.base(30).plus(F.stat("specialAttack").minus(60).times(0.16).clamp(-8, 20))
                .times(F.when(F.target("status.paralysis", { key: "worldcombat.skill.thundershock.term.paralyzed", fallback: "target paralysed" }),
                    F.const(1.38), F.const(1)))
                .clamp(16, 56).round(1),
            "电刺威力", {
                unit: "威力",
                description: "这一刺的基础威力；特攻越高越强。目标已经麻痹时电得更狠（×1.38）——这正是本招的用法。对手特防、相性与暴击在命中时另算。"
            }),
        /** 麻痹几率：0.10 + 特攻偏移[0,0.12] + 等级(≥25)偏移[0,0.08]；夹 0.05..0.30。 */
        numbChance: percent(
            F.base(0.10).plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(0, 0.12))
                .plus(F.level().minus(25).times(0.0012).clamp(0, 0.08))
                .clamp(0.05, 0.30).round(3),
            "麻痹几率", "未麻痹的目标被这一刺麻住的几率；特攻越高、等级越高越容易。"),
        /** 首次麻痹时长：110 + 特攻偏移[−20,60]；夹 80..240。 */
        numbTicks: seconds(
            F.base(110).plus(F.stat("specialAttack").minus(60).times(0.4).clamp(-20, 60)).clamp(80, 240).round(0),
            "麻痹时长", "首次麻住目标多久；特攻决定穿透力。"),
        /** 续麻时长：60 + 等级(≥25)偏移[0,30]；夹 40..120。 */
        linger: seconds(
            F.base(60).plus(F.level().minus(25).times(0.8).clamp(0, 30)).clamp(40, 120).round(0),
            "续麻时长", "命中已经麻痹的目标时，把麻痹补到至少这个时长（只补不缩）；等级越高补得越足。"),
        /** 射程：4 + 等级(≥25)偏移[0,1.2] + 特攻偏移[−0.3,0.5]；夹 3.2..6。 */
        reach: formula(
            F.base(4).plus(F.level().minus(25).times(0.03).clamp(0, 1.2))
                .plus(F.stat("specialAttack").minus(60).times(0.008).clamp(-0.3, 0.5))
                .clamp(3.2, 6).round(2),
            "射程", {
                unit: "格",
                description: "电刺能扎到多近处的目标；本族最短，必须贴身。它也是本招的实际射程。"
            }),
        /** 判定半径：0.3 + 高度偏移[−0.08,0.22]；夹 0.2..0.55。 */
        radius: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).times(0.06).clamp(-0.08, 0.22)).clamp(0.2, 0.55).round(2),
            "判定半径", {
                unit: "格",
                description: "电刺的横向判定半径；大个子更容易被扎到。"
            }),
        /** 电弧条数：4 + 特攻偏移[0,6]；夹 3..12。 */
        arcs: formula(
            F.base(4).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(0, 6)).clamp(3, 12).round(0),
            "电弧条数", {
                unit: "条",
                description: "电刺扎出时迸开的电弧数量；特攻越高越密，也是画面里电弧的数量。"
            }),
        /** 起手：3 − 速度偏移[−1,2]；夹 0..6。 */
        tempo: seconds(
            F.base(3).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2)).clamp(0, 6).round(0),
            "起手", "把电攒到嘴边需要多久；速度越快越短，最慢不过 6 刻——它是本族最快的一发。"),
        /** 冷却：13 − 速度偏移[0,3] − 等级(≥25)偏移[0,3]；夹 6..24。 */
        recharge: seconds(
            F.base(13).minus(F.stat("speed").minus(60).times(0.04).clamp(0, 3))
                .minus(F.level().minus(25).times(0.05).clamp(0, 3))
                .clamp(6, 24).round(0),
            "冷却", "两刺之间的等待；速度越快、等级越高回得越快，本族最短。")
    });

    defineDamage(thundershockId, "jab", {});

    stages(thundershockId, [
        { level: 30, values: { jab: 38 } },
        { level: 48, values: { numbChance: 0.20, linger: 90 } }
    ]);

    describe(thundershockId, [
        { key: "description.0", values: ["jab", "reach", "radius"] },
        { key: "description.1", values: ["numbChance", "numbTicks", "linger"] },
        { key: "description.2", values: ["arcs", "tempo", "recharge"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.jab"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.numbChance", "tier.1.linger"] }
    ]);
}
