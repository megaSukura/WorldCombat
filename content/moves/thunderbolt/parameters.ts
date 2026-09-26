/**
 * 十万伏特 / thunderbolt —— 参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Electric／特殊／威力 90／命中 100／PP 15／单体／10% 令对手麻痹。
 * 翻译：把「发出强力电击」翻成一发**沿直线飞行的电弹**——蓄一小口气，压成一团射出去，命中处炸开一片电网。
 *   它是本族的基准：射程中等、飞行快、随时能放；代价是单体威力不是本族最高、麻人的机会也最小。
 *   配置 `spread`（扩散式）把这一发从单体点射改成落点分摊：命中处向周围最多几个敌人分电，直击更轻。
 *
 * 参数为什么依赖这些精灵数据、并分散到不同参数（同一招在不同个体手里读起来不同）：
 *   bolt          威力：特攻决定电束的电压；扩散式把电压分摊出去，单点更轻。
 *   beamSpeed     电束推进速度：速度决定主束多快走完瞄准线（推进段数封顶 4 刻），也决定画面里电束长出的快慢。
 *   burstRadius   爆开半径：碰撞箱高度（大个子炸得更开）＋特攻；它同时是主爆范围、电链的最大边长与画面尺寸。
 *   splashShare   分摊比例：特攻越高，分到旁边人身上的电花越足。
 *   splashTargets 分摊人数：特攻越高，能电到的旁边人越多。
 *   numbChance    麻痹几率：特攻＋等级；扩散式分摊了电流，麻人的机会略降。
 *   numbTicks     麻痹时长：特攻决定穿透力。
 *   arcs          电弧条数：特攻；同时是画面里的电弧数量。
 *   reach         射程：等级＋特攻。
 *   tempo         起手：速度；扩散式要多压一拍。
 *   recharge      冷却：等级；扩散式缓得更久。
 *
 * 公式即最终值；执行、AI 与悬浮说明读同一棵树。
 */
namespace PokemonSkills {
    export const thunderboltId = "thunderbolt";

    actionParameters.define(thunderboltId, {
        /** 威力：80 + 特攻偏移[−14,44]；扩散 ×0.82 / 单体 ×1.06；夹 44..128。 */
        bolt: formula(
            F.base(80).plus(F.stat("specialAttack").minus(60).times(0.22).clamp(-14, 44))
                .times(F.when(F.pref("spread"), F.const(0.82), F.const(1.06)))
                .clamp(44, 128).round(1),
            "电击威力", {
                unit: "威力",
                description: "电弹命中时那一下的基础威力；特攻越高越强。扩散式把电压分摊到周围，单点更轻。对手特防、相性与暴击在命中时另算。"
            }),
        /** 电束推进速度：2.4 + 速度偏移[−0.5,1.0]；扩散 ×0.9；夹 1.4..3.4。 */
        beamSpeed: formula(
            F.base(2.4).plus(F.stat("speed").minus(60).times(0.02).clamp(-0.5, 1.0))
                .times(F.when(F.pref("spread"), F.const(0.9), F.const(1)))
                .clamp(1.4, 3.4).round(2),
            "电束推进速度", {
                unit: "格/刻",
                description: "主束沿瞄准线推进的速度；速度快的个体更快走完这一段（推进最多 4 刻），画面里电束也长得更急。"
            }),
        /** 爆开半径：0.9 + 高度偏移[−0.15,0.6]；扩散 ×1.5；夹 0.6..2.2。 */
        burstRadius: formula(
            F.base(0.9).plus(F.body("height").minus(1.4).times(0.25).clamp(-0.15, 0.6))
                .times(F.when(F.pref("spread"), F.const(1.5), F.const(1)))
                .clamp(0.6, 2.2).round(2),
            "爆开半径", {
                unit: "格",
                description: "命中处炸开的范围；个子高、特攻强的个体炸得更开，扩散式再放大一圈。它是命中范围，也是画面的尺寸。"
            }),
        /** 分摊比例：0.45 + 特攻偏移[−0.1,0.2]；夹 0.25..0.7。 */
        splashShare: percent(
            F.base(0.45).plus(F.stat("specialAttack").minus(60).times(0.0015).clamp(-0.1, 0.2)).clamp(0.25, 0.7).round(3),
            "分摊比例", "扩散式下，落点周围每个被电到的敌人承受直击威力的几成。"),
        /** 分摊人数：2 + 特攻偏移[0,3]；夹 1..5。 */
        splashTargets: formula(
            F.base(2).plus(F.stat("specialAttack").minus(60).times(0.02).clamp(0, 3)).clamp(1, 5).round(0),
            "分摊人数", {
                unit: "个",
                description: "扩散式下，除了直击目标外最多还能电到几个人；特攻越高电得越开。"
            }),
        /** 麻痹几率：0.10 + 特攻偏移[0,0.10] + 等级(≥25)偏移[0,0.06]；扩散 ×0.9；夹 0.05..0.30。 */
        numbChance: percent(
            F.base(0.10).plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(0, 0.10))
                .plus(F.level().minus(25).times(0.001).clamp(0, 0.06))
                .times(F.when(F.pref("spread"), F.const(0.9), F.const(1)))
                .clamp(0.05, 0.30).round(3),
            "麻痹几率", "命中后目标陷入麻痹的几率；特攻越高、等级越高越容易麻住，扩散式略低。"),
        /** 麻痹时长：150 + 特攻偏移[−30,80]；夹 110..320。 */
        numbTicks: seconds(
            F.base(150).plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-30, 80)).clamp(110, 320).round(0),
            "麻痹时长", "麻住目标多久；特攻决定电击的穿透力。"),
        /** 电弧条数：7 + 特攻偏移[0,8]；扩散 ×1.25；夹 5..20。 */
        arcs: formula(
            F.base(7).plus(F.stat("specialAttack").minus(60).times(0.06).clamp(0, 8))
                .times(F.when(F.pref("spread"), F.const(1.25), F.const(1)))
                .clamp(5, 20).round(0),
            "电弧条数", {
                unit: "条",
                description: "电弹爆开时分叉的电弧数量；特攻越高越密，也是画面里电弧的数量。"
            }),
        /** 射程：9 + 等级(≥25)偏移[0,2.2] + 特攻偏移[−0.8,1.6]；扩散 ×1.05；夹 7..14。 */
        reach: formula(
            F.base(9).plus(F.level().minus(25).times(0.06).clamp(0, 2.2))
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(-0.8, 1.6))
                .times(F.when(F.pref("spread"), F.const(1.05), F.const(1)))
                .clamp(7, 14).round(2),
            "射程", {
                unit: "格",
                description: "能锁定多远处丢出电弹；等级越高、特攻越强够得越远。它也是本招的实际射程。"
            }),
        /** 起手：9 − 速度偏移[−2,3] + 扩散 2；夹 5..14。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-2, 3))
                .plus(F.when(F.pref("spread"), F.const(2), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "把电压成弹丸需要多久；速度越快越短，扩散式要多压一拍。"),
        /** 冷却：26 − 等级(≥25)偏移[0,7]；扩散 ×1.15；夹 14..46。 */
        recharge: seconds(
            F.base(26).minus(F.level().minus(25).times(0.12).clamp(0, 7))
                .times(F.when(F.pref("spread"), F.const(1.15), F.const(1)))
                .clamp(14, 46).round(0),
            "冷却", "两次放电之间的等待；等级越高回得越快，扩散式缓得更久。")
    });

    defineDamage(thunderboltId, "bolt", {});

    stages(thunderboltId, [
        { level: 36, values: { bolt: 96 } },
        { level: 52, values: { numbChance: 0.18, burstRadius: 1.1 } }
    ]);

    describe(thunderboltId, [
        { key: "description.0", values: ["reach", "bolt", "beamSpeed"] },
        { key: "description.1", values: ["burstRadius", "numbChance", "numbTicks"] },
        { key: "description.2", values: ["tempo", "recharge"] },
        { key: "spread.on", values: ["splashShare","splashTargets"], when: function (context) { return read(context.detail.values, ["spread"]) === true; } },
        { key: "spread.off", values: [], when: function (context) { return read(context.detail.values, ["spread"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.bolt"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.numbChance", "tier.1.burstRadius"] }
    ]);
}
