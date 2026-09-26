/**
 * 怪力 / strength 的参数与伤害段。
 *
 * 原生事实：Normal、物理、威力 80、命中 100、PP 15、接触、无次要效果（Cobblemon 1.8，333 位学习者）。
 * 翻译：把“使出浑身力气殴打对手”落成一记**干净、必中的正面直拳**——它没有花招、没有反伤、不会失手，
 * 把全身的力气压进一次直线出拳。它是“全力一击”家族里最稳的一记：命中只把目标沿出拳方向顶退；
 * 若目标身体真的被顶到背后的实墙上（原生方块射线判定的真实贴墙），这一拳的力道无处泄，再补一记撞墙冲击。
 * 世界是材料：背后那面墙本身就是这招多出来的那一段伤害；推不动的 Boss 若与墙仍有缝隙，只吃普通直拳。
 *
 * 与同族分开：爆裂拳是抡圆了、起手长、走弧线、打中就必定混乱的赌命一拳；怪力相反——直线、干净、
 * 必定命中、无任何附加，胜在随时能放、循环短。玩家凭“是否会被走出弧线”一眼把两者分开。
 *
 * 数据分散（每项读不同的精灵数据，小差距因此在场上放大）：
 *   slug         直拳威力：物攻给出拳的狠度，体重把份量压进拳里。
 *   slam         撞墙威力：同样由物攻与体重决定，是这一拳打到障碍上的那一段。
 *   reach        拳程：实时碰撞箱宽度决定臂展能探多远。
 *   punchRadius  判定半径：碰撞箱高度决定拳面大小。
 *   shove        顶退距离：体重与物攻决定推得动多少。
 *   tempo/aftercast/recharge  速度决定起手、收招与冷却。
 * 配置 plant（扎根式）双向取舍：出拳更重、顶得更远、撞墙更疼，但起手、收招、冷却都更长。
 *
 * 伤害段：slug 是这一记直拳，slam 是退无可退时补上的撞墙冲击。
 */
namespace PokemonSkills {
    actionParameters.define("strength", {
        /** 直拳威力：物攻每比 60 多 1 加 0.5（上限 +40），体重每比 60 多 1 加 0.12（上限 +24）；扎根 ×1.12；夹在 56..150。 */
        slug: formula(
            F.base(80).plus(F.stat("attack").minus(60).times(0.5).clamp(-20, 40))
                .plus(F.body("weight").minus(60).times(0.12).clamp(-8, 24))
                .times(F.when(F.pref("plant"), F.const(1.12), F.const(1)))
                .clamp(56, 150).round(1),
            "直拳威力", {
                unit: "威力",
                description: "这一记直拳的基础威力；物攻越高拳越重，身体越沉份量压得越实，扎根式再抬一截。对手防御、相性与暴击在命中时另算。"
            }),
        /** 撞墙威力：物攻每比 60 多 1 加 0.2（上限 +20），体重每比 60 多 1 加 0.05（上限 +10）；扎根 ×1.3；夹在 16..70。 */
        slam: formula(
            F.base(30).plus(F.stat("attack").minus(60).times(0.2).clamp(-8, 20))
                .plus(F.body("weight").minus(60).times(0.05).clamp(-3, 10))
                .times(F.when(F.pref("plant"), F.const(1.3), F.const(1)))
                .clamp(16, 70).round(1),
            "撞墙威力", {
                unit: "威力",
                description: "目标退无可退时，这一拳的力道撞在背后的障碍上、再压回目标身上的那一段威力；扎根式撞得更狠。"
            }),
        /** 拳程：基础 1.5 格加碰撞箱宽度 ×0.7；夹在 1.4..2.8。 */
        reach: formula(
            F.base(1.5).plus(F.body("width").minus(0.9).times(0.7)).clamp(1.4, 2.8).round(2),
            "拳程", {
                unit: "格",
                description: "正面直拳能探到多远的活体；身体越宽的个体臂展越长。它也是本招的实际射程来源。"
            }),
        /** 判定半径：基础 0.34 格加碰撞箱高度 ×0.1；夹在 0.26..0.6。 */
        punchRadius: formula(
            F.base(0.34).plus(F.body("height").minus(1.4).times(0.1)).clamp(0.26, 0.6).round(2),
            "判定半径", {
                unit: "格",
                description: "拳面横扫的判定半径；个子越高拳面越宽。"
            }),
        /** 顶退距离：基础 0.8 格，体重每比 60 多 1 加 0.005（上限 +0.9），物攻每比 60 多 1 加 0.004（上限 +0.6）；扎根 ×1.25；夹在 0.35..2.0。 */
        shove: formula(
            F.base(0.8).plus(F.body("weight").minus(60).times(0.005).clamp(-0.25, 0.9))
                .plus(F.stat("attack").minus(60).times(0.004).clamp(-0.2, 0.6))
                .times(F.when(F.pref("plant"), F.const(1.25), F.const(1)))
                .clamp(0.35, 2.0).round(2),
            "顶退距离", {
                unit: "格",
                description: "命中后把目标沿出拳方向推开的距离；越重、物攻越高推得越远，扎根式推得更狠。"
            }),
        /** 起手：基础 7 刻，速度每比 60 快 1 减 0.02 刻（慢则更久），扎根 +3 刻；夹在 4..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4))
                .plus(F.when(F.pref("plant"), F.const(3), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "沉腰聚势到出拳的时间；速度越快越短，扎根式要多蓄一会儿。"),
        /** 收招：基础 8 刻，速度每比 60 快 1 减 0.01 刻，扎根 +2 刻；夹在 4..14。 */
        aftercast: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.01).clamp(-1, 2))
                .plus(F.when(F.pref("plant"), F.const(2), F.const(0)))
                .clamp(4, 14).round(0),
            "收招", "出拳后的收势；速度越短越快，扎根式收得慢一点。"),
        /** 冷却：基础 36 刻，速度每比 60 快 1 减 0.05 刻，扎根 +8 刻；夹在 22..60。 */
        recharge: seconds(
            F.base(36).minus(F.stat("speed").minus(60).times(0.05).clamp(-8, 12))
                .plus(F.when(F.pref("plant"), F.const(8), F.const(0)))
                .clamp(22, 60).round(0),
            "冷却", "两记直拳之间的等待；速度越快回得越快，扎根式要缓更久。")
    });

    stages("strength", [
        { level: 30, values: { slug: 88 } },
        { level: 50, values: { slug: 96, slam: 36 } }
    ]);

    defineDamage("strength", "slug", {}, { contact: true, punch: true });
    defineDamage("strength", "slam", {}, { contact: false });

    describe("strength", [
        { key: "description.0", values: ["slug","reach","punchRadius"] },
        { key: "description.1", values: ["shove","slam"] },
        { key: "plant.on", values: [], when: function (context) { return read(context.detail.values, ["plant"]) === true; } },
        { key: "plant.off", values: [], when: function (context) { return read(context.detail.values, ["plant"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.slug"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.slug", "tier.1.slam"] }
    ]);
}
