/**
 * 高速星星 / swift 的参数与伤害段。
 *
 * 原生事实：Normal、特殊、威力 60、命中必定（accuracy true）、PP 20、打所有相邻对手、无次要效果（Cobblemon 1.8）。
 * 翻译：把“发射星形的光攻击对手，攻击必定会命中”翻成即时战斗里的一圈追星——星光先在身周结成环，
 * 再向四面迸出一圈星，每颗星自己拐弯追向一个对手。星星会追，所以躲不开：这就是“必定命中”在场上看得见的样子。
 * 数据分散：特攻定单星威力与星数，等级补星数，速度定转向与飞行速度，身高定判定半径，等级定锁定距离。
 * 配置 scatter（散星）让星分散到多个对手：覆盖更广但选定目标吃到的星更少、起手更慢。
 *
 * 伤害段：star 是每一颗星的那一下。
 */
namespace PokemonSkills {
    actionParameters.define("swift", {
        /** 单星威力：特攻每比 60 多 1 加 0.11，夹在 12..46。 */
        star: formula(
            F.base(24).plus(F.stat("specialAttack").minus(60).times(0.11)).clamp(12, 46).round(1),
            "单星威力", {
                unit: "威力",
                description: "每一颗星造成的威力；特攻越高星越利。对手防御、相性与暴击在命中时另算。"
            }),
        /** 星数：基础 3，特攻每比 60 多 1 加 0.02，等级每比 30 高 1 加 0.02，夹在 2..7 并向下取整。 */
        stars: formula(
            F.base(3).plus(F.stat("specialAttack").minus(60).times(0.02)).plus(F.level().minus(30).times(0.02))
                .clamp(2, 7).floor(),
            "星数", {
                unit: "颗",
                description: "一次迸出几颗星；特攻与等级越高星越多，散星时能覆盖更多对手。"
            }),
        /** 转向：基础 9 度/刻，速度每比 60 快 1 加 0.06 度，夹在 6..16。 */
        turn: formula(
            F.base(9).plus(F.stat("speed").minus(60).times(0.06)).clamp(6, 16).round(1),
            "转向", {
                unit: "度/刻",
                description: "星每刻朝目标转向的最大角度；速度快的个体拐得更急，追得更死。"
            }),
        /** 星速：基础 1.0 格/刻，速度每比 60 快 1 加 0.004，夹在 0.8..1.5。 */
        starSpeed: formula(
            F.base(1.0).plus(F.stat("speed").minus(60).times(0.004)).clamp(0.8, 1.5).round(2),
            "星速", {
                unit: "格/刻",
                description: "星飞行的速度；越快接触来得越早。转向够快时，慢星也能追到人。"
            }),
        /** 锁定距离：基础 12 格，等级每比 30 高 1 加 0.05，夹在 10..15。 */
        lockRange: formula(
            F.base(12).plus(F.level().minus(30).times(0.05)).clamp(10, 15).round(1),
            "锁定距离", {
                unit: "格",
                description: "星星能锁定并追到多远的对手；等级高的个体星追得更远。"
            }),
        /** 判定半径：基础 0.3 格，碰撞箱每比 1.4 高 1 格加 0.05，夹在 0.25..0.5。 */
        collisionRadius: formula(
            F.base(0.3).plus(F.body("height").minus(1.4).times(0.05)).clamp(0.25, 0.5).round(2),
            "判定半径", {
                unit: "格",
                description: "每颗星的横向判定半径；大个子迸出的星更大。"
            })
    });

    defineDamage("swift", "star", {});

    stages("swift", [
        { level: 34, values: { star: 30, stars: 4 } },
        { level: 52, values: { star: 40, turn: 13 } }
    ]);

    describe("swift", [
        { key: "description.0", values: ["star", "stars"] },
        { key: "description.additional", values: [] },
        { key: "description.1", values: ["turn", "starSpeed", "lockRange"] },
        { key: "description.2", values: ["collisionRadius"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.star", "tier.0.stars"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.star", "tier.1.turn"] }
    ]);
}
