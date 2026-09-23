/**
 * 闭关 / shelter — 参数与数值来源。
 *
 * 原生事实：Steel、变化、威力 —、命中必中、PP 10、目标 self、boosts { def: +2 }。
 *
 * 翻译：把「将皮肤变得坚硬如铁盾」翻成**缩起身子、一层铁壳整个包住自己**——壳替你挨打，裂开为止。
 *   取原生「防御 +2、PP 10、纯自我强化」；放弃回合制里永久保留的等级 → 即时交战里防御等级立刻写入公共能力阶梯，
 *   壳是一段可见的承伤窗口：它先按固定额度把伤害吃掉，吃满就崩，壳崩或到期时这段防护抬起的等级一起收回。
 *   它是本族里**唯一有独立承伤额度**的一招：别招改的是减免或等级，闭关给的是一层会被打碎的壳。
 *
 * 数值来源（每个参数读不同的精灵数据，分散开）：
 *   gift     防御等级：固定 2，原生「大幅提高防御」的对位，是这招的身份常数。
 *   shield   壳的承伤：基础 22% + 防御×0.0012，再乘形态系数（铁盾 ×1.25／缩壳 ×0.8）；夹 12%..50%。防御越厚，壳能吃下的越多（按最大生命比例）。
 *   window   壳的时长：基础 160 刻 + 等级×2 + 防御×0.4，再乘形态系数（铁盾 ×1.3／缩壳 ×0.8）；夹 100..360。
 *   plates   壳板数：基础 10 + 防御×0.08 + 等级×0.2；夹 8..32。防御与等级越高，拼成壳的板越多，粒子按它发射。
 *   shell    壳半径：基础 0.9 格 + 碰撞箱宽度×0.7；夹 0.8..2.2。体型越宽，壳包得越开。
 *   tempo    起手：基础 10 刻 − 速度×0.03，铁盾再 +3；夹 5..15。缩壳起手更快。
 *   aftercast 收招：基础 8 刻 + 身高×1.0，铁盾再 ×1.2；夹 6..14。
 *   wait     冷却：基础 150 刻 − 等级×0.6，铁盾再 ×1.15；夹 100..180。PP 10 的代价，等级越高越熟练。
 * 配置 seal 双向取舍：开启＝铁盾，壳更厚更久，但整段被钉住不能移动、起手更慢、冷却更长；
 *   关闭＝缩壳，壳较薄较短，但可以带着壳走位、起手与冷却都更短。硬吃爆发与保持走位各有局面。
 */
namespace PokemonSkills {
    actionParameters.define("shelter", {
        /** 防御等级：原生 +2，本招的身份常数。 */
        gift: formula(F.const(2), "防御等级", {
            unit: " 级",
            description: "壳合着的时候把防御抬高多少级；原生「大幅提高防御」的对位。"
        }),
        /** 壳的承伤：防御越厚吃下的越多。 */
        shield: percent(
            F.base(0.22).plus(F.stat("defence").times(0.0012))
                .times(F.when(F.pref("seal", text("worldcombat.skill.shelter.preference.seal")), F.const(1.25), F.const(0.8)))
                .clamp(0.12, 0.5),
            "壳的承伤", "铁壳在崩掉之前能替自己吃下多少伤害（按最大生命比例）；防御越高越厚，铁盾比缩壳更厚。"),
        /** 壳的时长：防御与等级决定壳撑多久。 */
        window: seconds(
            F.base(160).plus(F.level().times(2)).plus(F.stat("defence").times(0.4))
                .times(F.when(F.pref("seal", text("worldcombat.skill.shelter.preference.seal")), F.const(1.3), F.const(0.8)))
                .clamp(100, 360).round(0),
            "壳的时长", "铁壳在身上撑多久；等级与防御越高撑得越久，铁盾比缩壳久。壳崩或到期时这段防护抬起的等级一起收回。"),
        /** 壳板数：防御与等级越高板越多。 */
        plates: formula(
            F.base(10).plus(F.stat("defence").times(0.08)).plus(F.level().times(0.2)).clamp(8, 32).round(0),
            "壳板数", {
                unit: " 块",
                description: "拼成这层壳的铁板数量；防御与等级越高板越多，粒子按它发射。"
            }),
        /** 壳半径：体型越宽包得越开。 */
        shell: formula(
            F.base(0.9).plus(F.body("width").times(0.7)).clamp(0.8, 2.2).round(2),
            "壳半径", {
                unit: " 格",
                description: "铁壳包住身体的半径；碰撞箱越宽包得越开，表现里的壳环就是这个半径。"
            }),
        /** 起手：速度决定缩壳多快，铁盾更慢。 */
        tempo: seconds(
            F.base(10).minus(F.stat("speed").times(0.03))
                .plus(F.when(F.pref("seal", text("worldcombat.skill.shelter.preference.seal")), F.const(3), F.const(0)))
                .clamp(5, 15).round(0),
            "起手", "缩起身子、合上壳需要多久；速度越快越短，铁盾更慢（也更容易被打断）。"),
        /** 收招：身板越大越慢，铁盾更慢。 */
        aftercast: seconds(
            F.base(8).plus(F.body("height").times(1.0))
                .times(F.when(F.pref("seal", text("worldcombat.skill.shelter.preference.seal")), F.const(1.2), F.const(1)))
                .clamp(6, 14).round(0),
            "收招", "开壳之后的收势；碰撞箱越高大收得越慢，铁盾更慢。"),
        /** 冷却：等级越高越熟练，铁盾更长。 */
        wait: seconds(
            F.base(150).minus(F.level().times(0.6))
                .times(F.when(F.pref("seal", text("worldcombat.skill.shelter.preference.seal")), F.const(1.15), F.const(1)))
                .clamp(100, 180).round(0),
            "冷却", "两次闭关之间的等待；等级越高越短，铁盾更长。PP 10 的代价。")
    });

    stages("shelter", [
        { level: 30, values: { window: 220, wait: 122 } },
        { level: 50, values: { window: 260, wait: 110 } }
    ]);

    describe("shelter", [
        { key: "description.0", values: ["gift", "shield", "window"] },
        { key: "description.1", values: [] },
        { key: "description.2", values: ["tempo", "aftercast", "wait"] },
        { key: "seal.on", values: [], when: function (context) { return read(context.detail.values, ["seal"]) === true; } },
        { key: "seal.off", values: [], when: function (context) { return read(context.detail.values, ["seal"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.window", "tier.0.wait"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.window", "tier.1.wait"] }
    ]);
}
