/**
 * 音爆 / sonicboom —— 参数与固定伤害。
 *
 * 原生事实：Normal／特殊／威力 0、**固定伤害 20**／命中 90／PP 20／目标单体（normal）／无次要效果／
 *   已不再作为标准招式（isNonstandard: Past）（Cobblemon 1.8，15 位学习者）。
 *
 * 翻译：把「将冲击波撞向对手、必定给予 20 的伤害」落成一声音爆——空气被瞬间撕开，一条笔直的裂痕**当刻**
 * 就出现在对手身上；它没有飞行时间，看不见弹体，只有被拉开的空气，因而不存在半路被挡下或减速的问题，
 * 只固定削掉 20 点生命（只有属性免疫能挡住）。原生的 90% 命中不掷骰，改成「起手窗口里走开就会从裂痕上
 * 闪掉」：这一击很便宜、很快，但线一旦定下就不再追。配置 `reverb`（回响式）让它在 `echoDelay` 后沿同一
 * 方向再爆一声——第二次对当时还在线上的人再削 20；第二声把施法者多定住一段，冷却也更长。
 *
 * 数据分散（每项依赖不同的精灵数据，落到不同参数）：
 *   damage      固定伤害：恒为 20，不读任何精灵数据。
 *   reach       裂痕长度：等级与特攻决定能撕开多远；它也是本招实际射程来源。
 *   boomRadius  裂痕宽度／判定半径：碰撞箱高度决定线两侧多宽会被扫到。
 *   shove       推开距离：体重与等级决定把被扫到的人推多远。
 *   sparks      裂纹碎点：特攻与等级换算，驱动表现密度。
 *   echoDelay   回响间隔：速度决定第二声来得快慢（仅回响式）。
 *   tempo／settle／recharge：速度定起手，身高定收势，等级与配置定冷却。
 *
 * 固定伤害：`damage` 由行动直接结算（绕过攻防），见 skill.ts 的 `sonicboomRawHit`。
 */
namespace PokemonSkills {
    actionParameters.define("sonicboom", {
        /** 固定伤害：恒为 20，不读任何精灵数据；只有属性免疫能挡住它。 */
        damage: formula(
            F.const(20),
            "固定伤害", {
                unit: "点",
                description: "这一声固定削掉的生命点数，原生即为 20；对手的攻击、防御、属性相性都不参与结算，只有属性免疫会挡住它。"
            }),
        /** 裂痕长度：基础 8.0，等级每高 1 级加 0.08（夹 0..2.8），特攻每比 60 多 1 加 0.025（夹 −1..1.6）；夹 6..14。 */
        reach: formula(
            F.base(8.0).plus(F.level().minus(28).times(0.08).clamp(0, 2.8))
                .plus(F.stat("specialAttack").minus(60).times(0.025).clamp(-1, 1.6))
                .clamp(6, 14).round(2),
            "裂痕长度", {
                unit: "格",
                description: "音爆能把空气撕开多远；等级与特攻越高撕得越长。它也是本招的实际射程来源。"
            }),
        /** 裂痕宽度：基础 0.34，碰撞箱每比 1.4 高 1 格加 0.1（夹 −0.06..0.22）；夹 0.26..0.7。 */
        boomRadius: formula(
            F.base(0.34).plus(F.body("height").minus(1.4).times(0.1).clamp(-0.06, 0.22)).clamp(0.26, 0.7).round(2),
            "裂痕宽度", {
                unit: "格",
                description: "裂痕的判定半径，也是线两侧会被扫到的宽度；大个子的音爆更粗。"
            }),
        /** 推开距离：基础 0.3，体重每比 60 重 1kg 加 0.003（夹 −0.1..0.4），等级每高 1 级加 0.012（夹 0..0.25）；夹 0.15..0.9。 */
        shove: formula(
            F.base(0.3).plus(F.body("weight").minus(60).times(0.003).clamp(-0.1, 0.4))
                .plus(F.level().minus(28).times(0.012).clamp(0, 0.25)).clamp(0.15, 0.9).round(2),
            "推开距离", {
                unit: "格",
                description: "被这一声正面扫到的人被顶开多远；越重、等级越高的个体推得越远。"
            }),
        /** 裂纹碎点：基础 16，特攻每比 60 多 1 加 0.12（夹 −3..14），等级每高 1 级加 0.25（夹 0..6）；夹 12..46。 */
        sparks: formula(
            F.base(16).plus(F.stat("specialAttack").minus(60).times(0.12).clamp(-3, 14))
                .plus(F.level().minus(28).times(0.25).clamp(0, 6)).clamp(12, 46).round(0),
            "裂纹碎点", {
                unit: "点",
                description: "这一声在表现里炸开的裂纹与碎点数量；特攻与等级越高越密。"
            }),
        /** 回响间隔：基础 16 刻，速度每比 55 快 1 少 0.1 刻（夹 −4..6）；夹 10..26。 */
        echoDelay: seconds(
            F.base(16).minus(F.stat("speed").minus(55).times(0.1).clamp(-4, 6)).clamp(10, 26).round(0),
            "回响间隔", "回响式下第一声与第二声之间隔多久；快的个体育爆得更紧凑。"),
        /** 起手：基础 6 刻，速度每比 55 快 1 少 0.03 刻（夹 −1..2）；夹 4..10。 */
        tempo: seconds(
            F.base(6).minus(F.stat("speed").minus(55).times(0.03).clamp(-1, 2)).clamp(4, 10).round(0),
            "起手时长", "撕开空气之前只有极短的一瞬；这是本组最快的一击。"),
        /** 收势：基础 7 刻，身高每比 1.4 高 1 格加 1 刻（夹 −1..2）；夹 4..11。 */
        settle: seconds(
            F.base(7).plus(F.body("height").minus(1.4).times(1).clamp(-1, 2)).clamp(4, 11).round(0),
            "收势时长", "爆完收势的时间；个头大的个体收得慢一些。"),
        /** 冷却：基础 20 刻，等级每高 1 级减 0.2（夹 −4..5），回响 +8；夹 14..34。 */
        recharge: seconds(
            F.base(20).minus(F.level().minus(28).times(0.2).clamp(-4, 5))
                .plus(F.when(F.pref("reverb", text("worldcombat.skill.sonicboom.preference.reverb")), F.const(8), F.const(0)))
                .clamp(14, 34).round(0),
            "冷却", "两声之间最短的间隔；等级越高恢复越快，回响式要多等一段。"),
        maximumTargets: hidden(1)
    });

    stages("sonicboom", [
        { level: 34, values: { reach: 9.2 } },
        { level: 48, values: { reach: 10.5, sparks: 24 } }
    ]);

    describe("sonicboom", [
        { key: "description.0", values: ["damage"] },
        { key: "description.1", values: ["reach", "boomRadius"] },
        { key: "reverb.on", values: ["echoDelay"], when: function (context) { return read(context.detail.values, ["reverb"]) === true; } },
        { key: "reverb.off", values: [], when: function (context) { return read(context.detail.values, ["reverb"]) !== true; } },
        { key: "timing", values: ["range", "prepare", "recover", "pp", "cooldown"] },
        { key: "growth.0", values: ["tier.0.level", "tier.0.reach"] },
        { key: "growth.1", values: ["tier.1.level", "tier.1.reach", "tier.1.sparks"] }
    ]);
}
