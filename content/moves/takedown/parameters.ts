/**
 * 猛撞 / takedown 的参数与伤害段。
 *
 * 原生事实：一般、物理、威力 90、命中 85、PP 20、接触、反作用力 1/4（Cobblemon 1.8，692 位学习者）。
 * 翻译：把「以惊人的气势撞向对手、自己也会受到少许伤害」落成最朴素的一次**助跑肩撞**——
 * 缩肩低头，沿瞄准方向直线冲出一小段，撞实就按反作用力自损；冲空只是滑停站定，不额外受伤。
 * 命中 85 在本作的即时判定里不掷骰，而是体现为冲程短、对手侧移就能让开。
 *
 * 这是本族的基准线：同一族的疯狂伏特、地狱翻滚、爆炸头突击都从它出发，各自换掉了到达方式与结果。
 *
 * 数据分散（每项依赖不同的精灵数据，是这招区分度的来源）：
 *   ram    撞劲：物攻给狠度、体重给份量、速度给冲势，配置助跑再加一档。
 *   dash   冲程：速度决定能冲多远，兼作射程。
 *   pace   推进速度：速度决定每刻挪多少。
 *   radius 判定半径：碰撞箱高度决定身体扫过的宽度。
 *   recoil 反作用力比例：防御越高越轻，体重越大越重，助跑越长越重——本招最主要的自损来源。
 *   shove  击退：体重与物攻决定把目标顶开多远。
 *   bounce 自己后坐：助跑越长，撞实后被自己的动量弹回得越远。
 *   dust   扬尘数量：随体重与物攻增长，粒子按它发射。
 *   tempo/aftercast/recharge 起手、收招与冷却都吃速度。
 *
 * 配置 runup（助跑，0..3 格）双向取舍：助跑越长，撞劲、冲程与击退都涨，但反作用力、扬尘与起手也一起上去；
 * 助跑为 0 是贴脸就撞，出手快、反伤轻，但够不远也撞不狠。两个方向各有适用局面（缠斗 vs 一锤）。
 *
 * 伤害段 ram：这一撞随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("takedown", {
        /** 撞劲：基础 90，物攻每比 60 多 1 加 0.5（夹 -25..45），体重每比 60 多 1 加 0.12（夹 -8..24），速度每比 60 快 1 加 0.2（夹 -10..24），助跑每格 +5；夹 62..180。 */
        ram: formula(
            F.base(90).plus(F.stat("attack").minus(60).times(0.5).clamp(-25, 45))
                .plus(F.body("weight").minus(60).times(0.12).clamp(-8, 24))
                .plus(F.stat("speed").minus(60).times(0.2).clamp(-10, 24))
                .plus(F.pref("runup", text("worldcombat.skill.takedown.value.runup")).times(5))
                .clamp(62, 180).round(1),
            "撞劲", {
                unit: "威力",
                description: "肩撞命中那一下的威力；物攻越高越狠、身体越沉越有份量、起步越快冲势越足，助跑再加一档。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲程：基础 3.2 格，速度每比 60 快 1 加 0.018（夹 -0.8..1.6），加助跑距离；夹 2.4..6.4。 */
        dash: formula(
            F.base(3.2).plus(F.stat("speed").minus(60).times(0.018).clamp(-0.8, 1.6))
                .plus(F.pref("runup", text("worldcombat.skill.takedown.value.runup")))
                .clamp(2.4, 6.4).round(2),
            "冲程", {
                unit: "格",
                description: "从起步到刹停的总位移，也是本招的射程基准；腿快、助跑长的人够得到更远。"
            }),
        /** 推进速度：基础 0.85 格/刻，速度每比 60 快 1 加 0.006（夹 -0.2..0.5）；夹 0.6..1.5。 */
        pace: formula(
            F.base(0.85).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.2, 0.5)).clamp(0.6, 1.5).round(2),
            "推进速度", {
                unit: "格/刻",
                description: "冲出去时每刻前进的距离；越快越难被让开，冲空也会滑得更远。"
            }),
        /** 判定半径：基础 0.5 格，碰撞箱每比 1.4 高 1 格加 0.14；夹 0.38..0.9。 */
        radius: formula(
            F.base(0.5).plus(F.body("height").minus(1.4).times(0.14)).clamp(0.38, 0.9).round(2),
            "判定半径", {
                unit: "格",
                description: "肩头扫过的横向判定半径；身板越大扫得越宽，越难从旁边擦过去。"
            }),
        /** 反作用力：基础 0.25，防御每比 60 多 1 少 0.0008（上限 -0.12），体重每比 60 多 1 加 0.0006（上限 +0.06），助跑每格 +0.012；夹 0.12..0.4。 */
        recoil: formula(
            F.base(0.25).minus(F.stat("defence").minus(60).times(0.0008).clamp(0, 0.12))
                .plus(F.body("weight").minus(60).times(0.0006).clamp(-0.02, 0.06))
                .plus(F.pref("runup", text("worldcombat.skill.takedown.value.runup")).times(0.012))
                .clamp(0.12, 0.4).round(3),
            "反作用力", {
                unit: "比例",
                description: "命中后按实际伤害反噬自己的比例；防御越高越轻，身体越沉、助跑越长越重。这是本招最主要的自损来源。"
            }),
        /** 击退：基础 0.7 格，体重每比 60 多 1 加 0.004（夹 -0.25..0.9），物攻每比 60 多 1 加 0.003（夹 -0.15..0.5）；夹 0.35..1.9。 */
        shove: formula(
            F.base(0.7).plus(F.body("weight").minus(60).times(0.004).clamp(-0.25, 0.9))
                .plus(F.stat("attack").minus(60).times(0.003).clamp(-0.15, 0.5))
                .clamp(0.35, 1.9).round(2),
            "击退", {
                unit: "格",
                description: "命中后把目标沿冲撞方向顶开多远；越重、物攻越高推得越远。"
            }),
        /** 自己后坐：基础 0.25 格，助跑每格 +0.08；夹 0.15..0.6。 */
        bounce: formula(
            F.base(0.25).plus(F.pref("runup", text("worldcombat.skill.takedown.value.runup")).times(0.08))
                .clamp(0.15, 0.6).round(2),
            "自己后坐", {
                unit: "格",
                description: "撞实后自己被反作用力弹回的距离；助跑越长后坐越明显，也是对手看清你没跟上的信号。"
            }),
        /** 扬尘数量：基础 14，体重每比 60 多 1 加 0.15（夹 -6..18），物攻每比 60 多 1 加 0.1（夹 -4..12）；夹 10..48。 */
        dust: formula(
            F.base(14).plus(F.body("weight").minus(60).times(0.15).clamp(-6, 18))
                .plus(F.stat("attack").minus(60).times(0.1).clamp(-4, 12)).clamp(10, 48).round(0),
            "扬尘数量", {
                unit: "个",
                description: "冲撞与命中扬起的尘粒数量，随体重与物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 7 刻，速度每比 60 快 1 少 0.02（夹 -3..3），助跑每格 +1.5 刻；夹 4..14。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 3))
                .plus(F.pref("runup", text("worldcombat.skill.takedown.value.runup")).times(1.5))
                .clamp(4, 14).round(0),
            "起手", "缩肩、蹬地到能撞出去的时间；速度越快越短，助跑越长起手越久。"),
        /** 收招：基础 9 刻，速度每比 60 快 1 少 0.02（夹 -3..3）；夹 5..14。 */
        aftercast: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 3)).clamp(5, 14).round(0),
            "收招", "撞完或滑停后的收势；速度越快越利落。"),
        /** 冷却：基础 30 刻，速度每比 60 快 1 少 0.03（夹 -5..7）；夹 20..42。 */
        recharge: seconds(
            F.base(30).minus(F.stat("speed").minus(60).times(0.03).clamp(-5, 7)).clamp(20, 42).round(0),
            "冷却", "两次猛撞之间的间隔；速度越快回得越快。"),
        traceAhead: hidden(1.1),
        minimumMove: hidden(0.05)
    });

    stages("takedown", [
        { level: 32, values: { ram: 104 } },
        { level: 52, values: { ram: 126, shove: 0.9 } }
    ]);

    defineDamage("takedown", "ram", {}, { contact: true });

    describe("takedown", [
        { key: "description.0", values: ["ram", "dash", "pace", "radius"] },
        { key: "description.1", values: ["recoil", "shove", "bounce"] },
        { key: "description.2", values: ["pref.runup"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.ram"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.ram", "tier.1.shove"] }
    ]);
}
