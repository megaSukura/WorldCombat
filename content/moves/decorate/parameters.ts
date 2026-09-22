/**
 * 装饰 / decorate 的参数与数值来源。
 *
 * 原生事实：Fairy、Status、威力 —、命中 —、PP 15、目标 normal（相邻的另一只）、boosts { atk:+2, spa:+2 }、
 *   带 allyanim 旗标（在双打里是给队友用的强化）。
 *
 * 翻译：把「通过装饰大幅提高对方」翻成**一件送给别人、不给自己**的作品——施法者当场搓出一束奶油与缎带，
 * 让它们落到另一个友方身上，把这个队友装扮成队伍里最锋利的那件作品（物攻、特攻各 +2），
 * 装饰物在身上亮一阵子。原作在单打里只能对着对手放、纯属自残；这里把对象收窄到友方，让「送给队友」成为它的身份。
 * 与同族三招分开：自我激励吃自己的伤、生长吃太阳、战吼只做减法，只有装饰把力量**送到别人身上**。
 * 提升走 NativeEffects.boost 一条路径；「已装扮」是共享身份的 MobEffect 标记。
 *
 * 数值来源（每个参数读不同的精灵数据）：
 *   gift     提升：基础 2 级，等级 ≥ 50 时 3 级；夹 2..3。等级越高，做出的装饰越锋利。
 *   veneer   装饰时长：基础 180 刻 + 特攻×1.6，厚涂 ×1.6／轻缀 ×0.7；夹 120..700。特攻越高的装饰者留得越久。
 *   trinkets 装饰物数量：基础 8 + 特攻/12；夹 8..20。粒子数量按它发射。
 *   reach    施放距离：基础 5 格 + 碰撞箱高度×0.3；夹 4..7。大个子够得远一点。
 *   tempo    起手：速度每比 60 快 1 减 0.03 刻，厚涂 +3；夹 6..14。
 *   aftercast 收招：基础 7 + 碰撞箱高度×1.5；夹 7..12。
 *   wait     冷却：基础 70 刻 − 等级×0.4，厚涂 +10；夹 50..80。PP 15 的代价。
 * 配置 thick（厚涂）：装饰更久（×1.6），代价是起手 +3 刻、冷却 +10；关闭则轻缀，亮得短、出手快。
 */
namespace PokemonSkills {
    actionParameters.define("decorate", {
        /** 提升：等级决定装饰的锋利程度。 */
        gift: formula(
            F.base(2).plus(F.when(F.level().gte(50), F.const(1), F.const(0))).clamp(2, 3).round(0),
            "双攻提升", {
                unit: " 级",
                description: "送给队友的物攻与特攻等级；等级 50 起再 +1。对手的防御与相性不影响它。"
            }),
        /** 装饰时长：特攻决定这件作品留多久。 */
        veneer: seconds(
            F.base(180).plus(F.stat("specialAttack").times(1.6))
                .times(F.when(F.pref("thick", text("worldcombat.skill.decorate.preference.thick")), F.const(1.6), F.const(0.7)))
                .clamp(120, 700).round(0),
            "装饰时长", "「已装扮」标记在队友身上亮多久；特攻越高留得越久，厚涂再 ×1.6、轻缀 ×0.7。"),
        /** 装饰物数量：特攻决定画面里挂几件。 */
        trinkets: formula(
            F.base(8).plus(F.stat("specialAttack").div(12)).clamp(8, 20).round(0),
            "装饰物数量", {
                unit: " 件",
                description: "飞向队友的奶油与缎带件数；特攻越高越多，粒子按它发射。"
            }),
        /** 施放距离：身板决定够得多远。 */
        reach: formula(
            F.base(5).plus(F.body("height").times(0.3)).clamp(4, 7).round(2),
            "施放距离", {
                unit: " 格",
                description: "能把装饰送出去的距离；碰撞箱越高够得越远。它同时是本招的射程基准。"
            }),
        /** 起手：速度决定搓装饰多快。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").minus(60).times(0.03))
                .plus(F.when(F.pref("thick", text("worldcombat.skill.decorate.preference.thick")), F.const(3), F.const(0))).clamp(6, 14).round(0),
            "起手", "搓出并送出装饰需要多久；速度越高越快，厚涂要更久。"),
        /** 收招：身板越高大越慢。 */
        aftercast: seconds(
            F.base(7).plus(F.body("height").times(1.5)).clamp(7, 12).round(0),
            "收招", "送出装饰后的收势；碰撞箱越高大收得越慢。"),
        /** 冷却：等级越高越熟练。 */
        wait: seconds(
            F.base(70).minus(F.level().times(0.4))
                .plus(F.when(F.pref("thick", text("worldcombat.skill.decorate.preference.thick")), F.const(10), F.const(0))).clamp(50, 80).round(0),
            "冷却", "两次装饰之间的等待；等级越高越短，厚涂更长。PP 15 的代价。")
    });

    describe("decorate", [
        { key: "description.0", values: ["gift"] },
        { key: "description.1", values: ["veneer", "trinkets"] },
        { key: "description.2", values: ["reach", "tempo", "aftercast", "wait"] },
        { key: "timing", values: [] }
    ]);
}
