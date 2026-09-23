/**
 * 落石 / rockthrow —— 参数与伤害段。
 *
 * 原生事实：Rock／物理／威力 50／命中 90／PP 15／优先度 0／非接触（Cobblemon 1.8 / Showdown）。
 *   描述「拿起小岩石，投掷对手进行攻击。」
 *
 * 翻译：把「随手捡起一块小石扔出去」落成一次**快、平、单发**的小石投掷——它是岩系里最随手的
 *   一记：起手最短、冷却最低、只出一块石头。石头朝松手那一刻的位置平直飞出、不追踪，也什么都不
 *   留下；90 命中翻成「散布」：掷得越远、目标越难站定，石头越容易从它身边滑过。这是它和岩石爆击
 *   （一梭带弧线、砸落点成碎石）分开的地方：落石只有一块、走直线，对手在石头离手后挪一步就能让开。
 *   石头材质取自施法者脚下的地表（沙地→沙岩、深板岩→碎深板岩）——捡起的正是那块地里的东西。
 *
 * 配置 `lob`（高抛式）双向取舍：开＝把石头抛高，能越过身前的矮墙/掩体砸到后面的目标，代价是散布
 *   ×1.5、石速 ×0.82、威力 ×0.9、起手 +2 刻；关（平击式）＝平直快速、更准更重，但会被矮墙挡下。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   stone   石块威力 ← 物攻＋等级，lob ×0.9。
 *   velocity 出手速度 ← 速度。
 *   scatter 散布 ← 速度与等级（越高越稳），lob ×1.5。
 *   radius  石块判定 ← 体型高度（大个子抛更大的石头）。
 *   reach   射程 ← 物攻＋等级，也是本招实际射程来源。
 *   shards  碎屑量 ← 物攻。
 *   arc     弧坠 ← 体重（轻精灵抛得更飘）与 lob。
 *   tempo／aftercast／recharge ← 速度（越快的个体出手越密）。
 *
 * 伤害段 `stone` 与参数同名，走共享换算（原始类别 Physical）；对手防御、相性与暴击在命中时另算。
 */
namespace PokemonSkills {
    actionParameters.define("rockthrow", {
        /** 石块威力：30 + 物攻偏移[−10,26] + 等级(≥20)偏移[0,8]；lob ×0.9；夹 18..64。 */
        stone: formula(
            F.base(30)
                .plus(F.stat("attack").minus(50).times(0.16).clamp(-10, 26))
                .plus(F.level().minus(20).times(0.3).clamp(0, 8))
                .times(F.when(F.pref("lob", text("worldcombat.skill.rockthrow.preference.lob")), F.const(0.9), F.const(1.0)))
                .clamp(18, 64).round(1),
            "石块威力", {
                unit: "威力",
                description: "这一块小石砸上去的威力；物攻越高石头越有力，等级越高也越沉。高抛式把力道分给了弧线。对手防御、相性与暴击在命中时另算。"
            }),
        /** 出手速度：1.5 + 速度偏移[−0.15,0.5]；lob ×0.82；夹 1.0..2.1。 */
        velocity: formula(
            F.base(1.5).plus(F.stat("speed").minus(50).times(0.008).clamp(-0.15, 0.5))
                .times(F.when(F.pref("lob", text("worldcombat.skill.rockthrow.preference.lob")), F.const(0.82), F.const(1.0)))
                .clamp(1.0, 2.1).round(2),
            "出手速度", {
                unit: "格/刻",
                description: "石头离手后飞得多快；速度快的个体甩得更急，目标更难在半空让开。高抛式抛得慢一些。"
            }),
        /** 散布：3.4° − 速度偏移[0,1.5] − 等级(≥20)偏移[0,0.8]；lob ×1.5；夹 1.2..6.2。 */
        scatter: formula(
            F.base(3.4)
                .minus(F.stat("speed").minus(50).times(0.02).clamp(-1, 1.5))
                .minus(F.level().minus(20).times(0.03).clamp(0, 0.8))
                .times(F.when(F.pref("lob", text("worldcombat.skill.rockthrow.preference.lob")), F.const(1.5), F.const(1.0)))
                .clamp(1.2, 6.2).round(2),
            "散布", {
                unit: "°",
                description: "石头离手时的随机偏角；速度与等级越高越稳。这就是原生 90 命中的翻译：掷得越远越容易滑过。高抛式散得更开。"
            }),
        /** 石块判定：0.22 + 体型高度偏移[−0.04,0.2]；夹 0.16..0.45。 */
        radius: formula(
            F.base(0.22).plus(F.body("height").minus(1.4).times(0.06).clamp(-0.04, 0.2)).clamp(0.16, 0.45).round(2),
            "石块判定", {
                unit: "格",
                description: "飞行中能砸到多大一圈；大个子抛出的石头更大。画出的石头大小与它一致。"
            }),
        /** 射程：6 + 物攻偏移[−1,2] + 等级(≥20)偏移[0,2]；夹 5..12。 */
        reach: formula(
            F.base(6)
                .plus(F.stat("attack").minus(50).times(0.02).clamp(-1, 2))
                .plus(F.level().minus(20).times(0.05).clamp(0, 2))
                .clamp(5, 12).round(1),
            "射程", {
                unit: "格",
                description: "石头能砸到多远的目标；物攻与等级越高送得越远。它也是本招的实际射程来源。"
            }),
        /** 碎屑量：8 + 物攻偏移[−2,10]；夹 6..22。 */
        shards: formula(
            F.base(8).plus(F.stat("attack").minus(50).times(0.1).clamp(-2, 10)).clamp(6, 22).round(0),
            "碎屑量", {
                unit: "片",
                description: "石头砸碎时崩出的石屑数量，由物攻换算；它驱动命中的石屑表现，不是独立伤害。"
            }),
        /** 弧坠：0.012 + 体重偏移[−0.004,0.01]；lob ×3.4；夹 0.006..0.055。 */
        arc: formula(
            F.base(0.012).plus(F.body("weight").minus(40).times(0.00006).clamp(-0.004, 0.01))
                .times(F.when(F.pref("lob", text("worldcombat.skill.rockthrow.preference.lob")), F.const(3.4), F.const(1.0)))
                .clamp(0.006, 0.055).round(4),
            "弧坠", {
                unit: "格/刻²",
                description: "石头抛出后往下坠得多快；轻的个体抛得飘、重的抛得平。高抛式把它抬成一道能越过矮墙的弧。"
            }),
        /** 起手：4 刻 − 速度偏移[0,1.2]；lob +2；夹 2..7。 */
        tempo: seconds(
            F.base(4).minus(F.stat("speed").minus(50).times(0.02).clamp(-0.8, 1.2))
                .plus(F.when(F.pref("lob", text("worldcombat.skill.rockthrow.preference.lob")), F.const(2), F.const(0)))
                .clamp(2, 7).round(0),
            "起手", "低头抄起脚边那块石头、抡手的时间；速度越快越短，高抛式要多蓄一下。"),
        /** 收招：5 刻 − 速度偏移[0,1]；夹 3..7。 */
        aftercast: seconds(
            F.base(5).minus(F.stat("speed").minus(50).times(0.015).clamp(-0.5, 1)).clamp(3, 7).round(0),
            "收招", "甩出石头后把手收回来的时间；快的个体更利落。"),
        /** 冷却：11 刻 − 速度偏移[0,2]；夹 7..16。 */
        recharge: seconds(
            F.base(11).minus(F.stat("speed").minus(50).times(0.03).clamp(-2, 2)).clamp(7, 16).round(0),
            "冷却", "再抄下一块石头前等待多久；这一记便宜、回得快，可以反复扔。")
    });

    defineDamage("rockthrow", "stone", {});

    stages("rockthrow", [
        { level: 22, values: { stone: 40 } },
        { level: 40, values: { stone: 50, reach: 10 } }
    ]);

    describe("rockthrow", [
        { key: "description.0", values: ["stone", "radius"] },
        { key: "description.1", values: ["velocity", "reach", "scatter"] },
        { key: "description.2", values: ["arc"] },
        { key: "lob.on", values: [], when: function (context) { return read(context.detail.values, ["lob"]) === true; } },
        { key: "lob.off", values: [], when: function (context) { return read(context.detail.values, ["lob"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.stone"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.stone", "tier.1.reach"] }
    ]);
}
