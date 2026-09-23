/**
 * 戏法防守 / craftyshield 的参数与数值来源。
 *
 * 原生事实：Fairy、变化、威力 —、命中必中、PP 10、优先度 +3、目标己方场地 side craftyshield，持续 1 回合，
 *   期间己方全员免疫对手的**变化招式**（category=status 的招式），但挡不住伤害招式。
 *
 * 核心念头：在身前织起一片会转弯的戏法符阵——敌方一道变化招式递过来，符阵上跳出几枚法印把它整条拨开；
 *   符阵由有限的法印撑起，挡掉几条就织不住，散了。伤害招式直接穿阵而过。
 *
 * 世界化：原生的「1 回合」翻成一段窗口；施法者与半径内的友方各挂共享身份
 *   world_combat:status/craftyshield 的真实 MobEffect（物品栏可见、/effect 可用），amplifier 记「还剩几次拨挡」。
 *   带身份的活体被敌方变化招式瞄上时，该招在提交点被拒绝（priority 不限）；伤害招式不受影响——
 *   这就是它与掀榻榻米的分工：戏法防守只挡变化招式，掀榻榻米只挡伤害招式。
 *   拨挡画面在提交点记下、由目标身上身份的下一刻 tick（可写作用域）补播。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   charges  拨挡次数：基础 2 + 特防×0.02；夹 2..5。特防高的人符阵能多拨几次。
 *   window   立阵时长：基础 90 刻 + 特防×0.5 + 等级；夹 60..240。
 *   radius   遮蔽半径：基础 3.2 格 + 身高×0.7 + 特防×0.01；夹 2.5..7。身板大、特防高罩得越广。
 *   glyphs   法印数量：基础 22 + 特防×0.12；夹 18..56。驱动画面密度。
 *   tempo    起手：基础 5 刻 − 速度×0.02；夹 2..10。原生 +3 优先度落成很短的起手。
 *   aftercast 收招：基础 5 刻 + 身高×1.2；夹 5..10。
 *   wait     冷却：基础 140 刻 − 等级×0.4；夹 80..180。PP 10 的代价。
 * 配置 weave（织法）双向取舍：细纹＝拨挡 ×1.3、时长 ×1.15、半径 ×0.9，代价是起手 +2、冷却 ×1.1（多拨几条、罩得紧）；
 *   粗纹＝半径 ×1.2，拨挡 ×0.75、时长 ×0.85，换来起手 −1、冷却 ×0.88（摊得开、起得快）。两向各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("craftyshield", {
        /** 拨挡次数：特防决定符阵能拨开几条变化招式。 */
        charges: formula(
            F.base(2).plus(F.stat("specialDefence").times(0.02))
                .times(F.when(F.pref("weave", text("worldcombat.skill.craftyshield.preference.weave")), F.const(1.3), F.const(0.75)))
                .clamp(2, 6).round(0),
            "拨挡次数", {
                unit: " 次",
                description: "符阵能把几条变化招式整条拨开；特防越高越多，细纹 ×1.3、粗纹 ×0.75。"
            }),
        /** 立阵时长：很短的一段窗口。 */
        window: seconds(
            F.base(90).plus(F.stat("specialDefence").times(0.5)).plus(F.level())
                .times(F.when(F.pref("weave", text("worldcombat.skill.craftyshield.preference.weave")), F.const(1.15), F.const(0.85)))
                .clamp(60, 240).round(0),
            "立阵时长", "符阵撑多久；特防与等级让这一瞬稍长，细纹更长。"),
        /** 遮蔽半径：身板与特防决定罩多广。 */
        radius: formula(
            F.base(3.2).plus(F.body("height").times(0.7)).plus(F.stat("specialDefence").times(0.01))
                .times(F.when(F.pref("weave", text("worldcombat.skill.craftyshield.preference.weave")), F.const(0.9), F.const(1.2)))
                .clamp(2.5, 7).round(2),
            "遮蔽半径", {
                unit: " 格",
                description: "符阵罩住多大一圈队友；身板越大、特防越高罩得越广，粗纹再 ×1.2。"
            }),
        /** 法印数量：驱动画面。 */
        glyphs: formula(
            F.base(22).plus(F.stat("specialDefence").times(0.12)).clamp(18, 56).round(0),
            "法印数量", {
                unit: " 枚",
                description: "符阵上悬着多少枚法印；特防越高越密，粒子按它发射。"
            }),
        /** 起手：原生 +3 优先度的对位。 */
        tempo: seconds(
            F.base(5).minus(F.stat("speed").times(0.02))
                .plus(F.when(F.pref("weave", text("worldcombat.skill.craftyshield.preference.weave")), F.const(2), F.const(-1)))
                .clamp(2, 10).round(0),
            "起手", "织起符阵需要多久；速度越快越短，原生 +3 优先度落成很短的起手，粗纹再 −1 刻。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.2)).clamp(5, 10).round(0),
            "收招", "收阵之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(140).minus(F.level().times(0.4))
                .times(F.when(F.pref("weave", text("worldcombat.skill.craftyshield.preference.weave")), F.const(1.1), F.const(0.88)))
                .clamp(80, 180).round(0),
            "冷却", "两次织阵之间的等待；等级越高越短，粗纹更短。PP 10 的代价。")
    });

    describe("craftyshield", [
        { key: "description.0", values: ["charges","window"] },
        { key: "description.1", values: ["radius"] },
        { key: "weave.fine", values: [], when: function (context) { return read(context.detail.values, ["weave"]) === 1; } },
        { key: "weave.broad", values: [], when: function (context) { return read(context.detail.values, ["weave"]) !== 1; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] }
    ]);
}
