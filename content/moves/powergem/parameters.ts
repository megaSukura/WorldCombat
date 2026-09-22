/**
 * 力量宝石 / powergem —— 参数与伤害段。
 *
 * 原生事实：Rock／特殊／威力 80／命中 100／PP 20／无次要效果（Cobblemon 1.8，62 位学习者）。
 *
 * 翻译：把「发射如宝石般闪耀的光芒攻击对手」落成一道**又细又长、会穿透的宝石光线**：
 *   光先在身前收进一枚宝石般的焦点，再沿瞄准方向射出一条笔直的细线；线路上每个敌人依次被贯穿，
 *   越远的人分到的光越少（远端保留），击点崩出一簇碎晶。光走直线、被方块挡住，所以掩体是它唯一的空门；
 *   它是宝石家族里唯一以「穿透一条线」为形状的，不收束、不带状态，把一切都给射程与贯穿。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   ray          光线威力：特攻定亮度，等级定聚光纯度。
 *   beamLength   光线射程：特攻与等级决定能射多远。
 *   beamWidth    光线粗细：碰撞箱宽度决定宝石焦点多大。
 *   falloff      远端保留：特攻决定贯穿到远端还剩几成。
 *   shards       碎晶数：特攻与等级决定击点崩出的碎晶数量，直接驱动表现。
 *   tempo/aftercast/recharge 速度决定起手、收招与冷却。
 *
 * 配置 focus（聚晶）：开启＝光线细到 0.6、射程 +2 格、威力 ×1.15，但起手 +2 刻、冷却 +4 刻；
 *   关闭＝更粗更宽的光柱，容易串到成排的敌人。两向各有适用局面（串排 vs 单点重击）。
 *
 * 伤害段 ray：光线贯穿时在每个人身上各自结算一次。
 */
namespace PokemonSkills {
    export const powergemId = "powergem";
    export const powergemScene = "world_combat:move_powergem";
    export const powergemPierceText = "world_combat.move.powergem.text.pierce";

    actionParameters.define(powergemId, {
        /** 光线威力：基础 72，特攻每比 60 多 1 加 0.2（夹 -16..30），等级每比 30 高 1 加 0.4（夹 0..12）；聚晶 ×1.15；夹在 40..140。 */
        ray: formula(
            F.base(72).plus(F.stat("specialAttack").minus(60).times(0.2).clamp(-16, 30))
                .plus(F.level().minus(30).times(0.4).clamp(0, 12))
                .times(F.when(F.pref("focus"), F.const(1.15), F.const(1)))
                .clamp(40, 140).round(1),
            "光线威力", {
                unit: "威力",
                description: "贯穿时在每个人身上各自结算一次的基础威力；特攻越高越亮，等级越高聚得越纯，聚晶形态更集中。对手防御、相性与暴击在命中时另算。"
            }),
        /** 光线射程：基础 12 格，特攻每比 60 多 1 加 0.05（夹 -2..3），等级每比 30 高 1 加 0.04（夹 0..2）；聚晶 +2；夹在 9..18。 */
        beamLength: formula(
            F.base(12).plus(F.stat("specialAttack").minus(60).times(0.05).clamp(-2, 3))
                .plus(F.level().minus(30).times(0.04).clamp(0, 2))
                .plus(F.when(F.pref("focus"), F.const(2), F.const(0)))
                .clamp(9, 18).round(2),
            "光线射程", {
                unit: "格",
                description: "这道光能射到多远；特攻高、等级高、聚晶形态射得更远。它也是本招的实际射程来源。"
            }),
        /** 光线粗细：基础 0.5 格，碰撞箱每比 0.9 宽 1 格加 0.25（夹 -0.1..0.5）；聚晶 ×0.6；夹在 0.28..1.0。 */
        beamWidth: formula(
            F.base(0.5).plus(F.body("width").minus(0.9).times(0.25).clamp(-0.1, 0.5))
                .times(F.when(F.pref("focus"), F.const(0.6), F.const(1)))
                .clamp(0.28, 1.0).round(2),
            "光线粗细", {
                unit: "格",
                description: "光线判定列的半宽；身板宽的个体宝石焦点更大，聚晶形态细成一条线，更容易只串中一排。"
            }),
        /** 远端保留：基础 0.55，特攻每比 60 多 1 加 0.0012（夹 -0.06..0.12）；夹在 0.42..0.72。 */
        falloff: percent(
            F.base(0.55).plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.06, 0.12)).clamp(0.42, 0.72).round(3),
            "远端保留", "贯穿到射程远端时还剩的威力比例；近端吃满、越远越淡，特攻高的个体衰减更慢。"),
        /** 碎晶数：基础 10，特攻每比 60 多 1 加 0.12，等级每比 30 高 1 加 0.15，夹在 8..28 并向下取整。 */
        shards: formula(
            F.base(10).plus(F.stat("specialAttack").minus(60).times(0.12))
                .plus(F.level().minus(30).times(0.15)).clamp(8, 28).floor(),
            "碎晶数", {
                unit: "个",
                description: "击点崩出的宝石碎晶数量；特攻与等级越高越多，直接驱动画面的发射量。"
            }),
        /** 起手：基础 13 刻，速度每比 60 快 1 减 0.04 刻，聚晶 +2；夹在 7..18。 */
        tempo: seconds(
            F.base(13).minus(F.stat("speed").minus(60).times(0.04))
                .plus(F.when(F.pref("focus"), F.const(2), F.const(0))).clamp(7, 18).round(0),
            "起手", "把光收进宝石焦点、聚到能发射的时间；速度越快越短，聚晶多花一点。"),
        /** 收招：基础 8 刻，速度每比 60 快 1 减 0.01 刻，夹在 4..10。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.01)).clamp(4, 10).round(0),
            "收招", "光线射出后的收势。"),
        /** 冷却：基础 34 刻，速度每比 60 快 1 减 0.06 刻，聚晶 +4；夹在 20..56。 */
        recharge: seconds(
            F.base(34).minus(F.stat("speed").minus(60).times(0.06))
                .plus(F.when(F.pref("focus"), F.const(4), F.const(0))).clamp(20, 56).round(0),
            "冷却", "两次发射之间的等待；速度越快回得越快，聚晶形态要缓更久。")
    });

    defineDamage(powergemId, "ray", {});

    stages(powergemId, [
        { level: 38, values: { ray: 84, beamLength: 13 } },
        { level: 56, values: { ray: 96, shards: 14 } }
    ]);

    describe(powergemId, [
        { key: "description.0", values: ["ray"] },
        { key: "description.1", values: ["beamLength", "beamWidth", "falloff"] },
        { key: "description.2", values: ["shards"] },
        { key: "description.3", values: ["pref.focus"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.ray", "tier.0.beamLength"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.ray", "tier.1.shards"] }
    ]);
}
