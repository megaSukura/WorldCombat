/**
 * 双刃头锤 / headsmash 的参数与伤害段。
 *
 * 原生事实：Rock、物理、威力 150、命中 80、PP 5、接触、反作用力 1/2（Cobblemon 1.8，40 位学习者）。
 * 翻译：把“拼命使出浑身力气，向对手进行头锤攻击，自己也会受到非常大的伤害”落成一次**孤注一掷的正面头撞**：
 * 低头沿瞄准方向直线冲出一段，用整个头把目标撞飞，代价是这一撞的反作用力几乎一模一样地砸回自己身上。
 * 它比同类猛撞更“双刃”——**冲空也会一头栽在地上**，自己照样掉血。这一招的身份就是“伤敌一千、自损八百”。
 *
 * 与同族分开：舍身冲撞是中等反伤、撞完双方被弹开；爆炸头突击是一条线撞穿多个目标、反伤较轻；
 * 双刃头锤只撞一个目标，但每一记都重得离谱、反震也重得离谱，冲空还会自伤。玩家凭“自己掉血有多狠”分开它们。
 *
 * 数据分散（每项读不同的精灵数据）：
 *   smash          头撞威力：物攻给出撞击的狠度，体重把份量压进这一头。
 *   chargeLength   冲撞距离：速度与体重决定冲得多远、够到哪。
 *   speed          推进速度：速度决定每刻前进多少。
 *   collisionRadius 判定半径：碰撞箱高度决定头面大小。
 *   recoil         反伤比例：防御越高越轻，是这招最主要的自损来源。
 *   selfCrash      冲空自伤：冲空时按自身最大生命比例掉血，防御同样能减轻。
 *   shove          击退距离：体重与物攻决定把目标撞飞多远。
 *   tempo/aftercast/recharge  速度决定起手、收招与冷却。
 * 配置 hold（稳头式）双向取舍：威力、反伤、自伤、击退都收一档，换更短的起手、收招与冷却；
 * 拼命式则把一切都放大。两个方向各有适用局面（结算 vs 生存）。
 *
 * 伤害段 smash：这一头随精灵数据变化的那部分。
 */
namespace PokemonSkills {
    actionParameters.define("headsmash", {
        /** 头撞威力：物攻每比 60 多 1 加 0.5（上限 +50），体重每比 60 多 1 加 0.25（上限 +45）；稳头 ×0.94；夹在 90..240。 */
        smash: formula(
            F.base(150).plus(F.stat("attack").minus(60).times(0.5).clamp(-25, 50))
                .plus(F.body("weight").minus(60).times(0.25).clamp(-15, 45))
                .times(F.when(F.pref("hold"), F.const(0.94), F.const(1)))
                .clamp(90, 240).round(1),
            "头撞威力", {
                unit: "威力",
                description: "这一头命中的基础威力；物攻越高、身体越沉撞得越狠，稳头式收一档。对手防御、相性与暴击在命中时另算。"
            }),
        /** 冲撞距离：基础 3.6 格，速度每比 60 快 1 加 0.02，体重每比 60 多 1 加 0.003；稳头 ×0.85；夹在 2.6..6.0。 */
        chargeLength: formula(
            F.base(3.6).plus(F.stat("speed").minus(60).times(0.02).clamp(-0.9, 2.2))
                .plus(F.body("weight").minus(60).times(0.003).clamp(-0.3, 1.0))
                .times(F.when(F.pref("hold"), F.const(0.85), F.const(1)))
                .clamp(2.6, 6.0).round(2),
            "冲撞距离", {
                unit: "格",
                description: "从起步到刹停的总位移；驱动目标接受范围，也决定撞空后栽出去多远。稳头式收得更短。"
            }),
        /** 推进速度：速度每比 60 快 1 加 0.006；夹在 0.55..1.4。 */
        speed: formula(
            F.base(0.78).plus(F.stat("speed").minus(60).times(0.006).clamp(-0.23, 0.62)).clamp(0.55, 1.4).round(2),
            "推进速度", {
                unit: "格/刻",
                description: "低头猛冲时每刻前进的距离；越快越难被让开，撞空也冲得越远。"
            }),
        /** 判定半径：基础 0.55 格加碰撞箱高度 ×0.16；夹在 0.4..0.95。 */
        collisionRadius: formula(
            F.base(0.55).plus(F.body("height").minus(1.4).times(0.16)).clamp(0.4, 0.95).round(2),
            "判定半径", {
                unit: "格",
                description: "整颗头扫过的横向判定半径；脑袋越大扫得越宽。"
            }),
        /** 反伤比例：基础 0.42，防御每比 60 多 1 少 0.0007（上限 −0.16）；稳头 ×0.8 / 拼命 ×1.15；夹在 0.18..0.55。 */
        recoil: formula(
            F.base(0.42).minus(F.stat("defence").minus(60).times(0.0007).clamp(0, 0.16))
                .times(F.when(F.pref("hold"), F.const(0.8), F.const(1.15)))
                .clamp(0.18, 0.55).round(3),
            "反伤比例", {
                unit: "比例",
                description: "命中后按实际伤害反噬自己的比例；防御越高越轻，稳头式明显更轻、拼命式更重。这是本招最主要的自损来源。"
            }),
        /** 冲空自伤：基础 0.09（自身最大生命比例），防御每比 60 多 1 少 0.0003（上限 −0.06）；稳头 ×0.5；夹在 0.03..0.18。 */
        selfCrash: formula(
            F.base(0.09).minus(F.stat("defence").minus(60).times(0.0003).clamp(0, 0.06))
                .times(F.when(F.pref("hold"), F.const(0.5), F.const(1)))
                .clamp(0.03, 0.18).round(3),
            "冲空自伤", {
                unit: "比例",
                description: "冲到底没撞到人、一头栽在地上时，按自身最大生命扣掉的比例；防御能减轻，稳头式减半。"
            }),
        /** 击退距离：基础 1.0 格，体重每比 60 多 1 加 0.005（上限 +1.0），物攻每比 60 多 1 加 0.004（上限 +0.6）；稳头 ×0.9；夹在 0.5..2.4。 */
        shove: formula(
            F.base(1.0).plus(F.body("weight").minus(60).times(0.005).clamp(-0.3, 1.0))
                .plus(F.stat("attack").minus(60).times(0.004).clamp(-0.2, 0.6))
                .times(F.when(F.pref("hold"), F.const(0.9), F.const(1)))
                .clamp(0.5, 2.4).round(2),
            "击退距离", {
                unit: "格",
                description: "命中后把目标沿冲撞方向撞飞多远；越重、物攻越高撞得越远。"
            }),
        /** 起手：基础 9 刻，速度每比 60 快 1 减 0.02 刻，稳头 −2 刻；夹在 5..14。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").minus(60).times(0.02).clamp(-3, 4))
                .minus(F.when(F.pref("hold"), F.const(2), F.const(0)))
                .clamp(5, 14).round(0),
            "起手", "低头刨地、蓄到能撞出去的时间；速度越快越短，稳头式出手更早。"),
        /** 收招：基础 12 刻，速度每比 60 快 1 减 0.03 刻，稳头 −2 刻；夹在 6..18。 */
        aftercast: seconds(
            F.base(12).minus(F.stat("speed").minus(60).times(0.03).clamp(-4, 5))
                .minus(F.when(F.pref("hold"), F.const(2), F.const(0)))
                .clamp(6, 18).round(0),
            "收招", "撞完刹停的收势；速度越快越短，稳头式更利落。"),
        /** 冷却：基础 56 刻，速度每比 60 快 1 减 0.06 刻，稳头 −8 刻；夹在 36..84。 */
        recharge: seconds(
            F.base(56).minus(F.stat("speed").minus(60).times(0.06).clamp(-6, 12))
                .minus(F.when(F.pref("hold"), F.const(8), F.const(0)))
                .clamp(36, 84).round(0),
            "冷却", "两次拼命头撞之间的等待；速度越快回得越快，稳头式缓得更短。"),
        traceAhead: hidden(1.2),
        minimumMove: hidden(0.05)
    });

    stages("headsmash", [
        { level: 34, values: { smash: 160 } },
        { level: 54, values: { smash: 176, recoil: 0.44 } }
    ]);

    defineDamage("headsmash", "smash", { defenceCoefficient: 0.0048,
        rationale: "头骨对护甲的钝撞穿透更强，让体格与等级差更明显。" }, { contact: true });

    describe("headsmash", [
        { key: "description.0", values: ["smash", "chargeLength", "speed", "collisionRadius"] },
        { key: "description.charge", values: [] },
        { key: "description.1", values: ["recoil","selfCrash","shove"] },
        { key: "hold.on", values: [], when: function (context) { return read(context.detail.values, ["hold"]) === true; } },
        { key: "hold.off", values: [], when: function (context) { return read(context.detail.values, ["hold"]) !== true; } },
        { key: "timing", values: ["range","prepare","recover","pp","cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.smash"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.smash", "tier.1.recoil"] }
    ]);
}
