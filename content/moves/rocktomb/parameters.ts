/**
 * 岩石封锁 / rocktomb 的参数与伤害段。
 *
 * 原生事实：Rock／物理／威力 60／命中 95／PP 15／target normal／追加 100% 令目标速度 −1（Cobblemon 1.8，362 位学习者）。
 * 翻译：把「投掷岩石进行攻击，封住对手的行动」落成一次**投石封腿**——石头砸中之后，目标脚下的地面被砸出一圈
 * 立起来的石柱，把它的下半身围住，行动被封、速度下降。石柱是 `world.terrain` 租借的真实方块（`linger`），
 * 到期原方块回来；速度下降是 `NativeEffects.boost(...,"spe",-N)` 对任何战斗者生效的能力等级，并另挂共享身份
 * `world_combat:status/encased`（本单元发明，别的单元可直接消费「行动被封」）。
 *
 * 「封住行动」需要腿站在地上：只有落地（grounded）的目标才会被围住、才掉速度；离地时这一发只是一块重石头，
 * 这是这招可被读出的反制（与 bulldoze 只扫地面同一读法）。
 *
 * 数据分散（每项依赖不同的精灵数据，落到不同参数）：
 *   boulder         投石威力：物攻定石头的力道，体重定石头本身的份量。
 *   throwSpeed      投掷速度：速度定石头出手多急、目标更难在半空走开。
 *   throwRange      施放距离：等级与物攻把石头送多远；也是本招的实际射程来源。
 *   collisionRadius 石头判定：体型高度定石头大小。
 *   cageRadius      封锁半径：目标碰撞箱宽度定石柱圈要多大才围得住（大目标围得更宽）。
 *   cageHeight      石柱高度：配置（封场式）决定立多高。
 *   encaseStages    封锁等级：配置决定降一级还是两级速度。
 *   cageTicks       封锁时长：等级定这圈石头与减速留多久。
 *
 * 配置 `trap`（封场式）：开＝围得更宽更高、降两级速度、石头留得久，但单发更轻；关＝砸得更重、只降一级、
 * 围栏短。两向各有局面（控场 / 抢伤害）。
 *
 * 伤害段 `boulder` 与参数同名，走共享换算；对手防御、相性与暴击在命中时由共享结算。
 */
namespace PokemonSkills {
    actionParameters.define("rocktomb", {
        /** 投石威力：44 + 物攻偏移[−12,30] + 体重偏移[−5,12]；封场 ×0.82 / 砸击 ×1.22；夹 26..96。 */
        boulder: formula(
            F.base(44)
                .plus(F.stat("attack").minus(55).times(0.14).clamp(-12, 30))
                .plus(F.body("weight").minus(300).times(0.005).clamp(-5, 12))
                .times(F.when(F.pref("trap", text("worldcombat.skill.rocktomb.preference.trap")), F.const(0.82), F.const(1.22)))
                .clamp(26, 96).round(1),
            "投石威力", {
                unit: "威力",
                description: "石头砸实那一下的威力；物攻越高、身体越沉，抛出去的石头越有力；封场式把力道分给围栏。对手防御、相性与暴击在命中时另算。"
            }),
        /** 投掷速度：0.95 + 速度偏移[−0.2,0.4]；夹 0.7..1.4。 */
        throwSpeed: formula(
            F.base(0.95).plus(F.stat("speed").minus(55).times(0.005).clamp(-0.2, 0.4)).clamp(0.7, 1.4).round(2),
            "投掷速度", {
                unit: "格/刻",
                description: "石头离手的速度；速度快的个体抛得更急，目标更难在半空走开。"
            }),
        /** 施放距离：6.5 + 等级(≥25)偏移[0,3] + 物攻偏移[−1,2]；夹 5..12。 */
        throwRange: formula(
            F.base(6.5)
                .plus(F.level().minus(25).times(0.06).clamp(0, 3))
                .plus(F.stat("attack").minus(55).times(0.012).clamp(-1, 2))
                .clamp(5, 12).round(2),
            "施放距离", {
                unit: "格",
                description: "能把石头砸到多远的目标；等级与物攻越高送得越远。它也是本招的实际射程来源。"
            }),
        /** 石头判定：0.42 + 体型高度偏移[−0.05,0.3]；夹 0.35..0.8。 */
        collisionRadius: formula(
            F.base(0.42).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.05, 0.3)).clamp(0.35, 0.8).round(2),
            "石头判定", {
                unit: "格",
                description: "飞行中的石头能砸到多大一圈；大个子抛出的石头更大。"
            }),
        /** 封锁半径：1.5 + 目标体宽偏移 ×1.1；封场 ×1.25 / 砸击 ×0.95；夹 1.5..4.0。 */
        cageRadius: formula(
            F.base(1.5)
                .plus(F.target("actor.width", text("worldcombat.skill.rocktomb.value.targetWidth")).minus(0.9).times(1.1).clamp(0, 2.6))
                .times(F.when(F.pref("trap", text("worldcombat.skill.rocktomb.preference.trap")), F.const(1.25), F.const(0.95)))
                .clamp(1.5, 4.0).round(2),
            "封锁半径", {
                unit: "格",
                description: "石柱围栏要立多大一圈；目标碰撞箱越宽，围栏就必须越宽才能围住它的下半身。它也是指示圈与判定环的半径。"
            }),
        /** 石柱高度：1 + 封场式 +1；夹 1..2。 */
        cageHeight: formula(
            F.base(1).plus(F.when(F.pref("trap", text("worldcombat.skill.rocktomb.preference.trap")), F.const(1), F.const(0))).clamp(1, 2),
            "石柱高度", {
                unit: "格",
                description: "围栏立起几格高；封场式立得更高，围得更死。"
            }),
        /** 封锁等级：封场 2 级 / 砸击 1 级。 */
        encaseStages: formula(
            F.when(F.pref("trap", text("worldcombat.skill.rocktomb.preference.trap")), F.const(2), F.const(1)),
            "封锁等级", {
                unit: "级",
                description: "被围住的目标速度下降的能力等级；封场式压两级，砸击式压一级。"
            }),
        /** 封锁时长：70 + 等级(≥30)偏移[0,50]；封场 ×1.4 / 砸击 ×1.0；夹 50..220。 */
        cageTicks: seconds(
            F.base(70)
                .plus(F.level().minus(30).times(1.2).clamp(0, 50))
                .times(F.when(F.pref("trap", text("worldcombat.skill.rocktomb.preference.trap")), F.const(1.4), F.const(1.0)))
                .clamp(50, 220).round(0),
            "封锁时长", "石柱围栏与减速标记停留的时长；等级越高留得越久。")
    });

    defineDamage("rocktomb", "boulder", {});

    stages("rocktomb", [
        { level: 30, values: { boulder: 52 } },
        { level: 50, values: { boulder: 64, cageTicks: 100 } }
    ]);

    describe("rocktomb", [
        { key: "description.0", values: ["boulder", "collisionRadius"] },
        { key: "description.1", values: ["throwRange", "throwSpeed"] },
        { key: "description.2", values: ["encaseStages","cageRadius","cageHeight","cageTicks"] },
        { key: "trap.on", values: [], when: function (context) { return read(context.detail.values, ["trap"]) === true; } },
        { key: "trap.off", values: [], when: function (context) { return read(context.detail.values, ["trap"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.boulder"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.boulder", "tier.1.cageTicks"] }
    ]);
}
