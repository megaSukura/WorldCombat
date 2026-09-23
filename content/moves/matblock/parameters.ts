/**
 * 掀榻榻米 / matblock 的参数与数值来源。
 *
 * 原生事实：Fighting、变化、威力 —、命中必中、PP 10、优先度 0、目标己方场地 side matblock，只在自己出场后的
 *   第一个回合有效，期间己方全员**免受招式伤害**（变化招式不受影响）。
 *
 * 核心念头：把整张榻榻米从地上掀起来当盾——一片草绿席面横着翻起、护住自己与身边的伙伴；招式伤害拍在席面上
 *   被整片吃下，席子被砸得发颤、草屑飞起，吃满之后就落下，变化招式照样从席子底下钻过去。
 *
 * 世界化：原生的「只此一回合」翻成一段很短的窗口；施法者与半径内的友方各挂共享身份
 *   world_combat:status/matblock 的真实 MobEffect（物品栏可见、/effect 可用），并各自领到一层共享
 *   GuardEffects 的 pool（本单元规则 world_combat:move_matblock）：**只吃 kind=move 的敌对伤害**，
 *   按总量吃满即落。变化招式不带伤害、根本不进池，所以「无法防住变化招式」是机制的自然结果。
 *   这就是它与戏法防守的分工：戏法防守只挡变化招式，掀榻榻米只挡伤害招式。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   capacity 吃伤总量：基础 60 + 防御×2.0 + 等级×1.2；夹 50..420。防御与等级决定这张席子能硬吃多少。
 *   window   立席时长：基础 60 刻 + 防御×0.35 + 等级；夹 50..170。很短。
 *   radius   遮蔽半径：基础 3 格 + 身高×0.8 + 防御×0.006；夹 2.5..7.5。身板大、防御高罩得越广。
 *   slats    席条数：基础 10 + 防御×0.06；夹 10..24。席面由多少条草编织成，粒子按它发射。
 *   fibers   草屑数量：基础 24 + 防御×0.12；夹 20..60。驱动画面密度。
 *   tempo    起手：基础 8 刻 − 速度×0.02；夹 4..12。
 *   aftercast 收招：基础 6 刻 + 身高×1.3；夹 6..12。
 *   wait     冷却：基础 150 刻 − 等级×0.5；夹 90..180。PP 10 的代价。
 * 配置 fold（掀席方式）双向取舍：竖席＝吃伤 ×1.3、时长 ×1.15、半径 ×0.85，代价是起手 +2、冷却 ×1.15；
 *   横席＝吃伤 ×0.8、时长 ×0.85、半径 ×1.25，换来起手 −1、冷却 ×0.85。两向各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("matblock", {
        /** 吃伤总量：防御与等级决定席子能硬吃多少。 */
        capacity: formula(
            F.base(60).plus(F.stat("defence").times(2.0)).plus(F.level().times(1.2))
                .times(F.when(F.pref("fold", text("worldcombat.skill.matblock.preference.fold")), F.const(1.3), F.const(0.8)))
                .clamp(50, 460).round(0),
            "吃伤总量", {
                unit: " 点",
                description: "席子能替每人硬吃多少招式伤害；防御与等级越高越多，竖席 ×1.3、横席 ×0.8。"
            }),
        /** 立席时长：很短。 */
        window: seconds(
            F.base(60).plus(F.stat("defence").times(0.35)).plus(F.level())
                .times(F.when(F.pref("fold", text("worldcombat.skill.matblock.preference.fold")), F.const(1.15), F.const(0.85)))
                .clamp(50, 180).round(0),
            "立席时长", "席子立多久；防御与等级让这一瞬稍长，竖席更长。"),
        /** 遮蔽半径：身板与防御决定罩多广。 */
        radius: formula(
            F.base(3).plus(F.body("height").times(0.8)).plus(F.stat("defence").times(0.006))
                .times(F.when(F.pref("fold", text("worldcombat.skill.matblock.preference.fold")), F.const(0.85), F.const(1.25)))
                .clamp(2.5, 7.5).round(2),
            "遮蔽半径", {
                unit: " 格",
                description: "席子罩住多大一圈队友；身板越大、防御越高罩得越广，横席再 ×1.25。"
            }),
        /** 席条数：驱动画面。 */
        slats: formula(
            F.base(10).plus(F.stat("defence").times(0.06)).clamp(10, 24).round(0),
            "席条数", {
                unit: " 条",
                description: "席面由多少条草编织成；防御越高越多，粒子按它发射。"
            }),
        /** 草屑数量：驱动画面密度。 */
        fibers: formula(
            F.base(24).plus(F.stat("defence").times(0.12)).clamp(20, 60).round(0),
            "草屑数量", {
                unit: " 片",
                description: "席面上抖落的草屑数量；防御越高越密，也驱动画面密度。"
            }),
        /** 起手：越熟练越稳。 */
        tempo: seconds(
            F.base(8).minus(F.stat("speed").times(0.02))
                .plus(F.when(F.pref("fold", text("worldcombat.skill.matblock.preference.fold")), F.const(2), F.const(-1)))
                .clamp(4, 12).round(0),
            "起手", "把席子从地上掀起来需要多久；速度越快越短，竖席再 +2 刻。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(6).plus(F.body("height").times(1.3)).clamp(6, 12).round(0),
            "收招", "落席之后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(150).minus(F.level().times(0.5))
                .times(F.when(F.pref("fold", text("worldcombat.skill.matblock.preference.fold")), F.const(1.15), F.const(0.85)))
                .clamp(90, 180).round(0),
            "冷却", "两次掀席之间的等待；等级越高越短，横席更短。PP 10 的代价。")
    });

    describe("matblock", [
        { key: "description.0", values: ["capacity", "window"] },
        { key: "description.1", values: ["radius"] },
        { key: "fold.upright", values: [], when: function (context) { return read(context.detail.values, ["fold"]) === 1; } },
        { key: "fold.spread", values: [], when: function (context) { return read(context.detail.values, ["fold"]) !== 1; } },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] }
    ]);
}
