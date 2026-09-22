/**
 * 挖洞 / Dig — 参数与数值来源。
 *
 * 原生：地面／物理／威力 80／命中 100／PP 10；第一回合钻地、第二回合攻击，钻地期间免疫大多数招式。
 * 即时战斗里没有回合，两拍结构改成一个可读的停顿：落点在起手时锁定，准备期的地裂与落点范围是唯一预警，
 * 走位本身就是防御。原先的“无敌”改由距离、时机与地面材料表达。
 *
 * 世界化：破土掀起来的是脚下的材料。松软地面（泥土、沙、砾石、苔藓、雪）范围更大、把东西掀得更高；
 * 坚硬地面（石、深板岩、黑石）范围更小，但砸得更疼；水面与悬空几乎没有可供破土的实体，炸不起来。
 * 落点材料因此是选点时要读的信息，而不只是特效。破土还会在落点那一层留下冲击痕——把自然地表换成粗土
 * 或碎石（world.terrain 租借，replace 盖住原地表、linger 让它活过招式本身，到期原方块自己回来，不掉落物）。
 *
 * 数值来源（每个参数取不同的精灵数据，公式即悬浮说明里展开的那一棵）：
 *   power           = 基础 80 + (物攻 − 70) × 0.25（夹在 −12..+30）；等级阶梯 25/50 级再抬一档。
 *   eruptionRadius  = 基础 2.6 × ∛(体重 / 40)（夹在 0.8..1.5）：体重越大掀开的范围越大。
 *   launch          = 基础 0.7 × √(物攻 / 80)（夹在 0.7..1.4）：力气越大把东西掀得越高。
 *   burrowTicks     = 基础 11 − (速度 − 60) × 0.07（夹在 4..16）：速度越快钻入到破土的等待越短。
 *   collisionRadius = 基础 0.45 + (实时碰撞箱高度 − 1.4) × 0.12（夹在 0.35..0.9）。
 *   maxTargets      = 固定 5：一次破土最多命中数（协议常量）。
 */
namespace PokemonSkills {
    const DIG_ID = "dig";

    actionParameters.define(DIG_ID, {
        /** 破土威力：物攻每比 70 多 1 加 0.25（上限 +30），少 1 减 0.25（下限 −12）；夹在 62..128。 */
        power: formula(
            F.base(80)
                .plus(F.stat("attack").minus(70).times(0.25).clamp(-12, 30))
                .clamp(62, 128).round(1),
            "破土威力", {
                unit: "威力",
                description: "本段伤害的基础威力；力气越大，破土越沉。对手防御、相性与暴击在命中时另算。"
            }),
        /** 破土半径：基础 2.6 格 × ∛(体重 / 40)，夹在 0.8..1.5 倍；夹在 1.8..4.2 格。 */
        eruptionRadius: formula(
            F.base(2.6)
                .times(F.body("weight").div(40).pow(0.3333).clamp(0.8, 1.5))
                .clamp(1.8, 4.2).round(2),
            "破土半径", {
                unit: "格",
                description: "破土罩住的范围；体重越大掀开的土越多。落点材料再乘一个系数（松土更宽、石头更窄）。"
            }),
        /** 击飞高度：基础 0.7 格 × √(物攻 / 80)，夹在 0.7..1.4 倍；夹在 0.4..1.5 格。 */
        launch: formula(
            F.base(0.7)
                .times(F.stat("attack").div(80).pow(0.5).clamp(0.7, 1.4))
                .clamp(0.4, 1.5).round(2),
            "击飞高度", {
                unit: "格",
                description: "破土把范围内的东西向上掀多高；力气越大掀得越高。落点材料再乘一个系数。"
            }),
        /** 破土延迟：基础 11 刻 −(速度 − 60)× 0.07，夹在 4..16 刻。 */
        burrowTicks: formula(
            F.base(11)
                .minus(F.stat("speed").minus(60).times(0.07).clamp(-2, 5))
                .clamp(4, 16).round(0),
            "破土延迟", {
                unit: "刻",
                description: "钻入地下到破土冲出的等待；速度越快钻得越快。这段时间是对手走出落点范围的窗口。"
            }),
        /** 碰撞半径：基础 0.45 格 +(碰撞箱高度 − 1.4)× 0.12，夹在 0.35..0.9 格。 */
        collisionRadius: formula(
            F.base(0.45)
                .plus(F.body("height").minus(1.4).times(0.12))
                .clamp(0.35, 0.9).round(2),
            "碰撞半径", {
                unit: "格",
                description: "破土判定贴到目标身上的横向半径；身体越高大越大。"
            }),
        maxTargets: n(5, "最多命中数")
    });

    defineDamage(DIG_ID, "power", {
        rationale: "破土的范围伤害：靠近爆心才吃满，边缘约减半；范围、击飞与附加伤害由落点材料决定。"
    });

    stages(DIG_ID, [
        { level: 1, values: { power: 80 } },
        { level: 25, values: { power: 95 } },
        { level: 50, values: { power: 110 } }
    ]);

    describe(DIG_ID, [
        { key: "description.0", values: ["power"] },
        { key: "description.1", values: ["eruptionRadius"] },
        { key: "description.2", values: ["burrowTicks"] },
        { key: "description.3", values: [] },
        { key: "description.4", values: [], when: function (context) { return !!read(context.detail.values, ["ambush"]); } },
        { key: "description.5", values: [], when: function (context) { return !read(context.detail.values, ["ambush"]); } },
        { key: "description.6", values: [] },
        { key: "timing", values: ["prepare", "recover", "cooldown"] },
        { key: "growth.0", values: [], when: function (context) { return context.pokemon.level() >= 25; } },
        { key: "growth.1", values: [], when: function (context) { return context.pokemon.level() >= 50; } }
    ]);
}
