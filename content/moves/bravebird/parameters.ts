/**
 * 勇鸟猛攻 / bravebird 的参数与伤害段。
 *
 * 原生事实：飞行、物理、威力 120、命中 100、PP 15、接触、带 distance 标记、反作用力 1/3（Cobblemon 1.8，
 * 66 位学习者）。
 * 翻译：把“收拢翅膀，通过低空飞行突击对手”落成一次**贴地俯冲的直线突击**——先收翅弹起到低空，
 * 再沿一条斜线整个人钉过去，从目标身上穿过去、落在它身后；俯冲的路上谁站在线上谁就吃这一下。
 * 它靠的是速度换来的动量，代价是落地时那一震同样砸回自己身上。
 *
 * 与同族分开：舍身冲撞是正面猛撞、撞完双方被弹开；波动冲裹水撞人；木槌用坚硬躯体砸地。
 * 勇鸟猛攻是唯一**从空中沿一条线穿过目标**的，也是唯一能一次串起一串敌人的（贯通上限见 pierceCount）。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   dive            俯冲威力：物攻给狠度，速度把俯冲动量压进去；高掠式再抬一档。
 *   swoop           俯冲路程：速度决定一口气钉多远；也是本招射程基准。
 *   pace            每刻位移：速度决定穿过目标的速度。
 *   altitude        起跳高度：碰撞箱高度决定翅膀能弹多高，速度补一点；高掠式 ×1.5。
 *   collisionRadius 判定半径：碰撞箱高度决定俯冲带多宽。
 *   recoil          反伤比例：防御越高越轻，体重越大落地越沉；高掠式更重。
 *   pierceCount     贯通上限：基础 2，等级台阶 3。
 *   push            击退：速度决定把被穿过的人带多远。
 *   feathers        风羽数量：速度与物攻派生，表现按它发射。
 *   tempo/aftercast/recharge  速度决定起手/收招/冷却；高掠式更慢。
 * 配置 high（高掠式）双向取舍：开启＝起跳更高、俯冲更重更远，但反伤更重、起手与冷却更久；
 * 关闭（低掠式）＝贴地掠过、更快更安全，威力与射程收一档。两个方向各有适用局面（重击 vs 见效）。
 *
 * 伤害段 dive：这次俯冲随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("bravebird", {
        /** 俯冲威力：基础 120，物攻每比 60 多 1 加 0.5（上限 +55），速度每比 60 快 1 加 0.24（上限 +38）；高掠 ×1.12；夹在 70..235。 */
        dive: formula(
            F.base(120).plus(F.stat("attack").minus(60).times(0.5).clamp(-30, 55))
                .plus(F.stat("speed").minus(60).times(0.24).clamp(-14, 38))
                .times(F.when(F.pref("high", text("worldcombat.skill.bravebird.preference.high")), F.const(1.12), F.const(1)))
                .clamp(70, 235).round(1),
            "俯冲威力", {
                unit: "威力",
                description: "俯冲撞实这一下的基础威力；物攻越重、俯冲越快越狠，高掠式再抬一档。对手防御、相性与暴击在命中时另算。"
            }),
        /** 俯冲路程：基础 5.4 格，速度每比 60 快 1 加 0.02，高度每比 1.4 高 1 格加 0.4；高掠 ×1.15；夹在 3.6..9.0。 */
        swoop: formula(
            F.base(5.4).plus(F.stat("speed").minus(60).times(0.02).clamp(-1.2, 3.0))
                .plus(F.body("height").minus(1.4).times(0.4).clamp(-0.4, 1.2))
                .times(F.when(F.pref("high", text("worldcombat.skill.bravebird.preference.high")), F.const(1.15), F.const(1)))
                .clamp(3.6, 9.0).round(2),
            "俯冲路程", {
                unit: "格",
                description: "从起跳到落地的整条斜线长度，也是本招的射程基准；俯冲越快、身架越大钉得越远，高掠式更远。"
            }),
        /** 每刻位移：基础 1.0 格/刻，速度每比 60 快 1 加 0.008；夹在 0.7..1.7。 */
        pace: formula(
            F.base(1.0).plus(F.stat("speed").minus(60).times(0.008).clamp(-0.3, 0.7)).clamp(0.7, 1.7).round(2),
            "俯冲速度", {
                unit: "格/刻",
                description: "俯冲时每刻前进的距离；越快越难被侧移让开，也越快穿过目标。"
            }),
        /** 起跳高度：基础 1.6 格，高度每比 1.4 高 1 格加 0.5（夹 -0.4..1.0），速度每比 60 快 1 加 0.006（夹 -0.3..0.6）；高掠 ×1.5；夹在 0.8..3.2。 */
        altitude: formula(
            F.base(1.6).plus(F.body("height").minus(1.4).times(0.5).clamp(-0.4, 1.0))
                .plus(F.stat("speed").minus(60).times(0.006).clamp(-0.3, 0.6))
                .times(F.when(F.pref("high", text("worldcombat.skill.bravebird.preference.high")), F.const(1.5), F.const(1)))
                .clamp(0.8, 3.2).round(2),
            "起跳高度", {
                unit: "格",
                description: "收翅弹起的高度，决定俯冲的入射角；越高越像从空中砸下，头顶被压住时会自然降低。高掠式跳得更高。"
            }),
        /** 判定半径：基础 0.6 格加碰撞箱高度 ×0.18；夹在 0.45..1.0。 */
        collisionRadius: formula(
            F.base(0.6).plus(F.body("height").minus(1.4).times(0.18)).clamp(0.45, 1.0).round(2),
            "判定半径", {
                unit: "格",
                description: "俯冲时整个身架扫过的横向判定半径；翅膀越大带得越宽，越容易串到旁边的人。"
            }),
        /** 反伤比例：基础 0.28，防御每比 60 多 1 少 0.0005（上限 −0.12），体重每比 60 多 1 加 0.0006（上限 +0.1）；高掠 ×1.1；夹在 0.14..0.44。 */
        recoil: formula(
            F.base(0.28).minus(F.stat("defence").minus(60).times(0.0005).clamp(0, 0.12))
                .plus(F.body("weight").minus(60).times(0.0006).clamp(-0.04, 0.1))
                .times(F.when(F.pref("high", text("worldcombat.skill.bravebird.preference.high")), F.const(1.1), F.const(1)))
                .clamp(0.14, 0.44).round(3),
            "反伤比例", {
                unit: "比例",
                description: "每穿中一个目标，按该次实际伤害反震自己的比例；防御越高越轻、身体越沉落地越狠，高掠式更重。"
            }),
        /** 贯通上限：基础 2，夹在 2..3；等级 60 台阶抬到 3。 */
        pierceCount: formula(F.base(2).clamp(2, 3).round(0), "贯通上限", {
            unit: "人",
            description: "一条俯冲线上最多穿中几个敌人；高速个体在等级台阶后能串起第三个。"
        }),
        /** 击退：基础 0.6 格，速度每比 60 快 1 加 0.004；夹在 0.3..1.4。 */
        push: formula(
            F.base(0.6).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.2, 0.5)).clamp(0.3, 1.4).round(2),
            "击退", {
                unit: "格",
                description: "被穿过的人沿俯冲方向被带开多远；俯冲越快带得越远。"
            }),
        /** 风羽数量：基础 26，速度每比 60 快 1 加 0.35（夹 -8..22），物攻每比 60 多 1 加 0.15（夹 -4..12）；夹在 18..72。 */
        feathers: formula(
            F.base(26).plus(F.stat("speed").minus(60).times(0.35).clamp(-8, 22))
                .plus(F.stat("attack").minus(60).times(0.15).clamp(-4, 12))
                .clamp(18, 72).round(0),
            "风羽数量", {
                unit: "个",
                description: "俯冲与命中卷起的风羽数量，随速度与物攻增长；粒子按它发射，画面里的数量和机制一致。"
            }),
        /** 起手：基础 10 刻，速度每比 60 快 1 减 0.02 刻，高掠 +3 刻；夹在 6..16。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("high", text("worldcombat.skill.bravebird.preference.high")), F.const(3), F.const(0)))
                .clamp(6, 16).round(0),
            "起手", "收翅、屈腿、弹起前的蓄势；速度越快越干脆，高掠式要先跳到更高。"),
        /** 收招：基础 10 刻，速度每比 60 快 1 减 0.02 刻，高掠 +2 刻；夹在 6..18。 */
        aftercast: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("high", text("worldcombat.skill.bravebird.preference.high")), F.const(2), F.const(0)))
                .clamp(6, 18).round(0),
            "收招", "落地站稳的收势；高掠式落得更重、回得更慢。"),
        /** 冷却：基础 52 刻，速度每比 60 快 1 减 0.05 刻，高掠 +10 刻；夹在 34..82。 */
        recharge: seconds(
            F.base(52).minus(F.stat("speed").minus(60).times(0.05).clamp(-5, 10))
                .plus(F.when(F.pref("high", text("worldcombat.skill.bravebird.preference.high")), F.const(10), F.const(0)))
                .clamp(34, 82).round(0),
            "冷却", "再次起飞之间的间隔；速度越快回得越快，高掠式蓄势更久。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    stages("bravebird", [
        { level: 42, values: { dive: 132 } },
        { level: 60, values: { dive: 148, pierceCount: 3 } }
    ]);

    defineDamage("bravebird", "dive", { defenceCoefficient: 0.0048,
        rationale: "俯冲的动量从上方灌下来，比平推更容易透进护甲，让速度差在伤害上更明显。" }, { contact: true });

    describe("bravebird", [
        { key: "description.0", values: ["dive", "swoop", "pace", "collisionRadius"] },
        { key: "description.1", values: ["altitude", "recoil", "pierceCount", "push"] },
        { key: "high.on", values: [], when: function (context) { return read(context.detail.values, ["high"]) === true; } },
        { key: "high.off", values: [], when: function (context) { return read(context.detail.values, ["high"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.dive"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.dive", "tier.1.pierceCount"] }
    ]);
}
