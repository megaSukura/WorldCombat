/**
 * 击落 / smackdown 的参数与伤害段。
 *
 * 原生事实：Rock／Physical／威力 50／命中 100／PP 15／target normal（单体）／附加 volatile `smackdown`：
 *   打中的目标若飞在空中（飞行属性、levitate，或正在 fly／bounce／magnetrise／telekinesis）就落到地面，
 *   并中断它本回合的飞行动作；已经贴地的普通目标只吃这一记石头。
 *
 * 翻译：把「扔石头把飞行的对手砸到地上」翻成一支**系着配重的岩弹**。它本身很轻——原生威力只有 50——
 *   价值全在落点之后：砸中一个离地的目标，就把它从天上拽到它正下方的地面、拔掉它身上的浮空身份、
 *   打断它正在进行的空中动作，并在它身上钉一段 `world_combat:status/smackdown`（贴地的对手也照样挂，
 *   因为它本来就是「被钉住」的身份）；贴地的普通对手只挨这一记。
 *
 * 与同族分开（同一族「垂直轴」，见报告）：
 *   击落   —— 远程投出一支配重岩弹，把空中的对手拽下来并钉住；威力低，是功能位。
 *   自由落体 —— 贴身抓住对手带上天再摔下来；控制最重、必须近身。
 *   飞身重压 —— 近身跃起从空中压下来，双属性、按体重结算并短暂按倒。
 *
 * 数值来源（每项依赖不同的精灵数据，分散到不同参数上）：
 *   impact          岩弹威力 50 + 物攻偏移 + 施法者体重偏移；命中时按目标是否离地再乘一档（离地更重）。
 *   pinTicks        钉地时长 70 刻 + 等级 + **目标体重**偏移：越沉的对手落得越实、钉得越久。
 *   throwSpeed      出手速度 0.9 格/刻 + 速度偏移：手快的抛得急、更难在半空侧移躲开。
 *   reach           施放距离 12 格 + 等级 + 物攻：力量与等级把岩弹送得更远。
 *   collisionRadius 命中判定 0.32 格 + 体型高度偏移。
 *   pull            拖落速度 0.8 格/刻 + 物攻偏移：把对手往下拽的快慢，也是它坠地的画面速度。
 *
 * 配置 `flyersOnly`（只打空中的）：开启＝只对离地/飞行/浮空的目标投石（省 PP，专做防空）；
 *   关闭＝也当普通远程石击用。两向各有适用局面。
 *
 * 伤害段 `impact` 与参数同名，走共享换算（原生类别 Physical、属性 Rock）。
 */
namespace PokemonSkills {
    actionParameters.define("smackdown", {
        /** 岩弹威力：50 + 物攻偏移[−8,22] + 体重偏移[−4,10]，离地目标 ×1.35；夹 32..96。 */
        impact: formula(
            F.base(50)
                .plus(F.stat("attack").minus(60).times(0.2).clamp(-8, 22))
                .plus(F.body("weight").minus(300).times(0.012).clamp(-4, 10))
                .times(F.when(F.target("actor.grounded", { key: "worldcombat.skill.smackdown.value.airborne", fallback: "空中目标" }), F.const(1), F.const(1.35)))
                .clamp(32, 96).round(1),
            "岩弹威力", { base: 50,
                unit: "威力",
                description: "岩弹砸实那一下的威力；物攻越高、身体越沉，抛出的配重越有力。命中时若目标离地在空，这一记更重。对手防御、相性与暴击在命中时另算。"
            }),
        /** 钉地时长：70 + 等级偏移[0,36] + 目标体重偏移[−15,30]；夹 45..150 刻。 */
        pinTicks: seconds(
            F.base(70)
                .plus(F.level().minus(20).times(0.6).clamp(0, 36))
                .plus(F.target("individual.weight", { key: "worldcombat.skill.smackdown.value.targetWeight", fallback: "目标体重" }).minus(300).times(0.05).clamp(-15, 30))
                .clamp(45, 150).round(0),
            "钉地时长", "被打落的目标在地上被钉住多久；等级越高、目标越沉，落得越实、钉得越久。"),
        /** 出手速度：0.9 + 速度偏移[−0.15,0.35]；夹 0.65..1.35 格/刻。 */
        throwSpeed: formula(
            F.base(0.9).plus(F.stat("speed").minus(60).times(0.004).clamp(-0.15, 0.35)).clamp(0.65, 1.35).round(2),
            "出手速度", {
                unit: "格/刻",
                description: "岩弹离手时的速度；速度快的个体抛得更急，空中的目标更难在它到达前侧移躲开。"
            }),
        /** 施放距离：12 + 等级偏移[0,2] + 物攻偏移[−1,1.5]；夹 9..15 格。 */
        reach: formula(
            F.base(12).plus(F.level().minus(25).times(0.04).clamp(0, 2))
                .plus(F.stat("attack").minus(60).times(0.008).clamp(-1, 1.5))
                .clamp(9, 15).round(1),
            "施放距离", {
                unit: "格",
                description: "能把岩弹投到多远的目标身上；力量与等级越高送得越远。它也是本招的实际射程来源。"
            }),
        /** 命中判定：0.32 + 体型高度偏移[−0.06,0.16]；夹 0.24..0.55 格。 */
        collisionRadius: formula(
            F.base(0.32).plus(F.body("height").minus(1.4).times(0.08).clamp(-0.06, 0.16)).clamp(0.24, 0.55).round(2),
            "命中判定", {
                unit: "格",
                description: "岩弹本体的碰撞半径；大个子抛出的石头更大，更容易蹭到目标。"
            }),
        /** 拖落速度：0.8 + 物攻偏移[−0.1,0.5]；夹 0.45..1.4 格/刻。 */
        pull: formula(
            F.base(0.8).plus(F.stat("attack").minus(60).times(0.006).clamp(-0.1, 0.5)).clamp(0.45, 1.4).round(2),
            "拖落速度", {
                unit: "格/刻",
                description: "把空中的目标往地面拽的快慢；物攻越高拽得越急。它也是目标坠地那一段的画面速度。"
            }),
        flightRange: hidden(18),
        traceAhead: hidden(1.2)
    });

    defineDamage("smackdown", "impact", {});

    stages("smackdown", [
        { level: 26, values: { impact: 58 } },
        { level: 44, values: { impact: 68, pinTicks: 100 } }
    ]);

    describe("smackdown", [
        { key: "description.0", values: ["impact"] },
        { key: "description.1", values: ["pinTicks"] },
        { key: "description.2", values: ["reach", "throwSpeed"] },
        { key: "description.3", values: ["collisionRadius"] },
        { key: "flyers.on", values: [], when: function (context) { return read(context.detail.values, ["flyersOnly"]) === true; } },
        { key: "flyers.off", values: [], when: function (context) { return read(context.detail.values, ["flyersOnly"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.impact"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.impact", "tier.1.pinTicks"] }
    ]);
}
