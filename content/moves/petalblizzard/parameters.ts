/**
 * 落英缤纷 / petalblizzard 的参数与伤害段。
 *
 * 原生事实：Grass／物理／威力 90／命中 100／PP 15／target allAdjacent（自己周围所有宝可梦）／
 *   flags 带 wind（风属性招式）、无次要效果。
 *
 * 翻译：把「刮起飞雪般的落花」翻成一阵**先卷进来、再甩出去的落英旋风**——第一阵风把周围的花瓣与人都
 *   朝施法者卷拢，后面的几阵把花瓣与面前的东西一起甩开；每一阵扫过圈里都割一下。它不是一发弹丸，
 *   而是原地转起来的一团风暴，被卷到的人会被风带着向内或向外挪位，站到圈外就不再被割。与同族分开：
 *     青草搅拌器 —— 在落点立一块固定的旋转叶片区，走开即停；
 *     落英缤纷   —— 以施法者为中心的风暴，先收后放，瓣落在地上。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   petal        每一阵的切割威力 30 + 物攻偏移 + **速度偏移**（转得快的人每一阵割得更利落）。
 *   stormRadius  风暴半径 4.0 格 + 碰撞箱宽度偏移 + 等级偏移（个子宽、等级高的人卷得更开）。
 *   gusts        阵数 3，回旋式 +1。
 *   gustTicks    两阵间隔 11 刻 − 速度偏移（脚步快的人甩得更密）。
 *   draw         第一阵把目标向中心拽 0.3 格 + 物攻偏移。
 *   lash         后几阵把目标向外甩 0.42 格 + 物攻偏移。
 *   petals       卷起的花瓣数 30 + 物攻 ×0.3 + 等级（同时驱动画面密度与落地花瓣数）。
 *   settleTicks  落瓣余韵 44 刻 + 等级 ×0.4（内部视觉参数，只驱动落瓣散尽的时长，不留在世界里）。
 *
 * 配置 `cyclone`（回旋式）：开启＝风暴收窄到 0.72 倍、每阵 ×1.28、多一阵、拽与甩都更猛，但起手与冷却更长；
 *   关闭＝风暴更广（×1.15）、每阵更轻、收手更快，适合一次罩一小片、追散开的目标。两向各有适用局面。
 *
 * 伤害段 `petal` 与参数同名，走共享换算（原始类别 Physical）。注意 `petal` 是**每一阵**的威力，
 * 一个人留在风暴里被割几阵就结算几次；第一阵把人拽进来、后几阵把人甩出去，正是「留多久」的取舍。
 */
namespace PokemonSkills {
    actionParameters.define("petalblizzard", {
        /** 每阵切割威力：30 + 物攻偏移[−6,20] + 速度偏移[−2,6]；回旋 ×1.28 / 广旋 ×0.94；夹 18..64。 */
        petal: formula(
            F.base(30)
                .plus(F.stat("attack").minus(60).times(0.14).clamp(-6, 20))
                .plus(F.stat("speed").minus(60).times(0.04).clamp(-2, 6))
                .times(F.when(F.pref("cyclone"), F.const(1.28), F.const(0.94)))
                .clamp(18, 64).round(1),
            "每阵切割威力", {
                unit: "威力",
                description: "每一阵风对圈内每个敌人结算一次的威力；物攻越高、转得越快割得越利落。留在风暴里被割几阵就结算几次，对手防御、相性与暴击在每次命中时另算。"
            }),
        /** 风暴半径：4.0 + 宽度偏移[−0.35,1.5] + 等级(≥25)偏移[0,1.4]；回旋 ×0.72 / 广旋 ×1.15；夹 2.4..6.6。 */
        stormRadius: formula(
            F.base(4.0)
                .plus(F.body("width").minus(0.9).times(1.0).clamp(-0.35, 1.5))
                .plus(F.level().minus(25).times(0.035).clamp(0, 1.4))
                .times(F.when(F.pref("cyclone"), F.const(0.72), F.const(1.15)))
                .clamp(2.4, 6.6).round(2),
            "风暴半径", {
                unit: "格",
                description: "落英旋风罩住身周多大一圈；体型宽、等级高的个体卷得更开，回旋式收得更小。它也是本招的实际射程与指示圈半径。"
            }),
        /** 阵数：3，回旋式 4；夹 2..4。 */
        gusts: formula(
            F.base(3).plus(F.when(F.pref("cyclone"), F.const(1), F.const(0))).clamp(2, 4).round(0),
            "阵数", {
                unit: "阵",
                description: "一次落英缤纷卷几阵；第一阵向内收束、其后几阵向外甩开。留在圈里的人被卷过几阵就割几次。"
            }),
        /** 两阵间隔：11 − 速度偏移[−3,4]；夹 7..16。 */
        gustTicks: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.06).clamp(-3, 4)).clamp(7, 16).round(0),
            "阵间隔", "两阵之间隔多久；速度快的个体甩得更密，目标更难在阵与阵之间走开。"),
        /** 向心拽：0.3 + 物攻偏移[−0.06,0.3]；回旋 ×1.35 / 广旋 ×0.85；夹 0.12..0.7。 */
        draw: formula(
            F.base(0.3).plus(F.stat("attack").minus(60).times(0.002).clamp(-0.06, 0.3))
                .times(F.when(F.pref("cyclone"), F.const(1.35), F.const(0.85)))
                .clamp(0.12, 0.7).round(2),
            "向心拽", {
                unit: "格",
                description: "第一阵把圈内目标朝施法者拽近的距离；力量越大拽得越近，回旋式拽得更狠。"
            }),
        /** 向外甩：0.42 + 物攻偏移[−0.08,0.35]；回旋 ×1.3 / 广旋 ×0.9；夹 0.15..0.9。 */
        lash: formula(
            F.base(0.42).plus(F.stat("attack").minus(60).times(0.003).clamp(-0.08, 0.35))
                .times(F.when(F.pref("cyclone"), F.const(1.3), F.const(0.9)))
                .clamp(0.15, 0.9).round(2),
            "向外甩", {
                unit: "格",
                description: "后几阵把圈内目标沿离中心的方向甩开的距离；力量越大甩得越远，回旋式甩得更狠。"
            }),
        /** 花瓣数：30 + 物攻 ×0.3 + 等级(≥25)偏移[0,14]；夹 24..72。同时驱动画面密度与落地花瓣数。 */
        petals: formula(
            F.base(30).plus(F.stat("attack").times(0.3))
                .plus(F.level().minus(25).times(0.4).clamp(0, 14)).clamp(24, 72).round(0),
            "花瓣数", {
                unit: "片",
                description: "一次风暴卷起的花瓣数；随物攻与等级增长，也决定画面的密度与落到地上的花瓣数量。"
            }),
        /** 落瓣余韵：44 + 等级 ×0.4；夹 40..90。内部视觉参数：只驱动散落花瓣渐消的时长，不改变世界方块。 */
        settleTicks: formula(
            F.base(44).plus(F.level().times(0.4)).clamp(40, 90).round(0),
            "落瓣余韵", { presentation: "seconds", visible: false,
                description: "内部视觉参数：被甩出去的花瓣落地后散尽的时长。它不改变世界方块，玩家说明里不展示。" }),
        maxTargets: hidden(10)
    });

    defineDamage("petalblizzard", "petal", {});

    stages("petalblizzard", [
        { level: 45, values: { petal: 40, stormRadius: 4.6, draw: 0.42 } }
    ]);

    describe("petalblizzard", [
        { key: "description.0", values: ["petal","gusts","maxTargets"] },
        { key: "description.1", values: ["stormRadius", "gustTicks"] },
        { key: "description.2", values: ["draw", "lash"] },
        { key: "description.3", values: [] },
        { key: "cyclone.on", values: [], when: function (context) { return read(context.detail.values, ["cyclone"]) === true; } },
        { key: "cyclone.off", values: [], when: function (context) { return read(context.detail.values, ["cyclone"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.petal", "tier.0.stormRadius", "tier.0.draw"] }
    ]);
}
