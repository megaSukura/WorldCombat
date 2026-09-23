/**
 * 死缠烂打 / infestation 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Bug、特殊、威力 20、命中 100、PP 20、优先度 0、contact、
 * volatile partiallytrapped（4–5 回合，期间对手无法逃走）。
 *
 * 翻译：保留「甩出一团虫子缠上目标、持续啃咬、期间对手无法逃走」，翻成即时战斗里**持续附着 + 定身**：
 * 命中时一次小特殊伤害（bite），并把共享身份 `world_combat:status/partiallytrapped`（本单元效果）挂到目标身上；
 * 绑定效果按 `interval` 每隔一段时间咬一口（按目标最大生命的一个比例），同时效果自带的速度归零让目标无法移动。
 * 数据分散：特攻决定初击、每口啃咬的比例与射程，速度决定弹速与啃咬间隔，体型决定虫群判定，
 * 等级决定持续多久；这是本组唯一的持续伤害兼定身，用时间换空间。
 *
 * 伤害段名 bite：命中那一下随精灵数据变化的部分；之后的啃咬按目标最大生命比例（swarmShare）结算。
 */
namespace PokemonSkills {
    actionParameters.define("infestation", {
        /** 初击威力：特攻每比 60 多 1 加 0.25（上限 +16），等级每比 20 多 1 加 0.3（上限 +12）；夹在 16..60。 */
        bite: formula(
            F.base(20)
                .plus(F.stat("specialAttack").minus(60).times(0.25).clamp(-8, 16))
                .plus(F.level().minus(20).times(0.3).clamp(0, 12))
                .clamp(16, 60).round(1),
            "初击威力", {
                unit: "威力",
                description: "虫群扑上的一下基础威力；之后每口啃咬另按目标最大生命的比例结算。"
            }),
        /** 每口啃咬：基础 1.8%，特攻每比 60 多 1 加 0.02%；夹在 1.0%..4.0%。 */
        swarmShare: percent(
            F.base(0.018).plus(F.stat("specialAttack").minus(60).times(0.0002).clamp(-0.006, 0.022)).clamp(0.010, 0.040).round(4),
            "每口啃咬", "每过一个啃咬间隔，按目标最大生命的这个比例咬掉一口。"),
        /** 缠绕持续：基础 120 tick，特攻每比 60 多 1 加 0.5 tick；夹在 80..240 tick。 */
        duration: seconds(
            F.base(120).plus(F.stat("specialAttack").minus(60).times(0.5).clamp(-24, 90)).clamp(80, 240).round(),
            "缠绕持续", "虫群留在目标身上的总时长；期间目标无法移动。"),
        /** 啃咬间隔：基础 24 tick，速度每比 60 快 1 减 0.05 tick；夹在 12..30 tick。 */
        interval: seconds(
            F.base(24).minus(F.stat("speed").minus(60).times(0.05).clamp(-8, 8)).clamp(12, 30).round(),
            "啃咬间隔", "每隔多久咬一口；越快越密的个体咬得越频繁。"),
        /** 弹速：基础 0.8，速度每比 60 快 1 加 0.006；夹在 0.5..1.4。 */
        speed: formula(
            F.base(0.8).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.25, 0.6)).clamp(0.5, 1.4).round(2),
            "弹速", {
                unit: "格/刻",
                description: "虫群飞向目标的速度。"
            }),
        /** 射程：基础 11，特攻每比 60 多 1 加 0.04；夹在 10..18。 */
        reach: formula(
            F.base(11).plus(F.stat("specialAttack").minus(60).times(0.04).clamp(-3, 7)).clamp(10, 18).round(1),
            "射程", {
                unit: "格",
                description: "能把虫群甩到多远。"
            }),
        /** 虫群判定半径：基础 0.35，碰撞箱每比 1.4 高 1 格加 0.1；夹在 0.28..0.6。 */
        collisionRadius: formula(
            F.base(0.35).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.28, 0.6).round(2),
            "虫群判定半径", {
                unit: "格",
                description: "飞行途中撞上活体即附着的判定半径。"
            }),
        /** 起手：基础 8 tick，速度每比 60 快 1 减 0.02 tick；夹在 5..12 tick。 */
        charge: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02)).clamp(5, 12).round(),
            "起手", "把虫群聚拢的准备时间。")
    });

    stages("infestation", [
        { level: 30, values: { bite: 30 } },
        { level: 50, values: { bite: 40 } }
    ]);

    defineDamage("infestation", "bite", {}, { contact: true });

    describe("infestation", [
        { key: "description.0", values: ["bite"] },
        { key: "description.1", values: ["duration","swarmShare","interval"] },
        { key: "description.2", values: ["reach","speed","charge","collisionRadius"] }
    ]);
}
