/**
 * 伏特攻击 / volttackle 的参数与伤害段。
 *
 * 原生事实：电、物理、威力 120、命中 100、PP 15、接触、反作用力 1/3、10% 麻痹（Cobblemon 1.8，4 位学习者）。
 * 翻译：把「让电流覆盖全身猛撞向对手，自己也会受到不小的伤害，有时让对手麻痹」落成一次**蓄电后的爆冲**——
 * 起手把电荷长时间聚到全身（可被打断的准备期），提交后一记带电爆冲撞上去；撞实的一刻积压的电荷向四周炸开，
 * 沿地面电到**旁边的其他人**，目标被顶飞、自己按比例反噬。它是本族里唯一会把电波及旁人的一招。
 *
 * 与同族分开：电光是贴身短促的一点电、火焰轮是滚动的火、闪焰冲锋是拖火线的火；伏特攻击的辨识点是
 * 起手时越聚越大的电球与命中时四散的电弧。疯狂伏特同是带电冲锋，但只打一个、没有蓄电、也没有波及。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   brunt      爆冲威力：物攻给狠度、特攻给电荷量；泄放式把电分给旁人、略收。
 *   charge     冲程：速度决定起步距离；泄放式收得更短。
 *   pace       推进速度：速度决定每刻前进多少。
 *   radius     判定半径：碰撞箱高度决定撞面大小。
 *   recoil     反噬比例：防御越高越轻、体重越大反噬越沉；泄放式更重。
 *   numbChance 麻痹概率：特攻与等级；泄放式略降。
 *   numbTicks  麻痹时长：特攻与等级。
 *   arc        放电半径：碰撞箱高度（电荷铺得开）＋特攻（电荷量）。
 *   arcPower   波及占比：特攻决定分给旁人的比例。
 *   arcChance  波及麻痹概率：特攻决定旁人被电麻的机会。
 *   shove      击退：体重决定把目标顶多远。
 *   sparks     电火花数量：速度派生，表现按它发射。
 *   tempo/aftercast/recharge  速度与特攻决定蓄电／收招／冷却；本族最慢。
 *
 * 配置 discharge（泄放式 / 聚敛式）双向取舍：
 *   泄放式＝放电半径与波及威力更高、反噬更重、冲程更短，单体略轻——把电荷摊开电一群人；
 *   聚敛式＝单体威力更高、反噬更轻、冲程更长，放电半径与波及威力收小——把电全部灌进一个目标。
 * 两个方向各有局面（群战 vs 点杀）。
 *
 * 伤害段 surge：这一撞带电的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("volttackle", {
        /** 爆冲威力：基础 120，物攻每比 60 多 1 加 0.5（夹 -28..56），特攻每比 60 多 1 加 0.3（夹 -14..34）；泄放 ×0.9 / 聚敛 ×1.12；夹 78..235。 */
        surge: formula(
            F.base(120).plus(F.stat("attack").minus(60).times(0.5).clamp(-28, 56))
                .plus(F.stat("specialAttack").minus(60).times(0.3).clamp(-14, 34))
                .times(F.when(F.pref("discharge", text("worldcombat.skill.volttackle.preference.discharge")), F.const(0.9), F.const(1.12)))
                .clamp(78, 235).round(1),
            "爆冲威力", {
                unit: "威力",
                description: "带电爆冲撞实这一下的基础威力；物攻越重、蓄的电荷（特攻）越多越猛。泄放式把电分给旁人、略收一档，聚敛式一次全灌进目标。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲程：基础 4.8 格，速度每比 60 快 1 加 0.026（夹 -1.0..2.0），体重每比 60 多 1 加 0.003（夹 -0.25..0.8）；泄放 ×0.88 / 聚敛 ×1.06；夹 3.2..7.2。 */
        charge: formula(
            F.base(4.8).plus(F.stat("speed").minus(60).times(0.026).clamp(-1.0, 2.0))
                .plus(F.body("weight").minus(60).times(0.003).clamp(-0.25, 0.8))
                .times(F.when(F.pref("discharge", text("worldcombat.skill.volttackle.preference.discharge")), F.const(0.88), F.const(1.06)))
                .clamp(3.2, 7.2).round(2),
            "冲程", {
                unit: "格",
                description: "从起步到刹停的总位移，也是本招的射程基准；腿快、份量足的个体冲得更远，泄放式收得更短、聚敛式更长。"
            }),
        /** 推进速度：基础 0.95 格/刻，速度每比 60 快 1 加 0.007（夹 -0.22..0.6）；夹 0.7..1.6。 */
        pace: formula(
            F.base(0.95).plus(F.stat("speed").minus(60).times(0.007).clamp(-0.22, 0.6)).clamp(0.7, 1.6).round(2),
            "推进速度", {
                unit: "格/刻",
                description: "爆冲时每刻前进的距离；越快越难被侧移让开，冲空也放得更远。"
            }),
        /** 判定半径：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.14；夹 0.4..0.95。 */
        radius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.14)).clamp(0.4, 0.95).round(2),
            "判定半径", {
                unit: "格",
                description: "裹在身上的电场扫过的横向判定半径；身板越大电场包得越开。"
            }),
        /** 反噬比例：基础 0.33，防御每比 60 多 1 少 0.0007（夹 0..0.14），体重每比 60 多 1 加 0.0009（夹 -0.06..0.14）；泄放 ×1.15 / 聚敛 ×0.9；夹 0.15..0.52。 */
        recoil: formula(
            F.base(0.33).minus(F.stat("defence").minus(60).times(0.0007).clamp(0, 0.14))
                .plus(F.body("weight").minus(60).times(0.0009).clamp(-0.06, 0.14))
                .times(F.when(F.pref("discharge", text("worldcombat.skill.volttackle.preference.discharge")), F.const(1.15), F.const(0.9)))
                .clamp(0.15, 0.52).round(3),
            "反噬比例", {
                unit: "比例",
                description: "撞中后按实际伤害反噬自己的比例；防御越高越轻、身体越沉冲击越大，泄放式把回路的电也摊得更重。"
            }),
        /** 麻痹概率：基础 0.10，特攻每比 60 多 1 加 0.0014（夹 -0.04..0.12），等级每比 30 高 1 加 0.0016（夹 0..0.08）；泄放 ×0.85；夹 0.05..0.48。 */
        numbChance: percent(
            F.base(0.10).plus(F.stat("specialAttack").minus(60).times(0.0014).clamp(-0.04, 0.12))
                .plus(F.level().minus(30).times(0.0016).clamp(0, 0.08))
                .times(F.when(F.pref("discharge", text("worldcombat.skill.volttackle.preference.discharge")), F.const(0.85), F.const(1)))
                .clamp(0.05, 0.48).round(3),
            "麻痹概率", "命中后把电流灌进对方、让它麻痹的机会（原生 10%）；特攻越强、等级越高越容易麻住，泄放式把电摊开、单体略降。"),
        /** 麻痹时长：基础 200，特攻每比 60 多 1 加 0.85（夹 -38..105），等级每比 30 高 1 加 1.1（夹 0..44）；夹 140..400。 */
        numbTicks: seconds(
            F.base(200).plus(F.stat("specialAttack").minus(60).times(0.85).clamp(-38, 105))
                .plus(F.level().minus(30).times(1.1).clamp(0, 44))
                .clamp(140, 400).round(0),
            "麻痹时长", "目标被麻住的时长；特攻与等级越高麻得越久。"),
        /** 放电半径：基础 2.2 格，碰撞箱每比 1.4 高 1 格加 0.5（夹 -0.2..1.0），特攻每比 60 多 1 加 0.012（夹 -0.4..1.0）；泄放 ×1.3 / 聚敛 ×0.75；夹 1.4..4.5。 */
        arc: formula(
            F.base(2.2).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.2, 1.0))
                .plus(F.stat("specialAttack").minus(60).times(0.012).clamp(-0.4, 1.0))
                .times(F.when(F.pref("discharge", text("worldcombat.skill.volttackle.preference.discharge")), F.const(1.3), F.const(0.75)))
                .clamp(1.4, 4.5).round(2),
            "放电半径", {
                unit: "格",
                description: "撞实后积压的电荷从落点向四周炸开的半径；身板越高、电荷越多（特攻）铺得越开，泄放式显著放大、聚敛式收小。"
            }),
        /** 波及占比：基础 0.45，特攻每比 60 多 1 加 0.003（夹 -0.1..0.32）；泄放 ×1.2 / 聚敛 ×0.8；夹 0.2..0.9。 */
        arcPower: percent(
            F.base(0.45).plus(F.stat("specialAttack").minus(60).times(0.003).clamp(-0.1, 0.32))
                .times(F.when(F.pref("discharge", text("worldcombat.skill.volttackle.preference.discharge")), F.const(1.2), F.const(0.8)))
                .clamp(0.2, 0.9).round(3),
            "波及占比", "被放电波及到的旁人吃到的威力比例；特攻越高分出去的越多，泄放式更狠、聚敛式更轻。"),
        /** 波及麻痹概率：基础 0.12，特攻每比 60 多 1 加 0.0012（夹 -0.03..0.1），等级每比 30 高 1 加 0.0012（夹 0..0.06）；夹 0.06..0.4。 */
        arcChance: percent(
            F.base(0.12).plus(F.stat("specialAttack").minus(60).times(0.0012).clamp(-0.03, 0.1))
                .plus(F.level().minus(30).times(0.0012).clamp(0, 0.06))
                .clamp(0.06, 0.4).round(3),
            "波及麻痹概率", "被放电波及到的旁人被电麻的机会；特攻与等级越高越容易，比主目标低一档。"),
        /** 击退：基础 0.7 格，体重每比 60 多 1 加 0.004（夹 -0.25..0.9）；夹 0.3..1.8。 */
        shove: formula(
            F.base(0.7).plus(F.body("weight").minus(60).times(0.004).clamp(-0.25, 0.9)).clamp(0.3, 1.8).round(2),
            "击退", {
                unit: "格",
                description: "命中后把主目标沿冲撞方向顶开多远；越重顶得越远。"
            }),
        /** 电火花数量：基础 26，速度每比 60 快 1 加 0.4（夹 -8..22），特攻每比 60 多 1 加 0.15（夹 -5..10）；夹 18..72。 */
        sparks: formula(
            F.base(26).plus(F.stat("speed").minus(60).times(0.4).clamp(-8, 22))
                .plus(F.stat("specialAttack").minus(60).times(0.15).clamp(-5, 10)).clamp(18, 72).round(0),
            "电火花数量", {
                unit: "个",
                description: "蓄电、冲锋与放电迸开的电火花数量，随速度与电荷量（特攻）增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 13 刻，速度每比 60 快 1 少 0.03（夹 -3..4），特攻每比 60 多 1 加 0.02（夹 0..4）；夹 8..22。 */
        tempo: seconds(
            F.base(13).minus(F.stat("speed").minus(60).times(0.03).clamp(-3, 4))
                .plus(F.stat("specialAttack").minus(60).times(0.02).clamp(0, 4))
                .clamp(8, 22).round(0),
            "起手", "把电荷长时间聚到全身、蓄到能爆冲的时长（可被打断）；速度越快越短，电荷越多（特攻）聚得越久。本族最慢的起手。"),
        /** 收招：基础 11 刻，速度每比 60 快 1 少 0.025（夹 -3..4）；夹 7..18。 */
        aftercast: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.025).clamp(-3, 4)).clamp(7, 18).round(0),
            "收招", "爆冲或放电后的收势；速度越快越利落。"),
        /** 冷却：基础 52 刻，速度每比 60 快 1 少 0.05（夹 -6..9），泄放 +6；夹 34..76。 */
        recharge: seconds(
            F.base(52).minus(F.stat("speed").minus(60).times(0.05).clamp(-6, 9))
                .plus(F.when(F.pref("discharge", text("worldcombat.skill.volttackle.preference.discharge")), F.const(6), F.const(0)))
                .clamp(34, 76).round(0),
            "冷却", "两次伏特攻击之间的间隔；速度越快回得越快，泄放式缓得更久。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05),
        arcTargets: hidden(4)
    });

    defineDamage("volttackle", "surge", { defenceCoefficient: 0.005,
        rationale: "蓄电后的正面接触爆冲，按标准防御系数结算，靠物攻、特攻与速度拉开差距。" }, { contact: true });

    stages("volttackle", [
        { level: 46, values: { surge: 132 } },
        { level: 64, values: { surge: 152, numbChance: 0.16 } }
    ]);

    describe("volttackle", [
        { key: "description.0", values: ["surge", "charge", "pace", "radius"] },
        { key: "description.1", values: ["numbChance", "numbTicks", "recoil", "shove"] },
        { key: "description.2", values: ["arc", "arcPower", "arcChance", "sparks"] },
        { key: "discharge.on", values: [], when: function (context) { return read(context.detail.values, ["discharge"]) === true; } },
        { key: "discharge.off", values: [], when: function (context) { return read(context.detail.values, ["discharge"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.surge"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.surge", "tier.1.numbChance"] }
    ]);
}
