/**
 * 终极冲击 / gigaimpact 的参数与伤害段。
 *
 * 原生事实（Cobblemon 1.8）：Normal、物理、威力 150、命中 90、PP 5、优先度 0、contact、
 * self mustrecharge（下一回合无法行动）。
 *
 * 翻译：保留「把全身力量压进一记直线冲撞」，把「下一回合无法动弹」翻成即时战斗里的**真实力竭窗口**：
 * 撞完之后施法者被挂上 `world_combat:status/mustrecharge`（本单元的效果），期间无法行动、无法移动——
 * 这是这一招公开的可惩罚代价，也是它与普通冲锋最大的区别。数据分散：攻击与体重决定这一撞的力道，
 * 速度决定推进与冲程，体型决定横向判定，**体重与速度共同决定力竭多久**（越重越收不住，越快的个体恢复越快）；
 * 配置 brace（收势）把冲程/击退/力竭一起换向：硬冲换更远的冲程与更大的击退、更长的力竭；收势换更短的自锁、
 * 更小的冲击范围。命中不瞄偏（原生 90 已属同类最稳）。
 *
 * 伤害段名 crash：这一撞随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("gigaimpact", {
        /** 冲击威力：攻击每比 60 多 1 加 0.8（上限 +70），体重每比 60 多 1 加 0.12（上限 +30）；收势 ×0.95 / 硬冲 ×1.06；夹在 95..245。 */
        crash: formula(
            F.base(150)
                .plus(F.stat("attack").minus(60).times(0.8).clamp(-30, 70))
                .plus(F.body("weight").minus(60).times(0.12).clamp(-10, 30))
                .times(F.when(F.pref("brace"), F.const(0.95), F.const(1.06)))
                .clamp(95, 245).round(1),
            "冲击威力", {
                unit: "威力",
                description: "本段伤害的基础威力；力量与份量一起压进这一撞。对手防御、相性与暴击在命中时另算。"
            }),
        /** 推进速度：速度每比 60 快 1 加 0.007；收势 ×0.95 / 硬冲 ×1.05；夹在 0.45..1.5。 */
        speed: formula(
            F.base(0.72).plus(F.stat("speed").minus(60).times(0.007).clamp(-0.25, 0.8))
                .times(F.when(F.pref("brace"), F.const(0.95), F.const(1.05)))
                .clamp(0.45, 1.5).round(2),
            "推进速度", {
                unit: "格/刻",
                description: "冲撞时每刻前进的距离；越快越难被躲。"
            }),
        /** 冲程：基础 4.2，速度每比 60 快 1 加 0.025，体重每比 60 多 1 加 0.004；收势 ×0.82 / 硬冲 ×1.12；夹在 3.0..8.0。 */
        lunge: formula(
            F.base(4.2).plus(F.stat("speed").minus(60).times(0.025).clamp(-1.2, 2.6))
                .plus(F.body("weight").minus(60).times(0.004).clamp(-0.4, 1.4))
                .times(F.when(F.pref("brace"), F.const(0.82), F.const(1.12)))
                .clamp(3.0, 8.0).round(2),
            "冲程", {
                unit: "格",
                description: "从起步到收势的总位移；驱动目标接受范围，也决定这一撞够到多远。"
            }),
        /** 判定半径：基础 0.55，碰撞箱每比 1.4 高 1 格加 0.18；夹在 0.4..1.05。 */
        collisionRadius: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.18)).clamp(0.4, 1.05).round(2),
            "判定半径", {
                unit: "格",
                description: "撞上活体的横向判定半径；身板越高撞得越宽。"
            }),
        /** 顶开距离：基础 1.1，攻击每比 60 多 1 加 0.01，体重每比 60 多 1 加 0.004；收势 ×0.7 / 硬冲 ×1.2；夹在 0.5..3.2。 */
        push: formula(
            F.base(1.1).plus(F.stat("attack").minus(60).times(0.01).clamp(-0.3, 0.9))
                .plus(F.body("weight").minus(60).times(0.004).clamp(-0.3, 0.8))
                .times(F.when(F.pref("brace"), F.const(0.7), F.const(1.2)))
                .clamp(0.5, 3.2).round(2),
            "顶开距离", {
                unit: "格",
                description: "命中后把目标沿冲撞方向顶开的距离。"
            }),
        /** 力竭时长：基础 46 tick，体重每比 60 多 1 加 0.12 tick（上限 +26），速度每比 60 快 1 减 0.06 tick（上限 −10）；收势 ×0.72 / 硬冲 ×1.15；夹在 24..96 tick。 */
        exhaust: seconds(
            F.base(46)
                .plus(F.body("weight").minus(60).times(0.12).clamp(-8, 26))
                .minus(F.stat("speed").minus(60).times(0.06).clamp(-10, 6))
                .times(F.when(F.pref("brace"), F.const(0.72), F.const(1.15)))
                .clamp(24, 96).round(),
            "力竭时长", "撞完后无法行动、无法移动的时间；越重的身体越收不住，越快的个体恢复越快。"),
        /** 起手：基础 7 tick，速度每比 60 快 1 减 0.02 tick；夹在 4..11 tick。 */
        charge: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02)).clamp(4, 11).round(),
            "起手", "把身体压低的准备时间；敏捷的个体起手更利落。"),
        traceAhead: hidden(1.3),
        minimumMove: hidden(0.05)
    });

    stages("gigaimpact", [
        { level: 32, values: { crash: 164 } },
        { level: 52, values: { crash: 180 } }
    ]);

    defineDamage("gigaimpact", "crash", {}, { contact: true });

    describe("gigaimpact", [
        { key: "description.0", values: ["crash"] },
        { key: "description.1", values: ["push", "exhaust"] },
        { key: "description.2", values: ["lunge", "speed", "collisionRadius", "charge"] }
    ]);
}
