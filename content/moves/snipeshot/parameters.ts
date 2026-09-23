/**
 * 狙击 / snipeshot 的参数与伤害段。
 *
 * 原生事实：水／特殊／威力 80／命中 100／PP 15／critRatio: 2（高暴击）／tracksTarget（无视引开、只打选定对手）。
 *
 * 翻译：把「无视吸引对手招式的效果、只打选定的对手」翻成**一发锁定了人的远距离水弹**——出手前先给
 *   选定的对手打上准星，发射后水弹只追这一只、穿过程中挡路的其他生物（`pierce`），所以别的身影、
 *   诱饵、扎堆的前排都引不开它。这正是它和别的远程水招（水枪沿直线走、泼冷水单体但会被前排挡住）最大的区别。
 *   原生高暴击（critRatio 2）由共享结算读取原生模板，不需要另设参数。屏息狙击更远更重、出手更慢；
 *   速射狙击更快但更近。
 *
 * 数值来源（每项依赖不同的精灵数据，分散开来）：
 *   shot     单发威力：特攻定水压、等级定枪管；屏息式 ×1.15。
 *   reach    射程：特攻与等级决定能瞄多远，屏息式再 +3 格——本招的身份就是长。
 *   flight   水弹速度：速度决定弹速，目标更难走位。
 *   radius   判定半径：碰撞箱高度决定水弹粗细。
 *   through  穿透数：等级决定水弹能穿过几个挡路的生物，仍只伤害锁定目标。
 *   turn     追踪转向：特攻决定水弹拐弯追人的能力。
 *   motes    水花数：特攻派生，命中与穿透的粒子按它发射。
 *   tempo    起手：速度决定瞄准的快慢，屏息式多花几刻。
 *   recover  收招：速度决定收势。
 *   recharge 冷却：等级决定熟练度，屏息式更长。PP 15 的代价。
 *
 * 配置 `deadeye`（屏息狙击）双向取舍：开启＝射程 +3 格、威力 ×1.15、冷却 +6 刻、起手 +4 刻；
 *   关闭（速射狙击）＝出手更快、冷却更短，但射程与单发稍逊。两向各有适用局面。
 *
 * 伤害段 `shot` 走共享换算（原始类别 Special）；暴击率由原生模板的 critRatio 2 提供。
 */
namespace PokemonSkills {
    actionParameters.define("snipeshot", {
        /** 单发威力：50 + 特攻偏移[−10,30] + 等级(≥25)偏移[0,12]；屏息 ×1.15；夹 32..116。 */
        shot: formula(
            F.base(50)
                .plus(F.stat("specialAttack").minus(55).times(0.28).clamp(-10, 30))
                .plus(F.level().minus(25).times(0.45).clamp(0, 12))
                .times(F.when(F.pref("deadeye", text("worldcombat.skill.snipeshot.preference.deadeye")), F.const(1.15), F.const(1)))
                .clamp(32, 116).round(1),
            "单发威力", {
                unit: "威力",
                description: "这一发水弹命中锁定目标时结算的基础威力；特攻定水压、等级定枪管，屏息式再 ×1.15。对手特防、相性与暴击在命中时另算（本招天生高暴击）。"
            }),
        /** 射程：13 + 特攻偏移[−2,4] + 等级(≥25)偏移[0,3] + 屏息 3；夹 10..20。 */
        reach: formula(
            F.base(13)
                .plus(F.stat("specialAttack").minus(55).times(0.06).clamp(-2, 4))
                .plus(F.level().minus(25).times(0.08).clamp(0, 3))
                .plus(F.when(F.pref("deadeye", text("worldcombat.skill.snipeshot.preference.deadeye")), F.const(3), F.const(0)))
                .clamp(10, 20).round(1),
            "射程", {
                unit: "格",
                description: "能把水弹瞄到多远；特攻与等级越高越远，屏息式再 +3 格。它也是本招的实际射程来源——长射程就是它的身份。"
            }),
        /** 水弹速度：2.4 + 速度偏移[−0.4,0.8]；夹 1.8..3.6。 */
        flight: formula(
            F.base(2.4).plus(F.stat("speed").minus(60).times(0.015).clamp(-0.4, 0.8)).clamp(1.8, 3.6).round(2),
            "水弹速度", { unit: "格/刻", description: "水弹飞出去的速度；速度高的个体弹速更快，目标更难走位躲开。" }),
        /** 判定半径：0.18 + 身高偏移[−0.02,0.12]；夹 0.16..0.34。 */
        radius: formula(
            F.base(0.18).plus(F.body("height").minus(1.4).times(0.04).clamp(-0.02, 0.12)).clamp(0.16, 0.34).round(2),
            "判定半径", { unit: "格", description: "水弹飞行与命中的判定半径；体型越高水弹越粗。" }),
        /** 穿透数：2 + 等级(≥25)偏移[0,3]；夹 2..5。 */
        through: formula(
            F.base(2).plus(F.level().minus(25).times(0.05).clamp(0, 3)).clamp(2, 5).round(0),
            "穿透数", { unit: "个", description: "水弹能穿过几个挡在路上的其他生物；穿过去不影响锁定，只有被准星标中的那只挨伤害。等级越高穿得越多。" }),
        /** 追踪转向：22 + 特攻偏移[−4,8]；夹 14..34。 */
        turn: formula(
            F.base(22).plus(F.stat("specialAttack").minus(55).times(0.1).clamp(-4, 8)).clamp(14, 34).round(0),
            "追踪转向", { unit: "度/刻", description: "水弹每一刻能转多少度去追锁定目标；特攻越高拐得越急，目标更难甩掉。" }),
        /** 水花数：16 + 特攻偏移[−3,22]；夹 12..44。同时驱动画面密度。 */
        motes: formula(
            F.base(16).plus(F.stat("specialAttack").minus(55).times(0.3).clamp(-3, 22)).clamp(12, 44).round(0),
            "水花数", { unit: "朵", description: "命中与穿透时溅开的水花数量，随特攻增长；粒子按它发射，画面里的数量和机制一致。" }),
        /** 起手：11 − 速度偏移[−1.5,1.5] + 屏息 4；夹 6..18。 */
        tempo: seconds(
            F.base(11).minus(F.stat("speed").minus(60).times(0.03).clamp(-1.5, 1.5))
                .plus(F.when(F.pref("deadeye", text("worldcombat.skill.snipeshot.preference.deadeye")), F.const(4), F.const(0)))
                .clamp(6, 18).round(0),
            "起手", "屏息、把准星压到选定对手身上的时间；速度越快越短，屏息式要多花几刻。"),
        /** 收招：8 − 速度偏移[−1,2]；夹 5..12。 */
        recover: seconds(
            F.base(8).minus(F.stat("speed").minus(60).times(0.02).clamp(-1, 2)).clamp(5, 12).round(0),
            "收招", "开枪后的收势时间；速度越快收得越利落。"),
        /** 冷却：34 − 等级(≥25)偏移[0,10] + 屏息 6；夹 20..48。 */
        recharge: seconds(
            F.base(34).minus(F.level().minus(25).times(0.2).clamp(0, 10))
                .plus(F.when(F.pref("deadeye", text("worldcombat.skill.snipeshot.preference.deadeye")), F.const(6), F.const(0)))
                .clamp(20, 48).round(0),
            "冷却", "再瞄一发前的等待；等级越高越熟练，屏息式更久。PP 15 的代价。")
    });

    defineDamage("snipeshot", "shot", {});

    stages("snipeshot", [
        { level: 45, values: { shot: 66, reach: 16 } }
    ]);

    describe("snipeshot", [
        { key: "description.0", values: ["shot"] },
        { key: "description.1", values: ["reach", "flight", "through"] },
        { key: "description.2", values: ["turn"] },
        { key: "option.on", values: [], when: function (context) { return read(context.detail.values, ["deadeye"]) === true; } },
        { key: "option.off", values: [], when: function (context) { return read(context.detail.values, ["deadeye"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.shot", "tier.0.reach"] }
    ]);
}
