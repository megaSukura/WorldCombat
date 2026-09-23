/**
 * 上菜 / orderup 的参数与伤害段。
 *
 * 原生事实：Dragon／物理／威力 80／命中 100／PP 10；出手时不接触（无 contact 标记）；
 *   若口中有米立龙（commanded），按其样子提高自身一项能力——Droopy 提防御、Stretchy 提速度、其余（Curly）提攻击。
 *   Cobblemon 1.8，1 位学习者（吃吼霸）。
 * 核心念头：以潇洒的身手端出一记精准的下手；最特别的一点是它「带着一味菜」——身边跟着一只小个子伙伴时，
 *   这记下手的香味会按那伙伴的样子，给施法者补上一项能力。它不接触，是全族唯一「出手即增益」的一招。
 *
 * 数值分散（每个参数读不同的个体数据）：
 *   serve       下手威力：物攻给手法，速度给身段，等级给火候。
 *   serveWidth  下手半宽：碰撞箱宽度决定这一下的落面。
 *   reach       出手距离：速度与亲密度共同决定能端到多远。
 *   wardBreak   碎壁半径：物攻决定这一记震碎多广的屏障（上菜同样能打碎光墙与反射壁）。
 *   dishRange   伙伴距离：身体越宽，能把「菜」端得越远。
 *   shareRadius 分餐半径：身高决定能把增益分给多远的队友。
 *   serveStages 增益级数：亲密度高（≥200）多补一级。
 *   tempo／aftercast／recharge 时序：速度与亲密度决定起手、收势与再端一次的等待。
 * 配置 share（分餐式）：自身与身旁队友各 +1，碎壁范围 ×1.2，代价是单发威力 ×0.94、冷却 +8 刻；
 *   独享式相反，自身 2 级增益、单发威力 ×1.06，但只震碎命中点的屏障、冷却更短。
 *
 * 伤害段 serve：下手拍中的那一下（不接触）。
 */
namespace PokemonSkills {
    actionParameters.define("orderup", {
        /** 下手威力：基础 74，物攻每比 60 多 1 加 0.32（上限 +32），速度每比 55 快 1 加 0.16（上限 +18），等级 30 起每级 +0.4（上限 +12）；分餐 ×0.94 / 独享 ×1.06；夹 50..122。 */
        serve: formula(
            F.base(74)
                .plus(F.stat("attack").minus(60).times(0.32).clamp(-12, 32))
                .plus(F.stat("speed").minus(55).times(0.16).clamp(-5, 18))
                .plus(F.level().minus(30).times(0.4).clamp(-8, 12))
                .times(F.when(F.pref("share", text("worldcombat.skill.orderup.preference.share")), F.const(0.94), F.const(1.06)))
                .clamp(50, 122).round(1),
            "下手威力", {
                unit: "威力",
                description: "以潇洒身段端出去的一记下手的基础威力；物攻给手法、速度给身段、等级给火候。对手防御、相性与暴击在命中时另算。"
            }),
        /** 下手半宽：基础 0.45 格，碰撞箱每比 0.9 宽 1 格加 0.3（上限 +0.45）；夹 0.35..0.9。 */
        serveWidth: formula(
            F.base(0.45)
                .plus(F.body("width").minus(0.9).times(0.3).clamp(-0.1, 0.45))
                .clamp(0.35, 0.9).round(2),
            "下手半宽", {
                unit: "格",
                description: "这一下覆盖的横向半宽；身形越宽的个体落面越大。"
            }),
        /** 出手距离：基础 2.8 格，速度每比 55 快 1 加 0.012（上限 +0.9），亲密度每 200 点加 0.2；夹 2.4..4.2。 */
        reach: formula(
            F.base(2.8)
                .plus(F.stat("speed").minus(55).times(0.012).clamp(-0.3, 0.9))
                .plus(F.individual("friendship").div(200).times(0.2).clamp(-0.1, 0.4))
                .clamp(2.4, 4.2).round(2),
            "出手距离", {
                unit: "格",
                description: "能把这一记端到多远的直距；快、与训练家亲密的个体端得更远。它也是本招的实际射程来源。"
            }),
        /** 碎壁半径：基础 8 格，物攻每比 60 多 1 加 0.02（上限 +1.6）；分餐 ×1.2；夹 8..11。 */
        wardBreak: formula(
            F.base(8)
                .plus(F.stat("attack").minus(60).times(0.02).clamp(0, 1.6))
                .times(F.when(F.pref("share", text("worldcombat.skill.orderup.preference.share")), F.const(1.2), F.const(1)))
                .clamp(8, 11).round(2),
            "碎壁半径", {
                unit: "格",
                description: "下手落点周围被震碎的屏障范围；反射壁、光墙与极光幕一并失效，物攻越高震得越远。"
            }),
        /** 伙伴距离：基础 1.4 格，碰撞箱每比 0.9 宽 1 格加 1.2（上限 +1.8）；夹 2.0..3.2。 */
        dishRange: formula(
            F.base(1.4)
                .plus(F.body("width").minus(0.9).times(1.2).clamp(-0.1, 1.8))
                .clamp(2.0, 3.2).round(2),
            "伙伴距离", {
                unit: "格",
                description: "把「菜」（身边携带的小个子伙伴）端住的距离；身体越宽的个体端得越远。此范围内有比自身明显小的友方时才能补上增益。"
            }),
        /** 分餐半径：基础 4 格，身高每比 1.4 高 1 格加 0.6（上限 +2.0）；夹 3..6。 */
        shareRadius: formula(
            F.base(4)
                .plus(F.body("height").minus(1.4).times(0.6).clamp(-0.3, 2.0))
                .clamp(3, 6).round(2),
            "分餐半径", {
                unit: "格",
                description: "分餐式下能把增益一并端给多远的友方；身高的个体端得更开。"
            }),
        /** 增益级数：基础 1 级，亲密度 ≥200 时再补 1 级。 */
        serveStages: formula(
            F.base(1).plus(F.when(F.individual("friendship").gte(200), F.const(1), F.const(0))).round(0),
            "增益级数", {
                unit: "级",
                description: "按伙伴样子补上的能力等级；与训练家亲密度高（≥200）时多补一级。独享式在此之上再加一级。"
            }),
        /** 起手：基础 8 刻，速度每比 55 快 1 少 0.04（上限 −1.5），亲密度每 200 点少 0.4 刻；夹 4..11。 */
        tempo: seconds(
            F.base(8)
                .minus(F.stat("speed").minus(55).times(0.04).clamp(-1.5, 2.5))
                .minus(F.individual("friendship").div(200).times(0.4).clamp(0, 1))
                .clamp(4, 11).round(0),
            "起手", "端出这一记需要多久；速度越快、越亲密端得越利落。"),
        /** 收招：基础 7 刻，速度每比 55 快 1 少 0.02（上限 −1）；夹 3..10。 */
        aftercast: seconds(
            F.base(7)
                .minus(F.stat("speed").minus(55).times(0.02).clamp(-1, 2))
                .clamp(3, 10).round(0),
            "收招", "收势回身的时间；快的个体收得干净。"),
        /** 冷却：基础 28 刻，速度每比 55 快 1 少 0.09（上限 −3）；分餐 +8；夹 18..46。 */
        recharge: seconds(
            F.base(28)
                .minus(F.stat("speed").minus(55).times(0.09).clamp(-3, 6))
                .plus(F.when(F.pref("share", text("worldcombat.skill.orderup.preference.share")), F.const(8), F.const(0)))
                .clamp(18, 46).round(0),
            "冷却", "两次上菜之间的等待；分餐式端给一圈人，缓得更久。")
    });

    defineDamage("orderup", "serve", {});

    stages("orderup", [
        { level: 30, values: { serve: 84 } },
        { level: 48, values: { serve: 92, serveStages: 2 } }
    ]);

    describe("orderup", [
        { key: "description.0", values: ["serve","serveWidth"] },
        { key: "description.1", values: ["reach","wardBreak"] },
        { key: "description.2", values: ["dishRange","serveStages","shareRadius"] },
        { key: "share.on", values: ["serveStages"], when: function (context) { return read(context.detail.values, ["share"]) === true; } },
        { key: "share.off", values: [], when: function (context) { return read(context.detail.values, ["share"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.serve"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.serve", "tier.1.serveStages"] }
    ]);
}
