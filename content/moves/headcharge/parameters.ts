/**
 * 爆炸头突击 / headcharge 的参数与伤害段。
 *
 * 原生事实：一般、物理、威力 120、命中 100、PP 15、接触、反作用力 1/4（Cobblemon 1.8，仅爆炸头水牛 1 位学习者）。
 * 描述原文「用厉害的爆炸头猛撞向对手」「蓬松的体毛会把伤害都吸收掉」是灵感来源：本招是**一往无前的贯通头撞**——
 * 低头沿直线长驱直入，把挡路的一个个撞飞，不因撞中而停下；蓬松的头毛替它卸掉一部分反噬，所以每一记比同族都轻，
 * 但撞的人越多、反噬累加得越多。它不冲空自伤：没撞到就一路冲过去。
 *
 * 数据分散（每项依赖不同的精灵数据）：
 *   ram     撞劲：物攻与体重打底；锁定式为了转向牺牲一档。
 *   charge  冲程：速度决定冲得多远，兼作射程。
 *   pace    推进速度：速度。
 *   radius  判定半径：体型高度（爆炸头本身就很宽）。
 *   recoil  单次反噬比例：防御与体型高度共同减轻——头毛越厚卸得越多，这是它区别于双刃头锤的招牌。
 *   through 贯通占比：后续目标吃到的比例，随物攻微调。
 *   shove   击退：体重与物攻；锁定式收一档。
 *   afro    头毛/尘屑数量：体型高度与速度派生，粒子按它发射。
 *   tempo/aftercast/recharge 起手、收招与冷却都吃速度，锁定式起手更久。
 *
 * 配置 hunt（锁定）双向取舍：锁定＝冲锋中会朝最近敌人微调方向（有转向上限），更容易撞到侧移的对手，
 * 但威力与击退下降、起手更长；直线＝一条死直线，威力与击退拉满，但对手一个侧步就能让开。两个方向各有适用局面。
 *
 * 伤害段 ram：这一头随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("headcharge", {
        /** 撞劲：基础 120，物攻每比 60 多 1 加 0.5（夹 -28..52），体重每比 60 多 1 加 0.18（夹 -10..34）；锁定 ×0.92；夹 80..230。 */
        ram: formula(
            F.base(120).plus(F.stat("attack").minus(60).times(0.5).clamp(-28, 52))
                .plus(F.body("weight").minus(60).times(0.18).clamp(-10, 34))
                .times(F.when(F.pref("hunt", text("worldcombat.skill.headcharge.preference.hunt")), F.const(0.92), F.const(1)))
                .clamp(80, 230).round(1),
            "撞劲", {
                unit: "威力",
                description: "爆炸头撞实那一下的威力；物攻越重、身体越沉越猛。锁定式为了转向牺牲一档。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲程：基础 5.6 格，速度每比 60 快 1 加 0.025（夹 -1.0..2.2）；夹 4.0..9.0。 */
        charge: formula(
            F.base(5.6).plus(F.stat("speed").minus(60).times(0.025).clamp(-1, 2.2)).clamp(4, 9).round(2),
            "冲程", {
                unit: "格",
                description: "从起步到刹停的总位移，也是本招的射程基准；腿快的人冲得更长，能串起更远的一串人。"
            }),
        /** 推进速度：基础 1.0 格/刻，速度每比 60 快 1 加 0.006（夹 -0.2..0.6）；夹 0.75..1.7。 */
        pace: formula(
            F.base(1).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.2, 0.6)).clamp(0.75, 1.7).round(2),
            "推进速度", {
                unit: "格/刻",
                description: "长驱直入时每刻前进的距离；越快越难被让开，冲空也冲得更远。"
            }),
        /** 判定半径：基础 0.62 格，碰撞箱每比 1.4 高 1 格加 0.16；夹 0.46..1.05。 */
        radius: formula(
            F.base(0.62).plus(F.body("height").minus(1.4).times(0.16)).clamp(0.46, 1.05).round(2),
            "判定半径", {
                unit: "格",
                description: "爆炸头扫过的横向判定半径；身板越大（头毛越炸）扫得越宽，越难从旁边擦过去。"
            }),
        /** 单次反噬：基础 0.16，防御每比 60 多 1 少 0.0008（上限 -0.10），体型每比 1.4 高 1 格少 0.02（上限 -0.06）；夹 0.08..0.28。 */
        recoil: formula(
            F.base(0.16).minus(F.stat("defence").minus(60).times(0.0008).clamp(0, 0.1))
                .minus(F.body("height").minus(1.4).times(0.02).clamp(0, 0.06))
                .clamp(0.08, 0.28).round(3),
            "单次反噬", {
                unit: "比例",
                description: "每撞实一个目标，按它实际受到的伤害反噬自己的比例；防御越高、体型越大（头毛越厚）越轻。撞的人越多，累加得越多，这是本招唯一的代价。"
            }),
        /** 贯通占比：基础 0.75，物攻每比 60 多 1 加 0.001（夹 -0.1..0.12）；夹 0.6..0.9。 */
        through: percent(
            F.base(0.75).plus(F.stat("attack").minus(60).times(0.001).clamp(-0.1, 0.12)).clamp(0.6, 0.9),
            "贯通占比", "撞穿第一个目标之后，后面的人吃到的威力比例；反噬也按各自实际受到的伤害减少。"),
        /** 击退：基础 1.0 格，体重每比 60 多 1 加 0.005（夹 -0.3..1.1），物攻每比 60 多 1 加 0.004（夹 -0.2..0.6）；锁定 ×0.85；夹 0.5..2.6。 */
        shove: formula(
            F.base(1).plus(F.body("weight").minus(60).times(0.005).clamp(-0.3, 1.1))
                .plus(F.stat("attack").minus(60).times(0.004).clamp(-0.2, 0.6))
                .times(F.when(F.pref("hunt", text("worldcombat.skill.headcharge.preference.hunt")), F.const(0.85), F.const(1)))
                .clamp(0.5, 2.6).round(2),
            "击退", {
                unit: "格",
                description: "每撞中一个目标把它沿冲撞方向顶开多远；越重、物攻越高撞得越远，锁定式收一档。"
            }),
        /** 头毛尘屑数量：基础 24，体型每比 1.4 高 1 格加 6（夹 -8..40），速度每比 60 快 1 加 0.3（夹 -8..20）；夹 18..72。 */
        afro: formula(
            F.base(24).plus(F.body("height").minus(1.4).times(6).clamp(-8, 40))
                .plus(F.stat("speed").minus(60).times(0.3).clamp(-8, 20)).clamp(18, 72).round(0),
            "头毛尘屑数量", {
                unit: "个",
                description: "冲锋与命中扬起的头毛、尘屑数量，随体型与速度增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 10 刻，速度每比 60 快 1 少 0.02（夹 -3..3），锁定 +2；夹 6..16。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 3))
                .plus(F.when(F.pref("hunt", text("worldcombat.skill.headcharge.preference.hunt")), F.const(2), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "低头、把爆炸头鼓起来蓄势的时间；速度越快越短，锁定式要先看清目标、起手更久。"),
        /** 收招：基础 12 刻，速度每比 60 快 1 少 0.02（夹 -3..4）；夹 7..18。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4)).clamp(7, 18).round(0),
            "收招", "长驱直入后的收势；速度越快越利落。"),
        /** 冷却：基础 48 刻，速度每比 60 快 1 少 0.03（夹 -6..10）；夹 32..64。 */
        recharge: seconds(
            F.base(48).minus(F.stat("speed").minus(60).times(0.03).clamp(-6, 10)).clamp(32, 64).round(0),
            "冷却", "两次爆炸头突击之间的间隔；速度越快回得越快。"),
        traceAhead: hidden(1.25),
        minimumMove: hidden(0.05),
        /** 锁定时的每刻最大转向角（度）。 */
        turnRate: hidden(12)
    });

    defineDamage("headcharge", "ram", {}, { contact: true });

    stages("headcharge", [
        { level: 40, values: { ram: 138 } },
        { level: 60, values: { ram: 164, through: 0.8 } }
    ]);

    describe("headcharge", [
        { key: "description.0", values: ["ram", "charge", "pace", "radius"] },
        { key: "description.1", values: ["recoil", "through", "shove"] },
        { key: "hunt.on", values: [], when: function (context) { return read(context.detail.values, ["hunt"]) === true; } },
        { key: "hunt.off", values: [], when: function (context) { return read(context.detail.values, ["hunt"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.ram"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.ram", "tier.1.through"] }
    ]);
}
