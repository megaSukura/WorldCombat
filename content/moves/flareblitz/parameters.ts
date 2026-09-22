/**
 * 闪焰冲锋 / flareblitz 的参数与伤害段。
 *
 * 原生事实：火、物理、威力 120、命中 100、PP 15、接触、反作用力 1/3、10% 灼伤、defrost（Cobblemon 1.8，79 位学习者）。
 * 翻译：把「让火焰覆盖全身猛撞向对手，自己也会受到不小的伤害，有时让对手灼伤」落成一次**把自己整个点燃的
 * 不刹车长冲**——起手火焰从脚下烧到全身、越烧越旺，低头沿直线撞出去；撞实的一刻火全部灌进对方，
 * 目标被顶飞、自己按比例反伤，余火还在身上烧一会儿。它是本族里冲得最远、撞得最重、也最伤自己的一招。
 *
 * 与同族分开：电光是贴身短促的一点电、火焰轮是蜷成火轮滚过去、伏特攻击是蓄电后爆冲并放电波及旁人；
 * 闪焰冲锋的辨识点是**一条拖得很长的火线**与撞完之后目标被顶飞的力道。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   blaze       冲击威力：物攻给狠度、速度给起势；余焰式把火分摊给后续燃烧、略收。
 *   charge      冲程：速度给起步距离、体重把惯性压进去；余焰式收得更短。
 *   pace        推进速度：速度决定每刻前进多少。
 *   radius      判定半径：碰撞箱高度决定撞面大小。
 *   recoil      反伤比例：防御越高越轻、体重越大反震越沉；余焰式把火烧回自己身上更久。
 *   burnChance  灼伤概率：特攻定火焰炽热度、等级定熟练度；余焰式显著提高。
 *   burnTicks   灼伤时长：特攻与等级；余焰式大幅延长。
 *   shove       击退：体重与物攻决定把目标顶多远；余焰式把力留给燃烧。
 *   embers      火星数量：速度与物攻派生，表现按它发射。
 *   tempo/aftercast/recharge  速度决定起手／收招／冷却；余焰式更慢。
 *
 * 配置 afterburn（余焰式 / 爆焰式）双向取舍：
 *   余焰式＝灼伤概率与时长显著提高、反伤更重、起手更慢、冲程更短、击退更轻——把这一撞换成持续压制；
 *   爆焰式＝威力、冲程与击退更高，反伤更轻、节奏更快，但几乎不点着对手——一次性的爆发。
 * 两个方向各有局面（留状态缠斗 vs 一撞爆发）。
 *
 * 伤害段 blaze：这一撞随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("flareblitz", {
        /** 冲击威力：基础 120，物攻每比 60 多 1 加 0.52（夹 -30..58），速度每比 60 快 1 加 0.28（夹 -12..26）；余焰 ×0.95 / 爆焰 ×1.06；夹 80..240。 */
        blaze: formula(
            F.base(120).plus(F.stat("attack").minus(60).times(0.52).clamp(-30, 58))
                .plus(F.stat("speed").minus(60).times(0.28).clamp(-12, 26))
                .times(F.when(F.pref("afterburn", text("worldcombat.skill.flareblitz.preference.afterburn")), F.const(0.95), F.const(1.06)))
                .clamp(80, 240).round(1),
            "冲击威力", {
                unit: "威力",
                description: "全身着火撞实这一下的基础威力；物攻越重、起步越快越猛。余焰式把火分摊给后续燃烧、略收一档，爆焰式一次全放。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲程：基础 5.2 格，速度每比 60 快 1 加 0.028（夹 -1.1..2.2），体重每比 60 多 1 加 0.004（夹 -0.3..1.0）；余焰 ×0.88；夹 3.6..8.0。 */
        charge: formula(
            F.base(5.2).plus(F.stat("speed").minus(60).times(0.028).clamp(-1.1, 2.2))
                .plus(F.body("weight").minus(60).times(0.004).clamp(-0.3, 1.0))
                .times(F.when(F.pref("afterburn", text("worldcombat.skill.flareblitz.preference.afterburn")), F.const(0.88), F.const(1)))
                .clamp(3.6, 8.0).round(2),
            "冲程", {
                unit: "格",
                description: "从起步到刹停的总位移，也是本招的射程基准；腿快、份量足的个体冲得更远，余焰式收得更短。"
            }),
        /** 推进速度：基础 0.9 格/刻，速度每比 60 快 1 加 0.007（夹 -0.22..0.62）；夹 0.65..1.55。 */
        pace: formula(
            F.base(0.9).plus(F.stat("speed").minus(60).times(0.007).clamp(-0.22, 0.62)).clamp(0.65, 1.55).round(2),
            "推进速度", {
                unit: "格/刻",
                description: "裹火冲锋时每刻前进的距离；越快越难被侧移让开。"
            }),
        /** 判定半径：基础 0.56 格，碰撞箱每比 1.4 高 1 格加 0.15；夹 0.42..1.0。 */
        radius: formula(
            F.base(0.56).plus(F.body("height").minus(1.4).times(0.15)).clamp(0.42, 1.0).round(2),
            "判定半径", {
                unit: "格",
                description: "裹在身上的火焰扫过的横向判定半径；身板越高大火焰包得越开。"
            }),
        /** 反伤比例：基础 0.33，防御每比 60 多 1 少 0.0007（夹 0..0.14），体重每比 60 多 1 加 0.0009（夹 -0.06..0.14）；余焰 ×1.18 / 爆焰 ×0.92；夹 0.16..0.52。 */
        recoil: formula(
            F.base(0.33).minus(F.stat("defence").minus(60).times(0.0007).clamp(0, 0.14))
                .plus(F.body("weight").minus(60).times(0.0009).clamp(-0.06, 0.14))
                .times(F.when(F.pref("afterburn", text("worldcombat.skill.flareblitz.preference.afterburn")), F.const(1.18), F.const(0.92)))
                .clamp(0.16, 0.52).round(3),
            "反伤比例", {
                unit: "比例",
                description: "撞中后按实际伤害反伤自己的比例；防御越高越轻、身体越沉冲击越大，余焰式把火烧回自己身上更久、反震更重。"
            }),
        /** 灼伤概率：基础 0.10，特攻每比 60 多 1 加 0.0014（夹 -0.04..0.12），等级每比 30 高 1 级加 0.0016（夹 0..0.08）；余焰 +0.12 / 爆焰 -0.02；夹 0.05..0.50。 */
        burnChance: percent(
            F.base(0.10).plus(F.stat("specialAttack").minus(60).times(0.0014).clamp(-0.04, 0.12))
                .plus(F.level().minus(30).times(0.0016).clamp(0, 0.08))
                .plus(F.when(F.pref("afterburn", text("worldcombat.skill.flareblitz.preference.afterburn")), F.const(0.12), F.const(-0.02)))
                .clamp(0.05, 0.5).round(3),
            "灼伤概率", "撞中后把火灌进对方、让它灼伤的机会（原生 10%）；特攻越炽热、等级越高越容易点燃，余焰式显著提高、爆焰式略降。"),
        /** 灼伤时长：基础 200，特攻每比 60 多 1 加 0.9（夹 -40..110），等级每比 30 高 1 加 1.2（夹 0..48）；余焰 ×1.3；夹 140..420。 */
        burnTicks: seconds(
            F.base(200).plus(F.stat("specialAttack").minus(60).times(0.9).clamp(-40, 110))
                .plus(F.level().minus(30).times(1.2).clamp(0, 48))
                .times(F.when(F.pref("afterburn", text("worldcombat.skill.flareblitz.preference.afterburn")), F.const(1.3), F.const(1)))
                .clamp(140, 420).round(0),
            "灼伤时长", "目标被点着后持续掉血的时长；特攻与等级越高烧得越久，余焰式更久。"),
        /** 击退：基础 1.1 格，体重每比 60 多 1 加 0.005（夹 -0.35..1.1），物攻每比 60 多 1 加 0.004（夹 -0.25..0.7）；余焰 ×0.85；夹 0.5..3.0。 */
        shove: formula(
            F.base(1.1).plus(F.body("weight").minus(60).times(0.005).clamp(-0.35, 1.1))
                .plus(F.stat("attack").minus(60).times(0.004).clamp(-0.25, 0.7))
                .times(F.when(F.pref("afterburn", text("worldcombat.skill.flareblitz.preference.afterburn")), F.const(0.85), F.const(1)))
                .clamp(0.5, 3.0).round(2),
            "击退", {
                unit: "格",
                description: "命中后把目标沿冲撞方向顶飞多远；越重、物攻越高顶得越远，余焰式把力道留给燃烧、顶得稍近。"
            }),
        /** 火星数量：基础 28，速度每比 60 快 1 加 0.4（夹 -9..24），物攻每比 60 多 1 加 0.22（夹 -6..12）；夹 18..76。 */
        embers: formula(
            F.base(28).plus(F.stat("speed").minus(60).times(0.4).clamp(-9, 24))
                .plus(F.stat("attack").minus(60).times(0.22).clamp(-6, 12)).clamp(18, 76).round(0),
            "火星数量", {
                unit: "个",
                description: "冲锋与碰撞扬起的火星数量，随速度与物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 9 刻，速度每比 60 快 1 少 0.022（夹 -3..3.5），余焰 +2；夹 6..15。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.022).clamp(-3, 3.5))
                .plus(F.when(F.pref("afterburn", text("worldcombat.skill.flareblitz.preference.afterburn")), F.const(2), F.const(0)))
                .clamp(6, 15).round(0),
            "起手", "火焰从脚下烧到全身、压低身形蓄势的时长；速度越快越干脆，余焰式要先烧旺。"),
        /** 收招：基础 10 刻，速度每比 60 快 1 少 0.025（夹 -3..4），余焰 +3；夹 6..17。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.025).clamp(-3, 4))
                .plus(F.when(F.pref("afterburn", text("worldcombat.skill.flareblitz.preference.afterburn")), F.const(3), F.const(0)))
                .clamp(6, 17).round(0),
            "收招", "撞完或烧空后站稳的收势；余焰式要等身上的火落下去。"),
        /** 冷却：基础 48 刻，速度每比 60 快 1 少 0.05（夹 -6..9），余焰 +8；夹 32..72。 */
        recharge: seconds(
            F.base(48).minus(F.stat("speed").minus(60).times(0.05).clamp(-6, 9))
                .plus(F.when(F.pref("afterburn", text("worldcombat.skill.flareblitz.preference.afterburn")), F.const(8), F.const(0)))
                .clamp(32, 72).round(0),
            "冷却", "两次闪焰冲锋之间的间隔；速度越快回得越快，余焰式缓得更久。"),
        traceAhead: hidden(1.25),
        minimumMove: hidden(0.05)
    });

    defineDamage("flareblitz", "blaze", { defenceCoefficient: 0.005,
        rationale: "全身着火的正面接触冲锋，按标准防御系数结算，靠物攻、速度与体重拉开差距。" }, { contact: true });

    stages("flareblitz", [
        { level: 45, values: { blaze: 132 } },
        { level: 62, values: { blaze: 150, burnChance: 0.16, recoil: 0.36 } }
    ]);

    describe("flareblitz", [
        { key: "description.0", values: ["blaze", "charge", "pace", "radius"] },
        { key: "description.1", values: ["burnChance", "burnTicks", "recoil", "shove", "embers"] },
        { key: "afterburn.on", values: [], when: function (context) { return read(context.detail.values, ["afterburn"]) === true; } },
        { key: "afterburn.off", values: [], when: function (context) { return read(context.detail.values, ["afterburn"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.blaze"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.blaze", "tier.1.burnChance", "tier.1.recoil"] }
    ]);
}
