/**
 * 指导 / coaching 的参数与数值来源。
 *
 * 原生事实：Fighting、变化、威力 —、命中必中、PP 10、优先度 0、目标 adjacentAlly（相邻友方），
 *   boosts { atk: +1, def: +1 }。
 *
 * 核心念头：施法者朝选定的伙伴大喝一声、比出一个明确的手势，把正确的打法当场教给他；身边听清的人一起领会，
 *   攻防同时抬起来。原生的「相邻友方」在这里变成一个**要选一个伙伴**的输入形状，教会从那个人向四周荡开。
 * 世界化：受教者挂共享身份 world_combat:status/coaching 的真实 MobEffect（本单元声明两份：物攻与防御各一份，
 *   分别用效果等级记住实际抬到几级），攻防立刻写入公共能力阶梯；窗口走完或被清除时按各自等级原样收回。
 *   指导要贴近才说得清：射程短，且必须选一个朋友。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   giftAtk  物攻等级：基础 1，等级 ≥ 40 再 +1；夹 1..2。教得越久，攻的一端更进一层。
 *   giftDef  防御等级：基础 1，基础防御 ≥ 90 再 +1；夹 1..2。自己越厚实，越能教出扎实的架势。
 *   window   领会时长：基础 200 刻 + 等级×1.6 + 亲密度×0.5；夹 160..460。等级与感情让要领记得更久。
 *   splash   传授半径：基础 2.6 格 + 身高×0.6 + 特攻×0.004；夹 2.2..4.5。声音与气势越大，旁边听清的人越多。
 *   reach    指导距离：基础 4.5 格 + 速度/120；夹 4..7。越快的个体越能赶上伙伴。
 *   motes    叮嘱标记数：基础 14 + 特攻/12；夹 12..30。画面里的标记数量。
 *   tempo    起手：基础 9 刻 − 速度×0.02 + 精讲/速令修正；夹 4..14。
 *   aftercast 收招：基础 6 刻 + 体重(kg)/10×0.02；夹 5..10。
 *   wait     冷却：基础 120 刻 − 等级×0.4，精讲 ×1.15、速令 ×0.85；夹 55..150。PP 10 的代价。
 * 配置 drill（教法）双向取舍：精讲＝窗口 ×1.4、起手 +3、冷却 ×1.15，但范围 ×0.75（教得深、覆盖小）；
 *   速令＝范围 ×1.25、起手 −2、冷却 ×0.85，但窗口 ×0.75（传得广、记得浅）。两向各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("coaching", {
        /** 物攻等级：等级决定教得更深。 */
        giftAtk: formula(
            F.base(1).plus(F.when(F.level().gte(40), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "物攻等级", {
                unit: " 级",
                description: "指导把受教者的物攻抬高多少级；等级 40 起再 +1。"
            }),
        /** 防御等级：自身防御决定教出多扎实的架势。 */
        giftDef: formula(
            F.base(1).plus(F.when(F.stat("defence").gte(90), F.const(1), F.const(0))).clamp(1, 2).round(0),
            "防御等级", {
                unit: " 级",
                description: "指导把受教者的防御抬高多少级；自己基础防御 ≥ 90 再 +1。"
            }),
        /** 领会时长：等级与感情让要领记得更久。 */
        window: seconds(
            F.base(200).plus(F.level().times(1.6)).plus(F.individual("friendship").times(0.5))
                .times(F.when(F.pref("drill", text("worldcombat.skill.coaching.preference.drill")), F.const(1.4), F.const(0.75)))
                .clamp(120, 520).round(0),
            "领会时长", "攻防提升在身上留多久；等级与亲密度延长它，精讲 ×1.4、速令 ×0.75。"),
        /** 传授半径：气势越大，旁人听清的越多。 */
        splash: formula(
            F.base(2.6).plus(F.body("height").times(0.6)).plus(F.stat("specialAttack").times(0.004))
                .times(F.when(F.pref("drill", text("worldcombat.skill.coaching.preference.drill")), F.const(0.75), F.const(1.25)))
                .clamp(1.8, 5.0).round(2),
            "传授半径", {
                unit: " 格",
                description: "以受教伙伴为中心、还有多大一圈人一起领会；身板与特攻越大越广，速令再 ×1.25。"
            }),
        /** 指导距离：越快的个体越能赶上伙伴。 */
        reach: formula(
            F.base(4.5).plus(F.stat("speed").div(120)).clamp(4, 7).round(2),
            "指导距离", {
                unit: " 格",
                description: "能选中并够到伙伴的距离；速度越快伸得越远。它同时是本招的射程基准。"
            }),
        /** 叮嘱标记数：特攻决定画面数量。 */
        motes: formula(
            F.base(14).plus(F.stat("specialAttack").div(12)).clamp(12, 30).round(0),
            "叮嘱标记数", {
                unit: " 个",
                description: "浮在受教者身边的叮嘱标记数量；特攻越高越多，粒子按它发射。"
            }),
        /** 起手：教法决定快慢。 */
        tempo: seconds(
            F.base(9).minus(F.stat("speed").times(0.02))
                .plus(F.when(F.pref("drill", text("worldcombat.skill.coaching.preference.drill")), F.const(3), F.const(-2)))
                .clamp(4, 14).round(0),
            "起手", "把要领喊清楚需要多久；速度越快越短，精讲 +3 刻、速令 −2 刻。"),
        /** 收招：身体越重收得越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("weight").div(10).times(0.02)).clamp(5, 10).round(0),
            "收招", "喊完之后的收势；身体越重收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(120).minus(F.level().times(0.4))
                .times(F.when(F.pref("drill", text("worldcombat.skill.coaching.preference.drill")), F.const(1.15), F.const(0.85)))
                .clamp(55, 160).round(0),
            "冷却", "两次指导之间的等待；等级越高越短，精讲 ×1.15、速令 ×0.85。PP 10 的代价。")
    });

    describe("coaching", [
        { key: "description.0", values: ["giftAtk", "giftDef", "window"] },
        { key: "description.1", values: ["splash", "reach"] },
        { key: "description.2", values: ["motes", "tempo", "aftercast", "wait"] },
        { key: "drill.intense", values: [], when: function (context) { return read(context.detail.values, ["drill"]) === 1; } },
        { key: "drill.quick", values: [], when: function (context) { return read(context.detail.values, ["drill"]) !== 1; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
