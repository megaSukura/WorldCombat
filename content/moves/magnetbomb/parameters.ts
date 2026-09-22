/**
 * 磁铁炸弹 / magnetbomb —— 参数与伤害段。
 *
 * 原生事实：Steel、物理、威力 60、命中必定（accuracy true）、PP 20、弹（bullet，不接触）、无次要效果（Cobblemon 1.8）。
 * 翻译：把「发射吸住对手的钢铁炸弹」翻成即时战斗里的**几枚会吸上去、稍后再炸的钢弹**——
 *   钢弹被磁力引着拐向对手，一碰到就「啪」地吸在它身上（物品栏看得见的身份），引信走完一起起爆；
 *   因为粘住了，躲不掉，这就是「必中」的样子。每枚炸弹独立吸附、独立起爆，命中的分数由 `bombs` 决定。
 * 数据分散（每个参数读不同的精灵数据）：
 *   blast     总威力随物攻；
 *   bombs     弹数随物攻与等级；
 *   bombSpeed 弹速随速度；
 *   pull      磁吸转向随物攻；
 *   fuse      引信随等级；
 *   radius    爆炸半径随体型高度；
 *   reach     锁定距离随等级与物攻；
 *   tempo／settle／recharge 起手／收招／冷却随速度与等级。
 * 配置 cluster（集火／分投）双向取舍：集火把全部弹砸向选定目标（单体重、起手多 2 刻）；
 *   分投把弹分给射程内的每个敌人（覆盖广，但单个目标只吃到一份）。
 *
 * 伤害段：blast 是全部钢弹合起来那一次爆炸。
 */
namespace PokemonSkills {
    actionParameters.define("magnetbomb", {
        /** 总威力：物攻每比 60 多 1 加 0.35，夹在 35..110。 */
        blast: formula(
            F.base(60, "基础").plus(F.stat("attack").minus(60).times(0.35).as("物攻")).clamp(35, 110).round(1),
            "总威力", {
                unit: "威力",
                description: "全部钢弹合起来造成的威力；物攻越高越重。每枚弹分摊一份，各自吸住后起爆。对手防御、相性与暴击在命中时另算。"
            }),
        /** 弹数：基础 3，物攻每比 60 多 1 加 0.02，等级每比 30 高 1 加 0.03，夹在 2..7 并向下取整。 */
        bombs: formula(
            F.base(3, "基础").plus(F.stat("attack").minus(60).times(0.02).as("物攻"))
                .plus(F.level().minus(30).times(0.03).as("等级"))
                .clamp(2, 7).floor(),
            "弹数", {
                unit: "枚",
                description: "一次发射几枚钢弹；物攻与等级越高越多。弹数同时决定画面里吸住的炸弹数与分投的覆盖。"
            }),
        /** 弹速：基础 0.9 格/刻，速度每比 60 快 1 加 0.003，夹在 0.7..1.3。 */
        bombSpeed: formula(
            F.base(0.9, "基础").plus(F.stat("speed").minus(60).times(0.003).as("速度")).clamp(0.7, 1.3).round(2),
            "弹速", {
                unit: "格/刻",
                description: "钢弹飞向对手的速度；越快吸住得越早。"
            }),
        /** 磁吸转向：基础 12 度/刻，物攻每比 60 多 1 加 0.08，夹在 8..22。 */
        pull: formula(
            F.base(12, "基础").plus(F.stat("attack").minus(60).times(0.08).as("物攻")).clamp(8, 22).round(1),
            "磁吸转向", {
                unit: "度/刻",
                description: "钢弹每刻被磁力拉向对手的最大角度；物攻越强磁吸越死，越难甩掉。"
            }),
        /** 引信：基础 24 刻，等级每比 20 高 1 加 0.5，夹在 14..50。 */
        fuse: seconds(
            F.base(24, "基础").plus(F.level().minus(20).max(0).times(0.5).as("等级")).clamp(14, 50).round(0),
            "引信", "钢弹吸住后多久起爆；这段时间对手读得到炸弹，能抢先治疗或加防。"),
        /** 爆炸半径：基础 1.2 格，碰撞箱每比 1.4 高 1 格加 0.3，夹在 0.9..2.0。 */
        radius: formula(
            F.base(1.2, "基础").plus(F.body("height").minus(1.4).times(0.3).as("体型")).clamp(0.9, 2.0).round(2),
            "爆炸半径", {
                unit: "格",
                description: "每枚钢弹起爆时罩住多大一圈；大个子的弹更宽，能溅到旁边的人。"
            }),
        /** 锁定距离：基础 8 格，等级每比 30 高 1 加 0.06，物攻每比 60 多 1 加 0.03，夹在 5..13。 */
        reach: formula(
            F.base(8, "基础").plus(F.level().minus(30).times(0.06).as("等级"))
                .plus(F.stat("attack").minus(60).times(0.03).as("物攻"))
                .clamp(5, 13).round(1),
            "锁定距离", {
                unit: "格",
                description: "钢弹能吸到多远的对手；等级与物攻越高越远。它也是本招的实际射程。"
            }),
        /** 起手：基础 9 刻，速度每比 60 快 1 短 0.04，夹在 5..13。 */
        tempo: seconds(
            F.base(9, "基础").minus(F.stat("speed").minus(60).times(0.04).as("速度")).clamp(5, 13).round(0),
            "起手", "给弹上磁、张开弹仓需要多久；快个体更早发射。"),
        /** 收招：基础 8 刻，夹在 4..14。 */
        settle: seconds(F.base(8, "基础").clamp(4, 14).round(0), "收招", "发射之后的收势时间。"),
        /** 冷却：基础 90 刻，等级每比 20 高 1 短 0.7，夹在 45..120。 */
        recharge: seconds(
            F.base(90, "基础").minus(F.level().minus(20).max(0).times(0.7).as("等级")).clamp(45, 120).round(0),
            "冷却", "两次发射之间的等待；等级越高越熟练。")
    });

    defineDamage("magnetbomb", "blast", {}, {});

    stages("magnetbomb", [
        { level: 34, values: { blast: 72, bombs: 4 } },
        { level: 52, values: { blast: 90, fuse: 34 } }
    ]);

    describe("magnetbomb", [
        { key: "description.0", values: ["blast", "bombs"] },
        { key: "description.1", values: ["fuse", "radius"] },
        { key: "description.2", values: ["pull", "reach", "bombSpeed"] },
        { key: "cluster.on", values: [], when: function (context) { return read(context.detail.values, ["cluster"]) === true; } },
        { key: "cluster.off", values: [], when: function (context) { return read(context.detail.values, ["cluster"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blast", "tier.0.bombs"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.blast", "tier.1.fuse"] }
    ]);
}
