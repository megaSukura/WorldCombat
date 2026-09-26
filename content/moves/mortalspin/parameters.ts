/**
 * 晶光转转 / mortalspin —— 参数与伤害段。本组「旋身破缚」的脱缚·放毒成员。
 *
 * 原生事实：Poison／物理／威力 30／命中 100／PP 15／contact／target allAdjacentFoes（自身周围所有敌人）；
 *   命中后甩掉寄生种子与绑紧、紧束这类束缚（partiallytrapped），并让对手中毒（secondary chance 100 status psn）
 *   （Cobblemon 1.8 / Showdown）。学习者仅 1 位。描述「通过旋转来攻击对手。可以摆脱绑紧、紧束、寄生种子等
 *   招式。还能让对手陷入中毒状态。」
 *
 * 翻译：把「旋转攻击、摆脱束缚、让对手中毒」做成**旋身甩出一圈带毒的晶光**——身体一转，缠在身上的东西被
 *   甩脱，随后朝四周甩出有限几枚**真实毒晶**，晶与晶之间留出缝隙；一枚晶碰到一个敌人就结算一次，方块会挡住
 *   对应的晶。它是本组唯一的毒系散射招，范围与总伤预算都不高于原来的原地圈伤。
 *
 * 与同族分开：高速旋转同样脱缚，但它是**把风甩开、给自己提速**；晶光转转是**把毒晶撒成一圈短飞晶**、给自己
 *   不加速。两者都能从缠斗里脱身，玩家凭「脱身之后更快 vs 周围的人中毒」分开。
 *
 * 数据分散（每个参数读不同的精灵数据，小差距才在场上看得出来）：
 *   spin       晶光威力：**物攻**给甩的狠度，**速度**给旋转的动量，等级定发力；剧毒式 ×0.85 / 晶光式 ×1.1。
 *   radius     晶光半径：**体宽**与等级；剧毒式 ×0.9 / 晶光式 ×1.15。它就是毒晶的飞行射程。
 *   rings      旋动圈数：速度派生，同时是画面里毒环的重放次数。
 *   crystals   毒晶数：**速度**与等级派出真实甩出的毒晶枚数，决定晶环的疏密与缝隙。
 *   push       顶开距离：物攻。
 *   toxin      中毒时长：**等级**决定毒在对方身上留多久；剧毒式 ×1.4。
 *   scatter    毒晶碎光数量：物攻与等级派生，直接驱动画面发射量。
 *   tempo/recover/recharge：速度与等级定时序；剧毒式更慢更费。
 *
 * 配置 `virulent`（剧毒式，默认关）双向取舍：开＝命中目标改为**剧毒**（掉血更快）且毒时长 ×1.4，代价是
 *   威力 ×0.85、半径 ×0.9、起手 +2 刻；关（晶光式）＝半径 ×1.15、威力 ×1.1，上普通毒。两向各有适用局面
 *   （慢慢磨掉一个硬目标 vs 一次给一群人上毒）。
 *
 * 伤害段 `spin` 与参数同名，标 contact（原生接触）。毒走 CombatStatus.inflict 的共享身份 `poison`／`toxic`，
 * 对宝可梦会同步成原生异常。
 */
namespace PokemonSkills {
    actionParameters.define("mortalspin", {
        /** 晶光威力：基础 30；物攻每比 55 多 1 加 0.2（夹 −10..30）；速度每比 60 快 1 加 0.22（夹 −5..12）；
         *  等级每比 30 高 1 加 0.2（夹 −3..8）；剧毒 ×0.85 / 晶光 ×1.1；夹 16..70。 */
        spin: formula(
            F.base(30)
                .plus(F.stat("attack").minus(55).times(0.2).clamp(-10, 30))
                .plus(F.stat("speed").minus(60).times(0.22).clamp(-5, 12))
                .plus(F.level().minus(30).times(0.2).clamp(-3, 8))
                .times(F.when(F.pref("virulent", text("worldcombat.skill.mortalspin.preference.virulent")), F.const(0.85), F.const(1.1)))
                .clamp(16, 70).round(1),
            "晶光威力", {
                unit: "威力",
                description: "旋转甩出的毒晶扫到身边每个敌人时各结算一次的基础威力；物攻越高甩得越狠，速度给旋转的动量。对手防御、相性与暴击在命中时另算。晶光式威力更高，剧毒式把力气花在毒上。"
            }),
        /** 晶光半径：基础 2.6；体宽每比 0.9 宽 1 格加 1.0（夹 −0.3..1.3）；等级每比 25 高 1 加 0.03（夹 0..1.1）；
         *  剧毒 ×0.9 / 晶光 ×1.15；夹 1.6..4.6。 */
        radius: formula(
            F.base(2.6)
                .plus(F.body("width").minus(0.9).times(1.0).clamp(-0.3, 1.3))
                .plus(F.level().minus(25).times(0.03).clamp(0, 1.1))
                .times(F.when(F.pref("virulent", text("worldcombat.skill.mortalspin.preference.virulent")), F.const(0.9), F.const(1.15)))
                .clamp(1.6, 4.6).round(2),
            "晶光半径", {
                unit: "格",
                description: "毒晶朝四周能飞多远；身板越宽、等级越高飞得越开，晶光式再放大一成五。它也是本招的实际射程与指示圈半径。"
            }),
        /** 旋动圈数：基础 2 + 速度每比 60 快 1 加 0.01（夹 0..2）；夹 2..4 向下取整。 */
        rings: formula(
            F.base(2).plus(F.stat("speed").minus(60).times(0.01).clamp(0, 2)).clamp(2, 4).floor(),
            "旋动圈数", {
                unit: "圈",
                description: "一次晶光转转来回荡几圈，也是画面里毒环的重放次数；腿快的人转得更多。"
            }),
        /** 毒晶数：基础 8 + 速度每比 60 快 1 加 0.05（夹 −1..3）+ 等级每比 25 高 1 加 0.06（夹 0..2）；夹 6..12 向下取整。 */
        crystals: formula(
            F.base(8)
                .plus(F.stat("speed").minus(60).times(0.05).clamp(-1, 3))
                .plus(F.level().minus(25).times(0.06).clamp(0, 2))
                .clamp(6, 12).floor(),
            "毒晶数", {
                unit: "枚",
                description: "原地朝四周甩出的真实毒晶枚数；速度与等级越高甩得越多，每一枚碰到一个敌人结算一次，晶与晶之间留有可躲的缝隙。"
            }),
        /** 顶开距离：基础 0.35 + 物攻每比 55 多 1 加 0.006（夹 −0.1..0.6）；夹 0.1..1.0。 */
        push: formula(
            F.base(0.35).plus(F.stat("attack").minus(55).times(0.006).clamp(-0.1, 0.6)).clamp(0.1, 1.0).round(2),
            "顶开距离", {
                unit: "格",
                description: "毒晶把身边的人沿离中心的方向顶开多远；物攻越高顶得越远。"
            }),
        /** 中毒时长：基础 400 + 等级每比 25 高 1 加 12（夹 0..360）；剧毒 ×1.4；夹 200..900。 */
        toxin: seconds(
            F.base(400).plus(F.level().minus(25).times(12).clamp(0, 360))
                .times(F.when(F.pref("virulent"), F.const(1.4), F.const(1)))
                .clamp(200, 900).round(0),
            "中毒时长", "被毒晶沾到的人身上中毒状态停留多久；等级越高毒越顽固，剧毒式留得更久。"),
        /** 毒晶数量：基础 16 + 物攻每比 55 多 1 加 0.12（夹 −3..12）+ 等级每比 30 高 1 加 0.3（夹 0..8）；夹 10..40。 */
        scatter: formula(
            F.base(16)
                .plus(F.stat("attack").minus(55).times(0.12).clamp(-3, 12))
                .plus(F.level().minus(30).times(0.3).clamp(0, 8))
                .clamp(10, 40).round(0),
            "毒晶碎光", {
                unit: "点",
                description: "毒晶甩出与碰撞时迸散的碎光数量，随物攻与等级增长；粒子按它发射，画面里的数量与机制一致。"
            }),
        /** 起手：基础 7 − 速度每比 60 快 1 减 0.03（夹 −1..3）；剧毒 +2；夹 4..12。 */
        tempo: seconds(
            F.base(7).minus(F.stat("speed").minus(60).times(0.03).clamp(-1, 3))
                .plus(F.when(F.pref("virulent", text("worldcombat.skill.mortalspin.preference.virulent")), F.const(2), F.const(0)))
                .clamp(4, 12).round(0),
            "起手", "把毒晶从身上甩起来的时间；速度越快越短，剧毒式多蓄一拍。"),
        /** 收招：基础 6 − 速度每比 60 快 1 减 0.03（夹 −1.5..2.5）；夹 3..10。 */
        recover: seconds(
            F.base(6).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 2.5)).clamp(3, 10).round(0),
            "收招", "旋完把毒晶落定、重新站稳的时间；速度越快收得越利落。"),
        /** 冷却：基础 30 − 等级每比 20 高 1 减 0.2（夹 −3..6）；剧毒 +8；夹 18..48。 */
        recharge: seconds(
            F.base(30).minus(F.level().minus(20).times(0.2).clamp(-3, 6))
                .plus(F.when(F.pref("virulent", text("worldcombat.skill.mortalspin.preference.virulent")), F.const(8), F.const(0)))
                .clamp(18, 48).round(0),
            "冷却", "两次晶光转转之间的等待；等级越高回气越快，剧毒式更费。PP 15 的代价。"),
        maxTargets: hidden(8)
    });

    defineDamage("mortalspin", "spin", {}, { contact: true });

    stages("mortalspin", [
        { level: 36, values: { spin: 40, toxin: 500 } },
        { level: 52, values: { spin: 48, scatter: 30 } }
    ]);

    describe("mortalspin", [
        { key: "description.0", values: ["spin","radius","crystals","maxTargets"] },
        { key: "description.1", values: ["push"] },
        { key: "description.2", values: ["toxin"] },
        { key: "virulent.on", values: [], when: function (context) { return read(context.detail.values, ["virulent"]) === true; } },
        { key: "virulent.off", values: [], when: function (context) { return read(context.detail.values, ["virulent"]) !== true; } },
        { key: "timing", values: ["range", "tempo", "recover", "pp", "recharge"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.spin", "tier.0.toxin"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.spin"] }
    ]);
}
