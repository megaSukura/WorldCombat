/**
 * 广域防守 / wideguard 的参数与数值来源。
 *
 * 原生事实：Rock、变化、威力 —、命中必中、PP 10、优先度 +3、目标己方场地 side wideguard，持续 1 回合，
 *   期间己方全员免疫「打全场」的招式（allAdjacent／allAdjacentFoes）。
 *
 * 核心念头：施法者把身体一沉，向身周推出一面横贯的宽光墙；墙横着摊开，替身边的每个伙伴把**从远处拍过来的成片攻击**
 *   整片卸掉。它不加防、不加血，只在极短的一瞬里当一层会磨穿的墙——挡几下就散。
 * 世界化：原生的「1 回合」翻成极短的一段窗口；施法者与半径内的友方各挂一份共享身份
 *   world_combat:status/wideguard 的真实 MobEffect（物品栏可见、/effect 可用），并各自领到一层共享
 *   GuardEffects 的 pool（本单元规则 world_combat:move_wideguard）：只截**非接触**（远程／范围）的敌对伤害，
 *   按总量磨穿。贴着身子的近战穿刺得到的结论是「墙挡不住贴身」，这就是它与反射壁、守住的区分。
 *   离开施法者太远的人随共享连接断开而失去；墙磨穿或到时，身份与池一起收。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   capacity 吸收总量：基础 46 + 防御×1.7 + 等级×1.1；夹 40..300。防御与等级决定墙能卸掉多少。
 *   window   立墙时长：基础 80 刻 + 防御×0.45 + 等级；夹 70..190。极短的一瞬。
 *   radius   遮蔽半径：基础 3 格 + 身高×0.7 + 防御×0.006；夹 2.5..7。身板大、防御高罩得越广。
 *   plates   光板数：基础 10 + 防御×0.08；夹 8..22。墙面的板数，粒子按它发射。
 *   motes    光点数量：基础 20 + 防御×0.1；夹 16..52。驱动画面密度。
 *   tempo    起手：基础 6 刻 − 速度×0.02；夹 3..8。原生 +3 优先度落成很短的起手。
 *   aftercast 收招：基础 5 刻 + 身高×1.2；夹 5..10。
 *   wait     冷却：基础 140 刻 − 等级×0.4；夹 90..160。PP 10 的代价。
 * 配置 brace（墙型）双向取舍：广墙＝半径 ×1.25，但吸收总量 ×0.8（罩得广、磨得快）；
 *   厚墙＝吸收总量 ×1.25，但半径 ×0.85（罩得紧、更耐打）。两向各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("wideguard", {
        /** 吸收总量：防御与等级决定墙能卸掉多少。 */
        capacity: formula(
            F.base(46).plus(F.stat("defence").times(1.7)).plus(F.level().times(1.1))
                .times(F.when(F.pref("brace", text("worldcombat.skill.wideguard.preference.brace")), F.const(0.8), F.const(1.25)))
                .clamp(36, 360).round(0),
            "吸收总量", {
                unit: " 点",
                description: "宽墙能替每人卸掉多少非接触伤害；防御与等级越高越多，厚墙 ×1.25、广墙 ×0.8。"
            }),
        /** 立墙时长：极短的一瞬。 */
        window: seconds(
            F.base(80).plus(F.stat("defence").times(0.45)).plus(F.level()).clamp(70, 190).round(0),
            "立墙时长", "宽墙立多久；防御与等级让这一瞬稍长，但仍然很短。"),
        /** 遮蔽半径：身板与防御决定罩多广。 */
        radius: formula(
            F.base(3).plus(F.body("height").times(0.7)).plus(F.stat("defence").times(0.006))
                .times(F.when(F.pref("brace", text("worldcombat.skill.wideguard.preference.brace")), F.const(1.25), F.const(0.85)))
                .clamp(2.5, 8).round(2),
            "遮蔽半径", {
                unit: " 格",
                description: "宽墙罩住多大一圈队友；身板越大、防御越高罩得越广，广墙再 ×1.25。"
            }),
        /** 光板数：驱动画面。 */
        plates: formula(
            F.base(10).plus(F.stat("defence").times(0.08)).clamp(8, 22).round(0),
            "光板数", {
                unit: " 块",
                description: "横贯光墙由多少块光板拼成；防御越高越多，粒子按它发射。"
            }),
        /** 光点数量：驱动画面密度。 */
        motes: formula(
            F.base(20).plus(F.stat("defence").times(0.1)).clamp(16, 52).round(0),
            "光点数量", {
                unit: " 点",
                description: "墙面上的光点数量；防御越高越密，也驱动画面密度。"
            }),
        /** 起手：原生 +3 优先度的对位。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").times(0.02)).clamp(3, 8).round(0),
            "起手", "推出宽墙需要多久；速度越快越短，原生 +3 优先度落成很短的起手。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(5).plus(F.body("height").times(1.2)).clamp(5, 10).round(0),
            "收招", "撤墙之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(140).minus(F.level().times(0.4)).clamp(90, 160).round(0),
            "冷却", "两次立墙之间的等待；等级越高越短。PP 10 的代价。")
    });

    describe("wideguard", [
        { key: "description.0", values: ["capacity", "window"] },
        { key: "description.1", values: ["radius"] },
        { key: "description.3", values: [] },
        { key: "brace.wide", values: [], when: function (context) { return read(context.detail.values, ["brace"]) === 1; } },
        { key: "brace.dense", values: [], when: function (context) { return read(context.detail.values, ["brace"]) !== 1; } },
        { key: "timing", values: ["prepare","recover","pp","cooldown"] }
    ]);
}
