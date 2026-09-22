/**
 * 高速旋转 / rapidspin —— 参数与伤害段。本组「旋身破缚」的脱缚·提速成员。
 *
 * 原生事实：Normal／物理／威力 50／命中 100／PP 40／contact；命中后甩掉寄生种子与绑紧、紧束这类束缚
 *   （partiallytrapped），再做自身速度 +1（secondary self boosts spe 1）（Cobblemon 1.8 / Showdown）。
 *   59 位学习者。描述「通过旋转来攻击对手。可以摆脱绑紧、紧束、寄生种子等招式。还能提高自己的速度。」
 *
 * 翻译：把「旋转攻击、摆脱束缚、提高速度」做成**原地旋成一圈风**——重心一沉、身体贴着地面高速自转，把缠在
 *   身上的东西（共享身份 partiallytrapped／trapped／leechseed 与 rooted）甩脱，同时以自身为心扫开身边的人，
 *   借转速提一口气（速度 +1 级）。它是本组最快的脱身手段，也是唯一让自己变快的一招。
 *
 * 与同族分开：晶光转转同样脱缚，但它是**把毒甩到周围**、给自己不加速度；高速旋转是**把风甩开、给自己提速**。
 *   两者都能从缠斗里脱身，玩家凭「脱身之后更快 vs 周围的人中毒」分开。
 *
 * 数据分散（每个参数读不同的精灵数据，小差距才在场上看得出来）：
 *   spin       旋扫威力：**物攻**给扫的狠度，**速度**给旋转的动量，等级定发力；广旋 ×0.9 / 紧旋 ×1.1。
 *   radius     旋风半径：**体宽**与等级决定旋得多开；广旋 ×1.3。它就是本招的实际射程。
 *   rings      旋动圈数：速度派生，同时是画面里风环的重放次数。
 *   push       顶开距离：物攻，广旋 ×1.15。
 *   haste      自身提速级：原生固定 1 级，是这招的身份。
 *   wind       风屑数量：速度与物攻派生，直接驱动画面发射量。
 *   tempo/recover/recharge：速度与等级定时序；广旋更慢更费。
 *
 * 配置 `wide`（广旋，默认关）双向取舍：开＝半径 ×1.3、风屑更密、顶开 ×1.15，扫得更开，代价是威力 ×0.9、
 *   起手 +2 刻、冷却 +8 刻；关（紧旋）＝威力 ×1.1、出手快、冷却短，但只扫到贴身的人。两向各有适用局面
 *   （被围住时旋开一圈 vs 贴着目标快速旋一记再提速）。
 *
 * 伤害段 `spin` 与参数同名，标 contact（原生接触）。
 */
namespace PokemonSkills {
    actionParameters.define("rapidspin", {
        /** 旋扫威力：基础 48；物攻每比 55 多 1 加 0.24（夹 −12..36）；速度每比 60 快 1 加 0.3（夹 −6..16）；
         *  等级每比 30 高 1 加 0.25（夹 −4..10）；广旋 ×0.9 / 紧旋 ×1.1；夹 26..110。 */
        spin: formula(
            F.base(48)
                .plus(F.stat("attack").minus(55).times(0.24).clamp(-12, 36))
                .plus(F.stat("speed").minus(60).times(0.3).clamp(-6, 16))
                .plus(F.level().minus(30).times(0.25).clamp(-4, 10))
                .times(F.when(F.pref("wide", text("worldcombat.skill.rapidspin.preference.wide")), F.const(0.9), F.const(1.1)))
                .clamp(26, 110).round(1),
            "旋扫威力", {
                unit: "威力",
                description: "旋转扫到身边每个敌人时各结算一次的基础威力；物攻越高扫得越狠，速度给旋转的动量，等级越高转得越稳。对手防御、相性与暴击在命中时另算。广旋式扫得更开但每一记更轻，紧旋式更重。"
            }),
        /** 旋风半径：基础 2.8；体宽每比 0.9 宽 1 格加 1.1（夹 −0.3..1.4）；等级每比 25 高 1 加 0.03（夹 0..1.2）；
         *  广旋 ×1.3；夹 1.8..5.0。 */
        radius: formula(
            F.base(2.8)
                .plus(F.body("width").minus(0.9).times(1.1).clamp(-0.3, 1.4))
                .plus(F.level().minus(25).times(0.03).clamp(0, 1.2))
                .times(F.when(F.pref("wide", text("worldcombat.skill.rapidspin.preference.wide")), F.const(1.3), F.const(1)))
                .clamp(1.8, 5.0).round(2),
            "旋风半径", {
                unit: "格",
                description: "原地旋一圈能扫到多远；身板越宽、等级越高扫得越开，广旋式再放大三成。它也是本招的实际射程与指示圈半径。"
            }),
        /** 旋动圈数：基础 2 + 速度每比 60 快 1 加 0.01（夹 0..2）；夹 2..4 向下取整。 */
        rings: formula(
            F.base(2).plus(F.stat("speed").minus(60).times(0.01).clamp(0, 2)).clamp(2, 4).floor(),
            "旋动圈数", {
                unit: "圈",
                description: "一次高速旋转来回扫几圈，也是画面里地面风环的重放次数；腿快的人转得更多。"
            }),
        /** 顶开距离：基础 0.4 + 物攻每比 55 多 1 加 0.006（夹 −0.1..0.7）；广旋 ×1.15；夹 0.1..1.2。 */
        push: formula(
            F.base(0.4).plus(F.stat("attack").minus(55).times(0.006).clamp(-0.1, 0.7))
                .times(F.when(F.pref("wide"), F.const(1.15), F.const(1)))
                .clamp(0.1, 1.2).round(2),
            "顶开距离", {
                unit: "格",
                description: "旋风把身边的人沿离中心的方向顶开多远；物攻越高顶得越远，广旋式顶得更开。"
            }),
        /** 自身提速级：原生固定 1 级，是这招的身份。 */
        haste: formula(F.const(1).clamp(1, 3).round(0), "自身提速", {
            unit: "级",
            description: "旋完之后自身速度抬高的能力等级；对宝可梦落到原生速度等级，对其他战斗者落到移动速度属性。原生固定 1 级。"
        }),
        /** 风屑数量：基础 18 + 速度每比 60 快 1 加 0.2（夹 −3..14）+ 物攻每比 55 多 1 加 0.1（夹 −2..8）；夹 12..44。 */
        wind: formula(
            F.base(18)
                .plus(F.stat("speed").minus(60).times(0.2).clamp(-3, 14))
                .plus(F.stat("attack").minus(55).times(0.1).clamp(-2, 8))
                .clamp(12, 44).round(0),
            "风屑数量", {
                unit: "点",
                description: "旋转甩出的风屑数量，随速度与物攻增长；粒子按它发射，画面里的数量与机制一致。"
            }),
        /** 起手：基础 7 − 速度每比 60 快 1 减 0.03（夹 −1..3）；广旋 +2；夹 4..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03).clamp(-1, 3))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.rapidspin.preference.wide")), F.const(2), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "重心一沉、把转速提起来的时间；速度越快越短，广旋式多压一拍。"),
        /** 收招：基础 6 − 速度每比 60 快 1 减 0.03（夹 −1.5..2.5）；夹 3..10。 */
        recover: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5)).clamp(3, 10).round(0),
            "收招", "旋完把风收住、重新站稳的时间；速度越快收得越利落。"),
        /** 冷却：基础 26 − 等级每比 20 高 1 减 0.2（夹 −3..6）；广旋 +8；夹 16..46。 */
        recharge: seconds(
            F.base(26).minus(F.level().minus(20).times(0.2).clamp(-3, 6))
                .plus(F.when(F.pref("wide", text("worldcombat.skill.rapidspin.preference.wide")), F.const(8), F.const(0)))
                .clamp(16, 46).round(0),
            "冷却", "两次高速旋转之间的等待；等级越高回气越快，广旋式更费。PP 40 的代价。"),
        maxTargets: hidden(8)
    });

    defineDamage("rapidspin", "spin", {}, { contact: true });

    stages("rapidspin", [
        { level: 40, values: { spin: 60, radius: 3.4 } },
        { level: 56, values: { spin: 70, wind: 34 } }
    ]);

    describe("rapidspin", [
        { key: "description.0", values: ["spin", "radius"] },
        { key: "description.1", values: ["rings", "push", "haste"] },
        { key: "description.2", values: ["wind"] },
        { key: "wide.on", values: [], when: function (context) { return read(context.detail.values, ["wide"]) === true; } },
        { key: "wide.off", values: [], when: function (context) { return read(context.detail.values, ["wide"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "recover", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.spin", "tier.0.radius"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.spin", "tier.1.wind"] }
    ]);
}
